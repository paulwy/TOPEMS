//! Corrective Action handlers

use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, types::Uuid};
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ActionQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub issue_id: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct CorrectiveAction {
    pub id: String,
    pub action_no: String,
    pub issue_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub root_cause: Option<String>,
    pub action_type: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub target_date: Option<String>,
    pub completed_at: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ActionItem {
    pub id: String,
    pub action_id: String,
    pub item_name: String,
    pub responsible: Option<String>,
    pub due_date: Option<String>,
    pub status: Option<String>,
    pub completed_at: Option<String>,
    pub remark: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateActionRequest {
    pub issue_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub root_cause: Option<String>,
    pub action_type: Option<String>,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub target_date: Option<String>,
    pub created_by: Option<String>,
    pub items: Option<Vec<CreateActionItemRequest>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateActionItemRequest {
    pub item_name: String,
    pub responsible: Option<String>,
    pub due_date: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateActionRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub root_cause: Option<String>,
    pub action_type: Option<String>,
    pub status: Option<String>,
    pub priority: Option<String>,
    pub assignee: Option<String>,
    pub target_date: Option<String>,
}

pub async fn list_actions(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<ActionQuery>,
) -> Json<ApiResponse<Vec<CorrectiveAction>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let issue_id = query.issue_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    let actions = match (query.status.as_ref(), query.priority.as_ref(), issue_id) {
        (Some(st), Some(pr), Some(issue)) => sqlx::query_as::<_, CorrectiveAction>(r#"SELECT id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_corrective_actions WHERE status = $1 AND priority = $2 AND issue_id = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"#).bind(st).bind(pr).bind(issue).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(st), Some(pr), None) => sqlx::query_as::<_, CorrectiveAction>(r#"SELECT id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_corrective_actions WHERE status = $1 AND priority = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#).bind(st).bind(pr).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(st), None, Some(issue)) => sqlx::query_as::<_, CorrectiveAction>(r#"SELECT id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_corrective_actions WHERE status = $1 AND issue_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#).bind(st).bind(issue).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(pr), Some(issue)) => sqlx::query_as::<_, CorrectiveAction>(r#"SELECT id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_corrective_actions WHERE priority = $1 AND issue_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#).bind(pr).bind(issue).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(st), None, None) => sqlx::query_as::<_, CorrectiveAction>(r#"SELECT id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_corrective_actions WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(pr), None) => sqlx::query_as::<_, CorrectiveAction>(r#"SELECT id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_corrective_actions WHERE priority = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(pr).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None, Some(issue)) => sqlx::query_as::<_, CorrectiveAction>(r#"SELECT id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_corrective_actions WHERE issue_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(issue).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None, None) => sqlx::query_as::<_, CorrectiveAction>(r#"SELECT id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_corrective_actions ORDER BY created_at DESC LIMIT $1 OFFSET $2"#).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
    };

    match actions {
        Ok(data) => Json(ApiResponse::success(data, "获取整改措施列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch actions: {}", e);
            Json(ApiResponse::error(500, "获取整改措施列表失败"))
        }
    }
}

pub async fn create_action(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateActionRequest>,
) -> Json<ApiResponse<CorrectiveAction>> {
    let action_no = format!("CA-{}", uuid::Uuid::new_v4().to_string()[..8].to_uppercase());
    let issue_id = req.issue_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());
    let priority = req.priority.unwrap_or_else(|| "medium".to_string());

    let action = sqlx::query_as::<_, CorrectiveAction>(r#"INSERT INTO qa_corrective_actions (action_no, issue_id, title, description, root_cause, action_type, status, priority, assignee, target_date, created_by) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10) RETURNING id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(action_no).bind(issue_id).bind(req.title).bind(req.description).bind(req.root_cause).bind(req.action_type).bind(priority).bind(req.assignee).bind(req.target_date).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match action {
        Ok(data) => {
            if let Some(items) = req.items {
                if let Ok(action_id) = Uuid::parse_str(&data.id) {
                    for item in items {
                        let _ = sqlx::query(r#"INSERT INTO qa_corrective_action_items (action_id, item_name, responsible, due_date, remark) VALUES ($1, $2, $3, $4, $5)"#).bind(action_id).bind(item.item_name).bind(item.responsible).bind(item.due_date).bind(item.remark)
                        .execute(&state.pool)
                        .await;
                    }
                }
            }
            Json(ApiResponse::success(data, "整改措施创建成功"))
        }
        Err(e) => {
            tracing::error!("Failed to create action: {}", e);
            Json(ApiResponse::error(500, "整改措施创建失败"))
        }
    }
}

pub async fn get_action(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<CorrectiveAction>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的措施ID")),
    };

    let action = sqlx::query_as::<_, CorrectiveAction>(r#"SELECT id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_corrective_actions WHERE id = $1"#).bind(id)
    .fetch_one(&state.pool)
    .await;

    match action {
        Ok(data) => Json(ApiResponse::success(data, "获取整改措施成功")),
        Err(e) => {
            tracing::error!("Failed to fetch action: {}", e);
            Json(ApiResponse::error(500, "获取整改措施失败"))
        }
    }
}

pub async fn get_action_items(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<ActionItem>>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的措施ID")),
    };

    let items = sqlx::query_as::<_, ActionItem>(r#"SELECT id, action_id::TEXT, item_name, responsible, due_date::TEXT, status, completed_at::TEXT, remark, created_at::TEXT FROM qa_corrective_action_items WHERE action_id = $1 ORDER BY created_at"#).bind(id)
    .fetch_all(&state.pool)
    .await;

    match items {
        Ok(data) => Json(ApiResponse::success(data, "获取措施明细成功")),
        Err(e) => {
            tracing::error!("Failed to fetch action items: {}", e);
            Json(ApiResponse::error(500, "获取措施明细失败"))
        }
    }
}

pub async fn update_action(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateActionRequest>,
) -> Json<ApiResponse<CorrectiveAction>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的措施ID")),
    };

    let action = sqlx::query_as::<_, CorrectiveAction>(r#"UPDATE qa_corrective_actions SET title = COALESCE($2, title), description = COALESCE($3, description), root_cause = COALESCE($4, root_cause), action_type = COALESCE($5, action_type), status = COALESCE($6, status), priority = COALESCE($7, priority), assignee = COALESCE($8, assignee), target_date = COALESCE($9, target_date), updated_at = NOW() WHERE id = $1 RETURNING id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.title).bind(req.description).bind(req.root_cause).bind(req.action_type).bind(req.status).bind(req.priority).bind(req.assignee).bind(req.target_date)
    .fetch_one(&state.pool)
    .await;

    match action {
        Ok(data) => Json(ApiResponse::success(data, "整改措施更新成功")),
        Err(e) => {
            tracing::error!("Failed to update action: {}", e);
            Json(ApiResponse::error(500, "整改措施更新失败"))
        }
    }
}

pub async fn complete_action(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<CorrectiveAction>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的措施ID")),
    };

    let action = sqlx::query_as::<_, CorrectiveAction>(r#"UPDATE qa_corrective_actions SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id)
    .fetch_one(&state.pool)
    .await;

    match action {
        Ok(data) => Json(ApiResponse::success(data, "整改措施已完成")),
        Err(e) => {
            tracing::error!("Failed to complete action: {}", e);
            Json(ApiResponse::error(500, "整改措施完成失败"))
        }
    }
}

pub async fn delete_action(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的措施ID")),
    };

    let result = sqlx::query(r#"DELETE FROM qa_corrective_actions WHERE id = $1"#).bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "整改措施删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete action: {}", e);
            Json(ApiResponse::error(500, "整改措施删除失败"))
        }
    }
}
