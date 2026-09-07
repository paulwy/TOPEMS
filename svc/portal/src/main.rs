//! TOPEMS Portal 独立部署入口
//!
//! 业务组装链（事件订阅者 / AppState / 帮助中心 / schema 防御 / GraphQL 聚合 /
//! 业务路由 / 遗留别名 / CORS / Cookie）已下沉到 `topems_portal::embedded::build_router`，
//! 与 server 模块化单体嵌入（portal_real_module）共用同一实现，避免双轨漂移。
//! 本文件仅保留独立部署特有的部分：bootstrap / Prometheus 指标 / public 入口路由 /
//! portal 插件自注册 / 运行。

use axum::{routing::get, Json, Router};
use std::time::Instant;

use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use topems_shared::ApiResponse;
use topems_shared_bootstrap::{bootstrap_service, resolve_port, run, Application, ServiceConfig};
use topems_shared_core::health::{build_health_response, ServiceHealth};

use topems_portal::modules::portal_plugin::{
    auto_register_to_core, get_plugin_info, plugin_health_check,
};
use topems_portal::shared::AppState;

static START_TIME: std::sync::OnceLock<Instant> = std::sync::OnceLock::new();

fn get_uptime() -> u64 {
    START_TIME.get_or_init(Instant::now).elapsed().as_secs()
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    std::env::set_var("SEARCH_PATH", "portal, public");

    let config = ServiceConfig {
        name: "topems-portal",
        port: 8063,
        port_env_var: Some("PORTAL_PORT"),
        max_db_connections: 20,
        enable_events: true,
        enable_rls: true,
        enable_request_context: true,
        api_prefix: "/api/portal",
        legacy_prefixes: &["/api/v1/portal", "/api/core/portal/v1"],
        init_telemetry: true,
    };
    let ctx = bootstrap_service(&config).await?;
    START_TIME.get_or_init(Instant::now);

    // 自定义 Prometheus Gauge
    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_portal_custom_metric",
        "This is a custom metric for TOPEMS-PORTAL",
    )
    .unwrap_or_else(|e| {
        tracing::error!("Failed to create Prometheus gauge: {}", e);
        panic!("Prometheus gauge creation failed - check for duplicate metric registrations")
    });
    default_registry()
        .register(Box::new(custom_gauge.clone()))
        .unwrap_or_else(|e| {
            tracing::error!("Failed to register Prometheus gauge: {}", e);
            panic!(
                "Prometheus gauge registration failed - check for duplicate metric registrations"
            )
        });
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    // public 入口路由（健康 / 插件 / 指标 / 首页；无业务 state 依赖）。
    // AppState 仅作为 state 类型标记，由 build_router 的 Router<AppState> 参数推断。
    let app_state = AppState::new(ctx.db.clone(), ctx.event_publisher.clone()).await;
    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api/health/detailed", get(health_check_detailed))
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .route("/", get(home))
        .with_state(app_state);

    // 业务组装链统一由 lib 侧 build_router 提供（与 server 嵌入共用）
    let app = topems_portal::embedded::build_router(
        ctx.db.clone(),
        ctx.migrate_pool.clone().unwrap_or_else(|| ctx.db.clone()),
        ctx.event_publisher.clone(),
        public_routes,
    )
    .await?;
    let app = app.layer(prometheus_layer);

    // portal 插件自注册（独立部署专属；server 嵌入时由 server 统一注册）
    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        auto_register_to_core(core_url.as_deref()).await;
    });

    let app = Application {
        router: app,
        port: resolve_port(&config),
        name: config.name,
    };
    run(app).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-portal", true)
}

