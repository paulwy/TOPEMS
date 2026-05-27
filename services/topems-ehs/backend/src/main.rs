mod api;
mod models;

use anyhow::Result;
use axum::{
    routing::get,
    Json,
    Router,
};
use std::sync::{Arc, Mutex};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use api::{
    list_hazards, create_hazard, get_hazard, update_hazard, delete_hazard,
    list_checks, create_check, get_check, update_check, delete_check,
    list_plans, create_plan, get_plan, update_plan, delete_plan,
    list_drills, create_drill, get_drill, update_drill, delete_drill,
};
use models::{SafetyHazard, SafetyCheck, EmergencyPlan, DrillRecord};
use topems_shared::{ApiResponse, create_cors_layer};

#[derive(Clone)]
struct AppState {
    hazards: Arc<Mutex<Vec<SafetyHazard>>>,
    checks: Arc<Mutex<Vec<SafetyCheck>>>,
    plans: Arc<Mutex<Vec<EmergencyPlan>>>,
    drills: Arc<Mutex<Vec<DrillRecord>>>,
}

#[tokio::main]
async fn main() -> Result<()> {
    dotenv::dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "topems_ehs=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("🚀 TOPEMS-EHS 环境健康安全系统启动中...");

    let state = AppState {
        hazards: Arc::new(Mutex::new(Vec::new())),
        checks: Arc::new(Mutex::new(Vec::new())),
        plans: Arc::new(Mutex::new(Vec::new())),
        drills: Arc::new(Mutex::new(Vec::new())),
    };

    let cors = create_cors_layer();

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/v1/hazards", get(list_hazards).post(create_hazard))
        .route("/api/v1/hazards/{id}", get(get_hazard).put(update_hazard).delete(delete_hazard))
        .route("/api/v1/checks", get(list_checks).post(create_check))
        .route("/api/v1/checks/{id}", get(get_check).put(update_check).delete(delete_check))
        .route("/api/v1/plans", get(list_plans).post(create_plan))
        .route("/api/v1/plans/{id}", get(get_plan).put(update_plan).delete(delete_plan))
        .route("/api/v1/drills", get(list_drills).post(create_drill))
        .route("/api/v1/drills/{id}", get(get_drill).put(update_drill).delete(delete_drill))
        .layer(cors)
        .with_state(state);

    let port = std::env::var("PORT").unwrap_or_else(|_| "8013".to_string());
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", port)).await?;
    tracing::info!("📦 端口: {}", port);
    tracing::info!("✅ TOPEMS-EHS 已就绪");
    
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Json<ApiResponse<&'static str>> {
    Json(ApiResponse::success("TOPEMS-EHS is running", "健康检查"))
}