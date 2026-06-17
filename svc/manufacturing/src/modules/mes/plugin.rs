use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};

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
        code: "mes".to_string(),
        name: "制造执行系统".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "MES 制造执行系统，包含生产工单、生产工艺、生产记录、设备管理、工位管理等模块".to_string(),
        permissions: vec![
            PermissionDef {
                code: "mes:production_order:read".to_string(),
                name: "查看生产工单".to_string(),
                resource_type: "production_order".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "mes:production_order:write".to_string(),
                name: "管理生产工单".to_string(),
                resource_type: "production_order".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "mes:production_order:start".to_string(),
                name: "启动生产工单".to_string(),
                resource_type: "production_order".to_string(),
                action: "start".to_string(),
            },
            PermissionDef {
                code: "mes:production_order:complete".to_string(),
                name: "完成生产工单".to_string(),
                resource_type: "production_order".to_string(),
                action: "complete".to_string(),
            },
            PermissionDef {
                code: "mes:production_order:cancel".to_string(),
                name: "取消生产工单".to_string(),
                resource_type: "production_order".to_string(),
                action: "cancel".to_string(),
            },
            PermissionDef {
                code: "mes:process:read".to_string(),
                name: "查看生产工艺".to_string(),
                resource_type: "process".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "mes:process:write".to_string(),
                name: "管理生产工艺".to_string(),
                resource_type: "process".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "mes:record:read".to_string(),
                name: "查看生产记录".to_string(),
                resource_type: "record".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "mes:record:write".to_string(),
                name: "管理生产记录".to_string(),
                resource_type: "record".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "mes:equipment:read".to_string(),
                name: "查看设备".to_string(),
                resource_type: "equipment".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "mes:equipment:write".to_string(),
                name: "管理设备".to_string(),
                resource_type: "equipment".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "mes:work_station:read".to_string(),
                name: "查看工位".to_string(),
                resource_type: "work_station".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "mes:work_station:write".to_string(),
                name: "管理工位".to_string(),
                resource_type: "work_station".to_string(),
                action: "write".to_string(),
            },
        ],
    };
    Json(ApiResponse::success(info, "Plugin info"))
}

/// 插件健康检查
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
