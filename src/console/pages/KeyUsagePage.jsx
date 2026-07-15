import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usageApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, DataTable, EmptyState, ErrorState, Field, IconButton, LineChart, Panel, ProgressBar, Spinner, StatusBadge, TextInput, ThemeToggle } from "../UI";
import { dateInput, formatDuration, safeExternalUrl, safeImageUrl, statusLabel } from "../utils";

const rangeOptions = ["today", "7d", "30d", "custom"];
const dailyOptions = [7, 30, 90];

function rangeLabel(value, locale) {
  const labels = {
    en: { today: "Today", "7d": "7 days", "30d": "30 days", custom: "Custom" },
    zh: { today: "今天", "7d": "近 7 天", "30d": "近 30 天", custom: "自定义" },
  };
  return labels[locale][value];
}

function rangeDates(range, start, end) {
  if (range === "custom") return { start_date: start, end_date: end };
  const offset = range === "today" ? 0 : range === "7d" ? -6 : -29;
  return { start_date: dateInput(offset), end_date: dateInput() };
}

function usageRings(data, locale) {
  if (!data) return [];
  if (data.mode === "quota_limited") {
    const quota = data.quota ? [{ label: locale === "zh" ? "总额度" : "Total quota", used: data.quota.used, limit: data.quota.limit, reset: data.expires_at }] : [];
    return quota.concat((data.rate_limits || []).map((item) => ({ label: `${item.window} ${locale === "zh" ? "周期" : "window"}`, used: item.used, limit: item.limit, reset: item.reset_at })));
  }
  if (data.subscription) {
    return ["daily", "weekly", "monthly"].flatMap((period) => data.subscription[`${period}_limit_usd`] > 0 ? [{ label: period, used: data.subscription[`${period}_usage_usd`], limit: data.subscription[`${period}_limit_usd`], reset: data.subscription.expires_at }] : []);
  }
  return data.balance != null ? [{ label: locale === "zh" ? "钱包余额" : "Wallet balance", balance: data.balance }] : [];
}

function quotaDetailRows(data, locale, formatCurrency, formatDate) {
  const rows = [];
  if (data.quota) rows.push({ icon: "shield", label: locale === "zh" ? "剩余额度" : "Remaining quota", value: formatCurrency(data.quota.remaining) });
  if (data.expires_at) rows.push({ icon: "calendar", label: locale === "zh" ? "密钥到期" : "Key expires", value: formatDate(data.expires_at) });
  (data.rate_limits || []).forEach((item) => rows.push({ icon: "clock", label: `${item.window} ${locale === "zh" ? "已用额度" : "used quota"}`, value: `${formatCurrency(item.used)} / ${formatCurrency(item.limit)}` }));
  return rows;
}

function walletDetailRows(data, locale, formatCurrency, formatDate) {
  const rows = [];
  rows.push({ icon: "card", label: locale === "zh" ? "计费方式" : "Billing plan", value: data.planName || (locale === "zh" ? "钱包余额" : "Wallet balance") });
  if (data.remaining != null) rows.push({ icon: "shield", label: locale === "zh" ? "剩余额度" : "Remaining quota", value: formatCurrency(data.remaining) });
  if (data.subscription?.expires_at) rows.push({ icon: "calendar", label: locale === "zh" ? "订阅到期" : "Subscription expires", value: formatDate(data.subscription.expires_at) });
  return rows;
}

function detailRows(data, locale, formatCurrency, formatDate) {
  if (!data) return [];
  return data.mode === "quota_limited"
    ? quotaDetailRows(data, locale, formatCurrency, formatDate)
    : walletDetailRows(data, locale, formatCurrency, formatDate);
}

