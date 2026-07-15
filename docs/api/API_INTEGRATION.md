> 🚨 路由版本过渡中：本文档描述路径含 /v1 为旧格式，新生产路径去掉 /v1。详见 [路由统一计划](../superpowers/plans/2026-07-15-route-unification-contract.md)

# TOPEMS Integration Service API Documentation

## 1. Service Overview

The Integration service provides external system integration capabilities for the TOPEMS platform, including webhook management, API connectors, data synchronization, and third-party system integration.

**Service Name**: `integration`  
**Base Path**: `/api/integration/v1`  
**Authentication**: Bearer Token (JWT) | API Key  
**Tenant Isolation**: Multi-tenant support with `tenant_id` header

---

## 2. Endpoints

### 2.1 Webhook Management

#### 2.1.1 Create Webhook

```
POST /api/integration/v1/webhooks
```

**Description**: Create a new webhook endpoint

**Request Body**:
```json
{
  "name": "Order Created Webhook",
  "url": "https://external-system.com/webhook/orders",
  "events": ["order.created", "order.updated", "order.completed"],
  "secret": "webhook-secret-key",
  "active": true,
  "headers": {
    "Authorization": "Bearer external-token"
  }
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "name": "Order Created Webhook",
    "url": "https://external-system.com/webhook/orders",
    "events": ["order.created", "order.updated", "order.completed"],
    "secret": "webhook-secret-key",
    "active": true,
    "webhook_key": "whk_abc123",
    "created_at": "2026-04-15T10:00:00Z"
  }
}
```

#### 2.1.2 List Webhooks

```
GET /api/integration/v1/webhooks
```

**Description**: Get list of webhooks

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| active | boolean | Filter by active status | No |
| page | number | Page number | No |
| size | number | Page size | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "webhooks": [
      {
        "id": "string",
        "name": "Order Created Webhook",
        "url": "https://external-system.com/webhook/orders",
        "events": ["order.created", "order.updated"],
        "active": true,
        "last_delivery_at": "2026-04-15T14:30:00Z",
        "success_count": 150,
        "fail_count": 2
      }
    ],
    "pagination": {
      "page": 1,
      "size": 20,
      "total": 15,
      "total_pages": 1
    }
  }
}
```

#### 2.1.3 Get Webhook

```
GET /api/integration/v1/webhooks/{id}
```

**Description**: Get webhook details

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "name": "Order Created Webhook",
    "url": "https://external-system.com/webhook/orders",
    "events": ["order.created", "order.updated", "order.completed"],
    "secret": "webhook-secret-key",
    "active": true,
    "headers": { "Authorization": "Bearer external-token" },
    "created_at": "2026-04-15T10:00:00Z",
    "updated_at": "2026-04-15T10:00:00Z"
  }
}
```

#### 2.1.4 Update Webhook

```
PUT /api/integration/v1/webhooks/{id}
```

**Description**: Update webhook configuration

**Request Body**:
```json
{
  "name": "Updated Webhook",
  "url": "https://new-url.com/webhook",
  "events": ["order.created"],
  "active": false
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "name": "Updated Webhook",
    "url": "https://new-url.com/webhook",
    "events": ["order.created"],
    "active": false
  }
}
```

#### 2.1.5 Delete Webhook

```
DELETE /api/integration/v1/webhooks/{id}
```

**Description**: Delete webhook

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

#### 2.1.6 Test Webhook

```
POST /api/integration/v1/webhooks/{id}/test
```

**Description**: Send a test event to the webhook

**Request Body**:
```json
{
  "event": "order.created",
  "payload": {
    "order_id": "test-order-001",
    "amount": 1000.00
  }
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "status": "success",
    "status_code": 200,
    "response_time": 150,
    "response_body": "{\"received\": true}"
  }
}
```

#### 2.1.7 Get Webhook Delivery Logs

```
GET /api/integration/v1/webhooks/{id}/logs
```

**Description**: Get webhook delivery logs

