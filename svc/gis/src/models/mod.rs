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
    pub map_id: Option<Uuid>,
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

#[cfg(test)]
mod tests {
    use super::*;

    fn test_uuid() -> Uuid {
        Uuid::parse_str("550e8400-e29b-41d4-a716-446655440000").unwrap()
    }

    fn test_dt() -> DateTime<Utc> {
        DateTime::parse_from_rfc3339("2024-01-01T10:00:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn assert_serde_roundtrip<T>(original: &T)
    where
        T: serde::Serialize + serde::de::DeserializeOwned,
    {
        let json1 = serde_json::to_string(original).expect("Serialization failed");
        let deserialized: T = serde_json::from_str(&json1).expect("Deserialization failed");
        let json2 = serde_json::to_string(&deserialized).expect("Re-serialization failed");
        assert_eq!(
            json1, json2,
            "Serde roundtrip mismatch:\n  original: {}\n  roundtrip: {}",
            json1, json2
        );
    }

    // ==================== FactoryMap ====================

    #[test]
    fn test_factory_map_serde_roundtrip_full() {
        let m = FactoryMap {
            id: test_uuid(),
            tenant_id: test_uuid(),
            name: "厂区地图A".to_string(),
            code: "MAP-A001".to_string(),
            map_type: "indoor".to_string(),
            file_url: "https://example.com/map.png".to_string(),
            bounds: Some(serde_json::json!({"min_lat": 31.0, "max_lat": 32.0})),
            description: Some("测试地图".to_string()),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&m);
    }

    #[test]
    fn test_factory_map_serde_roundtrip_minimal() {
        let m = FactoryMap {
            id: test_uuid(),
            tenant_id: test_uuid(),
            name: "地图B".to_string(),
            code: "MAP-B002".to_string(),
            map_type: "outdoor".to_string(),
            file_url: String::new(),
            bounds: None,
            description: None,
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&m);
    }

    // ==================== DeviceLocation ====================

    #[test]
    fn test_device_location_serde_roundtrip() {
        let d = DeviceLocation {
            id: test_uuid(),
            tenant_id: test_uuid(),
            map_id: test_uuid(),
            device_name: "传感器01".to_string(),
            device_code: "DEV-001".to_string(),
            device_type: Some("temperature".to_string()),
            position: serde_json::json!({"lat": 31.23, "lng": 121.47}),
            status: "active".to_string(),
            description: Some("温度传感器".to_string()),
            last_inspected: Some(test_dt()),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&d);
    }

    // ==================== Pipeline ====================

    #[test]
    fn test_pipeline_serde_roundtrip() {
        let p = Pipeline {
            id: test_uuid(),
            tenant_id: test_uuid(),
            map_id: test_uuid(),
            name: "主管道".to_string(),
            code: "PIPE-001".to_string(),
            pipeline_type: Some("water".to_string()),
            path: serde_json::json!([[121.47, 31.23], [121.48, 31.24]]),
            properties: Some(serde_json::json!({"diameter": 100})),
            status: "active".to_string(),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&p);
    }

    // ==================== WarehouseLocation ====================

    #[test]
    fn test_warehouse_location_serde_roundtrip() {
        let w = WarehouseLocation {
            id: test_uuid(),
            tenant_id: test_uuid(),
            map_id: test_uuid(),
            warehouse_name: "原料仓".to_string(),
            zone: Some("A区".to_string()),
            position: serde_json::json!({"lat": 31.23, "lng": 121.47}),
            capacity: Some(5000),
            usage_rate: Some(0.75),
            status: "active".to_string(),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&w);
    }

    // ==================== LocationPhoto ====================

    #[test]
    fn test_location_photo_serde_roundtrip() {
        let p = LocationPhoto {
            id: test_uuid(),
            tenant_id: test_uuid(),
            map_id: test_uuid(),
            position: serde_json::json!([121.47, 31.23]),
            photo_url: "https://example.com/photo.jpg".to_string(),
            description: Some("现场照片".to_string()),
            taken_by: "张三".to_string(),
            taken_at: test_dt(),
            created_at: test_dt(),
        };
        assert_serde_roundtrip(&p);
    }

    // ==================== StorageLocation ====================

    #[test]
    fn test_storage_location_serde_roundtrip() {
        let s = StorageLocation {
            id: test_uuid(),
            name: "货架A".to_string(),
            code: "STO-A01".to_string(),
            location_type: "shelf".to_string(),
            position: serde_json::json!({"lat": 31.23, "lng": 121.47}),
            capacity: Some(1000),
            current_usage: Some(500),
            description: Some("原料货架".to_string()),
            status: "active".to_string(),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&s);
    }

    #[test]
    fn test_storage_location_serde_roundtrip_minimal() {
        let s = StorageLocation {
            id: test_uuid(),
            name: "货架B".to_string(),
            code: "STO-B01".to_string(),
            location_type: "shelf".to_string(),
            position: serde_json::json!({"lat": 0.0, "lng": 0.0}),
            capacity: None,
            current_usage: None,
            description: None,
            status: "inactive".to_string(),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&s);
    }

    // ==================== BusinessLocation ====================

    #[test]
    fn test_business_location_serde_roundtrip() {
        let b = BusinessLocation {
            id: test_uuid(),
            tenant_id: test_uuid(),
            business_type: "warehouse".to_string(),
            business_name: "中心仓库".to_string(),
            business_code: Some("WH-001".to_string()),
            category: Some("logistics".to_string()),
            position: serde_json::json!({"lat": 31.23, "lng": 121.47}),
            address: Some("上海市浦东新区".to_string()),
            contact_person: Some("李四".to_string()),
            contact_phone: Some("13800138000".to_string()),
            capacity: Some(10000),
            current_usage: Some(6000),
            status: "active".to_string(),
            properties: Some(serde_json::json!({"area": 5000.5})),
            description: Some("主要物流中心".to_string()),
            external_id: Some(test_uuid()),
            external_type: Some("erp".to_string()),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&b);
    }

    // ==================== MapMarker ====================

    #[test]
    fn test_map_marker_serde_roundtrip() {
        let m = MapMarker {
            id: test_uuid(),
            tenant_id: test_uuid(),
            marker_type: "device".to_string(),
            name: "传感器标记".to_string(),
            marker_style: Some("pin".to_string()),
            position: serde_json::json!({"lat": 31.23, "lng": 121.47}),
            icon_svg: Some("<svg></svg>".to_string()),
            color: Some("#FF0000".to_string()),
            size: Some(24),
            popup_content: Some("设备信息".to_string()),
            click_action: Some("navigate".to_string()),
            action_data: Some(serde_json::json!({"url": "/device/1"})),
            visible: Some(true),
            z_index: Some(10),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&m);
    }

    // ==================== Map ====================

    #[test]
    fn test_map_serde_roundtrip() {
        let m = Map {
            id: test_uuid(),
            tenant_id: test_uuid(),
            name: "厂区总图".to_string(),
            code: "MAP-MAIN".to_string(),
            description: Some("厂区整体布局图".to_string()),
            map_type: "outdoor".to_string(),
            projection: Some("EPSG:4326".to_string()),
            bounds: Some(serde_json::json!([121.0, 31.0, 122.0, 32.0])),
            center: Some(serde_json::json!({"lat": 31.5, "lng": 121.5})),
            zoom_level: Some(15),
            status: "published".to_string(),
            created_by: Some(test_uuid()),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&m);
    }

    // ==================== MapLayer ====================

    #[test]
    fn test_map_layer_serde_roundtrip() {
        let l = MapLayer {
            id: test_uuid(),
            tenant_id: test_uuid(),
            map_id: test_uuid(),
            name: "设备图层".to_string(),
            layer_type: "point".to_string(),
            source_type: "geojson".to_string(),
            source_url: Some("https://example.com/layer.json".to_string()),
            source_data: Some(serde_json::json!({"features": []})),
            style_config: Some(serde_json::json!({"color": "blue"})),
            opacity: Some(0.8),
            visible: true,
            z_index: 5,
            min_zoom: Some(1),
            max_zoom: Some(20),
            properties: Some(serde_json::json!({"description": "设备点位"})),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&l);
    }

    // ==================== GeoData ====================

    #[test]
    fn test_geo_data_serde_roundtrip() {
        let g = GeoData {
            id: test_uuid(),
            tenant_id: test_uuid(),
            name: "区域边界数据".to_string(),
            data_type: "boundary".to_string(),
            format: "geojson".to_string(),
            file_path: Some("/data/boundary.json".to_string()),
            geojson_data: Some(serde_json::json!({"type": "FeatureCollection", "features": []})),
            feature_count: Some(150),
            extent: Some(serde_json::json!([121.0, 31.0, 122.0, 32.0])),
            properties_schema: Some(serde_json::json!({"name": "string"})),
            metadata: Some(serde_json::json!({"source": "survey"})),
            status: "processed".to_string(),
            uploaded_by: Some(test_uuid()),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&g);
    }

    // ==================== GeoFeature ====================

    #[test]
    fn test_geo_feature_serde_roundtrip() {
        let f = GeoFeature {
            id: test_uuid(),
            tenant_id: test_uuid(),
            geodata_id: test_uuid(),
            feature_type: "Point".to_string(),
            geometry: serde_json::json!({"type": "Point", "coordinates": [121.47, 31.23]}),
            properties: Some(serde_json::json!({"name": "测试点"})),
            centroid: Some(serde_json::json!([121.47, 31.23])),
            area: Some(0.0),
            length: Some(0.0),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&f);
    }

    // ==================== SpatialAnalysis ====================

    #[test]
    fn test_spatial_analysis_serde_roundtrip() {
        let s = SpatialAnalysis {
            id: test_uuid(),
            tenant_id: test_uuid(),
            analysis_type: "buffer".to_string(),
            input_data: serde_json::json!({"geometry": {"type": "Point", "coordinates": [121.47, 31.23]}}),
            parameters: Some(serde_json::json!({"radius": 500})),
            result_data: Some(serde_json::json!({"buffer": {}})),
            result_geometry: Some(serde_json::json!({"type": "Polygon", "coordinates": []})),
            statistics: Some(serde_json::json!({"area": 785398.16})),
            execution_time_ms: Some(120),
            status: "completed".to_string(),
            created_by: Some(test_uuid()),
            created_at: test_dt(),
        };
        assert_serde_roundtrip(&s);
    }

    // ==================== Location ====================

    #[test]
    fn test_location_serde_roundtrip() {
        let l = Location {
            id: test_uuid(),
            tenant_id: test_uuid(),
            name: "办公楼".to_string(),
            code: Some("LOC-OFFICE".to_string()),
            location_type: "building".to_string(),
            position: serde_json::json!({"lat": 31.23, "lng": 121.47}),
            address: Some("上海市浦东新区张江路100号".to_string()),
            description: Some("行政办公楼".to_string()),
            properties: Some(serde_json::json!({"floors": 5})),
            status: "active".to_string(),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&l);
    }

    // ==================== Device ====================

    #[test]
    fn test_device_serde_roundtrip() {
        let d = Device {
            id: test_uuid(),
            tenant_id: test_uuid(),
            device_code: "DEV-001".to_string(),
            device_name: "温度传感器".to_string(),
            device_type: "sensor".to_string(),
            description: Some("室内温度传感器".to_string()),
            properties: Some(serde_json::json!({"model": "TS-100", "accuracy": 0.1})),
            status: "online".to_string(),
            registered_by: Some(test_uuid()),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&d);
    }

    // ==================== DeviceLocationRecord ====================

    #[test]
    fn test_device_location_record_serde_roundtrip() {
        let r = DeviceLocationRecord {
            id: test_uuid(),
            tenant_id: test_uuid(),
            device_id: test_uuid(),
            position: serde_json::json!([121.47, 31.23]),
            accuracy: Some(5.0),
            speed: Some(1.5),
            direction: Some(90.0),
            altitude: Some(10.0),
            battery_level: Some(85),
            signal_strength: Some(-65),
            recorded_at: test_dt(),
            created_at: test_dt(),
        };
        assert_serde_roundtrip(&r);
    }

    // ==================== AuditLog ====================

    #[test]
    fn test_audit_log_serde_roundtrip() {
        let a = AuditLog {
            id: test_uuid(),
            tenant_id: test_uuid(),
            action: "create".to_string(),
            resource_type: "device".to_string(),
            resource_id: Some(test_uuid()),
            old_value: None,
            new_value: Some(serde_json::json!({"name": "新设备"})),
            user_id: Some(test_uuid()),
            ip_address: Some("192.168.1.1".to_string()),
            created_at: test_dt(),
        };
        assert_serde_roundtrip(&a);
    }

    // ==================== EvidenceRecord ====================

    #[test]
    fn test_evidence_record_serde_roundtrip() {
        let e = EvidenceRecord {
            id: test_uuid(),
            tenant_id: test_uuid(),
            title: "现场照片取证".to_string(),
            evidence_type: "photo".to_string(),
            position: serde_json::json!({"lat": 31.23, "lng": 121.47}),
            file_url: Some("https://example.com/evidence.jpg".to_string()),
            thumbnail_url: Some("https://example.com/thumb.jpg".to_string()),
            duration: None,
            file_size: Some(1024000),
            file_hash: Some("abc123def456".to_string()),
            recorded_by: test_uuid(),
            recorded_at: test_dt(),
            tags: Some(vec!["安全".to_string(), "检查".to_string()]),
            description: Some("安全检查照片".to_string()),
            metadata: Some(serde_json::json!({"resolution": "1920x1080"})),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&e);
    }

    #[test]
    fn test_evidence_record_serde_roundtrip_video() {
        let e = EvidenceRecord {
            id: test_uuid(),
            tenant_id: test_uuid(),
            title: "巡检视频".to_string(),
            evidence_type: "video".to_string(),
            position: serde_json::json!([121.47, 31.23]),
            file_url: Some("https://example.com/video.mp4".to_string()),
            thumbnail_url: None,
            duration: Some(120),
            file_size: Some(50000000),
            file_hash: None,
            recorded_by: test_uuid(),
            recorded_at: test_dt(),
            tags: None,
            description: None,
            metadata: None,
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&e);
    }

    // ==================== TrackRecord ====================

    #[test]
    fn test_track_record_serde_roundtrip() {
        let t = TrackRecord {
            id: test_uuid(),
            tenant_id: test_uuid(),
            device_id: test_uuid(),
            device_name: "巡检机器人01".to_string(),
            start_time: test_dt(),
            end_time: test_dt(),
            total_distance: 5000.0,
            created_at: test_dt(),
        };
        assert_serde_roundtrip(&t);
    }

    // ==================== TrackPosition ====================

    #[test]
    fn test_track_position_serde_roundtrip() {
        let t = TrackPosition {
            id: test_uuid(),
            track_id: test_uuid(),
            position: serde_json::json!([121.47, 31.23]),
            altitude: Some(10.5),
            speed: Some(2.5),
            heading: Some(45.0),
            accuracy: Some(3.0),
            battery_level: Some(90),
            timestamp: test_dt(),
            created_at: test_dt(),
        };
        assert_serde_roundtrip(&t);
    }

    // ==================== TrackStatistics ====================

    #[test]
    fn test_track_statistics_serde_roundtrip() {
        let t = TrackStatistics {
            total_distance: 5000.0,
            avg_speed: 15.5,
            max_speed: 25.0,
            min_speed: 5.0,
            total_duration: 1200,
            point_count: 100,
            start_time: test_dt(),
            end_time: test_dt(),
        };
        assert_serde_roundtrip(&t);
    }

    // ==================== DevicePoint ====================

    #[test]
    fn test_device_point_serde_roundtrip() {
        let d = DevicePoint {
            id: test_uuid(),
            tenant_id: test_uuid(),
            name: "监控摄像头".to_string(),
            device_type: Some("camera".to_string()),
            latitude: 31.2304,
            longitude: 121.4737,
            status: "online".to_string(),
            description: Some("厂区入口摄像头".to_string()),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&d);
    }

    #[test]
    fn test_device_point_serde_roundtrip_minimal() {
        let d = DevicePoint {
            id: test_uuid(),
            tenant_id: test_uuid(),
            name: "未知设备".to_string(),
            device_type: None,
            latitude: 0.0,
            longitude: 0.0,
            status: "unknown".to_string(),
            description: None,
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&d);
    }

    // ==================== 额外边界测试 ====================

    #[test]
    fn test_pipeline_serde_roundtrip_minimal() {
        let p = Pipeline {
            id: test_uuid(),
            tenant_id: test_uuid(),
            map_id: test_uuid(),
            name: "管道".to_string(),
            code: "P-001".to_string(),
            pipeline_type: None,
            path: serde_json::json!([]),
            properties: None,
            status: "inactive".to_string(),
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&p);
    }

    #[test]
    fn test_geo_feature_serde_roundtrip_polygon() {
        let f = GeoFeature {
            id: test_uuid(),
            tenant_id: test_uuid(),
            geodata_id: test_uuid(),
            feature_type: "Polygon".to_string(),
            geometry: serde_json::json!({
                "type": "Polygon",
                "coordinates": [[[121.0, 31.0], [122.0, 31.0], [122.0, 32.0], [121.0, 31.0]]]
            }),
            properties: None,
            centroid: Some(serde_json::json!([121.5, 31.5])),
            area: Some(10000.0),
            length: None,
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&f);
    }

    #[test]
    fn test_audit_log_serde_roundtrip_minimal() {
        let a = AuditLog {
            id: test_uuid(),
            tenant_id: test_uuid(),
            action: "view".to_string(),
            resource_type: "map".to_string(),
            resource_id: None,
            old_value: None,
            new_value: None,
            user_id: None,
            ip_address: None,
            created_at: test_dt(),
        };
        assert_serde_roundtrip(&a);
    }

    #[test]
    fn test_track_position_serde_roundtrip_object() {
        // 使用对象格式而非数组格式的 position
        let t = TrackPosition {
            id: test_uuid(),
            track_id: test_uuid(),
            position: serde_json::json!({"lat": 31.23, "lng": 121.47}),
            altitude: None,
            speed: None,
            heading: None,
            accuracy: None,
            battery_level: None,
            timestamp: test_dt(),
            created_at: test_dt(),
        };
        assert_serde_roundtrip(&t);
    }

    #[test]
    fn test_map_marker_serde_roundtrip_minimal() {
        let m = MapMarker {
            id: test_uuid(),
            tenant_id: test_uuid(),
            marker_type: "point".to_string(),
            name: "标记".to_string(),
            marker_style: None,
            position: serde_json::json!({"lat": 0.0, "lng": 0.0}),
            icon_svg: None,
            color: None,
            size: None,
            popup_content: None,
            click_action: None,
            action_data: None,
            visible: None,
            z_index: None,
            created_at: test_dt(),
            updated_at: test_dt(),
        };
        assert_serde_roundtrip(&m);
    }

    #[test]
    fn test_track_statistics_serde_roundtrip_zero() {
        let t = TrackStatistics {
            total_distance: 0.0,
            avg_speed: 0.0,
            max_speed: 0.0,
            min_speed: 0.0,
            total_duration: 0,
            point_count: 0,
            start_time: test_dt(),
            end_time: test_dt(),
        };
        assert_serde_roundtrip(&t);
    }
}
