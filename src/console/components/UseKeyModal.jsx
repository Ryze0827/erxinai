import { useEffect, useMemo, useState } from "react";
import { Accordion } from "@appica/ui-react/accordion";
import { AccordionContent } from "@appica/ui-react/accordion";
import { AccordionItem } from "@appica/ui-react/accordion";
import { AccordionTrigger } from "@appica/ui-react/accordion";
import { Alert } from "@appica/ui-react/alert";
import { AlertDescription } from "@appica/ui-react/alert";
import { AlertIcon } from "@appica/ui-react/alert";
import { AlertTitle } from "@appica/ui-react/alert";
import { Radio } from "@appica/ui-react/radio";
import { RadioGroup } from "@appica/ui-react/radio-group";
import { Tabs } from "@appica/ui-react/tabs";
import { TabsContent } from "@appica/ui-react/tabs";
import { TabsList } from "@appica/ui-react/tabs";
import { TabsTrigger } from "@appica/ui-react/tabs";
import { Icon } from "../Icon";
import { Button, CopyButton, Modal, Panel } from "../UI";
import { useLocale } from "../i18n";
import { CompactTabs } from "./ConsoleControls";
import { clientTabs, defaultClient, filesFor, isCodexClient, shellTabsFor } from "./useKeyConfig.js";

const terminalNames = new Set(["Terminal", "Command Prompt", "PowerShell"]);

const clientMeta = {
  claude: { zh: "Anthropic 官方终端编程助手", en: "Anthropic's terminal coding agent", icon: "/assets/img/hero-claude-53b6104287.webp" },
  codex: { zh: "Codex 桌面编程助手", en: "Codex desktop coding agent", icon: "/assets/img/hero-codex-52fd8a0726.webp" },
  gemini: { zh: "Google 官方终端助手", en: "Google's terminal agent" },
  grok: { zh: "xAI 官方终端助手", en: "xAI's terminal agent" },
  opencode: { zh: "开源多模型编程终端", en: "Open-source multi-model agent", icon: "/assets/img/hero-opencode-0a4e72d2ce.webp" },
};

function fileMeta(file, locale) {
  if (terminalNames.has(file.path)) {
    return {
      icon: "terminal",
      title: locale === "zh" ? `在 ${file.path} 中粘贴并回车` : `Paste into ${file.path} and press Enter`,
      note: file.note || (locale === "zh" ? "仅当前终端会话有效；请从此终端启动客户端，或将变量持久化后再启动桌面应用。" : "Applies to this terminal session only. Launch the client from this terminal, or persist the variables before starting the desktop app."),
    };
  }
  const optional = file.hint === "VSCode Claude Code";
  return {
    icon: "order",
    title: file.title || (locale === "zh" ? `保存到文件 ${file.path}` : `Save to ${file.path}`),
    note: file.note || (optional
      ? (locale === "zh" ? "可选的用户级持久配置，Claude Code 与 VS Code 插件均可使用；已有文件请先备份并合并。" : "Optional persistent user settings for Claude Code and its VS Code extension. Back up and merge an existing file.")
      : (locale === "zh" ? "文件不存在时新建一个即可,配置会长期生效。" : "Create the file if it doesn't exist. The settings persist across sessions.")),
  };
}

function StepCard({ title, description, className = "", children }) {
  return <section className={`console-purchase-step console-use-step ${className}`}>
    <header className="console-purchase-step-title console-use-step-title"><strong>{title}</strong></header>
    {description && <p className="console-use-step-description">{description}</p>}
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
  return <Alert variant="warning" layout="inline" className="console-callout console-callout--warning"><AlertIcon><Icon name="warning" size={20} /></AlertIcon><div><AlertTitle as="div">{localText(locale, "尚未分配分组", "No group assigned")}</AlertTitle><AlertDescription>{localText(locale, "请先为密钥选择平台分组,再查看对应客户端配置。", "Assign a platform group before using a client-specific configuration.")}</AlertDescription></div></Alert>;
}

