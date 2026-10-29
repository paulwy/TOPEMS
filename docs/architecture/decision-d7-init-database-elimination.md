# 服务级 init_database 双源消除决策（D7：C2 渐进删除第一批）

> 状态：✅ 决策已出（2026-10-29）· 归属：schema 双源治理 C2 渐进删除·第一批（lims / portal）· 关联：[D1 unified-core 目标形态](./decision-d1-unified-core-architecture.md)、[数据库权威与迁移治理](./database.md)、schema-defense 门禁 `scripts/migration/check-schema-defense.mjs`
> 依据：2026-10-29 服务级 init_database 双源评估（只读盘点）+ 门禁 PASS（errors=0 warnings=0）。路径与行号为 2026-10-29 实测。

## 1. 背景与决策问题

schema 双源治理主线（迁移权威 vs 服务自建 DDL）已完成：① B 门禁扩展至 svc/lib 全仓；② 102 表补列迁移落地并推送；③ 门禁误报清零。剩余双源点：**各服务运行时 `init_database` 自建路径**。unified-core 的 init_database 已删（批次 172abd3f8），本决策处置 lims / portal / integration / server 聚合调用链。

**决策问题**：lims（31 表）、portal（4 表）的 init_database 自建 DDL 与调用点是否删除？integration（12 表，含辅助函数）与 server 聚合调用（8 处）如何分批？

## 2. 现状盘点（2026-10-29 实测）

| 服务 | 自建表 | 迁移权威存在 | 独有表 | 函数内附随逻辑 |
|---|---|---|---|---|
| lims（models/mod.rs） | 31（qa_lab_*/qa_lims_*）+ 63 索引 | 31/31 | 0 | **schema_defense::run_schema_migration_and_verify（运行时防御，需保活）** |
| portal（modules/help/mod.rs） | 4（core_faqs/guides/guide_lessons/guide_progress）+ 11 索引 | 4/4 | 0 | 无 |
| integration（main.rs 编排 + 6 辅助函数） | 12 | 12/12 | 0 | schema_defense::run_schema_migration_and_verify（保活，第二批处置） |
| server（无自建，聚合调用） | — | — | — | 8 处调用点（ai×2/bi/report/ehs/finance/lims/mes/qms） |

**双证**：门禁 PASS 证明全部自建表在迁移权威存在且列覆盖；逐表核验一致（迁移权威表总数 1029）。

## 3. 结论

init_database 自建 = **冗余双源**：迁移权威建库后，运行时 `CREATE TABLE IF NOT EXISTS` 为空操作；裸库场景已被空库守卫 + `migrate.sh run` 强制流程替代（B14 口径）。**非缺陷，属维护债**。运行时防御层（schema_defense）与建表双源解耦，**保留**并独立为入口。

## 4. 决策

### 第一批（本次实施）：lims / portal

- **lims**：删 init_database 内 31 建表 + 63 建索引 SQL；函数改造为 `run_schema_defense(pool)`（仅保留 `schema_defense::run_schema_migration_and_verify` 调用，改名以消除"init"语义误导）。调用点：`svc/lims/src/main.rs:91`、`svc/server/src/modules/lims_real_module.rs:58`、`svc/lims/tests/integration_tests.rs:18` 改调 `run_schema_defense`。
- **portal**：删 `svc/portal/src/modules/help/mod.rs` 的 init_database（4 表 11 索引，无防御逻辑，整体删除）；删 `svc/portal/src/embedded.rs:75` 调用与日志分支。

### 第二批（本次实施）：integration

- **main.rs**：init_database 编排 → 改造为 `run_schema_defense`（保留 schema_defense 自检）；删 4 个辅助函数（init_sync_tables / init_erp_connections_table / init_external_erp_sync_logs_table / init_erp_mappings_table，11 建表 + 11 索引）；清理 use（only_own_schema_query / init_conversion_rules_table）。
- **模块文件**：删 6 个 init_*（conversion_rules / mes_qms / crm_erp / erp_wms / crm_scm / hrm_finance）。其中 crm_erp / erp_wms / crm_scm / hrm_finance 的 init 为**无调用点死代码**（D3 改造遗留），一并清除。
- **验证**：cargo check topems-integration PASS；门禁 PASS（自建表 317→306）；rustfmt 无额外改动。

### 顺延批次（本次实施）：ehs / finance / mes / qms / bi / report / ai（7 crate）

- **删除建表（无防御）**：ai_knowledge（5 表 17 索引）、chat_conversations（1 表）、ehs（43 表 45 索引）、finance compliance_v51（5 表 12 索引，**死代码**）、finance settlement_center（3 表 10 索引，**死代码**）、finance database.rs（6 表 15 索引 + init_aux_tables）、mes modules（27 表 42 索引）+ production_plan / demand_forecast / capacity（各 1 表）。
- **改造保活防御（建表删除）**：analytics bi（13 表 36 索引）/ report（6 表 3 索引）、finance services 聚合（66 表/563 列自检保留）、qms（26 表 55 索引，TABLE_DEFS 参数化防御保留）。
- **调用点同步**：6 个服务 main.rs + server 6 个模块（ai/analytics/ehs/finance/mes/qms）；ehs_tests 清理。
- **验证**：cargo check --workspace --all-targets PASS；schema-defense PASS（自建表数 306→180）；fmt 全绿。剩余自建 180 表经盘点修正为各 crate schema 防御/ensure 路径内 **r# 字面量 CREATE TABLE**（非 TABLE_DEFS 结构体；C-1/C-2 章节处置，见 §5c/§5d）。

