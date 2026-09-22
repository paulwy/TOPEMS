-- 2026-09-22 risk 模块数据接通：新增 ehs.qa_ehs_risk_controls（控制措施表）
-- 背景：risk 模块 4 个 control measure 端点此前为桩实现（无对应表）；本迁移落地真实表，
--       风格完全对齐 ehs.qa_ehs_risks（tenant_id + RLS FORCE + nil 豁免 + 软删 deleted_at）。
-- 幂等：可重复执行（IF NOT EXISTS / DROP POLICY IF EXISTS 保护）。
CREATE TABLE IF NOT EXISTS ehs.qa_ehs_risk_controls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    risk_id uuid NOT NULL,
    measure_no varchar(64) UNIQUE,
    title varchar(256) NOT NULL DEFAULT '未命名措施',
    description text,
    measure_type varchar(64),
    status varchar(32) DEFAULT 'active',
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now(),
    deleted_at timestamptz,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

ALTER TABLE ehs.qa_ehs_risk_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE ehs.qa_ehs_risk_controls FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qa_ehs_risk_controls_tenant_policy ON ehs.qa_ehs_risk_controls;
CREATE POLICY qa_ehs_risk_controls_tenant_policy ON ehs.qa_ehs_risk_controls
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
