-- =============================================================================
-- 20261013000000_runtime_contract_missing_tables.sql
-- =============================================================================
-- 运行时 SQL 契约门禁全仓审计（2026-10-13）补缺表：代码引用但 live 缺失的表。
-- 每个表列结构对齐门禁 42P01 处代码的 INSERT/SELECT（见各表注释证据）。
-- 幂等：CREATE TABLE IF NOT EXISTS + 约束幂等守卫；可重复执行。
-- =============================================================================

-- ---------- portal.portal_notifications（portal/event_handlers/mod.rs:61）----------
-- INSERT (id,title,content,service,service_name,notification_type,read,created_at,link_url,target_user,tenant_id) RETURNING id
CREATE TABLE IF NOT EXISTS portal.portal_notifications (
    id                UUID PRIMARY KEY,
    title             TEXT NOT NULL,
    content           TEXT,
    service           TEXT,
    service_name      TEXT,
    notification_type TEXT,
    read              BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    link_url          TEXT,
    target_user       UUID,
    tenant_id         UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
);

-- ---------- portal.portal_dashboard_stats（portal/event_handlers/mod.rs:187/194）----------
-- SELECT stat_key,stat_value,stat_label,updated_at,tenant_id；
-- INSERT ... ON CONFLICT(stat_key,tenant_id) DO UPDATE stat_value+1
CREATE TABLE IF NOT EXISTS portal.portal_dashboard_stats (
    stat_key   TEXT NOT NULL,
    stat_value BIGINT NOT NULL DEFAULT 0,
    stat_label TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id  UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    PRIMARY KEY (stat_key, tenant_id)
);

-- ---------- public.search_entity_projections（search/projection.rs:30 内联建表对齐）----------
CREATE TABLE IF NOT EXISTS public.search_entity_projections (
    tenant_id        UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
    entity_type      VARCHAR(32) NOT NULL,
    entity_id        UUID NOT NULL,
    name             TEXT,
    contact_person   TEXT,
    contact_phone    TEXT,
    email            TEXT,
    address          TEXT,
    status           TEXT,
    remark           TEXT,
    source_updated_at TIMESTAMPTZ,
    projected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_sep_type_name
    ON public.search_entity_projections(entity_type, name);

-- ---------- bi.bi_datasets（analytics/modules/bi/dataset_whitelist.rs:71/156）----------
-- INSERT (table_name,column_name,data_type) ON CONFLICT(table_name,column_name)；
-- SELECT column_name WHERE table_name=$1 AND is_active=TRUE
CREATE TABLE IF NOT EXISTS bi.bi_datasets (
    table_name  VARCHAR NOT NULL,
    column_name VARCHAR NOT NULL,
    data_type   VARCHAR NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY (table_name, column_name)
);

-- ---------- finance.finance_audit_log（finance/modules/audit_v52.rs:652）----------
-- SELECT id,entity_type,action,created_at WHERE tenant_id=$1 AND action='delete'
CREATE TABLE IF NOT EXISTS finance.finance_audit_log (
    id          UUID PRIMARY KEY,
    entity_type TEXT NOT NULL,
    action      TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tenant_id   UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
);

-- ---------- erp.inventory_items（erp/modules/dashboard.rs:120/128）----------
-- SELECT SUM(quantity) / COUNT(*) WHERE quantity < COALESCE(reorder_point,10)
CREATE TABLE IF NOT EXISTS erp.inventory_items (
    id            UUID PRIMARY KEY,
    quantity      NUMERIC NOT NULL DEFAULT 0,
    reorder_point NUMERIC,
    tenant_id     UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'
);

-- ---------- tms.drivers（tms/modules/driver.rs:24 Driver + main.rs:89）----------
CREATE TABLE IF NOT EXISTS tms.drivers (
    id           UUID PRIMARY KEY,
    driver_no    TEXT NOT NULL,
    name         TEXT NOT NULL,
    phone        TEXT,
    license_no   TEXT,
    license_type TEXT,
    status       TEXT NOT NULL DEFAULT 'active',
    carrier_id   UUID,
    tenant_id    UUID,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ
);

-- ---------- tms.carriers（tms/modules/carrier.rs:25 Carrier + main.rs:157）----------
CREATE TABLE IF NOT EXISTS tms.carriers (
    id             UUID PRIMARY KEY,
    carrier_no     TEXT NOT NULL,
    name           TEXT NOT NULL,
    name_en        TEXT,
    contact_person TEXT,
    contact_phone  TEXT,
    status         TEXT NOT NULL DEFAULT 'active',
    service_area   TEXT,
    tenant_id      UUID,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ
);

-- ---------- rs.rs_projects（rd/event_handlers/mod.rs:84/130，源=pm_project）----------
-- INSERT (name,code,project_type,status,leader,progress,start_date,created_by,created_at,updated_at,source_type,source_id)
--   ON CONFLICT(source_type,source_id)；UPDATE ... WHERE name=$2
CREATE TABLE IF NOT EXISTS rs.rs_projects (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL,
    code         TEXT,
    project_type TEXT,
    status       TEXT NOT NULL DEFAULT 'pending',
    leader       TEXT,
    progress     INTEGER NOT NULL DEFAULT 0,
    start_date   TIMESTAMPTZ,
    created_by   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_type  TEXT,
    source_id    UUID,
    tenant_id    UUID,
    UNIQUE (source_type, source_id)
);

-- ---------- rs.rs_formulas / rs.rs_experiments（rd/event_handlers/mod.rs:184/240）----------
CREATE TABLE IF NOT EXISTS rs.rs_formulas (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    formula     TEXT,
    status      TEXT,
    source_type TEXT,
    source_id   UUID,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_type, source_id)
);

CREATE TABLE IF NOT EXISTS rs.rs_experiments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    status      TEXT,
    source_type TEXT,
    source_id   UUID,
    tenant_id   UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_type, source_id)
);

-- ---------- erp.event_idempotency（erp/event_handlers/mod.rs:2181 内联建表对齐）----------
CREATE TABLE IF NOT EXISTS erp.event_idempotency (
    idempotency_key TEXT PRIMARY KEY,
    event_type      TEXT NOT NULL,
    processed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
