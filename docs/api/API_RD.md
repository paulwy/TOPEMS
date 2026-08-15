# TOPEMS 研发管理系统 API

**服务名**: topems-rd  
**代码目录**: `svc/rd/`  
**端口**: 8053  
**版本**: v2  

---

> **规范 API 路径**: `/api/rd/`（例如 `/api/rd/projects`）  
> **实际访问地址**: `http://localhost:8053/api/rd/`  
> **命名说明**: 本文档原名 `API_RS.md`，为与代码目录 `svc/rd/` 对齐已统一为 `API_RD.md`。API 端点示例仍使用 `/api/rd/` 规范前缀。

## 1. 概述

研发管理系统 API（**RD** - Research & Development）提供项目管理、试验记录管理等功能。

### 1.1 API 端点总览

| 功能 | 端点 | 方法 |
|------|------|------|
| 项目列表 | /api/rd/projects | GET |
| 项目详情 | /api/rd/projects/{id} | GET |
| 创建项目 | /api/rd/projects | POST |
| 更新项目 | /api/rd/projects/{id} | PUT |
| 删除项目 | /api/rd/projects/{id} | DELETE |
| 试验列表 | /api/rd/experiments | GET |
| 试验详情 | /api/rd/experiments/{id} | GET |
| 创建试验 | /api/rd/experiments | POST |
| 更新试验 | /api/rd/experiments/{id} | PUT |
| 删除试验 | /api/rd/experiments/{id} | DELETE |
| 项目试验列表 | /api/rd/experiments/project/{projectId} | GET |
| 健康检查 | /health | GET |

### 1.2 数据模型

#### Project（项目）

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "新型催化剂研发",
  "description": "研发高效、低成本的工业催化剂",
  "status": "active",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "created_at": "2026-05-20T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

#### ExperimentRecord（试验记录）

```json
{
  "id": "exp-001",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "催化剂A在不同温度下的活性测试",
  "description": "测试催化剂A在50°C、100°C、150°C条件下的催化活性",
  "experiment_type": "催化活性测试",
  "result": "催化剂A在100°C时展现出最佳催化活性，转化率达到95%",
  "status": "completed",
  "experiment_date": "2026-05-20",
  "experimenter": "张工程师",
  "conclusion": "确定100°C为最佳反应温度",
  "created_at": "2026-05-20T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

---

## 2. 项目管理接口

### 2.1 获取项目列表

**端点**: `GET /api/rd/projects`

**描述**: 获取所有研发项目列表

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码（默认1） |
| page_size | integer | 否 | 每页数量（默认20） |
| status | string | 否 | 项目状态（active, completed, paused） |

**请求示例**:

```bash
curl -X GET "http://localhost:8058/api/rd/projects?page=1&page_size=20&status=active" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "新型催化剂研发",
      "description": "研发高效、低成本的工业催化剂",
      "status": "active",
      "start_date": "2026-01-01",
      "end_date": "2026-12-31",
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    },
    {
      "id": "proj-002",
      "name": "高分子材料改性研究",
      "description": "提升现有高分子材料的热稳定性",
      "status": "active",
      "start_date": "2026-03-01",
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    }
  ],
  "error": null
}
```

---

### 2.2 获取项目详情

**端点**: `GET /api/rd/projects/{id}`

**描述**: 获取指定项目的详细信息

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 项目 ID |

**请求示例**:

```bash
curl -X GET http://localhost:8058/api/rd/projects/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "新型催化剂研发",
    "description": "研发高效、低成本的工业催化剂",
    "status": "active",
    "start_date": "2026-01-01",
    "end_date": "2026-12-31",
    "created_at": "2026-05-20T10:00:00Z",
    "updated_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

**失败响应** (404 Not Found):

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "项目不存在",
    "details": {
      "project_id": "invalid-id"
    }
  }
}
```

---

### 2.3 创建项目

**端点**: `POST /api/rd/projects`

**描述**: 创建新的研发项目

**认证**: 需要

**权限**: rs:project:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "name": "新型催化剂研发",
  "description": "研发高效、低成本的工业催化剂",
  "status": "active"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| name | string | 是 | 项目名称（1-100字符） |
| description | string | 否 | 项目描述 |
| status | string | 是 | 项目状态（active, paused, completed） |

**请求示例**:

```bash
curl -X POST http://localhost:8058/api/rd/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "新型催化剂研发",
    "description": "研发高效、低成本的工业催化剂",
    "status": "active"
  }'
```

**成功响应** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "新型催化剂研发",
    "description": "研发高效、低成本的工业催化剂",
    "status": "active",
    "start_date": "2026-05-22",
    "created_at": "2026-05-22T10:00:00Z",
    "updated_at": "2026-05-22T10:00:00Z"
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
    "message": "项目名称不能为空",
    "details": {
      "field": "name"
    }
  }
}
```

---

### 2.4 更新项目

**端点**: `PUT /api/rd/projects/{id}`

