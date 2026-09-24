use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierCategory {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub category_no: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<Uuid>,
    pub level: i32,
    pub is_active: bool,
    pub supplier_count: i64,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSupplierCategoryRequest {
    pub category_no: String,
    pub name: String,
    pub description: Option<String>,
    pub parent_id: Option<String>,
    pub level: i32,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSupplierCategoryRequest {
    pub category_no: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub parent_id: Option<String>,
    pub level: Option<i32>,
    pub is_active: Option<bool>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_category() -> SupplierCategory {
        SupplierCategory {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            category_no: "CAT-001".to_string(),
            name: "Raw Materials".to_string(),
            description: Some("Raw material suppliers".to_string()),
            parent_id: Some(Uuid::new_v4()),
            level: 2,
            is_active: true,
            supplier_count: 0,
            created_by: Some(Uuid::new_v4()),
            created_at: DateTime::parse_from_rfc3339("2025-01-01T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339("2025-01-02T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        }
    }

    #[test]
    fn test_category_serde_roundtrip_full() {
        let c = sample_category();
        let json = serde_json::to_string(&c).unwrap();
        let de: SupplierCategory = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, c.id);
        assert_eq!(de.category_no, c.category_no);
        assert_eq!(de.name, c.name);
        assert_eq!(de.level, c.level);
        assert_eq!(de.is_active, c.is_active);
    }

    #[test]
    fn test_category_serde_roundtrip_none_options() {
        let mut c = sample_category();
        c.description = None;
        c.parent_id = None;
        c.created_by = None;
        let json = serde_json::to_string(&c).unwrap();
        let de: SupplierCategory = serde_json::from_str(&json).unwrap();
        assert_eq!(de.description, None);
        assert_eq!(de.parent_id, None);
        assert_eq!(de.created_by, None);
    }

    #[test]
    fn test_category_clone_equal() {
        let c = sample_category();
        let cloned = c.clone();
        assert_eq!(cloned.id, c.id);
        assert_eq!(cloned.category_no, c.category_no);
    }

    #[test]
    fn test_category_json_field_names() {
        let c = sample_category();
        let json = serde_json::to_value(&c).unwrap();
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("category_no"));
        assert!(obj.contains_key("parent_id"));
        assert!(obj.contains_key("is_active"));
        assert!(obj.contains_key("level"));
        assert!(obj.contains_key("tenant_id"));
    }

    #[test]
    fn test_category_deserialize_from_json() {
        let json = r#"{
            "id": "00000000-0000-0000-0000-000000000001",
            "tenant_id": "00000000-0000-0000-0000-000000000002",
            "category_no": "CAT-002",
            "name": "Logistics",
            "description": null,
            "parent_id": null,
            "level": 1,
            "is_active": false,
            "supplier_count": 0,
            "created_by": null,
            "created_at": "2025-03-01T00:00:00Z",
            "updated_at": "2025-03-02T00:00:00Z"
        }"#;
        let c: SupplierCategory = serde_json::from_str(json).unwrap();
        assert_eq!(c.category_no, "CAT-002");
        assert_eq!(c.level, 1);
        assert!(!c.is_active);
        assert!(c.parent_id.is_none());
    }

    #[test]
    fn test_category_ignores_unknown_fields() {
        let c = sample_category();
        let mut json = serde_json::to_value(&c).unwrap();
        json["unknown"] = serde_json::json!(1);
        let de: SupplierCategory = serde_json::from_value(json).unwrap();
        assert_eq!(de.id, c.id);
    }

    #[test]
    fn test_create_category_request_serde_roundtrip() {
        let req = CreateSupplierCategoryRequest {
            category_no: "CAT-003".to_string(),
            name: "Services".to_string(),
            description: Some("Service providers".to_string()),
            parent_id: Some("00000000-0000-0000-0000-000000000001".to_string()),
            level: 2,
            is_active: true,
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateSupplierCategoryRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.category_no, req.category_no);
        assert_eq!(de.level, req.level);
    }

    #[test]
    fn test_create_category_request_clone() {
        let req = CreateSupplierCategoryRequest {
            category_no: "CAT-004".to_string(),
            name: "Hardware".to_string(),
            description: None,
            parent_id: None,
            level: 1,
            is_active: false,
        };
        let cloned = req.clone();
        assert_eq!(cloned.category_no, req.category_no);
        assert_eq!(cloned.is_active, req.is_active);
    }

    #[test]
    fn test_create_category_request_minimal() {
        let json = r#"{
            "category_no": "CAT-005",
            "name": "Other",
            "level": 1,
            "is_active": true
        }"#;
        let req: CreateSupplierCategoryRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.category_no, "CAT-005");
        assert!(req.description.is_none());
        assert!(req.parent_id.is_none());
    }

    #[test]
    fn test_update_category_request_all_none() {
        let json = r#"{}"#;
        let req: UpdateSupplierCategoryRequest = serde_json::from_str(json).unwrap();
        assert!(req.name.is_none());
        assert!(req.level.is_none());
    }

    #[test]
    fn test_update_category_request_partial() {
        let json = r#"{"name": "Updated", "is_active": false}"#;
        let req: UpdateSupplierCategoryRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.name.as_deref(), Some("Updated"));
        assert_eq!(req.is_active, Some(false));
    }

    #[test]
    fn test_update_category_request_serde_roundtrip_full() {
        let req = UpdateSupplierCategoryRequest {
            category_no: Some("CAT-006".to_string()),
            name: Some("Updated Name".to_string()),
            description: Some("desc".to_string()),
            parent_id: Some("00000000-0000-0000-0000-000000000002".to_string()),
            level: Some(3),
            is_active: Some(true),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: UpdateSupplierCategoryRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.name, req.name);
        assert_eq!(de.level, req.level);
    }

    #[test]
    fn test_category_level_variants() {
        let mut c = sample_category();
        for level in [1, 2, 3, 4, 5] {
            c.level = level;
            let json = serde_json::to_string(&c).unwrap();
            let de: SupplierCategory = serde_json::from_str(&json).unwrap();
            assert_eq!(de.level, level);
        }
    }

    #[test]
    fn test_category_is_active_toggle() {
        let mut c = sample_category();
        c.is_active = false;
        let json = serde_json::to_string(&c).unwrap();
        let de: SupplierCategory = serde_json::from_str(&json).unwrap();
        assert!(!de.is_active);
    }
}
