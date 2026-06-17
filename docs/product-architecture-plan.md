# TOPEMS 产品架构改造方案

## 文档信息

| 项目 | 内容 |
|------|------|
| 版本 | v1.1 |
| 日期 | 2026-06-18 |
| 状态 | 实施中 |

---

## 摘要

本方案针对 TOPEMS 现有 28 个微服务架构向"7 合 1 核心平台 + 插件生态"混合模式的架构改造提供详细技术指导。方案涵盖产品架构总览、技术架构重组、部署架构设计、计费模型规划及分阶段实施路径，旨在实现本地安装与 SaaS 订阅两种产品形态的统一支撑，同时支持平台与插件的拆分销售。

---

## 1. 产品架构总览

### 1.1 核心平台定义

核心平台（Unified Core Platform）是整个产品体系的基础，承载 7 个核心服务的统一整合：

| 核心服务 | 现有服务 | 整合后职责 |
|---------|---------|-----------|
| **IAM** | topems-iam | 统一身份认证、权限管理、OAuth2/OIDC、企业 AD/LDAP 集成 |
| **Doc** | topems-doc | 文档存储、版本管理、协同编辑、元数据管理 |
| **Flow** | topems-flow | 工作流引擎、表单设计、审批路由、业务规则 |
| **File** | topems-file | 文件存储、CDN 加速、缩略图生成、预览服务 |
| **IM** | topems-im | 即时通讯、群组管理、消息推送、已读未读 |
| **Mail** | topems-mail | 邮件收发、企业邮箱、邮件模板、归档审计 |
| **Notification** | notification-service | 统一通知、站内信、短信、推送通知 |

**整合策略**：将上述 7 个服务合并为一个 **unified-core** 进程，通过模块化设计保持业务边界清晰，统一使用 shared schema 进行数据持久化。

### 1.2 插件体系

插件体系是核心平台的功能延伸，采用"声明式注册 + 动态加载"机制：

```
┌─────────────────────────────────────────────────────────┐
│                    Unified Core Platform                │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │ IAM │ │ Doc │ │Flow │ │File │ │ IM  │ │Mail │      │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘      │
│  ┌─────────────────────────────────────────────────┐   │
│  │         Plugin Registry & Loader                │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  业务插件     │ │  行业插件     │ │  AI 插件      │
│  - ERP        │ │  - 制造业     │ │  - ChatAI     │
│  - HRM        │ │  - 零售业     │ │  - 知识图谱   │
│  - CRM        │ │  - 建筑业     │ │  - 智能文档   │
│  - PM         │ │  - 医疗       │ │  - 流程挖掘   │
└───────────────┘ └───────────────┘ └───────────────┘
```

**插件规范**：

- **打包格式**：`.topems-plugin`（本质为 WebAssembly Bundle 或独立 Node 进程）
- **声明式元数据**：`plugin.yaml` 定义插件名称、版本、依赖、API 暴露
- **隔离级别**：插件间数据库隔离（独立 Schema），进程内通过消息总线通信
- **生命周期**：安装 → 启用 → 配置 → 运行 → 禁用 → 卸载

### 1.3 AI 能力分层

AI 能力作为独立插件层，为核心平台和业务插件提供智能化支持：

| AI 层级 | 能力范围 | 技术实现 |
|---------|---------|---------|
| **平台层 AI** | 智能搜索、内容推荐、异常检测 | 内置模型 + 向量数据库 |
| **业务层 AI** | 行业专用模型、预测分析 | 插件提供，独立部署 |
| **企业私有大模型** | 私有知识库问答、文档生成 | 企业本地部署 Ollama/LLaMA |

---

## 2. 技术架构改造

### 2.1 后端服务重组

#### 2.1.1 整合目标

将 7 个核心服务整合为 **unified-core** 单体进程，同时保持微服务架构的弹性扩展能力：

```
现有架构：                              目标架构：
┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
│IAM│ │Doc│ │Flow│ │File│ │IM │ │Mail│ │Notif│
└─┬─┘ └─┬─┘ └─┬─┘ └─┬─┘ └─┬─┘ └─┬─┘ └───┘
  28个独立进程                         1个统一核心
```

#### 2.1.2 统一核心架构

