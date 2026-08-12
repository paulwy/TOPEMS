#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateWorkOrderRequest {
    pub order_id: Uuid,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub equipment_id: Option<Uuid>,
    pub station_id: Option<Uuid>,
    pub planned_start_time: Option<DateTime<Utc>>,
    pub planned_end_time: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateWorkOrderRequest {
    pub quantity: Option<f64>,
    pub equipment_id: Option<Uuid>,
    pub station_id: Option<Uuid>,
    pub planned_start_time: Option<DateTime<Utc>>,
    pub planned_end_time: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct WorkOrderResponse {
    pub id: Uuid,
    pub order_id: Uuid,
    pub order_number: String,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub completed_quantity: f64,
    pub status: String,
    pub equipment_id: Option<Uuid>,
    pub station_id: Option<Uuid>,
    pub planned_start_time: Option<DateTime<Utc>>,
    pub planned_end_time: Option<DateTime<Utc>>,
    pub actual_start_time: Option<DateTime<Utc>>,
    pub actual_end_time: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
