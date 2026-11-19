-- 回滚 20261119131000：把批 2 的 canonical 还原为原遗留名与原表达式。
-- 前置：每表恰好 1 条 rls_tenant_isolation；后置：恢复原策略集合（单策略表 1 条、多策略表 N 条）。
-- 存在性守卫：表存在 → 严格断言不变；表已被 20261119100000/20261119110000 删除（20 张名单）→ NOTICE 跳过；
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
  v_col text;
  v_wc text;
  v_n int;
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
    'analytics|analytics_comparison_analyses|tenant_isolation_analytics_comparison_analyses|tenant_id|0',
    'analytics|analytics_comparison_results|tenant_isolation_analytics_comparison_results|tenant_id|0',
    'analytics|analytics_dashboard_shares|tenant_isolation_analytics_dashboard_shares|tenant_id|0',
    'analytics|analytics_dashboard_templates|tenant_isolation_analytics_dashboard_templates|tenant_id|0',
    'analytics|analytics_dashboards|tenant_isolation_analytics_dashboards|tenant_id|0',
    'analytics|analytics_datasources|tenant_isolation_analytics_datasources|tenant_id|0',
    'analytics|analytics_drilldown_history|tenant_isolation_analytics_drilldown_history|tenant_id|0',
    'analytics|analytics_drilldown_paths|tenant_isolation_analytics_drilldown_paths|tenant_id|0',
    'analytics|analytics_row_level_permissions|tenant_isolation_analytics_row_level_permissions|tenant_id|0',
    'analytics|analytics_self_service_reports|tenant_isolation_analytics_self_service_reports|tenant_id|0',
    'analytics|analytics_widgets|tenant_isolation_analytics_widgets|tenant_id|0',
    'bi|analytics_dashboards|tenant_isolation_analytics_dashboards|tenant_id|0',
    'bi|analytics_datasources|tenant_isolation_analytics_datasources|tenant_id|0',
    'bi|analytics_widgets|tenant_isolation_analytics_widgets|tenant_id|0',
    'communication|core_notification_deliveries|notification_deliveries_tenant_isolation|tenant_id|0',
    'communication|core_notification_preferences|notification_preferences_tenant_isolation|tenant_id|0',
    'communication|core_notification_subscriptions|notification_subscriptions_tenant_isolation|tenant_id|0',
    'core|ai_faqs|tenant_isolation_core_ai_faqs|tenant_id|0',
    'core|user_preferences|tenant_isolation_user_preferences|tenant_id|0',
    'crm|contracts|tenant_isolation_contracts|tenant_id|0',
    'crm|customer_recommendations|tenant_isolation_customer_recommendations|tenant_id|0',
    'crm|customer_segments|tenant_isolation_customer_segments|tenant_id|0',
    'erp|bank_accounts|tenant_isolation_bank_accounts|tenant_id|0',
    'erp|erp_production_orders|tenant_isolation|tenant_id|0',
    'erp|inventory_items|tenant_isolation_inventory_items|tenant_id|0',
    'hrm|hrm_cache_invalidation_logs|tenant_isolation|tenant_id|0',
    'hrm|initialization_status|tenant_isolation_initialization_status|tenant_id|0',
    'iam|data_permissions|tenant_isolation_data_permissions|tenant_id|0',
    'iam|permission_templates|tenant_isolation_permission_templates|tenant_id|0',
    'iam|tenant_users|tenant_isolation_tenant_users|tenant_id|0',
    'master_data|mdm_api_exposures|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_api_products|mdm_api_products_tenant_policy|tenant_id|0',
    'master_data|mdm_assets|mdm_assets_tenant_policy|tenant_id|0',
    'master_data|mdm_audit_events|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_audit_export_logs|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_auto_fix_actions|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_bc_tests|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_change_events|mdm_change_events_tenant_policy|tenant_id|0',
    'master_data|mdm_continuity_plans|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_critical_functions|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_data_asset_categories|mdm_data_asset_categories_tenant_policy|tenant_id|0',
    'master_data|mdm_data_contracts|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_data_permissions|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_data_products|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_dimension_scores|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_failover_records|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_fix_strategies|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_governance_insights|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_governance_suggestions|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_graph_communities|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_graph_edges|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_graph_nodes|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_impact_analyses|mdm_impact_analyses_tenant_policy|tenant_id|0',
    'master_data|mdm_impact_simulations|mdm_impact_simulations_tenant_policy|tenant_id|0',
    'master_data|mdm_improvement_plans|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_interactions|mdm_interactions_tenant_policy|tenant_id|0',
    'master_data|mdm_kg_edges|mdm_kg_edges_tenant_policy|tenant_id|0',
    'master_data|mdm_kg_graphs|mdm_kg_graphs_tenant_policy|tenant_id|0',
    'master_data|mdm_kg_nodes|mdm_kg_nodes_tenant_policy|tenant_id|0',
    'master_data|mdm_lifecycle_history|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_lifecycle_policies|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_lifecycle_stages|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_lineage_edges|mdm_lineage_edges_tenant_policy|tenant_id|0',
    'master_data|mdm_lineage_graphs|mdm_lineage_graphs_tenant_policy|tenant_id|0',
    'master_data|mdm_lineage_nodes|mdm_lineage_nodes_tenant_policy|tenant_id|0',
    'master_data|mdm_maturity_assessments|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_maturity_history|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_metadata_attributes|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_metadata_tags|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_permission_roles|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_propagation_logs|mdm_propagation_logs_tenant_policy|tenant_id|0',
    'master_data|mdm_propagation_rules|mdm_propagation_rules_tenant_policy|tenant_id|0',
    'master_data|mdm_quality_checks|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_quality_loop_configs|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_rate_cards|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_recommendations|mdm_recommendations_tenant_policy|tenant_id|0',
    'master_data|mdm_recovery_plans|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_recovery_points|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_region_configs|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_replication_configs|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_search_history|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_search_indexes|mdm_search_indexes_tenant_policy|tenant_id|0',
    'master_data|mdm_semantic_search_indexes|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_sla_configs|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_supplier_categories|tenant_isolation_mdm_supplier_categories|tenant_id|0',
    'master_data|mdm_suppliers|tenant_isolation_mdm_suppliers|tenant_id|0',
    'master_data|mdm_sync_dead_letter|tenant_isolation_mdm_sync_dead_letter|tenant_id|0',
    'master_data|mdm_tag_rules|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_tagged_entities|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_tags|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_user_role_assignments|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_v60_lineage_edges|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_v60_lineage_graphs|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_v60_lineage_nodes|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_version_branches|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_version_snapshots|mdm_version_snapshots_tenant_policy|tenant_id|0',
    'master_data|mdm_workflow_history|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_workflow_templates|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_workflows|tenant_isolation_policy|tenant_id|0',
    'plugin_finance|accounting_subjects|tenant_isolation_accounting_subjects|tenant_id|0',
    'plugin_finance|difference_adjustments|tenant_isolation_difference_adjustments|tenant_id|0',
    'plugin_finance|reconciliation_item_snapshots|tenant_isolation_reconciliation_item_snapshots|tenant_id|0',
    'plugin_finance|reconciliation_settlement_links|tenant_isolation_reconciliation_settlement_links|tenant_id|0',
    'plugin_finance|reconciliation_snapshots|tenant_isolation_reconciliation_snapshots|tenant_id|0',
    'plugin_finance|settlement_snapshots|tenant_isolation_settlement_snapshots|tenant_id|0',
    'portal|portal_dashboard_stats|tenant_isolation_portal_dashboard_stats|tenant_id|0',
    'portal|portal_notifications|tenant_isolation_portal_notifications|tenant_id|0',
    'public|_archive_core_workflow_instances|tenant_isolation_core_workflow_instances|tenant_id|0',
    'public|core_doc_documents|tenant_isolation_core_doc_documents|tenant_id|0',
    'public|core_doc_folders|tenant_isolation_core_doc_folders|tenant_id|0',
    'public|core_doc_templates|tenant_isolation_core_doc_templates|tenant_id|0',
    'public|core_emails|tenant_isolation_core_emails|tenant_id|0',
    'public|core_file_folders|tenant_isolation_core_file_folders|tenant_id|0',
    'public|core_finance_accounts|tenant_isolation_core_finance_accounts|tenant_id|0',
    'public|core_finance_vouchers|tenant_isolation_core_finance_vouchers|tenant_id|0',
    'public|core_flow_categories|tenant_isolation_core_flow_categories|tenant_id|0',
    'public|core_guide_lessons|tenant_isolation_core_guide_lessons|tenant_id|0',
    'public|core_guide_progress|tenant_isolation_core_guide_progress|tenant_id|0',
    'public|core_inter_module_sync|tenant_isolation_core_inter_module_sync|tenant_id|0',
    'public|core_master_data_change_log|tenant_isolation_core_master_data_change_log|tenant_id|0',
    'public|core_master_data_refs|tenant_isolation_core_master_data_refs|tenant_id|0',
    'public|core_mdm_approvals|tenant_isolation_core_mdm_approvals|tenant_id|0',
    'public|core_mdm_reconciliation_log|tenant_isolation_core_mdm_reconciliation_log|tenant_id|0',
    'public|core_migration_history|tenant_isolation_core_migration_history|tenant_id|0',
    'public|core_notification_templates|tenant_isolation_core_notification_templates|tenant_id|0',
    'public|core_notifications|tenant_isolation_core_notifications|tenant_id|0',
    'public|core_tenant_modules|tenant_isolation_core_tenant_modules|tenant_id|0',
    'public|core_tenant_usage|tenant_isolation_core_tenant_usage|tenant_id|0',
    'public|cqrs_events|tenant_isolation_cqrs_events|tenant_id|0',
    'public|crm_dashboard_snapshots|tenant_isolation_crm_dashboard_snapshots|tenant_id|0',
    'public|ehs_dashboard_snapshots|tenant_isolation_ehs_dashboard_snapshots|tenant_id|0',
    'public|finance_voucher_templates|tenant_isolation_finance_voucher_templates|tenant_id|0',
    'public|financial_reports|tenant_isolation_financial_reports|tenant_id|0',
    'public|hrm_dashboard_snapshots|tenant_isolation_hrm_dashboard_snapshots|tenant_id|0',
    'public|lims_dashboard_snapshots|tenant_isolation_lims_dashboard_snapshots|tenant_id|0',
    'public|pdm_change_notices|tenant_isolation_pdm_change_notices|tenant_id|0',
    'public|pdm_dashboard_snapshots|tenant_isolation_pdm_dashboard_snapshots|tenant_id|0',
    'public|pdm_materials|tenant_isolation_pdm_materials|tenant_id|0',
    'public|pdm_products|tenant_isolation_pdm_products|tenant_id|0',
    'public|search_entity_projections|tenant_isolation_search_entity_projections|tenant_id|0',
    'public|wms_dashboard_snapshots|tenant_isolation_wms_dashboard_snapshots|tenant_id|0',
    'qms|qa_alert_messages|tenant_isolation_qa_alert_messages|tenant_id|0',
    'qms|qa_alert_rules|tenant_isolation_qa_alert_rules|tenant_id|0',
    'qms|qa_approval_events|tenant_isolation_qa_approval_events|tenant_id|0',
    'qms|qa_apqp_phases|tenant_isolation_qa_apqp_phases|tenant_id|0',
    'qms|qa_apqp_projects|tenant_isolation_qa_apqp_projects|tenant_id|0',
    'qms|qa_apqp_risks|tenant_isolation_qa_apqp_risks|tenant_id|0',
    'qms|qa_apqp_tasks|tenant_isolation_qa_apqp_tasks|tenant_id|0',
    'rs|change_orders|tenant_isolation_change_orders|tenant_id|0',
    'rs|material_tests|tenant_isolation_material_tests|tenant_id|0',
    'rs|project_members|tenant_isolation_project_members|tenant_id|0',
    'rs|project_milestones|tenant_isolation_project_milestones|tenant_id|0',
    'rs|project_phases|tenant_isolation_project_phases|tenant_id|0',
    'rs|projects|tenant_isolation_projects|tenant_id|0',
    'rs|rs_experiments|tenant_isolation_rs_experiments|tenant_id|0',
    'rs|rs_formulas|tenant_isolation_rs_formulas|tenant_id|0',
    'rs|rs_projects|tenant_isolation_rs_projects|tenant_id|0',
    'tms|carriers|tenant_isolation_carriers|tenant_id|0',
    'tms|drivers|tenant_isolation_drivers|tenant_id|0'];
