use axum::{
    extract::FromRef,
    routing::{delete, get, post, put},
    Json, Router,
};
use reqwest::Client;
use sqlx::PgPool;
use std::env;
use std::sync::Arc;
use std::time::Instant;
use tower_cookies::CookieManagerLayer;

use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use topems_shared::{
    auth_middleware, build_health_response, create_api_info_router, create_cors_layer,
    init_telemetry, rls_middleware, telemetry_middleware, wrap_group2_router, ApiResponse,
    AuthState, LocalServiceRegistry, PortalServiceAggregator, RouteCompatConfig, ServiceHealth,
};

mod models;
mod modules;
mod services;
mod shared;

use crate::shared::AppState;

use crate::modules::portal_plugin::{auto_register_to_core, get_plugin_info, plugin_health_check};

static START_TIME: std::sync::OnceLock<Instant> = std::sync::OnceLock::new();

fn get_uptime() -> u64 {
    START_TIME.get_or_init(Instant::now).elapsed().as_secs()
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

    let database_url = env::var("DATABASE_URL").map_err(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        anyhow::anyhow!("DATABASE_URL environment variable is required")
    })?;

    let pool = match sqlx::postgres::PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
    {
        Ok(p) => {
            tracing::info!("🔗 数据库连接成功");
            p
        }
        Err(e) => {
            tracing::error!("数据库连接失败: {}", e);
            panic!("无法连接到数据库: {}", e);
        }
    };

    let app_state = AppState::new(pool.clone()).await;

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api/health/detailed", get(health_check_detailed))
        .route("/api/plugins/info", get(get_plugin_info))
        .route("/api/plugins/health", get(plugin_health_check))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .route("/", get(home));

    let protected_routes = Router::new()
        .route("/services", get(modules::services::list_services))
        .route("/todos", get(modules::todos::get_todos))
        .route("/todos", post(modules::todos::add_todo))
        .route("/todos/{id}", post(modules::todos::complete_todo))
        .route("/todos/{id}", delete(modules::todos::delete_todo))
        .route("/user", get(modules::user::get_user_info))
        .route(
            "/monitoring/services",
            get(modules::monitoring::get_monitoring_services),
        )
        .route(
            "/monitoring/metrics",
            get(modules::monitoring::get_monitoring_metrics),
        )
        .route(
            "/monitoring/alerts",
            get(modules::monitoring::get_monitoring_alerts),
        )
        .route(
            "/monitoring/alerts/{id}",
            post(modules::monitoring::acknowledge_alert),
        )
        .route(
            "/monitoring/logs",
            get(modules::monitoring::get_monitoring_logs),
        )
        .route(
            "/notifications",
            get(modules::notifications::get_notifications),
        )
        .route(
            "/notifications/{id}",
            post(modules::notifications::mark_notification_read),
        )
        .route(
            "/notifications/mark-all-read",
            post(modules::notifications::mark_all_notifications_read),
        )
        .route(
            "/dashboard/stats",
            get(modules::dashboard::get_dashboard_stats),
        )
        .route(
            "/dashboard/quick-access",
            get(modules::dashboard::get_quick_access),
        )
        .route(
            "/dashboard/quick-access",
            post(modules::dashboard::add_quick_access),
        )
        .route(
            "/dashboard/quick-access/{id}",
            delete(modules::dashboard::remove_quick_access),
        )
        .route(
            "/announcements",
            get(modules::announcements::get_announcements),
        )
        .route(
            "/announcements/{id}",
            get(modules::announcements::get_announcement),
        )
        .route(
            "/announcements",
            post(modules::announcements::create_announcement),
        )
        .route(
            "/announcements/{id}",
            put(modules::announcements::update_announcement),
        )
        .route(
            "/announcements/{id}",
            delete(modules::announcements::delete_announcement),
        )
        .route(
            "/announcements/{id}/pin",
            post(modules::announcements::toggle_announcement_pin),
        )
        .route(
            "/announcements/pinned",
            get(modules::announcements::get_pinned_announcements),
        )
        .route("/settings", get(modules::settings::get_user_settings))
        .route("/settings", put(modules::settings::update_user_settings))
        .route(
            "/settings/reset",
            post(modules::settings::reset_user_settings),
        )
        .route(
            "/settings/themes",
            get(modules::settings::get_available_themes),
        )
        .route(
            "/settings/languages",
            get(modules::settings::get_available_languages),
        )
        .route(
            "/quick-actions",
            get(modules::quick_actions::get_quick_actions),
        )
        .route(
            "/quick-actions/favorites",
            get(modules::quick_actions::get_favorite_actions),
        )
        .route(
            "/quick-actions/{id}/favorite",
            post(modules::quick_actions::toggle_favorite_action),
        )
        .route(
            "/quick-actions/{id}/execute",
            post(modules::quick_actions::execute_quick_action),
        )
        .route(
            "/navigation/menu",
            get(modules::navigation::get_navigation_menu),
        )
        .route(
            "/navigation/pinned",
            get(modules::navigation::get_pinned_apps),
        )
        .route(
            "/navigation/pinned",
            post(modules::navigation::add_pinned_app),
        )
        .route(
            "/navigation/pinned/{id}",
            delete(modules::navigation::remove_pinned_app),
        )
        .route(
            "/navigation/pinned/reorder",
            put(modules::navigation::reorder_pinned_apps),
        )
        .layer(axum::middleware::from_fn_with_state(
            app_state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            app_state.pool.clone(),
            rls_middleware,
        ))
        .with_state(app_state.clone());

    let app = Router::new()
        .merge(public_routes)
        .nest("/api/portal", protected_routes)
        .merge(create_api_info_router("topems-portal"))
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(cors)
        .layer(CookieManagerLayer::new())
        .layer(prometheus_layer);

    let cfg = RouteCompatConfig::new("portal", "/api/portal", &[]);
    let app = wrap_group2_router(app, cfg);

    let port = env::var("PORTAL_PORT")
        .or_else(|_| env::var("SERVER_PORT"))
        .unwrap_or_else(|_| "8063".to_string());
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
