// AI Service Plugin Interface
// AI 插件接口实现

use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginInfo {
    pub code: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
    pub category: String,
    pub plugin_type: String,
    pub permissions: Vec<Permission>,
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

pub struct PluginState {
    pub db: PgPool,
}

// Plugin info endpoint
pub async fn get_plugin_info() -> Json<ApiResponse<PluginInfo>> {
    let plugin_info = PluginInfo {
        code: "ai".to_string(),
        name: "AI 智能服务".to_string(),
        version: "1.0.0".to_string(),
        description: "AI 智能服务 - 向量数据库、文档分析、QA问答、智能生成".to_string(),
        author: "TOPEMS".to_string(),
        category: "AI".to_string(),
        plugin_type: "ai".to_string(),
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
    };

    Json(ApiResponse::success(plugin_info, "AI plugin info"))
}

// Plugin health check endpoint
pub async fn plugin_health_check(State(state): State<PluginState>) -> Json<ApiResponse<PluginHealth>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.db).await {
        Ok(_) => true,
        Err(_) => false,
    };

    let health = PluginHealth {
        status: if db_status { "healthy".to_string() } else { "degraded".to_string() },
        database: db_status,
        vector_service: true, // Vector service is in-memory, always healthy if db is ok
    };

    let status_code = if db_status { 200 } else { 503 };
    Json(ApiResponse::with_status(status_code, health, "AI plugin health check"))
}

// Create plugin routes
pub fn create_routes() -> Router<PluginState> {
    Router::new()
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
}
