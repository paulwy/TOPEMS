use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ScoringDimension {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub code: String,
    pub weight: f64,
    pub min_score: f64,
    pub max_score: f64,
    pub description: Option<String>,
    pub is_active: bool,
    pub sort_order: i32,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateScoringDimensionRequest {
    pub name: String,
    pub code: String,
    pub weight: f64,
    pub min_score: f64,
    pub max_score: f64,
    pub description: Option<String>,
    pub is_active: bool,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateScoringDimensionRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub weight: Option<f64>,
    pub min_score: Option<f64>,
    pub max_score: Option<f64>,
    pub description: Option<String>,
    pub is_active: Option<bool>,
    pub sort_order: Option<i32>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_dimension() -> ScoringDimension {
        ScoringDimension {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            name: "Quality".to_string(),
            code: "QUALITY".to_string(),
            weight: 0.4,
            min_score: 0.0,
            max_score: 100.0,
            description: Some("Product quality dimension".to_string()),
            is_active: true,
            sort_order: 1,
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
    fn test_dimension_serde_roundtrip_full() {
        let d = sample_dimension();
        let json = serde_json::to_string(&d).unwrap();
        let de: ScoringDimension = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, d.id);
        assert_eq!(de.name, d.name);
        assert_eq!(de.code, d.code);
        assert_eq!(de.weight, d.weight);
        assert_eq!(de.is_active, d.is_active);
    }

    #[test]
    fn test_dimension_serde_roundtrip_none_options() {
        let mut d = sample_dimension();
        d.description = None;
        d.created_by = None;
        let json = serde_json::to_string(&d).unwrap();
        let de: ScoringDimension = serde_json::from_str(&json).unwrap();
        assert_eq!(de.description, None);
        assert_eq!(de.created_by, None);
    }

    #[test]
    fn test_dimension_clone_equal() {
        let d = sample_dimension();
        let cloned = d.clone();
        assert_eq!(cloned.id, d.id);
        assert_eq!(cloned.code, d.code);
        assert_eq!(cloned.weight, d.weight);
    }

    #[test]
    fn test_dimension_json_field_names() {
        let d = sample_dimension();
        let json = serde_json::to_value(&d).unwrap();
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("name"));
        assert!(obj.contains_key("code"));
        assert!(obj.contains_key("weight"));
        assert!(obj.contains_key("min_score"));
        assert!(obj.contains_key("max_score"));
        assert!(obj.contains_key("is_active"));
        assert!(obj.contains_key("sort_order"));
    }

    #[test]
    fn test_dimension_deserialize_from_json() {
        let json = r#"{
            "id": "00000000-0000-0000-0000-000000000001",
            "tenant_id": "00000000-0000-0000-0000-000000000002",
            "name": "Delivery",
            "code": "DELIVERY",
            "weight": 0.3,
            "min_score": 0.0,
            "max_score": 100.0,
            "description": null,
            "is_active": false,
            "sort_order": 2,
            "created_by": null,
            "created_at": "2025-03-01T00:00:00Z",
            "updated_at": "2025-03-02T00:00:00Z"
        }"#;
        let d: ScoringDimension = serde_json::from_str(json).unwrap();
        assert_eq!(d.code, "DELIVERY");
        assert_eq!(d.weight, 0.3);
        assert!(!d.is_active);
        assert!(d.description.is_none());
    }

    #[test]
    fn test_dimension_ignores_unknown_fields() {
        let d = sample_dimension();
        let mut json = serde_json::to_value(&d).unwrap();
        json["unknown"] = serde_json::json!(1);
        let de: ScoringDimension = serde_json::from_value(json).unwrap();
        assert_eq!(de.id, d.id);
    }

    #[test]
    fn test_create_dimension_request_serde_roundtrip() {
        let req = CreateScoringDimensionRequest {
            name: "Price".to_string(),
            code: "PRICE".to_string(),
            weight: 0.3,
            min_score: 0.0,
            max_score: 100.0,
            description: Some("Price competitiveness".to_string()),
            is_active: true,
            sort_order: 3,
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateScoringDimensionRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.code, req.code);
        assert_eq!(de.weight, req.weight);
        assert_eq!(de.is_active, req.is_active);
    }

    #[test]
    fn test_create_dimension_request_clone() {
        let req = CreateScoringDimensionRequest {
            name: "Service".to_string(),
            code: "SERVICE".to_string(),
            weight: 0.2,
            min_score: 0.0,
            max_score: 100.0,
            description: None,
            is_active: false,
            sort_order: 4,
        };
        let cloned = req.clone();
        assert_eq!(cloned.code, req.code);
        assert_eq!(cloned.is_active, req.is_active);
    }

    #[test]
    fn test_create_dimension_request_minimal() {
        let json = r#"{
            "name": "Compliance",
            "code": "COMPLIANCE",
            "weight": 0.1,
            "min_score": 0.0,
            "max_score": 100.0,
            "is_active": true,
            "sort_order": 5
        }"#;
        let req: CreateScoringDimensionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.code, "COMPLIANCE");
        assert!(req.description.is_none());
    }

    #[test]
    fn test_update_dimension_request_all_none() {
        let json = r#"{}"#;
        let req: UpdateScoringDimensionRequest = serde_json::from_str(json).unwrap();
        assert!(req.name.is_none());
        assert!(req.weight.is_none());
        assert!(req.is_active.is_none());
    }

    #[test]
    fn test_update_dimension_request_partial() {
        let json = r#"{"weight": 0.5, "is_active": false}"#;
        let req: UpdateScoringDimensionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.weight, Some(0.5));
        assert_eq!(req.is_active, Some(false));
        assert!(req.name.is_none());
    }

    #[test]
    fn test_update_dimension_request_serde_roundtrip_full() {
        let req = UpdateScoringDimensionRequest {
            name: Some("Updated".to_string()),
            code: Some("UPDATED".to_string()),
            weight: Some(0.25),
            min_score: Some(10.0),
            max_score: Some(90.0),
            description: Some("desc".to_string()),
            is_active: Some(true),
            sort_order: Some(7),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: UpdateScoringDimensionRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.code, req.code);
        assert_eq!(de.weight, req.weight);
        assert_eq!(de.sort_order, req.sort_order);
    }

    #[test]
    fn test_dimension_weight_extremes() {
        let mut d = sample_dimension();
        d.weight = 0.0;
        let json = serde_json::to_string(&d).unwrap();
        let de: ScoringDimension = serde_json::from_str(&json).unwrap();
        assert_eq!(de.weight, 0.0);

        d.weight = 1.0;
        let json = serde_json::to_string(&d).unwrap();
        let de: ScoringDimension = serde_json::from_str(&json).unwrap();
        assert_eq!(de.weight, 1.0);
    }

    #[test]
    fn test_dimension_is_active_toggle() {
        let mut d = sample_dimension();
        d.is_active = false;
        let json = serde_json::to_string(&d).unwrap();
        let de: ScoringDimension = serde_json::from_str(&json).unwrap();
        assert!(!de.is_active);

        d.is_active = true;
        let json = serde_json::to_string(&d).unwrap();
        let de: ScoringDimension = serde_json::from_str(&json).unwrap();
        assert!(de.is_active);
    }

    #[test]
    fn test_dimension_score_range_zero_to_hundred() {
        let mut d = sample_dimension();
        d.min_score = 0.0;
        d.max_score = 100.0;
        let json = serde_json::to_string(&d).unwrap();
        let de: ScoringDimension = serde_json::from_str(&json).unwrap();
        assert_eq!(de.min_score, 0.0);
        assert_eq!(de.max_score, 100.0);
    }

    #[test]
    fn test_dimension_sort_order_variants() {
        let mut d = sample_dimension();
        for order in [0, 1, 10, 100, -1] {
            d.sort_order = order;
            let json = serde_json::to_string(&d).unwrap();
            let de: ScoringDimension = serde_json::from_str(&json).unwrap();
            assert_eq!(de.sort_order, order);
        }
    }
}