function ToolPicker({ tabs, client, setClient, platform, locale }) {
  const description = localText(locale, `这把密钥属于 ${platform} 分组,可以在下面这些客户端中使用。`, `This key belongs to the ${platform} group and works with these clients.`);
  return <StepCard className="is-tool" title={localText(locale, "选择你的工具", "Choose your tool")} description={description}><><RadioGroup value={client} onValueChange={setClient} className="console-tool-grid" aria-label={localText(locale, "客户端工具", "Client tool")}>{tabs.map((tab) => {
    const meta = clientMeta[tab.value] || {};
    const selected = client === tab.value;
    return <label key={tab.value} className={selected ? "is-active" : ""}>{meta.icon ? <img className="console-tool-icon" src={meta.icon} alt="" aria-hidden="true" /> : <Icon name="terminal" size={17} />}<span><strong>{tab.label}</strong><small>{locale === "zh" ? meta.zh : meta.en}</small></span><Radio value={tab.value} aria-label={tab.label} /></label>;
  })}</RadioGroup><Alert variant="info" layout="inline" className="console-other-client-note"><AlertIcon><Icon name="book" size={17} /></AlertIcon><div><AlertTitle as="div">{localText(locale, "其他客户端", "Other clients")}</AlertTitle><AlertDescription>{localText(locale, "请仔细查阅客户端的官方文档,并按照官方说明配置 API 地址和密钥。", "Please consult the client's official documentation and follow its instructions to configure the API URL and key.")}</AlertDescription></div></Alert></></StepCard>;
}

function ShellStep({ tabs, shell, setShell, locale }) {
  return <StepCard className="is-system" title={localText(locale, "选择操作系统", "Pick your operating system")} description={localText(locale, "请选择操作系统及终端，命令和文件路径会随之调整。", "Choose your operating system and terminal. Commands and file paths will match your selection.")}><CompactTabs label="Operating system" items={tabs} value={shell} onChange={setShell} /></StepCard>;
}

function ConfigStep({ files, locale, client, platform }) {
  const codex = isCodexClient(client);
  const notice = codex
    ? platform === "openai"
      ? localText(locale, "默认使用 API Key Mode，将以下配置保存到 config.toml 即可。配置包含密钥，请勿分享或提交到代码仓库。", "API Key Mode is the default. Save the configuration below to config.toml. It contains your key; do not share it or commit it to a repository.")
      : localText(locale, "使用 API Key 认证：先设置 SUB2API_API_KEY，再保存 config.toml。桌面应用须继承该环境变量；已有配置请先备份并合并。", "Use API key authentication: set SUB2API_API_KEY, then save config.toml. The desktop app must inherit that environment variable. Back up and merge existing settings.")
    : client === "claude"
      ? localText(locale, "两种方式二选一：终端变量仅当前会话有效；settings.json 是用户级持久配置，也适用于 VS Code 插件。", "Choose either method: terminal variables apply to the current session; settings.json persists for the user and also works with the VS Code extension.")
      : client === "opencode" && platform === "antigravity"
        ? localText(locale, "Claude 与 Gemini 示例二选一；如需同时使用，请将两者的 provider 合并到同一份 opencode.json。", "Choose the Claude or Gemini example. To use both, merge their providers into one opencode.json.")
        : files.length > 1 ? localText(locale, "请分别按照下面的说明应用配置。", "Apply each configuration using the instructions below.") : "";
  return <StepCard className="is-config" title={localText(locale, "复制并应用配置", "Copy and apply the configuration")}><>{notice && <Alert variant="warning" layout="inline" className="console-config-notice"><AlertIcon><Icon name="info" size={17} /></AlertIcon><AlertDescription>{notice}</AlertDescription></Alert>}<div className="console-config-stack">{files.map((file) => <ConfigFile file={file} key={file.id || file.path} />)}</div></></StepCard>;
}

function RestartStep({ clientLabel, locale }) {
  const description = localText(locale, `保存配置后完全退出并重新打开 ${clientLabel}，新建任务并发送一条消息。若使用终端环境变量，请从设置变量的同一终端启动客户端。收到回复，即接入成功。`, `Save the settings, fully quit and reopen ${clientLabel}, then start a new task and send a message. If using environment variables, launch from the terminal where you set them. A reply confirms the connection.`);
  return <StepCard className="is-verify" title={localText(locale, "重启并验证", "Restart and verify")} description={description}><Accordion variant="flush" className="console-use-faq"><AccordionItem value="troubleshooting"><AccordionTrigger><Icon name="chat" size={16} />{localText(locale, "没有生效?看看这几点", "Not working? Check these")}</AccordionTrigger><AccordionContent><ul><li>{localText(locale, "确认已经完全退出客户端后再重新打开(终端环境变量只在当前窗口生效)。", "Make sure the client was fully restarted — terminal env vars only apply to the current window.")}</li><li>{localText(locale, "检查配置有没有被完整粘贴,地址和密钥前后不能有多余空格。", "Check the snippet was pasted in full, with no stray spaces around the URL or key.")}</li><li>{localText(locale, "回到「API 密钥」页面确认密钥状态是启用,并且没有超出额度。", "Confirm on the API keys page that this key is active and hasn't exhausted its quota.")}</li><li>{localText(locale, "仍有问题?到「用量记录」的错误标签页查看具体报错。", "Still stuck? The Errors tab under Usage shows the exact failure.")}</li></ul></AccordionContent></AccordionItem></Accordion><Alert variant="info" layout="inline" className="console-callout"><AlertIcon><Icon name="shield" size={18} /></AlertIcon><AlertDescription>{localText(locale, "密钥等同于账户凭证:不要发给别人,也不要提交到代码仓库。泄露时回到密钥页删除或停用即可。", "Treat the key like a password: don't share it or commit it to a repo. If it leaks, disable or delete it from the keys page.")}</AlertDescription></Alert></StepCard>;
}

