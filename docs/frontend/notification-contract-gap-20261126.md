# 通知模块：前端契约与后端实现缺口

日期：2026-11-26。触发点：接口冒烟首轮把 `/api/communication/notification/*` 打了一遍，
配合 `apps/web/src/api/notification/*.ts` 逐条比对 OpenAPI，发现**前端这一层几乎是照着另一套服务写的**。

## 结论

- 前端 `apiClient.notification` 的 baseURL 是 `/api/communication/notification`（`config/runtime.ts`），
  但 `channel/delivery/digest/group/preference/subscription/webhook` 等文件里的路径又写成了
  `/notification/xxx`，实际请求落到 `/api/communication/notification/notification/xxx`，**全部 404**。
- 即使把重复前缀剥掉，后端也只有 `notifications`（列表/已读/归档/统计）和 `push-config` 的一部分有真实实现；
  其余管理类接口（通道、供应商、Webhook、模板、摘要、分组、订阅、偏好）**没有实现**，
  只有 `svc/server/src/modules/communication_real_module.rs` 里的 `comm_stub` 兜底（返回 200 空数据）。

逐文件统计（142 条调用 / 能在 spec 里找到 9 条）：

| 文件 | 调用数 | 可解析 | 缺口 | 说明 |
| --- | --- | --- | --- | --- |
| batch.ts | 17 | 5 | 12 | 批量读/归档可用，群发等未实现 |
| channel.ts | 15 | 0 | 15 | 通道 CRUD，全部缺 |
| delivery.ts | 10 | 0 | 10 | 投递记录，全部缺 |
| digest.ts | 18 | 0 | 18 | 摘要/定时，全部缺 |
| group.ts | 19 | 0 | 19 | 分组与成员，全部缺 |
| preference.ts | 14 | 0 | 14 | 偏好/免打扰，全部缺 |
| pushConfig.ts | 13 | 2 | 11 | 仅部分 stub |
| subscription.ts | 13 | 0 | 13 | 订阅，全部缺 |
| template.ts | 12 | 2 | 10 | 通知模板，基本缺 |
| webhook.ts | 11 | 0 | 11 | Webhook，全部缺 |

## 本轮处理（止血，不补后端）

摘掉两个入口页——它们完全依赖缺口接口，留着只会让用户看到空表或错误态：

- `/notification/templates`（`NotificationTemplatesPage`）
- `/notification/settings`（`NotificationSettingsPage`，调用 `channelApi.listChannels`）

改动在 `apps/web/src/module-configs/notification/config.ts`：从 `routes` 与 `navItems` 移除，
并保留 `NOTIFICATION_PATHS` 常量（避免别处引用断链）。页面组件本身没删，等后端补齐可直接恢复。

保留并已确认数据源可用的页面：

| 页面 | 依赖 | 后端状态 |
| --- | --- | --- |
| `/notification/dashboard` | 聚合读 | 可用 |
| `/notification/list` | `GET /notifications`、`DELETE /notifications/bulk-delete` | 可用 |
| `/notification/center` | `GET /notifications` | 可用 |
| `/notification/archive` | `GET /notifications/archived`、archive config | 可用 |
| `/notification/statistics` | `GET /notifications/stats/me` | 可用（`health` 探测失败会降级展示） |

验证：`npx tsc --noEmit` 通过。

## 后续两条路

1. **补后端**：按 `notification` 路由前缀在 communication 服务里实现上述 8 组接口，
   同时把前端路径里的重复 `/notification` 去掉（或在 client 层做一次 normalize，避免 100 多处手改）。
   建议顺序：templates → preferences → channels/providers → delivery/webhook → digest/group/subscription。
2. **继续收口前端**：把 `api/notification` 里无后端实现的模块标 `@deprecated 未实现`，
   避免新页面继续引用；对应 i18n 菜单项在缺口期间不出现。

## 备注

- `comm_stub` 是"契约未实现但前端已上线"的历史兜底（返回 200 空数据）。它会让页面看起来"正常但没数据"，
  比 404 更难发现，这也是做接口冒烟的直接原因。
- 冒烟本身不会把 stub 判成 FAIL（它看 HTTP 码），所以这份缺口靠"前端调用 → spec 比对"才暴露出来。
