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
| 405 改 POST 后复跑 | `1264 条 OK=1156 SOFT=104 FAIL=0 SKIP=2 DEGRADED=2`，405 归零 |
| 菜单注解 + 导出优化后 | `1264 条 OK=1157 SOFT=104 FAIL=0 SKIP=2 DEGRADED=1`，判定 OK |

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

## 补注解的正确姿势（踩过的坑）

`cargo run -p topems-server --bin openapi-gen` 不是纯增量合并：它会先把 base 里
"不在注解全集 ∩ /api/ 前缀 ∩ 非 SERVER_OWNED" 的路径**整条删掉**，再按各域注解重建。
拿当前 base 在临时目录干跑一次：`2470 条`，新增 12、**删除 11**——
删掉的包括 `/api/communication/notification/channels`、`/api/erp/system/company-settings` 等
手工维护的真实路径。直接跑会把它们弄丢。

所以本轮做法是：

1. 先给 handler 加 `#[utoipa::path]`，并注册进对应 crate 的 ApiDoc `paths(...)`；
2. `cargo build --bin openapi-gen`，在 `/tmp/gen/docs/api/` 放一份 base 副本，
   在临时目录跑生成器**干跑**，只取新增路径的 JSON；
3. 把这些路径对象手工合并进 `docs/api/openapi.json`（不删旧路径）；
4. `cargo build --release --bin topems-server` 让 `include_str!` 重新内嵌，重启验证。

本轮已按此合并 4 条：`GET /api/core/menu/{groups,groups/{id},menus,menus/{id}}`，
base 从 2469 → 2473，其余路径一条没动。

第二轮按同一流程补 core 的审计接口：`GET /api/core/system/audit-logs`、
`/audit-logs/{id}`、`/audit-logs/export`、`/audit-logs/stats`
（`svc/unified-core/src/modules/system_audit/mod.rs` 加 `#[utoipa::path]`，
登记到 `modules/openapi.rs`）。干跑增量 16 条（含 ehs / notification / menu），
只取这 4 条并入 base：**2473 → 2477**。顺带把列表接口的 `page_size` 钳位从 200 改成 100，
与 `PaginatedResponse` 内部上限对齐，避免"返回 200 行、metadata 写 100"的翻页错位。

## 顺带修的一个长耗时接口（`/api/core/system/audit-logs/export`）

并入前端清单后它每轮都超时（20s 上限，实测 40.6s 才返回）。原因不是 SQL：
同样的查询在 psql 里 2.2s；慢在 Rust 侧把 `SELECT *` 的 `request_details`/`response_details`
两个大 JSON 列一起解码再序列化。改成显式 8 列 + 轻量 `AuditExportRow` 后：

| | 耗时 | 返回 |
| --- | --- | --- |
| 改前 | 40.6s | 200，0 字节 |
| 改后 | 0.13s | 200，大数据集仍是 0 字节 |

**空体根因已定位并修复**：不是压缩中间件，而是**响应审计中间件**
（`lib/shared-auth/src/security/audit_logger.rs` 的 `read_body_bytes`）。

```rust
let bytes = to_bytes(body, max_size + 1).await.unwrap_or_default(); // max_size = 1MB
```

它为了给审计日志存一份响应快照，会把整个响应体读进内存；上限是
`max_response_body_size = 1MB`。一旦响应体超过 1MB，`to_bytes` 返回 `Err` **且原 body 已被消费**，
`unwrap_or_default()` 把它替换成空 `Vec`，客户端于是收到 `200 + content-length: 0`。
所有超过 1MB 的响应都会中招，不只是审计导出——用 `page_size` 二分可以稳定复现：

| page_size | 响应体 |
| --- | --- |
| 10 | 435KB（正常） |
| 12 | 925KB（正常） |
| 15 | 0 字节 |

修法：先看 `content-length`，超过快照上限就**跳过快照、原样透传**（审计日志只是少存这一段响应体，
不再破坏响应）；`to_bytes` 失败时也不再静默返回空体，改为保留空快照 + 打 `warn`。
这条路修完，`export?status=success`（10000 行 / ~10MB）与 `audit-logs?page_size=50..200` 都能拿到完整数据。


第三轮发现一类"注解写了但没登记"的沉没覆盖：全 crate 有 21 个 handler 已经写了
`#[utoipa::path]`，却没出现在 `modules/openapi.rs` 的 `paths(...)` 里，等于白写。
本轮把其中 15 条真正新增的路径补进 spec（另外 6 条与既有路径重复或属别名，未引入重复）：

| 组 | 新增路径 |
| --- | --- |
| doc 版本 | `/api/core/doc/documents/{id}/versions`、`/{version}`、`/{version}/restore` |
| flow 监控 | `/api/core/flow/monitor/instances/{error,overdue}`、`/instances/{id}/retry` |
| flow 版本 | `/api/core/flow/workflows/{id}/versions`、`/{version_id}`、`/{version_id}/activate` |
| iam | `/api/core/iam/permissions/grantable`、`/api/core/iam/users/{user_id}/company-scopes` |
| 订阅/开关 | `/api/core/subscriptions/plans`、`/api/core/system/feature-flags{,/{key},{/key/refresh}}` |

spec **2477 → 2492**，契约匹配 **2603 → 2626**（core 30 → 39）。
配套改动仅为可见性（`routes/feature_flag.rs`、`routes/subscription.rs` 四个 handler 改
`pub(crate)`，`routes/mod.rs` 的 `subscription` 模块同改），零行为变更。
## 下一步建议

1. **补注解**：优先 core / erp / finance —— 这三块占了 600+ 条未覆盖，且都是高频页面在调。
   做法是给 handler 加 `#[utoipa::path]`，重跑 `cargo run -p topems-server --bin openapi-gen`。
   注意 `docs/api/openapi.json` 会被并行会话重新生成，改完尽快提交。
2. **stub 显形（已完成）**：`comm_stub` 现在返回 `X-Stub: true` + `"stubbed": true`，
   本脚本的 `--probe` 也优先按该头分类，不再依赖中文文案匹配。
3. **等注解补齐后**，把 `api-contract --probe --fail-on-missing` 挂进 `verify:frontend`，
   才真正具备"路径不存在就红"的能力。

## 第十四轮：桩显形 + audit/settings 真实现补注解（2026-11-26 19:20）

### 1. system 配置类硬编码桩显形（`routes/system.rs`）

`config / cache/config / cache/stats / cache/clear / log/config / params` 这 6 个逻辑端点（v1 + 无 v1 双份共 10 个 handler）此前返回写死值（`site_name: "TOPEMS Unified Core"`、`cache stats` 全 0），却以 200 正常应答混在 OK 里。改为统一 `stubbed()` 出口，响应带 `X-Stub: true`：

```rust
fn stubbed<T: serde::Serialize>(data: T, message: &str) -> Response {
    let mut response = Json(ApiResponse::success(data, message)).into_response();
    response.headers_mut().insert("X-Stub", header::HeaderValue::from_static("true"));
    response
}
```

口径与 `comm_stub` 一致：冒烟把 `2xx + X-Stub` 判 SOFT（"stub：契约未实现"），不再冒充已验证接口。这批判定**不进 spec**，等接配置存储后再入契约。

### 2. audit / settings 真实现补注解

复核 `modules/audit/handlers.rs`：`list_permission_changes` 是把 `OperationLogQuery` 映射成 `source: "permission_audit_logs"` 后透传 `audit_query::query_audit_logs`；`get_permission_change` 真查 `public.permission_audit_logs`（id 为 bigint，须 `parse::<i64>()`）；`list_access_logs` 同理透传 `source: "audit_logs"`。`audit/mod.rs` 里 "权限变更审计 (stub)" 只是注释措辞过时，**不是桩**。

本轮补注解 19 个 handler：
- audit 11 条：`/api/core/audit/operations`、`/operations/stats`、`/operations/{id}`、`/permission-changes`、`/permission-changes/stats`、`/permission-changes/{id}`、`/permission-changes/export`、`/access-logs`、`/access-logs/stats`、`/access-logs/{id}`、`/access-logs/export`（tag `Core-Audit`）
- api-keys 5 条：`/api/core/system/api-keys`（GET/POST）、`/api/core/system/api-keys/{id}`（GET/PUT/DELETE）
- smtp 3 条：`/api/core/system/settings/smtp`（GET/PUT）、`/api/core/system/settings/smtp/test`（POST）

干跑增量里混入并行会话的 notification/ehs 变更（notification `channels`→`push-config/channels`、ehs `exam-*`→`check-*` 改名），**只并入本轮 19 个 handler 对应的 15 条路径**，其余留给对应会话。

### 数字

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| spec paths | 2492 | **2507** |
| 契约匹配 | 2626 | **2643** |
| core 缺口 | 197 | **180** |

剩余 core 180 条里最大簇已不是 stub 而是前端契约与后端真实缺口（tenant 77、根级 29、menu 10 等），system 34 条里有 12 条是这批桩（现在显形为 SOFT），不再进 spec。

## 第十五轮：冒烟 2 条 503「数据库繁忙」= 连接预算容量问题，不是接口缺陷（2026-11-26 19:40）

### 现象

桩显形后首轮全量冒烟 `1266 条 OK=1148 SOFT=114+10 FAIL=0 DEGRADED=2`，2 条 DEGRADED 是：

- `GET /api/wms/analytics/abc-analysis`
- `GET /api/wms/analytics/age-pareto`

都是 503「数据库繁忙，请稍后重试」，重试 3 次仍 503。冒烟结束后单独串行重测，两条均 **200、0.03–0.09s**，说明不是慢查询也不是接口坏了。

### 根因

服务日志给出真话：`topems_wms::modules::analytics: abc_analysis 开启租户作用域失败: pool timed out while waiting for an open connection`。

`lib/shared-db/src/database/budget.rs` 的连接治理 A 是「进程级总额度 + 建池期记账」：

