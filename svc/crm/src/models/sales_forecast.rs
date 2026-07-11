use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct SalesForecast {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub period_type: String,
    pub period: String,
    pub predicted_amount: f64,
    pub actual_amount: Option<f64>,
    pub accuracy: Option<f64>,
    pub trend: String,
    pub confidence_level: f64,
    pub factors: serde_json::Value,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateSalesForecastRequest {
    pub period_type: String,
    pub period: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateSalesForecastRequest {
    pub predicted_amount: Option<f64>,
    pub actual_amount: Option<f64>,
    pub accuracy: Option<f64>,
    pub trend: Option<String>,
    pub confidence_level: Option<f64>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ForecastFactor {
    pub name: String,
    pub impact: f64,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SalesForecastQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub period_type: Option<String>,
    pub status: Option<String>,
}
