# TOPEMS 邮件服务使用指南

## 概述

TOPEMS 邮件服务提供企业级邮件发送功能，支持普通邮件发送、模板邮件、批量重发等功能。

## 服务配置

### 环境变量

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| SMTP_HOST | smtp.163.com | SMTP 服务器地址 |
| SMTP_PORT | 465 | SMTP 端口（SSL） |
| SMTP_USERNAME | topmap@163.com | SMTP 用户名 |
| SMTP_PASSWORD | - | SMTP 密码 |
| SMTP_FROM_ADDRESS | topmap@163.com | 发件人地址 |
| SERVER_PORT | 8054 | 服务监听端口 |

### 配置文件

配置文件位于项目根目录：`<项目目录>/.env.mail`

```bash
# 复制示例配置
cp .env.mail .env.mail.local

# 编辑配置
vim .env.mail.local
```

## 快速开始

### 1. 获取访问 Token

```bash
# 登录获取 token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
```

### 2. 发送普通邮件

```bash
curl -X POST http://localhost:8054/api/v1/mail/emails \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "to_addresses": ["recipient@example.com"],
    "cc_addresses": ["cc@example.com"],
    "subject": "邮件主题",
    "body": "邮件正文内容",
    "priority": "normal"
  }'
```

### 3. 响应示例

成功响应：
```json
{
  "code": 200,
  "success": true,
  "data": {
    "id": "uuid-here",
    "subject": "邮件主题",
    "from_address": "topmap@163.com",
    "to_addresses": ["recipient@example.com"],
    "status": "sent",
    "sent_at": "2026-06-10T20:47:01Z"
  },
  "message": "邮件发送成功"
}
```

## API 接口

### 邮件管理

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/v1/mail/emails` | GET | 获取邮件列表 |
| `/api/v1/mail/emails` | POST | 发送邮件 |
| `/api/v1/mail/emails/{id}` | GET | 获取邮件详情 |
| `/api/v1/mail/emails/{id}` | DELETE | 删除邮件 |
| `/api/v1/mail/emails/stats` | GET | 获取邮件统计 |

### 模板管理

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/v1/mail/templates` | GET | 获取模板列表 |
| `/api/v1/mail/templates/{id}` | GET | 获取模板详情 |
| `/api/v1/mail/templates` | POST | 创建模板 |
| `/api/v1/mail/templates/{id}` | PUT | 更新模板 |
| `/api/v1/mail/templates/{id}` | DELETE | 删除模板 |

### 特殊功能

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/v1/mail/emails/send-with-template` | POST | 使用模板发送 |
| `/api/v1/mail/emails/resend` | POST | 批量重发 |

### 附件管理

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/v1/mail/attachments` | GET | 获取附件列表 |
| `/api/v1/mail/attachments` | POST | 上传附件 |
| `/api/v1/mail/attachments/{id}` | GET | 获取附件详情 |
| `/api/v1/mail/attachments/{id}` | DELETE | 删除附件 |
| `/api/v1/mail/attachments/{id}/download` | GET | 下载附件 |
| `/api/v1/mail/attachments/email/{email_id}` | GET | 获取邮件的所有附件 |

## 使用模板发送邮件

### 内置模板

系统预置以下模板：

| 模板代码 | 名称 | 说明 |
|----------|------|------|
| workflow_approval | 流程审批通知 | 流程审批结果通知 |
| system_alert | 系统告警通知 | 系统告警通知 |
| contract_notification | 合同通知 | 合同相关通知 |
| user_register | 用户注册通知 | 新用户注册通知 |
| password_reset | 密码重置通知 | 密码重置邮件 |

### 发送模板邮件

```bash
curl -X POST http://localhost:8054/api/v1/mail/emails/send-with-template \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "to_addresses": ["user@example.com"],
    "template_code": "workflow_approval",
    "template_data": {
      "user_name": "张三",
      "process_name": "请假申请",
      "approval_status": "已通过",
      "approver_name": "李经理",
      "approval_time": "2026-06-10 10:00:00",
      "approval_comment": "同意"
    },
    "priority": "high"
  }'
```

