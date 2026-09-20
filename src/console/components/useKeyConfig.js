import { openCodeModels } from "./useKeyModels.js";

const text = (locale, zh, en) => locale === "zh" ? zh : en;
const toml = (value) => JSON.stringify(value);
const windowsShell = (shell) => shell !== "unix";
export const isCodexClient = (client) => client === "codex";
export function shellTabsFor(client) {
  if (client === "opencode") return [];
  if (isCodexClient(client) || client === "grok") return [
    { value: "unix", label: "macOS / Linux" }, { value: "windows", label: "Windows" },
  ];
  return [
    { value: "unix", label: "macOS / Linux" }, { value: "cmd", label: "Windows CMD" }, { value: "powershell", label: "PowerShell" },
  ];
}

export function clientTabs(platform, allowMessagesDispatch) {
  const claude = { value: "claude", label: "Claude Code" };
  const codex = { value: "codex", label: "Codex App" };
  const gemini = { value: "gemini", label: "Gemini CLI" };
  const opencode = { value: "opencode", label: "OpenCode" };
  if (platform === "openai") return [codex, ...(allowMessagesDispatch ? [claude] : []), opencode];
  if (platform === "gemini") return [gemini, codex, opencode];
  if (platform === "antigravity") return [claude, gemini, codex, opencode];
  if (platform === "grok") return [{ value: "grok", label: "Grok CLI" }, claude, codex, opencode];
  return [claude, codex, opencode];
}

export function defaultClient(platform) {
  return platform === "openai" ? "codex" : platform === "gemini" ? "gemini" : platform === "grok" ? "grok" : "claude";
}

function configPath(shell, directory, filename) {
  return windowsShell(shell) ? `%USERPROFILE%\\.${directory}\\${filename}` : `~/.${directory}/${filename}`;
}

function envFile(shell, variables) {
  const path = shell === "cmd" ? "Command Prompt" : windowsShell(shell) ? "PowerShell" : "Terminal";
  const content = Object.entries(variables).map(([key, value]) => shell === "cmd" ? `set ${key}=${value}` : windowsShell(shell) ? `$env:${key}="${value}"` : `export ${key}="${value}"`).join("\n");
  return { path, content };
}

