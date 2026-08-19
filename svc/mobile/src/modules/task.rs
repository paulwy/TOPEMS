#![allow(dead_code)]
#![allow(clippy::redundant_closure)]
#![allow(clippy::needless_borrows_for_generic_args)]

use axum::{
    extract::{Json, Path, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use utoipa::ToSchema;
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

/// 将任务优先级字符串转换为可排序的整数，数值越小优先级越高。
/// unknown 优先级最低（数值最大）。
pub fn priority_to_int(priority: &str) -> i32 {
    match priority {
        "urgent" => 0,
        "high" => 1,
        "normal" => 2,
        "low" => 3,
        _ => i32::MAX,
    }
}

/// 校验任务状态字符串是否合法。
pub fn is_valid_task_status(status: &str) -> bool {
    matches!(
        status,
        "pending" | "in_progress" | "completed" | "cancelled" | "on_hold"
    )
}

/// 校验任务优先级字符串是否合法。
pub fn is_valid_task_priority(priority: &str) -> bool {
    matches!(priority, "urgent" | "high" | "normal" | "low")
}

/// 校验任务状态转换是否合法。
pub fn is_valid_task_transition(from: &str, to: &str) -> bool {
    if from == to {
        return true;
    }
    match from {
        "pending" => matches!(to, "in_progress" | "cancelled" | "on_hold"),
        "in_progress" => matches!(to, "completed" | "cancelled" | "on_hold" | "pending"),
        "on_hold" => matches!(to, "in_progress" | "cancelled" | "pending"),
        "completed" => matches!(to, "in_progress"),
        "cancelled" => matches!(to, "pending"),
        _ => false,
    }
}

/// 按优先级对任务进行稳定排序（urgent > high > normal > low > unknown）。
/// 返回新的 Vec，输入顺序在相同优先级下保持不变。
pub fn sort_tasks_by_priority(mut tasks: Vec<(String, i32)>) -> Vec<(String, i32)> {
    tasks.sort_by_key(|(_, p)| *p);
    tasks
}

/// 根据优先级字符串和当前任务列表，构造 (title, priority_int) 元组并按优先级排序。
pub fn sort_task_titles_by_priority_str(titles: &[(String, String)]) -> Vec<(String, i32)> {
    let mut entries: Vec<(String, i32)> = titles
        .iter()
        .map(|(t, p)| (t.clone(), priority_to_int(p)))
        .collect();
    entries.sort_by_key(|(_, p)| *p);
    entries
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:task:read"])),
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
    security(("BearerAuth" = ["mobile:task:read"])),
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
    security(("BearerAuth" = ["mobile:config:write"])),
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
    security(("BearerAuth" = ["mobile:task:read"])),
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
    security(("BearerAuth" = ["mobile:task:read"])),
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

#[cfg(test)]
mod tests {
    use super::*;

    // ---- priority_to_int ----

    #[test]
    fn test_priority_to_int_known() {
        assert_eq!(priority_to_int("urgent"), 0);
        assert_eq!(priority_to_int("high"), 1);
        assert_eq!(priority_to_int("normal"), 2);
        assert_eq!(priority_to_int("low"), 3);
    }

    #[test]
    fn test_priority_to_int_unknown() {
        assert_eq!(priority_to_int(""), i32::MAX);
        assert_eq!(priority_to_int("URGENT"), i32::MAX);
        assert_eq!(priority_to_int("medium"), i32::MAX);
    }

    #[test]
    fn test_priority_to_int_ordering() {
        assert!(priority_to_int("urgent") < priority_to_int("high"));
        assert!(priority_to_int("high") < priority_to_int("normal"));
        assert!(priority_to_int("normal") < priority_to_int("low"));
    }

    // ---- is_valid_task_status ----

    #[test]
    fn test_is_valid_task_status_valid() {
        assert!(is_valid_task_status("pending"));
        assert!(is_valid_task_status("in_progress"));
        assert!(is_valid_task_status("completed"));
        assert!(is_valid_task_status("cancelled"));
        assert!(is_valid_task_status("on_hold"));
    }

    #[test]
    fn test_is_valid_task_status_invalid() {
        assert!(!is_valid_task_status(""));
        assert!(!is_valid_task_status("done"));
        assert!(!is_valid_task_status("PENDING"));
        assert!(!is_valid_task_status("archived"));
    }

    // ---- is_valid_task_priority ----

    #[test]
    fn test_is_valid_task_priority_valid() {
        assert!(is_valid_task_priority("urgent"));
        assert!(is_valid_task_priority("high"));
        assert!(is_valid_task_priority("normal"));
        assert!(is_valid_task_priority("low"));
    }

    #[test]
    fn test_is_valid_task_priority_invalid() {
        assert!(!is_valid_task_priority(""));
        assert!(!is_valid_task_priority("medium"));
        assert!(!is_valid_task_priority("URGENT"));
    }

    // ---- is_valid_task_transition ----

    #[test]
    fn test_is_valid_task_transition_same_status() {
        assert!(is_valid_task_transition("pending", "pending"));
        assert!(is_valid_task_transition("completed", "completed"));
    }

    #[test]
    fn test_is_valid_task_transition_pending_to_in_progress() {
        assert!(is_valid_task_transition("pending", "in_progress"));
    }

    #[test]
    fn test_is_valid_task_transition_in_progress_to_completed() {
        assert!(is_valid_task_transition("in_progress", "completed"));
    }

    #[test]
    fn test_is_valid_task_transition_invalid_pending_to_completed() {
        // 不允许从 pending 直接跳到 completed
        assert!(!is_valid_task_transition("pending", "completed"));
    }

    #[test]
    fn test_is_valid_task_transition_completed_to_pending_invalid() {
        assert!(!is_valid_task_transition("completed", "pending"));
    }

    #[test]
    fn test_is_valid_task_transition_unknown_status() {
        assert!(!is_valid_task_transition("unknown", "pending"));
        assert!(!is_valid_task_transition("pending", "unknown"));
    }

    #[test]
    fn test_is_valid_task_transition_cancelled_reopen() {
        assert!(is_valid_task_transition("cancelled", "pending"));
        assert!(!is_valid_task_transition("cancelled", "completed"));
    }

    #[test]
    fn test_is_valid_task_transition_on_hold_resume() {
        assert!(is_valid_task_transition("on_hold", "in_progress"));
        assert!(is_valid_task_transition("in_progress", "on_hold"));
    }

    // ---- sort_tasks_by_priority ----

    #[test]
    fn test_sort_tasks_by_priority_empty() {
        assert!(sort_tasks_by_priority(vec![]).is_empty());
    }

    #[test]
    fn test_sort_tasks_by_priority_single() {
        let result = sort_tasks_by_priority(vec![("A".to_string(), 2)]);
        assert_eq!(result, vec![("A".to_string(), 2)]);
    }

    #[test]
    fn test_sort_tasks_by_priority_multiple() {
        let input = vec![
            ("low_task".to_string(), 3),
            ("urgent_task".to_string(), 0),
            ("normal_task".to_string(), 2),
            ("high_task".to_string(), 1),
        ];
        let result = sort_tasks_by_priority(input);
        assert_eq!(result[0].0, "urgent_task");
        assert_eq!(result[1].0, "high_task");
        assert_eq!(result[2].0, "normal_task");
        assert_eq!(result[3].0, "low_task");
    }

    #[test]
    fn test_sort_tasks_by_priority_stable_equal_priorities() {
        let input = vec![
            ("first".to_string(), 2),
            ("second".to_string(), 2),
            ("third".to_string(), 2),
        ];
        let result = sort_tasks_by_priority(input);
        assert_eq!(result[0].0, "first");
        assert_eq!(result[1].0, "second");
        assert_eq!(result[2].0, "third");
    }

    #[test]
    fn test_sort_tasks_by_priority_already_sorted() {
        let input = vec![("urgent".to_string(), 0), ("high".to_string(), 1)];
        let result = sort_tasks_by_priority(input);
        assert_eq!(result[0].0, "urgent");
        assert_eq!(result[1].0, "high");
    }

    // ---- sort_task_titles_by_priority_str ----

    #[test]
    fn test_sort_task_titles_by_priority_str_mixed() {
        let input = vec![
            ("low_task".to_string(), "low".to_string()),
            ("urgent_task".to_string(), "urgent".to_string()),
            ("unknown_task".to_string(), "weird".to_string()),
        ];
        let result = sort_task_titles_by_priority_str(&input);
        assert_eq!(result[0].0, "urgent_task");
        assert_eq!(result[0].1, 0);
        assert_eq!(result[1].0, "low_task");
        assert_eq!(result[2].0, "unknown_task");
        assert_eq!(result[2].1, i32::MAX);
    }

    #[test]
    fn test_sort_task_titles_by_priority_str_empty() {
        let result = sort_task_titles_by_priority_str(&[]);
        assert!(result.is_empty());
    }
}
