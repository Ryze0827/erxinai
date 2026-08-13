# 页面逐页校准记录

## 核心问题与修复

| 区域 | 原因 | 校准结果 |
| --- | --- | --- |
| 概览趋势图 | 自定义 SVG 的 `polygon`、`polyline`、`circle` 继承了浏览器默认黑色填充 | 显式约束面积、折线、圆环的填充与描边，并统一为 Appica 角色色 |
| 概览图表高度 | 无障碍数据表缺少可靠的视觉隐藏规则，参与文档布局 | 恢复为 1×1 隐藏节点，图表卡片回到稳定高度 |
| 概览数据密度 | 指标卡分散、日期标签拥挤 | 指标改为统一复合面板，桌面七列；横轴只显示七个等距日期 |
| 用量 Token 列 | 四类 Token 纵向堆叠，造成随意换行和超高行 | 改为 2×2 信息栅格，并保留合计行 |
| 宽表格 | 页面本身被表格撑宽 | 固定列宽和最小表格宽度，横向滚动限制在表格容器内部 |
| 兑换码 / 推广返利 | 插图尺寸失控，信息区纵向拉伸 | 重排为紧凑摘要、主操作区和历史区，图片按实际槽位约束 |
| 个人资料 | 头像、身份信息和密码操作控件错位 | 恢复横向资料块、规则化字段间距，显隐按钮嵌回输入框 |
| 批量图片 | 筛选器宽度不一致，路由标题错误 | 改为满宽七列筛选栅格，并恢复“批量图片”标题 |

## 页面核对结果

在桌面视口（CSS 1862×982）逐页核对以下路由：

- `/admin/dashboard`
- `/keys`
- `/usage`
- `/monitor`
- `/purchase`
- `/orders`
- `/redeem`
- `/affiliate`
- `/profile`
- `/subscriptions`
- `/image-studio`
- `/image-api-docs`
- `/batch-image`
- `/video-workflow`

以上页面均未发现文档级横向溢出、破损图片或残留加载骨架。`/available-channels` 当前为禁用功能，按现有产品逻辑回退至概览页。

窄屏视口（CSS 1018×818）复核了概览、密钥、用量、渠道状态、充值、订单、兑换码、推广返利、个人资料、图片工作室、图片 API 文档与批量图片；宽表格均在组件内部滚动，没有撑宽页面。

## 对照截图

| 页面 | 整改前 | 整改后 |
| --- | --- | --- |
| 概览 | [01-dashboard-before.png](./01-dashboard-before.png) | [03-dashboard-after.jpg](./03-dashboard-after.jpg) |
| 用量记录 | [02-usage-before.png](./02-usage-before.png) | [04-usage-after.jpg](./04-usage-after.jpg) |
| 概览窄屏 | — | [22-dashboard-narrow.jpg](./22-dashboard-narrow.jpg) |
| 用量窄屏 | — | [23-usage-narrow.jpg](./23-usage-narrow.jpg) |
| 个人资料窄屏 | — | [24-profile-narrow.jpg](./24-profile-narrow.jpg) |

## 验证边界

- 逐页使用 Chrome 检查真实渲染、标题、破图、加载状态和文档溢出。
- 运行了变更文件的 `git diff --check`，无空白错误。
- 按项目说明，未运行单元测试、构建或编译。
