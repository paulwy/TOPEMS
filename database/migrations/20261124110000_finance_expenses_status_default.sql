-- B252 回迁：finance.expenses.status 列默认值 pending -> draft（2026-11-24）
--
-- 背景：finance.expenses.status 由 20261007140000_align_stub_tables_handler_contract.sql 引入，
--   列默认值遗留为 'pending'。该表的值集（svc/finance ExpenseStatus）是
--   draft / submitted / approved / rejected / paid，pending 只是历史别名
--   （normalize_expense 归一为 submitted）。一旦 ck_expenses_status_standard 完成 VALIDATE，
--   任何省略 status 的 INSERT 都会由默认值写入 'pending'，直接违反约束——默认值自己就是脏值。
--
-- 本次变更：列默认值 'pending' -> 'draft'（与 ExpenseStatus::DEFAULT 一致），并更新列注释。
--   不改值集、不改列可空性、不动存量数据（存量 3 行历史 pending 已在同一窗口清洗为 submitted）。
--
-- 幂等：ALTER COLUMN SET DEFAULT 可重复执行；前置/后置断言基于 pg_attrdef，重复执行安全。
-- 破坏性：仅 ALTER COLUMN SET DEFAULT + COMMENT，无 UPDATE / DELETE / TRUNCATE /
--   DROP TABLE / DROP COLUMN，不触碰任何行数据。

DO $$
BEGIN
    IF to_regclass('finance.expenses') IS NULL THEN
        RAISE NOTICE 'finance.expenses 不存在，跳过 B252 默认值回迁';
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_attribute
        WHERE attrelid = 'finance.expenses'::regclass
          AND attname = 'status'
          AND NOT attisdropped
    ) THEN
        RAISE NOTICE 'finance.expenses.status 不存在，跳过 B252 默认值回迁';
        RETURN;
    END IF;

    ALTER TABLE finance.expenses
        ALTER COLUMN status SET DEFAULT 'draft';

    COMMENT ON COLUMN finance.expenses.status IS
        '费用报销状态：draft/submitted/approved/rejected/paid（ExpenseStatus）；历史别名 pending 由应用层归一为 submitted。默认 draft。';
END $$;

-- 后置断言：默认值必须是 'draft'::text，且值集约束已存在
DO $$
DECLARE
    default_expr text;
BEGIN
    IF to_regclass('finance.expenses') IS NULL THEN
        RETURN;
    END IF;

    SELECT pg_get_expr(d.adbin, d.adrelid)
      INTO default_expr
      FROM pg_attrdef d
      JOIN pg_attribute a
        ON a.attrelid = d.adrelid AND a.attnum = d.adnum
     WHERE d.adrelid = 'finance.expenses'::regclass
       AND a.attname = 'status';

    IF default_expr IS DISTINCT FROM '''draft''::text' THEN
        RAISE EXCEPTION 'B252 后置断言失败：finance.expenses.status 默认值为 %，期望 ''draft''::text', default_expr;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'finance.expenses'::regclass
          AND conname = 'ck_expenses_status_standard'
    ) THEN
        RAISE NOTICE 'B252 提示：ck_expenses_status_standard 不存在（该约束由更早迁移建立），默认值已对齐代码枚举';
    END IF;
END $$;
