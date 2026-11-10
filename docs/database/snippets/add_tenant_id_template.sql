-- ================================================================================
-- Template: add_tenant_id (v3 — dynamic cursor approach)
-- Location: database/migrations/.snippets/add_tenant_id_template.sql
--
-- Usage (via scripts/gen-add-tenant-id.mjs code generator):
--   $ node scripts/gen-add-tenant-id.mjs <service-name> [schemas...]
--   Example:
--     node scripts/gen-add-tenant-id.mjs srm srm
--
-- What this template does (idempotent — safe to re-run):
--   1. For each target SCHEMA (placeholder {{SCHEMAS}}):
--      a. Cursor through ALL BASE TABLES in the schema that LACK column `tenant_id`
--      b. ADD COLUMN tenant_id UUID (IF NOT EXISTS)
--      c. BACKFILL with default tenant_id (first from public.tenants, else zero-UUID)
--      d. SET NOT NULL
--      e. CREATE INDEX idx_{table}_tenant_id (IF NOT EXISTS)
--      f. ENABLE + FORCE ROW LEVEL SECURITY   ← 二者必须成对，缺 FORCE 等于没做隔离
--      g. CREATE POLICY tenant_isolation (IF NOT EXISTS pattern — re-creates always)
--
-- ⚠️ FORCE 不可省略（W7-B4 根因修复）：表 owner 在未 FORCE 时会完全绕过 RLS，
--    策略写得再严也形同不存在。`scripts/ci/check-rls-policy-shape.sh` 会对
--    "出现 ENABLE ROW LEVEL SECURITY 但无对应 FORCE ROW LEVEL SECURITY" 的迁移直接判红。
-- ⚠️ GUC 名必须是 app.tenant_id（全仓唯一真相源，见 lib/shared-db/src/rls.rs）；
--    历史模板误用 app.current_tenant，导致谓词恒为 NULL、表对所有租户恒 0 行。
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

            -- e) Row-level security —— ENABLE 与 FORCE 必须成对，缺 FORCE 等于没做隔离
            EXECUTE format(
                'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
                schema_name, table_rec.table_name
            );
            EXECUTE format(
                'ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',
                schema_name, table_rec.table_name
            );

            -- f) Policy (DROP + CREATE to ensure idempotency)
            --    fail-closed：GUC 未设置 / 被 RESET 成空串 → NULLIF 为 NULL → 全拒。
            EXECUTE format(
                'DROP POLICY IF EXISTS tenant_isolation ON %I.%I',
                schema_name, table_rec.table_name
            );
            EXECUTE format(
                'CREATE POLICY tenant_isolation ON %I.%I
                     FOR ALL
                     USING (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)
                     WITH CHECK (tenant_id = NULLIF(current_setting(''app.tenant_id'', true), '''')::uuid)',
                schema_name, table_rec.table_name
            );
        END LOOP;
    END LOOP;

    RAISE NOTICE 'add_tenant_id: Done for schemas = %', target_schemas;
END $$;
