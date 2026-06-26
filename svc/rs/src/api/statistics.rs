use axum::{
    extract::State,
    routing::get,
    Json, Router,
};
use serde::{Deserialize, Serialize};

use topems_shared::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RsStatistics {
    pub total_projects: i64,
    pub pending_projects: i64,
    pub in_progress_projects: i64,
    pub completed_projects: i64,
    pub cancelled_projects: i64,

    pub total_experiments: i64,
    pub pending_experiments: i64,
    pub in_progress_experiments: i64,
    pub completed_experiments: i64,

    pub total_formulas: i64,
    pub draft_formulas: i64,
    pub approved_formulas: i64,

    pub total_tasks: i64,
}

pub fn create_routes() -> Router<super::ApiState> {
    Router::<super::ApiState>::new()
        .route("/api/rs/statistics", get(get_statistics))
}

pub async fn get_statistics(
    State(state): State<super::ApiState>,
) -> Json<ApiResponse<RsStatistics>> {
    let total_projects: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM rs_projects")
        .fetch_one(&state.db)
        .await
        .unwrap_or((0,));

    let pending_projects: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM rs_projects WHERE status = 'pending'"
    )
        .fetch_one(&state.db)
        .await
        .unwrap_or((0,));

    let in_progress_projects: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM rs_projects WHERE status = 'in_progress'"
    )
        .fetch_one(&state.db)
        .await
        .unwrap_or((0,));

    let completed_projects: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM rs_projects WHERE status = 'completed'"
    )
        .fetch_one(&state.db)
        .await
        .unwrap_or((0,));

    let cancelled_projects: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM rs_projects WHERE status = 'cancelled'"
    )
        .fetch_one(&state.db)
        .await
        .unwrap_or((0,));

    let total_experiments: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM rs_experiments")
        .fetch_one(&state.db)
        .await
        .unwrap_or((0,));

    let pending_experiments: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM rs_experiments WHERE status = 'pending'"
    )
        .fetch_one(&state.db)
        .await
        .unwrap_or((0,));

    let in_progress_experiments: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM rs_experiments WHERE status = 'in_progress'"
    )
        .fetch_one(&state.db)
        .await
        .unwrap_or((0,));

    let completed_experiments: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM rs_experiments WHERE status = 'completed'"
    )
        .fetch_one(&state.db)
        .await
        .unwrap_or((0,));

    let total_formulas: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM rs_formulas")
        .fetch_one(&state.db)
        .await
        .unwrap_or((0,));

    let draft_formulas: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM rs_formulas WHERE status = 'draft'"
    )
        .fetch_one(&state.db)
        .await
        .unwrap_or((0,));

    let approved_formulas: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM rs_formulas WHERE approval_status = 'approved'"
    )
        .fetch_one(&state.db)
        .await
        .unwrap_or((0,));

    let stats = RsStatistics {
        total_projects: total_projects.0,
        pending_projects: pending_projects.0,
        in_progress_projects: in_progress_projects.0,
        completed_projects: completed_projects.0,
        cancelled_projects: cancelled_projects.0,
        total_experiments: total_experiments.0,
        pending_experiments: pending_experiments.0,
        in_progress_experiments: in_progress_experiments.0,
        completed_experiments: completed_experiments.0,
        total_formulas: total_formulas.0,
        draft_formulas: draft_formulas.0,
        approved_formulas: approved_formulas.0,
        total_tasks: 0,
    };

    Json(ApiResponse::success(stats, "统计数据获取成功"))
}
