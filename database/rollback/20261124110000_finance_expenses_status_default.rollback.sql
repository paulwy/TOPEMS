-- 回滚 B252：finance.expenses.status 默认值 draft -> pending（历史原状）
--
-- 风险：回滚后默认值重新变成 'pending'，而 'pending' 不在 ck_expenses_status_standard 值集内。
--   若约束保持 VALIDATE 状态，任何省略 status 的 INSERT 都会被拒绝——回滚应仅用于
--   “约束也回到 NOT VALID”的成对回退场景。
-- 幂等：可重复执行；表/列不存在时跳过。
-- 破坏性：仅 ALTER COLUMN SET DEFAULT + COMMENT，不动行数据。

DO $$
BEGIN
    IF to_regclass('finance.expenses') IS NULL THEN
        RAISE NOTICE 'finance.expenses 不存在，跳过 B252 回滚';
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_attribute
        WHERE attrelid = 'finance.expenses'::regclass AND attname = 'status' AND NOT attisdropped
    ) THEN
        RAISE NOTICE 'finance.expenses.status 不存在，跳过 B252 回滚';
        RETURN;
    END IF;

    ALTER TABLE finance.expenses ALTER COLUMN status SET DEFAULT 'pending';
END $$;