function envFiles(client, shell, platform, baseUrl, apiKey, locale) {
  if (client === "gemini") return [{ ...envFile(shell, { GOOGLE_GEMINI_BASE_URL: baseUrl, GEMINI_API_KEY: apiKey, GEMINI_MODEL: "gemini-2.0-flash" }),
    note: text(locale, "环境变量仅当前终端会话有效；有 Gemini 3 权限时可将模型改为 gemini-3-pro-preview。", "Environment variables apply to this terminal session only. With Gemini 3 access, you can use gemini-3-pro-preview.") }];
  const variables = { ANTHROPIC_BASE_URL: baseUrl, ANTHROPIC_AUTH_TOKEN: apiKey,
    ...(platform === "grok" ? Object.fromEntries(["ANTHROPIC_MODEL", "ANTHROPIC_DEFAULT_OPUS_MODEL", "ANTHROPIC_DEFAULT_SONNET_MODEL", "ANTHROPIC_DEFAULT_HAIKU_MODEL", "ANTHROPIC_DEFAULT_FABLE_MODEL", "CLAUDE_CODE_SUBAGENT_MODEL"].map((key) => [key, "grok-4.5"])) : {}),
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1" };
  return [envFile(shell, variables), { path: configPath(shell, "claude", "settings.json"),
    content: JSON.stringify({ $schema: "https://json.schemastore.org/claude-code-settings.json", env: variables }, null, 2), hint: "VSCode Claude Code" }];
}

export function baseRoot(baseUrl) {
  return baseUrl.trim().replace(/\/+$/, "").replace(/\/v1$/i, "");
}

function codexFiles(shell, platform, baseUrl, apiKey, locale) {
  const model = { openai: "gpt-5.5", anthropic: "claude-sonnet-4-6", gemini: "gemini-2.5-pro", antigravity: "claude-sonnet-4-6", grok: "grok-4.5", kimi: "kimi-k2.5", zhipu: "glm-4.7", deepseek: "deepseek-v4-pro", minimax: "MiniMax-M3", opencode_go: "glm-5.3", composite: "gpt-5.5" }[platform] || "";
  const files = [];
  let content;
  if (platform === "openai") {
    content = `model_provider = "OpenAI"
model = ${toml(model)}
review_model = ${toml(model)}
disable_response_storage = true
network_access = "enabled"
windows_wsl_setup_acknowledged = true

[model_providers.OpenAI]
name = "OpenAI"
base_url = ${toml(baseUrl)}
wire_api = "responses"
requires_openai_auth = false
experimental_bearer_token = ${toml(apiKey)}
http_headers = { "x-openai-actor-authorization" = "local-image-extension" }

[features]
goals = true`;
  } else {
    const label = { anthropic: "Anthropic", gemini: "Gemini", antigravity: "Antigravity", grok: "Grok", kimi: "Kimi", zhipu: "Zhipu", deepseek: "DeepSeek", minimax: "MiniMax", opencode_go: "OpenCode", composite: "Composite" }[platform] || platform;
    files.push(envFile(shell, { SUB2API_API_KEY: apiKey }));
    content = `model_provider = "sub2api"
model = ${toml(model)}
${platform === "grok" ? "" : `review_model = ${toml(model)}\ndisable_response_storage = true\n`}
[model_providers.sub2api]
name = "Sub2API ${label}"
base_url = ${toml(`${baseRoot(baseUrl)}/v1`)}
env_key = "SUB2API_API_KEY"
wire_api = "responses"
requires_openai_auth = false
supports_websockets = false`;
  }
  files.push({ path: configPath(shell, "codex", "config.toml"), content,
    note: text(locale, "先备份并合并已有配置，确保顶层配置位于 config.toml 开头。保存后完全退出并重启 Codex App，再新建任务。", "Back up and merge existing settings, keeping top-level entries at the start of config.toml. After saving, fully quit and restart Codex App, then create a new task.") });
  return files;
}

function grokFiles(shell, baseUrl, apiKey, locale) {
  const models = [["grok-4.5", "Grok 4.5", 500000], ["grok-build-0.1", "Grok Build", 256000], ["grok-4.20-multi-agent-0309", "Grok 4.20 Multi Agent (text / web_search)", 1000000], ["grok-4.3", "Grok 4.3", 1000000]];
  const content = `[endpoints]\nmodels_base_url = ${toml(baseUrl)}\nmodels_list_url = ${toml(`${baseUrl}/models`)}\nxai_api_base_url = ${toml(baseUrl)}\ncli_chat_proxy_base_url = ${toml(baseUrl)}\n\n[auth]\npreferred_method = "api_key"\n\n${models.map(([model, name, context]) => `[model."${model}"]\nmodel = "${model}"\nname = "${name}"\nenv_key = "XAI_API_KEY"\napi_backend = "responses"\ncontext_window = ${context}\nsupports_backend_search = true`).join("\n\n")}\n\n[models]\ndefault = "grok-4.5"\nweb_search = "grok-4.5"\nimage_description = "grok-4.5"\n\n[session]\nauto_compact_threshold_percent = 80\n\n# Enable image/video only if your group allows it.\n[features]\nimage_gen = true\nvideo_gen = true\nimage_gen_model_override = "grok-imagine-image-quality"\nimage_edit_model_override = "grok-imagine-edit"`;
  return [envFile(shell, { GROK_MODELS_BASE_URL: baseUrl, XAI_API_KEY: apiKey }), { path: configPath(shell, "grok", "config.toml"), content,
    note: text(locale, "先备份并合并配置，保存后运行 grok inspect，再用 /model 选择 grok-4.5；编程可用 grok-build-0.1。图片/视频仅在分组允许时启用，使用 Imagine 模型与媒体端点。", "Back up and merge settings, run grok inspect, then choose grok-4.5 with /model; use grok-build-0.1 for coding. Enable image/video only when your group allows it, using Imagine models and media endpoints.") }];
}

function opencodeFiles(platform, root, apiKey, locale) {
  const path = "~/.config/opencode/opencode.json";
  const providers = platform === "antigravity" ? ["antigravity-claude", "antigravity-gemini"] : [platform === "anthropic" || platform === "gemini" || platform === "grok" ? platform : "openai"];
  return providers.map((provider) => {
    const google = provider === "gemini" || provider === "antigravity-gemini";
    const anthropic = provider === "anthropic" || provider === "antigravity-claude";
    const baseURL = `${root}${provider.startsWith("antigravity-") ? "/antigravity" : ""}/${google ? "v1beta" : "v1"}`;
    const options = { options: { baseURL, apiKey },
      ...(google ? { npm: "@ai-sdk/google" } : anthropic ? { npm: "@ai-sdk/anthropic" } : provider === "grok" ? { npm: "@ai-sdk/openai-compatible" } : {}),
      ...(provider.startsWith("antigravity-") ? { name: google ? "Antigravity (Gemini)" : "Antigravity (Claude)" } : provider === "grok" ? { name: "Grok via Sub2API" } : {}),
      ...(openCodeModels[provider] ? { models: openCodeModels[provider] } : {}) };
    return { path, id: provider,
      title: providers.length > 1 ? `OpenCode · ${google ? "Gemini" : "Claude"} · ${path}` : undefined,
      content: JSON.stringify({ provider: { [provider]: options }, ...(provider === "openai" ? { agent: { build: { options: { store: false } }, plan: { options: { store: false } } } } : {}), $schema: "https://opencode.ai/config.json" }, null, 2),
      note: text(locale, "可使用 opencode.json 或 opencode.jsonc；API Key 也可通过 /connect 配置。示例模型与选项按分组实际权限调整。", "Use opencode.json or opencode.jsonc; you can also set the API key with /connect. Adjust example models and options to your group's access.") };
  });
}

export function filesFor(client, shell, platform, baseUrl, apiKey, locale = "zh") {
  const root = baseRoot(baseUrl);
  if (isCodexClient(client)) return codexFiles(shell, platform, baseUrl, apiKey, locale);
  if (client === "grok") return grokFiles(shell, `${root}/v1`, apiKey, locale);
  if (client === "opencode") return opencodeFiles(platform, root.replace(/\/v1beta$/i, ""), apiKey, locale);
  return envFiles(client, shell, platform, platform === "antigravity" ? `${root}/antigravity` : root, apiKey, locale);
}
