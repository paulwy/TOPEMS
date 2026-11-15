-- 空壳表整表对齐（6/6）· public · cqrs_events(8 列) + search_logs(5 列) + analytics_sync_records(12 列)
--
-- 口径：docs/database/code-schema-gap-2026-11-15.md §7.2 第 7/8/9 条、§7.3。
--
-- 现状（2026-11-15 实测，三表 prod 均 0 行）：
--   public.cqrs_events              prod 4 列（id/tenant_id/created_at/updated_at）→ dev 10 列，缺 8
--   public.search_logs              prod 3 列（id/deleted_at/query）→ dev 8 列，缺 5
--   public.analytics_sync_records   prod 2 列（id/deleted_at）→ dev 14 列，缺 12
--   prod 三表均只有 PK 索引；business 索引全部缺失（search_logs 的 idx_search_logs_query
--   虽在 dev 存在，prod 也没有——query 列已由 20261115141800 补上，索引留到本批）。
--
-- 为什么三表同一版本：都是平台级空壳表、纯加列加索引、互无引用；已按「单批单版本」
--   排期，拆版本只增加投产次数与观测成本，不改变回滚粒度（rollback 单文件按表逆序）。
--
-- 代码证据：
--   public.cqrs_events            事件总线写入；`(aggregate_id, version)` 唯一性是并发正确性依赖
--   public.search_logs            svc/search/src/handlers.rs:479/496（搜索日志写入/聚合读）
--   public.analytics_sync_records 同步任务状态写入（data_source_id/status/sync_type/…）
--   补列 + 补索引后，这些路径在列层面齐备；结构体映射类盲区（SELECT *）不在本批承诺内。
--
-- 边界（本批只做止血，不做治理）：
--   * 只 ADD COLUMN + ADD CONSTRAINT(UNIQUE) + CREATE INDEX；
--   * 不改任何已有列类型/默认值、不改代码、不改 RLS 策略（prod search_logs /
--     analytics_sync_records 当前 rls=false，与 dev 的策略差异属后续批次，本批不收敛）。
--
-- 前置断言：三表存在；目标列均不存在；目标索引/唯一约束不存在；三表均 0 行。
-- 后置断言：列形状逐项对齐 dev；索引定义逐字一致；唯一约束列正确。
--
-- 回滚：database/rollback/20261115142400_public_platform_3tables_25cols.rollback.sql

-- 1. 前置断言
DO $$
DECLARE
    n bigint;
BEGIN
    IF to_regclass('public.cqrs_events') IS NULL
       OR to_regclass('public.search_logs') IS NULL
       OR to_regclass('public.analytics_sync_records') IS NULL THEN
        RAISE EXCEPTION '空壳表前置断言失败：public.cqrs_events / search_logs / analytics_sync_records 不全存在';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'cqrs_events'
           AND column_name IN ('aggregate_id','aggregate_type','event_type','version',
                               'payload','metadata','occurred_at','deleted_at')
    ) THEN
        RAISE EXCEPTION '前置断言失败：public.cqrs_events 已有本次要补的列';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'search_logs'
           AND column_name IN ('tenant_id','user_id','result_count','duration_ms','created_at')
    ) THEN
        RAISE EXCEPTION '前置断言失败：public.search_logs 已有本次要补的列';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'analytics_sync_records'
           AND column_name IN ('data_source_id','status','sync_type','records_count','affected_records',
                               'error_message','started_at','completed_at','duration_ms',
                               'created_at','updated_at','tenant_id')
    ) THEN
        RAISE EXCEPTION '前置断言失败：public.analytics_sync_records 已有本次要补的列';
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n2 ON n2.oid = c.relnamespace
         WHERE n2.nspname = 'public' AND c.relname IN (
               'cqrs_events_aggregate_id_version_key','idx_cqrs_events_aggregate',
               'idx_cqrs_events_occurred','idx_cqrs_events_type',
               'idx_search_logs_created','idx_search_logs_query','idx_search_logs_tenant',
               'idx_sync_records_datasource','idx_sync_records_started_at',
               'idx_sync_records_status','idx_sync_records_type')
    ) THEN
        RAISE EXCEPTION '前置断言失败：public 三表目标索引/唯一约束已存在';
    END IF;

    EXECUTE 'SELECT count(*) FROM public.cqrs_events' INTO n;
    IF n <> 0 THEN
        RAISE EXCEPTION '空壳表前置断言失败：public.cqrs_events 有 % 行，含 NOT NULL 无默认列，禁止直接加', n;
    END IF;
    EXECUTE 'SELECT count(*) FROM public.search_logs' INTO n;
    IF n <> 0 THEN
        RAISE EXCEPTION '空壳表前置断言失败：public.search_logs 有 % 行，含 NOT NULL 无默认列，禁止直接加', n;
    END IF;
    EXECUTE 'SELECT count(*) FROM public.analytics_sync_records' INTO n;
    IF n <> 0 THEN
        RAISE EXCEPTION '空壳表前置断言失败：public.analytics_sync_records 有 % 行，含 NOT NULL 无默认列，禁止直接加', n;
    END IF;
