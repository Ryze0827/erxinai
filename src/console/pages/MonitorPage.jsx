import { useCallback, useEffect, useRef, useState } from "react";
import { Table as AppicaTable } from "@appica/ui-react/table";
import { TableBody as AppicaTableBody } from "@appica/ui-react/table";
import { TableCell as AppicaTableCell } from "@appica/ui-react/table";
import { TableHead as AppicaTableHead } from "@appica/ui-react/table";
import { TableHeader as AppicaTableHeader } from "@appica/ui-react/table";
import { TableRow as AppicaTableRow } from "@appica/ui-react/table";
import { monitorApi } from "../../api";
import { PlatformMark } from "../GroupBadge";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, EmptyState, ErrorState, IconButton, Modal, Page, Panel, SelectInput, StatusBadge, TextInput } from "../UI";
import { CompactTabs } from "../components/ConsoleControls";
import { statusLabel } from "../utils";

const MONITOR_REFRESH_KEY = "sentence_monitor_refresh";
const MONITOR_WINDOWS = [7, 15, 30, 90];
const MONITOR_FILTERS = ["all", "operational", "degraded", "failed"];
const MONITOR_LATENCY_DANGER_MS = 5000;

function storedRefresh() {
  try {
    const value = JSON.parse(localStorage.getItem(MONITOR_REFRESH_KEY));
    return { auto: value?.auto !== false, seconds: [30, 60, 120].includes(value?.seconds) ? value.seconds : 30 };
  } catch {
    return { auto: true, seconds: 30 };
  }
}

function monitorTone(status) {
  const value = String(status || "unknown").toLowerCase();
  if (["operational", "success", "active", "completed"].includes(value)) return "operational";
  if (["degraded", "warning", "pending", "running"].includes(value)) return "degraded";
  if (["failed", "error", "inactive", "suspended"].includes(value)) return "failed";
  return "unknown";
}

function metricDuration(value, formatNumber) {
  const milliseconds = Number(value);
  return milliseconds > 0 ? `${formatNumber(milliseconds, { maximumFractionDigits: 0 })} ms` : "—";
}

function monitorStatusLabel(tone, locale) {
  const labels = {
    operational: locale === "zh" ? "正常" : "Healthy",
    degraded: locale === "zh" ? "警告" : "Warning",
    failed: locale === "zh" ? "异常" : "Incident",
    unknown: locale === "zh" ? "未知" : "Unknown",
  };
  return labels[tone];
}

function latestCheck(item) {
  return item.timeline?.at(-1)?.checked_at || item.last_checked_at || item.updated_at;
}

function itemRequests(item) {
  return Number(item.today_requests ?? item.requests_today ?? item.request_count_today) || 0;
}

function itemPing(item) {
  return item.primary_ping_latency_ms ?? item.primary_ping_ms ?? item.ping_latency_ms ?? item.ping_ms;
}

function Sparkline({ timeline = [], days, locale, compact = false }) {
  const recent = timeline.slice(-48);
  const counts = recent.reduce((result, point) => {
    result[monitorTone(point.status)] += 1;
    return result;
  }, { operational: 0, degraded: 0, failed: 0, unknown: 0 });
  const label = locale === "zh"
    ? `${days} 天状态历史：正常 ${counts.operational}，警告 ${counts.degraded}，异常 ${counts.failed}，未知 ${counts.unknown}`
    : `${days}-day status history: ${counts.operational} healthy, ${counts.degraded} warning, ${counts.failed} incident, ${counts.unknown} unknown`;
  return (
    <div className={`console-monitor-timeline ${compact ? "is-compact" : ""}`} role="img" aria-label={label}>
      <div className="console-uptime-line" aria-hidden="true">
        {recent.map((point, index) => <i key={`${point.checked_at}-${index}`} className={`is-${monitorTone(point.status)}`} />)}
      </div>
      {!compact && <div><span>{locale === "zh" ? `${days} 天前` : `${days}d ago`}</span><span>{recent.length} {locale === "zh" ? "个数据点" : "data points"}</span><span>{locale === "zh" ? "现在" : "Now"}</span></div>}
    </div>
  );
}

