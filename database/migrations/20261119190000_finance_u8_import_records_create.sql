-- 空壳表整表对齐（8/8 · 单独一笔）· finance · finance_u8_import_records 建表
--
-- 口径：docs/database/code-schema-gap-2026-11-15.md §5（A 类「整表缺失」）、§7.2 第 3 条。
-- 唯一依据：dev `pg_dump -t finance.finance_u8_import_records --schema-only`（2026-11-15 实读）。
--
-- 现状：prod 无此表 → 代码路径 42P01 undefined_table。
--   svc/finance/src/services/finance/u8_import.rs:92-98
--     INSERT INTO finance_u8_import_records
--       (id, tenant_id, import_batch_no, source_system, import_time,
--        total_count, success_count, failed_count, status, created_by, created_at, updated_at)
--     VALUES (..., 'processing', ...) RETURNING *
--   同文件 145/276 行还有 status='completed'/'failed'/'rolled_back' 的 UPDATE。
--
-- ⚠ 必须同时知悉的冲突（本迁移不掩盖、不修正）：
--   dev 该表自带 CHECK ck_finance_u8_import_records_status_standard，允许值只有
--   {'active','inactive','archived'}；而代码写入的状态是
--   'processing' / 'completed' / 'failed' / 'rolled_back'，全部不在允许集合内。
--   也就是说：建表后该路径的失败码会从 42P01 变成 23514（check_violation），仍然写入失败。
--   本批按用户指令「以 dev dump 为唯一依据、含约束、逐字一致」建表，不擅自放宽 CHECK，
--   也不改代码；这个冲突登记为待决事项（代码侧状态值 vs 表侧 CHECK 二选一收敛），
--   不在补列/建表批次内顺手改。
--
-- 结构（与 dev 逐项一致）：
--   17 列；PK finance_u8_import_records_pkey(id)；
--   CHECK ck_finance_u8_import_records_status_standard；
--   RLS: ENABLE + FORCE，策略 rls_tenant_isolation 与
--   tenant_isolation_finance_u8_import_records（两条谓词相同，dev 原样保留）；
--   无额外索引、无触发器。
--
-- 边界：只建表/主键/CHECK/策略；不改代码、不改 dev 表、不写数据。
--
-- 前置断言：表不存在（整表缺失前提）；schema finance 存在。
-- 后置断言：17 列形状、PK、CHECK 存在、RLS 开关、两条策略的 USING/WITH CHECK 与 dev 一致。
--
-- 回滚：database/rollback/20261119190000_finance_u8_import_records_create.rollback.sql
--   （空表才 DROP；已有数据则保留并 RAISE NOTICE，避免回滚销毁导入记录）

-- 1. 前置断言
DO $$
BEGIN
    IF to_regclass('finance.finance_u8_import_records') IS NOT NULL THEN
        RAISE EXCEPTION '前置断言失败：finance.finance_u8_import_records 已存在，本迁移只用于整表缺失场景';
    END IF;
    IF to_regnamespace('finance') IS NULL THEN
        RAISE EXCEPTION '前置断言失败：schema finance 不存在';
    END IF;
END $$;

-- 2. 建表（列顺序/类型/默认值/可空性逐字取自 dev dump）
CREATE TABLE finance.finance_u8_import_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone,
    created_by character varying(255),
    error_message text,
    failed_count integer,
    file_name character varying(255),
    file_type character varying(255),
    import_batch_no character varying(255),
    import_time date,
    imported_count integer,
    source_system character varying(255),
    status character varying(255),
    success_count integer,
    tenant_id uuid,
    total_count integer,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT ck_finance_u8_import_records_status_standard CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying])::text[]))))
);

-- 3. 主键
ALTER TABLE ONLY finance.finance_u8_import_records
    ADD CONSTRAINT finance_u8_import_records_pkey PRIMARY KEY (id);

-- 4. RLS（dev 原样：ENABLE + FORCE，两条同义策略）
ALTER TABLE finance.finance_u8_import_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance.finance_u8_import_records FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_tenant_isolation ON finance.finance_u8_import_records
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

