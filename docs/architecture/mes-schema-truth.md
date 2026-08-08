# MES Schema Truth (制造执行服务 DDL 汇总真相源)

> **Last generated**：2026-08-08  `node scripts/verify-mes-schema-truth.mjs --regen` 自动生成，请勿手改
> **Checksum (16)**：`23cde115bd952fe0`（SHA-256 前 16，基于 table × column 有序列表）
> **Migration files scanned (16)**：20260703000001_create_mes_schema.sql · 20260705000002_create_quality_management.sql · 20260709000002_add_missing_tables.sql · 20260709000003_add_work_orders_and_teams.sql · 20260709000004_add_equipment_tables.sql · 20260709000005_add_missing_tables_and_columns.sql · 20260709000006_add_more_tables.sql · 20260709000007_add_quality_tables.sql · 20260709000008_fix_missing_columns.sql · 20260709000009_add_missing_columns.sql · 20260709000010_add_quality_columns.sql · 20260709000011_add_effective_date.sql · 20260709000012_add_result_column.sql · 20260709000013_add_findings_column.sql · 20260709000014_add_work_order_tables.sql · 20260710161000_add_tenant_id.sql

## 汇总

| 指标 | 值 |
|---|---|
| 唯一表总数 | **43** |
| 总列数 | **342** |
| 迁移文件数 | 16 |
| "碎片"小补丁数量 (<5 行 ADD COLUMN) | 5（文件 0009~0013 共 10 列 ADD COLUMN，历史遗留）|
| 潜在重复 CREATE TABLE (IF NOT EXISTS 保护) | 2（0007 重复建 4 张质量表 · 0014 重复建 work_orders/material_requirements）|

## 碎片段落说明（V68.2-6 收敛对象）

历史快速迭代留下了 5 条 1-4 行的 ADD COLUMN "补丁式" 迁移 `20260709000009~000013`，以及 2 条 `CREATE TABLE IF NOT EXISTS` 尝试与早期迁移重复建表。
由于这些迁移已经在生产 `schema_migrations.version` 锚定，**不可直接删除或重写**（会导致新库 deploy 顺序错乱，也破坏 refly/sqlx 运行时 checksum）。
本文件 + `scripts/verify-mes-schema-truth.mjs` 提供的"事实真相源 + CI 门禁"收敛策略：

- 保留原迁移不动，风险 = 0
- 在本 md 中统一呈现 43 张表的完整列清单，消除"跨 14 个文件才拼出完整 DDL"的痛点
- CI 脚本每跑一次会对比：svc/mes/migrations 的 CREATE/ALTER 并集 === 本 md 列出的 table.col.type.nullable 集合 → 漂移即失败，从机制上阻止未来再出现"第 N 条 1 行补丁迁移"

## 表清单（43 张）

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

## CI 校验

```bash
# 日常 CI：对比 migrations 并集 vs 本 md 列出的表列清单
node scripts/verify-mes-schema-truth.mjs   # 失败时说明迁移改动未同步真相源

# 修改了 mes migrations 后：重新生成本文档并一起提交
node scripts/verify-mes-schema-truth.mjs --regen
```
