-- V253: Unify DB schema nullability across machines
--
-- Background: Two development machines diverged in DB schema nullability.
--   Machine A (live DB): some columns altered to NOT NULL manually (or via ad-hoc ALTER)
--   Machine B: columns remain nullable as originally defined in migrations
--   -> SQLx type inference differs -> one machine compiles, the other fails
--
-- Fix: Standardize nullability so both machines have identical schemas.
--   1. created_at / updated_at -> NOT NULL (all have DEFAULT now(), universally safe)
--   2. MES business-critical fields -> NOT NULL (match live DB / .sqlx cache source of truth)
--
-- .sqlx cache strategy:
--   DO NOT regenerate the .sqlx cache after running this migration.
--   The existing cache (275 query/data JSON files, committed to git) was
--   generated BEFORE this migration and reflects nullable created_at/updated_at.
--   The code uses try_get::<Option<T>> which handles both nullable and NOT NULL
--   at runtime, so the cache/schema mismatch is safe.
--   Regenerating would change created_at/updated_at from Option<NaiveDateTime> to
--   NaiveDateTime in the cache, causing ~150 type mismatch errors in sqlx::query!
--   macros across MES modules. Avoid unless doing a full code audit.
--   SQLX_OFFLINE=true ensures both machines use the same committed cache.

-- ==================================================================
-- Part 1: created_at / updated_at -> NOT NULL (all business schemas)
-- Uses DO block for dynamic generation across all tables/columns.
-- ==================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT c.table_schema, c.table_name, c.column_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema
         AND t.table_name = c.table_name
         AND t.table_type = 'BASE TABLE'
        WHERE c.column_name IN ('created_at', 'updated_at')
          AND c.is_nullable = 'YES'
          AND c.table_schema IN (
            'rs','public','erp','wms','scm','crm','qms','pdm','hrm','pm',
            'srm','lims','ehs','rd','ai','bi','portal','mobile','gis',
            'integration','shared','core','doc','file','mail','iam',
            'unified_core','storage'
          )
          AND c.table_name NOT LIKE 'pg_%'
          AND c.table_name NOT LIKE 'schema_%'
        ORDER BY c.table_schema, c.table_name, c.column_name
    LOOP
        EXECUTE format(
            'UPDATE %I.%I SET %I = NOW() WHERE %I IS NULL',
            r.table_schema, r.table_name, r.column_name, r.column_name
        );
        EXECUTE format(
            'ALTER TABLE %I.%I ALTER COLUMN %I SET NOT NULL',
            r.table_schema, r.table_name, r.column_name
        );
    END LOOP;
END
$$;

-- ==================================================================
-- Part 2: MES business-critical fields -> NOT NULL (rs schema)
-- These fields are NOT NULL in the live DB (source of .sqlx cache).
-- Migration ensures both machines match.
-- ==================================================================

-- equipment_inspections: equipment_id, inspector, inspection_date
ALTER TABLE rs.equipment_inspections ALTER COLUMN equipment_id SET NOT NULL;
ALTER TABLE rs.equipment_inspections ALTER COLUMN inspector SET NOT NULL;
ALTER TABLE rs.equipment_inspections ALTER COLUMN inspection_date SET NOT NULL;

-- equipment_maintenance_records: equipment_id, maintainer
ALTER TABLE rs.equipment_maintenance_records ALTER COLUMN equipment_id SET NOT NULL;
ALTER TABLE rs.equipment_maintenance_records ALTER COLUMN maintainer SET NOT NULL;

-- ==================================================================
-- Part 3: Update FK constraints for NOT NULL equipment_id columns
-- ON DELETE SET NULL is invalid for NOT NULL columns (delete would fail).
-- Change to ON DELETE RESTRICT (prevent deletion of referenced equipment).
-- rs schema already uses ON DELETE CASCADE (compatible), so only fix public schema.
-- ==================================================================
ALTER TABLE public.equipment_inspections
    DROP CONSTRAINT IF EXISTS equipment_inspections_equipment_id_fkey;
ALTER TABLE public.equipment_inspections
    ADD CONSTRAINT equipment_inspections_equipment_id_fkey
    FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE RESTRICT;

ALTER TABLE public.equipment_maintenance_records
    DROP CONSTRAINT IF EXISTS equipment_maintenance_records_equipment_id_fkey;
ALTER TABLE public.equipment_maintenance_records
    ADD CONSTRAINT equipment_maintenance_records_equipment_id_fkey
    FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE RESTRICT;
