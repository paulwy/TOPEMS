use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SupplierEvaluation {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub supplier_id: Uuid,
    pub evaluation_no: String,
    pub evaluation_date: DateTime<Utc>,
    pub evaluator: Option<String>,
    pub overall_score: Option<f64>,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub comments: Option<String>,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSupplierEvaluationRequest {
    pub supplier_id: String,
    pub evaluation_no: String,
    pub evaluator: Option<String>,
    pub overall_score: Option<f64>,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub comments: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSupplierEvaluationRequest {
    pub supplier_id: Option<String>,
    pub evaluation_no: Option<String>,
    pub evaluator: Option<String>,
    pub overall_score: Option<f64>,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub comments: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct EvaluationSummaryRow {
    pub total_evaluations: Option<i64>,
    pub avg_overall_score: Option<f64>,
    pub avg_quality_score: Option<f64>,
    pub avg_delivery_score: Option<f64>,
    pub avg_service_score: Option<f64>,
    pub avg_price_score: Option<f64>,
    pub max_overall_score: Option<f64>,
    pub min_overall_score: Option<f64>,
    pub latest_evaluation_date: Option<DateTime<Utc>>,
    pub earliest_evaluation_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct EvaluationScoreTrendRow {
    pub evaluation_date: DateTime<Utc>,
    pub overall_score: Option<f64>,
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub evaluation_no: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_evaluation() -> SupplierEvaluation {
        SupplierEvaluation {
            id: Uuid::new_v4(),
            tenant_id: Uuid::new_v4(),
            supplier_id: Uuid::new_v4(),
            evaluation_no: "EV-001".to_string(),
            evaluation_date: DateTime::parse_from_rfc3339("2025-01-15T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            evaluator: Some("Auditor Zhang".to_string()),
            overall_score: Some(88.5),
            quality_score: Some(90.0),
            delivery_score: Some(85.0),
            service_score: Some(87.0),
            price_score: Some(92.0),
            comments: Some("Good performance".to_string()),
            status: "completed".to_string(),
            created_by: Some(Uuid::new_v4()),
            created_at: DateTime::parse_from_rfc3339("2025-01-15T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            updated_at: DateTime::parse_from_rfc3339("2025-01-16T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
        }
    }

    #[test]
    fn test_evaluation_serde_roundtrip_full() {
        let e = sample_evaluation();
        let json = serde_json::to_string(&e).unwrap();
        let de: SupplierEvaluation = serde_json::from_str(&json).unwrap();
        assert_eq!(de.id, e.id);
        assert_eq!(de.evaluation_no, e.evaluation_no);
        assert_eq!(de.overall_score, e.overall_score);
        assert_eq!(de.quality_score, e.quality_score);
        assert_eq!(de.comments, e.comments);
    }

    #[test]
    fn test_evaluation_serde_roundtrip_none_options() {
        let mut e = sample_evaluation();
        e.evaluator = None;
        e.overall_score = None;
        e.quality_score = None;
        e.delivery_score = None;
        e.service_score = None;
        e.price_score = None;
        e.comments = None;
        e.created_by = None;
        let json = serde_json::to_string(&e).unwrap();
        let de: SupplierEvaluation = serde_json::from_str(&json).unwrap();
        assert_eq!(de.evaluator, None);
        assert_eq!(de.overall_score, None);
        assert_eq!(de.price_score, None);
        assert_eq!(de.comments, None);
    }

    #[test]
    fn test_evaluation_clone_equal() {
        let e = sample_evaluation();
        let cloned = e.clone();
        assert_eq!(cloned.id, e.id);
        assert_eq!(cloned.evaluation_no, e.evaluation_no);
        assert_eq!(cloned.overall_score, e.overall_score);
    }

    #[test]
    fn test_evaluation_json_field_names() {
        let e = sample_evaluation();
        let json = serde_json::to_value(&e).unwrap();
        let obj = json.as_object().unwrap();
        assert!(obj.contains_key("evaluation_no"));
        assert!(obj.contains_key("evaluation_date"));
        assert!(obj.contains_key("overall_score"));
        assert!(obj.contains_key("quality_score"));
        assert!(obj.contains_key("delivery_score"));
        assert!(obj.contains_key("service_score"));
        assert!(obj.contains_key("price_score"));
        assert!(obj.contains_key("supplier_id"));
    }

    #[test]
    fn test_evaluation_deserialize_from_json() {
        let json = r#"{
            "id": "00000000-0000-0000-0000-000000000001",
            "tenant_id": "00000000-0000-0000-0000-000000000002",
            "supplier_id": "00000000-0000-0000-0000-000000000003",
            "evaluation_no": "EV-002",
            "evaluation_date": "2025-03-01T00:00:00Z",
            "evaluator": null,
            "overall_score": null,
            "quality_score": null,
            "delivery_score": null,
            "service_score": null,
            "price_score": null,
            "comments": null,
            "status": "draft",
            "created_by": null,
            "created_at": "2025-03-01T00:00:00Z",
            "updated_at": "2025-03-02T00:00:00Z"
        }"#;
        let e: SupplierEvaluation = serde_json::from_str(json).unwrap();
        assert_eq!(e.evaluation_no, "EV-002");
        assert_eq!(e.status, "draft");
        assert!(e.overall_score.is_none());
        assert!(e.evaluator.is_none());
    }

    #[test]
    fn test_evaluation_ignores_unknown_fields() {
        let e = sample_evaluation();
        let mut json = serde_json::to_value(&e).unwrap();
        json["unknown"] = serde_json::json!(42);
        let de: SupplierEvaluation = serde_json::from_value(json).unwrap();
        assert_eq!(de.id, e.id);
    }

    #[test]
    fn test_create_evaluation_request_serde_roundtrip() {
        let req = CreateSupplierEvaluationRequest {
            supplier_id: "00000000-0000-0000-0000-000000000001".to_string(),
            evaluation_no: "EV-003".to_string(),
            evaluator: Some("Li Si".to_string()),
            overall_score: Some(75.0),
            quality_score: Some(80.0),
            delivery_score: Some(70.0),
            service_score: Some(75.0),
            price_score: Some(85.0),
            comments: Some("Acceptable".to_string()),
            status: "completed".to_string(),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: CreateSupplierEvaluationRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.evaluation_no, req.evaluation_no);
        assert_eq!(de.overall_score, req.overall_score);
        assert_eq!(de.status, req.status);
    }

    #[test]
    fn test_create_evaluation_request_clone() {
        let req = CreateSupplierEvaluationRequest {
            supplier_id: "00000000-0000-0000-0000-000000000002".to_string(),
            evaluation_no: "EV-004".to_string(),
            evaluator: None,
            overall_score: None,
            quality_score: None,
            delivery_score: None,
            service_score: None,
            price_score: None,
            comments: None,
            status: "draft".to_string(),
        };
        let cloned = req.clone();
        assert_eq!(cloned.evaluation_no, req.evaluation_no);
        assert!(cloned.overall_score.is_none());
    }

    #[test]
    fn test_create_evaluation_request_minimal() {
        let json = r#"{
            "supplier_id": "00000000-0000-0000-0000-000000000003",
            "evaluation_no": "EV-005",
            "status": "draft"
        }"#;
        let req: CreateSupplierEvaluationRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.evaluation_no, "EV-005");
        assert!(req.overall_score.is_none());
        assert!(req.evaluator.is_none());
    }

    #[test]
    fn test_update_evaluation_request_all_none() {
        let json = r#"{}"#;
        let req: UpdateSupplierEvaluationRequest = serde_json::from_str(json).unwrap();
        assert!(req.evaluation_no.is_none());
        assert!(req.status.is_none());
        assert!(req.overall_score.is_none());
    }

    #[test]
    fn test_update_evaluation_request_partial() {
        let json = r#"{"status": "completed", "overall_score": 90.0}"#;
        let req: UpdateSupplierEvaluationRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.status.as_deref(), Some("completed"));
        assert_eq!(req.overall_score, Some(90.0));
        assert!(req.evaluation_no.is_none());
    }

    #[test]
    fn test_update_evaluation_request_serde_roundtrip_full() {
        let req = UpdateSupplierEvaluationRequest {
            supplier_id: Some("00000000-0000-0000-0000-000000000004".to_string()),
            evaluation_no: Some("EV-006".to_string()),
            evaluator: Some("Wang Wu".to_string()),
            overall_score: Some(95.0),
            quality_score: Some(96.0),
            delivery_score: Some(94.0),
            service_score: Some(93.0),
            price_score: Some(92.0),
            comments: Some("Excellent".to_string()),
            status: Some("completed".to_string()),
        };
        let json = serde_json::to_string(&req).unwrap();
        let de: UpdateSupplierEvaluationRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(de.evaluation_no, req.evaluation_no);
        assert_eq!(de.overall_score, req.overall_score);
        assert_eq!(de.status, req.status);
    }

    #[test]
    fn test_evaluation_summary_row_serde_roundtrip() {
        let row = EvaluationSummaryRow {
            total_evaluations: Some(15),
            avg_overall_score: Some(85.5),
            avg_quality_score: Some(88.0),
            avg_delivery_score: Some(82.0),
            avg_service_score: Some(86.0),
            avg_price_score: Some(90.0),
            max_overall_score: Some(98.0),
            min_overall_score: Some(60.0),
            latest_evaluation_date: Some(
                DateTime::parse_from_rfc3339("2025-04-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
            earliest_evaluation_date: Some(
                DateTime::parse_from_rfc3339("2024-04-01T00:00:00Z")
                    .unwrap()
                    .with_timezone(&Utc),
            ),
        };
        let json = serde_json::to_string(&row).unwrap();
        let de: EvaluationSummaryRow = serde_json::from_str(&json).unwrap();
        assert_eq!(de.total_evaluations, row.total_evaluations);
        assert_eq!(de.avg_overall_score, row.avg_overall_score);
        assert_eq!(de.max_overall_score, row.max_overall_score);
    }

    #[test]
    fn test_evaluation_summary_row_all_none() {
        let row = EvaluationSummaryRow {
            total_evaluations: None,
            avg_overall_score: None,
            avg_quality_score: None,
            avg_delivery_score: None,
            avg_service_score: None,
            avg_price_score: None,
            max_overall_score: None,
            min_overall_score: None,
            latest_evaluation_date: None,
            earliest_evaluation_date: None,
        };
        let json = serde_json::to_string(&row).unwrap();
        let de: EvaluationSummaryRow = serde_json::from_str(&json).unwrap();
        assert!(de.total_evaluations.is_none());
        assert!(de.avg_overall_score.is_none());
    }

    #[test]
    fn test_evaluation_score_trend_row_serde_roundtrip() {
        let row = EvaluationScoreTrendRow {
            evaluation_date: DateTime::parse_from_rfc3339("2025-01-01T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            overall_score: Some(85.0),
            quality_score: Some(88.0),
            delivery_score: Some(82.0),
            service_score: Some(86.0),
            price_score: Some(90.0),
            evaluation_no: "EV-007".to_string(),
        };
        let json = serde_json::to_string(&row).unwrap();
        let de: EvaluationScoreTrendRow = serde_json::from_str(&json).unwrap();
        assert_eq!(de.evaluation_no, row.evaluation_no);
        assert_eq!(de.overall_score, row.overall_score);
        assert_eq!(de.evaluation_date, row.evaluation_date);
    }

    #[test]
    fn test_evaluation_score_trend_row_none_scores() {
        let row = EvaluationScoreTrendRow {
            evaluation_date: DateTime::parse_from_rfc3339("2025-02-01T00:00:00Z")
                .unwrap()
                .with_timezone(&Utc),
            overall_score: None,
            quality_score: None,
            delivery_score: None,
            service_score: None,
            price_score: None,
            evaluation_no: "EV-008".to_string(),
        };
        let json = serde_json::to_string(&row).unwrap();
        let de: EvaluationScoreTrendRow = serde_json::from_str(&json).unwrap();
        assert!(de.overall_score.is_none());
        assert_eq!(de.evaluation_no, "EV-008");
    }

    #[test]
    fn test_evaluation_status_variants() {
        let mut e = sample_evaluation();
        for status in ["draft", "in_progress", "completed", "cancelled"] {
            e.status = status.to_string();
            let json = serde_json::to_string(&e).unwrap();
            let de: SupplierEvaluation = serde_json::from_str(&json).unwrap();
            assert_eq!(de.status, status);
        }
    }

    #[test]
    fn test_evaluation_score_extreme_values() {
        let mut e = sample_evaluation();
        e.overall_score = Some(0.0);
        e.quality_score = Some(100.0);
        let json = serde_json::to_string(&e).unwrap();
        let de: SupplierEvaluation = serde_json::from_str(&json).unwrap();
        assert_eq!(de.overall_score, Some(0.0));
        assert_eq!(de.quality_score, Some(100.0));
    }
}
