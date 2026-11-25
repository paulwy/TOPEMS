-- 20261121200000: analytics 3 张运行期表收口（W2-D2 第二十五个模块）
--
-- 背景：svc/analytics/src/models/schema_defense.rs 的 TABLE_DEFS 声明 4 张表，schema 为 bi，
-- 启动时由 schema_defense 建表/补列。其中 bi.audit_logs 为 batch2 死表候选（0 行、全仓无读写，
-- 当年仅因 schema-defense 会重建而移出删除批），本迁移不纳入，由配套清理迁移删除；
-- 其余 reports/report_schedules/report_templates 以 live 真实形状固化。
-- live bi 另有 analytics_*/report_subscriptions 等由既有迁移维护，不在 TABLE_DEFS 内，不纳入。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS bi.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    name character varying NOT NULL,
    description text,
    report_type character varying NOT NULL,
    status text DEFAULT 'active'::text,
    template_id uuid,
    data_source_id uuid,
    config jsonb NOT NULL,
    layout jsonb,
    schedule_config jsonb,
    created_by text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_generated_at timestamp with time zone,
    is_active boolean DEFAULT true,
    tenant_id uuid,
    last_run_at timestamp with time zone,
    output_format character varying(32) DEFAULT 'pdf'::character varying
);

CREATE TABLE IF NOT EXISTS bi.report_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    report_id uuid,
    schedule_type character varying NOT NULL,
    cron_expression text,
    interval_minutes integer,
    next_run_at timestamp with time zone,
    last_run_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tenant_id uuid,
    name character varying DEFAULT ''::character varying NOT NULL,
    schedule_expression character varying DEFAULT ''::character varying NOT NULL,
    status character varying DEFAULT 'active'::character varying,
    template_id uuid,
    parameters jsonb,
    recipients jsonb,
    error_message text,
    run_count integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bi.report_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    template_type character varying(32) DEFAULT 'custom'::character varying NOT NULL,
    template_content jsonb DEFAULT '{}'::jsonb NOT NULL,
    default_config jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_active boolean DEFAULT true,
    tenant_id uuid,
    deleted_at timestamp with time zone,
    code character varying,
    output_format text,
    category character varying(64),
    columns jsonb,
    data_source jsonb,
    filter_config jsonb,
    layout_config jsonb,
    report_type character varying(128) DEFAULT 'general'::character varying NOT NULL,
    style_config jsonb
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_template ON bi.report_schedules USING btree (template_id);
CREATE INDEX IF NOT EXISTS idx_report_templates_code ON bi.report_templates USING btree (code);
CREATE INDEX IF NOT EXISTS idx_bi_reports_tenant_status ON bi.reports USING btree (tenant_id, status, created_at DESC);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='bi.report_schedules'::regclass AND conname='report_schedules_pkey') THEN
        ALTER TABLE bi.report_schedules ADD CONSTRAINT "report_schedules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='bi.report_templates'::regclass AND conname='report_templates_pkey') THEN
        ALTER TABLE bi.report_templates ADD CONSTRAINT "report_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='bi.reports'::regclass AND conname='reports_pkey') THEN
        ALTER TABLE bi.reports ADD CONSTRAINT "reports_pkey" PRIMARY KEY (id);
    END IF;
END $$;


ALTER TABLE bi.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi.reports FORCE ROW LEVEL SECURITY;
ALTER TABLE bi.report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi.report_schedules FORCE ROW LEVEL SECURITY;
ALTER TABLE bi.report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE bi.report_templates FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON bi.report_schedules;
CREATE POLICY "rls_tenant_isolation" ON bi.report_schedules AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON bi.report_templates;
CREATE POLICY "rls_tenant_isolation" ON bi.report_templates AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON bi.reports;
CREATE POLICY "rls_tenant_isolation" ON bi.reports AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
