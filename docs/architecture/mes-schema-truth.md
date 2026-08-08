# MES Schema Truth Source

> **Version**: 1.0 · **Date**: 2026-08-08
> **Checkpoint migration**: `svc/mes/migrations/20260809000000_mes_schema_consolidation.sql`（conceptually absorbs 13 micro-migrations from 2026-07-09）
> **Runtime DDL truth**: `svc/mes/src/main.rs → init_database()` + `svc/mes/migrations/*.sql`（二者必须同步，见下方 §3）

## 1. Why this document exists

During 2026-07-09 the MES service was actively prototyped, producing **13 micro-migrations on a single day** (000002 through 000014).  These 13 files contain interleaved CREATE TABLE + ALTER TABLE ADD COLUMN stanzas that reflect the chaotic iteration of that day and are hard to review as a whole.  Going forward, this document is the **single entry point for answering**:

1. Which tables does MES own, and which migration first introduced each?
2. Which tables live in schema `plugin_mes` vs the legacy `mes` alias?
3. What columns must every new table have (`id`, `tenant_id`, `deleted_at`, `created_at`, `updated_at` — see §4)

## 2. Table inventory (ground truth)

Ordered by the migration that first introduced each table.  All tables live in schema **`plugin_mes`** (the runtime `search_path`).  The legacy bare `mes` schema is not created; queries access tables without a schema prefix and are resolved via `SET search_path = 'plugin_mes'`.

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

## 3. 13 碎片迁移的列变更明细

这些补丁 000008~000013 都很短（72B ~ 1964B），若未来需要重建数据库，直接在 `CREATE TABLE` 中包含下列列即可，不需要模拟多次 ALTER。

| ID | Migration | Column addition | Absorb into CREATE TABLE of: |
|----|-----------|-----------------|------------------------------|
| 000008 | `fix_missing_columns` | inventory_checks.{status,remark,location}; stocktake_tasks.{status,remark,location} | 两张表的 DDL 内联 |
| 000009 | `add_missing_columns` | quality_inspections.sampling_plan TEXT | quality_inspections |
| 000010 | `add_quality_columns` | quality_standards.control_plan_ref VARCHAR(256) | quality_standards |
| 000011 | `add_effective_date` | quality_standards.effective_date DATE | quality_standards |
| 000012 | `add_result_column` | quality_inspections.result VARCHAR(50) | quality_inspections |
| 000013 | `add_findings_column` | quality_patrol_items.findings TEXT | quality_patrol_items |

## 4. 新表规则（V68.1-5 / V68.1-3 之后）

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

## 5. Integrity checks (linked to CI)

- `node scripts/check-migration-names.mjs` — 每个 MES 迁移 14 位时间戳严格单调递增 ✅（NOOP checkpoint 是 2026-08-09，比所有碎片晚）
- `node scripts/v68-1-3/scan_soft_delete_gaps.mjs` — 所有 entity tables 有 deleted_at 且 DELETE → UPDATE ✅
- `node scripts/check-entityschema-maxlength.mjs` — 前端 EntitySchema String 列覆盖率 ≥35% ✅（V68.1-2 已修复）
