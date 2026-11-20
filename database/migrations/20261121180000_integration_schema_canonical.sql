-- 20261121180000: integration 8 张运行期表收口（W2-D2 第二十三个模块）
--
-- 背景：svc/integration/src/schema_defense.rs 的 TABLE_DEFS 声明 8 张表（转换规则/执行/
-- 集成事件/跨模块同步表），启动时由 schema_defense 建表/补列。live integration 另有
-- erp_*/crm_*/hrm_*/core_* 等由既有迁移维护，不在 TABLE_DEFS 内，不纳入、不改动。
-- 迁移内容：8 表 / 131 列 / 79 约束 / 22 索引 / 7 策略 / 8 RLS；五项 diff 为 0。
-- 以 baseline+forward 库真实形状固化；删除运行期 DDL 后由迁移链唯一维护。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

CREATE SCHEMA IF NOT EXISTS integration;

CREATE TABLE IF NOT EXISTS integration.conversion_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    rule_id uuid NOT NULL,
    rule_code character varying(64) NOT NULL,
    source_record_id character varying(128) NOT NULL,
    target_record_id character varying(128),
    source_data jsonb,
    target_data jsonb,
    status character varying(32) DEFAULT 'pending'::character varying NOT NULL,
    retry_count integer DEFAULT 0 NOT NULL,
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS integration.conversion_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    code character varying(64) NOT NULL,
    name character varying(128) NOT NULL,
    description text,
    source_system character varying(32) NOT NULL,
    source_entity character varying(64) NOT NULL,
    target_system character varying(32) NOT NULL,
    target_entity character varying(64) NOT NULL,
    trigger_type character varying(32) DEFAULT 'event'::character varying NOT NULL,
    trigger_condition jsonb,
    field_mappings jsonb NOT NULL,
    transform_script text,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    max_retries integer DEFAULT 3 NOT NULL,
    retry_interval_secs integer DEFAULT 60 NOT NULL,
    stop_on_failure boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS integration.integration_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    error_message text,
    event_type character varying(100) NOT NULL,
    payload jsonb,
    source_record_id uuid,
    source_system character varying(50) NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    synced_at timestamp with time zone,
    target_record_id uuid,
    target_system character varying(50) NOT NULL,
    tenant_id uuid
);

