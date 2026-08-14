// AI Service Plugin Interface
// AI 插件接口实现

use crate::shared::AppState;
use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
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
    pub runtime_url: String,
    pub permissions: Vec<Permission>,
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
    pub vector_service: bool,
}

// Plugin info endpoint
#[utoipa::path(
    get,
    path = "/api/plugins/info",
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8013".to_string());

    let plugin_info = PluginInfo {
        code: "ai".to_string(),
        name: "AI 智能服务".to_string(),
        version: "1.0.0".to_string(),
        description: "AI 智能服务 - 向量数据库、文档分析、QA问答、智能生成".to_string(),
        author: "TOPEMS".to_string(),
        category: "other".to_string(),
        plugin_type: "ai".to_string(),
        runtime_url,
        permissions: vec![
            Permission {
                code: "ai:search".to_string(),
                name: "AI 搜索".to_string(),
                description: "使用向量搜索功能".to_string(),
            },
            Permission {
                code: "ai:chat".to_string(),
                name: "AI 对话".to_string(),
                description: "使用智能对话功能".to_string(),
            },
            Permission {
                code: "ai:generate".to_string(),
                name: "AI 生成".to_string(),
                description: "使用内容生成功能".to_string(),
            },
            Permission {
                code: "ai:document:read".to_string(),
                name: "查看文档".to_string(),
                description: "查看已上传的文档".to_string(),
            },
            Permission {
                code: "ai:document:upload".to_string(),
                name: "上传文档".to_string(),
                description: "上传文档进行智能分析".to_string(),
            },
            Permission {
                code: "ai:document:delete".to_string(),
                name: "删除文档".to_string(),
                description: "删除已上传的文档".to_string(),
            },
            Permission {
                code: "ai:vector:read".to_string(),
                name: "查看向量".to_string(),
                description: "查看向量存储".to_string(),
            },
            Permission {
                code: "ai:vector:write".to_string(),
                name: "管理向量".to_string(),
                description: "存储和管理向量".to_string(),
            },
            Permission {
                code: "ai:qa:ask".to_string(),
                name: "QA 问答".to_string(),
                description: "使用问答功能".to_string(),
            },
            Permission {
                code: "ai:analysis:sentiment".to_string(),
                name: "情感分析".to_string(),
                description: "使用情感分析功能".to_string(),
            },
            Permission {
                code: "ai:analysis:classify".to_string(),
                name: "文本分类".to_string(),
                description: "使用文本分类功能".to_string(),
            },
            Permission {
                code: "ai:connector:manage".to_string(),
                name: "管理连接器".to_string(),
                description: "管理数据连接器".to_string(),
            },
        ],
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "ai-search", "label": "AI 搜索", "path": "/ai/search", "icon": "Search", "order": 10, "group": "business"},
            {"code": "ai-chat", "label": "AI 对话", "path": "/ai/chat", "icon": "MessageSquare", "order": 20, "group": "business"},
            {"code": "ai-documents", "label": "文档管理", "path": "/ai/documents", "icon": "FileText", "order": 30, "group": "business"}
        ])),
    };

    Json(ApiResponse::success(plugin_info, "AI plugin info"))
}

// Plugin health check endpoint
#[utoipa::path(
    get,
    path = "/api/plugins/health",
    tag = "ai",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn plugin_health_check(State(state): State<AppState>) -> Json<ApiResponse<PluginHealth>> {
    let pool = state.document_service.pool().await;
    let db_status = match sqlx::query("SELECT 1").fetch_one(&pool).await {
        Ok(_) => true,
        Err(_) => false,
    };

    let health = PluginHealth {
        status: if db_status {
            "healthy".to_string()
        } else {
            "degraded".to_string()
        },
        database: db_status,
        vector_service: true, // Vector service is in-memory, always healthy if db is ok
    };

    Json(ApiResponse::success(health, "AI plugin health check"))
}

// Create plugin routes
#[allow(dead_code)]
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}

