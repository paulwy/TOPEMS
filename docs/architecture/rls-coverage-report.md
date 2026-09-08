# RLS 数据权限覆盖报告（RLS Coverage Report）

> 由 `scripts/check-rls-coverage.py` 自动生成 · 生成日期：2026-09-08

**扫描范围**：116 个 SQL 文件，共 234 张 CREATE TABLE。
**已启用 RLS**：10 张表。
**未显式启用**：234 张表（其中粗判为业务实体 201 张、系统类 33 张，需逐表确认）。

## 已启用 RLS 的表

- `public.equipment_status`
- `public.flow_approval_tasks`
- `public.inventory_transactions`
- `public.notifications_extended`
- `public.production_records`
- `public.quality_inspections`
- `public.wip`
- `public.work_orders`
- `public.work_reports`
- `public.workflow_notifications`

## 未启用 RLS 的表（按 schema 分组，需逐表判定）

| 表 | 粗分类 | 来源文件 |
|---|---|---|
| `IF` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `ai.user_profiles` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `ai.vectors` | business | /Users/air/TOPEMS/database/migrations/20260831190900_ai_vectors_schema.sql |
| `audio_recordings` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `audit_logs_2026_07` | system | /Users/air/TOPEMS/database/postgres/partitions/001_audit_logs_partition.sql |
| `audit_logs_2026_08` | system | /Users/air/TOPEMS/database/postgres/partitions/001_audit_logs_partition.sql |
| `audit_logs_2026_09` | system | /Users/air/TOPEMS/database/postgres/partitions/001_audit_logs_partition.sql |
| `audit_logs_2026_10` | system | /Users/air/TOPEMS/database/postgres/partitions/001_audit_logs_partition.sql |
| `audit_logs_2026_11` | system | /Users/air/TOPEMS/database/postgres/partitions/001_audit_logs_partition.sql |
| `audit_logs_2026_12` | system | /Users/air/TOPEMS/database/postgres/partitions/001_audit_logs_partition.sql |
| `audit_logs_2027_01` | system | /Users/air/TOPEMS/database/postgres/partitions/001_audit_logs_partition.sql |
| `audit_logs_2027_02` | system | /Users/air/TOPEMS/database/postgres/partitions/001_audit_logs_partition.sql |
| `audit_logs_2027_03` | system | /Users/air/TOPEMS/database/postgres/partitions/001_audit_logs_partition.sql |
| `audit_logs_2027_04` | system | /Users/air/TOPEMS/database/postgres/partitions/001_audit_logs_partition.sql |
| `audit_logs_2027_05` | system | /Users/air/TOPEMS/database/postgres/partitions/001_audit_logs_partition.sql |
| `audit_logs_2027_06` | system | /Users/air/TOPEMS/database/postgres/partitions/001_audit_logs_partition.sql |
| `barcode_scans` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `core.core_plugin_navigation` | business | /Users/air/TOPEMS/database/migrations/20260908000001_plugin_core_schema_guard.sql |
| `core.knowledge_bases` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `core.knowledge_chunks` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `core.knowledge_documents` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `core.knowledge_qa_history` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `core_billing_invoices` | business | /Users/air/TOPEMS/database/migrations/010-billing.sql |
| `core_billing_plans` | business | /Users/air/TOPEMS/database/migrations/010-billing.sql |
| `core_chat_members` | business | /Users/air/TOPEMS/database/migrations/007-communication.sql |
| `core_chat_messages` | business | /Users/air/TOPEMS/database/migrations/007-communication.sql |
| `core_chat_rooms` | business | /Users/air/TOPEMS/database/migrations/007-communication.sql |
| `core_dashboard_refresh_log` | business | /Users/air/TOPEMS/database/migrations/20260724000003_create_dashboard_tables.sql |
| `core_dict_items` | system | /Users/air/TOPEMS/database/migrations/004-dict.sql |
| `core_dict_types` | system | /Users/air/TOPEMS/database/migrations/004-dict.sql |
| `core_email_queue` | business | /Users/air/TOPEMS/database/migrations/007-communication.sql |
| `core_email_templates` | system | /Users/air/TOPEMS/database/migrations/007-communication.sql |
| `core_emails` | business | /Users/air/TOPEMS/database/migrations/007-communication.sql |
| `core_faqs` | business | /Users/air/TOPEMS/database/migrations/005-help.sql |
| `core_file_folders` | business | /Users/air/TOPEMS/database/migrations/008-file.sql |
| `core_files` | business | /Users/air/TOPEMS/database/migrations/008-file.sql |
| `core_guide_lessons` | business | /Users/air/TOPEMS/database/migrations/005-help.sql |
| `core_guide_progress` | business | /Users/air/TOPEMS/database/migrations/005-help.sql |
| `core_guides` | business | /Users/air/TOPEMS/database/migrations/005-help.sql |
| `core_infra.audit_logs_partitioned` | system | /Users/air/TOPEMS/database/postgres/partitions/001_audit_logs_partition.sql |
| `core_inter_module_sync` | business | /Users/air/TOPEMS/database/migrations/009-sync.sql |
| `core_login_logs` | system | /Users/air/TOPEMS/database/migrations/013-login-log.sql |
| `core_menu_groups` | business | /Users/air/TOPEMS/database/migrations/012-menu.sql |
| `core_menus` | business | /Users/air/TOPEMS/database/migrations/012-menu.sql |
| `core_migration_history` | system | /Users/air/TOPEMS/database/migrations/011-migration.sql |
| `core_mobile_offline_records` | business | /Users/air/TOPEMS/database/migrations/009-sync.sql |
| `core_notification_templates` | system | /Users/air/TOPEMS/database/migrations/007-communication.sql |
| `core_notifications` | business | /Users/air/TOPEMS/database/migrations/007-communication.sql |
| `core_permissions` | business | /Users/air/TOPEMS/database/init/03_init_permissions.sql |
| `core_plugin_categories` | business | /Users/air/TOPEMS/database/migrations/003-plugin.sql |
| `core_plugin_instances` | business | /Users/air/TOPEMS/database/migrations/003-plugin.sql |
| `core_plugin_permissions` | business | /Users/air/TOPEMS/database/migrations/003-plugin.sql |
| `core_plugin_pricing` | business | /Users/air/TOPEMS/database/migrations/010-billing.sql |
| `core_plugin_reviews` | business | /Users/air/TOPEMS/database/migrations/003-plugin.sql |
| `core_plugin_versions` | system | /Users/air/TOPEMS/database/migrations/003-plugin.sql |
| `core_plugins` | business | /Users/air/TOPEMS/database/migrations/003-plugin.sql |
| `core_role_permissions` | business | /Users/air/TOPEMS/database/init/03_init_permissions.sql |
| `core_roles` | business | /Users/air/TOPEMS/database/init/03_init_permissions.sql |
| `core_subscriptions` | business | /Users/air/TOPEMS/database/migrations/010-billing.sql |
| `core_tenant_modules` | business | /Users/air/TOPEMS/database/migrations/002-tenant.sql |
| `core_tenant_plugins` | business | /Users/air/TOPEMS/database/migrations/003-plugin.sql |
| `core_tenant_settings` | system | /Users/air/TOPEMS/database/migrations/002-tenant.sql |
| `core_tenant_usage` | business | /Users/air/TOPEMS/database/migrations/002-tenant.sql |
| `core_tenant_users` | business | /Users/air/TOPEMS/database/migrations/002-tenant.sql |
| `core_tenants` | business | /Users/air/TOPEMS/database/migrations/002-tenant.sql |
| `core_usage_records` | business | /Users/air/TOPEMS/database/migrations/010-billing.sql |
| `core_user_roles` | business | /Users/air/TOPEMS/database/init/03_init_permissions.sql |
| `core_users` | business | /Users/air/TOPEMS/database/init/03_init_permissions.sql |
| `core_workflow_instances` | business | /Users/air/TOPEMS/database/migrations/006-flow.sql |
| `core_workflow_tasks` | business | /Users/air/TOPEMS/database/migrations/006-flow.sql |
| `core_workflows` | business | /Users/air/TOPEMS/database/migrations/006-flow.sql |
| `crm.billing_records` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm.contacts` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm.customer_orders` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm.customer_recommendations` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm.customer_scores` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm.customer_segments` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm.customer_tags` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm.customers` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm.interactions` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm.opportunities` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm.return_items` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm.returns` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm.rfm_results` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm.sales_forecasts` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm.sales_orders` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm.tags` | business | /Users/air/TOPEMS/database/migrations/20260908000006_crm_datalayer.sql |
| `crm_dashboard_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260724000003_create_dashboard_tables.sql |
| `dashboard_stats` | business | /Users/air/TOPEMS/database/migrations/20260907000001_erp_public_business_tables.sql |
| `defect_records` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `devices` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `dynamic_data` | business | /Users/air/TOPEMS/database/migrations/20260725000001_create_schema_registry.sql |
| `ehs.qa_ehs_alerts` | business | /Users/air/TOPEMS/database/migrations/20260831191100_ehs_alerts.sql |
| `ehs_dashboard_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260724000003_create_dashboard_tables.sql |
| `equipment` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `erp.account_balances` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `erp.announcements` | business | /Users/air/TOPEMS/database/migrations/20260907000001_erp_public_business_tables.sql |
| `erp.asset_categories` | business | /Users/air/TOPEMS/database/migrations/20260908000002_erp_bank_accounts_asset_categories.sql |
| `erp.bank_accounts` | business | /Users/air/TOPEMS/database/migrations/20260908000002_erp_bank_accounts_asset_categories.sql |
| `erp.documents` | business | /Users/air/TOPEMS/database/migrations/20260907000001_erp_public_business_tables.sql |
| `erp.meeting_bookings` | business | /Users/air/TOPEMS/database/migrations/20260907000001_erp_public_business_tables.sql |
| `erp.meeting_rooms` | business | /Users/air/TOPEMS/database/migrations/20260907000001_erp_public_business_tables.sql |
| `erp.office_supplies` | business | /Users/air/TOPEMS/database/migrations/20260907000001_erp_public_business_tables.sql |
| `erp.vehicle_requests` | business | /Users/air/TOPEMS/database/migrations/20260907000001_erp_public_business_tables.sql |
| `erp.vehicles` | business | /Users/air/TOPEMS/database/migrations/20260907000001_erp_public_business_tables.sql |
| `erp.vouchers` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `finance.reconcile_items` | business | /Users/air/TOPEMS/database/migrations/20260908000005_finance_reconcile_orders.sql |
| `finance.reconcile_orders` | business | /Users/air/TOPEMS/database/migrations/20260908000005_finance_reconcile_orders.sql |
| `finance.voucher_lines` | business | /Users/air/TOPEMS/database/migrations/20260908000011_cross_schema_bare_tables.sql |
| `finance.vouchers` | business | /Users/air/TOPEMS/database/migrations/20260908000011_cross_schema_bare_tables.sql |
| `financial_records` | business | /Users/air/TOPEMS/database/migrations/20260907000001_erp_public_business_tables.sql |
| `hrm_dashboard_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260724000003_create_dashboard_tables.sql |
| `iam.data_permissions` | business | /Users/air/TOPEMS/database/migrations/20260716000002_create_resource_permissions_table.sql |
| `iam.permission_audit_logs` | system | /Users/air/TOPEMS/database/migrations/20260716000004_create_audit_logs_table.sql |
| `iam.permission_templates` | system | /Users/air/TOPEMS/database/migrations/20260716000003_create_permission_templates_table.sql |
| `iam.position_permissions` | business | /Users/air/TOPEMS/database/migrations/20260716000001_create_positions_table.sql |
| `iam.position_roles` | business | /Users/air/TOPEMS/database/migrations/20260716000001_create_positions_table.sql |
| `iam.positions` | business | /Users/air/TOPEMS/database/migrations/20260716000001_create_positions_table.sql |
| `iam.resource_permissions` | business | /Users/air/TOPEMS/database/migrations/20260716000002_create_resource_permissions_table.sql |
| `iam.user_positions` | business | /Users/air/TOPEMS/database/migrations/20260716000001_create_positions_table.sql |
| `inbound_orders` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `inspection_records` | business | /Users/air/TOPEMS/database/migrations/20260907000001_erp_public_business_tables.sql |
| `inventory_items` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `lims_dashboard_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260724000003_create_dashboard_tables.sql |
| `media_files` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `mes.material_plans` | business | /Users/air/TOPEMS/database/migrations/20260908000003_mes_material_plans.sql |
| `mes.work_reports` | business | /Users/air/TOPEMS/database/migrations/20260905000001_mes_work_reports_numeric.sql |
| `mobile_approvals` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `mobile_scan_records` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `mobile_tasks` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `mobile_users` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `offline_operations` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `offline_sync_records` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `outbound_orders` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `pdm_dashboard_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260724000003_create_dashboard_tables.sql |
| `permission_audit_logs` | system | /Users/air/TOPEMS/database/migrations/20260827000000_v448_permission_tables.sql |
| `photo_evidences` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `photo_uploads` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `plugin_finance.accounting_subjects` | business | /Users/air/TOPEMS/database/migrations/20260827000002_v321_accounting_subjects_migration.sql |
| `plugin_finance.difference_adjustments` | business | /Users/air/TOPEMS/database/migrations/20260824000002_v256_finance_settlement_snapshots.sql |
| `plugin_finance.reconciliation_item_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260824000002_v256_finance_settlement_snapshots.sql |
| `plugin_finance.reconciliation_settlement_links` | business | /Users/air/TOPEMS/database/migrations/20260824000002_v256_finance_settlement_snapshots.sql |
| `plugin_finance.reconciliation_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260824000002_v256_finance_settlement_snapshots.sql |
| `plugin_finance.settlement_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260824000002_v256_finance_settlement_snapshots.sql |
| `plugin_finance.source_amount_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260824000000_v254_finance_source_snapshots.sql |
| `plugin_wms.purchase_order_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260905000003_v255_wms_po_snapshots.sql |
| `production_orders` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `production_plans` | business | /Users/air/TOPEMS/database/migrations/20260907000001_erp_public_business_tables.sql |
| `public.approval_records` | business | /Users/air/TOPEMS/database/migrations/20260908000011_cross_schema_bare_tables.sql |
| `public.approvals` | business | /Users/air/TOPEMS/database/migrations/20260908000011_cross_schema_bare_tables.sql |
| `public.core_workflow_instances` | business | /Users/air/TOPEMS/database/migrations/20260908000011_cross_schema_bare_tables.sql |
| `public.core_workflow_tasks` | business | /Users/air/TOPEMS/database/migrations/20260908000011_cross_schema_bare_tables.sql |
| `public.tenants` | business | /Users/air/TOPEMS/svc/crm/migrations/0001_create_crm_tables.sql |
| `push_devices` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `push_notifications` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `push_templates` | system | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `qms.qa_alert_messages` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_alert_rules` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_apqp_approvals` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_apqp_phases` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_apqp_projects` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_apqp_risks` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_apqp_tasks` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_audit_findings` | system | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_audit_plans` | system | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_audit_tasks` | system | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_corrective_action_items` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_corrective_actions` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_ehs_hazards` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `qms.qa_eightd_audit_logs` | system | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_eightd_reports` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_fmea_analyses` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_fmea_items` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_inspection_audits` | system | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_inspection_results` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_lab_samples` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `qms.qa_lab_tasks` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `qms.qa_qms_sync_records` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_quality_costs` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_quality_inspections` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_quality_issues` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_spc_charts` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_spc_data_points` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_standard_revisions` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `qms.qa_standards` | business | /Users/air/TOPEMS/database/init/07_create_qms_tables.sql |
| `quality_tasks` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `rd.bugs` | business | /Users/air/TOPEMS/database/migrations/20260908000004_rd_ci_cd_tables.sql |
| `rd.builds` | business | /Users/air/TOPEMS/database/migrations/20260908000004_rd_ci_cd_tables.sql |
| `rd.deploys` | business | /Users/air/TOPEMS/database/migrations/20260908000004_rd_ci_cd_tables.sql |
| `rd.test_cases` | business | /Users/air/TOPEMS/database/migrations/20260908000004_rd_ci_cd_tables.sql |
| `refresh_tokens` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `rs.ai_analyses` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `rs.document_relations` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `rs.experiment_records` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `rs.formula_versions` | system | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `rs.material_tests` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `rs.patents` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `rs.research_costs` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `schema_registry` | system | /Users/air/TOPEMS/database/migrations/20260725000001_create_schema_registry.sql |
| `scm.demand_forecast` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `scm.incoming_inspections` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `scm.incoming_notices` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `scm.materials` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `scm.sales_order_items` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `scm.supplier_products` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `shortcuts` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `srm.bidding_suppliers` | business | /Users/air/TOPEMS/database/migrations/20260908000007_srm_bidding_quotation_tables.sql |
| `srm.biddings` | business | /Users/air/TOPEMS/database/migrations/20260908000007_srm_bidding_quotation_tables.sql |
| `srm.quotations` | business | /Users/air/TOPEMS/database/migrations/20260908000007_srm_bidding_quotation_tables.sql |
| `srm.scoring_dimensions` | business | /Users/air/TOPEMS/database/migrations/20260908000007_srm_bidding_quotation_tables.sql |
| `srm.supplier_categories` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `srm.supplier_contracts` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `srm.supplier_evaluations` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `srm.supplier_performance` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `srm.supplier_products` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `srm.suppliers` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `stocktake_records` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `stocktake_tasks` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `supply_chain_orders` | business | /Users/air/TOPEMS/database/migrations/20260907000001_erp_public_business_tables.sql |
| `sync_policies` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `tenant_permissions` | business | /Users/air/TOPEMS/database/migrations/20260827000000_v448_permission_tables.sql |
| `tenants` | business | /Users/air/TOPEMS/database/init/03_init_permissions.sql |
| `tms.tms_carriers` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `tms.tms_drivers` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `tms.tms_routes` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `tms.tms_shipments` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `tms.tms_vehicles` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `tool_permissions` | business | /Users/air/TOPEMS/database/migrations/20260827000000_v448_permission_tables.sql |
| `unified_core.inter_module_sync` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `unified_core.password_resets` | business | /Users/air/TOPEMS/database/migrations/20260908000009_missing_tables.sql |
| `user_settings` | system | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `video_recordings` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `wms_dashboard_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260724000003_create_dashboard_tables.sql |
| `work_reports` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |

## 判定规则

1. **需要 RLS**：多租户业务表（含 `tenant_id` / `org_id` 的实体表），启用后配套 `app.current_tenant_id` 策略（见 `database/postgres/rls_remaining_tables.sql`）。
2. **不需要 RLS**：纯平台/配置/字典/审计/内部同步表（`core_*`、`*_config`、`*_template` 等），由应用层权限控制即可。
3. **待确认**：粗分类为 `business` 的表需业务负责人逐表确认是否含租户维度数据。
