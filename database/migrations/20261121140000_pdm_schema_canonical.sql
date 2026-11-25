-- 20261121140000: pdm 19 张运行期表收口（W2-D2 第十九个模块）
--
-- 背景：svc/pdm/src/models/schema_defense.rs 的 TABLE_DEFS 声明 18 张表，
-- 启动时由 run_schema_defense 逐列补列/自检；pdm_master_data_refs 由
-- main 的 default_init_db(with_master_data_refs=true) 创建，event_handlers 活跃写入，
-- 也属运行期表，一并固化。live pdm 另有 module_settings / pdm_drawings 由既有迁移维护，
-- 不在 TABLE_DEFS 内，本迁移不纳入、不改动。
-- 迁移内容：19 表 / 255 列 / 148 约束 / 75 索引 / 19 策略 / 19 RLS；五项 diff 为 0。
-- 以 baseline+forward 库真实形状固化；删除运行期 DDL 后由迁移链唯一维护。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS pdm.pdm_bom_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    bom_id uuid NOT NULL,
    material_id uuid,
    material_code character varying(64) NOT NULL,
    material_name character varying(256) NOT NULL,
    specification character varying(256),
    unit character varying(32),
    quantity numeric(18,4) DEFAULT 0 NOT NULL,
    loss_rate numeric(8,4) DEFAULT 0,
    sequence integer DEFAULT 0,
    notes text,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS pdm.pdm_boms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    bom_no character varying(64) NOT NULL,
    product_id uuid,
    product_name character varying(256) NOT NULL,
    product_code character varying(64),
    version character varying(32) DEFAULT '1.0'::character varying,
    status character varying(32) DEFAULT 'draft'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS pdm.pdm_change_notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    ecn_no character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    description text,
    change_type character varying(32) NOT NULL,
    affected_items jsonb,
    reason text,
    priority character varying(32) DEFAULT 'normal'::character varying,
    status character varying(32) DEFAULT 'draft'::character varying,
    initiator character varying(128) NOT NULL,
    approver character varying(128),
    approved_at timestamp with time zone,
    effective_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS pdm.pdm_configurations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    config_no character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    description text,
    product_id uuid,
    config_items jsonb DEFAULT '[]'::jsonb,
    status character varying(32) DEFAULT 'active'::character varying,
    created_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS pdm.pdm_document_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    document_id uuid NOT NULL,
    document_type character varying(64),
    version_number character varying(64) NOT NULL,
    title character varying(256) NOT NULL,
    description text,
    status character varying(32) DEFAULT 'draft'::character varying,
    file_url character varying(1000),
    filesize bigint,
    file_type character varying(128),
    changes text[] DEFAULT '{}'::text[] NOT NULL,
    created_by character varying(128) DEFAULT 'system'::character varying NOT NULL,
    created_by_name character varying(128),
    reviewed_by character varying(128),
    approved_by character varying(128),
    published_at timestamp with time zone,
    file_content bytea,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS pdm.pdm_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    document_no character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    description text,
    document_type character varying(64),
    file_path character varying(500),
    file_size bigint,
    version character varying(32) DEFAULT '1.0'::character varying,
    status character varying(32) DEFAULT 'active'::character varying,
    created_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS pdm.pdm_master_data_refs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
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
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS pdm.pdm_materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    material_no character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    spec character varying(256),
    unit character varying(32),
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name_en character varying(255)
);

CREATE TABLE IF NOT EXISTS pdm.pdm_production_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    batch_no character varying(64) NOT NULL,
    product_id uuid,
    product_name character varying(256),
    quantity numeric(18,4),
    unit character varying(32),
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    status character varying(32) DEFAULT 'pending'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS pdm.pdm_production_formulas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    formula_no character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    product_id uuid,
    description text,
    formula_items jsonb DEFAULT '[]'::jsonb,
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name_en character varying(255)
);

CREATE TABLE IF NOT EXISTS pdm.pdm_production_processes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    process_no character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    description text,
    process_type character varying(64),
    standard_time numeric(10,2),
    unit character varying(32),
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name_en character varying(255)
);

CREATE TABLE IF NOT EXISTS pdm.pdm_production_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    process_id uuid NOT NULL,
    step_no integer NOT NULL,
    name character varying(256) NOT NULL,
    description text,
    standard_time numeric(10,2),
    equipment_requirement character varying(256),
    quality_check character varying(256),
    status character varying(32) DEFAULT 'active'::character varying,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS pdm.pdm_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    product_no character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    description text,
    version character varying(32),
    status character varying(32) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    name_en character varying(255)
);

