pub struct DatabaseSchema;

impl DatabaseSchema {
    pub fn init_tables() -> &'static str {
        r#"
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
        "#
    }
}
