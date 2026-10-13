-- 清理 doc_service schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS archives_tenant_policy ON doc_service.archives;
DROP POLICY IF EXISTS files_tenant_policy ON doc_service.files;
DROP POLICY IF EXISTS folders_tenant_policy ON doc_service.folders;
DROP POLICY IF EXISTS templates_tenant_policy ON doc_service.templates;
