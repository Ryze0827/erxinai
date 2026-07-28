const demoMarkup = {
  endpoint: `
    <div class="gateway-demo-shell">
      <div class="gateway-demo-topbar">
        <span class="gateway-demo-product" data-i18n="demo.gateway">Sentence AI 网关</span>
        <span class="gateway-demo-live"><i></i> <span data-i18n="demo.live">实时</span></span>
      </div>
      <div class="endpoint-layout">
        <div class="endpoint-models">
          <span class="demo-kicker" data-i18n="demo.model">模型</span>
          <span class="endpoint-model" style="--i: 0">GPT-5.4</span>
          <span class="endpoint-model" style="--i: 1">Claude 4.6</span>
          <span class="endpoint-model" style="--i: 2">Codex</span>
          <span class="endpoint-model" style="--i: 3" data-i18n="hero.family.image">图像</span>
        </div>
        <div class="endpoint-code">
          <div class="endpoint-code-head">
            <span class="endpoint-language endpoint-language--python">Python</span>
            <span class="endpoint-language endpoint-language--typescript">TypeScript</span>
          </div>
          <div class="endpoint-code-body">
            <pre class="endpoint-snippet endpoint-snippet--python"><code><span class="code-muted">from</span> openai <span class="code-muted">import</span> OpenAI

client = OpenAI(
  base_url=<span class="code-string">"https://api.sentence.ai/v1"</span>,
  api_key=<span class="code-string">"sk-demo••••••4P9K"</span>,
)

response = client.responses.create(
  model=<span class="endpoint-model-value"><b style="--i: 0">"gpt-5.4"</b><b style="--i: 1">"claude-4.6"</b><b style="--i: 2">"codex-2"</b><b style="--i: 3">"image-1"</b></span>,
  input=<span class="code-string" data-i18n="demo.sampleInput">"实现下一个想法。"</span>,
)</code></pre>
            <pre class="endpoint-snippet endpoint-snippet--typescript"><code><span class="code-muted">import</span> OpenAI <span class="code-muted">from</span> <span class="code-string">"openai"</span>;

const client = new OpenAI({
  baseURL: <span class="code-string">"https://api.sentence.ai/v1"</span>,
  apiKey: <span class="code-string">"sk-demo••••••4P9K"</span>,
});

const response = await client.responses.create({
  model: <span class="endpoint-model-value"><b style="--i: 0">"gpt-5.4"</b><b style="--i: 1">"claude-4.6"</b><b style="--i: 2">"codex-2"</b><b style="--i: 3">"image-1"</b></span>,
  input: <span class="code-string" data-i18n="demo.sampleInput">"实现下一个想法。"</span>,
});</code></pre>
          </div>
          <div class="endpoint-response">
            <span><i></i> 200 OK</span>
            <span>842 ms</span>
            <span data-i18n="demo.tokens">1,284 Token</span>
          </div>
        </div>
      </div>
    </div>
  `,
  trace: `
    <img class="trace-request-demo" src="/assets/img/trace-request-demo.png" alt="" decoding="async">
  `,
  usage: `
    <div class="gateway-demo-shell">
      <div class="gateway-demo-topbar">
        <span class="gateway-demo-product" data-i18n="demo.usage">用量概览</span>
        <span class="gateway-demo-range" data-i18n="demo.last30Days">近 30 天</span>
      </div>
      <div class="usage-kpis">
        <span><small data-i18n="demo.requests">请求数</small><strong>48,291</strong><em>+12.4%</em></span>
        <span><small data-i18n="demo.totalTokens">Token 总量</small><strong>82.6M</strong><em>+8.1%</em></span>
        <span><small data-i18n="demo.cacheHit">缓存命中率</small><strong>64.8%</strong><em>+4.2%</em></span>
        <span><small data-i18n="demo.spend">费用</small><strong>$438.20</strong><em>−6.8%</em></span>
        <span><small data-i18n="demo.avgLatency">平均延迟</small><strong>912 ms</strong><em>−11.5%</em></span>
      </div>
      <div class="usage-panels">
        <div class="usage-trend">
          <div class="usage-panel-head"><span data-i18n="demo.tokensSpend">Token 与费用</span><span data-i18n="demo.daily">每日</span></div>
          <div class="usage-bars">
            <i style="--h: 38%"></i><i style="--h: 52%"></i><i style="--h: 46%"></i><i style="--h: 68%"></i><i style="--h: 61%"></i><i style="--h: 76%"></i><i style="--h: 58%"></i><i style="--h: 82%"></i><i style="--h: 71%"></i><i style="--h: 92%"></i><i style="--h: 78%"></i><i style="--h: 88%"></i>
          </div>
          <div class="usage-axis"><span data-i18n="demo.dateStart">06-01</span><span data-i18n="demo.dateMiddle">06-15</span><span data-i18n="demo.dateEnd">06-30</span></div>
        </div>
        <div class="usage-models">
          <div class="usage-panel-head"><span data-i18n="demo.modelDistribution">模型分布</span><span data-i18n="demo.tokenUnit">Token</span></div>
          <div class="usage-model-row"><span>GPT-5.4</span><b><i style="--w: 44%"></i></b><em>44%</em></div>
          <div class="usage-model-row"><span>Claude 4.6</span><b><i style="--w: 31%"></i></b><em>31%</em></div>
          <div class="usage-model-row"><span>Codex</span><b><i style="--w: 17%"></i></b><em>17%</em></div>
          <div class="usage-model-row"><span data-i18n="hero.family.image">图像</span><b><i style="--w: 8%"></i></b><em>8%</em></div>
        </div>
      </div>
    </div>
  `,
  health: `
    <div class="gateway-demo-shell">
      <div class="gateway-demo-topbar">
        <span class="gateway-demo-product" data-i18n="demo.providerHealth">服务商健康度</span>
        <span class="gateway-demo-live"><i></i> <span data-i18n="demo.autoRefresh">自动刷新</span></span>
      </div>
      <div class="health-table">
        <div class="health-row health-row--head"><span data-i18n="demo.provider">服务商</span><span data-i18n="demo.status">状态</span><span data-i18n="demo.uptime">可用率</span><span>p95</span><span data-i18n="demo.errorRate">错误率</span></div>
        <div class="health-row health-row--primary"><span data-i18n="demo.openAiEast">OpenAI · 美国东部</span><span class="health-switch"><b data-i18n="demo.operational">正常</b><em data-i18n="demo.degraded">降级</em></span><span>99.98%</span><span class="health-latency"><b>720 ms</b><em>2.41 s</em></span><span class="health-error"><b>0.12%</b><em>4.82%</em></span></div>
        <div class="health-row health-row--backup"><span>Azure OpenAI</span><span class="status-ok" data-i18n="demo.operational">正常</span><span>99.99%</span><span>684 ms</span><span>0.08%</span></div>
        <div class="health-row"><span>Anthropic</span><span class="status-ok" data-i18n="demo.operational">正常</span><span>99.97%</span><span>812 ms</span><span>0.14%</span></div>
        <div class="health-row"><span>Google AI</span><span class="status-ok" data-i18n="demo.operational">正常</span><span>99.95%</span><span>936 ms</span><span>0.21%</span></div>
      </div>
      <div class="health-route">
        <div class="health-route-copy"><small data-i18n="demo.productionRoute">生产路由</small><strong class="health-route-switch"><span data-i18n="demo.openAiEast">OpenAI · 美国东部</span><span>Azure OpenAI · <span data-i18n="demo.backup">备用</span></span></strong></div>
        <div class="health-route-track"><i></i></div>
        <span class="health-route-label" data-i18n="demo.failover">故障转移策略 · 延迟 + 错误率</span>
      </div>
    </div>
  `,
};

export function mountGatewayDemos(root) {
  if (!root) return;
  root.querySelectorAll("[data-gateway-demo]").forEach((element) => {
    const key = element.getAttribute("data-gateway-demo");
    if (demoMarkup[key]) element.innerHTML = demoMarkup[key];
  });
}
