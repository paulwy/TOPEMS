use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};

use crate::shared::AppState;
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
    path = "/api/plugins/info",
    tag = "BI-Plugin",
    operation_id = "get_plugin_info",
    responses((status = 200, description = "OK")),
)]
pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url = get_runtime_url();
    let info = PluginInfo {
        code: "bi".to_string(),
        name: "商业智能".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "BI 商业智能系统，包含数据分析、仪表盘、数据源、可视化、报表等模块"
            .to_string(),
        permissions: vec![
            PermissionDef {
                code: "bi:analysis:read".to_string(),
                name: "查看分析".to_string(),
                resource_type: "analysis".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "bi:analysis:write".to_string(),
                name: "管理分析".to_string(),
                resource_type: "analysis".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "bi:dashboard:read".to_string(),
                name: "查看仪表盘".to_string(),
                resource_type: "dashboard".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "bi:dashboard:write".to_string(),
                name: "管理仪表盘".to_string(),
                resource_type: "dashboard".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "bi:datasource:read".to_string(),
                name: "查看数据源".to_string(),
                resource_type: "datasource".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "bi:datasource:write".to_string(),
                name: "管理数据源".to_string(),
                resource_type: "datasource".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "bi:visualization:read".to_string(),
                name: "查看可视化".to_string(),
                resource_type: "visualization".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "bi:visualization:write".to_string(),
                name: "管理可视化".to_string(),
                resource_type: "visualization".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "bi:widget:read".to_string(),
                name: "查看组件".to_string(),
                resource_type: "widget".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "bi:widget:write".to_string(),
                name: "管理组件".to_string(),
                resource_type: "widget".to_string(),
                action: "write".to_string(),
            },
        ],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "bi-dashboards", "label": "数据大屏", "path": "/bi/dashboards", "icon": "BarChart3", "order": 10, "group": "business"},
            {"code": "bi-reports", "label": "报表分析", "path": "/bi/reports", "icon": "FileBarChart", "order": 20, "group": "business"},
            {"code": "bi-datasources", "label": "数据源", "path": "/bi/datasources", "icon": "Database", "order": 30, "group": "business"}
        ])),
        category: Some("crm".to_string()),
    };
    Json(ApiResponse::success(info, "Plugin info"))
}

/// 插件健康检查
#[utoipa::path(
    get,
    path = "/api/plugins/health",
    tag = "BI-Plugin",
    operation_id = "plugin_health_check",
    responses((status = 200, description = "OK")),
)]
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

/// 获取运行时 URL
fn get_runtime_url() -> String {
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8060".to_string())
}

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url = get_runtime_url();

    let info = PluginInfo {
        code: "bi".to_string(),
        name: "商业智能".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "BI 商业智能系统".to_string(),
        permissions: vec![],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "bi-dashboards", "label": "数据大屏", "path": "/bi/dashboards", "icon": "BarChart3", "order": 10, "group": "business"},
            {"code": "bi-reports", "label": "报表分析", "path": "/bi/reports", "icon": "FileBarChart", "order": 20, "group": "business"},
            {"code": "bi-datasources", "label": "数据源", "path": "/bi/datasources", "icon": "Database", "order": 30, "group": "business"}
        ])),
        category: Some("crm".to_string()),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/bi/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[BI Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[BI Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[BI Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}
