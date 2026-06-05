CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    priority SMALLINT NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 通知模板表
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    notification_type VARCHAR(50) NOT NULL,
    title_template TEXT NOT NULL,
    content_template TEXT NOT NULL,
    data_schema JSONB,
    default_priority SMALLINT NOT NULL DEFAULT 2,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_templates_status ON notification_templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_type ON notification_templates(notification_type);

-- 归档通知表
CREATE TABLE IF NOT EXISTS archived_notifications (
    id UUID PRIMARY KEY,
    original_notification_id UUID,
    user_id VARCHAR(100) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    data JSONB,
    priority SMALLINT,
    created_at TIMESTAMPTZ NOT NULL,
    read_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_archived_user_id ON archived_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_archived_at ON archived_notifications(archived_at DESC);

-- 归档配置表
CREATE TABLE IF NOT EXISTS archive_config (
    id SERIAL PRIMARY KEY,
    auto_archive_days INTEGER NOT NULL DEFAULT 30,
    retention_days INTEGER NOT NULL DEFAULT 90,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认配置
INSERT INTO archive_config (auto_archive_days, retention_days, enabled)
VALUES (30, 90, TRUE)
ON CONFLICT DO NOTHING;
