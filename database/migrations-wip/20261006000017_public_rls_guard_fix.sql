-- 清理 public schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS archived_notifications_tenant_policy ON public.archived_notifications;
DROP POLICY IF EXISTS notification_templates_tenant_policy ON public.notification_templates;
DROP POLICY IF EXISTS tenants_tenant_policy ON public.tenants;
DROP POLICY IF EXISTS versions_tenant_policy ON public.versions;
