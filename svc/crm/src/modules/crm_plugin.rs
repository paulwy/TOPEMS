use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};

use crate::modules::ApiState;
use topems_shared::ApiResponse;

/// 插件信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub runtime_url: String,
    pub permissions: Vec<PermissionDef>,
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
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8029".to_string());

    let info = PluginInfo {
        code: "crm".to_string(),
        name: "客户关系管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description:
            "CRM 客户关系管理系统，包含客户管理、联系人管理、销售机会管理、销售预测、计费管理等模块"
                .to_string(),
        runtime_url,
        permissions: vec![
            PermissionDef {
                code: "crm:customer:read".to_string(),
                name: "查看客户".to_string(),
                resource_type: "customer".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "crm:customer:write".to_string(),
                name: "管理客户".to_string(),
                resource_type: "customer".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "crm:contact:read".to_string(),
                name: "查看联系人".to_string(),
                resource_type: "contact".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "crm:contact:write".to_string(),
                name: "管理联系人".to_string(),
                resource_type: "contact".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "crm:opportunity:read".to_string(),
                name: "查看销售机会".to_string(),
                resource_type: "opportunity".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "crm:opportunity:write".to_string(),
                name: "管理销售机会".to_string(),
                resource_type: "opportunity".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "crm:sales_forecast:read".to_string(),
                name: "查看销售预测".to_string(),
                resource_type: "sales_forecast".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "crm:sales_forecast:write".to_string(),
                name: "管理销售预测".to_string(),
                resource_type: "sales_forecast".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "crm:billing:read".to_string(),
                name: "查看计费".to_string(),
                resource_type: "billing".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "crm:billing:write".to_string(),
                name: "管理计费".to_string(),
                resource_type: "billing".to_string(),
                action: "write".to_string(),
            },
        ],
    };
    Json(ApiResponse::success(info, "Plugin info"))
}

/// 插件健康检查
pub async fn plugin_health_check(State(state): State<ApiState>) -> Json<ApiResponse<()>> {
    // 检查数据库连接
    match sqlx::query("SELECT 1").fetch_one(&state.db).await {
        Ok(_) => Json(ApiResponse::success((), "Healthy")),
        Err(e) => Json(ApiResponse::error(503, &format!("Database error: {}", e))),
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
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8029".to_string());

    let info = PluginInfo {
        code: "crm".to_string(),
        name: "客户关系管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "CRM 客户关系管理系统".to_string(),
        runtime_url,
        permissions: vec![],
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/crm/register", core_url);

    match client.post(&url).json(&info).send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[CRM Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[CRM Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[CRM Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}
