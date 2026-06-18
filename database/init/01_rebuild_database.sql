-- ================================================================================
-- TOPEMS 数据库重建脚本
-- 版本: v2.0.0
-- 日期: 2026-06-18
-- 说明: 完全对齐产品架构计划，创建 unified_core + plugin_* 架构
-- ================================================================================

-- 警告：此脚本会删除现有数据库并重建，仅用于开发环境！
-- 生产环境请使用迁移脚本

-- ================================================================================
-- 第一部分：清理现有 Schema
-- ================================================================================

-- 删除所有现有 Schema（除了系统 schema）
DROP SCHEMA IF EXISTS public CASCADE;
DROP SCHEMA IF EXISTS shared CASCADE;
DROP SCHEMA IF EXISTS iam CASCADE;
DROP SCHEMA IF EXISTS doc CASCADE;
DROP SCHEMA IF EXISTS flow CASCADE;
DROP SCHEMA IF EXISTS notification CASCADE;
DROP SCHEMA IF EXISTS erp CASCADE;
DROP SCHEMA IF EXISTS hrm CASCADE;
DROP SCHEMA IF EXISTS crm CASCADE;
DROP SCHEMA IF EXISTS mes CASCADE;
DROP SCHEMA IF EXISTS wms CASCADE;
DROP SCHEMA IF EXISTS qms CASCADE;
DROP SCHEMA IF EXISTS lims CASCADE;
DROP SCHEMA IF EXISTS scm CASCADE;
DROP SCHEMA IF EXISTS srm CASCADE;
DROP SCHEMA IF EXISTS rs CASCADE;
DROP SCHEMA IF EXISTS ai CASCADE;
DROP SCHEMA IF EXISTS gis CASCADE;
DROP SCHEMA IF EXISTS im CASCADE;
DROP SCHEMA IF EXISTS bi CASCADE;
DROP SCHEMA IF EXISTS report CASCADE;
DROP SCHEMA IF EXISTS mail CASCADE;
DROP SCHEMA IF EXISTS mobile CASCADE;
DROP SCHEMA IF EXISTS pdm CASCADE;
DROP SCHEMA IF EXISTS integration CASCADE;
DROP SCHEMA IF EXISTS portal CASCADE;
DROP SCHEMA IF EXISTS pm CASCADE;
DROP SCHEMA IF EXISTS ehs CASCADE;

-- ================================================================================
-- 第二部分：创建核心 Schema
-- ================================================================================

-- 创建 public schema（共享实体 + 租户管理）
CREATE SCHEMA public;

-- 创建 unified_core schema（核心平台）
CREATE SCHEMA unified_core;

-- ================================================================================
-- 第三部分：创建插件 Schema
-- ================================================================================

-- 业务插件
CREATE SCHEMA plugin_erp;        -- 企业资源计划
CREATE SCHEMA plugin_hrm;        -- 人力资源管理
CREATE SCHEMA plugin_crm;        -- 客户关系管理
CREATE SCHEMA plugin_pm;         -- 项目管理
CREATE SCHEMA plugin_rs;         -- 研发管理
CREATE SCHEMA plugin_scm;        -- 供应链管理
CREATE SCHEMA plugin_srm;        -- 供应商管理
CREATE SCHEMA plugin_wms;        -- 仓储管理

-- 生产质量插件
CREATE SCHEMA plugin_mes;        -- 制造执行系统
CREATE SCHEMA plugin_qms;        -- 质量管理
CREATE SCHEMA plugin_lims;       -- 实验室管理
CREATE SCHEMA plugin_pdm;        -- 产品数据管理
CREATE SCHEMA plugin_ehs;        -- 安全管理

-- 基础设施插件
CREATE SCHEMA plugin_gis;        -- 地理信息服务
CREATE SCHEMA plugin_ai;         -- AI 服务
CREATE SCHEMA plugin_mobile;     -- 移动服务
CREATE SCHEMA plugin_integration; -- 系统集成
CREATE SCHEMA plugin_portal;     -- 企业门户

-- 分析插件
CREATE SCHEMA plugin_bi;         -- 商业智能
CREATE SCHEMA plugin_report;     -- 报表服务

-- ================================================================================
-- 第四部分：启用扩展
-- ================================================================================

