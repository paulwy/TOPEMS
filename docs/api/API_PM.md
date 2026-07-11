# TOPEMS-PM 项目管理服务 API 文档

**版本**: v2
**更新日期**: 2026-08-14
**服务地址**: `http://localhost:8023`

---

> **API 路径**: `/api/pm/`

## 目录

1. [服务概述](#1-服务概述)
2. [项目管理 API](#2-项目管理-api)
3. [项目阶段 API](#3-项目阶段-api)
4. [项目里程碑 API](#4-项目里程碑-api)
5. [项目成员 API](#5-项目成员-api)
6. [项目预算 API](#6-项目预算-api)
7. [项目风险 API](#7-项目风险-api)
8. [项目审批 API](#8-项目审批-api)
9. [项目报表 API](#9-项目报表-api)
10. [健康检查 API](#10-健康检查-api)

---

## 1. 服务概述

TOPEMS-PM 是项目管理系统，提供项目全生命周期管理、进度跟踪、预算控制、风险管控等功能。

### 1.1 认证方式

```
Authorization: Bearer <token>
```

---

## 2. 项目管理 API

### 2.1 获取项目列表

```
GET /api/pm/projects?page=1&page_size=20&status=active
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "项目名称",
        "code": "PROJ001",
        "type": "development",
        "status": "active",
        "start_date": "2026-08-01",
        "end_date": "2026-12-31",
        "progress": 45,
        "budget": 1000000.00,
        "actual_cost": 450000.00,
        "manager_id": "uuid",
        "manager_name": "负责人"
      }
    ],
    "total": 50
  }
}
```

### 2.2 获取项目详情

```
GET /api/pm/projects/{id}
```

### 2.3 创建项目

```
POST /api/pm/projects
```

**请求体**：

```json
{
  "name": "项目名称",
  "code": "PROJ001",
  "type": "development",
  "description": "项目描述",
  "start_date": "2026-08-01",
  "end_date": "2026-12-31",
  "budget": 1000000.00,
  "manager_id": "uuid"
}
```

### 2.4 更新项目

```
PUT /api/pm/projects/{id}
```

### 2.5 删除项目

```
DELETE /api/pm/projects/{id}
```

### 2.6 启动项目

```
POST /api/pm/projects/{id}/start
```

### 2.7 结束项目

```
POST /api/pm/projects/{id}/close
```

---

## 3. 项目阶段 API

### 3.1 获取阶段列表

```
GET /api/pm/project-phases?project_id=uuid
```

### 3.2 创建阶段

```
POST /api/pm/project-phases
```

**请求体**：

```json
{
  "project_id": "uuid",
  "name": "需求分析",
  "order": 1,
  "start_date": "2026-08-01",
  "end_date": "2026-08-31",
  "status": "completed"
}
```

---

## 4. 项目里程碑 API

### 4.1 获取里程碑列表

```
GET /api/pm/project-milestones?project_id=uuid
```

### 4.2 创建里程碑

```
POST /api/pm/project-milestones
```

**请求体**：

```json
{
  "project_id": "uuid",
  "name": "需求评审完成",
  "due_date": "2026-08-15",
  "status": "completed"
}
```

---

## 5. 项目成员 API

### 5.1 获取成员列表

```
GET /api/pm/project-members?project_id=uuid
```

### 5.2 添加成员

```
POST /api/pm/project-members
```

**请求体**：

```json
{
  "project_id": "uuid",
  "user_id": "uuid",
  "role": "developer",
  "allocation": 100
}
```

---

## 6. 项目预算 API

### 6.1 获取预算信息

```
GET /api/pm/project-budget/{project_id}
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "project_id": "uuid",
    "total_budget": 1000000.00,
    "actual_cost": 450000.00,
    "remaining": 550000.00,
    "budget_rate": 45
  }
}
```

### 6.2 更新预算

```
PUT /api/pm/project-budget/{project_id}
```

**请求体**：

```json
{
  "new_budget": 1200000.00,
  "reason": "增加功能需求"
}
```

---

## 7. 项目风险 API

### 7.1 获取风险列表

```
GET /api/pm/project-risks?project_id=uuid&status=open
```

### 7.2 创建风险

```
POST /api/pm/project-risks
```

**请求体**：

```json
{
  "project_id": "uuid",
  "title": "技术风险",
  "description": "新技术应用风险",
  "probability": 50,
  "impact": 80,
  "risk_level": "high",
  "mitigation": "进行技术验证"
}
```

---

## 8. 项目审批 API

### 8.1 获取审批记录

```
GET /api/pm/project-approvals?project_id=uuid
```

### 8.2 提交审批

```
POST /api/pm/project-approvals
```

**请求体**：

```json
{
  "project_id": "uuid",
  "approval_type": "budget_adjustment",
  "content": "预算调整申请",
  "approver_id": "uuid"
}
```

### 8.3 审批通过

```
POST /api/pm/project-approvals/{id}/approve
```

---

## 9. 项目报表 API

### 9.1 获取项目报表

```
GET /api/pm/reports/project/{project_id}
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "project_id": "uuid",
    "project_name": "项目名称",
    "progress": 45,
    "budget_status": "on_track",
    "risk_count": 3,
    "milestone_status": { "completed": 2, "total": 5 }
  }
}
```

### 9.2 获取项目统计

```
GET /api/pm/reports/statistics?period=2026-08
```

---

## 10. 健康检查 API

### 10.1 基础健康检查

```
GET /health
```

---

**版本**: 2.0.0
**最后更新**: 2026-08-14