use axum::{
    extract::{Extension, Path, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use crate::models::project_milestone::{
    CreateMilestoneRequest, ProjectMilestone, UpdateMilestoneRequest,
};
use crate::modules::effective_tenant_id;
use crate::modules::milestone_status::MilestoneStatus;

// ==================== Pure functions ====================

/// Determines milestone status from planned/actual timestamps (Unix seconds).
///
/// - `actual_date` present      → `Completed`
/// - `now` past `planned_date` → `Overdue`
/// - within 7 days of due date → `InProgress`
/// - otherwise                  → `Pending`（历史对外叫 upcoming）
pub fn milestone_status(planned_date: i64, actual_date: Option<i64>, now: i64) -> MilestoneStatus {
    if actual_date.is_some() {
        return MilestoneStatus::Completed;
    }
    if now > planned_date {
        return MilestoneStatus::Overdue;
    }
    let seven_days_secs: i64 = 7 * 24 * 60 * 60;
    if planned_date - now <= seven_days_secs {
        return MilestoneStatus::InProgress;
    }
    // 历史对外叫 upcoming，落库值统一为 pending。
    MilestoneStatus::Pending
}

use topems_shared_auth::middleware::tenant::RlsTxnCell;

/// 校验里程碑状态流转：不存在 404、存量未知值 400、非法流转 400。
async fn ensure_milestone_transition(
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    project_id: Uuid,
    id: Uuid,
    to: MilestoneStatus,
) -> Result<(), ApiResponse<ProjectMilestone>> {
    let current_raw: Result<Option<String>, sqlx::Error> = sqlx::query_scalar(
        "SELECT status FROM pm.project_milestones WHERE project_id = $1 AND id = $2",
    )
    .bind(project_id)
    .bind(id)
    .fetch_optional(&mut *scope)
    .await;
    let raw = match current_raw {
        Ok(Some(raw)) => raw,
        Ok(None) => return Err(ApiResponse::not_found("项目里程碑不存在")),
        Err(e) => {
            tracing::error!("查询项目里程碑状态失败: {}", e);
            return Err(ApiResponse::server_error("查询项目里程碑状态失败"));
        }
    };
    let current = match MilestoneStatus::from_db_str(&raw) {
        Some(status) => status,
        None => {
            return Err(ApiResponse::bad_request(&format!(
                "项目里程碑当前状态非法: {raw}"
            )))
        }
    };
    if !current.can_transition_to(to) {
        return Err(ApiResponse::bad_request(&format!(
            "非法项目里程碑状态流转: {} -> {}",
            current, to
        )));
    }
    Ok(())
}

pub fn create_routes(db: Db) -> Router {
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
        .with_state(db)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:milestone:read"])),
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
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
) -> ApiResponse<Vec<ProjectMilestone>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let result = sqlx::query_as::<_, ProjectMilestone>(
        only_own_schema_query!("pm", "SELECT id, project_id, name, description, date, status, phase_id, acceptance_criteria, created_at, updated_at FROM pm.project_milestones WHERE project_id = $1 ORDER BY date ASC"),
    )
    .bind(project_id)
    .fetch_all(&mut scope)
    .await;

    match result {
        Ok(milestones) => ApiResponse::success(milestones, "获取项目里程碑列表成功"),
        Err(e) => {
            tracing::error!("获取项目里程碑列表失败: {}", e);
            ApiResponse::server_error("获取项目里程碑列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:milestone:write"])),
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
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateMilestoneRequest>,
) -> ApiResponse<ProjectMilestone> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProjectMilestone>(only_own_schema_query!(
        "pm",
        r#"
        INSERT INTO pm.project_milestones (
            id, project_id, name, description, date, status,
            phase_id, acceptance_criteria, created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
        "#
    ))
    .bind(id)
    .bind(project_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.date)
    .bind(MilestoneStatus::DEFAULT.as_db_str())
    .bind(req.phase_id)
    .bind(&req.acceptance_criteria)
    .bind(effective_tenant_id(&ctx, &claims))
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(milestone) => ApiResponse::success(milestone, "创建项目里程碑成功"),
        Err(e) => {
            tracing::error!("创建项目里程碑失败: {}", e);
            ApiResponse::server_error("创建项目里程碑失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:milestone:read"])),
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
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<ProjectMilestone> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let result = sqlx::query_as::<_, ProjectMilestone>(
        only_own_schema_query!("pm", "SELECT id, project_id, name, description, date, status, phase_id, acceptance_criteria, created_at, updated_at FROM pm.project_milestones WHERE project_id = $1 AND id = $2"),
    )
    .bind(project_id)
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(milestone)) => ApiResponse::success(milestone, "获取项目里程碑成功"),
        Ok(None) => ApiResponse::not_found("项目里程碑不存在"),
        Err(e) => {
            tracing::error!("获取项目里程碑失败: {}", e);
            ApiResponse::server_error("获取项目里程碑失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pm:milestone:write"])),
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
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateMilestoneRequest>,
) -> ApiResponse<ProjectMilestone> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let requested_status = match req.status.as_deref() {
        None => None,
        Some(raw) => match MilestoneStatus::normalize(raw) {
            Ok(status) => Some(status),
            Err(message) => return ApiResponse::bad_request(&message),
        },
    };
    if let Some(to) = requested_status {
        if let Err(resp) = ensure_milestone_transition(&mut scope, project_id, id, to).await {
            return resp;
        }
    }
    let requested_status = requested_status.map(MilestoneStatus::as_db_str);
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProjectMilestone>(only_own_schema_query!(
        "pm",
        r#"
        UPDATE pm.project_milestones
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            date = COALESCE($3, date),
            status = COALESCE($4, status),
            phase_id = COALESCE($5, phase_id),
            acceptance_criteria = COALESCE($6, acceptance_criteria),
            updated_at = $7
        WHERE project_id = $8 AND id = $9 
        RETURNING *
        "#
    ))
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.date)
    .bind(requested_status)
    .bind(req.phase_id)
    .bind(&req.acceptance_criteria)
    .bind(now)
    .bind(project_id)
    .bind(id)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(milestone)) => ApiResponse::success(milestone, "更新项目里程碑成功"),
        Ok(None) => ApiResponse::not_found("项目里程碑不存在"),
        Err(e) => {
            tracing::error!("更新项目里程碑失败: {}", e);
            ApiResponse::server_error("更新项目里程碑失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pm:milestone:write"])),
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
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> ApiResponse<bool> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("初始化数据库作用域失败: {}", e);
            return ApiResponse::server_error("初始化数据库作用域失败");
        }
    };
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "DELETE FROM pm.project_milestones WHERE project_id = $1 AND id = $2 "
    ))
    .bind(project_id)
    .bind(id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            ApiResponse::success(true, "删除项目里程碑成功")
        }
        Ok(_) => ApiResponse::not_found("项目里程碑不存在"),
        Err(e) => {
            tracing::error!("删除项目里程碑失败: {}", e);
            ApiResponse::server_error("删除项目里程碑失败")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const DAY: i64 = 24 * 60 * 60;

    #[test]
    fn test_completed_with_actual_date() {
        assert_eq!(
            milestone_status(1000, Some(900), 2000),
            MilestoneStatus::Completed
        );
        // completed even if actual date is after planned (late completion)
        assert_eq!(
            milestone_status(1000, Some(1500), 2000),
            MilestoneStatus::Completed
        );
    }

    #[test]
    fn test_overdue_no_actual_past_planned() {
        assert_eq!(milestone_status(1000, None, 1001), MilestoneStatus::Overdue);
        assert_eq!(milestone_status(1000, None, 2000), MilestoneStatus::Overdue);
    }

    #[test]
    fn test_in_progress_within_seven_days() {
        // exactly 7 days before -> in_progress
        assert_eq!(
            milestone_status(1000 + 7 * DAY, None, 1000),
            MilestoneStatus::InProgress
        );
        // 1 day before -> in_progress
        assert_eq!(
            milestone_status(1000 + DAY, None, 1000),
            MilestoneStatus::InProgress
        );
        // same timestamp (now == planned, not past) -> in_progress
        assert_eq!(
            milestone_status(1000, None, 1000),
            MilestoneStatus::InProgress
        );
    }

    #[test]
    fn test_upcoming_more_than_seven_days() {
        // 8 days before -> upcoming
        assert_eq!(
            milestone_status(1000 + 8 * DAY, None, 1000),
            MilestoneStatus::Pending
        );
        // 30 days before -> upcoming
        assert_eq!(
            milestone_status(1000 + 30 * DAY, None, 1000),
            MilestoneStatus::Pending
        );
    }

    #[test]
    fn test_actual_date_takes_precedence_over_overdue() {
        // Even though now > planned, actual_date means completed
        assert_eq!(
            milestone_status(1000, Some(2000), 5000),
            MilestoneStatus::Completed
        );
    }

    #[test]
    fn test_boundary_exactly_seven_days() {
        // planned_date - now == 7 days exactly -> in_progress (<=)
        assert_eq!(
            milestone_status(7 * DAY, None, 0),
            MilestoneStatus::InProgress
        );
    }

    #[test]
    fn test_boundary_just_over_seven_days() {
        // planned_date - now == 7 days + 1 sec -> upcoming
        assert_eq!(
            milestone_status(7 * DAY + 1, None, 0),
            MilestoneStatus::Pending
        );
    }

    #[test]
    fn test_all_statuses_covered() {
        let now = 1_000_000;
        assert_eq!(
            milestone_status(now, Some(now), now),
            MilestoneStatus::Completed
        );
        assert_eq!(
            milestone_status(now - 1, None, now),
            MilestoneStatus::Overdue
        );
        assert_eq!(
            milestone_status(now + 3 * DAY, None, now),
            MilestoneStatus::InProgress
        );
        assert_eq!(
            milestone_status(now + 30 * DAY, None, now),
            MilestoneStatus::Pending
        );
    }
}
