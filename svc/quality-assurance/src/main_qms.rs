//! TOPEMS QMS Service (Quality Management System)

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
    routing::{get, post, put},
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
    "TOPEMS QMS Service"
}

async fn health() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({
        "service": "qms",
        "status": "healthy"
    }), "OK"))
}

// ==================== 主入口 ====================

#[tokio::main]
async fn main() {
    _ = dotenv::dotenv();

    init_logging("topems-qms");

    tracing::info!("🚀 TOPEMS QMS Service starting...");

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

    // Initialize QMS database
    if let Err(e) = modules::qms::init_database(&pool).await {
        tracing::warn!("QMS module database init warning: {}", e);
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
        .route("/api/plugins/info", get(modules::qms::qms_plugin::get_plugin_info))
        .route("/api/plugins/health", get(modules::qms::qms_plugin::plugin_health_check))
        .route("/api/info", get(|| get_api_info_handler("qms-service")))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    // Protected routes
    let protected_routes = Router::new()
        // Quality Inspection
        .route("/api/qa/quality/inspection", get(modules::qms::quality_inspection::list_inspections))
        .route("/api/qa/quality/inspection", post(modules::qms::quality_inspection::create_inspection))
        .route("/api/qa/quality/inspection/{id}", get(modules::qms::quality_inspection::get_inspection))
        .route("/api/qa/quality/inspection/{id}", put(modules::qms::quality_inspection::update_inspection))
        .route("/api/qa/quality/inspection/{id}/result", post(modules::qms::quality_inspection::submit_result))
        // Quality Issue
        .route("/api/qa/quality/issue", get(modules::qms::quality_issue::list_issues))
        .route("/api/qa/quality/issue", post(modules::qms::quality_issue::create_issue))
        .route("/api/qa/quality/issue/{id}", get(modules::qms::quality_issue::get_issue))
        .route("/api/qa/quality/issue/{id}", put(modules::qms::quality_issue::update_issue))
        .route("/api/qa/quality/issue/{id}/resolve", post(modules::qms::quality_issue::resolve_issue))
        // Quality Standard
        .route("/api/qa/quality/standard", get(modules::qms::quality_standard::list_standards))
        .route("/api/qa/quality/standard", post(modules::qms::quality_standard::create_standard))
        .route("/api/qa/quality/standard/{id}", get(modules::qms::quality_standard::get_standard))
        .route("/api/qa/quality/standard/{id}", put(modules::qms::quality_standard::update_standard))
        // Dashboard
        .route("/api/qa/quality/dashboard", get(modules::qms::dashboard::get_dashboard_stats))
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

    let port = std::env::var("QMS_PORT")
        .unwrap_or_else(|_| "8050".to_string())
        .parse()
        .unwrap_or(8050);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ QMS Service is running at http://{}", addr);

    // Auto-register to Core
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::qms::qms_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}
