# TOPEMS 产品架构改造方案

## 文档信息

| 项目 | 内容 |
|------|------|
| 版本 | v1.3 |
| 日期 | 2026-06-18 |
| 状态 | 实施中 |
| 更新说明 | 补充插件系统实现详情、服务间通信机制、监控可观测性设计、安全架构设计 |

---

## 摘要

本方案针对 TOPEMS 现有 28 个微服务架构向"7 合 1 核心平台 + 插件生态"混合模式的架构改造提供详细技术指导。方案涵盖产品架构总览、技术架构重组、部署架构设计、计费模型规划及分阶段实施路径，旨在实现本地安装与 SaaS 订阅两种产品形态的统一支撑，同时支持平台与插件的拆分销售。

---

## 1. 产品架构总览

### 1.1 核心平台定义

核心平台（Unified Core Platform）是整个产品体系的基础，承载 7 个核心服务的统一整合：

| 核心服务 | 现有服务 | 整合后职责 | 整合状态 |
|---------|---------|-----------|----------|
| **IAM** | topems-iam | 统一身份认证、权限管理、OAuth2/OIDC、企业 AD/LDAP 集成 | ✅ 已完成 |
| **Doc** | topems-doc | 文档存储、版本管理、协同编辑、元数据管理 | ✅ 已完成 |
| **Flow** | topems-flow | 工作流引擎、表单设计、审批路由、业务规则 | ✅ 已完成 |
| **File** | topems-file | 文件存储、CDN 加速、缩略图生成、预览服务 | ✅ 已完成 |
| **IM** | topems-im | 即时通讯、群组管理、消息推送、已读未读 | ✅ 已完成 |
| **Mail** | topems-mail | 邮件收发、企业邮箱、邮件模板、归档审计 | ✅ 已完成 |
| **Notification** | notification-service | 统一通知、站内信、短信、推送通知 | ✅ 已完成 |

**整合策略**：将上述 7 个服务合并为一个 **unified-core** 进程，通过模块化设计保持业务边界清晰，统一使用 shared schema 进行数据持久化。

**实际实现**：
- 服务目录：`svc/unified-core/`
- 端口：8000
- 模块结构：`src/modules/{iam, doc, flow, file, communication}`
- 通信模块整合：IM、Mail、Notification 合并为 `communication` 模块

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

### 1.4 实际服务整合状态

基于项目当前实现，服务整合已扩展为更细粒度的模块化架构：

#### 1.4.1 已整合服务

| 聚合服务 | 包含模块 | 端口 | 状态 |
|----------|----------|------|------|
| **unified-core** | IAM, Doc, Flow, File, Communication(IM/Mail/Notification) | 8000 | ✅ 已完成 |
| **manufacturing** | MES, PDM | 8023 | ✅ 已完成 |
| **quality-assurance** | QMS, LIMS, EHS | 8032 | ✅ 已完成 |
| **analytics** | BI, Report | 8060 | ✅ 已完成 |

#### 1.4.2 独立服务（插件化）

| 服务 | 端口 | 职责 | 插件化状态 |
|------|------|------|-----------|
| **ai** | 8062 | AI服务（向量检索、问答、分析） | ✅ 已完成 |
| **erp** | 8010 | 企业资源计划（财务、资产、凭证） | ✅ 已完成 |
| **hrm** | 8011 | 人力资源管理（员工、考勤、薪资） | ✅ 已完成 |
| **crm** | 8012 | 客户关系管理（客户、商机、销售） | ✅ 已完成 |
| **pm** | 8001 | 项目管理（项目、合同、预算） | ✅ 已完成 |
| **rs** | 8020 | 研发管理（项目、实验、配方） | ✅ 已完成 |
| **scm** | 8040 | 供应链管理（采购、供应商） | ✅ 已完成 |
| **srm** | 8041 | 供应商管理 | ✅ 已完成 |
| **wms** | 8042 | 仓储管理（库存、出入库） | ✅ 已完成 |
| **gis** | 8053 | 地理信息服务（地图、定位、轨迹） | ✅ 已完成 |
| **integration** | 8005 | 系统集成服务 | ✅ 已完成 |
| **mobile** | 8070 | 移动服务（离线、扫码、巡检） | ✅ 已完成 |
| **monitor** | - | 监控与告警服务 | ✅ 已完成 |
| **portal** | - | 统一门户服务 | ✅ 已完成 |

#### 1.4.3 服务端口分组

| 分组 | 端口范围 | 包含服务 |
|------|----------|----------|
| **核心服务** | 8000-8009 | unified-core(8000), pm(8001), integration(8005) |
| **ERP/财务** | 8010-8019 | erp(8010), hrm(8011), crm(8012) |
| **PLM/研发** | 8020-8029 | rs(8020), manufacturing(8023) |
| **质量/生产** | 8030-8039 | quality-assurance(8032) |
| **供应链** | 8040-8049 | scm(8040), srm(8041), wms(8042) |
| **基础设施** | 8050-8059 | gis(8053) |
| **数据分析** | 8060-8069 | analytics(8060), ai(8062) |
| **扩展服务** | 8070-8079 | mobile(8070) |

