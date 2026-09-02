//! Corrective Action handlers

use crate::models::corrective_action::*;
use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use sqlx::types::Uuid;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

pub async fn list_actions(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<ActionQuery>,
) -> Json<ApiResponse<ListActionsResponse>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let issue_id = query
        .issue_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE tenant_id = $1");
    params.push(serde_json::Value::String(tenant_id.to_string()));

    if let Some(status) = &query.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(serde_json::Value::String(status.clone()));
    }

    if let Some(priority) = &query.priority {
        where_clause.push_str(&format!(" AND priority = ${}", params.len() + 1));
        params.push(serde_json::Value::String(priority.clone()));
    }

    if let Some(issue) = issue_id {
        let issue_str = issue.to_string();
        where_clause.push_str(&format!(" AND issue_id = ${}::uuid", params.len() + 1));
        params.push(serde_json::Value::String(issue_str));
    }

    if let Some(search) = &query.search {
        let pattern = format!("%{}%", search);
        where_clause.push_str(&format!(
            " AND (title ILIKE ${} OR description ILIKE ${})",
            params.len() + 1,
            params.len() + 1
        ));
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM qms.qa_corrective_actions{}",
        where_clause
    );

    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }

    let total: Option<i64> = match count_query.fetch_one(&state.pool).await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count actions: {}", e);
            return Json(ApiResponse::error(500, "获取整改措施列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT id, tenant_id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT
        FROM qms.qa_corrective_actions
        {}
        ORDER BY created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut fetch_query = sqlx::query_as::<_, CorrectiveAction>(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
    }
    fetch_query = fetch_query.bind(page_size).bind(offset);

    match fetch_query.fetch_all(&state.pool).await {
        Ok(data) => Json(ApiResponse::success(
            ListActionsResponse {
                actions: data,
                total: total.unwrap_or(0),
                page,
                page_size,
            },
            "获取整改措施列表成功",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch actions: {}", e);
            Json(ApiResponse::error(500, "获取整改措施列表失败"))
        }
    }
}

pub async fn create_action(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateActionRequest>,
) -> Json<ApiResponse<CorrectiveAction>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let action_no = format!(
        "CA-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let issue_id = req.issue_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());
    let priority = req.priority.unwrap_or_else(|| "medium".to_string());

    let action = sqlx::query_as::<_, CorrectiveAction>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_corrective_actions (tenant_id, action_no, issue_id, title, description, root_cause, action_type, status, priority, assignee, target_date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10, $11) RETURNING id, tenant_id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#)).bind(tenant_id).bind(action_no).bind(issue_id).bind(req.title).bind(req.description).bind(req.root_cause).bind(req.action_type).bind(priority).bind(req.assignee).bind(req.target_date).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match action {
        Ok(data) => {
            if let Some(items) = req.items {
                if let Ok(action_id) = Uuid::parse_str(&data.id) {
                    for item in items {
                        let _ = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_corrective_action_items (tenant_id, action_id, item_name, responsible, due_date, remark) VALUES ($1, $2, $3, $4, $5, $6)"#)).bind(tenant_id).bind(action_id).bind(item.item_name).bind(item.responsible).bind(item.due_date).bind(item.remark)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<CorrectiveAction>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的措施ID")),
    };

    let action = sqlx::query_as::<_, CorrectiveAction>(only_own_schema_query!("qms", r#"SELECT id, tenant_id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_corrective_actions WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"#)).bind(id).bind(tenant_id)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<ActionItem>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的措施ID")),
    };

    let items = sqlx::query_as::<_, ActionItem>(only_own_schema_query!("qms", r#"SELECT id, tenant_id, action_id::TEXT, item_name, responsible, due_date::TEXT, status, completed_at::TEXT, remark, created_at::TEXT FROM qms.qa_corrective_action_items WHERE action_id = $1 AND tenant_id = $2 ORDER BY created_at"#)).bind(id).bind(tenant_id)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateActionRequest>,
) -> Json<ApiResponse<CorrectiveAction>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的措施ID")),
    };

    let action = sqlx::query_as::<_, CorrectiveAction>(only_own_schema_query!("qms", r#"UPDATE qms.qa_corrective_actions SET title = COALESCE($2, title), description = COALESCE($3, description), root_cause = COALESCE($4, root_cause), action_type = COALESCE($5, action_type), status = COALESCE($6, status), priority = COALESCE($7, priority), assignee = COALESCE($8, assignee), target_date = COALESCE($9, target_date), updated_at = NOW() WHERE id = $1 AND tenant_id = $10 RETURNING id, tenant_id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#)).bind(id).bind(req.title).bind(req.description).bind(req.root_cause).bind(req.action_type).bind(req.status).bind(req.priority).bind(req.assignee).bind(req.target_date).bind(tenant_id)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<CorrectiveAction>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的措施ID")),
    };

    let action = sqlx::query_as::<_, CorrectiveAction>(only_own_schema_query!("qms", r#"UPDATE qms.qa_corrective_actions SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date::TEXT, completed_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#)).bind(id).bind(tenant_id)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的措施ID")),
    };

    let result = sqlx::query(
        only_own_schema_query!("qms", r#"UPDATE qms.qa_corrective_actions SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"#),
    )
    .bind(id)
    .bind(tenant_id)
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

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/actions", get(list_actions))
        .route("/actions", post(create_action))
        .route("/actions/{id}", get(get_action))
        .route("/actions/{id}", put(update_action))
        .route("/actions/{id}", delete(delete_action))
        .route("/actions/{id}/complete", post(complete_action))
        .route("/actions/{id}/items", get(get_action_items))
}
