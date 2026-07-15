import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usageApi, userApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { DataTable, EmptyState, ErrorState, LineChart, Page, Panel, ProgressBar, Spinner, StatCard, StatusBadge } from "../UI";
import { dateInput, formatCompact, formatDuration, statusLabel } from "../utils";

function settledValue(result, fallback) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function ModelDistribution({ models, formatNumber }) {
  const total = models.reduce((sum, item) => sum + Number(item.total_tokens || item.tokens || 0), 0) || 1;
  if (!models.length) return <EmptyState />;
  return <div className="console-distribution">{models.slice(0, 7).map((item, index) => {
    const value = Number(item.total_tokens || item.tokens || 0);
    const percent = value / total * 100;
    return <div key={item.model || index}><div><strong>{item.model || "Unknown"}</strong><span>{formatNumber(value)} · {percent.toFixed(1)}%</span></div><ProgressBar value={percent} tone={index % 2 ? "green" : "primary"} /></div>;
  })}</div>;
}

function TokenBreakdown({ stats, formatNumber, locale }) {
  const items = [
    [locale === "zh" ? "输入 Token" : "Input tokens", stats.total_input_tokens],
    [locale === "zh" ? "输出 Token" : "Output tokens", stats.total_output_tokens],
    [locale === "zh" ? "缓存创建" : "Cache creation", stats.total_cache_creation_tokens],
    [locale === "zh" ? "缓存读取" : "Cache read", stats.total_cache_read_tokens],
  ];
  return <div className="console-public-metrics">{items.map(([label, value]) => <div key={label}><span>{label}</span><strong>{formatNumber(value)}</strong></div>)}</div>;
}

function PlatformDistribution({ items, formatCurrency, formatNumber, locale }) {
  if (!items.length) return <EmptyState />;
  return <div className="console-distribution">{items.map((item, index) => {
    const label = item.platform || (locale === "zh" ? "其他" : "Other");
    return <div key={`${label}-${index}`}><div><strong>{label}</strong><span>{formatNumber(item.total_requests)} · {formatCurrency(item.total_actual_cost)}</span></div><small>{locale === "zh" ? "今日" : "Today"}: {formatNumber(item.today_requests)} · {formatCurrency(item.today_actual_cost)}</small></div>;
  })}</div>;
}

