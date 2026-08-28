# TOPEMS API 快速参考手册

## 概述

本文档是 TOPEMS 系统的 API 快速参考手册，列出所有主要 API 端点、请求方法、参数说明和使用示例，方便开发人员快速查阅和集成。

## 基础信息

### 基础 URL

| 环境 | URL |
|------|-----|
| 开发环境 | `http://localhost:8013/api/v1` |
| 测试环境 | `https://staging.topems.com/api/v1` |
| 生产环境 | `https://api.topems.com/api/v1` |

### 认证方式

所有 API 请求（除登录、健康检查等公共端点外）都需要在请求头中携带 JWT Token：

```
Authorization: Bearer <your-jwt-token>
Content-Type: application/json
```

### 通用响应格式

```json
{
  "code": 200,
  "success": true,
  "message": "操作成功",
  "data": {},
  "timestamp": 1693209600000
}
```

### 通用错误码

| 错误码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或 Token 过期 |
| 403 | 无权限访问 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

---

## 1. 认证 API

### 1.1 用户登录

- **URL**: `/auth/login`
- **方法**: `POST`
- **认证**: 不需要

**请求体**:
```json
{
  "username": "admin",
  "password": "your-password"
}
```

**响应**:
```json
{
  "code": 200,
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600,
    "user": {
      "id": "user-001",
      "username": "admin",
      "email": "admin@example.com",
      "full_name": "管理员"
    }
  }
}
```

### 1.2 用户登出

- **URL**: `/auth/logout`
- **方法**: `POST`
- **认证**: 需要

**请求体**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 1.3 刷新 Token

- **URL**: `/auth/refresh`
- **方法**: `POST`
- **认证**: 不需要

