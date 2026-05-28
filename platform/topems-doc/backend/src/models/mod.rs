use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use utoipa::ToSchema;

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
        match (self, required) {
            (Permission::Admin, _) => true,
            (Permission::Delete, Permission::Read) => true,
            (Permission::Delete, Permission::Write) => true,
            (Permission::Delete, Permission::Delete) => true,
            (Permission::Write, Permission::Read) => true,
            (Permission::Write, Permission::Write) => true,
            (Permission::Read, Permission::Read) => true,
            _ => false,
        }
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
