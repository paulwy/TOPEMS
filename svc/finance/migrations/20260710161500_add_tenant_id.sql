-- Finance - 添加 tenant_id 支持

-- VoucherLine 表缺少 tenant_id
ALTER TABLE core_finance_voucher_lines ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_finance_voucher_lines SET tenant_id = (
    SELECT v.tenant_id FROM core_finance_vouchers v 
    WHERE v.id = core_finance_voucher_lines.voucher_id 
    LIMIT 1
) WHERE tenant_id IS NULL;
UPDATE core_finance_voucher_lines SET tenant_id = uuid_generate_v4() WHERE tenant_id IS NULL;
ALTER TABLE core_finance_voucher_lines ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_finance_voucher_lines_tenant_id ON core_finance_voucher_lines(tenant_id);

-- AuxLedgerEntry 表缺少 tenant_id
ALTER TABLE core_finance_aux_ledger_entries ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_finance_aux_ledger_entries SET tenant_id = (
    SELECT ab.tenant_id FROM core_finance_aux_balances ab 
    WHERE ab.account_id = core_finance_aux_ledger_entries.account_id 
    LIMIT 1
) WHERE tenant_id IS NULL;
UPDATE core_finance_aux_ledger_entries SET tenant_id = uuid_generate_v4() WHERE tenant_id IS NULL;
ALTER TABLE core_finance_aux_ledger_entries ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_finance_aux_ledger_entries_tenant_id ON core_finance_aux_ledger_entries(tenant_id);
