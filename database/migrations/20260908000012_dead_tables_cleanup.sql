-- 20260908000012: 死表清理（评审 A 方案）——删除 90 张全仓 0 引用表
-- 依据 docs/assessments/dead-tables-review-2026-09-08.md
-- A 组（56 张，无服务 schema）+ B 组（34 张，旧表被新表替代）
-- 全部 rows=0 无数据；DROP TABLE IF EXISTS ... CASCADE 幂等
-- CASCADE 仅级联删除依赖 FK 约束（flow/doc_service 内部 FK 交叉，保留表不受影响）

-- ===== A 组：无服务 schema（56 张） =====
-- bi (11)
DROP TABLE IF EXISTS bi.analysis_history, bi.analysis_queries, bi.dashboard_widgets, bi.dashboards,
    bi.data_sources, bi.datasource_fields, bi.datasource_tables, bi.report_data,
    bi.saved_analysis_results, bi.visualization_data, bi.visualizations CASCADE;
-- doc (2)
DROP TABLE IF EXISTS doc.document_links, doc.document_permissions CASCADE;
-- doc_service (17)
DROP TABLE IF EXISTS doc_service.archive_borrows CASCADE;
DROP TABLE IF EXISTS doc_service.archive_categories CASCADE;
DROP TABLE IF EXISTS doc_service.archive_destructions CASCADE;
DROP TABLE IF EXISTS doc_service.archive_metadata CASCADE;
DROP TABLE IF EXISTS doc_service.core_doc_document_versions CASCADE;
DROP TABLE IF EXISTS doc_service.faqs CASCADE;
DROP TABLE IF EXISTS doc_service.file_permissions CASCADE;
DROP TABLE IF EXISTS doc_service.file_versions CASCADE;
DROP TABLE IF EXISTS doc_service.folder_permissions CASCADE;
DROP TABLE IF EXISTS doc_service.help_articles CASCADE;
DROP TABLE IF EXISTS doc_service.help_categories CASCADE;
DROP TABLE IF EXISTS doc_service.template_audit_log CASCADE;
DROP TABLE IF EXISTS doc_service.template_categories CASCADE;
DROP TABLE IF EXISTS doc_service.template_instances CASCADE;
DROP TABLE IF EXISTS doc_service.template_variables CASCADE;
DROP TABLE IF EXISTS doc_service.template_versions CASCADE;
DROP TABLE IF EXISTS doc_service.video_tutorials CASCADE;
-- flow (5)
DROP TABLE IF EXISTS flow.approval_withdrawals CASCADE;
DROP TABLE IF EXISTS flow.workflow_instance_snapshots CASCADE;
DROP TABLE IF EXISTS flow.workflow_instances CASCADE;
DROP TABLE IF EXISTS flow.workflow_rollbacks CASCADE;
DROP TABLE IF EXISTS flow.workflow_versions CASCADE;
-- iam (4)
DROP TABLE IF EXISTS iam.password_reset_tokens, iam.role_permissions, iam.user_access_logs, iam.user_roles CASCADE;
-- im (9)
DROP TABLE IF EXISTS im.chat_room_members, im.chat_rooms, im.contact_group_members,
    im.contact_groups, im.file_transfers, im.friends, im.message_read_receipts,
    im.project_groups, im.user_status CASCADE;
-- mail (1)
DROP TABLE IF EXISTS mail.attachments CASCADE;
-- notification (3)
DROP TABLE IF EXISTS notification.archive_config, notification.archived_notifications,
    notification.notification_templates CASCADE;
-- report (2)
DROP TABLE IF EXISTS report.report_exports, report.report_type_configs CASCADE;
-- storage (2)
DROP TABLE IF EXISTS storage.backends, storage.file_permissions CASCADE;

-- ===== B 组：旧表被新表替代（34 张） =====
-- crm (4)
DROP TABLE IF EXISTS crm.core_crm_contacts, crm.core_crm_opportunities,
    crm.crm_master_data_refs, crm.dashboard_metrics CASCADE;
-- erp (15)
DROP TABLE IF EXISTS erp.accounting_periods, erp.archive_marks, erp.asset_depreciation_records,
    erp.bank_transactions, erp.core_erp_customers, erp.core_erp_inventory,
    erp.core_erp_purchase_orders, erp.core_erp_sales_orders, erp.db_changes,
    erp.fin_reconciliation_records, erp.fin_reconciliation_rules, erp.payment_schedules,
    erp.project_budget_items, erp.project_budgets, erp.project_contracts CASCADE;
-- wms (5)
DROP TABLE IF EXISTS wms.core_wms_inbound_orders, wms.core_wms_inventory,
    wms.core_wms_outbound_orders, wms.core_wms_warehouses, wms.inventory_alerts CASCADE;
-- hrm (5)
DROP TABLE IF EXISTS hrm.core_hrm_attendance, hrm.core_hrm_departments,
    hrm.core_hrm_employees, hrm.core_hrm_leaves, hrm.hrm_master_data_refs CASCADE;
-- finance (3)
DROP TABLE IF EXISTS finance.core_finance_account_opening_balances,
    finance.core_finance_voucher_entries, finance.core_finance_voucher_templates CASCADE;
-- scm (1)
DROP TABLE IF EXISTS scm.scm_master_data_refs CASCADE;
-- integration (1)
DROP TABLE IF EXISTS integration.integration_configs CASCADE;
