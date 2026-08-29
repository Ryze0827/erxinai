# WayX Console Design-to-Code Specification

版本：1.0.0  
日期：2026-08-11  
适用工程：`/Users/liwei/WebstormProjects/erxinai`  
业务参考：`/Users/liwei/GolandProjects/sub2api`

这份文档是登录后非管理员用户控制台的实现规格。它与本文件夹内 24 张 Dark/Light 页面主稿、品牌资源和插画共同构成离线设计源，不依赖 Figma。

---

## 1. 交付目标与约束

目标是重构登录后的 WayX 用户控制台，使其在 1920 × 1080 桌面基准下与已确认主稿 1:1 对齐，并具备完整 Light/Dark 主题、响应式布局和生产级交互。

必须遵守：

- 首页、登录、注册、邮箱验证和 OAuth 认证页面保持现状。
- 只重构用户控制台，不引入管理员导航、管理员字段或管理员操作。
- 可以调整前端组件架构，但不能改变现有接口的请求/响应含义、权限、认证、状态机和错误语义。
- 视觉稿里的示例数据只用于表达密度和层级；运行时必须渲染真实接口数据，不得把示例值写死。
- 先复用现有业务调用和数据整形，再重写视觉层。不要根据截图反向发明 API。
- 所有用户界面保持中英文能力；视觉主稿使用英文。默认主题为 Light，默认控制台语言为 English；继续使用已有持久化逻辑。
- 所有金额、Token、延迟、状态和权限展示必须遵循第 10 节的数据格式规则。

### 1.1 冲突时的优先级

按以下顺序处理冲突：

1. 现有后端协议、`src/api/` 以及 `sub2api` 的用户侧业务含义决定数据与行为。
2. `assets/ui/dark/overview-approved-dark-v2.png` 和 `assets/ui/light/overview-approved-light-v3.png` 决定全局外壳、Logo、侧边栏和菜单分组。
3. 对应页面的 Dark/Light 主稿决定页面内容区的布局、密度、层级和组件形态。
4. 本文档补充静态图无法表达的状态、响应式、可访问性与调用规则。
5. 当前工程只作为可复用业务逻辑和交互基础；其旧视觉不覆盖已确认主稿。

旧页面主稿中如果仍出现 `GPT Image`、旧侧边栏分组或底部 Collapse 行，一律由最新全局外壳规则覆盖。

---

## 2. 范围与视觉覆盖

### 2.1 有完整 Dark/Light 主稿的页面

| 页面 | 路由 | Dark | Light |
|---|---|---|---|
| Overview | `/admin/dashboard` | `assets/ui/dark/overview-approved-dark-v2.png` | `assets/ui/light/overview-approved-light-v3.png` |
| API Keys | `/keys` | `assets/ui/dark/api-keys-approved-dark-v1.png` | `assets/ui/light/api-keys-approved-light-v1.png` |
| Usage | `/usage` | `assets/ui/dark/usage-approved-dark-v1.png` | `assets/ui/light/usage-approved-light-v1.png` |
| Channel Status | `/monitor` | `assets/ui/dark/channel-status-approved-dark-v1.png` | `assets/ui/light/channel-status-approved-light-v1.png` |
| Add credit | `/purchase` | `assets/ui/dark/add-credit-approved-dark-v1.png` | `assets/ui/light/add-credit-approved-light-v1.png` |
| Orders | `/orders` | `assets/ui/dark/orders-approved-dark-v1.png` | `assets/ui/light/orders-approved-light-v1.png` |
| Redeem | `/redeem` | `assets/ui/dark/redeem-approved-dark-v1.png` | `assets/ui/light/redeem-approved-light-v1.png` |
| Affiliate | `/affiliate` | `assets/ui/dark/affiliate-approved-dark-v1.png` | `assets/ui/light/affiliate-approved-light-v1.png` |
| Image Studio | `/image-studio` | `assets/ui/dark/image-studio-approved-dark-v2.png` | `assets/ui/light/image-studio-approved-light-v2.png` |
| Image API Docs | `/image-api-docs` | `assets/ui/dark/image-api-docs-approved-dark-v2.png` | `assets/ui/light/image-api-docs-approved-light-v2.png` |
| Profile & Security | `/profile` | `assets/ui/dark/profile-security-approved-dark-v1.png` | `assets/ui/light/profile-security-approved-light-v1.png` |
| Subscriptions | `/subscriptions` | `assets/ui/dark/subscriptions-approved-dark-v3.png` | `assets/ui/light/subscriptions-approved-light-v1.png` |

图片文件为 1672 × 941，是 1920 × 1080 的等比 16:9 输出。实现与视觉 QA 使用 1920 × 1080 作为基准，不要把 1672px 当作 CSS 固定宽度。

### 2.2 没有独立全屏主稿的页面

以下页面保留全部现有功能并应用同一设计系统，但不能声称有逐像素页面参考：

- Batch Images：`/batch-image`，实现位于 `src/console/pages/BatchImagesPage.jsx`。
- Available Channels：`/available-channels`，实现位于 `src/console/pages/ChannelsPage.jsx`。

处理原则：复用全局外壳、Panel、Toolbar、Table/Card、Select、Modal、状态和响应式规则；不删除字段、不压缩业务流程、不自行增加 KPI。后续若补充专用主稿，再以新主稿替换内容区。

### 2.3 保留但不进入主菜单的页面

- `/subscriptions`：保留页面、路由和头部订阅入口，侧边栏隐藏。
- `/video-workflow`：保留直接访问，侧边栏隐藏；使用 `assets/illustrations/video-workflow-poster-wide.png`。
- `/payment/*`：保留二维码、Stripe、Airwallex、回调与结果状态页。
- `/custom/:id`：只允许现有安全的 Markdown 自定义页，不嵌入任意外部 URL。

---

## 3. 全局信息架构

### 3.1 侧边栏顺序

`Overview` 是全局入口，单独放在品牌区下方、所有分组标题上方。它使用更大的图标和 18px semibold 标签，不属于 `WORKSPACE`。

`WORKSPACE`：

1. API Keys
2. Batch Images
3. Usage
4. Available Channels
5. Channel Status

`ACCOUNT`：

1. Add credit
2. Orders
3. Redeem
4. Affiliate

`TOOLS`：

1. Image Studio
2. Image API Docs

分组之后是独立外链 `Erxin Member Store`，打开 `https://shop.erxin.store` 新标签。用户卡固定在侧边栏底部。Profile 只从右上角用户菜单进入。Subscriptions 不显示在侧边栏。

