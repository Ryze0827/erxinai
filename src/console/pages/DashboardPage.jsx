import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@appica/ui-react/badge";
import { ScrollArea } from "@appica/ui-react/scroll-area";
import { Skeleton } from "@appica/ui-react/skeleton";
import { Tooltip } from "@appica/ui-react/tooltip";
import { TooltipContent } from "@appica/ui-react/tooltip";
import { TooltipProvider } from "@appica/ui-react/tooltip";
import { TooltipTrigger } from "@appica/ui-react/tooltip";
import { Link } from "react-router";
import { usageApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { NATIVE_CUSTOM_PAGE, nativeCustomPageRoute } from "../nativeCustomPages";
import { Button, ErrorState, InlineButton, Modal, Page, Panel, ProgressBar, TruncatedText, buttonLinkClass } from "../UI";
import { CompactTabs } from "../components/ConsoleControls";
import { DistributionChart, UsageTrendChart } from "../components/UsageCharts";
import { NotificationsCard } from "./ProfilePage";
import { dateInput, formatDuration, formatTokenMillions } from "../utils";

const TOKEN_ACTIVITY_DAY_COUNT = 365;
const TOKEN_ACTIVITY_MONTH_COUNT = 12;
const MODEL_PREFERENCE_HOURS = 24;
const MODEL_PREFERENCE_TARGET = 0.5;
const MODEL_PREFERENCE_TICKS = [0, 4, 8, 12, 16, 20, 24];
const IMAGE_STUDIO_PATH = nativeCustomPageRoute(NATIVE_CUSTOM_PAGE.imageStudio);
const LOAD_FAILED_ERROR = "common.loadFailed";

function greetingKey(hour) {
  if (hour < 6) return "dashboard.greeting.lateNight";
  if (hour < 12) return "dashboard.greeting.morning";
  if (hour < 14) return "dashboard.greeting.noon";
  if (hour < 18) return "dashboard.greeting.afternoon";
  return "dashboard.greeting.evening";
}

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
  const months = [...groups.values()].slice(-TOKEN_ACTIVITY_MONTH_COUNT);
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

function topRequestedModels(items) {
  return [...(items || [])]
    .filter((item) => item.model)
    .sort((left, right) => Number(right.requests || 0) - Number(left.requests || 0) || Number(right.total_tokens || 0) - Number(left.total_tokens || 0))
    .slice(0, 5);
}

function modelTokenTotal(item) {
  if (item.total_tokens != null) return Number(item.total_tokens) || 0;
  return ["input_tokens", "output_tokens", "cache_creation_tokens", "cache_read_tokens"].reduce((sum, key) => sum + (Number(item[key]) || 0), 0);
}

function preferenceHours(items) {
  const hours = Array(MODEL_PREFERENCE_HOURS).fill(0);
  (items || []).forEach((item) => {
    const match = String(item.date || "").match(/\s(\d{2}):/);
    if (!match) return;
    const hour = Number(match[1]);
    if (hour >= 0 && hour < MODEL_PREFERENCE_HOURS) hours[hour] += Number(item.requests || item.total_requests || 0);
  });
  return hours;
}

function shortestPreferenceWindow(hours) {
  const total = hours.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return null;
  const target = total * MODEL_PREFERENCE_TARGET;
  let best = null;
  for (let start = 0; start < MODEL_PREFERENCE_HOURS; start += 1) {
    let requests = 0;
    for (let length = 1; length <= MODEL_PREFERENCE_HOURS; length += 1) {
      requests += hours[(start + length - 1) % MODEL_PREFERENCE_HOURS];
      if (requests < target) continue;
      if (!best || length < best.length || (length === best.length && requests > best.requests)) best = { start, length, requests, total };
      break;
    }
  }
  return best;
}

function preferenceSegments(window) {
  if (!window) return [];
  if (window.length >= MODEL_PREFERENCE_HOURS) return [{ left: 0, width: 100 }];
  const end = window.start + window.length;
  if (end <= MODEL_PREFERENCE_HOURS) return [{ left: window.start / MODEL_PREFERENCE_HOURS * 100, width: window.length / MODEL_PREFERENCE_HOURS * 100 }];
  return [
    { left: window.start / MODEL_PREFERENCE_HOURS * 100, width: (MODEL_PREFERENCE_HOURS - window.start) / MODEL_PREFERENCE_HOURS * 100 },
    { left: 0, width: (end - MODEL_PREFERENCE_HOURS) / MODEL_PREFERENCE_HOURS * 100 },
  ];
}

function preferenceWindowLabel(window, t) {
  if (!window) return t("dashboard.modelPreference.noRequests");
  if (window.length >= MODEL_PREFERENCE_HOURS) return t("dashboard.modelPreference.allDay");
  const end = window.start + window.length;
  const startLabel = `${String(window.start).padStart(2, "0")}:00`;
  const endLabel = `${String(end === MODEL_PREFERENCE_HOURS ? end : end % MODEL_PREFERENCE_HOURS).padStart(2, "0")}:00`;
  return `${startLabel}–${end > MODEL_PREFERENCE_HOURS ? t("dashboard.modelPreference.nextDay") : ""}${endLabel}`;
}

function ModelPreferencePanel({ items, loading, error, formatNumber, onRetry, t }) {
  return <Panel className="console-model-preference-panel" title={t("dashboard.modelPreference.title")} actions={<Badge variant="soft" size="sm">{t("dashboard.modelPreference.range")}</Badge>}>
    <div className="console-model-preference">
      <p>{t("dashboard.modelPreference.description")}</p>
      {loading ? <div className="console-model-preference-skeleton" role="status" aria-label={t("common.loading")}>{Array.from({ length: 5 }, (_, index) => <div key={index}><Skeleton /><Skeleton /><Skeleton /></div>)}</div> : error ? <ErrorState message={localizedLoadError(error, t)} onRetry={onRetry} /> : items.length === 0 ? <div className="console-model-preference-empty">{t("dashboard.modelPreference.empty")}</div> : <ScrollArea orientation="horizontal" scrollShadow className="console-model-preference-scroller" viewportProps={{ "aria-label": t("dashboard.modelPreference.scrollAria") }}><TooltipProvider><div className="console-model-preference-chart">
          <div className="console-model-preference-axis" aria-hidden="true"><span /><div>{MODEL_PREFERENCE_TICKS.map((hour) => <span key={hour}>{String(hour).padStart(2, "0")}:00</span>)}</div><span /></div>
          {items.map((item) => {
            const windowLabel = item.unavailable ? t("dashboard.modelPreference.unavailable") : preferenceWindowLabel(item.window, t);
            const requestLabel = t("dashboard.modelPreference.requests", { count: formatNumber(item.requests) });
            const ariaLabel = item.unavailable ? t("dashboard.modelPreference.unavailableAria", { model: item.model }) : t("dashboard.modelPreference.aria", { model: item.model, window: windowLabel, count: formatNumber(item.requests) });
            return <div className="console-model-preference-row" key={item.model}>
              <div className="console-model-preference-model"><TruncatedText value={item.model} render={<strong />} /><small>{item.unavailable ? t("dashboard.modelPreference.unavailable") : requestLabel}</small></div>
              <Tooltip trackCursorAxis="x">
                <TooltipTrigger render={<div />} className="console-model-preference-plot" role="img" tabIndex={0} aria-label={ariaLabel}>
                  <span className="console-model-preference-grid" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</span>
                  {!item.unavailable && preferenceSegments(item.window).map((segment, index) => <span className="console-model-preference-bar" style={{ "--console-preference-left": `${segment.left}%`, "--console-preference-width": `${segment.width}%` }} aria-hidden="true" key={index} />)}
                </TooltipTrigger>
                <TooltipContent arrow={false}>{item.unavailable ? windowLabel : <>{windowLabel} · {requestLabel}</>}</TooltipContent>
              </Tooltip>
              <strong className="console-model-preference-window">{windowLabel}</strong>
            </div>;
          })}
        </div></TooltipProvider></ScrollArea>}
    </div>
  </Panel>;
}

function dashboardDelta(current, previous) {
  if (previous == null || !Number.isFinite(Number(previous)) || Number(previous) === 0) return null;
  const percent = (Number(current || 0) - Number(previous)) / Math.abs(Number(previous)) * 100;
  return { percent };
}

// Usage growth reads green and a drop red; for spend the sense flips, so a rise
// is a warning and a drop is good news. Changes under 0.05% stay neutral.
function MetricDelta({ current, previous, previousLabel, formatPrevious, warnOnIncrease = false, comparable = true }) {
  const delta = comparable ? dashboardDelta(current, previous) : null;
  const direction = !delta ? null : delta.percent >= 0.05 ? "up" : delta.percent <= -0.05 ? "down" : "flat";
  const tones = warnOnIncrease ? { up: "warning", down: "success" } : { up: "success", down: "danger" };
  return <div className="console-kpi-delta">{delta && <span data-direction={direction} data-tone={tones[direction]}>{direction !== "flat" && <Icon name={direction === "up" ? "arrowUp" : "arrowDown"} size={12} />}{delta.percent > 0 ? "+" : ""}{delta.percent.toFixed(1)}%</span>}<small>{previousLabel}{previous == null ? "—" : formatPrevious(previous)}</small></div>;
}

function MetricHint({ label, children }) {
  return <TooltipProvider><Tooltip><TooltipTrigger render={<button type="button" className="console-kpi-hint" aria-label={label} />}><Icon name="info" size={13} /></TooltipTrigger><TooltipContent arrow={false} className="console-kpi-hint-content">{children}</TooltipContent></Tooltip></TooltipProvider>;
}

// Tone keys the card's accent: purple for token volume, blue for requests, amber for money.
function KpiCard({ icon, tone, label, hint, value, prefix, unit, children }) {
  return <div className="console-kpi" data-tone={tone}>
    <span className="console-kpi-label"><i className="console-kpi-icon"><Icon name={icon} size={15} /></i>{label}{hint && <MetricHint label={label}>{hint}</MetricHint>}</span>
    <strong className="console-kpi-value console-ledger-number">{prefix && <small className="is-prefix">{prefix}</small>}{value}{unit && <small>{unit}</small>}</strong>
    {children}
  </div>;
}

function KpiMeter({ label, value, percent, tone }) {
  return <div className="console-kpi-meter"><p className="console-kpi-detail">{label}<b>{value}</b></p><ProgressBar value={percent} tone={tone} /></div>;
}

// Secondary board: themed tiles, each a small group of related figures.
function VitalTile({ icon, tone, title, hint, aside, children }) {
  return <section className="console-vital-tile" data-tone={tone}>
    <header><i className="console-vital-icon"><Icon name={icon} size={16} /></i><h3>{title}</h3>{hint && <MetricHint label={title}>{hint}</MetricHint>}{aside}</header>
    <dl>{children}</dl>
  </section>;
}

function TileMetric({ label, value, prefix, unit, tone }) {
  return <div className="console-vital-metric"><dt>{label}</dt><dd className="console-ledger-number" data-tone={tone}>{prefix && <small className="is-prefix">{prefix}</small>}{value}{unit && <small>{unit}</small>}</dd></div>;
}

function rpmTone(ratio) {
  if (ratio >= 0.9) return "danger";
  if (ratio >= 0.7) return "warning";
  return "success";
}

function runwayTone(days) {
  if (days == null) return undefined;
  if (days < 1) return "slow";
  if (days < 3) return "moderate";
  return undefined;
}

const PLATFORM_LABELS = { anthropic: "Claude", claude: "Claude", openai: "OpenAI", codex: "OpenAI", gemini: "Gemini", google: "Gemini", antigravity: "Antigravity", grok: "Grok", xai: "Grok" };

function platformTone(platform) {
  const label = platformLabel(platform);
  return { Claude: "anthropic", OpenAI: "openai", Gemini: "gemini", Antigravity: "antigravity", Grok: "grok" }[label] || "other";
}

function platformLabel(platform) {
  const key = String(platform || "").trim().toLowerCase();
  return PLATFORM_LABELS[key] || (key ? key[0].toUpperCase() + key.slice(1) : "—");
}

// Today's spend share per platform, top three plus the remainder.
function PlatformSplit({ items, locale }) {
  const values = (items || []).map((item) => ({ platform: platformTone(item.platform), label: platformLabel(item.platform), value: Number(item.today_actual_cost) || 0 })).filter((item) => item.value > 0).sort((left, right) => right.value - left.value);
  const total = values.reduce((sum, item) => sum + item.value, 0);
  if (!total) return null;
  const segments = values.slice(0, 3);
  const rest = values.slice(3).reduce((sum, item) => sum + item.value, 0);
  if (rest > 0) segments.push({ platform: "other", label: locale === "zh" ? "其他" : "Other", value: rest });
  const shares = segments.map((item) => ({ ...item, share: item.value / total }));
  const summary = shares.map((item) => `${item.label} ${Math.round(item.share * 100)}%`).join(" · ");
  return <div className="console-kpi-meter console-kpi-split" title={summary}>
    <p className="console-kpi-detail">{locale === "zh" ? "平台分布" : "By platform"}</p>
    <div className="console-kpi-split-bar" role="img" aria-label={summary}>{shares.map((item) => <i key={item.label} data-platform={item.platform} style={{ flexGrow: item.share }} />)}</div>
    <ul>{shares.map((item) => <li key={item.label} data-platform={item.platform}>{item.label}<b>{Math.round(item.share * 100)}%</b></li>)}</ul>
  </div>;
}

// Sum yesterday's hourly buckets up to the current time of day, so the comparison
// covers the same elapsed span as today's partial totals.
function sameTimeYesterday(buckets, field) {
  if (!buckets) return null;
  const now = new Date();
  const yesterday = dateInput(-1);
  const hour = now.getHours();
  const fraction = (now.getMinutes() * 60 + now.getSeconds()) / 3600;
  return buckets.reduce((sum, item) => {
    const [date, time = ""] = String(item.date || "").split(" ");
    if (date !== yesterday) return sum;
    const bucketHour = Number.parseInt(time, 10);
    if (bucketHour < hour) return sum + Number(item[field] || 0);
    if (bucketHour === hour) return sum + Number(item[field] || 0) * fraction;
    return sum;
  }, 0);
}

// Average daily spend over the last seven complete days (today is still partial).
function recentActualCost(items, startOffset, count) {
  const byDate = new Map((items || []).map((item) => [String(item.date || "").slice(0, 10), item]));
  return Array.from({ length: count }, (_, index) => byDate.get(dateInput(startOffset + index))).reduce((sum, item) => sum + Number(item?.actual_cost || 0), 0);
}

const STATS_REFRESH_MS = 60_000;

function DashboardPanelSkeleton({ className = "", rows = 4 }) {
  return <Panel className={`console-dashboard-panel-skeleton ${className}`.trim()} aria-hidden="true"><div className="console-dashboard-panel-skeleton-head"><Skeleton /></div><div className="console-dashboard-panel-skeleton-body">{Array.from({ length: rows }, (_, index) => <Skeleton key={index} />)}</div></Panel>;
}

function TokenUsageViewToggle({ value, onChange, t }) {
  return <CompactTabs label={t("dashboard.tokenUsageView.label")} value={value} onChange={onChange} items={[{ value: "heatmap", label: t("dashboard.tokenUsageView.heatmap") }, { value: "bar", label: t("dashboard.tokenUsageView.bar") }]} />;
}

function DashboardSkeleton({ title, loadingLabel }) {
  return <Page title={title} className="console-dashboard-page console-dashboard-loading"><span className="console-visually-hidden" role="status">{loadingLabel}</span><div className="console-dashboard-hero" aria-hidden="true"><div className="console-dashboard-greeting"><Skeleton className="console-dashboard-skeleton-title" /><Skeleton className="console-dashboard-skeleton-copy" /></div><div className="console-dashboard-quick-actions">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} />)}</div></div><section className="console-kpis console-panel" aria-hidden="true"><div className="console-kpi-grid">{Array.from({ length: 3 }, (_, index) => <div className="console-kpi" key={index}><Skeleton className="console-kpi-skeleton-label" /><Skeleton className="console-kpi-skeleton-value" /><Skeleton className="console-kpi-skeleton-meta" /></div>)}</div></section><div className="console-vital-board" aria-hidden="true">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="console-vital-skeleton" />)}</div><div className="console-dashboard-chart-grid"><DashboardPanelSkeleton rows={5} /><DashboardPanelSkeleton rows={5} /></div><div className="console-dashboard-insight-grid console-dashboard-insight-grid--single"><DashboardPanelSkeleton className="console-model-preference-panel" rows={5} /></div></Page>;
}

