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
        code: "hrm".to_string(),
        name: "人力资源管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "HRM 人力资源管理系统，包含员工管理、部门管理、考勤管理、薪酬管理、招聘管理、培训管理、绩效管理等模块".to_string(),
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
                code: "hrm:department:read".to_string(),
                name: "查看部门".to_string(),
                resource_type: "department".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "hrm:department:write".to_string(),
                name: "管理部门".to_string(),
                resource_type: "department".to_string(),
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
                code: "hrm:leave:read".to_string(),
                name: "查看请假".to_string(),
                resource_type: "leave".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "hrm:leave:write".to_string(),
                name: "管理请假".to_string(),
                resource_type: "leave".to_string(),
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
            PermissionDef {
                code: "hrm:recruitment:read".to_string(),
                name: "查看招聘".to_string(),
                resource_type: "recruitment".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "hrm:recruitment:write".to_string(),
                name: "管理招聘".to_string(),
                resource_type: "recruitment".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "hrm:training:read".to_string(),
                name: "查看培训".to_string(),
                resource_type: "training".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "hrm:training:write".to_string(),
                name: "管理培训".to_string(),
                resource_type: "training".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "hrm:performance:read".to_string(),
                name: "查看绩效".to_string(),
                resource_type: "performance".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "hrm:performance:write".to_string(),
                name: "管理绩效".to_string(),
                resource_type: "performance".to_string(),
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
