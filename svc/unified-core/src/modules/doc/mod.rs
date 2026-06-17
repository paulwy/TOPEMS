//! Doc module - Document Management

pub mod document;
pub mod template;
pub mod folder;

use sqlx::PgPool;

/// Initialize Doc database tables
pub async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            title VARCHAR(256) NOT NULL,
            content TEXT,
            content_type VARCHAR(64),
            folder_id UUID,
            author_id UUID NOT NULL,
            status VARCHAR(32) DEFAULT 'draft',
            version INTEGER DEFAULT 1,
            tags TEXT[],
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW(),
            published_at TIMESTAMP,
            archived_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_doc_folders (
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
        CREATE TABLE IF NOT EXISTS core_doc_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            description TEXT,
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

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_documents_folder ON core_documents(folder_id)")
        .execute(pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_core_documents_author ON core_documents(author_id)")
        .execute(pool)
        .await?;

    Ok(())
}