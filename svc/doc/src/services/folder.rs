use sqlx::{PgPool, Result};
use uuid::Uuid;

use crate::models::{CreateFolderRequest, Folder, UpdateFolderRequest};

pub struct FolderService {
    pool: std::sync::Arc<PgPool>,
}

impl FolderService {
    pub fn new(pool: std::sync::Arc<PgPool>) -> Self {
        Self { pool }
    }

    pub async fn list_folders(&self) -> Result<Vec<Folder>> {
        sqlx::query_as!(Folder, r#"SELECT * FROM core_doc_folders ORDER BY name"#)
            .fetch_all(&*self.pool)
            .await
    }

    pub async fn get_folder(&self, folder_id: Uuid) -> Result<Option<Folder>> {
        sqlx::query_as!(
            Folder,
            r#"SELECT * FROM core_doc_folders WHERE id = $1"#,
            folder_id
        )
        .fetch_optional(&*self.pool)
        .await
    }

    pub async fn create_folder(&self, req: CreateFolderRequest, owner_id: Uuid) -> Result<Folder> {
        sqlx::query_as!(
            Folder,
            r#"
            INSERT INTO core_doc_folders (name, parent_id, owner_id)
            VALUES ($1, $2, $3)
            RETURNING *
            "#,
            req.name,
            req.parent_id,
            owner_id
        )
        .fetch_one(&*self.pool)
        .await
    }

    pub async fn update_folder(
        &self,
        folder_id: Uuid,
        req: UpdateFolderRequest,
    ) -> Result<Option<Folder>> {
        sqlx::query_as!(
            Folder,
            r#"
            UPDATE core_doc_folders
            SET name = COALESCE($2, name),
                parent_id = COALESCE($3, parent_id),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
            folder_id,
            req.name,
            req.parent_id
        )
        .fetch_optional(&*self.pool)
        .await
    }

    pub async fn delete_folder(&self, folder_id: Uuid) -> Result<bool> {
        let result = sqlx::query!(r#"DELETE FROM core_doc_folders WHERE id = $1"#, folder_id)
            .execute(&*self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}

pub async fn init_database(pool: &PgPool) -> Result<()> {
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS core_doc_folders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR(128) NOT NULL,
            parent_id UUID REFERENCES core_doc_folders(id),
            owner_id UUID NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}
