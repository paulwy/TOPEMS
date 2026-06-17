# TOPEMS 认证和授权 API

**服务**: topems-iam
**端口**: 8000
**版本**: v1

---

## 1. 概述

认证和授权 API（IAM - Identity and Access Management）提供用户认证、权限管理和访问控制功能。

### 1.1 API 端点

| 功能 | 端点 | 方法 |
|------|------|------|
| 用户注册 | /api/v1/auth/register | POST |
| 用户登录 | /api/v1/auth/login | POST |
| 用户登出 | /api/v1/auth/logout | POST |
| 刷新 Token | /api/v1/auth/refresh | POST |
| 获取当前用户 | /api/v1/users/me | GET |
| 获取我的权限 | /api/v1/users/me/permissions | GET |
| 检查权限 | /api/v1/users/me/permissions/check | POST |

### 1.2 数据模型

#### User（用户）

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "testuser",
  "email": "test@example.com",
  "role": "admin",
  "roles": ["admin", "user"],
  "permissions": ["iam:users_read", "iam:roles_read"],
  "is_active": true,
  "is_superuser": false,
  "created_at": "2026-05-20T10:00:00Z"
}
```

#### AuthTokens（认证令牌）

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": { ... }
}
```

#### Role（角色）

```json
{
  "id": "role-001",
  "name": "admin",
  "description": "系统管理员",
  "created_at": "2026-05-20T10:00:00Z"
}
```

#### Permission（权限）

```json
{
  "id": "perm-001",
  "name": "rs:project:read",
  "resource": "project",
  "action": "read",
  "description": "查看研发项目"
}
```

---

## 2. 认证接口

### 2.1 用户注册

**端点**: `POST /api/v1/auth/register`

**描述**: 创建新用户账号

**请求头**:
```
Content-Type: application/json
```

**请求体**:
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "SecurePass123!"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名（3-20字符） |
| email | string | 是 | 邮箱地址 |
| password | string | 是 | 密码（至少8字符） |

**请求示例**:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "SecurePass123!"
  }'
```

**成功响应** (201 Created):

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 86400,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "newuser",
      "email": "newuser@example.com",
      "is_active": true,
      "created_at": "2026-05-22T10:00:00Z"
    }
  },
  "error": null
}
```

**失败响应** (400 Bad Request):

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "用户名已存在",
    "details": {
      "field": "username"
    }
  }
}
```

---

### 2.2 用户登录

**端点**: `POST /api/v1/auth/login`

**描述**: 用户登录系统，获取认证令牌

**请求头**:
```
Content-Type: application/json
```

**请求体**:
```json
{
  "username": "testuser",
  "password": "Test123456"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| username | string | 是 | 用户名或邮箱 |
| password | string | 是 | 密码 |

**请求示例**:

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test123456"
  }'
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "testuser",
      "email": "test@example.com",
      "role": "管理员",
      "roles": ["管理员"],
      "permissions": ["iam:users_read", "iam:users_create", "iam:roles_read", ...],
      "is_active": true,
      "created_at": "2026-05-20T10:00:00Z"
    }
  },
  "message": "欢迎回来，系统管理员！",
  "code": 200,
  "timestamp": "2026-05-27T12:00:00Z"
}
```

**失败响应** (401 Unauthorized):

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "用户名或密码错误",
    "details": {}
  }
}
```

---

### 2.3 用户登出

**端点**: `POST /api/v1/auth/logout`

**描述**: 用户登出，使当前 Token 失效

**认证**: 需要

**请求示例**:

```bash
curl -X POST http://localhost:8000/api/v1/auth/logout \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "message": "登出成功"
  },
  "error": null
}
```

---

### 2.4 刷新 Token

**端点**: `POST /api/v1/auth/refresh`

**描述**: 使用 refresh_token 获取新的 access_token

**请求体**:
```json
{
  "token": "refresh_token_here"
}
```

**请求示例**:

```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"token": "refresh_token_here"}'
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 3600,
    "username": "testuser",
    "is_superuser": false,
    "roles": ["管理员"],
    "permissions": ["iam:users_read", "iam:roles_read"]
  },
  "message": "Token刷新成功",
  "code": 200,
  "timestamp": "2026-05-27T12:00:00Z"
}
```

