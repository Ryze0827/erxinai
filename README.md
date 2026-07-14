# Erxin AI 商城用户端

基于 Vue 3 的数字商品商城前端，提供商品浏览、下单支付、订单交付和用户资产管理等面向客户的功能。站点名称、首页内容、导航、SEO、支付渠道等运行配置由后端接口提供。

## 主要功能

- 商品分类、商品列表、详情、SKU 选择、购物车和快捷购买
- 会员与游客下单、订单查询、订单详情和自动交付内容展示
- 在线支付、钱包充值、礼品卡兑换和充值订单查询
- 注册、登录、找回密码、两步验证和账号安全设置
- 用户资料、会员等级、订单、钱包、API 凭证和推广中心
- 博客、公告、关于我们、服务条款和隐私政策
- 简体中文、繁体中文和英文界面
- 卡片与列表两种首页展示模式

## 技术栈

- Vue 3、TypeScript、Vue Router
- Vite、Tailwind CSS
- Pinia、Vue I18n、Unhead
- DOMPurify、QRCode

## 本地开发

建议使用 Node.js 20 及 npm。

```bash
npm install
npm run dev
```

开发服务器默认监听 `0.0.0.0:5173`，并将 `/api`、`/uploads`、`/sitemap.xml` 和 `/robots.txt` 代理到本机 `8080` 端口的后端服务。

如需连接其他后端，可在本地环境文件中设置：

```dotenv
VITE_API_BASE_URL=
```

留空时使用同源接口；填写时不要在末尾附加 `/api/v1`，客户端会自动拼接接口前缀。

## 可用命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 类型检查并生成生产文件
npm run preview  # 预览生产构建
```

## 目录结构

```text
src/
├── api/          # 请求客户端与业务接口
├── components/   # 通用与业务组件
├── composables/  # 可复用页面逻辑
├── router/       # 站内路由
├── stores/       # Pinia 状态
├── utils/        # 通用工具
└── views/        # 页面组件
```

## 导航约束

普通站点导航只接受以 `/` 开头的站内路径。后台配置的外部导航、页脚链接和横幅链接不会生成可跳转入口；订单说明中的外部超链接也不会保持可点击状态。支付网关和第三方登录属于独立业务流程，不作为站点导航使用。

## 部署

仓库提供多阶段构建的 `Dockerfile` 和适配 Vue Router history 模式的 `nginx.conf`。容器运行后由 Nginx 提供静态文件，并暴露 `/health` 健康检查端点。

部署时需确保后端 API、上传资源、站点地图和爬虫规则可通过同源路径访问，或正确配置 `VITE_API_BASE_URL`。
