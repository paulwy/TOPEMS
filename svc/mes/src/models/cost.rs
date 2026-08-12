#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::Serialize;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ProductionCostRecordResponse {
    pub id: Uuid,
    pub production_order_id: Uuid,
    pub cost_type: String,
    pub amount: f64,
    pub recorded_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct EnergyRecordResponse {
    pub id: Uuid,
    pub workshop_id: Uuid,
    pub product_id: Option<Uuid>,
    pub energy_type: String,
    pub consumption: f64,
    pub unit: String,
    pub cost: f64,
    pub recorded_at: DateTime<Utc>,
}
