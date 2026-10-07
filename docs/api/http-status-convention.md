# TOPEMS HTTP 状态码约定

> 状态：已采纳（文档约定，零代码改动）｜日期：2026-10-07
> 关联：[unified-error-handling-decision.md](../architecture/unified-error-handling-decision.md)（TopemsError 体系 ADR，V517/Gate T）、[api-error-codes.md](./api-error-codes.md)（错误码手册）
> 取证口径：本文所有计数均为 `svc/` + `lib/` 下 `--include="*.rs"`、排除 `target/` 的实测值，命令与输出摘录见 §6。

---

## 1. 为什么需要这份约定

ADR V517（unified-error-handling-decision）已经把"错误出口"收敛到 `TopemsError` + `ErrorPayload` 信封，但**HTTP 状态码的选择规则**散落在 `classify()` 的 match 分支、各 svc 的手写 `ApiResponse::error(<数字>, ...)` 调用点、以及 `svc/ai` / `svc/finance` 自建的错误码映射里。实测现状（§6）：

- 手写 `ApiResponse::error(500, ...)` **1478** 处、`error(404, ...)` **915** 处、`error(400, ...)` **614** 处——状态码由每个 handler 手工决定；
- `StatusCode::UNPROCESSABLE_ENTITY` 枚举全仓 **0** 处，但字面量 `422` 在 `svc/finance`、`svc/ai` 有真实映射；
- 既有 `docs/api/api-error-codes.md` 手册本身把 `422`（Unprocessable Entity / COMMON_010）列为标准码，与本约定冲突（见 §5）。

本文档给出**唯一约定**，后续新增代码与存量迁移以此为准；现状不符之处只登记、不在本次改动（见 §5 后续修正项）。

---

## 2. 状态码总表（约定）

| 码 | 含义 | TOPEMS 约定语义 | 对应 TopemsError 变体（classify()） |
|---|---|---|---|
| **400** Bad Request | 请求本身有问题 | **一切校验错误 / 业务参数错误 / 请求体格式错误**。包括：必填缺失、类型/格式不合法、越界、JSON 解析失败、ID 无法解析、**业务规则不允许的操作请求** | `ValidationFailed`、`BusinessLogic`、`Validation`、`ConfigValidation`、`FileFormatError`、`InvalidUrl` |
| **401** Unauthorized | 未认证 | 没有 token、token 缺失/格式错误/已过期/已撤销、认证方案不支持。**"你是谁"这一步就没过** | `AuthenticationFailed`、`InvalidToken`、`Unauthorized`、`Auth`、`UnauthorizedStr` |
| **403** Forbidden | 已认证但无权限 | token 有效、身份已识别，但**无权执行该操作/访问该资源**；含功能权限不足、租户/部门隔离拒绝、操作状态不允许当前角色执行 | `PermissionDenied`、`OperationNotAllowed`、`ForbiddenStr` |
| **404** Not Found | 资源不存在 | 按请求的 ID/key 查询，记录确实不存在；或路由未匹配。**与 400 的边界：参数本身合法（格式对、可解析），只是指向的资源不存在** | `ResourceNotFound`、`FileNotFound`、`NotFound`、`ServiceNotFound` |
| **409** Conflict | 冲突 | 唯一约束冲突（重复创建）、并发修改冲突（版本/乐观锁失效）、资源状态机冲突（如"已完成的单据不可再审批"） | `ResourceAlreadyExists` |
| ~~422~~ | ~~Unprocessable Entity~~ | **禁止使用**。校验/业务参数错误一律走 400（§3.1）；状态机冲突一律走 409 | —（`classify()` 无 422 分支） |
| **500** Internal Server Error | 内部错误 | 一切服务端自身故障：DB/IO/Redis/序列化/配置加载/未分类错误。**客户端只收到通用文案 + errorCode，细节一律只进 `tracing::error!` 日志** | `Internal`、`Unknown`、`Database`、`Sql`、`Io`、`Serialization`、`RedisError`、`Config`、`ConfigLoad`、`EnvVarNotSet`、`CacheOperation`、`FileOperation` |
| 408 Request Timeout | 请求超时 | `RequestTimeout` |
| 502 Bad Gateway | 上游调用失败 | `NetworkRequest`、`HttpRequest` |
| 503 Service Unavailable | 依赖暂不可用 | `ServiceUnavailable` |
| 429 Too Many Requests | 限流 | 仅由限流中间件发出（`lib/shared-auth/src/middleware/rate_limit_enhanced.rs`、`svc/unified-core/src/middleware/rate_limit.rs`），业务 handler 不得自行使用 |

