-- 空壳表整表对齐（2/6）· finance · finance.core_finance_vouchers（补 26 列 + 1 外键）
--
-- 口径：docs/database/code-schema-gap-2026-11-15.md §7.2 第 2 条、§7.3。
--   prod 现状 20 列 / 1 行；dev 46 列。本迁移补齐 dev 独有 26 列，并补 prod 缺失的
--   外键 tenant_id → public.core_tenants(id)。
--
-- 与文档 §7 前提的偏差（以 2026-11-15 实测为准）：
--   * 文档称"9 张空壳表 prod 全部 0 行"，本表**不成立**：prod 有 1 行
--     （id df8b7573…、tenant_id 00000000-0000-0000-0000-000000000001、记2026110001、posted）。
--   * 26 列在 dev **全部 nullable**，因此加列不触碰既有行、无需回填；
--     迁移不设"0 行"门，改为校验外键目标完整性（既有行 tenant_id 必须在 core_tenants 中）。
--   * 文档 §7.3 列的两只 partial unique 与 4 只普通索引，prod 已由历史迁移建好，
--     实测定义与 dev 逐字一致（uq_finance_voucher_tenant_source / uq_voucher_company_period_no /
--     idx_voucher_period / idx_voucher_status / idx_voucher_tenant_id / idx_voucher_tenant_company），
--     本迁移不重复创建，避免同名对象冲突。
--
-- 目标定义（以 dev information_schema 实读为唯一依据，2026-11-15；全部 nullable）：
--   voucher_number    varchar(64)
--   year              integer
--   month             integer
--   total_amount      numeric(18,2)
--   currency_code     varchar(16)
--   submitter_id      uuid
--   submitter_name    varchar(128)
--   submitted_at      timestamptz
--   approver_id       uuid
--   approver_name     varchar(128)
--   checker_id        uuid
--   checker_name      varchar(128)
--   approved_at       timestamptz
--   poster_id         uuid
--   poster_name       varchar(128)
--   bookkeeper_id     uuid
--   bookkeeper_name   varchar(128)
--   posted_at         timestamptz
--   is_reversed       boolean      DEFAULT false
--   reverse_voucher_id uuid
--   reversed_at       timestamptz
--   attachment_count  integer      DEFAULT 0
--   summary           text
--   updated_by        uuid
--   maker_id          uuid
--   maker_name        varchar(128)
--
-- 代码证据（prod 缺列时的失败方式，42703 undefined_column）：
--   读：svc/finance/src/modules/audit_v52.rs:911（total_amount）及 :858/:1317、modules/mod.rs:3845/3884、
--       periods.rs:702、elimination_flow.rs:1204、event_handlers/mod.rs:239；
--       写入路径另有 INSERT/UPDATE 使用 submitter_*/approver_*/checker_*/poster_*/bookkeeper_* 等列。
--
-- 边界（本批只做止血，不做治理）：
--   * 只 ADD COLUMN + ADD CONSTRAINT（外键）；不改任何已有列类型（类型漂移 16 处另走）、
--     不改代码、不改 RLS 策略、不修改既有行。
--   * prod 该表策略 rls_tenant_isolation 只引用既有列 tenant_id；本迁移不新增策略、不改谓词，
--     补列前后（含 FORCE RLS）行可见集合与写入许可均不变。
--
-- 前置断言：表存在；26 列均不存在；外键不存在；既有行 tenant_id 在 core_tenants 中全部有对应记录。
-- 后置断言：26 列的类型/长度/精度/可空/默认值逐项对齐 dev；外键列与引用目标正确。
--
-- 回滚：database/rollback/20261115142000_finance_core_vouchers_26cols.rollback.sql
--   （先删外键，再逐列：仅当列内无非空值才删，有数据保留并 RAISE NOTICE）。

-- 1. 前置断言
DO $$
DECLARE
    n_rows bigint;
    n_orphan bigint;
