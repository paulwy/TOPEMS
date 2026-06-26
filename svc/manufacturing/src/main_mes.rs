//! TOPEMS MES Service (Manufacturing Execution System)

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

mod api;
mod models;
mod services;
mod plugin;
mod shared;

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

// ==================== 应用状态 ====================

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: PgPool,
}

// ==================== 辅助函数 ====================

async fn home() -> &'static str {
    "TOPEMS MES Service"
}

async fn health() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({
        "service": "mes",
        "status": "healthy"
    }), "OK"))
}

// ==================== 主入口 ====================

#[tokio::main]
async fn main() {
    _ = dotenv::dotenv();

    init_logging("topems-mes");

    tracing::info!("🚀 TOPEMS MES Service starting...");

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

    if let Err(e) = models::init_database(&pool).await {
        tracing::warn!("MES database init warning: {}", e);
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
        .route("/api/info", get(|| get_api_info_handler("mes-service")))
        .route("/api/plugins/info", get(plugin::get_plugin_info))
        .route("/api/plugins/health", get(plugin::plugin_health_check))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    // Protected routes
    let protected_routes = Router::new()
        // Production Order
        .route("/api/mfg/production-order", get(api::mes::production_order::list_production_orders))
        .route("/api/mfg/production-order", post(api::mes::production_order::create_production_order))
        .route("/api/mfg/production-order/{id}", get(api::mes::production_order::get_production_order))
        .route("/api/mfg/production-order/{id}", put(api::mes::production_order::update_production_order))
        .route("/api/mfg/production-order/{id}", delete(api::mes::production_order::delete_production_order))
        .route("/api/mfg/production-order/{id}/start", post(api::mes::production_order::start_production_order))
        .route("/api/mfg/production-order/{id}/complete", post(api::mes::production_order::complete_production_order))
        .route("/api/mfg/production-order/{id}/cancel", post(api::mes::production_order::cancel_production_order))
        // Production Process
        .route("/api/mfg/process", get(api::mes::production_process::list_processes))
        .route("/api/mfg/process", post(api::mes::production_process::create_process))
        .route("/api/mfg/process/{id}", get(api::mes::production_process::get_process))
        .route("/api/mfg/process/{id}", put(api::mes::production_process::update_process))
        .route("/api/mfg/process/{id}", delete(api::mes::production_process::delete_process))
        // Production Record
        .route("/api/mfg/record", get(api::mes::production_record::list_records))
        .route("/api/mfg/record", post(api::mes::production_record::create_record))
        .route("/api/mfg/record/{id}", get(api::mes::production_record::get_record))
        // Equipment
        .route("/api/mfg/equipment", get(api::mes::equipment::list_equipment))
        .route("/api/mfg/equipment", post(api::mes::equipment::create_equipment))
        .route("/api/mfg/equipment/{id}", get(api::mes::equipment::get_equipment))
        .route("/api/mfg/equipment/{id}", put(api::mes::equipment::update_equipment))
        // Work Station
        .route("/api/mfg/work-station", get(api::mes::work_station::list_work_stations))
        .route("/api/mfg/work-station", post(api::mes::work_station::create_work_station))
        .route("/api/mfg/work-station/{id}", get(api::mes::work_station::get_work_station))
        .route("/api/mfg/work-station/{id}", put(api::mes::work_station::update_work_station))
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

    let port = std::env::var("MES_PORT")
        .unwrap_or_else(|_| "8030".to_string())
        .parse()
        .unwrap_or(8030);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ MES Service is running at http://{}", addr);

    // Auto-register to Core
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}
