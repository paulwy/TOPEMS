-- TOPEMS CRM 数据库迁移脚本
-- 创建客户关系管理相关的表结构

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建 CRM schema
CREATE SCHEMA IF NOT EXISTS crm;

-- ============================================
-- 1. 客户表 (customers)
-- ============================================
CREATE TABLE IF NOT EXISTS crm.customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    industry VARCHAR(100),
    company_size VARCHAR(50),
    website VARCHAR(255),
    email TEXT,
    phone TEXT,
    fax VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    customer_type VARCHAR(50) DEFAULT 'potential',
    source VARCHAR(50),
    rating VARCHAR(20),
    revenue NUMERIC(15, 2),
    employee_count INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customers_organization_id ON crm.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON crm.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_name ON crm.customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_code ON crm.customers(code);
CREATE INDEX IF NOT EXISTS idx_customers_industry ON crm.customers(industry);
CREATE INDEX IF NOT EXISTS idx_customers_customer_type ON crm.customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_rating ON crm.customers(rating);
CREATE INDEX IF NOT EXISTS idx_customers_source ON crm.customers(source);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_code_unique ON crm.customers(code, organization_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE crm.customers IS '客户信息表';
COMMENT ON COLUMN crm.customers.customer_type IS '客户类型：potential, active, inactive, churned等';
COMMENT ON COLUMN crm.customers.source IS '客户来源：website, referral, campaign等';
COMMENT ON COLUMN crm.customers.rating IS '客户评级：A, B, C, D等';

-- ============================================
-- 2. 联系人表 (contacts)
-- ============================================
CREATE TABLE IF NOT EXISTS crm.contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    customer_id UUID REFERENCES crm.customers(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    full_name VARCHAR(255),
    email TEXT,
    phone TEXT,
    mobile TEXT,
    position VARCHAR(100),
    department VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    is_decision_maker BOOLEAN DEFAULT FALSE,
    gender VARCHAR(20),
    birthday DATE,
    address TEXT,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contacts_organization_id ON crm.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON crm.contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON crm.contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON crm.contacts(first_name, last_name);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON crm.contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON crm.contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_is_primary ON crm.contacts(is_primary);

COMMENT ON TABLE crm.contacts IS '联系人信息表';
COMMENT ON COLUMN crm.contacts.is_primary IS '是否为主要联系人';
COMMENT ON COLUMN crm.contacts.is_decision_maker IS '是否为决策者';

-- ============================================
-- 3. 商机表 (opportunities)
-- ============================================
CREATE TABLE IF NOT EXISTS crm.opportunities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    customer_id UUID REFERENCES crm.customers(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES crm.contacts(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    description TEXT,
    value NUMERIC(15, 2),
    expected_revenue NUMERIC(15, 2),
    stage VARCHAR(50) NOT NULL DEFAULT 'prospecting',
    probability INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    priority VARCHAR(20),
    source VARCHAR(50),
    campaign_id UUID,
    close_date DATE,
    actual_close_date DATE,
    next_step TEXT,
    competitor TEXT,
    loss_reason TEXT,
    win_reason TEXT,
    assigned_to UUID,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_opportunities_organization_id ON crm.opportunities(organization_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer_id ON crm.opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_contact_id ON crm.opportunities(contact_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON crm.opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON crm.opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_priority ON crm.opportunities(priority);
CREATE INDEX IF NOT EXISTS idx_opportunities_close_date ON crm.opportunities(close_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_assigned_to ON crm.opportunities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_opportunities_code ON crm.opportunities(code);

COMMENT ON TABLE crm.opportunities IS '商机信息表';
COMMENT ON COLUMN crm.opportunities.stage IS '商机阶段：prospecting, qualification, proposal, negotiation, closed_won, closed_lost等';
COMMENT ON COLUMN crm.opportunities.probability IS '成交概率（百分比）';

-- ============================================
-- 4. 交互记录表 (interactions)
-- ============================================
CREATE TABLE IF NOT EXISTS crm.interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    customer_id UUID REFERENCES crm.customers(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES crm.contacts(id) ON DELETE SET NULL,
    opportunity_id UUID REFERENCES crm.opportunities(id) ON DELETE SET NULL,
    interaction_type VARCHAR(50) NOT NULL,
    subject VARCHAR(255),
    content TEXT,
    location VARCHAR(255),
    duration_minutes INTEGER,
    scheduled_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled',
    outcome VARCHAR(50),
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE,
    follow_up_notes TEXT,
    assigned_to UUID,
    attachments JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_interactions_organization_id ON crm.interactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_interactions_customer_id ON crm.interactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_interactions_contact_id ON crm.interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_opportunity_id ON crm.interactions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON crm.interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_status ON crm.interactions(status);
CREATE INDEX IF NOT EXISTS idx_interactions_scheduled_at ON crm.interactions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_interactions_completed_at ON crm.interactions(completed_at);
CREATE INDEX IF NOT EXISTS idx_interactions_assigned_to ON crm.interactions(assigned_to);

COMMENT ON TABLE crm.interactions IS '交互记录表';
COMMENT ON COLUMN crm.interactions.interaction_type IS '交互类型：call, email, meeting, visit, demo等';
COMMENT ON COLUMN crm.interactions.status IS '状态：scheduled, in_progress, completed, cancelled等';

-- ============================================
-- 5. 标签表 (tags)
-- ============================================
CREATE TABLE IF NOT EXISTS crm.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) DEFAULT '#3498db',
    description TEXT,
    category VARCHAR(50),
    is_system BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tags_organization_id ON crm.tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_tags_name ON crm.tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_category ON crm.tags(category);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON crm.tags(usage_count);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name_unique ON crm.tags(name, organization_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE crm.tags IS '标签表';
COMMENT ON COLUMN crm.tags.is_system IS '是否为系统标签';

-- ============================================
-- 6. 客户标签关联表 (customer_tags)
-- ============================================
CREATE TABLE IF NOT EXISTS crm.customer_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    customer_id UUID NOT NULL REFERENCES crm.customers(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES crm.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_customer_tags_organization_id ON crm.customer_tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_customer_id ON crm.customer_tags(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag_id ON crm.customer_tags(tag_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_tags_unique ON crm.customer_tags(customer_id, tag_id) WHERE deleted_at IS NULL;

COMMENT ON TABLE crm.customer_tags IS '客户标签关联表';

-- ============================================
-- 7. 仪表盘数据表 (dashboard_metrics)
-- ============================================
CREATE TABLE IF NOT EXISTS crm.dashboard_metrics (
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

CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_organization_id ON crm.dashboard_metrics(organization_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_type ON crm.dashboard_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_period ON crm.dashboard_metrics(period_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_dashboard_metrics_name ON crm.dashboard_metrics(metric_name);

COMMENT ON TABLE crm.dashboard_metrics IS '仪表盘数据表';
COMMENT ON COLUMN crm.dashboard_metrics.metric_type IS '指标类型：revenue, customers, opportunities, conversions等';
COMMENT ON COLUMN crm.dashboard_metrics.period_type IS '周期类型：daily, weekly, monthly, quarterly, yearly等';

-- ============================================
-- 8. 审计日志表 (audit_logs)
-- ============================================
CREATE TABLE IF NOT EXISTS crm.audit_logs (
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_organization_id ON crm.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON crm.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON crm.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON crm.audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON crm.audit_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON crm.audit_logs(created_at DESC);

COMMENT ON TABLE crm.audit_logs IS '审计日志表';

-- ============================================
-- 插入默认数据（种子数据）
-- ============================================

-- 插入默认标签（示例）
INSERT INTO crm.tags (id, organization_id, name, color, category, is_system)
VALUES
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'VIP客户', '#e74c3c', 'customer_level', TRUE),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '战略客户', '#3498db', 'customer_level', TRUE),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '高潜力', '#f39c12', 'potential', TRUE),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '制造业', '#9b59b6', 'industry', TRUE),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '科技行业', '#1abc9c', 'industry', TRUE),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '金融行业', '#34495e', 'industry', TRUE),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '需跟进', '#e67e22', 'action', TRUE),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '已签约', '#27ae60', 'status', TRUE)
ON CONFLICT DO NOTHING;

-- 插入默认客户（示例）
INSERT INTO crm.customers (id, organization_id, name, code, industry, status, customer_type, rating)
VALUES
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '示例科技有限公司', 'CUST001', 'Technology', 'active', 'active', 'A'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '示例制造集团', 'CUST002', 'Manufacturing', 'active', 'active', 'B'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', '示例金融公司', 'CUST003', 'Finance', 'active', 'potential', 'A')
ON CONFLICT DO NOTHING;

-- 插入仪表盘指标示例数据
INSERT INTO crm.dashboard_metrics (id, organization_id, metric_type, metric_name, metric_value, period_type, period_start, period_end)
VALUES
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'revenue', '本月销售额', 1000000.00, 'monthly', '2026-06-01', '2026-06-30'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'customers', '新增客户数', 15, 'monthly', '2026-06-01', '2026-06-30'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'opportunities', '活跃商机数', 25, 'monthly', '2026-06-01', '2026-06-30'),
    (uuid_generate_v4(), '00000000-0000-0000-0000-000000000001', 'conversions', '商机转化率', 35.5, 'monthly', '2026-06-01', '2026-06-30')
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
        SELECT tablename FROM pg_tables WHERE schemaname = 'crm' AND tablename != 'audit_logs' AND tablename != 'customer_tags'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS update_updated_at_trigger ON crm.%I', table_name);
        EXECUTE format('CREATE TRIGGER update_updated_at_trigger BEFORE UPDATE ON crm.%I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', table_name);
    END LOOP;
END;
$$;