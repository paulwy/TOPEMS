-- 回滚 20261119000002：生产改前就是同一份严格策略（rls=true / force=true），
-- 因此回滚不降级为宽松模板，只把策略按改前定义重建一次，保证可重放。
DROP POLICY IF EXISTS rls_tenant_isolation ON public.core_file_permissions;
CREATE POLICY rls_tenant_isolation ON public.core_file_permissions
  FOR ALL TO public
  USING (
    (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
  )
  WITH CHECK (
    (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
  );

DROP POLICY IF EXISTS rls_tenant_isolation ON public.monitor_thresholds;
CREATE POLICY rls_tenant_isolation ON public.monitor_thresholds
  FOR ALL TO public
  USING (
    (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
  )
  WITH CHECK (
    (COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text)
    OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)
  );

DELETE FROM public._sqlx_migrations WHERE version = 20261119000002;