```
unified-core/
├── src/
│   ├── core/                    # 核心框架
│   │   ├── bootstrap.rs         # 启动配置
│   │   ├── server.rs            # HTTP Server (Axum)
│   │   ├── middleware/          # 中间件
│   │   │   ├── auth.rs          # JWT 认证
│   │   │   ├── tenant.rs        # 租户解析
│   │   │   ├── logging.rs       # 结构化日志
│   │   │   └── tracing.rs       # 链路追踪
│   │   └── modules/            # 模块注册中心
│   │       └── registry.rs      # 模块自动发现
│   │
│   ├── iam/                      # IAM 模块
│   │   ├── api/                 # API handlers
│   │   ├── models/              # 数据模型
│   │   ├── services/            # 业务逻辑
│   │   └── repository/          # 数据访问
│   │
│   ├── doc/                      # Doc 模块
│   ├── flow/                     # Flow 模块
│   ├── file/                     # File 模块
│   ├── im/                       # IM 模块
│   ├── mail/                     # Mail 模块
│   └── notification/             # Notification 模块
│
│   ├── shared/                    # 共享基础设施
│   │   ├── db/                   # 数据库连接池
│   │   ├── cache/                # Redis 缓存
│   │   ├── queue/                # 消息队列
│   │   └── search/               # 搜索引擎
│   │
│   └── plugins/                   # 插件系统
│       ├── loader.rs             # 插件加载器
│       ├── registry.rs           # 插件注册表
│       └── sandbox.rs            # 插件沙箱
```

#### 2.1.3 插件进程模型

对于重型业务插件（如 ERP、HRM），采用独立进程部署：

| 插件类型 | 部署模式 | 通信协议 |
|---------|---------|---------|
| **轻量插件** | 进程内模块 | 直接函数调用 |
| **重量插件** | 独立进程 | gRPC + Protobuf |
| **外部服务** | 独立服务器 | REST API |

**跨插件通信**：

- 进程内：`Module::call(module, action, payload)`
- 进程间：基于 NATS 的消息总线
- 事件驱动：Event Bus 统一订阅发布

#### 2.1.4 数据库重组

采用 **Schema 隔离 + 统一连接管理** 策略：

```sql
-- 核心平台 Schema
public              -- 共享表（公司、部门、员工、配置）
unified_core        -- 核心平台内部表

-- 插件 Schema（按需创建）
plugin_erp
plugin_hrm
plugin_crm
```

**多租户数据隔离**：

- **独立数据库模式**：每个租户独立数据库实例
- **共享数据库模式**：通过 `tenant_id` 行级隔离
- **混合模式**：核心数据共享，敏感业务数据隔离

### 2.2 前端模块化方案

#### 2.2.1 Module Federation 架构

采用 **@module-federation/vite** 实现前端微前端化：

```
┌─────────────────────────────────────────────────────────┐
│                     Host Shell (Base)                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  React App + React Router + Zustand + MUI       │   │
│  │  - 基础布局、导航、主题                           │   │
│  │  - 公共组件（Header、Sidebar、Footer）            │   │
│  │  - Module Federation Host 配置                    │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
          │                    
┌─────────┴─────┐    
│   Remote: topems_core │    
│   Port: 3001 (preview) │    
│   Entry: /remoteEntry.js │    
└─────────────────┘    
```

**⚠️ 重要限制**：
- **Remote 端不支持 dev 模式**：@module-federation/vite 的 Remote 必须通过 `vite build` 构建后使用 `preview` 模式运行
- **Host 端支持 dev 模式**：可以正常使用 `npm run dev` 开发

**Host 配置**（apps/web/vite.config.ts）：

```typescript
// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

const DEPLOYMENT_MODE = process.env.VITE_DEPLOYMENT_MODE || 'module-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'topems_portal',
      remotes: DEPLOYMENT_MODE !== 'static' ? {
        topems_core: 'http://localhost:3001/remoteEntry.js',
      } : {},
      shared: {
        'react': { singleton: true, requiredVersion: '^19.0.0', strictVersion: true },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0', strictVersion: true },
        'react-router-dom': { singleton: true, requiredVersion: '^7.0.0', strictVersion: true },
        '@mui/material': { singleton: true, requiredVersion: '^6.0.0', strictVersion: true },
        '@mui/icons-material': { singleton: true, requiredVersion: '^6.0.0', strictVersion: true },
        '@emotion/react': { singleton: true, requiredVersion: '^11.0.0', strictVersion: true },
        '@emotion/styled': { singleton: true, requiredVersion: '^11.0.0', strictVersion: true },
        'zustand': { singleton: true, strictVersion: true },
        'i18next': { singleton: true, strictVersion: true },
        'react-i18next': { singleton: true, strictVersion: true },
        'axios': { singleton: true, requiredVersion: '^1.0.0', strictVersion: true },
        'dayjs': { singleton: true, requiredVersion: '^1.11.0', strictVersion: true },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@topems/shared-types': path.resolve(__dirname, '../../packages/shared-types/src'),
      '@topems/shared-utils': path.resolve(__dirname, '../../packages/shared-utils/src'),
      '@topems/shared-components': path.resolve(__dirname, '../../packages/shared-components/src'),
    },
    dedupe: ['react', 'react-dom', 'scheduler'],
  },
});
```

