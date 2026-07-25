#![allow(dead_code)]

use crate::shared::AppState;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Instant;

use axum::{
    extract::State,
    routing::get,
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use utoipa::OpenApi;

use topems_shared::{
    auth_middleware, create_cors_layer, get_api_info_handler, init_telemetry,
    rate_limit_middleware, rls_middleware, simple_health_check, telemetry_middleware,
    ApiResponse, AuthState, RateLimitConfig, RateLimitMiddleware, ServiceHealth,
    SimpleHealthConfig, SystemMetrics,
};

mod shared;
mod openapi;

pub mod modules;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    _ = dotenv::dotenv();

    let _telemetry_guard = init_telemetry("topems-master-data");

    tracing::info!("🚀 TOPEMS Master Data Service starting...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        std::process::exit(1);
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
            panic!("Cannot connect to database: {}", e);
        }
    };

    let auth_state = AuthState::from_env();
    let _health_config = SimpleHealthConfig::new("topems-master-data").with_db(pool.clone());

    let state = AppState {
        auth_state,
        db: pool,
        metrics: Arc::new(SystemMetrics::new()),
        start_time: Instant::now(),
    };

    let cors = create_cors_layer();

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api", get(|| get_api_info_handler("master-data-service")))
        .route("/api/info", get(|| get_api_info_handler("master-data-service")))
        .route("/metrics", get(move || async move { metric_handle.render() }));

    let protected_routes = Router::new()
        .merge(modules::create_routes())
        .route("/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.db.clone(),
            rls_middleware,
        ));

    let rate_limit_config = RateLimitConfig::new(200, 60).with_by_user_id(false).with_by_ip(true);
    let rate_limiter = Arc::new(RateLimitMiddleware::new(rate_limit_config));
    let protected_routes = protected_routes.layer(axum::middleware::from_fn({
        let mw = rate_limiter.clone();
        move |req, next| {
            let mw = mw.clone();
            async move { rate_limit_middleware(mw, req, next).await }
        }
    }));

    let app = Router::new()
        .merge(public_routes)
        .nest("/api/master-data", protected_routes)
        .route(
            "/api-docs/openapi.json",
            get(|| async move { axum::Json(openapi::MasterDataApiDoc::openapi()) }),
        )
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(cors)
        .layer(prometheus_layer)
        .with_state(state);

    let port = std::env::var("MASTER_DATA_PORT")
        .unwrap_or_else(|_| "8090".to_string())
        .parse()
        .unwrap_or(8090);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Master Data Service is running at http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}

async fn home() -> &'static str {
    "TOPEMS Master Data Service API\n\n\
     Master Data Management - Quality Closed Loop, Auto-Fix, Data Governance AI\n\n\
     - /health - Health check"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    let config = SimpleHealthConfig::new("topems-master-data").with_db(state.db.clone());
    simple_health_check(&config).await
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.db).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let response = serde_json::json!({
        "service": "topems-master-data",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "modules": {
            "quality_v51": "active",
            "lineage_v52": "active",
            "knowledge_v53": "active",
            "versioning_v54": "active",
            "commercial_v55": "active",
            "disaster_v56": "active",
            "semantic_v57": "active",
            "governance_v58": "active",
            "ai_governance_v59": "active",
            "metadata_v60": "active"
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