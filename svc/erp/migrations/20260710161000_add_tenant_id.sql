-- TOPEMS ERP Service - Add tenant_id for multi-tenant support

-- ============================================
-- 1. ERP Assets
-- ============================================
ALTER TABLE IF EXISTS erp_assets ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_assets SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE erp_assets ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_assets_tenant_id ON erp_assets(tenant_id);

-- ============================================
-- 2. ERP Asset Categories
-- ============================================
ALTER TABLE IF EXISTS erp_asset_categories ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_asset_categories SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE erp_asset_categories ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_asset_categories_tenant_id ON erp_asset_categories(tenant_id);

-- ============================================
-- 3. ERP Asset Depreciation
-- ============================================
ALTER TABLE IF EXISTS erp_asset_depreciation ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_asset_depreciation ead SET tenant_id = (SELECT ea.tenant_id FROM erp_assets ea WHERE ea.id = ead.asset_id);
ALTER TABLE erp_asset_depreciation ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_asset_depreciation_tenant_id ON erp_asset_depreciation(tenant_id);

-- ============================================
-- 4. ERP Asset Transfers
-- ============================================
ALTER TABLE IF EXISTS erp_asset_transfers ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_asset_transfers eat SET tenant_id = (SELECT ea.tenant_id FROM erp_assets ea WHERE ea.id = eat.asset_id);
ALTER TABLE erp_asset_transfers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_asset_transfers_tenant_id ON erp_asset_transfers(tenant_id);

-- ============================================
-- 5. ERP Asset Disposals
-- ============================================
ALTER TABLE IF EXISTS erp_asset_disposals ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_asset_disposals ead SET tenant_id = (SELECT ea.tenant_id FROM erp_assets ea WHERE ea.id = ead.asset_id);
ALTER TABLE erp_asset_disposals ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_asset_disposals_tenant_id ON erp_asset_disposals(tenant_id);

-- ============================================
-- 6. ERP Asset Maintenance
-- ============================================
ALTER TABLE IF EXISTS erp_asset_maintenance ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_asset_maintenance eam SET tenant_id = (SELECT ea.tenant_id FROM erp_assets ea WHERE ea.id = eam.asset_id);
ALTER TABLE erp_asset_maintenance ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_asset_maintenance_tenant_id ON erp_asset_maintenance(tenant_id);

-- ============================================
-- 7. ERP Vouchers
-- ============================================
ALTER TABLE IF EXISTS erp_vouchers ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_vouchers SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE erp_vouchers ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_vouchers_tenant_id ON erp_vouchers(tenant_id);

-- ============================================
-- 8. ERP Voucher Items
-- ============================================
ALTER TABLE IF EXISTS erp_voucher_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_voucher_items evi SET tenant_id = (SELECT ev.tenant_id FROM erp_vouchers ev WHERE ev.id = evi.voucher_id);
ALTER TABLE erp_voucher_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_voucher_items_tenant_id ON erp_voucher_items(tenant_id);

-- ============================================
-- 9. ERP Voucher Templates
-- ============================================
ALTER TABLE IF EXISTS erp_voucher_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_voucher_templates SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE erp_voucher_templates ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_voucher_templates_tenant_id ON erp_voucher_templates(tenant_id);

-- ============================================
-- 10. ERP Financial Accounts
-- ============================================
ALTER TABLE IF EXISTS erp_financial_accounts ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_financial_accounts SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE erp_financial_accounts ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_financial_accounts_tenant_id ON erp_financial_accounts(tenant_id);

-- ============================================
-- 11. ERP Financial Transactions
-- ============================================
ALTER TABLE IF EXISTS erp_financial_transactions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_financial_transactions eft SET tenant_id = (SELECT efa.tenant_id FROM erp_financial_accounts efa WHERE efa.id = eft.account_id);
UPDATE erp_financial_transactions SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE erp_financial_transactions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_financial_transactions_tenant_id ON erp_financial_transactions(tenant_id);

-- ============================================
-- 12. ERP Financial Journals
-- ============================================
ALTER TABLE IF EXISTS erp_financial_journals ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_financial_journals SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE erp_financial_journals ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_financial_journals_tenant_id ON erp_financial_journals(tenant_id);

-- ============================================
-- 13. ERP Financial Periods
-- ============================================
ALTER TABLE IF EXISTS erp_financial_periods ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_financial_periods SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE erp_financial_periods ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_financial_periods_tenant_id ON erp_financial_periods(tenant_id);

-- ============================================
-- 14. ERP Audit Logs
-- ============================================
ALTER TABLE IF EXISTS erp_audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_audit_logs SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE erp_audit_logs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_audit_logs_tenant_id ON erp_audit_logs(tenant_id);

-- ============================================
-- 15. ERP Data Dictionary
-- ============================================
ALTER TABLE IF EXISTS erp_data_dictionary ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_data_dictionary SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE erp_data_dictionary ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_data_dictionary_tenant_id ON erp_data_dictionary(tenant_id);

-- ============================================
-- 16. ERP Tax Rates
-- ============================================
ALTER TABLE IF EXISTS erp_tax_rates ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_tax_rates SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE erp_tax_rates ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_tax_rates_tenant_id ON erp_tax_rates(tenant_id);

-- ============================================
-- 17. ERP Currency Rates
-- ============================================
ALTER TABLE IF EXISTS erp_currency_rates ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_currency_rates SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE erp_currency_rates ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_currency_rates_tenant_id ON erp_currency_rates(tenant_id);

-- ============================================
-- 18. ERP Bank Accounts
-- ============================================
ALTER TABLE IF EXISTS erp_bank_accounts ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE erp_bank_accounts SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE erp_bank_accounts ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_erp_bank_accounts_tenant_id ON erp_bank_accounts(tenant_id);

-- ============================================
-- Enable Row Level Security for all tables
-- ============================================
ALTER TABLE erp_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_asset_depreciation ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_asset_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_asset_disposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_asset_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_voucher_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_voucher_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_financial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_financial_journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_data_dictionary ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_currency_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp_bank_accounts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Create tenant isolation policies
-- ============================================
CREATE POLICY "erp_assets_tenant_isolation" ON erp_assets
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_asset_categories_tenant_isolation" ON erp_asset_categories
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_asset_depreciation_tenant_isolation" ON erp_asset_depreciation
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_asset_transfers_tenant_isolation" ON erp_asset_transfers
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_asset_disposals_tenant_isolation" ON erp_asset_disposals
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_asset_maintenance_tenant_isolation" ON erp_asset_maintenance
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_vouchers_tenant_isolation" ON erp_vouchers
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_voucher_items_tenant_isolation" ON erp_voucher_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_voucher_templates_tenant_isolation" ON erp_voucher_templates
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_financial_accounts_tenant_isolation" ON erp_financial_accounts
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_financial_transactions_tenant_isolation" ON erp_financial_transactions
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_financial_journals_tenant_isolation" ON erp_financial_journals
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_financial_periods_tenant_isolation" ON erp_financial_periods
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_audit_logs_tenant_isolation" ON erp_audit_logs
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_data_dictionary_tenant_isolation" ON erp_data_dictionary
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_tax_rates_tenant_isolation" ON erp_tax_rates
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_currency_rates_tenant_isolation" ON erp_currency_rates
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY "erp_bank_accounts_tenant_isolation" ON erp_bank_accounts
    USING (tenant_id = current_setting('app.tenant_id')::uuid);