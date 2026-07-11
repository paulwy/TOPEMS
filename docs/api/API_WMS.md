# TOPEMS-WMS 仓储管理系统服务 API 文档

**版本**: v2
**更新日期**: 2026-08-14
**服务地址**: `http://localhost:8041`

---

> **API 路径**: `/api/wms/`

## 目录

1. [服务概述](#1-服务概述)
2. [仓库管理 API](#2-仓库管理-api)
3. [库位管理 API](#3-库位管理-api)
4. [库存管理 API](#4-库存管理-api)
5. [入库管理 API](#5-入库管理-api)
6. [出库管理 API](#6-出库管理-api)
7. [批次管理 API](#7-批次管理-api)
8. [盘点管理 API](#8-盘点管理-api)
9. [补货管理 API](#9-补货管理-api)
10. [转移管理 API](#10-转移管理-api)
11. [健康检查 API](#11-健康检查-api)
12. [数据模型](#12-数据模型)

---

## 1. 服务概述

TOPEMS-WMS 是仓储管理系统，提供仓库管理、库存控制、出入库管理、批次追溯、智能补货等功能。

### 1.1 认证方式

```
Authorization: Bearer <token>
```

---

## 2. 仓库管理 API

### 2.1 获取仓库列表

```
GET /api/wms/warehouses?page=1&page_size=20&status=active
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "主仓库",
        "code": "WH001",
        "type": "raw_material",
        "status": "active",
        "capacity": 10000,
        "used_capacity": 6500,
        "address": "仓库地址"
      }
    ],
    "total": 10
  }
}
```

### 2.2 获取仓库详情

```
GET /api/wms/warehouses/{id}
```

### 2.3 创建仓库

```
POST /api/wms/warehouses
```

**请求体**：

```json
{
  "name": "主仓库",
  "code": "WH001",
  "type": "raw_material",
  "capacity": 10000,
  "address": "仓库地址",
  "manager_id": "uuid"
}
```

### 2.4 更新仓库

```
PUT /api/wms/warehouses/{id}
```

### 2.5 删除仓库

```
DELETE /api/wms/warehouses/{id}
```

---

## 3. 库位管理 API

### 3.1 获取库位列表

```
GET /api/wms/locations?page=1&page_size=20&warehouse_id=uuid
```

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码 |
| page_size | int | 否 | 每页数量 |
| warehouse_id | string | 否 | 仓库ID |
| zone | string | 否 | 区域（A/B/C） |

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "warehouse_id": "uuid",
        "code": "A01-001",
        "zone": "A",
        "row": "01",
        "level": "001",
        "capacity": 100,
        "used_capacity": 45,
        "status": "occupied"
      }
    ],
    "total": 500
  }
}
```

### 3.2 获取库位详情

```
GET /api/wms/locations/{id}
```

### 3.3 创建库位

```
POST /api/wms/locations
```

**请求体**：

```json
{
  "warehouse_id": "uuid",
  "code": "A01-001",
  "zone": "A",
  "row": "01",
  "level": "001",
  "capacity": 100
}
```

---

## 4. 库存管理 API

### 4.1 获取库存列表

```
GET /api/wms/inventory?page=1&page_size=20&warehouse_id=uuid&material_code=MAT001
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "material_id": "uuid",
        "material_code": "MAT001",
        "material_name": "原材料A",
        "warehouse_id": "uuid",
        "location_id": "uuid",
        "location_code": "A01-001",
        "quantity": 150,
        "unit": "kg",
        "batch_no": "B20260814001",
        "expiry_date": "2027-08-14",
        "status": "normal"
      }
    ],
    "total": 200
  }
}
```

### 4.2 获取库存详情

```
GET /api/wms/inventory/{id}
```

### 4.3 获取低库存预警

```
GET /api/wms/inventory/low-stock
```

**响应示例**：

```json
{
  "code": 200,
  "data": [
    {
      "id": "uuid",
      "material_code": "MAT001",
      "material_name": "原材料A",
      "current_stock": 25,
      "safety_stock": 100,
      "warehouse_id": "uuid"
    }
  ]
}
```

### 4.4 库存调整

```
POST /api/wms/inventory/adjust
```

**请求体**：

```json
{
  "inventory_id": "uuid",
  "adjust_type": "increase",
  "quantity": 50,
  "reason": "入库调整",
  "adjust_by": "uuid"
}
```

---

## 5. 入库管理 API

### 5.1 获取入库单列表

```
GET /api/wms/inbound-orders?page=1&page_size=20&status=pending
```

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码 |
| page_size | int | 否 | 每页数量 |
| status | string | 否 | 状态（pending/partial/received/cancelled） |

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "order_no": "PO20260814001",
        "supplier_id": "uuid",
        "supplier_name": "供应商",
        "warehouse_id": "uuid",
        "status": "pending",
        "total_quantity": 200,
        "received_quantity": 0,
        "created_at": "2026-08-14"
      }
    ],
    "total": 50
  }
}
```

### 5.2 获取入库单详情

```
GET /api/wms/inbound-orders/{id}
```

### 5.3 创建入库单

```
POST /api/wms/inbound-orders
```

**请求体**：

```json
{
  "order_no": "PO20260814001",
  "supplier_id": "uuid",
  "warehouse_id": "uuid",
  "items": [
    {
      "material_id": "uuid",
      "quantity": 100,
      "unit": "kg",
      "batch_no": "B20260814001",
      "expiry_date": "2027-08-14"
    }
  ]
}
```

### 5.4 确认入库

```
POST /api/wms/inbound-orders/{id}/receive
```

**请求体**：

```json
{
  "items": [
    {
      "item_id": "uuid",
      "received_quantity": 98,
      "location_id": "uuid"
    }
  ],
  "receiver_id": "uuid"
}
```

---

## 6. 出库管理 API

### 6.1 获取出库单列表

```
GET /api/wms/outbound-orders?page=1&page_size=20&status=picking
```

### 6.2 获取出库单详情

```
GET /api/wms/outbound-orders/{id}
```

### 6.3 创建出库单

```
POST /api/wms/outbound-orders
```

**请求体**：

```json
{
  "order_no": "SO20260814001",
  "customer_id": "uuid",
  "warehouse_id": "uuid",
  "items": [
    {
      "material_id": "uuid",
      "quantity": 50,
      "unit": "kg"
    }
  ]
}
```

### 6.4 拣货确认

```
POST /api/wms/outbound-orders/{id}/pick
```

### 6.5 发货确认

```
POST /api/wms/outbound-orders/{id}/ship
```

---

## 7. 批次管理 API

### 7.1 获取批次列表

```
GET /api/wms/batches?page=1&page_size=20&material_id=uuid
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "batch_no": "B20260814001",
        "material_id": "uuid",
        "quantity": 150,
        "unit": "kg",
        "production_date": "2026-08-14",
        "expiry_date": "2027-08-14",
        "status": "normal"
      }
    ],
    "total": 100
  }
}
```

### 7.2 获取批次详情

```
GET /api/wms/batches/{id}
```

### 7.3 扫码查询批次

```
GET /api/wms/batches/scan?barcode=B20260814001
```

---

## 8. 盘点管理 API

### 8.1 获取盘点任务列表

```
GET /api/wms/stock-takes?page=1&page_size=20&status=pending
```

### 8.2 创建盘点任务

```
POST /api/wms/stock-takes
```

**请求体**：

```json
{
  "warehouse_id": "uuid",
  "type": "full",
  "planned_date": "2026-08-15",
  "stock_taker_ids": ["uuid1", "uuid2"]
}
```

### 8.3 提交盘点结果

```
POST /api/wms/stock-takes/{id}/submit
```

**请求体**：

```json
{
  "items": [
    {
      "inventory_id": "uuid",
      "actual_quantity": 148,
      "difference": -2
    }
  ],
  "stock_taker_id": "uuid"
}
```

### 8.4 审核盘点差异

```
POST /api/wms/stock-takes/{id}/audit
```

**请求体**：

```json
{
  "items": [
    {
      "inventory_id": "uuid",
      "approved": true,
      "reason": "正常损耗"
    }
  ],
  "auditor_id": "uuid"
}
```

---

## 9. 补货管理 API

### 9.1 获取补货建议

```
GET /api/wms/replenishment/suggestions
```

**响应示例**：

```json
{
  "code": 200,
  "data": [
    {
      "material_id": "uuid",
      "material_name": "原材料A",
      "current_stock": 25,
      "safety_stock": 100,
      "suggested_quantity": 75,
      "source_warehouse_id": "uuid",
      "target_warehouse_id": "uuid"
    }
  ]
}
```

### 9.2 执行智能补货

```
POST /api/wms/replenishment/execute
```

**请求体**：

```json
{
  "items": [
    {
      "material_id": "uuid",
      "quantity": 75,
      "source_warehouse_id": "uuid",
      "target_warehouse_id": "uuid"
    }
  ]
}
```

---

## 10. 转移管理 API

### 10.1 获取转移单列表

```
GET /api/wms/transfer-orders?page=1&page_size=20&status=pending
```

### 10.2 创建转移单

```
POST /api/wms/transfer-orders
```

**请求体**：

```json
{
  "order_no": "TF20260814001",
  "source_warehouse_id": "uuid",
  "target_warehouse_id": "uuid",
  "items": [
    {
      "inventory_id": "uuid",
      "quantity": 50
    }
  ]
}
```

### 10.3 确认转移

```
POST /api/wms/transfer-orders/{id}/confirm
```

---

## 11. 健康检查 API

### 11.1 基础健康检查

```
GET /health
```

### 11.2 详细健康检查

```
GET /health/details
```

---

## 12. 数据模型

### 12.1 Warehouse (仓库)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organization_id | UUID | 组织ID |
| name | VARCHAR(255) | 仓库名称 |
| code | VARCHAR(50) | 仓库编码 |
| type | VARCHAR(50) | 类型 |
| capacity | DECIMAL | 容量 |
| used_capacity | DECIMAL | 已用容量 |

### 12.2 Inventory (库存)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organization_id | UUID | 组织ID |
| material_id | UUID | 物料ID |
| warehouse_id | UUID | 仓库ID |
| location_id | UUID | 库位ID |
| quantity | DECIMAL | 数量 |
| unit | VARCHAR(20) | 单位 |
| batch_no | VARCHAR(50) | 批次号 |
| expiry_date | DATE | 有效期 |

---

**版本**: 2.0.0
**最后更新**: 2026-08-14