- 嵌入模式（topems-server）总预算默认 = 推导池数 × `DEFAULT_CONNECTIONS_PER_POOL` = 31 × 2 = **62**
- 每池 `grant = min(申请值, 公平份额, 余额)`，公平份额 = 62/31 = **2**
- 即**每个模块池实际只有 2 条连接**，单体里任一模块并发到 3 就开始排队；排队超过 `acquire_timeout`(30s) 就 503

冒烟默认并发 3，wms analytics 三条端点撞在同一个只有 2 连接的池上，第 3 条必然等不到连接。这跟"审计大响应"无关（审计走 core 池，且已流式化）。

### 处理过程（两次踩空，最后才找到真阀门）

不改代码默认值（`DEFAULT_CONNECTIONS_PER_POOL = 2` 是按 prod `max_connections=100` 算的 31×2=62、留 38 条运维余量，动它会把 prod 余量压到 7 条），只在本机 `.env`（gitignored）调整。

**第一刀：只抬总额度 → 无效。** 设 `DB_TOTAL_CONNECTION_BUDGET=124`，启动日志 `granted=3/3`，每池确实从 2 涨到 3，但全量冒烟仍 `DEGRADED=3`、`pool timed out` 9 条，还是那三条 analytics。

原因是**单池申请值被另一个变量钉死在 3**：`lib/shared-bootstrap/src/lib.rs::embedded_pool_limits` 在嵌入模式下读 `DB_MODULE_MAX_CONNECTIONS`（默认 3），再 `default_max.min(configured_max)`。所以预算抬到 124 后，`grant = min(申请 3, 份额 4, 余额) = 3`，一分没多给。

**第二刀：松开单池申请值 → 生效。** 最终本机 `.env` 两行：

```
DB_MODULE_MAX_CONNECTIONS=6
DB_TOTAL_CONNECTION_BUDGET=186
```

- 单池申请 3 → 6；预算 31 池 × 6 = 186（本地 PG `max_connections=500`，当前占用 ~112 条，余量充足）
- 启动日志：`池 business 预约额度 granted=6/6（权重 1），已分配 6/186`

### 验证

| 口径 | 结果 |
| --- | --- |
| 每池授予 | 3 → **6**（`granted=6/6`）|
| `pool timed out` 日志计数 | 9 → **0** |
| 全量冒烟 | `1266 条 OK=1150 SOFT=114 FAIL=0 SKIP=2 DEGRADED=0`，判定 OK |

对比三档：每池 2（默认）→ DEGRADED=2，每池 3（只抬总额）→ DEGRADED=3，每池 6 → DEGRADED=0。**每池 3 是临界值，不够用；6 有明确余量。**

> 别的机器复现同样 503 时：先看日志有没有 `pool timed out while waiting for an open connection`，有就同时调 `DB_MODULE_MAX_CONNECTIONS`（单池申请值）和 `DB_TOTAL_CONNECTION_BUDGET`（总额，≥ 池数 × 单池值），并确认该机 PG `max_connections` 撑得住。只调总额度没用，单池申请值会把它夹住。

## 第十六轮：tenant 全家桶一次性进契约（core 缺口 180 → 101）（2026-11-26 21:20）

### 发现：77 条「缺失」几乎全是沉没覆盖，不是后端缺实现

前一轮 core 缺口 180 条里 tenant 占 77，看着像"前端写了 77 个租户管理接口、后端只有几个"。按 `svc/unified-core/src/routes/master.rs` 的路由表核对后结论相反：**后端租户模块有 90 条路由（82 个 handler），功能覆盖 analytics / billing / security / sessions / webhooks / integrations / domains / email-config / features / users 全家桶，但 `modules/tenant/handlers.rs` 里 `#[utoipa::path]` 一个都没有**——既没注解也没登记，spec 里 0 条，所以前端每一条都算"缺失"。

之前判断"这 77 条是前端空想接口"是错的；真问题仍是同一类：**注解缺失 → spec 缺失 → 契约误判为缺口**。

### 做法：从路由表反推注解，不用手写

1. 解析 `routes/master.rs` 得到 `(method, path, handler)` 共 90 对
2. 每个 handler 选一条主路径写 `#[utoipa::path]`（优先 `/tenant/{id}/...` 短路径），共注解 82 个 handler；tag 统一 `Core-Tenant`
3. `modules/openapi.rs` 登记这 82 个 handler
4. 干跑 `openapi-gen`，只并入 65 条 `/api/core/tenant*` 路径（同轮还有并行会话的 ehs/notification/audit 变更，未并入）
5. 剩下 8 条同 handler 的别名路径（`/tenant/tenants`、`/tenant/list`、`/tenant/{id}/metrics`、`/tenant/{id}/billing/invoices` 等）用"克隆同 operationId 的 path item"方式补进 spec，避免手写漂移

### 顺手修：3 条 POST 导出别名

前端 `writeOps.ts` / `security.ts` 用 `POST .../export`，后端只挂 GET，必然 404/405。给三处同一 handler 补 POST 别名（axum `get(h).post(h)`，单条 route 内合成，避免重复 route 注册 panic）：

- `/api/core/audit/permission-changes/export`
- `/api/core/audit/access-logs/export`
- `/api/core/tenant/{id}/security/audit-logs/export`

### 数字

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| spec paths | 2507 | **2578** |
| 契约匹配 | 2643 | **2722** |
| core 缺口 | 180 | **101** |
| core 命中 | 56 | **135** |

tenant 簇从 77 → **0**（POST export 也已补齐）。core 剩余 101 条的分布：`/api/core/*` 29（前端模板串无法静态解析）、system 23、iam 12、automation 8、menu 6、comments/favorites/file/flow 各 4、audit 3 等。

---

## 第十七轮（2026-11-27）：automation 零注解模块 + IAM 细分 + menu 写操作

### automation：又一个"有路由、零注解"模块

`routes/automation.rs` 有 35 条路由、`modules/automation/mod.rs` 有 33 个 handler，`modules/openapi.rs` 零登记 → spec 里 `/api/core/automation` 一条都没有。做法与 tenant 轮一致：按路由表反推，给 33 个 handler 补 `#[utoipa::path]`（tag `Core-Automation`），登记进 `paths(...)`。

同轮补齐 IAM 细分 16 条（check-email / check-username / positions / user-permissions / check-resource / permissions/metadata 等）与 menu 6 条写操作 + `my_menu_tree`。

### 踩坑：注解路径必须写"真实挂载路径"

首版 iam 注解照 `routes/iam.rs` 的相对路径写成 `/positions`、`/users/check-email`，生成的 spec 落在 `/api/core/positions`、`/api/core/users/check-email`。curl 实测：

| 路径 | 状态 |
| --- | --- |
| `/api/core/positions` | **404** |
| `/api/core/iam/positions` | 200 |
| `/api/core/users/check-email` | 404 |
| `/api/core/iam/users/check-email` | 200 |

`iam_routes(state)` 虽然 merge 在 core 根，但路由内部挂在 `/iam` 下（唯一例外是 `/iam/permissions/metadata` 由 `routes/mod.rs` 直接挂）。修正为统一 `/iam` 前缀后重新干跑，错误路径消失。

### 踩坑：干跑 diff 只能"路径级"，同路径新方法会漏

第一次合并只取了 `set(gen) - set(base)` 的**新路径**，结果 menu 写操作（`POST /api/core/menu/groups`、`PUT/DELETE /api/core/menu/groups/{id}`、menus 同构）虽然已在 gen 里，但路径本身早已存在（只有 GET），被我整条跳过。改为**按 path × method 取并集**，补进 7 个方法。

### 别名路径

`get_dashboard_stats` 同时挂 `/automation/dashboard` 与 `/automation/dashboard/stats`，`get_designer_resources` 同时挂 `/automation/designer/schema` 与 `/automation/designer/resources`；一个 handler 只能有一个 `#[utoipa::path]`，第二条路径用克隆同 operationId 的 path item 补进 spec（共 2 条）。

同时删掉 8 条已被后端改名/下线的陈旧路径（实测 404）：`occupational-health/exam-plans|exam-records`（4 条，已改名 `check-plans|check-records`）、`communication/notification/channels`（2 条，已改名 `push-config/channels`）、`communication/notify/list`（1 条，已改名 `notification/notify/list`）、`/api/core/users`（1 条，真实为 `/api/core/iam/users`）。

### 数字

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| spec paths | 2578 | **2620** |
| 契约匹配 | 2722 | **2784** |
| core 缺口 | 101 | **84** |
| core 命中 | 135 | **152** |

新增端点实测（全部 200）：`/api/core/automation/dashboard/stats`、`/health`、`/rules`、`/designer/resources`、`/api/core/iam/positions`、`/iam/users/check-email`、`/iam/user-permissions/me`、`/api/core/menus`。

core 剩余 84 条：`/api/core/*` 模板串 27（前端拼串，静态无法解析）、system 20（其中 10 条是已 `X-Stub` 显形的桩，刻意不进 spec）、comments/favorites 9、menu 6（本轮方法已并入，待重编译生效）、file 4、automation 3（前端 POST vs 后端仅 GET）、iam 3、mdm 3、flow 3 等。

---

## 第十八轮（2026-11-27）：engagement / MDM / file / flow / iam 状态 一次性入库

上一轮修的"path × method 并集"漏法立刻见效：重跑干跑后 menu 的 6 条写操作（`POST /menu/groups`、`PUT|DELETE /menu/groups/{id}`、`POST /menu/menus`、`PUT|DELETE /menu/menus/{id}`）全部进 spec，契约里 menu 簇归零。

本轮继续按"路由表反推注解"的套路，补 22 个 handler：

| 簇 | 条数 | 端点 |
| --- | --- | --- |
| engagement | 8 | `/comments`（GET/POST）、`/comments/{id}`（PUT/DELETE）、`/favorites`（GET/POST）、`/favorites/check`、`/favorites/{id}`（DELETE） |
| master MDM | 6 | `/mdm/refs`、`/mdm/refs/stats`、`/mdm/refs/sync-status`、`/mdm/refs/{master_data_id}`、`/mdm/refs/{master_data_id}/changes`、`/mdm/refs/by-code/{domain}/{code}` |
| iam 状态 | 3 | `/iam/users/{id}/disable`、`/enable`、`/password`(PUT) |
| file | 3 | `/file/files`、`/file/files/search`、`/file/download/{id}` |
| flow | 2 | `/flow/variables/global/{workflow_id}`、`/flow/rules/batch-update`(POST) |

