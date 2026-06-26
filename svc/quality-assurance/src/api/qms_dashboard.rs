use axum::{extract::State, routing::get, Json, Router};
use serde::Serialize;

use crate::AppState;
use topems_shared::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/api/qa/quality/dashboard", get(get_dashboard_stats))
}

#[derive(Debug, Serialize)]
pub struct DashboardStats {
    pub total_inspections: i64,
    pub pending_inspections: i64,
    pub completed_inspections: i64,
    pub qualified_rate: f64,
    pub total_issues: i64,
    pub open_issues: i64,
    pub resolved_issues: i64,
}

pub async fn get_dashboard_stats(
    State(_state): State<AppState>,
) -> Json<ApiResponse<DashboardStats>> {
    tracing::info!("Getting dashboard stats");
    Json(ApiResponse::success(
        DashboardStats {
            total_inspections: 100,
            pending_inspections: 10,
            completed_inspections: 90,
            qualified_rate: 98.5,
            total_issues: 20,
            open_issues: 5,
            resolved_issues: 15,
        },
        "获取仪表盘统计成功",
    ))
}
