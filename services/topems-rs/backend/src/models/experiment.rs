use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct Experiment {
    pub id: Uuid,
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
