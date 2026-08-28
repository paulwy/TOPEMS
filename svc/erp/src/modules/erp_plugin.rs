#![allow(dead_code)]

//! Plugin interface for ERP
//!
//! Implements the plugin interface protocol for integration with unified-core

use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use std::env;

use crate::ApiState;
use topems_shared_core::response::ApiResponse;

/// 插件信息
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

/// 权限定义
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionDef {
    pub code: String,
    pub name: String,
    pub resource_type: String,
    pub action: String,
}

/// 插件心跳请求
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginHeartbeat {
    pub status: String,
    pub version: Option<String>,
}

/// 获取插件信息
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/plugins/info",
    tag = "ERP",
    operation_id = "get_plugin_info",
    responses((status = 200, description = "OK")),
)]
pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url =
        env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8010".to_string());

    let info = PluginInfo {
        code: "erp".to_string(),
        name: "企业资源计划".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "ERP 企业资源计划系统，包含资产管理、财务管理、凭证管理、字典管理等模块"
            .to_string(),
        permissions: vec![
            // 资产管理
            PermissionDef {
                code: "erp:asset:read".to_string(),
                name: "查看资产".to_string(),
                resource_type: "asset".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "erp:asset:write".to_string(),
                name: "管理资产".to_string(),
                resource_type: "asset".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "erp:asset:delete".to_string(),
                name: "删除资产".to_string(),
                resource_type: "asset".to_string(),
                action: "delete".to_string(),
            },
            // 固定资产
            PermissionDef {
                code: "erp:fixed_asset:read".to_string(),
                name: "查看固定资产".to_string(),
                resource_type: "fixed_asset".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "erp:fixed_asset:write".to_string(),
                name: "管理固定资产".to_string(),
                resource_type: "fixed_asset".to_string(),
                action: "write".to_string(),
            },
            // 财务
            PermissionDef {
                code: "erp:finance:read".to_string(),
                name: "查看财务".to_string(),
                resource_type: "finance".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "erp:finance:write".to_string(),
                name: "管理财务".to_string(),
                resource_type: "finance".to_string(),
                action: "write".to_string(),
            },
            // 凭证
            PermissionDef {
                code: "erp:voucher:read".to_string(),
                name: "查看凭证".to_string(),
                resource_type: "voucher".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "erp:voucher:write".to_string(),
                name: "管理凭证".to_string(),
                resource_type: "voucher".to_string(),
                action: "write".to_string(),
            },
            // 银行
            PermissionDef {
                code: "erp:bank:read".to_string(),
                name: "查看银行账户".to_string(),
                resource_type: "bank".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "erp:bank:write".to_string(),
                name: "管理银行账户".to_string(),
                resource_type: "bank".to_string(),
                action: "write".to_string(),
            },
            // 字典
            PermissionDef {
                code: "erp:dict:read".to_string(),
                name: "查看字典".to_string(),
                resource_type: "dict".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "erp:dict:write".to_string(),
                name: "管理字典".to_string(),
                resource_type: "dict".to_string(),
                action: "write".to_string(),
            },
            // 车辆
            PermissionDef {
                code: "erp:vehicle:read".to_string(),
                name: "查看车辆".to_string(),
                resource_type: "vehicle".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "erp:vehicle:write".to_string(),
                name: "管理车辆".to_string(),
                resource_type: "vehicle".to_string(),
                action: "write".to_string(),
            },
            // 会议室
            PermissionDef {
                code: "erp:meeting_room:read".to_string(),
                name: "查看会议室".to_string(),
                resource_type: "meeting_room".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "erp:meeting_room:write".to_string(),
                name: "管理会议室".to_string(),
                resource_type: "meeting_room".to_string(),
                action: "write".to_string(),
            },
            // 办公用品
            PermissionDef {
                code: "erp:office_supplies:read".to_string(),
                name: "查看办公用品".to_string(),
                resource_type: "office_supplies".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "erp:office_supplies:write".to_string(),
                name: "管理办公用品".to_string(),
                resource_type: "office_supplies".to_string(),
                action: "write".to_string(),
            },
        ],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "erp-finance", "label": "财务管理", "path": "/erp/finance", "icon": "DollarSign", "order": 10, "group": "business"},
            {"code": "erp-assets", "label": "资产管理", "path": "/erp/assets", "icon": "Package", "order": 20, "group": "business"},
            {"code": "erp-sales", "label": "销售管理", "path": "/erp/sales", "icon": "ShoppingCart", "order": 30, "group": "business"}
        ])),
        category: Some("erp".to_string()),
    };
    Json(ApiResponse::success(info, "Plugin info"))
}

/// 插件健康检查
#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/api/plugins/health",
    tag = "ERP",
    operation_id = "plugin_health_check",
    responses((status = 200, description = "OK")),
)]
pub async fn plugin_health_check(State(state): State<ApiState>) -> Json<ApiResponse<String>> {
    let db_healthy = sqlx::query("SELECT 1").fetch_one(&state.db).await.is_ok();

    if db_healthy {
        Json(ApiResponse::success(
            "healthy".to_string(),
            "Plugin is healthy",
        ))
    } else {
        Json(ApiResponse::error(500, "Database connection failed"))
    }
}

