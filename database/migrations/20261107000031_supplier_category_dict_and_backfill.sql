-- [batch33] 供应商分类字典 master_data.mdm_supplier_categories + mdm_suppliers.category_code 回填
--
-- 用途：
--   1) 建供应商分类字典表，统一 scm 英文枚举与 srm 中文枚举的分裂问题。
--   2) 给 mdm_suppliers 补 category_code 规范化列并按字典回填。
--
-- 数据现状（实测）：
--   * scm 侧 category 全部为 'raw_material'（195 行）
--   * srm 侧 category 全部为 '原材料'（92 行）
--   * 无其他取值，无空值/NULL 行（287 行全部有 category）
--
-- 设计要点：
--   * 字典表 code 唯一约束，name_zh/name_en 双语展示，source_values jsonb
--     记录各来源原始取值映射，便于后续追溯与新增枚举扩展。
--   * RLS 与同 schema mdm_* 表一致：ENABLE + FORCE，策略表达式照抄
--     mdm_suppliers 的 tenant_isolation_mdm_suppliers（含全零/空串放行分支）。
--   * tenant_id 可为 NULL（字典全局共享，不分租户）。
--   * GRANT SELECT, INSERT, UPDATE, DELETE TO topems_app（同 mdm_suppliers 惯例）。
--   * mdm_suppliers.category_code 可空（历史数据 category 为空的保持 NULL，
--     不强行归类）；回填仅处理 category IS NOT NULL 的行。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS /
--       策略 DO $$ IF NOT EXISTS / INSERT ON CONFLICT DO NOTHING /
--       UPDATE WHERE category_code IS NULL（二次执行 UPDATE 0）。
--
-- ROLLBACK（如需回滚，在 psql 中执行）：
--   BEGIN;
--   ALTER TABLE master_data.mdm_suppliers DROP COLUMN IF EXISTS category_code;
--   DROP TABLE IF EXISTS master_data.mdm_supplier_categories;
--   COMMIT;

BEGIN;

-- ============================================================
-- 1) 建字典表 master_data.mdm_supplier_categories
-- ============================================================
CREATE TABLE IF NOT EXISTS master_data.mdm_supplier_categories (
    id           uuid         NOT NULL DEFAULT gen_random_uuid(),
    code         varchar      NOT NULL,
    name_zh      varchar      NOT NULL,
    name_en      varchar      NULL,
    source_values jsonb       NULL,
    description  text         NULL,
    sort_order   int          NULL,
    status       varchar      NOT NULL DEFAULT 'active',
    tenant_id    uuid         NULL,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    updated_at   timestamptz  NOT NULL DEFAULT now(),
    deleted_at   timestamptz  NULL,
    CONSTRAINT mdm_supplier_categories_pkey PRIMARY KEY (id),
    CONSTRAINT mdm_supplier_categories_code_key UNIQUE (code)
);

COMMENT ON TABLE  master_data.mdm_supplier_categories IS '供应商分类字典（batch33，统一 scm/srm 跨源枚举分裂）';
COMMENT ON COLUMN master_data.mdm_supplier_categories.source_values IS '各来源原始取值映射，如 {"scm":"raw_material","srm":"原材料"}';

-- 2) RLS：ENABLE + FORCE（与同 schema mdm_* 表一致）
ALTER TABLE master_data.mdm_supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_data.mdm_supplier_categories FORCE ROW LEVEL SECURITY;

-- 3) 租户隔离策略（表达式完全照抄 mdm_suppliers 的 tenant_isolation_mdm_suppliers）
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

-- 4) 授权（与同 schema mdm 表一致）
GRANT SELECT, INSERT, UPDATE, DELETE ON master_data.mdm_supplier_categories TO topems_app;

-- 5) 索引
CREATE INDEX IF NOT EXISTS mdm_supplier_categories_code_idx   ON master_data.mdm_supplier_categories (code);
CREATE INDEX IF NOT EXISTS mdm_supplier_categories_status_idx ON master_data.mdm_supplier_categories (status);

-- ============================================================
-- 6) 种子数据（按实测 category 取值，仅 raw_material 一类）
-- ============================================================
INSERT INTO master_data.mdm_supplier_categories (code, name_zh, name_en, source_values, description, sort_order) VALUES
    ('raw_material', '原材料', 'Raw Material',
     '{"scm":"raw_material","srm":"原材料"}'::jsonb,
     '原料及主要材料，直接用于产品生产', 1)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 7) mdm_suppliers 补 category_code 列
-- ============================================================
ALTER TABLE master_data.mdm_suppliers ADD COLUMN IF NOT EXISTS category_code varchar;

COMMENT ON COLUMN master_data.mdm_suppliers.category_code IS '规范化分类代码，关联 mdm_supplier_categories.code';

-- ============================================================
-- 8) 回填 category_code（仅处理 category IS NOT NULL 且 category_code IS NULL 的行）
-- ============================================================
-- scm 侧英文枚举 → 规范化 code
UPDATE master_data.mdm_suppliers
SET category_code = 'raw_material'
WHERE category_code IS NULL
  AND category = 'raw_material';

-- srm 侧中文枚举 → 规范化 code
UPDATE master_data.mdm_suppliers
SET category_code = 'raw_material'
WHERE category_code IS NULL
  AND category = '原材料';

-- 9) 索引
CREATE INDEX IF NOT EXISTS mdm_suppliers_category_code_idx ON master_data.mdm_suppliers (category_code);

COMMIT;
