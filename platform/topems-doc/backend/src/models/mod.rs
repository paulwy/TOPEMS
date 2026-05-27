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

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, sqlx::Type, ToSchema)]
#[sqlx(rename_all = "lowercase")]
#[serde(rename_all = "lowercase")]
pub enum Permission {
    Read,
    Write,
    Delete,
    Admin,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_file_metadata_creation() {
        let id = Uuid::new_v4();
        let now = Utc::now();
        
        let metadata = FileMetadata {
            id,
            name: "test.txt".to_string(),
            folder_id: None,
            size: 1024,
            content_type: "text/plain".to_string(),
            storage_path: "/test/path".to_string(),
            created_at: now,
            updated_at: now,
            created_by: "admin".to_string(),
        };
        
        assert_eq!(metadata.id, id);
        assert_eq!(metadata.name, "test.txt");
        assert_eq!(metadata.size, 1024);
    }

    #[test]
    fn test_folder_creation() {
        let id = Uuid::new_v4();
        let now = Utc::now();
        
        let folder = Folder {
            id,
            name: "documents".to_string(),
            parent_id: None,
            created_at: now,
            updated_at: now,
            created_by: "admin".to_string(),
        };
        
        assert_eq!(folder.id, id);
        assert_eq!(folder.name, "documents");
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
