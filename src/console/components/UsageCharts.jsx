import { useMemo, useState } from "react";
import { EmptyState, Spinner } from "../UI";
import { useLocale } from "../i18n";
import { CompactTabs } from "./ConsoleControls";

const colors = ["#3b82a5", "#43a58f", "#7a79c8", "#d39046", "#ce6f7d", "#5da3b3", "#97a74d", "#a46cac"];

function Donut({ values }) {
  const total = Math.max(values.reduce((sum, value) => sum + value, 0), 1);
  let offset = 0;
  return <svg className="console-donut" viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="15.915" fill="none" stroke="rgba(111,151,177,.13)" strokeWidth="6" />{values.map((value, index) => { const percent = value / total * 100; const segment = <circle key={index} cx="21" cy="21" r="15.915" fill="none" stroke={colors[index % colors.length]} strokeWidth="6" strokeDasharray={`${percent} ${100 - percent}`} strokeDashoffset={25 - offset} />; offset += percent; return segment; })}<circle cx="21" cy="21" r="10.7" fill="rgba(251,254,255,.94)" /></svg>;
}

function chartValue(row, metric) {
  return Number(metric === "tokens" ? row.total_tokens : row.actual_cost) || 0;
}

export function DistributionChart({ title, data = [], nameKey, loading, emptyLabel }) {
  const { locale, formatNumber, formatCurrency } = useLocale();
  const [metric, setMetric] = useState("tokens");
  const rows = data.slice(0, 8);
  const values = rows.map((row) => chartValue(row, metric));
  return <section className="console-panel console-distribution"><div className="console-panel-head"><div><h2>{title}</h2></div><CompactTabs value={metric} onChange={setMetric} items={[{ value: "tokens", label: locale === "zh" ? "Token" : "Tokens" }, { value: "actual_cost", label: locale === "zh" ? "实际费用" : "Actual cost" }]} /></div>{loading ? <Spinner /> : !rows.length ? <EmptyState description={emptyLabel} /> : <div className="console-distribution-body"><Donut values={values} /><div className="console-distribution-table"><div className="is-head"><span>{locale === "zh" ? "项目" : "Item"}</span><span>{locale === "zh" ? "请求" : "Requests"}</span><span>Token</span><span>{locale === "zh" ? "实际 / 标准" : "Actual / standard"}</span></div>{rows.map((row, index) => <div key={`${row[nameKey]}-${index}`}><span><i style={{ background: colors[index % colors.length] }} /><b title={row[nameKey]}>{row[nameKey] || "—"}</b></span><span>{formatNumber(row.requests)}</span><span>{formatNumber(row.total_tokens)}</span><span><b>{formatCurrency(row.actual_cost)}</b><small>{formatCurrency(row.cost)}</small></span></div>)}</div></div>}</section>;
}

function linePoints(data, key, width, height, max) {
  const step = data.length > 1 ? width / (data.length - 1) : width;
  return data.map((row, index) => `${index * step},${height - (Number(row[key]) || 0) / max * (height - 12) - 6}`).join(" ");
}

export function UsageTrendChart({ data = [], loading }) {
  const { locale } = useLocale();
  const series = [
    ["input_tokens", locale === "zh" ? "输入" : "Input", "#3b82a5"], ["output_tokens", locale === "zh" ? "输出" : "Output", "#43a58f"],
    ["cache_creation_tokens", locale === "zh" ? "缓存创建" : "Cache creation", "#d39046"], ["cache_read_tokens", locale === "zh" ? "缓存读取" : "Cache read", "#7a79c8"],
  ];
  const maximum = useMemo(() => Math.max(1, ...data.flatMap((row) => series.map(([key]) => Number(row[key]) || 0))), [data]);
  const hitRates = useMemo(() => data.map((row) => {
    const read = Number(row.cache_read_tokens) || 0;
    const input = Number(row.input_tokens) || 0;
    return { ...row, cache_hit_rate: read + input ? read / (read + input) * 100 : 0 };
  }), [data]);
  if (loading) return <section className="console-panel console-trend"><Spinner /></section>;
  return <section className="console-panel console-trend"><div className="console-panel-head"><div><h2>{locale === "zh" ? "Token 用量趋势" : "Token usage trend"}</h2></div></div>{!data.length ? <EmptyState /> : <div className="console-trend-body"><svg viewBox="0 0 680 220" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="202" x2="680" y2="202" />{series.map(([key,, color]) => <polyline key={key} points={linePoints(data, key, 680, 196, maximum)} stroke={color} />)}<polyline className="is-rate" points={linePoints(hitRates, "cache_hit_rate", 680, 196, 100)} stroke="#c06b92" /></svg><div className="console-chart-labels">{data.map((row, index) => <span key={`${row.date}-${index}`}>{String(row.date || "").slice(5, 16)}</span>)}</div><div className="console-chart-legend">{series.map(([key, label, color]) => <span key={key}><i style={{ background: color }} />{label}</span>)}<span><i className="is-rate" />{locale === "zh" ? "缓存命中率" : "Cache hit rate"}</span></div></div>}</section>;
}
