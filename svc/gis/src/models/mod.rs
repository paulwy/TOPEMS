#![allow(dead_code)]

pub mod audit_log;

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct FactoryMap {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub name: String,
    pub code: String,
    pub map_type: String,
    pub file_url: String, // Note: In DB it's NOT NULL
    pub bounds: Option<serde_json::Value>,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DeviceLocation {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub map_id: Uuid,
    pub device_name: String,
    pub device_code: String,
    pub device_type: Option<String>,
    pub position: serde_json::Value,
    pub status: String,
    pub description: Option<String>,
    pub last_inspected: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Pipeline {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub map_id: Uuid,
    pub name: String,
    pub code: String,
    pub pipeline_type: Option<String>,
    pub path: serde_json::Value,
    pub properties: Option<serde_json::Value>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct WarehouseLocation {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub map_id: Uuid,
    pub warehouse_name: String,
    pub zone: Option<String>,
    pub position: serde_json::Value,
    pub capacity: Option<i32>,
    pub usage_rate: Option<f64>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LocationPhoto {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub map_id: Uuid,
    pub position: serde_json::Value,
    pub photo_url: String,
    pub description: Option<String>,
    pub taken_by: String,
    pub taken_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StorageLocation {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub location_type: String,
    pub position: serde_json::Value,
    pub capacity: Option<i32>,
    pub current_usage: Option<i32>,
    pub description: Option<String>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 业务位置 - 支持更广泛的业务范围
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct BusinessLocation {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub business_type: String,
    pub business_name: String,
    pub business_code: Option<String>,
    pub category: Option<String>,
    pub position: serde_json::Value,
    pub address: Option<String>,
    pub contact_person: Option<String>,
    pub contact_phone: Option<String>,
    pub capacity: Option<i32>,
    pub current_usage: Option<i32>,
    pub status: String,
    pub properties: Option<serde_json::Value>,
    pub description: Option<String>,
    pub external_id: Option<Uuid>,
    pub external_type: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 地图标记 - 用于在地图上显示自定义标记
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MapMarker {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub marker_type: String,
    pub name: String,
    pub marker_style: Option<String>,
    pub position: serde_json::Value,
    pub icon_svg: Option<String>,
    pub color: Option<String>,
    pub size: Option<i32>,
    pub popup_content: Option<String>,
    pub click_action: Option<String>,
    pub action_data: Option<serde_json::Value>,
    pub visible: Option<bool>,
    pub z_index: Option<i32>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

// ==================== 新增 GIS 模型 ====================

/// 地图定义 - 管理地图的基本信息
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Map {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub name: String,
    pub code: String,
    pub description: Option<String>,
    pub map_type: String,
    pub projection: Option<String>,
    pub bounds: Option<serde_json::Value>,
    pub center: Option<serde_json::Value>,
    pub zoom_level: Option<i32>,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 地图图层 - 管理地图的图层配置
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct MapLayer {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub map_id: Uuid,
    pub name: String,
    pub layer_type: String,
    pub source_type: String,
    pub source_url: Option<String>,
    pub source_data: Option<serde_json::Value>,
    pub style_config: Option<serde_json::Value>,
    pub opacity: Option<f64>,
    pub visible: bool,
    pub z_index: i32,
    pub min_zoom: Option<i32>,
    pub max_zoom: Option<i32>,
    pub properties: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 地理数据 - 存储上传的地理数据文件
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GeoData {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub name: String,
    pub data_type: String,
    pub format: String,
    pub file_path: Option<String>,
    pub geojson_data: Option<serde_json::Value>,
    pub feature_count: Option<i32>,
    pub extent: Option<serde_json::Value>,
    pub properties_schema: Option<serde_json::Value>,
    pub metadata: Option<serde_json::Value>,
    pub status: String,
    pub uploaded_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 地理要素 - 存储单个地理要素
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct GeoFeature {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub geodata_id: Uuid,
    pub feature_type: String,
    pub geometry: serde_json::Value,
    pub properties: Option<serde_json::Value>,
    pub centroid: Option<serde_json::Value>,
    pub area: Option<f64>,
    pub length: Option<f64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 空间分析结果 - 存储空间分析的结果
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct SpatialAnalysis {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub analysis_type: String,
    pub input_data: serde_json::Value,
    pub parameters: Option<serde_json::Value>,
    pub result_data: Option<serde_json::Value>,
    pub result_geometry: Option<serde_json::Value>,
    pub statistics: Option<serde_json::Value>,
    pub execution_time_ms: Option<i32>,
    pub status: String,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

/// 位置点 - 管理位置信息
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Location {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub location_type: String,
    pub position: serde_json::Value,
    pub address: Option<String>,
    pub description: Option<String>,
    pub properties: Option<serde_json::Value>,
    pub status: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 设备 - 管理设备信息
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Device {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub device_code: String,
    pub device_name: String,
    pub device_type: String,
    pub description: Option<String>,
    pub properties: Option<serde_json::Value>,
    pub status: String,
    pub registered_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 设备位置记录 - 记录设备的历史位置
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DeviceLocationRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub device_id: Uuid,
    pub position: serde_json::Value,
    pub accuracy: Option<f64>,
    pub speed: Option<f64>,
    pub direction: Option<f64>,
    pub altitude: Option<f64>,
    pub battery_level: Option<i32>,
    pub signal_strength: Option<i32>,
    pub recorded_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

/// 审计日志 - 记录系统操作日志
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLog {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub organization_id: Uuid,
    pub action: String,
    pub resource_type: String,
    pub resource_id: Option<Uuid>,
    pub old_value: Option<serde_json::Value>,
    pub new_value: Option<serde_json::Value>,
    pub user_id: Option<Uuid>,
    pub ip_address: Option<String>,
    pub created_at: DateTime<Utc>,
}

// ==================== 多租户模型 (按设计规范新增) ====================

/// 取证记录 - 支持照片/录音/录像取证
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct EvidenceRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub title: String,
    pub evidence_type: String, // 'photo', 'audio', 'video'
    pub position: serde_json::Value,
    pub file_url: Option<String>,
    pub thumbnail_url: Option<String>,
    pub duration: Option<i32>,     // 音视频时长，秒
    pub file_size: Option<i64>,    // 字节
    pub file_hash: Option<String>, // SHA256校验
    pub recorded_by: Uuid,
    pub recorded_at: DateTime<Utc>,
    pub tags: Option<Vec<String>>,
    pub description: Option<String>,
    pub metadata: Option<serde_json::Value>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// 轨迹记录 - 存储设备/人员轨迹
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TrackRecord {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub device_id: Uuid,
    pub device_name: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub total_distance: f64, // 米
    pub created_at: DateTime<Utc>,
}

/// 轨迹位置点 - 存储轨迹的每个点
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct TrackPosition {
    pub id: Uuid,
    pub track_id: Uuid,
    pub position: serde_json::Value, // [lng, lat] 或 {"lat": f64, "lng": f64}
    pub altitude: Option<f64>,
    pub speed: Option<f64>,         // m/s
    pub heading: Option<f64>,       // 度
    pub accuracy: Option<f64>,      // 米
    pub battery_level: Option<i32>, // 百分比
    pub timestamp: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

/// 轨迹统计
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TrackStatistics {
    pub total_distance: f64, // 米
    pub avg_speed: f64,      // km/h
    pub max_speed: f64,      // km/h
    pub min_speed: f64,      // km/h
    pub total_duration: i64, // 秒
    pub point_count: i32,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
}

/// 设备点位 (多租户版本)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
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
