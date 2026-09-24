mod event_handlers;

mod db;
mod models;
mod modules;
mod schema_defense;
mod services;
mod shared;

use anyhow::Result;
use axum::{extract::State, Json, Router};
use axum_prometheus::PrometheusMetricLayer;
use serde_json::json;
use sqlx::PgPool;
use std::sync::Arc;
use utoipa::OpenApi;

use topems_shared::{
    auth_middleware, create_api_info_router, create_cors_layer, register_routes_with_legacy_alias,
    ApiResponse,
};
use topems_shared_auth::middleware::require_permission;
use topems_shared_auth::security::{rate_limit_middleware, RateLimitConfig, RateLimitMiddleware};
use topems_shared_bootstrap::{bootstrap_service, resolve_port, run, Application, ServiceConfig};
use topems_shared_core::logging::request_context_middleware;
use topems_shared_db::rls::rls_middleware;
use topems_shared_observability::telemetry::telemetry_middleware;

use db::repository::*;

use modules::mobile_plugin::create_routes;
use shared::AppState;

async fn init_database(pool: &PgPool) -> Result<(), sqlx::Error> {
    let sql_statements = include_str!("../init.sql");
    for stmt in sql_statements.split(';').filter(|s| !s.trim().is_empty()) {
        sqlx::query(stmt.trim()).execute(pool).await?;
    }

    if let Err(e) = crate::schema_defense::run_schema_migration_and_verify(pool).await {
        tracing::error!("[mobile] Schema 防御检查失败: {:?}", e);
    }
    Ok(())
}

#[tokio::main]
async fn main() -> Result<()> {
    std::env::set_var("SEARCH_PATH", "mobile, public");

    let config = ServiceConfig {
        name: "topems-mobile",
        port: 8070,
        port_env_var: Some("MOBILE_PORT"),
        max_db_connections: 20,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/mobile",
        legacy_prefixes: &["/api/v1/mobile", "/api/core/mobile/v1"],
        init_telemetry: true,
    };
    let ctx = bootstrap_service(&config).await?;

    // Mobile 专属初始化：建表 + 离线记录表
    if let Err(e) = init_database(ctx.migrate_pool.as_ref().unwrap_or(&ctx.db)).await {
        tracing::warn!("数据库初始化警告: {}", e);
    } else {
        tracing::info!("✅ 数据库表初始化完成");
    }
    if let Err(e) =
        modules::offline_records::init_database(ctx.migrate_pool.as_ref().unwrap_or(&ctx.db)).await
    {
        tracing::warn!("离线记录表初始化警告: {}", e);
    }

    if let Err(e) =
        event_handlers::start_event_subscribers(ctx.db.clone(), ctx.event_publisher.clone()).await
    {
        tracing::warn!("⚠️ MOBILE 事件订阅者启动失败: {}", e);
    }

    // 6 个服务客户端初始化（统一服务间认证：service token，最小权限 + 短时效）
    let jwt_secret = ctx.auth_state.jwt_secret.clone();
    let (
        wms_client,
        hrm_client,
        workflow_client,
        notification_client,
        mes_api_client,
        qms_api_client,
    ) = crate::shared::build_service_clients(&jwt_secret).await;
    let app_state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        event_publisher: ctx.event_publisher.clone(),
        wms_client,
        hrm_client,
        workflow_client,
        notification_client,
        mes_api_client,
        qms_api_client,
    };

    // Public routes (no auth)
    let public_routes = Router::new()
        .route("/health", axum::routing::get(health_check))
        .merge(create_routes());

    // Protected routes
    let protected_routes = crate::shared::build_protected_routes(app_state.clone());
    let openapi_json = serde_json::to_string_pretty(&services::openapi::MobileApiDoc::openapi())
        .unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        });
    let openapi_json_for_route = openapi_json.clone();
    let openapi_routes = Router::new()
        .route(
            "/api-docs/openapi.json",
            axum::routing::get(move || async move { openapi_json_for_route.clone() }),
        )
        .with_state(app_state.clone());

    // Protected 中间件链：tenant → auth → rls → request_context → rate_limit → state
    let protected_routes = protected_routes
        .layer(axum::middleware::from_fn_with_state(
            app_state.pool.clone(),
            topems_shared_auth::tenant_middleware(),
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn(require_permission(
            "mobile:admin",
        )))
        .layer(axum::middleware::from_fn_with_state(
            app_state.pool.clone(),
            rls_middleware,
        ))
        .layer(axum::middleware::from_fn(request_context_middleware));

    let rate_limit_config = RateLimitConfig::new(200, 60)
        .with_by_user_id(false)
        .with_by_ip(true);
    let rate_limiter = Arc::new(RateLimitMiddleware::new(rate_limit_config));
    let protected_routes = protected_routes
        .layer(axum::middleware::from_fn({
            let mw = rate_limiter.clone();
            move |req, next| {
                let mw = mw.clone();
                async move { rate_limit_middleware(mw, req, next).await }
            }
        }))
        .with_state(app_state.clone());

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let metrics_route = Router::new()
        .route(
            "/metrics",
            axum::routing::get(move || async move { metric_handle.render() }),
        )
        .with_state(app_state.clone());

    let cors = create_cors_layer();

    let app = register_routes_with_legacy_alias(
        Router::new()
            .merge(public_routes)
            .merge(openapi_routes)
            .merge(metrics_route),
        config.api_prefix,
        config.legacy_prefixes,
        protected_routes,
    )
    .merge(create_api_info_router("topems-mobile"))
    .with_state(app_state.clone())
    .layer(axum::middleware::from_fn(telemetry_middleware))
    .layer(prometheus_layer)
    .layer(cors);

    // 启动时自动注册到统一核心
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::mobile_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let app = Application {
        router: app,
        port: resolve_port(&config),
        name: config.name,
    };
    run(app).await?;
    Ok(())
}

use topems_shared_core::health::{build_health_response, ServiceHealth};

async fn health_check() -> ServiceHealth {
    build_health_response("topems-mobile", true)
}

async fn list_mobile_tasks(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let records = match db_get_mobile_tasks(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("获取移动任务失败: {}", e);
            vec![]
        }
    };
    let total = records.len() as i64;
    Json(ApiResponse::success(
        json!({ "items": records, "total": total }),
        "获取移动任务成功",
    ))
}
