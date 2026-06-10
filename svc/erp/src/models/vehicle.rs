use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Vehicle {
    pub id: Uuid,
    pub plate_number: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub vehicle_type: Option<String>,
    pub status: String,
    pub driver: Option<String>,
    pub last_service: Option<DateTime<Utc>>,
    pub mileage: Option<i32>,
    pub fuel_type: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVehicleRequest {
    pub plate_number: String,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub vehicle_type: Option<String>,
    pub driver: Option<String>,
    pub mileage: Option<i32>,
    pub fuel_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateVehicleRequest {
    pub plate_number: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub vehicle_type: Option<String>,
    pub status: Option<String>,
    pub driver: Option<String>,
    pub last_service: Option<DateTime<Utc>>,
    pub mileage: Option<i32>,
    pub fuel_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct VehicleRequest {
    pub id: Uuid,
    pub vehicle_id: Uuid,
    pub vehicle_plate: String,
    pub requester: String,
    pub purpose: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub driver_required: bool,
    pub status: String,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejected_reason: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVehicleRequestRequest {
    pub vehicle_id: Uuid,
    pub requester: String,
    pub purpose: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub driver_required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateVehicleRequestRequest {
    pub status: Option<String>,
    pub approved_by: Option<String>,
    pub approved_at: Option<DateTime<Utc>>,
    pub rejected_reason: Option<String>,
}
