# Design QA — Appica UI 首页与认证页

日期：2026-08-13

参考页面：https://appica.dev/ui

本地页面：http://localhost:5173/

## 验收结果

最终结果：通过。

- 首页在 1440 × 900 浅色状态下与参考站保持相同的区块位置和页面高度：页面高度均为 4152 CSS px；Hero 标题、功能区标题、组件区标题和页脚起点完全一致。
- 390 × 844 移动端保持参考站的标题折行、按钮宽度、点阵背景、横向卡片顺序和首屏尺寸；没有横向溢出。
- 右上角按产品要求替换为国际化、明暗主题和登录/控制台入口，因此该区域是相对参考站唯一的有意差异。
- 登录和注册页已使用 Appica UI 的 Card、Field、Input、Button、Badge、Alert、Progress、BackgroundPattern 等组件；桌面和移动端均无横向溢出。
- 默认主题为 light；浅色/深色切换可用，切换后首页尺寸保持稳定。
- 内部控制台菜单和路由未纳入本次改动范围。

## 最终对比证据

- 桌面浅色并排对比（左侧参考站，右侧本地实现）：`artifacts/design-qa/landing-auth/final-desktop-light-comparison.jpg`
- 移动浅色并排对比（左侧参考站，右侧本地实现）：`artifacts/design-qa/landing-auth/final-mobile-light-comparison.jpg`
- 本地桌面深色：首页 `artifacts/design-qa/landing-auth/local-final-desktop-dark-top.jpg`
- 本地登录页：`artifacts/design-qa/landing-auth/local-final-login-desktop-light.jpg`、`artifacts/design-qa/landing-auth/local-final-login-mobile-light.jpg`
- 本地注册页：`artifacts/design-qa/landing-auth/local-final-register-desktop-light.jpg`、`artifacts/design-qa/landing-auth/local-final-register-mobile-light.jpg`

## 结构测量

| 检查项 | 参考站 | 本地实现 | 结果 |
| --- | ---: | ---: | --- |
| 桌面页面高度 | 4152 | 4152 | 一致 |
| Hero 标题位置/尺寸 | 320, 192 / 800 × 120 | 320, 192 / 800 × 120 | 一致 |
| 功能区标题 Y | 1568 | 1568 | 一致 |
| 组件区标题位置/尺寸 | 60, 2467.5 / 522 × 92 | 60, 2467.5 / 522 × 92 | 一致 |
| 页脚起点 | 3323 | 3323 | 一致 |
| 页脚高度 | 828.55 | 828.56 | 一致 |
| 移动端横向溢出 | 0 | 0 | 一致 |
| 登录页横向溢出 | — | 0 | 通过 |
| 注册页横向溢出 | — | 0 | 通过 |

## 交互检查

- 首页移动抽屉可打开和关闭。
- 搜索按钮可打开 Appica Dialog，搜索输入框和文档入口可访问。
- 国际化按钮可在中文/英文之间切换，并同步更新登录/控制台文案。
- 主题按钮可在 light/dark 之间切换；移除已存主题后仍以 light 渲染。
- 登录状态由现有 `useConsole()` 鉴权状态驱动：未登录显示登录，已登录显示控制台并跳转现有控制台入口。
- 首页展示卡片中的尺码、收藏、数量、Tab、Slider、Switch 等使用 Appica 组件和可操作状态。
- 登录和注册页保留现有认证、OAuth、协议、验证码与注册选项逻辑。

## 视觉判断

未发现需要继续整改的 P0、P1 或 P2 视觉问题。动态轮播标题会因截图时刻不同显示不同短语；这与参考站行为一致，不属于偏差。

## 本轮组件墙复刻复验

- 2048 × 888 浅色状态下，卡片顺序已恢复为 Assistant / Product / Audio / Revenue / Transactions；第二行依次为 Model settings / Command / Order / Team / Rating。
- 10 张卡片的宽度、高度、列位置及列内 Y 偏移逐项测量，与参考站完全一致；五列卡片宽度为 387.19–387.20 CSS px，列间距为 16 CSS px。
- 1440 × 900 状态与参考站一致使用四列、每列 336 CSS px，并隐藏 Assistant / Model settings 列；无横向滚动。
- 52 个关键文本节点的卡片内 X / Y / 宽度 / 高度逐项比对，无剩余差值；Geist 字体及 `Geist Fallback` 指标与参考站一致。
- Assistant 卡片已恢复相同的头像状态点、三段气泡、Sparkle Spinner、快捷 Chip、Toolbar 输入及三个操作按钮。
- Model settings 已恢复相同的模型 Select、Temperature / Context window Slider，以及两个 Switch；模型选项与参考站一致。
- 商品收藏、尺码选择、播放器按钮、订单状态、成员头像和 Owner Badge、交易图标与筛选、评分星标均已按参考站的组件、状态和交互复验。
- 全新页面加载为 light，未出现 Vite 错误覆盖层或浏览器 error 日志。
- 最终组件墙并排对比（左侧参考站，右侧本地实现）：`artifacts/design-qa/landing-auth/final-showcase-comparison-2048.jpg`