CREATE TABLE IF NOT EXISTS integration.lims_qms_sync (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    inspection_notes text,
    inspection_result text,
    last_synced_at timestamp with time zone,
    lims_sample_id uuid NOT NULL,
    qms_inspection_id uuid,
    sample_name character varying(255) NOT NULL,
    sync_error text,
    sync_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    synced boolean DEFAULT false NOT NULL,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS integration.mes_erp_sync (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    erp_order_id uuid,
    last_synced_at timestamp with time zone,
    max_retries integer DEFAULT 5,
    mes_order_id uuid NOT NULL,
    order_number character varying(255) NOT NULL,
    payload jsonb,
    product_name character varying(255),
    quantity numeric(15,2),
    retry_count integer DEFAULT 0,
    sync_direction character varying(50) DEFAULT 'erp_to_mes'::character varying,
    sync_error text,
    sync_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    sync_type character varying(50) DEFAULT 'create'::character varying,
    synced boolean DEFAULT false NOT NULL,
    tenant_id uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS integration.mes_erp_sync_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sync_record_id uuid NOT NULL,
    sync_direction character varying(50) NOT NULL,
    sync_type character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    error_message text,
    attempt integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS integration.mes_qms_sync (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sync_type character varying(50) NOT NULL,
    direction character varying(30) NOT NULL,
    mes_record_id uuid,
    mes_record_type character varying(50),
    qms_inspection_id uuid,
    order_id uuid,
    order_no character varying(64),
    product_id uuid,
    product_name character varying(256),
    product_code character varying(64),
    batch_no character varying(64),
    quantity numeric(12,2),
    synced boolean DEFAULT false NOT NULL,
    sync_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    sync_error text,
    retry_count integer DEFAULT 0 NOT NULL,
    max_retries integer DEFAULT 5 NOT NULL,
    payload jsonb,
    result_payload jsonb,
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS integration.wms_scm_sync (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    item_name character varying(255) NOT NULL,
    last_synced_at timestamp with time zone,
    quantity numeric(15,2),
    scm_supply_id uuid,
    sync_error text,
    sync_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    synced boolean DEFAULT false NOT NULL,
    tenant_id uuid,
    unit character varying(50),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    wms_inventory_id uuid NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversion_executions_rule ON integration.conversion_executions USING btree (rule_id);
CREATE INDEX IF NOT EXISTS idx_conversion_executions_status ON integration.conversion_executions USING btree (status);
CREATE INDEX IF NOT EXISTS idx_conversion_executions_tenant ON integration.conversion_executions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversion_rules_code ON integration.conversion_rules USING btree (code);
CREATE INDEX IF NOT EXISTS idx_conversion_rules_source ON integration.conversion_rules USING btree (source_system, source_entity);
CREATE INDEX IF NOT EXISTS idx_conversion_rules_tenant ON integration.conversion_rules USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_created ON integration.mes_qms_sync USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_direction ON integration.mes_qms_sync USING btree (direction);
CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_mes_record ON integration.mes_qms_sync USING btree (mes_record_id);
CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_order ON integration.mes_qms_sync USING btree (order_id);
CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_qms_inspection ON integration.mes_qms_sync USING btree (qms_inspection_id);
CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_status ON integration.mes_qms_sync USING btree (sync_status);
CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_tenant ON integration.mes_qms_sync USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_mes_qms_sync_type ON integration.mes_qms_sync USING btree (sync_type);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='integration.conversion_executions'::regclass AND conname='conversion_executions_pkey') THEN
        ALTER TABLE integration.conversion_executions ADD CONSTRAINT "conversion_executions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='integration.conversion_rules'::regclass AND conname='conversion_rules_pkey') THEN
        ALTER TABLE integration.conversion_rules ADD CONSTRAINT "conversion_rules_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='integration.integration_events'::regclass AND conname='integration_events_pkey') THEN
        ALTER TABLE integration.integration_events ADD CONSTRAINT "integration_events_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='integration.lims_qms_sync'::regclass AND conname='lims_qms_sync_pkey') THEN
        ALTER TABLE integration.lims_qms_sync ADD CONSTRAINT "lims_qms_sync_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='integration.mes_erp_sync'::regclass AND conname='mes_erp_sync_pkey') THEN
        ALTER TABLE integration.mes_erp_sync ADD CONSTRAINT "mes_erp_sync_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='integration.mes_erp_sync_logs'::regclass AND conname='mes_erp_sync_logs_pkey') THEN
        ALTER TABLE integration.mes_erp_sync_logs ADD CONSTRAINT "mes_erp_sync_logs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='integration.mes_qms_sync'::regclass AND conname='mes_qms_sync_pkey') THEN
        ALTER TABLE integration.mes_qms_sync ADD CONSTRAINT "mes_qms_sync_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='integration.wms_scm_sync'::regclass AND conname='wms_scm_sync_pkey') THEN
        ALTER TABLE integration.wms_scm_sync ADD CONSTRAINT "wms_scm_sync_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='integration.mes_erp_sync_logs'::regclass AND conname='ck_mes_erp_sync_logs_status_standard') THEN
        ALTER TABLE integration.mes_erp_sync_logs ADD CONSTRAINT "ck_mes_erp_sync_logs_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY ('{active,inactive,archived,pending,success,failed}'::text[]))));
    END IF;
END $$;


ALTER TABLE integration.conversion_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.conversion_executions FORCE ROW LEVEL SECURITY;
ALTER TABLE integration.conversion_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.conversion_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE integration.integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.integration_events FORCE ROW LEVEL SECURITY;
ALTER TABLE integration.lims_qms_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.lims_qms_sync FORCE ROW LEVEL SECURITY;
ALTER TABLE integration.mes_erp_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.mes_erp_sync FORCE ROW LEVEL SECURITY;
ALTER TABLE integration.mes_qms_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.mes_qms_sync FORCE ROW LEVEL SECURITY;
ALTER TABLE integration.wms_scm_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.wms_scm_sync FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON integration.conversion_executions;
CREATE POLICY "rls_tenant_isolation" ON integration.conversion_executions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON integration.conversion_rules;
CREATE POLICY "rls_tenant_isolation" ON integration.conversion_rules AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON integration.integration_events;
CREATE POLICY "rls_tenant_isolation" ON integration.integration_events AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON integration.lims_qms_sync;
CREATE POLICY "rls_tenant_isolation" ON integration.lims_qms_sync AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON integration.mes_erp_sync;
CREATE POLICY "rls_tenant_isolation" ON integration.mes_erp_sync AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON integration.mes_qms_sync;
CREATE POLICY "rls_tenant_isolation" ON integration.mes_qms_sync AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON integration.wms_scm_sync;
CREATE POLICY "rls_tenant_isolation" ON integration.wms_scm_sync AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
