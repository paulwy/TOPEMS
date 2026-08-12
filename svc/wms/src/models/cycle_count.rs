use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CycleCountQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub warehouse_id: Option<Uuid>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct CycleCountTask {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub config_id: Option<Uuid>,
    pub warehouse_id: Uuid,
    pub warehouse_name: Option<String>,
    pub location_id: Option<Uuid>,
    pub location_code: Option<String>,
    pub task_number: String,
    pub status: String,
    pub cycle_type: String,
    pub planned_date: Option<DateTime<Utc>>,
    pub actual_date: Option<DateTime<Utc>>,
    pub total_items: i64,
    pub counted_items: i64,
    pub discrepancy_items: i64,
    pub assigned_to: Option<Uuid>,
    pub assigned_user_name: Option<String>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateCycleCountTaskRequest {
    pub config_id: Option<Uuid>,
    pub warehouse_id: Uuid,
    pub location_id: Option<Uuid>,
    pub cycle_type: Option<String>,
    pub planned_date: Option<DateTime<Utc>>,
    pub assigned_to: Option<Uuid>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct UpdateCycleCountTaskRequest {
    pub status: Option<String>,
    pub actual_date: Option<DateTime<Utc>>,
    pub assigned_to: Option<Uuid>,
    pub remarks: Option<String>,
}
