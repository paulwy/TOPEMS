use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::models::project_resource::{
    CreateResourceRequest, ProjectResource, UpdateResourceRequest,
};

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route(
            "/api/pm/projects/{project_id}/resources",
            get(list_resources).post(add_resource),
        )
        .route(
            "/api/pm/projects/{project_id}/resources/{id}",
            get(get_resource)
                .put(update_resource)
                .delete(remove_resource),
        )
        .with_state(pool)
}

#[utoipa::path(
    get,
    path = "/api/pm/projects/:project_id/resources",
    tag = "project_resources",
    responses(
        (status = 200, description = "获取项目资源列表成功", body = ApiResponse<Vec<ProjectResource>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn list_resources(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProjectResource>>> {
    let result = sqlx::query_as::<_, ProjectResource>(
        "SELECT * FROM pm.project_resources WHERE project_id = $1 ORDER BY resource_type ASC",
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(resources) => Json(ApiResponse::success(resources, "获取项目资源列表成功")),
        Err(e) => {
            tracing::error!("获取项目资源列表失败: {}", e);
            Json(ApiResponse::error(500, "获取项目资源列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/projects/:project_id/resources",
    tag = "project_resources",
    request_body = CreateResourceRequest,
    responses(
        (status = 200, description = "添加项目资源成功", body = ApiResponse<ProjectResource>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn add_resource(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<CreateResourceRequest>,
) -> Json<ApiResponse<ProjectResource>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProjectResource>(
        r#"
        INSERT INTO pm.project_resources (
            id, project_id, resource_type, resource_id, resource_service,
            role, start_date, end_date, allocation_percent, actual_hours,
            actual_cost, status, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(project_id)
    .bind(&req.resource_type)
    .bind(req.resource_id)
    .bind(&req.resource_service)
    .bind(&req.role)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.allocation_percent.unwrap_or(100))
    .bind(0)
    .bind(0.0)
    .bind("active")
    .bind(&req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(resource) => Json(ApiResponse::success(resource, "添加项目资源成功")),
        Err(e) => {
            tracing::error!("添加项目资源失败: {}", e);
            Json(ApiResponse::error(500, "添加项目资源失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/pm/projects/:project_id/resources/:id",
    tag = "project_resources",
    responses(
        (status = 200, description = "获取项目资源成功", body = ApiResponse<ProjectResource>),
        (status = 404, description = "项目资源不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_resource(
    State(pool): State<PgPool>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<ProjectResource>> {
    let result = sqlx::query_as::<_, ProjectResource>(
        "SELECT * FROM pm.project_resources WHERE project_id = $1 AND id = $2",
    )
    .bind(project_id)
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(resource)) => Json(ApiResponse::success(resource, "获取项目资源成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目资源不存在")),
        Err(e) => {
            tracing::error!("获取项目资源失败: {}", e);
            Json(ApiResponse::error(500, "获取项目资源失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/pm/projects/:project_id/resources/:id",
    tag = "project_resources",
    request_body = UpdateResourceRequest,
    responses(
        (status = 200, description = "更新项目资源成功", body = ApiResponse<ProjectResource>),
        (status = 404, description = "项目资源不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn update_resource(
    State(pool): State<PgPool>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateResourceRequest>,
) -> Json<ApiResponse<ProjectResource>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProjectResource>(
        r#"
        UPDATE pm.project_resources
        SET role = COALESCE($1, role),
            start_date = COALESCE($2, start_date),
            end_date = COALESCE($3, end_date),
            allocation_percent = COALESCE($4, allocation_percent),
            actual_hours = COALESCE($5, actual_hours),
            actual_cost = COALESCE($6, actual_cost),
            status = COALESCE($7, status),
            updated_at = $8
        WHERE project_id = $9 AND id = $10
        RETURNING *
        "#,
    )
    .bind(&req.role)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.allocation_percent)
    .bind(req.actual_hours)
    .bind(req.actual_cost)
    .bind(&req.status)
    .bind(now)
    .bind(project_id)
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(resource)) => Json(ApiResponse::success(resource, "更新项目资源成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目资源不存在")),
        Err(e) => {
            tracing::error!("更新项目资源失败: {}", e);
            Json(ApiResponse::error(500, "更新项目资源失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/pm/projects/:project_id/resources/:id",
    tag = "project_resources",
    responses(
        (status = 200, description = "删除项目资源成功", body = ApiResponse<bool>),
        (status = 404, description = "项目资源不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn remove_resource(
    State(pool): State<PgPool>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<bool>> {
    let result = sqlx::query("DELETE FROM pm.project_resources WHERE project_id = $1 AND id = $2")
        .bind(project_id)
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            Json(ApiResponse::success(true, "删除项目资源成功"))
        }
        Ok(_) => Json(ApiResponse::error(404, "项目资源不存在")),
        Err(e) => {
            tracing::error!("删除项目资源失败: {}", e);
            Json(ApiResponse::error(500, "删除项目资源失败"))
        }
    }
}
