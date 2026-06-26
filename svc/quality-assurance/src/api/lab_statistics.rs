use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/qa/lab/statistics", get(get_statistics))
}

#[derive(Debug, Serialize)]
pub struct Statistics {
    pub total_samples: i64,
    pub pending_tasks: i64,
    pub completed_tasks: i64,
    pub qualified_rate: f64,
    pub instrument_usage: serde_json::Value,
    pub reagent_usage: serde_json::Value,
}

pub async fn get_statistics(
    State(_state): State<AppState>,
) -> Json<ApiResponse<Statistics>> {
    tracing::info!("Getting lab statistics");
    Json(ApiResponse::success(
        Statistics {
            total_samples: 500,
            pending_tasks: 50,
            completed_tasks: 450,
            qualified_rate: 97.8,
            instrument_usage: serde_json::json!({
                "total_usage_hours": 1200,
                "utilization_rate": 85.5
            }),
            reagent_usage: serde_json::json!({
                "total_consumption": 2500,
                "unit_cost": 150.0
            }),
        },
        "获取统计数据成功",
    ))
}