### 1.5 插件系统实现详情

#### 1.5.1 插件元数据规范 (plugin.yaml)

每个插件通过 `plugin.yaml` 声明式定义元数据：

```yaml
# 插件基本信息
code: erp                          # 唯一标识
name: 企业资源计划                  # 显示名称
version: 1.0.0                     # 版本号
description: ERP 企业资源计划系统   # 描述
plugin_type: business              # 类型：business | industry | ai

# 部署配置
deployment:
  type: standalone                 # standalone | embedded
  port: 8010                       # 服务端口
  base_path: /api/erp              # API 路由前缀

# 权限声明
permissions:
  - code: erp:asset:read
    name: 查看资产
    resource_type: asset
    action: read
  - code: erp:asset:write
    name: 管理资产
    resource_type: asset
    action: write

# 依赖关系
dependencies: []
```

#### 1.5.2 插件注册流程

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   插件启动      │ ──► │  向核心注册     │ ──► │  权限同步       │
│   (ERP:8010)    │     │  (Core:8000)    │     │  (iam.permissions)│
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                      │                       │
         │ POST /api/core/      │ INSERT INTO           │
         │ plugin/dev/plugins/  │ core_plugins          │
         │ erp/register         │ core_plugin_instances │
         │                      │ core_plugin_permissions│
         ▼                      ▼                       ▼
