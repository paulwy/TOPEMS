//! 统一待办中心 - Portal BFF 聚合能力
//!
//! 聚合多个来源的待办事项：
//! - 个人待办 → Portal 本地数据库（用户自行添加，按用户隔离）
//! - 通知待办 → core/notification（待办类型通知）
//! - 审批待办 → core/flow/tasks（工作流审批任务）
//!
//! 每个来源独立降级，确保部分服务不可用时仍能展示部分待办。

use axum::{
    extract::{Extension, Json, Path, State},
    http::HeaderMap,
    Json as AxumJson,
};
use sqlx::{PgPool, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use crate::{
    models::{NewTodo, Todo},
    shared::AppState,
    utils::user_context::extract_bearer_token,
};

async fn load_local_todos(pool: &PgPool, user_id: &str) -> Vec<Todo> {
    let result = sqlx::query(
        r#"
        SELECT id, title, service_code, service_name, due_date, priority,
               completed, todo_type, link_url
        FROM portal.portal_todos
        WHERE user_id = $1 AND deleted_at IS NULL
        ORDER BY completed ASC,
                 CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END ASC,
                 due_date ASC NULLS LAST,
                 created_at DESC
        "#,
    )
    .bind(user_id)
    .fetch_all(pool)
    .await;

    match result {
        Ok(rows) => rows.iter().map(row_to_todo).collect(),
        Err(e) => {
            tracing::warn!("Failed to load local todos: {}, using defaults", e);
            default_todos()
        }
    }
}

fn row_to_todo(row: &sqlx::postgres::PgRow) -> Todo {
    let id: uuid::Uuid = row.get("id");
    let due_date: Option<chrono::NaiveDate> = row.get("due_date");
    Todo {
        id: id.to_string(),
        title: row.get("title"),
        service: row.get("service_code"),
        service_name: row
            .get::<Option<String>, _>("service_name")
            .unwrap_or_else(|| "个人待办".to_string()),
        due_date: due_date
            .map(|d| d.format("%Y-%m-%d").to_string())
            .unwrap_or_default(),
        priority: row.get("priority"),
        completed: row.get("completed"),
        todo_type: row.get("todo_type"),
        link_url: row.get("link_url"),
    }
}

fn default_todos() -> Vec<Todo> {
    vec![
        Todo {
            id: "default-1".to_string(),
            title: "欢迎使用 TOPEMS 门户".to_string(),
            service: "portal".to_string(),
            service_name: "门户中心".to_string(),
            due_date: "".to_string(),
            priority: "high".to_string(),
            completed: false,
            todo_type: "personal".to_string(),
            link_url: None,
        },
        Todo {
            id: "default-2".to_string(),
            title: "完善个人资料".to_string(),
            service: "portal".to_string(),
            service_name: "门户中心".to_string(),
            due_date: "".to_string(),
            priority: "medium".to_string(),
            completed: false,
            todo_type: "personal".to_string(),
            link_url: Some("/portal/settings".to_string()),
        },
    ]
}

async fn add_local_todo(pool: &PgPool, user_id: &str, todo: NewTodo) -> Option<Todo> {
    let service_name = get_service_name(&todo.service);
    let due_date = if todo.due_date.is_empty() {
        None
    } else {
        chrono::NaiveDate::parse_from_str(&todo.due_date, "%Y-%m-%d").ok()
    };

    let result = sqlx::query(
        r#"
        INSERT INTO portal.portal_todos
            (user_id, title, service_code, service_name, due_date, priority, todo_type)
        VALUES ($1, $2, $3, $4, $5, $6, 'personal')
        RETURNING id, title, service_code, service_name, due_date, priority, completed, todo_type, link_url
        "#
    )
    .bind(user_id)
    .bind(&todo.title)
    .bind(&todo.service)
    .bind(service_name)
    .bind(due_date)
    .bind(&todo.priority)
    .fetch_one(pool)
    .await;

    match result {
        Ok(row) => Some(row_to_todo(&row)),
        Err(e) => {
            tracing::error!("Failed to add todo: {}", e);
            None
        }
    }
}

async fn complete_local_todo(pool: &PgPool, user_id: &str, id: &str) -> bool {
    let uuid = match uuid::Uuid::parse_str(id) {
        Ok(u) => u,
        Err(_) => return false,
    };

    let result = sqlx::query(
        r#"
        UPDATE portal.portal_todos
        SET completed = TRUE, completed_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(uuid)
    .bind(user_id)
    .execute(pool)
    .await;

    match result {
        Ok(r) => r.rows_affected() > 0,
        Err(e) => {
            tracing::error!("Failed to complete todo: {}", e);
            false
        }
    }
}

async fn delete_local_todo(pool: &PgPool, user_id: &str, id: &str) -> bool {
    let uuid = match uuid::Uuid::parse_str(id) {
        Ok(u) => u,
        Err(_) => return false,
    };

    let result = sqlx::query(
        r#"
        UPDATE portal.portal_todos
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(uuid)
    .bind(user_id)
    .execute(pool)
    .await;

    match result {
        Ok(r) => r.rows_affected() > 0,
        Err(e) => {
            tracing::error!("Failed to delete todo: {}", e);
            false
        }
    }
}

fn get_service_name(service_id: &str) -> String {
    match service_id {
        "portal" => "门户中心".to_string(),
        "rs" => "科研研发".to_string(),
        "lims" => "实验室".to_string(),
        "bi" => "数据大屏".to_string(),
        "hrm" => "人力资源".to_string(),
        "erp" => "企业资源".to_string(),
        "mes" => "生产执行".to_string(),
        "wms" => "仓储管理".to_string(),
        "scm" => "供应链".to_string(),
        "qms" => "质量管理".to_string(),
        _ => "个人待办".to_string(),
    }
}

#[utoipa::path(
    get,
    path = "/todos",
    tag = "Todo",
    responses(
        (status = 200, description = "List of todos", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn get_todos(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> AxumJson<ApiResponse<Vec<Todo>>> {
    let user_id = &claims.sub;
    let token = extract_bearer_token(&headers);

    let (local_todos, notification_todos, workflow_todos) = tokio::join!(
        load_local_todos(&state.pool, user_id),
        fetch_notification_todos(&state, token.as_deref()),
        fetch_workflow_todos(&state, token.as_deref()),
    );

    let mut all_todos = local_todos;
    all_todos.extend(notification_todos);
    all_todos.extend(workflow_todos);

    all_todos.sort_by(|a, b| {
        a.completed
            .cmp(&b.completed)
            .then_with(|| priority_order(&b.priority).cmp(&priority_order(&a.priority)))
            .then_with(|| a.due_date.cmp(&b.due_date))
    });

    AxumJson(ApiResponse::success(all_todos, "待办事项获取成功"))
}

fn priority_order(priority: &str) -> u8 {
    match priority {
        "high" => 3,
        "medium" => 2,
        "low" => 1,
        _ => 0,
    }
}

async fn fetch_notification_todos(state: &AppState, token: Option<&str>) -> Vec<Todo> {
    let mut client = state.notification_client.clone();
    if let Some(t) = token {
        client.set_auth_token(t.to_string());
    }
    match client.get_unread().await {
        Ok(notifications) => notifications
            .iter()
            .filter(|n| {
                let nt = n
                    .get("notification_type")
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                nt.contains("todo") || nt.contains("task") || nt.contains("approval")
            })
            .filter_map(|n| {
                let notification_type = n.get("notification_type")?.as_str()?.to_string();
                let created_at_str = n.get("created_at")?.as_str()?;
                let created_at = chrono::DateTime::parse_from_rfc3339(created_at_str)
                    .ok()?
                    .with_timezone(&chrono::Utc);
                Some(Todo {
                    id: format!("notif-{}", n.get("id")?.as_str()?),
                    title: n.get("title")?.as_str()?.to_string(),
                    service: notification_type.clone(),
                    service_name: format_service_name(&notification_type),
                    due_date: created_at.format("%Y-%m-%d").to_string(),
                    priority: "medium".to_string(),
                    completed: n.get("is_read")?.as_bool()?,
                    todo_type: "notification".to_string(),
                    link_url: n
                        .get("link_url")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string()),
                })
            })
            .collect(),
        Err(e) => {
            tracing::warn!("Failed to fetch notification todos: {}", e);
            vec![]
        }
    }
}

async fn fetch_workflow_todos(state: &AppState, token: Option<&str>) -> Vec<Todo> {
    let mut client = state.workflow_client.clone();
    if let Some(t) = token {
        client.set_auth_token(t.to_string());
    }
    match client.get_my_pending_tasks(1, 20).await {
        Ok(resp) => resp
            .items
            .iter()
            .map(|task| {
                let priority = task.priority.as_deref().unwrap_or("medium").to_lowercase();
                let priority = match priority.as_str() {
                    "high" | "urgent" | "critical" => "high",
                    "low" | "minor" => "low",
                    _ => "medium",
                }
                .to_string();

                let due_date = task
                    .due_time
                    .map(|d| d.format("%Y-%m-%d").to_string())
                    .unwrap_or_default();

                let title = task
                    .instance_title
                    .clone()
                    .unwrap_or_else(|| format!("审批任务 - {}", task.node_id));

                Todo {
                    id: format!("wf-{}", task.id),
                    title,
                    service: "workflow".to_string(),
                    service_name: "审批中心".to_string(),
                    due_date,
                    priority,
                    completed: false,
                    todo_type: "approval".to_string(),
                    link_url: Some(format!("/workflow/tasks/{}", task.id)),
                }
            })
            .collect(),
        Err(e) => {
            tracing::warn!("Failed to fetch workflow todos: {}", e);
            vec![]
        }
    }
}

fn format_service_name(service_type: &str) -> String {
    match service_type {
        "approval" | "workflow" => "审批中心".to_string(),
        "task" | "todo" => "任务中心".to_string(),
        "system" => "系统通知".to_string(),
        other => other.to_string(),
    }
}

#[utoipa::path(
    post,
    path = "/todos",
    tag = "Todo",
    request_body = NewTodo,
    responses(
        (status = 200, description = "Todo added", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    )
)]
pub async fn add_todo(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(todo): Json<NewTodo>,
) -> AxumJson<ApiResponse<Todo>> {
    let user_id = &claims.sub;
    match add_local_todo(&state.pool, user_id, todo).await {
        Some(new_todo) => AxumJson(ApiResponse::success(new_todo, "待办事项添加成功")),
        None => AxumJson(ApiResponse::error(500, "待办事项添加失败")),
    }
}

pub async fn complete_todo(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> AxumJson<ApiResponse<serde_json::Value>> {
    let user_id = &claims.sub;
    let success = complete_local_todo(&state.pool, user_id, &id).await;
    if success {
        AxumJson(ApiResponse::success(
            serde_json::json!({ "id": id, "completed": true }),
            "待办事项完成成功",
        ))
    } else {
        AxumJson(ApiResponse::error(404, "待办事项不存在"))
    }
}

pub async fn delete_todo(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> AxumJson<ApiResponse<serde_json::Value>> {
    let user_id = &claims.sub;
    let success = delete_local_todo(&state.pool, user_id, &id).await;
    if success {
        AxumJson(ApiResponse::success(
            serde_json::json!({ "id": id, "deleted": true }),
            "待办事项删除成功",
        ))
    } else {
        AxumJson(ApiResponse::error(404, "待办事项不存在"))
    }
}