CREATE TABLE IF NOT EXISTS pdm.pdm_project_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    user_id character varying(128) NOT NULL,
    user_name character varying(128),
    user_email text,
    role character varying(32) NOT NULL,
    joined_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS pdm.pdm_project_phases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    phase character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    description text,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    status character varying(32) DEFAULT 'pending'::character varying,
    deliverables text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS pdm.pdm_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    project_no character varying(64) NOT NULL,
    name character varying(256) NOT NULL,
    description text,
    status character varying(32) DEFAULT 'planning'::character varying,
    phase character varying(32) DEFAULT 'initiation'::character varying,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    manager_id character varying(128),
    manager_name character varying(128),
    budget double precision,
    progress integer DEFAULT 0,
    created_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS pdm.pdm_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    version_no character varying(64) NOT NULL,
    target_type character varying(64) NOT NULL,
    target_id uuid NOT NULL,
    target_name character varying(256),
    version_label character varying(32) NOT NULL,
    description text,
    status character varying(32) DEFAULT 'draft'::character varying,
    created_by character varying(128),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS pdm.pdm_workflow_instances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    workflow_id uuid NOT NULL,
    workflow_name character varying(256) NOT NULL,
    target_type character varying(64) NOT NULL,
    target_id uuid NOT NULL,
    current_step character varying(64) NOT NULL,
    status character varying(32) DEFAULT 'running'::character varying,
    assignees jsonb DEFAULT '[]'::jsonb,
    history jsonb DEFAULT '[]'::jsonb,
    created_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS pdm.pdm_workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(256) NOT NULL,
    description text,
    workflow_type character varying(64) NOT NULL,
    steps jsonb NOT NULL,
    conditions jsonb DEFAULT '{}'::jsonb,
    status character varying(32) DEFAULT 'active'::character varying,
    created_by character varying(128) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_pdm_bom_items_bom ON pdm.pdm_bom_items USING btree (bom_id);