```

**注册接口实现**：

```rust
// 插件启动时向核心平台注册
pub async fn register_to_core() -> Result<()> {
    let info = PluginInfo {
        code: "erp".to_string(),
        name: "企业资源计划".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "ERP 企业资源计划系统".to_string(),
        permissions: vec![/* 权限列表 */],
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/erp/register", core_url);

    client.post(&url).json(&info).send().await?;
    Ok(())
}
```

#### 1.5.3 插件运行时状态管理

核心平台维护插件运行时状态表：

```sql
-- 插件实例表
CREATE TABLE core_plugin_instances (
    id UUID PRIMARY KEY,
    plugin_id UUID REFERENCES core_plugins(id),
    runtime_url VARCHAR(255),        -- 插件服务地址
    runtime_status VARCHAR(20),      -- running | stopped | error
    base_path VARCHAR(100),          -- API 路由前缀
    last_heartbeat TIMESTAMP,        -- 最后心跳时间
    started_at TIMESTAMP,
    stopped_at TIMESTAMP
);

-- 插件权限表
CREATE TABLE core_plugin_permissions (
    id UUID PRIMARY KEY,
    plugin_code VARCHAR(100),
    permission_code VARCHAR(100),
    permission_name VARCHAR(255),
    resource_type VARCHAR(50),
    action VARCHAR(50),
    UNIQUE(plugin_code, permission_code)
);
```

#### 1.5.4 插件路由代理

核心平台通过中间件代理插件请求：

```rust
// 插件路由代理中间件
pub async fn plugin_proxy(
    Path((plugin_code, path)): Path<(String, String)>,
    State(state): State<AppState>,
    req: Request<Body>,
) -> Result<Response<Body>, ProxyError> {
    // 1. 查询插件实例信息
    let instance = sqlx::query_as!(
        PluginInstance,
        "SELECT * FROM core_plugin_instances pi
         JOIN core_plugins p ON pi.plugin_id = p.id
         WHERE p.code = $1 AND pi.runtime_status = 'running'",
        plugin_code
    ).fetch_optional(&state.pool).await?;

    // 2. 转发请求到插件服务
    let target_url = format!("{}{}", instance.runtime_url, path);
    let response = client.request(req, &target_url).send().await?;

    Ok(response)
}
```

#### 1.5.5 插件生命周期管理

| 阶段 | 操作 | 说明 |
|------|------|------|
| **安装** | `POST /api/plugins/{code}/install` | 租户安装插件，写入 `core_tenant_plugins` |
| **启用** | `POST /api/plugins/{code}/enable` | 激活插件，设置 `is_active = true` |
| **禁用** | `POST /api/plugins/{code}/disable` | 停用插件，设置 `is_active = false` |
| **卸载** | `DELETE /api/plugins/{code}` | 移除插件，删除租户插件记录 |
| **升级** | `POST /api/plugins/{code}/upgrade` | 版本升级，支持回滚 |

#### 1.5.6 插件市场 API

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/plugins/marketplace` | GET | 获取市场概览（分类、推荐、新上架） |
| `/api/plugins` | GET | 插件列表（支持筛选、搜索、排序） |
| `/api/plugins/{code}` | GET | 插件详情 |
| `/api/plugins/{code}/versions` | GET | 插件版本列表 |
| `/api/plugins/{code}/reviews` | GET | 插件评价列表 |
| `/api/plugins/{code}/statistics` | GET | 插件统计信息 |
| `/api/plugins/{code}/check-updates` | GET | 检查更新 |
| `/api/plugins/{code}/upgrade` | POST | 执行升级 |

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

### 2.2 API 网关与路由设计

#### 2.2.1 Nginx 反向代理配置

```nginx
# docker/nginx.conf
http {
    # 核心服务
    upstream topems-core {
        server topems-core:8000;
    }
    
    # 业务插件服务
    upstream topems-erp {
        server topems-erp:8010;
    }
    
    upstream topems-hrm {
        server topems-hrm:8011;
    }
    
    upstream topems-crm {
        server topems-crm:8012;
    }
    
    # ... 其他服务 upstream 配置
    
    server {
        listen 80;
        server_name api.topems.io;
        
        # 安全头
        add_header X-Frame-Options "SAMEORIGIN";
        add_header X-Content-Type-Options "nosniff";
        add_header X-XSS-Protection "1; mode=block";
        
        # 限流配置
        limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
        
        # 核心平台路由
        location /api/iam/ {
            limit_req zone=api burst=20;
            proxy_pass http://topems-core/api/iam/;
        }
        
        location /api/doc/ {
            limit_req zone=api burst=20;
            proxy_pass http://topems-core/api/doc/;
        }
        
        location /api/flow/ {
            limit_req zone=api burst=20;
            proxy_pass http://topems-core/api/flow/;
        }
        
        location /api/file/ {
            limit_req zone=api burst=20;
            proxy_pass http://topems-core/api/file/;
        }
        
        location /api/communication/ {
            limit_req zone=api burst=20;
            proxy_pass http://topems-core/api/communication/;
        }
        
        # 业务插件路由
        location /api/erp/ {
            limit_req zone=api burst=20;
            proxy_pass http://topems-erp/api/erp/;
        }
        
        location /api/hrm/ {
            limit_req zone=api burst=20;
            proxy_pass http://topems-hrm/api/hrm/;
        }
        
        location /api/crm/ {
            limit_req zone=api burst=20;
            proxy_pass http://topems-crm/api/crm/;
        }
        
        # ... 其他插件路由
        
        # 健康检查
        location /health {
            return 200 'OK';
            add_header Content-Type text/plain;
        }
    }
}
```

#### 2.2.2 API 路由前缀规范

| 服务类型 | 路由前缀 | 示例 |
|---------|---------|------|
| **核心平台** | `/api/{module}/` | `/api/iam/users`, `/api/doc/files` |
| **业务插件** | `/api/{plugin}/` | `/api/erp/assets`, `/api/hrm/employees` |
| **管理接口** | `/api/admin/` | `/api/admin/tenants`, `/api/admin/plugins` |
| **公共接口** | `/api/public/` | `/api/public/health`, `/api/public/info` |

#### 2.2.3 服务发现与负载均衡

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx / API Gateway                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │  路由分发 / 限流 / 认证转发 / 日志记录            │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ unified-core  │ │     erp       │ │     hrm       │
│   :8000       │ │    :8010      │ │    :8011      │
└───────────────┘ └───────────────┘ └───────────────┘
```

### 2.3 前端模块化方案

#### 2.3.1 Module Federation 架构

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

#### 2.3.2 静态打包模式

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

#### 2.3.3 路由与模块加载

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

### 2.4 统一权限模型设计

#### 2.4.1 权限架构

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

#### 2.4.2 权限数据模型

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

#### 2.4.3 权限决策流程

```
请求 → 中间件提取身份 → PDP 查询用户角色 → PDP 查询资源属性
  → ABAC 策略评估 → 决策结果 → 允许/拒绝
```

**插件权限隔离**：

- 插件定义自己的权限集（`plugin.yaml` 中声明）
- 权限注册到 unified-core 的权限管理中心
- 超级管理员统一授权，租户管理员分配子集

### 2.5 多租户隔离方案

#### 2.5.1 租户模型

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

#### 2.5.2 隔离策略矩阵

| 隔离维度 | 独立数据库 | 共享数据库 | 适用场景 |
|---------|-----------|-----------|---------|
| **数据隔离** | 数据库实例级 | Schema + 行级 | 数据敏感度 |
| **连接隔离** | 独立连接池 | 共享连接池 | 性能要求 |
| **配置隔离** | 独立配置 | 共享配置 | 运维复杂度 |
| **升级隔离** | 版本独立 | 统一升级 | 部署模式 |
| **成本** | 高 | 低 | 预算约束 |

#### 2.5.3 租户路由

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

### 2.6 服务间通信机制

#### 2.6.1 通信模式概览

```
┌─────────────────────────────────────────────────────────────────┐
│                    服务间通信架构                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     同步调用      ┌─────────────┐             │
│  │   前端      │ ───────────────► │  API Gateway │             │
│  │  (Web/App)  │     HTTP/REST    │    (Nginx)   │             │
│  └─────────────┘                  └──────┬──────┘             │
│                                          │                     │
│                    ┌─────────────────────┼─────────────────┐   │
│                    │                     │                 │   │
│                    ▼                     ▼                 ▼   │
│           ┌──────────────┐     ┌──────────────┐   ┌──────────┐│
│           │ unified-core │     │     ERP      │   │   AI     ││
│           │   :8000      │     │    :8010     │   │  :8062   ││
│           └──────┬───────┘     └──────┬───────┘   └────┬─────┘│
│                  │                    │                │       │
│                  │    异步消息 (NATS)  │                │       │
│                  └────────────────────┴────────────────┘       │
│                               │                                │
│                               ▼                                │
│                    ┌──────────────────┐                        │
│                    │   Event Bus      │                        │
│                    │   (NATS/JetStream)│                       │
│                    └──────────────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

#### 2.6.2 同步通信 (HTTP/gRPC)

**服务发现与负载均衡**：

```yaml
# config/services.yaml
services:
  unified-core:
    host: topems-core
    port: 8000
    health_check: /health

  erp:
    host: topems-erp
    port: 8010
    health_check: /api/plugins/health

  hrm:
    host: topems-hrm
    port: 8011
    health_check: /api/plugins/health
```

**跨服务调用示例**：

```rust
// 从核心平台调用 ERP 服务
pub async fn get_asset_from_erp(asset_id: Uuid) -> Result<Asset> {
    let erp_url = std::env::var("ERP_URL")
        .unwrap_or_else(|_| "http://topems-erp:8010".to_string());

    let client = reqwest::Client::new();
    let response = client
        .get(format!("{}/api/erp/assets/{}", erp_url, asset_id))
        .header("X-User-Id", user_id)
        .header("X-Tenant-Id", tenant_id)
        .send()
        .await?;

    let asset: Asset = response.json().await?;
    Ok(asset)
}
```

#### 2.6.3 异步消息 (NATS)

**事件总线架构**：

```rust
// 事件发布
pub async fn publish_event(event: DomainEvent) -> Result<()> {
    let nats_url = std::env::var("NATS_URL")
        .unwrap_or_else(|_| "nats://localhost:4222".to_string());

    let nc = async_nats::connect(&nats_url).await?;
    let subject = format!("events.{}", event.event_type());

    nc.publish(subject, serde_json::to_vec(&event)?.into())
        .await?;

    Ok(())
}

// 事件订阅
pub async fn subscribe_events(subject: &str) -> Result<()> {
    let nc = async_nats::connect("nats://localhost:4222").await?;
    let mut subscriber = nc.subscribe(subject.to_string()).await?;

    while let Some(msg) = subscriber.next().await {
        let event: DomainEvent = serde_json::from_slice(&msg.payload)?;
        handle_event(event).await?;
    }

    Ok(())
}
```

**领域事件定义**：

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum DomainEvent {
    // 用户事件
    UserCreated { user_id: Uuid, tenant_id: Uuid, email: String },
    UserUpdated { user_id: Uuid, changes: HashMap<String, Value> },
    UserDeleted { user_id: Uuid },

    // 租户事件
    TenantCreated { tenant_id: Uuid, name: String, plan: String },
    TenantSuspended { tenant_id: Uuid, reason: String },

    // 插件事件
    PluginInstalled { tenant_id: Uuid, plugin_code: String },
    PluginEnabled { tenant_id: Uuid, plugin_code: String },
    PluginUpgraded { tenant_id: Uuid, plugin_code: String, version: String },

    // 业务事件
    WorkflowCompleted { instance_id: Uuid, tenant_id: Uuid },
    DocumentShared { doc_id: Uuid, shared_with: Vec<Uuid> },
}
```

#### 2.6.4 消息队列配置

```yaml
# docker/docker-compose.yml
services:
  nats:
    image: nats:2.10-alpine
    ports:
      - "4222:4222"   # 客户端连接
      - "8222:8222"   # 监控端口
    command:
      - "--jetstream"
      - "--store_dir=/data"
      - "-m"
      - "8222"
    volumes:
      - nats-data:/data
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8222/healthz"]
      interval: 10s
      timeout: 5s
      retries: 3
```

#### 2.6.5 服务间认证

**内部服务认证**：

```rust
// 服务间调用认证中间件
pub async fn internal_auth(
    headers: HeaderMap,
    req: Request<Body>,
    next: Next,
) -> Result<Response, StatusCode> {
    // 1. 验证内部服务令牌
    let internal_token = headers
        .get("X-Internal-Token")
        .and_then(|v| v.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;

    if !validate_internal_token(internal_token) {
        return Err(StatusCode::UNAUTHORIZED);
    }

    // 2. 传递用户上下文
    let user_id = headers.get("X-User-Id").and_then(|v| v.to_str().ok());
    let tenant_id = headers.get("X-Tenant-Id").and_then(|v| v.to_str().ok());

    // 3. 设置请求上下文
    req.extensions_mut().insert(UserContext { user_id, tenant_id });

    Ok(next.run(req).await)
}
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

### 3.4 监控与可观测性

#### 3.4.1 可观测性架构

```
┌─────────────────────────────────────────────────────────────────┐
│                    可观测性平台                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Grafana Dashboard                     │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │ Metrics │ │  Logs   │ │ Traces  │ │ Alerts  │       │   │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │   │
│  └───────┼───────────┼───────────┼───────────┼─────────────┘   │
│          │           │           │           │                  │
│          ▼           ▼           ▼           ▼                  │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐               │
│  │ Prometheus  │ │    Loki     │ │    Jaeger   │               │
│  │  (Metrics)  │ │   (Logs)    │ │  (Tracing)  │               │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘               │
│         │               │               │                       │
└─────────┼───────────────┼───────────────┼───────────────────────┘
          │               │               │
          ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      应用服务层                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ unified- │ │   ERP    │ │   HRM    │ │   AI     │           │
│  │  core    │ │  :8010   │ │  :8011   │ │  :8062   │           │
│  │  :8000   │ └────┬─────┘ └────┬─────┘ └────┬─────┘           │
│  └────┬─────┘      │            │            │                  │
│       │            │            │            │                  │
│       └────────────┴────────────┴────────────┘                  │
│                         │                                       │
│                    OpenTelemetry                                │
│                    Collector                                    │
└─────────────────────────────────────────────────────────────────┘
```

#### 3.4.2 指标采集 (Prometheus)

**服务指标暴露**：

```rust
// 使用 metrics-exporter-prometheus 暴露指标
use metrics_exporter_prometheus::PrometheusBuilder;

pub fn init_metrics() -> Result<()> {
    let builder = PrometheusBuilder::new();
    builder
        .set_buckets(&[
            0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0
        ])?
        .install()?;

    // 注册自定义指标
    metrics::register_counter!("http_requests_total", "Total HTTP requests");
    metrics::register_histogram!("http_request_duration_seconds", "HTTP request duration");
    metrics::register_gauge!("active_connections", "Active connections");

    Ok(())
}

// 中间件记录指标
pub async fn metrics_middleware(req: Request<Body>, next: Next) -> Response {
    let start = std::time::Instant::now();
    let method = req.method().to_string();
    let path = req.uri().path().to_string();

    let response = next.run(req).await;

    let duration = start.elapsed().as_secs_f64();
    metrics::counter!("http_requests_total", "method" => method, "path" => path).increment(1);
    metrics::histogram!("http_request_duration_seconds", "method" => method).record(duration);

    response
}
```

**核心指标定义**：

| 指标名称 | 类型 | 说明 |
|---------|------|------|
| `http_requests_total` | Counter | HTTP 请求总数 |
| `http_request_duration_seconds` | Histogram | 请求延迟分布 |
| `active_connections` | Gauge | 活跃连接数 |
| `db_query_duration_seconds` | Histogram | 数据库查询延迟 |
| `cache_hit_ratio` | Gauge | 缓存命中率 |
| `plugin_health_status` | Gauge | 插件健康状态 |
| `tenant_active_users` | Gauge | 租户活跃用户数 |

#### 3.4.3 日志采集 (Loki)

**结构化日志配置**：

```rust
// 使用 tracing-subscriber 配置结构化日志
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

pub fn init_logging() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .json()
                .with_target(true)
                .with_thread_ids(true)
                .with_span_events(true)
        )
        .with(tracing_opentelemetry::layer())
        .init();
}

// 日志示例
#[instrument(skip(state), fields(tenant_id = %tenant_id))]
pub async fn handle_request(state: AppState, tenant_id: Uuid) -> Result<()> {
    tracing::info!(
        tenant_id = %tenant_id,
        user_id = %user_id,
        action = "request_handled",
        "Processing request"
    );
    Ok(())
}
```

**日志格式规范**：

```json
{
  "timestamp": "2026-06-18T10:30:00.000Z",
  "level": "INFO",
  "target": "unified_core::api::handlers",
  "threadId": 1,
  "span": {
    "name": "handle_request",
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "message": "Processing request",
  "fields": {
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "action": "request_handled"
  }
}
```

#### 3.4.4 分布式追踪 (Jaeger)

**OpenTelemetry 配置**：

```rust
use opentelemetry::trace::TracerProvider;
use opentelemetry_otlp::WithExportConfig;

pub fn init_tracing(service_name: &str) -> Result<()> {
    let tracer = opentelemetry_otlp::new_pipeline()
        .tracing()
        .with_exporter(
            opentelemetry_otlp::new_exporter()
                .tonic()
                .with_endpoint("http://jaeger:4317")
        )
        .with_trace_config(
            opentelemetry::sdk::trace::config()
                .with_resource(opentelemetry::sdk::Resource::new(vec![
                    opentelemetry::KeyValue::new("service.name", service_name),
                ]))
        )
        .install_batch(opentelemetry::runtime::Tokio)?;

    tracing::subscriber::set_global_default(
        tracing_subscriber::registry()
            .with(tracing_opentelemetry::layer().with_tracer(tracer))
    )?;

    Ok(())
}
```

**追踪上下文传播**：

```rust
// 跨服务追踪上下文
pub async fn call_external_service(url: &str, tenant_id: Uuid) -> Result<Response> {
    let client = reqwest::Client::new();

    // 自动注入追踪上下文
    let span = tracing::info_span!("external_call", url = %url);
    let response = client
        .get(url)
        .header("X-Tenant-Id", tenant_id.to_string())
        .send()
        .instrument(span)
        .await?;

    Ok(response)
}
```

#### 3.4.5 告警规则

**Prometheus 告警规则示例**：

```yaml
# prometheus/alerts.yml
groups:
  - name: topems_alerts
    rules:
      # 服务健康告警
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service {{ $labels.job }} is down"

      # 高延迟告警
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High latency detected: {{ $value }}s"

      # 错误率告警
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate: {{ $value | humanizePercentage }}"

      # 插件健康告警
      - alert: PluginUnhealthy
        expr: plugin_health_status == 0
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Plugin {{ $labels.plugin_code }} is unhealthy"

      # 数据库连接池告警
      - alert: DatabaseConnectionPoolExhausted
        expr: db_pool_connections_available / db_pool_connections_max < 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool nearly exhausted"
```

#### 3.4.6 Grafana Dashboard

**核心监控面板**：

```
┌─────────────────────────────────────────────────────────────────┐
│                    TOPEMS 监控仪表盘                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  服务状态       │  │  请求速率       │  │  错误率         │ │
│  │  ● unified-core │  │  1.2k req/s     │  │  0.05%          │ │
│  │  ● ERP          │  │  350 req/s      │  │  0.02%          │ │
│  │  ● HRM          │  │  120 req/s      │  │  0.01%          │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                    请求延迟分布 (P50/P95/P99)                ││
│  │  ████████████████████████████████████████████████████████   ││
│  │  P50: 45ms  P95: 120ms  P99: 250ms                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐            │
│  │  数据库连接池        │  │  缓存命中率          │            │
│  │  ████████░░ 80%      │  │  ██████████ 95%      │            │
│  └──────────────────────┘  └──────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
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

### 4.4 安全架构设计

#### 4.4.1 安全架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                    安全防护体系                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    边界安全层                            │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │  WAF    │ │  DDoS   │ │  SSL/   │ │  Rate   │       │   │
│  │  │ 防护    │ │  防护   │ │  TLS    │ │  Limit  │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    应用安全层                            │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │  JWT    │ │  RBAC/  │ │  Input  │ │  CSRF   │       │   │
│  │  │ 认证    │ │  ABAC   │ │  验证   │ │  防护   │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    数据安全层                            │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │   │
│  │  │  加密   │ │  脱敏   │ │  审计   │ │  备份   │       │   │
│  │  │  存储   │ │  处理   │ │  日志   │ │  恢复   │       │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

#### 4.4.2 认证与授权

**JWT 认证流程**：

```rust
// JWT 认证中间件
pub async fn jwt_auth(
    headers: HeaderMap,
    mut req: Request<Body>,
    next: Next,
) -> Result<Response, AuthError> {
    // 1. 提取 Token
    let token = headers
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(AuthError::MissingToken)?;

    // 2. 验证 Token
    let claims = decode_jwt(token, &jwt_secret)?;

    // 3. 检查 Token 状态（黑名单检查）
    if is_token_revoked(&claims.jti).await? {
        return Err(AuthError::TokenRevoked);
    }

    // 4. 加载用户权限
    let permissions = load_user_permissions(claims.user_id).await?;

    // 5. 注入用户上下文
    req.extensions_mut().insert(UserContext {
        user_id: claims.user_id,
        tenant_id: claims.tenant_id,
        permissions,
    });

    Ok(next.run(req).await)
}

// JWT Claims 结构
#[derive(Debug, Serialize, Deserialize)]
pub struct JwtClaims {
    pub sub: Uuid,           // 用户 ID
    pub tenant_id: Uuid,     // 租户 ID
    pub roles: Vec<String>,  // 角色列表
    pub exp: i64,            // 过期时间
    pub iat: i64,            // 签发时间
    pub jti: Uuid,           // Token ID（用于撤销）
}
```

**OAuth2/OIDC 集成**：

```rust
// OAuth2 认证流程
pub async fn oauth_callback(
    Query(params): Query<OAuthCallback>,
    State(state): State<AppState>,
) -> Result<Redirect, OAuthError> {
    // 1. 用授权码换取 Token
    let token_response = state.oauth_client
        .exchange_code(params.code)
        .await?;

    // 2. 获取用户信息
    let user_info = state.oauth_client
        .get_user_info(&token_response.access_token)
        .await?;

    // 3. 查找或创建本地用户
    let user = find_or_create_user(&state.db, &user_info).await?;

    // 4. 生成 JWT
    let jwt = generate_jwt(&user)?;

    // 5. 设置 Cookie 并重定向
    Ok(Redirect::to(&format!("/auth/callback?token={}", jwt)))
}
```

#### 4.4.3 数据加密

**敏感数据加密存储**：

```rust
// 使用 AES-256-GCM 加密
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};

pub fn encrypt_sensitive_data(plaintext: &str, key: &[u8]) -> Result<String> {
    let cipher = Aes256Gcm::new_from_slice(key)?;
    let nonce = Nonce::from_slice(b"unique_nonce"); // 实际应随机生成

    let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes())?;

    Ok(BASE64.encode(ciphertext))
}

