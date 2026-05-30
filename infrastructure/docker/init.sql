-- TOPEMS 数据库初始化脚本
-- 创建数据库
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================
-- topems-doc 文件管理数据库
-- ========================
CREATE SCHEMA IF NOT EXISTS doc;

-- 文件夹表
CREATE TABLE IF NOT EXISTS doc.folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES doc.folders(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100) NOT NULL
);

-- 文件表
CREATE TABLE IF NOT EXISTS doc.files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    folder_id UUID REFERENCES doc.folders(id) ON DELETE CASCADE,
    size BIGINT NOT NULL DEFAULT 0,
    content_type VARCHAR(100) NOT NULL,
    checksum VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100) NOT NULL
);

-- 文件版本表
CREATE TABLE IF NOT EXISTS doc.file_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES doc.files(id) ON DELETE CASCADE,
    version INT NOT NULL,
    size BIGINT NOT NULL,
    checksum VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(100) NOT NULL,
    UNIQUE(file_id, version)
);

-- 文件权限表
CREATE TABLE IF NOT EXISTS doc.file_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES doc.files(id) ON DELETE CASCADE,
    user_id UUID,
    role_id UUID,
    permission VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (user_id IS NOT NULL OR role_id IS NOT NULL)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON doc.folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_files_folder_id ON doc.files(folder_id);
