# public schema 盘点（2026-11-27）

## 一句话结论

`public` 不是「历史同名镜像层」，而是在用的权威层：运行期代码显式引用 1,257 处，`finance.*` / `lims.*` / `flow.*` 有大量外键指向它。**整层删除不可行**，只能逐个证明「零来源 + 零引用 + 0 行」后单点清除。

## 规模

| 项目 | 本机 dev (`topems`) | 生产 (`topems_prod`) |
| --- | --- | --- |
| `public` 表 | 217 | 86 |
| 空表 | 170 | — |
| 非空表 | 25 | — |
| 序列 / 视图 | 6 / 7 | 3 / 0 |

## 判定口径（双维）

一张 `public.X` 只有同时满足以下三条才算「可删残骸」：

1. **无来源**：`database/init/*.sql` 与 `database/migrations/*.sql` 都没有创建它；
2. **零引用**：没有入向外键（`pg_constraint.confrelid`）、没有视图依赖（`pg_depend` + `pg_rewrite`）、运行期代码（`*.rs` / `*.sql` / 脚本）没有 `public.X` 字面引用；
3. **0 行**。

按此口径本机 217 张表分布：

- **零来源零引用 0 行（可删）**：4 张 —— `core_feedbacks`、`hrm_master_data_refs`、`wms_master_data_refs`、`qa_lab_samples_merge_backup_20260919`（已由 `20261127180000` 清除）
- **空表但被代码引用**：143 张 —— 功能未启用（`core_finance_*`、`conversion_*`、`hr_*` 等），结构仍被运行期 SQL 使用，**不能删**
- **空表但被 DB 引用**：约 20 张 —— 多为 `public.qa_*` 被 `lims.*` 外键挂靠，或自身构成 FK 链，先退引用才可谈
- **非空在用**：25 张 —— 见下表，全部有 `tenant_id` + RLS

## 非空 25 张（按行数）

| 表 | 行数 | 被外键引用 | 说明 |
| --- | --- | --- | --- |
| `audit_logs` | 59,745 | 0 | 运行期主审计流，活表 |
| `core_role_permissions` | 3,474 | 0 | 授权关系，活表 |
| `core_permissions` | 1,160 | 1 | 权限字典，活表 |
| `core_tenants` | 797 | **60** | 跨 schema 的租户锚点（`finance.*` / `unified_core.*`） |
| `core_dict_items` | 379 | 1 | 数据字典 |
| `external_erp_sync_logs` | 315 | 0 | 集成日志 |
| `core_menus` | 213 | 1 | 菜单 |
| `qa_ehs_hazards` | 87 | 2 | EHS 隐患 |
| `core_dict_types` | 73 | 1 | 字典分类 |
| `core_menu_groups` | 62 | 1 | 菜单分组 |
| `erp_connections` | 38 | 1 | 集成连接 |
| `core_roles` | 36 | 2 | 角色 |
| `erp_mappings` | 31 | 0 | 集成映射 |
| `core_tenant_users` | 26 | 0 | 租户成员 |
| `core_workflows` | 21 | 1 | 流程定义 |
| `core_faqs` / `core_guides` | 12 / 12 | 0 / 2 | 帮助内容 |
| `schema_defense_ledger` | 11 | 0 | 结构防御台账（无 tenant_id/RLS，单例表） |
| `core_migration_history` | 5 | 0 | 迁移史（单例表） |
| `alerts` / `core_notifications` | 4 / 4 | 0 | 通知 |
| `core_tenant_settings` | 4 | 0 | 租户设置 |
| `core_operation_logs` | 2 | 0 | 操作日志 |
| `core_master_data_refs` / `core_workflow_versions` | 1 / 1 | 0 / 0 | 主数据引用 / 流程版本 |

## 后续批次规则

1. **禁止整层 `DROP SCHEMA public CASCADE`**：public 里既有在用权威表，也有被跨 schema 引用的锚点。
2. 每一批只能收「三条件全满足」的表；任何一张被 FK 或视图挂靠的表，先走「退引用（改指业务 schema 或删外键）→ 再删表」。
3. 删除必须带 `destructive-rows-at-review`（0）与 ticket，并提供按 `pg_dump -s` 导出的可回滚结构。
4. 若发现某张 public 表在运行期仍有写入（`pg_stat_user_tables.n_tup_ins/upd` 增长），说明它是活表：**不要删**，而是把它迁到业务 schema 并同步改代码，属独立立项。
5. 同名业务 schema 表与 public 表并存时，先确认运行期口径（谁被 `public.` 前缀显式引用），再决定哪一边是冗余；不要按名字猜。

## 排查脚本

审计用 SQL 已沉淀在 `scripts/migration/audit-public-schema.sql`，可直接对本机或生产库执行：

```bash
PGHOST=/tmp PGUSER=air psql -X -q "postgresql:///topems?user=air" -f scripts/migration/audit-public-schema.sql
```
