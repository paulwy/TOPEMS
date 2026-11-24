//! Corrective Action handlers

use crate::models::corrective_action::*;
use crate::shared::fsm::{action_can_transition, is_valid_action_status};
use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use sqlx::types::Uuid;
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::{get_tenant_id, require_tenant};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:action:read"])),
    path = "/actions",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_action"
)]
pub async fn list_actions(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<ActionQuery>,
) -> ApiResponse<ListActionsResponse> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取整改措施列表失败");
        }
    };
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let issue_id = query
        .issue_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let mut params: Vec<String> = Vec::new();
    let mut where_clause = String::from(" WHERE 1=1");
    let mut __has_tenant = false;
    if !claims.is_superuser {
        where_clause = String::from(" WHERE tenant_id = $1::uuid");
        __has_tenant = true;
    }
    if __has_tenant {
        params.push(tenant_id.to_string());
    }

    if let Some(status) = &query.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(status.clone());
    }

    if let Some(priority) = &query.priority {
        where_clause.push_str(&format!(" AND priority = ${}", params.len() + 1));
        params.push(priority.clone());
    }

    if let Some(issue) = issue_id {
        let issue_str = issue.to_string();
        where_clause.push_str(&format!(" AND issue_id = ${}::uuid", params.len() + 1));
        params.push(issue_str);
    }

    if let Some(search) = &query.search {
        let pattern = format!("%{}%", search);
        where_clause.push_str(&format!(
            " AND (title ILIKE ${} OR description ILIKE ${})",
            params.len() + 1,
            params.len() + 1
        ));
        params.push(pattern);
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM qms.qa_corrective_actions{}",
        where_clause
    );

    let mut count_query = sqlx::query_scalar(sqlx::AssertSqlSafe(count_sql));
    for p in &params {
        count_query = count_query.bind(p.clone());
    }

    let total: Option<i64> = match count_query.fetch_one(&mut scope).await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count actions: {}", e);
            return ApiResponse::server_error("获取整改措施列表失败");
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT id::TEXT, tenant_id::TEXT, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date, completed_at, created_by, created_at, updated_at
        FROM qms.qa_corrective_actions
        {}
        ORDER BY created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut fetch_query = sqlx::query_as::<_, CorrectiveAction>(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
    }
    fetch_query = fetch_query.bind(page_size).bind(offset);

    match fetch_query.fetch_all(&mut scope).await {
        Ok(data) => ApiResponse::success(
            ListActionsResponse {
                actions: data,
                total: total.unwrap_or(0),
                page,
                page_size,
            },
            "获取整改措施列表成功",
        ),
        Err(e) => {
            tracing::error!("Failed to fetch actions: {}", e);
            ApiResponse::server_error("获取整改措施列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:action:write"])),
    path = "/actions",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_action"
)]
pub async fn create_action(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateActionRequest>,
) -> ApiResponse<CorrectiveAction> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let action_no = format!(
        "CA-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let issue_id = req.issue_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());
    let priority = req.priority.unwrap_or_else(|| "medium".to_string());

    // 先校验后写入：标题为空直接拒绝，不落任何数据。
    if req.title.trim().is_empty() {
        return ApiResponse::bad_request("措施标题不能为空");
    }

    // 事务化：主记录与明细项同进同出，任何一步失败整体回滚（scope drop 即回滚）。
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启创建事务失败: {}", e);
            return ApiResponse::server_error("整改措施创建失败");
        }
    };

    // 同域引用校验：关联质量问题必须存在且同租户，否则 400。
    if let Some(iid) = issue_id {
        match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "qms",
            "SELECT COUNT(*) FROM qms.qa_quality_issues WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"
        ))
        .bind(iid)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
        {
            Ok(0) => return ApiResponse::bad_request("关联质量问题不存在或不属于当前租户"),
            Ok(_) => {}
            Err(e) => {
                tracing::error!("Failed to validate issue: {}", e);
                return ApiResponse::server_error("整改措施创建失败");
            }
        }
    }

    let insert_result = sqlx::query_as::<_, CorrectiveAction>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_corrective_actions (tenant_id, action_no, issue_id, title, description, root_cause, action_type, status, priority, assignee, target_date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10, $11) RETURNING id::TEXT, tenant_id::TEXT, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date, completed_at, created_by, created_at, updated_at"#)).bind(tenant_id).bind(action_no).bind(issue_id).bind(req.title).bind(req.description).bind(req.root_cause).bind(req.action_type).bind(priority).bind(req.assignee).bind(req.target_date).bind(req.created_by)
    .fetch_one(&mut scope)
    .await;

    let action = match insert_result {
        Ok(data) => data,
        Err(e) => {
            tracing::error!("Failed to create action: {}", e);
            return ApiResponse::server_error("整改措施创建失败");
        }
    };

    if let Some(items) = req.items {
        if let Ok(action_id) = Uuid::parse_str(&action.id) {
            for item in items {
                let item_result = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_corrective_action_items (tenant_id, action_id, item_name, responsible, due_date, remark) VALUES ($1, $2, $3, $4, $5::timestamptz, $6)"#)).bind(tenant_id).bind(action_id).bind(item.item_name).bind(item.responsible).bind(item.due_date).bind(item.remark)
                .execute(&mut scope)
                .await;
                if let Err(e) = item_result {
                    tracing::error!("写入措施明细失败，整体回滚: {}", e);
                    return ApiResponse::server_error("整改措施创建失败");
                }
            }
        }
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("提交创建事务失败: {}", e);
        return ApiResponse::server_error("整改措施创建失败");
    }

    ApiResponse::success(action, "整改措施创建成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:action:read"])),
    path = "/actions/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_action"
)]
pub async fn get_action(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<CorrectiveAction> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取整改措施失败");
        }
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的措施ID"),
    };

    let action = sqlx::query_as::<_, CorrectiveAction>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date, completed_at, created_by, created_at, updated_at FROM qms.qa_corrective_actions WHERE deleted_at IS NULL AND id = $1"#)).bind(id)
    .fetch_one(&mut scope)
    .await;

    match action {
        Ok(data) => ApiResponse::success(data, "获取整改措施成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch action: {}", e);
            ApiResponse::server_error("获取整改措施失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:action:read"])),
    path = "/actions/{id}/items",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_action"
)]
pub async fn get_action_items(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<Vec<ActionItem>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取措施明细失败");
        }
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的措施ID"),
    };

    let items = sqlx::query_as::<_, ActionItem>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, action_id::TEXT, item_name, responsible, due_date, status, completed_at, remark, created_at FROM qms.qa_corrective_action_items WHERE action_id = $1 ORDER BY created_at"#)).bind(id)
    .fetch_all(&mut scope)
    .await;

    match items {
        Ok(data) => ApiResponse::success(data, "获取措施明细成功"),
        Err(e) => {
            tracing::error!("Failed to fetch action items: {}", e);
            ApiResponse::server_error("获取措施明细失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:action:write"])),
    path = "/actions/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_action"
)]
pub async fn update_action(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateActionRequest>,
) -> ApiResponse<CorrectiveAction> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的措施ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("整改措施更新失败");
        }
    };

    let target_status = match req.status.as_deref() {
        None => None,
        Some(raw) => {
            let normalized = raw.trim().to_ascii_lowercase();
            if !is_valid_action_status(&normalized) {
                return ApiResponse::bad_request(
                    "status 仅支持 pending/in_progress/completed/verified/cancelled",
                );
            }
            Some(normalized)
        }
    };

    let current_status = sqlx::query_scalar::<_, Option<String>>(
        "SELECT status FROM qms.qa_corrective_actions WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;
    let current_status = match current_status {
        Ok(Some(raw)) => raw
            .map(|s| s.trim().to_ascii_lowercase())
            .filter(|s| is_valid_action_status(s)),
        Ok(None) => return ApiResponse::not_found("记录不存在"),
        Err(e) => {
            tracing::error!("Failed to read action status: {}", e);
            return ApiResponse::server_error("整改措施更新失败");
        }
    };
    let Some(current_status) = current_status else {
        return ApiResponse::conflict("整改措施状态不在规范集合内");
    };
    if let Some(target) = target_status.as_deref() {
        if target != current_status && action_can_transition(&current_status, target).is_err() {
            return ApiResponse::bad_request(&format!(
                "整改措施状态不允许从 {current_status} 流转到 {target}"
            ));
        }
    }

    let updated = sqlx::query(only_own_schema_query!("qms", r#"UPDATE qms.qa_corrective_actions SET title = COALESCE($2, title), description = COALESCE($3, description), root_cause = COALESCE($4, root_cause), action_type = COALESCE($5, action_type), status = COALESCE($6, status), completed_at = CASE WHEN $6 = 'completed' THEN COALESCE(completed_at, NOW()) WHEN $6 IN ('pending', 'in_progress', 'cancelled') THEN NULL ELSE completed_at END, priority = COALESCE($7, priority), assignee = COALESCE($8, assignee), target_date = COALESCE($9::timestamptz, target_date), updated_at = NOW() WHERE id = $1 AND tenant_id = $10 AND deleted_at IS NULL AND status = $11"#)).bind(id).bind(req.title).bind(req.description).bind(req.root_cause).bind(req.action_type).bind(target_status.as_deref()).bind(req.priority).bind(req.assignee).bind(req.target_date).bind(tenant_id).bind(current_status.as_str())
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => {
            ApiResponse::conflict("整改措施状态已变化，请刷新后重试")
        }
        Ok(_) => match sqlx::query_as::<_, CorrectiveAction>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date, completed_at, created_by, created_at, updated_at FROM qms.qa_corrective_actions WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"#)).bind(id).bind(tenant_id)
        .fetch_one(&mut scope)
        .await
        {
            Ok(data) => {
                if let Err(e) = scope.commit().await {
                    tracing::error!("Failed to commit action update: {}", e);
                    return ApiResponse::server_error("整改措施更新失败");
                }
                ApiResponse::success(data, "整改措施更新成功")
            }
            Err(e) => {
                tracing::error!("Failed to reload action: {}", e);
                ApiResponse::server_error("整改措施更新失败")
            }
        },
        Err(e) => {
            tracing::error!("Failed to update action: {}", e);
            ApiResponse::server_error("整改措施更新失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:action:write"])),
    path = "/actions/{id}/complete",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_action"
)]
pub async fn complete_action(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<CorrectiveAction> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的措施ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("整改措施完成失败");
        }
    };

    let current_status = sqlx::query_scalar::<_, Option<String>>(
        "SELECT status FROM qms.qa_corrective_actions WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;
    let current_status = match current_status {
        Ok(Some(raw)) => raw
            .map(|s| s.trim().to_ascii_lowercase())
            .filter(|s| is_valid_action_status(s)),
        Ok(None) => return ApiResponse::not_found("整改措施不存在"),
        Err(e) => {
            tracing::error!("Failed to read action status: {}", e);
            return ApiResponse::server_error("整改措施完成失败");
        }
    };
    let Some(current_status) = current_status else {
        return ApiResponse::conflict("整改措施状态不在规范集合内");
    };
    if current_status == "completed" {
        return ApiResponse::conflict("整改措施已完成");
    }
    if action_can_transition(&current_status, "completed").is_err() {
        return ApiResponse::bad_request(&format!(
            "整改措施状态不允许从 {current_status} 流转到 completed"
        ));
    }

    let updated = sqlx::query(only_own_schema_query!("qms", r#"UPDATE qms.qa_corrective_actions SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL AND status = $3"#)).bind(id).bind(tenant_id).bind(current_status.as_str())
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::conflict("整改措施不存在或已完成"),
        Ok(_) => match sqlx::query_as::<_, CorrectiveAction>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, action_no, issue_id::TEXT, title, description, root_cause, action_type, status, priority, assignee, target_date, completed_at, created_by, created_at, updated_at FROM qms.qa_corrective_actions WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"#)).bind(id).bind(tenant_id)
        .fetch_one(&mut scope)
        .await
        {
            Ok(data) => {
                if let Err(e) = scope.commit().await {
                    tracing::error!("Failed to commit action complete: {}", e);
                    return ApiResponse::server_error("整改措施完成失败");
                }
                ApiResponse::success(data, "整改措施已完成")
            }
            Err(e) => {
                tracing::error!("Failed to reload action: {}", e);
                ApiResponse::server_error("整改措施完成失败")
            }
        },
        Err(e) => {
            tracing::error!("Failed to complete action: {}", e);
            ApiResponse::server_error("整改措施完成失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:action:write"])),
    path = "/actions/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_action"
)]
pub async fn delete_action(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的措施ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("整改措施删除失败");
        }
    };

    let result = sqlx::query(
        only_own_schema_query!("qms", r#"UPDATE qms.qa_corrective_actions SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"#),
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::not_found("整改措施不存在或已删除"),
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit action delete: {}", e);
                return ApiResponse::server_error("整改措施删除失败");
            }
            ApiResponse::success(true, "整改措施删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete action: {}", e);
            ApiResponse::server_error("整改措施删除失败")
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