---

## 3. 用户管理接口

### 3.1 获取当前用户

**端点**: `GET /api/v1/users/me`

**描述**: 获取当前登录用户的信息

**认证**: 需要

**请求示例**:

```bash
curl -X GET http://localhost:8000/api/v1/users/me \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "testuser",
    "email": "test@example.com",
    "role": "管理员",
    "roles": ["管理员"],
    "permissions": ["iam:users_read", "iam:users_create", "iam:roles_read", ...],
    "is_active": true,
    "is_superuser": false,
    "created_at": "2026-05-20T10:00:00Z",
    "updated_at": "2026-05-20T10:00:00Z",
    "last_login_at": "2026-05-27T12:00:00Z"
  },
  "message": "Success",
  "code": 200,
  "timestamp": "2026-05-27T12:00:00Z"
}
```

---

### 3.2 获取我的权限

**端点**: `GET /api/v1/users/me/permissions`

**描述**: 获取当前用户的完整权限信息

**认证**: 需要

**请求示例**:

```bash
curl -X GET http://localhost:8000/api/v1/users/me/permissions \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "testuser",
      "email": "test@example.com",
      "full_name": "测试用户",
      "avatar_url": null,
      "is_active": true,
      "is_superuser": false,
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-20T10:00:00Z",
      "last_login_at": "2026-05-27T12:00:00Z"
    },
    "roles": [
      {
        "id": "00000000-0000-0000-0000-000000000001",
        "name": "管理员",
        "description": "系统管理员，拥有所有权限",
        "created_at": "2026-05-20T10:00:00Z"
      }
    ],
    "permissions": [
      {
        "id": "iam:users_read",
        "name": "读取用户",
        "category": "用户管理",
        "description": "查看用户列表和详情"
      },
      {
        "id": "iam:roles_read",
        "name": "读取角色",
        "category": "角色管理",
        "description": "查看角色列表"
      }
    ]
  },
  "message": "Success",
  "code": 200,
  "timestamp": "2026-05-27T12:00:00Z"
}
```

---

### 3.3 检查权限

**端点**: `POST /api/v1/users/me/permissions/check`

**描述**: 检查当前用户是否具有指定权限

**认证**: 需要

