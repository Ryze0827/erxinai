import { useState } from "react";
import { IMAGE_GATEWAY_BASE_URL } from "../../api";
import { Icon } from "../Icon";
import { useConsole } from "../ConsoleContext";
import { useLocale } from "../i18n";
import { Page, Panel } from "../UI";

const GENERATION_ENDPOINT = `${IMAGE_GATEWAY_BASE_URL}/v1/images/generations`;
const EDIT_ENDPOINT = `${IMAGE_GATEWAY_BASE_URL}/v1/images/edits`;
const MINIMUM_REQUEST = `{
  "model": "gpt-image-2",
  "prompt": "A cute orange cat wearing an astronaut helmet, sticker style, clean background.",
  "size": "2048x2048"
}`;
const URL_RESPONSE = `{
  "created": 1770000000,
  "data": [
    { "url": "https://..." }
  ]
}`;
const BASE64_RESPONSE = `{
  "created": 1770000000,
  "data": [
    { "b64_json": "iVBORw0KGgoAAAANSUhEUg..." }
  ]
}`;
const ERROR_RESPONSE = `{
  "error": {
    "message": "Invalid API key or insufficient quota",
    "type": "invalid_request_error"
  }
}`;

const copy = {
  en: {
    introEyebrow: "OpenAI-compatible Image API", generationMode: "1. Generate images", editMode: "2. Edit images", sectionLabel: "Image API sections", intro: "Generate images through an OpenAI Images compatible endpoint. Use it from websites, scripts, automation workflows, or third-party clients.", baseUrl: "Base URL", endpoint: "Endpoint", model: "Model", nav: ["Quick start", "Authentication", "Request parameters", "Sizes and billing", "Examples", "Response", "Errors"], quick: "Quick start", quickBody: "Send a JSON request to the endpoint below.", minimum: "Minimum request body", promptTip: "English prompts often provide more predictable instruction following. Empty, auto, or unsupported sizes fall back to 2K.", auth: "Authentication", authBody: "Every request requires a Bearer Token containing your API key.", header: "Header", value: "Value", description: "Description", authorizationDescription: "Required. Replace sk-... with your API key.", contentTypeDescription: "Required for JSON requests.", params: "Request parameters", field: "Field", type: "Type", required: "Required", example: "Example", optional: "Optional", paramRows: [["model", "string", "Required", "gpt-image-2", "Image-generation model."], ["prompt", "string", "Required", "A futuristic city at sunset...", "Describe subject, style, composition, background, lighting, and details."], ["size", "string", "Required", "2048x2048", "Supported resolution. Invalid values fall back to 2K."], ["n", "integer", "Optional", "1", "Number of images. Keep this at 1 when the provider enforces single output."]], sizes: "Sizes and billing", sizesBody: "Resolution tiers have different consumption. Final charges follow the live gateway pricing rules.", clarity: "Quality", resolutions: "Available size", ratio: "Ratio", consumption: "Consumption", fallback: "Fallback rule", fallbackBody: "Empty, auto, or unsupported size values use the 2K tier. Send an explicit supported resolution to avoid unexpected cost or output dimensions.", examples: "Request examples", curl: "cURL", python: "Python requests", javascript: "JavaScript fetch", response: "Response format", responseBody: "The endpoint returns an OpenAI-compatible image result. Providers may return a URL or Base64 image data.", urlForm: "URL response", base64Form: "Base64 response", base64Tip: "For b64_json, prepend data:image/png;base64, to display the image directly.", errors: "Common errors", status: "Status", cause: "Likely cause", resolution: "Resolution", errorRows: [["401", "Missing, malformed, or invalid API key.", "Check the Authorization: Bearer sk-... header."], ["400", "Missing model, prompt, or image, or an unsupported field.", "Compare the request with the matching parameter table."], ["429", "Rate limit, quota, or balance restriction.", "Reduce concurrency and check account balance."], ["500 / 502 / 504", "Provider or gateway timeout.", "Retry later or choose another available model."]], errorExample: "Error response", copySuccess: "Code copied.", copyFailed: "Unable to copy code.",
  },
  zh: {
    introEyebrow: "OpenAI 兼容 Images API", generationMode: "1、生图", editMode: "2、修改图", sectionLabel: "生图 API 文档分类", intro: "使用兼容 OpenAI Images API 的接口生成图片，可接入网页、脚本、自动化工作流或第三方客户端。", baseUrl: "Base URL", endpoint: "Endpoint", model: "模型", nav: ["快速开始", "认证方式", "请求参数", "尺寸与计费", "调用示例", "返回格式", "常见错误"], quick: "快速开始", quickBody: "向以下地址发起 JSON 请求即可生成图片。", minimum: "最小请求体", promptTip: "英文提示词通常有更稳定的指令遵循。size 为空、auto 或不受支持时，将按 2K 处理。", auth: "认证方式", authBody: "所有请求都需要使用包含 API Key 的 Bearer Token。", header: "Header", value: "值", description: "说明", authorizationDescription: "必填。将 sk-... 替换为你的 API Key。", contentTypeDescription: "JSON 请求必填。", params: "请求参数", field: "字段", type: "类型", required: "是否必填", example: "示例", optional: "可选", paramRows: [["model", "string", "必填", "gpt-image-2", "图片生成模型。"], ["prompt", "string", "必填", "A futuristic city at sunset...", "描述主体、风格、构图、背景、光线和画面细节。"], ["size", "string", "必填", "2048x2048", "支持的分辨率；非法值按 2K 处理。"], ["n", "integer", "可选", "1", "生成图片数量；上游限制单张时请保持为 1。"]], sizes: "尺寸与计费", sizesBody: "不同分辨率档位对应不同消耗，最终扣费以网关实时计费规则为准。", clarity: "清晰度", resolutions: "可用 size", ratio: "比例", consumption: "消耗", fallback: "Fallback 规则", fallbackBody: "size 为空、auto 或传入不支持的分辨率时使用 2K。建议显式传入合法分辨率，避免费用或输出尺寸不符合预期。", examples: "调用示例", curl: "cURL", python: "Python requests", javascript: "JavaScript fetch", response: "返回格式", responseBody: "接口返回兼容 OpenAI 的图片结果，上游可能返回 URL 或 Base64 图片数据。", urlForm: "URL 形式", base64Form: "Base64 形式", base64Tip: "返回 b64_json 时，可在前面拼接 data:image/png;base64, 后直接展示。", errors: "常见错误", status: "状态码", cause: "可能原因", resolution: "处理方式", errorRows: [["401", "API Key 缺失、格式错误或无效。", "检查 Authorization: Bearer sk-... 请求头。"], ["400", "缺少 model、prompt、image 或包含不支持的字段。", "对照对应的请求参数表检查请求内容。"], ["429", "触发限流、额度不足或余额受限。", "降低并发并检查账户余额。"], ["500 / 502 / 504", "上游或网关生成超时。", "稍后重试或选择其他可用模型。"]], errorExample: "错误返回示例", copySuccess: "代码已复制。", copyFailed: "复制失败。",
  },
};

