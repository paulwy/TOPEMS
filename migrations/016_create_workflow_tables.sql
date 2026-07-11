-- Workflow Tables Migration
-- Created for TOPEMS unified-core workflow system

CREATE SCHEMA IF NOT EXISTS core;

-- Workflows
CREATE TABLE IF NOT EXISTS core.core_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

CREATE INDEX idx_core_workflows_name ON core.core_workflows(name);
CREATE INDEX idx_core_workflows_status ON core.core_workflows(status);
CREATE INDEX idx_core_workflows_created_by ON core.core_workflows(created_by);
CREATE INDEX idx_core_workflows_created_at ON core.core_workflows(created_at);

-- Workflow Instances
CREATE TABLE IF NOT EXISTS core.core_workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES core.core_workflows(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    initiator_id UUID,
    current_node_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'running',
    variables JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_core_workflow_instances_workflow_id ON core.core_workflow_instances(workflow_id);
CREATE INDEX idx_core_workflow_instances_status ON core.core_workflow_instances(status);
CREATE INDEX idx_core_workflow_instances_initiator_id ON core.core_workflow_instances(initiator_id);
CREATE INDEX idx_core_workflow_instances_created_at ON core.core_workflow_instances(created_at);

-- Workflow Tasks
CREATE TABLE IF NOT EXISTS core.core_workflow_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instance_id UUID NOT NULL REFERENCES core.core_workflow_instances(id) ON DELETE CASCADE,
    node_id VARCHAR(255) NOT NULL,
    assignee_id UUID,
    status VARCHAR(50) DEFAULT 'pending',
    comment TEXT,
    priority VARCHAR(50),
    due_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ
);

CREATE INDEX idx_core_workflow_tasks_instance_id ON core.core_workflow_tasks(instance_id);
CREATE INDEX idx_core_workflow_tasks_assignee_id ON core.core_workflow_tasks(assignee_id);
CREATE INDEX idx_core_workflow_tasks_status ON core.core_workflow_tasks(status);
CREATE INDEX idx_core_workflow_tasks_created_at ON core.core_workflow_tasks(created_at);
CREATE INDEX idx_core_workflow_tasks_due_time ON core.core_workflow_tasks(due_time);

-- Workflow History
CREATE TABLE IF NOT EXISTS core.core_workflow_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID NOT NULL REFERENCES core.core_workflow_instances(id) ON DELETE CASCADE,
    workflow_id UUID,
    workflow_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    actor_id UUID,
    actor_name VARCHAR(255),
    node_id VARCHAR(255),
    node_name VARCHAR(255),
    status_before VARCHAR(50),
    status_after VARCHAR(50),
    comment TEXT,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_core_workflow_history_instance_id ON core.core_workflow_history(workflow_instance_id);
CREATE INDEX idx_core_workflow_history_workflow_id ON core.core_workflow_history(workflow_id);
CREATE INDEX idx_core_workflow_history_action ON core.core_workflow_history(action);
CREATE INDEX idx_core_workflow_history_actor_id ON core.core_workflow_history(actor_id);

-- Workflow Settings
CREATE TABLE IF NOT EXISTS core.core_workflow_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    category VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_core_workflow_settings_key ON core.core_workflow_settings(key);
CREATE INDEX idx_core_workflow_settings_category ON core.core_workflow_settings(category);

-- Workflow Templates
CREATE TABLE IF NOT EXISTS core.core_workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_type VARCHAR(100),
    scope VARCHAR(100),
    definition JSONB DEFAULT '{}',
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_core_workflow_templates_name ON core.core_workflow_templates(name);
CREATE INDEX idx_core_workflow_templates_type ON core.core_workflow_templates(template_type);
CREATE INDEX idx_core_workflow_templates_is_active ON core.core_workflow_templates(is_active);

-- Workflow Categories
CREATE TABLE IF NOT EXISTS core.core_workflow_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_core_workflow_categories_code ON core.core_workflow_categories(code);
CREATE INDEX idx_core_workflow_categories_sort_order ON core.core_workflow_categories(sort_order);
CREATE INDEX idx_core_workflow_categories_is_active ON core.core_workflow_categories(is_active);

-- Workflow Delegates
CREATE TABLE IF NOT EXISTS core.core_workflow_delegates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delegator_id UUID NOT NULL,
    delegator_name VARCHAR(255),
    attorney_id UUID NOT NULL,
    attorney_name VARCHAR(255),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    workflow_ids JSONB DEFAULT '[]',
    reason TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_core_workflow_delegates_delegator_id ON core.core_workflow_delegates(delegator_id);
CREATE INDEX idx_core_workflow_delegates_attorney_id ON core.core_workflow_delegates(attorney_id);
CREATE INDEX idx_core_workflow_delegates_is_active ON core.core_workflow_delegates(is_active);
CREATE INDEX idx_core_workflow_delegates_time_range ON core.core_workflow_delegates(start_time, end_time);

