-- TOPEMS PM Service - Add tenant_id for multi-tenant support

-- ============================================
-- 1. PM Projects
-- ============================================
ALTER TABLE IF EXISTS projects ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE projects SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE projects ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_projects_tenant_id ON projects(tenant_id);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_projects_tenant_isolation" ON projects
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 2. PM Project Phases
-- ============================================
ALTER TABLE IF EXISTS project_phases ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE project_phases pp SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = pp.project_id);
ALTER TABLE project_phases ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_project_phases_tenant_id ON project_phases(tenant_id);
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_project_phases_tenant_isolation" ON project_phases
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 3. PM Project Milestones
-- ============================================
ALTER TABLE IF EXISTS project_milestones ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE project_milestones pm SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = pm.project_id);
ALTER TABLE project_milestones ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_project_milestones_tenant_id ON project_milestones(tenant_id);
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_project_milestones_tenant_isolation" ON project_milestones
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 4. PM Project Members
-- ============================================
ALTER TABLE IF EXISTS project_members ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE project_members pm SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = pm.project_id);
ALTER TABLE project_members ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_project_members_tenant_id ON project_members(tenant_id);
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_project_members_tenant_isolation" ON project_members
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 5. PM Project Expenses
-- ============================================
ALTER TABLE IF EXISTS project_expenses ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE project_expenses pe SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = pe.project_id);
ALTER TABLE project_expenses ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_project_expenses_tenant_id ON project_expenses(tenant_id);
ALTER TABLE project_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_project_expenses_tenant_isolation" ON project_expenses
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 6. PM Project Resources
-- ============================================
ALTER TABLE IF EXISTS project_resources ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE project_resources pr SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = pr.project_id);
ALTER TABLE project_resources ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_project_resources_tenant_id ON project_resources(tenant_id);
ALTER TABLE project_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_project_resources_tenant_isolation" ON project_resources
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 7. PM Project Benefits
-- ============================================
ALTER TABLE IF EXISTS project_benefits ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE project_benefits pb SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = pb.project_id);
ALTER TABLE project_benefits ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_project_benefits_tenant_id ON project_benefits(tenant_id);
ALTER TABLE project_benefits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_project_benefits_tenant_isolation" ON project_benefits
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 8. PM Project Approvals
-- ============================================
ALTER TABLE IF EXISTS project_approvals ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE project_approvals pa SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = pa.project_id);
ALTER TABLE project_approvals ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_project_approvals_tenant_id ON project_approvals(tenant_id);
ALTER TABLE project_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_project_approvals_tenant_isolation" ON project_approvals
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 9. PM Project Type Configs
-- ============================================
ALTER TABLE IF EXISTS project_type_configs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE project_type_configs SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE project_type_configs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_project_type_configs_tenant_id ON project_type_configs(tenant_id);
ALTER TABLE project_type_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_project_type_configs_tenant_isolation" ON project_type_configs
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 10. PM Budgets
-- ============================================
ALTER TABLE IF EXISTS budgets ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE budgets b SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = b.project_id);
ALTER TABLE budgets ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_budgets_tenant_id ON budgets(tenant_id);
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_budgets_tenant_isolation" ON budgets
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 11. PM Budget Items
-- ============================================
ALTER TABLE IF EXISTS budget_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE budget_items bi SET tenant_id = (SELECT b.tenant_id FROM budgets b WHERE b.id = bi.budget_id);
ALTER TABLE budget_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_budget_items_tenant_id ON budget_items(tenant_id);
ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_budget_items_tenant_isolation" ON budget_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 12. PM Contracts
-- ============================================
ALTER TABLE IF EXISTS contracts ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE contracts c SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = c.project_id);
UPDATE contracts SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE contracts ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_contracts_tenant_id ON contracts(tenant_id);
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_contracts_tenant_isolation" ON contracts
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 13. PM Contract Milestones
-- ============================================
ALTER TABLE IF EXISTS contract_milestones ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE contract_milestones cm SET tenant_id = (SELECT c.tenant_id FROM contracts c WHERE c.id = cm.contract_id);
ALTER TABLE contract_milestones ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_contract_milestones_tenant_id ON contract_milestones(tenant_id);
ALTER TABLE contract_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_contract_milestones_tenant_isolation" ON contract_milestones
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 14. PM Contract Payment Schedules
-- ============================================
ALTER TABLE IF EXISTS contract_payment_schedules ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE contract_payment_schedules cps SET tenant_id = (SELECT c.tenant_id FROM contracts c WHERE c.id = cps.contract_id);
ALTER TABLE contract_payment_schedules ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_contract_payment_schedules_tenant_id ON contract_payment_schedules(tenant_id);
ALTER TABLE contract_payment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_contract_payment_schedules_tenant_isolation" ON contract_payment_schedules
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 15. PM Contract Templates
-- ============================================
ALTER TABLE IF EXISTS contract_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE contract_templates SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE contract_templates ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_contract_templates_tenant_id ON contract_templates(tenant_id);
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_contract_templates_tenant_isolation" ON contract_templates
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 16. PM Risks
-- ============================================
ALTER TABLE IF EXISTS project_risks ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE project_risks pr SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = pr.project_id);
ALTER TABLE project_risks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_project_risks_tenant_id ON project_risks(tenant_id);
ALTER TABLE project_risks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_project_risks_tenant_isolation" ON project_risks
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 17. PM Risk Events
-- ============================================
ALTER TABLE IF EXISTS risk_events ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE risk_events re SET tenant_id = (SELECT pr.tenant_id FROM project_risks pr WHERE pr.id = re.risk_id);
ALTER TABLE risk_events ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_risk_events_tenant_id ON risk_events(tenant_id);
ALTER TABLE risk_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_risk_events_tenant_isolation" ON risk_events
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 18. PM Quality Checks
-- ============================================
ALTER TABLE IF EXISTS quality_checks ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE quality_checks qc SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = qc.project_id);
ALTER TABLE quality_checks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_quality_checks_tenant_id ON quality_checks(tenant_id);
ALTER TABLE quality_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_quality_checks_tenant_isolation" ON quality_checks
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 19. PM Defects
-- ============================================
ALTER TABLE IF EXISTS defects ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE defects d SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = d.project_id);
ALTER TABLE defects ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_defects_tenant_id ON defects(tenant_id);
ALTER TABLE defects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_defects_tenant_isolation" ON defects
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 20. PM Reports
-- ============================================
ALTER TABLE IF EXISTS project_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE project_reports pr SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = pr.project_id);
ALTER TABLE project_reports ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_project_reports_tenant_id ON project_reports(tenant_id);
ALTER TABLE project_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_project_reports_tenant_isolation" ON project_reports
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 21. PM Report Templates
-- ============================================
ALTER TABLE IF EXISTS report_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE report_templates SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE report_templates ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_report_templates_tenant_id ON report_templates(tenant_id);
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_report_templates_tenant_isolation" ON report_templates
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 22. PM Report Data
-- ============================================
ALTER TABLE IF EXISTS report_data ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE report_data rd SET tenant_id = (SELECT pr.tenant_id FROM project_reports pr WHERE pr.id = rd.report_id);
ALTER TABLE report_data ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_report_data_tenant_id ON report_data(tenant_id);
ALTER TABLE report_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_report_data_tenant_isolation" ON report_data
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 23. PM Settlements
-- ============================================
ALTER TABLE IF EXISTS settlements ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE settlements s SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = s.project_id);
ALTER TABLE settlements ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_settlements_tenant_id ON settlements(tenant_id);
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_settlements_tenant_isolation" ON settlements
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 24. PM Settlement Items
-- ============================================
ALTER TABLE IF EXISTS settlement_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE settlement_items si SET tenant_id = (SELECT s.tenant_id FROM settlements s WHERE s.id = si.settlement_id);
ALTER TABLE settlement_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_settlement_items_tenant_id ON settlement_items(tenant_id);
ALTER TABLE settlement_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_settlement_items_tenant_isolation" ON settlement_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 25. PM Settlement Adjustments
-- ============================================
ALTER TABLE IF EXISTS settlement_adjustments ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE settlement_adjustments sa SET tenant_id = (SELECT s.tenant_id FROM settlements s WHERE s.id = sa.settlement_id);
ALTER TABLE settlement_adjustments ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_settlement_adjustments_tenant_id ON settlement_adjustments(tenant_id);
ALTER TABLE settlement_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_settlement_adjustments_tenant_isolation" ON settlement_adjustments
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 26. PM Notifications
-- ============================================
ALTER TABLE IF EXISTS notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE notifications n SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = n.project_id);
UPDATE notifications SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE notifications ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_notifications_tenant_id ON notifications(tenant_id);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_notifications_tenant_isolation" ON notifications
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 27. PM Notification Settings
-- ============================================
ALTER TABLE IF EXISTS notification_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE notification_settings SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE notification_settings ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_notification_settings_tenant_id ON notification_settings(tenant_id);
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_notification_settings_tenant_isolation" ON notification_settings
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 28. PM Documents
-- ============================================
ALTER TABLE IF EXISTS project_documents ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE project_documents pd SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = pd.project_id);
ALTER TABLE project_documents ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_project_documents_tenant_id ON project_documents(tenant_id);
ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_project_documents_tenant_isolation" ON project_documents
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 29. PM Document Versions
-- ============================================
ALTER TABLE IF EXISTS document_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE document_versions dv SET tenant_id = (SELECT pd.tenant_id FROM project_documents pd WHERE pd.id = dv.document_id);
ALTER TABLE document_versions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_document_versions_tenant_id ON document_versions(tenant_id);
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_document_versions_tenant_isolation" ON document_versions
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 30. PM Document Folders
-- ============================================
ALTER TABLE IF EXISTS document_folders ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE document_folders df SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = df.project_id);
UPDATE document_folders SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE document_folders ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_document_folders_tenant_id ON document_folders(tenant_id);
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_document_folders_tenant_isolation" ON document_folders
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 31. PM Service Integrations
-- ============================================
ALTER TABLE IF EXISTS service_integrations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE service_integrations si SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = si.project_id);
UPDATE service_integrations SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE service_integrations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_service_integrations_tenant_id ON service_integrations(tenant_id);
ALTER TABLE service_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_service_integrations_tenant_isolation" ON service_integrations
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 32. PM Acceptance Plans
-- ============================================
ALTER TABLE IF EXISTS acceptance_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE acceptance_plans ap SET tenant_id = (SELECT p.tenant_id FROM projects p WHERE p.id = ap.project_id);
ALTER TABLE acceptance_plans ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_acceptance_plans_tenant_id ON acceptance_plans(tenant_id);
ALTER TABLE acceptance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_acceptance_plans_tenant_isolation" ON acceptance_plans
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 33. PM Acceptance Records
-- ============================================
ALTER TABLE IF EXISTS acceptance_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE acceptance_records ar SET tenant_id = (SELECT ap.tenant_id FROM acceptance_plans ap WHERE ap.id = ar.plan_id);
ALTER TABLE acceptance_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_acceptance_records_tenant_id ON acceptance_records(tenant_id);
ALTER TABLE acceptance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_acceptance_records_tenant_isolation" ON acceptance_records
    USING (tenant_id = current_setting('app.tenant_id')::uuid);

-- ============================================
-- 34. PM Acceptance Items
-- ============================================
ALTER TABLE IF EXISTS acceptance_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE acceptance_items ai SET tenant_id = (SELECT ap.tenant_id FROM acceptance_plans ap WHERE ap.id = ai.plan_id);
ALTER TABLE acceptance_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pm_acceptance_items_tenant_id ON acceptance_items(tenant_id);
ALTER TABLE acceptance_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pm_acceptance_items_tenant_isolation" ON acceptance_items
    USING (tenant_id = current_setting('app.tenant_id')::uuid);