import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { groupsApi, keysApi, usageApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { GroupBadge } from "../GroupBadge";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, DataTable, EmptyState, ErrorState, Field, Modal, Page, Pagination, Panel, SelectInput, Spinner, StatusBadge } from "../UI";
import { downloadBlob, formatCompact, formatDuration } from "../utils";
import { ColumnPicker, DateRangePicker, SearchSelect, useHiddenColumns } from "../components/ConsoleControls";
import { DistributionChart, UsageTrendChart } from "../components/UsageCharts";
import { IpGeoBatchToolbar, IpGeoCell } from "../components/IpGeo";

function localDate(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function last24Hours() {
  return { start_date: localDate(new Date(Date.now() - 86400000)), end_date: localDate(new Date()) };
}

const emptyFilters = { ...last24Hours(), api_key_id: "", group_id: "", model: "", request_type: "", billing_type: "", billing_mode: "" };
const emptyErrorFilters = { api_key_id: "", model: "", category: "", status_code: "" };

function clean(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== "" && value !== null && value !== undefined));
}

function usageFilters(filters) {
  const query = clean(filters);
  if (query.request_type && !["unknown", "cyber"].includes(query.request_type)) query.stream = query.request_type !== "sync";
  return query;
}

function requestType(row) {
  const numericTypes = { 0: "unknown", 1: "sync", 2: "stream", 3: "ws_v2", 4: "cyber" };
  if (typeof row.request_type === "number") return numericTypes[row.request_type] || "unknown";
  if (["unknown", "sync", "stream", "ws_v2", "cyber"].includes(row.request_type)) return row.request_type;
  if (row.openai_ws_mode) return "ws_v2";
  return row.stream ? "stream" : "sync";
}

function errorSortKey(value) {
  return value === "status" ? "status_code" : value;
}

function typeLabel(type) {
  if (type === "ws_v2") return "WS";
  if (type === "stream") return "Stream";
  if (type === "sync") return "Sync";
  if (type === "cyber") return "Cyber";
  return type || "Unknown";
}

function billingMode(row) {
  if (Number(row.image_count) > 0) return "image";
  return row.billing_mode || (row.billing_type === 1 ? "subscription" : "token");
}

