-- V252 Phase 6 / P2-2: Drop overly restrictive status CHECK constraints
--
-- Background: P3-2 (migration 20260809000002) added CHECK(status IN ('active','inactive','archived'))
-- to 492 tables whose existing data matched the standard 3-value set.
--
-- Problem: Many tables' Rust code uses business-specific status values beyond
-- active/inactive/archived (e.g., pending, completed, draft, cancelled, published,
-- approved, rejected, in_progress, etc.). The CHECK constraint blocks these inserts,
-- causing runtime errors.
--
-- Fix: Drop ALL ck_*_status_standard constraints. Application code (Rust enums,
-- validation logic) is the proper place to enforce valid status values, as business
-- status vocabularies vary per table and evolve over time.
--
-- Risk: Low — tables that legitimately only use active/inactive/archived lose
-- DB-level enforcement, but application code already validates status values.

DO $$
DECLARE
    r RECORD;
    dropped_count INTEGER := 0;
    skipped_count INTEGER := 0;
BEGIN
    FOR r IN
        SELECT conname, conrelid::regclass AS table_name
        FROM pg_constraint
        WHERE conname LIKE 'ck_%_status_standard'
          AND contype = 'c'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %s',
                r.table_name, r.conname);
            dropped_count := dropped_count + 1;
        EXCEPTION WHEN OTHERS THEN
            skipped_count := skipped_count + 1;
            RAISE NOTICE 'Skipped % on %: %', r.conname, r.table_name, SQLERRM;
        END;
    END LOOP;
    RAISE NOTICE 'V252 Phase 6: Dropped % status CHECK constraints, skipped %',
        dropped_count, skipped_count;
END $$;
