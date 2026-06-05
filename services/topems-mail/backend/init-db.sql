-- 邮件服务数据库初始化脚本
-- 使用方式: psql -h localhost -U topems -d topems -f init-db.sql

-- 创建 mail schema
CREATE SCHEMA IF NOT EXISTS mail;

-- 创建邮件模板表
CREATE TABLE IF NOT EXISTS mail.templates (
    id UUID PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    body_html_template TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'general',
    tags JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建邮件表
CREATE TABLE IF NOT EXISTS mail.emails (
    id UUID PRIMARY KEY,
    subject VARCHAR(500) NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    to_addresses JSONB NOT NULL,
    cc_addresses JSONB,
    bcc_addresses JSONB,
    body TEXT NOT NULL,
    body_html TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority VARCHAR(20) NOT NULL DEFAULT 'normal',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    template_id UUID REFERENCES mail.templates(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_mail_templates_code ON mail.templates(code);
CREATE INDEX IF NOT EXISTS idx_mail_templates_category ON mail.templates(category);
CREATE INDEX IF NOT EXISTS idx_mail_templates_status ON mail.templates(status);
CREATE INDEX IF NOT EXISTS idx_mail_emails_status ON mail.emails(status);
CREATE INDEX IF NOT EXISTS idx_mail_emails_priority ON mail.emails(priority);
CREATE INDEX IF NOT EXISTS idx_mail_emails_created_at ON mail.emails(created_at DESC);

-- 授予权限
GRANT ALL PRIVILEGES ON SCHEMA mail TO topems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mail TO topems;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mail TO topems;

-- 插入默认模板数据
INSERT INTO mail.templates (id, code, name, description, subject_template, body_template, category, status)
VALUES 
    (gen_random_uuid(), 'workflow_approval', '流程审批通知', '流程审批结果通知邮件模板', 
     '【TOPEMS】流程审批通知 - {{process_name}}', 
     '尊敬的{{user_name}}：

您的流程【{{process_name}}】已{{approval_status}}。

审批人：{{approver_name}}
审批时间：{{approval_time}}
审批意见：{{approval_comment}}

如需查看详情，请登录系统查看。

TOPEMS 系统', 'workflow', 'active'),
    (gen_random_uuid(), 'system_alert', '系统告警通知', '系统告警通知邮件模板',
     '【TOPEMS】系统告警 - {{alert_type}}',
     '尊敬的管理员：

系统检测到以下告警：

告警类型：{{alert_type}}
告警级别：{{alert_level}}
告警时间：{{alert_time}}
告警详情：{{alert_message}}

请及时处理。

TOPEMS 系统', 'system', 'active'),
    (gen_random_uuid(), 'contract_notification', '合同通知', '合同相关通知邮件模板',
     '【TOPEMS】合同{{contract_action}}通知',
     '尊敬的{{user_name}}：

合同【{{contract_name}}】已{{contract_action}}。

合同编号：{{contract_no}}
{{contract_action}}时间：{{action_time}}

请登录系统查看详情。

TOPEMS 系统', 'contract', 'active'),
    (gen_random_uuid(), 'user_register', '用户注册通知', '新用户注册通知邮件模板',
     '【TOPEMS】欢迎注册',
     '尊敬的{{user_name}}：

欢迎注册 TOPEMS 系统！

用户名：{{username}}
注册时间：{{register_time}}

请登录系统完成后续操作。

TOPEMS 系统', 'user', 'active'),
    (gen_random_uuid(), 'password_reset', '密码重置通知', '密码重置邮件模板',
     '【TOPEMS】密码重置请求',
     '尊敬的{{user_name}}：

您已申请重置密码。

重置链接：{{reset_link}}
链接有效期：{{expire_time}}

如果这不是您的操作，请忽略此邮件。

TOPEMS 系统', 'user', 'active')
ON CONFLICT (code) DO NOTHING;

-- 输出结果
SELECT '✅ 邮件服务数据库表初始化完成' as result;