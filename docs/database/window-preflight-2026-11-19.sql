-- =============================================================================
-- 窗口前预检（只读）：TOPEMS 2026-11-19 两波窗口就绪包
-- 用法：
--   PGPASSFILE=$HOME/.pgpass psql "postgresql://topems_drift@127.0.0.1:5432/topems_prod" \
--     -f docs/database/window-preflight-2026-11-19.sql > preflight_$(date +%Y%m%d_%H%M%S).txt 2>&1
-- 说明：
--   * 以 topems_drift 非特权只读角色执行；不写生产。
--   * 目标清单（130000/131000）从迁移文件 v_targets/v_dropped 数组提取，内联在下方 TEMP 表中。
--   * 临时清单表只在会话内存在；构造阶段临时关闭 read-only，随后立即恢复。
--   * 表数据级断言（行数、NULL/零租户）topems_drift 无 schema USAGE，需 DBA 用特权只读会话执行
--     runbook §2.4 的 B 类清单。
-- =============================================================================
\set ON_ERROR_STOP on
SET default_transaction_read_only = on;
\pset pager off

\echo '== 0. 会话身份（必须是 topems_drift @ topems_prod，txn_read_only=on）=='
SELECT current_user, current_database(), inet_server_addr(),
       current_setting('transaction_read_only') AS txn_read_only;

\echo '== 1. 账本水位 =='
SELECT count(*) AS ledger_rows,
       max(version) AS max_version,
       count(*) FILTER (WHERE success) AS success_rows,
       count(*) FILTER (WHERE NOT success) AS failed_rows
FROM _sqlx_migrations;
SELECT version, success, installed_on
FROM _sqlx_migrations ORDER BY version DESC LIMIT 5;

\echo '== 2. 窗口 13 条是否已在生产账本（期望 0 行）=='
SELECT version, success FROM _sqlx_migrations
WHERE version IN (20261119010000,20261119100000,20261119110000,20261119120000,
                  20261119130000,20261119131000,20261119140000,20261119141000,
                  20261119150000,20261119151000,20261119160000,20261119161000,
                  20261119170000)
ORDER BY version;

\echo '== 3. 表 / RLS / 策略总数 =='
SELECT count(*) FILTER (WHERE c.relkind IN ('r','p')) AS tables_rp,
       count(*) FILTER (WHERE c.relkind = 'r') AS tables_r
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema');

SELECT count(*) FILTER (WHERE c.relrowsecurity) AS rls_enabled,
       count(*) FILTER (WHERE c.relforcerowsecurity) AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema');

SELECT count(*) AS policy_count FROM pg_policies
WHERE schemaname NOT IN ('pg_catalog','information_schema');

\echo '== 4. iam.core_tenant_plugins 状态（140000 前置）=='
SELECT c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname='iam' AND c.relname='core_tenant_plugins';

SELECT a.attname, a.attnotnull, format_type(a.atttypid,a.atttypmod) AS typ
FROM pg_attribute a
WHERE a.attrelid = (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='iam' AND c.relname='core_tenant_plugins') AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum;

SELECT policyname, cmd, qual, with_check FROM pg_policies
WHERE schemaname='iam' AND tablename='core_tenant_plugins' ORDER BY policyname;

SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
WHERE conrelid = (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='iam' AND c.relname='core_tenant_plugins') ORDER BY conname;

SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname='iam' AND tablename='core_tenant_plugins' ORDER BY indexname;

\echo '== 5. 第 1 波其余前置 =='
\echo '-- 5.1 iam.resource_permissions（20261119010000 前置）'
SELECT a.attname, a.attnotnull, format_type(a.atttypid,a.atttypmod) AS typ
FROM pg_attribute a
WHERE a.attrelid = (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='iam' AND c.relname='resource_permissions') AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum;
SELECT conname, pg_get_constraintdef(oid) AS def FROM pg_constraint
WHERE conrelid = (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='iam' AND c.relname='resource_permissions') ORDER BY conname;
SELECT indexname FROM pg_indexes
WHERE schemaname='iam' AND tablename='resource_permissions' ORDER BY indexname;
SELECT code FROM public.core_permissions WHERE code LIKE 'iam:resource_acl:%' ORDER BY code;

\echo '-- 5.2 erp.sales_orders / erp.sales_order_items（120000 前置）'
SELECT (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='erp' AND c.relname='sales_orders') AS sales_orders_present,
       (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='erp' AND c.relname='sales_order_items') AS sales_order_items_present;