## 本轮背景交互与圆角隔离复验

- 参考真值：`https://appica.dev/ui`；实现目标：`http://localhost:5173/`；复验状态为 light、页面纵向滚动 520 CSS px、指针位于组件墙区域。
- 首轮定位到两项 P1：本地组件墙缺少源站 `BackgroundPattern` 的 spotlight/window tracking；全局 `cascade.css` 覆盖了 Appica 的 radius 变量，导致卡片、按钮、输入框和 Tabs 被其他页面样式污染。
- 首页根节点现在独立恢复 Appica 的完整 radius 比例；计算样式复验中，卡片 `rounded-xl`、常规按钮 `rounded-sm`、输入框 `rounded-md`、圆形播放器按钮及 Tabs indicator 均与源站一致，且作用域不会修改登录、注册或内部控制台。
- 背景跟随实测：指针移动至 `(700, 300)` 后，highlight 更新为 `--pattern-x: 700px`、`--pattern-y: 167px`，可见态 opacity 为 `0.866089`，静止 1.35 秒后 opacity 回到 `0`，与源站的跟随和淡出模型一致。
- 组件结构继续收敛：Command Navigation 恢复默认尺寸和选中态；播放器主按钮恢复圆形；订单进度恢复 75%；Team header 对齐；Model Switch 使用 `sm`；Rating 文本和 Meter 继承关系与源站一致。
- 1280 × 720、deviceScaleFactor 1 的同状态并排对比（左侧参考站，右侧本地实现）：`artifacts/design-qa/landing-auth/gallery-refinement-comparison-1280x720.jpg`。两张输入图均为 1280 × 720 像素，无密度缩放。
- 交互复验通过：商品收藏可开/关；交易 Tabs 的 Income 状态只显示 Payroll 与 Stripe payout，恢复 All 后回到完整列表；浏览器 error 日志为 0。
- 最终判断：未发现需要继续整改的 P0、P1 或 P2 问题。右上角国际化、主题和登录入口为用户要求的有意差异。

final result: passed

## 2026-08-13 Hero 标题动效与模型入口复验

- 源真值：`https://appica.dev/ui` 的实时 Hero 标题动效，以及用户提供的旧首页模型图标参考图。
- 实现目标：`http://127.0.0.1:5173/`；视口 1280 × 720 CSS px、deviceScaleFactor 1、light 状态。
- 对比证据：并排图 `artifacts/design-qa/2026-08-13-hero-motion-models/hero-source-local-comparison.jpg`（左侧源站、右侧本地），以及同目录的 `appica-hero-source.jpg`、`local-hero-before.jpg`、`local-hero-after.jpg`。
- 标题动态短语已改用 Appica `TextAnimate` 的 `highlight` 预设并按字符渲染；抽样中 13 个字符的 opacity 从 `0.18` 依次过渡至 `1`，所有字符的 transform 均为 `none`，不再出现逐词上升。
- 动态短语继续占用所有候选文案的最大固定宽度，切换过程中标题和顶部组件不会水平跳动；浏览器横向溢出为 0。
- `Available for` 已单独水平居中，React 徽标已移除；其下恢复 main 分支原有 Claude、Codex、Cursor、Grok、Hermes、OpenCode、Antigravity 七个资源，未切换分支。
- 七个入口均使用 Appica `Thumbnail` 的 image / rounded 外观及背景分隔 ring；单个尺寸为 56 CSS px，组合中心点与 `Available for` 中心点同为 640 CSS px，全部图片加载完成。
- 本地 Vite 页面无 error 日志；复验后未发现 P0、P1 或 P2 问题。

final result: passed

## 2026-08-13 首页顶部导航复验

