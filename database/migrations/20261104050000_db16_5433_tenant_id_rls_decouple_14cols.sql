-- DB-16: 5433 tenant_id RLS 策略解耦 14 列
SET lock_timeout = '5s';

-- integration.erp_connections
DROP POLICY IF EXISTS rls_tenant_isolation ON integration.erp_connections;
DROP POLICY IF EXISTS tenant_isolation_erp_connections ON integration.erp_connections;
ALTER TABLE integration.erp_connections ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE integration.erp_connections ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE integration.erp_connections ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE POLICY rls_tenant_isolation ON integration.erp_connections FOR ALL USING (
  current_setting('app.tenant_id', true) IS NULL
  OR current_setting('app.tenant_id', true) = ''
  OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
  OR tenant_id IS NULL
  OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
);
CREATE POLICY tenant_isolation_erp_connections ON integration.erp_connections FOR ALL USING (
  (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
  OR tenant_id IS NULL
);

-- integration.erp_mappings
DROP POLICY IF EXISTS rls_tenant_isolation ON integration.erp_mappings;
DROP POLICY IF EXISTS tenant_isolation_erp_mappings ON integration.erp_mappings;
ALTER TABLE integration.erp_mappings ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE integration.erp_mappings ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE integration.erp_mappings ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE POLICY rls_tenant_isolation ON integration.erp_mappings FOR ALL USING (
  current_setting('app.tenant_id', true) IS NULL
  OR current_setting('app.tenant_id', true) = ''
  OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
  OR tenant_id IS NULL
  OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
);
CREATE POLICY tenant_isolation_erp_mappings ON integration.erp_mappings FOR ALL USING (
  (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
  OR tenant_id IS NULL
);

-- integration.external_erp_sync_logs
DROP POLICY IF EXISTS rls_tenant_isolation ON integration.external_erp_sync_logs;
DROP POLICY IF EXISTS tenant_isolation_external_erp_sync_logs ON integration.external_erp_sync_logs;
ALTER TABLE integration.external_erp_sync_logs ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE integration.external_erp_sync_logs ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE integration.external_erp_sync_logs ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE POLICY rls_tenant_isolation ON integration.external_erp_sync_logs FOR ALL USING (
  current_setting('app.tenant_id', true) IS NULL
  OR current_setting('app.tenant_id', true) = ''
  OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
  OR tenant_id IS NULL
  OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
);
CREATE POLICY tenant_isolation_external_erp_sync_logs ON integration.external_erp_sync_logs FOR ALL USING (
  (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
  OR tenant_id IS NULL
);

-- mes.material_plans
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.material_plans;
DROP POLICY IF EXISTS tenant_isolation_material_plans ON mes.material_plans;
ALTER TABLE mes.material_plans ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE mes.material_plans ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE mes.material_plans ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE POLICY rls_tenant_isolation ON mes.material_plans FOR ALL USING (
  current_setting('app.tenant_id', true) IS NULL
  OR current_setting('app.tenant_id', true) = ''
  OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
  OR tenant_id IS NULL
  OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
);
CREATE POLICY tenant_isolation_material_plans ON mes.material_plans FOR ALL USING (
  (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
  OR tenant_id IS NULL
);

-- mes.permission_audit_logs
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.permission_audit_logs;
DROP POLICY IF EXISTS tenant_isolation_permission_audit_logs ON mes.permission_audit_logs;
ALTER TABLE mes.permission_audit_logs ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE mes.permission_audit_logs ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE mes.permission_audit_logs ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE POLICY rls_tenant_isolation ON mes.permission_audit_logs FOR ALL USING (
  current_setting('app.tenant_id', true) IS NULL
  OR current_setting('app.tenant_id', true) = ''
  OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
  OR tenant_id IS NULL
  OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
);
CREATE POLICY tenant_isolation_permission_audit_logs ON mes.permission_audit_logs FOR ALL USING (
  (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
  OR tenant_id IS NULL
);

-- mes.tenant_permissions
DROP POLICY IF EXISTS rls_tenant_isolation ON mes.tenant_permissions;
DROP POLICY IF EXISTS tenant_isolation_tenant_permissions ON mes.tenant_permissions;
ALTER TABLE mes.tenant_permissions ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE mes.tenant_permissions ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE mes.tenant_permissions ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE POLICY rls_tenant_isolation ON mes.tenant_permissions FOR ALL USING (
  current_setting('app.tenant_id', true) IS NULL
  OR current_setting('app.tenant_id', true) = ''
  OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
  OR tenant_id IS NULL
  OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
);
CREATE POLICY tenant_isolation_tenant_permissions ON mes.tenant_permissions FOR ALL USING (
  (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
  OR tenant_id IS NULL
);

-- mobile.oa_announcements
DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.oa_announcements;
DROP POLICY IF EXISTS tenant_isolation_oa_announcements ON mobile.oa_announcements;
ALTER TABLE mobile.oa_announcements ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE mobile.oa_announcements ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE mobile.oa_announcements ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE POLICY rls_tenant_isolation ON mobile.oa_announcements FOR ALL USING (
  current_setting('app.tenant_id', true) IS NULL
  OR current_setting('app.tenant_id', true) = ''
  OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
  OR tenant_id IS NULL
  OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
);
CREATE POLICY tenant_isolation_oa_announcements ON mobile.oa_announcements FOR ALL USING (
  (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
  OR tenant_id IS NULL
);

-- mobile.oa_calendar_events
DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.oa_calendar_events;
DROP POLICY IF EXISTS tenant_isolation_oa_calendar_events ON mobile.oa_calendar_events;
ALTER TABLE mobile.oa_calendar_events ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE mobile.oa_calendar_events ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE mobile.oa_calendar_events ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE POLICY rls_tenant_isolation ON mobile.oa_calendar_events FOR ALL USING (
  current_setting('app.tenant_id', true) IS NULL
  OR current_setting('app.tenant_id', true) = ''
  OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
  OR tenant_id IS NULL
  OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
);
CREATE POLICY tenant_isolation_oa_calendar_events ON mobile.oa_calendar_events FOR ALL USING (
  (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
  OR tenant_id IS NULL
);

-- mobile.oa_meetings
DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.oa_meetings;
DROP POLICY IF EXISTS tenant_isolation_oa_meetings ON mobile.oa_meetings;
ALTER TABLE mobile.oa_meetings ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE mobile.oa_meetings ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE mobile.oa_meetings ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE POLICY rls_tenant_isolation ON mobile.oa_meetings FOR ALL USING (
  current_setting('app.tenant_id', true) IS NULL
  OR current_setting('app.tenant_id', true) = ''
  OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
  OR tenant_id IS NULL
  OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
);
CREATE POLICY tenant_isolation_oa_meetings ON mobile.oa_meetings FOR ALL USING (
  (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
  OR tenant_id IS NULL
);

-- mobile.oa_tasks
DROP POLICY IF EXISTS rls_tenant_isolation ON mobile.oa_tasks;
DROP POLICY IF EXISTS tenant_isolation_oa_tasks ON mobile.oa_tasks;
ALTER TABLE mobile.oa_tasks ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE mobile.oa_tasks ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE mobile.oa_tasks ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE POLICY rls_tenant_isolation ON mobile.oa_tasks FOR ALL USING (
  current_setting('app.tenant_id', true) IS NULL
  OR current_setting('app.tenant_id', true) = ''
  OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
  OR tenant_id IS NULL
  OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
);
CREATE POLICY tenant_isolation_oa_tasks ON mobile.oa_tasks FOR ALL USING (
  (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
  OR tenant_id IS NULL
);

-- public.erp_connections
DROP POLICY IF EXISTS rls_tenant_isolation ON public.erp_connections;
DROP POLICY IF EXISTS tenant_isolation_erp_connections ON public.erp_connections;
ALTER TABLE public.erp_connections ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.erp_connections ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE public.erp_connections ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE POLICY rls_tenant_isolation ON public.erp_connections FOR ALL USING (
  current_setting('app.tenant_id', true) IS NULL
  OR current_setting('app.tenant_id', true) = ''
  OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
  OR tenant_id IS NULL
  OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
);
CREATE POLICY tenant_isolation_erp_connections ON public.erp_connections FOR ALL USING (
  (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
  OR tenant_id IS NULL
);

-- public.erp_mappings
DROP POLICY IF EXISTS rls_tenant_isolation ON public.erp_mappings;
DROP POLICY IF EXISTS tenant_isolation_erp_mappings ON public.erp_mappings;
ALTER TABLE public.erp_mappings ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.erp_mappings ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE public.erp_mappings ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE POLICY rls_tenant_isolation ON public.erp_mappings FOR ALL USING (
  current_setting('app.tenant_id', true) IS NULL
  OR current_setting('app.tenant_id', true) = ''
  OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
  OR tenant_id IS NULL
  OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
);
CREATE POLICY tenant_isolation_erp_mappings ON public.erp_mappings FOR ALL USING (
  (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
  OR tenant_id IS NULL
);

-- public.external_erp_sync_logs
DROP POLICY IF EXISTS rls_tenant_isolation ON public.external_erp_sync_logs;
DROP POLICY IF EXISTS tenant_isolation_external_erp_sync_logs ON public.external_erp_sync_logs;
ALTER TABLE public.external_erp_sync_logs ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.external_erp_sync_logs ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE public.external_erp_sync_logs ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE POLICY rls_tenant_isolation ON public.external_erp_sync_logs FOR ALL USING (
  current_setting('app.tenant_id', true) IS NULL
  OR current_setting('app.tenant_id', true) = ''
  OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
  OR tenant_id IS NULL
  OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
);
CREATE POLICY tenant_isolation_external_erp_sync_logs ON public.external_erp_sync_logs FOR ALL USING (
  (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
  OR tenant_id IS NULL
);

-- public.permission_audit_logs
DROP POLICY IF EXISTS rls_tenant_isolation ON public.permission_audit_logs;
DROP POLICY IF EXISTS tenant_isolation_permission_audit_logs ON public.permission_audit_logs;
ALTER TABLE public.permission_audit_logs ALTER COLUMN tenant_id DROP DEFAULT;
ALTER TABLE public.permission_audit_logs ALTER COLUMN tenant_id TYPE uuid USING tenant_id::uuid;
ALTER TABLE public.permission_audit_logs ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000000'::uuid;
CREATE POLICY rls_tenant_isolation ON public.permission_audit_logs FOR ALL USING (
  current_setting('app.tenant_id', true) IS NULL
  OR current_setting('app.tenant_id', true) = ''
  OR current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000'
  OR tenant_id IS NULL
  OR (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
);
CREATE POLICY tenant_isolation_permission_audit_logs ON public.permission_audit_logs FOR ALL USING (
  (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
  OR tenant_id IS NULL
);

