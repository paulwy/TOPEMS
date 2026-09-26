-- V69.1 P3-3 Phase 3: organization_id semantic unification
--
-- Transformation rules:
--   CRM/WMS      → RENAME organization_id TO org_id  (org hierarchy)
--   HRM/GIS/AI   → DROP organization_id               (tenant_id already backfilled from it)
--   SRM/PM/SCM   → DROP organization_id               (tenant_id already exists)
--   ERP (Phase 1 tables) → DROP organization_id        (tenant_id added in Phase 1)
--   ERP (main schema)    → RENAME organization_id TO tenant_id (was acting as tenant_id)
--   HRM init tables      → RENAME organization_id TO tenant_id (no tenant_id column)
--   public.* ERP tables  → RENAME organization_id TO tenant_id (no tenant_id column)
--
-- Safety: all operations use dynamic DO blocks that check information_schema.
-- Idempotent: IF EXISTS guards and conditional checks allow re-execution.

-- ============================================
-- Part A: Rename organization_id → org_id in CRM and WMS schemas
-- ============================================
DO $$
DECLARE
    t record;
BEGIN
    FOR t IN
        SELECT table_schema, table_name
        FROM information_schema.columns
        WHERE column_name = 'organization_id'
          AND table_schema IN ('crm', 'wms')
          AND table_schema NOT IN ('information_schema', 'pg_catalog')
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = t.table_schema AND table_name = t.table_name AND column_name = 'org_id'
        ) THEN
            EXECUTE format('ALTER TABLE %I.%I RENAME COLUMN organization_id TO org_id', t.table_schema, t.table_name);
            RAISE NOTICE 'Renamed %.%.organization_id → org_id', t.table_schema, t.table_name;
        ELSE
            RAISE NOTICE 'Skip %.%.organization_id (org_id already exists)', t.table_schema, t.table_name;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- Part B: Rename indexes in CRM/WMS (organization_id → org_id)
-- ============================================
DO $$
DECLARE
    idx record;
    new_name text;
BEGIN
    FOR idx IN
        SELECT schemaname, indexname
        FROM pg_indexes
        WHERE schemaname IN ('crm', 'wms')
          AND indexname LIKE '%organization_id%'
    LOOP
        new_name := replace(idx.indexname, 'organization_id', 'org_id');
        EXECUTE format('ALTER INDEX IF EXISTS %I.%I RENAME TO %I', idx.schemaname, idx.indexname, new_name);
        RAISE NOTICE 'Renamed index %.% → %', idx.schemaname, idx.indexname, new_name;
    END LOOP;
END $$;

-- ============================================
-- Part C: DROP organization_id from tables that ALSO have tenant_id
-- (HRM, GIS, AI, SRM, PM, SCM, ERP consolidation tables)
-- CASCADE drops dependent indexes automatically.
-- ============================================
DO $$
DECLARE
    t record;
BEGIN
    FOR t IN
        SELECT c1.table_schema, c1.table_name
        FROM information_schema.columns c1
        WHERE c1.column_name = 'organization_id'
          AND c1.table_schema NOT IN ('information_schema', 'pg_catalog', 'crm', 'wms')
          AND EXISTS (
              SELECT 1 FROM information_schema.columns c2
              WHERE c2.table_schema = c1.table_schema
                AND c2.table_name = c1.table_name
                AND c2.column_name = 'tenant_id'
          )
    LOOP
        EXECUTE format('ALTER TABLE %I.%I DROP COLUMN IF EXISTS organization_id CASCADE', t.table_schema, t.table_name);
        RAISE NOTICE 'Dropped organization_id from %.%', t.table_schema, t.table_name;
    END LOOP;
END $$;

-- ============================================
-- Part D: RENAME organization_id → tenant_id for tables WITHOUT tenant_id
-- (ERP main schema tables, HRM initialization tables, public.* ERP tables)
-- These tables used organization_id as their tenant isolation key.
-- ============================================
DO $$
DECLARE
    t record;
BEGIN
    FOR t IN
        SELECT c1.table_schema, c1.table_name
        FROM information_schema.columns c1
        WHERE c1.column_name = 'organization_id'
          AND c1.table_schema NOT IN ('information_schema', 'pg_catalog', 'crm', 'wms')
          AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns c2
              WHERE c2.table_schema = c1.table_schema
                AND c2.table_name = c1.table_name
                AND c2.column_name = 'tenant_id'
          )
    LOOP
        EXECUTE format('ALTER TABLE %I.%I RENAME COLUMN organization_id TO tenant_id', t.table_schema, t.table_name);
        RAISE NOTICE 'Renamed %.%.organization_id → tenant_id', t.table_schema, t.table_name;
    END LOOP;
END $$;

-- ============================================
-- Part E: Rename indexes for Part D (organization_id → tenant_id)
-- ============================================
DO $$
DECLARE
    idx record;
    new_name text;
BEGIN
    FOR idx IN
        SELECT schemaname, indexname
        FROM pg_indexes
        WHERE indexname LIKE '%organization_id%'
          AND schemaname NOT IN ('information_schema', 'pg_catalog', 'crm', 'wms')
    LOOP
        new_name := replace(idx.indexname, 'organization_id', 'tenant_id');
        EXECUTE format('ALTER INDEX IF EXISTS %I.%I RENAME TO %I', idx.schemaname, idx.indexname, new_name);
        RAISE NOTICE 'Renamed index %.% → %', idx.schemaname, idx.indexname, new_name;
    END LOOP;
END $$;

-- ============================================
-- Part F: Recreate HRM employee unique index with tenant_id
-- The original idx_employees_employee_number_unique used organization_id.
-- It was dropped by CASCADE in Part C. Recreate with tenant_id.
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_employee_number_unique
    ON hrm.employees(employee_number, tenant_id) WHERE deleted_at IS NULL;

-- ============================================
-- Part G: Recreate HRM initialization_status unique constraint
-- The original UNIQUE(organization_id, step_name) was auto-updated to
-- UNIQUE(tenant_id, step_name) by RENAME COLUMN, but the constraint name
-- still references organization_id. Drop and recreate with a clean name.
-- ============================================
DO $$
DECLARE
    old_constraint_name text;
BEGIN
    SELECT conname INTO old_constraint_name
    FROM pg_constraint
    WHERE conrelid = 'hrm.initialization_status'::regclass
      AND contype = 'u'
      AND conname LIKE '%organization_id%';

    IF old_constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE hrm.initialization_status DROP CONSTRAINT IF EXISTS %I', old_constraint_name);
        ALTER TABLE hrm.initialization_status
            ADD CONSTRAINT idx_init_status_tenant_step_unique UNIQUE(tenant_id, step_name);
        RAISE NOTICE 'Recreated initialization_status unique constraint with tenant_id';
    END IF;
END $$;

-- ============================================
-- Verification: ensure no organization_id columns remain
-- (except in CRM/WMS where they are now org_id)
-- ============================================
-- This is a read-only check; it will show any remaining organization_id columns.
DO $$
DECLARE
    remaining integer;
BEGIN
    SELECT count(*) INTO remaining
    FROM information_schema.columns
    WHERE column_name = 'organization_id'
      AND table_schema NOT IN ('information_schema', 'pg_catalog');

    IF remaining > 0 THEN
        RAISE WARNING 'Found % columns still named organization_id (may need manual review)', remaining;
    ELSE
        RAISE NOTICE 'All organization_id columns have been processed';
    END IF;
END $$;
