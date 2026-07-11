-- TOPEMS PDM 数据库迁移脚本
-- 为所有 PDM 表添加 tenant_id 字段以支持多租户

-- ============================================
-- 1. 产品表 (pdm_products)
-- ============================================
ALTER TABLE pdm_products ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE pdm_products SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
ALTER TABLE pdm_products ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdm_products_tenant_id ON pdm_products(tenant_id);

-- ============================================
-- 2. 物料表 (pdm_materials)
-- ============================================
ALTER TABLE pdm_materials ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE pdm_materials SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
ALTER TABLE pdm_materials ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdm_materials_tenant_id ON pdm_materials(tenant_id);

-- ============================================
-- 3. 变更通知表 (pdm_change_notices)
-- ============================================
ALTER TABLE pdm_change_notices ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE pdm_change_notices SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
ALTER TABLE pdm_change_notices ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdm_change_notices_tenant_id ON pdm_change_notices(tenant_id);

-- ============================================
-- 4. 工作流表 (pdm_workflows)
-- ============================================
ALTER TABLE pdm_workflows ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE pdm_workflows SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
ALTER TABLE pdm_workflows ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdm_workflows_tenant_id ON pdm_workflows(tenant_id);

-- ============================================
-- 5. 工作流实例表 (pdm_workflow_instances)
-- ============================================
ALTER TABLE pdm_workflow_instances ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE pdm_workflow_instances wi SET tenant_id = (
    SELECT w.tenant_id FROM pdm_workflows w WHERE w.id = wi.workflow_id
) WHERE tenant_id IS NULL;
UPDATE pdm_workflow_instances SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
ALTER TABLE pdm_workflow_instances ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdm_workflow_instances_tenant_id ON pdm_workflow_instances(tenant_id);

-- ============================================
-- 6. 文档表 (pdm_documents)
-- ============================================
ALTER TABLE pdm_documents ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE pdm_documents SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
ALTER TABLE pdm_documents ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdm_documents_tenant_id ON pdm_documents(tenant_id);

-- ============================================
-- 7. 版本表 (pdm_versions)
-- ============================================
ALTER TABLE pdm_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE pdm_versions SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
ALTER TABLE pdm_versions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdm_versions_tenant_id ON pdm_versions(tenant_id);

-- ============================================
-- 8. 配置表 (pdm_configurations)
-- ============================================
ALTER TABLE pdm_configurations ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE pdm_configurations SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
ALTER TABLE pdm_configurations ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdm_configurations_tenant_id ON pdm_configurations(tenant_id);

-- ============================================
-- 9. BOM表 (pdm_boms)
-- ============================================
ALTER TABLE pdm_boms ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE pdm_boms SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
ALTER TABLE pdm_boms ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdm_boms_tenant_id ON pdm_boms(tenant_id);

-- ============================================
-- 10. BOM项表 (pdm_bom_items)
-- ============================================
ALTER TABLE pdm_bom_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE pdm_bom_items bi SET tenant_id = (
    SELECT b.tenant_id FROM pdm_boms b WHERE b.id = bi.bom_id
) WHERE tenant_id IS NULL;
UPDATE pdm_bom_items SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
ALTER TABLE pdm_bom_items ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdm_bom_items_tenant_id ON pdm_bom_items(tenant_id);

-- ============================================
-- 11. 生产工序表 (pdm_production_processes)
-- ============================================
ALTER TABLE pdm_production_processes ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE pdm_production_processes SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
ALTER TABLE pdm_production_processes ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdm_production_processes_tenant_id ON pdm_production_processes(tenant_id);

-- ============================================
-- 12. 生产工步表 (pdm_production_steps)
-- ============================================
ALTER TABLE pdm_production_steps ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE pdm_production_steps ps SET tenant_id = (
    SELECT pp.tenant_id FROM pdm_production_processes pp WHERE pp.id = ps.process_id
) WHERE tenant_id IS NULL;
UPDATE pdm_production_steps SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
ALTER TABLE pdm_production_steps ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdm_production_steps_tenant_id ON pdm_production_steps(tenant_id);

-- ============================================
-- 13. 生产配方表 (pdm_production_formulas)
-- ============================================
ALTER TABLE pdm_production_formulas ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE pdm_production_formulas SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
ALTER TABLE pdm_production_formulas ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdm_production_formulas_tenant_id ON pdm_production_formulas(tenant_id);

-- ============================================
-- 14. 生产批次表 (pdm_production_batches)
-- ============================================
ALTER TABLE pdm_production_batches ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE pdm_production_batches SET tenant_id = '00000000-0000-0000-0000-000000000000'::uuid WHERE tenant_id IS NULL;
ALTER TABLE pdm_production_batches ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pdm_production_batches_tenant_id ON pdm_production_batches(tenant_id);

-- ============================================
-- 添加注释
-- ============================================
COMMENT ON COLUMN pdm_products.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN pdm_materials.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN pdm_change_notices.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN pdm_workflows.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN pdm_workflow_instances.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN pdm_documents.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN pdm_versions.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN pdm_configurations.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN pdm_boms.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN pdm_bom_items.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN pdm_production_processes.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN pdm_production_steps.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN pdm_production_formulas.tenant_id IS '租户ID，用于多租户隔离';
COMMENT ON COLUMN pdm_production_batches.tenant_id IS '租户ID，用于多租户隔离';

-- ============================================
-- 启用行级安全 (RLS)
-- ============================================
ALTER TABLE pdm_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_change_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_boms ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_production_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_production_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_production_formulas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdm_production_batches ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 创建 RLS 策略
-- ============================================
CREATE POLICY tenant_isolation_policy ON pdm_products
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_policy ON pdm_materials
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_policy ON pdm_change_notices
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_policy ON pdm_workflows
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_policy ON pdm_workflow_instances
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_policy ON pdm_documents
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_policy ON pdm_versions
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_policy ON pdm_configurations
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_policy ON pdm_boms
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_policy ON pdm_bom_items
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_policy ON pdm_production_processes
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_policy ON pdm_production_steps
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_policy ON pdm_production_formulas
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_policy ON pdm_production_batches
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