pub fn decrypt_sensitive_data(ciphertext: &str, key: &[u8]) -> Result<String> {
    let cipher = Aes256Gcm::new_from_slice(key)?;
    let nonce = Nonce::from_slice(b"unique_nonce");

    let decoded = BASE64.decode(ciphertext)?;
    let plaintext = cipher.decrypt(nonce, decoded.as_slice())?;

    Ok(String::from_utf8(plaintext)?)
}
```

**数据库字段加密**：

```sql
-- 敏感字段加密存储
CREATE TABLE iam.users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt 哈希
    phone_encrypted TEXT,                  -- 加密存储
    id_card_encrypted TEXT,                -- 加密存储
    bank_account_encrypted TEXT,           -- 加密存储
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4.4.4 数据脱敏

**动态数据脱敏**：

```rust
// 数据脱敏规则
pub fn mask_sensitive_data(value: &str, data_type: DataType) -> String {
    match data_type {
        DataType::Phone => {
            // 手机号：138****1234
            if value.len() >= 11 {
                format!("{}****{}", &value[..3], &value[7..])
            } else {
                value.to_string()
            }
        }
        DataType::Email => {
            // 邮箱：a***@example.com
            let parts: Vec<&str> = value.split('@').collect();
            if parts.len() == 2 {
                let local = parts[0];
                let masked = if local.len() > 1 {
                    format!("{}***", &local[..1])
                } else {
                    "***".to_string()
                };
                format!("{}@{}", masked, parts[1])
            } else {
                value.to_string()
            }
        }
        DataType::IdCard => {
            // 身份证：110***********1234
            if value.len() >= 18 {
                format!("{}***{}", &value[..3], &value[15..])
            } else {
                value.to_string()
            }
        }
        DataType::BankCard => {
            // 银行卡：**** **** **** 1234
            if value.len() >= 4 {
                format!("**** **** **** {}", &value[value.len()-4..])
            } else {
                "****".to_string()
            }
        }
        _ => value.to_string(),
    }
}
```

