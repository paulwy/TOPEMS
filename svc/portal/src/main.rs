use axum::{
    extract::FromRef,
    routing::{delete, get, post},
    Json, Router,
};
use reqwest::Client;
use std::env;
use std::sync::Arc;
use std::time::Instant;
use tower_cookies::CookieManagerLayer;

use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use topems_shared::{
    auth_middleware, build_health_response, create_api_info_router, create_cors_layer,
    init_telemetry, telemetry_middleware, ApiResponse, AuthState, LocalServiceRegistry,
    PortalServiceAggregator, ServiceHealth,
};

mod models;
mod modules;
mod services;

use crate::modules::portal_plugin::{auto_register_to_core, get_plugin_info, plugin_health_check};

static START_TIME: std::sync::OnceLock<Instant> = std::sync::OnceLock::new();

fn get_uptime() -> u64 {
    START_TIME.get_or_init(Instant::now).elapsed().as_secs()
}

#[derive(Clone)]
#[allow(dead_code)]
struct AppState {
    auth_state: AuthState,
    service_registry: Arc<LocalServiceRegistry>,
    service_aggregator: Arc<PortalServiceAggregator>,
    http_client: Client,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

impl AppState {
    async fn new() -> Self {
        let aggregator = PortalServiceAggregator::new();
        aggregator.init_default_services().await;

        Self {
            auth_state: AuthState::from_env(),
            service_registry: Arc::new(LocalServiceRegistry::new()),
            service_aggregator: Arc::new(aggregator),
            http_client: Client::new(),
        }
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-portal");
    START_TIME.get_or_init(Instant::now);

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_portal_custom_metric",
        "This is a custom metric for TOPEMS-PORTAL",
    )
    .unwrap();
    default_registry()
        .register(Box::new(custom_gauge.clone()))
        .unwrap();
    custom_gauge.set(42.0);
    tracing::info!("✅ Prometheus 监控已初始化");

    let app_state = AppState::new().await;

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/health/detailed", get(health_check_detailed))
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .route("/", get(home));

    let protected_routes = Router::new()
        .route(
            "/api/portal/v1/services",
            get(modules::services::list_services),
        )
        .route("/api/portal/v1/todos", get(modules::todos::get_todos))
        .route("/api/portal/v1/todos", post(modules::todos::add_todo))
        .route(
            "/api/portal/v1/todos/{id}",
            post(modules::todos::complete_todo),
        )
        .route(
            "/api/portal/v1/todos/{id}",
            delete(modules::todos::delete_todo),
        )
        .route("/api/portal/v1/user", get(modules::user::get_user_info))
        .route(
            "/api/portal/v1/monitoring/services",
            get(modules::monitoring::get_monitoring_services),
        )
        .route(
            "/api/portal/v1/monitoring/metrics",
            get(modules::monitoring::get_monitoring_metrics),
        )
        .route(
            "/api/portal/v1/monitoring/alerts",
            get(modules::monitoring::get_monitoring_alerts),
        )
        .route(
            "/api/portal/v1/monitoring/alerts/{id}",
            post(modules::monitoring::acknowledge_alert),
        )
        .route(
            "/api/portal/v1/monitoring/logs",
            get(modules::monitoring::get_monitoring_logs),
        )
        .route(
            "/api/portal/v1/notifications",
            get(modules::notifications::get_notifications),
        )
        .route(
            "/api/portal/v1/notifications/{id}",
            post(modules::notifications::mark_notification_read),
        )
        .route(
            "/api/portal/v1/notifications/mark-all-read",
            post(modules::notifications::mark_all_notifications_read),
        )
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .with_state(app_state.clone());

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-portal"))
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(cors)
        .layer(CookieManagerLayer::new())
        .layer(prometheus_layer);

    let port = env::var("SERVER_PORT").unwrap_or_else(|_| "8063".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-PORTAL 统一门户系统启动中...");
    tracing::info!("📦 端口: {}", port);
    tracing::info!("🔒 认证保护已启用");

    let core_url = env::var("CORE_URL").ok();
    tokio::spawn(async move {
        auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-portal", true)
}

async fn health_check_detailed() -> Json<ApiResponse<models::DetailedHealth>> {
    let health = models::DetailedHealth {
        service_name: "topems-portal".to_string(),
        status: models::HealthStatus::Healthy,
        message: "健康检查完成".to_string(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        uptime: Some(get_uptime()),
        dependencies: None,
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
  GET  /api/info      - API information
  GET  /api/plugins/info     - Plugin info
  GET  /api/plugins/health   - Plugin health

Protected Endpoints (require JWT token):
  GET  /api/portal/v1/services        - List all services
  GET  /api/portal/v1/todos           - Get todos
  POST /api/portal/v1/todos           - Add todo
  POST /api/portal/v1/todos/{id}      - Complete todo
  DELETE /api/portal/v1/todos/{id}    - Delete todo
  GET  /api/portal/v1/user            - Get user info
  GET  /api/portal/v1/monitoring/services - Monitoring services
  GET  /api/portal/v1/monitoring/metrics   - Monitoring metrics
  GET  /api/portal/v1/monitoring/alerts    - Monitoring alerts
  POST /api/portal/v1/monitoring/alerts/{id} - Acknowledge alert
  GET  /api/portal/v1/monitoring/logs      - Monitoring logs
  GET  /api/portal/v1/notifications        - Notifications
  POST /api/portal/v1/notifications/{id}   - Mark notification read
  POST /api/portal/v1/notifications/mark-all-read - Mark all read
",
        "首页",
    ))
}