-- UUID 支持
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 向量数据库支持（AI 知识库）
CREATE EXTENSION IF NOT EXISTS vector;

-- ================================================================================
-- 第五部分：创建 public schema 表（共享实体 + 租户管理）
-- ================================================================================

-- -------------------------------------------------------------------------------
-- 5.1 租户管理
-- -------------------------------------------------------------------------------

-- 租户表
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) DEFAULT 'shared',  -- independent | shared
    plan VARCHAR(50) DEFAULT 'basic',   -- basic | professional | enterprise
    status VARCHAR(20) DEFAULT 'active', -- active | suspended | trial
    quota JSONB DEFAULT '{
        "users": 20,
        "storage_gb": 50,
        "api_calls": 10000,
        "plugins": []
    }'::jsonb,
    features JSONB DEFAULT '{}'::jsonb,
    database_config JSONB,  -- 独立数据库模式配置
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.tenants IS '租户配置表';
COMMENT ON COLUMN public.tenants.type IS 'independent: 独立数据库, shared: 共享数据库';
COMMENT ON COLUMN public.tenants.plan IS '套餐类型: basic, professional, enterprise';

-- 租户插件关联表
CREATE TABLE public.tenant_plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    plugin_code VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    config JSONB DEFAULT '{}'::jsonb,
    UNIQUE(tenant_id, plugin_code)
);

COMMENT ON TABLE public.tenant_plugins IS '租户已安装插件表';

-- -------------------------------------------------------------------------------
-- 5.2 共享实体（公司、部门、员工）
-- -------------------------------------------------------------------------------

-- 公司表
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001',
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100),
    code VARCHAR(50) UNIQUE,
    registration_number VARCHAR(100),
    tax_number VARCHAR(100),
    address VARCHAR(500),
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(500),
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.companies IS '公司信息表（共享实体）';

-- 部门表
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    manager_id UUID,  -- 部门负责人（员工ID）
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.departments IS '部门信息表（共享实体）';

-- 员工表
CREATE TABLE public.employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    position_id UUID,
    employee_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    gender VARCHAR(10),
    birth_date DATE,
    hire_date DATE,
    position VARCHAR(100),
    job_title VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    address VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.employees IS '员工信息表（共享实体）';

-- -------------------------------------------------------------------------------
-- 5.3 审计日志（统一）
-- -------------------------------------------------------------------------------

-- 审计日志表
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    user_id UUID,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    status SMALLINT,
    duration_ms BIGINT,
    request_body JSONB,
    response_body JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.audit_logs IS '统一审计日志表';

-- ================================================================================
-- 第六部分：创建 unified_core schema 表（核心平台）
-- ================================================================================

-- -------------------------------------------------------------------------------
-- 6.1 IAM 模块（身份认证与授权）
-- -------------------------------------------------------------------------------

-- 用户表
CREATE TABLE unified_core.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, username),
    UNIQUE(tenant_id, email)
);

COMMENT ON TABLE unified_core.users IS '用户表';

-- 角色表
CREATE TABLE unified_core.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL,
    scope VARCHAR(20) DEFAULT 'platform',  -- platform | tenant | plugin
    is_system BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

COMMENT ON TABLE unified_core.roles IS '角色表';
COMMENT ON COLUMN unified_core.roles.scope IS 'platform: 平台级, tenant: 租户级, plugin: 插件级';

-- 权限表
CREATE TABLE unified_core.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    module VARCHAR(50) NOT NULL,  -- iam, doc, flow, etc.
    resource_type VARCHAR(50),
    action VARCHAR(50) NOT NULL,  -- create, read, update, delete, etc.
    description TEXT,
    attributes JSONB,  -- ABAC 属性约束
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE unified_core.permissions IS '权限定义表';

-- 用户角色关联
CREATE TABLE unified_core.user_roles (
    user_id UUID REFERENCES unified_core.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES unified_core.roles(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    granted_by UUID,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, role_id, tenant_id)
);

COMMENT ON TABLE unified_core.user_roles IS '用户角色关联表';