const editCopy = {
  en: {
    intro: "Modify existing images through the OpenAI-compatible edit endpoint.", endpoint: "Edit endpoint", nav: "Edit images", title: "Edit images", body: "Upload one or more source images and describe the changes you want. GPT Image models accept up to 16 source images, and the response uses the same URL or Base64 format as image generation.", multipart: "Send this request as multipart/form-data. Use image for one source image, or repeat image[] for multiple source images. Let cURL, requests, or FormData set the Content-Type boundary automatically.", params: "Edit request parameters", examples: "Edit request examples", contentType: "Required for edit requests. Let the client set the multipart boundary automatically.", paramRows: [["model", "string", "Required", "gpt-image-2", "Image-editing model."], ["image[]", "file[]", "Required", "@reference-1.png", "One to 16 source images. Repeat this field for multiple references."], ["prompt", "string", "Required", "Combine both references...", "Describe the desired changes and what should remain unchanged."], ["size", "string", "Optional", "2048x2048", "Requested output resolution."], ["n", "integer", "Optional", "1", "Number of edited images."], ["mask", "file", "Optional", "@mask.png", "Optional mask applied to the first source image when supported."]],
  },
  zh: {
    intro: "通过兼容 OpenAI 的图片修改接口编辑已有图片。", endpoint: "修改图片 Endpoint", nav: "修改图片", title: "修改图片 API", body: "可上传一张或多张原图并描述需要修改的内容。GPT Image 模型最多支持 16 张源图片，返回格式与图片生成接口一致，可返回图片 URL 或 Base64 数据。", multipart: "该请求必须使用 multipart/form-data。单图使用 image，多图重复提交 image[] 字段。请让 cURL、requests 或 FormData 自动设置 Content-Type boundary，不要手动填写。", params: "修改图片请求参数", examples: "修改图片调用示例", contentType: "修改图片请求必填，请让客户端自动设置 multipart boundary。", paramRows: [["model", "string", "必填", "gpt-image-2", "图片修改模型。"], ["image[]", "file[]", "必填", "@reference-1.png", "1–16 张源图片；多张参考图需重复提交该字段。"], ["prompt", "string", "必填", "融合两张参考图……", "描述需要修改的内容，以及应当保持不变的部分。"], ["size", "string", "可选", "2048x2048", "期望的输出分辨率。"], ["n", "integer", "可选", "1", "输出的修改图片数量。"], ["mask", "file", "可选", "@mask.png", "上游支持时，遮罩图应用于第一张源图片。"]],
  },
};

