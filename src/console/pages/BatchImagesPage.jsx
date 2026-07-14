import { useCallback, useEffect, useRef, useState } from "react";
import { batchImagesApi, keysApi } from "../../api";
import { useConsole } from "../ConsoleContext";
import { useLocale } from "../i18n";
import { Button, ConfirmDialog, DataTable, EmptyState, ErrorState, Field, IconButton, Modal, Page, Panel, ProgressBar, SelectInput, Spinner, StatusBadge, TextArea, TextInput } from "../UI";
import { downloadBlob, makeIdempotencyKey, statusLabel } from "../utils";

const terminalStatuses = new Set(["completed", "failed", "cancelled", "output_deleted"]);

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

function promptItems(prompts) {
  return String(prompts || "").split("\n").map((prompt) => prompt.trim()).filter(Boolean).map((prompt, index) => ({ custom_id: `img_${String(index + 1).padStart(3, "0")}`, prompt }));
}

function buildPayload(form) {
  let items = promptItems(form.prompts);
  if (form.json.trim()) {
    const parsed = JSON.parse(form.json);
    items = Array.isArray(parsed) ? parsed : parsed.items || [];
  }
  return {
    task_name: form.task_name.trim(), model: form.model, provider: form.provider,
    image_size: form.image_size, aspect_ratio: form.aspect_ratio, response_mime_type: "image/png", items,
  };
}

function unixDate(value, formatDate) {
  if (!value) return "—";
  return formatDate(Number(value) < 1000000000000 ? Number(value) * 1000 : value);
}

function BatchForm({ form, setForm, models }) {
  const { t, locale } = useLocale();
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <div className="console-form-grid"><Field label={t("batch.task")}><TextInput value={form.task_name} onChange={set("task_name")} placeholder={locale === "zh" ? "例如：夏季活动主视觉" : "e.g. Summer campaign"} /></Field><Field label={t("batch.model")}><SelectInput value={form.model} onChange={set("model")}><option value="">{locale === "zh" ? "选择模型" : "Select a model"}</option>{models.map((model) => <option key={model.id || model.value} value={model.id || model.value}>{model.id || model.label || model.value}</option>)}</SelectInput></Field><Field label={t("batch.provider")}><SelectInput value={form.provider} onChange={set("provider")}><option value="">Auto</option><option value="gemini_api">Gemini API</option><option value="vertex">Vertex AI</option></SelectInput></Field><Field label={t("batch.size")}><SelectInput value={form.image_size} onChange={set("image_size")}><option>1K</option><option>2K</option><option>4K</option></SelectInput></Field><Field label={t("batch.aspect")}><SelectInput value={form.aspect_ratio} onChange={set("aspect_ratio")}><option value="">Auto</option><option>1:1</option><option>16:9</option><option>9:16</option><option>4:3</option><option>3:4</option></SelectInput></Field><Field label={t("batch.prompts")} className="is-full" hint={locale === "zh" ? "每行会成为一个独立任务。" : "Each non-empty line becomes one item."}><TextArea rows="8" value={form.prompts} onChange={set("prompts")} placeholder={locale === "zh" ? "一只戴宇航头盔的猫\n蓝色玻璃城市的航拍视角" : "A cat wearing an astronaut helmet\nAerial view of a blue glass city"} /></Field><Field label={t("batch.json")} className="is-full" hint={locale === "zh" ? "填写后会覆盖上方 prompts；支持 items 数组。" : "When provided, this overrides the prompt list."}><TextArea rows="5" className="console-mono" value={form.json} onChange={set("json")} placeholder='[{"custom_id":"img_001","prompt":"…"}]' /></Field></div>;
}

function BatchItems({ apiKey, job }) {
  const { t, locale } = useLocale();
  const { notify } = useConsole();
  const [state, setState] = useState({ loading: true, error: "", items: [] });
  const [preview, setPreview] = useState(null);
  const previewRef = useRef(null);
  const activeRef = useRef(true);
  useEffect(() => {
    let active = true;
    activeRef.current = true;
    batchImagesApi.items(apiKey, job.id).then((result) => active && setState({ loading: false, error: "", items: result.data || [] })).catch((error) => active && setState({ loading: false, error: error.message, items: [] }));
    return () => { active = false; activeRef.current = false; if (previewRef.current?.url) URL.revokeObjectURL(previewRef.current.url); };
  }, [apiKey, job.id]);
  const replacePreview = (next) => {
    if (previewRef.current?.url) URL.revokeObjectURL(previewRef.current.url);
    previewRef.current = next;
    setPreview(next);
  };
  const openImage = async (item) => {
    try { const blob = await batchImagesApi.itemContent(apiKey, job.id, item.custom_id); if (!activeRef.current) return; const url = URL.createObjectURL(blob); replacePreview({ url, item }); }
    catch (error) { notify("error", error.message); }
  };
  if (state.loading) return <Spinner />;
  if (state.error) return <ErrorState message={state.error} />;
  const columns = [
    { key: "custom_id", label: "ID", render: (row) => <span className="console-mono">{row.custom_id}</span> },
    { key: "prompt_preview", label: locale === "zh" ? "提示词" : "Prompt", render: (row) => <span className="console-clamp">{row.prompt_preview || "—"}</span> },
    { key: "status", label: t("common.status"), render: (row) => <StatusBadge status={row.status} label={statusLabel(row.status, locale)} /> },
    { key: "image_count", label: locale === "zh" ? "图片" : "Images" },
    { key: "error", label: locale === "zh" ? "结果" : "Result", render: (row) => row.error?.message || (row.image_count > 0 ? <Button icon="eye" onClick={() => openImage(row)}>{locale === "zh" ? "预览" : "Preview"}</Button> : "—") },
  ];
  return <><DataTable columns={columns} rows={state.items} /><Modal open={Boolean(preview)} title={preview?.item?.custom_id || "Preview"} onClose={() => replacePreview(null)}><div className="console-image-preview">{preview && <img src={preview.url} alt={preview.item.custom_id} />}</div></Modal></>;
}

