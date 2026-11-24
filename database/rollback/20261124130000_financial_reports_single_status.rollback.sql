-- 回滚 B255：恢复 approval_status 列与双列同值不变量
--
-- 幂等：列已存在则跳过。
-- 破坏性：ADD COLUMN + 回填 UPDATE（approval_status := status，仅新列）+ 2 条 CHECK。
-- 注意：回滚后代码仍只写 status，approval_status 会由列默认值 'draft' 落库，
--   若 status != 'draft' 会立刻违反 ck_financial_reports_status_pair；
--   因此回滚只应在“代码同步回退到双写版本”时使用。

DO $$
BEGIN
    IF to_regclass('finance.financial_reports') IS NULL THEN
        RAISE NOTICE '跳过：finance.financial_reports 不存在';
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'finance' AND table_name = 'financial_reports'
           AND column_name = 'approval_status'
    ) THEN
        RAISE NOTICE '跳过：approval_status 列已存在';
        RETURN;
    END IF;

    ALTER TABLE finance.financial_reports
        ADD COLUMN approval_status varchar(32) NOT NULL DEFAULT 'draft';
    UPDATE finance.financial_reports SET approval_status = status;

    ALTER TABLE finance.financial_reports
        ADD CONSTRAINT ck_financial_reports_approval_status_standard
        CHECK ((approval_status)::text = ANY (ARRAY['draft','pending','approved','rejected','locked']::text[])) NOT VALID;
    ALTER TABLE finance.financial_reports
        VALIDATE CONSTRAINT ck_financial_reports_approval_status_standard;

    ALTER TABLE finance.financial_reports
        ADD CONSTRAINT ck_financial_reports_status_pair
        CHECK ((status)::text = (approval_status)::text) NOT VALID;
    ALTER TABLE finance.financial_reports
        VALIDATE CONSTRAINT ck_financial_reports_status_pair;

    RAISE NOTICE 'B255 回滚完成：approval_status 列与不变量已恢复';
END $$;
