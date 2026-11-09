-- P3 第二批：报表行映射表补 section / include_unclosed_pl
--
-- section：资产 / 负债 / 权益 / 收入 / 费用，供报表分区与勾稽使用，避免代码里按排序号猜分区。
-- include_unclosed_pl：该行是否吸收「尚未结转到本年利润的损益净额」。
--   会计准则下资产负债表「本年利润」行应包含本年已结转 + 未结转损益，
--   否则未做月结时资产 = 负债 + 权益 必然不平。
--
-- ROLLBACK（人工评估后执行）：
--   ALTER TABLE finance.core_finance_report_line_map DROP COLUMN IF EXISTS include_unclosed_pl;
--   ALTER TABLE finance.core_finance_report_line_map DROP COLUMN IF EXISTS section;

ALTER TABLE finance.core_finance_report_line_map
    ADD COLUMN IF NOT EXISTS section varchar(16);

ALTER TABLE finance.core_finance_report_line_map
    ADD COLUMN IF NOT EXISTS include_unclosed_pl boolean NOT NULL DEFAULT false;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 回填映射行分区，按报表类型与既有排序号推导（资产1-11/负债20-27/权益30+）
-- destructive-owner: finance
-- destructive-ticket: P3-BATCH2-LINE-SECTION
-- destructive-expires: 2027-03-31
-- destructive-max-rows: 10000
-- destructive-backup: 迁移前 pg_dump -t finance.core_finance_report_line_map
UPDATE finance.core_finance_report_line_map
SET section = CASE
        WHEN report_type = 'income_statement' AND direction = 'credit' THEN 'income'
        WHEN report_type = 'income_statement' THEN 'expense'
        WHEN sort_no < 20 THEN 'asset'
        WHEN sort_no < 30 THEN 'liability'
        ELSE 'equity'
    END
WHERE section IS NULL;

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 标记资产负债表本年利润行吸收未结转损益（会计准则口径）
-- destructive-owner: finance
-- destructive-ticket: P3-BATCH2-UNCLOSED-PL
-- destructive-expires: 2027-03-31
-- destructive-max-rows: 10000
-- destructive-backup: 迁移前 pg_dump -t finance.core_finance_report_line_map
UPDATE finance.core_finance_report_line_map
SET include_unclosed_pl = true
WHERE report_type = 'balance_sheet'
  AND line_code = 'current_year_profit'
  AND include_unclosed_pl = false;

ALTER TABLE finance.core_finance_report_line_map
    ALTER COLUMN section SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ck_report_line_map_section'
          AND conrelid = 'finance.core_finance_report_line_map'::regclass
    ) THEN
        ALTER TABLE finance.core_finance_report_line_map
            ADD CONSTRAINT ck_report_line_map_section
            CHECK (section IN ('asset', 'liability', 'equity', 'income', 'expense'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_report_line_map_section
    ON finance.core_finance_report_line_map (report_type, section, sort_no);
