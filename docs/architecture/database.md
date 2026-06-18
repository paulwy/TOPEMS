# TOPEMS 数据库设计规范 v2.0

## 文档信息

| 项目 | 内容 |
|------|------|
| 版本 | v2.0.0 |
| 日期 | 2026-06-18 |
| 状态 | 已实施 |
| 更新说明 | 完全重构数据库架构，对齐产品架构计划，采用 unified_core + plugin_* 架构 |

---

## 概述

本文档定义了 TOPEMS 系统的数据库设计规范、Schema 划分和表结构指南。数据库架构完全对齐产品架构计划，采用"核心平台 + 插件生态"的分层设计。

---

## 数据库配置

### 数据库连接

```bash
# 连接信息
Host: localhost
Port: 5432
Database: topems
Username: topems
Password: topems_secret

# 连接 URL 格式
DATABASE_URL=postgres://topems:topems_secret@localhost:5432/topems
```

### 必需扩展

```sql
-- UUID 支持
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 向量数据库支持（AI 知识库）
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## Schema 划分策略

### 架构设计理念

采用 **"核心平台 + 插件生态"** 的分层架构：

```
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL 数据库                        │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: 核心共享层 (public)                              │
│    ├── tenants           # 租户配置                        │
│    ├── companies         # 公司信息（统一）                 │
│    ├── departments       # 部门信息（统一）                 │
│    ├── employees         # 员工信息（统一）                 │
│    └── audit_logs        # 统一审计日志                    │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: 核心平台层 (unified_core)                        │
│    ├── users             # 用户认证                        │
│    ├── roles             # 角色定义                        │
│    ├── permissions       # 权限定义                        │
│    ├── documents         # 文档管理                        │
│    ├── workflow_*        # 工作流引擎                      │
│    ├── messages          # 即时通讯                        │
│    ├── emails            # 邮件服务                        │
│    ├── notifications     # 通知服务                        │
│    └── plugins           # 插件注册与管理                  │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: 业务插件层 (plugin_*)                            │
│    ├── plugin_erp        # ERP 企业资源计划                │
│    ├── plugin_hrm        # HRM 人力资源管理                │
│    ├── plugin_crm        # CRM 客户关系管理                │
│    ├── plugin_ai         # AI 知识库                       │
│    └── ...               # 其他业务插件                    │
└─────────────────────────────────────────────────────────────┘
```

### Schema 命名规范

| Schema | 类型 | 用途 | 说明 |
|--------|------|------|------|
| `public` | 核心层 | 共享实体 + 租户管理 | 公司、部门、员工、租户、审计日志 |
| `unified_core` | 核心层 | 核心平台 | IAM、文档、工作流、通讯、插件管理 |
| `plugin_erp` | 插件层 | ERP | 企业资源计划（财务、资产、凭证） |
| `plugin_hrm` | 插件层 | HRM | 人力资源管理（考勤、薪资、绩效） |
| `plugin_crm` | 插件层 | CRM | 客户关系管理（客户、商机、订单） |
| `plugin_pm` | 插件层 | PM | 项目管理（项目、任务、里程碑） |
| `plugin_wms` | 插件层 | WMS | 仓储管理（仓库、库存、出入库） |
| `plugin_ai` | 插件层 | AI | AI 知识库（向量检索、问答） |
| `plugin_mes` | 插件层 | MES | 制造执行系统 |
| `plugin_qms` | 插件层 | QMS | 质量管理 |
| `plugin_lims` | 插件层 | LIMS | 实验室管理 |
| `plugin_scm` | 插件层 | SCM | 供应链管理 |
| `plugin_srm` | 插件层 | SRM | 供应商管理 |
| `plugin_rs` | 插件层 | RS | 研发管理 |
| `plugin_gis` | 插件层 | GIS | 地理信息服务 |
| `plugin_bi` | 插件层 | BI | 商业智能 |
| `plugin_report` | 插件层 | Report | 报表服务 |
| `plugin_mobile` | 插件层 | Mobile | 移动服务 |
| `plugin_integration` | 插件层 | Integration | 系统集成 |
| `plugin_portal` | 插件层 | Portal | 企业门户 |
| `plugin_pdm` | 插件层 | PDM | 产品数据管理 |
| `plugin_ehs` | 插件层 | EHS | 安全管理 |

---

## 核心实体归属

### 共享实体（public schema）

| 实体 | 表名 | 说明 |
|------|------|------|
| Tenant | `public.tenants` | 租户配置（多租户核心） |
| Company | `public.companies` | 公司信息（统一） |
| Department | `public.departments` | 部门信息（统一） |
| Employee | `public.employees` | 员工信息（统一） |
| AuditLog | `public.audit_logs` | 统一审计日志 |

### 核心平台实体（unified_core schema）

| 模块 | 主要表 | 说明 |
|------|--------|------|
| IAM | `users`, `roles`, `permissions`, `sessions` | 身份认证与授权 |
| Doc | `documents`, `categories`, `document_versions` | 文档管理 |
| Flow | `workflow_definitions`, `workflow_instances`, `workflow_tasks` | 工作流引擎 |
| Communication | `messages`, `conversations`, `emails`, `notifications` | 通讯服务 |
| Plugin | `plugins`, `plugin_instances`, `plugin_permissions` | 插件管理 |

---

## 表设计规范

### 命名规范

1. **表名**: 小写，下划线分隔，复数形式
   - `users`, `documents`, `workflow_instances`

2. **字段名**: 小写，下划线分隔
   - `user_id`, `created_at`, `updated_at`

3. **索引名**: `idx_表名_字段名`
   - `idx_users_email`, `idx_documents_created_at`

4. **外键名**: `fk_表名_字段名`
   - `fk_users_tenant_id`

### 通用字段

每个表必须包含以下字段：

| 字段名 | 类型 | 描述 | 必需 |
|-------|------|------|------|
| `id` | UUID | 主键 | ✅ |
| `tenant_id` | UUID | 租户ID（多租户隔离） | ✅ |
| `created_at` | TIMESTAMP WITH TIME ZONE | 创建时间 | ✅ |
| `updated_at` | TIMESTAMP WITH TIME ZONE | 更新时间 | ✅ |
| `created_by` | UUID | 创建者 | 可选 |
| `updated_by` | UUID | 更新者 | 可选 |
| `is_deleted` | BOOLEAN | 逻辑删除 | 可选 |

---

## 核心表结构

### 1. public schema（共享实体）

#### 1.1 租户管理

```sql
-- 租户表
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) DEFAULT 'shared',  -- independent | shared
    plan VARCHAR(50) DEFAULT 'basic',   -- basic | professional | enterprise
    status VARCHAR(20) DEFAULT 'active',
    quota JSONB DEFAULT '{}'::jsonb,
    features JSONB DEFAULT '{}'::jsonb,
    database_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