const sizeRows = [
  ["1K", "1024x1024", "1:1", "0.1"],
  ["2K", "2048x2048", "1:1", "0.2"],
  ["2K", "1536x1024", "3:2", "0.2"],
  ["2K", "1024x1536", "2:3", "0.2"],
  ["4K", "3840x2160", "16:9", "0.3"],
  ["4K", "2160x3840", "9:16", "0.3"],
];

function docCopy(locale) {
  return copy[locale] || copy.en;
}

function examples(locale) {
  const key = locale === "zh" ? "sk-你的APIKey" : "sk-your-api-key";
  return {
    curl: `curl -X POST "${GENERATION_ENDPOINT}" \\
  -H "Authorization: Bearer ${key}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-image-2",
    "prompt": "A cinematic product photo of a futuristic gaming console, dark background, neon rim light.",
    "size": "2048x2048"
  }'`,
    python: `import requests

url = "${GENERATION_ENDPOINT}"
headers = {
    "Authorization": "Bearer ${key}",
    "Content-Type": "application/json",
}
payload = {
    "model": "gpt-image-2",
    "prompt": "A cute orange cat wearing an astronaut helmet, sticker style, clean background.",
    "size": "1536x1024",
}

response = requests.post(url, headers=headers, json=payload, timeout=300)
response.raise_for_status()
print(response.json())`,
    javascript: `const response = await fetch("${GENERATION_ENDPOINT}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ${key}",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-image-2",
    prompt: "A futuristic city at sunset, cyberpunk style, highly detailed.",
    size: "3840x2160",
  }),
});

if (!response.ok) throw new Error(await response.text());
console.log(await response.json());`,
  };
}

function editExamples(locale) {
  const key = locale === "zh" ? "sk-你的APIKey" : "sk-your-api-key";
  return {
    curl: `curl -X POST "${EDIT_ENDPOINT}" \\
  -H "Authorization: Bearer ${key}" \\
  -F "model=gpt-image-2" \\
  -F "image[]=@reference-1.png" \\
  -F "image[]=@reference-2.png" \\
  -F "prompt=Combine the subject from the first image with the setting from the second image." \\
  -F "size=2048x2048" \\
  -F "n=1"`,
    python: `import requests

url = "${EDIT_ENDPOINT}"
headers = {"Authorization": "Bearer ${key}"}
data = {
    "model": "gpt-image-2",
    "prompt": "Combine the subject from the first image with the setting from the second image.",
    "size": "2048x2048",
    "n": "1",
}

with open("reference-1.png", "rb") as first_image, open("reference-2.png", "rb") as second_image:
    files = [
        ("image[]", ("reference-1.png", first_image, "image/png")),
        ("image[]", ("reference-2.png", second_image, "image/png")),
    ]
    response = requests.post(url, headers=headers, data=data, files=files, timeout=300)

response.raise_for_status()
print(response.json())`,
    javascript: `const form = new FormData();
form.append("model", "gpt-image-2");
for (const file of fileInput.files) form.append("image[]", file);
form.append("prompt", "Combine the subject from the first image with the setting from the second image.");
form.append("size", "2048x2048");
form.append("n", "1");

const response = await fetch("${EDIT_ENDPOINT}", {
  method: "POST",
  headers: { "Authorization": "Bearer ${key}" },
  body: form,
});

if (!response.ok) throw new Error(await response.text());
console.log(await response.json());`,
  };
}

function CodeBlock({ label, value, copyLabel, onCopy }) {
  return <div className="console-image-code"><header><span>{label}</span><button type="button" onClick={() => onCopy(value)}><Icon name="copy" size={14} />{copyLabel}</button></header><pre><code>{value}</code></pre></div>;
}

