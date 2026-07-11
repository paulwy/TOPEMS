# TOPEMS-ERP 企业资源计划服务 API 文档

**版本**: v2
**更新日期**: 2026-08-14
**服务地址**: `http://localhost:8010`

---

> **API 路径**: `/api/erp/`

## 目录

1. [服务概述](#1-服务概述)
2. [采购订单 API](#2-采购订单-api)
3. [销售订单 API](#3-销售订单-api)
4. [库存管理 API](#4-库存管理-api)
5. [财务报表 API](#5-财务报表-api)
6. [固定资产 API](#6-固定资产-api)
7. [物料管理 API](#7-物料管理-api)
8. [合并报表 API](#8-合并报表-api)
9. [健康检查 API](#9-健康检查-api)
10. [数据模型](#10-数据模型)

---

## 1. 服务概述

TOPEMS-ERP 是企业资源计划系统，提供采购、销售、库存、财务、固定资产等管理功能。

### 1.1 认证方式

```
Authorization: Bearer <token>
```

### 1.2 响应格式

```json
{
  "code": 200,
  "message": "操作成功",
  "data": { ... }
}
```

### 1.3 错误码

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 无权限访问 |
| 500 | 服务器内部错误 |

---

## 2. 采购订单 API

### 2.1 获取采购订单列表

```
GET /api/erp/purchase-orders?page=1&page_size=20&status=pending
```

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码，默认1 |
| page_size | int | 否 | 每页数量，默认20 |
| status | string | 否 | 状态（pending/approved/issued/received/closed） |
| supplier_id | string | 否 | 供应商ID |
| search | string | 否 | 搜索关键词 |

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "order_no": "PO202608001",
        "supplier_id": "uuid",
        "supplier_name": "供应商名称",
        "total_amount": 150000.00,
        "status": "pending",
        "created_at": "2026-08-14T10:00:00Z"
      }
    ],
    "total": 100
  }
}
```

### 2.2 获取采购订单详情

```
GET /api/erp/purchase-orders/{id}
```

### 2.3 创建采购订单

```
POST /api/erp/purchase-orders
```

**请求体**：

```json
{
  "order_no": "PO202608001",
  "supplier_id": "uuid",
  "currency": "CNY",
  "tax_rate": 0.13,
  "delivery_date": "2026-08-20",
  "items": [
    {
      "material_id": "uuid",
      "quantity": 100,
      "unit_price": 1500.00,
      "amount": 150000.00
    }
  ],
  "remarks": "备注信息"
}
```

### 2.4 更新采购订单

```
PUT /api/erp/purchase-orders/{id}
```

### 2.5 删除采购订单

```
DELETE /api/erp/purchase-orders/{id}
```

### 2.6 审批采购订单

```
POST /api/erp/purchase-orders/{id}/approve
```

**请求体**：

```json
{
  "approved_by": "uuid",
  "remark": "同意"
}
```

### 2.7 下达采购订单

```
POST /api/erp/purchase-orders/{id}/issue
```

### 2.8 收货确认

```
POST /api/erp/purchase-orders/{id}/receive
```

**请求体**：

```json
{
  "items": [
    {
      "item_id": "uuid",
      "received_quantity": 98,
      "batch_no": "B20260814001"
    }
  ]
}
```

---

## 3. 销售订单 API

### 3.1 获取销售订单列表

```
GET /api/erp/sales-orders?page=1&page_size=20&status=processing
```

### 3.2 获取销售订单详情

```
GET /api/erp/sales-orders/{id}
```

### 3.3 创建销售订单

```
POST /api/erp/sales-orders
```

**请求体**：

```json
{
  "order_no": "SO202608001",
  "customer_id": "uuid",
  "currency": "CNY",
  "tax_rate": 0.13,
  "delivery_date": "2026-08-20",
  "items": [
    {
      "product_id": "uuid",
      "quantity": 50,
      "unit_price": 3000.00,
      "amount": 150000.00
    }
  ]
}
```

### 3.4 更新销售订单

```
PUT /api/erp/sales-orders/{id}
```

### 3.5 删除销售订单

```
DELETE /api/erp/sales-orders/{id}
```

### 3.6 发货确认

```
POST /api/erp/sales-orders/{id}/ship
```

---

## 4. 库存管理 API

### 4.1 获取库存列表

```
GET /api/erp/inventory?page=1&page_size=20&warehouse_id=uuid
```

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码 |
| page_size | int | 否 | 每页数量 |
| warehouse_id | string | 否 | 仓库ID |
| material_id | string | 否 | 物料ID |
| location | string | 否 | 库位 |

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "material_id": "uuid",
        "material_name": "物料名称",
        "warehouse_id": "uuid",
        "location": "A01-001",
        "quantity": 150,
        "unit": "件",
        "batch_no": "B202608001",
        "expiry_date": "2027-08-14"
      }
    ],
    "total": 500
  }
}
```

### 4.2 获取库存详情

```
GET /api/erp/inventory/{id}
```

### 4.3 库存调整

```
POST /api/erp/inventory/adjust
```

**请求体**：

```json
{
  "inventory_id": "uuid",
  "adjust_type": "increase",
  "quantity": 10,
  "reason": "入库调整",
  "adjust_by": "uuid"
}
```

### 4.4 库存盘点

```
POST /api/erp/inventory/stock-take
```

**请求体**：

```json
{
  "warehouse_id": "uuid",
  "items": [
    {
      "inventory_id": "uuid",
      "actual_quantity": 148,
      "difference": -2
    }
  ],
  "stock_take_by": "uuid"
}
```

---

## 5. 财务报表 API

### 5.1 获取资产负债表

```
GET /api/erp/finance/balance-sheet?period=2026-08
```

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| period | string | 是 | 期间（格式：YYYY-MM） |
| company_id | string | 否 | 公司ID |

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "period": "2026-08",
    "assets": {
      "current_assets": 5000000.00,
      "fixed_assets": 10000000.00,
      "total": 15000000.00
    },
    "liabilities": {
      "current_liabilities": 3000000.00,
      "long_term_liabilities": 2000000.00,
      "total": 5000000.00
    },
    "equity": {
      "paid_in_capital": 8000000.00,
      "retained_earnings": 2000000.00,
      "total": 10000000.00
    }
  }
}
```

### 5.2 获取利润表

```
GET /api/erp/finance/profit-statement?period=2026-08
```

### 5.3 获取现金流量表

```
GET /api/erp/finance/cash-flow?period=2026-08
```

### 5.4 获取科目余额表

```
GET /api/erp/finance/trial-balance?period=2026-08
```

### 5.5 获取总账

```
GET /api/erp/finance/general-ledger?period=2026-08&account_code=1001
```

---

## 6. 固定资产 API

### 6.1 获取资产列表

```
GET /api/erp/fixed-assets?page=1&page_size=20&status=in_use
```

### 6.2 获取资产详情

```
GET /api/erp/fixed-assets/{id}
```

### 6.3 创建资产

```
POST /api/erp/fixed-assets
```

**请求体**：

```json
{
  "asset_code": "FA202608001",
  "name": "办公电脑",
  "category": "电子设备",
  "purchase_date": "2026-08-01",
  "purchase_amount": 8000.00,
  "depreciation_method": "straight_line",
  "useful_life": 3,
  "department_id": "uuid",
  "status": "in_use"
}
```

### 6.4 更新资产

```
PUT /api/erp/fixed-assets/{id}
```

### 6.5 资产折旧

```
POST /api/erp/fixed-assets/{id}/depreciate
```

**请求体**：

```json
{
  "depreciation_period": "2026-08",
  "amount": 222.22
}
```

### 6.6 资产报废

```
POST /api/erp/fixed-assets/{id}/scrap
```

---

## 7. 物料管理 API

### 7.1 获取物料列表

```
GET /api/erp/materials?page=1&page_size=20&category=raw_material
```

### 7.2 获取物料详情

```
GET /api/erp/materials/{id}
```

### 7.3 创建物料

```
POST /api/erp/materials
```

**请求体**：

```json
{
  "code": "MAT001",
  "name": "原材料A",
  "category": "raw_material",
  "unit": "kg",
  "specification": "规格说明",
  "safety_stock": 100,
  "max_stock": 500
}
```

### 7.4 更新物料

```
PUT /api/erp/materials/{id}
```

### 7.5 删除物料

```
DELETE /api/erp/materials/{id}
```

---

## 8. 合并报表 API

### 8.1 获取合并报表列表

```
GET /api/erp/consolidation/reports?period=2026-08
```

### 8.2 获取合并报表详情

```
GET /api/erp/consolidation/reports/{id}
```

### 8.3 生成合并报表

```
POST /api/erp/consolidation/generate
```

**请求体**：

```json
{
  "period": "2026-08",
  "report_type": "balance_sheet",
  "company_ids": ["uuid1", "uuid2"],
  "include_subsidiaries": true
}
```

### 8.4 获取合并抵消分录

```
GET /api/erp/consolidation/elimination-entries?period=2026-08
```

### 8.5 保存合并抵消分录

```
POST /api/erp/consolidation/elimination-entries
```

**请求体**：

```json
{
  "period": "2026-08",
  "entries": [
    {
      "account_code": "1001",
      "debit": 100000.00,
      "credit": 0.00,
      "description": "内部往来抵消"
    }
  ]
}
```

---

## 9. 健康检查 API

### 9.1 基础健康检查

```
GET /health
```

### 9.2 详细健康检查

```
GET /health/details
```

---

## 10. 数据模型

### 10.1 PurchaseOrder (采购订单)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organization_id | UUID | 组织ID |
| order_no | VARCHAR(50) | 订单编号 |
| supplier_id | UUID | 供应商ID |
| supplier_name | VARCHAR(255) | 供应商名称 |
| currency | VARCHAR(10) | 货币 |
| tax_rate | DECIMAL | 税率 |
| total_amount | DECIMAL | 总金额 |
| status | VARCHAR(20) | 状态 |
| delivery_date | DATE | 交货日期 |
| created_at | TIMESTAMP | 创建时间 |

### 10.2 SalesOrder (销售订单)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organization_id | UUID | 组织ID |
| order_no | VARCHAR(50) | 订单编号 |
| customer_id | UUID | 客户ID |
| customer_name | VARCHAR(255) | 客户名称 |
| currency | VARCHAR(10) | 货币 |
| tax_rate | DECIMAL | 税率 |
| total_amount | DECIMAL | 总金额 |
| status | VARCHAR(20) | 状态 |
| delivery_date | DATE | 交货日期 |

### 10.3 Inventory (库存)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organization_id | UUID | 组织ID |
| material_id | UUID | 物料ID |
| material_name | VARCHAR(255) | 物料名称 |
| warehouse_id | UUID | 仓库ID |
| location | VARCHAR(50) | 库位 |
| quantity | DECIMAL | 数量 |
| unit | VARCHAR(20) | 单位 |
| batch_no | VARCHAR(50) | 批次号 |
| expiry_date | DATE | 有效期 |

### 10.4 FixedAsset (固定资产)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organization_id | UUID | 组织ID |
| asset_code | VARCHAR(50) | 资产编号 |
| name | VARCHAR(255) | 资产名称 |
| category | VARCHAR(50) | 资产类别 |
| purchase_date | DATE | 购入日期 |
| purchase_amount | DECIMAL | 购入金额 |
| depreciation_method | VARCHAR(50) | 折旧方法 |
| useful_life | INT | 使用年限 |
| accumulated_depreciation | DECIMAL | 累计折旧 |
| net_value | DECIMAL | 净值 |
| status | VARCHAR(20) | 状态 |

---

**版本**: 2.0.0
**最后更新**: 2026-08-14