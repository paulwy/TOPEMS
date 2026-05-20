use sqlx::postgres::PgPool;
use crate::models::{FileMetadata, Folder, FileVersion};

pub struct FileRepository {
    pool: PgPool,
}

impl FileRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_file(&self, file: &FileMetadata) -> Result<FileMetadata, sqlx::Error> {
        sqlx::query_as!(
            FileMetadata,
            r#"
            INSERT INTO files (id, name, folder_id, size, content_type, created_at, updated_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, folder_id, size, content_type, created_at, updated_at, created_by
            "#,
            file.id,
            file.name,
            file.folder_id,
            file.size,
            file.content_type,
            file.created_at,
            file.updated_at,
            file.created_by
        )
        .fetch_one(&self.pool)
        .await
    }

    pub async fn get_file(&self, id: uuid::Uuid) -> Result<Option<FileMetadata>, sqlx::Error> {
        sqlx::query_as!(
            FileMetadata,
            r#"
            SELECT id, name, folder_id, size, content_type, created_at, updated_at, created_by
            FROM files
            WHERE id = $1
            "#,
            id
        )
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn list_files(&self, folder_id: Option<uuid::Uuid>, limit: i64, offset: i64) -> Result<Vec<FileMetadata>, sqlx::Error> {
        sqlx::query_as!(
            FileMetadata,
            r#"
            SELECT id, name, folder_id, size, content_type, created_at, updated_at, created_by
            FROM files
            WHERE folder_id = $1 OR ($1 IS NULL AND folder_id IS NULL)
            ORDER BY updated_at DESC
            LIMIT $2 OFFSET $3
            "#,
            folder_id,
            limit,
            offset
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn delete_file(&self, id: uuid::Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query!("DELETE FROM files WHERE id = $1", id)
            .execute(&self.pool)
            .await?;
        
        Ok(result.rows_affected() > 0)
    }
}
