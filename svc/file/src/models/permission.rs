use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

/// 权限类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Permission {
    Read,
    Write,
    Delete,
    Share,
    Admin,
}

impl From<String> for Permission {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "read" => Permission::Read,
            "write" => Permission::Write,
            "delete" => Permission::Delete,
            "share" => Permission::Share,
            "admin" => Permission::Admin,
            _ => Permission::Read,
        }
    }
}

impl From<Permission> for String {
    fn from(p: Permission) -> Self {
        match p {
            Permission::Read => "read".to_string(),
            Permission::Write => "write".to_string(),
            Permission::Delete => "delete".to_string(),
            Permission::Share => "share".to_string(),
            Permission::Admin => "admin".to_string(),
        }
    }
}

/// 权限主体类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PrincipalType {
    User,
    Department,
    Role,
}

impl From<String> for PrincipalType {
    fn from(s: String) -> Self {
        match s.to_lowercase().as_str() {
            "department" => PrincipalType::Department,
            "role" => PrincipalType::Role,
            _ => PrincipalType::User,
        }
    }
}

impl From<PrincipalType> for String {
    fn from(p: PrincipalType) -> Self {
        match p {
            PrincipalType::User => "user".to_string(),
            PrincipalType::Department => "department".to_string(),
            PrincipalType::Role => "role".to_string(),
        }
    }
}

/// 权限主体
#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct Principal {
    pub principal_type: PrincipalType,
    pub principal_id: Uuid,
}

/// 数据库中的 file_permissions 表行
#[derive(Debug, Clone, FromRow)]
pub struct FilePermissionRecord {
    pub id: Uuid,
    pub file_id: Uuid,
    pub principal_type: String,
    pub principal_id: Uuid,
    pub permission: String,
    pub granted_by: Option<Uuid>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

/// API 响应用的权限信息
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FilePermission {
    pub id: Uuid,
    pub file_id: Uuid,
    pub principal_type: String,
    pub principal_id: Uuid,
    pub permission: String,
    pub granted_by: Option<Uuid>,
    pub expires_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

impl From<FilePermissionRecord> for FilePermission {
    fn from(record: FilePermissionRecord) -> Self {
        FilePermission {
            id: record.id,
            file_id: record.file_id,
            principal_type: record.principal_type,
            principal_id: record.principal_id,
            permission: record.permission,
            granted_by: record.granted_by,
            expires_at: record.expires_at,
            created_at: record.created_at,
        }
    }
}

/// 分享文件请求
#[derive(Debug, Deserialize)]
pub struct ShareFileRequest {
    pub principal_type: String,
    pub principal_id: Uuid,
    pub permission: String,
    pub expires_at: Option<DateTime<Utc>>,
}

/// 权限检查结果
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct PermissionCheckResult {
    pub allowed: bool,
    pub reason: Option<String>,
}

impl PermissionCheckResult {
    pub fn allow() -> Self {
        PermissionCheckResult {
            allowed: true,
            reason: None,
        }
    }

    pub fn deny(reason: &str) -> Self {
        PermissionCheckResult {
            allowed: false,
            reason: Some(reason.to_string()),
        }
    }
}
