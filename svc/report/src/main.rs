//! TOPEMS Report Service
//!
//! Unified service for BI (Business Intelligence) and Report

#![allow(clippy::match_like_matches_macro)]
#![allow(clippy::manual_ok_err)]
#![allow(clippy::redundant_pattern_matching)]
#![allow(clippy::useless_format)]
#![allow(clippy::useless_vec)]
#![allow(clippy::clone_on_copy)]
#![allow(clippy::identity_op)]
#![allow(clippy::needless_borrows_for_generic_args)]
#![allow(clippy::unnecessary_cast)]
#![allow(clippy::redundant_closure)]
#![allow(dead_code)]

mod shared;

pub mod modules;

use std::net::SocketAddr;

use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use sqlx::PgPool;

use topems_shared::{
    auth_middleware, create_cors_layer, get_api_info_handler, init_logging, simple_health_check,
    ApiResponse, AuthState, ServiceHealth, SimpleHealthConfig,
};

pub use shared::*;

// ==================== 应用状态 ====================

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
    pub health_config: SimpleHealthConfig,
}

impl axum::extract::FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

// ==================== 主入口 ====================

#[tokio::main]
async fn main() {
    _ = dotenv::dotenv();

    init_logging("topems-report");

    tracing::info!("🚀 TOPEMS Report Service starting...");

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

    let pool = match sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
    {
        Ok(p) => {
            tracing::info!("Database connection successful");
            p
        }
        Err(e) => {
            tracing::error!("Failed to connect to database: {}", e);
            panic!("Cannot connect to database: {}", e);
        }
    };

    // Initialize database for Report module
    if let Err(e) = modules::report::init_database(&pool).await {
        tracing::warn!("Report module database init warning: {}", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-report").with_db(pool.clone());

    let state = AppState {
        auth_state,
        pool,
        health_config,
    };

    let cors = create_cors_layer();

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    // Public routes (no auth required)
    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api", get(|| get_api_info_handler("report-service")))
        .route("/api/info", get(|| get_api_info_handler("report-service")))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    // Protected routes (auth required)
    let protected_routes = Router::new()
        // ===== Report routes (prefix: /api/report) =====
        // Report (matches frontend /api/report/reports)
        .route("/api/report/reports", get(modules::report::report::list_reports))
        .route("/api/report/reports", post(modules::report::report::create_report))
        .route("/api/report/reports/{id}", get(modules::report::report::get_report))
        .route("/api/report/reports/{id}", put(modules::report::report::update_report))
        .route("/api/report/reports/{id}", delete(modules::report::report::delete_report))
        .route("/api/report/reports/{id}/export", post(modules::report::report::export_report))
        .route("/api/report/reports/{id}/run", post(modules::report::report::run_report))
        // Report Template
        .route("/api/report/templates", get(modules::report::template::list_templates))
        .route("/api/report/templates", post(modules::report::template::create_template))
        .route("/api/report/templates/{id}", get(modules::report::template::get_template))
        .route("/api/report/templates/{id}", put(modules::report::template::update_template))
        // Report Schedule
        .route("/api/report/schedules", get(modules::report::schedule::list_schedules))
        .route("/api/report/schedules", post(modules::report::schedule::create_schedule))
        .route("/api/report/schedules/{id}", get(modules::report::schedule::get_schedule))
        .route("/api/report/schedules/{id}", put(modules::report::schedule::update_schedule))
        .route("/api/report/schedules/{id}", delete(modules::report::schedule::delete_schedule))

        // Health & Metrics
        .route("/api/v1/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors)
        .layer(prometheus_layer)
        .with_state(state);

    let port = std::env::var("REPORT_PORT")
        .unwrap_or_else(|_| "8061".to_string())
        .parse()
        .unwrap_or(8061);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Report Service is running at http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

// ==================== 公共处理函数 ====================

async fn home() -> &'static str {
    "TOPEMS Report Service API\n\n\
     Unified service for BI (Business Intelligence) and Report\n\n\
     - /health - Health check"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let response = serde_json::json!({
        "service": "report-service",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "modules": {
            "bi": "active",
            "report": "active"
        },
        "dependencies": [
            {
                "name": "postgresql",
                "status": db_status
            }
        ],
        "version": "1.0.0"
    });

    Json(ApiResponse::success(response, "Detailed health check"))
}
