//! TOPEMS Report Service

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
    routing::{delete, get, post, put},
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use sqlx::PgPool;

use topems_shared::{
    auth_middleware, create_cors_layer, get_api_info_handler, init_logging,
    ApiResponse, AuthState,
};

pub use shared::*;

// ==================== 应用状态 ====================

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
}

impl axum::extract::FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

// ==================== 辅助函数 ====================

async fn home() -> &'static str {
    "TOPEMS Report Service"
}

async fn health() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({
        "service": "report",
        "status": "healthy"
    }), "OK"))
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

    // Initialize Report database
    if let Err(e) = modules::report::init_database(&pool).await {
        tracing::warn!("Report module database init warning: {}", e);
    }

    let auth_state = AuthState::from_env();
    let state = AppState {
        auth_state,
        pool,
    };

    let cors = create_cors_layer();
    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    // Public routes
    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api/info", get(|| get_api_info_handler("report-service")))
        .route("/api/plugins/info", get(modules::report::report_plugin::get_plugin_info))
        .route("/api/plugins/health", get(modules::report::report_plugin::plugin_health_check))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    // Protected routes
    let protected_routes = Router::new()
        // Report
        .route("/api/analytics/report", get(modules::report::report::list_reports))
        .route("/api/analytics/report", post(modules::report::report::create_report))
        .route("/api/analytics/report/{id}", get(modules::report::report::get_report))
        .route("/api/analytics/report/{id}", put(modules::report::report::update_report))
        .route("/api/analytics/report/{id}", delete(modules::report::report::delete_report))
        .route("/api/analytics/report/{id}/export", post(modules::report::report::export_report))
        .route("/api/analytics/report/{id}/run", post(modules::report::report::run_report))
        // Template
        .route("/api/analytics/template", get(modules::report::template::list_templates))
        .route("/api/analytics/template", post(modules::report::template::create_template))
        .route("/api/analytics/template/{id}", get(modules::report::template::get_template))
        .route("/api/analytics/template/{id}", put(modules::report::template::update_template))
        // Schedule
        .route("/api/analytics/schedule", get(modules::report::schedule::list_schedules))
        .route("/api/analytics/schedule", post(modules::report::schedule::create_schedule))
        .route("/api/analytics/schedule/{id}", get(modules::report::schedule::get_schedule))
        .route("/api/analytics/schedule/{id}", put(modules::report::schedule::update_schedule))
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

    // Auto-register to Core
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::report::report_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}
