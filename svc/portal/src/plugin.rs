use axum::{routing::get, Json, Router};
use serde::{Deserialize, Serialize};

use topems_shared::{ApiResponse, ServiceHealth};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub deployment: DeploymentInfo,
    pub permissions: Vec<PermissionDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeploymentInfo {
    pub port: u16,
    pub base_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionDef {
    pub code: String,
}

pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let plugin_info = PluginInfo {
        code: "portal".to_string(),
        name: "企业门户".to_string(),
        version: "1.0.0".to_string(),
        description: "Portal 企业门户 - 首页、公告、快捷入口".to_string(),
        deployment: DeploymentInfo {
            port: 8066,
            base_path: "/api/portal".to_string(),
        },
        permissions: vec![
            PermissionDef { code: "announcement".to_string() },
            PermissionDef { code: "shortcut".to_string() },
            PermissionDef { code: "widget".to_string() },
        ],
    };

    Json(ApiResponse::success(plugin_info, "获取插件信息成功"))
}

pub async fn plugin_health_check() -> Json<ServiceHealth> {
    Json(topems_shared::build_health_response("topems-portal", true))
}

pub fn create_routes() -> Router {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}
