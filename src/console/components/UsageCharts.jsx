import { useMemo, useState } from "react";
import { Badge } from "@appica/ui-react/badge";
import { Sparkline } from "@appica/ui-react/sparkline";
import { SparklineChart } from "@appica/ui-react/sparkline";
import { Panel, Skeleton } from "../UI";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { formatTokenMillions } from "../utils";
import { CompactTabs } from "./ConsoleControls";

const colors = [1, 2, 3, 4, 5, 6, 7, 8].map((index) => `var(--console-chart-${index})`);

function ChartEmptyState({ label }) {
  const { t } = useLocale();
  return <div className="flex min-h-0 flex-1 items-center justify-center p-5" role="status"><Badge variant="soft" size="lg"><Icon name="info" data-icon="start" />{label || t("common.noData")}</Badge></div>;
}

function Donut({ values, labels, valueLabels, ariaLabel, centerValue, centerLabel, highlightedIndex, selectedIndex, onHighlightIndexChange, onSelectIndex }) {
  const [active, setActive] = useState(null);
  const total = Math.max(values.reduce((sum, value) => sum + value, 0), 1);
  let offset = 0;

  function showSegment(event, index) {
    const bounds = event.currentTarget.ownerSVGElement.getBoundingClientRect();
    const keyboard = event.type === "focus";
    const x = keyboard ? bounds.width / 2 : Math.min(Math.max(event.clientX - bounds.left, 18), bounds.width - 18);
    const y = keyboard ? bounds.height / 2 : event.clientY - bounds.top;
    const label = labels[index] || "—";
    setActive({ index, label: valueLabels?.[index] ? `${label} · ${valueLabels[index]}` : label, x, y, placement: keyboard ? "center" : y < bounds.height / 2 ? "below" : "above" });
    onHighlightIndexChange?.(index);
  }

  function hideSegment(event) {
    if (event.type === "blur" || event.currentTarget !== document.activeElement) {
      setActive(null);
      onHighlightIndexChange?.(null);
    }
  }

  return <div className="console-donut-wrap"><svg className="console-donut" viewBox="0 0 42 42" role="group" aria-label={ariaLabel}><circle cx="21" cy="21" r="15.915" fill="none" style={{ stroke: "var(--console-line)" }} strokeWidth="6" />{values.map((value, index) => { const percent = value / total * 100; const dashOffset = 25 - offset; const label = labels[index] || "—"; const valueLabel = valueLabels?.[index]; offset += percent; return <g key={`${label}-${index}`}><circle className={`console-donut-segment${highlightedIndex === index ? " is-active" : ""}${selectedIndex === index ? " is-selected" : ""}`} cx="21" cy="21" r="15.915" fill="none" style={{ stroke: colors[index % colors.length] }} strokeWidth="6" strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={dashOffset} /><circle className="console-donut-hit" cx="21" cy="21" r="15.915" fill="none" strokeWidth="10" strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={dashOffset} role="button" tabIndex="0" aria-label={valueLabel ? `${label}: ${valueLabel}` : label} aria-pressed={selectedIndex === index} onPointerEnter={(event) => showSegment(event, index)} onPointerLeave={hideSegment} onFocus={(event) => showSegment(event, index)} onBlur={hideSegment} onClick={() => onSelectIndex?.(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectIndex?.(index); } }} /></g>; })}<circle className="console-donut-center" cx="21" cy="21" r="10.7" /></svg>{centerValue && <span className="console-donut-center-copy" aria-hidden="true"><strong>{centerValue}</strong><small>{centerLabel}</small></span>}{active && <span className={`console-donut-tooltip is-${active.placement}`} role="tooltip" style={{ left: active.x, top: active.y }}>{active.label}</span>}</div>;
}

function chartValue(row, metric) {
  return Number(metric === "tokens" ? row.total_tokens : row.actual_cost) || 0;
}

function DistributionLoading() {
  return <div className="console-distribution-body console-distribution-skeleton" aria-hidden="true"><Skeleton className="console-distribution-skeleton-chart" /><div className="console-distribution-table">{Array.from({ length: 6 }, (_, row) => <div className={row === 0 ? "is-head" : ""} key={row}>{Array.from({ length: 4 }, (_, column) => <span key={column}><Skeleton /></span>)}</div>)}</div></div>;
}

