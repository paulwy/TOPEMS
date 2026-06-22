# TOPEMS 实验室管理系统 API

**服务**: topems-lims (集成在 quality-assurance)
**端口**: 8052 (已整合至质量管控服务)
**版本**: v2

---

> **API 路径**: `/api/lims/` (例如 `/api/lims/samples`)
> **实际访问地址**: `http://localhost:8052/api/lims/`

## 1. 概述

实验室信息管理系统 API（LIMS - Laboratory Information Management System）提供样品管理、检验流程管理等功能。

### 1.1 API 端点总览

| 功能 | 端点 | 方法 |
|------|------|------|
| 样品列表 | /api/lims/samples | GET |
| 样品详情 | /api/lims/samples/{id} | GET |
| 创建样品 | /api/lims/samples | POST |
| 更新样品 | /api/lims/samples/{id} | PUT |
| 删除样品 | /api/lims/samples/{id} | DELETE |
| 检验流程列表 | /api/lims/processes | GET |
| 检验流程详情 | /api/lims/processes/{id} | GET |
| 检验任务列表 | /api/lims/tasks | GET |
| 检验任务详情 | /api/lims/tasks/{id} | GET |
| 创建检验任务 | /api/lims/tasks | POST |
| 更新检验任务 | /api/lims/tasks/{id} | PUT |
| 完成检验步骤 | /api/lims/tasks/{id}/complete_step | POST |
| 检验记录列表 | /api/lims/records | GET |
| 创建检验记录 | /api/lims/records | POST |
| 任务检验记录 | /api/lims/records/task/{taskId} | GET |
| 健康检查 | /health | GET |

### 1.2 数据模型

#### Sample（样品）

```json
{
  "id": "sample-001",
  "name": "催化剂A样品 #001",
  "description": "2026年5月20日批次催化剂A样品",
  "status": "received",
  "project_id": "550e8400-e29b-41d4-a716-446655440000",
  "received_date": "2026-05-20",
  "created_at": "2026-05-20T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

#### InspectionProcess（检验流程）

```json
{
  "id": "process-001",
  "name": "催化剂常规检验",
  "description": "适用于所有催化剂产品的常规检验流程",
  "steps": [
    {
      "id": "step-001",
      "name": "外观检查",
      "description": "检查样品外观是否正常",
      "order": 1,
      "required": true
    },
    {
      "id": "step-002",
      "name": "化学成分分析",
      "description": "使用XRF分析仪测定化学成分",
      "order": 2,
      "required": true
    }
  ],
  "status": "active",
  "created_at": "2026-05-20T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

#### InspectionTask（检验任务）

```json
{
  "id": "task-001",
  "sample_id": "sample-001",
  "process_id": "process-001",
  "current_step": 2,
  "status": "in_progress",
  "inspector": "李检验员",
  "started_at": "2026-05-21T09:00:00Z",
  "completed_at": null,
  "created_at": "2026-05-21T09:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

#### InspectionRecord（检验记录）

```json
{
  "id": "record-001",
  "task_id": "task-001",
  "step_id": "step-001",
  "step_name": "外观检查",
  "result": "样品呈深灰色粉末状，无结块，符合正常外观",
  "conclusion": "通过",
  "inspector": "李检验员",
  "recorded_at": "2026-05-21T09:30:00Z",
  "created_at": "2026-05-21T09:30:00Z"
}
```

---

## 2. 样品管理接口

### 2.1 获取样品列表

**端点**: `GET /api/lims/samples`

**描述**: 获取所有样品列表

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码（默认1） |
| page_size | integer | 否 | 每页数量（默认20） |
| status | string | 否 | 样品状态（received, testing, completed, disposed） |

**请求示例**:

```bash
curl -X GET "http://localhost:8052/api/lims/samples?page=1&page_size=20&status=received" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "sample-001",
      "name": "催化剂A样品 #001",
      "description": "2026年5月20日批次催化剂A样品",
      "status": "received",
      "project_id": "550e8400-e29b-41d4-a716-446655440000",
      "received_date": "2026-05-20",
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    },
    {
      "id": "sample-002",
      "name": "催化剂A样品 #002",
      "description": "2026年5月21日批次催化剂A样品",
      "status": "testing",
      "project_id": "550e8400-e29b-41d4-a716-446655440000",
      "received_date": "2026-05-21",
      "created_at": "2026-05-21T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    }
  ],
  "error": null
}
```

---

### 2.2 获取样品详情

**端点**: `GET /api/lims/samples/{id}`

**描述**: 获取指定样品的详细信息

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 样品 ID |

**请求示例**:

```bash
curl -X GET http://localhost:8052/api/lims/samples/sample-001 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "sample-001",
    "name": "催化剂A样品 #001",
    "description": "2026年5月20日批次催化剂A样品",
    "status": "received",
    "project_id": "550e8400-e29b-41d4-a716-446655440000",
    "received_date": "2026-05-20",
    "created_at": "2026-05-20T10:00:00Z",
    "updated_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

