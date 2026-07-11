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

mod middleware;
mod models;
mod modules;
mod services;
mod shared;

use std::net::SocketAddr;

use axum::{extract::State, routing::get, Json, Router};
use axum_prometheus::PrometheusMetricLayer;
use sqlx::PgPool;

use topems_shared::{
    auth_middleware, create_cors_layer, get_api_info_handler, init_telemetry, rls_middleware,
    simple_health_check, telemetry_middleware, ApiResponse, AuthState, ServiceHealth,
    SimpleHealthConfig,
};

// ==================== 应用状态 ====================

pub use shared::AppState;

// ==================== 主入口 ====================

#[tokio::main]
async fn main() {
    _ = dotenv::dotenv();

    let _telemetry_guard = init_telemetry("topems-pdm");

    tracing::info!("🚀 TOPEMS PDM Service starting...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        env::var("DATABASE_URL")
            .expect("DATABASE_URL environment variable is required")
            .to_string()
    });

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
            std::process::exit(1);
        }
    };

    if let Err(e) = models::init_database(&pool).await {
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
        .route(
            "/api/plugins/info",
            get(modules::pdm_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::pdm_plugin::plugin_health_check),
        )
        .route("/api", get(|| get_api_info_handler("pdm-service")))
        .route("/api/info", get(|| get_api_info_handler("pdm-service")))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        );

    // Protected routes (auth required)
    let protected_routes = Router::new()
        .merge(modules::create_api_routes())
        // Health & Metrics
        .route("/api/v1/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
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

    let port = std::env::var("PDM_PORT")
        .unwrap_or_else(|_| "8031".to_string())
        .parse()
        .unwrap_or(8031);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ PDM Service is running at http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .unwrap_or_else(|e| {
            tracing::error!("Failed to bind to {}: {}", addr, e);
            std::process::exit(1);
        });

    axum::serve(listener, app.into_make_service())
        .await
        .unwrap_or_else(|e| {
            tracing::error!("Server error: {}", e);
            std::process::exit(1);
        });
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