**Remote 配置**（apps/core/vite.config.ts）：

```typescript
// vite.config.ts
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'topems_core',
      filename: 'remoteEntry.js',
      dts: false,
      exposes: {
        './api/auth': './src/api/auth.ts',
        './api/org': './src/api/org.ts',
        './pages/UserManagement': './src/pages/UserManagement',
        './pages/RoleManagement': './src/pages/RoleManagement',
        './pages/OrgChart': './src/pages/OrgChart',
        './store/authStore': './src/store/authStore.ts',
        // ... 更多 exposes
      },
      shared: {
        'react-router-dom': { singleton: true, requiredVersion: '^7.0.0', strictVersion: true },
        '@mui/material': { singleton: true, requiredVersion: '^6.0.0', strictVersion: true },
        // ... 其他 shared deps
      },
    }),
  ],
});
```

**Remote 启动命令**：

```bash
# 必须先构建，然后使用 preview 模式
cd apps/core
npm run build    # 构建产出到 dist/
npm run preview  # 启动 preview 服务器（端口 3001）
```

**环境变量配置**（.env.example）：

```bash
# 部署模式
VITE_DEPLOYMENT_MODE=module-federation  # module-federation | static | hybrid

# Remote 入口地址
VITE_CORE_REMOTE_ENTRY=http://localhost:3001/remoteEntry.js
```

#### 2.2.2 静态打包模式

对于本地安装版，提供静态打包选项，所有模块打包为单一部署单元：

```
静态打包输出：
dist/
├── static/
│   ├── js/
│   │   ├── chunk-vendors.js    # 第三方依赖
│   │   ├── chunk-core.js       # 核心平台模块
│   │   ├── chunk-iam.js        # IAM 模块
│   │   ├── chunk-erp.js        # ERP 模块
│   │   └── ...
│   └── css/
└── index.html
```

**打包策略选择**：

| 场景 | 推荐模式 | 配置 |
|------|---------|------|
| SaaS 多租户 | Module Federation 动态加载 | 保持各租户按需拉取 |
| 本地安装 | 静态打包 | 一次性部署所有模块 |
| 私有化定制 | 混合模式 | 核心静态 + 插件动态 |

#### 2.2.3 路由与模块加载

```typescript
// routes/index.ts - 动态路由配置
const routes = [
  // 核心模块路由（静态注册）
  { path: '/iam/*', module: 'iam', loading: LazyIAM },
  { path: '/doc/*', module: 'doc', loading: LazyDoc },
  
  // 插件路由（动态发现）
  { path: '/plugin/:pluginId/*', module: 'dynamic', loader: pluginLoader },
];

// 插件动态加载器
async function pluginLoader(pluginId: string) {
  const plugin = await PluginRegistry.get(pluginId);
  return React.lazy(() => import(/* @mf-ignore */ plugin.entry));
}
```

### 2.3 统一权限模型设计

#### 2.3.1 权限架构

采用 **ABAC + RBAC** 混合权限模型：

```
┌─────────────────────────────────────────────────────────┐
│                   权限决策引擎 (PDP)                     │
├─────────────────────────────────────────────────────────┤
│  RBAC: 角色-权限关联                                     │
│  ABAC: 属性-策略规则                                     │
│  └─ 用户属性：部门、岗位、项目、租户                      │
│  └─ 资源属性：所有者、敏感级别、所属模块                   │
│  └─ 环境属性：访问时间、IP 地址、设备类型                  │
└─────────────────────────────────────────────────────────┘
```

#### 2.3.2 权限数据模型