### 2.3 创建样品

**端点**: `POST /api/lims/samples`

**描述**: 创建新的样品记录

**认证**: 需要

**权限**: lims:sample:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "name": "催化剂A样品 #001",
  "description": "2026年5月20日批次催化剂A样品",
  "status": "received"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| name | string | 是 | 样品名称 |
| description | string | 否 | 样品描述 |
| status | string | 是 | 样品状态（received, testing, completed, disposed） |

**请求示例**:

```bash
curl -X POST http://localhost:8052/api/lims/samples \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "催化剂A样品 #001",
    "description": "2026年5月20日批次催化剂A样品",
    "status": "received"
  }'
```

**成功响应** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "sample-001",
    "name": "催化剂A样品 #001",
    "description": "2026年5月20日批次催化剂A样品",
    "status": "received",
    "received_date": "2026-05-22",
    "created_at": "2026-05-22T10:00:00Z",
    "updated_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

### 2.4 更新样品

**端点**: `PUT /api/lims/samples/{id}`

**描述**: 更新指定样品信息

**认证**: 需要

**权限**: lims:sample:write

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 样品 ID |

**请求体**:

```json
{
  "name": "催化剂A样品 #001（更新）",
  "description": "2026年5月20日批次催化剂A样品，已完成初步处理",
  "status": "testing"
}
```

**请求示例**:

```bash
curl -X PUT http://localhost:8052/api/lims/samples/sample-001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "催化剂A样品 #001（更新）",
    "status": "testing"
  }'
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "sample-001",
    "name": "催化剂A样品 #001（更新）",
    "description": "2026年5月20日批次催化剂A样品，已完成初步处理",
    "status": "testing",
    "received_date": "2026-05-22",
    "created_at": "2026-05-22T10:00:00Z",
    "updated_at": "2026-05-22T11:00:00Z"
  },
  "error": null
}
```

---

### 2.5 删除样品

**端点**: `DELETE /api/lims/samples/{id}`

**描述**: 删除指定样品

**认证**: 需要

**权限**: lims:sample:delete

**请求示例**:

```bash
curl -X DELETE http://localhost:8052/api/lims/samples/sample-001 \
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

## 3. 检验流程管理接口

### 3.1 获取检验流程列表

**端点**: `GET /api/lims/processes`

**描述**: 获取所有检验流程

**认证**: 需要

**请求示例**:

```bash
curl -X GET http://localhost:8052/api/lims/processes \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "process-001",
      "name": "催化剂常规检验",
      "description": "适用于所有催化剂产品的常规检验流程",
      "steps": [
        {
          "id": "step-001",
          "name": "外观检查",
          "order": 1,
          "required": true
        },
        {
          "id": "step-002",
          "name": "化学成分分析",
          "order": 2,
          "required": true
        }
      ],
      "status": "active",
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    }
  ],
  "error": null
}
```

---

### 3.2 获取检验流程详情

**端点**: `GET /api/lims/processes/{id}`

**描述**: 获取指定检验流程的详细信息

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 流程 ID |

**请求示例**:

```bash
curl -X GET http://localhost:8052/api/lims/processes/process-001 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "process-001",
    "name": "催化剂常规检验",
    "description": "适用于所有催化剂产品的常规检验流程",
    "steps": [
      {
        "id": "step-001",
        "name": "外观检查",
        "description": "检查样品外观是否正常",
        "order": 1,
        "required": true
      },
      {
        "id": "step-002",
        "name": "化学成分分析",
        "description": "使用XRF分析仪测定化学成分",
        "order": 2,
        "required": true
      },
      {
        "id": "step-003",
        "name": "活性测试",
        "description": "在标准条件下测定催化活性",
        "order": 3,
        "required": true
      }
    ],
    "status": "active",
    "created_at": "2026-05-20T10:00:00Z",
    "updated_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

## 4. 检验任务管理接口

### 4.1 获取检验任务列表

**端点**: `GET /api/lims/tasks`

**描述**: 获取所有检验任务

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| status | string | 否 | 任务状态（pending, in_progress, completed, cancelled） |

**请求示例**:

