use axum::{routing::get, Router};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use topems_shared::{
    auth_middleware, create_cors_layer, init_telemetry, register_routes_with_legacy_alias,
    AuthState,
};

mod handlers;
mod models;

#[tokio::main]
async fn main() {
    let _telemetry_guard = init_telemetry("topems-search");

    tracing::info!("🚀 TOPEMS Search Service starting...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        std::process::exit(1);
    });

    let pool = match PgPoolOptions::new()
        .max_connections(20)
        .acquire_timeout(std::time::Duration::from_secs(30))
        .connect(&database_url)
        .await
    {
        Ok(p) => {
            tracing::info!("Database connection successful");
            p
        }
        Err(e) => {
            tracing::error!("Failed to connect to database: {}", e);
            panic!("Cannot connect to database: {}", e);
        }
    };

    let auth_state = AuthState::from_env();
    let cors = create_cors_layer();

    let protected_routes = Router::new()
        .route("/", get(handlers::search_handler))
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ));

    let api_routes = register_routes_with_legacy_alias(
        Router::new(),
        "/api/search",
        &["/api/v1/search"],
        protected_routes,
    );

    let app = Router::new()
        .merge(api_routes)
        .route("/health", get(handlers::health_handler))
        .layer(cors)
        .with_state(pool);

    let port = std::env::var("SEARCH_PORT")
        .or_else(|_| std::env::var("SERVER_PORT"))
        .or_else(|_| std::env::var("PORT"))
        .unwrap_or_else(|_| "8082".to_string())
        .parse()
        .unwrap_or(8082);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Search Service is running at http://{}", addr);
    tracing::info!("📋 API prefix: /api/search/*");

    let listener = match tokio::net::TcpListener::bind(&addr).await {
        Ok(l) => l,
        Err(e) => {
            tracing::error!("Failed to bind to {}: {}", addr, e);
            return;
        }
    };

    if let Err(e) = axum::serve(listener, app.into_make_service()).await {
        tracing::error!("Server error: {}", e);
    }
}
