# W7-B5 · qms 读路径作用域迁移 + 30 处丢弃点（2026-11-12）

## 0. 结论

三批改动全部完成并上线：4 个列表 500 修复、apqp 租户泄漏修复、11 个模块 GET 读路径改为作用域执行器、dashboard 12 条聚合按租户过滤。副本夹具验收全绿，生产短窗口换二进制成功，健康 200。

| 项 | 值 |
|---|---|
| 提交 1 | `4316d1fc4` fix(qms): 4 个列表 500 + apqp 租户过滤 |
| 提交 2 | `7901f3471` refactor(qms): 读路径改作用域 |
| 提交 3 | `14f9dc2e8` refactor(qms): dashboard 聚合按租户 |
| 远端 main | `14f9dc2e877c794d6028d7213d70bdbf60ecb6ed`（`git ls-remote origin main` 实测） |
| 二进制 HEAD | `14f9dc2e8`（提交 00:37:59；release 构建完成 00:59:08） |
| 新二进制 sha256 | `28991521afbf6aa0e11e8e5568f2047ec0405c0224c8284b8bbee92b9e882c97` |
| 旧二进制 sha256 | `ebda28a72d25d753f84c80c00a027431deb7c1decd0f06ecd339ccbfd5a261b6` |
| 回滚备份 | `~/topems/bin/topems-server.bak-20261112-b5` |
| 迁移 | 无 |

## 1. 4 个 500 的根因与修复

根因统一为 **uuid 列被 `String` 解码**（sqlx 不兼容），与租户无关，任何有数据的租户都会 500；生产因 qms 表为空一直未暴露。

