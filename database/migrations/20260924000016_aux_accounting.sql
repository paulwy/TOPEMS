-- 辅助核算记账功能（创建 aux 凭证 → 写 aux_balances → 余额报表有数）：
-- 1. voucher_lines 增加辅助核算维度列（aux_type/aux_id）
-- 2. aux_balances 增加唯一约束（upsert 累加余额用）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='finance' AND table_name='core_finance_voucher_lines'
                     AND column_name='aux_type') THEN
        ALTER TABLE finance.core_finance_voucher_lines ADD COLUMN aux_type text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='finance' AND table_name='core_finance_voucher_lines'
                     AND column_name='aux_id') THEN
        ALTER TABLE finance.core_finance_voucher_lines ADD COLUMN aux_id uuid;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint
                   WHERE conname='uq_aux_balance' AND connamespace = 'finance'::regnamespace) THEN
        ALTER TABLE finance.core_finance_aux_balances
            ADD CONSTRAINT uq_aux_balance UNIQUE (tenant_id, account_id, aux_type, aux_id, period);
    END IF;
END $$;