BEGIN
  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);
    v_legacy := split_part(v_item, '|', 3);
    v_col    := split_part(v_item, '|', 4);
    v_wc     := split_part(v_item, '|', 5);

    IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
      IF (v_schema || '|' || v_table) = ANY(v_dropped) THEN
        v_skip := v_skip + 1;
        RAISE NOTICE 'rollback2: %.% 已被前序死表迁移删除，跳过回滚（累计 %/% 张）', v_schema, v_table, v_skip, v_total;
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'rollback2: %.% 不存在，且不在已知死表删除名单（20 张）内；拒绝静默跳过', v_schema, v_table;
    END IF;

    SELECT count(*) INTO v_n
      FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=v_schema AND c.relname=v_table
       AND p.polname='rls_tenant_isolation';
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'rollback2 precheck: %.% 期望 1 条 canonical，实际 %', v_schema, v_table, v_n;
    END IF;
  END LOOP;
  RAISE NOTICE 'rollback2: 目标 % 张，跳过 % 张（已删除），待回滚 % 张', v_total, v_skip, v_total - v_skip;
END $pre$;

-- 单策略表：按表循环 rename 回原名并还原表达式
DO $body_single$
DECLARE
  v_item text;
  v_schema text;
  v_table text;
  v_legacy text;
  v_col text;
  v_wc text;
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
    'analytics|analytics_comparison_analyses|tenant_isolation_analytics_comparison_analyses|tenant_id|0',
    'analytics|analytics_comparison_results|tenant_isolation_analytics_comparison_results|tenant_id|0',
    'analytics|analytics_dashboard_shares|tenant_isolation_analytics_dashboard_shares|tenant_id|0',
    'analytics|analytics_dashboard_templates|tenant_isolation_analytics_dashboard_templates|tenant_id|0',
    'analytics|analytics_dashboards|tenant_isolation_analytics_dashboards|tenant_id|0',
    'analytics|analytics_datasources|tenant_isolation_analytics_datasources|tenant_id|0',
    'analytics|analytics_drilldown_history|tenant_isolation_analytics_drilldown_history|tenant_id|0',
    'analytics|analytics_drilldown_paths|tenant_isolation_analytics_drilldown_paths|tenant_id|0',
    'analytics|analytics_row_level_permissions|tenant_isolation_analytics_row_level_permissions|tenant_id|0',
    'analytics|analytics_self_service_reports|tenant_isolation_analytics_self_service_reports|tenant_id|0',
    'analytics|analytics_widgets|tenant_isolation_analytics_widgets|tenant_id|0',
    'bi|analytics_dashboards|tenant_isolation_analytics_dashboards|tenant_id|0',
    'bi|analytics_datasources|tenant_isolation_analytics_datasources|tenant_id|0',
    'bi|analytics_widgets|tenant_isolation_analytics_widgets|tenant_id|0',
    'communication|core_notification_deliveries|notification_deliveries_tenant_isolation|tenant_id|0',
    'communication|core_notification_preferences|notification_preferences_tenant_isolation|tenant_id|0',
    'communication|core_notification_subscriptions|notification_subscriptions_tenant_isolation|tenant_id|0',
    'core|ai_faqs|tenant_isolation_core_ai_faqs|tenant_id|0',
    'core|user_preferences|tenant_isolation_user_preferences|tenant_id|0',
    'crm|contracts|tenant_isolation_contracts|tenant_id|0',
    'crm|customer_recommendations|tenant_isolation_customer_recommendations|tenant_id|0',
    'crm|customer_segments|tenant_isolation_customer_segments|tenant_id|0',
    'erp|bank_accounts|tenant_isolation_bank_accounts|tenant_id|0',
    'erp|erp_production_orders|tenant_isolation|tenant_id|0',
    'erp|inventory_items|tenant_isolation_inventory_items|tenant_id|0',
    'hrm|hrm_cache_invalidation_logs|tenant_isolation|tenant_id|0',
    'hrm|initialization_status|tenant_isolation_initialization_status|tenant_id|0',
    'iam|data_permissions|tenant_isolation_data_permissions|tenant_id|0',
    'iam|permission_templates|tenant_isolation_permission_templates|tenant_id|0',
    'iam|tenant_users|tenant_isolation_tenant_users|tenant_id|0',
    'master_data|mdm_api_exposures|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_api_products|mdm_api_products_tenant_policy|tenant_id|0',
    'master_data|mdm_assets|mdm_assets_tenant_policy|tenant_id|0',
    'master_data|mdm_audit_events|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_audit_export_logs|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_auto_fix_actions|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_bc_tests|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_change_events|mdm_change_events_tenant_policy|tenant_id|0',
    'master_data|mdm_continuity_plans|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_critical_functions|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_data_asset_categories|mdm_data_asset_categories_tenant_policy|tenant_id|0',
    'master_data|mdm_data_contracts|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_data_permissions|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_data_products|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_dimension_scores|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_failover_records|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_fix_strategies|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_governance_insights|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_governance_suggestions|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_graph_communities|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_graph_edges|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_graph_nodes|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_impact_analyses|mdm_impact_analyses_tenant_policy|tenant_id|0',
    'master_data|mdm_impact_simulations|mdm_impact_simulations_tenant_policy|tenant_id|0',
    'master_data|mdm_improvement_plans|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_interactions|mdm_interactions_tenant_policy|tenant_id|0',
    'master_data|mdm_kg_edges|mdm_kg_edges_tenant_policy|tenant_id|0',
    'master_data|mdm_kg_graphs|mdm_kg_graphs_tenant_policy|tenant_id|0',
    'master_data|mdm_kg_nodes|mdm_kg_nodes_tenant_policy|tenant_id|0',
    'master_data|mdm_lifecycle_history|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_lifecycle_policies|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_lifecycle_stages|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_lineage_edges|mdm_lineage_edges_tenant_policy|tenant_id|0',
    'master_data|mdm_lineage_graphs|mdm_lineage_graphs_tenant_policy|tenant_id|0',
    'master_data|mdm_lineage_nodes|mdm_lineage_nodes_tenant_policy|tenant_id|0',
    'master_data|mdm_maturity_assessments|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_maturity_history|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_metadata_attributes|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_metadata_tags|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_permission_roles|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_propagation_logs|mdm_propagation_logs_tenant_policy|tenant_id|0',
    'master_data|mdm_propagation_rules|mdm_propagation_rules_tenant_policy|tenant_id|0',
    'master_data|mdm_quality_checks|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_quality_loop_configs|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_rate_cards|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_recommendations|mdm_recommendations_tenant_policy|tenant_id|0',
    'master_data|mdm_recovery_plans|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_recovery_points|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_region_configs|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_replication_configs|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_search_history|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_search_indexes|mdm_search_indexes_tenant_policy|tenant_id|0',
    'master_data|mdm_semantic_search_indexes|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_sla_configs|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_supplier_categories|tenant_isolation_mdm_supplier_categories|tenant_id|0',
    'master_data|mdm_suppliers|tenant_isolation_mdm_suppliers|tenant_id|0',
    'master_data|mdm_sync_dead_letter|tenant_isolation_mdm_sync_dead_letter|tenant_id|0',
    'master_data|mdm_tag_rules|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_tagged_entities|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_tags|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_user_role_assignments|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_v60_lineage_edges|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_v60_lineage_graphs|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_v60_lineage_nodes|tenant_isolation_policy|tenant_uid|0',
    'master_data|mdm_version_branches|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_version_snapshots|mdm_version_snapshots_tenant_policy|tenant_id|0',
    'master_data|mdm_workflow_history|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_workflow_templates|tenant_isolation_policy|tenant_id|0',
    'master_data|mdm_workflows|tenant_isolation_policy|tenant_id|0',
    'plugin_finance|accounting_subjects|tenant_isolation_accounting_subjects|tenant_id|0',
    'plugin_finance|difference_adjustments|tenant_isolation_difference_adjustments|tenant_id|0',
    'plugin_finance|reconciliation_item_snapshots|tenant_isolation_reconciliation_item_snapshots|tenant_id|0',
    'plugin_finance|reconciliation_settlement_links|tenant_isolation_reconciliation_settlement_links|tenant_id|0',
    'plugin_finance|reconciliation_snapshots|tenant_isolation_reconciliation_snapshots|tenant_id|0',
    'plugin_finance|settlement_snapshots|tenant_isolation_settlement_snapshots|tenant_id|0',
    'portal|portal_dashboard_stats|tenant_isolation_portal_dashboard_stats|tenant_id|0',
    'portal|portal_notifications|tenant_isolation_portal_notifications|tenant_id|0',
    'public|_archive_core_workflow_instances|tenant_isolation_core_workflow_instances|tenant_id|0',
    'public|core_doc_documents|tenant_isolation_core_doc_documents|tenant_id|0',
    'public|core_doc_folders|tenant_isolation_core_doc_folders|tenant_id|0',
    'public|core_doc_templates|tenant_isolation_core_doc_templates|tenant_id|0',
    'public|core_emails|tenant_isolation_core_emails|tenant_id|0',
    'public|core_file_folders|tenant_isolation_core_file_folders|tenant_id|0',
    'public|core_finance_accounts|tenant_isolation_core_finance_accounts|tenant_id|0',
    'public|core_finance_vouchers|tenant_isolation_core_finance_vouchers|tenant_id|0',
    'public|core_flow_categories|tenant_isolation_core_flow_categories|tenant_id|0',
    'public|core_guide_lessons|tenant_isolation_core_guide_lessons|tenant_id|0',
    'public|core_guide_progress|tenant_isolation_core_guide_progress|tenant_id|0',
    'public|core_inter_module_sync|tenant_isolation_core_inter_module_sync|tenant_id|0',
    'public|core_master_data_change_log|tenant_isolation_core_master_data_change_log|tenant_id|0',
    'public|core_master_data_refs|tenant_isolation_core_master_data_refs|tenant_id|0',
    'public|core_mdm_approvals|tenant_isolation_core_mdm_approvals|tenant_id|0',
    'public|core_mdm_reconciliation_log|tenant_isolation_core_mdm_reconciliation_log|tenant_id|0',
    'public|core_migration_history|tenant_isolation_core_migration_history|tenant_id|0',
    'public|core_notification_templates|tenant_isolation_core_notification_templates|tenant_id|0',
    'public|core_notifications|tenant_isolation_core_notifications|tenant_id|0',
    'public|core_tenant_modules|tenant_isolation_core_tenant_modules|tenant_id|0',
    'public|core_tenant_usage|tenant_isolation_core_tenant_usage|tenant_id|0',
    'public|cqrs_events|tenant_isolation_cqrs_events|tenant_id|0',
    'public|crm_dashboard_snapshots|tenant_isolation_crm_dashboard_snapshots|tenant_id|0',
    'public|ehs_dashboard_snapshots|tenant_isolation_ehs_dashboard_snapshots|tenant_id|0',
    'public|finance_voucher_templates|tenant_isolation_finance_voucher_templates|tenant_id|0',
    'public|financial_reports|tenant_isolation_financial_reports|tenant_id|0',
    'public|hrm_dashboard_snapshots|tenant_isolation_hrm_dashboard_snapshots|tenant_id|0',
    'public|lims_dashboard_snapshots|tenant_isolation_lims_dashboard_snapshots|tenant_id|0',
    'public|pdm_change_notices|tenant_isolation_pdm_change_notices|tenant_id|0',
    'public|pdm_dashboard_snapshots|tenant_isolation_pdm_dashboard_snapshots|tenant_id|0',
    'public|pdm_materials|tenant_isolation_pdm_materials|tenant_id|0',
    'public|pdm_products|tenant_isolation_pdm_products|tenant_id|0',
    'public|search_entity_projections|tenant_isolation_search_entity_projections|tenant_id|0',
    'public|wms_dashboard_snapshots|tenant_isolation_wms_dashboard_snapshots|tenant_id|0',
    'qms|qa_alert_messages|tenant_isolation_qa_alert_messages|tenant_id|0',
    'qms|qa_alert_rules|tenant_isolation_qa_alert_rules|tenant_id|0',
    'qms|qa_approval_events|tenant_isolation_qa_approval_events|tenant_id|0',
    'qms|qa_apqp_phases|tenant_isolation_qa_apqp_phases|tenant_id|0',
    'qms|qa_apqp_projects|tenant_isolation_qa_apqp_projects|tenant_id|0',
    'qms|qa_apqp_risks|tenant_isolation_qa_apqp_risks|tenant_id|0',
    'qms|qa_apqp_tasks|tenant_isolation_qa_apqp_tasks|tenant_id|0',
    'rs|change_orders|tenant_isolation_change_orders|tenant_id|0',
    'rs|material_tests|tenant_isolation_material_tests|tenant_id|0',
    'rs|project_members|tenant_isolation_project_members|tenant_id|0',
    'rs|project_milestones|tenant_isolation_project_milestones|tenant_id|0',
    'rs|project_phases|tenant_isolation_project_phases|tenant_id|0',
    'rs|projects|tenant_isolation_projects|tenant_id|0',
    'rs|rs_experiments|tenant_isolation_rs_experiments|tenant_id|0',
    'rs|rs_formulas|tenant_isolation_rs_formulas|tenant_id|0',
    'rs|rs_projects|tenant_isolation_rs_projects|tenant_id|0',
    'tms|carriers|tenant_isolation_carriers|tenant_id|0',
    'tms|drivers|tenant_isolation_drivers|tenant_id|0'];
