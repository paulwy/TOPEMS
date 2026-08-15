> 🚨 路由版本过渡中：本文档描述路径含 /v1 为旧格式，新生产路径去掉 /v1。详见 [API 路径规范与渐进式统一方案](../architecture/api-path-standardization.md)

# TOPEMS Mobile Service API Documentation

## 1. Service Overview

The Mobile service provides mobile-optimized API endpoints for the TOPEMS platform, enabling native mobile applications to access core business functions with simplified responses and offline support.

**Service Name**: `mobile`  
**Base Path**: `/api/mobile/v1`  
**Authentication**: Bearer Token (JWT) | Mobile Token  
**Tenant Isolation**: Multi-tenant support with `tenant_id` header

---

## 2. Endpoints

### 2.1 Authentication

#### 2.1.1 Mobile Login

```
POST /api/mobile/v1/auth/login
```

**Description**: Authenticate mobile user

**Request Body**:
```json
{
  "username": "string",
  "password": "string",
  "device_id": "string",
  "device_type": "ios|android"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "access_token": "string",
    "refresh_token": "string",
    "token_type": "Bearer",
    "expires_in": 7200,
    "user": {
      "id": "string",
      "name": "string",
      "avatar": "string",
      "role": "string"
    }
  }
}
```

#### 2.1.2 Refresh Token

```
POST /api/mobile/v1/auth/refresh
```

**Description**: Refresh access token

**Request Body**:
```json
{
  "refresh_token": "string"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "access_token": "string",
    "refresh_token": "string",
    "expires_in": 7200
  }
}
```

### 2.2 Attendance

#### 2.2.1 Check In

```
POST /api/mobile/v1/attendance/check-in
```

**Description**: Record attendance check-in

**Request Body**:
```json
{
  "latitude": 31.2304,
  "longitude": 121.4737,
  "location_name": "Office",
  "check_in_time": "2026-04-15T08:30:00Z"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "status": "checked_in",
    "check_in_time": "2026-04-15T08:30:00Z",
    "location": "Office"
  }
}
```

#### 2.2.2 Check Out

```
POST /api/mobile/v1/attendance/check-out
```

**Description**: Record attendance check-out

**Request Body**:
```json
{
  "latitude": 31.2304,
  "longitude": 121.4737,
  "location_name": "Office",
  "check_out_time": "2026-04-15T17:30:00Z"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "status": "checked_out",
    "check_out_time": "2026-04-15T17:30:00Z",
    "work_hours": 9.0,
    "location": "Office"
  }
}
```

#### 2.2.3 Get Attendance History

```
GET /api/mobile/v1/attendance/history
```

**Description**: Get attendance records for a period

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| start_date | string | Start date (YYYY-MM-DD) | Yes |
| end_date | string | End date (YYYY-MM-DD) | Yes |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "records": [
      {
        "id": "string",
        "date": "2026-04-15",
        "check_in_time": "08:30",
        "check_out_time": "17:30",
        "work_hours": 9.0,
        "status": "normal"
      }
    ],
    "summary": {
      "total_days": 22,
      "total_hours": 198,
      "late_count": 2,
      "early_leave_count": 1
    }
  }
}
```

### 2.3 Inventory

#### 2.3.1 Get Inventory List

```
GET /api/mobile/v1/inventory
```

**Description**: Get inventory items for mobile

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| warehouse_id | string | Warehouse filter | No |
| keyword | string | Search keyword | No |
| page | number | Page number | No |
| size | number | Page size | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "string",
        "code": "ITEM001",
        "name": "Item Name",
        "quantity": 150,
        "unit": "pcs",
        "warehouse": "Main Warehouse",
        "location": "A-01-01",
        "status": "in_stock"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

#### 2.3.2 Scan Inventory

```
POST /api/mobile/v1/inventory/scan
```

**Description**: Scan barcode/QR code to update inventory

**Request Body**:
```json
{
  "barcode": "string",
  "location": "string",
  "quantity": 10
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "code": "ITEM001",
    "name": "Item Name",
    "current_quantity": 160,
    "previous_quantity": 150,
    "location": "A-01-01"
  }
}
```

### 2.4 Production

#### 2.4.1 Get Production Orders

```
GET /api/mobile/v1/production/orders
```

**Description**: Get production orders for mobile

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| status | string | Order status filter | No |
| page | number | Page number | No |
| size | number | Page size | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "orders": [
      {
        "id": "string",
        "code": "PO001",
        "product_name": "Product A",
        "target_quantity": 500,
        "completed_quantity": 320,
        "status": "in_progress",
        "due_date": "2026-04-20"
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 45,
      "total_pages": 3
    }
  }
}
```

#### 2.4.2 Update Production Progress

