// Quality Assurance Service Plugin Interface
// 质量管理与安全服务插件接口实现

use crate::AppState;
use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use topems_shared::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub category: String,
    pub plugin_type: String,
    pub permissions: Vec<Permission>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Permission {
    pub code: String,
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginHealth {
    pub status: String,
    pub database: bool,
}

// Plugin info endpoint
pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let plugin_info = PluginInfo {
        code: "qa".to_string(),
        name: "质量管理与安全".to_string(),
        version: "1.0.0".to_string(),
        description: "质量管理与安全服务 - QMS质量管理、LIMS实验室管理、EHS环境健康安全".to_string(),
        author: "TOPEMS".to_string(),
        category: "Quality".to_string(),
        plugin_type: "business".to_string(),
        permissions: vec![
            Permission { code: "qa:quality:inspection:read".to_string(), name: "查看质量检验".to_string(), description: "查看质量检验记录".to_string() },
            Permission { code: "qa:quality:inspection:write".to_string(), name: "管理质量检验".to_string(), description: "创建和更新质量检验".to_string() },
            Permission { code: "qa:quality:issue:read".to_string(), name: "查看质量问题".to_string(), description: "查看质量问题记录".to_string() },
            Permission { code: "qa:quality:issue:write".to_string(), name: "管理质量问题".to_string(), description: "创建和解决质量问题".to_string() },
            Permission { code: "qa:quality:standard:read".to_string(), name: "查看质量标准".to_string(), description: "查看质量标准".to_string() },
            Permission { code: "qa:quality:standard:write".to_string(), name: "管理质量标准".to_string(), description: "创建和更新质量标准".to_string() },
            Permission { code: "qa:lims:sample:read".to_string(), name: "查看样品".to_string(), description: "查看实验室样品".to_string() },
            Permission { code: "qa:lims:sample:write".to_string(), name: "管理样品".to_string(), description: "注册和管理样品".to_string() },
            Permission { code: "qa:lims:task:read".to_string(), name: "查看检验任务".to_string(), description: "查看检验任务".to_string() },
            Permission { code: "qa:lims:task:write".to_string(), name: "管理检验任务".to_string(), description: "创建和管理检验任务".to_string() },
            Permission { code: "qa:lims:record:read".to_string(), name: "查看检验记录".to_string(), description: "查看检验记录".to_string() },
            Permission { code: "qa:lims:instrument:read".to_string(), name: "查看仪器设备".to_string(), description: "查看实验室仪器设备".to_string() },
            Permission { code: "qa:lims:reagent:read".to_string(), name: "查看试剂".to_string(), description: "查看实验室试剂".to_string() },
            Permission { code: "qa:ehs:risk:read".to_string(), name: "查看风险评估".to_string(), description: "查看风险评估记录".to_string() },
            Permission { code: "qa:ehs:risk:write".to_string(), name: "管理风险评估".to_string(), description: "创建和管理风险评估".to_string() },
            Permission { code: "qa:ehs:safety:read".to_string(), name: "查看安全检查".to_string(), description: "查看安全检查记录".to_string() },
            Permission { code: "qa:ehs:accident:read".to_string(), name: "查看事故记录".to_string(), description: "查看事故记录".to_string() },
            Permission { code: "qa:ehs:accident:write".to_string(), name: "管理事故记录".to_string(), description: "上报和管理事故".to_string() },
            Permission { code: "qa:ehs:training:read".to_string(), name: "查看培训记录".to_string(), description: "查看安全培训记录".to_string() },
            Permission { code: "qa:ehs:training:write".to_string(), name: "管理培训记录".to_string(), description: "创建和管理培训记录".to_string() },
        ],
    };

    Json(ApiResponse::success(plugin_info, "QA plugin info"))
}

// Plugin health check endpoint
pub async fn plugin_health_check(State(state): State<AppState>) -> Json<ApiResponse<PluginHealth>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => true,
        Err(_) => false,
    };

    let health = PluginHealth {
        status: if db_status { "healthy".to_string() } else { "degraded".to_string() },
        database: db_status,
    };

    let status_code = if db_status { 200 } else { 503 };
    Json(ApiResponse::with_status(status_code, health, "QA plugin health check"))
}

// Create plugin routes
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}