BEGIN
  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);
    v_legacy := split_part(v_item, '|', 3);
    v_col    := split_part(v_item, '|', 4);
    v_wc     := split_part(v_item, '|', 5);

    IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
      IF (v_schema || '|' || v_table) = ANY(v_dropped) THEN
        v_skip := v_skip + 1;
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'rollback2: %.% 不存在，且不在已知死表删除名单（20 张）内；拒绝静默跳过', v_schema, v_table;
    END IF;

    v_expr := CASE WHEN v_col = 'tenant_uid' THEN v_strict_uid ELSE v_strict_tid END;
    EXECUTE format('ALTER POLICY rls_tenant_isolation ON %I.%I RENAME TO %I',
                   v_schema, v_table, v_legacy);
    IF v_wc = '1' THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s) WITH CHECK (%s)',
                     v_legacy, v_schema, v_table, v_expr, v_expr);
    ELSE
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)',
                     v_legacy, v_schema, v_table, v_expr);
    END IF;
    v_done := v_done + 1;
  END LOOP;
  RAISE NOTICE 'rollback2: 已还原 % 张单策略表，跳过 % 张已删除表（目标 % 张）', v_done, v_skip, v_total;
END $body_single$;

-- 多策略表：按表循环删 canonical，逐条重建原策略
DO $body_multi$
DECLARE
  v_item text;
  v_schema text;
  v_table text;
  v_p1 text;
  v_wc1 text;
  v_p2 text;
  v_wc2 text;
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
    'core|ai_conversations|tenant_isolation_ai_conversations|0|ai_conversations_tenant_isolation|1',
    'master_data|mdm_ai_models|tenant_isolation_policy|1|tenant_isolation_mdm_ai_models|0',
    'master_data|mdm_ai_suggestions|tenant_isolation_policy|1|tenant_isolation_mdm_ai_suggestions|0',
    'master_data|mdm_classification_models|tenant_isolation_policy|1|tenant_isolation_mdm_classification_models|0',
    'master_data|mdm_classification_results|tenant_isolation_policy|1|tenant_isolation_mdm_classification_results|0',
    'master_data|mdm_classifier_rules|tenant_isolation_policy|1|tenant_isolation_mdm_classifier_rules|0',
    'master_data|mdm_match_results|tenant_isolation_policy|1|tenant_isolation_mdm_match_results|0',
    'master_data|mdm_match_rules|tenant_isolation_policy|1|tenant_isolation_mdm_match_rules|0'];
