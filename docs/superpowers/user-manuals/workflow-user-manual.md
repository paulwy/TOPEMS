# TOPEMS Workflow 用户手册

<lark-toc />

## 1. 系统概述

### 1.1 什么是 Workflow

Workflow（工作流引擎）是 TOPEMS 的审批流程核心，支持：

- 工作流定义与发布
- 流程实例管理
- 审批任务处理
- 流程统计与分析

### 1.2 核心概念

| 概念 | 说明 |
|------|------|
| 工作流 | 业务流程的定义模板 |
| 流程实例 | 工作流的具体执行实例 |
| 审批节点 | 工作流中的审批环节 |
| 待办任务 | 需要当前用户处理的审批任务 |

### 1.3 工作流状态

```
[草稿] → [已发布] → [运行中] → [已完成]
                      ↓
                 [已取消]
```

---

## 2. 工作流定义 API

### 2.1 创建工作流

```bash
curl -X POST http://localhost:8000/api/flow/workflows \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "费用报销审批",
    "code": "expense_approval",
    "description": "员工费用报销审批流程",
    "nodes": [
      {
        "id": "start",
        "type": "start",
        "name": "开始"
      },
      {
        "id": "approve1",
        "type": "approval",
        "name": "部门主管审批",
        "approver": "department_manager"
      },
      {
        "id": "approve2",
        "type": "approval",
        "name": "财务审批",
        "approver": "finance"
      },
      {
        "id": "end",
        "type": "end",
        "name": "结束"
      }
    ],
    "edges": [
      {"from": "start", "to": "approve1"},
      {"from": "approve1", "to": "approve2"},
      {"from": "approve2", "to": "end"}
    ]
  }'
```

### 2.2 查询工作流列表

```bash
curl http://localhost:8000/api/flow/workflows \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.3 查询单个工作流

```bash
curl http://localhost:8000/api/flow/workflows/WORKFLOW_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.4 更新工作流

```bash
curl -X PUT http://localhost:8000/api/flow/workflows/WORKFLOW_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "费用报销审批（修订版）",
    "description": "更新了审批节点"
  }'
```

### 2.5 删除工作流

```bash
curl -X DELETE http://localhost:8000/api/flow/workflows/WORKFLOW_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.6 发布工作流

```bash
curl -X POST http://localhost:8000/api/flow/workflows/WORKFLOW_ID/publish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.7 取消发布工作流

```bash
curl -X POST http://localhost:8000/api/flow/workflows/WORKFLOW_ID/unpublish \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 3. 流程实例 API

### 3.1 创建流程实例

```bash
curl -X POST http://localhost:8000/api/flow/instances \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "workflow_id": "WORKFLOW_ID",
    "title": "2026年6月报销申请",
    "form_data": {
      "amount": 5000,
      "reason": "客户拜访差旅费",
      "receipts": ["receipt1.jpg", "receipt2.jpg"]
    }
  }'
```

### 3.2 查询流程实例列表

```bash
curl http://localhost:8000/api/flow/instances \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.3 查询单个流程实例

```bash
curl http://localhost:8000/api/flow/instances/INSTANCE_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.4 启动流程实例

```bash
curl -X POST http://localhost:8000/api/flow/instances/INSTANCE_ID/start \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.5 审批通过

```bash
curl -X POST http://localhost:8000/api/flow/instances/INSTANCE_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "comment": "同意报销"
  }'
```

### 3.6 审批拒绝

```bash
curl -X POST http://localhost:8000/api/flow/instances/INSTANCE_ID/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "comment": "报销金额超标，请重新申请"
  }'
```

### 3.7 取消流程

```bash
curl -X POST http://localhost:8000/api/flow/instances/INSTANCE_ID/cancel \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "reason": "申请有误，需要重新提交"
  }'
```

---

## 4. 审批任务 API

### 4.1 查询待审批任务

```bash
curl http://localhost:8000/api/flow/approvals/pending \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": [
    {
      "id": "task-uuid",
      "instance_id": "instance-uuid",
      "workflow_name": "费用报销审批",
      "title": "2026年6月报销申请",
      "applicant": "张三",
      "amount": 5000,
      "created_at": "2026-06-15T10:00:00Z"
    }
  ]
}
```

### 4.2 审批通过

```bash
curl -X POST http://localhost:8000/api/flow/approvals/TASK_ID/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "comment": "同意"
  }'
```

### 4.3 审批拒绝

```bash
curl -X POST http://localhost:8000/api/flow/approvals/TASK_ID/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "comment": "拒绝原因"
  }'
```

---

## 5. 统计 API

### 5.1 获取流程统计

```bash
curl http://localhost:8000/api/flow/statistics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**响应示例：**

```json
{
  "success": true,
  "data": {
    "total_instances": 150,
    "pending_instances": 12,
    "completed_instances": 135,
    "cancelled_instances": 3,
    "avg_processing_hours": 24.5,
    "by_workflow": [
      {
        "workflow_name": "费用报销审批",
        "total": 80,
        "pending": 5,
        "completed": 74,
        "cancelled": 1
      }
    ]
  }
}
```

---

## 6. 工作流节点类型

| 节点类型 | 说明 |
|----------|------|
| `start` | 开始节点 |
| `end` | 结束节点 |
| `approval` | 审批节点 |
| `condition` | 条件节点 |
| `notify` | 通知节点 |
| `auto` | 自动处理节点 |

---

## 7. API 参考

### 7.1 工作流定义 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/flow/workflows` | 工作流列表 |
| POST | `/api/flow/workflows` | 创建工作流 |
| GET | `/api/flow/workflows/{id}` | 工作流详情 |
| PUT | `/api/flow/workflows/{id}` | 更新工作流 |
| DELETE | `/api/flow/workflows/{id}` | 删除工作流 |
| POST | `/api/flow/workflows/{id}/publish` | 发布工作流 |
| POST | `/api/flow/workflows/{id}/unpublish` | 取消发布 |

### 7.2 流程实例 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/flow/instances` | 实例列表 |
| POST | `/api/flow/instances` | 创建实例 |
| GET | `/api/flow/instances/{id}` | 实例详情 |
| POST | `/api/flow/instances/{id}/start` | 启动实例 |
| POST | `/api/flow/instances/{id}/approve` | 审批通过 |
| POST | `/api/flow/instances/{id}/reject` | 审批拒绝 |
| POST | `/api/flow/instances/{id}/cancel` | 取消流程 |

### 7.3 审批任务 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/flow/approvals/pending` | 待审批任务 |
| POST | `/api/flow/approvals/{id}/approve` | 审批通过 |
| POST | `/api/flow/approvals/{id}/reject` | 审批拒绝 |

### 7.4 统计 API

| 方法 | 端点 | 说明 |
|------|------|------|
| GET | `/api/flow/statistics` | 流程统计 |

---

## 8. 常见问题

### 8.1 待审批任务为空

**说明：** 当前用户没有待处理的审批任务。

### 8.2 审批被拒绝后可以重新提交吗

**说明：** 可以。申请人可以修改内容后重新提交。

### 8.3 工作流删除后，已运行的实例会怎样

**说明：** 已运行的实例会继续执行完成，但无法创建新的实例。

---

*文档版本：1.0.0*
*最后更新：2026-06-23*
