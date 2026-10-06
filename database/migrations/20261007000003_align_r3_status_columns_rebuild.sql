-- =============================================================================
-- 20261007000003 — 重建基线对齐：R3 依赖表/列补齐（5433 空库链 vs 5432 演进库）
-- =============================================================================
-- 背景（2026-10-07 ② rehome 搬列差异项定案，A2 后续）:
--   * 5432 演进库中 erp.financial_vouchers / crm.audit_logs 的 status 列、
--     erp.erp_production_orders 整表，均由服务运行时内联 DDL 自建（不在迁移链）：
--       - business_base_tables L3081 仅建 erp.financial_vouchers 为 id 骨架，
--         public 全列版被 20260901000003 DROP；
--       - erp.erp_production_orders 全链无 CREATE TABLE（实测 grep 0 命中）。
--   * R3(20261003000003) 对这三张做 ADD CONSTRAINT ck_*_status_standard，
--     5433 空库重放因表/列缺失被列守卫跳过 → 空库重建基线缺列缺约束，
--     与 5432 形态不一致（若 5433 作为正式重建基线需补进链）。
-- 本迁移（幂等，可安全重放于 5432/5433）:
--   1. 补建 erp.erp_production_orders（对齐 5432 实测 21 列形态）；
--      运行时 init_database 的 CREATE TABLE IF NOT EXISTS 随后变 no-op。
--   2. 补 erp.financial_vouchers.status / crm.audit_logs.status（对齐 5432 实测
--      varchar NOT NULL DEFAULT）。
--   3. 补 R3 同型宽约束（约束名与 R3 一致，IF NOT EXISTS 幂等；
--      5432 已由 R3 添加 → no-op；5433 补齐后与 5432 约束定义一致）。
-- 依据: 5432 实测 erp.financial_vouchers.status=varchar(20) NOT NULL DEFAULT
--   'draft'、crm.audit_logs.status=varchar(20) NOT NULL DEFAULT 'success'、
--   erp.erp_production_orders.status=varchar(50) NOT NULL DEFAULT 'pending'
--   （含各自宽 CHECK，见下）。
-- =============================================================================

-- ---- 1. erp.erp_production_orders 补建（对齐 5432 实测 21 列） ----------------
CREATE TABLE IF NOT EXISTS erp.erp_production_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_no VARCHAR(100) NOT NULL,
    product_id UUID,
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
    completed_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    source VARCHAR(50) NOT NULL DEFAULT 'manual',
    source_order_id VARCHAR(100),
    source_order_number VARCHAR(255),
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date TIMESTAMPTZ,
    actual_end_date TIMESTAMPTZ,
    workshop_id UUID,
    workshop_name VARCHAR(255),
    priority INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- ---- 2a. erp.financial_vouchers.status ----------------------------------------
ALTER TABLE erp.financial_vouchers
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'draft';

-- ---- 2b. crm.audit_logs.status -------------------------------------------------
ALTER TABLE crm.audit_logs
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'success';

-- ---- 3. R3 同型宽约束（IF NOT EXISTS 幂等，5432 已存在则 no-op） --------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_financial_vouchers_status_standard') THEN
        ALTER TABLE erp.financial_vouchers ADD CONSTRAINT ck_financial_vouchers_status_standard
            CHECK (status IS NULL OR status IN ('active','inactive','archived','draft','pending','posted'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_erp_production_orders_status_standard') THEN
        ALTER TABLE erp.erp_production_orders ADD CONSTRAINT ck_erp_production_orders_status_standard
            CHECK (status IS NULL OR status IN ('active','inactive','archived','draft','pending','dispatched','in_progress','completed','cancelled','open','new'));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_audit_logs_status_standard') THEN
        ALTER TABLE crm.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard
            CHECK (status IS NULL OR status IN ('active','inactive','archived','success','failure'));
    END IF;
END $$;
