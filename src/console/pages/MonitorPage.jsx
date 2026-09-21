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
import { useLocale } from "../i18n";
import { formatCompact } from "../utils";
import { Button, EmptyState, ErrorState, Page, Panel, SelectInput, Skeleton, StatusBadge, TextInput } from "../UI";
import { CompactTabs } from "../components/ConsoleControls";
import { MONITOR_RANGES, buildMonitorRankingRows, buildMonitorRows, metricNumber, metricRate, monitorTone, scoredSuccessRate, sortMonitorRows, tokensPerSecond, trendGeometry } from "./monitorData.js";

const REFRESH_KEY = "sentence_monitor_refresh";
const toneColor = { operational: "var(--console-monitor-healthy)", degraded: "var(--console-monitor-warning)", failed: "var(--console-monitor-critical)", unknown: "var(--foreground-subtle)" };
const localized = (locale, zh, en) => locale === "zh" ? zh : en;
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
    operational: localized(locale, "正常", "Healthy"),
    degraded: localized(locale, "警告", "Warning"),
    failed: localized(locale, "异常", "Incident"),
    unknown: localized(locale, "未知", "Unknown"),
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

function ThroughputMetric({ tpm, locale, formatNumber }) {
  const value = tokensPerSecond(tpm);
  return <strong className="console-group-throughput" title={value == null ? undefined : formatNumber(value, { maximumFractionDigits: 2 }) + " Token/s"}>{value == null ? "—" : value < 1000 ? formatNumber(value, { maximumFractionDigits: 2 }) : formatCompact(value)}<small>{value == null ? "" : localized(locale, " Token/秒", " Token/s")}</small></strong>;
}

