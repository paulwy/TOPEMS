use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};

use crate::shared::AppState;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub runtime_url: String,
    pub permissions: Vec<PermissionDef>,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub navigation_config: Option<serde_json::Value>,
    #[serde(default)]
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionDef {
    pub code: String,
    pub name: String,
    pub resource_type: String,
    pub action: String,
}

pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8090".to_string());

    let info = PluginInfo {
        code: "master-data".to_string(),
        name: "主数据管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "Master Data 主数据管理服务，包含数据质量闭环、自动修复、数据治理 AI"
            .to_string(),
        runtime_url,
        permissions: vec![
            PermissionDef {
                code: "master-data:quality:read".to_string(),
                name: "查看质量检查".to_string(),
                resource_type: "quality_check".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "master-data:quality:write".to_string(),
                name: "管理质量规则".to_string(),
                resource_type: "quality_rule".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "master-data:quality:execute".to_string(),
                name: "执行质量检查".to_string(),
                resource_type: "quality_check".to_string(),
                action: "execute".to_string(),
            },
            PermissionDef {
                code: "master-data:autofix:execute".to_string(),
                name: "执行自动修复".to_string(),
                resource_type: "auto_fix".to_string(),
                action: "execute".to_string(),
            },
            PermissionDef {
                code: "master-data:autofix:read".to_string(),
                name: "查看修复历史".to_string(),
                resource_type: "fix_history".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "master-data:governance:read".to_string(),
                name: "查看治理建议".to_string(),
                resource_type: "governance_suggestion".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "master-data:governance:approve".to_string(),
                name: "批准治理建议".to_string(),
                resource_type: "governance_suggestion".to_string(),
                action: "approve".to_string(),
            },
            PermissionDef {
                code: "master-data:dashboard:read".to_string(),
                name: "查看质量仪表盘".to_string(),
                resource_type: "dashboard".to_string(),
                action: "read".to_string(),
            },
        ],
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "master-data-quality", "label": "数据质量", "path": "/master-data/quality", "icon": "ShieldCheck", "order": 10, "group": "system"},
            {"code": "master-data-lineage", "label": "数据血缘", "path": "/master-data/lineage", "icon": "GitBranch", "order": 20, "group": "system"},
            {"code": "master-data-governance", "label": "数据治理", "path": "/master-data/governance", "icon": "Gauge", "order": 30, "group": "system"}
        ])),
        category: Some("system".to_string()),
    };
    Json(ApiResponse::success(info, "Plugin info"))
}

pub async fn plugin_health_check(State(state): State<AppState>) -> Json<ApiResponse<()>> {
    match sqlx::query("SELECT 1").fetch_one(&state.db).await {
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
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8090".to_string());

    let info = PluginInfo {
        code: "master-data".to_string(),
        name: "主数据管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "Master Data 主数据管理服务".to_string(),
        runtime_url,
        permissions: vec![],
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "master-data-quality", "label": "数据质量", "path": "/master-data/quality", "icon": "ShieldCheck", "order": 10, "group": "system"},
            {"code": "master-data-lineage", "label": "数据血缘", "path": "/master-data/lineage", "icon": "GitBranch", "order": 20, "group": "system"},
            {"code": "master-data-governance", "label": "数据治理", "path": "/master-data/governance", "icon": "Gauge", "order": 30, "group": "system"}
        ])),
        category: Some("system".to_string()),
    };

    let client = reqwest::Client::new();
    let url = format!(
        "{}/api/core/plugin/dev/plugins/master-data/register",
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
                    "[Master-Data Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[Master-Data Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[Master-Data Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}
