-- 2026-11-19 RLS 归一 · 批 2：把「只有遗留名」表的策略收敛为 rls_tenant_isolation
-- 范围：167 张表（159 张单策略重命名 + 8 张多策略合并）。
-- 目标：每表恰好 1 条 rls_tenant_isolation（FOR ALL / PUBLIC / 严格 B）。
--       遗留策略的表达式已含 app.rls_system 系统通道，本批只统一名称并重写为规范表达式。
-- 排除：37 张表 / 37 条 USING(true)（另出逐表清单，待业务定性）、
--       8 张 erp 合并报表表（group_tenant_of，见 §3）、erp.event_idempotency（无系统通道，保留）、
--       rls_platform_read / rls_global_read（平台语义）。
-- 依据：docs/database/rls-normalization-draft-2026-11-19.md §3
-- 前置：实参表策略数与名称完全匹配、cmd=ALL（多策略表为 ALL 组合）、含 rls_system、已 FORCE。
-- 后置：每表 1 条 rls_tenant_isolation、含 rls_system、FORCE。
-- 事务：文件内不含 BEGIN/COMMIT，由 apply-forward.sh 包裹。
-- 回滚：database/rollback/20261119131000_rls_normalize_batch2_rename_legacy.rollback.sql
-- 死表清单撞车（2026-11-19 发现）：本批目标与同批死表清理 20261119100000/20261119110000 的 DROP 清单有 20 张交集：
--   tms.carriers、tms.drivers（由 20261119100000 删除）；
--   public.core_file_folders、core_finance_vouchers、core_guide_lessons、core_guide_progress、
--   core_inter_module_sync、core_mdm_reconciliation_log、cqrs_events、crm_dashboard_snapshots、
--   ehs_dashboard_snapshots、finance_voucher_templates、financial_reports、hrm_dashboard_snapshots、
--   lims_dashboard_snapshots、pdm_change_notices、pdm_dashboard_snapshots、pdm_materials、pdm_products、
--   wms_dashboard_snapshots（由 20261119110000 删除）。
-- 存在性守卫（三条）：
--   1) 表不存在且命中 v_dropped → RAISE NOTICE 跳过，并按批累计；
--   2) 表不存在且不在 v_dropped → RAISE EXCEPTION（死表清单变更必须在此立刻暴露，不允许静默少归一）；
--   3) 表存在 → 前置断言、归一 DDL 与后置断言保持原严格度，一条不放宽。
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
  v_col text;
  v_n int;
  v_cmd text;
  v_q text;
  v_forced boolean;
  v_skip int := 0;
  v_total int := 159;
  v_dropped text[] := ARRAY[
    'public|core_file_folders',
    'public|core_finance_vouchers',
    'public|core_guide_lessons',
    'public|core_guide_progress',
    'public|core_inter_module_sync',
    'public|core_mdm_reconciliation_log',
    'public|cqrs_events',
    'public|crm_dashboard_snapshots',
    'public|ehs_dashboard_snapshots',
    'public|finance_voucher_templates',
    'public|financial_reports',
    'public|hrm_dashboard_snapshots',
    'public|lims_dashboard_snapshots',
    'public|pdm_change_notices',
    'public|pdm_dashboard_snapshots',
    'public|pdm_materials',
    'public|pdm_products',
    'public|wms_dashboard_snapshots',
    'tms|carriers',
    'tms|drivers'];
  v_targets text[] := ARRAY[
    'analytics|analytics_comparison_analyses|tenant_isolation_analytics_comparison_analyses|tenant_id',
    'analytics|analytics_comparison_results|tenant_isolation_analytics_comparison_results|tenant_id',
    'analytics|analytics_dashboard_shares|tenant_isolation_analytics_dashboard_shares|tenant_id',
    'analytics|analytics_dashboard_templates|tenant_isolation_analytics_dashboard_templates|tenant_id',
    'analytics|analytics_dashboards|tenant_isolation_analytics_dashboards|tenant_id',
    'analytics|analytics_datasources|tenant_isolation_analytics_datasources|tenant_id',
    'analytics|analytics_drilldown_history|tenant_isolation_analytics_drilldown_history|tenant_id',
    'analytics|analytics_drilldown_paths|tenant_isolation_analytics_drilldown_paths|tenant_id',
    'analytics|analytics_row_level_permissions|tenant_isolation_analytics_row_level_permissions|tenant_id',
    'analytics|analytics_self_service_reports|tenant_isolation_analytics_self_service_reports|tenant_id',
    'analytics|analytics_widgets|tenant_isolation_analytics_widgets|tenant_id',
    'bi|analytics_dashboards|tenant_isolation_analytics_dashboards|tenant_id',
    'bi|analytics_datasources|tenant_isolation_analytics_datasources|tenant_id',
    'bi|analytics_widgets|tenant_isolation_analytics_widgets|tenant_id',
    'communication|core_notification_deliveries|notification_deliveries_tenant_isolation|tenant_id',
    'communication|core_notification_preferences|notification_preferences_tenant_isolation|tenant_id',
    'communication|core_notification_subscriptions|notification_subscriptions_tenant_isolation|tenant_id',
    'core|ai_faqs|tenant_isolation_core_ai_faqs|tenant_id',
    'core|user_preferences|tenant_isolation_user_preferences|tenant_id',
    'crm|contracts|tenant_isolation_contracts|tenant_id',
    'crm|customer_recommendations|tenant_isolation_customer_recommendations|tenant_id',
    'crm|customer_segments|tenant_isolation_customer_segments|tenant_id',
    'erp|bank_accounts|tenant_isolation_bank_accounts|tenant_id',
    'erp|erp_production_orders|tenant_isolation|tenant_id',
    'erp|inventory_items|tenant_isolation_inventory_items|tenant_id',
    'hrm|hrm_cache_invalidation_logs|tenant_isolation|tenant_id',
    'hrm|initialization_status|tenant_isolation_initialization_status|tenant_id',
    'iam|data_permissions|tenant_isolation_data_permissions|tenant_id',
    'iam|permission_templates|tenant_isolation_permission_templates|tenant_id',
    'iam|tenant_users|tenant_isolation_tenant_users|tenant_id',
    'master_data|mdm_api_exposures|tenant_isolation_policy|tenant_id',
    'master_data|mdm_api_products|mdm_api_products_tenant_policy|tenant_id',
    'master_data|mdm_assets|mdm_assets_tenant_policy|tenant_id',
    'master_data|mdm_audit_events|tenant_isolation_policy|tenant_id',
    'master_data|mdm_audit_export_logs|tenant_isolation_policy|tenant_id',
    'master_data|mdm_auto_fix_actions|tenant_isolation_policy|tenant_id',
    'master_data|mdm_bc_tests|tenant_isolation_policy|tenant_id',
    'master_data|mdm_change_events|mdm_change_events_tenant_policy|tenant_id',
    'master_data|mdm_continuity_plans|tenant_isolation_policy|tenant_id',
    'master_data|mdm_critical_functions|tenant_isolation_policy|tenant_id',
    'master_data|mdm_data_asset_categories|mdm_data_asset_categories_tenant_policy|tenant_id',
    'master_data|mdm_data_contracts|tenant_isolation_policy|tenant_id',
    'master_data|mdm_data_permissions|tenant_isolation_policy|tenant_id',
    'master_data|mdm_data_products|tenant_isolation_policy|tenant_id',
    'master_data|mdm_dimension_scores|tenant_isolation_policy|tenant_id',
    'master_data|mdm_failover_records|tenant_isolation_policy|tenant_id',
    'master_data|mdm_fix_strategies|tenant_isolation_policy|tenant_id',
    'master_data|mdm_governance_insights|tenant_isolation_policy|tenant_id',
    'master_data|mdm_governance_suggestions|tenant_isolation_policy|tenant_id',
    'master_data|mdm_graph_communities|tenant_isolation_policy|tenant_id',
    'master_data|mdm_graph_edges|tenant_isolation_policy|tenant_id',
    'master_data|mdm_graph_nodes|tenant_isolation_policy|tenant_id',
    'master_data|mdm_impact_analyses|mdm_impact_analyses_tenant_policy|tenant_id',
    'master_data|mdm_impact_simulations|mdm_impact_simulations_tenant_policy|tenant_id',
    'master_data|mdm_improvement_plans|tenant_isolation_policy|tenant_id',
    'master_data|mdm_interactions|mdm_interactions_tenant_policy|tenant_id',
    'master_data|mdm_kg_edges|mdm_kg_edges_tenant_policy|tenant_id',
    'master_data|mdm_kg_graphs|mdm_kg_graphs_tenant_policy|tenant_id',
    'master_data|mdm_kg_nodes|mdm_kg_nodes_tenant_policy|tenant_id',
    'master_data|mdm_lifecycle_history|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_lifecycle_policies|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_lifecycle_stages|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_lineage_edges|mdm_lineage_edges_tenant_policy|tenant_id',
    'master_data|mdm_lineage_graphs|mdm_lineage_graphs_tenant_policy|tenant_id',
    'master_data|mdm_lineage_nodes|mdm_lineage_nodes_tenant_policy|tenant_id',
    'master_data|mdm_maturity_assessments|tenant_isolation_policy|tenant_id',
    'master_data|mdm_maturity_history|tenant_isolation_policy|tenant_id',
    'master_data|mdm_metadata_attributes|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_metadata_tags|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_permission_roles|tenant_isolation_policy|tenant_id',
    'master_data|mdm_propagation_logs|mdm_propagation_logs_tenant_policy|tenant_id',
    'master_data|mdm_propagation_rules|mdm_propagation_rules_tenant_policy|tenant_id',
    'master_data|mdm_quality_checks|tenant_isolation_policy|tenant_id',
    'master_data|mdm_quality_loop_configs|tenant_isolation_policy|tenant_id',
    'master_data|mdm_rate_cards|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_recommendations|mdm_recommendations_tenant_policy|tenant_id',
    'master_data|mdm_recovery_plans|tenant_isolation_policy|tenant_id',
    'master_data|mdm_recovery_points|tenant_isolation_policy|tenant_id',
    'master_data|mdm_region_configs|tenant_isolation_policy|tenant_id',
    'master_data|mdm_replication_configs|tenant_isolation_policy|tenant_id',
    'master_data|mdm_search_history|tenant_isolation_policy|tenant_id',
    'master_data|mdm_search_indexes|mdm_search_indexes_tenant_policy|tenant_id',
    'master_data|mdm_semantic_search_indexes|tenant_isolation_policy|tenant_id',
    'master_data|mdm_sla_configs|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_supplier_categories|tenant_isolation_mdm_supplier_categories|tenant_id',
    'master_data|mdm_suppliers|tenant_isolation_mdm_suppliers|tenant_id',
    'master_data|mdm_sync_dead_letter|tenant_isolation_mdm_sync_dead_letter|tenant_id',
    'master_data|mdm_tag_rules|tenant_isolation_policy|tenant_id',
    'master_data|mdm_tagged_entities|tenant_isolation_policy|tenant_id',
    'master_data|mdm_tags|tenant_isolation_policy|tenant_id',
    'master_data|mdm_user_role_assignments|tenant_isolation_policy|tenant_id',
    'master_data|mdm_v60_lineage_edges|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_v60_lineage_graphs|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_v60_lineage_nodes|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_version_branches|tenant_isolation_policy|tenant_id',
    'master_data|mdm_version_snapshots|mdm_version_snapshots_tenant_policy|tenant_id',
    'master_data|mdm_workflow_history|tenant_isolation_policy|tenant_id',
    'master_data|mdm_workflow_templates|tenant_isolation_policy|tenant_id',
    'master_data|mdm_workflows|tenant_isolation_policy|tenant_id',
    'plugin_finance|accounting_subjects|tenant_isolation_accounting_subjects|tenant_id',
    'plugin_finance|difference_adjustments|tenant_isolation_difference_adjustments|tenant_id',
    'plugin_finance|reconciliation_item_snapshots|tenant_isolation_reconciliation_item_snapshots|tenant_id',
    'plugin_finance|reconciliation_settlement_links|tenant_isolation_reconciliation_settlement_links|tenant_id',
    'plugin_finance|reconciliation_snapshots|tenant_isolation_reconciliation_snapshots|tenant_id',
    'plugin_finance|settlement_snapshots|tenant_isolation_settlement_snapshots|tenant_id',
    'portal|portal_dashboard_stats|tenant_isolation_portal_dashboard_stats|tenant_id',
    'portal|portal_notifications|tenant_isolation_portal_notifications|tenant_id',
    'public|_archive_core_workflow_instances|tenant_isolation_core_workflow_instances|tenant_id',
    'public|core_doc_documents|tenant_isolation_core_doc_documents|tenant_id',
    'public|core_doc_folders|tenant_isolation_core_doc_folders|tenant_id',
    'public|core_doc_templates|tenant_isolation_core_doc_templates|tenant_id',
    'public|core_emails|tenant_isolation_core_emails|tenant_id',
    'public|core_file_folders|tenant_isolation_core_file_folders|tenant_id',
    'public|core_finance_accounts|tenant_isolation_core_finance_accounts|tenant_id',
    'public|core_finance_vouchers|tenant_isolation_core_finance_vouchers|tenant_id',
    'public|core_flow_categories|tenant_isolation_core_flow_categories|tenant_id',
    'public|core_guide_lessons|tenant_isolation_core_guide_lessons|tenant_id',
    'public|core_guide_progress|tenant_isolation_core_guide_progress|tenant_id',
    'public|core_inter_module_sync|tenant_isolation_core_inter_module_sync|tenant_id',
    'public|core_master_data_change_log|tenant_isolation_core_master_data_change_log|tenant_id',
    'public|core_master_data_refs|tenant_isolation_core_master_data_refs|tenant_id',
    'public|core_mdm_approvals|tenant_isolation_core_mdm_approvals|tenant_id',
    'public|core_mdm_reconciliation_log|tenant_isolation_core_mdm_reconciliation_log|tenant_id',
    'public|core_migration_history|tenant_isolation_core_migration_history|tenant_id',
    'public|core_notification_templates|tenant_isolation_core_notification_templates|tenant_id',
    'public|core_notifications|tenant_isolation_core_notifications|tenant_id',
    'public|core_tenant_modules|tenant_isolation_core_tenant_modules|tenant_id',
    'public|core_tenant_usage|tenant_isolation_core_tenant_usage|tenant_id',
    'public|cqrs_events|tenant_isolation_cqrs_events|tenant_id',
    'public|crm_dashboard_snapshots|tenant_isolation_crm_dashboard_snapshots|tenant_id',
    'public|ehs_dashboard_snapshots|tenant_isolation_ehs_dashboard_snapshots|tenant_id',
    'public|finance_voucher_templates|tenant_isolation_finance_voucher_templates|tenant_id',
    'public|financial_reports|tenant_isolation_financial_reports|tenant_id',
    'public|hrm_dashboard_snapshots|tenant_isolation_hrm_dashboard_snapshots|tenant_id',
    'public|lims_dashboard_snapshots|tenant_isolation_lims_dashboard_snapshots|tenant_id',
    'public|pdm_change_notices|tenant_isolation_pdm_change_notices|tenant_id',
    'public|pdm_dashboard_snapshots|tenant_isolation_pdm_dashboard_snapshots|tenant_id',
    'public|pdm_materials|tenant_isolation_pdm_materials|tenant_id',
    'public|pdm_products|tenant_isolation_pdm_products|tenant_id',
    'public|search_entity_projections|tenant_isolation_search_entity_projections|tenant_id',
    'public|wms_dashboard_snapshots|tenant_isolation_wms_dashboard_snapshots|tenant_id',
    'qms|qa_alert_messages|tenant_isolation_qa_alert_messages|tenant_id',
    'qms|qa_alert_rules|tenant_isolation_qa_alert_rules|tenant_id',
    'qms|qa_approval_events|tenant_isolation_qa_approval_events|tenant_id',
    'qms|qa_apqp_phases|tenant_isolation_qa_apqp_phases|tenant_id',
    'qms|qa_apqp_projects|tenant_isolation_qa_apqp_projects|tenant_id',
    'qms|qa_apqp_risks|tenant_isolation_qa_apqp_risks|tenant_id',
    'qms|qa_apqp_tasks|tenant_isolation_qa_apqp_tasks|tenant_id',
    'rs|change_orders|tenant_isolation_change_orders|tenant_id',
    'rs|material_tests|tenant_isolation_material_tests|tenant_id',
    'rs|project_members|tenant_isolation_project_members|tenant_id',
    'rs|project_milestones|tenant_isolation_project_milestones|tenant_id',
    'rs|project_phases|tenant_isolation_project_phases|tenant_id',
    'rs|projects|tenant_isolation_projects|tenant_id',
    'rs|rs_experiments|tenant_isolation_rs_experiments|tenant_id',
    'rs|rs_formulas|tenant_isolation_rs_formulas|tenant_id',
    'rs|rs_projects|tenant_isolation_rs_projects|tenant_id',
    'tms|carriers|tenant_isolation_carriers|tenant_id',
    'tms|drivers|tenant_isolation_drivers|tenant_id'];