END $$;

-- 2. public.cqrs_events 补 8 列（顺序按 dev ordinal_position）
ALTER TABLE public.cqrs_events
    ADD COLUMN IF NOT EXISTS aggregate_id   varchar(64)  NOT NULL,
    ADD COLUMN IF NOT EXISTS aggregate_type varchar(32)  NOT NULL,
    ADD COLUMN IF NOT EXISTS event_type     varchar(64)  NOT NULL,
    ADD COLUMN IF NOT EXISTS version        bigint       NOT NULL,
    ADD COLUMN IF NOT EXISTS payload        jsonb        NOT NULL,
    ADD COLUMN IF NOT EXISTS metadata       jsonb        DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS occurred_at    timestamptz  NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS deleted_at     timestamptz;

-- 3. public.search_logs 补 5 列
ALTER TABLE public.search_logs
    ADD COLUMN IF NOT EXISTS tenant_id    uuid,
    ADD COLUMN IF NOT EXISTS user_id      uuid,
    ADD COLUMN IF NOT EXISTS result_count integer      DEFAULT 0,
    ADD COLUMN IF NOT EXISTS duration_ms  integer      DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at   timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 4. public.analytics_sync_records 补 12 列
ALTER TABLE public.analytics_sync_records
    ADD COLUMN IF NOT EXISTS data_source_id   uuid,
    ADD COLUMN IF NOT EXISTS status           varchar(32) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS sync_type        varchar(64) NOT NULL,
    ADD COLUMN IF NOT EXISTS records_count    bigint,
    ADD COLUMN IF NOT EXISTS affected_records bigint,
    ADD COLUMN IF NOT EXISTS error_message    text,
    ADD COLUMN IF NOT EXISTS started_at       timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS completed_at     timestamptz,
    ADD COLUMN IF NOT EXISTS duration_ms      bigint,
    ADD COLUMN IF NOT EXISTS created_at       timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at       timestamptz DEFAULT now(),
    ADD COLUMN IF NOT EXISTS tenant_id        uuid;

-- 5. 唯一约束（聚合版本并发正确性依赖）
ALTER TABLE public.cqrs_events
    ADD CONSTRAINT cqrs_events_aggregate_id_version_key UNIQUE (aggregate_id, version);

-- 6. 索引（定义逐字取自 dev pg_indexes）
CREATE INDEX idx_cqrs_events_aggregate ON public.cqrs_events USING btree (aggregate_id, version);
CREATE INDEX idx_cqrs_events_occurred  ON public.cqrs_events USING btree (occurred_at);
CREATE INDEX idx_cqrs_events_type      ON public.cqrs_events USING btree (aggregate_type, occurred_at);

CREATE INDEX idx_search_logs_created ON public.search_logs USING btree (created_at DESC);
CREATE INDEX idx_search_logs_query   ON public.search_logs USING btree (query);
CREATE INDEX idx_search_logs_tenant  ON public.search_logs USING btree (tenant_id);

CREATE INDEX idx_sync_records_datasource ON public.analytics_sync_records USING btree (data_source_id);
CREATE INDEX idx_sync_records_started_at ON public.analytics_sync_records USING btree (started_at);
CREATE INDEX idx_sync_records_status     ON public.analytics_sync_records USING btree (status);
CREATE INDEX idx_sync_records_type       ON public.analytics_sync_records USING btree (sync_type);

