// TOPEMS Document Service
// =============================================================================

mod api;
mod models;
mod services;

use axum::{
    extract::{FromRef, State},
    routing::get,
    Json, Router,
};
use axum_prometheus::PrometheusMetricLayer;
use std::net::SocketAddr;

use topems_shared::{
    auth_middleware, create_api_info_router, create_cors_layer, init_telemetry,
    telemetry_middleware, ApiResponse, AuthState, DependencyHealth, HealthStatus, ServiceHealth,
};

#[derive(Clone)]
pub struct AppState {
    pub auth_state: AuthState,
    pub pool: sqlx::PgPool,
}

impl FromRef<AppState> for AuthState {
    fn from_ref(state: &AppState) -> Self {
        state.auth_state.clone()
    }
}

#[tokio::main]
async fn main() {
    dotenv::dotenv().ok();
    let _telemetry_guard = init_telemetry("topems-doc");

    tracing::info!("🚀 TOPEMS Document Service starting...");

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://topems:topems_secret@localhost:5432/topems".to_string());

    let pool = match sqlx::postgres::PgPoolOptions::new()
        .max_connections(20)
        .connect(&database_url)
        .await
    {
        Ok(p) => {
            tracing::info!("✅ Database connection successful");
            p
        }
        Err(e) => {
            tracing::error!("❌ Failed to connect to database: {}", e);
            panic!("Cannot connect to database: {}", e);
        }
    };

    services::init_database(&pool)
        .await
        .expect("Failed to init document database");

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
        .merge(create_api_info_router("topems-doc-service"))
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        );

    let protected_routes = Router::new()
        .nest("/api/doc", api::create_routes())
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

    let port = std::env::var("DOC_PORT")
        .unwrap_or_else(|_| "8012".to_string())
        .parse()
        .unwrap_or(8012);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ Document Service is running at http://{}", addr);

    axum::serve(
        tokio::net::TcpListener::bind(&addr).await.unwrap(),
        app.into_make_service(),
    )
    .await
    .unwrap();
}

async fn home() -> &'static str {
    "TOPEMS Document Service API

Contains: Documents, Templates, Folders

Public Endpoints:
  GET  /           - API documentation
  GET  /health     - Health check
  GET  /api/info   - API information

Protected Endpoints (require JWT token):

Documents:
  GET    /api/doc/documents        - List all documents
  POST   /api/doc/documents        - Create a document
  GET    /api/doc/documents/{id}   - Get a document
  PUT    /api/doc/documents/{id}   - Update a document
  DELETE /api/doc/documents/{id}   - Delete a document

Templates:
  GET    /api/doc/templates        - List all templates
  POST   /api/doc/templates        - Create a template
  GET    /api/doc/templates/{id}   - Get a template
  PUT    /api/doc/templates/{id}   - Update a template
  DELETE /api/doc/templates/{id}   - Delete a template

Folders:
  GET    /api/doc/folders          - List all folders
  POST   /api/doc/folders          - Create a folder
  GET    /api/doc/folders/{id}     - Get a folder
  PUT    /api/doc/folders/{id}     - Update a folder
  DELETE /api/doc/folders/{id}     - Delete a folder
"
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
        service_name: "topems-doc".to_string(),
        status: overall_status,
        dependencies: Some(dependencies),
        ..ServiceHealth::healthy("topems-doc")
    };

    Json(ApiResponse::success(health, "Health check"))
}
