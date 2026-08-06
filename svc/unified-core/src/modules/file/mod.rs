//! File module - File Storage and Management

pub mod download;
pub mod manage;
pub mod upload;

use sqlx::PgPool;

/// Initialize File database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_files (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(256) NOT NULL,
            original_name VARCHAR(256),
            path VARCHAR(512) NOT NULL,
            size BIGINT NOT NULL,
            mime_type VARCHAR(128),
            extension VARCHAR(32),
            folder_id UUID,
            uploader_id UUID NOT NULL,
            status VARCHAR(32) DEFAULT 'active',
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            deleted_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    // 兼容旧表：确保 is_deleted 列存在
    sqlx::query(
        "ALTER TABLE core_files ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE",
    )
    .execute(pool)
    .await?;
    sqlx::query("ALTER TABLE core_files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP")
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_file_folders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            parent_id UUID,
            owner_id UUID NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_file_permissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            file_id UUID NOT NULL,
            user_id UUID NOT NULL,
            permission VARCHAR(16) NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            UNIQUE (file_id, user_id)
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_files_folder ON core_files(folder_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_files_uploader ON core_files(uploader_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_files_is_deleted ON core_files(is_deleted)")
        .execute(pool)
        .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_file_permissions_file ON core_file_permissions(file_id)",
    )
    .execute(pool)
    .await?;
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_core_file_permissions_user ON core_file_permissions(user_id)",
    )
    .execute(pool)
    .await?;

    Ok(())
}
