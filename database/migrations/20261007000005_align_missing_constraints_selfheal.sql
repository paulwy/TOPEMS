-- =============================================================================
-- 由 scripts/gen-missing-constraints-migration.py 生成（约束级系统性补链）
-- 基线: postgres://topems:topems_secret@localhost:5432/topems  目标: postgres://topems:topems_secret@localhost:5433/topems
-- 同表缺失约束: 186（PK 22 / FK 37 / UNIQUE 40 / CHECK 5 / NOT NULL 82）
-- 注: 本 PG（18.6 容器）不支持 ADD CONSTRAINT IF NOT EXISTS，
--     故用 DO $$ 块按 conname+conrelid 存在性检查实现幂等。
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_settings_tenant_id_key' AND conrelid = '"ai"."ai_settings"'::regclass) THEN
        ALTER TABLE "ai"."ai_settings" ADD CONSTRAINT "ai_settings_tenant_id_key" UNIQUE (tenant_id);
    END IF;
END $$;
ALTER TABLE "ai"."vectors" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "core"."core_plugin_navigation" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "core"."core_plugin_navigation" ALTER COLUMN "updated_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_plugins_code_key' AND conrelid = '"core"."core_plugins"'::regclass) THEN
        ALTER TABLE "core"."core_plugins" ADD CONSTRAINT "core_plugins_code_key" UNIQUE (code);
    END IF;