export function DashboardPage() {
  const { t, locale, formatNumber, formatCurrency, formatDate } = useLocale();
  const { user, refreshUser, settings } = useConsole();
  const simpleMode = user?.run_mode === "simple";
  const [range] = useState({ start_date: dateInput(-29), end_date: dateInput() });
  const [modelDistributionRange] = useState({ start_date: dateInput(-6), end_date: dateInput() });
  const [modelPreferenceRange] = useState({ start_date: dateInput(-2), end_date: dateInput() });
  const [data, setData] = useState({ stats: null, models: [], trend: [] });
  const [activity, setActivity] = useState({ loading: true, error: "", items: [] });
  const [tokenView, setTokenView] = useState("bar");
  const [tokenModelBreakdown, setTokenModelBreakdown] = useState({ loading: true, items: [] });
  const [balanceNotificationOpen, setBalanceNotificationOpen] = useState(false);
  const [modelPreferences, setModelPreferences] = useState({ loading: true, error: "", items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectionErrors, setSectionErrors] = useState({ models: "", trend: "", stats: "" });
  const [comparison, setComparison] = useState(null);
  const [todayUsage, setTodayUsage] = useState(null);
  const mountedRef = useRef(true);
  const activityMountedRef = useRef(true);
  const loadedRef = useRef(false);
  const loadRequestRef = useRef(0);
  const activityRequestRef = useRef(0);

  const loadModelPreferences = useCallback(async (request = loadRequestRef.current) => {
    if (mountedRef.current && request === loadRequestRef.current) setModelPreferences({ loading: true, error: "", items: [] });
    try {
      const response = await usageApi.dashboardModels(modelPreferenceRange);
      if (!mountedRef.current || request !== loadRequestRef.current) return;
      const topModels = topRequestedModels(response?.models);
      if (topModels.length === 0) {
        setModelPreferences({ loading: false, error: "", items: [] });
        return;
      }
      const results = await Promise.allSettled(topModels.map((model) => usageApi.dashboardTrend({ ...modelPreferenceRange, granularity: "hour", model: model.model })));
      if (!mountedRef.current || request !== loadRequestRef.current) return;
      const items = topModels.map((model, index) => {
        const result = results[index];
        if (result.status === "rejected") return { model: model.model, requests: Number(model.requests || 0), window: null, unavailable: true };
        const hours = preferenceHours(result.value?.trend);
        return { model: model.model, requests: hours.reduce((sum, value) => sum + value, 0), window: shortestPreferenceWindow(hours), unavailable: false };
      });
      setModelPreferences({ loading: false, error: items.every((item) => item.unavailable) ? LOAD_FAILED_ERROR : "", items });
    } catch (preferenceError) {
      if (mountedRef.current && request === loadRequestRef.current) setModelPreferences({ loading: false, error: preferenceError.message || LOAD_FAILED_ERROR, items: [] });
    }
  }, [modelPreferenceRange]);

  // Model totals come from the 30-day snapshot already loaded for the trend chart.
  const loadTokenModelBreakdown = useCallback(async (request, rangeModels) => {
    if (mountedRef.current && request === loadRequestRef.current) setTokenModelBreakdown({ loading: true, items: [] });
    try {
      const models = [...(rangeModels || [])]
        .filter((item) => item.model)
        .sort((left, right) => modelTokenTotal(right) - modelTokenTotal(left))
        .slice(0, 5);
      const results = await Promise.allSettled(models.map((item) => usageApi.dashboardTrend({ ...range, granularity: "day", model: item.model })));
      if (!mountedRef.current || request !== loadRequestRef.current) return;
      const items = models.flatMap((item, index) => results[index].status === "fulfilled" ? [{ model: item.model, trend: results[index].value?.trend || [] }] : []);
      setTokenModelBreakdown({
        loading: false,
        items,
      });
    } catch {
      if (mountedRef.current && request === loadRequestRef.current) setTokenModelBreakdown({ loading: false, items: [] });
    }
  }, [range]);

  const load = useCallback(async () => {
    const request = ++loadRequestRef.current;
    const initial = !loadedRef.current;
    if (initial) setLoading(true);
    setError("");
    if (mountedRef.current) setTokenModelBreakdown({ loading: true, items: [] });
    try {
      const today = dateInput();
      const yesterday = dateInput(-1);
      const results = await Promise.allSettled([
        refreshUser(), usageApi.dashboardStats(), usageApi.dashboardModels(modelDistributionRange),
        usageApi.dashboardSnapshot({ ...range, granularity: "day", include_trend: true, include_model_stats: true }),
        usageApi.dashboardTrend({ start_date: yesterday, end_date: yesterday, granularity: "hour" }),
        usageApi.stats({ start_date: today, end_date: today }),
      ]);
      const stats = settledValue(results[1], null);
      const snapshot = settledValue(results[3], null);
      // Only a page with neither headline stats nor the trend is unusable.
      if (!stats && !snapshot) throw results[1].reason || new Error(LOAD_FAILED_ERROR);
      if (!mountedRef.current || request !== loadRequestRef.current) return;
      loadedRef.current = true;
      setData((current) => ({
        stats: stats || current.stats,
        models: results[2].status === "fulfilled" ? results[2].value?.models || [] : current.models,
        trend: snapshot ? snapshot.trend || [] : current.trend,
      }));
      setSectionErrors({
        models: results[2].status === "rejected" ? results[2].reason?.message || LOAD_FAILED_ERROR : "",
        trend: snapshot ? "" : results[3].reason?.message || LOAD_FAILED_ERROR,
        stats: stats ? "" : results[1].reason?.message || LOAD_FAILED_ERROR,
      });
      setComparison(results[4].status === "fulfilled" ? results[4].value?.trend || [] : null);
      setTodayUsage(settledValue(results[5], null));
      loadTokenModelBreakdown(request, snapshot?.models);
      loadModelPreferences(request);
    } catch (loadError) {
      if (mountedRef.current && request === loadRequestRef.current) setError(loadError.message || LOAD_FAILED_ERROR);
    } finally {
      if (mountedRef.current && request === loadRequestRef.current) {
        if (initial) setLoading(false);
      }
    }
  }, [loadModelPreferences, loadTokenModelBreakdown, modelDistributionRange, range, refreshUser]);

  // Headline stats include "live" RPM/TPM; keep them current while the tab is visible.
  const refreshStats = useCallback(async () => {
    const today = dateInput();
    const [statsResult, usageResult] = await Promise.allSettled([usageApi.dashboardStats(), usageApi.stats({ start_date: today, end_date: today })]);
    if (!mountedRef.current) return;
    if (statsResult.status === "fulfilled") {
      setData((current) => ({ ...current, stats: statsResult.value }));
      setSectionErrors((current) => ({ ...current, stats: "" }));
    }
    if (usageResult.status === "fulfilled") setTodayUsage(usageResult.value);
  }, []);

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
  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible" && loadedRef.current) refreshStats(); };
    const timer = window.setInterval(tick, STATS_REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [refreshStats]);
  if (loading) return <DashboardSkeleton title={t("nav.dashboard")} loadingLabel={t("common.loading")} />;
  if (error && !data.stats) return <Page title={t("nav.dashboard")}><Panel><ErrorState message={localizedLoadError(error, t)} onRetry={() => load()} /></Panel></Page>;

  const stats = data.stats || {};
  const displayName = user?.username || user?.email?.split("@")[0] || (locale === "zh" ? "用户" : "there");
  const hour = new Date().getHours();
  const greeting = t(greetingKey(hour));
  const zh = locale === "zh";
  const number = (value) => Number(value) || 0;
  const formatSpend = (value) => formatNumber(number(value), { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const formatMoney = (value) => formatNumber(number(value), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const todayActual = number(stats.today_actual_cost);
  const averageDailyCost = recentActualCost(data.trend, -7, 7) / 7;
  const balance = user?.balance == null ? null : Number(user.balance);
  const runwayDays = Number.isFinite(balance) && averageDailyCost > 0 ? Math.max(0, balance) / averageDailyCost : null;
  const runwayValue = runwayDays == null ? "—" : runwayDays > 999 ? "999+" : formatNumber(runwayDays, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  // Hourly buckets give a same-time comparison; without them show yesterday's full
  // day for reference only, since a partial day against a full one is not comparable.
  const comparable = Array.isArray(comparison);
  const yesterdayDaily = data.trend.find((item) => String(item.date || "").slice(0, 10) === dateInput(-1));
  const previousOf = (field) => comparable ? sameTimeYesterday(comparison, field) : yesterdayDaily ? number(yesterdayDaily[field]) : null;
  const sameTimeLabel = comparable ? (zh ? "昨日同时段 · " : "Yesterday, same time · ") : (zh ? "昨日全天 · " : "Yesterday, full day · ");
  const previousTokens = previousOf("total_tokens");
  const previousRequests = previousOf("requests");
  const previousSpend = previousOf("actual_cost");
  const activeKeys = number(stats.active_api_keys);
  const totalKeys = number(stats.total_api_keys);
  const cacheBase = number(stats.today_input_tokens) + number(stats.today_cache_read_tokens) + number(stats.today_cache_creation_tokens);
  const cacheRate = cacheBase > 0 ? number(stats.today_cache_read_tokens) / cacheBase : null;
  const todayRequests = number(stats.today_requests);
  const averageTokens = todayRequests > 0 ? number(stats.today_tokens) / todayRequests : null;
  const averageSpend = todayRequests > 0 ? todayActual / todayRequests : null;
  const [durationValue, durationUnit] = todayUsage?.average_duration_ms ? formatDuration(todayUsage.average_duration_ms).split(" ") : ["—"];
  const rpmLimit = number(user?.rpm_limit);
  const rpmRatio = rpmLimit > 0 ? number(stats.rpm) / rpmLimit : null;
  const totalTrendTokens = data.trend.reduce((sum, item) => sum + Number(item.total_tokens || item.input_tokens || 0) + (item.total_tokens ? 0 : Number(item.output_tokens || 0) + Number(item.cache_creation_tokens || 0) + Number(item.cache_read_tokens || 0)), 0);
  const totalModelTokens = data.models.reduce((sum, item) => sum + Number(item.total_tokens || 0), 0);
  const greetingDate = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date());
  const tokenUsageActions = <TokenUsageViewToggle value={tokenView} onChange={setTokenView} t={t} />;
  const tokenUsageRangeLabel = tokenView === "heatmap" ? t("dashboard.lastYear") : locale === "zh" ? "近 30 天" : "Last 30 days";
  return <Page className="console-dashboard-page">
    {error && <div className="console-dashboard-inline-error" role="alert"><Icon name="warning" size={17} /><span>{localizedLoadError(error, t)}</span><Button onClick={() => load()}>{t("common.retry")}</Button></div>}
    <div className="console-dashboard-hero"><div className="console-dashboard-greeting"><h1>{greeting}, {displayName}</h1><p>{greetingDate}</p></div><div className="console-dashboard-quick-actions"><Link className="is-key" to="/keys?create=1"><Icon name="key" size={21} /><span>{t("dashboard.createKey")}</span></Link>{!simpleMode && <Link className="is-usage" to="/usage"><Icon name="chart" size={21} /><span>{t("dashboard.inspectUsage")}</span></Link>}{!simpleMode && settings?.payment_enabled !== false && <Link className="is-credit" to="/purchase"><Icon name="plus" size={21} /><span>{t("dashboard.addCredit")}</span></Link>}{!simpleMode && <Link className="is-image" to={IMAGE_STUDIO_PATH}><Icon name="image" size={21} /><span>{t("dashboard.generateImage")}</span></Link>}{!simpleMode && <Link className="is-redeem" to="/redeem"><Icon name="gift" size={21} /><span>{t("redeem.title")}</span></Link>}</div></div>
    <section className="console-kpis console-panel" aria-label={zh ? "今日概况" : "Today at a glance"}>
      {sectionErrors.stats && !data.stats ? <ErrorState message={localizedLoadError(sectionErrors.stats, t)} onRetry={() => load()} /> : <>
        <div className="console-kpi-grid">
          <KpiCard icon="coins" tone="secondary" label={zh ? "今日 Token" : "Today's tokens"} hint={zh ? "含输入、输出、缓存创建与缓存读取 Token。对比为昨日同一时刻之前的累计。" : "Input, output, cache creation and cache read tokens. Compared with yesterday up to the same time of day."} value={formatTokenMillions(stats.today_tokens).slice(0, -1)} unit="M">
            <MetricDelta current={stats.today_tokens} previous={previousTokens} previousLabel={sameTimeLabel} formatPrevious={formatTokenMillions} comparable={comparable} />
            <KpiMeter label={zh ? "缓存命中率" : "Cache hit rate"} value={cacheRate == null ? "—" : `${formatNumber(cacheRate * 100, { maximumFractionDigits: 1 })}%`} percent={(cacheRate || 0) * 100} tone="secondary" />
          </KpiCard>
          <KpiCard icon="send" tone="info" label={zh ? "今日请求" : "Today's requests"} value={formatNumber(todayRequests)}>
            <MetricDelta current={todayRequests} previous={previousRequests} previousLabel={sameTimeLabel} formatPrevious={(value) => formatNumber(Math.round(value))} comparable={comparable} />
            <KpiMeter label={zh ? "活跃密钥" : "Active keys"} value={`${formatNumber(activeKeys)} / ${formatNumber(totalKeys)}`} percent={totalKeys > 0 ? activeKeys / totalKeys * 100 : 0} tone="info" />
          </KpiCard>
          <KpiCard icon="wallet" tone="warning" label={zh ? "今日实际花费" : "Today's spend"} hint={zh ? "按分组倍率实际扣除的金额。" : "Amount actually charged after group rates."} value={formatSpend(todayActual)} prefix="$">
            <MetricDelta current={todayActual} previous={previousSpend} previousLabel={sameTimeLabel} formatPrevious={(value) => `$${formatSpend(value)}`} warnOnIncrease comparable={comparable} />
            <PlatformSplit items={stats.by_platform} locale={locale} />
          </KpiCard>
        </div>
      </>}
    </section>
    {data.stats && <div className="console-vital-board">
      <VitalTile icon="pulse" tone="success" title={zh ? "实时吞吐" : "Live throughput"} hint={zh ? "最近 5 分钟的平均值，按整数向下取整，低频使用时可能显示为 0。TPM 仅含输入与输出，不含缓存 Token。" : "Averages over the last 5 minutes, rounded down; light usage may show 0. TPM counts input and output only, not cache tokens."} aside={<span className="console-vital-live">{zh ? "近 5 分钟" : "Last 5 min"}</span>}>
        <TileMetric label="RPM" value={formatNumber(number(stats.rpm))} unit={rpmLimit > 0 ? `/ ${formatNumber(rpmLimit)}` : undefined} />
        <TileMetric label="TPM" value={formatNumber(number(stats.tpm))} unit="tok" />
        {rpmRatio != null && <div className="console-vital-meter"><ProgressBar value={rpmRatio * 100} tone={rpmTone(rpmRatio)} /><small>{zh ? "已用 RPM 上限" : "Of RPM limit"} {formatNumber(Math.min(rpmRatio, 9.99) * 100, { maximumFractionDigits: 0 })}%</small></div>}
      </VitalTile>
      <VitalTile icon="hourglass" tone="info" title={zh ? "今日单次请求" : "Per request today"} hint={zh ? "今日请求的平均值：耗时为从接收到完成的时长。" : "Today's per-request averages; duration is from receipt to completion."}>
        <TileMetric label={zh ? "平均耗时" : "Duration"} value={durationValue} unit={durationUnit} />
        <TileMetric label={zh ? "平均 Token" : "Tokens"} value={averageTokens == null ? "—" : formatNumber(Math.round(averageTokens))} unit={averageTokens == null ? undefined : "tok"} />
        <TileMetric label={zh ? "平均花费" : "Spend"} value={averageSpend == null ? "—" : formatSpend(averageSpend)} prefix={averageSpend == null ? undefined : "$"} />
      </VitalTile>
      <VitalTile icon="usageChart" tone="secondary" title={zh ? "累计用量" : "Lifetime"}>
        <TileMetric label={zh ? "花费" : "Spend"} value={formatMoney(stats.total_actual_cost)} prefix="$" />
        <TileMetric label={zh ? "请求" : "Requests"} value={formatNumber(number(stats.total_requests))} />
        <TileMetric label="Token" value={formatTokenMillions(stats.total_tokens).slice(0, -1)} unit="M" />
      </VitalTile>
      <VitalTile icon="clock" tone="warning" title={t("dashboard.balanceRunway")} hint={zh ? "按最近 7 个完整自然日的日均实际花费估算当前余额可用天数。" : "Days the current balance lasts at the average daily spend of the last 7 complete days."} aside={<button className={buttonLinkClass({ variant: "ghost", size: "sm", className: "console-dashboard-notification-link" })} type="button" onClick={async () => { await refreshUser(); setBalanceNotificationOpen(true); }}><Icon name="bell" size={14} /><span>{zh ? "余额提醒" : "Alerts"}</span></button>}>
        <TileMetric label={zh ? "可用天数" : "Runway"} value={runwayValue} unit={runwayDays == null ? undefined : t("dashboard.balanceRunwayDays").trim()} tone={runwayTone(runwayDays)} />
        <TileMetric label={zh ? "近 7 日日均" : "7-day average"} value={averageDailyCost > 0 ? formatMoney(averageDailyCost) : "—"} prefix={averageDailyCost > 0 ? "$" : undefined} />
      </VitalTile>
    </div>}
    <div className="console-dashboard-chart-grid">
      {tokenView === "heatmap" ? <UsageTrendChart data={data.trend} loading={loading} variant="total" total={totalTrendTokens} actions={tokenUsageActions} rangeLabel={tokenUsageRangeLabel}><TokenActivity items={activity.items} loading={activity.loading} error={localizedLoadError(activity.error, t)} formatDate={formatDate} formatNumber={formatNumber} formatCurrency={formatCurrency} locale={locale} onRetry={() => loadActivity()} t={t} /></UsageTrendChart> : sectionErrors.trend ? <Panel className="console-trend console-dashboard-section-error" title={locale === "zh" ? "Token 用量" : "Token usage"} actions={tokenUsageActions}><ErrorState message={localizedLoadError(sectionErrors.trend, t)} onRetry={() => load()} /></Panel> : <UsageTrendChart data={data.trend} loading={loading} variant="total" total={totalTrendTokens} actions={tokenUsageActions} rangeLabel={tokenUsageRangeLabel} modelData={tokenModelBreakdown.items} modelBreakdownLoading={tokenModelBreakdown.loading} />}
      {sectionErrors.models ? <Panel className="console-dashboard-model-distribution console-dashboard-section-error" title={t("dashboard.models")}><ErrorState message={localizedLoadError(sectionErrors.models, t)} onRetry={() => load()} /></Panel> : <DistributionChart className="console-dashboard-model-distribution" title={t("dashboard.models")} rangeLabel={locale === "zh" ? "近 7 天" : "Last 7 days"} data={data.models} nameKey="model" limit={4} showMetricTabs={false} actualOnly itemLabel={t("usage.model")} tokenLabel="Token" centerValue={formatTokenMillions(totalModelTokens)} centerLabel={locale === "zh" ? "近 7 天 Token" : "Tokens · 7 days"} />}
    </div>
    <div className="console-dashboard-insight-grid console-dashboard-insight-grid--single"><ModelPreferencePanel items={modelPreferences.items} loading={modelPreferences.loading} error={modelPreferences.error} formatNumber={formatNumber} onRetry={() => loadModelPreferences()} t={t} /></div>
    <Modal open={balanceNotificationOpen} title={t("profile.notifications")} onClose={() => setBalanceNotificationOpen(false)} size="large"><NotificationsCard /></Modal>
  </Page>;
}