#### 4.4.5 审计日志

**审计日志记录**：

```rust
// 审计日志中间件
pub async fn audit_log(
    req: Request<Body>,
    next: Next,
) -> Response {
    let start = std::time::Instant::now();
    let method = req.method().to_string();
    let path = req.uri().path().to_string();
    let user_context = req.extensions().get::<UserContext>().cloned();

    let response = next.run(req).await;

    // 记录审计日志
    let audit_entry = AuditLog {
        id: Uuid::new_v4(),
        user_id: user_context.as_ref().map(|c| c.user_id),
        tenant_id: user_context.as_ref().map(|c| c.tenant_id),
        action: format!("{} {}", method, path),
        resource_type: extract_resource_type(&path),
        resource_id: extract_resource_id(&path),
        ip_address: extract_client_ip(&req),
        user_agent: extract_user_agent(&req),
        status: response.status().as_u16(),
        duration_ms: start.elapsed().as_millis() as i64,
        created_at: Utc::now(),
    };

    // 异步写入审计日志
    tokio::spawn(async move {
        save_audit_log(audit_entry).await;
    });

    response
}
```

**审计日志表结构**：

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    user_id UUID,
    tenant_id UUID,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    status SMALLINT,
    duration_ms BIGINT,
    request_body JSONB,      -- 可选：请求体
    response_body JSONB,     -- 可选：响应体
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

