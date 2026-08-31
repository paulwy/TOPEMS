# RLS 数据权限覆盖报告（RLS Coverage Report）

> 由 `scripts/check-rls-coverage.py` 自动生成 · 生成日期：2026-08-31
> **更新（2026-08-31 落地后）**：本报告头部为**静态扫描**口径（59 SQL 文件 / 225 CREATE TABLE）；
> 活库实测与落地结果见文末「2026-08-31 落地状态」。

**扫描范围**：59 个 SQL 文件，共 225 张 CREATE TABLE。
**已启用 RLS**：11 张表。
**未显式启用**：224 张表（其中粗判为业务实体 190 张、系统类 34 张，需逐表确认）。

## 已启用 RLS 的表

- `public.companies`
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
| `crm.customers` | business | /Users/air/TOPEMS/svc/crm/migrations/0001_create_crm_tables.sql |
| `crm_dashboard_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260724000003_create_dashboard_tables.sql |
| `dashboard_stats` | business | /Users/air/TOPEMS/database/postgres/init.sql |
| `defect_records` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `devices` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `dynamic_data` | business | /Users/air/TOPEMS/database/migrations/20260725000001_create_schema_registry.sql |
| `ehs_dashboard_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260724000003_create_dashboard_tables.sql |
| `equipment` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `erp.announcements` | business | /Users/air/TOPEMS/database/postgres/administration_tables.sql |
| `erp.meeting_bookings` | business | /Users/air/TOPEMS/database/postgres/administration_tables.sql |
| `erp.meeting_rooms` | business | /Users/air/TOPEMS/database/postgres/administration_tables.sql |
| `erp.office_supplies` | business | /Users/air/TOPEMS/database/postgres/administration_tables.sql |
| `erp.vehicle_requests` | business | /Users/air/TOPEMS/database/postgres/administration_tables.sql |
| `erp.vehicles` | business | /Users/air/TOPEMS/database/postgres/administration_tables.sql |
| `financial_records` | business | /Users/air/TOPEMS/database/postgres/init.sql |
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
| `inspection_records` | business | /Users/air/TOPEMS/database/postgres/init.sql |
| `inventory_items` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `lims_dashboard_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260724000003_create_dashboard_tables.sql |
| `media_files` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `mobile_approvals` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `mobile_scan_records` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `mobile_tasks` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `mobile_users` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `notifications` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `offline_operations` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `offline_sync_records` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `outbound_orders` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `patrol_records` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `pdm_dashboard_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260724000003_create_dashboard_tables.sql |
| `permission_audit_logs` | system | /Users/air/TOPEMS/database/migrations/20260827000000_v448_permission_tables.sql |
| `photo_evidences` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `photo_uploads` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `plugin_ai.conversation_messages` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `plugin_ai.conversations` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `plugin_ai.document_chunks` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `plugin_ai.document_embeddings` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `plugin_ai.documents` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `plugin_ai.knowledge_bases` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `plugin_crm.contacts` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_crm.customers` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_crm.opportunities` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_crm.sales_orders` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_erp.assets` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_erp.expense_claims` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_erp.expense_items` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_erp.voucher_items` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_erp.vouchers` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_finance.accounting_subjects` | business | /Users/air/TOPEMS/database/migrations/20260827000002_v321_accounting_subjects_migration.sql |
| `plugin_finance.difference_adjustments` | business | /Users/air/TOPEMS/database/migrations/20260824000002_v256_finance_settlement_snapshots.sql |
| `plugin_finance.reconciliation_item_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260824000002_v256_finance_settlement_snapshots.sql |
| `plugin_finance.reconciliation_settlement_links` | business | /Users/air/TOPEMS/database/migrations/20260824000002_v256_finance_settlement_snapshots.sql |
| `plugin_finance.reconciliation_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260824000002_v256_finance_settlement_snapshots.sql |
| `plugin_finance.settlement_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260824000002_v256_finance_settlement_snapshots.sql |
| `plugin_finance.source_amount_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260824000000_v254_finance_source_snapshots.sql |
| `plugin_hrm.attendance_records` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_hrm.leave_records` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_hrm.payroll_records` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_hrm.performance_records` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_hrm.positions` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_hrm.recruitment_applications` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_hrm.training_participants` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_hrm.training_records` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_mobile.mobile_tasks` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_mobile.patrol_records` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_mobile.scan_records` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_pm.milestones` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_pm.projects` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_pm.tasks` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_scm.inbound_orders` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `plugin_scm.purchase_order_items` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `plugin_scm.purchase_orders` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `plugin_scm.supplier_evaluations` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `plugin_scm.suppliers` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `plugin_srm.supplier_categories` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `plugin_srm.supplier_contracts` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `plugin_srm.supplier_evaluations` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `plugin_srm.supplier_performance` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `plugin_srm.supplier_products` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `plugin_srm.suppliers` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `plugin_wms.inbound_order_items` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `plugin_wms.inbound_orders` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_wms.inventory` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_wms.locations` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_wms.outbound_order_items` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `plugin_wms.outbound_orders` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `plugin_wms.purchase_order_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260824000001_v255_wms_po_snapshots.sql |
| `plugin_wms.stock_takes` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `plugin_wms.warehouses` | business | /Users/air/TOPEMS/database/init/02_create_plugin_tables.sql |
| `production_orders` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `production_plans` | business | /Users/air/TOPEMS/database/postgres/init.sql |
| `public.audit_logs` | system | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `public.departments` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `public.employees` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `public.tenant_plugins` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `public.tenants` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `push_devices` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `push_notifications` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `push_templates` | system | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `quality_tasks` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `refresh_tokens` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `scan_records` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `schema_registry` | system | /Users/air/TOPEMS/database/migrations/20260725000001_create_schema_registry.sql |
| `shared.change_logs` | system | /Users/air/TOPEMS/database/init/06_create_shared_schema.sql |
| `shared.code_categories` | business | /Users/air/TOPEMS/database/init/06_create_shared_schema.sql |
| `shared.currencies` | business | /Users/air/TOPEMS/database/init/06_create_shared_schema.sql |
| `shared.entity_tags` | business | /Users/air/TOPEMS/database/init/06_create_shared_schema.sql |
| `shared.exchange_rates` | business | /Users/air/TOPEMS/database/init/06_create_shared_schema.sql |
| `shared.file_attachments` | business | /Users/air/TOPEMS/database/init/06_create_shared_schema.sql |
| `shared.number_sequences` | business | /Users/air/TOPEMS/database/init/06_create_shared_schema.sql |
| `shared.regions` | business | /Users/air/TOPEMS/database/init/06_create_shared_schema.sql |
| `shared.shared_dict_items` | system | /Users/air/TOPEMS/database/init/06_create_shared_schema.sql |
| `shared.shared_dict_types` | system | /Users/air/TOPEMS/database/init/06_create_shared_schema.sql |
| `shared.system_configs` | system | /Users/air/TOPEMS/database/init/06_create_shared_schema.sql |
| `shared.tag_groups` | business | /Users/air/TOPEMS/database/init/06_create_shared_schema.sql |
| `shared.tags` | business | /Users/air/TOPEMS/database/init/06_create_shared_schema.sql |
| `shared.unit_categories` | business | /Users/air/TOPEMS/database/init/06_create_shared_schema.sql |
| `shared.units` | business | /Users/air/TOPEMS/database/init/06_create_shared_schema.sql |
| `shortcuts` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `stocktake_records` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `stocktake_tasks` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `supply_chain_orders` | business | /Users/air/TOPEMS/database/postgres/init.sql |
| `sync_policies` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `tenant_permissions` | business | /Users/air/TOPEMS/database/migrations/20260827000000_v448_permission_tables.sql |
| `tenants` | business | /Users/air/TOPEMS/database/init/03_init_permissions.sql |
| `tool_permissions` | business | /Users/air/TOPEMS/database/migrations/20260827000000_v448_permission_tables.sql |
| `unified_core.categories` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.conversations` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.document_categories` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.document_versions` | system | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.documents` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.emails` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.inter_module_sync` | business | /Users/air/TOPEMS/database/init/04_create_scm_wms_srm_tables.sql |
| `unified_core.messages` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.notification_templates` | system | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.notifications` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.permissions` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.plugin_instances` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.plugin_permissions` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.plugins` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.role_permissions` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.roles` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.sessions` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.user_roles` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.users` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.workflow_definitions` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.workflow_instances` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `unified_core.workflow_tasks` | business | /Users/air/TOPEMS/database/init/01_rebuild_database.sql |
| `user_settings` | system | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `video_recordings` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |
| `wms_dashboard_snapshots` | business | /Users/air/TOPEMS/database/migrations/20260724000003_create_dashboard_tables.sql |
| `work_reports` | business | /Users/air/TOPEMS/database/init/05_mobile_init.sql |

