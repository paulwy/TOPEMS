# TODO — TOPEMS 活文档

> 本文件只保留**未完成 / 待确认 / 实施中**事项；已完成条目核销后删除，判定依据见审计文档，不再复述原文。
> 状态口径：`未完成`（有明确剩余动作）/ `待确认`（需业务或用户拍板）/ `实施中`（当前批次已开工）/ `受阻`（依赖未满足）。
> 最近治理：**2026-11-17 全项目审计后清理**。审计基线 `a82d97512`（本地与 origin/main 的差距以 `git rev-list --count origin/main..main` 为准）。
> 逐条判定、读数与复现命令：[项目审计与实施方案-2026-11-17](docs/quality/项目审计与实施方案-2026-11-17.md)。
> 该轮只改本文件与新增审计文档；未改代码、未提交、未推送、未触碰生产。
> 2026-11-19 增补：新增 §1.F「前端真实性与交互纠错」F1–F11（依据 [主模块功能缺陷与前后端补位评估-2026-11-19](docs/quality/主模块功能缺陷与前后端补位评估-2026-11-19.md)）；**只登记，未开工**。
> 2026-11-19 治理：§0.1 阻断读数按当日实测重写并核销（`facts:check` 13 项漂移与 `check:ledger` 2 本账本已核销为绿；`gen-manifest --check`、clippy、API 闸门、权限对账亦为绿）；DEC-14 核销；C6 前置由「等 DEC-14」改为「等账号计费恢复」；F 批证据重定位到 HEAD `7b1134282`，其中 F9 由「3 个 501 入口」修正为「6 个 501 端点、UI 无调用点」；新增 §7 仓库卫生记录。

> **维护约定（2026-11-19 定稿，口径见 [聚合产物与 TODO 入库策略](docs/quality/openapi-aggregated-artifact-policy-2026-11-19.md)）**
> 1. **维护者**：当批任务的提交者负责更新；跨批只允许新增条目或删除已完成条目，不做批量重排。
> 2. **同批更新**：条目状态与实际代码在同一提交内变更；引用的评估/设计文档必须先入库，禁止悬空链接。
> 3. **与 facts 同步**：改变行数或一级章节数后，同批更新 `docs/quality/facts-latest.json` 的 `docs.todo_lines` / `docs.todo_h2_sections`。
> 4. **归档**：已完成条目累计超过 50 行时压缩进 `docs/archive/TODO-archive-<date>.md`，本文件只保留未完成项。

## 0. 治理记录（2026-11-17）

| 项 | 值 |
|---|---|
| 判定条目 | 112 条（89 条表格任务 + 23 条正文子项），已完成 14 / 已失效 16 / 需改写 13 / 仍有效 47 / 待拍板与已定案 22 |
| 清理后结构 | 3 个执行分类（可立即做 / 需拍板 / 需生产窗口）+ 执行次序（§4）+ 已关闭条目索引 + 执行纪律 |
| 历史备份 | `docs/archive/misc/TODO_backup_20260828.md`、`docs/archive/TODO-archive-2026-10-31.md`、`docs/archive/TODO-archive-2026-11-03.md`、`docs/archive/roadmap-history/*` |
| 说明 | 旧版本引用的 `docs/archive/misc/TODO_backup_20261107.md` 实际不存在，已从本文件移除该死链 |
| 2026-11-19 增补 | 新增 §1.F 前端真实性 F1–F11（11 条，**未开工**）；依据 [主模块功能缺陷与前后端补位评估-2026-11-19](docs/quality/主模块功能缺陷与前后端补位评估-2026-11-19.md)，无既有条目重复 |

### 0.1 当前阻断读数（2026-11-20 复测，HEAD `467a95163`）

| 项 | 读数 | 来源 / 命令 |
|---|---|---|
| 默认 `cargo check` | 绿（2026-11-17 修复：dev `strip="none"` 覆盖全局同级配置） | `cargo check --workspace`；见 §3.1 |
| `cargo clippy --workspace --all-targets` | 绿（4 crate / 8 处已修，2026-11-17） | 见 §3.2 |
| `facts:check` | **绿：62 项一致**（同日核销：`schema_prefix` 基线 306→287 条、`request-txn` 基线 26 项 erp `bare_txn` 351→350；观测值按当前代码重建） | `node scripts/report/facts.mjs --check docs/quality/facts-latest.json` |
| `check:ledger` | **绿：4 本全部 OK**（`schema-prefix` / `request-txn` / `tenant-context` / `txn-write-non2xx` 均 stale 0、unregistered 0） | `node scripts/ci/check-ledger-staleness.mjs` |
| `gen-manifest --check` | 绿：`registered=197 disk=790 anchor=20261118150000`，`unregistered_pending=0`、`file/checksum mismatch=0`、`checksum_mismatch=0` | `bash scripts/migration/gen-manifest.sh --check` |
| API 审计闸门 | 绿（2026-11-17：P6 RED=0、p7 `not_legal=0`；`lefthook.yml` 已去 `--dry-run`） | 见 §3.2 |
| 权限对账脚本 | 绿：`DB 来源：live`、DB=1021、FE 1060 / BE 624 / ∩195、db_only 0、命名不一致组 0 | `python3 scripts/audit_permission_codes.py`；见 §3.1 |
| GitHub Actions | **红，唯一原因 = 账号计费**（`The job was not started because recent account payments have failed...`，job 未启动，非代码） | `gh api repos/paulwy/TOPEMS/actions/runs/<id>/jobs`；见 §7.4 |

---

## 1. 可立即做（无需拍板、无需生产窗口）

### A. 构建与门禁（先做，否则后续验证不可信）

| ID | 任务 | 验收 |
|---|---|---|
| A1 | dev profile 显式 `strip="none"`（`Cargo.toml` `[profile.dev]`、`.cargo/config.toml`；release 保留 strip）（已完成，见 §3.1） | 默认 `cargo check --workspace` 通过 |
| A2 | 修 clippy 报错（实为 4 crate / 8 处，含审计清单外的 `svc/search` 2 处）（已完成，见 §3.2） | `cargo clippy --workspace --all-targets -- -D warnings` 绿 |
| A3 | 删 2 个 stale baseline key；重审 api allowlist 96→107；登记 `20261116180000`（已完成，见 §3.2） | `facts:check`、`check:ledger`、`gen-manifest --check` 三绿 |
| A4 | API 闸门去 `--dry-run`（`lefthook.yml:325`），修 `check-api.cjs` 的 `--apply` 假绿，P6 解析器补裸简写/嵌套对象（已完成，见 §3.2） | `check-api.cjs` 的 P6 RED=0；闸门真实阻断，剩余红灯仅 p7（转 E1-4） |
| A5 | 修 `audit_permission_codes.py`：DSN 优先级改为 `.env` 优先于进程环境，并在降级时显式告警（已完成，见 §3.1） | `DB 来源：live`、DB=1021，不再 `sql_fallback` |
| A6 ✅ | 清掉文档死链与过期读数 | README:227 已改为实测「35 个一级模块、454 个二级菜单」（按 `module-configs/*/config.ts` 的 `navItems` 计数）；§17.1 的 `max_connections=2` 已在上一轮 TODO 重写中移除；`TODO_backup_20261107.md` 死链已删 | README 与 TODO 相对链接缺失 = 0；全仓 `17/83` 仅存于历史档 `docs/archive/ui-migration/ROOT-TODO-ui-v3-history.md`（留档不改） |
| A7 ✅ | LEG-13 残余核实：`ai_knowledge` 启动告警 | 代码侧无该告警：模块完整接线（`svc/ai/src/routes.rs:1015-1047` 合并 `ai_knowledge::create_routes`，openapi 全量登记），handlers 中 501/Not Implemented = 0，无启动期 warn；`document_processor` 的两处 warn 是 embedding 重试日志，非“未实现”告警 | 结论：原告警不存在，LEG-13 残余关闭（无历史日志可复现，按代码事实判定） |
| A8 ✅ | 生产 `core_permissions` 中 69 条（实测 46 条）不在任何迁移中：查清种入路径并收敛到迁移 | 溯源结论：来源 = 2026-06-18/06-21 初始数据库导入（历史快照 `database/backup/p5_20261106/public_iam_core.sql`），早于「迁移是唯一源」纪律；非运行期插入（`check-no-runtime-permission-insert.mjs` 在守）；旧扁平命名已被 `hrm:attendance:read` 等取代。处置：新迁移 `20261119233000_iam_legacy_permission_convergence.sql` —— 补种 2 条仍被 `svc/erp/src/modules/dict.rs:89/118/147` 校验引用的 `iam:dictionaries_read/update`（干净库缺它们会让非超管字典接口 403）；删除其余 44 条零引用遗留码及其空转授权（先在事务内演练：DELETE 119 授权 + 44 码，无孤儿授权）。回滚件已写并如实声明「授权需从备份重建」；manifest 登记 `to_apply` + checksums 已入账 | `gen-manifest --check` 0 漂移（registered=194, unregistered=0）；`gen-permissions --check` 1162 条一致（前端清单新增 2 条）；本地库应用两遍幂等（第二次 0/0），总数 1204→1160；`check:ledger` 绿 |

### B. 数据访问收口（按服务分批，行为等价）

