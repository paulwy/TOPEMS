# TOPEMS-CRM 客户关系管理服务 API 文档

**版本**: v2
**更新日期**: 2026-08-14
**服务地址**: `http://localhost:8029`

---

> **API 路径**: `/api/crm/`

## 目录

1. [服务概述](#1-服务概述)
2. [客户管理 API](#2-客户管理-api)
3. [联系人 API](#3-联系人-api)
4. [商机管理 API](#4-商机管理-api)
5. [销售漏斗 API](#5-销售漏斗-api)
6. [客户互动 API](#6-客户互动-api)
7. [客户评分 API](#7-客户评分-api)
8. [销售预测 API](#8-销售预测-api)
9. [健康检查 API](#9-健康检查-api)
10. [数据模型](#10-数据模型)

---

## 1. 服务概述

TOPEMS-CRM 是客户关系管理系统，提供客户管理、商机跟踪、销售预测、客户评分等功能。

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

---

## 2. 客户管理 API

### 2.1 获取客户列表

```
GET /api/crm/customers?page=1&page_size=20&status=active&industry=制造
```

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码 |
| page_size | int | 否 | 每页数量 |
| status | string | 否 | 状态 |
| industry | string | 否 | 行业 |
| search | string | 否 | 搜索关键词 |

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "客户名称",
        "code": "CUST001",
        "industry": "制造业",
        "type": "enterprise",
        "status": "active",
        "contact_phone": "13800138000",
        "total_deal_amount": 5000000.00,
        "last_contact_date": "2026-08-10"
      }
    ],
    "total": 200
  }
}
```

### 2.2 获取客户详情

```
GET /api/crm/customers/{id}
```

### 2.3 创建客户

```
POST /api/crm/customers
```

**请求体**：

```json
{
  "name": "客户名称",
  "code": "CUST001",
  "industry": "制造业",
  "type": "enterprise",
  "address": "客户地址",
  "contact_phone": "13800138000",
  "contact_email": "contact@company.com",
  "description": "客户描述"
}
```

### 2.4 更新客户

```
PUT /api/crm/customers/{id}
```

### 2.5 删除客户

```
DELETE /api/crm/customers/{id}
```

### 2.6 获取客户画像

```
GET /api/crm/customers/{id}/profile
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "customer_id": "uuid",
    "basic_info": { ... },
    "deal_history": [...],
    "interaction_history": [...],
    "score": 85,
    "health_status": "healthy"
  }
}
```

---

## 3. 联系人 API

### 3.1 获取联系人列表

```
GET /api/crm/contacts?page=1&page_size=20&customer_id=uuid
```

### 3.2 获取联系人详情

```
GET /api/crm/contacts/{id}
```

### 3.3 创建联系人

```
POST /api/crm/contacts
```

**请求体**：

```json
{
  "customer_id": "uuid",
  "name": "联系人姓名",
  "position": "采购经理",
  "phone": "13900139000",
  "email": "contact@customer.com",
  "wechat": "wechat_id"
}
```

### 3.4 更新联系人

```
PUT /api/crm/contacts/{id}
```

### 3.5 删除联系人

```
DELETE /api/crm/contacts/{id}
```

---

## 4. 商机管理 API

### 4.1 获取商机列表

```
GET /api/crm/opportunities?page=1&page_size=20&stage=proposal
```

**查询参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| page | int | 否 | 页码 |
| page_size | int | 否 | 每页数量 |
| stage | string | 否 | 阶段（lead/qualified/proposal/negotiation/closed_won/closed_lost） |
| customer_id | string | 否 | 客户ID |
| owner_id | string | 否 | 负责人ID |

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "商机名称",
        "customer_id": "uuid",
        "customer_name": "客户名称",
        "amount": 500000.00,
        "stage": "proposal",
        "probability": 60,
        "expected_close_date": "2026-09-30",
        "owner_id": "uuid",
        "owner_name": "负责人"
      }
    ],
    "total": 50
  }
}
```

### 4.2 获取商机详情

```
GET /api/crm/opportunities/{id}
```

### 4.3 创建商机

```
POST /api/crm/opportunities
```

**请求体**：

```json
{
  "name": "商机名称",
  "customer_id": "uuid",
  "amount": 500000.00,
  "stage": "lead",
  "probability": 20,
  "expected_close_date": "2026-09-30",
  "owner_id": "uuid",
  "description": "商机描述"
}
```

### 4.4 更新商机

```
PUT /api/crm/opportunities/{id}
```

### 4.5 删除商机

```
DELETE /api/crm/opportunities/{id}
```

### 4.6 推进商机阶段

```
POST /api/crm/opportunities/{id}/stage
```

**请求体**：

```json
{
  "stage": "proposal",
  "probability": 60,
  "reason": "客户已确认需求"
}
```

---

## 5. 销售漏斗 API

### 5.1 获取销售漏斗数据

```
GET /api/crm/sales-funnel?period=2026-08
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "period": "2026-08",
    "stages": [
      { "stage": "lead", "count": 100, "amount": 5000000.00 },
      { "stage": "qualified", "count": 60, "amount": 3500000.00 },
      { "stage": "proposal", "count": 30, "amount": 2000000.00 },
      { "stage": "negotiation", "count": 15, "amount": 1200000.00 },
      { "stage": "closed_won", "count": 8, "amount": 800000.00 }
    ],
    "conversion_rate": 8
  }
}
```

### 5.2 获取漏斗趋势

```
GET /api/crm/sales-funnel/trend?start_date=2026-01-01&end_date=2026-08-31
```

---

## 6. 客户互动 API

### 6.1 获取互动记录

```
GET /api/crm/interactions?page=1&page_size=20&customer_id=uuid
```

### 6.2 创建互动记录

```
POST /api/crm/interactions
```

**请求体**：

```json
{
  "customer_id": "uuid",
  "type": "call",
  "subject": "客户回访",
  "content": "客户反馈产品使用良好",
  "contact_id": "uuid",
  "result": "positive"
}
```

### 6.3 更新互动记录

```
PUT /api/crm/interactions/{id}
```

### 6.4 删除互动记录

```
DELETE /api/crm/interactions/{id}
```

---

## 7. 客户评分 API

### 7.1 获取客户评分

```
GET /api/crm/customer-scoring/{customer_id}
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "customer_id": "uuid",
    "score": 85,
    "level": "A",
    "dimensions": [
      { "name": "交易金额", "score": 90, "weight": 0.3 },
      { "name": "交易频率", "score": 80, "weight": 0.2 },
      { "name": "回款及时率", "score": 85, "weight": 0.3 },
      { "name": "满意度", "score": 88, "weight": 0.2 }
    ],
    "last_updated": "2026-08-14"
  }
}
```

### 7.2 重新计算评分

```
POST /api/crm/customer-scoring/{customer_id}/recalculate
```

### 7.3 获取评分规则

```
GET /api/crm/scoring-rules
```

### 7.4 更新评分规则

```
PUT /api/crm/scoring-rules
```

**请求体**：

```json
{
  "dimensions": [
    { "name": "交易金额", "weight": 0.3, "enabled": true },
    { "name": "交易频率", "weight": 0.2, "enabled": true },
    { "name": "回款及时率", "weight": 0.3, "enabled": true },
    { "name": "满意度", "weight": 0.2, "enabled": true }
  ],
  "level_thresholds": { "A": 80, "B": 60, "C": 40, "D": 0 }
}
```

---

## 8. 销售预测 API

### 8.1 获取销售预测

```
GET /api/crm/sales-forecast?period=2026-08
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "period": "2026-08",
    "forecast_amount": 2000000.00,
    "actual_amount": 1850000.00,
    "accuracy": 92.5,
    "trend": "up",
    "product_breakdown": [
      { "product": "产品A", "forecast": 800000.00, "actual": 750000.00 },
      { "product": "产品B", "forecast": 600000.00, "actual": 580000.00 }
    ],
    "region_breakdown": [
      { "region": "华东", "amount": 900000.00 },
      { "region": "华南", "amount": 550000.00 }
    ]
  }
}
```

### 8.2 获取预测趋势

```
GET /api/crm/sales-forecast/trend?start_date=2026-01-01&end_date=2026-12-31
```

### 8.3 生成预测

```
POST /api/crm/sales-forecast/generate
```

**请求体**：

```json
{
  "period": "2026-09",
  "method": "arima",
  "include_historical_data": true
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

### 10.1 Customer (客户)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organization_id | UUID | 组织ID |
| name | VARCHAR(255) | 客户名称 |
| code | VARCHAR(50) | 客户编码 |
| industry | VARCHAR(100) | 行业 |
| type | VARCHAR(20) | 类型（enterprise/small_business/individual） |
| status | VARCHAR(20) | 状态（active/inactive/blacklisted） |
| total_deal_amount | DECIMAL | 累计交易额 |
| last_contact_date | DATE | 最后联系日期 |

### 10.2 Opportunity (商机)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organization_id | UUID | 组织ID |
| name | VARCHAR(255) | 商机名称 |
| customer_id | UUID | 客户ID |
| amount | DECIMAL | 商机金额 |
| stage | VARCHAR(30) | 阶段 |
| probability | INT | 成功率(%) |
| expected_close_date | DATE | 预计成交日期 |
| owner_id | UUID | 负责人ID |

### 10.3 Interaction (互动记录)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| organization_id | UUID | 组织ID |
| customer_id | UUID | 客户ID |
| type | VARCHAR(30) | 类型（call/meeting/email/visit） |
| subject | VARCHAR(255) | 主题 |
| content | TEXT | 内容 |
| result | VARCHAR(20) | 结果（positive/neutral/negative） |

---

**版本**: 2.0.0
**最后更新**: 2026-08-14