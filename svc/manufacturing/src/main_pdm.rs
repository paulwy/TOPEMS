//! TOPEMS PDM Service (Product Data Management)

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
    "TOPEMS PDM Service"
}

async fn health() -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(serde_json::json!({
        "service": "pdm",
        "status": "healthy"
    }), "OK"))
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

    // Initialize PDM database
    if let Err(e) = modules::pdm::init_database(&pool).await {
        tracing::warn!("PDM module database init warning: {}", e);
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
        .route("/api/info", get(|| get_api_info_handler("pdm-service")))
        .route("/api/plugins/info", get(modules::pdm::plugin::get_plugin_info))
        .route("/api/plugins/health", get(modules::pdm::plugin::plugin_health_check))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    // Protected routes
    let protected_routes = Router::new()
        // Product
        .route("/api/pdm/product", get(modules::pdm::product::list_products))
        .route("/api/pdm/product", post(modules::pdm::product::create_product))
        .route("/api/pdm/product/{id}", get(modules::pdm::product::get_product))
        .route("/api/pdm/product/{id}", put(modules::pdm::product::update_product))
        .route("/api/pdm/product/{id}", delete(modules::pdm::product::delete_product))
        // Material
        .route("/api/pdm/material", get(modules::pdm::material::list_materials))
        .route("/api/pdm/material", post(modules::pdm::material::create_material))
        .route("/api/pdm/material/{id}", get(modules::pdm::material::get_material))
        .route("/api/pdm/material/{id}", put(modules::pdm::material::update_material))
        // Configuration
        .route("/api/pdm/configuration", get(modules::pdm::configuration::list_configurations))
        .route("/api/pdm/configuration", post(modules::pdm::configuration::create_configuration))
        .route("/api/pdm/configuration/{id}", get(modules::pdm::configuration::get_configuration))
        .route("/api/pdm/configuration/{id}", put(modules::pdm::configuration::update_configuration))
        // Document
        .route("/api/pdm/document", get(modules::pdm::document::list_documents))
        .route("/api/pdm/document", post(modules::pdm::document::create_document))
        .route("/api/pdm/document/{id}", get(modules::pdm::document::get_document))
        .route("/api/pdm/document/{id}", put(modules::pdm::document::update_document))
        // Version
        .route("/api/pdm/version", get(modules::pdm::version::list_versions))
        .route("/api/pdm/version", post(modules::pdm::version::create_version))
        .route("/api/pdm/version/{id}", get(modules::pdm::version::get_version))
        .route("/api/pdm/version/{id}", put(modules::pdm::version::update_version))
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

    // Auto-register to Core
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::pdm::plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}
