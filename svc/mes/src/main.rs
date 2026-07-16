//! TOPEMS MES Service
//!
//! Manufacturing Execution System Service

use topems_mes::{modules, AppState};

use std::env;
use std::net::SocketAddr;

use axum::{extract::State, routing::get, Json, Router};
use axum_prometheus::PrometheusMetricLayer;

use topems_shared::{
    auth_middleware, create_cors_layer, get_api_info_handler, init_telemetry, rls_middleware,
    simple_health_check, telemetry_middleware, wrap_group2_router, ApiResponse, AuthState,
    RouteCompatConfig, ServiceHealth, SimpleHealthConfig,
};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    _ = dotenv::dotenv();

    let _telemetry_guard = init_telemetry("topems-mes");

    tracing::info!("🚀 TOPEMS MES Service starting...");

    let database_url = std::env::var("DATABASE_URL").unwrap_or_else(|_| {
        tracing::error!("DATABASE_URL environment variable is required");
        std::process::exit(1);
    });

    let pool = match sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
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

    if let Err(e) = modules::init_database(&pool).await {
        tracing::warn!("MES database init warning: {}", e);
    }

    let auth_state = AuthState::from_env();
    let health_config = SimpleHealthConfig::new("topems-mes").with_db(pool.clone());

    let state = AppState {
        auth_state,
        pool,
        health_config,
    };

    let cors = create_cors_layer();

    let (prometheus_layer, metric_handle) = PrometheusMetricLayer::pair();

    let public_routes = Router::new()
        .route("/", get(home))
        .route("/health", get(health))
        .route("/api", get(|| get_api_info_handler("mes-service")))
        .route("/api/info", get(|| get_api_info_handler("mes-service")))
        .route(
            "/api/plugins/info",
            get(modules::mes_plugin::get_plugin_info),
        )
        .route(
            "/api/plugins/health",
            get(modules::mes_plugin::plugin_health_check),
        )
        .route(
            "/metrics",
            get(move || async move { metric_handle.render() }),
        )
        .route(
            "/ws/mes/dashboard",
            axum::routing::get(modules::dashboard_ws::dashboard_websocket),
        );

    let protected_routes = Router::new()
        .merge(modules::create_routes())
        .route("/api/health/detailed", get(detailed_health))
        .layer(axum::middleware::from_fn_with_state(
            state.auth_state.clone(),
            auth_middleware,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.pool.clone(),
            rls_middleware,
        ));

    let app = Router::new()
        .merge(public_routes)
        .merge(protected_routes)
        .layer(cors)
        .layer(axum::middleware::from_fn(telemetry_middleware))
        .layer(prometheus_layer)
        .with_state(state);

    let cfg = RouteCompatConfig::new("mes", "/api/core/mes", &[]);
    let app = wrap_group2_router(app, cfg);

    let port = std::env::var("MES_PORT")
        .or_else(|_| std::env::var("SERVER_PORT"))
        .or_else(|_| std::env::var("PORT"))
        .unwrap_or_else(|_| "8030".to_string())
        .parse()
        .unwrap_or(8030);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("✅ MES Service is running at http://{}", addr);

    let core_url = std::env::var("CORE_URL").ok();
    tokio::spawn(async move {
        modules::mes_plugin::auto_register_to_core(core_url.as_deref()).await;
    });

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app.into_make_service()).await?;

    Ok(())
}

async fn home() -> &'static str {
    "TOPEMS MES Service API\n\n\
     Manufacturing Execution System\n\n\
     - /health - Health check"
}

async fn health(State(state): State<AppState>) -> ServiceHealth {
    simple_health_check(&state.health_config).await
}

async fn detailed_health(State(state): State<AppState>) -> Json<ApiResponse<serde_json::Value>> {
    let db_status = match sqlx::query("SELECT 1").fetch_one(&state.pool).await {
        Ok(_) => "healthy",
        Err(_) => "unhealthy",
    };

    let response = serde_json::json!({
        "service": "mes-service",
        "status": if db_status == "healthy" { "healthy" } else { "unhealthy" },
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "modules": {
            "mes": "active"
        },
        "dependencies": [
            {
                "name": "postgresql",
                "status": db_status
            }
        ],
        "version": "1.0.0"
    });

    Json(ApiResponse::success(response, "Detailed health check"))
}
