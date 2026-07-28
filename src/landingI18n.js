const landingMessages = {
  en: {
    "document.title": "Sentence AI — One gateway for every model",
    "nav.home": "Sentence AI home",
    "nav.primary": "Primary navigation",
    "nav.features": "Features",
    "nav.pricing": "Pricing",
    "nav.faq": "FAQ",
    "nav.toggle": "Toggle navigation",
    "auth.login": "Log in",
    "auth.dashboard": "Dashboard",
    "auth.createAccount": "Create account",
    "language.switch": "Switch to Chinese",
    "language.label": "中文",
    "hero.eyebrow": "OpenAI-compatible AI gateway",
    "hero.titleLabel": "Your AI gateway, built for every model",
    "hero.title": `
      <span aria-hidden="true">
        <span class="hero-word hero-char" style="animation-delay: 560ms">Your</span>
        <span class="hero-word hero-char" style="animation-delay: 650ms">AI</span>
        <span class="hero-word hero-char" style="animation-delay: 740ms">gateway,</span>
      </span>
      <br>
      <span class="hero-headline-serif" aria-hidden="true">
        <span class="hero-word hero-char" style="animation-delay: 860ms">built</span>
        <span class="hero-word hero-char" style="animation-delay: 950ms">for</span>
        <span class="hero-word hero-char" style="animation-delay: 1040ms">every</span>
        <span class="hero-word hero-char" style="animation-delay: 1130ms">model</span>
      </span>
    `,
    "hero.lead": "Connect to leading text, code, and image models through one stable API. Trace requests, control spend, and route around provider failures.",
    "hero.cta": "Start building",
    "hero.meta": "One account · One endpoint · Multiple providers",
    "hero.families": "Supported model families",
    "hero.family.text": "Text",
    "hero.family.code": "Code",
    "hero.family.image": "Image",
    "hero.family.reasoning": "Reasoning",
    "hero.tools": "Supported AI tools: Claude, Codex, Cursor, Grok, Hermes, OpenCode, and Antigravity",
    "feature.endpoint.title": "One endpoint. Every model.",
    "feature.endpoint.body": "Use one OpenAI-compatible API to reach leading text, code, and image models.",
    "feature.trace.title": "Trace every request.",
    "feature.trace.body": "Inspect status, latency, tokens, cost, retries, and the exact route behind every call.",
    "feature.usage.title": "Know every token and dollar.",
    "feature.usage.body": "Track usage and spend by key, model, project, and time range.",
    "feature.health.title": "Stay online when providers do not.",
    "feature.health.body": "Monitor provider health and use routing policies to keep production traffic moving.",
    "pricing.title": "Pricing that grows with your traffic.",
    "pricing.kicker": "Choose how you start",
    "pricing.group": "Gateway plan",
    "pricing.starter": "Starter",
    "pricing.usage": "Usage based",
    "pricing.scale": "Scale",
    "pricing.price.starter": "$0",
    "pricing.price.usage": "Usage",
    "pricing.price.scale": "Custom",
    "pricing.period.starter": "/start",
    "pricing.period.usage": "/based",
    "pricing.period.scale": "/plan",
    "pricing.note.guest": "Create an account before adding usage credit",
    "pricing.note.authenticated": "Your account is ready. Go to API keys to get started.",
    "pricing.action.guest": "Create an account",
    "pricing.action.authenticated": "Start using",
    "pricing.benefit.endpoint": "One OpenAI-compatible endpoint for supported model providers",
    "pricing.benefit.keys": "Project keys with request-level usage and cost visibility",
    "pricing.benefit.routing": "Provider health, routing policies, retries, and fallback controls",
    "pricing.benefit.workloads": "Text, code, image, and reasoning workloads in one account",
    "pricing.benefit.integration": "No separate client integration for every upstream provider",
    "pricing.login": "Already have an account? Log in",
    "faq.title": "Questions, answered.",
    "faq.what.question": "What is Sentence AI?",
    "faq.what.answer": "Sentence AI is an AI gateway that gives applications one API for multiple model providers. It centralizes access keys, request routing, usage records, and provider health in one place.",
    "faq.client.question": "Can I use an OpenAI client library?",
    "faq.client.answer": "Yes. Point a compatible client at the Sentence AI base URL, provide your Sentence AI key, and select a supported model. Most integrations only need those configuration changes.",
    "faq.monitor.question": "How are requests monitored?",
    "faq.monitor.answer": "Request records can include status, route, latency, token usage, estimated cost, retries, and errors so teams can diagnose behavior without building a separate observability layer.",
    "faq.provider.question": "What happens when a provider is unavailable?",
    "faq.provider.answer": "Provider health and routing policies help you identify degraded upstreams. Where a compatible backup is configured, requests can be retried or routed through another available channel.",
    "faq.spend.question": "How do I control access and spend?",
    "faq.spend.answer": "Use separate keys for projects or environments, then review request and token usage by key, model, and time range. Keep production keys on your server and rotate them when needed.",
    "faq.start.question": "How do I get started?",
    "faq.start.answer": "Create a Sentence AI account, generate a project key, update your client base URL, and send your first request using a supported model identifier.",
    "footer.note": "Build against one stable AI interface while Sentence AI keeps provider access, routing, and usage visible.",
    "footer.product": "Product",
    "footer.account": "Account",
    "footer.tagline": "AI gateway for developers",
    "demo.gateway": "Sentence AI Gateway",
    "demo.live": "Live",
    "demo.model": "Model",
    "demo.sampleInput": "\"Ship the next idea.\"",
    "demo.tokens": "1,284 tokens",
    "demo.usage": "Usage overview",
    "demo.last30Days": "Last 30 days",
    "demo.requests": "Requests",
    "demo.totalTokens": "Total tokens",
    "demo.cacheHit": "Cache hit",
    "demo.spend": "Spend",
    "demo.avgLatency": "Avg latency",
    "demo.tokensSpend": "Tokens & spend",
    "demo.daily": "Daily",
    "demo.dateStart": "Jun 01",
    "demo.dateMiddle": "Jun 15",
    "demo.dateEnd": "Jun 30",
    "demo.modelDistribution": "Model distribution",
    "demo.tokenUnit": "Tokens",
    "demo.providerHealth": "Provider health",
    "demo.autoRefresh": "Auto refresh",
    "demo.provider": "Provider",
    "demo.status": "Status",
    "demo.uptime": "Uptime",
    "demo.errorRate": "Error rate",
    "demo.operational": "Operational",
    "demo.degraded": "Degraded",
    "demo.productionRoute": "Production route",
    "demo.openAiEast": "OpenAI · US East",
    "demo.backup": "Backup",
    "demo.failover": "Failover policy · latency + errors",
  },
  zh: {
    "document.title": "Sentence AI — 一个网关，连接所有模型",
    "nav.home": "Sentence AI 首页",
    "nav.primary": "主导航",
    "nav.features": "功能",
    "nav.pricing": "价格",
    "nav.faq": "常见问题",
    "nav.toggle": "展开或收起导航",
    "auth.login": "登录",
    "auth.dashboard": "控制台",
    "auth.createAccount": "注册账号",
    "language.switch": "切换到英文",
    "language.label": "EN",
    "hero.eyebrow": "兼容 OpenAI 的 AI 网关",
    "hero.titleLabel": "你的 AI 网关，连接每一种模型",
    "hero.title": `
      <span aria-hidden="true">
        <span class="hero-word hero-char" style="animation-delay: 560ms">你的</span>
        <span class="hero-word hero-char" style="animation-delay: 650ms">AI</span>
        <span class="hero-word hero-char" style="animation-delay: 740ms">网关，</span>
      </span>
      <br>
      <span class="hero-headline-serif" aria-hidden="true">
        <span class="hero-word hero-char" style="animation-delay: 860ms">连接</span>
        <span class="hero-word hero-char" style="animation-delay: 950ms">每一种</span>
        <span class="hero-word hero-char" style="animation-delay: 1040ms">模型</span>
      </span>
    `,
    "hero.lead": "通过一个稳定的 API，连接领先的文本、代码和图像模型。追踪请求、控制成本，并在服务商故障时自动绕行。",
    "hero.cta": "开始构建",
    "hero.meta": "一个账号 · 一个端点 · 多家服务商",
    "hero.families": "支持的模型类型",
    "hero.family.text": "文本",
    "hero.family.code": "代码",
    "hero.family.image": "图像",
    "hero.family.reasoning": "推理",
    "hero.tools": "支持的 AI 工具：Claude、Codex、Cursor、Grok、Hermes、OpenCode 和 Antigravity",
    "feature.endpoint.title": "一个端点，连接所有模型。",
    "feature.endpoint.body": "通过一个兼容 OpenAI 的 API，接入领先的文本、代码和图像模型。",
    "feature.trace.title": "追踪每一次请求。",
    "feature.trace.body": "查看状态、延迟、Token、费用、重试，以及每次调用背后的完整路由。",
    "feature.usage.title": "掌握每个 Token 和每笔费用。",
    "feature.usage.body": "按密钥、模型、项目和时间范围追踪用量与支出。",
    "feature.health.title": "服务商离线，业务依然在线。",
    "feature.health.body": "监控服务商健康状态，并通过路由策略保障生产流量持续运行。",
    "pricing.title": "随业务流量灵活增长的价格方案。",
    "pricing.kicker": "选择你的起步方式",
    "pricing.group": "网关方案",
    "pricing.starter": "入门",
    "pricing.usage": "按量计费",
    "pricing.scale": "规模化",
    "pricing.price.starter": "$0",
    "pricing.price.usage": "按量",
    "pricing.price.scale": "定制",
    "pricing.period.starter": "/起步",
    "pricing.period.usage": "/计费",
    "pricing.period.scale": "/方案",
    "pricing.note.guest": "注册账号后即可充值并开始使用",
    "pricing.note.authenticated": "账号已就绪，前往 API 密钥即可开始使用。",
    "pricing.action.guest": "注册账号",
    "pricing.action.authenticated": "开始使用",
    "pricing.benefit.endpoint": "一个兼容 OpenAI 的端点，连接所有受支持的模型服务商",
    "pricing.benefit.keys": "项目级 API 密钥，请求用量与费用清晰可见",
    "pricing.benefit.routing": "服务商健康监控、路由策略、重试与故障回退控制",
    "pricing.benefit.workloads": "一个账号承载文本、代码、图像和推理工作负载",
    "pricing.benefit.integration": "无需为每个上游服务商分别集成客户端",
    "pricing.login": "已有账号？立即登录",
    "faq.title": "常见问题。",
    "faq.what.question": "Sentence AI 是什么？",
    "faq.what.answer": "Sentence AI 是一个 AI 网关，让应用通过一个 API 连接多家模型服务商，并在一个平台中统一管理访问密钥、请求路由、用量记录和服务商健康状态。",
    "faq.client.question": "可以使用 OpenAI 客户端库吗？",
    "faq.client.answer": "可以。将兼容客户端的基础地址指向 Sentence AI，填入 Sentence AI 密钥并选择受支持的模型即可。大多数集成只需修改这些配置。",
    "faq.monitor.question": "如何监控请求？",
    "faq.monitor.answer": "请求记录可包含状态、路由、延迟、Token 用量、预估费用、重试和错误，团队无需额外搭建可观测平台也能快速定位问题。",
    "faq.provider.question": "服务商不可用时会怎样？",
    "faq.provider.answer": "服务商健康状态与路由策略可以帮助识别异常上游。配置兼容的备用通道后，请求可以自动重试或切换到其他可用通道。",
    "faq.spend.question": "如何控制访问权限和费用？",
    "faq.spend.answer": "为不同项目或环境创建独立密钥，再按密钥、模型和时间范围查看请求及 Token 用量。生产密钥应保存在服务端，并按需轮换。",
    "faq.start.question": "如何开始使用？",
    "faq.start.answer": "注册 Sentence AI 账号，创建项目密钥，更新客户端基础地址，然后使用受支持的模型标识发送第一个请求。",
    "footer.note": "只需对接一个稳定的 AI 接口，Sentence AI 会让服务商接入、请求路由和用量始终清晰可见。",
    "footer.product": "产品",
    "footer.account": "账号",
    "footer.tagline": "为开发者打造的 AI 网关",
    "demo.gateway": "Sentence AI 网关",
    "demo.live": "实时",
    "demo.model": "模型",
    "demo.sampleInput": "\"实现下一个想法。\"",
    "demo.tokens": "1,284 Token",
    "demo.usage": "用量概览",
    "demo.last30Days": "近 30 天",
    "demo.requests": "请求数",
    "demo.totalTokens": "Token 总量",
    "demo.cacheHit": "缓存命中率",
    "demo.spend": "费用",
    "demo.avgLatency": "平均延迟",
    "demo.tokensSpend": "Token 与费用",
    "demo.daily": "每日",
    "demo.dateStart": "06-01",
    "demo.dateMiddle": "06-15",
    "demo.dateEnd": "06-30",
    "demo.modelDistribution": "模型分布",
    "demo.tokenUnit": "Token",
    "demo.providerHealth": "服务商健康度",
    "demo.autoRefresh": "自动刷新",
    "demo.provider": "服务商",
    "demo.status": "状态",
    "demo.uptime": "可用率",
    "demo.errorRate": "错误率",
    "demo.operational": "正常",
    "demo.degraded": "降级",
    "demo.productionRoute": "生产路由",
    "demo.openAiEast": "OpenAI · 美国东部",
    "demo.backup": "备用",
    "demo.failover": "故障转移策略 · 延迟 + 错误率",
  },
};

