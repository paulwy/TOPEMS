use crate::shared::AppState;
use std::sync::Arc;
use std::time::Instant;

use axum::{extract::State, routing::get, Router};

use crate::modules::monitor::monitor_plugin;
use topems_shared_auth::middleware::{require_module_access, require_module_write};
use topems_shared_bootstrap::{
    bootstrap_service_shared, build_application, build_detailed_health_response_db,
    prometheus_metrics_handler, run, ServiceConfig,
};
use topems_shared_core::health::{DependencyHealth, HealthStatus, ServiceHealth, SystemMetrics};
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;

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
        init_telemetry: true,
    };

    let ctx = bootstrap_service_shared(&config).await?;

    tracing::info!("🚀 TOPEMS Monitor Service (拆分自 unified-core / V68.1 A2.1) starting...");

    let start_time = Instant::now();
    let app_state = AppState {
        // 沿用模块原有 SEARCH_PATH：public。
        db: Db::new(ctx.db.clone(), "public"),
        auth_state: ctx.auth_state.clone(),
        metrics: Arc::new(SystemMetrics::new()),
        start_time,
        bff_url: std::env::var("MONITOR_BFF_URL")
            .unwrap_or_else(|_| "http://localhost:8099".to_string()),
    };

    let public_routes = Router::new().route("/", get(home));

    let protected_routes = Router::new()
        .merge(modules::create_routes())
        .route("/health/detailed", get(detailed_health))
        // 模块门只负责「能进 monitor + 读」；告警确认/规则增删等写仍要求 monitor:admin。
        .layer(axum::middleware::from_fn(require_module_write("monitor")))
        .layer(axum::middleware::from_fn(require_module_access("monitor")))
        .with_state(app_state.clone())
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ));

    // monitor 暂未独立生成 OpenAPI 文档
    let openapi_json = None::<String>;

    let mut app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    let stateful_public = Router::new()
        .route("/health", get(health))
        .route(
            "/metrics",
            get(move || async { prometheus_metrics_handler().await }),
        )
        .with_state(app_state)
        // stateful_public 在 build_application 返回后才 merge，需单独补 metrics 鉴权层；
        // /metrics/system 等子路由在 protected_routes 内，已被中央层覆盖。
        .layer(topems_shared_bootstrap::metrics_auth_layer());

    app.router = app.router.merge(stateful_public);

    tracing::info!(
        "✅ Monitor Service (V68.1 A2.1) is running at http://0.0.0.0:{}",
        app.port
    );

    // ── 启动时自动注册到统一核心 ──────────────────────────────────────
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        monitor_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

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
    let start = std::time::Instant::now();
    let db_ok = state.db.check_health().await.is_ok();
    let status = if db_ok {
        HealthStatus::Healthy
    } else {
        HealthStatus::Unhealthy
    };
    let uptime = {
        let secs = state.start_time.elapsed().as_secs();
        let (days, hours, minutes, seconds) = (
            secs / 86400,
            (secs % 86400) / 3600,
            (secs % 3600) / 60,
            secs % 60,
        );
        if days > 0 {
            format!("{}d {}h {}m {}s", days, hours, minutes, seconds)
        } else if hours > 0 {
            format!("{}h {}m {}s", hours, minutes, seconds)
        } else if minutes > 0 {
            format!("{}m {}s", minutes, seconds)
        } else {
            format!("{}s", seconds)
        }
    };
    ServiceHealth {
        service_name: "topems-monitor".to_string(),
        status: status.clone(),
        message: "topems-monitor is running".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        uptime: Some(uptime),
        dependencies: Some(vec![DependencyHealth {
            name: "postgresql".to_string(),
            status,
            message: if db_ok { "healthy" } else { "unhealthy" }.to_string(),
        }]),
        response_time_ms: Some(u64::try_from(start.elapsed().as_millis()).unwrap_or(u64::MAX)),
        last_check: None,
    }
}

async fn detailed_health(State(state): State<AppState>) -> ApiResponse<serde_json::Value> {
    let modules = serde_json::json!({
        "metrics": "active",
        "health_check": "active",
        "alerts": "active",
        "alert_evaluator": "active",
        "business_metrics": "active",
        "slo": "active"
    });
    let extra = serde_json::json!({
        "split_from": "unified-core",
        "v68_1_task": "A2.1",
    });
    let resp = build_detailed_health_response_db(
        &state.db,
        "topems-monitor",
        modules,
        env!("CARGO_PKG_VERSION"),
        extra,
    )
    .await;
    ApiResponse::success(resp, "Detailed health check")
}
