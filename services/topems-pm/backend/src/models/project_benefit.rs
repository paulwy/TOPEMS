use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectBenefit {
    pub id: Uuid,
    pub project_id: Uuid,
    pub period_type: String,
    pub period_date: NaiveDate,
    pub planned_cost: f64,
    pub actual_cost: f64,
    pub planned_progress: i32,
    pub actual_progress: i32,
    pub planned_value: f64,
    pub earned_value: f64,
    pub actual_cost_eva: f64,
    pub cpi: f64,
    pub spi: f64,
    pub cv: f64,
    pub sv: f64,
    pub eac: f64,
    pub etc: f64,
    pub roi: f64,
    pub notes: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateBenefitRequest {
    pub period_type: String,
    pub period_date: NaiveDate,
    pub planned_cost: f64,
    pub actual_cost: f64,
    pub planned_progress: i32,
    pub actual_progress: i32,
    pub planned_value: f64,
    pub earned_value: f64,
    pub actual_cost_eva: f64,
    pub notes: Option<String>,
    pub created_by: Option<String>,
}
