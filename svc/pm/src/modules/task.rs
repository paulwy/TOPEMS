//! PM 任务管理：任务 CRUD + 状态机（pm.list_tasks 真实化）
//!
//! 纯逻辑（可单测）：
//! - `task_status_transition_valid`：任务状态机（todo/in_progress/review/done/blocked）
//! - `task_progress_for_status`：状态派生进度（done→100 / todo→0）

use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_core::locale::Locale;
use topems_shared_core::{response::ApiResponse, TopemsError};
use topems_shared_db::scope::Db;
use tracing;
use uuid::Uuid;

use crate::models::task::{
    CreateTaskRequest, Task, TaskListResponse, TaskQuery, UpdateTaskRequest,
};
use crate::modules::effective_tenant_id;
use crate::modules::task_status::TaskStatus;

// ==================== Pure functions ====================

/// 任务状态机合法性校验。
///
/// 合法流转：
/// - todo -> in_progress / review / blocked
/// - in_progress -> review / done / blocked
/// - review -> done / in_progress
/// - done -> in_progress（重开）
/// - blocked -> in_progress
pub fn task_status_transition_valid(from: &str, to: &str) -> bool {
    match (TaskStatus::from_db_str(from), TaskStatus::from_db_str(to)) {
        (Some(from), Some(to)) => from.can_transition_to(to),
        _ => false,
    }
}

/// 状态派生进度：done 恒为 100，todo 恒为 0，其余状态取给定进度并 clamp 到 0..=100。
pub fn task_progress_for_status(status: &str, progress: i32) -> i32 {
    TaskStatus::from_db_str(status).map_or_else(
        || progress.clamp(0, 100),
        |status| status.progress(progress),
    )
}

// ==================== Handlers ====================

use topems_shared_auth::middleware::tenant::RlsTxnCell;

