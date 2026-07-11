# TOPEMS-SCM 供应链管理服务 API 文档

**版本**: v2
**更新日期**: 2026-08-14
**服务地址**: `http://localhost:8040`

---

> **API 路径**: `/api/scm/`

## 目录

1. [服务概述](#1-服务概述)
2. [采购申请 API](#2-采购申请-api)
3. [供应商管理 API](#3-供应商管理-api)
4. [供应商准入 API](#4-供应商准入-api)
5. [供应商评估 API](#5-供应商评估-api)
6. [采购合同 API](#6-采购合同-api)
7. [价格对比 API](#7-价格对比-api)
8. [MRP 计划 API](#8-mrp-计划-api)
9. [入库检验 API](#9-入库检验-api)
10. [健康检查 API](#10-健康检查-api)

---

## 1. 服务概述

TOPEMS-SCM 是供应链管理系统，提供采购申请、供应商管理、供应商评估、采购合同、MRP计划等功能。

### 1.1 认证方式

```
Authorization: Bearer <token>
```

---

## 2. 采购申请 API

### 2.1 获取采购申请列表

```
GET /api/scm/purchase-requisitions?page=1&page_size=20&status=pending
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "req_no": "PR202608001",
        "department_id": "uuid",
        "department_name": "技术部",
        "total_amount": 50000.00,
        "status": "pending",
        "created_at": "2026-08-14"
      }
    ],
    "total": 30
  }
}
```

### 2.2 创建采购申请

```
POST /api/scm/purchase-requisitions
```

**请求体**：

```json
{
  "req_no": "PR202608001",
  "department_id": "uuid",
  "items": [
    {
      "material_id": "uuid",
      "quantity": 100,
      "unit": "件",
      "estimated_price": 500.00,
      "reason": "项目需求"
    }
  ]
}
```

### 2.3 审批采购申请

```
POST /api/scm/purchase-requisitions/{id}/approve
```

---

## 3. 供应商管理 API

### 3.1 获取供应商列表

```
GET /api/scm/suppliers?page=1&page_size=20&status=active
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "供应商名称",
        "code": "SUPP001",
        "category": "raw_material",
        "status": "active",
        "contact_person": "联系人",
        "contact_phone": "13800138000",
        "score": 90,
        "level": "A"
      }
    ],
    "total": 100
  }
}
```

### 3.2 创建供应商

```
POST /api/scm/suppliers
```

**请求体**：

```json
{
  "name": "供应商名称",
  "code": "SUPP001",
  "category": "raw_material",
  "contact_person": "联系人",
  "contact_phone": "13800138000",
  "contact_email": "contact@supplier.com",
  "address": "供应商地址"
}
```

---

## 4. 供应商准入 API

### 4.1 获取准入申请列表

```
GET /api/scm/supplier-admissions?page=1&page_size=20&status=pending
```

### 4.2 创建准入申请

```
POST /api/scm/supplier-admissions
```

**请求体**：

```json
{
  "supplier_id": "uuid",
  "documents": [
    { "type": "business_license", "url": "url" },
    { "type": "certification", "url": "url" }
  ],
  "reviewer_id": "uuid"
}
```

### 4.3 审核准入申请

```
POST /api/scm/supplier-admissions/{id}/review
```

**请求体**：

```json
{
  "approved": true,
  "remark": "符合要求",
  "reviewer_id": "uuid"
}
```

---

## 5. 供应商评估 API

### 5.1 获取评估记录

```
GET /api/scm/supplier-evaluations?page=1&page_size=20&supplier_id=uuid
```

### 5.2 创建评估

```
POST /api/scm/supplier-evaluations
```

**请求体**：

```json
{
  "supplier_id": "uuid",
  "period": "2026-Q3",
  "scores": {
    "quality": 90,
    "delivery": 85,
    "service": 88,
    "price": 82
  },
  "overall_score": 86.25,
  "level": "A",
  "evaluator_id": "uuid"
}
```

---

## 6. 采购合同 API

### 6.1 获取合同列表

```
GET /api/scm/purchase-contracts?page=1&page_size=20&status=active
```

### 6.2 创建合同

```
POST /api/scm/purchase-contracts
```

**请求体**：

```json
{
  "contract_no": "PC202608001",
  "supplier_id": "uuid",
  "start_date": "2026-08-01",
  "end_date": "2027-07-31",
  "total_amount": 500000.00,
  "terms": [
    { "name": "付款方式", "value": "月结30天" },
    { "name": "交货周期", "value": "7天" }
  ]
}
```

---

## 7. 价格对比 API

### 7.1 获取价格对比

```
GET /api/scm/price-comparison?material_id=uuid
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "material_id": "uuid",
    "material_name": "原材料A",
    "comparisons": [
      { "supplier_id": "uuid1", "price": 480.00, "delivery_days": 5 },
      { "supplier_id": "uuid2", "price": 500.00, "delivery_days": 3 },
      { "supplier_id": "uuid3", "price": 450.00, "delivery_days": 10 }
    ],
    "recommended": "uuid1"
  }
}
```

---

## 8. MRP 计划 API

### 8.1 获取 MRP 计划

```
GET /api/scm/mrp/plans?period=2026-08
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "period": "2026-08",
    "items": [
      {
        "material_id": "uuid",
        "material_name": "原材料A",
        "demand": 500,
        "on_hand": 100,
        "planned_order": 400,
        "supplier_id": "uuid"
      }
    ]
  }
}
```

### 8.2 生成 MRP 计划

```
POST /api/scm/mrp/generate
```

**请求体**：

```json
{
  "period": "2026-08",
  "include_safety_stock": true
}
```

---

## 9. 入库检验 API

### 9.1 获取检验记录

```
GET /api/scm/incoming-inspections?page=1&page_size=20&status=pending
```

### 9.2 创建检验记录

```
POST /api/scm/incoming-inspections
```

**请求体**：

```json
{
  "purchase_order_id": "uuid",
  "supplier_id": "uuid",
  "items": [
    {
      "material_id": "uuid",
      "sample_quantity": 5,
      "pass_quantity": 5,
      "result": "pass"
    }
  ],
  "inspector_id": "uuid"
}
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