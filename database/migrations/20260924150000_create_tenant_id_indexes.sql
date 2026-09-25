-- TOPEMS P3-3 多租户优化：tenant_id 索引补齐（幂等，IF NOT EXISTS，to_regclass 安全）
-- 24 张表 tenant_id 无索引 → 批量建单列索引

DO $$
BEGIN
    IF to_regclass('audit_logs_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='audit_logs' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS audit_logs_tenant_id_idx ON ' || quote_ident(r.sch) || '.audit_logs (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('equipment_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='equipment' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS equipment_tenant_id_idx ON ' || quote_ident(r.sch) || '.equipment (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('pdm_bom_items_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='pdm_bom_items' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS pdm_bom_items_tenant_id_idx ON ' || quote_ident(r.sch) || '.pdm_bom_items (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('pdm_boms_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='pdm_boms' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS pdm_boms_tenant_id_idx ON ' || quote_ident(r.sch) || '.pdm_boms (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('pdm_change_notices_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='pdm_change_notices' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS pdm_change_notices_tenant_id_idx ON ' || quote_ident(r.sch) || '.pdm_change_notices (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('pdm_configurations_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='pdm_configurations' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS pdm_configurations_tenant_id_idx ON ' || quote_ident(r.sch) || '.pdm_configurations (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('pdm_documents_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='pdm_documents' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS pdm_documents_tenant_id_idx ON ' || quote_ident(r.sch) || '.pdm_documents (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('pdm_materials_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='pdm_materials' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS pdm_materials_tenant_id_idx ON ' || quote_ident(r.sch) || '.pdm_materials (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('pdm_production_batches_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='pdm_production_batches' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS pdm_production_batches_tenant_id_idx ON ' || quote_ident(r.sch) || '.pdm_production_batches (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('pdm_production_formulas_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='pdm_production_formulas' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS pdm_production_formulas_tenant_id_idx ON ' || quote_ident(r.sch) || '.pdm_production_formulas (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('pdm_production_processes_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='pdm_production_processes' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS pdm_production_processes_tenant_id_idx ON ' || quote_ident(r.sch) || '.pdm_production_processes (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('pdm_production_steps_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='pdm_production_steps' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS pdm_production_steps_tenant_id_idx ON ' || quote_ident(r.sch) || '.pdm_production_steps (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('pdm_products_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='pdm_products' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS pdm_products_tenant_id_idx ON ' || quote_ident(r.sch) || '.pdm_products (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('pdm_versions_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='pdm_versions' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS pdm_versions_tenant_id_idx ON ' || quote_ident(r.sch) || '.pdm_versions (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('pdm_workflow_instances_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='pdm_workflow_instances' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS pdm_workflow_instances_tenant_id_idx ON ' || quote_ident(r.sch) || '.pdm_workflow_instances (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('pdm_workflows_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='pdm_workflows' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS pdm_workflows_tenant_id_idx ON ' || quote_ident(r.sch) || '.pdm_workflows (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('process_flows_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='process_flows' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS process_flows_tenant_id_idx ON ' || quote_ident(r.sch) || '.process_flows (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('process_routes_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='process_routes' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS process_routes_tenant_id_idx ON ' || quote_ident(r.sch) || '.process_routes (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('production_orders_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='production_orders' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS production_orders_tenant_id_idx ON ' || quote_ident(r.sch) || '.production_orders (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('production_processes_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='production_processes' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS production_processes_tenant_id_idx ON ' || quote_ident(r.sch) || '.production_processes (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('production_records_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='production_records' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS production_records_tenant_id_idx ON ' || quote_ident(r.sch) || '.production_records (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('quality_inspections_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='quality_inspections' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS quality_inspections_tenant_id_idx ON ' || quote_ident(r.sch) || '.quality_inspections (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('quality_patrols_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='quality_patrols' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS quality_patrols_tenant_id_idx ON ' || quote_ident(r.sch) || '.quality_patrols (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
    IF to_regclass('quality_standards_tenant_id_idx') IS NULL THEN
        DO $tenant$
DECLARE r record;
BEGIN
  FOR r IN SELECT n.nspname AS sch FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE c.relname='quality_standards' AND c.relkind='r'
  LOOP
    BEGIN
      EXECUTE 'CREATE INDEX IF NOT EXISTS quality_standards_tenant_id_idx ON ' || quote_ident(r.sch) || '.quality_standards (tenant_id)';
    EXCEPTION WHEN undefined_object OR undefined_column OR duplicate_object THEN NULL;
    END;
  END LOOP;
END $tenant$;
    END IF;
END $$;
