#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateWorkReportRequest {
    pub work_order_id: Uuid,
    pub worker_id: Uuid,
    pub worker_name: String,
    pub quantity_good: f64,
    pub quantity_bad: f64,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateWorkReportRequest {
    pub quantity_good: Option<f64>,
    pub quantity_bad: Option<f64>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct WorkReportResponse {
    pub id: Uuid,
    pub work_order_id: Uuid,
    pub worker_id: Uuid,
    pub worker_name: String,
    pub quantity_good: f64,
    pub quantity_bad: f64,
    pub quantity_total: f64,
    pub status: String,
    pub submitted_at: Option<DateTime<Utc>>,
    pub archived_at: Option<DateTime<Utc>>,
    pub rework_approval_id: Option<Uuid>,
    pub defect_cause: Option<String>,
    pub rework_plan: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
