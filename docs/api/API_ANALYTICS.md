# TOPEMS Analytics Service API Documentation

## 1. Service Overview

The Analytics service provides comprehensive business intelligence and data analytics capabilities for the TOPEMS platform. It aggregates data from various modules and provides insights, reports, and dashboards.

**Service Name**: `analytics`  
**Base Path**: `/api/analytics/v1`  
**Authentication**: Bearer Token (JWT)  
**Tenant Isolation**: Multi-tenant support with `tenant_id` header

---

## 2. Endpoints

### 2.1 Dashboard Analytics

#### 2.1.1 Get Overall Dashboard Statistics

```
GET /api/analytics/v1/dashboard/overview
```

**Description**: Get overall dashboard statistics including key metrics and KPIs

**Headers**:
| Name | Value | Required |
|------|-------|----------|
| Authorization | Bearer `token` | Yes |
| X-Tenant-ID | `tenant_id` | Yes |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total_revenue": 1250000.00,
    "total_orders": 450,
    "total_customers": 1250,
    "total_inventory": 8900,
    "revenue_growth": 12.5,
    "order_growth": 8.3,
    "customer_growth": 5.2,
    "inventory_turnover": 4.5,
    "active_users": 320,
    "pending_approvals": 25,
    "recent_orders": 15,
    "critical_alerts": 3
  }
}
```

#### 2.1.2 Get Module Analytics

```
GET /api/analytics/v1/dashboard/module/{module_code}
```

**Description**: Get analytics data for a specific module

**Path Parameters**:
| Name | Type | Description |
|------|------|-------------|
| module_code | string | Module code (erp, crm, mes, wms, scm, pm, qms, ehs, lims, srm, pdm, rs) |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "module_code": "erp",
    "module_name": "ERP",
    "metrics": {
      "total_orders": 230,
      "total_amount": 850000.00,
      "pending_orders": 45,
      "completed_orders": 185,
      "avg_order_value": 3695.65,
      "order_trend": [
        {"period": "2026-01", "value": 45},
        {"period": "2026-02", "value": 52},
        {"period": "2026-03", "value": 68},
        {"period": "2026-04", "value": 65}
      ]
    }
  }
}
```

### 2.2 Reporting Analytics

#### 2.2.1 Get Sales Analytics

```
GET /api/analytics/v1/reports/sales
```

**Description**: Get sales analytics and trends

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| start_date | string | Start date (YYYY-MM-DD) | Yes |
| end_date | string | End date (YYYY-MM-DD) | Yes |
| category | string | Product category filter | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total_sales": 450000.00,
    "total_quantity": 1250,
    "avg_unit_price": 360.00,
    "top_products": [
      {"product_id": "P001", "name": "Product A", "sales": 120000},
      {"product_id": "P002", "name": "Product B", "sales": 95000},
      {"product_id": "P003", "name": "Product C", "sales": 85000}
    ],
    "daily_trend": [
      {"date": "2026-04-01", "sales": 15000},
      {"date": "2026-04-02", "sales": 18000},
      {"date": "2026-04-03", "sales": 12000}
    ]
  }
}
```

#### 2.2.2 Get Inventory Analytics

```
GET /api/analytics/v1/reports/inventory
```

**Description**: Get inventory analytics

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total_items": 5200,
    "total_value": 1250000.00,
    "low_stock_count": 45,
    "over_stock_count": 23,
    "stock_turnover_rate": 3.8,
    "warehouse_distribution": [
      {"warehouse_id": "WH001", "name": "Main Warehouse", "count": 2800, "value": 720000},
      {"warehouse_id": "WH002", "name": "Regional Warehouse", "count": 1500, "value": 350000},
      {"warehouse_id": "WH003", "name": "Remote Warehouse", "count": 900, "value": 180000}
    ]
  }
}
```

#### 2.2.3 Get Purchase Analytics

```
GET /api/analytics/v1/reports/purchase
```

**Description**: Get purchase order analytics

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total_orders": 180,
    "total_amount": 680000.00,
    "pending_orders": 35,
    "completed_orders": 145,
    "supplier_performance": [
      {"supplier_id": "S001", "name": "Supplier A", "on_time_rate": 98.5, "quality_score": 95},
      {"supplier_id": "S002", "name": "Supplier B", "on_time_rate": 92.0, "quality_score": 88},
      {"supplier_id": "S003", "name": "Supplier C", "on_time_rate": 96.0, "quality_score": 92}
    ]
  }
}
```

### 2.3 Quality Analytics

#### 2.3.1 Get Quality Dashboard

```
GET /api/analytics/v1/quality/dashboard
```

**Description**: Get quality management analytics dashboard

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total_inspections": 1250,
    "pass_rate": 96.8,
    "fail_rate": 3.2,
    "total_nonconformities": 40,
    "open_nonconformities": 15,
    "closed_nonconformities": 25,
    "trend_data": [
      {"period": "2026-01", "pass_rate": 95.2, "fail_rate": 4.8},
      {"period": "2026-02", "pass_rate": 96.1, "fail_rate": 3.9},
      {"period": "2026-03", "pass_rate": 97.0, "fail_rate": 3.0},
      {"period": "2026-04", "pass_rate": 96.8, "fail_rate": 3.2}
    ]
  }
}
```

