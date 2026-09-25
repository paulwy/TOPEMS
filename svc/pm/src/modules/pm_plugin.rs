use axum::{routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use std::env;

use topems_shared_core::response::ApiResponse;

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
#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/api/plugins/info",
    responses((status = 200, description = "get_plugin_info OK")),
    tag = "pm_plugin"
)]

pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url = get_runtime_url();
    let plugin_info = PluginInfo {
        code: "pm".to_string(),
        name: "项目管理".to_string(),
        version: "1.0.0".to_string(),
        description:
            "PM 项目管理系统，包含项目、任务、甘特图、合同、预算、风险、质量、验收、结算等模块"
                .to_string(),
        deployment: DeploymentInfo {
            port: 8023,
            base_path: "/api/pm".to_string(),
        },
        permissions: vec![
            PermissionDef {
                code: "project".to_string(),
            },
            PermissionDef {
                code: "milestone".to_string(),
            },
            PermissionDef {
                code: "phase".to_string(),
            },
            PermissionDef {
                code: "member".to_string(),
            },
            PermissionDef {
                code: "resource".to_string(),
            },
            PermissionDef {
                code: "expense".to_string(),
            },
            PermissionDef {
                code: "benefit".to_string(),
            },
            PermissionDef {
                code: "approval".to_string(),
            },
            PermissionDef {
                code: "contract".to_string(),
            },
            PermissionDef {
                code: "budget".to_string(),
            },
            PermissionDef {
                code: "risk".to_string(),
            },
            PermissionDef {
                code: "quality".to_string(),
            },
            PermissionDef {
                code: "acceptance".to_string(),
            },
            PermissionDef {
                code: "settlement".to_string(),
            },
            PermissionDef {
                code: "document".to_string(),
            },
            PermissionDef {
                code: "report".to_string(),
            },
        ],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "pm-projects", "label": "项目列表", "path": "/pm/projects", "icon": "FolderKanban", "order": 10, "group": "business"},
            {"code": "pm-tasks", "label": "任务管理", "path": "/pm/tasks", "icon": "CheckSquare", "order": 20, "group": "business"},
            {"code": "pm-timelines", "label": "项目进度", "path": "/pm/timelines", "icon": "Calendar", "order": 30, "group": "business"}
        ])),
        category: Some("project".to_string()),
    };

    Json(ApiResponse::success(plugin_info, "获取插件信息成功"))
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/api/plugins/health",
    responses((status = 200, description = "plugin_health_check OK")),
    tag = "pm_plugin"
)]

pub async fn plugin_health_check() -> Json<topems_shared_core::health::ServiceHealth> {
    Json(topems_shared_core::health::build_health_response(
        "topems-pm",
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
    std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8023".to_string())
}

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url = get_runtime_url();

    let info = PluginInfo {
        code: "pm".to_string(),
        name: "项目管理".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "PM 项目管理系统".to_string(),
        deployment: DeploymentInfo {
            port: 8023,
            base_path: "/api/pm".to_string(),
        },
        permissions: vec![],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "pm-projects", "label": "项目列表", "path": "/pm/projects", "icon": "FolderKanban", "order": 10, "group": "business"},
            {"code": "pm-tasks", "label": "任务管理", "path": "/pm/tasks", "icon": "CheckSquare", "order": 20, "group": "business"},
            {"code": "pm-timelines", "label": "项目进度", "path": "/pm/timelines", "icon": "Calendar", "order": 30, "group": "business"}
        ])),
        category: Some("project".to_string()),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/pm/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[PM Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[PM Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[PM Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_plugin_info() -> PluginInfo {
        PluginInfo {
            code: "pm".to_string(),
            name: "项目管理".to_string(),
            version: "1.0.0".to_string(),
            description: "test".to_string(),
            deployment: DeploymentInfo {
                port: 8023,
                base_path: "/api/pm".to_string(),
            },
            permissions: vec![
                PermissionDef {
                    code: "project".to_string(),
                },
                PermissionDef {
                    code: "milestone".to_string(),
                },
            ],
            runtime_url: "http://localhost:8023".to_string(),
            dependencies: vec!["core".to_string()],
            navigation_config: Some(serde_json::json!([{"code": "a"}])),
            category: Some("project".to_string()),
        }
    }

    #[test]
    fn test_plugin_info_serde_roundtrip() {
        let info = sample_plugin_info();
        let json = serde_json::to_string(&info).unwrap();
        let parsed: PluginInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.code, "pm");
        assert_eq!(parsed.name, "项目管理");
        assert_eq!(parsed.version, "1.0.0");
        assert_eq!(parsed.deployment.port, 8023);
        assert_eq!(parsed.deployment.base_path, "/api/pm");
        assert_eq!(parsed.permissions.len(), 2);
        assert_eq!(parsed.permissions[0].code, "project");
        assert_eq!(parsed.runtime_url, "http://localhost:8023");
        assert_eq!(parsed.dependencies.len(), 1);
        assert!(parsed.navigation_config.is_some());
        assert_eq!(parsed.category, Some("project".to_string()));
    }

    #[test]
    fn test_plugin_info_minimal_defaults() {
        let json = r#"{
            "code": "pm",
            "name": "PM",
            "version": "0.1",
            "description": "d",
            "deployment": {"port": 8080, "base_path": "/x"},
            "permissions": [],
            "runtime_url": "http://x"
        }"#;
        let parsed: PluginInfo = serde_json::from_str(json).unwrap();
        assert!(parsed.dependencies.is_empty());
        assert!(parsed.navigation_config.is_none());
        assert!(parsed.category.is_none());
    }

    #[test]
    fn test_plugin_info_clone() {
        let info = sample_plugin_info();
        let cloned = info.clone();
        assert_eq!(cloned.code, info.code);
        assert_eq!(cloned.permissions.len(), info.permissions.len());
    }

    #[test]
    fn test_deployment_info_serde_roundtrip() {
        let d = DeploymentInfo {
            port: 9000,
            base_path: "/base".to_string(),
        };
        let s = serde_json::to_string(&d).unwrap();
        let parsed: DeploymentInfo = serde_json::from_str(&s).unwrap();
        assert_eq!(parsed.port, 9000);
        assert_eq!(parsed.base_path, "/base");
    }

    #[test]
    fn test_permission_def_serde_roundtrip() {
        let p = PermissionDef {
            code: "read".to_string(),
        };
        let s = serde_json::to_string(&p).unwrap();
        let parsed: PermissionDef = serde_json::from_str(&s).unwrap();
        assert_eq!(parsed.code, "read");
    }

    #[test]
    fn test_permission_def_clone_eq() {
        let p = PermissionDef {
            code: "write".to_string(),
        };
        let c = p.clone();
        assert_eq!(c.code, p.code);
    }

    #[test]
    fn test_create_routes_returns_router() {
        let router = create_routes();
        let _ = router;
    }

    #[test]
    fn test_get_runtime_url_default() {
        let saved = std::env::var("RUNTIME_URL").ok();
        std::env::remove_var("RUNTIME_URL");
        let url = get_runtime_url();
        assert_eq!(url, "http://localhost:8023");
        if let Some(v) = saved {
            std::env::set_var("RUNTIME_URL", v);
        }
    }

    #[test]
    fn test_get_runtime_url_from_env() {
        let saved = std::env::var("RUNTIME_URL").ok();
        std::env::set_var("RUNTIME_URL", "https://example.com:9000");
        let url = get_runtime_url();
        assert_eq!(url, "https://example.com:9000");
        match saved {
            Some(v) => std::env::set_var("RUNTIME_URL", v),
            None => std::env::remove_var("RUNTIME_URL"),
        }
    }
}
