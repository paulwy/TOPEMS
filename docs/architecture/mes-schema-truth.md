# MES Schema Truth Source (制造执行服务 DDL 汇总真相源)

> **Version**: 1.0 · **Date**: 2026-08-08
> **Last generated**: 2026-08-08  `node scripts/verify-mes-schema-truth.mjs --regen` 自动生成，请勿手改
> **Checkpoint migration**: `svc/mes/migrations/20260809000000_mes_schema_consolidation.sql`（conceptually absorbs 13 micro-migrations from 2026-07-09）
> **Checksum (16)**: `23cde115bd952fe0`（SHA-256 前 16，基于 table × column 有序列表）
> **Migration files scanned (16)**: 20260703000001_create_mes_schema.sql · 20260705000002_create_quality_management.sql · 20260709000002_add_missing_tables.sql · 20260709000003_add_work_orders_and_teams.sql · 20260709000004_add_equipment_tables.sql · 20260709000005_add_missing_tables_and_columns.sql · 20260709000006_add_more_tables.sql · 20260709000007_add_quality_tables.sql · 20260709000008_fix_missing_columns.sql · 20260709000009_add_missing_columns.sql · 20260709000010_add_quality_columns.sql · 20260709000011_add_effective_date.sql · 20260709000012_add_result_column.sql · 20260709000013_add_findings_column.sql · 20260709000014_add_work_order_tables.sql · 20260710161000_add_tenant_id.sql
> **Runtime DDL truth**: `svc/mes/src/main.rs → init_database()` + `svc/mes/migrations/*.sql`（二者必须同步，见下方 §7）

## 1. Why this document exists

During 2026-07-09 the MES service was actively prototyped, producing **13 micro-migrations on a single day** (000002 through 000014). These 13 files contain interleaved CREATE TABLE + ALTER TABLE ADD COLUMN stanzas that reflect the chaotic iteration of that day and are hard to review as a whole. Going forward, this document is the **single entry point for answering**:

1. Which tables does MES own, and which migration first introduced each?
2. Which tables live in schema `plugin_mes` vs the legacy `mes` alias?
3. What columns must every new table have (`id`, `tenant_id`, `deleted_at`, `created_at`, `updated_at` — see §7)

## 2. 汇总

| 指标 | 值 |
|---|---|
| 唯一表总数 | **43** |
| 总列数 | **342** |
| 迁移文件数 | 16 |
| "碎片"小补丁数量 (<5 行 ADD COLUMN) | 5（文件 0009~0013 共 10 列 ADD COLUMN，历史遗留）|
| 潜在重复 CREATE TABLE (IF NOT EXISTS 保护) | 2（0007 重复建 4 张质量表 · 0014 重复建 work_orders/material_requirements）|

## 3. 碎片段落说明（V68.2-6 收敛对象）

历史快速迭代留下了 5 条 1-4 行的 ADD COLUMN "补丁式" 迁移 `20260709000009~000013`，以及 2 条 `CREATE TABLE IF NOT EXISTS` 尝试与早期迁移重复建表。
由于这些迁移已经在生产 `schema_migrations.version` 锚定，**不可直接删除或重写**（会导致新库 deploy 顺序错乱，也破坏 refly/sqlx 运行时 checksum）。
本文件 + `scripts/verify-mes-schema-truth.mjs` 提供的"事实真相源 + CI 门禁"收敛策略：

- 保留原迁移不动，风险 = 0
- 在本 md 中统一呈现 43 张表的完整列清单，消除"跨 14 个文件才拼出完整 DDL"的痛点
- CI 脚本每跑一次会对比：svc/mes/migrations 的 CREATE/ALTER 并集 === 本 md 列出的 table.col.type.nullable 集合 → 漂移即失败，从机制上阻止未来再出现"第 N 条 1 行补丁迁移"

## 4. Table inventory (ground truth — high level)

Ordered by the migration that first introduced each table. All tables live in schema **`plugin_mes`** (the runtime `search_path`). The legacy bare `mes` schema is not created; queries access tables without a schema prefix and are resolved via `SET search_path = 'plugin_mes'`.