### 前置条件（已满足/执行中）

- WSL/协作机空库四步回归（含授权基线第④步，README 已固化）通过后实施；
- 每批删除后：`cargo check`（SQLX_OFFLINE）+ 门禁全绿 + 空库重放。

## 5. 验证记录（第一批）

- [x] SQLX_OFFLINE `cargo check -p topems-lims -p topems-portal -p topems-server --all-targets`：PASS（依赖树全编译，1m23s）
- [x] `node scripts/migration/check-schema-defense.mjs`：PASS（errors=0 warnings=0；自建表数 352→317，恰移除 lims 31 + portal 4）
- [x] `bash scripts/migration/validate.sh`：不涉及迁移文件改动，无需重跑
- [x] 提交推送远端；协作机拉取后空库四步回归复核（待协作机执行）

## 5b. 验证记录（第二批）

- [x] SQLX_OFFLINE `cargo check -p topems-integration --all-targets`：PASS
- [x] `node scripts/migration/check-schema-defense.mjs`：PASS（errors=0 warnings=0；自建表数 317→306）
- [x] rustfmt：无额外改动
- [x] 提交推送远端

## 5c. 验证记录（C-1：非 portal 79 张 r# 字面量建表）

> 承接顺延批次后剩余 180 张 r# 字面量建表（门禁口径提取：`sed 's/[（(].*//'` 处理全角括号误报后修正）。来源映射：portal 98 张（留 C-2）+ 非 portal 79 张分布于 22 个 .rs 文件。决策：门禁为唯一仲裁，逐 crate 删除；各 crate 防御函数（TABLE_DEFS / schema_defense）保留。

- **整删纯建表函数（含调用点）**：pdm/plugin-registry/mobile(unified-core) `init_database`、ticket `init_ticket_tables`/`init_sla_tables`、unified-core `init_mdm_tables`/`init_audit_logs_table`/`init_version_config_table`/`ensure_preferences_table`、communication `register_geofence_tables`、erp `ensure_event_idempotency_table`/`ensure_table`（9 处调用）、master-data `dict::init_database`。
- **改造保活防御（删建表留校验）**：gis `init_tables`、pdm/plugin-registry `init_database`、ai `run_migrations`（保留 schema/extension/vector 分支与索引/触发器）、communication main 防御。
- **语句级删建表（保留业务逻辑）**：qms/wms `log_approval_event`、server `cancel_subscription`、mobile `push_config`（const+2 调用）、erp 幂等账本。
- **编译修复链（3 轮）**：server `ticket_real_module.rs` E0425（删已删函数调用段）、erp leave_request unused variable×2、server unused import。
- **验证**：cargo check --workspace PASS；门禁自建表 180→100；fmt 全绿；commit `74340b86c`（25 文件 +38/-2578）。
- **推送**：首推被 pre-push cargo-fmt-check 拦截——根因为协作机 commit 引入 ws.rs `WS_MODULE_WHITELIST` 长数组未分行（非本次改动），独立 fmt commit `f87a2eaa0` 后推送成功。

## 5d. 验证记录（C-2：portal 98 张 r# 字面量建表）

> portal 依赖面前置核查（2026-10-29）：`svc/portal/src/models/schema_defense.rs`（1444 行）机制——事实源 `TABLE_DEFS` 结构体常量、增量迁移 `ensure_table_columns`→`ALTER TABLE ADD COLUMN IF NOT EXISTS`、自检 `verify_table_columns`→`information_schema.columns`、骨架兜底为阶段 0 模板字符串（`CREATE TABLE IF NOT EXISTS "{schema}"."{tbl}" (id …)`，非 r# 字面量、门禁不计数）。**结论：C-2 可行且无防御风险**——98 表全为模块级 `pub const CREATE_XXX_TABLE: &str = r#"…"#` + `sqlx::query(CONST)` 调用，删除后防御环不受影响。