`engagement`、`master`、`file/manage` 三个模块此前 `utoipa::path` 计数都是 **0**，与 automation 一样属于"实现完整、文档全空"。

### automation 的 3 条 POST 别名

前端对 `/automation/runs/{id}/steps`、`/runs/{id}/logs`、`/runs/{id}/logs/{log_id}` 用 POST 读数据，后端只挂 GET。按前几轮惯例补 `get(h).post(h)` 单条 route 合成。实测 `POST /runs/{uuid}/steps` 返回 **404（run 不存在）而不是 405**，说明路由已命中 handler。

### 数字

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| spec paths | 2620 | **2639** |
| 契约匹配 | 2784 | **2812** |
| core 缺口 | 84 | **56** |
| core 命中 | 152 | **180** |

新增端点实测：`/comments`、`/favorites`、`/favorites/check`、`/mdm/refs`、`/mdm/refs/stats`、`/mdm/refs/sync-status`、`/file/files`、`/file/files/search` 均 200；`/flow/variables/global/x` 400（id 非 UUID，路由命中）；`POST /comments`、`POST /menu/groups` 空体 422（校验生效，非 405）。

冒烟 `961 条 OK=899 SOFT=62 FAIL=0 SKIP=0 DEGRADED=0`。

core 剩余 56 条：`/api/core/*` 模板串 27（前端拼串）、system 20（10 条 `X-Stub` 桩刻意不入）、flow 3、audit 3、governance 2、comments/favorites 残余（`PUT|DELETE /comments/*` 等模板化路径）少量。

---

## 第十九轮（2026-11-27）：core 缺口清零 —— 先修"尺子"，再补接口

### 对账工具两处失真

`core` 缺口卡在 56 条时，先看剩下的都是什么：27 条 `/api/core/*` 模板串、20 条 system 桩、若干桩接口。模板串按旧口径是"静态无法解析"，但事实不是——前端用的是文件内常量：

```ts
const API_BASE = '/tenant';           // apps/web/src/api/tenant/index.ts
apiClient.core.get(`${API_BASE}/list`)
```

旧 `normCall` 把 `${API_BASE}` 直接归一成 `*`，于是 27 条全部对不上。给 `api-contract.mjs` 加**文件内字符串常量回填**：先用 `const NAME = '...'` 的值替换 `${NAME}`，剩下的才当变量。core 缺口 56 → 35，全局匹配 2812 → 2945。

顺带修了"尾部星号"的误判：`/audit/operations${qs}` 归一后是 `/audit/operations*`（星号黏在文字后，是 query 占位，要剥掉）；而 `/conversations/${id}` 归一后是 `/conversations/*`（星号自成一段，等价 spec 的 `{id}`，必须保留）。第一版一刀切剥掉所有尾部星号，全局匹配反而掉到 2541 —— 已按"星号前是否是 `/`"区分。这条值得记：**归一化规则改错，缺口数字会假性暴涨/暴跌**。

### 桩接口从缺口里分离

`system` 的 20 条 config/cache/log/params 与 `file/attachments`、`flow/form-definitions|instances` 都是已显形的 `X-Stub` 桩，刻意不进 spec。新增 `scripts/ci/openapi-known-stubs.json` 白名单，对账输出改成 `匹配 / 未匹配 / 已知桩豁免` 三个数，桩不再污染缺口。

### MDM 治理端点

`/mdm/approvals/*`、`/mdm/quality/*`、`/mdm/reconciliation/*` 共 10 个 handler 补注解（tag `Core-MDM`）。实测 `/mdm/approvals/pending`、`/mdm/quality/report`、`/duplicates`、`/stale`、`/mdm/reconciliation/logs` 全部 200。

### 顺手修正 main 里的 9 条漂移路径

上一轮为不回归而还原的 9 条 main 文档路径，实测本机 **404**；查 main 代码发现文档写的路径少了 `/iam`：

| 文档写的 | 真实路由 | 实测 |
| --- | --- | --- |
| `/api/core/v1/audit/logs` | `/api/core/iam/v1/audit/logs` | 404 → **200** |
| `/api/core/v1/audit/logs/stats` | `/api/core/iam/v1/audit/logs/stats` | 404 → **200** |
| `/api/core/v1/audit/sources` | `/api/core/iam/v1/audit/sources` | 404 → **200** |
| `/api/core/auth/refresh|logout|forgot-password|reset-password` | `/api/core/iam/auth/...` | 404 → 405(POST-only)/正常 |
| `/api/communication/notify/list` | `/api/communication/notification/notify/list` | 重复项，删除 |

`notify/list` 是重复路径（同模块另一条已存在），直接删。

### 数字（core 清零）

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| spec paths | 2639 | **2657** |
| 契约匹配 | 2812 | **2959** |
| core 缺口 | 56 | **0** |
| 已知桩豁免 | — | 26 |

冒烟 `970 条 OK=908 SOFT=62 FAIL=0 SKIP=0 DEGRADED=0`。

`core` 由 236 条前端调用、211 条命中、0 条缺口收口；剩余 26 条桩单独计数。

---

## 第 20/21 轮：ERP 域（169 → 34）

### 结构：单体 spec 与 ERP 自带 spec 双轨

`svc/server/src/modules/erp_real_module.rs` 以 lib 形态内嵌 `topems-erp`（`api_prefix=/api/erp`），但单体 `/api/openapi.json` 由 `svc/unified-core` 的 `OpenApi` 产出；ERP 自己的 `ErpApiDoc`（`svc/erp/src/modules/openapi.rs`，手写 `paths(...)` 清单）由 `svc/server/src/bin/openapi_gen.rs` 合并进来。于是 ERP 大量 handler 既无 `#[utoipa::path]`、也未登记到 `paths(...)`，共 169 条缺口。`/api/erp/openapi.json` 之类 per-service 端点一律 404，拿不到分域 spec，只能靠 route 表反推。

### 做法

1. 解析 `svc/erp/src/modules/*.rs` 的 `.route(path, method(handler))`，把前端 missing 路径归一 `{x}`→`*` 后匹配，得 130 唯一路径、122 条有真实路由（8 条是前端拼串 artifact，如 `/master-data-refs/query-records-handler`）。
2. 两轮脚本给 handler 插 `#[utoipa::path]`（第二轮全局搜 `pub async fn`，解决跨文件）；登记 `crate::modules::<file>::<fn>`。
3. `mdm_v49_{archive,lifecycle,retirement,stats}` 是 `#[path]` 私有子模块，需先 `pub(crate) mod`，登记路径写 `crate::modules::mdm_v49::mdm_v49_xxx::<fn>`。
4. 42 处既有注解的 path 写的是**前端名**（如 `list_archive_records` 注解 `/api/erp/mdm-v49/list-archive-records`，真实 route 是 `/mdm-v49/archive/records`），按 route 表批量纠正。

### 五个坑（都踩过）

- **注解 path 必须是真实挂载路径**：拿前端路径当注解，生成器照样产出，但一测就是 404。ERP 侧真实前缀是 `/api/erp`，模块内 route 不带前缀。
- **幻影路径会让缺口数假性变小**：先前的 spec 里塞过一批前端名字的幻影路径，ERP 缺口只有 70；重建时按真实 route 收口，缺口反而显示 206。缺口小不等于对，冒烟 404 才是判据。
- **本地 HEAD 的 spec 会污染重建**：本机工作区落后 `origin/main`，重建基底里带着 8 条 `/api/core/v1/audit/*`、`/api/core/auth/*` 漂移路径，被并回后冒烟立刻 FAIL，需手动剔除并补回 `iam/v1/audit`、`iam/auth`。
- **链式方法别名要按括号配对解析**：`\.route("/x", get(h).post(h2))` 用正则只抓第一个方法，漏掉 POST/PUT/DELETE。改用括号配对取 `.route(...)` 全部实参后，按「path × method」并集克隆，ERP 别名从 19 条补到 30 条，缺口 45 → 34。
- 克隆别名会把其他命名空间的 `operationId` 带进来造成重复，统一改名 `erp_<slug>_<method>`、tag 改 `ERP-Alias`（本轮重命名 126 处）。

### 数字（ERP）

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| spec paths | 2657 | **2789** |
| spec 中 erp 段 | 151（含幻影） | **280（gen 真源）** |
| 契约 erp | 400 / 231 / 169 | **400 / 366 / 34** |
| 冒烟 | 970 条 FAIL=0 | 967 条 **FAIL=0** |

剩余 34 条是**后端确实没有对应路由**的写接口（如 `POST /api/erp/asset-categories`、`POST /api/erp/leave-requests`、`POST /api/erp/production-orders` 的集合级写），属功能缺口，不用 spec 造假补平。

### 收尾：customers 500 与最终冒烟

spec 加到 2794 后全量冒烟多跑出 1 条 FAIL：`GET /api/erp/customers` 500，日志 `error occurred while decoding column "credit_limit": unexpected null`。`Customer.credit_limit` 是非空 `Decimal`，而列表 SQL 直接选裸列，库里该列可空。12 处 customers SQL 改为 `COALESCE(credit_limit, 0)` 后 200。

最终冒烟（干净 origin/main 构建，spec 2794）：`1017 条 OK=950 SOFT=67 FAIL=0 SKIP=0 DEGRADED=0`。条数从 967 涨到 1017 是 ERP 新增的 280 路径带来的，不是回归。

---

## 第 22 轮：file 域（51 → 1）

### 现象

契约里 `file` 是 51 条调用、0 条命中——全 namespace 裸挂。而代码里 `svc/unified-core/src/routes/file.rs` 明明有路由，`file::file_routes` 也已被 `.nest("/file", ...)` 挂到 `/api/core/file/*` 上。

### 根因

