import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { groupsApi, keysApi, usageApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { useLocale } from "../i18n";
import { Button, DataTable, EmptyState, ErrorState, Field, LineChart, Modal, Page, Pagination, Panel, SelectInput, Spinner, StatCard, StatusBadge, TextInput } from "../UI";
import { dateInput, formatCompact, formatDuration, statusLabel } from "../utils";

const initialFilters = {
  start_date: dateInput(-7), end_date: dateInput(), api_key_id: "", group_id: "", model: "",
  request_type: "", stream: "", billing_type: "", billing_mode: "",
};

function cleanFilters(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ""));
}

function UsageFilters({ draft, setDraft, apiKeys, groups, apply }) {
  const { t, locale } = useLocale();
  const set = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  return <div className="console-toolbar console-usage-toolbar">
    <Field label={t("usage.start")}><TextInput type="date" value={draft.start_date} onChange={set("start_date")} /></Field>
    <Field label={t("usage.end")}><TextInput type="date" value={draft.end_date} onChange={set("end_date")} /></Field>
    <Field label={t("usage.key")}><SelectInput value={draft.api_key_id} onChange={set("api_key_id")}><option value="">{t("common.all")}</option>{apiKeys.map((key) => <option key={key.id} value={key.id}>{key.name}</option>)}</SelectInput></Field>
    <Field label={t("usage.group")}><SelectInput value={draft.group_id} onChange={set("group_id")}><option value="">{t("common.all")}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</SelectInput></Field>
    <Field label={t("usage.model")}><TextInput value={draft.model} onChange={set("model")} placeholder={locale === "zh" ? "模型名称" : "Model name"} /></Field>
    <Field label={t("usage.type")}><SelectInput value={draft.request_type} onChange={set("request_type")}><option value="">{t("common.all")}</option><option value="sync">Sync</option><option value="stream">Stream</option><option value="ws_v2">WebSocket</option><option value="cyber">Cyber</option></SelectInput></Field>
    <Field label={t("usage.stream")}><SelectInput value={draft.stream} onChange={set("stream")}><option value="">{t("common.all")}</option><option value="true">{locale === "zh" ? "流式" : "Streaming"}</option><option value="false">{locale === "zh" ? "非流式" : "Non-streaming"}</option></SelectInput></Field>
    <Field label={locale === "zh" ? "计费来源" : "Billing source"}><SelectInput value={draft.billing_type} onChange={set("billing_type")}><option value="">{t("common.all")}</option><option value="0">{locale === "zh" ? "余额" : "Balance"}</option><option value="1">{locale === "zh" ? "订阅" : "Subscription"}</option></SelectInput></Field>
    <Field label={t("usage.billing")}><SelectInput value={draft.billing_mode} onChange={set("billing_mode")}><option value="">{t("common.all")}</option><option value="token">Token</option><option value="per_request">{locale === "zh" ? "按请求" : "Per request"}</option><option value="image">Image</option><option value="video">Video</option></SelectInput></Field>
    <Button variant="primary" icon="filter" onClick={apply}>{locale === "zh" ? "应用筛选" : "Apply filters"}</Button>
  </div>;
}

function UsageDetail({ item, errorMode }) {
  const { t, locale, formatCurrency, formatNumber, formatDate } = useLocale();
  const details = errorMode ? [
    [t("common.date"), formatDate(item.created_at)], [t("usage.model"), item.model], [locale === "zh" ? "状态码" : "Status code", item.status_code],
    [locale === "zh" ? "分类" : "Category", item.category], [locale === "zh" ? "平台" : "Platform", item.platform],
    [t("usage.key"), item.key_name], [locale === "zh" ? "客户端 IP" : "Client IP", item.client_ip],
  ] : [
    [t("usage.requestId"), item.request_id], [t("common.date"), formatDate(item.created_at)], [t("usage.model"), item.model],
    [t("usage.key"), item.api_key?.name || item.api_key_id], [t("usage.group"), item.group?.name || item.group_id],
    [t("usage.type"), item.request_type], [t("usage.stream"), item.stream ? (locale === "zh" ? "是" : "Yes") : (locale === "zh" ? "否" : "No")],
    [locale === "zh" ? "输入 Token" : "Input tokens", formatNumber(item.input_tokens)], [locale === "zh" ? "输出 Token" : "Output tokens", formatNumber(item.output_tokens)],
    [t("usage.actualCost"), formatCurrency(item.actual_cost)], [t("usage.standardCost"), formatCurrency(item.total_cost)], [t("usage.duration"), formatDuration(item.duration_ms)],
    [locale === "zh" ? "用户代理" : "User agent", item.user_agent], [locale === "zh" ? "客户端 IP" : "Client IP", item.ip_address],
  ];
  return <div className="console-detail-stack"><dl className="console-description-list">{details.filter(([, value]) => value !== null && value !== undefined && value !== "").map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={String(value).length > 30 ? "console-mono" : ""}>{String(value)}</dd></div>)}</dl>{errorMode && <div className="console-error-box"><strong>{item.message}</strong>{item.error_body && <pre>{item.error_body}</pre>}</div>}</div>;
}