所有 feature flag、simple/standard run mode、可用 Batch Image key 和后端配置继续决定菜单可见性；视觉重构不能绕过当前权限判断。

### 3.2 品牌与折叠控制

- 展开态为紫蓝交叉 X 标识 + `WayX` 字标。
- 使用 `assets/brand/wayx-mark.png`；常规 UI 可使用 64/128 版本，高密度或导出使用 512/主资源。
- 字标由文本渲染，不要烘焙进 Logo 图片。Dark 为近白色，Light 为深墨色。
- Logo 与字标的完整锁定关系参照 `assets/brand/global-wayx-brand-lockup-reference-dark-v1.png` 的左上角。
- 展开态的圆角方形收缩按钮紧跟在字标右侧，处于同一行。不能放在侧边栏底部。
- 折叠态只保留 Logo mark；相同按钮切换为展开方向。
- 公共配置的 `siteLogo` 可以替换默认 mark，但不能改变锁定区几何，字标仍显示 `WayX`。
- 公共品牌未解析时品牌区保持空白，不能先闪出默认 Logo。

### 3.3 Header

Header 是每条控制台路由唯一的页面标题。内容区不得再重复同名 H1 或副标题。

桌面从左到右：

- 当前页面标题。
- 中间偏右的公告胶囊，固定文本：`GPT分组按充值金额，调低倍率/开通专线，详情见历史公告`。
- `Getting started`。
- `Docs`，仅在后端提供安全文档 URL 时显示。
- 公告/通知入口。
- 余额 `$0.00`。
- 用户入口。

语言和主题切换必须保留，可合并进用户菜单以保持主稿的克制外观。订阅活跃数量可在现有头部订阅胶囊中显示并跳转 `/subscriptions`。

公告胶囊使用淡橙语义但低饱和，不抢占主标题；内容成功返回 `null` 或非数组时按空列表处理。公告预览和详情保留真实与转义换行；点击外部关闭弹层，内部交互不关闭。

### 3.4 Getting started Spotlight

它是四步真实聚光引导，不是静态帮助弹窗：

1. 高亮侧边栏 Add credit，不导航。
2. 高亮 API Keys。
3. 导航 `/keys` 后高亮 `New key`。
4. 高亮 `Use key`。

移动端在前两步自动打开抽屉，在 Key 页面步骤前关闭抽屉。步骤只在内存保持；刷新即退出。路由切换期间找不到目标时隐藏 spotlight 和 coachmark，不能闪到页面角落。

---

## 4. 视觉系统

### 4.1 设计原则

- Calm and operational：像稳定的专业控制台，不像营销页。
- Low color fatigue：中性色为主，每个主题只有一个主要交互色。
- Data first：数字与单位形成强弱对比，但不把每个值都染色。
- Compact, not cramped：高密度但保持清晰列轨和 8px 基础节奏。
- Real glass：只有顶层容器使用 backdrop blur；嵌套控件使用半透明填充，避免滚动时 compositor 卡顿。
- Semantic color only：绿色、琥珀、红色只承担成功/健康、警告、错误含义；品牌紫不代表业务状态。

### 4.2 主题 Token 基线

以下是实现起点。完成后必须以相同视口截图校准，不能因为 token 已配置就跳过视觉比对。

```css
:root[data-console-theme="dark"] {
  --wx-bg: #06111d;
  --wx-bg-deep: #030b14;
  --wx-surface: rgba(10, 25, 40, .72);
  --wx-surface-raised: rgba(13, 29, 45, .84);
  --wx-surface-subtle: rgba(16, 33, 49, .58);
  --wx-border: rgba(144, 166, 188, .22);
  --wx-border-strong: rgba(165, 184, 204, .36);
  --wx-text: #f5f7fb;
  --wx-text-secondary: #c3ccd8;
  --wx-text-muted: #8e9aaa;
  --wx-accent: #8b7cf6;
  --wx-accent-strong: #a091ff;
  --wx-accent-soft: rgba(119, 105, 240, .17);
  --wx-primary: #58df82;
  --wx-primary-hover: #6bea91;
  --wx-success: #54d783;
  --wx-warning: #f1b53e;
  --wx-danger: #ef625f;
  --wx-info: #4ca9ef;
  --wx-focus: rgba(139, 124, 246, .44);
}

:root[data-console-theme="light"] {
  --wx-bg: #f4f8fc;
  --wx-bg-deep: #eef4fa;
  --wx-surface: rgba(255, 255, 255, .72);
  --wx-surface-raised: rgba(255, 255, 255, .90);
  --wx-surface-subtle: rgba(244, 249, 254, .75);
  --wx-border: rgba(65, 91, 123, .18);
  --wx-border-strong: rgba(56, 83, 116, .30);
  --wx-text: #0b1730;
  --wx-text-secondary: #33445f;
  --wx-text-muted: #68778f;
  --wx-accent: #1477e6;
  --wx-accent-strong: #0868d4;
  --wx-accent-soft: rgba(20, 119, 230, .10);
  --wx-primary: #4fdc7b;
  --wx-primary-hover: #42cd6d;
  --wx-success: #23ae51;
  --wx-warning: #d88a14;
  --wx-danger: #d9485f;
  --wx-info: #238bd7;
  --wx-focus: rgba(20, 119, 230, .34);
}
```

Light 主题不能以紫色为主要交互色。紫色只保留在 WayX Logo 和必要的次要数据系列；导航、Tab、焦点、分页和图表主系列统一使用 ocean blue/cyan/teal。

### 4.3 背景与玻璃

- Light 默认允许纯白、首页 fluted scene 和 warm ivory doodle 三种背景。
- Dark 只使用同一 scene 的压暗、低饱和处理。
- 背景资源位于 `assets/backgrounds/`。
- 顶层 Panel 使用 1px 金属感边框、轻微内高光和主题适配阴影。
- Panel 的默认圆角 10–12px；按钮/输入 8px；Badge 6px 或完整胶囊。
- 不在 Panel 内的每一层重复 backdrop-filter。顶层建议 18–24px blur，嵌套层只用 translucent fill。
- 全局玻璃透明度控制继续驱动 `--console-surface-alpha` 等现有变量。百分比越高，露出的背景越多。
- 公告面板比基础玻璃少透明 30 个百分点，并在更不透明一端 clamp，确保文字可读。
- 充值、监控等页面的所有顶层和嵌套玻璃填充都要从全局透明度变量派生，不能硬编码一个不受控的不透明背景。

### 4.4 字体与数字

```css
--wx-font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
  "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
--wx-font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
  "Liberation Mono", monospace;
```

