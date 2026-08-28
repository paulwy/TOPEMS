-- ============================================================
-- APS→MES 数据迁移测试验证脚本
-- 用途: 在测试环境验证数据迁移流程
-- 步骤: 创建表 → 插入测试数据 → 执行迁移 → 验证结果
-- ============================================================

-- 开始事务
BEGIN;

-- ============================================================
-- 步骤 1: 创建 MES 目标表
-- ============================================================

CREATE TABLE IF NOT EXISTS production_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_no VARCHAR(64) NOT NULL,
    plan_name VARCHAR(256) NOT NULL,
    plan_type VARCHAR(32) DEFAULT 'monthly',
    start_date DATE,
    end_date DATE,
    status VARCHAR(32) DEFAULT 'draft',
    product_id UUID,
    product_name VARCHAR(256),
    target_quantity DECIMAL(14,2),
    notes TEXT,
    tenant_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, plan_no)
);

CREATE TABLE IF NOT EXISTS capacities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_center_id UUID NOT NULL,
    work_center_name VARCHAR(256),
    capacity_date DATE,
    available_hours DECIMAL(10,2),
    used_hours DECIMAL(10,2) DEFAULT 0,
    utilization_rate DECIMAL(5,2),
    status VARCHAR(32) DEFAULT 'available',
    tenant_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, work_center_id, capacity_date)
);

CREATE TABLE IF NOT EXISTS demand_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_no VARCHAR(64) NOT NULL,
    product_id UUID,
    product_name VARCHAR(256),
    forecast_period VARCHAR(32),
    forecast_date DATE,
    forecast_quantity DECIMAL(14,2),
    actual_quantity DECIMAL(14,2),
    accuracy_rate DECIMAL(5,2),
    method VARCHAR(64) DEFAULT 'moving_average',
    confidence_level DECIMAL(5,2),
    notes TEXT,
    status VARCHAR(32) DEFAULT 'draft',
    tenant_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, forecast_no)
);

-- ============================================================
-- 步骤 2: 创建 plugin_aps schema 和 APS 源表
-- ============================================================

CREATE SCHEMA IF NOT EXISTS plugin_aps;

CREATE TABLE IF NOT EXISTS plugin_aps.aps_production_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_no VARCHAR(64) NOT NULL,
    plan_name VARCHAR(128) NOT NULL,
    plan_type VARCHAR(32) DEFAULT 'monthly',
    start_date DATE,
    end_date DATE,
    status VARCHAR(32) DEFAULT 'draft',
    product_id UUID,
    product_name VARCHAR(256),
    target_quantity DECIMAL(12,2),
    notes TEXT,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plugin_aps.aps_capacities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    work_center_id UUID NOT NULL,
    work_center_name VARCHAR(128),
    capacity_date DATE,
    available_hours DECIMAL(10,2),
    used_hours DECIMAL(10,2) DEFAULT 0,
    utilization_rate DECIMAL(5,4) DEFAULT 0,
    status VARCHAR(32) DEFAULT 'available',
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plugin_aps.aps_demand_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_no VARCHAR(64) NOT NULL,
    product_id UUID,
    product_name VARCHAR(256),
    forecast_period VARCHAR(32),
    forecast_date DATE,
    forecast_quantity DECIMAL(12,2),
    actual_quantity DECIMAL(12,2) DEFAULT 0,
    accuracy_rate DECIMAL(5,4) DEFAULT 0,
    method VARCHAR(32) DEFAULT 'moving_average',
    confidence_level DECIMAL(5,4) DEFAULT 0.95,
    notes TEXT,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 步骤 3: 插入测试数据
-- ============================================================

-- 测试租户 ID
\set tenant_id '00000000-0000-0000-0000-000000000001'

-- 插入生产计划测试数据
INSERT INTO plugin_aps.aps_production_plans 
    (id, plan_no, plan_name, plan_type, start_date, end_date, status, 
     product_id, product_name, target_quantity, notes, tenant_id)
VALUES
    (gen_random_uuid(), 'PP-2026-001', '8月生产计划', 'monthly', '2026-08-01', '2026-08-31', 'draft',
     gen_random_uuid(), '产品A', 1000.00, '测试生产计划1', :'tenant_id'),
    (gen_random_uuid(), 'PP-2026-002', '9月生产计划', 'monthly', '2026-09-01', '2026-09-30', 'pending_approval',
     gen_random_uuid(), '产品B', 2000.50, '测试生产计划2', :'tenant_id'),
    (gen_random_uuid(), 'PP-2026-003', 'Q3生产计划', 'quarterly', '2026-07-01', '2026-09-30', 'approved',
     gen_random_uuid(), '产品C', 5000.00, '测试生产计划3', :'tenant_id');

