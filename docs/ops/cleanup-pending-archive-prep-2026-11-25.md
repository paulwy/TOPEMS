# 71 张死表 / 副本归档前置准备（2026-11-25）

> 承接收口汇总 P2 #3。上游台账：`cleanup-dead-duplicate-tables-2026-11-24.md` + `.csv`（22 死表 + 49 副本）。本材料完成批次重叠甄别、依赖核对脚本与归档前置条件梳理。**未对生产执行任何 DDL，未开窗，未新增链上迁移。**

## 1. 关键结论：71 张中 60 张已被既有归档迁移覆盖

将本批清单与链上既有归档/删表迁移逐条比对（batch1/2、`20261119160000`、`20261119180000`、`20261119200000`）：

| 归属 | 数量 | 处置 |
|---|---:|---|
| 已被既有迁移覆盖（covered） | 60 | 追平账本重放既有迁移后随批次归档 DROP，**本批不重复处置、不重复归档** |
| 本批独有（standalone） | 11 | 7 死表 + 4 空副本；需新批次按既有归档机制处置 |

差集明细：`cleanup-pending-split-2026-11-25.csv`（`disposition` / `covered_by` 列）。

> 根因：生产账本滞后（水位 `20261119000002`），既有归档迁移尚未在生产重放；11-24 生产快照里这些表仍在，台账复核时被重复标为死表/副本。**追平账本后须重跑本甄别，以追平后快照为准。**

## 2. 执行顺序（强约束）

1. **先追平账本**，重放既有归档批次（`20261119100000` / `110000` / `160000` / `180000` / `200000`），60 张随之归档。
2. 追平后复跑依赖核对，确认 11 张独有表仍在位、仍 0 行/无外部引用。
3. 对 11 张独有表单独成批，按 §5 前置条件完成备份、外部消费复核、预发演练后再开窗。
4. 禁止在既有批次未落地前，对 covered 表另起归档迁移（会与既有批次冲突、重复快照）。

## 3. 既有归档机制参照（沿用 206 批次范式）

详见 `docs/quality/dead-table-disposal-plan-2026-11-19.md` §3；本批新批次应对齐同一套不变量：

- **闸门**：会话级 `app.drop_dead_tables_gate`（或新批次专用闸门 GUC），未显式注入即 `RAISE EXCEPTION` 中止。
- **归档内容**：结构 `LIKE ... INCLUDING ALL EXCLUDING DEFAULTS` + 数据 `SELECT *`；默认值/序列/策略/外键/视图分别快照到 `archive._column_defaults` / `_sequence_snapshot` / `_rls_policy_snapshot` / `_fk_snapshot` / `_view_snapshot`。
- **三方行数校验**：源表 = 归档表 = 插入行数；不符即 `RAISE EXCEPTION`，整事务回滚。
- **DROP 顺序**：依赖视图 → 入向外键 → 表。
- **单事务**：归档 + 校验 + DROP 同一事务，一张失败全批不删。
- **保留期**：180 天，写入 `_drop_manifest.retention_until`；归档表不建索引、不收集统计。
- **回滚**：依 archive 元数据重建结构/数据/策略/外键/默认值/序列；不恢复 GRANT/COMMENT/统计。

## 4. 11 张独有表清单

### 4.1 死表 7 张（源码零引用、空表；`ticket.schema_defense_ledger` 1 行单独备份）

| 表 | 行数 | 前置要点 |
|---|---:|---|
| `flow._deprecated_core_doc_document_versions` | 0 | 确认无视图/函数引用；本地库已不存在，生产以快照为准 |
| `portal.graphql_execution_profiles` | 0 | 核对是否被 portal schema 自愈/防御迁移重建（见 §7 风险） |
| `portal.portal_alert_thresholds` | 0 | 同上 |
| `portal.portal_compatibility_reports` | 0 | 同上 |
| `portal.portal_queue_messages` | 0 | 同上 |
| `public._archive_core_doc_documents` | 0 | 命名已是 `_archive`；核对是否为历史归档残留 |
| `ticket.schema_defense_ledger` | **1** | **归档前单独 `COPY`/`pg_dump` 导出这 1 行**；确认 schema-defense 启动不会重建（对照 `bi.audit_logs` 例外口径） |

### 4.2 空副本 4 张（源码访问本体，副本 0 行）

| 副本 | 本体 | 前置要点 |
|---|---|---|
| `iam.core_roles` | `public.core_roles` | **入向外键 2 条**：`iam.core_role_permissions`、`iam.core_user_roles`；须确认两张引用方同为遗留副本、同批归档或外键随副本移除（见 §7-R2） |
| `public.core_ticket_activities` | `ticket.core_ticket_activities` | 本体在位（本地已核）；副本无入向外键/视图 |
| `public.core_ticket_comments` | `ticket.core_ticket_comments` | 同上 |
| `public.core_tickets` | `ticket.core_tickets` | 本体在位；今日迁移 `20261125002000` 操作的是本体，副本不受影响 |