路由挂了、**注解没挂**：file 模块三个文件里只有 3 个 `#[utoipa::path]`（download、files 列表、files 搜索），剩下 15 个真实 handler 零注解、也没登记进 `svc/unified-core/src/modules/openapi.rs` 的 `paths(...)`。生成器只认注解集，于是 spec 里 file 只有 3 条，契约自然全灭。

另外 41 条是"死代码子域兜底"：images / scan / storage / attachments 这些前端已调、后端既无 handler 也无表，路由层用 `stub_list` / `stub_action` 返回 200 假信封——文档里一条都没有，但它们每天都在冒充成功。

### 做法

1. 15 个真 handler 补注解（tag `Core-File`，path 写相对 `/file/...`，生成时统一加 `/api/core` 前缀）：upload、upload/multiple、preview、thumbnail（含 `{id}/{size}` 兼容版）、files/{id} 的 get/put/delete、move、copy、permissions 的 get/post、shared、stats、export。
2. 全部登记进 `unified-core/src/modules/openapi.rs`。
3. 兜底桩统一走新增 `stubbed()` 出口，响应头带 `X-Stub: true`——冒烟据此判 SOFT，不再冒充 OK；同时**刻意不进 spec**，41 条全部写进 `scripts/ci/openapi-known-stubs.json`（清单从 23 条涨到 64 条），对账里单独计为"已知桩豁免"。
4. 前端 `fileApi.getStats` 打的是 `/files/stats`，后端既有 `/stats`，按别名克隆补一条 GET。

### 数字

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| spec paths | 2794 | **2807** |
| 契约匹配 | 3094 | **3103** |
| file 契约 | 51 / 0 / 50 | **51 / 9 / 1** |
| 已知桩豁免 | 26 | **66** |

剩 1 条是前端 `` `/thumbnail/${id}${qs}` `` 的拼串被归一成 `/thumbnail`（路径参数被当成 query 占位剥掉的工具口径假阴性），后端 `/thumbnail/{id}` 实际可用。

冒烟 `1020 条 OK=953 SOFT=67 FAIL=0`。

---

## 第 23 轮：iam / im（自动补注解器 + 两个结构坑）

### 新增工具 `scripts/ci/openapi_backfill.py`

把前几轮手工做法固化成脚本：解析 `.route(...)`（括号配对，不怕链式方法）→ 对"既有注解又有路由"的 handler 反推挂载前缀 → 给同块内缺注解的 handler 生成 `#[utoipa::path]` → 登记到该 crate 的 `paths(...)`。默认 dry-run，`--apply` 才落盘。

### 坑 1：路由在 routes/ 或 server crate，handler 在别处

IAM 的路由在 `svc/unified-core/src/routes/iam.rs`，handler 在 `modules/iam/*`；IM 的路由干脆写在 `svc/server/src/modules/communication_real_module.rs`，handler 在 `svc/communication/src/im.rs`。只扫一个 crate 会得出"路由 0 个"的假结论。脚本因此拆成：定义扫描（全 crate）+ 路由扫描（`--routes-filter` / `--routes-extra` 可指向别的 crate）。

### 坑 2：前缀要按"路由块"推，不能按文件推

`communication_real_module.rs` 一个文件里同时挂着 notification 块（前缀 `/notification`）和 im 块（前缀 `/im`）。第一版按文件投票，多数票是 `/notification`，于是 15 条 im 注解全写成 `/notification/rooms/...`——生成器照单全收，冒烟必 404。改成以 `Router::new()` 划分块、按块投票后，前缀正确取 `/im`。（这一版错误注解已整体回滚重做。）

### 坑 3：私有子模块

`modules/iam/user/{batch,access_log,profile}.rs` 是私有 `mod`，登记 `crate::modules::iam::user::batch::*` 直接 `E0603: module is private`，需要改 `pub(crate) mod`。

### 数字

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| spec paths | 2807 | **2875** |
| 契约匹配 | 3103 | **3157** |
| iam 缺口 | 32 | **1**（`POST /iam/auth/sessions/revoke-all` 后端无路由） |
| im 缺口 | 35 | **19**（均为后端确实没有的写接口） |

iam 的 22 条无参 GET 全部实测非 404；`GET /api/communication/notification/channels` 实测 **404** 而 `/notification/push-config/channels` 200，说明 server crate 里那块 `/notification/channels` 路由是死挂载，注解里的 `push-config` 才是对的。

## 第 24 轮：finance（版本化子模块的挂载前缀 + 三源并集）

finance 起于 285 条前端调用、命中 95、缺口 190。结构结论全部靠 HTTP 实测得出，不靠读代码猜：

- 主挂载是 `/api/finance`：169 条无参 GET 探 `/api/finance<route>`，163 条非 404。
- versioned 子模块（`risk_v54`、`settlement_v55`、`tax_v56`、`reports_v57`、`treasury_v58`、`risk_v59`、`decision_v60` 等）是 `merge` 进主 router，而各自 route 自带 `/finance-v54/...` 前缀，因此真实路径是 `/api/finance/finance-v54/risk/alerts`（实测 200）；注解若写 `/finance-v54/...`，`normalize_path` 会规范成 `/api/finance-v54/...`（实测 404，幻影路径）。
- `cqrs_routes.rs` 的真实挂载是 `mod.rs` 里的 `.nest("/cqrs", cqrs_routes::cqrs_routes())`，原来 `path = "/api/finance/views/receivable-aging"` 自身就是 404。

### 做法

1. `sed` 把 5 处 `path = "/finance-v` 改成 `/finance/finance-v`，先消掉幻影前缀。
2. `openapi_backfill.py --crate svc/finance --force-prefix /finance --apply`：本轮给它加了 `--force-prefix`（不再投票猜前缀）、`--min-votes`、`--routes-extra`、`--apply`；同时修了 impl 块误插、同名跨文件 def、`modules/mod.rs` 的路径归属、`skip_dup_ann`。
3. `cqrs_routes.rs` 整文件注解前缀纠正为 `/finance/cqrs/...`。
4. 重建 spec 前先做三源并集：gen 输出 + 合并前本地 spec + `git show origin/main:docs/api/openapi.json`。第三次踩到"只并前两者"，把 main 已有的 `/api/finance/reports/income-statement/generate` 弄丢，补回后确认零丢失。
5. 剔除 3 条实测 404 的幻影路径（`/api/finance/events`、`/stats`、`/views/receivable-aging`），再跑 150 条无参 GET 实测：**0 条 404**。

### 数字

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| spec paths | 2875 | **3162**（live 也是 3162） |
| finance 注解 | 0 | **323 条新增**（另 337 条登记） |
| 契约 finance 调用/匹配/缺口 | 285/95/190 | **285/248/37** |
| 全量冒烟 | 1041 FAIL=0 | **1141 条 FAIL=0**（OK=1062 SOFT=78 SKIP=1） |
| spec 超集（vs origin/main） | — | 新增 path 277 / 新增 method 20 / **丢失 0** |

### 踩坑与验证

- `docs/api/openapi.json` 是 minified 单行且被 `registry.rs` 用 `include_str!` 内嵌，改完必须重编译重启才生效，否则 live spec 与文件不一致。
- `openapi-gen` 是"修剪式"生成：base 里不在注解集的路径会被删掉，所以合并必须显式三源并集，不能拿 gen 输出直接覆盖。
- 本机磁盘一度写满导致 Bash 输出目录创建失败（`No space left on device`）；期间 `cargo check` 出现 0.17s 就 `Finished` 的可疑输出，用"临时追加 `compile_error!("probe")` 再回滚"确认 cargo 确实在编译 finance，不是空跑。
- 剩余 37 条缺口的性质已分清：`/balance-sheet/*`、`/income-statement/*`、`/aux-accounts`、`/payments`、`/ar/collections`、`/reconcile/auto` 等是后端真没有对应路由；`risk/alerts/*/acknowledge|resolve`、`compliance/report` 是路径参数型；最后一组 `GET|POST /api/finance/api/core/settlement-center/*` 是前端 `src/api/finance/settlementCenter.ts` 把 `/api/core/...` 直接拼在 finance baseUrl 上造成的双前缀，属前端拼串 bug，需先确认 `/api/core/settlement-center/*` 本身是否 200 再决定改前端还是加别名。

### 提交口径

本机工作区 HEAD 落后 origin/main 较多，`git diff origin/main -- svc/finance/src` 里 `mod.rs`、`financial_reports.rs`、`openapi.rs`、`expense_status.rs` 存在大段"删除"，实为 main 已合入的 W5-B 租户谓词加固（`try_tenant_id_from_claims` + 显式 `tenant_id` 谓词）等新版内容。整目录拷贝会把这些回退掉，因此本轮不拷源码，改为在 `origin/main` 的干净 worktree 内重跑 `openapi_backfill.py`，只拷 spec 与本文档。

## 第 25 轮：finance 收口（注解三件套一致性）

第 24 轮把 190 条缺口压到 37，但压不下去的部分不是"没注解"，而是三类一致性缺陷：**注解写了没登记**、**注解 path 不是真实挂载路径**、**注解方法写错**。这一轮把三者做成脚本，逐个消掉。

### 三个新脚本

| 脚本 | 解决的问题 |
| --- | --- |
| `scripts/ci/annotate_missing_routes.py` | spec 里没有的 (method, path) 反查 handler，插最小注解。默认 dry-run，`--apply` 落盘 |
| `scripts/ci/register_annotated_handlers.py` | 有注解但没进 `openapi.rs` 的 `paths(...)` 的 handler 补登记。gen 只输出登记过的 handler，**注解写了不登记等于白写** |
| `scripts/ci/check_route_annotations.py` | 路由真实路径 vs 注解 path 对账，报告幻影路径（`--fix` 反向改写注解） |

### 踩到的四个真实缺陷

