use axum::{
    extract::{Path, State},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use topems_shared::ApiResponse;
use uuid::Uuid;

use crate::models::project_member::{CreateMemberRequest, ProjectMember, UpdateMemberRequest};

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route(
            "/api/pm/projects/{project_id}/members",
            get(list_members).post(create_member),
        )
        .route(
            "/api/pm/projects/{project_id}/members/{id}",
            get(get_member).put(update_member).delete(delete_member),
        )
        .with_state(pool)
}

#[utoipa::path(
    get,
    path = "/api/pm/projects/:project_id/members",
    tag = "project_members",
    responses(
        (status = 200, description = "获取项目成员列表成功", body = ApiResponse<Vec<ProjectMember>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn list_members(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProjectMember>>> {
    let result = sqlx::query_as::<_, ProjectMember>(
        "SELECT * FROM pm.project_members WHERE project_id = $1 ORDER BY role ASC",
    )
    .bind(project_id)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(members) => Json(ApiResponse::success(members, "获取项目成员列表成功")),
        Err(e) => {
            tracing::error!("获取项目成员列表失败: {}", e);
            Json(ApiResponse::error(500, "获取项目成员列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/projects/:project_id/members",
    tag = "project_members",
    request_body = CreateMemberRequest,
    responses(
        (status = 200, description = "添加项目成员成功", body = ApiResponse<ProjectMember>),
        (status = 409, description = "成员已存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn create_member(
    State(pool): State<PgPool>,
    Path(project_id): Path<Uuid>,
    Json(req): Json<CreateMemberRequest>,
) -> Json<ApiResponse<ProjectMember>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProjectMember>(
        r#"
        INSERT INTO plugin_pm.project_members (
            id, project_id, user_id, role, responsibilities,
            start_date, end_date, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (project_id, user_id) DO NOTHING
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(project_id)
    .bind(&req.user_id)
    .bind(&req.role)
    .bind(&req.responsibilities)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(now)
    .bind(now)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(member)) => Json(ApiResponse::success(member, "添加项目成员成功")),
        Ok(None) => Json(ApiResponse::error(409, "成员已存在")),
        Err(e) => {
            tracing::error!("添加项目成员失败: {}", e);
            Json(ApiResponse::error(500, "添加项目成员失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/pm/projects/:project_id/members/:id",
    tag = "project_members",
    responses(
        (status = 200, description = "获取项目成员成功", body = ApiResponse<ProjectMember>),
        (status = 404, description = "项目成员不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_member(
    State(pool): State<PgPool>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<ProjectMember>> {
    let result = sqlx::query_as::<_, ProjectMember>(
        "SELECT * FROM pm.project_members WHERE project_id = $1 AND id = $2",
    )
    .bind(project_id)
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(member)) => Json(ApiResponse::success(member, "获取项目成员成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目成员不存在")),
        Err(e) => {
            tracing::error!("获取项目成员失败: {}", e);
            Json(ApiResponse::error(500, "获取项目成员失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/pm/projects/:project_id/members/:id",
    tag = "project_members",
    request_body = UpdateMemberRequest,
    responses(
        (status = 200, description = "更新项目成员成功", body = ApiResponse<ProjectMember>),
        (status = 404, description = "项目成员不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn update_member(
    State(pool): State<PgPool>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
    Json(req): Json<UpdateMemberRequest>,
) -> Json<ApiResponse<ProjectMember>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProjectMember>(
        r#"
        UPDATE plugin_pm.project_members
        SET role = COALESCE($1, role),
            responsibilities = COALESCE($2, responsibilities),
            start_date = COALESCE($3, start_date),
            end_date = COALESCE($4, end_date),
            updated_at = $5
        WHERE project_id = $6 AND id = $7
        RETURNING *
        "#,
    )
    .bind(&req.role)
    .bind(&req.responsibilities)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(now)
    .bind(project_id)
    .bind(id)
    .fetch_optional(&pool)
    .await;

    match result {
        Ok(Some(member)) => Json(ApiResponse::success(member, "更新项目成员成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目成员不存在")),
        Err(e) => {
            tracing::error!("更新项目成员失败: {}", e);
            Json(ApiResponse::error(500, "更新项目成员失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/pm/projects/:project_id/members/:id",
    tag = "project_members",
    responses(
        (status = 200, description = "删除项目成员成功", body = ApiResponse<bool>),
        (status = 404, description = "项目成员不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn delete_member(
    State(pool): State<PgPool>,
    Path((project_id, id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<bool>> {
    let result = sqlx::query("DELETE FROM pm.project_members WHERE project_id = $1 AND id = $2")
        .bind(project_id)
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            Json(ApiResponse::success(true, "删除项目成员成功"))
        }
        Ok(_) => Json(ApiResponse::error(404, "项目成员不存在")),
        Err(e) => {
            tracing::error!("删除项目成员失败: {}", e);
            Json(ApiResponse::error(500, "删除项目成员失败"))
        }
    }
}
