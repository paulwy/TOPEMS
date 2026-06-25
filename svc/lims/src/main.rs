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
    auth_middleware, create_cors_layer, create_database_pool, get_api_info_handler,
    init_logging, simple_health_check, ApiResponse, AuthState, DatabaseConfig, ServiceHealth,
    SimpleHealthConfig,
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

    init_logging("topems-lims");

    tracing::info!("🚀 TOPEMS LIMS Service starting...");

    let db_config = DatabaseConfig {
        url: std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string()),
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

    if let Err(e) = modules::lims::init_database(&pool).await {
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
        .route("/api/plugins/info", get(plugin::get_plugin_info))
        .route("/api/plugins/health", get(plugin::plugin_health_check))
        .route("/api", get(|| get_api_info_handler("lims-service")))
        .route("/api/info", get(|| get_api_info_handler("lims-service")))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    let protected_routes = Router::new()
        // ===== LIMS routes (prefix: /api/lims) =====
        // Sample Management
        .route("/api/lims/samples", get(modules::lims::sample::list_samples))
        .route("/api/lims/samples", post(modules::lims::sample::register_sample))
        .route("/api/lims/samples/{id}", get(modules::lims::sample::get_sample))
        .route("/api/lims/samples/{id}", put(modules::lims::sample::update_sample))
        .route("/api/lims/samples/{id}", delete(modules::lims::sample::delete_sample))
        // Sample Lifecycle Tracking
        .route("/api/lims/samples/{id}/lifecycle", get(modules::lims::sample::get_sample_lifecycle))
        .route("/api/lims/samples/lifecycle", post(modules::lims::sample::record_lifecycle_event))
        .route("/api/lims/samples/{id}/stage/{to_stage}", post(modules::lims::sample::transition_sample_stage))
        .route("/api/lims/samples/{id}/traceability", get(modules::lims::sample::get_sample_traceability))
        .route("/api/lims/lifecycle-stages", get(modules::lims::sample::get_lifecycle_stages))
        // Inspection Task
        .route("/api/lims/tasks", get(modules::lims::inspection_task::list_tasks))
        .route("/api/lims/tasks", post(modules::lims::inspection_task::create_task))
        .route("/api/lims/tasks/{id}", get(modules::lims::inspection_task::get_task))
        .route("/api/lims/tasks/{id}", put(modules::lims::inspection_task::update_task))
        .route("/api/lims/tasks/{id}", delete(modules::lims::inspection_task::delete_task))
        .route("/api/lims/tasks/{id}/result", post(modules::lims::inspection_task::submit_result))
        // Inspection Record
        .route("/api/lims/records", get(modules::lims::inspection_record::list_records))
        .route("/api/lims/records", post(modules::lims::inspection_record::create_record))
        .route("/api/lims/records/{id}", get(modules::lims::inspection_record::get_record))
        .route("/api/lims/records/{id}", delete(modules::lims::inspection_record::delete_record))
        // Instrument
        .route("/api/lims/instruments", get(modules::lims::instrument::list_instruments))
        .route("/api/lims/instruments", post(modules::lims::instrument::create_instrument))
        .route("/api/lims/instruments/{id}", get(modules::lims::instrument::get_instrument))
        .route("/api/lims/instruments/{id}", put(modules::lims::instrument::update_instrument))
        .route("/api/lims/instruments/{id}", delete(modules::lims::instrument::delete_instrument))
        .route("/api/lims/instruments/{id}/calibration", post(modules::lims::instrument::calibrate))
        // Reagent
        .route("/api/lims/reagents", get(modules::lims::reagent::list_reagents))
        .route("/api/lims/reagents", post(modules::lims::reagent::create_reagent))
        .route("/api/lims/reagents/{id}", get(modules::lims::reagent::get_reagent))
        .route("/api/lims/reagents/{id}", put(modules::lims::reagent::update_reagent))
        .route("/api/lims/reagents/{id}", delete(modules::lims::reagent::delete_reagent))
        // Statistics
        .route("/api/lims/statistics", get(modules::lims::statistics::get_statistics))
        // Data Sync
        .route("/api/lims/sync-records", get(modules::lims::data_sync::list_sync_records))
        .route("/api/lims/sync-records/{id}", get(modules::lims::data_sync::get_sync_record))
        .route("/api/lims/sync-records/{id}", delete(modules::lims::data_sync::delete_sync_record))
        .route("/api/lims/sync-records/{id}/retry", post(modules::lims::data_sync::retry_sync))
        .route("/api/lims/sync/record-to-qms", post(modules::lims::data_sync::sync_record_to_qms))
        .route("/api/lims/sync/reagent-to-ehs", post(modules::lims::data_sync::sync_reagent_to_ehs))

        // Sample Barcode & RFID Management
        .route("/api/lims/barcodes", get(modules::lims::sample_barcode::list_barcodes))
        .route("/api/lims/barcodes", post(modules::lims::sample_barcode::generate_barcode))
        .route("/api/lims/barcodes/{id}", get(modules::lims::sample_barcode::get_barcode))
        .route("/api/lims/barcodes/{id}", put(modules::lims::sample_barcode::update_barcode))
        .route("/api/lims/barcodes/{id}", delete(modules::lims::sample_barcode::delete_barcode))
        .route("/api/lims/barcodes/{id}/print", post(modules::lims::sample_barcode::print_barcode))
        .route("/api/lims/barcodes/scan", post(modules::lims::sample_barcode::scan_barcode))
        .route("/api/lims/barcodes/types", get(modules::lims::sample_barcode::get_barcode_types))
        .route("/api/lims/barcodes/trace/{barcode}", get(modules::lims::sample_barcode::trace_sample_by_barcode))
        .route("/api/lims/print-config", get(modules::lims::sample_barcode::get_print_config))
        .route("/api/lims/print-config", put(modules::lims::sample_barcode::update_print_config))
        .route("/api/lims/rfid-tags", get(modules::lims::sample_barcode::list_rfid_tags))
        .route("/api/lims/rfid-tags", post(modules::lims::sample_barcode::create_rfid_tag))
        .route("/api/lims/rfid-tags/{id}", delete(modules::lims::sample_barcode::delete_rfid_tag))
        .route("/api/lims/rfid-tags/{tag_id}/assign/{sample_id}", post(modules::lims::sample_barcode::assign_rfid_tag))
        .route("/api/lims/rfid-tags/{tag_id}/unassign", post(modules::lims::sample_barcode::unassign_rfid_tag))

        // Test Method Library
        .route("/api/lims/test-methods", get(modules::lims::test_method::list_methods))
        .route("/api/lims/test-methods", post(modules::lims::test_method::create_method))
        .route("/api/lims/test-methods/{id}", get(modules::lims::test_method::get_method))
        .route("/api/lims/test-methods/{id}", put(modules::lims::test_method::update_method))
        .route("/api/lims/test-methods/{id}", delete(modules::lims::test_method::delete_method))
        .route("/api/lims/test-methods/{id}/versions", get(modules::lims::test_method::list_method_versions))
        .route("/api/lims/test-methods/{id}/new-version", post(modules::lims::test_method::create_new_version))
        .route("/api/lims/method-categories", get(modules::lims::test_method::list_categories))
        .route("/api/lims/method-categories", post(modules::lims::test_method::create_category))
        .route("/api/lims/method-categories/{id}", put(modules::lims::test_method::update_category))
        .route("/api/lims/method-categories/{id}", delete(modules::lims::test_method::delete_category))
        .route("/api/lims/method-validations", get(modules::lims::test_method::list_validations))
        .route("/api/lims/method-validations", post(modules::lims::test_method::create_validation))

        // Proficiency Testing
        .route("/api/lims/pt-plans", get(modules::lims::proficiency_testing::list_plans))
        .route("/api/lims/pt-plans", post(modules::lims::proficiency_testing::create_plan))
        .route("/api/lims/pt-plans/{id}", get(modules::lims::proficiency_testing::get_plan))
        .route("/api/lims/pt-plans/{id}", put(modules::lims::proficiency_testing::update_plan))
        .route("/api/lims/pt-plans/{id}", delete(modules::lims::proficiency_testing::delete_plan))
        .route("/api/lims/pt-plans/{id}/samples", get(modules::lims::proficiency_testing::list_plan_samples))
        .route("/api/lims/pt-plans/{id}/results", get(modules::lims::proficiency_testing::list_plan_results))
        .route("/api/lims/pt-plans/{id}/evaluations", get(modules::lims::proficiency_testing::list_plan_evaluations))
        .route("/api/lims/pt-plans/{id}/corrective-actions", get(modules::lims::proficiency_testing::list_plan_corrective_actions))
        .route("/api/lims/pt-samples/receive", post(modules::lims::proficiency_testing::receive_sample))
        .route("/api/lims/pt-results", post(modules::lims::proficiency_testing::submit_result))
        .route("/api/lims/pt-evaluations", post(modules::lims::proficiency_testing::evaluate_result))
        .route("/api/lims/pt-corrective-actions", post(modules::lims::proficiency_testing::create_corrective_action))
        .route("/api/lims/pt-corrective-actions/{id}", put(modules::lims::proficiency_testing::update_corrective_action))

        // Uncertainty Evaluation
        .route("/api/lims/uncertainty-projects", get(modules::lims::uncertainty::list_projects))
        .route("/api/lims/uncertainty-projects", post(modules::lims::uncertainty::create_project))
        .route("/api/lims/uncertainty-projects/{id}", get(modules::lims::uncertainty::get_project))
        .route("/api/lims/uncertainty-projects/{id}", put(modules::lims::uncertainty::update_project))
        .route("/api/lims/uncertainty-projects/{id}", delete(modules::lims::uncertainty::delete_project))
        .route("/api/lims/uncertainty-projects/{id}/sources", get(modules::lims::uncertainty::list_sources))
        .route("/api/lims/uncertainty-projects/{id}/components", get(modules::lims::uncertainty::list_components))
        .route("/api/lims/uncertainty-projects/{id}/combined", post(modules::lims::uncertainty::calculate_combined))
        .route("/api/lims/uncertainty-projects/{id}/report", get(modules::lims::uncertainty::generate_report))
        .route("/api/lims/uncertainty-sources", post(modules::lims::uncertainty::create_source))
        .route("/api/lims/uncertainty-sources/{id}", put(modules::lims::uncertainty::update_source))
        .route("/api/lims/uncertainty-sources/{id}", delete(modules::lims::uncertainty::delete_source))
        .route("/api/lims/uncertainty-components", post(modules::lims::uncertainty::create_component))
        .route("/api/lims/uncertainty-components/{id}", put(modules::lims::uncertainty::update_component))
        .route("/api/lims/uncertainty-components/{id}", delete(modules::lims::uncertainty::delete_component))
        .route("/api/lims/uncertainty/type-a", post(modules::lims::uncertainty::calculate_type_a))
        .route("/api/lims/uncertainty/type-b", post(modules::lims::uncertainty::calculate_type_b))

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

    let port = std::env::var("LIMS_PORT")
        .unwrap_or_else(|_| "8051".to_string())
        .parse()
        .unwrap_or(8051);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ LIMS Service is running at http://{}", addr);

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