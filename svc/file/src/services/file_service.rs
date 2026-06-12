use anyhow::Result;
use chrono::Utc;
use sqlx::PgPool;
use tokio::io::AsyncRead;
use tracing::{debug, info};
use uuid::Uuid;

use crate::backends::{FileStorage, LocalStorage};
use crate::models::events::should_vectorize_for_event;
use crate::models::file::{FileMetadata, FileRecord, ListFilesQuery};

/// 文件上传请求参数
pub struct UploadFileRequest<'a> {
    pub owner_id: Uuid,
    pub owner_department_id: Option<Uuid>,
    pub filename: &'a str,
    pub data: Vec<u8>,
    pub content_type: &'a str,
    pub external_id: Option<Uuid>,
    pub file_type: Option<String>,
    pub category: Option<String>,
    pub visibility: Option<String>,
}

/// 流式文件上传请求参数
pub struct UploadFileStreamRequest<'a> {
    pub owner_id: Uuid,
    pub owner_department_id: Option<Uuid>,
    pub filename: &'a str,
    pub reader: Box<dyn AsyncRead + Send + Unpin>,
    pub size: u64,
    pub content_type: &'a str,
    pub external_id: Option<Uuid>,
    pub file_type: Option<String>,
    pub category: Option<String>,
    pub visibility: Option<String>,
}

pub struct FileService {
    pool: PgPool,
    storage: Box<dyn FileStorage>,
}

impl FileService {
    #[allow(dead_code)]
    pub fn new(pool: PgPool, storage: Box<dyn FileStorage>) -> Self {
        Self { pool, storage }
    }

    pub fn with_local_storage(pool: PgPool, base_path: &str) -> Result<Self> {
        let storage = LocalStorage::new(base_path)?;
        Ok(Self {
            pool,
            storage: Box::new(storage),
        })
    }

