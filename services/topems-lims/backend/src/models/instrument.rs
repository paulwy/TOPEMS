use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Instrument {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub instrument_type: String,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub serial_number: Option<String>,
    pub status: String,
    pub location: Option<String>,
    pub purchase_date: Option<DateTime<Utc>>,
    pub calibration_date: Option<DateTime<Utc>>,
    pub next_calibration_date: Option<DateTime<Utc>>,
    pub maintenance_history: serde_json::Value,
    pub responsible_person: Option<String>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateInstrumentRequest {
    pub name: String,
    pub code: String,
    pub instrument_type: String,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub serial_number: Option<String>,
    pub status: Option<String>,
    pub location: Option<String>,
    pub purchase_date: Option<String>,
    pub calibration_date: Option<String>,
    pub next_calibration_date: Option<String>,
    pub responsible_person: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateInstrumentRequest {
    pub name: Option<String>,
    pub instrument_type: Option<String>,
    pub model: Option<String>,
    pub manufacturer: Option<String>,
    pub serial_number: Option<String>,
    pub status: Option<String>,
    pub location: Option<String>,
    pub calibration_date: Option<String>,
    pub next_calibration_date: Option<String>,
    pub responsible_person: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct MaintenanceRecord {
    pub id: Uuid,
    pub instrument_id: Uuid,
    pub maintenance_type: String,
    pub description: String,
    pub performed_by: String,
    pub performed_at: DateTime<Utc>,
    pub next_maintenance_date: Option<DateTime<Utc>>,
    pub cost: Option<f64>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMaintenanceRecordRequest {
    pub instrument_id: Uuid,
    pub maintenance_type: String,
    pub description: String,
    pub performed_by: String,
    pub performed_at: String,
    pub next_maintenance_date: Option<String>,
    pub cost: Option<f64>,
    pub notes: Option<String>,
}
