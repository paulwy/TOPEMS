# TOPEMS 插件系统 API 文档

> 版本: 2.0.0 | 更新日期: 2026-07-16 | 适用 V13.0+ 插件化架构

## 概述

TOPEMS 采用插件化架构，所有业务模块作为独立插件运行，通过 REST API 与统一核心（unified-core）通信。V13.0 引入了**插件注册安全令牌**、**Consul 服务发现**、**心跳超时检测**、**依赖检查**和**动态导航**等增强机制。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Web)                          │
│         PluginManager.fetchNavigationConfig()               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    unified-core (8000)                      │
│  插件注册表 │ 路由代理 │ 权限管理 │ 认证 │ 心跳检测          │
│  导航配置 API │ 依赖检查 │ 注册令牌验证                       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   ERP (8010)  │    │   HRM (8020)  │    │   QMS (8050)  │
│ X-Plugin-Token│    │ X-Plugin-Token│    │ X-Plugin-Token│
│ 心跳上报      │    │ 心跳上报      │    │ 心跳上报      │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ Consul (可选) │    │   PostgreSQL  │    │    Redis      │
│  服务发现     │    │   数据存储    │    │    缓存       │
└───────────────┘    └───────────────┘    └───────────────┘
```

## 插件列表

| 插件 | 端口 | 路由前缀 | 状态 | 功能 | 依赖 |
|------|------|----------|------|------|------|
| Workflow | 8000 | /api/flow/* | ✅ 核心内置 | 工作流引擎 | - |
| IAM | 8000 | /api/core/iam/* | ✅ 核心内置 | 身份与访问管理 | - |
| ERP | 8010 | /api/erp/* | ✅ 业务插件 | 企业资源计划 | - |
| Finance | 8011 | /api/finance/* | ✅ 业务插件 | 财务管理 | erp |
| HRM | 8020 | /api/hrm/* | ✅ 业务插件 | 人力资源管理 | - |
| PM | 8023 | /api/pm/* | ✅ 业务插件 | 项目管理 | - |
| CRM | 8029 | /api/crm/* | ✅ 业务插件 | 客户关系管理 | - |
| MES | 8030 | /api/mfg/* | ✅ 业务插件 | 制造执行系统 | - |
| PDM | 8031 | /api/pdm/* | ✅ 业务插件 | 产品数据管理 | - |
| SCM | 8040 | /api/scm/* | ✅ 业务插件 | 供应链管理 | - |
| WMS | 8041 | /api/wms/* | ✅ 业务插件 | 仓储管理 | - |
| SRM | 8042 | /api/srm/* | ✅ 业务插件 | 供应商管理 | - |
| QMS | 8050 | /api/qms/* | ✅ 业务插件 | 质量管理 | erp, mes |
| LIMS | 8051 | /api/lims/* | ✅ 业务插件 | 实验室信息管理 | - |
| EHS | 8052 | /api/ehs/* | ✅ 业务插件 | 环境健康安全 | - |
| RD | 8053 | /api/rd/* | ✅ 业务插件 | 研发管理 | pm, mes |
| BI | 8060 | /api/bi/* | ✅ 业务插件 | 商业智能 | - |
| Report | 8061 | /api/report/* | ✅ 业务插件 | 报表服务 | - |
| Portal | 8063 | /api/portal/* | ✅ 业务插件 | 企业门户 | - |
| AI | 8013 AI 智能服务 | - |
| Mobile | 8070 | /api/mobile/* | ✅ 业务插件 | 移动端服务 | - |
| GIS | 8071 | /api/gis/* | ✅ 业务插件 | 地理信息服务 | mes |
| Integration | 8072 | /api/integration/* | ✅ 业务插件 | 系统集成 | - |

---

## 一、核心 API（unified-core）

### 1.1 插件管理

#### GET /api/core/plugins
获取已安装的插件列表

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "code": "erp",
      "name": "企业资源计划",
      "version": "1.0.0",
      "plugin_type": "business",
      "is_published": true,
      "category": "Business",
      "runtime_status": "running",
      "runtime_url": "http://localhost:8010",
      "dependencies": []
    }
  ]
}
```