#### 4.4.6 安全配置清单

| 安全项 | 配置 | 说明 |
|--------|------|------|
| **HTTPS** | 强制启用 | 所有流量通过 TLS 1.3 |
| **CORS** | 白名单模式 | 仅允许指定域名跨域 |
| **CSP** | 严格策略 | 限制脚本、样式来源 |
| **HSTS** | max-age=31536000 | 强制 HTTPS 一年 |
| **X-Frame-Options** | SAMEORIGIN | 防止点击劫持 |
| **X-Content-Type-Options** | nosniff | 防止 MIME 类型嗅探 |
| **密码策略** | 最少 8 位，含大小写数字 | bcrypt 哈希存储 |
| **会话超时** | 30 分钟无操作 | 自动登出 |
| **登录限制** | 5 次失败锁定 15 分钟 | 防暴力破解 |

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

| 技术领域 | 选型 | 版本 | 备选 |
|---------|------|------|------|
| 后端语言 | Rust | 1.76+ | - |
| Web 框架 | Axum | 0.8 | Actix-web |
| 数据库 | PostgreSQL | 16+ | - |
| ORM | SQLx | 0.8.6 | - |
| 缓存 | Redis | 7.2+ | - |
| 消息队列 | RabbitMQ / NATS | 3.13+ | Kafka |
| 前端框架 | React | 19.2.7 | Vue 3 |
| 构建工具 | Vite | 8.0.16 | Webpack 5 |
| 模块联邦 | @module-federation/vite | 1.16.8 | @originjs/vite-plugin-federation |
| 状态管理 | Zustand | 5.0.14 | Jotai |
| UI 组件库 | MUI Material | 6.5.0 | - |
| 路由 | React Router | 7.17.0 | - |
| 数据缓存 | TanStack React Query | 5.101.0 | - |
| 图表 | Recharts | 3.8.1 | - |
| 国际化 | i18next | 26.3.1 | - |
| 容器化 | Docker | 25+ | - |
| 编排 | Docker Compose / K8s | 2.24+ / 1.29+ | - |
| 监控 | Prometheus + Grafana | 2.51+ / 10.4+ | - |
| OpenAPI | Utoipa | 4 | - |
| JWT | jsonwebtoken | 9.0 | - |

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