BEGIN
  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);
    v_legacy := split_part(v_item, '|', 3);
    v_col    := split_part(v_item, '|', 4);

    -- 规则 1/2：表不存在时，只有「已知被前序死表迁移删除」才允许跳过；否则立刻炸
    IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
      IF (v_schema || '|' || v_table) = ANY(v_dropped) THEN
        v_skip := v_skip + 1;
        RAISE NOTICE 'batch2 precheck: %.% 已被前序死表迁移删除，跳过归一（累计 %/% 张）', v_schema, v_table, v_skip, v_total;
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'batch2 precheck: %.% 不存在，且不在已知死表删除名单（20 张）内；拒绝静默跳过：若刚调整 20261119100000/20261119110000 的死表清单，请同步本迁移', v_schema, v_table;
    END IF;

    SELECT count(*), max(p.polcmd), max(pg_get_expr(p.polqual,p.polrelid)), bool_and(c.relforcerowsecurity)
      INTO v_n, v_cmd, v_q, v_forced
      FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=v_schema AND c.relname=v_table;
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'batch2 precheck: %.% 期望 1 条策略，实际 %', v_schema, v_table, v_n;
    END IF;
    IF v_cmd <> '*' OR v_q IS NULL OR v_q NOT LIKE '%rls_system%' THEN
      RAISE EXCEPTION 'batch2 precheck: %.% 策略命令/表达式不符（cmd=%, qual=%）', v_schema, v_table, v_cmd, v_q;
    END IF;
    IF NOT v_forced THEN RAISE EXCEPTION 'batch2 precheck: %.% 未 FORCE RLS', v_schema, v_table; END IF;
  END LOOP;
  RAISE NOTICE 'batch2 precheck: 目标 % 张，跳过 % 张（已删除），待归一 % 张', v_total, v_skip, v_total - v_skip;
