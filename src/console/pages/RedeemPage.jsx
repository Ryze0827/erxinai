import { useCallback, useEffect, useRef, useState } from "react";
import { redeemApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { useLocale } from "../i18n";
import { Button, DataTable, EmptyState, ErrorState, Field, Page, Panel, Spinner, StatusBadge, TextInput } from "../UI";

function redeemType(item) {
  return item?.type || item?.code_type || "unknown";
}

function redeemTitle(item, locale) {
  const type = redeemType(item);
  const added = Number(item.value) >= 0;
  const labels = locale === "zh"
    ? { balance: "兑换码增加余额", admin_balance: added ? "管理员增加余额" : "管理员扣减余额", concurrency: "兑换码增加并发", admin_concurrency: added ? "管理员增加并发" : "管理员减少并发", subscription: "获得订阅" }
    : { balance: "Balance added by code", admin_balance: added ? "Balance added by administrator" : "Balance deducted by administrator", concurrency: "Concurrency added by code", admin_concurrency: added ? "Concurrency added by administrator" : "Concurrency reduced by administrator", subscription: "Subscription assigned" };
  return labels[type] || type.replaceAll("_", " ");
}

function redeemValue(item, locale, formatCurrency) {
  const type = redeemType(item);
  if (["balance", "admin_balance"].includes(type)) return `${Number(item.value) >= 0 ? "+" : ""}${formatCurrency(item.value)}`;
  if (type === "subscription") {
    const days = item.validity_days || Math.round(Number(item.value) || 0);
    const group = item.group?.name || item.group_name || "";
    return `${days} ${locale === "zh" ? "天" : "days"}${group ? ` · ${group}` : ""}`;
  }
  return `${Number(item.value) >= 0 ? "+" : ""}${item.value || 0} ${locale === "zh" ? "并发" : "concurrency"}`;
}

function historyColumns({ t, locale, formatCurrency, formatDate }) {
  return [
    { key: "used_at", label: t("common.date"), render: (row) => formatDate(row.used_at || row.redeemed_at || row.created_at) },
    { key: "code", label: locale === "zh" ? "兑换码" : "Code", render: (row) => <span className="console-mono">{row.code || row.redeem_code || "—"}</span> },
    { key: "type", label: locale === "zh" ? "类型" : "Type", render: (row) => <StatusBadge status="success" label={redeemTitle(row, locale)} /> },
    { key: "value", label: locale === "zh" ? "权益" : "Value", render: (row) => <strong>{redeemValue(row, locale, formatCurrency)}</strong> },
    { key: "message", label: t("common.description"), render: (row) => row.notes || row.message || "—" },
  ];
}

function RedemptionResult({ result, locale, formatCurrency, t }) {
  if (!result) return null;
  return <div className="console-result-card"><strong>{result.message || t("common.success")}</strong><span>{redeemValue(result, locale, formatCurrency)}</span>{result.new_balance !== undefined && <small>{locale === "zh" ? "新余额" : "New balance"}: {formatCurrency(result.new_balance)}</small>}{result.new_concurrency !== undefined && <small>{locale === "zh" ? "新并发" : "New concurrency"}: {result.new_concurrency}</small>}</div>;
}

function RedeemCard({ code, setCode, busy, onSubmit, result, user, locale, formatCurrency, t }) {
  const balance = Number(user?.balance) || 0;
  const concurrency = Number(user?.concurrency) || 0;
  return <Panel className="console-redeem-card"><div className="console-redeem-balance"><span>{t("common.balance")}</span><strong>{formatCurrency(balance)}</strong><small>{locale === "zh" ? `并发：${concurrency}` : `Concurrency: ${concurrency}`}</small></div><form className="console-redeem-form" onSubmit={onSubmit}><Field label={locale === "zh" ? "兑换码" : "Redemption code"} hint={locale === "zh" ? "兑换码区分大小写且只能使用一次。" : "Codes are case-sensitive and can be used once."}><TextInput value={code} onChange={(event) => setCode(event.target.value)} placeholder={t("redeem.placeholder")} autoComplete="off" /></Field><Button type="submit" variant="primary" icon="gift" disabled={!code.trim() || busy}>{busy ? t("common.loading") : t("redeem.action")}</Button></form><RedemptionResult result={result} locale={locale} formatCurrency={formatCurrency} t={t} /></Panel>;
}

function RedeemInfo({ contact, locale }) {
  return <Panel title={locale === "zh" ? "关于兑换码" : "About codes"}><div className="console-panel-body console-info-list"><p>{locale === "zh" ? "兑换码可增加余额、并发额度或订阅权益。" : "A code can grant balance, concurrency, or a subscription."}</p><p>{locale === "zh" ? "成功兑换后权益会立即生效。" : "Benefits take effect immediately after redemption."}</p>{contact && <p>{locale === "zh" ? "需要帮助：" : "Need help: "}<strong>{contact}</strong></p>}</div></Panel>;
}

function RedeemHistory({ state, history, columns, load, t }) {
  let content = <DataTable columns={columns} rows={history} empty={<EmptyState icon="gift" />} />;
  if (state.loading) content = <Spinner />;
  else if (state.error) content = <ErrorState message={state.error} onRetry={load} />;
  return <Panel title={t("redeem.history")} actions={<Button icon="refresh" onClick={load}>{t("common.refresh")}</Button>}>{content}</Panel>;
}

export function RedeemPage() {
  const { t, locale, formatCurrency, formatDate } = useLocale();
  const { user, refreshUser, notify, settings } = useConsole();
  const [code, setCode] = useState("");
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [state, setState] = useState({ loading: true, error: "", busy: false });
  const mountedRef = useRef(true);
  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try { const data = await redeemApi.history(); if (mountedRef.current) { setHistory(Array.isArray(data) ? data : data.items || []); setState((current) => ({ ...current, loading: false })); } }
    catch (error) { if (mountedRef.current) setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, []);
  useEffect(() => { mountedRef.current = true; load(); return () => { mountedRef.current = false; }; }, [load]);

  const redeem = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setState((current) => ({ ...current, busy: true }));
    try {
      const data = await redeemApi.redeem(code.trim());
      setResult(data); setCode(""); notify("success", data.message || t("common.success")); await Promise.allSettled([refreshUser(), load()]);
    } catch (error) { notify("error", error.message); } finally { setState((current) => ({ ...current, busy: false })); }
  };
  const columns = historyColumns({ t, locale, formatCurrency, formatDate });

  return <Page title={t("redeem.title")} subtitle={t("redeem.subtitle")}>
    <div className="console-grid console-grid--sidebar"><RedeemCard code={code} setCode={setCode} busy={state.busy} onSubmit={redeem} result={result} user={user} locale={locale} formatCurrency={formatCurrency} t={t} /><RedeemInfo contact={settings?.contact_info} locale={locale} /></div>
    <RedeemHistory state={state} history={history} columns={columns} load={load} t={t} />
  </Page>;
}
