import { useEffect, useMemo, useState } from "react";
import { Icon } from "../Icon";
import { Button, CopyButton, Modal } from "../UI";
import { useLocale } from "../i18n";
import { CompactTabs } from "./ConsoleControls";

function clientTabs(platform, allowMessagesDispatch) {
  if (platform === "openai") return [
    { value: "codex", label: "Codex CLI" }, { value: "codex-ws", label: "Codex CLI WS" },
    ...(allowMessagesDispatch ? [{ value: "claude", label: "Claude Code" }] : []), { value: "opencode", label: "OpenCode" },
  ];
  if (platform === "gemini") return [{ value: "gemini", label: "Gemini CLI" }, { value: "opencode", label: "OpenCode" }];
  if (platform === "antigravity") return [{ value: "claude", label: "Claude Code" }, { value: "gemini", label: "Gemini CLI" }, { value: "opencode", label: "OpenCode" }];
  if (platform === "grok") return [{ value: "grok", label: "Grok CLI" }, { value: "opencode", label: "OpenCode" }];
  return [{ value: "claude", label: "Claude Code" }, { value: "opencode", label: "OpenCode" }];
}

function defaultClient(platform) {
  if (platform === "openai") return "codex";
  if (platform === "gemini") return "gemini";
  if (platform === "grok") return "grok";
  return "claude";
}

