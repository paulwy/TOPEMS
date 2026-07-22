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

mod event_handlers;
mod middleware;
mod models;
mod modules;
mod services;
mod shared;

use std::env;
use std::net::SocketAddr;
use std::sync::Arc;

use axum::{extract::State, routing::get, Json, Router};
use axum_prometheus::PrometheusMetricLayer;
use sqlx::PgPool;

use topems_shared::{
    auth_middleware, create_cors_layer, get_api_info_handler, init_telemetry,
    rate_limit_middleware, register_routes_with_legacy_alias, rls_middleware, simple_health_check,
    telemetry_middleware, ApiResponse, AuthState, RateLimitConfig, RateLimitMiddleware,
    ServiceHealth, SimpleHealthConfig,
};
use utoipa::OpenApi;

// ==================== 应用状态 ====================

pub use shared::AppState;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "PDM", description = "产品数据管理"),
        (name = "BOM", description = "BOM管理"),
        (name = "Engineering", description = "工程管理"),
        (name = "Change", description = "工程变更"),
        (name = "Document", description = "文档管理"),
        (name = "Health", description = "健康检查"),
    ),
    info(
        title = "TOPEMS-pdm API",
        version = "1.0.0",
        description = "TOPEMS 产品数据管理服务 - BOM管理、工程变更、文档管理",
    ),
    servers(
        (url = "http://localhost:8022", description = "本地开发环境"),
    )
)]
struct ApiDoc;

// ==================== 主入口 ====================

#[tokio::main]
async fn main() {
    _ = dotenv::dotenv();

    let _telemetry_guard = init_telemetry("topems-pdm");

    tracing::info!("🚀 TOPEMS PDM Service starting...");

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
            std::process::exit(1);
        }
    };

    if let Err(e) = models::init_database(&pool).await {
        tracing::warn!("PDM database init warning: {}", e);
    }

    if let Err(e) = event_handlers::start_event_subscribers(pool.clone()).await {
        tracing::warn!("⚠️ PDM 事件订阅者启动失败: {}", e);
    }

    let event_publisher = match topems_shared::event::EventPublisher::new("topems-pdm") {
        Ok(publisher) => {
            tracing::info!("📢 事件发布服务初始化成功");
            Some(std::sync::Arc::new(publisher))
        }
        Err(e) => {
            tracing::warn!("⚠️ 事件发布服务初始化失败（不阻塞启动）: {}", e);
            None
        }
    };

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-pdm").with_db(pool.clone());

    let state = AppState {
        auth_state,
        pool,
        health_config,
        event_publisher,
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
        .route("/api/health/detailed", get(detailed_health))
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

    // Protected routes (auth required)
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
        "/api/pdm",
        &["/api/v1/pdm"],
        protected_routes,
    )
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
