# TOPEMS Code Wiki

> **版本**: v6.0 / V60.0 | **最后更新**: 2026-07-24 | **文档版本**: v3.0 (V60.0 运维模式技术债清零；新增前端短板分析与整合实施方案)

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
11. [项目评估与优化方案](#11-项目评估与优化方案)
12. [附录](#附录)

---

## 1. 项目概述

### 1.1 项目简介

**TOPEMS** 是一个面向中大型企业的全栈数字化平台，采用 Rust 微服务后端 + React 19 前端的技术栈，覆盖身份认证、流程自动化、文档管理、AI 协作、生产制造、供应链、质量管控、研发管理、商业智能等 20+ 业务领域。平台通过统一的 `unified-core` 核心服务管理插件生命周期、租户隔离、权限体系与事件总线，各业务服务以独立进程或插件形式按需扩展。

### 1.2 核心特性

| 特性类别 | 具体特性 |
|---------|---------|
| **核心服务** | IAM、工作流(Flow)、文件(File)、通讯(Communication)、通知(Notification)、邮件(Mail)、即时通讯(IM)、主数据(Master)、插件(Plugin)、工单(Ticket) |
| **经营管理** | ERP、Finance、AI |
| **协同办公** | HRM、PM、CRM |
| **生产制造** | MES、PDM |
| **供应链** | SCM、WMS、SRM |
| **质量/研发** | QMS、LIMS、EHS、RD |
| **数据/基础设施** | BI(Analytics)、Portal、Mobile、GIS、Integration |
| **技术亮点** | Rust Axum 高性能后端、React 19 + TypeScript 前端、微服务/插件化架构、Module Federation 微前端、PWA、AI RAG |
| **安全特性** | JWT 认证、RBAC、行级安全(RLS)、多租户隔离、字段加密、CSRF 防护、审计日志 |
| **V13.0 插件化** | 安全令牌注册、Consul/环境变量服务发现、心跳超时检测、依赖检查、动态导航配置 |
| **V16.1 工单 SLA** | SLA 策略配置、响应/解决时限计算、多级升级机制、SLA 统计 API、前端 SLA 展示 |
| **V30.0-V60.0 架构深化** | MDM 主数据治理、Portal BFF GraphQL 聚合/联邦/订阅、Finance 领域模型/CQRS、微前端生产化/沙箱/AI 运维、知识图谱、领域驱动设计 |
| **V51.0 SLA 断点修复** | Portal BFF 代理补齐 SLA 路由、升级计算对齐工作时间 |
| **V60.0 运维模式** | 技术债清零（unwrap 清零、console.log 清理、routes.rs 拆分、多租户隔离 97.3%），全 crate 零警告 |
| **路由统一化** | 核心服务统一 `/api/core/{module}`，业务服务统一 `/api/{svc}`，Vite proxy 新路径无 rewrite 直通 |

### 1.3 技术栈

#### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^19.2.7 | UI 框架 |
| TypeScript | ^7.0.2 | 类型安全 |
| Vite | ^8.0.16 | 构建工具 / 开发服务器代理 |
| MUI (Material UI) | ^9.1.1 | UI 组件库 |
| TanStack React Query | ^5.0.0 | 服务端状态、缓存与重试 |
| Zustand | ^5.0.0 | 客户端全局状态 |
| React Router | ^7.0.0 | 路由管理 |
| Module Federation (Vite) | - | 微前端动态加载 |
| i18next | ^26.0.0 | 国际化 |
| dayjs | ^1.11.21 | 日期处理 |
| axios | ^1.0.0 | HTTP 客户端 |
| framer-motion | ^12.0.0 | 动画 |

#### 后端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Rust | 1.75+ | 编程语言 |
| Axum | ^0.8 | Web 框架 |
| SQLx | ^0.8.6 | 异步类型安全数据库访问 |
| Tokio | 1.x | 异步运行时 |
| PostgreSQL | 16+ | 主数据库 |
| Redis | 7+ | 缓存 / 会话 / 消息 / 向量索引 |
| RabbitMQ | 3.x | 事件总线消息代理 |
| jsonwebtoken | 9.0 | JWT 认证 |
| bcrypt | 0.15 | 密码哈希 |
| Prometheus / axum-prometheus | 0.13 / 0.8 | 指标监控 |
| OpenTelemetry / Jaeger | - | 链路追踪 |
| Consul | - | 服务发现(可选) |
| utoipa | 4 | OpenAPI 文档生成 |

---

## 2. 整体架构

### 2.1 架构分层

```
┌─────────────────────────────────────────────────────────────────┐
│                        客户端层 (Client Layer)                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  Web    │  │ Mobile  │  │ Desktop │  │  第三方  │            │
│  │ (3000)  │  │ (React  │  │ (Tauri) │  │  系统   │            │
│  │         │  │ Native) │  │         │  │         │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP/HTTPS / WebSocket
┌───────────────────────────────▼─────────────────────────────────┐
│                     API 网关层 (API Gateway)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Nginx Ingress / Vite Dev Proxy                          │   │
│  │  - /api/core/*  → unified-core:8000                      │   │
│  │  - /api/{svc}/* → 各业务服务                             │   │
│  │  - /ws/*        → unified-core 或业务服务                │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    核心服务层 (Core Services)                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ unified-core (8000)                                     │    │
│  │ IAM · Flow · File · Communication · Notification · Mail │    │
│  │ IM · Tenant · Plugin · Master · Ticket · Search · Dict  │    │
│  └─────────────────────────────────────────────────────────┘    │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                         │
│  │ AI      │  │ GIS     │  │Integration│ 独立扩展服务           │
│  │ (8013)  │  │ (8071)  │  │ (8072)   │                         │
│  └─────────┘  └─────────┘  └─────────┘                         │
└───────────────────────────────┬─────────────────────────────────┘
                                │ REST / gRPC / EventBus
┌───────────────────────────────▼─────────────────────────────────┐
│                   业务服务层 (Business Services)                  │
│  ERP(8010) Finance(8011) HRM(8020) PM(8023) CRM(8029)           │
│  MES(8030) PDM(8031) SCM(8040) WMS(8041) SRM(8042)              │
│  QMS(8050) LIMS(8051) EHS(8052) RD(8053)                        │
│  BI/Analytics(8060) Portal(8063) Mobile(8070)                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                    数据层 (Data Layer)                           │
│  PostgreSQL(5432) · Redis(6379) · RabbitMQ · Ollama(11434)     │
│  Schema 隔离 · tenant_id 行级安全 · pgvector · 事件流            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 架构风格

- **微服务架构**: 20+ 独立 Rust 服务，按业务域分组，独立编译、部署与扩展。
- **插件化架构**: 业务服务通过 `plugin.yaml` + 启动注册进入 unified-core 的插件生命周期管理，支持安全令牌、依赖检查、心跳监控与动态导航。
- **统一核心平台 (unified-core)**: 承载 IAM、Flow、File、Communication 等不可卸载的核心能力，以及插件注册中心。
- **共享库模式**: `lib/topems_shared` 提供认证、数据库、缓存、响应、事件、服务发现等通用能力，所有服务共享。
- **多租户隔离**: 通过 `tenant_id` 字段与 RLS 中间件实现行级安全；各业务模块使用独立 PostgreSQL Schema。
- **事件驱动**: 基于 Redis Pub/Sub 与 RabbitMQ 的事件总线，支持 `MasterDataEvent` 跨服务同步。
- **微前端 (Module Federation)**: `apps/web` 作为 Host，业务域作为可选 Remote，支持 static / module-federation / hybrid 三种部署模式。

### 2.3 API 路径规范

当前项目采用**双轨制**向统一路径迁移：新代码使用新路径，旧路径通过 `register_routes_with_legacy_alias` 保留兼容。

| 服务组 | 主路径格式 | 示例 | 说明 |
|--------|-----------|------|------|
| 核心虚拟服务 | `/api/core/{module}/{resource}` | `GET /api/core/iam/users` | unified-core 内部模块共用 8000 端口 |
| 业务服务 | `/api/{svc}/{resource}` | `GET /api/erp/orders` | 独立服务进程 |
| 核心服务 v1 别名 | `/api/core/{svc}/v1/{resource}` | `GET /api/core/ai/v1/qa` | 部分独立核心扩展服务使用（过渡） |
| 废弃别名 | `/api/v1/core/{svc}`、 `/api/analytics/*`、 `/api/report/*` | - | 保留兼容，新代码禁止使用 |

> **硬约束** (来自 project_memory):
> - 核心服务内部模块必须使用 `模式 C`: `/api/core/{module}/{resource}`。
> - 业务服务挂载路径必须为 `/api/{svc}/{resource}`，模块内部路由使用裸路径，禁止硬编码 `/api/{svc}` 前缀，避免 `.nest()` 导致双前缀。
> - 新路径的 Vite proxy 使用 `createNewApiProxyConfig`，无 rewrite 直通后端；旧代理（如 `/core/api`、`/comm/api`）仍保留 rewrite 兼容。
> - BI 服务主路径为 `/api/bi/*`，`/api/analytics/` 与 `/api/report/` 为废弃别名。
> - 工单模块挂载在 `master` 模块下：`/api/core/master/tickets`、`/api/core/master/sla-policies`。

### 2.4 WebSocket 路径规范

| 模块 | WebSocket 路径 | 说明 |
|------|---------------|------|
| 核心通知 | `/ws/core/notifications` | 实时通知推送 |
| 核心 IM | `/ws/core/im` | 即时通讯 |
| MES 看板 | `/ws/mes/dashboard` | 生产看板实时数据 |
| GIS | `/ws/gis` | 地理信息实时数据 |
| BI 看板 | `/ws/bi/dashboard/{id}` | BI 看板实时更新 |

---

## 3. 后端架构

### 3.1 项目结构

```
TOPEMS/
├── lib/                          # 共享库 (topems_shared)
│   ├── src/
│   │   ├── auth.rs              # JWT 认证中间件
│   │   ├── database.rs          # 数据库连接池
│   │   ├── cache.rs             # 多级缓存
│   │   ├── response.rs          # 统一响应格式
│   │   ├── schema.rs            # Schema 命名空间
│   │   ├── rls.rs               # 行级安全中间件
│   │   ├── tenant.rs            # 多租户上下文
│   │   ├── permission.rs        # 模块/资源权限
│   │   ├── middleware.rs        # tenant_middleware 等
│   │   ├── service_config.rs    # ServiceConfigRegistry
│   │   ├── service_discovery.rs # Consul / SmartServiceClient
│   │   ├── service_client.rs    # 跨服务 HTTP 客户端
│   │   ├── event/               # 事件总线
│   │   ├── telemetry.rs         # OpenTelemetry 链路追踪
│   │   ├── monitoring.rs        # 监控指标
│   │   ├── health.rs            # 健康检查框架
│   │   └── ...
│   └── Cargo.toml
│
├── svc/                          # 业务服务
│   ├── unified-core/            # 统一核心服务 (Port 8000)
│   │   ├── src/
│   │   │   ├── routes/          # 路由注册 (iam/flow/file/communication/...)
│   │   │   ├── modules/         # 核心模块实现
│   │   │   │   ├── iam/
│   │   │   │   ├── flow/
│   │   │   │   ├── file/
│   │   │   │   ├── communication/
│   │   │   │   ├── tenant/
│   │   │   │   ├── plugin/
│   │   │   │   ├── ticket/      # V16.1 工单与 SLA
│   │   │   │   ├── master/
│   │   │   │   ├── search/
│   │   │   │   └── ...
│   │   │   ├── middleware/      # 统一中间件
│   │   │   ├── handlers.rs      # 公共 handler 与中间件包装
│   │   │   └── main.rs          # 启动入口
│   │   └── Cargo.toml
│   │
│   ├── erp/                     # 企业资源计划 (8010)
│   ├── finance/                 # 财务管理 (8011)
│   ├── ai/                      # AI 服务 (8013)
│   ├── hrm/                     # 人力资源 (8020)
│   ├── pm/                      # 项目管理 (8023)
│   ├── crm/                     # 客户关系 (8029)
│   ├── mes/                     # 制造执行 (8030)
│   ├── pdm/                     # 产品数据 (8031)
│   ├── scm/                     # 供应链管理 (8040)
│   ├── wms/                     # 仓储管理 (8041)
│   ├── srm/                     # 供应商关系 (8042)
│   ├── qms/                     # 质量管理 (8050)
│   ├── lims/                    # 实验室信息 (8051)
│   ├── ehs/                     # 环境健康安全 (8052)
│   ├── rd/                      # 研发管理 (8053)
│   ├── analytics/               # 商业智能 (8060)，别名 bi/report
│   ├── portal/                  # 企业门户 (8063)
│   ├── mobile/                  # 移动服务 (8070)
│   ├── gis/                     # 地理信息 (8071)
│   └── integration/             # 系统集成 (8072)
```

### 3.2 统一路由注册模式

项目强制使用以下模式挂载核心服务路由，避免双前缀 bug:

```rust
// unified-core: svc/unified-core/src/routes/mod.rs
let core_protected_routes = iam::iam_routes(state)
    .merge(flow::flow_routes(state))
    .merge(file::file_routes(state))
    .merge(communication::communication_routes(state))
    // ...
    .layer(axum::middleware::from_fn_with_state(
        state.auth_state.clone(),
        auth_middleware,
    ));

let core_router = register_routes_with_legacy_alias(
    Router::new(),
    "/api/core",
    &["/api/v1/core"],
    core_routes,
);
```

业务服务同样遵循: 模块内使用裸路径 (`/projects`, `/tasks`)，在 `main.rs` 中:

```rust
let protected_routes = modules::create_routes().layer(middleware).with_state(state);
let app = Router::new()
    .merge(public_routes)
    .nest("/api/{svc}", protected_routes);
```

### 3.3 中间件架构

unified-core 中间件栈 (从外层到内层):

```
请求 → CORS → Prometheus → Telemetry → RateLimit → Compression → SecurityHeaders
      → BodyLimit → AuditLogger → InputValidation → TenantRLS → Auth → 业务处理 → 响应
```

> **Axum Layer 顺序注意**: `.layer(A).layer(B)` 中 B 在外层（先执行）。当 `tenant_middleware` 需要 `Extension<Claims>` 而 `auth_middleware` 负责设置 Claims 时，必须 `.layer(tenant_middleware).layer(auth_middleware)` 让 auth 在最外层运行。

#### 核心中间件

| 中间件 | 位置 | 功能 |
|--------|------|------|
| CORS | `lib/src/cors.rs` | 跨域资源共享 |
| Telemetry | `lib/src/telemetry.rs` | 链路追踪、Trace/Span/Request ID |
| Prometheus | `axum-prometheus` | 请求指标收集 |
| Rate Limit | `svc/unified-core/src/middleware/rate_limit.rs` | 限流保护 |
| Security Headers | `lib/src/security.rs` | 安全响应头 |
| Body Limit | `lib/src/security.rs` | 请求体大小限制 |
| Audit Logger | `svc/unified-core/middleware/audit_log.rs` | 操作审计日志 |
| Input Validation | `svc/unified-core/middleware/input_validation.rs` | 输入校验 |
| Tenant RLS | `svc/unified-core/src/middleware/tenant_rls.rs` | 租户上下文注入 |
| Auth | `lib/src/auth.rs` | JWT 认证、权限校验 |
| RLS | `lib/src/rls.rs` | 行级安全过滤器(独立服务使用) |

### 3.4 共享库 (topems_shared)

共享库是所有后端服务的基础设施底座，主要模块:

| 模块 | 文件 | 功能描述 |
|------|------|---------|
| **认证** | [lib/src/auth.rs](file:///Users/xingzhai/TOPEMS/lib/src/auth.rs) | JWT 生成/验证、认证中间件、Claims、权限检查 |
| **数据库** | [lib/src/database.rs](file:///Users/xingzhai/TOPEMS/lib/src/database.rs) | PgPool 连接池管理、健康检查、读写分离 |
| **缓存** | [lib/src/cache.rs](file:///Users/xingzhai/TOPEMS/lib/src/cache.rs) | 内存缓存、多级缓存、缓存预热 |
| **响应** | [lib/src/response.rs](file:///Users/xingzhai/TOPEMS/lib/src/response.rs) | 统一 API 响应格式 `ApiResponse<T>`、分页响应 |
| **Schema** | [lib/src/schema.rs](file:///Users/xingzhai/TOPEMS/lib/src/schema.rs) | 多 Schema 表名构建器 (`with_schema`) |
| **RLS** | [lib/src/rls.rs](file:///Users/xingzhai/TOPEMS/lib/src/rls.rs) | 行级安全中间件 |
| **权限** | [lib/src/permission.rs](file:///Users/xingzhai/TOPEMS/lib/src/permission.rs) | 模块/资源/数据权限模型 |
| **租户** | [lib/src/tenant.rs](file:///Users/xingzhai/TOPEMS/lib/src/tenant.rs) | 多租户上下文、租户管理 |
| **健康检查** | [lib/src/health.rs](file:///Users/xingzhai/TOPEMS/lib/src/health.rs) | 健康检查框架与指标 |
| **事件** | [lib/src/event/](file:///Users/xingzhai/TOPEMS/lib/src/event/) | Redis/RabbitMQ 事件总线、MasterDataEvent |
| **配置** | [lib/src/config.rs](file:///Users/xingzhai/TOPEMS/lib/src/config.rs) | 配置加载、端口默认值 |
| **服务配置** | [lib/src/service_config.rs](file:///Users/xingzhai/TOPEMS/lib/src/service_config.rs) | `ServiceConfigRegistry` 集中化配置 |
| **服务发现** | [lib/src/service_discovery.rs](file:///Users/xingzhai/TOPEMS/lib/src/service_discovery.rs) | Consul 注册/发现 + `SmartServiceClient` |
| **服务客户端** | [lib/src/service_client.rs](file:///Users/xingzhai/TOPEMS/lib/src/service_client.rs) | 跨服务 HTTP 客户端工厂 |
| **遥测** | [lib/src/telemetry.rs](file:///Users/xingzhai/TOPEMS/lib/src/telemetry.rs) | OpenTelemetry 初始化、trace/span 注入 |
| **存储** | [lib/src/storage.rs](file:///Users/xingzhai/TOPEMS/lib/src/storage.rs) | 文件存储抽象 |
| **向量存储** | [lib/src/vector_store.rs](file:///Users/xingzhai/TOPEMS/lib/src/vector_store.rs) | Redis 向量搜索 |
| **AI 客户端** | [lib/src/ai_client/](file:///Users/xingzhai/TOPEMS/lib/src/ai_client/) | Ollama / Embedding 客户端 |
| **Saga** | [lib/src/saga/](file:///Users/xingzhai/TOPEMS/lib/src/saga/) | 分布式 Saga 编排 |

### 3.5 服务启动流程

以 unified-core 为例:

1. **加载环境变量**: `.env` 文件
2. **初始化遥测**: `init_service_telemetry!("topems-unified-core")`
3. **创建数据库连接池**: SQLx `PgPool`
4. **初始化各模块数据表**: 调用 `modules::{iam,flow,file,...}::init_database()`
5. **初始化种子数据**: 数据字典 `dict::seed::seed_dict_data()`
6. **构建应用状态** `AppState`: 认证状态、连接池、中间件实例、WS 状态等
7. **启动后台任务**: WebSocket 清理、Redis→WebSocket 事件桥、插件心跳检测
8. **创建路由**: `routes::create_routes()` 注册公共路由、核心路由、旧版兼容路由
9. **挂载全局 Layer**: CORS、Prometheus、Telemetry
10. **绑定端口并启动**: `axum::serve`

### 3.6 插件化架构 (V13.0+)

#### 3.6.1 核心组件

| 组件 | 文件路径 | 职责 |
|------|---------|------|
| 插件运行时 | [svc/unified-core/src/modules/plugin/handlers/runtime.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/plugin/handlers/runtime.rs) | 插件注册、安全令牌验证、心跳、导航配置 API |
| 租户插件管理 | [svc/unified-core/src/modules/plugin/handlers/tenant_plugins.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/plugin/handlers/tenant_plugins.rs) | 插件安装/卸载依赖检查（正向 + 反向） |
| 插件数据模型 | [svc/unified-core/src/modules/plugin/models.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/plugin/models.rs) | `RegisterPluginRequest` 含 `dependencies`、`navigation_config` |
| 心跳检测 | [svc/unified-core/src/main.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/main.rs) | 后台任务每 30 秒扫描，90 秒超时标记 offline |
| 插件代理 | [svc/unified-core/src/handlers.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/handlers.rs) | `/api/plugins/{plugin_code}/{*path}` 转发到插件 runtime_url |
| 服务配置 | [lib/src/service_config.rs](file:///Users/xingzhai/TOPEMS/lib/src/service_config.rs) | `ServiceConfigRegistry` 统一管理端口与地址 |
| 服务发现 | [lib/src/service_discovery.rs](file:///Users/xingzhai/TOPEMS/lib/src/service_discovery.rs) | Consul + 环境变量回退 |

#### 3.6.2 插件注册安全流程

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
POST /api/core/plugin/dev/plugins/{code}/register
    │
    ▼
unified-core:
  1. verify_registration_token() 校验令牌（生产模式必须配置）
  2. 检查 dependencies 是否已安装
  3. 存储 navigation_config
  4. 记录插件状态 active
    │
    ▼
每 30 秒 POST /heartbeat
    │
    ▼
超时 90 秒 → runtime_status = offline，前端导航隐藏
```

#### 3.6.3 服务发现机制

`SmartServiceClient` 双层回退:

1. **优先**: `ConsulDiscoveryClient` 查询 Consul (当 `CONSUL_ENABLED=true`)
2. **回退**: 使用 `ServiceConfigRegistry` 从环境变量解析地址

保证无 Consul 的开发环境与生产环境均可运行。

---

## 4. 前端架构

### 4.1 项目结构

```
apps/web/src/
├── api/                          # API 客户端层
│   ├── client.ts                # Axios 实例、拦截器、ApiClient 单例
│   ├── request.ts               # 请求/响应工具、分页请求
│   ├── permissionInterceptor.ts # 权限前置拦截
│   ├── iam/                     # IAM 模块 API
│   ├── erp/                     # ERP 模块 API
│   ├── ticket/                  # V16.1 工单与 SLA API
│   ├── bff/                     # Portal BFF 聚合 API
│   └── ...
│
├── components/                   # 可复用组件
│   ├── common/                  # DataTable、PageContainer、Dialog 等
│   ├── templates/               # ListPageTemplate 等页面模板
│   ├── layout/                  # AppHeader、AppSidebar、AppTabs
│   ├── ui/                      # 基础 UI 组件
│   └── ai/                      # AI 助手相关组件
│
├── hooks/                        # 自定义 Hooks
│   ├── useAuth.tsx              # 认证状态
│   ├── useCrudQueries.ts        # CRUD React Query 封装
│   ├── usePermission.ts         # 权限检查
│   ├── useWebSocket.ts          # WebSocket 连接
│   └── ...
│
├── pages/                        # 页面组件
│   ├── shared/                  # 登录、仪表盘等
│   ├── iam/
│   ├── erp/
│   ├── ticket/                  # V16.1 工单中心
│   └── ...
│
├── microfrontend/                # 微前端配置
│   ├── config.ts                # REMOTE_MODULES 远程模块清单
│   ├── RemoteLoader.tsx         # 运行时动态加载
│   └── ...
│
├── store/                        # Zustand 状态
│   ├── authStore.ts
│   ├── uiStore.ts
│   ├── themeStore.ts
│   ├── pluginStore.ts
│   └── ...
│
├── config/                       # 运行时配置
│   ├── runtime.ts               # 服务 URL、功能开关
│   └── service-ports.ts         # 端口映射
│
├── routes/                       # 路由配置
│   └── v2/                      # 动态路由(含遗留配置待清理)
│
├── lib/                          # 工具库
│   ├── utils.ts
│   ├── apiClient.ts             # API 客户端工具
│   ├── plugin-loader/           # 插件加载器 / 导航获取
│   └── navigation/              # 静态导航兜底
│
├── theme/                        # MUI 主题与 design tokens
├── App.tsx                       # 根组件、Provider、动态路由
└── main.tsx                      # 应用入口
```

### 4.2 应用入口流程

```
main.tsx
  ↓
App.tsx
  ├── ErrorBoundary
  ├── ThemeProvider
  ├── NotificationProvider
  ├── LoadingProvider
  ├── AuthProvider
  ├── QueryClientProvider (React Query)
  ├── PluginProvider
  └── BrowserRouter / DynamicRoutes
```

### 4.3 核心架构模式

#### 4.3.1 动态路由与微前端加载

- 访问模块时按需加载对应路由/远程模块。
- `REMOTE_MODULES` 在 [apps/web/src/microfrontend/config.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/microfrontend/config.ts) 中定义。
- `vite.config.ts` 根据 `VITE_DEPLOYMENT_MODE` 决定启用哪些 remote:
  - `static`: 不加载任何 remote，所有模块本地打包。
  - `module-federation` / `hybrid`: 启用 `topems_core` 等 remote。

#### 4.3.2 API 客户端架构

```
页面 Hook (useQuery / useMutation)
    ↓
api/{domain}/index.ts
    ↓
apiClient.{service} (Axios 实例)
    ↓
请求拦截器: Token / CSRF / Trace Headers / 重试
    ↓
Vite Proxy / Nginx
    ↓
后端服务
```

核心文件:
- [apps/web/src/api/client.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/api/client.ts) - `ApiClient` 单例，按服务名维护 Axios 实例
- [apps/web/src/api/index.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/api/index.ts) - 统一 barrel export
- [apps/web/src/hooks/useCrudQueries.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/hooks/useCrudQueries.ts) - 通用 CRUD React Query 封装

> **注意**: `@tanstack/react-query` 在 Module Federation shared 中配置为 `singleton: true`，防止多实例。

#### 4.3.3 Vite 代理配置

开发环境代理规则集中在 [apps/web/vite.config.ts](file:///Users/xingzhai/TOPEMS/apps/web/vite.config.ts):

- `/api/core/*` → `http://localhost:8000` (unified-core)，无 rewrite
- `/api/erp/*` → `http://localhost:8010`，无 rewrite
- `/api/hrm/*` → `http://localhost:8020`，无 rewrite
- `/api/mes/*` → `http://localhost:8030`，无 rewrite
- ... (每个业务服务一条精确规则)
- `/api/bi/*` 主路径；`/api/analytics/*`、 `/api/report/*` 作为兼容别名仍指向 BI
- `/api/core/monitor/*` → `http://localhost:8000` (unified-core monitor 模块)
- `/api/portal/*` → `http://localhost:8063`
- `/api/core/ai/*`、`/api/core/doc/*`、`/api/core/gis/*` 等扩展核心服务别名

新路径代理函数 `createNewApiProxyConfig` 不使用 rewrite，与后端路由约定一致。旧代理（`/core/api`、`/comm/api` 等）仍保留 rewrite 以兼容遗留路径。

#### 4.3.4 权限控制模型

前端三级权限:

1. **路由级**: `ProtectedRoute` 验证登录状态
2. **模块级**: `ModuleGate` 验证模块访问权限
3. **操作级**: `usePermission` Hook / `PermissionGate` 组件

权限数据流:

```
JWT Token → 解析 permissions → authStore → usePermission → UI 渲染
```

### 4.4 状态管理

使用 **Zustand** 按领域拆分 Store:

| Store | 文件 | 管理状态 |
|-------|------|---------|
| authStore | [store/authStore.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/store/authStore.ts) | 用户、Token、权限 |
| uiStore | [store/uiStore.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/store/uiStore.ts) | 侧边栏、对话框、加载 |
| themeStore | [store/themeStore.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/store/themeStore.ts) | 主题、暗色模式 |
| notificationStore | [store/notificationStore.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/store/notificationStore.ts) | 通知列表、未读数 |
| pluginStore | [store/pluginStore.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/store/pluginStore.ts) | 插件列表、安装状态 |

### 4.5 React Query 标准模式

项目约定:

- 查询使用 `useQuery` + `staleTime: 5 * 60 * 1000`
- 变更使用 `useMutation` + `onSuccess` 中 `invalidateQueries`
- 加载状态使用 `isPending`
- 分页状态放入 `queryKey`

示例 (TicketCenterPage):

```tsx
const { data: ticketsData, isLoading } = useQuery({
  queryKey: ['tickets', 'list', page, pageSize, activeTab, searchKeyword],
  queryFn: async () => {
    const res = await ticketApi.listTickets({ page, page_size: pageSize, status: activeTab });
    return res.data.data;
  },
  staleTime: 5 * 60 * 1000,
});
```

---

## 5. 数据库设计

### 5.1 数据库架构

- **主数据库**: PostgreSQL 16+
- **架构模式**: 多 Schema 隔离，每个业务模块独立 Schema
- **多租户**: 通过 `tenant_id` 字段实现行级隔离，配合 RLS 中间件
- **扩展**: `uuid-ossp` (UUID 生成)、`pgvector` (向量检索)

### 5.2 Schema 规划

| Schema 名称 | 所属模块 | 说明 |
|-----------|---------|------|
| public | - | 公共扩展安装位置 |
| core | 核心服务 | unified-core 内部表 (users, roles, plugins, tickets, flows 等) |
| plugin_erp | ERP | 企业资源计划 |
| plugin_finance | Finance | 财务管理 |
| plugin_hrm | HRM | 人力资源 |
| plugin_crm | CRM | 客户关系 |
| plugin_pm | PM | 项目管理 |
| plugin_mes | MES | 制造执行 |
| plugin_pdm | PDM | 产品数据 |
| plugin_qms | QMS | 质量管理 |
| plugin_lims | LIMS | 实验室管理 |
| plugin_ehs | EHS | 环境健康安全 |
| plugin_scm | SCM | 供应链 |
| plugin_wms | WMS | 仓储管理 |
| plugin_srm | SRM | 供应商关系 |
| plugin_bi / plugin_analytics | BI | 商业智能 |
| plugin_ai | AI | 人工智能 |
| plugin_gis | GIS | 地理信息 |
| plugin_mobile | Mobile | 移动服务 |
| plugin_portal | Portal | 企业门户 |

Schema 构建器: [lib/src/schema.rs](file:///Users/xingzhai/TOPEMS/lib/src/schema.rs)

### 5.3 核心表结构

#### 5.3.1 用户与权限表 (core Schema)

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

所有业务表统一包含:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键，默认 uuid_generate_v4() |
| tenant_id | UUID | 租户 ID，用于多租户隔离 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| created_by | VARCHAR/UUID | 创建人 |

### 5.4 索引策略

- 主键索引自动创建
- 所有业务表在 `tenant_id` 上建立索引
- 外键关联字段建立索引
- 高频查询使用组合索引
- 时间范围字段建立索引

---

## 6. 核心模块详解

### 6.1 统一核心服务 (Unified Core)

**端口**: 8000 | **路径**: [svc/unified-core/](file:///Users/xingzhai/TOPEMS/svc/unified-core/)

| 子模块 | 目录 | 功能描述 |
|--------|------|---------|
| IAM | modules/iam/ | 身份认证、用户/角色/权限、组织架构 |
| 工作流 Flow | modules/flow/ | 流程定义、审批流、任务、版本、统计 |
| 文件管理 File | modules/file/ | 文件上传下载、文件夹、预览 |
| 通讯 Communication | modules/communication/ | 通知、邮件、IM、WebSocket |
| 租户管理 Tenant | modules/tenant/ | 多租户、计费、配额 |
| 插件管理 Plugin | modules/plugin/ | 插件市场、注册、心跳、导航配置 |
| 主数据 Master | modules/master/ | 主数据管理、MDM |
| 工单 Ticket | modules/ticket/ | V16.1 工单中心、SLA、升级、统计 |
| 数据字典 Dict | modules/dict/ | 系统字典、种子数据 |
| 搜索 Search | modules/search/ | 全文搜索、聚合搜索 |
| 迁移 Migration | modules/migration/ | 数据迁移、版本升级 |
| 审计 Audit | modules/audit/ | 审计查询、中间件 |
| 帮助中心 Help | modules/help/ | FAQ、指南 |

### 6.2 IAM 身份认证模块

**路径前缀**: `/api/core/iam`

#### 核心功能

1. **用户认证**: 用户名/密码登录、JWT Token 生成与刷新、登出
2. **用户管理**: 用户 CRUD、状态管理、密码重置
3. **角色与权限**: 角色 CRUD、权限分配、权限元数据同步
4. **组织架构**: 部门、岗位管理

#### 核心数据模型

```rust
// lib/src/auth.rs
pub struct Claims {
    pub sub: String,              // 用户 ID
    pub username: String,
    pub role: String,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub is_superuser: bool,
    pub exp: usize,
    pub iat: usize,
    pub tenant_id: Option<String>,
}
```

### 6.3 V16.1 工单与 SLA 模块

**路径前缀**: `/api/core/master` (工单与 SLA 挂载在 master 模块下；通过 Portal BFF 暴露为 `/api/portal/tickets`)

#### 6.3.1 模块定位

工单模块是 unified-core 中新增的跨域协作中枢，用于承接对账差异、审批超时、系统告警、数据问题、集成异常、用户请求等来源的跟踪与处理。SLA 子模块提供策略配置、响应/解决时限计算、多级自动升级与统计分析。

> **注意**: 后端 `ticket_routes()` 与 `master_routes()` 合并挂载，因此实际核心路径为 `/api/core/master/tickets`、`/api/core/master/sla-policies` 等，而非 `/api/core/ticket/*`。

#### 6.3.2 数据模型

| 结构体 | 文件 | 说明 |
|--------|------|------|
| `Ticket` | [svc/unified-core/src/modules/ticket/models.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/ticket/models.rs) | 工单主表 |
| `TicketStatus` / `TicketSeverity` / `TicketType` | models.rs | 枚举状态、严重级别、类型 |
| `TicketComment` | models.rs | 工单评论 |
| `TicketActivity` | models.rs | 操作日志 |
| `TicketSlaPolicy` | models.rs | SLA 策略 |
| `TicketSlaInfo` | models.rs | SLA 计算结果 |
| `SlaEscalationEvent` | models.rs | 升级事件 |
| `TicketSlaStats` | models.rs | SLA 统计 |

#### 6.3.3 SLA 计算逻辑

SLA 服务: [svc/unified-core/src/modules/ticket/sla_service.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/ticket/sla_service.rs)

关键方法:

| 方法 | 说明 |
|------|------|
| `calculate_sla(ticket)` | 匹配策略 → 计算响应/解决截止时间 → 判断是否违约 → 返回 `TicketSlaInfo` |
| `match_policy(ticket)` | 按 `tenant_id`、`ticket_type`、`severity` 匹配最具体的激活策略 |
| `calculate_due_time(...)` | 支持仅工作时间、排除周末、自定义营业时段的截止时间递进计算 |
| `check_and_escalate(ticket)` | 扫描三级升级阈值，到达时限且未升级则记录升级事件 |
| `record_escalation(...)` | 持久化升级事件并写入 activity 日志 |
| `get_sla_stats(...)` | 聚合按时/违约数、违约率、平均处理时长、按严重级别/类型/日期分组 |

默认 SLA 时限 (无策略时):

| 严重级别 | 响应时限 | 解决时限 |
|---------|---------|---------|
| critical | 1 小时 | 4 小时 |
| high | 2 小时 | 24 小时 |
| medium | 8 小时 | 72 小时 |
| low | 24 小时 | 168 小时 |

> **实现注意**: `calculate_due_time` 支持仅工作时间、排除周末与自定义营业时段，因此 `sla_due_at` 与 `response_due_at` 会按策略正确递进。但 [svc/unified-core/src/modules/ticket/sla_service.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/ticket/sla_service.rs#L250-L303) 中的 `check_and_escalate` 目前直接使用 `ticket.created_at + escalation_hours` 计算升级点，未复用工作时间逻辑；当策略开启 `working_hours_only` 或 `weekend_excluded` 时，升级触发点可能与解决截止时间不一致，需要后续对齐。

#### 6.3.4 SLA API 端点

**unified-core 后端端点** (挂载在 `/api/core/master` 下):

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/core/master/tickets/{id}/sla` | 查询工单 SLA |
| POST | `/api/core/master/tickets/{id}/sla` | 触发 SLA 升级检查 |
| GET | `/api/core/master/tickets/sla-stats` | SLA 统计 |
| GET | `/api/core/master/sla-policies` | 策略列表 |
| GET | `/api/core/master/sla-policies/{id}` | 策略详情 |
| POST | `/api/core/master/sla-policies` | 创建策略 |
| PUT | `/api/core/master/sla-policies/{id}` | 更新策略 |
| DELETE | `/api/core/master/sla-policies/{id}` | 删除策略 |

**Portal BFF 暴露端点** (当前已实现):

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/portal/tickets` | 工单列表/创建 |
| GET/PUT | `/api/portal/tickets/{id}` | 工单详情/更新 |
| GET/POST | `/api/portal/tickets/{id}/comments` | 评论列表/添加 |
| GET | `/api/portal/tickets/stats` | 工单统计 |

> **缺口**: Portal BFF 当前仅代理了工单基础路径。在 [svc/portal/src/main.rs](file:///Users/xingzhai/TOPEMS/svc/portal/src/main.rs#L325-L337) 中只注册了 `/tickets`、`/tickets/{id}`、`/tickets/{id}/comments`、`/tickets/stats`，对应的 [svc/portal/src/modules/tickets.rs](file:///Users/xingzhai/TOPEMS/svc/portal/src/modules/tickets.rs) 也只实现了这些路径的转发。
>
> 因此 [apps/web/src/api/ticket/index.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/api/ticket/index.ts) 中的 `getTicketSla`、`triggerSlaEscalation`、`getSlaStats`、`listSlaPolicies`、`getSlaPolicy`、`createSlaPolicy`、`updateSlaPolicy`、`deleteSlaPolicy` 都会返回 **404**。需要新增以下 Portal 代理并注册进 `protected_routes`：
>
> | 方法 | Portal 路径 | 转发目标 |
> |------|-------------|----------|
> | GET/POST | `/api/portal/tickets/{id}/sla` | `/api/core/master/tickets/{id}/sla` |
> | GET | `/api/portal/tickets/sla-stats` | `/api/core/master/tickets/sla-stats` |
> | GET/POST | `/api/portal/sla-policies` | `/api/core/master/sla-policies` |
> | GET/PUT/DELETE | `/api/portal/sla-policies/{id}` | `/api/core/master/sla-policies/{id}` |
>
> 补齐前，前端 SLA 详情、策略管理、统计页面均无法通过 Portal BFF 访问。

#### 6.3.5 前端 SLA 展示

页面: [apps/web/src/pages/ticket/TicketCenterPage.tsx](file:///Users/xingzhai/TOPEMS/apps/web/src/pages/ticket/TicketCenterPage.tsx)

- 列表新增 **SLA 列**，根据 `sla_due_at` 显示剩余时间或已超时时间，颜色区分 `error`/`warning`/`default`。
- 详情对话框调用 `ticketApi.getTicketSla(id)` 展示:
  - 当前策略名 (`policy_name`)
  - 响应/解决时限
  - 剩余时间
  - 违约状态
  - 当前升级级别
  - 升级历史列表

### 6.4 ERP 企业资源计划

**端口**: 8010 | **路径前缀**: `/api/erp`

#### 子模块

| 子模块 | 功能 |
|--------|------|
| 生产订单 | 生产计划、工单、进度跟踪 |
| 销售订单 | 销售合同、订单处理、发货 |
| 采购管理 | 采购申请、采购订单、供应商 |
| 物料管理 | 物料档案、BOM、库存 |
| 财务管理 | 会计科目、凭证、预算 |
| 固定资产 | 资产档案、折旧、盘点 |
| 基础行政 | 办公用品、会议室、车辆 |

> V32.0 Finance 迁移后，ERP 通过 `FinanceServiceClient` 调用独立 Finance 服务。

### 6.5 其他业务服务概览

| 服务 | 端口 | 路径前缀 | 核心能力 |
|------|------|---------|---------|
| Finance | 8011 | `/api/finance` | 财务报表、凭证、预算、科目 |
| AI | 8013 | `/api/ai` | RAG 问答、摘要、向量搜索、代码助手 |
| HRM | 8020 | `/api/hrm` | 员工、部门、岗位、薪酬 |
| PM | 8023 | `/api/pm` | 项目、任务、风险 |
| CRM | 8029 | `/api/crm` | 客户、商机、联系人 |
| MES | 8030 | `/api/mes` | 生产工单、工艺、WIP、看板 |
| PDM | 8031 | `/api/pdm` | 产品数据、BOM、版本 |
| SCM | 8040 | `/api/scm` | 供应链、MRP |
| WMS | 8041 | `/api/wms` | 入库、出库、库存、库位 |
| SRM | 8042 | `/api/srm` | 供应商、招投标、报价、采购 |
| QMS | 8050 | `/api/qms` | 检验、SPC、不合格品、FMEA |
| LIMS | 8051 | `/api/lims` | 样品、检测、报告 |
| EHS | 8052 | `/api/ehs` | 隐患、事故、合规 |
| RD | 8053 | `/api/rd` | 研发项目、需求、迭代 |
| Analytics (BI) | 8060 | `/api/bi` | 报表、分析、预测 |
| Portal | 8063 | `/api/portal` | 企业门户、BFF 聚合 |
| Mobile | 8070 | `/api/mobile` | 移动端 API |
| GIS | 8071 | `/api/gis` | 地理信息、地图 |
| Integration | 8072 | `/api/integration` | 系统集成、数据同步 |

---

## 7. 关键类与函数

### 7.1 后端核心 (Rust)

#### 7.1.1 认证模块

**文件**: [lib/src/auth.rs](file:///Users/xingzhai/TOPEMS/lib/src/auth.rs)

| 函数/结构体 | 签名 | 说明 |
|------------|------|------|
| `auth_middleware` | `async fn(State<AuthState>, Request, Next) -> Result<Response>` | JWT 认证中间件 |
| `verify_jwt_token` | `fn(token: &str, secret: &str) -> Result<Claims>` | 验证 JWT |
| `generate_jwt_token` | `fn(user_id: &str, secret: &str, expire_minutes: i64) -> String` | 生成访问 Token |
| `generate_refresh_token` | `fn(user_id: &str, secret: &str, expire_minutes: i64) -> String` | 生成刷新 Token |
| `Claims` | struct | JWT 载荷 |
| `AuthState` | struct | 认证配置状态 |

#### 7.1.2 数据库与连接池

**文件**: [lib/src/database.rs](file:///Users/xingzhai/TOPEMS/lib/src/database.rs)

| 函数 | 签名 | 说明 |
|------|------|------|
| `create_database_pool` | `async fn(&DatabaseConfig) -> Result<PgPool>` | 创建连接池 |
| `test_database_connection` | `async fn(&PgPool) -> Result<()>` | 测试连接 |
| `check_pool_health` | `async fn(&PgPool) -> HealthCheckResult` | 健康检查 |

#### 7.1.3 响应与分页

**文件**: [lib/src/response.rs](file:///Users/xingzhai/TOPEMS/lib/src/response.rs)

| 结构体/函数 | 说明 |
|------------|------|
| `ApiResponse<T>` | `{ code, success, message, data }` |
| `PaginatedResponse<T>` | 分页响应 |
| `api_success(data, msg)` | 成功响应 |
| `api_error(code, msg)` | 错误响应 |

#### 7.1.4 RLS 与租户

| 文件 | 函数/结构体 | 说明 |
|------|------------|------|
| [lib/src/rls.rs](file:///Users/xingzhai/TOPEMS/lib/src/rls.rs) | `rls_middleware` | 行级安全中间件 |
| [lib/src/tenant.rs](file:///Users/xingzhai/TOPEMS/lib/src/tenant.rs) | `TenantContext`, `TenantManager` | 租户上下文与管理 |
| [svc/unified-core/src/middleware/tenant_rls.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/middleware/tenant_rls.rs) | `tenant_rls_middleware` | unified-core 租户注入 |

#### 7.1.5 插件架构

**文件**: [svc/unified-core/src/modules/plugin/handlers/runtime.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/plugin/handlers/runtime.rs)

| 函数 | 说明 |
|------|------|
| `verify_registration_token` | 校验 `X-Plugin-Token` |
| `register_plugin` | 插件注册入口 |
| `heartbeat` | 心跳更新 |
| `get_navigation_config` | 返回聚合导航配置 |

**文件**: [svc/unified-core/src/modules/plugin/handlers/tenant_plugins.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/plugin/handlers/tenant_plugins.rs)

| 函数 | 说明 |
|------|------|
| `install_plugin` | 正向依赖检查 |
| `uninstall_plugin` | 反向依赖检查 |

#### 7.1.6 SLA 服务

**文件**: [svc/unified-core/src/modules/ticket/sla_service.rs](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/ticket/sla_service.rs)

| 函数 | 说明 |
|------|------|
| `TicketSlaService::new(pool)` | 构造 SLA 服务 |
| `calculate_sla(&ticket)` | 计算工单 SLA 信息 |
| `match_policy(&ticket)` | 匹配 SLA 策略 |
| `check_and_escalate(&ticket)` | 检查并触发升级 |
| `get_sla_stats(tenant_id, ...)` | 聚合 SLA 统计 |

#### 7.1.7 服务发现与配置

| 文件 | 结构体/函数 | 说明 |
|------|------------|------|
| [lib/src/service_discovery.rs](file:///Users/xingzhai/TOPEMS/lib/src/service_discovery.rs) | `SmartServiceClient`, `ConsulDiscoveryClient`, `ConsulServiceRegistrar` | 服务发现与注册 |
| [lib/src/service_config.rs](file:///Users/xingzhai/TOPEMS/lib/src/service_config.rs) | `ServiceConfigRegistry`, `ServiceDefinition` | 集中化服务配置 |
| [lib/src/service_client.rs](file:///Users/xingzhai/TOPEMS/lib/src/service_client.rs) | `create_*_client`, `BaseServiceClient` | 跨服务调用客户端 |

### 7.2 前端核心 (TypeScript)

#### 7.2.1 API 客户端

**文件**: [apps/web/src/api/client.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/api/client.ts)

| 类型/函数 | 说明 |
|----------|------|
| `ApiResponse<T>` / `PaginatedResponse<T>` | 统一响应类型 |
| `createAxiosClient` | 创建带拦截器的 Axios 实例 |
| `ApiClient` | 单例，按服务名维护客户端 (`apiClient.erp`, `apiClient.hrm`, ...) |
| `apiClient.setAuthToken` / `clearAuthToken` | 全局 Token 同步 |
| `downloadBlob` | 文件下载辅助 |

#### 7.2.2 认证与权限

| 文件 | Hook/函数 | 说明 |
|------|----------|------|
| [apps/web/src/hooks/useAuth.tsx](file:///Users/xingzhai/TOPEMS/apps/web/src/hooks/useAuth.tsx) | `useAuth()` | 认证状态与登录/登出 |
| [apps/web/src/hooks/usePermission.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/hooks/usePermission.ts) | `usePermission()` | 权限检查 |

#### 7.2.3 CRUD Hook

**文件**: [apps/web/src/hooks/useCrudQueries.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/hooks/useCrudQueries.ts)

| Hook | 说明 |
|------|------|
| `useCrudQueries(options)` | 标准 list/get/create/update/remove 封装 |

#### 7.2.4 工单 API

**文件**: [apps/web/src/api/ticket/index.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/api/ticket/index.ts)

| 函数 | 说明 |
|------|------|
| `ticketApi.listTickets(query)` | 工单列表 |
| `ticketApi.getTicket(id)` | 工单详情 |
| `ticketApi.createTicket(data)` | 创建工单 |
| `ticketApi.updateTicket(id, data)` | 更新工单 |
| `ticketApi.getTicketSla(id)` | SLA 信息 |
| `ticketApi.triggerSlaEscalation(id)` | 触发升级 |
| `ticketApi.listSlaPolicies()` | 策略列表 |
| `ticketApi.createSlaPolicy(data)` | 创建策略 |

### 7.3 配置管理

#### 7.3.1 前端运行时配置

**文件**: [apps/web/src/config/runtime.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/config/runtime.ts)

```typescript
interface RuntimeConfig {
  api: { baseUrl: string; timeout: number };
  ws: { reconnectInterval: number; maxReconnectAttempts: number };
  services: Record<string, string>;  // 服务 baseURL
  features: Record<string, boolean>; // 功能开关
  theme: { default: 'light' | 'dark'; enableDarkMode: boolean };
  i18n: { defaultLocale: string; supportedLocales: string[] };
  security: { csrfTokenUrl: string; sessionTimeout: number };
}
```

#### 7.3.2 服务端口配置

权威来源:
- [config/ports.env](file:///Users/xingzhai/TOPEMS/config/ports.env)
- [config/services.yaml](file:///Users/xingzhai/TOPEMS/config/services.yaml)
- [lib/src/service_config.rs](file:///Users/xingzhai/TOPEMS/lib/src/service_config.rs)

---

## 8. 依赖关系

### 8.1 后端依赖 (Cargo Workspace)

**Workspace 配置**: [Cargo.toml](file:///Users/xingzhai/TOPEMS/Cargo.toml)

#### 核心依赖

| 依赖包 | 版本 | 用途 |
|--------|------|------|
| axum | ^0.8 | Web 框架 |
| tokio | 1.x | 异步运行时 |
| sqlx | ^0.8.6 | 数据库访问 |
| serde / serde_json | 1 | 序列化 |
| jsonwebtoken | 9.0 | JWT |
| bcrypt | 0.15 | 密码哈希 |
| reqwest | 0.12 | HTTP 客户端 |
| redis | - | Redis 客户端 |
| prometheus / axum-prometheus | 0.13 / 0.8 | 指标 |
| tracing / tracing-subscriber | 0.1 / 0.3 | 日志追踪 |
| utoipa / utoipa-swagger-ui | 4 | OpenAPI |
| async-graphql / async-graphql-axum | 7 | Portal BFF GraphQL |

#### 服务间依赖关系

```
unified-core (核心)
    │
    ├── erp, hrm, crm, pm, finance, doc, ai, ... (业务基础)
    │       │
    │       ├── mes, pdm, qms, lims, ehs (制造质量)
    │       │
    │       ├── scm, wms, srm (供应链仓储)
    │       │
    │       └── bi/analytics, monitor (分析监控)
    │
    ├── gis, integration (扩展服务)
    │
    └── mobile, portal (接入服务)
```

所有服务都依赖 `lib/topems_shared`。

### 8.2 前端依赖

**根配置**: [package.json](file:///Users/xingzhai/TOPEMS/package.json)

#### 核心依赖

| 依赖包 | 版本 | 用途 |
|--------|------|------|
| react / react-dom | ^19.2.7 | UI 框架 |
| react-router-dom | ^7.0.0 | 路由 |
| @mui/material | ^9.1.1 | UI 组件 |
| @tanstack/react-query | ^5.0.0 | 数据获取 |
| zustand | ^5.0.0 | 状态管理 |
| axios | ^1.0.0 | HTTP 客户端 |
| dayjs | ^1.11.21 | 日期处理 |
| i18next / react-i18next | ^26.0.0 / ^17.0.0 | 国际化 |
| @module-federation/vite | - | 微前端 |

### 8.3 外部系统依赖

| 系统 | 版本要求 | 用途 | 必选 |
|------|---------|------|------|
| PostgreSQL | 16+ | 主数据库 | ✅ |
| Redis | 7+ | 缓存、会话、消息、向量 | 可选 |
| RabbitMQ | 3.x | 消息队列、事件总线 | 可选 |
| Ollama | 最新 | AI 模型推理 | 可选 |
| Consul | 最新 | 服务发现 | 可选 |
| Prometheus + Grafana | - | 监控告警 | 可选 |
| Jaeger | - | 链路追踪 | 可选 |

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
| CPU | 4 核 | 8 核+ |
| 内存 | 8 GB | 16 GB+ |
| 磁盘 | 100 GB SSD | 500 GB+ SSD |
| 操作系统 | Linux (Ubuntu 22.04+) | Linux (Ubuntu 22.04+) |

### 9.2 本地开发启动

#### 9.2.1 准备

```bash
# 克隆项目
git clone <repository-url>
cd TOPEMS

# 安装前端依赖
pnpm install

# 编译 Rust 工作区
cargo build --workspace

# 启动数据库 (macOS 示例)
brew services start postgresql@16
brew services start redis
createdb topems

# 复制环境变量
cp .env.example .env
# 编辑 .env，配置 DATABASE_URL、JWT_SECRET、JWT_REFRESH_SECRET 等
```

#### 9.2.2 分别启动

**前端开发:**

```bash
cd apps/web
pnpm run dev
```

**后端核心服务:**

```bash
cd svc/unified-core
cargo run
```

**后端业务服务:**

```bash
cd svc/erp
cargo run

# 其他服务同理
```

> HRM 服务需要在 `.env` 中配置 `ENCRYPTION_KEY`，用于字段加密服务初始化。

#### 9.2.3 管理脚本

```bash
# 查看所有服务状态
./scripts/topems.sh status

# 启动指定服务
./scripts/topems.sh start erp

# 查看服务日志
./scripts/topems.sh logs erp 100
```

访问地址:
- **前端**: http://localhost:3000
- **后端 API (核心)**: http://localhost:8000
- **默认账号**: admin / admin123

### 9.3 Docker 部署

**文件**: [docker/docker-compose.yml](file:///Users/xingzhai/TOPEMS/docker/docker-compose.yml)

基础设施服务:
- PostgreSQL
- Redis
- RabbitMQ
- Consul
- Prometheus + Grafana + Alertmanager
- Jaeger

启动基础设施:

```bash
cd docker
docker compose up -d postgres redis
```

启动全部:

```bash
docker compose up -d
```

### 9.4 Kubernetes 部署

**配置目录**: [k8s/](file:///Users/xingzhai/TOPEMS/k8s/)

```
k8s/
├── base/                    # 基础配置
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   ├── rabbitmq.yaml
│   ├── ingress.yaml
│   ├── monitoring.yaml
│   └── consul.yaml
│
└── services/                # 业务服务 Deployment
    ├── erp.yaml
    ├── hrm.yaml
    ├── mes.yaml
    └── ...
```

### 9.5 服务端口清单

| 服务名 | 端口 | 说明 |
|-------|------|------|
| unified-core | 8000 | 统一核心服务 (IAM/Doc/Flow/File/Monitor/Communication/Plugin/Ticket) |
| erp | 8010 | 企业资源计划 |
| finance | 8011 | 财务管理 |
| ai | 8013 | AI 智能服务 |
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
| analytics (bi) | 8060 | 商业智能 |
| portal | 8063 | 企业门户 / BFF |
| mobile | 8070 | 移动服务 |
| gis | 8071 | 地理信息 |
| integration | 8072 | 系统集成 |
| web (前端) | 3000 | Web 应用 |
| gateway (nginx) | 8080 | API 网关 |

### 9.6 核心环境变量

| 变量 | 说明 | 默认值/示例 |
|------|------|------------|
| `DATABASE_URL` | PostgreSQL 连接 URL | `postgres://topems:topems_secret@localhost:5432/topems` |
| `REDIS_URL` | Redis 连接 URL | `redis://localhost:6379` |
| `JWT_SECRET` | JWT 访问令牌密钥 | 必须配置 |
| `JWT_REFRESH_SECRET` | JWT 刷新令牌密钥 | 必须配置 |
| `CORS_ORIGINS` | 允许的跨域源 | `http://localhost:3000` |
| `ENCRYPTION_KEY` | HRM 字段加密密钥 | HRM 服务必须配置 |
| `PLUGIN_REGISTRATION_TOKEN` | 插件注册安全令牌 | 生产必须配置 |
| `CONSUL_ENABLED` | 是否启用 Consul | `false` |
| `CONSUL_URL` | Consul 地址 | `http://localhost:8500` |
| `PLUGIN_HEARTBEAT_TIMEOUT` | 插件心跳超时(秒) | `90` |

生成安全密钥:

```bash
openssl rand -base64 32
```

---

## 10. 开发指南

### 10.1 代码规范

#### 后端 (Rust)

- `cargo fmt --all` 格式化
- `cargo clippy --workspace` 静态检查
- 错误处理使用 `thiserror` + `anyhow`
- 异步函数优先使用原生 `async fn`；需要 trait 对象时使用 `async-trait`
- 所有中间件使用 `async/await`，禁止回调风格
- Axum 路径参数使用 `{id}` 格式，不使用 `:id`

#### 前端 (TypeScript)

- `pnpm run format` (Prettier)
- `pnpm run lint` (ESLint)
- 函数式组件 + TypeScript
- 状态管理优先 React Query，全局状态用 Zustand
- 类型导入使用 `type` 关键字隔离

### 10.2 添加新服务/模块

#### 后端新服务

1. 在 `svc/` 下创建服务目录
2. 创建 `Cargo.toml`，依赖 `topems_shared`
3. 创建 `src/main.rs`、`src/lib.rs`、`src/modules/mod.rs`
4. 实现模型、路由、handler
5. 在根 `Cargo.toml` workspace.members 中注册
6. 在 `config/services.yaml`、`config/ports.env` 中添加端口
7. 在 `apps/web/src/config/runtime.ts` 与 `apps/web/vite.config.ts` 中添加代理
8. 创建 `plugin.yaml` 并编写启动注册逻辑

#### 后端现有服务新增模块

1. 在 `svc/{service}/src/modules/` 下新建模块目录
2. 实现 `mod.rs`、`models.rs`、`handlers.rs`
3. 在 `svc/{service}/src/modules/mod.rs` 中 `pub mod`
4. 在 `create_routes()` 中 `.merge(new_module::create_routes())`
5. 注意**挂载路径不要硬编码 `/api/{svc}`**，使用裸路径

#### 前端新模块

1. 在 `apps/web/src/pages/` 下创建模块页面
2. 在 `apps/web/src/api/` 下创建 API 客户端
3. 在 `apps/web/src/microfrontend/config.ts` 的 `REMOTE_MODULES` 中注册(如需微前端)
4. 在路由系统中注册模块

### 10.3 API 开发规范

#### 响应格式

```json
{
  "code": 200,
  "success": true,
  "message": "操作成功",
  "data": { }
}
```

分页响应:

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

#### HTTP 状态码

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

# 静态检查
cargo clippy --workspace
cargo fmt --all
```

#### 前端测试

```bash
# 单元测试
pnpm run test

# 类型检查
pnpm run typecheck

# 构建
pnpm run build
```

### 10.5 常用命令速查

#### 后端

```bash
cargo build --workspace          # 编译所有服务
cargo run -p topems-erp          # 运行指定服务
cargo test --workspace           # 运行所有测试
cargo clippy --workspace         # 代码检查
cargo fmt --all                  # 格式化
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
```

---

## 11. 项目评估与优化方案

### 11.1 总体评估

| 维度 | 状态 | 评分 | 说明 |
|------|------|------|------|
| 代码质量（Rust） | ✅ | 98 | 全 crate 零警告，unwrap 清零，类型安全与中间件体系规范 |
| 代码质量（TS） | ✅ | 90 | TS 零错误，类型体系较完整，但前端架构仍有优化空间 |
| 架构清晰度 | ⚠️ | 78 | 路由统一化已推进，遗留兼容路径与部分模块越界仍存 |
| 前后端对齐 | ⚠️ | 80 | Vite proxy 与 runtime 服务映射基本对齐，仍有 deprecated 别名 |
| 模块完整度 | ⚠️ | 72 | ERP/Flow/AI 较完整，多数业务服务仅基础骨架 |
| 可观察性 | ✅ | 85 | 日志、指标、追踪、健康检查框架已覆盖 |
| 多租户隔离 | ✅ | 90 | tenant_id + RLS 机制完整，97.3% 模块已接入 |
| 插件化落地 | ⚠️ | 78 | 注册/心跳/依赖检查已实现，核心/业务边界仍需厘清 |
| 前端架构 | ❌ | 65 | 组件体系混乱、App.tsx 膨胀、页面风格不统一、性能基础弱 |
| 四端完善度 | ❌ | 60 | Web 强，Desktop 遗留套壳，Mobile 独立且落后 |
| 文档与一致性 | ⚠️ | 80 | 文档丰富，已统一目录结构与相对链接，需持续同步 |

**综合健康评分: ~80/100**（后端 92 分 · 前端 65 分 · 架构 78 分）

### 11.2 主要短板

#### 11.2.1 路由与 API 路径的遗留债务

- 虽然新代码统一使用 `/api/core/{module}` 与 `/api/{svc}`，但 `register_routes_with_legacy_alias` 保留了 `/api/v1/core/*`、`/api/analytics/*`、`/api/report/*` 等旧路径。
- 部分服务 (doc/ai/gis/mobile/rd) 的 runtime 配置同时存在 `/api/{svc}` 与 `/api/core/{svc}/v1` 两种路径，增加了 Vite proxy 与 Nginx 规则维护成本。
- WebSocket 路径仍有旧路径注释遗留。

**优化建议:**
- 制定废弃路径移除计划，在前端统一使用新路径后逐步关闭旧别名。
- 收敛 `runtime.ts` 中的服务 URL，删除已标记 `@deprecated` 的别名。
- 将路径规范纳入 CI 检查，禁止新增非标准路径。

#### 11.2.2 微服务粒度与运维成本

- 20+ 独立 Rust 服务每个都有 Dockerfile、独立进程、独立端口，本地/CI 构建与启动开销大。
- 多数业务服务 (CRM/HRM/QMS/WMS/PM 等) 当前仅 1-2 个子模块，独立部署价值有限。
- 所有服务共享同一个 PostgreSQL 实例，Schema 隔离虽在但数据库级故障影响面大。

**优化建议:**
- 短期：保持当前进程，但通过 `scripts/topems.sh` 与 Docker Compose profile 优化启动体验。
- 中期：按业务域聚合为“域服务”进程 (制造域、供应链域、质量域、协同域)，减少进程数量。
- 长期：评估独立数据库或按域分库，降低单实例风险。

#### 11.2.3 unified-core 职责边界

- unified-core 已移除大部分业务模块，但仍承载了较多子系统 (IAM、Flow、File、Communication、Tenant、Plugin、Master、Ticket、Search、Dict、Audit 等)。
- 单点故障风险：unified-core 宕机会导致认证、插件注册、导航、工单全部失效。

**优化建议:**
- 将非核心但可独立部署的模块逐步外迁：例如 Notification/Mail/IM 可组成 communication 服务，File 可独立为文件服务。
- 在统一核心内部增加模块级健康检查与熔断，避免局部故障扩散。

#### 11.2.4 共享库 (topems_shared) 过于膨胀

- `lib/src/lib.rs` 导出 40+ 模块，任何共享库修改都会触发所有服务重新编译。
- 不同服务实际需要的能力差异很大 (GIS 不需要 embedding/ai_client)。

**优化建议:**
- 将共享库拆分为 feature-gated 子 crate:
  - `topems-core`: auth, database, cache, response, schema, rls, tenant, permission
  - `topems-infra`: telemetry, monitoring, health, service_discovery, service_config
  - `topems-comm`: messaging, notification, event
  - `topems-ai`: ai_client, embedding, vector_store
- 各服务按需引入，缩短编译依赖链。

#### 11.2.5 模块实现深度不均衡

- ERP、Flow、AI 实现较完整；CRM、HRM、PM、QMS、WMS、MES 等多数服务仅基础 CRUD。
- 前端声明了 20+ 模块，但部分页面仍使用 mock 或 TODO 占位。
- Portal BFF 部分接口 (早期 Todo/Notification) 仍为硬编码 mock。

**优化建议:**
- 制定各业务模块的 MVP 能力清单，优先补齐高频功能。
- 清理前端 mock 与 TODO，明确无后端支撑的模块是去是留。
- Portal BFF 接入真实服务数据，替代硬编码返回值。

#### 11.2.6 前后端类型不同步

- 前端 `packages/shared-types` 与后端 Rust struct 独立维护，无自动同步机制。
- API URL 手工维护在 `apps/web/src/api/` 各模块中，容易与后端路径漂移。

**优化建议:**
- 利用 `utoipa` 生成的 `openapi.yaml`，通过 `openapi-typescript` 自动生成前端类型。
- 建立 CI 步骤：后端 OpenAPI 变更时触发前端类型同步检查。
- 对核心模块引入端到端契约测试。

#### 11.2.7 桌面端与移动端薄弱

- Desktop (Tauri) 是独立简化实现，与 Web 端割裂，缺少 IAM/工作流/文件等核心能力。
- Mobile (React Native / Expo) 与 Web 技术栈差异大，代码复用率低。

**优化建议:**
- Desktop 改为 Web 套壳：Tauri 加载 `apps/web` 构建产物，统一功能与发布节奏。
- Mobile 短期共享 `packages/shared-types` 与 `packages/shared-utils`；中期评估 React Native Web 或跨平台组件库。

#### 11.2.8 Vite Proxy 配置仍偏手动

- `apps/web/vite.config.ts` 中仍有数十条按服务硬编码的代理规则。
- 每新增服务需要同步修改 ports.env、services.yaml、runtime.ts、vite.config.ts 多处。

**优化建议:**
- 从 `config/services.yaml` 或统一端口注册表自动生成 Vite proxy 规则。
- 抽象 `createServiceProxyConfig` 已存在，进一步扩展为读取 YAML 的循环生成。

#### 11.2.9 工单 SLA 功能前后端断点（已修复 ✅）

> **V51.0 已修复**: 两项断点均已闭环，详情见下。

- ~~**Portal BFF 代理缺口**~~: 已在 [svc/portal/src/main.rs#L341-L370](file:///Users/xingzhai/TOPEMS/svc/portal/src/main.rs#L341-L370) 注册 `/tickets/{id}/sla`、`/tickets/sla-stats`、`/sla-policies*` 全部代理路由，handler 实现于 [svc/portal/src/modules/tickets.rs](file:///Users/xingzhai/TOPEMS/svc/portal/src/modules/tickets.rs#L248-L400)。前端 [ticketApi](file:///Users/xingzhai/TOPEMS/apps/web/src/api/ticket/index.ts) 相关调用现已可达。
- ~~**升级计算未对齐工作时间**~~: [sla_service.rs#L283-L291](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/ticket/sla_service.rs#L283-L291) 的 `check_and_escalate` 已复用 `Self::calculate_due_time`，传入 `working_hours_only`/`business_hours_start`/`business_hours_end`/`weekend_excluded`，升级触发点与 SLA 截止时间计算现已一致。

**遗留建议:**
- 为 SLA 相关路径补充契约测试与集成测试，避免后端已上线但 BFF 未代理的断点再次发生。
- 增加 SLA 升级触发点与截止时间一致性的回归测试用例（覆盖 `working_hours_only=true` 与 `weekend_excluded=true` 场景）。

#### 11.2.10 BI 模块存在 SQL 注入风险（严重 🔴）

- [svc/analytics/src/modules/bi/chart_service.rs#L103](file:///Users/xingzhai/TOPEMS/svc/analytics/src/modules/bi/chart_service.rs#L103) 与 [multidimensional_analysis.rs#L332](file:///Users/xingzhai/TOPEMS/svc/analytics/src/modules/bi/multidimensional_analysis.rs#L332) 使用 `format!("SELECT {} FROM {}", x_column, data_source)` 直接拼接用户输入到 SQL，攻击者可通过 `data_source`/`x_column` 参数注入任意 SQL。
- 当前未对 `data_source`（表名）与 `x_column`（列名）做白名单校验，也未使用参数化查询。

**优化建议:**
- 立即引入表名/列名白名单校验（基于数据库元数据或配置注册表）。
- 将数据查询重构为参数化查询（`sqlx::query_with`），标识符使用 `quote_identifier` 转义。
- 在 CI 中增加 `cargo-audit` 与 SQL 注入静态扫描。

#### 11.2.11 JWT 使用 HS256 对称密钥与默认密钥风险（高 🟠）

- [lib/src/auth.rs#L69-L96](file:///Users/xingzhai/TOPEMS/lib/src/auth.rs#L69-L96) 所有服务共享同一 `JWT_SECRET`（HS256 对称加密），单点泄露即可伪造任意租户/用户的 token。
- 未设置 `JWT_SECRET` 环境变量时回退到硬编码默认密钥（`topems-jwt-secret-key-...`），生产环境若忘配置将造成严重安全事故。

**优化建议:**
- 迁移至 RS256 非对称加密：认证服务持有私钥签发，其他服务仅持有公钥验签。
- 移除默认密钥回退逻辑，生产环境强制要求 `JWT_SECRET` 存在且长度≥32，否则启动失败。
- 引入密钥轮换机制（kid header），支持平滑切换。

#### 11.2.12 插件注册令牌默认放行（中 🟡）

- [svc/unified-core/src/modules/plugin/handlers/runtime.rs#L14-L23](file:///Users/xingzhai/TOPEMS/svc/unified-core/src/modules/plugin/handlers/runtime.rs#L14-L23) 未配置 `PLUGIN_REGISTRATION_TOKEN` 时允许所有插件注册（开发模式），若生产环境漏配将导致恶意插件注册。

**优化建议:**
- 区分 `PROFILE=prod` 时强制要求 `PLUGIN_REGISTRATION_TOKEN`，未配置则启动失败。
- 插件注册增加租户级白名单与签名校验。

#### 11.2.13 前端组件体系混乱（高 🟠）

- 项目同时使用 `antd`、`@arco-design/web-react`、`@radix-ui/*`、`shadcn/ui` 等多套组件库，没有明确的选型原则。
- 部分页面混用多套组件，导致视觉风格不统一、包体积膨胀、维护成本高。
- 缺少统一的 Design Token 体系，颜色、间距、字号直接写死在组件中。
- 没有组件库或 Storybook，组件复用靠复制粘贴。

**优化建议:**
- 短期：明确唯一推荐组件库（建议 antd，生态最成熟），其余组件库逐步迁移。
- 中期：建立 TOPEMS UI 组件库，沉淀业务组件，Storybook 管理文档与示例。
- 长期：完善 Design Token 体系，支持主题切换、品牌定制。
- 设立 ESLint 规则，禁止引入未推荐的组件库。

#### 11.2.14 App.tsx 过度膨胀，缺少架构分层（高 🟠）

- `apps/web/src/App.tsx` 行数近 2000 行，混合了路由配置、开发面板、全局状态、布局逻辑。
- 路由配置与导航菜单强耦合，新增模块需改多处。
- 开发面板在生产构建中没有完全排除，增加包体积。
- 缺少全局的错误边界（Error Boundary），局部错误可能导致白屏。

**优化建议:**
- 短期：将开发面板移到 `dev-tools/` 目录，生产构建通过 Vite 插件排除。
- 中期：路由配置抽离到 `routes/` 目录，按模块拆分路由文件。
- 中期：布局抽离为 `layouts/` 组件（MainLayout、AuthLayout、BlankLayout）。
- 增加顶层 Error Boundary，捕获渲染错误并展示降级 UI。

#### 11.2.15 页面实现风格不统一，缺少模板沉淀（中 🟡）

- 400+ 页面实现风格差异大：有的用 antd Table，有的用 AG Grid，有的手写列表。
- 表单实现方式不统一：有的用 Form 组件，有的手写受控组件，校验逻辑分散。
- 空状态、加载态、错误态处理不一致，部分页面缺少这些状态。
- 缺少页面级模板（ListPageTemplate、DetailPageTemplate、FormPageTemplate）。

**优化建议:**
- 短期：定义 3 种核心页面模板：列表页、详情页、表单页。
- 中期：80% 业务页面迁移到模板，统一交互和视觉。
- 建立 FormBuilder 组件，通过配置生成表单，统一校验和布局。
- 全局 EmptyState、Skeleton、ErrorState 组件，所有页面强制使用。

#### 11.2.16 前端导航与信息架构混乱（中 🟡）

- 一级菜单项超过 20 个，没有按业务域分组，用户难以找到目标功能。
- 缺少全局搜索（⌘K），功能查找效率低。
- 面包屑手动维护，与路由不同步，经常出错。
- 没有最近访问、收藏、快捷入口等效率功能。

**优化建议:**
- 短期：侧边栏按业务域分组，一级菜单从 20+ → 6-8 个分组。
- 短期：增加全局搜索（⌘K），支持搜索菜单、页面、功能。
- 中期：面包屑从路由配置自动生成，消除手动维护。
- 中期：增加工作台（Workbench），整合待办、最近访问、快捷入口。

#### 11.2.17 前端性能与可访问性基础薄弱（中 🟡）

- 首屏 JS 体积过大，没有按路由级 code splitting 优化。
- 核心页面 LCP（最大内容绘制）时间长，缺少性能监控。
- 移动端适配差，大多数页面在小屏幕上布局错乱。
- 可访问性（a11y）基本为零：缺少语义化标签、键盘导航、ARIA 属性。

**优化建议:**
- 短期：路由级 code splitting，开发面板生产排除，目标首屏 < 500KB gzip。
- 短期：10 个核心页面做移动端适配，保证基本可用。
- 中期：建立性能基线，核心页面 LCP < 2s，CLS < 0.1。
- 中期：补齐基础可访问性：语义化、键盘导航、对比度达标。

### 11.3 优化路线图

| 阶段 | 时间 | 重点任务 |
|------|------|---------|
| **Sprint 0（第 1 周）** | 紧急 | 🔴 BI SQL 注入修复；🟠 JWT HS256→RS256；🟡 插件 token 生产强制；前端认证体系统一；App.tsx 拆分 |
| **Sprint 1（第 2 周）** | 高优 | 多租户 tenant_id 闭环；核心业务联调；组件体系收敛；侧边栏分组优化；全局搜索 |
| **Sprint 2（第 3-4 周）** | 中优 | OpenAPI 类型生成；废弃路径下线；Design Token 强制化；页面模板推广；Vite Proxy 自动化 |
| **Sprint 3（第 5-6 周）** | 上线 | 监控告警闭环；E2E 测试覆盖；部署脚本；性能优化（包体积+LCP）；移动端适配 |
| **V61.0** | 中期 | 前端设计系统 v2；unified-core 模块外迁；共享库子 crate 拆分；代码生成脚手架 |
| **V62.0** | 中长期 | 低代码平台基础；页面设计器；表单引擎；元数据驱动动态 API |
| **V63.0+** | 长期 | AI 自适应 UI；多端一致性；性能极致优化；无障碍增强 |

### 11.4 关键监控指标建议

- 服务编译时间 (workspace 整体与单服务)
- 本地启动时间 (全部基础设施 + 核心服务)
- 前后端 API 路径不一致数量
- 共享库变更导致的全量重编译次数
- 各服务主路径覆盖率 (后端路由数 vs 前端页面数)
- SLA 违约率、平均响应/解决时长 (V16.1 新增)
- SLA 相关 API 的 404 次数 / 前端调用失败率 (Portal BFF 代理缺口监控)
- SLA 升级触发点与截止时间一致性 (按工作时间策略下的偏差)

---

## 附录

### A. 参考文档

- [项目 README](../../README.md) - 项目根 README
- [任务规划与路线图](../roadmap/TODO.md) - 待办事项与版本规划
- [架构总览](./overview.md) - 架构总览
- [API 文档目录](../api/) - API 文档目录
- [部署指南](../deployment/deployment-guide.md) - 部署指南
- [架构优化报告](../plans/architecture-optimization.md) - 架构优化报告
- [短板分析报告](../plans/shortcomings-analysis.md) - 短板逐一分析与优化报告（详尽版）
- [整合实施方案](../plans/integration-implementation-plan.md) - 整合实施方案：4 Sprint 6 周上线
- [架构评审报告](../archive/architecture-plans/architecture-review-20260714.md) - 历史架构评审报告

### B. 相关文件索引

| 类别 | 文件路径 |
|------|---------|
| **后端核心** | [lib/src/lib.rs](../../lib/src/lib.rs) |
| **认证模块** | [lib/src/auth.rs](../../lib/src/auth.rs) |
| **数据库** | [lib/src/database.rs](../../lib/src/database.rs) |
| **Schema 定义** | [lib/src/schema.rs](../../lib/src/schema.rs) |
| **响应格式** | [lib/src/response.rs](../../lib/src/response.rs) |
| **服务配置** | [lib/src/service_config.rs](../../lib/src/service_config.rs) |
| **服务发现** | [lib/src/service_discovery.rs](../../lib/src/service_discovery.rs) |
| **服务客户端** | [lib/src/service_client.rs](../../lib/src/service_client.rs) |
| **unified-core 启动** | [svc/unified-core/src/main.rs](../../svc/unified-core/src/main.rs) |
| **unified-core 路由** | [svc/unified-core/src/routes/mod.rs](../../svc/unified-core/src/routes/mod.rs) |
| **unified-core 模块** | [svc/unified-core/src/modules/mod.rs](../../svc/unified-core/src/modules/mod.rs) |
| **工单 Handler** | [svc/unified-core/src/modules/ticket/handlers.rs](../../svc/unified-core/src/modules/ticket/handlers.rs) |
| **工单 SLA 服务** | [svc/unified-core/src/modules/ticket/sla_service.rs](../../svc/unified-core/src/modules/ticket/sla_service.rs) |
| **工单模型** | [svc/unified-core/src/modules/ticket/models.rs](../../svc/unified-core/src/modules/ticket/models.rs) |
| **插件运行时** | [svc/unified-core/src/modules/plugin/handlers/runtime.rs](../../svc/unified-core/src/modules/plugin/handlers/runtime.rs) |
| **前端入口** | [apps/web/src/App.tsx](../../apps/web/src/App.tsx) |
| **API 客户端** | [apps/web/src/api/client.ts](../../apps/web/src/api/client.ts) |
| **运行时配置** | [apps/web/src/config/runtime.ts](../../apps/web/src/config/runtime.ts) |
| **Vite 配置** | [apps/web/vite.config.ts](../../apps/web/vite.config.ts) |
| **微前端模块配置** | [apps/web/src/microfrontend/config.ts](../../apps/web/src/microfrontend/config.ts) |
| **工单中心页面** | [apps/web/src/pages/ticket/TicketCenterPage.tsx](../../apps/web/src/pages/ticket/TicketCenterPage.tsx) |
| **管理脚本** | [scripts/topems.sh](../../scripts/topems.sh) |
| **Docker 配置** | [docker/docker-compose.yml](../../docker/docker-compose.yml) |
| **K8s 配置** | [k8s/base/ingress.yaml](../../k8s/base/ingress.yaml) |
| **端口配置** | [config/ports.env](../../config/ports.env) |
| **服务配置** | [config/services.yaml](../../config/services.yaml) |

---

*本文档由 TOPEMS Code Wiki 维护，最后更新于 2026-07-24*