#### GET /api/core/plugins/{code}
获取插件详情（含权限）

#### POST /api/core/plugins/{code}/install
安装插件（V13.0 增强依赖检查）

**依赖检查逻辑：** 安装前验证插件声明的所有 `dependencies` 是否已安装且激活。缺失依赖时返回错误：
```json
{
  "success": false,
  "message": "Missing dependencies: [erp, mes]. Please install and activate them first."
}
```

#### POST /api/core/plugins/{code}/uninstall
卸载插件（V13.0 增强反向依赖检查）

**请求体：**
```json
{
  "uninstall_tier": "disable | uninstall | delete",
  "confirmed": false,
  "reason": null,
  "backup": true
}
```

**反向依赖检查：** 卸载前查找是否有其他已安装插件依赖当前插件。存在依赖时返回错误：
```json
{
  "success": false,
  "message": "Cannot uninstall: [qms, rd] depend(s) on this plugin. Please uninstall them first or use disable tier."
}
```

**三级卸载策略：**
| Tier | 行为 | 数据保留 |
|------|------|---------|
| disable | 仅禁用（is_active=false） | 全部保留 |
| uninstall | 移除安装记录 | 保留 90 天 |
| delete | 完全删除（需确认+原因） | 创建备份后删除 |

#### POST /api/core/plugins/{code}/enable
启用插件

#### POST /api/core/plugins/{code}/disable
禁用插件

### 1.2 插件注册（V13.0 安全增强）

#### POST /api/core/plugin/dev/plugins/{code}/register
插件注册到核心（**需安全令牌**）

**请求头：**
```
X-Plugin-Token: <PLUGIN_REGISTRATION_TOKEN>
Content-Type: application/json
```

**请求体：**
```json
{
  "code": "qms",
  "name": "质量管理",
  "description": "QMS 质量管理系统",
  "version": "1.0.0",
  "runtime_url": "http://localhost:8050",
  "base_path": "/api/qms",
  "category": "quality",
  "permissions": [
    { "code": "qms:read", "name": "查看质量", "description": "查看质量数据" }
  ],
  "dependencies": ["erp", "mes"],
  "navigation_config": {
    "modules": [
      {
        "code": "qms",
        "label": "质量管理",
        "path": "/qms",
        "icon": "ShieldCheck",
        "order": 50,
        "group": "质量/研发"
      }
    ]
  }
}
```

