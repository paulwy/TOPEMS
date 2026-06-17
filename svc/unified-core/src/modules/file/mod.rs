//! File module - File Storage and Management

pub mod upload;
pub mod download;
pub mod manage;
pub mod folder;

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
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
        "#,
    )
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

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_files_folder ON core_files(folder_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_files_uploader ON core_files(uploader_id)")
        .execute(pool)
        .await?;

    Ok(())
}