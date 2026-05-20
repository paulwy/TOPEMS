use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    // 初始化日志
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_doc=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-DOC 文档管理服务启动中...");

    // 加载环境变量
    dotenv::dotenv().ok();

    // 构建应用
    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/v1/files", get(list_files))
        .route("/api/v1/files", post(upload_file));

    let host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8001".to_string())
        .parse()
        .unwrap_or(8001);
    
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    
    tracing::info!("✅ TOPEMS-DOC 服务运行在 http://{}", addr);
    
    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

// 响应结构
#[derive(Debug, Serialize, Deserialize)]
struct ApiResponse<T> {
    success: bool,
    data: Option<T>,
    message: String,
}

// 文件元数据
#[derive(Debug, Serialize, Deserialize, Clone)]
struct FileMetadata {
    id: String,
    name: String,
    folder_id: Option<String>,
    size: i64,
    content_type: String,
    created_at: String,
    updated_at: String,
    created_by: String,
}

// 首页
async fn home() -> &'static str {
    "TOPEMS-DOC 文档管理服务 API\n\n查看 API: /health\n"
}

// 健康检查
async fn health() -> Json<ApiResponse<String>> {
    Json(ApiResponse {
        success: true,
        data: Some("TOPEMS-DOC is running!".to_string()),
        message: "OK".to_string(),
    })
}

// 列出文件
async fn list_files() -> Json<ApiResponse<Vec<FileMetadata>>> {
    let files = vec![
        FileMetadata {
            id: "1".to_string(),
            name: "README.md".to_string(),
            folder_id: None,
            size: 1024,
            content_type: "text/markdown".to_string(),
            created_at: "2026-05-20T10:00:00Z".to_string(),
            updated_at: "2026-05-20T10:00:00Z".to_string(),
            created_by: "admin".to_string(),
        },
    ];

    Json(ApiResponse {
        success: true,
        data: Some(files),
        message: "Success".to_string(),
    })
}

// 上传文件
async fn upload_file() -> Json<ApiResponse<String>> {
    Json(ApiResponse {
        success: true,
        data: Some("File uploaded (demo)".to_string()),
        message: "File uploaded successfully!".to_string(),
    })
}
