# TOPEMS-MES 生产执行系统服务 API 文档

**版本**: v2
**更新日期**: 2026-08-14
**服务地址**: `http://localhost:8030`

---

> **API 路径**: `/api/mes/`

## 目录

1. [服务概述](#1-服务概述)
2. [生产订单 API](#2-生产订单-api)
3. [工单管理 API](#3-工单管理-api)
4. [工序管理 API](#4-工序管理-api)
5. [设备管理 API](#5-设备管理-api)
6. [OEE 管理 API](#6-oee-管理-api)
7. [质量管控 API](#7-质量管控-api)
8. [班组管理 API](#8-班组管理-api)
9. [生产看板 API](#9-生产看板-api)
10. [健康检查 API](#10-健康检查-api)
11. [数据模型](#11-数据模型)

---

## 1. 服务概述

TOPEMS-MES 是生产执行系统，提供生产订单管理、工单跟踪、设备监控、OEE分析、质量管控等功能。

### 1.1 认证方式

```
Authorization: Bearer <token>
```

---

## 2. 生产订单 API

### 2.1 获取生产订单列表

```
GET /api/mes/production-orders?page=1&page_size=20&status=processing
```

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码 |
| page_size | int | 否 | 每页数量 |
| status | string | 否 | 状态（pending/processing/completed/cancelled） |
| product_name | string | 否 | 产品名称 |

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "order_no": "MO202608001",
        "product_name": "产品A",
        "quantity": 1000,
        "completed_quantity": 650,
        "status": "processing",
        "scheduled_date": "2026-08-20",
        "actual_start_date": "2026-08-14"
      }
    ],
    "total": 20
  }
}
```

### 2.2 获取生产订单详情

```
GET /api/mes/production-orders/{id}
```

### 2.3 创建生产订单

```
POST /api/mes/production-orders
```

**请求体**：

```json
{
  "order_no": "MO202608001",
  "product_id": "uuid",
  "product_name": "产品A",
  "quantity": 1000,
  "scheduled_date": "2026-08-20",
  "priority": "high",
  "workstation_ids": ["uuid1", "uuid2"]
}
```

### 2.4 更新生产订单

```
PUT /api/mes/production-orders/{id}
```

### 2.5 删除生产订单

```
DELETE /api/mes/production-orders/{id}
```

### 2.6 开始生产

```
POST /api/mes/production-orders/{id}/start
```

### 2.7 完成生产

```
POST /api/mes/production-orders/{id}/complete
```

**请求体**：

```json
{
  "actual_quantity": 980,
  "scrap_quantity": 20,
  "actual_end_date": "2026-08-19"
}
```

### 2.8 获取今日订单

```
GET /api/mes/production-orders/today
```

---

## 3. 工单管理 API

### 3.1 获取工单列表

```
GET /api/mes/work-orders?page=1&page_size=20&workstation_id=uuid
```

### 3.2 获取工单详情

```
GET /api/mes/work-orders/{id}
```

### 3.3 创建工单

```
POST /api/mes/work-orders
```

**请求体**：

```json
{
  "order_no": "WO202608001",
  "production_order_id": "uuid",
  "workstation_id": "uuid",
  "operation_id": "uuid",
  "quantity": 100,
  "status": "pending"
}
```

### 3.4 开始工单

```
POST /api/mes/work-orders/{id}/start
```

### 3.5 完成工单

```
POST /api/mes/work-orders/{id}/complete
```

**请求体**：

```json
{
  "actual_quantity": 98,
  "scrap_quantity": 2,
  "operator_id": "uuid"
}
```

### 3.6 获取工位工单

```
GET /api/mes/workstations/{workstation_id}/orders
```

---

## 4. 工序管理 API

### 4.1 获取工序列表

```
GET /api/mes/process-routes?page=1&page_size=20&product_id=uuid
```

### 4.2 获取工序详情

```
GET /api/mes/process-routes/{id}
```

### 4.3 创建工序

```
POST /api/mes/process-routes
```

**请求体**：

```json
{
  "product_id": "uuid",
  "name": "加工工序A",
  "code": "PR001",
  "steps": [
    { "step_no": 1, "name": "下料", "workstation_id": "uuid", "duration": 30 },
    { "step_no": 2, "name": "加工", "workstation_id": "uuid", "duration": 60 }
  ]
}
```

### 4.4 更新工序

```
PUT /api/mes/process-routes/{id}
```

---

## 5. 设备管理 API

### 5.1 获取设备列表

```
GET /api/mes/equipment?page=1&page_size=20&status=running
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "CNC加工中心",
        "code": "EQ001",
        "type": "cnc",
        "status": "running",
        "workstation_id": "uuid",
        "running_hours": 12500,
        "last_maintenance_date": "2026-07-01"
      }
    ],
    "total": 50
  }
}
```

### 5.2 获取设备详情

```
GET /api/mes/equipment/{id}
```

### 5.3 创建设备

```
POST /api/mes/equipment
```

**请求体**：

```json
{
  "name": "CNC加工中心",
  "code": "EQ001",
  "type": "cnc",
  "workstation_id": "uuid",
  "manufacturer": "厂家名称",
  "model": "型号",
  "installation_date": "2026-01-01"
}
```

### 5.4 更新设备

```
PUT /api/mes/equipment/{id}
```

### 5.5 设备保养记录

```
POST /api/mes/equipment/{id}/maintenance
```

**请求体**：

```json
{
  "maintenance_type": "routine",
  "description": "定期保养",
  "cost": 5000.00,
  "performed_by": "uuid"
}
```

---

## 6. OEE 管理 API

### 6.1 获取 OEE 数据

```
GET /api/mes/oee?equipment_id=uuid&date=2026-08-14
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "equipment_id": "uuid",
    "date": "2026-08-14",
    "oee": 85.5,
    "availability": 90.0,
    "performance": 88.0,
    "quality": 98.0,
    "planned_hours": 8,
    "actual_hours": 7.2,
    "ideal_cycle_time": 12,
    "actual_cycle_time": 13.6
  }
}
```

### 6.2 获取 OEE 趋势

```
GET /api/mes/oee/trend?equipment_id=uuid&start_date=2026-08-01&end_date=2026-08-14
```

### 6.3 获取 OEE 汇总

```
GET /api/mes/oee/summary?date=2026-08-14
```

---

## 7. 质量管控 API

### 7.1 获取检验记录

```
GET /api/mes/quality-inspections?page=1&page_size=20&order_id=uuid
```

### 7.2 创建检验记录

```
POST /api/mes/quality-inspections
```

**请求体**：

```json
{
  "production_order_id": "uuid",
  "work_order_id": "uuid",
  "inspection_type": "in_process",
  "samples": [
    { "sample_no": 1, "result": "pass", "measurements": { "dimension": 10.01 } },
    { "sample_no": 2, "result": "pass", "measurements": { "dimension": 9.99 } }
  ],
  "inspector_id": "uuid"
}
```

### 7.3 获取不合格记录

```
GET /api/mes/quality-issues?page=1&page_size=20&status=open
```

### 7.4 创建不合格记录

```
POST /api/mes/quality-issues
```

**请求体**：

```json
{
  "production_order_id": "uuid",
  "description": "尺寸超差",
  "severity": "major",
  "quantity": 5,
  "disposition": "rework"
}
```

---

## 8. 班组管理 API

### 8.1 获取班组列表

```
GET /api/mes/teams?page=1&page_size=20
```

### 8.2 获取班组详情

```
GET /api/mes/teams/{id}
```

### 8.3 创建班组

```
POST /api/mes/teams
```

**请求体**：

```json
{
  "name": "甲班",
  "code": "TEAM-A",
  "shift": "day",
  "leader_id": "uuid",
  "member_ids": ["uuid1", "uuid2"]
}
```

### 8.4 获取班组日报

```
GET /api/mes/teams/{id}/daily-report?date=2026-08-14
```

---

## 9. 生产看板 API

### 9.1 获取看板数据

```
GET /api/mes/kanban
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "today_production": {
      "planned": 5000,
      "completed": 3200,
      "progress": 64
    },
    "quality": {
      "pass_rate": 98.5,
      "issues_today": 3
    },
    "equipment": {
      "running": 15,
      "idle": 3,
      "maintenance": 2
    },
    "oee": {
      "average": 82.3
    }
  }
}
```

### 9.2 WebSocket 实时看板

```
WebSocket /api/mes/kanban/ws
```

---

## 10. 健康检查 API

### 10.1 基础健康检查

```
GET /health
```

### 10.2 详细健康检查

```
GET /health/details
```

---

## 11. 数据模型

### 11.1 ProductionOrder (生产订单)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organization_id | UUID | 组织ID |
| order_no | VARCHAR(50) | 订单编号 |
| product_id | UUID | 产品ID |
| product_name | VARCHAR(255) | 产品名称 |
| quantity | INT | 计划数量 |
| completed_quantity | INT | 完成数量 |
| status | VARCHAR(20) | 状态 |
| scheduled_date | DATE | 计划日期 |

### 11.2 Equipment (设备)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organization_id | UUID | 组织ID |
| name | VARCHAR(255) | 设备名称 |
| code | VARCHAR(50) | 设备编码 |
| type | VARCHAR(50) | 设备类型 |
| status | VARCHAR(20) | 状态 |
| running_hours | DECIMAL | 运行小时数 |

---

**版本**: 2.0.0
**最后更新**: 2026-08-14