| ID | 任务 | 当前读数 | 验收 |
|---|---|---|---|
| W7-A | 按「外层 Scope + 内层迁移」继续收口业务裸池，逐服务提交 | 340 处（11-18 口径） | `check-pool-acquire.mjs` 该服务计数下降，行为等价测试绿 |
| W7-B | 平台语料 5 表归一（币种、报表映射、角色模板、同步策略、项目类型），归入 DEC-15 | `docs/database/residual-ten-table-triage-2026-11-18.md:92` | 归一后租户仍可经平台通道读到 8/48/16/1 条 |
| B43-09 | 非 HTTP 路径（定时任务/消息消费/CLI）中间件与租户上下文评估 | 未做 | 每类入口有租户上下文或显式豁免记录 |
| W2-A1 ✅ | 移除 `SEARCH_PATH` 环境读取 | 实为 2 处（`shared-bootstrap/lib.rs` 的 legacy 入口与内层 fallback；`audit.rs` 那处已在此前改为必填 `schema_prefix` 消失）。已删除 legacy `bootstrap_service` 入口，内层只接受显式参数；17 个服务 main 全改 `bootstrap_service_with_search_path(&config, "<module path>")`；`embedded.rs` 显式传 `flow, public` | 全仓 `env::var("SEARCH_PATH")` = 0；`cargo check --workspace` 绿 |
| W2-A3 ✅ | 增 CI 规则禁止 `SEARCH_PATH` 环境读写 | 新增 `scripts/ci/check-search-path-env.mjs`（零基线，扫 1879 文件 0 违规）；已接入 lefthook pre-push `[Gate SPE]` 与 CI `connection-governance` job；配套删掉 `connection_budget_it.rs` 里已失效的 `set_var` | 规则上线；构造一条 `set_var("SEARCH_PATH")` 能被拦下（`--root` 自测路径已留） |
| W2-B1 ✅ | mes：裸表引用归零 | 316 → 0（2026-11-20，25 文件；基线移除 62 条，`.sqlx` 新增 99 条） | `check-schema-prefix` 该模块归零 |
| W2-B2 | unified-core | 247 | 同上 |
| W2-B3 | finance | 227 | 同上 |
| W2-B4 | lims + analytics | 174 / 167 | 同上 |
| W2-B5 | pdm + erp | 152 / 105 | 同上 |
| W2-B6 | integration 46 + communication 44 + portal 19 + rd 16 + pm 10 + monitor 5 + 小模块 8 | 合计 1536 | 同上 |
| W2-C1..C3 | finance 停止直连 `erp.opening_balances`（改经 erp 接口/共享读视图） | 8 处（`finance/modules/mod.rs` 5564~6118） | 该 grep 归零，期初余额口径测试绿 |
| W2-D1..D3 | 运行期 DDL 收口：先加“零运行时 DDL”断言，再逐服务迁移 | W2-D1 ✅ 2026-11-20：`scripts/ci/check-runtime-ddl.mjs` + `runtime-ddl-baseline.json`，pre-commit+CI 已接线。W2-D2 首个模块 AI ✅：4 张运行期表（documents/document_chunks/qa_history/analysis_results）以 live 真实形状固化到 `20261120110000_ai_schema_canonical.sql`（21/17/11/9 列、索引/约束/RLS 与 live 逐项 diff 为 0），并清理 schema_defense 遗留的重复索引 `idx_chunks_document_id`（`20261120120000`）；删除 `svc/ai/src/schema_defense.rs` 与启动期建表/补列调用，并清空 `services/db.rs::run_migrations()` 的 22 条 DDL（含重建重复索引）、解除单体 `ai_real_module.rs` 对已删模块的引用；基线由 67 文件 / 648 表 / 8210 列 / 272 DDL / 20 调用点降至 **63 / 644 / 8156 / 248 / 18**。W2-D2 第二个模块 TMS ✅：5 张运行期表以 live 形状固化到 `20261120130000_tms_schema_canonical.sql`（12/12/13/20/12 列，列/索引/约束/RLS 与 live diff 为 0），删除 `svc/tms` 的 schema_defense 与启动期建表调用；基线再降至 **61 / 639 / 8099 / 246 / 17**。W2-D2 第三个模块 master-data 静态 5 表 ✅：`schema_registry/dynamic_data/materials/uoms/samples` 以 live 形状固化到 `20261120140000_master_data_schema_canonical.sql`（10/5/15/13/13 列，FORCE RLS 与仅 USING 策略照原样保留），删除 schema_defense 与 persist 兜底；基线降至 **57 / 634 / 8048 / 243 / 15**。保留项：`modules/schema_registry.rs` 的用户自定义 schema 动态建表属产品功能，D1 仍计入，未清零。W2-D2 其余服务与 D3 未开工 | 断言上线 ✅；`TABLE_DEFS` 只减不增 ✅（AI 已整模块移除） |
| W2-§12.6 | WS 消费组默认值按服务区分（机制已有，默认名仍相同） | `ws_event_bridge.rs:164` | 默认值不同，双实例互不抢占 |

### C. 测试与 CI 可信化

| ID | 任务 | 当前读数 | 验收 |
|---|---|---|---|
| C1 ✅ | 为裸 `#[ignore]` 补原因或删失效用例 | 实测裸注解 380 处 / 47 文件（文档旧口径 378）；全部补成 `#[ignore = "<原因>"]`：385 条 HTTP 集成（需本地服务运行，服务不可用则 skip）、8 条网关 8099 端到端、3 条 `sqlx::test` 需真实 PostgreSQL。失效用例判定：这些文件自带 `service_available()` / `sqlx_dsn_guard!` 前置守卫，属「可运行但需外部依赖」而非死代码，故补因不删 | 全仓裸 `#[ignore]` = 0（已带原因 535 处）；新增门禁 `scripts/ci/check-test-ignore-reason.mjs` 零基线、构造裸注解探针 exit 1；`cargo check --workspace --all-targets` 绿；`cargo fmt --all --check` 绿 |
| C2 ✅ | “需要 PostgreSQL”用例改显式 feature/CI 服务 | 8 个含 `sqlx_dsn_guard!()` 的 crate 增 `db-tests` feature：47 个集成测试加 `#![cfg(feature = "db-tests")]`，10 个 src 内 `mod tests` 用 `#[cfg(test)]` + 模块内 `#![cfg(feature = "db-tests")]`（保持 schema-prefix 的 test 模块识别口径）。默认 `cargo test` 不再启动这些用例（此前守卫会在进程 init 即 panic，等于永不运行）。`TEST_DATABASE_URL=topems_test_runner` 全量实跑 **8720 passed / 0 failed**：crm 1055、shared-auth 248、scm 471、wms 1176、mes 509、erp 1819、finance 2201、unified-core 1241；3 个依赖「已执行全量迁移的库」的套件显式 `#[ignore = 原因]`（MDM/core_tenants 表由迁移建）。实跑修掉的真实缺陷：crm RLS/tenant/菜单/审计 fixture 缺列或表名错（public↔wms）、mes/uc 直调 handler 缺 task-local 租户上下文（补 `scope_request_tenant`）、mes 冲突用例未提交请求事务、wms outbound `total_value` FLOAT8↔Decimal 解码不兼容、uc doctest `changed_at` 类型错误；CI 新增 `db-tests` job（postgres:16 service + TEST_DATABASE_URL） | 缺服务/DSN 时默认 `cargo test` 跳过不报错 | 本地/CI 均可实跑 |