function countByStatus(items) {
  return items.reduce((counts, item) => {
    const tone = monitorTone(item.primary_status);
    counts[tone] = (counts[tone] || 0) + 1;
    return counts;
  }, { operational: 0, degraded: 0, failed: 0, unknown: 0 });
}

function average(values) {
  const filtered = values.filter((value) => Number.isFinite(value) && value > 0);
  return filtered.length ? filtered.reduce((sum, value) => sum + value, 0) / filtered.length : 0;
}

function windowAvailability(item, days, details) {
  if (days === 7) return item.availability_7d;
  const model = details[item.id]?.models?.find((entry) => entry.model === item.primary_model);
  return model?.[`availability_${days}d`] ?? item[`availability_${days}d`] ?? item.availability_7d;
}

function MonitorToolbar({ windowDays, setWindowDays, filter, setFilter, counts, refresh, setRefresh, loading, onRefresh, search, setSearch, locale }) {
  const filterLabels = {
    all: locale === "zh" ? "全部" : "All",
    operational: locale === "zh" ? "正常" : "Healthy",
    degraded: locale === "zh" ? "警告" : "Warning",
    failed: locale === "zh" ? "异常" : "Incident",
  };
  const refreshValue = refresh.auto ? String(refresh.seconds) : "off";
  const windowTabs = MONITOR_WINDOWS.map((days) => ({ value: String(days), label: `${days} ${locale === "zh" ? "天" : "days"}` }));
  const statusTabs = MONITOR_FILTERS.map((value) => ({ value, label: <><i className={`is-${value}`} />{filterLabels[value]} <b>{value === "all" ? counts.total : counts[value]}</b></> }));
  const updateRefresh = (event) => {
    const seconds = Number(event.target.value);
    setRefresh({ auto: seconds > 0, seconds: seconds || 60 });
  };

  return (
    <section className="console-monitor-toolbar" aria-label={locale === "zh" ? "渠道筛选" : "Channel filters"}>
      <div className="console-monitor-toolbar-main">
        <CompactTabs value={String(windowDays)} items={windowTabs} label={locale === "zh" ? "时间窗口" : "Time window"} className="console-monitor-window-tabs" onChange={(value) => setWindowDays(Number(value))} />
        <i className="console-monitor-toolbar-divider" />
        <CompactTabs value={filter} items={statusTabs} label={locale === "zh" ? "渠道状态" : "Channel status"} className="console-monitor-status-tabs" onChange={setFilter} />
      </div>
      <div className="console-monitor-refresh-actions">
        <label className="console-monitor-search"><Icon name="search" size={17} /><TextInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder={locale === "zh" ? "搜索渠道" : "Search channels"} /></label>
        <label className={`console-monitor-auto-refresh ${refresh.auto ? "is-active" : ""}`}>
          <Icon name="refresh" size={17} />
          <span>{locale === "zh" ? "自动刷新" : "Auto refresh"}</span>
          <SelectInput aria-label={locale === "zh" ? "自动刷新间隔" : "Auto refresh interval"} value={refreshValue} onChange={updateRefresh}>
            <option value="off">{locale === "zh" ? "已暂停" : "Paused"}</option>
            <option value="30">30s</option>
            <option value="60">60s</option>
            <option value="120">120s</option>
          </SelectInput>
        </label>
        <Button className={`console-monitor-manual-refresh ${loading ? "is-loading" : ""}`} icon="refresh" onClick={() => onRefresh()} disabled={loading}>{locale === "zh" ? "刷新" : "Refresh"}</Button>
      </div>
    </section>
  );
}

