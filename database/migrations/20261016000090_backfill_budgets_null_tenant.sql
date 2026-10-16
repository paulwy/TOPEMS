-- 回填 finance.budgets 61 行历史 NULL tenant_id 归主租户 0001
-- 背景：批3 finance 读路径核查发现 budgets 61 行 tenant_id IS NULL（2026-10-05~15 创建的空壳测试预算，
--       budget_type 空 / fiscal_year 0 / total_budget 0），与 88 批（srm/hrm/mobile）同口径归主租户。
-- 注：budgets 表有 RLS FORCE；UPDATE 前 SET app.tenant_id=nil（policy nil 分支放行，供迁移路径使用）。

SET app.tenant_id = '00000000-0000-0000-0000-000000000000';

UPDATE finance.budgets
   SET tenant_id = '00000000-0000-0000-0000-000000000001'
 WHERE tenant_id IS NULL;

-- final assert: budgets 无 NULL tenant_id 残留
DO $$
DECLARE n bigint;
BEGIN
    SELECT count(*) INTO n FROM finance.budgets WHERE tenant_id IS NULL;
    IF n > 0 THEN RAISE EXCEPTION 'unbackfilled NULLs in finance.budgets: %', n; END IF;
END $$;

RESET app.tenant_id;