- 文档根节点统一 `font-variant-numeric: tabular-nums`。
- 普通正文、中文、标题和多数数字使用系统 Sans。
- Endpoint、API key、Order number、IP、代码和明确的机器数据使用系统 Mono。
- 页面标题 18–20px/600；卡片标题 16–18px/600；正文 14px；metadata 12–13px。
- 主指标 28–36px/600；单位紧邻但缩小到 13–16px/600，并使用 accent 或 secondary color。
- 不要使用全大写长标题；分组标签可使用 11–12px uppercase 与较宽字距。

### 4.5 间距与组件尺寸

使用 4px 子网格、8px 主节奏。

| Token | 值 | 用途 |
|---|---:|---|
| `space-1` | 4px | 图标微调、紧凑标签 |
| `space-2` | 8px | 内联元素、Badge |
| `space-3` | 12px | 控件内部、紧凑 gutter |
| `space-4` | 16px | 卡片内部小间距 |
| `space-5` | 20px | 标准卡片 padding |
| `space-6` | 24px | 大卡片区块 |
| `space-8` | 32px | 桌面段落或首层留白 |

常规输入/按钮高度 40–42px；紧凑工具条控件 36–38px；侧边栏普通导航行 42–44px；Overview 导航行 46px。可点击目标最小 40 × 40px，移动端最小 44 × 44px。

### 4.6 图标

- 使用统一 outline icon language：1.75–2px stroke、round cap、round join。
- 优先复用工程图标注册表；交付副本在 `reference/source/Icon.jsx`。
- Provider 使用可辨识平台标识和其品牌色；业务动作和表格操作保持单色。
- 不使用 emoji、文本符号或临时 CSS 图形替代图标。
- Usage Token 必须同时有图标与 `IN`、`OUT`、`READ`、`WRITE` 标签，不能只用彩色点。

### 4.7 Motion

- 控件 hover/focus 120–160ms；Popover/Modal 160–200ms；侧边栏 220ms，`cubic-bezier(.2,.76,.25,1)`。
- 侧边栏桌面折叠通过固定宽度 shell + clipping + workspace compositor transform 完成，不能逐帧动画 width 或 left。
- 表格 hover/selection 使用单个 compositor overlay 跟随行，避免每行背景重绘。
- Auto refresh 开启时图标持续旋转，暂停时停止。
- `prefers-reduced-motion: reduce` 下关闭非必要运动；状态和内容仍完整显示。

---

## 5. 外壳与响应式

### 5.1 桌面基准

- 基准视口：1920 × 1080。
- 展开侧边栏目标宽度约 286–288px；折叠 rail 76–80px。
- Header 与品牌行保持同一视觉高度，约 72–80px；公告行约 36–40px。
- Console workspace 使用可用宽度，不再居中为窄后台列。
- Shell core main 使用 12px 水平 gutter 和 20px 底部 gutter；页面首个 Panel 内部按主稿保留自己的 20–24px padding。
- Header sticky；页面滚动只发生在 workspace。Image Studio 等专用工作台可使用内部滚动区。
- 1920px 下主要内容不得产生页面级水平滚动。

### 5.2 Breakpoints

- `>= 1440px`：完整桌面排版，严格匹配主稿列数。
- `981–1439px`：保留桌面侧边栏；压缩 gap 和次要 metadata，必要时让复杂页面从 3 列变 2 列。
- `<= 980px`：侧边栏变为覆盖式 drawer；workspace 不保留固定左偏移。
- `<= 760px`：统计卡、表单、Master/Detail 和图表纵向堆叠；工具条可换行。
- `<= 440px`：去除非必要装饰和大留白，保持 16px 页面边距与 44px 点击目标。

表格在移动端使用页面已有 card anatomy，而不是把整个桌面表格缩小到不可读。桌面 API Keys 仍保持原来的非 pinned、非专用内部横向滚动布局。

### 5.3 状态稳定性

- Loading skeleton 必须复用最终组件网格、尺寸、padding 和内部结构，异步完成后不能发生大幅 layout shift。
- Dashboard 背景刷新时保留现有图表和卡片，只在 Refresh 控件上显示进度。
- 请求被新的筛选/日期操作替代时使用 `AbortController` 取消旧请求，防止旧响应覆盖新状态。
- Empty、Error、Unauthorized、Feature disabled 和 Network retry 都要使用共享状态语言。

---

## 6. 共享组件规格

### 6.1 Buttons

- Primary：实心 fluorescent green，Dark/Light 都不被通用 glass button 覆盖。文字使用深墨色。
- Secondary：透明/玻璃表面 + 金属边框，active 使用主题 accent。
- Destructive：默认低饱和红色文字/边框，确认态才增强红色。
- Icon button：40px 方形，必须有 `aria-label` 和 tooltip。
- Disabled：降低 opacity，但仍保持文字可读；禁用时不响应 hover。

### 6.2 Inputs 与 Select

- 输入高度稳定，输入前后不得跳高。
- Focus 使用单层主题 focus ring；Light 蓝色、Dark indigo。筛选搜索不得出现额外紫色 inner ring。
- Select 使用自定义 glass trigger + portal menu；支持 click-outside、Escape、方向键、Enter、viewport-aware placement。
- 长列表才显示搜索；短列表不增加无意义搜索框。
- 选择 API group 时平台颜色填满整个 trigger，包括 chevron 区；不要只留下一个小色 pill。

### 6.3 Tooltip、Popover、Modal

- Tooltip 立即或在 100ms 内出现，不能依赖浏览器原生 `title` 延迟。
- 数据 tooltip 采用 12–14px 文本、8–12px padding、8px radius、清晰边框和更不透明玻璃。
- Popover 支持 hover 与键盘 focus，指针可进入内容；离开触发器和内容后关闭。
- Modal 有 focus trap、Escape 关闭、恢复触发焦点和 body scroll lock。
- 破坏性操作要求明确确认；非破坏性详情不应使用 Modal 阻塞。

### 6.4 Tables

- 表头 12–13px，正文 13–14px，行高 56–72px 取决于数据密度。
- 数字和金额右对齐；状态和名称左对齐；代码型字段 Mono。
- Sort control 同时表达字段与方向，保留 `aria-sort`。
- Row hover 只增强边界/overlay，不改变列宽或行高。
- Pagination 紧凑，显示总数、page size、当前页、相邻页和前后控制。

### 6.5 Charts

- 图表使用真实 accessible labels、keyboard-focusable data point/segment 和自定义 tooltip。
- Dark 主系列为 indigo/violet；Light 主系列为 ocean blue/cyan。
- 网格线和坐标为中性低对比，不能使用多种装饰色。
- Tooltip 显示完整日期、原始单位和业务含义；不要只显示缩写值。

