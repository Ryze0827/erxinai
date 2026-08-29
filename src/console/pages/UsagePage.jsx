import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@appica/ui-react/badge";
import { Skeleton } from "@appica/ui-react/skeleton";
import { Table as AppicaTable } from "@appica/ui-react/table";
import { TableBody as AppicaTableBody } from "@appica/ui-react/table";
import { TableCell as AppicaTableCell } from "@appica/ui-react/table";
import { TableHead as AppicaTableHead } from "@appica/ui-react/table";
import { TableHeader as AppicaTableHeader } from "@appica/ui-react/table";
import { TableRow as AppicaTableRow } from "@appica/ui-react/table";
import { Tooltip } from "@appica/ui-react/tooltip";
import { TooltipContent } from "@appica/ui-react/tooltip";
import { TooltipProvider } from "@appica/ui-react/tooltip";
import { TooltipTrigger } from "@appica/ui-react/tooltip";
import { groupsApi, keysApi, usageApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { GroupBadge } from "../GroupBadge";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { Button, DataTable, EmptyState, ErrorState, Field, InlineButton, Modal, Page, Pagination, Panel, SelectInput, Spinner, StatCardSkeleton, StatusBadge, TruncatedText } from "../UI";
import { downloadBlob, formatCompact, formatDuration, formatTokenMillions } from "../utils";
import { ColumnPicker, CompactTabs, DateRangePicker, SearchSelect, useHiddenColumns } from "../components/ConsoleControls";
import { DistributionChart } from "../components/UsageCharts";
import { IpGeoBatchToolbar, IpGeoCell } from "../components/IpGeo";

function localDate(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function last24Hours() {
  return { start_date: localDate(new Date(Date.now() - 86400000)), end_date: localDate(new Date()) };
}

const emptyFilters = { ...last24Hours(), api_key_id: "", group_id: "", model: "", request_type: "", billing_type: "", billing_mode: "" };
const emptyErrorFilters = { api_key_id: "", model: "", category: "", status_code: "" };
const FIRST_TOKEN_WARNING_MS = 10000;
const FIRST_TOKEN_DANGER_MS = 30000;

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

function billingModeLabel(row, t) {
  const mode = billingMode(row);
  if (mode === "token") return t("usage.token");
  return mode.replaceAll("_", " ");
}

function reasoningLabel(value) {
  if (!value) return "—";
  return String(value).replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function UsageStats({ stats, loading }) {
  const { t, locale, formatCurrency } = useLocale();
  if (loading && !stats) return <div className="console-stat-grid console-stat-grid--4 console-usage-stats" role="status" aria-label={t("common.loading")}>{["blue", "green", "amber", "rose"].map((tone) => <StatCardSkeleton key={tone} tone={tone} />)}</div>;
  const value = stats || {};
  const cacheCreate = value.total_cache_creation_tokens || 0;
  const cacheRead = value.total_cache_read_tokens || value.total_cache_tokens || 0;
  return <div className="console-stat-grid console-stat-grid--4 console-usage-stats"><div className="console-stat is-requests"><div><span>{t("usage.requests")}</span><strong>{formatCompact(value.total_requests, locale)}</strong></div><i className="console-usage-stat-icon" aria-hidden="true"><Icon name="send" size={20} /></i></div><div className="console-stat is-tokens"><div><span>{t("usage.tokens")}</span><strong>{formatTokenMillions(value.total_tokens)}</strong><small className="console-usage-token-summary" title={`${locale === "zh" ? "缓存创建" : "Cache creation"}: ${formatTokenMillions(cacheCreate)} · ${locale === "zh" ? "缓存读取" : "Cache read"}: ${formatTokenMillions(cacheRead)}`}><span><Icon name="arrowDown" size={12} />IN <b>{formatTokenMillions(value.total_input_tokens)}</b></span><span><Icon name="arrowUp" size={12} />OUT <b>{formatTokenMillions(value.total_output_tokens)}</b></span><span><Icon name="reset" size={12} />CACHE <b>{formatTokenMillions(cacheCreate + cacheRead)}</b></span></small></div><i className="console-usage-stat-icon" aria-hidden="true"><Icon name="coins" size={20} /></i></div><div className="console-stat is-cost"><div><span>{t("usage.actualCost")}</span><strong>{formatCurrency(value.total_actual_cost)}</strong><small>{locale === "zh" ? "标准" : "Standard"} <b>{formatCurrency(value.total_cost)}</b></small></div><i className="console-usage-stat-icon" aria-hidden="true"><Icon name="wallet" size={20} /></i></div><div className="console-stat is-latency"><div><span>{t("usage.avgLatency")}</span><strong>{formatDuration(value.average_duration_ms)}</strong></div><i className="console-usage-stat-icon" aria-hidden="true"><Icon name="hourglass" size={20} /></i></div></div>;
}

function FilterSelect({ label, value, onChange, children }) {
  return <Field label={label}><SelectInput value={value} onChange={(event) => onChange(event.target.value)}>{children}</SelectInput></Field>;
}

function localized(locale, zh, en) {
  return locale === "zh" ? zh : en;
}

function UsageFilters({ filters, setFilter, apiKeys, groups, models, locale, t }) {
  return <div className="console-usage-filters"><FilterSelect label={t("usage.key")} value={filters.api_key_id} onChange={(value) => setFilter("api_key_id", value)}><option value="">{localized(locale, "全部密钥", "All API keys")}</option>{apiKeys.map((key) => <option key={key.id} value={key.id}>{key.name}</option>)}</FilterSelect><Field label={t("usage.model")}><SearchSelect id="usage-model-options" value={filters.model} onChange={(event) => setFilter("model", event.target.value)} options={models} placeholder={localized(locale, "全部模型", "All models")} /></Field><FilterSelect label={t("usage.group")} value={filters.group_id} onChange={(value) => setFilter("group_id", value)}><option value="">{localized(locale, "全部分组", "All groups")}</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</FilterSelect><FilterSelect label={t("usage.type")} value={filters.request_type} onChange={(value) => setFilter("request_type", value)}><option value="">{localized(locale, "全部类型", "All types")}</option><option value="ws_v2">{t("usage.requestType.websocket")}</option><option value="stream">{t("usage.requestType.stream")}</option><option value="sync">{t("usage.requestType.sync")}</option></FilterSelect><FilterSelect label={localized(locale, "计费来源", "Billing source")} value={filters.billing_type} onChange={(value) => setFilter("billing_type", value)}><option value="">{localized(locale, "全部来源", "All sources")}</option><option value="0">{localized(locale, "余额", "Balance")}</option><option value="1">{localized(locale, "订阅", "Subscription")}</option></FilterSelect><FilterSelect label={t("usage.billing")} value={filters.billing_mode} onChange={(value) => setFilter("billing_mode", value)}><option value="">{localized(locale, "全部方式", "All modes")}</option><option value="token">{t("usage.token")}</option><option value="per_request">{localized(locale, "按请求", "Per request")}</option><option value="image">Image</option><option value="video">Video</option></FilterSelect></div>;
}

function ErrorFilters({ filters, setFilter, apiKeys, models, locale }) {
  return <div className="console-usage-filters"><FilterSelect label={locale === "zh" ? "密钥名称" : "Key name"} value={filters.api_key_id} onChange={(value) => setFilter("api_key_id", value)}><option value="">{locale === "zh" ? "全部密钥" : "All keys"}</option>{apiKeys.map((key) => <option key={key.id} value={key.id}>{key.name}</option>)}</FilterSelect><Field label={locale === "zh" ? "模型" : "Model"}><SearchSelect id="error-model-options" value={filters.model} onChange={(event) => setFilter("model", event.target.value)} options={models} placeholder={locale === "zh" ? "输入模型片段" : "Enter any model fragment"} /></Field><FilterSelect label={locale === "zh" ? "错误分类" : "Category"} value={filters.category} onChange={(value) => setFilter("category", value)}><option value="">{locale === "zh" ? "全部分类" : "All categories"}</option>{["auth", "rate_limit", "quota", "invalid_request", "service_unavailable", "upstream", "internal", "cyber"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</FilterSelect><FilterSelect label={locale === "zh" ? "状态码" : "Status"} value={filters.status_code} onChange={(value) => setFilter("status_code", value)}><option value="">{locale === "zh" ? "全部状态" : "All statuses"}</option>{[400, 401, 403, 404, 408, 409, 422, 429, 500, 502, 503, 504].map((code) => <option key={code} value={code}>{code}</option>)}</FilterSelect></div>;
}

function ModelCell({ row }) {
  const chain = String(row.model_mapping_chain || "").split("→").map((item) => item.trim()).filter(Boolean);
  if (chain.length > 1) return <div className="console-model-chain">{chain.map((item, index) => <TruncatedText value={`${index > 0 ? "↳ " : ""}${item}`} render={<span />} key={`${item}-${index}`} />)}</div>;
  return <div className="console-key-name"><TruncatedText value={row.model} render={<strong />} />{row.upstream_model && row.upstream_model !== row.model && <TruncatedText value={`↳ ${row.upstream_model}`} render={<small />} />}</div>;
}

function UsageTimeCell({ value, locale }) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const language = locale === "zh" ? "zh-CN" : "en-US";
  return <time className="console-usage-time"><span>{new Intl.DateTimeFormat(language, { year: "numeric", month: "short", day: "2-digit" }).format(date)}</span><small>{new Intl.DateTimeFormat(language, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(date)}</small></time>;
}

function KeyEndpointCell({ row }) {
  const endpoint = row.inbound_endpoint || "—";
  return <div className="console-usage-key-endpoint"><TruncatedText value={row.api_key?.name} render={<strong />} />{!row.api_key && row.api_key_id && <small>Deleted</small>}<span><TruncatedText value={endpoint} render={<code />} /></span></div>;
}

function ModelGroupCell({ row }) {
  return <div className="console-usage-model-group"><ModelCell row={row} /><GroupBadge name={row.group?.name} platform={row.group?.platform} /></div>;
}

function TypeBillingCell({ row, t }) {
  return <div className="console-usage-type-billing"><Badge variant="soft" size="sm" className={`console-type-badge is-${requestType(row)}`}>{typeLabel(requestType(row), t)}</Badge><small>{billingModeLabel(row, t)}</small></div>;
}

function TokenCell({ row, locale }) {
  if (billingMode(row) === "image" || billingMode(row) === "per_request") return <div className="console-token-cell"><strong>{row.image_count || 1} {locale === "zh" ? "张" : "image(s)"}</strong><small>{row.image_output_size || row.image_size || row.image_input_size || "—"}</small></div>;
  const labels = locale === "zh" ? { input: "输入", output: "输出", read: "缓存读取", write: "缓存创建" } : { input: "Input", output: "Output", read: "Cache read", write: "Cache creation" };
  const title = `${labels.input}: ${formatTokenMillions(row.input_tokens)}\n${labels.output}: ${formatTokenMillions(row.output_tokens)}\n${labels.write}: ${formatTokenMillions(row.cache_creation_tokens)} (5m ${formatTokenMillions(row.cache_creation_5m_tokens)}, 1h ${formatTokenMillions(row.cache_creation_1h_tokens)})\n${labels.read}: ${formatTokenMillions(row.cache_read_tokens)}`;
  return <div className="console-token-cell" title={title}><div><span className="is-input" aria-label={`${labels.input}: ${formatTokenMillions(row.input_tokens)}`}><Icon name="arrowDown" size={11} />{formatTokenMillions(row.input_tokens)}</span><span className="is-output" aria-label={`${labels.output}: ${formatTokenMillions(row.output_tokens)}`}><Icon name="arrowUp" size={11} />{formatTokenMillions(row.output_tokens)}</span><span className="is-read" aria-label={`${labels.read}: ${formatTokenMillions(row.cache_read_tokens)}`}><Icon name="eye" size={11} />{formatTokenMillions(row.cache_read_tokens)}</span><span className="is-write" aria-label={`${labels.write}: ${formatTokenMillions(row.cache_creation_tokens)}`}><Icon name="edit" size={11} />{formatTokenMillions(row.cache_creation_tokens)}</span></div></div>;
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatMultiplier(value) {
  const number = Number(value);
  return (Number.isFinite(number) ? number : 1).toFixed(4).replace(/\.?0+$/, "");
}

function formatTokenPrice(cost, tokens) {
  const count = numeric(tokens);
  return count > 0 ? `$${(numeric(cost) / count * 1_000_000).toFixed(4)}` : "—";
}

function textInputTokens(row) {
  return Math.max(0, numeric(row.input_tokens) - numeric(row.image_input_tokens));
}

function textOutputTokens(row) {
  return Math.max(0, numeric(row.output_tokens) - numeric(row.image_output_tokens));
}

function imageSizeSource(row, locale) {
  const labels = locale === "zh"
    ? { output: "上游输出", input: "请求输入", default: "默认计费档位", legacy: "历史记录" }
    : { output: "Upstream output", input: "Request input", default: "Default billing tier", legacy: "Legacy record" };
  const source = String(row.image_size_source || "").trim().toLowerCase();
  if (labels[source]) return labels[source];
  if (row.image_size) return labels.legacy;
  return locale === "zh" ? "未记录" : "Not recorded";
}

function imageSizeBreakdown(row) {
  if (!row.image_size_breakdown || typeof row.image_size_breakdown !== "object") return "";
  return ["1K", "2K", "4K"].filter((size) => numeric(row.image_size_breakdown[size]) > 0).map((size) => `${size} × ${numeric(row.image_size_breakdown[size])}`).join(", ");
}

function CostTooltipRow({ label, value, tone = "" }) {
  return <div className="console-cost-tooltip-row"><span>{label}</span><strong className={tone ? `is-${tone}` : ""}>{value}</strong></div>;
}

function CostTooltip({ row, formatCost, locale }) {
  const imageUsage = numeric(row.image_count) > 0 && row.billing_mode !== "token" && row.billing_mode !== "video";
  const tokenBilling = !imageUsage && (!row.billing_mode || row.billing_mode === "token");
  const inputTextTokens = textInputTokens(row);
  const outputTextTokens = textOutputTokens(row);
  const breakdown = imageSizeBreakdown(row);
  const labels = locale === "zh" ? {
    title: "费用明细", inputCost: "输入费用", outputCost: "输出费用", imageInputCost: "图片输入费用", imageOutputCost: "图片输出费用",
    inputPrice: "输入单价", outputPrice: "输出单价", imageInputPrice: "图片输入单价", imageOutputPrice: "图片输出单价", perMillion: "/ 1M Token",
    cacheCreation: "缓存创建费用", cacheRead: "缓存读取费用", unitPrice: "单次价格", imageUnitPrice: "单张价格", imageTotalPrice: "图片总价",
    imageCount: "图片张数", imageBillingSize: "计费尺寸", imageInputSize: "输入尺寸", imageOutputSize: "输出尺寸", imageSource: "尺寸来源", imageBreakdown: "尺寸明细",
    rate: "倍率", original: "原始", billed: "用户扣费", imageUnit: "张", unknown: "未知", notRecorded: "未记录",
  } : {
    title: "Cost breakdown", inputCost: "Input cost", outputCost: "Output cost", imageInputCost: "Image input cost", imageOutputCost: "Image output cost",
    inputPrice: "Input price", outputPrice: "Output price", imageInputPrice: "Image input price", imageOutputPrice: "Image output price", perMillion: "/ 1M tokens",
    cacheCreation: "Cache creation cost", cacheRead: "Cache read cost", unitPrice: "Per-request price", imageUnitPrice: "Per-image price", imageTotalPrice: "Image total price",
    imageCount: "Image count", imageBillingSize: "Billing size", imageInputSize: "Input size", imageOutputSize: "Output size", imageSource: "Size source", imageBreakdown: "Size breakdown",
    rate: "Rate", original: "Original", billed: "User billed", imageUnit: " images", unknown: "Unknown", notRecorded: "Not recorded",
  };
  const billingSize = row.image_size || labels.notRecorded;

  return <>
      <div className="console-cost-tooltip-breakdown">
        <h3>{labels.title}</h3>
        {tokenBilling && inputTextTokens > 0 && <CostTooltipRow label={labels.inputPrice} value={`${formatTokenPrice(row.input_cost, inputTextTokens)} ${labels.perMillion}`} tone="input" />}
        {tokenBilling && numeric(row.image_input_tokens) > 0 && <CostTooltipRow label={labels.imageInputPrice} value={`${formatTokenPrice(row.image_input_cost, row.image_input_tokens)} ${labels.perMillion}`} tone="image-input" />}
        {tokenBilling && outputTextTokens > 0 && <CostTooltipRow label={labels.outputPrice} value={`${formatTokenPrice(row.output_cost, outputTextTokens)} ${labels.perMillion}`} tone="output" />}
        {tokenBilling && numeric(row.image_output_tokens) > 0 && <CostTooltipRow label={labels.imageOutputPrice} value={`${formatTokenPrice(row.image_output_cost, row.image_output_tokens)} ${labels.perMillion}`} tone="image-output" />}
        {numeric(row.input_cost) > 0 && <CostTooltipRow label={labels.inputCost} value={formatCost(row.input_cost)} />}
        {numeric(row.image_input_cost) > 0 && <CostTooltipRow label={labels.imageInputCost} value={formatCost(row.image_input_cost)} tone="image-input" />}
        {numeric(row.output_cost) > 0 && <CostTooltipRow label={labels.outputCost} value={formatCost(row.output_cost)} />}
        {numeric(row.image_output_cost) > 0 && <CostTooltipRow label={labels.imageOutputCost} value={formatCost(row.image_output_cost)} tone="image-output" />}
        {imageUsage && <>
          <CostTooltipRow label={labels.imageCount} value={`${numeric(row.image_count)}${labels.imageUnit}`} />
          <CostTooltipRow label={labels.imageBillingSize} value={billingSize} />
          <CostTooltipRow label={labels.imageSource} value={imageSizeSource(row, locale)} />
          <CostTooltipRow label={labels.imageInputSize} value={row.image_input_size || labels.unknown} />
          <CostTooltipRow label={labels.imageOutputSize} value={row.image_output_size || labels.unknown} />
          {breakdown && <CostTooltipRow label={labels.imageBreakdown} value={breakdown} />}
          <CostTooltipRow label={labels.imageUnitPrice} value={formatCost(numeric(row.image_count) > 0 ? numeric(row.total_cost) / numeric(row.image_count) : 0)} tone="input" />
          <CostTooltipRow label={labels.imageTotalPrice} value={formatCost(row.total_cost)} />
        </>}
        {!tokenBilling && !imageUsage && <CostTooltipRow label={labels.unitPrice} value={formatCost(row.total_cost)} tone="input" />}
        {numeric(row.cache_creation_cost) > 0 && <CostTooltipRow label={labels.cacheCreation} value={formatCost(row.cache_creation_cost)} />}
        {numeric(row.cache_read_cost) > 0 && <CostTooltipRow label={labels.cacheRead} value={formatCost(row.cache_read_cost)} />}
      </div>
      <div className="console-cost-tooltip-summary">
        <CostTooltipRow label={labels.rate} value={`${formatMultiplier(row.rate_multiplier ?? 1)}x`} tone="rate" />
        <CostTooltipRow label={labels.original} value={formatCost(row.total_cost)} />
        <CostTooltipRow label={labels.billed} value={formatCost(row.actual_cost)} tone="billed" />
      </div>
    </>;
}

export function CostCell({ row, formatNumber, locale }) {
  const formatCost = (value) => formatNumber(numeric(value), {
    style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", minimumFractionDigits: 6, maximumFractionDigits: 6,
  });
  const label = locale === "zh" ? "查看费用明细" : "View cost breakdown";
  return <div className="console-cost-cell"><div className="console-cost-main"><strong>{formatCost(row.actual_cost)}</strong>{row.long_context_billing_applied && <i>x2</i>}<TooltipProvider><Tooltip><TooltipTrigger render={<InlineButton variant="ghost" size="icon-sm" className="console-cost-detail-trigger" aria-label={label} />}><Icon name="info" size={12} /></TooltipTrigger><TooltipContent side="left" align="center" arrow={false} className="console-cost-tooltip"><CostTooltip row={row} formatCost={formatCost} locale={locale} /></TooltipContent></Tooltip></TooltipProvider></div></div>;
}

function latencyLabel(value) {
  if (value == null) return "—";
  const formatted = formatDuration(Number(value)).replace(" ", "");
  return formatted.endsWith("ms") ? formatted : `${Number.parseFloat(formatted)}s`;
}

function firstTokenTone(value) {
  const duration = Number(value);
  if (value == null || !Number.isFinite(duration)) return "";
  if (duration > FIRST_TOKEN_DANGER_MS) return "is-danger";
  if (duration > FIRST_TOKEN_WARNING_MS) return "is-warning";
  return "is-success";
}

function LatencyCell({ row, locale }) {
  const first = latencyLabel(row.first_token_ms);
  const total = latencyLabel(row.duration_ms);
  return <div className="console-latency" title={`${locale === "zh" ? "首 Token" : "First token"}: ${first}\n${locale === "zh" ? "总耗时" : "Duration"}: ${total}`}><span className={firstTokenTone(row.first_token_ms)}>{first}</span><span className="console-latency-divider" aria-hidden="true">|</span><span>{total}</span></div>;
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

function csvRow(row, t) {
  return [row.created_at, row.api_key?.name || "", row.model, reasoningLabel(row.reasoning_effort), row.inbound_endpoint || "", row.ip_address || "", typeLabel(requestType(row), t), billingModeLabel(row, t), row.input_tokens, row.output_tokens, row.cache_read_tokens, row.cache_creation_tokens, row.rate_multiplier, Number(row.actual_cost || 0).toFixed(8), Number(row.total_cost || 0).toFixed(8), row.first_token_ms ?? "", row.duration_ms ?? ""].map(escapeCsv).join(",");
}

function GroupDistribution({ data, loading }) {
  const { locale, formatCurrency } = useLocale();
  const [metric, setMetric] = useState("tokens");
  const rows = data.slice(0, 5);
  const values = rows.map((row) => Number(metric === "tokens" ? row.total_tokens : row.actual_cost) || 0);
  const total = Math.max(values.reduce((sum, value) => sum + value, 0), 1);
  const loadingRows = <div className="console-group-distribution-list console-group-distribution-skeleton" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <div key={index}><span><Skeleton /><Skeleton /></span><Skeleton /></div>)}</div>;
  return <Panel title={localized(locale, "分组分布", "Group distribution")} actions={<CompactTabs value={metric} onChange={setMetric} items={[{ value: "tokens", label: "Tokens" }, { value: "actual_cost", label: locale === "zh" ? "费用" : "Spend" }]} />} className="console-group-distribution">{loading ? loadingRows : !rows.length ? <EmptyState /> : <div className="console-group-distribution-list">{rows.map((row, index) => { const value = values[index]; const percent = value / total * 100; return <div className={`is-tone-${index % 4 + 1}`} key={`${row.group_name}-${index}`}><span><strong>{row.group_name || "—"}</strong><small>{metric === "tokens" ? formatTokenMillions(value) : formatCurrency(value)} <b>({percent.toFixed(1)}%)</b></small></span><i><b style={{ width: `${percent}%` }} /></i></div>; })}</div>}</Panel>;
}

function UsageChartsPanel({ data, loading, locale }) {
  return <div className="console-usage-chart-grid"><DistributionChart title={localized(locale, "模型分布", "Model distribution")} data={data.models} nameKey="model" loading={loading} limit={4} actualOnly /><GroupDistribution data={data.groups} loading={loading} /></div>;
}

function UsageToolbar({ filters, changeRange, currentColumns, currentHidden, loadUsage, loadErrors, tab, state, exportCsv, exporting, locale, t }) {
  const refresh = () => {
    loadUsage();
    if (tab === "errors") loadErrors();
  };
  const alwaysVisible = tab === "errors" ? ["status", "created_at"] : ["created_at"];
  const exportLabel = exporting ? localized(locale, "导出中…", "Exporting…") : localized(locale, "导出 CSV", "Export CSV");
  return <div className="console-usage-toolbar"><DateRangePicker startDate={filters.start_date} endDate={filters.end_date} onChange={changeRange} /><Button icon="refresh" onClick={refresh} loading={state.loading || state.errorLoading}>{t("common.refresh")}</Button><ColumnPicker columns={currentColumns} hidden={currentHidden.hidden} onToggle={currentHidden.toggle} alwaysVisible={alwaysVisible} />{tab !== "errors" && <Button variant="primary" icon="download" onClick={exportCsv} disabled={exporting}>{exportLabel}</Button>}</div>;
}

function UsageFilterPanel({ tab, filters, errorFilters, options, modelOptions, errorModelOptions, setFilter, setErrorFilter, reset, locale, t }) {
  const errorTab = tab === "errors";
  const filtersNode = errorTab
    ? <ErrorFilters filters={errorFilters} setFilter={setErrorFilter} apiKeys={options.keys} models={errorModelOptions} locale={locale} />
    : <UsageFilters filters={filters} setFilter={setFilter} apiKeys={options.keys} groups={options.groups} models={modelOptions} locale={locale} t={t} />;
  return <Panel className="console-usage-filter-panel"><div className="console-filter-action-layout">{filtersNode}<Button className="console-usage-reset" icon="reset" onClick={reset}>{localized(locale, "重置", "Reset")}</Button></div></Panel>;
}

function UsageTabs({ enabled, tab, setTab, errorCount, locale, t }) {
  if (!enabled) return null;
  const items = [
    { value: "usage", label: localized(locale, "用量记录", "Usage records") },
    { value: "errors", label: <>{t("usage.errors")}{errorCount > 0 && <b>{errorCount}</b>}</> },
  ];
  return <CompactTabs value={tab} items={items} onChange={setTab} className="console-usage-tabs" label={localized(locale, "用量类型", "Usage type")} />;
}

function RecordsSkeleton({ columns, rowCount = 20 }) {
  const { t } = useLocale();
  return <><div className="console-table-wrap console-records-skeleton" role="status" aria-label={t("common.loading")}><AppicaTable className="console-table" size="sm" borderStyle="none" aria-hidden="true"><AppicaTableHeader><AppicaTableRow>{columns.map((column) => <AppicaTableHead key={column.key}><span>{column.label}</span></AppicaTableHead>)}</AppicaTableRow></AppicaTableHeader><AppicaTableBody>{Array.from({ length: rowCount }, (_, row) => <AppicaTableRow key={row}>{columns.map((column) => <AppicaTableCell key={column.key}><Skeleton className="console-records-skeleton-cell" /></AppicaTableCell>)}</AppicaTableRow>)}</AppicaTableBody></AppicaTable></div><div className="console-pagination console-records-pagination-skeleton" aria-hidden="true"><Skeleton /><div><Skeleton /><Skeleton /><Skeleton /></div></div></>;
}

function ErrorRecords({ loading, columns, errors, sort, setSort, paging, setPaging, openError }) {
  if (loading && !errors.items.length) return <RecordsSkeleton columns={columns} rowCount={paging.pageSize} />;
  return <><DataTable columns={columns} rows={errors.items} sortKey={sort.key} sortOrder={sort.order} onSort={(key, order) => { setSort({ key, order }); setPaging((current) => ({ ...current, page: 1 })); }} onRowClick={openError} /><Pagination page={paging.page} pageSize={paging.pageSize} total={errors.total} pages={errors.pages} onPageChange={(page) => setPaging((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })} /></>;
}

function UsageRecords({ state, columns, data, sort, setSort, paging, setPaging, loadUsage }) {
  if (state.loading && !data.items.length) return <RecordsSkeleton columns={columns} rowCount={paging.pageSize} />;
  if (state.error && !data.items.length) return <ErrorState message={state.error} onRetry={loadUsage} />;
  return <><DataTable columns={columns} rows={data.items} sortKey={sort.key} sortOrder={sort.order} onSort={(key, order) => { setSort({ key, order }); setPaging((current) => ({ ...current, page: 1 })); }} hoverableRows={false} /><Pagination page={paging.page} pageSize={paging.pageSize} total={data.total} pages={data.pages} onPageChange={(page) => setPaging((current) => ({ ...current, page }))} onPageSizeChange={(pageSize) => setPaging({ page: 1, pageSize })} /></>;
}

function RecordsPanel({ tab, data, errors, geoEnabled, setGeoEnabled, state, visibleErrorColumns, errorSort, setErrorSort, errorPaging, setErrorPaging, openError, visibleUsageColumns, sort, setSort, paging, setPaging, loadUsage }) {
  const errorTab = tab === "errors";
  const actions = <IpGeoBatchToolbar enabled={geoEnabled} onToggle={() => setGeoEnabled((value) => !value)} />;
  return <Panel className="console-usage-records-panel" aria-busy={errorTab ? state.errorLoading : state.loading}><div className="console-usage-record-tools">{actions}</div>{errorTab ? <ErrorRecords loading={state.errorLoading} columns={visibleErrorColumns} errors={errors} sort={errorSort} setSort={setErrorSort} paging={errorPaging} setPaging={setErrorPaging} openError={openError} /> : <UsageRecords state={state} columns={visibleUsageColumns} data={data} sort={sort} setSort={setSort} paging={paging} setPaging={setPaging} loadUsage={loadUsage} />}</Panel>;
}

function ErrorDetailModal({ detail, locale, onClose }) {
  let content = null;
  if (detail?.loading) content = <Spinner />;
  else if (detail?.item) content = <ErrorDetail item={detail.item} />;
  return <Modal open={Boolean(detail)} title={localized(locale, "错误请求详情", "Error request details")} onClose={onClose} size="large">{content}</Modal>;
}

export function UsagePage() {
  const { t, locale, formatNumber, formatDate } = useLocale();
  const { settings, notify } = useConsole();
  const [filters, setFilters] = useState(emptyFilters);
  const [errorFilters, setErrorFilters] = useState(emptyErrorFilters);
  const [paging, setPaging] = useState({ page: 1, pageSize: 20 });
  const [errorPaging, setErrorPaging] = useState({ page: 1, pageSize: 20 });
  const [sort, setSort] = useState({ key: "created_at", order: "desc" });
  const [errorSort, setErrorSort] = useState({ key: "created_at", order: "desc" });
  const [tab, setTab] = useState("usage");
  const [options, setOptions] = useState({ keys: [], groups: [] });
  const [data, setData] = useState({ items: [], total: 0, pages: 1, stats: null, models: [], groups: [] });
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
    const chartQuery = { ...base, include_trend: false, include_model_stats: false, include_group_stats: true };
    const results = await Promise.allSettled([usageApi.list(listQuery, controller.signal), usageApi.stats(base, controller.signal), usageApi.dashboardModels({ ...base, model_source: "requested" }, controller.signal), usageApi.dashboardSnapshot(chartQuery, controller.signal)]);
    if (controller.signal.aborted) return;
    if (results[0].status === "rejected") { setState((current) => ({ ...current, loading: false, chartsLoading: false, error: results[0].reason.message })); return; }
    const list = results[0].value;
    const stats = results[1].status === "fulfilled" ? results[1].value : null;
    const models = results[2].status === "fulfilled" ? results[2].value?.models || [] : [];
    const snapshot = results[3].status === "fulfilled" ? results[3].value || {} : {};
    setData({ items: list.items || [], total: Number(list.total || 0), pages: Number(list.pages || 1), stats, models, groups: snapshot.groups || [] });
    setState((current) => ({ ...current, loading: false, chartsLoading: false, error: "" }));
  }, [filters, paging, sort]);

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
  const reset = () => { const range = last24Hours(); setFilters({ ...emptyFilters, ...range }); setErrorFilters(emptyErrorFilters); setPaging((current) => ({ ...current, page: 1 })); setErrorPaging((current) => ({ ...current, page: 1 })); };
  const changeRange = (range) => { setFilters((current) => ({ ...current, ...range })); setPaging((current) => ({ ...current, page: 1 })); };
  const openError = async (item) => { detailControllerRef.current?.abort(); const controller = new AbortController(); const request = Symbol("error-detail"); detailControllerRef.current = controller; detailRef.current = request; setDetail({ loading: true, item }); try { const full = await usageApi.error(item.id, controller.signal); if (detailRef.current === request) setDetail({ loading: false, item: full }); } catch { if (!controller.signal.aborted && detailRef.current === request) setDetail({ loading: false, item }); } };
  const exportCsv = async () => {
    if (!data.total) return notify("warning", locale === "zh" ? "没有可导出的数据。" : "There is no data to export.");
    setExporting(true);
    try {
      const rows = [];
      const pages = Math.ceil(data.total / 100);
      for (let page = 1; page <= pages; page += 1) { const response = await usageApi.list({ ...usageFilters(filters), page, page_size: 100, sort_by: sort.key, sort_order: sort.order }); rows.push(...(response.items || [])); }
      const headers = ["Time", "API Key Name", "Model", "Reasoning Effort", "Inbound Endpoint", "IP Address", "Type", "Billing Mode", "Input Tokens", "Output Tokens", "Cache Read Tokens", "Cache Creation Tokens", "Rate Multiplier", "Billed Cost", "Original Cost", "First Token (ms)", "Duration (ms)"];
      downloadBlob(new Blob([`\uFEFF${headers.join(",")}\n${rows.map((row) => csvRow(row, t)).join("\n")}`], { type: "text/csv;charset=utf-8" }), `usage_${filters.start_date}_to_${filters.end_date}.csv`);
      notify("success", locale === "zh" ? "CSV 已导出。" : "CSV exported.");
    } catch (error) { notify("error", error.message); } finally { setExporting(false); }
  };

  const modelOptions = useMemo(() => [...new Set([...data.models.map((item) => item.model), filters.model].filter(Boolean))].sort(), [data.models, filters.model]);
  const errorModelOptions = useMemo(() => [...new Set([...errors.items.map((item) => item.model), errorFilters.model].filter(Boolean))].sort(), [errorFilters.model, errors.items]);
  const usageColumns = useMemo(() => [
    { key: "created_at", label: locale === "zh" ? "时间" : "Time", sortable: true, render: (row) => <UsageTimeCell value={row.created_at} locale={locale} /> },
    { key: "key_endpoint", label: locale === "zh" ? "密钥 / 端点" : "Key / endpoint", render: (row) => <KeyEndpointCell row={row} /> },
    { key: "model_group", label: locale === "zh" ? "模型 / 分组" : "Model / group", render: (row) => <ModelGroupCell row={row} /> },
    { key: "type_billing", label: locale === "zh" ? "类型 / 计费" : "Type / billing", render: (row) => <TypeBillingCell row={row} t={t} /> },
    { key: "latency", label: locale === "zh" ? "延迟（首 Token | 总计）" : "Latency (FT | Total)", render: (row) => <LatencyCell row={row} locale={locale} /> },
    { key: "cost", label: locale === "zh" ? "扣费" : "Billed cost", render: (row) => <CostCell row={row} formatNumber={formatNumber} locale={locale} /> },
    { key: "tokens", label: t("usage.tokens"), render: (row) => <TokenCell row={row} locale={locale} /> },
    { key: "ip_address", label: locale === "zh" ? "客户端 IP" : "Client IP", render: (row) => <IpGeoCell ip={row.ip_address} enabled={geoEnabled} /> },
    { key: "user_agent", label: "User-Agent", render: (row) => <TruncatedText value={row.user_agent} className="console-user-agent" /> },
  ], [formatNumber, geoEnabled, locale, t]);
  const errorColumns = useMemo(() => [
    { key: "key_name", label: locale === "zh" ? "密钥名称" : "Key name", render: (row) => <div className="console-key-name"><TruncatedText value={row.key_name} render={<strong />} />{row.key_deleted && <small>{locale === "zh" ? "已删除" : "Deleted"}</small>}</div> },
    { key: "model", label: t("usage.model"), sortable: true }, { key: "endpoint", label: locale === "zh" ? "端点" : "Endpoint", render: (row) => <TruncatedText value={row.inbound_endpoint} render={<code />} className="console-endpoint-code" /> },
    { key: "client_ip", label: "IP", render: (row) => <IpGeoCell ip={row.client_ip} enabled={geoEnabled} /> }, { key: "group", label: t("usage.group"), render: (row) => <TruncatedText value={row.group_name} /> },
    { key: "type", label: t("usage.type"), render: (row) => <Badge variant="soft" size="sm" className={`console-type-badge is-${requestType(row)}`}>{typeLabel(requestType(row), t)}</Badge> },
    { key: "platform", label: locale === "zh" ? "平台" : "Platform" }, { key: "category", label: locale === "zh" ? "分类" : "Category", render: (row) => <TruncatedText value={row.category} className="console-chip" /> },
    { key: "status", label: locale === "zh" ? "状态" : "Status", sortable: true, render: (row) => <StatusBadge status="failed" label={String(row.status_code || "—")} /> },
    { key: "message", label: locale === "zh" ? "错误信息" : "Message", render: (row) => <TruncatedText value={row.message} className="console-clamp" multiline /> },
    { key: "created_at", label: locale === "zh" ? "时间" : "Time", sortable: true, render: (row) => formatDate(row.created_at) },
    { key: "user_agent", label: "User-Agent", render: (row) => <TruncatedText value={row.user_agent} className="console-user-agent" /> },
  ], [formatDate, geoEnabled, locale, t]);
  const visibleUsageColumns = usageColumns.filter((column) => column.key === "created_at" || !usageHidden.hidden.has(column.key));
  const visibleErrorColumns = errorColumns.filter((column) => ["status", "created_at"].includes(column.key) || !errorHidden.hidden.has(column.key));
  const currentColumns = tab === "errors" ? errorColumns : usageColumns;
  const currentHidden = tab === "errors" ? errorHidden : usageHidden;

  const closeDetail = () => { detailControllerRef.current?.abort(); detailRef.current = null; setDetail(null); };
  return <Page title={t("usage.title")} className="console-usage-page"><UsageToolbar filters={filters} changeRange={changeRange} currentColumns={currentColumns} currentHidden={currentHidden} loadUsage={loadUsage} loadErrors={loadErrors} tab={tab} state={state} exportCsv={exportCsv} exporting={exporting} locale={locale} t={t} /><UsageStats stats={data.stats} loading={state.chartsLoading} /><div className="console-usage-workspace"><div className="console-usage-ledger"><UsageFilterPanel tab={tab} filters={filters} errorFilters={errorFilters} options={options} modelOptions={modelOptions} errorModelOptions={errorModelOptions} setFilter={setFilter} setErrorFilter={setErrorFilter} reset={reset} locale={locale} t={t} /><UsageTabs enabled={errorEnabled} tab={tab} setTab={setTab} errorCount={errors.total} locale={locale} t={t} /><RecordsPanel tab={tab} data={data} errors={errors} geoEnabled={geoEnabled} setGeoEnabled={setGeoEnabled} state={state} visibleErrorColumns={visibleErrorColumns} errorSort={errorSort} setErrorSort={setErrorSort} errorPaging={errorPaging} setErrorPaging={setErrorPaging} openError={openError} visibleUsageColumns={visibleUsageColumns} sort={sort} setSort={setSort} paging={paging} setPaging={setPaging} loadUsage={loadUsage} /></div><UsageChartsPanel data={data} loading={state.chartsLoading} locale={locale} /></div><ErrorDetailModal detail={detail} locale={locale} onClose={closeDetail} /></Page>;
}
