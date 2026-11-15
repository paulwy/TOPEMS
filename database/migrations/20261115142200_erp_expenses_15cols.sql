-- 空壳表整表对齐（4/6）· erp · erp.expenses（补 15 列 + expense_number 唯一约束 + 4 只索引）
--
-- 口径：docs/database/code-schema-gap-2026-11-15.md §7.2 第 4 条、§7.3。
--
-- 现状（2026-11-15 实测）：
--   prod erp.expenses 3 列（id / deleted_at / tenant_id）/ 0 行 → dev 18 列。
--   prod 仅 expenses_pkey 与 idx_erp_expenses_tenant_id 两只索引；
--   dev 另有 expenses_expense_number_key(UNIQUE)、idx_expenses_expense_number/
--   organization_id/status/deleted_at。本迁移补齐 15 列与 5 只缺失对象。
--   prod 与 dev 均无该表触发器；updated_at 不自动维护（两侧一致，本迁移不引入）。
--
-- 与文档 §7.4 的偏差（以 2026-11-15 实读为准）：
--   文档把 erp.expenses 归到「费用报销 CRUD（operational.rs）」。实测
--   svc/finance/src/modules/operational.rs 的 SQL 用 only_own_schema_query!("finance", ...)
--   绑定 finance.expenses（23 列，独立表），并不落到 erp.expenses；全仓 Rust 也没有
--   对 erp.expenses 的直接 SQL 引用。因此本批收益是「结构对齐」而非「已指认的 42703 路径修复」，
--   不得据此宣称报销路径已修复。
--
-- 边界（本批只做止血，不做治理）：
--   * 只 ADD COLUMN + ADD CONSTRAINT(UNIQUE) + CREATE INDEX；
--   * 不改任何已有列类型/默认值（prod 既有 id 默认 gen_random_uuid()，dev 为
--     uuid_generate_v4()，属既有漂移，本迁移不改）、不改代码、不改 RLS 策略。
--   * 新增 organization_id 的默认值按 dev 取 uuid_generate_v4()（prod 已装 uuid-ossp）。
--
-- RLS：prod relrowsecurity=true / relforcerowsecurity=true，仅一条策略
--   rls_tenant_isolation（tenant_id 谓词）。新增列不进入谓词，补列前后行可见集合
--   与写入许可不变；tenant_id 是既有列，不在本次补列范围。
--
-- 前置断言：表存在；15 列均不存在；唯一约束与 4 只索引不存在；表 0 行
--   （expense_number / amount 为 NOT NULL 无默认值，非 0 行无法安全直加）。
-- 后置断言：15 列类型/长度/精度/可空/默认值逐项对齐 dev；唯一约束列正确；
--   5 只索引定义与 dev 逐字一致。
--
-- 回滚：database/rollback/20261115142200_erp_expenses_15cols.rollback.sql
--   （先删唯一约束，再删索引，再逐列：仅当列内无非空值才删，有数据保留并 RAISE NOTICE）。

-- 1. 前置断言
DO $$
DECLARE
    n bigint;
BEGIN
    IF to_regclass('erp.expenses') IS NULL THEN
        RAISE EXCEPTION '空壳表前置断言失败：erp.expenses 不存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'erp' AND table_name = 'expenses'
           AND column_name IN ('organization_id','expense_number','applicant_name','department_id',
                               'expense_type','amount','description','expense_date','receipt_count',
                               'status','approver_id','approved_at','reimbursed_at',
                               'created_at','updated_at')
    ) THEN
        RAISE EXCEPTION '空壳表前置断言失败：erp.expenses 已有本次要补的列，本迁移只补缺失列';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'erp.expenses'::regclass
           AND contype = 'u' AND conname = 'expenses_expense_number_key'
    ) THEN
        RAISE EXCEPTION '前置断言失败：唯一约束 expenses_expense_number_key 已存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'erp' AND c.relname IN (
               'expenses_expense_number_key','idx_expenses_expense_number',
               'idx_expenses_organization_id','idx_expenses_status','idx_expenses_deleted_at')
    ) THEN
        RAISE EXCEPTION '前置断言失败：erp.expenses 目标索引已存在';
    END IF;

    EXECUTE 'SELECT count(*) FROM erp.expenses' INTO n;
    IF n <> 0 THEN
        RAISE EXCEPTION '空壳表前置断言失败：erp.expenses 有 % 行，expense_number/amount 为 NOT NULL 无默认列，禁止直接加', n;
    END IF;
END $$;

-- 2. 补列（列定义与 dev 一致；顺序按 dev ordinal_position）
ALTER TABLE erp.expenses
    ADD COLUMN IF NOT EXISTS organization_id uuid         NOT NULL DEFAULT uuid_generate_v4(),
    ADD COLUMN IF NOT EXISTS expense_number  varchar(100) NOT NULL,
    ADD COLUMN IF NOT EXISTS applicant_name  varchar(255),
    ADD COLUMN IF NOT EXISTS department_id   uuid,
    ADD COLUMN IF NOT EXISTS expense_type    varchar(100),
    ADD COLUMN IF NOT EXISTS amount          numeric(15,2) NOT NULL,
    ADD COLUMN IF NOT EXISTS description     text,
    ADD COLUMN IF NOT EXISTS expense_date    timestamptz,
    ADD COLUMN IF NOT EXISTS receipt_count   integer,
    ADD COLUMN IF NOT EXISTS status          varchar(50)   NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS approver_id     uuid,
    ADD COLUMN IF NOT EXISTS approved_at     timestamptz,
    ADD COLUMN IF NOT EXISTS reimbursed_at   timestamptz,
    ADD COLUMN IF NOT EXISTS created_at      timestamptz   NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at      timestamptz   NOT NULL DEFAULT now();

