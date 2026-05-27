# TOPEMS 通知系统 API

**服务**: notification-service
**端口**: 待定
**版本**: v1

---

## 1. 概述

通知系统 API 提供消息通知管理功能，包括获取通知、标记已读、删除通知等。

### 1.1 API 端点总览

| 功能 | 端点 | 方法 |
|------|------|------|
| 获取通知列表 | /api/v1/notifications | GET |
| 获取未读通知 | /api/v1/notifications/unread | GET |
| 获取未读数量 | /api/v1/notifications/unread-count | GET |
| 标记已读 | /api/v1/notifications/{id}/read | PUT |
| 全部标记已读 | /api/v1/notifications/read-all | PUT |
| 删除通知 | /api/v1/notifications/{id} | DELETE |
| 创建通知 | /api/v1/notifications | POST |
| 健康检查 | /health | GET |

### 1.2 数据模型

#### Notification（通知）

```json
{
  "id": "notif-001",
  "userId": "user-001",
  "notificationType": "workflow",
  "title": "审批任务提醒",
  "content": "您有一个新的审批任务等待处理：项目立项审批",
  "data": {
    "workflow_instance_id": "instance-001",
    "approval_id": "approval-001"
  },
  "isRead": false,
  "priority": 1,
  "createdAt": "2026-05-22T10:00:00Z",
  "readAt": null
}
```

#### NotificationListResponse（通知列表响应）

```json
{
  "notifications": [],
  "total": 50,
  "page": 1,
  "pageSize": 20,
  "unreadCount": 5
}
```

---

## 2. 通知类型

### 2.1 支持的通知类型

| 类型代码 | 说明 |
|----------|------|
| system | 系统通知 |
| workflow | 工作流通知 |
| reminder | 提醒通知 |
| alert | 告警通知 |
| message | 消息通知 |

---

## 3. 通知管理接口

### 3.1 获取通知列表

**端点**: `GET /api/v1/notifications`

**描述**: 获取当前用户的通知列表

**认证**: 需要

**查询参数**:
| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| page | integer | 否 | 页码（默认1） |
| pageSize | integer | 否 | 每页数量（默认20） |
| notificationType | string | 否 | 通知类型 |

**请求示例**:

```bash
curl -X GET "http://localhost:8012/api/v1/notifications?page=1&pageSize=20&notificationType=workflow" \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "code": 200,
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "notif-001",
        "userId": "user-001",
        "notificationType": "workflow",
        "title": "审批任务提醒",
        "content": "您有一个新的审批任务等待处理：项目立项审批",
        "data": {
          "workflow_instance_id": "instance-001",
          "approval_id": "approval-001"
        },
        "isRead": false,
        "priority": 1,
        "createdAt": "2026-05-22T10:00:00Z",
        "readAt": null
      },
      {
        "id": "notif-002",
        "userId": "user-001",
        "notificationType": "system",
        "title": "系统维护通知",
        "content": "系统将于本周日凌晨2:00-4:00进行例行维护",
        "data": {},
        "isRead": true,
        "priority": 2,
        "createdAt": "2026-05-21T10:00:00Z",
        "readAt": "2026-05-21T11:00:00Z"
      },
      {
        "id": "notif-003",
        "userId": "user-001",
        "notificationType": "alert",
        "title": "质量告警",
        "content": "2号反应釜温度异常，请及时处理",
        "data": {
          "device_id": "reactor-002",
          "alert_type": "temperature"
        },
        "isRead": false,
        "priority": 0,
        "createdAt": "2026-05-22T09:00:00Z",
        "readAt": null
      }
    ],
    "total": 50,
    "page": 1,
    "pageSize": 20,
    "unreadCount": 5
  },
  "message": "success",
  "timestamp": "2026-05-22T10:00:00Z"
}
```

---

### 3.2 获取未读通知

**端点**: `GET /api/v1/notifications/unread`

**描述**: 获取当前用户的所有未读通知

**认证**: 需要

**请求示例**:

```bash
curl -X GET http://localhost:8012/api/v1/notifications/unread \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "code": 200,
  "success": true,
  "data": [
    {
      "id": "notif-001",
      "userId": "user-001",
      "notificationType": "workflow",
      "title": "审批任务提醒",
      "content": "您有一个新的审批任务等待处理：项目立项审批",
      "data": {
        "workflow_instance_id": "instance-001",
        "approval_id": "approval-001"
      },
      "isRead": false,
      "priority": 1,
      "createdAt": "2026-05-22T10:00:00Z",
      "readAt": null
    },
    {
      "id": "notif-003",
      "userId": "user-001",
      "notificationType": "alert",
      "title": "质量告警",
      "content": "2号反应釜温度异常，请及时处理",
      "data": {},
      "isRead": false,
      "priority": 0,
      "createdAt": "2026-05-22T09:00:00Z",
      "readAt": null
    }
  ],
  "message": "success",
  "timestamp": "2026-05-22T10:00:00Z"
}
```

---

### 3.3 获取未读数量

**端点**: `GET /api/v1/notifications/unread-count`

**描述**: 获取当前用户的未读通知数量

**认证**: 需要

**请求示例**:

```bash
curl -X GET http://localhost:8012/api/v1/notifications/unread-count \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "code": 200,
  "success": true,
  "data": 5,
  "message": "success",
  "timestamp": "2026-05-22T10:00:00Z"
}
```

---

### 3.4 标记已读

**端点**: `PUT /api/v1/notifications/{id}/read`

**描述**: 将指定通知标记为已读

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 通知 ID |

**请求示例**:

```bash
curl -X PUT http://localhost:8012/api/v1/notifications/notif-001/read \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "code": 200,
  "success": true,
  "data": {
    "id": "notif-001",
    "userId": "user-001",
    "notificationType": "workflow",
    "title": "审批任务提醒",
    "content": "您有一个新的审批任务等待处理：项目立项审批",
    "isRead": true,
    "priority": 1,
    "createdAt": "2026-05-22T10:00:00Z",
    "readAt": "2026-05-22T10:30:00Z"
  },
  "message": "success",
  "timestamp": "2026-05-22T10:30:00Z"
}
```

---

### 3.5 全部标记已读

**端点**: `PUT /api/v1/notifications/read-all`

**描述**: 将所有未读通知标记为已读

**认证**: 需要

**请求示例**:

```bash
curl -X PUT http://localhost:8012/api/v1/notifications/read-all \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "code": 200,
  "success": true,
  "data": 5,
  "message": "已将5条通知标记为已读",
  "timestamp": "2026-05-22T10:30:00Z"
}
```

---

### 3.6 删除通知

**端点**: `DELETE /api/v1/notifications/{id}`

**描述**: 删除指定通知

**认证**: 需要

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | string | 通知 ID |

**请求示例**:

```bash
curl -X DELETE http://localhost:8012/api/v1/notifications/notif-001 \
  -H "Authorization: Bearer {token}"
```

**成功响应** (200 OK):

```json
{
  "code": 200,
  "success": true,
  "data": true,
  "message": "success",
  "timestamp": "2026-05-22T10:30:00Z"
}
```

---

### 3.7 创建通知

**端点**: `POST /api/v1/notifications`

**描述**: 创建新的通知（通常由系统内部调用）

**认证**: 需要

**权限**: notification:write

**请求头**:
```
Content-Type: application/json
Authorization: Bearer {token}
```

**请求体**:

```json
{
  "userId": "user-001",
  "notificationType": "workflow",
  "title": "审批任务提醒",
  "content": "您有一个新的审批任务等待处理：项目立项审批",
  "data": {
    "workflow_instance_id": "instance-001",
    "approval_id": "approval-001"
  },
  "priority": 1
}
```

| 字段 | 类型 | 必需 | 说明 |
|------|------|------|------|
| userId | string | 是 | 接收用户 ID |
| notificationType | string | 是 | 通知类型 |
| title | string | 是 | 通知标题 |
| content | string | 是 | 通知内容 |
| data | object | 否 | 扩展数据 |
| priority | integer | 否 | 优先级（0=最高，数字越大优先级越低） |

