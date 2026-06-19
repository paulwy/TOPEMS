# TOPEMS 工作流系统 API

**服务**: topems-flow (集成在 unified-core)
**端口**: 8000
**版本**: v2

---

> **API 路径**: `/api/workflow/` (例如 `/api/workflow/workflows`)
> **实际访问地址**: `http://localhost:8000/api/workflow/`

## 1. 概述

工作流系统 API（FLOW）提供审批流程管理功能，包括工作流定义、流程实例、审批任务和审批记录等。

### 1.1 API 端点总览

| 功能 | 端点 | 方法 |
|------|------|------|
| 工作流列表 | /api/workflow/workflows | GET |
| 工作流详情 | /api/workflow/workflows/{id} | GET |
| 创建工作流 | /api/workflow/workflows | POST |
| 更新工作流 | /api/workflow/workflows/{id} | PUT |
| 删除工作流 | /api/workflow/workflows/{id} | DELETE |
| 流程实例列表 | /api/workflow/instances | GET |
| 流程实例详情 | /api/workflow/instances/{id} | GET |
| 创建流程实例 | /api/workflow/instances | POST |
| 更新实例状态 | /api/workflow/instances/{id}/status | PATCH |
| 审批任务列表 | /api/workflow/approvals | GET |
| 审批任务详情 | /api/workflow/approvals/{id} | GET |
| 创建审批任务 | /api/workflow/approvals | POST |
| 审批通过 | /api/workflow/approvals/{id}/action | POST |
| 审批拒绝 | /api/workflow/approvals/{id}/action | POST |
| 审批转交 | /api/workflow/approvals/{id}/delegate | POST |
| 添加审批意见 | /api/workflow/approvals/{id}/comment | POST |
| 获取审批意见 | /api/workflow/approvals/{id}/comments | GET |
| 待我审批 | /api/workflow/approvals/pending | GET |
| 我已审批 | /api/workflow/approvals/completed | GET |
| 处理超时 | /api/workflow/approvals/{id}/timeout | POST |
| 审批记录列表 | /api/workflow/records | GET |
| 审批记录详情 | /api/workflow/records/{approvalId} | GET |
| 健康检查 | /health | GET |

### 1.2 数据模型

#### Workflow（工作流）