```

#### 1.2 共享实体

```sql
-- 公司表
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
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

-- 部门表
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    manager_id UUID,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
```

### 2. unified_core schema（核心平台）

#### 2.1 IAM 模块

```sql
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

-- 角色表
CREATE TABLE unified_core.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL,
    scope VARCHAR(20) DEFAULT 'platform',
    is_system BOOLEAN DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

-- 权限表
CREATE TABLE unified_core.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    module VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    description TEXT,
    attributes JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- 角色权限关联
CREATE TABLE unified_core.role_permissions (
    role_id UUID REFERENCES unified_core.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES unified_core.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

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
```

#### 2.2 插件系统

```sql
-- 插件注册表
CREATE TABLE unified_core.plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(20) NOT NULL,
    description TEXT,
    plugin_type VARCHAR(20) NOT NULL,
    author VARCHAR(255),
    homepage VARCHAR(500),
    repository VARCHAR(500),
    icon_url VARCHAR(500),
    status VARCHAR(20) DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插件实例表
CREATE TABLE unified_core.plugin_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id UUID REFERENCES unified_core.plugins(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    runtime_url VARCHAR(255),
    runtime_status VARCHAR(20),
    base_path VARCHAR(100),
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    stopped_at TIMESTAMP WITH TIME ZONE,
    config JSONB DEFAULT '{}'::jsonb
);

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
```

### 3. plugin_ai schema（AI 知识库）

```sql
-- 知识库表
CREATE TABLE plugin_ai.knowledge_bases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) DEFAULT 'document',
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
    status VARCHAR(20) DEFAULT 'active',
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- 向量嵌入表（使用 pgvector）
CREATE TABLE plugin_ai.document_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    chunk_id UUID REFERENCES plugin_ai.document_chunks(id) ON DELETE CASCADE,
    embedding vector(1536),
    embedding_model VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建向量索引（HNSW 算法）
CREATE INDEX idx_document_embeddings_vector ON plugin_ai.document_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

## 多租户数据隔离

### 隔离策略

| 隔离维度 | 独立数据库 | 共享数据库 | 适用场景 |
|---------|-----------|-----------|---------|
| **数据隔离** | 数据库实例级 | Schema + 行级 | 数据敏感度 |
| **连接隔离** | 独立连接池 | 共享连接池 | 性能要求 |
| **配置隔离** | 独立配置 | 共享配置 | 运维复杂度 |
| **升级隔离** | 版本独立 | 统一升级 | 部署模式 |
| **成本** | 高 | 低 | 预算约束 |

### 租户上下文函数

```sql
-- 设置租户上下文
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant', p_tenant_id::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 获取当前租户ID
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant', TRUE), '')::UUID;
END;
$$ LANGUAGE plpgsql STABLE;
```

### 行级安全策略（可选）

```sql
-- 启用行级安全
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 创建租户隔离策略
CREATE POLICY tenant_isolation_policy ON public.companies
    USING (tenant_id = get_current_tenant_id());
```

---

## 索引设计原则

### 必须索引

