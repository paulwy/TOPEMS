-- v1.90 物料环节另批：master_data 公共主数据三表（materials/uoms/samples）补租户隔离 RLS
-- 背景：20261021000010 建表时未带 RLS；master_data 域 81 张既有表均有 tenant_isolation_* 宽松策略，
-- 新三表补齐保持一致（与 public.core_roles / erp.bank_accounts / pm.projects 宽松格式一致）。
-- 幂等：策略已存在则跳过。
-- v1.98 P3-1 对齐：ENABLE 后补 FORCE ROW LEVEL SECURITY（与 089/000018 全库 FORCE 惯例一致；
-- ALTER TABLE ... FORCE ROW LEVEL SECURITY 本身幂等，重复执行无副作用）。

-- materials
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'materials' AND policyname = 'tenant_isolation_materials') THEN
    ALTER TABLE master_data.materials ENABLE ROW LEVEL SECURITY;
    ALTER TABLE master_data.materials FORCE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_materials ON master_data.materials USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    );
  END IF;
END $$;

-- uoms
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'uoms' AND policyname = 'tenant_isolation_uoms') THEN
    ALTER TABLE master_data.uoms ENABLE ROW LEVEL SECURITY;
    ALTER TABLE master_data.uoms FORCE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_uoms ON master_data.uoms USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    );
  END IF;
END $$;

-- samples
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'master_data' AND tablename = 'samples' AND policyname = 'tenant_isolation_samples') THEN
    ALTER TABLE master_data.samples ENABLE ROW LEVEL SECURITY;
    ALTER TABLE master_data.samples FORCE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_samples ON master_data.samples USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    );
  END IF;
END $$;
