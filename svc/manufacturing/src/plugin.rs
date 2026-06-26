use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};

use crate::AppState;
use topems_shared::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub permissions: Vec<PermissionDef>,
    pub runtime_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionDef {
    pub code: String,
    pub name: String,
    pub resource_type: String,
    pub action: String,
}

fn get_runtime_url() -> String {
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8030".to_string())
}

pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url = get_runtime_url();
    let info = PluginInfo {
        code: "manufacturing".to_string(),
        name: "制造管理系统".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description:
            "统一制造管理服务，包含 MES 制造执行系统和 PDM 产品数据管理系统".to_string(),
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
            PermissionDef {
                code: "pdm:product:read".to_string(),
                name: "查看产品".to_string(),
                resource_type: "product".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "pdm:product:write".to_string(),
                name: "管理产品".to_string(),
                resource_type: "product".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "pdm:material:read".to_string(),
                name: "查看物料".to_string(),
                resource_type: "material".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "pdm:material:write".to_string(),
                name: "管理物料".to_string(),
                resource_type: "material".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "pdm:configuration:read".to_string(),
                name: "查看配置".to_string(),
                resource_type: "configuration".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "pdm:configuration:write".to_string(),
                name: "管理配置".to_string(),
                resource_type: "configuration".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "pdm:document:read".to_string(),
                name: "查看文档".to_string(),
                resource_type: "document".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "pdm:document:write".to_string(),
                name: "管理文档".to_string(),
                resource_type: "document".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "pdm:version:read".to_string(),
                name: "查看版本".to_string(),
                resource_type: "version".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "pdm:version:write".to_string(),
                name: "管理版本".to_string(),
                resource_type: "version".to_string(),
                action: "write".to_string(),
            },
        ],
        runtime_url,
    };
    Json(ApiResponse::success(info, "Plugin info"))
}

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

pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url = get_runtime_url();

    let info = PluginInfo {
        code: "manufacturing".to_string(),
        name: "制造管理系统".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "统一制造管理服务".to_string(),
        permissions: vec![],
        runtime_url,
    };

    let client = reqwest::Client::new();
    let url = format!(
        "{}/api/core/plugin/dev/plugins/manufacturing/register",
        core_url
    );

    match client.post(&url).json(&info).send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[Manufacturing Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[Manufacturing Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[Manufacturing Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}