export function UsagePage() {
  const { t, locale, formatNumber, formatCurrency, formatDate } = useLocale();
  const { settings } = useConsole();
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [paging, setPaging] = useState({ page: 1, pageSize: 20 });
  const [tab, setTab] = useState("usage");
  const [options, setOptions] = useState({ keys: [], groups: [] });
  const [data, setData] = useState({ items: [], total: 0, pages: 1, stats: {}, trend: [], models: [] });
  const [state, setState] = useState({ loading: true, error: "" });
  const [detail, setDetail] = useState(null);
  const requestRef = useRef(null);
  const detailRequestRef = useRef(null);
  const errorEnabled = settings?.allow_user_view_error_requests === true;

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState({ loading: true, error: "" });
    const query = cleanFilters({ ...filters, page: paging.page, page_size: paging.pageSize, sort_by: "created_at", sort_order: "desc" });
    try {
      if (tab === "errors") {
        const response = await usageApi.errors(query, controller.signal);
        if (!controller.signal.aborted) setData((current) => ({ ...current, items: response.items || [], total: response.total || 0, pages: response.pages || 1 }));
      } else {
        const chartQuery = cleanFilters({ ...filters, granularity: "day", include_trend: true, include_model_stats: true });
        const results = await Promise.allSettled([usageApi.list(query, controller.signal), usageApi.stats(cleanFilters(filters), controller.signal), usageApi.dashboardSnapshot(chartQuery)]);
        if (controller.signal.aborted) return;
        if (results[0].status === "rejected") throw results[0].reason;
        const list = results[0].value;
        setData({ items: list.items || [], total: list.total || 0, pages: list.pages || 1, stats: results[1].value || {}, trend: results[2].value?.trend || [], models: results[2].value?.models || [] });
      }
      if (!controller.signal.aborted) setState({ loading: false, error: "" });
    } catch (error) {
      if (error.name !== "AbortError") setState({ loading: false, error: error.message });
    }
  }, [filters, paging, tab]);

  useEffect(() => { load(); return () => { requestRef.current?.abort(); detailRequestRef.current = null; }; }, [load]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.allSettled([keysApi.list(1, 100, {}, controller.signal), groupsApi.available()]).then(([keys, groups]) => {
      if (!controller.signal.aborted) setOptions({ keys: keys.value?.items || [], groups: Array.isArray(groups.value) ? groups.value : groups.value?.items || [] });
    });
    return () => controller.abort();
  }, []);
  useEffect(() => { if (!errorEnabled && tab === "errors") setTab("usage"); }, [errorEnabled, tab]);

  const openDetail = async (item) => {
    const request = Symbol("usage-detail");
    detailRequestRef.current = request;
    setDetail({ loading: true, item, errorMode: tab === "errors" });
    try {
      const full = tab === "errors" ? await usageApi.error(item.id) : await usageApi.get(item.id);
      if (detailRequestRef.current === request) setDetail({ loading: false, item: full, errorMode: tab === "errors" });
    } catch { if (detailRequestRef.current === request) setDetail({ loading: false, item, errorMode: tab === "errors" }); }
  };
  const closeDetail = () => { detailRequestRef.current = null; setDetail(null); };

  const usageColumns = useMemo(() => [
    { key: "created_at", label: t("common.date"), render: (row) => formatDate(row.created_at) },
    { key: "model", label: t("usage.model"), render: (row) => <div className="console-key-name"><strong>{row.model}</strong><small>{row.request_type || (row.stream ? "stream" : "sync")}</small></div> },
    { key: "api_key", label: t("usage.key"), render: (row) => row.api_key?.name || row.api_key_id || "—" },
    { key: "total_tokens", label: t("usage.tokens"), render: (row) => formatNumber(row.total_tokens), align: "right" },
    { key: "actual_cost", label: t("usage.actualCost"), render: (row) => formatCurrency(row.actual_cost), align: "right" },
    { key: "duration", label: t("usage.duration"), render: (row) => formatDuration(row.duration_ms), align: "right" },
    { key: "billing_mode", label: t("usage.billing"), render: (row) => <span className="console-chip">{row.billing_mode || (row.billing_type === 1 ? "subscription" : "balance")}</span> },
  ], [formatCurrency, formatDate, formatNumber, t]);
  const errorColumns = useMemo(() => [
    { key: "created_at", label: t("common.date"), render: (row) => formatDate(row.created_at) },
    { key: "model", label: t("usage.model") }, { key: "key_name", label: t("usage.key") },
    { key: "status_code", label: locale === "zh" ? "状态码" : "Status", render: (row) => <StatusBadge status="failed" label={String(row.status_code)} /> },
    { key: "category", label: locale === "zh" ? "分类" : "Category" },
    { key: "message", label: locale === "zh" ? "错误信息" : "Message", render: (row) => <span className="console-clamp">{row.message}</span> },
  ], [formatDate, locale, t]);
  const stats = data.stats || {};

  return <Page title={t("usage.title")} subtitle={t("usage.subtitle")} actions={<Button icon="refresh" onClick={load}>{t("common.refresh")}</Button>}>
    {errorEnabled && <div className="console-tabs"><button className={tab === "usage" ? "is-active" : ""} onClick={() => { setTab("usage"); setPaging((current) => ({ ...current, page: 1 })); }}>{t("usage.records")}</button><button className={tab === "errors" ? "is-active" : ""} onClick={() => { setTab("errors"); setPaging((current) => ({ ...current, page: 1 })); }}>{t("usage.errors")}</button></div>}
    <Panel><UsageFilters draft={draft} setDraft={setDraft} apiKeys={options.keys} groups={options.groups} apply={() => { setFilters(draft); setPaging((current) => ({ ...current, page: 1 })); }} /></Panel>
    {tab === "usage" && <><div className="console-stat-grid console-stat-grid--4"><StatCard label={t("usage.requests")} value={formatCompact(stats.total_requests, locale)} icon="pulse" /><StatCard label={t("usage.tokens")} value={formatCompact(stats.total_tokens, locale)} icon="chart" tone="green" /><StatCard label={t("usage.actualCost")} value={formatCurrency(stats.total_actual_cost)} icon="dollar" tone="amber" /><StatCard label={t("usage.avgLatency")} value={formatDuration(stats.average_duration_ms)} icon="clock" tone="rose" /></div><div className="console-grid console-grid--sidebar"><Panel title={locale === "zh" ? "用量趋势" : "Usage trend"}>{state.loading ? <Spinner /> : <LineChart data={data.trend} valueKey="total_tokens" />}</Panel><Panel title={t("dashboard.models")}><div className="console-panel-body console-model-list">{data.models.slice(0, 7).map((model) => <div key={model.model}><strong>{model.model}</strong><span>{formatNumber(model.total_tokens)}</span></div>)}{!data.models.length && !state.loading && <EmptyState />}</div></Panel></div></>}
    <Panel title={tab === "errors" ? t("usage.errors") : t("usage.records")}><>{state.loading ? <Spinner /> : state.error ? <ErrorState message={state.error} onRetry={load} /> : <><DataTable columns={tab === "errors" ? errorColumns : usageColumns} rows={data.items} onRowClick={openDetail} /><Pagination page={paging.page} pageSize={paging.pageSize} total={data.total} pages={data.pages} onPageChange={(page) => setPaging((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })} /></>}</></Panel>
    <Modal open={Boolean(detail)} title={t("usage.details")} onClose={closeDetail} size="large">{detail?.loading ? <Spinner /> : detail?.item && <UsageDetail item={detail.item} errorMode={detail.errorMode} />}</Modal>
  </Page>;
}
