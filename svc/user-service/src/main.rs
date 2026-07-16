use axum::{
    routing::{delete, get, post, put},
    Json, Router,
};
use std::env;
use tower_cookies::CookieManagerLayer;

use axum_prometheus::PrometheusMetricLayer;
use prometheus::{default_registry, Gauge};
use topems_shared::init_service_telemetry;
use topems_shared::{
    build_health_response, create_api_info_router, create_cors_layer, ApiResponse, ServiceHealth,
    TelemetryExt,
};

mod models;
mod modules;
mod services;
mod shared;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let _telemetry_guard = init_service_telemetry!("topems-user-service");

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();
    let custom_gauge = Gauge::new(
        "topems_user_service_custom_metric",
        "This is a custom metric for TOPEMS-USER-SERVICE",
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

    let cors = create_cors_layer();

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .route("/", get(home));

    let protected_routes = Router::new()
        .route("/api/users/users", get(modules::user::list_users))
        .route("/api/users/users", post(modules::user::create_user))
        .route("/api/users/users/{id}", get(modules::user::get_user))
        .route("/api/users/users/{id}", put(modules::user::update_user))
        .route("/api/users/users/{id}", delete(modules::user::delete_user))
        .route(
            "/api/users/users/{id}/profile",
            get(modules::user::get_user_profile),
        )
        .route(
            "/api/users/users/{id}/profile",
            put(modules::user::update_user_profile),
        )
        .route(
            "/api/users/users/{id}/roles",
            get(modules::user::get_user_roles),
        )
        .route(
            "/api/users/users/{id}/roles",
            post(modules::user::assign_roles),
        )
        .route(
            "/api/users/users/{id}/roles/{role_id}",
            delete(modules::user::remove_role),
        )
        .route("/api/users/roles", get(modules::role::list_roles))
        .route("/api/users/roles", post(modules::role::create_role))
        .route("/api/users/roles/{id}", get(modules::role::get_role))
        .route("/api/users/roles/{id}", put(modules::role::update_role))
        .route("/api/users/roles/{id}", delete(modules::role::delete_role))
        .layer(axum::Extension(pool));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .merge(create_api_info_router("topems-user-service"))
        .with_telemetry()
        .layer(cors)
        .layer(CookieManagerLayer::new())
        .layer(prometheus_layer);

    let port = env::var("USER_SERVICE_PORT")
        .or_else(|_| env::var("SERVER_PORT"))
        .unwrap_or_else(|_| "8060".to_string());
    let addr = format!("0.0.0.0:{}", port);

    tracing::info!("🚀 TOPEMS-USER-SERVICE 用户服务启动中...");
    tracing::info!("📦 端口: {}", port);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> ServiceHealth {
    build_health_response("topems-user-service", true)
}

async fn home() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success(
        "TOPEMS User Service API

Public Endpoints:
  GET  /              - API documentation
  GET  /health        - Health check
  GET  /api/info      - API information
  GET  /metrics       - Prometheus metrics

Protected Endpoints:

  Users:
    GET    /api/users/users                 - List all users
    POST   /api/users/users                 - Create user
    GET    /api/users/users/{id}            - Get user by ID
    PUT    /api/users/users/{id}            - Update user
    DELETE /api/users/users/{id}            - Delete user
    GET    /api/users/users/{id}/profile    - Get user profile
    PUT    /api/users/users/{id}/profile    - Update user profile
    GET    /api/users/users/{id}/roles      - Get user roles
    POST   /api/users/users/{id}/roles      - Assign roles
    DELETE /api/users/users/{id}/roles/{role_id} - Remove role

  Roles:
    GET    /api/users/roles                 - List all roles
    POST   /api/users/roles                 - Create role
    GET    /api/users/roles/{id}            - Get role by ID
    PUT    /api/users/roles/{id}            - Update role
    DELETE /api/users/roles/{id}            - Delete role
",
        "首页",
    ))
}
