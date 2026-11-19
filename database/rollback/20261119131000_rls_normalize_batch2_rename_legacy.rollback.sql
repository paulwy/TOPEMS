-- 回滚 20261119131000：把批 2 的 canonical 还原为原遗留名与原表达式。
-- 前置：每表恰好 1 条 rls_tenant_isolation；后置：恢复原策略集合（单策略表 1 条、多策略表 N 条）。
-- 事务：文件内不含 BEGIN/COMMIT，手工执行请用 psql --single-transaction。
SET search_path = pg_catalog, pg_temp;
SET lock_timeout = '5s';
SET statement_timeout = '300s';

DO $pre$
DECLARE v_t text; v_n int;
BEGIN
  FOREACH v_t IN ARRAY ARRAY['analytics|analytics_comparison_analyses',
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
    'master_data|mdm_match_rules']
  LOOP
    SELECT count(*) INTO v_n
      FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname=split_part(v_t,'|',1) AND c.relname=split_part(v_t,'|',2)
       AND p.polname='rls_tenant_isolation';
    IF v_n <> 1 THEN
      RAISE EXCEPTION 'rollback2 precheck: % 期望 1 条 canonical，实际 %', v_t, v_n;
    END IF;
  END LOOP;
END $pre$;

-- 单策略表：rename 回原名并还原表达式
ALTER POLICY rls_tenant_isolation ON "analytics"."analytics_comparison_analyses" RENAME TO "tenant_isolation_analytics_comparison_analyses";
ALTER POLICY "tenant_isolation_analytics_comparison_analyses" ON "analytics"."analytics_comparison_analyses" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "analytics"."analytics_comparison_results" RENAME TO "tenant_isolation_analytics_comparison_results";
ALTER POLICY "tenant_isolation_analytics_comparison_results" ON "analytics"."analytics_comparison_results" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "analytics"."analytics_dashboard_shares" RENAME TO "tenant_isolation_analytics_dashboard_shares";
ALTER POLICY "tenant_isolation_analytics_dashboard_shares" ON "analytics"."analytics_dashboard_shares" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "analytics"."analytics_dashboard_templates" RENAME TO "tenant_isolation_analytics_dashboard_templates";
ALTER POLICY "tenant_isolation_analytics_dashboard_templates" ON "analytics"."analytics_dashboard_templates" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "analytics"."analytics_dashboards" RENAME TO "tenant_isolation_analytics_dashboards";
ALTER POLICY "tenant_isolation_analytics_dashboards" ON "analytics"."analytics_dashboards" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "analytics"."analytics_datasources" RENAME TO "tenant_isolation_analytics_datasources";
ALTER POLICY "tenant_isolation_analytics_datasources" ON "analytics"."analytics_datasources" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "analytics"."analytics_drilldown_history" RENAME TO "tenant_isolation_analytics_drilldown_history";
ALTER POLICY "tenant_isolation_analytics_drilldown_history" ON "analytics"."analytics_drilldown_history" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "analytics"."analytics_drilldown_paths" RENAME TO "tenant_isolation_analytics_drilldown_paths";
ALTER POLICY "tenant_isolation_analytics_drilldown_paths" ON "analytics"."analytics_drilldown_paths" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "analytics"."analytics_row_level_permissions" RENAME TO "tenant_isolation_analytics_row_level_permissions";
ALTER POLICY "tenant_isolation_analytics_row_level_permissions" ON "analytics"."analytics_row_level_permissions" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "analytics"."analytics_self_service_reports" RENAME TO "tenant_isolation_analytics_self_service_reports";
ALTER POLICY "tenant_isolation_analytics_self_service_reports" ON "analytics"."analytics_self_service_reports" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "analytics"."analytics_widgets" RENAME TO "tenant_isolation_analytics_widgets";
ALTER POLICY "tenant_isolation_analytics_widgets" ON "analytics"."analytics_widgets" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "bi"."analytics_dashboards" RENAME TO "tenant_isolation_analytics_dashboards";
ALTER POLICY "tenant_isolation_analytics_dashboards" ON "bi"."analytics_dashboards" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "bi"."analytics_datasources" RENAME TO "tenant_isolation_analytics_datasources";
ALTER POLICY "tenant_isolation_analytics_datasources" ON "bi"."analytics_datasources" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "bi"."analytics_widgets" RENAME TO "tenant_isolation_analytics_widgets";
ALTER POLICY "tenant_isolation_analytics_widgets" ON "bi"."analytics_widgets" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "communication"."core_notification_deliveries" RENAME TO "notification_deliveries_tenant_isolation";
ALTER POLICY "notification_deliveries_tenant_isolation" ON "communication"."core_notification_deliveries" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "communication"."core_notification_preferences" RENAME TO "notification_preferences_tenant_isolation";
ALTER POLICY "notification_preferences_tenant_isolation" ON "communication"."core_notification_preferences" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "communication"."core_notification_subscriptions" RENAME TO "notification_subscriptions_tenant_isolation";
ALTER POLICY "notification_subscriptions_tenant_isolation" ON "communication"."core_notification_subscriptions" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "core"."ai_faqs" RENAME TO "tenant_isolation_core_ai_faqs";
ALTER POLICY "tenant_isolation_core_ai_faqs" ON "core"."ai_faqs" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "core"."user_preferences" RENAME TO "tenant_isolation_user_preferences";
ALTER POLICY "tenant_isolation_user_preferences" ON "core"."user_preferences" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "crm"."contracts" RENAME TO "tenant_isolation_contracts";
ALTER POLICY "tenant_isolation_contracts" ON "crm"."contracts" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "crm"."customer_recommendations" RENAME TO "tenant_isolation_customer_recommendations";
ALTER POLICY "tenant_isolation_customer_recommendations" ON "crm"."customer_recommendations" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "crm"."customer_segments" RENAME TO "tenant_isolation_customer_segments";
ALTER POLICY "tenant_isolation_customer_segments" ON "crm"."customer_segments" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "erp"."bank_accounts" RENAME TO "tenant_isolation_bank_accounts";
ALTER POLICY "tenant_isolation_bank_accounts" ON "erp"."bank_accounts" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "erp"."erp_production_orders" RENAME TO "tenant_isolation";
ALTER POLICY "tenant_isolation" ON "erp"."erp_production_orders" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "erp"."inventory_items" RENAME TO "tenant_isolation_inventory_items";
ALTER POLICY "tenant_isolation_inventory_items" ON "erp"."inventory_items" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "hrm"."hrm_cache_invalidation_logs" RENAME TO "tenant_isolation";
ALTER POLICY "tenant_isolation" ON "hrm"."hrm_cache_invalidation_logs" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "hrm"."initialization_status" RENAME TO "tenant_isolation_initialization_status";
ALTER POLICY "tenant_isolation_initialization_status" ON "hrm"."initialization_status" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "iam"."data_permissions" RENAME TO "tenant_isolation_data_permissions";
ALTER POLICY "tenant_isolation_data_permissions" ON "iam"."data_permissions" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "iam"."permission_templates" RENAME TO "tenant_isolation_permission_templates";
ALTER POLICY "tenant_isolation_permission_templates" ON "iam"."permission_templates" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "iam"."tenant_users" RENAME TO "tenant_isolation_tenant_users";
ALTER POLICY "tenant_isolation_tenant_users" ON "iam"."tenant_users" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_api_exposures" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_api_exposures" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_api_products" RENAME TO "mdm_api_products_tenant_policy";
ALTER POLICY "mdm_api_products_tenant_policy" ON "master_data"."mdm_api_products" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_assets" RENAME TO "mdm_assets_tenant_policy";
ALTER POLICY "mdm_assets_tenant_policy" ON "master_data"."mdm_assets" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_audit_events" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_audit_events" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_audit_export_logs" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_audit_export_logs" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_auto_fix_actions" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_auto_fix_actions" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_bc_tests" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_bc_tests" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_change_events" RENAME TO "mdm_change_events_tenant_policy";
ALTER POLICY "mdm_change_events_tenant_policy" ON "master_data"."mdm_change_events" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_continuity_plans" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_continuity_plans" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_critical_functions" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_critical_functions" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_data_asset_categories" RENAME TO "mdm_data_asset_categories_tenant_policy";
ALTER POLICY "mdm_data_asset_categories_tenant_policy" ON "master_data"."mdm_data_asset_categories" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_data_contracts" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_data_contracts" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_data_permissions" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_data_permissions" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_data_products" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_data_products" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_dimension_scores" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_dimension_scores" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_failover_records" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_failover_records" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_fix_strategies" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_fix_strategies" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_governance_insights" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_governance_insights" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_governance_suggestions" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_governance_suggestions" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_graph_communities" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_graph_communities" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_graph_edges" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_graph_edges" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_graph_nodes" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_graph_nodes" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_impact_analyses" RENAME TO "mdm_impact_analyses_tenant_policy";
ALTER POLICY "mdm_impact_analyses_tenant_policy" ON "master_data"."mdm_impact_analyses" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_impact_simulations" RENAME TO "mdm_impact_simulations_tenant_policy";
ALTER POLICY "mdm_impact_simulations_tenant_policy" ON "master_data"."mdm_impact_simulations" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_improvement_plans" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_improvement_plans" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_interactions" RENAME TO "mdm_interactions_tenant_policy";
ALTER POLICY "mdm_interactions_tenant_policy" ON "master_data"."mdm_interactions" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_kg_edges" RENAME TO "mdm_kg_edges_tenant_policy";
ALTER POLICY "mdm_kg_edges_tenant_policy" ON "master_data"."mdm_kg_edges" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_kg_graphs" RENAME TO "mdm_kg_graphs_tenant_policy";
ALTER POLICY "mdm_kg_graphs_tenant_policy" ON "master_data"."mdm_kg_graphs" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_kg_nodes" RENAME TO "mdm_kg_nodes_tenant_policy";
ALTER POLICY "mdm_kg_nodes_tenant_policy" ON "master_data"."mdm_kg_nodes" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_lifecycle_history" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_lifecycle_history" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_lifecycle_policies" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_lifecycle_policies" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_lifecycle_stages" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_lifecycle_stages" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_lineage_edges" RENAME TO "mdm_lineage_edges_tenant_policy";
ALTER POLICY "mdm_lineage_edges_tenant_policy" ON "master_data"."mdm_lineage_edges" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_lineage_graphs" RENAME TO "mdm_lineage_graphs_tenant_policy";
ALTER POLICY "mdm_lineage_graphs_tenant_policy" ON "master_data"."mdm_lineage_graphs" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_lineage_nodes" RENAME TO "mdm_lineage_nodes_tenant_policy";
ALTER POLICY "mdm_lineage_nodes_tenant_policy" ON "master_data"."mdm_lineage_nodes" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_maturity_assessments" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_maturity_assessments" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_maturity_history" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_maturity_history" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_metadata_attributes" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_metadata_attributes" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_metadata_tags" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_metadata_tags" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_permission_roles" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_permission_roles" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_propagation_logs" RENAME TO "mdm_propagation_logs_tenant_policy";
ALTER POLICY "mdm_propagation_logs_tenant_policy" ON "master_data"."mdm_propagation_logs" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_propagation_rules" RENAME TO "mdm_propagation_rules_tenant_policy";
ALTER POLICY "mdm_propagation_rules_tenant_policy" ON "master_data"."mdm_propagation_rules" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_quality_checks" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_quality_checks" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_quality_loop_configs" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_quality_loop_configs" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_rate_cards" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_rate_cards" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_recommendations" RENAME TO "mdm_recommendations_tenant_policy";
ALTER POLICY "mdm_recommendations_tenant_policy" ON "master_data"."mdm_recommendations" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_recovery_plans" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_recovery_plans" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_recovery_points" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_recovery_points" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_region_configs" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_region_configs" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_replication_configs" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_replication_configs" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_search_history" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_search_history" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_search_indexes" RENAME TO "mdm_search_indexes_tenant_policy";
ALTER POLICY "mdm_search_indexes_tenant_policy" ON "master_data"."mdm_search_indexes" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_semantic_search_indexes" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_semantic_search_indexes" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_sla_configs" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_sla_configs" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_supplier_categories" RENAME TO "tenant_isolation_mdm_supplier_categories";
ALTER POLICY "tenant_isolation_mdm_supplier_categories" ON "master_data"."mdm_supplier_categories" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_suppliers" RENAME TO "tenant_isolation_mdm_suppliers";
ALTER POLICY "tenant_isolation_mdm_suppliers" ON "master_data"."mdm_suppliers" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_sync_dead_letter" RENAME TO "tenant_isolation_mdm_sync_dead_letter";
ALTER POLICY "tenant_isolation_mdm_sync_dead_letter" ON "master_data"."mdm_sync_dead_letter" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_tag_rules" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_tag_rules" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_tagged_entities" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_tagged_entities" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_tags" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_tags" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_user_role_assignments" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_user_role_assignments" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_v60_lineage_edges" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_v60_lineage_edges" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_v60_lineage_graphs" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_v60_lineage_graphs" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_v60_lineage_nodes" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_v60_lineage_nodes" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_uid = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_version_branches" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_version_branches" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_version_snapshots" RENAME TO "mdm_version_snapshots_tenant_policy";
ALTER POLICY "mdm_version_snapshots_tenant_policy" ON "master_data"."mdm_version_snapshots" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_workflow_history" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_workflow_history" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_workflow_templates" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_workflow_templates" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "master_data"."mdm_workflows" RENAME TO "tenant_isolation_policy";
ALTER POLICY "tenant_isolation_policy" ON "master_data"."mdm_workflows" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "plugin_finance"."accounting_subjects" RENAME TO "tenant_isolation_accounting_subjects";
ALTER POLICY "tenant_isolation_accounting_subjects" ON "plugin_finance"."accounting_subjects" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "plugin_finance"."difference_adjustments" RENAME TO "tenant_isolation_difference_adjustments";
ALTER POLICY "tenant_isolation_difference_adjustments" ON "plugin_finance"."difference_adjustments" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "plugin_finance"."reconciliation_item_snapshots" RENAME TO "tenant_isolation_reconciliation_item_snapshots";
ALTER POLICY "tenant_isolation_reconciliation_item_snapshots" ON "plugin_finance"."reconciliation_item_snapshots" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "plugin_finance"."reconciliation_settlement_links" RENAME TO "tenant_isolation_reconciliation_settlement_links";
ALTER POLICY "tenant_isolation_reconciliation_settlement_links" ON "plugin_finance"."reconciliation_settlement_links" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "plugin_finance"."reconciliation_snapshots" RENAME TO "tenant_isolation_reconciliation_snapshots";
ALTER POLICY "tenant_isolation_reconciliation_snapshots" ON "plugin_finance"."reconciliation_snapshots" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "plugin_finance"."settlement_snapshots" RENAME TO "tenant_isolation_settlement_snapshots";
ALTER POLICY "tenant_isolation_settlement_snapshots" ON "plugin_finance"."settlement_snapshots" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "portal"."portal_dashboard_stats" RENAME TO "tenant_isolation_portal_dashboard_stats";
ALTER POLICY "tenant_isolation_portal_dashboard_stats" ON "portal"."portal_dashboard_stats" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "portal"."portal_notifications" RENAME TO "tenant_isolation_portal_notifications";
ALTER POLICY "tenant_isolation_portal_notifications" ON "portal"."portal_notifications" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."_archive_core_workflow_instances" RENAME TO "tenant_isolation_core_workflow_instances";
ALTER POLICY "tenant_isolation_core_workflow_instances" ON "public"."_archive_core_workflow_instances" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_doc_documents" RENAME TO "tenant_isolation_core_doc_documents";
ALTER POLICY "tenant_isolation_core_doc_documents" ON "public"."core_doc_documents" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_doc_folders" RENAME TO "tenant_isolation_core_doc_folders";
ALTER POLICY "tenant_isolation_core_doc_folders" ON "public"."core_doc_folders" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_doc_templates" RENAME TO "tenant_isolation_core_doc_templates";
ALTER POLICY "tenant_isolation_core_doc_templates" ON "public"."core_doc_templates" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_emails" RENAME TO "tenant_isolation_core_emails";
ALTER POLICY "tenant_isolation_core_emails" ON "public"."core_emails" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_file_folders" RENAME TO "tenant_isolation_core_file_folders";
ALTER POLICY "tenant_isolation_core_file_folders" ON "public"."core_file_folders" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_finance_accounts" RENAME TO "tenant_isolation_core_finance_accounts";
ALTER POLICY "tenant_isolation_core_finance_accounts" ON "public"."core_finance_accounts" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_finance_vouchers" RENAME TO "tenant_isolation_core_finance_vouchers";
ALTER POLICY "tenant_isolation_core_finance_vouchers" ON "public"."core_finance_vouchers" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_flow_categories" RENAME TO "tenant_isolation_core_flow_categories";
ALTER POLICY "tenant_isolation_core_flow_categories" ON "public"."core_flow_categories" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_guide_lessons" RENAME TO "tenant_isolation_core_guide_lessons";
ALTER POLICY "tenant_isolation_core_guide_lessons" ON "public"."core_guide_lessons" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_guide_progress" RENAME TO "tenant_isolation_core_guide_progress";
ALTER POLICY "tenant_isolation_core_guide_progress" ON "public"."core_guide_progress" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_inter_module_sync" RENAME TO "tenant_isolation_core_inter_module_sync";
ALTER POLICY "tenant_isolation_core_inter_module_sync" ON "public"."core_inter_module_sync" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_master_data_change_log" RENAME TO "tenant_isolation_core_master_data_change_log";
ALTER POLICY "tenant_isolation_core_master_data_change_log" ON "public"."core_master_data_change_log" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_master_data_refs" RENAME TO "tenant_isolation_core_master_data_refs";
ALTER POLICY "tenant_isolation_core_master_data_refs" ON "public"."core_master_data_refs" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_mdm_approvals" RENAME TO "tenant_isolation_core_mdm_approvals";
ALTER POLICY "tenant_isolation_core_mdm_approvals" ON "public"."core_mdm_approvals" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_mdm_reconciliation_log" RENAME TO "tenant_isolation_core_mdm_reconciliation_log";
ALTER POLICY "tenant_isolation_core_mdm_reconciliation_log" ON "public"."core_mdm_reconciliation_log" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_migration_history" RENAME TO "tenant_isolation_core_migration_history";
ALTER POLICY "tenant_isolation_core_migration_history" ON "public"."core_migration_history" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_notification_templates" RENAME TO "tenant_isolation_core_notification_templates";
ALTER POLICY "tenant_isolation_core_notification_templates" ON "public"."core_notification_templates" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_notifications" RENAME TO "tenant_isolation_core_notifications";
ALTER POLICY "tenant_isolation_core_notifications" ON "public"."core_notifications" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_tenant_modules" RENAME TO "tenant_isolation_core_tenant_modules";
ALTER POLICY "tenant_isolation_core_tenant_modules" ON "public"."core_tenant_modules" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."core_tenant_usage" RENAME TO "tenant_isolation_core_tenant_usage";
ALTER POLICY "tenant_isolation_core_tenant_usage" ON "public"."core_tenant_usage" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."cqrs_events" RENAME TO "tenant_isolation_cqrs_events";
ALTER POLICY "tenant_isolation_cqrs_events" ON "public"."cqrs_events" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."crm_dashboard_snapshots" RENAME TO "tenant_isolation_crm_dashboard_snapshots";
ALTER POLICY "tenant_isolation_crm_dashboard_snapshots" ON "public"."crm_dashboard_snapshots" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."ehs_dashboard_snapshots" RENAME TO "tenant_isolation_ehs_dashboard_snapshots";
ALTER POLICY "tenant_isolation_ehs_dashboard_snapshots" ON "public"."ehs_dashboard_snapshots" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."finance_voucher_templates" RENAME TO "tenant_isolation_finance_voucher_templates";
ALTER POLICY "tenant_isolation_finance_voucher_templates" ON "public"."finance_voucher_templates" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."financial_reports" RENAME TO "tenant_isolation_financial_reports";
ALTER POLICY "tenant_isolation_financial_reports" ON "public"."financial_reports" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."hrm_dashboard_snapshots" RENAME TO "tenant_isolation_hrm_dashboard_snapshots";
ALTER POLICY "tenant_isolation_hrm_dashboard_snapshots" ON "public"."hrm_dashboard_snapshots" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."lims_dashboard_snapshots" RENAME TO "tenant_isolation_lims_dashboard_snapshots";
ALTER POLICY "tenant_isolation_lims_dashboard_snapshots" ON "public"."lims_dashboard_snapshots" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."pdm_change_notices" RENAME TO "tenant_isolation_pdm_change_notices";
ALTER POLICY "tenant_isolation_pdm_change_notices" ON "public"."pdm_change_notices" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."pdm_dashboard_snapshots" RENAME TO "tenant_isolation_pdm_dashboard_snapshots";
ALTER POLICY "tenant_isolation_pdm_dashboard_snapshots" ON "public"."pdm_dashboard_snapshots" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."pdm_materials" RENAME TO "tenant_isolation_pdm_materials";
ALTER POLICY "tenant_isolation_pdm_materials" ON "public"."pdm_materials" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."pdm_products" RENAME TO "tenant_isolation_pdm_products";
ALTER POLICY "tenant_isolation_pdm_products" ON "public"."pdm_products" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."search_entity_projections" RENAME TO "tenant_isolation_search_entity_projections";
ALTER POLICY "tenant_isolation_search_entity_projections" ON "public"."search_entity_projections" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "public"."wms_dashboard_snapshots" RENAME TO "tenant_isolation_wms_dashboard_snapshots";
ALTER POLICY "tenant_isolation_wms_dashboard_snapshots" ON "public"."wms_dashboard_snapshots" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "qms"."qa_alert_messages" RENAME TO "tenant_isolation_qa_alert_messages";
ALTER POLICY "tenant_isolation_qa_alert_messages" ON "qms"."qa_alert_messages" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "qms"."qa_alert_rules" RENAME TO "tenant_isolation_qa_alert_rules";
ALTER POLICY "tenant_isolation_qa_alert_rules" ON "qms"."qa_alert_rules" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "qms"."qa_approval_events" RENAME TO "tenant_isolation_qa_approval_events";
ALTER POLICY "tenant_isolation_qa_approval_events" ON "qms"."qa_approval_events" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "qms"."qa_apqp_phases" RENAME TO "tenant_isolation_qa_apqp_phases";
ALTER POLICY "tenant_isolation_qa_apqp_phases" ON "qms"."qa_apqp_phases" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "qms"."qa_apqp_projects" RENAME TO "tenant_isolation_qa_apqp_projects";
ALTER POLICY "tenant_isolation_qa_apqp_projects" ON "qms"."qa_apqp_projects" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "qms"."qa_apqp_risks" RENAME TO "tenant_isolation_qa_apqp_risks";
ALTER POLICY "tenant_isolation_qa_apqp_risks" ON "qms"."qa_apqp_risks" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "qms"."qa_apqp_tasks" RENAME TO "tenant_isolation_qa_apqp_tasks";
ALTER POLICY "tenant_isolation_qa_apqp_tasks" ON "qms"."qa_apqp_tasks" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "rs"."change_orders" RENAME TO "tenant_isolation_change_orders";
ALTER POLICY "tenant_isolation_change_orders" ON "rs"."change_orders" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "rs"."material_tests" RENAME TO "tenant_isolation_material_tests";
ALTER POLICY "tenant_isolation_material_tests" ON "rs"."material_tests" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "rs"."project_members" RENAME TO "tenant_isolation_project_members";
ALTER POLICY "tenant_isolation_project_members" ON "rs"."project_members" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "rs"."project_milestones" RENAME TO "tenant_isolation_project_milestones";
ALTER POLICY "tenant_isolation_project_milestones" ON "rs"."project_milestones" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "rs"."project_phases" RENAME TO "tenant_isolation_project_phases";
ALTER POLICY "tenant_isolation_project_phases" ON "rs"."project_phases" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "rs"."projects" RENAME TO "tenant_isolation_projects";
ALTER POLICY "tenant_isolation_projects" ON "rs"."projects" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "rs"."rs_experiments" RENAME TO "tenant_isolation_rs_experiments";
ALTER POLICY "tenant_isolation_rs_experiments" ON "rs"."rs_experiments" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "rs"."rs_formulas" RENAME TO "tenant_isolation_rs_formulas";
ALTER POLICY "tenant_isolation_rs_formulas" ON "rs"."rs_formulas" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "rs"."rs_projects" RENAME TO "tenant_isolation_rs_projects";
ALTER POLICY "tenant_isolation_rs_projects" ON "rs"."rs_projects" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "tms"."carriers" RENAME TO "tenant_isolation_carriers";
ALTER POLICY "tenant_isolation_carriers" ON "tms"."carriers" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
ALTER POLICY rls_tenant_isolation ON "tms"."drivers" RENAME TO "tenant_isolation_drivers";
ALTER POLICY "tenant_isolation_drivers" ON "tms"."drivers" USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));

