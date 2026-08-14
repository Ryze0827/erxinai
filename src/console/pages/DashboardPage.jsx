import { useCallback, useEffect, useRef, useState } from "react";
import { Skeleton } from "@appica/ui-react/skeleton";
import { Link } from "react-router";
import { usageApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { NATIVE_CUSTOM_PAGE, nativeCustomPageRoute } from "../nativeCustomPages";
import { Button, ErrorState, InlineButton, Page, Panel } from "../UI";
import { DistributionChart, UsageTrendChart } from "../components/UsageCharts";
import { dateInput, formatDuration, formatTokenMillions, formatTokenMillionsFixed } from "../utils";

const TOKEN_ACTIVITY_DAY_COUNT = 183;
const IMAGE_STUDIO_PATH = nativeCustomPageRoute(NATIVE_CUSTOM_PAGE.imageStudio);

function settledValue(result, fallback) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function tokenActivityDays(items) {
  const values = new Map(items.map((item) => {
    const key = String(item.date || item.day || item.created_at || "").slice(0, 10);
    return [key, {
      tokens: Number(item.total_tokens || item.tokens || 0),
      requests: Number(item.requests || item.total_requests || 0),
      actualCost: Number(item.actual_cost || item.total_actual_cost || 0),
    }];
  }));
  return Array.from({ length: TOKEN_ACTIVITY_DAY_COUNT }, (_, index) => {
    const date = dateInput(index - TOKEN_ACTIVITY_DAY_COUNT + 1);
    return { date, tokens: 0, requests: 0, actualCost: 0, ...values.get(date) };
  });
}

function tokenActivityMonths(days, formatDate) {
  const groups = new Map();
  days.forEach((day) => {
    const month = day.date.slice(0, 7);
    const current = groups.get(month) || { month, tokens: 0 };
    current.tokens += day.tokens;
    groups.set(month, current);
  });
  return [...groups.values()].slice(-6).map((item) => ({
    ...item,
    label: formatDate(`${item.month}-01`, { monthOnly: true }),
  }));
}

function TokenActivity({ items, loading, error, formatDate, formatNumber, formatCurrency, locale, onRetry, t }) {
  if (loading) return <Skeleton className="console-token-activity-loading" aria-hidden={false} role="status" aria-label={t("common.loading")} />;
  const days = tokenActivityDays(items);
  const maximum = Math.max(...days.map((day) => day.tokens), 0);
  const leading = (new Date(`${days[0].date}T00:00:00`).getDay() + 6) % 7;
  const cellCount = Math.ceil((leading + days.length) / 7) * 7;
  const columns = cellCount / 7;
  const months = tokenActivityMonths(days, formatDate);
  const weekdays = locale === "zh" ? ["一", "二", "三", "四", "五", "六", "日"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return <div className="console-token-activity"><div className="console-token-activity-legend" aria-hidden="true"><span>{locale === "zh" ? "少" : "Less"}</span>{Array.from({ length: 7 }, (_, index) => <i className={`is-level-${index + 1}`} key={index} />)}<span>{locale === "zh" ? "多" : "More"}</span></div><div className="console-token-activity-map"><div className="console-token-activity-weekdays" aria-hidden="true">{weekdays.map((day) => <span key={day}>{day}</span>)}</div><div className="console-token-activity-grid" role="grid" aria-label={t("dashboard.activity")} style={{ "--console-activity-columns": columns }}>{Array.from({ length: cellCount }, (_, index) => {
    const day = days[index - leading];
    if (!day) return <i className="console-token-activity-placeholder" aria-hidden="true" key={`placeholder-${index}`} />;
    const level = day.tokens > 0 && maximum > 0 ? Math.max(1, Math.ceil(day.tokens / maximum * 7)) : 0;
    const label = `${formatDate(day.date, { dateOnly: true })} · ${formatTokenMillions(day.tokens)} Token · ${formatNumber(day.requests)} ${locale === "zh" ? "请求" : "requests"} · ${formatCurrency(day.actualCost)}`;
    const tooltipEdge = index < 14 ? "is-tooltip-start" : index >= cellCount - 14 ? "is-tooltip-end" : "";
    return <span className={`console-token-activity-cell is-level-${level} ${tooltipEdge}`} role="gridcell" tabIndex="0" aria-label={label} data-tooltip={label} key={day.date} />;
  })}</div></div><div className="console-token-activity-months" aria-hidden="true">{months.map((month) => <span key={month.month}><small>{month.label}</small><strong>{formatTokenMillions(month.tokens)}</strong></span>)}</div>{error && <div className="console-token-activity-error" role="alert"><small>{error}</small><InlineButton onClick={onRetry}>{t("common.retry")}</InlineButton></div>}</div>;
}

function dashboardDelta(current, previous, reverse = false) {
  if (previous == null || !Number.isFinite(Number(previous)) || Number(previous) === 0) return null;
  const percent = (Number(current || 0) - Number(previous)) / Math.abs(Number(previous)) * 100;
  return { percent, positive: reverse ? percent <= 0 : percent >= 0 };
}

function MetricDelta({ current, previous, previousLabel, reverse, formatPrevious }) {
  const delta = dashboardDelta(current, previous, reverse);
  return <div className="console-dashboard-metric-meta">{delta && <span className={delta.positive ? "is-positive" : "is-negative"}><Icon name={delta.percent >= 0 ? "arrowUp" : "arrowDown"} size={13} />{delta.percent >= 0 ? "+" : ""}{delta.percent.toFixed(1)}%</span>}<small>{previousLabel}{previous == null ? "—" : formatPrevious(previous)}</small></div>;
}

function DashboardMetric({ label, value, unit, tone = "", children }) {
  return <div className={`console-dashboard-metric ${tone ? `is-${tone}` : ""}`}><span>{label}<Icon name="info" size={13} /></span><strong>{value}{unit && <small>{unit}</small>}</strong>{children}</div>;
}

function DashboardPanelSkeleton({ className = "", rows = 4 }) {
  return <Panel className={`console-dashboard-panel-skeleton ${className}`.trim()} aria-hidden="true"><div className="console-dashboard-panel-skeleton-head"><Skeleton /></div><div className="console-dashboard-panel-skeleton-body">{Array.from({ length: rows }, (_, index) => <Skeleton key={index} />)}</div></Panel>;
}

function DashboardSkeleton({ title, loadingLabel }) {
  return <Page title={title} className="console-dashboard-page console-dashboard-loading"><span className="console-visually-hidden" role="status">{loadingLabel}</span><div className="console-dashboard-hero" aria-hidden="true"><div className="console-dashboard-greeting"><Skeleton className="console-dashboard-skeleton-title" /><Skeleton className="console-dashboard-skeleton-copy" /></div><div className="console-dashboard-quick-actions">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} />)}</div></div><section className="console-dashboard-metrics console-panel" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} />)}</section><div className="console-dashboard-chart-grid"><DashboardPanelSkeleton rows={5} /><DashboardPanelSkeleton rows={5} /></div><DashboardPanelSkeleton className="console-token-activity-panel" rows={3} /></Page>;
}

