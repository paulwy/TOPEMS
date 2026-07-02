use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};

use crate::api::ApiState;
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
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8041".to_string());
    let info = PluginInfo {
        code: "wms".to_string(),
        name: "仓储管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "WMS 仓储管理系统，包含仓库管理、库存管理、入库管理、出库管理、库位管理、库存盘点、库存调拨等模块".to_string(),
        runtime_url,
        permissions: vec![
            PermissionDef {
                code: "wms:warehouse:read".to_string(),
                name: "查看仓库".to_string(),
                resource_type: "warehouse".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "wms:warehouse:write".to_string(),
                name: "管理仓库".to_string(),
                resource_type: "warehouse".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "wms:location:read".to_string(),
                name: "查看库位".to_string(),
                resource_type: "location".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "wms:location:write".to_string(),
                name: "管理库位".to_string(),
                resource_type: "location".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "wms:inventory:read".to_string(),
                name: "查看库存".to_string(),
                resource_type: "inventory".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "wms:inventory:write".to_string(),
                name: "管理库存".to_string(),
                resource_type: "inventory".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "wms:inbound_order:read".to_string(),
                name: "查看入库单".to_string(),
                resource_type: "inbound_order".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "wms:inbound_order:write".to_string(),
                name: "管理入库单".to_string(),
                resource_type: "inbound_order".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "wms:inbound_order:approve".to_string(),
                name: "审批入库单".to_string(),
                resource_type: "inbound_order".to_string(),
                action: "approve".to_string(),
            },
            PermissionDef {
                code: "wms:outbound_order:read".to_string(),
                name: "查看出库单".to_string(),
                resource_type: "outbound_order".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "wms:outbound_order:write".to_string(),
                name: "管理出库单".to_string(),
                resource_type: "outbound_order".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "wms:outbound_order:approve".to_string(),
                name: "审批出库单".to_string(),
                resource_type: "outbound_order".to_string(),
                action: "approve".to_string(),
            },
            PermissionDef {
                code: "wms:stock_take:read".to_string(),
                name: "查看盘点".to_string(),
                resource_type: "stock_take".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "wms:stock_take:write".to_string(),
                name: "管理盘点".to_string(),
                resource_type: "stock_take".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "wms:transfer:read".to_string(),
                name: "查看调拨".to_string(),
                resource_type: "transfer".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "wms:transfer:write".to_string(),
                name: "管理调拨".to_string(),
                resource_type: "transfer".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "wms:transfer:approve".to_string(),
                name: "审批调拨".to_string(),
                resource_type: "transfer".to_string(),
                action: "approve".to_string(),
            },
        ],
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

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8041".to_string());

    let info = PluginInfo {
        code: "wms".to_string(),
        name: "仓储管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "WMS 仓储管理系统".to_string(),
        runtime_url,
        permissions: vec![],
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/wms/register", core_url);

    match client.post(&url).json(&info).send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[WMS Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[WMS Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[WMS Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}