function MonitorOverview({ items, counts, windowDays, details, locale, formatNumber }) {
  const availability = average(items.map((item) => Number(windowAvailability(item, windowDays, details))));
  const latency = average(items.map((item) => Number(item.primary_latency_ms)));
  const requests = items.reduce((sum, item) => sum + itemRequests(item), 0);
  const metrics = [
    { icon: "channel", label: locale === "zh" ? "渠道总数" : "Total channels", value: formatNumber(items.length), meta: locale === "zh" ? "实时监控中" : "Monitored live", tone: "neutral" },
    { icon: "shield", label: locale === "zh" ? "可用渠道" : "Available", value: formatNumber(counts.operational), meta: `${counts.degraded} ${locale === "zh" ? "警告" : "warning"}`, tone: "success" },
    { icon: "chart", label: locale === "zh" ? "平均可用率" : "Avg. availability", value: `${availability.toFixed(2)}%`, meta: `${windowDays}${locale === "zh" ? " 天窗口" : "d window"}`, tone: "success" },
    { icon: "pulse", label: locale === "zh" ? "平均延迟" : "Avg. latency", value: metricDuration(latency, formatNumber), meta: locale === "zh" ? "全渠道均值" : "Across all channels", tone: latency > MONITOR_LATENCY_DANGER_MS ? "danger" : "success" },
    { icon: "chart", label: locale === "zh" ? "今日请求数" : "Requests today", value: formatNumber(requests), meta: locale === "zh" ? "今日累计" : "Cumulative today", tone: "success" },
  ];

  return <section className="console-monitor-overview">{metrics.map((metric) => <div className={`console-monitor-overview-item is-${metric.tone}`} key={metric.label}><i><Icon name={metric.icon} size={22} /></i><div><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.meta}</small></div></div>)}</section>;
}

function MonitorListItem({ item, selected, windowDays, details, locale, formatNumber, onSelect }) {
  const tone = monitorTone(item.primary_status);
  const availability = Number(windowAvailability(item, windowDays, details)) || 0;
  const provider = item.provider || item.group_name || "AI";
  return <Button variant="ghost" className={`console-monitor-list-item is-${tone} ${selected ? "is-selected" : ""}`} onClick={() => onSelect(item)}><i className="console-monitor-provider-mark"><PlatformMark platform={provider} /></i><span className="console-monitor-list-identity"><strong>{item.name}</strong><small>{provider} <b>•</b> {item.primary_model || item.group_name || "—"}</small></span><span className="console-monitor-list-status"><b><i />{monitorStatusLabel(tone, locale)}</b><strong>{metricDuration(item.primary_latency_ms, formatNumber)}</strong></span><span className="console-monitor-list-window"><strong>{availability.toFixed(2)}%</strong><Sparkline timeline={item.timeline} days={windowDays} locale={locale} compact /></span></Button>;
}

function availabilityValue(item, days) {
  const value = Number(item?.[`availability_${days}d`]);
  return Number.isFinite(value) ? `${value.toFixed(2)}%` : "—";
}