CREATE INDEX IF NOT EXISTS idx_files_created_by ON doc.files(created_by);
CREATE INDEX IF NOT EXISTS idx_file_versions_file_id ON doc.file_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_file_id ON doc.file_permissions(file_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_user_id ON doc.file_permissions(user_id);

-- ========================
-- topems-iam 身份认证数据库
-- ========================
CREATE SCHEMA IF NOT EXISTS iam;

-- 用户表
CREATE TABLE IF NOT EXISTS iam.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_superuser BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- 角色表
CREATE TABLE IF NOT EXISTS iam.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS iam.user_roles (
    user_id UUID REFERENCES iam.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES iam.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

-- 权限表
CREATE TABLE IF NOT EXISTS iam.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT
);

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS iam.role_permissions (
    role_id UUID REFERENCES iam.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES iam.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- 审计日志表
CREATE TABLE IF NOT EXISTS iam.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON iam.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON iam.user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON iam.role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON iam.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON iam.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON iam.audit_logs(created_at);

-- 插入默认管理员用户 (密码: admin123)
INSERT INTO iam.users (username, email, password_hash, full_name, is_superuser) 
VALUES ('admin', 'admin@topems.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5Gy8J4VdQwK2u', '系统管理员', TRUE)
ON CONFLICT (username) DO NOTHING;

-- 插入默认角色
INSERT INTO iam.roles (name, description)
VALUES ('admin', '系统管理员'), ('user', '普通用户')
ON CONFLICT (name) DO NOTHING;

-- 为管理员分配角色
WITH admin_user AS (
    SELECT id FROM iam.users WHERE username = 'admin'
), admin_role AS (
    SELECT id FROM iam.roles WHERE name = 'admin'
)
INSERT INTO iam.user_roles (user_id, role_id)
SELECT au.id, ar.id FROM admin_user au, admin_role ar
ON CONFLICT DO NOTHING;

-- 插入默认权限
INSERT INTO iam.permissions (name, resource, action, description)
VALUES 
    ('read:users', 'users', 'read', '查看用户'),
    ('write:users', 'users', 'write', '创建/编辑用户'),
    ('delete:users', 'users', 'delete', '删除用户'),
    ('read:files', 'files', 'read', '查看文件'),
    ('write:files', 'files', 'write', '上传文件'),
    ('delete:files', 'files', 'delete', '删除文件')
ON CONFLICT (name) DO NOTHING;

-- ========================
-- topems-ai 知识库数据库
-- ========================
CREATE SCHEMA IF NOT EXISTS ai;

-- 文档表
CREATE TABLE IF NOT EXISTS ai.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(500) NOT NULL,
    content TEXT,
    metadata JSONB,
    file_id UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 向量表 (用于 pgvector 扩展)
-- 注释：需要先 CREATE EXTENSION vector;
-- CREATE TABLE IF NOT EXISTS ai.embeddings (
--     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--     document_id UUID REFERENCES ai.documents(id) ON DELETE CASCADE,
--     chunk_index INT,
--     embedding vector(1536),  -- OpenAI ada-002 维度
--     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- 标签表
CREATE TABLE IF NOT EXISTS ai.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    color VARCHAR(7) DEFAULT '#3b82f6',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 文档标签关联表
CREATE TABLE IF NOT EXISTS ai.document_tags (
    document_id UUID REFERENCES ai.documents(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES ai.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (document_id, tag_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON ai.documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON ai.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_document_tags_document_id ON ai.document_tags(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag_id ON ai.document_tags(tag_id);

-- ========================
-- topems-flow 工作流数据库
-- ========================
CREATE SCHEMA IF NOT EXISTS flow;

-- 工作流定义表
CREATE TABLE IF NOT EXISTS flow.workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 工作流实例表
CREATE TABLE IF NOT EXISTS flow.workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES flow.workflows(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed, cancelled
    initiator_id UUID,
    data JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 审批任务表
CREATE TABLE IF NOT EXISTS flow.approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_instance_id UUID REFERENCES flow.workflow_instances(id) ON DELETE CASCADE,
    node_id VARCHAR(255),
    task_name VARCHAR(200) NOT NULL,
    assignee_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, approved, rejected, delegated
    approval_type VARCHAR(50),
    comment TEXT,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    timeout_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 审批记录表
CREATE TABLE IF NOT EXISTS flow.approval_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    approval_id UUID REFERENCES flow.approvals(id) NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID NOT NULL,
    actor_name VARCHAR(255),
    comment TEXT,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 通知表
CREATE TABLE IF NOT EXISTS flow.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    workflow_instance_id UUID REFERENCES flow.workflow_instances(id) ON DELETE CASCADE,
    approval_id UUID REFERENCES flow.approvals(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 工作流实例表 - add missing columns
ALTER TABLE flow.workflow_instances 
    ADD COLUMN IF NOT EXISTS current_node VARCHAR(255);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON flow.workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_workflow_id ON flow.workflow_instances(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON flow.workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_initiator_id ON flow.workflow_instances(initiator_id);
CREATE INDEX IF NOT EXISTS idx_approvals_instance_id ON flow.approvals(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_approvals_assignee_id ON flow.approvals(assignee_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON flow.approvals(status);
CREATE INDEX IF NOT EXISTS idx_approval_records_approval_id ON flow.approval_records(approval_id);
CREATE INDEX IF NOT EXISTS idx_approval_records_actor_id ON flow.approval_records(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON flow.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON flow.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON flow.notifications(created_at);

-- 插入一些默认工作流
INSERT INTO flow.workflows (name, description, definition, is_active, created_at)
VALUES 
    ('文件上传审批', '文件上传到特定目录需要审批', '{"steps": []}'::jsonb, TRUE, NOW()),
    ('请假流程', '员工请假审批流程', '{"steps": []}'::jsonb, TRUE, NOW())
ON CONFLICT DO NOTHING;

-- ========================
-- topems-lims 实验室信息管理系统数据库
-- ========================
CREATE SCHEMA IF NOT EXISTS lims;

-- 样品表
CREATE TABLE IF NOT EXISTS lims.samples (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sample_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    received_date DATE NOT NULL,
    analysis_date DATE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 测试记录表
CREATE TABLE IF NOT EXISTS lims.test_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sample_id UUID NOT NULL REFERENCES lims.samples(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    test_method VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    result TEXT,
    unit VARCHAR(50),
    standard TEXT,
    tested_by UUID,
    tested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 设备表
CREATE TABLE IF NOT EXISTS lims.equipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255),
    serial_number VARCHAR(255) UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    location VARCHAR(255),
    last_calibration_date DATE,
    next_calibration_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_samples_sample_id ON lims.samples(sample_id);
CREATE INDEX IF NOT EXISTS idx_samples_status ON lims.samples(status);
CREATE INDEX IF NOT EXISTS idx_test_records_sample_id ON lims.test_records(sample_id);
CREATE INDEX IF NOT EXISTS idx_test_records_status ON lims.test_records(status);
CREATE INDEX IF NOT EXISTS idx_equipments_status ON lims.equipments(status);
CREATE INDEX IF NOT EXISTS idx_equipments_serial_number ON lims.equipments(serial_number);

-- ========================
-- topems-rs 科研研发管理数据库
-- ========================
CREATE SCHEMA IF NOT EXISTS rs;

-- 项目表
CREATE TABLE IF NOT EXISTS rs.projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed, cancelled
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',  -- low, medium, high
    start_date DATE,
    end_date DATE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 实验表
CREATE TABLE IF NOT EXISTS rs.experiments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES rs.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, running, completed, failed, cancelled
    experiment_type VARCHAR(100),
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 配方表
CREATE TABLE IF NOT EXISTS rs.formulas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES rs.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 配方原料表
CREATE TABLE IF NOT EXISTS rs.ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formula_id UUID REFERENCES rs.formulas(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity NUMERIC NOT NULL,
    unit VARCHAR(50) NOT NULL,
    percentage NUMERIC NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_projects_status ON rs.projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON rs.projects(created_by);
CREATE INDEX IF NOT EXISTS idx_experiments_project_id ON rs.experiments(project_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON rs.experiments(status);
CREATE INDEX IF NOT EXISTS idx_formulas_project_id ON rs.formulas(project_id);
CREATE INDEX IF NOT EXISTS idx_ingredients_formula_id ON rs.ingredients(formula_id);

-- ========================
-- topems-qms 质量管理系统数据库
-- ========================
CREATE SCHEMA IF NOT EXISTS qms;

-- 质量标准表
CREATE TABLE IF NOT EXISTS qms.quality_standards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(100),
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    description TEXT,
    content TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',  -- draft, active, inactive
    effective_date DATE,
    expiry_date DATE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 质量检查表
CREATE TABLE IF NOT EXISTS qms.quality_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_no VARCHAR(100) UNIQUE NOT NULL,
    project_id UUID,
    check_type VARCHAR(100) NOT NULL,
    inspector VARCHAR(255),
    check_date DATE,
    location VARCHAR(255),
    result VARCHAR(50),  -- pass, fail, pending
    conclusion TEXT,
    attachments TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed, cancelled
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 检查项表
CREATE TABLE IF NOT EXISTS qms.check_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_id UUID NOT NULL REFERENCES qms.quality_checks(id) ON DELETE CASCADE,
    standard_id UUID REFERENCES qms.quality_standards(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    check_method TEXT,
    standard_value VARCHAR(255),
    actual_value VARCHAR(255),
    is_conform BOOLEAN,
    remarks TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 质量异常表
CREATE TABLE IF NOT EXISTS qms.quality_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_no VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(50) NOT NULL DEFAULT 'medium',  -- low, medium, high, critical
    category VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'open',  -- open, in_progress, resolved, closed
    assignee UUID,
    due_date DATE,
    resolution TEXT,
    closed_at TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 质量改进表
CREATE TABLE IF NOT EXISTS qms.quality_improvements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    improvement_no VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    issue_id UUID REFERENCES qms.quality_issues(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',  -- low, medium, high
    owner UUID,
    start_date DATE,
    end_date DATE,
    actual_end_date DATE,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_quality_standards_code ON qms.quality_standards(code);
CREATE INDEX IF NOT EXISTS idx_quality_standards_status ON qms.quality_standards(status);
CREATE INDEX IF NOT EXISTS idx_quality_checks_check_no ON qms.quality_checks(check_no);
CREATE INDEX IF NOT EXISTS idx_quality_checks_status ON qms.quality_checks(status);
CREATE INDEX IF NOT EXISTS idx_check_items_check_id ON qms.check_items(check_id);
CREATE INDEX IF NOT EXISTS idx_quality_issues_issue_no ON qms.quality_issues(issue_no);
CREATE INDEX IF NOT EXISTS idx_quality_issues_status ON qms.quality_issues(status);
CREATE INDEX IF NOT EXISTS idx_quality_issues_severity ON qms.quality_issues(severity);
CREATE INDEX IF NOT EXISTS idx_quality_improvements_status ON qms.quality_improvements(status);

-- ========================
-- topems-ehs 环境健康安全系统数据库
-- ========================
CREATE SCHEMA IF NOT EXISTS ehs;

-- 危险源表
CREATE TABLE IF NOT EXISTS ehs.safety_hazards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hazard_no VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    level VARCHAR(50) NOT NULL DEFAULT 'medium',  -- low, medium, high, critical
    description TEXT,
    location VARCHAR(255),
    risk_assessment JSONB,
    control_measures TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'active',  -- active, mitigated, closed
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 安全检查表
CREATE TABLE IF NOT EXISTS ehs.safety_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_no VARCHAR(100) UNIQUE NOT NULL,
    check_type VARCHAR(100) NOT NULL,
    inspector VARCHAR(255),
    check_date DATE,
    location VARCHAR(255),
    result VARCHAR(50),  -- pass, fail, pending
    issues TEXT[],
    attachments TEXT[],
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, in_progress, completed, cancelled
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 安全检查项表
CREATE TABLE IF NOT EXISTS ehs.safety_check_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    check_id UUID NOT NULL REFERENCES ehs.safety_checks(id) ON DELETE CASCADE,
    hazard_id UUID REFERENCES ehs.safety_hazards(id) ON DELETE SET NULL,
    item_name VARCHAR(255) NOT NULL,
    check_method TEXT,
    standard TEXT,
    is_conform BOOLEAN,
    remarks TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 应急预案表
CREATE TABLE IF NOT EXISTS ehs.emergency_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_no VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100),
    scope TEXT,
    trigger_conditions TEXT,
    response_procedures TEXT,
    responsible_persons TEXT[],
    contact_info TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',  -- draft, active, inactive
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 演练记录表
CREATE TABLE IF NOT EXISTS ehs.drill_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plan_id UUID REFERENCES ehs.emergency_plans(id) ON DELETE CASCADE,
    drill_name VARCHAR(255) NOT NULL,
    drill_date DATE NOT NULL,
    participants TEXT[],
    duration INTERVAL,
    location VARCHAR(255),
    summary TEXT,
    issues_found TEXT,
    improvements TEXT,
    attachments TEXT[],
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_safety_hazards_hazard_no ON ehs.safety_hazards(hazard_no);
CREATE INDEX IF NOT EXISTS idx_safety_hazards_level ON ehs.safety_hazards(level);
CREATE INDEX IF NOT EXISTS idx_safety_hazards_status ON ehs.safety_hazards(status);
CREATE INDEX IF NOT EXISTS idx_safety_checks_check_no ON ehs.safety_checks(check_no);
CREATE INDEX IF NOT EXISTS idx_safety_checks_status ON ehs.safety_checks(status);
CREATE INDEX IF NOT EXISTS idx_safety_check_items_check_id ON ehs.safety_check_items(check_id);
CREATE INDEX IF NOT EXISTS idx_emergency_plans_plan_no ON ehs.emergency_plans(plan_no);
CREATE INDEX IF NOT EXISTS idx_emergency_plans_status ON ehs.emergency_plans(status);
CREATE INDEX IF NOT EXISTS idx_drill_records_plan_id ON ehs.drill_records(plan_id);

-- ========================
-- topems-srm 供应商关系管理系统数据库
-- ========================
CREATE SCHEMA IF NOT EXISTS srm;

-- 供应商表
CREATE TABLE IF NOT EXISTS srm.suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_no VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    category VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'active',  -- active, inactive, suspended
    tax_id VARCHAR(100),
    address TEXT,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(500),
    credit_rating VARCHAR(50),
    risk_level VARCHAR(50) DEFAULT 'low',  -- low, medium, high
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 供应商评估表
CREATE TABLE IF NOT EXISTS srm.supplier_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES srm.suppliers(id) ON DELETE CASCADE,
    evaluation_no VARCHAR(100) UNIQUE NOT NULL,
    evaluation_date DATE NOT NULL,
    evaluator VARCHAR(255),
    overall_score NUMERIC(5,2),
    quality_score NUMERIC(5,2),
    delivery_score NUMERIC(5,2),
    service_score NUMERIC(5,2),
    price_score NUMERIC(5,2),
    comments TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'completed',  -- pending, in_progress, completed
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 采购订单表
CREATE TABLE IF NOT EXISTS srm.purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_no VARCHAR(100) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES srm.suppliers(id) ON DELETE CASCADE,
    order_date DATE NOT NULL,
    expected_date DATE,
    actual_date DATE,
    total_amount NUMERIC(15,2),
    currency VARCHAR(10) DEFAULT 'CNY',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',  -- draft, sent, confirmed, partial, complete, cancelled
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 采购订单项表
CREATE TABLE IF NOT EXISTS srm.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_id UUID NOT NULL REFERENCES srm.purchase_orders(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    quantity NUMERIC(15,2) NOT NULL,
    unit_price NUMERIC(15,2) NOT NULL,
    unit VARCHAR(50),
    line_total NUMERIC(15,2) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_suppliers_supplier_no ON srm.suppliers(supplier_no);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON srm.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON srm.suppliers(category);
CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_supplier_id ON srm.supplier_evaluations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_evaluations_evaluation_no ON srm.supplier_evaluations(evaluation_no);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_no ON srm.purchase_orders(po_no);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON srm.purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON srm.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON srm.purchase_order_items(po_id);

-- ========================
-- topems-pdm 生产数据管理系统数据库
-- ========================
CREATE SCHEMA IF NOT EXISTS pdm;

-- 生产工艺表
CREATE TABLE IF NOT EXISTS pdm.production_processes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_no VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    status VARCHAR(50) NOT NULL DEFAULT 'draft',  -- draft, active, inactive
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 生产工序表
CREATE TABLE IF NOT EXISTS pdm.production_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    process_id UUID NOT NULL REFERENCES pdm.production_processes(id) ON DELETE CASCADE,
    step_no VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    duration INTERVAL,
    equipment_required TEXT,
    sort_order INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 生产配方表
CREATE TABLE IF NOT EXISTS pdm.production_formulas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formula_no VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL DEFAULT '1.0',
    process_id UUID REFERENCES pdm.production_processes(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',  -- draft, active, inactive
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 生产配方原料表
CREATE TABLE IF NOT EXISTS pdm.formula_ingredients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formula_id UUID NOT NULL REFERENCES pdm.production_formulas(id) ON DELETE CASCADE,
    material_name VARCHAR(255) NOT NULL,
    quantity NUMERIC(15,4) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    percentage NUMERIC(5,2),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 生产批次表
CREATE TABLE IF NOT EXISTS pdm.production_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_no VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    formula_id UUID REFERENCES pdm.production_formulas(id) ON DELETE SET NULL,
    process_id UUID REFERENCES pdm.production_processes(id) ON DELETE SET NULL,
    planned_quantity NUMERIC(15,2),
    actual_quantity NUMERIC(15,2),
    unit VARCHAR(50),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'planned',  -- planned, in_progress, completed, cancelled
    operator VARCHAR(255),
    remarks TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 生产统计数据表
CREATE TABLE IF NOT EXISTS pdm.production_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID REFERENCES pdm.production_batches(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    output_quantity NUMERIC(15,2),
    reject_quantity NUMERIC(15,2),
    pass_rate NUMERIC(5,2),
    cycle_time INTERVAL,
    energy_consumption NUMERIC(15,2),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(batch_id, stat_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_production_processes_process_no ON pdm.production_processes(process_no);
CREATE INDEX IF NOT EXISTS idx_production_processes_status ON pdm.production_processes(status);
CREATE INDEX IF NOT EXISTS idx_production_steps_process_id ON pdm.production_steps(process_id);
CREATE INDEX IF NOT EXISTS idx_production_formulas_formula_no ON pdm.production_formulas(formula_no);
CREATE INDEX IF NOT EXISTS idx_production_formulas_status ON pdm.production_formulas(status);
CREATE INDEX IF NOT EXISTS idx_formula_ingredients_formula_id ON pdm.formula_ingredients(formula_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_batch_no ON pdm.production_batches(batch_no);
CREATE INDEX IF NOT EXISTS idx_production_batches_status ON pdm.production_batches(status);
CREATE INDEX IF NOT EXISTS idx_production_batches_formula_id ON pdm.production_batches(formula_id);
CREATE INDEX IF NOT EXISTS idx_production_statistics_batch_id ON pdm.production_statistics(batch_id);
CREATE INDEX IF NOT EXISTS idx_production_statistics_stat_date ON pdm.production_statistics(stat_date);

-- ========================
-- topems-integration 系统集成数据库
-- ========================
CREATE SCHEMA IF NOT EXISTS integration;

-- 系统关联表
CREATE TABLE IF NOT EXISTS integration.links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_system VARCHAR(50) NOT NULL,
    source_type VARCHAR(100),
    source_id UUID NOT NULL,
    target_system VARCHAR(50) NOT NULL,
    target_type VARCHAR(100),
    target_id UUID NOT NULL,
    link_type VARCHAR(100),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_links_source_system ON integration.links(source_system);
CREATE INDEX IF NOT EXISTS idx_links_target_system ON integration.links(target_system);
CREATE INDEX IF NOT EXISTS idx_links_source_id ON integration.links(source_id);
CREATE INDEX IF NOT EXISTS idx_links_target_id ON integration.links(target_id);

-- ========================
-- 初始化完成提示
-- ========================
DO $$
BEGIN
    RAISE NOTICE 'TOPEMS 数据库初始化完成！';
    RAISE NOTICE '管理员账户: admin / admin123';
    RAISE NOTICE 'Schemas created: doc, iam, ai, flow, lims, rs, qms, ehs, srm, pdm';
END
$$;

