# DOC-File-AI 统一文件服务整合设计

**日期**: 2026-06-11
**状态**: 已批准
**版本**: 1.0

---

## 1. 概述

### 1.1 目标

整合 DOC 服务、AI 服务和新建的 File 服务，建立统一的文件存储和向量化处理流程。

### 1.2 设计决策

| 问题 | 选择 |
|------|------|
| 集成方式 | API 调用模式 |
| 上传流程 | 直接流（边收边转发） |
| 文件 ID 管理 | 双向绑定 |
| 向量化触发 | HTTP 回调 |
| 删除处理 | 业务服务手动清理 |

---

## 2. 架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              前端                                           │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           服务层                                            │
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │    DOC      │    │   File      │    │    AI       │    │   Ollama    │ │
│  │   服务      │    │   服务      │    │   服务      │    │  本地模型   │ │
│  │  (8001)    │    │  (8055)    │    │  (8004)    │    │             │ │
│  ├─────────────┤    ├─────────────┤    ├─────────────┤    ├─────────────┤ │
│  │ 文档元数据   │    │ 文件存储    │    │ 向量处理    │    │ Embedding  │ │
│  │ 文档分类    │◄──►│ 权限管理    │    │ 文档分段    │◄──►│ Generation │ │
│  │ 文档版本    │    │ 分享控制    │    │ RAG 检索    │    │            │ │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └─────────────┘ │
│         │                   │                   │                         │
└─────────┼───────────────────┼───────────────────┼─────────────────────────┘
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           存储层                                            │
│                                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │ PostgreSQL │    │  本地存储   │    │    Redis    │                     │
│  │  (元数据)  │    │ (File服务) │    │  (HNSW索引) │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 服务职责

| 服务 | 职责 | 存储内容 |
|------|------|----------|
| **DOC** | 文档业务管理 | 文档元数据（标题、分类、标签等） |
| **File** | 文件物理存储 | 实际文件内容（PDF、图片、视频等） |
| **AI** | 向量化和 RAG | 文档分段和向量数据 |
| **Ollama** | 本地 LLM | 模型推理和 Embedding |

### 2.3 数据流

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           用户上传文档流程                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    用户 ──► DOC ──► File ──► 返回 file_id + storage_path ──► DOC 保存     │
│                     │                                                       │
│                     │ 存储文件                                              │
│                     ▼                                                       │
│                  File 服务                                                  │
│                     │                                                       │
│                     │ 元数据写入 storage.files                              │
│                     ▼                                                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                           向量化流程（回调模式）                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    DOC 收到文件 ──► 调用 AI 向量化 API ──► AI 读取文件 ──► 生成向量        │
│                           │                          │                      │
│                           │                          ▼                      │
│                           │                    存入 Redis HNSW              │
│                           ▼                                                  │
│                       更新 vector_status = 'completed'                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. API 设计

### 3.1 File 服务 API

| 方法 | 端点 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/api/v1/files/upload` | 上传文件 | multipart/form-data | FileUploadResponse |
| GET | `/api/v1/files/{id}` | 获取文件元数据 | - | FileMetadata |
| GET | `/api/v1/files/{id}/download` | 下载文件 | - | 二进制流 |
| DELETE | `/api/v1/files/{id}` | 删除文件 | - | ApiResponse |
| GET | `/api/v1/files` | 列出文件 | query: owner_id, file_type | Vec\<FileMetadata\> |
| PUT | `/api/v1/files/{id}` | 更新元数据 | FileMetadataUpdate | FileMetadata |
| POST | `/api/v1/files/{id}/share` | 分享文件 | ShareRequest | FilePermission |
| GET | `/api/v1/files/stats` | 统计信息 | - | FileStats |

### 3.2 AI 服务 API

| 方法 | 端点 | 说明 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/api/v1/ai/documents/{file_id}/vectorize` | 对文件进行向量化 | - | VectorizeResponse |
| GET | `/api/v1/ai/documents/{file_id}/status` | 获取向量化状态 | - | VectorStatusResponse |
| DELETE | `/api/v1/ai/documents/{file_id}` | 删除向量数据 | - | ApiResponse |

### 3.3 请求/响应格式

#### File 上传响应
```json
{
  "code": 200,
  "success": true,
  "data": {
    "file_id": "uuid",
    "storage_path": "files/2026/06/11/uuid_filename.pdf",
    "filename": "report.pdf",
    "file_size": 102400,
    "content_type": "application/pdf",
    "vector_status": "pending"
  },
  "message": "上传成功"
}
```

