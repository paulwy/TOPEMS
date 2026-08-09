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

use axum::{extract::State, routing::get, Json, Router};
use utoipa::OpenApi;

use topems_shared::ApiResponse;
use topems_shared_bootstrap::{bootstrap_service, build_application, run, ServiceConfig};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};

pub use shared::AppState;

use modules::ApiDoc;

// ==================== 主入口 ====================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "pdm, public");

    let config = ServiceConfig {
        name: "topems-pdm",
        port: 8031,
        port_env_var: Some("PDM_PORT"),
        max_db_connections: 10,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/pdm",
        legacy_prefixes: &["/api/v1/pdm"],
    };

    let ctx = bootstrap_service(&config).await?;

    if let Err(e) = models::init_database(&ctx.db).await {
        tracing::warn!("PDM database init warning: {}", e);
    }
    if let Err(e) = init_db(&ctx.db).await {
        tracing::warn!("PDM AC-5 ref 表初始化警告: {}", e);
    }
    if let Err(e) = event_handlers::start_event_subscribers(ctx.db.clone()).await {
        tracing::warn!("⚠️ PDM 事件订阅者启动失败: {}", e);
    }

    let api_state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        health_config: SimpleHealthConfig::new("topems-pdm").with_db(ctx.db.clone()),
        event_publisher: ctx.event_publisher.clone(),
    };

    // Public routes（stateful：/health + /api/health/detailed + /api/plugins/*）
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
        .route("/api/health/detailed", get(detailed_health))
        .with_state(api_state.clone());

    // Protected routes（先 merge 业务路由 + tenant_middleware → build_application 再加 auth/rls/rate_limit）
    let protected_routes = Router::new()
        .merge(modules::create_api_routes())
        .layer(axum::middleware::from_fn(
            middleware::tenant::tenant_middleware,
        ))
        .with_state(api_state.clone());

    let openapi_json = serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_default();
    let app = build_application(
        &ctx,
        &config,
        public_routes,
        protected_routes,
        Some(openapi_json),
    );

    run(app).await?;
    Ok(())
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

async fn init_db(pool: &sqlx::PgPool) -> Result<(), sqlx::Error> {
    // V32.0 AC-5: 本地主数据引用表，用于跨服务 master_data_id 关联
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS pdm_master_data_refs (
            master_data_id   VARCHAR(128) PRIMARY KEY,
            tenant_id        UUID NOT NULL,
            domain           VARCHAR(32) NOT NULL,
            code             VARCHAR(128) NOT NULL,
            name             VARCHAR(256),
            status           VARCHAR(32) DEFAULT 'active',
            source_service   VARCHAR(64) NOT NULL,
            local_entity_type VARCHAR(64),
            local_entity_id  UUID,
            payload_snapshot JSONB,
            last_synced_at   TIMESTAMPTZ DEFAULT NOW(),
            created_at       TIMESTAMPTZ DEFAULT NOW(),
            updated_at       TIMESTAMPTZ DEFAULT NOW()
        )
        "#,
    )
    .execute(pool)
    .await?;
    tracing::info!("[pdm] pdm_master_data_refs 表已就绪（AC-5 本地主数据引用）");
    Ok(())
}