| C3 ✅ | 清理环境缺失即 early-return 的伪绿写法 | 实测 170 处 / 16 文件（旧口径约 60）：`if !ensure_db_available().await { eprintln!("⏭ 跳过…"); return; }` 全部改为 `assert!(ensure_db_available().await, "需要本地 PostgreSQL(localhost:5432) 且已执行迁移；禁止静默跳过")`；16 个测试文件顶部加 `#![cfg(feature = "db-tests")]`，`svc/ehs/src/modules/integration.rs` 内嵌 tests 模块内加 `#![cfg(feature = "db-tests")]`、`test_db()` 由 `Option<Db>` 改为 `Db`（连接失败 panic）；`pdm/srm/analytics/gis/rd/qms/ai/mobile/ehs/lims` 10 个 crate 补 `[features] db-tests = []`（mes/crm/wms/finance/scm 已有）。默认 `cargo test` 该 16 文件 0 用例（编译期门禁，不再伪绿）；`--features db-tests` 下缺库/缺表实测 FAILED（瑞士奶酪口已堵）。这批 legacy 套件依赖「已执行迁移且带 vector/postgis 扩展的库」：本机 `provision-env.sh` 在 `topems_app` 非 superuser 下卡在 `CREATE EXTENSION vector`，`CREATE DATABASE … TEMPLATE topems` 又因非库主被拒，故本轮只做红灯验证、未整批实跑，留 C6 以 `pgvector/pgvector:pg16` 供给后并入 CI。同批第二类（HTTP 伪绿）也已清零：`crm/hrm/plugin_integration_test.rs`、`lims/audit_log_tests.rs`、`rd/{api_tests,project_relation_tests}.rs`、`erp/contract_tests.rs`、`unified-core/{sse_endpoint_tests,tenant_isolation_test}.rs` 共 8 文件（原 42 处 `⏭ 跳过: …服务未运行`）统一改为 `assert!(service_available().await, "…；禁止静默跳过")`，整文件加 `#![cfg(feature = "http-tests")]`（6 个 crate 新增该 feature，默认 `cargo test` 0 用例、启用后缺服务即红）；并删除 ERP 无断言的空壳 `test_project_contract_crud`；`pdm/w7_b4_{rls_evidence,superadmin_tenant}.rs` 6 处 `let Some(pool) … else { 跳过 }` 改 `expect`，纳入 `db-tests` 门禁。 供给根因也已打通：本机 TCP 的 `topems_app` 非 superuser，但 socket peer 认证的 `air` 是 superuser，改用 `--dsn "postgresql:///topems_test_full?host=/tmp"` + `apply-forward.sh --drill-gate-guc-auto`（否则 URL `options` 覆盖 `PGOPTIONS`，`app.drop_dead_tables_gate` 丢失）完成基线+20 条前向迁移；16 个套件 141 例全绿（pdm 8 / srm 5 / analytics 6 / gis 6 / rd 12 / scm 10 / finance 7 / ai 8 / mobile 5 / ehs 10 / mes 47 / crm 11 / lims 6，qms、wms 为 0；另 ehs `--lib` 238 例绿）。实跑修掉：pdm/gis/rd/finance/mobile 裸表名未带模块 schema（在测试 DSN 统一注入 `options=-csearch_path%3D<schema>%2Cpublic`）、rd `project_phases.tenant_id` 缺失与 `experiments.created_by` uuid/text 错绑、mobile `patrol_records.tenant_id` 缺失与 `checked_by` uuid/text 错绑、finance 6 个用例补 task-local 租户作用域 + 凭证用例补种 `hrm.companies` 单一公司主体；同时移除 64 个早已可运行的 `#[ignore = "requires PostgreSQL"]`。门禁复核：schema-prefix 新增 0（1460 基线内）、ignore-reason 裸 0、mock 0、search-path 0；`cargo check --workspace --all-targets` 绿、`cargo fmt --all` 已跑 | 缺服务时红灯 ✅（默认不执行、启用即断言） |
| C4 ✅ | 合并 CI 中 `cargo-test` 与 `rust-test` 两套冗余 job | 冗余点：`cargo-test` 的 `cargo test --workspace` 与 `rust-test` 的 nextest 全量重复；但 nextest 不执行 doctest，直接删 job 会丢掉 42 个 crate 的 doctest 覆盖（并撞分支保护 required check）。处置：`cargo-test` 保留 job id/name「Cargo Test (V251 blocking)」以防破坏既有保护，运行步骤收敛为 `cargo test --workspace --doc`；单元/集成用例只走 `rust-test`（nextest）单一路径。收敛时实跑暴露真实缺陷：`svc/search/src/lib.rs` 文档示例引用不存在的 `handlers::search_routes`（doctest 编译失败），改为真实存在的 `handlers::search_handler` 并注明路由组装见 `main.rs`；`cargo test --workspace --doc` 全量 **42 个 doctest target 全绿 / exit 0** | 单一路径 ✅（nextest 唯一执行单元/集成；cargo-test 仅 doctest） |
| C5 ✅ | 拆分超慢用例文件 | 根因不是用例体量：`PluginManager.test.ts` 只 mock 了 `@/api/plugin`，未 mock 同链路真实使用的 `@/api/plugin/marketplace.pluginAxios`，每个异步用例都真发 `/api/plugin/navigation-config` 并等网络超时（单个 ≈20s，合计 233.9s）。补 `pluginAxios.get` mock（返回 404 → 复用生产已有「端点不存在则本地 fallback」分支），实测 **0.71s / 29 例全绿**，无需拆文件 | 单文件 <30s ✅（实测 0.71s） |
| C6 | 首次建立 CI 基线 | CI 从未跑过（job 因**账号计费**未启动，非代码）。另实测确认零链存在**多处**历史断裂，不是单点：① `20260902000002` 已 `DROP TABLE public.qa_lab_tasks CASCADE`，而 `20261005000004` 就给 `lims.qa_lab_records.task_id` 加 FK 指向它，真正重建在 `20261007000009`；② 绕过①后，`20261102220000` 又直接 `ALTER TABLE lims.qa_lab_samples`，该骨架表已在 `20261003000002` 删除。历史迁移不可改（会破坏已应用库 sqlx checksum），补表骨架只能把断裂点不断后移，属掩盖而非修复。结论：**零链不是支持路径**，新环境以 baseline+forward 为准；`migration-test` 的 “Verify top-level migration chain on empty database” 当前结构性必红，处置已落地：`migration-test` 删除零链步骤，改为重建 `topems_test` → 恢复 schema/ledger/data 基线 → `apply-forward.sh` → `validate.sh` + 权限审计 + 菜单门禁；镜像换 `pgvector/pgvector:pg16`（baseline 含 vector）。本地同口径已跑通：baseline `20261117235500` + 前向 41 条、ledger max `20261120100000`、权限 `GATE PASS`（DB 1024）、菜单 341 条 PASS、`validate.sh` errors 0。待账号计费恢复后 CI 实跑确认 | 一次全绿 run（零链步骤已改为 baseline+forward）；空库零链不再作为判据 |

### D. 前端结构与文档

| ID | 任务 | 当前读数 | 验收 |
|---|---|---|---|
| W3-B | 清理 `pages/` 残留（crm 已只剩 `__tests__`） | `pages/` 43 目录 | 残留目录清零 |
| W3-C | `@/pages/*` 引用收敛到路由层 | 125 处 | 仅路由入口引用 |
| W3-D | 合并 `schema/`、`schemas/`、`types.ts` | 三者并存 | 目录唯一 |
| W4-A | `DataTable` 去重 | 4 个定义 | 1 个定义 |
| W4-B | 表单字段重复实现收口 | — | 共享实现 |
| W4-C ✅（口径修正） | `StatusBadge` 去重 | 旧口径“11 个定义”已过期：Tailwind 5 份实现已由 `4f02796a2` 合一为 `components/common/StatusBadge.tsx` 单一渲染；`tms/mes/aps/qms/wms` 的 `StatusBadge` 全是薄包装（只提供各自 FSM/颜色/文案映射，内部 import common），不是重复实现；`ehs/EHSStatusBadge` 走 MUI `Chip` 体系，`packages/shared-components` 另有 MUI 主实现+11 个 typed 包装，均属另一设计体系 | Tailwind 侧单一实现 ✅；跨 MUI/Tailwind 体系不合并 |
| W4-D | eslint 限制跨层 import 规则落地 | 未接线 | 规则生效 |
| W5-B | 状态枚举单一源（前端/后端/DB CHECK 三处对齐） | 无生成物 | 三方一致校验通过 |
| W5-C | 组织字段口径收敛 | `company_id` 404 / `org_id` 382 / `organization_id` 250 | 选定口径后计数只降 |
| W6-A | 文档盘点与目录说明补齐 | 34 目录 / 663 篇 | 与门禁读数一致 |
| W6-B | `docs/modules/` 补到 28 篇 | 仅 3 篇 | 28 篇 |
| W6-C | 重建 `openapi-aggregated.yaml` 并纳入 DDL | yaml 8-27 / json 11-16 | 两者同版 |
| W6-D | a11y 与 design-tokens 之外，补 i18n/decode 接线 | 部分接线 | 门禁覆盖 |
| W1-2a ✅ | 修脚本后重出权限快照 | 脚本已恢复 live DB（`.env:DATABASE_URL`、`DB 来源：live`、`error=None`）；新快照 `docs/quality/permission-codes-snapshot-20261120.json`：FE 1060 / BE 624 / DB 1021 / ∩195、be_only 429 / fe_only 865 / fe_orphan 32 / db_only 0。连跑两次文件 SHA-256 完全一致（`3b560437…4386db`） | 快照可重跑一致 ✅ |
| W1-2b | 仅后端存在的权限码分流（补录/白名单） | 481 | 交集上升，0 删除 |
| W1-2c ✅ | 菜单权限码与后端 `security` 对齐（口径已澄清） | 3 条真坏码已由 `20261120100000` 修复（评分/分群/漏斗引用 `core_permissions` 不存在的别名）；修复后 dev 189 条菜单码 `menu_not_in_db=0`。剩余 92 条（菜单∩后端字面量 97/189）经逐条核验：全部在 `core_permissions` 存在且已授予角色（零授权仅上述 3 条），后端这些模块走 `require_module_access(<module>)`——拥有任意 `<module>:` 前缀权限即放行，菜单码本身满足该判据，故不存在「菜单可见但后端 403」的错配。把 92 条都加逐端点 `security` 属权限模型细化（W1-3a 范畴），不是本次修复项。防复发门禁已补：新增 `scripts/ci/check-menu-permission-codes.mjs`（`core_menus.permissions->>'permission'` 必须全部存在于 `core_permissions.code`），接入迁移演练 `[6/6]`、pre-push `migration-drill-anchor` 触发路径，以及 CI `migration-test` 的 baseline+forward 审计步骤；演练实跑 `[6/6] PASS: 341 个菜单权限码均存在`，dev 现库因账本停在 `20261115141100`、尚未应用 `20261120100000` 而被判红（3 条旧别名），属预期未迁移状态 | 菜单引用码 100% 存在于权限表且零授权码=0 ✅；逐端点非超管 403 验收归 W1-3a/b/c |
| W1-2d ✅ | 仅 DB 存在的权限码分流 | `db_only=0`、`未登记（live DB 有、init∪migrations 无）=0`，`sql_history_also_current=1021`；A8 收敛后 DB 1021 条全部在迁移中有字面量，无需删除 | 删除前有全仓检索证据 ✅（本轮结论：无需删除） |
| W1-3a ✅ | erp/scm/srm/wms/mes 路由级权限验收（原“17 服务零权限”已不成立，29/29 服务已有声明） | 已并入 W1-3 运行期矩阵：ERP/SCM/WMS 走处理器级细粒度 `check_permission`，SRM/MES 读 200 / 写 403；MES `create_plan` 越权写已补写门并复测闭合 | 非超管 200 / 无权限 403 ✅ |
| W1-3b ✅ | hrm/crm/pdm/pm/rd/tms/gis/mobile | 已并入 W1-3 运行期矩阵：CRM/HRM/PM/PDM/RD/TMS/GIS 读 200，TMS/PDM/RD 写 403；Mobile 读 200、写 403，个人接口仍按 auth-only 不入模块门 | 非超管 200 / 无权限 403 ✅；mobile 个人接口保持 auth-only ✅ |
| W1-3c ✅ | integration/monitor/ticket/master-data | 已并入 W1-3 运行期矩阵：Integration/Monitor/Ticket/master-data 读 200、写 403；master-data 实际业务前缀为 `/api/master-data/quality-v51/*`，已按真实前缀验；monitor 的 `monitor:dashboard:read` 仍按现网读码授予，收紧到具体看板属后续细化 | 非超管 200 / 无权限 403 ✅；monitor 收紧需核真实用户（未改） |
| W1-3 ✅（运行期验收完成） | 全模块非超管矩阵 + 写门根因修复 | 单体 :8099 真实登录实测：`w13_reader` 仅授各模块读码时，CRM/ERP/SCM/WMS/QMS/EHS/HRM/PM/TMS/LIMS/master-data/SRM/MES/PDM/RD/GIS/Mobile/Integration/Monitor/Ticket 读全部 200；未授权模块 403。EHS/QMS/MES 曾用合法载荷真实写入，根因是单体 `topems-server` 的 `*_real_module` 只挂 `require_module_access`、绕过独立部署 `main.rs` 写门；已在 EHS/QMS/TMS/LIMS/master-data/MES 的单体挂载点与独立部署入口补齐 `require_module_write`。复测：EHS/QMS/MES 合法写 403（`需要 <module>:admin`），TMS/LIMS/master-data/SRM/PDM/RD/Mobile/Integration/Monitor/Ticket 写 403、读 200，admin 写仍 200；ERP/SCM/WMS 走处理器级细粒度 `check_permission`（无效体 422 属参数校验，不是放行）。探针数据按主键删除，`w13-*-probe` 计数 0；验收已固化为 `scripts/dev/verify-runtime-permissions.sh`，实跑 `pass=34 fail=0` | 20 模块读 200/写 403 可复现 ✅；脚本门禁 34/34 ✅；新增 `scripts/ci/check-module-write-parity.mjs`（独立部署有写门则单体挂载必须同步，14 项配平 0 缺失，反向构造缺失可判红），接入 CI `connection-governance` 与 pre-commit；EHS/QMS/MES 越权写入已闭合 |
| W1-4a | DB 菜单分组映射到 10 个域组并被前端消费 | `GlobalLayoutV3.tsx` 无 `group_id` 消费 | 菜单接口返回 10 组；`?menu_authority=config` 可回退 |
| §14.1 | 财务期初余额 4 项遗留（f64 路径、币种符号、签名等） | 未动 | 逐项用例绿 |
| §14.2 | 单一率校验 | 未做 | 用例绿 |
| §17.3 | `200 + success:false` 分批改语义（先加响应头/错误码映射） | 545 处 | 每批计数下降且客户端兼容 |

