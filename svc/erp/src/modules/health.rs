use axum::{extract::State, http::StatusCode, Json, Router};
use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::postgres::PgPool;

use crate::modules::ApiState;

#[derive(Serialize)]
pub struct HealthResponse {
    status: String,
    service: String,
    uptime: u64,
    timestamp: DateTime<Utc>,
    database: String,
}

async fn check_database(pool: &PgPool) -> String {
    match sqlx::query("SELECT 1").fetch_one(pool).await {
        Ok(_) => "healthy".to_string(),
        Err(e) => format!("unhealthy: {}", e),
    }
}

async fn health_check(State(state): State<ApiState>) -> (StatusCode, Json<HealthResponse>) {
    let uptime = state.start_time.elapsed().as_secs();
    let db_status = check_database(&state.db).await;

    let overall_status = if db_status == "healthy" {
        "healthy".to_string()
    } else {
        "degraded".to_string()
    };

    (
        StatusCode::OK,
        Json(HealthResponse {
            status: overall_status,
            service: "topems-erp".to_string(),
            uptime,
            timestamp: Utc::now(),
            database: db_status,
        }),
    )
}

pub fn create_routes() -> Router<ApiState> {
    Router::new().route("/health", axum::routing::get(health_check))
}
