import { useEffect, useMemo, useRef, useState } from "react";
import { imageGenerationApi, keysApi } from "../../api";
import { GroupBadge } from "../GroupBadge";
import { Icon } from "../Icon";
import { useConsole } from "../ConsoleContext";
import { useLocale } from "../i18n";
import { Button, EmptyState, ErrorState, Field, IconButton, Modal, Page, Panel, SelectInput, Skeleton, TextArea, TextInput, buttonLinkClass } from "../UI";
import { formatDuration, safeImageUrl } from "../utils";

const STORAGE_KEY = "sentence_image_studio_preferences";
const IMAGE_GROUP_NAME = "生图";
const MAX_REFERENCE_IMAGES = 16;
const MAX_REFERENCE_BYTES = 10 * 1024 * 1024;
const MAX_REFERENCE_TOTAL_BYTES = 50 * 1024 * 1024;
const REFERENCE_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const IMAGE_PLATFORMS = new Set(["openai", "gemini", "antigravity"]);
const SIZE_OPTIONS = ["1K", "2K", "4K"];
const ASPECT_OPTIONS = ["auto", "1:1", "3:4", "9:16", "4:3", "16:9"];
const THINKING_CLUSTER_PATH = [[0, 0], [0, 3], [0, 6], [0, 9], [0, 12], [3, 12], [6, 12], [9, 12], [12, 12], [12, 9], [12, 6], [12, 3], [12, 0], [9, 0], [6, 0], [3, 0]];
const THINKING_DOTS = Array.from({ length: 169 }, (_, index) => {
  const row = Math.floor(index / 13);
  const column = index % 13;
  return THINKING_CLUSTER_PATH.reduce((style, [pathRow, pathColumn], pathIndex) => {
    const distanceSquared = ((row - pathRow) ** 2) + ((column - pathColumn) ** 2);
    const influence = Math.exp(-distanceSquared / 18);
    style[`--console-image-cluster-opacity-${pathIndex}`] = (0.08 + (influence * 0.74)).toFixed(4);
    style[`--console-image-cluster-scale-${pathIndex}`] = (0.62 + (influence * 0.58)).toFixed(4);
    return style;
  }, {});
});
const PLATFORM_PRESETS = {
  openai: { label: "OpenAI", defaultModel: "gpt-image-2", models: ["gpt-image-2"], countLocked: false },
  gemini: { label: "Gemini", defaultModel: "gemini-3.1-flash-image", models: ["gemini-3.1-flash-image", "gemini-2.5-flash-image", "gemini-3-pro-image"], countLocked: true },
  antigravity: { label: "Antigravity", defaultModel: "gemini-3.1-flash-image", models: ["gemini-3.1-flash-image", "gemini-2.5-flash-image", "gemini-3-pro-image"], countLocked: true },
};
const OPENAI_SIZES = {
  "1K": { "1:1": "1024x1024" },
  "2K": { "1:1": "2048x2048", "3:2": "1536x1024", "2:3": "1024x1536" },
  "4K": { "16:9": "3840x2160", "9:16": "2160x3840" },
};