**请求示例**:

```bash
curl -X POST http://localhost:8012/api/v1/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "userId": "user-001",
    "notificationType": "workflow",
    "title": "审批任务提醒",
    "content": "您有一个新的审批任务等待处理：项目立项审批",
    "data": {
      "workflow_instance_id": "instance-001",
      "approval_id": "approval-001"
    },
    "priority": 1
  }'
```

**成功响应** (201 Created):

```json
{
  "code": 200,
  "success": true,
  "data": {
    "id": "notif-001",
    "userId": "user-001",
    "notificationType": "workflow",
    "title": "审批任务提醒",
    "content": "您有一个新的审批任务等待处理：项目立项审批",
    "data": {
      "workflow_instance_id": "instance-001",
      "approval_id": "approval-001"
    },
    "isRead": false,
    "priority": 1,
    "createdAt": "2026-05-22T10:00:00Z",
    "readAt": null
  },
  "message": "success",
  "timestamp": "2026-05-22T10:00:00Z"
}
```

---

## 4. WebSocket 实时通知（可选）

### 4.1 WebSocket 连接

通知系统支持通过 WebSocket 实时推送通知。

**连接地址**: `ws://localhost:8012/ws/notifications`

**认证**: 通过 URL 参数或 Header 传递 Token

```
ws://localhost:8012/ws/notifications?token=xxx
```

### 4.2 接收消息格式

```json
{
  "type": "notification",
  "data": {
    "id": "notif-001",
    "notificationType": "workflow",
    "title": "审批任务提醒",
    "content": "您有一个新的审批任务等待处理",
    "priority": 1
  }
}
```

### 4.3 发送心跳

客户端需要定期发送心跳以保持连接：

```json
{
  "type": "ping"
}
```

服务器响应：

```json
{
  "type": "pong"
}
```

---

## 5. 健康检查

### 5.1 检查服务状态

**端点**: `GET /health`

**描述**: 检查通知系统的健康状态

**认证**: 不需要

**请求示例**:

```bash
curl -X GET http://localhost:8012/health
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
| NOTIFICATION_NOT_FOUND | 404 | 通知不存在 |
| INVALID_NOTIFICATION_TYPE | 400 | 无效的通知类型 |
| VALIDATION_ERROR | 400 | 数据验证失败 |
| UNAUTHORIZED | 401 | 未授权访问 |
| FORBIDDEN | 403 | 权限不足 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

---

## 7. 通知优先级说明

| 优先级 | 说明 |
|--------|------|
| 0 | 最高优先级（紧急告警） |
| 1 | 高优先级（工作流通知） |
| 2 | 普通优先级（系统通知） |
| 3 | 低优先级（一般消息） |

---

## 8. 业务场景通知模板

### 8.1 工作流通知

| 场景 | 通知类型 | 标题模板 |
|------|----------|----------|
| 新审批任务 | workflow | 您有新的审批任务：{task_name} |
| 审批通过 | workflow | 您的申请已通过：{title} |
| 审批拒绝 | workflow | 您的申请已被拒绝：{title} |
| 审批超时 | workflow | 审批任务超时提醒 |

### 8.2 系统通知

| 场景 | 通知类型 | 标题模板 |
|------|----------|----------|
| 系统维护 | system | 系统维护通知 |
| 版本更新 | system | 系统版本更新通知 |
| 账户变更 | system | 账户信息变更通知 |

### 8.3 告警通知

| 场景 | 通知类型 | 标题模板 |
|------|----------|----------|
| 设备告警 | alert | 设备告警：{device_name} |
| 质量告警 | alert | 质量告警：{issue_name} |
| 安全告警 | alert | 安全告警：{alert_name} |

### 8.4 提醒通知

| 场景 | 通知类型 | 标题模板 |
|------|----------|----------|
| 待办提醒 | reminder | 待办提醒：{task_name} |
| 会议提醒 | reminder | 会议提醒：{meeting_name} |
| 截止日期提醒 | reminder | 截止日期提醒：{task_name} |

---

**版本历史**

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v2.1.0 | 2026-05-22 | 初始版本 |
