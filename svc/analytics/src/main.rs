//! TOPEMS Analytics Service
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

    init_logging("topems-analytics");

    tracing::info!("🚀 TOPEMS Analytics Service starting...");

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

    // Initialize databases for all modules
    if let Err(e) = modules::bi::init_database(&pool).await {
        tracing::warn!("BI module database init warning: {}", e);
    }
    if let Err(e) = modules::report::init_database(&pool).await {
        tracing::warn!("Report module database init warning: {}", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-analytics").with_db(pool.clone());

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
        .route("/api", get(|| get_api_info_handler("analytics-service")))
        .route("/api/info", get(|| get_api_info_handler("analytics-service")))
        .route("/api/plugins/info", get(modules::bi::plugin::get_plugin_info))
        .route("/api/plugins/health", get(modules::bi::plugin::plugin_health_check))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    // Protected routes (auth required)
    let protected_routes = Router::new()
        // ===== BI routes (prefix: /api/bi) =====
        // Dashboard
        .route("/api/bi/dashboard", get(modules::bi::dashboard::list_dashboards))
        .route("/api/bi/dashboard", post(modules::bi::dashboard::create_dashboard))
        .route("/api/bi/dashboard/{id}", get(modules::bi::dashboard::get_dashboard))
        .route("/api/bi/dashboard/{id}", put(modules::bi::dashboard::update_dashboard))
        .route("/api/bi/dashboard/{id}", delete(modules::bi::dashboard::delete_dashboard))
        // Widget
        .route("/api/bi/widget", get(modules::bi::widget::list_widgets))
        .route("/api/bi/widget", post(modules::bi::widget::create_widget))
        .route("/api/bi/widget/{id}", get(modules::bi::widget::get_widget))
        .route("/api/bi/widget/{id}", put(modules::bi::widget::update_widget))
        .route("/api/bi/widget/{id}", delete(modules::bi::widget::delete_widget))
        .route("/api/bi/widget/{id}/data", get(modules::bi::widget::get_widget_data))
        // Data Source
        .route("/api/bi/datasource", get(modules::bi::datasource::list_datasources))
        .route("/api/bi/datasource", post(modules::bi::datasource::create_datasource))
        .route("/api/bi/datasource/{id}", get(modules::bi::datasource::get_datasource))
        .route("/api/bi/datasource/{id}", put(modules::bi::datasource::update_datasource))
        // Visualization
        .route("/api/bi/visualization", get(modules::bi::visualization::list_visualizations))
        .route("/api/bi/visualization", post(modules::bi::visualization::create_visualization))
        .route("/api/bi/visualization/{id}", get(modules::bi::visualization::get_visualization))
        // Analysis
        .route("/api/bi/analysis", get(modules::bi::analysis::list_analyses))
        .route("/api/bi/analysis", post(modules::bi::analysis::create_analysis))
        .route("/api/bi/analysis/{id}", get(modules::bi::analysis::get_analysis))
        .route("/api/bi/analysis/{id}/execute", post(modules::bi::analysis::execute_analysis))

        // Analytics Summary
        .route("/api/bi/analytics/summary", get(modules::bi::analytics::get_summary_analytics))
        .route("/api/bi/analytics/development", get(modules::bi::analytics::get_development_analytics))
        .route("/api/bi/analytics/quality", get(modules::bi::analytics::get_quality_analytics))
        .route("/api/bi/analytics/production", get(modules::bi::analytics::get_production_analytics))
        .route("/api/bi/analytics/laboratory", get(modules::bi::analytics::get_laboratory_analytics))
        .route("/api/bi/analytics/overview", get(modules::bi::analytics::get_analytics_overview))

        // ===== Report routes (prefix: /api/analytics/report) =====
        // Report
        .route("/api/analytics/report", get(modules::report::report::list_reports))
        .route("/api/analytics/report", post(modules::report::report::create_report))
        .route("/api/analytics/report/{id}", get(modules::report::report::get_report))
        .route("/api/analytics/report/{id}", put(modules::report::report::update_report))
        .route("/api/analytics/report/{id}", delete(modules::report::report::delete_report))
        .route("/api/analytics/report/{id}/export", post(modules::report::report::export_report))
        .route("/api/analytics/report/{id}/run", post(modules::report::report::run_report))
        // Report Template
        .route("/api/analytics/report/template", get(modules::report::template::list_templates))
        .route("/api/analytics/report/template", post(modules::report::template::create_template))
        .route("/api/analytics/report/template/{id}", get(modules::report::template::get_template))
        .route("/api/analytics/report/template/{id}", put(modules::report::template::update_template))
        // Report Schedule
        .route("/api/analytics/report/schedule", get(modules::report::schedule::list_schedules))
        .route("/api/analytics/report/schedule", post(modules::report::schedule::create_schedule))
        .route("/api/analytics/report/schedule/{id}", get(modules::report::schedule::get_schedule))
        .route("/api/analytics/report/schedule/{id}", put(modules::report::schedule::update_schedule))
        .route("/api/analytics/report/schedule/{id}", delete(modules::report::schedule::delete_schedule))

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

    let port = std::env::var("ANALYTICS_PORT")
        .unwrap_or_else(|_| "8060".to_string())
        .parse()
        .unwrap_or(8060);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Analytics Service is running at http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

// ==================== 公共处理函数 ====================

async fn home() -> &'static str {
    "TOPEMS Analytics Service API\n\n\
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
        "service": "analytics-service",
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
