use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use bigdecimal::BigDecimal;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::ApiState;
use crate::modules::audit::log_audit_event;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct LeaveRequest {
    pub id: Uuid,
    pub employee_id: Uuid,
    pub leave_type: String,
    pub start_date: chrono::DateTime<chrono::Utc>,
    pub end_date: chrono::DateTime<chrono::Utc>,
    pub days: BigDecimal,
    pub reason: Option<String>,
    pub status: String,
    pub approver_id: Option<Uuid>,
    pub approved_at: Option<chrono::DateTime<chrono::Utc>>,
    pub rejection_reason: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct CreateLeaveRequest {
    pub employee_id: Uuid,
    pub leave_type: String,
    pub start_date: chrono::DateTime<chrono::Utc>,
    pub end_date: chrono::DateTime<chrono::Utc>,
    pub days: BigDecimal,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct UpdateLeaveRequest {
    pub leave_type: Option<String>,
    pub start_date: Option<chrono::DateTime<chrono::Utc>>,
    pub end_date: Option<chrono::DateTime<chrono::Utc>>,
    pub days: Option<BigDecimal>,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ApproveLeaveRequest {
    pub approver_id: Uuid,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RejectLeaveRequest {
    pub approver_id: Uuid,
    pub reason: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct QueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub employee_id: Option<Uuid>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/hrm/leaves", get(list_leaves).post(create_leave))
        .route(
            "/api/hrm/leaves/{id}",
            get(get_leave).put(update_leave).delete(delete_leave),
        )
        .route("/api/hrm/leaves/{id}/approve", put(approve_leave))
        .route("/api/hrm/leaves/{id}/reject", put(reject_leave))
}

async fn list_leaves(
    State(state): State<ApiState>,
    Query(params): Query<QueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let emp_id = params.employee_id;
    let status_filter = params.status;

    let result = sqlx::query_as::<_, LeaveRequest>(
        r#"
        SELECT id, employee_id, leave_type, start_date, end_date, days, reason, status, approver_id, approved_at, rejection_reason, created_at, updated_at
        FROM plugin_hrm.leave_requests
        WHERE ($1::uuid IS NULL OR employee_id = $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(emp_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM leave_requests
                WHERE ($1::uuid IS NULL OR employee_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(emp_id)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "查询成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询请假列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "查询请假列表失败",
            ))
        }
    }
}

async fn create_leave(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateLeaveRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
    if req.employee_id.is_nil() {
        return Json(api_error(400, "员工ID不能为空"));
    }

    if req.leave_type.is_empty() {
        return Json(api_error(400, "请假类型不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(
        r#"
        INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, days, reason, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)
        RETURNING id, employee_id, leave_type, start_date, end_date, days, reason, status, approver_id, approved_at, rejection_reason, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(req.employee_id)
    .bind(&req.leave_type)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(&req.days)
    .bind(&req.reason)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(leave) => (
            Json(ApiResponse::success(leave.clone(), "请假申请提交成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建请假申请失败: {}", e);
            (
                Json(api_error(500, "创建请假申请失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(leave) = &result {
        serde_json::to_value(leave).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "leave".to_string(),
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

async fn get_leave(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<LeaveRequest>> {
    let result = sqlx::query_as::<_, LeaveRequest>(
        "SELECT id, employee_id, leave_type, start_date, end_date, days, reason, status, approver_id, approved_at, rejection_reason, created_at, updated_at FROM leave_requests WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(leave)) => Json(ApiResponse::success(leave, "查询成功")),
        Ok(None) => Json(ApiResponse::<LeaveRequest>::error(404, "请假申请不存在")),
        Err(e) => {
            tracing::error!("查询请假申请失败: {}", e);
            Json(ApiResponse::<LeaveRequest>::error(500, "查询请假申请失败"))
        }
    }
}

async fn update_leave(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateLeaveRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(
        r#"
        UPDATE leave_requests
        SET
            leave_type = COALESCE($1, leave_type),
            start_date = COALESCE($2, start_date),
            end_date = COALESCE($3, end_date),
            days = COALESCE($4, days),
            reason = COALESCE($5, reason),
            updated_at = $6
        WHERE id = $7 AND status = 'pending'
        RETURNING id, employee_id, leave_type, start_date, end_date, days, reason, status, approver_id, approved_at, rejection_reason, created_at, updated_at
        "#
    )
    .bind(&req.leave_type)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(&req.days)
    .bind(&req.reason)
    .bind(now)
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(leave)) => Json(ApiResponse::success(leave, "请假申请更新成功")),
        Ok(None) => Json(ApiResponse::<LeaveRequest>::error(
            404,
            "请假申请不存在或已处理",
        )),
        Err(e) => {
            tracing::error!("更新请假申请失败: {}", e);
            Json(ApiResponse::<LeaveRequest>::error(500, "更新请假申请失败"))
        }
    }
}

async fn delete_leave(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM leave_requests WHERE id = $1 AND status = 'pending'")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success(id.to_string(), "请假申请已取消")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "请假申请不存在或已处理")),
            "error".to_string(),
            Some("请假申请不存在或已处理".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除请假申请失败: {}", e);
            (
                Json(api_error(500, "删除请假申请失败")),
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
        "leave".to_string(),
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

async fn approve_leave(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<ApproveLeaveRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(
        r#"
        UPDATE leave_requests
        SET
            status = 'approved',
            approver_id = $2,
            approved_at = $3,
            updated_at = $3
        WHERE id = $1 AND status = 'pending'
        RETURNING id, employee_id, leave_type, start_date, end_date, days, reason, status, approver_id, approved_at, rejection_reason, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(req.approver_id)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(leave)) => Json(ApiResponse::success(leave, "请假已批准")),
        Ok(None) => Json(ApiResponse::<LeaveRequest>::error(
            404,
            "请假申请不存在或已处理",
        )),
        Err(e) => {
            tracing::error!("批准请假失败: {}", e);
            Json(ApiResponse::<LeaveRequest>::error(500, "批准请假失败"))
        }
    }
}

async fn reject_leave(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<RejectLeaveRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(
        r#"
        UPDATE leave_requests
        SET
            status = 'rejected',
            approver_id = $2,
            approved_at = $3,
            rejection_reason = $4,
            updated_at = $3
        WHERE id = $1 AND status = 'pending'
        RETURNING id, employee_id, leave_type, start_date, end_date, days, reason, status, approver_id, approved_at, rejection_reason, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(req.approver_id)
    .bind(now)
    .bind(&req.reason)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(leave)) => Json(ApiResponse::success(leave, "请假已拒绝")),
        Ok(None) => Json(ApiResponse::<LeaveRequest>::error(
            404,
            "请假申请不存在或已处理",
        )),
        Err(e) => {
            tracing::error!("拒绝请假失败: {}", e);
            Json(ApiResponse::<LeaveRequest>::error(500, "拒绝请假失败"))
        }
    }
}
