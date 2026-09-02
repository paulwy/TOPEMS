// Quality Assurance Service Plugin Interface
// 质量管理与安全服务插件接口实现

use crate::shared::AppState;
use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use std::env;
use topems_shared_boundary::only_own_schema_query;

use topems_shared_core::response::ApiResponse;

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
    pub runtime_url: String,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub navigation_config: Option<serde_json::Value>,
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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/plugins/info",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url = get_runtime_url();
    let plugin_info = PluginInfo {
        code: "qa".to_string(),
        name: "质量管理与安全".to_string(),
        version: "1.0.0".to_string(),
        description: "质量管理与安全服务 - QMS质量管理、LIMS实验室管理、EHS环境健康安全"
            .to_string(),
        author: "TOPEMS".to_string(),
        category: "quality".to_string(),
        plugin_type: "business".to_string(),
        permissions: vec![
            Permission {
                code: "qa:quality:inspection:read".to_string(),
                name: "查看质量检验".to_string(),
                description: "查看质量检验记录".to_string(),
            },
            Permission {
                code: "qa:quality:inspection:write".to_string(),
                name: "管理质量检验".to_string(),
                description: "创建和更新质量检验".to_string(),
            },
            Permission {
                code: "qa:quality:issue:read".to_string(),
                name: "查看质量问题".to_string(),
                description: "查看质量问题记录".to_string(),
            },
            Permission {
                code: "qa:quality:issue:write".to_string(),
                name: "管理质量问题".to_string(),
                description: "创建和解决质量问题".to_string(),
            },
            Permission {
                code: "qa:quality:standard:read".to_string(),
                name: "查看质量标准".to_string(),
                description: "查看质量标准".to_string(),
            },
            Permission {
                code: "qa:quality:standard:write".to_string(),
                name: "管理质量标准".to_string(),
                description: "创建和更新质量标准".to_string(),
            },
            Permission {
                code: "qa:lims:sample:read".to_string(),
                name: "查看样品".to_string(),
                description: "查看实验室样品".to_string(),
            },
            Permission {
                code: "qa:lims:sample:write".to_string(),
                name: "管理样品".to_string(),
                description: "注册和管理样品".to_string(),
            },
            Permission {
                code: "qa:lims:task:read".to_string(),
                name: "查看检验任务".to_string(),
                description: "查看检验任务".to_string(),
            },
            Permission {
                code: "qa:lims:task:write".to_string(),
                name: "管理检验任务".to_string(),
                description: "创建和管理检验任务".to_string(),
            },
            Permission {
                code: "qa:lims:record:read".to_string(),
                name: "查看检验记录".to_string(),
                description: "查看检验记录".to_string(),
            },
            Permission {
                code: "qa:lims:instrument:read".to_string(),
                name: "查看仪器设备".to_string(),
                description: "查看实验室仪器设备".to_string(),
            },
            Permission {
                code: "qa:lims:reagent:read".to_string(),
                name: "查看试剂".to_string(),
                description: "查看实验室试剂".to_string(),
            },
            Permission {
                code: "qa:ehs:risk:read".to_string(),
                name: "查看风险评估".to_string(),
                description: "查看风险评估记录".to_string(),
            },
            Permission {
                code: "qa:ehs:risk:write".to_string(),
                name: "管理风险评估".to_string(),
                description: "创建和管理风险评估".to_string(),
            },
            Permission {
                code: "qa:ehs:safety:read".to_string(),
                name: "查看安全检查".to_string(),
                description: "查看安全检查记录".to_string(),
            },
            Permission {
                code: "qa:ehs:accident:read".to_string(),
                name: "查看事故记录".to_string(),
                description: "查看事故记录".to_string(),
            },
            Permission {
                code: "qa:ehs:accident:write".to_string(),
                name: "管理事故记录".to_string(),
                description: "上报和管理事故".to_string(),
            },
            Permission {
                code: "qa:ehs:training:read".to_string(),
                name: "查看培训记录".to_string(),
                description: "查看安全培训记录".to_string(),
            },
            Permission {
                code: "qa:ehs:training:write".to_string(),
                name: "管理培训记录".to_string(),
                description: "创建和管理培训记录".to_string(),
            },
        ],
        runtime_url,
        dependencies: vec!["mes".to_string(), "qms".to_string()],
        navigation_config: Some(serde_json::json!([
            {"code": "ehs-risks", "label": "风险评估", "path": "/ehs/risks", "icon": "AlertOctagon", "order": 10, "group": "business"},
            {"code": "ehs-accidents", "label": "事故管理", "path": "/ehs/accidents", "icon": "AlertTriangle", "order": 20, "group": "business"},
            {"code": "ehs-training", "label": "安全培训", "path": "/ehs/training", "icon": "GraduationCap", "order": 30, "group": "business"}
        ])),
    };

    Json(ApiResponse::success(plugin_info, "QA plugin info"))
}

// Plugin health check endpoint
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/plugins/health",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn plugin_health_check(State(state): State<AppState>) -> Json<ApiResponse<PluginHealth>> {
    let db_status = sqlx::query(only_own_schema_query!("public", "SELECT 1"))
        .fetch_one(&state.pool)
        .await
        .is_ok();

    let health = PluginHealth {
        status: if db_status {
            "healthy".to_string()
        } else {
            "degraded".to_string()
        },
        database: db_status,
    };

    Json(ApiResponse::success(health, "QA plugin health check"))
}

// Create plugin routes
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}

/// 获取运行时 URL
fn get_runtime_url() -> String {
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8052".to_string())
}

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url = get_runtime_url();

    let info = PluginInfo {
        code: "qa".to_string(),
        name: "质量管理与安全".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "质量管理与安全服务 - QMS质量管理、LIMS实验室管理、EHS环境健康安全"
            .to_string(),
        author: "TOPEMS".to_string(),
        category: "quality".to_string(),
        plugin_type: "business".to_string(),
        permissions: vec![],
        runtime_url,
        dependencies: vec!["mes".to_string(), "qms".to_string()],
        navigation_config: Some(serde_json::json!([
            {"code": "ehs-risks", "label": "风险评估", "path": "/ehs/risks", "icon": "AlertOctagon", "order": 10, "group": "business"},
            {"code": "ehs-accidents", "label": "事故管理", "path": "/ehs/accidents", "icon": "AlertTriangle", "order": 20, "group": "business"},
            {"code": "ehs-training", "label": "安全培训", "path": "/ehs/training", "icon": "GraduationCap", "order": 30, "group": "business"}
        ])),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/qa/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[QA Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[QA Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[QA Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}