BEGIN
    IF to_regclass('finance.core_finance_vouchers') IS NULL THEN
        RAISE EXCEPTION '空壳表前置断言失败：表 finance.core_finance_vouchers 不存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'finance' AND table_name = 'core_finance_vouchers'
           AND column_name IN ('voucher_number', 'year', 'month', 'total_amount', 'currency_code',
                               'submitter_id', 'submitter_name', 'maker_id', 'maker_name', 'submitted_at',
                               'approver_id', 'approver_name', 'checker_id', 'checker_name', 'approved_at',
                               'poster_id', 'poster_name', 'bookkeeper_id', 'bookkeeper_name', 'posted_at',
                               'is_reversed', 'reverse_voucher_id', 'reversed_at', 'attachment_count',
                               'summary', 'updated_by')
    ) THEN
        RAISE EXCEPTION '空壳表前置断言失败：finance.core_finance_vouchers 已有本次要补的列，本迁移只补缺失列';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'finance.core_finance_vouchers'::regclass
           AND contype = 'f'
           AND conname = 'core_finance_vouchers_tenant_id_fkey'
    ) THEN
        RAISE EXCEPTION '前置断言失败：外键 core_finance_vouchers_tenant_id_fkey 已存在';
    END IF;

    EXECUTE 'SELECT count(*) FROM finance.core_finance_vouchers' INTO n_rows;

    -- 既有行（非 0 行）的外键目标完整性，避免后续 ADD CONSTRAINT 失败
    EXECUTE 'SELECT count(*) FROM finance.core_finance_vouchers v
              LEFT JOIN public.core_tenants t ON t.id = v.tenant_id
              WHERE t.id IS NULL' INTO n_orphan;
    IF n_orphan <> 0 THEN
        RAISE EXCEPTION '前置断言失败：finance.core_finance_vouchers 有 % 行 tenant_id 在 public.core_tenants 无对应记录，外键无法建立', n_orphan;
    END IF;

    RAISE NOTICE 'finance.core_finance_vouchers 现有 % 行；26 个新增列在 dev 均为 nullable，外键目标校验通过', n_rows;
END $$;

-- 2. 补列（列定义与 dev 一致；顺序按 dev ordinal_position）
ALTER TABLE finance.core_finance_vouchers
    ADD COLUMN IF NOT EXISTS voucher_number     varchar(64),
    ADD COLUMN IF NOT EXISTS year               integer,
    ADD COLUMN IF NOT EXISTS month              integer,
    ADD COLUMN IF NOT EXISTS total_amount       numeric(18,2),
    ADD COLUMN IF NOT EXISTS currency_code      varchar(16),
    ADD COLUMN IF NOT EXISTS submitter_id       uuid,
    ADD COLUMN IF NOT EXISTS submitter_name     varchar(128),
    ADD COLUMN IF NOT EXISTS submitted_at       timestamptz,
    ADD COLUMN IF NOT EXISTS approver_id        uuid,
    ADD COLUMN IF NOT EXISTS approver_name      varchar(128),
    ADD COLUMN IF NOT EXISTS checker_id         uuid,
    ADD COLUMN IF NOT EXISTS checker_name       varchar(128),
    ADD COLUMN IF NOT EXISTS approved_at        timestamptz,
    ADD COLUMN IF NOT EXISTS poster_id          uuid,
    ADD COLUMN IF NOT EXISTS poster_name        varchar(128),
    ADD COLUMN IF NOT EXISTS bookkeeper_id      uuid,
    ADD COLUMN IF NOT EXISTS bookkeeper_name    varchar(128),
    ADD COLUMN IF NOT EXISTS posted_at          timestamptz,
    ADD COLUMN IF NOT EXISTS is_reversed        boolean      DEFAULT false,
    ADD COLUMN IF NOT EXISTS reverse_voucher_id uuid,
    ADD COLUMN IF NOT EXISTS reversed_at        timestamptz,
    ADD COLUMN IF NOT EXISTS attachment_count   integer      DEFAULT 0,
    ADD COLUMN IF NOT EXISTS summary            text,
    ADD COLUMN IF NOT EXISTS updated_by         uuid,
    ADD COLUMN IF NOT EXISTS maker_id           uuid,
    ADD COLUMN IF NOT EXISTS maker_name         varchar(128);

-- 3. 补外键（与 dev 同名同目标；既有 1 行 tenant_id 已校验存在）
ALTER TABLE finance.core_finance_vouchers
    ADD CONSTRAINT core_finance_vouchers_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.core_tenants(id);

