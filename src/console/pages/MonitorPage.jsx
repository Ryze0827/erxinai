import { useCallback, useEffect, useRef, useState } from "react";
import { monitorApi } from "../../api";
import { useLocale } from "../i18n";
import { Button, EmptyState, ErrorState, Modal, Page, Panel, SelectInput, Spinner, StatusBadge, Toggle } from "../UI";
import { formatDuration, statusLabel } from "../utils";

const MONITOR_REFRESH_KEY = "sentence_monitor_refresh";

function storedRefresh() {
  try {
    const value = JSON.parse(localStorage.getItem(MONITOR_REFRESH_KEY));
    return { auto: value?.auto !== false, seconds: [30, 60, 120].includes(value?.seconds) ? value.seconds : 30 };
  } catch {
    return { auto: true, seconds: 30 };
  }
}

function Sparkline({ timeline = [] }) {
  const recent = timeline.slice(-36);
  return <div className="console-uptime-line" aria-hidden="true">{recent.map((point, index) => <i key={`${point.checked_at}-${index}`} className={`is-${String(point.status || "unknown").toLowerCase()}`} />)}</div>;
}

function overallState(items) {
  return items.some((item) => item.primary_status !== "operational" && item.primary_status !== "success") ? "degraded" : "operational";
}

function windowAvailability(item, days, details) {
  if (days === 7) return item.availability_7d;
  const model = details[item.id]?.models?.find((entry) => entry.model === item.primary_model);
  return model?.[`availability_${days}d`] ?? item.availability_7d;
}

export function MonitorPage() {
  const { t, locale, formatDate } = useLocale();
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  const [refresh, setRefresh] = useState(storedRefresh);
  const [detail, setDetail] = useState(null);
  const [windowDays, setWindowDays] = useState(7);
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
    try { const data = await monitorApi.list(controller.signal); if (requestRef.current === controller) { setDetails({}); setState({ loading: false, error: "", items: data.items || data || [] }); } }
    catch (error) { if (error.name !== "AbortError" && !silent) setState((current) => ({ ...current, loading: false, error: error.message })); }
    finally { if (requestRef.current === controller) loadingRef.current = false; }
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
    try { const full = await monitorApi.status(item.id); if (detailRef.current === request) { setDetails((current) => ({ ...current, [item.id]: full })); setDetail({ loading: false, item: full }); } }
    catch (error) { if (detailRef.current === request) setDetail({ loading: false, item, error: error.message }); }
  };
  const closeDetail = () => {
    detailRef.current = null;
    setDetail(null);
  };
  const overall = overallState(state.items);

  return <Page title={t("monitor.title")} subtitle={t("monitor.subtitle")} actions={<><div className="console-tabs">{[7, 15, 30].map((days) => <button key={days} className={windowDays === days ? "is-active" : ""} onClick={() => setWindowDays(days)}>{days}d</button>)}</div><div className="console-monitor-refresh"><Toggle checked={refresh.auto} onChange={(event) => setRefresh((current) => ({ ...current, auto: event.target.checked }))} label={t("monitor.auto")} /><SelectInput value={refresh.seconds} onChange={(event) => setRefresh((current) => ({ ...current, seconds: Number(event.target.value) }))} disabled={!refresh.auto}><option value="30">30s</option><option value="60">60s</option><option value="120">120s</option></SelectInput></div><Button icon="refresh" onClick={() => load()}>{t("common.refresh")}</Button></>}>
    {!state.loading && !state.error && <div className={`console-system-status is-${overall}`}><span><i /><strong>{overall === "operational" ? t("monitor.operational") : t("monitor.degraded")}</strong></span><small>{refresh.auto ? (locale === "zh" ? `每 ${refresh.seconds} 秒更新` : `Updated every ${refresh.seconds} seconds`) : (locale === "zh" ? "自动刷新已暂停" : "Auto refresh paused")}</small></div>}
    {state.loading ? <Panel><Spinner /></Panel> : state.error ? <Panel><ErrorState message={state.error} onRetry={load} /></Panel> : !state.items.length ? <Panel><EmptyState icon="pulse" /></Panel> : <div className="console-grid console-grid--2">{state.items.map((item) => <button className="console-monitor-card" key={item.id} onClick={() => openDetail(item)}><div><span className="console-platform-icon">{String(item.provider || "AI").slice(0, 2).toUpperCase()}</span><div><strong>{item.name}</strong><small>{item.group_name} · {item.primary_model}</small></div><StatusBadge status={item.primary_status} label={statusLabel(item.primary_status, locale)} /></div><Sparkline timeline={item.timeline} /><div className="console-monitor-metrics"><span><small>{t("monitor.availability")} · {windowDays}d</small><strong>{Number(windowAvailability(item, windowDays, details) || 0).toFixed(2)}%</strong></span><span><small>{t("monitor.latency")}</small><strong>{formatDuration(item.primary_latency_ms)}</strong></span><span><small>{locale === "zh" ? "最近检查" : "Last checked"}</small><strong>{item.timeline?.length ? formatDate(item.timeline.at(-1).checked_at) : "—"}</strong></span></div></button>)}</div>}
    <Modal open={Boolean(detail)} title={detail?.item?.name || t("monitor.title")} onClose={closeDetail} size="large">{detail?.loading ? <Spinner /> : detail?.error ? <ErrorState message={detail.error} /> : <div className="console-monitor-detail">{(detail?.item?.models || []).map((model) => <div key={model.model}><div><strong>{model.model}</strong><StatusBadge status={model.latest_status} label={statusLabel(model.latest_status, locale)} /></div><div><span>7d <strong>{Number(model.availability_7d || 0).toFixed(2)}%</strong></span><span>15d <strong>{Number(model.availability_15d || 0).toFixed(2)}%</strong></span><span>30d <strong>{Number(model.availability_30d || 0).toFixed(2)}%</strong></span><span>{t("monitor.latency")} <strong>{formatDuration(model.avg_latency_7d_ms)}</strong></span></div></div>)}</div>}</Modal>
  </Page>;
}