function dateLabel(value, locale) {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function MetricRing({ value, label, accessibleLabel = label, tone = "operational" }) {
  const percentage = value == null ? "—" : String(Number(value.toFixed(1)));
  return <div className="console-group-ring-wrap console-monitor-tone" data-tone={value == null ? "unknown" : tone}>
    {value == null ? <div className="console-group-missing-ring" aria-label={accessibleLabel + ": —"}>—</div> : <Progress variant="circular" className="console-group-ring" size={56} thickness={6} value={value} indicatorColor="var(--console-monitor-accent)" aria-label={accessibleLabel}><ProgressValue>{() => <span className="console-group-ring-number">{percentage}<span className="console-group-ring-unit">%</span></span>}</ProgressValue></Progress>}
    <small>{label}</small>
  </div>;
}

function TtftMetric({ metrics, health, locale, formatNumber, showRating = true }) {
  const value = metricNumber(metrics?.avg_ms);
  const tone = monitorTone(health?.ttft);
  const score = tone === "unknown" ? null : metricNumber(health?.ttft_score);
  const label = {
    operational: localized(locale, "快", "Fast"),
    degraded: localized(locale, "中", "Moderate"),
    failed: localized(locale, "慢", "Slow"),
    unknown: localized(locale, "未知", "Unknown"),
  }[tone];
  const scoreLabel = localized(locale, "首字响应评分（后端分位数口径）", "TTFT score (backend percentile basis)");
  const ratingLabel = localized(locale, "评级：", "Rating: ") + label;
  return <div className={"console-group-latency console-group-ttft console-monitor-tone" + (showRating ? "" : " is-unrated")} data-tone={tone}>
    <div className="console-group-latency-value"><strong>{duration(value, formatNumber)}</strong>{showRating && <span title={scoreLabel}><StatusBadge size="sm" status={tone === "operational" ? "active" : tone === "unknown" ? "inactive" : tone} label={ratingLabel} /></span>}</div>
    {showRating && (score == null ? <div className="console-group-latency-track" aria-label={scoreLabel + " · —"} /> : <Progress thickness={4} value={Math.min(100, score)} indicatorColor="var(--console-monitor-accent)" aria-label={scoreLabel} aria-valuetext={score.toFixed(1) + "/100 · " + label} />)}
    <div className="console-group-ttft-secondary" title={localized(locale, "分位数以直方图桶上限估算，不是精确测量值。", "Percentiles are estimated using histogram bucket upper bounds, not exact measurements.")}><small>P50 · {estimatedDuration(metricNumber(metrics?.p50_ms), formatNumber)}</small><small>P90 · {estimatedDuration(metricNumber(metrics?.p90_ms), formatNumber)}</small><small className="console-group-ttft-estimate">{localized(locale, "分桶估算", "Bucket estimates")}</small></div>
  </div>;
}

function Trend({ timeline, mode, coverage, locale, formatNumber }) {
  const fillId = useId();
  const [activeTime, setActiveTime] = useState(null);
  const geometry = trendGeometry(timeline, mode === "v2" ? coverage : undefined);
  const validPoints = geometry.points.filter((point) => point.latency != null || point.secondary != null);
  const lastVisiblePoint = validPoints.at(-1);
  if (!geometry.points.length) return <div className="console-group-trend-empty">{localized(locale, "暂无延迟数据", "No latency data")}</div>;
  const flat = ["latency", "secondary"].every((field) => new Set(validPoints.map((point) => point[field]).filter((value) => value != null)).size <= 1);
  const seconds = geometry.bucketSeconds;
  const bucketLabel = seconds == null ? localized(locale, "数据点粒度未知", "Unknown point interval") : localized(locale, "每点 ", "Each point: ") + (seconds < 3600 ? seconds / 60 + localized(locale, " 分钟", " minutes") : seconds < 86400 ? seconds / 3600 + localized(locale, " 小时", " hours") : seconds / 86400 + localized(locale, " 天", " days"));
  const primary = mode === "v2" ? localized(locale, "平均首字延迟", "Average TTFT") : localized(locale, "探测延迟", "Probe latency");
  const secondary = mode === "v2" ? localized(locale, "P95（分桶估算）", "P95 (bucket estimate)") : "Ping";
  return <TooltipProvider delay={0} closeDelay={0}><div className="console-group-trend">
    <div className="console-group-trend-legend"><span>{primary}</span><span>{secondary}</span></div>
    <div className="console-group-trend-plot">
    <svg viewBox="0 0 280 56" preserveAspectRatio="none" role="img" aria-label={primary + " / " + secondary + " · " + dateLabel(geometry.startTime, locale) + " — " + dateLabel(geometry.endTime, locale)}>
      <defs><linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--console-monitor-healthy)" stopOpacity=".16" /><stop offset="100%" stopColor="var(--console-monitor-healthy)" stopOpacity="0" /></linearGradient></defs>
      <path className="console-group-trend-grid" d="M4,7 H276 M4,28 H276 M4,49 H276" />
      {geometry.points.filter((point) => ["failed", "degraded"].includes(point.tone)).map((point, index) => <path key={index} d={`M${point.x},5 V51`} className="console-group-trend-incident" stroke={toneColor[point.tone]} />)}
      <path d={geometry.primaryArea} fill={`url(#${fillId})`} />
      <path className="console-group-trend-secondary" d={geometry.secondary} />
      <path className="console-group-trend-primary" d={geometry.primary} />
      {geometry.points.map((point, index) => {
        if (point.latency == null && point.secondary == null) return null;
        return <g key={point.time} className={"console-group-trend-point" + (activeTime === point.time ? " is-active" : "")}>
          {activeTime === point.time && <path className="console-group-trend-guide" d={`M${point.x},4 V52`} />}
          {["latency", "secondary"].map((field) => {
            if (point[field] == null) return null;
            const boundary = geometry.points[index - 1]?.[field] == null || geometry.points[index + 1]?.[field] == null;
            return <path key={field} className={"console-group-trend-marker is-" + field + (boundary ? " is-boundary" : "")} d={`M${point.x},${49 - point[field] / geometry.max * 42} h0.001`} />;
          })}
        </g>;
      })}
    </svg>
    <div className="console-group-trend-targets" role="group" aria-label={localized(locale, "查看各时间点数据", "Inspect trend points")}>{geometry.points.map((point, index) => {
      const left = index === 0 ? 0 : (geometry.points[index - 1].x + point.x) / 2;
      const right = index === geometry.points.length - 1 ? 280 : (point.x + geometry.points[index + 1].x) / 2;
      const time = dateLabel(point.time, locale);
      const average = duration(point.latency, formatNumber);
      const percentile = mode === "v2" ? estimatedDuration(point.secondary, formatNumber) : duration(point.secondary, formatNumber);
      return <Tooltip key={point.time} disableHoverablePopup onOpenChange={(open) => setActiveTime((current) => open ? point.time : current === point.time ? null : current)}>
        <TooltipTrigger className="console-group-trend-target" style={{ left: left / 280 * 100 + "%", width: (right - left) / 280 * 100 + "%" }} aria-label={time + " · " + primary + " " + average + " · " + secondary + " " + percentile} />
        <TooltipContent arrow={false} side="top" className="console-group-trend-tooltip">
          <time dateTime={point.time}>{time}</time>
          <div className="console-group-trend-tooltip-row"><span><i />{primary}</span><strong>{average}</strong></div>
          <div className="console-group-trend-tooltip-row is-secondary"><span><i />{secondary}</span><strong>{percentile}</strong></div>
        </TooltipContent>
      </Tooltip>;
    })}</div>
    </div>
    <div className="console-group-trend-dates" style={{ marginInlineStart: 4 / 280 * 100 + "%", marginInlineEnd: (280 - (lastVisiblePoint?.x ?? 276)) / 280 * 100 + "%" }}><time>{dateLabel(geometry.startTime, locale)}</time><time>{dateLabel(lastVisiblePoint?.time || geometry.endTime, locale)}</time></div>
    {mode === "v2" && <div className="console-group-trend-note">{bucketLabel} · {validPoints.length}/{geometry.points.length} {localized(locale, "个区间有数据", "intervals with data")}{validPoints.length < 3 ? " · " + localized(locale, "数据较少", "Limited history") : flat ? " · " + localized(locale, "各点数值相同", "Values unchanged") : ""}</div>}
  </div></TooltipProvider>;
}

