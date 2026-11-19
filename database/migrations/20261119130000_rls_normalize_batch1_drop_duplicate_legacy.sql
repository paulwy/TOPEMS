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
-- 死表清单撞车（2026-11-19 发现）：本批目标与同批死表清理 20261119100000/20261119110000 的 DROP 清单有 7 张交集：
--   erp.voucher_items、hrm.payroll_records、hrm.performance_records、hrm.recruitment_applications、
--   hrm.recruitment_records、hrm.training_participants、public.tenant_permissions（均由 20261119110000 删除）。
-- 存在性守卫（三条）：
--   1) 表不存在且命中 v_dropped → RAISE NOTICE 跳过，并按批累计；
--   2) 表不存在且不在 v_dropped → RAISE EXCEPTION（死表清单变更必须在此立刻暴露，不允许静默少归一）；
--   3) 表存在 → 前置断言、DROP 与后置断言保持原严格度，一条不放宽。
-- 状态：草案，未应用、未开窗。

-- 须含 public：apply-forward.sh 在同一会话/事务内紧跟 INSERT INTO _sqlx_migrations（非 schema 限定）
SET search_path = pg_catalog, public, pg_temp;
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
    'bi|report_templates|tenant_isolation_report_templates',
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
    'rs|change_requests|tenant_isolation_change_requests'];
BEGIN
  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);
    v_legacy := split_part(v_item, '|', 3);

    -- 规则 1/2：表不存在时，只有「已知被前序死表迁移删除」才允许跳过；否则立刻炸
    IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
      IF (v_schema || '|' || v_table) = ANY(v_dropped) THEN
        v_skip := v_skip + 1;
        RAISE NOTICE 'batch1 precheck: %.% 已被前序死表迁移删除，跳过归一（累计 %/% 张）', v_schema, v_table, v_skip, v_total;
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'batch1 precheck: %.% 不存在，且不在已知死表删除名单（7 张）内；拒绝静默跳过：若刚调整 20261119100000/20261119110000 的死表清单，请同步本迁移', v_schema, v_table;
    END IF;

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
  RAISE NOTICE 'batch1 precheck: 目标 % 张，跳过 % 张（已删除），待归一 % 张', v_total, v_skip, v_total - v_skip;
END $pre$;

-- 71 张目标按表循环执行（表已在前序死表迁移中删除的跳过；DDL 走 EXECUTE，不再静态硬编码）
DO $body$
DECLARE
  v_item text;
  v_schema text;
  v_table text;
  v_legacy text;
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
    'bi|report_templates|tenant_isolation_report_templates',
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
    'rs|change_requests|tenant_isolation_change_requests'];
BEGIN
  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);
    v_legacy := split_part(v_item, '|', 3);

    IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
      IF (v_schema || '|' || v_table) = ANY(v_dropped) THEN
        v_skip := v_skip + 1;
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'batch1: %.% 不存在，且不在已知死表删除名单（7 张）内；拒绝静默跳过', v_schema, v_table;
    END IF;

    EXECUTE format('DROP POLICY %I ON %I.%I', v_legacy, v_schema, v_table);
    v_done := v_done + 1;
  END LOOP;
  RAISE NOTICE 'batch1: 已删除 % 张表的遗留策略，跳过 % 张已删除表（目标 % 张）', v_done, v_skip, v_total;
END $body$;

DO $post$
DECLARE
  v_item text;
  v_schema text;
  v_table text;
  v_n int;
  v_name text;
  v_q text;
  v_forced boolean;
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
    'bi|report_templates',
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
    'rs|change_requests'];
BEGIN
  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);

    IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
      IF (v_schema || '|' || v_table) = ANY(v_dropped) THEN
        v_skip := v_skip + 1;
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'batch1 postcheck: %.% 不存在，且不在已知死表删除名单（7 张）内；拒绝静默通过', v_schema, v_table;
    END IF;

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
  RAISE NOTICE 'batch1 postcheck: 已校验 % 张归一结果，跳过 % 张已删除表（目标 % 张）', v_total - v_skip, v_skip, v_total;
END $post$;