export function BatchImagesPage() {
  const { t, locale, formatCurrency, formatDate } = useLocale();
  const { notify } = useConsole();
  const [keys, setKeys] = useState([]);
  const [keyId, setKeyId] = useState("");
  const [models, setModels] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [state, setState] = useState({ loading: true, error: "", busy: false });
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ task_name: "", model: "", provider: "", image_size: "1K", aspect_ratio: "", prompts: "", json: "" });
  const [detail, setDetail] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const pollingRef = useRef(null);
  const jobsRequestRef = useRef(null);
  const selectionRequestRef = useRef(null);
  const selectedKey = keys.find((key) => String(key.id) === String(keyId));

  useEffect(() => {
    const controller = new AbortController();
    eligibleKeys(controller.signal).then((items) => { if (controller.signal.aborted) return; setKeys(items); setKeyId((current) => current || String(items[0]?.id || "")); setState((current) => ({ ...current, loading: false })); }).catch((error) => { if (error.name !== "AbortError" && !controller.signal.aborted) setState({ loading: false, error: error.message, busy: false }); });
    return () => controller.abort();
  }, []);
  const loadJobs = useCallback(async (silent = false) => {
    if (!selectedKey) return;
    jobsRequestRef.current?.abort();
    const controller = new AbortController();
    jobsRequestRef.current = controller;
    if (!silent) setState((current) => ({ ...current, loading: true, error: "" }));
    try { const result = await batchImagesApi.list(selectedKey.key, { limit: 50 }, controller.signal); if (!controller.signal.aborted) { setJobs(result.data || []); setState((current) => ({ ...current, loading: false, error: "" })); } }
    catch (error) { if (!silent && error.name !== "AbortError") setState((current) => ({ ...current, loading: false, error: error.message })); }
  }, [selectedKey]);
  useEffect(() => {
    if (!selectedKey) return undefined;
    const request = Symbol("batch-selection");
    selectionRequestRef.current = request;
    setState((current) => ({ ...current, loading: true, error: "" }));
    Promise.allSettled([batchImagesApi.models(selectedKey.key), batchImagesApi.list(selectedKey.key, { limit: 50 })]).then(([modelResult, jobsResult]) => {
      if (selectionRequestRef.current !== request) return;
      const nextModels = modelResult.value?.data || [];
      setModels(nextModels); setForm((current) => ({ ...current, model: nextModels[0]?.id || "" }));
      if (jobsResult.status === "fulfilled") setJobs(jobsResult.value.data || []);
      setState((current) => ({ ...current, loading: false, error: jobsResult.status === "rejected" ? jobsResult.reason.message : "" }));
    });
    return () => { if (selectionRequestRef.current === request) selectionRequestRef.current = null; };
  }, [selectedKey]);
  useEffect(() => {
    window.clearInterval(pollingRef.current);
    if (jobs.some((job) => !terminalStatuses.has(job.status))) pollingRef.current = window.setInterval(() => loadJobs(true), 5000);
    return () => { window.clearInterval(pollingRef.current); jobsRequestRef.current?.abort(); };
  }, [jobs, loadJobs]);

  const submit = async () => {
    let payload;
    try { payload = buildPayload(form); } catch { return notify("error", locale === "zh" ? "高级 JSON 格式无效。" : "Advanced JSON is invalid."); }
    if (!payload.model || !payload.items.length) return notify("warning", locale === "zh" ? "请选择模型并添加至少一个提示词。" : "Choose a model and add at least one prompt.");
    setState((current) => ({ ...current, busy: true }));
    try { const job = await batchImagesApi.submit(selectedKey.key, payload, `sentence-ui-${makeIdempotencyKey()}`); setJobs((current) => [job, ...current]); setFormOpen(false); setForm((current) => ({ ...current, task_name: "", prompts: "", json: "" })); notify("success", locale === "zh" ? "批量任务已提交。" : "Batch submitted."); }
    catch (error) { notify("error", error.message); } finally { setState((current) => ({ ...current, busy: false })); }
  };
  const inspect = async (job) => {
    setDetail({ loading: true, job });
    try { const full = await batchImagesApi.get(selectedKey.key, job.id); setDetail({ loading: false, job: full }); }
    catch { setDetail({ loading: false, job }); }
  };
  const action = async () => {
    const { kind, job } = confirm;
    setState((current) => ({ ...current, busy: true }));
    try {
      if (kind === "cancel") await batchImagesApi.cancel(selectedKey.key, job.id);
      if (kind === "delete") await batchImagesApi.remove(selectedKey.key, job.id);
      notify("success", t("common.success")); setConfirm(null); await loadJobs(true);
    } catch (error) { notify("error", error.message); } finally { setState((current) => ({ ...current, busy: false })); }
  };
  const download = async (job) => { try { const blob = await batchImagesApi.download(selectedKey.key, job.id); downloadBlob(blob, `${job.task_name || job.id}.zip`); } catch (error) { notify("error", error.message); } };
  const columns = [
    { key: "task_name", label: t("batch.task"), render: (row) => <div className="console-key-name"><strong>{row.task_name || row.id}</strong><small className="console-mono">{row.id}</small></div> },
    { key: "model", label: t("batch.model") },
    { key: "status", label: t("common.status"), render: (row) => <StatusBadge status={row.status} label={statusLabel(row.status, locale)} /> },
    { key: "progress", label: locale === "zh" ? "进度" : "Progress", render: (row) => <div className="console-table-progress"><span>{row.success_count || 0} / {row.item_count || 0} · {row.fail_count || 0} failed</span><ProgressBar value={row.item_count ? (Number(row.success_count || 0) + Number(row.fail_count || 0)) / row.item_count * 100 : 0} /></div> },
    { key: "cost", label: t("usage.actualCost"), render: (row) => formatCurrency(row.actual_cost ?? row.hold_amount ?? row.estimated_cost), align: "right" },
    { key: "created_at", label: t("common.date"), render: (row) => unixDate(row.created_at, formatDate) },
    { key: "actions", label: t("common.actions"), align: "right", render: (row) => <div className="console-inline-actions"><IconButton icon="eye" label={t("batch.items")} onClick={() => inspect(row)} />{!terminalStatuses.has(row.status) && <IconButton icon="close" label={t("batch.cancel")} onClick={() => setConfirm({ kind: "cancel", job: row })} />}{row.success_count > 0 && <IconButton icon="download" label={t("batch.download")} onClick={() => download(row)} />}{terminalStatuses.has(row.status) && <IconButton icon="trash" label={t("batch.remove")} onClick={() => setConfirm({ kind: "delete", job: row })} />}</div> },
  ];

  return <Page title={t("batch.title")} subtitle={t("batch.subtitle")} actions={<Button variant="primary" icon="plus" onClick={() => setFormOpen(true)} disabled={!selectedKey}>{t("batch.submit")}</Button>}>
    <Panel><div className="console-toolbar"><Field label={t("batch.key")} className="is-wide"><SelectInput value={keyId} onChange={(event) => setKeyId(event.target.value)}>{keys.map((key) => <option key={key.id} value={key.id}>{key.name} · {key.group?.name}</option>)}</SelectInput></Field><Button icon="refresh" onClick={() => loadJobs()}>{t("common.refresh")}</Button></div>{!keys.length && !state.loading && <EmptyState icon="image" title={locale === "zh" ? "没有可用的 Gemini 密钥" : "No eligible Gemini key"} description={locale === "zh" ? "请先创建一个属于已启用批量图片分组的密钥。" : "Create a key in a Gemini group with batch images enabled."} />}</Panel>
    <Panel title={t("batch.jobs")}>{state.loading ? <Spinner /> : state.error ? <ErrorState message={state.error} onRetry={() => loadJobs()} /> : <DataTable columns={columns} rows={jobs} empty={<EmptyState icon="image" />} />}</Panel>
    <Modal open={formOpen} title={t("batch.submit")} description={t("batch.subtitle")} onClose={() => setFormOpen(false)} size="large" footer={<><Button onClick={() => setFormOpen(false)}>{t("common.cancel")}</Button><Button variant="primary" onClick={submit} disabled={state.busy}>{state.busy ? t("common.loading") : t("batch.submit")}</Button></>}><BatchForm form={form} setForm={setForm} models={models} /></Modal>
    <Modal open={Boolean(detail)} title={detail?.job?.task_name || t("batch.items")} onClose={() => setDetail(null)} size="large">{detail?.loading ? <Spinner /> : detail?.job && <div className="console-detail-stack"><div className="console-batch-summary"><StatusBadge status={detail.job.status} label={statusLabel(detail.job.status, locale)} /><span>{detail.job.model}</span><span>{detail.job.item_count} items</span><span>{formatCurrency(detail.job.actual_cost ?? detail.job.hold_amount)}</span></div><BatchItems apiKey={selectedKey?.key} job={detail.job} /></div>}</Modal>
    <ConfirmDialog open={Boolean(confirm)} title={confirm?.kind === "cancel" ? t("batch.cancel") : t("batch.remove")} description={locale === "zh" ? "删除记录时会一并删除服务器上的任务结果，此操作无法撤销。" : "Deleting the record also removes its stored results and cannot be undone."} busy={state.busy} onClose={() => setConfirm(null)} onConfirm={action} />
  </Page>;
}
