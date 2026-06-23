# TOPEMS Communication 用户手册

<lark-toc />

## 1. 系统概述

### 1.1 什么是 Communication 模块

Communication（通讯模块）是 TOPEMS 的统一消息中心，整合了多种通讯能力：

- **通知服务** - 系统通知推送
- **即时通讯** - 实时聊天功能
- **邮件服务** - 邮件发送与管理

### 1.2 核心概念

| 概念 | 说明 |
|------|------|
| Notification | 系统通知，推送给用户的提醒消息 |
| Chat Room | 聊天室，支持群聊和私聊 |
| Message | 聊天消息，支持文本和文件 |
| Email | 邮件，支持发送和接收 |

---

## 2. 通知服务 API

### 2.1 发送通知

```bash
curl -X POST http://localhost:8000/api/core/comm/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "USER_UUID",
    "title": "审批提醒",
    "content": "您有一条新的费用报销待审批",
    "notification_type": "approval",
    "priority": 1,
    "data": {
      "voucher_id": "VOUCHER_UUID",
      "amount": 5000
    }
  }'
```

### 2.2 查询用户通知

```bash
curl "http://localhost:8000/api/core/comm/notifications/user/USER_UUID?unread_only=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.3 获取未读通知数

```bash
curl http://localhost:8000/api/core/comm/notifications/user/USER_UUID/unread-count \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.4 标记通知已读

```bash
curl -X PUT http://localhost:8000/api/core/comm/notifications/NOTIFICATION_UUID/read \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.5 标记所有通知已读

```bash
curl -X PUT http://localhost:8000/api/core/comm/notifications/user/USER_UUID/read-all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2.6 删除通知

```bash
curl -X DELETE http://localhost:8000/api/core/comm/notifications/NOTIFICATION_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 3. 即时通讯 API

### 3.1 创建聊天室

```bash
curl -X POST http://localhost:8000/api/core/comm/chat/rooms \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "项目讨论组",
    "room_type": "group",
    "creator_id": "USER_UUID"
  }'
```

### 3.2 查询聊天室列表

```bash
curl http://localhost:8000/api/core/comm/chat/rooms/user/USER_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.3 获取聊天室详情

```bash
curl http://localhost:8000/api/core/comm/chat/rooms/ROOM_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.4 添加聊天室成员

```bash
curl -X POST http://localhost:8000/api/core/comm/chat/rooms/ROOM_UUID/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "USER_UUID",
    "role": "member"
  }'
```

### 3.5 移除聊天室成员

```bash
curl -X DELETE http://localhost:8000/api/core/comm/chat/rooms/ROOM_UUID/members/USER_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3.6 获取聊天室成员

```bash
curl http://localhost:8000/api/core/comm/chat/rooms/ROOM_UUID/members \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 4. 聊天消息 API

### 4.1 发送消息

```bash
curl -X POST http://localhost:8000/api/core/comm/chat/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "room_id": "ROOM_UUID",
    "sender_id": "USER_UUID",
    "sender_name": "张三",
    "message_type": "text",
    "content": "大家好，这个项目的进度如何？"
  }'
```

### 4.2 查询聊天记录

```bash
curl "http://localhost:8000/api/core/comm/chat/messages/ROOM_UUID?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.3 撤回消息

```bash
curl -X PUT http://localhost:8000/api/core/comm/chat/messages/MESSAGE_UUID/recall \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4.4 查询最近联系人

```bash
curl http://localhost:8000/api/core/comm/chat/recent-contacts/USER_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 5. 邮件服务 API

### 5.1 发送邮件

```bash
curl -X POST http://localhost:8000/api/core/comm/mail/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "from_address": "system@topems.com",
    "to_addresses": ["user@example.com"],
    "cc_addresses": ["manager@example.com"],
    "subject": "系统通知",
    "body": "这是一封测试邮件"
  }'
```

### 5.2 查询邮件列表

```bash
curl "http://localhost:8000/api/core/comm/mail/list/USER_UUID?folder=inbox&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.3 获取邮件详情

```bash
curl http://localhost:8000/api/core/comm/mail/EMAIL_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.4 标记邮件已读

```bash
curl -X PUT http://localhost:8000/api/core/comm/mail/EMAIL_UUID/read \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.5 标记邮件星标

```bash
curl -X PUT http://localhost:8000/api/core/comm/mail/EMAIL_UUID/star \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.6 移动邮件到文件夹

```bash
curl -X PUT http://localhost:8000/api/core/comm/mail/EMAIL_UUID/move \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "folder": "archive"
  }'
```

