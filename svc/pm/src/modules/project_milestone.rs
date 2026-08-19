use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::models::project_milestone::{
    CreateMilestoneRequest, ProjectMilestone, UpdateMilestoneRequest,
};

// ==================== Pure functions ====================

/// Determines milestone status from planned/actual timestamps (Unix seconds).
///
/// - `actual_date` present      → `"completed"`
/// - `now` past `planned_date` → `"overdue"`
/// - within 7 days of due date → `"in_progress"`
/// - otherwise                  → `"upcoming"`
pub fn milestone_status(planned_date: i64, actual_date: Option<i64>, now: i64) -> &'static str {
    if actual_date.is_some() {
        return "completed";
    }
    if now > planned_date {
        return "overdue";
    }
    let seven_days_secs: i64 = 7 * 24 * 60 * 60;
    if planned_date - now <= seven_days_secs {
        return "in_progress";
    }
    "upcoming"
}

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route(
            "/projects/{project_id}/milestones",
            get(list_milestones).post(create_milestone),
        )
        .route(
            "/projects/{project_id}/milestones/{id}",
            get(get_milestone)
                .put(update_milestone)
                .delete(delete_milestone),
        )
        .with_state(pool)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/milestones",
    tag = "project_milestones",
    params(
        ("project_id" = Uuid, Path, description = "project_id")
    ),

    responses(
        (status = 200, description = "获取项目里程碑列表成功", body = ApiResponse<Vec<ProjectMilestone>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn list_milestones(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProjectMilestone>>> {
    let result = sqlx::query_as::<_, ProjectMilestone>(
        "id, project_id, name, description, date, status, phase_id, acceptance_criteria, created_at, updated_at FROM pm.project_milestones WHERE project_id = $1 ORDER BY date ASC",
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(milestones) => Json(ApiResponse::success(milestones, "获取项目里程碑列表成功")),
        Err(e) => {
            tracing::error!("获取项目里程碑列表失败: {}", e);
            Json(ApiResponse::error(500, "获取项目里程碑列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:write"])),
    path = "/projects/{project_id}/milestones",
    tag = "project_milestones",
    request_body = CreateMilestoneRequest,
    params(
        ("project_id" = Uuid, Path, description = "project_id")
    ),

    responses(
        (status = 200, description = "创建项目里程碑成功", body = ApiResponse<ProjectMilestone>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn create_milestone(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<CreateMilestoneRequest>,
) -> Json<ApiResponse<ProjectMilestone>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProjectMilestone>(
        r#"
        INSERT INTO plugin_pm.project_milestones (
            id, project_id, name, description, date, status,
            phase_id, acceptance_criteria, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(project_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.date)
    .bind("pending")
    .bind(req.phase_id)
    .bind(&req.acceptance_criteria)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(milestone) => Json(ApiResponse::success(milestone, "创建项目里程碑成功")),
        Err(e) => {
            tracing::error!("创建项目里程碑失败: {}", e);
            Json(ApiResponse::error(500, "创建项目里程碑失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/milestones/{id}",
    tag = "project_milestones",
    params(
        ("project_id" = Uuid, Path, description = "project_id"),
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "获取项目里程碑成功", body = ApiResponse<ProjectMilestone>),
        (status = 404, description = "项目里程碑不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_milestone(
    State(pool): State<PgPool>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<ProjectMilestone>> {
    let result = sqlx::query_as::<_, ProjectMilestone>(
        "id, project_id, name, description, date, status, phase_id, acceptance_criteria, created_at, updated_at FROM pm.project_milestones WHERE project_id = $1 AND id = $2",
    )
    .bind(project_id)
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(milestone)) => Json(ApiResponse::success(milestone, "获取项目里程碑成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目里程碑不存在")),
        Err(e) => {
            tracing::error!("获取项目里程碑失败: {}", e);
            Json(ApiResponse::error(500, "获取项目里程碑失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pm:update"])),
    path = "/projects/{project_id}/milestones/{id}",
    tag = "project_milestones",
    request_body = UpdateMilestoneRequest,
    params(
        ("project_id" = Uuid, Path, description = "project_id"),
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "更新项目里程碑成功", body = ApiResponse<ProjectMilestone>),
        (status = 404, description = "项目里程碑不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn update_milestone(
    State(pool): State<PgPool>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateMilestoneRequest>,
) -> Json<ApiResponse<ProjectMilestone>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProjectMilestone>(
        r#"
        UPDATE plugin_pm.project_milestones
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            date = COALESCE($3, date),
            status = COALESCE($4, status),
            phase_id = COALESCE($5, phase_id),
            acceptance_criteria = COALESCE($6, acceptance_criteria),
            updated_at = $7
        WHERE project_id = $8 AND id = $9
        RETURNING *
        "#,
    )
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.date)
    .bind(&req.status)
    .bind(req.phase_id)
    .bind(&req.acceptance_criteria)
    .bind(now)
    .bind(project_id)
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(milestone)) => Json(ApiResponse::success(milestone, "更新项目里程碑成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目里程碑不存在")),
        Err(e) => {
            tracing::error!("更新项目里程碑失败: {}", e);
            Json(ApiResponse::error(500, "更新项目里程碑失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pm:delete"])),
    path = "/projects/{project_id}/milestones/{id}",
    tag = "project_milestones",
    params(
        ("project_id" = Uuid, Path, description = "project_id"),
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "删除项目里程碑成功", body = ApiResponse<bool>),
        (status = 404, description = "项目里程碑不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn delete_milestone(
    State(pool): State<PgPool>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<bool>> {
    let result = sqlx::query("DELETE FROM pm.project_milestones WHERE project_id = $1 AND id = $2")
        .bind(project_id)
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            Json(ApiResponse::success(true, "删除项目里程碑成功"))
        }
        Ok(_) => Json(ApiResponse::error(404, "项目里程碑不存在")),
        Err(e) => {
            tracing::error!("删除项目里程碑失败: {}", e);
            Json(ApiResponse::error(500, "删除项目里程碑失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const DAY: i64 = 24 * 60 * 60;

    #[test]
    fn test_completed_with_actual_date() {
        assert_eq!(milestone_status(1000, Some(900), 2000), "completed");
        // completed even if actual date is after planned (late completion)
        assert_eq!(milestone_status(1000, Some(1500), 2000), "completed");
    }

    #[test]
    fn test_overdue_no_actual_past_planned() {
        assert_eq!(milestone_status(1000, None, 1001), "overdue");
        assert_eq!(milestone_status(1000, None, 2000), "overdue");
    }

    #[test]
    fn test_in_progress_within_seven_days() {
        // exactly 7 days before -> in_progress
        assert_eq!(milestone_status(1000 + 7 * DAY, None, 1000), "in_progress");
        // 1 day before -> in_progress
        assert_eq!(milestone_status(1000 + DAY, None, 1000), "in_progress");
        // same timestamp (now == planned, not past) -> in_progress
        assert_eq!(milestone_status(1000, None, 1000), "in_progress");
    }

    #[test]
    fn test_upcoming_more_than_seven_days() {
        // 8 days before -> upcoming
        assert_eq!(milestone_status(1000 + 8 * DAY, None, 1000), "upcoming");
        // 30 days before -> upcoming
        assert_eq!(milestone_status(1000 + 30 * DAY, None, 1000), "upcoming");
    }

    #[test]
    fn test_actual_date_takes_precedence_over_overdue() {
        // Even though now > planned, actual_date means completed
        assert_eq!(milestone_status(1000, Some(2000), 5000), "completed");
    }

    #[test]
    fn test_boundary_exactly_seven_days() {
        // planned_date - now == 7 days exactly -> in_progress (<=)
        assert_eq!(milestone_status(7 * DAY, None, 0), "in_progress");
    }

    #[test]
    fn test_boundary_just_over_seven_days() {
        // planned_date - now == 7 days + 1 sec -> upcoming
        assert_eq!(milestone_status(7 * DAY + 1, None, 0), "upcoming");
    }

    #[test]
    fn test_all_statuses_covered() {
        let now = 1_000_000;
        assert_eq!(milestone_status(now, Some(now), now), "completed");
        assert_eq!(milestone_status(now - 1, None, now), "overdue");
        assert_eq!(milestone_status(now + 3 * DAY, None, now), "in_progress");
        assert_eq!(milestone_status(now + 30 * DAY, None, now), "upcoming");
    }
}
