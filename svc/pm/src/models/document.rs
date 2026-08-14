use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProjectDocument {
    pub id: Uuid,
    pub project_id: Uuid,
    pub document_code: Option<String>,
    pub document_name: String,
    pub document_type: String,
    pub file_path: String,
    pub file_size: i64,
    pub file_hash: Option<String>,
    pub version: i32,
    pub status: String,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDocumentRequest {
    pub document_code: Option<String>,
    pub document_name: String,
    pub document_type: String,
    pub file_path: String,
    pub file_size: i64,
    pub file_hash: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDocumentRequest {
    pub document_name: Option<String>,
    pub document_type: Option<String>,
    pub status: Option<String>,
    pub description: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DocumentVersion {
    pub id: Uuid,
    pub document_id: Uuid,
    pub version: i32,
    pub file_path: String,
    pub file_hash: Option<String>,
    pub change_note: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDocumentVersionRequest {
    pub file_path: String,
    pub file_hash: Option<String>,
    pub change_note: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct DocumentFolder {
    pub id: Uuid,
    pub project_id: Uuid,
    pub parent_id: Option<Uuid>,
    pub folder_name: String,
    pub description: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFolderRequest {
    pub parent_id: Option<Uuid>,
    pub folder_name: String,
    pub description: Option<String>,
    pub created_by: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        Utc::now()
    }

    fn uid() -> Uuid {
        Uuid::parse_str("123e4567-e89b-12d3-a456-426614174000").unwrap()
    }

    // ---- ProjectDocument ----

    fn sample_doc() -> ProjectDocument {
        ProjectDocument {
            id: uid(),
            project_id: uid(),
            document_code: Some("DOC-001".to_string()),
            document_name: "需求文档".to_string(),
            document_type: "requirement".to_string(),
            file_path: "/docs/req.pdf".to_string(),
            file_size: 1024,
            file_hash: Some("abc123".to_string()),
            version: 1,
            status: "active".to_string(),
            description: Some("d".to_string()),
            tags: Some(vec!["需求".to_string(), "v1".to_string()]),
            created_by: Some("admin".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_project_document_serde_roundtrip() {
        let d = sample_doc();
        let s = serde_json::to_string(&d).unwrap();
        let back: ProjectDocument = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, d.id);
        assert_eq!(back.document_name, d.document_name);
        assert_eq!(back.document_type, d.document_type);
        assert_eq!(back.file_size, d.file_size);
        assert_eq!(back.version, d.version);
        assert_eq!(back.tags, d.tags);
    }

    #[test]
    fn test_project_document_with_none_optional() {
        let d = ProjectDocument {
            id: uid(),
            project_id: uid(),
            document_code: None,
            document_name: "n".to_string(),
            document_type: "other".to_string(),
            file_path: "/p".to_string(),
            file_size: 0,
            file_hash: None,
            version: 1,
            status: "draft".to_string(),
            description: None,
            tags: None,
            created_by: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&d).unwrap();
        let back: ProjectDocument = serde_json::from_str(&s).unwrap();
        assert!(back.document_code.is_none());
        assert!(back.tags.is_none());
    }

    #[test]
    fn test_project_document_empty_tags_roundtrip() {
        let mut d = sample_doc();
        d.tags = Some(vec![]);
        let s = serde_json::to_string(&d).unwrap();
        let back: ProjectDocument = serde_json::from_str(&s).unwrap();
        assert_eq!(back.tags.as_ref().unwrap().len(), 0);
    }

    #[test]
    fn test_project_document_version_increment_roundtrip() {
        let mut d = sample_doc();
        d.version = 5;
        let s = serde_json::to_string(&d).unwrap();
        let back: ProjectDocument = serde_json::from_str(&s).unwrap();
        assert_eq!(back.version, 5);
    }

    // ---- CreateDocumentRequest ----

    #[test]
    fn test_create_document_request_roundtrip() {
        let r = CreateDocumentRequest {
            document_code: Some("DOC-002".to_string()),
            document_name: "新文档".to_string(),
            document_type: "design".to_string(),
            file_path: "/d".to_string(),
            file_size: 2048,
            file_hash: Some("h".to_string()),
            description: Some("d".to_string()),
            tags: Some(vec!["t1".to_string()]),
            created_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateDocumentRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.document_name, r.document_name);
        assert_eq!(back.file_size, r.file_size);
        assert_eq!(back.tags, r.tags);
    }

    #[test]
    fn test_create_document_request_minimal() {
        let r = CreateDocumentRequest {
            document_code: None,
            document_name: "n".to_string(),
            document_type: "other".to_string(),
            file_path: "/p".to_string(),
            file_size: 0,
            file_hash: None,
            description: None,
            tags: None,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateDocumentRequest = serde_json::from_str(&s).unwrap();
        assert!(back.document_code.is_none());
        assert!(back.tags.is_none());
    }

    // ---- UpdateDocumentRequest ----

    #[test]
    fn test_update_document_request_all_none() {
        let r = UpdateDocumentRequest {
            document_name: None,
            document_type: None,
            status: None,
            description: None,
            tags: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateDocumentRequest = serde_json::from_str(&s).unwrap();
        assert!(back.document_name.is_none());
        assert!(back.tags.is_none());
    }

    #[test]
    fn test_update_document_request_with_values() {
        let r = UpdateDocumentRequest {
            document_name: Some("updated".to_string()),
            document_type: Some("report".to_string()),
            status: Some("archived".to_string()),
            description: Some("d".to_string()),
            tags: Some(vec!["t".to_string()]),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: UpdateDocumentRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.document_name, r.document_name);
        assert_eq!(back.status, r.status);
    }

    // ---- DocumentVersion ----

    #[test]
    fn test_document_version_serde_roundtrip() {
        let v = DocumentVersion {
            id: uid(),
            document_id: uid(),
            version: 3,
            file_path: "/v3.pdf".to_string(),
            file_hash: Some("hash3".to_string()),
            change_note: Some("更新内容".to_string()),
            created_by: Some("u".to_string()),
            created_at: now(),
        };
        let s = serde_json::to_string(&v).unwrap();
        let back: DocumentVersion = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, v.id);
        assert_eq!(back.version, v.version);
        assert_eq!(back.file_hash, v.file_hash);
    }

    #[test]
    fn test_document_version_with_none_optional() {
        let v = DocumentVersion {
            id: uid(),
            document_id: uid(),
            version: 1,
            file_path: "/p".to_string(),
            file_hash: None,
            change_note: None,
            created_by: None,
            created_at: now(),
        };
        let s = serde_json::to_string(&v).unwrap();
        let back: DocumentVersion = serde_json::from_str(&s).unwrap();
        assert!(back.file_hash.is_none());
        assert!(back.change_note.is_none());
    }

    // ---- CreateDocumentVersionRequest ----

    #[test]
    fn test_create_document_version_request_roundtrip() {
        let r = CreateDocumentVersionRequest {
            file_path: "/new.pdf".to_string(),
            file_hash: Some("h".to_string()),
            change_note: Some("note".to_string()),
            created_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateDocumentVersionRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.file_path, r.file_path);
        assert_eq!(back.change_note, r.change_note);
    }

    #[test]
    fn test_create_document_version_request_minimal() {
        let r = CreateDocumentVersionRequest {
            file_path: "/p".to_string(),
            file_hash: None,
            change_note: None,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateDocumentVersionRequest = serde_json::from_str(&s).unwrap();
        assert!(back.file_hash.is_none());
    }

    // ---- DocumentFolder ----

    #[test]
    fn test_document_folder_serde_roundtrip() {
        let f = DocumentFolder {
            id: uid(),
            project_id: uid(),
            parent_id: Some(uid()),
            folder_name: "根目录".to_string(),
            description: Some("d".to_string()),
            created_by: Some("admin".to_string()),
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&f).unwrap();
        let back: DocumentFolder = serde_json::from_str(&s).unwrap();
        assert_eq!(back.id, f.id);
        assert_eq!(back.folder_name, f.folder_name);
        assert_eq!(back.parent_id, f.parent_id);
    }

    #[test]
    fn test_document_folder_root_no_parent() {
        let f = DocumentFolder {
            id: uid(),
            project_id: uid(),
            parent_id: None,
            folder_name: "root".to_string(),
            description: None,
            created_by: None,
            created_at: now(),
            updated_at: now(),
        };
        let s = serde_json::to_string(&f).unwrap();
        let back: DocumentFolder = serde_json::from_str(&s).unwrap();
        assert!(back.parent_id.is_none());
        assert!(back.description.is_none());
    }

    // ---- CreateFolderRequest ----

    #[test]
    fn test_create_folder_request_roundtrip() {
        let r = CreateFolderRequest {
            parent_id: Some(uid()),
            folder_name: "子目录".to_string(),
            description: Some("d".to_string()),
            created_by: Some("u".to_string()),
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateFolderRequest = serde_json::from_str(&s).unwrap();
        assert_eq!(back.folder_name, r.folder_name);
        assert_eq!(back.parent_id, r.parent_id);
    }

    #[test]
    fn test_create_folder_request_root() {
        let r = CreateFolderRequest {
            parent_id: None,
            folder_name: "root".to_string(),
            description: None,
            created_by: None,
        };
        let s = serde_json::to_string(&r).unwrap();
        let back: CreateFolderRequest = serde_json::from_str(&s).unwrap();
        assert!(back.parent_id.is_none());
    }
}
