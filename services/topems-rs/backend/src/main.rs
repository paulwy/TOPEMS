use axum::{
    routing::{delete, get, post, put},
    Json, Router,
};
use dotenv::dotenv;
use sqlx::PgPool;
use std::env;
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod api;
mod db;
mod models;

use api::handlers::{experiments, formulas, projects};
use api::response::ApiResponse;
use db::repository::RsRepository;

#[tokio::main]
async fn main() {
    // Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_rs=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-RS Research & Development Management System starting...");
    dotenv().ok();

    // Initialize database connection
    let database_url = env::var("DATABASE_URL")
        .unwrap_or("postgres://topems:topems_secret@localhost:5432/topems".to_string());
    let pool = PgPool::connect(&database_url)
        .await
        .expect("Failed to connect to the database");
    tracing::info!("✅ Database connection established");

    let repo = RsRepository::new(pool);

    // Build the application with routes
    let app = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        // Project routes
        .route("/api/v1/projects", get(projects::list_projects))
        .route("/api/v1/projects", post(projects::create_project))
        .route("/api/v1/projects/:id", get(projects::get_project))
        .route("/api/v1/projects/:id", put(projects::update_project))
        .route("/api/v1/projects/:id", delete(projects::delete_project))
        // Experiment routes
        .route("/api/v1/experiments", get(experiments::list_experiments))
        .route("/api/v1/experiments", post(experiments::create_experiment))
        .route("/api/v1/experiments/:id", get(experiments::get_experiment))
        .route("/api/v1/experiments/:id", put(experiments::update_experiment))
        .route("/api/v1/experiments/:id", delete(experiments::delete_experiment))
        // Formula routes
        .route("/api/v1/formulas", get(formulas::list_formulas))
        .route("/api/v1/formulas", post(formulas::create_formula))
        .route("/api/v1/formulas/:id", get(formulas::get_formula))
        .route("/api/v1/formulas/:id", put(formulas::update_formula))
        .route("/api/v1/formulas/:id", delete(formulas::delete_formula))
        .with_state(repo);

    let _host = env::var("SERVER_HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8005".to_string())
        .parse()
        .unwrap_or(8005);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ TOPEMS-RS service is running at http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

async fn home() -> &'static str {
    "TOPEMS-RS Research & Development Management System API\n\nCheck out the API at /health"
}

async fn health() -> Json<ApiResponse<String>> {
    Json(ApiResponse::success(
        "TOPEMS-RS is running!".to_string(),
        "OK".to_string(),
    ))
}