END $pre$;

-- 159 张单策略表：按表循环 rename + 规范化表达式（表已删除的跳过）
DO $body_single$
DECLARE
  v_item text;
  v_schema text;
  v_table text;
  v_legacy text;
  v_col text;
  v_expr text;
  v_strict_tid constant text := '((COALESCE(current_setting(''app.rls_system''::text, true), ''off''::text) = ''on''::text) OR (tenant_id = (NULLIF(current_setting(''app.tenant_id''::text, true), ''''::text))::uuid))';
  v_strict_uid constant text := '((COALESCE(current_setting(''app.rls_system''::text, true), ''off''::text) = ''on''::text) OR (tenant_uid = (NULLIF(current_setting(''app.tenant_id''::text, true), ''''::text))::uuid))';
  v_skip int := 0;
  v_done int := 0;
  v_total int := 159;
  v_dropped text[] := ARRAY[
    'public|core_file_folders',
    'public|core_finance_vouchers',
    'public|core_guide_lessons',
    'public|core_guide_progress',
    'public|core_inter_module_sync',
    'public|core_mdm_reconciliation_log',
    'public|cqrs_events',
    'public|crm_dashboard_snapshots',
    'public|ehs_dashboard_snapshots',
    'public|finance_voucher_templates',
    'public|financial_reports',
    'public|hrm_dashboard_snapshots',
    'public|lims_dashboard_snapshots',
    'public|pdm_change_notices',
    'public|pdm_dashboard_snapshots',
    'public|pdm_materials',
    'public|pdm_products',
    'public|wms_dashboard_snapshots',
    'tms|carriers',
    'tms|drivers'];
  v_targets text[] := ARRAY[
    'analytics|analytics_comparison_analyses|tenant_isolation_analytics_comparison_analyses|tenant_id',
    'analytics|analytics_comparison_results|tenant_isolation_analytics_comparison_results|tenant_id',
    'analytics|analytics_dashboard_shares|tenant_isolation_analytics_dashboard_shares|tenant_id',
    'analytics|analytics_dashboard_templates|tenant_isolation_analytics_dashboard_templates|tenant_id',
    'analytics|analytics_dashboards|tenant_isolation_analytics_dashboards|tenant_id',
    'analytics|analytics_datasources|tenant_isolation_analytics_datasources|tenant_id',
    'analytics|analytics_drilldown_history|tenant_isolation_analytics_drilldown_history|tenant_id',
    'analytics|analytics_drilldown_paths|tenant_isolation_analytics_drilldown_paths|tenant_id',
    'analytics|analytics_row_level_permissions|tenant_isolation_analytics_row_level_permissions|tenant_id',
    'analytics|analytics_self_service_reports|tenant_isolation_analytics_self_service_reports|tenant_id',
    'analytics|analytics_widgets|tenant_isolation_analytics_widgets|tenant_id',
    'bi|analytics_dashboards|tenant_isolation_analytics_dashboards|tenant_id',
    'bi|analytics_datasources|tenant_isolation_analytics_datasources|tenant_id',
    'bi|analytics_widgets|tenant_isolation_analytics_widgets|tenant_id',
    'communication|core_notification_deliveries|notification_deliveries_tenant_isolation|tenant_id',
    'communication|core_notification_preferences|notification_preferences_tenant_isolation|tenant_id',
    'communication|core_notification_subscriptions|notification_subscriptions_tenant_isolation|tenant_id',
    'core|ai_faqs|tenant_isolation_core_ai_faqs|tenant_id',
    'core|user_preferences|tenant_isolation_user_preferences|tenant_id',
    'crm|contracts|tenant_isolation_contracts|tenant_id',
    'crm|customer_recommendations|tenant_isolation_customer_recommendations|tenant_id',
    'crm|customer_segments|tenant_isolation_customer_segments|tenant_id',
    'erp|bank_accounts|tenant_isolation_bank_accounts|tenant_id',
    'erp|erp_production_orders|tenant_isolation|tenant_id',
    'erp|inventory_items|tenant_isolation_inventory_items|tenant_id',
    'hrm|hrm_cache_invalidation_logs|tenant_isolation|tenant_id',
    'hrm|initialization_status|tenant_isolation_initialization_status|tenant_id',
    'iam|data_permissions|tenant_isolation_data_permissions|tenant_id',
    'iam|permission_templates|tenant_isolation_permission_templates|tenant_id',
    'iam|tenant_users|tenant_isolation_tenant_users|tenant_id',
    'master_data|mdm_api_exposures|tenant_isolation_policy|tenant_id',
    'master_data|mdm_api_products|mdm_api_products_tenant_policy|tenant_id',
    'master_data|mdm_assets|mdm_assets_tenant_policy|tenant_id',
    'master_data|mdm_audit_events|tenant_isolation_policy|tenant_id',
    'master_data|mdm_audit_export_logs|tenant_isolation_policy|tenant_id',
    'master_data|mdm_auto_fix_actions|tenant_isolation_policy|tenant_id',
    'master_data|mdm_bc_tests|tenant_isolation_policy|tenant_id',
    'master_data|mdm_change_events|mdm_change_events_tenant_policy|tenant_id',
    'master_data|mdm_continuity_plans|tenant_isolation_policy|tenant_id',
    'master_data|mdm_critical_functions|tenant_isolation_policy|tenant_id',
    'master_data|mdm_data_asset_categories|mdm_data_asset_categories_tenant_policy|tenant_id',
    'master_data|mdm_data_contracts|tenant_isolation_policy|tenant_id',
    'master_data|mdm_data_permissions|tenant_isolation_policy|tenant_id',
    'master_data|mdm_data_products|tenant_isolation_policy|tenant_id',
    'master_data|mdm_dimension_scores|tenant_isolation_policy|tenant_id',
    'master_data|mdm_failover_records|tenant_isolation_policy|tenant_id',
    'master_data|mdm_fix_strategies|tenant_isolation_policy|tenant_id',
    'master_data|mdm_governance_insights|tenant_isolation_policy|tenant_id',
    'master_data|mdm_governance_suggestions|tenant_isolation_policy|tenant_id',
    'master_data|mdm_graph_communities|tenant_isolation_policy|tenant_id',
    'master_data|mdm_graph_edges|tenant_isolation_policy|tenant_id',
    'master_data|mdm_graph_nodes|tenant_isolation_policy|tenant_id',
    'master_data|mdm_impact_analyses|mdm_impact_analyses_tenant_policy|tenant_id',
    'master_data|mdm_impact_simulations|mdm_impact_simulations_tenant_policy|tenant_id',
    'master_data|mdm_improvement_plans|tenant_isolation_policy|tenant_id',
    'master_data|mdm_interactions|mdm_interactions_tenant_policy|tenant_id',
    'master_data|mdm_kg_edges|mdm_kg_edges_tenant_policy|tenant_id',
    'master_data|mdm_kg_graphs|mdm_kg_graphs_tenant_policy|tenant_id',
    'master_data|mdm_kg_nodes|mdm_kg_nodes_tenant_policy|tenant_id',
    'master_data|mdm_lifecycle_history|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_lifecycle_policies|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_lifecycle_stages|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_lineage_edges|mdm_lineage_edges_tenant_policy|tenant_id',
    'master_data|mdm_lineage_graphs|mdm_lineage_graphs_tenant_policy|tenant_id',
    'master_data|mdm_lineage_nodes|mdm_lineage_nodes_tenant_policy|tenant_id',
    'master_data|mdm_maturity_assessments|tenant_isolation_policy|tenant_id',
    'master_data|mdm_maturity_history|tenant_isolation_policy|tenant_id',
    'master_data|mdm_metadata_attributes|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_metadata_tags|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_permission_roles|tenant_isolation_policy|tenant_id',
    'master_data|mdm_propagation_logs|mdm_propagation_logs_tenant_policy|tenant_id',
    'master_data|mdm_propagation_rules|mdm_propagation_rules_tenant_policy|tenant_id',
    'master_data|mdm_quality_checks|tenant_isolation_policy|tenant_id',
    'master_data|mdm_quality_loop_configs|tenant_isolation_policy|tenant_id',
    'master_data|mdm_rate_cards|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_recommendations|mdm_recommendations_tenant_policy|tenant_id',
    'master_data|mdm_recovery_plans|tenant_isolation_policy|tenant_id',
    'master_data|mdm_recovery_points|tenant_isolation_policy|tenant_id',
    'master_data|mdm_region_configs|tenant_isolation_policy|tenant_id',
    'master_data|mdm_replication_configs|tenant_isolation_policy|tenant_id',
    'master_data|mdm_search_history|tenant_isolation_policy|tenant_id',
    'master_data|mdm_search_indexes|mdm_search_indexes_tenant_policy|tenant_id',
    'master_data|mdm_semantic_search_indexes|tenant_isolation_policy|tenant_id',
    'master_data|mdm_sla_configs|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_supplier_categories|tenant_isolation_mdm_supplier_categories|tenant_id',
    'master_data|mdm_suppliers|tenant_isolation_mdm_suppliers|tenant_id',
    'master_data|mdm_sync_dead_letter|tenant_isolation_mdm_sync_dead_letter|tenant_id',
    'master_data|mdm_tag_rules|tenant_isolation_policy|tenant_id',
    'master_data|mdm_tagged_entities|tenant_isolation_policy|tenant_id',
    'master_data|mdm_tags|tenant_isolation_policy|tenant_id',
    'master_data|mdm_user_role_assignments|tenant_isolation_policy|tenant_id',
    'master_data|mdm_v60_lineage_edges|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_v60_lineage_graphs|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_v60_lineage_nodes|tenant_isolation_policy|tenant_uid',
    'master_data|mdm_version_branches|tenant_isolation_policy|tenant_id',
    'master_data|mdm_version_snapshots|mdm_version_snapshots_tenant_policy|tenant_id',
    'master_data|mdm_workflow_history|tenant_isolation_policy|tenant_id',
    'master_data|mdm_workflow_templates|tenant_isolation_policy|tenant_id',
    'master_data|mdm_workflows|tenant_isolation_policy|tenant_id',
    'plugin_finance|accounting_subjects|tenant_isolation_accounting_subjects|tenant_id',
    'plugin_finance|difference_adjustments|tenant_isolation_difference_adjustments|tenant_id',
    'plugin_finance|reconciliation_item_snapshots|tenant_isolation_reconciliation_item_snapshots|tenant_id',
    'plugin_finance|reconciliation_settlement_links|tenant_isolation_reconciliation_settlement_links|tenant_id',
    'plugin_finance|reconciliation_snapshots|tenant_isolation_reconciliation_snapshots|tenant_id',
    'plugin_finance|settlement_snapshots|tenant_isolation_settlement_snapshots|tenant_id',
    'portal|portal_dashboard_stats|tenant_isolation_portal_dashboard_stats|tenant_id',
    'portal|portal_notifications|tenant_isolation_portal_notifications|tenant_id',
    'public|_archive_core_workflow_instances|tenant_isolation_core_workflow_instances|tenant_id',
    'public|core_doc_documents|tenant_isolation_core_doc_documents|tenant_id',
    'public|core_doc_folders|tenant_isolation_core_doc_folders|tenant_id',
    'public|core_doc_templates|tenant_isolation_core_doc_templates|tenant_id',
    'public|core_emails|tenant_isolation_core_emails|tenant_id',
    'public|core_file_folders|tenant_isolation_core_file_folders|tenant_id',
    'public|core_finance_accounts|tenant_isolation_core_finance_accounts|tenant_id',
    'public|core_finance_vouchers|tenant_isolation_core_finance_vouchers|tenant_id',
    'public|core_flow_categories|tenant_isolation_core_flow_categories|tenant_id',
    'public|core_guide_lessons|tenant_isolation_core_guide_lessons|tenant_id',
    'public|core_guide_progress|tenant_isolation_core_guide_progress|tenant_id',
    'public|core_inter_module_sync|tenant_isolation_core_inter_module_sync|tenant_id',
    'public|core_master_data_change_log|tenant_isolation_core_master_data_change_log|tenant_id',
    'public|core_master_data_refs|tenant_isolation_core_master_data_refs|tenant_id',
    'public|core_mdm_approvals|tenant_isolation_core_mdm_approvals|tenant_id',
    'public|core_mdm_reconciliation_log|tenant_isolation_core_mdm_reconciliation_log|tenant_id',
    'public|core_migration_history|tenant_isolation_core_migration_history|tenant_id',
    'public|core_notification_templates|tenant_isolation_core_notification_templates|tenant_id',
    'public|core_notifications|tenant_isolation_core_notifications|tenant_id',
    'public|core_tenant_modules|tenant_isolation_core_tenant_modules|tenant_id',
    'public|core_tenant_usage|tenant_isolation_core_tenant_usage|tenant_id',
    'public|cqrs_events|tenant_isolation_cqrs_events|tenant_id',
    'public|crm_dashboard_snapshots|tenant_isolation_crm_dashboard_snapshots|tenant_id',
    'public|ehs_dashboard_snapshots|tenant_isolation_ehs_dashboard_snapshots|tenant_id',
    'public|finance_voucher_templates|tenant_isolation_finance_voucher_templates|tenant_id',
    'public|financial_reports|tenant_isolation_financial_reports|tenant_id',
    'public|hrm_dashboard_snapshots|tenant_isolation_hrm_dashboard_snapshots|tenant_id',
    'public|lims_dashboard_snapshots|tenant_isolation_lims_dashboard_snapshots|tenant_id',
    'public|pdm_change_notices|tenant_isolation_pdm_change_notices|tenant_id',
    'public|pdm_dashboard_snapshots|tenant_isolation_pdm_dashboard_snapshots|tenant_id',
    'public|pdm_materials|tenant_isolation_pdm_materials|tenant_id',
    'public|pdm_products|tenant_isolation_pdm_products|tenant_id',
    'public|search_entity_projections|tenant_isolation_search_entity_projections|tenant_id',
    'public|wms_dashboard_snapshots|tenant_isolation_wms_dashboard_snapshots|tenant_id',
    'qms|qa_alert_messages|tenant_isolation_qa_alert_messages|tenant_id',
    'qms|qa_alert_rules|tenant_isolation_qa_alert_rules|tenant_id',
    'qms|qa_approval_events|tenant_isolation_qa_approval_events|tenant_id',
    'qms|qa_apqp_phases|tenant_isolation_qa_apqp_phases|tenant_id',
    'qms|qa_apqp_projects|tenant_isolation_qa_apqp_projects|tenant_id',
    'qms|qa_apqp_risks|tenant_isolation_qa_apqp_risks|tenant_id',
    'qms|qa_apqp_tasks|tenant_isolation_qa_apqp_tasks|tenant_id',
    'rs|change_orders|tenant_isolation_change_orders|tenant_id',
    'rs|material_tests|tenant_isolation_material_tests|tenant_id',
    'rs|project_members|tenant_isolation_project_members|tenant_id',
    'rs|project_milestones|tenant_isolation_project_milestones|tenant_id',
    'rs|project_phases|tenant_isolation_project_phases|tenant_id',
    'rs|projects|tenant_isolation_projects|tenant_id',
    'rs|rs_experiments|tenant_isolation_rs_experiments|tenant_id',
    'rs|rs_formulas|tenant_isolation_rs_formulas|tenant_id',
    'rs|rs_projects|tenant_isolation_rs_projects|tenant_id',
    'tms|carriers|tenant_isolation_carriers|tenant_id',
    'tms|drivers|tenant_isolation_drivers|tenant_id'];
