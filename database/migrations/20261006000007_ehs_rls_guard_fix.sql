-- 清理 ehs schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS drill_records_tenant_policy ON ehs.drill_records;
DROP POLICY IF EXISTS emergency_plans_tenant_policy ON ehs.emergency_plans;
DROP POLICY IF EXISTS health_checkups_tenant_policy ON ehs.health_checkups;
DROP POLICY IF EXISTS health_records_tenant_policy ON ehs.health_records;
DROP POLICY IF EXISTS monitoring_points_tenant_policy ON ehs.monitoring_points;
DROP POLICY IF EXISTS risk_assessments_tenant_policy ON ehs.risk_assessments;
DROP POLICY IF EXISTS risk_controls_tenant_policy ON ehs.risk_controls;
DROP POLICY IF EXISTS safety_checks_tenant_policy ON ehs.safety_checks;
DROP POLICY IF EXISTS safety_hazards_tenant_policy ON ehs.safety_hazards;
DROP POLICY IF EXISTS safety_incidents_tenant_policy ON ehs.safety_incidents;
DROP POLICY IF EXISTS training_programs_tenant_policy ON ehs.training_programs;
DROP POLICY IF EXISTS training_records_tenant_policy ON ehs.training_records;
DROP POLICY IF EXISTS vaccination_records_tenant_policy ON ehs.vaccination_records;
DROP POLICY IF EXISTS audit_logs_tenant_policy ON ehs.audit_logs;
DROP POLICY IF EXISTS environmental_alerts_tenant_policy ON ehs.environmental_alerts;
DROP POLICY IF EXISTS environmental_data_tenant_policy ON ehs.environmental_data;