/// 启动时自动注册到统一核心
pub async fn auto_register_to_core(core_url: Option<&str>) {
    let core_url = core_url.unwrap_or("http://localhost:8000");
    let runtime_url =
        std::env::var("RUNTIME_URL").unwrap_or_else(|_| "http://localhost:8013".to_string());

    let info = PluginInfo {
        code: "ai".to_string(),
        name: "AI 智能服务".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        description: "AI 智能服务".to_string(),
        author: "TOPEMS".to_string(),
        category: "other".to_string(),
        plugin_type: "ai".to_string(),
        runtime_url,
        permissions: vec![],
        dependencies: vec![],
        navigation_config: Some(serde_json::json!([
            {"code": "ai-search", "label": "AI 搜索", "path": "/ai/search", "icon": "Search", "order": 10, "group": "business"},
            {"code": "ai-chat", "label": "AI 对话", "path": "/ai/chat", "icon": "MessageSquare", "order": 20, "group": "business"},
            {"code": "ai-documents", "label": "文档管理", "path": "/ai/documents", "icon": "FileText", "order": 30, "group": "business"}
        ])),
    };

    let client = reqwest::Client::new();
    let url = format!("{}/api/core/plugin/dev/plugins/ai/register", core_url);

    let token = std::env::var("PLUGIN_REGISTRATION_TOKEN").unwrap_or_default();
    let mut request = client.post(&url).json(&info);
    if !token.is_empty() {
        request = request.header("X-Plugin-Token", &token);
    }
    match request.send().await {
        Ok(response) => {
            if response.status().is_success() {
                tracing::info!(
                    "[AI Plugin] Successfully registered to core at {}",
                    core_url
                );
            } else {
                tracing::warn!(
                    "[AI Plugin] Failed to register to core: {}",
                    response.status()
                );
            }
        }
        Err(e) => {
            tracing::warn!(
                "[AI Plugin] Failed to connect to core at {}: {}",
                core_url,
                e
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_permission() -> Permission {
        Permission {
            code: "ai:read".into(),
            name: "读取".into(),
            description: "读取权限".into(),
        }
    }

    // ── Permission serde ──

    #[test]
    fn test_permission_serde_roundtrip() {
        let p = sample_permission();
        let json = serde_json::to_string(&p).unwrap();
        let back: Permission = serde_json::from_str(&json).unwrap();
        assert_eq!(back.code, "ai:read");
        assert_eq!(back.name, "读取");
    }

    #[test]
    fn test_permission_clone_eq() {
        let p1 = sample_permission();
        let p2 = p1.clone();
        assert_eq!(p1.code, p2.code);
    }

    #[test]
    fn test_permission_debug_format() {
        let p = sample_permission();
        let s = format!("{:?}", p);
        assert!(s.contains("ai:read"));
    }

    // ── PluginHealth ──

    #[test]
    fn test_plugin_health_serde_roundtrip() {
        let h = PluginHealth {
            status: "healthy".into(),
            database: true,
            vector_service: false,
        };
        let json = serde_json::to_string(&h).unwrap();
        let back: PluginHealth = serde_json::from_str(&json).unwrap();
        assert_eq!(back.status, "healthy");
        assert!(back.database);
        assert!(!back.vector_service);
    }

    #[test]
    fn test_plugin_health_clone() {
        let h1 = PluginHealth {
            status: "degraded".into(),
            database: false,
            vector_service: false,
        };
        let h2 = h1.clone();
        assert_eq!(h1.status, h2.status);
    }

    // ── PluginInfo serde ──

    #[test]
    fn test_plugin_info_serde_roundtrip() {
        let info = PluginInfo {
            code: "ai".into(),
            name: "AI".into(),
            version: "1.0.0".into(),
            description: "desc".into(),
            author: "TOPEMS".into(),
            category: "other".into(),
            plugin_type: "ai".into(),
            runtime_url: "http://localhost:8013".into(),
            permissions: vec![sample_permission()],
            dependencies: vec!["core".into()],
            navigation_config: Some(serde_json::json!([{"code": "ai-search"}])),
        };
        let json = serde_json::to_string(&info).unwrap();
        let back: PluginInfo = serde_json::from_str(&json).unwrap();
        assert_eq!(back.code, "ai");
        assert_eq!(back.permissions.len(), 1);
        assert_eq!(back.dependencies, vec!["core".to_string()]);
        assert!(back.navigation_config.is_some());
    }

    #[test]
    fn test_plugin_info_default_empty_deps() {
        // 默认 dependencies 为 vec![] （由 #[serde(default)] 处理）
        let json = r#"{
            "code":"x","name":"x","version":"0","description":"",
            "author":"","category":"","plugin_type":"","runtime_url":"",
            "permissions":[]
        }"#;
        let info: PluginInfo = serde_json::from_str(json).unwrap();
        assert!(info.dependencies.is_empty());
        assert!(info.navigation_config.is_none());
    }

    #[test]
    fn test_plugin_info_clone() {
        let info = PluginInfo {
            code: "ai".into(),
            name: "AI".into(),
            version: "1".into(),
            description: String::new(),
            author: String::new(),
            category: String::new(),
            plugin_type: String::new(),
            runtime_url: String::new(),
            permissions: vec![],
            dependencies: vec![],
            navigation_config: None,
        };
        let cloned = info.clone();
        assert_eq!(cloned.code, info.code);
    }

    // ── get_plugin_info handler ──

    #[tokio::test]
    async fn test_get_plugin_info_returns_response() {
        // 直接调用 handler（不依赖 State）
        let resp = get_plugin_info().await;
        let body = resp.0.data.expect("plugin info should be present");
        assert_eq!(body.code, "ai");
        assert!(!body.permissions.is_empty());
    }

    // ── create_routes ──

    #[test]
    fn test_create_routes_returns_router() {
        let _router = create_routes();
    }
}