-- Form Definitions
CREATE TABLE IF NOT EXISTS core.core_form_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    fields JSONB DEFAULT '{}',
    layout JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    version VARCHAR(50) DEFAULT '1.0.0',
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_core_form_definitions_name ON core.core_form_definitions(name);
CREATE INDEX idx_core_form_definitions_category ON core.core_form_definitions(category);
CREATE INDEX idx_core_form_definitions_is_active ON core.core_form_definitions(is_active);

-- Form Instances
CREATE TABLE IF NOT EXISTS core.core_form_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_definition_id UUID NOT NULL REFERENCES core.core_form_definitions(id) ON DELETE CASCADE,
    form_definition_name VARCHAR(255),
    workflow_instance_id UUID REFERENCES core.core_workflow_instances(id) ON DELETE CASCADE,
    data JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'draft',
    created_by UUID,
    created_by_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_core_form_instances_form_definition_id ON core.core_form_instances(form_definition_id);
CREATE INDEX idx_core_form_instances_workflow_instance_id ON core.core_form_instances(workflow_instance_id);
CREATE INDEX idx_core_form_instances_status ON core.core_form_instances(status);

-- Workflow Rules
CREATE TABLE IF NOT EXISTS core.core_workflow_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(100) NOT NULL,
    workflow_id UUID REFERENCES core.core_workflows(id) ON DELETE CASCADE,
    node_id VARCHAR(255),
    condition TEXT,
    action JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_core_workflow_rules_workflow_id ON core.core_workflow_rules(workflow_id);
CREATE INDEX idx_core_workflow_rules_rule_type ON core.core_workflow_rules(rule_type);
CREATE INDEX idx_core_workflow_rules_is_active ON core.core_workflow_rules(is_active);

-- Workflow Approvals
CREATE TABLE IF NOT EXISTS core.core_workflow_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID NOT NULL REFERENCES core.core_workflow_instances(id) ON DELETE CASCADE,
    task_id UUID REFERENCES core.core_workflow_tasks(id) ON DELETE CASCADE,
    approver_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    comment TEXT,
    approval_level INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_core_workflow_approvals_instance_id ON core.core_workflow_approvals(workflow_instance_id);
CREATE INDEX idx_core_workflow_approvals_task_id ON core.core_workflow_approvals(task_id);
CREATE INDEX idx_core_workflow_approvals_approver_id ON core.core_workflow_approvals(approver_id);
CREATE INDEX idx_core_workflow_approvals_status ON core.core_workflow_approvals(status);

-- Workflow Version History
CREATE TABLE IF NOT EXISTS core.core_workflow_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES core.core_workflows(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    definition JSONB DEFAULT '{}',
    description TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_core_workflow_versions_unique ON core.core_workflow_versions(workflow_id, version);
CREATE INDEX idx_core_workflow_versions_workflow_id ON core.core_workflow_versions(workflow_id);

-- Workflow Process Logs
CREATE TABLE IF NOT EXISTS core.core_workflow_process_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID NOT NULL REFERENCES core.core_workflow_instances(id) ON DELETE CASCADE,
    workflow_id UUID,
    workflow_name VARCHAR(255),
    node_id VARCHAR(255),
    node_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    action_type VARCHAR(100),
    actor_id UUID,
    actor_name VARCHAR(255),
    comment TEXT,
    data JSONB DEFAULT '{}',
    duration BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_core_workflow_process_logs_instance_id ON core.core_workflow_process_logs(workflow_instance_id);
CREATE INDEX idx_core_workflow_process_logs_action_type ON core.core_workflow_process_logs(action_type);

-- Insert default workflow categories
INSERT INTO core.core_workflow_categories (name, code, sort_order)
VALUES
    ('人事审批', 'hr', 1),
    ('财务审批', 'finance', 2),
    ('采购审批', 'procurement', 3),
    ('销售审批', 'sales', 4),
    ('项目审批', 'project', 5),
    ('综合审批', 'general', 6)
ON CONFLICT (code) DO NOTHING;

-- Insert default workflow settings
INSERT INTO core.core_workflow_settings (key, value, description, category)
VALUES
    ('workflow.default_timeout_hours', '72', '工作流默认超时时间（小时）', 'system'),
    ('workflow.notification_enabled', 'true', '是否启用工作流通知', 'notification'),
    ('workflow.auto_escalate', 'false', '是否启用自动升级', 'system'),
    ('workflow.escalate_hours', '24', '自动升级时间（小时）', 'system'),
    ('workflow.max_approval_levels', '10', '最大审批级数', 'system')
ON CONFLICT (key) DO NOTHING;