```sql
-- 权限定义表
CREATE TABLE iam.permissions (
    id UUID PRIMARY KEY,
    code VARCHAR(100) NOT NULL,           -- 如 'doc:read', 'flow:approve'
    name VARCHAR(255),
    module VARCHAR(50) NOT NULL,            -- 所属模块
    resource_type VARCHAR(50),              -- 资源类型
    action VARCHAR(50) NOT NULL,            -- 操作类型
    attributes JSONB,                      -- 属性约束
    created_at TIMESTAMP
);

-- 角色表
CREATE TABLE iam.roles (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) NOT NULL,
    scope VARCHAR(20) DEFAULT 'platform',  -- platform | tenant | plugin
    tenant_id UUID,                         -- 租户专属角色
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
);

-- 用户角色关联（支持多角色）
CREATE TABLE iam.user_roles (
    user_id UUID REFERENCES iam.users(id),
    role_id UUID REFERENCES iam.roles(id),
    tenant_id UUID,                         -- 租户上下文
    granted_by UUID,
    granted_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    PRIMARY KEY (user_id, role_id, tenant_id)
);

-- 插件权限注册（插件安装时写入）
CREATE TABLE iam.plugin_permissions (
    id UUID PRIMARY KEY,
    plugin_id VARCHAR(100) NOT NULL,
    permission_code VARCHAR(100) NOT NULL,
    UNIQUE(plugin_id, permission_code)
);
```

#### 2.3.3 权限决策流程

```
请求 → 中间件提取身份 → PDP 查询用户角色 → PDP 查询资源属性
  → ABAC 策略评估 → 决策结果 → 允许/拒绝
```

**插件权限隔离**：

- 插件定义自己的权限集（`plugin.yaml` 中声明）
- 权限注册到 unified-core 的权限管理中心
- 超级管理员统一授权，租户管理员分配子集

### 2.4 多租户隔离方案

#### 2.4.1 租户模型

```typescript
// 租户模型
interface Tenant {
  id: string;
  name: string;
  code: string;                    // 唯一标识，用于子域名
  type: 'independent' | 'shared'; // 独立数据库 / 共享数据库
  plan: 'basic' | 'professional' | 'enterprise';
  
  // 数据库配置（独立数据库模式）
  database?: {
    host: string;
    name: string;
  };
  
  // 配额限制
  quota: {
    users: number;
    storage: number;        // GB
    apiCalls: number;       // 每月
    plugins: string[];       // 可用插件列表
  };
  
  // 功能开关
  features: Record<string, boolean>;
  
  status: 'active' | 'suspended' | 'trial';
}
```

#### 2.4.2 隔离策略矩阵

| 隔离维度 | 独立数据库 | 共享数据库 | 适用场景 |
|---------|-----------|-----------|---------|
| **数据隔离** | 数据库实例级 | Schema + 行级 | 数据敏感度 |
| **连接隔离** | 独立连接池 | 共享连接池 | 性能要求 |
| **配置隔离** | 独立配置 | 共享配置 | 运维复杂度 |
| **升级隔离** | 版本独立 | 统一升级 | 部署模式 |
| **成本** | 高 | 低 | 预算约束 |

#### 2.4.3 租户路由

```
请求入口 → Host Header 解析 → 租户识别
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
           独立数据库模式                    共享数据库模式
                    │                               │
                    ▼                               ▼
          基于请求头 X-Tenant-ID           PostgreSQL SET app.current_tenant
          动态切换数据库连接               请求级租户上下文
```

---

## 3. 部署架构

### 3.1 本地安装版部署方案

#### 3.1.1 单机部署

```
┌─────────────────────────────────────────────┐
│              Docker Compose                  │
│  ┌─────────────────────────────────────┐   │
│  │           unified-core              │   │
│  │  (IAM+Doc+Flow+File+IM+Mail+Notif)  │   │
│  └─────────────────────────────────────┘   │
│  ┌────────┐ ┌────────┐ ┌────────┐         │
│  │Postgres│ │ Redis  │ │  Nginx │         │
│  └────────┘ └────────┘ └────────┘         │
│  ┌─────────────────────────────────────┐   │
│  │         Plugin Containers           │   │
│  │  (ERP, HRM, CRM... 按需部署)         │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**硬件需求**：

| 配置 | 用户数 | CPU | 内存 | 存储 |
|------|--------|-----|------|------|
| 基础版 | ≤50 | 4 核 | 8GB | 100GB |
| 标准版 | ≤200 | 8 核 | 16GB | 500GB |
| 企业版 | ≤1000 | 16 核 | 32GB | 1TB |

#### 3.1.2 集群部署（高可用）

```
                    ┌──────────────┐
                    │   Load Balancer   │
                    └───────┬──────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ unified-core  │   │ unified-core  │   │ unified-core  │