**描述**: 更新指定项目的信息

**认证**: 需要

**权限**: rs:project:write

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 项目 ID |

**请求体**:

```json
{
  "name": "新型催化剂研发（第二阶段）",
  "description": "研发高效、低成本的工业催化剂，并进行中试验证",
  "status": "active"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| name | string | 是 | 项目名称 |
| description | string | 是 | 项目描述 |
| status | string | 是 | 项目状态 |

**请求示例**:

```bash
curl -X PUT http://localhost:8058/api/rd/projects/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "新型催化剂研发（第二阶段）",
    "description": "研发高效、低成本的工业催化剂，并进行中试验证",
    "status": "active"
  }'
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "新型催化剂研发（第二阶段）",
    "description": "研发高效、低成本的工业催化剂，并进行中试验证",
    "status": "active",
    "start_date": "2026-01-01",
    "updated_at": "2026-05-22T11:00:00Z"
  },
  "error": null
}
```

---

### 2.5 删除项目

**端点**: `DELETE /api/rd/projects/{id}`

**描述**: 删除指定项目

**认证**: 需要

**权限**: rs:project:delete

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 项目 ID |

**请求示例**:

```bash
curl -X DELETE http://localhost:8058/api/rd/projects/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": true,
  "error": null
}
```

**失败响应** (404 Not Found):

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "项目不存在",
    "details": {}
  }
}
```

---

## 3. 试验记录接口

### 3.1 获取试验列表

**端点**: `GET /api/rd/experiments`

**描述**: 获取所有试验记录列表

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码（默认1） |
| page_size | integer | 否 | 每页数量（默认20） |
| status | string | 否 | 试验状态（planned, in_progress, completed） |
| experiment_type | string | 否 | 试验类型 |

**请求示例**:

```bash
curl -X GET "http://localhost:8058/api/rd/experiments?page=1&page_size=20&status=completed" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "exp-001",
      "project_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "催化剂A在不同温度下的活性测试",
      "description": "测试催化剂A在50°C、100°C、150°C条件下的催化活性",
      "experiment_type": "催化活性测试",
      "result": "催化剂A在100°C时展现出最佳催化活性，转化率达到95%",
      "status": "completed",
      "experiment_date": "2026-05-20",
      "experimenter": "张工程师",
      "conclusion": "确定100°C为最佳反应温度",
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    },
    {
      "id": "exp-002",
      "project_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "催化剂B的稳定性测试",
      "description": "评估催化剂B在连续运行100小时后的活性衰减情况",
      "experiment_type": "稳定性测试",
      "result": "待测试",
      "status": "planned",
      "experiment_date": "2026-05-25",
      "experimenter": "李工程师",
      "created_at": "2026-05-21T10:00:00Z",
      "updated_at": "2026-05-21T10:00:00Z"
    }
  ],
  "error": null
}
```

---

### 3.2 获取试验详情

**端点**: `GET /api/rd/experiments/{id}`

**描述**: 获取指定试验的详细信息

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 试验 ID |

**请求示例**:

```bash
curl -X GET http://localhost:8058/api/rd/experiments/exp-001 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "exp-001",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "催化剂A在不同温度下的活性测试",
    "description": "测试催化剂A在50°C、100°C、150°C条件下的催化活性",
    "experiment_type": "催化活性测试",
    "result": "催化剂A在100°C时展现出最佳催化活性，转化率达到95%",
    "status": "completed",
    "experiment_date": "2026-05-20",
    "experimenter": "张工程师",
    "conclusion": "确定100°C为最佳反应温度",
    "created_at": "2026-05-20T10:00:00Z",
    "updated_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

### 3.3 创建试验记录

**端点**: `POST /api/rd/experiments`

**描述**: 创建新的试验记录

**认证**: 需要

**权限**: rs:experiment:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "催化剂A在不同温度下的活性测试",
  "description": "测试催化剂A在50°C、100°C、150°C条件下的催化活性",
  "experiment_type": "催化活性测试",
  "result": "待测试",
  "status": "planned",
  "experimenter": "张工程师"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| project_id | string | 是 | 关联的项目 ID |
| title | string | 是 | 试验标题（1-200字符） |
| description | string | 否 | 试验描述 |
| experiment_type | string | 是 | 试验类型 |
| result | string | 否 | 试验结果 |
| status | string | 是 | 试验状态（planned, in_progress, completed） |
| experimenter | string | 是 | 试验人员 |

**请求示例**:

```bash
curl -X POST http://localhost:8058/api/rd/experiments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "催化剂A在不同温度下的活性测试",
    "description": "测试催化剂A在50°C、100°C、150°C条件下的催化活性",
    "experiment_type": "催化活性测试",
    "result": "待测试",
    "status": "planned",
    "experimenter": "张工程师"
  }'
