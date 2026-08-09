#![allow(dead_code)]
#![allow(clippy::redundant_closure)]
#![allow(clippy::needless_borrows_for_generic_args)]

use axum::{
    extract::{Json, Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use utoipa::ToSchema;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use topems_shared_auth::auth::AuthState;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct MobileTask {
    pub id: Uuid,
    pub title: String,
    pub description: Option<String>,
    pub task_type: String,
    pub priority: String,
    pub status: String,
    pub assignee: Option<String>,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub due_date: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateTaskRequest {
    pub title: String,
    pub description: Option<String>,
    pub task_type: String,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub assignee: Option<String>,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub due_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateTaskRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub task_type: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub assignee: Option<String>,
    pub location_lat: Option<f64>,
    pub location_lng: Option<f64>,
    pub due_date: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateStatusRequest {
    pub status: String,
}

#[utoipa::path(
    get,
    path = "/mobile-tasks",
    tag = "task",
    responses(
        (status = 200, description = "获取任务列表成功", body = serde_json::Value),
        (status = 401, description = "未授权"),
        (status = 500, description = "查询失败")
    )
)]
pub async fn get_all_tasks(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let tasks: Vec<MobileTask> = match sqlx::query_as::<_, MobileTask>(
        "SELECT id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, completed_at, created_at, updated_at 
         FROM mobile_tasks 
         WHERE assignee = $1 OR assignee IS NULL 
         ORDER BY due_date NULLS LAST, created_at DESC"
    )
    .bind(&user_id)
    .fetch_all(&pool)
    .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("查询任务失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(ApiResponse::error(500, "查询失败")));
        }
    };

    (
        StatusCode::OK,
        axum::Json(ApiResponse::success(tasks, "获取任务列表成功")),
    )
}

#[utoipa::path(
    get,
    path = "/mobile-tasks/{id}",
    tag = "task",
    params(
        ("id" = Uuid, Path, description = "任务ID")
    ),
    responses(
        (status = 200, description = "获取任务成功", body = serde_json::Value),
        (status = 401, description = "未授权"),
        (status = 404, description = "任务不存在"),
        (status = 500, description = "查询失败")
    )
)]
pub async fn get_task(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let task = match sqlx::query_as::<_, MobileTask>(
        "SELECT id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, completed_at, created_at, updated_at 
         FROM mobile_tasks 
         WHERE id = $1 AND (assignee = $2 OR assignee IS NULL)"
    )
    .bind(id)
    .bind(&user_id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(t)) => t,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, axum::Json(ApiResponse::error(404, "任务不存在")));
        }
        Err(e) => {
            tracing::error!("查询任务失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(ApiResponse::error(500, "查询失败")));
        }
    };

    (
        StatusCode::OK,
        axum::Json(ApiResponse::success(task, "获取任务成功")),
    )
}