**安全令牌验证逻辑：**
- 若 `PLUGIN_REGISTRATION_TOKEN` 环境变量未设置或为空 → 开发模式，跳过验证
- 若已设置 → 请求头 `X-Plugin-Token` 必须匹配，否则返回 403

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "qms",
    "runtime_status": "running"
  }
}
```

#### POST /api/core/plugin/dev/plugins/{code}/heartbeat
插件心跳上报（V13.0 新增）

**请求头：**
```
X-Plugin-Token: <PLUGIN_REGISTRATION_TOKEN>
```

**响应：**
```json
{ "success": true, "data": { "status": "running", "timestamp": "2026-07-16T..." } }
```

**心跳超时检测：** 核心服务后台任务每 30 秒检测一次：
- `last_heartbeat` 超过 90 秒 → 标记为 `offline`
- 注册超过 2 分钟但从未心跳 → 标记为 `offline`

### 1.3 动态导航配置（V13.0 新增）

#### GET /api/core/plugin/navigation-config
获取所有已注册插件的导航配置（前端动态菜单数据源）

**响应示例：**
```json
{
  "success": true,
  "data": {
    "modules": [
      {
        "code": "qms",
        "name": "质量管理",
        "category": "quality",
        "navigation": {
          "modules": [
            {
              "code": "qms",
              "label": "质量管理",
              "path": "/qms",
              "icon": "ShieldCheck",
              "order": 50,
              "group": "质量/研发"
            }
          ]
        }
      }
    ]
  }
}
```

**前端使用：** `PluginManager.fetchNavigationConfig()` 优先从此 API 获取，失败时降级到本地静态配置。

---

### 1.4 认证

#### POST /api/core/iam/v1/auth/login
用户登录

**请求体：**
```json
{
  "username": "admin",
  "password": "password123"
}
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "...",
    "token_type": "Bearer",
    "expires_in": 86400,
    "user": {
      "id": "uuid",
      "username": "admin",
      "is_superuser": true
    }
  }
}
```

---

### 1.5 租户管理

#### GET /api/core/tenants
获取租户列表

#### POST /api/core/tenants
创建租户

#### GET /api/core/tenants/{id}
获取租户详情

#### PUT /api/core/tenants/{id}
更新租户

#### DELETE /api/core/tenants/{id}
删除租户

---

## 二、插件接口（各插件通用）

所有插件必须实现以下接口：

### 2.1 插件信息

#### GET /api/plugins/info
获取插件信息（无需认证）

**响应示例：**
```json
{
  "success": true,
  "data": {
    "code": "erp",
    "name": "企业资源计划",
    "version": "1.0.0",
    "description": "ERP 企业资源计划系统",
    "author": "TOPEMS",
    "category": "Business",
    "plugin_type": "business",
    "permissions": [
      {
        "code": "erp:purchase:read",
        "name": "查看采购",
        "description": "查看采购单据"
      }
    ],
    "dependencies": [],
    "navigation_config": {}
  }
}
```

### 2.2 健康检查

#### GET /api/plugins/health
获取插件健康状态（无需认证）

**响应示例：**
```json
{
  "success": true,
  "data": {
    "code": "erp",
    "status": "healthy",
    "uptime": 86400,
    "version": "1.0.0"
  }
}
```

#### GET /health
基础健康检查（无需认证）

---

## 三、业务 API

### 3.1 ERP (/api/erp/*)

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | /api/erp/purchase-orders | 采购订单列表 | erp:purchase:read |
| POST | /api/erp/purchase-orders | 创建采购订单 | erp:purchase:write |
| GET | /api/erp/sales-orders | 销售订单列表 | erp:sale:read |
| POST | /api/erp/sales-orders | 创建销售订单 | erp:sale:write |
| GET | /api/erp/inventory | 库存查询 | erp:inventory:read |
| POST | /api/erp/inventory/transfer | 库存调拨 | erp:inventory:write |

### 3.2 HRM (/api/hrm/*)

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | /api/hrm/employees | 员工列表 | hrm:employee:read |
| POST | /api/hrm/employees | 创建员工 | hrm:employee:write |
| GET | /api/hrm/departments | 部门列表 | hrm:department:read |
| GET | /api/hrm/attendances | 考勤记录 | hrm:attendance:read |
| POST | /api/hrm/attendances | 打卡 | hrm:attendance:write |
| GET | /api/hrm/payroll | 工资单 | hrm:payroll:read |

### 3.3 QMS (/api/qms/*) — 依赖: erp, mes

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | /api/qms/inspections | 检验单列表 | qms:inspection:read |
| POST | /api/qms/inspections | 创建检验单 | qms:inspection:write |
| GET | /api/qms/fmea | FMEA 分析 | qms:fmea:read |
| GET | /api/qms/nonconformities | 不合格品 | qms:nonconformity:read |

### 3.4 RD (/api/rd/*) — 依赖: pm, mes

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | /api/rd/projects | 研发项目 | rd:project:read |
| POST | /api/rd/projects | 创建研发项目 | rd:project:write |

---

## 四、前端 API 客户端

### 4.1 插件市场

```typescript
import { pluginApi, fetchAllPluginInfo, PLUGIN_REGISTRY } from '@/api/plugin';

// 列出已安装插件
const plugins = await pluginApi.listInstalled();

