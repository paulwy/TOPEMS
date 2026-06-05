use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::api::audit::log_audit_event;
use crate::models::{CorrectiveAction, CreateCorrectiveActionRequest, UpdateCorrectiveActionRequest};
use topems_shared::{ApiResponse, api_error};

use super::ApiState;

#[derive(Debug, Deserialize)]
pub struct CorrectiveActionQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub async fn create_routes() -> Result<Router<ApiState>> {
    let app = Router::new()
        .route("/api/v1/improvements", get(list_actions).post(create_action))
        .route(
            "/api/v1/improvements/{id}",
            get(get_action).put(update_action).delete(delete_action),
        );

    Ok(app)
}

async fn list_actions(
    State(state): State<ApiState>,
    Query(params): Query<CorrectiveActionQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, CorrectiveAction>(
        r#"
        SELECT id, issue_id, title, description, assigned_to, status, implementation_date, verification_result, verified_by, verified_at, created_at, updated_at
        FROM qms.corrective_actions
        WHERE ($1::text IS NULL OR title ILIKE $1 OR description ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(actions) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM qms.corrective_actions
                WHERE ($1::text IS NULL OR title ILIKE $1 OR description ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "actions": actions,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取纠正措施列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取纠正措施列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取纠正措施列表失败"))
        }
    }
}

async fn create_action(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateCorrectiveActionRequest>,
) -> Json<ApiResponse<CorrectiveAction>> {
    if req.issue_id.is_nil() {
        return Json(api_error(400, "关联质量问题ID不能为空"));
    }

    if req.title.is_empty() {
        return Json(api_error(400, "纠正措施标题不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, CorrectiveAction>(
        r#"
        INSERT INTO qms.corrective_actions (id, issue_id, title, description, assigned_to, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
        RETURNING id, issue_id, title, description, assigned_to, status, implementation_date, verification_result, verified_by, verified_at, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.issue_id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.assigned_to)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(action) => (
            Json(ApiResponse::success(action.clone(), "纠正措施创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建纠正措施失败: {}", e);
            (
                Json(api_error(500, "纠正措施创建失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(action) = &result {
        serde_json::to_value(action).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "corrective_action".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_action(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<CorrectiveAction>> {
    let result = sqlx::query_as::<_, CorrectiveAction>(
        r#"
        SELECT id, issue_id, title, description, assigned_to, status, implementation_date, verification_result, verified_by, verified_at, created_at, updated_at
        FROM qms.corrective_actions WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(action)) => Json(ApiResponse::success(action, "获取纠正措施成功")),
        Ok(None) => Json(ApiResponse::<CorrectiveAction>::error(404, "纠正措施不存在")),
        Err(e) => {
            tracing::error!("获取纠正措施失败: {}", e);
            Json(ApiResponse::<CorrectiveAction>::error(500, "获取纠正措施失败"))
        }
    }
}

async fn update_action(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateCorrectiveActionRequest>,
) -> Json<ApiResponse<CorrectiveAction>> {
    let existing = sqlx::query_as::<_, CorrectiveAction>(
        "SELECT id, issue_id, title, description, assigned_to, status, implementation_date, verification_result, verified_by, verified_at, created_at, updated_at FROM qms.corrective_actions WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(a)) => a,
        Ok(None) => return Json(ApiResponse::<CorrectiveAction>::error(404, "纠正措施不存在")),
        Err(e) => return Json(ApiResponse::<CorrectiveAction>::error(500, &format!("查询纠正措施失败: {}", e))),
    };

    let title = req.title.unwrap_or(existing.title);
    let description = req.description.or(existing.description);
    let assigned_to = req.assigned_to.unwrap_or(existing.assigned_to);
    let status = req.status.unwrap_or(existing.status);
    let implementation_date = req.implementation_date.or(existing.implementation_date);
    let verification_result = req.verification_result.or(existing.verification_result);
    let verified_by = req.verified_by.or(existing.verified_by);
    let verified_at = req.verified_at.or(existing.verified_at);
    let now = Utc::now();

    let result = sqlx::query_as::<_, CorrectiveAction>(
        r#"
        UPDATE qms.corrective_actions SET
            title = $2, description = $3, assigned_to = $4, status = $5, implementation_date = $6, verification_result = $7, verified_by = $8, verified_at = $9, updated_at = $10
        WHERE id = $1
        RETURNING id, issue_id, title, description, assigned_to, status, implementation_date, verification_result, verified_by, verified_at, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&title)
    .bind(&description)
    .bind(&assigned_to)
    .bind(&status)
    .bind(implementation_date)
    .bind(&verification_result)
    .bind(&verified_by)
    .bind(verified_at)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(action) => Json(ApiResponse::success(action, "纠正措施更新成功")),
        Err(e) => {
            tracing::error!("更新纠正措施失败: {}", e);
            Json(ApiResponse::<CorrectiveAction>::error(500, "纠正措施更新失败"))
        }
    }
}

async fn delete_action(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM qms.corrective_actions WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "纠正措施删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "纠正措施不存在")),
            "error".to_string(),
            Some("纠正措施不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除纠正措施失败: {}", e);
            (
                Json(api_error(500, "纠正措施删除失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "corrective_action".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}