CREATE POLICY tenant_isolation_finance_u8_import_records ON finance.finance_u8_import_records
    USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)))
    WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- 5. 后置断言：17 列形状与 dev 逐项一致
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            (1,  'id',               'uuid',                     NULL::int, NULL::int, NULL::int, 'NO',  'gen_random_uuid()'),
            (2,  'created_at',       'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            (3,  'created_by',       'character varying',        255,       NULL::int, NULL::int, 'YES', NULL::text),
            (4,  'error_message',    'text',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            (5,  'failed_count',     'integer',                  NULL::int, 32,        0,         'YES', NULL::text),
            (6,  'file_name',        'character varying',        255,       NULL::int, NULL::int, 'YES', NULL::text),
            (7,  'file_type',        'character varying',        255,       NULL::int, NULL::int, 'YES', NULL::text),
            (8,  'import_batch_no',  'character varying',        255,       NULL::int, NULL::int, 'YES', NULL::text),
            (9,  'import_time',      'date',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            (10, 'imported_count',   'integer',                  NULL::int, 32,        0,         'YES', NULL::text),
            (11, 'source_system',    'character varying',        255,       NULL::int, NULL::int, 'YES', NULL::text),
            (12, 'status',           'character varying',        255,       NULL::int, NULL::int, 'YES', NULL::text),
            (13, 'success_count',    'integer',                  NULL::int, 32,        0,         'YES', NULL::text),
            (14, 'tenant_id',        'uuid',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            (15, 'total_count',      'integer',                  NULL::int, 32,        0,         'YES', NULL::text),
            (16, 'updated_at',       'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            (17, 'deleted_at',       'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'YES', NULL::text)
        ) AS v(ord, col, typ, maxlen, numprec, numscale, nullable, dflt_exact)
    LOOP
        PERFORM 1
           FROM information_schema.columns
          WHERE table_schema = 'finance'
            AND table_name = 'finance_u8_import_records'
            AND ordinal_position = r.ord
            AND column_name = r.col
            AND data_type = r.typ
            AND is_nullable = r.nullable
            AND character_maximum_length IS NOT DISTINCT FROM r.maxlen
            AND numeric_precision IS NOT DISTINCT FROM r.numprec
            AND numeric_scale IS NOT DISTINCT FROM r.numscale
            AND column_default IS NOT DISTINCT FROM r.dflt_exact;
        IF NOT FOUND THEN
            RAISE EXCEPTION '后置断言失败：finance.finance_u8_import_records 第 % 列（%）形状与 dev 不一致', r.ord, r.col;
        END IF;
    END LOOP;
END $$;

-- 6. 后置断言：主键、CHECK、RLS 开关
DO $$
DECLARE
    v_pk smallint[];
    v_chk text;
    v_rls boolean;
    v_force boolean;
    v_pol int;
BEGIN
    SELECT conkey INTO v_pk FROM pg_constraint
     WHERE conrelid = 'finance.finance_u8_import_records'::regclass
       AND contype = 'p' AND conname = 'finance_u8_import_records_pkey';
    IF v_pk IS NULL OR v_pk <> ARRAY[(SELECT attnum FROM pg_attribute
                                      WHERE attrelid = 'finance.finance_u8_import_records'::regclass
                                        AND attname = 'id')]::smallint[] THEN
        RAISE EXCEPTION '后置断言失败：主键 finance_u8_import_records_pkey(id) 不正确';
    END IF;

    SELECT pg_get_constraintdef(oid) INTO v_chk FROM pg_constraint
     WHERE conrelid = 'finance.finance_u8_import_records'::regclass
       AND contype = 'c' AND conname = 'ck_finance_u8_import_records_status_standard';
    IF v_chk IS NULL
       OR v_chk NOT LIKE '%status IS NULL%'
       OR v_chk NOT LIKE '%''active''%'
       OR v_chk NOT LIKE '%''inactive''%'
       OR v_chk NOT LIKE '%''archived''%' THEN
        RAISE EXCEPTION '后置断言失败：CHECK ck_finance_u8_import_records_status_standard 与 dev 不一致（%）', coalesce(v_chk, '不存在');
    END IF;

    SELECT relrowsecurity, relforcerowsecurity INTO v_rls, v_force
      FROM pg_class WHERE oid = 'finance.finance_u8_import_records'::regclass;
    IF NOT v_rls OR NOT v_force THEN
        RAISE EXCEPTION '后置断言失败：RLS 开关与 dev 不一致（enable=% force=%）', v_rls, v_force;
    END IF;

    SELECT count(*) INTO v_pol FROM pg_policy
     WHERE polrelid = 'finance.finance_u8_import_records'::regclass
       AND polname IN ('rls_tenant_isolation','tenant_isolation_finance_u8_import_records');
    IF v_pol <> 2 THEN
        RAISE EXCEPTION '后置断言失败：RLS 策略数量与 dev 不一致（期望 2，实际 %）', v_pol;
    END IF;
END $$;