```
POST /api/mobile/v1/production/orders/{id}/progress
```

**Description**: Update production order progress

**Path Parameters**:
| Name | Type | Description |
|------|------|-------------|
| id | string | Production order ID |

**Request Body**:
```json
{
  "completed_quantity": 350,
  "work_center": "WC001",
  "operator_id": "string",
  "note": "string"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "code": "PO001",
    "completed_quantity": 350,
    "progress": 70,
    "status": "in_progress"
  }
}
```

### 2.5 Notifications

#### 2.5.1 Get Notifications

```
GET /api/mobile/v1/notifications
```

**Description**: Get user notifications

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| page | number | Page number | No |
| size | number | Page size | No |
| read | boolean | Filter by read status | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "notifications": [
      {
        "id": "string",
        "title": "string",
        "content": "string",
        "type": "approval|alert|system",
        "read": false,
        "created_at": "2026-04-15T10:30:00Z",
        "action_url": "/approval/123"
      }
    ],
    "unread_count": 5,
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 35,
      "total_pages": 2
    }
  }
}
```

#### 2.5.2 Mark as Read

```
POST /api/mobile/v1/notifications/{id}/read
```

**Description**: Mark notification as read

**Path Parameters**:
| Name | Type | Description |
|------|------|-------------|
| id | string | Notification ID |

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

### 2.6 Approvals

#### 2.6.1 Get Pending Approvals

```
GET /api/mobile/v1/approvals/pending
```

**Description**: Get pending approval tasks

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "approvals": [
      {
        "id": "string",
        "code": "APP001",
        "type": "purchase_order|leave_request|expense",
        "title": "Purchase Order Approval",
        "applicant": "John Doe",
        "created_at": "2026-04-15T09:00:00Z",
        "due_date": "2026-04-16T09:00:00Z"
      }
    ],
    "count": 5
  }
}
```

#### 2.6.2 Approve Task

```
POST /api/mobile/v1/approvals/{id}/approve
```

**Description**: Approve an approval task

**Path Parameters**:
| Name | Type | Description |
|------|------|-------------|
| id | string | Approval task ID |

**Request Body**:
```json
{
  "comment": "Approved",
  "approval_time": "2026-04-15T10:30:00Z"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "status": "approved"
  }
}
```

#### 2.6.3 Reject Task

```
POST /api/mobile/v1/approvals/{id}/reject
```

**Description**: Reject an approval task

**Request Body**:
```json
{
  "comment": "Rejected due to budget constraints",
  "rejection_time": "2026-04-15T10:30:00Z"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "status": "rejected"
  }
}
```

### 2.7 Offline Sync

#### 2.7.1 Get Sync Data

```
GET /api/mobile/v1/offline/sync
```

**Description**: Get data for offline synchronization

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| last_sync_time | string | Last sync timestamp | Yes |
| modules | string | Comma-separated module codes | Yes |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sync_token": "string",
    "data": {
      "inventory": [...],
      "orders": [...],
      "approvals": [...]
    },
    "total_records": 150
  }
}
```

#### 2.7.2 Upload Offline Data

```
POST /api/mobile/v1/offline/upload
```

**Description**: Upload locally saved data when back online

**Request Body**:
```json
{
  "sync_token": "string",
  "data": {
    "attendance": [...],
    "inventory_scans": [...],
    "production_updates": [...]
  }
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "uploaded_count": 15,
    "failed_count": 0,
    "errors": []
  }
}
```

### 2.8 User Management

#### 2.8.1 Get User Profile

```
GET /api/mobile/v1/user/profile
```

**Description**: Get current user profile

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "name": "string",
    "username": "string",
    "email": "string",
    "phone": "string",
    "avatar": "string",
    "department_id": "string",
    "department_name": "string",
    "role": "string",
    "status": "active|inactive|locked"
  }
}
```

#### 2.8.2 Update User Profile

```
PUT /api/mobile/v1/user/profile
```

**Description**: Update user profile

**Request Body**:
```json
{
  "name": "string",
  "avatar": "string",
  "phone": "string"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "name": "string",
    "avatar": "string",
    "phone": "string"
  }
}
```

#### 2.8.3 Change Password

```
POST /api/mobile/v1/user/change-password
```

**Description**: Change user password

**Request Body**:
```json
{
  "old_password": "string",
  "new_password": "string"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

#### 2.8.4 Get User by ID

```
GET /api/mobile/v1/user/{id}
```

**Description**: Get user by ID

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "name": "string",
    "username": "string",
    "email": "string",
    "phone": "string",
    "department_name": "string",
    "role": "string",
    "status": "active|inactive|locked"
  }
}
```

#### 2.8.5 Get Users

```
GET /api/mobile/v1/user
```