function DocsTable({ headers, rows, codeColumns = [0] }) {
  return <div className="console-image-doc-table-wrap"><table className="console-image-doc-table"><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={`${row[0]}-${rowIndex}`}>{row.map((cell, index) => <td key={`${cell}-${index}`}>{codeColumns.includes(index) ? <code>{cell}</code> : cell}</td>)}</tr>)}</tbody></table></div>;
}

function DocsOverview({ copy: c, eyebrow, intro, endpointLabel, endpoint }) {
  return <div className="console-image-doc-overview"><Panel eyebrow={eyebrow} className="console-image-doc-intro"><p>{intro}</p></Panel><Panel className="console-image-doc-quick"><dl><div><dt>{c.baseUrl}</dt><dd><code>{IMAGE_GATEWAY_BASE_URL}</code></dd></div><div><dt>{endpointLabel}</dt><dd><code>{endpoint}</code></dd></div><div><dt>{c.model}</dt><dd><code>gpt-image-2</code></dd></div></dl></Panel></div>;
}

function DocsNav({ label, items }) {
  return <nav className="console-image-doc-nav" aria-label={label}>{items.map(([itemLabel, id]) => <a key={id} href={`#${id}`}>{itemLabel}</a>)}</nav>;
}

function AuthCard({ copy: c, contentType, description, id }) {
  return <Panel title={c.auth} className="console-image-doc-card" id={id}><div className="console-image-doc-body"><p>{c.authBody}</p><DocsTable headers={[c.header, c.value, c.description]} rows={[["Authorization", "Bearer sk-...", c.authorizationDescription], ["Content-Type", contentType, description]]} codeColumns={[0, 1]} /></div></Panel>;
}

function ResponseCard({ copy: c, copyLabel, onCopy, id }) {
  return <Panel title={c.response} className="console-image-doc-card" id={id}><div className="console-image-doc-body"><p>{c.responseBody}</p><h3>{c.urlForm}</h3><CodeBlock label="JSON" value={URL_RESPONSE} copyLabel={copyLabel} onCopy={onCopy} /><h3>{c.base64Form}</h3><CodeBlock label="JSON" value={BASE64_RESPONSE} copyLabel={copyLabel} onCopy={onCopy} /><aside className="console-image-doc-notice is-success">{c.base64Tip}</aside></div></Panel>;
}

function ErrorsCard({ copy: c, copyLabel, onCopy, id }) {
  return <Panel title={c.errors} className="console-image-doc-card" id={id}><div className="console-image-doc-body"><DocsTable headers={[c.status, c.cause, c.resolution]} rows={c.errorRows} /><h3>{c.errorExample}</h3><CodeBlock label="JSON" value={ERROR_RESPONSE} copyLabel={copyLabel} onCopy={onCopy} /></div></Panel>;
}

function GenerationDocumentation({ copy: c, code, copyLabel, onCopy }) {
  const navItems = c.nav.map((label, index) => [label, ["generation-quickstart", "generation-auth", "generation-params", "generation-size", "generation-examples", "generation-response", "generation-errors"][index]]);
  return <><DocsOverview copy={c} eyebrow={c.generationMode} intro={c.intro} endpointLabel={c.endpoint} endpoint="POST /v1/images/generations" /><DocsNav label={c.generationMode} items={navItems} /><main className="console-image-doc-grid"><Panel title={c.quick} className="console-image-doc-card" id="generation-quickstart"><div className="console-image-doc-body"><p>{c.quickBody}</p><div className="console-image-endpoint"><span>POST</span><code>{GENERATION_ENDPOINT}</code></div><h3>{c.minimum}</h3><CodeBlock label="JSON" value={MINIMUM_REQUEST} copyLabel={copyLabel} onCopy={onCopy} /><aside className="console-image-doc-notice">{c.promptTip}</aside></div></Panel><AuthCard copy={c} contentType="application/json" description={c.contentTypeDescription} id="generation-auth" /><Panel title={c.params} className="console-image-doc-card is-wide" id="generation-params"><div className="console-image-doc-body"><DocsTable headers={[c.field, c.type, c.required, c.example, c.description]} rows={c.paramRows} codeColumns={[0, 3]} /></div></Panel><Panel title={c.sizes} className="console-image-doc-card is-wide" id="generation-size"><div className="console-image-doc-body"><p>{c.sizesBody}</p><div className="console-image-tier-grid">{[["1K", "1024x1024", "0.1"], ["2K", "1536x1024 · 1024x1536 · 2048x2048", "0.2"], ["4K", "3840x2160 · 2160x3840", "0.3"]].map(([tier, sizes, cost]) => <div key={tier}><strong>{tier}</strong><code>{sizes}</code><span>{c.consumption}: {cost}</span></div>)}</div><DocsTable headers={[c.clarity, c.resolutions, c.ratio, c.consumption]} rows={sizeRows} codeColumns={[0, 1]} /><h3>{c.fallback}</h3><aside className="console-image-doc-notice">{c.fallbackBody}</aside></div></Panel><Panel title={c.examples} className="console-image-doc-card is-wide" id="generation-examples"><div className="console-image-doc-body console-image-example-list"><CodeBlock label={c.curl} value={code.curl} copyLabel={copyLabel} onCopy={onCopy} /><CodeBlock label={c.python} value={code.python} copyLabel={copyLabel} onCopy={onCopy} /><CodeBlock label={c.javascript} value={code.javascript} copyLabel={copyLabel} onCopy={onCopy} /></div></Panel><ResponseCard copy={c} copyLabel={copyLabel} onCopy={onCopy} id="generation-response" /><ErrorsCard copy={c} copyLabel={copyLabel} onCopy={onCopy} id="generation-errors" /></main></>;
}