**Query Parameters**:
| Name | Type | Description | Required |
|------|------|-------------|----------|
| status | string | Filter by status (success/failed) | No |
| page | number | Page number | No |
| size | number | Page size | No |

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "logs": [
      {
        "id": "string",
        "event": "order.created",
        "status": "success",
        "status_code": 200,
        "response_time": 150,
        "attempts": 1,
        "delivered_at": "2026-04-15T14:30:00Z"
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

### 2.2 API Keys

#### 2.2.1 Create API Key

```
POST /api/integration/v1/api-keys
```

**Description**: Create an API key for external integration

**Request Body**:
```json
{
  "name": "External System API Key",
  "permissions": ["read:orders", "write:orders", "read:inventory"],
  "expires_at": "2027-04-15T00:00:00Z",
  "ip_whitelist": ["192.168.1.0/24", "10.0.0.0/8"]
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "name": "External System API Key",
    "api_key": "sk_abc123def456",
    "permissions": ["read:orders", "write:orders", "read:inventory"],
    "expires_at": "2027-04-15T00:00:00Z",
    "ip_whitelist": ["192.168.1.0/24", "10.0.0.0/8"],
    "created_at": "2026-04-15T10:00:00Z"
  }
}
```

#### 2.2.2 List API Keys

```
GET /api/integration/v1/api-keys
```

**Description**: Get list of API keys

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": "string",
      "name": "External System API Key",
      "permissions": ["read:orders", "write:orders"],
      "active": true,
      "expires_at": "2027-04-15T00:00:00Z",
      "last_used_at": "2026-04-15T14:30:00Z",
      "usage_count": 1250
    }
  ]
}
```

#### 2.2.3 Revoke API Key

```
POST /api/integration/v1/api-keys/{id}/revoke
```

**Description**: Revoke an API key

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "active": false,
    "revoked_at": "2026-04-15T15:00:00Z"
  }
}
```

### 2.3 Connectors

#### 2.3.1 List Available Connectors

```
GET /api/integration/v1/connectors/available
```

**Description**: Get list of available connectors

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "type": "sap",
      "name": "SAP ERP",
      "description": "Connect to SAP ERP system",
      "icon": "sap",
      "version": "1.0",
      "supported_features": ["import_orders", "export_inventory", "sync_customers"]
    },
    {
      "type": "salesforce",
      "name": "Salesforce",
      "description": "Connect to Salesforce CRM",
      "icon": "salesforce",
      "version": "1.0",
      "supported_features": ["import_leads", "export_customers", "sync_opportunities"]
    },
    {
      "type": "wechat",
      "name": "WeChat Work",
      "description": "Connect to WeChat Work",
      "icon": "wechat",
      "version": "1.0",
      "supported_features": ["send_messages", "sync_contacts", "approve_tasks"]
    },
    {
      "type": "dingtalk",
      "name": "DingTalk",
      "description": "Connect to DingTalk",
      "icon": "dingtalk",
      "version": "1.0",
      "supported_features": ["send_messages", "sync_contacts", "approve_tasks"]
    }
  ]
}
```

#### 2.3.2 Create Connector Instance

```
POST /api/integration/v1/connectors
```

**Description**: Create a connector instance

**Request Body**:
```json
{
  "type": "wechat",
  "name": "WeChat Work Connector",
  "config": {
    "corp_id": "ww1234567890",
    "corp_secret": "secret-abc123",
    "agent_id": 100001
  },
  "active": true
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "type": "wechat",
    "name": "WeChat Work Connector",
    "config": { "corp_id": "ww1234567890", "agent_id": 100001 },
    "active": true,
    "connected_at": "2026-04-15T10:00:00Z"
  }
}
```

#### 2.3.3 Test Connector

```
POST /api/integration/v1/connectors/{id}/test
```

**Description**: Test connector connection

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "status": "connected",
    "response_time": 200,
    "details": {
      "corp_name": "Company Name",
      "agent_name": "TOPEMS Integration"
    }
  }
}
```

### 2.4 Data Sync

#### 2.4.1 Create Sync Task

```
POST /api/integration/v1/sync/tasks
```

**Description**: Create a data synchronization task

