-- ============================================================================
-- 20261020000026_p18_tenant_isolation_gaps.sql
-- P1-8 租户隔离缺口收口（幂等）：
--   1) gis.geofences、rs.material_tests 原无 tenant_id 列且未启用 RLS（全局共享）；
--   2) erp.bank_accounts 虽有 tenant_id 列，但挂的是 erp_allow_all_bank_accounts
--      USING(true) 开放策略，等于未隔离。
-- 处理：
--   - 缺列表补 tenant_id（NOT NULL DEFAULT nil UUID，存量/共享行视为无租户）；
--   - 删除开放 allow_all 策略；
--   - ENABLE+FORCE RLS 并施加 tenant_isolation_<table> 策略（GUC 未设置/为空/nil
--     或 tenant_id IS NULL 时放行，否则仅本租户可见），与 20261020000021 同语义。
-- 表缺失/无列时跳过，整批可重复执行。
-- ============================================================================

-- 1) 补列（幂等）
ALTER TABLE gis.geofences
  ADD COLUMN IF NOT EXISTS tenant_id uuid
  NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;

ALTER TABLE rs.material_tests
  ADD COLUMN IF NOT EXISTS tenant_id uuid
  NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;

CREATE INDEX IF NOT EXISTS idx_gis_geofences_tenant
  ON gis.geofences (tenant_id)
  WHERE tenant_id <> '00000000-0000-0000-0000-000000000000'::uuid;

CREATE INDEX IF NOT EXISTS idx_rs_material_tests_tenant
  ON rs.material_tests (tenant_id)
  WHERE tenant_id <> '00000000-0000-0000-0000-000000000000'::uuid;

-- 2) 删除开放策略（不存在则跳过）
DROP POLICY IF EXISTS gis_allow_all_geofences ON gis.geofences;
DROP POLICY IF EXISTS erp_allow_all_bank_accounts ON erp.bank_accounts;

-- 3) 逐表 ENABLE/FORCE RLS + 租户策略（幂等）
DO $$
DECLARE
  sch text;
  tbl text;
  pol text;
  exists_pol boolean;
  ctype text;
  nil_uuid constant text := '00000000-0000-0000-0000-000000000000';
  pol_sql text;
  targets text[] := ARRAY[
    'gis.geofences',
    'rs.material_tests',
    'erp.bank_accounts'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY targets LOOP
    sch := split_part(t, '.', 1);
    tbl := split_part(t, '.', 2);
    IF to_regclass(format('%I.%I', sch, tbl)) IS NULL THEN
      RAISE NOTICE 'skip (relation missing): %', t;
      CONTINUE;
    END IF;
    EXECUTE format(
      'SELECT data_type FROM information_schema.columns WHERE table_schema = %L AND table_name = %L AND column_name = ''tenant_id''',
      sch, tbl
    ) INTO ctype;
    IF ctype IS NULL THEN
      RAISE NOTICE 'skip (no tenant_id column): %', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', sch, tbl);

    pol := 'tenant_isolation_' || tbl;
    IF ctype = 'uuid' THEN
      pol_sql := format(
        'tenant_id = NULLIF(current_setting(''app.tenant_id''), '''')::UUID OR tenant_id IS NULL OR NULLIF(current_setting(''app.tenant_id''), '''') = %L',
        nil_uuid
      );
    ELSE
      pol_sql := format(
        'tenant_id = NULLIF(current_setting(''app.tenant_id''), '''') OR tenant_id IS NULL OR NULLIF(current_setting(''app.tenant_id''), '''') = %L',
        nil_uuid
      );
    END IF;

    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = %L AND tablename = %L AND policyname = %L)',
      sch, tbl, pol
    ) INTO exists_pol;
    IF exists_pol THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', pol, sch, tbl, pol_sql);
    ELSE
      EXECUTE format('CREATE POLICY %I ON %I.%I FOR ALL USING (%s)', pol, sch, tbl, pol_sql);
    END IF;

    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY', sch, tbl);
    RAISE NOTICE 'rls enabled: %', t;
  END LOOP;
END $$;
