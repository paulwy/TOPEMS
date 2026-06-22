# TOPEMS 供应商管理系统 API

**服务**: topems-srm
**端口**: 8060
**版本**: v2

---

> **API 路径**: `/api/srm/` (例如 `/api/srm/suppliers`)
> **实际访问地址**: `http://localhost:8060/api/srm/`

## 1. 概述

供应商管理系统 API（SRM - Supplier Relationship Management）提供供应商信息管理、供应商评估、采购订单管理等功能。

### 1.1 API 端点总览

| 功能 | 端点 | 方法 |
|------|------|------|
| 供应商列表 | /api/srm/suppliers | GET |
| 供应商详情 | /api/srm/suppliers/{id} | GET |
| 创建供应商 | /api/srm/suppliers | POST |
| 更新供应商 | /api/srm/suppliers/{id} | PUT |
| 删除供应商 | /api/srm/suppliers/{id} | DELETE |
| 供应商评估列表 | /api/srm/supplier-evaluations | GET |
| 供应商评估详情 | /api/srm/supplier-evaluations/{id} | GET |
| 创建供应商评估 | /api/srm/supplier-evaluations | POST |
| 更新供应商评估 | /api/srm/supplier-evaluations/{id} | PUT |
| 删除供应商评估 | /api/srm/supplier-evaluations/{id} | DELETE |
| 采购订单列表 | /api/srm/purchase-orders | GET |
| 采购订单详情 | /api/srm/purchase-orders/{id} | GET |
| 创建采购订单 | /api/srm/purchase-orders | POST |
| 更新采购订单 | /api/srm/purchase-orders/{id} | PUT |
| 删除采购订单 | /api/srm/purchase-orders/{id} | DELETE |
| 健康检查 | /health | GET |

### 1.2 数据模型

#### Supplier（供应商）