```json
{
  "id": "workflow-001",
  "name": "项目立项审批流程",
  "description": "研发项目立项的标准审批流程",
  "definition": {
    "version": "1.0",
    "nodes": [
      {
        "node_id": "node-1",
        "name": "部门经理审批",
        "approvers": ["manager1"],
        "approval_type": "single",
        "timeout_hours": 48,
        "notification_users": ["applicant"]
      },
      {
        "node_id": "node-2",
        "name": "技术总监审批",
        "approvers": ["director1"],
        "approval_type": "single",
        "timeout_hours": 72
      }
    ],
    "start_node": "node-1",
    "end_nodes": ["node-2"]
  },
  "is_active": true,
  "created_at": "2026-05-20T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

#### WorkflowInstance（流程实例）

```json
{
  "id": "instance-001",
  "workflow_id": "workflow-001",
  "status": "in_progress",
  "current_node": "node-2",
  "initiator_id": "user-001",
  "data": {
    "project_name": "新型催化剂研发",
    "budget": 500000,
    "reason": "市场前景广阔"
  },
  "started_at": "2026-05-22T09:00:00Z",
  "completed_at": null,
  "created_at": "2026-05-22T09:00:00Z"
}
```

#### Approval（审批任务）

```json
{
  "id": "approval-001",
  "workflow_instance_id": "instance-001",
  "node_id": "node-1",
  "task_name": "部门经理审批",
  "assignee_id": "manager1",
  "status": "pending",
  "approval_type": "single",
  "comment": null,
  "approved_by": null,
  "approved_at": null,
  "timeout_at": "2026-05-24T09:00:00Z",
  "created_at": "2026-05-22T09:00:00Z"
}
```

#### ApprovalRecord（审批记录）

```json
{
  "id": "record-001",
  "approval_id": "approval-001",
  "action": "approved",
  "user_id": "manager1",
  "user_name": "王经理",
  "comment": "同意立项",
  "previous_status": "pending",
  "new_status": "approved",
  "created_at": "2026-05-22T10:00:00Z"
}
```

---

## 2. 工作流管理接口

### 2.1 获取工作流列表

**端点**: `GET /api/workflow/workflows`

**描述**: 获取所有工作流定义

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| is_active | boolean | 否 | 是否激活 |

**请求示例**:

```bash
curl -X GET "http://localhost:8000/api/workflow/workflows?is_active=true" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "workflow-001",
      "name": "项目立项审批流程",
      "description": "研发项目立项的标准审批流程",
      "is_active": true,
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    }
  ],
  "error": null
}
```

---

### 2.2 获取工作流详情

**端点**: `GET /api/workflow/workflows/{id}`

**描述**: 获取指定工作流的详细信息

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 工作流 ID |

---

### 2.3 创建工作流

**端点**: `POST /api/workflow/workflows`

**描述**: 创建新的工作流定义

**认证**: 需要

**权限**: flow:workflow:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "name": "项目立项审批流程",
  "description": "研发项目立项的标准审批流程",
  "definition": {
    "version": "1.0",
    "nodes": [
      {
        "node_id": "node-1",
        "name": "部门经理审批",
        "approvers": ["manager1"],
        "approval_type": "single",
        "timeout_hours": 48,
        "notification_users": ["applicant"]
      },
      {
        "node_id": "node-2",
        "name": "技术总监审批",
        "approvers": ["director1"],
        "approval_type": "single",
        "timeout_hours": 72
      }
    ],
    "start_node": "node-1",
    "end_nodes": ["node-2"]
  }
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| name | string | 是 | 工作流名称 |
| description | string | 否 | 工作流描述 |
| definition | object | 是 | 工作流定义 |
| definition.version | string | 是 | 版本号 |
| definition.nodes | array | 是 | 审批节点列表 |
| definition.start_node | string | 是 | 开始节点 ID |
| definition.end_nodes | array | 是 | 结束节点 ID 列表 |

**节点属性**:
| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| node_id | string | 是 | 节点 ID |
| name | string | 是 | 节点名称 |
| approvers | array | 是 | 审批人列表 |
| approval_type | string | 是 | 审批类型（single, counter, or） |
| conditions | array | 否 | 触发条件 |
| timeout_hours | number | 否 | 超时时长（小时） |
| auto_action | string | 否 | 超时自动操作 |
| notification_users | array | 否 | 通知用户 |

**审批类型说明**:
- `single`: 单人审批（任意一人审批即可）
- `counter`: 会签审批（需所有人审批）
- `or`: 或签审批（满足任一条件即可）

---

### 2.4 更新工作流

**端点**: `PUT /api/workflow/workflows/{id}`

**描述**: 更新指定工作流

**认证**: 需要

**权限**: flow:workflow:write

---

### 2.5 删除工作流

**端点**: `DELETE /api/workflow/workflows/{id}`

**描述**: 删除指定工作流

**认证**: 需要

**权限**: flow:workflow:delete

---

## 3. 流程实例管理接口

### 3.1 获取流程实例列表

**端点**: `GET /api/workflow/instances`

**描述**: 获取所有流程实例

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| workflow_id | string | 否 | 工作流 ID |
| status | string | 否 | 实例状态 |
| initiator_id | string | 否 | 发起人 ID |

---

### 3.2 获取流程实例详情

**端点**: `GET /api/workflow/instances/{id}`

**描述**: 获取指定流程实例的详细信息

**认证**: 需要

---

### 3.3 创建流程实例

**端点**: `POST /api/workflow/instances`

**描述**: 创建新的流程实例（发起审批流程）

**认证**: 需要

**权限**: flow:instance:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "workflow_id": "workflow-001",
  "initiator_id": "user-001",
  "data": {
    "project_name": "新型催化剂研发",
    "budget": 500000,
    "reason": "市场前景广阔"
  }
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| workflow_id | string | 是 | 工作流 ID |
| initiator_id | string | 否 | 发起人 ID |
| data | object | 否 | 流程业务数据 |

**请求示例**:

```bash
curl -X POST http://localhost:8000/api/workflow/instances \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "workflow_id": "workflow-001",
    "initiator_id": "user-001",
    "data": {
      "project_name": "新型催化剂研发",
      "budget": 500000,
      "reason": "市场前景广阔"
    }
  }'