### E. 数据库漂移登记（待确认，不改契约）

| ID | 现象 | 证据 / 复现（只读） | 状态 |
|---|---|---|---|
| DRIFT-01 ✅ | `mes.production_records.completed_quantity` 曾出现 `numeric`（无 typmod），契约要求 `numeric(12,2)` | **已定性并修复（2026-11-20）**。根因是判据漏口：`20260928120000_mes_schema_type_align.sql` 的判据是 `information_schema.data_type <> 'numeric'`，而该字段不含 typmod，无精度 `numeric` 与 `numeric(12,2)` 的 `data_type` 同为 `numeric`，导致该迁移误判「已对齐」直接跳过 ALTER。修复：新增前向兜底迁移 `20261120090000_mes_column_typmod_align.sql`，以 `format_type`（含 typmod）为判据对齐同 4 列，表/列缺失用 `to_regclass` 跳过、已对齐零 ALTER。验证：事务内把列改回无精度 `numeric` → 执行迁移 → 恢复 `numeric(12,2)` → ROLLBACK，通过；`apply-forward` 在 `topems_test_full` 应用 1 条、重跑 0 条（账本 max=`20261120090000`）；`validate.sh` errors 0 / checksum 0；`gen-manifest --check` 无漂移（registered=196/disk=789）。生产侧事实（只读实测）：该列本就是 `numeric(12,2)`、与契约一致，故该迁移在生产为**幂等对齐**（no-op 语义），不构成生产数据或结构变更；dev 本机此前为无 typmod 状态，已按 §7.1 重放 `20261105160000` 修正（票 `DRIFT01-DEV-20261120`），与兜底迁移互为交叉验证。回滚件只回退到无约束 `numeric/varchar` 且不回退已四舍五入的小数位，已在文件中如实声明。判定依据见 [readonly-triage-strategy-drift-drif01-erp-rls-2026-11-19.md](docs/database/readonly-triage-strategy-drift-drif01-erp-rls-2026-11-19.md) §1.6。 |

### F. 前端真实性与交互纠错（2026-11-19 评估增补；批次 1 + 批次 2 全部完工：F1–F12 均 ✅）

> 依据：[主模块功能缺陷与前后端补位评估-2026-11-19](docs/quality/主模块功能缺陷与前后端补位评估-2026-11-19.md) §2.1/§2.2/§2.3。
> 冲突核查：与 W3-B/W3-C（结构去重）、W4-*（组件去重）、§17.3（后端 `200+success:false` 语义）均无重叠；本条只做前端数据源与提示语义纠偏，不动接口契约、不加服务。
> 批次：1 = 去 mock + 提示纠错（零后端改动）；2 = 接线/隐藏既有能力（依赖后端现状）。
> 纪律：每条独立验收；不得以“优化”合并。

| ID | 批次 | 任务 | 当前证据（2026-11-19 复核，HEAD `7b1134282`） | 验收 |
|---|---|---|---|---|
| F1 | 2 ✅ | 银行账户管理页接真实 API（去掉纯 mock CRUD） | 页面 `pages/admin/BankAccountManagementPage.tsx` 改为 schema 驱动直连 `bankAccountApi`：list 带 `keyword/status/page/page_size`，按后端字段映射（`branch_name↔bank_branch`、`is_default↔is_primary`），create/update/delete 走 `/api/erp/bank-accounts`，失败抛错（不回退假数据）；`account_type` 字段从 schema 移除（后端 `bank_accounts` 无此列，原 mock 才有）；`mockBankAccounts`/`nextId` 归零 | 新增 `pages/__tests__/BankAccountManagementPage.test.tsx` 5 用例：字段映射、列表参数、失败抛错、写操作映射全绿；web typecheck 0 error |
| F2 | 1 ✅ | CRM 三个 Redesign 页去 mock 兜底 | `CrmCustomerRedesignPage.tsx:146/311`、`CrmContractRedesignPage.tsx:121`、`CrmOpportunityRedesignPage.tsx:130/292/295`（`setIsMockData(true)` 后返回 `mock*`） | 三页 mock 常量归零；API 失败显示错误与重试，不再回退假数据 |
| F3 | 1 ✅ | WMS 盘点页去 mock 兜底 | `WmsStocktakePage.tsx:175`（`mockStocktakes`）、`:314`（`let filtered = mockStocktakes`）、`:379/411`（落库失败仍提示「已降级为本地模拟数据」） | `mockStocktakes` 归零；失败态显式报错 |
| F4 | 1 ✅ | MES 工单页：去 mock + 修正删除失败提示 | `MesWorkOrderPage.tsx:151`（`mockOrders`）、`:268`（失败返回 mock）、`:284`（`data || mockOrders`）；`:276` 成功分支与 `:280` **`onError` 内仍是 `toast_deleted`** | mock 归零；删除失败提示错误且不再出现成功文案 |
| F5 | 1 ✅ | ERP 采购单页：去 mock + 修正删除失败提示 | `PurchaseOrderPage.tsx:171`（`mockOrders`）、`:301`、`:317`；`:309` 成功与 `:313` **`onError` 内仍是 `toast.deleted`** | 同上 |
| F6 | 1 ✅ | 监控告警规则页去 mock 适配器 | `MonitorAlertRulesPage.tsx:251`（`mockApiAdapter` 定义）、`:606`（`apiAdapter={mockApiAdapter}`） | 改真实 API 适配器；`mockApiAdapter` 归零 |
| F7 | 1 ✅ | OA 公告页失败提示纠错 | `AnnouncementPage.tsx:190/194-197`、`:207/209-211`（`onError` 内仍 `pushToast('success', k45/k46)`） | 失败提示错误；更新/删除失败不出现成功文案 |
| F8 | 1 ✅ | 工作流审批页失败提示纠错 | `WorkflowApprovalsPage.tsx:240/244-247`、`:258/264-267`（同上，k5 / k19） | 同上 |
| F9 | 2 ✅ | 文件中心 501 端点回收（**范围已修正**） | 后端 `manage.rs` 6 个 handler 仍固定 501（`set_file_permissions:1167`、`get_file_permissions:1186`、`get_shared_files:1203`、`get_file_stats:1222`、`export_files:1247`、`search_files:1265`）；前端按验收口径收口：`api/file/index.ts` 删除 `getPermissions`/`revokePermission`/`getSharedFiles`/`getStats`/`export` 五个 501 封装及关联类型，文件头加契约说明（检索走 `list({search})`，禁止调 `/files/search`） | 全仓 `fileApi.*` 调用点 = 0（仍为 0）；不导出即不可误用；后端补齐后单批放开 |
| F10 | 1 ✅ | IAM 权限定义写入口隐藏（权限为迁移种子，后端固定 501） | 前端 `api/iam/permission.ts:13/20/24`（create/update/delete）；后端 `svc/unified-core/src/modules/iam/permission.rs:183-210`（`PUT/DELETE /permissions/{id}` 明确 501，注释「权限定义为系统种子数据」） | 权限页只读；新增/编辑/删除按钮与调用点归零 |
| F11 | 1 ✅ | 增加前端 mock 回归门禁 | 现无规则（`scripts/ci/` 下无 `*mock*` 脚本）；8 页 mock 可复发 | 生产构建路径禁止 mock 兜底（仅允许 `import.meta.env.DEV`）；CI 扫描违规即红，并用一条构造用例验证能拦住 |
| F12 | 2 ✅ | 存量 mock 兜底清理 | 18 处 / 12 文件全部清除：AI 提示词库接 `listPromptTemplates`+`togglePromptFavorite`+`deletePromptTemplate`+`usePromptTemplate`；BI 报表接 `fetchReports`；ERP 销售订单、HRM 考勤/员工/绩效、QMS 审核/8D/质检/不合格、移动质量、报表中心均改为失败抛错；`testGenerator` 局部变量改名消除误报 | `node scripts/ci/check-frontend-mock-fallback.mjs` = 0 违规（基线 0 条），仅保留“新违规阻断”能力 |

