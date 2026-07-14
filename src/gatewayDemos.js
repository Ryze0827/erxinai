const demoMarkup = {
  endpoint: `
    <div class="gateway-demo-shell">
      <div class="gateway-demo-topbar">
        <span class="gateway-demo-product">Sentence AI Gateway</span>
        <span class="gateway-demo-live"><i></i> Live</span>
      </div>
      <div class="endpoint-layout">
        <div class="endpoint-models">
          <span class="demo-kicker">Model</span>
          <span class="endpoint-model" style="--i: 0">GPT-5.4</span>
          <span class="endpoint-model" style="--i: 1">Claude 4.6</span>
          <span class="endpoint-model" style="--i: 2">Codex</span>
          <span class="endpoint-model" style="--i: 3">Image</span>
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
  input=<span class="code-string">"Ship the next idea."</span>,
)</code></pre>
            <pre class="endpoint-snippet endpoint-snippet--typescript"><code><span class="code-muted">import</span> OpenAI <span class="code-muted">from</span> <span class="code-string">"openai"</span>;

const client = new OpenAI({
  baseURL: <span class="code-string">"https://api.sentence.ai/v1"</span>,
  apiKey: <span class="code-string">"sk-demo••••••4P9K"</span>,
});

const response = await client.responses.create({
  model: <span class="endpoint-model-value"><b style="--i: 0">"gpt-5.4"</b><b style="--i: 1">"claude-4.6"</b><b style="--i: 2">"codex-2"</b><b style="--i: 3">"image-1"</b></span>,
  input: <span class="code-string">"Ship the next idea."</span>,
});</code></pre>
          </div>
          <div class="endpoint-response">
            <span><i></i> 200 OK</span>
            <span>842 ms</span>
            <span>1,284 tokens</span>
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
        <span class="gateway-demo-product">Usage overview</span>
        <span class="gateway-demo-range">Last 30 days</span>
      </div>
      <div class="usage-kpis">
        <span><small>Requests</small><strong>48,291</strong><em>+12.4%</em></span>
        <span><small>Total tokens</small><strong>82.6M</strong><em>+8.1%</em></span>
        <span><small>Cache hit</small><strong>64.8%</strong><em>+4.2%</em></span>
        <span><small>Spend</small><strong>$438.20</strong><em>−6.8%</em></span>
        <span><small>Avg latency</small><strong>912 ms</strong><em>−11.5%</em></span>
      </div>
      <div class="usage-panels">
        <div class="usage-trend">
          <div class="usage-panel-head"><span>Tokens & spend</span><span>Daily</span></div>
          <div class="usage-bars">
            <i style="--h: 38%"></i><i style="--h: 52%"></i><i style="--h: 46%"></i><i style="--h: 68%"></i><i style="--h: 61%"></i><i style="--h: 76%"></i><i style="--h: 58%"></i><i style="--h: 82%"></i><i style="--h: 71%"></i><i style="--h: 92%"></i><i style="--h: 78%"></i><i style="--h: 88%"></i>
          </div>
          <div class="usage-axis"><span>Jun 01</span><span>Jun 15</span><span>Jun 30</span></div>
        </div>
        <div class="usage-models">
          <div class="usage-panel-head"><span>Model distribution</span><span>Tokens</span></div>
          <div class="usage-model-row"><span>GPT-5.4</span><b><i style="--w: 44%"></i></b><em>44%</em></div>
          <div class="usage-model-row"><span>Claude 4.6</span><b><i style="--w: 31%"></i></b><em>31%</em></div>
          <div class="usage-model-row"><span>Codex</span><b><i style="--w: 17%"></i></b><em>17%</em></div>
          <div class="usage-model-row"><span>Image</span><b><i style="--w: 8%"></i></b><em>8%</em></div>
        </div>
      </div>
    </div>
  `,
  health: `
    <div class="gateway-demo-shell">
      <div class="gateway-demo-topbar">
        <span class="gateway-demo-product">Provider health</span>
        <span class="gateway-demo-live"><i></i> Auto refresh</span>
      </div>
      <div class="health-table">
        <div class="health-row health-row--head"><span>Provider</span><span>Status</span><span>Uptime</span><span>p95</span><span>Error rate</span></div>
        <div class="health-row health-row--primary"><span>OpenAI · US East</span><span class="health-switch"><b>Operational</b><em>Degraded</em></span><span>99.98%</span><span class="health-latency"><b>720 ms</b><em>2.41 s</em></span><span class="health-error"><b>0.12%</b><em>4.82%</em></span></div>
        <div class="health-row health-row--backup"><span>Azure OpenAI</span><span class="status-ok">Operational</span><span>99.99%</span><span>684 ms</span><span>0.08%</span></div>
        <div class="health-row"><span>Anthropic</span><span class="status-ok">Operational</span><span>99.97%</span><span>812 ms</span><span>0.14%</span></div>
        <div class="health-row"><span>Google AI</span><span class="status-ok">Operational</span><span>99.95%</span><span>936 ms</span><span>0.21%</span></div>
      </div>
      <div class="health-route">
        <div class="health-route-copy"><small>Production route</small><strong class="health-route-switch"><span>OpenAI · US East</span><span>Azure OpenAI · Backup</span></strong></div>
        <div class="health-route-track"><i></i></div>
        <span class="health-route-label">Failover policy · latency + errors</span>
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
