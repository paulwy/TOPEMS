-- TOPEMS QMS 数据库迁移脚本
-- 为所有 QMS 表添加 tenant_id 字段以支持多租户
-- 日期: 2026-07-10

BEGIN;

-- ============================================
-- 1. 质量标准表 (qa_standards)
-- ============================================
ALTER TABLE qa_standards ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_standards SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_standards ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_standards_tenant_id ON qa_standards(tenant_id);

-- ============================================
-- 2. 标准修订表 (qa_standard_revisions)
-- ============================================
ALTER TABLE qa_standard_revisions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_standard_revisions sr SET tenant_id = (SELECT s.tenant_id FROM qa_standards s WHERE s.id = sr.standard_id) WHERE tenant_id IS NULL;
ALTER TABLE qa_standard_revisions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_standard_revisions_tenant_id ON qa_standard_revisions(tenant_id);

-- ============================================
-- 3. 质量检查表 (qa_quality_inspections)
-- ============================================
ALTER TABLE qa_quality_inspections ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_quality_inspections SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_quality_inspections ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_quality_inspections_tenant_id ON qa_quality_inspections(tenant_id);

-- ============================================
-- 4. 检查结果表 (qa_inspection_results)
-- ============================================
ALTER TABLE qa_inspection_results ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_inspection_results ir SET tenant_id = (SELECT i.tenant_id FROM qa_quality_inspections i WHERE i.id = ir.inspection_id) WHERE tenant_id IS NULL;
ALTER TABLE qa_inspection_results ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_inspection_results_tenant_id ON qa_inspection_results(tenant_id);

-- ============================================
-- 5. 检查审核表 (qa_inspection_audits)
-- ============================================
ALTER TABLE qa_inspection_audits ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_inspection_audits ia SET tenant_id = (SELECT i.tenant_id FROM qa_quality_inspections i WHERE i.id = ia.inspection_id) WHERE tenant_id IS NULL;
ALTER TABLE qa_inspection_audits ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_inspection_audits_tenant_id ON qa_inspection_audits(tenant_id);

-- ============================================
-- 6. 质量问题表 (qa_quality_issues)
-- ============================================
ALTER TABLE qa_quality_issues ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_quality_issues SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_quality_issues ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_quality_issues_tenant_id ON qa_quality_issues(tenant_id);

-- ============================================
-- 7. 纠正措施表 (qa_corrective_actions)
-- ============================================
ALTER TABLE qa_corrective_actions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_corrective_actions SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_corrective_actions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_corrective_actions_tenant_id ON qa_corrective_actions(tenant_id);

-- ============================================
-- 8. 纠正措施项表 (qa_corrective_action_items)
-- ============================================
ALTER TABLE qa_corrective_action_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_corrective_action_items cai SET tenant_id = (SELECT ca.tenant_id FROM qa_corrective_actions ca WHERE ca.id = cai.action_id) WHERE tenant_id IS NULL;
ALTER TABLE qa_corrective_action_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_corrective_action_items_tenant_id ON qa_corrective_action_items(tenant_id);

-- ============================================
-- 9. 审核计划表 (qa_audit_plans)
-- ============================================
ALTER TABLE qa_audit_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_audit_plans SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_audit_plans ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_audit_plans_tenant_id ON qa_audit_plans(tenant_id);

-- ============================================
-- 10. 审核任务表 (qa_audit_tasks)
-- ============================================
ALTER TABLE qa_audit_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_audit_tasks at SET tenant_id = (SELECT ap.tenant_id FROM qa_audit_plans ap WHERE ap.id = at.plan_id) WHERE tenant_id IS NULL;
ALTER TABLE qa_audit_tasks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_audit_tasks_tenant_id ON qa_audit_tasks(tenant_id);

-- ============================================
-- 11. 审核发现表 (qa_audit_findings)
-- ============================================
ALTER TABLE qa_audit_findings ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_audit_findings af SET tenant_id = (SELECT ap.tenant_id FROM qa_audit_plans ap WHERE ap.id = af.plan_id) WHERE tenant_id IS NULL;
ALTER TABLE qa_audit_findings ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_audit_findings_tenant_id ON qa_audit_findings(tenant_id);