> 本批刻意不包含：EHS 职业健康域（需业务拍板，见评估 §2.5）、AI 用量计量/MES 成本/GIS 轨迹/SRM 条款（后端半成品，见 §2.4）、文件中心与合并报表的后端实现。
> 门禁影响：`facts:check` 已于 2026-11-19 核销为绿（62 项一致）；本批新增 F12 与状态标记只改变 `todo_lines`，提交前重新生成 `docs/quality/facts-latest.json` 即可保持一致。

---

## 2. 决策建议（用户已授权：一步到位 + 通用，每条只给一个结论）

> 授权口径：不再逐条回问，按「一次改到终态、不新增分叉/例外、其他服务可照抄」给唯一方案并实施。
> DEC-04 按原注明方式（不阻塞步骤）一并定案。DEC-14（对外推送）已于 2026-11-19 完成，移入 §5。

| ID | 推荐结论 | 一步到位 + 通用 | 影响面 | 验证判据 | 解除阻塞 | 风险 / 时机 |
|---|---|---|---|---|---|---|
| DEC-01 | 全面改为「每请求一个作用域事务」，删除请求级/作用域双轨，业务只允许 `Db::scope*` | 终态只有一种事务边界；不保留 `scope_with`/`scope_for_tenant` 兼容层；新服务照抄同一入口 | `lib/shared-db` scope API、`svc/server` 中间件、各 svc `state.db`；无迁移 | `scope_for_tenant`/`scope_with` 仅剩白名单；workspace 测试绿；长请求连接占用有监控 | E4-24、E5-2 | 长请求占连接；先在 server 设 30s 事务超时再切 |
| DEC-02 | `rs` 等 24 表一次性 `SET SCHEMA archive`，不留兼容视图 | schema 边界一次划清；后续历史表按同一规则进 archive | migration + manifest/checksums；`svc/rd` 引用同批改 | `archive` 表数=24；`cargo check`+smoke 绿；回滚脚本演练通过 | E4-13 | 可逆（反向 SET SCHEMA）；先在克隆库演练 |
| DEC-03 | 拆为 `finance:<domain>:write/read`，`finance:admin` 只留给超管角色 | 粒度与菜单/模块一致，不留万能码；其他模块照抄 domain 粒度 | 权限行、FE `hasPermission`、网关 `require_permission`、角色模板 | 三端对账 db_only=0；非财务角色写接口 403；超管 200 | E5-4 | 需一次性回填角色；先跑角色差集 |
| DEC-04 | 缺租户/缺关联一律显式失败，禁止 graceful fallback，失败写死信并告警 | 单一错误语义；与 B43-09「入口必须有租户上下文」同一条规则 | `svc/pdm/src/event_handlers/mod.rs:321` 去 fallback；死信沿用 mdm 表模式 | 缺 tenant 用例报错且无部分写入；死信可查 | 无（随 E3-9/E4-13） | 先上告警再切，避免积压不可见 |
| DEC-05 | DB 层一次性改名（31 组同名菜单），不保留前端别名 | 菜单唯一源在 DB，不新增映射层；重复项照同一规则 | 31 组菜单行 + 菜单种子 SQL + 前端路由常量；数据迁移 1 个 | 同名组=0；菜单接口 10 组；前端导航 e2e 绿 | E4-11 | 外部书签失效；变更清单先留档 |
| DEC-06 | 删除 35 个 dashboard 幽灵菜单（无路由/权限码消费即删） | 菜单表与路由 1:1，不设隐藏位 | 菜单行 35；无代码改动 | 菜单数降 35；`?menu_authority=config` 对比无差异；无 404 导航 | E4-12 | 低 |
| DEC-07 | 存量数据统一按「权威源 + 租户归属」修：能定位的 UPDATE，不能定位的软删并留证 | 不留孤儿行、不建例外表 | B43-11/12/13/15/16/17 各表；可回滚数据脚本 | 每表 orphan=0；回滚演练通过 | E4-22 | 需逐表取证，禁止批量猜归属 |
| DEC-08 | 关闭 LEG-05/07/08（已被 mdm 权威源等专项覆盖）；LEG-04 并入 W5-B；LEG-09 时间列独立小批 | 不重启已收敛的供应商/客户双写；时间列单独可回滚 | LEG 条目状态、W5-B 范围 | 关闭项标注覆盖证据；LEG-09 写入点清单=0 或全改 | E4-23 | 低 |
| DEC-09 | 以 DB CHECK 为唯一源，后端枚举/前端常量由 OpenAPI 生成并比对 | 消灭 108/113 两套手写清单；新模块照抄生成流程 | `apps/web` 常量、svc 枚举、OpenAPI schema | 三方 diff=0；CI 增加生成物比对 | E4-14 | 低 |
| DEC-10 | 执行文档目录 34→6 重组，不建转发文件，靠 git 历史与根 INDEX | 目录与职责一一对应，不产生双份文档 | `docs/**`、文档内链 | 一级目录=6；`markdown-link-check` 通过 | E4-18 | 历史链接失效；一次性提交便于回退 |
| DEC-11 | lims 那 1 行软删，登记为测试残留（取证无业务外键引用） | 零租户业务行归零；平台语料表明确豁免 | lims 1 行 + 登记表 | lims 零租户=0；列表接口无变化 | E5-3 | 低 |
| DEC-12 | 三项一次收紧：`core_tenants` 仅系统通道读；`iam.core_permissions` 删表（public 唯一源）；`membership.is_default` 加部分唯一索引 | 消除影子表与双源，约束交给 DB；其他 schema 照抄「单源 + 约束」 | migration；`fixtures/full_schema_contract.sql:11774`（建表）、`:36008/:36016`（约束）、`:56029`（FK 改指 public）；运行代码零引用 | `iam.core_permissions` 不存在；对账 DB=1021 不变；同租户第二个 default 冲突 | E5-2 | FK 改指需单事务；先克隆演练 |
| DEC-13 | 不删 QMS 3 表（`svc/qms` 2 个文件引用），补严格 RLS + FORCE，纳入 P1 首批 | 与 qms 其他表同范式，不迁 schema | `qms.qa_inspection_items/plans` 已有 `tenant_id`，当前 rls=false、策略 0；同族第 3 表一并处理 | 3 表 rls/force=true，策略含 `app.rls_system`+`app.tenant_id`；0 行不变 | E5-2 首批 | 低 |
| DEC-15 | 平台语料 5 表归一为哨兵租户 + 平台通道读，不保留 `rls_global_read` | 平台数据只有一种表达；其他平台表照抄 | 5 表数据 + finance/public/mobile/pm 读路径；沿用 `20261118110000` 草稿 | 租户仍读到 8/48/16/1；未设 GUC 读到 0；A/B 对抗通过 | E3-15、E5-2 | 读路径漏改会空列表；先补回归用例 |

---

## 3. 需要生产窗口

| ID | 任务 | 前置 | 窗口内动作 | 回滚/验证 |
|---|---|---|---|---|
| P1 | 剩余宽松 RLS 分 8 批收紧（克隆口径 226 宽松 / 12 allow_all / 81 无策略） | DEC-01/12/13/15（已定案）、W7-A | 每批单事务 apply，短事务提交 | 每批 A/B 对抗查询；异常即回滚 |
| P2 | 38 条待上生产迁移（版本 > `20261115130000`） | A3 | 按依赖顺序分批 apply | 比对 `_sqlx_migrations` 与 DDL 指纹 |
| P3 | 零租户写入口收口（`access_log`/`login_log`） | W7-A、DEC-11 | 代码先上、策略后上 | 写入量监控 |
| P4 | 生产只读复核（权限三源、RLS 计数、零租户） | 无（可最先做） | 只读查询 | 输出报告，不改数据 |
| P5 | 财务网关切换（按 DEC-03 推荐：拆域码） | DEC-03（已定案） | 先加码，双写观察一个版本 | 保留旧网关开关 |
| P6 | wms B 路线（DEC-WMS-B-01/02/03） | 独立上线窗口 + 20 线程同 SKU 压测 + 业务方书面 p99/锁等待阈值，三项均未就绪（`repo-wide-rls-pool-closure-2026-11-18.md:253`） | 按既定 B 路线改造并压测 | 压测读数达书面阈值；可回退旧路径 |
| P7 | 线下收紧的 RLS 策略回迁为正式迁移：按 [生产 vs 仓库全量差分普查](docs/database/rls-prod-vs-repo-census-2026-11-18.md) §3.2 的 318 张表逐表生成前向迁移（`DROP/ALTER POLICY tenant_isolation_*` → 严格 `rls_tenant_isolation`），不保留 `tenant_id IS NULL`、全零租户与空串 GUC 放行分支 | P7 只登记；实施需先完成 P1 口径对齐、55 张「生产 RLS 关闭」表访问路径确认；8 张 `erp` 合并报表族需业务定性（集团可见 vs 单租户） | 单独开窗，分批单事务 apply，每批 A/B 对抗查询 | 重建库策略集与线上严格口径一致；`bi.audit_logs` 的 allow_all 同步收紧；异常即回滚 |

#### P7 归属结论（2026-11-19，只出草案）

- **权限表权威归 `iam`**：`public.tool_permissions` 生产不存在；`public.tenant_permissions` 与 `iam` 副本均 0 行；代码已显式 `iam.` 前缀。
- **批 0/1 复用既有迁移**：批 0 由 `20261118090000/093000/100000/103000/112000/113000/123000/124000` 覆盖 12/14；批 1 由 `20261102220000` 覆盖 11/11，不重写。
- **新增仅两条**，版本接在仓库最大值之后：`20261119000001`（`iam` 两表 `id` 补 IDENTITY）、`20261119000002`（`public.core_file_permissions` / `public.monitor_thresholds` 严格 RLS 幂等兜底）。
- **历史迁移受控修改**：`20261007000012_align_rebuild_selfheal.sql` 的 iam DROP 改为幂等建表，已登记 `database/migration-exemptions.json`；理由与改前事实见 [草案与演练文档](docs/database/iam-permission-ownership-drafts-2026-11-19.md)。
- **窗口顺序**：`20261118160000` → `20261119000001` → `20261119000002`，单事务 apply；隔离库 `topems_scratch_20261119` 已演练 apply + rollback 并 drop。
- 状态：**未应用生产、未开窗、未换二进制**。

