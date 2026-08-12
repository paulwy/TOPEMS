#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct AnomalyRecordResponse {
    pub id: Uuid,
    pub equipment_id: Uuid,
    pub severity: String,
    pub status: String,
    pub description: String,
    pub impact_duration_minutes: i32,
    pub handling_approval_id: Option<Uuid>,
    pub impact_assessment: Option<String>,
    pub mitigation_plan: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