```

**成功响应** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "exp-003",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "催化剂A在不同温度下的活性测试",
    "description": "测试催化剂A在50°C、100°C、150°C条件下的催化活性",
    "experiment_type": "催化活性测试",
    "result": "待测试",
    "status": "planned",
    "experiment_date": "2026-05-22",
    "experimenter": "张工程师",
    "created_at": "2026-05-22T10:00:00Z",
    "updated_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

### 3.4 更新试验记录

**端点**: `PUT /api/rd/experiments/{id}`

**描述**: 更新指定试验记录

**认证**: 需要

**权限**: rs:experiment:write

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 试验 ID |

**请求体**:

```json
{
  "title": "催化剂A在不同温度下的活性测试（更新）",
  "description": "测试催化剂A在50°C、100°C、150°C、200°C条件下的催化活性",
  "experiment_type": "催化活性测试",
  "result": "催化剂A在100°C时展现出最佳催化活性，转化率达到95%",
  "status": "completed",
  "experimenter": "张工程师",
  "conclusion": "确定100°C为最佳反应温度"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| title | string | 否 | 试验标题 |
| description | string | 否 | 试验描述 |
| experiment_type | string | 否 | 试验类型 |
| result | string | 否 | 试验结果 |
| status | string | 否 | 试验状态 |
| experimenter | string | 否 | 试验人员 |
| conclusion | string | 否 | 试验结论 |

**请求示例**:

```bash
curl -X PUT http://localhost:8058/api/rd/experiments/exp-003 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "title": "催化剂A在不同温度下的活性测试（更新）",
    "result": "催化剂A在100°C时展现出最佳催化活性，转化率达到95%",
    "status": "completed",
    "conclusion": "确定100°C为最佳反应温度"
  }'
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "exp-003",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "催化剂A在不同温度下的活性测试（更新）",
    "description": "测试催化剂A在50°C、100°C、150°C、200°C条件下的催化活性",
    "experiment_type": "催化活性测试",
    "result": "催化剂A在100°C时展现出最佳催化活性，转化率达到95%",
    "status": "completed",
    "experiment_date": "2026-05-22",
    "experimenter": "张工程师",
    "conclusion": "确定100°C为最佳反应温度",
    "created_at": "2026-05-22T10:00:00Z",
    "updated_at": "2026-05-22T12:00:00Z"
  },
  "error": null
}
```

---

### 3.5 删除试验记录

**端点**: `DELETE /api/rd/experiments/{id}`

**描述**: 删除指定试验记录

**认证**: 需要

**权限**: rs:experiment:delete

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 试验 ID |

**请求示例**:

```bash
curl -X DELETE http://localhost:8058/api/rd/experiments/exp-003 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": true,
  "error": null
}
```

---

### 3.6 获取项目的试验列表

**端点**: `GET /api/rd/experiments/project/{projectId}`

**描述**: 获取指定项目的所有试验记录

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| projectId | string | 项目 ID |

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| status | string | 否 | 试验状态 |

**请求示例**:

```bash
curl -X GET "http://localhost:8058/api/rd/experiments/project/550e8400-e29b-41d4-a716-446655440000?status=completed" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "exp-001",
      "project_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "催化剂A在不同温度下的活性测试",
      "experiment_type": "催化活性测试",
      "status": "completed",
      "experiment_date": "2026-05-20",
      "experimenter": "张工程师"
    }
  ],
  "error": null
}
```

---

## 4. 健康检查

### 4.1 检查服务状态

**端点**: `GET /health`

**描述**: 检查研发管理系统的健康状态

**认证**: 不需要

**请求示例**:

```bash
curl -X GET http://localhost:8058/health
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": "OK"
}
```

---

## 5. 错误代码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| PROJECT_NOT_FOUND | 404 | 项目不存在 |
| PROJECT_INACTIVE | 400 | 项目已停用 |
| EXPERIMENT_NOT_FOUND | 404 | 试验记录不存在 |
| INVALID_PROJECT_ID | 400 | 无效的项目 ID |
| VALIDATION_ERROR | 400 | 数据验证失败 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 6. 试验类型参考

| 类型代码 | 说明 |
|----------|------|
| catalyst_activity | 催化活性测试 |
| stability_test | 稳定性测试 |
| performance_eval | 性能评估 |
| material_analysis | 材料分析 |
| scale_up_test | 放大试验 |
| quality_test | 质量测试 |
| safety_assessment | 安全性评估 |
| other | 其他 |

---

## 7. 项目状态说明

| 状态代码 | 说明 |
|----------|------|
| active | 进行中 |
| paused | 已暂停 |
| completed | 已完成 |
| cancelled | 已取消 |

---

## 8. 试验状态说明

| 状态代码 | 说明 |
|----------|------|
| planned | 计划中 |
| in_progress | 进行中 |
| completed | 已完成 |
| cancelled | 已取消 |

---

**版本历史**

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v2.1.0 | 2026-05-22 | 完善试验记录管理接口 |
| v1.0.0 | 2026-05-20 | 初始版本 |
