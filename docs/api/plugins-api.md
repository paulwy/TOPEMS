# TOPEMS 插件系统 API 文档

## 概述

TOPEMS 采用插件化架构，所有业务模块作为独立插件运行，通过 REST API 与统一核心（unified-core）通信。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Web)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    unified-core (8000)                      │
│         插件注册表 │ 路由代理 │ 权限管理 │ 认证              │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   ERP (8010)  │    │   HRM (8011)  │    │   CRM (8012)  │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│ /api/erp/*    │    │ /api/hrm/*    │    │ /api/crm/*    │
└───────────────┘    └───────────────┘    └───────────────┘
```

## 插件列表

| 插件 | 端口 | 路由前缀 | 状态 | 功能 |
|------|------|----------|------|------|
| Workflow | 8000 | /api/flow/* | ✅ | 工作流引擎 |
| ERP | 8010 | /api/erp/* | ✅ | 企业资源计划 |
| HRM | 8011 | /api/hrm/* | ✅ | 人力资源管理 |
| CRM | 8012 | /api/crm/* | ✅ | 客户关系管理 |
| MES | 8030 | /api/mfg/* | ✅ | 制造执行系统 |
| QA | 8032 | /api/qa/* | ✅ | 质量管理与安全 |
| SCM | 8040 | /api/scm/* | ✅ | 供应链管理 |
| WMS | 8042 | /api/wms/* | ✅ | 仓储管理 |
| BI | 8044 | /api/bi/* | ✅ | 商业智能 |
| PM | 8046 | /api/pm/* | ✅ | 项目管理 |
| AI | 8050 | /api/ai/* | ✅ | AI 智能服务 |
| GIS | 8054 | /api/gis/* | ✅ | 地理信息服务 |
| Mobile | 8056 | /api/mobile/* | ✅ | 移动端服务 |
| RS | 8058 | /api/rs/* | ✅ | 研发管理 |
| SRM | 8060 | /api/srm/* | ✅ | 供应商管理 |
| Monitor | 8064 | /api/monitor/* | ✅ | 监控告警 |
| Portal | 8066 | /api/portal/* | ✅ | 企业门户 |
| Integration | 8068 | /api/integration/* | ✅ | 系统集成 |

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
      "runtime_url": "http://localhost:8010"
    }
  ]
}
```

#### GET /api/core/plugins/{code}
获取插件详情（含权限）

**响应示例：**
```json
{
  "success": true,
  "data": {
    "plugin": {
      "id": "1",
      "code": "erp",
      "name": "企业资源计划"
    },
    "permissions": [
      {
        "id": "1",
        "plugin_code": "erp",
        "permission_code": "erp:purchase:read",
        "permission_name": "查看采购"
      }
    ]
  }
}
```

#### POST /api/core/plugins/{code}/install
安装插件

**请求体：** `{}`

**响应示例：**
```json
{
  "success": true,
  "data": {
    "id": "1",
    "plugin_id": "1",
    "tenant_id": "tenant-123",
    "installed_version": "1.0.0",
    "is_active": true,
    "license_type": "standard",
    "activated_at": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /api/core/plugins/{code}/enable
启用插件

#### POST /api/core/plugins/{code}/disable
禁用插件

#### POST /api/core/plugins/{code}/uninstall
卸载插件

---

### 1.2 认证

#### POST /api/auth/login
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
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_at": "2024-01-16T10:30:00Z",
    "user": {
      "id": "user-123",
      "username": "admin",
      "name": "管理员"
    }
  }
}
```

---

### 1.3 租户管理

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
      },
      {
        "code": "erp:sale:read",
        "name": "查看销售",
        "description": "查看销售单据"
      }
    ]
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

**响应示例：**
```json
{
  "status": "healthy"
}
```

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

### 3.3 CRM (/api/crm/*)

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | /api/crm/customers | 客户列表 | crm:customer:read |
| POST | /api/crm/customers | 创建客户 | crm:customer:write |
| GET | /api/crm/contacts | 联系人列表 | crm:contact:read |
| GET | /api/crm/opportunities | 商机列表 | crm:opportunity:read |
| GET | /api/crm/contracts | 合同列表 | crm:contract:read |

### 3.4 MES (/api/mfg/*)

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | /api/mfg/production-orders | 生产工单列表 | mes:production_order:read |
| POST | /api/mfg/production-orders | 创建生产工单 | mes:production_order:write |
| GET | /api/mfg/processes | 工艺路线 | mes:process:read |
| GET | /api/mfg/equipment | 设备列表 | mes:equipment:read |
| POST | /api/mfg/equipment/maintenance | 设备报修 | mes:equipment:write |

### 3.5 WMS (/api/wms/*)

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | /api/wms/warehouses | 仓库列表 | wms:warehouse:read |
| GET | /api/wms/inventory | 库内库存 | wms:inventory:read |
| POST | /api/wms/inbound | 入库单 | wms:inbound:write |
| POST | /api/wms/outbound | 出库单 | wms:outbound:write |

### 3.6 BI (/api/bi/*)

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| GET | /api/bi/dashboards | 仪表盘列表 | bi:dashboard:read |
| POST | /api/bi/dashboards | 创建仪表盘 | bi:dashboard:write |
| GET | /api/bi/reports | 报表列表 | bi:report:read |
| POST | /api/bi/reports | 创建报表 | bi:report:write |
| GET | /api/bi/analyses | 数据分析 | bi:analysis:read |

### 3.7 AI (/api/ai/*)

| 方法 | 路径 | 功能 | 权限 |
|------|------|------|------|
| POST | /api/ai/qa | 问答搜索 | ai:qa:read |
| POST | /api/ai/document/analyze | 文档分析 | ai:document:read |
| POST | /api/ai/vector/search | 向量搜索 | ai:vector:read |
| POST | /api/ai/generate | 智能生成 | ai:generate:read |

---

## 四、前端 API 客户端

### 4.1 插件市场

```typescript
import { pluginApi, fetchAllPluginInfo, PLUGIN_REGISTRY } from '@/api/plugin';

// 列出已安装插件
const plugins = await pluginApi.listInstalled();

// 获取插件详情
const details = await pluginApi.getDetails('erp');

// 安装插件
const tenantPlugin = await pluginApi.install('erp');

// 启用/禁用插件
await pluginApi.enable('erp');
await pluginApi.disable('erp');

// 从运行中的服务获取插件信息
const runningPlugins = await fetchAllPluginInfo();

// 检查插件健康状态
const { healthy, status } = await checkPluginHealth('erp');
```

### 4.2 插件注册表

```typescript
import { PLUGIN_REGISTRY } from '@/api/plugin';

// 获取插件运行 URL
const erpUrl = PLUGIN_REGISTRY.erp.url; // http://localhost:8010

// 遍历所有插件
Object.entries(PLUGIN_REGISTRY).forEach(([code, config]) => {
  console.log(`${code}: ${config.url}:${config.port}`);
});
```

---

## 五、环境变量

| 变量 | 说明 | 必需 | 示例 |
|------|------|------|------|
| SERVER_PORT | 服务端口 | 是 | 8010 |
| DATABASE_URL | 数据库连接 | 是 | postgres://user:pass@host:5432/db |
| JWT_SECRET | JWT 密钥 | 是 | your-secret-key |
| REDIS_URL | Redis 连接（可选）| 否 | redis://localhost:6379 |

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

---

## 七、错误码

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 八、版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2024-01-01 | 初始版本 |
| 1.1.0 | 2024-06-18 | 插件化架构重构，新增 9 个插件 |
