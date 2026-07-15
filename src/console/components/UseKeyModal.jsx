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

const terminalNames = new Set(["Terminal", "Command Prompt", "PowerShell"]);

const clientMeta = {
  claude: { zh: "Anthropic 官方终端编程助手", en: "Anthropic's terminal coding agent" },
  codex: { zh: "OpenAI 官方终端编程助手", en: "OpenAI's terminal coding agent" },
  "codex-ws": { zh: "Codex,启用 WebSocket 加速", en: "Codex with WebSocket transport" },
  gemini: { zh: "Google 官方终端助手", en: "Google's terminal agent" },
  grok: { zh: "xAI 官方终端助手", en: "xAI's terminal agent" },
  opencode: { zh: "开源多模型编程终端", en: "Open-source multi-model agent" },
};

function fileMeta(file, locale) {
  if (terminalNames.has(file.path)) {
    return {
      icon: "terminal",
      title: locale === "zh" ? `在 ${file.path} 中粘贴并回车` : `Paste into ${file.path} and press Enter`,
      note: locale === "zh" ? "只对当前终端窗口生效,适合快速试用。" : "Applies to the current terminal window only — great for a quick try.",
    };
  }
  const optional = file.hint === "VSCode Claude Code";
  return {
    icon: "order",
    title: locale === "zh" ? `保存到文件 ${file.path}` : `Save to ${file.path}`,
    note: optional
      ? (locale === "zh" ? "可选:VSCode 插件用户使用这份配置,长期生效。" : "Optional: use this file for the VS Code extension. It persists across sessions.")
      : (locale === "zh" ? "文件不存在时新建一个即可,配置会长期生效。" : "Create the file if it doesn't exist. The settings persist across sessions."),
  };
}

function StepCard({ number, title, description, children }) {
  return <section className="console-use-step">
    <header><span className="console-step-badge">{number}</span><div><strong>{title}</strong>{description && <p>{description}</p>}</div></header>
    {children && <div className="console-use-step-body">{children}</div>}
  </section>;
}

function ConfigFile({ file }) {
  const { locale } = useLocale();
  const meta = fileMeta(file, locale);
  return <div className="console-config-file">
    <div>
      <header>
        <span className="console-config-kind"><Icon name={meta.icon} size={14} /><code>{meta.title}</code></span>
        <CopyButton value={file.content} label={locale === "zh" ? "复制" : "Copy"} />
      </header>
      <pre><code>{file.content}</code></pre>
      <footer>{meta.note}</footer>
    </div>
  </div>;
}

function localText(locale, zh, en) {
  return locale === "zh" ? zh : en;
}

function MissingGroup({ locale }) {
  return <div className="console-callout console-callout--warning"><Icon name="warning" size={20} /><div><strong>{localText(locale, "尚未分配分组", "No group assigned")}</strong><p>{localText(locale, "请先为密钥选择平台分组,再查看对应客户端配置。", "Assign a platform group before using a client-specific configuration.")}</p></div></div>;
}

function ToolPicker({ tabs, client, setClient, platform, locale }) {
  const description = localText(locale, `这把密钥属于 ${platform} 分组,可以在下面这些客户端中使用。`, `This key belongs to the ${platform} group and works with these clients.`);
  return <StepCard number={1} title={localText(locale, "选择你的工具", "Choose your tool")} description={description}><div className="console-tool-grid" role="radiogroup">{tabs.map((tab) => {
    const meta = clientMeta[tab.value] || {};
    const selected = client === tab.value;
    return <button type="button" key={tab.value} role="radio" aria-checked={selected} className={selected ? "is-active" : ""} onClick={() => setClient(tab.value)}><Icon name="terminal" size={17} /><span><strong>{tab.label}</strong><small>{locale === "zh" ? meta.zh : meta.en}</small></span>{selected && <Icon name="check" size={15} />}</button>;
  })}</div></StepCard>;
}

function ShellStep({ visible, tabs, shell, setShell, locale }) {
  if (!visible) return null;
  return <StepCard number={2} title={localText(locale, "选择你的操作系统", "Pick your operating system")} description={localText(locale, "不同系统写入配置的方式略有差别。", "The way you apply the config differs slightly per system.")}><CompactTabs label="Operating system" items={tabs} value={shell} onChange={setShell} /></StepCard>;
}

