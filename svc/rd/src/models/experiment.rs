use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Experiment {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub code: String,
    pub project_id: Uuid,
    pub formula_id: Option<Uuid>,
    pub experiment_type: String,
    pub phase: String,
    pub status: String,
    pub objective: String,
    pub method: String,
    pub results: serde_json::Value,
    pub conclusions: Option<String>,
    pub experimenter: String,
    pub batch_number: Option<String>,
    pub scale: Option<f64>,
    pub scale_unit: Option<String>,
    pub started_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateExperimentRequest {
    pub name: String,
    pub code: String,
    pub project_id: Uuid,
    pub formula_id: Option<Uuid>,
    pub experiment_type: String,
    pub phase: String,
    pub objective: String,
    pub method: String,
    pub experimenter: String,
    pub batch_number: Option<String>,
    pub scale: Option<f64>,
    pub scale_unit: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateExperimentRequest {
    pub name: Option<String>,
    pub status: Option<String>,
    pub results: Option<serde_json::Value>,
    pub conclusions: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
    pub batch_number: Option<String>,
    pub scale: Option<f64>,
    pub scale_unit: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct ExperimentRecord {
    pub id: Uuid,
    pub experiment_id: Uuid,
    pub record_type: String,
    pub content: String,
    pub attachments: Vec<String>,
    pub recorded_by: String,
    pub recorded_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[allow(dead_code)]
pub struct BatchTraceItem {
    pub id: Uuid,
    pub batch_number: String,
    pub experiment_id: Uuid,
    pub experiment_name: String,
    pub phase: String,
    pub formula_id: Uuid,
    pub formula_name: String,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

#[cfg(test)]
mod tests {
    use super::*;

    fn now() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2024-06-01T08:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn sample_experiment() -> Experiment {
        Experiment {
            id: Uuid::nil(),
            tenant_id: Uuid::nil(),
            name: "实验A".to_string(),
            code: "EXP-001".to_string(),
            project_id: Uuid::nil(),
            formula_id: Some(Uuid::nil()),
            experiment_type: "synthesis".to_string(),
            phase: "testing".to_string(),
            status: "planned".to_string(),
            objective: "验证配方".to_string(),
            method: "对照实验".to_string(),
            results: serde_json::json!({"yield": 0.95}),
            conclusions: Some("达标".to_string()),
            experimenter: "张三".to_string(),
            batch_number: Some("B-001".to_string()),
            scale: Some(1.5),
            scale_unit: Some("kg".to_string()),
            started_at: now(),
            completed_at: None,
            created_by: "admin".to_string(),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_experiment_serde_roundtrip() {
        let exp = sample_experiment();
        let json = serde_json::to_string(&exp).unwrap();
        let back: Experiment = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
        assert_eq!(back.code, "EXP-001");
        assert_eq!(back.results, serde_json::json!({"yield": 0.95}));
    }

    #[test]
    fn test_experiment_clone_preserves_serialization() {
        let exp = sample_experiment();
        let cloned = exp.clone();
        assert_eq!(
            serde_json::to_string(&exp).unwrap(),
            serde_json::to_string(&cloned).unwrap()
        );
    }

    #[test]
    fn test_experiment_debug_contains_name() {
        let exp = sample_experiment();
        let debug = format!("{:?}", exp);
        assert!(debug.contains("Experiment"));
        assert!(debug.contains("EXP-001"));
    }

    #[test]
    fn test_create_experiment_request_roundtrip() {
        let req = CreateExperimentRequest {
            name: "实验B".to_string(),
            code: "EXP-002".to_string(),
            project_id: Uuid::nil(),
            formula_id: None,
            experiment_type: "analysis".to_string(),
            phase: "formulation".to_string(),
            objective: "目标".to_string(),
            method: "方法".to_string(),
            experimenter: "李四".to_string(),
            batch_number: None,
            scale: None,
            scale_unit: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: CreateExperimentRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, "实验B");
        assert_eq!(back.formula_id, None);
    }

    #[test]
    fn test_update_experiment_request_roundtrip_all_none() {
        let req = UpdateExperimentRequest {
            name: None,
            status: None,
            results: None,
            conclusions: None,
            completed_at: None,
            batch_number: None,
            scale: None,
            scale_unit: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        let back: UpdateExperimentRequest = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
    }

    #[test]
    fn test_experiment_record_roundtrip() {
        let rec = ExperimentRecord {
            id: Uuid::nil(),
            experiment_id: Uuid::nil(),
            record_type: "note".to_string(),
            content: "记录内容".to_string(),
            attachments: vec!["a.pdf".to_string(), "b.png".to_string()],
            recorded_by: "admin".to_string(),
            recorded_at: now(),
        };
        let json = serde_json::to_string(&rec).unwrap();
        let back: ExperimentRecord = serde_json::from_str(&json).unwrap();
        assert_eq!(back.attachments.len(), 2);
        assert_eq!(back.attachments[0], "a.pdf");
    }

    #[test]
    fn test_batch_trace_item_roundtrip() {
        let item = BatchTraceItem {
            id: Uuid::nil(),
            batch_number: "B-001".to_string(),
            experiment_id: Uuid::nil(),
            experiment_name: "实验A".to_string(),
            phase: "testing".to_string(),
            formula_id: Uuid::nil(),
            formula_name: "配方1".to_string(),
            status: "completed".to_string(),
            created_at: now(),
            completed_at: Some(now()),
        };
        let json = serde_json::to_string(&item).unwrap();
        let back: BatchTraceItem = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        assert_eq!(json, json2);
        assert!(back.completed_at.is_some());
    }

    #[test]
    fn test_experiment_optional_fields_none() {
        let exp = Experiment {
            formula_id: None,
            conclusions: None,
            batch_number: None,
            scale: None,
            scale_unit: None,
            completed_at: None,
            ..sample_experiment()
        };
        let json = serde_json::to_string(&exp).unwrap();
        let back: Experiment = serde_json::from_str(&json).unwrap();
        assert!(back.formula_id.is_none());
        assert!(back.completed_at.is_none());
    }
}
