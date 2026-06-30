use sqlx::{PgPool, Result};
use uuid::Uuid;

use crate::models::{CreateDocumentRequest, Document, UpdateDocumentRequest};

pub struct DocumentService {
    pool: std::sync::Arc<PgPool>,
}

impl DocumentService {
    pub fn new(pool: std::sync::Arc<PgPool>) -> Self {
        Self { pool }
    }

    pub async fn list_documents(&self) -> Result<Vec<Document>> {
        sqlx::query_as!(
            Document,
            r#"SELECT * FROM doc.documents ORDER BY created_at DESC"#
        )
        .fetch_all(&*self.pool)
        .await
    }

    pub async fn get_document(&self, document_id: Uuid) -> Result<Option<Document>> {
        sqlx::query_as!(
            Document,
            r#"SELECT * FROM doc.documents WHERE id = $1"#,
            document_id
        )
        .fetch_optional(&*self.pool)
        .await
    }

    pub async fn create_document(
        &self,
        req: CreateDocumentRequest,
        created_by: &str,
    ) -> Result<Document> {
        let id = Uuid::new_v4();
        let tags = req.tags.as_ref().map(|t| t.as_slice());
        sqlx::query_as!(
            Document,
            r#"
            INSERT INTO doc.documents (id, title, folder_id, template_id, content, content_type, status, tags, description, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
            "#,
            id,
            req.title,
            req.folder_id,
            req.template_id,
            req.content,
            req.content_type.unwrap_or_else(|| "html".to_string()),
            req.status.unwrap_or_else(|| "draft".to_string()),
            tags,
            req.description,
            Some(created_by.to_string())
        )
        .fetch_one(&*self.pool)
        .await
    }

    pub async fn update_document(
        &self,
        document_id: Uuid,
        req: UpdateDocumentRequest,
    ) -> Result<Option<Document>> {
        let tags = req.tags.as_ref().map(|t| t.as_slice());
        sqlx::query_as!(
            Document,
            r#"
            UPDATE doc.documents
            SET title = COALESCE($2, title),
                folder_id = COALESCE($3, folder_id),
                content = COALESCE($4, content),
                tags = COALESCE($5, tags),
                description = COALESCE($6, description),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
            document_id,
            req.title,
            req.folder_id,
            req.content,
            tags,
            req.description
        )
        .fetch_optional(&*self.pool)
        .await
    }

    pub async fn delete_document(&self, document_id: Uuid) -> Result<bool> {
        let result = sqlx::query!(r#"DELETE FROM doc.documents WHERE id = $1"#, document_id)
            .execute(&*self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}

pub async fn init_database(pool: &PgPool) -> Result<()> {
    sqlx::query(r#"CREATE SCHEMA IF NOT EXISTS doc;"#)
        .execute(pool)
        .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS doc.documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            title VARCHAR(500) NOT NULL,
            folder_id UUID REFERENCES doc.folders(id),
            template_id UUID REFERENCES doc.templates(id),
            content TEXT,
            content_type VARCHAR(50) DEFAULT 'html',
            status VARCHAR(50) DEFAULT 'draft',
            version INTEGER DEFAULT 1,
            tags TEXT[],
            description TEXT,
            file_name VARCHAR(500),
            file_path TEXT,
            file_size BIGINT,
            mime_type VARCHAR(100),
            published_at TIMESTAMPTZ,
            published_by VARCHAR(100),
            archived_at TIMESTAMPTZ,
            archived_by VARCHAR(100),
            created_by VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS doc.document_versions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            document_id UUID NOT NULL REFERENCES doc.documents(id) ON DELETE CASCADE,
            version INTEGER NOT NULL,
            content TEXT,
            content_type VARCHAR(50) DEFAULT 'html',
            change_log TEXT,
            created_by VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(document_id, version)
        )
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}