function PlatformQuotas({ items, formatCurrency, locale, t }) {
  if (!items.length) return <EmptyState />;
  const labels = locale === "zh" ? { daily: "每日", weekly: "每周", monthly: "每月" } : { daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
  return <div className="console-quota-list">{items.map((item, index) => {
    const windows = ["daily", "weekly", "monthly"].flatMap((key) => item[`${key}_limit_usd`] == null ? [] : [{ key, limit: Number(item[`${key}_limit_usd`]), used: Number(item[`${key}_usage_usd`] || 0) }]);
    const peak = windows.reduce((maximum, entry) => entry.limit > 0 ? Math.max(maximum, entry.used / entry.limit * 100) : Math.max(maximum, 100), 0);
    return <div key={item.platform || item.name || index}><div><span className="console-platform-icon">{String(item.platform || item.name || "AI").slice(0, 2).toUpperCase()}</span><div><strong>{item.display_name || item.platform || item.name}</strong><small>{windows.length ? `${windows.length} ${locale === "zh" ? "个配额周期" : "quota windows"}` : t("common.unlimited")}</small></div><StatusBadge status={peak >= 90 ? "degraded" : "operational"} /></div>{windows.map((entry) => <div className="console-subscription-quota" key={entry.key}><div><strong>{labels[entry.key]}</strong><span>{entry.limit > 0 ? `${formatCurrency(entry.used)} / ${formatCurrency(entry.limit)}` : (locale === "zh" ? "已禁用" : "Disabled")}</span></div><ProgressBar value={entry.limit > 0 ? entry.used / entry.limit * 100 : 100} tone={entry.limit <= 0 || entry.used / entry.limit >= .9 ? "danger" : "green"} /></div>)}</div>;
  })}</div>;
}

export function DashboardPage() {
  const { t, locale, formatNumber, formatCurrency, formatDate } = useLocale();
  const { user, refreshUser, settings } = useConsole();
  const simpleMode = user?.run_mode === "simple";
  const [data, setData] = useState({ stats: null, trend: [], models: [], recent: [], quotas: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const range = { start_date: dateInput(-6), end_date: dateInput(), granularity: "day" };
    try {
      const results = await Promise.allSettled([
        refreshUser(), usageApi.dashboardStats(), usageApi.dashboardTrend(range),
        usageApi.dashboardModels(range), usageApi.list({ ...range, page: 1, page_size: 5, sort_by: "created_at", sort_order: "desc" }),
        userApi.getPlatformQuotas(),
      ]);
      const stats = settledValue(results[1], null);
      if (!stats) throw results[1].reason || new Error(t("common.loadFailed"));
      const trend = settledValue(results[2], {});
      const models = settledValue(results[3], {});
      const recent = settledValue(results[4], {});
      const quotas = settledValue(results[5], {});
      if (!mountedRef.current) return;
      setData({ stats, trend: trend.trend || [], models: models.models || [], recent: recent.items || [], quotas: quotas.platform_quotas || [] });
    } catch (loadError) {
      if (mountedRef.current) setError(loadError.message || t("common.loadFailed"));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [refreshUser, t]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; };
  }, [load]);
  if (loading) return <Page title={t("nav.dashboard")}><Panel><Spinner /></Panel></Page>;
  if (error) return <Page title={t("nav.dashboard")}><Panel><ErrorState message={error} onRetry={load} /></Panel></Page>;

  const stats = data.stats || {};
  const columns = [
    { key: "model", label: t("usage.model"), render: (row) => <strong className="console-strong">{row.model || "—"}</strong> },
    { key: "tokens", label: t("usage.tokens"), render: (row) => formatNumber(row.total_tokens), align: "right" },
    { key: "cost", label: t("usage.actualCost"), render: (row) => formatCurrency(row.actual_cost ?? row.cost), align: "right" },
    { key: "duration", label: t("usage.duration"), render: (row) => formatDuration(row.duration_ms), align: "right" },
    { key: "status", label: t("common.status"), render: (row) => <StatusBadge status={row.status || "completed"} label={statusLabel(row.status || "completed", locale)} /> },
    { key: "created_at", label: t("common.date"), render: (row) => formatDate(row.created_at) },
  ];

  return <Page title={t("dashboard.title")} subtitle={t("dashboard.subtitle")} actions={<button className="console-refresh-action" onClick={load}><Icon name="refresh" size={17} />{t("common.refresh")}</button>}>
    <div className="console-stat-grid">
      {!simpleMode && <StatCard label={t("dashboard.balance")} value={formatCurrency(user?.balance || 0)} meta={`${t("dashboard.today")}: ${formatCurrency(stats.today_actual_cost)}`} icon="dollar" />}
      <StatCard label={t("dashboard.keys")} value={`${formatNumber(stats.active_api_keys)} / ${formatNumber(stats.total_api_keys)}`} meta={t("keys.title")} icon="key" tone="green" />
      <StatCard label={t("dashboard.requests")} value={formatCompact(stats.total_requests, locale)} meta={`${t("dashboard.today")}: ${formatNumber(stats.today_requests)}`} icon="pulse" tone="amber" />
      <StatCard label={t("dashboard.tokens")} value={formatCompact(stats.total_tokens, locale)} meta={`${t("dashboard.today")}: ${formatCompact(stats.today_tokens, locale)}`} icon="chart" />
      <StatCard label={t("dashboard.cost")} value={formatCurrency(stats.total_actual_cost)} meta={`${locale === "zh" ? "标准费用" : "Standard"}: ${formatCurrency(stats.total_cost)}`} icon="dollar" tone="rose" />
      <StatCard label="RPM / TPM" value={`${formatNumber(stats.rpm)} / ${formatCompact(stats.tpm, locale)}`} meta={`${t("dashboard.latency")}: ${formatDuration(stats.average_duration_ms)}`} icon="pulse" tone="green" />
    </div>
    <div className="console-grid console-grid--sidebar">
      <Panel title={t("dashboard.trend")}><LineChart data={data.trend} valueKey="total_tokens" /></Panel>
      <Panel title={t("dashboard.quick")}><div className="console-quick-actions"><Link to="/keys"><Icon name="key" size={19} /><span><strong>{t("dashboard.createKey")}</strong><small>{t("keys.subtitle")}</small></span><Icon name="chevronRight" size={15} /></Link>{!simpleMode && <Link to="/usage"><Icon name="chart" size={19} /><span><strong>{t("dashboard.inspectUsage")}</strong><small>{t("usage.subtitle")}</small></span><Icon name="chevronRight" size={15} /></Link>}{!simpleMode && <Link to="/batch-image"><Icon name="image" size={19} /><span><strong>{t("batch.title")}</strong><small>{t("batch.subtitle")}</small></span><Icon name="chevronRight" size={15} /></Link>}{!simpleMode && <Link to="/redeem"><Icon name="gift" size={19} /><span><strong>{t("redeem.title")}</strong><small>{t("redeem.subtitle")}</small></span><Icon name="chevronRight" size={15} /></Link>}{!simpleMode && settings?.payment_enabled !== false && <Link to="/purchase"><Icon name="cart" size={19} /><span><strong>{t("dashboard.addCredit")}</strong><small>{t("purchase.subtitle")}</small></span><Icon name="chevronRight" size={15} /></Link>}</div></Panel>
    </div>
    <Panel title={locale === "zh" ? "Token 构成" : "Token breakdown"}><div className="console-panel-body"><TokenBreakdown stats={stats} formatNumber={formatNumber} locale={locale} /></div></Panel>
    <div className="console-grid console-grid--2">
      <Panel title={t("dashboard.models")}><div className="console-panel-body"><ModelDistribution models={data.models} formatNumber={formatNumber} /></div></Panel>
      {!simpleMode && <Panel title={t("dashboard.platforms")}><div className="console-panel-body"><PlatformDistribution items={stats.by_platform || []} formatCurrency={formatCurrency} formatNumber={formatNumber} locale={locale} /></div></Panel>}
    </div>
    {!simpleMode && <Panel title={locale === "zh" ? "平台配额" : "Platform quotas"}><div className="console-panel-body"><PlatformQuotas items={data.quotas} formatCurrency={formatCurrency} locale={locale} t={t} /></div></Panel>}
    <Panel title={t("dashboard.recent")} actions={!simpleMode && <Link className="console-text-link" to="/usage">{t("usage.records")}<Icon name="chevronRight" size={14} /></Link>}><DataTable columns={columns} rows={data.recent} /></Panel>
  </Page>;
}
