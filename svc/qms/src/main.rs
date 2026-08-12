//! TOPEMS QMS Service
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
mod models;
mod openapi;
mod shared;

pub mod modules;

use axum::{extract::State, routing::get, Json, Router};
use utoipa::OpenApi;

use topems_shared::{ApiResponse, AuthState};
use topems_shared_bootstrap::{bootstrap_service, build_application, run, ServiceConfig};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};
use topems_shared_event::event::EventPublisher;
use topems_shared_service_client::service_client::{create_workflow_client, WorkflowServiceClient};

pub use shared::*;

// ==================== 应用状态 ====================

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: sqlx::PgPool,
    pub health_config: SimpleHealthConfig,
    pub event_publisher: Option<std::sync::Arc<EventPublisher>>,
    pub workflow_client: WorkflowServiceClient,
}

impl axum::extract::FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl axum::extract::FromRef<AppState> for WorkflowServiceClient {
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
    };

    let ctx = bootstrap_service(&config).await?;

    // QMS 模块 DB 初始化
    if let Err(e) = modules::init_database(&ctx.db).await {
        tracing::warn!("QMS module database init warning: {}", e);
    }

    let workflow_url = std::env::var("WORKFLOW_SERVICE_URL")
        .unwrap_or_else(|_| "http://localhost:8000".to_string());
    let workflow_client = create_workflow_client().expect("工作流服务客户端初始化失败");
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
        .with_state(api_state.clone());

    // Protected routes（QMS create_routes 返回 Router<AppState>，最后 with_state 擦除类型）
    let protected_routes = Router::new()
        .merge(modules::create_routes())
        .route("/api/health/detailed", get(detailed_health))
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
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let response = serde_json::json!({
        "service": "qms-service",
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