function ModelTags({ models, locale, loaded }) {
  if (!models.length) return <small className="console-group-muted">{loaded ? localized(locale, "暂无模型数据", "No model data") : localized(locale, "展开查看模型", "Expand for models")}</small>;
  return <div className="console-group-models">{models.slice(0, 4).map((model) => <span key={model.model} className="console-monitor-tone" data-tone={monitorTone(model.status || model.health?.overall)} title={model.model + " · " + toneLabel(monitorTone(model.status || model.health?.overall), locale)}>{model.model}</span>)}{models.length > 4 && <small>+{models.length - 4}</small>}</div>;
}

function ModelDetails({ row, detail, mode, showThroughput, locale, formatNumber, onRetry }) {
  if (!detail || (detail.loading && !detail.data)) return <div className="console-group-detail-loading" role="status"><Skeleton className="h-6 w-full" /><span>{localized(locale, "正在加载模型详情…", "Loading model details…")}</span></div>;
  if (detail.error && !detail.data) return <ErrorState message={detail.error} onRetry={onRetry} />;
  const models = mode === "v2" ? visibleModels(detail.data) : detail.data?.models || [];
  return <div className="console-group-details" aria-busy={detail.loading}><h3>{localized(locale, "模型详情", "Model details")}</h3>
    {detail.error && <div role="status" className="console-group-detail-refresh-error"><span>{localized(locale, "刷新失败，保留上次数据。", "Refresh failed. Showing previous data.")}</span><Button size="sm" onClick={onRetry}>{localized(locale, "重试", "Retry")}</Button></div>}
    {!models.length ? <EmptyState description={localized(locale, "暂无模型详情", "No model details")} /> : <Table size="sm" borderStyle="solid" aria-label={row.name + " · " + localized(locale, "模型详情", "Model details")}><TableHeader><TableRow>
      {[localized(locale, "模型", "Model"), localized(locale, "状态", "Status"), mode === "v2" ? localized(locale, "平均首字延迟", "Average TTFT") : localized(locale, "最新延迟", "Latest latency"), ...(showThroughput ? [localized(locale, "每秒 Token", "Tokens/sec")] : []), mode === "v2" ? localized(locale, "成功率", "Success rate") : localized(locale, "7天可用率", "7d uptime"), mode === "v2" ? localized(locale, "缓存率", "Cache rate") : localized(locale, "15天 / 30天可用率", "15d / 30d uptime")].map((label) => <TableHead key={label}>{label}</TableHead>)}
    </TableRow></TableHeader><TableBody>{models.map((model) => {
      const percent = (value) => metricNumber(value) == null ? "—" : Number(value).toFixed(1) + "%";
      const success = mode === "v2" ? scoredSuccessRate(model.metrics, model.health) : model.availability_7d;
      const cache = metricRate(model.metrics, model.health, "cache_rate");
      return <TableRow key={(model.platform || "") + model.model}><TableCell>{model.model}</TableCell><TableCell><Status tone={monitorTone(mode === "v2" ? model.health?.overall : model.latest_status)} locale={locale} /></TableCell><TableCell>{mode === "v2" ? <TtftMetric metrics={model.metrics?.ttft} health={model.health} locale={locale} formatNumber={formatNumber} /> : duration(metricNumber(model.latest_latency_ms), formatNumber)}</TableCell>{showThroughput && <TableCell><ThroughputMetric tpm={model.metrics?.tpm} locale={locale} formatNumber={formatNumber} /></TableCell>}<TableCell>{mode === "v2" ? <span className="console-group-detail-rate console-monitor-tone" data-tone={success == null ? "unknown" : monitorTone(model.health?.error_rate)}>{percent(success)}</span> : percent(success)}</TableCell><TableCell>{mode === "v2" ? <span className="console-group-detail-rate console-monitor-tone" data-tone={cache == null ? "unknown" : monitorTone(model.health?.cache)}>{percent(cache)}</span> : percent(model.availability_15d) + " / " + percent(model.availability_30d)}</TableCell></TableRow>;
    })}</TableBody></Table>}
  </div>;
}

