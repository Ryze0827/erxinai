import { useCallback, useEffect, useRef, useState } from "react";
import { Badge as AppicaBadge } from "@appica/ui-react/badge";
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
import { Button, EmptyState, ErrorState, IconButton, Page, Panel, SelectInput, Skeleton, Spinner, TextInput } from "../UI";
import { CompactTabs } from "../components/ConsoleControls";

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

function MonitorStatusBadge({ tone, label }) {
  const variant = { operational: "success", degraded: "warning", failed: "error", unknown: "soft" }[tone] || "soft";
  const icon = { operational: "circleCheck", degraded: "warning", failed: "warning", unknown: "info" }[tone] || "info";
  return <AppicaBadge variant={variant} size="sm" className="console-monitor-status-badge"><Icon name={icon} size={13} data-icon="start" aria-hidden="true" />{label}</AppicaBadge>;
}

function latestCheck(item) {
  return item.timeline?.at(-1)?.checked_at || item.last_checked_at || item.updated_at;
}

function checkAgeLabel(value, locale, now = Date.now()) {
  const checkedAt = new Date(value).getTime();
  if (!Number.isFinite(checkedAt)) return "—";
  const seconds = Math.max(0, Math.floor((now - checkedAt) / 1000));
  return locale === "zh" ? `${seconds} 秒前` : `${seconds} seconds ago`;
}

function RelativeCheckTime({ value, locale }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!value) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [value]);
  return checkAgeLabel(value, locale, now);
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
  const statusTabs = MONITOR_FILTERS.map((value) => ({ value, label: <>{filterLabels[value]} <b>{value === "all" ? counts.total : counts[value]}</b></> }));
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

function MonitorInspector({ item, detail, windowDays, locale, formatNumber }) {
  if (!item) return <Panel className="console-monitor-inspector"><EmptyState icon="channel" /></Panel>;
  const detailMatches = detail?.sourceId === item.id;
  const resolved = detailMatches ? detail?.item || item : item;
  const tone = monitorTone(resolved.primary_status || item.primary_status);
  const timeline = resolved.timeline || item.timeline || [];
  const models = detailMatches ? resolved.models || [] : [];
  const provider = resolved.provider || resolved.group_name || item.provider || "AI";
  const availability = Number(resolved[`availability_${windowDays}d`] ?? resolved.availability_7d ?? item.availability_7d) || 0;
  const modelContent = models.length ? (
    <div className="console-monitor-models-table">
      <AppicaTable size="sm" borderStyle="none">
        <AppicaTableHeader>
          <AppicaTableRow>
            <AppicaTableHead>{locale === "zh" ? "模型" : "Model"}</AppicaTableHead>
            <AppicaTableHead>{locale === "zh" ? "最新状态" : "Latest status"}</AppicaTableHead>
            <AppicaTableHead>7d</AppicaTableHead>
            <AppicaTableHead>15d</AppicaTableHead>
            <AppicaTableHead>30d</AppicaTableHead>
            <AppicaTableHead>{locale === "zh" ? "平均延迟" : "Avg latency 7d"}</AppicaTableHead>
          </AppicaTableRow>
        </AppicaTableHeader>
        <AppicaTableBody>
          {models.map((model) => {
            const modelTone = monitorTone(model.latest_status);
            return <AppicaTableRow key={model.model}>
              <AppicaTableCell data-label={locale === "zh" ? "模型" : "Model"}><strong>{model.model}</strong></AppicaTableCell>
              <AppicaTableCell data-label={locale === "zh" ? "最新状态" : "Latest status"}><MonitorStatusBadge tone={modelTone} label={monitorStatusLabel(modelTone, locale)} /></AppicaTableCell>
              <AppicaTableCell data-label="7d">{availabilityValue(model, 7)}</AppicaTableCell>
              <AppicaTableCell data-label="15d">{availabilityValue(model, 15)}</AppicaTableCell>
              <AppicaTableCell data-label="30d">{availabilityValue(model, 30)}</AppicaTableCell>
              <AppicaTableCell data-label={locale === "zh" ? "平均延迟" : "Avg latency 7d"}>{metricDuration(model.avg_latency_7d_ms, formatNumber)}</AppicaTableCell>
            </AppicaTableRow>;
          })}
        </AppicaTableBody>
      </AppicaTable>
    </div>
  ) : detailMatches && detail?.error ? <ErrorState message={detail.error} /> : !detailMatches || detail?.loading ? <Spinner label={locale === "zh" ? "正在读取详情" : "Loading details"} /> : <EmptyState />;
  return (
    <Panel className={`console-monitor-inspector is-${tone}`}>
      <header className="console-monitor-inspector-head">
        <i className="console-monitor-provider-mark"><PlatformMark platform={provider} /></i>
        <div><h2>{item.name}</h2><p>{provider} <b>•</b> {item.primary_model || item.group_name || "—"}</p></div>
        <span className="console-monitor-inspector-check"><small>{locale === "zh" ? "检查于" : "Checked"}</small><strong><RelativeCheckTime value={latestCheck(resolved)} locale={locale} /></strong></span>
      </header>
      <div className="console-monitor-inspector-metrics">
        <div className={Number(item.primary_latency_ms) > MONITOR_LATENCY_DANGER_MS ? "is-danger" : tone === "degraded" ? "is-warning" : "is-success"}>
          <span>{locale === "zh" ? "延迟" : "Latency"}</span><strong>{metricDuration(item.primary_latency_ms, formatNumber)}</strong>
          {tone !== "operational" && <small><Icon name="warning" size={13} />{locale === "zh" ? "检测到间歇性延迟" : "Intermittent latency detected"}</small>}
        </div>
        <div><span>Ping</span><strong>{metricDuration(itemPing(item), formatNumber)}</strong></div>
        <div className="is-success"><span>{windowDays}{locale === "zh" ? " 天可用率" : "-day availability"}</span><strong>{availability.toFixed(2)}%</strong></div>
      </div>
      <div className="console-monitor-history">
        <header>
          <h3>{locale === "zh" ? "状态历史" : "Status history"}</h3>
          <div><span className="is-operational">{locale === "zh" ? "正常" : "Healthy"}</span><span className="is-degraded">{locale === "zh" ? "警告" : "Warning"}</span><span className="is-failed">{locale === "zh" ? "异常" : "Incident"}</span><span className="is-unknown">{locale === "zh" ? "未知" : "Unknown"}</span></div>
        </header>
        <Sparkline timeline={timeline} days={windowDays} locale={locale} />
      </div>
      <div className="console-monitor-availability">
        <h3>{locale === "zh" ? "分窗口可用率" : "Availability by window"}</h3>
        <div>{[7, 15, 30].map((days) => <span key={days}><small>{days} {locale === "zh" ? "天" : "days"}</small><strong>{availabilityValue(resolved, days)}</strong></span>)}</div>
      </div>
      <div className="console-monitor-models" aria-busy={detailMatches && detail?.loading ? "true" : undefined}>
        <h3>{locale === "zh" ? "模型健康度" : "Model health"}</h3>
        {modelContent}
      </div>
    </Panel>
  );
}

