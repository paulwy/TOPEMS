-- 2026-10-14 S1 ehs 事故（incident）域接真表
-- 背景：accident.rs 13 条前端契约（apps/web/src/api/ehs/accident.ts:28-98）此前全部返回内存硬编码桩，
--       即"前端真实在调、后端假数据"的契约撒谎面。本迁移落地事故主表 + 调查/处理/复盘/行动子表，
--       风格完全对齐 ehs.qa_ehs_risks / qa_ehs_risk_controls（tenant_id + RLS FORCE + nil 豁免 + 软删 deleted_at）。
-- 幂等：IF NOT EXISTS / DROP POLICY IF EXISTS 保护，可重复执行。

CREATE TABLE IF NOT EXISTS ehs.qa_ehs_accidents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    accident_no varchar(64) UNIQUE,
    title varchar(256) NOT NULL DEFAULT '未命名事故',
    description text,
    accident_type varchar(64),
    severity varchar(32) NOT NULL DEFAULT '一般',
    location varchar(256),
    occurred_at timestamptz,
    casualties integer DEFAULT 0,
    economic_loss numeric(18,2) DEFAULT 0,
    status varchar(32) NOT NULL DEFAULT 'reported',
    reported_by varchar(128),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE TABLE IF NOT EXISTS ehs.qa_ehs_investigations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    accident_id uuid NOT NULL,
    team jsonb,
    findings text,
    root_cause text,
    timeline jsonb,
    status varchar(32) NOT NULL DEFAULT 'in_progress',
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE TABLE IF NOT EXISTS ehs.qa_ehs_treatments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    accident_id uuid NOT NULL,
    responsible varchar(128),
    status varchar(32) NOT NULL DEFAULT 'in_progress',
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE TABLE IF NOT EXISTS ehs.qa_ehs_treatment_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    treatment_id uuid NOT NULL,
    description text NOT NULL,
    responsible varchar(128),
    deadline timestamptz,
    status varchar(32) NOT NULL DEFAULT 'pending',
    completed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE TABLE IF NOT EXISTS ehs.qa_ehs_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    accident_id uuid NOT NULL,
    summary text,
    lessons_learned jsonb,
    recommendations jsonb,
    reviewer varchar(128),
    reviewed_at timestamptz,
    created_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

CREATE TABLE IF NOT EXISTS ehs.qa_ehs_incident_actions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    accident_id uuid NOT NULL,
    title varchar(256),
    status varchar(32) NOT NULL DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid
);

-- RLS：6 表统一开启 + FORCE + tenant 策略（nil/空豁免，对齐 risk_controls）
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'qa_ehs_accidents','qa_ehs_investigations','qa_ehs_treatments',
        'qa_ehs_treatment_actions','qa_ehs_reviews','qa_ehs_incident_actions'
    ]
    LOOP
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
    END LOOP;
END $$;