**请求体**:
```json
{
  "permission": "iam:users_create"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| permission | string | 是 | 权限名称 |

**请求示例**:

```bash
curl -X POST http://localhost:8000/api/v1/users/me/permissions/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{"permission": "rs:project:create"}'
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "allowed": true,
    "permission": "iam:users_create",
    "user_id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "testuser"
  },
  "message": "权限验证通过",
  "code": 200,
  "timestamp": "2026-05-27T12:00:00Z"
}
```

---

## 4. 角色管理接口

### 4.1 获取角色列表

**端点**: `GET /api/v1/roles`

**描述**: 获取所有角色

**认证**: 需要（管理员）

**请求示例**:

```bash
curl -X GET http://localhost:8000/api/v1/roles \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "role-001",
      "name": "admin",
      "description": "系统管理员",
      "created_at": "2026-05-20T10:00:00Z"
    },
    {
      "id": "role-002",
      "name": "user",
      "description": "普通用户",
      "created_at": "2026-05-20T10:00:00Z"
    }
  ],
  "error": null
}
```

---

### 4.2 获取角色详情

**端点**: `GET /api/v1/roles/{id}`

**描述**: 获取指定角色的详细信息

**认证**: 需要（管理员）

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 角色 ID |

**请求示例**:

```bash
curl -X GET http://localhost:8000/api/v1/roles/role-001 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "role-001",
    "name": "admin",
    "description": "系统管理员",
    "created_at": "2026-05-20T10:00:00Z"
  },
  "error": null
}
```

---

### 4.3 创建角色

**端点**: `POST /api/v1/roles`

**描述**: 创建新角色

**认证**: 需要（管理员）

**请求体**:
```json
{
  "name": "manager",
  "description": "部门经理"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| name | string | 是 | 角色名称 |
| description | string | 否 | 角色描述 |

**请求示例**:

```bash
curl -X POST http://localhost:8000/api/v1/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "manager",
    "description": "部门经理"
  }'
```

**成功响应** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "role-003",
    "name": "manager",
    "description": "部门经理",
    "created_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

### 4.4 删除角色

**端点**: `DELETE /api/v1/roles/{id}`

**描述**: 删除指定角色

**认证**: 需要（管理员）

**请求示例**:

```bash
curl -X DELETE http://localhost:8000/api/v1/roles/role-003 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": "角色删除成功",
  "error": null
}
```

---

### 4.5 获取角色权限

**端点**: `GET /api/v1/roles/{roleId}/permissions`

**描述**: 获取指定角色的所有权限

**认证**: 需要（管理员）

**请求示例**:

```bash
curl -X GET http://localhost:8000/api/v1/roles/role-001/permissions \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "iam:users_read",
      "name": "读取用户",
      "category": "用户管理",
      "description": "查看用户列表和详情"
    }
  ],
  "error": null
}
```

---

### 4.6 添加角色权限

**端点**: `POST /api/v1/roles/{roleId}/permissions/{permissionId}`

**描述**: 为角色添加权限

**认证**: 需要（管理员）

**请求示例**:

```bash
curl -X POST http://localhost:8000/api/v1/roles/role-001/permissions/perm-002 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": "权限添加成功",
  "error": null
}
```

---

### 4.7 移除角色权限

**端点**: `DELETE /api/v1/roles/{roleId}/permissions/{permissionId}`

**描述**: 从角色移除权限

**认证**: 需要（管理员）

**请求示例**:

```bash
curl -X DELETE http://localhost:8000/api/v1/roles/role-001/permissions/perm-002 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": "权限移除成功",
  "error": null
}
```

---

## 5. 权限管理接口

### 5.1 获取权限列表

**端点**: `GET /api/v1/permissions`

**描述**: 获取所有权限

**认证**: 需要（管理员）

**请求示例**:

```bash
curl -X GET http://localhost:8000/api/v1/permissions \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "iam:users_read",
      "name": "读取用户",
      "category": "用户管理",
      "description": "查看用户列表和详情"
    },
    {
      "id": "iam:users_create",
      "name": "创建用户",
      "category": "用户管理",
      "description": "创建新用户"
    }
  ],
  "error": null
}
```

---

## 6. 用户角色管理接口

### 6.1 获取用户权限

**端点**: `GET /api/v1/users/{userId}/permissions`

**描述**: 获取指定用户的完整权限信息

**认证**: 需要（管理员）

**请求示例**:

```bash
curl -X GET http://localhost:8000/api/v1/users/user-001/permissions \
  -H "Authorization: Bearer {token}"
```

---

### 6.2 获取用户角色

**端点**: `GET /api/v1/users/{userId}/roles`

**描述**: 获取指定用户的角色列表

**认证**: 需要（管理员）

**请求示例**:

```bash
curl -X GET http://localhost:8000/api/v1/users/user-001/roles \
  -H "Authorization: Bearer {token}"
```

---

### 6.3 添加用户角色

**端点**: `POST /api/v1/users/{userId}/roles/{roleId}`

**描述**: 为用户添加角色

**认证**: 需要（管理员）

**请求示例**:

```bash
curl -X POST http://localhost:8000/api/v1/users/user-001/roles/role-002 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": "角色添加成功",
  "error": null
}
```

---

### 6.4 移除用户角色

**端点**: `DELETE /api/v1/users/{userId}/roles/{roleId}`

**描述**: 从用户移除角色

**认证**: 需要（管理员）

**请求示例**:

```bash
curl -X DELETE http://localhost:8000/api/v1/users/user-001/roles/role-002 \
  -H "Authorization: Bearer {token}"
```

---

## 7. 访问日志接口

### 7.1 获取访问日志列表

**端点**: `GET /api/v1/access-logs`

**描述**: 获取系统访问日志

**认证**: 需要（管理员）

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| limit | integer | 否 | 返回记录数（默认100） |
| offset | integer | 否 | 偏移量（默认0） |

**请求示例**:

```bash
curl -X GET "http://localhost:8000/api/v1/access-logs?limit=20&offset=0" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "log-001",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "testuser",
      "action": "login",
      "resource": "auth",
      "ip_address": "192.168.1.100",
      "user_agent": "Mozilla/5.0...",
      "success": true,
      "created_at": "2026-05-22T10:00:00Z"
    }
  ],
  "error": null
}
```

---

### 7.2 获取用户访问日志

**端点**: `GET /api/v1/access-logs/user/{userId}`

**描述**: 获取指定用户的访问日志

**认证**: 需要（管理员）

**请求示例**:

```bash
curl -X GET "http://localhost:8000/api/v1/access-logs/user/user-001?limit=20" \
  -H "Authorization: Bearer {token}"
```

---

### 7.3 创建访问日志

**端点**: `POST /api/v1/access-logs`

**描述**: 记录访问日志（通常由系统自动调用）

**认证**: 需要

**请求体**:
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "testuser",
  "action": "create",
  "resource": "project",
  "resource_id": "proj-001",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "success": true,
  "error_message": null
}
```

---

## 8. 错误代码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| INVALID_REQUEST | 400 | 无效的请求参数 |
| VALIDATION_ERROR | 400 | 数据验证失败 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| USER_NOT_FOUND | 404 | 用户不存在 |
| ROLE_NOT_FOUND | 404 | 角色不存在 |
| PERMISSION_NOT_FOUND | 404 | 权限不存在 |
| USER_ALREADY_EXISTS | 409 | 用户已存在 |
| ROLE_ALREADY_EXISTS | 409 | 角色已存在 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 9. 权限命名规范

TOPEMS 采用 `模块:资源_操作` 格式的权限命名规范：

### 9.1 IAM 模块权限

| 权限代码 | 说明 | 类别 |
|----------|------|------|
| iam:users_read | 读取用户 | 用户管理 |
| iam:users_create | 创建用户 | 用户管理 |
| iam:users_update | 更新用户 | 用户管理 |
| iam:users_delete | 删除用户 | 用户管理 |
| iam:roles_read | 读取角色 | 角色管理 |
| iam:roles_create | 创建角色 | 角色管理 |
| iam:roles_update | 更新角色 | 角色管理 |
| iam:roles_delete | 删除角色 | 角色管理 |
| iam:permissions_read | 读取权限 | 权限管理 |
| iam:permissions_update | 更新权限 | 权限管理 |
| iam:audit_read | 读取审计日志 | 系统管理 |
| iam:system_read | 系统设置读取 | 系统管理 |
| iam:system_update | 系统设置更新 | 系统管理 |
| iam:dictionaries_read | 字典读取 | 系统管理 |
| iam:dictionaries_update | 字典更新 | 系统管理 |
| iam:plugins_read | 插件读取 | 系统管理 |
| iam:plugins_update | 插件更新 | 系统管理 |

### 9.2 其他模块权限

| 权限代码 | 说明 | 类别 |
|----------|------|------|
| pm:projects_read | 读取项目 | 项目管理 |
| pm:projects_create | 创建项目 | 项目管理 |
| pm:projects_update | 更新项目 | 项目管理 |
| pm:projects_delete | 删除项目 | 项目管理 |
| doc:documents_read | 读取文档 | 文档管理 |
| doc:documents_create | 创建文档 | 文档管理 |
| doc:documents_update | 更新文档 | 文档管理 |
| doc:documents_delete | 删除文档 | 文档管理 |
| workflow:workflows_read | 读取工作流 | 工作流管理 |
| workflow:workflows_create | 创建工作流 | 工作流管理 |
| workflow:workflows_update | 更新工作流 | 工作流管理 |
| workflow:workflows_delete | 删除工作流 | 工作流管理 |

### 9.3 超级管理员

超级用户 (`is_superuser: true`) 拥有特殊权限 `*`，可以访问所有功能。

---

**版本历史**

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v3.0.0 | 2026-06-17 | 统一权限命名规范为 `模块:资源_操作` 格式 |
| v2.1.0 | 2026-05-22 | 完善权限管理接口 |
| v1.0.0 | 2026-05-20 | 初始版本 |
