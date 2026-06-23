# TOPEMS API 文档

## 概述

TOPEMS 系统 API 文档，包含所有服务的 RESTful API 接口定义。系统采用统一的 API 规范，支持 JWT 认证、RESTful 风格、标准响应格式。

## API 版本

**当前版本**: v3.0  
**更新时间**: 2026-06-23  
**服务总数**: 21

## 基础规范

### 基础 URL

通过 Nginx 反向代理访问：
```
http://localhost/api/{service}/...
```

或直接访问服务：
```
http://localhost:8000/api/iam/...  # 核心服务
http://localhost:8010/api/erp/...   # ERP 服务
http://localhost:8064/api/ai/...    # AI 服务
```

### 认证方式

所有需要认证的 API 请求必须携带 JWT Token：

```http
Authorization: Bearer {token}
```

### 响应格式

**成功响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {},
  "timestamp": 1717056000
}
```

**列表响应**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [],
    "total": 100,
    "page": 1,
    "page_size": 20
  },
  "timestamp": 1717056000
}
```

**错误响应**:
```json
{
  "code": 401,
  "message": "Unauthorized",
  "data": null,
  "timestamp": 1717056000
}
```

### HTTP 状态码

| 状态码 | 描述 |
|-------|------|
| 200 | 请求成功 |
| 201 | 资源创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证（Token 无效或过期） |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 分页规范

```http
GET /api/{module}/resources?page=1&page_size=20
```

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| page | int | 1 | 页码 |
| page_size | int | 20 | 每页大小（最大 100） |

### 过滤与排序

```http
GET /api/hrm/employees?department=研发部&status=active&sort=created_at&order=desc
```

### 健康检查

所有服务提供健康检查端点：

```http
GET /health
GET /health/details
```

响应：
```json
{
  "status": "healthy",
  "service": "topems-iam",
  "version": "1.0.0",
  "timestamp": 1717056000
}
```

## 服务端口映射

| 服务 | 端口 | API 前缀 | 说明 | 状态 |
|------|------|----------|------|------|
| **核心服务 (统一承载)** |
| unified-core | 8000 | /api/iam/, /api/doc/, /api/flow/, /api/file/, /api/mail/, /api/comm/, /api/notification/ | 核心平台 | ✅ |
| **经营管理 (8010-8019)** |
| erp | 8010 | /api/erp/ | 企业资源计划 | ✅ |
| **协同办公 (8020-8029)** |
| hrm | 8020 | /api/hrm/ | 人力资源管理 | ✅ |
| pm | 8023 | /api/pm/ | 项目管理 | ✅ |
| crm | 8029 | /api/crm/ | 客户关系管理 | ✅ |
| **生产制造 (8030-8039)** |
| mes | 8030 | /api/mes/ | 生产执行系统 | ✅ |
| pdm | 8031 | /api/pdm/ | 产品数据管理 | ✅ |
| **供应链 (8040-8049)** |
| scm | 8040 | /api/scm/ | 供应链管理 | ✅ |
| wms | 8041 | /api/wms/ | 仓储管理 | ✅ |
| srm | 8042 | /api/srm/ | 供应商管理 | ✅ |
| **质量/研发 (8050-8059)** |
| qms | 8050 | /api/qms/ | 质量管理 | ✅ |
| lims | 8051 | /api/lims/ | 实验室信息管理 | ✅ |
| ehs | 8052 | /api/ehs/ | 环境健康安全 | ✅ |
| rs | 8053 | /api/rs/ | 研发管理 | ✅ |
| **数据分析 (8060-8069)** |
| bi | 8060 | /api/bi/ | 商业智能 | ✅ |
| report | 8061 | /api/report/ | 报表服务 | ✅ |
| monitor | 8062 | /api/monitor/ | 系统监控 | ✅ |
| portal | 8063 | /api/portal/ | 企业门户 | ✅ |
| ai | 8064 | /api/ai/ | AI 智能服务 | ✅ |
| **基础设施 (8070-8079)** |
| mobile | 8070 | /api/mobile/ | 移动服务 | ✅ |
| gis | 8071 | /api/gis/ | 地理信息服务 | ✅ |
| integration | 8072 | /api/integration/ | 集成服务 | ✅ |

## 核心服务 API

### IAM 认证服务 (/api/iam/)

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|------|----------|
| POST | /api/iam/auth/login | 用户登录 | ❌ |
| POST | /api/iam/auth/logout | 用户登出 | ✅ |
| POST | /api/iam/auth/refresh | 刷新 Token | ✅ |
| GET | /api/iam/users/me | 获取当前用户 | ✅ |
| GET | /api/iam/users | 获取用户列表 | ✅ |
| POST | /api/iam/users | 创建用户 | ✅ |
| GET | /api/iam/users/{id} | 获取用户详情 | ✅ |
| PUT | /api/iam/users/{id} | 更新用户 | ✅ |
| DELETE | /api/iam/users/{id} | 删除用户 | ✅ |
| GET | /api/iam/roles | 获取角色列表 | ✅ |
| POST | /api/iam/roles | 创建角色 | ✅ |
| GET | /api/iam/permissions | 获取权限列表 | ✅ |