function envFiles(client, shell, baseUrl, apiKey) {
  const gemini = client === "gemini";
  const variables = gemini
    ? [["GOOGLE_GEMINI_BASE_URL", baseUrl], ["GEMINI_API_KEY", apiKey], ["GEMINI_MODEL", "gemini-2.0-flash"]]
    : [["ANTHROPIC_BASE_URL", baseUrl], ["ANTHROPIC_AUTH_TOKEN", apiKey], ["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "1"], ["CLAUDE_CODE_ATTRIBUTION_HEADER", "0"]];
  const content = variables.map(([key, value]) => shell === "cmd" ? `set ${key}=${value}` : shell === "powershell" ? `$env:${key}="${value}"` : `export ${key}="${value}"`).join("\n");
  const terminal = { path: shell === "cmd" ? "Command Prompt" : shell === "powershell" ? "PowerShell" : "Terminal", content };
  if (gemini) return [terminal];
  const path = shell === "unix" ? "~/.claude/settings.json" : "%userprofile%\\.claude\\settings.json";
  return [terminal, { path, content: JSON.stringify({ env: Object.fromEntries(variables) }, null, 2), hint: "VSCode Claude Code" }];
}

function codexFiles(client, shell, baseUrl, apiKey) {
  const windows = shell === "windows";
  const home = windows ? "%USERPROFILE%\\.codex" : "~/.codex";
  const websocket = client === "codex-ws" ? "\nsupports_websockets = true" : "";
  return [
    { path: `${home}${windows ? "\\" : "/"}config.toml`, content: `model_provider = "OpenAI"\nmodel = "gpt-5.5"\nreview_model = "gpt-5.5"\nmodel_reasoning_effort = "xhigh"\ndisable_response_storage = true\nnetwork_access = "enabled"\nwindows_wsl_setup_acknowledged = true\n\n[model_providers.OpenAI]\nname = "OpenAI"\nbase_url = "${baseUrl}"\nwire_api = "responses"${websocket}\nrequires_openai_auth = true\n\n[features]\n${client === "codex-ws" ? "responses_websockets_v2 = true\n" : ""}goals = true`, hint: "Codex configuration" },
    { path: `${home}${windows ? "\\" : "/"}auth.json`, content: JSON.stringify({ OPENAI_API_KEY: apiKey }, null, 2) },
  ];
}

function grokFiles(shell, baseUrl, apiKey) {
  const windows = shell === "windows";
  const home = windows ? "%userprofile%\\.grok" : "~/.grok";
  return [{ path: `${home}${windows ? "\\" : "/"}config.toml`, content: `[models]\ndefault = "sentence-ai-grok"\nweb_search = "sentence-ai-grok"\n\n[model."sentence-ai-grok"]\nmodel = "grok-4.5"\nbase_url = "${baseUrl}"\nname = "Grok 4.5 via Sentence AI"\napi_key = "${apiKey}"\napi_backend = "responses"\ncontext_window = 1000000\nsupports_backend_search = true`, hint: "Grok CLI configuration" }];
}

function opencodeFiles(platform, baseUrl, apiKey) {
  const provider = platform === "gemini" ? "google" : platform === "grok" ? "xai" : platform === "anthropic" || platform === "antigravity" ? "anthropic" : "openai";
  return [{ path: "~/.config/opencode/opencode.json", content: JSON.stringify({ $schema: "https://opencode.ai/config.json", provider: { [provider]: { options: { baseURL: baseUrl, apiKey } } } }, null, 2) }];
}

function filesFor(client, shell, platform, baseUrl, apiKey) {
  const endpoint = platform === "antigravity" ? `${baseUrl.replace(/\/+$/, "")}/antigravity` : baseUrl;
  if (client === "codex" || client === "codex-ws") return codexFiles(client, shell, endpoint, apiKey);
  if (client === "grok") return grokFiles(shell, endpoint, apiKey);
  if (client === "opencode") return opencodeFiles(platform, endpoint, apiKey);
  return envFiles(client, shell, endpoint, apiKey);
}

function CodeFile({ file }) {
  return <div className="console-config-file">{file.hint && <p><Icon name="warning" size={14} />{file.hint}</p>}<div><header><code>{file.path}</code><CopyButton value={file.content} label="Copy" /></header><pre><code>{file.content}</code></pre></div></div>;
}

export function UseKeyModal({ open, apiKey, baseUrl, platform, allowMessagesDispatch, onClose }) {
  const { locale } = useLocale();
  const tabs = useMemo(() => clientTabs(platform, allowMessagesDispatch), [allowMessagesDispatch, platform]);
  const [client, setClient] = useState(defaultClient(platform));
  const [shell, setShell] = useState("unix");
  useEffect(() => { setClient(defaultClient(platform)); setShell("unix"); }, [platform, open]);
  useEffect(() => setShell("unix"), [client]);
  const shellTabs = client === "codex" || client === "codex-ws" || client === "grok"
    ? [{ value: "unix", label: "macOS / Linux" }, { value: "windows", label: "Windows" }]
    : [{ value: "unix", label: "macOS / Linux" }, { value: "cmd", label: "Windows CMD" }, { value: "powershell", label: "PowerShell" }];
  const files = filesFor(client, shell, platform, baseUrl, apiKey);
  return <Modal open={open} title={locale === "zh" ? "使用 API 密钥" : "Use API key"} description={locale === "zh" ? "按客户端复制完整配置。" : "Copy the complete configuration for your client."} onClose={onClose} size="large" footer={<Button onClick={onClose}>{locale === "zh" ? "关闭" : "Close"}</Button>}>
    {!platform ? <div className="console-callout console-callout--warning"><Icon name="warning" size={20} /><div><strong>{locale === "zh" ? "尚未分配分组" : "No group assigned"}</strong><p>{locale === "zh" ? "请先为密钥选择平台分组，再查看对应客户端配置。" : "Assign a platform group before using a client-specific configuration."}</p></div></div> : <div className="console-use-key"><p>{locale === "zh" ? `当前分组使用 ${platform} 兼容协议。` : `This group uses the ${platform} compatible protocol.`}</p><CompactTabs label="Client" items={tabs} value={client} onChange={setClient} />{client !== "opencode" && <CompactTabs label="Operating system" items={shellTabs} value={shell} onChange={setShell} />}<div className="console-config-stack">{files.map((file) => <CodeFile file={file} key={file.path} />)}</div><div className="console-callout"><Icon name="info" size={18} /><p>{locale === "zh" ? "配置后请重启客户端。密钥属于敏感信息，请勿分享或提交到代码仓库。" : "Restart the client after updating its configuration. Keep this key out of shared files and source control."}</p></div></div>}
  </Modal>;
}
