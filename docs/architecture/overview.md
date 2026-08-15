# TOPEMS 系统架构设计

> **架构版本**: V71（2026-08-11）· **Shared Bootstrap V2**: 28/28 服务 100% · **Plugin 自动注册**: 28/28 100% · **V68.0 质量门禁**: tsc 0 error · cargo check 0 error 0 warning · vite build ✅

## 概述

TOPEMS 是一个基于微服务架构的企业级数字化平台，提供统一的身份认证、流程自动化、文件管理、协同通讯等功能。系统采用 Rust 后端 + React 前端的现代化技术栈，支持企业级部署和扩展。

### 架构里程碑

**V66.2** — 完成 **Shared Bootstrap V2 五批次迁移专项（28/28 = 100%）**，所有业务服务的 `main.rs` 启动代码统一为三段式模板：
```
ServiceConfig (单一真相源) → bootstrap_service (统一初始化) → build_application (7层中间件自动装配) → run
```
三种复杂度模式（A/B/C）覆盖全部服务：无状态标准 10 个 + 自定义 state 13 个 + 自建 Application 5 个。

**V66.7** — 第三轮深度架构审计 31 项问题（P0×6 / P1×10 / P2×9 / P3×3）**全部 31/31 闭环** ✅

**V67.0** — 三大基建落地：
1. **统一列表响应 `ListResponse<T>`**：shared-core 定义 + 21 服务迁移完成
2. **Plugin 自动注册 100%**：补齐 master-data = 最后 1 个，全 28 服务覆盖
3. **超大页 TOP5 拆分达标**：AutomationDesignerPage -93% / DocumentsPage -45% / ProfilePage -56% / WorkflowApprovalDetail -72%

**V67.1** — 第四轮架构四探针并行审计 **67/67 全闭环** ✅（28 服务 plugin schema · 55 处 println→tracing · 17 文件死代码清理 · 12 服务 Docker 锚点压缩等）

**V67.2** — 数据层深度审计 P0 全闭环：审计日志覆盖率 25%→100% · ApprovalStatus 枚举统一 · EntitySchema maxLength 校验

**V67.3** — 前端 UI 代码优化 8 项全闭环：死文件清理、非规范导入修复、Tailwind 残留检查

**V68.0** — **质量门禁全通过**：`npx tsc --noEmit` 0 error · `cargo check --workspace` 0 error 0 warning · `npx vite build` ✅ · L3 导航子组 341 项 100% 对称 · CI 门禁上线

平台采用 **插件化架构** 和 **微前端** 设计理念，支持按需加载业务模块，具备高度的可扩展性和灵活性。

## 架构设计原则

### 核心原则

1. **微服务架构** - 每个服务独立部署、独立扩展，降低耦合度
2. **统一认证** - 集中化的 IAM 服务提供统一认证和权限管理
3. **API 优先** - RESTful API 设计，前后端完全分离
4. **高可用性** - 服务健康检查，自动重启，故障转移
5. **可观察性** - 日志、监控、追踪完整覆盖
6. **安全第一** - HTTPS 强制，数据加密，权限隔离

### 设计理念

1. **插件化** - 业务模块以插件形式存在，支持热插拔
2. **渐进式加载** - 按需加载模块，减少首屏加载时间
3. **统一规范** - 遵循统一的代码规范、API 规范、UI 规范
4. **领域驱动设计** - 按业务领域划分服务边界
5. **最终一致性** - 跨服务数据同步采用事件驱动，保证最终一致性

## 系统架构图

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend UI                          │
│              React + TypeScript + Vite + Tailwind          │
│           Module Federation + Plugin Architecture          │
│           (Port 3000/5173 - Development)                   │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTP/HTTPS / WebSocket
┌─────────────────────────────┴───────────────────────────────┐
│                    Nginx / API Gateway                      │
│                      (Port 80/443)                          │
│              - 反向代理     - SSL 终止                      │
│              - 请求路由     - 负载均衡                      │
│              - 静态资源服务 - CORS 处理                     │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                    unified-core (Port 8000)                  │
│          IAM • FLOW • FILE • COMMUNICATION                    │
│          ┌─────────────────────────────────────────┐        │
│          │  NavigationRegistry • PluginManager     │        │
│          │  EventBus • ServiceRegistry             │        │
│          └─────────────────────────────────────────┘        │
└─────────────────────────────┬───────────────────────────────┘
                              │ REST API / EventBus
