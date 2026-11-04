-- ============================================================
-- P3-FK: prod 补齐 45 条 FOREIGN KEY（NOT VALID + VALIDATE）
--
-- 依据：prod vs topems_test 只读盘点 2026-11-04，按 (schema.table, contype, conname)
--   取差集并按表分组；本文件为其中 45 条。约束名取自 test 侧实测定义（prod 尚无同名约束），
--   列清单由 pg_constraint.conkey/confkey 解析，非猜测。
-- 守卫：表不存在 / 约束已存在 / 数据不满足时均跳过并 RAISE NOTICE，不中断后续条目。
-- 幂等：重复执行时约束已存在即跳过。
-- 回滚：DROP CONSTRAINT <name> ON <schema.table>（逐条可逆，无数据改写）。
-- ============================================================

SET lock_timeout = '5s';

-- finance.core_finance_approval_workflows.core_finance_approval_workflows_tenant_id_fkey：FK (tenant_id) REFERENCES public.core_tenants (id)
DO $$
BEGIN
  IF to_regclass('finance.core_finance_approval_workflows') IS NOT NULL AND to_regclass('public.core_tenants') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'finance.core_finance_approval_workflows'::regclass AND conname = 'core_finance_approval_workflows_tenant_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM finance.core_finance_approval_workflows c LEFT JOIN public.core_tenants p ON c.tenant_id = p.id
      WHERE c.tenant_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP finance.core_finance_approval_workflows FK core_finance_approval_workflows_tenant_id_fkey: orphan rows';
    ELSE
      ALTER TABLE finance.core_finance_approval_workflows ADD CONSTRAINT core_finance_approval_workflows_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.core_tenants (id) NOT VALID;
      ALTER TABLE finance.core_finance_approval_workflows VALIDATE CONSTRAINT core_finance_approval_workflows_tenant_id_fkey;
    END IF;
  END IF;
END $$;

