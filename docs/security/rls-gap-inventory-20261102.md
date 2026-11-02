# RLS 缺口清单（topems_test 实时盘点 2026-11-02）

口径：含 tenant_id/org_id 列但表级 relrowsecurity=false 的表（排除系统 schema/_archive）。
总计 **65** 张 = 业务实体类 **29** + 配置/系统类 **36**。

判定规则：多租户业务表（tenant_id/org_id）需 RLS；core_*/_config/_template 平台配置类由应用层权限控制。

## 业务实体类（建议补 RLS，按模块分批）

| schema | 表 |
|---|---|
| ehs | qa_ehs_compliance_evaluations |
| ehs | qa_ehs_discharge_permits |
| ehs | qa_ehs_drill_evaluations |
| ehs | qa_ehs_env_monitor_records |
| ehs | qa_ehs_environment_incidents |
| ehs | qa_ehs_environment_monitors |
| ehs | qa_ehs_environmental_regulations |
| finance | expense_approvals |
| finance | financial_reports |
| iam | crm_dashboard_snapshots |
| iam | ehs_dashboard_snapshots |
| iam | hrm_dashboard_snapshots |
| iam | lims_dashboard_snapshots |
| iam | pdm_dashboard_snapshots |
| iam | permission_audit_logs |
| iam | tenant_permissions |
| iam | wms_dashboard_snapshots |
| lims | qa_lab_samples |
| lims | qa_lab_tasks |
| master_data | materials |
| master_data | samples |
| master_data | uoms |
| mes | process_flow_steps |
| mes | quality_standard_values |
| plugin_erp | accounting_subjects |
| pm | documents |
| public | qa_ehs_risks |
| scm | incoming_notices |
| scm | scm_master_data_refs |

## 配置/系统类（豁免，应用层权限控制）

- communication.core_notification_templates
- finance.core_finance_approval_workflows
- finance.finance_voucher_templates
- flow.core_comments
- flow.core_favorites
- iam.core_billing_invoices
- iam.core_billing_plans
- iam.core_dict_items
- iam.core_dict_types
- iam.core_email_templates
- iam.core_emails
- iam.core_faqs
- iam.core_file_folders
- iam.core_guide_lessons
- iam.core_guide_progress
- iam.core_guides
- iam.core_inter_module_sync
- iam.core_login_logs
- iam.core_menu_groups
- iam.core_menus
- iam.core_migration_history
- iam.core_mobile_offline_records
- iam.core_notification_templates
- iam.core_notifications
- iam.core_plugin_categories
- iam.core_plugin_instances
- iam.core_plugin_permissions
- iam.core_plugin_reviews
- iam.core_plugins
- iam.core_roles
- iam.core_subscriptions
- iam.core_users
- iam.core_workflow_instances
- iam.core_workflow_tasks
- iam.core_workflows
- public.core_workflows

## 下一步
- 业务类 29 张按模块分批补：ALTER TABLE ... ENABLE ROW LEVEL SECURITY + 标准 tenant 策略（tenant_id = NULLIF(current_setting('app.tenant_id'))::uuid OR tenant_id IS NULL + 超管放行）。
- 已确认有策略但表未 enable 的（如 core_dict_items/types）可先只补 ENABLE。
