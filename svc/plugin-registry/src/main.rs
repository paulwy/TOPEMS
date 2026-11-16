use std::sync::Arc;
use std::time::Instant;

use axum::{
    extract::State,
    routing::{get, post},
    Router,
};

use topems_shared_bootstrap::{
    bootstrap_service_shared, build_application, prometheus_metrics_handler, run, ServiceConfig,
};
use topems_shared_core::health::{DependencyHealth, HealthStatus, ServiceHealth, SystemMetrics};
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;

mod schema_defense;
mod shared;

pub mod modules;

// 让 handlers 中 `use crate::{AppState, CoreResponse};` 在 binary crate 的根命名空间也能解析
// （注意 binary crate 与 library crate 的 crate:: 根是独立的，这里各自补一份）
pub use shared::{AppState, CoreResponse};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "public");

    let config = ServiceConfig {
        name: "topems-plugin-registry",
        port: 8096,
        port_env_var: Some("PLUGIN_REGISTRY_PORT"),
        max_db_connections: 10,
        enable_events: false,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api",
        legacy_prefixes: &[],
        init_telemetry: true,
    };

    let ctx = bootstrap_service_shared(&config).await?;

    tracing::info!(
        "🚀 TOPEMS Plugin Registry Service (拆分自 unified-core / V68.1 A2.2) starting..."
    );

    // 初始化数据库表 + Schema 防御（V69.3）
    if let Err(e) =
        modules::plugin::init_database(ctx.migrate_pool.as_ref().unwrap_or(&ctx.db)).await
    {
        tracing::error!("Failed to init plugin-registry database: {:?}", e);
    }

    let start_time = Instant::now();
    let app_state = AppState {
        db: Db::new(ctx.db.clone(), "public").deny_request_own_txn(),
        auth_state: ctx.auth_state.clone(),
        metrics: Arc::new(SystemMetrics::new()),
        start_time,
    };

    let public_routes = Router::new().route("/", get(home));

    // checker:ignore R2 — plugin-registry is tenant-agnostic metadata service, no tenant isolation required
    let protected_routes = Router::new()
        .merge(modules::create_routes())
        .route("/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            shared::middleware::jwt_auth_middleware,
        ))
        .with_state(app_state.clone())
        .layer(axum::middleware::from_fn_with_state(
            ctx.db.clone(),
            topems_shared_auth::tenant_middleware(),
        ));

    // plugin-registry 暂未独立生成 OpenAPI 文档
    let openapi_json = None::<String>;

    let mut app = build_application(&ctx, &config, public_routes, protected_routes, openapi_json);

    let stateful_public = Router::new()
        .route("/health", get(health))
        .route("/api/plugin/health", get(health))
        .route(
            "/metrics",
            get(move || async { prometheus_metrics_handler().await }),
        )
        .route(
            "/dev/runtime/{code}/register",
            post(modules::plugin::handlers::runtime::register_plugin),
        )
        // 审计 P2 ROUTE_NO_API(plugin) 核销：挂载 marketplace 端点（handler 已存在、此前未挂载）
        .route(
            "/api/plugin/marketplace",
            get(modules::plugin::handlers::marketplace::get_marketplace_summary),
        )
        .route(
            "/api/plugin/marketplace/categories",
            get(modules::plugin::handlers::marketplace::list_categories),
        )
        .route(
            "/api/plugin/marketplace/list",
            get(modules::plugin::handlers::marketplace::list_plugins),
        )
        .route(
            "/api/plugin/plugins/{code}",
            get(modules::plugin::handlers::marketplace::get_plugin),
        )
        .route(
            "/api/plugin/plugins/{code}/versions",
            get(modules::plugin::handlers::marketplace::get_plugin_versions),
        )
        .route(
            "/api/plugin/plugins/{code}/reviews",
            get(modules::plugin::handlers::marketplace::get_plugin_reviews),
        )
        .route(
            "/api/plugin/plugins/{code}/reviews",
            post(modules::plugin::handlers::marketplace::create_review),
        )
        .with_state(app_state)
        // stateful_public 在 build_application 返回后才 merge，需单独补 metrics 鉴权层。
        .layer(topems_shared_bootstrap::metrics_auth_layer());

    app.router = app.router.merge(stateful_public);

    tracing::info!(
        "✅ Plugin Registry Service (V68.1 A2.2) is running at http://0.0.0.0:{}",
        app.port
    );

    run(app).await?;
    Ok(())
}

async fn home() -> &'static str {
    "TOPEMS Plugin Registry Service\n\n\
     Marketplace · Tenant Plugins · Reviews · Runtime · Upgrade Workflow · Versioning\n\
     (拆分自 unified-core / V68.1 A2.2)\n\n\
     - /health   - Health check\n\
     - /metrics  - Prometheus metrics\n\
     - /health/detailed - Detailed service health"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    let start = Instant::now();
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
        service_name: "topems-plugin-registry".to_string(),
        status: status.clone(),
        message: "topems-plugin-registry is running".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        uptime: Some(uptime),
        dependencies: Some(vec![DependencyHealth {
            name: "postgresql".to_string(),
            status,
            message: if db_ok { "healthy" } else { "unhealthy" }.to_string(),
        }]),
        response_time_ms: u64::try_from(start.elapsed().as_millis()).ok(),
        last_check: None,
    }
}

async fn detailed_health(State(state): State<AppState>) -> ApiResponse<serde_json::Value> {
    use topems_shared_bootstrap::build_detailed_health_response_db;
    let modules = serde_json::json!({
        "handlers/tenant_plugins": "active",
        "handlers/marketplace": "active",
        "handlers/runtime": "active",
        "handlers/simple_api": "active",
        "handlers/upgrade_workflow": "active",
        "handlers/automated_upgrade": "active",
        "handlers/versioning": "active",
        "handlers/reviews_stats": "active"
    });
    let extra = serde_json::json!({
        "split_from": "unified-core",
        "v68_1_task": "A2.2",
    });
    let resp = build_detailed_health_response_db(
        &state.db,
        "topems-plugin-registry",
        modules,
        env!("CARGO_PKG_VERSION"),
        extra,
    )
    .await;
    ApiResponse::success(resp, "Detailed health check")
}
