-- ============================================================
-- APS → MES 数据迁移脚本
-- 版本: 1.0
-- 日期: 2026-08-28
-- 说明: 将 plugin_aps schema 的数据迁移到 MES 的新表
--
-- 迁移的表:
--   1. plugin_aps.aps_production_plans → production_plans
--   2. plugin_aps.aps_capacities        → capacities
--   3. plugin_aps.aps_demand_forecasts  → demand_forecasts
--
-- 不迁移的表（MES 已有对应模块）:
--   - plugin_aps.aps_schedules      → MES production_scheduling
--   - plugin_aps.aps_material_plans → MES material_requirement
--
-- 注意事项:
--   1. 执行前请备份数据库
--   2. utilization_rate / accuracy_rate / confidence_level 从 0-1 转为 0-100
--   3. demand_forecasts 表补充 status 字段，默认 'draft'
--   4. TIMESTAMPTZ 转为 TIMESTAMP
-- ============================================================

-- 开始事务
BEGIN;

-- ============================================================
-- 1. 生产计划表迁移
-- ============================================================

-- 清理目标表（可选，根据需要取消注释）
-- TRUNCATE TABLE production_plans RESTART IDENTITY CASCADE;

INSERT INTO production_plans (
    id, plan_no, plan_name, plan_type, start_date, end_date, status,
    product_id, product_name, target_quantity, notes, tenant_id,
    created_at, updated_at
)
SELECT
    id,
    plan_no,
    plan_name,
    COALESCE(plan_type, 'monthly'),
    start_date,
    end_date,
    COALESCE(status, 'draft'),
    product_id,
    product_name,
    target_quantity,
    notes,
    tenant_id,
    created_at::TIMESTAMP,
    updated_at::TIMESTAMP
FROM plugin_aps.aps_production_plans
ON CONFLICT (tenant_id, plan_no) DO NOTHING;

-- ============================================================
-- 2. 产能表迁移
-- ============================================================

-- 清理目标表（可选）
-- TRUNCATE TABLE capacities RESTART IDENTITY CASCADE;

INSERT INTO capacities (
    id, work_center_id, work_center_name, capacity_date,
    available_hours, used_hours, utilization_rate, status,
    tenant_id, created_at, updated_at
)
SELECT
    id,
    work_center_id,
    work_center_name,
    capacity_date,
    available_hours,
    COALESCE(used_hours, 0),
    -- APS 存储 0-1，MES 存储 0-100
    CASE
        WHEN utilization_rate IS NOT NULL THEN utilization_rate * 100
        ELSE NULL
    END,
    COALESCE(status, 'available'),
    tenant_id,
    created_at::TIMESTAMP,
    updated_at::TIMESTAMP
FROM plugin_aps.aps_capacities
ON CONFLICT (tenant_id, work_center_id, capacity_date) DO NOTHING;

-- ============================================================
-- 3. 需求预测表迁移
-- ============================================================

-- 清理目标表（可选）
-- TRUNCATE TABLE demand_forecasts RESTART IDENTITY CASCADE;

INSERT INTO demand_forecasts (
    id, forecast_no, product_id, product_name, forecast_period,
    forecast_date, forecast_quantity, actual_quantity, accuracy_rate,
    method, confidence_level, notes, status, tenant_id,
    created_at, updated_at
)
SELECT
    id,
    forecast_no,
    product_id,
    product_name,
    forecast_period,
    forecast_date,
    forecast_quantity,
    COALESCE(actual_quantity, 0),
    -- APS 存储 0-1，MES 存储 0-100
    CASE
        WHEN accuracy_rate IS NOT NULL THEN accuracy_rate * 100
        ELSE NULL
    END,
    COALESCE(method, 'moving_average'),
    -- APS 存储 0-1，MES 存储 0-100
    CASE
        WHEN confidence_level IS NOT NULL THEN confidence_level * 100
        ELSE NULL
    END,
    notes,
    -- APS 表没有 status 字段，默认 'draft'
    'draft',
    tenant_id,
    created_at::TIMESTAMP,
    updated_at::TIMESTAMP
FROM plugin_aps.aps_demand_forecasts
ON CONFLICT (tenant_id, forecast_no) DO NOTHING;

-- ============================================================
-- 4. 数据验证
-- ============================================================

-- 生产计划计数对比
SELECT
    'production_plans' AS table_name,
    (SELECT COUNT(*) FROM plugin_aps.aps_production_plans) AS source_count,
    (SELECT COUNT(*) FROM production_plans) AS target_count,
    (SELECT COUNT(*) FROM plugin_aps.aps_production_plans) -
    (SELECT COUNT(*) FROM production_plans) AS diff;

-- 产能计数对比
SELECT
    'capacities' AS table_name,
    (SELECT COUNT(*) FROM plugin_aps.aps_capacities) AS source_count,
    (SELECT COUNT(*) FROM capacities) AS target_count,
    (SELECT COUNT(*) FROM plugin_aps.aps_capacities) -
    (SELECT COUNT(*) FROM capacities) AS diff;

-- 需求预测计数对比
SELECT
    'demand_forecasts' AS table_name,
    (SELECT COUNT(*) FROM plugin_aps.aps_demand_forecasts) AS source_count,
    (SELECT COUNT(*) FROM demand_forecasts) AS target_count,
    (SELECT COUNT(*) FROM plugin_aps.aps_demand_forecasts) -
    (SELECT COUNT(*) FROM demand_forecasts) AS diff;

-- 提交事务（默认提交；如需人工核对后再落库，可临时改为 ROLLBACK，先跑 --dry-run 看计数）
COMMIT;
-- ROLLBACK;

-- ============================================================
-- 5. 迁移后清理（可选，确认数据正确后执行）
-- ============================================================

-- 备份旧 schema（可选）
-- CREATE SCHEMA IF NOT EXISTS plugin_aps_backup;
-- ALTER TABLE plugin_aps.aps_production_plans SET SCHEMA plugin_aps_backup;
-- ALTER TABLE plugin_aps.aps_capacities SET SCHEMA plugin_aps_backup;
-- ALTER TABLE plugin_aps.aps_demand_forecasts SET SCHEMA plugin_aps_backup;
-- ALTER TABLE plugin_aps.aps_schedules SET SCHEMA plugin_aps_backup;
-- ALTER TABLE plugin_aps.aps_material_plans SET SCHEMA plugin_aps_backup;

-- 或者直接删除旧表（危险，确认后执行）
-- DROP TABLE IF EXISTS plugin_aps.aps_production_plans;
-- DROP TABLE IF EXISTS plugin_aps.aps_capacities;
-- DROP TABLE IF EXISTS plugin_aps.aps_demand_forecasts;
-- DROP TABLE IF EXISTS plugin_aps.aps_schedules;
-- DROP TABLE IF EXISTS plugin_aps.aps_material_plans;
-- DROP SCHEMA IF EXISTS plugin_aps;
