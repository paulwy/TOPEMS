use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::shared::AppState;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
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
pub struct PermissionDef {
    pub code: String,
    pub name: String,
    pub resource_type: String,
    pub action: String,
}

#[utoipa::path(
    get,
    path = "/api/plugins/info",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8031".to_string());

    let info = PluginInfo {
        code: "pdm".to_string(),
        name: "产品数据管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "PDM 产品数据管理系统，包含产品、物料、配方、文档、版本等模块".to_string(),
        permissions: vec![],
        runtime_url,
        dependencies: vec!["mes".to_string()],
        navigation_config: Some(serde_json::json!([
            {"code": "pdm-bom", "label": "产品结构", "path": "/pdm/bom", "icon": "Layers", "order": 10, "group": "business"},
            {"code": "pdm-processes", "label": "工艺管理", "path": "/pdm/processes", "icon": "Settings", "order": 20, "group": "business"},
            {"code": "pdm-documents", "label": "文档管理", "path": "/pdm/documents", "icon": "FileText", "order": 30, "group": "business"}
        ])),
        category: Some("manufacturing".to_string()),
    };
    Json(ApiResponse::success(info, "Plugin info"))
}

#[utoipa::path(
    get,
    path = "/api/plugins/health",
    tag = "pdm",
    responses((status = 200, description = "OK")),
)]
pub async fn plugin_health_check(State(state): State<AppState>) -> Json<ApiResponse<String>> {
    let db_healthy = sqlx::query("SELECT 1").fetch_one(&state.pool).await.is_ok();

    if db_healthy {
        Json(ApiResponse::success(
            "healthy".to_string(),
            "Plugin is healthy",
        ))
    } else {
        Json(ApiResponse::error(500, "Database connection failed"))
    }
}
