-- ============================================================
-- 20261027200000: unified-core 四 schema 副本治理
--
-- 背景：iam/mes/flow/communication 四个 schema 存在 public.core_* 的
-- 影子副本表（历史 search_path 播种产物），与 public 权威表长期双写/漂移。
-- 本轮治理：
--   1) 代码侧：建表语句全部显式 schema（public 权威 / flow 业务权威），
--      裸引用由 search_path 解析，副本不再再生。
--   2) 本迁移：幂等清理存量库副本表（DROP TABLE IF EXISTS ... CASCADE），
--      修正指向副本的错误业务 FK，并为 flow 业务表补齐 tenant_id 列。
--
-- 权威边界（治理后）：
--   - public             : 全部 core_* 权威表（71 张，含 tenants/menus/permissions/roles/users 等）
--   - iam                : 业务表 users + 9 张 iam 特有 core_*（chat/email/plugin/usage/dashboard 等）
--   - flow               : flow 业务表（workflows/instances/tasks/versions/flow_*/mdm_*/master_data_*，13 张）
--   - mes/communication  : 无 core_* 表（纯业务 schema）
--
-- 幂等性：新库无副本表 → 各语句自动跳过；存量库一次性收敛。
-- ============================================================

-- 1) 修正业务 FK 指向 public.core_users（原误指向 mes.core_users 副本，已 DROP）
ALTER TABLE iam.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
ALTER TABLE iam.refresh_tokens ADD CONSTRAINT refresh_tokens_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.core_users(id) ON DELETE CASCADE;
ALTER TABLE iam.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE iam.sessions ADD CONSTRAINT sessions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.core_users(id) ON DELETE CASCADE;

