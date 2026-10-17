import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { groupsApi, keysApi, usageApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { PlatformMark } from "../GroupBadge";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, DataTable, ErrorState, Field, Modal, Page, Pagination, PaginationSkeleton, Panel, SelectInput, Spinner, TruncatedText } from "../UI";
import { formatDuration, formatTokenMillions } from "../utils";
import { CompactTabs, DateRangePicker, useHiddenColumns } from "../components/ConsoleControls";
import { IpGeoBatchToolbar, IpGeoCell } from "../components/IpGeo";

function localDate(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function last24Hours() {
  return { start_date: localDate(new Date(Date.now() - 86400000)), end_date: localDate(new Date()) };
}

const emptyFilters = { ...last24Hours(), api_key_id: "", group_id: "", model: "", request_type: "" };
const emptyErrorFilters = { api_key_id: "", model: "", category: "", status_code: "" };
const MAX_USAGE_RECORDS = 1000;

function clean(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== "" && value !== null && value !== undefined));
}

function appendUsageItems(existing, next, maxItems = MAX_USAGE_RECORDS) {
  const remaining = Math.max(maxItems - existing.length, 0);
  if (!remaining) return [];
  const ids = new Set(existing.map((item) => item.id).filter((id) => id != null));
  const appended = [];
  for (const item of next) {
    if (item.id != null && ids.has(item.id)) continue;
    if (item.id != null) ids.add(item.id);
    appended.push(item);
    if (appended.length >= remaining) break;
  }
  return appended;
}

function requestType(row) {
  const numericTypes = { 0: "unknown", 1: "sync", 2: "stream", 3: "ws_v2", 4: "cyber" };
  if (typeof row.request_type === "number") return numericTypes[row.request_type] || "unknown";
  if (["unknown", "sync", "stream", "ws_v2", "cyber"].includes(row.request_type)) return row.request_type;
  if (row.openai_ws_mode) return "ws_v2";
  return row.stream ? "stream" : "sync";
}

function typeLabel(type, t) {
  const keys = {
    stream: "usage.requestType.stream",
    sync: "usage.requestType.sync",
    ws_v2: "usage.requestType.websocket",
    cyber: "usage.requestType.cyber",
    unknown: "usage.requestType.unknown",
  };
  return t(keys[type] || keys.unknown);
}

function billingMode(row) {
  if (Number(row.image_count) > 0) return "image";
  return row.billing_mode || (row.billing_type === 1 ? "subscription" : "token");
}

function FilterSelect({ label, value, onChange, children }) {
  return <Field label={label}><SelectInput value={value} onChange={(event) => onChange(event.target.value)}>{children}</SelectInput></Field>;
}

function localized(locale, zh, en) {
  return locale === "zh" ? zh : en;
}

function DateRangeFilter({ filters, onChange, locale }) {
  return <Field label={localized(locale, "时间范围", "Time range")} className="console-usage-range-field"><DateRangePicker startDate={filters.start_date} endDate={filters.end_date} onChange={onChange} /></Field>;
}

function UsageFilters({ filters, setFilter, apiKeys, groups, models, locale, t }) {
  return <div className="console-usage-filters console-usage-filters--usage"><DateRangeFilter filters={filters} onChange={(range) => { setFilter("start_date", range.start_date); setFilter("end_date", range.end_date); }} locale={locale} /><FilterSelect label={t("usage.key")} value={filters.api_key_id} onChange={(value) => setFilter("api_key_id", value)}><option value="">{localized(locale, "全部密钥", "All API keys")}</option>{apiKeys.map((key) => <option key={key.id} value={key.id}>{key.name}</option>)}</FilterSelect><FilterSelect label={t("usage.model")} value={filters.model} onChange={(value) => setFilter("model", value)}><option value="">{localized(locale, "全部模型", "All models")}</option>{models.map((model) => <option key={model} value={model}>{model}</option>)}</FilterSelect><FilterSelect label={t("usage.group")} value={filters.group_id} onChange={(value) => setFilter("group_id", value)}><option value="">{localized(locale, "全部分组", "All groups")}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</FilterSelect><FilterSelect label={t("usage.type")} value={filters.request_type} onChange={(value) => setFilter("request_type", value)}><option value="">{localized(locale, "全部类型", "All types")}</option><option value="stream">{t("usage.requestType.stream")}</option><option value="sync">{t("usage.requestType.sync")}</option></FilterSelect></div>;
}