function UseKeyContent({ steps, activeStep, setActiveStep, tabs, client, setClient, platform, locale, shellTabs, shell, setShell, files, clientLabel }) {
  const activeIndex = steps.findIndex((step) => step.value === activeStep);
  return <Panel className="console-use-workflow"><Tabs value={activeStep} onValueChange={setActiveStep} variant="line" className="console-use-tabs"><TabsList className={`console-use-step-list console-use-step-list--${steps.length}`} aria-label={localText(locale, "使用密钥步骤", "API key setup steps")}>{steps.map((step, index) => <TabsTrigger value={step.value} className={index < activeIndex ? "is-complete" : ""} key={step.value}><span className="console-use-nav-number">{String(index + 1).padStart(2, "0")}</span><span className="console-use-nav-label">{step.label}</span></TabsTrigger>)}</TabsList><TabsContent value="tool"><ToolPicker tabs={tabs} client={client} setClient={setClient} platform={platform} locale={locale} /></TabsContent>{shellTabs.length > 0 && <TabsContent value="system"><ShellStep tabs={shellTabs} shell={shell} setShell={setShell} locale={locale} /></TabsContent>}<TabsContent value="config"><ConfigStep files={files} locale={locale} client={client} platform={platform} /></TabsContent><TabsContent value="verify"><RestartStep clientLabel={clientLabel} locale={locale} /></TabsContent></Tabs></Panel>;
}

export function UseKeyModal({ open, apiKey, baseUrl, platform, allowMessagesDispatch, onClose }) {
  const { locale } = useLocale();
  const tabs = useMemo(() => clientTabs(platform, allowMessagesDispatch), [allowMessagesDispatch, platform]);
  const [client, setClient] = useState(defaultClient(platform));
  const [shell, setShell] = useState("unix");
  const [activeStep, setActiveStep] = useState("tool");
  useEffect(() => { setClient(defaultClient(platform)); setShell("unix"); setActiveStep("tool"); }, [platform, open]);
  useEffect(() => setShell("unix"), [client]);
  const shellTabs = shellTabsFor(client);
  const files = filesFor(client, shell, platform, baseUrl, apiKey, locale);
  const clientLabel = tabs.find((tab) => tab.value === client)?.label || client;
  const steps = [
    { value: "tool", label: localText(locale, "选择工具", "Tool") },
    ...(shellTabs.length ? [{ value: "system", label: localText(locale, "操作系统", "System") }] : []),
    { value: "config", label: localText(locale, "应用配置", "Configure") },
    { value: "verify", label: localText(locale, "验证接入", "Verify") },
  ];
  const activeIndex = Math.max(0, steps.findIndex((step) => step.value === activeStep));
  const lastStep = activeIndex === steps.length - 1;
  const previousStep = () => setActiveStep(steps[Math.max(0, activeIndex - 1)].value);
  const nextStep = () => setActiveStep(steps[Math.min(steps.length - 1, activeIndex + 1)].value);

  const content = platform ? <UseKeyContent steps={steps} activeStep={activeStep} setActiveStep={setActiveStep} tabs={tabs} client={client} setClient={setClient} platform={platform} locale={locale} shellTabs={shellTabs} shell={shell} setShell={setShell} files={files} clientLabel={clientLabel} /> : <MissingGroup locale={locale} />;
  const footer = platform ? <>{activeIndex > 0 && <Button onClick={previousStep}>{localText(locale, "上一步", "Back")}</Button>}<Button variant="primary" onClick={lastStep ? onClose : nextStep}>{lastStep ? localText(locale, "完成", "Done") : localText(locale, "下一步", "Next")}</Button></> : <Button onClick={onClose}>{localText(locale, "完成", "Done")}</Button>;
  return <Modal open={open} title={localText(locale, "使用 API 密钥", "Use your API key")} description={localText(locale, "跟着下面几步,几分钟内就能在你的工具里用上这把密钥。", "Follow the steps below — you'll be up and running in a few minutes.")} onClose={onClose} size="large" footer={footer}>{content}</Modal>;
}
