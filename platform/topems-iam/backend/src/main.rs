mod api;
mod models;
mod db;
mod services;
mod middleware;

use axum::{Router, routing::get};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();
    
    println!("Starting TOPEMS-IAM service on port 8002...");
    
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/auth/login", get(api::handlers::login))
        .route("/api/v1/users", get(api::handlers::list_users));
    
    let addr = SocketAddr::from(([0, 0, 0, 0], 8002));
    axum::serve(tokio::net::TcpListener::bind(addr).await.unwrap(), app).await.unwrap();
}

async fn health_check() -> &'static str {
    "TOPEMS-IAM is running!"
}