-- 7. 后置断言：列形状与 dev 逐项一致
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('cqrs_events','aggregate_id',    'character varying',        64,  NULL::int, NULL::int, 'NO',  NULL::text),
            ('cqrs_events','aggregate_type',  'character varying',        32,  NULL::int, NULL::int, 'NO',  NULL::text),
            ('cqrs_events','event_type',      'character varying',        64,  NULL::int, NULL::int, 'NO',  NULL::text),
            ('cqrs_events','version',         'bigint',                    NULL::int, 64, 0,         'NO',  NULL::text),
            ('cqrs_events','payload',         'jsonb',                     NULL::int, NULL::int, NULL::int, 'NO',  NULL::text),
            ('cqrs_events','metadata',        'jsonb',                     NULL::int, NULL::int, NULL::int, 'YES', '''{}''::jsonb'),
            ('cqrs_events','occurred_at',     'timestamp with time zone',   NULL::int, NULL::int, NULL::int, 'NO',  'now()'),
            ('cqrs_events','deleted_at',      'timestamp with time zone',   NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            ('search_logs','tenant_id',       'uuid',                       NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            ('search_logs','user_id',         'uuid',                       NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            ('search_logs','result_count',    'integer',                    NULL::int, 32, 0,         'YES', '0'),
            ('search_logs','duration_ms',     'integer',                    NULL::int, 32, 0,         'YES', '0'),
            ('search_logs','created_at',      'timestamp with time zone',   NULL::int, NULL::int, NULL::int, 'NO',  'CURRENT_TIMESTAMP'),
            ('analytics_sync_records','data_source_id',   'uuid',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            ('analytics_sync_records','status',           'character varying',        32,  NULL::int, NULL::int, 'NO',  '''pending''::character varying'),
            ('analytics_sync_records','sync_type',        'character varying',        64,  NULL::int, NULL::int, 'NO',  NULL::text),
            ('analytics_sync_records','records_count',    'bigint',                   NULL::int, 64, 0,         'YES', NULL::text),
            ('analytics_sync_records','affected_records', 'bigint',                   NULL::int, 64, 0,         'YES', NULL::text),
            ('analytics_sync_records','error_message',    'text',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            ('analytics_sync_records','started_at',       'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'NO',  'now()'),
            ('analytics_sync_records','completed_at',     'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'YES', NULL::text),
            ('analytics_sync_records','duration_ms',      'bigint',                   NULL::int, 64, 0,         'YES', NULL::text),
            ('analytics_sync_records','created_at',       'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'YES', 'now()'),
            ('analytics_sync_records','updated_at',       'timestamp with time zone', NULL::int, NULL::int, NULL::int, 'YES', 'now()'),
            ('analytics_sync_records','tenant_id',        'uuid',                     NULL::int, NULL::int, NULL::int, 'YES', NULL::text)
        ) AS v(tbl, col, typ, maxlen, numprec, numscale, nullable, dflt_exact)
    LOOP
        PERFORM 1
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = r.tbl
            AND column_name = r.col
            AND data_type = r.typ
            AND is_nullable = r.nullable
            AND character_maximum_length IS NOT DISTINCT FROM r.maxlen
            AND numeric_precision IS NOT DISTINCT FROM r.numprec
            AND numeric_scale IS NOT DISTINCT FROM r.numscale
            AND column_default IS NOT DISTINCT FROM r.dflt_exact;
        IF NOT FOUND THEN
            RAISE EXCEPTION '空壳表后置断言失败：public.%.% 形状与 dev 定义不一致', r.tbl, r.col;
        END IF;
    END LOOP;
END $$;

-- 8. 后置断言：唯一约束列正确
DO $$
DECLARE
    v_conkey smallint[];
BEGIN
    SELECT conkey INTO v_conkey
      FROM pg_constraint
     WHERE conrelid = 'public.cqrs_events'::regclass
       AND contype = 'u'
       AND conname = 'cqrs_events_aggregate_id_version_key';

    IF v_conkey IS NULL
       OR v_conkey <> ARRAY[
             (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.cqrs_events'::regclass AND attname = 'aggregate_id'),
             (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.cqrs_events'::regclass AND attname = 'version')
          ]::smallint[] THEN
        RAISE EXCEPTION '空壳表后置断言失败：唯一约束 cqrs_events_aggregate_id_version_key 定义与 dev 不一致';
    END IF;
END $$;

-- 9. 后置断言：11 只索引定义与 dev 逐字一致
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT * FROM (VALUES
            ('cqrs_events_aggregate_id_version_key', 'CREATE UNIQUE INDEX cqrs_events_aggregate_id_version_key ON public.cqrs_events USING btree (aggregate_id, version)'),
            ('idx_cqrs_events_aggregate', 'CREATE INDEX idx_cqrs_events_aggregate ON public.cqrs_events USING btree (aggregate_id, version)'),
            ('idx_cqrs_events_occurred',  'CREATE INDEX idx_cqrs_events_occurred ON public.cqrs_events USING btree (occurred_at)'),
            ('idx_cqrs_events_type',      'CREATE INDEX idx_cqrs_events_type ON public.cqrs_events USING btree (aggregate_type, occurred_at)'),
            ('idx_search_logs_created',   'CREATE INDEX idx_search_logs_created ON public.search_logs USING btree (created_at DESC)'),
            ('idx_search_logs_query',     'CREATE INDEX idx_search_logs_query ON public.search_logs USING btree (query)'),
            ('idx_search_logs_tenant',    'CREATE INDEX idx_search_logs_tenant ON public.search_logs USING btree (tenant_id)'),
            ('idx_sync_records_datasource','CREATE INDEX idx_sync_records_datasource ON public.analytics_sync_records USING btree (data_source_id)'),
            ('idx_sync_records_started_at','CREATE INDEX idx_sync_records_started_at ON public.analytics_sync_records USING btree (started_at)'),
            ('idx_sync_records_status',   'CREATE INDEX idx_sync_records_status ON public.analytics_sync_records USING btree (status)'),
            ('idx_sync_records_type',     'CREATE INDEX idx_sync_records_type ON public.analytics_sync_records USING btree (sync_type)')
        ) AS v(idx, def)
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c JOIN pg_namespace n2 ON n2.oid = c.relnamespace
             WHERE n2.nspname = 'public' AND c.relname = r.idx
               AND pg_get_indexdef(c.oid) = r.def
        ) THEN
            RAISE EXCEPTION '空壳表后置断言失败：索引 public.% 定义与 dev 不一致', r.idx;
        END IF;
    END LOOP;
END $$;