---

## 7. 页面实现规格

## 7.1 Overview

视觉主稿：Overview Dark v2 / Light v3。

页面层级：

1. Greeting、日期、今日实际成本相对标准成本的节省说明。
2. 右侧五个 Quick actions：Create API key、Inspect usage、Add credit、Generate images、Redeem。
3. 一行紧凑指标：Throughput、Average duration、TPM、Today's requests、Today's tokens、Today's actual spend、Standard cost / Saved。
4. Token usage 折线/面积图。
5. Model distribution donut + 表格。
6. 跨全宽的六个月 Token heatmap。

规则：

- 只有 Today's requests、Today's tokens、Today's actual spend 显示相对昨日/昨日同一时刻的升降对比标识。
- Throughput、Average duration 和 TPM 不显示升降 pill。
- Today's actual spend 是实际成本；右侧同时给出 standard cost 与 saved percentage。
- Spend 主值显示四位小数，颜色与 TPM 使用同一主题 accent。
- Throughput 主值为整数 RPM，TPM 在其独立格中使用 `M`。
- Token usage y 轴标题/量纲为 `Token (M)`；用户侧所有百万 Token 统一 `M`。
- Quick action `Generate images` 直达 `/image-studio`；Redeem 是最后一项。
- Model donut 每个 segment hover/focus 立即显示 model、requests、Token、actual cost。
- Heatmap 每个周列固定七个点，按 Mon–Sun；展示最新独立六个月，不跟随上方日期筛选。
- Heatmap tooltip 显示 exact date、Token、requests、actual cost；用自定义 tooltip，不用 `title`。
- 每个可见月份都标注，并显示该月总 Token。
- 不加入 Active keys、Available balance、Token breakdown、platform distribution、platform quota 或 recent request table。
- Dashboard 的日期范围只刷新 Token usage 和 Model distribution；Refresh 为后台刷新，不卸载图表。

## 7.2 API Keys

视觉主稿：API Keys Dark/Light v1。

顶部 Endpoint 区必须支持多个端点：

- 桌面 2 × 2，示例标签为 `Default`、`Route 1`、`Route 2`、`Route 3`。
- 标签来自配置，不按 Group、Model、Platform 或能力命名。
- URL 后立刻跟 Copy 和 Latency test，不能把操作放到卡片远端。
- URL 使用 Mono，可截断但必须支持完整复制和 tooltip。
- 配置只有一个或两个时自然收缩；不能用写死四项的空卡占位。

Keys 主表保留现有完整层级：filter/search、column controls、sorting、pagination、create/edit dialogs、group select、daily usage 和 Use key 引导。

- 主要操作为 solid green `New key`。
- Masked key capsule 使用半透明 warm-yellow glass，不使用黑色。
- Name 列保持舒适左 inset；Group 到 Concurrency 紧凑；Concurrency、Usage、Expiry、Status、Created 为一个稳定视觉组。
- Action header 左对齐，行内 actions 右对齐。
- Actions 不显示 usage-detail icon；顺序含 `Use key`、Edit、Enable/Disable 和其余合法动作。`Use key` 使用浅绿强调。
- 折扣 group 显示原倍率删除线 + 强调后的有效倍率；未折扣只显示有效倍率。
- Group options 不虚构 `User API group` 描述，不显示 peak multiplier；有效倍率靠最右。
- `Other clients` 是非选择型说明，提示按客户端官方文档配置 API URL 与 key。
- Codex 两文件配置采用 Image Studio 的橙色提醒：完整替换两个文件；没有 `auth.json` 时手动创建。
- Desktop 不新增 pinned column 或专门内部横向滚动；Mobile 转为卡片。

## 7.3 Usage

视觉主稿：Usage Dark/Light v1。业务语义以 `sub2api` 和现有 Usage API 为准。

顶部保留日期范围、Refresh、Columns、Export CSV 和四个摘要指标。摘要 Token 内显示 Input/Output/Cache 等真实分项；实际成本与平均耗时保持清晰。

筛选至少保留 API key、Model、Group、Type、Billing source、Billing mode 以及当前工程已支持的筛选。筛选区允许两行稳定排布，不能因选项长度导致控件跳动。

记录表的优先级：

1. FT（首 Token 延迟）。
2. User billed cost。
3. Token breakdown。
4. Total duration 与 standard/original cost 为次要信息。

Token 列：

- 固定使用 outline icon + `IN`、`OUT`、`READ`、`WRITE`。
- 每项显示绝对数量；总 Token 单独汇总。
- 不使用无标签彩色点或百分比作为唯一解释。

Latency 列：

- 表头写 `FT / Total`，每行不重复标签。
- FT `<= 5s` 为绿色，`> 5s && <= 10s` 为琥珀，`> 10s` 为红色。
- Total 为中性 secondary text。

Cost 列：

- 用户实付使用绿色，固定六位小数。
- Info control 打开锚定 smoke-glass breakdown，不改变行高。
- Breakdown 包含接口真实可提供的 input、output、image、cache cost，per-million Token 或 per-request/image price、service tier、rate、original cost、user charge。
- 不展示管理员 account rate、channel account 或其他管理员字段。

其余：

- Usage records 与 Error requests 保持两个 Tab，错误数量 badge 可见。
- Error detail 保留 request/error 语义和现有详情。
- 右侧保留 Model distribution 与 Group distribution，可切 Tokens/Spend。
- Usage 页面不再重复 Token usage trend，不显示 endpoint distribution。
- Export CSV 使用当前筛选和排序导出真实全量页；导出期间禁用按钮并显示进度。
- Request types 完整本地化：EN 为 Stream、Sync、WebSocket、Cyber、Unknown；ZH 为 流式、同步、WebSocket、Cyber、未知。
- Token billing：EN `Token`，ZH `按量`。

## 7.4 Channel Status

视觉主稿：Channel Status Dark/Light v1，采用已选定的 Route Inspector master-detail。

页面组成：

1. 一行范围、状态、搜索、Auto refresh、Refresh 工具条。
2. 五个 overview metrics。
3. 左侧可扩展 Channel master list。
4. 右侧 selected-channel diagnostic inspector。

Master list 行显示 provider/model、当前状态、latency、availability、最近检查和 48 点微型历史。选中行用主题 accent 边框/填充，不改变尺寸。

Inspector 显示：