CREATE INDEX IF NOT EXISTS idx_pdm_bom_items_tenant_id ON pdm.pdm_bom_items USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS pdm_bom_items_tenant_id_idx ON pdm.pdm_bom_items USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_boms_product ON pdm.pdm_boms USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_pdm_boms_tenant_id ON pdm.pdm_boms USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS pdm_boms_tenant_id_idx ON pdm.pdm_boms USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_change_notices_ecn_no ON pdm.pdm_change_notices USING btree (ecn_no);
CREATE INDEX IF NOT EXISTS idx_pdm_change_notices_priority ON pdm.pdm_change_notices USING btree (priority);
CREATE INDEX IF NOT EXISTS idx_pdm_change_notices_status ON pdm.pdm_change_notices USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pdm_change_notices_tenant_id ON pdm.pdm_change_notices USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS pdm_change_notices_tenant_id_idx ON pdm.pdm_change_notices USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_configurations_product ON pdm.pdm_configurations USING btree (product_id);
CREATE INDEX IF NOT EXISTS idx_pdm_configurations_tenant_id ON pdm.pdm_configurations USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS pdm_configurations_tenant_id_idx ON pdm.pdm_configurations USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_document_versions_document ON pdm.pdm_document_versions USING btree (document_id);
CREATE INDEX IF NOT EXISTS idx_pdm_document_versions_status ON pdm.pdm_document_versions USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pdm_document_versions_tenant_id ON pdm.pdm_document_versions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_documents_document_no ON pdm.pdm_documents USING btree (document_no);
CREATE INDEX IF NOT EXISTS idx_pdm_documents_name ON pdm.pdm_documents USING btree (name);
CREATE INDEX IF NOT EXISTS idx_pdm_documents_status ON pdm.pdm_documents USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pdm_documents_tenant_id ON pdm.pdm_documents USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS pdm_documents_tenant_id_idx ON pdm.pdm_documents USING btree (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pdm_master_data_refs_master_data_id ON pdm.pdm_master_data_refs USING btree (master_data_id);
CREATE INDEX IF NOT EXISTS idx_pdm_materials_material_no ON pdm.pdm_materials USING btree (material_no);
CREATE INDEX IF NOT EXISTS idx_pdm_materials_tenant_id ON pdm.pdm_materials USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS pdm_materials_tenant_id_idx ON pdm.pdm_materials USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_production_batches_batch_no ON pdm.pdm_production_batches USING btree (batch_no);
CREATE INDEX IF NOT EXISTS idx_pdm_production_batches_tenant_id ON pdm.pdm_production_batches USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS pdm_production_batches_tenant_id_idx ON pdm.pdm_production_batches USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_production_formulas_tenant_id ON pdm.pdm_production_formulas USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS pdm_production_formulas_tenant_id_idx ON pdm.pdm_production_formulas USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_production_processes_tenant_id ON pdm.pdm_production_processes USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS pdm_production_processes_tenant_id_idx ON pdm.pdm_production_processes USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_production_steps_process_id ON pdm.pdm_production_steps USING btree (process_id);
CREATE INDEX IF NOT EXISTS idx_pdm_production_steps_tenant_id ON pdm.pdm_production_steps USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS pdm_production_steps_tenant_id_idx ON pdm.pdm_production_steps USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_products_product_no ON pdm.pdm_products USING btree (product_no);
CREATE INDEX IF NOT EXISTS idx_pdm_products_tenant_id ON pdm.pdm_products USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS pdm_products_tenant_id_idx ON pdm.pdm_products USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_project_members_project ON pdm.pdm_project_members USING btree (project_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pdm_project_members_tenant_user ON pdm.pdm_project_members USING btree (tenant_id, project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_pdm_project_phases_project ON pdm.pdm_project_phases USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_pdm_projects_phase ON pdm.pdm_projects USING btree (phase);
CREATE INDEX IF NOT EXISTS idx_pdm_projects_project_no ON pdm.pdm_projects USING btree (project_no);
CREATE INDEX IF NOT EXISTS idx_pdm_projects_status ON pdm.pdm_projects USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pdm_projects_tenant_id ON pdm.pdm_projects USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_versions_target ON pdm.pdm_versions USING btree (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_pdm_versions_tenant_id ON pdm.pdm_versions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS pdm_versions_tenant_id_idx ON pdm.pdm_versions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_workflow_instances_status ON pdm.pdm_workflow_instances USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pdm_workflow_instances_target ON pdm.pdm_workflow_instances USING btree (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_pdm_workflow_instances_tenant_id ON pdm.pdm_workflow_instances USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS pdm_workflow_instances_tenant_id_idx ON pdm.pdm_workflow_instances USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_workflows_tenant_id ON pdm.pdm_workflows USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_workflows_type ON pdm.pdm_workflows USING btree (workflow_type);
CREATE INDEX IF NOT EXISTS pdm_workflows_tenant_id_idx ON pdm.pdm_workflows USING btree (tenant_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_bom_items'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_bom_items ADD CONSTRAINT "pdm_bom_items_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_boms'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_boms ADD CONSTRAINT "pdm_boms_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_change_notices'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_change_notices ADD CONSTRAINT "pdm_change_notices_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_configurations'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_configurations ADD CONSTRAINT "pdm_configurations_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_document_versions'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_document_versions ADD CONSTRAINT "pdm_document_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_documents'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_documents ADD CONSTRAINT "pdm_documents_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_master_data_refs'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_master_data_refs ADD CONSTRAINT "pdm_master_data_refs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_materials'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_materials ADD CONSTRAINT "pdm_materials_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_production_batches'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_production_batches ADD CONSTRAINT "pdm_production_batches_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_production_formulas'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_production_formulas ADD CONSTRAINT "pdm_production_formulas_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_production_processes'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_production_processes ADD CONSTRAINT "pdm_production_processes_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_production_steps'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_production_steps ADD CONSTRAINT "pdm_production_steps_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_products'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_products ADD CONSTRAINT "pdm_products_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_project_members'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_project_members ADD CONSTRAINT "pdm_project_members_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_project_phases'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_project_phases ADD CONSTRAINT "pdm_project_phases_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_projects'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_projects ADD CONSTRAINT "pdm_projects_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_versions'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_versions ADD CONSTRAINT "pdm_versions_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_workflow_instances'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_workflow_instances ADD CONSTRAINT "pdm_workflow_instances_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_workflows'::regclass AND contype='p') THEN
        ALTER TABLE pdm.pdm_workflows ADD CONSTRAINT "pdm_workflows_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pdm.pdm_master_data_refs'::regclass AND conname='ck_pdm_master_data_refs_status_standard') THEN
        ALTER TABLE pdm.pdm_master_data_refs ADD CONSTRAINT "ck_pdm_master_data_refs_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text, ('archived'::character varying)::text]))));
    END IF;
END $$;


ALTER TABLE pdm.pdm_bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_bom_items FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_boms FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_change_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_change_notices FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_configurations FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_document_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_master_data_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_master_data_refs FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_materials FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_production_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_production_batches FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_production_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_production_formulas FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_production_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_production_processes FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_production_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_production_steps FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_products FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_project_members FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_project_phases FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_projects FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_versions FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_workflow_instances FORCE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm.pdm_workflows FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_bom_items;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_bom_items AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_boms;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_boms AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_change_notices;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_change_notices AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_configurations;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_configurations AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_document_versions;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_document_versions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_documents;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_documents AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_master_data_refs;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_master_data_refs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_materials;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_materials AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_production_batches;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_production_batches AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_production_formulas;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_production_formulas AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_production_processes;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_production_processes AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_production_steps;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_production_steps AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_products;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_products AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_project_members;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_project_members AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_project_phases;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_project_phases AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_projects;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_projects AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_versions;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_versions AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_workflow_instances;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_workflow_instances AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pdm.pdm_workflows;
CREATE POLICY "rls_tenant_isolation" ON pdm.pdm_workflows AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