```

**成功响应** (201 Created):

```json
{
  "success": true,
  "data": {
    "id": "instance-001",
    "workflow_id": "workflow-001",
    "status": "in_progress",
    "current_node": "node-1",
    "initiator_id": "user-001",
    "data": {
      "project_name": "新型催化剂研发",
      "budget": 500000,
      "reason": "市场前景广阔"
    },
    "started_at": "2026-05-22T09:00:00Z",
    "completed_at": null,
    "created_at": "2026-05-22T09:00:00Z"
  },
  "error": null
}
```

---

### 3.4 更新流程实例状态

**端点**: `PATCH /api/workflow/instances/{id}/status`

**描述**: 更新流程实例状态

**认证**: 需要

**权限**: flow:instance:write

**请求体**:

```json
{
  "status": "completed"
}
```

---

## 4. 审批任务管理接口

### 4.1 获取审批任务列表

**端点**: `GET /api/workflow/approvals`

**描述**: 获取审批任务列表

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| workflow_instance_id | string | 否 | 流程实例 ID |
| status | string | 否 | 任务状态 |
| assignee_id | string | 否 | 审批人 ID |

**请求示例**:

```bash
curl -X GET "http://localhost:8000/api/workflow/approvals?status=pending" \
  -H "Authorization: Bearer {token}"
```

---

### 4.2 获取审批任务详情

**端点**: `GET /api/workflow/approvals/{id}`

**描述**: 获取指定审批任务的详细信息

**认证**: 需要

---

### 4.3 创建审批任务

**端点**: `POST /api/workflow/approvals`

**描述**: 创建新的审批任务

**认证**: 需要

**权限**: flow:approval:write

**请求体**:

```json
{
  "workflow_instance_id": "instance-001",
  "node_id": "node-1",
  "task_name": "部门经理审批",
  "assignee_id": "manager1",
  "approval_type": "single",
  "timeout_hours": 48
}
```

---

### 4.4 审批通过

**端点**: `POST /api/workflow/approvals/{id}/action`

**描述**: 审批通过

**认证**: 需要

**权限**: flow:approval:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "comment": "同意立项，请继续",
  "user_id": "manager1",
  "user_name": "王经理"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| comment | string | 否 | 审批意见 |
| user_id | string | 是 | 审批人 ID |
| user_name | string | 是 | 审批人姓名 |

**请求示例**:

```bash
curl -X POST http://localhost:8000/api/workflow/approvals/approval-001/action \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "comment": "同意立项，请继续",
    "user_id": "manager1",
    "user_name": "王经理"
  }'
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "approval-001",
    "workflow_instance_id": "instance-001",
    "node_id": "node-1",
    "task_name": "部门经理审批",
    "assignee_id": "manager1",
    "status": "approved",
    "comment": "同意立项，请继续",
    "approved_by": "manager1",
    "approved_at": "2026-05-22T10:00:00Z",
    "created_at": "2026-05-22T09:00:00Z"
  },
  "error": null
}
```

---

### 4.5 审批拒绝

**端点**: `POST /api/workflow/approvals/{id}/action`

**描述**: 审批拒绝

**认证**: 需要

**权限**: flow:approval:write

**请求体**:

```json
{
  "status": "rejected",
  "comment": "预算过高，建议调整后重新提交",
  "user_id": "manager1",
  "user_name": "王经理"
}
```

---

### 4.6 审批转交

**端点**: `POST /api/workflow/approvals/{id}/delegate`

**描述**: 将审批任务转交给其他人

**认证**: 需要

**权限**: flow:approval:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "delegate_to": "manager2",
  "delegate_to_name": "李经理",
  "reason": "出差在外，无法及时处理",
  "user_id": "manager1",
  "user_name": "王经理"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| delegate_to | string | 是 | 转入人 ID |
| delegate_to_name | string | 是 | 转入人姓名 |
| reason | string | 否 | 转交原因 |
| user_id | string | 是 | 转出人 ID |
| user_name | string | 是 | 转出人姓名 |

---

### 4.7 添加审批意见

**端点**: `POST /api/workflow/approvals/{id}/comment`

**描述**: 添加审批意见

**认证**: 需要

**请求体**:

```json
{
  "content": "补充说明：该项目已通过技术可行性论证",
  "user_id": "manager1",
  "user_name": "王经理"
}
```

---

### 4.8 获取审批意见

**端点**: `GET /api/workflow/approvals/{id}/comments`

**描述**: 获取审批任务的意见列表

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 审批任务 ID |

---

### 4.9 获取待我审批

**端点**: `GET /api/workflow/approvals/pending`

**描述**: 获取当前用户待审批的任务列表

**认证**: 需要

**请求示例**:

```bash
curl -X GET http://localhost:8000/api/workflow/approvals/pending \
  -H "Authorization: Bearer {token}"
