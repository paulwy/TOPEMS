use sqlx::{PgPool, Result};
use uuid::Uuid;

use crate::models::{CreateFolderRequest, Folder, UpdateFolderRequest};

pub struct FolderService {
    pool: PgPool,
}

impl FolderService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn list_folders(&self) -> Result<Vec<Folder>> {
        sqlx::query_as!(Folder, r#"SELECT * FROM doc.folders ORDER BY name"#)
            .fetch_all(&self.pool)
            .await
    }

    pub async fn get_folder(&self, folder_id: Uuid) -> Result<Option<Folder>> {
        sqlx::query_as!(
            Folder,
            r#"SELECT * FROM doc.folders WHERE id = $1"#,
            folder_id
        )
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn create_folder(
        &self,
        req: CreateFolderRequest,
        created_by: &str,
    ) -> Result<Folder> {
        sqlx::query_as!(
            Folder,
            r#"
            INSERT INTO doc.folders (name, parent_id, description, sort_order, is_enabled, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            "#,
            req.name,
            req.parent_id,
            req.description,
            req.sort_order.unwrap_or(0),
            req.is_enabled.unwrap_or(true),
            Some(created_by.to_string())
        )
        .fetch_one(&self.pool)
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
            UPDATE doc.folders
            SET name = COALESCE($2, name),
                parent_id = COALESCE($3, parent_id),
                description = COALESCE($4, description),
                sort_order = COALESCE($5, sort_order),
                is_enabled = COALESCE($6, is_enabled),
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
            folder_id,
            req.name,
            req.parent_id,
            req.description,
            req.sort_order,
            req.is_enabled
        )
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn delete_folder(&self, folder_id: Uuid) -> Result<bool> {
        let result = sqlx::query!(r#"DELETE FROM doc.folders WHERE id = $1"#, folder_id)
            .execute(&self.pool)
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
        CREATE TABLE IF NOT EXISTS doc.folders (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id UUID,
            name VARCHAR(200) NOT NULL,
            parent_id UUID REFERENCES doc.folders(id),
            description TEXT,
            sort_order INTEGER DEFAULT 0,
            is_enabled BOOLEAN DEFAULT true,
            created_by VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;

    Ok(())
}