```bash
curl -X GET "http://localhost:8052/api/lims/tasks?status=in_progress" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "task-001",
      "sample_id": "sample-001",
      "process_id": "process-001",
      "current_step": 2,
      "status": "in_progress",
      "inspector": "李检验员",
      "started_at": "2026-05-21T09:00:00Z",
      "completed_at": null,
      "created_at": "2026-05-21T09:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    }
  ],
  "error": null
}
```

---

### 4.2 获取检验任务详情

**端点**: `GET /api/lims/tasks/{id}`

**描述**: 获取指定检验任务的详细信息

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 任务 ID |

**请求示例**:

```bash
curl -X GET http://localhost:8052/api/lims/tasks/task-001 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "task-001",
    "sample_id": "sample-001",
    "process_id": "process-001",
    "current_step": 2,
    "status": "in_progress",
    "inspector": "李检验员",
    "started_at": "2026-05-21T09:00:00Z",
    "completed_at": null,
    "created_at": "2026-05-21T09:00:00Z",
    "updated_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

### 4.3 创建检验任务

**端点**: `POST /api/lims/tasks`

**描述**: 创建新的检验任务

**认证**: 需要

**权限**: lims:task:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "sample_id": "sample-001",
  "process_id": "process-001",
  "inspector": "李检验员"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| sample_id | string | 是 | 样品 ID |
| process_id | string | 是 | 检验流程 ID |
| inspector | string | 是 | 检验员 |

**请求示例**:

```bash
curl -X POST http://localhost:8052/api/lims/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "sample_id": "sample-001",
    "process_id": "process-001",
    "inspector": "李检验员"
  }'
```

**成功响应** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "task-001",
    "sample_id": "sample-001",
    "process_id": "process-001",
    "current_step": 0,
    "status": "pending",
    "inspector": "李检验员",
    "started_at": "2026-05-22T10:00:00Z",
    "completed_at": null,
    "created_at": "2026-05-22T10:00:00Z",
    "updated_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

### 4.4 更新检验任务

**端点**: `PUT /api/lims/tasks/{id}`

**描述**: 更新检验任务信息

**认证**: 需要

**权限**: lims:task:write

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 任务 ID |

**请求体**:

```json
{
  "sample_id": "sample-001",
  "process_id": "process-001",
  "inspector": "王检验员"
}
```

**请求示例**:

```bash
curl -X PUT http://localhost:8052/api/lims/tasks/task-001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "inspector": "王检验员"
  }'
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "task-001",
    "sample_id": "sample-001",
    "process_id": "process-001",
    "current_step": 0,
    "status": "pending",
    "inspector": "王检验员",
    "started_at": "2026-05-22T10:00:00Z",
    "created_at": "2026-05-22T10:00:00Z",
    "updated_at": "2026-05-22T11:00:00Z"
  },
  "error": null
}
```

---

### 4.5 完成检验步骤

**端点**: `POST /api/lims/tasks/{id}/complete_step`

**描述**: 完成检验任务的一个步骤

**认证**: 需要

**权限**: lims:task:write

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 任务 ID |

**请求体**:

```json
{
  "task_id": "task-001",
  "step_id": "step-001",
  "step_name": "外观检查",
  "result": "样品呈深灰色粉末状，无结块，符合正常外观",
  "conclusion": "通过",
  "inspector": "李检验员"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| task_id | string | 是 | 任务 ID |
| step_id | string | 是 | 步骤 ID |
| step_name | string | 是 | 步骤名称 |
| result | string | 是 | 检验结果 |
| conclusion | string | 是 | 结论（通过/不通过） |
| inspector | string | 是 | 检验员 |

**请求示例**:

```bash
curl -X POST http://localhost:8052/api/lims/tasks/task-001/complete_step \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "task_id": "task-001",
    "step_id": "step-001",
    "step_name": "外观检查",
    "result": "样品呈深灰色粉末状，无结块，符合正常外观",
    "conclusion": "通过",
    "inspector": "李检验员"
  }'
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "task-001",
    "sample_id": "sample-001",
    "process_id": "process-001",
    "current_step": 1,
    "status": "in_progress",
    "inspector": "李检验员",
    "started_at": "2026-05-21T09:00:00Z",
    "completed_at": null,
    "created_at": "2026-05-21T09:00:00Z",
    "updated_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

## 5. 检验记录管理接口

### 5.1 获取检验记录列表

**端点**: `GET /api/lims/records`

**描述**: 获取所有检验记录

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| conclusion | string | 否 | 结论（通过/不通过） |

**请求示例**:

```bash
curl -X GET "http://localhost:8052/api/lims/records?conclusion=通过" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "record-001",
      "task_id": "task-001",
      "step_id": "step-001",
      "step_name": "外观检查",
      "result": "样品呈深灰色粉末状，无结块，符合正常外观",
      "conclusion": "通过",
      "inspector": "李检验员",
      "recorded_at": "2026-05-21T09:30:00Z",
      "created_at": "2026-05-21T09:30:00Z"
    }
  ],
  "error": null
}
```

---

### 5.2 创建检验记录

**端点**: `POST /api/lims/records`

**描述**: 创建新的检验记录

**认证**: 需要

**权限**: lims:record:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "task_id": "task-001",
  "step_id": "step-002",
  "step_name": "化学成分分析",
  "result": "XRF分析结果显示：主要成分Al2O3 45.2%, SiO2 32.1%, Fe2O3 15.3%",
  "conclusion": "通过",
  "inspector": "李检验员"
}
```

