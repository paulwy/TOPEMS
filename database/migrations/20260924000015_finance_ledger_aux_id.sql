-- finance aux-balance 端点 bug 修复：
-- get_aux_balance / get_aux_ledger 查询 JOIN finance.core_finance_ledger l ON la.id = l.aux_id
-- 但 ledger 无 aux_id 列 → 运行时 500（column l.aux_id does not exist）。
-- 修复：幂等补列（查询逻辑所需的辅助核算维度；写入侧 aux 记账链路见遗留说明）。
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='finance' AND table_name='core_finance_ledger'
                     AND column_name='aux_id') THEN
        ALTER TABLE finance.core_finance_ledger ADD COLUMN aux_id uuid;
        CREATE INDEX IF NOT EXISTS idx_ledger_aux_id ON finance.core_finance_ledger(aux_id);
    END IF;
END $$;
