# TOPEMS Code Wiki

> **版本**: v5.15.0 | **最后更新**: 2026-07-16 | **文档版本**: v1.1 (V13.0 插件化架构整改)

---

## 目录

1. [项目概述](#1-项目概述)
2. [整体架构](#2-整体架构)
3. [后端架构](#3-后端架构)
4. [前端架构](#4-前端架构)
5. [数据库设计](#5-数据库设计)
6. [核心模块详解](#6-核心模块详解)
7. [关键类与函数](#7-关键类与函数)
8. [依赖关系](#8-依赖关系)
9. [部署与运行](#9-部署与运行)
10. [开发指南](#10-开发指南)

---

## 1. 项目概述

### 1.1 项目简介

**TOPEMS** 是一个企业级数字化平台，采用微服务架构设计，提供完整的企业管理解决方案。平台涵盖身份认证、文档管理、AI协作、流程自动化、数据分析、质量管理、供应链管理等20+个业务模块。

### 1.2 核心特性

| 特性类别 | 具体特性 |
|---------|---------|
| **核心服务** | 身份认证(IAM)、文档管理、AI服务、文件服务、流程自动化、通知服务 |
| **业务服务** | MES、PDM、QMS、LIMS、EHS、BI、ERP、HRM、SCM、WMS、CRM、PM、GIS |
| **技术亮点** | Rust高性能后端、React 19前端、微服务架构、PWA支持、AI增强 |
| **安全特性** | JWT认证、RBAC权限、行级安全(RLS)、多租户隔离、字段加密 |
| **V13.0 插件化架构** | 插件注册安全令牌验证（PLUGIN_REGISTRATION_TOKEN + X-Plugin-Token） |
| | Consul 服务发现 + 环境变量回退（SmartServiceClient） |
| | 插件心跳超时检测（30秒间隔，90秒超时） |
| | 插件依赖检查（正向+反向） |
| | 前端动态导航配置（fetchNavigationConfig） |
| | 集中化配置管理（ServiceConfigRegistry） |

### 1.3 技术栈

#### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^19.2.7 | UI框架 |
| TypeScript | ^7.0.2 | 类型安全 |
| Vite | ^8.0.16 | 构建工具 |
| MUI (Material UI) | ^9.1.1 | UI组件库 |
| React Query (TanStack) | - | 数据获取与缓存 |
| Zustand | - | 状态管理 |
| React Router | - | 路由管理 |
| React Three Fiber | ^8.x | 3D可视化 |
| i18next | - | 国际化 |

#### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Rust | 1.75+ | 编程语言 |
| Axum | ^0.8 | Web框架 |
| SQLx | ^0.8.6 | 数据库ORM |
| Tokio | 1.x | 异步运行时 |
| PostgreSQL | ^16 | 主数据库 |
| Redis | 7+ | 缓存/消息队列 |
| RabbitMQ | - | 消息代理 |
| JWT (jsonwebtoken) | 9.0 | 身份认证 |
| Prometheus | 0.13 | 指标监控 |

#### 基础设施

| 组件 | 技术 | 用途 |
|------|------|------|
| 服务发现 | Consul | 服务注册与发现 |
| 监控告警 | Prometheus + Grafana + Alertmanager | 监控告警 |
| 链路追踪 | Jaeger + OpenTelemetry | 分布式追踪 |
| 容器编排 | Docker + Kubernetes | 容器化部署 |
| API网关 | Nginx Ingress | 统一入口 |

---

## 2. 整体架构

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端层 (Client Layer)                    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │  Web    │  │ Mobile  │  │ Desktop │  │  第三方  │           │
│  │  应用   │  │  应用   │  │  (Tauri)│  │  系统   │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                      API 网关层 (API Gateway)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Nginx Ingress / Vite Proxy (开发)                        │   │
│  │  - 路由分发  - 负载均衡  - 限流熔断  - CORS处理           │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    核心服务层 (Core Services)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Unified Core│  │   AI服务    │  │  集成服务   │             │
│  │  (8000)     │  │  (8064)    │  │  (8072)     │             │
│  │ IAM/Doc/Flow│  │ 问答/摘要  │  │  系统集成   │             │
│  │ File/Notify │  │  RAG/向量  │  │  数据同步   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                   业务服务层 (Business Services)                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │   ERP   │  │   HRM   │  │   CRM   │  │   PM    │             │
│  │ (8010)  │  │ (8020)  │  │ (8029)  │  │ (8023)  │             │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │   MES   │  │   PDM   │  │   QMS   │  │  LIMS   │             │
│  │ (8030)  │  │ (8031)  │  │ (8050)  │  │ (8051)  │             │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │   SCM   │  │   WMS   │  │   SRM   │  │  EHS    │             │
│  │ (8040)  │  │ (8041)  │  │ (8042)  │  │ (8052)  │             │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐             │
│  │   BI    │  │   GIS   │  │  Mobile │  │  Portal │             │
│  │ (8060)  │  │ (8071)  │  │ (8070)  │  │ (8063)  │             │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    数据层 (Data Layer)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ PostgreSQL  │  │    Redis    │  │  RabbitMQ   │             │
│  │  主数据库   │  │  缓存/会话  │  │  消息队列   │             │
│  │  Schema隔离 │  │  向量存储   │  │  事件驱动   │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 架构风格

- **微服务架构**: 20+个独立服务，灵活扩展
- **插件化架构**: 业务服务以插件形式存在，可独立安装卸载
- **共享库模式**: 通过 `lib/` 共享核心功能（认证、数据库、缓存等）
- **Schema隔离**: 每个业务模块使用独立的PostgreSQL Schema

#### 2.2.1 V13.0 插件注册安全验证流程

V13.0 整改后，业务服务（插件）向 unified-core 注册时需经过严格的安全验证流程：

```
业务服务启动
    │
    ▼
读取 PLUGIN_REGISTRATION_TOKEN 环境变量
    │
    ▼
携带 X-Plugin-Token 头 + dependencies + navigation_config
    │
    ▼
POST /api/core/plugin/register
    │
    ▼
┌──────────────────────────────────────────────┐
│  unified-core 验证流程                         │
│  1. verify_registration_token() 校验令牌      │
│  2. 检查 dependencies 是否已安装               │
│  3. 存储 navigation_config 到数据库            │
│  4. 记录插件状态为 active                      │
│  5. 启动心跳监控（30秒间隔，90秒超时）          │
└──────────────────────────────────────────────┘
    │
    ▼
注册成功，插件对外提供服务
    │
    ▼
每 30 秒发送心跳 → /api/core/plugin/heartbeat
    │
    ▼
超时 90 秒未心跳 → 插件标记为 inactive
```

#### 2.2.2 核心服务瘦身

V13.0 整改后，**unified-core 核心服务完成瘦身**，不再包含以下业务模块的实现，相关业务能力已移至独立业务服务：

| 已迁移业务模块 | 迁移目标 |
|--------------|---------|
| erp（企业资源计划） | svc/erp/ 独立服务 |
| crm（客户关系管理） | svc/crm/ 独立服务 |
| hrm（人力资源管理） | svc/hrm/ 独立服务 |
| wms（仓储管理） | svc/wms/ 独立服务 |
| finance（财务管理） | svc/finance/ 独立服务 |

unified-core 现仅保留基础能力：IAM、工作流、文件管理、通讯服务、租户管理、**插件管理**、数据字典、迁移服务、搜索服务。业务服务以**插件**形式注册到核心，由 unified-core 统一管理生命周期、依赖关系与导航配置。

### 2.3 API路径规范

所有API路径遵循统一规范：

| 服务组 | 路径格式 | 示例 |
|--------|---------|------|
| 核心服务 | `/api/core/{service}` | `GET /api/core/iam/users` |
| 业务服务 | `/api/{service}` | `GET /api/erp/orders` |

WebSocket路径规范：`/ws/{module}/{feature}`

| 模块 | WebSocket路径 | 说明 |
|------|--------------|------|
| 核心通知 | `/ws/core/notifications` | 实时通知推送 |
| 核心IM | `/ws/core/im` | 即时通讯 |
| MES看板 | `/ws/mes/dashboard` | 生产看板实时数据 |
| GIS | `/ws/gis` | 地理信息实时数据 |
| BI看板 | `/ws/bi/dashboard/{id}` | BI看板实时更新 |

---

## 3. 后端架构

### 3.1 项目结构

```
TOPEMS/
├── lib/                          # 共享库 (topems_shared)
│   ├── src/
│   │   ├── auth.rs              # JWT认证中间件
│   │   ├── database.rs          # 数据库连接池
│   │   ├── cache.rs             # 缓存管理
│   │   ├── response.rs          # 统一响应格式
│   │   ├── schema.rs            # Schema定义
│   │   ├── rls.rs               # 行级安全中间件
│   │   ├── permission.rs        # 权限检查
│   │   ├── health.rs            # 健康检查
│   │   ├── event/               # 事件总线
│   │   ├── config/              # 配置管理
│   │   ├── api_version.rs       # API版本管理
│   │   └── ...
│   └── Cargo.toml
│
└── svc/                          # 业务服务
    ├── unified-core/            # 统一核心服务
    │   ├── src/
    │   │   ├── modules/
    │   │   │   ├── iam/         # 身份认证与授权
    │   │   │   ├── flow/        # 工作流引擎
    │   │   │   ├── file/        # 文件管理
    │   │   │   ├── communication/ # 通讯服务
    │   │   │   ├── tenant/      # 租户管理
    │   │   │   ├── plugin/      # 插件管理
    │   │   │   └── ...
    │   │   ├── middleware/      # 中间件
    │   │   └── main.rs
    │   └── Cargo.toml
    │
    ├── erp/                     # 企业资源计划
    ├── hrm/                     # 人力资源
    ├── crm/                     # 客户关系
    ├── mes/                     # 制造执行
    ├── pdm/                     # 产品数据
    ├── qms/                     # 质量管理
    ├── scm/                     # 供应链
    ├── wms/                     # 仓储管理
    ├── bi/                      # 商业智能
    ├── gis/                     # 地理信息
    ├── ai/                      # AI服务
    └── ...
```

### 3.2 服务启动流程

每个服务的启动流程基本一致，以ERP服务为例：

1. **加载环境变量**: 读取 `.env` 文件
2. **初始化日志**: 配置 tracing 日志系统
3. **初始化遥测**: OpenTelemetry 链路追踪
4. **创建数据库连接池**: SQLx PgPool
5. **初始化应用状态**: ApiState（数据库、认证、缓存等）
6. **构建路由**: 注册所有API路由
7. **添加中间件**: CORS、认证、RLS、指标、遥测
8. **启动服务**: 绑定端口，开始监听
9. **自动注册**: 向 unified-core 注册服务

### 3.3 中间件架构

```
请求 → CORS → 遥测 → Prometheus指标 → 认证 → RLS → 业务处理 → 响应
                ↓              ↓       ↓      ↓
            链路追踪      请求计数    JWT   租户隔离
            注入traceID   延迟统计    验证   行级过滤
```

#### 核心中间件

| 中间件 | 位置 | 功能 |
|--------|------|------|
| CORS | 最外层 | 跨域资源共享 |
| Telemetry | lib/src/telemetry.rs | 链路追踪、请求ID |
| Prometheus | axum-prometheus | 请求指标收集 |
| Auth | lib/src/auth.rs | JWT认证、权限验证 |
| RLS | lib/src/rls.rs | 行级安全、租户隔离 |
| Rate Limit | lib/src/rate_limit.rs | 限流保护 |
| Audit Log | svc/unified-core/middleware/ | 操作审计 |

### 3.4 共享库 (topems_shared)

共享库是所有后端服务的基础，提供统一的基础设施：

| 模块 | 文件 | 功能描述 |
|------|------|---------|
| **认证** | [auth.rs](file:///Users/air/TOPEMS/lib/src/auth.rs) | JWT生成/验证、认证中间件、权限检查 |
| **数据库** | [database.rs](file:///Users/air/TOPEMS/lib/src/database.rs) | 连接池管理、健康检查 |
| **缓存** | [cache.rs](file:///Users/air/TOPEMS/lib/src/cache.rs) | 多级缓存、内存缓存 |
| **响应** | [response.rs](file:///Users/air/TOPEMS/lib/src/response.rs) | 统一API响应格式 |
| **Schema** | [schema.rs](file:///Users/air/TOPEMS/lib/src/schema.rs) | Schema命名空间管理 |
| **RLS** | [rls.rs](file:///Users/air/TOPEMS/lib/src/rls.rs) | 行级安全中间件 |
| **权限** | [permission.rs](file:///Users/air/TOPEMS/lib/src/permission.rs) | 模块权限检查 |
| **健康检查** | [health.rs](file:///Users/air/TOPEMS/lib/src/health.rs) | 服务健康检查框架 |
| **事件** | [event/](file:///Users/air/TOPEMS/lib/src/event/) | 事件总线、RabbitMQ集成 |
| **配置** | [config/](file:///Users/air/TOPEMS/lib/src/config/) | 配置加载、服务注册 |
| **存储** | [storage.rs](file:///Users/air/TOPEMS/lib/src/storage.rs) | 文件存储抽象 |
| **租户** | [tenant.rs](file:///Users/air/TOPEMS/lib/src/tenant.rs) | 多租户管理 |
| **向量存储** | [vector_store.rs](file:///Users/air/TOPEMS/lib/src/vector_store.rs) | Redis向量搜索 |

### 3.5 插件架构 (V13.0)

V13.0 整改引入了完整的插件化架构，包含安全注册、心跳监控、依赖检查、服务发现、配置管理等核心能力。

#### 3.5.1 核心组件

| 组件 | 文件路径 | 职责 |
|------|---------|------|
| 插件运行时 | [svc/unified-core/src/modules/plugin/handlers/runtime.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/plugin/handlers/runtime.rs) | 插件注册、安全令牌验证、心跳处理、导航配置 API |
| 租户插件管理 | [svc/unified-core/src/modules/plugin/handlers/tenant_plugins.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/plugin/handlers/tenant_plugins.rs) | 插件安装/卸载的依赖检查（正向 + 反向） |
| 插件数据模型 | [svc/unified-core/src/modules/plugin/models.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/plugin/models.rs) | `RegisterPluginRequest`（含 `dependencies`、`navigation_config`、`category`） |
| 心跳检测任务 | [svc/unified-core/src/main.rs](file:///Users/air/TOPEMS/svc/unified-core/src/main.rs) | 后台任务，每 30 秒扫描一次插件心跳，超过 90 秒未心跳则标记为 inactive |
| 服务发现 | [lib/src/service_discovery.rs](file:///Users/air/TOPEMS/lib/src/service_discovery.rs) | `ConsulServiceRegistrar`、`ConsulDiscoveryClient`、`SmartServiceClient` |
| 集中化配置 | [lib/src/service_config.rs](file:///Users/air/TOPEMS/lib/src/service_config.rs) | `ServiceConfigRegistry` 单例，统一管理所有服务的配置 |

#### 3.5.2 业务服务插件入口

以下 7 个业务服务在启动时通过 `*_plugin.rs` 向 unified-core 注册插件，统一携带 `X-Plugin-Token` 头、`dependencies` 字段和 `navigation_config` 字段：

| 业务服务 | 插件入口文件 |
|---------|-------------|
| RD（研发管理） | `svc/rd/src/rd_plugin.rs` |
| AI（人工智能） | `svc/ai/src/ai_plugin.rs` |
| Mobile（移动端） | `svc/mobile/src/mobile_plugin.rs` |
| GIS（地理信息） | `svc/gis/src/gis_plugin.rs` |
| QMS（质量管理） | `svc/qms/src/qms_plugin.rs` |
| LIMS（实验室管理） | `svc/lims/src/lims_plugin.rs` |
| EHS（环境健康安全） | `svc/ehs/src/ehs_plugin.rs` |

#### 3.5.3 服务发现机制

`SmartServiceClient` 采用**双层回退策略**解析服务地址：

1. **优先**：通过 `ConsulDiscoveryClient` 查询 Consul 服务注册中心
2. **回退**：当 Consul 不可用或 `CONSUL_ENABLED=false` 时，从环境变量读取服务地址（由 `ServiceConfigRegistry` 提供）

这种设计保证了在开发环境（无 Consul）和生产环境（有 Consul）下均可正常运行。

#### 3.5.4 心跳超时检测

`svc/unified-core/src/main.rs` 在服务启动时 spawn 一个后台 Tokio 任务：

- **扫描间隔**：30 秒
- **超时阈值**：90 秒（可通过 `PLUGIN_HEARTBEAT_TIMEOUT` 环境变量配置）
- **超时处理**：将插件状态从 `active` 标记为 `inactive`，前端导航自动隐藏对应菜单

---

## 4. 前端架构

### 4.1 项目结构

```
apps/web/src/
├── api/                          # API客户端层
│   ├── client.ts                # Axios实例、拦截器
│   ├── iam/                     # IAM模块API
│   ├── erp/                     # ERP模块API
│   ├── hrm/                     # HRM模块API
│   ├── mes/                     # MES模块API
│   └── ...
│
├── components/                   # 可复用组件
│   ├── common/                  # 通用组件(DataTable, Dialog, FormFields等)
│   ├── layout/                  # 布局组件(AppHeader, AppSidebar等)
│   ├── charts/                  # 图表组件
│   ├── ui/                      # UI基础组件
│   └── ...
│
├── hooks/                        # 自定义Hooks
│   ├── useAuth.tsx              # 认证Hook
│   ├── useCrudQueries.ts        # CRUD查询Hook
│   ├── usePermission.ts         # 权限Hook
│   ├── useWebSocket.ts          # WebSocket Hook
│   ├── useResponsive.ts         # 响应式Hook
│   └── ...
│
├── pages/                        # 页面组件
│   ├── shared/                  # 公共页面(登录、仪表盘等)
│   ├── iam/                     # IAM模块页面
│   ├── erp/                     # ERP模块页面
│   ├── hrm/                     # HRM模块页面
│   └── ...
│
├── modules/                      # 模块配置
│   ├── registry/                # 模块注册中心
│   ├── iam/config.ts            # IAM模块配置
│   ├── erp/config.ts            # ERP模块配置
│   └── ...
│
├── store/                        # 状态管理 (Zustand)
│   ├── authStore.ts             # 认证状态
│   ├── uiStore.ts               # UI状态
│   ├── themeStore.ts            # 主题状态
│   └── ...
│
├── config/                       # 配置
│   ├── runtime.ts               # 运行时配置(服务URL等)
│   ├── permissions.ts           # 权限定义
│   └── service-ports.ts         # 端口配置
│
├── lib/                          # 工具库
│   ├── utils.ts                 # 通用工具函数
│   ├── apiClient.ts             # API客户端工具
│   ├── security.ts              # 安全工具
│   └── navigation/              # 导航模块
│
├── routes/                       # 路由配置
│   ├── index.ts                 # 路由入口
│   ├── auth.ts                  # 认证路由
│   ├── dashboard.ts             # 仪表盘路由
│   └── v2/                      # 动态路由
│
└── App.tsx                       # 根组件
```

### 4.2 应用入口流程

```
main.tsx
  ↓
App.tsx (Provider层级)
  ├── ErrorBoundary
  ├── ThemeProvider
  ├── NotificationProvider
  ├── LoadingProvider
  ├── AuthProvider
  └── PluginProvider
      └── AppContent
          └── BrowserRouter
              ├── 认证路由 (GuestRoute)
              ├── 仪表盘路由
              ├── 公共路由
              └── 动态路由 (DynamicRoutes)
```

### 4.3 核心架构模式

#### 4.3.1 动态路由加载

前端采用**按需加载**的动态路由机制：

1. 访问模块时才加载对应模块的路由配置
2. 使用路由缓存避免重复加载
3. 基于路径自动检测模块

核心实现：[App.tsx](file:///Users/air/TOPEMS/apps/web/src/App.tsx#L91-L185) 中的 `DynamicRoutes` 组件

#### 4.3.2 API客户端架构

```
API调用 → useCrudQueries Hook
              ↓
         API模块函数 (api/erp/*.ts)
              ↓
         client.ts (Axios实例)
              ↓
    ┌───────────────────┐
    │  请求拦截器        │
    │  - CSRF Token     │
    │  - Trace Context  │
    │  - 自动重试       │
    └───────────────────┘
              ↓
         Vite Proxy (开发) / Nginx (生产)
              ↓
         后端服务
```

核心文件：
- [client.ts](file:///Users/air/TOPEMS/apps/web/src/api/client.ts) - Axios实例与拦截器
- [useCrudQueries.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/useCrudQueries.ts) - React Query封装

#### 4.3.3 权限控制模型

前端采用**三级权限控制**：

1. **路由级**: `ProtectedRoute` 组件验证登录状态
2. **模块级**: `ModuleGate` 组件验证模块访问权限
3. **操作级**: `usePermission` Hook / `PermissionGate` 组件

权限数据流：
```
JWT Token → 解析权限列表 → authStore → usePermission → UI渲染
```

### 4.4 状态管理

使用 **Zustand** 进行状态管理，按领域拆分Store：

| Store | 文件 | 管理状态 |
|-------|------|---------|
| authStore | [store/authStore.ts](file:///Users/air/TOPEMS/apps/web/src/store/authStore.ts) | 用户信息、Token、权限 |
| uiStore | [store/uiStore.ts](file:///Users/air/TOPEMS/apps/web/src/store/uiStore.ts) | 侧边栏、对话框、加载状态 |
| themeStore | [store/themeStore.ts](file:///Users/air/TOPEMS/apps/web/src/store/themeStore.ts) | 主题、暗色模式 |
| notificationStore | [store/notificationStore.ts](file:///Users/air/TOPEMS/apps/web/src/store/notificationStore.ts) | 通知列表、未读数 |
| pluginStore | [store/pluginStore.ts](file:///Users/air/TOPEMS/apps/web/src/store/pluginStore.ts) | 插件列表、安装状态 |

### 4.5 核心Hooks

| Hook名称 | 文件 | 功能 |
|---------|------|------|
| useAuth | [hooks/useAuth.tsx](file:///Users/air/TOPEMS/apps/web/src/hooks/useAuth.tsx) | 认证状态、登录/登出 |
| usePermission | [hooks/usePermission.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/usePermission.ts) | 权限检查 |
| useCrudQueries | [hooks/useCrudQueries.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/useCrudQueries.ts) | CRUD操作封装 |
| useWebSocket | [hooks/useWebSocket.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/useWebSocket.ts) | WebSocket连接管理 |
| useResponsive | [hooks/useResponsive.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/useResponsive.ts) | 响应式断点 |
| useDataTable | [hooks/useDataTable.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/useDataTable.ts) | 数据表格状态 |
| useNotification | [hooks/useNotification.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/useNotification.ts) | 通知管理 |
| useOfflineQuery | [hooks/useOfflineQuery.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/useOfflineQuery.ts) | 离线查询 |
| useOfflineSync | [hooks/useOfflineSync.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/useOfflineSync.ts) | 离线同步 |

### 4.6 插件加载器 (V13.0)

**文件**: [apps/web/src/lib/plugin-loader/PluginManager.ts](file:///Users/air/TOPEMS/apps/web/src/lib/plugin-loader/PluginManager.ts)

V13.0 整改后，前端导航不再完全依赖静态配置，而是通过 `PluginManager` 的 `fetchNavigationConfig()` 方法**动态拉取后端导航配置**，并实现优雅降级。

#### 4.6.1 fetchNavigationConfig() 工作流程

```
PluginManager.fetchNavigationConfig()
    │
    ▼
请求 GET /api/core/plugin/navigation-config
    │
    ├── 成功 → 使用后端返回的导航配置（含已注册插件菜单）
    │
    └── 失败/超时 → 降级到前端静态导航配置（lib/navigation/）
```

#### 4.6.2 降级策略

| 优先级 | 来源 | 说明 |
|-------|------|------|
| 1（高） | 后端 `/api/core/plugin/navigation-config` | 反映 unified-core 中已注册且 `active` 的插件，与心跳状态联动 |
| 2（低） | 前端静态配置 `lib/navigation/` | 兜底方案，保证后端不可用时前端仍可基本导航 |

这种设计使得：
- 插件注册后无需重新部署前端即可在导航中出现
- 插件心跳超时被标记为 `inactive` 后，导航菜单自动隐藏
- 后端短暂不可用时前端仍可用静态配置提供基础体验

---

## 5. 数据库设计

### 5.1 数据库架构

- **主数据库**: PostgreSQL 16+
- **架构模式**: Schema隔离（每个模块独立Schema）
- **多租户**: 通过 `tenant_id` 字段实现行级隔离
- **扩展**: uuid-ossp (UUID生成)

### 5.2 Schema规划

| Schema名称 | 所属模块 | 说明 |
|-----------|---------|------|
| public | - | 公共Schema，扩展安装位置 |
| unified_core | 核心服务 | 统一核心服务表 |
| plugin_erp | ERP | 企业资源计划 |
| plugin_hrm | HRM | 人力资源管理 |
| plugin_crm | CRM | 客户关系管理 |
| plugin_pm | PM | 项目管理 |
| plugin_mes | MES | 制造执行系统 |
| plugin_pdm | PDM | 产品数据管理 |
| plugin_qms | QMS | 质量管理系统 |
| plugin_lims | LIMS | 实验室管理 |
| plugin_ehs | EHS | 环境健康安全 |
| plugin_scm | SCM | 供应链管理 |
| plugin_wms | WMS | 仓储管理 |
| plugin_srm | SRM | 供应商管理 |
| plugin_bi | BI | 商业智能 |
| plugin_ai | AI | 人工智能 |
| plugin_gis | GIS | 地理信息系统 |
| plugin_im | IM | 即时通讯 |
| plugin_mobile | Mobile | 移动端 |
| plugin_portal | Portal | 企业门户 |

Schema定义文件：[schema.rs](file:///Users/air/TOPEMS/lib/src/schema.rs)

### 5.3 核心表结构

#### 5.3.1 用户与权限表 (unified_core Schema)

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| users | 用户表 | id, username, email, password_hash, is_active, tenant_id |
| roles | 角色表 | id, name, code, description, tenant_id |
| permissions | 权限表 | id, name, code, module, action, tenant_id |
| user_roles | 用户角色关联 | user_id, role_id |
| role_permissions | 角色权限关联 | role_id, permission_id |
| departments | 部门表 | id, name, parent_id, tenant_id |
| audit_logs | 审计日志 | id, user_id, action, resource, ip_address, created_at |

#### 5.3.2 业务表通用字段

所有业务表都包含以下通用字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键，默认uuid_generate_v4() |
| tenant_id | UUID | 租户ID，用于多租户隔离 |
| created_at | TIMESTAMP | 创建时间，默认CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | 更新时间，默认CURRENT_TIMESTAMP |
| created_by | VARCHAR | 创建人 |

### 5.4 索引策略

- **主键索引**: 所有表主键自动索引
- **外键索引**: 关联字段建立索引
- **租户索引**: 所有业务表在 `tenant_id` 上建立索引
- **常用查询索引**: 针对高频查询建立组合索引
- **时间范围索引**: 时间字段加索引用于范围查询

### 5.5 数据库初始化

初始化脚本位置：[database/postgres/init.sql](file:///Users/air/TOPEMS/database/postgres/init.sql)

主要初始化内容：
1. 启用 `uuid-ossp` 扩展
2. 创建核心业务表
3. 创建必要的索引
4. 插入初始数据

---

## 6. 核心模块详解

### 6.1 统一核心服务 (Unified Core)

**端口**: 8000 | **路径**: [svc/unified-core/](file:///Users/air/TOPEMS/svc/unified-core/)

统一核心服务是平台的核心，承载所有基础能力：

| 子模块 | 目录 | 功能描述 |
|--------|------|---------|
| IAM | modules/iam/ | 身份认证、用户管理、角色权限 |
| 工作流 | modules/flow/ | 流程设计、审批流、任务管理 |
| 文件管理 | modules/file/ | 文件上传下载、文件夹管理 |
| 通讯服务 | modules/communication/ | 通知、邮件、即时通讯 |
| 租户管理 | modules/tenant/ | 多租户管理、计费、配额 |
| 插件管理 | modules/plugin/ | 插件市场、安装卸载、版本管理 |
| 数据字典 | modules/dict/ | 系统字典数据管理 |
| 迁移服务 | modules/migration/ | 数据迁移、版本升级 |
| 搜索服务 | modules/search/ | 全文搜索、聚合搜索 |

### 6.2 IAM 身份认证模块

**路径前缀**: `/api/core/iam`

#### 核心功能

1. **用户认证**
   - 用户名/密码登录
   - JWT Token生成与刷新
   - 登出与Token失效

2. **用户管理**
   - 用户CRUD
   - 用户状态管理
   - 密码重置

3. **角色管理**
   - 角色CRUD
   - 角色权限分配
   - 默认角色（admin, manager, user, guest）

4. **权限管理**
   - 权限定义
   - 按模块分类
   - 权限继承

#### 核心数据模型

```rust
// lib/src/auth.rs
pub struct Claims {
    pub sub: String,           // 用户ID
    pub username: String,      // 用户名
    pub role: String,          // 主角色
    pub roles: Vec<String>,    // 角色列表
    pub permissions: Vec<String>, // 权限列表
    pub is_superuser: bool,    // 是否超级用户
    pub exp: usize,            // 过期时间
    pub iat: usize,            // 签发时间
    pub tenant_id: Option<String>, // 租户ID
}
```

### 6.3 ERP 企业资源计划

**端口**: 8010 | **路径**: [svc/erp/](file:///Users/air/TOPEMS/svc/erp/)

**路径前缀**: `/api/erp`

#### 子模块

| 子模块 | 功能 |
|--------|------|
| 生产订单 | 生产计划、工单管理、进度跟踪 |
| 销售订单 | 销售合同、订单处理、发货管理 |
| 采购管理 | 采购申请、采购订单、供应商管理 |
| 物料管理 | 物料档案、BOM、库存管理 |
| 财务管理 | 会计科目、凭证管理、预算管理 |
| 资产管理 | 固定资产、折旧计算、资产盘点 |
| 基础行政 | 办公用品、会议室、车辆管理 |

### 6.4 MES 制造执行系统

**端口**: 8030 | **路径**: [svc/mes/](file:///Users/air/TOPEMS/svc/mes/)

**路径前缀**: `/api/mes`

#### 子模块

| 子模块 | 功能 |
|--------|------|
| 生产工单 | 工单创建、下发、执行 |
| 工艺路线 | 工序定义、工艺路线 |
| 在制品跟踪 | WIP跟踪、工序报工 |
| 质量管理 | 质检记录、不合格品处理 |
| 设备管理 | 设备档案、OEE计算 |
| 生产看板 | 实时看板、进度监控 |

### 6.5 WMS 仓储管理系统

**端口**: 8041 | **路径**: [svc/wms/](file:///Users/air/TOPEMS/svc/wms/)

**路径前缀**: `/api/wms`

#### 子模块

| 子模块 | 功能 |
|--------|------|
| 入库管理 | 采购入库、生产入库、其他入库 |
| 出库管理 | 销售出库、生产领料、其他出库 |
| 库存管理 | 库存查询、库存盘点、库存调拨 |
| 库位管理 | 仓库定义、库区、库位管理 |
| 批次管理 | 批次追踪、序列号管理 |
| 补货管理 | 库存预警、自动补货 |

### 6.6 QMS 质量管理系统

**端口**: 8050 | **路径**: [svc/qms/](file:///Users/air/TOPEMS/svc/qms/)

**路径前缀**: `/api/qms`

#### 子模块

| 子模块 | 功能 |
|--------|------|
| 检验管理 | 来料检验、过程检验、成品检验 |
| SPC统计 | 控制图、过程能力分析 |
| 不合格品 | 不良品处理、8D报告 |
| FMEA | 失效模式与影响分析 |
| APQP | 产品质量先期策划 |
| 质量成本 | 预防成本、鉴定成本、失败成本 |

### 6.7 AI 服务

**端口**: 8064 | **路径**: [svc/ai/](file:///Users/air/TOPEMS/svc/ai/)

**路径前缀**: `/api/ai`

#### 核心能力

| 功能 | 技术实现 | 说明 |
|------|---------|------|
| 智能问答 | Ollama + RAG | 基于知识库的问答 |
| 文档摘要 | Ollama | 自动生成文档摘要 |
| 向量搜索 | Redis + pgvector | 语义相似度搜索 |
| 代码助手 | Ollama | 代码生成与解释 |
| 智能推荐 | 协同过滤 | 个性化推荐 |

---

## 7. 关键类与函数

### 7.1 后端核心 (Rust)

#### 7.1.1 认证模块

**文件**: [lib/src/auth.rs](file:///Users/air/TOPEMS/lib/src/auth.rs)

| 函数/结构体 | 签名 | 说明 |
|------------|------|------|
| `auth_middleware` | `async fn auth_middleware(State, Request, Next) -> Result<Response>` | 认证中间件，验证JWT Token |
| `verify_jwt_token` | `fn verify_jwt_token(token: &str, secret: &str) -> Result<Claims>` | 验证JWT并返回Claims |
| `generate_jwt_token` | `fn generate_jwt_token(user_id: &str, secret: &str, expire_minutes: i64) -> String` | 生成JWT Token |
| `Claims` | `struct { sub, username, roles, permissions, tenant_id, ... }` | JWT载荷结构体 |
| `AuthState` | `struct { jwt_secret, refresh_secret, token_expiry_hours }` | 认证状态配置 |

#### 7.1.2 数据库模块

**文件**: [lib/src/database.rs](file:///Users/air/TOPEMS/lib/src/database.rs)

| 函数 | 签名 | 说明 |
|------|------|------|
| `create_database_pool` | `async fn create_database_pool(config: &DatabaseConfig) -> Result<PgPool>` | 创建数据库连接池 |
| `test_database_connection` | `async fn test_database_connection(pool: &PgPool) -> Result<()>` | 测试数据库连接 |

#### 7.1.3 响应模块

**文件**: [lib/src/response.rs](file:///Users/air/TOPEMS/lib/src/response.rs)

| 结构体/函数 | 说明 |
|------------|------|
| `ApiResponse<T>` | 统一API响应格式 { code, success, message, data } |
| `PaginatedResponse<T>` | 分页响应 { items, total, page, page_size } |
| `api_success(data, msg)` | 成功响应构建函数 |
| `api_error(code, msg)` | 错误响应构建函数 |

#### 7.1.4 RLS 行级安全

**文件**: [lib/src/rls.rs](file:///Users/air/TOPEMS/lib/src/rls.rs)

| 函数 | 说明 |
|------|------|
| `rls_middleware` | 行级安全中间件，注入租户上下文 |
| 功能 | 基于tenant_id自动过滤查询结果 |

#### 7.1.5 插件架构 (V13.0)

**文件**: [svc/unified-core/src/modules/plugin/handlers/runtime.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/plugin/handlers/runtime.rs)

| 函数 | 签名 | 说明 |
|------|------|------|
| `verify_registration_token` | `fn verify_registration_token(header: &HeaderMap, expected: &str) -> Result<()>` | 插件注册令牌验证，校验 `X-Plugin-Token` 头是否与 `PLUGIN_REGISTRATION_TOKEN` 一致；开发模式下（令牌为空）跳过校验 |
| `register_plugin` | `async fn register_plugin(State, Json<RegisterPluginRequest>) -> Result<ApiResponse>` | 插件注册入口：执行令牌验证 → 存储 `dependencies` → 存储 `navigation_config` → 写入插件记录并置为 `active` |
| `get_navigation_config` | `async fn get_navigation_config(State) -> Result<ApiResponse<NavigationConfig>>` | 导航配置 API，返回当前租户下所有 `active` 插件的导航菜单聚合结果，供前端 `fetchNavigationConfig()` 调用 |
| `heartbeat` | `async fn heartbeat(State, Path<plugin_id>) -> Result<ApiResponse>` | 接收插件心跳，更新 `last_heartbeat_at` 时间戳 |

**文件**: [svc/unified-core/src/modules/plugin/handlers/tenant_plugins.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/plugin/handlers/tenant_plugins.rs)

| 函数 | 签名 | 说明 |
|------|------|------|
| `install_plugin` | `async fn install_plugin(State, Path<plugin_id>) -> Result<ApiResponse>` | 插件安装：执行**正向依赖检查**，确认该插件声明的所有 `dependencies` 已安装；任一缺失则拒绝安装并返回缺失列表 |
| `uninstall_plugin` | `async fn uninstall_plugin(State, Path<plugin_id>) -> Result<ApiResponse>` | 插件卸载：执行**反向依赖检查**，确认没有其他已安装插件依赖当前插件；存在依赖则拒绝卸载并返回被依赖列表 |

**文件**: [svc/unified-core/src/modules/plugin/models.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/plugin/models.rs)

| 结构体 | 关键字段 | 说明 |
|--------|---------|------|
| `RegisterPluginRequest` | `name`, `version`, `category`, `dependencies: Vec<String>`, `navigation_config: Value`, `endpoint` | 插件注册请求体；`dependencies` 用于正向/反向依赖检查，`navigation_config` 由后端存储并下发前端 |

#### 7.1.6 服务发现与配置 (V13.0)

**文件**: [lib/src/service_discovery.rs](file:///Users/air/TOPEMS/lib/src/service_discovery.rs)

| 结构体/函数 | 说明 |
|------------|------|
| `ConsulServiceRegistrar` | Consul 服务注册器，服务启动时将自身地址、端口、健康检查路径注册到 Consul |
| `ConsulDiscoveryClient` | Consul 服务发现客户端，从 Consul 查询指定服务名的可用实例列表 |
| `SmartServiceClient` | 智能服务客户端：**优先**走 Consul 发现，**失败回退**到 `ServiceConfigRegistry` 提供的环境变量地址；对外暴露统一的 `resolve(service_name)` 接口 |

**文件**: [lib/src/service_config.rs](file:///Users/air/TOPEMS/lib/src/service_config.rs)

| 结构体/函数 | 说明 |
|------------|------|
| `ServiceConfigRegistry` | 集中化配置单例（`once_cell::sync::Lazy`），从环境变量加载所有服务地址；提供 `get_service_url(name)` 查询接口；作为 `SmartServiceClient` 的回退数据源 |

### 7.2 前端核心 (TypeScript)

#### 7.2.1 API客户端

**文件**: [apps/web/src/api/client.ts](file:///Users/air/TOPEMS/apps/web/src/api/client.ts)

| 类型/函数 | 说明 |
|----------|------|
| `ApiResponse<T>` | 统一API响应类型 |
| `PaginatedResponse<T>` | 分页响应类型 |
| `PaginationParams` | 分页参数 { page, pageSize, search } |
| `calculateRetryDelay` | 指数退避重试延迟计算 |
| `shouldRetry` | 判断是否应该重试请求 |

#### 7.2.2 认证Hook

**文件**: [apps/web/src/hooks/useAuth.tsx](file:///Users/air/TOPEMS/apps/web/src/hooks/useAuth.tsx)

| Hook/函数 | 返回值 | 说明 |
|-----------|--------|------|
| `useAuth()` | `{ user, token, isAuthenticated, login, logout, ... }` | 认证状态与操作 |
| `AuthProvider` | Component | 认证上下文Provider |

#### 7.2.3 CRUD查询Hook

**文件**: [apps/web/src/hooks/useCrudQueries.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/useCrudQueries.ts)

| Hook | 返回值 | 说明 |
|------|--------|------|
| `useCrudQueries(options)` | `{ list, get, create, update, remove, ... }` | 标准CRUD操作封装 |
| 特性 | - | 基于React Query，自动缓存、重试、乐观更新 |

#### 7.2.4 WebSocket Hook

**文件**: [apps/web/src/hooks/useWebSocket.ts](file:///Users/air/TOPEMS/apps/web/src/hooks/useWebSocket.ts)

| Hook | 返回值 | 说明 |
|------|--------|------|
| `useWebSocket(url, options)` | `{ send, lastMessage, readyState, ... }` | WebSocket连接管理 |
| 特性 | - | 自动重连、心跳检测、消息队列 |

### 7.3 配置管理

#### 7.3.1 前端运行时配置

**文件**: [apps/web/src/config/runtime.ts](file:///Users/air/TOPEMS/apps/web/src/config/runtime.ts)

```typescript
interface RuntimeConfig {
  api: { baseUrl: string; timeout: number };
  ws: { reconnectInterval: number; maxReconnectAttempts: number };
  services: Record<string, string>;  // 各服务URL
  features: Record<string, boolean>; // 功能开关
  theme: { default: 'light' | 'dark'; enableDarkMode: boolean };
  i18n: { defaultLocale: string; supportedLocales: string[] };
  security: { csrfTokenUrl: string; sessionTimeout: number };
}
```

---

## 8. 依赖关系

### 8.1 后端依赖 (Cargo Workspace)

**Workspace配置**: [Cargo.toml](file:///Users/air/TOPEMS/Cargo.toml)

#### 核心依赖

| 依赖包 | 版本 | 用途 |
|--------|------|------|
| axum | ^0.8 | Web框架 |
| tokio | 1 | 异步运行时 |
| sqlx | ^0.8.6 | 数据库ORM |
| serde | 1 | 序列化/反序列化 |
| jsonwebtoken | 9.0 | JWT认证 |
| bcrypt | 0.15 | 密码哈希 |
| redis | - | Redis客户端 |
| prometheus | 0.13 | 指标收集 |
| tracing | 0.1 | 日志追踪 |
| utoipa | 4 | OpenAPI文档生成 |

#### 服务间依赖关系

```
unified-core (核心)
    ↑
    ├── erp, hrm, crm, pm (业务基础)
    │       ↑
    │       ├── mes, pdm, qms, lims, ehs (制造质量)
    │       │
    │       ├── scm, wms, srm (供应链仓储)
    │       │
    │       └── bi, report, monitor (分析监控)
    │
    ├── ai, gis, integration (扩展服务)
    │
    └── mobile, portal (接入服务)
```

所有服务都依赖于 `lib/` (topems_shared) 共享库。

#### 8.1.1 V13.0 插件架构相关依赖

| 文件 | 依赖 | 说明 |
|------|------|------|
| [lib/src/service_discovery.rs](file:///Users/air/TOPEMS/lib/src/service_discovery.rs) | `consul`（可选） | Consul 客户端依赖；通过 cargo feature flag 控制，未启用时仅保留环境变量回退路径，编译不会失败 |
| [lib/src/service_config.rs](file:///Users/air/TOPEMS/lib/src/service_config.rs) | `once_cell`、`tokio` | 提供 `ServiceConfigRegistry` 集中化配置单例，从环境变量加载所有服务地址 |
| [svc/unified-core/src/modules/plugin/](file:///Users/air/TOPEMS/svc/unified-core/src/modules/plugin/) | `topems_shared`、`sqlx`、`axum` | 插件注册/心跳/依赖检查/导航配置 API 的实现 |
| 7 个业务服务的 `*_plugin.rs` | `reqwest`、`topems_shared` | 启动时通过 HTTP 向 unified-core 注册，携带 `X-Plugin-Token` 头 |

> **注意**：Consul 为**可选依赖**，开发环境可通过 `CONSUL_ENABLED=false` 完全跳过，所有服务地址解析回退到 `ServiceConfigRegistry` 提供的环境变量。

### 8.2 前端依赖

**Root package.json**: [package.json](file:///Users/air/TOPEMS/package.json)

#### 核心依赖

| 依赖包 | 版本 | 用途 |
|--------|------|------|
| react | ^19.2.7 | UI框架 |
| react-dom | ^19.2.7 | DOM渲染 |
| react-router-dom | - | 路由管理 |
| @mui/material | ^9.1.1 | UI组件库 |
| @tanstack/react-query | - | 数据获取与缓存 |
| zustand | - | 状态管理 |
| axios | - | HTTP客户端 |
| dayjs | ^1.11.21 | 日期处理 |
| i18next | - | 国际化 |
| react-leaflet | ^5.0.0 | 地图组件 |

#### 模块依赖关系

```
App.tsx (根组件)
├── components/common/ (通用组件)
│   ├── DataTable
│   ├── Dialog
│   └── FormFields
│
├── hooks/ (自定义Hooks)
│   ├── useAuth
│   ├── usePermission
│   └── useCrudQueries
│
├── store/ (状态管理)
│   ├── authStore
│   └── uiStore
│
└── modules/ (业务模块)
    ├── iam
    ├── erp
    ├── hrm
    └── ...
```

### 8.3 外部系统依赖

| 系统 | 版本要求 | 用途 | 必选 |
|------|---------|------|------|
| PostgreSQL | 16+ | 主数据库 | ✅ |
| Redis | 7+ | 缓存、会话、消息 | 可选 |
| RabbitMQ | 3.x | 消息队列、事件总线 | 可选 |
| Ollama | 最新 | AI模型服务 | 可选 |
| Consul | 最新 | 服务发现 | 可选 |

---

## 9. 部署与运行

### 9.1 环境要求

#### 开发环境

| 组件 | 版本要求 |
|------|---------|
| Node.js | 20+ |
| pnpm | 8+ |
| Rust | 1.75+ |
| PostgreSQL | 16+ |
| Redis | 7+ (可选) |

#### 生产环境

| 组件 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 4核 | 8核+ |
| 内存 | 8GB | 16GB+ |
| 磁盘 | 100GB SSD | 500GB+ SSD |
| 操作系统 | Linux (Ubuntu 22.04+) | Linux (Ubuntu 22.04+) |

### 9.2 本地开发启动

#### 9.2.1 一键启动

```bash
# 克隆项目
git clone <repository-url>
cd TOPEMS

# 安装依赖
pnpm install
cargo build --workspace

# 启动数据库 (macOS)
brew services start postgresql@16
brew services start redis
createdb topems

# 一键启动所有服务
./scripts/start-local.sh
```

访问地址：
- **前端**: http://localhost:3000
- **后端API**: http://localhost:8000
- **默认账号**: admin / admin123

#### 9.2.2 分别启动

**前端开发：**
```bash
cd apps/web
pnpm run dev
```

**后端服务：**
```bash
# 启动统一核心服务
cd svc/unified-core
cargo run

# 启动ERP服务
cd svc/erp
cargo run
```

**使用管理脚本：**
```bash
# 查看所有服务状态
./scripts/topems.sh status

# 启动指定服务
./scripts/topems.sh start erp

# 查看服务日志
./scripts/topems.sh logs erp 100
```

### 9.3 Docker 部署

#### docker-compose.yml

**文件**: [docker/docker-compose.yml](file:///Users/air/TOPEMS/docker/docker-compose.yml)

包含服务：
- PostgreSQL (数据库)
- Redis (缓存)
- RabbitMQ (消息队列)
- Consul (服务发现)
- Prometheus + Grafana + Alertmanager (监控告警)
- Jaeger (链路追踪)

#### 启动基础设施

```bash
cd docker
docker compose up -d postgres redis
```

### 9.4 Kubernetes 部署

**配置目录**: [k8s/](file:///Users/air/TOPEMS/k8s/)

#### 架构

```
k8s/
├── base/                    # 基础配置
│   ├── namespace.yaml       # 命名空间
│   ├── configmap.yaml       # 配置映射
│   ├── postgres.yaml        # 数据库
│   ├── redis.yaml           # 缓存
│   ├── rabbitmq.yaml        # 消息队列
│   ├── ingress.yaml         # 入口网关
│   ├── monitoring.yaml      # 监控
│   └── consul.yaml          # 服务发现
│
└── services/                # 业务服务
    ├── erp.yaml
    ├── hrm.yaml
    ├── mes.yaml
    └── ...
```

#### Ingress 路由规则

**文件**: [k8s/base/ingress.yaml](file:///Users/air/TOPEMS/k8s/base/ingress.yaml)

| 路径 | 后端服务 | 端口 |
|------|---------|------|
| `/api/core/*` | unified-core-service | 8000 |
| `/api/erp/*` | erp-service | 8010 |
| `/api/hrm/*` | hrm-service | 8020 |
| `/api/mes/*` | mes-service | 8030 |
| `/api/wms/*` | wms-service | 8041 |
| ... | ... | ... |

### 9.5 端口配置

#### 服务端口清单

| 服务名 | 端口 | 说明 |
|-------|------|------|
| unified-core | 8000 | 统一核心服务 |
| erp | 8010 | 企业资源计划 |
| finance | 8011 | 财务管理 |
| doc | 8012 | 文档管理 |
| hrm | 8020 | 人力资源 |
| pm | 8023 | 项目管理 |
| crm | 8029 | 客户关系 |
| mes | 8030 | 制造执行 |
| pdm | 8031 | 产品数据 |
| scm | 8040 | 供应链 |
| wms | 8041 | 仓储管理 |
| srm | 8042 | 供应商关系 |
| qms | 8050 | 质量管理 |
| lims | 8051 | 实验室管理 |
| ehs | 8052 | 环境健康安全 |
| rd | 8053 | 研发管理 |
| bi | 8060 | 商业智能 |
| monitor | 8062 | 监控服务 |
| portal | 8063 | 企业门户 |
| ai | 8013 AI服务 |
| mobile | 8070 | 移动端 |
| gis | 8071 | 地理信息 |
| integration | 8072 | 系统集成 |
| web (前端) | 3000 | Web应用 |

### 9.6 环境变量配置

#### 核心环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | 数据库连接URL | postgres://topems:topems_secret@localhost:5432/topems |
| `REDIS_URL` | Redis连接URL | redis://localhost:6379 |
| `JWT_SECRET` | JWT访问令牌密钥 | - (必须配置) |
| `JWT_REFRESH_SECRET` | JWT刷新令牌密钥 | - (必须配置) |
| `CORS_ORIGINS` | 允许的跨域源 | http://localhost:3000 |

#### 生成安全密钥

```bash
openssl rand -base64 32
```

### 9.7 插件架构环境变量 (V13.0)

V13.0 插件化架构整改新增以下环境变量，统一在 `unified-core` 与各业务服务中生效：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PLUGIN_REGISTRATION_TOKEN` | 插件注册安全令牌；业务服务注册时通过 `X-Plugin-Token` 头携带，unified-core 校验一致性 | 空（开发模式跳过校验） |
| `CONSUL_ENABLED` | 是否启用 Consul 服务发现；`false` 时 `SmartServiceClient` 直接走环境变量回退 | `false` |
| `CONSUL_URL` | Consul 服务注册中心地址 | `http://localhost:8500` |
| `PLUGIN_HEARTBEAT_TIMEOUT` | 插件心跳超时秒数；超过该值未收到心跳则标记为 `inactive` | `90` |

#### 配置示例

```bash
# .env (生产环境)
PLUGIN_REGISTRATION_TOKEN=$(openssl rand -base64 32)
CONSUL_ENABLED=true
CONSUL_URL=http://consul:8500
PLUGIN_HEARTBEAT_TIMEOUT=90
```

```bash
# .env (开发环境，零配置)
# PLUGIN_REGISTRATION_TOKEN 留空 → 跳过令牌校验
# CONSUL_ENABLED 默认 false → 使用环境变量服务地址
```

> **安全提示**：生产环境**必须**配置 `PLUGIN_REGISTRATION_TOKEN`，否则任意服务均可冒充插件注册到 unified-core，造成安全风险。

---

## 10. 开发指南

### 10.1 代码规范

#### 后端 (Rust)

- 使用 `cargo fmt` 格式化代码
- 使用 `cargo clippy` 进行代码检查
- 遵循 Rust 官方 API Guidelines
- 错误处理使用 `thiserror` + `anyhow`
- 异步函数使用 `async-trait`

#### 前端 (TypeScript)

- 使用 `pnpm run format` 格式化 (Prettier)
- 使用 `pnpm run lint` 代码检查 (ESLint)
- 遵循 React Hooks 规则
- 组件使用函数式组件 + TypeScript
- 状态管理优先使用 React Query，全局状态用 Zustand

### 10.2 开发工作流

#### 添加新的业务模块

**后端：**

1. 在 `svc/` 下创建新服务目录
2. 创建 `Cargo.toml`，添加依赖
3. 创建 `src/main.rs` 和 `src/lib.rs`
4. 按照标准模板实现：
   - 数据库模型 (models/)
   - API路由 (modules/)
   - 共享状态 (shared/)
5. 在根 `Cargo.toml` 的 workspace.members 中添加
6. 在 `scripts/services.conf` 中添加服务配置

**前端：**

1. 在 `apps/web/src/pages/` 下创建模块页面
2. 在 `apps/web/src/api/` 下创建API客户端
3. 在 `apps/web/src/modules/` 下创建模块配置
4. 在 `apps/web/src/modules/registry/` 中注册模块

### 10.3 API开发规范

#### 响应格式

所有API响应遵循统一格式：

```json
{
  "code": 200,
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

分页响应：

```json
{
  "code": 200,
  "success": true,
  "message": "查询成功",
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

#### HTTP状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 10.4 测试

#### 后端测试

```bash
# 运行所有测试
cargo test --workspace

# 运行指定服务测试
cargo test -p topems-erp
```

#### 前端测试

```bash
# 运行单元测试
pnpm run test

# 运行类型检查
pnpm run typecheck
```

### 10.5 常用命令速查

#### 后端

```bash
cargo build --workspace          # 编译所有服务
cargo run -p topems-erp          # 运行指定服务
cargo test --workspace           # 运行所有测试
cargo clippy --workspace         # 代码检查
cargo fmt --all                  # 格式化代码
```

#### 前端

```bash
pnpm install                     # 安装依赖
pnpm run dev                     # 启动开发服务器
pnpm run build                   # 构建生产版本
pnpm run lint                    # 代码检查
pnpm run test                    # 运行测试
pnpm run typecheck               # 类型检查
```

#### 服务管理

```bash
./scripts/topems.sh status       # 查看服务状态
./scripts/topems.sh start-all    # 启动所有服务
./scripts/topems.sh stop-all     # 停止所有服务
./scripts/topems.sh logs erp     # 查看服务日志
./scripts/topems.sh db migrate   # 数据库迁移
```

---

## 附录

### A. 参考文档

- [README.md](file:///Users/air/TOPEMS/README.md) - 项目README
- [TODO.md](file:///Users/air/TOPEMS/TODO.md) - 待办事项
- [docs/api/](file:///Users/air/TOPEMS/docs/api/) - API文档目录
- [docs/deployment-guide.md](file:///Users/air/TOPEMS/docs/deployment-guide.md) - 部署指南

### B. 相关文件索引

| 类别 | 文件路径 |
|------|---------|
| **后端核心** | [lib/src/lib.rs](file:///Users/air/TOPEMS/lib/src/lib.rs) |
| **认证模块** | [lib/src/auth.rs](file:///Users/air/TOPEMS/lib/src/auth.rs) |
| **数据库** | [lib/src/database.rs](file:///Users/air/TOPEMS/lib/src/database.rs) |
| **Schema定义** | [lib/src/schema.rs](file:///Users/air/TOPEMS/lib/src/schema.rs) |
| **响应格式** | [lib/src/response.rs](file:///Users/air/TOPEMS/lib/src/response.rs) |
| **前端入口** | [apps/web/src/App.tsx](file:///Users/air/TOPEMS/apps/web/src/App.tsx) |
| **API客户端** | [apps/web/src/api/client.ts](file:///Users/air/TOPEMS/apps/web/src/api/client.ts) |
| **运行时配置** | [apps/web/src/config/runtime.ts](file:///Users/air/TOPEMS/apps/web/src/config/runtime.ts) |
| **Vite配置** | [apps/web/vite.config.ts](file:///Users/air/TOPEMS/apps/web/vite.config.ts) |
| **管理脚本** | [scripts/topems.sh](file:///Users/air/TOPEMS/scripts/topems.sh) |
| **Docker配置** | [docker/docker-compose.yml](file:///Users/air/TOPEMS/docker/docker-compose.yml) |
| **K8s配置** | [k8s/base/ingress.yaml](file:///Users/air/TOPEMS/k8s/base/ingress.yaml) |
| **数据库初始化** | [database/postgres/init.sql](file:///Users/air/TOPEMS/database/postgres/init.sql) |
| **V13.0 插件运行时** | [svc/unified-core/src/modules/plugin/handlers/runtime.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/plugin/handlers/runtime.rs) |
| **V13.0 租户插件管理** | [svc/unified-core/src/modules/plugin/handlers/tenant_plugins.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/plugin/handlers/tenant_plugins.rs) |
| **V13.0 插件数据模型** | [svc/unified-core/src/modules/plugin/models.rs](file:///Users/air/TOPEMS/svc/unified-core/src/modules/plugin/models.rs) |
| **V13.0 心跳检测任务** | [svc/unified-core/src/main.rs](file:///Users/air/TOPEMS/svc/unified-core/src/main.rs) |
| **V13.0 服务发现** | [lib/src/service_discovery.rs](file:///Users/air/TOPEMS/lib/src/service_discovery.rs) |
| **V13.0 集中化配置** | [lib/src/service_config.rs](file:///Users/air/TOPEMS/lib/src/service_config.rs) |
| **V13.0 前端插件加载器** | [apps/web/src/lib/plugin-loader/PluginManager.ts](file:///Users/air/TOPEMS/apps/web/src/lib/plugin-loader/PluginManager.ts) |

---

*本文档由 Code Wiki 自动生成，最后更新于 2026-07-16*