export function DistributionChart({ title, rangeLabel, data = [], nameKey, loading, emptyLabel, limit = 8, showMetricTabs = true, actualOnly = false, itemLabel, tokenLabel = "Token (M)", className = "", centerValue, centerLabel }) {
  const { locale, formatNumber, formatCurrency } = useLocale();
  const [metric, setMetric] = useState("tokens");
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const rows = data.slice(0, limit);
  const values = rows.map((row) => chartValue(row, metric));
  const valueLabels = rows.map((row) => metric === "tokens" ? formatTokenMillions(row.total_tokens) : formatCurrency(row.actual_cost));
  const resolvedCenterValue = centerValue || (metric === "tokens" ? formatTokenMillions(values.reduce((sum, value) => sum + value, 0)) : formatCurrency(values.reduce((sum, value) => sum + value, 0)));
  const resolvedCenterLabel = centerLabel || (metric === "tokens" ? (locale === "zh" ? "Token" : "Tokens") : (locale === "zh" ? "实际费用" : "Actual cost"));
  const highlightedIndex = hoveredIndex ?? selectedIndex;
  const toggleSelectedIndex = (index) => setSelectedIndex((current) => current === index ? null : index);
  const handleRowKeyDown = (event, index) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleSelectedIndex(index); } };
  return <Panel title={title} eyebrow={rangeLabel} actions={showMetricTabs && <CompactTabs value={metric} onChange={setMetric} items={[{ value: "tokens", label: locale === "zh" ? "Token" : "Tokens" }, { value: "actual_cost", label: locale === "zh" ? "实际费用" : "Actual cost" }]} />} className={`console-distribution ${className}`.trim()}>{loading ? <DistributionLoading /> : !rows.length ? <ChartEmptyState label={emptyLabel} /> : <div className="console-distribution-body"><Donut values={values} labels={rows.map((row) => row[nameKey])} valueLabels={valueLabels} ariaLabel={title} centerValue={resolvedCenterValue} centerLabel={resolvedCenterLabel} highlightedIndex={highlightedIndex} selectedIndex={selectedIndex} onHighlightIndexChange={setHoveredIndex} onSelectIndex={toggleSelectedIndex} /><div className="console-distribution-table" role="grid" aria-label={title}><div className="is-head" role="row"><span role="columnheader">{itemLabel || (locale === "zh" ? "项目" : "Item")}</span><span role="columnheader">{locale === "zh" ? "请求" : "Requests"}</span><span role="columnheader">{tokenLabel}</span><span role="columnheader">{actualOnly ? (locale === "zh" ? "实际" : "Actual") : (locale === "zh" ? "实际 / 标准" : "Actual / standard")}</span></div>{rows.map((row, index) => <div className={`${highlightedIndex === index ? "is-highlighted" : ""}${selectedIndex === index ? " is-selected" : ""}`.trim()} role="row" tabIndex="0" aria-selected={selectedIndex === index} onPointerEnter={() => setHoveredIndex(index)} onPointerLeave={() => setHoveredIndex(null)} onFocus={() => setHoveredIndex(index)} onBlur={() => setHoveredIndex(null)} onClick={() => toggleSelectedIndex(index)} onKeyDown={(event) => handleRowKeyDown(event, index)} key={`${row[nameKey]}-${index}`}><span role="gridcell"><i style={{ background: colors[index % colors.length] }} /><b title={row[nameKey]}>{row[nameKey] || "—"}</b></span><span role="gridcell">{formatNumber(row.requests)}</span><span role="gridcell">{formatTokenMillions(row.total_tokens)}</span><span role="gridcell"><b>{formatCurrency(row.actual_cost)}</b>{!actualOnly && <small>{formatCurrency(row.cost)}</small>}</span></div>)}</div></div>}</Panel>;
}

function TrendLoading({ showLegend = true }) {
  return <div className="console-trend-body console-trend-skeleton" aria-hidden="true"><div className="console-trend-plot"><Skeleton /></div><div className="console-trend-x-axis"><i /><div className="console-chart-labels">{Array.from({ length: 7 }, (_, index) => <Skeleton key={index} />)}</div></div>{showLegend && <div className="console-chart-legend">{Array.from({ length: 5 }, (_, index) => <span key={index}><Skeleton /> <Skeleton /></span>)}</div>}</div>;
}

