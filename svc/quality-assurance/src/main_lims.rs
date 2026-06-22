//! TOPEMS LIMS Service (Laboratory Information Management System)

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
    "TOPEMS LIMS Service"
}

async fn health() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({
        "service": "lims",
        "status": "healthy"
    }), "OK"))
}

// ==================== 主入口 ====================

#[tokio::main]
async fn main() {
    _ = dotenv::dotenv();

    init_logging("topems-lim");

    tracing::info!("🚀 TOPEMS LIMS Service starting...");

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

    // Initialize LIMS database
    if let Err(e) = modules::lims::init_database(&pool).await {
        tracing::warn!("LIMS module database init warning: {}", e);
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
        .route("/api/plugins/info", get(modules::lims::lims_plugin::get_plugin_info))
        .route("/api/plugins/health", get(modules::lims::lims_plugin::plugin_health_check))
        .route("/api/info", get(|| get_api_info_handler("lims-service")))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    // Protected routes
    let protected_routes = Router::new()
        // Sample Management
        .route("/api/qa/lab/sample", get(modules::lims::sample::list_samples))
        .route("/api/qa/lab/sample", post(modules::lims::sample::register_sample))
        .route("/api/qa/lab/sample/{id}", get(modules::lims::sample::get_sample))
        .route("/api/qa/lab/sample/{id}", put(modules::lims::sample::update_sample))
        // Inspection Task
        .route("/api/qa/lab/task", get(modules::lims::inspection_task::list_tasks))
        .route("/api/qa/lab/task", post(modules::lims::inspection_task::create_task))
        .route("/api/qa/lab/task/{id}", get(modules::lims::inspection_task::get_task))
        .route("/api/qa/lab/task/{id}/result", post(modules::lims::inspection_task::submit_result))
        // Inspection Record
        .route("/api/qa/lab/record", get(modules::lims::inspection_record::list_records))
        .route("/api/qa/lab/record", post(modules::lims::inspection_record::create_record))
        .route("/api/qa/lab/record/{id}", get(modules::lims::inspection_record::get_record))
        // Instrument
        .route("/api/qa/lab/instrument", get(modules::lims::instrument::list_instruments))
        .route("/api/qa/lab/instrument", post(modules::lims::instrument::create_instrument))
        .route("/api/qa/lab/instrument/{id}", get(modules::lims::instrument::get_instrument))
        .route("/api/qa/lab/instrument/{id}/calibration", post(modules::lims::instrument::calibrate))
        // Reagent
        .route("/api/qa/lab/reagent", get(modules::lims::reagent::list_reagents))
        .route("/api/qa/lab/reagent", post(modules::lims::reagent::create_reagent))
        .route("/api/qa/lab/reagent/{id}", get(modules::lims::reagent::get_reagent))
        // Statistics
        .route("/api/qa/lab/statistics", get(modules::lims::statistics::get_statistics))
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

    let port = std::env::var("LIMS_PORT")
        .unwrap_or_else(|_| "8051".to_string())
        .parse()
        .unwrap_or(8051);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ LIMS Service is running at http://{}", addr);

    // Auto-register to Core
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::lims::lims_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}
