use axum::{routing::get, Json, Router};
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
    pub runtime_url: String,
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
    let runtime_url = get_runtime_url();
    let plugin_info = PluginInfo {
        code: "monitor".to_string(),
        name: "监控告警".to_string(),
        version: "1.0.0".to_string(),
        description: "Monitor 监控系统 - 告警管理、指标采集".to_string(),
        deployment: DeploymentInfo {
            port: 8064,
            base_path: "/api/monitor".to_string(),
        },
        permissions: vec![
            PermissionDef {
                code: "alerts".to_string(),
            },
            PermissionDef {
                code: "metrics".to_string(),
            },
            PermissionDef {
                code: "health".to_string(),
            },
        ],
        runtime_url,
    };

    Json(ApiResponse::success(plugin_info, "获取插件信息成功"))
}

pub async fn plugin_health_check() -> Json<ServiceHealth> {
    Json(topems_shared::build_health_response("topems-monitor", true))
}

pub fn create_routes() -> Router {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}

/// 获取运行时 URL
fn get_runtime_url() -> String {
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8064".to_string())
}

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url = get_runtime_url();

    let info = PluginInfo {
        code: "monitor".to_string(),
        name: "监控告警".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "Monitor 监控系统 - 告警管理、指标采集".to_string(),
        deployment: DeploymentInfo {
            port: 8064,
            base_path: "/api/monitor".to_string(),
        },
        permissions: vec![
            PermissionDef {
                code: "alerts".to_string(),
            },
            PermissionDef {
                code: "metrics".to_string(),
            },
            PermissionDef {
                code: "health".to_string(),
            },
        ],
        runtime_url,
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/monitor/register", core_url);

    match client.post(&url).json(&info).send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[Monitor Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[Monitor Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[Monitor Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}
