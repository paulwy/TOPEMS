use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatrolRecord {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub location_lat: f64,
    pub location_lng: f64,
    pub address: Option<String>,
    pub patrol_type: String,
    pub status: String,
    pub checked_by: String,
    pub checked_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePatrolRecord {
    pub title: String,
    pub description: Option<String>,
    pub location_lat: f64,
    pub location_lng: f64,
    pub address: Option<String>,
    pub patrol_type: String,
    pub status: Option<String>,
    pub checked_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanRecord {
    pub id: Uuid,
    pub barcode: String,
    pub location_lat: f64,
    pub location_lng: f64,
    pub item_type: String,
    pub quantity: Option<f64>,
    pub operator: String,
    pub scanned_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateScanRecord {
    pub barcode: String,
    pub location_lat: f64,
    pub location_lng: f64,
    pub item_type: String,
    pub quantity: Option<f64>,
    pub operator: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhotoEvidence {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub location_lat: f64,
    pub location_lng: f64,
    pub address: Option<String>,
    pub file_url: Option<String>,
    pub recorded_by: String,
    pub recorded_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePhotoEvidence {
    pub title: String,
    pub description: Option<String>,
    pub location_lat: f64,
    pub location_lng: f64,
    pub address: Option<String>,
    pub file_url: Option<String>,
    pub recorded_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AudioRecording {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub location_lat: f64,
    pub location_lng: f64,
    pub address: Option<String>,
    pub duration_seconds: Option<i32>,
    pub file_url: Option<String>,
    pub recorded_by: String,
    pub recorded_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAudioRecording {
    pub title: String,
    pub description: Option<String>,
    pub location_lat: f64,
    pub location_lng: f64,
    pub address: Option<String>,
    pub duration_seconds: Option<i32>,
    pub file_url: Option<String>,
    pub recorded_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoRecording {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub start_location_lat: f64,
    pub start_location_lng: f64,
    pub location_track: serde_json::Value,
    pub duration_seconds: Option<i32>,
    pub file_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub recorded_by: String,
    pub recorded_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVideoRecording {
    pub title: String,
    pub description: Option<String>,
    pub start_location_lat: f64,
    pub start_location_lng: f64,
    pub duration_seconds: Option<i32>,
    pub file_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub recorded_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MobileTask {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub task_type: String,
    pub priority: String,
    pub status: String,
    pub assignee: String,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub due_date: Option<chrono::NaiveDate>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMobileTask {
    pub title: String,
    pub description: Option<String>,
    pub task_type: String,
    pub priority: Option<String>,
    pub assignee: String,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub due_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaskStatus {
    pub status: String,
}
