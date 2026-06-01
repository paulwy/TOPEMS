-- Create notification schema
CREATE SCHEMA IF NOT EXISTS notification;

-- Create notifications table
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

-- Create email templates table
CREATE TABLE IF NOT EXISTS notification.email_templates (
    id UUID PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create SMS templates table
CREATE TABLE IF NOT EXISTS notification.sms_templates (
    id UUID PRIMARY KEY,
    template_name VARCHAR(100) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create email logs table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notification.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notification.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notification.notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON notification.email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON notification.email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON notification.email_logs(created_at);

-- Grant privileges
GRANT ALL PRIVILEGES ON SCHEMA notification TO topems;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA notification TO topems;