│   (Node 1)    │   │   (Node 2)    │   │   (Node 3)    │
└───────┬───────┘   └───────┬───────┘   └───────┬───────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│   PostgreSQL  │   │   PostgreSQL  │   │    Redis      │
│  (Primary)    │   │  (Standby)    │   │   (Cluster)   │
└───────────────┘   └───────────────┘   └───────────────┘
```

#### 3.1.3 本地安装包

提供一键安装脚本：

```bash
# topems-install.sh
#!/bin/bash
# 1. 检测系统环境
# 2. 安装 Docker 和 Docker Compose
# 3. 拉取镜像 / 本地构建
# 4. 配置 .env
# 5. 初始化数据库
# 6. 启动服务
# 7. 运行健康检查
```

### 3.2 SaaS 版部署方案

#### 3.2.1 多租户架构

```
┌─────────────────────────────────────────────────────────────┐
│                     SaaS Platform                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Shared Infrastructure                    │  │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐     │  │
│  │  │ Nginx  │  │ Redis  │  │  OSS   │  │  NATS  │     │  │
│  │  └────────┘  └────────┘  └────────┘  └────────┘     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Tenant A    │    │  Tenant B    │    │  Tenant C    │  │
│  │  (独立DB)    │    │  (共享DB)    │    │  (独立DB)    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Plugin Registry (Shared)                │  │
│  │  ERP-as-a-Service | HRM | CRM | AI ...              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.2 租户配额管理

```yaml
# tenant quotas in config.yaml
tenants:
  billing:
    - plan: basic
      price: 999/month
      quota:
        users: 20
        storage_gb: 50
        api_calls: 10000/month
    
    - plan: professional
      price: 2999/month
      quota:
        users: 100
        storage_gb: 500
        api_calls: 100000/month
        plugins: [erp, hrm, crm]
    
    - plan: enterprise
      price: 9999/month
      quota:
        users: -1  # unlimited
        storage_gb: 5000
        api_calls: -1
        plugins: all
```

### 3.3 混合模式支持

#### 3.3.1 统一部署抽象层

```yaml
# deployment.yaml - 统一部署描述
deployment:
  mode: hybrid  # local | saas | hybrid
  
  local:
    installer: docker-compose | k8s | bare-metal
    auto_upgrade: boolean
    
  saas:
    multi_tenant: boolean
    isolation: shared-db | independent-db
    
  hybrid:
    # 本地实例注册到云端管控
    management:
      endpoint: https://cloud.topems.com/api
      sync_interval: 5m
      capabilities:
        - remote_backup
        - remote_upgrade
        - usage_reporting
```

#### 3.3.2 本地实例云端管控

```
本地实例                              云端管控平台
    │                                      │
    │──── 注册 & 心跳 ──────────────────►   │
    │                                      │
    │◄── 远程备份指令 ────────────────────  │
    │                                      │
    │──── 使用量数据上报 ────────────────►  │
    │                                      │
    │◄── 新版本推送 ──────────────────────  │
    │                                      │
    │◄── 远程配置更新 ────────────────────  │
```

---

## 4. 计费模型

### 4.1 买断制定价

#### 4.1.1 买断制分层

| 版本 | 用户数 | 授权方式 | 价格 | 包含插件 |
|------|--------|---------|------|---------|
| **基础版** | 20 用户 | 永久买断 | ¥29,999 | IAM, Doc, Flow, File |
| **标准版** | 50 用户 | 永久买断 | ¥59,999 | 基础版 + IM, Mail, Notification |
| **专业版** | 100 用户 | 永久买断 | ¥99,999 | 标准版 + ERP, HRM, CRM |
| **企业版** | 无限用户 | 永久买断 | ¥199,999 | 全功能 + 全部插件 |

#### 4.1.2 买断制附加服务

| 服务项 | 价格 | 说明 |
|-------|------|------|
| 年度技术支持 | 售价 15%/年 | 含补丁更新、远程支持 |
| 数据迁移服务 | ¥5,000 起 | 按数据量定价 |
| 定制开发 | ¥800/人天 | 最低 5 人天起 |
| 私有化部署培训 | ¥10,000/次 | 2 天现场培训 |

