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
    // ==================== 聊天室表 ====================
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

    // ==================== 聊天室成员表 ====================
    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS chat_room_members (
            id UUID PRIMARY KEY,
            chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
            user_id VARCHAR(100) NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'member',
            joined_at TIMESTAMP NOT NULL,
            last_read_at TIMESTAMP,
            UNIQUE(chat_room_id, user_id)
        )
        "#
    )
    .execute(pool)
    .await?;

    // ==================== 消息表 ====================
    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY,
            chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
            sender_id VARCHAR(100) NOT NULL,
            sender_name VARCHAR(100) NOT NULL,
            receiver_id VARCHAR(100),
            message_type VARCHAR(20) NOT NULL,
            content TEXT NOT NULL,
            file_url VARCHAR(500),
            file_name VARCHAR(255),
            file_size BIGINT,
            reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
            forwarded_from_id UUID REFERENCES messages(id) ON DELETE SET NULL,
            is_read BOOLEAN NOT NULL DEFAULT FALSE,
            is_edited BOOLEAN NOT NULL DEFAULT FALSE,
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP
        )
        "#
    )
    .execute(pool)
    .await?;

    // ==================== 消息已读回执表 ====================
    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS message_read_receipts (
            id UUID PRIMARY KEY,
            message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
            user_id VARCHAR(100) NOT NULL,
            read_at TIMESTAMP NOT NULL,
            UNIQUE(message_id, user_id)
        )
        "#
    )
    .execute(pool)
    .await?;

    // ==================== 联系人表 ====================
    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS contacts (
            id UUID PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            contact_user_id VARCHAR(100) NOT NULL,
            contact_name VARCHAR(100) NOT NULL,
            contact_avatar VARCHAR(500),
            alias VARCHAR(100),
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
            group_id UUID REFERENCES contact_groups(id) ON DELETE SET NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL,
            UNIQUE(user_id, contact_user_id)
        )
        "#
    )
    .execute(pool)
    .await?;

    // ==================== 文件传输表 ====================
    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS file_transfers (
            id UUID PRIMARY KEY,
            file_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500) NOT NULL,
            file_size BIGINT NOT NULL,
            content_type VARCHAR(100) NOT NULL,
            uploader_id VARCHAR(100) NOT NULL,
            uploader_name VARCHAR(100) NOT NULL,
            chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE SET NULL,
            message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
            is_shared BOOLEAN NOT NULL DEFAULT FALSE,
            share_link VARCHAR(100),
            download_count BIGINT NOT NULL DEFAULT 0,
            expires_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )
        "#
    )
    .execute(pool)
    .await?;

    // ==================== 用户状态表 ====================
    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS user_status (
            user_id VARCHAR(100) PRIMARY KEY,
            is_online BOOLEAN NOT NULL DEFAULT FALSE,
            status_type VARCHAR(20) NOT NULL DEFAULT 'offline',
            status_message VARCHAR(255),
            last_seen TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
        )
        "#
    )
    .execute(pool)
    .await?;

    // ==================== 审计日志表 ====================
    sqlx::query!(
        r#"
        CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY,
            user_id VARCHAR(100) NOT NULL,
            action VARCHAR(50) NOT NULL,
            resource_type VARCHAR(50) NOT NULL,
            resource_id UUID,
            details JSONB NOT NULL,
            ip_address VARCHAR(50),
            created_at TIMESTAMP NOT NULL
        )
        "#
    )
    .execute(pool)
    .await?;

    // ==================== 项目群组表 ====================
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

    // ==================== 通知表 ====================
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

    // ==================== 好友表 ====================
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

    // ==================== 联系人分组表 ====================
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

    // ==================== 联系人分组成员表 ====================
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

    // ==================== 创建索引 ====================
    
    // 聊天室索引
    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_chat_rooms_created_by ON chat_rooms(created_by)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_chat_room_members_chat_room_id ON chat_room_members(chat_room_id)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_chat_room_members_user_id ON chat_room_members(user_id)
        "#
    )
    .execute(pool)
    .await?;

    // 消息索引
    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_messages_chat_room_id ON messages(chat_room_id)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read)
        "#
    )
    .execute(pool)
    .await?;

    // 消息已读回执索引
    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_message_read_receipts_message_id ON message_read_receipts(message_id)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_message_read_receipts_user_id ON message_read_receipts(user_id)
        "#
    )
    .execute(pool)
    .await?;

    // 联系人索引
    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_contacts_contact_user_id ON contacts(contact_user_id)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_contacts_is_blocked ON contacts(is_blocked)
        "#
    )
    .execute(pool)
    .await?;

    // 文件传输索引
    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_file_transfers_uploader_id ON file_transfers(uploader_id)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_file_transfers_chat_room_id ON file_transfers(chat_room_id)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_file_transfers_created_at ON file_transfers(created_at)
        "#
    )
    .execute(pool)
    .await?;

    // 用户状态索引
    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_user_status_is_online ON user_status(is_online)
        "#
    )
    .execute(pool)
    .await?;

    // 审计日志索引
    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)
        "#
    )
    .execute(pool)
    .await?;

    // 通知索引
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

    // 好友索引
    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status)
        "#
    )
    .execute(pool)
    .await?;

    // 联系人分组索引
    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_contact_groups_user_id ON contact_groups(user_id)
        "#
    )
    .execute(pool)
    .await?;

    sqlx::query!(
        r#"
        CREATE INDEX IF NOT EXISTS idx_contact_group_members_group_id ON contact_group_members(group_id)
        "#
    )
    .execute(pool)
    .await?;

    Ok(())
}