CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS mail;

CREATE TABLE IF NOT EXISTS mail.templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE TABLE IF NOT EXISTS mail.emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

CREATE INDEX IF NOT EXISTS idx_mail_templates_code ON mail.templates(code);
CREATE INDEX IF NOT EXISTS idx_mail_templates_category ON mail.templates(category);
CREATE INDEX IF NOT EXISTS idx_mail_templates_status ON mail.templates(status);
CREATE INDEX IF NOT EXISTS idx_mail_emails_status ON mail.emails(status);
CREATE INDEX IF NOT EXISTS idx_mail_emails_priority ON mail.emails(priority);
CREATE INDEX IF NOT EXISTS idx_mail_emails_created_at ON mail.emails(created_at DESC);

INSERT INTO mail.templates (code, name, description, subject_template, body_template, category, status)
VALUES 
    ('workflow_approval', '流程审批通知', '流程审批结果通知邮件模板', 
     '【TOPEMS】流程审批通知 - {{process_name}}', 
     '尊敬的{{user_name}}：\n\n您的流程【{{process_name}}】已{{approval_status}}。\n\n审批人：{{approver_name}}\n审批时间：{{approval_time}}\n审批意见：{{approval_comment}}\n\n如需查看详情，请登录系统查看。\n\nTOPEMS 系统', 'workflow', 'active'),
    ('system_alert', '系统告警通知', '系统告警通知邮件模板',
     '【TOPEMS】系统告警 - {{alert_type}}',
     '尊敬的管理员：\n\n系统检测到以下告警：\n\n告警类型：{{alert_type}}\n告警级别：{{alert_level}}\n告警时间：{{alert_time}}\n告警详情：{{alert_message}}\n\n请及时处理。\n\nTOPEMS 系统', 'system', 'active'),
    ('contract_notification', '合同通知', '合同相关通知邮件模板',
     '【TOPEMS】合同{{contract_action}}通知',
     '尊敬的{{user_name}}：\n\n合同【{{contract_name}}】已{{contract_action}}。\n\n合同编号：{{contract_no}}\n{{contract_action}}时间：{{action_time}}\n\n请登录系统查看详情。\n\nTOPEMS 系统', 'contract', 'active'),
    ('user_register', '用户注册通知', '新用户注册通知邮件模板',
     '【TOPEMS】欢迎注册',
     '尊敬的{{user_name}}：\n\n欢迎注册 TOPEMS 系统！\n\n用户名：{{username}}\n注册时间：{{register_time}}\n\n请登录系统完成后续操作。\n\nTOPEMS 系统', 'user', 'active'),
    ('password_reset', '密码重置通知', '密码重置邮件模板',
     '【TOPEMS】密码重置请求',
     '尊敬的{{user_name}}：\n\n您已申请重置密码。\n\n重置链接：{{reset_link}}\n链接有效期：{{expire_time}}\n\n如果这不是您的操作，请忽略此邮件。\n\nTOPEMS 系统', 'user', 'active')
ON CONFLICT (code) DO NOTHING;