┌─────────────────────────────┴───────────────────────────────┐
│                    Business Services (27)                    │
│                                                              │
│  ERP(8010) │ Finance(8011) │ AI(8013)                      │
│  HRM(8020) │ PM(8023) │ CRM(8029)                          │
│  MES(8030) │ PDM(8031)                                      │
│  SCM(8040) │ WMS(8041) │ SRM(8042)                         │
│  QMS(8050) │ LIMS(8051)│ EHS(8052) │ RD(8053)             │
│  BI(8060)  │ Portal(8063)                                    │
│  Mobile(8070) │ GIS(8071) │ Integration(8072)              │
│  Search(8082) │ Comm(8084) │ Billing(8085) │ Ticket(8086)  │
│  Feedback(8087) │ Lowcode(8088) │ Master-Data(8090)        │
│                                                              │
│  合计 1 核心服务 unified-core(8000) + 27 业务服务 = 28 服务   │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────┴───────────────────────────────┐
│                    Data Layer                               │
│  PostgreSQL (5432)  •  Redis (6379)  •  Ollama (11434)     │
│  ┌──────────────────────────────────────────────────┐      │
│  │  Schema 隔离: public • iam • doc • erp • hrm... │      │
│  │  扩展: uuid-ossp • pgvector                      │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 前端架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Shell (Host App)                       │
│  ┌──────────┬───────────────────────────────────────────┐   │
│  │ Header   │ 顶部导航:  Logo • 全局搜索 • 通知 • 用户  │   │
│  ├──────────┼───────────────────────────────────────────┤   │
│  │ Sidebar  │ 二级分组菜单 + 三级页面菜单               │   │
│  ├──────────┼───────────────────────────────────────────┤   │
│  │ Tabs     │ 模块 Tab 标签页                          │   │
│  ├──────────┼───────────────────────────────────────────┤   │
│  │ Content  │ 远程模块 (Remote Modules)                │   │
│  │          │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐       │   │
│  │          │  │ ERP │ │ HRM │ │ CRM │ │ MES │ ...   │   │
│  │          │  └─────┘ └─────┘ └─────┘ └─────┘       │   │
│  └──────────┴───────────────────────────────────────────┘   │
│                                                              │
│  Core Services:                                              │
│  - NavigationRegistry (动态导航注册)                        │
│  - PluginManager (插件生命周期管理)                         │
│  - EventBus (事件总线)                                      │
│  - AuthProvider (认证上下文)                                │
│  - GlobalState (全局状态)                                   │
└─────────────────────────────────────────────────────────────┘
```

## 服务配置表（V71，28/28 服务 Shared Bootstrap V2 100%，Plugin 自动注册 100%）

| 服务 | 端口 | 业务域 | 说明 | API 前缀 | 状态 | **V2 模式** |
|------|------|--------|------|----------|------|-------------|
| **核心服务** | | | | | | |
| unified-core | 8000 | Core | 含 IAM/Doc/Flow/File/Communication/Monitor | /api/core/iam/, /api/core/doc/... | ✅ 核心 | **C**（Application 重建） |
| **经营管理 (8010-8019)** | | | | | | |
| erp | 8010 | ERP | 企业资源计划 | /api/erp/ | ✅ 已实现 | **B**（stateful + build_application） |
| finance | 8011 | ERP | 财务管理服务 | /api/finance/ | ✅ 已实现 | **A**（标准 build_application） |
| ai | 8013 | ERP | AI 智能服务 | /api/ai/ | ✅ 已实现 | **B** |
| **协同办公 (8020-8029)** | | | | | | |
| hrm | 8020 | Collab | 人力资源管理 | /api/hrm/ | ✅ 已实现 | **A** |
| pm | 8023 | Collab | 项目管理 | /api/pm/ | ✅ 已实现 | **B** |
| crm | 8029 | Collab | 客户关系管理 | /api/crm/ | ✅ 已实现 | **B** |
| **生产制造 (8030-8039)** | | | | | | |
| mes | 8030 | Mfg | 生产执行系统 | /api/mes/ | ✅ 已实现 | **B** |
| pdm | 8031 | Mfg | 产品数据管理 | /api/pdm/ | ✅ 已实现 | **B** |
| **供应链 (8040-8049)** | | | | | | |
| scm | 8040 | SCM | 供应链管理 | /api/scm/ | ✅ 已实现 | **B** |
| wms | 8041 | SCM | 仓储管理 | /api/wms/ | ✅ 已实现 | **A** |
| srm | 8042 | SCM | 供应商管理 | /api/srm/ | ✅ 已实现 | **B** |
| **质量/研发 (8050-8059)** | | | | | | |
| qms | 8050 | QA/R&D | 质量管理 | /api/qms/ | ✅ 已实现 | **B** |
| lims | 8051 | QA/R&D | 实验室信息管理 | /api/lims/ | ✅ 已实现 | **B** |
| ehs | 8052 | QA/R&D | 环境健康安全 | /api/ehs/ | ✅ 已实现 | **B** |
| rd | 8053 | QA/R&D | 研发管理 | /api/rd/ | ✅ 已实现 | **B** |
| **数据分析 (8060-8069)** | | | | | | |
| bi (analytics) | 8060 | BI | 商业智能（含报表服务） | /api/bi/, /api/report/ | ✅ 已实现 | **C**（自定义 Prometheus） |
| portal | 8063 | BI | 企业门户（GraphQL/WS/事件总线模拟器） | /api/portal/ | ✅ 已实现 | **C**（GraphQL + CookieManager） |
| **基础设施 (8070-8079)** | | | | | | |
| mobile | 8070 | Infra | 移动服务（6+ 服务客户端） | /api/mobile/ | ✅ 已实现 | **B**（8字段 AppState） |
| gis | 8071 | Infra | 地理信息服务（WebSocket 图层推送） | /api/gis/ | ✅ 已实现 | **C**（WebSocket Manager） |
| integration | 8072 | Infra | 集成服务（Webhook/Scheduler） | /api/integration/ | ✅ 已实现 | **C**（后台调度器） |
| **主数据 & 扩展服务 (8082-8090)** | | | | | | |
| search | 8082 | Extension | 全文搜索服务 | /api/search/ | ✅ 已实现 | **A** |
| communication | 8084 | Extension | 通讯服务（邮件/通知/IM） | /api/comm/ | ✅ 已实现 | **A** |
| billing | 8085 | Extension | 计费服务 | /api/billing/ | ✅ 已实现 | **A** |
| ticket | 8086 | Extension | 工单服务 | /api/ticket/ | ✅ 已实现 | **A** |
| feedback | 8087 | Extension | 反馈服务 | /api/feedback/ | ✅ 已实现 | **A** |
| lowcode | 8088 | Extension | 低代码引擎（占位） | /api/lowcode/ | ✅ 已实现 | **A** |
| master-data | 8090 | MasterData | 主数据管理 | /api/master-data/ | ✅ 已实现 | **A** |

> **状态说明**: ✅ 已实现 | 🔶 部分实现 | 📋 规划中
> **V2 模式说明**: **A** = 标准 `build_application`（10 个）· **B** = stateful + build_application（13 个）· **C** = `Application { router, port, name }` 自建（5 个）· 合计 28/28 = 100%

## 核心服务详解

### unified-core 统一核心服务 (Port 8000)

统一核心服务是 TOPEMS 平台的基础服务，承载以下内部模块：

| 模块 | URL 前缀 | 功能 |
|------|----------|------|
| iam | /api/iam/ | 身份认证、用户管理、权限管理、RBAC |
| doc | /api/doc/ | 文档管理、知识库、全文检索 |
| flow | /api/flow/ | 工作流引擎、流程定义与执行 |
| file | /api/file/ | 文件存储、上传下载、预览 |
| mail | /api/mail/ | 邮件发送、模板管理 |
| im | /api/comm/ | 即时通讯、消息收发 |
| notification | /api/notification/ | 通知服务、消息推送 |
| monitor | /api/core/monitor/ | 系统监控、健康检查、指标采集 |

### 核心基础设施组件

| 组件 | 说明 | 位置 |
|------|------|------|
| NavigationRegistry | 导航注册中心，动态注册/发现菜单 | unified-core + 前端 |
| PluginManager | 插件生命周期管理 | 前端 Shell |
| EventBus | 事件总线，服务间异步通信 | 后端 + 前端 |
| ServiceRegistry | 服务注册与发现 | unified-core |
| GlobalConfig | 全局配置管理 | unified-core |
| **ServiceConfigRegistry** | **集中化配置管理单例（V13.0）** | `lib/src/service_config.rs` |
| **ConsulServiceRegistrar** | **Consul 服务注册（V13.0）** | `lib/src/service_discovery.rs` |
| **SmartServiceClient** | **智能服务客户端（Consul + 回退，V13.0）** | `lib/src/service_discovery.rs` |
| **PluginHeartbeatMonitor** | **插件心跳超时检测后台任务（V13.0）** | `svc/unified-core/src/main.rs` |
| **🆕 Shared Bootstrap V2（V66.2 核心基础设施）** | **服务启动标准化框架 · ServiceConfig + bootstrap_service + build_application + run · 28/28 = 100%** | `lib/shared-bootstrap/src/lib.rs` |
| **V2-Mode-A Standard** | 标准 `build_application`（10 个）：PgPool + AuthState | 10 服务 |
| **V2-Mode-B Stateful** | 自定义 state 注入 `build_application`（13 个）：cache/tenant/6+ 客户端 | 13 服务 |
| **V2-Mode-C Custom** | `Application { router, port, name }` 重建（5 个）：WS/GraphQL/Cookie/后台任务 | 5 服务 |

### 插件化架构 (V13.0)

#### 架构整改背景

V13.0 针对插件化架构分析中的 7 大缺陷进行了全面整改：

| 缺陷 | 整改方案 | 关键文件 |
|------|---------|---------|
| 核心服务职责过重 | 移除 unified-core 中 erp/crm/hrm/wms/finance 残留 | `svc/unified-core/src/modules/mod.rs` |
| 插件注册无安全验证 | `PLUGIN_REGISTRATION_TOKEN` + `X-Plugin-Token` 令牌验证 | `svc/unified-core/src/modules/plugin/handlers/runtime.rs` |
| 服务发现未落地 | Consul 注册/发现 + 环境变量回退 | `lib/src/service_discovery.rs` |
| 前端插件化不彻底 | 后端导航配置 API + 前端动态获取 | `apps/web/src/lib/plugin-loader/PluginManager.ts` |
| 心跳超时无检测 | 后台任务每 30 秒检测，90 秒超时 | `svc/unified-core/src/main.rs` |
| 缺少依赖检查 | 安装正向 + 卸载反向依赖检查 | `svc/unified-core/src/modules/plugin/handlers/tenant_plugins.rs` |
| 配置分散 | ServiceConfigRegistry 集中化配置 | `lib/src/service_config.rs` |

#### 插件注册安全流程

```
插件服务启动
    │
    ▼