-- 插入产能测试数据（注意: utilization_rate 存储 0-1）
INSERT INTO plugin_aps.aps_capacities
    (id, work_center_id, work_center_name, capacity_date, available_hours, used_hours, utilization_rate, status, tenant_id)
VALUES
    (gen_random_uuid(), gen_random_uuid(), '车间1-工作中心A', '2026-08-28', 8.00, 4.00, 0.5000, 'available', :'tenant_id'),
    (gen_random_uuid(), gen_random_uuid(), '车间1-工作中心B', '2026-08-28', 16.00, 12.00, 0.7500, 'allocated', :'tenant_id'),
    (gen_random_uuid(), gen_random_uuid(), '车间2-工作中心C', '2026-08-29', 24.00, 0.00, 0.0000, 'available', :'tenant_id');

-- 插入需求预测测试数据（注意: accuracy_rate 和 confidence_level 存储 0-1）
INSERT INTO plugin_aps.aps_demand_forecasts
    (id, forecast_no, product_id, product_name, forecast_period, forecast_date,
     forecast_quantity, actual_quantity, accuracy_rate, method, confidence_level, notes, tenant_id)
VALUES
    (gen_random_uuid(), 'DF-2026-08-001', gen_random_uuid(), '产品A', 'monthly', '2026-08-01',
     1000.00, 950.00, 0.9500, 'moving_average', 0.9500, '测试预测1', :'tenant_id'),
    (gen_random_uuid(), 'DF-2026-08-002', gen_random_uuid(), '产品B', 'monthly', '2026-08-01',
     2000.00, 1800.00, 0.9000, 'exponential_smoothing', 0.9000, '测试预测2', :'tenant_id'),
    (gen_random_uuid(), 'DF-2026-09-001', gen_random_uuid(), '产品C', 'monthly', '2026-09-01',
     1500.00, NULL, NULL, 'moving_average', 0.8500, '测试预测3（无实际数据）', :'tenant_id');

-- ============================================================
-- 步骤 4: 显示迁移前数据
-- ============================================================

\echo '=== 迁移前数据 ==='
\echo '--- APS 生产计划 ---'
SELECT plan_no, plan_name, status, target_quantity FROM plugin_aps.aps_production_plans ORDER BY plan_no;

\echo '--- APS 产能 ---'
SELECT work_center_name, capacity_date, available_hours, used_hours, utilization_rate, status 
FROM plugin_aps.aps_capacities ORDER BY capacity_date, work_center_name;

\echo '--- APS 需求预测 ---'
SELECT forecast_no, product_name, forecast_quantity, actual_quantity, accuracy_rate, confidence_level 
FROM plugin_aps.aps_demand_forecasts ORDER BY forecast_no;

-- ============================================================
-- 步骤 5: 执行数据迁移（使用实际迁移脚本的逻辑）
-- ============================================================

\echo ''
\echo '=== 执行数据迁移 ==='

-- 生产计划迁移
INSERT INTO production_plans (
    id, plan_no, plan_name, plan_type, start_date, end_date, status,
    product_id, product_name, target_quantity, notes, tenant_id,
    created_at, updated_at
)
SELECT
    id, plan_no, plan_name, COALESCE(plan_type, 'monthly'),
    start_date, end_date, COALESCE(status, 'draft'),
    product_id, product_name, target_quantity, notes, tenant_id,
    created_at::TIMESTAMP, updated_at::TIMESTAMP
FROM plugin_aps.aps_production_plans
ON CONFLICT (tenant_id, plan_no) DO NOTHING;

-- 产能迁移（utilization_rate 从 0-1 转为 0-100）
INSERT INTO capacities (
    id, work_center_id, work_center_name, capacity_date,
    available_hours, used_hours, utilization_rate, status,
    tenant_id, created_at, updated_at
)
SELECT
    id, work_center_id, work_center_name, capacity_date,
    available_hours, COALESCE(used_hours, 0),
    CASE WHEN utilization_rate IS NOT NULL THEN utilization_rate * 100 ELSE NULL END,
    COALESCE(status, 'available'),
    tenant_id, created_at::TIMESTAMP, updated_at::TIMESTAMP
FROM plugin_aps.aps_capacities
ON CONFLICT (tenant_id, work_center_id, capacity_date) DO NOTHING;