-- ============================================
-- 12. SPC 图表表 (qa_spc_charts)
-- ============================================
ALTER TABLE qa_spc_charts ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_spc_charts SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_spc_charts ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_spc_charts_tenant_id ON qa_spc_charts(tenant_id);

-- ============================================
-- 13. SPC 数据点表 (qa_spc_data_points)
-- ============================================
ALTER TABLE qa_spc_data_points ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_spc_data_points dp SET tenant_id = (SELECT c.tenant_id FROM qa_spc_charts c WHERE c.id = dp.chart_id) WHERE tenant_id IS NULL;
ALTER TABLE qa_spc_data_points ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_spc_data_points_tenant_id ON qa_spc_data_points(tenant_id);

-- ============================================
-- 14. 质量成本表 (qa_quality_costs)
-- ============================================
ALTER TABLE qa_quality_costs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_quality_costs SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_quality_costs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_quality_costs_tenant_id ON qa_quality_costs(tenant_id);

-- ============================================
-- 15. 8D 报告表 (qa_eightd_reports)
-- ============================================
ALTER TABLE qa_eightd_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_eightd_reports SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_eightd_reports ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_eightd_reports_tenant_id ON qa_eightd_reports(tenant_id);

-- ============================================
-- 16. 8D 审核日志表 (qa_eightd_audit_logs)
-- ============================================
ALTER TABLE qa_eightd_audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_eightd_audit_logs al SET tenant_id = (SELECT r.tenant_id FROM qa_eightd_reports r WHERE r.id = al.report_id) WHERE tenant_id IS NULL;
ALTER TABLE qa_eightd_audit_logs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_eightd_audit_logs_tenant_id ON qa_eightd_audit_logs(tenant_id);

-- ============================================
-- 17. FMEA 分析表 (qa_fmea_analyses)
-- ============================================
ALTER TABLE qa_fmea_analyses ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_fmea_analyses SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_fmea_analyses ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_fmea_analyses_tenant_id ON qa_fmea_analyses(tenant_id);

-- ============================================
-- 18. FMEA 项目表 (qa_fmea_items)
-- ============================================
ALTER TABLE qa_fmea_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_fmea_items fi SET tenant_id = (SELECT fa.tenant_id FROM qa_fmea_analyses fa WHERE fa.id = fi.fmea_id) WHERE tenant_id IS NULL;
ALTER TABLE qa_fmea_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_fmea_items_tenant_id ON qa_fmea_items(tenant_id);

-- ============================================
-- 19. 告警规则表 (qa_alert_rules)
-- ============================================
ALTER TABLE qa_alert_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_alert_rules SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_alert_rules ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_alert_rules_tenant_id ON qa_alert_rules(tenant_id);

-- ============================================
-- 20. 告警消息表 (qa_alert_messages)
-- ============================================
ALTER TABLE qa_alert_messages ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_alert_messages SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_alert_messages ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_alert_messages_tenant_id ON qa_alert_messages(tenant_id);

-- ============================================
-- 21. APQP 项目表 (qa_apqp_projects)
-- ============================================
ALTER TABLE qa_apqp_projects ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_apqp_projects SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_apqp_projects ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_apqp_projects_tenant_id ON qa_apqp_projects(tenant_id);

-- ============================================
-- 22. APQP 阶段表 (qa_apqp_phases)
-- ============================================
ALTER TABLE qa_apqp_phases ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_apqp_phases p SET tenant_id = (SELECT pr.tenant_id FROM qa_apqp_projects pr WHERE pr.id = p.project_id) WHERE tenant_id IS NULL;
ALTER TABLE qa_apqp_phases ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_apqp_phases_tenant_id ON qa_apqp_phases(tenant_id);

