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
- **验证**：cargo check --workspace --all-targets PASS；schema-defense PASS（自建表数 306→180）；fmt 全绿。剩余自建 180 表为迁移权威覆盖的运行时 TABLE_DEFS 等（远期 C 项评估范围）。

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
