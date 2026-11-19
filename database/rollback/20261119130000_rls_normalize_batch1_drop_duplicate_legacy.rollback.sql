-- 回滚 20261119130000：恢复批 1 删除的 71 条遗留策略（逐字还原名称/命令/角色/表达式）。
-- 前置：每表恰好 1 条 rls_tenant_isolation；后置：每表 2 条策略。
-- 事务：文件内不含 BEGIN/COMMIT，手工执行请用 psql --single-transaction。
SET search_path = pg_catalog, pg_temp;
SET lock_timeout = '5s';
SET statement_timeout = '300s';

DO $pre$
DECLARE v_item text; v_n int;
BEGIN
  FOREACH v_item IN ARRAY ARRAY['bi|report_templates|tenant_isolation_report_templates',
    'communication|notification_channels|tenant_isolation_notification_channels',
    'crm|contacts|tenant_isolation_contacts',
    'crm|customer_finance|tenant_isolation_customer_finance',
    'crm|customer_tags|tenant_isolation_customer_tags',
    'crm|interactions|tenant_isolation_interactions',
    'crm|opportunities|tenant_isolation_opportunities',
    'crm|tags|tenant_isolation_tags',
    'erp|announcements|tenant_isolation_announcements',
    'erp|assets|tenant_isolation_assets',
    'erp|fin_reconciliations|tenant_isolation_fin_reconciliations',
    'erp|inventory|tenant_isolation_inventory',
    'erp|materials|tenant_isolation_materials',
    'erp|purchase_orders|tenant_isolation_purchase_orders',
    'erp|voucher_items|tenant_isolation_voucher_items',
    'hrm|attendance_records|tenant_isolation_attendance_records',
    'hrm|candidates|tenant_isolation_candidates',
    'hrm|companies|tenant_isolation_companies',
    'hrm|contract_renewals|tenant_isolation_contract_renewals',
    'hrm|contracts|tenant_isolation_contracts',
    'hrm|departments|tenant_isolation_departments',
    'hrm|employees|tenant_isolation_employees',
    'hrm|interviews|tenant_isolation_interviews',
    'hrm|job_openings|tenant_isolation_job_openings',
    'hrm|leave_records|tenant_isolation_leave_records',
    'hrm|payroll_details|tenant_isolation_payroll_details',
    'hrm|payroll_items|tenant_isolation_payroll_items',
    'hrm|payroll_records|tenant_isolation_payroll_records',
    'hrm|payroll_runs|tenant_isolation_payroll_runs',
    'hrm|performance_goals|tenant_isolation_performance_goals',
    'hrm|performance_records|tenant_isolation_performance_records',
    'hrm|performance_reviews|tenant_isolation_performance_reviews',
    'hrm|positions|tenant_isolation_positions',
    'hrm|recruitment_applications|tenant_isolation_recruitment_applications',
    'hrm|recruitment_records|tenant_isolation_recruitment_records',
    'hrm|salary_adjustments|tenant_isolation_salary_adjustments',
    'hrm|training_courses|tenant_isolation_training_courses',
    'hrm|training_participants|tenant_isolation_training_participants',
    'hrm|training_plans|tenant_isolation_training_plans',
    'hrm|training_records|tenant_isolation_training_records',
    'iam|permission_audit_logs|tenant_isolation_permission_audit_logs',
    'iam|position_permissions|tenant_isolation_position_permissions',
    'iam|position_roles|tenant_isolation_position_roles',
    'iam|positions|tenant_isolation_positions',
    'iam|resource_permissions|tenant_isolation_resource_permissions',
    'iam|user_positions|tenant_isolation_user_positions',
    'master_data|materials|tenant_isolation_materials',
    'master_data|samples|tenant_isolation_samples',
    'master_data|uoms|tenant_isolation_uoms',
    'public|_archive_core_workflow_versions|tenant_isolation_core_workflow_versions',
    'public|tenant_permissions|tenant_isolation_tenant_permissions',
    'qms|qa_audit_findings|tenant_isolation_qa_audit_findings',
    'qms|qa_audit_plans|tenant_isolation_qa_audit_plans',
    'qms|qa_audit_tasks|tenant_isolation_qa_audit_tasks',
    'qms|qa_corrective_action_items|tenant_isolation_qa_corrective_action_items',
    'qms|qa_corrective_actions|tenant_isolation_qa_corrective_actions',
    'qms|qa_eightd_audit_logs|tenant_isolation_qa_eightd_audit_logs',
    'qms|qa_eightd_reports|tenant_isolation_qa_eightd_reports',
    'qms|qa_fmea_analyses|tenant_isolation_qa_fmea_analyses',
    'qms|qa_fmea_items|tenant_isolation_qa_fmea_items',
    'qms|qa_inspection_audits|tenant_isolation_qa_inspection_audits',
    'qms|qa_inspection_results|tenant_isolation_qa_inspection_results',
    'qms|qa_qms_sync_records|tenant_isolation_qa_qms_sync_records',
    'qms|qa_quality_costs|tenant_isolation_qa_quality_costs',
    'qms|qa_quality_inspections|tenant_isolation_qa_quality_inspections',
    'qms|qa_quality_issues|tenant_isolation_qa_quality_issues',
    'qms|qa_spc_charts|tenant_isolation_qa_spc_charts',
    'qms|qa_spc_data_points|tenant_isolation_qa_spc_data_points',
    'qms|qa_standard_revisions|tenant_isolation_qa_standard_revisions',
    'qms|qa_standards|tenant_isolation_qa_standards',
    'rs|change_requests|tenant_isolation_change_requests']
  LOOP
    SELECT count(*) INTO v_n
      FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=split_part(v_item,'|',1) AND c.relname=split_part(v_item,'|',2);
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'rollback precheck: %.% 期望 1 条 canonical，实际 %', split_part(v_item,'|',1), split_part(v_item,'|',2), v_n;
    END IF;
  END LOOP;
