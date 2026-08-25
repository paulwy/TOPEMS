-- ================================================================================
-- 20260824000002_v256_finance_settlement_snapshots.sql
-- Finance 结算中心事件驱动快照表
--
-- 消除 Finance 服务对 erp.fin_reconciliations 和 pm.settlements 的跨 schema 直接读取
-- 通过事件订阅在 Finance 本地维护只读快照
-- ================================================================================

-- 对账数据快照（ERP 发布 ReconciliationCreated/Updated/Approved 事件时同步）
CREATE TABLE IF NOT EXISTS plugin_finance.reconciliation_snapshots (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    recon_code      VARCHAR(100),
    recon_name      VARCHAR(200) NOT NULL,
    recon_type      VARCHAR(50) NOT NULL,
    status          VARCHAR(50) NOT NULL DEFAULT 'draft',
    period          VARCHAR(50) NOT NULL,
    entity_id       UUID,
    entity_type     VARCHAR(50),
    total_debit     DOUBLE PRECISION,
    total_credit    DOUBLE PRECISION,
    difference      DOUBLE PRECISION,
    matched_count   INTEGER DEFAULT 0,
    unmatched_count INTEGER DEFAULT 0,
    description     TEXT,
    created_by      VARCHAR(200),
    approved_by     VARCHAR(200),
    approved_at     TIMESTAMPTZ,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recon_snap_tenant
    ON plugin_finance.reconciliation_snapshots (tenant_id);
CREATE INDEX IF NOT EXISTS idx_recon_snap_status
    ON plugin_finance.reconciliation_snapshots (status);
CREATE INDEX IF NOT EXISTS idx_recon_snap_period
    ON plugin_finance.reconciliation_snapshots (period);
CREATE INDEX IF NOT EXISTS idx_recon_snap_entity
    ON plugin_finance.reconciliation_snapshots (entity_id);

-- 结算数据快照（PM 发布 SettlementCreated/Approved/Rejected 事件时同步）
CREATE TABLE IF NOT EXISTS plugin_finance.settlement_snapshots (
    id                  UUID PRIMARY KEY,
    tenant_id           UUID NOT NULL,
    project_id          UUID NOT NULL,
    settlement_no       VARCHAR(100) NOT NULL,
    settlement_type     VARCHAR(50) NOT NULL,
    status              VARCHAR(50) NOT NULL DEFAULT 'pending',
    amount              DOUBLE PRECISION,
    settlement_date     TIMESTAMPTZ,
    remarks             TEXT,
    created_by          VARCHAR(200),
    approved_by         VARCHAR(200),
    approved_at         TIMESTAMPTZ,
    synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_settlement_snap_tenant
    ON plugin_finance.settlement_snapshots (tenant_id);
CREATE INDEX IF NOT EXISTS idx_settlement_snap_status
    ON plugin_finance.settlement_snapshots (status);
CREATE INDEX IF NOT EXISTS idx_settlement_snap_project
    ON plugin_finance.settlement_snapshots (project_id);
CREATE INDEX IF NOT EXISTS idx_settlement_snap_date
    ON plugin_finance.settlement_snapshots (settlement_date);

-- 对账-结算关联表（Finance 自有数据，记录跨域关联关系）
CREATE TABLE IF NOT EXISTS plugin_finance.reconciliation_settlement_links (
    id                  UUID PRIMARY KEY,
    tenant_id           UUID NOT NULL,
    reconciliation_id   UUID NOT NULL,
    settlement_id       UUID NOT NULL,
    link_type           VARCHAR(50) NOT NULL,
    amount              DOUBLE PRECISION,
    status              VARCHAR(50) NOT NULL DEFAULT 'linked',
    remark              TEXT,
    created_by          UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_recon
    ON plugin_finance.reconciliation_settlement_links (reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_link_settlement
    ON plugin_finance.reconciliation_settlement_links (settlement_id);
CREATE INDEX IF NOT EXISTS idx_link_tenant
    ON plugin_finance.reconciliation_settlement_links (tenant_id);

-- 对账明细快照（消除 Finance 对 erp.fin_reconciliation_items 的跨 schema 读写）
CREATE TABLE IF NOT EXISTS plugin_finance.reconciliation_item_snapshots (
    id              UUID PRIMARY KEY,
    tenant_id       UUID NOT NULL,
    recon_id        UUID NOT NULL,
    item_type       VARCHAR(50) NOT NULL,
    item_id         UUID,
    item_code       VARCHAR(100),
    item_name       VARCHAR(200),
    debit_amount    DOUBLE PRECISION DEFAULT 0,
    credit_amount   DOUBLE PRECISION DEFAULT 0,
    currency        VARCHAR(10) DEFAULT 'CNY',
    match_status    VARCHAR(30) NOT NULL DEFAULT 'unmatched',
    matched_item_id UUID,
    description    TEXT,
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recon_item_snap_recon
    ON plugin_finance.reconciliation_item_snapshots (recon_id);
CREATE INDEX IF NOT EXISTS idx_recon_item_snap_tenant
    ON plugin_finance.reconciliation_item_snapshots (tenant_id);
CREATE INDEX IF NOT EXISTS idx_recon_item_snap_status
    ON plugin_finance.reconciliation_item_snapshots (match_status);

-- 差异调整表（从 core schema 迁移到 plugin_finance，明确 Finance 域归属）
CREATE TABLE IF NOT EXISTS plugin_finance.difference_adjustments (
    id                  UUID PRIMARY KEY,
    tenant_id           UUID NOT NULL,
    source_type         VARCHAR(50) NOT NULL,
    source_id           UUID,
    difference_type     VARCHAR(50) NOT NULL,
    difference_amount   DOUBLE PRECISION NOT NULL,
    reason              TEXT,
    adjustment_amount   DOUBLE PRECISION,
    adjustment_type     VARCHAR(50),
    status              VARCHAR(30) NOT NULL DEFAULT 'pending',
    approved_by         UUID,
    approved_at         TIMESTAMPTZ,
    remark              TEXT,
    created_by          UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_diff_adj_tenant
    ON plugin_finance.difference_adjustments (tenant_id);
CREATE INDEX IF NOT EXISTS idx_diff_adj_status
    ON plugin_finance.difference_adjustments (status);
CREATE INDEX IF NOT EXISTS idx_diff_adj_source
    ON plugin_finance.difference_adjustments (source_type, source_id);