> 410 / 413 / 415 / 423 / 504 等码当前仅在 `svc/ai/src/dsh/standardization/mod.rs` 自建 ErrorCode 映射中出现，不在 TopemsError 体系内。约定：**业务 handler 不直接发明新状态码**；确需扩展时先在 `classify()` 加变体并更新本表。

---

## 3. 关键决策细则

### 3.1 400 与 422：一律 400，禁止引入 422

- **约定**：凡是"请求本身在语法/语义上不能被接受"——参数缺失、格式错误、值非法、业务规则不允许（如"金额必须为正""发票日期不能在未来""仅 Completed 单据可冲正"）——**一律返回 400 Bad Request**。
- **不使用 422 Unprocessable Entity**。理由：
  1. 全仓 `StatusCode::UNPROCESSABLE_ENTITY` 枚举引用 **0** 处，`classify()` 也没有任何分支产出 422——TopemsError 体系从未承认过 422；
  2. 400 与 422 在"客户端该怎么处理"上没有可操作差异（都是"别原样重试，改请求"），多一个码只会让前端错误分支膨胀；
  3. 业务规则错误与参数错误在 `classify()` 里已经统一收敛到 400（`ValidationFailed` / `BusinessLogic`），保持这个口径。
- **禁止**：新增代码不得出现 `StatusCode::UNPROCESSABLE_ENTITY`，不得新增 `ApiResponse::error(422, ...)`。

### 3.2 401 与 403：认证 vs 授权

| | 401 Unauthorized | 403 Forbidden |
|---|---|---|
| 判据 | **未识别身份**：无 Authorization 头、token 无效/过期/撤销 | **身份已识别**，但无权做这件事 |
| 典型场景 | 未登录、token 过期、token 伪造、MFA 未过 | 已登录但缺权限点、跨租户访问、角色不允许该操作 |
| 客户端动作 | 走登录/刷新 token 流程 | 不要重试，提示无权限 |

- 中间件层基准实现：`lib/shared-auth/src/middleware/permission.rs` 按此二分——未带/无效 token → 401，带了 token 但权限不足 → 403（实测该文件 401/403 成对出现，边界一致）。
- **灰色地带（待统一）**：账户锁定/禁用（AccountLocked / AccountDisabled）在 `svc/ai` 的自建映射里归 403，而 `api-error-codes.md` 的 `AUTH_007/AUTH_008` 归 401。约定口径：**登录请求阶段**认证失败（含锁定/禁用提示）返回 401；**已建立会话后**被禁用/锁定再访问受保护资源返回 403。现状不一致，登记为修正项（§5-3）。

### 3.3 400 与 404：参数错 vs 资源错

- **400**：参数本身不合法——`Uuid::parse_str` 失败、必填缺失、枚举值不存在、JSON 体解析失败。（`svc/integration` 迁移后的样板：`Invalid XXX ID` → 400 + `ValidationFailed`）
- **404**：参数合法、格式可解析，但指向的记录不存在——`SELECT ... WHERE id = $1` → `RowNotFound`。
- 判据一句话：**"你给的 ID 我读不懂" → 400；"我读懂了，但库里没有" → 404。**

### 3.4 409 Conflict 的三种用法

1. **唯一约束冲突**：创建时 `code`/`username`/`sample_no` 已存在（`unified-core` IAM user crud、`ResourceAlreadyExists`）；
2. **并发修改冲突**：乐观锁版本不匹配（`StaleReconciliation` 类）；
3. **状态机冲突**：资源当前状态不接受该操作——注意与 §3.1 的边界：**"前置业务规则在请求阶段就不满足" → 400**；**"资源已存在且处于某状态、此刻的动作与其冲突" → 409**。

### 3.5 500：细节只进日志

- 一切服务端故障走 `TopemsError` → `IntoResponse` → `ErrorPayload`，**HTTP 层恒为 500**。
- 客户端响应只含通用文案（"内部服务器错误"/"未知错误"）+ 机器可读 `errorCode`（`INTERNAL_ERROR` / `DATABASE_ERROR` / `SQL_ERROR` …）+ `trace_id`；**sqlx 错误、SQL 片段、表名列名、IO 详情一律只进 `tracing::error!` 日志，不进响应体**（与 ADR §2、§3.4 防泄露测试 `test_classify_does_not_leak_internal_details` 一致）。
- 存量手写 `Json(ApiResponse::error(500, &format!("...: {}", e)))` 由 ADR 的 codemod（`scripts/migrations/migrate_error_leaks.py`）持续收敛到 `TopemsError::internal(context, e)`，本约定不重复该迁移工作，只确认口径。

