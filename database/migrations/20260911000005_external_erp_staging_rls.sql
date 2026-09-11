-- 为 integration.external_erp_staging 表启用 RLS
-- 该表包含 tenant_id 列，但之前未启用 RLS，存在多租户数据隔离风险

-- 启用 RLS
ALTER TABLE integration.external_erp_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.external_erp_staging FORCE ROW LEVEL SECURITY;

-- 创建租户隔离策略
DROP POLICY IF EXISTS tenant_isolation ON integration.external_erp_staging;
CREATE POLICY tenant_isolation ON integration.external_erp_staging
  USING (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.tenant_id', true) IS NULL
    OR current_setting('app.tenant_id', true) = ''
    OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
    OR tenant_id IS NULL
    OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
  );
