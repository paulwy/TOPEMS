-- 2026-11-19 RLS 归一 · 批 1：删除「canonical + 遗留」并存表上的重复策略
-- 范围：71 张表（生产 pg_policy 实测：每表恰好 2 条策略）。
-- 目标：删除与 rls_tenant_isolation 并存的 tenant_isolation_<t> 重复策略。
--       这些遗留策略与 canonical 的 USING/WITH CHECK 逐字相同（均为严格 B），
--       删除不改变任何租户的可见行，只消除 permissive OR 的歧义与审计噪音。
-- 保留：rls_platform_read / rls_global_read（平台可见性，语义不同，不在本批）。
-- 依据：docs/database/rls-normalization-draft-2026-11-19.md §2；docs/database/readonly-triage-...-2026-11-19.md §2
-- 前置：canonical 存在且含 app.rls_system、表已 ENABLE+FORCE、遗留策略恰好 1 条。
-- 后置：每表恰好 1 条 rls_tenant_isolation 且 FORCE。
-- 事务：文件内不含 BEGIN/COMMIT，由 apply-forward.sh 包裹。
-- 回滚：database/rollback/20261119130000_rls_normalize_batch1_drop_duplicate_legacy.rollback.sql
-- 状态：草案，未应用、未开窗。

SET search_path = pg_catalog, pg_temp;
SET lock_timeout = '5s';
SET statement_timeout = '300s';

DO $pre$
DECLARE
  v_item text;
  v_schema text;
  v_table text;
  v_legacy text;
  v_n int;
  v_forced boolean;
  v_q text;
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
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);
    v_legacy := split_part(v_item, '|', 3);

    SELECT count(*), bool_and(c.relforcerowsecurity)
      INTO v_n, v_forced
      FROM pg_policy p
      JOIN pg_class c ON c.oid = p.polrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = v_schema AND c.relname = v_table;

    IF v_n <> 2 THEN
      RAISE EXCEPTION 'batch precheck: %.% 期望 2 条策略（canonical+legacy），实际 %', v_schema, v_table, v_n;
    END IF;
    IF NOT v_forced THEN
      RAISE EXCEPTION 'batch precheck: %.% 未 FORCE RLS，拒绝改动', v_schema, v_table;
    END IF;

    SELECT pg_get_expr(p.polqual, p.polrelid) INTO v_q
      FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = v_schema AND c.relname = v_table AND p.polname = 'rls_tenant_isolation';
    IF v_q IS NULL OR v_q NOT LIKE '%rls_system%' THEN
      RAISE EXCEPTION 'batch precheck: %.% 的 canonical 策略不存在或不含系统通道', v_schema, v_table;
    END IF;

    SELECT count(*) INTO v_n
      FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = v_schema AND c.relname = v_table AND p.polname = v_legacy;
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'batch precheck: %.% 的遗留策略 % 不存在或重名（%）', v_schema, v_table, v_legacy, v_n;
    END IF;
  END LOOP;
END $pre$;