-- 4. 后置断言：26 列形状与 dev 逐项一致
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('voucher_number',     'character varying',        64,  NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('year',               'integer',                  NULL::int, 32, 0,         'YES', NULL::text, NULL::text),
            ('month',              'integer',                  NULL::int, 32, 0,         'YES', NULL::text, NULL::text),
            ('total_amount',       'numeric',                  NULL::int, 18, 2,         'YES', NULL::text, NULL::text),
            ('currency_code',      'character varying',        16,  NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('submitter_id',       'uuid',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('submitter_name',     'character varying',        128, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('submitted_at',       'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('approver_id',        'uuid',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('approver_name',      'character varying',        128, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('checker_id',         'uuid',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('checker_name',       'character varying',        128, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('approved_at',        'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('poster_id',          'uuid',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('poster_name',        'character varying',        128, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('bookkeeper_id',      'uuid',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('bookkeeper_name',    'character varying',        128, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('posted_at',          'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('is_reversed',        'boolean',                  NULL::int, NULL::int, NULL::int, 'YES', 'false', NULL::text),
            ('reverse_voucher_id', 'uuid',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('reversed_at',        'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('attachment_count',   'integer',                  NULL::int, 32, 0,         'YES', '0', NULL::text),
            ('summary',            'text',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('updated_by',         'uuid',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('maker_id',           'uuid',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text, NULL::text),
            ('maker_name',         'character varying',        128, NULL::int, NULL::int, 'YES', NULL::text, NULL::text)
        ) AS v(col, typ, maxlen, numprec, numscale, nullable, dflt_exact, dflt_prefix)
    LOOP
        PERFORM 1
           FROM information_schema.columns
          WHERE table_schema = 'finance'
            AND table_name = 'core_finance_vouchers'
            AND column_name = r.col
            AND data_type = r.typ
            AND is_nullable = r.nullable
            AND character_maximum_length IS NOT DISTINCT FROM r.maxlen
            AND numeric_precision IS NOT DISTINCT FROM r.numprec
            AND numeric_scale IS NOT DISTINCT FROM r.numscale
            AND (
                 (r.dflt_exact IS NOT NULL AND column_default = r.dflt_exact)
                 OR (r.dflt_exact IS NULL AND r.dflt_prefix IS NOT NULL AND column_default LIKE r.dflt_prefix || '%')
                 OR (r.dflt_exact IS NULL AND r.dflt_prefix IS NULL AND column_default IS NULL)
            );
        IF NOT FOUND THEN
            RAISE EXCEPTION '空壳表后置断言失败：finance.core_finance_vouchers.% 形状与 dev 定义不一致', r.col;
        END IF;
    END LOOP;
END $$;

-- 5. 后置断言：外键列与引用目标正确
DO $$
DECLARE
    v_conkey smallint[];
    v_confrel oid;
    v_confkey smallint[];
BEGIN
    SELECT conkey, confrelid, confkey
      INTO v_conkey, v_confrel, v_confkey
      FROM pg_constraint
     WHERE conrelid = 'finance.core_finance_vouchers'::regclass
       AND contype = 'f'
       AND conname = 'core_finance_vouchers_tenant_id_fkey';

    IF v_conkey IS NULL THEN
        RAISE EXCEPTION '空壳表后置断言失败：外键 core_finance_vouchers_tenant_id_fkey 不存在';
    END IF;

    IF v_conkey <> ARRAY[(SELECT attnum FROM pg_attribute
                            WHERE attrelid = 'finance.core_finance_vouchers'::regclass
                              AND attname = 'tenant_id')]::smallint[]
       OR v_confrel <> 'public.core_tenants'::regclass
       OR v_confkey <> ARRAY[(SELECT attnum FROM pg_attribute
                               WHERE attrelid = 'public.core_tenants'::regclass
                                 AND attname = 'id')]::smallint[] THEN
        RAISE EXCEPTION '空壳表后置断言失败：外键 core_finance_vouchers_tenant_id_fkey 定义与 dev 不一致';
    END IF;
END $$;
