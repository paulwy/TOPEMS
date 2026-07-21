use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::models::project_phase::{CreatePhaseRequest, ProjectPhase, UpdatePhaseRequest};

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
    path = "/projects/{project_id}/phases",
    tag = "project_phases",
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
        "SELECT * FROM pm.project_phases WHERE project_id = $1 ORDER BY sequence_number ASC",
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
    path = "/projects/{project_id}/phases",
    tag = "project_phases",
    request_body = CreatePhaseRequest,
    responses(
        (status = 200, description = "创建项目阶段成功", body = ApiResponse<ProjectPhase>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn create_phase(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<CreatePhaseRequest>,
) -> Json<ApiResponse<ProjectPhase>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let count_result = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM pm.project_phases WHERE project_id = $1",
    )
    .bind(project_id)
    .fetch_one(&pool)
    .await;

    let sequence_number = match count_result {
        Ok(count) => count as i32 + 1,
        Err(_) => 1,
    };

    let result = sqlx::query_as::<_, ProjectPhase>(
        r#"
        INSERT INTO plugin_pm.project_phases (
            id, project_id, name, description, sequence_number,
            start_date, end_date, progress, status, predecessor_ids,
            created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
        "#,
    )
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
    .bind(now)
    .bind(now)
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
    path = "/projects/{project_id}/phases/{id}",
    tag = "project_phases",
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
        "SELECT * FROM pm.project_phases WHERE project_id = $1 AND id = $2",
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
    path = "/projects/{project_id}/phases/{id}",
    tag = "project_phases",
    request_body = UpdatePhaseRequest,
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

    let result = sqlx::query_as::<_, ProjectPhase>(
        r#"
        UPDATE plugin_pm.project_phases
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
        "#,
    )
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
    path = "/projects/{project_id}/phases/{id}",
    tag = "project_phases",
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
    let result = sqlx::query("DELETE FROM pm.project_phases WHERE project_id = $1 AND id = $2")
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