END $pre$;

CREATE POLICY "tenant_isolation_announcements" ON "erp"."announcements" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_assets" ON "erp"."assets" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_attendance_records" ON "hrm"."attendance_records" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_candidates" ON "hrm"."candidates" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_change_requests" ON "rs"."change_requests" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_companies" ON "hrm"."companies" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_contacts" ON "crm"."contacts" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_contract_renewals" ON "hrm"."contract_renewals" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_contracts" ON "hrm"."contracts" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_core_workflow_versions" ON "public"."_archive_core_workflow_versions" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_customer_finance" ON "crm"."customer_finance" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_customer_tags" ON "crm"."customer_tags" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_departments" ON "hrm"."departments" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_employees" ON "hrm"."employees" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_fin_reconciliations" ON "erp"."fin_reconciliations" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_interactions" ON "crm"."interactions" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_interviews" ON "hrm"."interviews" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_inventory" ON "erp"."inventory" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_job_openings" ON "hrm"."job_openings" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_leave_records" ON "hrm"."leave_records" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_materials" ON "erp"."materials" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_materials" ON "master_data"."materials" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_notification_channels" ON "communication"."notification_channels" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_opportunities" ON "crm"."opportunities" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_payroll_details" ON "hrm"."payroll_details" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_payroll_items" ON "hrm"."payroll_items" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_payroll_records" ON "hrm"."payroll_records" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_payroll_runs" ON "hrm"."payroll_runs" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_performance_goals" ON "hrm"."performance_goals" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_performance_records" ON "hrm"."performance_records" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_performance_reviews" ON "hrm"."performance_reviews" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_permission_audit_logs" ON "iam"."permission_audit_logs" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_position_permissions" ON "iam"."position_permissions" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_position_roles" ON "iam"."position_roles" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_positions" ON "hrm"."positions" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_positions" ON "iam"."positions" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_purchase_orders" ON "erp"."purchase_orders" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_audit_findings" ON "qms"."qa_audit_findings" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_audit_plans" ON "qms"."qa_audit_plans" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_audit_tasks" ON "qms"."qa_audit_tasks" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_corrective_action_items" ON "qms"."qa_corrective_action_items" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_corrective_actions" ON "qms"."qa_corrective_actions" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_eightd_audit_logs" ON "qms"."qa_eightd_audit_logs" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_eightd_reports" ON "qms"."qa_eightd_reports" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_fmea_analyses" ON "qms"."qa_fmea_analyses" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_fmea_items" ON "qms"."qa_fmea_items" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_inspection_audits" ON "qms"."qa_inspection_audits" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_inspection_results" ON "qms"."qa_inspection_results" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_qms_sync_records" ON "qms"."qa_qms_sync_records" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_quality_costs" ON "qms"."qa_quality_costs" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_quality_inspections" ON "qms"."qa_quality_inspections" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_quality_issues" ON "qms"."qa_quality_issues" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_spc_charts" ON "qms"."qa_spc_charts" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_spc_data_points" ON "qms"."qa_spc_data_points" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_standard_revisions" ON "qms"."qa_standard_revisions" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_qa_standards" ON "qms"."qa_standards" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_recruitment_applications" ON "hrm"."recruitment_applications" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_recruitment_records" ON "hrm"."recruitment_records" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_report_templates" ON "bi"."report_templates" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_resource_permissions" ON "iam"."resource_permissions" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_salary_adjustments" ON "hrm"."salary_adjustments" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_samples" ON "master_data"."samples" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_tags" ON "crm"."tags" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_tenant_permissions" ON "public"."tenant_permissions" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_training_courses" ON "hrm"."training_courses" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_training_participants" ON "hrm"."training_participants" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_training_plans" ON "hrm"."training_plans" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_training_records" ON "hrm"."training_records" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_uoms" ON "master_data"."uoms" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_user_positions" ON "iam"."user_positions" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_voucher_items" ON "erp"."voucher_items" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

