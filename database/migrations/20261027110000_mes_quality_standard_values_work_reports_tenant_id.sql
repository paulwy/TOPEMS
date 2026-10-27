-- 20261027110000_mes_quality_standard_values_work_reports_tenant_id.sql
-- 第四十六轮遗留③：mes.quality_standard_values / mes.work_reports 的 tenant_id
-- 此前只在运行库手工 ALTER 补齐（代码 INSERT 已引用 tenant_id，缺列即 500）。
-- 本迁移把该变更正式入库（幂等，可重放）：
--   1) ADD COLUMN IF NOT EXISTS tenant_id uuid（可空，与运行库一致；新库由 083 已补 DEFAULT）；
--   2) 建 tenant_id 索引（对齐 production_records_tenant_id_idx 惯例）；
--   3) NULL 回填全零系统租户（对齐 083 回填语义，保证 RLS 公共行可见性）；
--   4) RLS 收口（同 P1-8 缺陷类）：
--        - quality_standard_values：删除历史遗留开放策略 mes_allow_all_*（RLS 已 FORCE，
--          开放策略使其隔离形同虚设），补标准双策略；
--        - work_reports：补 ENABLE + FORCE + 标准双策略（该表历史上曾被重建，
--          RLS 状态丢失；gap_fill 本应覆盖它）。
--   策略模板与 20260917000004_rls_gap_fill 完全一致（rls_tenant_isolation +
--   tenant_isolation_<表>，容忍 app.tenant_id 空 / 系统租户 / tenant_id 空）。

SET app.tenant_id = '00000000-0000-0000-0000-000000000000';

-- 1+3) 补列 + 回填
ALTER TABLE IF EXISTS mes.quality_standard_values ADD COLUMN IF NOT EXISTS tenant_id uuid;
ALTER TABLE IF EXISTS mes.work_reports ADD COLUMN IF NOT EXISTS tenant_id uuid;

UPDATE mes.quality_standard_values SET tenant_id = '00000000-0000-0000-0000-000000000000'
 WHERE tenant_id IS NULL;
UPDATE mes.work_reports SET tenant_id = '00000000-0000-0000-0000-000000000000'
 WHERE tenant_id IS NULL;

-- 2) 索引
CREATE INDEX IF NOT EXISTS quality_standard_values_tenant_id_idx ON mes.quality_standard_values (tenant_id);
CREATE INDEX IF NOT EXISTS work_reports_tenant_id_idx ON mes.work_reports (tenant_id);

-- 4) RLS 收口
DO $$
DECLARE
  using_qual TEXT := '(current_setting(''app.tenant_id'', true) IS NULL) OR (current_setting(''app.tenant_id'', true) = '''') OR (current_setting(''app.tenant_id'', true) = ''00000000-0000-0000-0000-000000000000'') OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting(''app.tenant_id'', true), ''''))::uuid)';
  using_qual2 TEXT := '((tenant_id)::text = NULLIF(current_setting(''app.tenant_id'', true), '''')) OR (tenant_id IS NULL) OR (COALESCE(current_setting(''app.tenant_id'', true), '''') = ''00000000-0000-0000-0000-000000000000'')';
BEGIN
  -- quality_standard_values：删开放策略（若存在），补标准策略
  DROP POLICY IF EXISTS mes_allow_all_quality_standard_values ON mes.quality_standard_values;
  ALTER TABLE mes.quality_standard_values ENABLE ROW LEVEL SECURITY;
  ALTER TABLE mes.quality_standard_values FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mes' AND tablename='quality_standard_values' AND policyname='rls_tenant_isolation') THEN
    EXECUTE format('CREATE POLICY rls_tenant_isolation ON mes.quality_standard_values USING (%s) WITH CHECK (%s)', using_qual, using_qual);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mes' AND tablename='quality_standard_values' AND policyname='tenant_isolation_quality_standard_values') THEN
    EXECUTE format('CREATE POLICY tenant_isolation_quality_standard_values ON mes.quality_standard_values USING (%s) WITH CHECK (%s)', using_qual2, using_qual2);
  END IF;

  -- work_reports：补 ENABLE + FORCE + 标准双策略
  ALTER TABLE mes.work_reports ENABLE ROW LEVEL SECURITY;
  ALTER TABLE mes.work_reports FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mes' AND tablename='work_reports' AND policyname='rls_tenant_isolation') THEN
    EXECUTE format('CREATE POLICY rls_tenant_isolation ON mes.work_reports USING (%s) WITH CHECK (%s)', using_qual, using_qual);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mes' AND tablename='work_reports' AND policyname='tenant_isolation_work_reports') THEN
    EXECUTE format('CREATE POLICY tenant_isolation_work_reports ON mes.work_reports USING (%s) WITH CHECK (%s)', using_qual2, using_qual2);
  END IF;

  RAISE NOTICE 'RLS reconciled: mes.quality_standard_values / mes.work_reports';
END $$;

RESET app.tenant_id;
