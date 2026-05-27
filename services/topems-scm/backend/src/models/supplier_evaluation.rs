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

#[derive(Debug, Clone, Deserialize)]
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

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateSupplierEvaluationRequest {
    pub quality_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub price_score: Option<f64>,
    pub overall_score: Option<f64>,
    pub comments: Option<String>,
    pub evaluator: Option<String>,
}
