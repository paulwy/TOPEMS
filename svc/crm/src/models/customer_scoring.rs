use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct CustomerScore {
    pub id: Uuid,
    pub customer_id: Uuid,
    pub customer_name: String,
    pub score: i32,
    pub score_level: String,
    pub scoring_date: DateTime<Utc>,
    pub factors: serde_json::Value,
    pub trend: String,
    pub last_score: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateCustomerScoreRequest {
    pub customer_id: Uuid,
    pub score: Option<i32>,
    pub score_level: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateCustomerScoreRequest {
    pub score: Option<i32>,
    pub score_level: Option<String>,
    pub factors: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ScoreFactor {
    pub name: String,
    pub weight: i32,
    pub score: i32,
    pub max_score: i32,
}

#[derive(Debug, Deserialize)]
pub struct CustomerScoringQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub customer_id: Option<Uuid>,
    pub score_level: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchCalculateRequest {
    pub customer_ids: Vec<Uuid>,
}
