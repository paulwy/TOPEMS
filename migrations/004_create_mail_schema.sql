-- 邮件服务数据库迁移脚本
-- 创建于 2024

-- 创建 mail schema
CREATE SCHEMA IF NOT EXISTS mail;

-- 邮件模板表
CREATE TABLE IF NOT EXISTS mail.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    body_html_template TEXT,
    variables JSONB DEFAULT '[]',
    created_by UUID,
    updated_by UUID,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mail_templates_code ON mail.templates(code);
CREATE INDEX idx_mail_templates_status ON mail.templates(status);

-- 邮件发送记录表
CREATE TABLE IF NOT EXISTS mail.emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject VARCHAR(500) NOT NULL,
    from_address VARCHAR(255) NOT NULL,
    to_addresses JSONB NOT NULL,
    cc_addresses JSONB,
    bcc_addresses JSONB,
    body TEXT NOT NULL,
    body_html TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'normal',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    template_id UUID REFERENCES mail.templates(id),
    template_data JSONB,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mail_emails_status ON mail.emails(status);
CREATE INDEX idx_mail_emails_priority ON mail.emails(priority);
CREATE INDEX idx_mail_emails_created_at ON mail.emails(created_at DESC);
CREATE INDEX idx_mail_emails_template_id ON mail.emails(template_id);

-- 邮件发送统计视图
CREATE OR REPLACE VIEW mail.email_stats AS
SELECT
    status,
    COUNT(*) as count,
    AVG(CASE WHEN sent_at IS NOT NULL THEN EXTRACT(EPOCH FROM (sent_at - created_at)) END) as avg_send_time_seconds
FROM mail.emails
GROUP BY status;

-- 插入默认模板
INSERT INTO mail.templates (code, name, subject_template, body_template, variables, status)
VALUES
    ('welcome_email', '欢迎邮件', '欢迎加入 {{company_name}}', '亲爱的 {{user_name}}，\n\n欢迎加入我们的团队！\n\n您的入职日期：{{hire_date}}\n\n祝您工作愉快！', '["company_name", "user_name", "hire_date"]', 'active'),
    ('password_reset', '密码重置', '重置您的密码', '亲爱的 {{user_name}}，\n\n请点击以下链接重置您的密码：\n{{reset_link}}\n\n链接有效期：{{expiry_time}}', '["user_name", "reset_link", "expiry_time"]', 'active'),
    ('leave_approval', '请假审批通知', '请假申请已{{status}}', '您的请假申请已{{status}}。\n\n请假类型：{{leave_type}}\n开始日期：{{start_date}}\n结束日期：{{end_date}}\n\n{{comments}}', '["status", "leave_type", "start_date", "end_date", "comments"]', 'active')
ON CONFLICT (code) DO NOTHING;