SELECT c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='erp' AND c.relname='sales_orders';

-- 目标清单来自迁移文件自身的 v_targets / v_dropped 数组（提取命令见 runbook §2.3）
-- 临时清单表只在会话内存在，不写生产；构造期间关闭 read-only，构造完成后立即恢复。
SET default_transaction_read_only = off;
CREATE TEMP TABLE _pf_b1_targets(sch text, tbl text, legacy text);
INSERT INTO _pf_b1_targets(sch,tbl,legacy) VALUES
  ('bi','report_templates','tenant_isolation_report_templates'),
  ('communication','notification_channels','tenant_isolation_notification_channels'),
  ('crm','contacts','tenant_isolation_contacts'),
  ('crm','customer_finance','tenant_isolation_customer_finance'),
  ('crm','customer_tags','tenant_isolation_customer_tags'),
  ('crm','interactions','tenant_isolation_interactions'),
  ('crm','opportunities','tenant_isolation_opportunities'),
  ('crm','tags','tenant_isolation_tags'),
  ('erp','announcements','tenant_isolation_announcements'),
  ('erp','assets','tenant_isolation_assets'),
  ('erp','fin_reconciliations','tenant_isolation_fin_reconciliations'),
  ('erp','inventory','tenant_isolation_inventory'),
  ('erp','materials','tenant_isolation_materials'),
  ('erp','purchase_orders','tenant_isolation_purchase_orders'),
  ('erp','voucher_items','tenant_isolation_voucher_items'),
  ('hrm','attendance_records','tenant_isolation_attendance_records'),
  ('hrm','candidates','tenant_isolation_candidates'),
  ('hrm','companies','tenant_isolation_companies'),
  ('hrm','contract_renewals','tenant_isolation_contract_renewals'),
  ('hrm','contracts','tenant_isolation_contracts'),
  ('hrm','departments','tenant_isolation_departments'),
  ('hrm','employees','tenant_isolation_employees'),
  ('hrm','interviews','tenant_isolation_interviews'),
  ('hrm','job_openings','tenant_isolation_job_openings'),
  ('hrm','leave_records','tenant_isolation_leave_records'),
  ('hrm','payroll_details','tenant_isolation_payroll_details'),
  ('hrm','payroll_items','tenant_isolation_payroll_items'),
  ('hrm','payroll_records','tenant_isolation_payroll_records'),
  ('hrm','payroll_runs','tenant_isolation_payroll_runs'),
  ('hrm','performance_goals','tenant_isolation_performance_goals'),
  ('hrm','performance_records','tenant_isolation_performance_records'),
  ('hrm','performance_reviews','tenant_isolation_performance_reviews'),
  ('hrm','positions','tenant_isolation_positions'),
  ('hrm','recruitment_applications','tenant_isolation_recruitment_applications'),
  ('hrm','recruitment_records','tenant_isolation_recruitment_records'),
  ('hrm','salary_adjustments','tenant_isolation_salary_adjustments'),
  ('hrm','training_courses','tenant_isolation_training_courses'),
  ('hrm','training_participants','tenant_isolation_training_participants'),
  ('hrm','training_plans','tenant_isolation_training_plans'),
  ('hrm','training_records','tenant_isolation_training_records'),
  ('iam','permission_audit_logs','tenant_isolation_permission_audit_logs'),
  ('iam','position_permissions','tenant_isolation_position_permissions'),
  ('iam','position_roles','tenant_isolation_position_roles'),
  ('iam','positions','tenant_isolation_positions'),
  ('iam','resource_permissions','tenant_isolation_resource_permissions'),
  ('iam','user_positions','tenant_isolation_user_positions'),
  ('master_data','materials','tenant_isolation_materials'),
  ('master_data','samples','tenant_isolation_samples'),
  ('master_data','uoms','tenant_isolation_uoms'),
  ('public','_archive_core_workflow_versions','tenant_isolation_core_workflow_versions'),
  ('public','tenant_permissions','tenant_isolation_tenant_permissions'),
  ('qms','qa_audit_findings','tenant_isolation_qa_audit_findings'),
  ('qms','qa_audit_plans','tenant_isolation_qa_audit_plans'),
  ('qms','qa_audit_tasks','tenant_isolation_qa_audit_tasks'),
  ('qms','qa_corrective_action_items','tenant_isolation_qa_corrective_action_items'),
  ('qms','qa_corrective_actions','tenant_isolation_qa_corrective_actions'),
  ('qms','qa_eightd_audit_logs','tenant_isolation_qa_eightd_audit_logs'),
  ('qms','qa_eightd_reports','tenant_isolation_qa_eightd_reports'),
  ('qms','qa_fmea_analyses','tenant_isolation_qa_fmea_analyses'),
  ('qms','qa_fmea_items','tenant_isolation_qa_fmea_items'),
  ('qms','qa_inspection_audits','tenant_isolation_qa_inspection_audits'),
  ('qms','qa_inspection_results','tenant_isolation_qa_inspection_results'),
  ('qms','qa_qms_sync_records','tenant_isolation_qa_qms_sync_records'),
  ('qms','qa_quality_costs','tenant_isolation_qa_quality_costs'),
  ('qms','qa_quality_inspections','tenant_isolation_qa_quality_inspections'),
  ('qms','qa_quality_issues','tenant_isolation_qa_quality_issues'),
  ('qms','qa_spc_charts','tenant_isolation_qa_spc_charts'),
  ('qms','qa_spc_data_points','tenant_isolation_qa_spc_data_points'),
  ('qms','qa_standard_revisions','tenant_isolation_qa_standard_revisions'),
  ('qms','qa_standards','tenant_isolation_qa_standards'),
  ('rs','change_requests','tenant_isolation_change_requests')
