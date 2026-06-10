use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct InspectionRecord {
    pub id: Uuid,
    pub equipment_id: Uuid,
    pub equipment_code: String,
    pub equipment_name: String,
    pub inspector: String,
    pub inspection_date: NaiveDate,
    pub location: Option<String>,
    pub temperature: Option<f64>,
    pub vibration: Option<f64>,
    pub noise_level: Option<f64>,
    pub status: String,
    pub items: Option<serde_json::Value>,
    pub abnormalities: Option<String>,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateInspectionRecord {
    pub equipment_id: Uuid,
    pub inspector: String,
    pub inspection_date: String,
    pub location: Option<String>,
    pub temperature: Option<f64>,
    pub vibration: Option<f64>,
    pub noise_level: Option<f64>,
    pub status: String,
    pub items: Option<serde_json::Value>,
    pub abnormalities: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize)]
pub struct MaintenanceRecord {
    pub id: Uuid,
    pub equipment_id: Uuid,
    pub equipment_code: String,
    pub equipment_name: String,
    pub maintenance_type: String,
    pub description: String,
    pub maintainer: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub cost: Option<f64>,
    pub parts_replaced: Option<serde_json::Value>,
    pub result: Option<String>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateMaintenanceRecord {
    pub equipment_id: Uuid,
    pub maintenance_type: String,
    pub description: String,
    pub maintainer: String,
    pub start_time: String,
    pub end_time: Option<String>,
    pub cost: Option<f64>,
    pub parts_replaced: Option<serde_json::Value>,
    pub result: Option<String>,
    pub status: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateMaintenanceStatus {
    pub status: String,
    pub result: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EquipmentStatistics {
    pub total: i64,
    pub in_use: i64,
    pub idle: i64,
    pub maintenance: i64,
    pub scrapped: i64,
    pub total_value: f64,
    pub monthly_inspections: i64,
    pub monthly_maintenances: i64,
    pub pending_repairs: i64,
}
