-- Create the notification schema
CREATE SCHEMA IF NOT EXISTS notification;

-- Notifications table
CREATE TABLE IF NOT EXISTS notification.notifications (
    id UUID PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    priority SMALLINT NOT NULL DEFAULT 2,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
);

-- Notification templates table
CREATE TABLE IF NOT EXISTS notification.notification_templates (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    notification_type VARCHAR(50) NOT NULL,
    title_template TEXT NOT NULL,
    content_template TEXT NOT NULL,
    data_schema JSONB,
    default_priority SMALLINT NOT NULL DEFAULT 2,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Archived notifications table
CREATE TABLE IF NOT EXISTS notification.archived_notifications (
    id UUID PRIMARY KEY,
    original_notification_id UUID NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    data JSONB,
    priority SMALLINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    read_at TIMESTAMPTZ,
    archived_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Archive configuration table
CREATE TABLE IF NOT EXISTS notification.archive_config (
    id SERIAL PRIMARY KEY,
    auto_archive_days INT NOT NULL DEFAULT 30,
    retention_days INT NOT NULL DEFAULT 365,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert default archive config
INSERT INTO notification.archive_config (auto_archive_days, retention_days, enabled)
VALUES (30, 365, TRUE)
ON CONFLICT DO NOTHING;

-- Create indexes for notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notification.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notification.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notification.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notification.notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notification.notifications(user_id, is_read);

-- Create indexes for notification_templates table
CREATE INDEX IF NOT EXISTS idx_templates_name ON notification.notification_templates(name);
CREATE INDEX IF NOT EXISTS idx_templates_type ON notification.notification_templates(notification_type);
CREATE INDEX IF NOT EXISTS idx_templates_status ON notification.notification_templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_archived ON notification.notification_templates(is_archived);

-- Create indexes for archived_notifications table
CREATE INDEX IF NOT EXISTS idx_archived_user_id ON notification.archived_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_archived_original_id ON notification.archived_notifications(original_notification_id);
CREATE INDEX IF NOT EXISTS idx_archived_created_at ON notification.archived_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_archived_at ON notification.archived_notifications(archived_at DESC);