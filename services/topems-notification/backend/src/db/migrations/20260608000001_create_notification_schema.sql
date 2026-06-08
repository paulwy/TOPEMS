CREATE SCHEMA IF NOT EXISTS notification;

CREATE TABLE IF NOT EXISTS notification.notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    notification_type VARCHAR(50) DEFAULT 'info',
    priority INTEGER DEFAULT 1,
    data JSONB,
    link_url VARCHAR(500),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notification.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notification.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notification.notifications(created_at DESC);

GRANT ALL ON SCHEMA notification TO topems;
GRANT ALL ON ALL TABLES IN SCHEMA notification TO topems;
GRANT ALL ON ALL SEQUENCES IN SCHEMA notification TO topems;
