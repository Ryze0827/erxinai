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
import { useLocale, translate } from "../i18n";
import { CompactTabs } from "./ConsoleControls";
import { clientTabs, defaultClient, filesFor, isCodexClient, shellTabsFor } from "./useKeyConfig.js";

const terminalNames = new Set(["Terminal", "Command Prompt", "PowerShell"]);

const clientMeta = {
  claude: { icon: "/assets/img/hero-claude-53b6104287.webp" },
  codex: { icon: "/assets/img/hero-codex-52fd8a0726.webp" },
  gemini: {},
  grok: {},
  opencode: { icon: "/assets/img/hero-opencode-0a4e72d2ce.webp" },
};

function fileMeta(file, locale) {
  if (terminalNames.has(file.path)) {
    return {
      icon: "terminal",
      title: translate(locale, "useKey.pasteIntoPressEnter", { path: file.path }),
      note: file.note || translate(locale, "useKey.appliesTerminalSessionOnly"),
    };
  }
  const optional = file.hint === "VSCode Claude Code";
  return {
    icon: "order",
    title: file.title || translate(locale, "useKey.save", { path: file.path }),
    note: file.note || (optional
      ? translate(locale, "useKey.optionalPersistentUserSettings")
      : translate(locale, "useKey.createFileIfDoesn")),
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
        <CopyButton value={file.content} label={translate(locale, "common.copy")} />
      </header>
      <pre><code>{file.content}</code></pre>
      <footer>{meta.note}</footer>
    </div>
  </div>;
}

function MissingGroup({ locale }) {
  return <Alert variant="warning" layout="inline" className="console-callout console-callout--warning"><AlertIcon><Icon name="warning" size={20} /></AlertIcon><div><AlertTitle as="div">{translate(locale, "useKey.noGroupAssigned")}</AlertTitle><AlertDescription>{translate(locale, "useKey.assignPlatformGroupBefore")}</AlertDescription></div></Alert>;
}

function ToolPicker({ tabs, client, setClient, platform, locale }) {
  const description = translate(locale, "useKey.keyBelongsGroupWorks", { platform });
  return <StepCard className="is-tool" title={translate(locale, "useKey.chooseTool")} description={description}><><RadioGroup value={client} onValueChange={setClient} className="console-tool-grid" aria-label={translate(locale, "useKey.clientTool")}>{tabs.map((tab) => {
    const meta = clientMeta[tab.value] || {};
    const selected = client === tab.value;
    return <label key={tab.value} className={selected ? "is-active" : ""}>{meta.icon ? <img className="console-tool-icon" src={meta.icon} alt="" aria-hidden="true" /> : <Icon name="terminal" size={17} />}<span><strong>{tab.label}</strong><small>{clientMeta[tab.value] ? translate(locale, `useKey.client.${tab.value}`) : null}</small></span><Radio value={tab.value} aria-label={tab.label} /></label>;
  })}</RadioGroup><Alert variant="info" layout="inline" className="console-other-client-note"><AlertIcon><Icon name="book" size={17} /></AlertIcon><div><AlertTitle as="div">{translate(locale, "useKey.otherClients")}</AlertTitle><AlertDescription>{translate(locale, "useKey.pleaseConsultClientS")}</AlertDescription></div></Alert></></StepCard>;
}

function ShellStep({ tabs, shell, setShell, locale }) {
  return <StepCard className="is-system" title={translate(locale, "useKey.pickOperatingSystem")} description={translate(locale, "useKey.chooseOperatingSystemTerminal")}><CompactTabs label="Operating system" items={tabs} value={shell} onChange={setShell} /></StepCard>;
}

function ConfigStep({ files, locale, client, platform }) {
  const codex = isCodexClient(client);
  const notice = codex
    ? platform === "openai"
      ? translate(locale, "useKey.apiKeyModeDefault")
      : translate(locale, "useKey.useApiKeyAuthentication")
    : client === "claude"
      ? translate(locale, "useKey.chooseEitherMethodTerminal")
      : client === "opencode" && platform === "antigravity"
        ? translate(locale, "useKey.chooseClaudeGeminiExample")
        : files.length > 1 ? translate(locale, "useKey.applyEachConfigurationUsing") : "";
  return <StepCard className="is-config" title={translate(locale, "useKey.copyApplyConfiguration")}><>{notice && <Alert variant="warning" layout="inline" className="console-config-notice"><AlertIcon><Icon name="info" size={17} /></AlertIcon><AlertDescription>{notice}</AlertDescription></Alert>}<div className="console-config-stack">{files.map((file) => <ConfigFile file={file} key={file.id || file.path} />)}</div></></StepCard>;
}

function RestartStep({ clientLabel, locale }) {
  const description = translate(locale, "useKey.saveSettingsFullyQuit", { clientLabel });
  return <StepCard className="is-verify" title={translate(locale, "useKey.restartVerify")} description={description}><Accordion variant="flush" className="console-use-faq"><AccordionItem value="troubleshooting"><AccordionTrigger><Icon name="chat" size={16} />{translate(locale, "useKey.notWorkingCheckThese")}</AccordionTrigger><AccordionContent><ul><li>{translate(locale, "useKey.makeSureClientWas")}</li><li>{translate(locale, "useKey.checkSnippetWasPasted")}</li><li>{translate(locale, "useKey.confirmApiKeysPage")}</li><li>{translate(locale, "useKey.stillStuckErrorsTab")}</li></ul></AccordionContent></AccordionItem></Accordion><Alert variant="info" layout="inline" className="console-callout"><AlertIcon><Icon name="shield" size={18} /></AlertIcon><AlertDescription>{translate(locale, "useKey.treatKeyLikePassword")}</AlertDescription></Alert></StepCard>;
}

function UseKeyContent({ steps, activeStep, setActiveStep, tabs, client, setClient, platform, locale, shellTabs, shell, setShell, files, clientLabel }) {
  const activeIndex = steps.findIndex((step) => step.value === activeStep);
  return <Panel className="console-use-workflow"><Tabs value={activeStep} onValueChange={setActiveStep} variant="line" className="console-use-tabs"><TabsList className={`console-use-step-list console-use-step-list--${steps.length}`} aria-label={translate(locale, "useKey.apiKeySetupSteps")}>{steps.map((step, index) => <TabsTrigger value={step.value} className={index < activeIndex ? "is-complete" : ""} key={step.value}><span className="console-use-nav-number">{String(index + 1).padStart(2, "0")}</span><span className="console-use-nav-label">{step.label}</span></TabsTrigger>)}</TabsList><TabsContent value="tool"><ToolPicker tabs={tabs} client={client} setClient={setClient} platform={platform} locale={locale} /></TabsContent>{shellTabs.length > 0 && <TabsContent value="system"><ShellStep tabs={shellTabs} shell={shell} setShell={setShell} locale={locale} /></TabsContent>}<TabsContent value="config"><ConfigStep files={files} locale={locale} client={client} platform={platform} /></TabsContent><TabsContent value="verify"><RestartStep clientLabel={clientLabel} locale={locale} /></TabsContent></Tabs></Panel>;
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
    { value: "tool", label: translate(locale, "useKey.tool") },
    ...(shellTabs.length ? [{ value: "system", label: translate(locale, "useKey.system") }] : []),
    { value: "config", label: translate(locale, "useKey.configure") },
    { value: "verify", label: translate(locale, "useKey.verify") },
  ];
  const activeIndex = Math.max(0, steps.findIndex((step) => step.value === activeStep));
  const lastStep = activeIndex === steps.length - 1;
  const previousStep = () => setActiveStep(steps[Math.max(0, activeIndex - 1)].value);
  const nextStep = () => setActiveStep(steps[Math.min(steps.length - 1, activeIndex + 1)].value);

  const content = platform ? <UseKeyContent steps={steps} activeStep={activeStep} setActiveStep={setActiveStep} tabs={tabs} client={client} setClient={setClient} platform={platform} locale={locale} shellTabs={shellTabs} shell={shell} setShell={setShell} files={files} clientLabel={clientLabel} /> : <MissingGroup locale={locale} />;
  const footer = platform ? <>{activeIndex > 0 && <Button onClick={previousStep}>{translate(locale, "useKey.back")}</Button>}<Button variant="primary" onClick={lastStep ? onClose : nextStep}>{lastStep ? translate(locale, "useKey.done") : translate(locale, "useKey.next")}</Button></> : <Button onClick={onClose}>{translate(locale, "useKey.done")}</Button>;
  return <Modal open={open} title={translate(locale, "useKey.useApiKey")} description={translate(locale, "useKey.followStepsBelowYou")} onClose={onClose} size="large" footer={footer}>{content}</Modal>;
}
