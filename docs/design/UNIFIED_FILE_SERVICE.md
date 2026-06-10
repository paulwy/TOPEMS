# 统一文件服务设计文档

**日期**: 2026-06-11
**状态**: 已批准
**版本**: 1.0

---

## 1. 概述

### 1.1 目标

构建统一的文件服务（FileService），整合 DOC 服务、Mail 附件、AI 文档等文件存储功能，为本地知识库提供统一的文件素材管理能力。

### 1.2 核心需求

| 需求 | 描述 |
|------|------|
| 所有权 | 用户 + 部门双重归属 |
| 文件类型 | 个人文件 + 共享文件 |
| 向量化 | 上传时自动触发 AI 向量化 |
| 隔离 | 部门/项目级别权限隔离 |
| 存储扩展 | 支持本地存储 → S3/MinIO |

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                     统一文件服务 (FileService)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │ Storage     │  │ Metadata   │  │ Permission  │       │
│  │ Backend     │  │ Repository │  │ Service     │       │
│  │ (Local/S3) │  │ (PostgreSQL)│ │ (ACL)       │       │
│  └─────────────┘  └─────────────┘  └─────────────┘       │
│         │                │                │               │
│         └────────────────┼────────────────┘               │
│                          ▼                                │
│  ┌─────────────────────────────────────────────┐        │
│  │         Event Bus (内部事件)                    │        │
│  │    触发 AI 向量化 | 更新索引 | 通知 等         │        │
│  └─────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 调用关系

```
┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
│  DOC    │     │  MAIL   │     │   AI    │     │  HRM    │
│ 服务    │     │  服务    │     │  服务    │     │  服务    │
└────┬────┘     └────┬────┘     └────┬────┘     └────┬────┘
     │               │               │               │
     └───────────────┴───────────────┴───────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  FileService    │
                    │  (统一入口)      │
                    └─────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ LocalStorage│     │  S3Storage  │     │ MinIOStorage│
│ (当前实现)  │     │  (未来扩展)  │     │  (未来扩展)  │
└─────────────┘     └─────────────┘     └─────────────┘
```

---

## 3. 数据模型

### 3.1 文件元数据表 `storage.files`

```sql
CREATE TABLE storage.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,              -- 上传用户 ID
    owner_department_id UUID,            -- 所属部门 ID

    filename VARCHAR(500) NOT NULL,      -- 原始文件名
    storage_path VARCHAR(1000) NOT NULL, -- 存储路径
    file_size BIGINT NOT NULL,          -- 文件大小
    content_type VARCHAR(100) NOT NULL,   -- MIME 类型

    -- 文件分类
    file_type VARCHAR(50) NOT NULL,     -- 'document', 'attachment', 'image', 'video', 'archive'
    category VARCHAR(100),               -- 业务分类

    -- 版本控制
    version INT DEFAULT 1,
    parent_id UUID REFERENCES storage.files(id), -- 上一版本

    -- 向量化状态
    vector_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    vector_document_id UUID,            -- 关联 AI 文档 ID

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

-- 索引
CREATE INDEX idx_storage_files_owner ON storage.files(owner_id);
CREATE INDEX idx_storage_files_department ON storage.files(owner_department_id);
CREATE INDEX idx_storage_files_type ON storage.files(file_type);
CREATE INDEX idx_storage_files_status ON storage.files(status);
CREATE INDEX idx_storage_files_vector ON storage.files(vector_status);
CREATE INDEX idx_storage_files_visibility ON storage.files(visibility);
```

### 3.2 文件权限表 `storage.file_permissions`