### Phase 1 核心平台统一 - 已完成

| 任务 | 状态 | 完成日期 |
|------|------|----------|
| 创建 unified-core 项目骨架 | ✅ 完成 | 2026-06-10 |
| 模块注册与发现机制 | ✅ 完成 | 2026-06-10 |
| IAM 模块迁移 | ✅ 完成 | 2026-06-10 |
| Doc 模块迁移 | ✅ 完成 | 2026-06-10 |
| Flow 模块迁移 | ✅ 完成 | 2026-06-10 |
| File 模块迁移 | ✅ 完成 | 2026-06-10 |
| Communication 模块迁移（IM/Mail/Notification） | ✅ 完成 | 2026-06-10 |
| 统一数据库 Schema 设计 | ✅ 完成 | 2026-06-10 |
| 集成测试与性能调优 | ✅ 完成 | 2026-06-11 |

### Phase 2 权限/租户/计费模型 - 已完成

| 任务 | 状态 | 完成日期 |
|------|------|----------|
| 权限模型设计（ABAC+RBAC） | ✅ 完成 | 2026-06-10 |
| 权限决策引擎实现 | ✅ 完成 | 2026-06-10 |
| 租户数据模型设计 | ✅ 完成 | 2026-06-10 |
| 租户隔离机制实现 | ✅ 完成 | 2026-06-10 |
| 计费模型设计 | ✅ 完成 | 2026-06-11 |
| 用量采集服务实现 | ✅ 完成 | 2026-06-11 |

