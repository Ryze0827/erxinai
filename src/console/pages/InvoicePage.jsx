import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@appica/ui-react/alert";
import { AlertDescription } from "@appica/ui-react/alert";
import { Badge } from "@appica/ui-react/badge";
import { Checkbox } from "@appica/ui-react/checkbox";
import { invoiceApi } from "../../api/invoices";
import { useConsole } from "../ConsoleContext";
import { useLocale } from "../i18n";
import { Icon } from "../Icon";
import { Button, DataTable, EmptyState, ErrorState, Field, Modal, Page, Pagination, Panel, PaginationSkeleton, SelectInput, StatusBadge, TextInput } from "../UI";
import { invoiceShortfall, MIN_INVOICE_AMOUNT } from "./invoiceRules";

const DEFAULT_INVOICE_ITEM = "生产生活服务/信息服务费";

const invoiceStatuses = {
  pending: { tone: "warning", icon: "clock" },
  approved: { tone: "info", icon: "orderReceipt" },
  issued: { tone: "success", icon: "check" },
  rejected: { tone: "danger", icon: "close" },
};

function InvoiceRequestStatus({ status, t }) {
  const appearance = invoiceStatuses[status];
  return <Badge variant="soft" size="md" className={`console-status-badge is-${appearance?.tone || "neutral"}`}><Icon name={appearance?.icon || "info"} data-icon="start" aria-hidden="true" />{t(appearance ? `invoice.status.${status}` : "invoice.status.unknown")}</Badge>;
}

