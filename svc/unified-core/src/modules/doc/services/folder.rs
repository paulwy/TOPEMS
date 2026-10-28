use sqlx::{PgPool, Result};
use uuid::Uuid;

use super::super::models::{CreateFolderRequest, Folder, UpdateFolderRequest};

pub struct FolderService {
    pool: PgPool,
}

impl FolderService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn list_folders(&self, tenant_id: Option<Uuid>) -> Result<Vec<Folder>> {
        sqlx::query_as::<_, Folder>(
            r#"SELECT id, tenant_id, name, description, parent_id, created_by, created_at, updated_at, deleted_at FROM core_doc_folders WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) ORDER BY name"#,
        )
        .bind(tenant_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn get_folder(
        &self,
        tenant_id: Option<Uuid>,
        folder_id: Uuid,
    ) -> Result<Option<Folder>> {
        sqlx::query_as::<_, Folder>(
            r#"SELECT id, tenant_id, name, description, parent_id, created_by, created_at, updated_at, deleted_at FROM core_doc_folders WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1) AND id = $2"#,
        )
        .bind(tenant_id)
        .bind(folder_id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn create_folder(
        &self,
        tenant_id: Uuid,
        req: CreateFolderRequest,
        created_by: &str,
    ) -> Result<Folder> {
        sqlx::query_as::<_, Folder>(
            r#"
            INSERT INTO core_doc_folders (tenant_id, name, parent_id, description, sort_order, is_enabled, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
            "#,
        )
        .bind(tenant_id)
        .bind(req.name)
        .bind(req.parent_id)
        .bind(req.description)
        .bind(req.sort_order.unwrap_or(0))
        .bind(req.is_enabled.unwrap_or(true))
        .bind(Some(created_by.to_string()))
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_folder(
        &self,
        tenant_id: Uuid,
        folder_id: Uuid,
        req: UpdateFolderRequest,
    ) -> Result<Option<Folder>> {
        sqlx::query_as::<_, Folder>(
            r#"
            UPDATE core_doc_folders
            SET name = COALESCE($2, name),
                parent_id = COALESCE($3, parent_id),
                description = COALESCE($4, description),
                sort_order = COALESCE($5, sort_order),
                is_enabled = COALESCE($6, is_enabled),
                updated_at = NOW()
            WHERE tenant_id = $7 AND id = $1
            RETURNING *
            "#,
        )
        .bind(folder_id)
        .bind(req.name)
        .bind(req.parent_id)
        .bind(req.description)
        .bind(req.sort_order)
        .bind(req.is_enabled)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn delete_folder(&self, tenant_id: Uuid, folder_id: Uuid) -> Result<bool> {
        let result = sqlx::query(
            r#"UPDATE core_doc_folders SET deleted_at = NOW() WHERE tenant_id = $1 AND id = $2"#,
        )
        .bind(tenant_id)
        .bind(folder_id)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }
}
