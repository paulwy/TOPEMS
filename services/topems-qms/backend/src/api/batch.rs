use axum::{
    extract::{Extension, State},
    http::HeaderMap,
    routing::post,
    Json, Router,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::api::audit::log_audit_event;
use crate::services::permission::{check_permission, ModulePermission};
use crate::utils::status::{validate_issue_status_transition, validate_action_status_transition};
use topems_shared::auth::Claims;
use topems_shared::{ApiResponse, api_error};

use super::ApiState;

#[derive(Debug, Deserialize, Serialize)]
pub struct BatchUpdateIssueStatusRequest {
    pub ids: Vec<Uuid>,
    pub status: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct BatchUpdateActionStatusRequest {
    pub ids: Vec<Uuid>,
    pub status: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct BatchDeleteRequest {
    pub ids: Vec<Uuid>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/issues/batch/status", post(batch_update_issue_status))
        .route("/api/v1/issues/batch/delete", post(batch_delete_issues))
        .route("/api/v1/improvements/batch/status", post(batch_update_action_status))
        .route("/api/v1/improvements/batch/delete", post(batch_delete_actions))
}

/// 批量更新问题状态
async fn batch_update_issue_status(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<BatchUpdateIssueStatusRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::QualityWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    
    if req.ids.is_empty() {
        return Json(api_error(400, "ID列表不能为空"));
    }
    
    // 获取当前状态并验证流转
    let mut valid_ids: Vec<Uuid> = Vec::new();
    let mut invalid_transitions: Vec<String> = Vec::new();
    
    for id in &req.ids {
        let current_status: Option<String> = sqlx::query_scalar(
            "SELECT status FROM qms.quality_issues WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);
        
        if let Some(current) = current_status {
            if validate_issue_status_transition(&current, &req.status).is_ok() {
                valid_ids.push(*id);
            } else {
                invalid_transitions.push(format!("ID {}: {} -> {}", id, current, req.status));
            }
        }
    }
    
    if valid_ids.is_empty() {
        return Json(api_error(400, &format!("所有状态流转都不合法: {}", invalid_transitions.join(", "))));
    }
    
    // 执行批量更新
    let ids_json = serde_json::to_value(&valid_ids).ok();
    let result = sqlx::query(
        "UPDATE qms.quality_issues SET status = $1, updated_at = NOW() WHERE id = ANY($2)"
    )
    .bind(&req.status)
    .bind(&valid_ids)
    .execute(&state.db)
    .await;
    
    let (response, status_str, error_msg) = match &result {
        Ok(r) => (
            Json(ApiResponse::success(
                serde_json::json!({
                    "updated_count": r.rows_affected(),
                    "invalid_transitions": invalid_transitions
                }),
                "批量更新问题状态成功",
            )),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("批量更新问题状态失败: {}", e);
            (
                Json(api_error(500, "批量更新问题状态失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };
    
    log_audit_event(
        &state.db,
        "batch_update".to_string(),
        "quality_issue".to_string(),
        None,
        ids_json,
        claims.user_id().ok().map(|id| id.to_string()),
        Some(claims.username.clone()),
        Some(serde_json::to_value(&req).unwrap_or(serde_json::Value::Null)),
        None,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;
    
    response
}

/// 批量删除问题
async fn batch_delete_issues(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<BatchDeleteRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::QualityWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    
    if req.ids.is_empty() {
        return Json(api_error(400, "ID列表不能为空"));
    }
    
    let ids_json = serde_json::to_value(&req.ids).ok();
    let result = sqlx::query(
        "DELETE FROM qms.quality_issues WHERE id = ANY($1)"
    )
    .bind(&req.ids)
    .execute(&state.db)
    .await;
    
    let (response, status_str, error_msg) = match &result {
        Ok(r) => (
            Json(ApiResponse::success(
                serde_json::json!({ "deleted_count": r.rows_affected() }),
                "批量删除问题成功",
            )),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("批量删除问题失败: {}", e);
            (
                Json(api_error(500, "批量删除问题失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };
    
    log_audit_event(
        &state.db,
        "batch_delete".to_string(),
        "quality_issue".to_string(),
        None,
        ids_json,
        claims.user_id().ok().map(|id| id.to_string()),
        Some(claims.username.clone()),
        None,
        None,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;
    
    response
}

/// 批量更新纠正措施状态
async fn batch_update_action_status(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<BatchUpdateActionStatusRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::QualityWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    
    if req.ids.is_empty() {
        return Json(api_error(400, "ID列表不能为空"));
    }
    
    // 获取当前状态并验证流转
    let mut valid_ids: Vec<Uuid> = Vec::new();
    let mut invalid_transitions: Vec<String> = Vec::new();
    
    for id in &req.ids {
        let current_status: Option<String> = sqlx::query_scalar(
            "SELECT status FROM qms.corrective_actions WHERE id = $1"
        )
        .bind(id)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);
        
        if let Some(current) = current_status {
            if validate_action_status_transition(&current, &req.status).is_ok() {
                valid_ids.push(*id);
            } else {
                invalid_transitions.push(format!("ID {}: {} -> {}", id, current, req.status));
            }
        }
    }
    
    if valid_ids.is_empty() {
        return Json(api_error(400, &format!("所有状态流转都不合法: {}", invalid_transitions.join(", "))));
    }
    
    // 执行批量更新
    let ids_json = serde_json::to_value(&valid_ids).ok();
    let result = sqlx::query(
        "UPDATE qms.corrective_actions SET status = $1, updated_at = NOW() WHERE id = ANY($2)"
    )
    .bind(&req.status)
    .bind(&valid_ids)
    .execute(&state.db)
    .await;
    
    let (response, status_str, error_msg) = match &result {
        Ok(r) => (
            Json(ApiResponse::success(
                serde_json::json!({
                    "updated_count": r.rows_affected(),
                    "invalid_transitions": invalid_transitions
                }),
                "批量更新纠正措施状态成功",
            )),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("批量更新纠正措施状态失败: {}", e);
            (
                Json(api_error(500, "批量更新纠正措施状态失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };
    
    log_audit_event(
        &state.db,
        "batch_update".to_string(),
        "corrective_action".to_string(),
        None,
        ids_json,
        claims.user_id().ok().map(|id| id.to_string()),
        Some(claims.username.clone()),
        Some(serde_json::to_value(&req).unwrap_or(serde_json::Value::Null)),
        None,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;
    
    response
}

/// 批量删除纠正措施
async fn batch_delete_actions(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<BatchDeleteRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::QualityWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    
    if req.ids.is_empty() {
        return Json(api_error(400, "ID列表不能为空"));
    }
    
    let ids_json = serde_json::to_value(&req.ids).ok();
    let result = sqlx::query(
        "DELETE FROM qms.corrective_actions WHERE id = ANY($1)"
    )
    .bind(&req.ids)
    .execute(&state.db)
    .await;
    
    let (response, status_str, error_msg) = match &result {
        Ok(r) => (
            Json(ApiResponse::success(
                serde_json::json!({ "deleted_count": r.rows_affected() }),
                "批量删除纠正措施成功",
            )),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("批量删除纠正措施失败: {}", e);
            (
                Json(api_error(500, "批量删除纠正措施失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };
    
    log_audit_event(
        &state.db,
        "batch_delete".to_string(),
        "corrective_action".to_string(),
        None,
        ids_json,
        claims.user_id().ok().map(|id| id.to_string()),
        Some(claims.username.clone()),
        None,
        None,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;
    
    response
}