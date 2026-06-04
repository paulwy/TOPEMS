use axum::{
    extract::State,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};

use topems_shared::{
    ApiResponse, AuthState, Config, Result,
    create_cors_layer, create_database_pool,
    init_logging, test_database_connection,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
struct HealthResponse {
    service: String,
    status: String,
    timestamp: String,
}

async fn home() -> &'static str {
    "TOPEMS Report Service API\n\nCheck /health for health status"
}

async fn health() -> Json<ApiResponse<HealthResponse>> {
    Json(ApiResponse::success(
        HealthResponse {
            service: "topems-report".to_string(),
            status: "healthy".to_string(),
            timestamp: Utc::now().to_rfc3339(),
        },
        "Service running",
    ))
}

#[derive(Clone)]
struct AppState {
    auth_state: AuthState,
    db_pool: sqlx::PgPool,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();
    init_logging("topems-report");

    tracing::info!("🚀 Starting TOPEMS Report Service...");

    let config = Config::load().await?;
    let db_config = config.get_database().await;

    let db_pool = create_database_pool(&db_config).await?;
    test_database_connection(&db_pool).await?;

    let auth_state = AuthState::from_env();

    let app_state = AppState {
        auth_state,
        db_pool,
    };

    let cors = create_cors_layer();

    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .layer(cors)
        .with_state(app_state);

    let port = 8053;
    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ TOPEMS Report Service listening on http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await?,
        app.into_make_service(),
    ).await?;

    Ok(())
}
