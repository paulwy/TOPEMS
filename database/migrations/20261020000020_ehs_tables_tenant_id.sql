-- 2026-10-18: ehs 环境合规/监控/预案表补 tenant_id（代码查询引用 tenant_id::text 过滤，
-- 但迁移建表缺该列，致 GET/DELETE/POST/PUT 系列端点 body 500）
ALTER TABLE ehs.qa_ehs_environment_incidents ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE ehs.qa_ehs_emergency_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE ehs.qa_ehs_env_monitor_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE ehs.monitoring_points ADD COLUMN IF NOT EXISTS tenant_id UUID;
-- qa_ehs_environment_monitors 迁移缺失（代码 create_monitor_point/get_monitor_point 引用），补建
CREATE TABLE IF NOT EXISTS ehs.qa_ehs_environment_monitors (
    id UUID PRIMARY KEY,
    monitor_no VARCHAR(100),
    name VARCHAR(200) NOT NULL,
    monitor_type VARCHAR(50),
    location VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active',
    description TEXT,
    monitor_frequency VARCHAR(100),
    standard_value TEXT,
    warning_threshold TEXT,
    alarm_threshold TEXT,
    unit VARCHAR(50),
    tenant_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
-- health_records SELECT/from_row 引用 check_type/check_date/result/remarks（迁移建表缺列），补列
ALTER TABLE ehs.health_records ADD COLUMN IF NOT EXISTS check_type VARCHAR(50);
ALTER TABLE ehs.health_records ADD COLUMN IF NOT EXISTS check_date DATE;
ALTER TABLE ehs.health_records ADD COLUMN IF NOT EXISTS result VARCHAR(50);
ALTER TABLE ehs.health_records ADD COLUMN IF NOT EXISTS remarks TEXT;
-- qa_ehs_environment_monitors 的 get_record/update_record SELECT 引用 created_by，补列
ALTER TABLE ehs.qa_ehs_environment_monitors ADD COLUMN IF NOT EXISTS created_by UUID;