- Channel/provider/model identity、status、checked time、详情入口。
- Latency、Ping、7-day availability。
- 48-point Status history，tooltip 包含时间、status、latency。
- 7/15/30-day availability。
- Per-model 7/15/30-day availability 与 average latency。

状态规则：

- Healthy：最高绿色 bar。
- Warning：中高琥珀 bar。
- Incident：最短红色 bar。
- Unknown：灰色并有文字标签。
- Latency 与 Ping 统一毫秒；average latency `<= 5000ms` 绿色，只有 `> 5000ms` 才红色。
- 不只靠颜色表达状态；图标、文本和高度同时区分。
- Manual refresh 使用现有 monitor 请求，loading 时禁用并旋转图标。
- Auto refresh 运行时图标持续旋转，暂停时停止；遵循 reduced motion。
- Loading 显示 overview skeleton + 一组 master/detail skeleton，几何与最终内容一致。

## 7.5 Add credit

视觉主稿：Add credit Dark/Light v1。

桌面为单屏三阶段 Checkout Runway：Amount、Payment、Review 同时可见。上方保留 Add balance / Subscription tabs 和全宽 account overview。

- Account overview 左侧为钱包图标、Available balance、账户；右侧为真实 Total recharged、Total spent、Latest recharge。
- 可用数据来自现有 order/usage API；拿不到时显示明确 `—`，不能省略或虚构。
- 最右使用 `assets/illustrations/purchase-wallet-stack.png`。Dark 保留 emerald glow；Light 降低发光与不透明度。
- Amount 为 4 × 2 USD presets：`$10`、`$20`、`$50`、`$100`、`$200`、`$500`、`$1,000`、`$2,000`，加 Custom USD 输入。
- Custom input 只使用容器绿色 focus，不叠加全局紫/蓝 inner ring。
- Payment methods 纵向排列，保留后端 display name 和识别度高的 provider mark；只显示 selection indicator，不加 dropdown chevron。
- Review 在 `Credit to add` 下一行显示动态会员 bonus：tier、percentage、credited USD。
- 只有接口真实提供 bonus 时显示；bonus 加入 projected balance，但不改变购买金额或应付金额。
- 不在其他位置显示折扣、虚构汇率、手续费或 CNY 换算。
- RMB 只出现在最终确认按钮；按钮为全宽 solid green。
- 所有 USD 使用窄 `$` 与两位小数。
- 安全说明、支付启动、恢复、轮询、取消与结果流程保持现状。

## 7.6 Orders

视觉主稿：Orders Dark/Light v1。

使用高密度 Audit Ledger：紧凑状态筛选、Refresh、六列表格和分页。

固定列：Order number、Amount、Payment method、Status、Date、Actions。

- 不添加 Order type、KPI cards、search、date range、export 或管理员/provider 内部字段。
- Order number 使用 Mono；Amount 右对齐，窄 `$`、两位小数。
- Payment method 保留 provider mark 与名称。
- Status 同时使用文字与颜色。
- Pending 可 Cancel；只有 eligible completed order 可 Request refund；只读行不虚构 action。
- 状态筛选仅 Pending、Completed、Failed、Refunded，保持紧凑宽度。
- Refund dialog 保留原因字段、资格判断和现有错误处理。

## 7.7 Redeem

视觉主稿：Redeem Dark/Light v1。

顶部是全宽 account summary。下方左侧为 Redemption Dock，右侧为主导的 chronological activity timeline。

- 左侧包含 code field、单个 primary Redeem action、single-use/immediate-application 提示、四种 benefit type、support access 和 gift artwork。
- 使用 `redeem-gift-dark/light.png` 与 `redeem-wallet-dark/light.png`，按主题切换。
- 兑换成功可能返回 signed value、message、new balance、new concurrency；按存在字段展示，不假定固定结构。
- History 能表达 balance、concurrency、subscription、trial，也能表达管理员余额/并发调整。
- Activity 每项显示 timestamp、code、event description、optional group context、signed benefit。
- 图标和标签必须让正负/类型不依赖颜色。

## 7.8 Affiliate

视觉主稿：Affiliate Dark/Light v1。

左侧 settlement rail 强调 Available/Cleared rebate 与 Transfer all；右侧上方为 invite workflow，下方为 invited-user ledger。

只显示接口已有：invited count、available rebate、frozen/pending rebate、lifetime rebate、effective percentage、invite code/link、invitee email、username、join date、lifetime rebate。

- Code 与 Link 各自紧跟 Copy。
- Transfer 始终把全部 available rebate 转入 balance，没有金额输入。
- 不增加 charts、trend、tier、conversion、payout account、cash withdrawal、partial transfer、history、invite status、ranking、campaign 或 social share。

## 7.9 Image Studio

视觉主稿：Image Studio Dark/Light v2。

采用 result-first Canvas Workbench：左侧结果舞台占主要宽度，右侧为固定 next-iteration workbench。

左侧：当前生成结果、用户 prompt/reference context、紧凑 current-session rail。右侧字段：API key、model、quality/size、count、aspect、references、prompt、recent results、Generate/Continue editing。

必须保留：

- 只显示 active、image-enabled 且平台为 OpenAI/Gemini/Antigravity、group name 包含 `生图` 的 key。
- 无合格 key 时提示创建 `生图` group key，并禁用所有 generation action。
- OpenAI/Gemini/Antigravity presets 与推荐模型。
- 1K/2K/4K、支持的 count/aspect values。
- PNG/JPEG/WebP reference 验证，最多 16 张；file picker 与 clipboard image paste 进入同一流程。
- 普通文字粘贴行为不变；每张 reference 可单独删除。
- Continue editing 后，提交过的 reference thumbnails 保留在对应 user turn。
- Recent results 选择最近三张之一作为下一轮 reference。
- Preview、Download、Pending、Error、Abort、当前 session 迭代。
- 离开页面即丢弃 history 和 images 的提醒固定在配置卡底部。

不添加 project save、folder、template、style library、credit/cost、queue、seed、negative prompt、layer/mask editor、social publishing、favorite 或管理员字段。

Pending 状态在方形舞台中居中 13 × 13 dot matrix。动画簇沿外围 clockwise 运动：top-left → top-right → bottom-right → bottom-left → top-left；不是从中心辐射。Reduced motion 下保留矩阵但不运动。

## 7.10 Image API Docs

视觉主稿：Image API Docs Dark/Light v2。

页面是 task-first Integration Runbook。顶部只有 Generate/Edit 互斥开关；内容按 Endpoint & authentication → Build the request → Handle the response 三阶段展开。

Generate：

- `POST /v1/images/generations`
- JSON body
- `gpt-image-2`、`prompt`、`size`、可选 `n`

