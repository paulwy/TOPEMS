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
    let info = PluginInfo {
        code: "scm".to_string(),
        name: "供应链管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "SCM 供应链管理系统，包含供应商管理、采购订单管理、采购供应商评价等模块".to_string(),
        permissions: vec![
            PermissionDef {
                code: "scm:supplier:read".to_string(),
                name: "查看供应商".to_string(),
                resource_type: "supplier".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "scm:supplier:write".to_string(),
                name: "管理供应商".to_string(),
                resource_type: "supplier".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "scm:supplier:delete".to_string(),
                name: "删除供应商".to_string(),
                resource_type: "supplier".to_string(),
                action: "delete".to_string(),
            },
            PermissionDef {
                code: "scm:purchase_order:read".to_string(),
                name: "查看采购订单".to_string(),
                resource_type: "purchase_order".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "scm:purchase_order:write".to_string(),
                name: "管理采购订单".to_string(),
                resource_type: "purchase_order".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "scm:purchase_order:approve".to_string(),
                name: "审批采购订单".to_string(),
                resource_type: "purchase_order".to_string(),
                action: "approve".to_string(),
            },
            PermissionDef {
                code: "scm:purchase_item:read".to_string(),
                name: "查看采购明细".to_string(),
                resource_type: "purchase_item".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "scm:purchase_item:write".to_string(),
                name: "管理采购明细".to_string(),
                resource_type: "purchase_item".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "scm:supplier_evaluation:read".to_string(),
                name: "查看供应商评价".to_string(),
                resource_type: "supplier_evaluation".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "scm:supplier_evaluation:write".to_string(),
                name: "管理供应商评价".to_string(),
                resource_type: "supplier_evaluation".to_string(),
                action: "write".to_string(),
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
}