-- flow.core_doc_document_versions.core_doc_document_versions_document_id_fkey：FK (document_id) REFERENCES flow.core_doc_documents (id) ON DELETE CASCADE
DO $$
BEGIN
  IF to_regclass('flow.core_doc_document_versions') IS NOT NULL AND to_regclass('flow.core_doc_documents') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_doc_document_versions'::regclass AND conname = 'core_doc_document_versions_document_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM flow.core_doc_document_versions c LEFT JOIN flow.core_doc_documents p ON c.document_id = p.id
      WHERE c.document_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP flow.core_doc_document_versions FK core_doc_document_versions_document_id_fkey: orphan rows';
    ELSE
      ALTER TABLE flow.core_doc_document_versions ADD CONSTRAINT core_doc_document_versions_document_id_fkey FOREIGN KEY (document_id) REFERENCES flow.core_doc_documents (id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE flow.core_doc_document_versions VALIDATE CONSTRAINT core_doc_document_versions_document_id_fkey;
    END IF;
  END IF;
END $$;

-- flow.core_doc_documents.core_doc_documents_folder_id_fkey：FK (folder_id) REFERENCES public.core_doc_folders (id)
DO $$
BEGIN
  IF to_regclass('flow.core_doc_documents') IS NOT NULL AND to_regclass('public.core_doc_folders') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_doc_documents'::regclass AND conname = 'core_doc_documents_folder_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM flow.core_doc_documents c LEFT JOIN public.core_doc_folders p ON c.folder_id = p.id
      WHERE c.folder_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP flow.core_doc_documents FK core_doc_documents_folder_id_fkey: orphan rows';
    ELSE
      ALTER TABLE flow.core_doc_documents ADD CONSTRAINT core_doc_documents_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.core_doc_folders (id) NOT VALID;
      ALTER TABLE flow.core_doc_documents VALIDATE CONSTRAINT core_doc_documents_folder_id_fkey;
    END IF;
  END IF;
END $$;

-- flow.core_doc_documents.core_doc_documents_template_id_fkey：FK (template_id) REFERENCES public.core_doc_templates (id)
DO $$
BEGIN
  IF to_regclass('flow.core_doc_documents') IS NOT NULL AND to_regclass('public.core_doc_templates') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_doc_documents'::regclass AND conname = 'core_doc_documents_template_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM flow.core_doc_documents c LEFT JOIN public.core_doc_templates p ON c.template_id = p.id
      WHERE c.template_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP flow.core_doc_documents FK core_doc_documents_template_id_fkey: orphan rows';
    ELSE
      ALTER TABLE flow.core_doc_documents ADD CONSTRAINT core_doc_documents_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.core_doc_templates (id) NOT VALID;
      ALTER TABLE flow.core_doc_documents VALIDATE CONSTRAINT core_doc_documents_template_id_fkey;
    END IF;
  END IF;
END $$;

-- flow.core_doc_folders.core_doc_folders_parent_id_fkey：FK (parent_id) REFERENCES flow.core_doc_folders (id)
DO $$
BEGIN
  IF to_regclass('flow.core_doc_folders') IS NOT NULL AND to_regclass('flow.core_doc_folders') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_doc_folders'::regclass AND conname = 'core_doc_folders_parent_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM flow.core_doc_folders c LEFT JOIN flow.core_doc_folders p ON c.parent_id = p.id
      WHERE c.parent_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP flow.core_doc_folders FK core_doc_folders_parent_id_fkey: orphan rows';
    ELSE
      ALTER TABLE flow.core_doc_folders ADD CONSTRAINT core_doc_folders_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES flow.core_doc_folders (id) NOT VALID;
      ALTER TABLE flow.core_doc_folders VALIDATE CONSTRAINT core_doc_folders_parent_id_fkey;
    END IF;
  END IF;
END $$;

-- flow.core_flow_variable_history.core_flow_variable_history_variable_id_fkey：FK (variable_id) REFERENCES flow.core_flow_variables (id)
DO $$
BEGIN
  IF to_regclass('flow.core_flow_variable_history') IS NOT NULL AND to_regclass('flow.core_flow_variables') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_flow_variable_history'::regclass AND conname = 'core_flow_variable_history_variable_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM flow.core_flow_variable_history c LEFT JOIN flow.core_flow_variables p ON c.variable_id = p.id
      WHERE c.variable_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP flow.core_flow_variable_history FK core_flow_variable_history_variable_id_fkey: orphan rows';
    ELSE
      ALTER TABLE flow.core_flow_variable_history ADD CONSTRAINT core_flow_variable_history_variable_id_fkey FOREIGN KEY (variable_id) REFERENCES flow.core_flow_variables (id) NOT VALID;
      ALTER TABLE flow.core_flow_variable_history VALIDATE CONSTRAINT core_flow_variable_history_variable_id_fkey;
    END IF;
  END IF;
END $$;

-- flow.core_menus.core_menus_group_id_fkey：FK (group_id) REFERENCES flow.core_menu_groups (id) ON DELETE CASCADE
DO $$
BEGIN
  IF to_regclass('flow.core_menus') IS NOT NULL AND to_regclass('flow.core_menu_groups') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_menus'::regclass AND conname = 'core_menus_group_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM flow.core_menus c LEFT JOIN flow.core_menu_groups p ON c.group_id = p.id
      WHERE c.group_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP flow.core_menus FK core_menus_group_id_fkey: orphan rows';
    ELSE
      ALTER TABLE flow.core_menus ADD CONSTRAINT core_menus_group_id_fkey FOREIGN KEY (group_id) REFERENCES flow.core_menu_groups (id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE flow.core_menus VALIDATE CONSTRAINT core_menus_group_id_fkey;
    END IF;
  END IF;
END $$;

-- flow.core_menus.core_menus_parent_id_fkey：FK (parent_id) REFERENCES flow.core_menus (id) ON DELETE SET NULL
DO $$
BEGIN
  IF to_regclass('flow.core_menus') IS NOT NULL AND to_regclass('flow.core_menus') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_menus'::regclass AND conname = 'core_menus_parent_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM flow.core_menus c LEFT JOIN flow.core_menus p ON c.parent_id = p.id
      WHERE c.parent_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP flow.core_menus FK core_menus_parent_id_fkey: orphan rows';
    ELSE
      ALTER TABLE flow.core_menus ADD CONSTRAINT core_menus_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES flow.core_menus (id) ON DELETE SET NULL NOT VALID;
      ALTER TABLE flow.core_menus VALIDATE CONSTRAINT core_menus_parent_id_fkey;
    END IF;
  END IF;
END $$;

-- flow.core_tenant_modules.core_tenant_modules_tenant_id_fkey：FK (tenant_id) REFERENCES flow.core_tenants (id)
DO $$
BEGIN
  IF to_regclass('flow.core_tenant_modules') IS NOT NULL AND to_regclass('flow.core_tenants') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_tenant_modules'::regclass AND conname = 'core_tenant_modules_tenant_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM flow.core_tenant_modules c LEFT JOIN flow.core_tenants p ON c.tenant_id = p.id
      WHERE c.tenant_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP flow.core_tenant_modules FK core_tenant_modules_tenant_id_fkey: orphan rows';
    ELSE
      ALTER TABLE flow.core_tenant_modules ADD CONSTRAINT core_tenant_modules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES flow.core_tenants (id) NOT VALID;
      ALTER TABLE flow.core_tenant_modules VALIDATE CONSTRAINT core_tenant_modules_tenant_id_fkey;
    END IF;
  END IF;
END $$;

-- flow.core_tenant_settings.core_tenant_settings_tenant_id_fkey：FK (tenant_id) REFERENCES flow.core_tenants (id)
DO $$
BEGIN
  IF to_regclass('flow.core_tenant_settings') IS NOT NULL AND to_regclass('flow.core_tenants') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_tenant_settings'::regclass AND conname = 'core_tenant_settings_tenant_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM flow.core_tenant_settings c LEFT JOIN flow.core_tenants p ON c.tenant_id = p.id
      WHERE c.tenant_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP flow.core_tenant_settings FK core_tenant_settings_tenant_id_fkey: orphan rows';
    ELSE
      ALTER TABLE flow.core_tenant_settings ADD CONSTRAINT core_tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES flow.core_tenants (id) NOT VALID;
      ALTER TABLE flow.core_tenant_settings VALIDATE CONSTRAINT core_tenant_settings_tenant_id_fkey;
    END IF;
  END IF;
END $$;

-- flow.core_tenant_usage.core_tenant_usage_tenant_id_fkey：FK (tenant_id) REFERENCES flow.core_tenants (id)
DO $$
BEGIN
  IF to_regclass('flow.core_tenant_usage') IS NOT NULL AND to_regclass('flow.core_tenants') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_tenant_usage'::regclass AND conname = 'core_tenant_usage_tenant_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM flow.core_tenant_usage c LEFT JOIN flow.core_tenants p ON c.tenant_id = p.id
      WHERE c.tenant_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP flow.core_tenant_usage FK core_tenant_usage_tenant_id_fkey: orphan rows';
    ELSE
      ALTER TABLE flow.core_tenant_usage ADD CONSTRAINT core_tenant_usage_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES flow.core_tenants (id) NOT VALID;
      ALTER TABLE flow.core_tenant_usage VALIDATE CONSTRAINT core_tenant_usage_tenant_id_fkey;
    END IF;
  END IF;
END $$;

-- flow.core_tenant_users.core_tenant_users_tenant_id_fkey：FK (tenant_id) REFERENCES flow.core_tenants (id) ON DELETE CASCADE
DO $$
BEGIN
  IF to_regclass('flow.core_tenant_users') IS NOT NULL AND to_regclass('flow.core_tenants') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_tenant_users'::regclass AND conname = 'core_tenant_users_tenant_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM flow.core_tenant_users c LEFT JOIN flow.core_tenants p ON c.tenant_id = p.id
      WHERE c.tenant_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP flow.core_tenant_users FK core_tenant_users_tenant_id_fkey: orphan rows';
    ELSE
      ALTER TABLE flow.core_tenant_users ADD CONSTRAINT core_tenant_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES flow.core_tenants (id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE flow.core_tenant_users VALIDATE CONSTRAINT core_tenant_users_tenant_id_fkey;
    END IF;
  END IF;
END $$;

-- flow.core_workflow_instances.core_workflow_instances_workflow_id_fkey：FK (workflow_id) REFERENCES flow.core_workflows (id)
DO $$
BEGIN
  IF to_regclass('flow.core_workflow_instances') IS NOT NULL AND to_regclass('flow.core_workflows') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_workflow_instances'::regclass AND conname = 'core_workflow_instances_workflow_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM flow.core_workflow_instances c LEFT JOIN flow.core_workflows p ON c.workflow_id = p.id
      WHERE c.workflow_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP flow.core_workflow_instances FK core_workflow_instances_workflow_id_fkey: orphan rows';
    ELSE
      ALTER TABLE flow.core_workflow_instances ADD CONSTRAINT core_workflow_instances_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES flow.core_workflows (id) NOT VALID;
      ALTER TABLE flow.core_workflow_instances VALIDATE CONSTRAINT core_workflow_instances_workflow_id_fkey;
    END IF;
  END IF;
END $$;

-- flow.core_workflow_tasks.core_workflow_tasks_instance_id_fkey：FK (instance_id) REFERENCES flow.core_workflow_instances (id)
DO $$
BEGIN
  IF to_regclass('flow.core_workflow_tasks') IS NOT NULL AND to_regclass('flow.core_workflow_instances') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_workflow_tasks'::regclass AND conname = 'core_workflow_tasks_instance_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM flow.core_workflow_tasks c LEFT JOIN flow.core_workflow_instances p ON c.instance_id = p.id
      WHERE c.instance_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP flow.core_workflow_tasks FK core_workflow_tasks_instance_id_fkey: orphan rows';
    ELSE
      ALTER TABLE flow.core_workflow_tasks ADD CONSTRAINT core_workflow_tasks_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES flow.core_workflow_instances (id) NOT VALID;
      ALTER TABLE flow.core_workflow_tasks VALIDATE CONSTRAINT core_workflow_tasks_instance_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_billing_invoices.core_billing_invoices_subscription_id_fkey：FK (subscription_id) REFERENCES iam.core_subscriptions (id)
DO $$
BEGIN
  IF to_regclass('iam.core_billing_invoices') IS NOT NULL AND to_regclass('iam.core_subscriptions') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_billing_invoices'::regclass AND conname = 'core_billing_invoices_subscription_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_billing_invoices c LEFT JOIN iam.core_subscriptions p ON c.subscription_id = p.id
      WHERE c.subscription_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_billing_invoices FK core_billing_invoices_subscription_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_billing_invoices ADD CONSTRAINT core_billing_invoices_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES iam.core_subscriptions (id) NOT VALID;
      ALTER TABLE iam.core_billing_invoices VALIDATE CONSTRAINT core_billing_invoices_subscription_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_billing_invoices.core_billing_invoices_tenant_id_fkey：FK (tenant_id) REFERENCES iam.core_tenants (id)
DO $$
BEGIN
  IF to_regclass('iam.core_billing_invoices') IS NOT NULL AND to_regclass('iam.core_tenants') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_billing_invoices'::regclass AND conname = 'core_billing_invoices_tenant_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_billing_invoices c LEFT JOIN iam.core_tenants p ON c.tenant_id = p.id
      WHERE c.tenant_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_billing_invoices FK core_billing_invoices_tenant_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_billing_invoices ADD CONSTRAINT core_billing_invoices_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants (id) NOT VALID;
      ALTER TABLE iam.core_billing_invoices VALIDATE CONSTRAINT core_billing_invoices_tenant_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_chat_members.core_chat_members_room_id_fkey：FK (room_id) REFERENCES iam.core_chat_rooms (id)
DO $$
BEGIN
  IF to_regclass('iam.core_chat_members') IS NOT NULL AND to_regclass('iam.core_chat_rooms') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_chat_members'::regclass AND conname = 'core_chat_members_room_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_chat_members c LEFT JOIN iam.core_chat_rooms p ON c.room_id = p.id
      WHERE c.room_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_chat_members FK core_chat_members_room_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_chat_members ADD CONSTRAINT core_chat_members_room_id_fkey FOREIGN KEY (room_id) REFERENCES iam.core_chat_rooms (id) NOT VALID;
      ALTER TABLE iam.core_chat_members VALIDATE CONSTRAINT core_chat_members_room_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_chat_messages.core_chat_messages_room_id_fkey：FK (room_id) REFERENCES iam.core_chat_rooms (id)
DO $$
BEGIN
  IF to_regclass('iam.core_chat_messages') IS NOT NULL AND to_regclass('iam.core_chat_rooms') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_chat_messages'::regclass AND conname = 'core_chat_messages_room_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_chat_messages c LEFT JOIN iam.core_chat_rooms p ON c.room_id = p.id
      WHERE c.room_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_chat_messages FK core_chat_messages_room_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_chat_messages ADD CONSTRAINT core_chat_messages_room_id_fkey FOREIGN KEY (room_id) REFERENCES iam.core_chat_rooms (id) NOT VALID;
      ALTER TABLE iam.core_chat_messages VALIDATE CONSTRAINT core_chat_messages_room_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_dict_items.core_dict_items_dict_type_id_fkey：FK (dict_type_id) REFERENCES iam.core_dict_types (id) ON DELETE CASCADE
DO $$
BEGIN
  IF to_regclass('iam.core_dict_items') IS NOT NULL AND to_regclass('iam.core_dict_types') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_dict_items'::regclass AND conname = 'core_dict_items_dict_type_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_dict_items c LEFT JOIN iam.core_dict_types p ON c.dict_type_id = p.id
      WHERE c.dict_type_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_dict_items FK core_dict_items_dict_type_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_dict_items ADD CONSTRAINT core_dict_items_dict_type_id_fkey FOREIGN KEY (dict_type_id) REFERENCES iam.core_dict_types (id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE iam.core_dict_items VALIDATE CONSTRAINT core_dict_items_dict_type_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_dict_items.core_dict_items_parent_id_fkey：FK (parent_id) REFERENCES iam.core_dict_items (id) ON DELETE SET NULL
DO $$
BEGIN
  IF to_regclass('iam.core_dict_items') IS NOT NULL AND to_regclass('iam.core_dict_items') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_dict_items'::regclass AND conname = 'core_dict_items_parent_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_dict_items c LEFT JOIN iam.core_dict_items p ON c.parent_id = p.id
      WHERE c.parent_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_dict_items FK core_dict_items_parent_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_dict_items ADD CONSTRAINT core_dict_items_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES iam.core_dict_items (id) ON DELETE SET NULL NOT VALID;
      ALTER TABLE iam.core_dict_items VALIDATE CONSTRAINT core_dict_items_parent_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_guide_lessons.core_guide_lessons_guide_id_fkey：FK (guide_id) REFERENCES iam.core_guides (id) ON DELETE CASCADE
DO $$
BEGIN
  IF to_regclass('iam.core_guide_lessons') IS NOT NULL AND to_regclass('iam.core_guides') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_guide_lessons'::regclass AND conname = 'core_guide_lessons_guide_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_guide_lessons c LEFT JOIN iam.core_guides p ON c.guide_id = p.id
      WHERE c.guide_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_guide_lessons FK core_guide_lessons_guide_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_guide_lessons ADD CONSTRAINT core_guide_lessons_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES iam.core_guides (id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE iam.core_guide_lessons VALIDATE CONSTRAINT core_guide_lessons_guide_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_guide_progress.core_guide_progress_guide_id_fkey：FK (guide_id) REFERENCES iam.core_guides (id) ON DELETE CASCADE
DO $$
BEGIN
  IF to_regclass('iam.core_guide_progress') IS NOT NULL AND to_regclass('iam.core_guides') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_guide_progress'::regclass AND conname = 'core_guide_progress_guide_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_guide_progress c LEFT JOIN iam.core_guides p ON c.guide_id = p.id
      WHERE c.guide_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_guide_progress FK core_guide_progress_guide_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_guide_progress ADD CONSTRAINT core_guide_progress_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES iam.core_guides (id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE iam.core_guide_progress VALIDATE CONSTRAINT core_guide_progress_guide_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_menus.core_menus_group_id_fkey：FK (group_id) REFERENCES iam.core_menu_groups (id) ON DELETE CASCADE
DO $$
BEGIN
  IF to_regclass('iam.core_menus') IS NOT NULL AND to_regclass('iam.core_menu_groups') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_menus'::regclass AND conname = 'core_menus_group_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_menus c LEFT JOIN iam.core_menu_groups p ON c.group_id = p.id
      WHERE c.group_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_menus FK core_menus_group_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_menus ADD CONSTRAINT core_menus_group_id_fkey FOREIGN KEY (group_id) REFERENCES iam.core_menu_groups (id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE iam.core_menus VALIDATE CONSTRAINT core_menus_group_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_menus.core_menus_parent_id_fkey：FK (parent_id) REFERENCES iam.core_menus (id) ON DELETE SET NULL
DO $$
BEGIN
  IF to_regclass('iam.core_menus') IS NOT NULL AND to_regclass('iam.core_menus') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_menus'::regclass AND conname = 'core_menus_parent_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_menus c LEFT JOIN iam.core_menus p ON c.parent_id = p.id
      WHERE c.parent_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_menus FK core_menus_parent_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_menus ADD CONSTRAINT core_menus_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES iam.core_menus (id) ON DELETE SET NULL NOT VALID;
      ALTER TABLE iam.core_menus VALIDATE CONSTRAINT core_menus_parent_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_plugin_instances.core_plugin_instances_plugin_id_fkey：FK (plugin_id) REFERENCES iam.core_plugins (id) ON DELETE CASCADE
DO $$
BEGIN
  IF to_regclass('iam.core_plugin_instances') IS NOT NULL AND to_regclass('iam.core_plugins') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_plugin_instances'::regclass AND conname = 'core_plugin_instances_plugin_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_plugin_instances c LEFT JOIN iam.core_plugins p ON c.plugin_id = p.id
      WHERE c.plugin_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_plugin_instances FK core_plugin_instances_plugin_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_plugin_instances ADD CONSTRAINT core_plugin_instances_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES iam.core_plugins (id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE iam.core_plugin_instances VALIDATE CONSTRAINT core_plugin_instances_plugin_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_plugin_reviews.core_plugin_reviews_plugin_id_fkey：FK (plugin_id) REFERENCES iam.core_plugins (id) ON DELETE CASCADE
DO $$
BEGIN
  IF to_regclass('iam.core_plugin_reviews') IS NOT NULL AND to_regclass('iam.core_plugins') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_plugin_reviews'::regclass AND conname = 'core_plugin_reviews_plugin_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_plugin_reviews c LEFT JOIN iam.core_plugins p ON c.plugin_id = p.id
      WHERE c.plugin_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_plugin_reviews FK core_plugin_reviews_plugin_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_plugin_reviews ADD CONSTRAINT core_plugin_reviews_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES iam.core_plugins (id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE iam.core_plugin_reviews VALIDATE CONSTRAINT core_plugin_reviews_plugin_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_plugin_versions.core_plugin_versions_plugin_id_fkey：FK (plugin_id) REFERENCES iam.core_plugins (id) ON DELETE CASCADE
DO $$
BEGIN
  IF to_regclass('iam.core_plugin_versions') IS NOT NULL AND to_regclass('iam.core_plugins') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_plugin_versions'::regclass AND conname = 'core_plugin_versions_plugin_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_plugin_versions c LEFT JOIN iam.core_plugins p ON c.plugin_id = p.id
      WHERE c.plugin_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_plugin_versions FK core_plugin_versions_plugin_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_plugin_versions ADD CONSTRAINT core_plugin_versions_plugin_id_fkey FOREIGN KEY (plugin_id) REFERENCES iam.core_plugins (id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE iam.core_plugin_versions VALIDATE CONSTRAINT core_plugin_versions_plugin_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_role_permissions.core_role_permissions_permission_id_fkey：FK (permission_id) REFERENCES iam.core_permissions (id)
DO $$
BEGIN
  IF to_regclass('iam.core_role_permissions') IS NOT NULL AND to_regclass('iam.core_permissions') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_role_permissions'::regclass AND conname = 'core_role_permissions_permission_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_role_permissions c LEFT JOIN iam.core_permissions p ON c.permission_id = p.id
      WHERE c.permission_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_role_permissions FK core_role_permissions_permission_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_role_permissions ADD CONSTRAINT core_role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES iam.core_permissions (id) NOT VALID;
      ALTER TABLE iam.core_role_permissions VALIDATE CONSTRAINT core_role_permissions_permission_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_role_permissions.core_role_permissions_role_id_fkey：FK (role_id) REFERENCES iam.core_roles (id)
DO $$
BEGIN
  IF to_regclass('iam.core_role_permissions') IS NOT NULL AND to_regclass('iam.core_roles') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_role_permissions'::regclass AND conname = 'core_role_permissions_role_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_role_permissions c LEFT JOIN iam.core_roles p ON c.role_id = p.id
      WHERE c.role_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_role_permissions FK core_role_permissions_role_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_role_permissions ADD CONSTRAINT core_role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES iam.core_roles (id) NOT VALID;
      ALTER TABLE iam.core_role_permissions VALIDATE CONSTRAINT core_role_permissions_role_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_subscriptions.core_subscriptions_plan_id_fkey：FK (plan_id) REFERENCES iam.core_billing_plans (id)
DO $$
BEGIN
  IF to_regclass('iam.core_subscriptions') IS NOT NULL AND to_regclass('iam.core_billing_plans') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_subscriptions'::regclass AND conname = 'core_subscriptions_plan_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_subscriptions c LEFT JOIN iam.core_billing_plans p ON c.plan_id = p.id
      WHERE c.plan_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_subscriptions FK core_subscriptions_plan_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_subscriptions ADD CONSTRAINT core_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES iam.core_billing_plans (id) NOT VALID;
      ALTER TABLE iam.core_subscriptions VALIDATE CONSTRAINT core_subscriptions_plan_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_subscriptions.core_subscriptions_tenant_id_fkey：FK (tenant_id) REFERENCES iam.core_tenants (id)
DO $$
BEGIN
  IF to_regclass('iam.core_subscriptions') IS NOT NULL AND to_regclass('iam.core_tenants') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_subscriptions'::regclass AND conname = 'core_subscriptions_tenant_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_subscriptions c LEFT JOIN iam.core_tenants p ON c.tenant_id = p.id
      WHERE c.tenant_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_subscriptions FK core_subscriptions_tenant_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_subscriptions ADD CONSTRAINT core_subscriptions_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants (id) NOT VALID;
      ALTER TABLE iam.core_subscriptions VALIDATE CONSTRAINT core_subscriptions_tenant_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_tenant_modules.core_tenant_modules_tenant_id_fkey：FK (tenant_id) REFERENCES iam.core_tenants (id)
DO $$
BEGIN
  IF to_regclass('iam.core_tenant_modules') IS NOT NULL AND to_regclass('iam.core_tenants') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_tenant_modules'::regclass AND conname = 'core_tenant_modules_tenant_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_tenant_modules c LEFT JOIN iam.core_tenants p ON c.tenant_id = p.id
      WHERE c.tenant_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_tenant_modules FK core_tenant_modules_tenant_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_tenant_modules ADD CONSTRAINT core_tenant_modules_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants (id) NOT VALID;
      ALTER TABLE iam.core_tenant_modules VALIDATE CONSTRAINT core_tenant_modules_tenant_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_tenant_plugins.core_tenant_plugins_tenant_id_fkey：FK (tenant_id) REFERENCES iam.core_tenants (id) ON DELETE CASCADE
DO $$
BEGIN
  IF to_regclass('iam.core_tenant_plugins') IS NOT NULL AND to_regclass('iam.core_tenants') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_tenant_plugins'::regclass AND conname = 'core_tenant_plugins_tenant_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_tenant_plugins c LEFT JOIN iam.core_tenants p ON c.tenant_id = p.id
      WHERE c.tenant_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_tenant_plugins FK core_tenant_plugins_tenant_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_tenant_plugins ADD CONSTRAINT core_tenant_plugins_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants (id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE iam.core_tenant_plugins VALIDATE CONSTRAINT core_tenant_plugins_tenant_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_tenant_settings.core_tenant_settings_tenant_id_fkey：FK (tenant_id) REFERENCES iam.core_tenants (id)
DO $$
BEGIN
  IF to_regclass('iam.core_tenant_settings') IS NOT NULL AND to_regclass('iam.core_tenants') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_tenant_settings'::regclass AND conname = 'core_tenant_settings_tenant_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_tenant_settings c LEFT JOIN iam.core_tenants p ON c.tenant_id = p.id
      WHERE c.tenant_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_tenant_settings FK core_tenant_settings_tenant_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_tenant_settings ADD CONSTRAINT core_tenant_settings_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants (id) NOT VALID;
      ALTER TABLE iam.core_tenant_settings VALIDATE CONSTRAINT core_tenant_settings_tenant_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_tenant_usage.core_tenant_usage_tenant_id_fkey：FK (tenant_id) REFERENCES iam.core_tenants (id)
DO $$
BEGIN
  IF to_regclass('iam.core_tenant_usage') IS NOT NULL AND to_regclass('iam.core_tenants') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_tenant_usage'::regclass AND conname = 'core_tenant_usage_tenant_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_tenant_usage c LEFT JOIN iam.core_tenants p ON c.tenant_id = p.id
      WHERE c.tenant_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_tenant_usage FK core_tenant_usage_tenant_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_tenant_usage ADD CONSTRAINT core_tenant_usage_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants (id) NOT VALID;
      ALTER TABLE iam.core_tenant_usage VALIDATE CONSTRAINT core_tenant_usage_tenant_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_tenant_users.core_tenant_users_tenant_id_fkey：FK (tenant_id) REFERENCES iam.core_tenants (id) ON DELETE CASCADE
DO $$
BEGIN
  IF to_regclass('iam.core_tenant_users') IS NOT NULL AND to_regclass('iam.core_tenants') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_tenant_users'::regclass AND conname = 'core_tenant_users_tenant_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_tenant_users c LEFT JOIN iam.core_tenants p ON c.tenant_id = p.id
      WHERE c.tenant_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_tenant_users FK core_tenant_users_tenant_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_tenant_users ADD CONSTRAINT core_tenant_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants (id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE iam.core_tenant_users VALIDATE CONSTRAINT core_tenant_users_tenant_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_usage_records.core_usage_records_tenant_id_fkey：FK (tenant_id) REFERENCES iam.core_tenants (id)
DO $$
BEGIN
  IF to_regclass('iam.core_usage_records') IS NOT NULL AND to_regclass('iam.core_tenants') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_usage_records'::regclass AND conname = 'core_usage_records_tenant_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_usage_records c LEFT JOIN iam.core_tenants p ON c.tenant_id = p.id
      WHERE c.tenant_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_usage_records FK core_usage_records_tenant_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_usage_records ADD CONSTRAINT core_usage_records_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES iam.core_tenants (id) NOT VALID;
      ALTER TABLE iam.core_usage_records VALIDATE CONSTRAINT core_usage_records_tenant_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_user_roles.core_user_roles_role_id_fkey：FK (role_id) REFERENCES iam.core_roles (id)
DO $$
BEGIN
  IF to_regclass('iam.core_user_roles') IS NOT NULL AND to_regclass('iam.core_roles') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_user_roles'::regclass AND conname = 'core_user_roles_role_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_user_roles c LEFT JOIN iam.core_roles p ON c.role_id = p.id
      WHERE c.role_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_user_roles FK core_user_roles_role_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_user_roles ADD CONSTRAINT core_user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES iam.core_roles (id) NOT VALID;
      ALTER TABLE iam.core_user_roles VALIDATE CONSTRAINT core_user_roles_role_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_user_roles.core_user_roles_user_id_fkey：FK (user_id) REFERENCES iam.core_users (id)
DO $$
BEGIN
  IF to_regclass('iam.core_user_roles') IS NOT NULL AND to_regclass('iam.core_users') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_user_roles'::regclass AND conname = 'core_user_roles_user_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_user_roles c LEFT JOIN iam.core_users p ON c.user_id = p.id
      WHERE c.user_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_user_roles FK core_user_roles_user_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_user_roles ADD CONSTRAINT core_user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES iam.core_users (id) NOT VALID;
      ALTER TABLE iam.core_user_roles VALIDATE CONSTRAINT core_user_roles_user_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_workflow_instances.core_workflow_instances_workflow_id_fkey：FK (workflow_id) REFERENCES iam.core_workflows (id)
DO $$
BEGIN
  IF to_regclass('iam.core_workflow_instances') IS NOT NULL AND to_regclass('iam.core_workflows') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_workflow_instances'::regclass AND conname = 'core_workflow_instances_workflow_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_workflow_instances c LEFT JOIN iam.core_workflows p ON c.workflow_id = p.id
      WHERE c.workflow_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_workflow_instances FK core_workflow_instances_workflow_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_workflow_instances ADD CONSTRAINT core_workflow_instances_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES iam.core_workflows (id) NOT VALID;
      ALTER TABLE iam.core_workflow_instances VALIDATE CONSTRAINT core_workflow_instances_workflow_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.core_workflow_tasks.core_workflow_tasks_instance_id_fkey：FK (instance_id) REFERENCES iam.core_workflow_instances (id)
DO $$
BEGIN
  IF to_regclass('iam.core_workflow_tasks') IS NOT NULL AND to_regclass('iam.core_workflow_instances') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_workflow_tasks'::regclass AND conname = 'core_workflow_tasks_instance_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.core_workflow_tasks c LEFT JOIN iam.core_workflow_instances p ON c.instance_id = p.id
      WHERE c.instance_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.core_workflow_tasks FK core_workflow_tasks_instance_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.core_workflow_tasks ADD CONSTRAINT core_workflow_tasks_instance_id_fkey FOREIGN KEY (instance_id) REFERENCES iam.core_workflow_instances (id) NOT VALID;
      ALTER TABLE iam.core_workflow_tasks VALIDATE CONSTRAINT core_workflow_tasks_instance_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.sessions.sessions_user_id_fkey：FK (user_id) REFERENCES public.core_users (id) ON DELETE CASCADE
DO $$
BEGIN
  IF to_regclass('iam.sessions') IS NOT NULL AND to_regclass('public.core_users') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.sessions'::regclass AND conname = 'sessions_user_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.sessions c LEFT JOIN public.core_users p ON c.user_id = p.id
      WHERE c.user_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.sessions FK sessions_user_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.sessions ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.core_users (id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE iam.sessions VALIDATE CONSTRAINT sessions_user_id_fkey;
    END IF;
  END IF;
END $$;

-- iam.tool_permissions.tool_permissions_tenant_permission_id_fkey：FK (tenant_permission_id) REFERENCES iam.tenant_permissions (id) ON DELETE CASCADE
DO $$
BEGIN
  IF to_regclass('iam.tool_permissions') IS NOT NULL AND to_regclass('iam.tenant_permissions') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.tool_permissions'::regclass AND conname = 'tool_permissions_tenant_permission_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM iam.tool_permissions c LEFT JOIN iam.tenant_permissions p ON c.tenant_permission_id = p.id
      WHERE c.tenant_permission_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP iam.tool_permissions FK tool_permissions_tenant_permission_id_fkey: orphan rows';
    ELSE
      ALTER TABLE iam.tool_permissions ADD CONSTRAINT tool_permissions_tenant_permission_id_fkey FOREIGN KEY (tenant_permission_id) REFERENCES iam.tenant_permissions (id) ON DELETE CASCADE NOT VALID;
      ALTER TABLE iam.tool_permissions VALIDATE CONSTRAINT tool_permissions_tenant_permission_id_fkey;
    END IF;
  END IF;
END $$;

-- public.equipment_inspections.equipment_inspections_equipment_id_fkey：FK (equipment_id) REFERENCES public.equipment (id) ON DELETE RESTRICT
DO $$
BEGIN
  IF to_regclass('public.equipment_inspections') IS NOT NULL AND to_regclass('public.equipment') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.equipment_inspections'::regclass AND conname = 'equipment_inspections_equipment_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM public.equipment_inspections c LEFT JOIN public.equipment p ON c.equipment_id = p.id
      WHERE c.equipment_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP public.equipment_inspections FK equipment_inspections_equipment_id_fkey: orphan rows';
    ELSE
      ALTER TABLE public.equipment_inspections ADD CONSTRAINT equipment_inspections_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment (id) ON DELETE RESTRICT NOT VALID;
      ALTER TABLE public.equipment_inspections VALIDATE CONSTRAINT equipment_inspections_equipment_id_fkey;
    END IF;
  END IF;
END $$;

-- public.equipment_maintenance_records.equipment_maintenance_records_equipment_id_fkey：FK (equipment_id) REFERENCES public.equipment (id) ON DELETE RESTRICT
DO $$
BEGIN
  IF to_regclass('public.equipment_maintenance_records') IS NOT NULL AND to_regclass('public.equipment') IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.equipment_maintenance_records'::regclass AND conname = 'equipment_maintenance_records_equipment_id_fkey') THEN
    IF EXISTS (
      SELECT 1 FROM public.equipment_maintenance_records c LEFT JOIN public.equipment p ON c.equipment_id = p.id
      WHERE c.equipment_id IS NOT NULL AND p.id IS NULL
    ) THEN
      RAISE NOTICE 'SKIP public.equipment_maintenance_records FK equipment_maintenance_records_equipment_id_fkey: orphan rows';
    ELSE
      ALTER TABLE public.equipment_maintenance_records ADD CONSTRAINT equipment_maintenance_records_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment (id) ON DELETE RESTRICT NOT VALID;
      ALTER TABLE public.equipment_maintenance_records VALIDATE CONSTRAINT equipment_maintenance_records_equipment_id_fkey;
    END IF;
  END IF;
END $$;
