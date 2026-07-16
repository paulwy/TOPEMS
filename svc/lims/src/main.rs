//! TOPEMS LIMS Service
//!
//! Unified service for QMS (Quality Management), LIMS (Laboratory), and EHS (Environment Health Safety)

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

mod middleware;
mod shared;

pub mod models;

use std::env;
pub mod modules;
pub mod services;

use std::net::SocketAddr;

use axum::{
    extract::State,
    routing::{get, post, put},
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use sqlx::PgPool;

use topems_shared::{
    auth_middleware, create_cors_layer, create_database_pool, get_api_info_handler, init_telemetry,
    rls_middleware, simple_health_check, telemetry_middleware, wrap_group2_router, ApiResponse,
    AuthState, DatabaseConfig, RouteCompatConfig, ServiceHealth, SimpleHealthConfig,
};

pub use shared::*;

// ==================== 主入口 ====================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    _ = dotenv::dotenv();

    let _telemetry_guard = init_telemetry("topems-lims");

    tracing::info!("🚀 TOPEMS LIMS Service starting...");

    let db_config = DatabaseConfig {
        url: std::env::var("DATABASE_URL").unwrap_or_else(|_| {
            tracing::error!("DATABASE_URL environment variable is required");
            std::process::exit(1);
        }),
        max_connections: 20,
        min_connections: Some(5),
        connect_timeout: Some(30),
        idle_timeout: Some(300),
        max_lifetime: Some(1800),
        test_interval: Some(60),
        enable_connection_reuse: Some(true),
    };

    let pool = match create_database_pool(&db_config).await {
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
        tracing::warn!("LIMS module database init warning: {}", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-lims").with_db(pool.clone());

    let state = AppState {
        auth_state,
        pool,
        health_config,
    };

    let cors = create_cors_layer();

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route(
            "/api/plugins/info",
            get(modules::lims_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::lims_plugin::plugin_health_check),
        )
        .route("/api", get(|| get_api_info_handler("lims-service")))
        .route("/api/info", get(|| get_api_info_handler("lims-service")))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        );

    let protected_routes = Router::new()
        .merge(modules::create_api_routes())
        // Frontend aligned routes (LIMS module)
        // Sample
        .route(
            "/lims/samples",
            get(modules::sample::list_samples).post(modules::sample::register_sample),
        )
        .route(
            "/lims/samples/{id}",
            get(modules::sample::get_sample)
                .put(modules::sample::update_sample)
                .delete(modules::sample::delete_sample),
        )
        .route(
            "/lims/samples/{id}/lifecycle",
            get(modules::sample::get_sample_lifecycle),
        )
        .route(
            "/lims/samples/lifecycle",
            post(modules::sample::record_lifecycle_event),
        )
        .route(
            "/lims/samples/{id}/stage/{to_stage}",
            post(modules::sample::transition_sample_stage),
        )
        .route(
            "/lims/samples/{id}/traceability",
            get(modules::sample::get_sample_traceability),
        )
        .route(
            "/lims/lifecycle-stages",
            get(modules::sample::get_lifecycle_stages),
        )
        // Instrument
        .route(
            "/lims/instruments",
            get(modules::instrument::list_instruments).post(modules::instrument::create_instrument),
        )
        .route(
            "/lims/instruments/{id}",
            get(modules::instrument::get_instrument)
                .put(modules::instrument::update_instrument)
                .delete(modules::instrument::delete_instrument),
        )
        .route(
            "/lims/instruments/{id}/calibration",
            post(modules::instrument::calibrate),
        )
        // Reagent
        .route(
            "/lims/reagents",
            get(modules::reagent::list_reagents).post(modules::reagent::create_reagent),
        )
        .route(
            "/lims/reagents/{id}",
            get(modules::reagent::get_reagent)
                .put(modules::reagent::update_reagent)
                .delete(modules::reagent::delete_reagent),
        )
        // Test Method
        .route(
            "/lims/test-methods",
            get(modules::test_method::list_methods).post(modules::test_method::create_method),
        )
        .route(
            "/lims/test-methods/{id}",
            get(modules::test_method::get_method)
                .put(modules::test_method::update_method)
                .delete(modules::test_method::delete_method),
        )
        .route(
            "/lims/test-methods/{id}/versions",
            get(modules::test_method::list_method_versions),
        )
        .route(
            "/lims/test-methods/{id}/new-version",
            post(modules::test_method::create_new_version),
        )
        .route(
            "/lims/method-categories",
            get(modules::test_method::list_categories).post(modules::test_method::create_category),
        )
        .route(
            "/lims/method-categories/{id}",
            put(modules::test_method::update_category)
                .delete(modules::test_method::delete_category),
        )
        .route(
            "/lims/method-validations",
            get(modules::test_method::list_validations)
                .post(modules::test_method::create_validation),
        )
        // Inspection Task
        .route(
            "/lims/tasks",
            get(modules::inspection_task::list_tasks).post(modules::inspection_task::create_task),
        )
        .route(
            "/lims/tasks/{id}",
            get(modules::inspection_task::get_task)
                .put(modules::inspection_task::update_task)
                .delete(modules::inspection_task::delete_task),
        )
        .route(
            "/lims/tasks/{id}/result",
            post(modules::inspection_task::submit_result),
        )
        // Data Sync
        .route(
            "/lims/sync-records",
            get(modules::data_sync::list_sync_records),
        )
        .route(
            "/lims/sync-records/{id}",
            get(modules::data_sync::get_sync_record).delete(modules::data_sync::delete_sync_record),
        )
        .route(
            "/lims/sync-records/{id}/retry",
            post(modules::data_sync::retry_sync),
        )
        .route(
            "/lims/sync/record-to-qms",
            post(modules::data_sync::sync_record_to_qms),
        )
        .route(
            "/lims/sync/reagent-to-ehs",
            post(modules::data_sync::sync_reagent_to_ehs),
        )
        // Health & Metrics
        .route("/api/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.pool.clone(),
            rls_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(cors)
        .layer(prometheus_layer)
        .with_state(state);

    let cfg = RouteCompatConfig::new("lims", "/api/core/lims", &[]);
    let app = wrap_group2_router(app, cfg);

    let port = std::env::var("LIMS_PORT")
        .unwrap_or_else(|_| "8051".to_string())
        .parse()
        .unwrap_or(8051);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ LIMS Service is running at http://{}", addr);

    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::lims_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app.into_make_service())
        .await?;

    Ok(())
}

// ==================== 公共处理函数 ====================

async fn home() -> &'static str {
    "TOPEMS LIMS Service API\n\n\
     Unified service for QMS, LIMS and EHS\n\n\
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
        "service": "lims-service",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "modules": {
            "qms": "active",
            "lims": "active",
            "ehs": "active"
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
