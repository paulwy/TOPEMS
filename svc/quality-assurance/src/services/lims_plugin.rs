use crate::AppState;
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
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8051".to_string())
}

pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url = get_runtime_url();
    let plugin_info = PluginInfo {
        code: "lims".to_string(),
        name: "实验室信息系统".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "LIMS 实验室信息管理系统 - 样品管理、检验任务、仪器管理、试剂管理".to_string(),
        permissions: vec![
            Permission { code: "lims:sample:read".to_string(), name: "查看样品".to_string(), resource_type: "sample".to_string(), action: "read".to_string() },
            Permission { code: "lims:sample:write".to_string(), name: "管理样品".to_string(), resource_type: "sample".to_string(), action: "write".to_string() },
            Permission { code: "lims:task:read".to_string(), name: "查看检验任务".to_string(), resource_type: "task".to_string(), action: "read".to_string() },
            Permission { code: "lims:task:write".to_string(), name: "管理检验任务".to_string(), resource_type: "task".to_string(), action: "write".to_string() },
            Permission { code: "lims:record:read".to_string(), name: "查看检验记录".to_string(), resource_type: "record".to_string(), action: "read".to_string() },
            Permission { code: "lims:instrument:read".to_string(), name: "查看仪器".to_string(), resource_type: "instrument".to_string(), action: "read".to_string() },
            Permission { code: "lims:instrument:write".to_string(), name: "管理仪器".to_string(), resource_type: "instrument".to_string(), action: "write".to_string() },
            Permission { code: "lims:reagent:read".to_string(), name: "查看试剂".to_string(), resource_type: "reagent".to_string(), action: "read".to_string() },
            Permission { code: "lims:reagent:write".to_string(), name: "管理试剂".to_string(), resource_type: "reagent".to_string(), action: "write".to_string() },
        ],
        runtime_url,
    };

    Json(ApiResponse::success(plugin_info, "LIMS plugin info"))
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
        code: "lims".to_string(),
        name: "实验室信息系统".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "LIMS 实验室信息管理系统".to_string(),
        permissions: vec![],
        runtime_url,
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/lims/register", core_url);

    match client.post(&url).json(&info).send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!("[LIMS Plugin] Successfully registered to core at {}", core_url);
            } else {
                tracing::warn!("[LIMS Plugin] Failed to register to core: {}", response.status());
            }
        }
        Err(e) => {
            tracing::warn!("[LIMS Plugin] Failed to connect to core at {}: {}", core_url, e);
        }
    }
}
