//! TOPEMS Manufacturing Service
//!
//! Unified service for MES (Manufacturing Execution System) and PDM (Product Data Management)

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

mod modules;

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

    init_logging("topems-manufacturing");

    tracing::info!("🚀 TOPEMS Manufacturing Service starting...");

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
    if let Err(e) = modules::mes::init_database(&pool).await {
        tracing::warn!("MES module database init warning: {}", e);
    }
    if let Err(e) = modules::pdm::init_database(&pool).await {
        tracing::warn!("PDM module database init warning: {}", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-manufacturing").with_db(pool.clone());

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
        .route("/api", get(|| get_api_info_handler("manufacturing-service")))
        .route("/api/info", get(|| get_api_info_handler("manufacturing-service")))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    // Protected routes (auth required)
    let protected_routes = Router::new()
        // ===== MES routes (prefix: /api/mfg) =====
        // Production Order
        .route("/api/mfg/production-order", get(modules::mes::production_order::list_production_orders))
        .route("/api/mfg/production-order", post(modules::mes::production_order::create_production_order))
        .route("/api/mfg/production-order/:id", get(modules::mes::production_order::get_production_order))
        .route("/api/mfg/production-order/:id", put(modules::mes::production_order::update_production_order))
        .route("/api/mfg/production-order/:id", delete(modules::mes::production_order::delete_production_order))
        .route("/api/mfg/production-order/:id/start", post(modules::mes::production_order::start_production_order))
        .route("/api/mfg/production-order/:id/complete", post(modules::mes::production_order::complete_production_order))
        .route("/api/mfg/production-order/:id/cancel", post(modules::mes::production_order::cancel_production_order))
        // Production Process
        .route("/api/mfg/process", get(modules::mes::production_process::list_processes))
        .route("/api/mfg/process", post(modules::mes::production_process::create_process))
        .route("/api/mfg/process/:id", get(modules::mes::production_process::get_process))
        .route("/api/mfg/process/:id", put(modules::mes::production_process::update_process))
        .route("/api/mfg/process/:id", delete(modules::mes::production_process::delete_process))
        // Production Record
        .route("/api/mfg/record", get(modules::mes::production_record::list_records))
        .route("/api/mfg/record", post(modules::mes::production_record::create_record))
        .route("/api/mfg/record/:id", get(modules::mes::production_record::get_record))
        // Equipment
        .route("/api/mfg/equipment", get(modules::mes::equipment::list_equipment))
        .route("/api/mfg/equipment", post(modules::mes::equipment::create_equipment))
        .route("/api/mfg/equipment/:id", get(modules::mes::equipment::get_equipment))
        .route("/api/mfg/equipment/:id", put(modules::mes::equipment::update_equipment))
        // Work Station
        .route("/api/mfg/work-station", get(modules::mes::work_station::list_work_stations))
        .route("/api/mfg/work-station", post(modules::mes::work_station::create_work_station))
        .route("/api/mfg/work-station/:id", get(modules::mes::work_station::get_work_station))
        .route("/api/mfg/work-station/:id", put(modules::mes::work_station::update_work_station))

        // ===== PDM routes (prefix: /api/mfg/pdm) =====
        // Product
        .route("/api/mfg/pdm/product", get(modules::pdm::product::list_products))
        .route("/api/mfg/pdm/product", post(modules::pdm::product::create_product))
        .route("/api/mfg/pdm/product/:id", get(modules::pdm::product::get_product))
        .route("/api/mfg/pdm/product/:id", put(modules::pdm::product::update_product))
        .route("/api/mfg/pdm/product/:id", delete(modules::pdm::product::delete_product))
        // Material
        .route("/api/mfg/pdm/material", get(modules::pdm::material::list_materials))
        .route("/api/mfg/pdm/material", post(modules::pdm::material::create_material))
        .route("/api/mfg/pdm/material/:id", get(modules::pdm::material::get_material))
        .route("/api/mfg/pdm/material/:id", put(modules::pdm::material::update_material))
        // Configuration
        .route("/api/mfg/pdm/configuration", get(modules::pdm::configuration::list_configurations))
        .route("/api/mfg/pdm/configuration", post(modules::pdm::configuration::create_configuration))
        .route("/api/mfg/pdm/configuration/:id", get(modules::pdm::configuration::get_configuration))
        .route("/api/mfg/pdm/configuration/:id", put(modules::pdm::configuration::update_configuration))
        // Document
        .route("/api/mfg/pdm/document", get(modules::pdm::document::list_documents))
        .route("/api/mfg/pdm/document", post(modules::pdm::document::create_document))
        .route("/api/mfg/pdm/document/:id", get(modules::pdm::document::get_document))
        .route("/api/mfg/pdm/document/:id", put(modules::pdm::document::update_document))
        // Version
        .route("/api/mfg/pdm/version", get(modules::pdm::version::list_versions))
        .route("/api/mfg/pdm/version", post(modules::pdm::version::create_version))
        .route("/api/mfg/pdm/version/:id", get(modules::pdm::version::get_version))
        .route("/api/mfg/pdm/version/:id", put(modules::pdm::version::update_version))

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

    let port = std::env::var("MANUFACTURING_PORT")
        .unwrap_or_else(|_| "8030".to_string())
        .parse()
        .unwrap_or(8030);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Manufacturing Service is running at http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

// ==================== 公共处理函数 ====================

async fn home() -> &'static str {
    "TOPEMS Manufacturing Service API\n\n\
     Unified service for MES (Manufacturing Execution System) and PDM (Product Data Management)\n\n\
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
        "service": "manufacturing-service",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "modules": {
            "mes": "active",
            "pdm": "active"
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