#### P7-RLS-EMPTY-GUC 实证（2026-11-19，只读）

- **76 张是重放中间态，不是终态**：本地 `topems_web_smoke`（720 条迁移，`max=20261118160000`）中，普查列的 76 张表**均已收紧为严格 B 范式**，含 `= ''` 分支的计数为 0；全库 958 张策略表含该分支的也为 0。差异来源是 `2026111x` 起的 fail-closed 系列（如 `20261114202000_erp_crm_portal_rls_fail_closed_8.sql`）。
- **318 张同理，修正为 0**：普查的仓库侧（1181 条/1031 表）取自 `20261115142500` 前后快照，未含此后 21 个策略收紧迁移；用终态（1051 条/958 表）对生产镜像 `topems_prod` 重算，仓库更宽松 = **0 张**，318 张中 317 张已严格、`bi.audit_logs` 两侧同为 `USING (true)`。中间态对照 `m2_dryrun_20261116` = 290 张，可复现。
- **代码侧无显式空串**：所有设置点 bind `Uuid` 字符串；唯一空串来源 `rls_tenant_value`（superuser）被转成 `RESET app.tenant_id`（`svc/unified-core/src/middleware/tenant_rls.rs:217`、`:319`），不是 `SET ''`。
- **真实风险在策略侧**：PG18 实测 `SET` / `SET LOCAL`（含 COMMIT/ROLLBACK）/ `RESET` 之后，`current_setting('app.tenant_id', true)` 返回 `''` 而非 NULL；池化连接复用后多数读到 `''`，宽松策略即可在正常路径整表放行。
- **代码触达**：76 张中 A=67（有 SQL 引用）、B=1（`erp.voucher_items` 仅 i18n）、C=8 无任何代码路径（`iam` 6 张 `*_dashboard_snapshots`、`master_data.mdm_critical_functions`、`public._archive_core_workflow_versions`）。
- **风险等级**：当前仓库终态 / 生产快照 **低**；历史或回退态 **高**。
- **后续（未动手）**：策略侧删除 `= ''` / `tenant_id IS NULL` / 全零分支并加 CI 形态门禁；不建议只在 GUC 设置侧拒绝空串（覆盖不了池化隐式 `''` 与第三方客户端）。
- 文档：[RLS 空串 GUC 可达性实证](docs/database/rls-empty-guc-reachability-2026-11-19.md)。

#### OpenAPI 聚合产物入库策略（2026-11-19，待评估）

- **现状**：`docs/api/openapi-aggregated.yaml` 仓库版 12216 行（聚合 3 个服务 / 116 个端点）；本轮重新生成后为 98525 行（27 个服务 / 3003 个端点、1018 个 Schema），单文件增量约 +97049 行。
- **问题**：产物随覆盖服务数线性膨胀，评审不可读、合并冲突高发，任何服务 `api-docs` 变动都会产生巨量 diff。
- **待评估**：停止把聚合产物纳入版本库，改由 CI 在发布流水线中生成并作为构建产物发布；仓库只保留生成脚本（`scripts/openapi/generate.sh`、`scripts/openapi/aggregate.py`）与基线。
- **状态**：本轮未提交该 yaml（工作区已回退到 HEAD），仅登记待办。

### 3.1 第 0 波执行读数（2026-11-17，已完成）

只读口径：本地 `topems_prod`（无远程生产凭据），全程 SELECT，无 DDL/写入。

| 项 | 读数 | 判据 |
|---|---|---|
| A1 构建止血 | 默认 `cargo check --workspace` 通过，2m48s（全新 `CARGO_TARGET_DIR`） | `Cargo.toml`/`.cargo/config.toml` 的 dev `strip="none"` 生效；根因是全局 `~/.cargo/config.toml` 也设了 dev strip，仓库内显式覆盖 |
| A5 权限脚本 | `DSN 来源：.env:DATABASE_URL`、`DB 来源：live`、FE 445 / BE 619 / **DB 1021** / ∩ 138 | 原 DB=12 是进程环境 `DATABASE_URL`（test_runner 库）抢占；已改为 `.env` 优先并显式标注降级 |
| P4 迁移账本 | `max(version)=20261117235500`、`count=704`、`failed=0` | 本地 prod 账本无失败记录 |
| P4 RLS 普查 | 目标表 992：严格 874 / 宽松 8 / allow_all 16 / 他类 7 / 无策略且未开 RLS 87 | 与 `repo-wide-rls-pool-closure-2026-11-18.md:13`（573/290/13/92）不一致，差异源于该文快照库不同，以本轮读数重建基线 |
| P4 零租户 | `core_users/core_roles/core_menus/core_tenant_users` 零租户均 0 行 | `lims` 1 行仍按 DEC-11 待处理 |

### 3.2 第 1 波执行读数（2026-11-17）

| 项 | 读数 | 判据 |
|---|---|---|
| A2 clippy | `cargo clippy --workspace --all-targets -- -D warnings` 通过（2m47s） | 4 crate / 8 处：`ai`、`master-data`（2 处）、`search`（2 处，审计漏记）、`crm`（转化率改 SQL 内 `::float8`）；全部 `try_from(...).unwrap_or(MAX)` 或显式 `f64`，无 `#[allow]`、无 lint 降级 |
| A4 假绿根因 | `check-api.cjs` 的 `runScriptForAudit` 未传 `--apply` → P6/P7 生成器只打印不落盘；`readJson(p6-red.json) || []` 把"文件不存在"当 0 条 | 已改为强制 `--apply`，artifact 缺失/不可解析记 `audit.artifact` 硬失败；`lefthook.yml:325` 去 `--dry-run`；非 dry-run 实测 `EXIT=1` |
| A4 P6 RED | 8 → 0（GREEN 1002→1010，AMBER 1，YELLOW 0） | 8 条均非前端/后端缺陷：后端端点在 `svc/monitor/.../settings.rs`、`svc/tms/.../analytics.rs` 齐全；前端函数在 `api/monitor/index.ts`、`api/tms/analytics.ts` 齐全；根因是 `p6-api-audit-v5.cjs` 不识别裸简写属性（6 条）与嵌套对象方法（2 条） |
| A3 facts:check | 12 项漂移 → 0（96 项一致） | 真修：删 2 个 stale key、登记 `20261116180000`；快照过期：TODO 重写（781→308 行）、allowlist 96→107（107 条均带 reason，unregistered=0）、schema_prefix 观测值（`new_violations=0`、`hard_fail=0`，属代码演进非回归） |
| A3 check:ledger | 4 本账本 `stale 0 / unregistered 0`，通过 | 2 个 stale key 是 `help/mod.rs` 的 `core_faqs`/`core_guides`：该文件已无 SQL，死条目删除；`faq.rs`/`guide.rs` 条目保留 |
| A3 gen-manifest | `registered=167 / unregistered_pending=0 / missing_on_disk=0`，无漂移 | `20261116180000` 生产账本已应用（`success=t`，704 行 / max 20261117235500），两表 `tenant_id NOT NULL`+RLS+FORCE+各 1 策略经只读核验；登记为 `status: applied`，非待应用 |
| A4 剩余红灯 | `p7.not_legal=375`（P6 修复后同一次生效）→ 已由 E1-4 清零 | 后端 `core_permissions` 已含全部前端使用码，缺的是 `apps/web/src/config/permissions.ts` 静态声明；按拍板走 A 补真源 |
| E1-4 真源 | `permissions.ts` 生成块 `CORE_PERMISSION_CODES` 1096 条，`--check` 幂等（两次跑输出一致） | 源=`database/migrations` 中 32 个含 `core_permissions` 的文件（56 INSERT / 1 DELETE / 6 UPDATE 按序模拟），剔除与码同形的 resource 串；不读生产库 |
| E1-4 门禁 | `gen-permissions --check` 接 lefthook `perm-codegen`（改动 migrations / permissions.ts / 生成器时触发）与 CI `permission-matrix-gate` | 补充：`check-api.cjs` 实测 `p6.red=0 / p7.not_legal=0 / p7.mismatch=0`，`EXIT=0` |

---

## 4. 执行次序（与审计 §8 同源）

> 展开依据：`docs/quality/项目审计与实施方案-2026-11-17.md` §8.1~§8.7。编号对应关系：审计 §8.2 的 B1=W7-A、B2=W7-B、B3=DEC-13、B4=W2-D、B5=W2-B、B6=W2-§17.2。
> `DEC` 列非空 = 该步的实现口径由该条决策确定（DEC-01~DEC-15 已定案，结论见 §2，不再回问）；空 = 与决策无关。DEC-04 不阻塞任何步骤，随 pdm 批次顺手实施。

> **2026-11-18 优先级重排（现行）**：今日收敛的 A–G 七组待办与本节旧序列已合并为统一执行次序，
> 见 [待办优先级与执行次序-2026-11-18](docs/quality/待办优先级与执行次序-2026-11-18.md)。
> 该文档给出逐项前置、是否拍板、是否触生产、可逆性、S/M/L 与验收判据，以及波次与停手条件。
> 本节以下内容保留为历史五波视图；新任务以该文档为准，不再按 §4.1/§4.2 的旧编号排期。

### 4.1 五波总览

