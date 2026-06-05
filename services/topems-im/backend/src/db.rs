use sqlx::postgres::PgPoolOptions;
use sqlx::PgPool;
use anyhow::Result;

pub async fn create_pool(database_url: &str) -> Result<PgPool> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await?;
    
    Ok(pool)
}

pub async fn run_migrations(pool: &PgPool) -> Result<()> {
    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS chat_rooms (
            id UUID PRIMARY KEY,
            name VARCHAR(255),
            room_type VARCHAR(20) NOT NULL,
            members JSONB NOT NULL,
            created_by VARCHAR(100) NOT NULL,
            last_message TEXT,
            last_message_time TIMESTAMP,
            is_muted BOOLEAN NOT NULL DEFAULT FALSE,
            is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS chat_messages (
            id UUID PRIMARY KEY,
            chat_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
            sender_id VARCHAR(100) NOT NULL,
            sender_name VARCHAR(100) NOT NULL,
            message_type VARCHAR(20) NOT NULL,
            content TEXT NOT NULL,
            file_url VARCHAR(500),
            file_name VARCHAR(255),
            created_at TIMESTAMP NOT NULL,
            is_read BOOLEAN NOT NULL DEFAULT FALSE
        )
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS project_groups (
            id UUID PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            project_id UUID,
            members JSONB NOT NULL,
            created_by VARCHAR(100) NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            notification_type VARCHAR(50) NOT NULL,
            related_id UUID,
            related_type VARCHAR(50),
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL
        )
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS user_online_status (
            user_id VARCHAR(100) PRIMARY KEY,
            is_online BOOLEAN NOT NULL DEFAULT FALSE,
            last_seen TIMESTAMP NOT NULL
        )
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS friends (
            id UUID PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            friend_id VARCHAR(100) NOT NULL,
            friend_name VARCHAR(100) NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL,
            UNIQUE(user_id, friend_id)
        )
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS contact_groups (
            id UUID PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            name VARCHAR(100) NOT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS contact_group_members (
            id UUID PRIMARY KEY,
            group_id UUID NOT NULL REFERENCES contact_groups(id) ON DELETE CASCADE,
            user_id VARCHAR(100) NOT NULL,
            created_at TIMESTAMP NOT NULL
        )
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_contact_groups_user_id ON contact_groups(user_id)
        "#
    )
    .execute(pool)
    .await?;

    Ok(())
}