BEGIN
  FOREACH v_item IN ARRAY v_targets LOOP
    v_schema := split_part(v_item, '|', 1);
    v_table  := split_part(v_item, '|', 2);
    v_p1     := split_part(v_item, '|', 3);
    v_wc1    := split_part(v_item, '|', 4);
    v_p2     := split_part(v_item, '|', 5);
    v_wc2    := split_part(v_item, '|', 6);

    IF to_regclass(format('%I.%I', v_schema, v_table)) IS NULL THEN
      IF (v_schema || '|' || v_table) = ANY(v_dropped) THEN
        RAISE NOTICE 'rollback2 multi: %.% 已被前序死表迁移删除，跳过（累计 %/% 张）', v_schema, v_table, v_done, v_total;
        CONTINUE;
      END IF;
      RAISE EXCEPTION 'rollback2 multi: %.% 不存在，且不在已知死表删除名单（20 张）内；拒绝静默跳过', v_schema, v_table;
    END IF;

    EXECUTE format('DROP POLICY rls_tenant_isolation ON %I.%I', v_schema, v_table);
    IF v_wc1 = '1' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR ALL TO PUBLIC USING (%s) WITH CHECK (%s)',
                     v_p1, v_schema, v_table, v_strict, v_strict);
    ELSE
      EXECUTE format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR ALL TO PUBLIC USING (%s)',
                     v_p1, v_schema, v_table, v_strict);
    END IF;
    IF v_wc2 = '1' THEN
      EXECUTE format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR ALL TO PUBLIC USING (%s) WITH CHECK (%s)',
                     v_p2, v_schema, v_table, v_strict, v_strict);
    ELSE
      EXECUTE format('CREATE POLICY %I ON %I.%I AS PERMISSIVE FOR ALL TO PUBLIC USING (%s)',
                     v_p2, v_schema, v_table, v_strict);
    END IF;
    v_done := v_done + 1;
  END LOOP;
  RAISE NOTICE 'rollback2 multi: 已重建 % 张多策略表（目标 % 张）', v_done, v_total;
END $body_multi$;