**Request Body**:
```json
{
  "name": "Sync Orders from External System",
  "source_connector_id": "string",
  "target_module": "erp",
  "sync_type": "orders",
  "schedule": "cron",
  "cron_expression": "0 * * * *",
  "mapping": {
    "external_order_id": "order_code",
    "external_amount": "total_amount",
    "external_customer": "customer_name"
  },
  "active": true
}
```

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "name": "Sync Orders from External System",
    "source_connector_id": "string",
    "target_module": "erp",
    "sync_type": "orders",
    "schedule": "cron",
    "cron_expression": "0 * * * *",
    "active": true,
    "created_at": "2026-04-15T10:00:00Z"
  }
}
```

#### 2.4.2 Run Sync Task

```
POST /api/integration/v1/sync/tasks/{id}/run
```

**Description**: Manually run a sync task

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "task_id": "string",
    "status": "running",
    "started_at": "2026-04-15T15:00:00Z"
  }
}
```

#### 2.4.3 Get Sync Task Status

```
GET /api/integration/v1/sync/tasks/{id}/status
```

**Description**: Get sync task status and history

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": "string",
    "name": "Sync Orders from External System",
    "status": "completed",
    "last_run_at": "2026-04-15T15:00:00Z",
    "last_run_result": {
      "status": "success",
      "records_processed": 150,
      "records_created": 120,
      "records_updated": 30,
      "errors": 0,
      "duration": 1200
    },
    "run_history": [
      {
        "run_id": "string",
        "status": "success",
        "records_processed": 150,
        "started_at": "2026-04-15T15:00:00Z",
        "completed_at": "2026-04-15T15:02:00Z"
      }
    ]
  }
}
```

### 2.5 Events

#### 2.5.1 List Available Events

```
GET /api/integration/v1/events
```

**Description**: Get list of available events for webhooks

**Response**:
```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "event": "order.created",
      "name": "Order Created",
      "description": "Triggered when a new order is created",
      "module": "erp",
      "payload_schema": {
        "type": "object",
        "properties": {
          "order_id": { "type": "string" },
          "order_code": { "type": "string" },
          "total_amount": { "type": "number" },
          "created_at": { "type": "string" }
        }
      }
    },
    {
      "event": "inventory.updated",
      "name": "Inventory Updated",
      "description": "Triggered when inventory is updated",
      "module": "wms",
      "payload_schema": {
        "type": "object",
        "properties": {
          "item_id": { "type": "string" },
          "quantity": { "type": "number" },
          "warehouse_id": { "type": "string" }
        }
      }
    },
    {
      "event": "approval.completed",
      "name": "Approval Completed",
      "description": "Triggered when an approval is completed",
      "module": "workflow",
      "payload_schema": {
        "type": "object",
        "properties": {
          "approval_id": { "type": "string" },
          "status": { "type": "string" },
          "approved_by": { "type": "string" }
        }
      }
    }
  ]
}
```

---

## 3. Data Models

### 3.1 Webhook
```typescript
interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  webhook_key: string;
  headers: Record<string, string>;
  active: boolean;
  created_at: string;
  updated_at: string;
}
```

### 3.2 ApiKey
```typescript
interface ApiKey {
  id: string;
  name: string;
  api_key: string;
  permissions: string[];
  active: boolean;
  expires_at: string;
  ip_whitelist: string[];
  created_at: string;
  last_used_at: string;
  usage_count: number;
}
```

### 3.3 SyncTask
```typescript
interface SyncTask {
  id: string;
  name: string;
  source_connector_id: string;
  target_module: string;
  sync_type: string;
  schedule: 'manual' | 'cron' | 'interval';
  cron_expression?: string;
  interval_seconds?: number;
  mapping: Record<string, string>;
  active: boolean;
  created_at: string;
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
| 409 | CONFLICT | Resource conflict |
| 500 | INTERNAL_ERROR | Server error |

---

## 5. Rate Limiting

| Endpoint | Rate Limit |
|----------|------------|
| `/webhooks` | 30 requests/minute |
| `/webhooks/*/test` | 10 requests/minute |
| `/api-keys` | 10 requests/minute |
| `/connectors` | 10 requests/minute |
| `/sync/*` | 10 requests/minute |