**请求体**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**响应**:
```json
{
  "code": 200,
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

### 1.4 获取当前用户信息

- **URL**: `/auth/me`
- **方法**: `GET`
- **认证**: 需要

**响应**:
```json
{
  "code": 200,
  "success": true,
  "data": {
    "id": "user-001",
    "username": "admin",
    "email": "admin@example.com",
    "full_name": "管理员",
    "roles": ["admin"],
    "permissions": ["*"]
  }
}
```

### 1.5 修改密码

- **URL**: `/auth/change-password`
- **方法**: `POST`
- **认证**: 需要

**请求体**:
```json
{
  "old_password": "old-password",
  "new_password": "new-password"
}
```

---

## 2. 用户管理 API

### 2.1 获取用户列表

- **URL**: `/users`
- **方法**: `GET`
- **认证**: 需要（管理员权限）

**查询参数**:
| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| page | int | 页码 | 1 |
| page_size | int | 每页数量 | 20 |
| keyword | string | 搜索关键词 | - |
| status | string | 状态筛选（active/inactive） | - |
| role_id | string | 角色筛选 | - |

**响应**:
```json
{
  "code": 200,
  "success": true,
  "data": {
    "items": [
      {
        "id": "user-001",
        "username": "admin",
        "email": "admin@example.com",
        "full_name": "管理员",
        "status": "active",
        "roles": ["admin"],
        "created_at": "2026-07-01T00:00:00Z"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 20
  }
}
```

### 2.2 创建用户

- **URL**: `/users`
- **方法**: `POST`
- **认证**: 需要（管理员权限）

**请求体**:
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "initial-password",
  "full_name": "新用户",
  "phone": "13800138000",
  "role_ids": ["role-001"],
  "department_id": "dept-001"
}
```

### 2.3 获取用户详情

- **URL**: `/users/{user_id}`
- **方法**: `GET`
- **认证**: 需要

### 2.4 更新用户

- **URL**: `/users/{user_id}`
- **方法**: `PUT`
- **认证**: 需要（管理员权限或本人）

**请求体**:
```json
{
  "email": "updated@example.com",
  "full_name": "更新后的名称",
  "phone": "13900139000"
}
```

### 2.5 删除用户

- **URL**: `/users/{user_id}`
- **方法**: `DELETE`
- **认证**: 需要（管理员权限）

### 2.6 禁用用户

- **URL**: `/users/{user_id}/disable`
- **方法**: `POST`
- **认证**: 需要（管理员权限）

### 2.7 启用用户

- **URL**: `/users/{user_id}/enable`
- **方法**: `POST`
- **认证**: 需要（管理员权限）

### 2.8 重置用户密码

- **URL**: `/users/{user_id}/reset-password`
- **方法**: `POST`
- **认证**: 需要（管理员权限）

**请求体**:
```json
{
  "new_password": "new-temp-password"
}
```

---

## 3. 角色管理 API

### 3.1 获取角色列表

- **URL**: `/roles`
- **方法**: `GET`
- **认证**: 需要（管理员权限）

### 3.2 创建角色

- **URL**: `/roles`
- **方法**: `POST`
- **认证**: 需要（管理员权限）

**请求体**:
```json
{
  "name": "部门经理",
  "code": "department_manager",
  "description": "部门经理角色",
  "permission_ids": ["perm-001", "perm-002"]
}
```

### 3.3 获取角色详情

- **URL**: `/roles/{role_id}`
- **方法**: `GET`
- **认证**: 需要

### 3.4 更新角色

- **URL**: `/roles/{role_id}`
- **方法**: `PUT`
- **认证**: 需要（管理员权限）

### 3.5 删除角色

- **URL**: `/roles/{role_id}`
- **方法**: `DELETE`
- **认证**: 需要（管理员权限）

### 3.6 分配角色权限

- **URL**: `/roles/{role_id}/permissions`
- **方法**: `PUT`
- **认证**: 需要（管理员权限）

**请求体**:
```json
{
  "permission_ids": ["perm-001", "perm-002", "perm-003"]
}
```

---

## 4. AI 对话 API

### 4.1 发送对话消息

- **URL**: `/ai/chat`
- **方法**: `POST`
- **认证**: 需要

**请求体**:
```json
{
  "session_id": "session-001",
  "message": "帮我查询最近的采购订单",
  "module": "erp",
  "stream": false
}
```

**参数说明**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| session_id | string | 否 | 会话 ID，不传则创建新会话 |
| message | string | 是 | 用户消息内容 |
| module | string | 否 | 业务模块（erp/finance/crm/wms/hr/oa/qms/scm/aps/ehs/bi/general） |
| stream | boolean | 否 | 是否流式输出，默认 false |

**响应（非流式）**:
```json
{
  "code": 200,
  "success": true,
  "data": {
    "session_id": "session-001",
    "message_id": "msg-001",
    "response": "根据您的需求，我为您查询到最近的采购订单...",
    "intent": {
      "type": "query",
      "confidence": 0.95,
      "entities": [
        {
          "type": "time",
          "value": "最近"
        }
      ]
    },
    "tool_calls": [
      {
        "tool_id": "erp.query_purchase_order",
        "tool_name": "查询采购订单",
        "parameters": {
          "time_range": "recent"
        },
        "result": {}
      }
    ],
    "created_at": "2026-08-28T10:00:00Z"
  }
}
```

**响应（流式）**:
使用 Server-Sent Events (SSE) 格式，逐块返回响应内容。

### 4.2 创建新会话

- **URL**: `/ai/sessions`
- **方法**: `POST`
- **认证**: 需要

**请求体**:
```json
{
  "title": "采购订单查询",
  "module": "erp"
}
```

**响应**:
```json
{
  "code": 200,
  "success": true,
  "data": {
    "session_id": "session-002",
    "title": "采购订单查询",
    "module": "erp",
    "created_at": "2026-08-28T10:00:00Z"
  }
}
```

### 4.3 获取会话列表

- **URL**: `/ai/sessions`
- **方法**: `GET`
- **认证**: 需要

**查询参数**:
| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| page | int | 页码 | 1 |
| page_size | int | 每页数量 | 20 |
| module | string | 模块筛选 | - |

### 4.4 获取会话详情

- **URL**: `/ai/sessions/{session_id}`
- **方法**: `GET`
- **认证**: 需要

### 4.5 获取会话消息列表

- **URL**: `/ai/sessions/{session_id}/messages`
- **方法**: `GET`
- **认证**: 需要

### 4.6 更新会话

- **URL**: `/ai/sessions/{session_id}`
- **方法**: `PUT`
- **认证**: 需要

**请求体**:
```json
{
  "title": "更新后的会话标题"
}
```

### 4.7 删除会话

- **URL**: `/ai/sessions/{session_id}`
- **方法**: `DELETE`
- **认证**: 需要

---

## 5. 意图识别 API

### 5.1 识别用户意图

- **URL**: `/ai/intent/recognize`
- **方法**: `POST`
- **认证**: 需要

**请求体**:
```json
{
  "text": "帮我创建一个销售订单",
  "module": "crm",
  "context": {
    "previous_messages": []
  }
}
```

**响应**:
```json
{
  "code": 200,
  "success": true,
  "data": {
    "intent": "create_sales_order",
    "intent_type": "create",
    "confidence": 0.94,
    "module": "crm",
    "entities": [
      {
        "type": "action",
        "value": "创建",
        "confidence": 0.98
      },
      {
        "type": "object",
        "value": "销售订单",
        "confidence": 0.96
      }
    ],
    "suggested_actions": [
      {
        "action_id": "crm.create_sales_order",
        "action_name": "创建销售订单",
        "confidence": 0.92
      }
    ]
  }
}
```

---

## 6. 业务模块 Copilot API

### 6.1 获取业务模块列表

- **URL**: `/copilot/modules`
- **方法**: `GET`
- **认证**: 需要

**响应**:
```json
{
  "code": 200,
  "success": true,
  "data": {
    "modules": [
      {
        "id": "erp",
        "name": "ERP 智能助手",
        "description": "企业资源计划智能助手",
        "icon": "🏢",
        "enabled": true,
        "capabilities": ["purchase", "sales", "inventory", "production"],
        "supported_intents": ["query", "create", "update", "delete", "analyze"],
        "available_tools": [
          {
            "tool_id": "erp.query_purchase_order",
            "name": "查询采购订单",
            "category": "query",
            "description": "查询采购订单信息"
          }
        ],
        "quick_actions": [
          {
            "action_id": "erp.query_purchase",
            "label": "采购查询",
            "icon": "search"
          }
        ],
        "faqs": [
          {
            "question": "如何查询采购订单？",
            "answer": "您可以说...",
            "category": "采购管理"
          }
        ]
      }
    ],
    "total": 12
  }
}
```

### 6.2 获取业务模块详情

- **URL**: `/copilot/modules/{module_id}`
- **方法**: `GET`
- **认证**: 需要

### 6.3 获取模块工具列表

- **URL**: `/copilot/modules/{module_id}/tools`
- **方法**: `GET`
- **认证**: 需要

### 6.4 调用模块工具

- **URL**: `/copilot/modules/{module_id}/tools/{tool_id}/execute`
- **方法**: `POST`
- **认证**: 需要

**请求体**:
```json
{
  "parameters": {
    "order_id": "PO-2026-001"
  }
}
```

### 6.5 获取模块 FAQ

- **URL**: `/copilot/modules/{module_id}/faqs`
- **方法**: `GET`
- **认证**: 需要

### 6.6 获取模块快捷操作

- **URL**: `/copilot/modules/{module_id}/quick-actions`
- **方法**: `GET`
- **认证**: 需要

---

## 7. AI 治理 API

### 7.1 获取治理仪表盘数据

- **URL**: `/governance/dashboard`
- **方法**: `GET`
- **认证**: 需要（管理员权限）

**查询参数**:
| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| start_date | string | 开始日期 | 最近7天 |
| end_date | string | 结束日期 | 今天 |

**响应**:
```json
{
  "code": 200,
  "success": true,
  "data": {
    "overview": {
      "total_calls": 10000,
      "success_rate": 0.985,
      "avg_response_time": 1500,
      "total_cost": 500.50
    },
    "trends": {
      "daily_calls": [
        {"date": "2026-08-22", "count": 1200},
        {"date": "2026-08-23", "count": 1350}
      ],
      "success_rates": [
        {"date": "2026-08-22", "rate": 0.98},
        {"date": "2026-08-23", "rate": 0.99}
      ]
    },
    "module_distribution": [
      {"module": "erp", "count": 3000, "percentage": 30},
      {"module": "crm", "count": 2500, "percentage": 25}
    ],
    "top_users": [
      {"user_id": "user-001", "username": "admin", "count": 500}
    ],
    "anomalies": {
      "failed_calls": 150,
      "timeout_calls": 30,
      "content_violations": 5
    }
  }
}
```

### 7.2 获取 AI 调用日志

- **URL**: `/governance/logs`
- **方法**: `GET`
- **认证**: 需要（管理员权限）

### 7.3 获取内容审核记录

- **URL**: `/governance/content-audit`
- **方法**: `GET`
- **认证**: 需要（管理员权限）

### 7.4 配置内容审核规则

- **URL**: `/governance/content-audit/rules`
- **方法**: `PUT`
- **认证**: 需要（管理员权限）

### 7.5 获取 AI 使用统计

- **URL**: `/governance/statistics`
- **方法**: `GET`
- **认证**: 需要（管理员权限）

---

## 8. 系统配置 API

### 8.1 获取系统配置

- **URL**: `/system/config`
- **方法**: `GET`
- **认证**: 需要（管理员权限）

### 8.2 更新系统配置

- **URL**: `/system/config`
- **方法**: `PUT`
- **认证**: 需要（管理员权限）

**请求体**:
```json
{
  "system_name": "TOPEMS",
  "system_version": "1.0.0",
  "ai_enabled": true,
  "ai_provider": "openai",
  "ai_model": "gpt-4",
  "max_concurrent_users": 1000,
  "session_timeout": 3600
}
```

### 8.3 获取数据字典

- **URL**: `/system/dictionaries`
- **方法**: `GET`
- **认证**: 需要

### 8.4 获取字典项

- **URL**: `/system/dictionaries/{dict_code}/items`
- **方法**: `GET`
- **认证**: 需要

---

## 9. 监控 API

### 9.1 健康检查

- **URL**: `/health`
- **方法**: `GET`
- **认证**: 不需要

**响应**:
```json
{
  "status": "healthy",
  "timestamp": "2026-08-28T10:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "ai_service": "healthy"
  }
}
```

### 9.2 系统指标

- **URL**: `/metrics`
- **方法**: `GET`
- **认证**: 需要（管理员权限）

**响应**: Prometheus 格式的指标数据

### 9.3 获取服务状态

- **URL**: `/monitor/status`
- **方法**: `GET`
- **认证**: 需要（管理员权限）

### 9.4 获取告警列表

- **URL**: `/monitor/alerts`
- **方法**: `GET`
- **认证**: 需要（管理员权限）

### 9.5 确认告警

- **URL**: `/monitor/alerts/{alert_id}/acknowledge`
- **方法**: `POST`
- **认证**: 需要（管理员权限）

---

## 10. 通知 API

### 10.1 获取通知列表

- **URL**: `/notifications`
- **方法**: `GET`
- **认证**: 需要

### 10.2 获取未读通知数量

- **URL**: `/notifications/unread-count`
- **方法**: `GET`
- **认证**: 需要

### 10.3 标记通知已读

- **URL**: `/notifications/{notification_id}/read`
- **方法**: `POST`
- **认证**: 需要

### 10.4 全部标记已读

- **URL**: `/notifications/read-all`
- **方法**: `POST`
- **认证**: 需要

---

## 11. 文件上传 API

### 11.1 上传文件

- **URL**: `/files/upload`
- **方法**: `POST`
- **认证**: 需要
- **Content-Type**: `multipart/form-data`

**请求参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| file | file | 是 | 上传的文件 |
| folder | string | 否 | 存储文件夹 |
| description | string | 否 | 文件描述 |

**响应**:
```json
{
  "code": 200,
  "success": true,
  "data": {
    "file_id": "file-001",
    "file_name": "document.pdf",
    "file_size": 1024000,
    "file_type": "application/pdf",
    "file_url": "https://cdn.topems.com/files/file-001.pdf",
    "uploaded_at": "2026-08-28T10:00:00Z"
  }
}
```

### 11.2 删除文件

- **URL**: `/files/{file_id}`
- **方法**: `DELETE`
- **认证**: 需要

---

## 12. 使用示例

### 12.1 cURL 示例

```bash
# 登录获取 Token
curl -X POST http://localhost:8013/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'

# 发送 AI 对话
curl -X POST http://localhost:8013/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"message":"帮我查询采购订单","module":"erp"}'

# 获取用户列表
curl -X GET "http://localhost:8013/api/v1/users?page=1&page_size=20" \
  -H "Authorization: Bearer <your-token>"
```

### 12.2 JavaScript 示例

```javascript
// 登录
async function login(username, password) {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return response.json();
}

// 发送 AI 对话
async function sendChatMessage(token, message, module = 'general') {
  const response = await fetch('/api/v1/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ message, module })
  });
  return response.json();
}

// 获取业务模块列表
async function getModules(token) {
  const response = await fetch('/api/v1/copilot/modules', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
}
```

### 12.3 Python 示例

```python
import requests

BASE_URL = 'http://localhost:8013/api/v1'

def login(username, password):
    response = requests.post(
        f'{BASE_URL}/auth/login',
        json={'username': username, 'password': password}
    )
    return response.json()

def send_chat_message(token, message, module='general'):
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {token}'
    }
    response = requests.post(
        f'{BASE_URL}/ai/chat',
        headers=headers,
        json={'message': message, 'module': module}
    )
    return response.json()

def get_user_list(token, page=1, page_size=20):
    headers = {'Authorization': f'Bearer {token}'}
    params = {'page': page, 'page_size': page_size}
    response = requests.get(
        f'{BASE_URL}/users',
        headers=headers,
        params=params
    )
    return response.json()
```

---

## 13. 速率限制

| API 类别 | 速率限制 | 说明 |
|---------|---------|------|
| 认证 API | 10 次/分钟 | 登录、登出等 |
| AI 对话 API | 60 次/分钟 | 对话、意图识别 |
| 用户管理 API | 120 次/分钟 | 用户 CRUD |
| 文件上传 API | 10 次/分钟 | 文件上传 |
| 其他 API | 300 次/分钟 | 通用限制 |

超过速率限制将返回 `429 Too Many Requests` 错误。

---

## 14. 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0 | 2026-08-28 | 初始版本，包含 12 大类 API |

---

*本文档由 TOPEMS 团队维护，最后更新：2026-08-28*