;

CREATE TEMP TABLE _pf_b1_dropped(sch text, tbl text);
INSERT INTO _pf_b1_dropped(sch,tbl) VALUES
  ('erp','voucher_items'),
  ('hrm','payroll_records'),
  ('hrm','performance_records'),
  ('hrm','recruitment_applications'),
  ('hrm','recruitment_records'),
  ('hrm','training_participants'),
  ('public','tenant_permissions')
;

CREATE TEMP TABLE _pf_b2_targets(sch text, tbl text, legacy text, col text);
INSERT INTO _pf_b2_targets(sch,tbl,legacy,col) VALUES
  ('analytics','analytics_comparison_analyses','tenant_isolation_analytics_comparison_analyses','tenant_id'),
  ('analytics','analytics_comparison_results','tenant_isolation_analytics_comparison_results','tenant_id'),
  ('analytics','analytics_dashboard_shares','tenant_isolation_analytics_dashboard_shares','tenant_id'),
  ('analytics','analytics_dashboard_templates','tenant_isolation_analytics_dashboard_templates','tenant_id'),
  ('analytics','analytics_dashboards','tenant_isolation_analytics_dashboards','tenant_id'),
  ('analytics','analytics_datasources','tenant_isolation_analytics_datasources','tenant_id'),
  ('analytics','analytics_drilldown_history','tenant_isolation_analytics_drilldown_history','tenant_id'),
  ('analytics','analytics_drilldown_paths','tenant_isolation_analytics_drilldown_paths','tenant_id'),
  ('analytics','analytics_row_level_permissions','tenant_isolation_analytics_row_level_permissions','tenant_id'),
  ('analytics','analytics_self_service_reports','tenant_isolation_analytics_self_service_reports','tenant_id'),
  ('analytics','analytics_widgets','tenant_isolation_analytics_widgets','tenant_id'),
  ('bi','analytics_dashboards','tenant_isolation_analytics_dashboards','tenant_id'),
  ('bi','analytics_datasources','tenant_isolation_analytics_datasources','tenant_id'),
  ('bi','analytics_widgets','tenant_isolation_analytics_widgets','tenant_id'),
  ('communication','core_notification_deliveries','notification_deliveries_tenant_isolation','tenant_id'),
  ('communication','core_notification_preferences','notification_preferences_tenant_isolation','tenant_id'),
  ('communication','core_notification_subscriptions','notification_subscriptions_tenant_isolation','tenant_id'),
  ('core','ai_conversations','tenant_isolation_ai_conversations','ai_conversations_tenant_isolation'),
  ('core','ai_faqs','tenant_isolation_core_ai_faqs','tenant_id'),
  ('core','user_preferences','tenant_isolation_user_preferences','tenant_id'),
  ('crm','contracts','tenant_isolation_contracts','tenant_id'),
  ('crm','customer_recommendations','tenant_isolation_customer_recommendations','tenant_id'),
  ('crm','customer_segments','tenant_isolation_customer_segments','tenant_id'),
  ('erp','bank_accounts','tenant_isolation_bank_accounts','tenant_id'),
  ('erp','erp_production_orders','tenant_isolation','tenant_id'),
  ('erp','inventory_items','tenant_isolation_inventory_items','tenant_id'),
  ('hrm','hrm_cache_invalidation_logs','tenant_isolation','tenant_id'),
  ('hrm','initialization_status','tenant_isolation_initialization_status','tenant_id'),
  ('iam','data_permissions','tenant_isolation_data_permissions','tenant_id'),
  ('iam','permission_templates','tenant_isolation_permission_templates','tenant_id'),
  ('iam','tenant_users','tenant_isolation_tenant_users','tenant_id'),
  ('master_data','mdm_ai_models','tenant_isolation_policy','tenant_isolation_mdm_ai_models'),
  ('master_data','mdm_ai_suggestions','tenant_isolation_policy','tenant_isolation_mdm_ai_suggestions'),
  ('master_data','mdm_api_exposures','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_api_products','mdm_api_products_tenant_policy','tenant_id'),
  ('master_data','mdm_assets','mdm_assets_tenant_policy','tenant_id'),
  ('master_data','mdm_audit_events','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_audit_export_logs','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_auto_fix_actions','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_bc_tests','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_change_events','mdm_change_events_tenant_policy','tenant_id'),
  ('master_data','mdm_classification_models','tenant_isolation_policy','tenant_isolation_mdm_classification_models'),
  ('master_data','mdm_classification_results','tenant_isolation_policy','tenant_isolation_mdm_classification_results'),
  ('master_data','mdm_classifier_rules','tenant_isolation_policy','tenant_isolation_mdm_classifier_rules'),
  ('master_data','mdm_continuity_plans','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_critical_functions','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_data_asset_categories','mdm_data_asset_categories_tenant_policy','tenant_id'),
  ('master_data','mdm_data_contracts','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_data_permissions','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_data_products','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_dimension_scores','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_failover_records','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_fix_strategies','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_governance_insights','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_governance_suggestions','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_graph_communities','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_graph_edges','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_graph_nodes','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_impact_analyses','mdm_impact_analyses_tenant_policy','tenant_id'),
  ('master_data','mdm_impact_simulations','mdm_impact_simulations_tenant_policy','tenant_id'),
  ('master_data','mdm_improvement_plans','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_interactions','mdm_interactions_tenant_policy','tenant_id'),
  ('master_data','mdm_kg_edges','mdm_kg_edges_tenant_policy','tenant_id'),
  ('master_data','mdm_kg_graphs','mdm_kg_graphs_tenant_policy','tenant_id'),
  ('master_data','mdm_kg_nodes','mdm_kg_nodes_tenant_policy','tenant_id'),
  ('master_data','mdm_lifecycle_history','tenant_isolation_policy','tenant_uid'),
  ('master_data','mdm_lifecycle_policies','tenant_isolation_policy','tenant_uid'),
  ('master_data','mdm_lifecycle_stages','tenant_isolation_policy','tenant_uid'),
  ('master_data','mdm_lineage_edges','mdm_lineage_edges_tenant_policy','tenant_id'),
  ('master_data','mdm_lineage_graphs','mdm_lineage_graphs_tenant_policy','tenant_id'),
  ('master_data','mdm_lineage_nodes','mdm_lineage_nodes_tenant_policy','tenant_id'),
  ('master_data','mdm_match_results','tenant_isolation_policy','tenant_isolation_mdm_match_results'),
  ('master_data','mdm_match_rules','tenant_isolation_policy','tenant_isolation_mdm_match_rules'),
  ('master_data','mdm_maturity_assessments','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_maturity_history','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_metadata_attributes','tenant_isolation_policy','tenant_uid'),
  ('master_data','mdm_metadata_tags','tenant_isolation_policy','tenant_uid'),
  ('master_data','mdm_permission_roles','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_propagation_logs','mdm_propagation_logs_tenant_policy','tenant_id'),
  ('master_data','mdm_propagation_rules','mdm_propagation_rules_tenant_policy','tenant_id'),
  ('master_data','mdm_quality_checks','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_quality_loop_configs','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_rate_cards','tenant_isolation_policy','tenant_uid'),
  ('master_data','mdm_recommendations','mdm_recommendations_tenant_policy','tenant_id'),
  ('master_data','mdm_recovery_plans','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_recovery_points','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_region_configs','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_replication_configs','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_search_history','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_search_indexes','mdm_search_indexes_tenant_policy','tenant_id'),
  ('master_data','mdm_semantic_search_indexes','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_sla_configs','tenant_isolation_policy','tenant_uid'),
  ('master_data','mdm_supplier_categories','tenant_isolation_mdm_supplier_categories','tenant_id'),
  ('master_data','mdm_suppliers','tenant_isolation_mdm_suppliers','tenant_id'),
  ('master_data','mdm_sync_dead_letter','tenant_isolation_mdm_sync_dead_letter','tenant_id'),
  ('master_data','mdm_tag_rules','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_tagged_entities','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_tags','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_user_role_assignments','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_v60_lineage_edges','tenant_isolation_policy','tenant_uid'),
  ('master_data','mdm_v60_lineage_graphs','tenant_isolation_policy','tenant_uid'),
  ('master_data','mdm_v60_lineage_nodes','tenant_isolation_policy','tenant_uid'),
  ('master_data','mdm_version_branches','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_version_snapshots','mdm_version_snapshots_tenant_policy','tenant_id'),
  ('master_data','mdm_workflow_history','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_workflow_templates','tenant_isolation_policy','tenant_id'),
  ('master_data','mdm_workflows','tenant_isolation_policy','tenant_id'),
  ('plugin_finance','accounting_subjects','tenant_isolation_accounting_subjects','tenant_id'),
  ('plugin_finance','difference_adjustments','tenant_isolation_difference_adjustments','tenant_id'),
  ('plugin_finance','reconciliation_item_snapshots','tenant_isolation_reconciliation_item_snapshots','tenant_id'),
  ('plugin_finance','reconciliation_settlement_links','tenant_isolation_reconciliation_settlement_links','tenant_id'),
  ('plugin_finance','reconciliation_snapshots','tenant_isolation_reconciliation_snapshots','tenant_id'),
  ('plugin_finance','settlement_snapshots','tenant_isolation_settlement_snapshots','tenant_id'),
  ('portal','portal_dashboard_stats','tenant_isolation_portal_dashboard_stats','tenant_id'),
  ('portal','portal_notifications','tenant_isolation_portal_notifications','tenant_id'),
  ('public','_archive_core_workflow_instances','tenant_isolation_core_workflow_instances','tenant_id'),
  ('public','core_doc_documents','tenant_isolation_core_doc_documents','tenant_id'),
  ('public','core_doc_folders','tenant_isolation_core_doc_folders','tenant_id'),
  ('public','core_doc_templates','tenant_isolation_core_doc_templates','tenant_id'),
  ('public','core_emails','tenant_isolation_core_emails','tenant_id'),
  ('public','core_file_folders','tenant_isolation_core_file_folders','tenant_id'),
  ('public','core_finance_accounts','tenant_isolation_core_finance_accounts','tenant_id'),
  ('public','core_finance_vouchers','tenant_isolation_core_finance_vouchers','tenant_id'),
  ('public','core_flow_categories','tenant_isolation_core_flow_categories','tenant_id'),
  ('public','core_guide_lessons','tenant_isolation_core_guide_lessons','tenant_id'),
  ('public','core_guide_progress','tenant_isolation_core_guide_progress','tenant_id'),
  ('public','core_inter_module_sync','tenant_isolation_core_inter_module_sync','tenant_id'),
  ('public','core_master_data_change_log','tenant_isolation_core_master_data_change_log','tenant_id'),
  ('public','core_master_data_refs','tenant_isolation_core_master_data_refs','tenant_id'),
  ('public','core_mdm_approvals','tenant_isolation_core_mdm_approvals','tenant_id'),
  ('public','core_mdm_reconciliation_log','tenant_isolation_core_mdm_reconciliation_log','tenant_id'),
  ('public','core_migration_history','tenant_isolation_core_migration_history','tenant_id'),
  ('public','core_notification_templates','tenant_isolation_core_notification_templates','tenant_id'),
  ('public','core_notifications','tenant_isolation_core_notifications','tenant_id'),
  ('public','core_tenant_modules','tenant_isolation_core_tenant_modules','tenant_id'),
  ('public','core_tenant_usage','tenant_isolation_core_tenant_usage','tenant_id'),
  ('public','cqrs_events','tenant_isolation_cqrs_events','tenant_id'),
  ('public','crm_dashboard_snapshots','tenant_isolation_crm_dashboard_snapshots','tenant_id'),
  ('public','ehs_dashboard_snapshots','tenant_isolation_ehs_dashboard_snapshots','tenant_id'),
  ('public','finance_voucher_templates','tenant_isolation_finance_voucher_templates','tenant_id'),
  ('public','financial_reports','tenant_isolation_financial_reports','tenant_id'),
  ('public','hrm_dashboard_snapshots','tenant_isolation_hrm_dashboard_snapshots','tenant_id'),
  ('public','lims_dashboard_snapshots','tenant_isolation_lims_dashboard_snapshots','tenant_id'),
  ('public','pdm_change_notices','tenant_isolation_pdm_change_notices','tenant_id'),
  ('public','pdm_dashboard_snapshots','tenant_isolation_pdm_dashboard_snapshots','tenant_id'),
  ('public','pdm_materials','tenant_isolation_pdm_materials','tenant_id'),
  ('public','pdm_products','tenant_isolation_pdm_products','tenant_id'),
  ('public','search_entity_projections','tenant_isolation_search_entity_projections','tenant_id'),
  ('public','wms_dashboard_snapshots','tenant_isolation_wms_dashboard_snapshots','tenant_id'),
  ('qms','qa_alert_messages','tenant_isolation_qa_alert_messages','tenant_id'),
  ('qms','qa_alert_rules','tenant_isolation_qa_alert_rules','tenant_id'),
  ('qms','qa_approval_events','tenant_isolation_qa_approval_events','tenant_id'),
  ('qms','qa_apqp_phases','tenant_isolation_qa_apqp_phases','tenant_id'),
  ('qms','qa_apqp_projects','tenant_isolation_qa_apqp_projects','tenant_id'),
  ('qms','qa_apqp_risks','tenant_isolation_qa_apqp_risks','tenant_id'),
  ('qms','qa_apqp_tasks','tenant_isolation_qa_apqp_tasks','tenant_id'),
  ('rs','change_orders','tenant_isolation_change_orders','tenant_id'),
  ('rs','material_tests','tenant_isolation_material_tests','tenant_id'),
  ('rs','project_members','tenant_isolation_project_members','tenant_id'),
  ('rs','project_milestones','tenant_isolation_project_milestones','tenant_id'),
  ('rs','project_phases','tenant_isolation_project_phases','tenant_id'),
  ('rs','projects','tenant_isolation_projects','tenant_id'),
  ('rs','rs_experiments','tenant_isolation_rs_experiments','tenant_id'),
  ('rs','rs_formulas','tenant_isolation_rs_formulas','tenant_id'),
  ('rs','rs_projects','tenant_isolation_rs_projects','tenant_id'),
  ('tms','carriers','tenant_isolation_carriers','tenant_id'),
  ('tms','drivers','tenant_isolation_drivers','tenant_id')
