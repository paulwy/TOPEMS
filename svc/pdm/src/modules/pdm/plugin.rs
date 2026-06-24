//! Plugin handlers

use axum::{extract::Path, extract::State, Json, routing::get, Router};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::AppState;
use topems_shared::ApiResponse;

/// 插件信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub permissions: Vec<PermissionDef>,
    pub runtime_url: String,
}

/// 权限定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionDef {
    pub code: String,
    pub name: String,
    pub resource_type: String,
    pub action: String,
}

/// 获取插件信息
pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url = std::env::var("RUNTIME_URL")
        .unwrap_or_else(|_| "http://localhost:8031".to_string());

    let info = PluginInfo {
        code: "pdm".to_string(),
        name: "产品数据管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "PDM 产品数据管理系统，包含产品、物料、配方、文档、版本等模块".to_string(),
        permissions: vec![],
        runtime_url,
    };
    Json(ApiResponse::success(info, "Plugin info"))
}

/// 插件健康检查
pub async fn plugin_health_check(State(state): State<AppState>) -> Json<ApiResponse<String>> {
    let db_healthy = sqlx::query("SELECT 1")
        .fetch_one(&state.pool)
        .await
        .is_ok();

    if db_healthy {
        Json(ApiResponse::success("healthy".to_string(), "Plugin is healthy"))
    } else {
        Json(ApiResponse::error(500, "Database connection failed"))
    }
}

pub async fn list(
    State(_state): State<AppState>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("list called");
    Json(ApiResponse::success(
        serde_json::json!({
            "items": [],
            "total": 0
        }),
        "获取列表成功",
    ))
}

pub async fn create(
    State(_state): State<AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("create called");
    Json(ApiResponse::success(
        serde_json::json!({
            "id": Uuid::new_v4()
        }),
        "创建成功",
    ))
}

pub async fn get_item(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("get_item called");
    Json(ApiResponse::success(
        serde_json::json!({}),
        "获取成功",
    ))
}

pub async fn update(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::info!("update called");
    Json(ApiResponse::success(
        serde_json::json!({}),
        "更新成功",
    ))
}

pub async fn delete(
    State(_state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    tracing::info!("delete called");
    Json(ApiResponse::success(true, "删除成功"))
}
