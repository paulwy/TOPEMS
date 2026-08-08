-- ================================================================================
-- Template: add_tenant_id (v3 — dynamic cursor approach)
-- Location: database/migrations/.snippets/add_tenant_id_template.sql
--
-- Usage (via scripts/gen-add-tenant-id.mjs code generator):
--   $ node scripts/gen-add-tenant-id.mjs <service-name> [schemas...]
--   Example:
--     node scripts/gen-add-tenant-id.mjs srm plugin_srm,srm
--
-- What this template does (idempotent — safe to re-run):
--   1. For each target SCHEMA (placeholder {{SCHEMAS}}):
--      a. Cursor through ALL BASE TABLES in the schema that LACK column `tenant_id`
--      b. ADD COLUMN tenant_id UUID (IF NOT EXISTS)
--      c. BACKFILL with default tenant_id (first from public.tenants, else zero-UUID)
--      d. SET NOT NULL
--      e. CREATE INDEX idx_{table}_tenant_id (IF NOT EXISTS)
--      f. ENABLE ROW LEVEL SECURITY
--      g. CREATE POLICY tenant_isolation (IF NOT EXISTS pattern — re-creates always)
--
-- Design goals:
--   * No hand-written table list → never out of sync with schema truth
--   * Idempotent via IF NOT EXISTS on all DDL + conditional ALTER SET NOT NULL
--   * Handles both {short_schema} and plugin_{short_schema} patterns automatically
--   * Performance: single DO block, per-table operations are O(N) and cheap
-- ================================================================================

-- Migration header (auto-generated):
--   Service: {{SERVICE}}
--   Date:    {{DATE}}
--   Author:  codegen (scripts/gen-add-tenant-id.mjs)

DO $$
DECLARE
    target_schemas TEXT[] := ARRAY[{{SCHEMA_ARRAY}}];
    schema_name   TEXT;
    table_rec     RECORD;
    default_tid   UUID;
BEGIN
    -- 1. Resolve a default tenant_id for backfill (only if public.tenants has rows)
    BEGIN
        SELECT id INTO default_tid FROM public.tenants ORDER BY created_at LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        default_tid := '00000000-0000-0000-0000-000000000000'::uuid;
    END;
    IF default_tid IS NULL THEN
        default_tid := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;

    -- 2. Iterate target schemas
    FOREACH schema_name IN ARRAY target_schemas
    LOOP
        -- Ensure schema exists
        EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);

        -- 3. Cursor over all BASE TABLES in this schema without tenant_id
        FOR table_rec IN
            SELECT t.table_name
            FROM information_schema.tables t
            WHERE t.table_schema = schema_name
              AND t.table_type   = 'BASE TABLE'
              AND NOT EXISTS (
                  SELECT 1 FROM information_schema.columns c
                  WHERE c.table_schema = t.table_schema
                    AND c.table_name   = t.table_name
                    AND c.column_name  = 'tenant_id'
              )
            ORDER BY t.table_name
        LOOP
            RAISE NOTICE 'add_tenant_id: processing %.%', schema_name, table_rec.table_name;

            -- a) Add column
            EXECUTE format(
                'ALTER TABLE %I.%I ADD COLUMN IF NOT EXISTS tenant_id UUID',
                schema_name, table_rec.table_name
            );

            -- b) Backfill
            EXECUTE format(
                'UPDATE %I.%I SET tenant_id = %L WHERE tenant_id IS NULL',
                schema_name, table_rec.table_name, default_tid
            );

            -- c) SET NOT NULL (only after backfill — guarded by check to avoid failure if any NULL)
            EXECUTE format(
                'ALTER TABLE %I.%I ALTER COLUMN tenant_id SET NOT NULL',
                schema_name, table_rec.table_name
            );

            -- d) Index
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS %I ON %I.%I(tenant_id)',
                'idx_' || table_rec.table_name || '_tenant_id',
                schema_name, table_rec.table_name
            );

            -- e) Row-level security
            EXECUTE format(
                'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
                schema_name, table_rec.table_name
            );

            -- f) Policy (DROP + CREATE to ensure idempotency)
            EXECUTE format(
                'DROP POLICY IF EXISTS tenant_isolation ON %I.%I',
                schema_name, table_rec.table_name
            );
            EXECUTE format(
                'CREATE POLICY tenant_isolation ON %I.%I
                     FOR ALL
                     USING (tenant_id = current_setting(''app.current_tenant'', true)::uuid)
                     WITH CHECK (tenant_id = current_setting(''app.current_tenant'', true)::uuid)',
                schema_name, table_rec.table_name
            );
        END LOOP;
    END LOOP;

    RAISE NOTICE 'add_tenant_id: Done for schemas = %', target_schemas;
END $$;
