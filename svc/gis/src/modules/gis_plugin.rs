use serde::{Deserialize, Serialize};

use topems_shared_core::health::ServiceHealth;
use topems_shared_core::plugin::PermissionDef;
use topems_shared_core::response::ApiResponse;

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(_core_url: Option<&str>) {
    let core_url = std::env::var("PLUGIN_REGISTRY_URL")
        .unwrap_or_else(|_| "http://localhost:8096".to_string());

    let info = get_plugin_info();

    let client = topems_shared_core::shared_http_client();
    let url = format!("{}/dev/runtime/gis/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[GIS Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[GIS Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[GIS Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}

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
    pub permissions: Vec<PermissionDef>,
    pub runtime_url: String,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub navigation_config: Option<serde_json::Value>,
}

/// 获取运行时 URL
fn get_runtime_url() -> String {
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8071".to_string())
}

pub fn get_plugin_info() -> PluginInfo {
    let runtime_url = get_runtime_url();
    PluginInfo {
        code: "gis".to_string(),
        name: "地理信息服务".to_string(),
        version: "1.0.0".to_string(),
        description: "GIS 地理信息服务 - 位置服务、轨迹追踪、地理围栏".to_string(),
        category: "gis".to_string(),
        plugin_type: "business".to_string(),
        port: 8071,
        base_path: "/api/gis".to_string(),
        permissions: vec![
            PermissionDef {
                code: "location".to_string(),
                name: "位置服务".to_string(),
                resource_type: "gis".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "geofence".to_string(),
                name: "地理围栏".to_string(),
                resource_type: "gis".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "device".to_string(),
                name: "设备管理".to_string(),
                resource_type: "gis".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "track".to_string(),
                name: "轨迹追踪".to_string(),
                resource_type: "gis".to_string(),
                action: "read".to_string(),
            },
        ],
        runtime_url,
        dependencies: vec!["mes".to_string()],
        navigation_config: Some(serde_json::json!([
            {"code": "gis-maps", "label": "地图服务", "path": "/gis/maps", "icon": "Map", "order": 10, "group": "business"},
            {"code": "gis-locations", "label": "位置服务", "path": "/gis/locations", "icon": "MapPin", "order": 20, "group": "business"},
            {"code": "gis-geofences", "label": "地理围栏", "path": "/gis/geofences", "icon": "Hexagon", "order": 30, "group": "business"}
        ])),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["gis:health:read"])),
    path = "/health",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "health"
)]
pub async fn plugin_health_check() -> ApiResponse<ServiceHealth> {
    let health = ServiceHealth::healthy_with_message("topems-gis", "GIS 地理信息服务运行正常");
    ApiResponse::success(health, "插件健康检查")
}

pub async fn get_info() -> ApiResponse<PluginInfo> {
    let info = get_plugin_info();
    ApiResponse::success(info, "获取插件信息成功")
}
