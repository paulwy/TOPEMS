-- V69.1 P3-3 Phase 1: Add tenant_id to 12 ERP dot-notation schema tables
-- These tables were missed by the original 20260710160000_add_tenant_id.sql
-- which only covered underscore-named tables (erp_assets, erp_vouchers, etc.)

-- Backfill strategy:
--   1. Tables with company_id → JOIN public.companies for real tenant_id
--   2. Tables with parent FK → JOIN parent table's tenant_id
--   3. Fallback → gen_random_uuid() (same as existing underscore-table pattern)

-- ============================================
-- Step 1: Add tenant_id column (nullable, with DEFAULT for INSERT safety) to all 12 tables
-- DEFAULT gen_random_uuid() ensures existing INSERT statements that don't specify
-- tenant_id will still succeed (prevents NOT NULL constraint violations).
-- Future handler updates should pass tenant_id from Claims for real isolation.
-- ============================================
ALTER TABLE IF EXISTS erp.consolidation_scopes ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS erp.consolidation_scope_companies ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS erp.elimination_rules ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS erp.internal_transactions ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS erp.consolidation_reports ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS erp.consolidation_report_lines ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS erp.company_relations ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS erp.opening_balances ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS erp.fixed_assets ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS erp.asset_depreciation_records ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS erp.bank_accounts ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();
ALTER TABLE IF EXISTS erp.bank_transactions ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();

-- ============================================
-- Step 2: Backfill from company_id via public.companies
-- ============================================
UPDATE erp.consolidation_scope_companies sc
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE sc.company_id = c.id AND sc.tenant_id IS NULL;

UPDATE erp.opening_balances ob
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE ob.company_id = c.id AND ob.tenant_id IS NULL;

UPDATE erp.bank_accounts ba
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE ba.company_id = c.id AND ba.tenant_id IS NULL;

-- ============================================
-- Step 3: Backfill from parent table's tenant_id
-- ============================================

-- consolidation_scopes: derive from scope_companies (parent company)
UPDATE erp.consolidation_scopes s
SET tenant_id = sc.tenant_id
FROM erp.consolidation_scope_companies sc
WHERE sc.scope_id = s.id AND sc.is_parent = true AND s.tenant_id IS NULL;

-- consolidation_reports: derive from scope
UPDATE erp.consolidation_reports r
SET tenant_id = s.tenant_id
FROM erp.consolidation_scopes s
WHERE r.scope_id = s.id AND r.tenant_id IS NULL;

-- consolidation_report_lines: derive from report
UPDATE erp.consolidation_report_lines rl
SET tenant_id = r.tenant_id
FROM erp.consolidation_reports r
WHERE rl.report_id = r.id AND rl.tenant_id IS NULL;

-- elimination_rules: derive from scope
UPDATE erp.elimination_rules er
SET tenant_id = s.tenant_id
FROM erp.consolidation_scopes s
WHERE er.scope_id = s.id AND er.tenant_id IS NULL;

-- internal_transactions: derive from from_company_id via companies
UPDATE erp.internal_transactions it
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE it.from_company_id = c.id AND it.tenant_id IS NULL;

-- company_relations: derive from parent_company_id via companies
UPDATE erp.company_relations cr
SET tenant_id = c.tenant_id
FROM public.companies c
WHERE cr.parent_company_id = c.id AND cr.tenant_id IS NULL;

-- bank_transactions: derive from bank_accounts
UPDATE erp.bank_transactions bt
SET tenant_id = ba.tenant_id
FROM erp.bank_accounts ba
WHERE bt.account_id = ba.id AND bt.tenant_id IS NULL;

-- asset_depreciation_records: derive from fixed_assets
UPDATE erp.asset_depreciation_records adr
SET tenant_id = fa.tenant_id
FROM erp.fixed_assets fa
WHERE adr.asset_id = fa.id AND adr.tenant_id IS NULL;

-- ============================================
-- Step 4: Fallback — gen_random_uuid() for remaining NULLs
-- (same pattern as existing 20260710160000_add_tenant_id.sql)
-- ============================================
UPDATE erp.consolidation_scopes SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
UPDATE erp.consolidation_scope_companies SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
UPDATE erp.elimination_rules SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
UPDATE erp.internal_transactions SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
UPDATE erp.consolidation_reports SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
UPDATE erp.consolidation_report_lines SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
UPDATE erp.company_relations SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
UPDATE erp.opening_balances SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
UPDATE erp.fixed_assets SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
UPDATE erp.asset_depreciation_records SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
UPDATE erp.bank_accounts SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
UPDATE erp.bank_transactions SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;

-- ============================================
-- Step 5: Set NOT NULL
-- ============================================
ALTER TABLE erp.consolidation_scopes ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE erp.consolidation_scope_companies ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE erp.elimination_rules ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE erp.internal_transactions ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE erp.consolidation_reports ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE erp.consolidation_report_lines ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE erp.company_relations ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE erp.opening_balances ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE erp.fixed_assets ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE erp.asset_depreciation_records ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE erp.bank_accounts ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE erp.bank_transactions ALTER COLUMN tenant_id SET NOT NULL;

-- ============================================
-- Step 6: Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_consolidation_scopes_tenant_id ON erp.consolidation_scopes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consolidation_scope_companies_tenant_id ON erp.consolidation_scope_companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_elimination_rules_tenant_id ON erp.elimination_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_internal_transactions_tenant_id ON erp.internal_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consolidation_reports_tenant_id ON erp.consolidation_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consolidation_report_lines_tenant_id ON erp.consolidation_report_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_relations_tenant_id ON erp.company_relations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opening_balances_tenant_id ON erp.opening_balances(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fixed_assets_tenant_id ON erp.fixed_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_depreciation_records_tenant_id ON erp.asset_depreciation_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant_id ON erp.bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_tenant_id ON erp.bank_transactions(tenant_id);