-- 3. expense_number 唯一性（dev 以唯一约束形式存在，索引同名随约束创建）
ALTER TABLE erp.expenses
    ADD CONSTRAINT expenses_expense_number_key UNIQUE (expense_number);

-- 4. 索引（定义逐字取自 dev pg_indexes）
CREATE INDEX idx_expenses_expense_number   ON erp.expenses USING btree (expense_number);
CREATE INDEX idx_expenses_organization_id  ON erp.expenses USING btree (organization_id);
CREATE INDEX idx_expenses_status           ON erp.expenses USING btree (status);
CREATE INDEX idx_expenses_deleted_at       ON erp.expenses USING btree (deleted_at);

-- 5. 后置断言：15 列形状与 dev 逐项一致
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('organization_id', 'uuid',                     NULL::int, NULL::int, NULL::int, 'NO',  'uuid_generate_v4()'),
            ('expense_number',  'character varying',        100,       NULL::int, NULL::int, 'NO',  NULL::text),
            ('applicant_name',  'character varying',        255,       NULL::int, NULL::int, 'YES', NULL::text),
            ('department_id',   'uuid',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            ('expense_type',    'character varying',        100,       NULL::int, NULL::int, 'YES', NULL::text),
            ('amount',          'numeric',                  NULL::int, 15,        2,         'NO',  NULL::text),
            ('description',     'text',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            ('expense_date',    'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            ('receipt_count',   'integer',                  NULL::int, 32,        0,         'YES', NULL::text),
            ('status',          'character varying',        50,        NULL::int, NULL::int, 'NO',  '''pending''::character varying'),
            ('approver_id',     'uuid',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            ('approved_at',     'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            ('reimbursed_at',   'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            ('created_at',      'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'NO',  'now()'),
            ('updated_at',      'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'NO',  'now()')
        ) AS v(col, typ, maxlen, numprec, numscale, nullable, dflt_exact)
    LOOP
        PERFORM 1
           FROM information_schema.columns
          WHERE table_schema = 'erp'
            AND table_name = 'expenses'
            AND column_name = r.col
            AND data_type = r.typ
            AND is_nullable = r.nullable
            AND character_maximum_length IS NOT DISTINCT FROM r.maxlen
            AND numeric_precision IS NOT DISTINCT FROM r.numprec
            AND numeric_scale IS NOT DISTINCT FROM r.numscale
            AND column_default IS NOT DISTINCT FROM r.dflt_exact;
        IF NOT FOUND THEN
            RAISE EXCEPTION '空壳表后置断言失败：erp.expenses.% 形状与 dev 定义不一致', r.col;
        END IF;
    END LOOP;
END $$;

-- 6. 后置断言：唯一约束列正确
DO $$
DECLARE
    v_conkey smallint[];
BEGIN
    SELECT conkey INTO v_conkey
      FROM pg_constraint
     WHERE conrelid = 'erp.expenses'::regclass
       AND contype = 'u'
       AND conname = 'expenses_expense_number_key';

    IF v_conkey IS NULL
       OR v_conkey <> ARRAY[(SELECT attnum FROM pg_attribute
                              WHERE attrelid = 'erp.expenses'::regclass
                                AND attname = 'expense_number')]::smallint[] THEN
        RAISE EXCEPTION '空壳表后置断言失败：唯一约束 expenses_expense_number_key 定义与 dev 不一致';
    END IF;
END $$;

-- 7. 后置断言：5 只索引定义与 dev 逐字一致
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('expenses_expense_number_key', 'CREATE UNIQUE INDEX expenses_expense_number_key ON erp.expenses USING btree (expense_number)'),
            ('idx_expenses_expense_number', 'CREATE INDEX idx_expenses_expense_number ON erp.expenses USING btree (expense_number)'),
            ('idx_expenses_organization_id','CREATE INDEX idx_expenses_organization_id ON erp.expenses USING btree (organization_id)'),
            ('idx_expenses_status',         'CREATE INDEX idx_expenses_status ON erp.expenses USING btree (status)'),
            ('idx_expenses_deleted_at',     'CREATE INDEX idx_expenses_deleted_at ON erp.expenses USING btree (deleted_at)')
        ) AS v(idx, def)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'erp' AND c.relname = r.idx
               AND pg_get_indexdef(c.oid) = r.def
        ) THEN
            RAISE EXCEPTION '空壳表后置断言失败：索引 erp.% 定义与 dev 不一致', r.idx;
        END IF;
    END LOOP;
END $$;