#[utoipa::path(
    post,
    path = "/mobile-tasks",
    tag = "task",
    request_body = CreateTaskRequest,
    responses(
        (status = 201, description = "创建任务成功", body = serde_json::Value),
        (status = 401, description = "未授权"),
        (status = 500, description = "创建失败")
    )
)]
pub async fn create_task(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Json(payload): Json<CreateTaskRequest>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let task_id = Uuid::new_v4();
    let priority = payload.priority.unwrap_or_else(|| "normal".to_string());
    let status = payload.status.unwrap_or_else(|| "pending".to_string());
    let assignee = payload.assignee.clone().unwrap_or(user_id.clone());

    if let Err(e) = sqlx::query(
        "INSERT INTO mobile_tasks (id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)"
    )
    .bind(task_id)
    .bind(&payload.title)
    .bind(&payload.description)
    .bind(&payload.task_type)
    .bind(&priority)
    .bind(&status)
    .bind(&assignee)
    .bind(payload.location_lat)
    .bind(payload.location_lng)
    .bind(&payload.due_date)
    .bind(Utc::now())
    .bind(Utc::now())
    .execute(&pool)
    .await
    {
        tracing::error!("创建任务失败: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(ApiResponse::error(500, "创建失败")));
    }

    let task = MobileTask {
        id: task_id,
        title: payload.title,
        description: payload.description,
        task_type: payload.task_type,
        priority,
        status,
        assignee: Some(assignee),
        location_lat: payload.location_lat,
        location_lng: payload.location_lng,
        due_date: payload.due_date,
        completed_at: None,
        created_at: Utc::now(),
        updated_at: Utc::now(),
    };

    (
        StatusCode::CREATED,
        axum::Json(ApiResponse::success(task, "创建任务成功")),
    )
}

#[utoipa::path(
    put,
    path = "/mobile-tasks/{id}",
    tag = "task",
    params(
        ("id" = Uuid, Path, description = "任务ID")
    ),
    request_body = UpdateTaskRequest,
    responses(
        (status = 200, description = "更新成功", body = serde_json::Value),
        (status = 401, description = "未授权"),
        (status = 404, description = "任务不存在或无权修改"),
        (status = 500, description = "更新失败")
    )
)]
pub async fn update_task(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateTaskRequest>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let current_task = match sqlx::query_as::<_, MobileTask>(
        "SELECT id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, completed_at, created_at, updated_at 
         FROM mobile_tasks WHERE id = $1 AND (assignee = $2 OR assignee IS NULL)"
    )
    .bind(id)
    .bind(&user_id)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(t)) => t,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, axum::Json(ApiResponse::error(404, "任务不存在或无权修改")));
        }
        Err(e) => {
            tracing::error!("查询任务失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(ApiResponse::error(500, "查询失败")));
        }
    };

    let title = payload.title.unwrap_or(current_task.title);
    let description = payload.description.or(current_task.description);
    let task_type = payload.task_type.unwrap_or(current_task.task_type);
    let priority = payload.priority.unwrap_or(current_task.priority);
    let status = payload.status.unwrap_or(current_task.status);
    let assignee = payload.assignee.or(current_task.assignee);
    let location_lat = payload.location_lat.or(current_task.location_lat);
    let location_lng = payload.location_lng.or(current_task.location_lng);
    let due_date = payload.due_date.or(current_task.due_date);
    let completed_at = if status == "completed" && current_task.completed_at.is_none() {
        Some(Utc::now())
    } else {
        current_task.completed_at
    };

    if let Err(e) = sqlx::query(
        "UPDATE mobile_tasks 
         SET title = $1, description = $2, task_type = $3, priority = $4, status = $5, assignee = $6, 
             location_lat = $7, location_lng = $8, due_date = $9, completed_at = $10, updated_at = $11 
         WHERE id = $12 AND (assignee = $13 OR assignee IS NULL)"
    )
    .bind(&title)
    .bind(&description)
    .bind(&task_type)
    .bind(&priority)
    .bind(&status)
    .bind(&assignee)
    .bind(location_lat)
    .bind(location_lng)
    .bind(&due_date)
    .bind(&completed_at)
    .bind(Utc::now())
    .bind(id)
    .bind(&user_id)
    .execute(&pool)
    .await
    {
        tracing::error!("更新任务失败: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, axum::Json(ApiResponse::error(500, "更新失败")));
    }

    (
        StatusCode::OK,
        axum::Json(ApiResponse::success((), "更新成功")),
    )
}

pub async fn update_task_status(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateStatusRequest>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let completed_at = if payload.status == "completed" {
        Some(Utc::now())
    } else {
        None
    };

    let result = sqlx::query(
        "UPDATE mobile_tasks 
         SET status = $1, completed_at = $2, updated_at = $3 
         WHERE id = $4 AND (assignee = $5 OR assignee IS NULL)",
    )
    .bind(&payload.status)
    .bind(&completed_at)
    .bind(Utc::now())
    .bind(id)
    .bind(&user_id)
    .execute(&pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            let task = sqlx::query_as::<_, MobileTask>(
                "SELECT id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, completed_at, created_at, updated_at 
                 FROM mobile_tasks WHERE id = $1"
            )
            .bind(id)
            .fetch_one(&pool)
            .await;

            match task {
                Ok(t) => (
                    StatusCode::OK,
                    axum::Json(ApiResponse::success(t, "状态更新成功")),
                ),
                Err(e) => {
                    tracing::error!("查询任务失败: {}", e);
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        axum::Json(ApiResponse::error(500, "查询任务失败")),
                    )
                }
            }
        }
        Ok(_) => (
            StatusCode::NOT_FOUND,
            axum::Json(ApiResponse::error(404, "任务不存在或无权修改")),
        ),
        Err(e) => {
            tracing::error!("更新任务状态失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(ApiResponse::error(500, "更新失败")),
            )
        }
    }
}

#[utoipa::path(
    delete,
    path = "/mobile-tasks/{id}",
    tag = "task",
    params(
        ("id" = Uuid, Path, description = "任务ID")
    ),
    responses(
        (status = 200, description = "删除成功", body = serde_json::Value),
        (status = 401, description = "未授权"),
        (status = 404, description = "任务不存在或无权删除"),
        (status = 500, description = "删除失败")
    )
)]
pub async fn delete_task(
    headers: HeaderMap,
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                axum::Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let result = sqlx::query(
        "UPDATE mobile_tasks SET deleted_at = NOW() WHERE id = $1 AND (assignee = $2 OR assignee IS NULL)",
    )
    .bind(id)
    .bind(&user_id)
    .execute(&pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => (
            StatusCode::OK,
            axum::Json(ApiResponse::success((), "删除成功")),
        ),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            axum::Json(ApiResponse::error(404, "任务不存在或无权删除")),
        ),
        Err(e) => {
            tracing::error!("删除任务失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(ApiResponse::error(500, "删除失败")),
            )
        }
    }
}