1. **注解 path 指向别人的路径**：`list_collections_handler` / `create_collection_handler` 写成 `/api/finance/collections`，真实挂载是 `/api/finance/ar/collections`；`create_payment_record_handler` 写成 `/api/finance/payment-records`，真实是 `/api/finance/ap/payments`。前端调的一直是真路径，所以 spec 里查不到、实测却 200。
2. **方法写错**：`generate_compliance_report_handler` 的路由是 `get("/finance-v54/compliance/report")`，注解写成了 `post`，spec 里就只有 POST，GET 永远对不上。同一 handler 还挂着一条早已废弃的 `/api/finance/compliance-v51/reports/generate` 注解。
3. **`normalize_path` 的前缀匹配没有边界**：注解写 `/finance-v54/...` 时，它按"`/finance` 域前缀"替换，产出 `/api/finance-v54/...`（实测 404）。必须写 `/finance/finance-v54/...`。这一轮把 finance 里 7 处 `path = "/finance-v` 全部改成 `/finance/finance-v`。
4. **登记脚本的子串判重会漏**：`"crate::modules::financial_reports::get_balance_sheet"` 是 `...get_balance_sheet_history` 的子串，被判为"已登记"，实际漏了。改成按行精确匹配后补上 2 条。

### 数字

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| spec paths | 3162 | **3190** |
| finance 契约 调用/匹配/缺口 | 285/248/37 | **285/281/4** |
| finance 无参 GET 实测 | 150 条 0 404 | **161 条 0 404** |
| spec 超集（vs origin/main） | 缺失 0 | 新增 path 28 / method 12 / **缺失 0** |

### 剩下 4 条的性质（不是文档问题，是代码问题）

- `POST /api/finance/finance-v56/tax/comparison`：后端无此路由（tax_v56 只有 `tax/plans` 等）。
- `PUT /api/finance/reconciliation/items/diff/batch`：后端无批量接口，只有单条 `PUT .../items/{id}`。
- `POST /api/finance/forecasting/alerts/rules`：后端只有 `rules/{rule_id}` 的读写与 `alerts/summary`。
- `POST /api/finance/voucher-templates/{template_id}/export`：后端 `export` 是 **GET**，前端按 POST 调，方法不一致。

这 4 条要么补后端路由，要么改前端调用，属于功能口径决策，不在"补文档"范围内，先如实留缺口，不用别名糊过去。

## 第 26 轮：workflow / flow（登记错文件 + 别名克隆 + 桩白名单）

workflow 命名空间 211 条调用、命中 81、缺口 130。第一层原因不是缺注解，而是**注解写在一个没人引用的 openapi.rs 里**。

### 关键发现：`modules/flow/openapi.rs` 是死文件

`svc/unified-core/src/modules/flow/` 下有 131 条 `Auto-Backfill` 注解，看起来覆盖率不低；但 `flow/openapi.rs` 的 `FlowApiDoc` 在整个仓库里没有任何引用（`grep FlowApiDoc` 零命中）。真正被合并进单体 spec 的是 `svc/unified-core/src/modules/openapi.rs` 里的 86 条 `crate::modules::flow::*` 登记。往死文件里补登记的第一次尝试完全无效——spec 里 flow 路径数不升反降（83→73，因为偏好用别处的旧版本覆盖）。

判断"哪个 openapi.rs 是真身"的方法：**grep 该 `OpenApi` 派生结构名**，有引用才是活的；只看目录结构会被同名文件骗。

### 做法

1. `register_annotated_handlers.py --crate-root svc/unified-core/src/modules/flow --crate-prefix crate::modules::flow --openapi svc/unified-core/src/modules/openapi.rs --apply`：补登记 62 条（另 84 条本就在册）。
2. 新增 `scripts/ci/clone_route_aliases.py`：一个 handler 常挂在多个路由上（`/tasks/my` 同时是 `/tasks/my/involved|created|cc`），utoipa 只能声明一个 path，别名只能克隆。按"路由 → handler → 已登记注解 path"反查，把 operation 原样克隆到真实路径并写 `x-alias-of`。本轮克隆 16 条。
3. 72 条 `stub_list/stub_action/stub_detail` 兜底路由写进 `scripts/ci/openapi-known-stubs.json`（64→134 条），对账时单列为"桩豁免"，不硬塞进 spec。

### 数字

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| spec paths | 3190 | **3243** |
| spec 内 flow 路径 | 73 | **126** |
| workflow 契约 调用/匹配/缺口 | 211/81/130 | **211/144/5** |
| workflow 桩豁免 | 0 | **62** |
| flow 无参 GET 实测 | — | **55 条 0 404** |

### 剩下 5 条

- `POST /api/core/flow/workflows/import`、`POST /api/core/flow/rules/batch`：后端没有这两个 POST。它们被 `/workflows/{id}`、`/rules/{id}` 的 GET/PUT/DELETE 参数路由吸住，所以 `OPTIONS` 返回 `allow: GET,HEAD,PUT,DELETE`、POST 直接 405。后端实际是 `/templates/import` 和 `/rules/batch-update`，属前后端命名不一致。
- `GET|PUT|DELETE /api/core/flow/*/*`：前端 `utils.ts` 的通用 CRUD 模板字符串（`${endpoint}/${id}`），静态分析归一成 `*/*`，是工具口径假阴性。

### 复用到其他命名空间的顺序

`annotate_missing_routes.py`（补注解）→ `register_annotated_handlers.py`（补登记，注意选对真身 openapi.rs）→ `clone_route_aliases.py`（别名克隆）→ 桩分流到 `openapi-known-stubs.json` → HTTP 实测无参 GET。

## 第 27 轮：notification（双重 /notification 前缀 + 桩分流 + 幻影路径清理）

notification 命名空间 166 条调用、命中 44、缺口 122。这一轮最大的收获是**先分清"前端错"还是"挂载就是这么绕"**——`/notification/notification/channels` 看起来像 bug，实测是真实路径。

### 真相：`notification_router` 本身就带一层 `/notification`

`svc/server/src/modules/communication_real_module.rs` 里 `notification_router` 被 `.nest("/notification", ...)` 挂到 `api_prefix = /api/communication` 下，而 router 内部又有 `"/notification/channels*"`、`"/notify/*"` 这类自带前缀的路径。于是真实路径是两段 notification：

- `/api/communication/notification/notification/channels` → **200**
- `/api/communication/notification/channels` → **404**

前端 `apiClient.notification` 的 baseURL 就是 `.../api/communication/notification`，再拼 `'/notification/channels'` 恰好对上——**不是前端 bug，是后端挂载与注解路径双向不一致**。

### 做法（四件套 + 一条新规则）

1. **兜底桩分流**：`communication_real_module.rs` 里 `NOTIF_STUB_GET/POST/PUT/DELETE` 四组常量共 106 条（`webhooks/groups/digests/topics/scheduled/providers` 等资源后端只有空壳 `comm_stub`），展开成 `/api/communication/notification<path>` 写进 `openapi-known-stubs.json`（134→240 条），缺口直接 122→13。这些是**真桩**（返回 200 + `x-stub: true`），留在白名单里比硬塞 spec 诚实。
2. **注解 path 必须带第二层 `/notification`**：`send_notification`、`broadcast_notification`、`mark_all_as_read`、`list_notifications` 的注解原本是 `/notify/send` 这类裸路径，规范化后变成 `/api/communication/notify/send`（404 幻影）。改成 `/notification/notify/send` 等才对上真实挂载。
3. **channels CRUD 走别名克隆**：`list_channels`/`create_channel`/`get_channel`/`update_channel`/`delete_channel` 的注解都指向 `/notification/push-config/channels*`（同一个 handler 两处挂载），utoipa 只能声明一个 path，7 条 `/notification/notification/channels*` 用克隆补齐并写 `x-alias-of`。
4. **一个 handler 多方法的克隆**：`delete_all_notifications` 同时挂在 `POST /notifications` 和 `POST /notifications/bulk-delete-all`；`mark_as_read` 注解是 PUT `/notification/notifications/{id}`，但前端按 `POST /notify/{id}/read` 调，克隆时按路由方法覆盖。

### 幻影路径清理与豁免机制

收尾实测发现 spec 里有 2 条线上 404 的路径：`/api/communication/notification/channels`、`/api/communication/notify/list`。它们不是本轮引入的，而是 `origin/main` 上已经文档化错了，并集合并时又被带回来。

给 `scripts/ci/spec-superset-check.mjs` 加了 **`--allow-file` 豁免机制**（默认 `scripts/ci/spec-prune-allowlist.json`）：main 上文档化但实测 404 的路径可以登记豁免，脚本打印 `WAIVED` 而不是判失败，每条都要求写清实测证据。这样"删幻影"和"不许回退"两个目标不再互相打架——**允许删，但必须留证据**。

### 数字

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| notification 契约 调用/匹配/缺口 | 166/44/122 | **166/57/0** |
| notification 桩豁免 | 0 | **109** |
| known-stubs 总数 | 134 | **240** |
| spec paths | 3243 | **3266** |
| communication 无参 GET 实测 | — | **30 条 0 404** |

### 结论与遗留

notification 命名空间契约缺口清零，但清零的构成要看清：166 条里 **57 条真实命中 + 109 条桩豁免**。真桩覆盖的 `webhooks/groups/digests/topics/scheduled/providers` 目前只有 `comm_stub` 空壳，是继续走桩还是补真实实现，需产品口径决策——这是缺口，不是已完成。

## 第 28 轮：wms（注解缺失 14 + 登记缺失 81 + 前端/后端路径漂移）

wms 262 条调用、命中 159、缺口 103。这一轮是"纯机械缺口"最大的一次：**路由都在，只是没注解、没登记**。

### 做法

1. **按路由反查注解**：解析 `svc/wms/src/modules/*.rs` 里的 `.route(...)`，14 个 handler 完全没有任何 `#[utoipa::path]`（`list_sync_records`/`get_wms_dashboard`/`list_audit_modules`/`pick_line` 等），插最小注解（method + path + `tag = "wms"`）。
2. **补登记**：`register_annotated_handlers.py --crate-root svc/wms/src/modules --crate-prefix crate::modules --openapi svc/wms/src/modules/openapi.rs --apply`，一次补 81 条（另有 138 条本就在册）。wms 的 `openapi.rs` 是自己 crate 内的真身（`svc/server/src/bin/openapi_gen.rs` 直接引用 `topems_wms::modules::openapi::WmsApiDoc`），不存在第 26 轮那种"往死文件补登记"的坑。
3. **路径漂移**：`list_alerts`/`get_alert`/`get_alert_statistics`/`acknowledge_alert` 注解写的是 `/api/wms/inventory-alerts*`，前端调的是 `/api/wms/alerts*`——两套挂载都真实存在（`inventory_alert.rs` 的 `create_routes` 里双写），所以 4 条走别名克隆而不是改注解，避免动到已经在用的老路径。

