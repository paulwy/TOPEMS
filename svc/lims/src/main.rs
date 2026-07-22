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
use std::sync::Arc;

use axum::{
    extract::State,
    routing::{get, post, put},
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use sqlx::PgPool;

use topems_shared::{
    auth_middleware, create_cors_layer, create_database_pool, get_api_info_handler, init_telemetry,
    rate_limit_middleware, register_routes_with_legacy_alias, rls_middleware, simple_health_check,
    telemetry_middleware, ApiResponse, AuthState, DatabaseConfig, RateLimitConfig,
    RateLimitMiddleware, ServiceHealth, SimpleHealthConfig,
};
use utoipa::OpenApi;

pub use shared::*;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "LIMS", description = "实验室信息管理"),
        (name = "Sample", description = "样品管理"),
        (name = "Instrument", description = "仪器管理"),
        (name = "Test", description = "检测管理"),
        (name = "Report", description = "检测报告"),
        (name = "Health", description = "健康检查"),
    ),
    info(
        title = "TOPEMS-lims API",
        version = "1.0.0",
        description = "TOPEMS 实验室信息管理服务 - 样品管理、仪器管理、检测报告",
    ),
    servers(
        (url = "http://localhost:8027", description = "本地开发环境"),
    )
)]
struct ApiDoc;

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

    let rate_limit_config = RateLimitConfig::new(200, 60)
        .with_by_user_id(false)
        .with_by_ip(true);
    let rate_limiter = Arc::new(RateLimitMiddleware::new(rate_limit_config));
    let rate_limit_layer = axum::middleware::from_fn({
        let mw = rate_limiter.clone();
        move |req, next| {
            let mw = mw.clone();
            async move { rate_limit_middleware(mw, req, next).await }
        }
    });

    let protected_routes = Router::new()
        .merge(modules::create_api_routes())
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
        ))
        .layer(rate_limit_layer);

    let app = register_routes_with_legacy_alias(
        Router::new().merge(public_routes),
        "/api/lims",
        &["/api/v1/lims"],
        protected_routes,
    )
    .route("/api/health/detailed", get(detailed_health))
    .route(
        "/api-docs/openapi.json",
        get(|| async {
            serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_else(|e| {
                tracing::error!("Failed to serialize OpenAPI spec: {}", e);
                "{}".to_string()
            })
        }),
    )
    .layer(axum::middleware::from_fn(telemetry_middleware))
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
        modules::lims_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app.into_make_service()).await?;

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
