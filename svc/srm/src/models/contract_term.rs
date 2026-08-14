use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ContractTerm {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub contract_id: Uuid,
    pub term_type: String,
    pub title: String,
    pub content: Option<String>,
    pub sort_order: i32,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateContractTermRequest {
    pub contract_id: String,
    pub term_type: String,
    pub title: String,
    pub content: Option<String>,
    pub sort_order: i32,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_term() -> ContractTerm {
        ContractTerm {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            contract_id: Uuid::new_v4(),
            term_type: "payment".to_string(),
            title: "Payment Terms".to_string(),
            content: Some("Net 30 days".to_string()),
            sort_order: 1,
            created_at: DateTime::parse_from_rfc3339("2025-01-01T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339("2025-01-02T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        }
    }

    #[test]
    fn test_term_serde_roundtrip_full() {
        let t = sample_term();
        let json = serde_json::to_string(&t).unwrap();
        let de: ContractTerm = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, t.id);
        assert_eq!(de.term_type, t.term_type);
        assert_eq!(de.title, t.title);
        assert_eq!(de.sort_order, t.sort_order);
    }

    #[test]
    fn test_term_serde_roundtrip_none_content() {
        let mut t = sample_term();
        t.content = None;
        let json = serde_json::to_string(&t).unwrap();
        let de: ContractTerm = serde_json::from_str(&json).unwrap();
        assert_eq!(de.content, None);
    }

    #[test]
    fn test_term_clone_equal() {
        let t = sample_term();
        let cloned = t.clone();
        assert_eq!(cloned.id, t.id);
        assert_eq!(cloned.title, t.title);
    }

    #[test]
    fn test_term_json_field_names() {
        let t = sample_term();
        let json = serde_json::to_value(&t).unwrap();
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("contract_id"));
        assert!(obj.contains_key("term_type"));
        assert!(obj.contains_key("sort_order"));
        assert!(obj.contains_key("tenant_id"));
    }

    #[test]
    fn test_term_deserialize_from_json() {
        let json = r#"{
            "id": "00000000-0000-0000-0000-000000000001",
            "tenant_id": "00000000-0000-0000-0000-000000000002",
            "contract_id": "00000000-0000-0000-0000-000000000003",
            "term_type": "delivery",
            "title": "Delivery Clause",
            "content": null,
            "sort_order": 5,
            "created_at": "2025-03-01T00:00:00Z",
            "updated_at": "2025-03-02T00:00:00Z"
        }"#;
        let t: ContractTerm = serde_json::from_str(json).unwrap();
        assert_eq!(t.term_type, "delivery");
        assert_eq!(t.sort_order, 5);
        assert!(t.content.is_none());
    }

    #[test]
    fn test_term_ignores_unknown_fields() {
        let t = sample_term();
        let mut json = serde_json::to_value(&t).unwrap();
        json["unknown"] = serde_json::json!("x");
        let de: ContractTerm = serde_json::from_value(json).unwrap();
        assert_eq!(de.id, t.id);
    }

    #[test]
    fn test_create_term_request_serde_roundtrip() {
        let req = CreateContractTermRequest {
            contract_id: "00000000-0000-0000-0000-000000000001".to_string(),
            term_type: "confidentiality".to_string(),
            title: "NDA".to_string(),
            content: Some("Confidential".to_string()),
            sort_order: 10,
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateContractTermRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.term_type, req.term_type);
        assert_eq!(de.sort_order, req.sort_order);
    }

    #[test]
    fn test_create_term_request_clone() {
        let req = CreateContractTermRequest {
            contract_id: "x".to_string(),
            term_type: "t".to_string(),
            title: "T".to_string(),
            content: None,
            sort_order: 0,
        };
        let cloned = req.clone();
        assert_eq!(cloned.title, req.title);
        assert_eq!(cloned.sort_order, req.sort_order);
    }

    #[test]
    fn test_create_term_request_minimal() {
        let json = r#"{
            "contract_id": "00000000-0000-0000-0000-000000000002",
            "term_type": "scope",
            "title": "Scope",
            "sort_order": 0
        }"#;
        let req: CreateContractTermRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.term_type, "scope");
        assert!(req.content.is_none());
    }

    #[test]
    fn test_term_type_variants() {
        let mut t = sample_term();
        for tt in [
            "payment",
            "delivery",
            "warranty",
            "termination",
            "confidentiality",
        ] {
            t.term_type = tt.to_string();
            let json = serde_json::to_string(&t).unwrap();
            let de: ContractTerm = serde_json::from_str(&json).unwrap();
            assert_eq!(de.term_type, tt);
        }
    }

    #[test]
    fn test_term_sort_order_extremes() {
        let mut t = sample_term();
        t.sort_order = i32::MIN;
        let json = serde_json::to_string(&t).unwrap();
        let de: ContractTerm = serde_json::from_str(&json).unwrap();
        assert_eq!(de.sort_order, i32::MIN);

        t.sort_order = i32::MAX;
        let json = serde_json::to_string(&t).unwrap();
        let de: ContractTerm = serde_json::from_str(&json).unwrap();
        assert_eq!(de.sort_order, i32::MAX);
    }

    #[test]
    fn test_term_negative_sort_order() {
        let mut t = sample_term();
        t.sort_order = -5;
        let json = serde_json::to_string(&t).unwrap();
        let de: ContractTerm = serde_json::from_str(&json).unwrap();
        assert_eq!(de.sort_order, -5);
    }

    #[test]
    fn test_term_uuid_fields_roundtrip() {
        let t = sample_term();
        let json = serde_json::to_string(&t).unwrap();
        let de: ContractTerm = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, t.id);
        assert_eq!(de.tenant_id, t.tenant_id);
        assert_eq!(de.contract_id, t.contract_id);
    }
}
