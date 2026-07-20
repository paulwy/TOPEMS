ALTER TABLE core_finance_vouchers
ADD COLUMN IF NOT EXISTS source_type VARCHAR(50);

ALTER TABLE core_finance_vouchers
ADD COLUMN IF NOT EXISTS source_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_voucher_source_unique
ON core_finance_vouchers(tenant_id, source_type, source_id)
WHERE source_type IS NOT NULL AND source_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_voucher_no_unique
ON core_finance_vouchers(tenant_id, voucher_no);
