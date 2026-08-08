-- V69.1 P3-3 Phase 2: Rename A-class company_id → org_id (9 tables)
-- These tables have redundant company_id alongside tenant_id/organization_id.
-- B-class tables (consolidation_scope_companies, internal_transactions,
-- company_relations) and C-class tables (opening_balances, bank_accounts)
-- are NOT affected — their company_id has legitimate business meaning.

-- PostgreSQL ALTER TABLE RENAME COLUMN automatically keeps FK constraints
-- and updates index definitions to reference the new column name.
-- Index NAMES are not auto-renamed; we rename them explicitly for clarity.

-- ============================================
-- Step 1: Drop UNIQUE constraint on financial_reports (will recreate after rename)
-- ============================================
ALTER TABLE financial_reports DROP CONSTRAINT IF EXISTS financial_reports_report_type_company_id_period_currency_code_key;

-- ============================================
-- Step 2: Rename columns (9 tables)
-- ============================================

-- Shared entity tables (public schema)
ALTER TABLE public.departments RENAME COLUMN company_id TO org_id;
ALTER TABLE public.employees RENAME COLUMN company_id TO org_id;

-- HRM tables (hrm schema)
ALTER TABLE hrm.departments RENAME COLUMN company_id TO org_id;
ALTER TABLE hrm.positions RENAME COLUMN company_id TO org_id;
ALTER TABLE hrm.employees RENAME COLUMN company_id TO org_id;

-- Plugin tables (plugin_erp, plugin_hrm schemas)
ALTER TABLE plugin_erp.assets RENAME COLUMN company_id TO org_id;
ALTER TABLE plugin_hrm.positions RENAME COLUMN company_id TO org_id;
ALTER TABLE plugin_hrm.attendance_records RENAME COLUMN company_id TO org_id;

-- Finance table
ALTER TABLE financial_reports RENAME COLUMN company_id TO org_id;

-- ============================================
-- Step 3: Rename indexes (explicit, since RENAME COLUMN doesn't rename indexes)
-- ============================================

-- public.departments — no dedicated company_id index in init script
-- public.employees — no dedicated company_id index in init script

-- hrm schema indexes
ALTER INDEX IF EXISTS idx_departments_company_id RENAME TO idx_departments_org_id;
ALTER INDEX IF EXISTS idx_positions_company_id RENAME TO idx_positions_org_id;

-- plugin_hrm indexes
ALTER INDEX IF EXISTS idx_hrm_positions_company_id RENAME TO idx_hrm_positions_org_id;

-- finance indexes
ALTER INDEX IF EXISTS idx_financial_reports_company_id RENAME TO idx_financial_reports_org_id;

-- ============================================
-- Step 4: Recreate UNIQUE constraint on financial_reports with new column name
-- ============================================
ALTER TABLE financial_reports
    ADD CONSTRAINT financial_reports_report_type_org_id_period_currency_code_key
    UNIQUE(report_type, org_id, period, currency_code);
