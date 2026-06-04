use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct ProjectResource {
    pub id: Uuid,
    pub project_id: Uuid,
    pub resource_type: String,
    pub resource_id: Uuid,
    pub resource_service: Option<String>,
    pub role: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub allocation_percent: Option<i32>,
    pub actual_hours: Option<i32>,
    pub actual_cost: Option<f64>,
    pub status: Option<String>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateResourceRequest {
    pub resource_type: String,
    pub resource_id: Uuid,
    pub resource_service: Option<String>,
    pub role: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub allocation_percent: Option<i32>,
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct UpdateResourceRequest {
    pub role: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub allocation_percent: Option<i32>,
    pub actual_hours: Option<i32>,
    pub actual_cost: Option<f64>,
    pub status: Option<String>,
}
