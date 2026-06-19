# TOPEMS API 文档

## 概述

TOPEMS 是一个企业级管理系统，包含多个微服务，提供统一的 RESTful API 接口。

## 基础信息

### 协议
- 所有接口均使用 **HTTP/HTTPS** 协议
- 数据格式：**JSON**
- 字符编码：**UTF-8**

### 认证方式
- 使用 **JWT Token** 进行认证
- Token 需放置在请求头：`Authorization: Bearer <token>`

### 响应格式

```json
{
  "code": 200,
  "success": true,
  "data": {},
  "message": "success",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| code | number | 状态码 |
| success | boolean | 是否成功 |
| data | any | 返回数据 |
| message | string | 提示信息 |
| timestamp | string | 时间戳 |

### 错误码

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 服务目录

| 服务 | 基础路径 | 说明 |
|------|----------|------|
| IAM | `/api/v1/iam/` | 身份认证与权限管理 |
| DOC | `/api/v1/doc/` | 文档管理 |
| FLOW | `/api/v1/flow/` | 工作流引擎 |
| RS | `/api/v1/rs/` | 研发管理 |
| LIMS | `/api/v1/lims/` | 实验室信息管理 |
| QMS | `/api/v1/qms/` | 质量管理 |
| EHS | `/api/v1/ehs/` | 环境健康安全 |
| SRM | `/api/v1/srm/` | 供应商管理 |
| PDM | `/api/v1/pdm/` | 产品数据管理 |
| BI | `/api/v1/bi/` | 商业智能 |
| IM | `/api/v1/im/` | 即时通讯 |
| AI | `/api/v1/ai/` | AI数据连接器 |
| Portal | `/api/v1/portal/` | 门户 |

---

## IAM 服务 API

### 用户认证

#### 登录
```
POST /api/v1/iam/auth/login
```

**请求体：**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**响应：**
```json
{
  "code": 200,
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "用户名",
      "roles": ["admin"]
    }
  },
  "message": "登录成功"
}
```

#### 登出
```
POST /api/v1/iam/auth/logout
```

**请求头：**
```
Authorization: Bearer <token>
```

#### 刷新Token
```
POST /api/v1/iam/auth/refresh
```

**请求体：**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 用户管理

#### 获取用户列表
```
GET /api/v1/iam/users?page=1&page_size=10
```

**请求头：**
```
Authorization: Bearer <token>
```

**响应：**
```json
{
  "code": 200,
  "success": true,
  "data": {
    "users": [...],
    "total": 100,
    "page": 1,
    "page_size": 10
  }
}
```

#### 获取用户详情
```
GET /api/v1/iam/users/{id}
```

#### 创建用户
```
POST /api/v1/iam/users
```

**请求体：**
```json
{
  "email": "user@example.com",
  "name": "用户名",
  "password": "password",
  "roles": ["user"]
}
```

#### 更新用户
```
PUT /api/v1/iam/users/{id}
```

#### 删除用户
```
DELETE /api/v1/iam/users/{id}
```

### 角色管理

#### 获取角色列表
```
GET /api/v1/iam/roles
```

#### 创建角色
```
POST /api/v1/iam/roles
```

**请求体：**
```json
{
  "name": "admin",
  "description": "管理员",
  "permissions": ["user:read", "user:write"]
}
```

### 权限管理

#### 获取权限列表
```
GET /api/v1/iam/permissions
```

#### 检查权限
```
GET /api/v1/iam/permissions/check?permission=user:read
```

### 审计日志

#### 获取审计日志
```
GET /api/v1/iam/audit-logs?page=1&page_size=10
```

---

## DOC 服务 API

### 文件管理

#### 上传文件
```
POST /api/v1/doc/files/upload
Content-Type: multipart/form-data
```

**参数：**
| 参数 | 类型 | 说明 |
|------|------|------|
| file | file | 文件 |
| parent_id | string | 父目录ID |

#### 获取文件列表
```
GET /api/v1/doc/files?parent_id=&page=1&page_size=20
```

#### 获取文件详情
```
GET /api/v1/doc/files/{id}
```

#### 更新文件
```
PUT /api/v1/doc/files/{id}
```

**请求体：**
```json
{
  "name": "新文件名",
  "description": "文件描述"
}
```

#### 删除文件
```
DELETE /api/v1/doc/files/{id}
```

#### 下载文件
```
GET /api/v1/doc/files/{id}/download
```

### 目录管理

#### 创建目录
```
POST /api/v1/doc/folders
```

**请求体：**
```json
{
  "name": "目录名称",
  "parent_id": "父目录ID"
}
```

#### 获取目录树
```
GET /api/v1/doc/folders/tree
```

### 版本管理

#### 获取文件版本列表
```
GET /api/v1/doc/files/{id}/versions
```

#### 恢复到指定版本
```
POST /api/v1/doc/files/{id}/versions/{version_id}/restore
```

---

## FLOW 服务 API

### 工作流管理

#### 获取工作流列表
```
GET /api/v1/flow/workflows?page=1&page_size=10
```

#### 创建工作流
```
POST /api/v1/flow/workflows
```

**请求体：**
```json
{
  "name": "审批流程",
  "description": "审批流程描述",
  "definition": {...}
}
```

#### 获取工作流详情
```
GET /api/v1/flow/workflows/{id}
```

#### 更新工作流
```
PUT /api/v1/flow/workflows/{id}
```

#### 删除工作流
```
DELETE /api/v1/flow/workflows/{id}
```

### 流程实例

#### 启动流程
```
POST /api/v1/flow/instances
```

**请求体：**
```json
{
  "workflow_id": "工作流ID",
  "initiator_id": "发起者ID",
  "data": {...}
}
```

#### 获取实例列表
```
GET /api/v1/flow/instances?page=1&page_size=10
```

#### 获取实例详情
```
GET /api/v1/flow/instances/{id}
```

### 审批任务

#### 获取待办任务
```
GET /api/v1/flow/approvals?user_id=&status=pending
```

#### 处理审批
```
POST /api/v1/flow/approvals/{id}/process
```

**请求体：**
```json
{
  "action": "approve",
  "comment": "审批意见"
}
```

---

## RS 服务 API

### 项目管理

#### 获取项目列表
```
GET /api/v1/rs/projects?page=1&page_size=10&status=active
```

#### 创建项目
```
POST /api/v1/rs/projects
```

**请求体：**
```json
{
  "name": "项目名称",
  "code": "PRJ-001",
  "project_type": "research",
  "description": "项目描述",
  "leader": "负责人ID",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}