```sql
CREATE TABLE storage.file_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL REFERENCES storage.files(id) ON DELETE CASCADE,
    principal_type VARCHAR(20) NOT NULL, -- 'user', 'department', 'role'
    principal_id UUID NOT NULL,          -- user_id / department_id / role_id
    permission VARCHAR(50) NOT NULL,     -- 'read', 'write', 'delete', 'share', 'admin'
    granted_by UUID,                     -- 授权人
    expires_at TIMESTAMPTZ,              -- 过期时间，可选
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(file_id, principal_type, principal_id, permission)
);

CREATE INDEX idx_file_perms_file ON storage.file_permissions(file_id);
CREATE INDEX idx_file_perms_principal ON storage.file_permissions(principal_type, principal_id);
```

### 3.3 存储后端配置表 `storage.backends`

```sql
CREATE TABLE storage.backends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,  -- 'local', 's3', 'minio'
    backend_type VARCHAR(50) NOT NULL,  -- 'local', 's3', 'minio'
    is_active BOOLEAN DEFAULT FALSE,
    config JSONB,                        -- 存储配置 (endpoint, bucket, region, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 4. 存储后端抽象

### 4.1 Storage Trait

```rust
#[async_trait]
pub trait FileStorage: Send + Sync {
    /// 上传文件
    async fn upload(&self, path: &str, data: &[u8], metadata: &FileMetadata) -> Result<StorageResult>;

    /// 下载文件
    async fn download(&self, path: &str) -> Result<Vec<u8>>;

    /// 删除文件
    async fn delete(&self, path: &str) -> Result<()>;

    /// 检查文件是否存在
    async fn exists(&self, path: &str) -> Result<bool>;

    /// 生成预签名 URL（用于 S3/MinIO）
    async fn presigned_url(&self, path: &str, expires_in: Duration) -> Result<String>;

    /// 获取存储类型
    fn backend_type(&self) -> &'static str;
}
```

### 4.2 支持的存储后端

| 后端 | 状态 | 说明 |
|------|------|------|
| LocalStorage | ✅ 已实现 | 本地文件系统 |
| S3Storage | 🔜 未来 | AWS S3 兼容 |
| MinIOStorage | 🔜 未来 | MinIO 对象存储 |

---

## 5. 事件系统

### 5.1 文件事件

```rust
pub enum FileEvent {
    FileUploaded {
        file_id: Uuid,
        owner_id: Uuid,
        file_type: String,
        storage_path: String,
        content_type: String,
    },
    FileDeleted {
        file_id: Uuid,
        storage_path: String,
    },
    FileShared {
        file_id: Uuid,
        shared_with: Principal,
    },
    FileVersionCreated {
        file_id: Uuid,
        new_version_id: Uuid,
    },
}
```

### 5.2 向量化触发规则

```rust
fn should_vectorize(content_type: &str) -> bool {
    matches!(
        content_type,
        "text/plain" | "text/markdown" | "text/csv"
            | "application/pdf"
            | "application/msword"
            | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
}
```

---

## 6. API 设计

### 6.1 端点列表

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/v1/files/upload` | 上传文件 |
| GET | `/api/v1/files/{id}` | 获取文件元数据 |
| GET | `/api/v1/files/{id}/download` | 下载文件 |
| DELETE | `/api/v1/files/{id}` | 删除文件 |
| PUT | `/api/v1/files/{id}` | 更新元数据 |
| GET | `/api/v1/files` | 列出文件（支持过滤） |
| POST | `/api/v1/files/{id}/share` | 分享文件 |
| GET | `/api/v1/files/shared` | 获取与我共享的文件 |
| GET | `/api/v1/files/stats` | 文件统计 |
| POST | `/api/v1/files/{id}/versions` | 创建新版本 |
| GET | `/api/v1/files/{id}/versions` | 获取版本历史 |

### 6.2 请求/响应示例

#### 上传文件
```http
POST /api/v1/files/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

file: <binary>
category: "documents"
visibility: "private"
```

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "filename": "report.pdf",
    "file_size": 102400,
    "content_type": "application/pdf",
    "storage_path": "/files/2026/06/11/550e8400-e29b-41d4-a716-446655440000.pdf",
    "vector_status": "pending"
  }
}
```

#### 分享文件
```http
POST /api/v1/files/{id}/share
Content-Type: application/json
Authorization: Bearer <token>