-- 71 条 DROP（仅策略，无数据 DDL）
DROP POLICY "tenant_isolation_announcements" ON "erp"."announcements";
DROP POLICY "tenant_isolation_assets" ON "erp"."assets";
DROP POLICY "tenant_isolation_attendance_records" ON "hrm"."attendance_records";
DROP POLICY "tenant_isolation_candidates" ON "hrm"."candidates";
DROP POLICY "tenant_isolation_change_requests" ON "rs"."change_requests";
DROP POLICY "tenant_isolation_companies" ON "hrm"."companies";
DROP POLICY "tenant_isolation_contacts" ON "crm"."contacts";
DROP POLICY "tenant_isolation_contract_renewals" ON "hrm"."contract_renewals";
DROP POLICY "tenant_isolation_contracts" ON "hrm"."contracts";
DROP POLICY "tenant_isolation_core_workflow_versions" ON "public"."_archive_core_workflow_versions";
DROP POLICY "tenant_isolation_customer_finance" ON "crm"."customer_finance";
DROP POLICY "tenant_isolation_customer_tags" ON "crm"."customer_tags";
DROP POLICY "tenant_isolation_departments" ON "hrm"."departments";
DROP POLICY "tenant_isolation_employees" ON "hrm"."employees";
DROP POLICY "tenant_isolation_fin_reconciliations" ON "erp"."fin_reconciliations";
DROP POLICY "tenant_isolation_interactions" ON "crm"."interactions";
DROP POLICY "tenant_isolation_interviews" ON "hrm"."interviews";
DROP POLICY "tenant_isolation_inventory" ON "erp"."inventory";
DROP POLICY "tenant_isolation_job_openings" ON "hrm"."job_openings";
DROP POLICY "tenant_isolation_leave_records" ON "hrm"."leave_records";
DROP POLICY "tenant_isolation_materials" ON "erp"."materials";
DROP POLICY "tenant_isolation_materials" ON "master_data"."materials";
DROP POLICY "tenant_isolation_notification_channels" ON "communication"."notification_channels";
DROP POLICY "tenant_isolation_opportunities" ON "crm"."opportunities";
DROP POLICY "tenant_isolation_payroll_details" ON "hrm"."payroll_details";
DROP POLICY "tenant_isolation_payroll_items" ON "hrm"."payroll_items";
DROP POLICY "tenant_isolation_payroll_records" ON "hrm"."payroll_records";
DROP POLICY "tenant_isolation_payroll_runs" ON "hrm"."payroll_runs";
DROP POLICY "tenant_isolation_performance_goals" ON "hrm"."performance_goals";
DROP POLICY "tenant_isolation_performance_records" ON "hrm"."performance_records";
DROP POLICY "tenant_isolation_performance_reviews" ON "hrm"."performance_reviews";
DROP POLICY "tenant_isolation_permission_audit_logs" ON "iam"."permission_audit_logs";
DROP POLICY "tenant_isolation_position_permissions" ON "iam"."position_permissions";
DROP POLICY "tenant_isolation_position_roles" ON "iam"."position_roles";
DROP POLICY "tenant_isolation_positions" ON "hrm"."positions";
DROP POLICY "tenant_isolation_positions" ON "iam"."positions";
DROP POLICY "tenant_isolation_purchase_orders" ON "erp"."purchase_orders";
DROP POLICY "tenant_isolation_qa_audit_findings" ON "qms"."qa_audit_findings";
DROP POLICY "tenant_isolation_qa_audit_plans" ON "qms"."qa_audit_plans";
DROP POLICY "tenant_isolation_qa_audit_tasks" ON "qms"."qa_audit_tasks";
DROP POLICY "tenant_isolation_qa_corrective_action_items" ON "qms"."qa_corrective_action_items";
DROP POLICY "tenant_isolation_qa_corrective_actions" ON "qms"."qa_corrective_actions";
DROP POLICY "tenant_isolation_qa_eightd_audit_logs" ON "qms"."qa_eightd_audit_logs";
DROP POLICY "tenant_isolation_qa_eightd_reports" ON "qms"."qa_eightd_reports";
DROP POLICY "tenant_isolation_qa_fmea_analyses" ON "qms"."qa_fmea_analyses";
DROP POLICY "tenant_isolation_qa_fmea_items" ON "qms"."qa_fmea_items";
DROP POLICY "tenant_isolation_qa_inspection_audits" ON "qms"."qa_inspection_audits";
DROP POLICY "tenant_isolation_qa_inspection_results" ON "qms"."qa_inspection_results";
DROP POLICY "tenant_isolation_qa_qms_sync_records" ON "qms"."qa_qms_sync_records";
DROP POLICY "tenant_isolation_qa_quality_costs" ON "qms"."qa_quality_costs";
DROP POLICY "tenant_isolation_qa_quality_inspections" ON "qms"."qa_quality_inspections";
DROP POLICY "tenant_isolation_qa_quality_issues" ON "qms"."qa_quality_issues";
DROP POLICY "tenant_isolation_qa_spc_charts" ON "qms"."qa_spc_charts";
DROP POLICY "tenant_isolation_qa_spc_data_points" ON "qms"."qa_spc_data_points";
DROP POLICY "tenant_isolation_qa_standard_revisions" ON "qms"."qa_standard_revisions";
DROP POLICY "tenant_isolation_qa_standards" ON "qms"."qa_standards";
DROP POLICY "tenant_isolation_recruitment_applications" ON "hrm"."recruitment_applications";
DROP POLICY "tenant_isolation_recruitment_records" ON "hrm"."recruitment_records";
DROP POLICY "tenant_isolation_report_templates" ON "bi"."report_templates";
DROP POLICY "tenant_isolation_resource_permissions" ON "iam"."resource_permissions";
DROP POLICY "tenant_isolation_salary_adjustments" ON "hrm"."salary_adjustments";
DROP POLICY "tenant_isolation_samples" ON "master_data"."samples";
DROP POLICY "tenant_isolation_tags" ON "crm"."tags";
DROP POLICY "tenant_isolation_tenant_permissions" ON "public"."tenant_permissions";
DROP POLICY "tenant_isolation_training_courses" ON "hrm"."training_courses";
DROP POLICY "tenant_isolation_training_participants" ON "hrm"."training_participants";
DROP POLICY "tenant_isolation_training_plans" ON "hrm"."training_plans";
DROP POLICY "tenant_isolation_training_records" ON "hrm"."training_records";
DROP POLICY "tenant_isolation_uoms" ON "master_data"."uoms";
DROP POLICY "tenant_isolation_user_positions" ON "iam"."user_positions";
DROP POLICY "tenant_isolation_voucher_items" ON "erp"."voucher_items";

