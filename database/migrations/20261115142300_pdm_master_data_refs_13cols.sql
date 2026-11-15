-- 空壳表整表对齐（5/6）· pdm · pdm.pdm_master_data_refs（补 13 列 + 唯一索引 + 状态 CHECK）
--
-- 口径：docs/database/code-schema-gap-2026-11-15.md §7.2 第 5 条、§7.3。
--
-- 现状（2026-11-15 实测）：
--   prod 2 列（id uuid NOT NULL PK / deleted_at）/ 0 行 → dev 13 列。
--   prod 唯一索引只有 pdm_master_data_refs_pkey(id)；dev 的 PK 落在
--   master_data_id 上（pdm_master_data_refs_pkey(master_data_id)），且无 id 列。
--
-- 关键：`ON CONFLICT (master_data_id)` 的推断依赖唯一索引。prod 当前没有
--   master_data_id 唯一索引 → 写入即 42P10。本迁移把「列 + 唯一索引」放在同一笔，
--   不允许拆开投产（拆开会在两笔之间留下 42P10 窗口）。
--
-- 命名取舍：dev 的唯一索引名是 pdm_master_data_refs_pkey，该名字在 prod 已被
--   PK(id) 占用，不能复用；本迁移另建 uq_pdm_master_data_refs_master_data_id。
--   功能上等价（单列唯一），ON CONFLICT (master_data_id) 可正常推断。
--   改写 prod 的 PK 列属于主键变更，不在补列范围，不做。
--
-- 代码证据（svc/pdm/src/event_handlers/mod.rs:269-281）：
--   INSERT INTO pdm_master_data_refs
--     (master_data_id, tenant_id, domain, code, name, status, source_service,
--      local_entity_type, payload_snapshot, last_synced_at, created_at, updated_at)
--   ... ON CONFLICT (master_data_id) DO UPDATE ...
--   走 Db::scope_system()（写入策略要求 app.rls_system='on'）。
--   注意源码注释写"pdm_master_data_refs 无 tenant_id"，与 INSERT 列清单及 dev 表定义
--   不符（tenant_id 实际存在且 NOT NULL）；注释为陈旧描述，本批不改代码。
--
-- 边界（本批只做止血，不做治理）：
--   * 只 ADD COLUMN + CREATE UNIQUE INDEX + ADD CONSTRAINT(CHECK)；
--   * 不改任何已有列类型/默认值、不改主键、不改代码、不改 RLS 策略。
--   * 新增列沿用 dev 默认值（status='active'、last_synced_at/created_at/updated_at=now()）。
--
-- RLS：prod relrowsecurity=true / relforcerowsecurity=true，
--   pdm_master_data_refs_read(USING true) + pdm_master_data_refs_write(需 app.rls_system='on')，
--   与 dev 逐字一致；新增列不进入谓词，补列前后可见集合与写入许可不变。
--
-- 前置断言：表存在；13 列均不存在；master_data_id 上无唯一索引/约束；CHECK 不存在；表 0 行。
-- 后置断言：13 列形状对齐 dev；唯一索引定义逐字一致；CHECK 语义一致
--   （PG 对等价写法的 deparse 文本会不同：dev 显示为 ANY ((ARRAY[...])::text[])，
--    本文件写法显示为 ANY (ARRAY[(...)::text, ...])，允许集合与判定结果相同）。
--
-- 回滚：database/rollback/20261115142300_pdm_master_data_refs_13cols.rollback.sql

-- 1. 前置断言
DO $$
DECLARE
    n bigint;
BEGIN
    IF to_regclass('pdm.pdm_master_data_refs') IS NULL THEN
        RAISE EXCEPTION '空壳表前置断言失败：pdm.pdm_master_data_refs 不存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'pdm' AND table_name = 'pdm_master_data_refs'
           AND column_name IN ('master_data_id','tenant_id','domain','code','name','status',
                               'source_service','local_entity_type','local_entity_id',
                               'payload_snapshot','last_synced_at','created_at','updated_at')
    ) THEN
        RAISE EXCEPTION '空壳表前置断言失败：pdm.pdm_master_data_refs 已有本次要补的列，本迁移只补缺失列';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_index i
          JOIN pg_class c ON c.oid = i.indexrelid
         WHERE i.indrelid = 'pdm.pdm_master_data_refs'::regclass
           AND i.indisunique
           AND i.indnkeyatts = 1
           AND i.indkey[0] = (SELECT attnum FROM pg_attribute
                               WHERE attrelid = 'pdm.pdm_master_data_refs'::regclass
                                 AND attname = 'master_data_id')
    ) THEN
        RAISE EXCEPTION '前置断言失败：master_data_id 上已存在唯一索引，ON CONFLICT 目标已可用';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
         WHERE conrelid = 'pdm.pdm_master_data_refs'::regclass
           AND conname = 'ck_pdm_master_data_refs_status_standard'
    ) THEN
        RAISE EXCEPTION '前置断言失败：CHECK 约束 ck_pdm_master_data_refs_status_standard 已存在';
    END IF;

    EXECUTE 'SELECT count(*) FROM pdm.pdm_master_data_refs' INTO n;
    IF n <> 0 THEN
        RAISE EXCEPTION '空壳表前置断言失败：pdm.pdm_master_data_refs 有 % 行，含多个 NOT NULL 无默认列，禁止直接加', n;
    END IF;
END $$;

