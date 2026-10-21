-- =============================================================
-- 批7（P2-11）：公共主数据域（物料目录 / UOM / 样品）承接 master-data
-- =============================================================

CREATE SCHEMA IF NOT EXISTS master_data;

-- 物料目录
CREATE TABLE IF NOT EXISTS master_data.materials (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID,
    material_code   VARCHAR(64) NOT NULL,
    material_name   VARCHAR(200) NOT NULL,
    name_en         VARCHAR(200),
    material_type   VARCHAR(64),
    specification   VARCHAR(256),
    unit            VARCHAR(32),
    uom_id          UUID,
    status          VARCHAR(32) DEFAULT 'active',
    description     TEXT,
    created_by      UUID,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    UNIQUE (tenant_id, material_code)
);

-- 计量单位（UOM）
CREATE TABLE IF NOT EXISTS master_data.uoms (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID,
    uom_code    VARCHAR(32) NOT NULL,
    uom_name    VARCHAR(100) NOT NULL,
    name_en     VARCHAR(100),
    uom_type    VARCHAR(64),
    category    VARCHAR(64),
    status      VARCHAR(32) DEFAULT 'active',
    description TEXT,
    created_by  UUID,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    deleted_at  TIMESTAMPTZ,
    UNIQUE (tenant_id, uom_code)
);

-- 样品主数据
CREATE TABLE IF NOT EXISTS master_data.samples (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id    UUID,
    sample_code  VARCHAR(64) NOT NULL,
    sample_name  VARCHAR(200) NOT NULL,
    name_en      VARCHAR(200),
    sample_type  VARCHAR(64),
    source       VARCHAR(128),
    status       VARCHAR(32) DEFAULT 'active',
    description  TEXT,
    created_by   UUID,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,
    UNIQUE (tenant_id, sample_code)
);