**Description**: Get users with pagination

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| page | number | Page number | No |
| page_size | number | Page size | No |
| keyword | string | Search keyword | No |
| department_id | string | Department filter | No |
| status | string | Status filter | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [...],
    "total": 100
  }
}
```

### 2.9 Task Management

#### 2.9.1 Get Tasks

```
GET /api/mobile/v1/task
```

**Description**: Get tasks with filters

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| page | number | Page number | No |
| page_size | number | Page size | No |
| status | string | Task status | No |
| priority | string | Task priority | No |
| type | string | Task type | No |
| assignee_id | string | Assignee ID | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "string",
        "title": "string",
        "description": "string",
        "task_type": "string",
        "priority": "low|medium|high|critical",
        "status": "pending|in_progress|completed|cancelled",
        "assignee_name": "string",
        "due_date": "2026-04-20"
      }
    ],
    "total": 50
  }
}
```

#### 2.9.2 Create Task

```
POST /api/mobile/v1/task
```

**Description**: Create a new task

**Request Body**:
```json
{
  "title": "string",
  "description": "string",
  "task_type": "string",
  "priority": "low|medium|high|critical",
  "assignee_id": "string",
  "due_date": "2026-04-20",
  "location_lat": 31.2304,
  "location_lng": 121.4737
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "title": "string",
    "status": "pending"
  }
}
```

#### 2.9.3 Update Task

```
PUT /api/mobile/v1/task/{id}
```

**Description**: Update task

**Request Body**:
```json
{
  "title": "string",
  "priority": "high",
  "status": "in_progress"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "title": "string",
    "status": "in_progress"
  }
}
```

#### 2.9.4 Complete Task

```
POST /api/mobile/v1/task/{id}/complete
```

**Description**: Mark task as completed

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "status": "completed",
    "completed_at": "2026-04-15T17:00:00Z"
  }
}
```

#### 2.9.5 Get My Tasks

```
GET /api/mobile/v1/task/my
```

**Description**: Get tasks assigned to current user

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| page | number | Page number | No |
| page_size | number | Page size | No |
| status | string | Task status | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [...],
    "total": 10
  }
}
```

#### 2.9.6 Get Pending Tasks

```
GET /api/mobile/v1/task/pending
```

**Description**: Get all pending tasks

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [...]
}
```

#### 2.9.7 Get Overdue Tasks

```
GET /api/mobile/v1/task/overdue
```

**Description**: Get all overdue tasks

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [...]
}
```

#### 2.9.8 Batch Update Status

```
POST /api/mobile/v1/task/batch/status
```

**Description**: Batch update task status

**Request Body**:
```json
{
  "ids": ["string", "string"],
  "status": "completed"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "success": 2,
    "failed": 0
  }
}
```

### 2.10 Schedule Management

#### 2.10.1 Get Events

```
GET /api/mobile/v1/schedule/events
```

**Description**: Get events with filters

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| page | number | Page number | No |
| page_size | number | Page size | No |
| start_date | string | Start date | No |
| end_date | string | End date | No |
| event_type | string | Event type | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "items": [
      {
        "id": "string",
        "title": "string",
        "start_time": "2026-04-15T09:00:00Z",
        "end_time": "2026-04-15T10:00:00Z",
        "location": "string",
        "event_type": "meeting",
        "organizer_name": "string"
      }
    ],
    "total": 20
  }
}
```

#### 2.10.2 Create Event

```
POST /api/mobile/v1/schedule/events
```

**Description**: Create a new event

**Request Body**:
```json
{
  "title": "string",
  "description": "string",
  "start_time": "2026-04-15T09:00:00Z",
  "end_time": "2026-04-15T10:00:00Z",
  "location": "string",
  "event_type": "meeting",
  "attendees": ["string", "string"]
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "title": "string"
  }
}
```

#### 2.10.3 Get Today Events

```
GET /api/mobile/v1/schedule/events/today
```

**Description**: Get today's events

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [...]
}
```

#### 2.10.4 Get Week Events

```
GET /api/mobile/v1/schedule/events/week
```

**Description**: Get week's events

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [...]
}
```

#### 2.10.5 Get Month Events

```
GET /api/mobile/v1/schedule/events/month?year=2026&month=4
```

**Description**: Get month's events

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| year | number | Year | Yes |
| month | number | Month (1-12) | Yes |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [...]
}
```

#### 2.10.6 Update Event Status

```
PUT /api/mobile/v1/schedule/events/{id}/status
```

**Description**: Update event status

**Request Body**:
```json
{
  "status": "accepted|declined|pending"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "status": "accepted"
  }
}
```

### 2.11 Device Management

#### 2.11.1 Register Device

