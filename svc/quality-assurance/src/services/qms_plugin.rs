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
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8050".to_string())
}

pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url = get_runtime_url();
    let plugin_info = PluginInfo {
        code: "qms".to_string(),
        name: "质量管理系统".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "QMS 质量管理系统 - 质量检验、质量问题、质量标准".to_string(),
        permissions: vec![
            Permission { code: "qms:inspection:read".to_string(), name: "查看质量检验".to_string(), resource_type: "inspection".to_string(), action: "read".to_string() },
            Permission { code: "qms:inspection:write".to_string(), name: "管理质量检验".to_string(), resource_type: "inspection".to_string(), action: "write".to_string() },
            Permission { code: "qms:issue:read".to_string(), name: "查看质量问题".to_string(), resource_type: "issue".to_string(), action: "read".to_string() },
            Permission { code: "qms:issue:write".to_string(), name: "管理质量问题".to_string(), resource_type: "issue".to_string(), action: "write".to_string() },
            Permission { code: "qms:standard:read".to_string(), name: "查看质量标准".to_string(), resource_type: "standard".to_string(), action: "read".to_string() },
            Permission { code: "qms:standard:write".to_string(), name: "管理质量标准".to_string(), resource_type: "standard".to_string(), action: "write".to_string() },
        ],
        runtime_url,
    };

    Json(ApiResponse::success(plugin_info, "QMS plugin info"))
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
        code: "qms".to_string(),
        name: "质量管理系统".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "QMS 质量管理系统".to_string(),
        permissions: vec![],
        runtime_url,
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/qms/register", core_url);

    match client.post(&url).json(&info).send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!("[QMS Plugin] Successfully registered to core at {}", core_url);
            } else {
                tracing::warn!("[QMS Plugin] Failed to register to core: {}", response.status());
            }
        }
        Err(e) => {
            tracing::warn!("[QMS Plugin] Failed to connect to core at {}: {}", core_url, e);
        }
    }
}