### 数字

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| wms 契约 调用/匹配/缺口 | 262/159/103 | **262/257/5** |
| wms 注解 handler | 206 | **220**（0 未登记） |
| spec paths | 3265 | **3339** |
| wms 无参 GET 实测 | — | **63 条 0 404** |

### 剩下 5 条（后端真缺，不是文档问题）

- `POST /api/wms/cycle-counts`、`PUT|DELETE /api/wms/cycle-counts/{id}`：`cycle_count.rs` 只有 `GET` 列表、`GET {id}`、`POST {id}/generate`、`POST generate-all`，**没有配置的增改删**。
- `POST /api/wms/discrepancies`：只有 `GET` 列表与 `{id}/approve|adjust`、`process-stock-take`，没有创建差异单的入口。
- `POST /api/wms/labor/shifts`：`labor.rs` 的 `/labor/shifts` 只挂了 `GET`。

这 5 条要补后端路由或改前端调用，属功能口径，按第 26 轮同口径如实留缺口。

### 复用到其他命名空间的顺序

`annotate_missing_routes.py`（补注解）→ `register_annotated_handlers.py`（补登记，注意选对真身 openapi.rs）→ `clone_route_aliases.py`（别名克隆）→ 桩分流到 `openapi-known-stubs.json` → HTTP 实测无参 GET。

## 第 28.5 轮：修回 `fd5197008` 的过度清理（main 上 296 条活接口被删）

第 28 轮提交前 rebase 时撞上别人刚推的 `fd5197008 fix(ci): … OpenAPI 清理 370 条并补 notify/list 别名`，spec 从 3265 掉到 2962，finance 命名空间的对账从 4 缺口反弹到 161，wms 的新增也被打乱。查下来这不是"清理幻影"，而是**把线上还活着的接口一起删了**，并且有的 path 只留下了部分 method。

### 判定方法：不看文档、打真请求

对 `c0bc69540`（清理前）与清理后的 main 做 operation 级差集，逐条打真实请求（GET 直发，POST/PUT/DELETE 发 `{}`，带 token 与 `X-Tenant-Id`），只有 **404 / 405** 才算真删。

- 差集 304 条 path：**296 条线上存活**，只有 8 条确实打不通（还都是带路径参数的，无法用占位符判别）。
- 再按 method 级差集补一轮：**33 个 operation 是"path 留着、method 被删"**（如 `/api/finance/accounts` 只剩 POST，GET 被删）。

全部恢复后：spec 3035 → **3339**，全量对账 **匹配 3345 → 3517**，finance 回到 **285/281/4**（4 条是第 25 轮就认定的后端真缺）。

### 沉淀

新增 `scripts/ci/restore_pruned_ops.py`：`--base <ref> --apply`，干跑只报告、加 `--apply` 才写回；把"清理前必须先用真实请求验证"固化成可复跑脚本。今后任何人做 spec 裁剪，先跑一遍这个脚本，能直接挡住"清理把活接口删掉"这一类回退。

## 第 29 轮：ehs（路由链式注册漏扫 + 120 条未登记 + 20 条别名克隆）

ehs 203 条调用、命中 105、缺口 98。根因有两个：

1. **`openapi.rs` 里注册用的是裸模块名**（`accident::list_accidents`），不是 `crate::modules::…`；而且这个 crate 的 handler 绝大多数压根没登记（123 条路由里 120 条不在册）。
2. **路由用链式方法**（`.route("/drills", get(list).post(create))`），只扫 `get(x)` 单方法的解析会漏掉一半 handler，`create_drill_record`/`create_record`/`create_plan` 这类都在漏网名单里。

### 做法

1. 用括号配对解析 `.route("path", <expr>)`，把 expr 里所有 `get|post|put|delete|patch(handler)` 都收进来（229 个 route↔handler 对，比旧解析多 106 个）。
2. 29 个 handler 没有任何注解 → 按真实路由插最小注解。
3. `register_annotated_handlers.py --crate-prefix super` 补登记 83 条；裸模块名要改成 `super::<mod>::<fn>` 才能编译（`self::` 不行，`openapi.rs` 的 `self` 是它自己这个模块）。
4. 20 条前端路径与注解路径不一致的走别名克隆（`/environmental-compliance/assessments` ↔ `evaluations`、`/drills` ↔ `/drills/records`、`/hazardous-materials/inventory` ↔ `/hazardous-materials`、`/accidents` ↔ `/incidents`、`/emergency-plans` ↔ `/checks/plans`、`/sync` ↔ `/sync-records`、`/sync/to-qms` ↔ `/sync/hazard-to-qms` 等），全部先用真实请求确认线上 200/422 再克隆。
5. 3 条孤儿注解路径实测 404，清掉并登记到 `spec-prune-allowlist.json`（`stock-records` 真实名是 `movements`；`occupational-health/exam-plans|exam-records` 从未挂载）。

### 数字

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| ehs 契约 调用/匹配/缺口 | 203/105/98 | **203/202/0** |
| ehs 注解 handler | 185 | **215**（0 未登记） |
| ehs 桩豁免 | 0 | **1**（`GET /api/ehs/health` 是 bootstrap 内建健康检查，非业务 API） |
| spec paths | 3339 | **3385** |
| ehs 无参 GET 实测 | — | **48 条 0 404** |

### 值得复用的两条规则

- 遇到 `[...] openapi.rs` 里用裸模块名注册的 crate，`--crate-prefix` 要传 **`super`**，不是 `crate::modules`。
- 扫路由必须做括号配对 + 多方法链解析，否则 `.route(a, get(x).post(y))` 会静默漏掉写接口——ehs 的 98 条缺口里有一多半是这个解析 bug 造成的。

## 第 30 轮 · mes（2026-11-27）

`mes_real_module.rs` 的 `api_prefix` 是 `/api/mes`，注册真身 `topems_mes::modules::openapi::MesApiDoc`（`svc/server/src/bin/openapi_gen.rs:158`），注册风格 `crate::modules::<mod>::<fn>`。本轮 242 调用 / 146 匹配 / 96 缺口 → **226/225/0**（1 条健康检查入桩豁免）。

### 两个解析坑（都不是 mes 独有）

- **路由与 handler 不在同一个文件**：`material_bom/mod.rs`、`quality_management/mod.rs` 里声明 `.route("/boms", get(bom_handlers::list_material_boms).post(bom_handlers::create_material_bom))`，handler 在同目录 `bom_handlers.rs`。只按"本文件内路由 → 本文件内 handler"匹配会整批漏掉，且 `get(...)` 里带 `::` 限定名时，正则 `[A-Za-z0-9_]+` 一个都匹配不到。正确做法是把路由表建成**全局**的，按 `fn` 名回查，只接受同目录或该目录 `mod.rs` 里的声明。
- **判断"是否已有注解"不能用邻近窗口**：`#[utoipa::path(...)]` 是多行的，`grep -B6` 或"最后一处 `#[utoipa::path(`" 都会误判，本轮因此一度给 235 个已有注解的 handler 插了重复注解。可靠判据是"从上一个顶格 `\n}\n` 到 `fn` 之间是否出现 `utoipa::path`"，出事后用 `git show origin/main:<file>` 整体还原重做。

### 顺带修掉的前端死代码

`apps/web/src/api/mes/readOps.ts`、`readOps2.ts` 里 9 条调用把路径写死成 `'/analytics/oee-dashboard/{_id}'` 这类**字面量占位符**（没做模板插值，实际请求会打到 `{_id}` 这个字面段），且两个文件全仓库零引用——页面用的是 `api/mes/analytics.ts` 与 `kanban.ts` 里的正常实现。已删除这两个文件，缺口随之消失；真实接口在 spec 里都有（`/api/mes/analytics/*`、`/api/mes/kanban/*`、`/api/mes/maintenances`）。

### 数字

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| mes 契约 调用/匹配/缺口 | 242/146/96 | **226/225/0** |
| mes 注解 handler | 153 | **174**（0 未登记） |
| mes 桩豁免 | 0 | **1**（`GET /api/mes/health`，bootstrap 内建模块健康检查） |
| spec paths | 3385 | **3411** |
| mes 无参 GET 实测 | — | **111 条 0 404**（`/anomaly/rules/{rule_id}` 属模板路径，不参与） |
| mes 写接口实测 | — | 6 条 POST 全 **422**（路由存在、校验拒绝） |

## 第 30.5 轮 · 幻影路径归位 + 本机漏跑迁移（2026-11-28）

mes 收口后跑全量冒烟，从 1215 条涨到 1232 条（spec 增大），冒出 8 条 FAIL。逐条定性后不是本轮代码问题，但都属于"闸门该绿"的存量缺陷：

- **rd 2 条 500**：`rs.experiments.created_by` 仍是 `uuid`，代码按 `Option<String>` 解码。仓库里早有迁移 `database/migrations/20261020000010_rd_experiments_created_by_varchar_results_jsonb.sql`，**只是本机库没跑过**。用 `MIGRATE_URL`（`topems_owner`）执行后 `created_by` 变 `varchar`、`results` 变 `jsonb`；注意 `topems_app` 没有表属主权限，必须用 owner 跑。改列型后要重启进程，否则 sqlx 预编译计划报 `cached plan must not change result type`。
- **core 3 条 404**：iam 的用户自助接口挂在 `/api/core/iam` 下，但注解 `path` 写的是裸 `/users/me*`，规范化后成了 `/api/core/users/me*` 幻影。实测 `/api/core/iam/users/me`、`/permissions`、`/preferences` 均 200。
- **finance 3 条 404**：`cqrs_routes` 的 router 是 `.nest("/cqrs")`，注解却写成 `/api/finance/...`。实测 `/api/finance/cqrs/{stats,events,views/receivable-aging}` 全 200，根路径全 404；顺带把该文件里另外 5 条同源幻影（`commands/post-voucher`、`reverse-voucher`、`views/voucher-summary`、`views/rebuild`、`views/replay`）一并归位。

