-- B251 回滚：撤销 finance.budgets 五态约束与 exhausted 金额联动（2026-11-24）
--
-- 语义：退回旧模板约束 ck_budgets_status_standard（active/inactive/archived）。
--      旧约束以 NOT VALID 加回：存量若已有 frozen/exhausted 行不会阻断回滚，
--      但回滚后这两类值的新写入会被拒绝（业务侧须同步回退 BudgetStatus 枚举）。
-- 幂等：按 conname + relid 判断后 DROP/ADD；重复执行安全。

DO $$
BEGIN
    IF to_regclass('finance.budgets') IS NULL THEN
        RAISE NOTICE 'finance.budgets 不存在，无需回滚';
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'finance.budgets'::regclass
          AND conname = 'ck_budgets_exhausted_requires_depleted_budget'
    ) THEN
        ALTER TABLE finance.budgets
            DROP CONSTRAINT ck_budgets_exhausted_requires_depleted_budget;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'finance.budgets'::regclass
          AND conname = 'ck_budgets_status_lifecycle_standard'
    ) THEN
        ALTER TABLE finance.budgets
            DROP CONSTRAINT ck_budgets_status_lifecycle_standard;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'finance.budgets'::regclass
          AND conname = 'ck_budgets_status_standard'
    ) THEN
        ALTER TABLE finance.budgets
            ADD CONSTRAINT ck_budgets_status_standard
            CHECK (
                (status)::text = ANY (
                    ARRAY['active'::text, 'inactive'::text, 'archived'::text]
                )
            ) NOT VALID;
    END IF;
END $$;