export function InvoicePage() {
  const { user, refreshUser, notify } = useConsole();
  const { t, formatDate, formatUsd } = useLocale();
  const [paging, setPaging] = useState({ page: 1, pageSize: 50 });
  const [state, setState] = useState({ loading: true, error: "", items: [], total: 0, pages: 1, enabled: false });
  const [selected, setSelected] = useState(() => new Map());
  const [email, setEmail] = useState(() => user?.email || "");
  const [title, setTitle] = useState("");
  const [invoiceItems, setInvoiceItems] = useState([]);
  const [invoiceItem, setInvoiceItem] = useState(DEFAULT_INVOICE_ITEM);
  const [taxId, setTaxId] = useState("");
  const [requestOpen, setRequestOpen] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoteRevision, setQuoteRevision] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [history, setHistory] = useState({ items: [], total: 0, pages: 1, error: "", loading: true });
  const mountedRef = useRef(true);
  const submitRef = useRef(false);
  const orderIds = useMemo(() => [...selected.keys()].sort((a, b) => a - b), [selected]);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const [settings, result] = await Promise.all([invoiceApi.settings(), invoiceApi.orders(paging)]);
      if (mountedRef.current) {
        const items = settings.invoice_items || [];
        setInvoiceItems(items);
        setInvoiceItem((current) => items.includes(current) ? current : items.includes(DEFAULT_INVOICE_ITEM) ? DEFAULT_INVOICE_ITEM : items[0] || "");
      }
      if (mountedRef.current) setState({ loading: false, error: "", items: result.items || [], total: Number(result.total || 0), pages: Number(result.pages || 1), enabled: settings.enabled === true });
    } catch (error) {
      if (mountedRef.current) setState((current) => ({ ...current, loading: false, enabled: false, error: error.message }));
    }
  }, [paging]);
  const loadHistory = useCallback(async () => {
    setHistory((current) => ({ ...current, loading: true }));
    try {
      const result = await invoiceApi.requests(historyPage);
      if (mountedRef.current) setHistory({ ...result, error: "", loading: false });
    } catch (error) {
      if (mountedRef.current) setHistory((current) => ({ ...current, error: error.message, loading: false }));
    }
  }, [historyPage]);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void loadHistory();
    const interval = window.setInterval(loadHistory, 10000);
    return () => window.clearInterval(interval);
  }, [loadHistory]);
  useEffect(() => {
    const controller = new AbortController();
    setQuote(null); setQuoteError(""); setSubmitError("");
    if (!requestOpen || !orderIds.length || !state.enabled) { setQuoteLoading(false); return () => controller.abort(); }
    setQuoteLoading(true);
    invoiceApi.quote(orderIds, controller.signal).then((result) => {
      if (!controller.signal.aborted) setQuote({ ...result, orderIds });
    }).catch((error) => {
      if (!controller.signal.aborted) setQuoteError(error.message);
    }).finally(() => { if (!controller.signal.aborted) setQuoteLoading(false); });
    return () => controller.abort();
  }, [orderIds, state.enabled, quoteRevision, requestOpen]);

  const quoteCurrent = requestOpen && quote && quote.orderIds.length === orderIds.length && quote.orderIds.every((id, index) => id === orderIds[index]);
  const selectedAmount = [...selected.values()].reduce((total, order) => total + Number(order.amount || 0), 0);
  const shortfall = invoiceShortfall(selectedAmount);
  const meetsMinimum = shortfall === 0;
  const quoteBelowMinimum = quoteCurrent && invoiceShortfall(quote.amount) > 0;
  const blockingReason = !state.enabled ? { tone: "muted", text: t("invoice.unavailable") }
    : submitError ? { tone: "danger", text: submitError }
    : quoteError ? { tone: "danger", text: quoteError }
    : quoteLoading ? { tone: "muted", text: t("invoice.checking") }
    : quoteBelowMinimum ? { tone: "warning", text: t("invoice.minimumAmount", { amount: formatUsd(MIN_INVOICE_AMOUNT) }) }
    : quoteCurrent && !quote.sufficient ? { tone: "warning", text: t("invoice.insufficient") }
    : null;
  const eligibleOnPage = state.items.filter((order) => order.invoice_available);
  const selectedOnPage = eligibleOnPage.filter((order) => selected.has(order.id));
  const allOnPageSelected = eligibleOnPage.length > 0 && selectedOnPage.length === eligibleOnPage.length;
  const someOnPageSelected = selectedOnPage.length > 0 && !allOnPageSelected;
  const selectOrder = (order, checked) => setSelected((current) => {
    const next = new Map(current);
    if (checked) next.set(order.id, order); else next.delete(order.id);
    return next;
  });
  const selectPage = (checked) => setSelected((current) => {
    const next = new Map(current);
    eligibleOnPage.forEach((order) => { if (checked) next.set(order.id, order); else next.delete(order.id); });
    return next;
  });
  function openRequest() {
    if (!state.enabled || !orderIds.length || orderIds.length > 100 || !meetsMinimum || busy) return;
    setQuote(null); setQuoteError(""); setSubmitError("");
    setRequestOpen(true);
  }
  function closeRequest() {
    if (busy) return;
    setRequestOpen(false); setQuote(null);
  }
  async function submit(event) {
    event.preventDefault();
    if (!state.enabled || !quoteCurrent || quoteBelowMinimum || !quote.sufficient || !invoiceItems.includes(invoiceItem) || submitRef.current) return;
    submitRef.current = true; setBusy(true); setSubmitError("");
    try {
      const [settings, latest] = await Promise.all([invoiceApi.settings(), refreshUser()]);
      if (mountedRef.current) setState((current) => ({ ...current, enabled: settings.enabled === true }));
      if (settings.enabled !== true) throw new Error(t("invoice.unavailable"));
      if (!latest || Number(latest.balance) < Number(quote.fee)) throw new Error(t("invoice.insufficient"));
      await invoiceApi.submit({ order_ids: orderIds, title, tax_id: taxId, email, invoice_item: invoiceItem, quote_token: quote.quote_token });
      notify("success", t("invoice.submitted"));
      setRequestOpen(false);
      setSelected(new Map());
      await Promise.all([load(), loadHistory()]);
    } catch (error) { setSubmitError(error.message); }
    finally { submitRef.current = false; if (mountedRef.current) setBusy(false); }
  }
  async function download(item) {
    if (busy) return;
    setBusy(true);
    try {
      const blob = await invoiceApi.download(item.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `invoice-${item.id}.pdf`; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { notify("error", error.message); }
    finally { if (mountedRef.current) setBusy(false); }
  }
  const columns = [
    { key: "select", label: <Checkbox checked={allOnPageSelected} indeterminate={someOnPageSelected} disabled={!eligibleOnPage.length || busy} aria-label={t("invoice.selectPage")} onCheckedChange={selectPage} />, mobileLabel: "", render: (order) => <Checkbox checked={selected.has(order.id)} disabled={!order.invoice_available || busy} aria-label={t("invoice.selectOrder", { number: `#${order.id}` })} onCheckedChange={(checked) => selectOrder(order, checked)} /> },
    { key: "id", label: t("invoice.order"), render: (order) => <strong className="console-invoice-order-number">#{order.id}</strong> },
    { key: "amount", label: t("invoice.amount"), render: (order) => formatUsd(order.amount) },
    { key: "completed_at", label: t("invoice.completedAt"), render: (order) => formatDate(order.completed_at || order.paid_at || order.created_at) },
    { key: "status", label: t("common.status"), render: (order) => <StatusBadge status={order.invoice_available ? "success" : "inactive"} label={t(order.invoice_available ? "invoice.eligible" : "invoice.ineligible")} /> },
  ];
  const historyColumns = [
    { key: "title", label: t("invoice.header"), render: (item) => <div><strong className="console-invoice-history-title">{item.title || "—"}</strong><div className="console-invoice-history-note">{item.invoice_item || DEFAULT_INVOICE_ITEM}</div></div> },
    { key: "amount", label: t("invoice.selectedAmount"), align: "right", render: (item) => <strong className="console-invoice-order-amount">{formatUsd(item.amount)}</strong> },
    { key: "fee", label: t("invoice.fee"), align: "right", render: (item) => <span className="console-invoice-history-fee">{formatUsd(item.fee)}</span> },
    { key: "status", label: t("common.status"), render: (item) => <InvoiceRequestStatus status={item.status} t={t} /> },
    { key: "note", label: t("invoice.reviewNote"), render: (item) => <span className="console-invoice-history-note">{String(item.note ?? "").trim() || "—"}</span> },
    { key: "mail_status", label: t("invoice.mail"), render: (item) => <span className={`console-invoice-history-mail ${item.mail_status === "failed" ? "is-error" : ""}`}>{["pending", "sending", "sent", "failed", "skipped"].includes(item.mail_status) ? t(`invoice.mail.${item.mail_status}`) : "—"}</span> },
    { key: "actions", label: t("invoice.file"), align: "right", render: (item) => item.status === "issued" ? <Button icon="download" disabled={busy} onClick={() => download(item)}>{t("invoice.download")}</Button> : <span className="console-invoice-history-placeholder">{t("invoice.fileUnavailable")}</span> },
  ];
  return <Page title={t("invoice.title")} className="console-invoice-page">
    <Panel title={t("invoice.ordersTitle")} actions={<Button icon="refresh" loading={state.loading} disabled={busy} onClick={() => { setSelected(new Map()); void load(); }}>{t("common.refresh")}</Button>} className="console-invoice-orders-panel" aria-busy={state.loading}>
      <p className="console-invoice-orders-description">{state.enabled || state.loading ? t("invoice.ordersDescription") : t("invoice.unavailable")}</p>
      <div className="console-invoice-order-actions">
        <div className="console-invoice-order-summary">
          <div aria-live="polite"><span>{t("invoice.selectedSummary", { count: orderIds.length })}</span><strong>{formatUsd(selectedAmount)}</strong>{orderIds.length > 100 && <span>{t("invoice.orderLimit")}</span>}</div>
          <p className="console-invoice-requirement"><span>{t("invoice.minimumAmount", { amount: formatUsd(MIN_INVOICE_AMOUNT) })}</span>{orderIds.length > 0 && !meetsMinimum && <span className="console-invoice-requirement-shortfall">{t("invoice.shortfall", { amount: formatUsd(shortfall) })}</span>}</p>
        </div>
        <Button variant="primary" icon="orderReceipt" disabled={!state.enabled || !orderIds.length || orderIds.length > 100 || !meetsMinimum || busy} onClick={openRequest}>{t("invoice.openRequest")}</Button>
      </div>
      {state.loading && !state.items.length ? <><DataTable className="console-invoice-orders-table" columns={columns} rows={state.items} loading/><PaginationSkeleton/></> : state.error ? <ErrorState message={state.error} onRetry={load}/> : <><DataTable className="console-invoice-orders-table" columns={columns} rows={state.items} empty={<EmptyState icon="order" title={t("invoice.emptyTitle")} description={t("invoice.emptyDescription")}/>}/><Pagination page={paging.page} pageSize={paging.pageSize} total={state.total} pages={state.pages} onPageChange={(page) => setPaging((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })}/></>}
    </Panel>
    <Panel className="console-invoice-history-panel" title={t("invoice.history")} actions={<Button icon="refresh" onClick={loadHistory}>{t("common.refresh")}</Button>}>
      {history.error ? <ErrorState message={history.error} onRetry={loadHistory}/> : <><DataTable className="console-invoice-history-table" columns={historyColumns} rows={history.items} loading={history.loading} loadingRows={3} empty={<EmptyState icon="order" title={t("invoice.noRequests")}/>}/><Pagination page={historyPage} pageSize={20} total={history.total} pages={history.pages} onPageChange={setHistoryPage}/></>}
    </Panel>
    <Modal open={requestOpen} title={t("invoice.requestTitle")} description={t("invoice.confirmDescription")} onClose={closeRequest} className="console-invoice-modal" footer={<>{blockingReason && <p className="console-invoice-status" data-tone={blockingReason.tone} role="status" aria-live="polite">{blockingReason.text}</p>}<Button disabled={busy} onClick={closeRequest}>{t("common.cancel")}</Button><Button type="submit" form="invoice-request-form" variant="primary" icon="send" loading={busy} disabled={!state.enabled || !quoteCurrent || !quote.sufficient || quoteBelowMinimum || quoteLoading || !invoiceItems.includes(invoiceItem)}>{t("invoice.confirmSubmit")}</Button></>}>
      <form id="invoice-request-form" onSubmit={submit} className="console-invoice-request">
        <Alert variant="warning" className="console-invoice-notice"><Icon name="info" aria-hidden="true" /><AlertDescription><span>{t("invoice.noReissue")}</span><span>{t("invoice.deliveryNotice")}</span></AlertDescription></Alert>
        <div className="console-invoice-confirm-orders"><span>{t("invoice.selectedSummary", { count: orderIds.length })}</span><p>{orderIds.map((id) => `#${id}`).join(" · ")}</p></div>
        <Field label={t("invoice.header")}><TextInput required maxLength={200} value={title} disabled={busy} onChange={(event) => setTitle(event.target.value)} /></Field>
        <Field label={t("invoice.taxId")}><TextInput required pattern="[A-Za-z0-9]+" maxLength={32} value={taxId} disabled={busy} onChange={(event) => setTaxId(event.target.value.trim())} /></Field>
        <Field label={t("invoice.item")} className="console-invoice-item"><SelectInput value={invoiceItem} disabled={busy} aria-label={t("invoice.item")} onChange={(event) => setInvoiceItem(event.target.value)}>{invoiceItems.map((item) => <option key={item} value={item}>{item}</option>)}</SelectInput></Field>
        <Field label={t("invoice.email")} hint={t("invoice.emailHint")} className="console-invoice-email"><TextInput type="email" autoComplete="email" required maxLength={254} value={email} disabled={busy} placeholder={t("invoice.emailPlaceholder")} onChange={(event) => setEmail(event.target.value)} /></Field>
        <section className="console-invoice-quote" aria-label={t("invoice.selectedAmount")}>
          <div className="console-invoice-quote-total" aria-live="polite"><span>{t("invoice.selectedAmount")}</span><strong>{quoteCurrent ? formatUsd(quote.amount) : "—"}</strong></div>
          <div className="console-invoice-quote-details" aria-live="polite">
            <span>{t("invoice.fee")}<strong>{quoteCurrent ? formatUsd(quote.fee) : "—"}</strong></span>
            <span>{t("invoice.balance")}<strong>{quoteCurrent ? formatUsd(quote.balance) : "—"}</strong></span>
          </div>
          <div className="console-invoice-quote-footer"><span>{quoteLoading ? t("invoice.checking") : t("invoice.consent")}</span><Button icon="refresh" loading={quoteLoading} disabled={!state.enabled || !orderIds.length || busy} onClick={() => setQuoteRevision((value) => value + 1)}>{t("common.refresh")}</Button></div>
        </section>
      </form>
    </Modal>
  </Page>;
}