做法：注解改真身路径 → 重新生成 spec → 把 14 条幻影从 spec 删掉 → 进 `spec-prune-allowlist.json` 留痕（现 19 条），`spec-superset-check --allow-file` 判定无回退。

### 一条容易踩的豁免语义

`spec-prune-allowlist.json` 里**带 `method` 的条目只豁免"方法丢失"，不豁免整条 path 丢失**。整条 path 被删必须写不带 `method` 的条目，否则超集检查照样报 `LOST PATH`。

## 第 31 轮 · bi（2026-11-28）

注册真身 `topems_analytics::openapi::ApiDoc`（`svc/analytics/src/openapi.rs`），路由全量集中在 `svc/analytics/src/routes.rs`（`merge` 成一张平表，`api_prefix=/api/bi`），handler 分布在 `modules/bi/*.rs` 与 `modules/report/*.rs`。契约 **150 调用 / 82 缺口 → 150/0**。

### 四个坑

- **注册脚本的前缀语义**：`openapi.rs` 在 crate 根，`paths(...)` 里写的是 `modules::bi::xxx`（相对根）。用 `--crate-prefix modules` 会生成 `modules::modules::bi::...`，编译报 `cannot find`。这类 crate 应传**空前缀**（`--crate-prefix ''`），并顺手把 `modules::main::*`、`modules::routes::*` 纠正为 `crate::routes::*`（`routes.rs` 里的 handler 不在 `modules` 下）。
- **一个 handler 挂多个路径**：`list_permission_rules` 同时挂在 `/permissions/row-level`、`/permissions/data`、`/permission/rule`；`get_summary_analytics` 同时挂 `/summary` 与 `/analytics/summary`（注释写着"兼容遗留路径 v7.7 前"）。utoipa 一个 handler 只能声明一个 path，所以必须**选前端真正调用的那条做 canonical**，其余用 spec 级 `x-alias-of` 克隆补上。选错（选了遗留路径）会反过来把前端路径打成缺口。
- **占位绑定文件**：`apps/web/src/api/analytics/{readOps,readOps2,readOps3,writeOps}.ts` 是 v74「端点绑定」占位，注释自己写着"页面未接入"，全仓库零引用，路径里还是字面量 `{id}`。这四份文件贡献了 82 条缺口里的 60 多条，直接删除；真实能力在 `src/api/bi/*` 与 `src/api/report/index.ts` 里。
- **catch-all 会吞缺口**：`bi` 路由里有 `/{module_id}` 兜底，spec 归一成 `/api/bi/{module_id}` 后能匹配任何单段路径，于是前端调 `/api/bi/report-types`（实际返回 400 `Unknown module: report-types`）、`/api/bi/health` 这种请求在契约工具里"命中"了，不会被判缺口。这类只能靠实测定性：`report-types` 无后端实现（`listReportTypes` 已删，构建页那段查询本来就只取 `isLoading`，数据从未被使用）；`/api/bi/health` 是真实健康检查，入 known-stubs。

### 数字

| 指标 | 轮前 | 轮后 |
| --- | --- | --- |
| bi 契约 调用/匹配/缺口 | 150/68/82 | **150/150/0** |
| analytics 注解 handler 登记 | 78 | **188**（0 未登记） |
| spec paths | 3408 | **3482**（+74：新登记 + 9 条 alias） |
| 桩豁免 | 242 | **243**（`GET /api/bi/health`） |

### 第 31 轮收尾 · 全量冒烟暴露的两处真缺陷（`d8e26856a`）

- **`GET /api/crm/recommendations` 500（panic）**：`crm.customer_recommendations.confidence` 是 `numeric(8,2)`，代码按 `f64` 用 `Row::get(6)` 解码，sqlx 类型不匹配直接 panic（`customer_recommendation.rs:145`）。三处 SELECT/RETURNING 统一 `confidence::float8 AS confidence` 并改 `try_get("confidence")`，实测 200。三个写接口（创建/单条查询）靠同一 SELECT 修复。
- **`GET /api/monitor/metrics/history` 404**：该 path 只存在于 spec（注解路径与真实挂载不符），真实路由是 `GET /api/monitor/metrics`（实测 200）。从 spec 删除并入 `spec-prune-allowlist.json`（20 条），超集检查打印 WAIVED、判定 OK。
- 收尾数据：spec 3481，live 3481（同一次 release 重编译）；全量冒烟 **1243 条 OK=1160 SOFT=82 SKIP=1 FAIL=0**；全量契约 **4758 / 3752 / 767**（较上一轮 849 缺口再降，bi **149/149/0**）。

## 第 32 轮 · ai（74 → 0）

**基线**：ai 200 调用 / 126 匹配 / 74 缺口。

**做法**
1. 删前端 v74 占位绑定 `apps/web/src/api/ai/{readOps,writeOps}.ts`（零引用、`{id}` 字面量），缺口先降到 66。
2. 路由真源是 `svc/ai/src/routes.rs`（180 条 `.route(...)`）+ `modules/chat_conversations.rs` 内嵌 `create_routes()`（7 条，routes.rs 用 `merge` 挂载，单文件扫描扫不到）；`register_routes_with_legacy_alias` 把 protected 同时挂在 `/api/ai` 与 `/api/core/ai/v1`。
3. 56 个 handler 无注解（`case::document::get` 这类 `crate::modules::…` 限定名、以及同名 `classify/history/generate/feedback` 分散在 analysis/qa/document/code_assistant/embedding/recommendation）→ 按"handler 所属模块目录"打分定位文件后插最小注解；`register_annotated_handlers.py --crate-root svc/ai/src --crate-prefix crate` 补登记 61 条。
4. 三个幻影归位（不写进 spec）：
   - `/api/ai/mcp`、`/api/ai/mcp/sse`：MCP 路由 merge 在进程根路径（`/mcp`、`/mcp/sse` 实测 200），注解写裸 `/mcp` 会被规范化成 `/api/ai/mcp`。
   - `/api/ai/health/detailed`：属 `public_routes`，单体 `ai_real_module` 下未挂载（实测 404；`/api/ai/health` 200 是 server `registry.rs` 的通用模块探活 `/api/{svc}/health` 兜底，不是 ai 自己的 handler）。
5. 修尺子：`api-contract.mjs` 的 `normCall` 对相邻模板 `` `/${id}${qs}` `` 会折叠成 `**` 再被"尾部星号=查询串"规则整段吃掉，误报 `DELETE /api/ai/dify/conversations`；加 `\*{2,}` → `*` 归一。
6. 三个前端函数无后端路由且全仓库零引用 → 删函数（`businessCopilot.getSessionMessages`、`businessIntelligence.generateDocument`、`governanceDashboard.recordSecurityEvent`），不留给"契约匹配"当假象。

**结果**：ai **180/180/0**；ai spec 内 54 条无参 GET 实测 0 404；spec 3481 → 3522；全量冒烟 **1260 条 OK=1177 SOFT=82 SKIP=1 FAIL=0**。

## 第 33 轮 · doc（72 → 34，只做到"如实留缺口"）

**基线**：doc 98 调用 / 26 匹配 / 72 缺口，路径前缀 `/api/core/doc`（`unified-core` 的 `embedded.rs` 里 `api_prefix=/api/core` + `routes::doc` 再 `.nest("/doc")`）。

**做法**
1. 路由真源 `svc/unified-core/src/modules/doc/handlers.rs`（92 条 `.route(...)`），注册真身 `svc/unified-core/src/modules/openapi.rs`（原本只登记 18 条）。
2. 71 个 handler 无注解 → 按全路径 `/api/core/doc+路由` 插注解（不能写裸路径：`normalize_path` 会按 domain 拼成 `/api/doc/...` 幻影）；`register_annotated_handlers.py --crate-root svc/unified-core/src --crate-prefix crate` 登记 73 条。
3. **分流**：71 个 handler 里 36 个返回 200（空数据兜底），34 个直接 `ApiResponse::not_found("待上游支持")`。后者**退回注解、撤登记、从 spec 删 op**，不拿"文档化"当闭环——它们是真缺口，保留在契约里计数。
4. 删前端死函数 `template/assignment.ts::importTemplate`（后端无 `/templates/import` 路由，全仓库零调用方）。

**结果**：doc **97/63/34**（较 72 降 38），spec 3522 → 3557，doc 46 条 path；doc 13 条无参 GET 实测 0 404。**剩 34 条后端未实现**（明细见 `/tmp/doc_404_list.txt` 与提交说明）：模板审批流程（submit/approve/reject/cancel）、模板版本（create/update/activate/rollback/fork/diff/compare）、模板克隆/复制/导出/渲染/依赖、文档版本发布/回滚、文档锁、评论增改、协作者增改、工作区 CRUD/移入回收站/恢复。这些需要产品口径（真做还是前端下掉），不是契约层能补的。

附：本轮冒烟顺带暴露 `GET /api/scm/purchase-items` 500（`quantity` NUMERIC 按 f64 解码）。查证 **main 早已修**（`193a1c695` 把 `PurchaseItem.quantity` 改 `Decimal`），本机工作区该文件落后才复现；已从 `origin/main` 取回两个文件、重编译后实测 200，本轮不重复提交该修复。

## 第 34 轮 · master（53 → 1）

**基线**：master 314 调用 / 246 匹配 / 68 缺口；路径前缀 `/api/master-data`（`svc/master-data/src/main.rs` 的 `api_prefix`）。

