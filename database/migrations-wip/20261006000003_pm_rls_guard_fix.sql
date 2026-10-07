-- 清理 pm schema 无防护 RLS 策略（current_setting('app.X')::uuid 直接 cast，空串报 uuid 错）
-- 判定：qual 含 current_setting( 与 ::uuid 且无 NULLIF(current_setting 防护；
-- 同表均有安全副本（tenant_isolation_* / rls_tenant_isolation，NULLIF/text 比较形态），冗余策略直接 DROP（幂等）。

DROP POLICY IF EXISTS projects_tenant_isolation ON pm.projects;
DROP POLICY IF EXISTS document_versions_tenant_policy ON pm.document_versions;
DROP POLICY IF EXISTS notifications_tenant_isolation ON pm.notifications;
DROP POLICY IF EXISTS project_phases_tenant_isolation ON pm.project_phases;
DROP POLICY IF EXISTS project_milestones_tenant_isolation ON pm.project_milestones;
DROP POLICY IF EXISTS project_resources_tenant_isolation ON pm.project_resources;
DROP POLICY IF EXISTS project_expenses_tenant_isolation ON pm.project_expenses;
DROP POLICY IF EXISTS project_benefits_tenant_isolation ON pm.project_benefits;
DROP POLICY IF EXISTS budgets_tenant_isolation ON pm.budgets;
DROP POLICY IF EXISTS risks_tenant_isolation ON pm.risks;
DROP POLICY IF EXISTS project_approvals_tenant_isolation ON pm.project_approvals;
DROP POLICY IF EXISTS contracts_tenant_isolation ON pm.contracts;
DROP POLICY IF EXISTS quality_checks_tenant_isolation ON pm.quality_checks;
DROP POLICY IF EXISTS acceptances_tenant_isolation ON pm.acceptances;
DROP POLICY IF EXISTS settlements_tenant_isolation ON pm.settlements;
DROP POLICY IF EXISTS documents_tenant_isolation ON pm.documents;
DROP POLICY IF EXISTS project_type_configs_tenant_isolation ON pm.project_type_configs;
DROP POLICY IF EXISTS project_members_tenant_isolation ON pm.project_members;
DROP POLICY IF EXISTS acceptance_items_tenant_policy ON pm.acceptance_items;
DROP POLICY IF EXISTS acceptance_plans_tenant_policy ON pm.acceptance_plans;
DROP POLICY IF EXISTS acceptance_records_tenant_policy ON pm.acceptance_records;
DROP POLICY IF EXISTS budget_items_tenant_policy ON pm.budget_items;
DROP POLICY IF EXISTS contract_milestones_tenant_policy ON pm.contract_milestones;
DROP POLICY IF EXISTS contract_payment_schedule_tenant_policy ON pm.contract_payment_schedule;
DROP POLICY IF EXISTS contract_templates_tenant_policy ON pm.contract_templates;
DROP POLICY IF EXISTS defects_tenant_policy ON pm.defects;
DROP POLICY IF EXISTS document_folders_tenant_policy ON pm.document_folders;
DROP POLICY IF EXISTS notification_settings_tenant_policy ON pm.notification_settings;
DROP POLICY IF EXISTS project_documents_tenant_policy ON pm.project_documents;
DROP POLICY IF EXISTS project_reports_tenant_policy ON pm.project_reports;
DROP POLICY IF EXISTS project_risks_tenant_policy ON pm.project_risks;
DROP POLICY IF EXISTS report_templates_tenant_policy ON pm.report_templates;
DROP POLICY IF EXISTS risk_events_tenant_policy ON pm.risk_events;
DROP POLICY IF EXISTS service_integrations_tenant_policy ON pm.service_integrations;
DROP POLICY IF EXISTS settlement_adjustments_tenant_policy ON pm.settlement_adjustments;
DROP POLICY IF EXISTS settlement_items_tenant_policy ON pm.settlement_items;