读取 PLUGIN_REGISTRATION_TOKEN 环境变量
    │
    ▼
POST /api/core/plugin/dev/plugins/{code}/register
Header: X-Plugin-Token: <token>
Body: { code, name, version, dependencies, navigation_config, ... }
    │
    ▼
unified-core 验证令牌
    │  ├─ 令牌未设置 → 开发模式，跳过验证
    │  ├─ 令牌匹配 → 注册成功
    │  └─ 令牌不匹配 → 403 拒绝注册
    │
    ▼
存储插件信息 + dependencies + navigation_config
    │
    ▼
插件定期 POST /heartbeat（携带令牌）
    │
    ▼
核心后台任务每 30 秒检测心跳
    │  ├─ last_heartbeat > 90 秒 → 标记 offline
    │  └─ 注册 > 2 分钟无心跳 → 标记 offline
```

#### 插件依赖检查

**安装时（正向检查）：**
```
安装 QMS 插件
    │
    ▼
查询 QMS 声明的 dependencies: ["erp", "mes"]
    │
    ▼
验证 erp、mes 是否已安装且激活
    │  ├─ 全部已安装 → 安装成功
    │  └─ 缺失依赖 → "Missing dependencies: [erp, mes]"
```

**卸载时（反向检查）：**
```
卸载 ERP 插件
    │
    ▼
