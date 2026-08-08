-- TOPEMS LIMS 数据库迁移脚本
-- 为所有 LIMS 表添加 tenant_id 字段以支持多租户

-- ============================================
-- 1. 样品表 (qa_lab_samples)
-- ============================================
ALTER TABLE qa_lab_samples ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lab_samples SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lab_samples ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lab_samples_tenant_id ON qa_lab_samples(tenant_id);
COMMENT ON COLUMN qa_lab_samples.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 2. 检验任务表 (qa_lab_tasks)
-- ============================================
ALTER TABLE qa_lab_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lab_tasks t SET tenant_id = (SELECT s.tenant_id FROM qa_lab_samples s WHERE s.id = t.sample_id) WHERE tenant_id IS NULL;
UPDATE qa_lab_tasks SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lab_tasks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lab_tasks_tenant_id ON qa_lab_tasks(tenant_id);
COMMENT ON COLUMN qa_lab_tasks.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 3. 检验记录表 (qa_lab_records)
-- ============================================
ALTER TABLE qa_lab_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lab_records r SET tenant_id = (SELECT t.tenant_id FROM qa_lab_tasks t WHERE t.id = r.task_id) WHERE tenant_id IS NULL;
UPDATE qa_lab_records SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lab_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lab_records_tenant_id ON qa_lab_records(tenant_id);
COMMENT ON COLUMN qa_lab_records.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 4. 仪器表 (qa_lab_instruments)
-- ============================================
ALTER TABLE qa_lab_instruments ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lab_instruments SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lab_instruments ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lab_instruments_tenant_id ON qa_lab_instruments(tenant_id);
COMMENT ON COLUMN qa_lab_instruments.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 5. 试剂表 (qa_lab_reagents)
-- ============================================
ALTER TABLE qa_lab_reagents ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lab_reagents SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lab_reagents ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lab_reagents_tenant_id ON qa_lab_reagents(tenant_id);
COMMENT ON COLUMN qa_lab_reagents.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 6. 流程表 (qa_lab_processes)
-- ============================================
ALTER TABLE qa_lab_processes ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lab_processes SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lab_processes ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lab_processes_tenant_id ON qa_lab_processes(tenant_id);
COMMENT ON COLUMN qa_lab_processes.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 7. 样品生命周期表 (qa_lab_sample_lifecycle)
-- ============================================
ALTER TABLE qa_lab_sample_lifecycle ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lab_sample_lifecycle sl SET tenant_id = (SELECT s.tenant_id FROM qa_lab_samples s WHERE s.id = sl.sample_id) WHERE tenant_id IS NULL;
UPDATE qa_lab_sample_lifecycle SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lab_sample_lifecycle ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lab_sample_lifecycle_tenant_id ON qa_lab_sample_lifecycle(tenant_id);
COMMENT ON COLUMN qa_lab_sample_lifecycle.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 8. 仪器校准记录表 (qa_lab_calibration_records)
-- ============================================
ALTER TABLE qa_lab_calibration_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lab_calibration_records cr SET tenant_id = (SELECT i.tenant_id FROM qa_lab_instruments i WHERE i.id = cr.instrument_id) WHERE tenant_id IS NULL;
UPDATE qa_lab_calibration_records SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lab_calibration_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lab_calibration_records_tenant_id ON qa_lab_calibration_records(tenant_id);
COMMENT ON COLUMN qa_lab_calibration_records.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 9. 试剂告警表 (qa_lab_reagent_alerts)
-- ============================================
ALTER TABLE qa_lab_reagent_alerts ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lab_reagent_alerts ra SET tenant_id = (SELECT r.tenant_id FROM qa_lab_reagents r WHERE r.id = ra.reagent_id) WHERE tenant_id IS NULL;
UPDATE qa_lab_reagent_alerts SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lab_reagent_alerts ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lab_reagent_alerts_tenant_id ON qa_lab_reagent_alerts(tenant_id);
COMMENT ON COLUMN qa_lab_reagent_alerts.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 10. 试剂历史表 (qa_lab_reagent_history)
-- ============================================
ALTER TABLE qa_lab_reagent_history ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lab_reagent_history rh SET tenant_id = (SELECT r.tenant_id FROM qa_lab_reagents r WHERE r.id = rh.reagent_id) WHERE tenant_id IS NULL;
UPDATE qa_lab_reagent_history SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lab_reagent_history ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lab_reagent_history_tenant_id ON qa_lab_reagent_history(tenant_id);
COMMENT ON COLUMN qa_lab_reagent_history.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 11. 检验报告表 (qa_lab_inspection_reports)
-- ============================================
ALTER TABLE qa_lab_inspection_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lab_inspection_reports ir SET tenant_id = (SELECT s.tenant_id FROM qa_lab_samples s WHERE s.id = ir.sample_id) WHERE tenant_id IS NULL;
UPDATE qa_lab_inspection_reports SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lab_inspection_reports ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lab_inspection_reports_tenant_id ON qa_lab_inspection_reports(tenant_id);
COMMENT ON COLUMN qa_lab_inspection_reports.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 12. 数据同步记录表 (qa_lims_sync_records)
-- ============================================
ALTER TABLE qa_lims_sync_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_sync_records SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_sync_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_sync_records_tenant_id ON qa_lims_sync_records(tenant_id);
COMMENT ON COLUMN qa_lims_sync_records.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 13. 样品条形码表 (qa_lims_sample_barcodes)
-- ============================================
ALTER TABLE qa_lims_sample_barcodes ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_sample_barcodes sb SET tenant_id = (SELECT s.tenant_id FROM qa_lab_samples s WHERE s.id = sb.sample_id) WHERE tenant_id IS NULL;
UPDATE qa_lims_sample_barcodes SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_sample_barcodes ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_sample_barcodes_tenant_id ON qa_lims_sample_barcodes(tenant_id);
COMMENT ON COLUMN qa_lims_sample_barcodes.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 14. 条码扫描记录表 (qa_lims_barcode_scan_records)
-- ============================================
ALTER TABLE qa_lims_barcode_scan_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_barcode_scan_records bsr SET tenant_id = (SELECT sb.tenant_id FROM qa_lims_sample_barcodes sb WHERE sb.id = bsr.barcode_id) WHERE tenant_id IS NULL;
UPDATE qa_lims_barcode_scan_records SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_barcode_scan_records ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_barcode_scan_records_tenant_id ON qa_lims_barcode_scan_records(tenant_id);
COMMENT ON COLUMN qa_lims_barcode_scan_records.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 15. RFID标签表 (qa_lims_rfid_tags)
-- ============================================
ALTER TABLE qa_lims_rfid_tags ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_rfid_tags rt SET tenant_id = (SELECT s.tenant_id FROM qa_lab_samples s WHERE s.id = rt.sample_id) WHERE tenant_id IS NULL;
UPDATE qa_lims_rfid_tags SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_rfid_tags ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_rfid_tags_tenant_id ON qa_lims_rfid_tags(tenant_id);
COMMENT ON COLUMN qa_lims_rfid_tags.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 16. 方法分类表 (qa_lims_method_categories)
-- ============================================
ALTER TABLE qa_lims_method_categories ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_method_categories SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_method_categories ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_method_categories_tenant_id ON qa_lims_method_categories(tenant_id);
COMMENT ON COLUMN qa_lims_method_categories.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 17. 检测方法表 (qa_lims_test_methods)
-- ============================================
ALTER TABLE qa_lims_test_methods ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_test_methods SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_test_methods ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_test_methods_tenant_id ON qa_lims_test_methods(tenant_id);
COMMENT ON COLUMN qa_lims_test_methods.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 18. 方法验证表 (qa_lims_method_validations)
-- ============================================
ALTER TABLE qa_lims_method_validations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_method_validations mv SET tenant_id = (SELECT tm.tenant_id FROM qa_lims_test_methods tm WHERE tm.id = mv.method_id) WHERE tenant_id IS NULL;
UPDATE qa_lims_method_validations SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_method_validations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_method_validations_tenant_id ON qa_lims_method_validations(tenant_id);
COMMENT ON COLUMN qa_lims_method_validations.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 19. 方法版本表 (qa_lims_method_versions)
-- ============================================
ALTER TABLE qa_lims_method_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_method_versions mv SET tenant_id = (SELECT tm.tenant_id FROM qa_lims_test_methods tm WHERE tm.id = mv.method_id) WHERE tenant_id IS NULL;
UPDATE qa_lims_method_versions SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_method_versions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_method_versions_tenant_id ON qa_lims_method_versions(tenant_id);
COMMENT ON COLUMN qa_lims_method_versions.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 20. 能力验证计划表 (qa_lims_pt_plans)
-- ============================================
ALTER TABLE qa_lims_pt_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_pt_plans SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_pt_plans ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_plans_tenant_id ON qa_lims_pt_plans(tenant_id);
COMMENT ON COLUMN qa_lims_pt_plans.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 21. 能力验证样品表 (qa_lims_pt_samples)
-- ============================================
ALTER TABLE qa_lims_pt_samples ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_pt_samples ps SET tenant_id = (SELECT pp.tenant_id FROM qa_lims_pt_plans pp WHERE pp.id = ps.plan_id) WHERE tenant_id IS NULL;
UPDATE qa_lims_pt_samples SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_pt_samples ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_samples_tenant_id ON qa_lims_pt_samples(tenant_id);
COMMENT ON COLUMN qa_lims_pt_samples.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 22. 能力验证结果表 (qa_lims_pt_results)
-- ============================================
ALTER TABLE qa_lims_pt_results ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_pt_results pr SET tenant_id = (SELECT pp.tenant_id FROM qa_lims_pt_plans pp WHERE pp.id = pr.plan_id) WHERE tenant_id IS NULL;
UPDATE qa_lims_pt_results SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_pt_results ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_results_tenant_id ON qa_lims_pt_results(tenant_id);
COMMENT ON COLUMN qa_lims_pt_results.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 23. 能力验证评价表 (qa_lims_pt_evaluations)
-- ============================================
ALTER TABLE qa_lims_pt_evaluations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_pt_evaluations pe SET tenant_id = (SELECT pp.tenant_id FROM qa_lims_pt_plans pp WHERE pp.id = pe.plan_id) WHERE tenant_id IS NULL;
UPDATE qa_lims_pt_evaluations SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_pt_evaluations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_evaluations_tenant_id ON qa_lims_pt_evaluations(tenant_id);
COMMENT ON COLUMN qa_lims_pt_evaluations.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 24. 能力验证纠正措施表 (qa_lims_pt_corrective_actions)
-- ============================================
ALTER TABLE qa_lims_pt_corrective_actions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_pt_corrective_actions pca SET tenant_id = (SELECT pp.tenant_id FROM qa_lims_pt_plans pp WHERE pp.id = pca.plan_id) WHERE tenant_id IS NULL;
UPDATE qa_lims_pt_corrective_actions SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_pt_corrective_actions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_pt_corrective_actions_tenant_id ON qa_lims_pt_corrective_actions(tenant_id);
COMMENT ON COLUMN qa_lims_pt_corrective_actions.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 25. 不确定度项目表 (qa_lims_uncertainty_projects)
-- ============================================
ALTER TABLE qa_lims_uncertainty_projects ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_uncertainty_projects SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_uncertainty_projects ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_projects_tenant_id ON qa_lims_uncertainty_projects(tenant_id);
COMMENT ON COLUMN qa_lims_uncertainty_projects.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 26. 不确定度来源表 (qa_lims_uncertainty_sources)
-- ============================================
ALTER TABLE qa_lims_uncertainty_sources ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_uncertainty_sources us SET tenant_id = (SELECT up.tenant_id FROM qa_lims_uncertainty_projects up WHERE up.id = us.project_id) WHERE tenant_id IS NULL;
UPDATE qa_lims_uncertainty_sources SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_uncertainty_sources ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_sources_tenant_id ON qa_lims_uncertainty_sources(tenant_id);
COMMENT ON COLUMN qa_lims_uncertainty_sources.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 27. 不确定度分量表 (qa_lims_uncertainty_components)
-- ============================================
ALTER TABLE qa_lims_uncertainty_components ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_uncertainty_components uc SET tenant_id = (SELECT up.tenant_id FROM qa_lims_uncertainty_projects up WHERE up.id = uc.project_id) WHERE tenant_id IS NULL;
UPDATE qa_lims_uncertainty_components SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_uncertainty_components ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_uncertainty_components_tenant_id ON qa_lims_uncertainty_components(tenant_id);
COMMENT ON COLUMN qa_lims_uncertainty_components.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 28. 仪器数据表 (qa_lims_instrument_data)
-- ============================================
ALTER TABLE qa_lims_instrument_data ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_instrument_data id SET tenant_id = (SELECT i.tenant_id FROM qa_lab_instruments i WHERE i.id = id.instrument_id) WHERE tenant_id IS NULL;
UPDATE qa_lims_instrument_data SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_instrument_data ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_instrument_data_tenant_id ON qa_lims_instrument_data(tenant_id);
COMMENT ON COLUMN qa_lims_instrument_data.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 29. 采集任务表 (qa_lims_collection_tasks)
-- ============================================
ALTER TABLE qa_lims_collection_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_collection_tasks ct SET tenant_id = (SELECT i.tenant_id FROM qa_lab_instruments i WHERE i.id = ct.instrument_id) WHERE tenant_id IS NULL;
UPDATE qa_lims_collection_tasks SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_collection_tasks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_collection_tasks_tenant_id ON qa_lims_collection_tasks(tenant_id);
COMMENT ON COLUMN qa_lims_collection_tasks.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 30. 解析规则表 (qa_lims_parse_rules)
-- ============================================
ALTER TABLE qa_lims_parse_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_parse_rules SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_parse_rules ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_parse_rules_tenant_id ON qa_lims_parse_rules(tenant_id);
COMMENT ON COLUMN qa_lims_parse_rules.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 31. 审计日志表 (qa_lims_audit_logs)
-- ============================================
ALTER TABLE qa_lims_audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE qa_lims_audit_logs SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;
ALTER TABLE qa_lims_audit_logs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qa_lims_audit_logs_tenant_id ON qa_lims_audit_logs(tenant_id);
COMMENT ON COLUMN qa_lims_audit_logs.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- RLS (Row Level Security) 行级安全策略
-- ============================================