---

## 4. 与 TopemsError `classify()` 的衔接

`lib/shared-core/src/error/enhanced.rs` 的 `classify()` 是**唯一映射源**，状态码约定逐条落地如下（行号为本次取证时的版本）：

| TopemsError 变体 | HTTP | errorCode |
|---|---|---|
| `AuthenticationFailed` / `InvalidToken` / `Unauthorized` / `Auth` / `UnauthorizedStr` | 401 | AUTHENTICATION_FAILED / INVALID_TOKEN / UNAUTHORIZED / AUTH_ERROR / UNAUTHORIZED |
| `PermissionDenied` / `OperationNotAllowed` / `ForbiddenStr` | 403 | PERMISSION_DENIED / OPERATION_NOT_ALLOWED / FORBIDDEN |
| `ValidationFailed` / `BusinessLogic` / `Validation` / `ConfigValidation` / `FileFormatError` / `InvalidUrl` | 400 | VALIDATION_FAILED / BUSINESS_LOGIC_ERROR / VALIDATION_ERROR / CONFIG_VALIDATION_ERROR / FILE_FORMAT_ERROR / INVALID_URL |
| `ResourceNotFound` / `FileNotFound` / `NotFound` / `ServiceNotFound` | 404 | RESOURCE_NOT_FOUND / FILE_NOT_FOUND / NOT_FOUND / SERVICE_NOT_FOUND |
| `ResourceAlreadyExists` | 409 | RESOURCE_ALREADY_EXISTS |
| `Internal` / `Unknown` / `Database` / `Sql` / `Io` / `Serialization` / `RedisError` / `Config` / `ConfigLoad` / `EnvVarNotSet` / `CacheOperation` / `FileOperation` | 500 | INTERNAL_ERROR / UNKNOWN_ERROR / DATABASE_ERROR / SQL_ERROR / IO_ERROR / SERIALIZATION_ERROR / REDIS_ERROR / CONFIG_ERROR / CONFIG_LOAD_ERROR / ENV_VAR_NOT_SET / CACHE_OPERATION_ERROR / FILE_OPERATION_ERROR |
| `ServiceUnavailable` | 503 | SERVICE_UNAVAILABLE |
| `NetworkRequest` / `HttpRequest` | 502 | NETWORK_REQUEST_ERROR / HTTP_REQUEST_ERROR |
| `RequestTimeout` | 408 | REQUEST_TIMEOUT |

**例外逃逸口（需注意）**：`TopemsError::ServiceError { status_code, message }` 是可变码——`classify()` 直接透传上游传入的 `status_code`（`enhanced.rs:679`）。共享 `shared-service-client` 回传上游错误时可能借此带入非约定码。约定：该变体只允许透传上游真实的 4xx/5xx，不得在业务代码里用它发明新码；其中透传出 422 的情形应按 §3.1 在接入点改写为 400。

响应体形状以 `ErrorPayload`（`lib/shared-core/src/response.rs`）为准：`{ code, success: false, error_code?, message, timestamp, trace_id?, errors? }`。

---

## 5. 现状差异与后续修正项（本次不改代码）

以下为取证发现的、与本约定冲突或口径不一之处，如实登记：

