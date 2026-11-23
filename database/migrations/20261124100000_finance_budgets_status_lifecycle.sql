-- B251 回迁：finance.budgets.status 五态 + exhausted 金额联动（2026-11-24）
--
-- 背景：本地库已按候选 SQL 应用 ck_budgets_status_lifecycle_standard，替换旧模板约束
--       ck_budgets_status_standard（active/inactive/archived）。本文件把同一变更固化为
--       可复现迁移，供参考库 / 新环境 / 生产按序应用；原「仅本地库 + 候选 SQL」的漂移由此收口。
--
-- 值集口径：active / inactive / frozen / exhausted / archived（五态运营态）。
--   - 五态可互调，唯一限制：archived 只能恢复为 active（业务规则由
--     svc/finance BudgetStatus::can_transition 执行，CHECK 无法表达跨态迁移）。
--   - exhausted 与金额联动：额度耗尽态要求 remaining_amount <= 0，防止状态与金额漂移。
--
-- NULL 口径：status 在基线/参考库均为 NOT NULL DEFAULT 'active'；若历史库存在 NULL，
--   `status::text = ANY(...)` 对 NULL 求值为 unknown，CHECK 视为通过，不因此阻断回迁。
--   本迁移不改列可空性（不匿改历史数据）。
--
-- 幂等：旧约束按名存在性守卫 DROP；新约束按 conname + relid 判断后 ADD NOT VALID；
--       约束已存在但未验证时执行 VALIDATE。重复执行安全。
-- 破坏性：仅 DROP 1 条旧 CHECK、ADD/VALIDATE 2 条 CHECK；无 UPDATE / DELETE / TRUNCATE /
--       DROP TABLE / DROP COLUMN，不改行数据。

ALTER TABLE IF EXISTS finance.budgets
    DROP CONSTRAINT IF EXISTS ck_budgets_status_standard;

DO $$
BEGIN
    IF to_regclass('finance.budgets') IS NULL THEN
        RAISE NOTICE 'finance.budgets 不存在，跳过 B251 约束回迁';
        RETURN;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'finance.budgets'::regclass
          AND conname = 'ck_budgets_status_lifecycle_standard'
    ) THEN
        ALTER TABLE finance.budgets
            ADD CONSTRAINT ck_budgets_status_lifecycle_standard
            CHECK (
                (status)::text = ANY (
                    ARRAY['active'::text, 'inactive'::text, 'frozen'::text, 'exhausted'::text, 'archived'::text]
                )
            ) NOT VALID;
        RAISE NOTICE '已新增 ck_budgets_status_lifecycle_standard（NOT VALID）';
    ELSE
        RAISE NOTICE 'ck_budgets_status_lifecycle_standard 已存在，跳过新增';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'finance.budgets'::regclass
          AND conname = 'ck_budgets_exhausted_requires_depleted_budget'
    ) THEN
        ALTER TABLE finance.budgets
            ADD CONSTRAINT ck_budgets_exhausted_requires_depleted_budget
            CHECK (status IS DISTINCT FROM 'exhausted' OR remaining_amount <= 0) NOT VALID;
        RAISE NOTICE '已新增 ck_budgets_exhausted_requires_depleted_budget（NOT VALID）';
    ELSE
        RAISE NOTICE 'ck_budgets_exhausted_requires_depleted_budget 已存在，跳过新增';
    END IF;

    -- 值集扩容方向是旧集的超集，存量行必然满足；小表（百量级）立即验证，避免长期挂 NOT VALID。
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'finance.budgets'::regclass
          AND conname = 'ck_budgets_status_lifecycle_standard'
          AND NOT convalidated
    ) THEN
        ALTER TABLE finance.budgets
            VALIDATE CONSTRAINT ck_budgets_status_lifecycle_standard;
        RAISE NOTICE 'ck_budgets_status_lifecycle_standard 已验证';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'finance.budgets'::regclass
          AND conname = 'ck_budgets_exhausted_requires_depleted_budget'
          AND NOT convalidated
    ) THEN
        ALTER TABLE finance.budgets
            VALIDATE CONSTRAINT ck_budgets_exhausted_requires_depleted_budget;
        RAISE NOTICE 'ck_budgets_exhausted_requires_depleted_budget 已验证';
    END IF;
END $$;