function StatusRow({ row, mode, showThroughput, range, locale, formatNumber, labels, updatedAt, coverage }) {
  const [expanded, setExpanded] = useState(true);
  const [detail, setDetail] = useState(null);
  const [detailVersion, setDetailVersion] = useState(0);
  const { id, group_id: groupId } = row.source;
  const platform = row.platform;
  const description = row.description?.trim();
  const showDescription = description && ![row.name, platform].some((value) => value?.trim().toLowerCase() === description.toLowerCase());
  useEffect(() => {
    if (!expanded) return undefined;
    const controller = new AbortController();
    setDetail((current) => ({ ...current, loading: true, error: "" }));
    const request = mode === "v2" ? monitorApi.models({ range, group_id: groupId, platform }, controller.signal) : monitorApi.status(id, controller.signal);
    request.then((data) => { if (!controller.signal.aborted) setDetail({ data, loading: false }); }).catch((error) => { if (!controller.signal.aborted) setDetail((current) => ({ ...current, error: error.message, loading: false })); });
    return () => controller.abort();
  }, [expanded, mode, range, id, groupId, platform, updatedAt, detailVersion]);

  return <>
        <TableRow highlighted={expanded}>
          <TableCell><div className="console-group-identity"><strong title={row.name}>{row.name}</strong>{showDescription && <small title={description}>{description}</small>}<span>{row.platform}{row.group?.is_exclusive ? " · " + localized(locale, "专属", "Private") : ""}{row.group?.subscription_type === "subscription" ? " · SUB" : ""}</span></div></TableCell>
          <TableCell><strong className="console-group-rate">{row.rate == null ? "—" : formatNumber(row.rate, { maximumFractionDigits: 4 }) + "×"}</strong>{row.originalRate != null && row.rate !== row.originalRate && <del className="console-group-original-rate">{row.originalRate}×</del>}</TableCell>
          <TableCell><div className="console-group-state"><Status tone={row.tone} locale={locale} /><ModelTags models={row.models.length ? row.models : mode === "v2" ? visibleModels(detail?.data) : []} locale={locale} loaded={Boolean(detail?.data)} /></div></TableCell>
          <TableCell>{mode === "v2" ? <TtftMetric metrics={row.source.metrics?.ttft} health={row.source.health} locale={locale} formatNumber={formatNumber} /> : <div className="console-group-latency"><strong>{duration(row.latency, formatNumber)}</strong><small>{localized(locale, "主模型最近一次探测", "Latest primary-model probe")}</small></div>}</TableCell>
          {showThroughput && <TableCell><ThroughputMetric tpm={row.source.metrics?.tpm} locale={locale} formatNumber={formatNumber} /></TableCell>}
          <TableCell><MetricRing value={mode === "v2" ? row.cacheRate : row.availability} accessibleLabel={row.name + " · " + labels[showThroughput ? 5 : 4]} label={mode === "v2" ? range : localized(locale, "探测可用率", "Probe uptime")} tone={mode === "v2" ? monitorTone(row.source.health?.cache) : "operational"} /></TableCell>
          <TableCell>{mode === "v2" ? <MetricRing value={row.successRate} accessibleLabel={row.name + " · " + labels[showThroughput ? 6 : 5]} label={range} tone={monitorTone(row.source.health?.error_rate)} /> : <strong className="console-group-ping">{duration(row.ping, formatNumber)}</strong>}</TableCell>
          <TableCell className="console-group-trend-cell"><Trend timeline={row.timeline} mode={mode} coverage={coverage} locale={locale} formatNumber={formatNumber} /></TableCell>
          <TableCell><Button size="sm" aria-expanded={expanded} aria-controls={"monitor-detail-" + row.key} aria-label={row.name + " · " + localized(locale, "模型详情", "Model details")} onClick={() => setExpanded((current) => !current)}>{expanded ? localized(locale, "收起", "Collapse") : localized(locale, "展开", "Expand")}</Button></TableCell>
        </TableRow>
        {expanded && <TableRow><TableCell colSpan={labels.length} id={"monitor-detail-" + row.key}><ModelDetails row={row} detail={detail} mode={mode} showThroughput={showThroughput} locale={locale} formatNumber={formatNumber} onRetry={() => setDetailVersion((current) => current + 1)} /></TableCell></TableRow>}
  </>;
}