| # | 位置 | 现状 | 与约定冲突点 | 建议处置 |
|---|---|---|---|---|
| 1 | `svc/finance/src/modules/settlement_v55.rs:175-183`（`http_status_code()`）+ 7 处 `ApiResponse::error(422, ...)`（:2006, :2024, :2185, :2202, :2272, :2304, :2364）+ 配套测试（:3986-4042, :5058, :5181） | 结算/支付业务规则错误（SelfTransfer、AmountAboveLimit、InvalidStatus 等 8 类）映射为 **422 Unprocessable Entity** | 违反 §3.1（业务参数/规则错误一律 400，禁用 422） | 后续将 `ValidationError::http_status_code()` 的 422 分支改为 400，7 处 `error(422,…)` 改为 `error(400,…)` 并同步测试断言；改完按 ADR 口径迁到 `TopemsError::BusinessLogic` |
| 2 | `svc/ai/src/dsh/standardization/mod.rs:369-407`（`ErrorCode::http_status`）+ `:516`（按 code 前缀映射） | 自建 ErrorCode→HTTP 映射：业务规则违规/InvalidState→**422**，且扩展 410/413/415/423/429/504 等码，不走 TopemsError | 422 违反 §3.1；其余扩展码未在 §2 总表内，属"业务 handler 发明状态码" | 后续并入 TopemsError 体系：422 分支改 400；413/415/429/503/504 等确有语义需求的，在 `classify()` 补变体并更新 §2 总表 |
| 3 | `docs/api/api-error-codes.md:106`（422 标准码表）+ `:130`（`COMMON_010` → 422） | 既有错误码手册把 422 列为"语义错误，无法处理" | 与 §3.1"422 禁止使用"直接冲突 | 后续修订手册：删除 422 行，`COMMON_010` 改挂 400；同时核对 `AUTH_007/008`（锁定/禁用）401 口径与 §3.2 灰色地带 |
| 4 | `lib/shared-core/src/error/enhanced.rs:1138-1142`（测试） | `TopemsError::ServiceError { status_code: 422, .. }` 的 `IntoResponse` 回归测试 | 测试本身合法（验证透传），但示例码选了 422，有误导性 | 后续把示例改为 400/409 等约定内码 |
| 5 | 全仓手写 `ApiResponse::error(<数字>, …)` 存量：500×1478、404×915、400×614、401×107、403×12、409×10、422×7 | 状态码散点手写，Gate T 迁移进行中 | 与 ADR 阶段三目标（手写调用降至测试以外为 0）一致，非本文档新问题 | 按 ADR §4.4 排期继续 codemod 迁移；Gate T 守住"只减不增" |

> 说明：`svc/ai` 映射中的 `ResourceLocked → 423`、`ResourceExpired → 410`、`QuotaExceeded → 429` 暂不判为错误——语义上合理，只是尚未纳入 TopemsError 体系；待 §5-2 的并表动作统一收口。

---

## 6. 取证附录：每条数字的 grep 命令与输出摘录

口径统一为：`cd /Users/xingzhai/TOPEMS && grep -rn <pattern> svc/ lib/ --include="*.rs" | grep -v target`。

### 6.1 422 现状

```bash
$ grep -rn "UNPROCESSABLE_ENTITY" svc/ lib/ --include="*.rs" | grep -v target
# （无输出，退出码 1）→ 0 处
```

```bash
$ grep -rn "422" svc/ lib/ --include="*.rs" | grep -v target | grep -v "cbf29ce484222325"
svc/ai/src/dsh/standardization/mod.rs:397:            | ErrorCode::InvalidState => 422,
svc/ai/src/dsh/standardization/mod.rs:516:            5 => 422,
svc/finance/src/modules/settlement_v55.rs:175:            // 业务规则不允许 → 422 Unprocessable Entity
svc/finance/src/modules/settlement_v55.rs:183:            | ValidationError::InvalidStatus(_) => 422,
svc/finance/src/modules/settlement_v55.rs:2006:        Err(sqlx::Error::Decode(msg)) => Json(ApiResponse::error(422, &msg.to_string())),
svc/finance/src/modules/settlement_v55.rs:2024:        Err(sqlx::Error::Decode(msg)) => Json(ApiResponse::error(422, &msg.to_string())),
svc/finance/src/modules/settlement_v55.rs:2180:    // 还原为 ValidationError，并通过 handler 返回精确 HTTP code（400/422）。
svc/finance/src/modules/settlement_v55.rs:2184:            // 保守：无法从 Box<dyn Error> 直接下钻时，以 422 抛出完整消息…
svc/finance/src/modules/settlement_v55.rs:2185:            Json(ApiResponse::error(422, &msg.to_string()))
svc/finance/src/modules/settlement_v55.rs:2202:        Err(sqlx::Error::Decode(msg)) => Json(ApiResponse::error(422, &msg.to_string())),
svc/finance/src/modules/settlement_v55.rs:2272:        Err(sqlx::Error::Decode(msg)) => Json(ApiResponse::error(422, &msg.to_string())),
svc/finance/src/modules/settlement_v55.rs:2301:    // PaymentResult 状态纯函数校验：…以 422 返回精确语义错误。
svc/finance/src/modules/settlement_v55.rs:2304:        Err(sqlx::Error::Decode(msg)) => Json(ApiResponse::error(422, &msg.to_string())),
svc/finance/src/modules/settlement_v55.rs:2364:        Err(sqlx::Error::Decode(msg)) => Json(ApiResponse::error(422, &msg.to_string())),
svc/finance/src/modules/settlement_v55.rs:3986:    fn http_status_code_422_for_business_rule_errors() {
…（3990-4042 测试断言、5058、5181 assert_eq!）
lib/shared-core/src/error/enhanced.rs:1138:            status_code: 422,
lib/shared-core/src/error/enhanced.rs:1142:        assert_eq!(resp.status().as_u16(), 422);
```