DO $post$
DECLARE
  v_item text;
  v_schema text;
  v_table text;
  v_n int;
  v_name text;
  v_q text;
  v_forced boolean;
BEGIN
  FOREACH v_item IN ARRAY ARRAY['bi|report_templates',
    'communication|notification_channels',
    'crm|contacts',
    'crm|customer_finance',
    'crm|customer_tags',
    'crm|interactions',
    'crm|opportunities',
    'crm|tags',
    'erp|announcements',
    'erp|assets',
    'erp|fin_reconciliations',
    'erp|inventory',
    'erp|materials',
    'erp|purchase_orders',
    'erp|voucher_items',
    'hrm|attendance_records',
    'hrm|candidates',
    'hrm|companies',
    'hrm|contract_renewals',
    'hrm|contracts',
    'hrm|departments',
    'hrm|employees',
    'hrm|interviews',
    'hrm|job_openings',
    'hrm|leave_records',
    'hrm|payroll_details',
    'hrm|payroll_items',
    'hrm|payroll_records',
    'hrm|payroll_runs',
    'hrm|performance_goals',
    'hrm|performance_records',
    'hrm|performance_reviews',
    'hrm|positions',
    'hrm|recruitment_applications',
    'hrm|recruitment_records',
    'hrm|salary_adjustments',
    'hrm|training_courses',
    'hrm|training_participants',
    'hrm|training_plans',
    'hrm|training_records',
    'iam|permission_audit_logs',
    'iam|position_permissions',
    'iam|position_roles',
    'iam|positions',
    'iam|resource_permissions',
    'iam|user_positions',
    'master_data|materials',
    'master_data|samples',
    'master_data|uoms',
    'public|_archive_core_workflow_versions',
    'public|tenant_permissions',
    'qms|qa_audit_findings',
    'qms|qa_audit_plans',
    'qms|qa_audit_tasks',
    'qms|qa_corrective_action_items',
    'qms|qa_corrective_actions',
    'qms|qa_eightd_audit_logs',
    'qms|qa_eightd_reports',
    'qms|qa_fmea_analyses',
    'qms|qa_fmea_items',
    'qms|qa_inspection_audits',
    'qms|qa_inspection_results',
    'qms|qa_qms_sync_records',
    'qms|qa_quality_costs',
    'qms|qa_quality_inspections',
    'qms|qa_quality_issues',
    'qms|qa_spc_charts',
    'qms|qa_spc_data_points',
    'qms|qa_standard_revisions',
    'qms|qa_standards',
    'rs|change_requests']
  LOOP
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);
    SELECT count(*), max(p.polname), max(pg_get_expr(p.polqual, p.polrelid)), bool_and(c.relforcerowsecurity)
      INTO v_n, v_name, v_q, v_forced
      FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = v_schema AND c.relname = v_table;
    IF v_n <> 1 OR v_name <> 'rls_tenant_isolation' THEN
      RAISE EXCEPTION 'batch postcheck: %.% 期望只剩 1 条 rls_tenant_isolation，实际 % 条 / %', v_schema, v_table, v_n, v_name;
    END IF;
    IF v_q NOT LIKE '%rls_system%' THEN
      RAISE EXCEPTION 'batch postcheck: %.% canonical 不含系统通道', v_schema, v_table;
    END IF;
    IF NOT v_forced THEN
      RAISE EXCEPTION 'batch postcheck: %.% 未 FORCE RLS', v_schema, v_table;
    END IF;
  END LOOP;
END $post$;