/// 构造 `pm.pm_tasks` 的 SELECT / RETURNING 列清单。
///
/// 多语言：`title` 按 `locale_placeholder`（SQL 占位符，如 `"$7"`）切换英文备用列
/// `title_en`，未提供英文时 `COALESCE` 回退中文 `title`。其余列保持原始列名，
/// `Task` 的 `FromRow` 结构体不新增字段。
fn task_return_columns(locale_placeholder: &str) -> String {
    format!(
        "id, tenant_id, project_id, task_number,
         CASE WHEN {p} = 'en' THEN COALESCE(title_en, title) ELSE title END AS title,
         description, status, priority, assignee, start_date, end_date, progress,
         created_by, created_at, updated_at",
        p = locale_placeholder
    )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/tasks",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "task"
)]
pub async fn list_tasks(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_ctx): Extension<TenantContext>,
    Query(query): Query<TaskQuery>,
    headers: HeaderMap,
) -> ApiResponse<TaskListResponse> {
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

    let status_filter = match TaskStatus::parse_filter(query.status.as_deref()) {
        Ok(status) => status.map(TaskStatus::as_db_str),
        Err(message) => return ApiResponse::bad_request(&message),
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);

    // 多语言：locale 追加为 $7，title 的 CASE 表达式引用它（既有 $1..$6 占位符不动）
    let locale = Locale::from_headers(&headers).as_sql();
    let return_cols = task_return_columns("$7");
    let result: Result<Vec<Task>, sqlx::Error> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        "SELECT {return_cols} FROM pm.pm_tasks
         WHERE deleted_at IS NULL
           
           AND ($1::uuid IS NULL OR project_id = $1)
           AND ($2::text IS NULL OR status = $2)
           AND ($3::text IS NULL OR priority = $3)
           AND ($4::text IS NULL OR assignee = $4)
         ORDER BY created_at DESC LIMIT $5 OFFSET $6"
    )))
    .bind(query.project_id)
    .bind(status_filter)
    .bind(&query.priority)
    .bind(&query.assignee)
    .bind(page_size)
    .bind((page - 1) * page_size)
    .bind(locale)
    .fetch_all(&mut scope)
    .await;

    let total: Result<i64, sqlx::Error> = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pm.pm_tasks
         WHERE deleted_at IS NULL
           AND ($1::uuid IS NULL OR project_id = $1)
           AND ($2::text IS NULL OR status = $2)
           AND ($3::text IS NULL OR priority = $3)
           AND ($4::text IS NULL OR assignee = $4)",
    )
    .bind(query.project_id)
    .bind(status_filter)
    .bind(&query.priority)
    .bind(&query.assignee)
    .fetch_one(&mut scope)
    .await;

    match (result, total) {
        (Ok(items), Ok(total)) => ApiResponse::success(
            TaskListResponse {
                items,
                total,
                page,
                page_size,
            },
            "任务列表获取成功",
        ),
        (Err(e), _) | (_, Err(e)) => {
            ApiResponse::from(TopemsError::internal("获取任务列表失败", e))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/projects/{project_id}/tasks",
    params(
("project_id" = String, Path, description = "project_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "task"
)]
pub async fn list_tasks_by_project(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_ctx): Extension<TenantContext>,
    Path(project_id): Path<Uuid>,
    Query(query): Query<TaskQuery>,
    headers: HeaderMap,
) -> ApiResponse<TaskListResponse> {
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
    let status_filter = match TaskStatus::parse_filter(query.status.as_deref()) {
        Ok(status) => status.map(TaskStatus::as_db_str),
        Err(message) => return ApiResponse::bad_request(&message),
    };
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);

    // 多语言：locale 追加为 $5，title 的 CASE 表达式引用它（既有 $1..$4 占位符不动）
    let locale = Locale::from_headers(&headers).as_sql();
    let return_cols = task_return_columns("$5");
    let result: Result<Vec<Task>, sqlx::Error> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        "SELECT {return_cols} FROM pm.pm_tasks
         WHERE project_id = $1 AND deleted_at IS NULL
           
           AND ($2::text IS NULL OR status = $2)
         ORDER BY created_at DESC LIMIT $3 OFFSET $4"
    )))
    .bind(project_id)
    .bind(status_filter)
    .bind(page_size)
    .bind((page - 1) * page_size)
    .bind(locale)
    .fetch_all(&mut scope)
    .await;

    let total: Result<i64, sqlx::Error> = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pm.pm_tasks
         WHERE project_id = $1 AND deleted_at IS NULL
           AND ($2::text IS NULL OR status = $2)",
    )
    .bind(project_id)
    .bind(status_filter)
    .fetch_one(&mut scope)
    .await;

    match (result, total) {
        (Ok(items), Ok(total)) => ApiResponse::success(
            TaskListResponse {
                items,
                total,
                page,
                page_size,
            },
            "项目任务列表获取成功",
        ),
        (Err(e), _) | (_, Err(e)) => {
            ApiResponse::from(TopemsError::internal("获取项目任务列表失败", e))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/pm/tasks",
    tag = "task",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn create_task(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    headers: HeaderMap,
    Extension(ctx): Extension<TenantContext>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateTaskRequest>,
) -> ApiResponse<Task> {
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
    let tenant_id = effective_tenant_id(&ctx, &claims);
    let now = Utc::now();
    let status = match req.status.as_deref() {
        None => TaskStatus::DEFAULT,
        Some(raw) => match TaskStatus::normalize(raw) {
            Ok(status) => status,
            Err(message) => return ApiResponse::bad_request(&message),
        },
    };
    let priority = req.priority.unwrap_or_else(|| "medium".to_string());
    let progress = status.progress(req.progress.unwrap_or(0));
    let task_number = req.task_number.or_else(|| {
        Some(format!(
            "TK{}{:06}",
            now.format("%Y%m"),
            id.simple().to_string().get(0..6).unwrap_or("000000")
        ))
    });

    // 多语言：title_en 追加为 $15，locale 追加为 $16，RETURNING 的 title CASE 引用 $16
    let locale = Locale::from_headers(&headers).as_sql();
    let return_cols = task_return_columns("$16");
    let result: Result<Task, sqlx::Error> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        r#"INSERT INTO pm.pm_tasks
        (id, tenant_id, project_id, task_number, title, description, status, priority, assignee,
         start_date, end_date, progress, created_by, created_at, updated_at, title_en)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$15)
        RETURNING {return_cols}"#
    )))
    .bind(id)
    .bind(tenant_id)
    .bind(req.project_id)
    .bind(&task_number)
    .bind(&req.title)
    .bind(&req.description)
    .bind(status.as_db_str())
    .bind(&priority)
    .bind(&req.assignee)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(progress)
    .bind(&req.created_by)
    .bind(now)
    .bind(&req.title_en)
    .bind(locale)
    .fetch_one(&mut scope)
    .await;

    match result {
        Ok(task) => ApiResponse::success(task, "任务创建成功"),
        Err(e) => ApiResponse::from(TopemsError::internal("创建任务失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/tasks/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "task"
)]
pub async fn get_task(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_ctx): Extension<TenantContext>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> ApiResponse<Task> {
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
    // 多语言：locale 追加为 $2，title 的 CASE 表达式引用它
    let locale = Locale::from_headers(&headers).as_sql();
    let return_cols = task_return_columns("$2");
    let result: Result<Option<Task>, sqlx::Error> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        "SELECT {return_cols} FROM pm.pm_tasks WHERE id = $1 AND deleted_at IS NULL "
    )))
    .bind(id)
    .bind(locale)
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(task)) => ApiResponse::success(task, "任务获取成功"),
        Ok(None) => ApiResponse::not_found("任务不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("获取任务失败", e)),
    }
}

