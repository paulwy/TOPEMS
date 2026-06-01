# TOPEMS 系统架构设计文档

## 版本记录

| 版本 | 日期 | 作者 | 变更说明 |
|------|------|------|----------|
| v2.1 | 2026-06-01 | System Architect | 优化完善，修复端口冲突，添加依赖关系 |
| v2.0 | 2026-05-30 | System Architect | 综合整理，统一设计 |

---

## 1. 系统概述

TOPEMS 是面向化工新材料企业的全业务数字化平台，采用微服务架构，提供研发管理、实验室信息管理、质量管理、安全环保等核心业务能力。

### 1.1 核心价值

- **研发数字化**: 从配方研发到产品上市的全流程管理
- **质量合规**: 符合行业法规要求的质量管控体系
- **数据驱动**: 基于AI的智能分析与决策支持
- **敏捷协作**: 跨部门协同与移动办公能力

### 1.2 设计原则

| 原则 | 说明 |
|------|------|
| 单一职责 | 每个服务只负责一个业务领域 |
| 松耦合 | 服务间通过API通信，避免强依赖 |
| 高可用 | 支持故障转移和弹性伸缩 |
| 可观测 | 完善的日志、监控和追踪体系 |
| 安全优先 | 认证授权贯穿所有服务 |
| 统一标准 | 统一的API规范、数据格式和错误处理 |

---

## 2. 架构设计

### 2.1 整体架构

```text
┌─────────────────────────────────────────────────────────────────┐
│                     客户端层                                    │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────────┐   │
│  │  Web端    │ │ 移动端    │ │ 桌面端    │ │ 第三方系统    │   │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └───────┬───────┘   │
└───────┼──────────────┼──────────────┼───────────────┼───────────┘
        │              │              │               │
┌───────▼──────────────▼──────────────▼───────────────▼───────────┐
│                     API 网关层                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 统一认证 | 统一路由 | 请求限流 | 日志记录 | 安全防护     │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────┬──────────────┬──────────────┬───────────────┬───────────┘
        │              │              │               │
┌───────▼──────────────▼──────────────▼───────────────▼───────────┐
│                     服务层                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   平台服务   │  │   业务服务   │  │   数据服务   │          │
│  │ - IAM       │  │ - RS         │  │ - BI         │          │
│  │ - FLOW      │  │ - LIMS       │  │ - 数据仓库   │          │
│  │ - DOC       │  │ - QMS        │  │              │          │
│  │ - AI        │  │ - EHS        │  │              │          │
│  │ - IM        │  │ - ERP        │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────┬──────────────┬──────────────┬───────────────┬───────────┘
        │              │              │               │
┌───────▼──────────────▼──────────────▼───────────────▼───────────┐
│                     数据层                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │PostgreSQL│  │  Redis   │  │  MinIO   │  │  向量库  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 服务划分

| 服务类别 | 服务名称 | 端口 | 状态 | 说明 |
|---------|---------|------|------|------|
| **平台服务** | topems-iam | 8002 | ✅ | 身份认证与权限管理 |
| | topems-doc | 8001 | ✅ | 文档管理 |
| | topems-ai | 8003 | ✅ | AI知识库 |
| | topems-flow | 8004 | ✅ | 工作流引擎 |
| | topems-im | 8018 | 📋 | 即时通讯 |
| **业务服务** | topems-rs | 8005 | ✅ | 研发项目管理 |
| | topems-lims | 8006 | ✅ | 实验室信息管理 |
| | topems-qms | 8007 | 🔄 | 质量管理系统 |
| | topems-ehs | 8008 | 🔄 | 安全环保系统 |
| | topems-erp | 8009 | 📋 | ERP系统 |
| | topems-srm | 8010 | 📋 | 供应商管理 |
| | topems-gis | 8017 | ✅ | 地理信息管理 |
| | topems-bi | 8011 | 🔄 | 商业智能 |
| | topems-crm | 8014 | 📋 | 客户关系管理 |
| | topems-hrm | 8019 | ✅ | 人力资源管理 |
| | topems-mes | 8013 | 📋 | 生产执行系统 |
| | topems-pdm | 8015 | 📋 | 产品数据管理 |
| | topems-scm | 8016 | 📋 | 供应链管理 |
| | topems-wms | 8020 | 📋 | 仓库管理系统 |
| **公共服务** | notification-service | 8023 | ✅ | 消息通知服务 |
| | report-service | 8024 | 📋 | 报表生成服务 |
| | topems-mobile | 8021 | ✅ | 移动端服务 |

**状态说明**: ✅ 已实现 | 🔄 开发中 | 📋 规划中

### 2.3 服务依赖关系

```text
                        ┌──────────────────┐
                        │    API Gateway   │
                        └────────┬─────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
