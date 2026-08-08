#![allow(dead_code)]

use crate::shared::AppState;
use std::sync::Arc;
use std::time::Instant;

use axum::{extract::State, routing::get, Json, Router};

use topems_shared_bootstrap::{
    bootstrap_service, build_application, prometheus_metrics_handler, run, ServiceConfig,
};
use topems_shared_core::health::{
    simple_health_check, ServiceHealth, SimpleHealthConfig, SystemMetrics,
};
use topems_shared_core::response::ApiResponse;

mod shared;

pub mod modules;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "public");

    let config = ServiceConfig {
        name: "topems-monitor",
        port: 8095,
        port_env_var: Some("MONITOR_PORT"),
        max_db_connections: 10,
        enable_events: false,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/monitor",
        legacy_prefixes: &[],
    };

    let ctx = bootstrap_service(&config).await?;

    tracing::info!("🚀 TOPEMS Monitor Service (拆分自 unified-core / V68.1 A2.1) starting...");

    let start_time = Instant::now();
    let app_state = AppState {
        pool: ctx.db.clone(),
        auth_state: ctx.auth_state.clone(),
        metrics: Arc::new(SystemMetrics::new()),
        start_time,
    };

    let public_routes = Router::new().route("/", get(home));

    let protected_routes = Router::new()
        .merge(modules::create_routes())
        .route("/health/detailed", get(detailed_health))
        .with_state(app_state.clone());

    // monitor 暂未独立生成 OpenAPI 文档
    let openapi_json = None::<String>;

    let mut app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    let stateful_public = Router::new()
        .route("/health", get(health))
        .route(
            "/metrics",
            get(move || async { prometheus_metrics_handler().await }),
        )
        .with_state(app_state);

    app.router = app.router.merge(stateful_public);

    tracing::info!(
        "✅ Monitor Service (V68.1 A2.1) is running at http://0.0.0.0:{}",
        app.port
    );

    // TODO: 后续补齐 monitor_plugin::auto_register_to_core 调用

    run(app).await?;
    Ok(())
}

async fn home() -> &'static str {
    "TOPEMS Monitor Service\n\n\
     Alerts · Metrics · SLO · Business Metrics · Health Checks\n\
     (拆分自 unified-core / V68.1 A2.1)\n\n\
     - /health   - Health check\n\
     - /metrics  - Prometheus metrics\n\
     - /health/detailed - Detailed service health"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    let config = SimpleHealthConfig::new("topems-monitor").with_db(state.pool.clone());
    simple_health_check(&config).await
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let response = serde_json::json!({
        "service": "topems-monitor",
        "split_from": "unified-core",
        "v68_1_task": "A2.1",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "modules": {
            "metrics": "active",
            "health_check": "active",
            "alerts": "active",
            "alert_evaluator": "active",
            "business_metrics": "active",
            "slo": "active"
        },
        "dependencies": [
            { "name": "postgresql", "status": db_status }
        ],
        "version": env!("CARGO_PKG_VERSION")
    });

    Json(ApiResponse::success(response, "Detailed health check"))
}
