use axum::Json;
use serde::{Deserialize, Serialize};

use topems_shared::{ApiResponse, ServiceHealth};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub category: String,
    pub plugin_type: String,
    pub port: u16,
    pub base_path: String,
    pub permissions: Vec<String>,
}

pub fn get_plugin_info() -> PluginInfo {
    PluginInfo {
        code: "gis".to_string(),
        name: "地理信息服务".to_string(),
        version: "1.0.0".to_string(),
        description: "GIS 地理信息服务 - 位置服务、轨迹追踪、地理围栏".to_string(),
        category: "IoT".to_string(),
        plugin_type: "business".to_string(),
        port: 8054,
        base_path: "/api/gis".to_string(),
        permissions: vec![
            "location".to_string(),
            "geofence".to_string(),
            "device".to_string(),
            "track".to_string(),
        ],
    }
}

pub async fn plugin_health_check() -> Json<ApiResponse<ServiceHealth>> {
    let health = ServiceHealth::healthy_with_message(
        "topems-gis",
        "GIS 地理信息服务运行正常",
    );
    Json(ApiResponse::success(health, "插件健康检查"))
}

pub async fn get_info() -> Json<ApiResponse<PluginInfo>> {
    let info = get_plugin_info();
    Json(ApiResponse::success(info, "获取插件信息成功"))
}
