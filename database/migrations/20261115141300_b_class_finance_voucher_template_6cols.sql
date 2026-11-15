-- B 类列补齐（2/7）· finance · finance.finance_voucher_template_lines + finance.finance_voucher_templates（2 表 6 列）
--
-- 口径：B 类 = prod 缺列、且 HEAD 代码已真实读/写该列（docs/database/column-drift-attribution-2026-11-15.md §4.2.2）。
--   本迁移只做 ADD COLUMN，不建索引、不建约束、不改策略、不含 BEGIN/COMMIT。
--
-- 目标定义（以 dev 现有定义为唯一依据）：
--   finance.finance_voucher_template_lines.debit_amount   numeric(18,2)  NULL
--   finance.finance_voucher_template_lines.credit_amount  numeric(18,2)  NULL
--   finance.finance_voucher_template_lines.account_id     uuid           NULL
--   finance.finance_voucher_template_lines.account_name   varchar(255)   NULL
--   finance.finance_voucher_templates.voucher_type        varchar(255)   NULL
--   finance.finance_voucher_templates.is_default          boolean        NULL DEFAULT false
--
-- 证据（取证门已回读，行号直接引用）：
--   读（lines 4 列）：svc/finance/src/services/finance/voucher_template.rs:189
--       SELECT id, template_id, account_id, account_code, account_name, description,
--              debit_amount, credit_amount, sort_order, created_at
--         FROM finance_voucher_template_lines WHERE template_id = $1
--   写（templates.voucher_type）：同文件 :215-221 INSERT 列清单含 voucher_type，is_default 以字面量 false 落库
--   读写（templates.is_default + voucher_type）：同文件 :443
--       UPDATE finance_voucher_templates SET is_default = false WHERE tenant_id = $1 AND voucher_type = $2
--
--   prod 缺列时的失败方式：
--     * lines 侧：:189 在 parse/analyze 阶段报 SQLSTATE 42703 undefined_column
--       （column "debit_amount"/"credit_amount"/"account_id"/"account_name" does not exist），
--       凭证模板明细查询整条路径 500；
--     * templates 侧：:215 的 INSERT 列清单含 voucher_type → 42703；:443 的 UPDATE 同时引用
--       is_default 与 voucher_type → 42703。均为稳定报错，非空结果。
--
-- 前置断言：两表存在；上述 6 列均不存在（prod 实测 0 行，本批无 NOT NULL 列，无需行数门）。
-- 同名对象冲突：本迁移不创建索引/约束；prod 侧既有索引（lines_pkey / templates_pkey /
--   两表 tenant 相关唯一约束）均不引用这 6 列（列不存在，必然不引用）。
-- 后置断言：6 列形状与 dev 定义逐项一致（含 numeric precision/scale 与 varchar 长度）。
--
-- 残余缺列（不在本批，按 §4.2.3/§4.4 另行处置）：prod 的 finance_voucher_templates 还缺
--   default_debit_account / default_credit_account（:216-221 的 INSERT 也写这两列），
--   finance_voucher_template_lines 还缺 updated_at；本迁移不补，故上述路径要端到端可用仍需该批落地。
--
-- 回滚：database/rollback/20261115141300_b_class_finance_voucher_template_6cols.rollback.sql
--   （逐列：仅当列内无任何非空值才删列，有数据则保留并 RAISE NOTICE）。

-- 1. 前置断言
DO $$
DECLARE
    t text;
    c text;
BEGIN
    FOREACH t IN ARRAY ARRAY['finance.finance_voucher_template_lines', 'finance.finance_voucher_templates'] LOOP
        IF to_regclass(t) IS NULL THEN
            RAISE EXCEPTION 'B 类前置断言失败：表 % 不存在', t;
        END IF;
    END LOOP;

    FOR t, c IN
        SELECT * FROM (VALUES
            ('finance_voucher_template_lines', 'debit_amount'),
            ('finance_voucher_template_lines', 'credit_amount'),
            ('finance_voucher_template_lines', 'account_id'),
            ('finance_voucher_template_lines', 'account_name'),
            ('finance_voucher_templates',      'voucher_type'),
            ('finance_voucher_templates',      'is_default')
        ) AS v(t, c)
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'finance' AND table_name = t AND column_name = c
        ) THEN
            RAISE EXCEPTION 'B 类前置断言失败：finance.%.% 已存在，本迁移只补缺失列', t, c;
        END IF;
    END LOOP;
END $$;

-- 2. 补列：finance_voucher_template_lines（4 列）
ALTER TABLE finance.finance_voucher_template_lines
    ADD COLUMN IF NOT EXISTS account_id    uuid,
    ADD COLUMN IF NOT EXISTS account_name  varchar(255),
    ADD COLUMN IF NOT EXISTS credit_amount numeric(18,2),
    ADD COLUMN IF NOT EXISTS debit_amount  numeric(18,2);

-- 2. 补列：finance_voucher_templates（2 列）
ALTER TABLE finance.finance_voucher_templates
    ADD COLUMN IF NOT EXISTS is_default   boolean DEFAULT false,
    ADD COLUMN IF NOT EXISTS voucher_type varchar(255);

-- 3. 后置断言：形状与 dev 定义逐项对齐
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('finance_voucher_template_lines', 'debit_amount',  'numeric',           18::int, 2::int, NULL::int,  'YES', NULL::text),
            ('finance_voucher_template_lines', 'credit_amount', 'numeric',           18,      2,      NULL,        'YES', NULL),
            ('finance_voucher_template_lines', 'account_id',    'uuid',              NULL,    NULL,   NULL,        'YES', NULL),
            ('finance_voucher_template_lines', 'account_name',  'character varying', NULL,    NULL,   255,         'YES', NULL),
            ('finance_voucher_templates',      'voucher_type',  'character varying', NULL,    NULL,   255,         'YES', NULL),
            ('finance_voucher_templates',      'is_default',    'boolean',           NULL,    NULL,   NULL,        'YES', 'false')
        ) AS v(tbl, col, typ, prec, scale, maxlen, nullable, dflt)
    LOOP
        PERFORM 1
           FROM information_schema.columns
          WHERE table_schema = 'finance'
            AND table_name = r.tbl
            AND column_name = r.col
            AND data_type = r.typ
            AND is_nullable = r.nullable
            AND numeric_precision IS NOT DISTINCT FROM r.prec
            AND numeric_scale IS NOT DISTINCT FROM r.scale
            AND character_maximum_length IS NOT DISTINCT FROM r.maxlen
            AND (
                 (r.dflt IS NULL AND column_default IS NULL)
                 OR (r.dflt IS NOT NULL AND column_default LIKE r.dflt || '%')
            );
        IF NOT FOUND THEN
            RAISE EXCEPTION 'B 类后置断言失败：finance.%.% 形状与目标定义不一致', r.tbl, r.col;
        END IF;
    END LOOP;
END $$;
