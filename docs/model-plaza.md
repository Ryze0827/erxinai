# 模型广场

入口位于「分组状态」下方，路由 `/model-plaza`，仅登录用户可访问。

调用链：erxinai → FlowPool `/api/model-plaza-user/catalog` → Sub2API `/api/v1/model-plaza`。FlowPool 校验用户身份并使用用户 token 读取上游，不使用管理员凭据读取用户价格。用户专属分组、倍率及计费数据沿用 Sub2API。

## 配置

在 FlowPool 的「模型广场」页面设置开关、Markdown 价格说明、隐藏分组 ID。配置保存在 FlowPool SQLite，默认关闭。隐藏分组仅影响展示，不改变权限或计费。价格说明留空时使用上游说明。

Sub2API 必须支持且启用原工程的模型广场接口；否则页面会显示明确错误，不回落到不准确的价格。

前端复用 `VITE_FLOWPOOL_BASE_URL`。留空时，生产反向代理需将 `/api/model-plaza-user/` 与 `/api/invoice-user/` 转发到 FlowPool。开发环境复用 `VITE_DEV_INVOICE_PROXY_TARGET`（默认 `http://127.0.0.1:8765`）。跨域部署时，将前端源加入 FlowPool 现有 `FLOWPOOL_INVOICE_ALLOWED_ORIGINS`，该白名单也用于模型广场用户接口。

模型广场以卡片展示各模型的标准时段实付价：倍率小于 1 时，用删除线标出折扣前价格，实付价紧随其后；缓存价、推理强度倍率及分时倍率以纯文本的「标签 / 数值」行依次列在卡片内。实际扣费以 Sub2API 的计费规则为准。
