-- 回滚 B256：移除 crm.customer_finance.risklevel 值集约束
--
-- 幂等：约束不存在则跳过。破坏性：仅 DROP 1 条 CHECK，无数据变更。

DO $$
BEGIN
    IF to_regclass('crm.customer_finance') IS NULL THEN
        RAISE NOTICE '跳过：crm.customer_finance 不存在';
        RETURN;
    END IF;
    ALTER TABLE crm.customer_finance
        DROP CONSTRAINT IF EXISTS crm_customer_finance_risklevel_check;
    RAISE NOTICE 'B256 回滚完成：risklevel 值集约束已移除';
END $$;
