use axum::{extract::State, routing::get, Json, Router};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use topems_shared::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PmStatistics {
    pub total_projects: i64,
    pub draft_projects: i64,
    pub pending_projects: i64,
    pub active_projects: i64,
    pub completed_projects: i64,
    pub cancelled_projects: i64,

    pub total_contracts: i64,
    pub pending_contracts: i64,
    pub active_contracts: i64,
    pub completed_contracts: i64,

    pub total_budget: f64,
    pub spent_budget: f64,
    pub budget_usage_rate: f64,

    pub total_risks: i64,
    pub open_risks: i64,
    pub closed_risks: i64,

    pub total_tasks: i64,
    pub pending_tasks: i64,
    pub in_progress_tasks: i64,
    pub completed_tasks: i64,
}

pub fn create_routes(db: PgPool) -> Router {
    Router::new()
        .route("/api/pm/statistics", get(get_statistics))
        .with_state(db)
}

pub async fn get_statistics(State(db): State<PgPool>) -> Json<ApiResponse<PmStatistics>> {
    let total_projects: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM pm_projects")
        .fetch_one(&db)
        .await
        .unwrap_or((0,));

    let draft_projects: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM pm_projects WHERE status = 'draft'")
            .fetch_one(&db)
            .await
            .unwrap_or((0,));

    let pending_projects: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM pm_projects WHERE status = 'pending'")
            .fetch_one(&db)
            .await
            .unwrap_or((0,));

    let active_projects: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM pm_projects WHERE status = 'active'")
            .fetch_one(&db)
            .await
            .unwrap_or((0,));

    let completed_projects: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM pm_projects WHERE status = 'completed'")
            .fetch_one(&db)
            .await
            .unwrap_or((0,));

    let cancelled_projects: (i64,) =
        sqlx::query_as("SELECT COUNT(*) FROM pm_projects WHERE status = 'cancelled'")
            .fetch_one(&db)
            .await
            .unwrap_or((0,));

    let total_contracts: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM pm_contracts")
        .fetch_one(&db)
        .await
        .unwrap_or((0,));

    let stats = PmStatistics {
        total_projects: total_projects.0,
        draft_projects: draft_projects.0,
        pending_projects: pending_projects.0,
        active_projects: active_projects.0,
        completed_projects: completed_projects.0,
        cancelled_projects: cancelled_projects.0,
        total_contracts: total_contracts.0,
        pending_contracts: 0,
        active_contracts: 0,
        completed_contracts: 0,
        total_budget: 0.0,
        spent_budget: 0.0,
        budget_usage_rate: 0.0,
        total_risks: 0,
        open_risks: 0,
        closed_risks: 0,
        total_tasks: 0,
        pending_tasks: 0,
        in_progress_tasks: 0,
        completed_tasks: 0,
    };

    Json(ApiResponse::success(stats, "统计数据获取成功"))
}
