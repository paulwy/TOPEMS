#![allow(dead_code)]

use axum::{routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use std::env;

use topems_shared_core::health::ServiceHealth;
use topems_shared_core::response::ApiResponse;

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
    pub runtime_url: String,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub navigation_config: Option<serde_json::Value>,
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["rd:read"])),
    path = "/api/plugins/info",
    responses((status = 200, description = "get_plugin_info OK")),
    tag = "rs_plugin"
)]

pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url = get_runtime_url();
    let plugin_info = PluginInfo {
        code: "rs".to_string(),
        name: "研发管理".to_string(),
        version: "1.0.0".to_string(),
        description: "RS 研发管理系统 - 项目管理、实验记录、配方管理".to_string(),
        category: "project".to_string(),
        plugin_type: "business".to_string(),
        deployment: DeploymentInfo {
            port: 8053,
            base_path: "/api/rs".to_string(),
        },
        permissions: vec![
            PermissionDef {
                code: "project".to_string(),
            },
            PermissionDef {
                code: "experiment".to_string(),
            },
            PermissionDef {
                code: "formula".to_string(),
            },
            PermissionDef {
                code: "material".to_string(),
            },
            PermissionDef {
                code: "patent".to_string(),
            },
        ],
        runtime_url,
        dependencies: vec!["pm".to_string(), "mes".to_string()],
        navigation_config: Some(serde_json::json!([
            {"code": "rs-projects", "label": "研发项目", "path": "/rs/projects", "icon": "FlaskRound", "order": 10, "group": "business"},
            {"code": "rs-experiments", "label": "实验管理", "path": "/rs/experiments", "icon": "FlaskConical", "order": 20, "group": "business"},
            {"code": "rs-results", "label": "成果管理", "path": "/rs/results", "icon": "Award", "order": 30, "group": "business"}
        ])),
    };

    Json(ApiResponse::success(plugin_info, "获取插件信息成功"))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["rd:read"])),
    path = "/api/plugins/health",
    responses((status = 200, description = "plugin_health_check OK")),
    tag = "rs_plugin"
)]

pub async fn plugin_health_check() -> Json<ServiceHealth> {
    Json(topems_shared_core::health::build_health_response(
        "topems-rd",
        true,
    ))
}

pub fn create_routes() -> Router {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}

/// 获取运行时 URL
fn get_runtime_url() -> String {
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8053".to_string())
}

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url = get_runtime_url();

    let info = PluginInfo {
        code: "rs".to_string(),
        name: "研发管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "RS 研发管理系统 - 项目管理、实验记录、配方管理".to_string(),
        category: "project".to_string(),
        plugin_type: "business".to_string(),
        deployment: DeploymentInfo {
            port: 8053,
            base_path: "/api/rs".to_string(),
        },
        permissions: vec![],
        runtime_url,
        dependencies: vec!["pm".to_string(), "mes".to_string()],
        navigation_config: Some(serde_json::json!([
            {"code": "rs-projects", "label": "研发项目", "path": "/rs/projects", "icon": "FlaskRound", "order": 10, "group": "business"},
            {"code": "rs-experiments", "label": "实验管理", "path": "/rs/experiments", "icon": "FlaskConical", "order": 20, "group": "business"},
            {"code": "rs-results", "label": "成果管理", "path": "/rs/results", "icon": "Award", "order": 30, "group": "business"}
        ])),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/rs/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[RS Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[RS Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[RS Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}