-- 2) 清理 iam/mes/flow/communication 中与 public 同名的 core_* 副本表（104 张，幂等；flow 业务表由 public 权威版承载）
DROP TABLE IF EXISTS communication.core_emails CASCADE;
DROP TABLE IF EXISTS communication.core_geofences CASCADE;
DROP TABLE IF EXISTS communication.core_notification_templates CASCADE;
DROP TABLE IF EXISTS communication.core_notifications CASCADE;
DROP TABLE IF EXISTS flow.core_doc_documents CASCADE;
DROP TABLE IF EXISTS flow.core_doc_folders CASCADE;
DROP TABLE IF EXISTS flow.core_doc_templates CASCADE;
DROP TABLE IF EXISTS flow.core_file_folders CASCADE;
DROP TABLE IF EXISTS flow.core_file_permissions CASCADE;
DROP TABLE IF EXISTS flow.core_files CASCADE;
DROP TABLE IF EXISTS flow.core_flow_categories CASCADE;
DROP TABLE IF EXISTS flow.core_flow_delegates CASCADE;
DROP TABLE IF EXISTS flow.core_flow_rules CASCADE;
DROP TABLE IF EXISTS flow.core_flow_variable_history CASCADE;
DROP TABLE IF EXISTS flow.core_flow_variables CASCADE;
DROP TABLE IF EXISTS flow.core_master_data_change_log CASCADE;
DROP TABLE IF EXISTS flow.core_master_data_refs CASCADE;
DROP TABLE IF EXISTS flow.core_mdm_approvals CASCADE;
DROP TABLE IF EXISTS flow.core_mdm_reconciliation_log CASCADE;
DROP TABLE IF EXISTS flow.core_menu_groups CASCADE;
DROP TABLE IF EXISTS flow.core_menus CASCADE;
DROP TABLE IF EXISTS flow.core_migration_history CASCADE;
DROP TABLE IF EXISTS flow.core_operation_logs CASCADE;
DROP TABLE IF EXISTS flow.core_tenant_modules CASCADE;
DROP TABLE IF EXISTS flow.core_tenant_settings CASCADE;
DROP TABLE IF EXISTS flow.core_tenant_usage CASCADE;
DROP TABLE IF EXISTS flow.core_tenant_users CASCADE;
DROP TABLE IF EXISTS flow.core_tenants CASCADE;
DROP TABLE IF EXISTS flow.core_workflow_instances CASCADE;
DROP TABLE IF EXISTS flow.core_workflow_tasks CASCADE;
DROP TABLE IF EXISTS flow.core_workflow_versions CASCADE;
DROP TABLE IF EXISTS flow.core_workflows CASCADE;
DROP TABLE IF EXISTS iam.core_dict_items CASCADE;
DROP TABLE IF EXISTS iam.core_dict_types CASCADE;
DROP TABLE IF EXISTS iam.core_emails CASCADE;
DROP TABLE IF EXISTS iam.core_faqs CASCADE;
DROP TABLE IF EXISTS iam.core_file_folders CASCADE;
DROP TABLE IF EXISTS iam.core_files CASCADE;
DROP TABLE IF EXISTS iam.core_guide_lessons CASCADE;
DROP TABLE IF EXISTS iam.core_guide_progress CASCADE;
DROP TABLE IF EXISTS iam.core_guides CASCADE;
DROP TABLE IF EXISTS iam.core_inter_module_sync CASCADE;
DROP TABLE IF EXISTS iam.core_login_logs CASCADE;
DROP TABLE IF EXISTS iam.core_menu_groups CASCADE;
DROP TABLE IF EXISTS iam.core_menus CASCADE;
DROP TABLE IF EXISTS iam.core_migration_history CASCADE;
DROP TABLE IF EXISTS iam.core_notification_templates CASCADE;
DROP TABLE IF EXISTS iam.core_notifications CASCADE;
DROP TABLE IF EXISTS iam.core_permissions CASCADE;
DROP TABLE IF EXISTS iam.core_plugin_categories CASCADE;
DROP TABLE IF EXISTS iam.core_plugin_instances CASCADE;
DROP TABLE IF EXISTS iam.core_plugin_permissions CASCADE;
DROP TABLE IF EXISTS iam.core_plugin_reviews CASCADE;
DROP TABLE IF EXISTS iam.core_plugin_versions CASCADE;
DROP TABLE IF EXISTS iam.core_plugins CASCADE;
DROP TABLE IF EXISTS iam.core_role_permissions CASCADE;
DROP TABLE IF EXISTS iam.core_roles CASCADE;
DROP TABLE IF EXISTS iam.core_tenant_modules CASCADE;
DROP TABLE IF EXISTS iam.core_tenant_plugins CASCADE;
DROP TABLE IF EXISTS iam.core_tenant_settings CASCADE;
DROP TABLE IF EXISTS iam.core_tenant_usage CASCADE;
DROP TABLE IF EXISTS iam.core_tenant_users CASCADE;
DROP TABLE IF EXISTS iam.core_tenants CASCADE;
DROP TABLE IF EXISTS iam.core_user_roles CASCADE;
DROP TABLE IF EXISTS iam.core_users CASCADE;
DROP TABLE IF EXISTS iam.core_workflow_instances CASCADE;
DROP TABLE IF EXISTS iam.core_workflow_tasks CASCADE;
DROP TABLE IF EXISTS iam.core_workflows CASCADE;
DROP TABLE IF EXISTS mes.core_dict_items CASCADE;
DROP TABLE IF EXISTS mes.core_dict_types CASCADE;
DROP TABLE IF EXISTS mes.core_emails CASCADE;
DROP TABLE IF EXISTS mes.core_faqs CASCADE;
DROP TABLE IF EXISTS mes.core_file_folders CASCADE;
DROP TABLE IF EXISTS mes.core_files CASCADE;
DROP TABLE IF EXISTS mes.core_guide_lessons CASCADE;
DROP TABLE IF EXISTS mes.core_guide_progress CASCADE;
DROP TABLE IF EXISTS mes.core_guides CASCADE;
DROP TABLE IF EXISTS mes.core_inter_module_sync CASCADE;
DROP TABLE IF EXISTS mes.core_login_logs CASCADE;
DROP TABLE IF EXISTS mes.core_menu_groups CASCADE;
DROP TABLE IF EXISTS mes.core_menus CASCADE;
DROP TABLE IF EXISTS mes.core_migration_history CASCADE;
DROP TABLE IF EXISTS mes.core_notification_templates CASCADE;
DROP TABLE IF EXISTS mes.core_notifications CASCADE;
DROP TABLE IF EXISTS mes.core_permissions CASCADE;
DROP TABLE IF EXISTS mes.core_plugin_categories CASCADE;
DROP TABLE IF EXISTS mes.core_plugin_instances CASCADE;
DROP TABLE IF EXISTS mes.core_plugin_permissions CASCADE;
DROP TABLE IF EXISTS mes.core_plugin_reviews CASCADE;
DROP TABLE IF EXISTS mes.core_plugin_versions CASCADE;
DROP TABLE IF EXISTS mes.core_plugins CASCADE;
DROP TABLE IF EXISTS mes.core_role_permissions CASCADE;
DROP TABLE IF EXISTS mes.core_roles CASCADE;
DROP TABLE IF EXISTS mes.core_tenant_modules CASCADE;
DROP TABLE IF EXISTS mes.core_tenant_plugins CASCADE;
DROP TABLE IF EXISTS mes.core_tenant_settings CASCADE;
DROP TABLE IF EXISTS mes.core_tenant_usage CASCADE;
DROP TABLE IF EXISTS mes.core_tenant_users CASCADE;
DROP TABLE IF EXISTS mes.core_tenants CASCADE;
DROP TABLE IF EXISTS mes.core_user_roles CASCADE;
DROP TABLE IF EXISTS mes.core_users CASCADE;
DROP TABLE IF EXISTS mes.core_workflow_instances CASCADE;
DROP TABLE IF EXISTS mes.core_workflow_tasks CASCADE;
DROP TABLE IF EXISTS mes.core_workflows CASCADE;

-- 3) flow 业务表补齐 tenant_id 列（存量库幂等；新库由代码 DDL 自带）
ALTER TABLE public.core_workflows ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.core_workflow_instances ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.core_workflow_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.core_workflow_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.core_flow_variables ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.core_flow_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.core_flow_delegates ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.core_flow_variable_history ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.core_mdm_approvals ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.core_master_data_change_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.core_master_data_refs ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.core_mdm_reconciliation_log ADD COLUMN IF NOT EXISTS tenant_id UUID;
