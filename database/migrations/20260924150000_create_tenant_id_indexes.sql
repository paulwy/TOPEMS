-- TOPEMS P3-3 多租户优化：tenant_id 索引补齐（幂等，IF NOT EXISTS，to_regclass 安全）
-- 24 张表 tenant_id 无索引 → 批量建单列索引

DO $$
BEGIN
    IF to_regclass('audit_logs_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX audit_logs_tenant_id_idx ON audit_logs (tenant_id)';
    END IF;
    IF to_regclass('equipment_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX equipment_tenant_id_idx ON equipment (tenant_id)';
    END IF;
    IF to_regclass('pdm_bom_items_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX pdm_bom_items_tenant_id_idx ON pdm_bom_items (tenant_id)';
    END IF;
    IF to_regclass('pdm_boms_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX pdm_boms_tenant_id_idx ON pdm_boms (tenant_id)';
    END IF;
    IF to_regclass('pdm_change_notices_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX pdm_change_notices_tenant_id_idx ON pdm_change_notices (tenant_id)';
    END IF;
    IF to_regclass('pdm_configurations_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX pdm_configurations_tenant_id_idx ON pdm_configurations (tenant_id)';
    END IF;
    IF to_regclass('pdm_documents_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX pdm_documents_tenant_id_idx ON pdm_documents (tenant_id)';
    END IF;
    IF to_regclass('pdm_materials_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX pdm_materials_tenant_id_idx ON pdm_materials (tenant_id)';
    END IF;
    IF to_regclass('pdm_production_batches_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX pdm_production_batches_tenant_id_idx ON pdm_production_batches (tenant_id)';
    END IF;
    IF to_regclass('pdm_production_formulas_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX pdm_production_formulas_tenant_id_idx ON pdm_production_formulas (tenant_id)';
    END IF;
    IF to_regclass('pdm_production_processes_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX pdm_production_processes_tenant_id_idx ON pdm_production_processes (tenant_id)';
    END IF;
    IF to_regclass('pdm_production_steps_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX pdm_production_steps_tenant_id_idx ON pdm_production_steps (tenant_id)';
    END IF;
    IF to_regclass('pdm_products_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX pdm_products_tenant_id_idx ON pdm_products (tenant_id)';
    END IF;
    IF to_regclass('pdm_versions_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX pdm_versions_tenant_id_idx ON pdm_versions (tenant_id)';
    END IF;
    IF to_regclass('pdm_workflow_instances_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX pdm_workflow_instances_tenant_id_idx ON pdm_workflow_instances (tenant_id)';
    END IF;
    IF to_regclass('pdm_workflows_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX pdm_workflows_tenant_id_idx ON pdm_workflows (tenant_id)';
    END IF;
    IF to_regclass('process_flows_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX process_flows_tenant_id_idx ON process_flows (tenant_id)';
    END IF;
    IF to_regclass('process_routes_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX process_routes_tenant_id_idx ON process_routes (tenant_id)';
    END IF;
    IF to_regclass('production_orders_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX production_orders_tenant_id_idx ON production_orders (tenant_id)';
    END IF;
    IF to_regclass('production_processes_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX production_processes_tenant_id_idx ON production_processes (tenant_id)';
    END IF;
    IF to_regclass('production_records_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX production_records_tenant_id_idx ON production_records (tenant_id)';
    END IF;
    IF to_regclass('quality_inspections_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX quality_inspections_tenant_id_idx ON quality_inspections (tenant_id)';
    END IF;
    IF to_regclass('quality_patrols_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX quality_patrols_tenant_id_idx ON quality_patrols (tenant_id)';
    END IF;
    IF to_regclass('quality_standards_tenant_id_idx') IS NULL THEN
        EXECUTE 'CREATE INDEX quality_standards_tenant_id_idx ON quality_standards (tenant_id)';
    END IF;
END $$;
