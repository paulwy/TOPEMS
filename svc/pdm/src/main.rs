//! TOPEMS PDM Service
//!
//! Product Data Management Service

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

    init_logging("topems-pdm");

    tracing::info!("🚀 TOPEMS PDM Service starting...");

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

    if let Err(e) = modules::pdm::init_database(&pool).await {
        tracing::warn!("PDM database init warning: {}", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-pdm").with_db(pool.clone());

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
        .route("/api", get(|| get_api_info_handler("pdm-service")))
        .route("/api/info", get(|| get_api_info_handler("pdm-service")))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    // Protected routes (auth required)
    let protected_routes = Router::new()
        // ===== PDM routes (prefix: /api/pdm) =====
        // Product
        .route("/api/pdm/products", get(modules::pdm::product::list_products))
        .route("/api/pdm/products", post(modules::pdm::product::create_product))
        .route("/api/pdm/products/{id}", get(modules::pdm::product::get_product))
        .route("/api/pdm/products/{id}", put(modules::pdm::product::update_product))
        .route("/api/pdm/products/{id}", delete(modules::pdm::product::delete_product))
        // Material
        .route("/api/pdm/materials", get(modules::pdm::material::list_materials))
        .route("/api/pdm/materials", post(modules::pdm::material::create_material))
        .route("/api/pdm/materials/{id}", get(modules::pdm::material::get_material))
        .route("/api/pdm/materials/{id}", put(modules::pdm::material::update_material))
        // Configuration
        .route("/api/pdm/configurations", get(modules::pdm::configuration::list_configurations))
        .route("/api/pdm/configurations", post(modules::pdm::configuration::create_configuration))
        .route("/api/pdm/configurations/{id}", get(modules::pdm::configuration::get_configuration))
        .route("/api/pdm/configurations/{id}", put(modules::pdm::configuration::update_configuration))
        // Document
        .route("/api/pdm/documents", get(modules::pdm::document::list_documents))
        .route("/api/pdm/documents", post(modules::pdm::document::create_document))
        .route("/api/pdm/documents/{id}", get(modules::pdm::document::get_document))
        .route("/api/pdm/documents/{id}", put(modules::pdm::document::update_document))
        // Version
        .route("/api/pdm/versions", get(modules::pdm::version::list_versions))
        .route("/api/pdm/versions", post(modules::pdm::version::create_version))
        .route("/api/pdm/versions/{id}", get(modules::pdm::version::get_version))
        .route("/api/pdm/versions/{id}", put(modules::pdm::version::update_version))
        // Production Processes
        .route("/api/pdm/production-processes", get(modules::pdm::production_process::list_processes))
        .route("/api/pdm/production-processes", post(modules::pdm::production_process::create_process))
        .route("/api/pdm/production-processes/{id}", get(modules::pdm::production_process::get_process))
        .route("/api/pdm/production-processes/{id}", put(modules::pdm::production_process::update_process))
        .route("/api/pdm/production-processes/{id}", delete(modules::pdm::production_process::delete_process))
        // Production Steps
        .route("/api/pdm/production-steps", get(modules::pdm::production_step::list_steps))
        .route("/api/pdm/production-steps", post(modules::pdm::production_step::create_step))
        .route("/api/pdm/production-steps/{id}", get(modules::pdm::production_step::get_step))
        .route("/api/pdm/production-steps/{id}", put(modules::pdm::production_step::update_step))
        .route("/api/pdm/production-steps/{id}", delete(modules::pdm::production_step::delete_step))
        // Production Formulas
        .route("/api/pdm/production-formulas", get(modules::pdm::production_formula::list_formulas))
        .route("/api/pdm/production-formulas", post(modules::pdm::production_formula::create_formula))
        .route("/api/pdm/production-formulas/{id}", get(modules::pdm::production_formula::get_formula))
        .route("/api/pdm/production-formulas/{id}", put(modules::pdm::production_formula::update_formula))
        .route("/api/pdm/production-formulas/{id}", delete(modules::pdm::production_formula::delete_formula))
        // Production Batches
        .route("/api/pdm/production-batches", get(modules::pdm::production_batch::list_batches))
        .route("/api/pdm/production-batches", post(modules::pdm::production_batch::create_batch))
        .route("/api/pdm/production-batches/{id}", get(modules::pdm::production_batch::get_batch))
        .route("/api/pdm/production-batches/{id}", put(modules::pdm::production_batch::update_batch))
        .route("/api/pdm/production-batches/{id}", delete(modules::pdm::production_batch::delete_batch))
        // Production Statistics
        .route("/api/pdm/production-statistics", get(modules::pdm::production_statistics::list_statistics))
        .route("/api/pdm/statistics", get(modules::pdm::production_statistics::get_statistics))

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

    let port = std::env::var("PDM_PORT")
        .unwrap_or_else(|_| "8031".to_string())
        .parse()
        .unwrap_or(8031);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ PDM Service is running at http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

// ==================== 公共处理函数 ====================

async fn home() -> &'static str {
    "TOPEMS PDM Service API\n\n\
     Product Data Management\n\n\
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
        "service": "pdm-service",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "modules": {
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
