# TOPEMS Code Wiki

> **版本**: v8.0 / V203 | **最后更新**: 2026-08-13 | **文档版本**: v5.0 (V203 后端覆盖率冲刺 18 crate × 1439+ tests · 导航 100% 闭环 · Code Wiki 结构刷新)

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
9. [项目运行方式](#9-项目运行方式)
10. [开发指南](#10-开发指南)
11. [测试策略](#11-测试策略)
12. [下一步工作规划](#12-下一步工作规划)
13. [附录](#附录)

---

## 1. 项目概述

### 1.1 项目简介

**TOPEMS** 是一个面向中大型企业的全栈数字化平台，采用 **Rust 微服务后端 + React 19 前端** 的技术栈，覆盖身份认证、流程自动化、文档管理、AI 协作、生产制造、供应链、质量管控、研发管理、商业智能等 28+ 业务领域。

平台通过统一的 `unified-core` 核心服务管理插件生命周期、租户隔离、权限体系与事件总线，各业务服务以独立进程或插件形式按需扩展。

**当前版本**: v5.15.0
**项目任务版本**: V203

### 1.2 核心特性

| 特性类别 | 具体特性 |
|---------|---------|
| **核心服务** | IAM、工作流(Flow)、文件(File)、通讯(Communication)、通知(Notification)、邮件(Mail)、即时通讯(IM)、主数据(Master)、插件(Plugin)、工单(Ticket)、监控(Monitor) |
| **经营管理** | ERP、Finance、AI、Billing |
| **协同办公** | HRM、PM、CRM、Feedback |
| **生产制造** | MES、PDM |
| **供应链** | SCM、WMS、SRM |
| **质量/研发** | QMS、LIMS、EHS、RD |
| **数据/基础设施** | BI(Analytics)、Portal、Mobile、GIS、Integration、Search、Lowcode、Master-Data |
| **技术亮点** | Rust Axum 高性能后端、React 19 + TypeScript 前端、微服务/插件化架构、Module Federation 微前端、PWA、AI RAG、pgvector 向量搜索 |
| **安全特性** | JWT 认证、RBAC、行级安全(RLS)、多租户隔离、字段加密、CSRF 防护、审计日志 |
| **插件化** | 安全令牌注册、Consul/环境变量服务发现、心跳超时检测、依赖检查、动态导航配置 |
| **工单 SLA** | SLA 策略配置、响应/解决时限计算、多级升级机制、SLA 统计 API |
| **Shared Bootstrap V2** | 28/28 (100%) 服务统一启动 API：ServiceConfig → bootstrap_service → build_application → run |
| **路由统一化** | 核心服务统一 `/api/core/{module}`，业务服务统一 `/api/{svc}`，Vite proxy 新路径无 rewrite 直通 |
| **导航架构合规** | **V182 达成 1050/1050 = 100% 全绿**：页面存在性(316/316) · 路由注册(350/350) · 权限三段式(384/384) — 自 V68.3 起 7 个版本迭代闭环 |
| **API 绑定覆盖** | V75~V81 完成 Finance/Monitor/PDM/unified-core/master-data/Finance 风控税务 等 7 大模块 API 绑定 100% 落地 |

### 1.3 技术栈

#### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^19.2.7 | UI 框架 |
| TypeScript | ^6.0.3 | 类型安全 |
| Vite | ^8.0.16 | 构建工具 / 开发服务器代理 |
| MUI (Material UI) | ^9.1.1 | UI 组件库 |
| TanStack React Query | ^5.101.0 | 服务端状态、缓存与重试 |
| Zustand | ^5.0.14 | 客户端全局状态 |
| React Router | ^7.17.0 | 路由管理 |
| Module Federation (Vite) | ^1.16.8 | 微前端动态加载 |
| i18next | ^26.3.1 | 国际化 |
| dayjs | ^1.11.21 | 日期处理 |
| axios | ^1.6.8 | HTTP 客户端 |
| Zod | ^4.4.3 | Schema 校验 |
| React Hook Form | ^7.79.0 | 表单管理 |
| Recharts | ^3.8.1 | 图表可视化 |
| Three.js / R3F | ^0.184.0 | 3D 可视化（GIS 模块） |
| Leaflet | ^1.9.4 | 地图组件（GIS 模块） |

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
| OpenTelemetry | - | 链路追踪 |
| utoipa | =4.2.3 | OpenAPI 文档生成 |
| async-graphql | 7 | Portal BFF GraphQL 聚合层 |
| reqwest | 0.12 | HTTP 客户端（服务间调用） |

#### 其他工具

| 技术 | 版本 | 用途 |
|------|------|------|
| Tauri | 2.0 | 桌面应用框架 |
| Expo (React Native) | - | 移动端应用 |
| Python CLI | 3.10+ | 命令行服务管理工具 |
| pnpm | 9.15.9 | 前端包管理器（Monorepo Workspace） |
| Cargo Workspace | - | 后端包管理 |
| Vitest | ^4.1.9 | 前端单元/组件测试 |
| Playwright | ^1.61.1 | E2E 测试 |
| Husky / lint-staged | 9.x / 17.x | Git Hooks 代码检查 |

---

## 2. 整体架构

### 2.1 架构分层

```
┌──────────────────────────────────────────────────────────────────┐
│                        客户端层 (Client Layer)                    │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐         │
│  │  Web    │  │  Mobile  │  │ Desktop  │  │  第三方   │         │
│  │ (3000)  │  │ (Expo RN)│  │ (Tauri)  │  │  系统     │         │
│  └─────────┘  └──────────┘  └──────────┘  └───────────┘         │
└──────────────────────────────┬───────────────────────────────────┘
                               │ HTTP/HTTPS / WebSocket
┌──────────────────────────────▼───────────────────────────────────┐
│                     API 网关层 (API Gateway)                      │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Nginx Ingress / Vite Dev Proxy                           │   │
│  │  - /api/core/*  → unified-core:8000                       │   │
│  │  - /api/{svc}/* → 各业务服务                              │   │
│  │  - /ws/*        → unified-core 或业务服务                 │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                    核心服务层 (Core Services)                     │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ unified-core (8000) — 虚拟服务：IAM/Doc/Flow/File/Monitor │    │
│  └──────────────────────────────────────────────────────────┘    │
│  ┌───────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │ search    │  │communication │  │ master-data  │ 独立扩展服务   │
│  │ (8082)    │  │(mail/im/noti)│  │   (8090)     │               │
│  └───────────┘  └──────────────┘  └──────────────┘               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ billing  │ │ ticket   │ │ feedback │ │ lowcode  │ 扩展服务     │
│  │ (8085)   │ │ (8086)   │ │ (8087)   │ │ (8088)   │             │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘             │
└──────────────────────────────┬───────────────────────────────────┘
                               │ REST / gRPC / EventBus
┌──────────────────────────────▼───────────────────────────────────┐
│                   业务服务层 (Business Services)                   │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │ 经营管理:  ERP(8010)  Finance(8011)  AI(8013)              │   │
│  │ 协同办公:  HRM(8020)  PM(8023)     CRM(8029)               │   │
│  │ 生产制造:  MES(8030)  PDM(8031)                            │   │
│  │ 供应链:    SCM(8040)  WMS(8041)    SRM(8042)               │   │
│  │ 质量研发:  QMS(8050)  LIMS(8051)   EHS(8052)  RD(8053)     │   │
│  │ 数据门户:  BI(8060)   Portal(8063)  Mobile(8070)           │   │
│  │ 基础扩展:  GIS(8071)  Integration(8072)                    │   │
│  └───────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                    共享库层 (Shared Libraries)                    │
│  Rust Crates:  shared-core  shared-db  shared-auth               │
│                shared-bootstrap  shared-event  shared-ai         │
│                shared-service-client  shared-observability       │
│  TS Packages:  shared-types  shared-utils  shared-constants      │
│                shared-components  shared-hooks  tokens           │
└──────────────────────────────┬───────────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────────┐
│                    数据层 (Data Layer)                            │
│  PostgreSQL(5432) · Redis(6379) · RabbitMQ · Ollama(11434)      │
│  Schema 隔离 · tenant_id 行级安全 · pgvector · 事件流             │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 架构风格

- **微服务架构**: 28个独立 Rust 服务，按业务域分组，独立编译、部署与扩展
- **插件化架构**: 业务服务通过 `plugin.yaml` + 启动注册进入 unified-core 的插件生命周期管理
- **统一核心平台 (unified-core)**: 承载不可卸载的核心能力 + 插件注册中心
- **共享库模式**: 8 个 Rust 共享 crate + 6 个 TS 共享包，提供通用能力
- **多租户隔离**: `tenant_id` 字段 + RLS 中间件 + 独立 PostgreSQL Schema
- **事件驱动**: Redis Pub/Sub + RabbitMQ 事件总线，支持 `MasterDataEvent` 跨服务同步
- **微前端 (Module Federation)**: `apps/web` 作为 Host，支持 static / module-federation / hybrid 三种模式

### 2.3 API 路径规范

| 服务类型 | 路径格式 | 示例 |
|---------|---------|------|
| 核心服务（unified-core 虚拟） | `/api/core/{module}/{path}` | `GET /api/core/iam/users` |
| 业务服务 | `/api/{svc}/{path}` | `GET /api/erp/orders` |
| 已统一的内部模块（Doc/File/Mail/IM/Notification） | `/api/core/{module}/{resource}` | `GET /api/core/doc/workspaces` |
| 旧路径别名（向后兼容） | `/api/v1/{svc}/{path}` 或 `/{svc}/api/{path}` | 由 `register_routes_with_legacy_alias` 处理 |

**⚠️ 工程约束（project_memory 中记录的硬规则）：**
- 后端 Axum 路由：`protected_routes = modules::create_routes().layer(middleware).with_state(state)` 然后 `app.merge(public_routes).nest('/api/{svc}', protected_routes)` — 不要双重嵌套路径
- Vite proxy：所有服务使用 `/api/{service}` 路径 + `rewrite: (path) => path`（无修改），因为 apiClient 的 baseURL 已带前缀
- Axum 中间件顺序：`.layer(tenant_middleware).layer(auth_middleware)` — auth_middleware 必须在外层（后添加），否则 500 "Missing Claims"
- Monitor 服务必须有公开的 `/api/monitor/health` 端点（无需认证）

---

## 3. 后端架构

### 3.1 Cargo Workspace 结构

```
Cargo.toml (Workspace Root)
├── lib/                         # 共享库根目录
│   ├── topems-shared           # 门面 crate（A4.3 闭环完成，≤30 条 re-export）
│   ├── shared-core             # 核心：API/配置/错误/响应/缓存/CRUD/CORS/指标
│   ├── shared-db               # 数据库：连接池/审计/RLS/迁移/Repository/备份
│   ├── shared-auth             # 认证：JWT/RBAC/租户/部门/权限中间件/安全
│   ├── shared-bootstrap        # 启动引导：ServiceConfig/bootstrap_service/run
│   ├── shared-event            # 事件总线：Redis/RabbitMQ/Saga/服务发现
│   ├── shared-service-client   # 服务间调用客户端：28+ 业务服务 Typed Client
│   ├── shared-observability    # 可观测性：遥测/日志/指标/告警/SLO
│   └── shared-ai               # AI 能力：Ollama 客户端/向量存储/嵌入
├── svc/
│   ├── unified-core/           # 核心平台（8000，模式 C）
│   ├── ai/ erp/ finance/ ...   # 28 个业务服务
└── tools/ migration-sdk/       # 迁移工具（一次性脚本）
```

### 3.2 Shared Bootstrap V2 三种启动模式

28 个服务全部使用统一启动 API：`ServiceConfig → bootstrap_service → build_application → run`

| 模式 | 说明 | 服务清单（数量） |
|------|------|-----------------|
| **A. 标准 build_application** | 无自定义 state，纯路由注册 | feedback, search, ticket, lowcode, communication, billing, master-data, hrm, finance, wms (10个) |
| **B. Stateful + build_application** | 自定义 AppState（DB/Service 实例），标准中间件链 | qms, ehs, pdm, lims, erp, crm, srm, scm, mes, pm, rd (11个) |
| **C. Application 重建** | 自定义 router/port/name，WS 或后台任务，特殊中间件顺序 | analytics, unified-core, integration, gis, portal, ai, mobile (7个) |

### 3.3 服务标准目录结构（模式 B 示例：AI 服务）

```
svc/ai/
├── Cargo.toml                  # 依赖声明（引用 workspace.dependencies）
├── Dockerfile                  # 容器化打包
├── plugin.yaml                 # 插件元数据（名称/版本/依赖/导航）
├── src/
│   ├── main.rs                 # 入口：ServiceConfig + bootstrap_service + 路由挂载
│   ├── lib.rs                  # 库根：pub mod 声明
│   ├── routes.rs               # 路由注册：public_routes + protected_routes + 中间件
│   ├── handlers/               # HTTP Handler 层（参数提取→调用Service→返回响应）
│   │   ├── ai_handlers.rs
│   │   ├── connector_handlers.rs
│   │   └── health.rs
│   ├── models/                 # 数据模型（数据库表结构、DTO、请求/响应类型）
│   │   ├── mod.rs
│   │   └── audit_log.rs
│   ├── modules/                # 功能模块（OpenAPI、Plugin、领域逻辑封装）
│   │   ├── mod.rs
│   │   ├── ai_knowledge/       # 知识库子模块
│   │   ├── ai_form/            # AI 表单子模块
│   │   ├── qa.rs / analysis.rs / document.rs / vector.rs ...
│   │   └── openapi.rs          # utoipa::OpenAPI 文档聚合
│   ├── services/               # 业务服务层（核心逻辑，可被 Handler/Event 调用）
│   │   ├── mod.rs
│   │   ├── qa.rs / db.rs / document.rs / embedding.rs ...
│   │   └── audit.rs / cache.rs
│   ├── middleware/             # 服务特有中间件（tenant、rate_limit 等）
│   │   ├── mod.rs
│   │   └── tenant.rs
│   ├── shared/                 # 服务内共享（AppState、权限映射）
│   │   ├── mod.rs
│   │   └── permission.rs
│   └── event_handlers/         # 事件订阅者（跨服务事件处理）
│       └── mod.rs
└── tests/                      # 集成测试（部分服务有）
```

### 3.4 标准路由模式（routes.rs）

```rust
// 1. public_routes：无认证路由（健康检查、插件信息、metrics）
let public_routes = Router::new()
    .route("/health", get(health::health))
    .route("/metrics", get(move || async { metric_handle.render() }))
    .with_state(app_state.clone());

// 2. protected_routes：需要认证的业务路由
let protected_routes = modules::create_routes()  // 子模块注册具体路径（裸路径如 /projects）
    .layer(Extension(auth_state.clone()))
    .layer(Extension(event_publisher.clone()))
    .with_state(app_state.clone());

// 3. 按顺序加中间件（注意：后加的是外层，先执行）
let protected_routes = protected_routes
    .layer(tenant_middleware)       // 内层：需要 Extension<Claims>
    .layer(auth_middleware);       // 外层：先执行，设置 Claims Extension

// 4. 最终聚合：公共路由 + 受保护路由（统一 nest 到 /api/{svc}）
Router::new()
    .merge(public_routes)
    .nest("/api/ai", protected_routes)  // ⚠️ 路径只在这里加一次！
    .layer(cors)
    .layer(prometheus_layer)
    .layer(telemetry_middleware)
```

**关键陷阱（Double-Prefix Bug）**：如果 main.rs 用了 `.nest('/api/{svc}', protected_routes)`，那么 module 内的路由只能写裸路径 `/projects`，绝对不能写 `/api/{svc}/projects`，否则路径会变成 `/api/pm/api/pm/projects` 导致 404。

### 3.5 Rust 共享 Crate 职责

| Crate | 路径 | 核心职责 |
|-------|------|---------|
| **topems-shared** | `lib/` | 门面 Crate，仅 ≤30 条高频 re-export（已完成去门面化迁移） |
| **shared-core** | `lib/shared-core/` | 基础 API 工具：`config/`(服务配置/端口) · `error/`(统一错误 TopemsError) · `response/`(ApiResponse/ListResponse) · `health/` · `cache/` · `cors/` · `validation/` · `crud/` · `metrics/` · `api_version/`(路由兼容+版本信息) · `api_security/`(AuditContext) |
| **shared-db** | `lib/shared-db/` | 数据访问层：`database/`(连接池/读写分离) · `audit/`(审计日志Service) · `rls/`(行级安全) · `migration/`(SQLx迁移) · `repository/`(通用Repository) · `schema/`(Schema管理) · `backup/`(备份恢复) · `data_governance/` |
| **shared-auth** | `lib/shared-auth/` | 安全认证：`auth.rs`(JWT生成/验证/Claims/AuthState) · `permission/`(RBAC) · `tenant.rs`(租户隔离) · `middleware/`(auth/tenant/permission/department/rate_limit中间件) · `security/`(加密/脱敏/CSRF/速率限制/Security Headers) |
| **shared-bootstrap** | `lib/shared-bootstrap/` | 启动引导：`bootstrap_service()` 初始化 telemetry + auth_state + event_publisher · `ServiceConfig` (name/port/env_var/api_prefix/legacy_prefixes) · `run()` 绑定端口监听 · `resolve_port()` |
| **shared-event** | `lib/shared-event/` | 事件驱动：`event/`(事件类型/发布者/订阅者/RabbitMQ/Redis PubSub/死信队列/延迟消息/版本化) · `saga/`(Saga编排/步骤/存储) · `service_discovery/` · `config_center/` · `messaging/` |
| **shared-service-client** | `lib/shared-service-client/` | 服务间调用 Typed Client：`service_client/` 下 28 个 `*_client.rs` + `api/*_api.rs`，封装 HTTP 调用 + 错误处理 |
| **shared-observability** | `lib/shared-observability/` | 可观测性：`telemetry/`(OpenTelemetry埋点/中间件/敏感字段过滤) · `observability/`(告警/SLO/日志查询) · `monitoring.rs` · `performance.rs` |
| **shared-ai** | `lib/shared-ai/` | AI 能力：`ai_client/`(多Provider：Ollama/OpenAI) · `ollama_client.rs` · `embedding.rs` · `vector_store.rs` · `file_client.rs` |

---

## 4. 前端架构

### 4.1 pnpm Workspace 结构

```
pnpm-workspace.yaml
├── apps/
│   ├── web/                    # Host Shell（主应用，端口 3000）
│   ├── desktop/                # Tauri 桌面应用
│   └── mobile/                 # Expo 移动端应用
├── packages/                   # 共享 TS 包
│   ├── shared-types/           # API 类型定义（OpenAPI 生成 + 手动）
│   ├── shared-utils/           # 工具函数（日期/字符串/存储/i18n/校验）
│   ├── shared-constants/       # 共享常量（颜色/标签/超时/数字）
│   ├── shared-components/      # 共享 UI 组件（DataTable/FormField 等）
│   ├── shared-hooks/           # 共享 Hooks（useCrud/useDebounce/useIntersectionObserver）
│   └── tokens/                 # Design Tokens（颜色/间距/渐变/字体）
└── tests/integration/          # 集成测试包
```

### 4.2 Host Shell (apps/web) 目录结构

```
apps/web/src/
├── api/                        # 每个后端服务对应一个子目录
│   ├── client.ts               # [核心] 多服务 Axios 客户端工厂 ApiClient
│   ├── request.ts              # 请求/响应处理：handleResponse/paginatedRequest/重试
│   ├── index.ts                # 聚合导出
│   ├── iam/ ai/ bi/ erp/ ...   # 每个子目录 = 一个服务的 API 方法
│   │   ├── index.ts            # 导出 service 客户端
│   │   └── <domain>.ts         # 按领域组织的 API 调用
├── lib/
│   ├── apiClient.ts            # [统一导出层] 整合 client.ts + request.ts + reactQuery
│   ├── reactQuery.ts           # QueryClient 单例 + QUERY_KEYS + 缓存配置
│   ├── security.ts             # 前端安全工具
│   ├── csrf.ts                 # CSRF Token 管理
│   └── utils.ts                # 通用工具
├── components/                 # 组件
│   ├── shared/ (来自 shared-components) + 业务组件
│   ├── layout/ dashboard/ charts/ ai/ security/ gis/ export/ ...
│   ├── templates/              # 页面模板（CRUD/List/Dashboard/Designer）
│   └── common/                 # 通用组件
├── modules/                    # 模块配置（每个业务模块 config.ts）
│   ├── ai/ bi/ crm/ doc/ ehs/ erp/ gis/ hrm/ iam/ im/
│   ├── lims/ mes/ oa/ pdm/ pm/ qms/ rd/ scm/ srm/ wms/
├── pages/                      # 页面级组件（少量，逐步被 routes + CRUD 模板替代）
├── routes/                     # 路由注册
│   ├── index.ts                # 主路由入口
│   ├── appRoutes.tsx           # 应用路由配置
│   ├── auth.ts / dashboard.ts  # 按职责拆分的路由子模块
│   └── v2/                     # V2 路由系统（类型化 + 导航对齐）
├── hooks/                      # 自定义 Hooks
│   ├── useAuth.tsx / usePermission.ts  # 认证权限
│   ├── useAIContext.ts / useAIHelper.ts # AI 助手
│   ├── useCrudForm.ts / useDataTable.ts / useDialogForm.ts  # CRUD 模板 Hooks
│   ├── domain/ features/ ui/ bff/  # 按领域分类的 Hooks
├── store/                      # Zustand 全局状态
│   ├── authStore.ts            # 认证状态
│   ├── themeStore.ts           # 主题切换
│   ├── uiStore.ts              # UI 状态（侧边栏/抽屉/对话框）
│   ├── biStore.ts              # BI 仪表盘状态
│   ├── pluginStore.ts          # 插件注册状态
│   ├── workflowStore.ts        # 工作流状态
│   └── domain/ server/ ui/     # 按层分类的子 Store
├── schemas/                    # Zod Form Schema（按模块分类）
│   ├── iam/ hrm/ erp/ finance/ mes/ wms/ pm/ pdm/ rd/ ...
├── config/                     # 配置
│   ├── ports.ts                # [单一信源] 后端端口 + MF 端口
│   ├── runtime.ts              # 运行时配置（服务 URL / 功能开关）
│   ├── env.ts                  # 环境变量包装
│   ├── permissions.ts          # 权限常量映射
│   └── ai-templates.ts         # AI Prompt 模板
├── constants/                  # 常量
│   ├── routes.ts / storage.ts / time.ts / version.ts / retry.ts
├── theme/                      # MUI 主题
│   ├── theme.ts / presets.ts / tokens.ts / design-tokens.ts / gradients.ts
├── i18n/                       # 国际化
│   ├── index.ts                # i18next 初始化
│   └── locales/{zh,en}/*.json  # 翻译资源（ai/bi/im/oa/pm/rd）
├── utils/                      # 工具函数
│   ├── apiPath.ts / date.ts / format.ts / storage.ts / errors.ts
│   ├── ai/ workflow/ zerocode/ bff/ a2ui/  # 领域工具
├── microfrontend/              # Module Federation 微前端
│   ├── config.ts               # REMOTE_MODULES 配置
│   ├── registry/               # 模块注册/发现
│   ├── governance/             # 依赖治理/版本管理
│   ├── ai-ops/                 # AI 运维（自动扩缩/异常检测/智能告警）
│   └── lowcode/                # 低代码构建器
├── context/                    # React Context
│   └── GisContext.tsx
├── layouts/                    # 布局配置
│   ├── navTree.ts / constants.ts
├── design-system/              # 设计系统
│   └── tokens/ design-lint.ts
├── types/                      # 顶层 TS 类型
├── debug/                      # 调试工具
├── App.tsx                     # 根组件
├── main.tsx                    # 入口
├── index.css / index.css.ts    # 样式（CSS-in-JS + vanilla-extract）
└── sw.ts                       # Service Worker（PWA 离线缓存）
```

### 4.3 统一 API 客户端架构

```
                    ┌─────────────────────┐
                    │  lib/apiClient.ts   │  统一导出层（用户首选）
                    │  apiGet/apiPost/    │
                    │  serviceGet/...     │
                    │  ServiceName 类型   │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼──────────────────┐
             ▼                 ▼                   ▼
    ┌────────────────┐  ┌──────────────┐   ┌──────────────────┐
    │ api/client.ts  │  │api/request.ts│   │lib/reactQuery.ts │
    │ ApiClient class│  │ handleResponse│   │ queryClient 单例 │
    │ 多服务Axios工厂│  │ paginatedReq  │   │ QUERY_KEYS       │
    │ Retry/Timeout  │  │ handleError   │   │ CACHE_DURATIONS  │
    │ 401 Unauth 处理│  │ CSRF/Telemetry│   │ staleTime 5min   │
    └───────┬────────┘  └──────────────┘   └──────────────────┘
            │ 每个 service 一个 AxiosInstance
    ┌───────┼──────────────────────────────────┐
    ▼       ▼         ▼           ▼            ▼
  iam     ai        erp         mes          wms  ... 32个服务
baseURL:  baseURL:   baseURL:    baseURL:     baseURL:
/api/iam  /api/ai   /api/erp    /api/mes     /api/wms
```

**[apps/web/src/lib/apiClient.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/lib/apiClient.ts)** 核心类型：
- `ServiceName` 联合类型：覆盖 32 个微服务名（iam/doc/ai/...）
- `getServiceClient(name: ServiceName)`：返回 typed Axios 实例

**[apps/web/src/api/client.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/api/client.ts)** 重试策略：
- 超时错误 (ECONNABORTED/timeout)、网络错误 (ERR_NETWORK)、5xx 错误 → 指数退避重试
- 最大重试 2 次，基础延迟 500ms，最大总等待 10s
- 503 服务不可用 → **不重试**
- 401 Unauthorized → 清除 localStorage token，触发 `auth:unauthorized` 事件

### 4.4 React Query 标准化模式

```typescript
// 数据获取：useQuery + staleTime 5min
const { data, isPending, error } = useQuery({
  queryKey: QUERY_KEYS.hrm.employees.list({ page, pageSize }),
  queryFn: () => serviceGet('hrm', '/employees', { page, pageSize }),
  staleTime: CACHE_DURATIONS.MEDIUM, // 5 min
});

// 数据更新：useMutation + onSuccess invalidate
const mutation = useMutation({
  mutationFn: (data) => servicePost('hrm', '/employees', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hrm.employees._def });
  },
});
```

### 4.5 状态管理架构 (Zustand)

按层级分层（见 [apps/web/src/store/ARCHITECTURE.md](file:///Users/xingzhai/TOPEMS/apps/web/src/store/ARCHITECTURE.md)）：

| Store 层级 | 路径 | 职责 | 示例 |
|-----------|------|------|------|
| **UI Store** | `store/ui/` `store/uiStore.ts` | 纯前端交互状态（侧边栏展开/对话框开关/主题/导航） | 侧边栏折叠、全局加载遮罩 |
| **Server Store** | `store/server/` | 服务端缓存/同步状态（React Query 之外的手动缓存） | 插件信息缓存、用户偏好 |
| **Domain Store** | `store/domain/` | 跨组件/跨页面的业务领域状态 | 工作流实例、BI 筛选条件 |
| **根 Store** | `store/*.ts` | 全局核心（认证/主题/通知等不可替代的） | authStore, themeStore, pluginStore |

### 4.6 Module Federation 微前端

配置见 [apps/web/vite.config.ts](file:///Users/xingzhai/TOPEMS/apps/web/vite.config.ts) + [apps/web/src/config/ports.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/config/ports.ts)

三种部署模式（由 `VITE_DEPLOYMENT_MODE` 控制）：
- **static (默认)**: 所有模块本地打包，不加载任何 remote（单体部署）
- **module-federation**: 启用 topems_core 作为基础 remote，开发用同源代理路径 `/remote/<name>/remoteEntry.js`
- **hybrid**: 混合模式，部分 remote 动态加载

**核心共享配置**（必须 singleton 否则运行时报错）：
```
@tanstack/react-query: { singleton: true, requiredVersion: ^5.0.0, strictVersion: true }
```

### 4.7 前端端口（单一信源）

权威来源：[config/ports.env](file:///Users/xingzhai/TOPEMS/config/ports.env) → 同步到 [apps/web/src/config/ports.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/config/ports.ts)

- **BACKEND_PORTS**: 后端服务端口（80xx）
  - 核心虚拟服务：core/iam/doc/file/flow/monitor → 8000
  - 扩展服务：search(8082), communication(8084), billing(8085), ticket(8086), feedback(8087), lowcode(8088), master-data(8090)
  - 业务服务分段：8010-8053
- **MF_PORTS**: Module Federation 前端 Dev Server 端口（3001-3019，共19个模块）

---

## 5. 数据库设计

### 5.1 PostgreSQL Schema 隔离策略

| Schema 命名空间 | 用途 | 服务 | search_path 设置 |
|----------------|------|------|-----------------|
| **public** | 共享表（用户/角色/权限/租户/字典） | unified-core/所有服务读 | shared 服务: `public` |
| **shared** | 跨服务共享业务表（组织/部门/员工基础） | HRM 写 / 其他读 | 所有业务服务: `{service_schema}, public, shared` |
| **ai_service** | AI 知识库/向量/文档 | AI | AI: `ai_service, public, shared` |
| **erp** | ERP 资产/库存/生产订单 | ERP | ERP: `erp, public, shared` |
| **finance** | 财务凭证/预算/支付/税务 | Finance | Finance: `finance, public, shared` |
| **hrm** | 人力资源合同/考勤/薪资/绩效 | HRM | HRM: `hrm, public, shared` |
| **crm** | 客户/商机/合同/交互 | CRM | CRM: `crm, public, shared` |
| **pm** | 项目/任务/风险/预算 | PM | PM: `pm, public, shared` |
| **mes** | 工单/设备/工位/在制品 | MES | MES: `mes, public, shared` |
| **pdm** | 产品/BOM/版本/工艺路线 | PDM | PDM: `pdm, public, shared` |
| **scm** | 供应链/采购/需求计划 | SCM | SCM: `scm, public, shared` |
| **wms** | 仓库/入库/出库/库存/批次 | WMS | WMS: `wms, public, shared` |
| **srm** | 供应商/招投标/询价 | SRM | SRM: `srm, public, shared` |
| **qms** | 质量标准/检验/SPC/8D/FMEA | QMS | QMS: `qms, public, shared` |
| **lims** | 样品/检验/仪器/试剂 | LIMS | LIMS: `lims, public, shared` |
| **ehs** | 风险/事故/隐患/合规/培训 | EHS | EHS: `ehs, public, shared` |
| **rs** | 研发项目/缺陷/实验/构建 | RD | RD: `rs, public` ⚠️（search_path 含 rs, public） |
| **其他** | bi/mobile/gis/portal/... | 各自服务 | `{svc}, public, shared` |
| **search** | 搜索索引 | Search | 默认 `rs, erp, public` |

**硬约束（来自 project_memory）**：
- **所有数据库连接必须显式设置 search_path**，不能依赖默认值
- RD 服务特殊：search_path = `'rs, public'`
- HRM 服务：必须设置 `ENCRYPTION_KEY` 环境变量（字段加密服务初始化）
- 统一核心服务连接：search_path = `'public'`，避免默认多 schema 造成表名歧义

### 5.2 数据库访问层 (shared-db)

关键能力位于 [lib/shared-db/src/](file:///Users/xingzhai/TOPEMS/lib/shared-db/src/)：

| 模块 | 文件 | 功能 |
|------|------|------|
| 连接池 | `database/mod.rs` + `database/read_write.rs` | `create_database_pool()` · 健康检查 · 读写分离配置 |
| 审计日志 | `audit.rs` | `AuditLogService` · 自动记录 CRUD 操作 · 审计查询 API |
| 行级安全 | `rls.rs` | 基于 tenant_id 的 RLS 策略 · 动态启用 RLS |
| 迁移 | `migration.rs` | 内嵌 SQLx migration · 升级/降级 |
| 通用 Repository | `repository.rs` | 泛型 CRUD Repository trait + 默认实现 |
| Schema 管理 | `schema.rs` | 动态 Schema 切换 · 按租户建表 |
| 数据治理 | `data_governance.rs` | 数据质量检查 · 血缘追踪 |
| 备份 | `backup.rs` | pg_dump 封装 · 定时备份 · 恢复流程 |

### 5.3 数据库配置文件

- [config/database.toml](file:///Users/xingzhai/TOPEMS/config/database.toml)：数据库连接配置（用户/密码/连接数）
- [config/schema.json](file:///Users/xingzhai/TOPEMS/config/schema.json)：Schema 定义元数据
- [config/deployment.yaml](file:///Users/xingzhai/TOPEMS/config/deployment.yaml)：部署拓扑配置

---

## 6. 核心模块详解

### 6.1 核心平台模块（unified-core，8000）

| 子模块 | 路径前缀 | 职责 | 说明 |
|--------|---------|------|------|
| **IAM** | `/api/core/iam` | 身份认证与授权 | 用户/角色/权限/JWT/租户/RBAC |
| **Doc** | `/api/core/doc` | 文档管理 | 工作区/文件夹/文档/版本/分享 |
| **Flow (Workflow)** | `/api/core/flow` | 工作流审批 | 流程定义/任务/表单/规则 |
| **File** | `/api/core/file` | 文件存储 | 上传/下载/流式处理/多后端 |
| **Monitor** | `/api/core/monitor` | 监控与告警 | 健康检查/指标/SLO/告警 |
| **Communication** | 外迁到 8084 | 通讯总线 | mail/notification/im API |
| **Plugin Registry** | `/api/plugins` | 插件生命周期 | 注册/发现/心跳/动态导航 |

**⚠️ 硬约束**：Monitor 必须有公开的健康检查端点 `/api/monitor/health`（无需认证），返回服务健康状态数组。

### 6.2 扩展服务（独立进程 8082-8090）

| 服务 | 端口 | 路径 | 职责 |
|------|------|------|------|
| **Search** | 8082 | `/api/search` | 全文搜索（跨模块统一搜索） |
| **Communication** | 8084 | `/api/communication` | 邮件(SMTP)/站内通知/IM API |
| **Billing** | 8085 | `/api/billing` | 计费/账单/发票/支付/退款/税务 |
| **Ticket** | 8086 | `/api/ticket` | 工单/评论/SLA/工作流（工单 SLA Phase V16.1） |
| **Feedback** | 8087 | `/api/feedback` | 用户反馈/SLA/批量处理 |
| **Lowcode** | 8088 | `/api/lowcode` | 低代码平台（后端占位，功能待立项） |
| **Master-Data** | 8090 | `/api/master-data` | 主数据管理（物料/客户/供应商编码治理） |

### 6.3 经营管理服务（8010-8019）

| 服务 | 端口 | 路径 | 职责 | 关键子模块 |
|------|------|------|------|-----------|
| **ERP** | 8010 | `/api/erp` | 企业资源计划 | 资产/库存/采购/销售/生产订单/合并报表/字典/地址簿/ERP适配器(SAP/Kingdee/Yonyou) · Saga: 采购订单处理/销售订单履约 |
| **Finance** | 8011 | `/api/finance` | 财务管理 | 凭证/预算/支付/税务/会计期间/费用/财务风险/合并报表（领域模型 CQRS） |
| **AI** | 8013 | `/api/ai` | 智能服务 | QA问答/文档处理/向量搜索/代码助手/多模态/AI助手/推荐/分析/AIAgent/知识库/RAG/pgvector |

**ERP 适配器模式（service_adapter/）**：
- `trait ErpAdapter`：统一定义外部 ERP 系统接口
- `KingdeeAdapter / SapAdapter / YonyouAdapter`：金蝶/SAP/用友具体实现
- `AdapterFactory`：根据配置动态选择适配器

### 6.4 协同办公服务（8020-8029）

| 服务 | 端口 | 路径 | 职责 |
|------|------|------|------|
| **HRM** | 8020 | `/api/hrm` | 人力资源（共享 schema） | 员工/部门/合同/考勤/假期/招聘/培训/绩效/薪资 · HRM 技能向量匹配（AI） |
| **PM** | 8023 | `/api/pm` | 项目管理 | 项目/任务/团队/资源/风险/预算/质量/验收/结算/报告（含 PM-Report 图表组件：RiskPieChart/StatusPieChart/BudgetCard） |
| **CRM** | 8029 | `/api/crm` | 客户关系 | 客户/联系人/商机/合同/交互/退货/销售漏斗/线索评分/预测 |

### 6.5 生产制造服务（8030-8039）

| 服务 | 端口 | 路径 | 职责 |
|------|------|------|------|
| **MES** | 8030 | `/api/mes` | 制造执行（WebSocket: /ws/mes） | 工单/工位/设备/工艺流程/在制品/质量/排班/报工 · 生产看板实时推送 · APS 排程 |
| **PDM** | 8031 | `/api/pdm` | 产品数据管理 | 产品/BOM（物料清单）/版本/工艺路线/工程变更/文档审批 |

### 6.6 供应链服务（8040-8049）

| 服务 | 端口 | 路径 | 职责 |
|------|------|------|------|
| **SCM** | 8040 | `/api/scm` | 供应链管理 | 需求计划(MRP)/采购/工厂/供应商协同 · 同步记录审计 |
| **WMS** | 8041 | `/api/wms` | 仓储管理 | 入库/出库/移库/盘点/库存/批次/库位/波次拣货/劳动力/序列化 |
| **SRM** | 8042 | `/api/srm` | 供应商关系 | 供应商管理/招投标/询价/报价/订单/财务结算 |

### 6.7 质量/研发服务（8050-8059）

| 服务 | 端口 | 路径 | 职责 |
|------|------|------|------|
| **QMS** | 8050 | `/api/qms` | 质量管理 | 标准/检验/APQP/FMEA/SPC/8D报告/质量成本/改进 |
| **LIMS** | 8051 | `/api/lims` | 实验室管理 | 样品/检验任务/检验方法/仪器管理/试剂/条码/采集任务 |
| **EHS** | 8052 | `/api/ehs` | 环境健康安全 | 风险/隐患/事故/应急/合规/检查/培训/环境监测 |
| **RD** | 8053 | `/api/rd` | 研发管理（⚠️schema: rs,public） | 研发项目/缺陷/实验/配方/物料/构建/部署/测试/发布评审 |

### 6.8 数据/基础设施服务（8060-8079）

| 服务 | 端口 | 路径 | 职责 |
|------|------|------|------|
| **BI (Analytics)** | 8060 | `/api/bi` + `/api/analytics` | 商业智能/报表 | 仪表盘/数据集/数据源/组件/报表/权限/同步 · WebSocket: /ws/bi/dashboard/{id} 实时推送 |
| **Portal** | 8063 | `/api/portal` | 企业门户 BFF | GraphQL 聚合层（async-graphql）· 数据加载器(DataLoader) · 联邦查询/订阅 |
| **Mobile** | 8070 | `/api/mobile` | 移动端后端 | 移动审批/工单/客户/设备/文档/项目/质量/离线同步/Push |
| **GIS** | 8071 | `/api/gis` | 地理信息（WS: /ws/gis） | 地图/设备/围栏/管线/存储/业务标注 · Leaflet + Three.js 3D · 离线瓦片缓存 |
| **Integration** | 8072 | `/api/integration` | 系统集成 | 外部系统数据同步/ETL/适配器 |

---

## 7. 关键类与函数

### 7.1 后端核心（Rust）

#### shared-bootstrap 启动引导

**函数: `bootstrap_service(config: &ServiceConfig) -> Result<BootstrapContext>`**
- 位置: `lib/shared-bootstrap/src/lib.rs`
- 职责: 初始化 telemetry、加载环境变量、创建 auth_state、创建 event_publisher、验证数据库连接
- 返回: `BootstrapContext { auth_state, event_publisher, db_pool, telemetry_guard }`

**函数: `run(app: Application) -> Result<()>`**
- 位置: `lib/shared-bootstrap/src/lib.rs`
- 职责: 绑定 TCP 端口、启动 Axum 服务器、优雅关闭信号处理
- `Application { router: Router, port: u16, name: &'static str }`

**结构体: `ServiceConfig`**
```rust
pub struct ServiceConfig {
    pub name: &'static str,           // 如 "topems-ai"
    pub port: u16,                    // 默认端口（如 8013）
    pub port_env_var: Option<&'static str>,  // 环境变量覆盖（如 "AI_PORT"）
    pub max_db_connections: u32,      // 数据库连接池大小
    pub enable_events: bool,          // 是否启用事件总线
    pub api_prefix: &'static str,     // 标准路径前缀（如 "/api/ai"）
    pub legacy_prefixes: &'static [&'static str], // 兼容旧路径
    pub search_path: &'static str,    // PostgreSQL search_path
}
```

#### shared-auth 认证中间件

**函数: `auth_middleware` (axum Layer)**
- 位置: `lib/shared-auth/src/auth.rs`
- 流程: 从 Authorization header 提取 Bearer token → `verify_jwt_token()` → 注入 `Extension<Claims>`
- 公共路径白名单: `/health`, `/auth/login`, `/metrics`, `/api/plugins/*`

**⚠️ 硬约束: 中间件顺序**
```rust
// ❌ 错误（500: Missing Claims）
.layer(auth_middleware).layer(tenant_middleware)

// ✅ 正确（auth_middleware 外层先执行）
.layer(tenant_middleware).layer(auth_middleware)
```

**函数: `tenant_middleware`**
- 位置: `lib/shared-auth/src/middleware/tenant.rs`
- 依赖: `Extension<Claims>`（由 auth_middleware 提供）
- 职责: 从 Claims.tenant_id 提取租户 → 设置 DB Schema search_path → 审计上下文

**结构体: `Claims`**
```rust
pub struct Claims {
    pub sub: Uuid,           // 用户 ID
    pub tenant_id: Uuid,     // 租户 ID（RLS 依据）
    pub role: String,        // 角色名
    pub permissions: Vec<String>,  // 权限码列表
    pub exp: usize,          // 过期时间
}
```

#### shared-core 统一响应

**函数: `into_response` for `ApiResponse<T>`**
- 位置: `lib/shared-core/src/response.rs`
- 统一响应格式:
```json
{
  "code": 0,
  "message": "success",
  "data": { "...": "..." },
  "request_id": "uuid"
}
```

**函数: `register_routes_with_legacy_alias(router, prefix, legacy_prefixes)`**
- 位置: `lib/shared-core/src/api_version.rs`
- 职责: 为新路径注册路由的同时，自动挂载旧路径别名（实现平滑迁移）

### 7.2 前端核心（TypeScript）

#### 统一 API 客户端

**类: `ApiClient`** (src/api/client.ts)

```typescript
class ApiClient {
  clients: Map<ServiceName, TypedAxiosInstance>;
  constructor(services: ServiceConfig[]);
  getClient(name: ServiceName): TypedAxiosInstance;
  // 快捷方法（用 master client）
  get<T>(url, config?): Promise<ApiResponse<T>>;
  post<T>(url, data?, config?): Promise<ApiResponse<T>>;
  setAuthToken(token: string): void;
  clearAuthToken(): void;
}
```

**函数: `handleResponse<T>(response, options?)`** (src/api/request.ts)
- 职责: 统一解包 `{ code, message, data }` → code 非 0 抛错 → 可选静默处理 → 日志记录
- 错误处理: 401 → `handleAuthError()`（清 token + 触发 auth:unauthorized）

#### React Hooks

**Hook: `useAuth()`** (src/hooks/useAuth.tsx)
- 返回: `{ user, token, roles, permissions, login, logout, refresh, isAuthenticated }`
- 状态源: authStore + localStorage 持久化

**Hook: `usePermission()`** (src/hooks/usePermission.ts)
- 核心方法: `hasPermission(code)`, `hasRole(role)`, `requireAll([...])`, `requireAny([...])`

**Hook: `useCrudForm<T>()`** (src/hooks/useCrudForm.ts)
- 封装: React Hook Form + Zod Schema + React Query Mutation
- 返回: `{ form, methods, handleSubmit, isSubmitting, open, setOpen, entity }`

**Hook: `useDataTable<T>()`** (src/hooks/useDataTable.ts)
- 封装: TanStack Table + React Query useQuery + 分页/筛选/排序状态
- 标准化列定义: 从 Zod Schema 自动生成 `toColumnDef(schema)`

#### Zustand Store

**Store: `authStore`** (src/store/authStore.ts)
```typescript
type AuthState = {
  user: User | null;
  token: string | null;
  roles: Role[];
  permissions: string[];
  login: (creds) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};
```

**Store: `uiStore`** (src/store/uiStore.ts)
- `sidebarCollapsed` / `drawerOpen` / `modalStack` / `globalLoading`

### 7.3 Python CLI 工具

位置: [cli/](file:///Users/xingzhai/TOPEMS/cli/) · 入口: `cli/bin/topems`

| 命令组 | 子命令 | 功能 |
|--------|--------|------|
| **topems db** | `init` | 创建数据库和用户 |
| | `migrate` | 运行数据库迁移（创建表+初始化权限70+） |
| | `backup` / `restore <file>` | 备份/恢复 |
| | `reset` | 重置数据库 |
| **topems service** | `list` | 服务列表 |
| | `status <name>` | 健康检查 |
| | `start <name>` / `stop <name>` | 启停服务 |
| **topems health** | `check-all` | 全服务健康探测 |

---

## 8. 依赖关系

### 8.1 后端 Cargo 依赖关系（简化）

```
业务服务 (svc/*)
  ├── topems-shared-bootstrap     # 启动引导（所有服务必须）
  ├── topems-shared-auth          # 认证/权限/中间件（所有服务必须）
  ├── topems-shared-core          # 基础工具（所有服务必须）
  ├── topems-shared-db            # 数据库访问（需要持久化的服务）
  ├── topems-shared-event         # 事件总线（需要跨服务通信）
  ├── topems-shared-service-client # 调用其他服务（需要服务间调用）
  ├── topems-shared-observability # 遥测监控（推荐所有）
  ├── topems-shared-ai            # AI 能力（仅 AI/HRM/需要向量搜索）
  └── topems-shared               # 门面（可选，建议直接用子 crate）

shared-ai  ──► shared-core, shared-db
shared-service-client ──► shared-core, shared-auth
shared-event ──► shared-core, shared-db
```

### 8.2 前端 pnpm 依赖关系

```
apps/web (topems-portal)
  ├── @topems/shared-types        # 类型定义
  ├── @topems/shared-utils        # 工具函数
  ├── @topems/shared-constants    # 常量
  ├── @topems/shared-components   # UI 组件
  ├── @topems/shared-hooks        # Hooks
  └── @topems/tokens              # Design Tokens

shared-components ──► shared-types, shared-utils, shared-hooks, tokens
shared-hooks ──► shared-types, shared-utils
shared-types ──► (无内部依赖)
tokens ──► (无内部依赖)
```

### 8.3 服务间调用（后端 → 后端）

典型调用链（通过 shared-service-client）：
```
AI DocumentService ──► File Service (文件下载)
ERP PurchaseOrder ──► HRM (审批人信息) / WMS (库存扣减) / Finance (应付生成)
Finance Voucher ──► ERP (业务单据查询)
PM Resource ──► HRM (员工查询)
CRM Order ──► ERP (销售订单下发) / WMS (出库)
WorkFlow Approval ──► IAM (权限检查) / Notification (消息推送)
```

---

## 9. 项目运行方式

### 9.1 环境要求

| 环境 | 最低版本 | 推荐版本 | 说明 |
|------|---------|---------|------|
| Node.js | 20.x | 22.x LTS | 前端构建 |
| pnpm | 8+ | 9.15.9 | Monorepo 包管理（packageManager 锁定） |
| Rust | 1.75+ | stable 最新 | 后端编译（见 rust-toolchain.toml） |
| PostgreSQL | 16+ | 16.x | 主数据库 |
| Redis | 7+ | 7.2.x | 缓存/会话/消息/向量索引（可选，部分功能降级） |
| Ollama | - | latest | AI 本地模型（可选） |
| Python | 3.10+ | 3.12 | CLI 工具 |

### 9.2 快速启动步骤

```bash
# 1. 克隆项目
git clone <repo-url> && cd TOPEMS

# 2. 安装前端依赖
pnpm install

# 3. 启动数据库（macOS Homebrew 推荐）
brew services start postgresql@16
brew services start redis
createdb topems   # 默认库名

# 4. 环境变量（.env 有默认值，通常无需修改）
cp .env.example .env
# 生产环境必须设置 JWT_SECRET：openssl rand -base64 32

# 5. 初始化数据库
cd cli && pip install -e . && cd ..
topems db init
topems db migrate

# 6. 编译后端（先刷新离线缓存）
./scripts/topems.sh sqlx prepare --all          # SQLx 离线缓存（需数据库在线）
./scripts/topems.sh build-all --only-core       # 只编译核心服务（3-5分钟）
./scripts/topems.sh build-all                   # 全量编译（后端+前端）

# 7. 一键启动所有服务
./scripts/topems.sh start-all

# 8. 访问
# 前端: http://localhost:3000   默认账号: admin / admin123
# 后端: http://localhost:8000   (unified-core 健康检查)
```

### 9.3 分层启动命令

```bash
# ============== 前端单独启动 ==============
pnpm --filter topems-portal dev              # Host Shell:3000

# ============== 后端单独启动 ==============
./scripts/topems.sh start iam                # 核心 unified-core:8000
./scripts/topems.sh start erp                # ERP:8010
./scripts/topems.sh status                   # 查看所有服务状态
./scripts/topems.sh logs ai 100              # 查看 AI 服务最近 100 行日志
./scripts/topems.sh stop-all                 # 停止所有

# ============== 常用参数 ==============
./scripts/topems.sh build-all --only-core    # 只编译核心组
./scripts/topems.sh build-all --skip=ai      # 跳过 ai 包
./scripts/topems.sh start-all --no-frontend  # 只起后端
./scripts/topems.sh sqlx check-offline       # 验证所有包可离线编译
```

### 9.4 统一管理脚本

**位置**: [scripts/topems.sh](file:///Users/xingzhai/TOPEMS/scripts/topems.sh)

主要命令速查：
| 命令 | 说明 |
|------|------|
| `./scripts/topems.sh help` | 帮助 |
| `status [svc]` | 状态 |
| `start/stop/restart <svc>` | 启停单个 |
| `logs <svc> [lines]` | 日志 |
| `build <svc> [--online/--offline/--dev]` | 单包编译 |
| `build-all [--only-core/--skip=ai/--backend-only]` | 全量编译 |
| `start-all/stop-all/restart-all` | 批量启停 |
| `sqlx prepare --all | --pkg=topems-mes | --check` | SQLx 缓存管理 |
| `db start/stop/status/migrate/backup/restore` | 数据库操作 |
| `redis start/stop` | Redis 操作 |
| `reset-password [user] [pwd]` | 重置密码（默认 admin/admin123） |
| `check` | 检查并重启异常服务 |
| `run` / `run-stop` | 一键全栈启停 |

### 9.5 端口配置单一信源

权威来源：[config/ports.env](file:///Users/xingzhai/TOPEMS/config/ports.env)
同步脚本：`scripts/sync-ports.sh`（自动广播到 services.conf / docker/.env）

---

## 10. 开发指南

### 10.1 代码规范

| 检查项 | 工具 | 触发时机 |
|--------|------|---------|
| ESLint (TS/TSX) | eslint 10 + typescript-eslint | `pnpm lint` · pre-commit |
| Prettier | prettier 3.9 | `pnpm format` · pre-commit |
| TypeScript 类型 | tsc --noEmit | `pnpm typecheck` · CI |
| Rust clippy | cargo clippy | CI |
| Rust format | cargo fmt | CI |
| 设计系统合规 | `scripts/check-design-tokens.mjs` | CI |
| 无障碍(A11Y) | `scripts/ci/check-a11y.cjs` · eslint-plugin-jsx-a11y | CI |
| 提交信息规范 | commitlint + husky | git commit |

**Git 提交规范** ([.trae/rules/git-commit-message.md](file:///Users/xingzhai/TOPEMS/.trae/rules/git-commit-message.md))：
```
<type>(<scope>): <subject>
<body>
<footer>
# type: feat/fix/docs/style/refactor/perf/test/chore/ci/revert
# 示例: feat(auth): add wechat social login
```

### 10.2 新增后端服务步骤

1. **复制模板**: 参考 `svc/feedback/`（A 模式，最简）或 `svc/ai/`（C 模式，完整）
2. **注册到 Workspace**: `Cargo.toml` 的 `[workspace.members]` 追加路径
3. **端口分配**: 修改 `config/ports.env` + `config/services.yaml` + `apps/web/src/config/ports.ts`，运行 `scripts/sync-ports.sh`
4. **ServiceConfig**: `main.rs` 中设置 name/port/env_var/api_prefix/search_path
5. **路由注册**: 按标准模式写 `routes.rs`（public + protected，路径只在 nest 处加一次前缀）
6. **schema**: 创建对应的 PostgreSQL schema（迁移脚本）
7. **plugin.yaml**: 插件元数据（版本/依赖/导航配置）
8. **Vite 代理**: `apps/web/vite.config.ts` 的 SERVICES 数组追加配置
9. **前端 API**: `apps/web/src/api/<svc>/` 下新建 index.ts + API 方法
10. **模块路由**: `apps/web/src/modules/<svc>/config.ts` + `apps/web/src/routes/` 注册

### 10.3 新增前端页面步骤

1. **Zod Schema**: `apps/web/src/schemas/<module>/<entity>.ts` 定义表单校验
2. **Page Hook**: 优先使用 `useCrudForm` + `useDataTable` 标准化模式
3. **API 方法**: `apps/web/src/api/<svc>/<entity>.ts` 写 CRUD 调用
4. **页面组件**: 用 `templates/CRUDPage` 模板（自动整合 DataTable + 表单对话框 + 查询筛选）
5. **路由注册**: `apps/web/src/routes/` 下对应模块追加 route
6. **导航树**: `apps/web/src/layouts/navTree.ts` 追加菜单项 + 权限码

---

## 11. 测试策略

### 11.1 测试金字塔

```
         /E2E Tests\         Playwright: 关键用户旅程 (API + UI)
        /Integration\         Vitest: 跨模块数据流/路由对齐/错误处理
       /Component Tests\      Vitest + Testing Library: 渲染/交互
      /Unit Tests (hooks)\    Vitest: useCrud/useDebounce 等
     /Unit Tests (utils)\     Vitest: clone/date/string/storage 等
    /Unit Tests (shared)\     packages/*/src/__tests__: 共享包
   /Rust lib tests\           lib/tests/*.rs: auth/audit/cache/response
  /Rust service tests\        svc/*/tests/*.rs: AI/RD 等有集成测试
 /Pre-commit hooks\           lint-staged: prettier + eslint 增量
```

### 11.2 测试文件分布（当前已覆盖，来自最近提交）

**前端共享包（packages/*）**：
- `shared-components/__tests__/`: 16 个组件渲染测试（ActionButton/DataTable/FormField/Pagination/StatusBadge 等）
- `shared-hooks/__tests__/`: useCrud/useDebounce/useIntersectionObserver
- `shared-utils/__tests__/`: clone/date/function/i18n/id/number/request/storage/string/validate
- `shared-types/__tests__/`: openapi-adapter 类型绑定

**Host Shell (apps/web) — 累计 230+ 组件/集成用例**：

| 模块分组 | 测试文件 | 关键覆盖组件 | 用例数 | 批次 |
|---------|---------|-------------|-------|------|
| **AI** | `DashboardComponents.test.tsx` | DashboardHero/DashboardStats/DashboardQuickActions/FeatureCard/DashboardFeatures/RecentItem/DashboardRecentActivity/MiniChart/DashboardTrend | 23 | V82 P1 |
| | AiModule 旧测试修复 | localStorage polyfill 补齐 | — | V82 P1 |
| **CRM + HRM** | `CrmCrudPages.test.tsx` | ContactManagementPage/InteractionManagementPage/ReturnListPage（面包屑/Schema/API Adapter/CRUD 路径） | 13+8 | V82 P2 |
| | `EmployeeComponents.test.tsx` | EmployeeDetailDialog/EmployeeFormDialog/TreeViewComponent | | V82 P2 |
| **Admin** | `AdminDictionaryManagementComponents.test.tsx` | DictionarySidebar/DictionaryContent/DictionaryTypeModal | 13+ | V82 P3 (Admin 累计 52) |
| | `AdminRateLimitSecurityComponents.test.tsx` | RateLimitDimensionCard/RateLimitPathRules/AntiReplayConfigPanel | | V82 P3 |
| **Document** | `DocumentBasicComponents.test.tsx` | StatCard/DocumentFilters/DocumentBatchActions/DocumentUploadProgress/FileCard | 11 | V82 P4 |
| **LIMS + MES** | `LimsInstrumentComponents.test.tsx` | 统计卡/工具栏/仪器数据表/采集任务表/解析规则表 | 48 | V82 P5 |
| | `MesProductionBoardComponents.test.tsx` | 统计卡/报警列表/设备状态/工站利用率/甘特图 | | V82 P5 |
| | Workflow/Shared/System 组件批次 | 若干 | | V82 P5 |
| **Mobile** | `MobileProductionAndApproval.test.tsx` | MobileProductionActions/Filters/Card + ApprovalCard | 41 | V82 P6-P7 |
| | `MobileApprovalQualityLists.test.tsx` | ApprovalFilter/List + MobileQualityTaskList/DefectList | | V82 P6-P7 |
| | ApprovalCard 修复 | ListItemText HTML 嵌套规范（`div → span`） | | V82 P7 |
| **集成测试** | 6 文件 | api-crud-flow / cross-module-flow / error-handling / path-constants / route-nav-alignment / navigation | 50+ | 分批 |

**后端 Rust**：
- `lib/tests/*.rs`: auth/audit/cache/error/health/permission/response/rls/service_client/tenant_isolation/observability
- `svc/rd/tests/`: api_tests + rs_tests
- `svc/portal/tests/`: smoke 测试
- **健康门禁**：cargo clippy --workspace 0 warning (V74) · cargo check 0 error (V178)
- **V203 后端覆盖率冲刺**（2026-08-13）：从 14 个低覆盖率 svc crate 中提取 247 个纯函数（无 DB/async/外部依赖），新增 1439+ 单元测试，全部 crate 的 llvm-cov region coverage > 10% P1 阈值

#### 11.2.1 V203 后端覆盖率冲刺详情（4 轮并行 · 18 crate · 1439+ tests）

| 轮次 | 模块 | 测试数 | Regions 覆盖率 | Functions 覆盖率 | 纯函数数 | 关键纯函数 |
|---|---|---|---|---|---|---|
| R1 | svc/ehs | 74 | 42.35% | 20.86% | 21 | `ghs_hazard_class` / `flash_point_class` / `validate_cas` / `lec_score` |
| R1 | svc/srm | 75 | 11.98% | 15.19% | 18 | `calculate_evaluation_total` / `supplier_performance_grade` |
| R1 | svc/pdm | 89 | 63.00% | 33.51% | 16 | `explode_bom` / `diff_bom_single_level` / `bump_version` |
| R2 | svc/monitor | 134 | 46.50% | 52.60% | 21 | `evaluate_threshold` / `calculate_burn_rate` / `slo_status_from_compliance` |
| R2 | svc/mobile | 176 | 52.79% | 46.34% | 32 | `validate_barcode_format` / `calculate_ean13_checksum` / `resolve_sync_conflict` |
| R2 | svc/communication | 104 | 64.31% | 52.85% | 20 | `validate_email` / `render_template` / `haversine_distance` |
| R3 | svc/master-data | 131 | 35.91% | 24.89% | 16 | `calculate_quality_score` / `compare_versions` / `validate_field_type` |
| R3 | svc/ticket | 64 | 62.52% | 65.49% | 10 | `is_sla_breached` / `sla_compliance_rate` / `derive_priority` |
| R3 | svc/billing | 135 | 98.25% | 93.71% | 23 | `calculate_invoice_total` / `calculate_late_fee` / `calculate_proration` |
| R3 | svc/search | 73 | 88.69% | 87.88% | 11 | `calculate_relevance` / `highlight_term` / `extract_snippet` |
| R4 | svc/lowcode | 57 | 90.34% | 56.92% | 10 | `evaluate_simple_expression` / `validate_json_schema` / `calculate_component_depth` |
| R4 | svc/feedback | 72 | 97.59% | 92.39% | 12 | `classify_feedback_category` / `sentiment_from_rating` / `feedback_priority` |
| R4 | svc/plugin-registry | 138 | 81.40% | 68.16% | 19 | `parse_plugin_version` / `calculate_upgrade_path` / `has_circular_dependency` |
| R4 | svc/pm | 119 | 12.11% | 19.06% | 19 | `calculate_budget_variance` / `calculate_cpi` / `calculate_spi` / `calculate_roi` |
| **合计** | **14 crate** | **1439** | **全部 > 10%** ✅ | | **247** | |

**纯函数提取策略**：优先处理数据解析、统计计算、规则判定、状态机等无副作用逻辑，避免依赖数据库或外部服务。每个纯函数添加 `#[cfg(test)] mod tests` 测试模块，覆盖空值/零值/边界/正常/错误场景。

**关键 bug 修复**：
- `svc/pdm/modules/mod.rs` 未注册 `version_logic` 模块 → 42 个测试从未编译运行
- `svc/communication/lib.rs` 未注册 `im_location` 模块 → 地理位置计算测试无法通过
- 多处 `mod tests { };` 结尾多余分号导致编译错误
- `str_as_str()` unstable API → 改用显式 `&str` 类型标注

### 11.3 测试命令

```bash
# ============= 前端测试 =============
pnpm --filter topems-portal test              # 全部测试（unit + component）
pnpm --filter topems-portal test:unit         # 单元测试项目
pnpm --filter topems-portal test:component    # 组件渲染测试项目
pnpm --filter topems-portal test:shard:1/8    # 分片执行（CI 并行加速）
pnpm --filter topems-portal e2e               # Playwright E2E
pnpm --filter topems-portal e2e:api           # 仅 API 层 E2E
pnpm typecheck                                # tsc --noEmit（全 monorepo 入口）
pnpm lint; pnpm format:check                  # 代码风格

# ============= 共享包测试 =============
pnpm --filter @topems/shared-components test  # 单个共享包测试

# ============= 后端测试 =============
cargo test --workspace                         # 所有 Rust crate 测试
cargo test -p topems-shared                    # 共享库测试
cargo clippy --workspace -- -D warnings        # 严格检查（V60 已零警告）

# ============= 后端覆盖率（V203） =============
# 单 crate 覆盖率报告
LLVM_COV=/opt/homebrew/opt/llvm/bin/llvm-cov \
LLVM_PROFDATA=/opt/homebrew/opt/llvm/bin/llvm-profdata \
CARGO_INCREMENTAL=0 cargo llvm-cov --package topems-billing --lib --summary-only

# 全量覆盖率基线（fast mode: 24 core svc crate）
bash scripts/ci/coverage-baseline.sh
```

---

## 12. 下一步工作规划

### 12.1 当前进度基线（截至 V203 / 2026-08-13）

**已完成里程碑（最近提交 + 仓库状态）**：
- **最新提交**: `test(svc): extract pure functions and add unit tests for 18 low-coverage crates` — V203 后端覆盖率冲刺
- **V203 后端覆盖率冲刺**（2026-08-13）：4 轮并行，14 个 svc crate，247 纯函数，1439+ 单测，全部 > 10% P1 阈值
  - R1: ehs(74) / srm(75) / pdm(89) — GHS 分类 / 供应商评分 / BOM 展开
  - R2: monitor(134) / mobile(176) / communication(104) — 告警 SLO / 条码 / 邮件
  - R3: master-data(131) / ticket(64) / billing(135) / search(73) — 数据质量 / SLA / 发票 / 搜索
  - R4: lowcode(57) / feedback(72) / plugin-registry(138) / pm(119) — 工作流 / 反馈 / Semver / EVM
- **V182 导航架构 100% 闭环**：页面存在性(316/316) · 路由注册(350/350) · 权限三段式(384/384) = 1050/1050 综合覆盖率（自 V68.3 起 7 个版本迭代）
- V81 Phase 1-4：架构审计报告（数据层、路由、处理器、整合）
- V77-V78：架构审计（共享库拆分、依赖治理）
- V73：兼容性与死代码清理（compat-deadcode.json 执行完毕）
- V70-2：topems-shared 去门面化闭环（29 服务迁移完毕，≤30 条保留 re-export）
- V66.2：Shared Bootstrap V2 100% 覆盖（28/28 服务）
- **V182 导航架构 100% 闭环**：页面存在性(316/316) · 路由注册(350/350) · 权限三段式(384/384) = 1050/1050 综合覆盖率（自 V68.3 起 7 个版本迭代）
- **V178-V181 API 绑定健康修复**：PM usePmReport 返回类型补齐 / PM statistics.rs 13 编译错误清零 / 导航 permission 12 项 / workflow 脚本增强 / V82 全局 34 项清零
- **V82 测试覆盖（已推送 8 批次，截至 2026-08-11）**：
  - **P1**：AI Dashboard 组件 23 用例 + AiModule 旧测试修复（localStorage polyfill）
  - **P2**：CRM CRUD 页 + HRM 员工组件 13 用例
  - **P3**：Admin 字典 + 限流安全 13 用例（共 52 Admin）
  - **P4**：Document 基础组件 11 用例
  - **P5**：LIMS 仪器数据 + MES 生产看板 + Workflow/Shared/System 48 用例
  - **P6-P7**：Mobile 组件两批 41 用例（MobileProductionAndApproval + MobileApprovalQualityLists + ApprovalCard HTML 嵌套修复）
  - **总覆盖率提升**：共享包 100% 测试 · Host Shell 核心模块组件渲染 >230 用例 · typecheck/prettier/pre-commit 全部通过

**TODO.md 版本**: V203（[docs/roadmap/TODO.md](file:///Users/xingzhai/TOPEMS/docs/roadmap/TODO.md)，根 TODO.md 仅为快捷入口）
**项目版本**: v5.15.0（`package.json` + `CHANGELOG.md` 已同步）

### 12.2 V204 阶段：推荐下一步优先级

#### **[P0 - 已完成] V203: 后端覆盖率冲刺 18 crate × 1439+ tests ✅**

14 个 svc crate 全部 > 10% P1 阈值。详见 §11.2.1。

#### **[P0 - 立即启动] V82-2: 第二波组件渲染测试（价值高/依赖低）**

覆盖剩余高价值但依赖简单的模块组件，目标 **+40~60 用例**：

| 批次 | 模块 | 推荐覆盖组件 | 验收标准 |
|------|------|-------------|---------|
| V82-2a | **ERP/FINANCE** | `ErpFinanceSummaryCard`, `BudgetChart`, `VoucherListTable`, `AssetCard`, `ConsolidationScopeSelector` | 新增 Vitest 渲染测试 · 空数据/基础数据/关键文本 · typecheck + prettier 通过 |
| V82-2b | **SCM/WMS/SRM** | `MrpPlanChart`, `InboundOrderCard`, `InventoryHeatmap`, `SupplierScoreCard`, `TenderStatusBadge` | 同上 |
| V82-2c | **QMS/LIMS/EHS** | `SpcControlChart`, `FmeaSeverityMatrix`, `LimsSampleTimeline`, `EhsRiskRadarChart`, `IncidentTimeline` | 同上 |
| V82-2d | **GIS/BI/Portal** | `GisDeviceMapCard`, `BiWidgetRenderer`, `BiDashboardToolbar`, `PortalAnnouncementCard`, `KpiTrendCard` | 同上 |

**复用策略**：继续沿用 V82-1 批次的 smoke-batch 模式，每个测试文件独立，避免跨模块 mock 膨胀。
**验收标准（统一）**：
- 新增渲染测试覆盖 3 态：空数据 / 基础数据 / 关键文本
- 所有组件使用 `describe + it/test` 组织，禁用裸顶层 assertion
- `pnpm typecheck` 0 error · `pnpm format:check` 通过 · 本文件 `pnpm test` 全绿
- 新文件必须位于 `apps/web/src/__tests__/components/<ModuleName>Components.test.tsx`

#### **[P0 - 立即启动] V83-1: React Query 标准化审计 + 补齐**

对照项目记忆中的 `UNIFIED ROUTE PATTERN` + `QUERY PATTERN`，检查不一致项：

| 检查项 | 现状 | 目标 |
|--------|------|------|
| staleTime 配置 | 部分页面未显式设置 | **所有** useQuery 必须有 staleTime（推荐 5min） |
| QUERY_KEYS 命名 | 部分页面用 ad-hoc 数组 | 统一归入 `QUERY_KEYS.<module>.<entity>.<action>` |
| onSuccess invalidateQueries | 部分 mutation 只清单条 | 统一清层级 key（`invalidateQueries({ queryKey: [...]_def })`） |
| isPending 装载态 | 部分页面用 data === undefined 判断 | 统一用 isPending 控制骨架屏 |
| 分页状态 | 部分页面用 useState 而非 URL 同步 | 统一 useUrlState（search 模式）同步分页筛选到 URL |

**产出**: `docs/audit/V83.1-react-query-standardization-report.md` + 批量修复 PR。

#### **[P1 - 紧随] V83-2: CLI 能力补齐 + 自动化**

目前 `cli/`（Python）覆盖了 db/service/health 基础命令，需补齐：

| 新增命令 | 说明 |
|----------|------|
| `topems dev setup` | 一键本地开发环境初始化（brew install/createdb/迁移/编译/启动） |
| `topems test <scope>` | 调用 pnpm / cargo 对应测试命令（统一入口） |
| `topems generate module <name>` | 脚手架生成服务骨架（main.rs/Cargo.toml/plugin.yaml/routes.rs/vite 代理条目） |
| `topems doctor` | 环境自检：Node/Rust/PG/Redis 版本/端口占用/.env 缺失项 |
| `topems changelog` | 自动生成 CHANGELOG.md 增量（基于 git log） |

#### **[P1 - 紧随] V83-3: Code Wiki 与文档自动化（本次产出闭环）**

- [x] **本次完成**: Code Wiki V4.0 更新（架构/模块/关键类/依赖/运行方式）
- [ ] **后续跟进**: `gen:api-docs` 与 OpenAPI 类型生成流程接入 CI（`scripts/openapi/gen-types.mjs` + `bash scripts/openapi/generate.sh`）
- [ ] **后续跟进**: 新增/修改服务时自动更新 Code Wiki 对应章节（可由 CLI `generate module` 自动注入）

#### **[P2 - 中期] V84: P2-6 AI Copilot 闭环（设计已在 docs/superpowers/specs 归档）**

spec 已存：`docs/superpowers/specs/2026-08-11-v69-2-p2-6-ai-copilot-refactor.md`
最小闭环范围：
1. 全局 AI FAB Popover → 320×420 Copilot 悬浮窗（复用 FloatingAIHelper + useAIContext）
2. 文本选中气泡组件（4 动作：解释/翻译/优化/问 AI）
3. AI 首页「AI 推荐入口 TopN」区域
4. AiDashboardPage 集成 3 个入口点

#### **[P2 - 中期] V84-2: 端到端测试补齐**

Playwright `tests/e2e/` 目前有 helpers，缺少实际用例。建议首批覆盖：
- E2E-1: 登录 → 导航到 AI → 发送问答 → 校验响应渲染
- E2E-2: 登录 → HRM 员工列表 → 新增 → 提交 → 查询确认存在 → 删除
- E2E-3: 登录 → PM 项目 → 创建项目 → 关联风险 → 报告页图表正常

#### **[P3 - 远景] V85: 性能优化专题**

- Lighthouse CI 基线 + 性能预算（`lighthouserc.cjs` 已存在，接入 CI）
- Vite Build 产物分析：rollup-plugin-visualizer 报告常态化
- Rust release profile 验证（当前 thin-LTO + codegen-units=16，测量实际 TTI 差异）

### 12.3 建议工作节奏（一周计划）

```
Day 1  上午: V82-2a (ERP/FINANCE) 组件测试  PR#1
       下午: V82-2b (SCM/WMS/SRM) 组件测试 PR#2
Day 2  上午: V82-2c (QMS/LIMS/EHS) 组件测试 PR#3
       下午: V82-2d (GIS/BI/Portal) 组件测试 PR#4 + 推送 main
Day 3  上午: V83-1 React Query 审计（grep 扫描 + 报告输出）
       下午: 批量修复 PR#5
Day 4  全天: V83-2 CLI 能力补齐（dev setup / test / doctor） PR#6
Day 5  上午: V82-2 + V83-1 + V83-2 回归验证（全量 typecheck/test/pre-commit）
       下午: 更新路线图 TODO.md V183 → V184 + 里程碑记录
```

### 12.4 下一步规划决策依据（为什么先做 V82-2 / V83-1）

| 排序 | 任务 | 投入 | 收益 | 风险 | 决策理由 |
|-----|------|-----|-----|-----|---------|
| ✅ | **V203 后端覆盖率冲刺** | 4 轮并行 | 14 crate × 1439+ tests · 全部 > 10% P1 | 低 | 已完成 ✅ |
| 1 | **V82-2 第二波组件测试** | 2 天 · 4 PR | 组件渲染覆盖率 +40~60 用例 · 后续重构有回归网 | 低 | 依赖最低、模式成熟（已跑 8 批次）、收益即时可见 |
| 2 | **V83-1 React Query 标准化** | 1 天 · 审计 + 1 PR | 统一缓存策略 · 消除 staleTime 不一致 · 减少 30% 无效请求 | 中 | 项目记忆已记录规范，但代码库实际落地率约 60%，先审计再修防漏改 |
| 3 | **V83-2 CLI 能力补齐** | 1 天 · 1 PR | 新人上手成本 -50% · `topems doctor` 拦截 90% 环境问题 | 中 | 脚本框架已存在（cli/tests 已有 4 测试文件），扩展命令风险可控 |
| 4 | V84 AI Copilot 闭环 | 3+ 天 | 产品体验提升 · AI 入口真实可用 | 高 | 涉及 3 层 UI 变更 + 交互链路长，需等基础设施稳定 |
| 5 | V84-2 E2E 补齐 | 2 天 | 关键用户旅程回归保障 | 中 | 依赖后端服务 + 测试数据，组件测试先做足再上 E2E |
| 6 | V85 性能专题 | 1+ 周 | 构建/运行性能可量化 | 低 | 当前 CI 门禁健康，优先级可后置 |

---

## 附录

### A. 硬约束速查（来自项目记忆）

| 约束项 | 规则 | 违规后果 |
|--------|------|---------|
| API 路径格式 | core: `/api/core/{svc}/{path}` · business: `/api/{svc}/{path}`（去掉 `/v1`） | 404 / Vite proxy 路径重复 |
| Vite proxy rewrite | **必须** `rewrite: (path) => path`（不修改） | apiClient baseURL 已带前缀，导致路径加倍 |
| Unified-core 内部模块 API | Doc/File/Mail/IM/Notification 走 `/api/core/{module}/{resource}`（模式 C） | 404（前端 apiClient.baseURL = `/api/core/{module}`） |
| Axum 动态参数格式 | `{id}` 非 `:id` | 编译/运行错误 |
| Middleware 顺序 | `layer(tenant_middleware).layer(auth_middleware)` — auth 外层 | 500 "Missing request extension of type Claims" |
| SQLx 编译 | 优先离线（.sqlx 缓存），失败自动切在线 | 编译失败需要 `./scripts/topems.sh sqlx prepare --all` |
| DB search_path | **每个服务显式设置**：业务用 `{svc}, public, shared`；unified-core 用 `public`；RD 特殊 `rs, public`；search 默认 `rs, erp, public` | 默认 search_path 多 schema 表名冲突 → 歧义 SQL |
| HRM 字段加密 | **必须**设置 `ENCRYPTION_KEY` 环境变量 | 启动 panic |
| Monitor 公开端点 | 必须有 `/api/monitor/health`（无需认证） | 健康检查探针 401 失败 → 服务误判宕机 |
| React Query singleton | MF shared 设置 `singleton: true, requiredVersion: ^5.0.0, strictVersion: true` | 多 QueryClient 实例 → 缓存不一致/invalidate 失效 |
| 路由定义顺序 | 具体路径如 `/statistics` 必须在动态参数 `/{id}` 之前 | 路径匹配错误（axum 0.8 甚至 panic overlapping routes） |
| Module Federation shared | `@tanstack/react-query` 必须 singleton | 见上 |

### B. 废弃服务清单（仅供参考，不参与构建）

| 废弃服务 | 已迁移至 | 说明 |
|---------|---------|------|
| svc/manufacturing | svc/mes + svc/pdm | 拆分独立部署 |
| svc/quality-assurance | svc/qms + svc/lims + svc/ehs | 拆分独立部署 |
| svc/bi | svc/analytics | 2026-06 合并 |
| svc/report | svc/analytics | 2026-07 合并 |
| svc/config-center | etcd + unified-core 配置管理 | 功能整合 |
| svc/shared | lib/topems_shared* | 功能下沉到共享 crate |
| svc/user-service | unified-core/modules/iam/user | 2026-07 迁移（原端口 8060 与 BI 冲突） |
| svc/monitor | unified-core/modules/monitor | 2026-07 迁移 · `/api/core/monitor/*` |
| svc/doc | unified-core/modules/doc | 2026-07 迁移 · `/api/core/doc/*` |

### C. 关键文件快速索引

| 文件 | 说明 |
|------|------|
| [README.md](file:///Users/xingzhai/TOPEMS/README.md) | 项目总览 + 快速开始 |
| [TODO.md](file:///Users/xingzhai/TOPEMS/docs/roadmap/TODO.md) | 任务路线图真相源（V182） |
| [Cargo.toml](file:///Users/xingzhai/TOPEMS/Cargo.toml) | Rust Workspace + 共享依赖版本 |
| [package.json](file:///Users/xingzhai/TOPEMS/package.json) | pnpm Monorepo 脚本入口 |
| [config/ports.env](file:///Users/xingzhai/TOPEMS/config/ports.env) | 端口单一信源（后端 + MF） |
| [config/services.yaml](file:///Users/xingzhai/TOPEMS/config/services.yaml) | 服务配置（bootstrap_mode/依赖/分组） |
| [scripts/topems.sh](file:///Users/xingzhai/TOPEMS/scripts/topems.sh) | 统一服务管理脚本 |
| [apps/web/vite.config.ts](file:///Users/xingzhai/TOPEMS/apps/web/vite.config.ts) | 前端构建 + 代理 + MF 配置 |
| [apps/web/src/config/ports.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/config/ports.ts) | 前端端口 TS 类型（与 ports.env 同步） |
| [apps/web/src/lib/apiClient.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/lib/apiClient.ts) | 统一 API 客户端导出层 |
| [apps/web/src/api/client.ts](file:///Users/xingzhai/TOPEMS/apps/web/src/api/client.ts) | 多服务 Axios 工厂 + 重试 |
| [lib/src/lib.rs](file:///Users/xingzhai/TOPEMS/lib/src/lib.rs) | topems-shared 门面 re-export（≤30 条） |
| [docs/architecture/overview.md](file:///Users/xingzhai/TOPEMS/docs/architecture/overview.md) | 架构总览（补充阅读） |
| [docs/api/openapi.yaml](file:///Users/xingzhai/TOPEMS/docs/api/openapi.yaml) | 完整 OpenAPI 规范 |

---

**最后更新**: 2026-08-12
**版本**: V183 / v5.15.0
**Code Wiki 版本**: v4.1
**本次更新重点**:
- V183 架构基线：导航 1050/1050 = 100% 全绿 · 项目版本 v5.15.0
- 测试分布表格化（批次/用例数/关键组件）
- V82-2 统一验收标准补充
- 新增 §12.4 决策依据表（为什么先做 V82-2 / V83-1）
