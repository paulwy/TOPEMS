# TOPEMS-FINANCE 财务管理服务 API 文档

**版本**: v2
**更新日期**: 2026-08-14
**服务地址**: `http://localhost:8012`

---

> **API 路径**: `/api/finance/`

## 目录

1. [服务概述](#1-服务概述)
2. [科目管理 API](#2-科目管理-api)
3. [凭证管理 API](#3-凭证管理-api)
4. [账务处理 API](#4-账务处理-api)
5. [报表 API](#5-报表-api)
6. [银行账户 API](#6-银行账户-api)
7. [往来账 API](#7-往来账-api)
8. [预算管理 API](#8-预算管理-api)
9. [健康检查 API](#9-健康检查-api)

---

## 1. 服务概述

TOPEMS-FINANCE 是财务管理系统，提供科目管理、凭证处理、账务核算、财务报表等功能。

### 1.1 认证方式

```
Authorization: Bearer <token>
```

---

## 2. 科目管理 API

### 2.1 获取科目列表

```
GET /api/finance/accounts?page=1&page_size=20&parent_id=1000
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "code": "1001",
        "name": "库存现金",
        "parent_id": "1000",
        "level": 2,
        "type": "asset",
        "balance": 100000.00
      }
    ],
    "total": 500
  }
}
```

### 2.2 创建科目

```
POST /api/finance/accounts
```

**请求体**：

```json
{
  "code": "1001",
  "name": "库存现金",
  "parent_id": "1000",
  "type": "asset",
  "description": "库存现金"
}
```

---

## 3. 凭证管理 API

### 3.1 获取凭证列表

```
GET /api/finance/vouchers?page=1&page_size=20&period=2026-08
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "voucher_no": "VOU202608001",
        "date": "2026-08-14",
        "total_debit": 10000.00,
        "total_credit": 10000.00,
        "status": "approved",
        "created_by": "uuid"
      }
    ],
    "total": 100
  }
}
```

### 3.2 创建凭证

```
POST /api/finance/vouchers
```

**请求体**：

```json
{
  "voucher_no": "VOU202608001",
  "date": "2026-08-14",
  "description": "采购付款",
  "entries": [
    { "account_id": "uuid1", "debit": 10000.00, "credit": 0.00, "description": "应付账款" },
    { "account_id": "uuid2", "debit": 0.00, "credit": 10000.00, "description": "银行存款" }
  ]
}
```

### 3.3 审核凭证

```
POST /api/finance/vouchers/{id}/approve
```

---

## 4. 账务处理 API

### 4.1 获取总账

```
GET /api/finance/general-ledger?period=2026-08&account_code=1001
```

### 4.2 获取明细账

```
GET /api/finance/sub-ledger?account_id=uuid&period=2026-08
```

### 4.3 期末结账

```
POST /api/finance/period-close
```

**请求体**：

```json
{
  "period": "2026-08",
  "close_by": "uuid"
}
```

---

## 5. 报表 API

### 5.1 获取资产负债表

```
GET /api/finance/reports/balance-sheet?period=2026-08
```

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
      "total": 3000000.00
    },
    "equity": {
      "total": 12000000.00
    }
  }
}
```

### 5.2 获取利润表

```
GET /api/finance/reports/profit-statement?period=2026-08
```

### 5.3 获取现金流量表

```
GET /api/finance/reports/cash-flow?period=2026-08
```

### 5.4 获取科目余额表

```
GET /api/finance/reports/trial-balance?period=2026-08
```

---

## 6. 银行账户 API

### 6.1 获取银行账户列表

```
GET /api/finance/bank-accounts?page=1&page_size=20
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "bank_name": "工商银行",
        "account_no": "622202XXXXXXXXXXXX1234",
        "account_name": "TOPEMS科技有限公司",
        "balance": 5000000.00,
        "currency": "CNY"
      }
    ],
    "total": 10
  }
}
```

### 6.2 创建银行账户

```
POST /api/finance/bank-accounts
```

**请求体**：

```json
{
  "bank_name": "工商银行",
  "account_no": "622202XXXXXXXXXXXX1234",
  "account_name": "TOPEMS科技有限公司",
  "currency": "CNY"
}
```

---

## 7. 往来账 API

### 7.1 获取应收账款

```
GET /api/finance/accounts-receivable?page=1&page_size=20&status=overdue
```

**响应示例**：

```json
{
  "code": 200,
  "data": {
    "items": [
      {
        "id": "uuid",
        "customer_id": "uuid",
        "customer_name": "客户名称",
        "amount": 50000.00,
        "due_date": "2026-07-31",
        "status": "overdue",
        "days_overdue": 14
      }
    ],
    "total": 20
  }
}
```

### 7.2 获取应付账款

```
GET /api/finance/accounts-payable?page=1&page_size=20
```

---

## 8. 预算管理 API

### 8.1 获取预算列表

```
GET /api/finance/budgets?page=1&page_size=20&period=2026-08
```

### 8.2 创建预算

```
POST /api/finance/budgets
```

**请求体**：

```json
{
  "period": "2026-08",
  "department_id": "uuid",
  "account_id": "uuid",
  "budget_amount": 100000.00,
  "actual_amount": 85000.00
}
```

---

## 9. 健康检查 API

### 9.1 基础健康检查

```
GET /health
```

---

**版本**: 2.0.0
**最后更新**: 2026-08-14