### 4.2 订阅制定价

#### 4.2.1 订阅制分层

| 套餐 | 用户数 | 月费 | 年费（9 折） | 日均成本 |
|------|--------|------|-------------|---------|
| **起步版** | 5 用户 | ¥199 | ¥2,149 | ¥6.6/人 |
| **成长版** | 20 用户 | ¥599 | ¥6,470 | ¥3.0/人 |
| **标准版** | 50 用户 | ¥1,299 | ¥14,029 | ¥2.6/人 |
| **专业版** | 100 用户 | ¥2,399 | ¥25,909 | ¥2.4/人 |
| **企业版** | 不限 | ¥4,999 | ¥53,989 | - |

#### 4.2.2 订阅制计费要素

```typescript
// 计费要素
interface BillingFactors {
  // 基础计费
  basePrice: number;           // 套餐价格
  
  // 超额计费
  overage: {
    users: {                   // 超出用户数
      unitPrice: number;       // ¥50/人/月
      threshold: number;      // 套餐用户数
    };
    storage: {                 // 超出存储
      unitPrice: number;       // ¥0.5/GB/月
      threshold: number;       // 套餐存储
    };
    apiCalls: {                // API 调用
      unitPrice: number;       // ¥0.001/次
      threshold: number;       // 套餐配额
    };
  };
  
  // 插件单独计费
  plugins: Record<string, {
    monthlyPrice: number;     // 月费
    perUserPrice?: number;     // 每人月费
  }>;
}
```

### 4.3 用量计量

#### 4.3.1 计量指标

| 指标 | 采集方式 | 聚合周期 | 备注 |
|------|---------|---------|------|
| 用户数 | 活跃用户计数 | 每日 | 含管理员 |
| API 调用 | 请求日志 | 每小时 | 按租户聚合 |
| 存储用量 | 文件系统统计 | 每小时 | 含冗余备份 |
| 带宽用量 | Nginx 日志 | 每日 | 出入站合计 |
| 消息数 | IM 服务统计 | 每小时 | 私信+群聊 |
| 邮件数 | 邮件服务统计 | 每小时 | 发件+收件 |

#### 4.3.2 用量上报

```rust
// 计量数据上报
async fn report_usage(tenant_id: &str, metrics: &UsageMetrics) -> Result<()> {
    let payload = serde_json::json!({
        "tenant_id": tenant_id,
        "timestamp": Utc::now(),
        "metrics": {
            "users": metrics.active_users,
            "storage_gb": metrics.storage_bytes / 1e9,
            "api_calls": metrics.api_requests,
            "bandwidth_gb": metrics.bandwidth_bytes / 1e9,
        }
    });
    
    // 上报到计费系统
    billing_client.report(payload).await?;
}
```

#### 4.3.3 计费示例

```
客户：XX 制造有限公司
套餐：专业版（100 用户）
实际用户：128 人
实际存储：1.2TB

月费计算：
  套餐月费：¥2,399
  超额用户：28 × ¥50 = ¥1,400
  超额存储：(1200 - 500) GB × ¥0.5 = ¥350
  
月度费用：¥2,399 + ¥1,400 + ¥350 = ¥4,149
```

---

## 5. 实施计划

### 5.1 总体实施路线图

```
Phase 1 (Q3 2026)     Phase 2 (Q4 2026)     Phase 3 (Q1 2027)     Phase 4 (Q2 2027)
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  核心平台整合  │ ──► │ 权限/租户/计费 │ ──► │  前端模块化   │ ──► │  插件市场    │
│  7合1统一     │     │  模型建立     │     │  Module Fed  │     │  生态建设    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       ▼                    ▼                    ▼                    ▼
   统一进程              统一权限              前端动态化            插件市场
   模块化重构            多租户隔离            静态/动态双模式        上架/分发
```

### 5.2 Phase 1：核心平台统一

**目标**：将 7 个核心服务整合为 unified-core

**任务分解**：

