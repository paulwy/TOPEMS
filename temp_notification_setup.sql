-- 临时设置 notification schema 的 SQL 脚本
-- 创建 notification schema (如果不存在)
CREATE SCHEMA IF NOT EXISTS notification;

-- 授予权限
GRANT ALL ON SCHEMA notification TO topems;

-- 设置搜索路径
SET search_path TO notification, public;

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================
-- 通知表
-- =============================================================
CREATE TABLE IF NOT EXISTS notification.notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    notification_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'unread',
    action_url VARCHAR(500),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 邮件模板表
-- =============================================================
CREATE TABLE IF NOT EXISTS notification.email_templates (
    id UUID PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 短信模板表
-- =============================================================
CREATE TABLE IF NOT EXISTS notification.sms_templates (
    id UUID PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- 邮件日志表
-- =============================================================
CREATE TABLE IF NOT EXISTS notification.email_logs (
    id UUID PRIMARY KEY,
    from_email VARCHAR(255) NOT NULL,
    to_email VARCHAR(255) NOT NULL,
    cc_email VARCHAR(500),
    bcc_email VARCHAR(500),
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    template_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (template_id) REFERENCES notification.email_templates(id)
);

-- =============================================================
-- 创建索引
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notification.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notification.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notification.notifications(notification_type);

CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON notification.email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON notification.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON notification.email_logs(created_at);

-- =============================================================
-- 授予权限
-- =============================================================
GRANT ALL PRIVILEGES ON SCHEMA notification TO topems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA notification TO topems;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA notification TO topems;
ALTER DEFAULT PRIVILEGES IN SCHEMA notification GRANT ALL PRIVILEGES ON TABLES TO topems;
ALTER DEFAULT PRIVILEGES IN SCHEMA notification GRANT ALL PRIVILEGES ON SEQUENCES TO topems;

-- =============================================================
-- 插入一些测试数据
-- =============================================================
INSERT INTO notification.notifications (id, user_id, title, content, notification_type, status, created_at, updated_at) 
VALUES 
    ('a1b2c3d4-1234-5678-90ab-cdef01234567', '11111111-1111-1111-1111-111111111111', '系统升级通知', '系统将于今晚 22:00-24:00 进行系统升级，升级期间系统将无法使用。', 'system', 'unread', NOW(), NOW()),
    ('b2c3d4e5-2345-6789-01ab-cdef01234568', '11111111-1111-1111-1111-111111111111', '审批提醒', '您有 3 个待审批事项，请及时处理。', 'workflow', 'unread', NOW(), NOW()),
    ('c3d4e5f6-3456-7890-12ab-cdef01234569', '11111111-1111-1111-1111-111111111111', '新功能上线', '项目管理模块新功能已上线，欢迎体验！', 'system', 'read', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

-- =============================================================
-- 完成
-- =============================================================
SELECT 'Notification schema setup complete!' AS status;