function EditDocumentation({ copy: c, editCopy: e, code, copyLabel, onCopy }) {
  const navItems = [[e.nav, "edit-quickstart"], [c.auth, "edit-auth"], [e.params, "edit-params"], [e.examples, "edit-examples"], [c.response, "edit-response"], [c.errors, "edit-errors"]];
  return <><DocsOverview copy={c} eyebrow={c.editMode} intro={e.intro} endpointLabel={e.endpoint} endpoint="POST /v1/images/edits" /><DocsNav label={c.editMode} items={navItems} /><main className="console-image-doc-grid"><Panel title={e.title} className="console-image-doc-card" id="edit-quickstart"><div className="console-image-doc-body"><p>{e.body}</p><div className="console-image-endpoint"><span>POST</span><code>{EDIT_ENDPOINT}</code></div><aside className="console-image-doc-notice">{e.multipart}</aside></div></Panel><AuthCard copy={c} contentType="multipart/form-data" description={e.contentType} id="edit-auth" /><Panel title={e.params} className="console-image-doc-card is-wide" id="edit-params"><div className="console-image-doc-body"><DocsTable headers={[c.field, c.type, c.required, c.example, c.description]} rows={e.paramRows} codeColumns={[0, 3]} /></div></Panel><Panel title={e.examples} className="console-image-doc-card is-wide" id="edit-examples"><div className="console-image-doc-body console-image-example-list"><CodeBlock label={c.curl} value={code.curl} copyLabel={copyLabel} onCopy={onCopy} /><CodeBlock label={c.python} value={code.python} copyLabel={copyLabel} onCopy={onCopy} /><CodeBlock label={c.javascript} value={code.javascript} copyLabel={copyLabel} onCopy={onCopy} /></div></Panel><ResponseCard copy={c} copyLabel={copyLabel} onCopy={onCopy} id="edit-response" /><ErrorsCard copy={c} copyLabel={copyLabel} onCopy={onCopy} id="edit-errors" /></main></>;
}

export function ImageApiDocsPage() {
  const { locale, t } = useLocale();
  const { notify } = useConsole();
  const [section, setSection] = useState("generation");
  const c = docCopy(locale);
  const e = editCopy[locale] || editCopy.en;
  const copyCode = async (value) => {
    try { await navigator.clipboard.writeText(value); notify("success", c.copySuccess); } catch { notify("error", c.copyFailed); }
  };
  const copyLabel = t("common.copy");

  return <Page title={c.introEyebrow} className="console-image-docs-page"><div className="console-image-doc-section-switch" role="group" aria-label={c.sectionLabel}><button type="button" className={section === "generation" ? "is-active" : ""} aria-pressed={section === "generation"} onClick={() => setSection("generation")}>{c.generationMode}</button><button type="button" className={section === "edit" ? "is-active" : ""} aria-pressed={section === "edit"} onClick={() => setSection("edit")}>{c.editMode}</button></div>{section === "generation" ? <GenerationDocumentation copy={c} code={examples(locale)} copyLabel={copyLabel} onCopy={copyCode} /> : <EditDocumentation copy={c} editCopy={e} code={editExamples(locale)} copyLabel={copyLabel} onCopy={copyCode} />}</Page>;
}