function MonitorLoading({ locale }) {
  return <><section className="console-monitor-overview" aria-label={locale === "zh" ? "正在加载渠道概览" : "Loading channel overview"}>{Array.from({ length: 5 }, (_, index) => <div className="console-monitor-overview-item" key={index}><Skeleton className="size-10" /><div className="flex flex-1 flex-col items-end gap-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-14" /><Skeleton className="h-2 w-16" /></div></div>)}</section><div className="console-monitor-master-detail"><Panel className="console-monitor-master"><div className="console-panel-body flex flex-col gap-3"><Skeleton className="h-5 w-24" />{Array.from({ length: 6 }, (_, index) => <Skeleton className="h-14 w-full" key={index} />)}</div></Panel><Panel className="console-monitor-inspector"><div className="console-panel-body flex flex-col gap-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-64 w-full" /></div></Panel></div></>;
}

function MonitorContent({ state, locale, load, items, counts, windowDays, details, formatNumber, selectedId, onSelect, detail }) {
  if (state.loading) return <MonitorLoading locale={locale} />;
  if (state.error) return <Panel><ErrorState message={state.error} onRetry={load} /></Panel>;
  if (!state.items.length) return <Panel><EmptyState icon="pulse" /></Panel>;
  const selectedItem = items.find((item) => item.id === selectedId) || items[0];
  return <><MonitorOverview items={state.items} counts={counts} windowDays={windowDays} details={details} locale={locale} formatNumber={formatNumber} /><div className="console-monitor-master-detail"><Panel className="console-monitor-master"><header><h2>{locale === "zh" ? "渠道" : "Channels"}</h2><span>{locale === "zh" ? "按状态排序" : "Sort by status"}<Icon name="chevronDown" size={14} /></span></header>{items.length ? <div className="console-monitor-master-list">{items.map((item) => <MonitorListItem key={item.id} item={item} selected={item.id === selectedItem?.id} windowDays={windowDays} details={details} locale={locale} formatNumber={formatNumber} onSelect={onSelect} />)}</div> : <EmptyState icon="filter" description={locale === "zh" ? "当前筛选条件下没有渠道。" : "No channels match this filter."} />}<footer><span>{items.length} {locale === "zh" ? "个渠道" : "channels"}</span><div><IconButton icon="chevronRight" label={locale === "zh" ? "上一页" : "Previous page"} disabled /><b>1</b><IconButton icon="chevronRight" label={locale === "zh" ? "下一页" : "Next page"} disabled /></div></footer></Panel><MonitorInspector item={selectedItem} detail={detail} windowDays={windowDays} locale={locale} formatNumber={formatNumber} /></div></>;
}

