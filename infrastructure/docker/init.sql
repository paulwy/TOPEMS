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
    task_name VARCHAR(200) NOT NULL,
    assignee_id UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- pending, approved, rejected, delegated
    comment TEXT,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_workflows_is_active ON flow.workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_status ON flow.workflow_instances(status);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_initiator_id ON flow.workflow_instances(initiator_id);
CREATE INDEX IF NOT EXISTS idx_approvals_assignee_id ON flow.approvals(assignee_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON flow.approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_workflow_instance_id ON flow.approvals(workflow_instance_id);

-- 插入一些默认工作流
INSERT INTO flow.workflows (name, description, definition, is_active, created_at)
VALUES 
    ('文件上传审批', '文件上传到特定目录需要审批', '{"steps": []}'::jsonb, TRUE, NOW()),
    ('请假流程', '员工请假审批流程', '{"steps": []}'::jsonb, TRUE, NOW())
ON CONFLICT DO NOTHING;

-- ========================
-- 初始化完成提示
-- ========================
DO $$
BEGIN
    RAISE NOTICE 'TOPEMS 数据库初始化完成！';
    RAISE NOTICE '管理员账户: admin / admin123';
    RAISE NOTICE 'Schemas created: doc, iam, ai, flow';
END
$$;

