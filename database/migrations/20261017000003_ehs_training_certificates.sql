-- 2026-10-17 ehs training 域批2：培训证书（certificates）域接真表
-- 背景：svc/ehs/src/modules/training.rs certificates 5 handler（前端 trainingApi.certificates 组，
--       apps/web/src/api/ehs/types/training.ts:46-61 TrainingCertificate 14 字段）此前返回内存硬编码桩，
--       即"前端真实在调、后端假数据"的契约撒谎面。本迁移新建证书主表，
--       风格完全对齐 ehs.qa_ehs_accidents（tenant_id + RLS FORCE + nil 豁免 + 软删 deleted_at）。
-- 幂等：IF NOT EXISTS / DROP POLICY IF EXISTS 保护，可重复执行。

CREATE TABLE IF NOT EXISTS ehs.qa_ehs_training_certificates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_no varchar(64) UNIQUE,
    employee_id varchar(128),
    employee_name varchar(128) NOT NULL DEFAULT '未命名',
    training_type varchar(64),
    certificate_type varchar(64),
    issue_date timestamptz,
    expiry_date timestamptz,
    issuing_authority varchar(256),
    status varchar(32) NOT NULL DEFAULT 'valid',
    record_id uuid,
    attachments jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

DO $$
DECLARE
    t text := 'qa_ehs_training_certificates';
BEGIN
    EXECUTE format('ALTER TABLE ehs.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE ehs.%I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON ehs.%I', t || '_tenant_policy', t);
    EXECUTE format($f$
        CREATE POLICY %I ON ehs.%I
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
        )
    $f$, t || '_tenant_policy', t);
END $$;
