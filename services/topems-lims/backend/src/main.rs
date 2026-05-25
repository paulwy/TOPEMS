use axum::{routing::get, Router};
use std::net::SocketAddr;
use dotenv::dotenv;
use sqlx::postgres::PgPoolOptions;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use crate::api::create_routes;

mod models;
mod db;
mod api;

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_lims=debug,tower_http=debug,axum::rejection=trace".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-LIMS 实验室信息管理系统启动中...");

    // Load environment variables
    dotenv().ok();

    // Database connection
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or("postgres://topems:topems_secret@localhost:5432/topems".to_string());
    
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to connect to database");
    
    tracing::info!("✅ 数据库连接成功");

    // Build app
    let app = Router::new()
        .route("/", get(|| async { "TOPEMS-LIMS 实验室信息管理系统 API\n\n查看健康状态: /health" }))
        .route("/health", get(health))
        .merge(create_routes(pool));

    let _host = std::env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8006".to_string())
        .parse()
        .unwrap_or(8006);
    
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    
    tracing::info!("✅ TOPEMS-LIMS 服务运行在 http://{}", addr);
    
    axum::serve(
        tokio::net::TcpListener::bind(addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

async fn health() -> &'static str {
    "OK"
}
