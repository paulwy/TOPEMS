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
    pub deployment: DeploymentInfo,
    pub permissions: Vec<PermissionDef>,
    pub runtime_url: String,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub navigation_config: Option<serde_json::Value>,
    #[serde(default)]
    pub category: Option<String>,
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
        code: "integration".to_string(),
        name: "系统集成".to_string(),
        version: "1.0.0".to_string(),
        description: "Integration 系统集成中间件 - 第三方系统对接".to_string(),
        deployment: DeploymentInfo {
            port: 8072,
            base_path: "/api/integration".to_string(),
        },
        permissions: vec![
            PermissionDef {
                code: "connector".to_string(),
            },
            PermissionDef {
                code: "webhook".to_string(),
            },
            PermissionDef {
                code: "sync".to_string(),
            },
        ],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "integration-sync", "label": "数据集成", "path": "/integration/sync", "icon": "RefreshCw", "order": 10, "group": "business"},
            {"code": "integration-api", "label": "API管理", "path": "/integration/api", "icon": "Code", "order": 20, "group": "business"},
            {"code": "integration-webhooks", "label": "Webhook", "path": "/integration/webhooks", "icon": "Webhook", "order": 30, "group": "business"}
        ])),
        category: Some("other".to_string()),
    };

    Json(ApiResponse::success(plugin_info, "获取插件信息成功"))
}

pub async fn plugin_health_check() -> Json<ServiceHealth> {
    Json(topems_shared_core::health::build_health_response(
        "topems-integration",
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
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8072".to_string())
}

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url = get_runtime_url();

    let info = PluginInfo {
        code: "integration".to_string(),
        name: "系统集成".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "Integration 系统集成中间件".to_string(),
        deployment: DeploymentInfo {
            port: 8072,
            base_path: "/api/integration".to_string(),
        },
        permissions: vec![],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "integration-sync", "label": "数据集成", "path": "/integration/sync", "icon": "RefreshCw", "order": 10, "group": "business"},
            {"code": "integration-api", "label": "API管理", "path": "/integration/api", "icon": "Code", "order": 20, "group": "business"},
            {"code": "integration-webhooks", "label": "Webhook", "path": "/integration/webhooks", "icon": "Webhook", "order": 30, "group": "business"}
        ])),
        category: Some("other".to_string()),
    };

    let client = reqwest::Client::new();
    let url = format!(
        "{}/api/core/plugin/dev/plugins/integration/register",
        core_url
    );

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[Integration Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[Integration Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[Integration Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}
