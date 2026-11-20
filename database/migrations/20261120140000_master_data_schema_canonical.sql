-- 20261120140000: master-data 5 张运行期表收口（W2-D2 第三个模块）
--
-- 背景：master_data.schema_registry / dynamic_data / materials / uoms / samples
-- 由 svc/master-data/src/schema_defense.rs 在启动时建骨架、逐列 ADD COLUMN 维护。
-- 本迁移以当前 baseline+forward 库真实形状固化。
--
-- 与旧 TABLE_DEFS 的差异（以 live 为准）：
--   * materials/uoms/samples 的 status、created_at、updated_at 线上可空；
--   * materials 的 specification/description 为 text，不是 varchar；
--   * 只有 materials/uoms/samples 启用 FORCE RLS，且策略仅 USING、无 WITH CHECK；
--   * schema_registry/dynamic_data 不启用 RLS。
--
-- 幂等：CREATE TABLE/INDEX IF NOT EXISTS；策略先 DROP IF EXISTS 再建。
-- 不删除数据、不改已有列类型。

CREATE SCHEMA IF NOT EXISTS master_data;

CREATE TABLE IF NOT EXISTS master_data.schema_registry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name varchar NOT NULL,
    title varchar NOT NULL,
    description text,
    schema_json jsonb NOT NULL,
    table_name varchar NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT schema_registry_pkey PRIMARY KEY (id),
    CONSTRAINT schema_registry_name_key UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS master_data.dynamic_data (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    schema_id uuid NOT NULL,
    data_json jsonb NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT dynamic_data_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS master_data.materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    material_code varchar NOT NULL,
    material_name varchar NOT NULL,
    name_en varchar,
    material_type varchar,
    specification text,
    unit varchar,
    uom_id uuid,
    status varchar DEFAULT 'active'::varchar,
    description text,
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT materials_pkey PRIMARY KEY (id),
    CONSTRAINT materials_tenant_id_material_code_key UNIQUE (tenant_id, material_code)
);

CREATE TABLE IF NOT EXISTS master_data.uoms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    uom_code varchar NOT NULL,
    uom_name varchar NOT NULL,
    name_en varchar,
    uom_type varchar,
    category varchar,
    status varchar DEFAULT 'active'::varchar,
    description text,
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT uoms_pkey PRIMARY KEY (id),
    CONSTRAINT uoms_tenant_id_uom_code_key UNIQUE (tenant_id, uom_code)
);

CREATE TABLE IF NOT EXISTS master_data.samples (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid,
    sample_code varchar NOT NULL,
    sample_name varchar NOT NULL,
    name_en varchar,
    sample_type varchar,
    source varchar,
    status varchar DEFAULT 'active'::varchar,
    description text,
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    deleted_at timestamptz,
    CONSTRAINT samples_pkey PRIMARY KEY (id),
    CONSTRAINT samples_tenant_id_sample_code_key UNIQUE (tenant_id, sample_code)
);

CREATE INDEX IF NOT EXISTS idx_mdm_materials_code ON master_data.materials USING btree (material_code);
CREATE INDEX IF NOT EXISTS idx_mdm_materials_tenant ON master_data.materials USING btree (tenant_id);

ALTER TABLE master_data.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data.materials FORCE ROW LEVEL SECURITY;
ALTER TABLE master_data.uoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data.uoms FORCE ROW LEVEL SECURITY;
ALTER TABLE master_data.samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data.samples FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_tenant_isolation ON master_data.materials;
CREATE POLICY rls_tenant_isolation ON master_data.materials
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON master_data.uoms;
CREATE POLICY rls_tenant_isolation ON master_data.uoms
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);

DROP POLICY IF EXISTS rls_tenant_isolation ON master_data.samples;
CREATE POLICY rls_tenant_isolation ON master_data.samples
USING (
    COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text
    OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
);
