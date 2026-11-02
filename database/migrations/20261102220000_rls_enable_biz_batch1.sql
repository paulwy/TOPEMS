-- RLS 工程第二子步 batch1：29 张业务表补启 RLS（2026-11-02，幂等 DO 块，列类型适配）
-- 依据：docs/security/rls-gap-inventory-20261102.md

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_compliance_evaluations' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_compliance_evaluations USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE ehs.qa_ehs_compliance_evaluations ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_discharge_permits' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_discharge_permits USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE ehs.qa_ehs_discharge_permits ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_drill_evaluations' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_drill_evaluations USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE ehs.qa_ehs_drill_evaluations ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_env_monitor_records' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_env_monitor_records USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE ehs.qa_ehs_env_monitor_records ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_environment_incidents' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_environment_incidents USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE ehs.qa_ehs_environment_incidents ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_environment_monitors' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_environment_monitors USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE ehs.qa_ehs_environment_monitors ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='ehs' AND tablename='qa_ehs_environmental_regulations' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_environmental_regulations USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE ehs.qa_ehs_environmental_regulations ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='finance' AND tablename='expense_approvals' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON finance.expense_approvals USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE finance.expense_approvals ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='finance' AND tablename='financial_reports' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON finance.financial_reports USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE finance.financial_reports ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='iam' AND tablename='crm_dashboard_snapshots' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON iam.crm_dashboard_snapshots USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE iam.crm_dashboard_snapshots ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='iam' AND tablename='ehs_dashboard_snapshots' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON iam.ehs_dashboard_snapshots USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE iam.ehs_dashboard_snapshots ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='iam' AND tablename='hrm_dashboard_snapshots' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON iam.hrm_dashboard_snapshots USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE iam.hrm_dashboard_snapshots ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='iam' AND tablename='lims_dashboard_snapshots' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON iam.lims_dashboard_snapshots USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE iam.lims_dashboard_snapshots ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='iam' AND tablename='pdm_dashboard_snapshots' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON iam.pdm_dashboard_snapshots USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE iam.pdm_dashboard_snapshots ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='iam' AND tablename='permission_audit_logs' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON iam.permission_audit_logs USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
    );
  END IF;
END $do$;
ALTER TABLE iam.permission_audit_logs ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='iam' AND tablename='tenant_permissions' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON iam.tenant_permissions USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id)::text = NULLIF(current_setting('app.tenant_id', true), '')
    );
  END IF;
END $do$;
ALTER TABLE iam.tenant_permissions ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='iam' AND tablename='wms_dashboard_snapshots' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON iam.wms_dashboard_snapshots USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE iam.wms_dashboard_snapshots ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='lims' AND tablename='qa_lab_samples' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON lims.qa_lab_samples USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE lims.qa_lab_samples ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='lims' AND tablename='qa_lab_tasks' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON lims.qa_lab_tasks USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE lims.qa_lab_tasks ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='master_data' AND tablename='materials' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON master_data.materials USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE master_data.materials ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='master_data' AND tablename='samples' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON master_data.samples USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE master_data.samples ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='master_data' AND tablename='uoms' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON master_data.uoms USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE master_data.uoms ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mes' AND tablename='process_flow_steps' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON mes.process_flow_steps USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE mes.process_flow_steps ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='mes' AND tablename='quality_standard_values' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON mes.quality_standard_values USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE mes.quality_standard_values ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='plugin_erp' AND tablename='accounting_subjects' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON plugin_erp.accounting_subjects USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE plugin_erp.accounting_subjects ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='pm' AND tablename='documents' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON pm.documents USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE pm.documents ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='qa_ehs_risks' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON public.qa_ehs_risks USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE public.qa_ehs_risks ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='scm' AND tablename='incoming_notices' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON scm.incoming_notices USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE scm.incoming_notices ENABLE ROW LEVEL SECURITY;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='scm' AND tablename='scm_master_data_refs' AND policyname='rls_tenant_isolation') THEN
    CREATE POLICY rls_tenant_isolation ON scm.scm_master_data_refs USING (
      (current_setting('app.tenant_id', true) IS NULL) OR
      (current_setting('app.tenant_id', true) = '') OR
      (current_setting('app.tenant_id', true) = '00000000-0000-0000-0000-000000000000') OR
      (tenant_id IS NULL) OR
      (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
    );
  END IF;
END $do$;
ALTER TABLE scm.scm_master_data_refs ENABLE ROW LEVEL SECURITY;