function reasoningLabel(value) {
  if (!value) return "—";
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function UsageStats({ stats, loading }) {
  const { t, locale, formatCurrency, formatNumber } = useLocale();
  if (loading && !stats) return <div className="console-stat-grid console-stat-grid--4">{[0, 1, 2, 3].map((item) => <div className="console-stat console-skeleton" key={item} />)}</div>;
  const value = stats || {};
  const cacheCreate = value.total_cache_creation_tokens || 0;
  const cacheRead = value.total_cache_read_tokens || value.total_cache_tokens || 0;
  return <div className="console-stat-grid console-stat-grid--4 console-usage-stats"><div className="console-stat"><div><span>{t("usage.requests")}</span><strong>{formatCompact(value.total_requests, locale)}</strong><small>{locale === "zh" ? "所选时间范围" : "In selected range"}</small></div><i><Icon name="pulse" size={20} /></i></div><div className="console-stat console-stat--green"><div><span>{t("usage.tokens")}</span><strong>{formatCompact(value.total_tokens, locale)}</strong><small title={`${locale === "zh" ? "缓存创建" : "Cache creation"}: ${formatNumber(cacheCreate)} · ${locale === "zh" ? "缓存读取" : "Cache read"}: ${formatNumber(cacheRead)}`}>↓ {formatCompact(value.total_input_tokens, locale)} · ↑ {formatCompact(value.total_output_tokens, locale)} · C {formatCompact(cacheCreate + cacheRead, locale)}</small></div><i><Icon name="chart" size={20} /></i></div><div className="console-stat console-stat--amber"><div><span>{t("usage.actualCost")}</span><strong>{formatCurrency(value.total_actual_cost)}</strong><small><del>{formatCurrency(value.total_cost)}</del> {locale === "zh" ? "标准费用" : "standard"}</small></div><i><Icon name="dollar" size={20} /></i></div><div className="console-stat console-stat--rose"><div><span>{t("usage.avgLatency")}</span><strong>{formatDuration(value.average_duration_ms)}</strong><small>{locale === "zh" ? "平均请求耗时" : "Average request duration"}</small></div><i><Icon name="clock" size={20} /></i></div></div>;
}

function FilterSelect({ label, value, onChange, children }) {
  return <Field label={label}><SelectInput value={value} onChange={(event) => onChange(event.target.value)}>{children}</SelectInput></Field>;
}

function localized(locale, zh, en) {
  return locale === "zh" ? zh : en;
}

function UsageFilters({ filters, setFilter, apiKeys, groups, models, locale, t }) {
  return <div className="console-usage-filters"><FilterSelect label={t("usage.key")} value={filters.api_key_id} onChange={(value) => setFilter("api_key_id", value)}><option value="">{localized(locale, "全部密钥", "All API keys")}</option>{apiKeys.map((key) => <option key={key.id} value={key.id}>{key.name}</option>)}</FilterSelect><Field label={t("usage.model")}><SearchSelect id="usage-model-options" value={filters.model} onChange={(event) => setFilter("model", event.target.value)} options={models} placeholder={localized(locale, "全部模型", "All models")} /></Field><FilterSelect label={t("usage.group")} value={filters.group_id} onChange={(value) => setFilter("group_id", value)}><option value="">{localized(locale, "全部分组", "All groups")}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</FilterSelect><FilterSelect label={t("usage.type")} value={filters.request_type} onChange={(value) => setFilter("request_type", value)}><option value="">{localized(locale, "全部类型", "All types")}</option><option value="ws_v2">WebSocket</option><option value="stream">Stream</option><option value="sync">Sync</option></FilterSelect><FilterSelect label={localized(locale, "计费来源", "Billing source")} value={filters.billing_type} onChange={(value) => setFilter("billing_type", value)}><option value="">{localized(locale, "全部来源", "All sources")}</option><option value="0">{localized(locale, "余额", "Balance")}</option><option value="1">{localized(locale, "订阅", "Subscription")}</option></FilterSelect><FilterSelect label={t("usage.billing")} value={filters.billing_mode} onChange={(value) => setFilter("billing_mode", value)}><option value="">{localized(locale, "全部方式", "All modes")}</option><option value="token">Token</option><option value="per_request">{localized(locale, "按请求", "Per request")}</option><option value="image">Image</option><option value="video">Video</option></FilterSelect></div>;
}

function ErrorFilters({ filters, setFilter, apiKeys, models, locale }) {
  return <div className="console-usage-filters"><FilterSelect label={locale === "zh" ? "密钥名称" : "Key name"} value={filters.api_key_id} onChange={(value) => setFilter("api_key_id", value)}><option value="">{locale === "zh" ? "全部密钥" : "All keys"}</option>{apiKeys.map((key) => <option key={key.id} value={key.id}>{key.name}</option>)}</FilterSelect><Field label={locale === "zh" ? "模型" : "Model"}><SearchSelect id="error-model-options" value={filters.model} onChange={(event) => setFilter("model", event.target.value)} options={models} placeholder={locale === "zh" ? "输入模型片段" : "Enter any model fragment"} /></Field><FilterSelect label={locale === "zh" ? "错误分类" : "Category"} value={filters.category} onChange={(value) => setFilter("category", value)}><option value="">{locale === "zh" ? "全部分类" : "All categories"}</option>{["auth", "rate_limit", "quota", "invalid_request", "service_unavailable", "upstream", "internal", "cyber"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</FilterSelect><FilterSelect label={locale === "zh" ? "状态码" : "Status"} value={filters.status_code} onChange={(value) => setFilter("status_code", value)}><option value="">{locale === "zh" ? "全部状态" : "All statuses"}</option>{[400, 401, 403, 404, 408, 409, 422, 429, 500, 502, 503, 504].map((code) => <option key={code} value={code}>{code}</option>)}</FilterSelect></div>;
}

function ModelCell({ row }) {
  const chain = String(row.model_mapping_chain || "").split("→").map((item) => item.trim()).filter(Boolean);
  if (chain.length > 1) return <div className="console-model-chain">{chain.map((item, index) => <span key={`${item}-${index}`}>{index > 0 && "↳ "}{item}</span>)}</div>;
  return <div className="console-key-name"><strong>{row.model || "—"}</strong>{row.upstream_model && row.upstream_model !== row.model && <small>↳ {row.upstream_model}</small>}</div>;
}

function TokenCell({ row, formatNumber, locale }) {
  if (billingMode(row) === "image" || billingMode(row) === "per_request") return <div className="console-token-cell"><strong>{row.image_count || 1} {locale === "zh" ? "张" : "image(s)"}</strong><small>{row.image_output_size || row.image_size || row.image_input_size || "—"}</small></div>;
  const total = Number(row.input_tokens || 0) + Number(row.output_tokens || 0) + Number(row.cache_creation_tokens || 0) + Number(row.cache_read_tokens || 0);
  const title = `${locale === "zh" ? "输入" : "Input"}: ${formatNumber(row.input_tokens)}\n${locale === "zh" ? "输出" : "Output"}: ${formatNumber(row.output_tokens)}\n${locale === "zh" ? "缓存创建" : "Cache creation"}: ${formatNumber(row.cache_creation_tokens)} (5m ${formatNumber(row.cache_creation_5m_tokens)}, 1h ${formatNumber(row.cache_creation_1h_tokens)})\n${locale === "zh" ? "缓存读取" : "Cache read"}: ${formatNumber(row.cache_read_tokens)}\nTotal: ${formatNumber(total)}`;
  return <div className="console-token-cell" title={title}><span><b>↓</b>{formatNumber(row.input_tokens)} <b>↑</b>{formatNumber(row.output_tokens)}</span>{Number(row.cache_read_tokens) > 0 && <small className="is-cache">R {formatNumber(row.cache_read_tokens)}</small>}{Number(row.cache_creation_tokens) > 0 && <small className="is-create">C {formatNumber(row.cache_creation_tokens)}{Number(row.cache_creation_1h_tokens) > 0 && <i>1h</i>}{row.cache_ttl_overridden && <i>R</i>}</small>}</div>;
}

function CostCell({ row, formatCurrency, locale }) {
  const title = `${locale === "zh" ? "实际扣费" : "Billed"}: ${formatCurrency(row.actual_cost)}\n${locale === "zh" ? "标准费用" : "Standard"}: ${formatCurrency(row.total_cost)}\n${locale === "zh" ? "倍率" : "Rate"}: ${Number(row.rate_multiplier || 1)}×`;
  return <div className="console-cost-cell" title={title}><strong>{formatCurrency(row.actual_cost)}</strong><small>{row.long_context_billing_applied && <i>x2</i>}<del>{formatCurrency(row.total_cost)}</del></small></div>;
}

function LatencyCell({ row, locale }) {
  const first = Number(row.first_token_ms || 0);
  const total = Number(row.duration_ms || 0);
  const severity = Math.max(first / 5000, total / 30000);
  return <div className={`console-latency is-${severity > 1 ? "slow" : severity > .45 ? "medium" : "fast"}`} title={`${locale === "zh" ? "首字" : "First token"}: ${formatDuration(first)}\n${locale === "zh" ? "总耗时" : "Duration"}: ${formatDuration(total)}`}><i /><span><small>FT</small>{row.first_token_ms == null ? "—" : formatDuration(first)}</span><span><small>{locale === "zh" ? "总计" : "Total"}</small>{row.duration_ms == null ? "—" : formatDuration(total)}</span></div>;
}

function ErrorDetail({ item }) {
  const { locale, formatDate } = useLocale();
  const fields = [[locale === "zh" ? "时间" : "Time", formatDate(item.created_at)], [locale === "zh" ? "模型" : "Model", item.model], [locale === "zh" ? "端点" : "Endpoint", item.inbound_endpoint], [locale === "zh" ? "状态" : "Status", item.status_code], [locale === "zh" ? "分类" : "Category", item.category], [locale === "zh" ? "平台" : "Platform", item.platform], [locale === "zh" ? "上游状态" : "Upstream status", item.upstream_status_code]];
  return <div className="console-detail-stack"><dl className="console-description-list">{fields.filter(([, value]) => value !== null && value !== undefined && value !== "").map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><div className="console-error-box"><strong>{item.message || "—"}</strong>{item.error_body && <pre>{item.error_body}</pre>}</div></div>;
}

function escapeCsv(value) {
  if (value == null) return "";
  const raw = String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[,"\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

function csvRow(row) {
  return [row.created_at, row.api_key?.name || "", row.model, reasoningLabel(row.reasoning_effort), row.inbound_endpoint || "", row.ip_address || "", typeLabel(requestType(row)), billingMode(row), row.input_tokens, row.output_tokens, row.cache_read_tokens, row.cache_creation_tokens, row.rate_multiplier, Number(row.actual_cost || 0).toFixed(8), Number(row.total_cost || 0).toFixed(8), row.first_token_ms ?? "", row.duration_ms ?? ""].map(escapeCsv).join(",");
}

function TimeRangePanel({ filters, granularity, setGranularity, changeRange, locale }) {
  return <Panel><div className="console-time-range"><div><span>{localized(locale, "时间范围", "Time range")}</span><DateRangePicker startDate={filters.start_date} endDate={filters.end_date} onChange={changeRange} /></div><div><span>{localized(locale, "粒度", "Granularity")}</span><SelectInput value={granularity} onChange={(event) => setGranularity(event.target.value)}><option value="day">{localized(locale, "天", "Day")}</option><option value="hour">{localized(locale, "小时", "Hour")}</option></SelectInput></div></div></Panel>;
}

function UsageChartsPanel({ data, loading, locale }) {
  return <div className="console-usage-chart-grid"><DistributionChart title={localized(locale, "模型分布", "Model distribution")} data={data.models} nameKey="model" loading={loading} /><DistributionChart title={localized(locale, "分组分布", "Group distribution")} data={data.groups} nameKey="group_name" loading={loading} /><DistributionChart title={localized(locale, "端点分布", "Endpoint distribution")} data={data.endpoints} nameKey="endpoint" loading={loading} /><UsageTrendChart data={data.trend} loading={loading} /></div>;
}

function UsageFilterPanel({ tab, filters, errorFilters, options, modelOptions, errorModelOptions, setFilter, setErrorFilter, currentColumns, currentHidden, loadUsage, loadErrors, state, reset, exportCsv, exporting, locale, t }) {
  const errorTab = tab === "errors";
  const filtersNode = errorTab
    ? <ErrorFilters filters={errorFilters} setFilter={setErrorFilter} apiKeys={options.keys} models={errorModelOptions} locale={locale} />
    : <UsageFilters filters={filters} setFilter={setFilter} apiKeys={options.keys} groups={options.groups} models={modelOptions} locale={locale} t={t} />;
  const refresh = () => {
    loadUsage();
    if (errorTab) loadErrors();
  };
  const alwaysVisible = errorTab ? ["status", "created_at"] : ["created_at"];
  const exportLabel = exporting ? localized(locale, "导出中…", "Exporting…") : "CSV";
  return <Panel><div className="console-filter-action-layout">{filtersNode}<div className="console-table-actions"><Button icon="refresh" onClick={refresh} disabled={state.loading || state.errorLoading}>{t("common.refresh")}</Button><Button icon="reset" onClick={reset}>{localized(locale, "重置", "Reset")}</Button><ColumnPicker columns={currentColumns} hidden={currentHidden.hidden} onToggle={currentHidden.toggle} alwaysVisible={alwaysVisible} />{!errorTab && <Button variant="primary" icon="download" onClick={exportCsv} disabled={exporting}>{exportLabel}</Button>}</div></div></Panel>;
}

function UsageTabs({ enabled, tab, setTab, locale, t }) {
  if (!enabled) return null;
  return <div className="console-tabs console-usage-tabs"><button className={tab === "usage" ? "is-active" : ""} onClick={() => setTab("usage")}>{localized(locale, "用量记录", "Usage")}</button><button className={tab === "errors" ? "is-active" : ""} onClick={() => setTab("errors")}>{t("usage.errors")}</button></div>;
}

function ErrorRecords({ loading, columns, errors, sort, setSort, paging, setPaging, openError }) {
  if (loading) return <Spinner />;
  return <><DataTable columns={columns} rows={errors.items} sortKey={sort.key} sortOrder={sort.order} onSort={(key, order) => { setSort({ key, order }); setPaging((current) => ({ ...current, page: 1 })); }} onRowClick={openError} /><Pagination page={paging.page} pageSize={paging.pageSize} total={errors.total} pages={errors.pages} onPageChange={(page) => setPaging((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })} /></>;
}

function UsageRecords({ state, columns, data, sort, setSort, paging, setPaging, loadUsage }) {
  if (state.loading) return <Spinner />;
  if (state.error) return <ErrorState message={state.error} onRetry={loadUsage} />;
  return <><DataTable columns={columns} rows={data.items} sortKey={sort.key} sortOrder={sort.order} onSort={(key, order) => { setSort({ key, order }); setPaging((current) => ({ ...current, page: 1 })); }} /><Pagination page={paging.page} pageSize={paging.pageSize} total={data.total} pages={data.pages} onPageChange={(page) => setPaging((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })} /></>;
}

function RecordsPanel({ tab, t, data, errors, geoEnabled, setGeoEnabled, state, visibleErrorColumns, errorSort, setErrorSort, errorPaging, setErrorPaging, openError, visibleUsageColumns, sort, setSort, paging, setPaging, loadUsage }) {
  const errorTab = tab === "errors";
  const rows = errorTab ? errors.items : data.items;
  const ipCount = rows.filter((row) => row.ip_address || row.client_ip).length;
  const actions = <IpGeoBatchToolbar enabled={geoEnabled} onToggle={() => setGeoEnabled((value) => !value)} count={ipCount} />;
  return <Panel title={errorTab ? t("usage.errors") : t("usage.records")} actions={actions}>{errorTab ? <ErrorRecords loading={state.errorLoading} columns={visibleErrorColumns} errors={errors} sort={errorSort} setSort={setErrorSort} paging={errorPaging} setPaging={setErrorPaging} openError={openError} /> : <UsageRecords state={state} columns={visibleUsageColumns} data={data} sort={sort} setSort={setSort} paging={paging} setPaging={setPaging} loadUsage={loadUsage} />}</Panel>;
}

function ErrorDetailModal({ detail, locale, onClose }) {
  let content = null;
  if (detail?.loading) content = <Spinner />;
  else if (detail?.item) content = <ErrorDetail item={detail.item} />;
  return <Modal open={Boolean(detail)} title={localized(locale, "错误请求详情", "Error request details")} onClose={onClose} size="large">{content}</Modal>;
}

export function UsagePage() {
  const { t, locale, formatNumber, formatCurrency, formatDate } = useLocale();
  const { settings, notify } = useConsole();
  const [filters, setFilters] = useState(emptyFilters);
  const [errorFilters, setErrorFilters] = useState(emptyErrorFilters);
  const [paging, setPaging] = useState({ page: 1, pageSize: 20 });
  const [errorPaging, setErrorPaging] = useState({ page: 1, pageSize: 20 });
  const [sort, setSort] = useState({ key: "created_at", order: "desc" });
  const [errorSort, setErrorSort] = useState({ key: "created_at", order: "desc" });
  const [granularity, setGranularity] = useState("hour");
  const [tab, setTab] = useState("usage");
  const [options, setOptions] = useState({ keys: [], groups: [] });
  const [data, setData] = useState({ items: [], total: 0, pages: 1, stats: null, models: [], groups: [], endpoints: [], trend: [] });
  const [errors, setErrors] = useState({ items: [], total: 0, pages: 1 });
  const [state, setState] = useState({ loading: true, chartsLoading: true, error: "", errorLoading: false });
  const [detail, setDetail] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [geoEnabled, setGeoEnabled] = useState(false);
  const requestRef = useRef(null);
  const errorRequestRef = useRef(null);
  const detailRef = useRef(null);
  const detailControllerRef = useRef(null);
  const errorEnabled = settings?.allow_user_view_error_requests === true;
  const usageHidden = useHiddenColumns("user-usage-hidden-columns", ["user_agent"]);
  const errorHidden = useHiddenColumns("user-usage-error-hidden-columns", ["user_agent"]);

  const loadUsage = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState((current) => ({ ...current, loading: true, chartsLoading: true, error: "" }));
    const base = usageFilters(filters);
    const listQuery = { ...base, page: paging.page, page_size: paging.pageSize, sort_by: sort.key, sort_order: sort.order };
    const chartQuery = { ...base, granularity, include_trend: true, include_model_stats: false, include_group_stats: true };
    const results = await Promise.allSettled([usageApi.list(listQuery, controller.signal), usageApi.stats(base, controller.signal), usageApi.dashboardModels({ ...base, model_source: "requested" }, controller.signal), usageApi.dashboardSnapshot(chartQuery, controller.signal)]);
    if (controller.signal.aborted) return;
    if (results[0].status === "rejected") { setState((current) => ({ ...current, loading: false, chartsLoading: false, error: results[0].reason.message })); return; }
    const list = results[0].value;
    const stats = results[1].status === "fulfilled" ? results[1].value : null;
    const models = results[2].status === "fulfilled" ? results[2].value?.models || [] : [];
    const snapshot = results[3].status === "fulfilled" ? results[3].value || {} : {};
    setData({ items: list.items || [], total: Number(list.total || 0), pages: Number(list.pages || 1), stats, models, groups: snapshot.groups || [], endpoints: stats?.endpoints || [], trend: snapshot.trend || [] });
    setState((current) => ({ ...current, loading: false, chartsLoading: false, error: "" }));
  }, [filters, granularity, paging, sort]);

  const loadErrors = useCallback(async () => {
    if (!errorEnabled) return;
    errorRequestRef.current?.abort();
    const controller = new AbortController();
    errorRequestRef.current = controller;
    setState((current) => ({ ...current, errorLoading: true }));
    try {
      const response = await usageApi.errors(clean({ ...errorFilters, start_date: filters.start_date, end_date: filters.end_date, page: errorPaging.page, page_size: errorPaging.pageSize, sort_by: errorSortKey(errorSort.key), sort_order: errorSort.order }), controller.signal);
      if (controller.signal.aborted) return;
      setErrors({ items: response.items || [], total: Number(response.total || 0), pages: Number(response.pages || 1) });
    } catch (error) { if (error.name !== "AbortError") notify("error", error.message); } finally { if (!controller.signal.aborted) setState((current) => ({ ...current, errorLoading: false })); }
  }, [errorEnabled, errorFilters, errorPaging, errorSort, filters.end_date, filters.start_date, notify]);

  useEffect(() => { loadUsage(); return () => requestRef.current?.abort(); }, [loadUsage]);
  useEffect(() => { if (tab === "errors") loadErrors(); }, [loadErrors, tab]);
  useEffect(() => () => { errorRequestRef.current?.abort(); detailControllerRef.current?.abort(); detailRef.current = null; }, []);
  useEffect(() => { const controller = new AbortController(); Promise.allSettled([keysApi.list(1, 100, {}, controller.signal), groupsApi.available()]).then(([keys, groups]) => { if (!controller.signal.aborted) setOptions({ keys: keys.value?.items || [], groups: Array.isArray(groups.value) ? groups.value : groups.value?.items || [] }); }); return () => controller.abort(); }, []);
  useEffect(() => { if (!errorEnabled && tab === "errors") setTab("usage"); }, [errorEnabled, tab]);

  const setFilter = (key, value) => { setFilters((current) => ({ ...current, [key]: value })); setPaging((current) => ({ ...current, page: 1 })); };
  const setErrorFilter = (key, value) => { setErrorFilters((current) => ({ ...current, [key]: value })); setErrorPaging((current) => ({ ...current, page: 1 })); };
  const reset = () => { const range = last24Hours(); setFilters({ ...emptyFilters, ...range }); setErrorFilters(emptyErrorFilters); setGranularity("hour"); setPaging((current) => ({ ...current, page: 1 })); setErrorPaging((current) => ({ ...current, page: 1 })); };
  const changeRange = (range) => { setFilters((current) => ({ ...current, ...range })); const days = Math.round((new Date(range.end_date) - new Date(range.start_date)) / 86400000); setGranularity(days <= 1 ? "hour" : "day"); setPaging((current) => ({ ...current, page: 1 })); };
  const openError = async (item) => { detailControllerRef.current?.abort(); const controller = new AbortController(); const request = Symbol("error-detail"); detailControllerRef.current = controller; detailRef.current = request; setDetail({ loading: true, item }); try { const full = await usageApi.error(item.id, controller.signal); if (detailRef.current === request) setDetail({ loading: false, item: full }); } catch { if (!controller.signal.aborted && detailRef.current === request) setDetail({ loading: false, item }); } };
  const exportCsv = async () => {
    if (!data.total) return notify("warning", locale === "zh" ? "没有可导出的数据。" : "There is no data to export.");
    setExporting(true);
    try {
      const rows = [];
      const pages = Math.ceil(data.total / 100);
      for (let page = 1; page <= pages; page += 1) { const response = await usageApi.list({ ...usageFilters(filters), page, page_size: 100, sort_by: sort.key, sort_order: sort.order }); rows.push(...(response.items || [])); }
      const headers = ["Time", "API Key Name", "Model", "Reasoning Effort", "Inbound Endpoint", "IP Address", "Type", "Billing Mode", "Input Tokens", "Output Tokens", "Cache Read Tokens", "Cache Creation Tokens", "Rate Multiplier", "Billed Cost", "Original Cost", "First Token (ms)", "Duration (ms)"];
      downloadBlob(new Blob([`\uFEFF${headers.join(",")}\n${rows.map(csvRow).join("\n")}`], { type: "text/csv;charset=utf-8" }), `usage_${filters.start_date}_to_${filters.end_date}.csv`);
      notify("success", locale === "zh" ? "CSV 已导出。" : "CSV exported.");
    } catch (error) { notify("error", error.message); } finally { setExporting(false); }
  };

  const modelOptions = useMemo(() => [...new Set([...data.models.map((item) => item.model), filters.model].filter(Boolean))].sort(), [data.models, filters.model]);
  const errorModelOptions = useMemo(() => [...new Set([...errors.items.map((item) => item.model), errorFilters.model].filter(Boolean))].sort(), [errorFilters.model, errors.items]);
  const usageColumns = useMemo(() => [
    { key: "api_key", label: t("usage.key"), render: (row) => <div className="console-key-name"><strong>{row.api_key?.name || "—"}</strong>{!row.api_key && row.api_key_id && <small>{locale === "zh" ? "密钥已删除" : "Key deleted"}</small>}</div> },
    { key: "model", label: t("usage.model"), sortable: true, render: (row) => <ModelCell row={row} /> },
    { key: "reasoning_effort", label: locale === "zh" ? "推理强度" : "Reasoning effort", render: (row) => reasoningLabel(row.reasoning_effort) },
    { key: "endpoint", label: locale === "zh" ? "端点" : "Endpoint", render: (row) => <code className="console-endpoint-code">{row.inbound_endpoint || "—"}</code> },
    { key: "ip_address", label: "IP", render: (row) => <IpGeoCell ip={row.ip_address} enabled={geoEnabled} /> },
    { key: "group", label: t("usage.group"), render: (row) => <GroupBadge name={row.group?.name} platform={row.group?.platform} /> },
    { key: "stream", label: t("usage.type"), render: (row) => <span className={`console-type-badge is-${requestType(row)}`}>{typeLabel(requestType(row))}</span> },
    { key: "billing_mode", label: t("usage.billing"), render: (row) => <span className="console-billing-badge">{billingMode(row).replaceAll("_", " ")}</span> },
    { key: "tokens", label: t("usage.tokens"), render: (row) => <TokenCell row={row} formatNumber={formatNumber} locale={locale} /> },
    { key: "cost", label: locale === "zh" ? "费用" : "Cost", render: (row) => <CostCell row={row} formatCurrency={formatCurrency} locale={locale} /> },
    { key: "latency", label: locale === "zh" ? "延迟" : "Latency", render: (row) => <LatencyCell row={row} locale={locale} /> },
    { key: "created_at", label: locale === "zh" ? "时间" : "Time", sortable: true, render: (row) => formatDate(row.created_at) },
    { key: "user_agent", label: "User-Agent", render: (row) => <span className="console-user-agent" title={row.user_agent}>{row.user_agent || "—"}</span> },
  ], [formatCurrency, formatDate, formatNumber, geoEnabled, locale, t]);
  const errorColumns = useMemo(() => [
    { key: "key_name", label: locale === "zh" ? "密钥名称" : "Key name", render: (row) => <div className="console-key-name"><strong>{row.key_name || "—"}</strong>{row.key_deleted && <small>{locale === "zh" ? "已删除" : "Deleted"}</small>}</div> },
    { key: "model", label: t("usage.model"), sortable: true }, { key: "endpoint", label: locale === "zh" ? "端点" : "Endpoint", render: (row) => <code className="console-endpoint-code">{row.inbound_endpoint || "—"}</code> },
    { key: "client_ip", label: "IP", render: (row) => <IpGeoCell ip={row.client_ip} enabled={geoEnabled} /> }, { key: "group", label: t("usage.group"), render: (row) => row.group_name || "—" },
    { key: "type", label: t("usage.type"), render: (row) => <span className={`console-type-badge is-${requestType(row)}`}>{typeLabel(requestType(row))}</span> },
    { key: "platform", label: locale === "zh" ? "平台" : "Platform" }, { key: "category", label: locale === "zh" ? "分类" : "Category", render: (row) => <span className="console-chip">{row.category || "—"}</span> },
    { key: "status", label: locale === "zh" ? "状态" : "Status", sortable: true, render: (row) => <StatusBadge status="failed" label={String(row.status_code || "—")} /> },
    { key: "message", label: locale === "zh" ? "错误信息" : "Message", render: (row) => <span className="console-clamp">{row.message || "—"}</span> },
    { key: "created_at", label: locale === "zh" ? "时间" : "Time", sortable: true, render: (row) => formatDate(row.created_at) },
    { key: "user_agent", label: "User-Agent", render: (row) => <span className="console-user-agent" title={row.user_agent}>{row.user_agent || "—"}</span> },
  ], [formatDate, geoEnabled, locale, t]);
  const visibleUsageColumns = usageColumns.filter((column) => column.key === "created_at" || !usageHidden.hidden.has(column.key));
  const visibleErrorColumns = errorColumns.filter((column) => ["status", "created_at"].includes(column.key) || !errorHidden.hidden.has(column.key));
  const currentColumns = tab === "errors" ? errorColumns : usageColumns;
  const currentHidden = tab === "errors" ? errorHidden : usageHidden;

  const closeDetail = () => { detailControllerRef.current?.abort(); detailRef.current = null; setDetail(null); };
  return <Page title={t("usage.title")} subtitle={t("usage.subtitle")} className="console-usage-page"><UsageStats stats={data.stats} loading={state.chartsLoading} /><TimeRangePanel filters={filters} granularity={granularity} setGranularity={setGranularity} changeRange={changeRange} locale={locale} /><UsageChartsPanel data={data} loading={state.chartsLoading} locale={locale} /><UsageFilterPanel tab={tab} filters={filters} errorFilters={errorFilters} options={options} modelOptions={modelOptions} errorModelOptions={errorModelOptions} setFilter={setFilter} setErrorFilter={setErrorFilter} currentColumns={currentColumns} currentHidden={currentHidden} loadUsage={loadUsage} loadErrors={loadErrors} state={state} reset={reset} exportCsv={exportCsv} exporting={exporting} locale={locale} t={t} /><UsageTabs enabled={errorEnabled} tab={tab} setTab={setTab} locale={locale} t={t} /><RecordsPanel tab={tab} t={t} data={data} errors={errors} geoEnabled={geoEnabled} setGeoEnabled={setGeoEnabled} state={state} visibleErrorColumns={visibleErrorColumns} errorSort={errorSort} setErrorSort={setErrorSort} errorPaging={errorPaging} setErrorPaging={setErrorPaging} openError={openError} visibleUsageColumns={visibleUsageColumns} sort={sort} setSort={setSort} paging={paging} setPaging={setPaging} loadUsage={loadUsage} /><ErrorDetailModal detail={detail} locale={locale} onClose={closeDetail} /></Page>;
}
