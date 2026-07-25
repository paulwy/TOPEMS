# API 设计规范

本文档定义 TOPEMS REST API 的设计规范和最佳实践。

## 目录

- [基础规范](#基础规范)
- [URL 设计](#url-设计)
- [请求规范](#请求规范)
- [响应规范](#响应规范)
- [认证授权](#认证授权)
- [错误处理](#错误处理)
- [分页规范](#分页规范)
- [版本控制](#版本控制)

---

## 基础规范

### 1. 通信协议

- 使用 HTTPS 进行通信
- 使用 JSON 格式传输数据
- 字符编码：UTF-8

### 2. API 基础路径

```
https://api.topems.com/api/v1/{module}/{resource}
```

| 环境 | 基础 URL |
|------|----------|
| 开发环境 | `http://localhost:8000/api/v1` |
| 测试环境 | `https://test-api.topems.com/api/v1` |
| 生产环境 | `https://api.topems.com/api/v1` |

---

## URL 设计

### 1. 路由规范

| 操作 | HTTP 方法 | URL 模式 | 示例 |
|------|-----------|----------|------|
| 列表 | GET | `/resources` | `GET /users` |
| 详情 | GET | `/resources/{id}` | `GET /users/123` |
| 创建 | POST | `/resources` | `POST /users` |
| 更新 | PUT | `/resources/{id}` | `PUT /users/123` |
| 删除 | DELETE | `/resources/{id}` | `DELETE /users/123` |
| 批量删除 | POST | `/resources/batch-delete` | `POST /users/batch-delete` |

### 2. 模块路由前缀

| 模块 | 路由前缀 | 说明 |
|------|----------|------|
| 认证 | `/api/v1/auth` | 登录、登出、Token 刷新 |
| 用户 | `/api/v1/users` | 用户管理 |
| 角色 | `/api/v1/roles` | 角色管理 |
| 权限 | `/api/v1/permissions` | 权限管理 |
| HRM | `/api/hrm/*` | 人力资源管理 |
| CRM | `/api/crm/*` | 客户关系管理 |
| PM | `/api/pm/*` | 项目管理 |
| AI | `/api/ai/*` | AI 服务 |

### 3. URL 命名规范

- 使用小写字母
- 使用复数名词表示资源集合
- 使用 kebab-case（短横线分隔）
- 不使用动词，使用 HTTP 方法表示动作

```bash
# 正确
GET /api/v1/user-roles
GET /api/v1/employees
POST /api/v1/departments

# 错误
GET /api/v1/getUsers
GET /api/v1/UserList
POST /api/v1/createDepartment
```

### 4. 嵌套资源

```bash
# 员工属于部门
GET /api/hrm/departments/{dept_id}/employees

# 角色拥有的权限
GET /api/v1/roles/{role_id}/permissions

# 项目的任务列表
GET /api/pm/projects/{project_id}/tasks
```

---

## 请求规范

### 1. 请求头

| 请求头 | 必填 | 说明 |
|--------|------|------|
| Content-Type | 是 | `application/json` |
| Authorization | 是 | `Bearer {token}` |
| Accept | 否 | `application/json` |
| X-Request-ID | 否 | 请求追踪 ID |

### 2. 请求体格式

```json
{
  "username": "admin",
  "email": "admin@topems.com",
  "full_name": "管理员",
  "password": "password123"
}
```

### 3. 查询参数

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| page | int | 页码 | `page=1` |
| page_size | int | 每页数量 | `page_size=20` |
| sort | string | 排序字段 | `sort=created_at` |
| order | string | 排序方向 | `order=desc` |
| search | string | 搜索关键词 | `search=张三` |
| filter | string | 过滤条件 | `filter=status:active` |

```bash
# 示例
GET /api/v1/users?page=1&page_size=20&sort=created_at&order=desc&search=admin
```

---

## 响应规范

### 1. 统一响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": { },
  "timestamp": 1717056000
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | int | 状态码 |
| message | string | 状态消息 |
| data | object | 响应数据 |
| timestamp | int | 时间戳（Unix） |

### 2. 成功响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "admin",
    "email": "admin@topems.com"
  },
  "timestamp": 1717056000
}
```

### 3. 创建成功响应 (201)

```json
{
  "code": 201,
  "message": "创建成功",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  },
  "timestamp": 1717056000
}
```

### 4. 删除成功响应 (200)

```json
{
  "code": 200,
  "message": "删除成功",
  "data": null,
  "timestamp": 1717056000
}
```

---

## 认证授权

### 1. JWT Token

#### 获取 Token

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

#### 响应

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_at": "2026-06-24T10:00:00Z",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "admin",
      "email": "admin@topems.com",
      "full_name": "管理员",
      "is_superuser": true
    }
  },
  "timestamp": 1717056000
}
```

### 2. 使用 Token

```bash
GET /api/v1/users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. 刷新 Token

```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 错误处理

### 1. 错误码定义

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| 200 | 200 | 请求成功 |
| 201 | 201 | 创建成功 |
| 400 | 400 | 请求参数错误 |
| 401 | 401 | 未认证 |
| 403 | 403 | 无权限 |
| 404 | 404 | 资源不存在 |
| 409 | 409 | 资源冲突 |
| 500 | 500 | 服务器内部错误 |

### 2. 业务错误码

| 错误码 | 说明 |
|--------|------|
| 1001 | 用户不存在 |
| 1002 | 密码错误 |
| 1003 | 用户已锁定 |
| 1004 | Token 已过期 |
| 2001 | 公司不存在 |
| 2002 | 部门不存在 |
| 3001 | 项目不存在 |
| 3002 | 项目已结项 |

### 3. 错误响应格式

```json
{
  "code": 400,
  "message": "请求参数错误",
  "data": {
    "field": "email",
    "reason": "邮箱格式不正确"
  },
  "timestamp": 1717056000
}
```

### 4. 错误响应示例

```json
{
  "code": 401,
  "message": "未认证",
  "data": null,
  "timestamp": 1717056000
}
```

```json
{
  "code": 403,
  "message": "无权限访问该资源",
  "data": null,
  "timestamp": 1717056000
}
```

```json
{
  "code": 404,
  "message": "用户不存在",
  "data": null,
  "timestamp": 1717056000
}
```

---

## 分页规范

### 1. 分页响应格式

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [],
    "page": 1,
    "page_size": 20,
    "total": 100,
    "total_pages": 5
  },
  "timestamp": 1717056000
}
```

### 2. 分页参数

| 参数 | 类型 | 默认值 | 最大值 | 说明 |
|------|------|--------|--------|------|
| page | int | 1 | - | 页码 |
| page_size | int | 20 | 100 | 每页数量 |

### 3. Cursor 分页（可选）

对于大数据量场景，支持 Cursor 分页：

```bash
GET /api/v1/employees?cursor=eyJpZCI6MTIzfQ&page_size=50
```

---

## 版本控制

### 1. URL 版本控制

```
/api/v1/{resource}
/api/v2/{resource}
```

### 2. 版本兼容性

- 主版本号变更表示不兼容的 API 变更
- 次版本号变更表示向后兼容的功能新增
- 修订号变更表示向后兼容的问题修复

### 3. API 文档

每个服务需要提供 OpenAPI 文档：

```bash
# 访问 API 文档
http://localhost:8000/api/v1/docs
http://localhost:8000/api/v1/swagger-ui
```

---

**文档版本**: v1.0
**最后更新**: 2026-06-24
