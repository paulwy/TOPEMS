-- Unified Core - 添加 tenant_id 支持
-- 使用 RLS (Row Level Security) 进行租户隔离

-- 1. 工作流表
ALTER TABLE core_workflows ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_workflows SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_workflows ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_workflows_tenant_id ON core_workflows(tenant_id);

-- 2. 工作流实例表
ALTER TABLE core_workflow_instances ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_workflow_instances SET tenant_id = (
    SELECT w.tenant_id FROM core_workflows w 
    WHERE w.id = core_workflow_instances.workflow_id 
    LIMIT 1
) WHERE tenant_id IS NULL;
UPDATE core_workflow_instances SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_workflow_instances ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_workflow_instances_tenant_id ON core_workflow_instances(tenant_id);

-- 3. 工作流任务表
ALTER TABLE core_workflow_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_workflow_tasks SET tenant_id = (
    SELECT wi.tenant_id FROM core_workflow_instances wi 
    WHERE wi.id = core_workflow_tasks.instance_id 
    LIMIT 1
) WHERE tenant_id IS NULL;
UPDATE core_workflow_tasks SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_workflow_tasks ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_workflow_tasks_tenant_id ON core_workflow_tasks(tenant_id);

-- 4. 工作流分类表
ALTER TABLE core_workflow_categories ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_workflow_categories SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_workflow_categories ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_workflow_categories_tenant_id ON core_workflow_categories(tenant_id);

-- 5. 工作流委托表
ALTER TABLE core_workflow_delegates ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_workflow_delegates SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_workflow_delegates ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_workflow_delegates_tenant_id ON core_workflow_delegates(tenant_id);

-- 6. 表单定义表
ALTER TABLE core_form_definitions ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_form_definitions SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_form_definitions ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_form_definitions_tenant_id ON core_form_definitions(tenant_id);

-- 7. 表单实例表
ALTER TABLE core_form_instances ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_form_instances SET tenant_id = (
    SELECT fd.tenant_id FROM core_form_definitions fd 
    WHERE fd.id = core_form_instances.form_definition_id 
    LIMIT 1
) WHERE tenant_id IS NULL;
UPDATE core_form_instances SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_form_instances ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_form_instances_tenant_id ON core_form_instances(tenant_id);

-- 8. 工作流历史表
ALTER TABLE core_workflow_history ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_workflow_history SET tenant_id = (
    SELECT wi.tenant_id FROM core_workflow_instances wi 
    WHERE wi.id = core_workflow_history.workflow_instance_id 
    LIMIT 1
) WHERE tenant_id IS NULL;
UPDATE core_workflow_history SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_workflow_history ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_workflow_history_tenant_id ON core_workflow_history(tenant_id);

-- 9. 工作流设置表
ALTER TABLE core_workflow_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_workflow_settings SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_workflow_settings ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_workflow_settings_tenant_id ON core_workflow_settings(tenant_id);

-- 10. 工作流模板表
ALTER TABLE core_workflow_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_workflow_templates SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_workflow_templates ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_workflow_templates_tenant_id ON core_workflow_templates(tenant_id);

-- 11. 工作流规则表
ALTER TABLE core_workflow_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_workflow_rules SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_workflow_rules ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_workflow_rules_tenant_id ON core_workflow_rules(tenant_id);

-- 12. 流程日志表
ALTER TABLE core_process_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;
UPDATE core_process_logs SET tenant_id = (
    SELECT wi.tenant_id FROM core_workflow_instances wi 
    WHERE wi.id = core_process_logs.workflow_instance_id 
    LIMIT 1
) WHERE tenant_id IS NULL;
UPDATE core_process_logs SET tenant_id = (SELECT id FROM core_tenants LIMIT 1) WHERE tenant_id IS NULL;
ALTER TABLE core_process_logs ALTER COLUMN tenant_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_core_process_logs_tenant_id ON core_process_logs(tenant_id);

-- 启用 RLS
ALTER TABLE core_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_workflow_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_workflow_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_workflow_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_workflow_delegates ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_form_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_form_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_workflow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_workflow_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_process_logs ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY IF NOT EXISTS core_workflows_tenant_policy ON core_workflows
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS core_workflow_instances_tenant_policy ON core_workflow_instances
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS core_workflow_tasks_tenant_policy ON core_workflow_tasks
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS core_workflow_categories_tenant_policy ON core_workflow_categories
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS core_workflow_delegates_tenant_policy ON core_workflow_delegates
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS core_form_definitions_tenant_policy ON core_form_definitions
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS core_form_instances_tenant_policy ON core_form_instances
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS core_workflow_history_tenant_policy ON core_workflow_history
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS core_workflow_settings_tenant_policy ON core_workflow_settings
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS core_workflow_templates_tenant_policy ON core_workflow_templates
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS core_workflow_rules_tenant_policy ON core_workflow_rules
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);

CREATE POLICY IF NOT EXISTS core_process_logs_tenant_policy ON core_process_logs
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