```json
{
  "id": "supplier-001",
  "supplier_no": "SUP-2026-001",
  "name": "上海化工原料有限公司",
  "legal_name": "上海化工原料股份有限公司",
  "category": "原材料供应商",
  "status": "approved",
  "tax_id": "91310000XXXXXXXX",
  "address": "上海市浦东新区化工路100号",
  "contact_person": "李经理",
  "phone": "021-12345678",
  "email": "contact@shhg.com",
  "website": "https://www.shhg.com",
  "credit_rating": "A",
  "risk_level": "low",
  "created_at": "2026-05-20T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

#### SupplierEvaluation（供应商评估）

```json
{
  "id": "eval-001",
  "supplier_id": "supplier-001",
  "evaluation_no": "SE-2026-001",
  "evaluation_date": "2026-05-15",
  "evaluator": "采购部-王经理",
  "overall_score": 85,
  "quality_score": 90,
  "delivery_score": 80,
  "service_score": 85,
  "price_score": 82,
  "comments": "供应商质量稳定，交货及时，价格合理",
  "status": "completed",
  "created_at": "2026-05-15T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

#### PurchaseOrder（采购订单）

```json
{
  "id": "po-001",
  "po_no": "PO-2026-0522-001",
  "supplier_id": "supplier-001",
  "order_date": "2026-05-22",
  "expected_date": "2026-05-30",
  "actual_date": null,
  "total_amount": 50000.00,
  "currency": "CNY",
  "status": "pending",
  "remarks": "紧急订单",
  "created_at": "2026-05-22T10:00:00Z",
  "updated_at": "2026-05-22T10:00:00Z"
}
```

---

## 2. 供应商管理接口

### 2.1 获取供应商列表

**端点**: `GET /api/srm/suppliers`

**描述**: 获取所有供应商

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码（默认1） |
| page_size | integer | 否 | 每页数量（默认20） |
| status | string | 否 | 供应商状态（pending, approved, suspended, rejected） |
| category | string | 否 | 供应商类别 |
| risk_level | string | 否 | 风险等级（low, medium, high） |

**请求示例**:

```bash
curl -X GET "http://localhost:8060/api/srm/suppliers?status=approved&category=原材料供应商" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": [
    {
      "id": "supplier-001",
      "supplier_no": "SUP-2026-001",
      "name": "上海化工原料有限公司",
      "category": "原材料供应商",
      "status": "approved",
      "contact_person": "李经理",
      "phone": "021-12345678",
      "credit_rating": "A",
      "risk_level": "low",
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    },
    {
      "id": "supplier-002",
      "supplier_no": "SUP-2026-002",
      "name": "北京设备贸易有限公司",
      "category": "设备供应商",
      "status": "approved",
      "contact_person": "张经理",
      "phone": "010-87654321",
      "credit_rating": "B",
      "risk_level": "medium",
      "created_at": "2026-05-20T10:00:00Z",
      "updated_at": "2026-05-22T10:00:00Z"
    }
  ],
  "error": null
}
```

---

### 2.2 获取供应商详情

**端点**: `GET /api/srm/suppliers/{id}`

**描述**: 获取指定供应商的详细信息

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 供应商 ID |

**请求示例**:

```bash
curl -X GET http://localhost:8060/api/srm/suppliers/supplier-001 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "supplier-001",
    "supplier_no": "SUP-2026-001",
    "name": "上海化工原料有限公司",
    "legal_name": "上海化工原料股份有限公司",
    "category": "原材料供应商",
    "status": "approved",
    "tax_id": "91310000XXXXXXXX",
    "address": "上海市浦东新区化工路100号",
    "contact_person": "李经理",
    "phone": "021-12345678",
    "email": "contact@shhg.com",
    "website": "https://www.shhg.com",
    "credit_rating": "A",
    "risk_level": "low",
    "created_at": "2026-05-20T10:00:00Z",
    "updated_at": "2026-05-22T10:00:00Z"
  },
  "error": null
}
```

---

### 2.3 创建供应商

**端点**: `POST /api/srm/suppliers`

**描述**: 创建新的供应商记录

**认证**: 需要

**权限**: srm:supplier:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "supplier_no": "SUP-2026-001",
  "name": "上海化工原料有限公司",
  "legal_name": "上海化工原料股份有限公司",
  "category": "原材料供应商",
  "status": "pending",
  "tax_id": "91310000XXXXXXXX",
  "address": "上海市浦东新区化工路100号",
  "contact_person": "李经理",
  "phone": "021-12345678",
  "email": "contact@shhg.com",
  "website": "https://www.shhg.com",
  "credit_rating": "A",
  "risk_level": "low"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| supplier_no | string | 是 | 供应商编号（唯一） |
| name | string | 是 | 供应商名称 |
| legal_name | string | 否 | 法定名称 |
| category | string | 是 | 供应商类别 |
| status | string | 是 | 供应商状态 |
| tax_id | string | 否 | 税务登记号 |
| address | string | 否 | 地址 |
| contact_person | string | 否 | 联系人 |
| phone | string | 否 | 电话 |
| email | string | 否 | 邮箱 |
| website | string | 否 | 网站 |
| credit_rating | string | 否 | 信用评级 |
| risk_level | string | 是 | 风险等级（low, medium, high） |

**请求示例**:

```bash
curl -X POST http://localhost:8060/api/srm/suppliers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "supplier_no": "SUP-2026-001",
    "name": "上海化工原料有限公司",
    "legal_name": "上海化工原料股份有限公司",
    "category": "原材料供应商",
    "status": "pending",
    "tax_id": "91310000XXXXXXXX",
    "address": "上海市浦东新区化工路100号",
    "contact_person": "李经理",
    "phone": "021-12345678",
    "email": "contact@shhg.com",
    "risk_level": "low"
  }'
```

---

### 2.4 更新供应商

**端点**: `PUT /api/srm/suppliers/{id}`

**描述**: 更新指定供应商信息

**认证**: 需要

**权限**: srm:supplier:write

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 供应商 ID |

**请求体**:

```json
{
  "name": "上海化工原料有限公司",
  "legal_name": "上海化工原料股份有限公司",
  "category": "原材料供应商",
  "status": "approved",
  "contact_person": "李经理",
  "phone": "021-12345678",
  "email": "contact@shhg.com",
  "credit_rating": "A+",
  "risk_level": "low"
}
```

**请求示例**:

```bash
curl -X PUT http://localhost:8060/api/srm/suppliers/supplier-001 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "status": "approved",
    "credit_rating": "A+"
  }'
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": {
    "id": "supplier-001",
    "supplier_no": "SUP-2026-001",
    "name": "上海化工原料有限公司",
    "legal_name": "上海化工原料股份有限公司",
    "category": "原材料供应商",
    "status": "approved",
    "contact_person": "李经理",
    "phone": "021-12345678",
    "email": "contact@shhg.com",
    "credit_rating": "A+",
    "risk_level": "low",
    "created_at": "2026-05-20T10:00:00Z",
    "updated_at": "2026-05-22T11:00:00Z"
  },
  "error": null
}
```

---

### 2.5 删除供应商

**端点**: `DELETE /api/srm/suppliers/{id}`

**描述**: 删除指定供应商

**认证**: 需要

**权限**: srm:supplier:delete

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 供应商 ID |

**请求示例**:

```bash
curl -X DELETE http://localhost:8060/api/srm/suppliers/supplier-001 \
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

## 3. 供应商评估管理接口

### 3.1 获取供应商评估列表

**端点**: `GET /api/srm/supplier-evaluations`

**描述**: 获取所有供应商评估记录

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| supplier_id | string | 否 | 供应商 ID |
| status | string | 否 | 评估状态 |
| evaluation_date | string | 否 | 评估日期 |

---

### 3.2 获取供应商评估详情

**端点**: `GET /api/srm/supplier-evaluations/{id}`

**描述**: 获取指定供应商评估的详细信息

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 评估 ID |

---

### 3.3 创建供应商评估

**端点**: `POST /api/srm/supplier-evaluations`

**描述**: 创建新的供应商评估记录

**认证**: 需要

**权限**: srm:evaluation:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "supplier_id": "supplier-001",
  "evaluation_no": "SE-2026-001",
  "evaluator": "采购部-王经理",
  "overall_score": 85,
  "quality_score": 90,
  "delivery_score": 80,
  "service_score": 85,
  "price_score": 82,
  "comments": "供应商质量稳定，交货及时，价格合理",
  "status": "completed"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| supplier_id | string | 是 | 供应商 ID |
| evaluation_no | string | 是 | 评估编号（唯一） |
| evaluator | string | 否 | 评估人 |
| overall_score | number | 否 | 综合评分（0-100） |
| quality_score | number | 否 | 质量评分 |
| delivery_score | number | 否 | 交货评分 |
| service_score | number | 否 | 服务评分 |
| price_score | number | 否 | 价格评分 |
| comments | string | 否 | 评估备注 |
| status | string | 是 | 状态（draft, completed, cancelled） |

**请求示例**:

```bash
curl -X POST http://localhost:8060/api/srm/supplier-evaluations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "supplier_id": "supplier-001",
    "evaluation_no": "SE-2026-001",
    "evaluator": "采购部-王经理",
    "overall_score": 85,
    "quality_score": 90,
    "delivery_score": 80,
    "service_score": 85,
    "price_score": 82,
    "comments": "供应商质量稳定，交货及时，价格合理",
    "status": "completed"
  }'
