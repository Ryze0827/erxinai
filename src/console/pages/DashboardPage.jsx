import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { usageApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { NATIVE_CUSTOM_PAGE, nativeCustomPageRoute } from "../nativeCustomPages";
import { Button, ErrorState, Page, Panel, StatCard, StatCardSkeleton } from "../UI";
import { DateRangePicker } from "../components/ConsoleControls";
import { DistributionChart, UsageTrendChart } from "../components/UsageCharts";
import { dateInput, formatCompact, formatDuration, formatTokenMillions, formatTokenMillionsFixed } from "../utils";

const TOKEN_ACTIVITY_DAY_COUNT = 183;
const TOKEN_ACTIVITY_CELL_COUNT = 189;
const IMAGE_STUDIO_PATH = nativeCustomPageRoute(NATIVE_CUSTOM_PAGE.imageStudio);

function settledValue(result, fallback) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function tokenActivityDays(items) {
  const values = new Map(items.map((item) => [String(item.date || item.day || item.created_at || "").slice(0, 10), Number(item.total_tokens || item.tokens || 0)]));
  return Array.from({ length: TOKEN_ACTIVITY_DAY_COUNT }, (_, index) => {
    const date = dateInput(index - TOKEN_ACTIVITY_DAY_COUNT + 1);
    return { date, tokens: values.get(date) || 0 };
  });
}

function tokenActivityMonths(days, leading, formatDate) {
  const labels = new Map();
  days.forEach((day, index) => {
    const date = new Date(`${day.date}T00:00:00`);
    if (index === 0 || date.getDate() === 1) labels.set(Math.floor((leading + index) / 7), formatDate(day.date, { monthOnly: true }));
  });
  return Array.from({ length: TOKEN_ACTIVITY_CELL_COUNT / 7 }, (_, index) => labels.get(index) || "");
}

function TokenActivity({ items, loading, error, formatDate, onRetry, t }) {
  const days = tokenActivityDays(items);
  const maximum = Math.max(...days.map((day) => day.tokens), 0);
  const leading = new Date(`${days[0].date}T00:00:00`).getDay();
  const months = tokenActivityMonths(days, leading, formatDate);
  return <div className={`console-token-activity ${loading ? "console-skeleton" : ""}`}><div className="console-token-activity-grid" role="grid" aria-label={t("dashboard.activity")}>{Array.from({ length: TOKEN_ACTIVITY_CELL_COUNT }, (_, index) => {
    const day = days[index - leading];
    if (!day) return <i className="console-token-activity-placeholder" aria-hidden="true" key={`placeholder-${index}`} />;
    const level = day.tokens > 0 && maximum > 0 ? Math.max(1, Math.ceil(day.tokens / maximum * 4)) : 0;
    const label = t("dashboard.activityDay", { date: formatDate(day.date, { dateOnly: true }), tokens: formatTokenMillions(day.tokens) });
    const tooltipEdge = index < 14 ? "is-tooltip-start" : index >= TOKEN_ACTIVITY_CELL_COUNT - 14 ? "is-tooltip-end" : "";
    return <span className={`console-token-activity-cell is-level-${level} ${tooltipEdge}`} role="gridcell" aria-label={label} data-tooltip={label} key={day.date} />;
  })}</div><div className="console-token-activity-months" aria-hidden="true">{months.map((month, index) => <span key={`month-${index}`}>{month}</span>)}</div>{error && <div className="console-token-activity-error" role="alert"><small>{error}</small><button type="button" onClick={onRetry}>{t("common.retry")}</button></div>}</div>;
}

function ThroughputStatCard({ stats, formatNumber, t }) {
  return <div className="console-stat console-stat--green console-stat--throughput"><div><span>RPM</span><strong>{formatNumber(stats.rpm, { maximumFractionDigits: 0 })}</strong><small>{t("dashboard.latency")}: {formatDuration(stats.average_duration_ms)}</small></div><i><Icon name="pulse" size={20} /></i><div className="console-throughput-tpm"><span>TPM</span><strong>{formatTokenMillionsFixed(stats.tpm)}</strong></div></div>;
}

function DashboardPanelSkeleton({ className = "", rows = 4 }) {
  return <section className={`console-panel console-dashboard-panel-skeleton console-skeleton ${className}`.trim()} aria-hidden="true"><div className="console-panel-head"><i /></div><div className="console-dashboard-panel-skeleton-body">{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div></section>;
}

function DashboardSkeleton({ title, loadingLabel }) {
  const actions = <div className="console-dashboard-actions console-dashboard-actions-skeleton console-skeleton" aria-hidden="true"><span /><i /><b /></div>;
  return <Page title={title} actions={actions} className="console-dashboard-loading"><span className="console-visually-hidden" role="status">{loadingLabel}</span><div className="console-stat-grid console-stat-grid--4 console-dashboard-stat-grid"><StatCardSkeleton tone="green" /><StatCardSkeleton tone="amber" /><StatCardSkeleton /><StatCardSkeleton /></div><div className="console-grid console-dashboard-insights"><DashboardPanelSkeleton rows={5} /><DashboardPanelSkeleton rows={7} /><DashboardPanelSkeleton className="console-dashboard-model-distribution" rows={6} /></div><DashboardPanelSkeleton className="console-trend" rows={3} /></Page>;
}

export function DashboardPage() {
  const { t, locale, formatNumber, formatCurrency, formatDate } = useLocale();
  const { user, refreshUser, settings } = useConsole();
  const simpleMode = user?.run_mode === "simple";
  const [range, setRange] = useState({ start_date: dateInput(-6), end_date: dateInput() });
  const [data, setData] = useState({ stats: null, models: [], trend: [] });
  const [activity, setActivity] = useState({ loading: true, error: "", items: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [sectionErrors, setSectionErrors] = useState({ models: "", trend: "" });
  const mountedRef = useRef(true);
  const activityMountedRef = useRef(true);
  const loadedRef = useRef(false);
  const loadRequestRef = useRef(0);
  const activityRequestRef = useRef(0);

  const load = useCallback(async ({ showRefreshing = loadedRef.current } = {}) => {
    const request = ++loadRequestRef.current;
    const initial = !loadedRef.current;
    if (initial) setLoading(true);
    else if (showRefreshing) setRefreshing(true);
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
        if (showRefreshing) setRefreshing(false);
      }
    }
  }, [range, refreshUser, t]);

  const loadActivity = useCallback(async (signal, background = false) => {
    const request = ++activityRequestRef.current;
    setActivity((current) => ({ ...current, loading: background ? current.loading : true, error: "" }));
    try {
      const response = await usageApi.dashboardTrend({ start_date: dateInput(-TOKEN_ACTIVITY_DAY_COUNT + 1), end_date: dateInput(), granularity: "day" }, signal);
      if (activityMountedRef.current && request === activityRequestRef.current) setActivity({ loading: false, error: "", items: response.trend || [] });
    } catch (activityError) {
      if (activityMountedRef.current && request === activityRequestRef.current) setActivity((current) => ({ ...current, loading: false, error: activityError.message || t("common.loadFailed") }));
    }
  }, [t]);

  const refresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await Promise.allSettled([
      load({ showRefreshing: false }),
      loadActivity(undefined, true),
    ]);
    if (mountedRef.current) setRefreshing(false);
  }, [load, loadActivity, refreshing]);

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
  const actions = <div className="console-dashboard-actions"><span>{locale === "zh" ? "时间范围：" : "Time range:"}</span><DateRangePicker startDate={range.start_date} endDate={range.end_date} onChange={setRange} /><button type="button" className={`console-refresh-action ${refreshing ? "is-loading" : ""}`} onClick={() => refresh()} disabled={refreshing} aria-busy={refreshing}><Icon name="refresh" size={17} />{t("common.refresh")}</button></div>;
  return <Page title={t("dashboard.title")} actions={actions}>
    {error && <div className="console-dashboard-inline-error" role="alert"><Icon name="warning" size={17} /><span>{error}</span><Button onClick={() => load()}>{t("common.retry")}</Button></div>}
    <div className="console-stat-grid console-stat-grid--4 console-dashboard-stat-grid">
      <ThroughputStatCard stats={stats} formatNumber={formatNumber} t={t} />
      <StatCard label={t("dashboard.requests")} value={formatCompact(stats.today_requests, locale)} meta={`${t("dashboard.total")}: ${formatCompact(stats.total_requests, locale)}`} icon="pulse" tone="amber" />
      <StatCard label={t("dashboard.tokens")} value={formatTokenMillions(stats.today_tokens)} meta={`${t("dashboard.total")}: ${formatTokenMillions(stats.total_tokens)}`} icon="chart" />
      <StatCard className="console-stat--spend" label={t("dashboard.cost")} value={formatNumber(stats.today_actual_cost, { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", minimumFractionDigits: 4, maximumFractionDigits: 4 })} meta={`${locale === "zh" ? "今日标准费用" : "Today standard"}: ${formatCurrency(stats.today_cost ?? stats.today_actual_cost)}`} icon="dollar" />
    </div>
    <div className="console-grid console-dashboard-insights">
      <Panel className="console-dashboard-quick-panel" title={t("dashboard.quick")}><div className="console-quick-actions"><Link to="/keys"><Icon name="key" size={19} /><span><strong>{t("dashboard.createKey")}</strong><small>{t("keys.subtitle")}</small></span><Icon name="chevronRight" size={15} /></Link>{!simpleMode && <Link to="/usage"><Icon name="chart" size={19} /><span><strong>{t("dashboard.inspectUsage")}</strong><small>{t("usage.subtitle")}</small></span><Icon name="chevronRight" size={15} /></Link>}{!simpleMode && settings?.payment_enabled !== false && <Link to="/purchase"><Icon name="cart" size={19} /><span><strong>{t("dashboard.addCredit")}</strong><small>{t("purchase.subtitle")}</small></span><Icon name="chevronRight" size={15} /></Link>}{!simpleMode && <Link to={IMAGE_STUDIO_PATH}><Icon name="image" size={19} /><span><strong>{t("dashboard.generateImage")}</strong><small>{t("dashboard.generateImageHint")}</small></span><Icon name="chevronRight" size={15} /></Link>}{!simpleMode && <Link to="/redeem"><Icon name="gift" size={19} /><span><strong>{t("redeem.title")}</strong><small>{t("redeem.subtitle")}</small></span><Icon name="chevronRight" size={15} /></Link>}</div></Panel>
      <Panel className="console-token-activity-panel" title={t("dashboard.activity")} actions={<span className="console-token-activity-period">{t("dashboard.last6Months")}</span>}><TokenActivity items={activity.items} loading={activity.loading} error={activity.error} formatDate={formatDate} onRetry={() => loadActivity()} t={t} /></Panel>
      {sectionErrors.models ? <Panel className="console-dashboard-model-distribution console-dashboard-section-error" title={t("dashboard.models")}><ErrorState message={sectionErrors.models} onRetry={() => load()} /></Panel> : <DistributionChart className="console-dashboard-model-distribution" title={t("dashboard.models")} data={data.models} nameKey="model" limit={6} showMetricTabs={false} actualOnly itemLabel={t("usage.model")} tokenLabel="Token" />}
    </div>
    {sectionErrors.trend ? <Panel className="console-trend console-dashboard-section-error" title={locale === "zh" ? "Token 用量趋势" : "Token usage trend"}><ErrorState message={sectionErrors.trend} onRetry={() => load()} /></Panel> : <UsageTrendChart data={data.trend} loading={loading} />}
  </Page>;
}