**做法**
1. 删 5 个前端占位绑定 `apps/web/src/api/master-data/{readOps,readOps2,readOps3,writeOps,writeOps2}.ts`（全仓库零引用），缺口先降到 53。
2. 路由真源 `svc/master-data/src/modules/mod.rs`：整文件是一串 `.nest(...)`（quality-v51 / lineage-v52 / kg-v53 / versioning-v54 / mdm-v55..v60 / dict / mdm-v66 / master-data / suppliers）。**`/api/master-data/master-data/{materials,uoms,samples}` 的双层段不是幻影**——`.nest("/master-data", ...)` 就挂在 `/api/master-data` 前缀下，前端调用与真实挂载一致。
3. 21 个真实 handler 无注解（`master_data.rs` 15 条物料/UOM/样品 CRUD、`supplier_master.rs` 5 条供应商 CRUD、`supplier_category_dict.rs` 1 条只读类别）→ 按全路径 `/api/master-data/...` 插最小注解，`register_annotated_handlers.py` 登记；顺手把早已注解但漏登记的 `kg-v53/categories` 补进 `paths(...)`。注意脚本会重复插入已登记项（`ai_governance_v59::get_suggestions` 报 E0428/E0119），需手工去重。
4. **mdm-v66 预埋段**（`mod.rs` 的 `/mdm-v66` nest，30 条路由）全部指向 `contract_fallbacks::{ok,list,array}` 共享兜底函数——返 200 空数据，但共享函数无法一函数一注解。按项目既有口径"200 空数据可文档化"，在 spec 里补 34 条 op 并打 **`x-placeholder: true`**，description 明确写"由 contract_fallbacks 承接，V66 后端落地后替换"，不冒充真实实现；`mdm-v59/governance/entity/{type}/{id}` 同理（共享 `list` 兜底，前端两段调用）。
5. **如实留缺口（1 条）**：`POST /api/master-data/mdm-v57/graph/embeddings` 的 handler 已注解，但实现是 `ApiResponse::not_implemented("Embedding 服务未接入")`（需配 `embedding_model` 由 AI 服务提供）。**撤登记、不进 spec**——501 未实现不算闭环。
6. 生成器坑复现：`openapi-gen` 是修剪式，必须用 **release 产物**（`target/release/openapi-gen`）；`target/debug/openapi-gen` 是上一轮的旧二进制，会漏掉本轮新注解（本轮先踩了一次：gen 里 0 条新 master-data op）。合并固定三源并集：gen 输出 ∪ 合并前本地 spec ∪ `git show origin/main:docs/api/openapi.json`。

**结果**：master **280/279/1**；spec 3557 → **3590**（+22 真实登记 +34 占位）；master 14 条无参 GET 实测全 200，`--probe` 分类下 master-data 的 SPEC_GAP / REAL_MISSING / NEEDS_PARAM 均为 0。

### 第 34 轮收尾 · 全量冒烟暴露的真缺陷：`GET /api/wms/locations` 500

`wms.locations.capacity` 是 `numeric(15,2)`，本机 `location.rs` 的 SELECT/RETURNING 直接取 `capacity`、按 `Option<f64>` 解码 → 列表接口 500（`error occurred while decoding column "capacity": mismatched types; Rust type Option<f64> (FLOAT8) is not compatible with SQL type NUMERIC`）。查证 **main 早已修**：`30880a671`（第八批新建入口可用性）已把 6 处 SELECT/RETURNING 改成 `capacity::float8 AS capacity`，本机工作区该文件落后才复现（与第 33 轮 scm `quantity` 完全同型）。已把 `origin/main` 版本取回本地、重编译后冒烟复测 FAIL=0，本轮**不重复提交**该修复。同类隐患（NUMERIC 列按 f64 解码）已连续三轮各命中一次，建议后续对 `numeric` 列做一次全仓解码审计。

## 第 35 轮 · pm（50 → 0）

**基线**：pm 153 调用 / 103 匹配 / 50 缺口；前缀 `/api/pm`（`svc/pm/src/main.rs` 的 `api_prefix`），路由真源是各模块 `create_routes()`，由 `modules/mod.rs` 逐个 `merge`。

**做法**
1. 按 `(method, path)` 把 spec 里没有的路由全量枚举（共 58 条）→ 反查同文件 handler 插最小注解，`register_annotated_handlers.py --crate-prefix crate::modules` 登记 50 条。
2. 8 条被"邻近注解"误判跳过、实际无注解的（`create_budget_item`、contract/report 两个同名 `get_template`、`create_document_version`、`create_folder`、`create_risk_event`、`create_integration/update_integration`），按精确位置单独补。
3. **删 2 条死路由登记**：`pm_plugin.rs` 定义了 `/api/plugins/info|health`，但 `create_routes()` 没被 `mod.rs` merge，真实路径 `/api/pm/api/plugins/*` 实测 404；把 `openapi.rs` 里这两条登记去掉（根路径 `/api/plugins/*` 属 plugin-registry 服务，main 的 spec 里另有）。

**坑（脚本侧，四个）**
- `register_annotated_handlers.py` 的 `--crate-prefix` 必须是 `crate::modules`；传 `crate` 会生成 `crate::task::update_task` 这种不存在的路径（本次踩了一次，回滚 openapi.rs 重跑）。
- 脚本插在 `paths(...)` 末行后可能漏逗号（`plugin_health_check` 后直接换行）→ `expected ','`。
- 已登记项会被重复插入（`pm_plugin::plugin_health_check` 出现两次）→ `E0428/E0119`，需手工去重。
- 只看"往前 1500 字符内是否有 `utoipa::path`"会把上一个函数的注解误算成本函数的（8 条被跳过），确认方式仍是"自上一个顶格 `\n}\n` 起这段是否含 `utoipa::path`"。

**结果**：pm **153/153/0**；`--probe` 下 pm 的 SPEC_GAP / REAL_MISSING / NEEDS_PARAM 全为 0；spec 3590 → **3592**。

## 第 36 轮 · mobile（49 → 4）

**基线**：mobile 142 调用 / 93 匹配 / 49 缺口；前缀 `/api/mobile`（`main.rs` 的 `api_prefix`），路由真源是 `svc/mobile/src/shared/mod.rs::build_protected_routes()` 一张 222 条的大平表（另有 `modules/mobile_plugin.rs::create_routes()` 合到 public 侧）。

**做法**
1. 按 `(method, path)` 把 49 条缺口对回真实路由：**44 条路由已存在、只是没有注解**。给 handler 插最小注解（全路径 `/api/mobile/...`），`register_annotated_handlers.py --crate-root svc/mobile/src --crate-prefix crate` 登记 41 项。`register_push_device` 是 import 别名（真身 `push_notification::register_device`），需按真身注解。
2. **补 3 条真路由**（handler 早已存在，缺挂载）：`POST /attendance/clock-in`、`POST /attendance/clock-out`（与 `check-in/out` 同一动作，前端 `attendance.ts` 两个名字都声明）、`PUT /mobile-tasks/{id}/status`（原只有 POST，前端 `updateTaskStatus` 用 PUT）。
3. **补 1 个真实现**：`GET /documents/stats`。它此前没有路由，被 `/documents/{id}` 的 `Path<Uuid>` 吞掉返回 **400**（`Cannot parse id with value stats`），前端 `document.ts` 又确实在调。新增 `get_document_stats` 按 status/category 聚合当前用户可见文档，静态段显式成路由。
4. **修字面星号路径**：`api-contract.mjs` 报的缺口路径是 `*`，插注解时照抄会写成 `path = "/api/mobile/documents/*"` 这类非法模板（14 处）。统一改回 `{id}`，并把 spec 里 8 条历史遗留的 `*` 字面路径删掉。
5. 4 条同义路径用 **spec 级别名 op（`x-alias-of`）**：`/attendance/overview`→`/attendance`、`/dashboard/stats`→`/stats/dashboard`、`/attendance/clock-in|out`→`/attendance/check-in|out`（这几条共用同一 handler，一个函数只能带一个注解）。

**如实留缺口（4 条，后端确实没有实现）**：`POST /approvals/templates`、`POST /approvals/delegations`、`POST /inventory/stocktake`（只有 GET 列表，无创建）、`POST /production/orders/{id}/pause`（`contract_fallback.rs` 里刻意返回 503——MES 无 pause 动作，"写操作绝不假成功"）。

**结果**：mobile **142/138/4**；spec 3592 → **3613**。

## 第 37 轮 · scm（47 → 0）

**基线**：scm 135 调用 / 88 匹配 / 47 缺口。路由真源 `svc/scm/src/modules/*::create_routes()`（141 条 `.route`，由 `modules/mod.rs` 逐个 merge），挂载前缀 `/api/scm`（单体走 `svc/server/src/modules/scm_real_module.rs` 的 `api_prefix`）。

**做法**
1. 47 条里 **41 条路由已存在、只缺注解**：按 `(method, path)` 对到 handler，37 个补 `#[utoipa::path]`，另 5 个（`mrp::list_suggestions`/`get_suggestion`、`purchase_order::confirm_order`/`cancel_order`/`close_order`）本就有注解、只是没登记。`register_annotated_handlers.py --crate-root svc/scm/src --crate-prefix crate` 补登记 41 条。
2. `GET /api/scm/health` 是真实路由（`sync_records::scm_health`，实测 200），只是历史注解集里没有，一併补注解+登记。
3. **删死代码**：`apps/web/src/api/scm/factory.ts` 是一个泛型 CRUD 工厂（`/${resource}`、`/${resource}/${id}`），全仓 **零引用**，却给契约工具贡献了 5 条 `*` 泛化调用（`GET /api/scm/*` 等）。删除后 scm 调用基数 135 → 130，缺口不再是"假缺口"。
4. 2 条同义真实路径走 **spec 级别名 op**（`x-alias-of`）：`GET /api/scm/mrp-suggestions`、`GET /api/scm/mrp-suggestions/{id}` 与 `mrp.rs` 里真正挂载的 `/mrp/suggestions`、`/mrp/suggestions/{id}` 同一 handler，一个函数只能带一个注解，故克隆 op。

**反向体检**：把 spec 里 94 条 scm 路径×方法逐条对回真实路由，**幻影 0 条**。
**实测**：写接口返回 422（缺字段，说明路由与反序列化都在）/ 200 / 业务 404（"供应商评估不存在""检验记录明细不存在"），无 404 路由缺失、无 405。

**结果**：scm **130/130/0**；spec 3613 → **3622**。
