use axum::{
    extract::{FromRef, State},
    routing::{get, post},
    Router,
};
use anyhow::Result;
use chrono::Utc;
use sqlx::PgPool;
use std::env;

use topems_shared::{
    ApiResponse, AuthState, auth_middleware, create_cors_layer, init_logging,
    ServiceHealth, SimpleHealthConfig, simple_health_check, create_api_info_router
};

mod api;
mod models;
mod services;

use api::*;

#[derive(Clone)]
struct AppState {
    pool: PgPool,
    auth_state: AuthState,
    health_config: SimpleHealthConfig,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl FromRef<AppState> for PgPool {
    fn from_ref(state: &AppState) -> Self {
        state.pool.clone()
    }
}

async fn health_check(State(app_state): State<AppState>) -> ServiceHealth {
    simple_health_check(&app_state.health_config).await
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    init_logging("topems-report");

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await?;

    tracing::info!("🔗 数据库连接成功");

    init_db(&pool).await?;

    let auth_state = AuthState::from_env();
    
    let health_config = SimpleHealthConfig::new("topems-report")
        .with_db(pool.clone());
    
    let app_state = AppState {
        pool: pool.clone(),
        auth_state: auth_state.clone(),
        health_config,
    };

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/report-types", get(list_report_types));

    let protected_routes = Router::new()
        .route("/api/v1/reports", get(list_reports).post(create_report))
        .route("/api/v1/reports/{id}", get(get_report).delete(delete_report))
        .route("/api/v1/reports/{id}/export", post(export_report))
        .route("/api/v1/templates", get(list_templates).post(create_template))
        .route("/api/v1/templates/{id}", get(get_template).delete(delete_template))
        .route("/api/v1/reports-center/stats", get(get_reports_center_stats))
        .route("/api/v1/reports-center/export/{report_type}", post(export_stats_report))
        .layer(axum::middleware::from_fn_with_state(
            auth_state,
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("report-service"))
        .with_state(app_state)
        .layer(cors);

    let port = env::var("PORT").unwrap_or_else(|_| "8053".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-Report 报表中心服务启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn init_db(_pool: &PgPool) -> Result<()> {
    Ok(())
}