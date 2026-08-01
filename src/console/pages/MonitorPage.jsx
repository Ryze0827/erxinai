import { useCallback, useEffect, useRef, useState } from "react";
import { monitorApi } from "../../api";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, EmptyState, ErrorState, Modal, Page, Panel, SelectInput, StatusBadge } from "../UI";
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

function monitorBarHeight(status) {
  const heights = { operational: 100, degraded: 68, failed: 38, unknown: 52 };
  return heights[monitorTone(status)] || heights.unknown;
}

function Sparkline({ timeline = [], days, locale }) {
  const recent = timeline.slice(-48);
  return (
    <div className="console-monitor-timeline">
      <div className="console-uptime-line" aria-hidden="true">
        {recent.map((point, index) => {
          const height = monitorBarHeight(point.status);
          return <i key={`${point.checked_at}-${index}`} className={`is-${monitorTone(point.status)}`} style={{ height: `${height}%` }} />;
        })}
      </div>
      <div><span>{locale === "zh" ? `${days} 天前` : `${days}d ago`}</span><span>{locale === "zh" ? "现在" : "Now"}</span></div>
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

function MonitorToolbar({ windowDays, setWindowDays, filter, setFilter, counts, refresh, setRefresh, locale }) {
  const filterLabels = {
    all: locale === "zh" ? "全部" : "All",
    operational: locale === "zh" ? "正常" : "Healthy",
    degraded: locale === "zh" ? "警告" : "Warning",
    failed: locale === "zh" ? "异常" : "Incident",
  };
  const refreshValue = refresh.auto ? String(refresh.seconds) : "off";
  const updateRefresh = (event) => {
    const seconds = Number(event.target.value);
    setRefresh({ auto: seconds > 0, seconds: seconds || 60 });
  };

  return (
    <section className="console-monitor-toolbar" aria-label={locale === "zh" ? "渠道筛选" : "Channel filters"}>
      <div className="console-monitor-toolbar-main">
        <div className="console-monitor-window-tabs">
          {MONITOR_WINDOWS.map((days) => <button type="button" key={days} className={windowDays === days ? "is-active" : ""} onClick={() => setWindowDays(days)}>{days} {locale === "zh" ? "天" : "d"}</button>)}
        </div>
        <i className="console-monitor-toolbar-divider" />
        <div className="console-monitor-status-tabs">
          {MONITOR_FILTERS.map((value) => <button type="button" key={value} className={`is-${value} ${filter === value ? "is-active" : ""}`} onClick={() => setFilter(value)}><i />{filterLabels[value]} <b>{value === "all" ? counts.total : counts[value]}</b></button>)}
        </div>
      </div>
      <label className="console-monitor-auto-refresh">
        <Icon name="refresh" size={17} />
        <span>{locale === "zh" ? "自动刷新" : "Auto refresh"}</span>
        <SelectInput aria-label={locale === "zh" ? "自动刷新间隔" : "Auto refresh interval"} value={refreshValue} onChange={updateRefresh}>
          <option value="off">{locale === "zh" ? "已暂停" : "Paused"}</option>
          <option value="30">30s</option>
          <option value="60">60s</option>
          <option value="120">120s</option>
        </SelectInput>
      </label>
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

function MonitorCard({ item, windowDays, details, locale, formatNumber, formatDate, openDetail }) {
  const tone = monitorTone(item.primary_status);
  const availability = Number(windowAvailability(item, windowDays, details)) || 0;
  const checkedAt = latestCheck(item);
  const provider = item.provider || item.group_name || "AI";
  return (
    <article className={`console-monitor-card is-${tone}`}>
      <aside className="console-monitor-card-status">
        <span><Icon name={tone === "operational" ? "shield" : tone === "degraded" ? "warning" : "pulse"} size={22} /></span>
        <strong>{monitorStatusLabel(tone, locale)}</strong>
      </aside>
      <div className="console-monitor-card-main">
        <header>
          <div className="console-monitor-identity">
            <strong>{item.name}</strong>
            <span>{provider}</span>
            <small>{item.primary_model || item.group_name || "—"}</small>
          </div>
          <div className="console-monitor-last-check">
            <span>{locale === "zh" ? "最后检查" : "Last checked"} · {checkedAt ? formatDate(checkedAt) : "—"}</span>
            <StatusBadge status={item.primary_status} label={monitorStatusLabel(tone, locale)} />
          </div>
        </header>
        <div className="console-monitor-card-body">
          <div className="console-monitor-value"><span>{locale === "zh" ? "延迟" : "Latency"}</span><strong>{metricDuration(item.primary_latency_ms, formatNumber)}</strong></div>
          <div className="console-monitor-value"><span>Ping</span><strong>{metricDuration(itemPing(item), formatNumber)}</strong></div>
          <div className="console-monitor-value is-availability"><span>{locale === "zh" ? `可用率（${windowDays} 天）` : `Availability (${windowDays}d)`}</span><strong>{availability.toFixed(2)}%</strong><small>{locale === "zh" ? "实时统计" : "Live window"}</small></div>
          <Sparkline timeline={item.timeline} days={windowDays} locale={locale} />
          <Button className="console-monitor-detail-button" onClick={() => openDetail(item)}>{locale === "zh" ? "查看详情" : "View details"}<Icon name="chevronRight" size={16} /></Button>
        </div>
      </div>
    </article>
  );
}

function MonitorLoading({ locale }) {
  return (
    <>
      <section className="console-monitor-overview is-loading" aria-label={locale === "zh" ? "正在加载渠道概览" : "Loading channel overview"}>
        {Array.from({ length: 5 }, (_, index) => <div className="console-monitor-overview-item" key={index}><i /><div><span /><strong /><small /></div></div>)}
      </section>
      <div className="console-monitor-list is-loading">
        <article className="console-monitor-card"><aside className="console-monitor-card-status"><span /><strong /></aside><div className="console-monitor-card-main"><header /><div className="console-monitor-card-body" /></div></article>
      </div>
    </>
  );
}

function MonitorContent({ state, locale, load, items, counts, windowDays, details, formatNumber, formatDate, openDetail }) {
  if (state.loading) return <MonitorLoading locale={locale} />;
  if (state.error) return <Panel><ErrorState message={state.error} onRetry={load} /></Panel>;
  if (!state.items.length) return <Panel><EmptyState icon="pulse" /></Panel>;
  return (
    <>
      <MonitorOverview items={state.items} counts={counts} windowDays={windowDays} details={details} locale={locale} formatNumber={formatNumber} />
      {items.length ? <div className="console-monitor-list">{items.map((item) => <MonitorCard key={item.id} item={item} windowDays={windowDays} details={details} locale={locale} formatNumber={formatNumber} formatDate={formatDate} openDetail={openDetail} />)}</div> : <Panel><EmptyState icon="filter" description={locale === "zh" ? "当前筛选条件下没有渠道。" : "No channels match this filter."} /></Panel>}
    </>
  );
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
  const openDetail = async (item) => {
    const request = Symbol("monitor-detail");
    detailRef.current = request;
    setDetail({ loading: true, item });
    try {
      const full = await monitorApi.status(item.id);
      if (detailRef.current === request) {
        setDetails((current) => ({ ...current, [item.id]: full }));
        setDetail({ loading: false, item: full });
      }
    } catch (error) {
      if (detailRef.current === request) setDetail({ loading: false, item, error: error.message });
    }
  };
  const closeDetail = () => {
    detailRef.current = null;
    setDetail(null);
  };
  const statusCounts = countByStatus(state.items);
  const counts = { ...statusCounts, total: state.items.length };
  const filteredItems = filter === "all" ? state.items : state.items.filter((item) => monitorTone(item.primary_status) === filter);

  return (
    <Page title={t("monitor.title")} className="console-monitor-page">
      <MonitorToolbar windowDays={windowDays} setWindowDays={setWindowDays} filter={filter} setFilter={setFilter} counts={counts} refresh={refresh} setRefresh={setRefresh} locale={locale} />
      <MonitorContent state={state} locale={locale} load={load} items={filteredItems} counts={counts} windowDays={windowDays} details={details} formatNumber={formatNumber} formatDate={formatDate} openDetail={openDetail} />
      <Modal open={Boolean(detail)} title={detail?.item?.name || t("monitor.title")} onClose={closeDetail} size="large"><MonitorDetail detail={detail} locale={locale} formatNumber={formatNumber} t={t} /></Modal>
    </Page>
  );
}
