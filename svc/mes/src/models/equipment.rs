#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct EquipmentResponse {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub workshop_id: Option<Uuid>,
    pub status: String,
    pub oee_rate: f64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct EquipmentOeeSnapshotResponse {
    pub id: Uuid,
    pub equipment_id: Uuid,
    pub date: chrono::NaiveDate,
    pub shift: String,
    pub availability: f64,
    pub performance: f64,
    pub quality_rate: f64,
    pub oee: f64,
}