function ConfigStep({ number, files, locale }) {
  const description = files.length > 1 ? localText(locale, `共 ${files.length} 处,每一处都有说明。`, `${files.length} snippets — each card tells you where it goes.`) : undefined;
  return <StepCard number={number} title={localText(locale, "应用下面的配置", "Apply the configuration")} description={description}><div className="console-config-stack">{files.map((file) => <ConfigFile file={file} key={file.path} />)}</div></StepCard>;
}

function RestartStep({ number, clientLabel, locale }) {
  const description = localText(locale, `完全退出并重新打开 ${clientLabel},随便发一条消息。收到回复,就说明接入成功了。`, `Fully quit and reopen ${clientLabel}, then send any message. If you get a reply, you're connected.`);
  return <StepCard number={number} title={localText(locale, "重启,然后试一试", "Restart, then try it")} description={description}><details className="console-use-faq"><summary><Icon name="chat" size={15} />{localText(locale, "没有生效?看看这几点", "Not working? Check these")}</summary><ul><li>{localText(locale, "确认已经完全退出客户端后再重新打开(终端环境变量只在当前窗口生效)。", "Make sure the client was fully restarted — terminal env vars only apply to the current window.")}</li><li>{localText(locale, "检查配置有没有被完整粘贴,地址和密钥前后不能有多余空格。", "Check the snippet was pasted in full, with no stray spaces around the URL or key.")}</li><li>{localText(locale, "回到「API 密钥」页面确认密钥状态是启用,并且没有超出额度。", "Confirm on the API keys page that this key is active and hasn't exhausted its quota.")}</li><li>{localText(locale, "仍有问题?到「用量记录」的错误标签页查看具体报错。", "Still stuck? The Errors tab under Usage shows the exact failure.")}</li></ul></details><div className="console-callout"><Icon name="shield" size={18} /><p>{localText(locale, "密钥等同于账户凭证:不要发给别人,也不要提交到代码仓库。泄露时回到密钥页删除或停用即可。", "Treat the key like a password: don't share it or commit it to a repo. If it leaks, disable or delete it from the keys page.")}</p></div></StepCard>;
}

function UseKeyContent({ tabs, client, setClient, platform, locale, hasShellStep, shellTabs, shell, setShell, copyStep, files, clientLabel }) {
  return <div className="console-use-key"><div className="console-use-intro"><Icon name="info" size={18} /><p>{localText(locale, "原理很简单:让工具把请求发到我们的网关地址,并用这把密钥做身份验证。下面的配置已经帮你填好了地址和密钥,复制即可。", "The idea is simple: point your tool at our gateway URL and authenticate with this key. The snippets below already include both — just copy them.")}</p></div><ToolPicker tabs={tabs} client={client} setClient={setClient} platform={platform} locale={locale} /><ShellStep visible={hasShellStep} tabs={shellTabs} shell={shell} setShell={setShell} locale={locale} /><ConfigStep number={copyStep} files={files} locale={locale} /><RestartStep number={copyStep + 1} clientLabel={clientLabel} locale={locale} /></div>;
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
  const clientLabel = tabs.find((tab) => tab.value === client)?.label || client;
  const hasShellStep = client !== "opencode";
  const copyStep = hasShellStep ? 3 : 2;

  const content = platform ? <UseKeyContent tabs={tabs} client={client} setClient={setClient} platform={platform} locale={locale} hasShellStep={hasShellStep} shellTabs={shellTabs} shell={shell} setShell={setShell} copyStep={copyStep} files={files} clientLabel={clientLabel} /> : <MissingGroup locale={locale} />;
  return <Modal open={open} title={localText(locale, "使用 API 密钥", "Use your API key")} description={localText(locale, "跟着下面几步,几分钟内就能在你的工具里用上这把密钥。", "Follow the steps below — you'll be up and running in a few minutes.")} onClose={onClose} size="large" footer={<Button onClick={onClose}>{localText(locale, "完成", "Done")}</Button>}>{content}</Modal>;
}
