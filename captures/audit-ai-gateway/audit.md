# AI 中转站首页演示区审阅

## Audit scope

- 目标：为 Sentence AI 首页四宫格演示区筛选面向专业开发者的四个价值板块。
- 证据：当前首页截图，以及 WayXStoreAI“我的账户”下的 API 密钥、使用记录、渠道状态、我的订阅和充值/订阅页面。
- 视角：产品价值、开发者信息密度、演示可读性和基础可访问性。

## User goal

开发者需要在几秒内确认：接入是否简单、请求是否可追踪、成本是否透明、上游故障是否可控。

## Step health

1. 当前四宫格：需重做。结构可沿用，但 AgentPeek 的会话、权限和 Mac notch 内容与 AI 中转站不相关。
2. API 密钥：强。具备统一端点、密钥、模型分组、倍率、并发、用量、额度与状态，是最直接的产品证明。
3. 使用记录：强。具备请求数、Token、缓存 Token、消费、平均耗时、模型/分组/端点分布和趋势；浏览器截图部分区域受保护，结论同时依据可读页面结构。
4. 渠道状态：强。具备 7/15/30 天状态、OPERATIONAL 和自动刷新；当前为空态，首页演示应使用填充后的示例数据。
5. 我的订阅与充值：弱。不建议占首页四宫格位置，它们属于购买和账户管理，而不是开发者选择中转站的核心原因。

## Recommended four panels

### 1. One endpoint. Every model.

- 中文含义：一个兼容端点，接入所有模型。
- 建议副文案：Use one OpenAI-compatible API to reach leading text, code, and image models.
- 演示内容：`base_url`、一枚遮罩后的演示 Key、Python/TypeScript 请求片段、模型切换 chips，以及统一返回格式。
- 来源：API 密钥页的 API 端点、模型分组和密钥管理。

### 2. Trace every request.

- 中文含义：每个请求都能定位和解释。
- 建议副文案：Inspect status, latency, tokens, cost, retries, and the exact route behind every call.
- 演示内容：请求日志表 + 一条展开的 Trace；包含 request id、模型、HTTP 状态、TTFT、总耗时、输入/输出/缓存 Token、费用和 fallback 链路。
- 来源：使用记录页的用量明细、错误请求、模型/分组/端点过滤和 CSV 导出能力。

### 3. Know every token and dollar.

- 中文含义：Token、缓存和成本完全透明。
- 建议副文案：Track usage and spend by key, model, project, and time range—without building your own billing layer.
- 演示内容：总请求、总 Token、缓存命中、消费、平均延迟四个指标；一条 Token/费用趋势线和模型分布。
- 来源：使用记录页的汇总指标与分析图表。

### 4. Stay online when providers don’t.

- 中文含义：上游异常时，业务仍然在线。
- 建议副文案：Live provider health and automatic failover keep production traffic moving.
- 演示内容：渠道状态矩阵；显示 uptime、p95 latency、error rate、OPERATIONAL/DEGRADED，以及主渠道到备用渠道的自动切换轨迹。
- 来源：渠道状态页的时间范围、运行状态和自动刷新；自动故障转移属于基于中转站价值的建议展示方式，需要产品能力支持后再承诺。

## Recommended order

1. 左上：One endpoint. Every model.
2. 右上：Trace every request.
3. 左下：Know every token and dollar.
4. 右下：Stay online when providers don’t.

这个顺序先回答“如何接入”，再回答“如何排障、如何控费、如何保稳定”，符合专业开发者的评估路径。

## UX and accessibility notes

- 当前演示图缩得过小，真实控制台文字在首页尺寸下不可读。每张图只展示一个核心任务，不要直接截整页后台。
- 使用虚构项目、遮罩 Key 和示例金额，避免在营销素材中出现真实账户数据。
- 动画以 6–10 秒的短循环展示一次明确动作，并为 `prefers-reduced-motion` 提供静态首帧。
- 状态不能只靠红绿颜色表达，同时保留文字和图标。
- 四张图应统一使用 Sentence AI 的浅色控制台视觉，不继续套用 AgentPeek 的天空壁纸和黑色浮层。

## Evidence limits

- 使用记录页的稳定截图出现浏览器保护遮挡，但页面结构、指标名称、筛选项和图表标题可读。
- 渠道状态和我的订阅当前为空态，建议演示中的填充数据需要使用明确的虚构样例。
- 未验证键盘操作、读屏顺序和实际故障切换行为，因此不能据此声明完整无障碍或自动 failover 能力。

## Design board

- 评审板：`ai-gateway-board.html`
- 桌面预览：`captures/audit-ai-gateway/board-preview.png`
- 移动端预览：`captures/audit-ai-gateway/board-mobile-preview.png`
- 参考证据：`01-api-keys.png`、`02-usage.png`、`03-channel-status.png`

### Rendering QA

- 1440 × 900：四张卡片为 2 × 2 栅格，页面无水平溢出。
- 390 × 844：四张卡片改为单列，页面无水平溢出。
- 四张参考截图均从本地加载；浏览器控制台无错误或警告。
- 本次只新增评审板，没有修改当前首页四宫格实现。
