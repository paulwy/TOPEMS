-- 清理 lims schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS ai_analyses_tenant_policy ON lims.ai_analyses;
DROP POLICY IF EXISTS audit_logs_tenant_policy ON lims.audit_logs;
DROP POLICY IF EXISTS document_relations_tenant_policy ON lims.document_relations;
DROP POLICY IF EXISTS inspection_processes_tenant_policy ON lims.inspection_processes;
DROP POLICY IF EXISTS inspection_records_tenant_policy ON lims.inspection_records;
DROP POLICY IF EXISTS inspection_tasks_tenant_policy ON lims.inspection_tasks;
DROP POLICY IF EXISTS instrument_calibrations_tenant_policy ON lims.instrument_calibrations;
DROP POLICY IF EXISTS instruments_tenant_policy ON lims.instruments;
DROP POLICY IF EXISTS lab_ledger_tenant_policy ON lims.lab_ledger;
DROP POLICY IF EXISTS maintenance_records_tenant_policy ON lims.maintenance_records;
DROP POLICY IF EXISTS reagent_usages_tenant_policy ON lims.reagent_usages;
DROP POLICY IF EXISTS reagents_tenant_policy ON lims.reagents;
DROP POLICY IF EXISTS samples_tenant_policy ON lims.samples;