// 获取插件详情
const details = await pluginApi.getDetails('erp');

// 安装插件（V13.0 会自动进行依赖检查）
const tenantPlugin = await pluginApi.install('erp');

// 卸载插件（V13.0 会自动进行反向依赖检查）
await pluginApi.uninstall('qms', { uninstall_tier: 'disable' });
```

### 4.2 动态导航配置（V13.0 新增）

```typescript
import { PluginManager } from '@/lib/plugin-loader/PluginManager';

// 从后端获取动态导航配置（带缓存）
const navConfig = await PluginManager.fetchNavigationConfig();

// 失败时自动降级到本地静态配置
```

### 4.3 插件注册表

```typescript
import { PLUGIN_REGISTRY } from '@/api/plugin';

// 获取插件运行 URL
const erpUrl = PLUGIN_REGISTRY.erp.url; // http://localhost:8010
```

---

## 五、环境变量

### 5.1 通用环境变量

| 变量 | 说明 | 必需 | 示例 |
|------|------|------|------|
| SERVER_PORT | 服务端口 | 是 | 8010 |
| DATABASE_URL | 数据库连接 | 是 | postgres://user:pass@host:5432/db |
| JWT_SECRET | JWT 密钥 | 是 | your-secret-key |
| REDIS_URL | Redis 连接（可选）| 否 | redis://localhost:6379 |

### 5.2 插件架构环境变量（V13.0 新增）

| 变量 | 说明 | 必需 | 默认 | 示例 |
|------|------|------|------|------|
| PLUGIN_REGISTRATION_TOKEN | 插件注册安全令牌 | 生产环境必须 | 空（开发模式） | `openssl rand -hex 32` |
| CONSUL_ENABLED | 启用 Consul 服务发现 | 否 | false | true |
| CONSUL_URL | Consul 地址 | 否 | http://localhost:8500 | http://consul:8500 |
| CONSUL_TOKEN | Consul ACL 令牌 | 否 | 空 | your-consul-token |
| SERVICE_HEARTBEAT_INTERVAL | 服务心跳间隔（秒） | 否 | 30 | 30 |
| PLUGIN_HEARTBEAT_TIMEOUT | 插件心跳超时阈值（秒） | 否 | 90 | 90 |
| PLUGIN_AUTO_REGISTER | 启动时自动注册插件 | 否 | true | true |
| PLUGIN_REGISTER_URL | 插件注册 URL | 否 | http://localhost:8000/... | - |

---

## 六、认证流程

1. 用户登录获取 JWT token
2. 前端在请求头添加 `Authorization: Bearer {token}`
3. unified-core 验证 token 并提取用户信息
4. 用户信息通过 `X-User-Id` header 传递给插件
5. 插件根据用户权限返回数据

```
Header: Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Header: X-Tenant-ID: tenant-123
Header: X-User-Id: user-456
```

### 6.1 插件注册认证流程（V13.0 新增）

1. 运维设置 `PLUGIN_REGISTRATION_TOKEN` 环境变量
2. 插件启动时读取令牌（从环境变量或配置文件）
3. 插件向核心注册时携带 `X-Plugin-Token: <token>` 请求头
4. 核心验证令牌匹配后完成注册
5. 插件定期上报心跳（携带令牌）

```
Header: X-Plugin-Token: <PLUGIN_REGISTRATION_TOKEN>
```

---

## 七、错误码

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 / 插件注册令牌无效 |
| 404 | 资源不存在 |
| 409 | 冲突（如依赖检查失败） |
| 500 | 服务器内部错误 |

---

## 八、版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 2.0.0 | 2026-07-16 | V13.0 插件化架构整改：注册安全令牌、Consul 服务发现、心跳超时检测、依赖检查、动态导航、集中化配置 |
| 1.1.0 | 2024-06-18 | 插件化架构重构，新增 9 个插件 |
| 1.0.0 | 2024-01-01 | 初始版本 |
