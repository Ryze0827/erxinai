# Erxin AI 中转服务首页

Erxin AI 的官方网站首页与用户服务门户，用于展示 AI 中转服务、承接用户注册与套餐购买，并为用户提供充值、订单和 API 接入管理能力。

本仓库是面向用户的 Web 前端。模型请求转发、渠道调度、额度扣减、密钥校验和计费等中转核心能力由后端服务提供，不包含在本工程中。

## 项目定位

站点以 AI 中转服务为核心，主要承担以下职责：

- 作为 Erxin AI 的网站首页，展示服务能力、套餐、公告和使用入口
- 引导用户注册、登录、购买或充值 AI 中转服务
- 提供商品套餐、订单、支付和自动交付流程
- 提供钱包余额、充值记录和礼品卡管理
- 提供用户 API 凭证申请、生成、启停和重新生成能力
- 提供 CDK 充值、卡密查询等配套工具
- 提供博客、公告、服务条款和隐私政策页面
- 支持简体中文、繁体中文和英文界面

## 主要页面

- 首页：展示 AI 中转服务、推荐套餐和最新公告
- 套餐页面：浏览中转服务套餐并完成购买
- 用户中心：管理资料、安全设置、订单、钱包和 API 凭证
- 支付页面：处理订单支付、钱包组合支付和支付结果确认
- CDK 工具：完成卡密充值和批量查询
- 内容页面：展示公告、博客、关于我们和法律条款

## 技术栈

- Vue 3、TypeScript、Vue Router
- Vite、Tailwind CSS
- Pinia、Vue I18n、Unhead
- DOMPurify、QRCode

## 本地开发

建议使用 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

开发服务器默认监听 `0.0.0.0:5173`，并将以下路径代理到本机 `8080` 端口的后端服务：

- `/api`
- `/uploads`
- `/sitemap.xml`
- `/robots.txt`

## 环境变量

生产环境通过 `VITE_API_BASE_URL` 指定业务后端：

```dotenv
VITE_API_BASE_URL=https://api.example.com
```

配置要求：

- 不要在地址末尾添加 `/`
- 不要添加 `/api/v1`，请求客户端会自动拼接接口前缀
- 后端需要允许站点域名进行跨域访问
- 留空时使用当前站点的同源接口

CDK 相关页面使用同源 `/cdk-api` 路径。生产部署时需要通过反向代理或 Cloudflare Worker 将该路径转发到对应后端。

## 可用命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 类型检查并生成生产文件
npm run preview  # 预览生产构建
```

## 目录结构

```text
src/
├── api/          # 业务后端请求与数据类型
├── components/   # 通用组件和业务组件
├── composables/  # 首页、商品和页面复用逻辑
├── router/       # 站内页面路由
├── stores/       # 用户、购物车和全局状态
├── utils/        # 导航、内容、金额等工具
└── views/        # 首页与业务页面
```

## Cloudflare Pages 部署

连接 Git 仓库后使用以下构建配置：

```text
生产分支：main
框架预设：Vue
构建命令：npm run build
构建输出目录：dist
根目录：留空
```

建议配置以下构建环境变量：

```text
NODE_VERSION=22.16.0
VITE_API_BASE_URL=https://api.example.com
```

Cloudflare Pages 只负责托管本工程生成的静态前端文件。部署前还需要确认：

- AI 中转后端已经部署并可以通过公网访问
- 后端跨域配置已包含 Pages 域名和正式自定义域名
- `/cdk-api` 已配置反向代理
- `/sitemap.xml` 和 `/robots.txt` 已提供静态文件或代理规则
- Turnstile 等第三方服务已添加正式站点域名

## Docker 部署

仓库提供多阶段构建的 `Dockerfile` 和适配 Vue Router history 模式的 `nginx.conf`。容器运行后由 Nginx 提供静态文件，并暴露 `/health` 健康检查端点。

## 导航约束

普通站点导航只接受以 `/` 开头的站内路径。后台配置的外部导航、页脚链接和横幅链接不会生成可跳转入口；富文本中的外部超链接也不会保持可点击状态。支付网关和第三方登录属于独立业务流程，不作为站点导航使用。
