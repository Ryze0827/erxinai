import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@appica/ui-react/badge";
import { DropdownMenu } from "@appica/ui-react/dropdown-menu";
import { DropdownMenuContent } from "@appica/ui-react/dropdown-menu";
import { DropdownMenuRadioGroup } from "@appica/ui-react/dropdown-menu";
import { DropdownMenuRadioItem } from "@appica/ui-react/dropdown-menu";
import { DropdownMenuTrigger } from "@appica/ui-react/dropdown-menu";
import { Meter } from "@appica/ui-react/meter";
import { MeterProgress } from "@appica/ui-react/meter";
import { Skeleton } from "@appica/ui-react/skeleton";
import { Link } from "react-router";
import { usageApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { PlatformMark } from "../GroupBadge";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { NATIVE_CUSTOM_PAGE, nativeCustomPageRoute } from "../nativeCustomPages";
import { Button, ErrorState, InlineButton, Page, Panel } from "../UI";
import { DistributionChart, UsageTrendChart } from "../components/UsageCharts";
import { dateInput, formatDuration, formatTokenMillions, formatTokenMillionsFixed } from "../utils";

const TOKEN_ACTIVITY_DAY_COUNT = 154;
const IMAGE_STUDIO_PATH = nativeCustomPageRoute(NATIVE_CUSTOM_PAGE.imageStudio);
const LOAD_FAILED_ERROR = "common.loadFailed";

function settledValue(result, fallback) {
  return result.status === "fulfilled" ? result.value : fallback;
}

function localizedLoadError(error, t) {
  return error === LOAD_FAILED_ERROR ? t(LOAD_FAILED_ERROR) : error;
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

function tokenActivityMonths(days, formatDate, leading = 0, columns = 1) {
  const groups = new Map();
  days.forEach((day, index) => {
    const month = day.date.slice(0, 7);
    const current = groups.get(month) || { month, tokens: 0, index };
    current.tokens += day.tokens;
    groups.set(month, current);
  });
  const months = [...groups.values()].slice(-6);
  return months.map((item, index) => {
    const start = Math.floor((leading + item.index) / 7) + 1;
    const next = months[index + 1];
    const nextStart = next ? Math.floor((leading + next.index) / 7) + 1 : columns + 1;
    return {
      ...item,
      label: formatDate(`${item.month}-01`, { monthOnly: true }),
      start,
      end: Math.max(start + 1, nextStart),
    };
  });
}

function TokenActivityTitle({ label }) {
  return <span className="console-token-activity-title"><span>{label}</span><small>(UTC)</small><Icon name="info" size={14} aria-hidden="true" /></span>;
}

function TokenActivityRange({ label }) {
  return <DropdownMenu size="sm"><DropdownMenuTrigger render={<Button />} className="console-token-activity-range"><span>{label}</span><Icon name="chevronDown" size={13} data-icon="end" /></DropdownMenuTrigger><DropdownMenuContent align="end" className="console-token-activity-range-menu"><DropdownMenuRadioGroup value="six-months"><DropdownMenuRadioItem value="six-months">{label}</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>;
}

function TokenActivity({ items, loading, error, formatDate, formatNumber, formatCurrency, locale, onRetry, t }) {
  if (loading) return <Skeleton className="console-token-activity-loading" aria-hidden={false} role="status" aria-label={t("common.loading")} />;
  const days = tokenActivityDays(items);
  const maximum = Math.max(...days.map((day) => day.tokens), 0);
  const leading = (new Date(`${days[0].date}T00:00:00`).getDay() + 6) % 7;
  const cellCount = Math.ceil((leading + days.length) / 7) * 7;
  const columns = cellCount / 7;
  const months = tokenActivityMonths(days, formatDate, leading, columns);
  const weekdays = locale === "zh" ? ["一", "二", "三", "四", "五", "六", "日"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return <div className="console-token-activity"><div className="console-token-activity-calendar"><div className="console-token-activity-month-labels" aria-hidden="true" style={{ "--console-activity-columns": columns }}>{months.map((month) => <span style={{ gridColumn: `${month.start} / ${month.end}` }} key={month.month}>{month.label}</span>)}</div><div className="console-token-activity-weekdays" aria-hidden="true">{weekdays.map((day) => <span key={day}>{day}</span>)}</div><div className="console-token-activity-grid" role="grid" aria-label={t("dashboard.activity")} style={{ "--console-activity-columns": columns }}>{Array.from({ length: cellCount }, (_, index) => {
    const day = days[index - leading];
    if (!day) return <i className="console-token-activity-placeholder" aria-hidden="true" key={`placeholder-${index}`} />;
    const level = day.tokens > 0 && maximum > 0 ? Math.max(1, Math.ceil(Math.sqrt(day.tokens / maximum) * 7)) : 0;
    const label = `${formatDate(day.date, { dateOnly: true })} · ${formatTokenMillions(day.tokens)} Token · ${formatNumber(day.requests)} ${locale === "zh" ? "请求" : "requests"} · ${formatCurrency(day.actualCost)}`;
    const tooltipEdge = index < 14 ? "is-tooltip-start" : index >= cellCount - 14 ? "is-tooltip-end" : "";
    const tooltipTokens = day.tokens >= 1_000_000 ? formatTokenMillions(day.tokens) : formatNumber(day.tokens);
    return <span className={`console-token-activity-cell is-level-${level} ${tooltipEdge}`} role="gridcell" tabIndex="0" aria-label={label} key={day.date}><span className="console-token-activity-tooltip" aria-hidden="true"><strong>{formatDate(day.date, { dateOnly: true })}</strong><span><i />{tooltipTokens} {locale === "zh" ? "Token" : "tokens"}</span></span></span>;
  })}</div></div><div className="console-token-activity-legend" aria-hidden="true"><span>{locale === "zh" ? "少" : "Less"}</span>{Array.from({ length: 8 }, (_, index) => <i className={`is-level-${index}`} key={index} />)}<span>{locale === "zh" ? "多" : "More"}</span></div>{error && <div className="console-token-activity-error" role="alert"><small>{error}</small><InlineButton onClick={onRetry}>{t("common.retry")}</InlineButton></div>}</div>;
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

function DashboardMetric({ icon, label, value, unit, tone = "", children }) {
  return <div className={`console-dashboard-metric ${tone ? `is-${tone}` : ""}`}><i className="console-dashboard-metric-icon"><Icon name={icon} size={21} /></i><span>{label}<Icon name="info" size={13} /></span><strong>{value}{unit && <small>{unit}</small>}</strong>{children}</div>;
}

function cacheReusePercent(inputTokens, cacheCreationTokens, cacheReadTokens) {
  const input = Number(inputTokens) || 0;
  const cacheCreation = Number(cacheCreationTokens) || 0;
  const cacheRead = Number(cacheReadTokens) || 0;
  const eligible = input + cacheCreation + cacheRead;
  return eligible > 0 ? cacheRead / eligible * 100 : null;
}

function trendWindow(items, startOffset, count) {
  const byDate = new Map((items || []).map((item) => [String(item.date || "").slice(0, 10), item]));
  return Array.from({ length: count }, (_, index) => byDate.get(dateInput(startOffset + index))).reduce((totals, item) => ({
    inputTokens: totals.inputTokens + Number(item?.input_tokens || 0),
    cacheCreationTokens: totals.cacheCreationTokens + Number(item?.cache_creation_tokens || 0),
    cacheReadTokens: totals.cacheReadTokens + Number(item?.cache_read_tokens || 0),
    totalTokens: totals.totalTokens + Number(item?.total_tokens || 0),
    actualCost: totals.actualCost + Number(item?.actual_cost || 0),
  }), { inputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, totalTokens: 0, actualCost: 0 });
}

function platformMeta(value, locale) {
  const platform = String(value || "").trim().toLowerCase();
  if (platform.includes("openai")) return { key: "openai", label: "OpenAI" };
  if (platform.includes("anthropic") || platform.includes("claude")) return { key: "claude", label: "Claude" };
  if (platform.includes("gemini") || platform.includes("google")) return { key: "gemini", label: "Gemini" };
  if (platform.includes("antigravity")) return { key: "antigravity", label: "Antigravity" };
  return { key: "other", label: locale === "zh" ? "其他" : "Other" };
}

function platformDistribution(items, locale) {
  const useRealtime = (items || []).some((item) => Number(item.today_tokens || 0) > 0 || Number(item.today_actual_cost || 0) > 0 || Number(item.today_requests || 0) > 0);
  const grouped = new Map();
  (items || []).forEach((item) => {
    const meta = platformMeta(item.platform, locale);
    const current = grouped.get(meta.key) || { ...meta, tokens: 0, cost: 0, requests: 0 };
    current.tokens += Number(item[useRealtime ? "today_tokens" : "total_tokens"] || 0);
    current.cost += Number(item[useRealtime ? "today_actual_cost" : "total_actual_cost"] || 0);
    current.requests += Number(item[useRealtime ? "today_requests" : "total_requests"] || 0);
    grouped.set(meta.key, current);
  });
  const sorted = [...grouped.values()].filter((item) => item.tokens > 0 || item.cost > 0 || item.requests > 0).sort((left, right) => right.tokens - left.tokens || right.cost - left.cost);
  const rows = sorted.filter((item) => item.key !== "other").slice(0, 3);
  const visibleKeys = new Set(rows.map((item) => item.key));
  const remainder = sorted.filter((item) => !visibleKeys.has(item.key));
  if (remainder.length > 0) rows.push(remainder.reduce((other, item) => ({ ...other, tokens: other.tokens + item.tokens, cost: other.cost + item.cost, requests: other.requests + item.requests }), { key: "other-aggregate", tone: "other", label: locale === "zh" ? "其他" : "Other", tokens: 0, cost: 0, requests: 0 }));
  const totalTokens = rows.reduce((sum, item) => sum + item.tokens, 0);
  return { rows: rows.map((item) => ({ ...item, percent: totalTokens > 0 ? item.tokens / totalTokens * 100 : 0 })), useRealtime };
}

function SegmentedMeter({ value, label }) {
  const normalized = Math.max(0, Math.min(100, Number(value) || 0));
  const segmentCount = 9;
  const scaledProgress = normalized / 100 * segmentCount;
  const activeSegments = Math.ceil(scaledProgress);
  return <Meter value={normalized} min={0} max={100} className="console-relay-cache-meter" aria-label={label}><span className="console-relay-cache-segments" aria-hidden="true">{Array.from({ length: segmentCount }, (_, index) => {
    const segmentProgress = Math.max(0, Math.min(1, scaledProgress - index));
    const active = segmentProgress > 0;
    const progress = activeSegments > 1 ? index / (activeSegments - 1) : 1;
    const style = active ? { "--console-relay-segment-progress": `${Math.round(segmentProgress * 1_000) / 10}%`, "--console-relay-segment-color": `${Math.round(66 + Math.pow(progress, 2.4) * 22)}%` } : undefined;
    return <i className={active ? "is-active" : ""} style={style} key={index}><span className={segmentProgress === 1 ? "is-full" : ""} /></i>;
  })}</span></Meter>;
}

function RelayEfficiencyPanel({ stats, trend, balance, formatNumber, locale }) {
  const recent = trendWindow(trend, -6, 7);
  const cacheReadTokens = recent.cacheReadTokens;
  const cacheRate = cacheReusePercent(recent.inputTokens, recent.cacheCreationTokens, cacheReadTokens);
  const baseline = trendWindow(trend, -13, 7);
  const baselineRate = cacheReusePercent(baseline.inputTokens, baseline.cacheCreationTokens, baseline.cacheReadTokens);
  const cacheDelta = cacheRate != null && baselineRate > 0 ? (cacheRate - baselineRate) / baselineRate * 100 : null;
  const costPerMillion = recent.totalTokens > 0 ? recent.actualCost / recent.totalTokens * 1_000_000 : null;
  const averageDailyCost = recent.actualCost / 7;
  const numericBalance = balance == null ? null : Number(balance);
  const runwayDays = Number.isFinite(numericBalance) && averageDailyCost > 0 ? Math.max(0, numericBalance) / averageDailyCost : null;
  const platformData = platformDistribution(stats.by_platform, locale);
  const platforms = platformData.rows;
  const cacheRateLabel = cacheRate == null ? "—" : `${formatNumber(cacheRate, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  const costPerMillionLabel = costPerMillion == null ? "—" : formatNumber(costPerMillion, { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", minimumFractionDigits: 3, maximumFractionDigits: 3 });
  const cacheTokenLabel = cacheReadTokens >= 1_000_000 ? formatTokenMillions(cacheReadTokens) : formatNumber(cacheReadTokens);
  const trendMessage = cacheDelta == null ? (locale === "zh" ? "指标已按近 7 天实时用量更新。" : "Metrics reflect live usage over the last 7 days.") : cacheDelta > 3 ? (locale === "zh" ? "缓存复用效率高于前 7 天基线。" : "Cache reuse is above the previous 7-day baseline.") : cacheDelta < -3 ? (locale === "zh" ? "缓存复用效率低于前 7 天基线，建议关注路由配置。" : "Cache reuse is below the previous 7-day baseline; review routing settings.") : (locale === "zh" ? "缓存复用效率与前 7 天基线基本持平。" : "Cache reuse is in line with the previous 7-day baseline.");
  return <Panel className="console-relay-efficiency-panel">
    <div className="console-relay-efficiency-body">
      <div className="console-relay-efficiency-summary">
        <div className="console-relay-section-head"><span className="console-relay-efficiency-title"><span>{locale === "zh" ? "中转效率" : "Relay efficiency"}</span><Icon name="info" size={14} aria-hidden="true" /></span></div>
        <div className="console-relay-efficiency-metrics">
          <div className="console-relay-efficiency-metric is-cache"><span>{locale === "zh" ? "缓存复用率" : "Cache reuse"}</span><div><strong>{cacheRateLabel}</strong>{cacheDelta != null && <small className={cacheDelta >= 0 ? "is-positive" : "is-negative"}><Icon name={cacheDelta >= 0 ? "arrowUp" : "arrowDown"} size={12} />{cacheDelta >= 0 ? "+" : ""}{formatNumber(cacheDelta, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</small>}</div><SegmentedMeter value={cacheRate || 0} label={`${locale === "zh" ? "近 7 天缓存复用率" : "Cache reuse over the last 7 days"}: ${cacheRateLabel}`} /><div className="console-relay-meter-scale" aria-hidden="true"><small>0%</small><small>100%</small></div></div>
          <div className="console-relay-efficiency-metric"><span>{locale === "zh" ? "实付 / 1M Token" : "Paid / 1M tokens"}</span><div><strong>{costPerMillionLabel}</strong></div><small>{locale === "zh" ? "按近 7 天实际费用" : "Actual spend · last 7 days"}</small></div>
          <div className="console-relay-efficiency-metric"><span>{locale === "zh" ? "余额续航" : "Balance runway"}</span><div><strong>{runwayDays == null ? "—" : formatNumber(Math.min(runwayDays, 999), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong>{runwayDays != null && <em>{runwayDays > 999 ? "+" : ""}{locale === "zh" ? "天" : " days"}</em>}</div><small>{locale === "zh" ? "按近 7 日均值" : "Based on the last 7 days"}</small></div>
        </div>
      </div>
      <div className="console-relay-platforms">
        <div className="console-relay-platform-titlebar"><strong>{locale === "zh" ? "平台路由分布" : "Platform route distribution"}</strong><Badge variant="soft" size="sm" className="console-relay-live-badge">{platformData.useRealtime ? (locale === "zh" ? "今日 · 实时" : "Today · Live") : (locale === "zh" ? "路由 · 累计" : "Routes · All time")}</Badge></div>
        <div className="console-relay-platform-table"><div className="console-relay-platform-head"><span>{locale === "zh" ? "平台" : "Platform"}</span><span>{locale === "zh" ? "Token 占比" : "Token share"}</span><span>{locale === "zh" ? "实际支出" : "Actual spend"}</span><span>{locale === "zh" ? "路由占比" : "Route share"}</span></div>
          <div className="console-relay-platform-list">{platforms.length > 0 ? platforms.map((platform, index) => <div className={`console-relay-platform-row is-${platform.tone || platform.key}`} key={platform.key}><span><span className="console-relay-platform-mark"><PlatformMark platform={platform.key} /></span><b>{platform.label}</b>{index === 0 && <Badge variant="soft" size="xs">{locale === "zh" ? "主路由" : "Primary"}</Badge>}</span><strong>{formatNumber(platform.percent, { maximumFractionDigits: 0 })}%</strong><strong>{formatNumber(platform.cost, { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", minimumFractionDigits: 4, maximumFractionDigits: 4 })}</strong><Meter value={platform.percent} min={0} max={100} className="console-relay-platform-meter" statusClassNames={{ default: "bg-secondary-emphasis" }} aria-label={`${platform.label}: ${formatNumber(platform.percent, { maximumFractionDigits: 0 })}%`}><MeterProgress /></Meter></div>) : <div className="console-relay-platform-empty">{locale === "zh" ? "今日暂无平台路由数据" : "No platform routing data today"}</div>}</div>
        </div>
      </div>
    </div>
    <div className="console-relay-efficiency-insight"><Icon name="info" size={14} aria-hidden="true" /><span>{recent.totalTokens > 0 ? (locale === "zh" ? <>近 7 天累计复用约 <strong>{cacheTokenLabel}</strong> 缓存 Token，{trendMessage}</> : <>About <strong>{cacheTokenLabel}</strong> cached tokens were reused over the last 7 days. {trendMessage}</>) : (locale === "zh" ? "近 7 天暂无可分析的中转数据。" : "There is no relay usage to analyze over the last 7 days.")}</span></div>
  </Panel>;
}

function DashboardPanelSkeleton({ className = "", rows = 4 }) {
  return <Panel className={`console-dashboard-panel-skeleton ${className}`.trim()} aria-hidden="true"><div className="console-dashboard-panel-skeleton-head"><Skeleton /></div><div className="console-dashboard-panel-skeleton-body">{Array.from({ length: rows }, (_, index) => <Skeleton key={index} />)}</div></Panel>;
}

function DashboardSkeleton({ title, loadingLabel }) {
  return <Page title={title} className="console-dashboard-page console-dashboard-loading"><span className="console-visually-hidden" role="status">{loadingLabel}</span><div className="console-dashboard-hero" aria-hidden="true"><div className="console-dashboard-greeting"><Skeleton className="console-dashboard-skeleton-title" /><Skeleton className="console-dashboard-skeleton-copy" /></div><div className="console-dashboard-quick-actions">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} />)}</div></div><section className="console-dashboard-metrics console-panel" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} />)}</section><div className="console-dashboard-chart-grid"><DashboardPanelSkeleton rows={5} /><DashboardPanelSkeleton rows={5} /></div><div className="console-dashboard-insight-grid"><DashboardPanelSkeleton className="console-token-activity-panel" rows={3} /><DashboardPanelSkeleton className="console-relay-efficiency-panel" rows={4} /></div></Page>;
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
      if (!stats) throw results[1].reason || new Error(LOAD_FAILED_ERROR);
      if (!mountedRef.current || request !== loadRequestRef.current) return;
      loadedRef.current = true;
      setData((current) => ({
        stats,
        models: results[2].status === "fulfilled" ? results[2].value?.models || [] : current.models,
        trend: results[3].status === "fulfilled" ? results[3].value?.trend || [] : current.trend,
      }));
      setSectionErrors({
        models: results[2].status === "rejected" ? results[2].reason?.message || LOAD_FAILED_ERROR : "",
        trend: results[3].status === "rejected" ? results[3].reason?.message || LOAD_FAILED_ERROR : "",
      });
    } catch (loadError) {
      if (mountedRef.current && request === loadRequestRef.current) setError(loadError.message || LOAD_FAILED_ERROR);
    } finally {
      if (mountedRef.current && request === loadRequestRef.current) {
        if (initial) setLoading(false);
      }
    }
  }, [range, refreshUser]);

  const loadActivity = useCallback(async (signal) => {
    const request = ++activityRequestRef.current;
    setActivity((current) => ({ ...current, loading: true, error: "" }));
    try {
      const response = await usageApi.dashboardTrend({ start_date: dateInput(-TOKEN_ACTIVITY_DAY_COUNT + 1), end_date: dateInput(), granularity: "day" }, signal);
      if (activityMountedRef.current && request === activityRequestRef.current) setActivity({ loading: false, error: "", items: response.trend || [] });
    } catch (activityError) {
      if (activityMountedRef.current && request === activityRequestRef.current) setActivity((current) => ({ ...current, loading: false, error: activityError.message || LOAD_FAILED_ERROR }));
    }
  }, []);

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
  if (error && !data.stats) return <Page title={t("nav.dashboard")}><Panel><ErrorState message={localizedLoadError(error, t)} onRetry={() => load()} /></Panel></Page>;

  const stats = data.stats || {};
  const displayName = user?.username || user?.email?.split("@")[0] || (locale === "zh" ? "用户" : "there");
  const hour = new Date().getHours();
  const greeting = locale === "zh" ? (hour < 12 ? "早上好" : hour < 18 ? "下午好" : "晚上好") : (hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening");
  const todayStandard = Number(stats.today_cost ?? stats.today_standard_cost ?? stats.today_actual_cost) || 0;
  const todayActual = Number(stats.today_actual_cost) || 0;
  const savedPercent = todayStandard > 0 ? Math.max(0, (todayStandard - todayActual) / todayStandard * 100) : null;
  const totalTrendTokens = data.trend.reduce((sum, item) => sum + Number(item.total_tokens || item.input_tokens || 0) + (item.total_tokens ? 0 : Number(item.output_tokens || 0) + Number(item.cache_creation_tokens || 0) + Number(item.cache_read_tokens || 0)), 0);
  const greetingDate = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date());
  return <Page className="console-dashboard-page">
    {error && <div className="console-dashboard-inline-error" role="alert"><Icon name="warning" size={17} /><span>{localizedLoadError(error, t)}</span><Button onClick={() => load()}>{t("common.retry")}</Button></div>}
    <div className="console-dashboard-hero"><div className="console-dashboard-greeting"><h1>{greeting}, {displayName}</h1><p>{greetingDate}</p></div>{savedPercent != null && <div className="console-dashboard-saving"><i><Icon name="chart" size={22} /></i><span>{locale === "zh" ? <>今日支出较标准费用低 <strong>{savedPercent.toFixed(1)}%</strong>。</> : <>Today's spend is <strong>{savedPercent.toFixed(1)}%</strong> below standard cost.</>}</span></div>}<div className="console-dashboard-quick-actions"><Link className="is-key" to="/keys?create=1"><Icon name="key" size={21} /><span>{t("dashboard.createKey")}</span></Link>{!simpleMode && <Link className="is-usage" to="/usage"><Icon name="chart" size={21} /><span>{t("dashboard.inspectUsage")}</span></Link>}{!simpleMode && settings?.payment_enabled !== false && <Link className="is-credit" to="/purchase"><Icon name="plus" size={21} /><span>{t("dashboard.addCredit")}</span></Link>}{!simpleMode && <Link className="is-image" to={IMAGE_STUDIO_PATH}><Icon name="image" size={21} /><span>{t("dashboard.generateImage")}</span></Link>}{!simpleMode && <Link className="is-redeem" to="/redeem"><Icon name="gift" size={21} /><span>{t("redeem.title")}</span></Link>}</div></div>
    <section className="console-dashboard-metrics console-panel">
      <DashboardMetric icon="coins" label={locale === "zh" ? "今日 Token" : "Today's tokens"} value={formatTokenMillions(stats.today_tokens)} tone="token"><MetricDelta current={stats.today_tokens} previous={stats.yesterday_tokens} previousLabel={locale === "zh" ? "昨日同期 · " : "vs same time yesterday · "} formatPrevious={formatTokenMillions} /></DashboardMetric>
      <DashboardMetric icon="gauge" label={locale === "zh" ? "实时吞吐" : "Real-time throughput"} value={formatNumber(stats.rpm, { maximumFractionDigits: 0 })} unit="RPM" tone="throughput" />
      <DashboardMetric icon="hourglass" label={t("dashboard.latency")} value={formatDuration(stats.average_duration_ms)} tone="latency" />
      <DashboardMetric icon="pulse" label="TPM" value={formatTokenMillionsFixed(stats.tpm)} tone="tpm" />
      <DashboardMetric icon="send" label={locale === "zh" ? "今日请求" : "Today's requests"} value={formatNumber(stats.today_requests)} tone="requests"><MetricDelta current={stats.today_requests} previous={stats.yesterday_requests} previousLabel={locale === "zh" ? "昨日同期 · " : "vs same time yesterday · "} formatPrevious={(value) => formatNumber(value)} /></DashboardMetric>
      <DashboardMetric icon="wallet" label={locale === "zh" ? "今日实际费用" : "Today's actual spend"} value={formatNumber(todayActual, { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", minimumFractionDigits: 4, maximumFractionDigits: 4 })} tone="actual"><MetricDelta current={todayActual} previous={stats.yesterday_actual_cost} reverse previousLabel={locale === "zh" ? "昨日同期 · " : "vs same time yesterday · "} formatPrevious={formatCurrency} /></DashboardMetric>
      <DashboardMetric icon="orderReceipt" label={locale === "zh" ? "标准费用" : "Standard cost"} value={formatCurrency(todayStandard)} tone="standard"><div className="console-dashboard-saved">{savedPercent == null ? <small>{locale === "zh" ? "已节省 · —" : "Saved · —"}</small> : <><span>{locale === "zh" ? "已节省" : "Saved"}</span><strong>{savedPercent.toFixed(1)}%</strong></>}</div></DashboardMetric>
    </section>
    <div className="console-dashboard-chart-grid">{sectionErrors.trend ? <Panel className="console-trend console-dashboard-section-error" title={locale === "zh" ? "Token 用量" : "Token usage"}><ErrorState message={localizedLoadError(sectionErrors.trend, t)} onRetry={() => load()} /></Panel> : <UsageTrendChart data={data.trend} loading={loading} variant="total" total={totalTrendTokens} rangeLabel={locale === "zh" ? "近 30 天" : "Last 30 days"} />}{sectionErrors.models ? <Panel className="console-dashboard-model-distribution console-dashboard-section-error" title={t("dashboard.models")}><ErrorState message={localizedLoadError(sectionErrors.models, t)} onRetry={() => load()} /></Panel> : <DistributionChart className="console-dashboard-model-distribution" title={t("dashboard.models")} rangeLabel={locale === "zh" ? "近 30 天" : "Last 30 days"} data={data.models} nameKey="model" limit={4} showMetricTabs={false} actualOnly itemLabel={t("usage.model")} tokenLabel="Token" centerValue={formatTokenMillions(totalTrendTokens)} centerLabel={locale === "zh" ? "近 30 天 Token" : "Tokens · 30 days"} />}</div>
    <div className="console-dashboard-insight-grid"><Panel className="console-token-activity-panel" title={<TokenActivityTitle label={t("dashboard.activity")} />} actions={<TokenActivityRange label={t("dashboard.last6Months")} />}><TokenActivity items={activity.items} loading={activity.loading} error={localizedLoadError(activity.error, t)} formatDate={formatDate} formatNumber={formatNumber} formatCurrency={formatCurrency} locale={locale} onRetry={() => loadActivity()} t={t} /></Panel><RelayEfficiencyPanel stats={stats} trend={data.trend} balance={user?.balance} formatNumber={formatNumber} locale={locale} /></div>
  </Page>;
}