;

CREATE TEMP TABLE _pf_b2_dropped(sch text, tbl text);
INSERT INTO _pf_b2_dropped(sch,tbl) VALUES
  ('public','core_file_folders'),
  ('public','core_finance_vouchers'),
  ('public','core_guide_lessons'),
  ('public','core_guide_progress'),
  ('public','core_inter_module_sync'),
  ('public','core_mdm_reconciliation_log'),
  ('public','cqrs_events'),
  ('public','crm_dashboard_snapshots'),
  ('public','ehs_dashboard_snapshots'),
  ('public','finance_voucher_templates'),
  ('public','financial_reports'),
  ('public','hrm_dashboard_snapshots'),
  ('public','lims_dashboard_snapshots'),
  ('public','pdm_change_notices'),
  ('public','pdm_dashboard_snapshots'),
  ('public','pdm_materials'),
  ('public','pdm_products'),
  ('public','wms_dashboard_snapshots'),
  ('tms','carriers'),
  ('tms','drivers')
;

-- 第 2 波：批 1 的 19 张（20261119100000）
CREATE TEMP TABLE _pf_batch1(sch text, tbl text);
INSERT INTO _pf_batch1(sch,tbl) VALUES
  ('crm','crm_master_data_refs'), ('mes','dashboard_stats'), ('mes','financial_records'),
  ('mes','material_requirement_items'), ('mes','supply_chain_orders'),
  ('mobile','mobile_leave_applications'), ('pm','acceptances'), ('pm','documents'),
  ('pm','pm_master_data_refs'), ('pm','service_integrations'), ('rs','equipment'),
  ('rs','equipment_inspections'), ('rs','equipment_maintenance_records'),
  ('shared','audit_logs'), ('tms','carriers'), ('tms','drivers'),
  ('wms','transfer_items'), ('wms','transfers'), ('wms','wms_master_data_refs');