export function MonitorPage() {
  const { t, locale, formatNumber } = useLocale();
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  const [refresh, setRefresh] = useState(storedRefresh);
  const [detail, setDetail] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [windowDays, setWindowDays] = useState(7);
  const [filter, setFilter] = useState("all");
  const [details, setDetails] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [listVersion, setListVersion] = useState(0);
  const requestRef = useRef(null);
  const loadingRef = useRef(false);
  const detailRef = useRef(null);
  const detailsRef = useRef(null);
  const loadedListVersionRef = useRef(0);
  const load = useCallback(async (silent = false) => {
    if (silent && (document.hidden || loadingRef.current)) return;
    if (!silent) {
      setRefreshing(true);
      setState((current) => current.items.length ? { ...current, loading: false, error: "" } : { ...current, loading: true, error: "" });
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    loadingRef.current = true;
    try {
      const data = await monitorApi.list(controller.signal);
      if (requestRef.current === controller) {
        const nextItems = Array.isArray(data) ? data : data?.items || [];
        setDetail((current) => {
          if (!current?.sourceId) return current;
          const nextItem = nextItems.find((item) => item.id === current.sourceId);
          return nextItem ? { ...current, item: { ...current.item, ...nextItem, ...(current.item?.models ? { models: current.item.models } : {}) } } : current;
        });
        setState({ loading: false, error: "", items: nextItems });
        setListVersion((version) => version + 1);
      }
    } catch (error) {
      if (error.name !== "AbortError" && !silent) setState((current) => ({ ...current, loading: false, error: error.message }));
    } finally {
      if (requestRef.current === controller) {
        loadingRef.current = false;
        if (!silent) setRefreshing(false);
      }
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
    setDetail((current) => {
      const previousItem = current?.sourceId === item.id ? current.item : null;
      return {
        loading: true,
        item: previousItem ? { ...previousItem, ...item, ...(previousItem.models ? { models: previousItem.models } : {}) } : item,
        sourceId: item.id,
      };
    });
    try {
      const full = await monitorApi.status(item.id);
      if (detailRef.current === request) {
        setDetails((current) => ({ ...current, [item.id]: full }));
        setDetail((current) => {
          const previousItem = current?.sourceId === item.id ? current.item : null;
          const nextItem = { ...(previousItem || {}), ...item, ...full };
          return {
            loading: false,
            item: full?.models === undefined && previousItem?.models ? { ...nextItem, models: previousItem.models } : nextItem,
            sourceId: item.id,
          };
        });
      }
    } catch (error) {
      if (detailRef.current === request) {
        setDetail((current) => ({ loading: false, item: current?.sourceId === item.id ? { ...current.item, ...item } : item, sourceId: item.id, error: error.message }));
      }
    }
  }, []);
  const statusCounts = countByStatus(state.items);
  const counts = { ...statusCounts, total: state.items.length };
  const filteredItems = state.items.filter((item) => (filter === "all" || monitorTone(item.primary_status) === filter) && (!search.trim() || `${item.name || ""} ${item.provider || ""} ${item.primary_model || ""}`.toLowerCase().includes(search.trim().toLowerCase())));
  const selectedItem = filteredItems.find((item) => item.id === selectedId) || filteredItems[0];
  useEffect(() => {
    if (!selectedItem) return;
    if (loadedListVersionRef.current !== listVersion || detail?.sourceId !== selectedItem.id) {
      loadedListVersionRef.current = listVersion;
      selectItem(selectedItem);
    }
  }, [detail?.sourceId, listVersion, selectItem, selectedItem]);

  return (
    <Page title={t("monitor.title")} className="console-monitor-page">
      <MonitorToolbar windowDays={windowDays} setWindowDays={setWindowDays} filter={filter} setFilter={setFilter} counts={counts} refresh={refresh} setRefresh={setRefresh} loading={state.loading || refreshing} onRefresh={load} search={search} setSearch={setSearch} locale={locale} />
      <MonitorContent state={state} locale={locale} load={load} items={filteredItems} counts={counts} windowDays={windowDays} details={details} formatNumber={formatNumber} selectedId={selectedId} onSelect={selectItem} detail={detail} />
    </Page>
  );
}
