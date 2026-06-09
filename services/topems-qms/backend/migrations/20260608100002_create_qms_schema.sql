-- TOPEMS QMS 数据库迁移脚本
-- 创建质量管理相关的表结构

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建 QMS schema
CREATE SCHEMA IF NOT EXISTS qms;

-- ============================================
-- 1. 质量标准表 (quality_standards)
-- ============================================
CREATE TABLE IF NOT EXISTS qms.quality_standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    version VARCHAR(50) DEFAULT '1.0',
    standard_type VARCHAR(50),
    authority VARCHAR(255),
    effective_date DATE,
    expiry_date DATE,
    requirements TEXT,
    criteria TEXT,
    compliance_level VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    is_mandatory BOOLEAN DEFAULT FALSE,
    review_frequency VARCHAR(50),
    last_review_date DATE,
    next_review_date DATE,
    reviewer VARCHAR(255),
    notes TEXT,
    attachments JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quality_standards_organization_id ON qms.quality_standards(organization_id);
CREATE INDEX IF NOT EXISTS idx_quality_standards_code ON qms.quality_standards(code);
CREATE INDEX IF NOT EXISTS idx_quality_standards_name ON qms.quality_standards(name);
CREATE INDEX IF NOT EXISTS idx_quality_standards_category ON qms.quality_standards(category);
CREATE INDEX IF NOT EXISTS idx_quality_standards_status ON qms.quality_standards(status);
CREATE INDEX IF NOT EXISTS idx_quality_standards_standard_type ON qms.quality_standards(standard_type);
CREATE INDEX IF NOT EXISTS idx_quality_standards_effective_date ON qms.quality_standards(effective_date);
CREATE INDEX IF NOT EXISTS idx_quality_standards_next_review_date ON qms.quality_standards(next_review_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quality_standards_code_unique ON qms.quality_standards(code, organization_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE qms.quality_standards IS '质量标准表';
COMMENT ON COLUMN qms.quality_standards.standard_type IS '标准类型：international, national, industry, company等';
COMMENT ON COLUMN qms.quality_standards.compliance_level IS '合规级别：mandatory, recommended, optional等';

-- ============================================
-- 2. 质量检验表 (quality_inspections)
-- ============================================
CREATE TABLE IF NOT EXISTS qms.quality_inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    standard_id UUID REFERENCES qms.quality_standards(id) ON DELETE SET NULL,
    inspection_number VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    inspection_type VARCHAR(50) NOT NULL,
    inspection_method VARCHAR(50),
    inspection_category VARCHAR(50),
    object_type VARCHAR(50),
    object_id UUID,
    object_name VARCHAR(255),
    object_batch VARCHAR(100),
    inspector VARCHAR(255) NOT NULL,
    inspector_id UUID,
    department VARCHAR(100),
    location VARCHAR(255),
    planned_date DATE,
    actual_date DATE,
    start_time TIME,
    end_time TIME,
    duration_minutes INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'planned',
    result VARCHAR(20),
    score NUMERIC(5, 2),
    pass_rate NUMERIC(5, 2),
    total_items INTEGER,
    passed_items INTEGER,
    failed_items INTEGER,
    findings TEXT,
    conclusion TEXT,
    recommendations TEXT,
    risk_level VARCHAR(20),
    next_inspection_date DATE,
    follow_up_required BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ,
    attachments JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quality_inspections_organization_id ON qms.quality_inspections(organization_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_standard_id ON qms.quality_inspections(standard_id);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_inspection_number ON qms.quality_inspections(inspection_number);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_type ON qms.quality_inspections(inspection_type);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_status ON qms.quality_inspections(status);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_result ON qms.quality_inspections(result);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_inspector ON qms.quality_inspections(inspector);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_planned_date ON qms.quality_inspections(planned_date);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_actual_date ON qms.quality_inspections(actual_date);
CREATE INDEX IF NOT EXISTS idx_quality_inspections_object_id ON qms.quality_inspections(object_id);

COMMENT ON TABLE qms.quality_inspections IS '质量检验表';
COMMENT ON COLUMN qms.quality_inspections.inspection_type IS '检验类型：incoming, in_process, final, audit等';
COMMENT ON COLUMN qms.quality_inspections.status IS '状态：planned, in_progress, completed, cancelled等';
COMMENT ON COLUMN qms.quality_inspections.result IS '检验结果：passed, failed, conditional等';

-- ============================================
-- 检验项明细表 (inspection_items)
-- ============================================
CREATE TABLE IF NOT EXISTS qms.inspection_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    inspection_id UUID NOT NULL REFERENCES qms.quality_inspections(id) ON DELETE CASCADE,
    item_number INTEGER,
    item_name VARCHAR(255) NOT NULL,
    item_category VARCHAR(50),
    specification TEXT,
    requirement TEXT,
    test_method VARCHAR(100),
    expected_value VARCHAR(255),
    actual_value VARCHAR(255),
    tolerance VARCHAR(100),
    unit VARCHAR(50),
    is_critical BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    result VARCHAR(20),
    deviation TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inspection_items_organization_id ON qms.inspection_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_inspection_id ON qms.inspection_items(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_items_status ON qms.inspection_items(status);
CREATE INDEX IF NOT EXISTS idx_inspection_items_result ON qms.inspection_items(result);
CREATE INDEX IF NOT EXISTS idx_inspection_items_is_critical ON qms.inspection_items(is_critical);

COMMENT ON TABLE qms.inspection_items IS '检验项明细表';

-- ============================================
-- 3. 质量问题表 (quality_issues)
-- ============================================
CREATE TABLE IF NOT EXISTS qms.quality_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    issue_number VARCHAR(100),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    issue_type VARCHAR(50),
    category VARCHAR(50),
    severity VARCHAR(20) NOT NULL,
    priority VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    source VARCHAR(50),
    source_reference VARCHAR(255),
    related_inspection_id UUID REFERENCES qms.quality_inspections(id) ON DELETE SET NULL,
    related_standard_id UUID REFERENCES qms.quality_standards(id) ON DELETE SET NULL,
    affected_object_type VARCHAR(50),
    affected_object_id UUID,
    affected_object_name VARCHAR(255),
    affected_batch VARCHAR(100),
    affected_quantity INTEGER,
    location VARCHAR(255),
    discovered_date DATE,
    discovered_by VARCHAR(255),
    reported_date DATE,
    reported_by VARCHAR(255),
    assigned_to VARCHAR(255),
    assigned_to_id UUID,
    assigned_date DATE,
    due_date DATE,
    resolved_date DATE,
    resolution_time_hours NUMERIC(10, 2),
    root_cause TEXT,
    impact_analysis TEXT,
    cost_estimate NUMERIC(15, 2),
    actual_cost NUMERIC(15, 2),
    customer_impacted BOOLEAN DEFAULT FALSE,
    customer_name VARCHAR(255),
    customer_notification_date DATE,
    regulatory_impact BOOLEAN DEFAULT FALSE,
    regulatory_body VARCHAR(255),
    risk_level VARCHAR(20),
    recurrence_probability VARCHAR(20),
    attachments JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quality_issues_organization_id ON qms.quality_issues(organization_id);
CREATE INDEX IF NOT EXISTS idx_quality_issues_issue_number ON qms.quality_issues(issue_number);
CREATE INDEX IF NOT EXISTS idx_quality_issues_type ON qms.quality_issues(issue_type);
CREATE INDEX IF NOT EXISTS idx_quality_issues_severity ON qms.quality_issues(severity);
CREATE INDEX IF NOT EXISTS idx_quality_issues_priority ON qms.quality_issues(priority);
CREATE INDEX IF NOT EXISTS idx_quality_issues_status ON qms.quality_issues(status);
CREATE INDEX IF NOT EXISTS idx_quality_issues_source ON qms.quality_issues(source);
CREATE INDEX IF NOT EXISTS idx_quality_issues_assigned_to ON qms.quality_issues(assigned_to);
CREATE INDEX IF NOT EXISTS idx_quality_issues_due_date ON qms.quality_issues(due_date);
CREATE INDEX IF NOT EXISTS idx_quality_issues_discovered_date ON qms.quality_issues(discovered_date);
CREATE INDEX IF NOT EXISTS idx_quality_issues_related_inspection_id ON qms.quality_issues(related_inspection_id);

COMMENT ON TABLE qms.quality_issues IS '质量问题表';
COMMENT ON COLUMN qms.quality_issues.severity IS '严重程度：critical, major, minor, observation等';
COMMENT ON COLUMN qms.quality_issues.status IS '状态：open, investigating, resolved, closed等';
COMMENT ON COLUMN qms.quality_issues.source IS '问题来源：inspection, complaint, audit, internal等';

-- ============================================
-- 4. 纠正措施表 (corrective_actions)
-- ============================================
CREATE TABLE IF NOT EXISTS qms.corrective_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    action_number VARCHAR(100),
    issue_id UUID NOT NULL REFERENCES qms.quality_issues(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    action_type VARCHAR(50),
    category VARCHAR(50),
    root_cause_analysis TEXT,
    immediate_action TEXT,
    long_term_action TEXT,
    preventive_action TEXT,
    assigned_to VARCHAR(255) NOT NULL,
    assigned_to_id UUID,
    department VARCHAR(100),
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    implementation_date DATE,
    implementation_details TEXT,
    resources_required TEXT,
    estimated_cost NUMERIC(15, 2),
    actual_cost NUMERIC(15, 2),
    status VARCHAR(20) NOT NULL DEFAULT 'planned',
    progress_percentage INTEGER DEFAULT 0,
    effectiveness VARCHAR(20),
    verification_method VARCHAR(100),
    verification_criteria TEXT,
    verification_result VARCHAR(20),
    verified_by VARCHAR(255),
    verified_by_id UUID,
    verification_date DATE,
    verification_notes TEXT,
    effectiveness_review_date DATE,
    effectiveness_result VARCHAR(20),
    recurrence_check_date DATE,
    recurrence_found BOOLEAN DEFAULT FALSE,
    follow_up_actions TEXT,
    attachments JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_corrective_actions_organization_id ON qms.corrective_actions(organization_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_issue_id ON qms.corrective_actions(issue_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_action_number ON qms.corrective_actions(action_number);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_type ON qms.corrective_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_status ON qms.corrective_actions(status);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_assigned_to ON qms.corrective_actions(assigned_to);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_planned_end_date ON qms.corrective_actions(planned_end_date);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_effectiveness ON qms.corrective_actions(effectiveness);

COMMENT ON TABLE qms.corrective_actions IS '纠正措施表';
COMMENT ON COLUMN qms.corrective_actions.action_type IS '措施类型：corrective, preventive, improvement等';
COMMENT ON COLUMN qms.corrective_actions.status IS '状态：planned, in_progress, implemented, verified, closed等';
COMMENT ON COLUMN qms.corrective_actions.effectiveness IS '有效性：effective, partially_effective, ineffective等';

-- ============================================
-- 5. 仪表盘数据表 (dashboard_metrics)
-- ============================================
CREATE TABLE IF NOT EXISTS qms.dashboard_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value NUMERIC(15, 2) NOT NULL,
    metric_unit VARCHAR(20),
    period_type VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    comparison_value NUMERIC(15, 2),
    comparison_period_start DATE,
    comparison_period_end DATE,
    trend VARCHAR(20),
    target_value NUMERIC(15, 2),
    achievement_percentage NUMERIC(5, 2),
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_organization_id ON qms.dashboard_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_type ON qms.dashboard_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_period ON qms.dashboard_metrics(period_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_name ON qms.dashboard_metrics(metric_name);

COMMENT ON TABLE qms.dashboard_metrics IS '仪表盘数据表';
COMMENT ON COLUMN qms.dashboard_metrics.metric_type IS '指标类型：inspection, issue, compliance, improvement等';
COMMENT ON COLUMN qms.dashboard_metrics.period_type IS '周期类型：daily, weekly, monthly, quarterly, yearly等';

-- ============================================
-- 6. 审计日志表 (audit_logs)
-- ============================================
CREATE TABLE IF NOT EXISTS qms.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON qms.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON qms.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON qms.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON qms.audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON qms.audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON qms.audit_logs(created_at DESC);

COMMENT ON TABLE qms.audit_logs IS '审计日志表';

-- ============================================
-- 插入默认数据（种子数据）
-- ============================================

-- 插入默认质量标准（示例）
INSERT INTO qms.quality_standards (id, organization_id, code, name, category, standard_type, status, is_mandatory)
VALUES
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'ISO9001', 'ISO 9001质量管理体系', 'quality_management', 'international', 'active', TRUE),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'ISO14001', 'ISO 14001环境管理体系', 'environment', 'international', 'active', TRUE),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'QMS-001', '企业内部质量标准', 'internal', 'company', 'active', TRUE),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'QMS-002', '产品检验标准', 'product', 'company', 'active', TRUE)
ON CONFLICT DO NOTHING;

-- 插入仪表盘指标示例数据
INSERT INTO qms.dashboard_metrics (id, organization_id, metric_type, metric_name, metric_value, period_type, period_start, period_end)
VALUES
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'inspection', '本月检验次数', 125, 'monthly', '2026-06-01', '2026-06-30'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'inspection', '检验合格率', 98.5, 'monthly', '2026-06-01', '2026-06-30'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'issue', '质量问题数', 15, 'monthly', '2026-06-01', '2026-06-30'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'issue', '问题解决率', 85.5, 'monthly', '2026-06-01', '2026-06-30'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'compliance', '合规达标率', 99.2, 'monthly', '2026-06-01', '2026-06-30')
ON CONFLICT DO NOTHING;

-- ============================================
-- 创建更新时间触发器函数
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表创建更新时间触发器
DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOR table_name IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'qms' AND tablename != 'audit_logs'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_updated_at_trigger ON qms.%I', table_name);
        EXECUTE format('CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON qms.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', table_name);
    END LOOP;
END;
$$;