-- 第 2 波：零路径 16 张（20261119160000）
CREATE TEMP TABLE _pf_zero(sch text, tbl text);
INSERT INTO _pf_zero(sch,tbl) VALUES
  ('doc','document_versions'), ('doc','documents'), ('doc','folders'), ('doc','templates'),
  ('doc_service','archives'), ('doc_service','files'), ('doc_service','folders'), ('doc_service','templates'),
  ('flow','notifications'), ('flow','workflows'), ('iam','permissions'),
  ('mail','emails'), ('mail','templates'), ('notification','notifications'),
  ('report','reports'), ('storage','files');

SET default_transaction_read_only = on;

\echo '-- 5.3 归一 batch1（20261119130000）：71 张目标前置读数'
SELECT count(*) AS targets,
       count(*) FILTER (WHERE present) AS present,
       count(*) FILTER (WHERE NOT present AND known_dropped) AS missing_known_dropped,
       count(*) FILTER (WHERE NOT present AND NOT known_dropped) AS missing_unexpected,
       count(*) FILTER (WHERE present AND pols = 2) AS ok_two_policies,
       count(*) FILTER (WHERE present AND pols <> 2) AS bad_policy_count
FROM (
  SELECT t.sch, t.tbl,
         EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=t.sch AND c.relname=t.tbl) AS present,
         (SELECT count(*) FROM pg_policies p WHERE p.schemaname=t.sch AND p.tablename=t.tbl) AS pols,
         EXISTS (SELECT 1 FROM _pf_b1_dropped d WHERE d.sch=t.sch AND d.tbl=t.tbl) AS known_dropped
  FROM _pf_b1_targets t
) x;