查询 core_plugins WHERE dependencies @> '["erp"]'
    │
    ▼
查找依赖 ERP 的已安装插件
    │  ├─ 无依赖 → 允许卸载
    │  └─ 有依赖（如 QMS、RD）→ "Cannot uninstall: [qms, rd] depend(s) on this plugin"
```

#### 服务发现架构

```
客户端请求
    │
    ▼
SmartServiceClient
    │
    ├─ CONSUL_ENABLED=true?
    │   ├─ 是 → ConsulDiscoveryClient 发现服务
    │   │       ├─ 成功 → 返回服务实例
    │   │       └─ 失败 → 降级到环境变量
    │   └─ 否 → 直接使用环境变量
    │
    ▼
服务实例 URL
```

#### 前端动态导航

```
应用启动
    │
    ▼
PluginManager.fetchNavigationConfig()
    │
    ├─ 请求 /api/core/plugin/navigation-config
    │   ├─ 成功 → 使用后端动态导航配置（带缓存）
    │   └─ 失败 → 降级到本地静态 NavigationRegistry
    │
    ▼
渲染侧边栏菜单
```

#### 核心服务瘦身

V13.0 移除了 unified-core 中的业务模块残留：

| 已移除模块 | 原位置 | 现归属 |
|-----------|--------|--------|
| erp | `svc/unified-core/src/modules/erp/` | `svc/erp/`（独立服务） |
| crm | `svc/unified-core/src/modules/crm/` | `svc/crm/`（独立服务） |
| hrm | `svc/unified-core/src/modules/hrm/` | `svc/hrm/`（独立服务） |
| wms | `svc/unified-core/src/modules/wms/` | `svc/wms/`（独立服务） |
| finance | `svc/unified-core/src/modules/finance/` | `svc/finance/`（独立服务） |

unified-core 现仅保留核心模块：iam、doc、flow、file、mail、im、notification、plugin、search、communication。

### 服务间通信

#### 通信模式

```
1. 同步调用 (REST API)
   Service A ──HTTP──► Service B