```text
第 0 波（随时可起，互不依赖）
  E0-1 P4 生产只读复核   E0-2 A1 去 strip   E0-3 A5 权限脚本 schema

第 1 波 门禁底座（A1 先行）
  A1 ─► A2 ─► A4            A5 ─► A3 ─► A6            A7 独立

第 2 波 测试与 CI
  A1/A2 ─► C1 ─► C2 ─► C3        C4（ci.yml）   C5（前端）独立
  A1~A4 绿 + C4 ─► C6 首次 CI 基线（阻塞于账号计费，非代码）

第 3 波 数据面（跨服务并行，同服务服务锁互斥）
  W2-A1 ─► W2-A3
  W2-B1 ─► B2 ─► B3 ─► B4 ─► B5 ─► B6
  W2-B3 ─► W2-C1..C3        W2-B 全绿 ─► W2-D1 断言 ─► W2-D2/D3
  W7-A（与 W2-B 逐服务互斥）─► W7-B（DEC-15，需 P4 读数）
  W2-§12.6、B43-09 独立

第 4 波 结构重构（与第 2/3 波并行）
  W3-B ─► W3-C；W3-D、W4-A/B/C/D 并行
  W1-2a ─► W1-2b/c/d ─► W1-3a ─► W1-3b ─► W1-3c；W1-4a 与 W1-2a 同起
  W1-4b(DEC-05)、W1-4c(DEC-06)、W1-5a(DEC-02) 三项待拍板
  W5-B(DEC-09) ─► W5-C；W6-A ─► W6-B/C/D；W6-E(DEC-10)
  §14.1、§14.2、§17.3、B43-11..17(DEC-07)、LEG-04..09(DEC-08) 独立

第 5 波 生产窗口
  P2（A3 后）  P1（DEC-01/12/13/15 + W7-A/W7-B）  P3（W7-A + DEC-11）
  P5（DEC-03）  P6（wms 三项前置）
```

### 4.2 步骤序列

| 序 | 步骤 | 前置 | DEC | 验收判据 |
|---|---|---|---|---|
| E0-1 | P4 生产只读复核（已完成 2026-11-17） | 无 | — | 权限三源 / RLS 计数 / 零租户三张报表，零写入 |
| E0-2 | A1 dev `strip="none"`（已完成 2026-11-17） | 无 | — | 默认 `cargo check --workspace` 通过 |
| E0-3 | A5 权限脚本 DSN 优先级与降级标注（已完成 2026-11-17） | 无 | — | 脚本 DB≈1021（live），不再误报 `sql_fallback` |
| E0-4 | 78 处未限定 schema 的 `CREATE TABLE` 定性（已完成 2026-11-18），见 [docs/quality/unqualified-create-table-triage-2026-11-18.md](docs/quality/unqualified-create-table-triage-2026-11-18.md) | 无 | — | 78 条逐条落点/生产 schema/后续显式化；真隐患 17、需人工判断 2、历史无害 59 |
| E1-1 | A2 修 clippy（已完成 2026-11-17） | A1 | — | `clippy --all-targets -- -D warnings` 绿 |
| E1-2 | A4 API 闸门去 `--dry-run` + 修 check-api 假绿 + P6 解析器（已完成 2026-11-17） | A1、A2 | — | P6 RED=0；闸门真实阻断（`EXIT=1`，红灯只剩 p7 → E1-4） |
| E1-3 | A3 账本/登记/allowlist（已完成 2026-11-17） | A5 | — | `facts:check`、`check:ledger`、`gen-manifest --check` 三绿 |
| E1-4 | p7 `not_legal` 补真源：以 `core_permissions` 迁移为唯一源生成/校验 `apps/web/src/config/permissions.ts`（已完成 2026-11-17） | E1-2、E1-3 | — | `gen-permissions --check` 幂等；已接 lefthook `perm-codegen` 与 CI `permission-matrix-gate`；`check-api.cjs --mode=all` 的 `not_legal=0` 且 EXIT=0 |
| E1-5 | A6 文档死链与过期读数 | A3 | — | README 等读数与门禁输出一致，全仓检索无失配 |
| E1-6 | A7 LEG-13 残余核实 | 无 | — | 有告警则立新条目，无则关闭并留证 |
| E1-7 | A8 69 条模块级权限码非迁移种入溯源与收敛 | E1-4 | — | 种入路径查明并归档；迁移成为唯一源，生成器码集覆盖生产全集 |
| E2-1 | C1 裸 `#[ignore]` 补原因（lib→svc 分批） | A1、A2 | — | 无裸 ignore |
| E2-2 | C2 PG 用例改显式 feature | C1 | — | CI 实际执行数上升，剩余 ignore 均带原因 |
| E2-3 | C3 清 early-return 伪绿 | C2 | — | 缺 PG 时红灯 |
| E2-4 ✅ | C4 合并 `cargo-test`/`rust-test` | 无 | — | `ci.yml` 单一路径（cargo-test 仅 doctest） |
| E2-5 | C5 拆 `PluginManager.test.ts` | 无 | — | 单文件 <30s |
| E2-6 | C6 首次 CI 基线 | E1-1..E1-3、E2-4、**GitHub 账号计费恢复** | — | CI 一次全绿 run 并留链接 |
| E3-1 | W2-A1 去 3 处 `SEARCH_PATH` 读取 | A1 | — | `env::var("SEARCH_PATH")`=0 |
| E3-2 | W2-A3 CI 禁 `set_var` | E3-1 | — | 规则上线并做一次失败验证 |
| E3-3 | W2-B1 mes 前缀归零 | A2 | — | mes violations=0 |
| E3-4 | W2-B2 unified-core | E3-3 | — | 同上 |
| E3-5 | W2-B3 finance | E3-4 | — | 同上 |
| E3-6 | W2-B4 lims+analytics | E3-5 | — | 同上 |
| E3-7 | W2-B5 pdm+erp | E3-6 | — | 同上 |
| E3-8 | W2-B6 其余模块 | E3-7 | — | 全仓 violations=0 后更新 baseline |
| E3-9 | W7-A 裸池收口（340，逐服务） | A1、A2、服务锁 | — | 该服务 `check-pool-acquire` 下降，等价测试绿 |
| E3-10 | W2-C1..C3 停直连 `erp.opening_balances` | E3-5 | — | 该 grep=0，期初余额用例绿 |
| E3-11 | W2-D1 零运行时 DDL 断言 | E3-8 | — | 断言上线并能拦住新增调用 |
| E3-12 | W2-D2/D3 逐服务迁走运行期 DDL | E3-11 | — | `TABLE_DEFS` 只减不增 |
| E3-13 | W2-§12.6 WS 消费组默认值区分 | 无 | — | 默认名不同，双实例互不抢占 |
| E3-14 | B43-09 非 HTTP 入口租户上下文评估 | 无（只读分析） | — | 每类入口有上下文或书面豁免 |
| E3-15 | W7-B 平台语料 5 表归一 | E3-9、E0-1 | DEC-15 | 归一后经平台通道读到 8/48/16/1 条 |
| E4-1 | W3-B 清 `pages/` 残留 | 无 | — | 残留目录清零 |
| E4-2 | W3-C `@/pages/*` 收敛 | E4-1 | — | 仅路由层引用 |
| E4-3 | W3-D 合并 `schema/`、`schemas/`、`types.ts` | 无 | — | 目录唯一 |
| E4-4 | W4-A `DataTable`、W4-C `StatusBadge` 去重 | 无 | — | 各剩 1 个定义并过视觉回归 |
| E4-5 | W4-B 表单字段收口 | E4-4 | — | 共享实现落地 |
| E4-6 | W4-D eslint 跨层 import 规则 | 无 | — | 规则生效且违规即红 |
| E4-7 | W1-2a 修脚本后重出权限快照 | E0-3 | — | 快照可重跑一致 |
| E4-8 | W1-2b/c/d 权限码分流与对齐 | E4-7 | — | 交集上升、0 删除、非超管 403 实测 |
| E4-9 | W1-3a/b/c 路由级权限验收（按服务清单三批） | E4-8 | — | 非超管 200 / 无权限 403；mobile 个人接口保持 auth-only |
| E4-10 | W1-4a 菜单分组被前端消费 | E4-7 | — | 菜单接口返回 10 组，`?menu_authority=config` 可回退 |
| E4-11 | W1-4b 同名菜单收敛 | 无（数据已盘点） | DEC-05 | 31 组收敛后有回归证据 |
| E4-12 | W1-4c dashboard 幽灵菜单定性 | 无（数据已盘点） | DEC-06 | 35 个菜单全部有归属或删除 |
| E4-13 | W1-5a/b/c 遗留 schema 归档 | 无 | DEC-02 | `rs` 24 表归档迁移 + 回滚演练 |
| E4-14 | W5-B 状态枚举单一源 | 无 | DEC-09 | 前端/后端/DB CHECK 三方校验通过 |
| E4-15 | W5-C 组织字段口径收敛 | E4-14 | — | 选定口径后三套计数只降 |
| E4-16 | W6-A 文档盘点与目录说明 | 无 | — | 与门禁读数一致 |
| E4-17 | W6-B/C/D 模块文档、OpenAPI、i18n/decode | E4-16 | — | 28 篇、yaml/json 同版、门禁覆盖 |
| E4-18 | W6-E 目录 34→6 重组 | E4-16 | DEC-10 | 按拍板结果执行并修链接 |
| E4-19 | §14.1 期初余额 4 项 | E3-10 | — | 逐项用例绿 |
| E4-20 | §14.2 单一率校验 | 无 | — | 用例绿 |
| E4-21 | §17.3 `200+success:false` 改语义（分批） | 无 | — | 每批 545 下降且客户端兼容 |
| E4-22 | B43-11/12/13/15/16/17 存量数据处置 | 无 | DEC-07 | 逐条有处置记录与回退说明 |
| E4-23 | LEG-04/05/07/08/09 批次去留 | 无 | DEC-08 | 继续则立批次，关闭则登记为已接受 |
| E4-24 | W2-§17.2 作用域 API 收敛（审计 B6） | E3-9 | DEC-01 | 单一入口，`scope_for_tenant` 125→0 或白名单 |
| E5-1 | P2 待上生产迁移 38 条 | E1-3、E0-1 | — | 每批 `_sqlx_migrations` 与 DDL 指纹一致 |
| E5-2 | P1 宽松 RLS 8 批收紧 | E3-9、E3-15 | DEC-01/12/13/15 | 每批 A/B 对抗查询通过，异常即回滚 |
| E5-3 | P3 零租户写入口收口 | E3-9 | DEC-11 | `access_log`/`login_log` 零租户写入归零 |
| E5-4 | P5 财务网关切换 | E5-2、DEC-03 选 B | DEC-03 | 双写观察一个版本，旧网关保留 |
| E5-5 | P6 wms B 路线 | 窗口 + 20 线程压测 + 书面 p99/锁等待阈值 | — | 压测读数达阈值，可回退旧路径 |