function metricCells(data, locale, formatCurrency, formatNumber) {
  const usage = data?.usage;
  if (!usage) return [];
  const today = usage.today || {};
  const total = usage.total || {};
  const n = (value) => formatNumber(value);
  const todayPrefix = locale === "zh" ? "今日" : "Today";
  const totalPrefix = locale === "zh" ? "累计" : "Total";
  return [
    [locale === "zh" ? "今日请求" : "Today requests", n(today.requests)],
    [`${todayPrefix} Input`, n(today.input_tokens)], [`${todayPrefix} Output`, n(today.output_tokens)],
    [`${todayPrefix} Token`, n(today.total_tokens)], [`${todayPrefix} Cache create`, n(today.cache_creation_tokens)],
    [`${todayPrefix} Cache read`, n(today.cache_read_tokens)], [locale === "zh" ? "今日费用" : "Today cost", formatCurrency(today.actual_cost)],
    ["RPM / TPM", `${n(usage.rpm)} / ${n(usage.tpm)}`],
    [locale === "zh" ? "累计请求" : "Total requests", n(total.requests)],
    [`${totalPrefix} Input`, n(total.input_tokens)], [`${totalPrefix} Output`, n(total.output_tokens)],
    [`${totalPrefix} Token`, n(total.total_tokens)], [`${totalPrefix} Cache create`, n(total.cache_creation_tokens)],
    [`${totalPrefix} Cache read`, n(total.cache_read_tokens)], [locale === "zh" ? "累计费用" : "Total cost", formatCurrency(total.actual_cost)],
    [locale === "zh" ? "平均耗时" : "Average duration", formatDuration(usage.average_duration_ms)],
  ].map(([label, value]) => ({ label, value }));
}

function PublicShell({ children }) {
  const { settings } = useConsole();
  const { locale, setLocale, t } = useLocale();
  const logo = safeImageUrl(settings?.site_logo) || "/assets/img/sentence-ai-icon.png";
  const docs = safeExternalUrl(settings?.doc_url);
  const siteName = settings?.site_name || "Sentence AI";
  return <div className="console-public-shell console-key-usage-shell"><div className="console-scene" /><header><Link to="/"><img src={logo} alt="" /><strong>{siteName}</strong></Link><nav>{docs && <a href={docs} target="_blank" rel="noreferrer"><Icon name="book" size={18} />{t("nav.docs")}</a>}<button onClick={() => setLocale(locale === "en" ? "zh" : "en")}><Icon name="globe" size={18} />{t("nav.language")}</button><ThemeToggle /></nav></header><main>{children}</main><footer>© {new Date().getFullYear()} {siteName}</footer></div>;
}

function RangePicker({ range, setRange, custom, setCustom, locale, onApply }) {
  return <div className="console-public-range"><span>{locale === "zh" ? "统计范围" : "Summary range"}</span><div className="console-tabs">{rangeOptions.map((value) => <button className={range === value ? "is-active" : ""} key={value} onClick={() => { setRange(value); if (value !== "custom") onApply({ range: value }); }}>{rangeLabel(value, locale)}</button>)}</div>{range === "custom" && <div className="console-public-custom-range"><TextInput type="date" value={custom.start} onChange={(event) => setCustom((current) => ({ ...current, start: event.target.value }))} /><span>—</span><TextInput type="date" value={custom.end} onChange={(event) => setCustom((current) => ({ ...current, end: event.target.value }))} /><Button onClick={() => onApply({ range: "custom", custom })}>{locale === "zh" ? "应用" : "Apply"}</Button></div>}</div>;
}

function QuotaCards({ items, locale, formatCurrency, formatDate }) {
  return <div className="console-grid console-grid--3">{items.map((item, index) => {
    const percent = item.limit > 0 ? Number(item.used || 0) / item.limit * 100 : 0;
    return <Panel key={`${item.label}-${index}`}><div className="console-panel-body console-public-quota"><span>{item.label}</span><strong>{item.balance != null ? formatCurrency(item.balance) : `${formatCurrency(item.used)} / ${formatCurrency(item.limit)}`}</strong>{item.limit > 0 && <ProgressBar value={percent} tone={percent > 90 ? "danger" : "green"} />}{item.reset && <small>{locale === "zh" ? "重置 / 到期" : "Reset / expiry"}: {formatDate(item.reset)}</small>}</div></Panel>;
  })}</div>;
}