    /// 上传文件
    pub async fn upload_file(&self, req: UploadFileRequest<'_>) -> Result<FileMetadata> {
        let file_id = req.external_id.unwrap_or_else(Uuid::new_v4);
        let file_size = req.data.len() as i64;

        // 生成存储路径
        let now = Utc::now();
        let storage_path = format!(
            "files/{}/{}/{}/{}",
            now.format("%Y"),
            now.format("%m"),
            now.format("%d"),
            file_id
        );

        // 上传到存储后端
        self.storage.upload(&storage_path, &req.data).await?;

        // 确定文件类型
        let determined_file_type = req.file_type.unwrap_or_else(|| {
            if req.content_type.starts_with("image/") {
                "image".to_string()
            } else if req.content_type.starts_with("video/") {
                "video".to_string()
            } else {
                "document".to_string()
            }
        });

        // 确定可见性
        let determined_visibility = req.visibility.unwrap_or_else(|| "private".to_string());

        // 确定向量化状态
        let vector_status = if should_vectorize_for_event(req.content_type) {
            "pending".to_string()
        } else {
            "none".to_string()
        };

        // 插入数据库
        let record = sqlx::query_as::<_, FileRecord>(
            r#"
            INSERT INTO storage.files (
                id, owner_id, owner_department_id, filename, storage_path,
                file_size, content_type, file_type, category, vector_status, visibility
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            "#,
        )
        .bind(file_id)
        .bind(req.owner_id)
        .bind(req.owner_department_id)
        .bind(req.filename)
        .bind(&storage_path)
        .bind(file_size)
        .bind(req.content_type)
        .bind(&determined_file_type)
        .bind(&req.category)
        .bind(&vector_status)
        .bind(&determined_visibility)
        .fetch_one(&self.pool)
        .await?;

        info!("File uploaded: {} -> {}", req.filename, storage_path);

        Ok(FileMetadata::from(record))
    }

    /// 流式上传文件（边收边传）
    #[allow(dead_code)]
    pub async fn upload_file_streaming(
        &self,
        req: UploadFileStreamRequest<'_>,
    ) -> Result<FileMetadata> {
        let file_id = req.external_id.unwrap_or_else(Uuid::new_v4);

        // 生成存储路径
        let now = Utc::now();
        let storage_path = format!(
            "files/{}/{}/{}/{}",
            now.format("%Y"),
            now.format("%m"),
            now.format("%d"),
            file_id
        );

        // 流式上传到存储后端
        self.storage
            .upload_stream(&storage_path, req.reader, req.size)
            .await?;

        // 确定文件类型
        let determined_file_type = req.file_type.unwrap_or_else(|| {
            if req.content_type.starts_with("image/") {
                "image".to_string()
            } else if req.content_type.starts_with("video/") {
                "video".to_string()
            } else {
                "document".to_string()
            }
        });

        // 确定可见性
        let determined_visibility = req.visibility.unwrap_or_else(|| "private".to_string());

        // 确定向量化状态
        let vector_status = if should_vectorize_for_event(req.content_type) {
            "pending".to_string()
        } else {
            "none".to_string()
        };

        // 插入数据库
        let record = sqlx::query_as::<_, FileRecord>(
            r#"
            INSERT INTO storage.files (
                id, owner_id, owner_department_id, filename, storage_path,
                file_size, content_type, file_type, category, vector_status, visibility
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
            "#,
        )
        .bind(file_id)
        .bind(req.owner_id)
        .bind(req.owner_department_id)
        .bind(req.filename)
        .bind(&storage_path)
        .bind(req.size as i64)
        .bind(req.content_type)
        .bind(&determined_file_type)
        .bind(&req.category)
        .bind(&vector_status)
        .bind(&determined_visibility)
        .fetch_one(&self.pool)
        .await?;

        info!(
            "File streamed uploaded: {} -> {}",
            req.filename, storage_path
        );

        Ok(FileMetadata::from(record))
    }

    /// 获取文件
    pub async fn get_file(&self, file_id: Uuid) -> Result<Option<FileMetadata>> {
        let record = sqlx::query_as::<_, FileRecord>(
            "SELECT * FROM storage.files WHERE id = $1 AND status = 'active'",
        )
        .bind(file_id)
        .fetch_optional(&self.pool)
        .await?;

        Ok(record.map(FileMetadata::from))
    }

    /// 下载文件
    pub async fn download_file(&self, file_id: Uuid) -> Result<(FileMetadata, Vec<u8>)> {
        let metadata = self.get_file(file_id).await?;

        match metadata {
            Some(meta) => {
                let data = self.storage.download(&meta.storage_path).await?;
                Ok((meta, data))
            }
            None => anyhow::bail!("File not found"),
        }
    }

    /// 删除文件（软删除）
    pub async fn delete_file(&self, file_id: Uuid) -> Result<()> {
        sqlx::query(
            "UPDATE storage.files SET status = 'deleted', deleted_at = NOW() WHERE id = $1",
        )
        .bind(file_id)
        .execute(&self.pool)
        .await?;

        info!("File deleted: {}", file_id);
        Ok(())
    }

    /// 列出文件
    pub async fn list_files(&self, query: ListFilesQuery) -> Result<Vec<FileMetadata>> {
        let page = query.page.unwrap_or(1);
        let page_size = query.page_size.unwrap_or(20);
        let offset = (page - 1) * page_size;

        let records = sqlx::query_as::<_, FileRecord>(
            r#"
            SELECT * FROM storage.files
            WHERE status = 'active'
            AND ($1::uuid IS NULL OR owner_id = $1)
            AND ($2::text IS NULL OR file_type = $2)
            AND ($3::text IS NULL OR category = $3)
            ORDER BY created_at DESC
            LIMIT $4 OFFSET $5
            "#,
        )
        .bind(query.owner_id)
        .bind(query.file_type)
        .bind(query.category)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&self.pool)
        .await?;

        Ok(records.into_iter().map(FileMetadata::from).collect())
    }

    /// 获取与我共享的文件
    pub async fn get_shared_with_me(
        &self,
        user_id: Uuid,
        user_department_id: Option<Uuid>,
    ) -> Result<Vec<FileMetadata>> {
        let records = sqlx::query_as::<_, FileRecord>(
            r#"
            SELECT DISTINCT f.* FROM storage.files f
            WHERE f.status = 'active'
            AND (
                -- 公开文件
                f.visibility = 'public'
                -- 同一部门的文件
                OR (f.visibility = 'department' AND f.owner_department_id = $2)
                -- 直接分享给我的文件
                OR EXISTS (
                    SELECT 1 FROM storage.file_permissions fp
                    WHERE fp.file_id = f.id
                    AND fp.principal_type = 'user'
                    AND fp.principal_id = $1
                    AND (fp.expires_at IS NULL OR fp.expires_at > NOW())
                )
                -- 分享给我所在部门的文件
                OR EXISTS (
                    SELECT 1 FROM storage.file_permissions fp
                    WHERE fp.file_id = f.id
                    AND fp.principal_type = 'department'
                    AND fp.principal_id = $2
                    AND (fp.expires_at IS NULL OR fp.expires_at > NOW())
                )
            )
            ORDER BY f.created_at DESC
            "#,
        )
        .bind(user_id)
        .bind(user_department_id)
        .fetch_all(&self.pool)
        .await?;

        Ok(records.into_iter().map(FileMetadata::from).collect())
    }

    /// 更新向量化状态
    #[allow(dead_code)]
    pub async fn update_vector_status(
        &self,
        file_id: Uuid,
        status: &str,
        vector_document_id: Option<Uuid>,
    ) -> Result<()> {
        sqlx::query(
            "UPDATE storage.files SET vector_status = $1, vector_document_id = $2 WHERE id = $3",
        )
        .bind(status)
        .bind(vector_document_id)
        .bind(file_id)
        .execute(&self.pool)
        .await?;

        debug!("File {} vector status updated to {}", file_id, status);
        Ok(())
    }

    /// 获取文件统计
    pub async fn get_stats(&self, owner_id: Option<Uuid>) -> Result<serde_json::Value> {
        let total = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM storage.files WHERE status = 'active' AND ($1::uuid IS NULL OR owner_id = $1)",
        )
        .bind(owner_id)
        .fetch_one(&self.pool)
        .await?;

        let total_size = sqlx::query_scalar::<_, i64>(
            "SELECT COALESCE(SUM(file_size), 0) FROM storage.files WHERE status = 'active' AND ($1::uuid IS NULL OR owner_id = $1)",
        )
        .bind(owner_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(serde_json::json!({
            "total_files": total,
            "total_size": total_size,
        }))
    }
}