{
  "principal_type": "department",
  "principal_id": "department-uuid",
  "permission": "read",
  "expires_at": "2026-12-31T23:59:59Z"
}
```

---

## 7. 权限模型

### 7.1 权限类型

| 权限 | 说明 |
|------|------|
| read | 读取文件 |
| write | 修改文件 |
| delete | 删除文件 |
| share | 分享文件 |
| admin | 完全控制 |

### 7.2 权限检查流程

```
1. 检查文件 visibility
   ├── 'public': 所有认证用户可读
   ├── 'department': 同一部门可读
   └── 'private': 仅所有者 + 被授权者

2. 检查权限表 storage.file_permissions
   ├── 所有者: 自动拥有所有权限
   ├── 部门成员: 根据 visibility 决定
   └── 被授权者: 根据 permission 决定
```

---

## 8. 目录结构

```
svc/file/                           # 统一文件服务
├── Cargo.toml
├── src/
│   ├── main.rs                   # 入口
│   ├── api/
│   │   ├── mod.rs               # 路由注册
│   │   ├── handlers.rs          # API handlers
│   │   ├── middleware.rs        # 权限校验中间件
│   │   └── response.rs         # 响应结构
│   ├── models/
│   │   ├── mod.rs
│   │   ├── file.rs              # File, FileMetadata
│   │   ├── permission.rs        # FilePermission
│   │   └── events.rs            # FileEvent
│   ├── services/
│   │   ├── mod.rs
│   │   ├── file_service.rs      # 核心文件服务
│   │   ├── permission.rs        # 权限服务
│   │   └── vector.rs            # 向量化触发服务
│   ├── repositories/
│   │   ├── mod.rs
│   │   ├── file_repo.rs         # 文件仓储
│   │   └── permission_repo.rs   # 权限仓储
│   ├── backends/
│   │   ├── mod.rs
│   │   ├── traits.rs            # FileStorage trait
│   │   ├── local.rs             # 本地存储实现
│   │   ├── s3.rs                # S3 存储实现 (未来)
│   │   └── factory.rs           # 存储后端工厂
│   └── db/
│       ├── mod.rs
│       └── migrations.rs         # 数据库迁移
├── migrations/
│   └── 20260611000001_create_storage_schema.sql
└── tests/
    └── integration_tests.rs
```

---

## 9. 迁移计划

### 阶段 1: 基础设施 (当前)
- [x] 设计文档
- [ ] 创建 `svc/file` 服务骨架
- [ ] 实现数据库迁移脚本
- [ ] 实现存储后端抽象

### 阶段 2: 核心功能
- [ ] 实现文件 CRUD API
- [ ] 实现权限服务
- [ ] 实现事件系统

### 阶段 3: 向量化集成
- [ ] AI 服务事件订阅
- [ ] 向量化状态跟踪

### 阶段 4: 存储扩展
- [ ] S3 存储后端
- [ ] MinIO 存储后端

### 阶段 5: 服务迁移
- [ ] DOC 服务迁移到 FileService
- [ ] Mail 附件迁移到 FileService
- [ ] AI 文档迁移到 FileService

---

## 10. 风险与注意事项

1. **数据迁移**: 现有 DOC、Mail、AI 的文件数据需要迁移
2. **向后兼容**: 需要保留旧 API 供现有前端使用
3. **事务一致性**: 文件删除时需同时清理权限记录
4. **S3 兼容性**: 不同 S3 兼容存储可能存在差异

---

## 11. 相关文档

- [数据库设计](./database-design.md)
- [部署指南](./deployment-guide.md)
- [AI 服务文档](../ai/README.md)
- [DOC-File-AI 整合设计](./DOC_FILE_AI_INTEGRATION.md) - 服务集成详细设计
