use chrono::{DateTime, Utc, NaiveDate};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Sample {
    pub id: Uuid,
    pub sample_id: String,
    pub name: String,
    pub description: Option<String>,
    pub sample_type: String,
    pub status: String,
    pub received_date: NaiveDate,
    pub analysis_date: Option<NaiveDate>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TestRecord {
    pub id: Uuid,
    pub sample_id: Uuid,
    pub test_name: String,
    pub test_method: Option<String>,
    pub status: String,
    pub result: Option<String>,
    pub unit: Option<String>,
    pub standard: Option<String>,
    pub tested_by: Option<Uuid>,
    pub tested_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Equipment {
    pub id: Uuid,
    pub name: String,
    pub model: Option<String>,
    pub serial_number: Option<String>,
    pub status: String,
    pub location: Option<String>,
    pub last_calibration_date: Option<NaiveDate>,
    pub next_calibration_date: Option<NaiveDate>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// 请求体
#[derive(Debug, Deserialize)]
pub struct CreateSampleRequest {
    pub sample_id: String,
    pub name: String,
    pub description: Option<String>,
    pub sample_type: String,
    pub status: Option<String>,
    pub received_date: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTestRecordRequest {
    pub sample_id: Uuid,
    pub test_name: String,
    pub test_method: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEquipmentRequest {
    pub name: String,
    pub model: Option<String>,
    pub serial_number: Option<String>,
    pub status: Option<String>,
    pub location: Option<String>,
    pub last_calibration_date: Option<String>,
    pub next_calibration_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSampleRequest {
    pub sample_id: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub sample_type: Option<String>,
    pub status: Option<String>,
    pub analysis_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTestRecordRequest {
    pub test_name: Option<String>,
    pub test_method: Option<String>,
    pub status: Option<String>,
    pub result: Option<String>,
    pub unit: Option<String>,
    pub standard: Option<String>,
    pub tested_by: Option<Uuid>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEquipmentRequest {
    pub name: Option<String>,
    pub model: Option<String>,
    pub serial_number: Option<String>,
    pub status: Option<String>,
    pub location: Option<String>,
    pub last_calibration_date: Option<String>,
    pub next_calibration_date: Option<String>,
}
