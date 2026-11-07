-- ============================================================================
-- Migration: 20261107000034_mdm_rename_asset_categories_to_data_asset_categories
--
-- Purpose:
--   Rename master_data.mdm_asset_categories -> master_data.mdm_data_asset_categories
--   to disambiguate from the existing master_data.mdm_assets table and from
--   erp.asset_categories (fixed-asset classification, different semantics).
--
-- Idempotency:
--   Every step is wrapped in DO $$ ... IF EXISTS ... THEN ... END IF $$ so that
--   re-running this migration on a database already at the new state is a no-op.
--
-- Scope:
--   - Table rename
--   - Constraint renames (pkey + auto-generated not-null constraints)
--   - Policy rename (tenant RLS policy)
--   - Comment: none currently on the table, so nothing to update
--
-- Not in scope:
--   - master_data.mdm_assets (different entity, unchanged)
--   - erp.asset_categories (different semantics, unchanged)
--   - Historical migration 20261015000062 (kept as-is for replayability)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. RENAME TABLE (only when old name exists and new name does not)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'master_data' AND table_name = 'mdm_asset_categories'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'master_data' AND table_name = 'mdm_data_asset_categories'
  ) THEN
    ALTER TABLE master_data.mdm_asset_categories
      RENAME TO mdm_data_asset_categories;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. RENAME constraints
--    ALTER TABLE ... RENAME CONSTRAINT on a pkey also renames the underlying
--    btree index, because the index shares the constraint name.
-- ---------------------------------------------------------------------------

-- 2.1 pkey
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'master_data'
      AND t.relname  = 'mdm_data_asset_categories'
      AND c.conname  = 'mdm_asset_categories_pkey'
  ) THEN
    ALTER TABLE master_data.mdm_data_asset_categories
      RENAME CONSTRAINT mdm_asset_categories_pkey
      TO mdm_data_asset_categories_pkey;
  END IF;
END $$;

-- 2.2 not-null on id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'master_data'
      AND t.relname  = 'mdm_data_asset_categories'
      AND c.conname  = 'mdm_asset_categories_id_not_null'
  ) THEN
    ALTER TABLE master_data.mdm_data_asset_categories
      RENAME CONSTRAINT mdm_asset_categories_id_not_null
      TO mdm_data_asset_categories_id_not_null;
  END IF;
END $$;

-- 2.3 not-null on name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'master_data'
      AND t.relname  = 'mdm_data_asset_categories'
      AND c.conname  = 'mdm_asset_categories_name_not_null'
  ) THEN
    ALTER TABLE master_data.mdm_data_asset_categories
      RENAME CONSTRAINT mdm_asset_categories_name_not_null
      TO mdm_data_asset_categories_name_not_null;
  END IF;
END $$;

-- 2.4 not-null on asset_count
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'master_data'
      AND t.relname  = 'mdm_data_asset_categories'
      AND c.conname  = 'mdm_asset_categories_asset_count_not_null'
  ) THEN
    ALTER TABLE master_data.mdm_data_asset_categories
      RENAME CONSTRAINT mdm_asset_categories_asset_count_not_null
      TO mdm_data_asset_categories_asset_count_not_null;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. RRLS policy (table already renamed; policy still carries old name)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'master_data'
      AND tablename  = 'mdm_data_asset_categories'
      AND policyname = 'mdm_asset_categories_tenant_policy'
  ) THEN
    ALTER POLICY mdm_asset_categories_tenant_policy
      ON master_data.mdm_data_asset_categories
      RENAME TO mdm_data_asset_categories_tenant_policy;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Index safeguard:
--    In PostgreSQL the pkey index is bound to the pkey constraint and is
--    renamed automatically by step 2.1. The block below is a defensive no-op
--    in case the index survived under the old name due to some edge path.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'master_data'
      AND tablename  = 'mdm_data_asset_categories'
      AND indexname  = 'mdm_asset_categories_pkey'
  ) THEN
    ALTER INDEX master_data.mdm_asset_categories_pkey
      RENAME TO mdm_data_asset_categories_pkey;
  END IF;
END $$;