-- 角色权限关联
CREATE TABLE unified_core.role_permissions (
    role_id UUID REFERENCES unified_core.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES unified_core.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

COMMENT ON TABLE unified_core.role_permissions IS '角色权限关联表';

-- 会话表
CREATE TABLE unified_core.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES unified_core.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE unified_core.sessions IS '会话表';

-- -------------------------------------------------------------------------------
-- 6.2 Doc 模块（文档管理）
-- -------------------------------------------------------------------------------

-- 文档表
CREATE TABLE unified_core.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    content TEXT,
    content_type VARCHAR(100) DEFAULT 'text/plain',
    file_size BIGINT,
    file_path VARCHAR(500),
    version INT DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft',
    created_by UUID NOT NULL,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE unified_core.documents IS '文档表';

-- 文档分类
CREATE TABLE unified_core.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES unified_core.categories(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE unified_core.categories IS '文档分类表';

-- 文档分类关联
CREATE TABLE unified_core.document_categories (
    document_id UUID REFERENCES unified_core.documents(id) ON DELETE CASCADE,
    category_id UUID REFERENCES unified_core.categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (document_id, category_id)
);

COMMENT ON TABLE unified_core.document_categories IS '文档分类关联表';

-- 文档版本历史
CREATE TABLE unified_core.document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    document_id UUID REFERENCES unified_core.documents(id) ON DELETE CASCADE,
    version INT NOT NULL,
    title VARCHAR(500),
    content TEXT,
    content_type VARCHAR(100),
    file_size BIGINT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE unified_core.document_versions IS '文档版本历史表';

-- -------------------------------------------------------------------------------
-- 6.3 Flow 模块（工作流引擎）
-- -------------------------------------------------------------------------------

-- 工作流定义
CREATE TABLE unified_core.workflow_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INT DEFAULT 1,
    definition JSONB NOT NULL,  -- 工作流定义（BPMN 或自定义格式）
    status VARCHAR(20) DEFAULT 'draft',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, code, version)
);

COMMENT ON TABLE unified_core.workflow_definitions IS '工作流定义表';

-- 工作流实例
CREATE TABLE unified_core.workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    definition_id UUID REFERENCES unified_core.workflow_definitions(id),
    business_key VARCHAR(255),
    status VARCHAR(20) DEFAULT 'running',
    variables JSONB DEFAULT '{}'::jsonb,
    started_by UUID NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE unified_core.workflow_instances IS '工作流实例表';

-- 工作流任务
CREATE TABLE unified_core.workflow_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    instance_id UUID REFERENCES unified_core.workflow_instances(id) ON DELETE CASCADE,
    task_key VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    assignee UUID,
    candidate_groups JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    variables JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    claimed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE unified_core.workflow_tasks IS '工作流任务表';

-- -------------------------------------------------------------------------------
-- 6.4 Communication 模块（IM + Mail + Notification）
-- -------------------------------------------------------------------------------

-- 消息表（IM）
CREATE TABLE unified_core.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    metadata JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE unified_core.messages IS '即时消息表';

-- 会话表
CREATE TABLE unified_core.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    conversation_type VARCHAR(20) NOT NULL,  -- private | group | channel
    name VARCHAR(255),
    avatar_url VARCHAR(500),
    owner_id UUID NOT NULL,
    members JSONB DEFAULT '[]'::jsonb,
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE unified_core.conversations IS '会话表';

-- 邮件表
CREATE TABLE unified_core.emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    message_id VARCHAR(255),
    subject VARCHAR(500),
    from_address VARCHAR(255) NOT NULL,
    to_addresses JSONB NOT NULL,
    cc_addresses JSONB,
    bcc_addresses JSONB,
    body_text TEXT,
    body_html TEXT,
    attachments JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(20) DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE unified_core.emails IS '邮件表';

-- 通知表
CREATE TABLE unified_core.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE unified_core.notifications IS '通知表';

-- 通知模板
CREATE TABLE unified_core.notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    title_template VARCHAR(500),
    content_template TEXT,
    notification_type VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

COMMENT ON TABLE unified_core.notification_templates IS '通知模板表';

-- -------------------------------------------------------------------------------
-- 6.5 插件系统表
-- -------------------------------------------------------------------------------

-- 插件注册表
CREATE TABLE unified_core.plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL,
    description TEXT,
    plugin_type VARCHAR(20) NOT NULL,  -- business | industry | ai
    author VARCHAR(255),
    homepage VARCHAR(500),
    repository VARCHAR(500),
    icon_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE unified_core.plugins IS '插件注册表';

