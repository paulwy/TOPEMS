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

#[derive(Debug, Clone, Deserialize)]
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

#[derive(Debug, Clone, Deserialize)]
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