-- 多策略表：删 canonical，逐条重建原策略
DROP POLICY rls_tenant_isolation ON "core"."ai_conversations";
CREATE POLICY "tenant_isolation_ai_conversations" ON "core"."ai_conversations" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "ai_conversations_tenant_isolation" ON "core"."ai_conversations" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY rls_tenant_isolation ON "master_data"."mdm_ai_models";
CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_ai_models" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_mdm_ai_models" ON "master_data"."mdm_ai_models" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY rls_tenant_isolation ON "master_data"."mdm_ai_suggestions";
CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_ai_suggestions" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_mdm_ai_suggestions" ON "master_data"."mdm_ai_suggestions" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY rls_tenant_isolation ON "master_data"."mdm_classification_models";
CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_classification_models" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_mdm_classification_models" ON "master_data"."mdm_classification_models" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY rls_tenant_isolation ON "master_data"."mdm_classification_results";
CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_classification_results" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_mdm_classification_results" ON "master_data"."mdm_classification_results" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY rls_tenant_isolation ON "master_data"."mdm_classifier_rules";
CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_classifier_rules" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_mdm_classifier_rules" ON "master_data"."mdm_classifier_rules" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY rls_tenant_isolation ON "master_data"."mdm_match_results";
CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_match_results" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_mdm_match_results" ON "master_data"."mdm_match_results" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY rls_tenant_isolation ON "master_data"."mdm_match_rules";
CREATE POLICY "tenant_isolation_policy" ON "master_data"."mdm_match_rules" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
CREATE POLICY "tenant_isolation_mdm_match_rules" ON "master_data"."mdm_match_rules" AS PERMISSIVE FOR ALL TO PUBLIC USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
