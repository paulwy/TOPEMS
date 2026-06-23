# TOPEMS IAM 用户手册

<lark-toc />

## 1. 系统概述

### 1.1 什么是 IAM

IAM（Identity and Access Management，身份与访问管理）是 TOPEMS 系统的核心模块，负责：

- 用户身份认证
- 权限管理
- 角色管理
- 访问控制

### 1.2 核心概念

| 概念 | 说明 |
|------|------|
| 用户 | 系统的使用主体，每个用户有唯一账号 |
| 角色 | 权限的集合，简化权限管理 |
| 权限 | 对特定资源的访问许可 |
| 租户 | 多租户隔离，确保数据安全 |

### 1.3 权限体系

TOPEMS 采用 RBAC（基于角色的访问控制）模型：

```
用户 → 角色 → 权限
```

一个用户可以拥有多个角色，权限通过角色间接分配。

---

## 2. 认证 API

### 2.1 用户登录

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJ0eXAiOiJKV1Q...",
    "refresh_token": "eyJ0eXAiOiJKV1Q...",
    "expires_in": 86400,
    "token_type": "Bearer"
  }
}
```

### 2.2 用户注册

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "password123",
    "email": "newuser@example.com",
    "full_name": "张三"
  }'
```

### 2.3 刷新 Token

```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

---

## 3. 用户管理

### 3.1 创建用户

```bash
curl -X POST http://localhost:8000/api/core/iam/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "username": "john",
    "password": "password123",
    "email": "john@example.com",
    "full_name": "约翰",
    "is_superuser": false
  }'
```

### 3.2 查询用户列表

```bash
curl http://localhost:8000/api/core/iam/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.3 查询单个用户

```bash
curl http://localhost:8000/api/core/iam/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.4 获取当前用户信息

```bash
curl http://localhost:8000/api/core/iam/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.5 更新用户信息

```bash
curl -X PUT http://localhost:8000/api/core/iam/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "full_name": "约翰·史密斯",
    "email": "john.smith@example.com"
  }'
```

### 3.6 修改密码

```bash
curl -X PUT http://localhost:8000/api/core/iam/users/USER_ID/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "old_password": "old_password",
    "new_password": "new_password"
  }'
```

### 3.7 禁用/启用用户

**禁用用户：**

```bash
curl -X POST http://localhost:8000/api/core/iam/users/USER_ID/disable \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**启用用户：**

```bash
curl -X POST http://localhost:8000/api/core/iam/users/USER_ID/enable \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.8 删除用户

```bash
curl -X DELETE http://localhost:8000/api/core/iam/users/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 4. 角色管理

### 4.1 创建角色

```bash
curl -X POST http://localhost:8000/api/core/iam/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "财务主管",
    "code": "finance_admin",
    "description": "负责财务管理",
    "permissions": ["finance:read", "finance:write", "finance:approve"]
  }'
```

### 4.2 查询角色列表

```bash
curl http://localhost:8000/api/core/iam/roles \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.3 查询单个角色

```bash
curl http://localhost:8000/api/core/iam/roles/ROLE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.4 更新角色

```bash
curl -X PUT http://localhost:8000/api/core/iam/roles/ROLE_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "财务总监",
    "description": "全面负责财务管理",
    "permissions": ["finance:read", "finance:write", "finance:approve", "finance:admin"]
  }'
```

### 4.5 删除角色

```bash
curl -X DELETE http://localhost:8000/api/core/iam/roles/ROLE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 5. 权限管理

### 5.1 查询权限列表

```bash
curl http://localhost:8000/api/core/iam/permissions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.2 查询用户权限

```bash
curl http://localhost:8000/api/core/iam/user-permissions/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.3 更新用户权限

```bash
curl -X PUT http://localhost:8000/api/core/iam/user-permissions/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "permissions": ["finance:read", "hrm:read", "crm:read"]
  }'
```

---

## 6. 预定义权限

TOPEMS 系统预定义了以下权限：

| 权限标识 | 说明 |
|----------|------|
| `iam:read` | 查看用户信息 |
| `iam:write` | 管理用户 |
| `hrm:read` | 查看人力资源信息 |
| `hrm:write` | 管理人力资源 |
| `erp:read` | 查看 ERP 数据 |
| `pm:read` | 查看项目管理 |
| `rs:read` | 查看资源管理 |
| `scm:read` | 查看供应链管理 |
| `crm:read` | 查看客户管理 |
| `ai:read` | 使用 AI 功能 |
| `workflow:read` | 查看工作流 |
| `workflow:approve` | 审批工作流 |
| `gis:read` | 查看 GIS 地图 |

---

## 7. API 参考

### 7.1 认证 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/login` | 用户登录 |
| POST | `/api/v1/auth/register` | 用户注册 |
| POST | `/api/v1/auth/refresh` | 刷新 Token |

### 7.2 用户管理 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/core/iam/users` | 查询用户列表 |
| POST | `/api/core/iam/users` | 创建用户 |
| GET | `/api/core/iam/users/{id}` | 查询单个用户 |
| PUT | `/api/core/iam/users/{id}` | 更新用户 |
| DELETE | `/api/core/iam/users/{id}` | 删除用户 |
| GET | `/api/core/iam/users/me` | 获取当前用户 |
| POST | `/api/core/iam/users/{id}/disable` | 禁用用户 |
| POST | `/api/core/iam/users/{id}/enable` | 启用用户 |
| PUT | `/api/core/iam/users/{id}/password` | 修改密码 |

### 7.3 角色管理 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/core/iam/roles` | 查询角色列表 |
| POST | `/api/core/iam/roles` | 创建角色 |
| GET | `/api/core/iam/roles/{id}` | 查询单个角色 |
| PUT | `/api/core/iam/roles/{id}` | 更新角色 |
| DELETE | `/api/core/iam/roles/{id}` | 删除角色 |

### 7.4 权限管理 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/core/iam/permissions` | 查询权限列表 |
| GET | `/api/core/iam/user-permissions/{user_id}` | 查询用户权限 |
| PUT | `/api/core/iam/user-permissions/{user_id}` | 更新用户权限 |

---

## 8. 常见问题

### 8.1 登录失败 - 用户名或密码错误

**解决方案：** 检查用户名和密码是否正确，或联系管理员重置密码。

### 8.2 Token 过期

**错误信息：** `Token has expired`

**解决方案：** 使用 refresh_token 调用 `/api/v1/auth/refresh` 获取新的 access_token。

### 8.3 权限不足

**错误信息：** `Permission denied`

**解决方案：** 联系管理员为用户分配相应角色或权限。

### 8.4 无法删除超级管理员

**说明：** 系统内置的超级管理员（admin）无法被删除。

---

## 附录 A: JWT Token 结构

### A.1 Token 包含的信息

```json
{
  "sub": "user_id",
  "username": "admin",
  "role": "admin",
  "roles": ["superadmin", "admin", "user"],
  "permissions": ["iam:read", "iam:write", ...],
  "is_superuser": true,
  "email": "admin@example.com",
  "tenant_id": "tenant_uuid",
  "exp": 1750700000,
  "iat": 1750613600
}
```

### A.2 Token 使用方式

在请求头中携带 Token：

```
Authorization: Bearer eyJ0eXAiOiJKV1Q...
```

---

*文档版本：1.0.0*
*最后更新：2026-06-23*
