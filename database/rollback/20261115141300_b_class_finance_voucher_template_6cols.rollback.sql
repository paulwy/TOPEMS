-- 回滚入口（B 类 2/7）· 对应 database/migrations/20261115141300_b_class_finance_voucher_template_6cols.sql
-- 口径：仅本次新增才删；逐列判断，列内一旦出现非空数据即保留并 RAISE NOTICE。
-- 本迁移未建索引/约束/策略，回滚只涉及列本身；不涉及 pg_policies。

-- 1. finance.finance_voucher_template_lines.debit_amount
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 debit_amount 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141300_b_class_finance_voucher_template_6cols.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM finance.finance_voucher_template_lines WHERE debit_amount IS NOT NULL) THEN
        ALTER TABLE finance.finance_voucher_template_lines DROP COLUMN IF EXISTS debit_amount;
    ELSE
        RAISE NOTICE 'finance.finance_voucher_template_lines.debit_amount 存在非空值，保留列';
    END IF;
END $$;

-- 2. finance.finance_voucher_template_lines.credit_amount
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 credit_amount 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141300_b_class_finance_voucher_template_6cols.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM finance.finance_voucher_template_lines WHERE credit_amount IS NOT NULL) THEN
        ALTER TABLE finance.finance_voucher_template_lines DROP COLUMN IF EXISTS credit_amount;
    ELSE
        RAISE NOTICE 'finance.finance_voucher_template_lines.credit_amount 存在非空值，保留列';
    END IF;
END $$;

-- 3. finance.finance_voucher_template_lines.account_id
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 account_id 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141300_b_class_finance_voucher_template_6cols.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM finance.finance_voucher_template_lines WHERE account_id IS NOT NULL) THEN
        ALTER TABLE finance.finance_voucher_template_lines DROP COLUMN IF EXISTS account_id;
    ELSE
        RAISE NOTICE 'finance.finance_voucher_template_lines.account_id 存在非空值，保留列';
    END IF;
END $$;

-- 4. finance.finance_voucher_template_lines.account_name
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 account_name 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141300_b_class_finance_voucher_template_6cols.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM finance.finance_voucher_template_lines WHERE account_name IS NOT NULL) THEN
        ALTER TABLE finance.finance_voucher_template_lines DROP COLUMN IF EXISTS account_name;
    ELSE
        RAISE NOTICE 'finance.finance_voucher_template_lines.account_name 存在非空值，保留列';
    END IF;
END $$;

-- 5. finance.finance_voucher_templates.voucher_type
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 voucher_type 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141300_b_class_finance_voucher_template_6cols.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM finance.finance_voucher_templates WHERE voucher_type IS NOT NULL) THEN
        ALTER TABLE finance.finance_voucher_templates DROP COLUMN IF EXISTS voucher_type;
    ELSE
        RAISE NOTICE 'finance.finance_voucher_templates.voucher_type 存在非空值，保留列';
    END IF;
END $$;

-- 6. finance.finance_voucher_templates.is_default
--    is_default 带 DEFAULT false：新增后写入的行即使未显式赋值也是 false（非 NULL），
--    因此有数据时本块会保留该列，这是有意的数据保护。
-- destructive-gate: allow
-- destructive-kind: DROP COLUMN
-- destructive-reason: 回滚 B 类补列；仅当列内无任何非空 is_default 时删列，有数据则保留并 RAISE NOTICE
-- destructive-owner: platform-db
-- destructive-ticket: B-CLASS-20261115
-- destructive-expires: 2027-03-31
-- destructive-rows-at-review: 0
-- destructive-backup: database/rollback/20261115141300_b_class_finance_voucher_template_6cols.rollback.sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM finance.finance_voucher_templates WHERE is_default IS NOT NULL) THEN
        ALTER TABLE finance.finance_voucher_templates DROP COLUMN IF EXISTS is_default;
    ELSE
        RAISE NOTICE 'finance.finance_voucher_templates.is_default 存在非空值，保留列';
    END IF;
END $$;