/// 注册插件到核心平台（启动时调用）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/erp-plugin/register-to-core",
    tag = "ErpPlugin",
    operation_id = "register_to_core",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn register_to_core(State(_state): State<ApiState>) -> Json<ApiResponse<()>> {
    let core_url =
        std::env::var("CORE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());
    let runtime_url =
        env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8010".to_string());

    // 获取插件信息
    let info = PluginInfo {
        code: "erp".to_string(),
        name: "企业资源计划".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "ERP 企业资源计划系统".to_string(),
        permissions: vec![],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "erp-finance", "label": "财务管理", "path": "/erp/finance", "icon": "DollarSign", "order": 10, "group": "business"},
            {"code": "erp-assets", "label": "资产管理", "path": "/erp/assets", "icon": "Package", "order": 20, "group": "business"},
            {"code": "erp-sales", "label": "销售管理", "path": "/erp/sales", "icon": "ShoppingCart", "order": 30, "group": "business"}
        ])),
        category: Some("erp".to_string()),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/erp/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!("[ERP Plugin] Successfully registered to core");
                Json(ApiResponse::success((), "Registered to core"))
            } else {
                tracing::warn!(
                    "[ERP Plugin] Failed to register to core: {}",
                    response.status()
                );
                Json(ApiResponse::error(
                    500,
                    &format!("Failed to register: {}", response.status()),
                ))
            }
        }
        Err(e) => {
            tracing::warn!("[ERP Plugin] Failed to register to core: {}", e);
            Json(ApiResponse::error(
                500,
                &format!("Failed to connect to core: {}", e),
            ))
        }
    }
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}

/// 启动时自动注册到统一核心
#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/erp-plugin/auto-register-to-core",
    tag = "ErpPlugin",
    operation_id = "auto_register_to_core",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url =
        env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8010".to_string());

    let info = PluginInfo {
        code: "erp".to_string(),
        name: "企业资源计划".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "ERP 企业资源计划系统".to_string(),
        permissions: vec![],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "erp-finance", "label": "财务管理", "path": "/erp/finance", "icon": "DollarSign", "order": 10, "group": "business"},
            {"code": "erp-assets", "label": "资产管理", "path": "/erp/assets", "icon": "Package", "order": 20, "group": "business"},
            {"code": "erp-sales", "label": "销售管理", "path": "/erp/sales", "icon": "ShoppingCart", "order": 30, "group": "business"}
        ])),
        category: Some("erp".to_string()),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/erp/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[ERP Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[ERP Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[ERP Plugin] Failed to connect to core at {}: {}",
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
            code: "erp".to_string(),
            name: "ERP 插件".to_string(),
            version: "1.0.0".to_string(),
            description: "企业资源规划插件".to_string(),
            permissions: vec![],
            runtime_url: "http://localhost:8010".to_string(),
            dependencies: vec![],
            navigation_config: None,
            category: Some("business".to_string()),
        };
        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(json["code"], "erp");
        assert_eq!(json["name"], "ERP 插件");
        assert_eq!(json["version"], "1.0.0");
        assert_eq!(json["description"], "企业资源规划插件");
        assert_eq!(json["runtime_url"], "http://localhost:8010");
        assert_eq!(json["category"], "business");
    }

    #[test]
    fn test_plugin_info_with_permissions() {
        let perm = PermissionDef {
            code: "erp:read".to_string(),
            name: "读取 ERP 数据".to_string(),
            resource_type: "erp".to_string(),
            action: "read".to_string(),
        };
        let info = PluginInfo {
            code: "erp".to_string(),
            name: "ERP 插件".to_string(),
            version: "1.0.0".to_string(),
            description: "企业资源规划插件".to_string(),
            permissions: vec![perm],
            runtime_url: "http://localhost:8010".to_string(),
            dependencies: vec!["core".to_string()],
            navigation_config: Some(serde_json::json!({"menu": "ERP"})),
            category: None,
        };
        let json = serde_json::to_value(&info).unwrap();
        assert_eq!(json["permissions"][0]["code"], "erp:read");
        assert_eq!(json["permissions"][0]["name"], "读取 ERP 数据");
        assert_eq!(json["dependencies"][0], "core");
        assert_eq!(json["navigation_config"]["menu"], "ERP");
    }

    #[test]
    fn test_permission_def_serialization() {
        let perm = PermissionDef {
            code: "erp:write".to_string(),
            name: "写入 ERP 数据".to_string(),
            resource_type: "erp".to_string(),
            action: "write".to_string(),
        };
        let json = serde_json::to_value(&perm).unwrap();
        assert_eq!(json["code"], "erp:write");
        assert_eq!(json["name"], "写入 ERP 数据");
        assert_eq!(json["resource_type"], "erp");
        assert_eq!(json["action"], "write");
    }

    #[test]
    fn test_permission_def_deserialize() {
        let json = r#"{
            "code": "erp:delete",
            "name": "删除 ERP 数据",
            "resource_type": "erp",
            "action": "delete"
        }"#;
        let perm: PermissionDef = serde_json::from_str(json).unwrap();
        assert_eq!(perm.code, "erp:delete");
        assert_eq!(perm.name, "删除 ERP 数据");
        assert_eq!(perm.action, "delete");
    }

    #[test]
    fn test_plugin_heartbeat_serialization() {
        let heartbeat = PluginHeartbeat {
            status: "running".to_string(),
            version: Some("1.0.0".to_string()),
        };
        let json = serde_json::to_value(&heartbeat).unwrap();
        assert_eq!(json["status"], "running");
        assert_eq!(json["version"], "1.0.0");
    }

    #[test]
    fn test_plugin_heartbeat_no_version() {
        let heartbeat = PluginHeartbeat {
            status: "starting".to_string(),
            version: None,
        };
        let json = serde_json::to_value(&heartbeat).unwrap();
        assert_eq!(json["status"], "starting");
        assert!(json["version"].is_null());
    }

    #[test]
    fn test_plugin_heartbeat_deserialize() {
        let json = r#"{"status": "running", "version": "2.0.0"}"#;
        let heartbeat: PluginHeartbeat = serde_json::from_str(json).unwrap();
        assert_eq!(heartbeat.status, "running");
        assert_eq!(heartbeat.version.as_deref(), Some("2.0.0"));
    }
}
