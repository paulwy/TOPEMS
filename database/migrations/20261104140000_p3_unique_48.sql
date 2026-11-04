-- ============================================================
-- P3-UNIQUE: prod 补齐 48 条 UNIQUE 约束
--
-- 依据：prod vs topems_test 只读盘点 2026-11-04，按 (schema.table, contype, conname)
--   取差集并按表分组；本文件为其中 48 条。约束名取自 test 侧实测定义（prod 尚无同名约束），
--   列清单由 pg_constraint.conkey/confkey 解析，非猜测。
-- 守卫：表不存在 / 约束已存在 / 数据不满足时均跳过并 RAISE NOTICE，不中断后续条目。
-- 幂等：重复执行时约束已存在即跳过。
-- 回滚：DROP CONSTRAINT <name> ON <schema.table>（逐条可逆，无数据改写）。
-- ============================================================

SET lock_timeout = '5s';

-- ehs.qa_ehs_hazard_factors.qa_ehs_hazard_factors_factor_no_key：UNIQUE (factor_no)
DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_hazard_factors') IS NOT NULL
     AND to_regclass('ehs.qa_ehs_hazard_factors_factor_no_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'ehs.qa_ehs_hazard_factors'::regclass AND conname = 'qa_ehs_hazard_factors_factor_no_key') THEN
    IF EXISTS (SELECT 1 FROM ehs.qa_ehs_hazard_factors WHERE TRUE AND factor_no IS NOT NULL GROUP BY factor_no HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP ehs.qa_ehs_hazard_factors UNIQUE qa_ehs_hazard_factors_factor_no_key: duplicate factor_no';
    ELSE
      ALTER TABLE ehs.qa_ehs_hazard_factors ADD CONSTRAINT qa_ehs_hazard_factors_factor_no_key UNIQUE (factor_no);
    END IF;
  END IF;
END $$;

-- ehs.qa_ehs_hazardous_materials.qa_ehs_hazardous_materials_material_no_key：UNIQUE (material_no)
DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_hazardous_materials') IS NOT NULL
     AND to_regclass('ehs.qa_ehs_hazardous_materials_material_no_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'ehs.qa_ehs_hazardous_materials'::regclass AND conname = 'qa_ehs_hazardous_materials_material_no_key') THEN
    IF EXISTS (SELECT 1 FROM ehs.qa_ehs_hazardous_materials WHERE TRUE AND material_no IS NOT NULL GROUP BY material_no HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP ehs.qa_ehs_hazardous_materials UNIQUE qa_ehs_hazardous_materials_material_no_key: duplicate material_no';
    ELSE
      ALTER TABLE ehs.qa_ehs_hazardous_materials ADD CONSTRAINT qa_ehs_hazardous_materials_material_no_key UNIQUE (material_no);
    END IF;
  END IF;
END $$;

-- ehs.qa_ehs_hazards.qa_ehs_hazards_hazard_no_key：UNIQUE (hazard_no)
DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_hazards') IS NOT NULL
     AND to_regclass('ehs.qa_ehs_hazards_hazard_no_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'ehs.qa_ehs_hazards'::regclass AND conname = 'qa_ehs_hazards_hazard_no_key') THEN
    IF EXISTS (SELECT 1 FROM ehs.qa_ehs_hazards WHERE TRUE AND hazard_no IS NOT NULL GROUP BY hazard_no HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP ehs.qa_ehs_hazards UNIQUE qa_ehs_hazards_hazard_no_key: duplicate hazard_no';
    ELSE
      ALTER TABLE ehs.qa_ehs_hazards ADD CONSTRAINT qa_ehs_hazards_hazard_no_key UNIQUE (hazard_no);
    END IF;
  END IF;
END $$;

-- finance.core_finance_approval_workflows.unique_doc_approval：UNIQUE (tenant_id,doc_type,doc_id)
DO $$
BEGIN
  IF to_regclass('finance.core_finance_approval_workflows') IS NOT NULL
     AND to_regclass('finance.unique_doc_approval') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'finance.core_finance_approval_workflows'::regclass AND conname = 'unique_doc_approval') THEN
    IF EXISTS (SELECT 1 FROM finance.core_finance_approval_workflows WHERE TRUE AND tenant_id IS NOT NULL AND doc_type IS NOT NULL AND doc_id IS NOT NULL GROUP BY tenant_id,doc_type,doc_id HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP finance.core_finance_approval_workflows UNIQUE unique_doc_approval: duplicate tenant_id,doc_type,doc_id';
    ELSE
      ALTER TABLE finance.core_finance_approval_workflows ADD CONSTRAINT unique_doc_approval UNIQUE (tenant_id,doc_type,doc_id);
    END IF;
  END IF;
END $$;

-- flow.core_file_permissions.core_file_permissions_file_id_user_id_key：UNIQUE (file_id,user_id)
DO $$
BEGIN
  IF to_regclass('flow.core_file_permissions') IS NOT NULL
     AND to_regclass('flow.core_file_permissions_file_id_user_id_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_file_permissions'::regclass AND conname = 'core_file_permissions_file_id_user_id_key') THEN
    IF EXISTS (SELECT 1 FROM flow.core_file_permissions WHERE TRUE AND file_id IS NOT NULL AND user_id IS NOT NULL GROUP BY file_id,user_id HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP flow.core_file_permissions UNIQUE core_file_permissions_file_id_user_id_key: duplicate file_id,user_id';
    ELSE
      ALTER TABLE flow.core_file_permissions ADD CONSTRAINT core_file_permissions_file_id_user_id_key UNIQUE (file_id,user_id);
    END IF;
  END IF;
END $$;

-- flow.core_master_data_refs.core_master_data_refs_tenant_id_domain_code_key：UNIQUE (tenant_id,domain,code)
DO $$
BEGIN
  IF to_regclass('flow.core_master_data_refs') IS NOT NULL
     AND to_regclass('flow.core_master_data_refs_tenant_id_domain_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_master_data_refs'::regclass AND conname = 'core_master_data_refs_tenant_id_domain_code_key') THEN
    IF EXISTS (SELECT 1 FROM flow.core_master_data_refs WHERE TRUE AND tenant_id IS NOT NULL AND domain IS NOT NULL AND code IS NOT NULL GROUP BY tenant_id,domain,code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP flow.core_master_data_refs UNIQUE core_master_data_refs_tenant_id_domain_code_key: duplicate tenant_id,domain,code';
    ELSE
      ALTER TABLE flow.core_master_data_refs ADD CONSTRAINT core_master_data_refs_tenant_id_domain_code_key UNIQUE (tenant_id,domain,code);
    END IF;
  END IF;
END $$;

-- flow.core_menu_groups.core_menu_groups_tenant_id_code_key：UNIQUE (tenant_id,code)
DO $$
BEGIN
  IF to_regclass('flow.core_menu_groups') IS NOT NULL
     AND to_regclass('flow.core_menu_groups_tenant_id_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_menu_groups'::regclass AND conname = 'core_menu_groups_tenant_id_code_key') THEN
    IF EXISTS (SELECT 1 FROM flow.core_menu_groups WHERE TRUE AND tenant_id IS NOT NULL AND code IS NOT NULL GROUP BY tenant_id,code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP flow.core_menu_groups UNIQUE core_menu_groups_tenant_id_code_key: duplicate tenant_id,code';
    ELSE
      ALTER TABLE flow.core_menu_groups ADD CONSTRAINT core_menu_groups_tenant_id_code_key UNIQUE (tenant_id,code);
    END IF;
  END IF;
END $$;

-- flow.core_menus.core_menus_tenant_id_code_key：UNIQUE (tenant_id,code)
DO $$
BEGIN
  IF to_regclass('flow.core_menus') IS NOT NULL
     AND to_regclass('flow.core_menus_tenant_id_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_menus'::regclass AND conname = 'core_menus_tenant_id_code_key') THEN
    IF EXISTS (SELECT 1 FROM flow.core_menus WHERE TRUE AND tenant_id IS NOT NULL AND code IS NOT NULL GROUP BY tenant_id,code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP flow.core_menus UNIQUE core_menus_tenant_id_code_key: duplicate tenant_id,code';
    ELSE
      ALTER TABLE flow.core_menus ADD CONSTRAINT core_menus_tenant_id_code_key UNIQUE (tenant_id,code);
    END IF;
  END IF;
END $$;

-- flow.core_migration_history.core_migration_history_plugin_name_version_key：UNIQUE (plugin_name,version)
DO $$
BEGIN
  IF to_regclass('flow.core_migration_history') IS NOT NULL
     AND to_regclass('flow.core_migration_history_plugin_name_version_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_migration_history'::regclass AND conname = 'core_migration_history_plugin_name_version_key') THEN
    IF EXISTS (SELECT 1 FROM flow.core_migration_history WHERE TRUE AND plugin_name IS NOT NULL AND version IS NOT NULL GROUP BY plugin_name,version HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP flow.core_migration_history UNIQUE core_migration_history_plugin_name_version_key: duplicate plugin_name,version';
    ELSE
      ALTER TABLE flow.core_migration_history ADD CONSTRAINT core_migration_history_plugin_name_version_key UNIQUE (plugin_name,version);
    END IF;
  END IF;
END $$;

-- flow.core_tenant_modules.core_tenant_modules_tenant_id_module_code_key：UNIQUE (tenant_id,module_code)
DO $$
BEGIN
  IF to_regclass('flow.core_tenant_modules') IS NOT NULL
     AND to_regclass('flow.core_tenant_modules_tenant_id_module_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_tenant_modules'::regclass AND conname = 'core_tenant_modules_tenant_id_module_code_key') THEN
    IF EXISTS (SELECT 1 FROM flow.core_tenant_modules WHERE TRUE AND tenant_id IS NOT NULL AND module_code IS NOT NULL GROUP BY tenant_id,module_code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP flow.core_tenant_modules UNIQUE core_tenant_modules_tenant_id_module_code_key: duplicate tenant_id,module_code';
    ELSE
      ALTER TABLE flow.core_tenant_modules ADD CONSTRAINT core_tenant_modules_tenant_id_module_code_key UNIQUE (tenant_id,module_code);
    END IF;
  END IF;
END $$;

-- flow.core_tenant_settings.core_tenant_settings_tenant_id_setting_key_key：UNIQUE (tenant_id,setting_key)
DO $$
BEGIN
  IF to_regclass('flow.core_tenant_settings') IS NOT NULL
     AND to_regclass('flow.core_tenant_settings_tenant_id_setting_key_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_tenant_settings'::regclass AND conname = 'core_tenant_settings_tenant_id_setting_key_key') THEN
    IF EXISTS (SELECT 1 FROM flow.core_tenant_settings WHERE TRUE AND tenant_id IS NOT NULL AND setting_key IS NOT NULL GROUP BY tenant_id,setting_key HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP flow.core_tenant_settings UNIQUE core_tenant_settings_tenant_id_setting_key_key: duplicate tenant_id,setting_key';
    ELSE
      ALTER TABLE flow.core_tenant_settings ADD CONSTRAINT core_tenant_settings_tenant_id_setting_key_key UNIQUE (tenant_id,setting_key);
    END IF;
  END IF;
END $$;

-- flow.core_tenant_usage.core_tenant_usage_tenant_id_period_start_key：UNIQUE (tenant_id,period_start)
DO $$
BEGIN
  IF to_regclass('flow.core_tenant_usage') IS NOT NULL
     AND to_regclass('flow.core_tenant_usage_tenant_id_period_start_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_tenant_usage'::regclass AND conname = 'core_tenant_usage_tenant_id_period_start_key') THEN
    IF EXISTS (SELECT 1 FROM flow.core_tenant_usage WHERE TRUE AND tenant_id IS NOT NULL AND period_start IS NOT NULL GROUP BY tenant_id,period_start HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP flow.core_tenant_usage UNIQUE core_tenant_usage_tenant_id_period_start_key: duplicate tenant_id,period_start';
    ELSE
      ALTER TABLE flow.core_tenant_usage ADD CONSTRAINT core_tenant_usage_tenant_id_period_start_key UNIQUE (tenant_id,period_start);
    END IF;
  END IF;
END $$;

-- flow.core_tenant_users.core_tenant_users_tenant_id_email_key：UNIQUE (tenant_id,email)
DO $$
BEGIN
  IF to_regclass('flow.core_tenant_users') IS NOT NULL
     AND to_regclass('flow.core_tenant_users_tenant_id_email_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_tenant_users'::regclass AND conname = 'core_tenant_users_tenant_id_email_key') THEN
    IF EXISTS (SELECT 1 FROM flow.core_tenant_users WHERE TRUE AND tenant_id IS NOT NULL AND email IS NOT NULL GROUP BY tenant_id,email HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP flow.core_tenant_users UNIQUE core_tenant_users_tenant_id_email_key: duplicate tenant_id,email';
    ELSE
      ALTER TABLE flow.core_tenant_users ADD CONSTRAINT core_tenant_users_tenant_id_email_key UNIQUE (tenant_id,email);
    END IF;
  END IF;
END $$;

-- flow.core_tenant_users.core_tenant_users_tenant_id_user_id_key：UNIQUE (tenant_id,user_id)
DO $$
BEGIN
  IF to_regclass('flow.core_tenant_users') IS NOT NULL
     AND to_regclass('flow.core_tenant_users_tenant_id_user_id_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_tenant_users'::regclass AND conname = 'core_tenant_users_tenant_id_user_id_key') THEN
    IF EXISTS (SELECT 1 FROM flow.core_tenant_users WHERE TRUE AND tenant_id IS NOT NULL AND user_id IS NOT NULL GROUP BY tenant_id,user_id HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP flow.core_tenant_users UNIQUE core_tenant_users_tenant_id_user_id_key: duplicate tenant_id,user_id';
    ELSE
      ALTER TABLE flow.core_tenant_users ADD CONSTRAINT core_tenant_users_tenant_id_user_id_key UNIQUE (tenant_id,user_id);
    END IF;
  END IF;
END $$;

-- flow.core_tenants.core_tenants_code_key：UNIQUE (code)
DO $$
BEGIN
  IF to_regclass('flow.core_tenants') IS NOT NULL
     AND to_regclass('flow.core_tenants_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'flow.core_tenants'::regclass AND conname = 'core_tenants_code_key') THEN
    IF EXISTS (SELECT 1 FROM flow.core_tenants WHERE TRUE AND code IS NOT NULL GROUP BY code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP flow.core_tenants UNIQUE core_tenants_code_key: duplicate code';
    ELSE
      ALTER TABLE flow.core_tenants ADD CONSTRAINT core_tenants_code_key UNIQUE (code);
    END IF;
  END IF;
END $$;

-- iam.core_billing_invoices.core_billing_invoices_tenant_id_invoice_number_key：UNIQUE (tenant_id,invoice_number)
DO $$
BEGIN
  IF to_regclass('iam.core_billing_invoices') IS NOT NULL
     AND to_regclass('iam.core_billing_invoices_tenant_id_invoice_number_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_billing_invoices'::regclass AND conname = 'core_billing_invoices_tenant_id_invoice_number_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_billing_invoices WHERE TRUE AND tenant_id IS NOT NULL AND invoice_number IS NOT NULL GROUP BY tenant_id,invoice_number HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_billing_invoices UNIQUE core_billing_invoices_tenant_id_invoice_number_key: duplicate tenant_id,invoice_number';
    ELSE
      ALTER TABLE iam.core_billing_invoices ADD CONSTRAINT core_billing_invoices_tenant_id_invoice_number_key UNIQUE (tenant_id,invoice_number);
    END IF;
  END IF;
END $$;

-- iam.core_billing_plans.core_billing_plans_code_key：UNIQUE (code)
DO $$
BEGIN
  IF to_regclass('iam.core_billing_plans') IS NOT NULL
     AND to_regclass('iam.core_billing_plans_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_billing_plans'::regclass AND conname = 'core_billing_plans_code_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_billing_plans WHERE TRUE AND code IS NOT NULL GROUP BY code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_billing_plans UNIQUE core_billing_plans_code_key: duplicate code';
    ELSE
      ALTER TABLE iam.core_billing_plans ADD CONSTRAINT core_billing_plans_code_key UNIQUE (code);
    END IF;
  END IF;
END $$;

-- iam.core_dict_items.core_dict_items_dict_type_id_code_key：UNIQUE (dict_type_id,code)
DO $$
BEGIN
  IF to_regclass('iam.core_dict_items') IS NOT NULL
     AND to_regclass('iam.core_dict_items_dict_type_id_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_dict_items'::regclass AND conname = 'core_dict_items_dict_type_id_code_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_dict_items WHERE TRUE AND dict_type_id IS NOT NULL AND code IS NOT NULL GROUP BY dict_type_id,code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_dict_items UNIQUE core_dict_items_dict_type_id_code_key: duplicate dict_type_id,code';
    ELSE
      ALTER TABLE iam.core_dict_items ADD CONSTRAINT core_dict_items_dict_type_id_code_key UNIQUE (dict_type_id,code);
    END IF;
  END IF;
END $$;

-- iam.core_dict_types.core_dict_types_code_key：UNIQUE (code)
DO $$
BEGIN
  IF to_regclass('iam.core_dict_types') IS NOT NULL
     AND to_regclass('iam.core_dict_types_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_dict_types'::regclass AND conname = 'core_dict_types_code_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_dict_types WHERE TRUE AND code IS NOT NULL GROUP BY code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_dict_types UNIQUE core_dict_types_code_key: duplicate code';
    ELSE
      ALTER TABLE iam.core_dict_types ADD CONSTRAINT core_dict_types_code_key UNIQUE (code);
    END IF;
  END IF;
END $$;

-- iam.core_guide_progress.core_guide_progress_guide_id_user_id_key：UNIQUE (guide_id,user_id)
DO $$
BEGIN
  IF to_regclass('iam.core_guide_progress') IS NOT NULL
     AND to_regclass('iam.core_guide_progress_guide_id_user_id_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_guide_progress'::regclass AND conname = 'core_guide_progress_guide_id_user_id_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_guide_progress WHERE TRUE AND guide_id IS NOT NULL AND user_id IS NOT NULL GROUP BY guide_id,user_id HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_guide_progress UNIQUE core_guide_progress_guide_id_user_id_key: duplicate guide_id,user_id';
    ELSE
      ALTER TABLE iam.core_guide_progress ADD CONSTRAINT core_guide_progress_guide_id_user_id_key UNIQUE (guide_id,user_id);
    END IF;
  END IF;
END $$;

-- iam.core_menu_groups.core_menu_groups_tenant_id_code_key：UNIQUE (tenant_id,code)
DO $$
BEGIN
  IF to_regclass('iam.core_menu_groups') IS NOT NULL
     AND to_regclass('iam.core_menu_groups_tenant_id_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_menu_groups'::regclass AND conname = 'core_menu_groups_tenant_id_code_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_menu_groups WHERE TRUE AND tenant_id IS NOT NULL AND code IS NOT NULL GROUP BY tenant_id,code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_menu_groups UNIQUE core_menu_groups_tenant_id_code_key: duplicate tenant_id,code';
    ELSE
      ALTER TABLE iam.core_menu_groups ADD CONSTRAINT core_menu_groups_tenant_id_code_key UNIQUE (tenant_id,code);
    END IF;
  END IF;
END $$;

-- iam.core_menus.core_menus_tenant_id_code_key：UNIQUE (tenant_id,code)
DO $$
BEGIN
  IF to_regclass('iam.core_menus') IS NOT NULL
     AND to_regclass('iam.core_menus_tenant_id_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_menus'::regclass AND conname = 'core_menus_tenant_id_code_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_menus WHERE TRUE AND tenant_id IS NOT NULL AND code IS NOT NULL GROUP BY tenant_id,code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_menus UNIQUE core_menus_tenant_id_code_key: duplicate tenant_id,code';
    ELSE
      ALTER TABLE iam.core_menus ADD CONSTRAINT core_menus_tenant_id_code_key UNIQUE (tenant_id,code);
    END IF;
  END IF;
END $$;

-- iam.core_migration_history.core_migration_history_plugin_name_version_key：UNIQUE (plugin_name,version)
DO $$
BEGIN
  IF to_regclass('iam.core_migration_history') IS NOT NULL
     AND to_regclass('iam.core_migration_history_plugin_name_version_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_migration_history'::regclass AND conname = 'core_migration_history_plugin_name_version_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_migration_history WHERE TRUE AND plugin_name IS NOT NULL AND version IS NOT NULL GROUP BY plugin_name,version HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_migration_history UNIQUE core_migration_history_plugin_name_version_key: duplicate plugin_name,version';
    ELSE
      ALTER TABLE iam.core_migration_history ADD CONSTRAINT core_migration_history_plugin_name_version_key UNIQUE (plugin_name,version);
    END IF;
  END IF;
END $$;

-- iam.core_permissions.core_permissions_code_key：UNIQUE (code)
DO $$
BEGIN
  IF to_regclass('iam.core_permissions') IS NOT NULL
     AND to_regclass('iam.core_permissions_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_permissions'::regclass AND conname = 'core_permissions_code_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_permissions WHERE TRUE AND code IS NOT NULL GROUP BY code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_permissions UNIQUE core_permissions_code_key: duplicate code';
    ELSE
      ALTER TABLE iam.core_permissions ADD CONSTRAINT core_permissions_code_key UNIQUE (code);
    END IF;
  END IF;
END $$;

-- iam.core_plugin_categories.core_plugin_categories_code_key：UNIQUE (code)
DO $$
BEGIN
  IF to_regclass('iam.core_plugin_categories') IS NOT NULL
     AND to_regclass('iam.core_plugin_categories_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_plugin_categories'::regclass AND conname = 'core_plugin_categories_code_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_plugin_categories WHERE TRUE AND code IS NOT NULL GROUP BY code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_plugin_categories UNIQUE core_plugin_categories_code_key: duplicate code';
    ELSE
      ALTER TABLE iam.core_plugin_categories ADD CONSTRAINT core_plugin_categories_code_key UNIQUE (code);
    END IF;
  END IF;
END $$;

-- iam.core_plugin_instances.core_plugin_instances_plugin_id_key：UNIQUE (plugin_id)
DO $$
BEGIN
  IF to_regclass('iam.core_plugin_instances') IS NOT NULL
     AND to_regclass('iam.core_plugin_instances_plugin_id_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_plugin_instances'::regclass AND conname = 'core_plugin_instances_plugin_id_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_plugin_instances WHERE TRUE AND plugin_id IS NOT NULL GROUP BY plugin_id HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_plugin_instances UNIQUE core_plugin_instances_plugin_id_key: duplicate plugin_id';
    ELSE
      ALTER TABLE iam.core_plugin_instances ADD CONSTRAINT core_plugin_instances_plugin_id_key UNIQUE (plugin_id);
    END IF;
  END IF;
END $$;

-- iam.core_plugin_permissions.core_plugin_permissions_plugin_code_permission_code_key：UNIQUE (plugin_code,permission_code)
DO $$
BEGIN
  IF to_regclass('iam.core_plugin_permissions') IS NOT NULL
     AND to_regclass('iam.core_plugin_permissions_plugin_code_permission_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_plugin_permissions'::regclass AND conname = 'core_plugin_permissions_plugin_code_permission_code_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_plugin_permissions WHERE TRUE AND plugin_code IS NOT NULL AND permission_code IS NOT NULL GROUP BY plugin_code,permission_code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_plugin_permissions UNIQUE core_plugin_permissions_plugin_code_permission_code_key: duplicate plugin_code,permission_code';
    ELSE
      ALTER TABLE iam.core_plugin_permissions ADD CONSTRAINT core_plugin_permissions_plugin_code_permission_code_key UNIQUE (plugin_code,permission_code);
    END IF;
  END IF;
END $$;

-- iam.core_plugin_pricing.core_plugin_pricing_plugin_code_key：UNIQUE (plugin_code)
DO $$
BEGIN
  IF to_regclass('iam.core_plugin_pricing') IS NOT NULL
     AND to_regclass('iam.core_plugin_pricing_plugin_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_plugin_pricing'::regclass AND conname = 'core_plugin_pricing_plugin_code_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_plugin_pricing WHERE TRUE AND plugin_code IS NOT NULL GROUP BY plugin_code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_plugin_pricing UNIQUE core_plugin_pricing_plugin_code_key: duplicate plugin_code';
    ELSE
      ALTER TABLE iam.core_plugin_pricing ADD CONSTRAINT core_plugin_pricing_plugin_code_key UNIQUE (plugin_code);
    END IF;
  END IF;
END $$;

-- iam.core_plugin_versions.core_plugin_versions_plugin_id_version_key：UNIQUE (plugin_id,version)
DO $$
BEGIN
  IF to_regclass('iam.core_plugin_versions') IS NOT NULL
     AND to_regclass('iam.core_plugin_versions_plugin_id_version_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_plugin_versions'::regclass AND conname = 'core_plugin_versions_plugin_id_version_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_plugin_versions WHERE TRUE AND plugin_id IS NOT NULL AND version IS NOT NULL GROUP BY plugin_id,version HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_plugin_versions UNIQUE core_plugin_versions_plugin_id_version_key: duplicate plugin_id,version';
    ELSE
      ALTER TABLE iam.core_plugin_versions ADD CONSTRAINT core_plugin_versions_plugin_id_version_key UNIQUE (plugin_id,version);
    END IF;
  END IF;
END $$;

-- iam.core_plugins.core_plugins_code_key：UNIQUE (code)
DO $$
BEGIN
  IF to_regclass('iam.core_plugins') IS NOT NULL
     AND to_regclass('iam.core_plugins_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_plugins'::regclass AND conname = 'core_plugins_code_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_plugins WHERE TRUE AND code IS NOT NULL GROUP BY code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_plugins UNIQUE core_plugins_code_key: duplicate code';
    ELSE
      ALTER TABLE iam.core_plugins ADD CONSTRAINT core_plugins_code_key UNIQUE (code);
    END IF;
  END IF;
END $$;

-- iam.core_roles.core_roles_name_key：UNIQUE (name)
DO $$
BEGIN
  IF to_regclass('iam.core_roles') IS NOT NULL
     AND to_regclass('iam.core_roles_name_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_roles'::regclass AND conname = 'core_roles_name_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_roles WHERE TRUE AND name IS NOT NULL GROUP BY name HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_roles UNIQUE core_roles_name_key: duplicate name';
    ELSE
      ALTER TABLE iam.core_roles ADD CONSTRAINT core_roles_name_key UNIQUE (name);
    END IF;
  END IF;
END $$;

-- iam.core_subscriptions.core_subscriptions_tenant_id_key：UNIQUE (tenant_id)
DO $$
BEGIN
  IF to_regclass('iam.core_subscriptions') IS NOT NULL
     AND to_regclass('iam.core_subscriptions_tenant_id_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_subscriptions'::regclass AND conname = 'core_subscriptions_tenant_id_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_subscriptions WHERE TRUE AND tenant_id IS NOT NULL GROUP BY tenant_id HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_subscriptions UNIQUE core_subscriptions_tenant_id_key: duplicate tenant_id';
    ELSE
      ALTER TABLE iam.core_subscriptions ADD CONSTRAINT core_subscriptions_tenant_id_key UNIQUE (tenant_id);
    END IF;
  END IF;
END $$;

-- iam.core_tenant_modules.core_tenant_modules_tenant_id_module_code_key：UNIQUE (tenant_id,module_code)
DO $$
BEGIN
  IF to_regclass('iam.core_tenant_modules') IS NOT NULL
     AND to_regclass('iam.core_tenant_modules_tenant_id_module_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_tenant_modules'::regclass AND conname = 'core_tenant_modules_tenant_id_module_code_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_tenant_modules WHERE TRUE AND tenant_id IS NOT NULL AND module_code IS NOT NULL GROUP BY tenant_id,module_code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_tenant_modules UNIQUE core_tenant_modules_tenant_id_module_code_key: duplicate tenant_id,module_code';
    ELSE
      ALTER TABLE iam.core_tenant_modules ADD CONSTRAINT core_tenant_modules_tenant_id_module_code_key UNIQUE (tenant_id,module_code);
    END IF;
  END IF;
END $$;

-- iam.core_tenant_plugins.core_tenant_plugins_tenant_id_plugin_id_key：UNIQUE (tenant_id,plugin_id)
DO $$
BEGIN
  IF to_regclass('iam.core_tenant_plugins') IS NOT NULL
     AND to_regclass('iam.core_tenant_plugins_tenant_id_plugin_id_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_tenant_plugins'::regclass AND conname = 'core_tenant_plugins_tenant_id_plugin_id_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_tenant_plugins WHERE TRUE AND tenant_id IS NOT NULL AND plugin_id IS NOT NULL GROUP BY tenant_id,plugin_id HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_tenant_plugins UNIQUE core_tenant_plugins_tenant_id_plugin_id_key: duplicate tenant_id,plugin_id';
    ELSE
      ALTER TABLE iam.core_tenant_plugins ADD CONSTRAINT core_tenant_plugins_tenant_id_plugin_id_key UNIQUE (tenant_id,plugin_id);
    END IF;
  END IF;
END $$;

-- iam.core_tenant_settings.core_tenant_settings_tenant_id_setting_key_key：UNIQUE (tenant_id,setting_key)
DO $$
BEGIN
  IF to_regclass('iam.core_tenant_settings') IS NOT NULL
     AND to_regclass('iam.core_tenant_settings_tenant_id_setting_key_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_tenant_settings'::regclass AND conname = 'core_tenant_settings_tenant_id_setting_key_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_tenant_settings WHERE TRUE AND tenant_id IS NOT NULL AND setting_key IS NOT NULL GROUP BY tenant_id,setting_key HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_tenant_settings UNIQUE core_tenant_settings_tenant_id_setting_key_key: duplicate tenant_id,setting_key';
    ELSE
      ALTER TABLE iam.core_tenant_settings ADD CONSTRAINT core_tenant_settings_tenant_id_setting_key_key UNIQUE (tenant_id,setting_key);
    END IF;
  END IF;
END $$;

-- iam.core_tenant_usage.core_tenant_usage_tenant_id_period_start_key：UNIQUE (tenant_id,period_start)
DO $$
BEGIN
  IF to_regclass('iam.core_tenant_usage') IS NOT NULL
     AND to_regclass('iam.core_tenant_usage_tenant_id_period_start_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_tenant_usage'::regclass AND conname = 'core_tenant_usage_tenant_id_period_start_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_tenant_usage WHERE TRUE AND tenant_id IS NOT NULL AND period_start IS NOT NULL GROUP BY tenant_id,period_start HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_tenant_usage UNIQUE core_tenant_usage_tenant_id_period_start_key: duplicate tenant_id,period_start';
    ELSE
      ALTER TABLE iam.core_tenant_usage ADD CONSTRAINT core_tenant_usage_tenant_id_period_start_key UNIQUE (tenant_id,period_start);
    END IF;
  END IF;
END $$;

-- iam.core_tenant_users.core_tenant_users_tenant_id_email_key：UNIQUE (tenant_id,email)
DO $$
BEGIN
  IF to_regclass('iam.core_tenant_users') IS NOT NULL
     AND to_regclass('iam.core_tenant_users_tenant_id_email_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_tenant_users'::regclass AND conname = 'core_tenant_users_tenant_id_email_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_tenant_users WHERE TRUE AND tenant_id IS NOT NULL AND email IS NOT NULL GROUP BY tenant_id,email HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_tenant_users UNIQUE core_tenant_users_tenant_id_email_key: duplicate tenant_id,email';
    ELSE
      ALTER TABLE iam.core_tenant_users ADD CONSTRAINT core_tenant_users_tenant_id_email_key UNIQUE (tenant_id,email);
    END IF;
  END IF;
END $$;

-- iam.core_tenant_users.core_tenant_users_tenant_id_user_id_key：UNIQUE (tenant_id,user_id)
DO $$
BEGIN
  IF to_regclass('iam.core_tenant_users') IS NOT NULL
     AND to_regclass('iam.core_tenant_users_tenant_id_user_id_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_tenant_users'::regclass AND conname = 'core_tenant_users_tenant_id_user_id_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_tenant_users WHERE TRUE AND tenant_id IS NOT NULL AND user_id IS NOT NULL GROUP BY tenant_id,user_id HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_tenant_users UNIQUE core_tenant_users_tenant_id_user_id_key: duplicate tenant_id,user_id';
    ELSE
      ALTER TABLE iam.core_tenant_users ADD CONSTRAINT core_tenant_users_tenant_id_user_id_key UNIQUE (tenant_id,user_id);
    END IF;
  END IF;
END $$;

-- iam.core_tenants.core_tenants_code_key：UNIQUE (code)
DO $$
BEGIN
  IF to_regclass('iam.core_tenants') IS NOT NULL
     AND to_regclass('iam.core_tenants_code_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_tenants'::regclass AND conname = 'core_tenants_code_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_tenants WHERE TRUE AND code IS NOT NULL GROUP BY code HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_tenants UNIQUE core_tenants_code_key: duplicate code';
    ELSE
      ALTER TABLE iam.core_tenants ADD CONSTRAINT core_tenants_code_key UNIQUE (code);
    END IF;
  END IF;
END $$;

-- iam.core_users.core_users_email_key：UNIQUE (email)
DO $$
BEGIN
  IF to_regclass('iam.core_users') IS NOT NULL
     AND to_regclass('iam.core_users_email_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_users'::regclass AND conname = 'core_users_email_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_users WHERE TRUE AND email IS NOT NULL GROUP BY email HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_users UNIQUE core_users_email_key: duplicate email';
    ELSE
      ALTER TABLE iam.core_users ADD CONSTRAINT core_users_email_key UNIQUE (email);
    END IF;
  END IF;
END $$;

-- iam.core_users.core_users_username_key：UNIQUE (username)
DO $$
BEGIN
  IF to_regclass('iam.core_users') IS NOT NULL
     AND to_regclass('iam.core_users_username_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.core_users'::regclass AND conname = 'core_users_username_key') THEN
    IF EXISTS (SELECT 1 FROM iam.core_users WHERE TRUE AND username IS NOT NULL GROUP BY username HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.core_users UNIQUE core_users_username_key: duplicate username';
    ELSE
      ALTER TABLE iam.core_users ADD CONSTRAINT core_users_username_key UNIQUE (username);
    END IF;
  END IF;
END $$;

-- iam.tenant_permissions.uk_tenant_user：UNIQUE (tenant_id,user_id)
DO $$
BEGIN
  IF to_regclass('iam.tenant_permissions') IS NOT NULL
     AND to_regclass('iam.uk_tenant_user') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.tenant_permissions'::regclass AND conname = 'uk_tenant_user') THEN
    IF EXISTS (SELECT 1 FROM iam.tenant_permissions WHERE TRUE AND tenant_id IS NOT NULL AND user_id IS NOT NULL GROUP BY tenant_id,user_id HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.tenant_permissions UNIQUE uk_tenant_user: duplicate tenant_id,user_id';
    ELSE
      ALTER TABLE iam.tenant_permissions ADD CONSTRAINT uk_tenant_user UNIQUE (tenant_id,user_id);
    END IF;
  END IF;
END $$;

-- iam.tool_permissions.uk_tenant_tool：UNIQUE (tenant_permission_id,tool_name)
DO $$
BEGIN
  IF to_regclass('iam.tool_permissions') IS NOT NULL
     AND to_regclass('iam.uk_tenant_tool') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'iam.tool_permissions'::regclass AND conname = 'uk_tenant_tool') THEN
    IF EXISTS (SELECT 1 FROM iam.tool_permissions WHERE TRUE AND tenant_permission_id IS NOT NULL AND tool_name IS NOT NULL GROUP BY tenant_permission_id,tool_name HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP iam.tool_permissions UNIQUE uk_tenant_tool: duplicate tenant_permission_id,tool_name';
    ELSE
      ALTER TABLE iam.tool_permissions ADD CONSTRAINT uk_tenant_tool UNIQUE (tenant_permission_id,tool_name);
    END IF;
  END IF;
END $$;

-- master_data.schema_registry.schema_registry_name_key：UNIQUE (name)
DO $$
BEGIN
  IF to_regclass('master_data.schema_registry') IS NOT NULL
     AND to_regclass('master_data.schema_registry_name_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'master_data.schema_registry'::regclass AND conname = 'schema_registry_name_key') THEN
    IF EXISTS (SELECT 1 FROM master_data.schema_registry WHERE TRUE AND name IS NOT NULL GROUP BY name HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP master_data.schema_registry UNIQUE schema_registry_name_key: duplicate name';
    ELSE
      ALTER TABLE master_data.schema_registry ADD CONSTRAINT schema_registry_name_key UNIQUE (name);
    END IF;
  END IF;
END $$;

-- public.core_users.core_users_email_key：UNIQUE (email)
DO $$
BEGIN
  IF to_regclass('public.core_users') IS NOT NULL
     AND to_regclass('public.core_users_email_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.core_users'::regclass AND conname = 'core_users_email_key') THEN
    IF EXISTS (SELECT 1 FROM public.core_users WHERE TRUE AND email IS NOT NULL GROUP BY email HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP public.core_users UNIQUE core_users_email_key: duplicate email';
    ELSE
      ALTER TABLE public.core_users ADD CONSTRAINT core_users_email_key UNIQUE (email);
    END IF;
  END IF;
END $$;

-- public.core_users.core_users_username_key：UNIQUE (username)
DO $$
BEGIN
  IF to_regclass('public.core_users') IS NOT NULL
     AND to_regclass('public.core_users_username_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.core_users'::regclass AND conname = 'core_users_username_key') THEN
    IF EXISTS (SELECT 1 FROM public.core_users WHERE TRUE AND username IS NOT NULL GROUP BY username HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP public.core_users UNIQUE core_users_username_key: duplicate username';
    ELSE
      ALTER TABLE public.core_users ADD CONSTRAINT core_users_username_key UNIQUE (username);
    END IF;
  END IF;
END $$;

-- public.refresh_tokens.refresh_tokens_refresh_token_key：UNIQUE (refresh_token)
DO $$
BEGIN
  IF to_regclass('public.refresh_tokens') IS NOT NULL
     AND to_regclass('public.refresh_tokens_refresh_token_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.refresh_tokens'::regclass AND conname = 'refresh_tokens_refresh_token_key') THEN
    IF EXISTS (SELECT 1 FROM public.refresh_tokens WHERE TRUE AND refresh_token IS NOT NULL GROUP BY refresh_token HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP public.refresh_tokens UNIQUE refresh_tokens_refresh_token_key: duplicate refresh_token';
    ELSE
      ALTER TABLE public.refresh_tokens ADD CONSTRAINT refresh_tokens_refresh_token_key UNIQUE (refresh_token);
    END IF;
  END IF;
END $$;

-- public.search_recent.search_recent_user_id_keyword_key：UNIQUE (user_id,keyword)
DO $$
BEGIN
  IF to_regclass('public.search_recent') IS NOT NULL
     AND to_regclass('public.search_recent_user_id_keyword_key') IS NULL
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.search_recent'::regclass AND conname = 'search_recent_user_id_keyword_key') THEN
    IF EXISTS (SELECT 1 FROM public.search_recent WHERE TRUE AND user_id IS NOT NULL AND keyword IS NOT NULL GROUP BY user_id,keyword HAVING count(*) > 1) THEN
      RAISE NOTICE 'SKIP public.search_recent UNIQUE search_recent_user_id_keyword_key: duplicate user_id,keyword';
    ELSE
      ALTER TABLE public.search_recent ADD CONSTRAINT search_recent_user_id_keyword_key UNIQUE (user_id,keyword);
    END IF;
  END IF;
END $$;