### 工作流服务 (/api/flow/)

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|------|----------|
| GET | /api/flow/processes | 获取流程列表 | ✅ |
| POST | /api/flow/processes | 创建流程定义 | ✅ |
| GET | /api/flow/processes/{id} | 获取流程详情 | ✅ |
| POST | /api/flow/instances | 创建流程实例 | ✅ |
| GET | /api/flow/instances | 获取实例列表 | ✅ |
| POST | /api/flow/tasks/{id}/complete | 完成任务 | ✅ |

### 通知服务 (/api/notification/)

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|------|----------|
| GET | /api/notification/messages | 获取消息列表 | ✅ |
| POST | /api/notification/messages | 发送消息 | ✅ |
| PUT | /api/notification/messages/{id}/read | 标记已读 | ✅ |
| DELETE | /api/notification/messages/{id} | 删除消息 | ✅ |

## 业务服务 API

### HRM 人力资源 (/api/hrm/)

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|------|----------|
| GET | /api/hrm/employees | 获取员工列表 | ✅ |
| POST | /api/hrm/employees | 创建员工 | ✅ |
| GET | /api/hrm/employees/{id} | 获取员工详情 | ✅ |
| PUT | /api/hrm/employees/{id} | 更新员工 | ✅ |
| GET | /api/hrm/departments | 获取部门列表 | ✅ |
| GET | /api/hrm/attendance | 获取考勤记录 | ✅ |

### QMS 质量管理 (/api/qms/)

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|------|----------|
| GET | /api/qms/standards | 获取质量标准 | ✅ |
| POST | /api/qms/inspections | 创建检验记录 | ✅ |
| GET | /api/qms/inspections | 获取检验列表 | ✅ |
| GET | /api/qms/nonconformances | 获取不合格项 | ✅ |

### AI 智能服务 (/api/ai/)

| 方法 | 路径 | 说明 | 需要认证 |
|------|------|----------|
| POST | /api/ai/chat | 智能对话 | ✅ |
| POST | /api/ai/embedding | 文本向量化 | ✅ |
| POST | /api/ai/summary | 文本摘要 | ✅ |
| GET | /api/ai/models | 获取可用模型 | ✅ |
| POST | /api/ai/recommend | 智能推荐 | ✅ |

## API 文档索引

### 核心服务

| 服务 | 文档 | 说明 |
|------|------|------|
| IAM 认证 | [API_AUTH.md](./API_AUTH.md) | 用户认证、权限管理 |
| 工作流 | [API_WORKFLOW.md](./API_WORKFLOW.md) | 流程引擎 |
| 通知服务 | [API_NOTIFICATION.md](./API_NOTIFICATION.md) | 消息通知 |

### 业务服务

| 服务 | 文档 | 说明 |
|------|------|------|
| 人力资源 | [API_HRM.md](./API_HRM.md) | 员工、部门、考勤 |
| 质量管理 | [API_QMS.md](./API_QMS.md) | 质量标准、检验 |
| 实验室 | [API_LIMS.md](./API_LIMS.md) | 样品、仪器、试剂 |
| 环境健康 | [API_EHS.md](./API_EHS.md) | 安全、环保 |
| 研发管理 | [API_RS.md](./API_RS.md) | 项目、配方、专利 |
| 供应商 | [API_SRM.md](./API_SRM.md) | 供应商、采购 |
| 产品数据 | [API_PDM.md](./API_PDM.md) | 产品、BOM |
| 报表服务 | [API_REPORT.md](./API_REPORT.md) | 报表生成导出 |

### 技术规范

| 文档 | 说明 |
|------|------|
| [API_VERSION_AND_SCHEMA_GUIDE.md](./API_VERSION_AND_SCHEMA_GUIDE.md) | 版本与 Schema 规范 |
| [openapi.yaml](./openapi.yaml) | OpenAPI 3.0 规范文件 |
| [plugins-api.md](./plugins-api.md) | 插件 API |

## 快速开始

### 1. 登录获取 Token

```bash
curl -X POST http://localhost:8000/api/iam/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

响应：
```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "admin",
      "name": "管理员",
      "email": "admin@topems.com"
    }
  }
}
```

### 2. 使用 Token 调用 API

```bash
# 获取当前用户信息
curl -X GET http://localhost:8000/api/iam/users/me \
  -H "Authorization: Bearer {token}"

# 获取员工列表
curl -X GET http://localhost:8020/api/hrm/employees \
  -H "Authorization: Bearer {token}"

# 智能对话
curl -X POST http://localhost:8064/api/ai/chat \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"message":"帮我分析本月销售数据"}'
```

### 3. 健康检查

```bash
# 检查所有服务
curl http://localhost:8000/health
curl http://localhost:8010/health
curl http://localhost:8020/health
curl http://localhost:8064/health
```

## 开发工具

### curl 示例

```bash
# 设置变量
TOKEN=$(curl -s -X POST http://localhost:8000/api/iam/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

# 使用变量
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/iam/users/me
```

### JavaScript 示例

```javascript
async function login(username, password) {
  const response = await fetch('http://localhost:8000/api/iam/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return response.json();
}

async function getEmployees(token) {
  const response = await fetch('http://localhost:8020/api/hrm/employees', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}
```

## 相关文档

- [系统架构](../architecture/overview.md) - 了解系统架构
- [数据库设计](../architecture/database.md) - 数据库 Schema 设计
- [部署指南](../deployment-guide.md) - 系统部署说明
- [端口分配规则](../port-allocation-rules.md) - 端口配置说明
