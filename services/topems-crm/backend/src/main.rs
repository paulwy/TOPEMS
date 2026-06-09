use anyhow::Result;
use axum::{
    routing::get, Router,
};
use sqlx::postgres::PgPoolOptions;
use std::env;

use topems_shared::{
    create_cors_layer, auth_middleware, init_logging,
    ServiceHealth, build_health_response, create_api_info_router
};

mod api;
mod models;
mod services;

use api::ApiState;

async fn init_db(_db: &sqlx::PgPool) -> Result<()> {
    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-crm", true)
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    init_logging("topems-crm");

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("🔗 数据库连接成功");

    if let Err(e) = init_db(&pool).await {
        tracing::warn!("数据库初始化警告: {}", e);
    }

    let api_state = ApiState {
        db: pool.clone(),
        auth_state: topems_shared::AuthState::from_env(),
    };

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .with_state(pool.clone());

    let protected_routes = api::create_routes()
        .layer(axum::middleware::from_fn_with_state(
            api_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(api_state.clone());

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-crm"))
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8012".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-CRM 客户关系管理系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}