use axum::extract::{Extension, State};
use serde::{Deserialize, Serialize};
use topems_shared_auth::middleware::tenant::RlsTxnCell;

use crate::modules::ApiState;
use topems_shared_core::{response::ApiResponse, TopemsError};

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
pub async fn get_plugin_info() -> ApiResponse<PluginInfo> {
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8029".to_string());

    let info = PluginInfo {
        code: "crm".to_string(),
        name: "客户关系管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description:
            "CRM 客户关系管理系统，包含客户管理、联系人管理、销售机会管理、销售预测、计费管理等模块"
                .to_string(),
        runtime_url,
        permissions: vec![
            PermissionDef {
                code: "crm:customer:read".to_string(),
                name: "查看客户".to_string(),
                resource_type: "customer".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "crm:customer:write".to_string(),
                name: "管理客户".to_string(),
                resource_type: "customer".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "crm:contact:read".to_string(),
                name: "查看联系人".to_string(),
                resource_type: "contact".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "crm:contact:write".to_string(),
                name: "管理联系人".to_string(),
                resource_type: "contact".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "crm:opportunity:read".to_string(),
                name: "查看销售机会".to_string(),
                resource_type: "opportunity".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "crm:opportunity:write".to_string(),
                name: "管理销售机会".to_string(),
                resource_type: "opportunity".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "crm:sales_forecast:read".to_string(),
                name: "查看销售预测".to_string(),
                resource_type: "sales_forecast".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "crm:sales_forecast:write".to_string(),
                name: "管理销售预测".to_string(),
                resource_type: "sales_forecast".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "crm:billing:read".to_string(),
                name: "查看计费".to_string(),
                resource_type: "billing".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "crm:billing:write".to_string(),
                name: "管理计费".to_string(),
                resource_type: "billing".to_string(),
                action: "write".to_string(),
            },
        ],
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "crm-customers", "label": "客户管理", "path": "/crm/customers", "icon": "Users", "order": 10, "group": "business"},
            {"code": "crm-leads", "label": "线索管理", "path": "/crm/leads", "icon": "Target", "order": 20, "group": "business"},
            {"code": "crm-opportunities", "label": "商机管理", "path": "/crm/opportunities", "icon": "TrendingUp", "order": 30, "group": "business"},
            {"code": "crm-contacts", "label": "联系人", "path": "/crm/contacts", "icon": "User", "order": 40, "group": "business"}
        ])),
        category: Some("crm".to_string()),
    };
    ApiResponse::success(info, "Plugin info")
}

/// 插件健康检查
pub async fn plugin_health_check(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<()> {
    // 检查数据库连接
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match sqlx::query("SELECT 1").fetch_one(&mut **txn).await {
        Ok(_) => ApiResponse::success((), "Healthy"),
        Err(e) => ApiResponse::from({
            tracing::warn!("Database error: {}", e);
            TopemsError::ServiceUnavailable("Database error".to_string())
        }),
    }
}

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(_core_url: Option<&str>) {
    let core_url = std::env::var("PLUGIN_REGISTRY_URL")
        .unwrap_or_else(|_| "http://localhost:8096".to_string());
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8029".to_string());

    let info = PluginInfo {
        code: "crm".to_string(),
        name: "客户关系管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "CRM 客户关系管理系统".to_string(),
        runtime_url,
        permissions: vec![],
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "crm-customers", "label": "客户管理", "path": "/crm/customers", "icon": "Users", "order": 10, "group": "business"},
            {"code": "crm-leads", "label": "线索管理", "path": "/crm/leads", "icon": "Target", "order": 20, "group": "business"},
            {"code": "crm-opportunities", "label": "商机管理", "path": "/crm/opportunities", "icon": "TrendingUp", "order": 30, "group": "business"},
            {"code": "crm-contacts", "label": "联系人", "path": "/crm/contacts", "icon": "User", "order": 40, "group": "business"}
        ])),
        category: Some("crm".to_string()),
    };

    let client = topems_shared_core::shared_http_client();
    let url = format!("{}/dev/runtime/crm/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[CRM Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[CRM Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[CRM Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn permission_def_full() {
        let pd = PermissionDef {
            code: "crm:customer:read".to_string(),
            name: "View Customer".to_string(),
            resource_type: "customer".to_string(),
            action: "read".to_string(),
        };
        let cloned = pd.clone();
        assert_eq!(cloned.code, pd.code);
        roundtrip(&pd);
    }

    #[test]
    fn plugin_info_minimal() {
        let info = PluginInfo {
            code: "crm".to_string(),
            name: "CRM".to_string(),
            version: "0.1.0".to_string(),
            description: "desc".to_string(),
            runtime_url: "http://localhost:8029".to_string(),
            permissions: vec![],
            dependencies: vec![],
            navigation_config: None,
            category: None,
        };
        let cloned = info.clone();
        assert_eq!(cloned.code, "crm");
        assert!(cloned.permissions.is_empty());
        assert!(cloned.navigation_config.is_none());
        roundtrip(&info);
    }

    #[test]
    fn plugin_info_full() {
        let info = PluginInfo {
            code: "crm".to_string(),
            name: "客户关系管理".to_string(),
            version: "1.0.0".to_string(),
            description: "Full CRM".to_string(),
            runtime_url: "http://example.com".to_string(),
            permissions: vec![
                PermissionDef {
                    code: "crm:customer:read".to_string(),
                    name: "查看客户".to_string(),
                    resource_type: "customer".to_string(),
                    action: "read".to_string(),
                },
                PermissionDef {
                    code: "crm:customer:write".to_string(),
                    name: "管理客户".to_string(),
                    resource_type: "customer".to_string(),
                    action: "write".to_string(),
                },
            ],
            dependencies: vec!["core".to_string(), "auth".to_string()],
            navigation_config: Some(serde_json::json!([
                {"code": "crm-customers", "label": "客户管理", "path": "/crm/customers"}
            ])),
            category: Some("business".to_string()),
        };
        assert_eq!(info.permissions.len(), 2);
        assert_eq!(info.dependencies.len(), 2);
        assert!(info.navigation_config.is_some());
        assert_eq!(info.category.as_deref(), Some("business"));
        roundtrip(&info);
    }
}


/// CRM 模块健康探测（单体 /api/crm/health）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:read"])),
    path = "/health",
    responses((status = 200, description = "OK", body = serde_json::Value)),
    tag = "CRM/crm_plugin"
)]
pub async fn crm_health() -> ApiResponse<serde_json::Value> {
    ApiResponse::success(
        serde_json::json!({ "module": "crm", "status": "ok" }),
        "module health ok",
    )
}