**请求示例**:

```bash
curl -X POST http://localhost:8052/api/lims/records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "task_id": "task-001",
    "step_id": "step-002",
    "step_name": "化学成分分析",
    "result": "XRF分析结果显示：主要成分Al2O3 45.2%, SiO2 32.1%, Fe2O3 15.3%",
    "conclusion": "通过",
    "inspector": "李检验员"
  }'
```

**成功响应** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "record-002",
    "task_id": "task-001",
    "step_id": "step-002",
    "step_name": "化学成分分析",
    "result": "XRF分析结果显示：主要成分Al2O3 45.2%, SiO2 32.1%, Fe2O3 15.3%",
    "conclusion": "通过",
    "inspector": "李检验员",
    "recorded_at": "2026-05-22T10:00:00Z",
    "created_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

### 5.3 获取任务的检验记录

**端点**: `GET /api/lims/records/task/{taskId}`

**描述**: 获取指定任务的所有检验记录

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| taskId | string | 任务 ID |

**请求示例**:

```bash
curl -X GET http://localhost:8052/api/lims/records/task/task-001 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "record-001",
      "task_id": "task-001",
      "step_id": "step-001",
      "step_name": "外观检查",
      "result": "样品呈深灰色粉末状，无结块，符合正常外观",
      "conclusion": "通过",
      "inspector": "李检验员",
      "recorded_at": "2026-05-21T09:30:00Z",
      "created_at": "2026-05-21T09:30:00Z"
    },
    {
      "id": "record-002",
      "task_id": "task-001",
      "step_id": "step-002",
      "step_name": "化学成分分析",
      "result": "XRF分析结果显示：主要成分Al2O3 45.2%, SiO2 32.1%, Fe2O3 15.3%",
      "conclusion": "通过",
      "inspector": "李检验员",
      "recorded_at": "2026-05-22T10:00:00Z",
      "created_at": "2026-05-22T10:00:00Z"
    }
  ],
  "error": null
}
```

---

## 6. 健康检查

### 6.1 检查服务状态

**端点**: `GET /health`

**描述**: 检查实验室管理系统的健康状态

**认证**: 不需要

**请求示例**:

```bash
curl -X GET http://localhost:8052/health
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": "OK"
}
```

---

## 7. 错误代码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| SAMPLE_NOT_FOUND | 404 | 样品不存在 |
| PROCESS_NOT_FOUND | 404 | 检验流程不存在 |
| TASK_NOT_FOUND | 404 | 检验任务不存在 |
| RECORD_NOT_FOUND | 404 | 检验记录不存在 |
| STEP_NOT_FOUND | 404 | 检验步骤不存在 |
| INVALID_SAMPLE_ID | 400 | 无效的样品 ID |
| TASK_IN_PROGRESS | 400 | 任务进行中，无法删除 |
| VALIDATION_ERROR | 400 | 数据验证失败 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 8. 样品状态说明

| 状态代码 | 说明 |
|----------|------|
| received | 已接收 |
| testing | 检验中 |
| completed | 检验完成 |
| disposed | 已处置 |

---

## 9. 任务状态说明

| 状态代码 | 说明 |
|----------|------|
| pending | 待开始 |
| in_progress | 进行中 |
| completed | 已完成 |
| cancelled | 已取消 |

---

## 10. 检验结论说明

| 结论代码 | 说明 |
|----------|------|
| 通过 | 检验项目符合标准 |
| 不通过 | 检验项目不符合标准 |

---

**版本历史**

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v2.1.0 | 2026-05-22 | 完善检验流程和记录管理 |
| v1.0.0 | 2026-05-20 | 初始版本 |
