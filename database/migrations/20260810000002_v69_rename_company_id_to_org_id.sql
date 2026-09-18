-- V69.1 P3-3 Phase 2: Rename A-class company_id → org_id (9 tables)
-- These tables have redundant company_id alongside tenant_id/organization_id.
-- B-class tables (consolidation_scope_companies, internal_transactions,
-- company_relations) and C-class tables (opening_balances, bank_accounts)
-- are NOT affected — their company_id has legitimate business meaning.
--
-- 幂等重写（空库重建兼容）：表和列不存在时自动跳过；
-- 空库基线的最终态结构已含 org_id（TABLE_DEFS），无需演进。

-- ============================================
-- Step 1: Drop UNIQUE constraint on financial_reports (will recreate after rename)
-- ============================================
ALTER TABLE financial_reports DROP CONSTRAINT IF EXISTS financial_reports_report_type_company_id_period_currency_code_key;

-- ============================================
-- Step 2: Rename columns (9 tables) — 幂等：仅当列 company_id 存在且 org_id 不存在时执行
-- ============================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT table_schema AS sch, table_name AS tbl FROM information_schema.tables
    WHERE table_type = 'BASE TABLE' AND (
      (table_schema, table_name) IN (
        ('public','departments'), ('public','employees'),
        ('hrm','departments'), ('hrm','positions'), ('hrm','employees'),
        ('plugin_erp','assets'), ('plugin_hrm','positions'), ('plugin_hrm','attendance_records')
      )
      OR (table_schema = 'public' AND table_name = 'financial_reports')
      OR (table_schema = 'finance' AND table_name = 'financial_reports')
    )
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = r.sch AND table_name = r.tbl AND column_name = 'company_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = r.sch AND table_name = r.tbl AND column_name = 'org_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I.%I RENAME COLUMN company_id TO org_id', r.sch, r.tbl);
      RAISE NOTICE 'renamed company_id->org_id on %.%', r.sch, r.tbl;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- Step 3: Rename indexes (explicit, since RENAME COLUMN doesn't rename indexes)
-- ============================================
ALTER INDEX IF EXISTS idx_departments_company_id RENAME TO idx_departments_org_id;
ALTER INDEX IF EXISTS idx_positions_company_id RENAME TO idx_positions_org_id;
ALTER INDEX IF EXISTS idx_hrm_positions_company_id RENAME TO idx_hrm_positions_org_id;
ALTER INDEX IF EXISTS idx_financial_reports_company_id RENAME TO idx_financial_reports_org_id;

-- ============================================
-- Step 4: Recreate UNIQUE constraint on financial_reports with new column name
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema IN ('public','finance') AND table_name = 'financial_reports'
      AND column_name = 'org_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'financial_reports_report_type_org_id_period_currency_code_key'
  ) THEN
    ALTER TABLE financial_reports
        ADD CONSTRAINT financial_reports_report_type_org_id_period_currency_code_key
        UNIQUE(report_type, org_id, period, currency_code);
  END IF;
END $$;
