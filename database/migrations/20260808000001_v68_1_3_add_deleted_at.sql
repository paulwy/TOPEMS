-- ================================================================================
-- V68.1-3 Phase 2: Add deleted_at column to all business tables
-- Generated: 2026-08-08
-- Strategy: Dynamic DO block that adds deleted_at to ALL tables with an `id`
--           column that don't already have deleted_at. This is more robust than
--           hardcoding table names because:
--           1. Tables created at runtime (Rust init_database) are covered
--           2. Schema/table name mismatches are avoided
--           3. Future tables automatically get soft-delete support
-- ================================================================================

DO $$
DECLARE
    r RECORD;
    cnt INTEGER := 0;
BEGIN
    FOR r IN
        SELECT c.table_schema, c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON c.table_schema = t.table_schema AND c.table_name = t.table_name
        WHERE t.table_type = 'BASE TABLE'
          AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
          AND c.column_name = 'id'
          AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns c2
            WHERE c2.table_schema = c.table_schema
              AND c2.table_name = c.table_name
              AND c2.column_name = 'deleted_at'
          )
        ORDER BY 1, 2
    LOOP
        BEGIN
            EXECUTE format(
                'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE',
                r.table_schema, r.table_name
            );
            cnt := cnt + 1;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipped %.%: %', r.table_schema, r.table_name, SQLERRM;
        END;
    END LOOP;
    RAISE NOTICE 'V68.1-3: Added deleted_at to % tables', cnt;
END $$;

-- ================================================================================
-- Drop legacy is_deleted columns (Phase 1 cleanup, idempotent)
-- ================================================================================

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT table_schema, table_name
        FROM information_schema.columns
        WHERE column_name = 'is_deleted'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I.%I DROP COLUMN IF EXISTS is_deleted', r.table_schema, r.table_name);
            RAISE NOTICE 'Dropped is_deleted from %.%', r.table_schema, r.table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipped %.%: %', r.table_schema, r.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ================================================================================
-- Drop legacy is_deleted indexes and create deleted_at partial indexes
-- ================================================================================

DO $$
DECLARE r RECORD;
BEGIN
    -- Drop indexes that reference is_deleted
    FOR r IN
        SELECT schemaname, indexname
        FROM pg_indexes
        WHERE indexdef ILIKE '%is_deleted%'
          AND schemaname NOT IN ('pg_catalog', 'information_schema')
    LOOP
        BEGIN
            EXECUTE format('DROP INDEX IF EXISTS %I.%I', r.schemaname, r.indexname);
            RAISE NOTICE 'Dropped index %.%', r.schemaname, r.indexname;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;