SELECT sch, tbl, pols AS policy_count
FROM (
  SELECT t.sch, t.tbl,
         EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=t.sch AND c.relname=t.tbl) AS present,
         (SELECT count(*) FROM pg_policies p WHERE p.schemaname=t.sch AND p.tablename=t.tbl) AS pols
  FROM _pf_b1_targets t
) x
WHERE present AND pols <> 2 ORDER BY 1,2;

\echo '-- 5.4 归一 batch2（20261119131000）：167 张目标前置读数'
SELECT count(*) AS targets,
       count(*) FILTER (WHERE present) AS present,
       count(*) FILTER (WHERE NOT present AND known_dropped) AS missing_known_dropped,
       count(*) FILTER (WHERE NOT present AND NOT known_dropped) AS missing_unexpected
FROM (
  SELECT t.sch, t.tbl,
         EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=t.sch AND c.relname=t.tbl) AS present,
         EXISTS (SELECT 1 FROM _pf_b2_dropped d WHERE d.sch=t.sch AND d.tbl=t.tbl) AS known_dropped
  FROM _pf_b2_targets t
) x;

SELECT pols AS policy_count, count(*) AS tables
FROM (
  SELECT t.sch, t.tbl,
         (SELECT count(*) FROM pg_policies p WHERE p.schemaname=t.sch AND p.tablename=t.tbl) AS pols
  FROM _pf_b2_targets t
  WHERE EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=t.sch AND c.relname=t.tbl)
) x
GROUP BY 1 ORDER BY 1;