2. 异步事件 (EventBus)
   Service A ──publish──► EventBus ──subscribe──► Service B

3. 数据共享 (PostgreSQL)
   Service A ──读──► 公共Schema ──写──► Service B
```

#### 主要通信关系

```
unified-core (8000) ←→ 所有业务服务 (认证、权限、导航)
qms (8050) ←→ lims (8051) ←→ ehs (8052) ←→ rd (8053)
scm (8040) ←→ wms (8041) ←→ srm (8042)
mes (8030) ←→ pdm (8031)
bi (8060, 含报表) ←→ unified-core (8000, 监控)
ai (8013) ←→ unified-core (8000, doc/flow 智能审批)
```

## 前端架构

### 微前端架构 (Module Federation)

采用 Webpack Module Federation 实现微前端：

- **Shell 应用**: 主框架，提供基础布局、认证、导航
- **Remote 模块**: 各业务模块独立开发、独立部署
- **共享依赖**: React、React Router、Zustand、Ant Design 等

### 四级导航架构

1. **Header 顶部导航**: Logo、全局搜索、通知、用户中心
2. **二级分组菜单**: 业务域分组（如"质量/研发"、"供应链"）
3. **三级页面菜单**: 模块内页面导航
4. **模块 Tab**: 多标签页切换，支持快捷操作

### 前端核心模块

| 模块 | 说明 | 路径 |
|------|------|------|
| Shell | 主框架，布局与导航 | `frontend/src/` |
| Plugin System | 插件系统 | `frontend/src/plugins/` |
| Navigation Registry | 动态导航注册 | `frontend/src/registry/` |
| Event Bus | 前端事件总线 | `frontend/src/utils/eventBus.ts` |
| Auth Provider | 认证上下文 | `frontend/src/contexts/` |
| Global State | 全局状态 (Zustand) | `frontend/src/stores/` |

## 技术栈

### 后端技术栈

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 语言 | Rust | 1.76+ | 高性能、安全的系统级语言 |
| Web 框架 | Axum | 0.7+ | Rust 生态主流 Web 框架 |
| 数据库 | PostgreSQL | 16+ | 关系型数据库，支持 JSON、向量 |
| ORM | SQLx | 0.7+ | 异步 SQL 执行器，编译时校验 |
| 缓存 | Redis | 7+ | 分布式缓存、会话存储 |
| 认证 | JWT | - | JSON Web Token |
| 实时通信 | WebSocket | - | 即时通讯、通知推送 |
| AI | Ollama | - | 本地大语言模型运行时 |
| 向量搜索 | pgvector | - | PostgreSQL 向量扩展 |
| 构建工具 | Cargo | - | Rust 包管理器 |

### 前端技术栈

| 类别 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 语言 | TypeScript | 5+ | 类型安全的 JavaScript |
| 框架 | React | 19 | UI 框架 |
| 构建工具 | Vite | 5+ | 快速构建工具 |
| UI 框架 | Tailwind CSS | 3+ | 原子化 CSS |
| UI 组件库 | Ant Design | 5+ | 企业级 UI 组件库 |
| 状态管理 | Zustand | 4+ | 轻量状态管理 |
| 路由 | React Router | 6+ | 前端路由 |
| 微前端 | Module Federation | - | 微前端架构 |
| 表单 | react-hook-form | - | 高性能表单库 |
| 图表 | ECharts / Recharts | - | 数据可视化 |
| HTTP 客户端 | Axios | - | HTTP 请求库 |

### DevOps 技术栈

| 类别 | 技术 | 说明 |
|------|------|------|
| 容器化 | Docker | 应用容器化 |
| 编排 | Docker Compose | 本地开发与测试 |
| 编排 | Kubernetes | 生产环境编排 (可选) |
| 反向代理 | Nginx | API 网关、静态资源服务 |
| 监控 | Prometheus (可选) | 系统监控 |
| 日志 | ELK Stack (可选) | 日志聚合 |
| CI/CD | GitHub Actions / GitLab CI | 持续集成 |

## 数据库设计

### 数据库策略

- **单一主数据库**: 所有服务共享一个 PostgreSQL 实例
- **Schema 隔离**: 每个服务使用独立的 Schema，避免表名冲突
- **连接池**: 每个服务有自己的数据库连接池
- **事务管理**: 服务内部支持事务，跨服务需要 Saga 模式或最终一致性

### Schema 划分

| Schema | 服务/模块 | 说明 |
|--------|-----------|------|
| public | 共享 | 全局配置、公共表、扩展 |
| unified_core | unified-core | 核心服务公共表 |
| iam | unified-core | 用户、角色、权限 |
| flow | unified-core | 流程定义、实例 |
| notification | unified-core | 通知、消息 |
| core_doc | unified-core | 文档管理 |
| core_ai | ai | AI 智能服务 |
| plugin_erp | erp | 财务、采购、销售 |
| plugin_hrm | hrm | 员工、考勤、绩效 |
| plugin_qms | qms | 质量标准、检验 |
| plugin_lims | lims | 样品、仪器、试剂 |
| plugin_ehs | ehs | 安全事件、环保 |
| plugin_rs | rd | 研发管理 |
| ... | ... | 各业务模块独立 Schema |

### 数据库扩展

| 扩展 | 说明 |
|------|------|
| uuid-ossp | UUID 生成函数 |
| pgvector | 向量搜索，支持 AI 知识库 |
| pg_trgm | 全文搜索优化 |

### 数据同步

- **实时同步**: 通过事件总线（EventBus）实现服务间数据同步
- **批量同步**: 定时任务进行数据批量同步
- **API 调用**: 服务间通过 REST API 调用获取数据
- **公共 Schema**: 跨服务共享数据通过 public schema 访问

## 安全设计

### 认证机制

```
用户登录 → 获取 JWT Token → Token 验证 → 权限检查 → 访问资源
```

- **JWT Token 认证**: 无状态认证，支持 Token 刷新
- **Token 刷新机制**: 访问 Token 过期前自动刷新
- **权限验证中间件**: 全局权限检查
- **RBAC 权限模型**: 基于角色的访问控制
- **细粒度权限**: 支持按钮级、数据级权限控制

### 数据安全

- **HTTPS 强制**: 所有对外接口强制 HTTPS
- **敏感数据加密**: 密码、个人信息等敏感数据加密存储
- **SQL 注入防护**: 使用 SQLx 参数化查询
- **XSS 防护**: 前端输入校验和输出转义
- **CSRF 防护**: Token 验证
- **数据脱敏**: 敏感数据展示时脱敏

### 访问控制

- **IP 白名单**: 生产环境可配置 IP 白名单
- **接口限流**: 防止恶意请求，支持按用户/IP 限流
- **审计日志**: 关键操作记录审计日志
- **会话管理**: 支持强制下线、会话过期

## 监控与运维

### 健康检查

- **端点**: 每个服务提供 `/health` 端点
- **检查内容**: 数据库连接、Redis 连接、服务状态
- **前端集成**: 自动健康检查与服务状态显示
- **告警**: 健康检查失败时触发告警

### 日志

- **结构化日志**: JSON 格式日志，便于分析
- **统一日志格式**: 服务名、时间戳、级别、消息、TraceID
- **日志聚合**: 支持 ELK 堆栈集成
- **日志分级**: ERROR / WARN / INFO / DEBUG

### 监控指标

- **服务指标**: 请求数、响应时间、错误率、吞吐量
- **系统指标**: CPU、内存、磁盘、网络
- **业务指标**: 关键业务数据统计
- **前端性能**: 首屏加载时间、页面性能指标

## 部署架构

### 开发环境

```
本地开发 → 本地数据库(PostgreSQL) → 本地服务(cargo run)
前端: Vite dev server (热更新)
后端: Cargo watch (自动重启)
```

### 测试环境

```
Docker Compose → 容器化数据库 → 容器化服务
统一编排，一键启动
```

### 生产环境

```
Kubernetes/Docker Swarm → 高可用数据库 → 负载均衡
支持水平扩展、滚动更新、自动伸缩
```

### 部署方式对比

| 方式 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| 本地部署 | 开发调试 | 简单、快速、调试方便 | 环境一致性差 |
| Docker Compose | 测试、小规模部署 | 环境一致、易于管理 | 不支持大规模 |
| Kubernetes | 生产环境、大规模 | 高可用、自动伸缩 | 复杂度高 |

## 快速启动

```bash
# 1. 克隆项目
git clone <repository-url>
cd TOPEMS

