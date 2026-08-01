use axum::{routing::delete, routing::get, routing::post, routing::put, Router};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::net::SocketAddr;
use topems_shared::{
    auth_middleware, create_cors_layer, init_telemetry, register_routes_with_legacy_alias,
    ApiResponse, AuthState,
};
use utoipa::OpenApi;

mod handlers;
mod models;
mod openapi;

#[tokio::main]
async fn main() {
    let _telemetry_guard = init_telemetry("topems-billing");

    tracing::info!("🚀 TOPEMS Billing Service starting...");

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

    handlers::init_database(&pool)
        .await
        .expect("Failed to init billing database");

    let auth_state = AuthState::from_env();
    let cors = create_cors_layer();

    let protected_routes = Router::new()
        .route("/plans", get(handlers::list_plans))
        .route("/plans/{id}", get(handlers::get_plan))
        .route(
            "/subscriptions/{tenant_id}",
            get(handlers::get_subscription),
        )
        .route("/subscriptions", post(handlers::create_subscription))
        .route(
            "/subscriptions/{tenant_id}",
            put(handlers::cancel_subscription),
        )
        .route("/invoices/{tenant_id}", get(handlers::list_invoices))
        .route("/usage/{tenant_id}", get(handlers::get_usage_summary))
        .route(
            "/usage/{tenant_id}/{metric_type}",
            post(handlers::record_usage),
        )
        .layer(axum::middleware::from_fn_with_state(
            auth_state.clone(),
            auth_middleware,
        ));

    let core_routes = register_routes_with_legacy_alias(
        Router::new(),
        "/api/billing",
        &["/api/v1/billing"],
        protected_routes,
    );

    let app = Router::new()
        .merge(core_routes)
        .route("/health", get(|| async { "OK" }))
        .route(
            "/api-docs/openapi.json",
            get(|| async move { axum::Json(openapi::BillingApiDoc::openapi()) }),
        )
        .layer(cors)
        .with_state(pool);

    let port = std::env::var("BILLING_PORT")
        .unwrap_or_else(|_| "8085".to_string())
        .parse()
        .unwrap_or(8085);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Billing Service is running at http://{}", addr);
    tracing::info!("📋 API prefix: /api/billing/*");

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
