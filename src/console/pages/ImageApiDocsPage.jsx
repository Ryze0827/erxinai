import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@appica/ui-react/table";
import { IMAGE_GATEWAY_BASE_URL } from "../../api";
import { Icon } from "../Icon";
import { useLocale } from "../i18n";
import { CopyButton, Page, Panel } from "../UI";
import { CompactTabs } from "../components/ConsoleControls";

const GENERATION_ENDPOINT = `${IMAGE_GATEWAY_BASE_URL}/v1/images/generations`;
const EDIT_ENDPOINT = `${IMAGE_GATEWAY_BASE_URL}/v1/images/edits`;
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

const copy = {
  en: {
    introEyebrow: "OpenAI-compatible Image API", generationMode: "Generate images", editMode: "Edit images", sectionLabel: "Image API sections", intro: "Generate images through an OpenAI Images compatible endpoint. Use it from websites, scripts, automation workflows, or third-party clients.", baseUrl: "Base URL", endpoint: "Endpoint", model: "Model", nav: ["Quick start", "Authentication", "Request parameters", "Sizes and billing", "Examples", "Response", "Errors"], quick: "Quick start", quickBody: "Send a JSON request to the endpoint below.", minimum: "Minimum request body", promptTip: "English prompts often provide more predictable instruction following. Empty, auto, or unsupported sizes fall back to 2K.", auth: "Authentication", authBody: "Every request requires a Bearer Token containing your API key.", header: "Header", value: "Value", description: "Description", authorizationDescription: "Required. Replace sk-... with your API key.", contentTypeDescription: "Required for JSON requests.", params: "Request parameters", field: "Field", type: "Type", required: "Required", example: "Example", optional: "Optional", paramRows: [["model", "string", "Required", "gpt-image-2", "Image-generation model."], ["prompt", "string", "Required", "A futuristic city at sunset...", "Describe subject, style, composition, background, lighting, and details."], ["size", "string", "Required", "2048x2048", "Supported resolution. Invalid values fall back to 2K."], ["n", "integer", "Optional", "1", "Number of images. Keep this at 1 when the provider enforces single output."]], sizes: "Sizes and billing", sizesBody: "Resolution tiers have different consumption. Final charges follow the live gateway pricing rules.", clarity: "Quality", resolutions: "Available size", ratio: "Ratio", consumption: "Consumption", fallback: "Fallback rule", fallbackBody: "Empty, auto, or unsupported size values use the 2K tier. Send an explicit supported resolution to avoid unexpected cost or output dimensions.", examples: "Request examples", curl: "cURL", python: "Python requests", javascript: "JavaScript fetch", response: "Handle the response", responseBody: "The endpoint returns an OpenAI-compatible image result. Providers may return a URL or Base64 image data.", urlForm: "URL response", base64Form: "Base64 response", base64Tip: "For b64_json, prepend data:image/png;base64, to display the image directly.", errors: "Common errors", status: "Status", cause: "Likely cause", resolution: "Resolution", errorRows: [["401", "Missing, malformed, or invalid API key.", "Check the Authorization: Bearer sk-... header."], ["400", "Missing model, prompt, or image, or an unsupported field.", "Compare the request with the matching parameter table."], ["429", "Rate limit, quota, or balance restriction.", "Reduce concurrency and check account balance."], ["500 / 502 / 504", "Provider or gateway timeout.", "Retry later or choose another available model."]], errorExample: "Error response", copySuccess: "Code copied.", copyFailed: "Unable to copy code.",
  },
  zh: {
    introEyebrow: "OpenAI 兼容 Images API", generationMode: "生成图片", editMode: "编辑图片", sectionLabel: "生图 API 文档分类", intro: "使用兼容 OpenAI Images API 的接口生成图片，可接入网页、脚本、自动化工作流或第三方客户端。", baseUrl: "Base URL", endpoint: "Endpoint", model: "模型", nav: ["快速开始", "认证方式", "请求参数", "尺寸与计费", "调用示例", "返回格式", "常见错误"], quick: "快速开始", quickBody: "向以下地址发起 JSON 请求即可生成图片。", minimum: "最小请求体", promptTip: "英文提示词通常有更稳定的指令遵循。size 为空、auto 或不受支持时，将按 2K 处理。", auth: "认证方式", authBody: "所有请求都需要使用包含 API Key 的 Bearer Token。", header: "Header", value: "值", description: "说明", authorizationDescription: "必填。将 sk-... 替换为你的 API Key。", contentTypeDescription: "JSON 请求必填。", params: "请求参数", field: "字段", type: "类型", required: "是否必填", example: "示例", optional: "可选", paramRows: [["model", "string", "必填", "gpt-image-2", "图片生成模型。"], ["prompt", "string", "必填", "A futuristic city at sunset...", "描述主体、风格、构图、背景、光线和画面细节。"], ["size", "string", "必填", "2048x2048", "支持的分辨率；非法值按 2K 处理。"], ["n", "integer", "可选", "1", "生成图片数量；上游限制单张时请保持为 1。"]], sizes: "尺寸与计费", sizesBody: "不同分辨率档位对应不同消耗，最终扣费以网关实时计费规则为准。", clarity: "清晰度", resolutions: "可用 size", ratio: "比例", consumption: "消耗", fallback: "Fallback 规则", fallbackBody: "size 为空、auto 或传入不支持的分辨率时使用 2K。建议显式传入合法分辨率，避免费用或输出尺寸不符合预期。", examples: "调用示例", curl: "cURL", python: "Python requests", javascript: "JavaScript fetch", response: "处理响应", responseBody: "接口返回兼容 OpenAI 的图片结果，上游可能返回 URL 或 Base64 图片数据。", urlForm: "URL 形式", base64Form: "Base64 形式", base64Tip: "返回 b64_json 时，可在前面拼接 data:image/png;base64, 后直接展示。", errors: "常见错误", status: "状态码", cause: "可能原因", resolution: "处理方式", errorRows: [["401", "API Key 缺失、格式错误或无效。", "检查 Authorization: Bearer sk-... 请求头。"], ["400", "缺少 model、prompt、image 或包含不支持的字段。", "对照对应的请求参数表检查请求内容。"], ["429", "触发限流、额度不足或余额受限。", "降低并发并检查账户余额。"], ["500 / 502 / 504", "上游或网关生成超时。", "稍后重试或选择其他可用模型。"]], errorExample: "错误返回示例", copySuccess: "代码已复制。", copyFailed: "复制失败。",
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

function CodeBlock({ label, value, copyLabel }) {
  return <div className="console-image-code"><header><span>{label}</span><CopyButton value={value} label={copyLabel} /></header><pre><code>{value}</code></pre></div>;
}

function DocsTable({ headers, rows, codeColumns = [0] }) {
  return <div className="console-image-doc-table-wrap"><Table className="console-image-doc-table" size="sm" borderStyle="solid" hoverableRows>{headers.length > 0 && <TableHeader><TableRow>{headers.map((header) => <TableHead key={header}>{header}</TableHead>)}</TableRow></TableHeader>}<TableBody>{rows.map((row, rowIndex) => <TableRow key={`${row[0]}-${rowIndex}`}>{row.map((cell, index) => <TableCell key={`${cell}-${index}`}>{codeColumns.includes(index) ? <code>{cell}</code> : cell}</TableCell>)}</TableRow>)}</TableBody></Table></div>;
}

function RequestExample({ copy: c, code, copyLabel }) {
  const [language, setLanguage] = useState("curl");
  const labels = { curl: c.curl, python: "Python", javascript: "JavaScript" };
  const languageTabs = Object.entries(labels).map(([value, label]) => ({ value, label }));
  return <div className="console-image-runbook-request"><header><CompactTabs value={language} items={languageTabs} label={c.examples} className="console-image-runbook-languages" onChange={setLanguage} /><CopyButton className="console-image-runbook-copy" value={code[language]} label={copyLabel} /></header><pre><code>{code[language]}</code></pre></div>;
}

function EndpointStep({ copy: c, endpoint, contentType, copyLabel }) {
  return <section className="console-image-runbook-step is-endpoint"><header><b>01</b><h3>{c.endpoint} &amp; {c.auth}</h3></header><div className="console-image-runbook-endpoint"><span>POST</span><code title={endpoint}>{endpoint}</code><CopyButton value={endpoint} label={copyLabel} /></div><h4>{c.header}s</h4><dl><div><dt>Authorization</dt><dd><code>Bearer sk-...</code><CopyButton value="Bearer sk-..." label={copyLabel} /></dd></div><div><dt>Content-Type</dt><dd><code>{contentType}</code><CopyButton value={contentType} label={copyLabel} /></dd></div></dl><aside><Icon name="shield" size={16} />{c.authBody}</aside></section>;
}

function ResponseStep({ copy: c, copyLabel }) {
  return <section className="console-image-runbook-step is-response"><header><b>03</b><h3>{c.response}</h3></header><h4>{c.urlForm}<span>{c.promptRole || "Default"}</span></h4><CodeBlock label="JSON" value={URL_RESPONSE} copyLabel={copyLabel} /><h4>{c.base64Form}<span>{c.optional}</span></h4><CodeBlock label="JSON" value={BASE64_RESPONSE} copyLabel={copyLabel} /><aside><Icon name="info" size={15} />{c.base64Tip}</aside></section>;
}

function SummaryPanel({ label, title, children, id }) {
  return <Panel className="console-image-doc-summary" id={id}><header><b>{label}</b><h3>{title}</h3></header><div>{children}</div></Panel>;
}

function ErrorRows({ copy: c }) {
  return <div className="console-image-doc-errors">{c.errorRows.map(([status, cause, resolution], index) => <div className={`is-tone-${index + 1}`} key={status}><b>{status}</b><span>{cause}</span><p>{resolution}</p></div>)}</div>;
}

function RunbookDocumentation({ copy: c, endpoint, contentType, code, paramRows, notice, copyLabel, edit = false }) {
  const overviewTitle = edit ? (c.introEyebrow.includes("兼容") ? "三步修改图片" : "Edit an image in three steps") : (c.introEyebrow.includes("兼容") ? "三步生成图片" : "Generate an image in three steps");
  const sizes = [["1K", "1024×1024", "0.1"], ["2K", "2048×2048 / 1536×1024 / 1024×1536", "0.2"], ["4K", "3840×2160 / 2160×3840", "0.3"]];
  return <><div className="console-image-doc-runbook-head"><div><h2>{overviewTitle}</h2><span>OpenAI-compatible<Icon name="info" size={12} /></span></div><a href={`#${edit ? "edit" : "generation"}-parameters`}>{c.introEyebrow.includes("兼容") ? "查看完整参考" : "View full reference"}<Icon name="external" size={14} /></a></div><Panel className="console-image-runbook"><div className="console-image-runbook-grid"><EndpointStep copy={c} endpoint={endpoint} contentType={contentType} copyLabel={copyLabel} /><section className="console-image-runbook-step is-request"><header><b>02</b><h3>{c.introEyebrow.includes("兼容") ? "构建请求" : "Build the request"}</h3></header><RequestExample copy={c} code={code} copyLabel={copyLabel} /><aside className="console-image-doc-notice"><Icon name="warning" size={16} />{notice}</aside></section><ResponseStep copy={c} copyLabel={copyLabel} /></div></Panel><div className="console-image-doc-summary-grid"><SummaryPanel label="A" title={c.introEyebrow.includes("兼容") ? "必填参数" : "Required parameters"} id={`${edit ? "edit" : "generation"}-parameters`}><DocsTable headers={[]} rows={paramRows.map(([field, , required, , description]) => [field, required, description])} codeColumns={[0]} /></SummaryPanel><SummaryPanel label="B" title={edit ? (c.introEyebrow.includes("兼容") ? "上传与限制" : "Uploads & limits") : (c.introEyebrow.includes("兼容") ? "分辨率与消耗" : "Resolution & consumption")}><DocsTable headers={edit ? [c.field, c.description] : [c.clarity, c.resolutions, c.consumption]} rows={edit ? [["image[]", c.introEyebrow.includes("兼容") ? "可重复提交，最多 16 张参考图" : "Repeat for up to 16 reference images"], ["multipart/form-data", c.introEyebrow.includes("兼容") ? "由客户端自动设置 boundary" : "Let the client set the boundary"]] : sizes} codeColumns={[0]} />{!edit && <small>{c.sizesBody}</small>}</SummaryPanel><SummaryPanel label="C" title={c.introEyebrow.includes("兼容") ? "失败处理" : "If it fails"}><ErrorRows copy={c} /></SummaryPanel></div></>;
}

function GenerationDocumentation({ copy: c, code, copyLabel }) {
  return <RunbookDocumentation copy={c} endpoint={GENERATION_ENDPOINT} contentType="application/json" code={code} paramRows={c.paramRows} notice={c.fallbackBody} copyLabel={copyLabel} />;
}

function EditDocumentation({ copy: c, editCopy: e, code, copyLabel }) {
  return <RunbookDocumentation copy={c} endpoint={EDIT_ENDPOINT} contentType="multipart/form-data" code={code} paramRows={e.paramRows} notice={e.multipart} copyLabel={copyLabel} edit />;
}

export function ImageApiDocsPage() {
  const { locale, t } = useLocale();
  const [section, setSection] = useState("generation");
  const c = docCopy(locale);
  const e = editCopy[locale] || editCopy.en;
  const copyLabel = t("common.copy");
  const sectionTabs = [
    { value: "generation", label: c.generationMode },
    { value: "edit", label: c.editMode },
  ];

  return <Page title={c.introEyebrow} className="console-image-docs-page"><CompactTabs value={section} items={sectionTabs} label={c.sectionLabel} className="console-image-doc-section-switch" onChange={setSection} />{section === "generation" ? <GenerationDocumentation copy={c} code={examples(locale)} copyLabel={copyLabel} /> : <EditDocumentation copy={c} editCopy={e} code={editExamples(locale)} copyLabel={copyLabel} />}</Page>;
}