-- 需求预测迁移（accuracy_rate/confidence_level 从 0-1 转为 0-100，补充 status）
INSERT INTO demand_forecasts (
    id, forecast_no, product_id, product_name, forecast_period,
    forecast_date, forecast_quantity, actual_quantity, accuracy_rate,
    method, confidence_level, notes, status, tenant_id,
    created_at, updated_at
)
SELECT
    id, forecast_no, product_id, product_name, forecast_period,
    forecast_date, forecast_quantity, COALESCE(actual_quantity, 0),
    CASE WHEN accuracy_rate IS NOT NULL THEN accuracy_rate * 100 ELSE NULL END,
    COALESCE(method, 'moving_average'),
    CASE WHEN confidence_level IS NOT NULL THEN confidence_level * 100 ELSE NULL END,
    notes, 'draft', tenant_id,
    created_at::TIMESTAMP, updated_at::TIMESTAMP
FROM plugin_aps.aps_demand_forecasts
ON CONFLICT (tenant_id, forecast_no) DO NOTHING;

-- ============================================================
-- 步骤 6: 显示迁移后数据并验证
-- ============================================================

\echo ''
\echo '=== 迁移后数据 ==='
\echo '--- MES 生产计划 ---'
SELECT plan_no, plan_name, status, target_quantity FROM production_plans ORDER BY plan_no;

\echo '--- MES 产能（注意 utilization_rate 应为 0-100）---'
SELECT work_center_name, capacity_date, available_hours, used_hours, utilization_rate, status 
FROM capacities ORDER BY capacity_date, work_center_name;

\echo '--- MES 需求预测（注意 accuracy_rate/confidence_level 应为 0-100）---'
SELECT forecast_no, product_name, forecast_quantity, actual_quantity, accuracy_rate, confidence_level, status
FROM demand_forecasts ORDER BY forecast_no;

-- ============================================================
-- 步骤 7: 计数对比验证
-- ============================================================

\echo ''
\echo '=== 计数对比验证 ==='
SELECT
    'production_plans' AS table_name,
    (SELECT COUNT(*) FROM plugin_aps.aps_production_plans) AS source_count,
    (SELECT COUNT(*) FROM production_plans) AS target_count,
    (SELECT COUNT(*) FROM plugin_aps.aps_production_plans) -
    (SELECT COUNT(*) FROM production_plans) AS diff;

SELECT
    'capacities' AS table_name,
    (SELECT COUNT(*) FROM plugin_aps.aps_capacities) AS source_count,
    (SELECT COUNT(*) FROM capacities) AS target_count,
    (SELECT COUNT(*) FROM plugin_aps.aps_capacities) -
    (SELECT COUNT(*) FROM capacities) AS diff;

SELECT
    'demand_forecasts' AS table_name,
    (SELECT COUNT(*) FROM plugin_aps.aps_demand_forecasts) AS source_count,
    (SELECT COUNT(*) FROM demand_forecasts) AS target_count,
    (SELECT COUNT(*) FROM plugin_aps.aps_demand_forecasts) -
    (SELECT COUNT(*) FROM demand_forecasts) AS diff;

-- ============================================================
-- 步骤 8: 字段转换验证
-- ============================================================

\echo ''
\echo '=== 字段转换验证 ==='
\echo '--- 产能 utilization_rate 转换验证（0-1 → 0-100）---'
SELECT 
    a.work_center_name,
    a.utilization_rate AS aps_rate_0_to_1,
    c.utilization_rate AS mes_rate_0_to_100,
    CASE WHEN ABS((a.utilization_rate * 100) - COALESCE(c.utilization_rate, 0)) < 0.01 
         THEN 'PASS' ELSE 'FAIL' END AS verification
FROM plugin_aps.aps_capacities a
JOIN capacities c ON a.work_center_id = c.work_center_id AND a.capacity_date = c.capacity_date
ORDER BY a.capacity_date, a.work_center_name;

\echo '--- 需求预测 accuracy_rate 转换验证（0-1 → 0-100）---'
SELECT 
    d.forecast_no,
    d.accuracy_rate AS aps_rate_0_to_1,
    f.accuracy_rate AS mes_rate_0_to_100,
    CASE 
        WHEN d.accuracy_rate IS NULL AND f.accuracy_rate IS NULL THEN 'PASS (NULL)'
        WHEN ABS((d.accuracy_rate * 100) - COALESCE(f.accuracy_rate, 0)) < 0.01 THEN 'PASS'
        ELSE 'FAIL' 
    END AS verification
FROM plugin_aps.aps_demand_forecasts d
JOIN demand_forecasts f ON d.forecast_no = f.forecast_no
ORDER BY d.forecast_no;

\echo '--- 需求预测 status 字段补充验证（默认 draft）---'
SELECT forecast_no, status FROM demand_forecasts ORDER BY forecast_no;

-- 回滚（测试环境，验证后回滚）
ROLLBACK;

\echo ''
\echo '=== 测试验证完成，已回滚 ==='
