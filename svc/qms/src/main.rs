//! TOPEMS QMS Service
//!
//! Unified service for QMS (Quality Management), LIMS (Laboratory), and EHS (Environment Health Safety)

mod models;
mod openapi;
mod shared;

pub mod modules;

use axum::{extract::State, routing::get, Json, Router};
use utoipa::OpenApi;

use topems_shared::{ApiResponse, AuthState};
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{bootstrap_service, build_application, run, ServiceConfig};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::{TypedServiceClient, WorkflowApi};

pub use shared::*;

// ==================== 应用状态 ====================

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: sqlx::PgPool,
    pub health_config: SimpleHealthConfig,
    pub event_publisher: Option<std::sync::Arc<EventPublisher>>,
    pub workflow_client: TypedServiceClient<WorkflowApi>,
}

impl axum::extract::FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl axum::extract::FromRef<AppState> for TypedServiceClient<WorkflowApi> {
    fn from_ref(state: &AppState) -> Self {
        state.workflow_client.clone()
    }
}

// ==================== 主入口 ====================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "qms, public");

    let config = ServiceConfig {
        name: "topems-qms",
        port: 8050,
        port_env_var: Some("QMS_PORT"),
        max_db_connections: 10,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/qms",
        legacy_prefixes: &[],
        init_telemetry: true,
    };

    let ctx = bootstrap_service(&config).await?;

    // QMS 模块 DB 初始化
    if let Err(e) = modules::init_database(&ctx.db).await {
        tracing::warn!("QMS module database init warning: {}", e);
    }

    let workflow_url = std::env::var("WORKFLOW_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let jwt_secret = ctx.auth_state.jwt_secret.clone();
    let workflow_client = TypedServiceClient::<WorkflowApi>::from_env_default()
        .and_then(|c| c.with_service_token(&jwt_secret, "qms-service", &["workflow:read"]))
        .expect("工作流服务客户端初始化失败");
    tracing::info!("🔗 工作流服务客户端初始化成功: {}", workflow_url);

    let api_state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        health_config: SimpleHealthConfig::new("topems-qms").with_db(ctx.db.clone()),
        event_publisher: ctx.event_publisher.clone(),
        workflow_client,
    };

    // Public routes（需 AppState）
    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        // 服务间内部集成端点（仅内网可达）：挂载于 public 避免被 api_prefix nest 与鉴权链路
        // 覆盖——不经过 auth_middleware / require_permission；路径保持 /api/internal/ 原样
        .merge(modules::integration::integration_routes())
        .with_state(api_state.clone());

    // Protected routes（QMS create_routes 返回 Router<AppState>，最后 with_state 擦除类型）
    let protected_routes = Router::new()
        .merge(modules::create_routes())
        .route("/api/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn(require_permission("qms:admin")))
        .with_state(api_state.clone());

    let openapi_json =
        serde_json::to_string_pretty(&openapi::QmsApiDoc::openapi()).unwrap_or_default();
    let app = build_application(
        &ctx,
        &config,
        public_routes,
        protected_routes,
        Some(openapi_json),
    );

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::qms_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    run(app).await?;
    Ok(())
}

// ==================== 公共处理函数 ====================

async fn home() -> &'static str {
    "TOPEMS QMS Service API\n\n\
     Unified service for QMS, LIMS and EHS\n\n\
     - /health - Health check"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    use topems_shared_bootstrap::build_detailed_health_response;
    let modules = serde_json::json!({ "qms": "active", "lims": "active", "ehs": "active" });
    let resp = build_detailed_health_response(
        &state.pool,
        "qms-service",
        modules,
        "1.0.0",
        serde_json::json!({}),
    )
    .await;
    Json(ApiResponse::success(resp, "Detailed health check"))
}