# 2. 配置环境
cp .env.example .env
# 编辑 .env 配置数据库连接等

# 3. 启动服务
./scripts/topems.sh start

# 4. 访问系统
# 前端: http://localhost:3000
# API: http://localhost:8000
```

## 相关文档

- [架构规范标准](./standards.md) - 架构与命名规范
- [Code Wiki 项目百科](./code-wiki.md) - **核心文档** — 全面的项目百科
- [数据库设计](./database.md) - 数据库 Schema 设计
- [标准端口分配（唯一真相源）](./ports.md) - 28 服务端口配置说明
- [API 路径标准化](./api-path-standardization.md) - 统一 API 路径前缀规范
- [事件驱动架构](./event-driven.md) - 事件总线与发布订阅机制
- [部署运维文档索引](../deployment/README.md) - 部署文档总入口
- [部署指南总览](../deployment/deployment-guide-overview.md) - 部署方式选型对比
- [API 文档总入口](../api/README.md) - RESTful API 接口文档
- [前端导航架构设计](../development/frontend/ui-navigation-design.md) - 四层导航模型设计
- [微前端架构](../development/frontend/module-federation-architecture.md) - Module Federation 架构设计

---
> **版本**: V71 | **最后更新**: 2026-08-11 | **服务总数**: 28/28 (100%) | **已实现**: 28 个 (1 unified-core + 27 业务服务) | **Shared Bootstrap V2**: 28/28 | **Plugin 自动注册**: 28/28 | **V68 质量门禁**: 全通过
