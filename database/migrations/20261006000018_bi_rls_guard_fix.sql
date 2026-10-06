-- 清理 bi schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS report_templates_tenant_policy ON bi.report_templates;
DROP POLICY IF EXISTS report_schedules_tenant_policy ON bi.report_schedules;
DROP POLICY IF EXISTS audit_logs_tenant_policy ON bi.audit_logs;
DROP POLICY IF EXISTS reports_tenant_policy ON bi.reports;