const copy = {
  en: {
    controls: "Configuration", apiKey: "Available API key", noKeyOption: "Create a key for a ‘生图’ group", parameters: "Generation settings", reset: "Restore defaults", model: "Recommended model", quality: "Quality", count: "Images", aspect: "Aspect ratio", workspace: "Creation workspace", emptyTitle: "What would you like to create?", emptyBody: "Describe an image, optionally attach multiple references, and keep refining the generated result in the same session.", promptPlaceholder: "Describe or edit an image", upload: "Upload reference images", imageTool: "Image", useLast: "Recent results", selectRecent: "Select one of the 3 latest results", recentItem: "Recent result {index}", submit: "Generate", submitting: "Generating", localReference: "Local upload", clipboardReference: "Clipboard image", generatedReference: "Generated result", clearReference: "Remove reference image", promptRole: "Prompt", resultRole: "Result", thinking: "Creating your image", thinkingBody: "The model is processing the prompt and image settings.", purePrompt: "Text to image", withReference: "{count} reference image(s)", duration: "Duration {value}", continueEdit: "Continue editing", download: "Download", preview: "Preview image", previewTitle: "Generated image preview", noKeysTitle: "No key for a ‘生图’ group", noKeysBody: "Create an active API key for an image-enabled group whose name contains ‘生图’. Image requests remain disabled until one is available.", loadFailed: "Unable to load eligible API keys.", invalidFile: "Choose PNG, JPEG, or WebP images up to 10 MB each and 50 MB total.", noLatest: "There is no generated image in this session yet.", referenceReady: "Added {count} reference image(s).", referenceLimit: "You can attach up to 16 reference images.", referenceFailed: "Some images could not be loaded as references.", chooseKey: "Create and select a key for a ‘生图’ group first.", enterPrompt: "Enter an image prompt.", enterModel: "Enter a model name.", requestSent: "The image request has been sent.", completed: "Generated {count} image(s).", noImage: "The request completed, but no image was returned.", failed: "Image generation failed", remaining: "{amount} remaining", groupEnabled: "Image generation enabled", retry: "Retry", reminderTitle: "Friendly reminder", reminderBody: "This page does not save history. Please save image files promptly; all session data is discarded when you leave this page.",
  },
  zh: {
    controls: "配置", apiKey: "可用 API 密钥", noKeyOption: "请创建生图分组的密钥", parameters: "生成参数", reset: "恢复推荐", model: "推荐模型", quality: "清晰度", count: "张数", aspect: "宽高比", workspace: "创作区", emptyTitle: "今天想创作什么？", emptyBody: "描述画面，可选上传多张参考图，并在当前会话中继续修改生成结果。", promptPlaceholder: "描述图片或输入修改要求", upload: "上传参考图", imageTool: "图片", useLast: "引用最近结果", selectRecent: "选择最近 3 张结果中的一张", recentItem: "最近结果 {index}", submit: "开始生成", submitting: "生成中", localReference: "本地上传", clipboardReference: "剪贴板图片", generatedReference: "来自生成结果", clearReference: "移除参考图", promptRole: "提示词", resultRole: "结果", thinking: "正在创作图片", thinkingBody: "模型正在处理提示词与图片参数，请稍候。", purePrompt: "纯文生图", withReference: "已附带 {count} 张参考图", duration: "耗时 {value}", continueEdit: "继续修改", download: "下载", preview: "预览图片", previewTitle: "生成图片预览", noKeysTitle: "暂无生图分组的密钥", noKeysBody: "请先为名称包含“生图”的生图分组创建已启用密钥。创建完成前无法发送生图请求。", loadFailed: "无法加载可用 API 密钥。", invalidFile: "请选择 PNG、JPEG 或 WebP 图片，单张不超过 10 MB、总计不超过 50 MB。", noLatest: "当前会话还没有可引用的生成图片。", referenceReady: "已添加 {count} 张参考图。", referenceLimit: "最多可添加 16 张参考图。", referenceFailed: "部分图片暂时无法作为参考图读取。", chooseKey: "请先创建并选择生图分组的密钥。", enterPrompt: "请输入图片提示词。", enterModel: "请输入模型名称。", requestSent: "生图请求已发送。", completed: "已生成 {count} 张图片。", noImage: "请求已完成，但没有返回图片。", failed: "图片生成失败", remaining: "剩余 {amount}", groupEnabled: "分组已开启生图", retry: "重试", reminderTitle: "温馨提示", reminderBody: "本页面不保存历史数据，图片资料请及时保存，离开本页面自动作废。",
  },
};

function studioCopy(locale) {
  return copy[locale] || copy.en;
}

function readPreferences() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
}

function normalizedCount(value) {
  const count = Number.parseInt(String(value), 10);
  return Number.isFinite(count) ? Math.min(4, Math.max(1, count)) : 1;
}

