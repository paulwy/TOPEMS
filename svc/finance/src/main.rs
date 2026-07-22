// TOPEMS Finance Service
// =============================================================================

pub mod event_handlers;
pub mod models;
pub mod modules;
pub mod services;
pub mod shared;
pub mod workflow;

use axum::{extract::State, routing::get, Json, Router};
use axum_prometheus::PrometheusMetricLayer;
use std::env;
use std::net::SocketAddr;

use std::sync::Arc;

use crate::shared::AppState;
use crate::workflow::WorkflowClient;
use topems_shared::{
    auth_middleware, create_api_info_router, create_cors_layer, init_telemetry,
    rate_limit_middleware, register_routes_with_legacy_alias, telemetry_middleware, ApiResponse,
    AuthState, DependencyHealth, HealthStatus, RateLimitConfig, RateLimitMiddleware, ServiceHealth,
};
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "Finance", description = "财务管理"),
        (name = "Voucher", description = "凭证管理"),
        (name = "Accounting", description = "科目管理"),
        (name = "Report", description = "报表生成"),
        (name = "Cost", description = "成本核算"),
        (name = "Reconciliation", description = "对账中心"),
        (name = "Health", description = "健康检查"),
    ),
    info(
        title = "TOPEMS-finance API",
        version = "1.0.0",
        description = "TOPEMS 财务服务 - 凭证管理、科目管理、报表生成、成本核算",
    ),
    servers(
        (url = "http://localhost:8011", description = "本地开发环境"),
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-finance");

    tracing::info!("🚀 TOPEMS Finance Service starting...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        std::process::exit(1);
    });

    let pool = match sqlx::postgres::PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .idle_timeout(std::time::Duration::from_secs(300))
        .max_lifetime(std::time::Duration::from_secs(1800))
        .connect(&database_url)
        .await
    {
        Ok(p) => {
            tracing::info!("✅ Database connection successful");
            p
        }
        Err(e) => {
            tracing::error!("❌ Failed to connect to database: {}", e);
            std::process::exit(1);
        }
    };

    if let Err(e) = services::init_database(&pool).await {
        tracing::error!("Failed to init finance database: {}", e);
        std::process::exit(1);
    }

    let auth_state = AuthState::from_env();

    let workflow_url = std::env::var("WORKFLOW_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let workflow_client = WorkflowClient::new(&workflow_url);

    let event_publisher = match topems_shared::event::EventPublisher::new("topems-finance") {
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
        tracing::warn!("⚠️ Finance 事件订阅者启动失败: {}", e);
    }

    let state = AppState {
        auth_state: auth_state.clone(),
        pool: pool.clone(),
        workflow_client,
        event_publisher,
    };

    let cors = create_cors_layer();

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .merge(create_api_info_router("topems-finance-service"))
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

    let protected_routes = modules::create_routes()
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ))
        .layer(rate_limit_layer)
        .with_state(state.clone());

    let app = register_routes_with_legacy_alias(
        Router::new().merge(public_routes),
        "/api/core/finance/v1",
        &["/api/v1/finance", "/api/finance"],
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

    let port = std::env::var("FINANCE_PORT")
        .unwrap_or_else(|_| "8011".to_string())
        .parse()
        .unwrap_or(8011);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Finance Service is running at http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}

async fn home() -> &'static str {
    "TOPEMS Finance Service API\n\n\
     Contains: Accounts, Vouchers, Ledger, Reports\n\n\
     - /health - Health check\n\
     - /api/info - API information"
}

async fn health(State(state): State<AppState>) -> Json<ApiResponse<ServiceHealth>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => HealthStatus::Healthy,
        Err(_) => HealthStatus::Unhealthy,
    };

    let overall_status = if db_status == HealthStatus::Healthy {
        HealthStatus::Healthy
    } else {
        HealthStatus::Unhealthy
    };

    let dependencies = vec![DependencyHealth {
        name: "postgresql".to_string(),
        status: db_status,
        message: "database connection".to_string(),
    }];

    let health = ServiceHealth {
        service_name: "topems-finance".to_string(),
        status: overall_status,
        dependencies: Some(dependencies),
        ..ServiceHealth::healthy("topems-finance")
    };

    Json(ApiResponse::success(health, "Health check"))
}