### 5.7 删除邮件

```bash
curl -X DELETE http://localhost:8000/api/core/comm/mail/EMAIL_UUID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 6. 邮件模板 API

### 6.1 创建邮件模板

```bash
curl -X POST http://localhost:8000/api/core/comm/mail/templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "会议通知模板",
    "subject": "会议通知：{{meeting_title}}",
    "content": "您好，{{recipient_name}}，您有一场会议即将开始。\n主题：{{meeting_title}}\n时间：{{meeting_time}}\n地点：{{meeting_location}}",
    "variables": ["meeting_title", "recipient_name", "meeting_time", "meeting_location"]
  }'
```

### 6.2 查询邮件模板列表

```bash
curl http://localhost:8000/api/core/comm/mail/templates \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6.3 使用模板发送邮件

```bash
curl -X POST http://localhost:8000/api/core/comm/mail/templates/TEMPLATE_UUID/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "to_addresses": ["user@example.com"],
    "variables": {
      "meeting_title": "项目评审会议",
      "recipient_name": "张三",
      "meeting_time": "2026-06-25 14:00",
      "meeting_location": "会议室A"
    }
  }'
```

---

## 7. API 参考

### 7.1 通知 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/core/comm/notifications` | 发送通知 |
| GET | `/api/core/comm/notifications/user/{user_id}` | 查询用户通知 |
| GET | `/api/core/comm/notifications/user/{user_id}/unread-count` | 未读数 |
| PUT | `/api/core/comm/notifications/{id}/read` | 标记已读 |
| PUT | `/api/core/comm/notifications/user/{user_id}/read-all` | 全部已读 |
| DELETE | `/api/core/comm/notifications/{id}` | 删除通知 |

### 7.2 即时通讯 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/core/comm/chat/rooms` | 创建聊天室 |
| GET | `/api/core/comm/chat/rooms/user/{user_id}` | 用户聊天室列表 |
| GET | `/api/core/comm/chat/rooms/{room_id}` | 聊天室详情 |
| POST | `/api/core/comm/chat/rooms/{room_id}/members` | 添加成员 |
| DELETE | `/api/core/comm/chat/rooms/{room_id}/members/{user_id}` | 移除成员 |
| GET | `/api/core/comm/chat/rooms/{room_id}/members` | 获取成员列表 |

### 7.3 消息 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/core/comm/chat/messages` | 发送消息 |
| GET | `/api/core/comm/chat/messages/{room_id}` | 查询聊天记录 |
| PUT | `/api/core/comm/chat/messages/{id}/recall` | 撤回消息 |
| GET | `/api/core/comm/chat/recent-contacts/{user_id}` | 最近联系人 |

### 7.4 邮件 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/core/comm/mail/send` | 发送邮件 |
| GET | `/api/core/comm/mail/list/{user_id}` | 邮件列表 |
| GET | `/api/core/comm/mail/{id}` | 邮件详情 |
| PUT | `/api/core/comm/mail/{id}/read` | 标记已读 |
| PUT | `/api/core/comm/mail/{id}/star` | 星标邮件 |
| PUT | `/api/core/comm/mail/{id}/move` | 移动邮件 |
| DELETE | `/api/core/comm/mail/{id}` | 删除邮件 |

### 7.5 邮件模板 API

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/core/comm/mail/templates` | 创建模板 |
| GET | `/api/core/comm/mail/templates` | 模板列表 |
| POST | `/api/core/comm/mail/templates/{id}/send` | 使用模板发送 |

---

## 8. 通知类型

| 类型 | 说明 | 典型场景 |
|------|------|----------|
| `info` | 信息通知 | 系统公告 |
| `approval` | 审批通知 | 待审批事项 |
| `warning` | 警告通知 | 即将到期 |
| `error` | 错误通知 | 操作失败 |
| `success` | 成功通知 | 审批通过 |

---

## 9. 常见问题

### 9.1 通知未收到

**可能原因：**
- 用户 ID 不正确
- 网络连接问题

**解决方案：** 检查用户 ID 是否正确，确认通知已创建。

### 9.2 无法创建聊天室

**可能原因：**
- 用户不存在
- 聊天室名称重复

**解决方案：** 检查参数是否正确。

### 9.3 邮件发送失败

**可能原因：**
- SMTP 配置错误
- 收件人地址格式错误

**解决方案：** 检查邮件服务配置和收件人地址。

---

*文档版本：1.0.0*
*最后更新：2026-06-23*
