-- 2026-10-18 S1 ehs environment 域接真：监测点表
-- 背景：environment.rs 5 handler 此前为内存桩，且"契约-表概念错位"——前端 EnvironmentPage
--       消费的是 /environment/monitors 监测点 CRUD（EnvironmentMonitor 契约），后端却把
--       monitors/records 都映射到一个 EnvironmentRecord 桩。本迁移落地监测点表，字段对齐
--       前端契约（apps/web/src/api/ehs/types/environment.ts:4-20），风格对齐 qa_ehs_risks
--       （tenant_id + RLS FORCE + nil 豁免 + 软删 deleted_at）。幂等可重复执行。
CREATE TABLE IF NOT EXISTS ehs.qa_ehs_environment_monitors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    monitor_no varchar(64) UNIQUE,
    name varchar(256) NOT NULL DEFAULT '未命名监测点',
    monitor_type varchar(64) NOT NULL DEFAULT '废气',
    location varchar(256),
    status varchar(32) NOT NULL DEFAULT 'active',
    description text,
    monitor_frequency varchar(64),
    standard_value varchar(128),
    warning_threshold numeric(18,4),
    alarm_threshold numeric(18,4),
    unit varchar(64),
    created_by varchar(128),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

ALTER TABLE ehs.qa_ehs_environment_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_environment_monitors FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qa_ehs_environment_monitors_tenant_policy ON ehs.qa_ehs_environment_monitors;
CREATE POLICY qa_ehs_environment_monitors_tenant_policy ON ehs.qa_ehs_environment_monitors
USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
)
WITH CHECK (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
);
