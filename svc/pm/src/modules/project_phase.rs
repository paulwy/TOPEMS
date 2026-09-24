use axum::{
    extract::{Extension, Path, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use uuid::Uuid;

use crate::models::project_phase::{CreatePhaseRequest, ProjectPhase, UpdatePhaseRequest};
use crate::modules::effective_tenant_id;

// ==================== Pure functions ====================

/// Calculates phase progress as a percentage based on completed vs total tasks.
///
/// Returns a value in the range `[0.0, 100.0]`.
/// Returns `0.0` when `total_tasks` is zero.
pub fn calculate_phase_progress(completed_tasks: usize, total_tasks: usize) -> f64 {
    if total_tasks == 0 {
        return 0.0;
    }
    let pct = (completed_tasks as f64 / total_tasks as f64) * 100.0;
    pct.clamp(0.0, 100.0)
}

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route(
            "/projects/{project_id}/phases",
            get(list_phases).post(create_phase),
        )
        .route(
            "/projects/{project_id}/phases/{id}",
            get(get_phase).put(update_phase).delete(delete_phase),
        )
        .with_state(pool)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/phases",
    tag = "project_phases",
    params(
        ("project_id" = Uuid, Path, description = "project_id")
    ),

    responses(
        (status = 200, description = "获取项目阶段列表成功", body = ApiResponse<Vec<ProjectPhase>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn list_phases(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProjectPhase>>> {
    let result = sqlx::query_as::<_, ProjectPhase>(
        only_own_schema_query!("pm", "id, project_id, name, description, sequence_number, start_date, end_date, progress, status, predecessor_ids, created_at, updated_at FROM pm.project_phases WHERE project_id = $1 ORDER BY sequence_number ASC"),
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(phases) => Json(ApiResponse::success(phases, "获取项目阶段列表成功")),
        Err(e) => {
            tracing::error!("获取项目阶段列表失败: {}", e);
            Json(ApiResponse::error(500, "获取项目阶段列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:write"])),
    path = "/projects/{project_id}/phases",
    tag = "project_phases",
    request_body = CreatePhaseRequest,
    params(
        ("project_id" = Uuid, Path, description = "project_id")
    ),

    responses(
        (status = 200, description = "创建项目阶段成功", body = ApiResponse<ProjectPhase>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn create_phase(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreatePhaseRequest>,
) -> Json<ApiResponse<ProjectPhase>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "pm",
        "SELECT COUNT(*) FROM pm.project_phases WHERE project_id = $1"
    ))
    .bind(project_id)
    .fetch_one(&pool)
    .await;

    let sequence_number = match count_result {
        Ok(count) => count as i32 + 1,
        Err(_) => 1,
    };

    let result = sqlx::query_as::<_, ProjectPhase>(only_own_schema_query!(
        "pm",
        r#"
        INSERT INTO pm.project_phases (
            id, project_id, name, description, sequence_number,
            start_date, end_date, progress, status, predecessor_ids,
            created_at, updated_at, tenant_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
        "#
    ))
    .bind(id)
    .bind(project_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(sequence_number)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(0)
    .bind("pending")
    .bind(&req.predecessor_ids)
    .bind(effective_tenant_id(&ctx, &claims))
    .bind(now)
    .bind(effective_tenant_id(&ctx, &claims))
    .fetch_one(&pool)
    .await;

    match result {
        Ok(phase) => Json(ApiResponse::success(phase, "创建项目阶段成功")),
        Err(e) => {
            tracing::error!("创建项目阶段失败: {}", e);
            Json(ApiResponse::error(500, "创建项目阶段失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/phases/{id}",
    tag = "project_phases",
    params(
        ("project_id" = Uuid, Path, description = "project_id"),
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "获取项目阶段成功", body = ApiResponse<ProjectPhase>),
        (status = 404, description = "项目阶段不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_phase(
    State(pool): State<PgPool>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<ProjectPhase>> {
    let result = sqlx::query_as::<_, ProjectPhase>(
        only_own_schema_query!("pm", "id, project_id, name, description, sequence_number, start_date, end_date, progress, status, predecessor_ids, created_at, updated_at FROM pm.project_phases WHERE project_id = $1 AND id = $2"),
    )
    .bind(project_id)
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(phase)) => Json(ApiResponse::success(phase, "获取项目阶段成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目阶段不存在")),
        Err(e) => {
            tracing::error!("获取项目阶段失败: {}", e);
            Json(ApiResponse::error(500, "获取项目阶段失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pm:update"])),
    path = "/projects/{project_id}/phases/{id}",
    tag = "project_phases",
    request_body = UpdatePhaseRequest,
    params(
        ("project_id" = Uuid, Path, description = "project_id"),
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "更新项目阶段成功", body = ApiResponse<ProjectPhase>),
        (status = 404, description = "项目阶段不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn update_phase(
    State(pool): State<PgPool>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdatePhaseRequest>,
) -> Json<ApiResponse<ProjectPhase>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProjectPhase>(only_own_schema_query!(
        "pm",
        r#"
        UPDATE pm.project_phases
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            sequence_number = COALESCE($3, sequence_number),
            start_date = COALESCE($4, start_date),
            end_date = COALESCE($5, end_date),
            progress = COALESCE($6, progress),
            status = COALESCE($7, status),
            predecessor_ids = COALESCE($8, predecessor_ids),
            updated_at = $9
        WHERE project_id = $10 AND id = $11
        RETURNING *
        "#
    ))
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.sequence_number)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.progress)
    .bind(&req.status)
    .bind(&req.predecessor_ids)
    .bind(now)
    .bind(project_id)
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(phase)) => Json(ApiResponse::success(phase, "更新项目阶段成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目阶段不存在")),
        Err(e) => {
            tracing::error!("更新项目阶段失败: {}", e);
            Json(ApiResponse::error(500, "更新项目阶段失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pm:delete"])),
    path = "/projects/{project_id}/phases/{id}",
    tag = "project_phases",
    params(
        ("project_id" = Uuid, Path, description = "project_id"),
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "删除项目阶段成功", body = ApiResponse<bool>),
        (status = 404, description = "项目阶段不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn delete_phase(
    State(pool): State<PgPool>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<bool>> {
    let result = sqlx::query(only_own_schema_query!(
        "pm",
        "DELETE FROM pm.project_phases WHERE project_id = $1 AND id = $2"
    ))
    .bind(project_id)
    .bind(id)
    .execute(&pool)
    .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            Json(ApiResponse::success(true, "删除项目阶段成功"))
        }
        Ok(_) => Json(ApiResponse::error(404, "项目阶段不存在")),
        Err(e) => {
            tracing::error!("删除项目阶段失败: {}", e);
            Json(ApiResponse::error(500, "删除项目阶段失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zero_total_tasks() {
        assert_eq!(calculate_phase_progress(0, 0), 0.0);
        assert_eq!(calculate_phase_progress(5, 0), 0.0);
    }

    #[test]
    fn test_no_completed_tasks() {
        assert_eq!(calculate_phase_progress(0, 10), 0.0);
    }

    #[test]
    fn test_all_completed() {
        assert_eq!(calculate_phase_progress(10, 10), 100.0);
        assert_eq!(calculate_phase_progress(1, 1), 100.0);
    }

    #[test]
    fn test_half_completed() {
        assert_eq!(calculate_phase_progress(5, 10), 50.0);
    }

    #[test]
    fn test_third_completed() {
        let result = calculate_phase_progress(1, 3);
        assert!((result - 33.333_333_333_333_336).abs() < 1e-9);
    }

    #[test]
    fn test_clamps_overflow() {
        assert_eq!(calculate_phase_progress(15, 10), 100.0);
    }

    #[test]
    fn test_clamps_negative_ratio_not_possible() {
        // usize can't be negative, but verify 0/1 = 0
        assert_eq!(calculate_phase_progress(0, 1), 0.0);
    }

    #[test]
    fn test_large_numbers() {
        assert_eq!(calculate_phase_progress(500_000, 1_000_000), 50.0);
        assert_eq!(calculate_phase_progress(999_999, 1_000_000), 99.9999);
    }
}