export function DashboardPage() {
  const { t, locale, formatNumber, formatCurrency, formatDate } = useLocale();
  const { user, refreshUser, settings } = useConsole();
  const simpleMode = user?.run_mode === "simple";
  const [range] = useState({ start_date: dateInput(-29), end_date: dateInput() });
  const [data, setData] = useState({ stats: null, models: [], trend: [] });
  const [activity, setActivity] = useState({ loading: true, error: "", items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectionErrors, setSectionErrors] = useState({ models: "", trend: "" });
  const mountedRef = useRef(true);
  const activityMountedRef = useRef(true);
  const loadedRef = useRef(false);
  const loadRequestRef = useRef(0);
  const activityRequestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++loadRequestRef.current;
    const initial = !loadedRef.current;
    if (initial) setLoading(true);
    setError("");
    const query = { ...range, granularity: "day" };
    try {
      const results = await Promise.allSettled([
        refreshUser(), usageApi.dashboardStats(), usageApi.dashboardModels(query),
        usageApi.dashboardTrend(query),
      ]);
      const stats = settledValue(results[1], null);
      if (!stats) throw results[1].reason || new Error(t("common.loadFailed"));
      if (!mountedRef.current || request !== loadRequestRef.current) return;
      loadedRef.current = true;
      setData((current) => ({
        stats,
        models: results[2].status === "fulfilled" ? results[2].value?.models || [] : current.models,
        trend: results[3].status === "fulfilled" ? results[3].value?.trend || [] : current.trend,
      }));
      setSectionErrors({
        models: results[2].status === "rejected" ? results[2].reason?.message || t("common.loadFailed") : "",
        trend: results[3].status === "rejected" ? results[3].reason?.message || t("common.loadFailed") : "",
      });
    } catch (loadError) {
      if (mountedRef.current && request === loadRequestRef.current) setError(loadError.message || t("common.loadFailed"));
    } finally {
      if (mountedRef.current && request === loadRequestRef.current) {
        if (initial) setLoading(false);
      }
    }
  }, [range, refreshUser, t]);

  const loadActivity = useCallback(async (signal) => {
    const request = ++activityRequestRef.current;
    setActivity((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await usageApi.dashboardTrend({ start_date: dateInput(-TOKEN_ACTIVITY_DAY_COUNT + 1), end_date: dateInput(), granularity: "day" }, signal);
      if (activityMountedRef.current && request === activityRequestRef.current) setActivity({ loading: false, error: "", items: response.trend || [] });
    } catch (activityError) {
      if (activityMountedRef.current && request === activityRequestRef.current) setActivity((current) => ({ ...current, loading: false, error: activityError.message || t("common.loadFailed") }));
    }
  }, [t]);

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => { mountedRef.current = false; loadRequestRef.current += 1; };
  }, [load]);
  useEffect(() => {
    const controller = new AbortController();
    activityMountedRef.current = true;
    loadActivity(controller.signal);
    return () => { activityMountedRef.current = false; activityRequestRef.current += 1; controller.abort(); };
  }, [loadActivity]);
  if (loading) return <DashboardSkeleton title={t("nav.dashboard")} loadingLabel={t("common.loading")} />;
  if (error && !data.stats) return <Page title={t("nav.dashboard")}><Panel><ErrorState message={error} onRetry={() => load()} /></Panel></Page>;

  const stats = data.stats || {};
  const displayName = user?.username || user?.email?.split("@")[0] || (locale === "zh" ? "用户" : "there");
  const hour = new Date().getHours();
  const greeting = locale === "zh" ? (hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好") : (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  const todayStandard = Number(stats.today_cost ?? stats.today_standard_cost ?? stats.today_actual_cost) || 0;
  const todayActual = Number(stats.today_actual_cost) || 0;
  const savedPercent = todayStandard > 0 ? Math.max(0, (todayStandard - todayActual) / todayStandard * 100) : null;
  const totalTrendTokens = data.trend.reduce((sum, item) => sum + Number(item.total_tokens || item.input_tokens || 0) + (item.total_tokens ? 0 : Number(item.output_tokens || 0) + Number(item.cache_creation_tokens || 0) + Number(item.cache_read_tokens || 0)), 0);
  const greetingDate = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date());
  const activityMonths = tokenActivityMonths(tokenActivityDays(activity.items), formatDate);
  const activityPeriod = activityMonths.length
    ? `${activityMonths[0].label}–${activityMonths.at(-1).label} ${new Date().getFullYear()}`
    : (locale === "zh" ? "最近六个月" : "Latest six months");
  return <Page className="console-dashboard-page">
    {error && <div className="console-dashboard-inline-error" role="alert"><Icon name="warning" size={17} /><span>{error}</span><Button onClick={() => load()}>{t("common.retry")}</Button></div>}
    <div className="console-dashboard-hero"><div className="console-dashboard-greeting"><h1>{greeting}, {displayName}</h1><p>{greetingDate}</p></div>{savedPercent != null && <div className="console-dashboard-saving"><i><Icon name="chart" size={22} /></i><span>{locale === "zh" ? <>今日支出较标准费用低 <strong>{savedPercent.toFixed(1)}%</strong>。</> : <>Today's spend is <strong>{savedPercent.toFixed(1)}%</strong> below standard cost.</>}</span></div>}<div className="console-dashboard-quick-actions"><Link to="/keys?create=1"><Icon name="key" size={21} /><span>{t("dashboard.createKey")}</span></Link>{!simpleMode && <Link to="/usage"><Icon name="chart" size={21} /><span>{t("dashboard.inspectUsage")}</span></Link>}{!simpleMode && settings?.payment_enabled !== false && <Link to="/purchase"><Icon name="plus" size={21} /><span>{t("dashboard.addCredit")}</span></Link>}{!simpleMode && <Link to={IMAGE_STUDIO_PATH}><Icon name="image" size={21} /><span>{t("dashboard.generateImage")}</span></Link>}{!simpleMode && <Link to="/redeem"><Icon name="gift" size={21} /><span>{t("redeem.title")}</span></Link>}</div></div>
    <section className="console-dashboard-metrics console-panel">
      <DashboardMetric label={locale === "zh" ? "今日 Token" : "Today's tokens"} value={formatTokenMillions(stats.today_tokens)} tone="accent"><MetricDelta current={stats.today_tokens} previous={stats.yesterday_tokens} previousLabel={locale === "zh" ? "昨日同期 · " : "vs same time yesterday · "} formatPrevious={formatTokenMillions} /></DashboardMetric>
      <DashboardMetric label={locale === "zh" ? "吞吐量" : "Throughput"} value={formatNumber(stats.rpm, { maximumFractionDigits: 0 })} unit="RPM" />
      <DashboardMetric label={t("dashboard.latency")} value={formatDuration(stats.average_duration_ms)} />
      <DashboardMetric label="TPM" value={formatTokenMillionsFixed(stats.tpm)} tone="accent" />
      <DashboardMetric label={locale === "zh" ? "今日请求" : "Today's requests"} value={formatNumber(stats.today_requests)}><MetricDelta current={stats.today_requests} previous={stats.yesterday_requests} previousLabel={locale === "zh" ? "昨日同期 · " : "vs same time yesterday · "} formatPrevious={(value) => formatNumber(value)} /></DashboardMetric>
      <DashboardMetric label={locale === "zh" ? "今日实际费用" : "Today's actual spend"} value={formatNumber(todayActual, { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", minimumFractionDigits: 4, maximumFractionDigits: 4 })} tone="accent"><MetricDelta current={todayActual} previous={stats.yesterday_actual_cost} reverse previousLabel={locale === "zh" ? "昨日同期 · " : "vs same time yesterday · "} formatPrevious={formatCurrency} /></DashboardMetric>
      <DashboardMetric label={locale === "zh" ? "标准费用" : "Standard cost"} value={formatCurrency(todayStandard)}><div className="console-dashboard-saved">{savedPercent == null ? <small>{locale === "zh" ? "已节省 · —" : "Saved · —"}</small> : <><span>{locale === "zh" ? "已节省" : "Saved"}</span><strong>{savedPercent.toFixed(1)}%</strong></>}</div></DashboardMetric>
    </section>
    <div className="console-dashboard-chart-grid">{sectionErrors.trend ? <Panel className="console-trend console-dashboard-section-error" title={locale === "zh" ? "Token 用量" : "Token usage"}><ErrorState message={sectionErrors.trend} onRetry={() => load()} /></Panel> : <UsageTrendChart data={data.trend} loading={loading} variant="total" total={totalTrendTokens} rangeLabel={locale === "zh" ? "近 30 天" : "Last 30 days"} />}{sectionErrors.models ? <Panel className="console-dashboard-model-distribution console-dashboard-section-error" title={t("dashboard.models")}><ErrorState message={sectionErrors.models} onRetry={() => load()} /></Panel> : <DistributionChart className="console-dashboard-model-distribution" title={t("dashboard.models")} rangeLabel={locale === "zh" ? "近 30 天" : "Last 30 days"} data={data.models} nameKey="model" limit={4} showMetricTabs={false} actualOnly itemLabel={t("usage.model")} tokenLabel="Token" centerValue={formatTokenMillions(totalTrendTokens)} centerLabel={locale === "zh" ? "近 30 天 Token" : "Tokens · 30 days"} />}</div>
    <Panel className="console-token-activity-panel" title={locale === "zh" ? "六个月脉冲" : "Six-month pulse"} actions={<span className="console-token-activity-period">{locale === "zh" ? `Token 热力图 · ${activityPeriod}` : `Token heatmap · ${activityPeriod}`}</span>}><TokenActivity items={activity.items} loading={activity.loading} error={activity.error} formatDate={formatDate} formatNumber={formatNumber} formatCurrency={formatCurrency} locale={locale} onRetry={() => loadActivity()} t={t} /></Panel>
  </Page>;
}
