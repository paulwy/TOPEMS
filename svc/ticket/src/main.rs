use axum::{routing::get, Router};
use std::net::SocketAddr;
use topems_shared::{
    auth_middleware, create_cors_layer, create_database_pool, init_telemetry,
    register_routes_with_legacy_alias, AuthState, DatabaseConfig,
};
use utoipa::OpenApi;

mod handlers;
mod models;
mod openapi;
mod sla_service;

#[tokio::main]
async fn main() {
    let _telemetry_guard = init_telemetry("topems-ticket");

    tracing::info!("🚀 TOPEMS Ticket Service starting...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        std::process::exit(1);
    });

    let db_config = DatabaseConfig {
        url: database_url,
        max_connections: std::env::var("DB_MAX_CONNECTIONS")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(10),
        min_connections: Some(3),
        connect_timeout: Some(30),
        idle_timeout: Some(300),
        max_lifetime: Some(1800),
        test_interval: Some(60),
        enable_connection_reuse: Some(true),
    };

    let pool = match create_database_pool(&db_config).await {
        Ok(p) => {
            tracing::info!("Database connection successful");
            p
        }
        Err(e) => {
            tracing::error!("Failed to connect to database: {}", e);
            panic!("Cannot connect to database: {}", e);
        }
    };

    handlers::init_ticket_tables(&pool)
        .await
        .expect("Failed to init ticket database");
    handlers::init_sla_tables(&pool)
        .await
        .expect("Failed to init SLA database");

    let auth_state = AuthState::from_env();
    let cors = create_cors_layer();

    let protected_routes = handlers::ticket_routes().layer(axum::middleware::from_fn_with_state(
        auth_state.clone(),
        auth_middleware,
    ));

    let core_routes = register_routes_with_legacy_alias(
        Router::new(),
        "/api/ticket",
        &["/api/v1/ticket"],
        protected_routes,
    );

    let app = Router::new()
        .merge(core_routes)
        .route("/health", get(|| async { "OK" }))
        .route(
            "/api-docs/openapi.json",
            get(|| async move { axum::Json(openapi::TicketApiDoc::openapi()) }),
        )
        .layer(cors)
        .with_state(pool);

    let port = std::env::var("TICKET_PORT")
        .unwrap_or_else(|_| "8086".to_string())
        .parse()
        .unwrap_or(8086);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Ticket Service is running at http://{}", addr);
    tracing::info!("📋 API prefix: /api/ticket/*");

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
