mod api;
mod backends;
mod models;
mod services;

use anyhow::Result;
use axum::{
    routing::{delete, get, post, put},
    Router,
};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

use crate::api::handlers::{
    delete_file, download_file, get_file, get_file_permissions, get_shared_files, get_stats,
    health_check, list_files, share_file, upload_file, AppState,
};
use crate::backends::local::LocalStorage;

#[tokio::main]
async fn main() -> Result<()> {
    // 初始化日志
    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    // 数据库连接
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    info!("Database connection established");

    // 初始化存储后端
    let storage_base_path = std::env::var("STORAGE_LOCAL_PATH")
        .unwrap_or_else(|_| "./storage/files".to_string());
    let storage = Arc::new(LocalStorage::new(&storage_base_path)?);

    info!("Storage backend initialized at: {}", storage_base_path);

    // 创建应用状态
    let state = AppState {
        db: pool,
        storage: storage.clone(),
    };

    // 构建路由
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/files/upload", post(upload_file))
        .route("/api/v1/files", get(list_files))
        .route("/api/v1/files/stats", get(get_stats))
        .route("/api/v1/files/shared", get(get_shared_files))
        .route("/api/v1/files/:id", get(get_file))
        .route("/api/v1/files/:id", delete(delete_file))
        .route("/api/v1/files/:id/download", get(download_file))
        .route("/api/v1/files/:id/share", post(share_file))
        .route("/api/v1/files/:id/permissions", get(get_file_permissions))
        .with_state(state);

    // CORS 配置
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::any())
        .allow_methods(tower_http::cors::Any)
        .allow_headers(tower_http::cors::Any);

    // 启动服务器
    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8055".to_string())
        .parse::<u16>()?;

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("File service listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app.layer(cors)).await?;

    Ok(())
}
