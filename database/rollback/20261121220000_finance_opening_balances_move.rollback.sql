-- 回滚 20261121220000_finance_opening_balances_move.sql（W2-C1..C3）
--
-- 本迁移把 erp.opening_balances 整体迁入 finance schema，仅做 SET SCHEMA。
-- 回滚把表移回 erp；数据、索引、约束、RLS 策略随表一并回退，不删除数据。
-- 回滚前需同时回滚代码，否则 finance 会找不到 finance.opening_balances。

DO $$
BEGIN
    IF to_regclass('erp.opening_balances') IS NOT NULL
       AND to_regclass('finance.opening_balances') IS NOT NULL THEN
        RAISE EXCEPTION
            '20261121220000 ROLLBACK ABORT: erp/finance 两表同时存在，需人工裁决';
    END IF;

    IF to_regclass('finance.opening_balances') IS NOT NULL THEN
        ALTER TABLE finance.opening_balances SET SCHEMA erp;
        RAISE NOTICE '20261121220000 ROLLBACK: finance.opening_balances -> erp.opening_balances';
    END IF;
END $$;