| 序号 | 任务 | 工期 | 依赖 |
|------|------|------|------|
| 1.1 | 创建 unified-core 项目骨架 | 1 周 | - |
| 1.2 | 设计模块注册与发现机制 | 2 周 | 1.1 |
| 1.3 | 迁移 IAM 模块 | 3 周 | 1.2 |
| 1.4 | 迁移 Doc 模块 | 2 周 | 1.2 |
| 1.5 | 迁移 Flow 模块 | 3 周 | 1.2 |
| 1.6 | 迁移 File 模块 | 2 周 | 1.2 |
| 1.7 | 迁移 IM 模块 | 2 周 | 1.2 |
| 1.8 | 迁移 Mail 模块 | 2 周 | 1.2 |
| 1.9 | 迁移 Notification 模块 | 2 周 | 1.2 |
| 1.10 | 统一数据库 Schema 设计 | 2 周 | 1.3-1.9 |
| 1.11 | 集成测试与性能调优 | 3 周 | 1.10 |
| 1.12 | 文档更新与知识转移 | 1 周 | 1.11 |

**交付物**：

- unified-core 源代码仓库
- 统一数据库 Schema 文档
- 集成测试报告
- 性能基准报告

### 5.3 Phase 2：权限/租户/计费模型

**目标**：建立统一的权限、租户和计费体系

**任务分解**：

| 序号 | 任务 | 工期 | 依赖 |
|------|------|------|------|
| 2.1 | 权限模型设计（ABAC+RBAC） | 2 周 | - |
| 2.2 | 权限决策引擎实现 | 3 周 | 2.1 |
| 2.3 | 租户数据模型设计 | 1 周 | - |
| 2.4 | 租户隔离机制实现 | 3 周 | 2.3 |
| 2.5 | 计费模型设计 | 1 周 | - |
| 2.6 | 用量采集服务实现 | 2 周 | 2.5 |
| 2.7 | 计费结算系统实现 | 3 周 | 2.5, 2.6 |
| 2.8 | 支付集成（支付宝/微信/Stripe） | 2 周 | 2.7 |
| 2.9 | 管理控制台开发 | 2 周 | 2.4, 2.7 |

**交付物**：

- 权限模型设计文档
- 租户管理接口文档
- 计费系统 API 文档
- 管理控制台

### 5.4 Phase 3：前端模块化

**目标**：实现 Module Federation 动态加载 + 静态打包双模式

**任务分解**：

| 序号 | 任务 | 工期 | 依赖 |
|------|------|------|------|
| 3.1 | Host Shell 架构设计 | 1 周 | - |
| 3.2 | Module Federation 基础设施 | 2 周 | 3.1 |
| 3.3 | IAM 模块改造 | 2 周 | 3.2 |
| 3.4 | Doc 模块改造 | 2 周 | 3.2 |
| 3.5 | Flow 模块改造 | 2 周 | 3.2 |
| 3.6 | 动态路由实现 | 1 周 | 3.2 |
| 3.7 | 静态打包脚本开发 | 2 周 | 3.6 |
| 3.8 | 插件市场前端开发 | 2 周 | 3.7 |
| 3.9 | 混合部署支持 | 2 周 | 3.7, 3.8 |

**交付物**：

- Module Federation 架构文档
- Host Shell 源码
- 各 Remote 模块包
- 静态打包脚本

### 5.5 Phase 4：插件市场

**目标**：建立插件生态，实现平台+插件拆分销售

**任务分解**：

| 序号 | 任务 | 工期 | 依赖 |
|------|------|------|------|
| 4.1 | 插件规范制定（plugin.yaml） | 1 周 | - |
| 4.2 | 插件加载器开发 | 2 周 | 4.1 |
| 4.3 | 插件注册中心实现 | 2 周 | 4.2 |
| 4.4 | ERP 插件重构 | 3 周 | 4.2 |
| 4.5 | HRM 插件重构 | 3 周 | 4.2 |
| 4.6 | CRM 插件重构 | 2 周 | 4.2 |
| 4.7 | 插件市场后端开发 | 2 周 | 4.3 |
| 4.8 | 插件市场前端开发 | 2 周 | 4.3 |
| 4.9 | 插件审核流程开发 | 1 周 | 4.7, 4.8 |
| 4.10 | 商业化配置系统 | 2 周 | 4.9 |

**交付物**：

- 插件开发规范文档
- 插件市场平台
- 首批商业插件（ERP、HRM、CRM）
- 插件审核管理后台

### 5.6 风险与缓解

| 风险 | 影响 | 概率 | 缓解策略 |
|------|------|------|---------|
| 7 合 1 整合复杂度高 | 高 | 中 | 分模块渐进迁移，保留独立退出能力 |
| 性能下降风险 | 中 | 低 | 前期做好性能基准，全程性能监控 |
| 插件生态建设周期长 | 中 | 中 | 优先迁移高需求插件，快速迭代 |
| 租户数据迁移困难 | 高 | 中 | 提供平滑迁移工具，充分测试 |
| 前端 Module Fed 调试复杂 | 低 | 中 | 建立开发阶段调试工具链 |

