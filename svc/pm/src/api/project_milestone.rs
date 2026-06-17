use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::models::project_milestone::{
    CreateMilestoneRequest, ProjectMilestone, UpdateMilestoneRequest,
};

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route(
            "/api/pm/projects/{project_id}/milestones",
            get(list_milestones).post(create_milestone),
        )
        .route(
            "/api/pm/projects/{project_id}/milestones/{id}",
            get(get_milestone)
                .put(update_milestone)
                .delete(delete_milestone),
        )
        .with_state(pool)
}

#[utoipa::path(
    get,
    path = "/api/pm/projects/:project_id/milestones",
    tag = "project_milestones",
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
        "SELECT * FROM pm.project_milestones WHERE project_id = $1 ORDER BY date ASC",
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
    path = "/api/pm/projects/:project_id/milestones",
    tag = "project_milestones",
    request_body = CreateMilestoneRequest,
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
        INSERT INTO pm.project_milestones (
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
    path = "/api/pm/projects/:project_id/milestones/:id",
    tag = "project_milestones",
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
        "SELECT * FROM pm.project_milestones WHERE project_id = $1 AND id = $2",
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
    path = "/api/pm/projects/:project_id/milestones/:id",
    tag = "project_milestones",
    request_body = UpdateMilestoneRequest,
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
    path = "/api/pm/projects/:project_id/milestones/:id",
    tag = "project_milestones",
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
