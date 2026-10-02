-- U6（阶段2 金额精度 f64->Decimal 全链路）：
--   finance.source_amount_snapshots.payable_amount 原为 DOUBLE PRECISION（V254），
--   与自动凭证 core_finance_vouchers.total_debit/total_credit NUMERIC(18,4) 不一致。
--   Finance 事件处理器已改以 rust_decimal::Decimal 绑定金额列，此处把快照列对齐为 NUMERIC(18,4)，
--   消除 float8 存储导致的金额精度漂移。
--
-- 幂等：仅当列当前为 double precision 时才转型；空库重建链可重复执行。
ALTER TABLE IF EXISTS finance.source_amount_snapshots
    ALTER COLUMN payable_amount TYPE NUMERIC(18,4)
    USING payable_amount::NUMERIC(18,4);
