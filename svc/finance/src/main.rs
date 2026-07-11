// TOPEMS Finance Service
// =============================================================================

pub mod models;
pub mod modules;
pub mod services;
pub mod shared;

use axum::{extract::State, routing::get, Json, Router};
use axum_prometheus::PrometheusMetricLayer;
use std::net::SocketAddr;

use crate::shared::AppState;
use topems_shared::{
    auth_middleware, create_api_info_router, create_cors_layer, init_telemetry,
    telemetry_middleware, ApiResponse, AuthState, DependencyHealth, HealthStatus, ServiceHealth,
};

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();

    let _telemetry_guard = init_telemetry("topems-finance");

    tracing::info!("🚀 TOPEMS Finance Service starting...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        env::var("DATABASE_URL")
            .expect("DATABASE_URL environment variable is required")
            .to_string()
    });

    let pool = match sqlx::postgres::PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .idle_timeout(std::time::Duration::from_secs(300))
        .max_lifetime(std::time::Duration::from_secs(1800))
        .connect(&database_url)
        .await
    {
        Ok(p) => {
            tracing::info!("✅ Database connection successful");
            p
        }
        Err(e) => {
            tracing::error!("❌ Failed to connect to database: {}", e);
            std::process::exit(1);
        }
    };

    if let Err(e) = services::init_database(&pool).await {
        tracing::error!("Failed to init finance database: {}", e);
        std::process::exit(1);
    }

    let auth_state = AuthState::from_env();

    let state = AppState {
        auth_state: auth_state.clone(),
        pool: pool.clone(),
    };

    let cors = create_cors_layer();

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .merge(create_api_info_router("topems-finance-service"))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        );

    let protected_routes = Router::new()
        .nest("/api/finance", modules::create_routes())
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ))
        .with_state(state.clone());

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(cors)
        .layer(prometheus_layer)
        .with_state(state);

    let port = std::env::var("FINANCE_PORT")
        .unwrap_or_else(|_| "8011".to_string())
        .parse()
        .unwrap_or(8011);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Finance Service is running at http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

async fn home() -> &'static str {
    "TOPEMS Finance Service API\n\n\
     Contains: Accounts, Vouchers, Ledger, Reports\n\n\
     - /health - Health check\n\
     - /api/info - API information"
}

async fn health(State(state): State<AppState>) -> Json<ApiResponse<ServiceHealth>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => HealthStatus::Healthy,
        Err(_) => HealthStatus::Unhealthy,
    };

    let overall_status = if db_status == HealthStatus::Healthy {
        HealthStatus::Healthy
    } else {
        HealthStatus::Unhealthy
    };

    let dependencies = vec![DependencyHealth {
        name: "postgresql".to_string(),
        status: db_status,
        message: "database connection".to_string(),
    }];

    let health = ServiceHealth {
        service_name: "topems-finance".to_string(),
        status: overall_status,
        dependencies: Some(dependencies),
        ..ServiceHealth::healthy("topems-finance")
    };

    Json(ApiResponse::success(health, "Health check"))
}