## 判定规则

1. **需要 RLS**：多租户业务表（含 `tenant_id` / `org_id` 的实体表），启用后配套 `app.current_tenant_id` 策略（见 `database/postgres/rls_remaining_tables.sql`）。
2. **不需要 RLS**：纯平台/配置/字典/审计/内部同步表（`core_*`、`*_config`、`*_template` 等），由应用层权限控制即可。
3. **待确认**：粗分类为 `business` 的表需业务负责人逐表确认是否含租户维度数据。

---

## 2026-08-31 落地状态（活库实测，权威口径）

> 静态扫描（上文）与活库口径不同：静态扫 CREATE TABLE 语句（225 表 / 11 显式启用）；
> 活库实测为运行中 PostgreSQL **457 表 / 0 张启用 RLS**。**以活库为准**。

### 已落地（P2-1 分批迁移第 0/1 批）

- **第 0 批（框架函数）**：`database/migrations/20260831000001_rls_tenant_framework.sql`
  - `public.current_tenant_id()` / `public.current_user_id()`：读取 `app.tenant_id` / `app.user_id` GUC，空值安全返回 NULL
- **第 1 批（启用 RLS）**：`database/migrations/20260831000002_rls_enable_tenant_tables.sql`
  - **302 张含 `tenant_id` 列的表已 `ENABLE ROW LEVEL SECURITY`**（456 张业务表中 302 张含租户列）
  - 策略 `tenant_isolation_<表>`：`FOR ALL USING (tenant_id = NULLIF(current_setting('app.tenant_id'),'')::UUID OR tenant_id IS NULL)`
  - 仅处理含 tenant_id 列的表；幂等（可重复执行）

