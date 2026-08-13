# WayX Console Design Handoff v1

这是登录后 WayX 用户控制台的离线设计交付包。它不依赖 Figma，可直接交给 Codex 作为实现输入。

## 从这里开始

1. 先完整阅读 [`DESIGN-TO-CODE.md`](./DESIGN-TO-CODE.md)。
2. 再核对 [`manifest.json`](./manifest.json) 中的页面、路由、API 模块和资源映射。
3. 实现每个页面时，同时打开对应的 Dark 与 Light 设计图；页面结构保持一致，仅主题语言不同。
4. 全局侧边栏、Logo、菜单分组以 Overview 主稿和设计文档为准；旧页面图中的旧菜单分组不再生效。

## 文件夹

- `assets/ui/dark/`：12 张已选定 Dark 页面主稿。
- `assets/ui/light/`：12 张对应 Light 页面主稿。
- `assets/brand/`：新 WayX 标识、常用尺寸和全局品牌锁定参考。
- `assets/backgrounds/`：控制台可选背景。
- `assets/illustrations/`：充值、兑换和隐藏视频流程使用的插画。
- `reference/APPROVED-DESIGN-DECISIONS.md`：逐页确认记录的归档副本。
- `reference/source/Icon.jsx`：现有可复用图标注册表副本。

## 交付边界

- 首页、登录、注册与认证流程不在本轮视觉重构范围内。
- API 请求/响应的业务含义、权限、路由与认证语义不可改变。
- Batch Images 与 Available Channels 目前没有单独确认的全屏视觉主稿；实现时保留完整现有功能，并套用本交付包的全局设计系统。详情见主文档的“视觉覆盖缺口”。

## 品牌说明

`assets/brand/wayx-mark.png` 是根据确认稿左上角紫蓝交叉 X 标识生成并去除背景后的透明主资源；`512/128/64` 为直接可用尺寸。`WayX` 字标应由界面文字渲染，不要烘焙进图片，以便适配主题与公共品牌替换逻辑。