┌───────▼───────┐        ┌───────▼───────┐        ┌───────▼───────┐
│   IAM服务    │        │   FLOW服务    │        │   DOC服务    │
│ (topems-iam) │        │ (topems-flow) │        │ (topems-doc) │
└───────┬───────┘        └───────┬───────┘        └───────┬───────┘
        │                        │                        │
        │        ┌───────────────┼───────────────┐        │
        │        │               │               │        │
        ▼        ▼               ▼               ▼        ▼
┌─────────────────────────────────────────────────────────────────┐
│                        业务服务层                               │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐  │
│  │  RS   │ │ LIMS  │ │  QMS  │ │  EHS  │ │  ERP  │ │  SRM  │  │
│  │(8005) │ │(8006) │ │(8007) │ │(8008) │ │(8009) │ │(8010) │  │
│  └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘  │
│      │         │         │         │         │         │      │
└──────┼─────────┼─────────┼─────────┼─────────┼─────────┼──────┘
       │         │         │         │         │         │
       └─────────┴─────────┴─────────┴─────────┴─────────┘
                          │
                          ▼
              ┌───────────────────┐
              │     PostgreSQL    │
              │      Redis        │
              │      MinIO        │
              └───────────────────┘
```

**依赖关系说明**:

| 服务 | 依赖服务 | 说明 |
|------|---------|------|
| RS | IAM, DOC, FLOW | 用户认证、文档管理、审批流程 |
| LIMS | IAM, DOC, FLOW | 用户认证、文档管理、审批流程 |
| QMS | IAM, LIMS, FLOW | 用户认证、检验数据、审批流程 |
| EHS | IAM, FLOW | 用户认证、审批流程 |
| ERP | IAM, FLOW | 用户认证、审批流程 |
| SRM | IAM, ERP, FLOW | 用户认证、企业数据、审批流程 |
| BI | RS, LIMS, QMS, ERP | 数据来源 |
| AI | DOC, RS | 知识库、实验数据 |

---

## 3. 服务架构设计

### 3.1 平台服务

#### 3.1.1 IAM 服务 (topems-iam)

**职责**: 统一身份认证、权限管理、单点登录

**核心功能**:
- 用户管理（创建、查询、更新、删除）
- 角色管理（角色定义、权限分配）
- 权限管理（菜单权限、数据权限）
- 认证服务（登录、登出、Token刷新）
- 审计日志

**数据库 Schema**: `iam`

**关键表**:

| 表名 | 说明 |
|------|------|
| iam.users | 用户信息 |
| iam.roles | 角色定义 |
| iam.permissions | 权限定义 |
| iam.role_permissions | 角色权限映射 |
| iam.user_roles | 用户角色映射 |
| iam.audit_logs | 审计日志 |

**对外 API**:
- `/api/v1/auth/*` - 认证接口
- `/api/v1/users/*` - 用户管理
- `/api/v1/roles/*` - 角色管理
- `/api/v1/permissions/*` - 权限管理

#### 3.1.2 工作流服务 (topems-flow)

**职责**: 流程定义、流程实例、审批流转

**核心功能**:
- 流程模板管理
- 流程实例创建与执行
- 审批任务分配
- 流程状态查询
- 流程版本管理

**数据库 Schema**: `flow`

**关键表**:

| 表名 | 说明 |
|------|------|
| flow.workflows | 流程模板 |
| flow.instances | 流程实例 |
| flow.tasks | 审批任务 |
| flow.transitions | 流程流转记录 |
| flow.notifications | 通知记录 |

**对外 API**:
- `/api/v1/workflows/*` - 流程模板
- `/api/v1/instances/*` - 流程实例
- `/api/v1/tasks/*` - 审批任务

#### 3.1.3 文档服务 (topems-doc)

**职责**: 文件存储、版本管理、文档检索

**核心功能**:
- 文件上传/下载
- 文件夹管理
- 版本控制
- 文档检索
- 权限控制

**数据库 Schema**: `doc`

**关键表**:

| 表名 | 说明 |
|------|------|
| doc.files | 文件元信息 |
| doc.folders | 文件夹 |
| doc.versions | 版本记录 |
| doc.permissions | 文件权限 |

**对外 API**:
- `/api/v1/files/*` - 文件管理
- `/api/v1/folders/*` - 文件夹管理
- `/api/v1/templates/*` - 模板管理

#### 3.1.4 AI 服务 (topems-ai)

**职责**: AI助手、文档问答、智能分析

**核心功能**:
- 知识库问答
- 文档摘要
- 智能搜索
- RAG检索
- 图表生成

**数据库 Schema**: `ai`

**关键表**:

| 表名 | 说明 |
|------|------|
| ai.knowledge_base | 知识库 |
| ai.embeddings | 向量存储 |
| ai.chat_history | 对话历史 |
| ai.tasks | AI任务记录 |

**对外 API**:
- `/api/v1/ai/chat` - AI对话
- `/api/v1/ai/summary` - 文档摘要
- `/api/v1/ai/search` - 智能搜索

### 3.2 业务服务

#### 3.2.1 研发管理服务 (topems-rs)

**职责**: 研发项目管理、配方管理、实验管理

**核心功能**:
- 项目管理（创建、跟踪、报告）
- 配方管理（配方设计、版本控制）
- 实验管理（实验记录、数据分析）
- 物料管理（原材料、半成品、成品）
- 专利管理

**数据库 Schema**: `rs`

**关键表**:

| 表名 | 说明 |
|------|------|
| rs.projects | 项目信息 |
| rs.formulas | 配方数据 |
| rs.experiments | 实验记录 |
| rs.materials | 物料信息 |
| rs.patents | 专利信息 |
| rs.audit_logs | 审计日志 |

**对外 API**:
- `/api/v1/projects/*` - 项目管理
- `/api/v1/experiments/*` - 实验记录
- `/api/v1/formulas/*` - 配方管理
- `/api/v1/materials/*` - 物料管理

#### 3.2.2 实验室管理服务 (topems-lims)

**职责**: 样品管理、检验流程、仪器管理

**核心功能**:
- 样品管理（接收、存储、处置）
- 检验流程（任务分配、数据录入）
- 仪器管理（维护、校准、使用记录）
- 试剂管理（库存、有效期）
- 报告管理

**数据库 Schema**: `lims`

**关键表**:

| 表名 | 说明 |
|------|------|
| lims.samples | 样品信息 |
| lims.inspection_tasks | 检验任务 |
| lims.inspection_records | 检验记录 |
| lims.instruments | 仪器设备 |
| lims.reagents | 试剂信息 |
| lims.audit_logs | 审计日志 |

**对外 API**:
- `/api/v1/samples/*` - 样品管理
- `/api/v1/tasks/*` - 检验任务
- `/api/v1/instruments/*` - 仪器管理
- `/api/v1/reagents/*` - 试剂管理

#### 3.2.3 质量管理服务 (topems-qms)

**职责**: 质量标准、质量检验、不合格品处理

**核心功能**:
- 质量标准管理
- 来料检验
- 过程检验
- 成品检验
- 不合格品处理
- 纠正措施

**数据库 Schema**: `qms`

**关键表**:

| 表名 | 说明 |
|------|------|
| qms.quality_standards | 质量标准 |
| qms.inspections | 检验记录 |
| qms.non_conformities | 不合格品 |
| qms.corrective_actions | 纠正措施 |
| qms.audit_logs | 审计日志 |

**对外 API**:
- `/api/v1/standards/*` - 质量标准
- `/api/v1/inspections/*` - 检验记录
- `/api/v1/issues/*` - 不合格品
- `/api/v1/actions/*` - 纠正措施

#### 3.2.4 安全环保服务 (topems-ehs)

**职责**: 安全管理、环保监测、事故管理

**核心功能**:
- 安全检查
- 环保监测
- 事故报告
- 应急预案
- 培训管理

**数据库 Schema**: `ehs`

**关键表**:

| 表名 | 说明 |
|------|------|
| ehs.safety_inspections | 安全检查 |
| ehs.environmental_data | 环保数据 |
| ehs.incidents | 事故记录 |
| ehs.trainings | 培训记录 |

**对外 API**:
- `/api/v1/safety/inspections/*` - 安全检查
- `/api/v1/environmental/data/*` - 环保数据
- `/api/v1/incidents/*` - 事故管理
- `/api/v1/trainings/*` - 培训管理

---

## 4. 数据架构设计

### 4.1 数据库策略

| 数据库 | 用途 | 版本 |
|--------|------|------|
| PostgreSQL | 主数据存储 | 16+ |
| Redis | 缓存、会话、消息队列 | 7+ |
| MinIO | 文件存储 | 最新 |
| pgvector | 向量检索（PostgreSQL扩展） | 最新 |

### 4.2 数据库 Schema 规划

```text
PostgreSQL 数据库: topems
├── iam.           # 身份认证 (topems-iam)
├── flow.          # 工作流 (topems-flow)
├── doc.           # 文档管理 (topems-doc)
├── ai.            # AI服务 (topems-ai)
├── rs.            # 研发管理 (topems-rs)
├── lims.          # 实验室管理 (topems-lims)
├── qms.           # 质量管理 (topems-qms)
├── ehs.           # 安全环保 (topems-ehs)
├── erp.           # ERP (topems-erp)
├── srm.           # 供应商管理 (topems-srm)
├── gis.           # 地理信息 (topems-gis)
└── bi.            # 数据仓库 (topems-bi)
```

### 4.3 数据流程图

```text
                        ┌─────────────────────────────────────┐
                        │          数据流向图                  │
                        └──────────────────┬──────────────────┘
                                           │
          ┌────────────────────────────────┼────────────────────────────────┐
          │                                │                                │
          ▼                                ▼                                ▼
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
│   研发项目      │           │   实验室检验    │           │   质量管理      │
│     (RS)        │           │    (LIMS)       │           │    (QMS)        │
└────────┬────────┘           └────────┬────────┘           └────────┬────────┘
         │                             │                             │
         ▼                             ▼                             ▼
┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
│   配方数据      │           │   样品数据      │           │   质量标准      │
└────────┬────────┘           └────────┬────────┘           └────────┬────────┘
         │                             │                             │
         └─────────────────────────────┼─────────────────────────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │    BI数据仓库   │
                              │    (topems-bi)  │
                              └────────┬────────┘
                                       │
                                       ▼
                              ┌─────────────────┐
                              │   报表与分析    │
                              └─────────────────┘
```

### 4.4 数据同步策略

| 同步类型 | 策略 | 频率 |
|---------|------|------|
| 实时同步 | CDC (Change Data Capture) | 实时 |
| 批量同步 | ETL 定时任务 | 每日/小时 |
| 事件驱动 | Kafka 消息队列 | 实时 |
| 全量同步 | 数据迁移任务 | 按需 |

---

## 5. API 架构设计

### 5.1 API 设计原则

| 原则 | 说明 |
|------|------|
| RESTful | 遵循REST规范 |
| 版本化 | API版本管理 |
| 统一响应 | 统一的响应格式 |
| 错误处理 | 统一的错误码 |
| 认证授权 | JWT Token |
| 幂等性 | POST以外操作保证幂等 |

### 5.2 统一响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1717056000
}
```

### 5.3 错误码规范

| 错误码 | HTTP状态码 | 说明 |
|--------|-----------|------|
| 200 | 200 | 成功 |
| 400 | 400 | 请求参数错误 |
| 401 | 401 | 未认证 |
| 403 | 403 | 无权限 |
| 404 | 404 | 资源不存在 |
| 409 | 409 | 资源冲突 |
| 500 | 500 | 服务器错误 |
| 1001 | 500 | 数据库错误 |
| 1002 | 401 | 认证失败 |
| 1003 | 400 | 参数验证失败 |

### 5.4 API 网关配置

```yaml
routes:
  - path: /api/iam/*
    service: topems-iam:8002
  - path: /api/doc/*
    service: topems-doc:8001
  - path: /api/ai/*
    service: topems-ai:8003
  - path: /api/flow/*
    service: topems-flow:8004
  - path: /api/rs/*
    service: topems-rs:8005
  - path: /api/lims/*
    service: topems-lims:8006
  - path: /api/qms/*
    service: topems-qms:8007
  - path: /api/ehs/*
    service: topems-ehs:8008
  - path: /api/erp/*
    service: topems-erp:8009
  - path: /api/srm/*
    service: topems-srm:8010
  - path: /api/bi/*
    service: topems-bi:8011
  - path: /api/gis/*
    service: topems-gis:8017
  - path: /api/hrm/*
    service: topems-hrm:8019
  - path: /api/mobile/*
    service: topems-mobile:8021
  - path: /api/notifications/*
    service: notification-service:8023
```

---

## 6. 安全架构设计

### 6.1 认证授权

```text
┌─────────────────────────────────────────────────────────────┐
│                    OAuth 2.0 / JWT                         │
├─────────────────────────────────────────────────────────────┤
│  登录 → 获取Token → 请求API → 验证Token → 授权检查          │
│       ↓                                                    │
│  刷新Token ←── 50分钟自动刷新                               │
└─────────────────────────────────────────────────────────────┘
```

### 6.2 权限模型

**RBAC + 数据权限**:

- **角色权限**: 基于角色的菜单/功能权限
- **数据权限**: 基于部门/项目的数据访问范围

**权限等级**:

| 等级 | 说明 |
|------|------|
| 系统管理员 | 所有权限 |
| 部门管理员 | 部门内所有权限 |
| 项目管理员 | 项目内所有权限 |
| 普通用户 | 分配的特定权限 |
| 访客 | 只读权限 |

### 6.3 安全措施

| 措施 | 说明 |
|------|------|
| API网关 | 统一入口，安全防护 |
| mTLS | 服务间加密通信 |
| 审计日志 | 完整操作记录 |
| 输入校验 | 参数验证和过滤 |
| 速率限制 | 防止API滥用 |
| HTTPS | 全站强制加密 |
| SQL注入防护 | 参数化查询 |
| XSS防护 | 输出编码 |
| CSRF防护 | Token验证 |

### 6.4 Token 管理

```text
┌─────────────────────────────────────────────────────────────┐
│                     Token 生命周期                         │
├─────────────────────────────────────────────────────────────┤
│  Access Token: 2小时有效期                                 │
│  Refresh Token: 7天有效期                                  │
│                                                           │
│  流程:                                                     │
│  1. 用户登录 → 获取 access_token + refresh_token           │
│  2. 使用 access_token 访问API                              │
│  3. 每50分钟自动刷新 access_token                         │
│  4. refresh_token 过期 → 重新登录                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. 部署架构设计

### 7.1 开发环境

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16
    ports:
      - "5433:5432"
    environment:
      POSTGRES_PASSWORD: topems_secret
  
  redis:
    image: redis:7
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    ports:
      - "9000:9000"
    command: server /data
  
  # 平台服务
  iam:
    build: ./platform/topems-iam/backend
    ports:
      - "8002:8002"
    depends_on:
      - postgres
      - redis

  doc:
    build: ./platform/topems-doc/backend
    ports:
      - "8001:8001"
    depends_on:
      - postgres
      - minio

  ai:
    build: ./platform/topems-ai/backend
    ports:
      - "8003:8003"
    depends_on:
      - postgres

  flow:
    build: ./platform/topems-flow/backend
    ports:
      - "8004:8004"
    depends_on:
      - postgres
      - redis

  # 业务服务
  rs:
    build: ./services/topems-rs/backend
    ports:
      - "8005:8005"
    depends_on:
      - postgres
      - iam

  lims:
    build: ./services/topems-lims/backend
    ports:
      - "8006:8006"
    depends_on:
      - postgres
      - iam

  hrm:
    build: ./services/topems-hrm/backend
    ports:
      - "8019:8019"
    depends_on:
      - postgres
      - iam

  gis:
    build: ./services/topems-gis/backend
    ports:
      - "8017:8017"
    depends_on:
      - postgres

  mobile:
    build: ./services/topems-mobile/backend
    ports:
      - "8021:8021"
    depends_on:
      - postgres
      - iam

  notification:
    build: ./services/notification-service
    ports:
      - "8023:8023"
    depends_on:
      - postgres
      - redis
```

### 7.2 生产环境

```text
Kubernetes Cluster
├── Namespace: topems
│   ├── API Gateway (nginx-ingress)
│   ├── Service Mesh (Istio)
│   ├── Platform Services
│   │   ├── iam (3 replicas)
│   │   ├── doc (3 replicas)
│   │   ├── ai (2 replicas)
│   │   └── flow (3 replicas)
│   ├── Business Services
│   │   ├── rs (3 replicas)
│   │   ├── lims (3 replicas)
│   │   ├── qms (2 replicas)
│   │   ├── ehs (2 replicas)
│   │   ├── erp (2 replicas)
│   │   └── srm (2 replicas)
│   └── Data Services
│       ├── postgres (HA)
│       ├── redis (cluster)
│       └── minio (distributed)
└── Monitoring Stack
    ├── Prometheus
    ├── Grafana
    ├── Loki
    └── Jaeger
```

### 7.3 端口分配规范

| 端口范围 | 服务类型 | 示例 |
|---------|---------|------|
| 8001-8010 | 核心业务服务 | IAM(8002), DOC(8001), AI(8003), FLOW(8004), RS(8005), LIMS(8006), QMS(8007), EHS(8008), ERP(8009), SRM(8010) |
| 8011-8020 | 扩展业务服务 | BI(8011), CRM(8014), PDM(8015), SCM(8016), GIS(8017), HRM(8019) |
| 8021+ | 辅助服务 | Mobile(8021), Notification(8023), Report(8024) |

---

## 8. 监控运维设计

### 8.1 日志系统

- **收集**: Fluentd/Loki
- **存储**: Elasticsearch/Loki
- **查询**: Kibana/Grafana
- **保留**: 30天

### 8.2 监控系统

- **指标**: Prometheus
- **可视化**: Grafana
- **告警**: AlertManager

**监控指标**:

| 指标 | 说明 | 阈值 |
|------|------|------|
| QPS | 每秒请求数 | 告警阈值: 1000 |
| 响应时间 | P50, P95, P99 | P95 > 2s 告警 |
| 错误率 | 5xx 错误占比 | >5% 告警 |
| CPU使用率 | 服务CPU占用 | >80% 告警 |
| 内存使用 | 服务内存占用 | >85% 告警 |
| 数据库连接 | 连接池使用 | >90% 告警 |

### 8.3 分布式追踪

- **追踪**: Jaeger
- **采样**: 1% ~ 10%

### 8.4 健康检查

**统一健康检查端点**: `/health`

**响应格式**:
```json
{
  "status": "healthy",
  "service": "topems-iam",
  "version": "1.0.0",
  "timestamp": "2026-06-01T10:00:00Z",
  "dependencies": [
    {
      "name": "database",
      "status": "healthy"
    },
    {
      "name": "redis",
      "status": "healthy"
    }
  ]
}
```

---

## 9. 代码规范

### 9.1 后端规范 (Rust)

| 规范 | 说明 |
|------|------|
| 命名 | snake_case |
| 格式化 | cargo fmt |
| 静态检查 | cargo clippy |
| 错误处理 | topems_shared::Result |
| 响应格式 | ApiResponse<T> |

### 9.2 前端规范 (TypeScript/React)

| 规范 | 说明 |
|------|------|
| 命名 | camelCase/PascalCase |
| 格式化 | Prettier |
| 静态检查 | ESLint |
| 组件命名 | PascalCase |
| 文件命名 | kebab-case |

---

## 10. 开发流程

```text
需求分析 → 设计评审 → 开发实现 → 单元测试 → 集成测试 → 代码审查 → 部署上线
     ↓              ↓              ↓              ↓              ↓
  Issue      Design Doc     PR       CI/CD      Code Review    Deployment
```

---

## 11. 重构建议

### 11.1 当前问题

| 问题 | 影响 | 优先级 |
|------|------|--------|
| 端口冲突（RS与AI共用8003） | 无法同时运行 | P0 |
| Vite代理配置错误 | 前端无法正确访问服务 | P0 |
| 服务配置不一致 | 配置混乱 | P1 |
| 健康检查端点不一致 | 监控无法正常工作 | P1 |
| Token刷新机制不完善 | 用户体验差 | P1 |

### 11.2 重构计划

| 阶段 | 任务 | 时间 |
|------|------|------|
| Phase 1 | 修复端口冲突 | 1周 |
| Phase 2 | 统一服务配置 | 1周 |
| Phase 3 | 完善监控体系 | 2周 |
| Phase 4 | 优化认证机制 | 2周 |

---

**文档版本**: v2.1  
**最后更新**: 2026-06-01  
**状态**: 正式版本