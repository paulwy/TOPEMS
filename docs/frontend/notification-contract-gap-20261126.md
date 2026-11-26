# 通知模块：前端契约与后端实现的真实差距

日期：2026-11-26。触发点：接口冒烟只测 spec 里的路径，而通知这层前端调了一大堆 spec 里没有的路径，
于是写了 `scripts/ci/api-contract.mjs` 做「前端调用 → OpenAPI → 实打」三段对账。

## 关键结论（已实测，不是推测）

1. 子客户端 baseURL 是 `/api/communication/notification`（`apps/web/src/config/runtime.ts`），
   `channel/delivery/digest/group/preference/subscription/webhook` 里又写 `/notification/xxx`，
   实际请求是 `/api/communication/notification/notification/xxx`。
2. **这个双前缀不是 404，而是打中了 `comm_stub` 的挂载点**（stub 挂在 `/notification` 下），
   返回 `200 {"success":true,"message":"communication endpoint pending upstream support","data":null}`。
   也就是说：页面不报错、不弹窗、就是没数据——比 404 难查得多。
3. 把重复前缀去掉、改成「正确」的单前缀 `/api/communication/notification/channels`，**反而 404**，
   因为这些管理接口后端本来就没有。
4. 真正有实现的只有 `/api/communication/notification/notifications*`：
   `GET /notifications`、`/notifications/stats/me`、`/notifications/archived` 实测均 200 且有正常包体；
   `push-config` 虽然 spec 里有条目，实测也是 pending stub。
5. `/api/communication/notification/health` 实测 404，`statistics` 页里的 `health` 探测只能走降级分支。

## 数量

静态扫描 `apps/web/src/api/notification/*.ts`：142 条调用，只有 9 条能在 OpenAPI 里解析。
把命名空间下全部调用都算上（含 `api/communication/readOps2.ts` 等）：166 条，解析 32 条，未解析 134 条。

未解析的这部分，实测能打到的 GET 里 24 条落在 stub（`pending upstream support`），
其余是 POST/PUT/DELETE 或路径带变量，无法用 GET 单测，但它们的真实路径同样不存在。

| 文件 | 调用数 | spec 可解析 | 实测状态 |
| --- | --- | --- | --- |
| batch.ts | 17 | 5 | 群发/广播走 stub |
| channel.ts | 15 | 0 | providers、provider-types 均 stub |
| delivery.ts | 10 | 0 | deliveries / stats / failed 均 stub |
| digest.ts | 18 | 0 | digests / scheduled / summary 均 stub |
| group.ts | 19 | 0 | groups / topics 均 stub |
| preference.ts | 14 | 0 | preferences / quiet-hours / defaults 均 stub |
| pushConfig.ts | 13 | 2 | spec 有条目但服务端仍 pending |
| subscription.ts | 13 | 0 | subscriptions / my-subscriptions 均 stub |
| template.ts | 12 | 2 | 模板渲染/克隆/版本均缺 |
| webhook.ts | 11 | 0 | webhooks 全家桶均 stub |

## 本轮处理（止血）

摘掉两个完全依赖缺口接口的入口页，避免用户点进去看到空表或错误态：

- `/notification/templates`（`NotificationTemplatesPage`）
- `/notification/settings`（`NotificationSettingsPage`，依赖 `channelApi.listChannels`）

改动：

- `apps/web/src/module-configs/notification/config.ts`：从 `routes`、`navItems` 移除两项，保留 `NOTIFICATION_PATHS` 常量避免别处断链。
- `apps/web/src/components/notification/NotificationDashboardPage.tsx`：删掉跳往这两页的两个快捷入口与随之无用的 `Settings` 图标引用。
- 页面组件没删，后端补齐后可原样恢复。

保留页面（数据源实测 200）：

| 页面 | 依赖 | 实测 |
| --- | --- | --- |
| `/notification/dashboard` | 聚合读 | OK |
| `/notification/list` | `GET /notifications`、`DELETE /notifications/bulk-delete` | OK |
| `/notification/center` | `GET /notifications` | OK |
| `/notification/archive` | `GET /notifications/archived` | OK |
| `/notification/statistics` | `GET /notifications/stats/me` | OK（health 探测 404，走降级） |

验证：`npx tsc --noEmit` 通过；`check-page-health.mjs` 对上述 5 页全 OK。

## 恢复 / 后续

1. **补后端**（另立批次）：在 communication 服务里按 `/notification/...` 实现 8 组管理接口，
   优先 templates → preferences → channels/providers → delivery/webhook → digest/group/subscription。
2. **前端路径归一**：`api/notification` 里 100+ 处重复 `/notification` 前缀，建议在 client 层做一次
   normalize（或直接改路径），否则后端一旦把 stub 摘掉，这些调用立刻全 404。
3. **stub 收口**：stub 现在返回 200，前端无法感知。建议给 stub 响应加 `X-Stub: true` 头或固定错误码，
   让前端和巡检能识别「契约未实现」，而不是当成空数据。

工具：`node scripts/ci/api-contract.mjs --only notification --probe`
（`--probe` 会按 2xx / stub / 404 分类，明细写 `--json /tmp/x.json`）
