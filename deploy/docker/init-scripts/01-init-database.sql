-- TOPEMS 数据库初始化脚本
-- 该脚本在 PostgreSQL 容器首次启动时自动执行

-- 创建 IAM schema
CREATE SCHEMA IF NOT EXISTS iam;

-- 创建 DOC schema
CREATE SCHEMA IF NOT EXISTS doc;

-- 创建 AI schema
CREATE SCHEMA IF NOT EXISTS ai;

-- 创建 FLOW schema
CREATE SCHEMA IF NOT EXISTS flow;

-- 创建 RS schema
CREATE SCHEMA IF NOT EXISTS rs;

-- 创建 LIMS schema
CREATE SCHEMA IF NOT EXISTS lims;

-- 创建 QMS schema
CREATE SCHEMA IF NOT EXISTS qms;

-- 创建 EHS schema
CREATE SCHEMA IF NOT EXISTS ehs;

-- 创建 SRM schema
CREATE SCHEMA IF NOT EXISTS srm;

-- 创建 PDM schema
CREATE SCHEMA IF NOT EXISTS pdm;

-- 授予权限
GRANT ALL ON SCHEMA iam TO topems;
GRANT ALL ON SCHEMA doc TO topems;
GRANT ALL ON SCHEMA ai TO topems;
GRANT ALL ON SCHEMA flow TO topems;
GRANT ALL ON SCHEMA rs TO topems;
GRANT ALL ON SCHEMA lims TO topems;
GRANT ALL ON SCHEMA qms TO topems;
GRANT ALL ON SCHEMA ehs TO topems;
GRANT ALL ON SCHEMA srm TO topems;
GRANT ALL ON SCHEMA pdm TO topems;

-- IAM 用户表
CREATE TABLE IF NOT EXISTS iam.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url VARCHAR(512),
    department VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- IAM 权限表
