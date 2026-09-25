-- ============================================================
-- Migration: finance + integration SQL column drift fixes
-- Date: 2026-09-23
-- Description:
--   C. reconciliation_snapshots: add 7 missing columns
--   D. settlement_snapshots: add 2 missing columns
--   E. crm_erp_sync: add 6 missing columns
--   F. erp_wms_sync: add 8 missing columns
--   G. hrm_finance_sync: add 4 missing columns
--   H. mes_qms_sync: add tenant_id
--   A, B, I are code-only fixes (column renames already in table)
-- ============================================================

-- C. finance.reconciliation_snapshots: 补列 7 列
ALTER TABLE IF EXISTS finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE IF EXISTS finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS difference NUMERIC;
ALTER TABLE IF EXISTS finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS matched_count INTEGER;
ALTER TABLE IF EXISTS finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS total_credit NUMERIC;
ALTER TABLE IF EXISTS finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS total_debit NUMERIC;
ALTER TABLE IF EXISTS finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS unmatched_count INTEGER;

-- D. finance.settlement_snapshots: 补列 2 列
ALTER TABLE IF EXISTS finance.settlement_snapshots ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS finance.settlement_snapshots ADD COLUMN IF NOT EXISTS approved_by UUID;

-- E. integration.crm_erp_sync: 补列 6 列
ALTER TABLE IF EXISTS integration.crm_erp_sync ADD COLUMN IF NOT EXISTS crm_contact_id UUID;
ALTER TABLE IF EXISTS integration.crm_erp_sync ADD COLUMN IF NOT EXISTS crm_customer_id UUID;
ALTER TABLE IF EXISTS integration.crm_erp_sync ADD COLUMN IF NOT EXISTS customer_name VARCHAR(256);
ALTER TABLE IF EXISTS integration.crm_erp_sync ADD COLUMN IF NOT EXISTS erp_contact_id UUID;
ALTER TABLE IF EXISTS integration.crm_erp_sync ADD COLUMN IF NOT EXISTS erp_customer_id UUID;
ALTER TABLE IF EXISTS integration.crm_erp_sync ADD COLUMN IF NOT EXISTS erp_order_id UUID;

-- F. integration.erp_wms_sync: 补列 8 列
ALTER TABLE IF EXISTS integration.erp_wms_sync ADD COLUMN IF NOT EXISTS erp_inventory_id UUID;
ALTER TABLE IF EXISTS integration.erp_wms_sync ADD COLUMN IF NOT EXISTS erp_order_id UUID;
ALTER TABLE IF EXISTS integration.erp_wms_sync ADD COLUMN IF NOT EXISTS location_code VARCHAR(64);
ALTER TABLE IF EXISTS integration.erp_wms_sync ADD COLUMN IF NOT EXISTS order_no VARCHAR(64);
ALTER TABLE IF EXISTS integration.erp_wms_sync ADD COLUMN IF NOT EXISTS product_code VARCHAR(64);
ALTER TABLE IF EXISTS integration.erp_wms_sync ADD COLUMN IF NOT EXISTS quantity NUMERIC;
ALTER TABLE IF EXISTS integration.erp_wms_sync ADD COLUMN IF NOT EXISTS warehouse_code VARCHAR(64);
ALTER TABLE IF EXISTS integration.erp_wms_sync ADD COLUMN IF NOT EXISTS wms_location_id UUID;

-- G. integration.hrm_finance_sync: 补列 4 列
ALTER TABLE IF EXISTS integration.hrm_finance_sync ADD COLUMN IF NOT EXISTS employee_code VARCHAR(64);
ALTER TABLE IF EXISTS integration.hrm_finance_sync ADD COLUMN IF NOT EXISTS employee_name VARCHAR(256);
ALTER TABLE IF EXISTS integration.hrm_finance_sync ADD COLUMN IF NOT EXISTS hrm_payroll_id UUID;
ALTER TABLE IF EXISTS integration.hrm_finance_sync ADD COLUMN IF NOT EXISTS pay_period VARCHAR(32);

-- H. integration.mes_qms_sync: 补列 tenant_id UUID NOT NULL
ALTER TABLE IF EXISTS integration.mes_qms_sync ADD COLUMN IF NOT EXISTS tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
