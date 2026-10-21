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
-- 历史环境中 ehs.qa_ehs_hazards 是独立表（且有 4 张修正/验证/评估/措施表的外键引用），
-- 无法直接替换为视图：此处先把存量行幂等搬到主表 public.qa_ehs_hazards 保证新旧路径同源，
-- 仅在目标不存在或已是视图时才创建/替换视图，避免整条迁移失败或破坏外键
DO $$
BEGIN
    IF to_regclass('ehs.qa_ehs_hazards') IS NOT NULL
       AND (SELECT relkind FROM pg_class WHERE oid = to_regclass('ehs.qa_ehs_hazards')) = 'r' THEN
        EXECUTE $ins$
            INSERT INTO public.qa_ehs_hazards
                (id, hazard_no, title, description, category, level, source, location,
                 reported_by, reported_at, status, inspection_id, created_at, updated_at,
                 tenant_id, deleted_at)
            SELECT id, hazard_no, title, description, category, level, source, location,
                   reported_by, reported_at, status, inspection_id, created_at, updated_at,
                   tenant_id, deleted_at
            FROM ehs.qa_ehs_hazards
            ON CONFLICT (id) DO NOTHING
        $ins$;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('ehs.qa_ehs_hazards') IS NULL
       OR (SELECT relkind FROM pg_class WHERE oid = to_regclass('ehs.qa_ehs_hazards')) = 'v' THEN
        EXECUTE $view$
            CREATE OR REPLACE VIEW ehs.qa_ehs_hazards AS
            SELECT
                id, hazard_no, title, NULL::text AS title_en, description, category,
                level, source, location, reported_by, reported_at, status, inspection_id,
                created_at, updated_at
            FROM public.qa_ehs_hazards
        $view$;
    END IF;
END $$;

-- CRM 标签补 name_en（tag.rs 契约）
ALTER TABLE crm.tags ADD COLUMN IF NOT EXISTS name_en VARCHAR(128);

-- GIS 设备补 tenant_id（device.rs 契约）
ALTER TABLE gis.devices ADD COLUMN IF NOT EXISTS tenant_id UUID;