---

## 附录

### 附录 A：技术选型汇总

| 技术领域 | 选型 | 备选 |
|---------|------|------|
| 后端语言 | Rust 1.70+ | - |
| Web 框架 | Axum | Actix-web |
| 数据库 | PostgreSQL 15+ | - |
| ORM | SQLx | - |
| 缓存 | Redis 7+ | - |
| 消息队列 | NATS | Kafka |
| 前端框架 | React 18/19 | Vue 3 |
| 构建工具 | Vite 5 | Webpack 5 |
| 模块联邦 | @module-federation/vite | @originjs/vite-plugin-federation |
| 状态管理 | Zustand | Jotai |
| UI 组件库 | MUI 6 | - |
| 容器化 | Docker | - |
| 编排 | Docker Compose / K8s | - |

### 附录 B：API 版本策略

- **核心平台 API**：`/api/v1/core/*`
- **插件 API**：`/api/v1/plugins/{plugin_id}/*`
- **管理 API**：`/api/v1/admin/*`
- **版本兼容**：核心平台保持 API 兼容至少 2 个大版本

### 附录 C：待决策事项

1. 插件间 gRPC 通信是否需要引入服务网格？
2. 向量数据库选型（Pinecone vs 自托管 Milvus）？
3. 前端状态管理是否从 Zustand 迁移到 Jotai？
4. 是否引入 CQRS 架构应对读写分离需求？

---

## 附录 D：实施状态跟踪

### Phase 3 前端模块化 - 实施中

| 任务 | 状态 | 备注 |
|------|------|------|
| Host Shell 架构设计 | ✅ 完成 | apps/web 配置为 MF Host |
| @module-federation/vite 集成 | ✅ 完成 | 配置共享依赖 |
| Remote (core) 配置 | ✅ 完成 | apps/core 配置为 MF Remote |
| DynamicRouter 实现 | ✅ 完成 | 支持远程模块加载 |
| ModuleRegistry 升级 | ✅ 完成 | 支持 remoteEntry 配置 |
| 静态打包模式支持 | ✅ 完成 | DEPLOYMENT_MODE 环境变量 |
| 路径别名配置 | ✅ 完成 | @topems/shared-* packages |
| 文档更新 | ✅ 完成 | 本文档 |

### 当前架构

```
开发环境：
┌─────────────────────────────────────────────────────────┐
│  Host Shell (apps/web)                                 │
│  Port: 3000                                            │
│  Command: npm run dev                                  │
│  └── Remote: topems_core → http://localhost:3001/...   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│  Remote Module (apps/core)                             │
│  Port: 3001 (preview)                                  │
│  Command: npm run build && npm run preview              │
│  └── Exposes: pages, store, api, components            │
└─────────────────────────────────────────────────────────┘
```

### 已知限制

1. **Remote 不支持 dev 模式**：Remote 必须先 build 再 preview
2. **开发流程**：修改 core 代码后需要重新 build 并重启 preview
3. **DTS 类型下载失败**：preview 模式下无法获取远程类型定义（开发不影响）

---

### ERP 插件化改造 - 已完成

| 任务 | 状态 | 完成日期 |
|------|------|----------|
| unified-core 插件运行时状态表 | ✅ 完成 | 2026-06-18 |
| unified-core 插件注册处理器 | ✅ 完成 | 2026-06-18 |
| unified-core 插件路由代理中间件 | ✅ 完成 | 2026-06-18 |
| ERP 插件元数据 plugin.yaml | ✅ 完成 | 2026-06-18 |
| ERP 插件接口实现 | ✅ 完成 | 2026-06-18 |
| ERP 路由前缀调整 /api/erp/* | ✅ 完成 | 2026-06-18 |
| ERP 认证中间件（X-User-Id + Authorization） | ✅ 完成 | 2026-06-18 |
| 前端 Vite 代理配置 | ✅ 完成 | 2026-06-18 |
| 集成测试 | ✅ 完成 | 2026-06-18 |

详细设计文档：[docs/architecture/erp-plugin-design.md](../architecture/erp-plugin-design.md)

---

**文档结束**
