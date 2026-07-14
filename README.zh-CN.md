# Sentence AI Gateway 官网原型

[English](./README.md)

Sentence AI 是一个面向 AI 中转服务的响应式官网原型。它用于展示统一且兼容 OpenAI 的多模型访问入口，以及请求追踪、用量与成本统计、供应商健康状态和故障转移等能力。

当前仓库仅包含官网和交互式前端演示，尚未实现真实的 AI 请求转发，也不包含可用于生产环境的身份认证系统。

## 主要功能

- 适配桌面端和移动端的响应式首页
- AI 中转控制台交互演示
- OpenAI 兼容接口展示
- 请求链路、状态和延迟展示
- Token 用量和成本监控概念展示
- 模型供应商健康状态和自动故障转移概念展示
- 登录和注册页面原型
- 定价、FAQ 和导航交互
- 本地字体和图片资源

## 当前范围

本工程目前是纯静态前端原型：

- 登录和注册提交仅在浏览器中模拟。
- AI 中转控制台使用演示数据，不会请求后端接口。
- 当前不需要 API Key、环境变量、数据库或服务端运行环境。

## 技术栈

- React 19
- Vite 6
- JavaScript 和 CSS

## 本地开发

建议使用 Node.js 20 或更高版本，当前工程支持 Node.js 22。

```bash
npm install
npm run dev
```

开发服务器默认监听所有本地网络接口，启动后请使用 Vite 输出的访问地址。

## 可用命令

```bash
npm run dev      # 启动 Vite 开发服务器
npm run build    # 构建生产文件到 dist/ 目录
npm run preview  # 在本地预览生产构建
```

## 工程结构

```text
.
├── index.html                       # Vite HTML 入口和页面元信息
├── src/
│   ├── App.jsx                      # 首页行为和路由选择
│   ├── AuthPage.jsx                 # 登录和注册页面原型
│   ├── gatewayDemos.js              # AI 中转交互演示
│   ├── landing-page.html            # 首页主体 HTML
│   └── *.css                        # 页面和组件样式
├── public/assets/                   # 本地字体和图片
└── vite.config.mjs                  # Vite 配置
```

## 页面路由

| 路由 | 用途 |
| --- | --- |
| `/` | Sentence AI 中转服务首页 |
| `/login` | 模拟登录页面 |
| `/register` | 模拟注册页面 |

页面路由由 React 应用在客户端处理。由于构建结果中没有顶层 `404.html`，Cloudflare Pages 可以通过默认的单页应用回退机制访问这些路由。

## 部署到 Cloudflare Pages

请使用以下构建配置：

| 配置项 | 填写内容 |
| --- | --- |
| 生产分支 | `main` |
| 框架预设 | `React (Vite)` |
| 构建命令 | `npm run build` |
| 构建输出目录 | `dist` |
| 根目录 | 留空 |

当前前端原型不需要配置环境变量。

## 正式上线前

- 将登录和注册接入真实后端服务。
- 将中转控制台接入真实的请求、用量、账单和供应商健康数据。
- 确认最终定价和 FAQ 内容，并在准备完成后补充 Sentence AI 自有的法律条款与联系页面。
- 补充社交分享元信息并确认正式域名。
- 接入后端后补充合适的安全响应头和密钥管理方案。