SELECT sch, tbl, pols AS policy_count
FROM (
  SELECT t.sch, t.tbl,
         (SELECT count(*) FROM pg_policies p WHERE p.schemaname=t.sch AND p.tablename=t.tbl) AS pols
  FROM _pf_b2_targets t
  WHERE EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=t.sch AND c.relname=t.tbl)
) x
WHERE pols NOT IN (1,2) ORDER BY 1,2;

\echo '-- 5.5 pdm.pdm_master_data_refs（150000 前置）'
SELECT a.attname, a.attnotnull FROM pg_attribute a
WHERE a.attrelid = (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='pdm' AND c.relname='pdm_master_data_refs') AND a.attnum > 0 AND NOT a.attisdropped
  AND a.attname = 'tenant_id';
SELECT policyname, cmd, qual, with_check FROM pg_policies
WHERE schemaname='pdm' AND tablename='pdm_master_data_refs' ORDER BY policyname;

\echo '-- 5.6 mobile.oa_announcement_reads（151000 前置）'
SELECT (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='oa_announcement_reads') AS tbl;
SELECT a.attname, a.attnotnull, format_type(a.atttypid,a.atttypmod) AS typ
FROM pg_attribute a
WHERE a.attrelid = (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mobile' AND c.relname='oa_announcement_reads') AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY a.attnum;
SELECT policyname, cmd, qual, with_check FROM pg_policies
WHERE schemaname='mobile' AND tablename='oa_announcement_reads';

\echo '-- 5.7 审计守卫（20261119141000 前置）'
SELECT schemaname, tablename, policyname, cmd, qual, with_check FROM pg_policies
WHERE (schemaname='public' AND tablename='core_login_logs')
   OR (tablename IN ('audit_logs','audit_log') AND schemaname IN ('bi','flow','gis','iam','qms','shared'))
ORDER BY schemaname, tablename, policyname;
SELECT count(*) AS core_login_logs_policies FROM pg_policies
WHERE schemaname='public' AND tablename='core_login_logs';

\echo '-- 5.8 插件分类种子（20261119170000 前置）'
SELECT (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugin_categories') AS tbl;

\echo '== 6. 第 2 波前置读数 =='
\echo '-- 6.1 死表批 1：19 张现状（期望 present=19 / missing=0）'
SELECT count(*) AS expected,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=t.sch AND c.relname=t.tbl)) AS present,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=t.sch AND c.relname=t.tbl)) AS missing
FROM _pf_batch1 t;
SELECT sch, tbl FROM _pf_batch1 t
WHERE NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=t.sch AND c.relname=t.tbl) ORDER BY 1,2;

