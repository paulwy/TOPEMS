-- =====================================================================
-- 20261021000011: P2-11 剩余两项收口（批7 续）
--  1) PM project_type_configs 表已存在（20260725000000 骨架 + 后续补列），
--     本迁移仅校验/补漏：name_en 列 + type_code/type_name 唯一约束
--  2) PDM 独立图纸实体：新建 pdm_drawings 表（public schema，对齐 pdm_documents 风格）
-- =====================================================================

-- ---------- 1) PM 项目类型模板：补 name_en 与唯一约束 ----------
ALTER TABLE "pm"."project_type_configs"
    ADD COLUMN IF NOT EXISTS "name_en" character varying(50);

-- type_code 租户内唯一（若既有约束缺失则补建）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = '"pm"."project_type_configs"'::regclass
          AND conname = 'project_type_configs_tenant_type_code_key'
    ) THEN
        ALTER TABLE "pm"."project_type_configs"
            ADD CONSTRAINT project_type_configs_tenant_type_code_key UNIQUE (tenant_id, type_code);
    END IF;
END $$;

-- ---------- 2) PDM 独立图纸实体 ----------
CREATE TABLE IF NOT EXISTS pdm_drawings (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid NOT NULL,
    drawing_no    varchar(50) NOT NULL,
    name          varchar(200) NOT NULL,
    name_en       varchar(200),
    description   text,
    drawing_type  varchar(50),
    product_id    uuid,
    version       varchar(20) NOT NULL DEFAULT '1.0',
    status        varchar(20) NOT NULL DEFAULT 'active',
    file_path     text,
    file_size     bigint,
    created_by    varchar(64),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted_at    timestamptz,
    CONSTRAINT pdm_drawings_tenant_no_key UNIQUE (tenant_id, drawing_no)
);

CREATE INDEX IF NOT EXISTS idx_pdm_drawings_tenant ON pdm_drawings (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pdm_drawings_status ON pdm_drawings (status);
