# 前端调用 → OpenAPI 契约对账（2026-11-26）

## 为什么做

接口冒烟（`scripts/ci/api-smoke.mjs`）只能测 spec 里已有的 916 条 GET。
但它测不到「前端在调、spec 里没有」的路径——这类接口既不进冒烟，也进不了契约检查，
出问题是 404 或被 stub 用 200 空数据兜住，页面看起来只是"没数据"。

`scripts/ci/api-contract.mjs` 补的就是这条边：静态扫前端调用，拼上各命名空间 baseURL，
和 OpenAPI 比对；加 `--probe` 再把「spec 里没有」的 GET 真打一遍，分成四类。

## 实测结果

静态扫描 `apps/web/src/api` 下 591 个文件，抓到 4809 条可解析调用：

- 能在 spec 里匹配到：2581
- spec 里没有：2228

对其中 391 条「GET、无路径变量」的未匹配路径做实测：

| 分类 | 数量 | 含义 |
| --- | --- | --- |
| SPEC_GAP | 313 | 接口真实存在、返回 2xx，但没写进 OpenAPI |
| STUB | 31 | 返回 2xx，但文案是 `pending upstream support`（契约未实现） |
| NEEDS_PARAM | 35 | 400/405/422，路径存在但需要参数或方法不对 |
| OTHER | 12 | 401/5xx/网络失败 |
| REAL_MISSING | **0** | 404「接口不存在」一条都没有 |

结论：**当前主要矛盾不是前端调错路径，而是 OpenAPI 覆盖率不够。**
313 条真实 GET 不在 spec 里，等于在冒烟网之外。改路径不是重点，补注解才是。

按命名空间，未匹配调用最多的：`core 212`、`erp 192`、`finance 192`、`workflow 138`、`notification 134`、`mes 124`、`ehs 108`、`wms 105`。

## stub 清单（31 条，全部是"假 200"）

- notification 24 条：providers、provider-types、deliveries(+stats/failed)、digests(+summary/scheduled/my-scheduled)、
  topics、groups(+my-topics)、preferences(+categories/quiet-hours/defaults)、subscriptions(+my-subscriptions)、
  event-types、webhooks、push-config(+channels/preferences)、notifications/health/detailed。
- ticket 3 条：`tickets/dashboard/trend`、`sla-overview`、`assignee-load`。
- core 2 条：`file/files/search`、`system/audit-logs`。
- im / mail 各 1 条：`communication/{im,mail}/health`（健康检查本身没实现，属于探测型调用，可以接受）。

notification 的细节见 `docs/frontend/notification-contract-gap-20261126.md`。

## 首轮全量：多覆盖 368 条，立刻抓到 2 个真 500

`api-contract --emit-get` + `api-smoke --extra` 把 368 条前端 GET 并入冒烟，总数从 916 变成 1281：

| 轮次 | 结果 |
| --- | --- |
| 首轮（含前端清单） | `OK=1156 SOFT=121 FAIL=2 SKIP=2` |
| 修 menu 后复跑 | `1281 条 OK=1156 SOFT=121 FAIL=0 SKIP=2 DEGRADED=2`，判定 OK |

两条 FAIL 都是 `500 内部服务器错误`，且都不在 spec 里、原来的冒烟永远测不到：

- `GET /api/core/menu/groups`、`GET /api/core/menu/menus` ——
  日志 `decoding column "tenant_id": unexpected null`。库里的 54 个菜单分组、187 个菜单项
  tenant_id **全是 NULL**（系统级共享菜单），而 `MenuGroup`/`Menu` 的 `tenant_id` 声明成 `Uuid`。
  改成 `Option<Uuid>` 后两个接口 200，`data.items` 正常返回。

这类缺陷正是"页面还能用、接口其实 500、前端拿空态兜住"的典型。

## 方法不符（405）：17 条前端 GET 打到了只支持写操作的路由（已修）

这些是"前端用 GET 调一个后端只接受 POST/PUT 的动作型接口"，页面点下去必失败；
当前冒烟只测 GET，所以它们表现为 405，被判 SOFT（不污染判负，但也没被当成缺陷）。

- `GET /api/ai/documents/vectorize-from-file`（frontend）
- `GET /api/ai/profile/get`（frontend）
- `GET /api/ai/recommend/documents`（frontend）
- `GET /api/ai/recommend/opportunities`（frontend）
- `GET /api/ai/multimodal/video/summary`（frontend）
- `GET /api/bi/permission/validate`（frontend）
- `GET /api/bi/permission/filter`（frontend）
- `GET /api/erp/master-data/graphql`（frontend）
- `GET /api/finance/voucher-templates/apply`（frontend）
- `GET /api/finance/reports/consolidated/generate`（frontend）
- `GET /api/portal/gateway-security/audit/export`（frontend）
- `GET /api/portal/notifications/mark-all-read`（frontend）
- `GET /api/scm/sync/sync-logs`（frontend）
- `GET /api/scm/sync/statistics`（frontend）
- `GET /api/core/iam/permissions/verify`（frontend）
- `GET /api/core/iam/permissions/verify-multiple`（frontend）
- `GET /api/wms/sync/sync-logs`（frontend）

处理结果（2026-11-26）：17 条全部改为 POST，涉及 11 个 v74「端点绑定」占位文件
（`src/api/{ai,analytics,finance,portal,scm,wms,unified-core,erp}/*Ops*.ts`）。
这些模块页面并未接入（`grep` 无外部引用），所以改方法不影响页面；
`npx tsc` 通过，逐条 POST 实测：200 的有 profile/get、mark-all-read、sync-logs（scm/wms）、
gateway-security/audit/export；其余 422/400 是"需要请求体/参数"，属于正常语义，不再是 405。

## 用法

```bash
# 静态对账 + 按命名空间汇总（不需要后端在跑）
node scripts/ci/api-contract.mjs

# 只盯一个命名空间，打印明细
node scripts/ci/api-contract.mjs --only notification

# 实测分类（需要后端 8099 在跑 + token 文件）
node scripts/ci/api-contract.mjs --probe --json /tmp/api-contract.json

# 规格换来源（默认读 docs/api/openapi.json）
node scripts/ci/api-contract.mjs --spec http://127.0.0.1:8099/api/openapi.json
```

`--fail-on-missing` 只在开启 `--probe` 时按 `REAL_MISSING` 退出 1，所以它可以挂进流水线，
不会因为 313 条注解缺口天天红。

## 下一步建议

1. **补注解**：优先 core / erp / finance —— 这三块占了 600+ 条未覆盖，且都是高频页面在调。
   做法是给 handler 加 `#[utoipa::path]`，重跑 `cargo run -p topems-server --bin openapi-gen`。
   注意 `docs/api/openapi.json` 会被并行会话重新生成，改完尽快提交。
2. **stub 显形（已完成）**：`comm_stub` 现在返回 `X-Stub: true` + `"stubbed": true`，
   本脚本的 `--probe` 也优先按该头分类，不再依赖中文文案匹配。
3. **等注解补齐后**，把 `api-contract --probe --fail-on-missing` 挂进 `verify:frontend`，
   才真正具备"路径不存在就红"的能力。
