# 生产配置真源与回执纠正（2026-11-24）

## 结论：生产机（xingzhai Mac mini）的配置真源是 plist + Keychain，不是 `.env.production`

生产机回执推翻了本轮前半段的假设，且证据扎实，经代码侧核对**全部成立**：

- `.env.production` 在生产机上根本不存在；
- launchd `com.topems.server` 的 `WorkingDirectory=/`，dotenv 找不到仓库里的 `.env`，即使有也不会加载；
- 实际生效只有两处：`~/Library/LaunchAgents/com.topems.server.plist` 的 `EnvironmentVariables`（非敏感项）+ Keychain 注入（`DATABASE_URL` / `MIGRATE_URL` / `JWT_*` 等）。

因此我此前写的“改生产机 `.env.production`”的通知**前提是错的**，新建该文件只会制造第二份假配置。**生产机按 plist + Keychain 维护是对的，我们的 runbook 必须照此改写。**

## 代码侧核对：生产机指出的 5 个无效键，全部证实

| 键（我原先要求） | 代码实际读取情况 | 裁决 |
|---|---|---|
| `DATABASE_MAX_CONNECTIONS=30` | **无任何代码读取**；真正读的是 `DB_MAX_CONNECTIONS`（`lib/shared-core/src/config/enhanced.rs:69`、`lib/shared-bootstrap/src/lib.rs:447`，另有 `<SVC>_DB_MAX_CONNECTIONS` 覆盖链） | 模板已改成 `DB_MAX_CONNECTIONS=30`，旧键加“已废弃”注释并被门禁禁止 |
| `STORAGE_PATH` | **无代码读取**；文件落盘是 cwd 下的相对路径 `uploads/<user>/<file>`（`svc/unified-core/src/modules/file/upload.rs`） | 模板改为注释 + 说明“要先改代码才会生效” |
| `PLUGIN_STORAGE_PATH` | **无代码读取** | 同上 |
| `CORE_PORT` | 只在 unified-core 独立部署时读；单体 `svc/server` 读 `SERVER_PORT` | 模板加注说明，不再暗示单体需要它 |
| `MIGRATE_URL` 写进 plist | 运行时进程不读；plist 的 `EnvironmentVariables` 会**遮蔽** Keychain 同键注入 | 模板加注“迁移工具专用，不要写进 plist” |

顺带发现一个真实风险：因为落盘路径是 cwd 相对的，而生产机 `WorkingDirectory=/`，**文件上传会尝试写 `/uploads/...`**。若该目录不存在或无写权限，上传功能会失败（回执里说 `data/files` 不存在，与此一致）。要么把 plist 的 `WorkingDirectory` 指到 `/Users/xingzhai/topems`，要么改代码引入真正的存储根目录变量——属于独立变更，本轮只登记。

## 已改（仓库侧）

1. `config/env/.env.production.template`：5 处按上表修正，全部带“为什么”。
2. `scripts/ci/check-prod-config.mjs`：新增不变量——模板与实配文件中，`DATABASE_MAX_CONNECTIONS` / `STORAGE_PATH` / `PLUGIN_STORAGE_PATH` **不得以生效形式出现**；池大小必须用 `DB_MAX_CONNECTIONS`。负例已验证（本地 `.env.production` 改前 FAIL、改后 PASS）。
3. `.env.production`（本机未跟踪参考样本）：改为“native 形态参考”并注明不驱动生产；`DB_MAX_CONNECTIONS` 改名、两个 ghost 键注释、权限仍 600。
4. 安全头：`svc/unified-core/src/{main,embedded}.rs` 由 `SecurityHeadersConfig::default()` 改为 `::from_env()`——`ENVIRONMENT=production` 现在真正生效（`production()` 预设：CSP 收敛、HSTS 带 preload 标记）。注意这**只影响经 Rust 的响应（/api）**；HTML 页面由 nginx 直接返回，要加 HSTS 应在边缘（Cloudflare SSL/TLS → HSTS）或 nginx 做。

## 仍未闭环

- 生产机 `.env` 里 `DATABASE_URL` 仍指向 `topems`（旧值）：该文件不会被加载，但会误导排障。主控机与生产机网络隔离（SSH 超时）无法代改，需生产机自行注释或改成 `topems_prod`。
- 生产机启动期 4 条 `plugin registry "RLS context missing"` ERROR（01:59:25–01:59:41）：与本次 CORS/ENV 改动无关，需单独排查（现象是插件注册表在无租户上下文下访问了 fail-closed 的 scope 连接）。
- 回执提到的 `SecurityHeadersConfig` 改动需要**重建二进制**才会在生产生效；二进制当前构建于 11-19 04:34，是否需要为此重建由发布节奏决定。
- `test.topmap.net` 已删除，DNS 侧无遗留。

## 第二轮回执后的裁决（2026-11-24 二次）

**1. cwd 方案：批准生产机把 plist `WorkingDirectory` 设为 `/Users/xingzhai`（不是仓库目录）**

生产机的反对理由经代码核对成立：`Cargo.toml:341` 把 `dotenv` 解析为 `dotenvy 0.15`，`dotenv::dotenv()`（`svc/server/src/main.rs:162`、`lib/shared-bootstrap/src/lib.rs:336/818`）会从 cwd 逐级向上找 `.env`。cwd 若落在 `/Users/xingzhai/topems`，会把仓库 `.env` 的约 40 个变量注入进程（含 `RUST_LOG`、旧 `DATABASE_URL`），属隐式行为变更。`/Users/xingzhai` 与 `/` 下均无 `.env`，是当前最干净的落点；相对路径 `uploads/` 顺带落到 `/Users/xingzhai/uploads`（首次上传自动创建）。

