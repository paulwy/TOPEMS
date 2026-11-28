#![allow(dead_code)]
#![allow(clippy::redundant_closure)]
#![allow(clippy::needless_borrows_for_generic_args)]

use axum::{
    extract::{Extension, Json, Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_db::scope::Db;
use utoipa::ToSchema;
use uuid::Uuid;

use super::auth_utils::extract_user_id_from_token;
use topems_shared_auth::auth::{AuthState, Claims};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_core::response::ApiResponse;

fn tenant_filter(claims: &Claims) -> Option<Uuid> {
    if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    }
}

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

#[derive(Debug, Clone, Deserialize)]
pub struct SearchTasksParams {
    pub keyword: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct BatchStatusRequest {
    pub ids: Vec<Uuid>,
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

/// 统一状态写入口的值域 + 来源态守卫；返回可直接给 400 的中文原因。
fn ensure_task_status_change(from: &str, to: &str) -> Result<(), String> {
    if !is_valid_task_status(to) {
        return Err(format!("无效的任务状态: {to}"));
    }
    if !is_valid_task_transition(from, to) {
        return Err(format!("非法任务状态转移: {from} -> {to}"));
    }
    Ok(())
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

pub async fn get_all_tasks(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let __mobile_response = {
        let tasks: Vec<MobileTask> = match sqlx::query_as::<_, MobileTask>(
        only_own_schema_query!("mobile", "SELECT id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, completed_at, created_at, updated_at 
         FROM mobile.mobile_tasks 
         WHERE deleted_at IS NULL AND (assignee = $1 OR assignee IS NULL) 
         ORDER BY due_date NULLS LAST, created_at DESC")
    )
    .bind(&user_id)
    .fetch_all(&mut scope)

    .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("查询任务失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("查询失败"));
        }
    };

        (
            StatusCode::OK,
            ApiResponse::success(tasks, "获取任务列表成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

pub async fn get_task(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let task = match sqlx::query_as::<_, MobileTask>(
        only_own_schema_query!("mobile", "SELECT id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, completed_at, created_at, updated_at 
         FROM mobile.mobile_tasks 
         WHERE id = $1 AND (assignee = $2 OR assignee IS NULL) AND deleted_at IS NULL")
    )
    .bind(id)
    .bind(&user_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(t)) => t,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, ApiResponse::not_found("任务不存在"));
        }
        Err(e) => {
            tracing::error!("查询任务失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("查询失败"));
        }
    };

    let __mobile_response = { (StatusCode::OK, ApiResponse::success(task, "获取任务成功")) };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    post,
    path = "/api/mobile/mobile-tasks",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn create_task(
    headers: HeaderMap,
    Extension(claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<CreateTaskRequest>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    // 写入归属：mobile.mobile_tasks.tenant_id 为 NOT NULL，必须绑定具体租户。
    // 超管优先取 claims.tenant_id，缺失时落系统租户（nil）；行级读取过滤仍保留
    // 「super → 不加租户条件」的语义（见 tenant_filter）。
    let insert_tenant_id: Uuid = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or_else(Uuid::nil);

    let task_id = Uuid::new_v4();
    let priority = payload.priority.unwrap_or_else(|| "normal".to_string());
    let status = payload.status.unwrap_or_else(|| "pending".to_string());
    let assignee = payload.assignee.clone().unwrap_or(user_id.clone());

    if let Err(e) = sqlx::query(
        only_own_schema_query!("mobile", "INSERT INTO mobile.mobile_tasks (id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, created_at, updated_at, tenant_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11, $12, $13)")
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
    .bind(insert_tenant_id)
    .execute(&mut scope)
    .await
    {
        tracing::error!("创建任务失败: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("创建失败"));
    }

    let __mobile_response = {
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
            ApiResponse::success(task, "创建任务成功"),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

pub async fn update_task(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateTaskRequest>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let current_task = match sqlx::query_as::<_, MobileTask>(
        only_own_schema_query!("mobile", "SELECT id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, completed_at, created_at, updated_at 
         FROM mobile.mobile_tasks WHERE id = $1 AND (assignee = $2 OR assignee IS NULL) AND deleted_at IS NULL")
    )
    .bind(id)
    .bind(&user_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(t)) => t,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, ApiResponse::not_found("任务不存在或无权修改"));
        }
        Err(e) => {
            tracing::error!("查询任务失败: {}", e);
            return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("查询失败"));
        }
    };

    let title = payload.title.unwrap_or(current_task.title);
    let description = payload.description.or(current_task.description);
    let task_type = payload.task_type.unwrap_or(current_task.task_type);
    let priority = payload.priority.unwrap_or(current_task.priority);
    let previous_status = current_task.status.clone();
    let status = payload.status.unwrap_or(current_task.status);
    if let Err(message) = ensure_task_status_change(&previous_status, &status) {
        return (StatusCode::BAD_REQUEST, ApiResponse::bad_request(&message));
    }
    let assignee = payload.assignee.or(current_task.assignee);
    let location_lat = payload.location_lat.or(current_task.location_lat);
    let location_lng = payload.location_lng.or(current_task.location_lng);
    let due_date = payload.due_date.or(current_task.due_date);
    let completed_at = if status == "completed" {
        current_task.completed_at.or_else(|| Some(Utc::now()))
    } else {
        None
    };

    if let Err(e) = sqlx::query(
        only_own_schema_query!("mobile", "UPDATE mobile.mobile_tasks 
         SET title = $1, description = $2, task_type = $3, priority = $4, status = $5, assignee = $6, 
             location_lat = $7, location_lng = $8, due_date = $9, completed_at = $10, updated_at = $11 
         WHERE id = $12 AND (assignee = $13 OR assignee IS NULL) AND status = $14")
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
    .bind(&previous_status)
    .execute(&mut scope)
    .await
    {
        tracing::error!("更新任务失败: {}", e);
        return (StatusCode::INTERNAL_SERVER_ERROR, ApiResponse::server_error("更新失败"));
    }

    let __mobile_response = { (StatusCode::OK, ApiResponse::success((), "更新成功")) };
    let _ = scope.commit().await;
    __mobile_response
}

#[utoipa::path(
    put,
    path = "/api/mobile/mobile-tasks/{id}/status",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn update_task_status(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateStatusRequest>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let current_status = match sqlx::query_scalar::<_, String>(only_own_schema_query!(
        "mobile",
        "SELECT status FROM mobile.mobile_tasks WHERE id = $1 AND (assignee = $2 OR assignee IS NULL) AND deleted_at IS NULL"
    ))
    .bind(id)
    .bind(&user_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(status)) => status,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                ApiResponse::not_found("任务不存在或无权修改"),
            );
        }
        Err(e) => {
            tracing::error!("读取任务状态失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("读取任务状态失败"),
            );
        }
    };
    if let Err(message) = ensure_task_status_change(&current_status, &payload.status) {
        return (StatusCode::BAD_REQUEST, ApiResponse::bad_request(&message));
    }

    let completed_at = if payload.status == "completed" {
        Some(Utc::now())
    } else {
        None
    };

    let result = sqlx::query(only_own_schema_query!(
        "mobile",
        "UPDATE mobile.mobile_tasks 
         SET status = $1, completed_at = $2, updated_at = $3 
         WHERE id = $4 AND (assignee = $5 OR assignee IS NULL) AND status = $6"
    ))
    .bind(&payload.status)
    .bind(&completed_at)
    .bind(Utc::now())
    .bind(id)
    .bind(&user_id)
    .bind(&current_status)
    .execute(&mut scope)
    .await;

    let __mobile_response = {
        match result {
            Ok(r) if r.rows_affected() > 0 => {
                let task = sqlx::query_as::<_, MobileTask>(
                only_own_schema_query!("mobile", "SELECT id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, completed_at, created_at, updated_at 
                 FROM mobile.mobile_tasks WHERE id = $1 AND deleted_at IS NULL")
            )
            .bind(id)
            .fetch_one(&mut scope)
            .await;

                match task {
                    Ok(t) => (StatusCode::OK, ApiResponse::success(t, "状态更新成功")),
                    Err(e) => {
                        tracing::error!("查询任务失败: {}", e);
                        (
                            StatusCode::INTERNAL_SERVER_ERROR,
                            ApiResponse::server_error("查询任务失败"),
                        )
                    }
                }
            }
            Ok(_) => (
                StatusCode::NOT_FOUND,
                ApiResponse::not_found("任务不存在或无权修改"),
            ),
            Err(e) => {
                tracing::error!("更新任务状态失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("更新失败"),
                )
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

pub async fn delete_task(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let result = sqlx::query(
        only_own_schema_query!("mobile", "UPDATE mobile.mobile_tasks SET deleted_at = NOW() WHERE id = $1 AND (assignee = $2 OR assignee IS NULL) AND deleted_at IS NULL"),
    )
    .bind(id)
    .bind(&user_id)
    .execute(&mut scope)
    .await;

    let __mobile_response = {
        match result {
            Ok(r) if r.rows_affected() > 0 => {
                (StatusCode::OK, ApiResponse::success((), "删除成功"))
            }
            Ok(_) => (
                StatusCode::NOT_FOUND,
                ApiResponse::not_found("任务不存在或无权删除"),
            ),
            Err(e) => {
                tracing::error!("删除任务失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("删除失败"),
                )
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

// ===== 页面级缺口补充 handler（前端 task.ts 单数路径对齐，2026-10-05）=====

/// 我的任务（仅本人 assignee，较 get_all_tasks 更严格）
pub async fn get_my_tasks(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let __mobile_response = {
        let tasks: Vec<MobileTask> = match sqlx::query_as::<_, MobileTask>(
        only_own_schema_query!("mobile", "SELECT id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, completed_at, created_at, updated_at 
         FROM mobile.mobile_tasks 
         WHERE deleted_at IS NULL AND assignee = $1 
         ORDER BY due_date NULLS LAST, created_at DESC"),
    )
    .bind(&user_id)
    .fetch_all(&mut scope)

    .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("查询我的任务失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("查询失败"),
            );
        }
    };

        (
            StatusCode::OK,
            ApiResponse::success(
                serde_json::json!({ "items": tasks, "total": tasks.len() }),
                "获取我的任务成功",
            ),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

/// 待办任务（status = pending）
pub async fn get_pending_tasks(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let __mobile_response = {
        let tasks: Vec<MobileTask> = match sqlx::query_as::<_, MobileTask>(
        only_own_schema_query!("mobile", "SELECT id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, completed_at, created_at, updated_at 
         FROM mobile.mobile_tasks 
         WHERE deleted_at IS NULL AND status = 'pending' AND (assignee = $1 OR assignee IS NULL) 
         ORDER BY due_date NULLS LAST, created_at DESC"),
    )
    .bind(&user_id)
    .fetch_all(&mut scope)

    .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("查询待办任务失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("查询失败"),
            );
        }
    };

        (
            StatusCode::OK,
            ApiResponse::success(
                serde_json::json!({ "items": tasks, "total": tasks.len() }),
                "获取待办任务成功",
            ),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

/// 逾期任务（due_date 已过且未完成）
pub async fn get_overdue_tasks(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let __mobile_response = {
        let tasks: Vec<MobileTask> = match sqlx::query_as::<_, MobileTask>(
        only_own_schema_query!("mobile", "SELECT id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, completed_at, created_at, updated_at 
         FROM mobile.mobile_tasks 
         WHERE deleted_at IS NULL AND due_date < NOW() AND status != 'completed' AND (assignee = $1 OR assignee IS NULL) 
         ORDER BY due_date NULLS LAST, created_at DESC"),
    )
    .bind(&user_id)
    .fetch_all(&mut scope)

    .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("查询逾期任务失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("查询失败"),
            );
        }
    };

        (
            StatusCode::OK,
            ApiResponse::success(
                serde_json::json!({ "items": tasks, "total": tasks.len() }),
                "获取逾期任务成功",
            ),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

/// 完成任务（前端 /task/{id}/complete 无 body）
pub async fn complete_task(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let result = sqlx::query(
        only_own_schema_query!("mobile", "UPDATE mobile.mobile_tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1 AND (assignee = $2 OR assignee IS NULL) AND deleted_at IS NULL"),
    )
    .bind(id)
    .bind(&user_id)
    .execute(&mut scope)
    .await;

    let __mobile_response = {
        match result {
            Ok(r) if r.rows_affected() > 0 => {
                (StatusCode::OK, ApiResponse::success((), "任务已完成"))
            }
            Ok(_) => (
                StatusCode::NOT_FOUND,
                ApiResponse::not_found("任务不存在或无权操作"),
            ),
            Err(e) => {
                tracing::error!("完成任务失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("操作失败"),
                )
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

/// 重新打开任务
pub async fn reopen_task(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Path(id): Path<Uuid>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let result = sqlx::query(
        only_own_schema_query!("mobile", "UPDATE mobile.mobile_tasks SET status = 'pending', completed_at = NULL, updated_at = NOW() WHERE id = $1 AND (assignee = $2 OR assignee IS NULL) AND deleted_at IS NULL"),
    )
    .bind(id)
    .bind(&user_id)
    .execute(&mut scope)
    .await;

    let __mobile_response = {
        match result {
            Ok(r) if r.rows_affected() > 0 => {
                (StatusCode::OK, ApiResponse::success((), "任务已重新打开"))
            }
            Ok(_) => (
                StatusCode::NOT_FOUND,
                ApiResponse::not_found("任务不存在或无权操作"),
            ),
            Err(e) => {
                tracing::error!("重新打开任务失败: {}", e);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    ApiResponse::server_error("操作失败"),
                )
            }
        }
    };
    let _ = scope.commit().await;
    __mobile_response
}

/// 搜索任务（标题模糊匹配）
pub async fn search_tasks(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Query(params): Query<SearchTasksParams>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let keyword = params.keyword.unwrap_or_default();
    let __mobile_response = {
        let tasks: Vec<MobileTask> = match sqlx::query_as::<_, MobileTask>(
        only_own_schema_query!("mobile", "SELECT id, title, description, task_type, priority, status, assignee, location_lat, location_lng, due_date, completed_at, created_at, updated_at 
         FROM mobile.mobile_tasks 
         WHERE deleted_at IS NULL AND title ILIKE '%' || $2 || '%' AND (assignee = $1 OR assignee IS NULL) 
         ORDER BY created_at DESC"),
    )
    .bind(&user_id)
    .bind(&keyword)
    .fetch_all(&mut scope)

    .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("搜索任务失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("搜索失败"),
            );
        }
    };

        (
            StatusCode::OK,
            ApiResponse::success(
                serde_json::json!({ "items": tasks, "total": tasks.len() }),
                "搜索任务成功",
            ),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
}

/// 批量更新状态（前端 /task/batch/status）
pub async fn batch_update_status(
    headers: HeaderMap,
    Extension(_claims): Extension<Claims>,
    State(auth_state): State<AuthState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    State(db): State<Db>,
    Json(payload): Json<BatchStatusRequest>,
) -> impl IntoResponse {
    // 数据库作用域（事务级 search_path）。
    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            ApiResponse::server_error("数据库作用域创建失败"),
        );
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match db.scope_with(txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("数据库作用域创建失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("数据库作用域创建失败"),
            );
        }
    };
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    if !is_valid_task_status(&payload.status) {
        return (
            StatusCode::BAD_REQUEST,
            ApiResponse::bad_request("无效的任务状态"),
        );
    }
    let current_rows = match sqlx::query_as::<_, (Uuid, String)>(
        only_own_schema_query!(
            "mobile",
            "SELECT id, status FROM mobile.mobile_tasks WHERE id = ANY($1) AND (assignee = $2 OR assignee IS NULL) AND deleted_at IS NULL"
        ),
    )
    .bind(&payload.ids)
    .bind(&user_id)
    .fetch_all(&mut scope)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("读取批量任务状态失败: {}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                ApiResponse::server_error("读取任务状态失败"),
            );
        }
    };
    let status_by_id: HashMap<Uuid, String> = current_rows.into_iter().collect();
    for (id, current) in &status_by_id {
        if let Err(message) = ensure_task_status_change(current, &payload.status) {
            return (
                StatusCode::BAD_REQUEST,
                ApiResponse::bad_request(&format!("任务 {id}: {message}")),
            );
        }
    }

    let mut success = 0;
    let mut failed = 0;

    let __mobile_response = {
        for id in &payload.ids {
            let Some(current) = status_by_id.get(id) else {
                failed += 1;
                continue;
            };
            let result = sqlx::query(
            only_own_schema_query!("mobile", "UPDATE mobile.mobile_tasks SET status = $3::varchar(20), completed_at = CASE WHEN $3::varchar(20) = 'completed' THEN COALESCE(completed_at, NOW()) ELSE NULL END, updated_at = NOW() WHERE id = $1 AND (assignee = $2 OR assignee IS NULL) AND deleted_at IS NULL AND status = $4"),
        )
        .bind(id)
        .bind(&user_id)
        .bind(&payload.status)
        .bind(current)
        .execute(&mut scope)
        .await;

            match result {
                Ok(r) if r.rows_affected() > 0 => success += 1,
                _ => failed += 1,
            }
        }

        (
            StatusCode::OK,
            ApiResponse::success(
                serde_json::json!({ "success": success, "failed": failed }),
                "批量更新状态完成",
            ),
        )
    };
    let _ = scope.commit().await;
    __mobile_response
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

    // ---- ensure_task_status_change ----

    #[test]
    fn test_ensure_task_status_change_allows_valid_transition() {
        assert!(ensure_task_status_change("pending", "in_progress").is_ok());
        assert!(ensure_task_status_change("completed", "completed").is_ok());
    }

    #[test]
    fn test_ensure_task_status_change_rejects_invalid_value_and_transition() {
        assert!(ensure_task_status_change("pending", "bogus").is_err());
        assert!(ensure_task_status_change("pending", "completed").is_err());
        assert!(ensure_task_status_change("completed", "cancelled").is_err());
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