-- ============================================
-- 23. APQP 任务表 (qa_apqp_tasks)
-- ============================================
ALTER TABLE qa_apqp_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_apqp_tasks t SET tenant_id = (SELECT pr.tenant_id FROM qa_apqp_projects pr WHERE pr.id = t.project_id) WHERE tenant_id IS NULL;
ALTER TABLE qa_apqp_tasks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_apqp_tasks_tenant_id ON qa_apqp_tasks(tenant_id);

-- ============================================
-- 24. APQP 风险表 (qa_apqp_risks)
-- ============================================
ALTER TABLE qa_apqp_risks ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_apqp_risks r SET tenant_id = (SELECT pr.tenant_id FROM qa_apqp_projects pr WHERE pr.id = r.project_id) WHERE tenant_id IS NULL;
ALTER TABLE qa_apqp_risks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_apqp_risks_tenant_id ON qa_apqp_risks(tenant_id);

-- ============================================
-- 25. APQP 审批表 (qa_apqp_approvals)
-- ============================================
ALTER TABLE qa_apqp_approvals ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_apqp_approvals a SET tenant_id = (SELECT pr.tenant_id FROM qa_apqp_projects pr WHERE pr.id = a.project_id) WHERE tenant_id IS NULL;
ALTER TABLE qa_apqp_approvals ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_apqp_approvals_tenant_id ON qa_apqp_approvals(tenant_id);

-- ============================================
-- 26. QMS 同步记录表 (qa_qms_sync_records)
-- ============================================
ALTER TABLE qa_qms_sync_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_qms_sync_records SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_qms_sync_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_qms_sync_records_tenant_id ON qa_qms_sync_records(tenant_id);

-- ============================================
-- 行级安全策略 (RLS)
-- ============================================

-- 启用 RLS
ALTER TABLE qa_standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_standard_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_inspection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_inspection_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_quality_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_corrective_action_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_audit_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_audit_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_spc_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_spc_data_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_quality_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_eightd_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_eightd_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_fmea_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_fmea_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_alert_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_apqp_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_apqp_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_apqp_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_apqp_risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_apqp_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_qms_sync_records ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
DO $$
DECLARE
    tables text[] := ARRAY[
        'qa_standards',
        'qa_standard_revisions',
        'qa_quality_inspections',
        'qa_inspection_results',
        'qa_inspection_audits',
        'qa_quality_issues',
        'qa_corrective_actions',
        'qa_corrective_action_items',
        'qa_audit_plans',
        'qa_audit_tasks',
        'qa_audit_findings',
        'qa_spc_charts',
        'qa_spc_data_points',
        'qa_quality_costs',
        'qa_eightd_reports',
        'qa_eightd_audit_logs',
        'qa_fmea_analyses',
        'qa_fmea_items',
        'qa_alert_rules',
        'qa_alert_messages',
        'qa_apqp_projects',
        'qa_apqp_phases',
        'qa_apqp_tasks',
        'qa_apqp_risks',
        'qa_apqp_approvals',
        'qa_qms_sync_records'
    ];
    t text;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS %s_tenant_isolation_policy ON %s', t, t);
        EXECUTE format('CREATE POLICY %s_tenant_isolation_policy ON %s FOR ALL USING (tenant_id = current_setting(''app.current_tenant'')::uuid) WITH CHECK (tenant_id = current_setting(''app.current_tenant'')::uuid)', t, t);
    END LOOP;
END $$;

-- 添加列注释
COMMENT ON COLUMN qa_standards.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_standard_revisions.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_quality_inspections.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_inspection_results.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_inspection_audits.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_quality_issues.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_corrective_actions.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_corrective_action_items.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_audit_plans.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_audit_tasks.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_audit_findings.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_spc_charts.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_spc_data_points.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_quality_costs.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_eightd_reports.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_eightd_audit_logs.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_fmea_analyses.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_fmea_items.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_alert_rules.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_alert_messages.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_apqp_projects.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_apqp_phases.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_apqp_tasks.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_apqp_risks.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_apqp_approvals.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN qa_qms_sync_records.tenant_id IS '租户ID，用于多租户隔离';

COMMIT;
