use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct FileMetadata {
    pub id: Uuid,
    pub name: String,
    pub folder_id: Option<Uuid>,
    pub size: i64,
    pub content_type: String,
    pub storage_path: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Folder {
    pub id: Uuid,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct FileVersion {
    pub id: Uuid,
    pub file_id: Uuid,
    pub version: i32,
    pub size: i64,
    pub checksum: String,
    pub storage_path: String,
    pub created_at: DateTime<Utc>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct FilePermission {
    pub id: Uuid,
    pub file_id: Uuid,
    pub user_id: Option<Uuid>,
    pub role_id: Option<Uuid>,
    pub permission: Permission,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct FolderPermission {
    pub id: Uuid,
    pub folder_id: Uuid,
    pub user_id: Option<Uuid>,
    pub role_id: Option<Uuid>,
    pub permission: Permission,
    pub inherit: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type, ToSchema)]
#[sqlx(rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum Permission {
    Read,
    Write,
    Delete,
    Admin,
}

impl Permission {
    pub fn includes(&self, required: &Permission) -> bool {
        matches!(
            (self, required),
            (Permission::Admin, _)
                | (Permission::Delete, Permission::Read)
                | (Permission::Delete, Permission::Write)
                | (Permission::Delete, Permission::Delete)
                | (Permission::Write, Permission::Read)
                | (Permission::Write, Permission::Write)
                | (Permission::Read, Permission::Read)
        )
    }

    pub fn as_str(&self) -> &str {
        match self {
            Permission::Read => "read",
            Permission::Write => "write",
            Permission::Delete => "delete",
            Permission::Admin => "admin",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permission_includes() {
        assert!(Permission::Admin.includes(&Permission::Read));
        assert!(Permission::Admin.includes(&Permission::Write));
        assert!(Permission::Admin.includes(&Permission::Delete));
        assert!(Permission::Admin.includes(&Permission::Admin));

        assert!(Permission::Delete.includes(&Permission::Read));
        assert!(Permission::Delete.includes(&Permission::Write));
        assert!(Permission::Delete.includes(&Permission::Delete));
        assert!(!Permission::Delete.includes(&Permission::Admin));

        assert!(Permission::Write.includes(&Permission::Read));
        assert!(Permission::Write.includes(&Permission::Write));
        assert!(!Permission::Write.includes(&Permission::Delete));

        assert!(Permission::Read.includes(&Permission::Read));
        assert!(!Permission::Read.includes(&Permission::Write));
    }

    #[test]
    fn test_permission_variants() {
        assert_ne!(Permission::Read, Permission::Write);
        assert_ne!(Permission::Write, Permission::Delete);
        assert_ne!(Permission::Delete, Permission::Admin);
    }

    #[test]
    fn test_permission_serialization() {
        let read_perm = Permission::Read;
        let json = serde_json::to_string(&read_perm).unwrap();
        assert_eq!(json, "\"read\"");

        let deserialized: Permission = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, Permission::Read);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct TemplateCategory {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub icon: Option<String>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub is_active: Option<bool>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Template {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub category_id: Option<Uuid>,
    pub module: String,
    pub description: Option<String>,
    pub content: String,
    pub variables: Option<serde_json::Value>,
    pub is_active: Option<bool>,
    pub is_system: Option<bool>,
    pub sort_order: Option<i32>,
    pub view_count: Option<i32>,
    pub use_count: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TemplateResponse {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub category_id: Option<Uuid>,
    pub category_name: Option<String>,
    pub module: String,
    pub description: Option<String>,
    pub content: String,
    pub variables: Option<serde_json::Value>,
    pub is_active: bool,
    pub is_system: bool,
    pub view_count: i32,
    pub use_count: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TemplateCategoryResponse {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub icon: Option<String>,
    pub description: Option<String>,
    pub template_count: i64,
    pub is_active: bool,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct ListTemplatesQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub module: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct ListTemplatesResponse {
    pub items: Vec<TemplateResponse>,
    pub total: i64,
    pub page: u32,
    pub page_size: u32,
}

// ==================== 档案管理相关模型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type, ToSchema)]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum ArchiveStatus {
    Active,
    Archived,
    ToDestroy,
    Destroyed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type, ToSchema)]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
pub enum SecurityLevel {
    Internal,
    Confidential,
    Secret,
    TopSecret,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type, ToSchema)]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
#[allow(dead_code)]
pub enum BorrowType {
    View,
    Download,
    Physical,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type, ToSchema)]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
#[allow(dead_code)]
pub enum BorrowStatus {
    Pending,
    Approved,
    Rejected,
    Borrowed,
    Returned,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type, ToSchema)]
#[sqlx(rename_all = "snake_case")]
#[serde(rename_all = "snake_case")]
#[allow(dead_code)]
pub enum DestructionStatus {
    Pending,
    Approved,
    Executed,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ArchiveCategory {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub retention_period: Option<i32>,
    pub sort_order: i32,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Archive {
    pub id: Uuid,
    pub archive_no: String,
    pub title: String,
    pub category_id: Uuid,
    pub file_id: Option<Uuid>,
    pub summary: Option<String>,
    pub keywords: Option<Vec<String>>,
    pub creator: Option<String>,
    pub created_date: Option<chrono::NaiveDate>,
    pub retention_period: Option<i32>,
    pub status: ArchiveStatus,
    pub security_level: SecurityLevel,
    pub department_id: Option<Uuid>,
    pub source_module: Option<String>,
    pub source_id: Option<Uuid>,
    pub archived_at: Option<DateTime<Utc>>,
    pub archived_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
#[allow(dead_code)]
pub struct ArchiveBorrow {
    pub id: Uuid,
    pub archive_id: Uuid,
    pub borrower_id: Uuid,
    pub borrower_name: String,
    pub borrow_reason: String,
    pub borrow_type: BorrowType,
    pub borrow_date: chrono::NaiveDate,
    pub due_date: chrono::NaiveDate,
    pub return_date: Option<chrono::NaiveDate>,
    pub status: BorrowStatus,
    pub approver_id: Option<Uuid>,
    pub approval_comment: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
#[allow(dead_code)]
pub struct ArchiveDestruction {
    pub id: Uuid,
    pub archive_id: Uuid,
    pub reason: String,
    pub approver_id: Uuid,
    pub approved_at: Option<DateTime<Utc>>,
    pub destroyed_at: Option<DateTime<Utc>>,
    pub status: DestructionStatus,
    pub created_at: DateTime<Utc>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
#[allow(dead_code)]
pub struct ArchiveMetadata {
    pub id: Uuid,
    pub archive_id: Uuid,
    pub key: String,
    pub value: Option<String>,
    pub created_at: DateTime<Utc>,
}

// 请求/响应模型

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateArchiveCategoryRequest {
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub retention_period: Option<i32>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateArchiveCategoryRequest {
    pub code: Option<String>,
    pub name: Option<String>,
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub retention_period: Option<i32>,
    pub sort_order: Option<i32>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct CreateArchiveRequest {
    pub archive_no: String,
    pub title: String,
    pub category_id: Uuid,
    pub file_id: Option<Uuid>,
    pub summary: Option<String>,
    pub keywords: Option<Vec<String>>,
    pub creator: Option<String>,
    pub created_date: Option<chrono::NaiveDate>,
    pub retention_period: Option<i32>,
    pub security_level: Option<SecurityLevel>,
    pub department_id: Option<Uuid>,
    pub source_module: Option<String>,
    pub source_id: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct UpdateArchiveRequest {
    pub archive_no: Option<String>,
    pub title: Option<String>,
    pub category_id: Option<Uuid>,
    pub file_id: Option<Uuid>,
    pub summary: Option<String>,
    pub keywords: Option<Vec<String>>,
    pub creator: Option<String>,
    pub created_date: Option<chrono::NaiveDate>,
    pub retention_period: Option<i32>,
    pub security_level: Option<SecurityLevel>,
    pub department_id: Option<Uuid>,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct CreateBorrowRequest {
    pub archive_id: Uuid,
    pub borrow_reason: String,
    pub borrow_type: BorrowType,
    pub borrow_date: chrono::NaiveDate,
    pub due_date: chrono::NaiveDate,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct ApproveBorrowRequest {
    pub approval_comment: Option<String>,
    pub approved: bool,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct CreateDestructionRequest {
    pub archive_id: Uuid,
    pub reason: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ListArchivesQuery {
    pub page: Option<u32>,
    pub page_size: Option<u32>,
    pub search: Option<String>,
    pub category_id: Option<Uuid>,
    pub status: Option<ArchiveStatus>,
    pub source_module: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ArchiveResponse {
    pub id: Uuid,
    pub archive_no: String,
    pub title: String,
    pub category_id: Uuid,
    pub category_name: Option<String>,
    pub file_id: Option<Uuid>,
    pub file_name: Option<String>,
    pub summary: Option<String>,
    pub keywords: Option<Vec<String>>,
    pub creator: Option<String>,
    pub created_date: Option<chrono::NaiveDate>,
    pub retention_period: Option<i32>,
    pub status: ArchiveStatus,
    pub security_level: SecurityLevel,
    pub department_id: Option<Uuid>,
    pub source_module: Option<String>,
    pub source_id: Option<Uuid>,
    pub archived_at: Option<DateTime<Utc>>,
    pub archived_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub created_by: String,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ListArchivesResponse {
    pub items: Vec<ArchiveResponse>,
    pub total: i64,
    pub page: u32,
    pub page_size: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ArchiveCategoryResponse {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub retention_period: Option<i32>,
    pub sort_order: i32,
    pub is_active: bool,
    pub archive_count: i64,
    pub children: Vec<ArchiveCategoryResponse>,
}