```

---

### 3.4 更新供应商评估

**端点**: `PUT /api/srm/supplier-evaluations/{id}`

**描述**: 更新指定供应商评估

**认证**: 需要

**权限**: srm:evaluation:write

**请求体**:

```json
{
  "overall_score": 88,
  "quality_score": 92,
  "delivery_score": 82,
  "service_score": 88,
  "price_score": 85,
  "comments": "供应商质量稳定，交货及时，价格合理（续评）",
  "status": "completed"
}
```

---

### 3.5 删除供应商评估

**端点**: `DELETE /api/srm/supplier-evaluations/{id}`

**描述**: 删除指定供应商评估

**认证**: 需要

**权限**: srm:evaluation:delete

---

## 4. 采购订单管理接口

### 4.1 获取采购订单列表

**端点**: `GET /api/srm/purchase-orders`

**描述**: 获取所有采购订单

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| supplier_id | string | 否 | 供应商 ID |
| status | string | 否 | 订单状态 |
| order_date | string | 否 | 订单日期 |

---

### 4.2 获取采购订单详情

**端点**: `GET /api/srm/purchase-orders/{id}`

**描述**: 获取指定采购订单的详细信息

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 订单 ID |

---

### 4.3 创建采购订单

**端点**: `POST /api/srm/purchase-orders`

**描述**: 创建新的采购订单

**认证**: 需要

**权限**: srm:purchase:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "po_no": "PO-2026-0522-001",
  "supplier_id": "supplier-001",
  "expected_date": "2026-05-30",
  "total_amount": 50000.00,
  "currency": "CNY",
  "status": "pending",
  "remarks": "紧急订单"
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| po_no | string | 是 | 订单编号（唯一） |
| supplier_id | string | 是 | 供应商 ID |
| expected_date | string | 否 | 期望交付日期 |
| total_amount | number | 否 | 订单总额 |
| currency | string | 是 | 币种（CNY, USD, EUR） |
| status | string | 是 | 状态（draft, pending, approved, shipped, received, cancelled） |
| remarks | string | 否 | 备注 |

**请求示例**:

```bash
curl -X POST http://localhost:8060/api/srm/purchase-orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "po_no": "PO-2026-0522-001",
    "supplier_id": "supplier-001",
    "expected_date": "2026-05-30",
    "total_amount": 50000.00,
    "currency": "CNY",
    "status": "pending",
    "remarks": "紧急订单"
  }'