-- 插件实例表
CREATE TABLE unified_core.plugin_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id UUID REFERENCES unified_core.plugins(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    runtime_url VARCHAR(255),
    runtime_status VARCHAR(20),  -- running | stopped | error
    base_path VARCHAR(100),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    stopped_at TIMESTAMP WITH TIME ZONE,
    config JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE unified_core.plugin_instances IS '插件实例表';

-- 插件权限表
CREATE TABLE unified_core.plugin_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_code VARCHAR(100) NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    permission_name VARCHAR(255),
    resource_type VARCHAR(50),
    action VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plugin_code, permission_code)
);

COMMENT ON TABLE unified_core.plugin_permissions IS '插件权限表';

-- ================================================================================
-- 第七部分：创建 AI 知识库表（plugin_ai schema）
-- ================================================================================

-- 知识库表
CREATE TABLE plugin_ai.knowledge_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'document',  -- document | qa | vector
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
    status VARCHAR(20) DEFAULT 'active',
    config JSONB DEFAULT '{
        "chunk_size": 1000,
        "chunk_overlap": 200,
        "retrieval_top_k": 5
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_ai.knowledge_bases IS '知识库表';

-- 文档表
CREATE TABLE plugin_ai.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    knowledge_base_id UUID REFERENCES plugin_ai.knowledge_bases(id) ON DELETE CASCADE,
    title VARCHAR(500),
    content TEXT,
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    file_size BIGINT,
    checksum VARCHAR(64),
    status VARCHAR(20) DEFAULT 'pending',  -- pending | processing | completed | failed
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_ai.documents IS '文档表';

