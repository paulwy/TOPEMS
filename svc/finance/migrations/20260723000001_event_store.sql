-- 事件存储表
CREATE TABLE IF NOT EXISTS cqrs_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id VARCHAR(64) NOT NULL,
    aggregate_type VARCHAR(32) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    version BIGINT NOT NULL,
    payload JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(aggregate_id, version)
);
CREATE INDEX IF NOT EXISTS idx_cqrs_events_aggregate ON cqrs_events(aggregate_id, version);
CREATE INDEX IF NOT EXISTS idx_cqrs_events_type ON cqrs_events(aggregate_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_cqrs_events_occurred ON cqrs_events(occurred_at);

-- 快照表
CREATE TABLE IF NOT EXISTS cqrs_snapshots (
    aggregate_id VARCHAR(64) PRIMARY KEY,
    aggregate_type VARCHAR(32) NOT NULL,
    version BIGINT NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cqrs_snapshots_type ON cqrs_snapshots(aggregate_type);

-- 投影器进度表
CREATE TABLE IF NOT EXISTS cqrs_projection_progress (
    view_name VARCHAR(64) PRIMARY KEY,
    last_event_id UUID,
    last_event_time TIMESTAMPTZ,
    processed_count BIGINT DEFAULT 0,
    error_count BIGINT DEFAULT 0,
    last_error TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 物化视图表
CREATE TABLE IF NOT EXISTS mv_voucher_summary (
    id VARCHAR(64) PRIMARY KEY,
    voucher_no VARCHAR(64) NOT NULL UNIQUE,
    voucher_date DATE NOT NULL,
    voucher_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL,
    summary TEXT,
    total_amount DECIMAL(18,2) DEFAULT 0,
    created_by VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL,
    posted_at TIMESTAMPTZ,
    version BIGINT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_mv_voucher_status ON mv_voucher_summary(status);
CREATE INDEX IF NOT EXISTS idx_mv_voucher_date ON mv_voucher_summary(voucher_date);

CREATE TABLE IF NOT EXISTS mv_receivable_aging (
    id VARCHAR(64) PRIMARY KEY,
    customer_id VARCHAR(64) NOT NULL,
    customer_name VARCHAR(128),
    total_amount DECIMAL(18,2) DEFAULT 0,
    current_amount DECIMAL(18,2) DEFAULT 0,
    bucket_30_amount DECIMAL(18,2) DEFAULT 0,
    bucket_60_amount DECIMAL(18,2) DEFAULT 0,
    bucket_90_amount DECIMAL(18,2) DEFAULT 0,
    bucket_180_amount DECIMAL(18,2) DEFAULT 0,
    over_180_amount DECIMAL(18,2) DEFAULT 0,
    status VARCHAR(32) NOT NULL,
    version BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mv_aging_customer ON mv_receivable_aging(customer_id);
CREATE INDEX IF NOT EXISTS idx_mv_aging_status ON mv_receivable_aging(status);