DO $post$
DECLARE v_item text; v_n int; v_legacy int;
BEGIN
  FOREACH v_item IN ARRAY ARRAY['bi|report_templates|tenant_isolation_report_templates',
    'communication|notification_channels|tenant_isolation_notification_channels',
    'crm|contacts|tenant_isolation_contacts',
    'crm|customer_finance|tenant_isolation_customer_finance',
    'crm|customer_tags|tenant_isolation_customer_tags',
    'crm|interactions|tenant_isolation_interactions',
    'crm|opportunities|tenant_isolation_opportunities',
    'crm|tags|tenant_isolation_tags',
    'erp|announcements|tenant_isolation_announcements',
    'erp|assets|tenant_isolation_assets',
    'erp|fin_reconciliations|tenant_isolation_fin_reconciliations',
    'erp|inventory|tenant_isolation_inventory',
    'erp|materials|tenant_isolation_materials',
    'erp|purchase_orders|tenant_isolation_purchase_orders',
    'erp|voucher_items|tenant_isolation_voucher_items',
    'hrm|attendance_records|tenant_isolation_attendance_records',
    'hrm|candidates|tenant_isolation_candidates',
    'hrm|companies|tenant_isolation_companies',
    'hrm|contract_renewals|tenant_isolation_contract_renewals',
    'hrm|contracts|tenant_isolation_contracts',
    'hrm|departments|tenant_isolation_departments',
    'hrm|employees|tenant_isolation_employees',
    'hrm|interviews|tenant_isolation_interviews',
    'hrm|job_openings|tenant_isolation_job_openings',
    'hrm|leave_records|tenant_isolation_leave_records',
    'hrm|payroll_details|tenant_isolation_payroll_details',
    'hrm|payroll_items|tenant_isolation_payroll_items',
    'hrm|payroll_records|tenant_isolation_payroll_records',
    'hrm|payroll_runs|tenant_isolation_payroll_runs',
    'hrm|performance_goals|tenant_isolation_performance_goals',
    'hrm|performance_records|tenant_isolation_performance_records',
    'hrm|performance_reviews|tenant_isolation_performance_reviews',
    'hrm|positions|tenant_isolation_positions',
    'hrm|recruitment_applications|tenant_isolation_recruitment_applications',
    'hrm|recruitment_records|tenant_isolation_recruitment_records',
    'hrm|salary_adjustments|tenant_isolation_salary_adjustments',
    'hrm|training_courses|tenant_isolation_training_courses',
    'hrm|training_participants|tenant_isolation_training_participants',
    'hrm|training_plans|tenant_isolation_training_plans',
    'hrm|training_records|tenant_isolation_training_records',
    'iam|permission_audit_logs|tenant_isolation_permission_audit_logs',
    'iam|position_permissions|tenant_isolation_position_permissions',
    'iam|position_roles|tenant_isolation_position_roles',
    'iam|positions|tenant_isolation_positions',
    'iam|resource_permissions|tenant_isolation_resource_permissions',
    'iam|user_positions|tenant_isolation_user_positions',
    'master_data|materials|tenant_isolation_materials',
    'master_data|samples|tenant_isolation_samples',
    'master_data|uoms|tenant_isolation_uoms',
    'public|_archive_core_workflow_versions|tenant_isolation_core_workflow_versions',
    'public|tenant_permissions|tenant_isolation_tenant_permissions',
    'qms|qa_audit_findings|tenant_isolation_qa_audit_findings',
    'qms|qa_audit_plans|tenant_isolation_qa_audit_plans',
    'qms|qa_audit_tasks|tenant_isolation_qa_audit_tasks',
    'qms|qa_corrective_action_items|tenant_isolation_qa_corrective_action_items',
    'qms|qa_corrective_actions|tenant_isolation_qa_corrective_actions',
    'qms|qa_eightd_audit_logs|tenant_isolation_qa_eightd_audit_logs',
    'qms|qa_eightd_reports|tenant_isolation_qa_eightd_reports',
    'qms|qa_fmea_analyses|tenant_isolation_qa_fmea_analyses',
    'qms|qa_fmea_items|tenant_isolation_qa_fmea_items',
    'qms|qa_inspection_audits|tenant_isolation_qa_inspection_audits',
    'qms|qa_inspection_results|tenant_isolation_qa_inspection_results',
    'qms|qa_qms_sync_records|tenant_isolation_qa_qms_sync_records',
    'qms|qa_quality_costs|tenant_isolation_qa_quality_costs',
    'qms|qa_quality_inspections|tenant_isolation_qa_quality_inspections',
    'qms|qa_quality_issues|tenant_isolation_qa_quality_issues',
    'qms|qa_spc_charts|tenant_isolation_qa_spc_charts',
    'qms|qa_spc_data_points|tenant_isolation_qa_spc_data_points',
    'qms|qa_standard_revisions|tenant_isolation_qa_standard_revisions',
    'qms|qa_standards|tenant_isolation_qa_standards',
    'rs|change_requests|tenant_isolation_change_requests']
  LOOP
    SELECT count(*), count(*) FILTER (WHERE p.polname = split_part(v_item,'|',3))
      INTO v_n, v_legacy
      FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=split_part(v_item,'|',1) AND c.relname=split_part(v_item,'|',2);
    IF v_n <> 2 OR v_legacy <> 1 THEN
      RAISE EXCEPTION 'rollback postcheck: % 期望 canonical+legacy 共 2 条，实际 % / legacy %', v_item, v_n, v_legacy;
    END IF;
  END LOOP;
END $post$;