- **删除范围**：17 个模块文件 98 个建表 const（ai_ops 9 / adaptive_execution 7 / deployment_manager 7 / query_optimizer 6 / gateway_security 6 / realtime_processing 6 / subscription_manager 6 / streaming_processing 6 / persisted_query 6 / gateway_monitoring 6 / orchestration 6 / deep_federation 6 / version_control 6 / security_v1 5 / intelligent_gateway 5 / edge_computing 5 / schema_versioning/types.rs 3）+ 7 处调用语句 + 空壳 `ensure_*_tables_exist` 函数（adaptive_execution）+ 跨文件调用 `schema_versioning/handlers.rs::ensure_tables_exist`（整函数删除）。
- **脚本缺陷修正**：初版批量脚本仅遍历 const 定义所在文件，漏删跨文件调用点（schema_versioning/types.rs 定义 → handlers.rs 调用），编译 E0425 定位后补删。
- **验证**：cargo check --workspace --all-targets PASS（0 error）；**门禁自建表 100→2**（仅剩 `inquiries`（1 列 ALTER 口径，PASS）+ `schema_defense_ledger` 台账白名单（INFO））；fmt 全绿。commit `d1a39fdb7`（18 文件，-1495 行）。
- **推送（2 轮挫败后成功）**：第 1 轮被 pre-push cargo-clippy-workspace 拦（协作机 8c28fa45d 引入 ws.rs:479 换行 fmt + ws.rs:108 `broadcast_quota.lock().unwrap()` 触发 `-D clippy::unwrap-used`）→ rustfmt 修复 ws.rs + unwrap 改 `let Ok(mut q) = … else { return false; }`，独立 commit `cd52870db` → 第 2 轮 push 被远端并发拒绝（cannot lock ref，协作机已推进至 4e68f9aa9）→ fetch+rebase（2/2 无冲突）+ 本地 fmt/check 复绿 → 第 3 轮推送成功 `4e68f9aa9..cd52870db`。

## 5e. 最终战果（D7 全链）

| 阶段 | commit | 自建表数 |
|---|---|---|
| 基线 | — | 352 |
| D7 第一批 lims/portal | 8a383e4fc | 352→317 |
| D7 第二批 integration | 43fef2f72 | 317→306 |
| D7 顺延 7 crate | a6c63d41d | 306→180 |
| C-1 非 portal 79 张 | 74340b86c | 180→100 |
| **C-2 portal 98 张** | **d1a39fdb7** | **100→2** |

**里程碑达成：全仓运行时自建 DDL 清零，双源根除**——迁移 DDL（1012 表）为唯一权威，门禁 `scripts/migration/check-schema-defense.mjs`（errors=0 warnings=0）唯一仲裁；有意保留项仅 `inquiries`（1 列，ALTER/索引口径已由门禁证覆盖）与 `schema_defense_ledger`（台账白名单）。

**收尾挂账**：① WSL/协作机拉取后空库四步回归（建库 → migrate.sh run → 启动冒烟 → 授权基线第④步）复核；② 初始化路径远期项 C（废弃自建 DDL 路径、根除双源，需先做依赖面清单评估再排期；本轮 B 列级校验门禁已先行兜底）；③ dependabot 28 漏洞（1 critical/9 high）另排。

## 5f. 远期 C 项评估结论（2026-10-29 拍板：关闭）

> 依据：全仓依赖面清单盘点（实测）。C 项原目标"废弃自建 DDL 路径、根除双源"经评估后**判定为误靶**——CREATE TABLE 双源已由 §5c/§5d 根除，剩余 TABLE_DEFS 防御体系**不是 DDL 双源**。

### 依赖面清单（实测）

| 层 | 量 | 明细 |
|---|---|---|
| TABLE_DEFS 运行时列校验定义 | 26 文件 / **771 表** | finance 127 · portal 123 · wms 56 · lims 44 · ehs 44（含 models/mod.rs 重复定义）· hrm 31 · erp 31 · unified-core 30 · qms 30 · gis 28 · scm 27 … |
| 防御调用点 | **98 处** | server 18 处聚合 + 各 crate 入口（lims/integration/qms/finance/analytics 等） |
| 共享引擎 | 1 | `lib/shared-db/src/schema.rs`：`schema_defense_ledger` 台账（建表/INSERT/SELECT）——全仓唯一剩余自建表（有意保留） |
| 启动入口 | 1 | `lib/shared-bootstrap/src/lib.rs` bootstrap() |

### 判定：TABLE_DEFS 防御 = 运行时契约校验，与迁移权威互补

- 迁移 DDL = 建库事实源（CI 侧由 B 门禁 checkNoModify + schema-defense 兜底）；
- TABLE_DEFS = **实际库结构运行时自检**（裸库漏跑迁移、人为 DDL 漂移、增量补列即时暴露），不建表（仅 `ALTER ADD COLUMN IF NOT EXISTS` + `information_schema` 自检 + 台账）。

### 决策

- **C 项关闭**：不废弃 TABLE_DEFS 防御体系（收益：-数万行代码；成本：失去运行时自检 + 26×98 改造面 + 台账追踪缺失，得不偿失）。
- **漂移治理改走 B 门禁扩展（排期，下一迭代）**：TABLE_DEFS 定义 ↔ 迁移 DDL **列级一致性校验**（生成期静态比对，防两权威源漂移），替代"删除"作为治理手段：
  - 目标：TABLE_DEFS 每表每列须在迁移 DDL 中找到一致定义（列名/类型/默认值语义一致）；不一致即门禁红。
  - 验收：门禁新增列级比对输出（diff 明细）；全仓 771 表首轮对齐（预期存量无差异，新增表强约束）。
  - 实施方式：扩展 `scripts/migration/check-schema-defense.mjs`（提取迁移 DDL 列定义 ↔ 解析各 crate TABLE_DEFS 数组）。
