//! TOPEMS EHS Service
//!
//! Environment Health Safety Service

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

use std::net::SocketAddr;
use std::sync::Arc;

use axum::{extract::State, routing::get, Json, Router};
use axum_prometheus::PrometheusMetricLayer;

use topems_shared::service_client::create_workflow_client;
use topems_shared::{
    auth_middleware, create_cors_layer, get_api_info_handler, init_telemetry,
    rate_limit_middleware, register_routes_with_legacy_alias, rls_middleware, simple_health_check,
    telemetry_middleware, ApiResponse, AuthState, RateLimitConfig, RateLimitMiddleware,
    ServiceHealth, SimpleHealthConfig,
};
use utoipa::OpenApi;

pub use shared::*;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "EHS", description = "环境健康安全"),
        (name = "Safety", description = "安全管理"),
        (name = "Inspection", description = "安全检查"),
        (name = "Hazard", description = "隐患管理"),
        (name = "Accident", description = "事故报告"),
        (name = "Emergency", description = "应急预案"),
        (name = "Health", description = "健康检查"),
    ),
    info(
        title = "TOPEMS-ehs API",
        version = "1.0.0",
        description = "TOPEMS 环境健康安全服务 - 安全检查、隐患管理、事故报告、应急预案",
    ),
    servers(
        (url = "http://localhost:8025", description = "本地开发环境"),
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    _ = dotenv::dotenv();

    let _telemetry_guard = init_telemetry("topems-ehs");

    tracing::info!("🚀 TOPEMS EHS Service starting...");

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

    if let Err(e) = models::init_database(&pool).await {
        tracing::warn!("EHS database init warning: {}", e);
    }

    let event_publisher = match topems_shared::event::EventPublisher::new("topems-ehs") {
        Ok(publisher) => {
            tracing::info!("📢 事件发布服务初始化成功");
            Some(std::sync::Arc::new(publisher))
        }
        Err(e) => {
            tracing::warn!("⚠️ 事件发布服务初始化失败（不阻塞启动）: {}", e);
            None
        }
    };

    if let Err(e) =
        event_handlers::start_event_subscribers(pool.clone(), event_publisher.clone()).await
    {
        tracing::warn!("⚠️ EHS 事件订阅者启动失败: {}", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-ehs").with_db(pool.clone());

    let workflow_url = std::env::var("WORKFLOW_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let workflow_client = create_workflow_client().expect("工作流服务客户端初始化失败");
    tracing::info!("🔗 工作流服务客户端初始化成功: {}", workflow_url);

    let hazard_cache = Arc::new(shared::cache::InMemoryCache::new(
        std::time::Duration::from_secs(300),
    ));
    let training_cache = Arc::new(shared::cache::InMemoryCache::new(
        std::time::Duration::from_secs(120),
    ));
    let dict_cache = Arc::new(shared::cache::InMemoryCache::new(
        std::time::Duration::from_secs(600),
    ));

    tracing::info!("💾 内存缓存初始化完成（隐患/培训/字典）");

    let state = AppState {
        auth_state,
        pool,
        health_config,
        event_publisher,
        workflow_client,
        hazard_cache,
        training_cache,
        dict_cache,
    };

    let cors = create_cors_layer();

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route(
            "/api/plugins/info",
            get(modules::ehs_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::ehs_plugin::plugin_health_check),
        )
        .route("/api", get(|| get_api_info_handler("ehs-service")))
        .route("/api/info", get(|| get_api_info_handler("ehs-service")))
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
        "/api/ehs",
        &["/api/v1/ehs"],
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

    let port = std::env::var("EHS_PORT")
        .unwrap_or_else(|_| "8052".to_string())
        .parse()
        .unwrap_or(8052);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ EHS Service is running at http://{}", addr);

    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::ehs_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}

async fn home() -> &'static str {
    "TOPEMS EHS Service API\n\n\
     Environment Health Safety\n\n\
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