-- 2. 补列（列定义与 dev 一致；顺序按 dev ordinal_position）
ALTER TABLE pdm.pdm_master_data_refs
    ADD COLUMN IF NOT EXISTS master_data_id   varchar(128) NOT NULL,
    ADD COLUMN IF NOT EXISTS tenant_id        uuid         NOT NULL,
    ADD COLUMN IF NOT EXISTS domain           varchar(32)  NOT NULL,
    ADD COLUMN IF NOT EXISTS code             varchar(128) NOT NULL,
    ADD COLUMN IF NOT EXISTS name             varchar(256),
    ADD COLUMN IF NOT EXISTS status           varchar(32)  DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS source_service   varchar(64)  NOT NULL,
    ADD COLUMN IF NOT EXISTS local_entity_type varchar(64),
    ADD COLUMN IF NOT EXISTS local_entity_id  uuid,
    ADD COLUMN IF NOT EXISTS payload_snapshot jsonb,
    ADD COLUMN IF NOT EXISTS last_synced_at   timestamptz  DEFAULT now(),
    ADD COLUMN IF NOT EXISTS created_at       timestamptz  NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at       timestamptz  NOT NULL DEFAULT now();

-- 3. ON CONFLICT (master_data_id) 依赖的唯一索引（与补列同一笔，避免 42P10 窗口）
CREATE UNIQUE INDEX uq_pdm_master_data_refs_master_data_id
    ON pdm.pdm_master_data_refs USING btree (master_data_id);

-- 4. 状态取值约束（定义逐字取自 dev）
ALTER TABLE pdm.pdm_master_data_refs
    ADD CONSTRAINT ck_pdm_master_data_refs_status_standard
    CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying,
             'inactive'::character varying, 'archived'::character varying])::text[]))));

-- 5. 后置断言：13 列形状与 dev 逐项一致
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('master_data_id',    'character varying',        128, NULL::int, NULL::int, 'NO',  NULL::text),
            ('tenant_id',         'uuid',                     NULL::int, NULL::int, NULL::int, 'NO',  NULL::text),
            ('domain',            'character varying',        32,  NULL::int, NULL::int, 'NO',  NULL::text),
            ('code',              'character varying',        128, NULL::int, NULL::int, 'NO',  NULL::text),
            ('name',              'character varying',        256, NULL::int, NULL::int, 'YES', NULL::text),
            ('status',            'character varying',        32,  NULL::int, NULL::int, 'YES', '''active''::character varying'),
            ('source_service',    'character varying',        64,  NULL::int, NULL::int, 'NO',  NULL::text),
            ('local_entity_type', 'character varying',        64,  NULL::int, NULL::int, 'YES', NULL::text),
            ('local_entity_id',   'uuid',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            ('payload_snapshot',  'jsonb',                    NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            ('last_synced_at',    'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'YES', 'now()'),
            ('created_at',        'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'NO',  'now()'),
            ('updated_at',        'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'NO',  'now()')
        ) AS v(col, typ, maxlen, numprec, numscale, nullable, dflt_exact)
    LOOP
        PERFORM 1
           FROM information_schema.columns
          WHERE table_schema = 'pdm'
            AND table_name = 'pdm_master_data_refs'
            AND column_name = r.col
            AND data_type = r.typ
            AND is_nullable = r.nullable
            AND character_maximum_length IS NOT DISTINCT FROM r.maxlen
            AND numeric_precision IS NOT DISTINCT FROM r.numprec
            AND numeric_scale IS NOT DISTINCT FROM r.numscale
            AND column_default IS NOT DISTINCT FROM r.dflt_exact;
        IF NOT FOUND THEN
            RAISE EXCEPTION '空壳表后置断言失败：pdm.pdm_master_data_refs.% 形状与 dev 定义不一致', r.col;
        END IF;
    END LOOP;
END $$;

-- 6. 后置断言：唯一索引与 CHECK 定义正确
DO $$
DECLARE
    v_def text;
    v_chk text;
BEGIN
    SELECT pg_get_indexdef(c.oid) INTO v_def
      FROM pg_class c
     WHERE c.oid = 'pdm.uq_pdm_master_data_refs_master_data_id'::regclass;
    IF v_def IS NULL
       OR v_def <> 'CREATE UNIQUE INDEX uq_pdm_master_data_refs_master_data_id ON pdm.pdm_master_data_refs USING btree (master_data_id)' THEN
        RAISE EXCEPTION '空壳表后置断言失败：唯一索引 uq_pdm_master_data_refs_master_data_id 定义不正确（%），ON CONFLICT 目标不可用', coalesce(v_def, '不存在');
    END IF;

    SELECT pg_get_constraintdef(oid) INTO v_chk
      FROM pg_constraint
     WHERE conrelid = 'pdm.pdm_master_data_refs'::regclass
       AND contype = 'c'
       AND conname = 'ck_pdm_master_data_refs_status_standard';
    IF v_chk IS NULL
       OR v_chk NOT LIKE '%status IS NULL%'
       OR v_chk NOT LIKE '%''active''%'
       OR v_chk NOT LIKE '%''inactive''%'
       OR v_chk NOT LIKE '%''archived''%' THEN
        RAISE EXCEPTION '空壳表后置断言失败：CHECK 约束 ck_pdm_master_data_refs_status_standard 语义与 dev 不一致（%）', coalesce(v_chk, '不存在');
    END IF;
END $$;