### Phase 3 前端模块化 - 已完成

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

### Phase 4 插件市场 - 已完成

| 任务 | 状态 | 完成日期 |
|------|------|----------|
| 插件规范制定（plugin.yaml） | ✅ 完成 | 2026-06-10 |
| 插件加载器开发 | ✅ 完成 | 2026-06-10 |
| 插件注册中心实现 | ✅ 完成 | 2026-06-10 |
| ERP 插件重构 | ✅ 完成 | 2026-06-18 |
| HRM 插件重构 | ✅ 完成 | 2026-06-15 |
| CRM 插件重构 | ✅ 完成 | 2026-06-15 |
| PM 插件重构 | ✅ 完成 | 2026-06-12 |
| RS 插件重构 | ✅ 完成 | 2026-06-14 |
| SCM 插件重构 | ✅ 完成 | 2026-06-16 |
| SRM 插件重构 | ✅ 完成 | 2026-06-16 |
| WMS 插件重构 | ✅ 完成 | 2026-06-16 |
| GIS 插件重构 | ✅ 完成 | 2026-06-13 |
| AI 插件重构 | ✅ 完成 | 2026-06-11 |
| Mobile 插件重构 | ✅ 完成 | 2026-06-17 |

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

### 附录 E：数据库 Schema 设计

#### E.1 核心 Schema 结构

```sql
-- 核心平台 Schema
CREATE SCHEMA IF NOT EXISTS public;           -- 共享表（公司、部门、员工、配置）
CREATE SCHEMA IF NOT EXISTS unified_core;     -- 核心平台内部表

-- 插件 Schema（按需创建）
CREATE SCHEMA IF NOT EXISTS plugin_erp;
CREATE SCHEMA IF NOT EXISTS plugin_hrm;
CREATE SCHEMA IF NOT EXISTS plugin_crm;
CREATE SCHEMA IF NOT EXISTS plugin_pm;
CREATE SCHEMA IF NOT EXISTS plugin_rs;
CREATE SCHEMA IF NOT EXISTS plugin_scm;
CREATE SCHEMA IF NOT EXISTS plugin_srm;
CREATE SCHEMA IF NOT EXISTS plugin_wms;
CREATE SCHEMA IF NOT EXISTS plugin_gis;
CREATE SCHEMA IF NOT EXISTS plugin_ai;
CREATE SCHEMA IF NOT EXISTS plugin_mobile;
CREATE SCHEMA IF NOT EXISTS plugin_manufacturing;
CREATE SCHEMA IF NOT EXISTS plugin_quality_assurance;
CREATE SCHEMA IF NOT EXISTS plugin_analytics;
```

#### E.2 多租户数据隔离

```sql
-- 租户配置表
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    type VARCHAR(20) DEFAULT 'shared',  -- independent | shared
    plan VARCHAR(50) DEFAULT 'basic',
    status VARCHAR(20) DEFAULT 'active',
    quota JSONB DEFAULT '{}',
    features JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 租户上下文设置（行级隔离）
CREATE OR REPLACE FUNCTION set_tenant_context(tenant_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant', tenant_id::TEXT, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

**文档结束**