function MonitorInspector({ item, detail, windowDays, locale, formatNumber, formatDate, onOpenModal }) {
  if (!item) return <Panel className="console-monitor-inspector"><EmptyState icon="channel" /></Panel>;
  const resolved = detail?.item || item;
  const tone = monitorTone(resolved.primary_status || item.primary_status);
  const timeline = resolved.timeline || item.timeline || [];
  const models = resolved.models || [];
  const provider = resolved.provider || resolved.group_name || item.provider || "AI";
  const availability = Number(resolved[`availability_${windowDays}d`] ?? resolved.availability_7d ?? item.availability_7d) || 0;
  return <Panel className={`console-monitor-inspector is-${tone}`}><header className="console-monitor-inspector-head"><i className="console-monitor-provider-mark"><PlatformMark platform={provider} /></i><div><h2>{item.name}</h2><p>{provider} <b>•</b> {item.primary_model || item.group_name || "—"}</p></div><StatusBadge status={item.primary_status} label={monitorStatusLabel(tone, locale)} /><span><small>{locale === "zh" ? "检查于" : "Checked"}</small><strong>{latestCheck(item) ? formatDate(latestCheck(item)) : "—"}</strong></span><Button onClick={onOpenModal}>{locale === "zh" ? "完整详情" : "View full details"}<Icon name="external" size={14} /></Button></header><div className="console-monitor-inspector-metrics"><div className={Number(item.primary_latency_ms) > MONITOR_LATENCY_DANGER_MS ? "is-danger" : tone === "degraded" ? "is-warning" : "is-success"}><span>{locale === "zh" ? "延迟" : "Latency"}</span><strong>{metricDuration(item.primary_latency_ms, formatNumber)}</strong>{tone !== "operational" && <small><Icon name="warning" size={13} />{locale === "zh" ? "检测到间歇性延迟" : "Intermittent latency detected"}</small>}</div><div><span>Ping</span><strong>{metricDuration(itemPing(item), formatNumber)}</strong></div><div className="is-success"><span>{windowDays}{locale === "zh" ? " 天可用率" : "-day availability"}</span><strong>{availability.toFixed(2)}%</strong></div></div><div className="console-monitor-history"><header><h3>{locale === "zh" ? "状态历史" : "Status history"} <Icon name="info" size={13} /></h3><div><span className="is-operational">{locale === "zh" ? "正常" : "Healthy"}</span><span className="is-degraded">{locale === "zh" ? "警告" : "Warning"}</span><span className="is-failed">{locale === "zh" ? "异常" : "Incident"}</span><span className="is-unknown">{locale === "zh" ? "未知" : "Unknown"}</span></div></header><Sparkline timeline={timeline} days={windowDays} locale={locale} /></div><div className="console-monitor-availability"><h3>{locale === "zh" ? "分窗口可用率" : "Availability by window"} <Icon name="info" size={13} /></h3><div>{[7, 15, 30].map((days) => <span key={days}><small>{days} {locale === "zh" ? "天" : "days"}</small><strong>{availabilityValue(resolved, days)}</strong></span>)}</div></div><div className="console-monitor-models"><h3>{locale === "zh" ? "模型健康度" : "Model health"} <Icon name="info" size={13} /></h3>{detail?.loading ? <div className="console-loading"><i /><span>{locale === "zh" ? "正在读取详情" : "Loading details"}</span></div> : detail?.error ? <ErrorState message={detail.error} /> : !models.length ? <EmptyState /> : <div className="console-monitor-models-table"><AppicaTable size="sm" borderStyle="none"><AppicaTableHeader><AppicaTableRow><AppicaTableHead>{locale === "zh" ? "模型" : "Model"}</AppicaTableHead><AppicaTableHead>{locale === "zh" ? "最新状态" : "Latest status"}</AppicaTableHead><AppicaTableHead>7d</AppicaTableHead><AppicaTableHead>15d</AppicaTableHead><AppicaTableHead>30d</AppicaTableHead><AppicaTableHead>{locale === "zh" ? "平均延迟" : "Avg latency 7d"}</AppicaTableHead></AppicaTableRow></AppicaTableHeader><AppicaTableBody>{models.map((model) => { const modelTone = monitorTone(model.latest_status); return <AppicaTableRow key={model.model}><AppicaTableCell data-label={locale === "zh" ? "模型" : "Model"}><strong>{model.model}</strong></AppicaTableCell><AppicaTableCell data-label={locale === "zh" ? "最新状态" : "Latest status"}><StatusBadge status={model.latest_status} label={monitorStatusLabel(modelTone, locale)} /></AppicaTableCell><AppicaTableCell data-label="7d">{availabilityValue(model, 7)}</AppicaTableCell><AppicaTableCell data-label="15d">{availabilityValue(model, 15)}</AppicaTableCell><AppicaTableCell data-label="30d">{availabilityValue(model, 30)}</AppicaTableCell><AppicaTableCell data-label={locale === "zh" ? "平均延迟" : "Avg latency 7d"}>{metricDuration(model.avg_latency_7d_ms, formatNumber)}</AppicaTableCell></AppicaTableRow>; })}</AppicaTableBody></AppicaTable></div>}</div></Panel>;
}

