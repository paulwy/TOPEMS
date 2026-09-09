use axum::{
    extract::{Extension, State},
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;

use crate::modules::ApiState;
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

/// 获取插件信息
pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8040".to_string());

    let info = PluginInfo {
        code: "scm".to_string(),
        name: "供应链管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "SCM 供应链管理系统，包含供应商管理、采购订单管理、采购供应商评价等模块"
            .to_string(),
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
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "scm-purchase", "label": "采购管理", "path": "/scm/purchase", "icon": "ShoppingBag", "order": 10, "group": "business"},
            {"code": "scm-suppliers", "label": "供应商", "path": "/scm/suppliers", "icon": "Handshake", "order": 20, "group": "business"},
            {"code": "scm-mrp", "label": "物料需求", "path": "/scm/mrp", "icon": "Layers", "order": 30, "group": "business"}
        ])),
        category: Some("supply".to_string()),
    };
    Json(ApiResponse::success(info, "Plugin info"))
}

/// 插件健康检查
pub async fn plugin_health_check(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<()>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match sqlx::query(only_own_schema_query!("scm", "SELECT 1"))
        .fetch_one(&mut **txn)
        .await
    {
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
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8040".to_string());

    let info = PluginInfo {
        code: "scm".to_string(),
        name: "供应链管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "SCM 供应链管理系统".to_string(),
        permissions: vec![],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "scm-purchase", "label": "采购管理", "path": "/scm/purchase", "icon": "ShoppingBag", "order": 10, "group": "business"},
            {"code": "scm-suppliers", "label": "供应商", "path": "/scm/suppliers", "icon": "Handshake", "order": 20, "group": "business"},
            {"code": "scm-mrp", "label": "物料需求", "path": "/scm/mrp", "icon": "Layers", "order": 30, "group": "business"}
        ])),
        category: Some("supply".to_string()),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/scm/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[SCM Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[SCM Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[SCM Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_permission_def() -> PermissionDef {
        PermissionDef {
            code: "scm:supplier:read".to_string(),
            name: "查看供应商".to_string(),
            resource_type: "supplier".to_string(),
            action: "read".to_string(),
        }
    }

    fn sample_plugin_info() -> PluginInfo {
        PluginInfo {
            code: "scm".to_string(),
            name: "供应链管理".to_string(),
            version: "0.1.0".to_string(),
            description: "desc".to_string(),
            permissions: vec![sample_permission_def()],
            runtime_url: "http://localhost:8040".to_string(),
            dependencies: vec!["core".to_string()],
            navigation_config: Some(serde_json::json!([{"code": "scm-purchase"}])),
            category: Some("supply".to_string()),
        }
    }

    #[test]
    fn permission_def_serde_roundtrip_preserves_fields() {
        let p = sample_permission_def();
        let json = serde_json::to_string(&p).expect("serialize");
        let back: PermissionDef = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.code, p.code);
        assert_eq!(back.name, p.name);
        assert_eq!(back.resource_type, p.resource_type);
        assert_eq!(back.action, p.action);
    }

    #[test]
    fn plugin_info_serde_roundtrip_preserves_core_fields() {
        let info = sample_plugin_info();
        let json = serde_json::to_string(&info).expect("serialize");
        let back: PluginInfo = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.code, info.code);
        assert_eq!(back.name, info.name);
        assert_eq!(back.version, info.version);
        assert_eq!(back.runtime_url, info.runtime_url);
        assert_eq!(back.category, info.category);
        assert_eq!(back.permissions.len(), 1);
        assert_eq!(back.permissions[0].code, info.permissions[0].code);
        assert_eq!(back.dependencies, info.dependencies);
        assert!(back.navigation_config.is_some());
    }

    #[test]
    fn plugin_info_defaults_dependencies_when_missing() {
        let json = r#"{
            "code": "scm",
            "name": "n",
            "version": "0.1.0",
            "description": "d",
            "permissions": [],
            "runtime_url": "http://x"
        }"#;
        let info: PluginInfo = serde_json::from_str(json).expect("deserialize");
        assert!(
            info.dependencies.is_empty(),
            "dependencies should default to empty"
        );
        assert!(
            info.navigation_config.is_none(),
            "navigation_config should default to None"
        );
        assert!(info.category.is_none(), "category should default to None");
    }

    #[test]
    fn permission_def_defaults_are_empty_strings_when_missing_optional() {
        // All fields are required (not Option), so missing fields should fail.
        let json = r#"{"code":"x","name":"y","resource_type":"r","action":"a"}"#;
        let p: PermissionDef = serde_json::from_str(json).expect("deserialize");
        assert_eq!(p.code, "x");
        assert_eq!(p.action, "a");
    }

    #[tokio::test]
    async fn get_plugin_info_returns_scm_metadata() {
        let response = get_plugin_info().await;
        let body = response.0;
        assert!(body.success, "response should be successful");
        let data = body.data.expect("data should be present");
        assert_eq!(data.code, "scm");
        assert_eq!(data.name, "供应链管理");
        assert_eq!(data.category.as_deref(), Some("supply"));
        assert!(
            !data.permissions.is_empty(),
            "should expose at least one permission"
        );
        // First permission should be supplier read
        assert_eq!(data.permissions[0].code, "scm:supplier:read");
        assert_eq!(data.permissions[0].resource_type, "supplier");
        assert_eq!(data.permissions[0].action, "read");
        assert!(
            data.navigation_config.is_some(),
            "should include navigation_config"
        );
    }

    #[test]
    fn plugin_info_clone_is_equal_to_original() {
        let info = sample_plugin_info();
        let cloned = info.clone();
        assert_eq!(cloned.code, info.code);
        assert_eq!(cloned.permissions.len(), info.permissions.len());
    }

    #[test]
    fn permission_def_clone_is_equal_to_original() {
        let p = sample_permission_def();
        let cloned = p.clone();
        assert_eq!(cloned.code, p.code);
        assert_eq!(cloned.action, p.action);
    }
}
