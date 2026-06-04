# 数据库设计规范

## 概述

本文档定义了TOPEMS系统的数据库设计规范、Schema划分和表结构指南。

## 数据库配置

### 数据库连接
```bash
# 连接信息
Host: localhost
Port: 5432
Database: topems
Username: topems
Password: topems_secret
```

## Schema划分策略

每个微服务使用独立的Schema，确保服务间数据隔离。

### 核心平台Schema
| Schema | 服务 | 描述 |
|-------|------|------|
| `public` | 共享 | 系统共享表 |
| `iam` | topems-iam | IAM身份认证 |
| `doc` | topems-doc | 文档管理 |
| `flow` | topems-flow | 工作流引擎 |
| `notification` | notification-service | 通知服务 |

### 业务服务Schema
| Schema | 服务 | 描述 |
|-------|------|------|
| `erp` | topems-erp | 企业资源计划 |
| `hrm` | topems-hrm | 人力资源管理 |
| `ai` | topems-ai | AI知识库 |
| `rs` | topems-rs | 研发管理 |
| `lims` | topems-lims | 实验室管理 |
| `crm` | topems-crm | 客户关系管理 |
| `mes` | topems-mes | 制造执行 |
| `qms` | topems-qms | 质量管理 |
| `ehs` | topems-ehs | 安全管理 |
| `scm` | topems-scm | 供应链 |
| `srm` | topems-srm | 供应商管理 |
| `wms` | topems-wms | 仓库管理 |
| `gis` | topems-gis | 地理信息 |
| `im` | topems-im | 即时通讯 |
| `bi` | topems-bi | 商业智能 |
| `report` | report-service | 报表服务 |
| `mail` | topems-mail | 邮件服务 |
| `mobile` | topems-mobile | 移动端服务 |
| `pdm` | topems-pdm | 产品数据管理 |
| `integration` | topems-integration | 系统集成 |
| `portal` | topems-portal | 企业门户 |

## 表设计规范

### 命名规范
1. **表名**: 小写，下划线分隔，复数形式
   - `users`, `documents`, `workflows`
   
2. **字段名**: 小写，下划线分隔
   - `user_id`, `created_at`, `updated_at`

3. **索引名**: `idx_表名_字段名`
   - `idx_users_email`, `idx_documents_created_at`

### 通用字段
每个表必须包含以下字段：
| 字段名 | 类型 | 描述 | 必需 |
|-------|------|------|------|
| `id` | UUID/BigInt | 主键 | ✅ |
| `created_at` | TIMESTAMP | 创建时间 | ✅ |
| `updated_at` | TIMESTAMP | 更新时间 | ✅ |
| `created_by` | UUID | 创建者 | 可选 |
| `updated_by` | UUID | 更新者 | 可选 |
| `is_deleted` | BOOLEAN | 逻辑删除 | 可选 |

## 核心表结构示例

### IAM Schema (iam)

```sql
-- 用户表
CREATE TABLE iam.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 角色表
CREATE TABLE iam.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 权限表
CREATE TABLE iam.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    resource VARCHAR(100),
    action VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户角色关联
CREATE TABLE iam.user_roles (
    user_id UUID REFERENCES iam.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES iam.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id)
);

-- 角色权限关联
CREATE TABLE iam.role_permissions (
    role_id UUID REFERENCES iam.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES iam.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- 会话表
CREATE TABLE iam.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES iam.users(id) ON DELETE CASCADE,
    token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 文档Schema (doc)

```sql
-- 文档表
CREATE TABLE doc.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- 文档分类
CREATE TABLE doc.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES doc.categories(id),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 文档分类关联
CREATE TABLE doc.document_categories (
    document_id UUID REFERENCES doc.documents(id) ON DELETE CASCADE,
    category_id UUID REFERENCES doc.categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (document_id, category_id)
);

-- 文档版本历史
CREATE TABLE doc.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES doc.documents(id) ON DELETE CASCADE,
    version INT NOT NULL,
    title VARCHAR(500),
    content TEXT,
    content_type VARCHAR(100),
    file_size BIGINT,
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 通知Schema (notification)

```sql
-- 通知表
CREATE TABLE notification.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- info, warning, error, success
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 通知模板
CREATE TABLE notification.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    title_template VARCHAR(500),
    content_template TEXT,
    type VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 通知订阅
CREATE TABLE notification.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    channel VARCHAR(50) DEFAULT 'web', -- web, email, sms
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, notification_type, channel)
);
```

## 索引设计原则

### 必须索引
1. **主键**: 自动创建索引
2. **外键**: 所有外键字段必须创建索引
3. **唯一约束**: 自动创建索引

### 建议索引
1. **查询频率高的字段**: 如 `email`, `username`, `status`
2. **时间范围查询**: `created_at`, `updated_at`
3. **排序字段**: 常用排序字段

## 事务与并发

### 事务边界
- 每个请求一个事务
- 跨服务事务使用Saga模式
- 长事务拆分

### 乐观锁
- 使用 `updated_at` 或 `version` 字段
- 检测并发更新

## 数据迁移

### 迁移文件
每个服务维护自己的迁移文件：
```
services/{service}/backend/migrations/
├── V1__init.sql
├── V2__add_xxx_table.sql
└── V3__update_yyy.sql
```

### 迁移执行
```bash
# 使用SQLx执行迁移
cd services/{service}/backend
sqlx migrate run
```

## 备份策略

### 备份频率
- 每日完整备份
- 每小时增量备份（可选）
- 实时WAL归档（可选）

### 备份保留
- 每日备份保留30天
- 每周备份保留90天
- 每月备份保留1年

## 性能优化

### 连接池
每个服务使用独立连接池：
- 最小连接数: 5
- 最大连接数: 20
- 超时配置

### 查询优化
1. 使用 `EXPLAIN ANALYZE` 分析慢查询
2. 避免 `SELECT *`
3. 合理使用LIMIT
4. 批量操作优化

## 安全规范

### 敏感数据
- 密码使用bcrypt/Argon2哈希
- 个人信息加密存储
- 审计日志记录

### 访问控制
- 最小权限原则
- 行级安全（可选）
- 定期权限审查

---
**版本**: 2.0.0
**最后更新**: 2026-06-04