## 5. 窗口前前置准备

### 5.1 只读依赖核对（脚本产物）

`scripts/ops/cleanup-pending-dependency-check-2026-11-25.sql`，生产只读事务执行：

```bash
PGOPTIONS='-cdefault_transaction_read_only=on' \
  psql -v ON_ERROR_STOP=1 -d topems_prod \
  -f scripts/ops/cleanup-pending-dependency-check-2026-11-25.sql
```

输出八段：存在性/RLS/FORCE/策略/触发器、行数估算、入向外键、向外外键、依赖视图、非属主授权、发布/外部表、副本本体在位。

放行判读：
- 死表行数 = 0（`schema_defense_ledger` = 1 且已单独备份）；
- 入向外键来源要么为空，要么同样在待归档遗留集合内（依赖图封闭）；
- 无依赖视图/物化视图、无外部角色授权、无 publication/FDW；
- 副本本体在位。

### 5.2 外部消费复核（DBA 侧，本机不能证明）

参照 206 批次 §5.1 采集：表级访问计数（`pg_stat_user_tables`，注意 stats_reset 窗口）、非属主授权、逻辑复制发布/订阅槽、FDW/外部表、库内函数/作业动态 SQL、`pg_stat_statements` 历史语句、触发器/事件触发器。
**未获 DBA 书面确认「无外部系统直连读、无库内定时作业引用」前，闸门不打开。**

### 5.3 备份与演练

1. `pg_dump` 全库或按表逻辑备份；1 行表单独导出留存。
2. 预发/演练库带生产基线数据复跑归档迁移：归档 → 行数校验 → DROP → 回滚重建，读数与 206 批次演练口径一致。
3. 观察期：先 `RENAME` 归档名（不 DROP）观察 ≥7 天，覆盖至少一次周末批处理与一次日结；无 `42P01`/相关 5xx 后再 DROP。

## 6. 归档执行与回滚

- 新批次迁移对齐 §3 范式；DROP 语句按 schema 分组、schema 名字面量、表名参数化，带 `-- destructive-gate: allow` 豁免标记（kind/rows-at-review/backup/expires/owner/ticket 填全）。
- 回滚沿用 archive 元数据重建；回滚同样 `--single-transaction`。
- 归档表名按批次前缀 + schema + 表名，>63 字节截断；同名归档表已存在时拒绝重跑。

## 7. 风险与阻断条件

| # | 风险 | 判据 | 处置 |
|---|---|---|---|
| R1 | portal 四表被 schema 自愈/防御迁移重建 | 迁移链存在 `selfheal`/`schema_canonical` 对齐脚本；应用启动即 `CREATE TABLE IF NOT EXISTS` | 先核对自愈口径；若会重建，先改迁移/启动逻辑再归档，避免删除后复活（同 `bi.audit_logs` 例外） |
| R2 | `iam.core_roles` 副本被活表外键引用 | 核对脚本③命中 `iam.core_role_permissions` / `iam.core_user_roles` | 先定性两张引用方：同为遗留副本则同批归档；若为活表，`iam.core_roles` 移出本批，阻断 DROP |
| R3 | 1 行表未备份即归档 | `schema_defense_ledger` 行数 ≠ 0 | 先 `COPY` 导出留存并核对内容，再纳入批次 |
| R4 | 追平账本后清单变化 | 既有批次重放后部分表已消失 | 以追平后快照重跑 §5.1 核对，更新差集 CSV |
| R5 | 近名表被外部报表误连 | `core_tickets`/`core_roles` 等与权威表近名 | §5.2 授权/发布两项单独确认；名字越像越需 DBA 书面背书 |
| R6 | 序列/默认值牵连 DROP | 表含 serial 或 `nextval` 默认值 | 按既有范式快照 `_sequence_snapshot`/`_column_defaults`，归档 `EXCLUDING DEFAULTS` |

## 8. 不在本批范围

- 60 张 covered 表：随既有批次处置，本材料不重复出迁移。
- 不清理 180 天后的 archive 归档表（另行评估、新版本迁移）。
- 不改动活表本体；副本归档前本体必须在位。

## 9. 产物

| 文件 | 作用 |
|---|---|
| `cleanup-pending-split-2026-11-25.csv` | 71 张差集归属：60 covered（含既有批次版本）/ 11 standalone |
| `cleanup-pending-dependency-check-2026-11-25.sql` | 11 张独有表只读依赖核对脚本（本地 dev 克隆已干跑通过） |
| 本手册 | 批次衔接、前置条件、执行/回滚口径、风险阻断 |