function TokenColumnChart({ rows, ticks, title, locale }) {
  const values = rows.map((row) => row._total_tokens);
  const labels = rows.map((row) => chartDateLabel(row.date, locale));
  return <div className="console-token-column-plot"><svg className="console-token-column-grid" viewBox="0 0 680 220" preserveAspectRatio="none" aria-hidden="true">{ticks.map((tick, index) => <line key={tick} x1="0" y1={6 + index * 46} x2="680" y2={6 + index * 46} />)}</svg><Sparkline data={values} labels={labels} color="var(--console-chart-1)" className="console-token-column-chart"><SparklineChart variant="column" height={220} tooltip className="console-token-column-chart-plot" aria-label={title} renderTooltip={(point) => <div className="console-token-column-tooltip"><strong>{point.label}</strong><span>{formatTokenMillions(point.value)} {locale === "zh" ? "Token" : "tokens"}</span></div>} /></Sparkline></div>;
}

function linePoints(data, key, width, height, max) {
  const step = data.length > 1 ? width / (data.length - 1) : width;
  return data.map((row, index) => `${index * step},${height - (Number(row[key]) || 0) / max * (height - 12) - 6}`).join(" ");
}

function smoothLinePath(data, key, width, height, max) {
  if (!data.length) return "";
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const points = data.map((row, index) => ({ x: index * step, y: height - (Number(row[key]) || 0) / max * (height - 12) - 6 }));
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const midpoint = (previous.x + point.x) / 2;
    return `${path} C ${midpoint},${previous.y} ${midpoint},${point.y} ${point.x},${point.y}`;
  }, `M ${points[0].x},${points[0].y}`);
}

function totalTokens(row) {
  if (row.total_tokens != null) return Number(row.total_tokens) || 0;
  return ["input_tokens", "output_tokens", "cache_creation_tokens", "cache_read_tokens"].reduce((sum, key) => sum + (Number(row[key]) || 0), 0);
}