```

#### 获取项目详情
```
GET /api/v1/rs/projects/{id}
```

#### 更新项目
```
PUT /api/v1/rs/projects/{id}
```

#### 删除项目
```
DELETE /api/v1/rs/projects/{id}
```

### 实验管理

#### 获取实验列表
```
GET /api/v1/rs/experiments?project_id=&page=1&page_size=10
```

#### 创建实验
```
POST /api/v1/rs/experiments
```

**请求体：**
```json
{
  "project_id": "项目ID",
  "name": "实验名称",
  "description": "实验描述",
  "status": "pending"
}
```

---

## LIMS 服务 API

### 样品管理

#### 获取样品列表
```
GET /api/v1/lims/samples?page=1&page_size=20
```

#### 创建样品
```
POST /api/v1/lims/samples
```

**请求体：**
```json
{
  "name": "样品名称",
  "description": "样品描述",
  "project_id": "项目ID",
  "status": "pending"
}
```

### 检验记录

#### 获取检验记录
```
GET /api/v1/lims/inspections?sample_id=&page=1&page_size=10
```

#### 创建检验记录
```
POST /api/v1/lims/inspections
```

**请求体：**
```json
{
  "sample_id": "样品ID",
  "instrument_id": "仪器ID",
  "process_id": "检验流程ID",
  "inspector_id": "检验员ID",
  "results": {...}
}
```

---

## IM 服务 API

### 消息管理

#### 发送消息
```
POST /api/v1/im/messages
```

**请求体：**
```json
{
  "from_user_id": "发送者ID",
  "to_user_id": "接收者ID",
  "content": "消息内容",
  "message_type": "text"
}
```

#### 获取消息列表
```
GET /api/v1/im/messages?user_id=&other_user_id=&page=1&page_size=20
```

### 群组管理

#### 创建群组
```
POST /api/v1/im/groups
```

**请求体：**
```json
{
  "name": "群组名称",
  "description": "群组描述",
  "members": ["user1", "user2"]
}
```

#### 获取群组列表
```
GET /api/v1/im/groups?user_id=
```

#### 发送群消息
```
POST /api/v1/im/groups/{id}/messages
```

---

## AI 服务 API

### 数据连接器

#### 获取连接器列表
```
GET /api/v1/ai/connectors
```

#### 创建连接器
```
POST /api/v1/ai/connectors
```

**请求体：**
```json
{
  "name": "数据库连接器",
  "type": "database",
  "config": {
    "host": "localhost",
    "port": 5432,
    "database": "dbname",
    "username": "user",
    "password": "pass"
  }
}
```

#### 测试连接
```
GET /api/v1/ai/connectors/{id}/test
```

#### 执行查询
```
POST /api/v1/ai/connectors/{id}/query
```

**请求体：**
```json
{
  "query": "SELECT * FROM table",
  "params": []
}
```

---

## Portal 服务 API

### 待办管理

#### 获取待办列表
```
GET /api/v1/portal/todos?user_id=&status=pending
```

#### 创建待办
```
POST /api/v1/portal/todos
```

**请求体：**
```json
{
  "title": "待办标题",
  "service": "rs",
  "priority": "high",
  "due_date": "2024-01-15"
}
```

#### 完成待办
```
PUT /api/v1/portal/todos/{id}/complete
```

---

## 监控 API

### 健康检查

#### 获取服务健康状态
```
GET /api/v1/monitoring/services
```

#### 获取系统指标
```
GET /api/v1/monitoring/metrics
```

#### 获取告警列表
```
GET /api/v1/monitoring/alerts
```

---

## 备份 API

### 备份管理

#### 创建备份
```
POST /api/v1/backup/create
```

**请求体：**
```json
{
  "backup_type": "full",
  "description": "完整备份"
}
```

#### 获取备份列表
```
GET /api/v1/backup/list
```

#### 恢复备份
```
POST /api/v1/backup/{id}/restore
```

---

## 附录

### 日期格式
所有日期字段均使用 ISO 8601 格式：`YYYY-MM-DDTHH:MM:SSZ`

### 分页参数
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | number | 1 | 页码 |
| page_size | number | 20 | 每页数量 |

### 排序参数
| 参数 | 类型 | 说明 |
|------|------|------|
| sort_by | string | 排序字段 |
| sort_order | string | asc/desc |

---

## 示例请求

### cURL 示例

```bash
# 登录
curl -X POST http://localhost:8000/api/v1/iam/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'

# 获取项目列表
curl -X GET http://localhost:8000/api/v1/rs/projects \
  -H "Authorization: Bearer <token>"

# 创建项目
curl -X POST http://localhost:8000/api/v1/rs/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新项目",
    "code": "PRJ-001",
    "project_type": "research"
  }'
```

### JavaScript 示例

```javascript
// 登录
const loginResponse = await fetch('/api/v1/iam/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@example.com', password: 'password' })
});
const { data } = await loginResponse.json();

// 获取项目列表
const projectsResponse = await fetch('/api/v1/rs/projects', {
  headers: { 'Authorization': `Bearer ${data.access_token}` }
});
const projects = await projectsResponse.json();
```

---

**文档版本**: v1.0  
**最后更新**: 2024-01-01  
**适用版本**: TOPEMS v1.0
