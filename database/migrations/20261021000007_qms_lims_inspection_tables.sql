-- =============================================================
-- 批3（P1-7）：QMS 结构化检验项/检验方案/抽样方案 + LIMS 检验项目(analyte)
--
-- 背景：QMS 检验只能填自由文本，无法标准化质检；LIMS 无检验项目主数据。
-- 对齐现有惯例：QMS 表带 tenant_id/created_by（参照 qa_standards），
-- LIMS 表带 tenant_id/created_by（参照 qa_lims_test_methods）。
-- =============================================================

-- QMS 检验项（结构化检验要求）
CREATE TABLE IF NOT EXISTS qa_inspection_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID,
    code           VARCHAR(64) NOT NULL,
    name           VARCHAR(255) NOT NULL,
    category       VARCHAR(64),
    specification  TEXT,
    method         VARCHAR(255),
    unit           VARCHAR(32),
    standard_value VARCHAR(128),
    tolerance      VARCHAR(64),
    status         VARCHAR(32) DEFAULT 'active',
    description    TEXT,
    created_by     UUID,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,
    UNIQUE (tenant_id, code)
);

-- QMS 抽样方案
CREATE TABLE IF NOT EXISTS qa_sampling_plans (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID,
    code           VARCHAR(64) NOT NULL,
    name           VARCHAR(255) NOT NULL,
    level          VARCHAR(64),           -- 抽样水平（如一般水平 II）
    sample_size    INT,
    aql            VARCHAR(32),           -- 可接受质量水平
    inspection_level VARCHAR(32),
    status         VARCHAR(32) DEFAULT 'active',
    description    TEXT,
    created_by     UUID,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,
    UNIQUE (tenant_id, code)
);

-- QMS 检验方案（主表：方案基础信息）
CREATE TABLE IF NOT EXISTS qa_inspection_plans (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID,
    code           VARCHAR(64) NOT NULL,
    name           VARCHAR(255) NOT NULL,
    product_code   VARCHAR(128),
    product_name   VARCHAR(255),
    sampling_plan_id UUID REFERENCES qa_sampling_plans(id) ON DELETE SET NULL,
    status         VARCHAR(32) DEFAULT 'active',
    description    TEXT,
    created_by     UUID,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,
    UNIQUE (tenant_id, code)
);

-- QMS 检验方案-检验项 关联（一个方案包含多个检验项，含抽样数量）
CREATE TABLE IF NOT EXISTS qa_inspection_plan_items (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id            UUID NOT NULL REFERENCES qa_inspection_plans(id) ON DELETE CASCADE,
    item_id            UUID NOT NULL REFERENCES qa_inspection_items(id) ON DELETE CASCADE,
    sample_qty         INT DEFAULT 1,
    sort_order         INT DEFAULT 0,
    created_at         TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (plan_id, item_id)
);

-- LIMS 检验项目（analyte）
CREATE TABLE IF NOT EXISTS qa_lims_analytes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID,
    analyte_code    VARCHAR(64) NOT NULL,
    analyte_name    VARCHAR(255) NOT NULL,
    category        VARCHAR(64),
    unit            VARCHAR(32),
    method_reference VARCHAR(255),
    limit_value     VARCHAR(128),
    accuracy        VARCHAR(64),
    status          VARCHAR(32) DEFAULT 'active',
    description     TEXT,
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE (tenant_id, analyte_code)
);
