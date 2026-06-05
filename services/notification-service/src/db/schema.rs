pub struct DatabaseSchema;

impl DatabaseSchema {
    pub fn create_notifications_table() -> &'static str {
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
        )
        "#
    }

    pub fn create_templates_table() -> &'static str {
        r#"
        CREATE TABLE IF NOT EXISTS notification_templates (
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
        )
        "#
    }

    pub fn create_archived_table() -> &'static str {
        r#"
        CREATE TABLE IF NOT EXISTS archived_notifications (
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
        )
        "#
    }

    pub fn create_archive_config_table() -> &'static str {
        r#"
        CREATE TABLE IF NOT EXISTS archive_config (
            id SERIAL PRIMARY KEY,
            auto_archive_days INT NOT NULL DEFAULT 30,
            retention_days INT NOT NULL DEFAULT 365,
            enabled BOOLEAN NOT NULL DEFAULT TRUE,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        "#
    }

    pub fn insert_default_archive_config() -> &'static str {
        r#"
        INSERT INTO archive_config (auto_archive_days, retention_days, enabled)
        VALUES (30, 365, TRUE)
        ON CONFLICT DO NOTHING
        "#
    }

    pub fn create_index_user_id() -> &'static str {
        "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)"
    }

    pub fn create_index_is_read() -> &'static str {
        "CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)"
    }

    pub fn create_index_created_at() -> &'static str {
        "CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)"
    }

    pub fn migrate_add_is_read_column() -> &'static str {
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE"
    }

    pub fn migrate_add_read_at_column() -> &'static str {
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ"
    }

    pub fn migrate_add_priority_column() -> &'static str {
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority SMALLINT NOT NULL DEFAULT 2"
    }

    pub fn migrate_add_data_column() -> &'static str {
        "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB"
    }

    pub fn create_all_indexes() -> &'static str {
        r#"
        -- 通知表索引
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
        
        -- 通知模板表索引
        CREATE INDEX IF NOT EXISTS idx_templates_name ON notification_templates(name);
        CREATE INDEX IF NOT EXISTS idx_templates_type ON notification_templates(notification_type);
        CREATE INDEX IF NOT EXISTS idx_templates_status ON notification_templates(status);
        CREATE INDEX IF NOT EXISTS idx_templates_archived ON notification_templates(is_archived);
        
        -- 归档通知表索引
        CREATE INDEX IF NOT EXISTS idx_archived_user_id ON archived_notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_archived_original_id ON archived_notifications(original_notification_id);
        CREATE INDEX IF NOT EXISTS idx_archived_created_at ON archived_notifications(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_archived_at ON archived_notifications(archived_at DESC);
        "#
    }
}
