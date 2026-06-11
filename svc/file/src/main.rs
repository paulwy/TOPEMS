mod api;
mod backends;
mod models;
mod services;

use anyhow::Result;
use axum::{
    routing::{delete, get, post},
    Router,
};
use sqlx::postgres::{PgConnectOptions, PgPoolOptions};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{AllowOrigin, CorsLayer};
use tracing::{info, Level};
use tracing_subscriber::FmtSubscriber;

use crate::api::handlers::{
    delete_file, download_file, get_file, get_file_permissions, get_shared_files, get_stats,
    health_check, list_files, revoke_permission, share_file, upload_file, AppState,
};
use crate::backends::local::LocalStorage;
use topems_shared::{AuthState, auth_middleware};

#[tokio::main]
async fn main() -> Result<()> {

    let subscriber = FmtSubscriber::builder()
        .with_max_level(Level::INFO)
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;

    let connect_opts: PgConnectOptions = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string())
        .parse()
        .unwrap_or_else(|_| {
            PgConnectOptions::new()
                .host("localhost")
                .port(5432)
                .username("topems")
                .password("topems_secret")
                .database("topems")
        });

    tracing::info!("Connecting to database...");
    let pool = match PgPoolOptions::new()
        .max_connections(10)
        .connect_with(connect_opts)
        .await
    {
        Ok(pool) => {
            tracing::info!("Database connection established");
            pool
        }
        Err(e) => {
            tracing::error!("Database connection failed: {}", e);
            return Ok(());
        }
    };

    let storage_base_path = std::env::var("STORAGE_LOCAL_PATH")
        .unwrap_or_else(|_| "./storage/files".to_string());
    let storage = Arc::new(LocalStorage::new(&storage_base_path)?);

    info!("Storage backend initialized at: {}", storage_base_path);

    let auth_state = AuthState::from_env();
    info!("🔑 AuthState loaded with JWT secret");

    let state = AppState {
        db: pool.clone(),
        storage: storage.clone(),
        auth_state: auth_state.clone(),
    };

    let public_routes = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/files/stats", get(get_stats))
        .with_state(state.clone());

    let protected_routes = Router::new()
        .route("/api/v1/files/upload", post(upload_file))
        .route("/api/v1/files", get(list_files))
        .route("/api/v1/files/shared", get(get_shared_files))
        .route("/api/v1/files/{id}", get(get_file))
        .route("/api/v1/files/{id}", delete(delete_file))
        .route("/api/v1/files/{id}/download", get(download_file))
        .route("/api/v1/files/{id}/share", post(share_file))
        .route("/api/v1/files/{id}/permissions", get(get_file_permissions))
        .route("/api/v1/files/{id}/permissions/revoke/{principal_type}/{principal_id}/{permission}", delete(revoke_permission))
        .with_state(state.clone())
        .layer(axum::middleware::from_fn_with_state(
            auth_state,
            auth_middleware,
        ));

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::any())
        .allow_methods(tower_http::cors::Any)
        .allow_headers(tower_http::cors::Any);

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors);

    let port = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8055".to_string())
        .parse::<u16>()?;

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("🚀 File service listening on {}", addr);
    info!("🔒 Authentication middleware enabled for protected routes");

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}