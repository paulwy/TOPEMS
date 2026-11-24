-- B256：crm.customer_finance.risklevel 值集收口（2026-11-24）
--
-- 背景：`FinanceRiskLevel`（low/medium/high/critical）是持久化枚举，但该列一直没有 CHECK，
--   非法值只在代码 `from_db_str` 里落空，DB 侧无护栏。候选 SQL 见
--   docs/database/crm-customer-finance-risklevel-check-candidates-2026-11-21.sql。
--
-- 本次：ADD CONSTRAINT ... NOT VALID + VALIDATE；已存在则跳过。
-- fail-closed：存在值集外的行则 RAISE EXCEPTION，先清洗再上约束。
-- 破坏性：仅 ADD/VALIDATE 1 条 CHECK，无数据变更。

DO $$
DECLARE
    n_bad bigint;
    exists_already boolean;
BEGIN
    IF to_regclass('crm.customer_finance') IS NULL THEN
        RAISE NOTICE '跳过：crm.customer_finance 不存在';
        RETURN;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'crm.customer_finance'::regclass
           AND conname = 'crm_customer_finance_risklevel_check'
    ) INTO exists_already;

    IF exists_already THEN
        RAISE NOTICE '跳过：约束 crm_customer_finance_risklevel_check 已存在';
        RETURN;
    END IF;

    EXECUTE 'SELECT count(*) FROM crm.customer_finance
              WHERE risklevel IS NOT NULL
                AND risklevel NOT IN (''low'',''medium'',''high'',''critical'')'
       INTO n_bad;

    IF n_bad > 0 THEN
        RAISE EXCEPTION 'B256 前置断言失败：% 行 risklevel 落在值集外', n_bad;
    END IF;

    ALTER TABLE crm.customer_finance
        ADD CONSTRAINT crm_customer_finance_risklevel_check
        CHECK (risklevel IN ('low', 'medium', 'high', 'critical')) NOT VALID;
    ALTER TABLE crm.customer_finance
        VALIDATE CONSTRAINT crm_customer_finance_risklevel_check;

    RAISE NOTICE 'B256 完成：risklevel 值集约束已建立并 VALIDATE';
END $$;