## 权限说明

邮件服务使用 IAM 权限控制：

| 权限 | 说明 |
|------|------|
| email_read | 读取邮件和模板列表 |
| email_write | 发送和管理邮件 |
| template_read | 读取模板 |
| template_write | 创建/更新/删除模板 |
| attachment_read | 读取附件 |
| attachment_write | 上传/删除附件 |

用户需要同时拥有 `email_read` 和 `email_write` 权限才能正常使用邮件服务。

### 检查用户权限

```bash
curl http://localhost:8000/api/v1/users/admin \
  -H "Authorization: Bearer $TOKEN"
```

## 健康检查

### 服务健康状态

```bash
curl http://localhost:8054/health
```

响应：
```json
{
  "code": 200,
  "success": true,
  "data": "healthy",
  "message": "健康检查"
}
```

### 详细健康状态

```bash
curl http://localhost:8054/api/v1/health/detailed
```

### 服务指标

```bash
curl http://localhost:8054/api/v1/metrics
```

## 常见问题

### 1. 邮件发送失败

**可能原因：**
- SMTP 配置错误
- 网络连接问题
- 收件人地址无效

**排查步骤：**
1. 检查 SMTP 配置是否正确
2. 验证网络连接
3. 查看服务日志

### 2. 权限不足

**错误信息：** `认证失败：需要 email_write 权限`

**解决方案：**
```sql
-- 为用户添加邮件权限
UPDATE iam.users 
SET roles = ARRAY['admin', 'user', 'email_write', 'email_read'],
    permissions = ARRAY['email_write', 'email_read'] 
WHERE username = 'admin';
```

### 3. Token 过期

**错误信息：** `InvalidSignature`

**解决方案：** 重新获取 Token

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
```

## 数据库表结构

### mail.templates 表

```sql
CREATE TABLE mail.templates (
    id UUID PRIMARY KEY,
    code VARCHAR(100) UNIQUE NOT NULL,  -- 模板代码
    name VARCHAR(255) NOT NULL,          -- 模板名称
    description TEXT,                   -- 模板描述
    subject_template TEXT NOT NULL,      -- 主题模板
    body_template TEXT NOT NULL,         -- 正文模板
    body_html_template TEXT,             -- HTML 正文模板
    category VARCHAR(50) DEFAULT 'general', -- 分类
    tags JSONB,                         -- 标签
    status VARCHAR(20) DEFAULT 'active', -- 状态
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### mail.emails 表

```sql
CREATE TABLE mail.emails (
    id UUID PRIMARY KEY,
    subject VARCHAR(500) NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    to_addresses JSONB NOT NULL,
    cc_addresses JSONB,
    bcc_addresses JSONB,
    body TEXT NOT NULL,
    body_html TEXT,
    status VARCHAR(20) DEFAULT 'pending',  -- pending/sent/failed
    priority VARCHAR(20) DEFAULT 'normal',  -- low/normal/high
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    template_id UUID REFERENCES mail.templates(id),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

### mail.attachments 表

```sql
CREATE TABLE mail.attachments (
    id UUID PRIMARY KEY,
    email_id UUID REFERENCES mail.emails(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,           -- 系统文件名
    original_filename VARCHAR(500) NOT NULL, -- 原始文件名
    file_path VARCHAR(1000) NOT NULL,        -- 存储路径
    file_size BIGINT NOT NULL,               -- 文件大小(字节)
    content_type VARCHAR(100) NOT NULL,      -- MIME类型
    created_by UUID,                         -- 上传用户
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);
```

## 邮件状态

| 状态 | 说明 |
|------|------|
| pending | 等待发送 |
| sent | 已发送成功 |
| failed | 发送失败 |

## 邮件优先级

| 优先级 | 说明 |
|--------|------|
| low | 低优先级 |
| normal | 普通优先级 |
| high | 高优先级 |