#### AI 向量化响应
```json
{
  "code": 200,
  "success": true,
  "data": {
    "file_id": "uuid",
    "status": "processing",
    "chunks_count": 10,
    "vectors_count": 10
  },
  "message": "向量化已开始"
}
```

---

## 4. 数据模型

### 4.1 File 服务 (storage.files)

```sql
CREATE TABLE storage.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,              -- 上传用户 ID
    owner_department_id UUID,            -- 所属部门 ID

    filename VARCHAR(500) NOT NULL,      -- 原始文件名
    storage_path VARCHAR(1000) NOT NULL, -- 存储路径
    file_size BIGINT NOT NULL,          -- 文件大小
    content_type VARCHAR(100) NOT NULL,  -- MIME 类型

    file_type VARCHAR(50) NOT NULL DEFAULT 'document',
    category VARCHAR(100),               -- 业务分类

    version INT DEFAULT 1,
    parent_id UUID REFERENCES storage.files(id),

    vector_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'none'
    vector_document_id UUID,             -- AI 文档 ID

    is_shared BOOLEAN DEFAULT FALSE,
    visibility VARCHAR(20) DEFAULT 'private', -- 'private', 'department', 'public'

    status VARCHAR(20) DEFAULT 'active',

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

### 4.2 向量化状态说明

| 状态 | 说明 |
|------|------|
| `none` | 不需要向量化（图片、视频等） |
| `pending` | 等待向量化 |
| `processing` | 正在向量化 |
| `completed` | 向量化完成 |
| `failed` | 向量化失败 |

---

## 5. 交互序列

### 5.1 上传并向量化

```
用户        DOC              File             AI              Ollama
 │           │                │               │                │
 │──上传文件──►                │               │                │
 │           │──转发文件──────►               │                │
 │           │                │               │                │
 │           │                │──存储文件──────►                │
 │           │                │               │                │
 │           │                │◄─file_id+path──┘                │
 │           │◄──────────────────────────────┘                │
 │◄──成功───│                │               │                │
 │           │                              │                │
 │           │──调用向量化─────────────────►                │
 │           │                              │                │
 │           │                              │──读取文件──────►│
 │           │                              │◄─文本内容──────┘│
 │           │                              │                │
 │           │                              │──生成向量──────►│
 │           │                              │◄─vectors──────┘│
 │           │                              │                │
 │           │                              │──存储向量──────►│
 │           │                              │                │
 │           │◄─processing──┘               │                │
 │           │                              │                │
 │           │        （AI处理完成后）        │                │
 │           │◄─completed──┘               │                │
```

### 5.2 删除文档

```
用户        DOC              File             AI
 │           │                │               │
 │──删除────►                │               │
 │           │──删除向量────────────────────►│
 │           │◄─删除成功──┘                   │
 │           │                              │
 │           │──删除文件────────────────────►│
 │           │◄─删除成功──┘                   │
 │           │                              │
 │◄──成功───│                │               │
```

---

## 6. 关键设计要点

### 6.1 双向绑定

| 服务 | 保存的内容 |
|------|-----------|
| DOC | file_id, storage_path, 文档元数据 |
| File | file_id, 文件内容, owner_id |

### 6.2 回调触发向量化

- DOC 收到 File 返回后，自行决定是否调用 AI 向量化
- AI 向量化完成后，更新 File 服务的 vector_status

### 6.3 级联删除

删除文档时，业务服务（DOC）负责：
1. 调用 AI 服务删除向量数据
2. 调用 File 服务删除文件

---

## 7. 实施计划

### 阶段 1：基础设施
- [x] File 服务基础实现
- [ ] 完善 File 服务 API（直接流上传）
- [ ] 创建数据库迁移脚本

### 阶段 2：服务集成
- [ ] DOC 服务集成 File 服务
- [ ] AI 服务集成 File 服务
- [ ] 实现向量化回调

### 阶段 3：数据迁移
- [ ] 迁移 DOC 现有文件到 File 服务
- [ ] 迁移 AI 文档到 File 服务

### 阶段 4：清理
- [ ] 删除 DOC 的本地存储逻辑
- [ ] 删除 AI 的本地存储逻辑
- [ ] 更新文档

---

## 8. 相关文档

- [统一文件服务设计](./UNIFIED_FILE_SERVICE.md)
- [数据库设计](../database-design.md)
- [部署指南](../deployment-guide.md)
