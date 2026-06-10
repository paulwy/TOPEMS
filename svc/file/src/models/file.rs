use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 文件类型枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FileType {
    Document,
    Attachment,
    Image,
    Video,
    Archive,
}

impl Default for FileType {
    fn default() -> Self {
        FileType::Document
    }
}

impl From<String> for FileType {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "document" => FileType::Document,
            "attachment" => FileType::Attachment,
            "image" => FileType::Image,
            "video" => FileType::Video,
            "archive" => FileType::Archive,
            _ => FileType::Document,
        }
    }
}

impl From<FileType> for String {
    fn from(f: FileType) -> Self {
        match f {
            FileType::Document => "document".to_string(),
            FileType::Attachment => "attachment".to_string(),
            FileType::Image => "image".to_string(),
            FileType::Video => "video".to_string(),
            FileType::Archive => "archive".to_string(),
        }
    }
}

/// 可见性枚举
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Visibility {
    Private,
    Department,
    Public,
}

impl Default for Visibility {
    fn default() -> Self {
        Visibility::Private
    }
}

impl From<String> for Visibility {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "department" => Visibility::Department,
            "public" => Visibility::Public,
            _ => Visibility::Private,
        }
    }
}

impl From<Visibility> for String {
    fn from(v: Visibility) -> Self {
        match v {
            Visibility::Private => "private".to_string(),
            Visibility::Department => "department".to_string(),
            Visibility::Public => "public".to_string(),
        }
    }
}

/// 向量化状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum VectorStatus {
    Pending,
    Processing,
    Completed,
    Failed,
}

impl Default for VectorStatus {
    fn default() -> Self {
        VectorStatus::Pending
    }
}

impl From<String> for VectorStatus {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "processing" => VectorStatus::Processing,
            "completed" => VectorStatus::Completed,
            "failed" => VectorStatus::Failed,
            _ => VectorStatus::Pending,
        }
    }
}

impl From<VectorStatus> for String {
    fn from(v: VectorStatus) -> Self {
        match v {
            VectorStatus::Pending => "pending".to_string(),
            VectorStatus::Processing => "processing".to_string(),
            VectorStatus::Completed => "completed".to_string(),
            VectorStatus::Failed => "failed".to_string(),
        }
    }
}

/// 文件状态
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum FileStatus {
    Active,
    Deleted,
    Archived,
}

impl Default for FileStatus {
    fn default() -> Self {
        FileStatus::Active
    }
}

impl From<String> for FileStatus {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "deleted" => FileStatus::Deleted,
            "archived" => FileStatus::Archived,
            _ => FileStatus::Active,
        }
    }
}

impl From<FileStatus> for String {
    fn from(f: FileStatus) -> Self {
        match f {
            FileStatus::Active => "active".to_string(),
            FileStatus::Deleted => "deleted".to_string(),
            FileStatus::Archived => "archived".to_string(),
        }
    }
}

/// 数据库中的 files 表行
#[derive(Debug, Clone, FromRow)]
pub struct FileRecord {
    pub id: Uuid,
    pub owner_id: Uuid,
    pub owner_department_id: Option<Uuid>,
    pub filename: String,
    pub storage_path: String,
    pub file_size: i64,
    pub content_type: String,
    pub file_type: String,
    pub category: Option<String>,
    pub version: i32,
    pub parent_id: Option<Uuid>,
    pub vector_status: String,
    pub vector_document_id: Option<Uuid>,
    pub is_shared: bool,
    pub visibility: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

/// API 响应用的文件元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileMetadata {
    pub id: Uuid,
    pub filename: String,
    pub storage_path: String,
    pub file_size: i64,
    pub content_type: String,
    pub owner_id: Uuid,
    pub owner_department_id: Option<Uuid>,
    pub file_type: String,
    pub category: Option<String>,
    pub version: i32,
    pub parent_id: Option<Uuid>,
    pub vector_status: String,
    pub vector_document_id: Option<Uuid>,
    pub is_shared: bool,
    pub visibility: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub deleted_at: Option<DateTime<Utc>>,
}

impl From<FileRecord> for FileMetadata {
    fn from(record: FileRecord) -> Self {
        FileMetadata {
            id: record.id,
            filename: record.filename,
            storage_path: record.storage_path,
            file_size: record.file_size,
            content_type: record.content_type,
            owner_id: record.owner_id,
            owner_department_id: record.owner_department_id,
            file_type: record.file_type,
            category: record.category,
            version: record.version,
            parent_id: record.parent_id,
            vector_status: record.vector_status,
            vector_document_id: record.vector_document_id,
            is_shared: record.is_shared,
            visibility: record.visibility,
            status: record.status,
            created_at: record.created_at,
            updated_at: record.updated_at,
            deleted_at: record.deleted_at,
        }
    }
}

/// 文件上传请求
#[derive(Debug, Deserialize)]
pub struct UploadFileRequest {
    pub external_id: Option<Uuid>,
    pub category: Option<String>,
    pub visibility: Option<String>,
    pub file_type: Option<String>,
}

/// 文件列表查询参数
#[derive(Debug, Deserialize)]
pub struct ListFilesQuery {
    pub owner_id: Option<Uuid>,
    pub file_type: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

/// 文件统计
#[derive(Debug, Serialize)]
pub struct FileStats {
    pub total_files: i64,
    pub total_size: i64,
    pub by_type: Vec<TypeCount>,
    pub by_status: Vec<StatusCount>,
}

#[derive(Debug, Serialize)]
pub struct TypeCount {
    pub file_type: String,
    pub count: i64,
}

#[derive(Debug, Serialize)]
pub struct StatusCount {
    pub status: String,
    pub count: i64,
}

/// 判断文件是否应该被向量化
pub fn should_vectorize(content_type: &str) -> bool {
    matches!(
        content_type,
        "text/plain"
            | "text/markdown"
            | "text/csv"
            | "application/pdf"
            | "application/msword"
            | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            | "application/vnd.ms-excel"
            | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
}

/// 根据 content_type 判断文件类型
pub fn get_file_type_from_content_type(content_type: &str) -> FileType {
    if content_type.starts_with("image/") {
        FileType::Image
    } else if content_type.starts_with("video/") {
        FileType::Video
    } else if content_type.starts_with("audio/") {
        FileType::Video
    } else if content_type.contains("zip")
        || content_type.contains("tar")
        || content_type.contains("rar")
        || content_type.contains("7z")
        || content_type.contains("gzip")
    {
        FileType::Archive
    } else {
        FileType::Document
    }
}