Edit：

- `POST /v1/images/edits`
- `multipart/form-data`
- 一至十六张 reference 使用重复 `image[]`
- 可选 `size`、`n` 和支持的 `mask`

两个模式的 overview、navigation、auth、parameters、examples、response 和 errors 不能混在同一内容状态。

- cURL、Python、JavaScript tabs 互斥。
- Endpoint 和 code block 都有紧邻 Copy。
- 只做文档，不添加 fake runner、API key input、live console 或执行状态。
- Response 覆盖 URL 与 `b64_json`；Errors 覆盖现有 400、401、429、500/502/504 含义。

## 7.11 Profile & Security

视觉主稿：Profile & Security Dark/Light v1。

左侧固定 identity/profile rail；右侧 trust workspace 包含 account protection、sign-in methods、password 和条件显示的 balance notification。

保留：

- Display name、avatar URL/local upload 和浏览器侧头像预处理。
- Email、LinuxDo、DingTalk、OIDC、WeChat 动态绑定状态与允许的 bind/unbind。
- Password validation 与 change password。
- TOTP status/setup/enable/disable 和对应验证方式。
- Feature-gated balance threshold 与 verified notification email 管理。

Profile 只从右上用户菜单进入，不添加侧边栏菜单。不要发明 device/session history、passkeys、recovery codes、phone、account deletion、audit history、password timestamp、security score 或管理员字段。

## 7.12 Subscriptions

视觉主稿：Subscriptions Dark v3 / Light v1。

采用 full-width Comparative Quota Ledger，不使用旧 master-detail 卡片。列：Plan、Status、Expires、Rate、Daily、Weekly、Monthly、Action。

- 每个 quota cell 直接显示 used/limit、percentage、progress、reset countdown，不依赖 hover。
- 支持多 subscription、group/platform identity、description、active/expired/revoked/suspended、expiry/no expiration、billing multiplier。
- Daily/weekly/monthly 支持 remaining、unlimited 和 window-not-active。
- 顶部 summary 显示 active count 与 total used。
- 只有支付与 group eligibility 允许时 Renew 才跳转 `/purchase?tab=subscription&group=…`。
- 页面保持 sidebar-hidden，可通过 active subscription header pill 或直接 URL 进入。
- 不添加 cancel、pause、upgrade/downgrade、auto-renew、price、next charge、invoice、payment method、trial、assignment、IDs、provider account 或管理员 action。

---

## 8. API 调用与业务协议

### 8.1 通用 Client

源文件：`src/api/client.js`。

- 默认 API base：`/api/v1`，可由 `VITE_API_BASE_URL` 覆盖。
- 非本地环境外部 API 必须 HTTPS；禁止 protocol-relative URL。
- JSON 响应可为直接 payload，也可为 `{ code, data }` envelope；`code === 0` 才成功。
- 认证请求发送 `Authorization: Bearer <access token>`、`credentials: include`、`Accept-Language`。
- GET 自动附带浏览器 timezone，已有 timezone 时不覆盖。
- 401 且存在 refresh token 时只进行一次共享 refresh，再重试原请求；失败清理 session。
- 默认 timeout 60s；图片生成 300s；批量大文件 10min。
- Gateway 请求使用 API key Bearer、`credentials: omit`，不携带登录 cookie。
- 用户切换语言后所有请求继续发送当前 `Accept-Language`。
- 不在浏览器重新定义后端业务规则；安全校验 fail-closed。

### 8.2 页面/API 映射

| 页面/能力 | 方法与路径 | 用途 |
|---|---|---|
| Overview | `GET /usage/dashboard/stats` | 今日/累计摘要 |
| Overview | `GET /usage/dashboard/models` | Model distribution |
| Overview | `GET /usage/dashboard/trend` | Token trend 与独立六个月 heatmap 数据 |
| API Keys | `GET /keys` | 分页、筛选、排序 |
| API Keys | `GET /keys/:id` | 单 key 详情 |
| API Keys | `POST /keys` | 新建 |
| API Keys | `PUT /keys/:id` | 编辑、启停、group 变更 |
| API Keys | `DELETE /keys/:id` | 删除 |
| API Keys | `GET /groups/available` | 可选 group |
| API Keys | `GET /groups/rates` | 倍率/折扣显示 |
| API Keys | `POST /usage/dashboard/api-keys-usage` | 多 key 用量摘要 |
| API Keys | `GET /user/api-keys/:id/usage/daily` | 单 key 30 天趋势 |
| Usage | `GET /usage` | 使用记录分页/筛选/排序 |
| Usage | `GET /usage/:id` | 记录详情 |
| Usage | `GET /usage/stats` | 摘要统计 |
| Usage | `GET /usage/errors` | 错误记录 |
| Usage | `GET /usage/errors/:id` | 错误详情 |
| Usage | `GET /usage/dashboard/models` | 模型分布 |
| Usage | `GET /usage/dashboard/snapshot-v2` | 分组/图表快照 |
| Available Channels | `GET /channels/available` | 用户可见渠道 |
| Channel Status | `GET /channel-monitors` | 监控列表与基础状态 |
| Channel Status | `GET /channel-monitors/:id/status` | 单渠道 48 点、窗口和模型详情 |
| Add credit | `GET /payment/checkout-info` | 支付方法、限制与 checkout 配置 |
| Add credit | `POST /payment/orders` | 创建支付订单 |
| Add credit | `GET /payment/orders/my` | 累计充值与充值记录 |
| Add credit | `GET /usage/dashboard/stats` | 累计消耗数据 |
| Orders | `GET /payment/orders/my` | 用户订单分页/状态筛选 |
| Orders | `GET /payment/orders/refund-eligible-providers` | 可退款 provider |
| Orders | `POST /payment/orders/:id/cancel` | 取消 pending 订单 |
| Orders | `POST /payment/orders/:id/refund-request` | 提交退款原因 |
| Payment flow | `GET /payment/orders/:id` | 订单轮询/详情 |
| Payment flow | `POST /payment/orders/verify` | 登录态验证 |
| Payment flow | `POST /payment/public/orders/verify` | 公开结果验证 |
| Payment flow | `POST /payment/public/orders/resolve` | resume token 恢复 |
| Redeem | `POST /redeem` | 提交 `{ code }` |
| Redeem | `GET /redeem/history` | 历史/调整活动 |
| Affiliate | `GET /user/aff` | 邀请与返利数据 |
| Affiliate | `POST /user/aff/transfer` | 全额转余额 |
| Profile | `GET /user/profile` | 用户资料 |
| Profile | `PUT /user` | 用户名、头像、余额通知配置 |
| Profile | `PUT /user/password` | 旧/新密码 |
| Profile | `/user/account-bindings/*` | Email 与其他身份绑定/解绑 |
| Profile | `/user/notify-email/*` | 通知邮箱发送、验证、启停、删除 |
| Profile | `/user/totp/*` | TOTP 状态、验证方式、设置、启停 |
| Subscriptions | `GET /subscriptions` | 订阅列表 |
| Subscriptions | `GET /subscriptions/active` | 活跃订阅 |
| Subscriptions | `GET /subscriptions/progress` | quota windows |
| Subscriptions | `GET /subscriptions/summary` | header/overview summary |
| Announcements | `GET /announcements` | 列表，可选 unread filter |
| Announcements | `POST /announcements/:id/read` | 标记已读 |