验收追加两条：`lsof -a -p <pid> -d cwd` 显示 `/Users/xingzhai`；首次上传后 `ls -ld /Users/xingzhai/uploads` 存在，且 **`/uploads` 未被创建**。

**2. `.env` 的 `DATABASE_URL`：选 b（整行注释掉），并保留说明注释**

理由：保留旧值仍可能被以仓库为 cwd 的 dotenv 工具静默读到并连错库；注释掉让工具 fail loud。`MIGRATE_URL` 同理应一并注释——否则有人在仓库目录跑迁移工具，会按 `.env` 指向开发库。

**3. plugin-registry 的 `RLS context missing`（158 条 / 20 分钟，前端轮询 `/api/plugin/navigation-config`）**

代码事实：错误来自 `lib/shared-db/src/scope.rs:450` 的 `apply_request_tenant()`——它只认 `tokio::task_local! RLS_REQUEST_TENANT`（`lib/shared-auth/src/middleware/tenant.rs:65`），由 `tenant_middleware` 用 `RLS_REQUEST_TENANT.scope(ctx, next.run(req))` 注入（同文件 :79）。拿不到即报这条。

关键推断：报的是 scope 失败而不是“事务上下文缺失”（`runtime.rs` 里 txn 为空时是另一条错误），说明请求事务存在、中间件**部分**跑了；所以要么该请求命中的是另一处未挂 `tenant_middleware` 的 `/api/plugin` 挂载，要么 task-local 在跨 `spawn` 后丢失。

待生产机回传两个判据：nginx access log 中该请求完整一行（path/status/UA/referer）；同一浏览器会话下 `GET /api/plugin/marketplace` 的状态码。市场 200 + 导航 500 → 同一路由栈，问题在 path 豁免/挂载分层；两者都 500 → 路由栈整体缺 tenant 层。**在定位前不加 BYPASSRLS、不放宽 scope。**

**4. 存储根目录**

临时用 cwd 解决上传，根治要代码引入存储根变量（`TOPEMS_STORAGE_ROOT` 之类，`upload.rs` / `download.rs` 统一拼根），属独立变更；改完再通知生产机，届时 cwd 方案可保留也可回退。

## RLS 根因与修复（2026-11-24 三轮回执后定案）

生产机把根因定位到代码级，我方核对成立：

- `/api/plugin/*` 的 JWT 层是插件自己的 `jwt_auth_middleware`（`svc/plugin-registry/src/shared/middleware.rs:28`），只把 `Claims` 塞进 `req.extensions_mut()`，**不发布 `RLS_REQUEST_TENANT` task-local**；
- `shared-auth` 的 `auth_middleware`（`lib/shared-auth/src/auth.rs:1207` 附近）才用 `scope_request_tenant(ctx, next.run(req))` 包住后续链路；
- `tenant_middleware`（`tenant.rs:660+`）只在自己 `begin()` 的事务上 `set_config` 并注入 `RlsTxnCell`，**不发布 task-local**；
- 而 `Db::scope_with(txn)` → `apply_request_tenant()`（`lib/shared-db/src/scope.rs:450`）只认 task-local。

所以：请求事务在、GUC 也在，但 task-local 缺失 → `RLS context missing`。marketplace 走 `scope_*_system()` 系统通道，绕过该检查，故 200。

**修复（一处改机制）**：`tenant_middleware` 与 `tenant_middleware_no_txn` 都在 `next.run(req)` 外层补 `scope_request_tenant(RlsRequestTenant { tenant, system }, ...)`，不再依赖上游 JWT 层身份。任何模块只要挂了这两个中间件之一，下游 `Db::scope*` 都能拿到上下文。

**并发安全性**：两层可能同时 scope（auth_middleware + tenant_middleware），已验证 tokio task-local 可嵌套、内层覆盖、退出后恢复外层（回归测试 `rls_task_local_tests::scope_request_tenant_nests_and_restores`，通过）。

**回归口径（重建二进制后）**：`GET /api/plugin/navigation-config` 返回 200 且 body `success:true`（此前是 200 + `success:false`，HTTP 状态掩盖了业务失败）；启动期与轮询期不再出现 `Failed to open read scope: ... RLS context missing`；`/api/plugin/runtime/list` 同样正常。

**注意**：生产机纠正了一点——navigation-config 的 HTTP 状态是 200（错误在 JSON body），此前 1103 条 200、仅重启窗口 2 条 502。因此不能拿 HTTP 状态做判据，必须看 `success` 字段。

**序号变更（2026-11-24 推送时）**：B260 的 `rs.project_members.status` 收口迁移原为 `20261124150000`，与远端并行的 HRM 初始化唯一索引迁移（`20261124150000_hrm_init_status_tenant_step_unique`）撞号，已重押为 `20261124160000_rd_project_members_status_standard`（回滚件同名），manifest 双条并存、checksums 重算、`gen-manifest.sh --check` 无漂移。生产执行顺序：HRM(150000) → RD(160000)。终稿回执见 `docs/ops/receipt-prod-round3-2026-11-24.md`。