function MonitorLoading({ locale }) {
  return <><section className="console-monitor-overview is-loading" aria-label={locale === "zh" ? "正在加载渠道概览" : "Loading channel overview"}>{Array.from({ length: 5 }, (_, index) => <div className="console-monitor-overview-item" key={index}><i /><div><span /><strong /><small /></div></div>)}</section><div className="console-monitor-master-detail is-loading"><Panel className="console-monitor-master"><header /><div>{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div></Panel><Panel className="console-monitor-inspector"><header /><div /></Panel></div></>;
}

function MonitorContent({ state, locale, load, items, counts, windowDays, details, formatNumber, formatDate, selectedId, onSelect, detail, onOpenModal }) {
  if (state.loading) return <MonitorLoading locale={locale} />;
  if (state.error) return <Panel><ErrorState message={state.error} onRetry={load} /></Panel>;
  if (!state.items.length) return <Panel><EmptyState icon="pulse" /></Panel>;
  const selectedItem = items.find((item) => item.id === selectedId) || items[0];
  return <><MonitorOverview items={state.items} counts={counts} windowDays={windowDays} details={details} locale={locale} formatNumber={formatNumber} /><div className="console-monitor-master-detail"><Panel className="console-monitor-master"><header><h2>{locale === "zh" ? "渠道" : "Channels"}</h2><span>{locale === "zh" ? "按状态排序" : "Sort by status"}<Icon name="chevronDown" size={14} /></span></header>{items.length ? <div className="console-monitor-master-list">{items.map((item) => <MonitorListItem key={item.id} item={item} selected={item.id === selectedItem?.id} windowDays={windowDays} details={details} locale={locale} formatNumber={formatNumber} onSelect={onSelect} />)}</div> : <EmptyState icon="filter" description={locale === "zh" ? "当前筛选条件下没有渠道。" : "No channels match this filter."} />}<footer><span>{items.length} {locale === "zh" ? "个渠道" : "channels"}</span><div><IconButton icon="chevronRight" label={locale === "zh" ? "上一页" : "Previous page"} disabled /><b>1</b><IconButton icon="chevronRight" label={locale === "zh" ? "下一页" : "Next page"} disabled /></div></footer></Panel><MonitorInspector item={selectedItem} detail={detail} windowDays={windowDays} locale={locale} formatNumber={formatNumber} formatDate={formatDate} onOpenModal={onOpenModal} /></div></>;
}

function MonitorDetail({ detail, locale, formatNumber, t }) {
  if (detail?.loading) return <div className="console-loading"><i /><span>{t("common.loading")}</span></div>;
  if (detail?.error) return <ErrorState message={detail.error} />;
  return <div className="console-monitor-detail">{(detail?.item?.models || []).map((model) => <div key={model.model}><div><strong>{model.model}</strong><StatusBadge status={model.latest_status} label={statusLabel(model.latest_status, locale)} /></div><div><span>7d <strong>{Number(model.availability_7d || 0).toFixed(2)}%</strong></span><span>15d <strong>{Number(model.availability_15d || 0).toFixed(2)}%</strong></span><span>30d <strong>{Number(model.availability_30d || 0).toFixed(2)}%</strong></span><span>{t("monitor.latency")} <strong>{metricDuration(model.avg_latency_7d_ms, formatNumber)}</strong></span></div></div>)}</div>;
}

export function MonitorPage() {
  const { t, locale, formatDate, formatNumber } = useLocale();
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  const [refresh, setRefresh] = useState(storedRefresh);
  const [detail, setDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [windowDays, setWindowDays] = useState(7);
  const [filter, setFilter] = useState("all");
  const [details, setDetails] = useState({});
  const requestRef = useRef(null);
  const loadingRef = useRef(false);
  const detailRef = useRef(null);
  const detailsRef = useRef(null);
  const load = useCallback(async (silent = false) => {
    if (silent && (document.hidden || loadingRef.current)) return;
    if (!silent) setState((current) => ({ ...current, loading: true, error: "" }));
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    loadingRef.current = true;
    try {
      const data = await monitorApi.list(controller.signal);
      if (requestRef.current === controller) {
        setDetails({});
        setDetail(null);
        setState({ loading: false, error: "", items: data.items || data || [] });
      }
    } catch (error) {
      if (error.name !== "AbortError" && !silent) setState((current) => ({ ...current, loading: false, error: error.message }));
    } finally {
      if (requestRef.current === controller) loadingRef.current = false;
    }
  }, []);
  useEffect(() => { load(); return () => requestRef.current?.abort(); }, [load]);
  useEffect(() => {
    localStorage.setItem(MONITOR_REFRESH_KEY, JSON.stringify(refresh));
    if (!refresh.auto) return undefined;
    const onVisibility = () => !document.hidden && load(true);
    const timer = window.setInterval(() => load(true), refresh.seconds * 1000);
    document.addEventListener("visibilitychange", onVisibility);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", onVisibility); };
  }, [load, refresh]);
  useEffect(() => {
    if (windowDays === 7 || !state.items.length) return undefined;
    const request = Symbol("monitor-windows");
    detailsRef.current = request;
    Promise.allSettled(state.items.map((item) => monitorApi.status(item.id))).then((results) => {
      if (detailsRef.current !== request) return;
      const next = {};
      results.forEach((result, index) => { if (result.status === "fulfilled") next[state.items[index].id] = result.value; });
      setDetails(next);
    });
    return () => { if (detailsRef.current === request) detailsRef.current = null; };
  }, [state.items, windowDays]);
  const selectItem = useCallback(async (item) => {
    const request = Symbol("monitor-detail");
    detailRef.current = request;
    setSelectedId(item.id);
    setDetail({ loading: true, item, sourceId: item.id });
    try {
      const full = await monitorApi.status(item.id);
      if (detailRef.current === request) {
        setDetails((current) => ({ ...current, [item.id]: full }));
        setDetail({ loading: false, item: { ...item, ...full }, sourceId: item.id });
      }
    } catch (error) {
      if (detailRef.current === request) setDetail({ loading: false, item, sourceId: item.id, error: error.message });
    }
  }, []);
  const closeDetail = () => {
    setDetailOpen(false);
  };
  const statusCounts = countByStatus(state.items);
  const counts = { ...statusCounts, total: state.items.length };
  const filteredItems = state.items.filter((item) => (filter === "all" || monitorTone(item.primary_status) === filter) && (!search.trim() || `${item.name || ""} ${item.provider || ""} ${item.primary_model || ""}`.toLowerCase().includes(search.trim().toLowerCase())));
  const selectedItem = filteredItems.find((item) => item.id === selectedId) || filteredItems[0];
  useEffect(() => {
    if (selectedItem && detail?.sourceId !== selectedItem.id) selectItem(selectedItem);
  }, [detail?.sourceId, selectItem, selectedItem]);

  return (
    <Page title={t("monitor.title")} className="console-monitor-page">
      <MonitorToolbar windowDays={windowDays} setWindowDays={setWindowDays} filter={filter} setFilter={setFilter} counts={counts} refresh={refresh} setRefresh={setRefresh} loading={state.loading} onRefresh={load} search={search} setSearch={setSearch} locale={locale} />
      <MonitorContent state={state} locale={locale} load={load} items={filteredItems} counts={counts} windowDays={windowDays} details={details} formatNumber={formatNumber} formatDate={formatDate} selectedId={selectedId} onSelect={selectItem} detail={detail} onOpenModal={() => setDetailOpen(true)} />
      <Modal open={detailOpen} title={detail?.item?.name || t("monitor.title")} onClose={closeDetail} size="large"><MonitorDetail detail={detail} locale={locale} formatNumber={formatNumber} t={t} /></Modal>
    </Page>
  );
}