### 功能验证（通过）

- 非 superuser 角色：租户 C 只见自己 1 行、租户 D 视角 0 行（隔离生效）
- 无租户上下文：返回 0 行（**不报错**，空安全）
- 验证用测试数据/角色已清理（crm.customers 归 0 行）

### 落地中修复的 3 个真实缺陷

1. **GUC 名不一致**：`database/postgres/rls_remaining_tables.sql` 的策略读 `app.current_tenant_id`，而应用层（`lib/shared-db/src/rls.rs`、`svc/unified-core/src/middleware/tenant_rls.rs`）写入的是 `app.tenant_id` → 已用 `app.tenant_id` 统一。
2. **PG18 不支持 `CREATE POLICY IF NOT EXISTS`**（语法错误）→ 迁移与 `lib/shared-db/src/rls.rs` 均改为查 `pg_policies` 存在性判断（存在则 ALTER POLICY，否则 CREATE POLICY）。
3. **空值 UUID 转换报错**：策略 `current_setting('app.tenant_id')::UUID` 在 GUC 未设置时因 `''::UUID` 报错 → 改为 `NULLIF(current_setting('app.tenant_id'),'')::UUID`（空安全），`lib/shared-db/src/rls.rs` 同步修复。

### 遗留

- 155 张表不含 tenant_id 列（平台/系统/共享表），按判定规则由应用层权限控制，未启用 RLS
- `database/postgres/rls_remaining_tables.sql` 已与当前 schema 脱节（10 表中 8 张不存在），建议归档
- 应用服务 `enable_rls: true`（15 个）重启后将按新逻辑自动对齐（幂等）
