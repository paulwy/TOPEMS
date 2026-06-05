use crate::models::{FileMetadata, Folder, FileVersion, FilePermission, FolderPermission, Template, TemplateCategory};
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

    pub async fn list_accessible(
        &self,
        folder_id: Option<Uuid>,
        limit: i64,
        offset: i64,
        user_id: Uuid,
        user_roles: &[Uuid],
    ) -> Result<Vec<FileMetadata>, RepositoryError> {
        let files = sqlx::query_as::<_, FileMetadata>(
            r#"
            SELECT DISTINCT f.id, f.name, f.folder_id, f.size, f.content_type, f.storage_path, f.created_at, f.updated_at, f.created_by
            FROM doc_service.files f
            LEFT JOIN doc_service.file_permissions fp ON fp.file_id = f.id
            LEFT JOIN doc_service.folder_permissions fop ON fop.folder_id = f.folder_id AND fop.inherit = true
            WHERE (f.folder_id = $1 OR ($1 IS NULL AND f.folder_id IS NULL))
            AND (
                f.created_by = $2
                OR (fp.user_id = $2 AND fp.permission = 'read')
                OR (fp.role_id = ANY($3) AND fp.permission = 'read')
                OR (fop.user_id = $2 AND fop.permission = 'read')
                OR (fop.role_id = ANY($3) AND fop.permission = 'read')
            )
            ORDER BY f.updated_at DESC
            LIMIT $4 OFFSET $5
            "#,
        )
        .bind(folder_id)
        .bind(user_id)
        .bind(user_roles)
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

    pub async fn get_ancestors(&self, folder_id: Uuid) -> Result<Vec<Uuid>, RepositoryError> {
        let rows = sqlx::query(
            r#"
            WITH RECURSIVE folder_hierarchy AS (
                SELECT id, parent_id FROM doc_service.folders WHERE id = $1
                UNION ALL
                SELECT f.id, f.parent_id FROM doc_service.folders f
                JOIN folder_hierarchy fh ON f.id = fh.parent_id
            )
            SELECT id FROM folder_hierarchy WHERE id != $1
            "#,
        )
        .bind(folder_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(rows.iter().map(|r| r.get::<Uuid, _>("id")).collect())
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

    pub async fn update(
        &self,
        id: Uuid,
        name: &str,
        parent_id: Option<Uuid>,
    ) -> Result<Option<Folder>, RepositoryError> {
        let now = chrono::Utc::now();
        let folder = sqlx::query_as::<_, Folder>(
            r#"
            UPDATE doc_service.folders
            SET name = $2, parent_id = $3, updated_at = $4
            WHERE id = $1
            RETURNING id, name, parent_id, created_at, updated_at, created_by
            "#,
        )
        .bind(id)
        .bind(name)
        .bind(parent_id)
        .bind(now)
        .fetch_optional(&self.pool)
        .await?;

        Ok(folder)
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

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<FileVersion>, RepositoryError> {
        let version = sqlx::query_as::<_, FileVersion>(
            r#"
            SELECT id, file_id, version, size, checksum, storage_path, created_at, created_by
            FROM doc_service.file_versions
            WHERE id = $1
            "#,
        )
        .bind(id)
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

    pub async fn delete(&self, id: Uuid) -> Result<bool, RepositoryError> {
        let result = sqlx::query(r#"DELETE FROM doc_service.file_permissions WHERE id = $1"#)
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

#[derive(Clone)]
pub struct FolderPermissionRepository {
    pool: PgPool,
}

impl FolderPermissionRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, permission: FolderPermission) -> Result<FolderPermission, RepositoryError> {
        let permission = sqlx::query_as::<_, FolderPermission>(
            r#"
            INSERT INTO doc_service.folder_permissions (id, folder_id, user_id, role_id, permission, inherit, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, folder_id, user_id, role_id, permission, inherit, created_at
            "#,
        )
        .bind(permission.id)
        .bind(permission.folder_id)
        .bind(permission.user_id)
        .bind(permission.role_id)
        .bind(permission.permission)
        .bind(permission.inherit)
        .bind(permission.created_at)
        .fetch_one(&self.pool)
        .await?;

        Ok(permission)
    }

    pub async fn list_by_folder_id(&self, folder_id: Uuid) -> Result<Vec<FolderPermission>, RepositoryError> {
        let permissions = sqlx::query_as::<_, FolderPermission>(
            r#"
            SELECT id, folder_id, user_id, role_id, permission, inherit, created_at
            FROM doc_service.folder_permissions
            WHERE folder_id = $1
            "#,
        )
        .bind(folder_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(permissions)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, RepositoryError> {
        let result = sqlx::query(r#"DELETE FROM doc_service.folder_permissions WHERE id = $1"#)
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn list_for_folder_hierarchy(
        &self,
        folder_ids: &[Uuid],
    ) -> Result<Vec<FolderPermission>, RepositoryError> {
        if folder_ids.is_empty() {
            return Ok(vec![]);
        }

        let permissions = sqlx::query_as::<_, FolderPermission>(
            r#"
            SELECT id, folder_id, user_id, role_id, permission, inherit, created_at
            FROM doc_service.folder_permissions
            WHERE folder_id = ANY($1) AND inherit = true
            "#,
        )
        .bind(folder_ids)
        .fetch_all(&self.pool)
        .await?;

        Ok(permissions)
    }
}

#[derive(Clone)]
pub struct TemplateRepository {
    pool: PgPool,
}

impl TemplateRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(&self, template: &Template) -> Result<Template, RepositoryError> {
        let t = sqlx::query_as::<_, Template>(
            r#"
            INSERT INTO doc_service.templates 
            (id, name, code, category_id, module, description, content, variables, is_active, is_system, sort_order, view_count, use_count, created_at, updated_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id, name, code, category_id, module, description, content, variables, is_active, is_system, sort_order, view_count, use_count, created_at, updated_at, created_by
            "#,
        )
        .bind(template.id)
        .bind(&template.name)
        .bind(&template.code)
        .bind(template.category_id)
        .bind(&template.module)
        .bind(&template.description)
        .bind(&template.content)
        .bind(&template.variables)
        .bind(template.is_active)
        .bind(template.is_system)
        .bind(template.sort_order)
        .bind(template.view_count)
        .bind(template.use_count)
        .bind(template.created_at)
        .bind(template.updated_at)
        .bind(&template.created_by)
        .fetch_one(&self.pool)
        .await?;

        Ok(t)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Template>, RepositoryError> {
        let template = sqlx::query_as::<_, Template>(
            r#"
            SELECT id, name, code, category_id, module, description, content, variables, is_active, is_system, sort_order, view_count, use_count, created_at, updated_at, created_by
            FROM doc_service.templates
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(template)
    }

    pub async fn find_by_code(&self, code: &str) -> Result<Option<Template>, RepositoryError> {
        let template = sqlx::query_as::<_, Template>(
            r#"
            SELECT id, name, code, category_id, module, description, content, variables, is_active, is_system, sort_order, view_count, use_count, created_at, updated_at, created_by
            FROM doc_service.templates
            WHERE code = $1
            "#,
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await?;

        Ok(template)
    }

    pub async fn list(
        &self,
        search: Option<&str>,
        category_code: Option<&str>,
        module: Option<&str>,
        is_active: Option<bool>,
        _limit: i64,
        _offset: i64,
    ) -> Result<(Vec<Template>, i64), RepositoryError> {
        let mut query = String::from(
            r#"
            SELECT t.id, t.name, t.code, t.category_id, t.module, t.description, t.content, t.variables, t.is_active, t.is_system, t.sort_order, t.view_count, t.use_count, t.created_at, t.updated_at, t.created_by
            FROM doc_service.templates t
            LEFT JOIN doc_service.template_categories tc ON t.category_id = tc.id
            WHERE 1=1
            "#
        );

        let mut count_query = String::from(
            r#"
            SELECT COUNT(*) as count
            FROM doc_service.templates t
            LEFT JOIN doc_service.template_categories tc ON t.category_id = tc.id
            WHERE 1=1
            "#
        );

        let mut params: Vec<String> = vec![];
        let mut param_idx = 1;

        if let Some(s) = search {
            let condition = format!(" AND (t.name ILIKE ${} OR t.code ILIKE ${} OR t.description ILIKE ${})", param_idx, param_idx + 1, param_idx + 2);
            query.push_str(&condition);
            count_query.push_str(&condition);
            params.push(format!("%{}%", s));
            params.push(format!("%{}%", s));
            params.push(format!("%{}%", s));
            param_idx += 3;
        }

        if let Some(cat) = category_code {
            let condition = format!(" AND tc.code = ${}", param_idx);
            query.push_str(&condition);
            count_query.push_str(&condition);
            params.push(cat.to_string());
            param_idx += 1;
        }

        if let Some(mod_) = module {
            let condition = format!(" AND t.module = ${}", param_idx);
            query.push_str(&condition);
            count_query.push_str(&condition);
            params.push(mod_.to_string());
            param_idx += 1;
        }

        if let Some(active) = is_active {
            let condition = format!(" AND t.is_active = ${}", param_idx);
            query.push_str(&condition);
            count_query.push_str(&condition);
            params.push(if active { "true" } else { "false" }.to_string());
            param_idx += 1;
        }

        query.push_str(&format!(" ORDER BY t.sort_order ASC, t.created_at DESC"));

        // Build and execute count query
        let mut count_q = sqlx::query(&count_query);
        for param in &params {
            count_q = count_q.bind(param);
        }
        let count_row = count_q.fetch_one(&self.pool).await?;
        let total: i64 = count_row.get("count");

        // Build and execute main query
        let mut main_q = sqlx::query_as::<_, Template>(&query);
        for param in &params {
            main_q = main_q.bind(param);
        }
        let templates = main_q.fetch_all(&self.pool).await?;

        Ok((templates, total))
    }

    pub async fn update(&self, id: Uuid, template: &Template) -> Result<Option<Template>, RepositoryError> {
        let t = sqlx::query_as::<_, Template>(
            r#"
            UPDATE doc_service.templates
            SET name = $2, code = $3, category_id = $4, module = $5, description = $6, content = $7, variables = $8, is_active = $9, sort_order = $10, updated_at = $11
            WHERE id = $1
            RETURNING id, name, code, category_id, module, description, content, variables, is_active, is_system, sort_order, view_count, use_count, created_at, updated_at, created_by
            "#,
        )
        .bind(id)
        .bind(&template.name)
        .bind(&template.code)
        .bind(template.category_id)
        .bind(&template.module)
        .bind(&template.description)
        .bind(&template.content)
        .bind(&template.variables)
        .bind(template.is_active)
        .bind(template.sort_order)
        .bind(template.updated_at)
        .fetch_optional(&self.pool)
        .await?;

        Ok(t)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, RepositoryError> {
        let result = sqlx::query(r#"DELETE FROM doc_service.templates WHERE id = $1"#)
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn increment_view_count(&self, id: Uuid) -> Result<(), RepositoryError> {
        sqlx::query(r#"UPDATE doc_service.templates SET view_count = view_count + 1 WHERE id = $1"#)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn increment_use_count(&self, id: Uuid) -> Result<(), RepositoryError> {
        sqlx::query(r#"UPDATE doc_service.templates SET use_count = use_count + 1 WHERE id = $1"#)
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }
}

#[derive(Clone)]
pub struct TemplateCategoryRepository {
    pool: PgPool,
}

impl TemplateCategoryRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn list(&self, is_active: Option<bool>) -> Result<Vec<TemplateCategory>, RepositoryError> {
        let query = if is_active.is_some() {
            sqlx::query_as::<_, TemplateCategory>(
                r#"
                SELECT id, name, code, icon, description, sort_order, is_active, created_at, updated_at, created_by
                FROM doc_service.template_categories
                WHERE is_active = $1
                ORDER BY sort_order ASC, name ASC
                "#,
            )
            .bind(is_active.unwrap())
            .fetch_all(&self.pool)
            .await?
        } else {
            sqlx::query_as::<_, TemplateCategory>(
                r#"
                SELECT id, name, code, icon, description, sort_order, is_active, created_at, updated_at, created_by
                FROM doc_service.template_categories
                ORDER BY sort_order ASC, name ASC
                "#,
            )
            .fetch_all(&self.pool)
            .await?
        };

        Ok(query)
    }

    pub async fn find_by_code(&self, code: &str) -> Result<Option<TemplateCategory>, RepositoryError> {
        let category = sqlx::query_as::<_, TemplateCategory>(
            r#"
            SELECT id, name, code, icon, description, sort_order, is_active, created_at, updated_at, created_by
            FROM doc_service.template_categories
            WHERE code = $1
            "#,
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await?;

        Ok(category)
    }

    pub async fn get_template_count(&self, category_id: Uuid) -> Result<i64, RepositoryError> {
        let row = sqlx::query(
            r#"
            SELECT COUNT(*) as count
            FROM doc_service.templates
            WHERE category_id = $1 AND is_active = true
            "#,
        )
        .bind(category_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.get("count"))
    }
}

// ==================== 档案管理 Repository ====================

use crate::models::{
    Archive, ArchiveCategory, ArchiveCategoryResponse, ArchiveResponse, ArchiveBorrow,
    ArchiveDestruction, ArchiveMetadata, CreateArchiveCategoryRequest, CreateArchiveRequest,
    UpdateArchiveCategoryRequest, UpdateArchiveRequest, ListArchivesQuery,
};

#[derive(Debug, Error)]
pub enum ArchiveRepositoryError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    #[error("Archive not found")]
    ArchiveNotFound,
    #[error("Archive category not found")]
    CategoryNotFound,
}

#[derive(Clone)]
pub struct ArchiveCategoryRepository {
    pool: PgPool,
}

impl ArchiveCategoryRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(
        &self,
        req: CreateArchiveCategoryRequest,
        created_by: String,
    ) -> Result<ArchiveCategory, ArchiveRepositoryError> {
        let id = Uuid::new_v4();
        let now = chrono::Utc::now();
        let sort_order = req.sort_order.unwrap_or(0);

        let category = sqlx::query_as::<_, ArchiveCategory>(
            r#"
            INSERT INTO doc_service.archive_categories 
            (id, code, name, parent_id, description, retention_period, sort_order, is_active, created_at, updated_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10)
            RETURNING id, code, name, parent_id, description, retention_period, sort_order, is_active, created_at, updated_at, created_by
            "#,
        )
        .bind(id)
        .bind(&req.code)
        .bind(&req.name)
        .bind(req.parent_id)
        .bind(&req.description)
        .bind(req.retention_period)
        .bind(sort_order)
        .bind(now)
        .bind(now)
        .bind(&created_by)
        .fetch_one(&self.pool)
        .await?;

        Ok(category)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<ArchiveCategory>, ArchiveRepositoryError> {
        let category = sqlx::query_as::<_, ArchiveCategory>(
            r#"
            SELECT id, code, name, parent_id, description, retention_period, sort_order, is_active, created_at, updated_at, created_by
            FROM doc_service.archive_categories
            WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(category)
    }

    pub async fn find_by_code(&self, code: &str) -> Result<Option<ArchiveCategory>, ArchiveRepositoryError> {
        let category = sqlx::query_as::<_, ArchiveCategory>(
            r#"
            SELECT id, code, name, parent_id, description, retention_period, sort_order, is_active, created_at, updated_at, created_by
            FROM doc_service.archive_categories
            WHERE code = $1
            "#,
        )
        .bind(code)
        .fetch_optional(&self.pool)
        .await?;

        Ok(category)
    }

    pub async fn list_all(&self) -> Result<Vec<ArchiveCategory>, ArchiveRepositoryError> {
        let categories = sqlx::query_as::<_, ArchiveCategory>(
            r#"
            SELECT id, code, name, parent_id, description, retention_period, sort_order, is_active, created_at, updated_at, created_by
            FROM doc_service.archive_categories
            WHERE is_active = true
            ORDER BY sort_order ASC, name ASC
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        Ok(categories)
    }

    pub async fn list_tree(&self) -> Result<Vec<ArchiveCategoryResponse>, ArchiveRepositoryError> {
        let categories = self.list_all().await?;
        
        // 构建树形结构
        let mut root_categories = vec![];
        let mut children_map = std::collections::HashMap::new();
        
        for category in &categories {
            let count = self.get_archive_count(category.id).await.unwrap_or(0);
            let response = ArchiveCategoryResponse {
                id: category.id,
                code: category.code.clone(),
                name: category.name.clone(),
                parent_id: category.parent_id,
                description: category.description.clone(),
                retention_period: category.retention_period,
                sort_order: category.sort_order,
                is_active: category.is_active,
                archive_count: count,
                children: vec![],
            };
            
            if let Some(parent_id) = category.parent_id {
                children_map.entry(parent_id).or_insert_with(Vec::new).push(response);
            } else {
                root_categories.push(response);
            }
        }
        
        // 递归添加子节点
        fn add_children(
            parent: &mut ArchiveCategoryResponse,
            children_map: &std::collections::HashMap<Uuid, Vec<ArchiveCategoryResponse>>,
        ) {
            if let Some(children) = children_map.get(&parent.id) {
                let mut children_clone = children.clone();
                for child in &mut children_clone {
                    add_children(child, children_map);
                }
                parent.children = children_clone;
            }
        }
        
        for root in &mut root_categories {
            add_children(root, &children_map);
        }

        Ok(root_categories)
    }

    pub async fn update(
        &self,
        id: Uuid,
        req: UpdateArchiveCategoryRequest,
    ) -> Result<Option<ArchiveCategory>, ArchiveRepositoryError> {
        let now = chrono::Utc::now();
        
        let category = sqlx::query_as::<_, ArchiveCategory>(
            r#"
            UPDATE doc_service.archive_categories
            SET 
                code = COALESCE($2, code),
                name = COALESCE($3, name),
                parent_id = $4,
                description = COALESCE($5, description),
                retention_period = $6,
                sort_order = COALESCE($7, sort_order),
                is_active = COALESCE($8, is_active),
                updated_at = $9
            WHERE id = $1
            RETURNING id, code, name, parent_id, description, retention_period, sort_order, is_active, created_at, updated_at, created_by
            "#,
        )
        .bind(id)
        .bind(req.code)
        .bind(req.name)
        .bind(req.parent_id)
        .bind(req.description)
        .bind(req.retention_period)
        .bind(req.sort_order)
        .bind(req.is_active)
        .bind(now)
        .fetch_optional(&self.pool)
        .await?;

        Ok(category)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, ArchiveRepositoryError> {
        let result = sqlx::query(r#"DELETE FROM doc_service.archive_categories WHERE id = $1"#)
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }

    pub async fn get_archive_count(&self, category_id: Uuid) -> Result<i64, ArchiveRepositoryError> {
        let row = sqlx::query(
            r#"
            SELECT COUNT(*) as count
            FROM doc_service.archives
            WHERE category_id = $1
            "#,
        )
        .bind(category_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(row.get("count"))
    }
}

#[derive(Clone)]
pub struct ArchiveRepository {
    pool: PgPool,
}

impl ArchiveRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create(
        &self,
        req: CreateArchiveRequest,
        created_by: String,
    ) -> Result<Archive, ArchiveRepositoryError> {
        let id = Uuid::new_v4();
        let now = chrono::Utc::now();

        let archive = sqlx::query_as::<_, Archive>(
            r#"
            INSERT INTO doc_service.archives 
            (id, archive_no, title, category_id, file_id, summary, keywords, creator, created_date, 
             retention_period, status, security_level, department_id, source_module, source_id, created_at, updated_at, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active', $11, $12, $13, $14, $15, $16, $17)
            RETURNING id, archive_no, title, category_id, file_id, summary, keywords, creator, created_date, 
                      retention_period, status, security_level, department_id, source_module, source_id, 
                      archived_at, archived_by, created_at, updated_at, created_by
            "#,
        )
        .bind(id)
        .bind(&req.archive_no)
        .bind(&req.title)
        .bind(req.category_id)
        .bind(req.file_id)
        .bind(&req.summary)
        .bind(req.keywords.as_deref())
        .bind(&req.creator)
        .bind(req.created_date)
        .bind(req.retention_period)
        .bind(req.security_level.unwrap_or(crate::models::SecurityLevel::Internal))
        .bind(req.department_id)
        .bind(&req.source_module)
        .bind(req.source_id)
        .bind(now)
        .bind(now)
        .bind(&created_by)
        .fetch_one(&self.pool)
        .await?;

        Ok(archive)
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<ArchiveResponse>, ArchiveRepositoryError> {
        let archive = sqlx::query_as::<_, ArchiveResponse>(
            r#"
            SELECT 
                a.id, a.archive_no, a.title, a.category_id, ac.name as category_name,
                a.file_id, f.name as file_name, a.summary, a.keywords, a.creator, a.created_date,
                a.retention_period, a.status, a.security_level, a.department_id,
                a.source_module, a.source_id, a.archived_at, a.archived_by,
                a.created_at, a.updated_at, a.created_by
            FROM doc_service.archives a
            LEFT JOIN doc_service.archive_categories ac ON a.category_id = ac.id
            LEFT JOIN doc_service.files f ON a.file_id = f.id
            WHERE a.id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(archive)
    }

    pub async fn find_by_archive_no(&self, archive_no: &str) -> Result<Option<ArchiveResponse>, ArchiveRepositoryError> {
        let archive = sqlx::query_as::<_, ArchiveResponse>(
            r#"
            SELECT 
                a.id, a.archive_no, a.title, a.category_id, ac.name as category_name,
                a.file_id, f.name as file_name, a.summary, a.keywords, a.creator, a.created_date,
                a.retention_period, a.status, a.security_level, a.department_id,
                a.source_module, a.source_id, a.archived_at, a.archived_by,
                a.created_at, a.updated_at, a.created_by
            FROM doc_service.archives a
            LEFT JOIN doc_service.archive_categories ac ON a.category_id = ac.id
            LEFT JOIN doc_service.files f ON a.file_id = f.id
            WHERE a.archive_no = $1
            "#,
        )
        .bind(archive_no)
        .fetch_optional(&self.pool)
        .await?;

        Ok(archive)
    }

    pub async fn list(
        &self,
        query: ListArchivesQuery,
    ) -> Result<(Vec<ArchiveResponse>, i64), ArchiveRepositoryError> {
        let page = query.page.unwrap_or(1);
        let page_size = query.page_size.unwrap_or(20);
        let offset = (page - 1) as i64 * page_size as i64;
        let limit = page_size as i64;

        let mut where_clauses = vec!["1=1".to_string()];
        let mut params: Vec<String> = vec![];
        let mut param_idx = 1;

        if let Some(search) = &query.search {
            where_clauses.push(format!(
                "(a.title ILIKE ${} OR a.archive_no ILIKE ${} OR a.summary ILIKE ${})",
                param_idx, param_idx + 1, param_idx + 2
            ));
            params.push(format!("%{}%", search));
            params.push(format!("%{}%", search));
            params.push(format!("%{}%", search));
            param_idx += 3;
        }

        if let Some(category_id) = query.category_id {
            where_clauses.push(format!("a.category_id = ${}", param_idx));
            params.push(category_id.to_string());
            param_idx += 1;
        }

        if let Some(status) = &query.status {
            where_clauses.push(format!("a.status = ${}", param_idx));
            params.push(serde_json::to_string(status).unwrap().replace('"', ""));
            param_idx += 1;
        }

        if let Some(source_module) = &query.source_module {
            where_clauses.push(format!("a.source_module = ${}", param_idx));
            params.push(source_module.clone());
            param_idx += 1;
        }

        let where_str = where_clauses.join(" AND ");

        // Count query
        let count_query = format!(
            r#"SELECT COUNT(*) as count FROM doc_service.archives a WHERE {}"#,
            where_str
        );

        let mut count_q = sqlx::query(&count_query);
        for param in &params {
            count_q = count_q.bind(param);
        }
        let count_row = count_q.fetch_one(&self.pool).await?;
        let total: i64 = count_row.get("count");

        // Main query
        let main_query = format!(
            r#"
            SELECT 
                a.id, a.archive_no, a.title, a.category_id, ac.name as category_name,
                a.file_id, f.name as file_name, a.summary, a.keywords, a.creator, a.created_date,
                a.retention_period, a.status, a.security_level, a.department_id,
                a.source_module, a.source_id, a.archived_at, a.archived_by,
                a.created_at, a.updated_at, a.created_by
            FROM doc_service.archives a
            LEFT JOIN doc_service.archive_categories ac ON a.category_id = ac.id
            LEFT JOIN doc_service.files f ON a.file_id = f.id
            WHERE {}
            ORDER BY a.created_at DESC
            LIMIT ${} OFFSET ${}
            "#,
            where_str,
            param_idx,
            param_idx + 1
        );

        let mut main_q = sqlx::query_as::<_, ArchiveResponse>(&main_query);
        for param in &params {
            main_q = main_q.bind(param);
        }
        main_q = main_q.bind(limit).bind(offset);
        
        let archives = main_q.fetch_all(&self.pool).await?;

        Ok((archives, total))
    }

    pub async fn update(
        &self,
        id: Uuid,
        req: UpdateArchiveRequest,
    ) -> Result<Option<Archive>, ArchiveRepositoryError> {
        let now = chrono::Utc::now();
        
        let archive = sqlx::query_as::<_, Archive>(
            r#"
            UPDATE doc_service.archives
            SET 
                archive_no = COALESCE($2, archive_no),
                title = COALESCE($3, title),
                category_id = COALESCE($4, category_id),
                file_id = $5,
                summary = COALESCE($6, summary),
                keywords = $7,
                creator = COALESCE($8, creator),
                created_date = $9,
                retention_period = $10,
                security_level = COALESCE($11, security_level),
                department_id = $12,
                updated_at = $13
            WHERE id = $1
            RETURNING id, archive_no, title, category_id, file_id, summary, keywords, creator, created_date, 
                      retention_period, status, security_level, department_id, source_module, source_id, 
                      archived_at, archived_by, created_at, updated_at, created_by
            "#,
        )
        .bind(id)
        .bind(req.archive_no)
        .bind(req.title)
        .bind(req.category_id)
        .bind(req.file_id)
        .bind(req.summary)
        .bind(req.keywords.as_deref())
        .bind(req.creator)
        .bind(req.created_date)
        .bind(req.retention_period)
        .bind(req.security_level)
        .bind(req.department_id)
        .bind(now)
        .fetch_optional(&self.pool)
        .await?;

        Ok(archive)
    }

    pub async fn archive(&self, id: Uuid, archived_by: String) -> Result<Option<Archive>, ArchiveRepositoryError> {
        let now = chrono::Utc::now();
        
        let archive = sqlx::query_as::<_, Archive>(
            r#"
            UPDATE doc_service.archives
            SET status = 'archived', archived_at = $2, archived_by = $3, updated_at = $4
            WHERE id = $1
            RETURNING id, archive_no, title, category_id, file_id, summary, keywords, creator, created_date, 
                      retention_period, status, security_level, department_id, source_module, source_id, 
                      archived_at, archived_by, created_at, updated_at, created_by
            "#,
        )
        .bind(id)
        .bind(now)
        .bind(&archived_by)
        .bind(now)
        .fetch_optional(&self.pool)
        .await?;

        Ok(archive)
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, ArchiveRepositoryError> {
        let result = sqlx::query(r#"DELETE FROM doc_service.archives WHERE id = $1"#)
            .bind(id)
            .execute(&self.pool)
            .await?;

        Ok(result.rows_affected() > 0)
    }
}