所有上表路径都会由 `apiRequest` 自动拼接 `/api/v1`。不要在页面层重复拼 base URL。

### 8.3 Image Studio Gateway

源文件：`src/api/images.js`。

- Development：同源 Vite `/image-api` proxy。
- Production 默认：`https://image.aiwayxx.com`，可由 `VITE_IMAGE_GATEWAY_BASE_URL` 覆盖，但非本地必须 HTTPS。
- OpenAI generation：`POST /v1/images/generations`，JSON。
- OpenAI edit：`POST /v1/images/edits`，multipart；一张 reference 使用 `image`，多张使用重复 `image[]`。
- Gemini：`POST /v1beta/models/:model:generateContent`。
- Antigravity：`POST /antigravity/v1beta/models/:model:generateContent`。
- 结果支持 OpenAI `url`/`b64_json` 与 Gemini inline image/text。
- 生成过程不得把 key 发到非配置网关；错误、Abort 和 timeout 继续使用共享语义。

### 8.4 Batch Images Gateway

源文件：`src/api/batchImages.js`。

- `POST/GET /v1/images/batches`
- `GET/DELETE /v1/images/batches/:id`
- `GET /v1/images/batches/:id/items`
- `GET /v1/images/batches/:id/items/:customId/content`
- `POST /v1/images/batches/:id/cancel`
- `GET /v1/images/batches/:id/download`
- `GET /v1/images/batches/models`

保留 Idempotency-Key、cursor/offset 分页、取消、失败项重试、内容下载与 10 分钟大文件 timeout。

---

## 9. UX 与交互状态

### 9.1 请求状态

- 首次加载：页面骨架与最终布局同构。
- Background refresh：保留旧数据，Refresh 控件表达进度。
- Empty：解释为什么为空并给出一个合法下一步，不虚构权限外操作。
- Error：显示清洗后的后端消息或通用网络错误；保留 Retry。
- Abort：用户切换筛选产生的取消不展示错误 toast。
- Mutations：提交按钮 disabled + spinner；成功后局部或后台 refresh，避免整页闪烁。

### 9.2 表单与危险操作

- Save/Confirm 只在输入有效且发生变化时可用。
- 删除 key、取消订单、退款、解绑身份、关闭 TOTP 等使用明确确认。
- 输入错误显示在字段附近；toast 只做全局结果摘要。
- Payment 外跳前保存已有恢复快照，返回后继续现有轮询/验证流程。

### 9.3 Hover 与键盘

- Heatmap、donut、Token/cost breakdown 同时支持 pointer hover 和 keyboard focus。
- Tooltip 触发器具有可读 `aria-label`；Escape 可关闭。
- 自定义 Select、Tab、Menu、Pagination 和 Table sort 全部可键盘操作。
- Focus indicator 在 Light/Dark 都达到可见对比，不能被 `outline: none` 静默移除。

### 9.4 Sidebar

- Desktop 折叠选择持久化。
- Mobile 使用 drawer；打开时锁 body scroll，点击 overlay 或 Escape 关闭。
- 展开侧边栏在用户卡上方保留背景 swatches 与 glass transparency；折叠 rail 隐藏这些控件。
- Light swatches 顺序：White、Scene、Doodle；Dark 只有 Scene。
- Selected swatch 右上角有圆形缺口并嵌入 check badge，视觉大小约 27px。

---

## 10. 数据格式与颜色语义

### 10.1 金额

- 所有 USD 使用窄 `$`，不得由 locale 输出 `US$`。
- 普通 balance、cost、order、quota 显示两位小数。
- Dashboard Today's actual spend 显示四位小数。
- Usage record user cost 显示六位小数。
- Add credit 的 CNY 只显示在最终确认按钮。
- 缺失金额显示 `—`，不显示 `$0.00` 伪装成真实数据。

### 10.2 Token 与请求

- 百万 Token 统一 `M`，如 `38.72M`；图表单位 `Token (M)`。
- 表格精确 Token 使用 locale grouping，如 `12,348`。
- Request count 使用 grouping，不使用无说明的 `K`，除非设计空间明确需要并提供 tooltip。
- Heatmap 一列固定七天。

### 10.3 时间与延迟

- Monitor latency、Ping 均为 ms。
- Monitor average latency 只有 `> 5000ms` 为红。
- Usage FT `<= 5s` 绿、`<= 10s` 琥珀、`> 10s` 红。
- 时间展示使用用户 locale/timezone；API 查询继续发送 timezone。

### 10.4 升降标识

- Overview 只在 Requests、Tokens、Spend 显示。
- 上升使用斜向上箭头，下降使用斜向下箭头，并显示 signed percentage。
- 请求/Token 上升使用主题 accent；Spend 下降/节省为绿色。
- 颜色不能是唯一信息，箭头和正负号必须保留。

### 10.5 状态

- Success/Healthy/Active：green。
- Warning/Pending：amber。
- Error/Incident/Failed/Revoked：red。
- Unknown/Disabled/Expired：neutral gray，具体标签决定含义。
- Provider identity color 只标识 provider，不代表状态。

---

## 11. 安全、隐私与可访问性

- 生产 API、支付和图片网关只允许 HTTPS；loopback development 例外。
- 不把 access token、refresh token、API key、支付恢复 token 写入日志、URL 或错误详情。
- API key 默认 masked；只有现有授权流程允许时才复制完整值。
- 上传 reference image 前校验 MIME、文件签名、扩展名、大小和数量；只支持 PNG/JPEG/WebP。
- 自定义 Markdown 必须 sanitize；不执行 HTML、脚本或任意 embed。
- 图片下载 URL 和外链经过现有 safe URL 处理。
- 文字与背景满足 WCAG AA；小字至少 4.5:1，重要图标/边界至少 3:1。
- 状态不只靠颜色；所有 form control 有 label；icon button 有 accessible name。
- Modal focus trap、返回焦点；动态 toast 使用合适 live region。
- 图表提供可访问名称和键盘可达的数据点；reduced motion 不丢失信息。

