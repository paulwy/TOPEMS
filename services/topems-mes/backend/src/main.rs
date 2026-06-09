mod api;
mod models;
mod services;

use anyhow::Result;
use axum::{
    routing::get,
    Json, Router,
};
use sqlx::postgres::PgPoolOptions;
use std::env;

use topems_shared::{
    ApiResponse, AuthState, auth_middleware, create_cors_layer, init_logging,
    ServiceHealth, build_health_response, create_api_info_router
};

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    init_logging("topems-mes");

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://xingzhai@localhost:5432/topems".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("🔗 数据库连接成功");

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let auth_state = AuthState::from_env();

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check));

    let protected_routes = Router::new()
        .merge(api::create_routes(pool.clone(), auth_state.clone()).await?)
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-mes"))
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8030".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-MES 制造执行系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-mes", true)
}

async fn init_db(_pool: &sqlx::PgPool) -> Result<()> {
    Ok(())
}