function StatusTable({ rows, mode, showThroughput, range, locale, formatNumber, updatedAt, coverage }) {
  const labels = [localized(locale, "分组", "Group"), localized(locale, "倍率", "Multiplier"), localized(locale, "状态 / 模型", "Status / models"), mode === "v2" ? localized(locale, "平均首字延迟", "Average TTFT") : localized(locale, "最新探测延迟", "Latest probe latency"), ...(showThroughput ? [localized(locale, "每秒 Token", "Tokens/sec")] : []), mode === "v2" ? localized(locale, "缓存率", "Cache rate") : range + " " + localized(locale, "可用率", "uptime"), mode === "v2" ? localized(locale, "成功率", "Success rate") : "Ping", mode === "v2" ? localized(locale, "首字延迟趋势", "TTFT trend") : localized(locale, "最近探测趋势", "Recent probes"), localized(locale, "详情", "Details")];
  return <div className="console-group-table-scroll" tabIndex={0} role="region" aria-label={localized(locale, "分组状态表，可横向滚动", "Group status table, scroll horizontally")}>
    <Table size="sm" borderStyle="solid" className={"console-group-status-table" + (showThroughput ? " has-throughput" : "")} aria-label={localized(locale, "分组状态", "Group status")}>
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
  const title = localized(locale, "用户排行", "User ranking");
  const rows = buildMonitorRankingRows(state.items);
  const percent = (value) => value == null ? "—" : formatNumber(value, { maximumFractionDigits: 1, minimumFractionDigits: 1 }) + "%";
  const labels = [localized(locale, "排名", "Rank"), localized(locale, "用户", "User"), localized(locale, "成功率", "Success rate"), localized(locale, "平均首字延迟", "Average TTFT"), ...(showThroughput ? [localized(locale, "每秒 Token", "Tokens/sec")] : []), localized(locale, "缓存率", "Cache rate"), ...(showThroughput ? ["RPM"] : [])];
  return <Panel className="console-group-status-board console-monitor-ranking" aria-label={title}>
    <header className="console-group-board-header"><div><h2>{title}</h2><p>{range} · {localized(locale, "按请求量排名，展示前 10 名及本人", "Ranked by request volume; top 10 and your position")}</p></div><div className="console-group-updated"><span>{localized(locale, "数据截至", "Data through")} {dateLabel(state.coverage?.data_through, locale)}</span></div></header>
    {state.error && (state.loaded ? <div className="console-ranking-refresh-error" role="status"><span>{localized(locale, "排行刷新失败，保留上次数据。", "Ranking refresh failed. Showing previous data.")}</span><Button size="sm" onClick={onRetry}>{localized(locale, "重试", "Retry")}</Button></div> : <ErrorState message={state.error} onRetry={onRetry} />)}
    {state.loading && !state.loaded ? <div className="console-group-loading" role="status" aria-label={localized(locale, "正在加载用户排行", "Loading user ranking")}><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div> : rows.length ? <div className="console-group-table-scroll" role="region" tabIndex={0} aria-label={localized(locale, "用户排行表，可横向滚动", "User ranking table, scroll horizontally")} aria-busy={state.loading}>
      <Table size="sm" borderStyle="solid" className="console-ranking-table" aria-label={title}>
        <TableHeader><TableRow>{labels.map((label) => <TableHead key={label} scope="col">{label}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{rows.map((row) => {
          const anonymous = /^Other user #(\d+)$/.exec(row.label);
          const name = row.isSelf ? localized(locale, "我", "Me") : anonymous ? localized(locale, "其他用户 #", "Other user #") + anonymous[1] : row.label || localized(locale, "匿名用户", "Anonymous user");
          return <TableRow key={row.key} className={row.isSelf ? "console-ranking-self" : undefined}>
            <TableCell>{row.rank > 0 ? <Badge size="sm" variant={row.rank === 1 ? "warning" : row.rank === 2 ? "info" : "soft"}>#{row.rank}</Badge> : <small className="console-group-muted">{localized(locale, "未上榜", "Unranked")}</small>}</TableCell>
            <TableCell><div className="console-ranking-user"><strong>{name}</strong>{row.isSelf && <Badge size="xs" variant="info">{localized(locale, "当前用户", "You")}</Badge>}</div></TableCell>
            <TableCell><strong className="console-ranking-value">{percent(row.successRate)}</strong></TableCell>
            <TableCell><TtftMetric metrics={row.metrics.ttft} showRating={false} locale={locale} formatNumber={formatNumber} /></TableCell>
            {showThroughput && <TableCell><ThroughputMetric tpm={row.metrics.tpm} locale={locale} formatNumber={formatNumber} /></TableCell>}
            <TableCell><strong className="console-ranking-value">{percent(row.cacheRate)}</strong></TableCell>
            {showThroughput && <TableCell><strong className="console-ranking-value">{metricNumber(row.metrics.rpm) == null ? "—" : formatNumber(row.metrics.rpm, { maximumFractionDigits: 1 })}</strong></TableCell>}
          </TableRow>;
        })}</TableBody>
      </Table>
    </div> : !state.error && <EmptyState description={localized(locale, "当前窗口暂无用户排行", "No user ranking for this time window")} />}
    <footer className="console-group-footer"><span>{localized(locale, "其他用户匿名展示，本人单独标记。", "Other users are anonymous; your entry is highlighted.")}</span><span>{localized(locale, "— 表示暂无数据；未上榜表示当前窗口无请求。", "— indicates no data; unranked means no requests in this window.")}</span></footer>
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
      if (groups.status === "rejected" || rates.status === "rejected") notices.push(localized(locale, "部分分组倍率暂时无法获取。", "Some group multipliers could not be loaded."));
      if (detailFailed) notices.push(localized(locale, "部分窗口可用率加载失败，已显示为 —。", "Some uptime values could not be loaded and are shown as —."));
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
  const sortOptions = [{ value: "status", label: localized(locale, "状态", "Status") }, { value: "rate", label: localized(locale, "倍率 ↑", "Multiplier ↑") }, { value: "latency", label: mode === "v2" ? localized(locale, "平均首字延迟 ↑", "Average TTFT ↑") : localized(locale, "延迟 ↑", "Latency ↑") }, ...(mode === "v2" ? [{ value: "cacheRate", label: localized(locale, "缓存率 ↓", "Cache rate ↓") }, { value: "successRate", label: localized(locale, "成功率 ↓", "Success rate ↓") }] : [{ value: "availability", label: localized(locale, "可用率 ↓", "Uptime ↓") }])];
  const visible = sortMonitorRows(rows.filter((row) => (filter === "all" || row.tone === filter) && (!query || [row.name, row.platform, row.description, ...row.models.map((model) => model.model)].join(" ").toLowerCase().includes(query))), sortOptions.some((option) => option.value === sort) ? sort : "status");

  const scope = mode === "v2" ? localized(locale, "分组 / 平台", "Groups / platforms") : localized(locale, "监控线路", "Monitored endpoints");
  const noData = !rows.length;
  const statusText = settingsLoading || (state.loading && noData) ? localized(locale, "加载中", "Loading") : state.error ? localized(locale, "刷新失败", "Refresh failed") : noData ? localized(locale, "暂无监控数据", "No monitoring data") : refresh.auto ? localized(locale, "自动刷新中", "Auto refresh on") : localized(locale, "已暂停刷新", "Refresh paused");
  const refreshStatus = state.error ? "failed" : noData || !refresh.auto ? "inactive" : "active";
  return <Page title={t("monitor.title")} className="console-monitor-page console-group-status-page">
    <Panel className="console-group-status-board">
      <header className="console-group-board-header"><div><StatusBadge size="sm" status={settingsError ? "failed" : refreshStatus} label={settingsError ? localized(locale, "配置加载失败", "Settings unavailable") : statusText} /><p>{mode === "v2" ? localized(locale, "基于实际请求，对比分组的平均首字延迟、缓存率与成功率。", "Compare groups by average first-token latency, cache rate and success rate.") : localized(locale, "查看各线路的主动探测状态、延迟与历史可用率。", "View endpoint probe status, latency and historical uptime.")}</p></div><div className="console-group-updated"><span>{mode === "v2" ? localized(locale, "数据截至", "Data through") : localized(locale, "更新", "Updated")} {dateLabel(mode === "v2" ? state.coverage?.data_through : state.updatedAt, locale)}</span><Button icon="refresh" loading={state.loading || settingsLoading} onClick={() => load()}>{t("common.refresh")}</Button></div></header>
      <div className="console-group-summary"><div className="console-group-summary-ring"><MetricRing value={noData ? null : counts.operational / rows.length * 100} label={mode === "v2" ? localized(locale, "健康分组占比", "Healthy group share") : localized(locale, "正常占比", "Healthy share")} /></div><div className="console-group-summary-total"><small>{scope}</small><strong>{noData && state.loading ? "—" : rows.length}</strong></div><div className="console-monitor-tone" data-tone="operational"><small>{localized(locale, "正常", "Healthy")}</small><strong>{counts.operational}</strong></div><div className="console-monitor-tone" data-tone={counts.failed ? "failed" : counts.degraded ? "degraded" : "unknown"}><small>{localized(locale, "警告 / 异常", "Warning / incident")}</small><strong>{counts.degraded + counts.failed}</strong></div><div className="console-monitor-tone" data-tone="unknown"><small>{localized(locale, "未知", "Unknown")}</small><strong>{counts.unknown}</strong></div><div className="console-group-status-legend">{Object.keys(counts).map((tone) => <span key={tone} style={{ color: toneColor[tone] }}><i />{toneLabel(tone, locale)}</span>)}</div></div>
      <div className="console-group-toolbar">
        <div className="console-group-toolbar-line"><span>{mode === "v2" ? localized(locale, "时间窗口", "Time range") : localized(locale, "可用率窗口", "Uptime window")}</span><CompactTabs value={range} onChange={setRange} label={localized(locale, "时间窗口", "Time range")} items={MONITOR_RANGES[mode].map((value) => ({ value, label: value }))} /><span>{localized(locale, "排序", "Sort")}</span><SelectInput aria-label={localized(locale, "排序", "Sort")} value={sortOptions.some((option) => option.value === sort) ? sort : "status"} onChange={(event) => setSort(event.target.value)}>{sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectInput><div className="console-group-refresh"><SelectInput aria-label={localized(locale, "自动刷新", "Auto refresh")} value={refresh.auto ? String(refresh.seconds) : "off"} onChange={(event) => setRefresh({ auto: event.target.value !== "off", seconds: Number(event.target.value) || 30 })}><option value="off">{localized(locale, "暂停刷新", "Pause refresh")}</option>{[30, 60, 120].map((value) => <option key={value} value={value}>{value}s {localized(locale, "自动刷新", "auto refresh")}</option>)}</SelectInput></div></div>
        <div className="console-group-toolbar-line"><CompactTabs value={filter} onChange={setFilter} label={localized(locale, "状态筛选", "Status filter")} items={[{ value: "all", label: localized(locale, "全部", "All") + " " + rows.length }, ...Object.keys(counts).map((tone) => ({ value: tone, label: toneLabel(tone, locale) + " " + counts[tone] }))]} /><TextInput aria-label={localized(locale, "搜索分组或平台", "Search groups or platforms")} placeholder={localized(locale, "搜索分组或平台…", "Search groups or platforms…")} value={search} onChange={(event) => setSearch(event.target.value)} /></div>
      </div>
      {settingsError ? <ErrorState message={settingsError} onRetry={retrySettings} /> : state.error && <ErrorState message={state.error} onRetry={() => load()} />}
      {state.notice && <p className="console-group-notice" role="status">{state.notice}</p>}
      {state.coverage?.coverage_complete === false && <p className="console-group-notice">{localized(locale, "历史数据尚未覆盖完整窗口，当前仅展示已汇总的数据。", "History does not cover the full window yet. Only aggregated data is shown.")}</p>}
      {mode === "v2" && <div className="console-group-definitions">
        <p>{localized(locale, "平均首字延迟按所选窗口内的实际样本计算；趋势主线为各区间平均值。P50 / P90 / P95 为分桶上限估算，评级与评分沿用后端分位数口径。", "Average TTFT uses actual samples in the selected window; the primary trend shows each interval’s average. P50 / P90 / P95 are histogram upper-bound estimates; ratings and scores follow backend percentiles.")}</p>
        <p>{localized(locale, "成功率 = 1 − 计分错误率，配置中忽略的错误不计入失败；缓存率按输入侧 Token 计算。", "Success rate = 1 − scored error rate; configured ignored errors do not count as failures. Cache rate is measured over input-side tokens.")}</p>
        <p>{localized(locale, "健康分组占比按分组 / 平台组合计数，并非请求成功率。分组汇总包含未列出的模型流量；详情仅展示当前分组的模型。", "Healthy group share counts group/platform combinations, not requests. Group totals include unlisted model traffic; model details are scoped to each group.")}</p>
      </div>}
      {!settingsError && ((state.loading && noData) || settingsLoading) ? <div className="console-group-loading" role="status" aria-label={t("common.loading")}>{Array.from({ length: 6 }, (_, index) => <Skeleton className="h-20 w-full" key={index} />)}</div> : visible.length ? <StatusTable rows={visible} mode={mode} showThroughput={showThroughput} range={range} locale={locale} formatNumber={formatNumber} updatedAt={state.updatedAt} coverage={state.coverage} /> : !state.error && !settingsError && <EmptyState icon="pulse" description={localized(locale, "暂无符合条件的监控数据。", "No monitoring data matches these filters.")} />}
      {showThroughput && <div className="console-group-definitions"><p>{localized(locale, "每秒 Token：所选窗口内的总吞吐量（TPM ÷ 60，含输入、输出及缓存 Token）。", "Tokens/sec: total throughput in the selected window (TPM ÷ 60, including input, output and cache tokens).")}</p></div>}
      <footer className="console-group-footer"><span>{visible.length} {scope}</span><span>{mode === "v2" ? localized(locale, "— 表示样本不足或暂无数据 · 趋势纵轴按行缩放", "— indicates insufficient samples or no data · Each trend has its own scale") : localized(locale, "可用率来自主动探测 · 趋势为最近最多 60 次探测", "Uptime is based on probes · Trends show up to 60 recent probes")}</span></footer>
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
      if (!controller.signal.aborted) setState((current) => ({ ...current, loading: false, error: error.message || localized(locale, "用户排行加载失败", "Unable to load user ranking") }));
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
    {settingsError ? <ErrorState message={settingsError} onRetry={retrySettings} /> : settingsLoading ? <Skeleton className="h-20 w-full" /> : !enabled ? <EmptyState description={localized(locale, "用户排行暂未开放", "User ranking is not available")} /> : <>
      <Panel className="console-group-status-board"><div className="console-group-toolbar"><div className="console-group-toolbar-line">
        <span>{localized(locale, "时间窗口", "Time range")}</span><CompactTabs value={range} onChange={setRange} label={localized(locale, "时间窗口", "Time range")} items={MONITOR_RANGES.v2.map((value) => ({ value, label: value }))} />
        <div className="console-group-refresh"><SelectInput aria-label={localized(locale, "自动刷新", "Auto refresh")} value={refresh.auto ? String(refresh.seconds) : "off"} onChange={(event) => setRefresh({ auto: event.target.value !== "off", seconds: Number(event.target.value) || 30 })}><option value="off">{localized(locale, "暂停刷新", "Pause refresh")}</option>{[30, 60, 120].map((value) => <option key={value} value={value}>{value}s {localized(locale, "自动刷新", "auto refresh")}</option>)}</SelectInput></div>
        <Button icon="refresh" loading={state.loading} onClick={() => load()}>{t("common.refresh")}</Button>
      </div></div></Panel>
      <UserRanking state={state.context === range ? state : { items: [], loading: true, loaded: false }} range={range} showThroughput={settings?.channel_monitor_hide_throughput !== true} locale={locale} formatNumber={formatNumber} onRetry={() => load()} />
    </>}
  </Page>;
}
