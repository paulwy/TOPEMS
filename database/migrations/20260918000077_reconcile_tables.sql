-- TOPEMS database migration 20260918000077
-- 补建 finance.reconcile_orders / finance.reconcile_items
-- 背景：000005 迁移定义了这两张表，但当前 5432/5433 均缺失
-- （GET /api/finance/reconcile/{order_id}[/items] 报 relation does not exist）。
-- 幂等补建，双库安全。

CREATE SCHEMA IF NOT EXISTS finance;

CREATE TABLE IF NOT EXISTS finance.reconcile_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no TEXT NOT NULL UNIQUE,
    counterparty_id UUID,
    counterparty_name TEXT,
    period TEXT,
    start_date DATE,
    end_date DATE,
    total_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    matched_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    unmatched_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconcile_orders_status ON finance.reconcile_orders (status);
CREATE INDEX IF NOT EXISTS idx_reconcile_orders_counterparty ON finance.reconcile_orders (counterparty_id);
CREATE INDEX IF NOT EXISTS idx_reconcile_orders_period ON finance.reconcile_orders (period);

CREATE TABLE IF NOT EXISTS finance.reconcile_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES finance.reconcile_orders(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL DEFAULT 'invoice',
    source_id UUID,
    source_no TEXT,
    source_date DATE,
    source_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    matched BOOLEAN NOT NULL DEFAULT FALSE,
    match_id UUID,
    match_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    difference DOUBLE PRECISION NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'unmatched',
    remark TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconcile_items_order ON finance.reconcile_items (order_id);
CREATE INDEX IF NOT EXISTS idx_reconcile_items_source ON finance.reconcile_items (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_reconcile_items_status ON finance.reconcile_items (status);
