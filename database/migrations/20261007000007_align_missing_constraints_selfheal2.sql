-- =============================================================================
-- 由 scripts/gen-missing-constraints-migration.py 生成（约束级系统性补链）
-- 基线: postgres://topems:topems_secret@localhost:5432/topems  目标: postgres://topems:topems_secret@localhost:5433/topems
-- 同表缺失约束: 81（PK 13 / FK 46 / UNIQUE 0 / CHECK 0 / NOT NULL 22）
-- 注: 本 PG（18.6 容器）不支持 ADD CONSTRAINT IF NOT EXISTS，
--     故用 DO $$ 块按 conname+conrelid 存在性检查实现幂等。
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugin_reviews' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_plugin_reviews_plugin_id_fkey' AND conrelid = to_regclass('"core"."core_plugin_reviews"')) THEN
        ALTER TABLE "core"."core_plugin_reviews" ADD CONSTRAINT "core_plugin_reviews_plugin_id_fkey" FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='core' AND c.relname='core_plugin_versions' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_plugin_versions_plugin_id_fkey' AND conrelid = to_regclass('"core"."core_plugin_versions"')) THEN
        ALTER TABLE "core"."core_plugin_versions" ADD CONSTRAINT "core_plugin_versions_plugin_id_fkey" FOREIGN KEY (plugin_id) REFERENCES core.core_plugins(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='bom_items' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bom_items_bom_id_fkey' AND conrelid = to_regclass('"mes"."bom_items"')) THEN
        ALTER TABLE "mes"."bom_items" ADD CONSTRAINT "bom_items_bom_id_fkey" FOREIGN KEY (bom_id) REFERENCES mes.material_boms(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='equipment_inspections' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_inspections_equipment_id_fkey' AND conrelid = to_regclass('"mes"."equipment_inspections"')) THEN
        ALTER TABLE "mes"."equipment_inspections" ADD CONSTRAINT "equipment_inspections_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='equipment_maintenance_records' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_maintenance_records_equipment_id_fkey' AND conrelid = to_regclass('"mes"."equipment_maintenance_records"')) THEN
        ALTER TABLE "mes"."equipment_maintenance_records" ADD CONSTRAINT "equipment_maintenance_records_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='equipment_oee' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipment_oee_equipment_id_fkey' AND conrelid = to_regclass('"mes"."equipment_oee"')) THEN
        ALTER TABLE "mes"."equipment_oee" ADD CONSTRAINT "equipment_oee_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='material_issue_items' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issue_items_issue_id_fkey' AND conrelid = to_regclass('"mes"."material_issue_items"')) THEN
        ALTER TABLE "mes"."material_issue_items" ADD CONSTRAINT "material_issue_items_issue_id_fkey" FOREIGN KEY (issue_id) REFERENCES mes.material_issues(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='material_issues' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issues_bom_id_fkey' AND conrelid = to_regclass('"mes"."material_issues"')) THEN
        ALTER TABLE "mes"."material_issues" ADD CONSTRAINT "material_issues_bom_id_fkey" FOREIGN KEY (bom_id) REFERENCES mes.material_boms(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='material_issues' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_issues_order_id_fkey' AND conrelid = to_regclass('"mes"."material_issues"')) THEN
        ALTER TABLE "mes"."material_issues" ADD CONSTRAINT "material_issues_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='material_requirements' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_requirements_order_id_fkey' AND conrelid = to_regclass('"mes"."material_requirements"')) THEN
        ALTER TABLE "mes"."material_requirements" ADD CONSTRAINT "material_requirements_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='process_flow_steps' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'process_flow_steps_flow_id_fkey' AND conrelid = to_regclass('"mes"."process_flow_steps"')) THEN
        ALTER TABLE "mes"."process_flow_steps" ADD CONSTRAINT "process_flow_steps_flow_id_fkey" FOREIGN KEY (flow_id) REFERENCES mes.process_flows(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_records' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_records_equipment_id_fkey' AND conrelid = to_regclass('"mes"."production_records"')) THEN
        ALTER TABLE "mes"."production_records" ADD CONSTRAINT "production_records_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_records' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_records_order_id_fkey' AND conrelid = to_regclass('"mes"."production_records"')) THEN
        ALTER TABLE "mes"."production_records" ADD CONSTRAINT "production_records_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_records' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_records_process_id_fkey' AND conrelid = to_regclass('"mes"."production_records"')) THEN
        ALTER TABLE "mes"."production_records" ADD CONSTRAINT "production_records_process_id_fkey" FOREIGN KEY (process_id) REFERENCES mes.production_processes(id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_records' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_records_work_station_id_fkey' AND conrelid = to_regclass('"mes"."production_records"')) THEN
        ALTER TABLE "mes"."production_records" ADD CONSTRAINT "production_records_work_station_id_fkey" FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_schedules' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_schedules_equipment_id_fkey' AND conrelid = to_regclass('"mes"."production_schedules"')) THEN
        ALTER TABLE "mes"."production_schedules" ADD CONSTRAINT "production_schedules_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_schedules' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_schedules_order_id_fkey' AND conrelid = to_regclass('"mes"."production_schedules"')) THEN
        ALTER TABLE "mes"."production_schedules" ADD CONSTRAINT "production_schedules_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_schedules' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_schedules_process_id_fkey' AND conrelid = to_regclass('"mes"."production_schedules"')) THEN
        ALTER TABLE "mes"."production_schedules" ADD CONSTRAINT "production_schedules_process_id_fkey" FOREIGN KEY (process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='production_schedules' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'production_schedules_work_station_id_fkey' AND conrelid = to_regclass('"mes"."production_schedules"')) THEN
        ALTER TABLE "mes"."production_schedules" ADD CONSTRAINT "production_schedules_work_station_id_fkey" FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_patrol_items' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quality_patrol_items_patrol_id_fkey' AND conrelid = to_regclass('"mes"."quality_patrol_items"')) THEN
        ALTER TABLE "mes"."quality_patrol_items" ADD CONSTRAINT "quality_patrol_items_patrol_id_fkey" FOREIGN KEY (patrol_id) REFERENCES mes.quality_patrols(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_records' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quality_records_order_id_fkey' AND conrelid = to_regclass('"mes"."quality_records"')) THEN
        ALTER TABLE "mes"."quality_records" ADD CONSTRAINT "quality_records_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='quality_standard_values' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quality_standard_values_standard_id_fkey' AND conrelid = to_regclass('"mes"."quality_standard_values"')) THEN
        ALTER TABLE "mes"."quality_standard_values" ADD CONSTRAINT "quality_standard_values_standard_id_fkey" FOREIGN KEY (standard_id) REFERENCES mes.quality_standards(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='teams' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_work_station_id_fkey' AND conrelid = to_regclass('"mes"."teams"')) THEN
        ALTER TABLE "mes"."teams" ADD CONSTRAINT "teams_work_station_id_fkey" FOREIGN KEY (work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='wip_transfers' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wip_transfers_from_process_id_fkey' AND conrelid = to_regclass('"mes"."wip_transfers"')) THEN
        ALTER TABLE "mes"."wip_transfers" ADD CONSTRAINT "wip_transfers_from_process_id_fkey" FOREIGN KEY (from_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='wip_transfers' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wip_transfers_from_work_station_id_fkey' AND conrelid = to_regclass('"mes"."wip_transfers"')) THEN
        ALTER TABLE "mes"."wip_transfers" ADD CONSTRAINT "wip_transfers_from_work_station_id_fkey" FOREIGN KEY (from_work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='wip_transfers' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wip_transfers_to_process_id_fkey' AND conrelid = to_regclass('"mes"."wip_transfers"')) THEN
        ALTER TABLE "mes"."wip_transfers" ADD CONSTRAINT "wip_transfers_to_process_id_fkey" FOREIGN KEY (to_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='wip_transfers' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wip_transfers_to_work_station_id_fkey' AND conrelid = to_regclass('"mes"."wip_transfers"')) THEN
        ALTER TABLE "mes"."wip_transfers" ADD CONSTRAINT "wip_transfers_to_work_station_id_fkey" FOREIGN KEY (to_work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='wip_transfers' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wip_transfers_wip_id_fkey' AND conrelid = to_regclass('"mes"."wip_transfers"')) THEN
        ALTER TABLE "mes"."wip_transfers" ADD CONSTRAINT "wip_transfers_wip_id_fkey" FOREIGN KEY (wip_id) REFERENCES mes.wips(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='wips' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wips_current_process_id_fkey' AND conrelid = to_regclass('"mes"."wips"')) THEN
        ALTER TABLE "mes"."wips" ADD CONSTRAINT "wips_current_process_id_fkey" FOREIGN KEY (current_process_id) REFERENCES mes.production_processes(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='wips' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wips_current_work_station_id_fkey' AND conrelid = to_regclass('"mes"."wips"')) THEN
        ALTER TABLE "mes"."wips" ADD CONSTRAINT "wips_current_work_station_id_fkey" FOREIGN KEY (current_work_station_id) REFERENCES mes.work_stations(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='wips' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'wips_order_id_fkey' AND conrelid = to_regclass('"mes"."wips"')) THEN
        ALTER TABLE "mes"."wips" ADD CONSTRAINT "wips_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_orders' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_orders_order_id_fkey' AND conrelid = to_regclass('"mes"."work_orders"')) THEN
        ALTER TABLE "mes"."work_orders" ADD CONSTRAINT "work_orders_order_id_fkey" FOREIGN KEY (order_id) REFERENCES mes.production_orders(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_stations' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_stations_equipment_id_fkey' AND conrelid = to_regclass('"mes"."work_stations"')) THEN
        ALTER TABLE "mes"."work_stations" ADD CONSTRAINT "work_stations_equipment_id_fkey" FOREIGN KEY (equipment_id) REFERENCES mes.equipment(id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='mes' AND c.relname='work_stations' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_stations_process_id_fkey' AND conrelid = to_regclass('"mes"."work_stations"')) THEN
        ALTER TABLE "mes"."work_stations" ADD CONSTRAINT "work_stations_process_id_fkey" FOREIGN KEY (process_id) REFERENCES mes.production_processes(id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='_archive_core_doc_documents' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."_archive_core_doc_documents" ALTER COLUMN "id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='_archive_core_doc_documents' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = to_regclass('"public"."_archive_core_doc_documents"')) THEN
        ALTER TABLE "public"."_archive_core_doc_documents" ADD CONSTRAINT "core_doc_documents_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='_archive_core_doc_folders' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."_archive_core_doc_folders" ALTER COLUMN "id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='_archive_core_doc_folders' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = to_regclass('"public"."_archive_core_doc_folders"')) THEN
        ALTER TABLE "public"."_archive_core_doc_folders" ADD CONSTRAINT "core_doc_folders_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='_archive_core_doc_templates' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."_archive_core_doc_templates" ALTER COLUMN "id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='_archive_core_doc_templates' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = to_regclass('"public"."_archive_core_doc_templates"')) THEN
        ALTER TABLE "public"."_archive_core_doc_templates" ADD CONSTRAINT "core_doc_templates_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='_archive_core_workflow_instances' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."_archive_core_workflow_instances" ALTER COLUMN "id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='_archive_core_workflow_instances' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = to_regclass('"public"."_archive_core_workflow_instances"')) THEN
        ALTER TABLE "public"."_archive_core_workflow_instances" ADD CONSTRAINT "_archive_core_workflow_instances_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='_archive_core_workflow_versions' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = to_regclass('"public"."_archive_core_workflow_versions"')) THEN
        ALTER TABLE "public"."_archive_core_workflow_versions" ADD CONSTRAINT "core_workflow_versions_pkey_archive" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_dict_items_dict_type_id_fkey' AND conrelid = to_regclass('"public"."core_dict_items"')) THEN
        ALTER TABLE "public"."core_dict_items" ADD CONSTRAINT "core_dict_items_dict_type_id_fkey" FOREIGN KEY (dict_type_id) REFERENCES core_dict_types(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_dict_items' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_dict_items_parent_id_fkey' AND conrelid = to_regclass('"public"."core_dict_items"')) THEN
        ALTER TABLE "public"."core_dict_items" ADD CONSTRAINT "core_dict_items_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES core_dict_items(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_doc_documents' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_doc_documents" ALTER COLUMN "id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_doc_documents' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = to_regclass('"public"."core_doc_documents"')) THEN
        ALTER TABLE "public"."core_doc_documents" ADD CONSTRAINT "core_doc_documents_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_doc_folders' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_doc_folders" ALTER COLUMN "id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_doc_folders' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = to_regclass('"public"."core_doc_folders"')) THEN
        ALTER TABLE "public"."core_doc_folders" ADD CONSTRAINT "core_doc_folders_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_doc_templates' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_doc_templates" ALTER COLUMN "id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_doc_templates' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = to_regclass('"public"."core_doc_templates"')) THEN
        ALTER TABLE "public"."core_doc_templates" ADD CONSTRAINT "core_doc_templates_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_finance_vouchers' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_finance_vouchers_template_id_fkey' AND conrelid = to_regclass('"public"."core_finance_vouchers"')) THEN
        ALTER TABLE "public"."core_finance_vouchers" ADD CONSTRAINT "core_finance_vouchers_template_id_fkey" FOREIGN KEY (template_id) REFERENCES finance_voucher_templates(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_tenant_modules' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_modules_tenant_id_fkey' AND conrelid = to_regclass('"public"."core_tenant_modules"')) THEN
        ALTER TABLE "public"."core_tenant_modules" ADD CONSTRAINT "core_tenant_modules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_tenant_settings' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_settings_tenant_id_fkey' AND conrelid = to_regclass('"public"."core_tenant_settings"')) THEN
        ALTER TABLE "public"."core_tenant_settings" ADD CONSTRAINT "core_tenant_settings_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_tenant_usage' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_usage_tenant_id_fkey' AND conrelid = to_regclass('"public"."core_tenant_usage"')) THEN
        ALTER TABLE "public"."core_tenant_usage" ADD CONSTRAINT "core_tenant_usage_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_tenant_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "email" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_tenant_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_tenant_users' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = to_regclass('"public"."core_tenant_users"')) THEN
        ALTER TABLE "public"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_tenant_users' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_tenant_users_tenant_id_fkey1' AND conrelid = to_regclass('"public"."core_tenant_users"')) THEN
        ALTER TABLE "public"."core_tenant_users" ADD CONSTRAINT "core_tenant_users_tenant_id_fkey1" FOREIGN KEY (tenant_id) REFERENCES core_tenants(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_tenant_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "tenant_id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_tenant_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_tenant_users" ALTER COLUMN "user_id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_users" ALTER COLUMN "email" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_users" ALTER COLUMN "id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_users" ALTER COLUMN "password_hash" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_users' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = to_regclass('"public"."core_users"')) THEN
        ALTER TABLE "public"."core_users" ADD CONSTRAINT "core_users_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_users' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_users" ALTER COLUMN "username" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_workflow_instances' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_workflow_instances" ALTER COLUMN "id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_workflow_instances' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = to_regclass('"public"."core_workflow_instances"')) THEN
        ALTER TABLE "public"."core_workflow_instances" ADD CONSTRAINT "core_workflow_instances_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_workflow_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "assignee_id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_workflow_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "created_at" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_workflow_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_workflow_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "instance_id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_workflow_tasks' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_workflow_tasks" ALTER COLUMN "node_id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_workflow_tasks' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = to_regclass('"public"."core_workflow_tasks"')) THEN
        ALTER TABLE "public"."core_workflow_tasks" ADD CONSTRAINT "core_workflow_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_workflow_versions' AND c.relkind IN ('r','p')) THEN
        ALTER TABLE "public"."core_workflow_versions" ALTER COLUMN "id" SET NOT NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='core_workflow_versions' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'p' AND conrelid = to_regclass('"public"."core_workflow_versions"')) THEN
        ALTER TABLE "public"."core_workflow_versions" ADD CONSTRAINT "core_workflow_versions_pkey1" PRIMARY KEY (id);
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_lab_inspection_reports' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lab_inspection_reports_sample_id_fkey' AND conrelid = to_regclass('"public"."qa_lab_inspection_reports"')) THEN
        ALTER TABLE "public"."qa_lab_inspection_reports" ADD CONSTRAINT "qa_lab_inspection_reports_sample_id_fkey" FOREIGN KEY (sample_id) REFERENCES qa_lab_samples(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_lab_records' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lab_records_task_id_fkey' AND conrelid = to_regclass('"public"."qa_lab_records"')) AND to_regclass('"public"."qa_lab_tasks"') IS NOT NULL THEN
        ALTER TABLE "public"."qa_lab_records" ADD CONSTRAINT "qa_lab_records_task_id_fkey" FOREIGN KEY (task_id) REFERENCES qa_lab_tasks(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_lab_sample_lifecycle' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lab_sample_lifecycle_sample_id_fkey' AND conrelid = to_regclass('"public"."qa_lab_sample_lifecycle"')) THEN
        ALTER TABLE "public"."qa_lab_sample_lifecycle" ADD CONSTRAINT "qa_lab_sample_lifecycle_sample_id_fkey" FOREIGN KEY (sample_id) REFERENCES qa_lab_samples(id) ON DELETE CASCADE;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_lims_rfid_tags' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lims_rfid_tags_sample_id_fkey' AND conrelid = to_regclass('"public"."qa_lims_rfid_tags"')) THEN
        ALTER TABLE "public"."qa_lims_rfid_tags" ADD CONSTRAINT "qa_lims_rfid_tags_sample_id_fkey" FOREIGN KEY (sample_id) REFERENCES qa_lab_samples(id) ON DELETE SET NULL;
    END IF;
END $$;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='qa_lims_sample_barcodes' AND c.relkind IN ('r','p')) AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lims_sample_barcodes_sample_id_fkey' AND conrelid = to_regclass('"public"."qa_lims_sample_barcodes"')) THEN
        ALTER TABLE "public"."qa_lims_sample_barcodes" ADD CONSTRAINT "qa_lims_sample_barcodes_sample_id_fkey" FOREIGN KEY (sample_id) REFERENCES qa_lab_samples(id) ON DELETE SET NULL;
    END IF;
END $$;
