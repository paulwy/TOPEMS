# PDM模块技术文档

## 1. 概述

PDM（产品数据管理）模块是TOPEMS平台的核心模块之一，提供产品结构管理、文档管理、版本控制、变更管理等功能，帮助企业管理产品全生命周期数据。

### 1.1 功能定位

| 功能类别 | 功能描述 |
|----------|----------|
| 产品结构 | BOM管理、配置管理、物料清单 |
| 文档管理 | 技术文档、图纸管理、文档版本 |
| 版本控制 | 版本管理、变更历史、版本对比 |
| 变更管理 | 变更申请、变更评审、变更执行 |
| 项目管理 | 产品项目、阶段管理、任务分配 |

### 1.2 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      PDM模块架构                            │
├─────────────────────────────────────────────────────────────┤
│  前端层 (React + TypeScript)                               │
│  ├── pages/                                                │
│  │   └── PdmPage.tsx        # PDM主页面                  │
│  └── components/                                           │
│      └── pdm/                                              │
│          ├── BomTree.tsx      # BOM树组件                │
│          └── DocumentCard.tsx # 文档卡片                 │
├─────────────────────────────────────────────────────────────┤
│  API层 (TypeScript)                                        │
│  └── pdm.ts               # PDM API客户端                  │
├─────────────────────────────────────────────────────────────┤
│  后端服务 (Rust + PostgreSQL)                              │
│  ├── main.rs              # 服务入口                       │
│  ├── api/                 # API路由                       │
│  │   ├── product.rs        # 产品管理                      │
│  │   ├── bom.rs            # BOM管理                       │
│  │   ├── document.rs       # 文档管理                      │
│  │   └── change.rs         # 变更管理                      │
│  └── models/              # 数据模型                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 核心功能详解

### 2.1 产品结构管理

**功能说明**：管理产品BOM结构和配置。

**数据模型**：

```typescript
interface Product {
  id: string;                    // 产品ID
  name: string;                  // 产品名称
  code: string;                  // 产品编号
  version: string;               // 版本号
  status: 'draft' | 'released' | 'obsolete'; // 状态
  description: string;           // 描述
  created_at: string;            // 创建时间
}

interface Bom {
  id: string;                    // BOM ID
  product_id: string;            // 产品ID
  product_version: string;       // 产品版本
  items: BomItem[];              // BOM项
  created_at: string;            // 创建时间
}

interface BomItem {
  id: string;                    // BOM项ID
  parent_id?: string;            // 父项ID
  material_id: string;           // 物料ID
  material_name: string;         // 物料名称
  quantity: number;              // 数量
  unit: string;                  // 单位
  position: number;              // 位置序号
}
```

### 2.2 文档管理

**功能说明**：管理技术文档和图纸。

**数据模型**：

```typescript
interface Document {
  id: string;                    // 文档ID
  name: string;                  // 文档名称
  code: string;                  // 文档编号
  type: 'drawing' | 'spec' | 'manual' | 'report'; // 类型
  version: string;               // 版本号
  status: 'draft' | 'approved' | 'released'; // 状态
  file_url: string;              // 文件路径
  product_id?: string;           // 关联产品
  created_by: string;            // 创建人
  created_at: string;            // 创建时间
}

interface DocumentVersion {
  id: string;                    // 版本ID
  document_id: string;           // 文档ID
  version: string;               // 版本号
  changes: string;               // 变更说明
  file_url: string;              // 文件路径
  created_at: string;            // 创建时间
}
```

### 2.3 变更管理

**功能说明**：管理产品变更流程。

**数据模型**：

```typescript
interface ChangeRequest {
  id: string;                    // 变更请求ID
  code: string;                  // 变更编号
  title: string;                 // 变更标题
  description: string;           // 变更描述
  type: 'minor' | 'major' | 'critical'; // 变更类型
  status: 'draft' | 'review' | 'approved' | 'rejected' | 'implemented'; // 状态
  affected_items: string[];      // 影响项
  created_by: string;            // 创建人
  created_at: string;            // 创建时间
}

interface ChangeReview {
  id: string;                    // 评审ID
  request_id: string;            // 变更请求ID
  reviewer: string;              // 评审人
  comment: string;               // 评审意见
  decision: 'approve' | 'reject' | 'pending'; // 评审结果
  reviewed_at: string;           // 评审时间
}
```

---

## 3. API接口文档

### 3.1 产品管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取产品列表 | GET | `/api/v1/pdm/products` |
| 创建产品 | POST | `/api/v1/pdm/products` |
| 获取产品详情 | GET | `/api/v1/pdm/products/:id` |

### 3.2 BOM管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取BOM列表 | GET | `/api/v1/pdm/boms` |
| 创建BOM | POST | `/api/v1/pdm/boms` |
| 获取BOM详情 | GET | `/api/v1/pdm/boms/:id` |
| 更新BOM | PUT | `/api/v1/pdm/boms/:id` |

### 3.3 文档管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取文档列表 | GET | `/api/v1/pdm/documents` |
| 上传文档 | POST | `/api/v1/pdm/documents` |
| 获取文档版本 | GET | `/api/v1/pdm/documents/:id/versions` |
| 新增版本 | POST | `/api/v1/pdm/documents/:id/versions` |

### 3.4 变更管理接口

| 接口 | 方法 | 路径 |
|------|------|------|
| 获取变更请求列表 | GET | `/api/v1/pdm/changes` |
| 创建变更请求 | POST | `/api/v1/pdm/changes` |
| 评审变更 | POST | `/api/v1/pdm/changes/:id/review` |
| 执行变更 | PUT | `/api/v1/pdm/changes/:id/implement` |

---

**文档版本**: v1.0.0  
**最后更新**: 2024-06-11  
**作者**: TOPEMS开发团队