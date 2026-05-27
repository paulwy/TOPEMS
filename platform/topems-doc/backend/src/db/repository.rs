use crate::models::{FileMetadata, Folder, FileVersion, FilePermission};
use sqlx::{PgPool, Row};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
pub enum RepositoryError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("File not found")]
    FileNotFound,
    #[error("Folder not found")]
    FolderNotFound,
}

#[derive(Clone)]
pub struct FileRepository {
    pool: PgPool,
}

impl FileRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, file: FileMetadata) -> Result<FileMetadata, RepositoryError> {
        let file = sqlx::query_as::<_, FileMetadata>(
            r#"
            INSERT INTO doc_service.files (id, name, folder_id, size, content_type, storage_path, created_at, updated_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, name, folder_id, size, content_type, storage_path, created_at, updated_at, created_by
            "#,
        )
        .bind(file.id)
        .bind(file.name)
        .bind(file.folder_id)
        .bind(file.size)
        .bind(file.content_type)
        .bind(file.storage_path)
        .bind(file.created_at)
        .bind(file.updated_at)
        .bind(file.created_by)
        .fetch_one(&self.pool)
        .await?;

        Ok(file)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<FileMetadata>, RepositoryError> {
        let file = sqlx::query_as::<_, FileMetadata>(
            r#"
            SELECT id, name, folder_id, size, content_type, storage_path, created_at, updated_at, created_by
            FROM doc_service.files
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(file)
    }

    pub async fn list(
        &self,
        folder_id: Option<Uuid>,
        limit: i64,
        offset: i64,
    ) -> Result<Vec<FileMetadata>, RepositoryError> {
        let files = sqlx::query_as::<_, FileMetadata>(
            r#"
            SELECT id, name, folder_id, size, content_type, storage_path, created_at, updated_at, created_by
            FROM doc_service.files
            WHERE (folder_id = $1 OR ($1 IS NULL AND folder_id IS NULL))
            ORDER BY updated_at DESC
            LIMIT $2 OFFSET $3
            "#,
        )
        .bind(folder_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(files)
    }

    pub async fn count(&self, folder_id: Option<Uuid>) -> Result<i64, RepositoryError> {
        let count = sqlx::query(
            r#"
            SELECT COUNT(*) as count
            FROM doc_service.files
            WHERE (folder_id = $1 OR ($1 IS NULL AND folder_id IS NULL))
            "#,
        )
        .bind(folder_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(count.get("count"))
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, RepositoryError> {
        let result = sqlx::query(r#"DELETE FROM doc_service.files WHERE id = $1"#)
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

#[derive(Clone)]
pub struct FolderRepository {
    pool: PgPool,
}

impl FolderRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, folder: Folder) -> Result<Folder, RepositoryError> {
        let folder = sqlx::query_as::<_, Folder>(
            r#"
            INSERT INTO doc_service.folders (id, name, parent_id, created_at, updated_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, name, parent_id, created_at, updated_at, created_by
            "#,
        )
        .bind(folder.id)
        .bind(folder.name)
        .bind(folder.parent_id)
        .bind(folder.created_at)
        .bind(folder.updated_at)
        .bind(folder.created_by)
        .fetch_one(&self.pool)
        .await?;

        Ok(folder)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Folder>, RepositoryError> {
        let folder = sqlx::query_as::<_, Folder>(
            r#"
            SELECT id, name, parent_id, created_at, updated_at, created_by
            FROM doc_service.folders
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(folder)
    }

    pub async fn list(
        &self,
        parent_id: Option<Uuid>,
    ) -> Result<Vec<Folder>, RepositoryError> {
        let folders = sqlx::query_as::<_, Folder>(
            r#"
            SELECT id, name, parent_id, created_at, updated_at, created_by
            FROM doc_service.folders
            WHERE (parent_id = $1 OR ($1 IS NULL AND parent_id IS NULL))
            ORDER BY name ASC
            "#,
        )
        .bind(parent_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(folders)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, RepositoryError> {
        let result = sqlx::query(r#"DELETE FROM doc_service.folders WHERE id = $1"#)
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

#[derive(Clone)]
pub struct FileVersionRepository {
    pool: PgPool,
}

impl FileVersionRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, version: FileVersion) -> Result<FileVersion, RepositoryError> {
        let version = sqlx::query_as::<_, FileVersion>(
            r#"
            INSERT INTO doc_service.file_versions (id, file_id, version, size, checksum, storage_path, created_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, file_id, version, size, checksum, storage_path, created_at, created_by
            "#,
        )
        .bind(version.id)
        .bind(version.file_id)
        .bind(version.version)
        .bind(version.size)
        .bind(version.checksum)
        .bind(version.storage_path)
        .bind(version.created_at)
        .bind(version.created_by)
        .fetch_one(&self.pool)
        .await?;

        Ok(version)
    }

    pub async fn list_by_file_id(&self, file_id: Uuid) -> Result<Vec<FileVersion>, RepositoryError> {
        let versions = sqlx::query_as::<_, FileVersion>(
            r#"
            SELECT id, file_id, version, size, checksum, storage_path, created_at, created_by
            FROM doc_service.file_versions
            WHERE file_id = $1
            ORDER BY version DESC
            "#,
        )
        .bind(file_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(versions)
    }

    pub async fn get_latest_version(&self, file_id: Uuid) -> Result<Option<FileVersion>, RepositoryError> {
        let version = sqlx::query_as::<_, FileVersion>(
            r#"
            SELECT id, file_id, version, size, checksum, storage_path, created_at, created_by
            FROM doc_service.file_versions
            WHERE file_id = $1
            ORDER BY version DESC
            LIMIT 1
            "#,
        )
        .bind(file_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(version)
    }
}

#[derive(Clone)]
pub struct FilePermissionRepository {
    pool: PgPool,
}

impl FilePermissionRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, permission: FilePermission) -> Result<FilePermission, RepositoryError> {
        let permission = sqlx::query_as::<_, FilePermission>(
            r#"
            INSERT INTO doc_service.file_permissions (id, file_id, user_id, role_id, permission, created_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id, file_id, user_id, role_id, permission, created_at
            "#,
        )
        .bind(permission.id)
        .bind(permission.file_id)
        .bind(permission.user_id)
        .bind(permission.role_id)
        .bind(permission.permission)
        .bind(permission.created_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(permission)
    }

    pub async fn list_by_file_id(&self, file_id: Uuid) -> Result<Vec<FilePermission>, RepositoryError> {
        let permissions = sqlx::query_as::<_, FilePermission>(
            r#"
            SELECT id, file_id, user_id, role_id, permission, created_at
            FROM doc_service.file_permissions
            WHERE file_id = $1
            "#,
        )
        .bind(file_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(permissions)
    }
}
