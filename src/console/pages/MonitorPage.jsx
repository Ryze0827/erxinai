import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Badge } from "@appica/ui-react/badge";
import { Table } from "@appica/ui-react/table";
import { TableBody } from "@appica/ui-react/table";
import { TableCell } from "@appica/ui-react/table";
import { TableHead } from "@appica/ui-react/table";
import { TableHeader } from "@appica/ui-react/table";
import { TableRow } from "@appica/ui-react/table";
import { Progress } from "@appica/ui-react/progress";
import { ProgressValue } from "@appica/ui-react/progress";
import { Tooltip } from "@appica/ui-react/tooltip";
import { TooltipContent } from "@appica/ui-react/tooltip";
import { TooltipProvider } from "@appica/ui-react/tooltip";
import { TooltipTrigger } from "@appica/ui-react/tooltip";
import { groupsApi, monitorApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { useLocale, translate, formatDateTimeFor } from "../i18n";
import { formatCompact } from "../utils";
import { Button, EmptyState, ErrorState, Page, Panel, SelectInput, Skeleton, StatusBadge, TextInput } from "../UI";
import { CompactTabs } from "../components/ConsoleControls";
import { MONITOR_RANGES, buildMonitorRankingRows, buildMonitorRows, metricNumber, metricRate, monitorTone, scoredSuccessRate, sortMonitorRows, tokensPerSecond, trendGeometry } from "./monitorData.js";

const REFRESH_KEY = "sentence_monitor_refresh";
const TTFT_TREND_WARNING_MS = 10000;
const TTFT_TREND_TRANSITION_MS = 1000;
const toneColor = { operational: "var(--console-monitor-healthy)", degraded: "var(--console-monitor-warning)", failed: "var(--console-monitor-critical)", unknown: "var(--foreground-subtle)" };
const listItems = (data) => Array.isArray(data) ? data : data?.items || [];
const visibleModels = (data) => listItems(data).filter((item) => item.model !== "__other__");

function storedRefresh() {
  try {
    const value = JSON.parse(localStorage.getItem(REFRESH_KEY));
    return { auto: value?.auto !== false, seconds: [30, 60, 120].includes(value?.seconds) ? value.seconds : 30 };
  } catch { return { auto: true, seconds: 30 }; }
}

function toneLabel(tone, locale) {
  return {
    operational: translate(locale, "monitor.healthy"),
    degraded: translate(locale, "monitor.warning"),
    failed: translate(locale, "monitor.incident"),
    unknown: translate(locale, "monitor.unknown"),
  }[tone];
}

function Status({ tone, locale }) {
  return <StatusBadge size="sm" status={tone === "operational" ? "active" : tone === "unknown" ? "inactive" : tone} label={toneLabel(tone, locale)} />;
}

function duration(value, formatNumber) {
  return value == null ? "—" : formatNumber(value, { maximumFractionDigits: 0 }) + " ms";
}

function estimatedDuration(value, formatNumber) {
  return value == null ? "—" : "≤ " + duration(value, formatNumber);
}

function ttftTrendColor(value) {
  const warning = Math.min(1, Math.max(0, (value - TTFT_TREND_WARNING_MS) / TTFT_TREND_TRANSITION_MS));
  return `color-mix(in srgb, var(--console-monitor-warning, var(--warning-emphasis)) ${warning * 100}%, var(--console-monitor-healthy, var(--success-emphasis)))`;
}

function ThroughputMetric({ tpm, locale, formatNumber }) {
  const value = tokensPerSecond(tpm);
  return <strong className="console-group-throughput" title={value == null ? undefined : formatNumber(value, { maximumFractionDigits: 2 }) + " Token/s"}>{value == null ? "—" : value < 1000 ? formatNumber(value, { maximumFractionDigits: 2 }) : formatCompact(value)}<small>{value == null ? "" : translate(locale, "monitor.tokenS")}</small></strong>;
}

function dateLabel(value, locale) {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return formatDateTimeFor(locale, new Date(value), { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function MetricRing({ value, label, accessibleLabel = label, tone = "operational", metric }) {
  const percentage = value == null ? "—" : String(Number(value.toFixed(1)));
  return <div className="console-group-ring-wrap console-monitor-tone" data-tone={value == null ? "unknown" : tone} data-metric={metric}>
    {value == null ? <div className="console-group-missing-ring" aria-label={accessibleLabel + ": —"}>—</div> : <Progress variant="circular" className="console-group-ring" size={56} thickness={6} value={value} indicatorColor="var(--console-monitor-accent)" aria-label={accessibleLabel}><ProgressValue>{() => <span className="console-group-ring-number">{percentage}<span className="console-group-ring-unit">%</span></span>}</ProgressValue></Progress>}
    <small>{label}</small>
  </div>;
}

function TtftMetric({ metrics, health, locale, formatNumber, showRating = true }) {
  const value = metricNumber(metrics?.avg_ms);
  const tone = monitorTone(health?.ttft);
  const score = tone === "unknown" ? null : metricNumber(health?.ttft_score);
  const label = {
    operational: translate(locale, "monitor.fast"),
    degraded: translate(locale, "monitor.moderate"),
    failed: translate(locale, "monitor.slow"),
    unknown: translate(locale, "monitor.unknown"),
  }[tone];
  const scoreLabel = translate(locale, "monitor.ttftScoreBackendPercentile");
  const ratingLabel = translate(locale, "monitor.ratingValue", { label });
  return <div className={"console-group-latency console-group-ttft console-monitor-tone" + (showRating ? "" : " is-unrated")} data-tone={tone}>
    <div className="console-group-latency-value"><strong>{duration(value, formatNumber)}</strong>{showRating && <span title={scoreLabel}><StatusBadge size="sm" status={tone === "operational" ? "active" : tone === "unknown" ? "inactive" : tone} label={ratingLabel} /></span>}</div>
    {showRating && (score == null ? <div className="console-group-latency-track" aria-label={scoreLabel + " · —"} /> : <Progress thickness={4} value={Math.min(100, score)} indicatorColor="var(--console-monitor-accent)" aria-label={scoreLabel} aria-valuetext={score.toFixed(1) + "/100 · " + label} />)}
    <div className="console-group-ttft-secondary" title={translate(locale, "monitor.percentilesEstimatedUsingHistogram")}><small>P50 · {estimatedDuration(metricNumber(metrics?.p50_ms), formatNumber)}</small><small>P90 · {estimatedDuration(metricNumber(metrics?.p90_ms), formatNumber)}</small><small className="console-group-ttft-estimate">{translate(locale, "monitor.bucketEstimates")}</small></div>
  </div>;
}

function Trend({ timeline, mode, coverage, locale, formatNumber }) {
  const fillId = useId();
  const strokeId = useId();
  const [activeTime, setActiveTime] = useState(null);
  const chartTimeline = mode === "v2" ? timeline.map(({ secondary, ...point }) => point) : timeline;
  const geometry = trendGeometry(chartTimeline, mode === "v2" ? coverage : undefined, undefined, mode === "v2" ? 20000 : undefined);
  const validPoints = geometry.points.filter((point) => point.latency != null || point.secondary != null);
  const lastVisiblePoint = validPoints.at(-1);
  const latestField = lastVisiblePoint?.latency != null ? "latency" : "secondary";
  const latestValue = lastVisiblePoint?.[latestField];
  const latestY = latestValue == null ? null : 49 - Math.min(geometry.max, Math.max(0, latestValue)) / geometry.max * 42;
  const latencyPoints = mode === "v2" ? geometry.points.filter((point) => point.latency != null && Number.isFinite(Number(point.latency))) : [];
  const highestPoint = latencyPoints.reduce((highest, point) => !highest || point.latency > highest.latency ? point : highest, null);
  const lowestPoint = latencyPoints.reduce((lowest, point) => !lowest || point.latency < lowest.latency ? point : lowest, null);
  const currentPoint = mode === "v2" && lastVisiblePoint?.latency != null ? lastVisiblePoint : null;
  const extremumAnnotations = highestPoint && lowestPoint && highestPoint.time === lowestPoint.time
    ? [{ kind: "both", labels: [translate(locale, "monitor.max"), translate(locale, "monitor.min")], point: highestPoint }]
    : [highestPoint && { kind: "max", labels: [translate(locale, "monitor.max")], point: highestPoint }, lowestPoint && { kind: "min", labels: [translate(locale, "monitor.min")], point: lowestPoint }].filter(Boolean);
  const annotatedExtrema = extremumAnnotations.map((annotation) => {
    const isCurrent = annotation.point.time === currentPoint?.time;
    return { ...annotation, isCurrent, label: [...annotation.labels, ...(isCurrent ? [translate(locale, "monitor.current")] : [])].join(" · ") };
  });
  const currentIsAnnotated = annotatedExtrema.some((annotation) => annotation.isCurrent);
  if (!geometry.points.length) return <div className="console-group-trend-empty">{translate(locale, "monitor.noLatencyData")}</div>;
  const primary = mode === "v2" ? translate(locale, "monitor.averageTtft") : translate(locale, "monitor.probeLatency");
  const secondary = mode === "v2" ? null : "Ping";
  const axisValues = mode === "v2"
    ? [...new Set([geometry.max, 20000, 10000, 2000, 0].filter((value) => value <= geometry.max))]
    : [geometry.max, geometry.max / 2, 0];
  const axisRatios = axisValues.map((value) => value / geometry.max);
  // Tie color to the fixed value axis, not each path's bounds. Flat lines and
  // separate segments must use the same threshold, even across missing data.
  const warningOffset = 1 - (TTFT_TREND_WARNING_MS + TTFT_TREND_TRANSITION_MS) / geometry.max;
  const healthyOffset = 1 - TTFT_TREND_WARNING_MS / geometry.max;
  return <TooltipProvider delay={0} closeDelay={0}><div className={`console-group-trend${mode === "v2" ? " is-ttft" : ""}`}>
    {mode !== "v2" && <div className="console-group-trend-legend"><span>{primary}</span>{secondary && <span>{secondary}</span>}</div>}
    <div className="console-group-trend-chart">
    <div className="console-group-trend-plot">
    <div className="console-group-trend-axis" aria-label={translate(locale, "monitor.latencyScaleMilliseconds")}>{axisValues.map((value) => <span key={value} style={{ top: (49 - value / geometry.max * 42) / 56 * 100 + "%" }}>{validPoints.length ? formatNumber(value, { maximumFractionDigits: 0 }) + " ms" : "—"}</span>)}</div>
    <svg viewBox="0 0 280 56" preserveAspectRatio="none" role="img" aria-label={primary + (secondary ? " / " + secondary : "") + " · " + dateLabel(geometry.startTime, locale) + " — " + dateLabel(geometry.endTime, locale)}>
      <defs>
        {mode === "v2" && <linearGradient id={strokeId} gradientUnits="userSpaceOnUse" x1="0" y1="7" x2="0" y2="49">
          <stop offset={warningOffset} stopColor="var(--console-monitor-warning)" />
          <stop offset={healthyOffset} stopColor="var(--console-monitor-healthy)" />
        </linearGradient>}
        {mode === "v2" ? <linearGradient id={fillId} gradientUnits="userSpaceOnUse" x1="0" y1="7" x2="0" y2="49">
          <stop offset={warningOffset} stopColor="var(--console-monitor-warning)" stopOpacity=".16" />
          <stop offset={healthyOffset} stopColor="var(--console-monitor-healthy)" stopOpacity=".12" />
          <stop offset="100%" stopColor="var(--console-monitor-healthy)" stopOpacity="0" />
        </linearGradient> : <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--console-monitor-healthy)" stopOpacity=".16" /><stop offset="100%" stopColor="var(--console-monitor-healthy)" stopOpacity="0" /></linearGradient>}
      </defs>
      <path className="console-group-trend-grid" d={axisRatios.map((ratio) => `M4,${(49 - ratio * 42).toFixed(2)} H276`).join(" ")} />
      {geometry.points.filter((point) => ["failed", "degraded"].includes(point.tone)).map((point, index) => <path key={index} d={`M${point.x},5 V51`} className="console-group-trend-incident" stroke={toneColor[point.tone]} />)}
      <path d={geometry.primaryArea} fill={`url(#${fillId})`} />
      {secondary && <path className="console-group-trend-secondary" d={geometry.secondary} />}
      <path className="console-group-trend-primary" d={geometry.primary} style={mode === "v2" ? { stroke: `url(#${strokeId})` } : undefined} />
      {geometry.points.map((point, index) => {
        if (point.latency == null && point.secondary == null) return null;
        const isLatest = point.time === lastVisiblePoint?.time;
        return <g key={point.time} className={"console-group-trend-point" + (activeTime === point.time ? " is-active" : "")}>
          {activeTime === point.time && <path className="console-group-trend-guide" d={`M${point.x},4 V52`} />}
          {["latency", ...(secondary ? ["secondary"] : [])].map((field) => {
            if (point[field] == null) return null;
            const boundary = geometry.points[index - 1]?.[field] == null || geometry.points[index + 1]?.[field] == null;
            const annotated = (isLatest && field === latestField) || (field === "latency" && annotatedExtrema.some((annotation) => annotation.point.time === point.time));
            const value = Math.min(geometry.max, Math.max(0, point[field]));
            return <path key={field} className={"console-group-trend-marker is-" + field + (boundary ? " is-boundary" : "") + (annotated ? " is-annotated" : "")} d={`M${point.x},${49 - value / geometry.max * 42} h0.001`} style={mode === "v2" ? { stroke: ttftTrendColor(point[field]) } : undefined} />;
          })}
        </g>;
      })}
    </svg>
    {annotatedExtrema.map(({ kind, isCurrent, label, point }) => { const pointY = (49 - point.latency / geometry.max * 42) / 56 * 100; return <div key={`${kind}-${point.time}`} className={`console-group-trend-extremum-value is-${kind}${isCurrent ? " is-current" : ""}${point.x < 45 ? " is-left" : point.x > 190 ? " is-right" : ""}`} style={{ left: point.x / 280 * 100 + "%", top: pointY + "%" }} aria-label={label + " · " + duration(point.latency, formatNumber)}><span>{label}</span><strong>{duration(point.latency, formatNumber)}</strong></div>; })}
    {lastVisiblePoint && latestValue != null && !currentIsAnnotated && <div className={`console-group-trend-latest-value${latestY < 24 ? " is-top" : ""}`} style={{ left: lastVisiblePoint.x / 280 * 100 + "%", top: latestY / 56 * 100 + "%" }} aria-label={translate(locale, "monitor.currentValue") + " · " + duration(latestValue, formatNumber)}><span>{translate(locale, "monitor.current")}</span><strong>{duration(latestValue, formatNumber)}</strong></div>}
    <div className="console-group-trend-targets" role="group" aria-label={translate(locale, "monitor.inspectTrendPoints")}>{geometry.points.map((point, index) => {
      const left = index === 0 ? 0 : (geometry.points[index - 1].x + point.x) / 2;
      const right = index === geometry.points.length - 1 ? 280 : (point.x + geometry.points[index + 1].x) / 2;
      const time = dateLabel(point.time, locale);
      const average = duration(point.latency, formatNumber);
      return <Tooltip key={point.time} disableHoverablePopup onOpenChange={(open) => setActiveTime((current) => open ? point.time : current === point.time ? null : current)}>
        <TooltipTrigger className="console-group-trend-target" style={{ left: left / 280 * 100 + "%", width: (right - left) / 280 * 100 + "%" }} aria-label={time + " · " + primary + " " + average + (secondary ? " · " + secondary + " " + duration(point.secondary, formatNumber) : "")} />
        <TooltipContent arrow={false} side="top" className="console-group-trend-tooltip">
          <time dateTime={point.time}>{time}</time>
          <div className="console-group-trend-tooltip-row"><span><i style={mode === "v2" ? { borderColor: ttftTrendColor(point.latency) } : undefined} />{primary}</span><strong>{average}</strong></div>
          {secondary && <div className="console-group-trend-tooltip-row is-secondary"><span><i />{secondary}</span><strong>{duration(point.secondary, formatNumber)}</strong></div>}
        </TooltipContent>
      </Tooltip>;
    })}</div>
    </div>
    <div className="console-group-trend-dates" style={{ marginInlineStart: 4 / 280 * 100 + "%", marginInlineEnd: (280 - (lastVisiblePoint?.x ?? 276)) / 280 * 100 + "%" }}><time>{dateLabel(geometry.startTime, locale)}</time><time>{dateLabel(lastVisiblePoint?.time || geometry.endTime, locale)}</time></div>
    </div>
  </div></TooltipProvider>;
}

function ModelTags({ models, locale, loaded, error }) {
  if (!models.length) return <small className="console-group-muted">{error ? translate(locale, "monitor.failedLoadModels") : loaded ? translate(locale, "monitor.noModelData") : translate(locale, "monitor.loadingModels")}</small>;
  return <div className="console-group-models">{models.slice(0, 4).map((model) => <span key={model.model} className="console-monitor-tone" data-tone={monitorTone(model.status || model.health?.overall)} title={model.model + " · " + toneLabel(monitorTone(model.status || model.health?.overall), locale)}>{model.model}</span>)}{models.length > 4 && <small>+{models.length - 4}</small>}</div>;
}

function ModelDetails({ row, detail, mode, showThroughput, locale, formatNumber, onRetry }) {
  if (!detail || (detail.loading && !detail.data)) return <div className="console-group-detail-loading" role="status"><Skeleton className="h-6 w-full" /><span>{translate(locale, "monitor.loadingModelDetails")}</span></div>;
  if (detail.error && !detail.data) return <ErrorState message={detail.error} onRetry={onRetry} />;
  const models = mode === "v2" ? visibleModels(detail.data) : detail.data?.models || [];
  const labels = [translate(locale, "monitor.model"), translate(locale, "common.status"), mode === "v2" ? translate(locale, "monitor.averageTtft") : translate(locale, "monitor.latestLatency"), ...(showThroughput ? [translate(locale, "monitor.tokensSec")] : []), mode === "v2" ? translate(locale, "monitor.successRate") : translate(locale, "monitor.n7dUptime"), mode === "v2" ? translate(locale, "monitor.cacheRate") : translate(locale, "monitor.n15d30dUptime")];
  return <div className="console-group-details" aria-busy={detail.loading}><h3>{translate(locale, "monitor.modelDetails")}</h3>
    {detail.error && <div role="status" className="console-group-detail-refresh-error"><span>{translate(locale, "monitor.refreshFailedShowingPrevious")}</span><Button size="sm" onClick={onRetry}>{translate(locale, "monitor.retry")}</Button></div>}
    {!models.length ? <EmptyState description={translate(locale, "monitor.noModelDetails")} /> : <Table size="sm" borderStyle="solid" aria-label={row.name + " · " + translate(locale, "monitor.modelDetails")}><TableHeader><TableRow>
      {labels.map((label) => <TableHead key={label}>{label}</TableHead>)}
    </TableRow></TableHeader><TableBody>{models.map((model) => {
      const percent = (value) => metricNumber(value) == null ? "—" : Number(value).toFixed(1) + "%";
      const success = mode === "v2" ? scoredSuccessRate(model.metrics, model.health) : model.availability_7d;
      const cache = metricRate(model.metrics, model.health, "cache_rate");
      return <TableRow key={(model.platform || "") + model.model}><TableCell data-label={labels[0]}>{model.model}</TableCell><TableCell data-label={labels[1]}><Status tone={monitorTone(mode === "v2" ? model.health?.overall : model.latest_status)} locale={locale} /></TableCell><TableCell data-label={labels[2]}>{mode === "v2" ? <TtftMetric metrics={model.metrics?.ttft} health={model.health} locale={locale} formatNumber={formatNumber} /> : duration(metricNumber(model.latest_latency_ms), formatNumber)}</TableCell>{showThroughput && <TableCell data-label={labels[3]}><ThroughputMetric tpm={model.metrics?.tpm} locale={locale} formatNumber={formatNumber} /></TableCell>}<TableCell data-label={labels[showThroughput ? 4 : 3]}>{mode === "v2" ? <span className="console-group-detail-rate console-monitor-tone" data-tone={success == null ? "unknown" : monitorTone(model.health?.error_rate)}>{percent(success)}</span> : percent(success)}</TableCell><TableCell data-label={labels[showThroughput ? 5 : 4]}>{mode === "v2" ? <span className="console-group-detail-rate console-monitor-tone" data-metric="cache" data-tone={cache == null ? "unknown" : monitorTone(model.health?.cache)}>{percent(cache)}</span> : percent(model.availability_15d) + " / " + percent(model.availability_30d)}</TableCell></TableRow>;
    })}</TableBody></Table>}
  </div>;
}

function StatusRow({ row, mode, showThroughput, range, locale, formatNumber, labels, updatedAt, coverage }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailVersion, setDetailVersion] = useState(0);
  const { id, group_id: groupId } = row.source;
  const platform = row.platform;
  const shouldLoadDetail = mode === "v2" || expanded;
  const description = row.description?.trim();
  const showDescription = description && ![row.name, platform].some((value) => value?.trim().toLowerCase() === description.toLowerCase());
  useEffect(() => {
    if (!shouldLoadDetail) return undefined;
    const controller = new AbortController();
    setDetail((current) => ({ ...current, loading: true, error: "" }));
    const request = mode === "v2" ? monitorApi.models({ range, group_id: groupId, platform }, controller.signal) : monitorApi.status(id, controller.signal);
    request.then((data) => { if (!controller.signal.aborted) setDetail({ data, loading: false }); }).catch((error) => { if (!controller.signal.aborted) setDetail((current) => ({ ...current, error: error.message, loading: false })); });
    return () => controller.abort();
  }, [shouldLoadDetail, mode, range, id, groupId, platform, updatedAt, detailVersion]);

  return <>
        <TableRow highlighted={expanded} className="console-group-overview-row" data-tone={row.tone}>
          <TableCell data-column="identity"><div className="console-group-identity"><strong title={row.name}>{row.name}</strong>{showDescription && <small title={description}>{description}</small>}<span>{row.platform}{row.group?.is_exclusive ? " · " + translate(locale, "monitor.private") : ""}{row.group?.subscription_type === "subscription" ? " · SUB" : ""}</span></div></TableCell>
          <TableCell data-column="rate" data-label={labels[1]}><strong className="console-group-rate">{row.rate == null ? "—" : formatNumber(row.rate, { maximumFractionDigits: 4 }) + "×"}</strong>{row.originalRate != null && row.rate !== row.originalRate && <del className="console-group-original-rate">{row.originalRate}×</del>}</TableCell>
          <TableCell data-column="state"><div className="console-group-state"><Status tone={row.tone} locale={locale} /><ModelTags models={row.models.length ? row.models : mode === "v2" ? visibleModels(detail?.data) : []} locale={locale} loaded={mode !== "v2" || Boolean(detail?.data)} error={detail?.error} /></div></TableCell>
          <TableCell data-column="latency" data-label={labels[3]}>{mode === "v2" ? <TtftMetric metrics={row.source.metrics?.ttft} health={row.source.health} locale={locale} formatNumber={formatNumber} /> : <div className="console-group-latency"><strong>{duration(row.latency, formatNumber)}</strong><small>{translate(locale, "monitor.latestPrimaryModelProbe")}</small></div>}</TableCell>
          {showThroughput && <TableCell data-column="throughput" data-label={labels[4]}><ThroughputMetric tpm={row.source.metrics?.tpm} locale={locale} formatNumber={formatNumber} /></TableCell>}
          <TableCell data-column="cache" data-label={labels[showThroughput ? 5 : 4]}><MetricRing metric={mode === "v2" ? "cache" : undefined} value={mode === "v2" ? row.cacheRate : row.availability} accessibleLabel={row.name + " · " + labels[showThroughput ? 5 : 4]} label={mode === "v2" ? range : translate(locale, "monitor.probeUptime")} tone={mode === "v2" ? monitorTone(row.source.health?.cache) : "operational"} /></TableCell>
          <TableCell data-column="success" data-label={labels[showThroughput ? 6 : 5]}>{mode === "v2" ? <MetricRing value={row.successRate} accessibleLabel={row.name + " · " + labels[showThroughput ? 6 : 5]} label={range} tone={monitorTone(row.source.health?.error_rate)} /> : <strong className="console-group-ping">{duration(row.ping, formatNumber)}</strong>}</TableCell>
          <TableCell className="console-group-trend-cell" data-column="trend" data-label={labels[showThroughput ? 7 : 6]}><Trend timeline={row.timeline} mode={mode} coverage={coverage} locale={locale} formatNumber={formatNumber} /></TableCell>
          <TableCell data-column="action"><Button size="sm" aria-expanded={expanded} aria-controls={"monitor-detail-" + row.key} aria-label={row.name + " · " + translate(locale, "monitor.modelDetails")} onClick={() => { if (!expanded && mode === "v2") setDetailVersion((current) => current + 1); setExpanded((current) => !current); }}>{expanded ? translate(locale, "monitor.collapse") : translate(locale, "monitor.expand")}</Button></TableCell>
        </TableRow>
        {expanded && <TableRow className="console-group-detail-row"><TableCell colSpan={labels.length} id={"monitor-detail-" + row.key}><ModelDetails row={row} detail={detail} mode={mode} showThroughput={showThroughput} locale={locale} formatNumber={formatNumber} onRetry={() => setDetailVersion((current) => current + 1)} /></TableCell></TableRow>}
  </>;
}

function StatusTable({ rows, mode, showThroughput, range, locale, formatNumber, updatedAt, coverage }) {
  const labels = [translate(locale, "monitor.group"), translate(locale, "monitor.multiplier"), translate(locale, "monitor.statusModels"), mode === "v2" ? translate(locale, "monitor.averageTtft") : translate(locale, "monitor.latestProbeLatency"), ...(showThroughput ? [translate(locale, "monitor.tokensSec")] : []), mode === "v2" ? translate(locale, "monitor.cacheRate") : translate(locale, "monitor.uptimeRange", { range }), mode === "v2" ? translate(locale, "monitor.successRate") : "Ping", mode === "v2" ? translate(locale, "monitor.ttftTrend") : translate(locale, "monitor.recentProbes"), translate(locale, "monitor.details")];
  return <div className="console-group-table-scroll console-group-responsive-list" tabIndex={0} role="region" aria-label={translate(locale, "monitor.title")}>
    <Table size="sm" borderStyle="solid" className={"console-group-status-table" + (showThroughput ? " has-throughput" : "")} aria-label={translate(locale, "monitor.title")}>
      <colgroup>
        <col className="console-group-col-identity" /><col className="console-group-col-rate" /><col className="console-group-col-state" /><col className="console-group-col-ttft" />
        {showThroughput && <col className="console-group-col-throughput" />}
        <col className="console-group-col-ring" /><col className="console-group-col-ring" /><col /><col className="console-group-col-details" />
      </colgroup>
      <TableHeader><TableRow>{labels.map((label, index) => <TableHead key={label} scope="col" className={[showThroughput ? 5 : 4, showThroughput ? 6 : 5].includes(index) ? "console-group-centered-heading" : undefined}>{label}</TableHead>)}</TableRow></TableHeader>
      <TableBody>{rows.map((row) => <StatusRow key={row.key} row={row} mode={mode} showThroughput={showThroughput} range={range} locale={locale} formatNumber={formatNumber} labels={labels} updatedAt={updatedAt} coverage={coverage} />)}</TableBody>
    </Table>
  </div>;
}

function UserRanking({ state, range, showThroughput, locale, formatNumber, onRetry }) {
  const title = translate(locale, "monitor.userRanking");
  const rows = buildMonitorRankingRows(state.items);
  const percent = (value) => value == null ? "—" : formatNumber(value, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + "%";
  const labels = [translate(locale, "monitor.rank"), translate(locale, "monitor.user"), translate(locale, "monitor.successRate"), translate(locale, "monitor.averageTtft"), ...(showThroughput ? [translate(locale, "monitor.tokensSec")] : []), translate(locale, "monitor.cacheRate"), ...(showThroughput ? ["RPM"] : [])];
  return <Panel className="console-group-status-board console-monitor-ranking" aria-label={title}>
    <header className="console-group-board-header"><div><h2>{title}</h2><p>{range} · {translate(locale, "monitor.rankedRequestVolumeTop")}</p></div><div className="console-group-updated"><span>{translate(locale, "monitor.dataThroughValue", { date: dateLabel(state.coverage?.data_through, locale) })}</span></div></header>
    {state.error && (state.loaded ? <div className="console-ranking-refresh-error" role="status"><span>{translate(locale, "monitor.rankingRefreshFailedShowing")}</span><Button size="sm" onClick={onRetry}>{translate(locale, "monitor.retry")}</Button></div> : <ErrorState message={state.error} onRetry={onRetry} />)}
    {state.loading && !state.loaded ? <div className="console-group-loading" role="status" aria-label={translate(locale, "monitor.loadingUserRanking")}><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div> : rows.length ? <div className="console-group-table-scroll" role="region" tabIndex={0} aria-label={translate(locale, "monitor.userRankingTableScroll")} aria-busy={state.loading}>
      <Table size="sm" borderStyle="solid" className="console-ranking-table" aria-label={title}>
        <TableHeader><TableRow>{labels.map((label) => <TableHead key={label} scope="col">{label}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{rows.map((row) => {
          const anonymous = /^Other user #(\d+)$/.exec(row.label);
          const name = row.isSelf ? translate(locale, "monitor.me") : anonymous ? translate(locale, "monitor.otherUserNumber", { number: anonymous[1] }) : row.label || translate(locale, "monitor.anonymousUser");
          return <TableRow key={row.key} className={row.isSelf ? "console-ranking-self" : undefined}>
            <TableCell>{row.rank > 0 ? <Badge size="sm" variant={row.rank === 1 ? "warning" : row.rank === 2 ? "info" : "soft"}>#{row.rank}</Badge> : <small className="console-group-muted">{translate(locale, "monitor.unranked")}</small>}</TableCell>
            <TableCell><div className="console-ranking-user"><strong>{name}</strong>{row.isSelf && <Badge size="xs" variant="info">{translate(locale, "monitor.you")}</Badge>}</div></TableCell>
            <TableCell><strong className="console-ranking-value">{percent(row.successRate)}</strong></TableCell>
            <TableCell><TtftMetric metrics={row.metrics.ttft} showRating={false} locale={locale} formatNumber={formatNumber} /></TableCell>
            {showThroughput && <TableCell><ThroughputMetric tpm={row.metrics.tpm} locale={locale} formatNumber={formatNumber} /></TableCell>}
            <TableCell><strong className="console-ranking-value">{percent(row.cacheRate)}</strong></TableCell>
            {showThroughput && <TableCell><strong className="console-ranking-value">{metricNumber(row.metrics.rpm) == null ? "—" : formatNumber(row.metrics.rpm, { maximumFractionDigits: 1 })}</strong></TableCell>}
          </TableRow>;
        })}</TableBody>
      </Table>
    </div> : !state.error && <EmptyState description={translate(locale, "monitor.noUserRankingTime")} />}
    <footer className="console-group-footer"><span>{translate(locale, "monitor.otherUsersAnonymousEntry")}</span><span>{translate(locale, "monitor.indicatesNoDataUnranked")}</span></footer>
  </Panel>;
}

export function MonitorPage() {
  const { t, locale, formatNumber } = useLocale();
  const { settings, settingsLoading, settingsError, retrySettings } = useConsole();
  const mode = settings?.channel_monitor_mode === "v2" ? "v2" : "v1";
  const showThroughput = mode === "v2" && settings?.channel_monitor_hide_throughput !== true;
  const [rangeChoice, setRange] = useState("");
  const range = MONITOR_RANGES[mode].includes(rangeChoice) ? rangeChoice : mode === "v2" ? "90m" : "7d";
  const [refresh, setRefresh] = useState(storedRefresh);
  const [state, setState] = useState({ loading: true, items: [], groups: [], rates: {}, details: {}, error: "", notice: "", updatedAt: "", coverage: null, context: "" });
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("status");
  const [search, setSearch] = useState("");
  const requestRef = useRef(null);
  const loadingRef = useRef(false);
  const context = mode + ":" + range;

  const load = useCallback(async (silent = false) => {
    if (settingsLoading || settingsError || (silent && (document.hidden || loadingRef.current))) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    loadingRef.current = true;
    setState((current) => ({ ...current, loading: true, error: "", notice: "" }));
    try {
      const [monitors, groups, rates] = await Promise.allSettled([
        mode === "v2" ? monitorApi.matrix({ range, group_by: "platform_group" }, controller.signal) : monitorApi.list(controller.signal),
        groupsApi.available(controller.signal), groupsApi.rates(controller.signal),
      ]);
      if (controller.signal.aborted) return;
      if (monitors.status === "rejected") throw monitors.reason;
      const items = listItems(monitors.value);
      let details = {};
      let detailFailed = false;
      if (mode === "v1" && range !== "7d") {
        // Bound concurrency for installations with many monitored endpoints.
        const queue = items.slice();
        const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
          while (queue.length && !controller.signal.aborted) {
            const item = queue.shift();
            try { details[item.id] = await monitorApi.status(item.id, controller.signal); } catch { detailFailed = true; }
          }
        });
        await Promise.all(workers);
      }
      if (controller.signal.aborted) return;
      const notices = [];
      if (groups.status === "rejected" || rates.status === "rejected") notices.push(t("monitor.someGroupMultipliersCould"));
      if (detailFailed) notices.push(t("monitor.someUptimeValuesCould"));
      setState({ loading: false, items, groups: groups.status === "fulfilled" ? listItems(groups.value) : [], rates: rates.status === "fulfilled" ? rates.value : null, details, error: "", notice: notices.join(" "), updatedAt: new Date().toISOString(), coverage: monitors.value?.coverage || null, context: mode + ":" + range });
    } catch (error) {
      if (!controller.signal.aborted) setState((current) => ({ ...current, loading: false, error: error.message }));
    } finally {
      if (requestRef.current === controller) loadingRef.current = false;
    }
  }, [mode, range, locale, settingsLoading, settingsError]);

  useEffect(() => { load(); return () => requestRef.current?.abort(); }, [load]);
  useEffect(() => {
    try { localStorage.setItem(REFRESH_KEY, JSON.stringify(refresh)); } catch { /* Storage may be disabled. */ }
    if (!refresh.auto) return undefined;
    const timer = window.setInterval(() => load(true), refresh.seconds * 1000);
    const onVisibility = () => { if (!document.hidden) load(true); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [load, refresh]);

  const rows = useMemo(() => state.context === context ? buildMonitorRows(state.items, state.groups, state.rates, mode, range, state.details) : [], [state, mode, range, context]);
  const counts = rows.reduce((result, row) => { result[row.tone] += 1; return result; }, { operational: 0, degraded: 0, failed: 0, unknown: 0 });
  const query = search.trim().toLowerCase();
  const sortOptions = [{ value: "status", label: t("common.status") }, { value: "rate", label: t("monitor.multiplier2") }, { value: "latency", label: mode === "v2" ? t("monitor.averageTtft2") : t("monitor.latency2") }, ...(mode === "v2" ? [{ value: "cacheRate", label: t("monitor.cacheRate2") }, { value: "successRate", label: t("monitor.successRate2") }] : [{ value: "availability", label: t("monitor.uptime2") }])];
  const visible = sortMonitorRows(rows.filter((row) => (filter === "all" || row.tone === filter) && (!query || [row.name, row.platform, row.description, ...row.models.map((model) => model.model)].join(" ").toLowerCase().includes(query))), sortOptions.some((option) => option.value === sort) ? sort : "status");

  const scope = mode === "v2" ? t("monitor.groupsPlatforms") : t("monitor.monitoredEndpoints");
  const noData = !rows.length;
  const statusText = settingsLoading || (state.loading && noData) ? t("monitor.loading") : state.error ? t("monitor.refreshFailed") : noData ? t("monitor.noMonitoringData") : refresh.auto ? t("monitor.autoRefresh") : t("monitor.refreshPaused");
  const refreshStatus = state.error ? "failed" : noData || !refresh.auto ? "inactive" : "active";
  return <Page title={t("monitor.title")} className="console-monitor-page console-group-status-page">
    <Panel className="console-group-status-board">
      <header className="console-group-board-header"><div><StatusBadge size="sm" status={settingsError ? "failed" : refreshStatus} label={settingsError ? t("monitor.settingsUnavailable") : statusText} /><p>{mode === "v2" ? t("monitor.compareGroupsAverageFirst") : t("monitor.viewEndpointProbeStatus")}</p></div><div className="console-group-updated"><span>{t(mode === "v2" ? "monitor.dataThroughValue" : "monitor.updatedValue", { date: dateLabel(mode === "v2" ? state.coverage?.data_through : state.updatedAt, locale) })}</span><Button icon="refresh" loading={state.loading || settingsLoading} onClick={() => load()}>{t("common.refresh")}</Button></div></header>
      <div className="console-group-summary"><div className="console-group-summary-ring"><MetricRing value={noData ? null : counts.operational / rows.length * 100} label={mode === "v2" ? t("monitor.healthyGroupShare") : t("monitor.healthyShare")} /></div><div className="console-group-summary-total"><small>{scope}</small><strong>{noData && state.loading ? "—" : rows.length}</strong></div><div className="console-monitor-tone" data-tone="operational"><small>{t("monitor.healthy")}</small><strong>{counts.operational}</strong></div><div className="console-monitor-tone" data-tone={counts.failed ? "failed" : "degraded"}><small>{t("monitor.warningIncident")}</small><strong>{counts.degraded + counts.failed}</strong></div><div className="console-monitor-tone" data-tone="unknown"><small>{t("monitor.unknown")}</small><strong>{counts.unknown}</strong></div><div className="console-group-status-legend">{Object.keys(counts).map((tone) => <span key={tone} style={{ color: toneColor[tone] }}><i />{toneLabel(tone, locale)}</span>)}</div></div>
      <div className="console-group-toolbar">
        <div className="console-group-toolbar-line console-group-toolbar-controls"><span className="console-group-range-label">{mode === "v2" ? t("monitor.timeRange") : t("monitor.uptimeWindow")}</span><CompactTabs value={range} onChange={setRange} label={t("monitor.timeRange")} items={MONITOR_RANGES[mode].map((value) => ({ value, label: value }))} /><span className="console-group-sort-label">{t("monitor.sort")}</span><SelectInput aria-label={t("monitor.sort")} value={sortOptions.some((option) => option.value === sort) ? sort : "status"} onChange={(event) => setSort(event.target.value)}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectInput><div className="console-group-refresh"><SelectInput aria-label={t("monitor.auto")} value={refresh.auto ? String(refresh.seconds) : "off"} onChange={(event) => setRefresh({ auto: event.target.value !== "off", seconds: Number(event.target.value) || 30 })}><option value="off">{t("monitor.pauseRefresh")}</option>{[30, 60, 120].map((value) => <option key={value} value={value}>{t("monitor.autoRefreshEvery", { seconds: value })}</option>)}</SelectInput></div></div>
        <div className="console-group-toolbar-line"><CompactTabs value={filter} onChange={setFilter} label={t("monitor.statusFilter")} items={[{ value: "all", label: t("monitor.all") + " " + rows.length }, ...Object.keys(counts).map((tone) => ({ value: tone, label: toneLabel(tone, locale) + " " + counts[tone] }))]} /><TextInput aria-label={t("monitor.searchGroupsPlatforms")} placeholder={t("monitor.searchGroupsPlatforms2")} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      </div>
      {settingsError ? <ErrorState message={settingsError} onRetry={retrySettings} /> : state.error && <ErrorState message={state.error} onRetry={() => load()} />}
      {state.notice && <p className="console-group-notice" role="status">{state.notice}</p>}
      {state.coverage?.coverage_complete === false && <p className="console-group-notice">{t("monitor.historyDoesNotCover")}</p>}
      {mode === "v2" && <div className="console-group-definitions">
        <p>{t("monitor.averageTtftUsesActual")}</p>
        <p>{t("monitor.successRate1Scored")}</p>
        <p>{t("monitor.healthyGroupShareCounts")}</p>
      </div>}
      {!settingsError && ((state.loading && noData) || settingsLoading) ? <div className="console-group-loading" role="status" aria-label={t("common.loading")}>{Array.from({ length: 6 }, (_, index) => <Skeleton className="h-20 w-full" key={index} />)}</div> : visible.length ? <StatusTable rows={visible} mode={mode} showThroughput={showThroughput} range={range} locale={locale} formatNumber={formatNumber} updatedAt={state.updatedAt} coverage={state.coverage} /> : !state.error && !settingsError && <EmptyState icon="pulse" description={t("monitor.noMonitoringDataMatches")} />}
      {showThroughput && <div className="console-group-definitions"><p>{t("monitor.tokensSecTotalThroughput")}</p></div>}
      <footer className="console-group-footer"><span>{visible.length} {scope}</span><span>{mode === "v2" ? t("monitor.indicatesInsufficientSamplesNo") : t("monitor.uptimeBasedProbesTrends")}</span></footer>
    </Panel>
  </Page>;
}

export function UserRankingPage() {
  const { t, locale, formatNumber } = useLocale();
  const { settings, settingsLoading, settingsError, retrySettings } = useConsole();
  const enabled = settings?.channel_monitor_mode === "v2" && settings?.channel_monitor_hide_user_ranking !== true && settings?.channel_monitor_enabled !== false;
  const [range, setRange] = useState("90m");
  const [refresh, setRefresh] = useState(storedRefresh);
  const [state, setState] = useState({ items: [], loading: true, loaded: false, error: "", coverage: null, context: "" });
  const requestRef = useRef(null);
  const loadingRef = useRef(false);
  const load = useCallback(async (silent = false) => {
    if (!enabled || settingsLoading || settingsError || (silent && (document.hidden || loadingRef.current))) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    loadingRef.current = true;
    setState((current) => current.context === range ? { ...current, loading: true, error: "" } : { items: [], loading: true, loaded: false, error: "", coverage: null, context: range });
    try {
      const data = await monitorApi.users({ range }, controller.signal);
      if (!controller.signal.aborted) setState({ items: listItems(data), loading: false, loaded: true, error: "", coverage: data?.coverage || null, context: range });
    } catch (error) {
      if (!controller.signal.aborted) setState((current) => ({ ...current, loading: false, error: error.message || t("monitor.unableLoadUserRanking") }));
    } finally {
      if (requestRef.current === controller) loadingRef.current = false;
    }
  }, [enabled, settingsLoading, settingsError, range, locale]);
  useEffect(() => { load(); return () => requestRef.current?.abort(); }, [load]);
  useEffect(() => {
    try { localStorage.setItem(REFRESH_KEY, JSON.stringify(refresh)); } catch { /* Storage may be disabled. */ }
    if (!refresh.auto || !enabled) return undefined;
    const timer = window.setInterval(() => load(true), refresh.seconds * 1000);
    const onVisibility = () => { if (!document.hidden) load(true); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [load, refresh, enabled]);
  return <Page title={t("nav.userRanking")} className="console-monitor-page console-group-status-page">
    {settingsError ? <ErrorState message={settingsError} onRetry={retrySettings} /> : settingsLoading ? <Skeleton className="h-20 w-full" /> : !enabled ? <EmptyState description={t("monitor.userRankingNotAvailable")} /> : <>
      <Panel className="console-group-status-board"><div className="console-group-toolbar"><div className="console-group-toolbar-line">
        <span>{t("monitor.timeRange")}</span><CompactTabs value={range} onChange={setRange} label={t("monitor.timeRange")} items={MONITOR_RANGES.v2.map((value) => ({ value, label: value }))} />
        <div className="console-group-refresh"><SelectInput aria-label={t("monitor.auto")} value={refresh.auto ? String(refresh.seconds) : "off"} onChange={(event) => setRefresh({ auto: event.target.value !== "off", seconds: Number(event.target.value) || 30 })}><option value="off">{t("monitor.pauseRefresh")}</option>{[30, 60, 120].map((value) => <option key={value} value={value}>{t("monitor.autoRefreshEvery", { seconds: value })}</option>)}</SelectInput></div>
        <Button icon="refresh" loading={state.loading} onClick={() => load()}>{t("common.refresh")}</Button>
      </div></div></Panel>
      <UserRanking state={state.context === range ? state : { items: [], loading: true, loaded: false }} range={range} showThroughput={settings?.channel_monitor_hide_throughput !== true} locale={locale} formatNumber={formatNumber} onRetry={() => load()} />
    </>}
  </Page>;
}
