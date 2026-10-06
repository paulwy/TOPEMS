-- =============================================================================
-- 由 scripts/gen-missing-constraints-migration.py 生成（约束级系统性补链）
-- 基线: postgres://topems:topems_secret@localhost:5432/topems  目标: postgres://topems:topems_secret@localhost:5433/topems
-- 同表缺失约束: 81（PK 13 / FK 46 / UNIQUE 0 / CHECK 0 / NOT NULL 22）
-- 注: 本 PG（18.6 容器）不支持 ADD CONSTRAINT IF NOT EXISTS，
--     故用 DO $$ 块按 conname+conrelid 存在性检查实现幂等。
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_plugin_reviews_plugin_id_fkey' AND conrelid = '"core"."core_plugin_reviews"'::regclass) THEN
        ALTER TABLE "core"."core_plugin_reviews" ADD CONSTRAINT "core_plugin_reviews_plugin_id_fkey" FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_plugin_versions_plugin_id_fkey' AND conrelid = '"core"."core_plugin_versions"'::regclass) THEN
        ALTER TABLE "core"."core_plugin_versions" ADD CONSTRAINT "core_plugin_versions_plugin_id_fkey" FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bom_items_bom_id_fkey' AND conrelid = '"mes"."bom_items"'::regclass) THEN
        ALTER TABLE "mes"."bom_items" ADD CONSTRAINT "bom_items_bom_id_fkey" FOREIGN KEY (bom_id) REFERENCES mes.material_boms(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_inspections_equipment_id_fkey' AND conrelid = '"mes"."equipment_inspections"'::regclass) THEN
        ALTER TABLE "mes"."equipment_inspections" ADD CONSTRAINT "equipment_inspections_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_maintenance_records_equipment_id_fkey' AND conrelid = '"mes"."equipment_maintenance_records"'::regclass) THEN
        ALTER TABLE "mes"."equipment_maintenance_records" ADD CONSTRAINT "equipment_maintenance_records_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_oee_equipment_id_fkey' AND conrelid = '"mes"."equipment_oee"'::regclass) THEN
        ALTER TABLE "mes"."equipment_oee" ADD CONSTRAINT "equipment_oee_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issue_items_issue_id_fkey' AND conrelid = '"mes"."material_issue_items"'::regclass) THEN
        ALTER TABLE "mes"."material_issue_items" ADD CONSTRAINT "material_issue_items_issue_id_fkey" FOREIGN KEY (issue_id) REFERENCES mes.material_issues(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issues_bom_id_fkey' AND conrelid = '"mes"."material_issues"'::regclass) THEN
        ALTER TABLE "mes"."material_issues" ADD CONSTRAINT "material_issues_bom_id_fkey" FOREIGN KEY (bom_id) REFERENCES mes.material_boms(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issues_order_id_fkey' AND conrelid = '"mes"."material_issues"'::regclass) THEN
        ALTER TABLE "mes"."material_issues" ADD CONSTRAINT "material_issues_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_requirements_order_id_fkey' AND conrelid = '"mes"."material_requirements"'::regclass) THEN
        ALTER TABLE "mes"."material_requirements" ADD CONSTRAINT "material_requirements_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'process_flow_steps_flow_id_fkey' AND conrelid = '"mes"."process_flow_steps"'::regclass) THEN
        ALTER TABLE "mes"."process_flow_steps" ADD CONSTRAINT "process_flow_steps_flow_id_fkey" FOREIGN KEY (flow_id) REFERENCES mes.process_flows(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_records_equipment_id_fkey' AND conrelid = '"mes"."production_records"'::regclass) THEN
        ALTER TABLE "mes"."production_records" ADD CONSTRAINT "production_records_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_records_order_id_fkey' AND conrelid = '"mes"."production_records"'::regclass) THEN
        ALTER TABLE "mes"."production_records" ADD CONSTRAINT "production_records_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_records_process_id_fkey' AND conrelid = '"mes"."production_records"'::regclass) THEN
        ALTER TABLE "mes"."production_records" ADD CONSTRAINT "production_records_process_id_fkey" FOREIGN KEY (process_id) REFERENCES mes.production_processes(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_records_work_station_id_fkey' AND conrelid = '"mes"."production_records"'::regclass) THEN
        ALTER TABLE "mes"."production_records" ADD CONSTRAINT "production_records_work_station_id_fkey" FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_schedules_equipment_id_fkey' AND conrelid = '"mes"."production_schedules"'::regclass) THEN
        ALTER TABLE "mes"."production_schedules" ADD CONSTRAINT "production_schedules_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_schedules_order_id_fkey' AND conrelid = '"mes"."production_schedules"'::regclass) THEN
        ALTER TABLE "mes"."production_schedules" ADD CONSTRAINT "production_schedules_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_schedules_process_id_fkey' AND conrelid = '"mes"."production_schedules"'::regclass) THEN
        ALTER TABLE "mes"."production_schedules" ADD CONSTRAINT "production_schedules_process_id_fkey" FOREIGN KEY (process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_schedules_work_station_id_fkey' AND conrelid = '"mes"."production_schedules"'::regclass) THEN
        ALTER TABLE "mes"."production_schedules" ADD CONSTRAINT "production_schedules_work_station_id_fkey" FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quality_patrol_items_patrol_id_fkey' AND conrelid = '"mes"."quality_patrol_items"'::regclass) THEN
        ALTER TABLE "mes"."quality_patrol_items" ADD CONSTRAINT "quality_patrol_items_patrol_id_fkey" FOREIGN KEY (patrol_id) REFERENCES mes.quality_patrols(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quality_records_order_id_fkey' AND conrelid = '"mes"."quality_records"'::regclass) THEN
        ALTER TABLE "mes"."quality_records" ADD CONSTRAINT "quality_records_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quality_standard_values_standard_id_fkey' AND conrelid = '"mes"."quality_standard_values"'::regclass) THEN
        ALTER TABLE "mes"."quality_standard_values" ADD CONSTRAINT "quality_standard_values_standard_id_fkey" FOREIGN KEY (standard_id) REFERENCES mes.quality_standards(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_work_station_id_fkey' AND conrelid = '"mes"."teams"'::regclass) THEN
        ALTER TABLE "mes"."teams" ADD CONSTRAINT "teams_work_station_id_fkey" FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wip_transfers_from_process_id_fkey' AND conrelid = '"mes"."wip_transfers"'::regclass) THEN
        ALTER TABLE "mes"."wip_transfers" ADD CONSTRAINT "wip_transfers_from_process_id_fkey" FOREIGN KEY (from_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wip_transfers_from_work_station_id_fkey' AND conrelid = '"mes"."wip_transfers"'::regclass) THEN
        ALTER TABLE "mes"."wip_transfers" ADD CONSTRAINT "wip_transfers_from_work_station_id_fkey" FOREIGN KEY (from_work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wip_transfers_to_process_id_fkey' AND conrelid = '"mes"."wip_transfers"'::regclass) THEN
        ALTER TABLE "mes"."wip_transfers" ADD CONSTRAINT "wip_transfers_to_process_id_fkey" FOREIGN KEY (to_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wip_transfers_to_work_station_id_fkey' AND conrelid = '"mes"."wip_transfers"'::regclass) THEN
        ALTER TABLE "mes"."wip_transfers" ADD CONSTRAINT "wip_transfers_to_work_station_id_fkey" FOREIGN KEY (to_work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wip_transfers_wip_id_fkey' AND conrelid = '"mes"."wip_transfers"'::regclass) THEN
        ALTER TABLE "mes"."wip_transfers" ADD CONSTRAINT "wip_transfers_wip_id_fkey" FOREIGN KEY (wip_id) REFERENCES mes.wips(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wips_current_process_id_fkey' AND conrelid = '"mes"."wips"'::regclass) THEN
        ALTER TABLE "mes"."wips" ADD CONSTRAINT "wips_current_process_id_fkey" FOREIGN KEY (current_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wips_current_work_station_id_fkey' AND conrelid = '"mes"."wips"'::regclass) THEN
        ALTER TABLE "mes"."wips" ADD CONSTRAINT "wips_current_work_station_id_fkey" FOREIGN KEY (current_work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wips_order_id_fkey' AND conrelid = '"mes"."wips"'::regclass) THEN
        ALTER TABLE "mes"."wips" ADD CONSTRAINT "wips_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_order_id_fkey' AND conrelid = '"mes"."work_orders"'::regclass) THEN
        ALTER TABLE "mes"."work_orders" ADD CONSTRAINT "work_orders_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_stations_equipment_id_fkey' AND conrelid = '"mes"."work_stations"'::regclass) THEN
        ALTER TABLE "mes"."work_stations" ADD CONSTRAINT "work_stations_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_stations_process_id_fkey' AND conrelid = '"mes"."work_stations"'::regclass) THEN
        ALTER TABLE "mes"."work_stations" ADD CONSTRAINT "work_stations_process_id_fkey" FOREIGN KEY (process_id) REFERENCES mes.production_processes(id);
    END IF;
END $$;
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
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."_archive_core_workflow_versions"'::regclass) THEN
        ALTER TABLE "public"."_archive_core_workflow_versions" ADD CONSTRAINT "core_workflow_versions_pkey_archive" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_dict_items_dict_type_id_fkey' AND conrelid = '"public"."core_dict_items"'::regclass) THEN
        ALTER TABLE "public"."core_dict_items" ADD CONSTRAINT "core_dict_items_dict_type_id_fkey" FOREIGN KEY (dict_type_id) REFERENCES core_dict_types(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_dict_items_parent_id_fkey' AND conrelid = '"public"."core_dict_items"'::regclass) THEN
        ALTER TABLE "public"."core_dict_items" ADD CONSTRAINT "core_dict_items_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES core_dict_items(id) ON DELETE SET NULL;
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
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_finance_vouchers_template_id_fkey' AND conrelid = '"public"."core_finance_vouchers"'::regclass) THEN
        ALTER TABLE "public"."core_finance_vouchers" ADD CONSTRAINT "core_finance_vouchers_template_id_fkey" FOREIGN KEY (template_id) REFERENCES finance_voucher_templates(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_modules_tenant_id_fkey' AND conrelid = '"public"."core_tenant_modules"'::regclass) THEN
        ALTER TABLE "public"."core_tenant_modules" ADD CONSTRAINT "core_tenant_modules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_settings_tenant_id_fkey' AND conrelid = '"public"."core_tenant_settings"'::regclass) THEN
        ALTER TABLE "public"."core_tenant_settings" ADD CONSTRAINT "core_tenant_settings_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_usage_tenant_id_fkey' AND conrelid = '"public"."core_tenant_usage"'::regclass) THEN
        ALTER TABLE "public"."core_tenant_usage" ADD CONSTRAINT "core_tenant_usage_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
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
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_users_tenant_id_fkey1' AND conrelid = '"public"."core_tenant_users"'::regclass) THEN
        ALTER TABLE "public"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_fkey1" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "tenant_id" SET NOT NULL;
ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "public"."core_users" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "public"."core_users" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "public"."core_users" ALTER COLUMN "password_hash" SET NOT NULL;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = '"public"."core_users"'::regclass) THEN
        ALTER TABLE "public"."core_users" ADD CONSTRAINT "core_users_pkey1" PRIMARY KEY (id);
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
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lab_inspection_reports_sample_id_fkey' AND conrelid = '"public"."qa_lab_inspection_reports"'::regclass) THEN
        ALTER TABLE "public"."qa_lab_inspection_reports" ADD CONSTRAINT "qa_lab_inspection_reports_sample_id_fkey" FOREIGN KEY (sample_id) REFERENCES qa_lab_samples(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lab_records_task_id_fkey' AND conrelid = '"public"."qa_lab_records"'::regclass) THEN
        ALTER TABLE "public"."qa_lab_records" ADD CONSTRAINT "qa_lab_records_task_id_fkey" FOREIGN KEY (task_id) REFERENCES qa_lab_tasks(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lab_sample_lifecycle_sample_id_fkey' AND conrelid = '"public"."qa_lab_sample_lifecycle"'::regclass) THEN
        ALTER TABLE "public"."qa_lab_sample_lifecycle" ADD CONSTRAINT "qa_lab_sample_lifecycle_sample_id_fkey" FOREIGN KEY (sample_id) REFERENCES qa_lab_samples(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lims_rfid_tags_sample_id_fkey' AND conrelid = '"public"."qa_lims_rfid_tags"'::regclass) THEN
        ALTER TABLE "public"."qa_lims_rfid_tags" ADD CONSTRAINT "qa_lims_rfid_tags_sample_id_fkey" FOREIGN KEY (sample_id) REFERENCES qa_lab_samples(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lims_sample_barcodes_sample_id_fkey' AND conrelid = '"public"."qa_lims_sample_barcodes"'::regclass) THEN
        ALTER TABLE "public"."qa_lims_sample_barcodes" ADD CONSTRAINT "qa_lims_sample_barcodes_sample_id_fkey" FOREIGN KEY (sample_id) REFERENCES qa_lab_samples(id) ON DELETE SET NULL;
    END IF;
END $$;
