-- 2026-11-25 · finance.reconciliation_item_snapshots 列名归一
--
-- 为什么需要这条：
--   同一张表在仓库里有两条血缘
--     A) 生产基线 / anchor（database/baseline/anchors.json 的 prod schema）：recon_id, debit_amount, credit_amount
--     B) 早期迁移 20261007140000_align_stub_tables_handler_contract.sql 的 ALTER 契约：
--        reconciliation_id, item_type, amount, business_id, business_no, status, remark
--   「从 anchor + forward 建库」跑的是 A，且这条 ALTER 不会真的作用到该表（它的版本早已在账本里）；
--   「从迁移零建」跑的是 B。代码只有一套 SQL：
--   svc/finance/src/modules/settlement_center/service.rs 按 A 读写
--   （recon_id / debit_amount / credit_amount，自动对账按双列金额相等配对）。
--   于是 B 形态的库会在 POST .../auto-reconcile 上直接 500：
--   column ri.reconciliation_id does not exist（2026-11-25 19:29 UTC 实测）。
--
-- 本迁移把 B 形态补齐 A 列并回填，使两种库都能跑同一套代码。
-- 非破坏：只 ADD COLUMN / 回填，不删旧列、不改类型、不写 CHECK 约束。

ALTER TABLE finance.reconciliation_item_snapshots
    ADD COLUMN IF NOT EXISTS recon_id uuid,
    ADD COLUMN IF NOT EXISTS debit_amount double precision DEFAULT 0,
    ADD COLUMN IF NOT EXISTS credit_amount double precision DEFAULT 0,
    ADD COLUMN IF NOT EXISTS match_status varchar(50),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

DO $$
BEGIN
    -- 旧列 -> 新列：仅当旧列真的存在时才回填（A 形态的库这两个列不存在，跳过）
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'finance' AND table_name = 'reconciliation_item_snapshots'
           AND column_name = 'reconciliation_id'
    ) THEN
        EXECUTE 'UPDATE finance.reconciliation_item_snapshots
                    SET recon_id = reconciliation_id
                  WHERE recon_id IS NULL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'finance' AND table_name = 'reconciliation_item_snapshots'
           AND column_name = 'item_type'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'finance' AND table_name = 'reconciliation_item_snapshots'
           AND column_name = 'amount'
    ) THEN
        EXECUTE $sql$UPDATE finance.reconciliation_item_snapshots
                       SET debit_amount  = COALESCE(debit_amount, 0)
                                           + CASE WHEN lower(COALESCE(item_type, '')) IN ('debit', 'dr')  THEN COALESCE(amount, 0) ELSE 0 END,
                           credit_amount = COALESCE(credit_amount, 0)
                                           + CASE WHEN lower(COALESCE(item_type, '')) IN ('credit', 'cr') THEN COALESCE(amount, 0) ELSE 0 END
                     WHERE amount IS NOT NULL$sql$;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_finance_recon_item_snapshots_recon_id
    ON finance.reconciliation_item_snapshots (recon_id);
