# TOPEMS Tenant 用户手册

<lark-toc />

## 1. 系统概述

### 1.1 什么是 Tenant

Tenant（租户）是 TOPEMS 系统的多租户管理模块，支持：

- 租户创建与管理
- 租户配额管理
- 租户状态控制
- 模块激活/停用

### 1.2 多租户架构

TOPEMS 采用多租户隔离架构：

- **行级租户隔离**：公有 SaaS 部署，数据通过 tenant_id 隔离
- **Schema 隔离**：私有化部署可配置为独立 Schema 模式

### 1.3 核心概念

| 概念 | 说明 |
|------|------|
| 租户 | 独立的企业组织单位，拥有独立的数据 |
| 租户配额 | 限制租户使用的资源量（用户数、存储等） |
| 模块激活 | 控制租户可使用的功能模块 |

---

## 2. 租户管理 API

### 2.1 创建租户

```bash
curl -X POST http://localhost:8000/api/core/tenant/tenants \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "示例公司",
    "code": "demo",
    "domain": "demo.topems.com",
    "plan": "professional",
    "max_users": 100,
    "max_storage_gb": 500
  }'
```

### 2.2 查询租户列表

```bash
curl http://localhost:8000/api/core/tenant/tenants \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.3 查询单个租户

```bash
curl http://localhost:8000/api/core/tenant/tenants/TENANT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.4 按编码查询租户

```bash
curl http://localhost:8000/api/core/tenant/by-code/demo \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.5 更新租户信息

```bash
curl -X PUT http://localhost:8000/api/core/tenant/tenants/TENANT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "示例科技公司",
    "plan": "enterprise",
    "max_users": 500
  }'
```

### 2.6 激活租户

```bash
curl -X POST http://localhost:8000/api/core/tenant/tenants/TENANT_ID/activate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.7 暂停租户

```bash
curl -X POST http://localhost:8000/api/core/tenant/tenants/TENANT_ID/suspend \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 3. 配额管理 API

### 3.1 查询租户配额

```bash
curl http://localhost:8000/api/core/tenant/tenants/TENANT_ID/quota \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "tenant_id": "550e8400-e29b-41d4-a716-446655440000",
    "max_users": 100,
    "used_users": 25,
    "max_storage_gb": 500,
    "used_storage_gb": 50,
    "max_modules": 10,
    "used_modules": 5
  }
}
```

---

## 4. 模块管理 API

### 4.1 查询租户已激活的模块

```bash
curl http://localhost:8000/api/core/tenant/tenants/TENANT_ID/modules \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "module_code": "finance",
      "module_name": "财务模块",
      "status": "active",
      "activated_at": "2026-01-01T00:00:00Z",
      "expires_at": "2027-01-01T00:00:00Z"
    },
    {
      "module_code": "hrm",
      "module_name": "人力资源",
      "status": "active",
      "activated_at": "2026-01-15T00:00:00Z",
      "expires_at": "2027-01-15T00:00:00Z"
    }
  ]
}
```

### 4.2 激活模块

```bash
curl -X POST http://localhost:8000/api/core/tenant/tenants/TENANT_ID/modules/finance/activate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.3 停用模块

```bash
curl -X POST http://localhost:8000/api/core/tenant/tenants/TENANT_ID/modules/finance/deactivate \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 5. 预定义模块

| 模块代码 | 说明 |
|----------|------|
| `finance` | 财务核算模块 |
| `hrm` | 人力资源管理 |
| `crm` | 客户关系管理 |
| `pm` | 项目管理 |
| `scm` | 供应链管理 |
| `ai` | AI 智能助手 |
| `workflow` | 工作流引擎 |
| `doc` | 文档管理 |
| `file` | 文件存储 |

---

## 6. 租户套餐

| 套餐 | 说明 | 最大用户数 | 最大存储 |
|------|------|-----------|----------|
| `basic` | 基础版 | 10 | 50GB |
| `professional` | 专业版 | 100 | 500GB |
| `enterprise` | 企业版 | 500 | 2TB |
| `unlimited` | 无限版 | 无限制 | 无限制 |

---

## 7. API 参考

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/core/tenant/tenants` | 查询租户列表 |
| POST | `/api/core/tenant/tenants` | 创建租户 |
| GET | `/api/core/tenant/tenants/{id}` | 查询单个租户 |
| PUT | `/api/core/tenant/tenants/{id}` | 更新租户 |
| GET | `/api/core/tenant/by-code/{code}` | 按编码查询租户 |
| POST | `/api/core/tenant/tenants/{id}/activate` | 激活租户 |
| POST | `/api/core/tenant/tenants/{id}/suspend` | 暂停租户 |
| GET | `/api/core/tenant/tenants/{id}/quota` | 查询租户配额 |
| GET | `/api/core/tenant/tenants/{id}/modules` | 查询已激活模块 |
| POST | `/api/core/tenant/tenants/{tenant_id}/modules/{module_code}/activate` | 激活模块 |
| POST | `/api/core/tenant/tenants/{tenant_id}/modules/{module_code}/deactivate` | 停用模块 |

---

## 8. 常见问题

### 8.1 租户状态说明

| 状态 | 说明 |
|------|------|
| `active` | 正常运营 |
| `suspended` | 已暂停，无法登录 |
| `deleted` | 已删除 |

### 8.2 租户暂停后用户无法登录

**说明：** 暂停租户后，该租户下的所有用户将无法登录系统。

### 8.3 模块激活失败 - 配额不足

**说明：** 激活模块前需确保租户配额足够。

---

*文档版本：1.0.0*
*最后更新：2026-06-23*
