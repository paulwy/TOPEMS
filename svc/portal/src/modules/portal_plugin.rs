#![allow(dead_code)]

use axum::{routing::get, Json, Router};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;

use topems_shared::ApiResponse;
use topems_shared_core::health::ServiceHealth;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub deployment: DeploymentInfo,
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
pub struct DeploymentInfo {
    pub port: u16,
    pub base_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionDef {
    pub code: String,
}

pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url = get_runtime_url();
    let plugin_info = PluginInfo {
        code: "portal".to_string(),
        name: "企业门户".to_string(),
        version: "1.0.0".to_string(),
        description: "Portal 企业门户 - 首页、公告、快捷入口".to_string(),
        deployment: DeploymentInfo {
            port: 8063,
            base_path: "/api/portal".to_string(),
        },
        permissions: vec![
            PermissionDef {
                code: "announcement".to_string(),
            },
            PermissionDef {
                code: "shortcut".to_string(),
            },
            PermissionDef {
                code: "widget".to_string(),
            },
        ],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "portal-dashboard", "label": "企业门户", "path": "/portal/dashboard", "icon": "LayoutDashboard", "order": 10, "group": "business"},
            {"code": "portal-announcements", "label": "公告管理", "path": "/portal/announcements", "icon": "Megaphone", "order": 20, "group": "business"}
        ])),
        category: Some("other".to_string()),
    };

    Json(ApiResponse::success(plugin_info, "获取插件信息成功"))
}

pub async fn plugin_health_check() -> Json<ServiceHealth> {
    Json(topems_shared_core::health::build_health_response(
        "topems-portal",
        true,
    ))
}

pub fn create_routes() -> Router {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}

/// 获取运行时 URL
fn get_runtime_url() -> String {
    match std::env::var("RUNTIME_URL") {
        Ok(v) if !v.is_empty() => {
            tracing::info!(
                target: "portal::portal_plugin",
                resolved_url = %v,
                source = "env:RUNTIME_URL",
                "[PortalPlugin] 解析 portal 运行时地址"
            );
            v
        }
        _ => {
            tracing::warn!(
                target: "portal::portal_plugin",
                resolved_url = "http://localhost:8063",
                env_var = "RUNTIME_URL",
                "[PortalPlugin] 环境变量未设置，回退到权威默认端口"
            );
            "http://localhost:8063".to_string()
        }
    }
}

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(core_url: Option<&str>) {
    let (core_url, source) = match core_url {
        Some(v) if !v.is_empty() => (v.to_string(), "caller_param".to_string()),
        _ => match std::env::var("CORE_URL") {
            Ok(v) if !v.is_empty() => (v, "env:CORE_URL".to_string()),
            _ => (
                "http://localhost:8000".to_string(),
                "default_fallback".to_string(),
            ),
        },
    };
    tracing::info!(
        target: "portal::portal_plugin",
        core_url = %core_url,
        source = %source,
        "[PortalPlugin] 解析 unified-core 注册地址"
    );
    let runtime_url = get_runtime_url();

    let info = PluginInfo {
        code: "portal".to_string(),
        name: "企业门户".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "Portal 企业门户系统".to_string(),
        deployment: DeploymentInfo {
            port: 8063,
            base_path: "/api/portal".to_string(),
        },
        permissions: vec![],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "portal-dashboard", "label": "企业门户", "path": "/portal/dashboard", "icon": "LayoutDashboard", "order": 10, "group": "business"},
            {"code": "portal-announcements", "label": "公告管理", "path": "/portal/announcements", "icon": "Megaphone", "order": 20, "group": "business"}
        ])),
        category: Some("other".to_string()),
    };

    let client = Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/portal/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[Portal Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[Portal Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[Portal Plugin] Failed to connect to core at {}: {}",
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
    use serde_json::{from_value, to_value, Value};

    fn roundtrip<T>(s: &T) -> Value
    where
        T: Serialize + for<'de> Deserialize<'de>,
    {
        let v1 = to_value(s).expect("serialize first");
        let s2: T = from_value(v1.clone()).expect("deserialize");
        let v2 = to_value(&s2).expect("serialize second");
        assert_eq!(v1, v2, "roundtrip value mismatch");
        v1
    }

    #[test]
    fn deployment_info_roundtrip() {
        let s = DeploymentInfo {
            port: 8063,
            base_path: "/api/portal".to_string(),
        };
        roundtrip(&s);
    }

    #[test]
    fn permission_def_roundtrip() {
        let s = PermissionDef {
            code: "announcement".to_string(),
        };
        roundtrip(&s);
    }

    #[test]
    fn plugin_info_roundtrip() {
        let s = PluginInfo {
            code: "portal".to_string(),
            name: "企业门户".to_string(),
            version: "1.0.0".to_string(),
            description: "desc".to_string(),
            deployment: DeploymentInfo {
                port: 8063,
                base_path: "/api/portal".to_string(),
            },
            permissions: vec![PermissionDef {
                code: "shortcut".to_string(),
            }],
            runtime_url: "http://localhost:8063".to_string(),
            dependencies: vec!["topems-shared".to_string()],
            navigation_config: Some(serde_json::json!({"key": "value"})),
            category: Some("other".to_string()),
        };
        roundtrip(&s);
    }
}
