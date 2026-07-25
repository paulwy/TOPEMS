use axum::{routing::get, Router};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::net::SocketAddr;
use topems_shared::{create_cors_layer, init_telemetry};

mod handlers;

#[tokio::main]
async fn main() {
    let _telemetry_guard = init_telemetry("topems-feedback");

    tracing::info!("🚀 TOPEMS Feedback Service starting...");

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

    handlers::init_feedback_tables(&pool)
        .await
        .expect("Failed to init feedback database");

    let cors = create_cors_layer();

    let app = Router::new()
        .nest("/api/feedback", handlers::feedback_routes())
        .nest("/api/v1/feedback", handlers::feedback_routes())
        .route("/health", get(|| async { "OK" }))
        .layer(cors)
        .with_state(pool);

    let port = std::env::var("FEEDBACK_PORT")
        .unwrap_or_else(|_| "8087".to_string())
        .parse()
        .unwrap_or(8087);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Feedback Service is running at http://{}", addr);
    tracing::info!("📋 API prefix: /api/feedback/*");

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