```
POST /api/mobile/v1/device/register
```

**Description**: Register mobile device

**Request Body**:
```json
{
  "device_token": "string",
  "platform": "ios|android",
  "device_model": "string",
  "app_version": "string",
  "os_version": "string"
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "device_token": "string",
    "platform": "ios",
    "is_active": true
  }
}
```

#### 2.11.2 Get My Devices

```
GET /api/mobile/v1/device/my
```

**Description**: Get user's devices

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [...]
}
```

#### 2.11.3 Set Active Device

```
POST /api/mobile/v1/device/{id}/activate
```

**Description**: Set device as active

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "is_active": true
  }
}
```

#### 2.11.4 Disable Device

```
POST /api/mobile/v1/device/{id}/disable
```

**Description**: Disable device

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "is_active": false
  }
}
```

#### 2.11.5 Get Device Stats

```
GET /api/mobile/v1/device/stats
```

**Description**: Get device statistics

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total": 100,
    "active": 85,
    "ios": 45,
    "android": 55
  }
}
```

### 2.12 Dashboard

#### 2.12.1 Get Dashboard Stats

```
GET /api/mobile/v1/dashboard/stats
```

**Description**: Get dashboard statistics

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "total_tasks": 50,
    "completed_tasks": 30,
    "pending_tasks": 20,
    "overdue_tasks": 5,
    "today_events": 3,
    "pending_approvals": 8,
    "inventory_alerts": 2,
    "production_alerts": 1
  }
}
```

#### 2.12.2 Get Quick Actions

```
GET /api/mobile/v1/dashboard/quick-actions
```

**Description**: Get quick actions

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "string",
      "label": "string",
      "icon": "string",
      "action": "string",
      "badge": 5
    }
  ]
}
```

#### 2.12.3 Get Recent Activities

```
GET /api/mobile/v1/dashboard/activities?limit=10
```

**Description**: Get recent activities

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| limit | number | Maximum items | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "string",
      "type": "task",
      "title": "string",
      "description": "string",
      "time": "2026-04-15T10:30:00Z"
    }
  ]
}
```

#### 2.12.4 Get KPIs

```
GET /api/mobile/v1/dashboard/kpis?period=today
```

**Description**: Get KPIs by period

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| period | string | today|week|month|year | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "sales": {
      "value": 125000,
      "previous_value": 100000,
      "trend": "up",
      "trend_value": 25,
      "label": "销售额",
      "unit": "CNY"
    }
  }
}
```

#### 2.12.5 Get Charts

```
GET /api/mobile/v1/dashboard/charts?chart_type=tasks&period=week
```

**Description**: Get chart data

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| chart_type | string | tasks|attendance|inventory|production | Yes |
| period | string | Time period | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "labels": ["周一", "周二", "周三", "周四", "周五"],
    "datasets": [
      {
        "label": "完成任务",
        "data": [10, 15, 8, 12, 18],
        "color": "#10B981"
      }
    ]
  }
}
```

#### 2.12.6 Get Alerts

```
GET /api/mobile/v1/dashboard/alerts
```

**Description**: Get dashboard alerts

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "string",
      "type": "warning|error|info",
      "title": "string",
      "description": "string",
      "timestamp": "2026-04-15T10:00:00Z",
      "severity": "low|medium|high|critical"
    }
  ]
}
```

#### 2.12.7 Get Announcements

```
GET /api/mobile/v1/dashboard/announcements
```

**Description**: Get announcements

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "string",
      "title": "string",
      "content": "string",
      "type": "info|warning|important",
      "published_at": "2026-04-15T09:00:00Z",
      "read": false
    }
  ]
}
```

---

## 3. Data Models

### 3.1 MobileUser
```typescript
interface MobileUser {
  id: string;
  name: string;
  avatar: string;
  role: string;
}
```

### 3.2 AttendanceRecord
```typescript
interface AttendanceRecord {
  id: string;
  date: string;
  check_in_time: string;
  check_out_time: string;
  work_hours: number;
  status: 'normal' | 'late' | 'early_leave' | 'absent';
}
```

### 3.3 InventoryItem
```typescript
interface InventoryItem {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
  warehouse: string;
  location: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
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
| 409 | CONFLICT | Data conflict |
| 500 | INTERNAL_ERROR | Server error |

---

## 5. Rate Limiting

| Endpoint | Rate Limit |
|----------|------------|
| `/auth/*` | 10 requests/minute |
| `/attendance/*` | 30 requests/minute |
| `/inventory/*` | 60 requests/minute |
| `/production/*` | 30 requests/minute |
| `/notifications/*` | 30 requests/minute |
| `/approvals/*` | 30 requests/minute |
| `/offline/*` | 10 requests/minute |