async fn health_check_detailed() -> Json<ApiResponse<topems_portal::models::DetailedHealth>> {
    let ws_connections = topems_portal::embedded::get_ws_connection_count();
    let active_subscriptions = topems_portal::modules::graphql_schema::get_active_subscriptions();
    let health = topems_portal::models::DetailedHealth {
        service_name: "topems-portal".to_string(),
        status: topems_portal::models::HealthStatus::Healthy,
        message: "健康检查完成".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        uptime: Some(get_uptime()),
        dependencies: Some(vec![
            topems_portal::models::DependencyHealth {
                name: "websocket".to_string(),
                status: topems_portal::models::HealthStatus::Healthy,
                message: format!(
                    "WS 连接: {}, 活跃订阅: {}",
                    ws_connections, active_subscriptions
                ),
            },
            topems_portal::models::DependencyHealth {
                name: "graphql".to_string(),
                status: topems_portal::models::HealthStatus::Healthy,
                message: "GraphQL 端点正常运行".to_string(),
            },
        ]),
        response_time_ms: None,
        last_check: Some(chrono::Utc::now().to_rfc3339()),
    };

    Json(ApiResponse::success(health, "健康检查完成"))
}

async fn home() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success(
        "TOPEMS Unified Portal API

Public Endpoints:
  GET  /              - API documentation
  GET  /health        - Health check
  GET  /api/health/detailed - Detailed health check
  GET  /api/info      - API information
  GET  /api/plugins/info     - Plugin info
  GET  /api/plugins/health   - Plugin health
  GET  /metrics       - Prometheus metrics

Protected Endpoints (require JWT token):

  Services:
    GET  /api/core/portal/services        - List all services

  Todos:
    GET  /api/core/portal/todos           - Get todos
    POST /api/core/portal/todos           - Add todo
    POST /api/core/portal/todos/{id}      - Complete todo
    DELETE /api/core/portal/todos/{id}    - Delete todo

  User:
    GET  /api/core/portal/user            - Get user info

  Monitoring:
    GET  /api/core/portal/monitoring/services - Monitoring services
    GET  /api/core/portal/monitoring/metrics   - Monitoring metrics
    GET  /api/core/portal/monitoring/alerts    - Monitoring alerts
    POST /api/core/portal/monitoring/alerts/{id} - Acknowledge alert
    GET  /api/core/portal/monitoring/logs      - Monitoring logs

  Notifications:
    GET  /api/core/portal/notifications        - Notifications
    POST /api/core/portal/notifications/{id}   - Mark notification read
    POST /api/core/portal/notifications/mark-all-read - Mark all read

  Dashboard:
    GET  /api/core/portal/dashboard/stats      - Dashboard statistics
    GET  /api/core/portal/dashboard/quick-access - Quick access list
    POST /api/core/portal/dashboard/quick-access - Add quick access
    DELETE /api/core/portal/dashboard/quick-access/{id} - Remove quick access

  Announcements:
    GET  /api/core/portal/announcements        - List announcements
    GET  /api/core/portal/announcements/{id}   - Get announcement detail
    POST /api/core/portal/announcements        - Create announcement
    PUT  /api/core/portal/announcements/{id}   - Update announcement
    DELETE /api/core/portal/announcements/{id} - Delete announcement
    POST /api/core/portal/announcements/{id}/pin - Toggle pin
    GET  /api/core/portal/announcements/pinned - Pinned announcements

  Settings:
    GET  /api/core/portal/settings             - Get user settings
    PUT  /api/core/portal/settings             - Update user settings
    POST /api/core/portal/settings/reset       - Reset user settings
    GET  /api/core/portal/settings/themes      - Available themes
    GET  /api/core/portal/settings/languages   - Available languages

  Quick Actions:
    GET  /api/core/portal/quick-actions        - Quick actions list
    GET  /api/core/portal/quick-actions/favorites - Favorite actions
    POST /api/core/portal/quick-actions/{id}/favorite - Toggle favorite
    POST /api/core/portal/quick-actions/{id}/execute - Execute action

  Navigation:
    GET  /api/core/portal/navigation/menu      - Navigation menu
    GET  /api/core/portal/navigation/pinned    - Pinned apps
    POST /api/core/portal/navigation/pinned    - Add pinned app
    DELETE /api/core/portal/navigation/pinned/{id} - Remove pinned app
    PUT  /api/core/portal/navigation/pinned/reorder - Reorder pinned apps
",
        "首页",
    ))
}