1. **主键**: 自动创建索引
2. **外键**: 所有外键字段必须创建索引
3. **唯一约束**: 自动创建索引
4. **租户ID**: 所有多租户表必须索引 `tenant_id`

### 建议索引

1. **查询频率高的字段**: 如 `email`, `username`, `status`
2. **时间范围查询**: `created_at`, `updated_at`
3. **排序字段**: 常用排序字段
4. **向量字段**: 使用 HNSW 或 IVFFlat 索引

### 索引示例

```sql
-- 基础索引
CREATE INDEX idx_users_tenant_id ON unified_core.users(tenant_id);
CREATE INDEX idx_users_email ON unified_core.users(email);

-- 复合索引
CREATE INDEX idx_workflow_tasks_assignee_status 
ON unified_core.workflow_tasks(assignee, status);

-- 向量索引（AI 知识库）
CREATE INDEX idx_document_embeddings_vector 
ON plugin_ai.document_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

## 连接池配置

### 服务 Search Path 配置

| 服务 | Search Path | 说明 |
|------|-------------|------|
| unified-core | `unified_core, public` | 核心平台 |
| erp | `plugin_erp, public` | ERP 插件 |
| hrm | `plugin_hrm, public` | HRM 插件 |
| crm | `plugin_crm, public` | CRM 插件 |
| ai | `plugin_ai, public` | AI 插件 |

### 连接池参数

```yaml
# 数据库连接池配置
pool_min_size: 5
pool_max_size: 20
connect_timeout: 30  # 秒
idle_timeout: 600    # 秒
max_lifetime: 1800   # 秒
```

---

## 数据迁移

### 迁移文件结构

```
database/
├── init/
│   ├── 01_rebuild_database.sql      # 数据库重建脚本
│   ├── 02_create_plugin_tables.sql  # 插件表结构
│   └── README.md                    # 执行指南
└── migrations/
    ├── V1__init.sql
    ├── V2__add_xxx_table.sql
    └── V3__update_yyy.sql
```

### 迁移执行

```bash
# 使用 SQLx 执行迁移
cd services/{service}/backend
sqlx migrate run

# 或使用 psql 执行
psql -h localhost -U topems -d topems -f database/migrations/V1__init.sql
```

---

## 备份策略

### 备份频率

- **每日完整备份**: 保留 30 天
- **每小时增量备份**: 保留 7 天（可选）
- **实时 WAL 归档**: 保留 3 天（可选）

### 备份命令

```bash
# 完整备份
pg_dump -h localhost -U topems -d topems -F c -f topems_backup_$(date +%Y%m%d).dump

# 仅备份结构
pg_dump -h localhost -U topems -d topems --schema-only -F c -f topems_schema.dump

# 仅备份数据
pg_dump -h localhost -U topems -d topems --data-only -F c -f topems_data.dump
```

---

## 性能优化

### 查询优化

1. 使用 `EXPLAIN ANALYZE` 分析慢查询
2. 避免 `SELECT *`
3. 合理使用 LIMIT
4. 批量操作优化
5. 使用预编译语句

### 连接池优化

- 最小连接数: 5
- 最大连接数: 20
- 连接超时: 30 秒
- 空闲超时: 600 秒

### 向量检索优化

```sql
-- 使用 HNSW 索引（推荐）
CREATE INDEX idx_vector_hnsw ON table
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 使用 IVFFlat 索引（适合大数据集）
CREATE INDEX idx_vector_ivfflat ON table
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

---

## 安全规范

### 敏感数据

- **密码**: 使用 bcrypt 或 Argon2 哈希
- **个人信息**: 加密存储
- **审计日志**: 记录所有敏感操作

### 访问控制

- **最小权限原则**: 每个服务使用独立的数据库用户
- **行级安全**: 启用多租户隔离
- **定期权限审查**: 每季度审查一次

---

## 附录

### A. Schema 对照表

| 旧 Schema | 新 Schema | 迁移状态 |
|-----------|-----------|---------|
| `shared` | `public` | ✅ 已完成 |
| `iam` | `unified_core` | ✅ 已完成 |
| `doc` | `unified_core` | ✅ 已完成 |
| `flow` | `unified_core` | ✅ 已完成 |
| `notification` | `unified_core` | ✅ 已完成 |
| `erp` | `plugin_erp` | ✅ 已完成 |
| `hrm` | `plugin_hrm` | ✅ 已完成 |
| `crm` | `plugin_crm` | ✅ 已完成 |
| `ai` | `plugin_ai` | ✅ 已完成 |

### B. 默认账户

| 项目 | 值 |
|------|-----|
| 默认租户代码 | `default` |
| 管理员用户名 | `admin` |
| 管理员密码 | `admin123` |
| 管理员邮箱 | `admin@topems.com` |

### C. 相关文档

- [数据库重建指南](../../database/init/README.md)
- [产品架构计划](../product-architecture-plan.md)
- [统一数据库架构设计](./DATABASE_SCHEMA_DESIGN.md)

---

**版本**: v2.0.0  
**最后更新**: 2026-06-18  
**状态**: 已实施
