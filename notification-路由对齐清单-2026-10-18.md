# Notification 路由对齐清单（后端 owner 交接）

- **日期**：2026-10-18
- **来源**：TOPEMS 代码与工程质量审计 P1-A2（静态对拍，只读）
- **对拍基准**：前端 `apps/web/src/api/notification/*`（13 模块）全部请求 × 后端 `svc/server/src/modules/communication_real_module.rs`（线上生效面，nginx 全量 `/api/*` → BFF :8099）
- **前置澄清（修正此前审计结论）**：
  - 前端子客户端 baseURL = `/api/communication/notification`，后端嵌套路由前缀完全对齐，**无网关前缀断层**（nginx `location /api/` 全量转发 8099）。
  - 此前"约 60 条路径后端零注册"**不成立**：未实现子域由 `comm_stub` 兜底返回 **200 + `{success:true, data:null}`**（防裸 404，见模块头注释"待上游支持后替换为真实 handler"）。
  - 此前"read-all 方法错位"**不成立**：后端同时注册 `PUT /notifications/read-all`（前端匹配）与 `POST /notify/read-all`（别名）。
  - `GET /notifications/stats/me`、`GET /notifications/unread-count`、`GET /notifications/unread`、`PUT /notifications/{id}/unread` 均有**真实 handler**。

## 一、总体结论（149 条前端请求）

| 归类 | 数量 | 说明 |
|---|---:|---|
| **REAL**（真实 handler） | 34 | 通知 CRUD/未读/已读/归档/统计/模板 CRUD/渠道 CRUD/批量读删——页面核心功能全真实可用 |
| **STUB**（200 空数据兜底） | 94 | 12 个未实现子域 + 模板扩展操作 + health/bulk-progress；**除 1 条外页面均未消费** |
| **缺失**（前后端均无） | 21 | 参数名差异误报 13 + **真缺失 8** |

> 前端 `api/notification` 共定义 149 条请求，页面实际消费约 30 条。约 120 条为未消费 API 契约（死面），建议裁剪或列入 roadmap。

## 二、页面实调但异常（P1，用户可感知）

| # | 路径 | 现状 | 实调页面 | 建议 |
|---|---|---|---|---|
| 1 | `DELETE /notifications/bulk` | **真缺失 → 404** | `pages/mobile/MobileNotificationPage`、`pages/notification/NotificationListPage`（批量删除） | 前端 `api/notification/batch.ts` 已有真实可用 `DELETE /notifications/bulk-delete`（REAL），改前端调用为 bulk-delete；或后端为 `/notifications/bulk` 补注册（crate `bulk_delete` 已实现，加别名即可） |
| 2 | `POST /notification-templates/{id}/render` | **STUB → 200 空数据** | `pages/notification/NotificationTemplatesPage`（模板渲染预览） | crate 未实现 render handler；需实现（模板渲染 + 预览数据）或前端先移除该入口 |

## 三、真缺失 8 条（未消费，P2）

| 路径 | 所在模块 | 说明 |
|---|---|---|
| `POST /notifications/bulk-read-by-condition` | batch.ts | 条件批量已读（后端未实现） |
| `POST /notifications/bulk-unread` | batch.ts | 批量未读 |
| `POST /notifications/bulk-delete-by-condition` | batch.ts | 条件批量删除 |
| `POST /notifications/bulk-archive` | batch.ts | 批量归档 |
| `POST /notifications/bulk-unarchive` | batch.ts | 批量取消归档 |
| `POST /notifications/bulk-delete-all` | batch.ts | 全量删除 |
| `PUT /notification-templates/batch-status` | template.ts | 模板批量状态 |
| `DELETE /notifications/bulk` | index.ts | 见 P1 #1 |

> 未消费：当前无页面调用，可后端按需补注册或从前端 API 层移除。

## 四、STUB 子域（94 条，P3 或 roadmap）

前端定义了完整 API 但后端 crate 未实现，`comm_stub` 返回空数据；**当前页面未消费**（除 render 外）：

- **preferences**（用户偏好，建议优先实现）：GET/PUT `/notification/preferences`、categories、quiet-hours、defaults、global-mute、reset（12 条）
- **subscriptions**（订阅）：CRUD + batch-subscribe/unsubscribe + pause/resume + event-types + my-subscriptions（13 条）
- **deliveries**（投递记录）：list/detail/stats/failed/retry + by-user/by-channel/batch（13 条）
- **digests**（摘要）：CRUD + summary + history + send（11 条）
- **scheduled**（定时）：CRUD + send/cancel + my-scheduled（9 条）
- **groups / topics**（组/主题）：CRUD + members + topics + subscribe + broadcast + my-topics（22 条）
- **webhooks**（Webhook）：CRUD + events + enable/disable/rotate-secret/test + 事件投递（12 条）
- **providers / provider-types**（渠道商）：list/detail/test + types（6 条）
- **push-config**（推送配置）：channels/preferences/quiet-hours/test/enable/disable（14 条）
- **模板扩展**：render（P1）/test/clone/versions/variables/status（STUB 6 条）
- **其他**：`GET /notifications/health/detailed`、`GET /notifications/bulk-progress/{id}`、`POST /notify/broadcast-with-template`

## 五、后端接线现状（供 owner 评估实现成本）

- 真实 handler 全部位于 `svc/communication/src/notification.rs`（2981 行），由 `svc/server/src/modules/communication_real_module.rs` 挂载（feature `module-communication`）。
- **crate 未实现**上述子域 handler（notification.rs 无 preferences/subscriptions/deliveries/digests/groups/topics/webhooks/scheduled/providers/push-config 等函数）——stub 为当前设计，非遗漏接线。
- 建议优先级：preferences（用户设置核心，前端定义最完整）→ subscriptions/event-types → deliveries/digests → 其余按 roadmap。

## 六、契约纪律建议（长期）

1. 前端 `api/notification` 149 条 vs 页面消费 ~30 条：对未消费 API 模块（delivery/digest/group/webhook/pushConfig 等整模块 0 页面消费）做裁剪或标注"规划中"。
2. 前端 `bulk` 系路径新旧并存（`bulk` vs `bulk-delete`）已造成 1 处 404，建议统一命名。
3. 新增子域时沿用"crate handler → server 挂载 → 前端子模块"三段对齐，避免再引入 stub 面。
