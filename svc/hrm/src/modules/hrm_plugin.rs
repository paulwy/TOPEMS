//! Plugin interface for HRM
//!
//! Implements the plugin interface protocol for integration with unified-core

use axum::{
    extract::{Extension, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;

use crate::modules::ApiState;
use topems_shared_core::response::ApiResponse;

/// 插件信息
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

/// 权限定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionDef {
    pub code: String,
    pub name: String,
    pub resource_type: String,
    pub action: String,
}

/// 获取插件信息
#[utoipa::path(
    get,
    security(("BearerAuth" = ["hrm:read"])),
    path = "/api/plugins/info",
    responses((status = 200, description = "get_plugin_info OK")),
    tag = "hrm_plugin"
)]
pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8020".to_string());
    let info = PluginInfo {
        code: "hrm".to_string(),
        name: "人力资源管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "HRM 人力资源管理系统，包含员工管理、考勤管理、薪酬绩效等模块".to_string(),
        permissions: vec![
            PermissionDef {
                code: "hrm:employee:read".to_string(),
                name: "查看员工".to_string(),
                resource_type: "employee".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "hrm:employee:write".to_string(),
                name: "管理员工".to_string(),
                resource_type: "employee".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "hrm:attendance:read".to_string(),
                name: "查看考勤".to_string(),
                resource_type: "attendance".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "hrm:attendance:write".to_string(),
                name: "管理考勤".to_string(),
                resource_type: "attendance".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "hrm:payroll:read".to_string(),
                name: "查看薪酬".to_string(),
                resource_type: "payroll".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "hrm:payroll:write".to_string(),
                name: "管理薪酬".to_string(),
                resource_type: "payroll".to_string(),
                action: "write".to_string(),
            },
        ],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "hrm-employees", "label": "员工管理", "path": "/hrm/employees", "icon": "Users", "order": 10, "group": "business"},
            {"code": "hrm-departments", "label": "部门管理", "path": "/hrm/departments", "icon": "Building2", "order": 20, "group": "business"},
            {"code": "hrm-attendance", "label": "考勤管理", "path": "/hrm/attendance", "icon": "Calendar", "order": 30, "group": "business"},
            {"code": "hrm-recruitment", "label": "招聘管理", "path": "/hrm/recruitment", "icon": "Users", "order": 40, "group": "business"},
            {"code": "hrm-settings", "label": "人事设置", "path": "/hrm/settings", "icon": "Settings", "order": 50, "group": "business"}
        ])),
        category: Some("hr".to_string()),
    };
    Json(ApiResponse::success(info, "Plugin info"))
}

/// 插件健康检查
#[utoipa::path(
    get,
    security(("BearerAuth" = ["hrm:read"])),
    path = "/api/plugins/health",
    responses((status = 200, description = "plugin_health_check OK")),
    tag = "hrm_plugin"
)]
pub async fn plugin_health_check(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let db_healthy = sqlx::query(only_own_schema_query!("hrm", "SELECT 1"))
        .fetch_one(&mut **txn)
        .await
        .is_ok();

    if db_healthy {
        Json(ApiResponse::success(
            "healthy".to_string(),
            "Plugin is healthy",
        ))
    } else {
        Json(ApiResponse::error(500, "Database connection failed"))
    }
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8020".to_string());

    let info = PluginInfo {
        code: "hrm".to_string(),
        name: "人力资源管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "HRM 人力资源管理系统".to_string(),
        permissions: vec![],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "hrm-employees", "label": "员工管理", "path": "/hrm/employees", "icon": "Users", "order": 10, "group": "business"},
            {"code": "hrm-departments", "label": "部门管理", "path": "/hrm/departments", "icon": "Building2", "order": 20, "group": "business"},
            {"code": "hrm-attendance", "label": "考勤管理", "path": "/hrm/attendance", "icon": "Calendar", "order": 30, "group": "business"},
            {"code": "hrm-recruitment", "label": "招聘管理", "path": "/hrm/recruitment", "icon": "Users", "order": 40, "group": "business"},
            {"code": "hrm-settings", "label": "人事设置", "path": "/hrm/settings", "icon": "Settings", "order": 50, "group": "business"}
        ])),
        category: Some("hr".to_string()),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/hrm/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[HRM Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[HRM Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[HRM Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}
