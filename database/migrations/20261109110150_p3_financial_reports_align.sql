-- P3 前置对齐：finance.financial_reports 补齐代码依赖列与唯一键
--
-- 背景：生产该表仍是 10 列旧形状（仅 id/tenant_id/report_type/name/period/status/data/时间戳），
--       而 P3 报表落库（svc/finance/src/modules/financial_reports.rs upsert_report）依赖：
--       org_id / company_id / currency_code / approval_status / generated_by / generated_at /
--       approved_by / approved_at / approval_comment / rejection_reason / compare_period，
--       并以 ON CONFLICT (report_type, org_id, period, currency_code) 做幂等写入。
--       20261109110200 的 org_id 回填也要求本列已存在，故本迁移版本必须小于 20261109110200。
--
-- 语义约定（与代码一致）：
--   org_id 承接公司维度——代码写入时 org_id = company_id；历史行由 20261109110200
--   在补齐 company_id 后执行 `UPDATE ... SET org_id = company_id`。
--   本迁移只建列/约束/NOT NULL，不做数据回填，避免与 20261109110200 的口径分叉。
--
-- 安全前提：本迁移只在「表 0 行」时收紧 NOT NULL；有数据则 RAISE，交人工评估。
-- 幂等：全部 ADD COLUMN IF NOT EXISTS / 存在性守卫 / 约束存在性守卫。
--
-- ROLLBACK（人工评估后执行）：
--   ALTER TABLE finance.financial_reports
--     DROP CONSTRAINT IF EXISTS financial_reports_report_type_org_id_period_currency_code_key;
--   ALTER TABLE finance.financial_reports
--     DROP COLUMN IF EXISTS org_id, DROP COLUMN IF EXISTS company_id,
--     DROP COLUMN IF EXISTS compare_period, DROP COLUMN IF EXISTS currency_code,
--     DROP COLUMN IF EXISTS approval_status, DROP COLUMN IF EXISTS rejection_reason,
--     DROP COLUMN IF EXISTS approval_comment, DROP COLUMN IF EXISTS generated_by,
--     DROP COLUMN IF EXISTS approved_by, DROP COLUMN IF EXISTS generated_at,
--     DROP COLUMN IF EXISTS approved_at;

-- Step 1: 补列（类型与本地/代码一致）
ALTER TABLE finance.financial_reports ADD COLUMN IF NOT EXISTS org_id uuid;
ALTER TABLE finance.financial_reports ADD COLUMN IF NOT EXISTS company_id uuid;
ALTER TABLE finance.financial_reports ADD COLUMN IF NOT EXISTS compare_period varchar(16);
ALTER TABLE finance.financial_reports ADD COLUMN IF NOT EXISTS currency_code varchar(8) DEFAULT 'CNY';
ALTER TABLE finance.financial_reports ADD COLUMN IF NOT EXISTS approval_status varchar(32) NOT NULL DEFAULT 'draft';
ALTER TABLE finance.financial_reports ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE finance.financial_reports ADD COLUMN IF NOT EXISTS approval_comment text;
ALTER TABLE finance.financial_reports ADD COLUMN IF NOT EXISTS generated_by varchar(128);
ALTER TABLE finance.financial_reports ADD COLUMN IF NOT EXISTS approved_by varchar(128);
ALTER TABLE finance.financial_reports ADD COLUMN IF NOT EXISTS generated_at timestamptz;
ALTER TABLE finance.financial_reports ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Step 2: 唯一键（代码 ON CONFLICT 目标；已存在则跳过）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'financial_reports_report_type_org_id_period_currency_code_key'
          AND conrelid = 'finance.financial_reports'::regclass
    ) THEN
        ALTER TABLE finance.financial_reports
            ADD CONSTRAINT financial_reports_report_type_org_id_period_currency_code_key
            UNIQUE (report_type, org_id, period, currency_code);
    END IF;
END $$;

-- Step 3: NOT NULL / 默认值收紧（仅空表；有数据直接失败交人工）
DO $$
DECLARE
    n bigint;
BEGIN
    SELECT count(*) INTO n FROM finance.financial_reports;
    IF n > 0 THEN
        RAISE EXCEPTION
            'P3 报表结构对齐：finance.financial_reports 有 % 行数据，NOT NULL 收紧需人工评估后单独执行', n;
    END IF;

    ALTER TABLE finance.financial_reports ALTER COLUMN report_type SET NOT NULL;
    ALTER TABLE finance.financial_reports ALTER COLUMN period SET NOT NULL;
    ALTER TABLE finance.financial_reports ALTER COLUMN status SET DEFAULT 'draft';
    ALTER TABLE finance.financial_reports ALTER COLUMN status SET NOT NULL;
    ALTER TABLE finance.financial_reports ALTER COLUMN approval_status SET DEFAULT 'draft';
    ALTER TABLE finance.financial_reports ALTER COLUMN approval_status SET NOT NULL;
    ALTER TABLE finance.financial_reports ALTER COLUMN data SET DEFAULT '{}'::jsonb;
    ALTER TABLE finance.financial_reports ALTER COLUMN data SET NOT NULL;
    ALTER TABLE finance.financial_reports ALTER COLUMN created_at SET DEFAULT now();
    ALTER TABLE finance.financial_reports ALTER COLUMN created_at SET NOT NULL;
    ALTER TABLE finance.financial_reports ALTER COLUMN updated_at SET DEFAULT now();
    ALTER TABLE finance.financial_reports ALTER COLUMN updated_at SET NOT NULL;
END $$;
