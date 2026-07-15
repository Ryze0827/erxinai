import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { batchImagesApi, keysApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { useLocale } from "../i18n";
import {
  Button,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Modal,
  Page,
  Panel,
  ProgressBar,
  SelectInput,
  Spinner,
  StatusBadge,
  TextArea,
  TextInput,
} from "../UI";
import { downloadBlob, makeIdempotencyKey, statusLabel } from "../utils";

const terminalStatuses = new Set(["completed", "failed", "cancelled", "output_deleted"]);
const pageSizes = [20, 50, 100];
const outputCounts = [1, 2, 3, 4];
const initialFilters = { keyId: "", status: "", downloaded: "", taskName: "" };
const copy = {
  form: {
    en: { taskPlaceholder: "Uses the current time when left blank", loadingModels: "Loading models…", selectModel: "Select a model", format: "Output format", outputCount: "Outputs per prompt", estimated: "Estimated", promptsHint: "Each non-empty line becomes a separate item.", jsonHint: "Overrides prompts above. Each item may include output_count and reference_images." },
    zh: { taskPlaceholder: "留空时自动使用当前时间", loadingModels: "正在加载模型…", selectModel: "选择模型", format: "输出格式", outputCount: "每条生成张数", estimated: "预计", promptsHint: "每个非空行会成为一个独立任务。", jsonHint: "填写后覆盖上方提示词。每项可包含 output_count 与 reference_images。" },
  },
  filters: {
    en: { key: "Submitted key", downloaded: "Download status", search: "Search task name", allKeys: "All keys", yes: "Downloaded", no: "Not downloaded", reset: "Reset" },
    zh: { key: "提交密钥", downloaded: "下载状态", search: "搜索任务名称", allKeys: "全部密钥", yes: "已下载", no: "未下载", reset: "重置" },
  },
  jobs: {
    en: { selectPage: "Select page", task: "Task", child: "Child", collapse: "Collapse", expand: "Expand", model: "Model", key: "Submitted key", status: "Status", results: "Results", cost: "Cost", downloaded: "Downloaded", notDownloaded: "Not downloaded", actions: "Actions", inspect: "View details", cancel: "Cancel job", download: "Download ZIP", retry: "Retry failed items", remove: "Delete record", empty: "No batch jobs" },
    zh: { selectPage: "选择本页", task: "任务名称", child: "子任务", collapse: "收起", expand: "展开", model: "模型", key: "提交密钥", status: "状态", results: "结果", cost: "费用", downloaded: "下载状态", notDownloaded: "未下载", actions: "操作", inspect: "查看详情", cancel: "取消任务", download: "下载 ZIP", retry: "仅重试失败项", remove: "删除记录", empty: "暂无批量任务" },
  },
  items: {
    en: { source: "Source", status: "Status", images: "Images", result: "Result", preview: "Preview", available: "Available", empty: "No job items yet", emptyHint: "Queued jobs show items after the provider accepts them." },
    zh: { source: "来源任务", status: "状态", images: "图片", result: "结果", preview: "预览", available: "可下载", empty: "暂无任务明细", emptyHint: "排队中的任务会在上游接收后显示明细。" },
  },
  detail: {
    en: { succeeded: "succeeded", failed: "failed", downloaded: "Downloaded", notDownloaded: "Not downloaded", refresh: "Refresh details", parent: "Parent job", child: "Retry child" },
    zh: { succeeded: "成功", failed: "失败", downloaded: "已下载", notDownloaded: "未下载", refresh: "刷新明细", parent: "主任务", child: "重试子任务" },
  },
};

function localCopy(section, locale) {
  return copy[section][locale] || copy[section].en;
}

function initialForm(keyId = "") {
  return {
    keyId,
    task_name: "",
    model: "",
    provider: "",
    image_size: "1K",
    aspect_ratio: "",
    response_mime_type: "image/png",
    output_count: "1",
    prompts: "",
    json: "",
  };
}

async function eligibleKeys(signal) {
  const found = [];
  let page = 1;
  while (!signal.aborted) {
    const response = await keysApi.list(page, 100, { status: "active", sort_by: "created_at", sort_order: "desc" }, signal);
    found.push(...(response.items || []).filter((key) => key.group?.platform === "gemini" && key.group?.allow_batch_image_generation === true));
    if (page >= Number(response.pages || 1)) return found;
    page += 1;
  }
  return found;
}

function promptItems(prompts, outputCount) {
  return String(prompts || "")
    .split("\n")
    .map((prompt) => prompt.trim())
    .filter(Boolean)
    .map((prompt, index) => {
      const item = { custom_id: `img_${String(index + 1).padStart(3, "0")}`, prompt };
      if (Number(outputCount) > 1) item.output_count = Number(outputCount);
      return item;
    });
}

function advancedItems(value) {
  const parsed = JSON.parse(value);
  if (Array.isArray(parsed)) return parsed;
  return Array.isArray(parsed?.items) ? parsed.items : [];
}

function defaultTaskName(locale) {
  const date = new Date().toLocaleString(locale === "zh" ? "zh-CN" : "en-US", { hour12: false });
  return locale === "zh" ? `批量图片 ${date}` : `Batch images ${date}`;
}

function buildPayload(form, locale) {
  const items = form.json.trim() ? advancedItems(form.json) : promptItems(form.prompts, form.output_count);
  const payload = {
    task_name: form.task_name.trim() || defaultTaskName(locale),
    model: form.model,
    image_size: form.image_size,
    response_mime_type: form.response_mime_type,
    items,
  };
  if (form.provider) payload.provider = form.provider;
  if (form.aspect_ratio) payload.aspect_ratio = form.aspect_ratio;
  return payload;
}

function expectedOutputs(items) {
  return items.reduce((total, item) => total + (Number(item?.output_count) || 1), 0);
}

function invalidItemsMessage(locale) {
  return locale === "zh" ? "高级 Items JSON 格式无效。" : "Advanced Items JSON is invalid.";
}

function submissionProblem(key, payload, locale) {
  if (!key || !payload.model || !payload.items.length) return locale === "zh" ? "请选择密钥和模型，并添加至少一个提示词。" : "Choose a key and model, then add at least one prompt.";
  if (expectedOutputs(payload.items) > 200) return locale === "zh" ? "单个批量任务最多生成 200 张图片。" : "A batch can generate at most 200 images.";
  return "";
}

function submittedMessage(locale) {
  return locale === "zh" ? "批量任务已提交。" : "Batch submitted.";
}

function unixDate(value, formatDate) {
  if (!value) return "—";
  return formatDate(Number(value) < 1000000000000 ? Number(value) * 1000 : value);
}

function jobRef(apiKeyId, id) {
  return `${apiKeyId}:${id}`;
}

function normalizeJob(job, key) {
  return {
    ...job,
    _row_id: jobRef(key.id, job.id),
    api_key_id: key.id,
    api_key_name: key.name || `API Key #${key.id}`,
    child_count: 0,
  };
}

function parentRef(job) {
  return job.parent_batch_id ? jobRef(job.api_key_id, job.parent_batch_id) : "";
}

function addChildCounts(rows) {
  const counts = new Map();
  rows.forEach((row) => {
    const parent = parentRef(row);
    if (parent) counts.set(parent, (counts.get(parent) || 0) + 1);
  });
  return rows.map((row) => ({ ...row, child_count: counts.get(row._row_id) || 0 }));
}

function groupChildren(rows) {
  const groups = new Map();
  rows.forEach((row) => {
    const parent = parentRef(row);
    if (!parent) return;
    groups.set(parent, [...(groups.get(parent) || []), row]);
  });
  groups.forEach((children) => children.sort((left, right) => Number(left.created_at) - Number(right.created_at)));
  return groups;
}

function visibleJobs(rows, childrenByParent, expanded) {
  const rowIds = new Set(rows.map((row) => row._row_id));
  const roots = rows.filter((row) => !row.parent_batch_id || !rowIds.has(parentRef(row)));
  return roots.flatMap((row) => {
    const root = row.parent_batch_id ? { ...row, is_child: true } : row;
    const children = expanded.has(row._row_id) ? (childrenByParent.get(row._row_id) || []).map((child) => ({ ...child, is_child: true })) : [];
    return [root, ...children];
  });
}

function numeric(value) {
  return Number(value ?? 0);
}

function summed(children, key) {
  return children.reduce((total, child) => total + numeric(child[key]), 0);
}

function aggregateActualCost(job, children) {
  const childActual = summed(children, "actual_cost");
  const allActualReady = children.every((child) => child.actual_cost !== null && child.actual_cost !== undefined);
  if (job.actual_cost !== null && job.actual_cost !== undefined) return numeric(job.actual_cost) + childActual;
  return allActualReady ? childActual : null;
}

function aggregateJob(job, children = []) {
  if (job.parent_batch_id || !children.length) return job;
  const itemCount = numeric(job.item_count);
  const successCount = Math.min(itemCount, numeric(job.success_count) + summed(children, "success_count"));
  return {
    ...job,
    success_count: successCount,
    fail_count: Math.max(0, itemCount - successCount),
    status: successCount >= itemCount && terminalStatuses.has(job.status) ? "completed" : job.status,
    estimated_cost: numeric(job.estimated_cost) + summed(children, "estimated_cost"),
    hold_amount: numeric(job.hold_amount) + summed(children, "hold_amount"),
    actual_cost: aggregateActualCost(job, children),
  };
}

function canCancel(job) {
  return !terminalStatuses.has(job.status);
}

function canDownload(job) {
  return job.status === "completed" && numeric(job.success_count) > 0;
}

function canDelete(job) {
  return terminalStatuses.has(job.status);
}

function canRetry(job, children) {
  const display = aggregateJob(job, children);
  return terminalStatuses.has(display.status) && numeric(display.fail_count) > 0;
}

function listQuery(filters, limit, cursor) {
  const query = { limit, cursor: String(cursor) };
  if (filters.taskName) query.task_name = filters.taskName;
  if (filters.status) query.status = filters.status;
  if (filters.downloaded) query.downloaded = filters.downloaded;
  return query;
}

async function fetchKeyPrefix(key, filters, count, signal) {
  const rows = [];
  let cursor = 0;
  let hasMore = true;
  while (rows.length < count && hasMore) {
    const limit = Math.min(100, count - rows.length);
    const result = await batchImagesApi.list(key.key, listQuery(filters, limit, cursor), signal);
    const next = result.data || [];
    rows.push(...next);
    hasMore = Boolean(result.has_more);
    if (!next.length) {
      hasMore = false;
      break;
    }
    cursor += next.length;
  }
  return { key, rows, hasMore };
}

async function fetchSingleKeyPage(key, filters, offset, pageSize, signal) {
  const result = await batchImagesApi.list(key.key, listQuery(filters, pageSize, offset), signal);
  return { rows: (result.data || []).map((job) => normalizeJob(job, key)), hasMore: Boolean(result.has_more) };
}

async function fetchMergedKeyPage(keys, filters, offset, pageSize, signal) {
  const end = offset + pageSize;
  const results = await Promise.all(keys.map((key) => fetchKeyPrefix(key, filters, end, signal)));
  const merged = results.flatMap(({ key, rows }) => rows.map((job) => normalizeJob(job, key))).sort((left, right) => numeric(right.created_at) - numeric(left.created_at));
  return {
    rows: merged.slice(offset, end),
    hasMore: merged.length > end || results.some((result) => result.hasMore),
  };
}

async function fetchJobsPage(keys, filters, page, pageSize, signal) {
  const offset = (page - 1) * pageSize;
  if (keys.length === 1) return fetchSingleKeyPage(keys[0], filters, offset, pageSize, signal);
  return fetchMergedKeyPage(keys, filters, offset, pageSize, signal);
}

function originalCustomId(value) {
  return String(value || "").replace(/(?:_retry_[a-z0-9]+)+$/i, "");
}

function recoveredCustomIds(itemGroups) {
  const recovered = new Set();
  itemGroups.flat().forEach((item) => {
    if (["success", "succeeded"].includes(item.status) && Number(item.image_count || 0) > 0) recovered.add(originalCustomId(item.custom_id));
  });
  return recovered;
}

function retryItems(items, recovered = new Set()) {
  const suffix = Date.now().toString(36);
  return items
    .filter((item) => item.status === "failed" && !recovered.has(item.custom_id))
    .map((item) => ({
      custom_id: `${String(item.custom_id || "item").slice(0, 220)}_retry_${suffix}`,
      prompt: String(item.prompt_preview || "").trim(),
    }))
    .filter((item) => item.prompt);
}

function retryPayload(job, items, locale) {
  const payload = {
    task_name: `${job.task_name || defaultTaskName(locale)} · ${locale === "zh" ? "失败项重试" : "failed retry"}`,
    parent_batch_id: job.parent_batch_id || job.id,
    model: job.model,
    image_size: job.image_size || "1K",
    response_mime_type: job.response_mime_type || "image/png",
    items,
  };
  if (job.provider) payload.provider = job.provider;
  if (job.aspect_ratio) payload.aspect_ratio = job.aspect_ratio;
  return payload;
}

function childrenForRetry(job, childrenByParent) {
  if (job.parent_batch_id) return [];
  return childrenByParent.get(job._row_id) || [];
}

async function submitRetryJob(key, job, children, locale) {
  const [result, ...childResults] = await Promise.all([batchImagesApi.items(key.key, job.id, "failed"), ...children.map((child) => batchImagesApi.items(key.key, child.id))]);
  const recovered = recoveredCustomIds(childResults.map((childResult) => childResult.data || []));
  const items = retryItems(result.data || [], recovered);
  if (!items.length) return null;
  return batchImagesApi.submit(key.key, retryPayload(job, items, locale), `sentence-ui-retry-${makeIdempotencyKey()}`);
}

function retryParentRef(key, created, job) {
  return jobRef(key.id, created.parent_batch_id || job.parent_batch_id || job.id);
}

function missingRetryPromptMessage(locale) {
  return locale === "zh" ? "失败明细中没有可用于重试的 Prompt。" : "Failed items do not contain reusable prompts.";
}

function retrySubmittedMessage(locale) {
  return locale === "zh" ? "失败项重试任务已提交。" : "Failed-item retry submitted.";
}

function keyForJob(keys, job) {
  return keys.find((key) => String(key.id) === String(job.api_key_id));
}

async function removeJobRows(keys, rows) {
  const failures = [];
  for (const row of rows) {
    const key = keyForJob(keys, row);
    if (!key) {
      failures.push(row);
      continue;
    }
    try {
      await batchImagesApi.remove(key.key, row.id);
    } catch (error) {
      failures.push({ ...row, error });
    }
  }
  return failures;
}

function unavailableKeyMessage(locale) {
  return locale === "zh" ? "找不到任务使用的 API Key。" : "The API key used by this job is unavailable.";
}

async function executeJobMutation(request, keys, locale) {
  if (request.kind !== "cancel") return removeJobRows(keys, request.rows);
  const key = keyForJob(keys, request.rows[0]);
  if (!key) throw new Error(unavailableKeyMessage(locale));
  await batchImagesApi.cancel(key.key, request.rows[0].id);
  return [];
}

function deleteFailureMessage(total, failed, locale) {
  const deleted = total - failed;
  return locale === "zh" ? `${deleted} 条已删除，${failed} 条删除失败。列表已刷新。` : `${deleted} deleted; ${failed} failed. The list was refreshed.`;
}

function SelectionCheckbox({ checked, indeterminate = false, label, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return <input ref={ref} type="checkbox" checked={checked} aria-label={label} onChange={(event) => onChange(event.target.checked)} />;
}

function BatchForm({ form, setForm, keys, models, modelsLoading }) {
  const { t, locale } = useLocale();
  const labels = localCopy("form", locale);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const lines = promptItems(form.prompts, form.output_count);
  const estimate = form.json.trim() ? "—" : expectedOutputs(lines);
  const modelPlaceholder = modelsLoading ? labels.loadingModels : labels.selectModel;
  return <div className="console-form-grid">
    <Field label={t("batch.key")} className="is-full"><SelectInput value={form.keyId} onChange={set("keyId")} disabled={!keys.length}>{keys.map((key) => <option key={key.id} value={key.id}>{key.name} · {key.group?.name || "Gemini"}</option>)}</SelectInput></Field>
    <Field label={t("batch.task")} className="is-full"><TextInput value={form.task_name} onChange={set("task_name")} placeholder={labels.taskPlaceholder} /></Field>
    <Field label={t("batch.model")}><SelectInput value={form.model} onChange={set("model")} disabled={modelsLoading}><option value="">{modelPlaceholder}</option>{models.map((model) => <option key={model} value={model}>{model}</option>)}</SelectInput></Field>
    <Field label={t("batch.provider")}><SelectInput value={form.provider} onChange={set("provider")}><option value="">Auto</option><option value="gemini_api">Gemini API</option><option value="vertex">Vertex AI</option></SelectInput></Field>
    <Field label={t("batch.size")}><SelectInput value={form.image_size} onChange={set("image_size")}><option>1K</option><option>2K</option><option>4K</option></SelectInput></Field>
    <Field label={t("batch.aspect")}><SelectInput value={form.aspect_ratio} onChange={set("aspect_ratio")}><option value="">Auto</option><option>1:1</option><option>16:9</option><option>9:16</option><option>4:3</option><option>3:4</option></SelectInput></Field>
    <Field label={labels.format}><SelectInput value={form.response_mime_type} onChange={set("response_mime_type")}><option value="image/png">PNG</option><option value="image/jpeg">JPEG</option><option value="image/webp">WebP</option></SelectInput></Field>
    <Field label={labels.outputCount} hint={`${labels.estimated}: ${estimate}`}><SelectInput value={form.output_count} onChange={set("output_count")}>{outputCounts.map((count) => <option key={count} value={count}>{count}</option>)}</SelectInput></Field>
    <Field label={t("batch.prompts")} className="is-full" hint={labels.promptsHint}><TextArea rows="8" value={form.prompts} onChange={set("prompts")} placeholder={locale === "zh" ? "一只戴宇航头盔的猫\n蓝色玻璃城市的航拍视角" : "A cat wearing an astronaut helmet\nAerial view of a blue glass city"} /></Field>
    <Field label={t("batch.json")} className="is-full" hint={labels.jsonHint}><TextArea rows="6" className="console-mono" value={form.json} onChange={set("json")} placeholder='[{"custom_id":"img_001","prompt":"…","output_count":2,"reference_images":[{"mime_type":"image/png","data":"BASE64"}]}]' /></Field>
  </div>;
}

function FilterPanel({ keys, filters, taskDraft, setTaskDraft, onFilter, onApply, onReset, onRefresh, loading }) {
  const { t, locale } = useLocale();
  const labels = localCopy("filters", locale);
  return <Panel><div className="console-toolbar">
    <Field label={t("batch.task")} className="is-wide"><TextInput value={taskDraft} onChange={(event) => setTaskDraft(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onApply()} placeholder={labels.search} /></Field>
    <Field label={labels.key}><SelectInput value={filters.keyId} onChange={(event) => onFilter("keyId", event.target.value)}><option value="">{labels.allKeys}</option>{keys.map((key) => <option key={key.id} value={key.id}>{key.name}</option>)}</SelectInput></Field>
    <Field label={t("common.status")}><SelectInput value={filters.status} onChange={(event) => onFilter("status", event.target.value)}><option value="">{t("common.all")}</option>{["queued", "running", "indexing", "processing_results", "settling", "completed", "failed", "cancelled", "output_deleted"].map((status) => <option key={status} value={status}>{statusLabel(status, locale)}</option>)}</SelectInput></Field>
    <Field label={labels.downloaded}><SelectInput value={filters.downloaded} onChange={(event) => onFilter("downloaded", event.target.value)}><option value="">{t("common.all")}</option><option value="true">{labels.yes}</option><option value="false">{labels.no}</option></SelectInput></Field>
    <Button icon="search" onClick={onApply}>{t("common.search")}</Button>
    <Button icon="reset" onClick={onReset}>{labels.reset}</Button>
    <IconButton icon="refresh" label={t("common.refresh")} onClick={onRefresh} disabled={loading} />
  </div></Panel>;
}

function SelectionBar({ count, downloadCount, deleteCount, busy, onDownload, onDelete, onClear }) {
  const { locale } = useLocale();
  if (!count) return null;
  return <Panel><div className="console-toolbar">
    <strong>{locale === "zh" ? `已选择 ${count} 个任务` : `${count} jobs selected`}</strong>
    <Button icon="download" onClick={onDownload} disabled={!downloadCount || busy}>{locale === "zh" ? `下载选中 (${downloadCount})` : `Download (${downloadCount})`}</Button>
    <Button variant="danger" icon="trash" onClick={onDelete} disabled={!deleteCount || busy}>{locale === "zh" ? `删除记录 (${deleteCount})` : `Delete (${deleteCount})`}</Button>
    <Button onClick={onClear}>{locale === "zh" ? "清除选择" : "Clear"}</Button>
  </div></Panel>;
}

function CursorPagination({ page, pageSize, count, hasMore, loading, onPage, onPageSize }) {
  const { t, locale } = useLocale();
  if (!count && page === 1) return null;
  return <div className="console-pagination"><span>{locale === "zh" ? `第 ${page} 页 · 本页 ${count} 条` : `Page ${page} · ${count} on this page`}</span><div><SelectInput value={pageSize} onChange={(event) => onPageSize(Number(event.target.value))}>{pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}</SelectInput><Button onClick={() => onPage(page - 1)} disabled={page <= 1 || loading}>{t("common.previous")}</Button><Button onClick={() => onPage(page + 1)} disabled={!hasMore || loading}>{t("common.next")}</Button></div></div>;
}

function JobNameCell({ row, expanded, formatDate, labels, onExpand }) {
  const childPrefix = row.is_child ? `${labels.child} · ` : "";
  const icon = expanded.has(row._row_id) ? "chevronDown" : "chevronRight";
  const actionLabel = expanded.has(row._row_id) ? labels.collapse : labels.expand;
  return <div className="console-key-name" style={{ paddingLeft: row.is_child ? 22 : 0 }}><div className="console-inline-actions">{row.child_count > 0 && !row.is_child && <IconButton icon={icon} label={actionLabel} onClick={() => onExpand(row._row_id)} />}<strong>{row.task_name || row.id}</strong></div><small>{childPrefix}{unixDate(row.created_at, formatDate)}</small></div>;
}

function JobProgressCell({ row, children }) {
  const display = aggregateJob(row, children);
  const done = numeric(display.success_count) + numeric(display.fail_count);
  const progress = numeric(display.item_count) ? done / numeric(display.item_count) * 100 : 0;
  return <div className="console-table-progress"><span>{numeric(display.success_count)} / {numeric(display.fail_count)} · {numeric(display.item_count)}</span><ProgressBar value={progress} /></div>;
}

function JobActions({ row, children, labels, busy, onInspect, onCancel, onDownload, onRetry, onDelete }) {
  return <div className="console-inline-actions"><IconButton icon="eye" label={labels.inspect} onClick={() => onInspect(row)} disabled={busy} />{canCancel(row) && <IconButton icon="close" label={labels.cancel} onClick={() => onCancel(row)} disabled={busy} />}{canDownload(row) && <IconButton icon="download" label={labels.download} onClick={() => onDownload(row)} disabled={busy} />}{canRetry(row, children) && <IconButton icon="refresh" label={labels.retry} onClick={() => onRetry(row)} disabled={busy} />}{canDelete(row) && <IconButton icon="trash" label={labels.remove} onClick={() => onDelete(row)} disabled={busy} />}</div>;
}

function JobTable(props) {
  const { rows, childrenByParent, selected, expanded, formatCurrency, formatDate, locale, onSelect, onSelectAll, onExpand, onInspect, onCancel, onDownload, onRetry, onDelete, busy } = props;
  const labels = localCopy("jobs", locale);
  const allSelected = Boolean(rows.length) && rows.every((row) => selected.has(row._row_id));
  const someSelected = !allSelected && rows.some((row) => selected.has(row._row_id));
  const columns = [
    { key: "select", label: <SelectionCheckbox checked={allSelected} indeterminate={someSelected} label={labels.selectPage} onChange={onSelectAll} />, render: (row) => <SelectionCheckbox checked={selected.has(row._row_id)} label={row.task_name || row.id} onChange={(checked) => onSelect(row._row_id, checked)} /> },
    { key: "task_name", label: labels.task, render: (row) => <JobNameCell row={row} expanded={expanded} formatDate={formatDate} labels={labels} onExpand={onExpand} /> },
    { key: "model", label: labels.model, render: (row) => <span title={row.model}>{row.model || "—"}</span> },
    { key: "api_key_name", label: labels.key },
    { key: "status", label: labels.status, render: (row) => { const display = aggregateJob(row, childrenByParent.get(row._row_id)); return <StatusBadge status={display.status} label={statusLabel(display.status, locale)} />; } },
    { key: "progress", label: labels.results, render: (row) => <JobProgressCell row={row} children={childrenByParent.get(row._row_id)} /> },
    { key: "cost", label: labels.cost, align: "right", render: (row) => { const display = aggregateJob(row, childrenByParent.get(row._row_id)); return formatCurrency(display.actual_cost ?? display.hold_amount ?? display.estimated_cost); } },
    { key: "downloaded", label: labels.downloaded, render: (row) => row.downloaded_at ? unixDate(row.downloaded_at, formatDate) : labels.notDownloaded },
    { key: "actions", label: labels.actions, align: "right", render: (row) => <JobActions row={row} children={childrenByParent.get(row._row_id)} labels={labels} busy={busy} onInspect={onInspect} onCancel={onCancel} onDownload={onDownload} onRetry={onRetry} onDelete={onDelete} /> },
  ];
  return <DataTable columns={columns} rows={rows} rowKey="_row_id" onRowClick={onInspect} empty={<EmptyState icon="image" title={labels.empty} />} />;
}

function itemStatus(item, locale) {
  if (["success", "succeeded"].includes(item.status)) return locale === "zh" ? "成功" : "Succeeded";
  return statusLabel(item.status, locale);
}

function canPreviewItem(item) {
  return ["success", "succeeded"].includes(item.status) && numeric(item.image_count) > 0;
}

function itemResult(item, labels) {
  if (item.error?.message) return item.error.message;
  return numeric(item.image_count) > 0 ? labels.available : "—";
}

function DetailItemsTable({ items, locale, onPreview }) {
  const labels = localCopy("items", locale);
  const columns = [
    { key: "source_task_name", label: labels.source },
    { key: "custom_id", label: "Custom ID", render: (row) => <span className="console-mono">{row.custom_id}</span> },
    { key: "prompt_preview", label: "Prompt", render: (row) => <span className="console-clamp" title={row.prompt_preview || ""}>{row.prompt_preview || "—"}</span> },
    { key: "status", label: labels.status, render: (row) => <StatusBadge status={row.status === "succeeded" ? "success" : row.status} label={itemStatus(row, locale)} /> },
    { key: "image_count", label: labels.images, render: (row) => <div className="console-inline-actions"><span>{numeric(row.image_count)}</span>{canPreviewItem(row) && <IconButton icon="eye" label={labels.preview} onClick={() => onPreview(row)} />}</div> },
    { key: "result", label: labels.result, render: (row) => itemResult(row, labels) },
  ];
  return <DataTable columns={columns} rows={items} rowKey="_row_id" empty={<EmptyState icon="image" title={labels.empty} description={labels.emptyHint} />} />;
}

function PreviewButtons({ preview, onPreview }) {
  if (!preview || numeric(preview.item.image_count) <= 1) return null;
  return <div className="console-inline-actions">{Array.from({ length: numeric(preview.item.image_count) }, (_, index) => <Button key={index} variant={preview.index === index ? "primary" : "secondary"} onClick={() => onPreview(preview.item, index)}>{index + 1}</Button>)}</div>;
}

function PreviewContent({ preview, onPreview }) {
  if (!preview) return null;
  if (preview.loading) return <Spinner />;
  if (preview.error) return <ErrorState message={preview.error} onRetry={() => onPreview(preview.item, preview.index)} />;
  return preview.url ? <img src={preview.url} alt={preview.item.custom_id} /> : null;
}

function previewTitle(preview) {
  if (!preview) return "Preview";
  return `${preview.item.custom_id} · ${preview.index + 1}/${preview.item.image_count}`;
}

function ItemPreviewModal({ preview, onClose, onPreview }) {
  return <Modal open={Boolean(preview)} title={previewTitle(preview)} onClose={onClose} size="large" footer={<PreviewButtons preview={preview} onPreview={onPreview} />}><div className="console-image-preview"><PreviewContent preview={preview} onPreview={onPreview} /></div></Modal>;
}

function DetailItems({ apiKey, items }) {
  const { locale } = useLocale();
  const { notify } = useConsole();
  const [preview, setPreview] = useState(null);
  const previewUrlRef = useRef("");
  const requestRef = useRef(0);
  const closePreview = useCallback(() => {
    requestRef.current += 1;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
    setPreview(null);
  }, []);
  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);
  const openPreview = async (item, index = 0) => {
    const request = ++requestRef.current;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = "";
    setPreview({ item, index, loading: true, error: "", url: "" });
    try {
      const blob = await batchImagesApi.itemContent(apiKey, item.batch_id, item.custom_id, index);
      const url = URL.createObjectURL(blob);
      if (request !== requestRef.current) return URL.revokeObjectURL(url);
      previewUrlRef.current = url;
      setPreview({ item, index, loading: false, error: "", url });
    } catch (error) {
      if (request === requestRef.current) setPreview({ item, index, loading: false, error: error.message, url: "" });
      notify("error", error.message);
    }
  };
  return <><DetailItemsTable items={items} locale={locale} onPreview={openPreview} /><ItemPreviewModal preview={preview} onClose={closePreview} onPreview={openPreview} /></>;
}

function DetailSummary({ detail, display, formatCurrency, formatDate, onRefresh, locale }) {
  const labels = localCopy("detail", locale);
  const downloaded = detail.job.downloaded_at ? `${labels.downloaded} ${unixDate(detail.job.downloaded_at, formatDate)}` : labels.notDownloaded;
  return <div className="console-batch-summary"><StatusBadge status={display.status} label={statusLabel(display.status, locale)} /><span>{display.model || "—"}</span><span>{numeric(display.success_count)} {labels.succeeded} · {numeric(display.fail_count)} {labels.failed}</span><span>{formatCurrency(display.actual_cost ?? display.hold_amount ?? display.estimated_cost)}</span><span>{downloaded}</span><Button icon="refresh" onClick={onRefresh}>{labels.refresh}</Button></div>;
}

function DetailContent({ detail, apiKey, formatCurrency, formatDate, onRefresh }) {
  const { locale } = useLocale();
  if (detail.loading) return <Spinner />;
  if (detail.error) return <ErrorState message={detail.error} onRetry={onRefresh} />;
  const display = aggregateJob(detail.job, detail.children);
  return <div className="console-detail-stack"><DetailSummary detail={detail} display={display} formatCurrency={formatCurrency} formatDate={formatDate} onRefresh={onRefresh} locale={locale} /><DetailItems apiKey={apiKey} items={detail.items} /></div>;
}

function GuideContent() {
  const { locale } = useLocale();
  if (locale === "zh") return <div className="console-detail-stack"><p>1. 只会列出属于已开启批量生图 Gemini 分组的 API Key；筛选条件会直接映射到网关列表接口。</p><p>2. 普通提示词模式支持每条生成 1–4 张。高级 Items JSON 可为每项分别设置 <span className="console-mono">output_count</span> 和 <span className="console-mono">reference_images</span>。</p><p>3. 父任务可以展开查看失败项重试产生的子任务；父任务结果栏会汇总子任务恢复的成功结果。</p><p>4. 已完成任务可下载 ZIP。失败任务可以仅重试失败项，新任务会携带原始根任务的 <span className="console-mono">parent_batch_id</span>。</p><p>5. 详情中的图片按需加载，不会在打开任务时自动下载全部原图。</p></div>;
  return <div className="console-detail-stack"><p>1. Only API keys in Gemini groups with batch images enabled are listed. Filters map directly to the gateway list endpoint.</p><p>2. Prompt mode creates 1–4 outputs per item. Advanced Items JSON supports per-item <span className="console-mono">output_count</span> and <span className="console-mono">reference_images</span>.</p><p>3. Expand a parent to inspect retry children. Parent result counts include successful recoveries from child jobs.</p><p>4. Completed jobs can be downloaded as ZIP files. Failed-only retry submits a child with the root <span className="console-mono">parent_batch_id</span>.</p><p>5. Detail images load only when requested, so opening a job does not download every original image.</p></div>;
}

function PageActions({ hasKeys, onGuide, onCreate }) {
  const { t, locale } = useLocale();
  return <><Button icon="book" onClick={onGuide}>{locale === "zh" ? "使用说明" : "Guide"}</Button><Button variant="primary" icon="plus" onClick={onCreate} disabled={!hasKeys}>{t("batch.submit")}</Button></>;
}

function NoKeysNotice({ hasKeys, state }) {
  const { locale } = useLocale();
  if (hasKeys || state.loading || state.error) return null;
  const title = locale === "zh" ? "没有可用的 Gemini 密钥" : "No eligible Gemini key";
  const description = locale === "zh" ? "请先创建一个属于已开启批量图片分组的密钥。" : "Create a key in a Gemini group with batch images enabled.";
  return <Panel><EmptyState icon="image" title={title} description={description} /></Panel>;
}

function JobsPanel({ state, tableProps, pagingProps, onRetry }) {
  const { t } = useLocale();
  let content;
  if (state.loading) content = <Spinner />;
  else if (state.error) content = <ErrorState message={state.error} onRetry={onRetry} />;
  else content = <><JobTable {...tableProps} /><CursorPagination {...pagingProps} /></>;
  return <Panel title={t("batch.jobs")}>{content}</Panel>;
}

function CreateBatchModal({ open, form, setForm, keys, models, modelsLoading, working, onClose, onSubmit }) {
  const { t } = useLocale();
  const busy = Boolean(working);
  const submitLabel = working === "submit" ? t("common.loading") : t("batch.submit");
  const footer = <><Button onClick={onClose} disabled={busy}>{t("common.cancel")}</Button><Button variant="primary" onClick={onSubmit} disabled={busy || modelsLoading}>{submitLabel}</Button></>;
  return <Modal open={open} title={t("batch.submit")} description={t("batch.subtitle")} onClose={onClose} size="large" footer={footer}><BatchForm form={form} setForm={setForm} keys={keys} models={models} modelsLoading={modelsLoading} /></Modal>;
}

function DetailFooter({ detail, retryable, busy, onClose, onCancel, onRetry, onDownload }) {
  const { t, locale } = useLocale();
  if (!detail || detail.loading) return null;
  return <><Button onClick={onClose}>{t("common.close")}</Button>{canCancel(detail.job) && <Button onClick={onCancel}>{t("batch.cancel")}</Button>}{retryable && <Button icon="refresh" onClick={onRetry} disabled={busy}>{locale === "zh" ? "仅重试失败项" : "Retry failed"}</Button>}{canDownload(detail.job) && <Button variant="primary" icon="download" onClick={onDownload} disabled={busy}>{t("batch.download")}</Button>}</>;
}

function DetailBatchModal({ detail, detailKey, retryable, busy, formatCurrency, formatDate, onClose, onInspect, onCancel, onRetry, onDownload }) {
  const { t } = useLocale();
  const title = detail?.job?.task_name || t("batch.items");
  const footer = <DetailFooter detail={detail} retryable={retryable} busy={busy} onClose={onClose} onCancel={onCancel} onRetry={onRetry} onDownload={onDownload} />;
  return <Modal open={Boolean(detail)} title={title} onClose={onClose} size="large" footer={footer}>{detail && detailKey && <DetailContent detail={detail} apiKey={detailKey.key} formatCurrency={formatCurrency} formatDate={formatDate} onRefresh={() => onInspect(detail.job)} />}</Modal>;
}

function GuideModal({ open, onClose }) {
  const { t, locale } = useLocale();
  const title = locale === "zh" ? "批量图片使用说明" : "Batch images guide";
  return <Modal open={open} title={title} onClose={onClose} size="large" footer={<Button variant="primary" onClick={onClose}>{t("common.close")}</Button>}><GuideContent /></Modal>;
}

function confirmDescription(confirm, locale) {
  if (confirm?.kind === "cancel") return locale === "zh" ? "取消会请求上游停止任务；已经成功的图片仍会按成功项结算。" : "Cancellation asks the provider to stop; successful outputs are still settled.";
  const count = confirm?.rows?.length || 0;
  return locale === "zh" ? `将永久删除 ${count} 条任务记录及服务器结果，且无法撤销。` : `Permanently delete ${count} job records and stored results?`;
}

function JobConfirmDialog({ confirm, busy, onClose, onConfirm }) {
  const { t, locale } = useLocale();
  const title = confirm?.kind === "cancel" ? t("batch.cancel") : t("batch.remove");
  return <ConfirmDialog open={Boolean(confirm)} title={title} description={confirmDescription(confirm, locale)} busy={busy} onClose={onClose} onConfirm={onConfirm} />;
}

function detailKeyFor(keys, detail) {
  if (!detail) return null;
  return keyForJob(keys, detail.job);
}

function detailCanRetry(detail) {
  if (!detail) return false;
  return canRetry(detail.job, detail.children || []);
}

function BatchImagesView(props) {
  const { t } = useLocale();
  const { keys, jobsState, filters, taskDraft, selectedRows, downloadableRows, deletableRows, working, rows, childrenByParent, selected, expanded, formatCurrency, formatDate, locale, page, pageSize, formOpen, form, models, modelsLoading, detail, detailKey, retryable, guideOpen, confirm, actions } = props;
  const tableProps = { rows, childrenByParent, selected, expanded, formatCurrency, formatDate, locale, onSelect: actions.toggleSelected, onSelectAll: actions.toggleAll, onExpand: actions.toggleExpanded, onInspect: actions.inspect, onCancel: actions.confirmCancel, onDownload: actions.downloadOne, onRetry: actions.retryFailed, onDelete: actions.confirmDelete, busy: Boolean(working) };
  const pagingProps = { page, pageSize, count: rows.length, hasMore: jobsState.hasMore, loading: jobsState.loading, onPage: actions.setPage, onPageSize: actions.changePageSize };
  return <Page title={t("batch.title")} subtitle={t("batch.subtitle")} actions={<PageActions hasKeys={Boolean(keys.length)} onGuide={actions.openGuide} onCreate={actions.openCreate} />}>
    <FilterPanel keys={keys} filters={filters} taskDraft={taskDraft} setTaskDraft={actions.setTaskDraft} onFilter={actions.changeFilter} onApply={actions.applySearch} onReset={actions.resetFilters} onRefresh={actions.loadJobs} loading={jobsState.loading} />
    <NoKeysNotice hasKeys={Boolean(keys.length)} state={jobsState} />
    <SelectionBar count={selectedRows.length} downloadCount={downloadableRows.length} deleteCount={deletableRows.length} busy={Boolean(working)} onDownload={actions.downloadSelected} onDelete={actions.confirmBulkDelete} onClear={actions.clearSelected} />
    <JobsPanel state={jobsState} tableProps={tableProps} pagingProps={pagingProps} onRetry={actions.loadJobs} />
    <CreateBatchModal open={formOpen} form={form} setForm={actions.setForm} keys={keys} models={models} modelsLoading={modelsLoading} working={working} onClose={actions.closeCreate} onSubmit={actions.submit} />
    <DetailBatchModal detail={detail} detailKey={detailKey} retryable={retryable} busy={Boolean(working)} formatCurrency={formatCurrency} formatDate={formatDate} onClose={actions.closeDetail} onInspect={actions.inspect} onCancel={actions.confirmDetailCancel} onRetry={actions.retryDetail} onDownload={actions.downloadDetail} />
    <GuideModal open={guideOpen} onClose={actions.closeGuide} />
    <JobConfirmDialog confirm={confirm} busy={Boolean(working)} onClose={actions.closeConfirm} onConfirm={actions.executeConfirmed} />
  </Page>;
}

export function BatchImagesPage() {
  const { t, locale, formatCurrency, formatDate } = useLocale();
  const { notify } = useConsole();
  const [keys, setKeys] = useState([]);
  const [models, setModels] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [jobsState, setJobsState] = useState({ loading: true, error: "", hasMore: false });
  const [filters, setFilters] = useState(initialFilters);
  const [taskDraft, setTaskDraft] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState(new Set());
  const [expanded, setExpanded] = useState(new Set());
  const [working, setWorking] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [form, setForm] = useState(initialForm());
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const jobsControllerRef = useRef(null);
  const detailRequestRef = useRef(0);
  const childrenByParent = useMemo(() => groupChildren(jobs), [jobs]);
  const rows = useMemo(() => visibleJobs(jobs, childrenByParent, expanded), [jobs, childrenByParent, expanded]);
  const selectedRows = useMemo(() => jobs.filter((job) => selected.has(job._row_id)), [jobs, selected]);
  const downloadableRows = useMemo(() => selectedRows.filter(canDownload), [selectedRows]);
  const deletableRows = useMemo(() => selectedRows.filter(canDelete), [selectedRows]);

  useEffect(() => {
    const controller = new AbortController();
    eligibleKeys(controller.signal).then((items) => {
      if (controller.signal.aborted) return;
      setKeys(items);
      setForm((current) => ({ ...current, keyId: current.keyId || String(items[0]?.id || "") }));
      if (!items.length) setJobsState({ loading: false, error: "", hasMore: false });
    }).catch((error) => {
      if (error.name !== "AbortError" && !controller.signal.aborted) setJobsState({ loading: false, error: error.message, hasMore: false });
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const key = keys.find((item) => String(item.id) === String(form.keyId));
    let active = true;
    if (!key) {
      setModels([]);
      setModelsLoading(false);
      return undefined;
    }
    setModelsLoading(true);
    batchImagesApi.models(key.key).then((result) => {
      if (!active) return;
      const values = [...new Set((result.data || []).map((model) => model.id || model.value).filter(Boolean))];
      setModels(values);
      setForm((current) => ({ ...current, model: values.includes(current.model) ? current.model : values[0] || "" }));
    }).catch((error) => active && notify("error", error.message)).finally(() => active && setModelsLoading(false));
    return () => { active = false; };
  }, [form.keyId, keys, notify]);

  const loadJobs = useCallback(async (silent = false) => {
    const targetKeys = filters.keyId ? keys.filter((key) => String(key.id) === String(filters.keyId)) : keys;
    jobsControllerRef.current?.abort();
    const controller = new AbortController();
    jobsControllerRef.current = controller;
    if (!targetKeys.length) {
      setJobs([]);
      setJobsState({ loading: false, error: "", hasMore: false });
      return;
    }
    if (!silent) setJobsState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const result = await fetchJobsPage(targetKeys, filters, page, pageSize, controller.signal);
      if (controller.signal.aborted) return;
      const next = addChildCounts(result.rows);
      setJobs(next);
      setSelected((current) => new Set([...current].filter((id) => next.some((job) => job._row_id === id))));
      setJobsState({ loading: false, error: "", hasMore: result.hasMore });
    } catch (error) {
      if (error.name !== "AbortError" && !silent) setJobsState((current) => ({ ...current, loading: false, error: error.message }));
    }
  }, [filters, keys, page, pageSize]);

  useEffect(() => {
    loadJobs();
    return () => jobsControllerRef.current?.abort();
  }, [loadJobs]);

  useEffect(() => {
    if (!jobs.some((job) => !terminalStatuses.has(job.status))) return undefined;
    const timer = window.setInterval(() => loadJobs(true), 7000);
    return () => window.clearInterval(timer);
  }, [jobs, loadJobs]);

  const changeFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
    setSelected(new Set());
  };

  const applySearch = () => {
    const taskName = taskDraft.trim();
    if (filters.taskName === taskName && page === 1) return loadJobs();
    setFilters((current) => ({ ...current, taskName }));
    setPage(1);
    setSelected(new Set());
  };

  const resetFilters = () => {
    setTaskDraft("");
    setFilters({ ...initialFilters });
    setPage(1);
    setSelected(new Set());
  };

  const toggleSelected = (id, checked) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked) => {
    setSelected((current) => {
      const next = new Set(current);
      rows.forEach((row) => checked ? next.add(row._row_id) : next.delete(row._row_id));
      return next;
    });
  };

  const toggleExpanded = (id) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const inspect = useCallback(async (row) => {
    const key = keyForJob(keys, row);
    if (!key) return notify("error", locale === "zh" ? "找不到任务使用的 API Key。" : "The API key used by this job is unavailable.");
    const request = ++detailRequestRef.current;
    const children = row.parent_batch_id ? [] : childrenByParent.get(row._row_id) || [];
    const sources = [row, ...children];
    setDetail({ loading: true, error: "", job: row, children, items: [] });
    try {
      const [full, ...itemResults] = await Promise.all([batchImagesApi.get(key.key, row.id), ...sources.map((source) => batchImagesApi.items(key.key, source.id))]);
      if (request !== detailRequestRef.current) return;
      const job = normalizeJob(full, key);
      const items = itemResults.flatMap((result, index) => (result.data || []).map((item) => ({ ...item, batch_id: sources[index].id, source_task_name: sources[index].parent_batch_id ? (locale === "zh" ? "重试子任务" : "Retry child") : (locale === "zh" ? "主任务" : "Parent job"), _row_id: `${sources[index].id}:${item.custom_id}` })));
      setDetail({ loading: false, error: "", job, children, items });
    } catch (error) {
      if (request === detailRequestRef.current) setDetail({ loading: false, error: error.message, job: row, children, items: [] });
    }
  }, [childrenByParent, keys, locale, notify]);

  const closeDetail = () => {
    detailRequestRef.current += 1;
    setDetail(null);
  };

  const submit = async () => {
    const key = keys.find((item) => String(item.id) === String(form.keyId));
    let payload;
    try {
      payload = buildPayload(form, locale);
    } catch {
      return notify("error", invalidItemsMessage(locale));
    }
    const problem = submissionProblem(key, payload, locale);
    if (problem) return notify("warning", problem);
    setWorking("submit");
    try {
      await batchImagesApi.submit(key.key, payload, `sentence-ui-${makeIdempotencyKey()}`);
      setFormOpen(false);
      setForm((current) => ({ ...initialForm(current.keyId), model: current.model }));
      notify("success", submittedMessage(locale));
      await loadJobs(true);
    } catch (error) {
      notify("error", error.message);
    } finally {
      setWorking("");
    }
  };

  const markDownloaded = (row) => {
    const downloadedAt = Math.floor(Date.now() / 1000);
    setJobs((current) => current.map((job) => job._row_id === row._row_id ? { ...job, downloaded_at: job.downloaded_at || downloadedAt } : job));
    setDetail((current) => current?.job?._row_id === row._row_id ? { ...current, job: { ...current.job, downloaded_at: current.job.downloaded_at || downloadedAt } } : current);
  };

  const saveDownload = async (row) => {
    const key = keyForJob(keys, row);
    if (!key) throw new Error(locale === "zh" ? "找不到任务使用的 API Key。" : "The API key used by this job is unavailable.");
    const blob = await batchImagesApi.download(key.key, row.id);
    downloadBlob(blob, `${row.task_name || row.id}.zip`);
    markDownloaded(row);
  };

  const downloadOne = async (row) => {
    setWorking(`download:${row._row_id}`);
    try {
      await saveDownload(row);
      notify("success", locale === "zh" ? "下载已开始。" : "Download started.");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setWorking("");
    }
  };

  const downloadSelected = async () => {
    setWorking("bulk-download");
    try {
      for (const row of downloadableRows) await saveDownload(row);
      notify("success", locale === "zh" ? "选中任务的下载已开始。" : "Selected downloads started.");
    } catch (error) {
      notify("error", error.message);
    } finally {
      setWorking("");
    }
  };

  const retryFailed = async (row) => {
    const key = keyForJob(keys, row);
    if (!key) return notify("error", unavailableKeyMessage(locale));
    setWorking(`retry:${row._row_id}`);
    try {
      const created = await submitRetryJob(key, row, childrenForRetry(row, childrenByParent), locale);
      if (!created) return notify("warning", missingRetryPromptMessage(locale));
      setExpanded((current) => new Set([...current, retryParentRef(key, created, row)]));
      await loadJobs(true);
      setDetail((current) => current?.job?._row_id === row._row_id ? null : current);
      notify("success", retrySubmittedMessage(locale));
    } catch (error) {
      notify("error", error.message);
    } finally {
      setWorking("");
    }
  };

  const executeConfirmed = async () => {
    if (!confirm) return;
    const request = confirm;
    setWorking(request.kind);
    try {
      const failures = await executeJobMutation(request, keys, locale);
      setConfirm(null);
      setSelected(new Set());
      closeDetail();
      await loadJobs(true);
      if (failures.length) notify("error", deleteFailureMessage(request.rows.length, failures.length, locale));
      else notify("success", t("common.success"));
    } catch (error) {
      notify("error", error.message);
    } finally {
      setWorking("");
    }
  };

  const changePageSize = (next) => {
    setPageSize(next);
    setPage(1);
    setSelected(new Set());
  };

  const detailKey = detailKeyFor(keys, detail);
  const retryable = detailCanRetry(detail);
  const actions = {
    setTaskDraft,
    changeFilter,
    applySearch,
    resetFilters,
    loadJobs: () => loadJobs(),
    toggleSelected,
    toggleAll,
    toggleExpanded,
    inspect,
    confirmCancel: (row) => setConfirm({ kind: "cancel", rows: [row] }),
    confirmDelete: (row) => setConfirm({ kind: "delete", rows: [row] }),
    downloadOne,
    retryFailed,
    setPage,
    changePageSize,
    openGuide: () => setGuideOpen(true),
    closeGuide: () => setGuideOpen(false),
    openCreate: () => setFormOpen(true),
    closeCreate: () => { if (!working) setFormOpen(false); },
    clearSelected: () => setSelected(new Set()),
    downloadSelected,
    confirmBulkDelete: () => setConfirm({ kind: "bulk-delete", rows: deletableRows }),
    setForm,
    submit,
    closeDetail,
    confirmDetailCancel: () => setConfirm({ kind: "cancel", rows: [detail.job] }),
    retryDetail: () => retryFailed(detail.job),
    downloadDetail: () => downloadOne(detail.job),
    closeConfirm: () => setConfirm(null),
    executeConfirmed,
  };
  return <BatchImagesView keys={keys} jobsState={jobsState} filters={filters} taskDraft={taskDraft} selectedRows={selectedRows} downloadableRows={downloadableRows} deletableRows={deletableRows} working={working} rows={rows} childrenByParent={childrenByParent} selected={selected} expanded={expanded} formatCurrency={formatCurrency} formatDate={formatDate} locale={locale} page={page} pageSize={pageSize} formOpen={formOpen} form={form} models={models} modelsLoading={modelsLoading} detail={detail} detailKey={detailKey} retryable={retryable} guideOpen={guideOpen} confirm={confirm} actions={actions} />;
}
