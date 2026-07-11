# TOPEMS Portal Service API Documentation

## 1. Service Overview

The Portal service provides user portal capabilities for the TOPEMS platform, including dashboard customization, widget management, and personalized user experience.

**Service Name**: `portal`  
**Base Path**: `/api/portal/v1`  
**Authentication**: Bearer Token (JWT)  
**Tenant Isolation**: Multi-tenant support with `tenant_id` header

---

## 2. Endpoints

### 2.1 Dashboard Management

#### 2.1.1 Get User Dashboard

```
GET /api/portal/v1/dashboard
```

**Description**: Get user's personalized dashboard

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "name": "My Dashboard",
    "layout": "grid",
    "widgets": [
      {
        "id": "string",
        "type": "kpi_card",
        "title": "Total Revenue",
        "position": { "row": 0, "col": 0, "width": 2, "height": 1 },
        "config": { "metric": "revenue", "period": "month" },
        "data": { "value": 1250000, "trend": 12.5 }
      },
      {
        "id": "string",
        "type": "chart",
        "title": "Sales Trend",
        "position": { "row": 1, "col": 0, "width": 4, "height": 2 },
        "config": { "chart_type": "line", "data_source": "sales" },
        "data": { "labels": ["Jan", "Feb", "Mar", "Apr"], "values": [45000, 52000, 68000, 65000] }
      }
    ]
  }
}
```

#### 2.1.2 Update Dashboard Layout

```
PUT /api/portal/v1/dashboard
```

**Description**: Update dashboard layout and widgets

**Request Body**:
```json
{
  "name": "My Dashboard",
  "layout": "grid",
  "widgets": [
    {
      "id": "string",
      "type": "kpi_card",
      "title": "Total Revenue",
      "position": { "row": 0, "col": 0, "width": 2, "height": 1 },
      "config": { "metric": "revenue", "period": "month" }
    }
  ]
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "name": "My Dashboard",
    "widgets_count": 5
  }
}
```

### 2.2 Widget Management

#### 2.2.1 Get Available Widgets

```
GET /api/portal/v1/widgets/available
```

**Description**: Get list of available widget types

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "type": "kpi_card",
      "name": "KPI Card",
      "description": "Display key performance indicators",
      "icon": "bar-chart",
      "config_options": ["metric", "period", "comparison"]
    },
    {
      "type": "chart",
      "name": "Chart",
      "description": "Display data visualization charts",
      "icon": "pie-chart",
      "config_options": ["chart_type", "data_source", "time_range"]
    },
    {
      "type": "list",
      "name": "List",
      "description": "Display data lists",
      "icon": "list",
      "config_options": ["data_source", "limit", "sort"]
    },
    {
      "type": "calendar",
      "name": "Calendar",
      "description": "Display calendar and events",
      "icon": "calendar",
      "config_options": ["view_mode", "event_sources"]
    },
    {
      "type": "alert",
      "name": "Alert",
      "description": "Display notifications and alerts",
      "icon": "bell",
      "config_options": ["severity", "limit"]
    }
  ]
}
```

#### 2.2.2 Add Widget

```
POST /api/portal/v1/widgets
```

**Description**: Add a widget to dashboard

**Request Body**:
```json
{
  "type": "kpi_card",
  "title": "Total Orders",
  "position": { "row": 0, "col": 2, "width": 2, "height": 1 },
  "config": { "metric": "orders", "period": "month" }
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "type": "kpi_card",
    "title": "Total Orders",
    "position": { "row": 0, "col": 2, "width": 2, "height": 1 },
    "config": { "metric": "orders", "period": "month" }
  }
}
```

#### 2.2.3 Update Widget

```
PUT /api/portal/v1/widgets/{id}
```

**Description**: Update widget configuration

**Request Body**:
```json
{
  "title": "Updated Title",
  "position": { "row": 1, "col": 0, "width": 3, "height": 2 },
  "config": { "metric": "revenue", "period": "quarter" }
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "title": "Updated Title",
    "position": { "row": 1, "col": 0, "width": 3, "height": 2 },
    "config": { "metric": "revenue", "period": "quarter" }
  }
}
```

#### 2.2.4 Remove Widget

```
DELETE /api/portal/v1/widgets/{id}
```

**Description**: Remove widget from dashboard

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

### 2.3 Quick Actions

