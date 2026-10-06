-- 清理 integration schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS wms_scm_sync_tenant_policy ON integration.wms_scm_sync;
DROP POLICY IF EXISTS integration_events_tenant_policy ON integration.integration_events;
DROP POLICY IF EXISTS lims_qms_sync_tenant_policy ON integration.lims_qms_sync;
DROP POLICY IF EXISTS mes_erp_sync_tenant_policy ON integration.mes_erp_sync;
