mod api;
mod db;
mod models;
mod services;
mod middleware;

use axum::{
    Router,
    routing::get,
};
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_doc=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("Starting TOPEMS-DOC service...");

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/files", get(api::handlers::list_files))
        .route("/api/v1/files", post(api::handlers::upload_file))
        .layer(TraceLayer::new_for_http());

    let addr = SocketAddr::from(([0, 0, 0, 0], 8001));
    tracing::info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "TOPEMS-DOC is running!"
}

use axum::routing::post;
