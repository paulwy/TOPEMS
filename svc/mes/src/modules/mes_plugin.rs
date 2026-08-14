use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};

use crate::AppState;
use topems_shared_core::response::ApiResponse;

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
        code: "mes".to_string(),
        name: "制造执行系统".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "MES 制造执行系统，包含生产工单、生产工艺、生产记录、设备管理、工位管理等模块"
            .to_string(),
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
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "mes-orders", "label": "生产订单", "path": "/mes/orders", "icon": "ClipboardList", "order": 10, "group": "business"},
            {"code": "mes-workstations", "label": "工位管理", "path": "/mes/workstations", "icon": "Factory", "order": 20, "group": "business"},
            {"code": "mes-equipment", "label": "设备管理", "path": "/mes/equipment", "icon": "Wrench", "order": 30, "group": "business"}
        ])),
        category: Some("manufacturing".to_string()),
    };
    Json(ApiResponse::success(info, "Plugin info"))
}

pub async fn plugin_health_check(State(state): State<AppState>) -> Json<ApiResponse<()>> {
    match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => Json(ApiResponse::success((), "Healthy")),
        Err(e) => Json(ApiResponse::error(503, &format!("Database error: {}", e))),
    }
}

pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url = get_runtime_url();

    let info = PluginInfo {
        code: "mes".to_string(),
        name: "制造执行系统".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "MES 制造执行系统".to_string(),
        permissions: vec![],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "mes-orders", "label": "生产订单", "path": "/mes/orders", "icon": "ClipboardList", "order": 10, "group": "business"},
            {"code": "mes-workstations", "label": "工位管理", "path": "/mes/workstations", "icon": "Factory", "order": 20, "group": "business"},
            {"code": "mes-equipment", "label": "设备管理", "path": "/mes/equipment", "icon": "Wrench", "order": 30, "group": "business"}
        ])),
        category: Some("manufacturing".to_string()),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/mes/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[MES Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[MES Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[MES Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::Serialize;
    use serde::de::DeserializeOwned;

    fn roundtrip<T: Serialize + DeserializeOwned>(val: &T) {
        let s1 = serde_json::to_string(val).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&s1).unwrap();
        let val2: T = serde_json::from_str(&s1).unwrap();
        let s2 = serde_json::to_string(&val2).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&s2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_permission_def_roundtrip() {
        let p = PermissionDef {
            code: "mes:order:read".to_string(),
            name: "查看生产订单".to_string(),
            resource_type: "production_order".to_string(),
            action: "read".to_string(),
        };
        roundtrip(&p);
    }

    #[test]
    fn test_plugin_info_roundtrip_some() {
        let info = PluginInfo {
            code: "mes".to_string(),
            name: "制造执行系统".to_string(),
            version: "1.0.0".to_string(),
            description: "MES 模块".to_string(),
            permissions: vec![],
            runtime_url: "http://localhost:8030".to_string(),
            dependencies: vec!["topems-shared".to_string()],
            navigation_config: Some(serde_json::json!({"items": []})),
            category: Some("manufacturing".to_string()),
        };
        roundtrip(&info);
    }

    #[test]
    fn test_plugin_info_roundtrip_none() {
        let info = PluginInfo {
            code: "mes".to_string(),
            name: "制造执行系统".to_string(),
            version: "1.0.0".to_string(),
            description: "MES 模块".to_string(),
            permissions: vec![],
            runtime_url: "http://localhost:8030".to_string(),
            dependencies: vec![],
            navigation_config: None,
            category: None,
        };
        roundtrip(&info);
    }
}