### 2.4 EHS Analytics

#### 2.4.1 Get EHS Dashboard

```
GET /api/analytics/v1/ehs/dashboard
```

**Description**: Get EHS (Environment, Health, Safety) analytics dashboard

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total_risk_assessments": 85,
    "high_risk_count": 12,
    "medium_risk_count": 35,
    "low_risk_count": 38,
    "total_hazards": 56,
    "total_accidents": 8,
    "near_miss_count": 23,
    "training_completion_rate": 92.5,
    "incident_trend": [
      {"period": "2026-01", "accidents": 3, "near_misses": 8},
      {"period": "2026-02", "accidents": 2, "near_misses": 5},
      {"period": "2026-03", "accidents": 2, "near_misses": 6},
      {"period": "2026-04", "accidents": 1, "near_misses": 4}
    ]
  }
}
```

### 2.5 LIMS Analytics

#### 2.5.1 Get LIMS Dashboard

```
GET /api/analytics/v1/lims/dashboard
```

**Description**: Get LIMS (Laboratory Information Management System) analytics

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total_samples": 2450,
    "completed_samples": 2300,
    "pending_samples": 150,
    "avg_turnaround_time": 2.3,
    "test_methods": 85,
    "instrument_utilization": 78.5,
    "sample_type_distribution": [
      {"type": "Raw Material", "count": 850},
      {"type": "Finished Goods", "count": 720},
      {"type": "In-Process", "count": 580},
      {"type": "Environmental", "count": 300}
    ]
  }
}
```

### 2.6 RS Analytics

#### 2.6.1 Get Resource Analytics

```
GET /api/analytics/v1/rs/dashboard
```

**Description**: Get resource scheduling analytics

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total_resources": 125,
    "utilized_resources": 98,
    "available_resources": 27,
    "overall_utilization_rate": 78.4,
    "resource_type_distribution": [
      {"type": "Machine", "count": 45, "utilization": 85.2},
      {"type": "Labor", "count": 60, "utilization": 72.5},
      {"type": "Equipment", "count": 20, "utilization": 88.0}
    ],
    "peak_hours": [8, 9, 10, 14, 15, 16]
  }
}
```

### 2.7 SRM Analytics

#### 2.7.1 Get Supplier Analytics

```
GET /api/analytics/v1/srm/dashboard
```

**Description**: Get supplier relationship management analytics

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total_suppliers": 85,
    "active_suppliers": 72,
    "onboarded_suppliers": 13,
    "supplier_score_avg": 88.5,
    "contract_value_total": 2500000.00,
    "expiring_contracts": 5,
    "supplier_category_distribution": [
      {"category": "Raw Material", "count": 35},
      {"category": "Equipment", "count": 20},
      {"category": "Services", "count": 15},
      {"category": "Packaging", "count": 15}
    ]
  }
}
```

### 2.8 PDM Analytics

#### 2.8.1 Get Product Analytics

```
GET /api/analytics/v1/pdm/dashboard
```

**Description**: Get product data management analytics

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total_products": 520,
    "active_products": 485,
    "obsolete_products": 35,
    "total_documents": 2450,
    "document_review_pending": 85,
    "change_notices": 125,
    "active_change_notices": 35,
    "product_category_distribution": [
      {"category": "Electronics", "count": 180},
      {"category": "Mechanical", "count": 150},
      {"category": "Software", "count": 120},
      {"category": "Accessories", "count": 70}
    ]
  }
}
```

---

## 3. Data Models

### 3.1 DashboardOverview
```typescript
interface DashboardOverview {
  total_revenue: number;
  total_orders: number;
  total_customers: number;
  total_inventory: number;
  revenue_growth: number;
  order_growth: number;
  customer_growth: number;
  inventory_turnover: number;
  active_users: number;
  pending_approvals: number;
  recent_orders: number;
  critical_alerts: number;
}
```

### 3.2 ModuleAnalytics
```typescript
interface ModuleAnalytics {
  module_code: string;
  module_name: string;
  metrics: Record<string, any>;
}
```

### 3.3 SalesReport
```typescript
interface SalesReport {
  total_sales: number;
  total_quantity: number;
  avg_unit_price: number;
  top_products: Array<{ product_id: string; name: string; sales: number }>;
  daily_trend: Array<{ date: string; sales: number }>;
}
```

---

## 4. Error Responses

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | BAD_REQUEST | Invalid request parameters |
| 401 | UNAUTHORIZED | Authentication failed |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 500 | INTERNAL_ERROR | Server error |

---

## 5. Rate Limiting

| Endpoint | Rate Limit |
|----------|------------|
| `/dashboard/*` | 60 requests/minute |
| `/reports/*` | 30 requests/minute |
| `/quality/*` | 30 requests/minute |
| `/ehs/*` | 30 requests/minute |
| `/lims/*` | 30 requests/minute |
| `/rs/*` | 30 requests/minute |
| `/srm/*` | 30 requests/minute |
| `/pdm/*` | 30 requests/minute |