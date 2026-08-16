use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierEvaluation {
    pub id: Uuid,
    pub supplier_id: Uuid,
    pub evaluation_date: DateTime<Utc>,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub overall_score: Option<f64>,
    pub comments: Option<String>,
    pub evaluator: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateSupplierEvaluationRequest {
    pub supplier_id: Uuid,
    pub evaluation_date: DateTime<Utc>,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub overall_score: Option<f64>,
    pub comments: Option<String>,
    pub evaluator: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateSupplierEvaluationRequest {
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub overall_score: Option<f64>,
    pub comments: Option<String>,
    pub evaluator: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixed_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    fn fixed_dt() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2026-08-15T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn supplier_evaluation_serde_roundtrip_full() {
        let e = SupplierEvaluation {
            id: fixed_uuid(),
            supplier_id: fixed_uuid(),
            evaluation_date: fixed_dt(),
            quality_score: Some(90.0),
            delivery_score: Some(85.0),
            service_score: Some(80.0),
            price_score: Some(95.0),
            overall_score: Some(87.5),
            comments: Some("表现良好".to_string()),
            evaluator: Some("张三".to_string()),
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        roundtrip(&e);
    }

    #[test]
    fn supplier_evaluation_serde_roundtrip_minimal() {
        let e = SupplierEvaluation {
            id: fixed_uuid(),
            supplier_id: fixed_uuid(),
            evaluation_date: fixed_dt(),
            quality_score: None,
            delivery_score: None,
            service_score: None,
            price_score: None,
            overall_score: None,
            comments: None,
            evaluator: None,
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        roundtrip(&e);
    }

    #[test]
    fn supplier_evaluation_deserialize_from_json() {
        let raw = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "supplier_id": "550e8400-e29b-41d4-a716-446655440001",
            "evaluation_date": "2026-08-15T08:00:00Z",
            "quality_score": 80.0,
            "delivery_score": 90.0,
            "service_score": 70.0,
            "price_score": 85.0,
            "overall_score": 81.25,
            "comments": "良好",
            "evaluator": "李四",
            "created_at": "2026-08-15T08:00:00Z",
            "updated_at": "2026-08-16T08:00:00Z"
        }"#;
        let e: SupplierEvaluation = serde_json::from_str(raw).unwrap();
        assert_eq!(e.quality_score, Some(80.0));
        assert_eq!(e.overall_score, Some(81.25));
        assert_eq!(e.evaluator, Some("李四".to_string()));
    }

    #[test]
    fn create_supplier_evaluation_request_serde_roundtrip() {
        let req = CreateSupplierEvaluationRequest {
            supplier_id: fixed_uuid(),
            evaluation_date: fixed_dt(),
            quality_score: Some(80.0),
            delivery_score: Some(90.0),
            service_score: Some(70.0),
            price_score: Some(85.0),
            overall_score: Some(81.25),
            comments: Some("备注".to_string()),
            evaluator: Some("王五".to_string()),
        };
        roundtrip(&req);
    }

    #[test]
    fn create_supplier_evaluation_request_serde_minimal() {
        let req = CreateSupplierEvaluationRequest {
            supplier_id: fixed_uuid(),
            evaluation_date: fixed_dt(),
            quality_score: None,
            delivery_score: None,
            service_score: None,
            price_score: None,
            overall_score: None,
            comments: None,
            evaluator: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn update_supplier_evaluation_request_serde_all_none() {
        let req = UpdateSupplierEvaluationRequest {
            quality_score: None,
            delivery_score: None,
            service_score: None,
            price_score: None,
            overall_score: None,
            comments: None,
            evaluator: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn update_supplier_evaluation_request_serde_partial() {
        let req = UpdateSupplierEvaluationRequest {
            quality_score: Some(85.0),
            delivery_score: None,
            service_score: Some(75.0),
            price_score: None,
            overall_score: Some(80.0),
            comments: Some("更新".to_string()),
            evaluator: None,
        };
        roundtrip(&req);
    }

    #[test]
    fn supplier_evaluation_clone_preserves_data() {
        let e = SupplierEvaluation {
            id: fixed_uuid(),
            supplier_id: fixed_uuid(),
            evaluation_date: fixed_dt(),
            quality_score: Some(90.0),
            delivery_score: Some(85.0),
            service_score: Some(80.0),
            price_score: Some(95.0),
            overall_score: Some(87.5),
            comments: Some("cloned".to_string()),
            evaluator: Some("admin".to_string()),
            created_at: fixed_dt(),
            updated_at: fixed_dt(),
        };
        let cloned = e.clone();
        assert_eq!(e.id, cloned.id);
        assert_eq!(e.quality_score, cloned.quality_score);
        assert_eq!(e.overall_score, cloned.overall_score);
    }
}