function formForKey(key, forceDefaults = false) {
  const platform = key?.group?.platform || "";
  const preset = PLATFORM_PRESETS[platform];
  if (!preset) return { keyId: "", model: "", size: "1K", aspectRatio: "auto", count: "1" };
  const saved = forceDefaults ? {} : readPreferences().platforms?.[platform] || {};
  const savedModel = saved.model || preset.defaultModel;
  return {
    keyId: String(key.id),
    model: preset.models.includes(savedModel) ? savedModel : preset.defaultModel,
    size: SIZE_OPTIONS.includes(saved.size) ? saved.size : "1K",
    aspectRatio: ASPECT_OPTIONS.includes(saved.aspectRatio) ? saved.aspectRatio : "auto",
    count: String(preset.countLocked ? 1 : normalizedCount(saved.count)),
  };
}

function savePreferences(key, form) {
  const platform = key?.group?.platform;
  if (!platform) return;
  const preferences = readPreferences();
  preferences.selectedKeyId = String(key.id);
  preferences.platforms = preferences.platforms || {};
  preferences.platforms[platform] = { model: form.model, size: form.size, aspectRatio: form.aspectRatio, count: normalizedCount(form.count) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
}

async function eligibleImageKeys(signal) {
  const keys = [];
  let page = 1;
  while (!signal.aborted) {
    const response = await keysApi.list(page, 100, { status: "active", sort_by: "created_at", sort_order: "desc" }, signal);
    keys.push(...(response.items || []).filter((key) => key.status === "active" && key.group?.allow_image_generation === true && IMAGE_PLATFORMS.has(key.group?.platform) && String(key.group?.name || "").includes(IMAGE_GROUP_NAME)));
    if (page >= Number(response.pages || 1)) break;
    page += 1;
  }
  return keys.sort((left, right) => `${left.group?.name || ""}:${left.name || ""}`.localeCompare(`${right.group?.name || ""}:${right.name || ""}`));
}

function resolveOpenAIAspect(sizeMap, aspectRatio) {
  if (sizeMap[aspectRatio]) return aspectRatio;
  const portrait = ["3:4", "9:16"].includes(aspectRatio);
  const landscape = ["4:3", "16:9"].includes(aspectRatio);
  const candidates = portrait ? ["2:3", "9:16", "1:1"] : landscape ? ["3:2", "16:9", "1:1"] : Object.keys(sizeMap);
  return candidates.find((value) => sizeMap[value]) || Object.keys(sizeMap)[0];
}

function requestSize(platform, size, aspectRatio) {
  if (platform !== "openai") return size;
  const sizeMap = OPENAI_SIZES[size] || OPENAI_SIZES["2K"];
  return sizeMap[resolveOpenAIAspect(sizeMap, aspectRatio)] || Object.values(sizeMap)[0];
}

function keyOptionLabel(key) {
  return `${key?.name || `Key ${key?.id || ""}`} (${key?.group?.name || "—"})`;
}

function messageId() {
  return crypto?.randomUUID?.() || `image-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readBlob(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(blob);
  });
}

async function limitedResponseBlob(response) {
  const contentType = String(response.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (!REFERENCE_IMAGE_TYPES.has(contentType)) throw new Error("Invalid image response.");
  if (!response.body?.getReader) {
    const blob = await response.blob();
    if (blob.size > MAX_REFERENCE_BYTES) throw new Error("Image is too large.");
    return blob;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REFERENCE_BYTES) { await reader.cancel(); throw new Error("Image is too large."); }
    chunks.push(value);
  }
  return new Blob(chunks, { type: contentType });
}

function clipboardImages(data) {
  const items = Array.from(data?.items || []).filter((entry) => entry.kind === "file" && REFERENCE_IMAGE_TYPES.has(entry.type)).map((entry) => entry.getAsFile()).filter(Boolean);
  return items.length ? items : Array.from(data?.files || []).filter((file) => REFERENCE_IMAGE_TYPES.has(file.type));
}

async function detectedImageType(file) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return "";
}

async function referenceFromFile(file, hint) {
  if (!REFERENCE_IMAGE_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_REFERENCE_BYTES) throw new Error("Invalid image file.");
  if (await detectedImageType(file) !== file.type) throw new Error("Invalid image file.");
  return { id: messageId(), file, dataUrl: await readBlob(file), name: file.name || hint, hint };
}

async function referenceFromUrl(value) {
  const url = safeImageUrl(value);
  if (!url) throw new Error("Invalid image URL.");
  const response = await fetch(url, { credentials: "omit", cache: "no-store", referrerPolicy: "no-referrer" });
  if (!response.ok) throw new Error(`Image request failed (${response.status}).`);
  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > MAX_REFERENCE_BYTES) throw new Error("Image is too large.");
  const blob = await limitedResponseBlob(response);
  if (!REFERENCE_IMAGE_TYPES.has(blob.type) || blob.size <= 0 || blob.size > MAX_REFERENCE_BYTES || await detectedImageType(blob) !== blob.type) throw new Error("Invalid image response.");
  const dataUrl = await readBlob(blob);
  return { id: messageId(), file: new File([blob], "generated-reference.png", { type: blob.type || "image/png" }), dataUrl, name: "generated-reference.png" };
}

function StudioThinking({ copy: c, startedAt, now }) {
  return <div className="console-image-thinking"><div><strong>{c.thinking}</strong><p>{c.thinkingBody}</p></div><div className="console-image-thinking-visual" aria-hidden="true"><div className="console-image-thinking-dots">{THINKING_DOTS.map((style, index) => <i style={style} key={index} />)}</div></div><small>{c.duration.replace("{value}", formatDuration(now - startedAt))}</small></div>;
}

function StudioMessageReferences({ references = [], label }) {
  if (!references.length) return null;
  return <div className="console-image-message-references" aria-label={label}>{references.map((reference, index) => <figure key={reference.id || `${reference.name}-${index}`}><img src={reference.dataUrl} alt={reference.name || `${label} ${index + 1}`} /><figcaption>{reference.hint || reference.name}</figcaption></figure>)}</div>;
}

function studioTurns(messages) {
  const turns = [];
  for (const message of messages) {
    if (message.role === "user") turns.push({ user: message, assistant: null });
    else if (turns.length) turns[turns.length - 1].assistant = message;
  }
  return turns;
}

function StudioCurrentTurn({ turn, copy: c }) {
  return <Panel className="console-image-current-turn"><div className="console-panel-body"><strong>{c.promptRole === "提示词" ? "当前轮次" : "Current turn"}</strong>{turn?.user ? <div><StudioMessageReferences references={turn.user.references} label={c.withReference.replace("{count}", String(turn.user.references?.length || 0))} /><span><p>{turn.user.text}</p><small>{[...(turn.user.meta || []), turn.assistant?.durationMs ? formatDuration(turn.assistant.durationMs) : ""].filter(Boolean).join(" · ")}</small></span></div> : <p className="console-image-current-empty">{c.emptyBody}</p>}</div></Panel>;
}

function StudioResultStage({ turn, copy: c, now, onPreview, onReference }) {
  const assistant = turn?.assistant;
  const images = assistant?.images || [];
  const primary = images[0];
  let body = <EmptyState icon="image" title={c.emptyTitle} description={c.emptyBody} />;
  if (assistant?.status === "pending") body = <StudioThinking copy={c} startedAt={assistant.startedAt} now={now} />;
  else if (assistant?.status === "error") body = <div className="console-image-stage-error"><Icon name="warning" size={26} /><strong>{c.failed}</strong><p>{assistant.text}</p></div>;
  else if (primary) body = <><Button variant="ghost" className="console-image-stage-preview" onClick={() => onPreview(primary.url)} aria-label={c.preview}><img src={primary.url} alt={`${c.resultRole} 1`} /><span><Icon name="search" size={18} /></span></Button><footer><div><Button icon="edit" onClick={() => onReference(primary.url)}>{c.continueEdit}</Button><a className={buttonLinkClass()} href={primary.url} download={`generated-${assistant.id}-1.png`} target="_blank" rel="noreferrer"><Icon name="download" size={17} />{c.download}</a></div><span>{c.resultRole} 1{images.length > 1 ? ` / ${images.length}` : ""}</span></footer></>;
  return <Panel className={`console-image-result-stage ${assistant?.status === "pending" ? "is-pending" : ""}`}><div className="console-image-result-stage-body">{body}</div></Panel>;
}

function StudioSession({ turns, copy: c, threadRef, onSelect }) {
  return <Panel className="console-image-session"><div className="console-panel-body"><strong>{c.promptRole === "提示词" ? "当前会话" : "Current session"}</strong><div className="console-image-session-track" ref={threadRef}>{turns.length ? turns.map((turn, index) => { const image = turn.assistant?.images?.[0]; return <Button variant="ghost" className={index === turns.length - 1 ? "is-active" : ""} key={turn.user.id} onClick={() => image?.url && onSelect(image.url)} disabled={!image?.url}><b>{index + 1}</b><span className="console-image-session-media">{turn.user.references?.slice(0, 2).map((reference) => <img key={reference.id} src={reference.dataUrl} alt="" />)}{image?.url && <img src={image.url} alt="" />}</span><span><p>{image?.url ? `${c.resultRole} ${index + 1}` : turn.user.text}</p><small>{turn.assistant?.durationMs ? c.duration.replace("{value}", formatDuration(turn.assistant.durationMs)) : turn.assistant?.status === "pending" ? c.submitting : ""}</small></span></Button>; }) : <p>{c.emptyBody}</p>}</div></div></Panel>;
}

function StudioReferences({ references, copy: c, fileRef, disabled, onSelectFile, onRemove }) {
  return <section className="console-image-workbench-references"><strong>{c.promptRole === "提示词" ? "参考图" : "References"}</strong><div>{references.map((reference) => <figure key={reference.id}><img src={reference.dataUrl} alt={reference.name} /><IconButton icon="close" label={c.clearReference} onClick={() => onRemove(reference.id)} /><figcaption>{reference.hint}</figcaption></figure>)}<input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={onSelectFile} disabled={disabled} /><Button variant="secondary" className="console-image-reference-add" icon="plus" onClick={() => fileRef.current?.click()} disabled={disabled}>{c.promptRole === "提示词" ? "添加图片" : "Add image"}</Button></div><small>{references.length} / {MAX_REFERENCE_IMAGES}</small></section>;
}

function StudioRecentResults({ images, copy: c, disabled, onSelect }) {
  return <section className="console-image-workbench-recent"><strong>{c.useLast}<Icon name="chevronDown" size={13} /></strong><div>{images.map((image, index) => <Button variant="ghost" className="console-image-recent-button" key={image.id} disabled={disabled} onClick={() => onSelect(image.url)} aria-label={c.recentItem.replace("{index}", String(index + 1))}><img src={image.url} alt="" /></Button>)}</div></section>;
}

function StudioControlsLoading() {
  return <div className="console-image-controls-skeleton" aria-hidden="true"><section><div><Skeleton /><Skeleton /></div></section><section><div className="console-image-parameter-grid">{Array.from({ length: 4 }, (_, index) => <div key={index}><Skeleton /><Skeleton /></div>)}<Skeleton className="console-image-reset" /></div></section></div>;
}

function StudioControls({ copy: c, keys, state, form, selectedKey, preset, disabled, onKeyChange, onChange, onReset, onRetry }) {
  return <div className="console-image-controls"><div className="console-image-controls-body">{state.loading ? <StudioControlsLoading /> : state.error ? <ErrorState message={state.error || c.loadFailed} onRetry={onRetry} /> : <><section><Field label={c.apiKey}><div className="console-image-key-field"><SelectInput value={form.keyId} onChange={(event) => onKeyChange(event.target.value)} disabled={!keys.length || disabled} searchable={keys.length > 5}>{keys.length ? keys.map((key) => <option key={key.id} value={key.id}>{keyOptionLabel(key)}</option>) : <option value="">{c.noKeyOption}</option>}</SelectInput>{selectedKey && <GroupBadge name={selectedKey.group?.name} platform={selectedKey.group?.platform} />}</div></Field></section><section><div className="console-image-parameter-grid"><Field label={c.model}><SelectInput value={form.model} onChange={(event) => onChange("model", event.target.value)} disabled={!preset || disabled}>{(preset?.models || []).map((model) => <option key={model} value={model}>{model}</option>)}</SelectInput></Field><Field label={c.quality}><SelectInput value={form.size} onChange={(event) => onChange("size", event.target.value)} disabled={!preset || disabled}>{SIZE_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}</SelectInput></Field><Field label={c.count}><TextInput type="number" min="1" max="4" step="1" value={form.count} onChange={(event) => onChange("count", event.target.value)} disabled={!preset || preset.countLocked || disabled} /></Field><Field label={c.aspect}><SelectInput value={form.aspectRatio} onChange={(event) => onChange("aspectRatio", event.target.value)} disabled={!preset || disabled}>{ASPECT_OPTIONS.map((value) => <option key={value} value={value}>{value === "auto" ? "Auto" : value}</option>)}</SelectInput></Field><Button variant="ghost" className="console-image-reset" icon="reset" onClick={onReset} disabled={!selectedKey || disabled}>{c.reset}</Button></div></section></>}</div></div>;
}

export function ImageStudioPage() {
  const { locale } = useLocale();
  const { notify } = useConsole();
  const c = studioCopy(locale);
  const [keysState, setKeysState] = useState({ loading: true, error: "", items: [] });
  const [loadVersion, setLoadVersion] = useState(0);
  const [form, setForm] = useState(() => formForKey(null));
  const [prompt, setPrompt] = useState("");
  const [references, setReferences] = useState([]);
  const [messages, setMessages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState("");
  const [now, setNow] = useState(Date.now());
  const requestRef = useRef(null);
  const fileRef = useRef(null);
  const formRef = useRef(null);
  const threadRef = useRef(null);
  const selectedKey = useMemo(() => keysState.items.find((key) => String(key.id) === form.keyId) || null, [form.keyId, keysState.items]);
  const recentImages = useMemo(() => {
    const images = [];
    for (let messageIndex = messages.length - 1; messageIndex >= 0 && images.length < 3; messageIndex -= 1) {
      const message = messages[messageIndex];
      for (let imageIndex = 0; imageIndex < (message.images?.length || 0) && images.length < 3; imageIndex += 1) {
        const image = message.images[imageIndex];
        if (image?.url) images.push({ ...image, id: `${message.id}-${imageIndex}` });
      }
    }
    return images;
  }, [messages]);
  const turns = useMemo(() => studioTurns(messages), [messages]);
  const currentTurn = turns[turns.length - 1] || null;
  const platform = selectedKey?.group?.platform || "";
  const preset = PLATFORM_PRESETS[platform] || null;

  useEffect(() => {
    const controller = new AbortController();
    setKeysState((current) => ({ ...current, loading: true, error: "" }));
    eligibleImageKeys(controller.signal).then((items) => {
      if (controller.signal.aborted) return;
      const preferredId = String(readPreferences().selectedKeyId || "");
      const selected = items.find((key) => String(key.id) === preferredId) || items[0] || null;
      setKeysState({ loading: false, error: "", items });
      setForm(formForKey(selected));
    }).catch((error) => {
      if (!controller.signal.aborted) setKeysState({ loading: false, error: error.message || c.loadFailed, items: [] });
    });
    return () => controller.abort();
  }, [loadVersion, locale]);

  useEffect(() => {
    if (selectedKey) savePreferences(selectedKey, form);
  }, [form, selectedKey]);
  useEffect(() => {
    if (!submitting) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [submitting]);
  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (threadRef.current) threadRef.current.scrollLeft = threadRef.current.scrollWidth;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [messages, submitting]);

  const clearReferences = () => {
    setReferences([]);
    if (fileRef.current) fileRef.current.value = "";
  };
  const removeReference = (id) => setReferences((current) => current.filter((reference) => reference.id !== id));
  const changeForm = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const changeKey = (keyId) => setForm(formForKey(keysState.items.find((key) => String(key.id) === String(keyId)) || null));
  const resetForm = () => selectedKey && setForm(formForKey(selectedKey, true));
  const attachReferenceFiles = async (files, hint) => {
    const images = Array.from(files);
    if (!images.length) { notify("error", c.invalidFile); return; }
    const available = Math.max(0, MAX_REFERENCE_IMAGES - references.length);
    if (!available) { notify("warning", c.referenceLimit); return; }
    let totalBytes = references.reduce((sum, reference) => sum + Number(reference.file?.size || 0), 0);
    const candidates = images.slice(0, available).filter((file) => {
      if (!REFERENCE_IMAGE_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_REFERENCE_BYTES || totalBytes + file.size > MAX_REFERENCE_TOTAL_BYTES) return false;
      totalBytes += file.size;
      return true;
    });
    const settled = await Promise.allSettled(candidates.map((file) => referenceFromFile(file, hint)));
    const loaded = settled.filter((result) => result.status === "fulfilled").map((result) => result.value);
    if (loaded.length) setReferences((current) => [...current, ...loaded].slice(0, MAX_REFERENCE_IMAGES));
    if (loaded.length) notify("success", c.referenceReady.replace("{count}", String(loaded.length)));
    if (candidates.length !== Math.min(images.length, available)) notify("error", c.invalidFile);
    if (settled.some((result) => result.status === "rejected")) notify("error", c.referenceFailed);
    if (images.length > available) notify("warning", c.referenceLimit);
  };
  const selectFile = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length) void attachReferenceFiles(files, c.localReference);
  };
  const pasteImage = (event) => {
    const files = clipboardImages(event.clipboardData);
    if (!files.length) return;
    event.preventDefault();
    void attachReferenceFiles(files, c.clipboardReference);
  };
  const useReference = async (url) => {
    if (references.length >= MAX_REFERENCE_IMAGES) { notify("warning", c.referenceLimit); return; }
    try {
      const next = await referenceFromUrl(url);
      const totalBytes = references.reduce((sum, reference) => sum + Number(reference.file?.size || 0), 0);
      if (totalBytes + next.file.size > MAX_REFERENCE_TOTAL_BYTES) throw new Error("Reference image total is too large.");
      setReferences((current) => [...current, { ...next, hint: c.generatedReference }].slice(0, MAX_REFERENCE_IMAGES));
      notify("success", c.referenceReady.replace("{count}", "1"));
      window.requestAnimationFrame(() => {
        formRef.current?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
        formRef.current?.querySelector("textarea")?.focus();
      });
    } catch {
      notify("error", c.referenceFailed);
    }
  };
  const submit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    if (!selectedKey?.key) { notify("error", c.chooseKey); return; }
    const text = prompt.trim();
    if (!text) { notify("warning", c.enterPrompt); return; }
    const model = form.model.trim();
    if (!model) { notify("warning", c.enterModel); return; }
    const startedAt = Date.now();
    const assistantId = messageId();
    const count = preset?.countLocked ? 1 : normalizedCount(form.count);
    const meta = [preset.label, model, references.length ? c.withReference.replace("{count}", String(references.length)) : c.purePrompt];
    const requestReferences = references;
    const messageReferences = requestReferences.map(({ id, dataUrl, name, hint }) => ({ id, dataUrl, name, hint }));
    const userMeta = [preset.label, model, messageReferences.length ? c.withReference.replace("{count}", String(messageReferences.length)) : ""].filter(Boolean);
    setMessages((current) => [...current, { id: messageId(), role: "user", status: "done", text, meta: userMeta, references: messageReferences }, { id: assistantId, role: "assistant", status: "pending", text: c.thinkingBody, meta, images: [], startedAt }]);
    setPrompt("");
    clearReferences();
    setSubmitting(true);
    setNow(startedAt);
    notify("info", c.requestSent);
    const controller = new AbortController();
    requestRef.current = controller;
    try {
      const result = await imageGenerationApi.generate({ platform, apiKey: selectedKey.key, model, prompt: text, size: requestSize(platform, form.size, form.aspectRatio), aspectRatio: form.aspectRatio, count, references: requestReferences, signal: controller.signal });
      if (controller.signal.aborted) return;
      const images = (result.images || []).map((image) => ({ ...image, url: safeImageUrl(image.url) })).filter((image) => image.url);
      const message = result.text || (images.length ? c.completed.replace("{count}", String(images.length)) : c.noImage);
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, status: "done", text: message, images, durationMs: Date.now() - startedAt } : item));
      notify(images.length ? "success" : "warning", message);
    } catch (error) {
      if (error?.name === "AbortError") return;
      const message = error?.message || c.failed;
      setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, status: "error", text: message, durationMs: Date.now() - startedAt } : item));
      notify("error", `${c.failed}: ${message}`);
    } finally {
      if (!controller.signal.aborted) setSubmitting(false);
      if (requestRef.current === controller) requestRef.current = null;
    }
  };

  const promptKeyDown = (event) => {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    event.preventDefault();
    formRef.current?.requestSubmit();
  };

  return <Page title={c.workspace} className="console-image-studio-page"><div className="console-image-studio-layout"><div className="console-image-result-column"><StudioCurrentTurn turn={currentTurn} copy={c} /><StudioResultStage turn={currentTurn} copy={c} now={now} onPreview={setPreview} onReference={(url) => void useReference(url)} /><StudioSession turns={turns} copy={c} threadRef={threadRef} onSelect={setPreview} /></div><Panel className="console-image-workbench"><form ref={formRef} onSubmit={submit}><h2>{messages.length ? (locale === "zh" ? "下一轮修改" : "Next iteration") : c.controls}</h2><StudioControls copy={c} keys={keysState.items} state={keysState} form={form} selectedKey={selectedKey} preset={preset} disabled={submitting} onKeyChange={changeKey} onChange={changeForm} onReset={resetForm} onRetry={() => setLoadVersion((value) => value + 1)} /><StudioReferences references={references} copy={c} fileRef={fileRef} disabled={!selectedKey || submitting} onSelectFile={selectFile} onRemove={removeReference} /><section className="console-image-workbench-prompt"><label htmlFor="console-image-studio-prompt">{c.promptRole}</label><TextArea id="console-image-studio-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={promptKeyDown} onPaste={pasteImage} placeholder={c.promptPlaceholder} rows="5" maxLength={4000} disabled={!selectedKey || submitting} /><small>{prompt.length} / 4000</small></section><StudioRecentResults images={recentImages} copy={c} disabled={!selectedKey || submitting} onSelect={(url) => void useReference(url)} /><Button className="console-image-generate" type="submit" variant="primary" icon="arrowUp" disabled={!selectedKey || submitting}>{submitting ? c.submitting : messages.length ? (locale === "zh" ? "生成下一轮" : "Generate next iteration") : c.submit}</Button><aside className="console-image-session-notice"><Icon name="info" size={17} /><div><strong>{c.reminderTitle}</strong><p>{c.reminderBody}</p></div></aside></form></Panel></div><Modal open={Boolean(preview)} title={c.previewTitle} onClose={() => setPreview("")} size="large">{preview && <div className="console-image-preview"><img src={preview} alt={c.previewTitle} /><a className={buttonLinkClass({ variant: "primary" })} href={preview} download="generated-image.png" target="_blank" rel="noopener noreferrer"><Icon name="download" size={17} />{c.download}</a></div>}</Modal></Page>;
}