function chartDateLabel(value, locale) {
  const source = String(value || "").slice(0, 10);
  const date = new Date(`${source}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return source;
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "2-digit", timeZone: "UTC" }).format(date);
}

export function UsageTrendChart({ data = [], loading, actions, variant = "breakdown", total, rangeLabel, children }) {
  const { locale } = useLocale();
  const title = locale === "zh" ? "Token 用量" : "Token usage";
  const series = [
    ["input_tokens", locale === "zh" ? "输入" : "Input", "var(--console-chart-2)"], ["output_tokens", locale === "zh" ? "输出" : "Output", "var(--console-chart-1)"],
    ["cache_creation_tokens", locale === "zh" ? "缓存创建" : "Cache creation", "var(--console-chart-4)"], ["cache_read_tokens", locale === "zh" ? "缓存读取" : "Cache read", "var(--console-chart-3)"],
  ];
  const totalRows = useMemo(() => data.map((row) => ({ ...row, _total_tokens: totalTokens(row) })), [data]);
  const maximum = useMemo(() => Math.max(1, ...(variant === "total" ? totalRows.map((row) => row._total_tokens) : data.flatMap((row) => series.map(([key]) => Number(row[key]) || 0)))), [data, totalRows, variant]);
  const ticks = useMemo(() => Array.from({ length: 5 }, (_, index) => maximum * (4 - index) / 4), [maximum]);
  const hitRates = useMemo(() => data.map((row) => {
    const read = Number(row.cache_read_tokens) || 0;
    const input = Number(row.input_tokens) || 0;
    return { ...row, cache_hit_rate: read + input ? read / (read + input) * 100 : 0 };
  }), [data]);
  const totalValue = formatTokenMillions(total ?? totalRows.reduce((sum, row) => sum + row._total_tokens, 0));
  const headerActions = variant === "total" ? <div className="console-trend-actions"><div className="console-trend-total"><span>{locale === "zh" ? "总 Token" : "Total tokens"}</span><strong>{totalValue}</strong></div>{actions}</div> : actions;
  const trendClassName = `console-trend${variant === "total" ? ` console-trend--total${children ? " console-trend--heatmap" : ""}` : ""}`;
  if (loading) return <Panel title={title} eyebrow={rangeLabel} actions={headerActions} className={trendClassName}><TrendLoading showLegend={variant !== "total"} /></Panel>;
  const visibleLabelIndexes = data.length > 7
    ? new Set(Array.from({ length: 7 }, (_, index) => Math.round(index * (data.length - 1) / 6)))
    : new Set(data.map((_, index) => index));
  if (variant === "total") return <Panel title={title} eyebrow={rangeLabel} actions={headerActions} className={trendClassName}>{children || (!data.length ? <ChartEmptyState /> : <div className="console-trend-body"><div className="console-trend-plot"><div className="console-trend-y-axis" aria-hidden="true"><strong>Token (M)</strong><div>{ticks.map((tick) => <span key={tick}>{formatTokenMillions(tick).slice(0, -1)}</span>)}</div></div><TokenColumnChart rows={totalRows} ticks={ticks} title={title} locale={locale} /></div><div className="console-trend-x-axis"><i aria-hidden="true" /><div className="console-chart-labels">{data.map((row, index) => <span className={visibleLabelIndexes.has(index) ? "" : "is-hidden"} key={`${row.date}-${index}`}>{chartDateLabel(row.date, locale)}</span>)}</div></div><table className="console-visually-hidden"><caption>{title}</caption><thead><tr><th scope="col">{locale === "zh" ? "日期" : "Date"}</th><th scope="col">Token</th></tr></thead><tbody>{totalRows.map((row, index) => <tr key={`${row.date}-accessible-${index}`}><th scope="row">{String(row.date || "")}</th><td>{formatTokenMillions(row._total_tokens)}</td></tr>)}</tbody></table></div>)}</Panel>;
  const points = variant === "total" ? linePoints(totalRows, "_total_tokens", 680, 196, maximum) : "";
  const path = variant === "total" ? smoothLinePath(totalRows, "_total_tokens", 680, 196, maximum) : "";
  return <Panel title={title} eyebrow={rangeLabel} actions={headerActions} className={trendClassName}>{!data.length ? <ChartEmptyState /> : <div className="console-trend-body"><div className="console-trend-plot"><div className="console-trend-y-axis" aria-hidden="true"><strong>Token (M)</strong><div>{ticks.map((tick) => <span key={tick}>{formatTokenMillions(tick).slice(0, -1)}</span>)}</div></div><svg viewBox="0 0 680 220" preserveAspectRatio="none" aria-hidden="true">{variant === "total" && <defs><linearGradient id="console-token-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--console-chart-1)" stopOpacity=".38" /><stop offset="1" stopColor="var(--console-chart-1)" stopOpacity=".02" /></linearGradient></defs>}{ticks.map((tick, index) => <line key={tick} x1="0" y1={6 + index * 46} x2="680" y2={6 + index * 46} />)}{variant === "total" ? <><polygon className="console-trend-area" points={`0,202 ${points} 680,202`} /><path className="console-trend-total-line" d={path} /></> : <>{series.map(([key,, color]) => <polyline key={key} points={linePoints(data, key, 680, 196, maximum)} style={{ stroke: color }} />)}<polyline className="is-rate" points={linePoints(hitRates, "cache_hit_rate", 680, 196, 100)} /></>}</svg></div><div className="console-trend-x-axis"><i aria-hidden="true" /><div className="console-chart-labels">{data.map((row, index) => <span className={visibleLabelIndexes.has(index) ? "" : "is-hidden"} key={`${row.date}-${index}`}>{chartDateLabel(row.date, locale)}</span>)}</div></div>{variant !== "total" && <div className="console-chart-legend">{series.map(([key, label, color]) => <span key={key}><i style={{ background: color }} />{label}</span>)}<span><i className="is-rate" />{locale === "zh" ? "缓存命中率" : "Cache hit rate"}</span></div>}<table className="console-visually-hidden"><caption>{title}</caption><thead><tr><th scope="col">{locale === "zh" ? "日期" : "Date"}</th>{variant === "total" ? <th scope="col">Token</th> : <>{series.map(([key, label]) => <th scope="col" key={key}>{label}</th>)}<th scope="col">{locale === "zh" ? "缓存命中率" : "Cache hit rate"}</th></>}</tr></thead><tbody>{(variant === "total" ? totalRows : hitRates).map((row, index) => <tr key={`${row.date}-accessible-${index}`}><th scope="row">{String(row.date || "")}</th>{variant === "total" ? <td>{formatTokenMillions(row._total_tokens)}</td> : <>{series.map(([key]) => <td key={key}>{formatTokenMillions(row[key])}</td>)}<td>{row.cache_hit_rate.toFixed(2)}%</td></>}</tr>)}</tbody></table></div>}</Panel>;
}
