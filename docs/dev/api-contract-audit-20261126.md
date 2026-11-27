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