-- 文档块表
CREATE TABLE plugin_ai.document_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    document_id UUID REFERENCES plugin_ai.documents(id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    chunk_text TEXT NOT NULL,
    token_count INT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_ai.document_chunks IS '文档块表';

-- 向量嵌入表
CREATE TABLE plugin_ai.document_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES plugin_ai.document_chunks(id) ON DELETE CASCADE,
    embedding vector(1536),  -- OpenAI text-embedding-ada-002 维度
    embedding_model VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_ai.document_embeddings IS '向量嵌入表';

-- 对话历史表
CREATE TABLE plugin_ai.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    knowledge_base_id UUID REFERENCES plugin_ai.knowledge_bases(id),
    title VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_ai.conversations IS '对话历史表';

-- 对话消息表
CREATE TABLE plugin_ai.conversation_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES plugin_ai.conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,  -- user | assistant | system
    content TEXT NOT NULL,
    tokens INT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE plugin_ai.conversation_messages IS '对话消息表';

-- ================================================================================
-- 第八部分：创建索引
-- ================================================================================

-- -------------------------------------------------------------------------------
-- 8.1 public schema 索引
-- -------------------------------------------------------------------------------

CREATE INDEX idx_tenants_code ON public.tenants(code);
CREATE INDEX idx_tenants_status ON public.tenants(status);
CREATE INDEX idx_tenant_plugins_tenant_id ON public.tenant_plugins(tenant_id);
CREATE INDEX idx_tenant_plugins_plugin_code ON public.tenant_plugins(plugin_code);

CREATE INDEX idx_companies_tenant_id ON public.companies(tenant_id);
CREATE INDEX idx_companies_name ON public.companies(name);
CREATE INDEX idx_companies_code ON public.companies(code);

CREATE INDEX idx_departments_tenant_id ON public.departments(tenant_id);
CREATE INDEX idx_departments_company_id ON public.departments(company_id);
CREATE INDEX idx_departments_parent_id ON public.departments(parent_id);

CREATE INDEX idx_employees_tenant_id ON public.employees(tenant_id);
CREATE INDEX idx_employees_company_id ON public.employees(company_id);
CREATE INDEX idx_employees_department_id ON public.employees(department_id);
CREATE INDEX idx_employees_employee_number ON public.employees(employee_number);
CREATE INDEX idx_employees_name ON public.employees(name);

CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- -------------------------------------------------------------------------------
-- 8.2 unified_core schema 索引
-- -------------------------------------------------------------------------------

CREATE INDEX idx_users_tenant_id ON unified_core.users(tenant_id);
CREATE INDEX idx_users_username ON unified_core.users(username);
CREATE INDEX idx_users_email ON unified_core.users(email);

CREATE INDEX idx_roles_tenant_id ON unified_core.roles(tenant_id);
CREATE INDEX idx_roles_code ON unified_core.roles(code);

CREATE INDEX idx_permissions_code ON unified_core.permissions(code);
CREATE INDEX idx_permissions_module ON unified_core.permissions(module);

CREATE INDEX idx_sessions_user_id ON unified_core.sessions(user_id);
CREATE INDEX idx_sessions_token ON unified_core.sessions(token);

CREATE INDEX idx_documents_tenant_id ON unified_core.documents(tenant_id);
CREATE INDEX idx_documents_status ON unified_core.documents(status);

CREATE INDEX idx_workflow_definitions_tenant_id ON unified_core.workflow_definitions(tenant_id);
CREATE INDEX idx_workflow_definitions_code ON unified_core.workflow_definitions(code);

CREATE INDEX idx_workflow_instances_tenant_id ON unified_core.workflow_instances(tenant_id);
CREATE INDEX idx_workflow_instances_status ON unified_core.workflow_instances(status);

CREATE INDEX idx_workflow_tasks_tenant_id ON unified_core.workflow_tasks(tenant_id);
CREATE INDEX idx_workflow_tasks_assignee ON unified_core.workflow_tasks(assignee);
CREATE INDEX idx_workflow_tasks_status ON unified_core.workflow_tasks(status);

CREATE INDEX idx_messages_tenant_id ON unified_core.messages(tenant_id);
CREATE INDEX idx_messages_conversation_id ON unified_core.messages(conversation_id);

CREATE INDEX idx_notifications_tenant_id ON unified_core.notifications(tenant_id);
CREATE INDEX idx_notifications_user_id ON unified_core.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON unified_core.notifications(is_read);

CREATE INDEX idx_plugins_code ON unified_core.plugins(code);
CREATE INDEX idx_plugin_instances_plugin_id ON unified_core.plugin_instances(plugin_id);
CREATE INDEX idx_plugin_permissions_plugin_code ON unified_core.plugin_permissions(plugin_code);

-- -------------------------------------------------------------------------------
-- 8.3 plugin_ai schema 索引
-- -------------------------------------------------------------------------------

CREATE INDEX idx_knowledge_bases_tenant_id ON plugin_ai.knowledge_bases(tenant_id);
CREATE INDEX idx_knowledge_bases_status ON plugin_ai.knowledge_bases(status);

CREATE INDEX idx_documents_tenant_id ON plugin_ai.documents(tenant_id);
CREATE INDEX idx_documents_knowledge_base_id ON plugin_ai.documents(knowledge_base_id);
CREATE INDEX idx_documents_status ON plugin_ai.documents(status);

CREATE INDEX idx_document_chunks_tenant_id ON plugin_ai.document_chunks(tenant_id);
CREATE INDEX idx_document_chunks_document_id ON plugin_ai.document_chunks(document_id);

CREATE INDEX idx_document_embeddings_tenant_id ON plugin_ai.document_embeddings(tenant_id);
CREATE INDEX idx_document_embeddings_chunk_id ON plugin_ai.document_embeddings(chunk_id);

-- 向量索引（使用 HNSW 算法，性能更好）
CREATE INDEX idx_document_embeddings_vector ON plugin_ai.document_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_conversations_tenant_id ON plugin_ai.conversations(tenant_id);
CREATE INDEX idx_conversation_messages_conversation_id ON plugin_ai.conversation_messages(conversation_id);

-- ================================================================================
-- 第九部分：创建多租户上下文函数
-- ================================================================================

-- 设置租户上下文
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant', p_tenant_id::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_tenant_context(UUID) IS '设置当前请求的租户上下文';

-- 获取当前租户ID
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant', TRUE), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_current_tenant_id() IS '获取当前租户ID';

-- 行级安全策略示例（可选）
-- ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation_policy ON public.companies
--     USING (tenant_id = get_current_tenant_id());

-- ================================================================================
-- 第十部分：插入初始数据
-- ================================================================================

-- 插入默认租户
INSERT INTO public.tenants (id, name, code, type, plan, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Default Tenant',
    'default',
    'shared',
    'enterprise',
    'active'
);

-- 插入默认公司
INSERT INTO public.companies (id, tenant_id, name, code, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Default Company',
    'DEFAULT',
    'active'
);

-- 插入默认部门
INSERT INTO public.departments (id, tenant_id, company_id, name, code, status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Default Department',
    'DEFAULT',
    'active'
);

-- 插入默认权限
INSERT INTO unified_core.permissions (code, name, module, resource_type, action, description) VALUES
-- IAM 权限
('iam:user:create', '创建用户', 'iam', 'user', 'create', '创建新用户'),
('iam:user:read', '查看用户', 'iam', 'user', 'read', '查看用户信息'),
('iam:user:update', '更新用户', 'iam', 'user', 'update', '更新用户信息'),
('iam:user:delete', '删除用户', 'iam', 'user', 'delete', '删除用户'),
('iam:role:create', '创建角色', 'iam', 'role', 'create', '创建新角色'),
('iam:role:read', '查看角色', 'iam', 'role', 'read', '查看角色信息'),
('iam:role:update', '更新角色', 'iam', 'role', 'update', '更新角色信息'),
('iam:role:delete', '删除角色', 'iam', 'role', 'delete', '删除角色'),
-- Doc 权限
('doc:document:create', '创建文档', 'doc', 'document', 'create', '创建新文档'),
('doc:document:read', '查看文档', 'doc', 'document', 'read', '查看文档内容'),
('doc:document:update', '更新文档', 'doc', 'document', 'update', '更新文档内容'),
('doc:document:delete', '删除文档', 'doc', 'document', 'delete', '删除文档'),
-- Flow 权限
('flow:workflow:create', '创建工作流', 'flow', 'workflow', 'create', '创建新工作流'),
('flow:workflow:read', '查看工作流', 'flow', 'workflow', 'read', '查看工作流定义'),
('flow:workflow:update', '更新工作流', 'flow', 'workflow', 'update', '更新工作流定义'),
('flow:workflow:delete', '删除工作流', 'flow', 'workflow', 'delete', '删除工作流'),
('flow:task:claim', '认领任务', 'flow', 'task', 'claim', '认领待办任务'),
('flow:task:complete', '完成任务', 'flow', 'task', 'complete', '完成待办任务');

-- 插入默认角色
INSERT INTO unified_core.roles (id, tenant_id, name, code, scope, is_system, description) VALUES
('00000000-0000-0000-0000-000000000001', NULL, '超级管理员', 'super_admin', 'platform', TRUE, '平台超级管理员，拥有所有权限'),
('00000000-0000-0000-0000-000000000002', NULL, '平台管理员', 'platform_admin', 'platform', TRUE, '平台管理员，管理所有租户'),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '租户管理员', 'tenant_admin', 'tenant', TRUE, '租户管理员，管理租户内所有资源'),
('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '普通用户', 'user', 'tenant', TRUE, '普通用户，拥有基本权限');

-- 插入默认管理员用户
INSERT INTO unified_core.users (id, tenant_id, username, email, password_hash, full_name, is_active, is_verified)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'admin',
    'admin@topems.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.VTtYqVqxqZ',  -- 密码: admin123
    'System Administrator',
    TRUE,
    TRUE
);

-- 关联用户角色
INSERT INTO unified_core.user_roles (user_id, role_id, tenant_id)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001'
);

-- ================================================================================
-- 完成
-- ================================================================================

-- 打印完成信息
DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'TOPEMS 数据库重建完成！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '核心 Schema:';
    RAISE NOTICE '  - public (共享实体 + 租户管理)';
    RAISE NOTICE '  - unified_core (核心平台)';
    RAISE NOTICE '';
    RAISE NOTICE '插件 Schema:';
    RAISE NOTICE '  - plugin_erp, plugin_hrm, plugin_crm, ...';
    RAISE NOTICE '  - plugin_ai (AI 知识库，已启用 pgvector)';
    RAISE NOTICE '';
    RAISE NOTICE '默认账户:';
    RAISE NOTICE '  - 用户名: admin';
    RAISE NOTICE '  - 密码: admin123';
    RAISE NOTICE '  - 租户: default';
    RAISE NOTICE '========================================';
END $$;