BEGIN
  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);
    v_legacy := split_part(v_item, '|', 3);
    v_col    := split_part(v_item, '|', 4);

    IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
      IF (v_schema || '|' || v_table) = ANY(v_dropped) THEN
        v_skip := v_skip + 1;
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'batch2: %.% 不存在，且不在已知死表删除名单（20 张）内；拒绝静默跳过', v_schema, v_table;
    END IF;

    v_expr := CASE WHEN v_col = 'tenant_uid' THEN v_strict_uid ELSE v_strict_tid END;
    EXECUTE format('ALTER POLICY %I ON %I.%I RENAME TO rls_tenant_isolation',
                   v_legacy, v_schema, v_table);
    EXECUTE format('ALTER POLICY rls_tenant_isolation ON %I.%I USING (%s) WITH CHECK (%s)',
                   v_schema, v_table, v_expr, v_expr);
    v_done := v_done + 1;
  END LOOP;
  RAISE NOTICE 'batch2: 已归一 % 张单策略表，跳过 % 张已删除表（目标 % 张）', v_done, v_skip, v_total;
END $body_single$;

-- 8 张多策略表：按表循环删全部遗留，再建唯一 canonical
DO $body_multi$
DECLARE
  v_item text;
  v_schema text;
  v_table text;
  v_legacy1 text;
  v_legacy2 text;
  v_strict constant text := '((COALESCE(current_setting(''app.rls_system''::text, true), ''off''::text) = ''on''::text) OR (tenant_id = (NULLIF(current_setting(''app.tenant_id''::text, true), ''''::text))::uuid))';
  v_done int := 0;
  v_total int := 8;
  v_dropped text[] := ARRAY[
    'public|core_file_folders',
    'public|core_finance_vouchers',
    'public|core_guide_lessons',
    'public|core_guide_progress',
    'public|core_inter_module_sync',
    'public|core_mdm_reconciliation_log',
    'public|cqrs_events',
    'public|crm_dashboard_snapshots',
    'public|ehs_dashboard_snapshots',
    'public|finance_voucher_templates',
    'public|financial_reports',
    'public|hrm_dashboard_snapshots',
    'public|lims_dashboard_snapshots',
    'public|pdm_change_notices',
    'public|pdm_dashboard_snapshots',
    'public|pdm_materials',
    'public|pdm_products',
    'public|wms_dashboard_snapshots',
    'tms|carriers',
    'tms|drivers'];
  v_targets text[] := ARRAY[
    'core|ai_conversations|tenant_isolation_ai_conversations|ai_conversations_tenant_isolation',
    'master_data|mdm_ai_models|tenant_isolation_policy|tenant_isolation_mdm_ai_models',
    'master_data|mdm_ai_suggestions|tenant_isolation_policy|tenant_isolation_mdm_ai_suggestions',
    'master_data|mdm_classification_models|tenant_isolation_policy|tenant_isolation_mdm_classification_models',
    'master_data|mdm_classification_results|tenant_isolation_policy|tenant_isolation_mdm_classification_results',
    'master_data|mdm_classifier_rules|tenant_isolation_policy|tenant_isolation_mdm_classifier_rules',
    'master_data|mdm_match_results|tenant_isolation_policy|tenant_isolation_mdm_match_results',
    'master_data|mdm_match_rules|tenant_isolation_policy|tenant_isolation_mdm_match_rules'];
BEGIN
  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema  := split_part(v_item, '|', 1);
    v_table   := split_part(v_item, '|', 2);
    v_legacy1 := split_part(v_item, '|', 3);
    v_legacy2 := split_part(v_item, '|', 4);

    IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
      IF (v_schema || '|' || v_table) = ANY(v_dropped) THEN
        RAISE NOTICE 'batch2 multi: %.% 已被前序死表迁移删除，跳过（累计 %/% 张）', v_schema, v_table, v_done, v_total;
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'batch2 multi: %.% 不存在，且不在已知死表删除名单（20 张）内；拒绝静默跳过', v_schema, v_table;
    END IF;

    EXECUTE format('DROP POLICY %I ON %I.%I', v_legacy1, v_schema, v_table);
    EXECUTE format('DROP POLICY %I ON %I.%I', v_legacy2, v_schema, v_table);
    EXECUTE format('CREATE POLICY rls_tenant_isolation ON %I.%I AS PERMISSIVE FOR ALL TO PUBLIC USING (%s) WITH CHECK (%s)',
                   v_schema, v_table, v_strict, v_strict);
    v_done := v_done + 1;
  END LOOP;
  RAISE NOTICE 'batch2 multi: 已归一 % 张多策略表（目标 % 张）', v_done, v_total;
END $body_multi$;

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
  v_total int := 167;
  v_dropped text[] := ARRAY[
    'public|core_file_folders',
    'public|core_finance_vouchers',
    'public|core_guide_lessons',
    'public|core_guide_progress',
    'public|core_inter_module_sync',
    'public|core_mdm_reconciliation_log',
    'public|cqrs_events',
    'public|crm_dashboard_snapshots',
    'public|ehs_dashboard_snapshots',
    'public|finance_voucher_templates',
    'public|financial_reports',
    'public|hrm_dashboard_snapshots',
    'public|lims_dashboard_snapshots',
    'public|pdm_change_notices',
    'public|pdm_dashboard_snapshots',
    'public|pdm_materials',
    'public|pdm_products',
    'public|wms_dashboard_snapshots',
    'tms|carriers',
    'tms|drivers'];
  v_targets text[] := ARRAY[
    'analytics|analytics_comparison_analyses',
    'analytics|analytics_comparison_results',
    'analytics|analytics_dashboard_shares',
    'analytics|analytics_dashboard_templates',
    'analytics|analytics_dashboards',
    'analytics|analytics_datasources',
    'analytics|analytics_drilldown_history',
    'analytics|analytics_drilldown_paths',
    'analytics|analytics_row_level_permissions',
    'analytics|analytics_self_service_reports',
    'analytics|analytics_widgets',
    'bi|analytics_dashboards',
    'bi|analytics_datasources',
    'bi|analytics_widgets',
    'communication|core_notification_deliveries',
    'communication|core_notification_preferences',
    'communication|core_notification_subscriptions',
    'core|ai_faqs',
    'core|user_preferences',
    'crm|contracts',
    'crm|customer_recommendations',
    'crm|customer_segments',
    'erp|bank_accounts',
    'erp|erp_production_orders',
    'erp|inventory_items',
    'hrm|hrm_cache_invalidation_logs',
    'hrm|initialization_status',
    'iam|data_permissions',
    'iam|permission_templates',
    'iam|tenant_users',
    'master_data|mdm_api_exposures',
    'master_data|mdm_api_products',
    'master_data|mdm_assets',
    'master_data|mdm_audit_events',
    'master_data|mdm_audit_export_logs',
    'master_data|mdm_auto_fix_actions',
    'master_data|mdm_bc_tests',
    'master_data|mdm_change_events',
    'master_data|mdm_continuity_plans',
    'master_data|mdm_critical_functions',
    'master_data|mdm_data_asset_categories',
    'master_data|mdm_data_contracts',
    'master_data|mdm_data_permissions',
    'master_data|mdm_data_products',
    'master_data|mdm_dimension_scores',
    'master_data|mdm_failover_records',
    'master_data|mdm_fix_strategies',
    'master_data|mdm_governance_insights',
    'master_data|mdm_governance_suggestions',
    'master_data|mdm_graph_communities',
    'master_data|mdm_graph_edges',
    'master_data|mdm_graph_nodes',
    'master_data|mdm_impact_analyses',
    'master_data|mdm_impact_simulations',
    'master_data|mdm_improvement_plans',
    'master_data|mdm_interactions',
    'master_data|mdm_kg_edges',
    'master_data|mdm_kg_graphs',
    'master_data|mdm_kg_nodes',
    'master_data|mdm_lifecycle_history',
    'master_data|mdm_lifecycle_policies',
    'master_data|mdm_lifecycle_stages',
    'master_data|mdm_lineage_edges',
    'master_data|mdm_lineage_graphs',
    'master_data|mdm_lineage_nodes',
    'master_data|mdm_maturity_assessments',
    'master_data|mdm_maturity_history',
    'master_data|mdm_metadata_attributes',
    'master_data|mdm_metadata_tags',
    'master_data|mdm_permission_roles',
    'master_data|mdm_propagation_logs',
    'master_data|mdm_propagation_rules',
    'master_data|mdm_quality_checks',
    'master_data|mdm_quality_loop_configs',
    'master_data|mdm_rate_cards',
    'master_data|mdm_recommendations',
    'master_data|mdm_recovery_plans',
    'master_data|mdm_recovery_points',
    'master_data|mdm_region_configs',
    'master_data|mdm_replication_configs',
    'master_data|mdm_search_history',
    'master_data|mdm_search_indexes',
    'master_data|mdm_semantic_search_indexes',
    'master_data|mdm_sla_configs',
    'master_data|mdm_supplier_categories',
    'master_data|mdm_suppliers',
    'master_data|mdm_sync_dead_letter',
    'master_data|mdm_tag_rules',
    'master_data|mdm_tagged_entities',
    'master_data|mdm_tags',
    'master_data|mdm_user_role_assignments',
    'master_data|mdm_v60_lineage_edges',
    'master_data|mdm_v60_lineage_graphs',
    'master_data|mdm_v60_lineage_nodes',
    'master_data|mdm_version_branches',
    'master_data|mdm_version_snapshots',
    'master_data|mdm_workflow_history',
    'master_data|mdm_workflow_templates',
    'master_data|mdm_workflows',
    'plugin_finance|accounting_subjects',
    'plugin_finance|difference_adjustments',
    'plugin_finance|reconciliation_item_snapshots',
    'plugin_finance|reconciliation_settlement_links',
    'plugin_finance|reconciliation_snapshots',
    'plugin_finance|settlement_snapshots',
    'portal|portal_dashboard_stats',
    'portal|portal_notifications',
    'public|_archive_core_workflow_instances',
    'public|core_doc_documents',
    'public|core_doc_folders',
    'public|core_doc_templates',
    'public|core_emails',
    'public|core_file_folders',
    'public|core_finance_accounts',
    'public|core_finance_vouchers',
    'public|core_flow_categories',
    'public|core_guide_lessons',
    'public|core_guide_progress',
    'public|core_inter_module_sync',
    'public|core_master_data_change_log',
    'public|core_master_data_refs',
    'public|core_mdm_approvals',
    'public|core_mdm_reconciliation_log',
    'public|core_migration_history',
    'public|core_notification_templates',
    'public|core_notifications',
    'public|core_tenant_modules',
    'public|core_tenant_usage',
    'public|cqrs_events',
    'public|crm_dashboard_snapshots',
    'public|ehs_dashboard_snapshots',
    'public|finance_voucher_templates',
    'public|financial_reports',
    'public|hrm_dashboard_snapshots',
    'public|lims_dashboard_snapshots',
    'public|pdm_change_notices',
    'public|pdm_dashboard_snapshots',
    'public|pdm_materials',
    'public|pdm_products',
    'public|search_entity_projections',
    'public|wms_dashboard_snapshots',
    'qms|qa_alert_messages',
    'qms|qa_alert_rules',
    'qms|qa_approval_events',
    'qms|qa_apqp_phases',
    'qms|qa_apqp_projects',
    'qms|qa_apqp_risks',
    'qms|qa_apqp_tasks',
    'rs|change_orders',
    'rs|material_tests',
    'rs|project_members',
    'rs|project_milestones',
    'rs|project_phases',
    'rs|projects',
    'rs|rs_experiments',
    'rs|rs_formulas',
    'rs|rs_projects',
    'tms|carriers',
    'tms|drivers',
    'core|ai_conversations',
    'master_data|mdm_ai_models',
    'master_data|mdm_ai_suggestions',
    'master_data|mdm_classification_models',
    'master_data|mdm_classification_results',
    'master_data|mdm_classifier_rules',
    'master_data|mdm_match_results',
    'master_data|mdm_match_rules'];
BEGIN
  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);

    IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
      IF (v_schema || '|' || v_table) = ANY(v_dropped) THEN
        v_skip := v_skip + 1;
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'batch2 postcheck: %.% 不存在，且不在已知死表删除名单（20 张）内；拒绝静默通过', v_schema, v_table;
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
  RAISE NOTICE 'batch2 postcheck: 已校验 % 张归一结果，跳过 % 张已删除表（目标 % 张）', v_total - v_skip, v_skip, v_total;
END $post$;
