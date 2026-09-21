use sqlx::{PgPool, Result};
use uuid::Uuid;

use super::super::models::{CreateDocumentRequest, Document, UpdateDocumentRequest};

pub struct DocumentService {
    pool: PgPool,
}

impl DocumentService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn list_documents(&self, tenant_id: Uuid) -> Result<Vec<Document>> {
        sqlx::query_as::<_, Document>(
            r#"SELECT id, tenant_id, name, description, document_type, file_path, file_size, version, folder_id, status, created_by, created_at, updated_at, deleted_at FROM core_doc_documents WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) ORDER BY created_at DESC"#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn get_document(
        &self,
        tenant_id: Uuid,
        document_id: Uuid,
    ) -> Result<Option<Document>> {
        sqlx::query_as::<_, Document>(
            r#"SELECT id, tenant_id, name, description, document_type, file_path, file_size, version, folder_id, status, created_by, created_at, updated_at, deleted_at FROM core_doc_documents WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND id = $2"#,
        )
        .bind(tenant_id)
        .bind(document_id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn create_document(
        &self,
        tenant_id: Uuid,
        req: CreateDocumentRequest,
        created_by: &str,
    ) -> Result<Document> {
        let id = Uuid::new_v4();
        sqlx::query_as::<_, Document>(
            r#"
            INSERT INTO core_doc_documents (id, tenant_id, title, folder_id, template_id, content, content_type, status, tags, description, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            "#,
        )
        .bind(id)
        .bind(tenant_id)
        .bind(req.title)
        .bind(req.folder_id)
        .bind(req.template_id)
        .bind(req.content)
        .bind(req.content_type.unwrap_or_else(|| "html".to_string()))
        .bind(req.status.unwrap_or_else(|| "draft".to_string()))
        .bind(req.tags)
        .bind(req.description)
        .bind(Some(created_by.to_string()))
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_document(
        &self,
        tenant_id: Uuid,
        document_id: Uuid,
        req: UpdateDocumentRequest,
    ) -> Result<Option<Document>> {
        sqlx::query_as::<_, Document>(
            r#"
            UPDATE core_doc_documents 
            SET title = COALESCE($1, title), folder_id = COALESCE($2, folder_id), 
                content = COALESCE($3, content), tags = COALESCE($4, tags), 
                description = COALESCE($5, description), updated_at = NOW()
            WHERE tenant_id = $6 AND id = $7
            RETURNING *
            "#,
        )
        .bind(req.title)
        .bind(req.folder_id)
        .bind(req.content)
        .bind(req.tags)
        .bind(req.description)
        .bind(tenant_id)
        .bind(document_id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn delete_document(&self, tenant_id: Uuid, document_id: Uuid) -> Result<bool> {
        let result = sqlx::query(
            r#"UPDATE core_doc_documents SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2"#,
        )
        .bind(tenant_id)
        .bind(document_id)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }
}

pub async fn init_database(pool: &PgPool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_doc_documents (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID NOT NULL,
            title VARCHAR(200) NOT NULL,
            folder_id UUID REFERENCES core_doc_folders(id),
            template_id UUID REFERENCES core_doc_templates(id),
            content TEXT,
            content_type VARCHAR(50) DEFAULT 'html',
            status VARCHAR(20) DEFAULT 'draft',
            version INTEGER DEFAULT 1,
            tags TEXT[],
            description TEXT,
            file_name VARCHAR(200),
            file_path VARCHAR(500),
            file_size BIGINT,
            mime_type VARCHAR(100),
            published_at TIMESTAMPTZ,
            published_by VARCHAR(100),
            archived_at TIMESTAMPTZ,
            archived_by VARCHAR(100),
            created_by VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
                deleted_at TIMESTAMP
        )
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}
