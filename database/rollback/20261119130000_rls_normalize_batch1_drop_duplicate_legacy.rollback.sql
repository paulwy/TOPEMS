-- 回滚 20261119130000：恢复批 1 删除的 71 条遗留策略（逐字还原名称/命令/角色/表达式）。
-- 前置：每表恰好 1 条 rls_tenant_isolation；后置：每表 2 条策略。
-- 存在性守卫：表存在 → 严格断言不变；表已被 20261119100000/20261119110000 删除（7 张名单）→ NOTICE 跳过；
--   表不存在但不在名单 → RAISE EXCEPTION。两种顺序均可逆：先回滚本文件再回滚死表批，或死表批已回滚、表已恢复。
-- 事务：文件内不含 BEGIN/COMMIT，手工执行请用 psql --single-transaction。
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
  v_wc text;
  v_strict constant text := '((COALESCE(current_setting(''app.rls_system''::text, true), ''off''::text) = ''on''::text) OR (tenant_id = (NULLIF(current_setting(''app.tenant_id''::text, true), ''''::text))::uuid))';
  v_skip int := 0;
  v_total int := 71;
  v_dropped text[] := ARRAY[
    'erp|voucher_items',
    'hrm|payroll_records',
    'hrm|performance_records',
    'hrm|recruitment_applications',
    'hrm|recruitment_records',
    'hrm|training_participants',
    'public|tenant_permissions'];
  v_targets text[] := ARRAY[
    'erp|announcements|tenant_isolation_announcements|1',
    'erp|assets|tenant_isolation_assets|0',
    'hrm|attendance_records|tenant_isolation_attendance_records|0',
    'hrm|candidates|tenant_isolation_candidates|0',
    'rs|change_requests|tenant_isolation_change_requests|0',
    'hrm|companies|tenant_isolation_companies|0',
    'crm|contacts|tenant_isolation_contacts|1',
    'hrm|contract_renewals|tenant_isolation_contract_renewals|0',
    'hrm|contracts|tenant_isolation_contracts|0',
    'public|_archive_core_workflow_versions|tenant_isolation_core_workflow_versions|1',
    'crm|customer_finance|tenant_isolation_customer_finance|0',
    'crm|customer_tags|tenant_isolation_customer_tags|1',
    'hrm|departments|tenant_isolation_departments|0',
    'hrm|employees|tenant_isolation_employees|0',
    'erp|fin_reconciliations|tenant_isolation_fin_reconciliations|0',
    'crm|interactions|tenant_isolation_interactions|1',
    'hrm|interviews|tenant_isolation_interviews|0',
    'erp|inventory|tenant_isolation_inventory|0',
    'hrm|job_openings|tenant_isolation_job_openings|0',
    'hrm|leave_records|tenant_isolation_leave_records|0',
    'erp|materials|tenant_isolation_materials|0',
    'master_data|materials|tenant_isolation_materials|0',
    'communication|notification_channels|tenant_isolation_notification_channels|0',
    'crm|opportunities|tenant_isolation_opportunities|1',
    'hrm|payroll_details|tenant_isolation_payroll_details|0',
    'hrm|payroll_items|tenant_isolation_payroll_items|0',
    'hrm|payroll_records|tenant_isolation_payroll_records|0',
    'hrm|payroll_runs|tenant_isolation_payroll_runs|0',
    'hrm|performance_goals|tenant_isolation_performance_goals|0',
    'hrm|performance_records|tenant_isolation_performance_records|0',
    'hrm|performance_reviews|tenant_isolation_performance_reviews|0',
    'iam|permission_audit_logs|tenant_isolation_permission_audit_logs|0',
    'iam|position_permissions|tenant_isolation_position_permissions|0',
    'iam|position_roles|tenant_isolation_position_roles|0',
    'hrm|positions|tenant_isolation_positions|0',
    'iam|positions|tenant_isolation_positions|0',
    'erp|purchase_orders|tenant_isolation_purchase_orders|0',
    'qms|qa_audit_findings|tenant_isolation_qa_audit_findings|0',
    'qms|qa_audit_plans|tenant_isolation_qa_audit_plans|0',
    'qms|qa_audit_tasks|tenant_isolation_qa_audit_tasks|0',
    'qms|qa_corrective_action_items|tenant_isolation_qa_corrective_action_items|0',
    'qms|qa_corrective_actions|tenant_isolation_qa_corrective_actions|0',
    'qms|qa_eightd_audit_logs|tenant_isolation_qa_eightd_audit_logs|0',
    'qms|qa_eightd_reports|tenant_isolation_qa_eightd_reports|0',
    'qms|qa_fmea_analyses|tenant_isolation_qa_fmea_analyses|0',
    'qms|qa_fmea_items|tenant_isolation_qa_fmea_items|0',
    'qms|qa_inspection_audits|tenant_isolation_qa_inspection_audits|0',
    'qms|qa_inspection_results|tenant_isolation_qa_inspection_results|0',
    'qms|qa_qms_sync_records|tenant_isolation_qa_qms_sync_records|0',
    'qms|qa_quality_costs|tenant_isolation_qa_quality_costs|0',
    'qms|qa_quality_inspections|tenant_isolation_qa_quality_inspections|0',
    'qms|qa_quality_issues|tenant_isolation_qa_quality_issues|0',
    'qms|qa_spc_charts|tenant_isolation_qa_spc_charts|0',
    'qms|qa_spc_data_points|tenant_isolation_qa_spc_data_points|0',
    'qms|qa_standard_revisions|tenant_isolation_qa_standard_revisions|0',
    'qms|qa_standards|tenant_isolation_qa_standards|0',
    'hrm|recruitment_applications|tenant_isolation_recruitment_applications|0',
    'hrm|recruitment_records|tenant_isolation_recruitment_records|0',
    'bi|report_templates|tenant_isolation_report_templates|0',
    'iam|resource_permissions|tenant_isolation_resource_permissions|0',
    'hrm|salary_adjustments|tenant_isolation_salary_adjustments|0',
    'master_data|samples|tenant_isolation_samples|0',
    'crm|tags|tenant_isolation_tags|1',
    'public|tenant_permissions|tenant_isolation_tenant_permissions|0',
    'hrm|training_courses|tenant_isolation_training_courses|0',
    'hrm|training_participants|tenant_isolation_training_participants|0',
    'hrm|training_plans|tenant_isolation_training_plans|0',
    'hrm|training_records|tenant_isolation_training_records|0',
    'master_data|uoms|tenant_isolation_uoms|0',
    'iam|user_positions|tenant_isolation_user_positions|0',
    'erp|voucher_items|tenant_isolation_voucher_items|0'];
BEGIN
  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);
    v_legacy := split_part(v_item, '|', 3);
    v_wc     := split_part(v_item, '|', 4);

    IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
      IF (v_schema || '|' || v_table) = ANY(v_dropped) THEN
        v_skip := v_skip + 1;
        RAISE NOTICE 'rollback1: %.% 已被前序死表迁移删除，跳过回滚（累计 %/% 张）', v_schema, v_table, v_skip, v_total;
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'rollback1: %.% 不存在，且不在已知死表删除名单（7 张）内；拒绝静默跳过', v_schema, v_table;
    END IF;

    SELECT count(*) INTO v_n
      FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=split_part(v_item,'|',1) AND c.relname=split_part(v_item,'|',2);
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'rollback precheck: %.% 期望 1 条 canonical，实际 %', split_part(v_item,'|',1), split_part(v_item,'|',2), v_n;
    END IF;
  END LOOP;
  RAISE NOTICE 'rollback1: 目标 % 张，跳过 % 张（已删除），待回滚 % 张', v_total, v_skip, v_total - v_skip;
END $pre$;

DO $body$
DECLARE
  v_item text;
  v_schema text;
  v_table text;
  v_legacy text;
  v_wc text;
  v_strict constant text := '((COALESCE(current_setting(''app.rls_system''::text, true), ''off''::text) = ''on''::text) OR (tenant_id = (NULLIF(current_setting(''app.tenant_id''::text, true), ''''::text))::uuid))';
  v_skip int := 0;
  v_done int := 0;
  v_total int := 71;
  v_dropped text[] := ARRAY[
    'erp|voucher_items',
    'hrm|payroll_records',
    'hrm|performance_records',
    'hrm|recruitment_applications',
    'hrm|recruitment_records',
    'hrm|training_participants',
    'public|tenant_permissions'];
  v_targets text[] := ARRAY[
    'erp|announcements|tenant_isolation_announcements|1',
    'erp|assets|tenant_isolation_assets|0',
    'hrm|attendance_records|tenant_isolation_attendance_records|0',
    'hrm|candidates|tenant_isolation_candidates|0',
    'rs|change_requests|tenant_isolation_change_requests|0',
    'hrm|companies|tenant_isolation_companies|0',
    'crm|contacts|tenant_isolation_contacts|1',
    'hrm|contract_renewals|tenant_isolation_contract_renewals|0',
    'hrm|contracts|tenant_isolation_contracts|0',
    'public|_archive_core_workflow_versions|tenant_isolation_core_workflow_versions|1',
    'crm|customer_finance|tenant_isolation_customer_finance|0',
    'crm|customer_tags|tenant_isolation_customer_tags|1',
    'hrm|departments|tenant_isolation_departments|0',
    'hrm|employees|tenant_isolation_employees|0',
    'erp|fin_reconciliations|tenant_isolation_fin_reconciliations|0',
    'crm|interactions|tenant_isolation_interactions|1',
    'hrm|interviews|tenant_isolation_interviews|0',
    'erp|inventory|tenant_isolation_inventory|0',
    'hrm|job_openings|tenant_isolation_job_openings|0',
    'hrm|leave_records|tenant_isolation_leave_records|0',
    'erp|materials|tenant_isolation_materials|0',
    'master_data|materials|tenant_isolation_materials|0',
    'communication|notification_channels|tenant_isolation_notification_channels|0',
    'crm|opportunities|tenant_isolation_opportunities|1',
    'hrm|payroll_details|tenant_isolation_payroll_details|0',
    'hrm|payroll_items|tenant_isolation_payroll_items|0',
    'hrm|payroll_records|tenant_isolation_payroll_records|0',
    'hrm|payroll_runs|tenant_isolation_payroll_runs|0',
    'hrm|performance_goals|tenant_isolation_performance_goals|0',
    'hrm|performance_records|tenant_isolation_performance_records|0',
    'hrm|performance_reviews|tenant_isolation_performance_reviews|0',
    'iam|permission_audit_logs|tenant_isolation_permission_audit_logs|0',
    'iam|position_permissions|tenant_isolation_position_permissions|0',
    'iam|position_roles|tenant_isolation_position_roles|0',
    'hrm|positions|tenant_isolation_positions|0',
    'iam|positions|tenant_isolation_positions|0',
    'erp|purchase_orders|tenant_isolation_purchase_orders|0',
    'qms|qa_audit_findings|tenant_isolation_qa_audit_findings|0',
    'qms|qa_audit_plans|tenant_isolation_qa_audit_plans|0',
    'qms|qa_audit_tasks|tenant_isolation_qa_audit_tasks|0',
    'qms|qa_corrective_action_items|tenant_isolation_qa_corrective_action_items|0',
    'qms|qa_corrective_actions|tenant_isolation_qa_corrective_actions|0',
    'qms|qa_eightd_audit_logs|tenant_isolation_qa_eightd_audit_logs|0',
    'qms|qa_eightd_reports|tenant_isolation_qa_eightd_reports|0',
    'qms|qa_fmea_analyses|tenant_isolation_qa_fmea_analyses|0',
    'qms|qa_fmea_items|tenant_isolation_qa_fmea_items|0',
    'qms|qa_inspection_audits|tenant_isolation_qa_inspection_audits|0',
    'qms|qa_inspection_results|tenant_isolation_qa_inspection_results|0',
    'qms|qa_qms_sync_records|tenant_isolation_qa_qms_sync_records|0',
    'qms|qa_quality_costs|tenant_isolation_qa_quality_costs|0',
    'qms|qa_quality_inspections|tenant_isolation_qa_quality_inspections|0',
    'qms|qa_quality_issues|tenant_isolation_qa_quality_issues|0',
    'qms|qa_spc_charts|tenant_isolation_qa_spc_charts|0',
    'qms|qa_spc_data_points|tenant_isolation_qa_spc_data_points|0',
    'qms|qa_standard_revisions|tenant_isolation_qa_standard_revisions|0',
    'qms|qa_standards|tenant_isolation_qa_standards|0',
    'hrm|recruitment_applications|tenant_isolation_recruitment_applications|0',
    'hrm|recruitment_records|tenant_isolation_recruitment_records|0',
    'bi|report_templates|tenant_isolation_report_templates|0',
    'iam|resource_permissions|tenant_isolation_resource_permissions|0',
    'hrm|salary_adjustments|tenant_isolation_salary_adjustments|0',
    'master_data|samples|tenant_isolation_samples|0',
    'crm|tags|tenant_isolation_tags|1',
    'public|tenant_permissions|tenant_isolation_tenant_permissions|0',
    'hrm|training_courses|tenant_isolation_training_courses|0',
    'hrm|training_participants|tenant_isolation_training_participants|0',
    'hrm|training_plans|tenant_isolation_training_plans|0',
    'hrm|training_records|tenant_isolation_training_records|0',
    'master_data|uoms|tenant_isolation_uoms|0',
    'iam|user_positions|tenant_isolation_user_positions|0',
    'erp|voucher_items|tenant_isolation_voucher_items|0'];
BEGIN
  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);
    v_legacy := split_part(v_item, '|', 3);
    v_wc     := split_part(v_item, '|', 4);

    IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
      IF (v_schema || '|' || v_table) = ANY(v_dropped) THEN
        v_skip := v_skip + 1;
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'rollback1: %.% 不存在，且不在已知死表删除名单（7 张）内；拒绝静默跳过', v_schema, v_table;
    END IF;

    IF v_wc = '1' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR ALL TO PUBLIC USING (%s) WITH CHECK (%s)',
                     v_legacy, v_schema, v_table, v_strict, v_strict);
    ELSE
      EXECUTE format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR ALL TO PUBLIC USING (%s)',
                     v_legacy, v_schema, v_table, v_strict);
    END IF;
    v_done := v_done + 1;
  END LOOP;
  RAISE NOTICE 'rollback1: 已重建 % 张表的遗留策略，跳过 % 张已删除表（目标 % 张）', v_done, v_skip, v_total;
END $body$;
