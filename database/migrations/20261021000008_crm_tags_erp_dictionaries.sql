-- =============================================================
-- 批4（P1-9）：ERP 数据字典（CRM 标签复用既有 crm.tags 路由，不新增表）
-- =============================================================

-- ERP 数据字典（通用枚举/字典项）
CREATE TABLE IF NOT EXISTS erp_dictionaries (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID,
    code           VARCHAR(64) NOT NULL,
    name           VARCHAR(128) NOT NULL,
    category       VARCHAR(64),
    items          JSONB,
    status         VARCHAR(32) DEFAULT 'active',
    description    TEXT,
    created_by     UUID,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,
    UNIQUE (tenant_id, code)
);