- 源真值：`https://appica.dev/ui` 的实时首页导航，以及用户提供的交互态截图 `/var/folders/ng/bz9rf9ds7_s6bh2gwx8132yw0000gn/T/codex-clipboard-0e7bab89-8876-4c97-af28-2c2ed9c7d660.png`（666 × 94）。
- 实现目标：`http://127.0.0.1:5173/`；视口 1280 × 720 CSS px、deviceScaleFactor 1、light 状态。
- 全页顶部证据：源站 `artifacts/design-qa/2026-08-13-header-nav/appica-header-source.jpg`（1280 × 96）；本地 `artifacts/design-qa/2026-08-13-header-nav/local-header-final.jpg`（1280 × 96）。WayX 品牌、国际化、主题和登录入口是需求规定的有意差异。
- 聚焦静止态对比：`artifacts/design-qa/2026-08-13-header-nav/navigation-idle-comparison.png`。源站和实现均裁切为 428 × 56，无密度缩放；字体大小、字重、行高、各项宽度、28 CSS px 间距与 Figma 图标尺寸一致。
- 聚焦交互态对比：`artifacts/design-qa/2026-08-13-header-nav/navigation-active-comparison.png`。用户截图中的导航区域从 548 × 70 归一化为 428 × 55；本地 Appica active 状态为 428 × 56。该状态与 hover/focus-visible 使用同一组 Appica `line` 变体规则。
- 字体与排版：本地改为 Appica `NavigationLink`，计算样式与源站一致为 `Geist, Geist Fallback`、14 CSS px、500、20 CSS px，水平项上下内边距均为 10 CSS px。
- 间距与交互：导航项高度统一为 40 CSS px；下划线高度 2 CSS px、距底部 6 CSS px，并沿用 Appica 的 300ms background-size 动画和圆头处理。
- 色彩与视觉 token：文字、悬浮文字和下划线均继承 Appica `foreground-strong` / `foreground-intense` 角色色，无自定义色值。
- 图像与图标：该区域无位图；Figma 外链箭头继续使用与源站相同的 Appica 图标组件，未使用自绘图形。
- 文案：Docs、Components、Icons、Country Flags、Figma 与源站一致。
- 国际化复验：中英文切换前后导航 X、右边界和右侧控件组 X 位移均为 0；页面横向溢出为 0。
- 比较历史：首轮发现 P2——本地使用普通链接，字重为 400、可点击区域高度仅 18 CSS px，且完全缺少参考图中的下划线状态。现已替换为 Appica `Navigation` 的 `line` 变体；复验后未发现 P0、P1 或 P2 问题。

final result: passed

## 2026-08-13 用量、渠道状态、品牌与认证页复验

- 源真值：用户提供的状态时间线参考图（1131 × 140）、状态配色参考图，以及 Appica 卡片/输入交互参考图（529 × 589）。
- 实现目标：`http://127.0.0.1:5173/monitor`、`/usage`、`/login`、`/register` 与首页导航；复验状态为 light、deviceScaleFactor 1。
- 全页证据：`artifacts/design-qa/2026-08-13-ui-polish/status-timeline-and-ip-toolbar-light.png`、`login-centered-light-full.png`、`login-centered-mobile-light.png`、`register-centered-light.png`、`landing-header-light.png`。
- 聚焦对比：状态参考/实现纵向合成图 `artifacts/design-qa/2026-08-13-ui-polish/status-reference-comparison.png`；Appica 卡片参考/登录实现横向合成图 `artifacts/design-qa/2026-08-13-ui-polish/auth-card-reference-comparison.png`。
- 状态时间线的 36 个数据段均为 14 CSS px 高、2 CSS px 圆角和等间距布局；正常、警告、异常、未知分别使用 success、warning、error、neutral 角色色，不再以高度表达状态。浏览器确认所有数据段等高，且无横向溢出。
- 用量记录工具栏已不再渲染本页 IP 数量，只保留批量查询/隐藏归属地按钮。
- 首页及认证页均只使用本地 WayX 标识 `/assets/img/wayx-mark-64.png`；未发现旧 Appica 内联标识或 `sentence-ai-icon.png` 引用。
- 登录/注册页移除左侧说明区，桌面卡片宽 512 CSS px 且水平居中；移动端 390 CSS px 视口下左右各保留 16 CSS px，横向溢出为 0。卡片使用 Appica solid frame，输入框的 focus ring、边框与圆角均由 Appica 组件及角色 token 提供。
- 交互复验：邮箱输入框自动聚焦并显示 3 CSS px focus ring；认证页切换入口保持单行居中；干净页面浏览器 error 日志为 0。
- 首轮 P2：状态段圆角过于胶囊化，已收敛为 2 CSS px；移动登录页底部切换入口被 Appica CardFooter 默认方向拆成两行，已改为单行居中。复验后未发现 P0、P1 或 P2 视觉问题。

final result: passed

## 2026-08-13 首页模型图标悬浮态复验

- 源真值：当前仓库 `main` 分支的 `src/landing-page.html` 与 `src/styles.css` 图标实现；实现目标：`http://127.0.0.1:5173/`，1280 × 720 CSS px、deviceScaleFactor 1、light 状态。
- 全页实现证据：`artifacts/design-qa/2026-08-13-model-hover/main-style-local-hover.jpg`。
- 当前首页直接复用 main 的 `hero-works`、`hero-supports`、`hero-agents-strip` 和 `hero-mark` 结构及样式；图标恢复为原始 `<img>`，不再经过 Appica Thumbnail 包装或自定义 ring。
- 桌面图标为 72 × 72 CSS px，相邻图标左边距为 -22 CSS px，组合宽度为 372 CSS px；悬浮终态为 `translateY(-6px) scale(1.1)`、z-index 1、`drop-shadow(0 8px 14px rgb(0 0 0 / 35%))`。
- transition 与 main 一致为 transform / filter 180 ms ease；main 原有的 hover none / pointer coarse 降级规则保持生效。
- 悬浮前后图标组布局边界不变，页面横向溢出为 0，浏览器 error 日志为 0。
- 复验未发现 P0、P1 或 P2 问题。

final result: passed
