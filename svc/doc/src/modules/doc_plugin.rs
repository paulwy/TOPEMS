#![allow(dead_code)]

use axum::{routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use std::env;

use topems_shared::ApiResponse;

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

pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url =
        env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8012".to_string());

    let info = PluginInfo {
        code: "doc".to_string(),
        name: "文档管理服务".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "文档管理服务 - 文档存储、模板管理、文件夹管理、文档发布".to_string(),
        permissions: vec![
            PermissionDef {
                code: "doc:read".to_string(),
                name: "文档查看".to_string(),
                resource_type: "document".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "doc:write".to_string(),
                name: "文档编辑".to_string(),
                resource_type: "document".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "doc:delete".to_string(),
                name: "文档删除".to_string(),
                resource_type: "document".to_string(),
                action: "delete".to_string(),
            },
            PermissionDef {
                code: "doc:publish".to_string(),
                name: "文档发布".to_string(),
                resource_type: "document".to_string(),
                action: "publish".to_string(),
            },
            PermissionDef {
                code: "doc:template:read".to_string(),
                name: "模板查看".to_string(),
                resource_type: "template".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "doc:template:write".to_string(),
                name: "模板管理".to_string(),
                resource_type: "template".to_string(),
                action: "write".to_string(),
            },
            PermissionDef {
                code: "doc:folder:read".to_string(),
                name: "文件夹查看".to_string(),
                resource_type: "folder".to_string(),
                action: "read".to_string(),
            },
            PermissionDef {
                code: "doc:folder:write".to_string(),
                name: "文件夹管理".to_string(),
                resource_type: "folder".to_string(),
                action: "write".to_string(),
            },
        ],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "doc-documents", "label": "文档库", "path": "/doc/documents", "icon": "FileText", "order": 10, "group": "business"},
            {"code": "doc-wiki", "label": "知识库", "path": "/doc/wiki", "icon": "BookOpen", "order": 20, "group": "business"},
            {"code": "doc-templates", "label": "模板管理", "path": "/doc/templates", "icon": "Layout", "order": 30, "group": "business"}
        ])),
        category: Some("other".to_string()),
    };
    Json(ApiResponse::success(info, "Plugin info"))
}

pub async fn plugin_health_check() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success(
        "healthy".to_string(),
        "Plugin is healthy",
    ))
}

pub fn create_routes() -> Router {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}

pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url =
        env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8012".to_string());

    let info = PluginInfo {
        code: "doc".to_string(),
        name: "文档管理服务".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "文档管理服务".to_string(),
        permissions: vec![],
        runtime_url,
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "doc-documents", "label": "文档库", "path": "/doc/documents", "icon": "FileText", "order": 10, "group": "business"},
            {"code": "doc-wiki", "label": "知识库", "path": "/doc/wiki", "icon": "BookOpen", "order": 20, "group": "business"},
            {"code": "doc-templates", "label": "模板管理", "path": "/doc/templates", "icon": "Layout", "order": 30, "group": "business"}
        ])),
        category: Some("other".to_string()),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/doc/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[Doc Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[Doc Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[Doc Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}
