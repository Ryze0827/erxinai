import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "@appica/ui-react/alert";
import { AlertDescription } from "@appica/ui-react/alert";
import { AlertIcon } from "@appica/ui-react/alert";
import { AlertTitle } from "@appica/ui-react/alert";
import { Checkbox } from "@appica/ui-react/checkbox";
import { paymentApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, DataTable, EmptyState, ErrorState, Field, Page, Pagination, Panel, StatusBadge, TableSkeleton, TextInput } from "../UI";

function completedBalanceOrders(items = []) {
  return items.filter((item) => item.order_type === "balance" && String(item.status).toUpperCase() === "COMPLETED");
}

export function InvoicePage() {
  const { user } = useConsole();
  const { t, formatDate, formatUsd } = useLocale();
  const [paging, setPaging] = useState({ page: 1, pageSize: 20 });
  const [state, setState] = useState({ loading: true, error: "", items: [], total: 0, pages: 1 });
  const [selected, setSelected] = useState(() => new Map());
  const [email, setEmail] = useState(() => user?.email || "");
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const result = await paymentApi.orders({
        page: paging.page,
        page_size: paging.pageSize,
        status: "COMPLETED",
        order_type: "balance",
      });
      if (!mountedRef.current) return;
      setState({
        loading: false,
        error: "",
        items: completedBalanceOrders(result?.items),
        total: Number(result?.total || 0),
        pages: Number(result?.pages || 1),
      });
    } catch (error) {
      if (mountedRef.current) setState((current) => ({ ...current, loading: false, error: error.message }));
    }
  }, [paging]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);

  const selectedOrders = useMemo(() => [...selected.values()], [selected]);
  const selectedAmount = useMemo(() => selectedOrders.reduce((total, order) => total + Number(order.amount || 0), 0), [selectedOrders]);
  const selectedOnPage = state.items.filter((order) => selected.has(order.id));
  const allOnPageSelected = state.items.length > 0 && selectedOnPage.length === state.items.length;
  const someOnPageSelected = selectedOnPage.length > 0 && !allOnPageSelected;

  const selectOrder = (order, checked) => {
    setSelected((current) => {
      const next = new Map(current);
      if (checked) next.set(order.id, order);
      else next.delete(order.id);
      return next;
    });
  };

  const selectPage = (checked) => {
    setSelected((current) => {
      const next = new Map(current);
      state.items.forEach((order) => {
        if (checked) next.set(order.id, order);
        else next.delete(order.id);
      });
      return next;
    });
  };

  const orderLabel = (order) => `#${order.id ?? "—"}`;
  const columns = [
    {
      key: "select",
      label: <Checkbox checked={allOnPageSelected} indeterminate={someOnPageSelected} disabled={!state.items.length} aria-label={t("invoice.selectPage")} onCheckedChange={selectPage} />,
      mobileLabel: "",
      render: (order) => <Checkbox checked={selected.has(order.id)} aria-label={t("invoice.selectOrder", { number: orderLabel(order) })} onCheckedChange={(checked) => selectOrder(order, checked)} />,
    },
    { key: "id", label: t("invoice.order"), render: (order) => <strong className="console-invoice-order-number">{orderLabel(order)}</strong> },
    { key: "amount", label: t("invoice.amount"), render: (order) => <span className="console-invoice-order-amount">{formatUsd(order.amount)}</span> },
    { key: "completed_at", label: t("invoice.completedAt"), render: (order) => formatDate(order.completed_at || order.paid_at || order.created_at) },
    { key: "status", label: t("common.status"), render: () => <StatusBadge status="success" label={t("invoice.eligible")} /> },
  ];

  const orderContent = state.loading && !state.items.length
    ? <TableSkeleton columns={5} />
    : state.error && !state.items.length
      ? <ErrorState message={state.error} onRetry={load} />
      : <><DataTable className="console-invoice-orders-table" columns={columns} rows={state.items} empty={<EmptyState icon="order" title={t("invoice.emptyTitle")} description={t("invoice.emptyDescription")} />} /><Pagination page={paging.page} pageSize={paging.pageSize} total={state.total} pages={state.pages} onPageChange={(page) => setPaging((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })} /></>;

  return <Page title={t("invoice.title")} className="console-invoice-page">
    <Alert variant="primary" className="console-invoice-intro" role="note">
      <AlertIcon><Icon name="orderReceipt" /></AlertIcon>
      <AlertTitle as="h2">{t("invoice.introTitle")}</AlertTitle>
      <AlertDescription>{t("invoice.introDescription")}</AlertDescription>
    </Alert>

    <Panel title={t("invoice.requestTitle")} actions={<StatusBadge status="inactive" label={t("invoice.unavailableStatus")} />}>
      <div className="console-panel-body console-invoice-request">
        <Field label={t("invoice.email")} hint={t("invoice.emailHint")}>
          <TextInput type="email" autoComplete="email" required value={email} placeholder={t("invoice.emailPlaceholder")} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <div className="console-invoice-selection" aria-live="polite">
          <span>{t("invoice.selectedSummary", { count: selectedOrders.length })}</span>
          <strong>{formatUsd(selectedAmount)}</strong>
          <small>{t("invoice.selectedAmount")}</small>
        </div>
        <div className="console-invoice-submit">
          <Button variant="primary" icon="send" disabled aria-describedby="invoice-unavailable-message">{t("invoice.submit")}</Button>
          <p id="invoice-unavailable-message"><Icon name="clock" size={16} aria-hidden="true" />{t("invoice.unavailable")}</p>
        </div>
      </div>
    </Panel>

    <Panel title={t("invoice.ordersTitle")} actions={<Button icon="refresh" loading={state.loading} onClick={load}>{t("common.refresh")}</Button>} className="console-invoice-orders-panel" aria-busy={state.loading}>
      <p className="console-invoice-orders-description">{t("invoice.ordersDescription")}</p>
      {orderContent}
    </Panel>
  </Page>;
}