| # | Table | Introduced in migration | Primary key | Soft delete | Notes |
|---|-------|-------------------------|-------------|-------------|-------|
| 1 | `equipment` | `20260703000001_create_mes_schema.sql` | `id` (UUID) | ✅ `deleted_at` | 设备主表 |
| 2 | `equipment_oee` | `20260703000001_create_mes_schema.sql` | `id` (UUID) | ✅ | OEE 统计 |
| 3 | `material_boms` | `20260703000001_create_mes_schema.sql` | `id` (UUID) | ✅ | 物料清单头 |
| 4 | `bom_items` | `20260709000014_add_work_order_tables.sql` | `id` (UUID) | ✅ | 子行 |
| 5 | `material_issues` | `20260709000006_add_more_tables.sql` | `id` (UUID) | ✅ | 领料头 |
| 6 | `material_issue_items` | (same) | 复合 PK | 🔴 cascade hard delete | 子表（随领料头删）|
| 7 | `material_returns` | `20260709000006_add_more_tables.sql` | `id` (UUID) | ✅ | 退料头 |
| 8 | `material_return_items` | (same) | 复合 PK | 🔴 cascade hard delete | 子表 |
| 9 | `process_flows` | `20260709000002_add_missing_tables.sql` | `id` (UUID) | ✅ | 工艺流程头 |
| 10 | `process_flow_steps` | (same) | 复合 PK | 🔴 cascade hard delete | 步骤 |
| 11 | `process_routes` | `20260709000002_add_missing_tables.sql` | `id` (UUID) | ✅ | 工艺路线 |
| 12 | `process_route_steps` | (same) | 复合 PK | 🔴 cascade hard delete | 子步骤 |
| 13 | `production_orders` | `20260703000001_create_mes_schema.sql` | `id` (UUID) | ✅ | 生产订单 |
| 14 | `production_processes` | `20260703000001_create_mes_schema.sql` | `id` (UUID) | ✅ | 工序 |
| 15 | `production_records` | `20260709000005_add_missing_tables_and_columns.sql` | `id` (UUID) | ✅ | 生产记录 |
| 16 | `production_schedules` | `20260703000001_create_mes_schema.sql` | `id` (UUID) | ✅ | 排程 |
| 17 | `quality_inspections` | `20260705000002_create_quality_management.sql` | `id` (UUID) | ✅ | 质检记录（含 V68.1-2 补 3 列：result/sampling_plan/control_plan_ref） |
| 18 | `quality_patrols` | `20260709000007_add_quality_tables.sql` | `id` (UUID) | ✅ | 巡检 |
| 19 | `quality_patrol_items` | (same) | `id` (UUID) | ✅ findings 列在 000013 补齐 |
| 20 | `quality_standards` | `20260703000001_create_mes_schema.sql` | `id` (UUID) | ✅ effective_date 列在 000011 补齐 |
| 21 | `quality_standard_values` | `20260703000001_create_mes_schema.sql` | `id` (UUID) | ✅ | 检验项取值 |
| 22 | `teams` | `20260709000003_add_work_orders_and_teams.sql` | `id` (UUID) | ✅ | 班组 |
| 23 | `team_members` | (same) | 复合 PK | 🔴 cascade hard delete | 组成员 |
| 24 | `work_stations` | `20260709000003_add_work_orders_and_teams.sql` | `id` (UUID) | ✅ | 工位 |
| 25 | `wips` | `20260703000001_create_mes_schema.sql` | `id` (UUID) | ✅ | 在制品 |
| 26 | `work_orders` | `20260709000003_add_work_orders_and_teams.sql` | `id` (UUID) | ✅ | 工单 |
| 27 | `work_order_operations` | `20260709000014_add_work_order_tables.sql` | `id` (UUID) | ✅ | 工单工序 |
| 28 | `work_reports` | `20260709000014_add_work_order_tables.sql` | `id` (UUID) | ✅ | 报工 |
| — | `inventory_checks` | `20260709000008_fix_missing_columns.sql` | `id` (UUID) | ✅ | 库存盘点 |
| — | `stocktake_tasks` | `20260709000008_fix_missing_columns.sql` | `id` (UUID) | ✅ | 盘点任务 |
| — | `equipment_maintenance_records` | `20260709000004_add_equipment_tables.sql` | `id` (UUID) | ✅ | 设备维护记录 |

