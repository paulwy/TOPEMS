-- ================================================================================
-- P3-2: Add CHECK(status IN ('active','inactive','archived')) to qualifying tables
-- Generated: 2026-08-08
--
-- Strategy: Dynamic DO block that ONLY adds the constraint to tables where
--           ALL existing status values are within the allowed enum.
--           Tables with domain-specific status (pending, confirmed, draft, etc.)
--           are silently skipped.
--
-- Safety:
--   1. Checks existing data before adding constraint
--   2. Wrapped in EXCEPTION handler — never fails the migration
--   3. Uses named constraint: ck_{table}_status_standard
-- ================================================================================

DO $$
DECLARE
    r RECORD;
    cnt INTEGER := 0;
    skipped INTEGER := 0;
BEGIN
    FOR r IN
        SELECT c.table_schema, c.table_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON c.table_schema = t.table_schema AND c.table_name = t.table_name
        WHERE t.table_type = 'BASE TABLE'
          AND t.table_schema NOT IN ('pg_catalog', 'information_schema')
          AND c.column_name = 'status'
          AND c.data_type IN ('character varying', 'text')
          -- Skip tables that already have a status check constraint
          AND NOT EXISTS (
            SELECT 1 FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
            WHERE nsp.nspname = c.table_schema
              AND rel.relname = c.table_name
              AND con.contype = 'c'
              AND con.conname LIKE '%status%'
          )
        ORDER BY 1, 2
    LOOP
        BEGIN
            -- Check if all existing values are within the allowed set
            EXECUTE format(
                'SELECT COUNT(*) FROM %I.%I WHERE status IS NOT NULL AND status NOT IN (''active'', ''inactive'', ''archived'')',
                r.table_schema, r.table_name
            ) INTO cnt;

            IF cnt = 0 THEN
                -- Safe to add constraint
                EXECUTE format(
                    'ALTER TABLE %I.%I ADD CONSTRAINT ck_%s_status_standard CHECK (status IS NULL OR status IN (''active'', ''inactive'', ''archived''))',
                    r.table_schema, r.table_name, r.table_name
                );
                RAISE NOTICE 'Added status CHECK to %.%', r.table_schema, r.table_name;
            ELSE
                skipped := skipped + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipped %.%: %', r.table_schema, r.table_name, SQLERRM;
            skipped := skipped + 1;
        END;
    END LOOP;
    RAISE NOTICE 'P3-2: Added status CHECK to % tables, skipped % (non-standard status values)', cnt, skipped;
END $$;
