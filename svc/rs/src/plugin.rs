use axum::{routing::get, Json, Router};
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginHealth {
    pub status: String,
    pub service: String,
}

pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let plugin_info = PluginInfo {
        code: "rs".to_string(),
        name: "研发管理".to_string(),
        version: "1.0.0".to_string(),
        description: "RS 研发管理系统 - 项目管理、实验记录、配方管理".to_string(),
        category: "R&D".to_string(),
        plugin_type: "business".to_string(),
        deployment: DeploymentInfo {
            port: 8058,
            base_path: "/api/rs".to_string(),
        },
        permissions: vec![
            PermissionDef { code: "project".to_string() },
            PermissionDef { code: "experiment".to_string() },
            PermissionDef { code: "formula".to_string() },
            PermissionDef { code: "material".to_string() },
            PermissionDef { code: "patent".to_string() },
        ],
    };

    Json(ApiResponse::success(plugin_info, "获取插件信息成功"))
}

pub async fn plugin_health_check() -> Json<ServiceHealth> {
    Json(topems_shared::build_health_response("topems-rs", true))
}

pub fn create_routes() -> Router {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}