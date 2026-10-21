-- =============================================================
-- 批4（P1-9）：EHS hazard 契约表 + CRM/GIS 补列
-- =============================================================

CREATE SCHEMA IF NOT EXISTS ehs;

-- EHS 安全危险源（对齐 hazard.rs /api/ehs/issues 契约）
CREATE TABLE IF NOT EXISTS ehs.safety_hazards (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID,
    hazard_no        VARCHAR(64) NOT NULL,
    name             VARCHAR(128) NOT NULL,
    category         VARCHAR(64),
    level            VARCHAR(32),
    description      TEXT,
    location         VARCHAR(256),
    risk_assessment  TEXT,
    control_measures JSONB,
    status           VARCHAR(32) DEFAULT 'active',
    severity         VARCHAR(16),
    exposure         VARCHAR(16),
    likelihood       VARCHAR(16),
    created_by       UUID,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW(),
    deleted_at       TIMESTAMPTZ,
    UNIQUE (tenant_id, hazard_no)
);

-- EHS 风险评价记录
CREATE TABLE IF NOT EXISTS ehs.hazard_risk_assessments (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hazard_id      UUID,
    tenant_id      UUID,
    assessment_date TIMESTAMPTZ,
    assessor       VARCHAR(128),
    severity       VARCHAR(16),
    likelihood     VARCHAR(16),
    risklevel      VARCHAR(32),
    recommendations TEXT,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);

-- EHS 管控措施
CREATE TABLE IF NOT EXISTS ehs.hazard_control_measures (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hazard_id     UUID,
    measure_type  VARCHAR(64),
    description   TEXT,
    responsible   VARCHAR(128),
    deadline      TIMESTAMPTZ,
    status        VARCHAR(32) DEFAULT 'pending',
    tenant_id     UUID,
    effectiveness VARCHAR(64),
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    deleted_at    TIMESTAMPTZ
);

-- EHS 危险源（旧模型视图，兼容 hazard.rs list 旧路径）
CREATE OR REPLACE VIEW ehs.qa_ehs_hazards AS
    SELECT
        id,
        hazard_no,
        title,
        NULL::text AS title_en,
        description,
        category,
        level,
        source,
        location,
        reported_by,
        reported_at,
        status,
        inspection_id,
        created_at,
        updated_at
    FROM public.qa_ehs_hazards;

-- CRM 标签补 name_en（tag.rs 契约）
ALTER TABLE crm.tags ADD COLUMN IF NOT EXISTS name_en VARCHAR(128);

-- GIS 设备补 tenant_id（device.rs 契约）
ALTER TABLE gis.devices ADD COLUMN IF NOT EXISTS tenant_id UUID;
