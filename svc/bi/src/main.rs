//! TOPEMS BI Service
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

    init_logging("topems-bi");

    tracing::info!("🚀 TOPEMS BI Service starting...");

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

    // Initialize database for BI module
    if let Err(e) = modules::bi::init_database(&pool).await {
        tracing::warn!("BI module database init warning: {}", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-bi").with_db(pool.clone());

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
        .route("/api", get(|| get_api_info_handler("bi-service")))
        .route("/api/info", get(|| get_api_info_handler("bi-service")))
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
        .route("/api/bi/dashboard/public", get(modules::bi::dashboard::get_public_dashboards))
        .route("/api/bi/dashboard/user/{owner_id}", get(modules::bi::dashboard::get_user_dashboards))
        // Dashboard Share
        .route("/api/bi/dashboard/{id}/share", post(modules::bi::dashboard::create_share_link))
        .route("/api/bi/dashboard/{id}/shares", get(modules::bi::dashboard::list_share_links))
        .route("/api/bi/dashboard/share/{share_id}", get(modules::bi::dashboard::get_shared_dashboard))
        .route("/api/bi/dashboard/share/{id}", delete(modules::bi::dashboard::delete_share_link))
        // Dashboard Export/Import
        .route("/api/bi/dashboard/{id}/export", get(modules::bi::dashboard::export_dashboard))
        .route("/api/bi/dashboard/import", post(modules::bi::dashboard::import_dashboard))
        // Dashboard Real-time Data
        .route("/api/bi/dashboard/{id}/realtime", get(modules::bi::dashboard::query_dashboard_realtime_data))
        // Dashboard Refresh
        .route("/api/bi/dashboard/{id}/refresh", post(modules::bi::dashboard::refresh_dashboard_data))
        .route("/api/bi/dashboard/{id}/auto-refresh", post(modules::bi::dashboard::set_auto_refresh))
        // Dashboard Export (PDF/Excel)
        .route("/api/bi/dashboard/{id}/export/pdf", get(modules::bi::dashboard::export_dashboard_pdf))
        .route("/api/bi/dashboard/{id}/export/excel", get(modules::bi::dashboard::export_dashboard_excel))
        // WebSocket
        .route("/ws/dashboard/{dashboard_id}", get(modules::bi::websocket::dashboard_websocket))
        // Widget
        .route("/api/bi/widget", get(modules::bi::widget::list_widgets))
        .route("/api/bi/widget", post(modules::bi::widget::create_widget))
        .route("/api/bi/widget/{id}", get(modules::bi::widget::get_widget))
        .route("/api/bi/widget/{id}", put(modules::bi::widget::update_widget))
        .route("/api/bi/widget/{id}", delete(modules::bi::widget::delete_widget))
        .route("/api/bi/widget/{id}/data", get(modules::bi::widget::get_widget_data))
        .route("/api/bi/widget/{id}/data/realtime", get(modules::bi::widget::get_widget_data_realtime))
        .route("/api/bi/widget/{id}/cache/invalidate", post(modules::bi::widget::invalidate_widget_cache))
        .route("/api/bi/widget/cache/invalidate-all", post(modules::bi::widget::invalidate_all_widget_cache))
        .route("/api/bi/widget/dashboard/{dashboard_id}", get(modules::bi::widget::get_widgets_by_dashboard))
        // Dashboard Templates
        .route("/api/bi/dashboard/template", get(modules::bi::dashboard::list_dashboard_templates))
        .route("/api/bi/dashboard/template", post(modules::bi::dashboard::create_dashboard_template))
        .route("/api/bi/dashboard/template/{id}", get(modules::bi::dashboard::get_dashboard_template))
        .route("/api/bi/dashboard/template/{id}", put(modules::bi::dashboard::update_dashboard_template))
        .route("/api/bi/dashboard/template/{id}", delete(modules::bi::dashboard::delete_dashboard_template))
        .route("/api/bi/dashboard/{id}/clone", post(modules::bi::dashboard::clone_dashboard))
        .route("/api/bi/dashboard/template/{template_id}/create", post(modules::bi::dashboard::create_dashboard_from_template))
        // Data Source
        .route("/api/bi/datasource", get(modules::bi::datasource::list_datasources))
        .route("/api/bi/datasource", post(modules::bi::datasource::create_datasource))
        .route("/api/bi/datasource/{id}", get(modules::bi::datasource::get_datasource))
        .route("/api/bi/datasource/{id}", put(modules::bi::datasource::update_datasource))
        // Visualization
        .route("/api/bi/visualization", get(modules::bi::visualization::list_visualizations))
        .route("/api/bi/visualization", post(modules::bi::visualization::create_visualization))
        .route("/api/bi/visualization/{id}", get(modules::bi::visualization::get_visualization))
        .route("/api/bi/visualization/chart-types", get(modules::bi::visualization::get_chart_types))
        .route("/api/bi/visualization/line", post(modules::bi::visualization::generate_line_chart))
        .route("/api/bi/visualization/bar", post(modules::bi::visualization::generate_bar_chart))
        .route("/api/bi/visualization/pie", post(modules::bi::visualization::generate_pie_chart))
        .route("/api/bi/visualization/gauge", post(modules::bi::visualization::generate_gauge_chart))
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

    let port = std::env::var("BI_PORT")
        .unwrap_or_else(|_| "8060".to_string())
        .parse()
        .unwrap_or(8060);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ BI Service is running at http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

// ==================== 公共处理函数 ====================

async fn home() -> &'static str {
    "TOPEMS BI Service API\n\n\
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
        "service": "bi-service",
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