```

---

### 4.10 获取我已审批

**端点**: `GET /api/workflow/approvals/completed`

**描述**: 获取当前用户已完成的审批任务列表

**认证**: 需要

---

### 4.11 处理超时

**端点**: `POST /api/workflow/approvals/{id}/timeout`

**描述**: 处理审批超时

**认证**: 需要

**权限**: flow:approval:write

---

## 5. 审批记录管理接口

### 5.1 获取审批记录列表

**端点**: `GET /api/workflow/records`

**描述**: 获取所有审批记录

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| approval_id | string | 否 | 审批任务 ID |
| user_id | string | 否 | 用户 ID |

---

### 5.2 获取审批记录详情

**端点**: `GET /api/workflow/records/{approvalId}`

**描述**: 获取指定审批任务的所有记录

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| approvalId | string | 审批任务 ID |

---

## 6. 健康检查

### 6.1 检查服务状态

**端点**: `GET /health`

**描述**: 检查工作流系统的健康状态

**认证**: 不需要

**请求示例**:

```bash
curl -X GET http://localhost:8000/health
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
| WORKFLOW_NOT_FOUND | 404 | 工作流不存在 |
| INSTANCE_NOT_FOUND | 404 | 流程实例不存在 |
| APPROVAL_NOT_FOUND | 404 | 审批任务不存在 |
| RECORD_NOT_FOUND | 404 | 审批记录不存在 |
| WORKFLOW_INACTIVE | 400 | 工作流未激活 |
| APPROVAL_ALREADY_PROCESSED | 400 | 审批任务已处理 |
| NOT_ASSIGNEE | 403 | 非审批人无权操作 |
| INVALID_STATUS | 400 | 无效的状态 |
| VALIDATION_ERROR | 400 | 数据验证失败 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 8. 实例状态说明

| 状态 | 说明 |
|------|------|
| draft | 草稿 |
| in_progress | 进行中 |
| completed | 已完成 |
| cancelled | 已取消 |
| rejected | 已拒绝 |

---

## 9. 审批任务状态说明

| 状态 | 说明 |
|------|------|
| pending | 待审批 |
| approved | 已通过 |
| rejected | 已拒绝 |
| delegated | 已转交 |
| timeout | 已超时 |
| cancelled | 已取消 |

---

## 10. 审批操作类型说明

| 操作 | 说明 |
|------|------|
| approved | 审批通过 |
| rejected | 审批拒绝 |
| delegated | 审批转交 |
| timeout | 审批超时 |
| cancelled | 审批取消 |

---

**版本历史**

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v2.1.0 | 2026-05-22 | 完善审批转交和意见功能 |
| v1.0.0 | 2026-05-20 | 初始版本 |
