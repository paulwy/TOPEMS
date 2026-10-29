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

### 第二批（另排）：integration

- 删 init_database 编排 + 6 个辅助 `init_*` 函数；`schema_defense::run_schema_migration_and_verify` 按第一批同法保活；server 对应调用点随删。

### 顺延批次（另排，按 crate 逐批）

- ehs / finance / mes / qms / bi / report / ai 的 init_database（server 聚合调用 8 处中的其余）。

### 前置条件（已满足/执行中）

- WSL/协作机空库四步回归（含授权基线第④步，README 已固化）通过后实施；
- 每批删除后：`cargo check`（SQLX_OFFLINE）+ 门禁全绿 + 空库重放。

## 5. 验证记录（第一批）

- [x] SQLX_OFFLINE `cargo check -p topems-lims -p topems-portal -p topems-server --all-targets`：PASS（依赖树全编译，1m23s）
- [x] `node scripts/migration/check-schema-defense.mjs`：PASS（errors=0 warnings=0；自建表数 352→317，恰移除 lims 31 + portal 4）
- [x] `bash scripts/migration/validate.sh`：不涉及迁移文件改动，无需重跑
- [x] 提交推送远端；协作机拉取后空库四步回归复核（待协作机执行）
