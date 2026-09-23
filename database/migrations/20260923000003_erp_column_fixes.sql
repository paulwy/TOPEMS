-- ============================================================
-- Migration: erp service SQL column drift fixes
-- Date: 2026-09-23
-- Description:
--   A. erp.fixed_assets: add useful_life_months / depreciation_period
--      (department_name removed from Rust code; table already has department_id)
--   B. erp.opening_balances: false positive (debit/credit_balance exist) - no DDL
--   C. erp.payables / erp.receivables: add supplier_id/customer_id/source_order_id
--   D. erp.meeting_bookings: add room_name
--   E. erp.vehicle_requests: add requester/purpose/driver_required/rejected_reason
--   F. erp.erp_master_data_refs: add 8 lifecycle columns (all nullable)
--   G. erp_master_data_versions / _conflicts / _quality_rules / _quality_reports:
--      tables are live (mounted via master_data_refs routes) -> create IF NOT EXISTS
-- All statements idempotent (IF NOT EXISTS).
-- ============================================================

-- A. erp.fixed_assets: 补列（Rust 结构体为非 Option，需 NOT NULL DEFAULT）
ALTER TABLE erp.fixed_assets ADD COLUMN IF NOT EXISTS useful_life_months INTEGER NOT NULL DEFAULT 0;
ALTER TABLE erp.fixed_assets ADD COLUMN IF NOT EXISTS depreciation_period VARCHAR(64) NOT NULL DEFAULT '';

-- C. erp.payables: 补列（事件流 INSERT + PaymentMade 核销 WHERE supplier_id）
ALTER TABLE erp.payables ADD COLUMN IF NOT EXISTS supplier_id UUID;
ALTER TABLE erp.payables ADD COLUMN IF NOT EXISTS source_order_id UUID;

-- C. erp.receivables: 补列（事件流 INSERT + PaymentReceived 核销 WHERE customer_id）
ALTER TABLE erp.receivables ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE erp.receivables ADD COLUMN IF NOT EXISTS source_order_id UUID;

-- D. erp.meeting_bookings: 补列 room_name（结构体 room_name: String 非 Option）
ALTER TABLE erp.meeting_bookings ADD COLUMN IF NOT EXISTS room_name VARCHAR(256) NOT NULL DEFAULT '';

-- E. erp.vehicle_requests: 补列
ALTER TABLE erp.vehicle_requests ADD COLUMN IF NOT EXISTS requester VARCHAR(128) NOT NULL DEFAULT '';
ALTER TABLE erp.vehicle_requests ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT '';
ALTER TABLE erp.vehicle_requests ADD COLUMN IF NOT EXISTS driver_required BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE erp.vehicle_requests ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

-- F. erp.erp_master_data_refs: 统一补 8 个生命周期列（全部可空）
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS archive_reason TEXT;
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS archived_by UUID;
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS destroy_reason TEXT;
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS destroy_scheduled_at TIMESTAMPTZ;
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS destroy_scheduled_by UUID;
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS destroyed_at TIMESTAMPTZ;
ALTER TABLE erp.erp_master_data_refs ADD COLUMN IF NOT EXISTS destroyed_by UUID;

-- G. 缺失表：均被 master_data_refs 路由实际调用（非 dead code），按代码列结构建表

-- G1. erp.erp_master_data_versions（master_data_version.rs）
CREATE TABLE IF NOT EXISTS erp.erp_master_data_versions (
    id UUID PRIMARY KEY,
    master_data_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    domain TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT,
    status TEXT NOT NULL,
    snapshot JSONB NOT NULL,
    changed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- G2. erp.erp_master_data_conflicts（master_data_conflict.rs）
CREATE TABLE IF NOT EXISTS erp.erp_master_data_conflicts (
    id UUID PRIMARY KEY,
    master_data_id TEXT NOT NULL,
    domain TEXT NOT NULL,
    conflict_type TEXT NOT NULL,
    field_name TEXT NOT NULL,
    local_value JSONB,
    remote_value JSONB,
    remote_service TEXT,
    status TEXT NOT NULL,
    merge_strategy TEXT NOT NULL,
    resolved_value JSONB,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT
);

-- G3. erp.erp_master_data_quality_rules（master_data_quality_rules.rs）
CREATE TABLE IF NOT EXISTS erp.erp_master_data_quality_rules (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    domain TEXT NOT NULL,
    field_name TEXT,
    rule_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- G4. erp.erp_master_data_quality_reports（master_data_quality_rules.rs 等）
CREATE TABLE IF NOT EXISTS erp.erp_master_data_quality_reports (
    id UUID PRIMARY KEY,
    domain TEXT NOT NULL,
    total_checked BIGINT NOT NULL,
    total_issues BIGINT NOT NULL,
    errors BIGINT NOT NULL,
    warnings BIGINT NOT NULL,
    info BIGINT NOT NULL,
    issues JSONB,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