#[utoipa::path(
    put,
    path = "/api/pm/tasks/{id}",
    tag = "task",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn update_task(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_ctx): Extension<TenantContext>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateTaskRequest>,
) -> ApiResponse<Task> {
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
    let now = Utc::now();
    // 状态只能走状态机：未知值 / 非法流转一律 400，查询失败不再静默跳过校验。
    let target_status = match req.status.as_deref() {
        None => None,
        Some(raw) => match TaskStatus::normalize(raw) {
            Ok(status) => Some(status),
            Err(message) => return ApiResponse::bad_request(&message),
        },
    };
    if let Some(target) = target_status {
        let current_raw: Result<Option<String>, sqlx::Error> = sqlx::query_scalar(
            "SELECT status FROM pm.pm_tasks WHERE id = $1 AND deleted_at IS NULL",
        )
        .bind(id)
        .fetch_optional(&mut scope)
        .await;
        let current = match current_raw {
            Ok(Some(raw)) => match TaskStatus::from_db_str(&raw) {
                Some(status) => status,
                None => return ApiResponse::bad_request(&format!("任务当前状态非法: {raw}")),
            },
            Ok(None) => return ApiResponse::not_found("任务不存在"),
            Err(e) => return ApiResponse::from(TopemsError::internal("查询任务状态失败", e)),
        };
        if target != current && !current.can_transition_to(target) {
            return ApiResponse::bad_request(&format!(
                "非法任务状态流转: {} -> {}",
                current, target
            ));
        }
    }

    // 多语言：title_en 追加为 $11，locale 追加为 $12，RETURNING 的 title CASE 引用 $12
    // （既有 $1..$10 占位符与 progress 对 $4/$9 的引用均不动）
    let locale = Locale::from_headers(&headers).as_sql();
    let return_cols = task_return_columns("$12");
    let result: Result<Option<Task>, sqlx::Error> = sqlx::query_as(sqlx::AssertSqlSafe(format!(
        r#"UPDATE pm.pm_tasks SET
           title = COALESCE($2, title),
           description = COALESCE($3, description),
           status = COALESCE($4, status),
           priority = COALESCE($5, priority),
           assignee = COALESCE($6, assignee),
           start_date = COALESCE($7, start_date),
           end_date = COALESCE($8, end_date),
           progress = CASE WHEN $4 IS NOT NULL
                           THEN CASE $4 WHEN $13 THEN 100 WHEN $14 THEN 0
                                        ELSE COALESCE($9, progress) END
                           ELSE COALESCE($9, progress) END,
           updated_at = $10,
           title_en = COALESCE($11, title_en)
           WHERE id = $1 AND deleted_at IS NULL 
           RETURNING {return_cols}"#
    )))
    .bind(id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(target_status.map(TaskStatus::as_db_str))
    .bind(&req.priority)
    .bind(&req.assignee)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.progress)
    .bind(now)
    .bind(&req.title_en)
    .bind(locale)
    .bind(TaskStatus::Done.as_db_str())
    .bind(TaskStatus::Todo.as_db_str())
    .fetch_optional(&mut scope)
    .await;

    match result {
        Ok(Some(task)) => ApiResponse::success(task, "任务更新成功"),
        Ok(None) => ApiResponse::not_found("任务不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("更新任务失败", e)),
    }
}

#[utoipa::path(
    delete,
    path = "/api/pm/tasks/{id}",
    tag = "task",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn delete_task(
    State(db): State<Db>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(_ctx): Extension<TenantContext>,
    Path(id): Path<Uuid>,
) -> ApiResponse<serde_json::Value> {
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
    let result = sqlx::query(
        "UPDATE pm.pm_tasks SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(id)
    .execute(&mut scope)
    .await;
    match result {
        Ok(res) if res.rows_affected() > 0 => {
            ApiResponse::success(serde_json::json!({"deleted": true}), "任务已删除")
        }
        Ok(_) => ApiResponse::not_found("任务不存在"),
        Err(e) => ApiResponse::from(TopemsError::internal("删除任务失败", e)),
    }
}

pub fn create_routes(db: Db) -> Router {
    Router::new()
        .route("/tasks", get(list_tasks).post(create_task))
        .route(
            "/tasks/{id}",
            get(get_task).put(update_task).delete(delete_task),
        )
        .route("/projects/{project_id}/tasks", get(list_tasks_by_project))
        .with_state(db)
}

// ==================== Tests ====================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn status_transition_valid_paths() {
        assert!(task_status_transition_valid("todo", "in_progress"));
        assert!(task_status_transition_valid("todo", "review"));
        assert!(task_status_transition_valid("todo", "blocked"));
        assert!(task_status_transition_valid("in_progress", "review"));
        assert!(task_status_transition_valid("in_progress", "done"));
        assert!(task_status_transition_valid("in_progress", "blocked"));
        assert!(task_status_transition_valid("review", "done"));
        assert!(task_status_transition_valid("done", "in_progress"));
        assert!(task_status_transition_valid("blocked", "in_progress"));
    }

    #[test]
    fn status_transition_invalid_paths() {
        assert!(!task_status_transition_valid("todo", "done"));
        assert!(!task_status_transition_valid("done", "review"));
        assert!(!task_status_transition_valid("blocked", "done"));
        assert!(!task_status_transition_valid("review", "blocked"));
        assert!(!task_status_transition_valid("in_progress", "todo"));
        assert!(!task_status_transition_valid("done", "blocked"));
    }

    #[test]
    fn progress_derived_from_status() {
        assert_eq!(task_progress_for_status("done", 30), 100);
        assert_eq!(task_progress_for_status("todo", 50), 0);
        assert_eq!(task_progress_for_status("in_progress", 40), 40);
    }

    #[test]
    fn progress_clamped() {
        assert_eq!(task_progress_for_status("in_progress", -5), 0);
        assert_eq!(task_progress_for_status("in_progress", 150), 100);
        assert_eq!(task_progress_for_status("review", 70), 70);
    }
}
