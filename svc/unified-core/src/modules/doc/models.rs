use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Document {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub title: String,
    pub folder_id: Option<Uuid>,
    pub template_id: Option<Uuid>,
    pub content: Option<String>,
    pub content_type: Option<String>,
    pub status: Option<String>,
    pub version: Option<i32>,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
    pub file_name: Option<String>,
    pub file_path: Option<String>,
    pub file_size: Option<i64>,
    pub mime_type: Option<String>,
    pub published_at: Option<DateTime<Utc>>,
    pub published_by: Option<String>,
    pub archived_at: Option<DateTime<Utc>>,
    pub archived_by: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Template {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    pub content_type: Option<String>,
    pub fields: Option<serde_json::Value>,
    pub is_enabled: Option<bool>,
    pub is_default: Option<bool>,
    pub created_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Folder {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub is_enabled: Option<bool>,
    pub created_by: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateDocumentRequest {
    pub title: String,
    pub folder_id: Option<Uuid>,
    pub template_id: Option<Uuid>,
    pub content: Option<String>,
    pub content_type: Option<String>,
    pub status: Option<String>,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateDocumentRequest {
    pub title: Option<String>,
    pub folder_id: Option<Uuid>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTemplateRequest {
    pub name: String,
    pub category: Option<String>,
    pub description: Option<String>,
    pub content: String,
    pub content_type: Option<String>,
    pub fields: Option<serde_json::Value>,
    pub is_enabled: Option<bool>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateTemplateRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    pub content_type: Option<String>,
    pub fields: Option<serde_json::Value>,
    pub is_enabled: Option<bool>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateFolderRequest {
    pub name: String,
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub is_enabled: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateFolderRequest {
    pub name: Option<String>,
    pub parent_id: Option<Uuid>,
    pub description: Option<String>,
    pub sort_order: Option<i32>,
    pub is_enabled: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json;

    fn sample_time() -> chrono::DateTime<chrono::Utc> {
        chrono::DateTime::parse_from_rfc3339("2024-01-15T10:30:00Z")
            .unwrap()
            .with_timezone(&chrono::Utc)
    }

    #[test]
    fn test_document_construct_and_serde() {
        let doc = Document {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            title: "2024年度计划".to_string(),
            folder_id: Some(Uuid::new_v4()),
            template_id: None,
            content: Some("<h1>计划内容</h1>".to_string()),
            content_type: Some("html".to_string()),
            status: Some("published".to_string()),
            version: Some(2),
            tags: Some(vec!["重要".to_string(), "计划".to_string()]),
            description: Some("年度工作计划文档".to_string()),
            file_name: None,
            file_path: None,
            file_size: None,
            mime_type: None,
            published_at: Some(sample_time()),
            published_by: Some("user-1".to_string()),
            archived_at: None,
            archived_by: None,
            created_by: Some("user-1".to_string()),
            created_at: Some(sample_time()),
            updated_at: Some(sample_time()),
        };
        let json = serde_json::to_string(&doc).unwrap();
        let de: Document = serde_json::from_str(&json).unwrap();
        assert_eq!(de.title, "2024年度计划");
        assert_eq!(de.version, Some(2));
        assert_eq!(de.tags.as_ref().unwrap().len(), 2);
    }

    #[test]
    fn test_template_serde() {
        let t = Template {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "标准合同模板".to_string(),
            category: Some("legal".to_string()),
            description: Some("适用于一般合同".to_string()),
            content: Some("<p>合同正文模板</p>".to_string()),
            content_type: Some("html".to_string()),
            fields: Some(serde_json::json!([{"name": "party_a", "type": "text"}])),
            is_enabled: Some(true),
            is_default: Some(false),
            created_by: Some("admin".to_string()),
            created_at: Some(sample_time()),
            updated_at: Some(sample_time()),
        };
        let json = serde_json::to_string(&t).unwrap();
        let de: Template = serde_json::from_str(&json).unwrap();
        assert_eq!(de.name, "标准合同模板");
        assert_eq!(de.is_enabled, Some(true));
    }

    #[test]
    fn test_folder_serde() {
        let folder = Folder {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "市场部文档".to_string(),
            parent_id: None,
            description: Some("存放市场部相关资料".to_string()),
            sort_order: Some(1),
            is_enabled: Some(true),
            created_by: Some("user-marketing".to_string()),
            created_at: Some(sample_time()),
            updated_at: Some(sample_time()),
        };
        let json = serde_json::to_string(&folder).unwrap();
        let de: Folder = serde_json::from_str(&json).unwrap();
        assert_eq!(de.name, "市场部文档");
        assert!(de.parent_id.is_none());
    }

    #[test]
    fn test_create_document_request() {
        let req = CreateDocumentRequest {
            title: "新建文档".to_string(),
            folder_id: None,
            template_id: Some(Uuid::new_v4()),
            content: Some("初始内容".to_string()),
            content_type: Some("markdown".to_string()),
            status: Some("draft".to_string()),
            tags: Some(vec!["草稿".to_string()]),
            description: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateDocumentRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.title, "新建文档");
        assert!(de.template_id.is_some());
    }

    #[test]
    fn test_update_document_request() {
        let req = UpdateDocumentRequest {
            title: Some("更新后的标题".to_string()),
            folder_id: Some(Uuid::new_v4()),
            content: Some("新内容".to_string()),
            tags: Some(vec!["已更新".to_string()]),
            description: Some("更新说明".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: UpdateDocumentRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.title, Some("更新后的标题".to_string()));
    }

    #[test]
    fn test_create_and_update_template_requests() {
        let ctr = CreateTemplateRequest {
            name: "报销单模板".to_string(),
            category: Some("finance".to_string()),
            description: None,
            content: "报销内容模板".to_string(),
            content_type: Some("html".to_string()),
            fields: Some(serde_json::json!([])),
            is_enabled: Some(true),
            is_default: Some(false),
        };
        let json = serde_json::to_string(&ctr).unwrap();
        let de1: CreateTemplateRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de1.name, "报销单模板");

        let utr = UpdateTemplateRequest {
            name: Some("新版报销单".to_string()),
            category: None,
            description: Some("更新描述".to_string()),
            content: Some("新内容".to_string()),
            content_type: None,
            fields: None,
            is_enabled: Some(true),
            is_default: Some(true),
        };
        let json2 = serde_json::to_string(&utr).unwrap();
        let de2: UpdateTemplateRequest = serde_json::from_str(&json2).unwrap();
        assert_eq!(de2.is_default, Some(true));
    }

    #[test]
    fn test_folder_requests() {
        let cfr = CreateFolderRequest {
            name: "新文件夹".to_string(),
            parent_id: Some(Uuid::new_v4()),
            description: Some("描述".to_string()),
            sort_order: Some(5),
            is_enabled: Some(true),
        };
        let json = serde_json::to_string(&cfr).unwrap();
        let de: CreateFolderRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.name, "新文件夹");

        let ufr = UpdateFolderRequest {
            name: Some("改名后".to_string()),
            parent_id: None,
            description: None,
            sort_order: Some(3),
            is_enabled: Some(false),
        };
        let json2 = serde_json::to_string(&ufr).unwrap();
        let de2: UpdateFolderRequest = serde_json::from_str(&json2).unwrap();
        assert_eq!(de2.is_enabled, Some(false));
    }
}
