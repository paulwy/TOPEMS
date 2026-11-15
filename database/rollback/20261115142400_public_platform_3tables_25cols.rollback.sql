-- 回滚：20261115142400_public_platform_3tables_25cols.sql
-- 空壳表整表对齐（6/6）· public.cqrs_events + search_logs + analytics_sync_records
--
-- 表序：cqrs_events → search_logs → analytics_sync_records（与迁移一致，表间无引用）。
-- 每表顺序：唯一约束（仅 cqrs_events）→ 索引 → 列。
-- 逐列规则：仅当列内无任何非空值才 DROP；存在非空值则保留并 RAISE NOTICE，不静默丢数据。
-- 不动迁移前的既有列、不动 PK、不改策略、不改表。
-- destructive-gate: 允许（本文件为回滚脚本，不在前向链执行）

DO $$
DECLARE
    cqrs_idx text[] := ARRAY[
        'idx_cqrs_events_aggregate','idx_cqrs_events_occurred','idx_cqrs_events_type'
    ];
    cqrs_cols text[] := ARRAY[
        'aggregate_id','aggregate_type','event_type','version',
        'payload','metadata','occurred_at','deleted_at'
    ];
    sl_idx text[] := ARRAY[
        'idx_search_logs_created','idx_search_logs_query','idx_search_logs_tenant'
    ];
    sl_cols text[] := ARRAY[
        'tenant_id','user_id','result_count','duration_ms','created_at'
    ];
    an_idx text[] := ARRAY[
        'idx_sync_records_datasource','idx_sync_records_started_at',
        'idx_sync_records_status','idx_sync_records_type'
    ];
    an_cols text[] := ARRAY[
        'data_source_id','status','sync_type','records_count','affected_records',
        'error_message','started_at','completed_at','duration_ms',
        'created_at','updated_at','tenant_id'
    ];
    i text;
    n bigint;
BEGIN
    -- 1. cqrs_events
    IF to_regclass('public.cqrs_events') IS NOT NULL THEN
        ALTER TABLE public.cqrs_events
            DROP CONSTRAINT IF EXISTS cqrs_events_aggregate_id_version_key;
        FOREACH i IN ARRAY cqrs_idx LOOP
            EXECUTE format('DROP INDEX IF EXISTS public.%I', i);
        END LOOP;
        FOREACH i IN ARRAY cqrs_cols LOOP
            IF EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='cqrs_events' AND column_name=i) THEN
                EXECUTE format('SELECT count(*) FROM public.cqrs_events WHERE %I IS NOT NULL', i) INTO n;
                IF n = 0 THEN
                    EXECUTE format('ALTER TABLE public.cqrs_events DROP COLUMN IF EXISTS %I', i);
                ELSE
                    RAISE NOTICE '保留列 cqrs_events.%：存在 % 行非空值', i, n;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- 2. search_logs
    IF to_regclass('public.search_logs') IS NOT NULL THEN
        FOREACH i IN ARRAY sl_idx LOOP
            EXECUTE format('DROP INDEX IF EXISTS public.%I', i);
        END LOOP;
        FOREACH i IN ARRAY sl_cols LOOP
            IF EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='search_logs' AND column_name=i) THEN
                EXECUTE format('SELECT count(*) FROM public.search_logs WHERE %I IS NOT NULL', i) INTO n;
                IF n = 0 THEN
                    EXECUTE format('ALTER TABLE public.search_logs DROP COLUMN IF EXISTS %I', i);
                ELSE
                    RAISE NOTICE '保留列 search_logs.%：存在 % 行非空值', i, n;
                END IF;
            END IF;
        END LOOP;
    END IF;

    -- 3. analytics_sync_records
    IF to_regclass('public.analytics_sync_records') IS NOT NULL THEN
        FOREACH i IN ARRAY an_idx LOOP
            EXECUTE format('DROP INDEX IF EXISTS public.%I', i);
        END LOOP;
        FOREACH i IN ARRAY an_cols LOOP
            IF EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema='public' AND table_name='analytics_sync_records' AND column_name=i) THEN
                EXECUTE format('SELECT count(*) FROM public.analytics_sync_records WHERE %I IS NOT NULL', i) INTO n;
                IF n = 0 THEN
                    EXECUTE format('ALTER TABLE public.analytics_sync_records DROP COLUMN IF EXISTS %I', i);
                ELSE
                    RAISE NOTICE '保留列 analytics_sync_records.%：存在 % 行非空值', i, n;
                END IF;
            END IF;
        END LOOP;
    END IF;
END $$;