---

## 12. 推荐前端架构

在保留 React/Vite/React Router 和现有 API modules 的前提下，建议按层重构：

```text
src/console/
  shell/
    ConsoleShell.jsx
    Sidebar.jsx
    ConsoleHeader.jsx
  components/
    actions/
    charts/
    data-display/
    feedback/
    forms/
    overlays/
  pages/
  hooks/
  theme/
    tokens.css
    surfaces.css
    themes.js
```

不要求为了目录而一次性搬迁所有文件。先建立 token 与稳定 primitives，再逐页迁移；每一步保持路由可运行。

共享组件最低集合：Panel、Toolbar、Button、IconButton、TextInput、NumberInput、SearchSelect、CompactTabs、StatusBadge、Tooltip、Popover、Modal、DataTable、Pagination、Stat、Progress、Skeleton、Empty/Error、Copy、DateRange、Line/Area、Donut、Heatmap。

尽量保留现有 `src/console/UI.jsx`、`Icon.jsx` 和 API hooks 的对外行为，通过重写 class/style 和渐进拆分实现，不要在每页复制一套组件。

---

## 13. 最优实现顺序

### Phase 0：冻结业务基线

1. 记录现有路由、feature flag、API calls、query 参数和 response normalization。
2. 对 Usage 与 payment 流程特别做字段清单，参照 `sub2api`。
3. 不改后端接口，不先做视觉页面。

### Phase 1：Design foundation

1. 建立 Light/Dark semantic tokens。
2. 替换默认 WayX mark，但保留 public `siteLogo` override 和 no-flash bootstrap。
3. 重做 Panel、Button、Input、Select、Popover、Table、Skeleton。
4. 建立金额、Token、时间和状态 formatter。

### Phase 2：Global shell

1. 实现最新菜单 IA、独立 Overview、TOOLS 分组。
2. 实现 Logo 右侧 collapse/expand control。
3. 实现 Header、公告、用户菜单、余额、theme/language。
4. 验证 desktop compositor animation 与 mobile drawer。

### Phase 3：数据核心页

1. Overview。
2. API Keys。
3. Usage。
4. Channel Status。

这四页先建立 chart、table、tooltip、filter、background refresh 的共享模式。

### Phase 4：账户与支付

1. Add credit。
2. Orders。
3. Redeem。
4. Affiliate。
5. Profile & Security。
6. Subscriptions。

### Phase 5：Tools 与未覆盖页面

1. Image Studio。
2. Image API Docs。
3. Batch Images 套用共享系统但保留现有复杂流程。
4. Available Channels 套用共享系统。
5. 检查 hidden/direct routes 与 payment helpers。

### Phase 6：Responsive 与 QA

完成所有目标视口、键盘、reduced motion、错误态、长文本、大数据量、慢网和主题切换验证。

---

## 14. 视觉 QA 与验收

### 14.1 必测视口

- 1920 × 1080：主验收。
- 1440 × 900：普通桌面。
- 1366 × 768：紧凑桌面。
- 1024 × 768：桌面/抽屉边界。
- 768 × 1024：平板。
- 390 × 844：移动端。

### 14.2 比对方法

每个有主稿的路由都执行：

1. 打开对应 Dark/Light 主稿。
2. 用相同 viewport 和稳定 mock/真实数据截图实现。
3. 把参考图与实现图并排或叠加比较。
4. 先修 shell geometry，再修卡片网格，再修 typography/color，最后修细节和状态。
5. Light/Dark 各验证一次，不能只通过主题变量推断另一主题正确。

### 14.3 Definition of Done

- 1920 × 1080 下 shell、主网格、card anatomy、密度和层级与主稿一致。
- 页面无意外横向滚动、裁切、遮挡或文本跳动。
- 每个真实字段与 action 都来自既有协议；没有截图假字段。
- Theme、locale、sidebar、background、glass preferences 正确持久化且无闪屏。
- 所有 loading/empty/error/mutation 状态完整。
- Mouse、keyboard、touch 和 screen-reader 基础路径可用。
- Usage cost/FT、Dashboard heatmap、Channel history tooltip 可 hover/focus。
- API key、支付、上传和自定义页安全约束未退化。
- Batch Images 与 Available Channels 明确按共享系统实现，不误报为像素级主稿覆盖。

---

## 15. 可直接交给 Codex 的实现 Prompt

```text
请实现 WayX 登录后的用户控制台 UI/UX 重构。

在写代码前，完整阅读：
1. docs/wayx-console-design-handoff-v1/DESIGN-TO-CODE.md
2. docs/wayx-console-design-handoff-v1/manifest.json
3. docs/wayx-console-design-handoff-v1/reference/APPROVED-DESIGN-DECISIONS.md
4. 项目根目录 AGENTS.md

视觉源位于 docs/wayx-console-design-handoff-v1/assets/ui/。Overview 的 Dark v2 与 Light v3 是全局 shell、Logo、侧边栏和菜单分组的最高视觉依据；其他页面图片只决定各自内容区。

要求：
- 首页与认证页面不动。
- 保留现有所有用户侧路由、feature flag、API 请求/响应含义、认证、权限和错误语义。
- 先重构共享 token、外壳和 primitives，再逐页实现。
- 1920×1080 为 1:1 主验收，另外完成文档要求的响应式。
- 每完成一个页面都启动本地服务，在 Dark/Light 下以相同 viewport 截图，并与源图并排视觉比对后修正。
- 不硬编码设计稿示例数据，不增加管理员字段，不发明后端能力。
- Batch Images 与 Available Channels 没有独立页面主稿：保留完整现有功能，严格复用已建立的全局设计系统，不声称像素级复刻。

从 Phase 0/1 开始执行，并持续汇报已验证的页面、剩余差异和阻塞。
```

---

## 16. 交付中的已知缺口

- Batch Images 与 Available Channels 缺少独立 Dark/Light 全屏主稿。
- 新透明 `wayx-mark.png` 已按确认稿的紫蓝交叉 X 方向制作，同时保留完整品牌锁定截图供几何校准；如果未来提供官方矢量源，应无损替换 raster mark，锁定区几何不变。
- 主稿是静态状态，无法覆盖所有长文本、极端数据量和错误态；这些状态以本文档和现有业务行为为准。
- 示例 endpoint、金额、日期、模型和用户信息不是生产固定值。