### 4.3 并行与互斥

- **可并行**：E0-1/2/3；E1-3 与 E1-2 两条支线；E2-1/E2-4/E2-5；第 3 波跨服务（W2-B 与 W7-A 不同服务时）；第 4 波整体与第 2/3 波。
- **硬串行**：A1→A2→A4；A5→A3→A6；C1→C2→C3；W2-B1→…→B6；W2-D1→D2/D3；W3-B→W3-C；W1-2a→2b/c/d→3a→3b→3c；P1 各批之间。
- **文件/资源互斥**：`svc/<svc>/src/**` 受服务锁；`ci.yml` 单写者（C4 与门禁接线不同批）；`database/migrations/**` 与 `migration_manifest.yaml`+`checksums.txt` 单写者（W2-D、P2、E5-2 不得并行）。
- **顺序可调的仅两处**：E1-2（A4）若前端调用修复量大，可在 E2 之后再落地闸门；E3-14（B43-09）为只读评估，可挪到第 4 波任意空档。

---

## 5. 已关闭条目索引（本轮判定）

> 依据与证据见审计文档 §7；本节只保留 ID 与一句话理由，便于回查，不再展开。

| 条目 | 判定 | 理由摘要 |
|---|---|---|
| W1-0 | 已完成 | 菜单 SQL 已限定 `public.`，回归用例 `menu_e2e.rs:302` |
| W1-1a/b/c | 已完成 | 迁移 `20261107000044-46`；克隆库 bi 12 / im 2 / mobile 12 |
| W2-0 | 已完成 | `AMBIGUOUS=0`、`CROSS_SCHEMA=0` |
| W2-A2 | 已完成 | `set_var("SEARCH_PATH")` = 0 处 |
| W2-B0 | 已完成 | monitor 5 条均为 `SEARCH_PATH_DEPENDENT` |
| W3-A | 已完成 | `modules/`=0，`module-configs/`=36 |
| W5-A | 已失效 | `packages/shared-constants` 不存在，引用 0 |
| W7-0..W7-5 | 已失效 | 旧批次基线 553/169/278 已被 340 裸池口径取代 |
| §12.5 | 已完成 | `20261115142300` 补 13 列 |
| §12.7-1/2 | 已完成 | 角色写与权限查询均已走作用域事务 |
| §16.1/16.2 | 已失效 | 记录性内容，无待办动作 |
| §16.3 | 已完成 | WS 路径、BFF 桥、帧签名三项均落地 |
| §17.4 | 已完成 | E2E 已修 |
| LEG-02 | 已失效 | 已引入连接池预算，非“每服务 2” |
| LEG-06 | 已失效 | 1620 基线已被 340 取代 |
| LEG-10 | 已完成 | `hrm.companies` 1 行；mobile 已接 `shared-service-client` |
| B43-01..08 | 已失效 | 基线口径更新，批次已执行 |
| B43-18 | 已失效 | 本轮已跑 typecheck/单测/cargo check/clippy |
| DEC-K11/K12/M2-02/M3/SRCH | 已定案 | 结论转入纪律，不再作为待办 |
| LEG-01 | 已改写 | 备份缺失导致子项无法复核，已并入现行 W1/W3/W4/W6 分区 |
| LEG-03 / LEG-11 / LEG-12 | 并入 | 分别对应 W2-D1..D3、A3、W6-C，不再单列 |
| B43-10 | 转纪律 | iam 禁动区约定写入 §6 |
| B43-14 / DEC-M2-01 | 并入 | 分别对应 P1 的 A/B 对抗验证与 P1 剩余策略收紧 |
| DEC-14 | 已完成 | 2026-11-19 分 4 批推送完毕，`origin/main..HEAD`=0；「CI 一次全绿」未达成，原因转 C6 |

---

## 6. 执行纪律

1. **服务锁**：同一服务同一时间只允许一个批次改 `svc/<svc>/src/**`；完成验收后再移交。
2. **门禁先绿**：A 批未完成前，任何“已验证”结论都不成立；禁止再用 `strip=none` 之类临时覆盖作为收尾证据。
3. **不跳钩子**：不 `--no-verify`、不 `LEFTHOOK=0`；门禁红就修，不写“已知问题”放行。
4. **迁移纪律**：不修改已应用迁移字节；新迁移必须同时更新 manifest/checksums；生产只读，窗口外不做 DDL。
5. **权限口径**：模块入口用 `require_module_access("<模块>")`，不得用 `"<模块>:admin"` 顶替模块门。
6. **iam 禁动区**（B43-10）：`unified-core/iam` 的写入路径不得绕过 `iam_write_scope` + `check_role_write_target`；无拍板不入场。
7. **占位不合并**：本文件中每个 ID 对应一件可独立验收的事；执行时可拆批，但不得把两件事合并成一条“优化”。
8. **每批留证**：提交信息写明批次 ID 与 before/after 读数；涉及数据库的批次附只读核对 SQL 与结果。

## 7. 仓库卫生记录（2026-11-19，已完成，留证不重开）

> 依据：`docs/security/dependabot-local-audit-20261119.md` §6–§9、`docs/security/audit-ignore-registry.md`。本节只记录已关闭动作与可复现命令，不再作为待办。

### 7.1 依赖漏洞（GitHub 口径归零）

- Dependabot open alerts：**0**（`gh api 'repos/paulwy/TOPEMS/dependabot/alerts?state=open&per_page=100' --jq 'length'`）。
- 桌面端 `zip 8.6.0` 曾有 1 critical + 4 high：升级顺序是先 `zip@9.1.3 → 9.7.3`，再 `libsodium-sys-stable@1.24.3 → 1.24.6`；反序会报 `all possible versions conflict`（`tauri-plugin-updater` 把锁锚在 9.1.3）。
- 三条 Rust advisory 仍在上游未发版状态（`crypto-bigint 0.5.5`、`rsa 0.9.10` 已 vendor 私有补丁、`libsqlite3-sys 0.30.1` 全仓零特性未编译），逐条证据见审计文档 §7。

### 7.2 构建链根因与守卫

- `deploy/docker/Dockerfile.server` 漏 COPY `vendor/`，而 `[patch.crates-io] rsa = { path = "vendor/rsa" }` 是解析期强依赖 → 镜像必失败；已补 `COPY vendor/ ./vendor/`。
- 新增两道可机械验证的门禁：`scripts/ci/check-docker-build-context.py`（pre-push `docker-build-context`）与 `scripts/ci/check-rust-audit-invariants.py`（pre-push `rust-audit-invariants` + CI `rust-audit` step）；两套均做过反向验证（删行/注入探针即红）。

### 7.3 RLS 策略快照口径（以限定名为准）

- 根因：`pg_policies.qual/with_check` 由 `pg_get_expr` 渲染，输出受**会话 `search_path`** 影响；本机 `mes,public` → 裸名，演练/CI 固定 `pg_catalog` → `mes.process_flows`。语义与 OID 相同，纯文本差异。
- 口径：生成器 `scripts/ci/lib/rls-policy-snapshot.mjs` 统一注入 `PGOPTIONS="-c search_path=pg_catalog"`；快照按限定名入库；`finance_u8_import_records` 的 2 条新策略保留；**不手工改快照文本**。
- 复核：`MIGRATION_DRILL_WRITE_POLICY_SNAPSHOT=1 bash scripts/dev/run-migration-drill.sh anchor` → `[5/6] Gate RLS-SNAP PASS`（798 表 / 810 策略）；改后只读重跑 61s 亦 PASS。2026-11-20 新增 `[6/6] Gate MENU-PERM`，演练总耗时 83s，341 个菜单码 PASS。

### 7.4 分支与历史卫生

| 项 | 结果 | 可还原性 |
|---|---|---|
| 本地分支 | 15 → 3（`main`、`w7-b4-wms-rls-window-runbook`、`wcs-save-20261012`） | `~/TOPEMS-local-branches-archive-20261119.bundle`（177M，`git bundle verify` 通过） |
| 远端分支 | 31 → 3（`main`、`fix/i18n-placeholder-cleanup`、`w7-b4-wms-rls-window-runbook`） | `~/TOPEMS-remote-branches-archive-20261119.bundle`（128M，同样 verify 通过） |
| 判定依据 | 12 个 `--merged origin/main`；9 个 `git cherry` 未合入=0；6 个重写前备份（落后 7235 个提交）经业务确认后删除 | 删前均已打包 |
| 仓库体积 | `git gc --prune=now` 后 `.git` 339M → 232M；整仓 5.4G（`node_modules` 1.7G / `releases` 1.6G / `target` 1.4G） | — |
| 密钥扫描 | `gitleaks-full`（CI 口径 `--remotes`）8893 commits / 773MB / 51s，`no leaks found` | — |

### 7.5 CI 红的唯一原因与发布判据

- 所有 workflow 的 job 注解均为 `The job was not started because recent account payments have failed or your spending limit needs to be increased`：**job 未启动**，与代码无关，只能账号侧处理（Settings → Billing & plans）。
- 计费恢复前，发布判据改为：**本地 pre-push 门禁全绿 + `gitleaks-full` PASS + drill `[5/5]` PASS**；CI 绿不可作为依据。计费恢复后执行 C6 建立基线即可；§0.1 中 `facts:check` / `check:ledger` 两项已于 2026-11-19 核销为绿。
