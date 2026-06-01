

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use sqlx::Row;

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

impl PatrolRecord {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            title: row.try_get("title")?,
            description: row.try_get("description")?,
            location_lat: row.try_get("location_lat")?,
            location_lng: row.try_get("location_lng")?,
            address: row.try_get("address")?,
            patrol_type: row.try_get("patrol_type")?,
            status: row.try_get("status")?,
            checked_by: row.try_get("checked_by")?,
            checked_at: row.try_get("checked_at")?,
            created_at: row.try_get("created_at")?,
        })
    }
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

impl ScanRecord {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            barcode: row.try_get("barcode")?,
            location_lat: row.try_get("location_lat")?,
            location_lng: row.try_get("location_lng")?,
            item_type: row.try_get("item_type")?,
            quantity: row.try_get("quantity")?,
            operator: row.try_get("operator")?,
            scanned_at: row.try_get("scanned_at")?,
            created_at: row.try_get("created_at")?,
        })
    }
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

impl PhotoEvidence {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            title: row.try_get("title")?,
            description: row.try_get("description")?,
            location_lat: row.try_get("location_lat")?,
            location_lng: row.try_get("location_lng")?,
            address: row.try_get("address")?,
            file_url: row.try_get("file_url")?,
            recorded_by: row.try_get("recorded_by")?,
            recorded_at: row.try_get("recorded_at")?,
            created_at: row.try_get("created_at")?,
        })
    }
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

impl AudioRecording {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            title: row.try_get("title")?,
            description: row.try_get("description")?,
            location_lat: row.try_get("location_lat")?,
            location_lng: row.try_get("location_lng")?,
            address: row.try_get("address")?,
            duration_seconds: row.try_get("duration_seconds")?,
            file_url: row.try_get("file_url")?,
            recorded_by: row.try_get("recorded_by")?,
            recorded_at: row.try_get("recorded_at")?,
            created_at: row.try_get("created_at")?,
        })
    }
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
    pub location_track: Option<serde_json::Value>,
    pub duration_seconds: Option<i32>,
    pub file_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub recorded_by: String,
    pub recorded_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

impl VideoRecording {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            title: row.try_get("title")?,
            description: row.try_get("description")?,
            start_location_lat: row.try_get("start_location_lat")?,
            start_location_lng: row.try_get("start_location_lng")?,
            location_track: row.try_get("location_track")?,
            duration_seconds: row.try_get("duration_seconds")?,
            file_url: row.try_get("file_url")?,
            thumbnail_url: row.try_get("thumbnail_url")?,
            recorded_by: row.try_get("recorded_by")?,
            recorded_at: row.try_get("recorded_at")?,
            created_at: row.try_get("created_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateVideoRecording {
    pub title: String,
    pub description: Option<String>,
    pub start_location_lat: f64,
    pub start_location_lng: f64,
    pub location_track: Option<serde_json::Value>,
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
    pub assignee: Option<String>,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub due_date: Option<chrono::NaiveDate>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl MobileTask {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            title: row.try_get("title")?,
            description: row.try_get("description")?,
            task_type: row.try_get("task_type")?,
            priority: row.try_get("priority")?,
            status: row.try_get("status")?,
            assignee: row.try_get("assignee")?,
            location_lat: row.try_get("location_lat")?,
            location_lng: row.try_get("location_lng")?,
            due_date: row.try_get("due_date")?,
            completed_at: row.try_get("completed_at")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMobileTask {
    pub title: String,
    pub description: Option<String>,
    pub task_type: String,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub due_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaskStatus {
    pub status: String,
}
