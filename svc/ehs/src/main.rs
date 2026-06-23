//! TOPEMS EHS Service
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

mod shared;

pub mod modules;
pub mod plugin;

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

#[tokio::main]
async fn main() {
    _ = dotenv::dotenv();

    init_logging("topems-ehs");

    tracing::info!("🚀 TOPEMS EHS Service starting...");

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

    if let Err(e) = modules::ehs::init_database(&pool).await {
        tracing::warn!("EHS module database init warning: {}", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-ehs").with_db(pool.clone());

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
        .route("/api/plugins/info", get(plugin::get_plugin_info))
        .route("/api/plugins/health", get(plugin::plugin_health_check))
        .route("/api", get(|| get_api_info_handler("ehs-service")))
        .route("/api/info", get(|| get_api_info_handler("ehs-service")))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    let protected_routes = Router::new()
        // ===== EHS routes (prefix: /api/ehs) =====
        // Hazards (Safety Hazard Management)
        .route("/api/ehs/hazards", get(modules::ehs::risk::list_risks))
        .route("/api/ehs/hazards", post(modules::ehs::risk::create_risk))
        .route("/api/ehs/hazards/{id}", get(modules::ehs::risk::get_risk))
        .route("/api/ehs/hazards/{id}", put(modules::ehs::risk::update_risk))
        .route("/api/ehs/hazards/{id}/assessments", post(modules::ehs::risk::assess_risk))

        // Inspection Plans
        .route("/api/ehs/checks/plans", get(modules::ehs::safety::list_plans))
        .route("/api/ehs/checks/plans", post(modules::ehs::safety::create_plan))
        .route("/api/ehs/checks/plans/{id}", get(modules::ehs::safety::get_plan))
        .route("/api/ehs/checks/plans/{id}", put(modules::ehs::safety::update_plan))
        .route("/api/ehs/checks/plans/{id}", delete(modules::ehs::safety::delete_plan))

        // Inspection Items
        .route("/api/ehs/checks/plans/{plan_id}/items", get(modules::ehs::safety::list_plan_items))
        .route("/api/ehs/checks/plans/{plan_id}/items", post(modules::ehs::safety::create_plan_item))
        .route("/api/ehs/checks/plans/{plan_id}/items/{item_id}", delete(modules::ehs::safety::delete_plan_item))

        // Inspection Records
        .route("/api/ehs/checks/records", get(modules::ehs::safety::list_records))
        .route("/api/ehs/checks/records", post(modules::ehs::safety::create_record))
        .route("/api/ehs/checks/records/{id}", get(modules::ehs::safety::get_record))
        .route("/api/ehs/checks/records/{id}", put(modules::ehs::safety::update_record))
        .route("/api/ehs/checks/records/{id}", delete(modules::ehs::safety::delete_record))

        // Safety Issues (Hazard Management)
        .route("/api/ehs/issues", get(modules::ehs::hazard::list_hazards))
        .route("/api/ehs/issues", post(modules::ehs::hazard::create_hazard))
        .route("/api/ehs/issues/{id}", get(modules::ehs::hazard::get_hazard))
        .route("/api/ehs/issues/{id}", put(modules::ehs::hazard::update_hazard))
        .route("/api/ehs/issues/{id}", delete(modules::ehs::hazard::delete_hazard))
        .route("/api/ehs/issues/{id}/rectification", post(modules::ehs::hazard::start_rectification))
        .route("/api/ehs/issues/{id}/rectification", put(modules::ehs::hazard::update_rectification))
        .route("/api/ehs/issues/{id}/rectification/submit", post(modules::ehs::hazard::submit_rectification))
        .route("/api/ehs/issues/{id}/verification", post(modules::ehs::hazard::verify_hazard))
        .route("/api/ehs/issues/{id}/close", post(modules::ehs::hazard::close_hazard))

        // Incidents (Accident Reports)
        .route("/api/ehs/incidents", get(modules::ehs::accident::list_accidents))
        .route("/api/ehs/incidents", post(modules::ehs::accident::report_accident))
        .route("/api/ehs/incidents/{id}", get(modules::ehs::accident::get_accident))
        .route("/api/ehs/incidents/{id}", put(modules::ehs::accident::update_accident))
        .route("/api/ehs/incidents/{id}", delete(modules::ehs::accident::delete_accident))
        .route("/api/ehs/incidents/{id}/investigation", post(modules::ehs::accident::start_investigation))
        .route("/api/ehs/incidents/{id}/investigation", put(modules::ehs::accident::update_investigation))
        .route("/api/ehs/incidents/{id}/investigation/complete", post(modules::ehs::accident::complete_investigation))
        .route("/api/ehs/incidents/{id}/treatment", post(modules::ehs::accident::create_treatment))
        .route("/api/ehs/incidents/{id}/treatment/actions/{action_id}", put(modules::ehs::accident::update_treatment_action))
        .route("/api/ehs/incidents/{id}/treatment/complete", post(modules::ehs::accident::complete_treatment))
        .route("/api/ehs/incidents/{id}/review", post(modules::ehs::accident::create_review))
        .route("/api/ehs/incidents/{id}/close", post(modules::ehs::accident::close_accident))

        // Environment
        .route("/api/ehs/environment", get(modules::ehs::environment::list_records))
        .route("/api/ehs/environment", post(modules::ehs::environment::create_record))

        // Training
        .route("/api/ehs/training", get(modules::ehs::training::list_trainings))
        .route("/api/ehs/training", post(modules::ehs::training::create_training))
        .route("/api/ehs/training/{id}", get(modules::ehs::training::get_training))

        // Health
        .route("/api/ehs/health", get(modules::ehs::health::list_records))
        .route("/api/ehs/health", post(modules::ehs::health::create_record))
        // Data Sync
        .route("/api/ehs/sync-records", get(modules::ehs::data_sync::list_sync_records))
        .route("/api/ehs/sync-records/{id}", get(modules::ehs::data_sync::get_sync_record))
        .route("/api/ehs/sync-records/{id}", delete(modules::ehs::data_sync::delete_sync_record))
        .route("/api/ehs/sync-records/{id}/retry", post(modules::ehs::data_sync::retry_sync))
        .route("/api/ehs/sync/hazard-to-qms", post(modules::ehs::data_sync::sync_hazard_to_qms))
        .route("/api/ehs/sync/accident-to-lims", post(modules::ehs::data_sync::sync_accident_to_lims))

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

    let port = std::env::var("EHS_PORT")
        .unwrap_or_else(|_| "8052".to_string())
        .parse()
        .unwrap_or(8052);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ EHS Service is running at http://{}", addr);

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

async fn home() -> &'static str {
    "TOPEMS EHS Service API\n\n\
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
        "service": "ehs-service",
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