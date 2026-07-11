use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PatrolRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
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
            tenant_id: row.try_get("tenant_id")?,
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
    pub tenant_id: Uuid,
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
            tenant_id: row.try_get("tenant_id")?,
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
    pub tenant_id: Uuid,
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
            tenant_id: row.try_get("tenant_id")?,
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
    pub tenant_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub location_lat: f64,
    pub location_lng: f64,
    pub address: Option<String>,
    pub duration_seconds: Option<i64>,
    pub file_url: Option<String>,
    pub recorded_by: String,
    pub recorded_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

impl AudioRecording {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
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
    pub duration_seconds: Option<i64>,
    pub file_url: Option<String>,
    pub recorded_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoRecording {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub start_location_lat: f64,
    pub start_location_lng: f64,
    pub location_track: serde_json::Value,
    pub duration_seconds: Option<i64>,
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
            tenant_id: row.try_get("tenant_id")?,
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
    pub location_track: serde_json::Value,
    pub duration_seconds: Option<i64>,
    pub file_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub recorded_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MobileTask {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub task_type: String,
    pub priority: String,
    pub status: String,
    pub assignee: String,
    pub location_lat: f64,
    pub location_lng: f64,
    pub due_date: Option<NaiveDate>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl MobileTask {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
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
    pub assignee: String,
    pub location_lat: f64,
    pub location_lng: f64,
    pub due_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BarcodeScan {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub barcode: String,
    pub barcode_type: String,
    pub decoded_data: String,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub result_action: Option<String>,
    pub result_data: Option<serde_json::Value>,
    pub scanned_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

impl BarcodeScan {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            user_id: row.try_get("user_id")?,
            barcode: row.try_get("barcode")?,
            barcode_type: row.try_get("barcode_type")?,
            decoded_data: row.try_get("decoded_data")?,
            location_lat: row.try_get("location_lat")?,
            location_lng: row.try_get("location_lng")?,
            result_action: row.try_get("result_action")?,
            result_data: row.try_get("result_data")?,
            scanned_at: row.try_get("scanned_at")?,
            created_at: row.try_get("created_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBarcodeScan {
    pub barcode: String,
    pub barcode_type: String,
    pub decoded_data: String,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MobileApproval {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub approval_type: String,
    pub status: String,
    pub title: String,
    pub description: Option<String>,
    pub data: Option<serde_json::Value>,
    pub task_name: Option<String>,
    pub task_id: Option<String>,
    pub process_name: Option<String>,
    pub process_instance_id: Option<String>,
    pub process_definition_id: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<DateTime<Utc>>,
    pub comment: Option<String>,
    pub business_title: Option<String>,
    pub business_key: Option<String>,
    pub assignee_name: Option<String>,
    pub assignee_id: Option<String>,
    pub applicant_name: Option<String>,
    pub applicant_id: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl MobileApproval {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            user_id: row.try_get("user_id")?,
            approval_type: row.try_get("approval_type")?,
            status: row.try_get("status")?,
            title: row.try_get("title")?,
            description: row.try_get("description")?,
            data: row.try_get("data")?,
            task_name: row.try_get("task_name")?,
            task_id: row.try_get("task_id")?,
            process_name: row.try_get("process_name")?,
            process_instance_id: row.try_get("process_instance_id")?,
            process_definition_id: row.try_get("process_definition_id")?,
            priority: row.try_get("priority")?,
            due_date: row.try_get("due_date")?,
            comment: row.try_get("comment")?,
            business_title: row.try_get("business_title")?,
            business_key: row.try_get("business_key")?,
            assignee_name: row.try_get("assignee_name")?,
            assignee_id: row.try_get("assignee_id")?,
            applicant_name: row.try_get("applicant_name")?,
            applicant_id: row.try_get("applicant_id")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMobileApproval {
    pub approval_type: String,
    pub title: String,
    pub description: Option<String>,
    pub data: Option<serde_json::Value>,
    pub task_name: Option<String>,
    pub task_id: Option<String>,
    pub process_name: Option<String>,
    pub process_instance_id: Option<String>,
    pub process_definition_id: Option<String>,
    pub priority: Option<String>,
    pub due_date: Option<String>,
    pub comment: Option<String>,
    pub business_title: Option<String>,
    pub business_key: Option<String>,
    pub assignee_name: Option<String>,
    pub assignee_id: Option<String>,
    pub applicant_name: Option<String>,
    pub applicant_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineOperation {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub operation_type: String,
    pub entity_type: String,
    pub entity_id: String,
    pub operation_data: serde_json::Value,
    pub sync_status: String,
    pub sync_attempts: i32,
    pub last_sync_error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub synced_at: Option<DateTime<Utc>>,
}

impl OfflineOperation {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            user_id: row.try_get("user_id")?,
            operation_type: row.try_get("operation_type")?,
            entity_type: row.try_get("entity_type")?,
            entity_id: row.try_get("entity_id")?,
            operation_data: row.try_get("operation_data")?,
            sync_status: row.try_get("sync_status")?,
            sync_attempts: row.try_get("sync_attempts")?,
            last_sync_error: row.try_get("last_sync_error")?,
            created_at: row.try_get("created_at")?,
            synced_at: row.try_get("synced_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateOfflineOperation {
    pub operation_type: String,
    pub entity_type: String,
    pub entity_id: String,
    pub operation_data: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncPolicy {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub auto_sync_enabled: bool,
    pub sync_interval_minutes: i32,
    pub sync_on_network_change: bool,
    pub conflict_strategy: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl SyncPolicy {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            user_id: row.try_get("user_id")?,
            auto_sync_enabled: row.try_get("auto_sync_enabled")?,
            sync_interval_minutes: row.try_get("sync_interval_minutes")?,
            sync_on_network_change: row.try_get("sync_on_network_change")?,
            conflict_strategy: row.try_get("conflict_strategy")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSyncPolicy {
    pub auto_sync_enabled: Option<bool>,
    pub sync_interval_minutes: Option<i32>,
    pub sync_on_network_change: Option<bool>,
    pub conflict_strategy: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhotoUpload {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub file_name: String,
    pub file_path: String,
    pub file_size: i64,
    pub mime_type: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub compression_ratio: Option<f64>,
    pub has_watermark: bool,
    pub watermark_text: Option<String>,
    pub upload_status: String,
    pub upload_progress: i32,
    pub thumbnail_url: Option<String>,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub uploaded_at: Option<DateTime<Utc>>,
}

impl PhotoUpload {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            user_id: row.try_get("user_id")?,
            file_name: row.try_get("file_name")?,
            file_path: row.try_get("file_path")?,
            file_size: row.try_get("file_size")?,
            mime_type: row.try_get("mime_type")?,
            width: row.try_get("width")?,
            height: row.try_get("height")?,
            compression_ratio: row.try_get("compression_ratio")?,
            has_watermark: row.try_get("has_watermark")?,
            watermark_text: row.try_get("watermark_text")?,
            upload_status: row.try_get("upload_status")?,
            upload_progress: row.try_get("upload_progress")?,
            thumbnail_url: row.try_get("thumbnail_url")?,
            location_lat: row.try_get("location_lat")?,
            location_lng: row.try_get("location_lng")?,
            created_at: row.try_get("created_at")?,
            uploaded_at: row.try_get("uploaded_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePhotoUpload {
    pub file_name: String,
    pub file_size: i64,
    pub mime_type: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub compression_ratio: Option<f64>,
    pub has_watermark: bool,
    pub watermark_text: Option<String>,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushNotification {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub title: String,
    pub body: String,
    pub notification_type: String,
    pub data: Option<serde_json::Value>,
    pub target_type: String,
    pub target_ids: Vec<String>,
    pub status: String,
    pub sent_count: i32,
    pub delivered_count: i32,
    pub clicked_count: i32,
    pub created_at: DateTime<Utc>,
    pub sent_at: Option<DateTime<Utc>>,
}

impl PushNotification {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            title: row.try_get("title")?,
            body: row.try_get("body")?,
            notification_type: row.try_get("notification_type")?,
            data: row.try_get("data")?,
            target_type: row.try_get("target_type")?,
            target_ids: row.try_get("target_ids")?,
            status: row.try_get("status")?,
            sent_count: row.try_get("sent_count")?,
            delivered_count: row.try_get("delivered_count")?,
            clicked_count: row.try_get("clicked_count")?,
            created_at: row.try_get("created_at")?,
            sent_at: row.try_get("sent_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePushNotification {
    pub title: String,
    pub body: String,
    pub notification_type: String,
    pub data: Option<serde_json::Value>,
    pub target_type: String,
    pub target_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushDevice {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub user_id: Uuid,
    pub device_token: String,
    pub platform: String,
    pub device_model: Option<String>,
    pub app_version: Option<String>,
    pub os_version: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl PushDevice {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            user_id: row.try_get("user_id")?,
            device_token: row.try_get("device_token")?,
            platform: row.try_get("platform")?,
            device_model: row.try_get("device_model")?,
            app_version: row.try_get("app_version")?,
            os_version: row.try_get("os_version")?,
            is_active: row.try_get("is_active")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePushDevice {
    pub device_token: String,
    pub platform: String,
    pub device_model: Option<String>,
    pub app_version: Option<String>,
    pub os_version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PushTemplate {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub title_template: String,
    pub body_template: String,
    pub notification_type: String,
    pub description: Option<String>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl PushTemplate {
    pub fn from_row(row: &sqlx::postgres::PgRow) -> sqlx::Result<Self> {
        Ok(Self {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            name: row.try_get("name")?,
            title_template: row.try_get("title_template")?,
            body_template: row.try_get("body_template")?,
            notification_type: row.try_get("notification_type")?,
            description: row.try_get("description")?,
            is_active: row.try_get("is_active")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreatePushTemplateRequest {
    pub name: String,
    pub title_template: String,
    pub body_template: String,
    pub notification_type: String,
    pub description: Option<String>,
}
