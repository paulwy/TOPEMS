use axum::{routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use std::env;

use topems_shared::ApiResponse;

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
        code: "pm".to_string(),
        name: "项目管理".to_string(),
        version: "1.0.0".to_string(),
        description: "PM 项目管理系统，包含项目、任务、甘特图、合同、预算、风险、质量、验收、结算等模块".to_string(),
        deployment: DeploymentInfo {
            port: 8046,
            base_path: "/api/pm".to_string(),
        },
        permissions: vec![
            PermissionDef { code: "project".to_string() },
            PermissionDef { code: "milestone".to_string() },
            PermissionDef { code: "phase".to_string() },
            PermissionDef { code: "member".to_string() },
            PermissionDef { code: "resource".to_string() },
            PermissionDef { code: "expense".to_string() },
            PermissionDef { code: "benefit".to_string() },
            PermissionDef { code: "approval".to_string() },
            PermissionDef { code: "contract".to_string() },
            PermissionDef { code: "budget".to_string() },
            PermissionDef { code: "risk".to_string() },
            PermissionDef { code: "quality".to_string() },
            PermissionDef { code: "acceptance".to_string() },
            PermissionDef { code: "settlement".to_string() },
            PermissionDef { code: "document".to_string() },
            PermissionDef { code: "report".to_string() },
        ],
    };

    Json(ApiResponse::success(plugin_info, "获取插件信息成功"))
}

pub async fn plugin_health_check() -> Json<topems_shared::ServiceHealth> {
    Json(topems_shared::build_health_response("topems-pm", true))
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
        code: "pm".to_string(),
        name: "项目管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "PM 项目管理系统".to_string(),
        deployment: DeploymentInfo {
            port: 8046,
            base_path: "/api/pm".to_string(),
        },
        permissions: vec![],
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/pm/register", core_url);

    match client.post(&url).json(&info).send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!("[PM Plugin] Successfully registered to core at {}", core_url);
            } else {
                tracing::warn!("[PM Plugin] Failed to register to core: {}", response.status());
            }
        }
        Err(e) => {
            tracing::warn!("[PM Plugin] Failed to connect to core at {}: {}", core_url, e);
        }
    }
}