#### 2.3.1 Get Quick Actions

```
GET /api/portal/v1/quick-actions
```

**Description**: Get user's quick actions

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "string",
      "name": "Create Purchase Order",
      "icon": "shopping-cart",
      "action_url": "/erp/purchase-orders/create",
      "category": "erp"
    },
    {
      "id": "string",
      "name": "Check Inventory",
      "icon": "package",
      "action_url": "/wms/inventory",
      "category": "wms"
    },
    {
      "id": "string",
      "name": "Approve Tasks",
      "icon": "check-circle",
      "action_url": "/workflow/tasks",
      "category": "workflow"
    }
  ]
}
```

#### 2.3.2 Update Quick Actions

```
PUT /api/portal/v1/quick-actions
```

**Description**: Update user's quick actions

**Request Body**:
```json
{
  "actions": [
    { "name": "Create Purchase Order", "action_url": "/erp/purchase-orders/create", "category": "erp" },
    { "name": "Check Inventory", "action_url": "/wms/inventory", "category": "wms" }
  ]
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "count": 2
  }
}
```

### 2.4 Recent Activities

#### 2.4.1 Get Recent Activities

```
GET /api/portal/v1/activities
```

**Description**: Get user's recent activities

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| limit | number | Number of activities | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "string",
      "type": "order_created",
      "title": "Purchase Order Created",
      "description": "PO-2026-00123 created by John Doe",
      "timestamp": "2026-04-15T14:30:00Z",
      "action_url": "/erp/purchase-orders/PO-2026-00123",
      "icon": "file-text"
    },
    {
      "id": "string",
      "type": "approval_completed",
      "title": "Approval Completed",
      "description": "Your request for leave has been approved",
      "timestamp": "2026-04-15T13:45:00Z",
      "action_url": "/oa/leave/my-requests",
      "icon": "check-circle"
    }
  ]
}
```

### 2.5 User Preferences

#### 2.5.1 Get User Preferences

```
GET /api/portal/v1/preferences
```

**Description**: Get user preferences

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "theme": "light",
    "language": "zh-CN",
    "timezone": "Asia/Shanghai",
    "notifications": {
      "email": true,
      "push": true,
      "sms": false
    },
    "dashboard_auto_refresh": true,
    "refresh_interval": 300
  }
}
```

#### 2.5.2 Update User Preferences

```
PUT /api/portal/v1/preferences
```

**Description**: Update user preferences

**Request Body**:
```json
{
  "theme": "dark",
  "language": "zh-CN",
  "timezone": "Asia/Shanghai",
  "notifications": {
    "email": true,
    "push": true,
    "sms": false
  },
  "dashboard_auto_refresh": true,
  "refresh_interval": 300
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "theme": "dark",
    "language": "zh-CN",
    "timezone": "Asia/Shanghai"
  }
}
```

### 2.6 Announcements

#### 2.6.1 Get Announcements

```
GET /api/portal/v1/announcements
```

**Description**: Get system announcements

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "string",
      "title": "System Maintenance Notice",
      "content": "Scheduled maintenance on April 20, 2026 from 22:00 to 02:00",
      "type": "warning",
      "priority": "high",
      "start_date": "2026-04-15T00:00:00Z",
      "end_date": "2026-04-21T00:00:00Z",
      "read": false
    }
  ]
}
```

#### 2.6.2 Mark as Read

```
POST /api/portal/v1/announcements/{id}/read
```

**Description**: Mark announcement as read

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "read": true
  }
}
```

---

## 3. Data Models

### 3.1 Dashboard
```typescript
interface Dashboard {
  id: string;
  name: string;
  layout: 'grid' | 'list';
  widgets: Widget[];
}
```

### 3.2 Widget
```typescript
interface Widget {
  id: string;
  type: 'kpi_card' | 'chart' | 'list' | 'calendar' | 'alert';
  title: string;
  position: { row: number; col: number; width: number; height: number };
  config: Record<string, any>;
  data?: Record<string, any>;
}
```

### 3.3 UserPreferences
```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  dashboard_auto_refresh: boolean;
  refresh_interval: number;
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
| `/dashboard` | 30 requests/minute |
| `/widgets/*` | 30 requests/minute |
| `/activities` | 30 requests/minute |
| `/preferences` | 10 requests/minute |
| `/announcements` | 30 requests/minute |