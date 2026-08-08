use axum::{
    extract::State,
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::Serialize;
use sqlx::{PgPool, Row};

use super::auth_utils::extract_user_id_from_token;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize)]
pub struct DashboardStats {
    pub today_patrols: i64,
    pub today_scans: i64,
    pub pending_tasks: i64,
    pub completed_tasks: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct PatrolStats {
    pub total_patrols: i64,
    pub completed_patrols: i64,
    pub in_progress_patrols: i64,
    pub today_count: i64,
    pub weekly_count: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct TaskStats {
    pub total_tasks: i64,
    pub pending_tasks: i64,
    pub completed_tasks: i64,
    pub overdue_tasks: i64,
}

pub async fn get_dashboard_stats(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let today_patrols = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.patrol_records WHERE checked_by = $1 AND created_at >= CURRENT_DATE",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let today_scans = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.scan_records WHERE operator = $1 AND scanned_at >= CURRENT_DATE",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let pending_tasks = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status = 'pending'",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let completed_tasks = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status = 'completed'",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let stats = DashboardStats {
        today_patrols,
        today_scans,
        pending_tasks,
        completed_tasks,
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(stats, "获取统计数据成功")),
    )
}

pub async fn get_patrol_stats(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let total_patrols = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.patrol_records WHERE checked_by = $1",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let completed_patrols = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.patrol_records WHERE checked_by = $1 AND status = 'completed'",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let in_progress_patrols = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.patrol_records WHERE checked_by = $1 AND status = 'in_progress'",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let today_count = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.patrol_records WHERE checked_by = $1 AND created_at >= CURRENT_DATE",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let weekly_count = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.patrol_records WHERE checked_by = $1 AND created_at >= CURRENT_DATE - INTERVAL '7 days'",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let stats = PatrolStats {
        total_patrols,
        completed_patrols,
        in_progress_patrols,
        today_count,
        weekly_count,
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(stats, "获取巡逻统计数据成功")),
    )
}

pub async fn get_task_stats(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let total_tasks = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.mobile_tasks WHERE assignee = $1 OR assignee IS NULL",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let pending_tasks = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status = 'pending'",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let completed_tasks = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status = 'completed'",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let overdue_tasks = sqlx::query(
        "SELECT COUNT(*) as count FROM plugin_mobile.mobile_tasks WHERE (assignee = $1 OR assignee IS NULL) AND status != 'completed' AND due_date < CURRENT_DATE",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .map(|r: sqlx::postgres::PgRow| r.get::<Option<i64>, _>("count").unwrap_or(0))
    .unwrap_or(0);

    let stats = TaskStats {
        total_tasks,
        pending_tasks,
        completed_tasks,
        overdue_tasks,
    };

    (
        StatusCode::OK,
        Json(ApiResponse::success(stats, "获取任务统计数据成功")),
    )
}
