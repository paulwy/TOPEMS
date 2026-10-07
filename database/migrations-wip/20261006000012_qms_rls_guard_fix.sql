-- 清理 qms schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS inspection_items_tenant_policy ON qms.inspection_items;
DROP POLICY IF EXISTS quality_inspections_tenant_policy ON qms.quality_inspections;
DROP POLICY IF EXISTS quality_issues_tenant_policy ON qms.quality_issues;
DROP POLICY IF EXISTS quality_standards_tenant_policy ON qms.quality_standards;
DROP POLICY IF EXISTS corrective_actions_tenant_policy ON qms.corrective_actions;
DROP POLICY IF EXISTS audit_logs_tenant_policy ON qms.audit_logs;
DROP POLICY IF EXISTS dashboard_metrics_tenant_policy ON qms.dashboard_metrics;