export function landingT(locale, key) {
  const normalized = locale === "en" ? "en" : "zh";
  return landingMessages[normalized][key] || landingMessages.en[key] || key;
}

function syncPriceAmount(root) {
  const selectedTier = root.querySelector(".home-price-tier.selected");
  const amount = root.querySelector(".home-price-amount");
  if (!selectedTier || !amount) return;
  const period = document.createElement("span");
  period.className = "home-price-per";
  period.textContent = selectedTier.dataset.period;
  amount.replaceChildren(document.createTextNode(selectedTier.dataset.price), period);
}

export function applyLandingTranslations(root, locale) {
  if (!root) return;
  const normalized = locale === "en" ? "en" : "zh";
  root.dataset.landingLocale = normalized;
  root.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = landingT(normalized, element.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-html]").forEach((element) => {
    element.innerHTML = landingT(normalized, element.dataset.i18nHtml);
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", landingT(normalized, element.dataset.i18nAria));
  });
  root.querySelectorAll("[data-price-key]").forEach((element) => {
    element.dataset.price = landingT(normalized, element.dataset.priceKey);
  });
  root.querySelectorAll("[data-period-key]").forEach((element) => {
    element.dataset.period = landingT(normalized, element.dataset.periodKey);
  });
  root.querySelectorAll("[data-language-toggle]").forEach((button) => {
    button.dataset.languageTarget = normalized === "zh" ? "en" : "zh";
    button.setAttribute("aria-label", landingT(normalized, "language.switch"));
    button.title = landingT(normalized, "language.switch");
  });
  syncPriceAmount(root);
  document.documentElement.lang = normalized === "zh" ? "zh-CN" : "en";
  document.title = landingT(normalized, "document.title");
}
