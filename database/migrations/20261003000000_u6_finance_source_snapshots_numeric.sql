-- U6（阶段2 金额精度 f64->Decimal 全链路）：
--   finance.source_amount_snapshots.payable_amount 原为 DOUBLE PRECISION（V254），
--   与自动凭证 core_finance_vouchers.total_debit/total_credit NUMERIC(18,4) 不一致。
--   Finance 事件处理器已改以 rust_decimal::Decimal 绑定金额列，此处把快照列对齐为 NUMERIC(18,4)，
--   消除 float8 存储导致的金额精度漂移。
--
-- 幂等：仅当列存在且当前为 double precision 时才转型；空库重建链可重复执行。
-- 注意：finance.source_amount_snapshots 在 business_base_tables 仅为骨架空壳
-- （仅 id/deleted_at），U6 的 payable_amount 列由 R-8（20261003000005）在正确
-- 位置补齐——U6 在空库重建链中对空壳列执行 ALTER 会 column does not exist，
-- 故此处列不存在时静默跳过（对齐语义由 R-8 达成）。
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'finance' AND table_name = 'source_amount_snapshots'
      AND column_name = 'payable_amount' AND data_type = 'double precision'
  ) THEN
    ALTER TABLE finance.source_amount_snapshots
        ALTER COLUMN payable_amount TYPE NUMERIC(18,4)
        USING payable_amount::NUMERIC(18,4);
  END IF;
END $$;