\echo '-- 6.2 零路径 16 张现状（期望 present=16 / missing=0）'
SELECT count(*) AS expected,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=t.sch AND c.relname=t.tbl)) AS present,
       count(*) FILTER (WHERE NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=t.sch AND c.relname=t.tbl)) AS missing
FROM _pf_zero t;
SELECT sch, tbl FROM _pf_zero t
WHERE NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=t.sch AND c.relname=t.tbl) ORDER BY 1,2;

\echo '-- 6.3 零路径 16 张：出入向 FK / 依赖视图（期望 0 / 0）'
SELECT count(*) AS inbound_fks
FROM pg_constraint k
JOIN pg_class tc ON tc.oid=k.confrelid JOIN pg_namespace tn ON tn.oid=tc.relnamespace
JOIN _pf_zero z ON z.sch=tn.nspname AND z.tbl=tc.relname
WHERE k.contype='f';

SELECT count(DISTINCT v.oid) AS dependent_views
FROM pg_depend d
JOIN pg_rewrite rw ON rw.oid=d.objid
JOIN pg_class v ON v.oid=rw.ev_class
JOIN pg_class t ON t.oid=d.refobjid JOIN pg_namespace tn ON tn.oid=t.relnamespace
JOIN _pf_zero z ON z.sch=tn.nspname AND z.tbl=t.relname
WHERE v.relkind IN ('v','m') AND v.oid <> t.oid;

\echo '-- 6.3a 死表批 1：入向 FK / 依赖视图（视图随表 DROP，回滚按 _view_snapshot 重建）'
SELECT count(*) AS inbound_fks
FROM pg_constraint k
JOIN pg_class tc ON tc.oid=k.confrelid JOIN pg_namespace tn ON tn.oid=tc.relnamespace
JOIN _pf_batch1 z ON z.sch=tn.nspname AND z.tbl=tc.relname
WHERE k.contype='f';

SELECT DISTINCT vn.nspname AS view_schema, v.relname AS view_name, v.relkind::text AS kind
FROM pg_depend d
JOIN pg_rewrite rw ON rw.oid=d.objid
JOIN pg_class v ON v.oid=rw.ev_class JOIN pg_namespace vn ON vn.oid=v.relnamespace
JOIN pg_class t ON t.oid=d.refobjid JOIN pg_namespace tn ON tn.oid=t.relnamespace
JOIN _pf_batch1 z ON z.sch=tn.nspname AND z.tbl=t.relname
WHERE v.relkind IN ('v','m') AND v.oid <> t.oid
ORDER BY 1,2;

\echo '-- 6.4 保留表 3 张现状（161000 前置）'
SELECT schemaname, tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE (schemaname, tablename) IN (VALUES
  ('core','core_tenant_plugins'), ('portal','user_preferences'), ('iam','roles'))
ORDER BY schemaname, tablename, policyname;

SELECT n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE (n.nspname, c.relname) IN (VALUES
  ('core','core_tenant_plugins'), ('portal','user_preferences'), ('iam','roles'))
ORDER BY 1,2;

\echo '-- 6.5 归档 schema 现状（第 2 波会写入）'
SELECT (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='archive' AND c.relname='_drop_manifest') AS drop_manifest,
       (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='archive' AND c.relname='_rls_policy_snapshot') AS rls_snapshot,
       (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='archive' AND c.relname='_fk_snapshot') AS fk_snapshot,
       (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='archive' AND c.relname='_view_snapshot') AS view_snapshot;
SELECT count(*) AS archive_tables FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='archive' AND c.relkind='r';
