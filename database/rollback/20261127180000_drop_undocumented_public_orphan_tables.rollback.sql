-- 回滚 20261127180000：按 pg_dump 原样重建四张 public 孤儿表（结构 + 索引 + RLS + 策略 + 授权）
-- 说明：本轮删除的均为 0 行表，回滚只恢复结构骨架，不恢复数据（无数据可恢复）。
-- 授权对象按库内实际角色 topems_app 重建；生产侧若无该角色，GRANT 会失败——故用条件授权。

BEGIN;

CREATE TABLE IF NOT EXISTS public.core_feedbacks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    screenshots text[],
    satisfaction integer DEFAULT 3,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    response text,
    responded_by character varying(255),
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid
);
ALTER TABLE ONLY public.core_feedbacks ADD CONSTRAINT core_feedbacks_pkey PRIMARY KEY (id);
CREATE INDEX IF NOT EXISTS idx_core_feedbacks_status ON public.core_feedbacks USING btree (status);
CREATE INDEX IF NOT EXISTS idx_core_feedbacks_user_id ON public.core_feedbacks USING btree (user_id);
ALTER TABLE public.core_feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_feedbacks FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.hrm_master_data_refs (
    master_data_id character varying(128) NOT NULL,
    tenant_id uuid NOT NULL,
    domain character varying(32) NOT NULL,
    code character varying(128) NOT NULL,
    name character varying(256),
    status character varying(32) DEFAULT 'active'::character varying,
    source_service character varying(64) NOT NULL,
    local_entity_type character varying(64),
    local_entity_id uuid,
    payload_snapshot jsonb,
    last_synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ck_hrm_master_data_refs_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[]))))
);
ALTER TABLE ONLY public.hrm_master_data_refs ADD CONSTRAINT hrm_master_data_refs_pkey PRIMARY KEY (master_data_id);
ALTER TABLE public.hrm_master_data_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hrm_master_data_refs FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.wms_master_data_refs (
    master_data_id character varying(128) NOT NULL,
    tenant_id uuid NOT NULL,
    domain character varying(32) NOT NULL,
    code character varying(128) NOT NULL,
    name character varying(256),
    status character varying(32) DEFAULT 'active'::character varying,
    source_service character varying(64) NOT NULL,
    local_entity_type character varying(64),
    local_entity_id uuid,
    payload_snapshot jsonb,
    last_synced_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ck_wms_master_data_refs_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[]))))
);
ALTER TABLE ONLY public.wms_master_data_refs ADD CONSTRAINT wms_master_data_refs_pkey PRIMARY KEY (master_data_id);
ALTER TABLE public.wms_master_data_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wms_master_data_refs FORCE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.qa_lab_samples_merge_backup_20260919 (
    id uuid,
    tenant_id uuid,
    sample_no character varying(64),
    sample_name character varying(256),
    sample_type character varying(64),
    source character varying(64),
    quantity numeric(12,2),
    unit character varying(32),
    status character varying(32),
    received_at timestamp with time zone,
    expired_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT ck_qa_lab_samples_merge_backup_20260919_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[]))))
);

-- RLS 策略（与库内原定义一致：租户上下文为空/零租户时放行，否则按 app.tenant_id 隔离）
CREATE POLICY rls_tenant_isolation ON public.core_feedbacks
  USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
  WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

CREATE POLICY rls_tenant_isolation ON public.hrm_master_data_refs
  USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
  WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

CREATE POLICY rls_tenant_isolation ON public.wms_master_data_refs
  USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
  WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

DO $rb$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
    GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE public.core_feedbacks TO topems_app;
    GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE public.hrm_master_data_refs TO topems_app;
    GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE public.wms_master_data_refs TO topems_app;
    GRANT SELECT, INSERT, DELETE, UPDATE ON TABLE public.qa_lab_samples_merge_backup_20260919 TO topems_app;
  END IF;
END
$rb$;

COMMIT;
