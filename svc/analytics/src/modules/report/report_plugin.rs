// Report Service Plugin Interface

use crate::shared::AppState;
use axum::{extract::State, routing::get, Router};
use serde::{Deserialize, Serialize};

use topems_shared_core::{response::ApiResponse, TopemsError};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub permissions: Vec<Permission>,
    pub runtime_url: String,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub navigation_config: Option<serde_json::Value>,
    #[serde(default)]
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Permission {
    pub code: String,
    pub name: String,
    pub resource_type: String,
    pub action: String,
}

fn get_runtime_url() -> String {
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8060".to_string())
}

pub async fn get_plugin_info() -> ApiResponse<PluginInfo> {
    let runtime_url = get_runtime_url();
    let plugin_info = PluginInfo {
        code: "report".to_string(),
        name: "报表服务".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "Report 报表服务 - 报表管理、模板管理、调度管理".to_string(),
        permissions: vec![
            Permission {
                code: "report:report:read".to_string(),
                name: "查看报表".to_string(),
                resource_type: "report".to_string(),
                action: "read".to_string(),
            },
            Permission {
                code: "report:report:write".to_string(),
                name: "管理报表".to_string(),
                resource_type: "report".to_string(),
                action: "write".to_string(),
            },
            Permission {
                code: "report:report:execute".to_string(),
                name: "执行报表".to_string(),
                resource_type: "report".to_string(),
                action: "execute".to_string(),
            },
            Permission {
                code: "report:template:read".to_string(),
                name: "查看模板".to_string(),
                resource_type: "template".to_string(),
                action: "read".to_string(),
            },
            Permission {
                code: "report:template:write".to_string(),
                name: "管理模板".to_string(),
                resource_type: "template".to_string(),
                action: "write".to_string(),
            },
            Permission {
                code: "report:schedule:read".to_string(),
                name: "查看调度".to_string(),
                resource_type: "schedule".to_string(),
                action: "read".to_string(),
            },
            Permission {
                code: "report:schedule:write".to_string(),
                name: "管理调度".to_string(),
                resource_type: "schedule".to_string(),
                action: "write".to_string(),
            },
        ],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "report-overview", "label": "概览", "path": "/report", "icon": "LayoutDashboard", "order": 10, "group": "overview"}
        ])),
        category: Some("other".to_string()),
    };

    ApiResponse::success(plugin_info, "Report plugin info")
}

pub async fn plugin_health_check(State(state): State<AppState>) -> ApiResponse<()> {
    match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => ApiResponse::success((), "Healthy"),
        Err(e) => ApiResponse::from({
            tracing::warn!("Database error: {}", e);
            TopemsError::ServiceUnavailable("Database error".to_string())
        }),
    }
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}

pub async fn auto_register_to_core(_core_url: Option<&str>) {
    let core_url = std::env::var("PLUGIN_REGISTRY_URL")
        .unwrap_or_else(|_| "http://localhost:8096".to_string());
    let runtime_url = get_runtime_url();

    let info = PluginInfo {
        code: "report".to_string(),
        name: "报表服务".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "Report 报表服务".to_string(),
        permissions: vec![],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "report-overview", "label": "概览", "path": "/report", "icon": "LayoutDashboard", "order": 10, "group": "overview"}
        ])),
        category: Some("other".to_string()),
    };

    let client = topems_shared_core::shared_http_client();
    let url = format!("{}/dev/runtime/report/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[Report Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[Report Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[Report Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}