> 注：原始 `grep "422"` 共 31 行，其中 4 行是 FNV-1a 哈希常量 `0xcbf29ce484222325`（`svc/master-data/src/modules/disaster_v56.rs:537,2121,2128`、`svc/ai/src/dsh/cache/mod.rs:504`）的子串误报，已用 `grep -v cbf29ce484222325` 剔除；剔除后剩 27 行（生产映射 + 手写 error(422) + 测试断言）。

```bash
$ grep -rn "error(422" svc/ lib/ --include="*.rs" | grep -v target | wc -l
7
# 全部位于 svc/finance/src/modules/settlement_v55.rs
```

### 6.2 400 / BAD_REQUEST 现状

```bash
$ grep -rn "BAD_REQUEST" svc/ lib/ --include="*.rs" | grep -v target | wc -l
144
$ grep -rn "StatusCode::BAD_REQUEST" svc/ lib/ --include="*.rs" | grep -v target | wc -l
144          # 即全部 144 处都是 StatusCode::BAD_REQUEST 写法
$ grep -rn "axum::http::StatusCode::BAD_REQUEST" svc/ lib/ --include="*.rs" | grep -v target | wc -l
9            # 其中 9 处为全限定写法（等价，无语义差异）
```

手写数字码调用点分布：

```bash
$ for c in 400 401 403 404 409 422 500; do printf "%s: " $c; grep -rn "error($c," svc/ lib/ --include="*.rs" | grep -v target | wc -l; done
400: 614
401: 107
403: 12
404: 915
409: 10
422: 7
500: 1478
```

### 6.3 401 / 403 / 404 / 409 / 500 的枚举写法计数

```bash
$ grep -rn "StatusCode::UNAUTHORIZED" svc/ lib/ --include="*.rs" | grep -v target | wc -l
137
$ grep -rn "StatusCode::FORBIDDEN" svc/ lib/ --include="*.rs" | grep -v target | wc -l
48
$ grep -rn "StatusCode::NOT_FOUND" svc/ lib/ --include="*.rs" | grep -v target | wc -l
167
$ grep -rn "StatusCode::CONFLICT" svc/ lib/ --include="*.rs" | grep -v target | wc -l
10           # 注：另有 158 处 "CONFLICT" 是 SQL "ON CONFLICT" 子句，非 HTTP 码
$ grep -rn "StatusCode::INTERNAL_SERVER_ERROR" svc/ lib/ --include="*.rs" | grep -v target | wc -l
364
```

代表性语境抽样：

- **401/403 边界**：`lib/shared-auth/src/middleware/permission.rs`——:38/:90/:135/:180/:232 未认证→`StatusCode::UNAUTHORIZED`；:53/:101/:146/:195/:247 已认证但权限不足→`StatusCode::FORBIDDEN`（成对出现，与 §3.2 一致）。
- **404**：`lib/shared-core/src/error/enhanced.rs:475` `ResourceNotFound => StatusCode::NOT_FOUND`；`svc/pm/src/modules/*.rs`、`svc/unified-core/src/modules/iam/**` 广泛用于"记录不存在"。
- **409**：`lib/shared-core/src/error/enhanced.rs:530` `ResourceAlreadyExists => StatusCode::CONFLICT`；`svc/unified-core/src/modules/iam/user/crud.rs:246,277,358,546,579`（用户名重复创建）；`svc/unified-core/src/routes/business_tools/permission_api.rs:222`。
- **500**：`enhanced.rs:580-601` `Database`/`Sql`/`Io`/`Serialization`/`RedisError` 均 `tracing::error!` 后回通用文案 + 500，与 §3.5 一致。

---

## 7. 实施口径（给写代码的人）

1. 新 handler 一律 `-> HandlerResult<T>`，错误 `?` 上抛 `TopemsError`，**不要手写状态码**。
2. 必须手写时：校验/业务规则 → 400；资源不存在 → 404；唯一/并发/状态冲突 → 409；未认证 → 401；无权限 → 403；内部故障 → `TopemsError::internal(...)`（恒 500）。
3. 禁止新增 `422` / `StatusCode::UNPROCESSABLE_ENTITY`。
4. 任何进响应体的消息不得拼接 `{}` 内部错误变量；细节走 `tracing::warn!` / `tracing::error!`。
