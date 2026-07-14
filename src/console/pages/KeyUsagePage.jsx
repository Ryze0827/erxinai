import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usageApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, DataTable, EmptyState, ErrorState, Field, IconButton, LineChart, Panel, ProgressBar, Spinner, StatCard, StatusBadge, TextInput } from "../UI";
import { dateInput, formatDuration, safeExternalUrl, safeImageUrl, statusLabel } from "../utils";

function usageRings(data, locale) {
  if (!data) return [];
  if (data.mode === "quota_limited") {
    const items = data.quota ? [{ label: locale === "zh" ? "总额度" : "Total quota", used: data.quota.used, limit: data.quota.limit, reset: data.expires_at }] : [];
    return items.concat((data.rate_limits || []).map((item) => ({ label: `${item.window} ${locale === "zh" ? "周期" : "window"}`, used: item.used, limit: item.limit, reset: item.reset_at })));
  }
  if (data.subscription) return ["daily", "weekly", "monthly"].flatMap((period) => data.subscription[`${period}_limit_usd`] > 0 ? [{ label: period, used: data.subscription[`${period}_usage_usd`], limit: data.subscription[`${period}_limit_usd`] }] : []);
  return data.balance != null ? [{ label: locale === "zh" ? "钱包余额" : "Wallet balance", used: 0, limit: 0, balance: data.balance }] : [];
}

function PublicShell({ children }) {
  const { settings } = useConsole();
  const { locale, setLocale, t } = useLocale();
  const logo = safeImageUrl(settings?.site_logo) || "/assets/img/sentence-ai-icon.png";
  const docs = safeExternalUrl(settings?.doc_url);
  return <div className="console-public-shell console-key-usage-shell"><div className="console-scene" /><header><Link to="/"><img src={logo} alt="" /><strong>{settings?.site_name || "Sentence AI"}</strong></Link><nav>{docs && <a href={docs} target="_blank" rel="noreferrer"><Icon name="book" size={18} />{t("nav.docs")}</a>}<button onClick={() => setLocale(locale === "en" ? "zh" : "en")}><Icon name="globe" size={18} />{t("nav.language")}</button></nav></header><main>{children}</main></div>;
}

export function KeyUsagePage() {
  const { t, locale, formatCurrency, formatNumber, formatDate } = useLocale();
  const [apiKey, setApiKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [days, setDays] = useState(30);
  const [state, setState] = useState({ loading: false, error: "", data: null });
  const requestRef = useRef(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const query = async (range = days) => {
    if (!apiKey.trim()) return;
    requestRef.current?.abort();
    setState({ loading: true, error: "", data: null });
    const controller = new AbortController();
    requestRef.current = controller;
    try { const data = await usageApi.publicKeyUsage(apiKey.trim(), { start_date: dateInput(-range), end_date: dateInput(), days: range }, controller.signal); setState({ loading: false, error: "", data }); }
    catch (error) { if (error.name !== "AbortError") setState({ loading: false, error: error.message, data: null }); }
  };
  const rings = usageRings(state.data, locale);
  const usage = state.data?.usage || {};
  const today = usage.today || {};
  const total = usage.total || {};
  const daily = Array.isArray(state.data?.daily_usage) ? state.data.daily_usage : [];
  const models = Array.isArray(state.data?.model_stats) ? state.data.model_stats : [];
  const dailyColumns = useMemo(() => [
    { key: "date", label: t("common.date"), render: (row) => formatDate(row.date) }, { key: "requests", label: t("usage.requests"), render: (row) => formatNumber(row.requests), align: "right" },
    { key: "input_tokens", label: locale === "zh" ? "输入 Token" : "Input tokens", render: (row) => formatNumber(row.input_tokens), align: "right" },
    { key: "output_tokens", label: locale === "zh" ? "输出 Token" : "Output tokens", render: (row) => formatNumber(row.output_tokens), align: "right" },
    { key: "actual_cost", label: t("usage.actualCost"), render: (row) => formatCurrency(row.actual_cost ?? row.cost), align: "right" },
  ], [formatCurrency, formatDate, formatNumber, locale, t]);

  return <PublicShell><div className="console-key-usage-hero"><span><Icon name="key" size={23} /></span><h1>{t("keyUsage.title")}</h1><p>{t("keyUsage.subtitle")}</p><div className="console-key-query"><div><TextInput type={visible ? "text" : "password"} value={apiKey} onChange={(event) => setApiKey(event.target.value)} onKeyDown={(event) => event.key === "Enter" && query()} placeholder={t("keyUsage.placeholder")} autoComplete="off" /><IconButton icon={visible ? "eyeOff" : "eye"} label="Toggle visibility" onClick={() => setVisible((value) => !value)} /></div><Button variant="primary" icon="search" onClick={() => query()} disabled={state.loading}>{t("keyUsage.query")}</Button></div><small>{t("keyUsage.privacy")}</small>{state.data && <div className="console-tabs">{[7, 30, 90].map((value) => <button className={days === value ? "is-active" : ""} key={value} onClick={() => { setDays(value); query(value); }}>{value}d</button>)}</div>}</div>
    {state.loading && <Panel><Spinner /></Panel>}{state.error && <Panel><ErrorState message={state.error} onRetry={() => query()} /></Panel>}{state.data && <div className="console-key-usage-results"><div className="console-key-status"><StatusBadge status={state.data.status || "active"} label={statusLabel(state.data.status || "active", locale)} /><strong>{state.data.planName || (state.data.mode === "quota_limited" ? (locale === "zh" ? "额度模式" : "Quota mode") : (locale === "zh" ? "余额模式" : "Wallet mode"))}</strong>{state.data.expires_at && <span>{formatDate(state.data.expires_at)}</span>}</div><div className="console-grid console-grid--3">{rings.map((item, index) => <Panel key={`${item.label}-${index}`}><div className="console-panel-body console-public-quota"><span>{item.label}</span><strong>{item.balance != null ? formatCurrency(item.balance) : `${formatCurrency(item.used)} / ${formatCurrency(item.limit)}`}</strong>{item.limit > 0 && <ProgressBar value={Number(item.used || 0) / item.limit * 100} tone={Number(item.used || 0) / item.limit > .9 ? "danger" : "green"} />}{item.reset && <small>{formatDate(item.reset)}</small>}</div></Panel>)}</div><div className="console-stat-grid console-stat-grid--4"><StatCard label={locale === "zh" ? "今日请求" : "Today requests"} value={formatNumber(today.requests)} icon="pulse" /><StatCard label={locale === "zh" ? "今日 Token" : "Today tokens"} value={formatNumber(today.total_tokens)} icon="chart" tone="green" /><StatCard label={locale === "zh" ? "累计请求" : "Total requests"} value={formatNumber(total.requests)} icon="pulse" tone="amber" /><StatCard label={t("usage.avgLatency")} value={formatDuration(usage.average_duration_ms)} icon="clock" tone="rose" /></div><div className="console-grid console-grid--sidebar"><Panel title={locale === "zh" ? "每日用量" : "Daily usage"}><LineChart data={daily} valueKey="total_tokens" /></Panel><Panel title={t("dashboard.models")}><div className="console-panel-body console-model-list">{models.slice(0, 8).map((model) => <div key={model.model}><strong>{model.model}</strong><span>{formatNumber(model.total_tokens)}</span></div>)}{!models.length && <EmptyState />}</div></Panel></div><Panel title={locale === "zh" ? "每日明细" : "Daily details"}><DataTable columns={dailyColumns} rows={daily} /></Panel></div>}
  </PublicShell>;
}
