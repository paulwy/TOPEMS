//! Quality Standard DTOs

use serde::{Deserialize, Serialize};
use sqlx::types::Uuid;
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct StandardQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ListStandardsResponse {
    pub standards: Vec<QualityStandard>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct QualityStandard {
    pub id: String,
    pub tenant_id: String,
    pub code: String,
    pub name: String,
    pub category: String,
    pub level: Option<String>,
    pub specification: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateStandardRequest {
    pub name: String,
    pub category: String,
    pub level: Option<String>,
    pub specification: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateStandardRequest {
    pub name: Option<String>,
    pub category: Option<String>,
    pub level: Option<String>,
    pub specification: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct StandardRevision {
    pub id: String,
    pub tenant_id: String,
    pub standard_id: Uuid,
    pub version: Option<String>,
    pub name: String,
    pub category: String,
    pub level: Option<String>,
    pub specification: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_standard_query() {
        roundtrip(&StandardQuery {
            page: Some(1),
            page_size: Some(10),
            category: None,
            status: None,
            search: None,
        });
    }

    #[test]
    fn test_list_standards_response() {
        roundtrip(&ListStandardsResponse {
            standards: vec![],
            total: 0,
            page: 1,
            page_size: 10,
        });
    }

    #[test]
    fn test_quality_standard() {
        roundtrip(&QualityStandard {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            code: "STD001".to_string(),
            name: "n".to_string(),
            category: "c".to_string(),
            level: None,
            specification: None,
            description: None,
            version: None,
            status: None,
            created_by: None,
            created_at: None,
            updated_at: None,
        });
    }

    #[test]
    fn test_create_standard_request() {
        roundtrip(&CreateStandardRequest {
            name: "n".to_string(),
            category: "c".to_string(),
            level: None,
            specification: None,
            description: None,
            version: None,
            created_by: None,
        });
    }

    #[test]
    fn test_update_standard_request() {
        roundtrip(&UpdateStandardRequest {
            name: None,
            category: None,
            level: None,
            specification: None,
            description: None,
            version: None,
            status: None,
        });
    }

    #[test]
    fn test_standard_revision() {
        roundtrip(&StandardRevision {
            id: "id".to_string(),
            tenant_id: "t".to_string(),
            standard_id: Uuid::new_v4(),
            version: None,
            name: "n".to_string(),
            category: "c".to_string(),
            level: None,
            specification: None,
            description: None,
            status: None,
            created_by: None,
            created_at: None,
        });
    }

    #[test]
    fn test_quality_standard_clone_and_debug() {
        let s = QualityStandard {
            id: "s1".to_string(),
            tenant_id: "t1".to_string(),
            code: "ISO-9001".to_string(),
            name: "QMS Standard".to_string(),
            category: "iso".to_string(),
            level: Some("national".to_string()),
            specification: Some("spec text".to_string()),
            description: Some("desc".to_string()),
            version: Some("2015".to_string()),
            status: Some("active".to_string()),
            created_by: Some("u1".to_string()),
            created_at: Some("c".to_string()),
            updated_at: Some("u".to_string()),
        };
        let s2 = s.clone();
        assert_eq!(s.id, s2.id);
        assert_eq!(s.code, s2.code);
        assert_eq!(s.name, s2.name);
        assert_eq!(s.category, s2.category);
        assert_eq!(s.version, s2.version);
        assert!(!format!("{:?}", s).is_empty());
    }

    #[test]
    fn test_standard_query_all_some() {
        roundtrip(&StandardQuery {
            page: Some(1),
            page_size: Some(50),
            category: Some("iso".to_string()),
            status: Some("active".to_string()),
            search: Some("9001".to_string()),
        });
    }

    #[test]
    fn test_create_standard_request_all_some() {
        roundtrip(&CreateStandardRequest {
            name: "Standard X".to_string(),
            category: "internal".to_string(),
            level: Some("company".to_string()),
            specification: Some("spec here".to_string()),
            description: Some("full desc".to_string()),
            version: Some("1.0".to_string()),
            created_by: Some("admin".to_string()),
        });
    }

    #[test]
    fn test_update_standard_request_all_some() {
        roundtrip(&UpdateStandardRequest {
            name: Some("New name".to_string()),
            category: Some("iso".to_string()),
            level: Some("international".to_string()),
            specification: Some("new spec".to_string()),
            description: Some("new desc".to_string()),
            version: Some("2.0".to_string()),
            status: Some("archived".to_string()),
        });
    }
}
