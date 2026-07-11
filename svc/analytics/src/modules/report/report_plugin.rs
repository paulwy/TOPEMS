// Report Service Plugin Interface

use crate::shared::AppState;
use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};

use topems_shared::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub permissions: Vec<Permission>,
    pub runtime_url: String,
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

pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
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
    };

    Json(ApiResponse::success(plugin_info, "Report plugin info"))
}

pub async fn plugin_health_check(State(state): State<AppState>) -> Json<ApiResponse<()>> {
    match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => Json(ApiResponse::success((), "Healthy")),
        Err(e) => Json(ApiResponse::error(503, &format!("Database error: {}", e))),
    }
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}

pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url = get_runtime_url();

    let info = PluginInfo {
        code: "report".to_string(),
        name: "报表服务".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "Report 报表服务".to_string(),
        permissions: vec![],
        runtime_url,
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/report/register", core_url);

    match client.post(&url).json(&info).send().await {
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