-- 启用 RLS
ALTER TABLE qa_lab_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lab_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lab_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lab_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lab_reagents ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lab_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lab_sample_lifecycle ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lab_calibration_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lab_reagent_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lab_reagent_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lab_inspection_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_sync_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_sample_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_barcode_scan_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_rfid_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_method_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_test_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_method_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_method_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_pt_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_pt_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_pt_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_pt_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_pt_corrective_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_uncertainty_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_uncertainty_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_uncertainty_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_instrument_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_collection_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_parse_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_lims_audit_logs ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略（使用 app.current_tenant_id() 函数获取当前租户）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lab_samples' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lab_samples
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lab_tasks' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lab_tasks
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lab_records' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lab_records
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lab_instruments' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lab_instruments
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lab_reagents' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lab_reagents
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lab_processes' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lab_processes
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lab_sample_lifecycle' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lab_sample_lifecycle
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lab_calibration_records' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lab_calibration_records
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lab_reagent_alerts' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lab_reagent_alerts
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lab_reagent_history' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lab_reagent_history
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lab_inspection_reports' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lab_inspection_reports
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_sync_records' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_sync_records
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_sample_barcodes' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_sample_barcodes
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_barcode_scan_records' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_barcode_scan_records
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_rfid_tags' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_rfid_tags
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_method_categories' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_method_categories
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_test_methods' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_test_methods
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_method_validations' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_method_validations
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_method_versions' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_method_versions
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_pt_plans' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_pt_plans
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_pt_samples' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_pt_samples
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_pt_results' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_pt_results
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_pt_evaluations' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_pt_evaluations
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_pt_corrective_actions' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_pt_corrective_actions
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_uncertainty_projects' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_uncertainty_projects
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_uncertainty_sources' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_uncertainty_sources
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_uncertainty_components' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_uncertainty_components
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_instrument_data' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_instrument_data
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_collection_tasks' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_collection_tasks
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_parse_rules' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_parse_rules
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'qa_lims_audit_logs' 
        AND policyname = 'tenant_isolation'
    ) THEN
        CREATE POLICY tenant_isolation ON qa_lims_audit_logs
        FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
    END IF;
END $$;
