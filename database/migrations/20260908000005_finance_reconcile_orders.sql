-- =============================================================
-- 20260908000005: Finance 对账订单表（第二批-⑦ ③A 决策）
-- =============================================================
-- 背景：前端 reconciliation.ts 走 /reconcile order 模型（10 方法），
--       后端 mod.rs 仅 2 条桩实现（不查库），新 reconciliation.rs 为
--       session 模型未接前端。决策 ③A：后端补齐 /reconcile 真实现。
-- 本迁移建立 finance.reconcile_orders / finance.reconcile_items。
-- =============================================================

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
CREATE INDEX IF NOT EXISTS idx_reconcile_items_status ON finance.reconcile_items (status);
