use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct ScoringDimension {
    pub id: Uuid,
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

#[derive(Debug, Clone, Deserialize)]
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

#[derive(Debug, Clone, Deserialize)]
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