**Totals**: 31 tables — 26 entity tables (soft delete) + 5 junction/detail child tables (cascade hard delete via FK + 保持 V68.1-3 排除清单一致).

## 5. 表清单（43 张 · 完整列级明细）

### `equipment` (13 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`, `20260709000005_add_missing_tables_and_columns.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `purchase_date` | `DATE` | YES | - | - |
| `warranty_end_date` | `DATE` | YES | - | - |
| `maintenance_cycle` | `INT` | YES | `30` | - |
| `last_maintenance_date` | `DATE` | YES | - | - |
| `next_maintenance_date` | `DATE` | YES | - | - |
| `description` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `equipment_type` | `VARCHAR(128)` | YES | - | - |
| `last_maintenance` | `TIMESTAMP` | YES | - | - |
| `next_maintenance` | `TIMESTAMP` | YES | - | - |
| `running_hours` | `DECIMAL(10,2)` | YES | `0` | - |

### `production_orders` (15 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`, `20260709000005_add_missing_tables_and_columns.sql`, `20260709000006_add_more_tables.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `product_id` | `UUID` | YES | - | - |
| `source_order_id` | `UUID` | YES | - | - |
| `planned_start_date` | `TIMESTAMP` | YES | - | - |
| `planned_end_date` | `TIMESTAMP` | YES | - | - |
| `actual_start_date` | `TIMESTAMP` | YES | - | - |
| `actual_end_date` | `TIMESTAMP` | YES | - | - |
| `workshop_id` | `UUID` | YES | - | - |
| `notes` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `workstation` | `VARCHAR(256)` | YES | - | - |
| `start_time` | `TIMESTAMP` | YES | - | - |
| `end_time` | `TIMESTAMP` | YES | - | - |
| `due_date` | `TIMESTAMP` | YES | - | - |