| 接口 | 文件:行 | 修复 |
|---|---|---|
| `GET /quality-costs` | [quality_cost.rs](file:///Users/air/TOPEMS/svc/qms/src/modules/quality_cost.rs#L36) | `SELECT id::TEXT, tenant_id::TEXT`（列表 / 详情 / RETURNING 三处） |
| `GET /actions` | [corrective_action.rs](file:///Users/air/TOPEMS/svc/qms/src/modules/corrective_action.rs#L25) | 同上（列表 / 详情 / 子项） |
| `GET /alert-rules` | [quality_dashboard.rs](file:///Users/air/TOPEMS/svc/qms/src/modules/quality_dashboard.rs#L389) | `id::TEXT`（规则与消息列表/详情） |
| `GET /sync-records` | [data_sync.rs](file:///Users/air/TOPEMS/svc/qms/src/modules/data_sync.rs#L65) | `id::TEXT`，消除 `row.get("id")` 的 uuid→String panic |

## 2. apqp 泄漏

[apqp.rs](file:///Users/air/TOPEMS/svc/qms/src/modules/apqp.rs#L31) `list_apqp_projects` 原先不提取 Claims、4 个分支都无租户谓词。现补 `Extension<Claims>` + `tenant_opt`，4 个分支统一加 `($1::uuid IS NULL OR tenant_id = $1)`。

副本实测：改前 5 行（含 T2 的 2 行），改后 **3 行**；返回行 `tenant_id` 全为 T1，与 T2 夹具 id 交集为空（逐行核对）。

## 3. 读路径作用域

- `AppState` 增加 `db: Db`：bin 定义 [main.rs](file:///Users/air/TOPEMS/svc/qms/src/main.rs#L35)、lib 定义 [shared/mod.rs](file:///Users/air/TOPEMS/svc/qms/src/shared/mod.rs#L89)；构造点仅 [main.rs](file:///Users/air/TOPEMS/svc/qms/src/main.rs#L225) 与 [qms_real_module.rs](file:///Users/air/TOPEMS/svc/server/src/modules/qms_real_module.rs#L78)。tests/benches 无构造，无 `State<PgPool>` 路径。
- 统一入口 `read_scope_for_claims`：租户用户 → `scope_read_for_tenant`；超管/服务身份 → `scope_read_system`（`// tenant-system:` 已登记）。
- 迁移范围：quality_issue、quality_inspection、spc、fmea、eight_d、audit、quality_standard、corrective_action、quality_cost、data_sync、apqp 共 11 个模块的 GET/详情/统计，以及 alert-rules / alert-messages 列表。
- **原有显式谓词全部保留**；alert 两个列表原先没有谓词，本次补上，形成「作用域 RLS + 显式谓词」两层。
- 30 处 `_tenant_id` / `let _ =` 丢弃点：查询全部已走作用域。`_` 前缀绑定本次保留（不触发 unused 告警），隔离不再依赖它们；未发现需要单独删除才能成立的路径。

## 4. 副本基线（T1 身份，改前 / 改后）

| 列表 | 改前 | 改后 | T2 可见 | 详情 T1 / T2 |
|---|---|---|---|---|
| issues | 3 | 3 | 0 | 200 / 404 |
| eightd | 3 | 3 | 0 | 200 / 404 |
| checks | 3 | 3 | 0 | 200 / 404 |
| spc/charts | 3 | 3 | 0 | 200 / 404 |
| fmea | 3 | 3 | 0 | 200 / 404 |
| fmea-items | 3 | 3 | 0 | — |
| apqp/projects | 5（泄漏 2） | **3** | 0 | 200 / 404 |
| audit plans/tasks/findings | 3/3/3 | 3/3/3 | 0 | 200 / 404（tasks/findings 无详情路由） |
| quality-costs | 500 | **3** | 0 | 200 / 404 |
| actions | 500 | **3** | 0 | 200 / 404 |
| alert-rules | 500 | **3**（改后首次读数 5，补谓词后 3） | 0 | — |
| sync-records | 500 | **3** | 0 | 200 / 404 |
| standards | 3 | 3 | 0 | 200 / 404 |
| alert-messages | — | 3 | 0 | — |

所有列表返回行的 `tenant_id` 均为 T1；与 T2 夹具 id 交集为空。

服务身份（自签 `role=service`）与超管带 `x-tenant-id`：issues/checks/standards/apqp/alert-rules 全部 200 且出数（超管/服务走系统通道，按设计返回跨租户全量）。

## 5. dashboard

| 项 | 改前 | 改后 |
|---|---|---|
| `/dashboard` md5 | `79e54b96a57ec791d606a2f5c7ad6539` | `8aeef87559edea3c15dafa43034b1a8c` |
| 数据 | 全租户混合 | T1 过滤 |
| `/today-pass-rate` | 全租户 | T1：total 3 / passed 0 |

人工核对（T1 SQL 与接口逐项一致）：inspections 3 / pending 3 / completed 0 / issues 3 / open 3 / resolved 0 / pending actions 3 / audit plans 3 / in_progress 0；同表全租户 inspections 为 5，证明 T2 的 2 行已被排除。

## 6. rows_affected

本批没有新增 UPDATE/DELETE（仅 SELECT 与聚合），无 0 行静默成功路径需要校验。

## 7. 门禁

| 门禁 | 结果 |
|---|---|
| `cargo clippy -p topems-qms -p topems-server --all-targets -- -D warnings` | 通过 |
| `cargo fmt --all` / pre-push `cargo-fmt-check` | 通过 |
| `check-tenant-context --changed-only` | PASS（R1 0 / R2 0 本次） |
| pre-push 全量（cargo-check/clippy/fmt/test、boundary、perm-matrix、contract、openapi、web-contract-smoke 等） | 全绿，未使用 `--no-verify` |

## 8. 生产窗口

日志：`/tmp/w7_b5_prod/window_prod.log`（`tee` 落盘）。

| 时间（本地） | 动作 |
|---|---|
| 00:59:37 | 窗口开始，新二进制 scp 暂存，sha256 一致 |
| 01:01:0x | `launchctl bootout gui/501/com.topems.server` |
| 01:01:06 | 备份旧二进制 → 换新 → `bootstrap`，新 pid 80247 |
| 01:01:06+ | `/health` 200；停机约 5 秒 |
| 01:01:10 | 非超户 + 超管矩阵复验完成 |

生产矩阵（tenant_admin T1）：

| 项 | 改前 | 改后 |
|---|---|---|
| 16 个列表 HTTP/行数 | 200 / 0 | 200 / 0（无一变化） |
| dashboard 10 项 | 全 0 | 全 0 |
| 超管带 `x-tenant-id`：issues/checks/apqp/alert-rules/dashboard | 200 | 200 |

收尾：health 200、`state = running`、pid 80247、live sha `28991521…`、回滚备份 `ebda28a7…` 在位。

## 9. 卡点与限制

- **生产 qms 业务表为空**（全租户 0 行），因此生产窗口只能证明「接口 200、无回归」，无法在生产复现行级租户隔离与 4 个 500 的数据面修复；这两项以副本夹具实测为准。
- 生产 4 个原 500 接口在改前也返回 200（空结果不触发解码），所以生产侧不存在「500→200」的可观测差异；根因修复由副本有数据场景证明。
- 30 处 `_` 死绑定保留未删，属刻意选择（避免无关签名/参数改动）；如需彻底清理可另开纯清理批次。
