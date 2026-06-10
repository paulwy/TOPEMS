# TOPEMS 数据库设计

## 概述

TOPEMS 使用 PostgreSQL 作为主数据库，支持 pgvector 扩展进行向量搜索。

## 数据库架构

```
topems
├── iam          # 身份认证与权限管理
├── mail         # 邮件服务
├── storage      # 统一文件服务
└── shared       # 共享业务数据
└── public       # 系统配置
```

## Schema 设计

### 1. IAM Schema（身份认证）

#### users 表
```sql
CREATE TABLE iam.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    full_name VARCHAR(255),
    is_superuser BOOLEAN DEFAULT false,
    last_login TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    roles TEXT[] DEFAULT '{}',
    permissions TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);
```

#### audit_logs 表
```sql
CREATE TABLE iam.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255),
    resource_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### refresh_tokens 表
```sql
CREATE TABLE iam.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);
```

#### sessions 表
```sql
CREATE TABLE iam.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    last_active TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Mail Schema（邮件服务）

#### templates 表
```sql
CREATE TABLE mail.templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    body_html_template TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    tags JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### emails 表
```sql
CREATE TABLE mail.emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject VARCHAR(500) NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    to_addresses JSONB NOT NULL,
    cc_addresses JSONB,
    bcc_addresses JSONB,
    body TEXT NOT NULL,
    body_html TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    template_id UUID REFERENCES mail.templates(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### attachments 表
```sql
CREATE TABLE mail.attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_id UUID REFERENCES mail.emails(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size BIGINT NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. Shared Schema（共享业务数据）

#### employees 表
```sql
CREATE TABLE shared.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    company_id UUID,
    department_id UUID,
    position_id UUID,
    employee_number VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(20),
    birth_date DATE,
    hire_date DATE,
    position VARCHAR(100),
    job_title VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(50),
    address TEXT,
    status VARCHAR(50) DEFAULT 'active',
    skills TEXT[],
    embedding_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### departments 表
```sql
CREATE TABLE shared.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    company_id UUID,
    parent_id UUID,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    manager_id UUID,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### positions 表
```sql
CREATE TABLE shared.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    level INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### organizations 表
```sql
CREATE TABLE shared.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    logo_url TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### companies 表
```sql
CREATE TABLE shared.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    registration_number VARCHAR(100),
    legal_representative VARCHAR(100),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 索引设计

### IAM 索引
```sql
CREATE INDEX idx_users_username ON iam.users(username);
CREATE INDEX idx_users_email ON iam.users(email);
CREATE INDEX idx_audit_logs_user_id ON iam.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON iam.audit_logs(created_at);
CREATE INDEX idx_refresh_tokens_user_id ON iam.refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON iam.refresh_tokens(expires_at);
CREATE INDEX idx_sessions_user_id ON iam.sessions(user_id);
```

### Mail 索引
```sql
CREATE INDEX idx_mail_templates_code ON mail.templates(code);
CREATE INDEX idx_mail_templates_category ON mail.templates(category);
CREATE INDEX idx_mail_templates_status ON mail.templates(status);
CREATE INDEX idx_mail_emails_status ON mail.emails(status);
CREATE INDEX idx_mail_emails_priority ON mail.emails(priority);
CREATE INDEX idx_mail_emails_created_at ON mail.emails(created_at DESC);
CREATE INDEX idx_mail_attachments_email_id ON mail.attachments(email_id);
CREATE INDEX idx_mail_attachments_filename ON mail.attachments(filename);
CREATE INDEX idx_mail_attachments_created_at ON mail.attachments(created_at DESC);
CREATE INDEX idx_mail_attachments_created_by ON mail.attachments(created_by);
```

### Storage Schema（统一文件服务）

Storage Schema 是 TOPEMS 统一文件服务的核心，支持本地存储和未来扩展 S3/MinIO。

#### files 表
```sql
CREATE TABLE storage.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,              -- 上传用户 ID
    owner_department_id UUID,            -- 所属部门 ID

    filename VARCHAR(500) NOT NULL,      -- 原始文件名
    storage_path VARCHAR(1000) NOT NULL, -- 存储路径
    file_size BIGINT NOT NULL,          -- 文件大小（字节）
    content_type VARCHAR(100) NOT NULL,  -- MIME 类型

    -- 文件分类
    file_type VARCHAR(50) NOT NULL DEFAULT 'document',  -- 'document', 'attachment', 'image', 'video', 'archive'
    category VARCHAR(100),               -- 业务分类

    -- 版本控制
    version INT DEFAULT 1,
    parent_id UUID REFERENCES storage.files(id) ON DELETE SET NULL, -- 上一版本

    -- 向量化状态
    vector_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    vector_document_id UUID,             -- 关联 AI 文档 ID

    -- 共享属性
    is_shared BOOLEAN DEFAULT FALSE,
    visibility VARCHAR(20) DEFAULT 'private', -- 'private', 'department', 'public'

    -- 状态
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'deleted', 'archived'

    -- 审计字段
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

#### file_permissions 表
```sql
CREATE TABLE storage.file_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES storage.files(id) ON DELETE CASCADE,
    principal_type VARCHAR(20) NOT NULL, -- 'user', 'department', 'role'
    principal_id UUID NOT NULL,           -- user_id / department_id / role_id
    permission VARCHAR(50) NOT NULL,    -- 'read', 'write', 'delete', 'share', 'admin'
    granted_by UUID,                      -- 授权人
    expires_at TIMESTAMPTZ,              -- 过期时间，可选
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- 唯一约束：防止重复授权
    UNIQUE(file_id, principal_type, principal_id, permission)
);
```

#### backends 表
```sql
CREATE TABLE storage.backends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,   -- 'local', 's3', 'minio'
    backend_type VARCHAR(50) NOT NULL,   -- 'local', 's3', 'minio'
    is_active BOOLEAN DEFAULT FALSE,
    config JSONB,                        -- 存储配置 (endpoint, bucket, region, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Storage 索引
```sql
CREATE INDEX idx_storage_files_owner ON storage.files(owner_id);
CREATE INDEX idx_storage_files_department ON storage.files(owner_department_id);
CREATE INDEX idx_storage_files_type ON storage.files(file_type);
CREATE INDEX idx_storage_files_status ON storage.files(status);
CREATE INDEX idx_storage_files_vector ON storage.files(vector_status);
CREATE INDEX idx_storage_files_visibility ON storage.files(visibility);
CREATE INDEX idx_storage_files_category ON storage.files(category);
CREATE INDEX idx_storage_files_created_at ON storage.files(created_at DESC);

CREATE INDEX idx_file_perms_file ON storage.file_permissions(file_id);
CREATE INDEX idx_file_perms_principal ON storage.file_permissions(principal_type, principal_id);
CREATE INDEX idx_file_perms_expires ON storage.file_permissions(expires_at);
```

### Shared 索引
```sql
-- employees
CREATE INDEX idx_employees_company ON shared.employees(company_id);
CREATE INDEX idx_employees_department ON shared.employees(department_id);
CREATE INDEX idx_employees_status ON shared.employees(status);
CREATE INDEX idx_employees_name ON shared.employees(name);

-- departments
CREATE INDEX idx_departments_company ON shared.departments(company_id);
CREATE INDEX idx_departments_parent ON shared.departments(parent_id);

-- positions
CREATE INDEX idx_positions_department ON shared.positions(department_id);
```

## pgvector 配置（可选）

如果使用 pgvector 进行向量搜索：

```sql
-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 创建向量列
ALTER TABLE shared.employees ADD COLUMN embedding vector(3584);

-- 创建向量索引
CREATE INDEX idx_employees_embedding ON shared.employees
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## 环境配置

### 本地 PostgreSQL（推荐）
```bash
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
```

### Docker PostgreSQL
```bash
DATABASE_URL=postgres://topems:topems@host.docker.internal:5432/topems
```

### 远程 PostgreSQL
```bash
DATABASE_URL=postgres://user:password@remote-host:5432/topems
```

## 数据库用户权限

### 开发环境
```sql
-- 创建用户
CREATE ROLE topems WITH LOGIN PASSWORD 'topems_secret' CREATEDB SUPERUSER;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE topems TO topems;
```

### 生产环境
```sql
-- 创建只读用户
CREATE ROLE topems_readonly WITH LOGIN PASSWORD 'readonly_password' NOLOGIN;
GRANT CONNECT ON DATABASE topems TO topems_readonly;
GRANT USAGE ON SCHEMA iam TO topems_readonly;
GRANT USAGE ON SCHEMA mail TO topems_readonly;
GRANT USAGE ON SCHEMA shared TO topems_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA iam TO topems_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA mail TO topems_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA shared TO topems_readonly;

-- 创建读写用户
CREATE ROLE topems_app WITH LOGIN PASSWORD 'app_password' NOLOGIN;
GRANT CONNECT ON DATABASE topems TO topems_app;
GRANT USAGE ON SCHEMA iam TO topems_app;
GRANT USAGE ON SCHEMA mail TO topems_app;
GRANT USAGE ON SCHEMA shared TO topems_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA iam TO topems_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mail TO topems_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA shared TO topems_app;
```

## 备份策略

### 本地备份
```bash
# 全量备份
pg_dump -U topems -d topems > backup_$(date +%Y%m%d).sql

# 压缩备份
pg_dump -U topems -d topems | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Docker 备份
```bash
docker exec topems-postgres pg_dump -U topems -d topems > backup_$(date +%Y%m%d).sql
```

### 恢复数据
```bash
# 本地恢复
psql -U topems -d topems < backup_20240610.sql

# Docker 恢复
docker exec -i topems-postgres psql -U topems -d topems < backup_20240610.sql
```
