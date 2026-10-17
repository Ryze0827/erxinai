import { useState } from "react";
import { Table } from "@appica/ui-react/table";
import { TableBody } from "@appica/ui-react/table";
import { TableCell } from "@appica/ui-react/table";
import { TableHead } from "@appica/ui-react/table";
import { TableHeader } from "@appica/ui-react/table";
import { TableRow } from "@appica/ui-react/table";
import { IMAGE_GATEWAY_BASE_URL } from "../../api";
import { Icon } from "../Icon";
import { translateGroup, translate, useLocale } from "../i18n";
import { CopyButton, Page, Panel } from "../UI";
import { CompactTabs } from "../components/ConsoleControls";

const GENERATION_ENDPOINT = `${IMAGE_GATEWAY_BASE_URL}/v1/images/generations`;
const EDIT_ENDPOINT = `${IMAGE_GATEWAY_BASE_URL}/v1/images/edits`;
const BASE64_RESPONSE = `{
  "created": 1770000000,
  "data": [
    { "b64_json": "iVBORw0KGgoAAAANSUhEUg..." }
  ]
}`;

const COPY_KEYS = ["summaryViewFullReference", "summaryBuildTheRequest", "summaryRequiredParameters", "summaryUploadsLimits", "summaryResolutionConsumption", "summaryRepeatForUpTo", "summaryLetTheClientSet", "summaryIfItFails", "overviewTitle", "editOverviewTitle", "introEyebrow", "generationMode", "editMode", "sectionLabel", "intro", "baseUrl", "endpoint", "model", "quick", "quickBody", "minimum", "promptTip", "auth", "authBody", "header", "value", "description", "authorizationDescription", "contentTypeDescription", "params", "field", "type", "required", "example", "optional", "sizes", "sizesBody", "clarity", "resolutions", "ratio", "consumption", "fallback", "fallbackBody", "examples", "curl", "python", "javascript", "response", "responseBody", "base64Form", "defaultLabel", "base64Tip", "errors", "status", "cause", "resolution", "errorExample", "copySuccess", "copyFailed"];

const EDIT_COPY_KEYS = ["intro", "endpoint", "nav", "title", "body", "multipart", "params", "examples", "contentType"];

function docCopy(locale) {
  return {
    ...translateGroup(locale, "imageDocs.doc", COPY_KEYS),
    nav: [translate(locale, "imageDocs.doc.nav.quickStart"), translate(locale, "imageDocs.doc.nav.authentication"), translate(locale, "imageDocs.doc.nav.requestParameters"), translate(locale, "imageDocs.doc.nav.sizesAndBilling"), translate(locale, "imageDocs.doc.nav.examples"), translate(locale, "imageDocs.doc.nav.response"), translate(locale, "imageDocs.doc.nav.errors")],
    paramRows: [
      ["model", "string", translate(locale, "imageDocs.required"), "gpt-image-2", translate(locale, "imageDocs.doc.param.model.description")],
      ["prompt", "string", translate(locale, "imageDocs.required"), "A futuristic city at sunset...", translate(locale, "imageDocs.doc.param.prompt.description")],
      ["size", "string", translate(locale, "imageDocs.required"), "2048x2048", translate(locale, "imageDocs.doc.param.size.description")],
      ["n", "integer", translate(locale, "imageDocs.optional"), "1", translate(locale, "imageDocs.doc.param.n.description")],
    ],
    errorRows: [
      ["401", translate(locale, "imageDocs.doc.error.401.cause"), translate(locale, "imageDocs.doc.error.401.fix")],
      ["400", translate(locale, "imageDocs.doc.error.400.cause"), translate(locale, "imageDocs.doc.error.400.fix")],
      ["429", translate(locale, "imageDocs.doc.error.429.cause"), translate(locale, "imageDocs.doc.error.429.fix")],
      ["500 / 502 / 504", translate(locale, "imageDocs.doc.error.5xx.cause"), translate(locale, "imageDocs.doc.error.5xx.fix")],
    ],
  };
}

