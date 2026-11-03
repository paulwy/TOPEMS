-- 数据库治理：无主键表补 PK（库无关幂等 DO 块）
-- 来源：topems_prod 只读审计 2026-11-03 —— id 列先数据校验（0 NULL/0 重复）96 表；已先经 topems_prepare 演练。
-- 守卫：to_regclass 变量（NULL 安全）+ pg_constraint 无 PK 才 ADD。

DO $$ DECLARE t oid := to_regclass('communication.core_emails'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE communication.core_emails ADD CONSTRAINT core_emails_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('communication.core_geofences'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE communication.core_geofences ADD CONSTRAINT core_geofences_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('communication.core_notification_templates'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE communication.core_notification_templates ADD CONSTRAINT core_notification_templates_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('communication.core_notifications'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE communication.core_notifications ADD CONSTRAINT core_notifications_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('core.core_plugin_pricing'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE core.core_plugin_pricing ADD CONSTRAINT core_plugin_pricing_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_doc_documents'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_doc_documents ADD CONSTRAINT core_doc_documents_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_doc_folders'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_doc_folders ADD CONSTRAINT core_doc_folders_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_doc_templates'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_doc_templates ADD CONSTRAINT core_doc_templates_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_file_folders'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_file_folders ADD CONSTRAINT core_file_folders_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_file_permissions'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_file_permissions ADD CONSTRAINT core_file_permissions_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_files'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_files ADD CONSTRAINT core_files_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_flow_categories'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_flow_categories ADD CONSTRAINT core_flow_categories_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_flow_delegates'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_flow_delegates ADD CONSTRAINT core_flow_delegates_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_flow_rules'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_flow_rules ADD CONSTRAINT core_flow_rules_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_flow_variable_history'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_flow_variable_history ADD CONSTRAINT core_flow_variable_history_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_flow_variables'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_flow_variables ADD CONSTRAINT core_flow_variables_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_master_data_change_log'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_master_data_change_log ADD CONSTRAINT core_master_data_change_log_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_mdm_approvals'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_mdm_approvals ADD CONSTRAINT core_mdm_approvals_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_mdm_reconciliation_log'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_mdm_reconciliation_log ADD CONSTRAINT core_mdm_reconciliation_log_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_menu_groups'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_menu_groups ADD CONSTRAINT core_menu_groups_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_menus'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_menus ADD CONSTRAINT core_menus_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_migration_history'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_migration_history ADD CONSTRAINT core_migration_history_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_operation_logs'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_operation_logs ADD CONSTRAINT core_operation_logs_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_tenant_modules'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_tenant_modules ADD CONSTRAINT core_tenant_modules_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_tenant_settings'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_tenant_settings ADD CONSTRAINT core_tenant_settings_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_tenant_usage'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_tenant_usage ADD CONSTRAINT core_tenant_usage_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_tenant_users'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_tenant_users ADD CONSTRAINT core_tenant_users_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_tenants'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_tenants ADD CONSTRAINT core_tenants_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_workflow_instances'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_workflow_instances ADD CONSTRAINT core_workflow_instances_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_workflow_tasks'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_workflow_tasks ADD CONSTRAINT core_workflow_tasks_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_workflow_versions'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_workflow_versions ADD CONSTRAINT core_workflow_versions_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('flow.core_workflows'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE flow.core_workflows ADD CONSTRAINT core_workflows_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_billing_invoices'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_billing_invoices ADD CONSTRAINT core_billing_invoices_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_billing_plans'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_billing_plans ADD CONSTRAINT core_billing_plans_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_chat_messages'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_chat_messages ADD CONSTRAINT core_chat_messages_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_chat_rooms'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_chat_rooms ADD CONSTRAINT core_chat_rooms_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_dashboard_refresh_log'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_dashboard_refresh_log ADD CONSTRAINT core_dashboard_refresh_log_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_dict_items'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_dict_items ADD CONSTRAINT core_dict_items_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_dict_types'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_dict_types ADD CONSTRAINT core_dict_types_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_email_queue'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_email_queue ADD CONSTRAINT core_email_queue_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_email_templates'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_email_templates ADD CONSTRAINT core_email_templates_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_emails'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_emails ADD CONSTRAINT core_emails_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_faqs'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_faqs ADD CONSTRAINT core_faqs_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_file_folders'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_file_folders ADD CONSTRAINT core_file_folders_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_files'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_files ADD CONSTRAINT core_files_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_guide_lessons'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_guide_lessons ADD CONSTRAINT core_guide_lessons_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_guide_progress'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_guide_progress ADD CONSTRAINT core_guide_progress_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_guides'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_guides ADD CONSTRAINT core_guides_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_inter_module_sync'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_inter_module_sync ADD CONSTRAINT core_inter_module_sync_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_login_logs'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_login_logs ADD CONSTRAINT core_login_logs_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_menu_groups'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_menu_groups ADD CONSTRAINT core_menu_groups_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_menus'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_menus ADD CONSTRAINT core_menus_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_migration_history'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_migration_history ADD CONSTRAINT core_migration_history_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_mobile_offline_records'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_mobile_offline_records ADD CONSTRAINT core_mobile_offline_records_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_notification_templates'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_notification_templates ADD CONSTRAINT core_notification_templates_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_notifications'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_notifications ADD CONSTRAINT core_notifications_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_permissions'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_permissions ADD CONSTRAINT core_permissions_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_plugin_categories'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_plugin_categories ADD CONSTRAINT core_plugin_categories_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_plugin_instances'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_plugin_instances ADD CONSTRAINT core_plugin_instances_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_plugin_permissions'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_plugin_permissions ADD CONSTRAINT core_plugin_permissions_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_plugin_pricing'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_plugin_pricing ADD CONSTRAINT core_plugin_pricing_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_plugin_reviews'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_plugin_reviews ADD CONSTRAINT core_plugin_reviews_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_plugin_versions'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_plugin_versions ADD CONSTRAINT core_plugin_versions_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_plugins'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_plugins ADD CONSTRAINT core_plugins_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_roles'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_roles ADD CONSTRAINT core_roles_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_subscriptions'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_subscriptions ADD CONSTRAINT core_subscriptions_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_tenant_modules'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_tenant_modules ADD CONSTRAINT core_tenant_modules_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_tenant_plugins'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_tenant_plugins ADD CONSTRAINT core_tenant_plugins_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_tenant_settings'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_tenant_settings ADD CONSTRAINT core_tenant_settings_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_tenant_usage'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_tenant_usage ADD CONSTRAINT core_tenant_usage_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_tenant_users'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_tenant_users ADD CONSTRAINT core_tenant_users_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_tenants'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_tenants ADD CONSTRAINT core_tenants_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_usage_records'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_usage_records ADD CONSTRAINT core_usage_records_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_users'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_users ADD CONSTRAINT core_users_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_workflow_instances'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_workflow_instances ADD CONSTRAINT core_workflow_instances_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_workflow_tasks'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_workflow_tasks ADD CONSTRAINT core_workflow_tasks_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.core_workflows'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.core_workflows ADD CONSTRAINT core_workflows_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.refresh_tokens'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.refresh_tokens ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.sessions'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.sessions ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.tenant_permissions'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.tenant_permissions ADD CONSTRAINT tenant_permissions_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('iam.tool_permissions'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE iam.tool_permissions ADD CONSTRAINT tool_permissions_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('master_data.core_master_data_event_outbox'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE master_data.core_master_data_event_outbox ADD CONSTRAINT core_master_data_event_outbox_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('plugin_erp.accounting_subjects'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE plugin_erp.accounting_subjects ADD CONSTRAINT accounting_subjects_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('public.core_chat_messages'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE public.core_chat_messages ADD CONSTRAINT core_chat_messages_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('public.core_chat_rooms'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE public.core_chat_rooms ADD CONSTRAINT core_chat_rooms_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('public.core_email_queue'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE public.core_email_queue ADD CONSTRAINT core_email_queue_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('public.core_email_templates'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE public.core_email_templates ADD CONSTRAINT core_email_templates_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('public.core_finance_account_opening_balances'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE public.core_finance_account_opening_balances ADD CONSTRAINT core_finance_account_opening_balances_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('public.core_finance_voucher_entries'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE public.core_finance_voucher_entries ADD CONSTRAINT core_finance_voucher_entries_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('public.core_finance_voucher_templates'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE public.core_finance_voucher_templates ADD CONSTRAINT core_finance_voucher_templates_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('public.core_master_data_event_outbox'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE public.core_master_data_event_outbox ADD CONSTRAINT core_master_data_event_outbox_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('public.core_mobile_offline_records'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE public.core_mobile_offline_records ADD CONSTRAINT core_mobile_offline_records_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('public.core_users'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE public.core_users ADD CONSTRAINT core_users_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('public.equipment'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE public.equipment ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('public.refresh_tokens'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE public.refresh_tokens ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('public.search_recent'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE public.search_recent ADD CONSTRAINT search_recent_pkey PRIMARY KEY (id);
  END IF;
END $$;
DO $$ DECLARE t oid := to_regclass('rs.project_phases'); BEGIN
  IF t IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid=t AND contype='p') THEN
    ALTER TABLE rs.project_phases ADD CONSTRAINT project_phases_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- 共 97 个 PK 补链