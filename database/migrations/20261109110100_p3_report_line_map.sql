-- P3 第一批（2/3）：报表行映射表 + 全局模板种子
--
-- 目标：把「报表行 → 科目」的关系从代码常量搬到可核对的映射表。
--   - tenant_id NULL AND company_id NULL = 平台全局模板（本批只种这一档）；
--   - tenant_id/company_id 非空 = 租户/公司级覆盖（表结构预留，本批不启用）；
--   - match_type = 'prefix'，按 match_value 前缀匹配科目编码，长前缀优先（6 位明细可覆盖 4 位一级）。
--   - 一个科目可命中多行（如成本类 5001/5101 按财务口径归「存货」）。
--
-- 结转口径：成本类期末余额归「存货」行（已拍板）。
--
-- ROLLBACK（人工评估后执行）：
--   DROP TABLE IF EXISTS finance.core_finance_report_line_map;

CREATE TABLE IF NOT EXISTS finance.core_finance_report_line_map (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     uuid,
    company_id    uuid,
    report_type   varchar(32) NOT NULL,
    line_code     varchar(32) NOT NULL,
    line_name     varchar(128) NOT NULL,
    line_name_en  varchar(128),
    line_level    smallint NOT NULL DEFAULT 1,
    sort_no       integer NOT NULL,
    direction     varchar(8) NOT NULL,
    match_type    varchar(16) NOT NULL DEFAULT 'prefix',
    match_value   varchar(64) NOT NULL,
    created_at    timestamp with time zone NOT NULL DEFAULT now(),
    updated_at    timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT ck_report_line_map_report_type
        CHECK (report_type IN ('balance_sheet', 'income_statement')),
    CONSTRAINT ck_report_line_map_direction
        CHECK (direction IN ('debit', 'credit')),
    CONSTRAINT ck_report_line_map_match_type
        CHECK (match_type IN ('prefix', 'exact'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_report_line_map_scope_match
    ON finance.core_finance_report_line_map (
        report_type,
        COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        COALESCE(company_id, '00000000-0000-0000-0000-000000000000'::uuid),
        match_value
    );

CREATE INDEX IF NOT EXISTS idx_report_line_map_lookup
    ON finance.core_finance_report_line_map (report_type, match_value);

ALTER TABLE finance.core_finance_report_line_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.core_finance_report_line_map FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'finance'
          AND tablename = 'core_finance_report_line_map'
          AND policyname = 'tenant_isolation_report_line_map'
    ) THEN
        CREATE POLICY tenant_isolation_report_line_map
            ON finance.core_finance_report_line_map
            USING (
                tenant_id IS NULL
                OR current_setting('app.tenant_id', true) IS NULL
                OR current_setting('app.tenant_id', true) = ''
                OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
            )
            WITH CHECK (
                tenant_id IS NULL
                OR current_setting('app.tenant_id', true) IS NULL
                OR current_setting('app.tenant_id', true) = ''
                OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
                OR tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid
            );
    END IF;
END $$;

-- 全局模板：资产负债表（21 行 / 37 条科目前缀，含成本类归存货）
INSERT INTO finance.core_finance_report_line_map
    (tenant_id, company_id, report_type, line_code, line_name, line_name_en,
     line_level, sort_no, direction, match_type, match_value)
SELECT NULL, NULL, v.report_type, v.line_code, v.line_name, v.line_name_en,
       v.line_level, v.sort_no, v.direction, 'prefix', v.match_value
FROM (VALUES
    -- 资产
    ('balance_sheet', 'monetary_funds',              '货币资金',       'Monetary funds',              1,  1, 'debit',  '1001%'),
    ('balance_sheet', 'monetary_funds',              '货币资金',       'Monetary funds',              1,  1, 'debit',  '1002%'),
    ('balance_sheet', 'monetary_funds',              '货币资金',       'Monetary funds',              1,  1, 'debit',  '1012%'),
    ('balance_sheet', 'trading_financial_assets',    '交易性金融资产', 'Trading financial assets',    1,  2, 'debit',  '1101%'),
    ('balance_sheet', 'notes_receivable',            '应收票据',       'Notes receivable',            1,  3, 'debit',  '1121%'),
    ('balance_sheet', 'accounts_receivable',         '应收账款',       'Accounts receivable',         1,  4, 'debit',  '1122%'),
    ('balance_sheet', 'prepayments',                 '预付款项',       'Prepayments',                 1,  5, 'debit',  '1123%'),
    ('balance_sheet', 'other_receivables',           '其他应收款',     'Other receivables',           1,  6, 'debit',  '1221%'),
    ('balance_sheet', 'inventory',                   '存货',           'Inventory',                   1,  7, 'debit',  '1401%'),
    ('balance_sheet', 'inventory',                   '存货',           'Inventory',                   1,  7, 'debit',  '1402%'),
    ('balance_sheet', 'inventory',                   '存货',           'Inventory',                   1,  7, 'debit',  '1403%'),
    ('balance_sheet', 'inventory',                   '存货',           'Inventory',                   1,  7, 'debit',  '1404%'),
    ('balance_sheet', 'inventory',                   '存货',           'Inventory',                   1,  7, 'debit',  '1405%'),
    ('balance_sheet', 'inventory',                   '存货',           'Inventory',                   1,  7, 'debit',  '1408%'),
    ('balance_sheet', 'inventory',                   '存货',           'Inventory',                   1,  7, 'debit',  '1411%'),
    ('balance_sheet', 'inventory',                   '存货',           'Inventory',                   1,  7, 'debit',  '1421%'),
    ('balance_sheet', 'inventory',                   '存货',           'Inventory',                   1,  7, 'debit',  '5001%'),
    ('balance_sheet', 'inventory',                   '存货',           'Inventory',                   1,  7, 'debit',  '5101%'),
    ('balance_sheet', 'fixed_assets',                '固定资产',       'Fixed assets',                1,  8, 'debit',  '1601%'),
    ('balance_sheet', 'fixed_assets',                '固定资产',       'Fixed assets',                1,  8, 'debit',  '1602%'),
    ('balance_sheet', 'construction_in_progress',    '在建工程',       'Construction in progress',    1,  9, 'debit',  '1604%'),
    ('balance_sheet', 'intangible_assets',           '无形资产',       'Intangible assets',           1, 10, 'debit',  '1701%'),
    ('balance_sheet', 'intangible_assets',           '无形资产',       'Intangible assets',           1, 10, 'debit',  '1702%'),
    ('balance_sheet', 'long_term_deferred_expenses', '长期待摊费用',   'Long-term deferred expenses', 1, 11, 'debit',  '1801%'),
    -- 负债
    ('balance_sheet', 'short_term_loans',            '短期借款',       'Short-term loans',            1, 20, 'credit', '2001%'),
    ('balance_sheet', 'notes_payable',               '应付票据',       'Notes payable',               1, 21, 'credit', '2201%'),
    ('balance_sheet', 'accounts_payable',            '应付账款',       'Accounts payable',            1, 22, 'credit', '2202%'),
    ('balance_sheet', 'advances_from_customers',     '预收款项',       'Advances from customers',     1, 23, 'credit', '2203%'),
    ('balance_sheet', 'payroll_payable',             '应付职工薪酬',   'Payroll payable',             1, 24, 'credit', '2211%'),
    ('balance_sheet', 'taxes_payable',               '应交税费',       'Taxes payable',               1, 25, 'credit', '2221%'),
    ('balance_sheet', 'other_payables',              '其他应付款',     'Other payables',              1, 26, 'credit', '2241%'),
    ('balance_sheet', 'long_term_loans',             '长期借款',       'Long-term loans',             1, 27, 'credit', '2501%'),
    -- 所有者权益
    ('balance_sheet', 'paid_in_capital',             '实收资本',       'Paid-in capital',             1, 30, 'credit', '4001%'),
    ('balance_sheet', 'capital_reserve',             '资本公积',       'Capital reserve',             1, 31, 'credit', '4002%'),
    ('balance_sheet', 'surplus_reserve',             '盈余公积',       'Surplus reserve',             1, 32, 'credit', '4101%'),
    ('balance_sheet', 'current_year_profit',         '本年利润',       'Current year profit',         1, 33, 'credit', '4103%'),
    ('balance_sheet', 'retained_earnings',           '未分配利润',     'Retained earnings',           1, 34, 'credit', '4104%')
) AS v(report_type, line_code, line_name, line_name_en, line_level, sort_no, direction, match_value)
WHERE NOT EXISTS (
    SELECT 1 FROM finance.core_finance_report_line_map m
    WHERE m.tenant_id IS NULL
      AND m.company_id IS NULL
      AND m.report_type = v.report_type
      AND m.match_value = v.match_value
);

-- 全局模板：利润表（9 行 / 11 条科目前缀）
INSERT INTO finance.core_finance_report_line_map
    (tenant_id, company_id, report_type, line_code, line_name, line_name_en,
     line_level, sort_no, direction, match_type, match_value)
SELECT NULL, NULL, v.report_type, v.line_code, v.line_name, v.line_name_en,
       v.line_level, v.sort_no, v.direction, 'prefix', v.match_value
FROM (VALUES
    ('income_statement', 'operating_revenue',      '营业收入',     'Operating revenue',     1, 1, 'credit', '6001%'),
    ('income_statement', 'operating_revenue',      '营业收入',     'Operating revenue',     1, 1, 'credit', '6051%'),
    ('income_statement', 'operating_cost',         '营业成本',     'Operating cost',        1, 2, 'debit',  '6401%'),
    ('income_statement', 'operating_cost',         '营业成本',     'Operating cost',        1, 2, 'debit',  '6402%'),
    ('income_statement', 'taxes_and_surcharges',   '税金及附加',   'Taxes and surcharges',  1, 3, 'debit',  '6403%'),
    ('income_statement', 'selling_expenses',       '销售费用',     'Selling expenses',      1, 4, 'debit',  '6601%'),
    ('income_statement', 'administrative_expenses','管理费用',     'Administrative expenses', 1, 5, 'debit', '6602%'),
    ('income_statement', 'financial_expenses',     '财务费用',     'Financial expenses',    1, 6, 'debit',  '6603%'),
    ('income_statement', 'non_operating_income',   '营业外收入',   'Non-operating income',  1, 7, 'credit', '6301%'),
    ('income_statement', 'non_operating_expense',  '营业外支出',   'Non-operating expense', 1, 8, 'debit',  '6711%'),
    ('income_statement', 'income_tax_expense',     '所得税费用',   'Income tax expense',    1, 9, 'debit',  '6801%')
) AS v(report_type, line_code, line_name, line_name_en, line_level, sort_no, direction, match_value)
WHERE NOT EXISTS (
    SELECT 1 FROM finance.core_finance_report_line_map m
    WHERE m.tenant_id IS NULL
      AND m.company_id IS NULL
      AND m.report_type = v.report_type
      AND m.match_value = v.match_value
);