function editDocCopy(locale) {
  return {
    ...translateGroup(locale, "imageDocs.edit", EDIT_COPY_KEYS),
    paramRows: [
      ["model", "string", translate(locale, "imageDocs.required"), "gpt-image-2", translate(locale, "imageDocs.edit.param.model.description")],
      ["image[]", "file[]", translate(locale, "imageDocs.required"), "@reference-1.png", translate(locale, "imageDocs.edit.param.image.description")],
      ["prompt", "string", translate(locale, "imageDocs.required"), translate(locale, "imageDocs.edit.param.prompt.example"), translate(locale, "imageDocs.edit.param.prompt.description")],
      ["size", "string", translate(locale, "imageDocs.optional"), "2048x2048", translate(locale, "imageDocs.edit.param.size.description")],
      ["n", "integer", translate(locale, "imageDocs.optional"), "1", translate(locale, "imageDocs.edit.param.n.description")],
      ["mask", "file", translate(locale, "imageDocs.optional"), "@mask.png", translate(locale, "imageDocs.edit.param.mask.description")],
    ],
  };
}

function examples(locale) {
  const key = translate(locale, "imageDocs.skApiKey");
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
  const key = translate(locale, "imageDocs.skApiKey");
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
  return <section className="console-image-runbook-step is-response"><header><b>03</b><h3>{c.response}</h3></header><h4>{c.base64Form}<span>{c.defaultLabel}</span></h4><CodeBlock label="JSON" value={BASE64_RESPONSE} copyLabel={copyLabel} /><aside><Icon name="info" size={15} />{c.base64Tip}</aside></section>;
}

function SummaryPanel({ label, title, children, id }) {
  return <Panel className="console-image-doc-summary" id={id}><header><b>{label}</b><h3>{title}</h3></header><div>{children}</div></Panel>;
}

function ErrorRows({ copy: c }) {
  return <div className="console-image-doc-errors">{c.errorRows.map(([status, cause, resolution], index) => <div className={`is-tone-${index + 1}`} key={status}><b>{status}</b><span>{cause}</span><p>{resolution}</p></div>)}</div>;
}

function RunbookDocumentation({ copy: c, endpoint, contentType, code, paramRows, notice, copyLabel, edit = false }) {
  const overviewTitle = edit ? c.editOverviewTitle : c.overviewTitle;
  const sizes = [["1K", "1024×1024", "0.1"], ["2K", "2048×2048 / 1536×1024 / 1024×1536", "0.2"], ["4K", "3840×2160 / 2160×3840", "0.3"]];
  return <><div className="console-image-doc-runbook-head"><div><h2>{overviewTitle}</h2><span>OpenAI-compatible</span></div><a href={`#${edit ? "edit" : "generation"}-parameters`}>{c.summaryViewFullReference}<Icon name="external" size={14} /></a></div><Panel className="console-image-runbook" contentProps={{ className: "overflow-visible! rounded-none! border-0! bg-transparent!" }}><div className="console-image-runbook-grid"><EndpointStep copy={c} endpoint={endpoint} contentType={contentType} copyLabel={copyLabel} /><section className="console-image-runbook-step is-request"><header><b>02</b><h3>{c.summaryBuildTheRequest}</h3></header><RequestExample copy={c} code={code} copyLabel={copyLabel} /><aside className="console-image-doc-notice"><Icon name="warning" size={16} />{notice}</aside></section><ResponseStep copy={c} copyLabel={copyLabel} /></div></Panel><div className="console-image-doc-summary-grid"><SummaryPanel label="A" title={c.summaryRequiredParameters} id={`${edit ? "edit" : "generation"}-parameters`}><DocsTable headers={[]} rows={paramRows.map(([field, , required, , description]) => [field, required, description])} codeColumns={[0]} /></SummaryPanel><SummaryPanel label="B" title={edit ? c.summaryUploadsLimits : c.summaryResolutionConsumption}><DocsTable headers={edit ? [c.field, c.description] : [c.clarity, c.resolutions, c.consumption]} rows={edit ? [["image[]", c.summaryRepeatForUpTo], ["multipart/form-data", c.summaryLetTheClientSet]] : sizes} codeColumns={[0]} />{!edit && <small>{c.sizesBody}</small>}</SummaryPanel><SummaryPanel label="C" title={c.summaryIfItFails}><ErrorRows copy={c} /></SummaryPanel></div></>;
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
  const e = editDocCopy(locale);
  const copyLabel = t("common.copy");
  const sectionTabs = [
    { value: "generation", label: c.generationMode },
    { value: "edit", label: c.editMode },
  ];

  return <Page title={c.introEyebrow} className="console-image-docs-page"><CompactTabs value={section} items={sectionTabs} label={c.sectionLabel} className="console-image-doc-section-switch" onChange={setSection} />{section === "generation" ? <GenerationDocumentation copy={c} code={examples(locale)} copyLabel={copyLabel} /> : <EditDocumentation copy={c} editCopy={e} code={editExamples(locale)} copyLabel={copyLabel} />}</Page>;
}
