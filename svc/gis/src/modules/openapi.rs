// GIS 服务 OpenAPI 文档
#![allow(dead_code)]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};
use uuid::Uuid;

// ==================== 基础类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GisLayer {
    pub id: Uuid,
    pub name: String,
    pub layer_type: String,
    pub source: Option<String>,
    pub bounds: Option<serde_json::Value>,
    pub properties: Option<serde_json::Value>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct GisFeature {
    pub id: Uuid,
    pub layer_id: Uuid,
    pub geometry: serde_json::Value,
    pub properties: serde_json::Value,
    pub style: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct MapProject {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub center: Option<serde_json::Value>,
    pub zoom: Option<i32>,
    pub layers: Option<Vec<Uuid>>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SpatialAnalysis {
    pub id: Uuid,
    pub analysis_type: String,
    pub parameters: serde_json::Value,
    pub results: Option<serde_json::Value>,
    pub status: String,
    pub created_at: DateTime<Utc>,
}

// ==================== 设备管理类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct DevicePoint {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub name: String,
    pub device_type: Option<String>,
    pub latitude: f64,
    pub longitude: f64,
    pub status: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateDevicePointRequest {
    pub name: String,
    pub device_type: Option<String>,
    pub latitude: f64,
    pub longitude: f64,
    pub status: String,
    pub description: Option<String>,
}

// ==================== 轨迹管理类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TrackRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub device_id: Uuid,
    pub device_name: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub total_distance: f64,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TrackPosition {
    pub id: Uuid,
    pub track_id: Uuid,
    pub position: serde_json::Value,
    pub altitude: Option<f64>,
    pub speed: Option<f64>,
    pub heading: Option<f64>,
    pub accuracy: Option<f64>,
    pub battery_level: Option<i32>,
    pub timestamp: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct TrackStatistics {
    pub total_distance: f64,
    pub avg_speed: f64,
    pub max_speed: f64,
    pub min_speed: f64,
    pub total_duration: i64,
    pub point_count: i32,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateTrackRequest {
    pub device_id: Uuid,
    pub device_name: String,
}

// ==================== 取证管理类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EvidenceRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub title: String,
    pub evidence_type: String,
    pub position: serde_json::Value,
    pub file_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub duration: Option<i32>,
    pub file_size: Option<i64>,
    pub file_hash: Option<String>,
    pub recorded_by: Uuid,
    pub recorded_at: DateTime<Utc>,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct CreateEvidenceRequest {
    pub title: String,
    pub evidence_type: String,
    pub position: serde_json::Value,
    pub file_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub duration: Option<i32>,
    pub file_size: Option<i64>,
    pub file_hash: Option<String>,
    pub recorded_by: Uuid,
    pub recorded_at: DateTime<Utc>,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

// ==================== 离线同步类型 ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct PositionItem {
    pub position: serde_json::Value,
    pub altitude: Option<f64>,
    pub speed: Option<f64>,
    pub heading: Option<f64>,
    pub accuracy: Option<f64>,
    pub battery_level: Option<i32>,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BatchPositionUpload {
    pub device_id: Uuid,
    pub positions: Vec<PositionItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct EvidenceItem {
    pub local_id: String,
    pub title: String,
    pub evidence_type: String,
    pub position: serde_json::Value,
    pub file_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub duration: Option<i32>,
    pub file_size: Option<i64>,
    pub file_hash: Option<String>,
    pub recorded_by: Uuid,
    pub recorded_at: DateTime<Utc>,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct BatchEvidenceUpload {
    pub evidence_list: Vec<EvidenceItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SyncedEvidenceResult {
    pub local_id: String,
    pub server_id: Uuid,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SyncResponse {
    pub synced_evidence: Vec<SyncedEvidenceResult>,
    pub synced_positions: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SyncStatus {
    pub last_sync_time: DateTime<Utc>,
    pub pending_positions: i64,
    pub pending_evidence: i64,
    pub sync_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct OfflineDataDownload {
    pub device_points: Vec<DevicePoint>,
    pub tracks: Vec<TrackRecord>,
    pub evidence: Vec<EvidenceRecord>,
    pub synced_at: DateTime<Utc>,
}

// ==================== API 响应 ====================

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub message: String,
    pub data: Option<T>,
}

#[derive(OpenApi)]
#[openapi(
    components(
        schemas(
            GisLayer,
            GisFeature,
            MapProject,
            SpatialAnalysis,
            DevicePoint,
            CreateDevicePointRequest,
            TrackRecord,
            TrackPosition,
            TrackStatistics,
            CreateTrackRequest,
            EvidenceRecord,
            CreateEvidenceRequest,
            PositionItem,
            BatchPositionUpload,
            EvidenceItem,
            BatchEvidenceUpload,
            SyncedEvidenceResult,
            SyncResponse,
            SyncStatus,
            OfflineDataDownload,
            ApiResponse<String>,
        ),
    ),
    tags(
        (name = "layer", description = "图层管理 API"),
        (name = "feature", description = "要素管理 API"),
        (name = "project", description = "地图项目 API"),
        (name = "analysis", description = "空间分析 API"),
        (name = "device", description = "设备管理 API"),
        (name = "track", description = "轨迹管理 API"),
        (name = "evidence", description = "取证管理 API"),
        (name = "sync", description = "离线同步 API"),
    ),
    info(
        title = "TOPEMS GIS API",
        version = "1.0.0",
        description = "地理信息系统 API - 包含图层管理、要素管理、空间分析、设备管理、轨迹管理、取证管理和离线同步等功能"
    )
)]
pub struct GisApiDoc;