```

---

### 4.4 更新采购订单

**端点**: `PUT /api/srm/purchase-orders/{id}`

**描述**: 更新指定采购订单

**认证**: 需要

**权限**: srm:purchase:write

**请求体**:

```json
{
  "po_no": "PO-2026-0522-001",
  "supplier_id": "supplier-001",
  "expected_date": "2026-05-30",
  "total_amount": 50000.00,
  "currency": "CNY",
  "status": "approved",
  "remarks": "紧急订单"
}
```

---

### 4.5 删除采购订单

**端点**: `DELETE /api/srm/purchase-orders/{id}`

**描述**: 删除指定采购订单

**认证**: 需要

**权限**: srm:purchase:delete

---

## 5. 健康检查

### 5.1 检查服务状态

**端点**: `GET /health`

**描述**: 检查供应商管理系统的健康状态

**认证**: 不需要

**请求示例**:

```bash
curl -X GET http://localhost:8060/health
```

**成功响应** (200 OK):

```json
{
  "success": true,
  "data": "OK"
}
```

---

## 6. 错误代码

| 错误码 | HTTP 状态 | 说明 |
|--------|-----------|------|
| SUPPLIER_NOT_FOUND | 404 | 供应商不存在 |
| EVALUATION_NOT_FOUND | 404 | 供应商评估不存在 |
| PURCHASE_NOT_FOUND | 404 | 采购订单不存在 |
| DUPLICATE_NO | 409 | 编号已存在 |
| INVALID_STATUS | 400 | 无效的状态 |
| VALIDATION_ERROR | 400 | 数据验证失败 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 7. 供应商状态说明

| 状态 | 说明 |
|------|------|
| pending | 待审核 |
| approved | 已批准 |
| suspended | 已暂停 |
| rejected | 已拒绝 |
| blacklisted | 黑名单 |

---

## 8. 供应商类别说明

| 类别 | 说明 |
|------|------|
| 原材料供应商 | 原材料供应商 |
| 设备供应商 | 设备供应商 |
| 服务供应商 | 服务供应商 |
| 备件供应商 | 备件供应商 |
| 办公用品供应商 | 办公用品供应商 |
| 其他 | 其他供应商 |

---

## 9. 风险等级说明

| 等级 | 说明 |
|------|------|
| low | 低风险 |
| medium | 中风险 |
| high | 高风险 |

---

## 10. 信用评级说明

| 评级 | 说明 |
|------|------|
| AAA | 优秀 |
| AA | 优良 |
| A | 良好 |
| BBB | 一般 |
| BB | 欠佳 |
| B |较差 |

---

## 11. 订单状态说明

| 状态 | 说明 |
|------|------|
| draft | 草稿 |
| pending | 待审批 |
| approved | 已审批 |
| shipped | 已发货 |
| received | 已收货 |
| cancelled | 已取消 |

---

**版本历史**

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v2.1.0 | 2026-05-22 | 初始版本 |
