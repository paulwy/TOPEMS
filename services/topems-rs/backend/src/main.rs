mod api;
mod models;

use anyhow::Result;
use axum::{routing::get, Json, Router};
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use topems_shared::ApiResponse;

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/topems_rs".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("🔗 数据库连接成功");

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
            axum::http::header::ACCEPT,
        ]);

    let app = Router::new()
        .route("/health", get(health_check))
        .merge(api::project::create_routes(pool.clone()).await?)
        .merge(api::formula::create_routes(pool.clone()).await?)
        .merge(api::experiment::create_routes(pool.clone()).await?)
        // .merge(api::patent::create_routes(pool.clone()).await?)
        .merge(api::material::create_routes(pool.clone()).await?)
        .merge(api::doc_integration::create_routes(pool.clone()).await?)
        .merge(api::ai_integration::create_routes(pool.clone()).await?)
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8002".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-RS 科研研发管理系统启动中...");
    tracing::info!("📦 端口: {}", port);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-RS is running", "健康检查"))
}