function ErrorFilters({ filters, setFilter, apiKeys, models, dateFilters, changeRange, locale, t }) {
  return <div className="console-usage-filters console-usage-filters--errors"><DateRangeFilter filters={dateFilters} onChange={changeRange} locale={locale} /><FilterSelect label={t("usage.key")} value={filters.api_key_id} onChange={(value) => setFilter("api_key_id", value)}><option value="">{localized(locale, "全部密钥", "All API keys")}</option>{apiKeys.map((key) => <option key={key.id} value={key.id}>{key.name}</option>)}</FilterSelect><FilterSelect label={t("usage.model")} value={filters.model} onChange={(value) => setFilter("model", value)}><option value="">{localized(locale, "全部模型", "All models")}</option>{models.map((model) => <option key={model} value={model}>{model}</option>)}</FilterSelect><FilterSelect label={locale === "zh" ? "错误分类" : "Category"} value={filters.category} onChange={(value) => setFilter("category", value)}><option value="">{locale === "zh" ? "全部分类" : "All categories"}</option>{["auth", "rate_limit", "quota", "invalid_request", "service_unavailable", "upstream", "internal", "cyber"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</FilterSelect><FilterSelect label={locale === "zh" ? "状态码" : "Status"} value={filters.status_code} onChange={(value) => setFilter("status_code", value)}><option value="">{locale === "zh" ? "全部状态" : "All statuses"}</option>{[400, 401, 403, 404, 408, 409, 422, 429, 500, 502, 503, 504].map((code) => <option key={code} value={code}>{code}</option>)}</FilterSelect></div>;
}

// Intl formatters are costly to construct; table cells share one per locale.
const formatterCache = new Map();

function cachedFormatter(kind, locale) {
  const key = `${kind}:${locale}`;
  if (!formatterCache.has(key)) {
    const language = locale === "zh" ? "zh-CN" : "en-US";
    formatterCache.set(key, kind === "time"
      ? new Intl.DateTimeFormat(language, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
      : new Intl.NumberFormat(language, { maximumFractionDigits: 0 }));
  }
  return formatterCache.get(key);
}

/* Usage ledger cells: one line each, so rows read as an even grid. */

function EmptyValue() {
  return <span className="console-ledger-empty">—</span>;
}

function UsageTimeCell({ value, locale }) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <EmptyValue />;
  return <time className="console-ledger-time" dateTime={date.toISOString()} title={fullTime(date)}>{cachedFormatter("time", locale).format(date)}</time>;
}

function fullTime(date) {
  return `${localDate(date)} ${date.toTimeString().slice(0, 8)}`;
}

function GroupCell({ name, platform }) {
  if (!name) return <EmptyValue />;
  return <span className="console-ledger-group"><PlatformMark platform={platform} /><TruncatedText value={name} /></span>;
}

function KeyCell({ name, deleted, locale }) {
  return <span className="console-ledger-inline"><TruncatedText value={name} />{deleted && <small>{localized(locale, "已删除", "Deleted")}</small>}</span>;
}

function isImageUsage(row) {
  const mode = billingMode(row);
  return mode === "image" || mode === "per_request";
}

function tokenBreakdown(row, locale) {
  const labels = locale === "zh" ? { input: "输入", output: "输出", read: "缓存读取", write: "缓存创建" } : { input: "Input", output: "Output", read: "Cache read", write: "Cache creation" };
  const format = (value) => cachedFormatter("count", locale).format(numeric(value));
  return [
    `${labels.input}: ${format(row.input_tokens)}`,
    `${labels.output}: ${format(row.output_tokens)}`,
    `${labels.write}: ${format(row.cache_creation_tokens)} (5m ${format(row.cache_creation_5m_tokens)}, 1h ${format(row.cache_creation_1h_tokens)})`,
    `${labels.read}: ${format(row.cache_read_tokens)}`,
  ].join("\n");
}

function NumberValue({ value, unit, title, tone }) {
  return <span className="console-ledger-number" title={title} data-tone={tone}>{value}{unit && <small>{unit}</small>}</span>;
}

function TokenValue({ row, field, locale }) {
  return <NumberValue value={cachedFormatter("count", locale).format(numeric(row[field]))} unit="tok" title={tokenBreakdown(row, locale)} />;
}

function InputTokensCell({ row, locale }) {
  if (isImageUsage(row)) return <NumberValue value={row.image_count || 1} unit={localized(locale, "张", "img")} />;
  return <TokenValue row={row} field="input_tokens" locale={locale} />;
}

function OutputTokensCell({ row, locale }) {
  if (isImageUsage(row)) {
    const size = row.image_output_size || row.image_size || row.image_input_size;
    return size ? <span>{size}</span> : <EmptyValue />;
  }
  return <TokenValue row={row} field="output_tokens" locale={locale} />;
}

function CacheReadCell({ row, locale }) {
  if (isImageUsage(row) || numeric(row.cache_read_tokens) <= 0) return <EmptyValue />;
  return <TokenValue row={row} field="cache_read_tokens" locale={locale} />;
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

// Dollar amounts share the ledger number style: spaced "$" prefix, muted unit suffix.
function MoneyValue({ value, digits = 6, unit, formatNumber }) {
  const amount = formatNumber(numeric(value), { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return <span className="console-ledger-number"><small className="is-prefix">$</small>{amount}{unit && <small>{unit}</small>}</span>;
}

export function CostCell({ row, formatNumber, locale }) {
  const longContextLabel = localized(locale, "长上下文", "Long context");
  const longContextHint = localized(locale, "已应用长上下文计费。输入和输出费率取决于定价档位，并非统一倍率。", "Long-context pricing was applied. Input and output rates depend on the pricing tier, not a uniform multiplier.");
  return <span className="console-ledger-cost"><MoneyValue value={row.actual_cost} digits={4} formatNumber={formatNumber} />{row.long_context_billing_applied && <small className="console-long-context-marker" title={longContextHint}>{longContextLabel}</small>}</span>;
}

// Split a duration into value and unit, e.g. 3800 → ["3.8", "s"], 350 → ["350", "ms"].
function latencyParts(value) {
  const [amount, unit] = formatDuration(Number(value)).split(" ");
  return unit === "ms" ? [amount, unit] : [String(Number.parseFloat(amount)), unit];
}

function firstTokenStatus(value) {
  if (value == null || value === "" || !Number.isFinite(Number(value)) || Number(value) < 0) return "unknown";
  if (Number(value) > 30000) return "slow";
  if (Number(value) > 10000) return "moderate";
  if (Number(value) <= 2000) return "fast";
  return "normal";
}

function totalLatencyStatus(value) {
  if (value == null || value === "" || !Number.isFinite(Number(value)) || Number(value) < 0) return "unknown";
  if (Number(value) > 180000) return "slow";
  if (Number(value) > 60000) return "moderate";
  return "normal";
}

// Only slow responses are tinted; normal values stay neutral like the rest of the row.
function FirstTokenCell({ row, locale }) {
  const status = firstTokenStatus(row.first_token_ms);
  if (status === "unknown") return <EmptyValue />;
  const labels = locale === "zh" ? { fast: "快", normal: "正常", moderate: "偏慢", slow: "较慢" } : { fast: "Fast", normal: "Normal", moderate: "Elevated", slow: "Slow" };
  const hint = localized(locale, "首 Token 响应参考：≤2s 快，2–10s 正常，10–30s 偏慢，>30s 较慢；仅评价响应速度。", "First-token response guide: ≤2s fast, 2–10s normal, 10–30s elevated, >30s slow; indicates response speed only.");
  const [value, unit] = latencyParts(row.first_token_ms);
  return <NumberValue value={value} unit={unit} tone={status} title={`${labels[status]} · ${hint}`} />;
}

function DurationCell({ row }) {
  const status = totalLatencyStatus(row.duration_ms);
  if (status === "unknown") return <EmptyValue />;
  const [value, unit] = latencyParts(row.duration_ms);
  return <NumberValue value={value} unit={unit} tone={status} />;
}

function UsageSummary({ summary, loading }) {
  const { locale, formatNumber } = useLocale();
  const formatCost = (value) => formatNumber(Number(value), { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", minimumFractionDigits: 4, maximumFractionDigits: 4 });
  const metrics = [
    { key: "requests", icon: "send", label: localized(locale, "总请求数", "Total requests"), value: summary?.total_requests, format: (value) => formatNumber(Number(value)) },
    { key: "tokens", icon: "coins", label: localized(locale, "总 Token", "Total tokens"), value: summary?.total_tokens, format: formatTokenMillions },
    { key: "spend", icon: "wallet", label: localized(locale, "总消费", "Total spend"), value: summary?.total_actual_cost, format: formatCost },
    { key: "latency", icon: "hourglass", label: localized(locale, "平均耗时", "Average duration"), value: summary?.average_duration_ms, format: formatDuration },
  ];
  return <section className="console-usage-summary" aria-busy={loading} aria-label={localized(locale, "用量汇总", "Usage summary")}>{metrics.map((metric) => <div key={metric.key} className={`console-usage-summary-metric is-${metric.key}`}><i className="console-usage-summary-icon"><Icon name={metric.icon} size={21} /></i><span>{metric.label}</span><strong>{metric.value == null ? "—" : metric.format(metric.value)}</strong></div>)}</section>;
}

function UsageFilterToolbar({ loadUsage, loadErrors, tab, state, t }) {
  const refresh = () => {
    loadUsage();
    if (tab === "errors") loadErrors();
  };
  return <Button icon="refresh" onClick={refresh} loading={state.loading || state.errorLoading}>{t("common.refresh")}</Button>;
}

function UsageFilterPanel({ toolbar, tab, filters, errorFilters, options, modelOptions, errorModelOptions, setFilter, setErrorFilter, reset, changeRange, locale, t }) {
  const errorTab = tab === "errors";
  const filtersNode = errorTab
    ? <ErrorFilters filters={errorFilters} setFilter={setErrorFilter} apiKeys={options.keys} models={errorModelOptions} dateFilters={filters} changeRange={changeRange} locale={locale} t={t} />
    : <UsageFilters filters={filters} setFilter={setFilter} apiKeys={options.keys} groups={options.groups} models={modelOptions} locale={locale} t={t} />;
  return <Panel className="console-usage-filter-panel"><div className="console-usage-filter-content"><div className="console-filter-action-layout">{filtersNode}<div className="console-usage-filter-actions">{toolbar}<Button className="console-usage-reset" icon="reset" onClick={reset}>{localized(locale, "重置", "Reset")}</Button></div></div></div></Panel>;
}

function UsageTabs({ enabled, tab, setTab, locale, t }) {
  if (!enabled) return null;
  const items = [
    { value: "usage", label: localized(locale, "用量记录", "Usage records") },
    { value: "errors", label: t("usage.errors") },
  ];
  return <CompactTabs value={tab} items={items} onChange={setTab} className="console-usage-tabs" label={localized(locale, "用量类型", "Usage type")} />;
}

function ErrorRecords({ loading, columns, errors, sort, setSort, paging, setPaging, openError }) {
  const skeleton = loading && !errors.items.length;
  return <><DataTable columns={columns} rows={errors.items} loading={skeleton} loadingRows={paging.pageSize} hoverableRows={false} onRowClick={openError} sortKey={sort.key} sortOrder={sort.order} onSort={(key, order) => { setSort({ key, order }); setPaging((current) => ({ ...current, page: 1 })); }} />{skeleton ? <PaginationSkeleton /> : <Pagination page={paging.page} pageSize={paging.pageSize} total={errors.total} pages={errors.pages} onPageChange={(page) => setPaging((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })} />}</>;
}

function UsageRecords({ state, columns, data, sort, onSort, paging, setPaging, loadUsage }) {
  const { t } = useLocale();
  const sentinelRef = useRef(null);
  const loadingMoreRef = useRef(false);
  const hasMore = paging.page < data.pages && data.items.length < data.total && data.items.length < MAX_USAGE_RECORDS;

  useEffect(() => {
    if (!state.loading) loadingMoreRef.current = false;
    if (state.loading || state.error || !hasMore || !sentinelRef.current || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      setPaging((current) => ({ ...current, page: current.page + 1 }));
    }, { rootMargin: "0px 0px 160px 0px" });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, setPaging, state.error, state.loading]);

  if (state.loading && !data.items.length) return <DataTable columns={columns} rows={data.items} loading loadingRows={paging.pageSize} sortKey={sort.key} sortOrder={sort.order} onSort={onSort} hoverableRows={false} />;
  if (state.error && !data.items.length) return <ErrorState message={state.error} onRetry={loadUsage} />;
  return <><DataTable columns={columns} rows={data.items} sortKey={sort.key} sortOrder={sort.order} onSort={onSort} hoverableRows={false} virtualized estimateRowHeight={52} />{state.error ? <ErrorState message={state.error} onRetry={loadUsage} /> : (state.loading || hasMore || data.items.length > 0) && <div ref={sentinelRef} className="console-usage-load-more" role="status" aria-live="polite">{state.loading ? <><Spinner /><span>{t("usage.loadingMore")}</span></> : hasMore ? null : data.items.length >= MAX_USAGE_RECORDS && data.total > data.items.length ? t("usage.loadLimitReached", { limit: MAX_USAGE_RECORDS }) : t("usage.loadedAll")}</div>}</>;
}

// Same dialog treatment as announcements: blurred page, framed card, tinted header.
function ErrorDetailModal({ item, onClose }) {
  const { t, locale } = useLocale();
  const date = item ? new Date(item.created_at) : null;
  const fields = item ? [
    [localized(locale, "状态码", "Status"), item.status_code ? <NumberValue value={item.status_code} tone="slow" /> : <EmptyValue />],
    [t("usage.model"), item.model || <EmptyValue />],
    [t("usage.group"), <GroupCell name={item.group_name} platform={item.platform} />],
    [t("usage.key"), <KeyCell name={item.key_name} deleted={item.key_deleted} locale={locale} />],
    [t("usage.type"), typeLabel(requestType(item), t)],
    [localized(locale, "分类", "Category"), item.category || <EmptyValue />],
    [localized(locale, "端点", "Endpoint"), item.inbound_endpoint ? <code>{item.inbound_endpoint}</code> : <EmptyValue />],
    [localized(locale, "客户端 IP", "Client IP"), item.client_ip || <EmptyValue />],
    ["User-Agent", item.user_agent || <EmptyValue />],
  ] : [];
  return <Modal className="console-announcement-modal console-error-detail-modal" open={Boolean(item)} title={localized(locale, "错误请求详情", "Error request details")} description={date && !Number.isNaN(date.getTime()) ? fullTime(date) : ""} onClose={onClose} footer={<Button variant="primary" icon="check" onClick={onClose}>{t("common.confirm")}</Button>}>
    {item && <div className="console-error-detail">
      <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <section><h3>{localized(locale, "错误信息", "Message")}</h3><p>{item.message || "—"}</p></section>
    </div>}
  </Modal>;
}

function RecordsPanel({ tabs, tab, data, errors, geoEnabled, setGeoEnabled, state, visibleErrorColumns, errorSort, setErrorSort, errorPaging, setErrorPaging, openError, visibleUsageColumns, sort, onUsageSort, paging, setPaging, loadUsage }) {
  const errorTab = tab === "errors";
  const actions = <IpGeoBatchToolbar enabled={geoEnabled} onToggle={() => setGeoEnabled((value) => !value)} />;
  return <Panel className="console-usage-records-panel" aria-busy={errorTab ? state.errorLoading : state.loading}><div className="console-usage-record-tools">{tabs}{actions}</div>{errorTab ? <ErrorRecords loading={state.errorLoading} columns={visibleErrorColumns} errors={errors} sort={errorSort} setSort={setErrorSort} paging={errorPaging} setPaging={setErrorPaging} openError={openError} /> : <UsageRecords state={state} columns={visibleUsageColumns} data={data} sort={sort} onSort={onUsageSort} paging={paging} setPaging={setPaging} loadUsage={loadUsage} />}</Panel>;
}

export function UsagePage() {
  const { t, locale, formatNumber } = useLocale();
  const { settings, notify } = useConsole();
  const [filters, setFilters] = useState(emptyFilters);
  const [errorFilters, setErrorFilters] = useState(emptyErrorFilters);
  const [paging, setPaging] = useState({ page: 1, pageSize: 20 });
  const [errorPaging, setErrorPaging] = useState({ page: 1, pageSize: 20 });
  const [sort, setSort] = useState({ key: "created_at", order: "desc" });
  const [errorSort, setErrorSort] = useState({ key: "created_at", order: "desc" });
  const [tab, setTab] = useState("usage");
  const [options, setOptions] = useState({ keys: [], groups: [] });
  const [data, setData] = useState({ items: [], total: 0, pages: 1, models: [], summary: null });
  const [errors, setErrors] = useState({ items: [], total: 0, pages: 1 });
  const [state, setState] = useState({ loading: true, error: "", errorLoading: false });
  const [geoEnabled, setGeoEnabled] = useState(false);
  const [errorDetail, setErrorDetail] = useState(null);
  const requestRef = useRef(null);
  const errorRequestRef = useRef(null);
  const errorEnabled = settings?.allow_user_view_error_requests === true;
  const usageHidden = useHiddenColumns("user-usage-hidden-columns", ["user_agent"]);
  const errorHidden = useHiddenColumns("user-usage-error-hidden-columns", ["user_agent"]);

  const loadUsage = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setState((current) => ({ ...current, loading: true, error: "" }));
    const base = clean(filters);
    const listQuery = { ...base, page: paging.page, page_size: paging.pageSize, sort_by: sort.key, sort_order: sort.order };
    const results = await Promise.allSettled(paging.page === 1
      ? [usageApi.list(listQuery, controller.signal), usageApi.dashboardModels({ ...base, model_source: "requested" }, controller.signal), usageApi.stats(base, controller.signal)]
      : [usageApi.list(listQuery, controller.signal)]);
    if (controller.signal.aborted) return;
    if (results[0].status === "rejected") { setState((current) => ({ ...current, loading: false, error: results[0].reason.message })); return; }
    const list = results[0].value;
    const models = paging.page === 1 ? (results[1].status === "fulfilled" ? results[1].value?.models || [] : []) : null;
    const summary = results[2]?.status === "fulfilled" ? results[2].value : null;
    const items = list.items || [];
    const pages = items.length ? Number(list.pages || 1) : Math.min(Number(list.pages || 1), paging.page);
    setData((current) => ({
      items: paging.page === 1 ? items.slice(0, MAX_USAGE_RECORDS) : [...current.items, ...appendUsageItems(current.items, items)],
      total: Number(list.total || 0),
      pages,
      models: models ?? current.models,
      summary: paging.page === 1 ? summary : current.summary,
    }));
    setState((current) => ({ ...current, loading: false, error: "" }));
  }, [filters, paging, sort]);

  const loadErrors = useCallback(async () => {
    if (!errorEnabled) return;
    errorRequestRef.current?.abort();
    const controller = new AbortController();
    errorRequestRef.current = controller;
    setState((current) => ({ ...current, errorLoading: true }));
    try {
      const response = await usageApi.errors(clean({ ...errorFilters, start_date: filters.start_date, end_date: filters.end_date, page: errorPaging.page, page_size: errorPaging.pageSize, sort_by: errorSort.key, sort_order: errorSort.order }), controller.signal);
      if (controller.signal.aborted) return;
      setErrors({ items: response.items || [], total: Number(response.total || 0), pages: Number(response.pages || 1) });
    } catch (error) { if (error.name !== "AbortError") notify("error", error.message); } finally { if (!controller.signal.aborted) setState((current) => ({ ...current, errorLoading: false })); }
  }, [errorEnabled, errorFilters, errorPaging, errorSort, filters.end_date, filters.start_date, notify]);

  useEffect(() => { loadUsage(); return () => requestRef.current?.abort(); }, [loadUsage]);
  useEffect(() => { if (tab === "errors") loadErrors(); }, [loadErrors, tab]);
  useEffect(() => () => errorRequestRef.current?.abort(), []);
  useEffect(() => { const controller = new AbortController(); Promise.allSettled([keysApi.list(1, 100, {}, controller.signal), groupsApi.available()]).then(([keys, groups]) => { if (!controller.signal.aborted) setOptions({ keys: keys.value?.items || [], groups: Array.isArray(groups.value) ? groups.value : groups.value?.items || [] }); }); return () => controller.abort(); }, []);
  useEffect(() => { if (!errorEnabled && tab === "errors") setTab("usage"); }, [errorEnabled, tab]);

  const resetUsageRecords = () => {
    setData((current) => ({ ...current, items: [], total: 0, pages: 1 }));
    setState((current) => ({ ...current, loading: true, error: "" }));
    setPaging((current) => ({ ...current, page: 1 }));
  };
  const setFilter = (key, value) => { setFilters((current) => ({ ...current, [key]: value })); resetUsageRecords(); };
  const setErrorFilter = (key, value) => { setErrorFilters((current) => ({ ...current, [key]: value })); setErrorPaging((current) => ({ ...current, page: 1 })); };
  const reset = () => { const range = last24Hours(); setFilters({ ...emptyFilters, ...range }); setErrorFilters(emptyErrorFilters); resetUsageRecords(); setErrorPaging((current) => ({ ...current, page: 1 })); };
  const changeRange = (range) => { setFilters((current) => ({ ...current, ...range })); resetUsageRecords(); setErrorPaging((current) => ({ ...current, page: 1 })); };
  const changeUsageSort = (key, order) => { setSort({ key, order }); resetUsageRecords(); };
  const refreshUsage = () => { if (paging.page === 1) loadUsage(); else resetUsageRecords(); };
  const modelOptions = useMemo(() => [...new Set([...data.models.map((item) => item.model), filters.model].filter(Boolean))].sort(), [data.models, filters.model]);
  const errorModelOptions = useMemo(() => [...new Set([...data.models.map((item) => item.model), ...errors.items.map((item) => item.model), errorFilters.model].filter(Boolean))].sort(), [data.models, errorFilters.model, errors.items]);
  const usageColumns = useMemo(() => [
    { key: "created_at", label: locale === "zh" ? "时间" : "Time", sortable: true, render: (row) => <UsageTimeCell value={row.created_at} locale={locale} /> },
    // Only the model the user requested; upstream mappings stay internal.
    { key: "model", label: t("usage.model"), render: (row) => <TruncatedText value={row.model} /> },
    { key: "group", label: t("usage.group"), render: (row) => <GroupCell name={row.group?.name} platform={row.group?.platform} /> },
    { key: "key", label: t("usage.key"), render: (row) => <KeyCell name={row.api_key?.name} deleted={!row.api_key && Boolean(row.api_key_id)} locale={locale} /> },
    { key: "input_tokens", label: localized(locale, "输入", "Input"), render: (row) => <InputTokensCell row={row} locale={locale} /> },
    { key: "output_tokens", label: localized(locale, "输出", "Output"), render: (row) => <OutputTokensCell row={row} locale={locale} /> },
    { key: "cache_read_tokens", label: localized(locale, "缓存读取", "Cache read"), render: (row) => <CacheReadCell row={row} locale={locale} /> },
    { key: "cost", label: locale === "zh" ? "扣费" : "Billed cost", render: (row) => <CostCell row={row} formatNumber={formatNumber} locale={locale} /> },
    { key: "request_type", label: t("usage.type"), render: (row) => typeLabel(requestType(row), t) },
    { key: "first_token", label: localized(locale, "首 Token", "First token"), render: (row) => <FirstTokenCell row={row} locale={locale} /> },
    { key: "duration", label: localized(locale, "总耗时", "Duration"), render: (row) => <DurationCell row={row} /> },
    { key: "ip_address", label: locale === "zh" ? "客户端 IP" : "Client IP", render: (row) => <IpGeoCell ip={row.ip_address} enabled={geoEnabled} /> },
    { key: "user_agent", label: "User-Agent", render: (row) => <TruncatedText value={row.user_agent} className="console-user-agent" /> },
  ], [formatNumber, geoEnabled, locale, t]);
  const errorColumns = useMemo(() => [
    { key: "created_at", label: locale === "zh" ? "时间" : "Time", sortable: true, render: (row) => <UsageTimeCell value={row.created_at} locale={locale} /> },
    { key: "model", label: t("usage.model"), sortable: true },
    { key: "group", label: t("usage.group"), render: (row) => <GroupCell name={row.group_name} platform={row.platform} /> },
    { key: "key", label: t("usage.key"), render: (row) => <KeyCell name={row.key_name} deleted={row.key_deleted} locale={locale} /> },
    { key: "request_type", label: t("usage.type"), render: (row) => typeLabel(requestType(row), t) },
    { key: "status", label: locale === "zh" ? "状态" : "Status", render: (row) => row.status_code ? <NumberValue value={row.status_code} tone="slow" /> : <EmptyValue /> },
    { key: "category", label: locale === "zh" ? "分类" : "Category", render: (row) => <TruncatedText value={row.category} /> },
    { key: "message", label: locale === "zh" ? "错误信息" : "Message", render: (row) => <TruncatedText value={row.message} /> },
    { key: "client_ip", label: locale === "zh" ? "客户端 IP" : "Client IP", render: (row) => <IpGeoCell ip={row.client_ip} enabled={geoEnabled} /> },
    { key: "user_agent", label: "User-Agent", render: (row) => <TruncatedText value={row.user_agent} className="console-user-agent" /> },
  ], [geoEnabled, locale, t]);
  // Stable column arrays let memoized table rows skip re-rendering on unrelated page state.
  const visibleUsageColumns = useMemo(() => usageColumns.filter((column) => column.key === "created_at" || !usageHidden.hidden.has(column.key)), [usageColumns, usageHidden.hidden]);
  const visibleErrorColumns = useMemo(() => errorColumns.filter((column) => ["status", "created_at"].includes(column.key) || !errorHidden.hidden.has(column.key)), [errorColumns, errorHidden.hidden]);

  return <Page title={t("usage.title")} className="console-usage-page"><div className="console-usage-workspace"><div className="console-usage-ledger"><UsageSummary summary={data.summary} loading={state.loading} /><UsageFilterPanel toolbar={<UsageFilterToolbar loadUsage={refreshUsage} loadErrors={loadErrors} tab={tab} state={state} t={t} />} tab={tab} filters={filters} errorFilters={errorFilters} options={options} modelOptions={modelOptions} errorModelOptions={errorModelOptions} setFilter={setFilter} setErrorFilter={setErrorFilter} reset={reset} changeRange={changeRange} locale={locale} t={t} /><RecordsPanel tabs={<UsageTabs enabled={errorEnabled} tab={tab} setTab={setTab} locale={locale} t={t} />} tab={tab} data={data} errors={errors} geoEnabled={geoEnabled} setGeoEnabled={setGeoEnabled} state={state} visibleErrorColumns={visibleErrorColumns} errorSort={errorSort} setErrorSort={setErrorSort} errorPaging={errorPaging} setErrorPaging={setErrorPaging} openError={setErrorDetail} visibleUsageColumns={visibleUsageColumns} sort={sort} onUsageSort={changeUsageSort} paging={paging} setPaging={setPaging} loadUsage={loadUsage} /></div></div><ErrorDetailModal item={tab === "errors" ? errorDetail : null} onClose={() => setErrorDetail(null)} /></Page>;
}
