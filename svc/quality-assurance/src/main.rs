//! TOPEMS Quality Assurance Service
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

use std::net::SocketAddr;

use axum::{
    extract::State,
    routing::{get, post, put},
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

    init_logging("topems-quality-assurance");

    tracing::info!("🚀 TOPEMS Quality Assurance Service starting...");

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
    if let Err(e) = modules::qms::init_database(&pool).await {
        tracing::warn!("QMS module database init warning: {}", e);
    }
    if let Err(e) = modules::lims::init_database(&pool).await {
        tracing::warn!("LIMS module database init warning: {}", e);
    }
    if let Err(e) = modules::ehs::init_database(&pool).await {
        tracing::warn!("EHS module database init warning: {}", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-quality-assurance").with_db(pool.clone());

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
        .route("/api", get(|| get_api_info_handler("quality-assurance-service")))
        .route("/api/info", get(|| get_api_info_handler("quality-assurance-service")))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    // Protected routes (auth required)
    let protected_routes = Router::new()
        // ===== QMS routes (prefix: /api/qa/quality) =====
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

        // ===== LIMS routes (prefix: /api/qa/lab) =====
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

        // ===== EHS routes (prefix: /api/qa/ehs) =====
        // Risk Assessment
        .route("/api/qa/ehs/risk", get(modules::ehs::risk::list_risks))
        .route("/api/qa/ehs/risk", post(modules::ehs::risk::create_risk))
        .route("/api/qa/ehs/risk/{id}", get(modules::ehs::risk::get_risk))
        .route("/api/qa/ehs/risk/{id}", put(modules::ehs::risk::update_risk))
        .route("/api/qa/ehs/risk/{id}/assess", post(modules::ehs::risk::assess_risk))
        // Safety Inspection
        .route("/api/qa/ehs/safety", get(modules::ehs::safety::list_inspections))
        .route("/api/qa/ehs/safety", post(modules::ehs::safety::create_inspection))
        .route("/api/qa/ehs/safety/{id}", get(modules::ehs::safety::get_inspection))
        // Accident Report
        .route("/api/qa/ehs/accident", get(modules::ehs::accident::list_accidents))
        .route("/api/qa/ehs/accident", post(modules::ehs::accident::report_accident))
        .route("/api/qa/ehs/accident/{id}", get(modules::ehs::accident::get_accident))
        .route("/api/qa/ehs/accident/{id}", put(modules::ehs::accident::update_accident))
        // Environment
        .route("/api/qa/ehs/environment", get(modules::ehs::environment::list_records))
        .route("/api/qa/ehs/environment", post(modules::ehs::environment::create_record))
        // Training
        .route("/api/qa/ehs/training", get(modules::ehs::training::list_trainings))
        .route("/api/qa/ehs/training", post(modules::ehs::training::create_training))
        .route("/api/qa/ehs/training/{id}", get(modules::ehs::training::get_training))
        // Health
        .route("/api/qa/ehs/health", get(modules::ehs::health::list_records))
        .route("/api/qa/ehs/health", post(modules::ehs::health::create_record))

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

    let port = std::env::var("QUALITY_ASSURANCE_PORT")
        .unwrap_or_else(|_| "8032".to_string())
        .parse()
        .unwrap_or(8032);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Quality Assurance Service is running at http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

// ==================== 公共处理函数 ====================

async fn home() -> &'static str {
    "TOPEMS Quality Assurance Service API\n\n\
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
        "service": "quality-assurance-service",
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
