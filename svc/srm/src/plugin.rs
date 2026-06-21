use axum::{routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use std::env;

use topems_shared::{ApiResponse, ServiceHealth, build_health_response};

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
    pub service_name: String,
}

pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let plugin_info = PluginInfo {
        code: "srm".to_string(),
        name: "供应商管理".to_string(),
        version: "1.0.0".to_string(),
        description: "SRM 供应商关系管理系统 - 供应商档案、合同管理、评估".to_string(),
        category: "Business".to_string(),
        plugin_type: "business".to_string(),
        deployment: DeploymentInfo {
            port: 8042,
            base_path: "/api/srm".to_string(),
        },
        permissions: vec![
            PermissionDef { code: "supplier".to_string() },
            PermissionDef { code: "category".to_string() },
            PermissionDef { code: "contract".to_string() },
            PermissionDef { code: "evaluation".to_string() },
            PermissionDef { code: "product".to_string() },
        ],
    };

    Json(ApiResponse::success(plugin_info, "获取插件信息成功"))
}

pub async fn plugin_health_check() -> Json<ServiceHealth> {
    Json(build_health_response("topems-srm", true))
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
        code: "srm".to_string(),
        name: "供应商管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "SRM 供应商关系管理系统".to_string(),
        category: "Business".to_string(),
        plugin_type: "business".to_string(),
        deployment: DeploymentInfo {
            port: 8042,
            base_path: "/api/srm".to_string(),
        },
        permissions: vec![],
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/srm/register", core_url);

    match client.post(&url).json(&info).send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!("[SRM Plugin] Successfully registered to core at {}", core_url);
            } else {
                tracing::warn!("[SRM Plugin] Failed to register to core: {}", response.status());
            }
        }
        Err(e) => {
            tracing::warn!("[SRM Plugin] Failed to connect to core at {}: {}", core_url, e);
        }
    }
}
