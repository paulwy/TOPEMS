-- P3 A 级止血 / 2026-11-09：补建 master_data.mdm_supplier_categories + mdm_suppliers.category_code
--
-- 背景（见 docs/quality/prod-schema-drift-2026-11-09.md 第 8 节 A2）：
--   迁移 20261107000031 声明的分类字典表与 category_code 列从未进入生产账本，
--   导致供应商保存（validate_category_code 查字典）、类别下拉、scm/srm 反向同步 500。
--
-- 范围（严格限定）：
--   - 建字典表（结构照 20261107000031）；
--   - 给 mdm_suppliers 补 category_code 列 + 索引；
--   - **不做种子、不回填**（用户明确边界：种子/回填需业务口径，单独拍）。
--     code 依赖：后端只读列表与校验均容忍空表（空表时 category_code 校验退化为
--     “码不存在 → 400”，不会 500），故本批不导入字典行。
--
-- Idempotency：CREATE TABLE/INDEX IF NOT EXISTS、策略 DO $$ IF NOT EXISTS、
--   ALTER TABLE ... ADD COLUMN IF NOT EXISTS、owner 归一对已归位环境 no-op。
--
-- owner 归一：同 20261109100100（生产 pg_default_acl 为空，必须把 owner 归 topems_prod）。
--
-- ROLLBACK（生产，仅当确认表内无业务数据）：
--   DROP TABLE IF EXISTS master_data.mdm_supplier_categories;
--   ALTER TABLE master_data.mdm_suppliers DROP COLUMN IF EXISTS category_code;

BEGIN;

-- 1) 建字典表
CREATE TABLE IF NOT EXISTS master_data.mdm_supplier_categories (
    id            uuid         NOT NULL DEFAULT gen_random_uuid(),
    code          varchar      NOT NULL,
    name_zh       varchar      NOT NULL,
    name_en       varchar      NULL,
    source_values jsonb        NULL,
    description   text         NULL,
    sort_order    int          NULL,
    status        varchar      NOT NULL DEFAULT 'active',
    tenant_id     uuid         NULL,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now(),
    deleted_at    timestamptz  NULL,
    CONSTRAINT mdm_supplier_categories_pkey PRIMARY KEY (id),
    CONSTRAINT mdm_supplier_categories_code_key UNIQUE (code)
);

COMMENT ON TABLE  master_data.mdm_supplier_categories IS '供应商分类字典（统一 scm/srm 跨源枚举）';
COMMENT ON COLUMN master_data.mdm_supplier_categories.source_values IS '各来源原始取值映射，如 {"scm":"raw_material","srm":"原材料"}';

-- 2) RLS：ENABLE + FORCE
ALTER TABLE master_data.mdm_supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data.mdm_supplier_categories FORCE ROW LEVEL SECURITY;

-- 3) 租户隔离策略（表达式与 20261107000031 一致）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'master_data'
          AND tablename  = 'mdm_supplier_categories'
          AND policyname = 'tenant_isolation_mdm_supplier_categories'
    ) THEN
        CREATE POLICY tenant_isolation_mdm_supplier_categories ON master_data.mdm_supplier_categories
            AS PERMISSIVE
            FOR ALL
            TO public
            USING (
                current_setting('app.tenant_id'::text, true) IS NULL
                OR current_setting('app.tenant_id'::text, true) = ''::text
                OR current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text
                OR tenant_id IS NULL
                OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
            )
            WITH CHECK (
                current_setting('app.tenant_id'::text, true) IS NULL
                OR current_setting('app.tenant_id'::text, true) = ''::text
                OR current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text
                OR tenant_id IS NULL
                OR tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid
            );
    END IF;
END
$$;

-- 4) 授权 + owner 归一
DO $$
DECLARE
    svc_role text;
BEGIN
    IF to_regclass('master_data.mdm_supplier_categories') IS NULL THEN
        RAISE NOTICE 'P3 止血：mdm_supplier_categories 不存在，跳过授权/owner 归一';
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_prod') THEN
        svc_role := 'topems_prod';
    ELSIF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        svc_role := 'topems_app';
    ELSE
        RAISE NOTICE 'P3 止血：未找到服务运行角色（topems_prod/topems_app），跳过 owner 归一';
        RETURN;
    END IF;

    EXECUTE format('ALTER TABLE master_data.mdm_supplier_categories OWNER TO %I', svc_role);
    RAISE NOTICE 'P3 止血：mdm_supplier_categories owner -> %', svc_role;

    IF svc_role <> 'topems_app'
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'topems_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE
            ON master_data.mdm_supplier_categories TO topems_app;
    END IF;
END $$;

-- 5) 索引
CREATE INDEX IF NOT EXISTS mdm_supplier_categories_code_idx   ON master_data.mdm_supplier_categories (code);
CREATE INDEX IF NOT EXISTS mdm_supplier_categories_status_idx ON master_data.mdm_supplier_categories (status);

-- 6) mdm_suppliers.category_code（弱引用字典 code；可空）
DO $$
BEGIN
    IF to_regclass('master_data.mdm_suppliers') IS NULL THEN
        RAISE NOTICE 'P3 止血：mdm_suppliers 不存在，跳过 category_code';
        RETURN;
    END IF;
    ALTER TABLE master_data.mdm_suppliers ADD COLUMN IF NOT EXISTS category_code varchar;
    COMMENT ON COLUMN master_data.mdm_suppliers.category_code IS '规范化分类代码，弱引用 mdm_supplier_categories.code';
    CREATE INDEX IF NOT EXISTS mdm_suppliers_category_code_idx ON master_data.mdm_suppliers (category_code);
END $$;

COMMIT;
