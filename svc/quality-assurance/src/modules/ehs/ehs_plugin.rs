// EHS Service Plugin Interface

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
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8052".to_string())
}

pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url = get_runtime_url();
    let plugin_info = PluginInfo {
        code: "ehs".to_string(),
        name: "环境健康安全系统".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "EHS 环境健康安全系统 - 风险评估、安全检查、事故报告、培训管理".to_string(),
        permissions: vec![
            Permission { code: "ehs:risk:read".to_string(), name: "查看风险评估".to_string(), resource_type: "risk".to_string(), action: "read".to_string() },
            Permission { code: "ehs:risk:write".to_string(), name: "管理风险评估".to_string(), resource_type: "risk".to_string(), action: "write".to_string() },
            Permission { code: "ehs:safety:read".to_string(), name: "查看安全检查".to_string(), resource_type: "safety".to_string(), action: "read".to_string() },
            Permission { code: "ehs:safety:write".to_string(), name: "管理安全检查".to_string(), resource_type: "safety".to_string(), action: "write".to_string() },
            Permission { code: "ehs:accident:read".to_string(), name: "查看事故报告".to_string(), resource_type: "accident".to_string(), action: "read".to_string() },
            Permission { code: "ehs:accident:write".to_string(), name: "管理事故报告".to_string(), resource_type: "accident".to_string(), action: "write".to_string() },
            Permission { code: "ehs:environment:read".to_string(), name: "查看环境报告".to_string(), resource_type: "environment".to_string(), action: "read".to_string() },
            Permission { code: "ehs:health:read".to_string(), name: "查看健康记录".to_string(), resource_type: "health".to_string(), action: "read".to_string() },
            Permission { code: "ehs:training:read".to_string(), name: "查看培训记录".to_string(), resource_type: "training".to_string(), action: "read".to_string() },
            Permission { code: "ehs:training:write".to_string(), name: "管理培训记录".to_string(), resource_type: "training".to_string(), action: "write".to_string() },
        ],
        runtime_url,
    };

    Json(ApiResponse::success(plugin_info, "EHS plugin info"))
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
        code: "ehs".to_string(),
        name: "环境健康安全系统".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "EHS 环境健康安全系统".to_string(),
        permissions: vec![],
        runtime_url,
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/ehs/register", core_url);

    match client.post(&url).json(&info).send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!("[EHS Plugin] Successfully registered to core at {}", core_url);
            } else {
                tracing::warn!("[EHS Plugin] Failed to register to core: {}", response.status());
            }
        }
        Err(e) => {
            tracing::warn!("[EHS Plugin] Failed to connect to core at {}: {}", core_url, e);
        }
    }
}
