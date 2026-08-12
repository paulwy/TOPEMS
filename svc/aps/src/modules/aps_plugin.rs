use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};

use crate::modules::ApiState;
use topems_shared_core::response::ApiResponse;

/// 插件信息
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
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8043".to_string());
    let info = PluginInfo {
        code: "aps".to_string(),
        name: "高级计划与排程".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description:
            "APS 高级计划与排程系统，包含生产计划、排程管理、产能管理、物料计划、需求预测等模块"
                .to_string(),
        runtime_url,
        permissions: vec![
            PermissionDef {
                code: "aps:production_plan:read".to_string(),
                name: "查看生产计划".to_string(),
                resource_type: "production_plan".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "aps:production_plan:write".to_string(),
                name: "管理生产计划".to_string(),
                resource_type: "production_plan".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "aps:schedule:read".to_string(),
                name: "查看排程".to_string(),
                resource_type: "schedule".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "aps:schedule:write".to_string(),
                name: "管理排程".to_string(),
                resource_type: "schedule".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "aps:capacity:read".to_string(),
                name: "查看产能".to_string(),
                resource_type: "capacity".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "aps:capacity:write".to_string(),
                name: "管理产能".to_string(),
                resource_type: "capacity".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "aps:material_plan:read".to_string(),
                name: "查看物料计划".to_string(),
                resource_type: "material_plan".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "aps:material_plan:write".to_string(),
                name: "管理物料计划".to_string(),
                resource_type: "material_plan".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "aps:forecast:read".to_string(),
                name: "查看需求预测".to_string(),
                resource_type: "forecast".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "aps:forecast:write".to_string(),
                name: "管理需求预测".to_string(),
                resource_type: "forecast".to_string(),
                action: "write".to_string(),
            },
        ],
        dependencies: vec!["mes".to_string()],
        navigation_config: Some(serde_json::json!([
            {"code": "aps-production-plan", "label": "生产计划", "path": "/aps/production-plans", "icon": "Calendar", "order": 10, "group": "business"},
            {"code": "aps-schedule", "label": "排程管理", "path": "/aps/schedules", "icon": "Schedule", "order": 20, "group": "business"},
            {"code": "aps-capacity", "label": "产能管理", "path": "/aps/capacities", "icon": "Gauge", "order": 30, "group": "business"},
            {"code": "aps-material-plan", "label": "物料计划", "path": "/aps/material-plans", "icon": "Box", "order": 40, "group": "business"},
            {"code": "aps-forecast", "label": "需求预测", "path": "/aps/forecasts", "icon": "TrendingUp", "order": 50, "group": "business"}
        ])),
        category: Some("manufacturing".to_string()),
    };
    Json(ApiResponse::success(info, "Plugin info"))
}

/// 插件健康检查
pub async fn plugin_health_check(State(state): State<ApiState>) -> Json<ApiResponse<()>> {
    match sqlx::query("SELECT 1").fetch_one(&state.db).await {
        Ok(_) => Json(ApiResponse::success((), "Healthy")),
        Err(e) => Json(ApiResponse::error(503, &format!("Database error: {}", e))),
    }
}

#[allow(dead_code)]
pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8043".to_string());

    let info = PluginInfo {
        code: "aps".to_string(),
        name: "高级计划与排程".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "APS 高级计划与排程系统".to_string(),
        runtime_url,
        permissions: vec![],
        dependencies: vec!["mes".to_string()],
        navigation_config: Some(serde_json::json!([
            {"code": "aps-production-plan", "label": "生产计划", "path": "/aps/production-plans", "icon": "Calendar", "order": 10, "group": "business"},
            {"code": "aps-schedule", "label": "排程管理", "path": "/aps/schedules", "icon": "Schedule", "order": 20, "group": "business"},
            {"code": "aps-capacity", "label": "产能管理", "path": "/aps/capacities", "icon": "Gauge", "order": 30, "group": "business"}
        ])),
        category: Some("manufacturing".to_string()),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/aps/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[APS Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[APS Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[APS Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}
