//! TOPEMS Analytics Service (API path: /api/bi)
//!
//! Note: The service directory is named "analytics" for historical reasons,
//! but all API routes are registered under /api/bi (not /api/analytics).
//! The Vite proxy and frontend apiClient.bi both use /api/bi.
//! Legacy alias: /api/v1/bi (via register_routes_with_legacy_alias).
//!
//! Unified service for BI (Business Intelligence) and Report

use axum::{
    extract::{Path, State},
    routing::{delete, get, post, put},
    Json, Router,
};

use topems_shared::ApiResponse;
use topems_shared_auth::middleware::require_permission;
use topems_shared_bootstrap::{
    bootstrap_service, build_application, prometheus_metrics_handler, run, ServiceConfig,
};
use topems_shared_core::health::{simple_health_check, ServiceHealth, SimpleHealthConfig};
use utoipa::OpenApi;

use topems_analytics::{modules, routes, shared::AppState, ApiDoc};

// ==================== 主入口（V2 shared-bootstrap 模板） ====================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "bi, public"); // V2026.08 schema 归位：analytics 表统一在 bi schema

    let config = ServiceConfig {
        name: "topems-analytics",
        port: 8060,
        port_env_var: Some("BI_PORT"),
        max_db_connections: 10,
        enable_events: false,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/bi",
        legacy_prefixes: &["/api/v1/bi"],
        init_telemetry: true,
    };

    let ctx = bootstrap_service(&config).await?;
    tracing::info!("🚀 TOPEMS Analytics Service starting...");

    // ── 模块级数据库初始化 ────────────────────────────────────────────
    if let Err(e) = modules::bi::init_database(&ctx.db).await {
        tracing::warn!("BI module database init warning: {}", e);
    }
    if let Err(e) = modules::report::init_database(&ctx.db).await {
        tracing::warn!("Report module database init warning: {}", e);
    }

    // ── Report Scheduler（后台定时任务） ──────────────────────────────
    let scheduler = modules::report::ReportScheduler::new(ctx.db.clone());
    if let Err(e) = scheduler.start().await {
        tracing::warn!("Failed to start report scheduler: {}", e);
    }

    // ── 向下兼容：ServiceContext → legacy AppState ────────────────────
    let health_config = SimpleHealthConfig::new("topems-analytics").with_db(ctx.db.clone());
    let app_state = AppState {
        auth_state: ctx.auth_state.clone(),
        pool: ctx.db.clone(),
        health_config,
    };

    // ── public_routes（无状态路由：不需要 State<AppState>） ──────────
    let public_routes = Router::new().route("/", get(home)).route(
        "/api/plugins/info",
        get(modules::bi::plugin::get_plugin_info),
    );

    // ── protected_routes（业务路由：需要 State<AppState>） ────────────
    // 中间件层（auth / rls / rate_limit）由 build_application 统一处理
    let protected_routes = routes::create_protected_routes(app_state.clone());

    // ── OpenAPI JSON ──────────────────────────────────────────────────
    let openapi_json = Some(
        serde_json::to_string_pretty(&ApiDoc::openapi()).unwrap_or_else(|e| {
            tracing::error!("Failed to serialize OpenAPI spec: {}", e);
            "{}".to_string()
        }),
    );

    // ── 组装 shared-bootstrap Application ─────────────────────────────
    let mut app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    // ── 有状态公共路由（/health, /metrics, WebSocket /ws/bi/*, /api/plugins/health）─
    // 放在 build_application 外层嵌套，避免 State 类型与顶层 Router<()> 冲突
    let stateful_public = Router::new()
        .route("/health", get(health))
        .route(
            "/metrics",
            get(move || async { prometheus_metrics_handler().await }),
        )
        // WebSocket: auth handled internally via token query param (subscribe message)
        .route(
            "/ws/bi/dashboard/{dashboard_id}",
            get(modules::bi::websocket::dashboard_websocket),
        )
        .route(
            "/api/plugins/health",
            get(modules::bi::plugin::plugin_health_check),
        )
        // ===== 兼容旧路径：/api/health/detailed（之前错误地硬编码全路径注册在
        //       protected_routes 内部，嵌套后变成 /api/bi/api/health/detailed；
        //       此处作为无前缀公共路由兜底，确保外部监控/调用方不 404） =====
        .route("/api/health/detailed", get(routes::detailed_health))
        .with_state(app_state);

    app.router = app.router.merge(stateful_public);

    tracing::info!(
        "✅ Analytics Service is running at http://0.0.0.0:{} (BI prefix: {})",
        app.port,
        config.api_prefix
    );

    run(app).await?;
    Ok(())
}

// ==================== 公共处理函数 ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/",
    tag = "Health",
    operation_id = "home",
    responses((status = 200, description = "OK")),
)]
async fn home() -> &'static str {
    "TOPEMS Analytics Service API\n\n\
     Unified service for BI (Business Intelligence) and Report\n\n\
     - /health - Health check"
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["analytics:read"])),
    path = "/health",
    tag = "Health",
    operation_id = "health",
    responses((status = 200, description = "OK")),
)]
async fn health(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_openapi_spec() {
        let spec = ApiDoc::openapi();
        let json = serde_json::to_string_pretty(&spec).expect("Failed to serialize OpenAPI spec");
        std::fs::write("/tmp/topems-bi-openapi.json", json).expect("Failed to write spec");
        tracing::info!("OpenAPI spec written to /tmp/topems-bi-openapi.json");
    }
}
