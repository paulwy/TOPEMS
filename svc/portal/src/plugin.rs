use axum::{routing::get, Json, Router};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;

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
            PermissionDef {
                code: "announcement".to_string(),
            },
            PermissionDef {
                code: "shortcut".to_string(),
            },
            PermissionDef {
                code: "widget".to_string(),
            },
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

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");

    let info = PluginInfo {
        code: "portal".to_string(),
        name: "企业门户".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "Portal 企业门户系统".to_string(),
        deployment: DeploymentInfo {
            port: 8066,
            base_path: "/api/portal".to_string(),
        },
        permissions: vec![],
    };

    let client = Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/portal/register", core_url);

    match client.post(&url).json(&info).send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[Portal Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[Portal Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[Portal Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}
