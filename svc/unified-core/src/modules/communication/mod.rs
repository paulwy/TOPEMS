//! Communication module - Unified Messaging (Notification + IM + Mail)

pub mod notification;
pub mod im;
pub mod mail;
pub mod ws;

use sqlx::PgPool;

/// Initialize Communication database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    // Notifications table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_notifications (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            title VARCHAR(256) NOT NULL,
            content TEXT,
            notification_type VARCHAR(64) DEFAULT 'info',
            is_read BOOLEAN DEFAULT FALSE,
            priority INTEGER DEFAULT 0,
            data JSONB,
            created_at TIMESTAMP DEFAULT NOW(),
            read_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    // IM Chat Rooms table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_chat_rooms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128),
            room_type VARCHAR(32) DEFAULT 'private',
            creator_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // IM Chat Members table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_chat_members (
            room_id UUID NOT NULL REFERENCES core_chat_rooms(id),
            user_id UUID NOT NULL,
            role VARCHAR(32) DEFAULT 'member',
            joined_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (room_id, user_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    // IM Messages table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_chat_messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            room_id UUID NOT NULL REFERENCES core_chat_rooms(id),
            sender_id UUID NOT NULL,
            sender_name VARCHAR(128),
            message_type VARCHAR(32) DEFAULT 'text',
            content TEXT NOT NULL,
            file_url VARCHAR(512),
            is_recalled BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Mail Emails table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_emails (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            from_address VARCHAR(256) NOT NULL,
            to_addresses TEXT[] NOT NULL,
            cc_addresses TEXT[],
            subject VARCHAR(512),
            body TEXT,
            is_read BOOLEAN DEFAULT FALSE,
            is_starred BOOLEAN DEFAULT FALSE,
            folder VARCHAR(32) DEFAULT 'inbox',
            user_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Mail Templates table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_mail_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            subject VARCHAR(512),
            content TEXT NOT NULL,
            variables JSONB,
            created_by UUID NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // Create indexes
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_notifications_user ON core_notifications(user_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_chat_rooms_members ON core_chat_members(user_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_chat_messages_room ON core_chat_messages(room_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_emails_user ON core_emails(user_id)")
        .execute(pool)
        .await?;

    Ok(())
}