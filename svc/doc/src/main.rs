// TOPEMS Document Service
// =============================================================================

mod models;
mod modules;
mod services;
mod shared;

use std::sync::Arc;

use crate::shared::AppState;

use axum::{
    extract::{FromRef, State},
    routing::get,
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use std::env;
use std::net::SocketAddr;

use topems_shared::{
    auth_middleware, create_api_info_router, create_cors_layer, init_telemetry,
    rate_limit_middleware, register_routes_with_legacy_alias, telemetry_middleware, ApiResponse,
    AuthState, DependencyHealth, HealthStatus, RateLimitConfig, RateLimitMiddleware, ServiceHealth,
};
use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    tags(
        (name = "Document", description = "文档管理"),
        (name = "Knowledge", description = "知识库"),
        (name = "Version", description = "版本控制"),
        (name = "Health", description = "健康检查"),
    ),
    info(
        title = "TOPEMS-doc API",
        version = "1.0.0",
        description = "TOPEMS 文档服务 - 文档管理、版本控制、知识库",
    ),
    servers(
        (url = "http://localhost:8012", description = "本地开发环境"),
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv::dotenv().ok();
    let _telemetry_guard = init_telemetry("topems-doc");

    tracing::info!("🚀 TOPEMS Document Service starting...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        std::process::exit(1);
    });

    let pool = match sqlx::postgres::PgPoolOptions::new()
        .max_connections(20)
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
        tracing::error!("Failed to init document database: {}", e);
        std::process::exit(1);
    }

    let auth_state = AuthState::from_env();

    let state = AppState {
        auth_state: auth_state.clone(),
        pool: pool.clone(),
    };

    let cors = create_cors_layer();

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route(
            "/api/plugins/info",
            get(modules::doc_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::doc_plugin::plugin_health_check),
        )
        .merge(create_api_info_router("topems-doc-service"))
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
        "/api/core/doc/v1",
        &["/api/v1/doc", "/api/doc"],
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

    let port = std::env::var("DOC_PORT")
        .unwrap_or_else(|_| "8012".to_string())
        .parse()
        .unwrap_or(8012);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Document Service is running at http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}

async fn home() -> &'static str {
    "TOPEMS Document Service API

Contains: Documents, Templates, Folders

Public Endpoints:
  GET  /           - API documentation
  GET  /health     - Health check
  GET  /api/info   - API information

Protected Endpoints (require JWT token):

Documents:
  GET    /api/doc/documents        - List all documents
  POST   /api/doc/documents        - Create a document
  GET    /api/doc/documents/{id}   - Get a document
  PUT    /api/doc/documents/{id}   - Update a document
  DELETE /api/doc/documents/{id}   - Delete a document

Templates:
  GET    /api/doc/templates        - List all templates
  POST   /api/doc/templates        - Create a template
  GET    /api/doc/templates/{id}   - Get a template
  PUT    /api/doc/templates/{id}   - Update a template
  DELETE /api/doc/templates/{id}   - Delete a template

Folders:
  GET    /api/doc/folders          - List all folders
  POST   /api/doc/folders          - Create a folder
  GET    /api/doc/folders/{id}     - Get a folder
  PUT    /api/doc/folders/{id}     - Update a folder
  DELETE /api/doc/folders/{id}     - Delete a folder
"
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
        service_name: "topems-doc".to_string(),
        status: overall_status,
        dependencies: Some(dependencies),
        ..ServiceHealth::healthy("topems-doc")
    };

    Json(ApiResponse::success(health, "Health check"))
}