END $$;
ALTER TABLE "crm"."billing_records" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."billing_records" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "crm"."contacts" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."contacts" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "crm"."contracts" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."contracts" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "crm"."customer_orders" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."customer_orders" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "crm"."customer_recommendations" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."customer_scores" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."customer_scores" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "crm"."customer_segments" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."customer_segments" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "crm"."customer_tags" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."customers" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."customers" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "crm"."interactions" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."interactions" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "crm"."opportunities" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."opportunities" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "crm"."return_items" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."returns" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."returns" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "crm"."rfm_results" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."rfm_results" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "crm"."sales_forecasts" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."sales_forecasts" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "crm"."sales_orders" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."sales_orders" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "crm"."tags" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "crm"."tags" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_alerts" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_alerts" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_hazard_factors" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_hazard_factors" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_hazardous_materials" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_hazardous_materials" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_hazards" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_hazards" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_risk_controls" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "ehs"."qa_ehs_risk_controls" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "erp"."erp_master_data_audit_trail" ALTER COLUMN "created_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_payroll_runs_status_standard' AND conrelid = '"hrm"."payroll_runs"'::regclass) THEN
        ALTER TABLE "hrm"."payroll_runs" ADD CONSTRAINT "ck_payroll_runs_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying, 'draft'::character varying, 'pending'::character varying, 'calculated'::character varying, 'paid'::character varying])::text[]))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_qa_lims_audit_logs_status_standard' AND conrelid = '"lims"."qa_lims_audit_logs"'::regclass) THEN
        ALTER TABLE "lims"."qa_lims_audit_logs" ADD CONSTRAINT "ck_qa_lims_audit_logs_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying, 'success'::character varying, 'failure'::character varying])::text[]))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_dict_types_code_key' AND conrelid = '"master_data"."core_dict_types"'::regclass) THEN
        ALTER TABLE "master_data"."core_dict_types" ADD CONSTRAINT "core_dict_types_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'batch_records_batch_no_key' AND conrelid = '"mes"."batch_records"'::regclass) THEN
        ALTER TABLE "mes"."batch_records" ADD CONSTRAINT "batch_records_batch_no_key" UNIQUE (batch_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"mes"."batch_records"'::regclass) THEN
        ALTER TABLE "mes"."batch_records" ADD CONSTRAINT "batch_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "mes"."equipment" ALTER COLUMN "description" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_equipment_no_key' AND conrelid = '"mes"."equipment"'::regclass) THEN
        ALTER TABLE "mes"."equipment" ADD CONSTRAINT "equipment_equipment_no_key" UNIQUE (equipment_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"mes"."equipment_inspections"'::regclass) THEN
        ALTER TABLE "mes"."equipment_inspections" ADD CONSTRAINT "equipment_inspections_pkey" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "mes"."equipment_oee" ALTER COLUMN "actual_output" SET NOT NULL;
ALTER TABLE "mes"."equipment_oee" ALTER COLUMN "actual_run_time" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_oee_equipment_id_record_date_shift_key' AND conrelid = '"mes"."equipment_oee"'::regclass) THEN
        ALTER TABLE "mes"."equipment_oee" ADD CONSTRAINT "equipment_oee_equipment_id_record_date_shift_key" UNIQUE (equipment_id, record_date, shift);
    END IF;
END $$;
ALTER TABLE "mes"."equipment_oee" ALTER COLUMN "good_output" SET NOT NULL;
ALTER TABLE "mes"."equipment_oee" ALTER COLUMN "ideal_cycle_time" SET NOT NULL;
ALTER TABLE "mes"."equipment_oee" ALTER COLUMN "planned_production_time" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_boms_bom_no_key' AND conrelid = '"mes"."material_boms"'::regclass) THEN
        ALTER TABLE "mes"."material_boms" ADD CONSTRAINT "material_boms_bom_no_key" UNIQUE (bom_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"mes"."material_boms"'::regclass) THEN
        ALTER TABLE "mes"."material_boms" ADD CONSTRAINT "material_boms_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issues_issue_no_key' AND conrelid = '"mes"."material_issues"'::regclass) THEN
        ALTER TABLE "mes"."material_issues" ADD CONSTRAINT "material_issues_issue_no_key" UNIQUE (issue_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"mes"."material_issues"'::regclass) THEN
        ALTER TABLE "mes"."material_issues" ADD CONSTRAINT "material_issues_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_requirements_mrp_no_key' AND conrelid = '"mes"."material_requirements"'::regclass) THEN
        ALTER TABLE "mes"."material_requirements" ADD CONSTRAINT "material_requirements_mrp_no_key" UNIQUE (mrp_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"mes"."material_requirements"'::regclass) THEN
        ALTER TABLE "mes"."material_requirements" ADD CONSTRAINT "material_requirements_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'process_flows_code_key' AND conrelid = '"mes"."process_flows"'::regclass) THEN
        ALTER TABLE "mes"."process_flows" ADD CONSTRAINT "process_flows_code_key" UNIQUE (code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_orders_order_no_key' AND conrelid = '"mes"."production_orders"'::regclass) THEN
        ALTER TABLE "mes"."production_orders" ADD CONSTRAINT "production_orders_order_no_key" UNIQUE (order_no);
    END IF;
END $$;
ALTER TABLE "mes"."production_orders" ALTER COLUMN "product_code" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_processes_process_code_key' AND conrelid = '"mes"."production_processes"'::regclass) THEN
        ALTER TABLE "mes"."production_processes" ADD CONSTRAINT "production_processes_process_code_key" UNIQUE (process_code);
    END IF;
END $$;
ALTER TABLE "mes"."production_processes" ALTER COLUMN "process_code" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"mes"."production_schedules"'::regclass) THEN
        ALTER TABLE "mes"."production_schedules" ADD CONSTRAINT "production_schedules_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_schedules_schedule_no_key' AND conrelid = '"mes"."production_schedules"'::regclass) THEN
        ALTER TABLE "mes"."production_schedules" ADD CONSTRAINT "production_schedules_schedule_no_key" UNIQUE (schedule_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"mes"."quality_records"'::regclass) THEN
        ALTER TABLE "mes"."quality_records" ADD CONSTRAINT "quality_records_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quality_records_record_no_key' AND conrelid = '"mes"."quality_records"'::regclass) THEN
        ALTER TABLE "mes"."quality_records" ADD CONSTRAINT "quality_records_record_no_key" UNIQUE (record_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_team_code_key' AND conrelid = '"mes"."teams"'::regclass) THEN
        ALTER TABLE "mes"."teams" ADD CONSTRAINT "teams_team_code_key" UNIQUE (team_code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"mes"."wip_transfers"'::regclass) THEN
        ALTER TABLE "mes"."wip_transfers" ADD CONSTRAINT "wip_transfers_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wip_transfers_transfer_no_key' AND conrelid = '"mes"."wip_transfers"'::regclass) THEN
        ALTER TABLE "mes"."wip_transfers" ADD CONSTRAINT "wip_transfers_transfer_no_key" UNIQUE (transfer_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"mes"."wips"'::regclass) THEN
        ALTER TABLE "mes"."wips" ADD CONSTRAINT "wips_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wips_wip_no_key' AND conrelid = '"mes"."wips"'::regclass) THEN
        ALTER TABLE "mes"."wips" ADD CONSTRAINT "wips_wip_no_key" UNIQUE (wip_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"mes"."work_orders"'::regclass) THEN
        ALTER TABLE "mes"."work_orders" ADD CONSTRAINT "work_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_work_order_no_key' AND conrelid = '"mes"."work_orders"'::regclass) THEN
        ALTER TABLE "mes"."work_orders" ADD CONSTRAINT "work_orders_work_order_no_key" UNIQUE (work_order_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_stations_station_no_key' AND conrelid = '"mes"."work_stations"'::regclass) THEN
        ALTER TABLE "mes"."work_stations" ADD CONSTRAINT "work_stations_station_no_key" UNIQUE (station_no);
    END IF;
END $$;
ALTER TABLE "pm"."notifications" ALTER COLUMN "updated_at" SET NOT NULL;
ALTER TABLE "public"."_archive_core_doc_documents" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."_archive_core_doc_documents"'::regclass) THEN
        ALTER TABLE "public"."_archive_core_doc_documents" ADD CONSTRAINT "core_doc_documents_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."_archive_core_doc_folders" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."_archive_core_doc_folders"'::regclass) THEN
        ALTER TABLE "public"."_archive_core_doc_folders" ADD CONSTRAINT "core_doc_folders_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."_archive_core_doc_templates" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."_archive_core_doc_templates"'::regclass) THEN
        ALTER TABLE "public"."_archive_core_doc_templates" ADD CONSTRAINT "core_doc_templates_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."_archive_core_workflow_instances"'::regclass) THEN
        ALTER TABLE "public"."_archive_core_workflow_instances" ADD CONSTRAINT "_archive_core_workflow_instances_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_dict_items_dict_type_id_code_key' AND conrelid = '"public"."core_dict_items"'::regclass) THEN
        ALTER TABLE "public"."core_dict_items" ADD CONSTRAINT "core_dict_items_dict_type_id_code_key" UNIQUE (dict_type_id, code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_dict_types_code_key' AND conrelid = '"public"."core_dict_types"'::regclass) THEN
        ALTER TABLE "public"."core_dict_types" ADD CONSTRAINT "core_dict_types_code_key" UNIQUE (code);
    END IF;
END $$;
ALTER TABLE "public"."core_doc_documents" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_doc_documents"'::regclass) THEN
        ALTER TABLE "public"."core_doc_documents" ADD CONSTRAINT "core_doc_documents_pkey" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."core_doc_folders" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_doc_folders"'::regclass) THEN
        ALTER TABLE "public"."core_doc_folders" ADD CONSTRAINT "core_doc_folders_pkey" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."core_doc_templates" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_doc_templates"'::regclass) THEN
        ALTER TABLE "public"."core_doc_templates" ADD CONSTRAINT "core_doc_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_file_permissions_file_id_user_id_key' AND conrelid = '"public"."core_file_permissions"'::regclass) THEN
        ALTER TABLE "public"."core_file_permissions" ADD CONSTRAINT "core_file_permissions_file_id_user_id_key" UNIQUE (file_id, user_id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_master_data_refs_tenant_id_domain_code_key' AND conrelid = '"public"."core_master_data_refs"'::regclass) THEN
        ALTER TABLE "public"."core_master_data_refs" ADD CONSTRAINT "core_master_data_refs_tenant_id_domain_code_key" UNIQUE (tenant_id, domain, code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_modules_tenant_id_module_code_key' AND conrelid = '"public"."core_tenant_modules"'::regclass) THEN
        ALTER TABLE "public"."core_tenant_modules" ADD CONSTRAINT "core_tenant_modules_tenant_id_module_code_key" UNIQUE (tenant_id, module_code);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_settings_tenant_id_setting_key_key' AND conrelid = '"public"."core_tenant_settings"'::regclass) THEN
        ALTER TABLE "public"."core_tenant_settings" ADD CONSTRAINT "core_tenant_settings_tenant_id_setting_key_key" UNIQUE (tenant_id, setting_key);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_usage_tenant_id_period_start_key' AND conrelid = '"public"."core_tenant_usage"'::regclass) THEN
        ALTER TABLE "public"."core_tenant_usage" ADD CONSTRAINT "core_tenant_usage_tenant_id_period_start_key" UNIQUE (tenant_id, period_start);
    END IF;
END $$;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_tenant_users"'::regclass) THEN
        ALTER TABLE "public"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_users_tenant_id_email_key1' AND conrelid = '"public"."core_tenant_users"'::regclass) THEN
        ALTER TABLE "public"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_email_key1" UNIQUE (tenant_id, email);
    END IF;
END $$;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "tenant_id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_users_tenant_id_user_id_key1' AND conrelid = '"public"."core_tenant_users"'::regclass) THEN
        ALTER TABLE "public"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_user_id_key1" UNIQUE (tenant_id, user_id);
    END IF;
END $$;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "user_id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_users_email_key1' AND conrelid = '"public"."core_users"'::regclass) THEN
        ALTER TABLE "public"."core_users" ADD CONSTRAINT "core_users_email_key1" UNIQUE (email);
    END IF;
END $$;
ALTER TABLE "public"."core_users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "public"."core_users" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_users" ALTER COLUMN "password_hash" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_users"'::regclass) THEN
        ALTER TABLE "public"."core_users" ADD CONSTRAINT "core_users_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_users_username_key1' AND conrelid = '"public"."core_users"'::regclass) THEN
        ALTER TABLE "public"."core_users" ADD CONSTRAINT "core_users_username_key1" UNIQUE (username);
    END IF;
END $$;
ALTER TABLE "public"."core_users" ALTER COLUMN "username" SET NOT NULL;
ALTER TABLE "public"."core_workflow_instances" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_workflow_instances"'::regclass) THEN
        ALTER TABLE "public"."core_workflow_instances" ADD CONSTRAINT "core_workflow_instances_pkey" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "assignee_id" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "instance_id" SET NOT NULL;
ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "node_id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_workflow_tasks"'::regclass) THEN
        ALTER TABLE "public"."core_workflow_tasks" ADD CONSTRAINT "core_workflow_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;
ALTER TABLE "public"."core_workflow_versions" ALTER COLUMN "id" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_workflow_versions"'::regclass) THEN
        ALTER TABLE "public"."core_workflow_versions" ADD CONSTRAINT "core_workflow_versions_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_qa_lab_samples_status_standard' AND conrelid = '"public"."qa_lab_samples"'::regclass) THEN
        ALTER TABLE "public"."qa_lab_samples" ADD CONSTRAINT "ck_qa_lab_samples_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying, 'received'::character varying, 'registered'::character varying])::text[]))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_qa_lab_tasks_status_standard' AND conrelid = '"public"."qa_lab_tasks"'::regclass) THEN
        ALTER TABLE "public"."qa_lab_tasks" ADD CONSTRAINT "ck_qa_lab_tasks_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying, 'pending'::character varying, 'received'::character varying, 'registered'::character varying, 'assigned'::character varying, 'in_progress'::character varying, 'testing'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))));
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_settings_user_id_key' AND conrelid = '"public"."user_settings"'::regclass) THEN
        ALTER TABLE "public"."user_settings" ADD CONSTRAINT "user_settings_user_id_key" UNIQUE (user_id);
    END IF;
END $$;
ALTER TABLE "qms"."qa_alert_messages" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "qms"."qa_apqp_projects" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "qms"."qa_apqp_projects" ALTER COLUMN "updated_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_eightd_reports_report_no_key' AND conrelid = '"qms"."qa_eightd_reports"'::regclass) THEN
        ALTER TABLE "qms"."qa_eightd_reports" ADD CONSTRAINT "qa_eightd_reports_report_no_key" UNIQUE (report_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_fmea_analyses_fmea_no_key' AND conrelid = '"qms"."qa_fmea_analyses"'::regclass) THEN
        ALTER TABLE "qms"."qa_fmea_analyses" ADD CONSTRAINT "qa_fmea_analyses_fmea_no_key" UNIQUE (fmea_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_qms_sync_records_sync_no_key' AND conrelid = '"qms"."qa_qms_sync_records"'::regclass) THEN
        ALTER TABLE "qms"."qa_qms_sync_records" ADD CONSTRAINT "qa_qms_sync_records_sync_no_key" UNIQUE (sync_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_quality_costs_cost_no_key' AND conrelid = '"qms"."qa_quality_costs"'::regclass) THEN
        ALTER TABLE "qms"."qa_quality_costs" ADD CONSTRAINT "qa_quality_costs_cost_no_key" UNIQUE (cost_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_quality_inspections_inspection_no_key' AND conrelid = '"qms"."qa_quality_inspections"'::regclass) THEN
        ALTER TABLE "qms"."qa_quality_inspections" ADD CONSTRAINT "qa_quality_inspections_inspection_no_key" UNIQUE (inspection_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_quality_issues_issue_no_key' AND conrelid = '"qms"."qa_quality_issues"'::regclass) THEN
        ALTER TABLE "qms"."qa_quality_issues" ADD CONSTRAINT "qa_quality_issues_issue_no_key" UNIQUE (issue_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_spc_charts_chart_no_key' AND conrelid = '"qms"."qa_spc_charts"'::regclass) THEN
        ALTER TABLE "qms"."qa_spc_charts" ADD CONSTRAINT "qa_spc_charts_chart_no_key" UNIQUE (chart_no);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_standards_code_key' AND conrelid = '"qms"."qa_standards"'::regclass) THEN
        ALTER TABLE "qms"."qa_standards" ADD CONSTRAINT "qa_standards_code_key" UNIQUE (code);
    END IF;
END $$;
ALTER TABLE "rd"."bugs" ALTER COLUMN "created_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tickets_ticket_no_key' AND conrelid = '"ticket"."core_tickets"'::regclass) THEN
        ALTER TABLE "ticket"."core_tickets" ADD CONSTRAINT "core_tickets_ticket_no_key" UNIQUE (ticket_no);
    END IF;
END $$;
ALTER TABLE "unified_core"."inter_module_sync" ALTER COLUMN "created_at" SET NOT NULL;
ALTER TABLE "unified_core"."inter_module_sync" ALTER COLUMN "updated_at" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_audit_logs_status_standard' AND conrelid = '"wms"."audit_logs"'::regclass) THEN
        ALTER TABLE "wms"."audit_logs" ADD CONSTRAINT "ck_audit_logs_status_standard" CHECK (((status IS NULL) OR ((status)::text = ANY ((ARRAY['active'::character varying, 'inactive'::character varying, 'archived'::character varying, 'success'::character varying, 'failure'::character varying])::text[]))));
    END IF;
END $$;

-- ---- 跳过的约束（FK 目标表缺失 / 无法解析），需另立分流 ----
-- 数量: 37
--   mes.equipment_inspections.equipment_inspections_equipment_id_fkey [f] 目标表缺失: mes.equipment(id)
--   mes.equipment_maintenance_records.equipment_maintenance_records_equipment_id_fkey [f] 目标表缺失: mes.equipment(id)
--   mes.equipment_oee.equipment_oee_equipment_id_fkey [f] 目标表缺失: mes.equipment(id)
--   mes.material_issues.material_issues_bom_id_fkey [f] 目标表缺失: mes.material_boms(id)
--   mes.material_issues.material_issues_order_id_fkey [f] 目标表缺失: mes.production_orders(id)
--   mes.material_requirements.material_requirements_order_id_fkey [f] 目标表缺失: mes.production_orders(id)
--   mes.process_flow_steps.process_flow_steps_flow_id_fkey [f] 目标表缺失: mes.process_flows(id)
--   mes.production_records.production_records_equipment_id_fkey [f] 目标表缺失: mes.equipment(id)
--   mes.production_records.production_records_order_id_fkey [f] 目标表缺失: mes.production_orders(id)
--   mes.production_records.production_records_process_id_fkey [f] 目标表缺失: mes.production_processes(id)
--   mes.production_records.production_records_work_station_id_fkey [f] 目标表缺失: mes.work_stations(id)
--   mes.production_schedules.production_schedules_equipment_id_fkey [f] 目标表缺失: mes.equipment(id)
--   mes.production_schedules.production_schedules_order_id_fkey [f] 目标表缺失: mes.production_orders(id)
--   mes.production_schedules.production_schedules_process_id_fkey [f] 目标表缺失: mes.production_processes(id)
--   mes.production_schedules.production_schedules_work_station_id_fkey [f] 目标表缺失: mes.work_stations(id)
--   mes.quality_patrol_items.quality_patrol_items_patrol_id_fkey [f] 目标表缺失: mes.quality_patrols(id)
--   mes.quality_records.quality_records_order_id_fkey [f] 目标表缺失: mes.production_orders(id)
--   mes.quality_standard_values.quality_standard_values_standard_id_fkey [f] 目标表缺失: mes.quality_standards(id)
--   mes.teams.teams_work_station_id_fkey [f] 目标表缺失: mes.work_stations(id)
--   mes.wip_transfers.wip_transfers_from_process_id_fkey [f] 目标表缺失: mes.production_processes(id)
--   mes.wip_transfers.wip_transfers_from_work_station_id_fkey [f] 目标表缺失: mes.work_stations(id)
--   mes.wip_transfers.wip_transfers_to_process_id_fkey [f] 目标表缺失: mes.production_processes(id)
--   mes.wip_transfers.wip_transfers_to_work_station_id_fkey [f] 目标表缺失: mes.work_stations(id)
--   mes.wip_transfers.wip_transfers_wip_id_fkey [f] 目标表缺失: mes.wips(id)
--   mes.wips.wips_current_process_id_fkey [f] 目标表缺失: mes.production_processes(id)
--   mes.wips.wips_current_work_station_id_fkey [f] 目标表缺失: mes.work_stations(id)
--   mes.wips.wips_order_id_fkey [f] 目标表缺失: mes.production_orders(id)
--   mes.work_orders.work_orders_order_id_fkey [f] 目标表缺失: mes.production_orders(id)
--   mes.work_stations.work_stations_equipment_id_fkey [f] 目标表缺失: mes.equipment(id)
--   mes.work_stations.work_stations_process_id_fkey [f] 目标表缺失: mes.production_processes(id)
--   public.core_dict_items.core_dict_items_dict_type_id_fkey [f] 目标表缺失: core_dict_types(id)
--   public.core_dict_items.core_dict_items_parent_id_fkey [f] 目标表缺失: core_dict_items(id)
--   public.core_tenant_modules.core_tenant_modules_tenant_id_fkey [f] 目标表缺失: core_tenants(id)
--   public.core_tenant_settings.core_tenant_settings_tenant_id_fkey [f] 目标表缺失: core_tenants(id)
--   public.core_tenant_usage.core_tenant_usage_tenant_id_fkey [f] 目标表缺失: core_tenants(id)
--   public.core_tenant_users.core_tenant_users_tenant_id_fkey1 [f] 目标表缺失: core_tenants(id)
--   public.user_settings.user_settings_user_id_fkey [f] 目标表缺失: mobile_users(id)
