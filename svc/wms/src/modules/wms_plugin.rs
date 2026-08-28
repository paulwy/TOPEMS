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
        dependencies: vec!["scm".to_string()],
        navigation_config: Some(serde_json::json!([
            {"code": "wms-inventory", "label": "库存管理", "path": "/wms/inventory", "icon": "Warehouse", "order": 10, "group": "business"},
            {"code": "wms-inbound", "label": "入库管理", "path": "/wms/inbound", "icon": "ArrowDownCircle", "order": 20, "group": "business"},
            {"code": "wms-outbound", "label": "出库管理", "path": "/wms/outbound", "icon": "ArrowUpCircle", "order": 30, "group": "business"}
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
        dependencies: vec!["scm".to_string()],
        navigation_config: Some(serde_json::json!([
            {"code": "wms-inventory", "label": "库存管理", "path": "/wms/inventory", "icon": "Warehouse", "order": 10, "group": "business"},
            {"code": "wms-inbound", "label": "入库管理", "path": "/wms/inbound", "icon": "ArrowDownCircle", "order": 20, "group": "business"},
            {"code": "wms-outbound", "label": "出库管理", "path": "/wms/outbound", "icon": "ArrowUpCircle", "order": 30, "group": "business"}
        ])),
        category: Some("manufacturing".to_string()),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/wms/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_plugin_info_serialization() {
        let info = PluginInfo {
            code: "wms".to_string(),
            name: "仓储管理".to_string(),
            version: "1.0.0".to_string(),
            description: "WMS 仓储管理系统".to_string(),
            runtime_url: "http://localhost:8041".to_string(),
            permissions: vec![
                PermissionDef {
                    code: "wms:warehouse:read".to_string(),
                    name: "查看仓库".to_string(),
                    resource_type: "warehouse".to_string(),
                    action: "read".to_string(),
                },
            ],
            dependencies: vec!["core".to_string()],
            navigation_config: Some(serde_json::json!({"menu": "wms"})),
            category: Some("warehouse".to_string()),
        };
        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(json["code"], "wms");
        assert_eq!(json["name"], "仓储管理");
        assert_eq!(json["version"], "1.0.0");
        assert_eq!(json["description"], "WMS 仓储管理系统");
        assert_eq!(json["runtime_url"], "http://localhost:8041");
        assert_eq!(json["permissions"][0]["code"], "wms:warehouse:read");
        assert_eq!(json["dependencies"][0], "core");
        assert_eq!(json["category"], "warehouse");
    }

    #[test]
    fn test_plugin_info_minimal() {
        let info = PluginInfo {
            code: "wms".to_string(),
            name: "仓储管理".to_string(),
            version: "1.0.0".to_string(),
            description: "WMS 仓储管理系统".to_string(),
            runtime_url: "http://localhost:8041".to_string(),
            permissions: vec![],
            dependencies: vec![],
            navigation_config: None,
            category: None,
        };
        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(json["code"], "wms");
        assert_eq!(json["permissions"].as_array().unwrap().is_empty(), true);
        assert_eq!(json["dependencies"].as_array().unwrap().is_empty(), true);
        assert!(json["navigation_config"].is_null());
        assert!(json["category"].is_null());
    }

    #[test]
    fn test_plugin_info_clone() {
        let info = PluginInfo {
            code: "wms".to_string(),
            name: "仓储管理".to_string(),
            version: "1.0.0".to_string(),
            description: "WMS 仓储管理系统".to_string(),
            runtime_url: "http://localhost:8041".to_string(),
            permissions: vec![],
            dependencies: vec![],
            navigation_config: None,
            category: None,
        };
        let cloned = info.clone();
        assert_eq!(info.code, cloned.code);
        assert_eq!(info.name, cloned.name);
        assert_eq!(info.version, cloned.version);
    }

    #[test]
    fn test_plugin_info_deserialize() {
        let json = r#"{
            "code": "wms",
            "name": "仓储管理",
            "version": "2.0.0",
            "description": "WMS 系统",
            "runtime_url": "http://localhost:8041",
            "permissions": [
                {
                    "code": "wms:inventory:read",
                    "name": "查看库存",
                    "resource_type": "inventory",
                    "action": "read"
                }
            ],
            "dependencies": ["core", "iam"],
            "category": "warehouse"
        }"#;
        let info: PluginInfo = serde_json::from_str(json).unwrap();
        assert_eq!(info.code, "wms");
        assert_eq!(info.name, "仓储管理");
        assert_eq!(info.version, "2.0.0");
        assert_eq!(info.permissions.len(), 1);
        assert_eq!(info.permissions[0].code, "wms:inventory:read");
        assert_eq!(info.dependencies.len(), 2);
        assert_eq!(info.dependencies[0], "core");
        assert_eq!(info.dependencies[1], "iam");
        assert_eq!(info.category.as_deref(), Some("warehouse"));
    }

    #[test]
    fn test_permission_def_serialization() {
        let perm = PermissionDef {
            code: "wms:warehouse:write".to_string(),
            name: "管理仓库".to_string(),
            resource_type: "warehouse".to_string(),
            action: "write".to_string(),
        };
        let json = serde_json::to_value(&perm).unwrap();
        assert_eq!(json["code"], "wms:warehouse:write");
        assert_eq!(json["name"], "管理仓库");
        assert_eq!(json["resource_type"], "warehouse");
        assert_eq!(json["action"], "write");
    }

    #[test]
    fn test_permission_def_clone() {
        let perm = PermissionDef {
            code: "wms:inventory:write".to_string(),
            name: "管理库存".to_string(),
            resource_type: "inventory".to_string(),
            action: "write".to_string(),
        };
        let cloned = perm.clone();
        assert_eq!(perm.code, cloned.code);
        assert_eq!(perm.name, cloned.name);
        assert_eq!(perm.resource_type, cloned.resource_type);
        assert_eq!(perm.action, cloned.action);
    }

    #[test]
    fn test_permission_def_deserialize() {
        let json = r#"{
            "code": "wms:order:read",
            "name": "查看订单",
            "resource_type": "order",
            "action": "read"
        }"#;
        let perm: PermissionDef = serde_json::from_str(json).unwrap();
        assert_eq!(perm.code, "wms:order:read");
        assert_eq!(perm.name, "查看订单");
        assert_eq!(perm.resource_type, "order");
        assert_eq!(perm.action, "read");
    }
}