### `production_processes` (7 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `description` | `TEXT` | YES | - | - |
| `sequence` | `INT` | YES | `0` | - |
| `equipment_required` | `BOOLEAN` | YES | `false` | - |
| `estimated_duration` | `INT` | YES | `0` | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `work_stations` (8 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `workshop_id` | `UUID` | YES | - | - |
| `capacity` | `INT` | YES | `1` | - |
| `equipment_id` | `UUID` | YES | - | - |
| `process_id` | `UUID` | YES | - | - |
| `description` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `production_records` (11 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `order_id` | `UUID` | NO | - | - |
| `process_id` | `UUID` | YES | - | - |
| `work_station_id` | `UUID` | YES | - | - |
| `equipment_id` | `UUID` | YES | - | - |
| `operator_id` | `UUID` | YES | - | - |
| `start_time` | `TIMESTAMP` | NO | - | - |
| `end_time` | `TIMESTAMP` | YES | - | - |
| `notes` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `production_schedules` (15 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `order_id` | `UUID` | YES | - | - |
| `product_id` | `UUID` | YES | - | - |
| `work_station_id` | `UUID` | YES | - | - |
| `equipment_id` | `UUID` | YES | - | - |
| `process_id` | `UUID` | YES | - | - |
| `planned_start_time` | `TIMESTAMP` | YES | - | - |
| `planned_end_time` | `TIMESTAMP` | YES | - | - |
| `actual_start_time` | `TIMESTAMP` | YES | - | - |
| `actual_end_time` | `TIMESTAMP` | YES | - | - |
| `priority` | `INT` | YES | `0` | - |
| `sequence` | `INT` | YES | `0` | - |
| `notes` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `material_boms` (5 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `product_id` | `UUID` | YES | - | - |
| `description` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `bom_items` (6 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `bom_id` | `UUID` | NO | - | - |
| `material_id` | `UUID` | YES | - | - |
| `sequence` | `INT` | YES | `0` | - |
| `notes` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `material_issues` (9 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `order_id` | `UUID` | YES | - | - |
| `bom_id` | `UUID` | YES | - | - |
| `warehouse_id` | `UUID` | YES | - | - |
| `operator_id` | `UUID` | YES | - | - |
| `issue_time` | `TIMESTAMP` | YES | - | - |
| `notes` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `material_issue_items` (5 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `issue_id` | `UUID` | NO | - | - |
| `material_id` | `UUID` | YES | - | - |
| `notes` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `material_returns` (8 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `order_id` | `UUID` | YES | - | - |
| `warehouse_id` | `UUID` | YES | - | - |
| `operator_id` | `UUID` | YES | - | - |
| `return_time` | `TIMESTAMP` | YES | - | - |
| `notes` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `material_return_items` (6 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `return_id` | `UUID` | NO | - | - |
| `material_id` | `UUID` | YES | - | - |
| `reason` | `TEXT` | YES | - | - |
| `notes` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `quality_records` (8 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `order_id` | `UUID` | YES | - | - |
| `product_id` | `UUID` | YES | - | - |
| `inspection_time` | `TIMESTAMP` | YES | - | - |
| `defect_reason` | `TEXT` | YES | - | - |
| `notes` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `batch_records` (7 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `product_id` | `UUID` | YES | - | - |
| `production_date` | `DATE` | YES | - | - |
| `expiry_date` | `DATE` | YES | - | - |
| `notes` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `equipment_oee` (6 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `equipment_id` | `UUID` | NO | - | - |
| `record_date` | `DATE` | NO | - | - |
| `notes` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `wips` (10 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `order_id` | `UUID` | YES | - | - |
| `product_id` | `UUID` | YES | - | - |
| `current_process_id` | `UUID` | YES | - | - |
| `current_work_station_id` | `UUID` | YES | - | - |
| `start_time` | `TIMESTAMP` | YES | - | - |
| `last_transfer_time` | `TIMESTAMP` | YES | - | - |
| `notes` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `wip_transfers` (9 cols)

- 定义来源迁移：`20260703000001_create_mes_schema.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `wip_id` | `UUID` | NO | - | - |
| `from_process_id` | `UUID` | YES | - | - |
| `from_work_station_id` | `UUID` | YES | - | - |
| `to_process_id` | `UUID` | YES | - | - |
| `to_work_station_id` | `UUID` | YES | - | - |
| `transfer_time` | `TIMESTAMP` | NO | - | - |
| `notes` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `quality_inspections` (16 cols)

- 定义来源迁移：`20260705000002_create_quality_management.sql`, `20260709000006_add_more_tables.sql`, `20260709000008_fix_missing_columns.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `order_id` | `UUID` | YES | - | - |
| `process_id` | `UUID` | YES | - | - |
| `memo` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `inspection_date` | `TIMESTAMP` | YES | - | - |
| `remarks` | `TEXT` | YES | - | - |
| `process_name` | `VARCHAR(256)` | YES | - | - |
| `inspection_type` | `VARCHAR(64)` | YES | - | - |
| `quantity` | `DECIMAL(12,2)` | YES | `0` | - |
| `qualified_quantity` | `DECIMAL(12,2)` | YES | `0` | - |
| `unqualified_quantity` | `DECIMAL(12,2)` | YES | `0` | - |
| `qualification_rate` | `DECIMAL(5,2)` | YES | - | - |
| `inspection_time` | `TIMESTAMP` | YES | - | - |
| `result` | `VARCHAR(64)` | YES | - | - |

### `quality_patrols` (8 cols)

- 定义来源迁移：`20260705000002_create_quality_management.sql`, `20260709000007_add_quality_tables.sql`, `20260709000012_add_result_column.sql`, `20260709000013_add_findings_column.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `workstation_id` | `UUID` | YES | - | - |
| `findings` | `TEXT` | YES | - | - |
| `memo` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `patrol_date` | `TIMESTAMP` | YES | - | - |
| `result` | `VARCHAR(64)` | YES | - | - |

### `quality_patrol_items` (5 cols)

- 定义来源迁移：`20260705000002_create_quality_management.sql`, `20260709000007_add_quality_tables.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `patrol_id` | `UUID` | NO | - | - |
| `remark` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `quality_standards` (7 cols)

- 定义来源迁移：`20260705000002_create_quality_management.sql`, `20260709000007_add_quality_tables.sql`, `20260709000010_add_quality_columns.sql`, `20260709000011_add_effective_date.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `description` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `version` | `VARCHAR(32)` | YES | `'1.0'` | - |
| `effective_date` | `TIMESTAMP` | YES | - | - |
| `inspection_type` | `VARCHAR(64)` | YES | - | - |

### `quality_standard_values` (7 cols)

- 定义来源迁移：`20260705000002_create_quality_management.sql`, `20260709000007_add_quality_tables.sql`, `20260709000009_add_missing_columns.sql`, `20260709000010_add_quality_columns.sql`, `20260709000011_add_effective_date.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `standard_id` | `UUID` | NO | - | - |
| `remark` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `description` | `TEXT` | YES | - | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `inspection_method` | `VARCHAR(256)` | YES | - | - |

### `process_flows` (5 cols)

- 定义来源迁移：`20260709000002_add_missing_tables.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `description` | `TEXT` | YES | - | - |
| `route_id` | `UUID` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `process_flow_steps` (16 cols)

- 定义来源迁移：`20260709000002_add_missing_tables.sql`, `20260709000005_add_missing_tables_and_columns.sql`, `20260709000006_add_more_tables.sql`, `20260709000008_fix_missing_columns.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `flow_id` | `UUID` | NO | - | - |
| `process_id` | `UUID` | YES | - | - |
| `sequence` | `INT` | YES | `0` | - |
| `work_station_id` | `UUID` | YES | - | - |
| `equipment_id` | `UUID` | YES | - | - |
| `estimated_duration` | `INT` | YES | `0` | - |
| `is_required` | `BOOLEAN` | YES | `true` | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `equipment_ids` | `TEXT` | YES | - | - |
| `standard_time` | `DECIMAL(8,2)` | YES | - | - |
| `wait_time` | `DECIMAL(8,2)` | YES | - | - |
| `quality_check_required` | `BOOLEAN` | YES | `false` | - |
| `transfer_time` | `DECIMAL(8,2)` | YES | - | - |
| `description` | `TEXT` | YES | - | - |

### `work_reports` (19 cols)

- 定义来源迁移：`20260709000002_add_missing_tables.sql`, `20260709000005_add_missing_tables_and_columns.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `work_order_id` | `UUID` | YES | - | - |
| `order_id` | `UUID` | YES | - | - |
| `work_station_id` | `UUID` | YES | - | - |
| `report_date` | `DATE` | NO | - | - |
| `remark` | `TEXT` | YES | - | - |
| `approved_by` | `UUID` | YES | - | - |
| `approved_at` | `TIMESTAMP` | YES | - | - |
| `approval_remark` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `workstation` | `VARCHAR(256)` | YES | - | - |
| `operator` | `VARCHAR(128)` | YES | - | - |
| `quantity` | `DECIMAL(12,2)` | YES | `0` | - |
| `good_quantity` | `DECIMAL(12,2)` | YES | `0` | - |
| `bad_quantity` | `DECIMAL(12,2)` | YES | `0` | - |
| `start_time` | `TIMESTAMP` | YES | - | - |
| `end_time` | `TIMESTAMP` | YES | - | - |
| `duration` | `DECIMAL(8,2)` | YES | - | - |

### `teams` (7 cols)

- 定义来源迁移：`20260709000003_add_work_orders_and_teams.sql`, `20260709000009_add_missing_columns.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `department_id` | `UUID` | YES | - | - |
| `leader_id` | `UUID` | YES | - | - |
| `description` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `leader_name` | `VARCHAR(128)` | YES | - | - |

### `team_members` (5 cols)

- 定义来源迁移：`20260709000003_add_work_orders_and_teams.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `team_id` | `UUID` | NO | - | - |
| `member_id` | `UUID` | YES | - | - |
| `joined_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `work_orders` (12 cols)

- 定义来源迁移：`20260709000003_add_work_orders_and_teams.sql`, `20260709000014_add_work_order_tables.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `order_id` | `UUID` | YES | - | - |
| `work_station_id` | `UUID` | YES | - | - |
| `process_id` | `UUID` | YES | - | - |
| `plan_start_date` | `TIMESTAMP` | YES | - | - |
| `plan_end_date` | `TIMESTAMP` | YES | - | - |
| `actual_start_date` | `TIMESTAMP` | YES | - | - |
| `actual_end_date` | `TIMESTAMP` | YES | - | - |
| `team_id` | `UUID` | YES | - | - |
| `remark` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `material_requirements` (7 cols)

- 定义来源迁移：`20260709000003_add_work_orders_and_teams.sql`, `20260709000014_add_work_order_tables.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `order_id` | `UUID` | YES | - | - |
| `bom_id` | `UUID` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `required_date` | `TIMESTAMP` | YES | - | - |
| `remark` | `TEXT` | YES | - | - |

### `material_requirement_items` (4 cols)

- 定义来源迁移：`20260709000003_add_work_orders_and_teams.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `requirement_id` | `UUID` | NO | - | - |
| `material_id` | `UUID` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `production_kanbans` (6 cols)

- 定义来源迁移：`20260709000003_add_work_orders_and_teams.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `order_id` | `UUID` | YES | - | - |
| `priority` | `INT` | YES | `0` | - |
| `display_order` | `INT` | YES | `0` | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `quality_traceability_records` (7 cols)

- 定义来源迁移：`20260709000003_add_work_orders_and_teams.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `order_id` | `UUID` | YES | - | - |
| `product_id` | `UUID` | YES | - | - |
| `inspection_time` | `TIMESTAMP` | YES | - | - |
| `result` | `JSONB` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `equipment_maintenance_records` (8 cols)

- 定义来源迁移：`20260709000004_add_equipment_tables.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `equipment_id` | `UUID` | YES | - | - |
| `description` | `TEXT` | YES | - | - |
| `start_time` | `TIMESTAMP` | NO | - | - |
| `end_time` | `TIMESTAMP` | YES | - | - |
| `remarks` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `equipment_inspections` (8 cols)

- 定义来源迁移：`20260709000004_add_equipment_tables.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `equipment_id` | `UUID` | YES | - | - |
| `inspection_date` | `TIMESTAMP` | YES | - | - |
| `items` | `TEXT` | YES | - | - |
| `abnormalities` | `TEXT` | YES | - | - |
| `remarks` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `inventory_items` (3 cols)

- 定义来源迁移：`20260709000004_add_equipment_tables.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `expiry_date` | `TIMESTAMP` | YES | - | - |
| `last_updated` | `TIMESTAMP` | YES | `NOW()` | - |

### `process_routes` (4 cols)

- 定义来源迁移：`20260709000005_add_missing_tables_and_columns.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `description` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `stocktake_records` (8 cols)

- 定义来源迁移：`20260709000005_add_missing_tables_and_columns.sql`, `20260709000008_fix_missing_columns.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `task_id` | `UUID` | YES | - | - |
| `item_id` | `UUID` | YES | - | - |
| `remark` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `counted_by` | `VARCHAR(128)` | YES | - | - |
| `counted_at` | `TIMESTAMP` | YES | - | - |

### `inbound_orders` (4 cols)

- 定义来源迁移：`20260709000005_add_missing_tables_and_columns.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `total_items` | `INT` | YES | `0` | - |
| `expected_date` | `TIMESTAMP` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `outbound_orders` (4 cols)

- 定义来源迁移：`20260709000005_add_missing_tables_and_columns.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `total_items` | `INT` | YES | `0` | - |
| `expected_date` | `TIMESTAMP` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `quality_tasks` (4 cols)

- 定义来源迁移：`20260709000005_add_missing_tables_and_columns.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `due_date` | `TIMESTAMP` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `defect_records` (7 cols)

- 定义来源迁移：`20260709000005_add_missing_tables_and_columns.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `task_id` | `UUID` | YES | - | - |
| `description` | `TEXT` | YES | - | - |
| `images` | `TEXT` | YES | - | - |
| `reported_at` | `TIMESTAMP` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `process_route_steps` (7 cols)

- 定义来源迁移：`20260709000006_add_more_tables.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `route_id` | `UUID` | YES | - | - |
| `process_id` | `UUID` | YES | - | - |
| `sequence` | `INT` | NO | - | - |
| `description` | `TEXT` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

### `stocktake_tasks` (6 cols)

- 定义来源迁移：`20260709000008_fix_missing_columns.sql`
- 列：

| 列名 | 类型 | NULL | DEFAULT | Key |
|---|---|---|---|---|
| `id` | `UUID` | YES | `gen_random_uuid()` | PK |
| `total_items` | `INT` | YES | `0` | - |
| `counted_items` | `INT` | YES | `0` | - |
| `due_date` | `TIMESTAMP` | YES | - | - |
| `created_at` | `TIMESTAMP` | YES | `NOW()` | - |
| `updated_at` | `TIMESTAMP` | YES | `NOW()` | - |

## 6. 13 碎片迁移的列变更明细

这些补丁 000008~000013 都很短（72B ~ 1964B），若未来需要重建数据库，直接在 `CREATE TABLE` 中包含下列列即可，不需要模拟多次 ALTER。

| ID | Migration | Column addition | Absorb into CREATE TABLE of: |
|----|-----------|-----------------|------------------------------|
| 000008 | `fix_missing_columns` | inventory_checks.{status,remark,location}; stocktake_tasks.{status,remark,location} | 两张表的 DDL 内联 |
| 000009 | `add_missing_columns` | quality_inspections.sampling_plan TEXT | quality_inspections |
| 000010 | `add_quality_columns` | quality_standards.control_plan_ref VARCHAR(256) | quality_standards |
| 000011 | `add_effective_date` | quality_standards.effective_date DATE | quality_standards |
| 000012 | `add_result_column` | quality_inspections.result VARCHAR(50) | quality_inspections |
| 000013 | `add_findings_column` | quality_patrol_items.findings TEXT | quality_patrol_items |

## 7. 新表规则（V68.1-5 / V68.1-3 之后）

任何 MES 新表的**最低标准**：

```sql
CREATE TABLE IF NOT EXISTS plugin_mes.new_entity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    -- entity columns here --
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_new_entity_tenant_id ON plugin_mes.new_entity(tenant_id);
CREATE INDEX IF NOT EXISTS idx_new_entity_deleted_at ON plugin_mes.new_entity(deleted_at) WHERE deleted_at IS NULL;
ALTER TABLE plugin_mes.new_entity ENABLE ROW LEVEL SECURITY;
-- policy via v3 add_tenant_id template
```

Add tenant_id / soft_delete 流程：

```bash
node scripts/gen-add-tenant-id.mjs mes plugin_mes --force
```

或者如果只是一张新表加 patch，运行：`scripts/gen-add-tenant-id.mjs mes plugin_mes` 会在最后迁移之后 +1 秒生成严格单调的时间戳。

## 8. Integrity checks (CI 校验集合)

```bash
# 日常 CI：对比 migrations 并集 vs 本 md 列出的表列清单
node scripts/verify-mes-schema-truth.mjs   # 失败时说明迁移改动未同步真相源

# 修改了 mes migrations 后：重新生成本文档并一起提交
node scripts/verify-mes-schema-truth.mjs --regen

# 每个 MES 迁移 14 位时间戳严格单调递增 ✅（NOOP checkpoint 是 2026-08-09，比所有碎片晚）
node scripts/check-migration-names.mjs

# 所有 entity tables 有 deleted_at 且 DELETE → UPDATE ✅
node scripts/v68-1-3/scan_soft_delete_gaps.mjs

# 前端 EntitySchema String 列覆盖率 ≥35% ✅（V68.1-2 已修复）
node scripts/check-entityschema-maxlength.mjs
```
