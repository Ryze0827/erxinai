import { useCallback, useEffect, useRef, useState } from "react";
import { redeemApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { useLocale } from "../i18n";
import { Button, DataTable, EmptyState, ErrorState, Field, Page, Panel, Spinner, StatusBadge, TextInput } from "../UI";

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
  const columns = [
    { key: "created_at", label: t("common.date"), render: (row) => formatDate(row.created_at || row.redeemed_at) },
    { key: "code", label: locale === "zh" ? "兑换码" : "Code", render: (row) => <span className="console-mono">{row.code || row.redeem_code || "—"}</span> },
    { key: "type", label: locale === "zh" ? "类型" : "Type", render: (row) => <StatusBadge status="success" label={row.type || row.code_type} /> },
    { key: "value", label: locale === "zh" ? "权益" : "Value", render: (row) => row.type === "balance" || row.code_type === "balance" ? formatCurrency(row.value) : row.group_name || row.value },
    { key: "message", label: t("common.description") },
  ];

  return <Page title={t("redeem.title")} subtitle={t("redeem.subtitle")}>
    <div className="console-grid console-grid--sidebar"><Panel className="console-redeem-card"><div className="console-redeem-balance"><span>{t("common.balance")}</span><strong>{formatCurrency(user?.balance || 0)}</strong><small>{locale === "zh" ? `并发：${user?.concurrency || 0}` : `Concurrency: ${user?.concurrency || 0}`}</small></div><form className="console-redeem-form" onSubmit={redeem}><Field label={locale === "zh" ? "兑换码" : "Redemption code"} hint={locale === "zh" ? "兑换码区分大小写且只能使用一次。" : "Codes are case-sensitive and can be used once."}><TextInput value={code} onChange={(event) => setCode(event.target.value)} placeholder={t("redeem.placeholder")} autoComplete="off" /></Field><Button type="submit" variant="primary" icon="gift" disabled={!code.trim() || state.busy}>{state.busy ? t("common.loading") : t("redeem.action")}</Button></form>{result && <div className="console-result-card"><strong>{result.message || t("common.success")}</strong><span>{result.type === "balance" ? formatCurrency(result.value) : result.group_name || result.value}</span></div>}</Panel><Panel title={locale === "zh" ? "关于兑换码" : "About codes"}><div className="console-panel-body console-info-list"><p>{locale === "zh" ? "兑换码可增加余额、并发额度或订阅权益。" : "A code can grant balance, concurrency, or a subscription."}</p><p>{locale === "zh" ? "成功兑换后权益会立即生效。" : "Benefits take effect immediately after redemption."}</p>{settings?.contact_info && <p>{locale === "zh" ? "需要帮助：" : "Need help: "}<strong>{settings.contact_info}</strong></p>}</div></Panel></div>
    <Panel title={t("redeem.history")} actions={<Button icon="refresh" onClick={load}>{t("common.refresh")}</Button>}>{state.loading ? <Spinner /> : state.error ? <ErrorState message={state.error} onRetry={load} /> : <DataTable columns={columns} rows={history} empty={<EmptyState icon="gift" />} />}</Panel>
  </Page>;
}