function DetailPanel({ rows, locale }) {
  if (!rows.length) return null;
  return <Panel title={locale === "zh" ? "额度与状态明细" : "Quota and status details"}><div className="console-panel-body console-key-detail-list">{rows.map((row) => <div key={`${row.label}-${row.value}`}><span><i><Icon name={row.icon} size={16} /></i>{row.label}</span><strong>{row.value}</strong></div>)}</div></Panel>;
}

function MetricsPanel({ items, locale }) {
  if (!items.length) return null;
  return <Panel title={locale === "zh" ? "Token 与请求统计" : "Token and request statistics"}><div className="console-public-metrics">{items.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}</div></Panel>;
}

function planLabel(data, locale) {
  if (data.planName) return data.planName;
  if (data.mode === "quota_limited") return locale === "zh" ? "额度密钥" : "Quota key";
  return locale === "zh" ? "余额计费" : "Wallet billing";
}

function KeyUsageHero({ apiKey, setApiKey, visible, setVisible, state, range, setRange, custom, setCustom, locale, query, t }) {
  const visibilityLabel = locale === "zh" ? "切换密钥可见性" : "Toggle key visibility";
  return <div className="console-key-usage-hero"><span><Icon name="key" size={23} /></span><h1>{t("keyUsage.title")}</h1><p>{t("keyUsage.subtitle")}</p><div className="console-key-query"><div><TextInput type={visible ? "text" : "password"} value={apiKey} onChange={(event) => setApiKey(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") query(); }} placeholder={t("keyUsage.placeholder")} autoComplete="off" /><IconButton icon={visible ? "eyeOff" : "eye"} label={visibilityLabel} onClick={() => setVisible((value) => !value)} /></div><Button variant="primary" icon="search" onClick={() => query()} disabled={state.loading}>{state.loading ? t("common.loading") : t("keyUsage.query")}</Button></div><small>{t("keyUsage.privacy")}</small>{state.data && <RangePicker range={range} setRange={setRange} custom={custom} setCustom={setCustom} locale={locale} onApply={query} />}</div>;
}

function KeyUsageResults({ data, range, dailyDays, setDailyDays, dailyColumns, modelColumns, locale, formatCurrency, formatNumber, formatDate, query, t }) {
  const daily = Array.isArray(data.daily_usage) ? data.daily_usage : [];
  const models = Array.isArray(data.model_stats) ? data.model_stats : [];
  const rings = usageRings(data, locale);
  const details = detailRows(data, locale, formatCurrency, formatDate);
  const metrics = metricCells(data, locale, formatCurrency, formatNumber);
  return <div className="console-key-usage-results"><div className="console-key-status"><StatusBadge status={data.status || "active"} label={statusLabel(data.status || "active", locale)} /><strong>{planLabel(data, locale)}</strong>{data.expires_at && <span>{formatDate(data.expires_at)}</span>}</div><QuotaCards items={rings} locale={locale} formatCurrency={formatCurrency} formatDate={formatDate} /><DetailPanel rows={details} locale={locale} /><MetricsPanel items={metrics} locale={locale} /><div className="console-grid console-grid--sidebar"><Panel title={locale === "zh" ? "每日用量趋势" : "Daily usage trend"}><LineChart data={daily} valueKey="total_tokens" /></Panel><Panel title={locale === "zh" ? "当前查询" : "Current query"}><div className="console-panel-body console-key-query-summary"><span>{rangeLabel(range, locale)}</span><strong>{daily.length} {locale === "zh" ? "天有记录" : "active day(s)"}</strong><small>{locale === "zh" ? "下方明细周期可独立切换" : "The detail period can be changed independently below"}</small></div></Panel></div><Panel title={locale === "zh" ? "每日明细" : "Daily details"} actions={<div className="console-tabs">{dailyOptions.map((value) => <button className={dailyDays === value ? "is-active" : ""} key={value} onClick={() => { setDailyDays(value); query({ dailyDays: value }); }}>{value}d</button>)}</div>}><DataTable columns={dailyColumns} rows={daily} empty={<EmptyState />} /></Panel><Panel title={locale === "zh" ? "模型明细" : "Model details"}><DataTable columns={modelColumns} rows={models} empty={<EmptyState />} /></Panel></div>;
}

function KeyUsageState({ state, onRetry, resultProps }) {
  if (state.loading) return <Panel><Spinner /></Panel>;
  if (state.error) return <Panel><ErrorState message={state.error} onRetry={onRetry} /></Panel>;
  if (!state.data) return null;
  return <KeyUsageResults data={state.data} {...resultProps} />;
}

export function KeyUsagePage() {
  const { t, locale, formatCurrency, formatNumber, formatDate } = useLocale();
  const [apiKey, setApiKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [range, setRange] = useState("today");
  const [dailyDays, setDailyDays] = useState(30);
  const [custom, setCustom] = useState({ start: dateInput(-6), end: dateInput() });
  const [state, setState] = useState({ loading: false, error: "", data: null });
  const requestRef = useRef(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  const query = async (options = {}) => {
    const key = apiKey.trim();
    if (!key) return;
    const nextRange = options.range || range;
    const nextCustom = options.custom || custom;
    const nextDays = options.dailyDays || dailyDays;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState({ loading: true, error: "", data: null });
    try {
      const data = await usageApi.publicKeyUsage(key, { ...rangeDates(nextRange, nextCustom.start, nextCustom.end), days: nextDays }, controller.signal);
      setState({ loading: false, error: "", data });
    } catch (error) {
      if (error.name !== "AbortError") setState({ loading: false, error: error.message, data: null });
    }
  };

  const dailyColumns = useMemo(() => [
    { key: "date", label: t("common.date") }, { key: "requests", label: t("usage.requests"), render: (row) => formatNumber(row.requests), align: "right" },
    { key: "input_tokens", label: "Input", render: (row) => formatNumber(row.input_tokens), align: "right" }, { key: "output_tokens", label: "Output", render: (row) => formatNumber(row.output_tokens), align: "right" },
    { key: "cache_read_tokens", label: "Cache read", render: (row) => formatNumber(row.cache_read_tokens), align: "right" }, { key: "cache_write_tokens", label: "Cache create", render: (row) => formatNumber(row.cache_write_tokens ?? row.cache_creation_tokens), align: "right" },
    { key: "actual_cost", label: t("usage.actualCost"), render: (row) => formatCurrency(row.actual_cost ?? row.cost), align: "right" },
  ], [formatCurrency, formatNumber, t]);
  const modelColumns = useMemo(() => [
    { key: "model", label: t("dashboard.models") }, { key: "requests", label: t("usage.requests"), render: (row) => formatNumber(row.requests), align: "right" },
    { key: "input_tokens", label: "Input", render: (row) => formatNumber(row.input_tokens), align: "right" }, { key: "output_tokens", label: "Output", render: (row) => formatNumber(row.output_tokens), align: "right" },
    { key: "cache_creation_tokens", label: "Cache create", render: (row) => formatNumber(row.cache_creation_tokens), align: "right" }, { key: "cache_read_tokens", label: "Cache read", render: (row) => formatNumber(row.cache_read_tokens), align: "right" },
    { key: "total_tokens", label: t("usage.tokens"), render: (row) => formatNumber(row.total_tokens), align: "right" }, { key: "actual_cost", label: t("usage.actualCost"), render: (row) => formatCurrency(row.actual_cost ?? row.cost), align: "right" },
  ], [formatCurrency, formatNumber, t]);

  const resultProps = { range, dailyDays, setDailyDays, dailyColumns, modelColumns, locale, formatCurrency, formatNumber, formatDate, query, t };
  return <PublicShell><KeyUsageHero apiKey={apiKey} setApiKey={setApiKey} visible={visible} setVisible={setVisible} state={state} range={range} setRange={setRange} custom={custom} setCustom={setCustom} locale={locale} query={query} t={t} /><KeyUsageState state={state} onRetry={() => query()} resultProps={resultProps} /></PublicShell>;
}