CREATE TABLE IF NOT EXISTS iam.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(255) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- IAM 角色表
CREATE TABLE IF NOT EXISTS iam.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- IAM 用户角色关联表
CREATE TABLE IF NOT EXISTS iam.user_roles (
    user_id UUID REFERENCES iam.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES iam.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- IAM 角色权限关联表
CREATE TABLE IF NOT EXISTS iam.role_permissions (
    role_id UUID REFERENCES iam.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES iam.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- IAM 用户权限关联表 (可选，用于直接给用户分配权限)
CREATE TABLE IF NOT EXISTS iam.user_permissions (
    user_id UUID REFERENCES iam.users(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES iam.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, permission_id)
);

-- DOC 文档表
CREATE TABLE IF NOT EXISTS doc.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    file_path VARCHAR(1000),
    file_size BIGINT,
    mime_type VARCHAR(255),
    uploader_id UUID REFERENCES iam.users(id),
    status VARCHAR(50) DEFAULT 'active',
    version INTEGER DEFAULT 1,
    parent_id UUID REFERENCES doc.documents(id),
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- AI RAG 文档表 (暂时注释，需要 pgvector 扩展)
-- CREATE TABLE IF NOT EXISTS ai.rag_documents (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     document_id UUID REFERENCES doc.documents(id) ON DELETE CASCADE,
--     content TEXT,
--     chunk_index INTEGER,
--     embedding VECTOR(1536),
--     metadata JSONB,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
-- );

-- FLOW 工作流定义表
CREATE TABLE IF NOT EXISTS flow.workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FLOW 工作流定义表 (兼容旧版)
CREATE TABLE IF NOT EXISTS flow.workflow_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition JSONB NOT NULL,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES iam.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- FLOW 工作流实例表
CREATE TABLE IF NOT EXISTS flow.workflow_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES flow.workflows(id),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    current_node VARCHAR(255),
    initiator_id UUID,
    data JSONB,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FLOW 工作流实例表 (兼容旧版)
CREATE TABLE IF NOT EXISTS flow.workflow_instances_old (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES flow.workflow_definitions(id),
    status VARCHAR(50) DEFAULT 'pending',
    current_step INTEGER DEFAULT 0,
    context JSONB,
    initiator_id UUID REFERENCES iam.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- FLOW 审批表
CREATE TABLE IF NOT EXISTS flow.approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID REFERENCES flow.workflow_instances(id),
    node_id VARCHAR(255),
    task_name VARCHAR(255) NOT NULL,
    assignee_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    approval_type VARCHAR(50),
    comment TEXT,
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    timeout_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FLOW 审批记录表
CREATE TABLE IF NOT EXISTS flow.approval_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID REFERENCES flow.approvals(id) NOT NULL,
    action VARCHAR(50) NOT NULL,
    actor_id UUID NOT NULL,
    actor_name VARCHAR(255),
    comment TEXT,
    previous_status VARCHAR(50),
    new_status VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FLOW 通知表
CREATE TABLE IF NOT EXISTS flow.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    workflow_instance_id UUID REFERENCES flow.workflow_instances(id) ON DELETE CASCADE,
    approval_id UUID REFERENCES flow.approvals(id) ON DELETE CASCADE,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RS 研究项目表
CREATE TABLE IF NOT EXISTS rs.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    owner_id UUID REFERENCES iam.users(id),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RS 实验表
CREATE TABLE IF NOT EXISTS rs.experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES rs.projects(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planned',
    experiment_date DATE,
    researcher_id UUID REFERENCES iam.users(id),
    results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RS 配方表
CREATE TABLE IF NOT EXISTS rs.formulas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES rs.projects(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    ingredients JSONB,
    process_steps JSONB,
    created_by UUID REFERENCES iam.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LIMS 样品表
CREATE TABLE IF NOT EXISTS lims.samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_code VARCHAR(100) UNIQUE NOT NULL,
    sample_name VARCHAR(500) NOT NULL,
    sample_type VARCHAR(100),
    collection_date TIMESTAMP WITH TIME ZONE,
    collected_by UUID REFERENCES iam.users(id),
    status VARCHAR(50) DEFAULT 'collected',
    storage_location VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- LIMS 测试结果表
CREATE TABLE IF NOT EXISTS lims.test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_id UUID REFERENCES lims.samples(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    test_value DECIMAL(15, 4),
    test_unit VARCHAR(50),
    test_date TIMESTAMP WITH TIME ZONE,
    tester_id UUID REFERENCES iam.users(id),
    is_passed BOOLEAN,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- QMS 质量标准表
CREATE TABLE IF NOT EXISTS qms.standards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_code VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    version INTEGER DEFAULT 1,
    effective_date DATE,
    created_by UUID REFERENCES iam.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- QMS 质量检查表
CREATE TABLE IF NOT EXISTS qms.quality_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_id UUID REFERENCES qms.standards(id),
    check_date TIMESTAMP WITH TIME ZONE,
    inspector_id UUID REFERENCES iam.users(id),
    result VARCHAR(50),
    findings TEXT,
    corrective_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- EHS 安全检查表
CREATE TABLE IF NOT EXISTS ehs.safety_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_type VARCHAR(100) NOT NULL,
    check_date TIMESTAMP WITH TIME ZONE,
    inspector_id UUID REFERENCES iam.users(id),
    location VARCHAR(255),
    findings TEXT,
    risk_level VARCHAR(50),
    corrective_action TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- EHS 事件报告表
CREATE TABLE IF NOT EXISTS ehs.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_type VARCHAR(100) NOT NULL,
    incident_date TIMESTAMP WITH TIME ZONE,
    reporter_id UUID REFERENCES iam.users(id),
    location VARCHAR(255),
    description TEXT,
    severity VARCHAR(50),
    status VARCHAR(50) DEFAULT 'reported',
    investigation_report TEXT,
    corrective_action TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SRM 供应商表
CREATE TABLE IF NOT EXISTS srm.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_code VARCHAR(100) UNIQUE NOT NULL,
    supplier_name VARCHAR(500) NOT NULL,
    contact_person VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    rating DECIMAL(3, 2),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SRM 采购订单表
CREATE TABLE IF NOT EXISTS srm.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES srm.suppliers(id),
    order_date TIMESTAMP WITH TIME ZONE,
    expected_delivery DATE,
    total_amount DECIMAL(15, 2),
    status VARCHAR(50) DEFAULT 'pending',
    created_by UUID REFERENCES iam.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PDM 产品表
CREATE TABLE IF NOT EXISTS pdm.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(100) UNIQUE NOT NULL,
    product_name VARCHAR(500) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft',
    specifications JSONB,
    created_by UUID REFERENCES iam.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- PDM BOM 表
CREATE TABLE IF NOT EXISTS pdm.bill_of_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES pdm.products(id) ON DELETE CASCADE,
    version INTEGER DEFAULT 1,
    components JSONB,
    created_by UUID REFERENCES iam.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_email ON iam.users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON iam.users(username);
CREATE INDEX IF NOT EXISTS idx_documents_uploader ON doc.documents(uploader_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON doc.documents(status);
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
CREATE INDEX IF NOT EXISTS idx_projects_status ON rs.projects(status);
CREATE INDEX IF NOT EXISTS idx_experiments_project ON rs.experiments(project_id);
CREATE INDEX IF NOT EXISTS idx_samples_status ON lims.samples(status);
CREATE INDEX IF NOT EXISTS idx_standards_code ON qms.standards(standard_code);
CREATE INDEX IF NOT EXISTS idx_safety_checks_status ON ehs.safety_checks(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON srm.suppliers(status);
CREATE INDEX IF NOT EXISTS idx_products_status ON pdm.products(status);

-- 插入默认用户 (密码: admin123 / user123 / guest123)
INSERT INTO iam.users (username, email, password_hash, full_name, is_active, is_superuser)
VALUES 
    ('admin', 'admin@topems.com', '$2b$12$Ry4ea5/egocev6U7KeGapeEOHmCv/Cl6mC7eHd.lNEQ.abx8GIT3G', '系统管理员', true, true),
    ('user', 'user@topems.com', '$2b$12$kSBjAMjap2jscbVFtZ9e0.N/x.Wf996UoBPILxcf1S4EG7AEm483S', '普通员工', true, false),
    ('guest', 'guest@topems.com', '$2b$12$P0LcNc772htl8KIV46UPBOTAxD0TqOJiuKcAMphiuESydxS3yC86O', '访客用户', true, false)
ON CONFLICT (username) DO NOTHING;

-- 插入默认角色 (使用固定ID确保一致性)
INSERT INTO iam.roles (id, name, description, created_at)
VALUES
    ('00000000-0000-0000-0000-000000000001', '管理员', '系统管理员，拥有所有权限', CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000002', '部门经理', '部门经理，拥有本部门所有权限', CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000003', '普通员工', '普通员工，拥有基础操作权限', CURRENT_TIMESTAMP),
    ('00000000-0000-0000-0000-000000000004', '访客', '访客，只读权限', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- 插入默认权限 (使用固定ID确保一致性)
INSERT INTO iam.permissions (id, name, resource, action, description)
VALUES
    -- RS (Research System) 模块权限
    ('00000001-0000-0000-0000-000000000001', 'rs:read', 'rs', 'read', '读取科研研发数据'),
    ('00000001-0000-0000-0000-000000000002', 'rs:write', 'rs', 'write', '创建和编辑科研研发数据'),
    ('00000001-0000-0000-0000-000000000003', 'rs:delete', 'rs', 'delete', '删除科研研发数据'),
    ('00000001-0000-0000-0000-000000000004', 'rs:admin', 'rs', 'admin', '科研研发管理权限'),
    
    -- LIMS (Laboratory Information Management System) 模块权限
    ('00000002-0000-0000-0000-000000000001', 'lims:read', 'lims', 'read', '读取实验室数据'),
    ('00000002-0000-0000-0000-000000000002', 'lims:write', 'lims', 'write', '创建和编辑实验室数据'),
    ('00000002-0000-0000-0000-000000000003', 'lims:delete', 'lims', 'delete', '删除实验室数据'),
    ('00000002-0000-0000-0000-000000000004', 'lims:admin', 'lims', 'admin', '实验室管理权限'),
    
    -- QMS (Quality Management System) 模块权限
    ('00000003-0000-0000-0000-000000000001', 'qms:read', 'qms', 'read', '读取质量管理数据'),
    ('00000003-0000-0000-0000-000000000002', 'qms:write', 'qms', 'write', '创建和编辑质量管理数据'),
    ('00000003-0000-0000-0000-000000000003', 'qms:delete', 'qms', 'delete', '删除质量管理数据'),
    ('00000003-0000-0000-0000-000000000004', 'qms:admin', 'qms', 'admin', '质量管理权限'),
    
    -- EHS (Environment, Health, Safety) 模块权限
    ('00000004-0000-0000-0000-000000000001', 'ehs:read', 'ehs', 'read', '读取环境健康安全数据'),
    ('00000004-0000-0000-0000-000000000002', 'ehs:write', 'ehs', 'write', '创建和编辑环境健康安全数据'),
    ('00000004-0000-0000-0000-000000000003', 'ehs:delete', 'ehs', 'delete', '删除环境健康安全数据'),
    ('00000004-0000-0000-0000-000000000004', 'ehs:admin', 'ehs', 'admin', '环境健康安全管理权限'),
    
    -- SRM (Supplier Relationship Management) 模块权限
    ('00000005-0000-0000-0000-000000000001', 'srm:read', 'srm', 'read', '读取供应商关系数据'),
    ('00000005-0000-0000-0000-000000000002', 'srm:write', 'srm', 'write', '创建和编辑供应商关系数据'),
    ('00000005-0000-0000-0000-000000000003', 'srm:delete', 'srm', 'delete', '删除供应商关系数据'),
    ('00000005-0000-0000-0000-000000000004', 'srm:admin', 'srm', 'admin', '供应商关系管理权限'),
    
    -- PDM (Product Data Management) 模块权限
    ('00000006-0000-0000-0000-000000000001', 'pdm:read', 'pdm', 'read', '读取生产数据管理数据'),
    ('00000006-0000-0000-0000-000000000002', 'pdm:write', 'pdm', 'write', '创建和编辑生产数据管理数据'),
    ('00000006-0000-0000-0000-000000000003', 'pdm:delete', 'pdm', 'delete', '删除生产数据管理数据'),
    ('00000006-0000-0000-0000-000000000004', 'pdm:admin', 'pdm', 'admin', '生产数据管理权限'),
    
    -- Workflow 模块权限
    ('00000007-0000-0000-0000-000000000001', 'workflow:read', 'workflow', 'read', '读取工作流数据'),
    ('00000007-0000-0000-0000-000000000002', 'workflow:write', 'workflow', 'write', '创建和编辑工作流'),
    ('00000007-0000-0000-0000-000000000003', 'workflow:approve', 'workflow', 'approve', '审批工作流'),
    ('00000007-0000-0000-0000-000000000004', 'workflow:reject', 'workflow', 'reject', '拒绝工作流'),
    ('00000007-0000-0000-0000-000000000005', 'workflow:admin', 'workflow', 'admin', '工作流管理权限'),
    
    -- Document 模块权限
    ('00000008-0000-0000-0000-000000000001', 'doc:read', 'doc', 'read', '读取文档'),
    ('00000008-0000-0000-0000-000000000002', 'doc:write', 'doc', 'write', '上传和编辑文档'),
    ('00000008-0000-0000-0000-000000000003', 'doc:delete', 'doc', 'delete', '删除文档'),
    ('00000008-0000-0000-0000-000000000004', 'doc:admin', 'doc', 'admin', '文档管理权限'),
    
    -- AI 模块权限
    ('00000009-0000-0000-0000-000000000001', 'ai:read', 'ai', 'read', '读取AI知识库'),
    ('00000009-0000-0000-0000-000000000002', 'ai:write', 'ai', 'write', '添加和编辑AI知识'),
    ('00000009-0000-0000-0000-000000000003', 'ai:delete', 'ai', 'delete', '删除AI知识'),
    ('00000009-0000-0000-0000-000000000004', 'ai:admin', 'ai', 'admin', 'AI知识库管理权限'),
    
    -- User Management 权限
    ('00000000-0000-0000-0000-000000000010', 'user:read', 'user', 'read', '读取用户信息'),
    ('00000000-0000-0000-0000-000000000011', 'user:write', 'user', 'write', '创建和编辑用户'),
    ('00000000-0000-0000-0000-000000000012', 'user:delete', 'user', 'delete', '删除用户'),
    ('00000000-0000-0000-0000-000000000013', 'user:admin', 'user', 'admin', '用户管理权限'),
    
    -- Role Management 权限
    ('00000000-0000-0000-0000-000000000014', 'role:read', 'role', 'read', '读取角色信息'),
    ('00000000-0000-0000-0000-000000000015', 'role:write', 'role', 'write', '创建和编辑角色'),
    ('00000000-0000-0000-0000-000000000016', 'role:delete', 'role', 'delete', '删除角色'),
    ('00000000-0000-0000-0000-000000000017', 'role:admin', 'role', 'admin', '角色管理权限'),
    
    -- System 权限
    ('00000000-0000-0000-0000-000000000020', 'system:read', 'system', 'read', '读取系统配置'),
    ('00000000-0000-0000-0000-000000000021', 'system:write', 'system', 'write', '修改系统配置'),
    ('00000000-0000-0000-0000-000000000022', 'system:admin', 'system', 'admin', '系统管理权限')
ON CONFLICT (id) DO NOTHING;

-- 分配权限给角色
-- 管理员拥有所有权限
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000001', id
FROM iam.permissions
ON CONFLICT DO NOTHING;

-- 部门经理拥有读、写、管理权限和审批权限
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000002', id
FROM iam.permissions
WHERE action IN ('read', 'write', 'admin')
   OR action IN ('approve', 'reject')
ON CONFLICT DO NOTHING;

-- 普通员工拥有读写权限
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000003', id
FROM iam.permissions
WHERE action IN ('read', 'write')
ON CONFLICT DO NOTHING;

-- 访客只有读权限
INSERT INTO iam.role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0000-000000000004', id
FROM iam.permissions
WHERE action = 'read'
ON CONFLICT DO NOTHING;

-- 给用户分配角色
-- admin -> 管理员
INSERT INTO iam.user_roles (user_id, role_id, created_at)
SELECT id, '00000000-0000-0000-0000-000000000001', CURRENT_TIMESTAMP
FROM iam.users
WHERE username = 'admin'
ON CONFLICT DO NOTHING;

-- user -> 普通员工
INSERT INTO iam.user_roles (user_id, role_id, created_at)
SELECT id, '00000000-0000-0000-0000-000000000003', CURRENT_TIMESTAMP
FROM iam.users
WHERE username = 'user'
ON CONFLICT DO NOTHING;

-- guest -> 访客
INSERT INTO iam.user_roles (user_id, role_id, created_at)
SELECT id, '00000000-0000-0000-0000-000000000004', CURRENT_TIMESTAMP
FROM iam.users
WHERE username = 'guest'
ON CONFLICT DO NOTHING;

-- 创建更新时间的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为所有表添加更新触发器
CREATE TRIGGER update_iam_users_updated_at BEFORE UPDATE ON iam.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON doc.documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON flow.workflows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_definitions_updated_at BEFORE UPDATE ON flow.workflow_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_instances_updated_at BEFORE UPDATE ON flow.workflow_instances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON rs.projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON rs.experiments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_formulas_updated_at BEFORE UPDATE ON rs.formulas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_samples_updated_at BEFORE UPDATE ON lims.samples
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_standards_updated_at BEFORE UPDATE ON qms.standards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_safety_checks_updated_at BEFORE UPDATE ON ehs.safety_checks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON ehs.incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON srm.suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON srm.purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON pdm.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bill_of_materials_updated_at BEFORE UPDATE ON pdm.bill_of_materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 授予权限
-- First grant schema privileges
GRANT ALL ON SCHEMA iam TO topems;
GRANT ALL ON SCHEMA doc TO topems;
GRANT ALL ON SCHEMA ai TO topems;
GRANT ALL ON SCHEMA flow TO topems;
GRANT ALL ON SCHEMA rs TO topems;
GRANT ALL ON SCHEMA lims TO topems;
GRANT ALL ON SCHEMA qms TO topems;
GRANT ALL ON SCHEMA ehs TO topems;
GRANT ALL ON SCHEMA srm TO topems;
GRANT ALL ON SCHEMA pdm TO topems;

-- Then grant table privileges
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA iam TO topems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA doc TO topems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ai TO topems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA flow TO topems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA rs TO topems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA lims TO topems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA qms TO topems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ehs TO topems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA srm TO topems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA pdm TO topems;

-- Then grant sequence privileges
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA iam TO topems;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA doc TO topems;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ai TO topems;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA flow TO topems;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA rs TO topems;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA lims TO topems;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA qms TO topems;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ehs TO topems;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA srm TO topems;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA pdm TO topems;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA iam GRANT ALL PRIVILEGES ON TABLES TO topems;
ALTER DEFAULT PRIVILEGES IN SCHEMA iam GRANT ALL PRIVILEGES ON SEQUENCES TO topems;
ALTER DEFAULT PRIVILEGES IN SCHEMA doc GRANT ALL PRIVILEGES ON TABLES TO topems;
ALTER DEFAULT PRIVILEGES IN SCHEMA doc GRANT ALL PRIVILEGES ON SEQUENCES TO topems;
