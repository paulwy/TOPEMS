use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use bigdecimal::BigDecimal;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use utoipa::ToSchema;
use uuid::Uuid;

use super::ApiState;
use crate::modules::audit::log_audit_event;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow, ToSchema)]
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

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
pub struct CreateLeaveRequest {
    pub employee_id: Uuid,
    pub leave_type: String,
    pub start_date: chrono::DateTime<chrono::Utc>,
    pub end_date: chrono::DateTime<chrono::Utc>,
    pub days: BigDecimal,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize, ToSchema)]
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
    #[serde(alias = "page_size")]
    pub page_size: Option<i64>,
    pub employee_id: Option<Uuid>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/leaves", get(list_leaves).post(create_leave))
        .route(
            "/leaves/{id}",
            get(get_leave).put(update_leave).delete(delete_leave),
        )
        .route("/leaves/{id}/approve", put(approve_leave))
        .route("/leaves/{id}/reject", put(reject_leave))
}

#[utoipa::path(
    get,
    path = "/leaves",
    tag = "leave",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页大小"),
        ("employee_id" = Option<Uuid>, Query, description = "员工ID"),
        ("status" = Option<String>, Query, description = "状态")
    ),
    responses(
        (status = 200, description = "获取请假记录列表成功", body = serde_json::Value),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn list_leaves(
    State(_state): State<ApiState>,
    Query(params): Query<QueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;

    let emp_id = params.employee_id;
    let status_filter = params.status;

    let result = sqlx::query_as::<_, LeaveRequest>(
        only_own_schema_query!("hrm", r#"
        SELECT id, employee_id, leave_type, start_date::timestamptz AS start_date, end_date::timestamptz AS end_date, days, reason, status, approver_id, approval_date::timestamptz AS approved_at, rejection_reason, created_at, updated_at
        FROM hrm.leave_records
        WHERE deleted_at IS NULL
          AND ($1::uuid IS NULL OR employee_id = $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#),
    )
    .bind(emp_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.leave_records
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR employee_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                "#
            ))
            .bind(emp_id)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
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

#[utoipa::path(
    post,
    path = "/leaves",
    tag = "leave",
    request_body = CreateLeaveRequest,
    responses(
        (status = 200, description = "请假记录创建成功", body = LeaveRequest),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn create_leave(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateLeaveRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if req.employee_id.is_nil() {
        return Json(api_error(400, "员工ID不能为空"));
    }

    if req.leave_type.is_empty() {
        return Json(api_error(400, "请假类型不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let org_id = claims
        .tenant_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil());

    let result = sqlx::query_as::<_, LeaveRequest>(
        only_own_schema_query!("hrm", r#"
        INSERT INTO hrm.leave_records (id, employee_id, leave_type, start_date, end_date, days, reason, status, organization_id, tenant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9, $10, $11)
        RETURNING id, employee_id, leave_type, start_date::timestamptz AS start_date, end_date::timestamptz AS end_date, days, reason, status, approver_id, approval_date::timestamptz AS approved_at, rejection_reason, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(req.employee_id)
    .bind(&req.leave_type)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(&req.days)
    .bind(&req.reason)
    .bind(org_id)
    .bind(org_id)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
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

#[utoipa::path(
    get,
    path = "/leaves/{id}",
    tag = "leave",
    params(
        ("id" = Uuid, Path, description = "请假记录ID")
    ),
    responses(
        (status = 200, description = "获取请假记录成功", body = LeaveRequest),
        (status = 404, description = "请假记录不存在"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn get_leave(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<LeaveRequest>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, LeaveRequest>(
        only_own_schema_query!("hrm", "SELECT id, employee_id, leave_type, start_date::timestamptz AS start_date, end_date::timestamptz AS end_date, days, reason, status, approver_id, approval_date::timestamptz AS approved_at, rejection_reason, created_at, updated_at FROM hrm.leave_records WHERE deleted_at IS NULL AND id = $1")
    )
    .bind(id)
    .fetch_optional(&mut **txn)
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

#[utoipa::path(
    put,
    path = "/leaves/{id}",
    tag = "leave",
    params(
        ("id" = Uuid, Path, description = "请假记录ID")
    ),
    request_body = UpdateLeaveRequest,
    responses(
        (status = 200, description = "请假记录更新成功", body = LeaveRequest),
        (status = 400, description = "请求参数错误"),
        (status = 404, description = "请假记录不存在"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn update_leave(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateLeaveRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.leave_records
        SET
            leave_type = COALESCE($1, leave_type),
            start_date = COALESCE($2, start_date),
            end_date = COALESCE($3, end_date),
            days = COALESCE($4, days),
            reason = COALESCE($5, reason),
            updated_at = $6
        WHERE id = $7 AND status = 'pending'
        RETURNING id, employee_id, leave_type, start_date::timestamptz AS start_date, end_date::timestamptz AS end_date, days, reason, status, approver_id, approval_date::timestamptz AS approved_at, rejection_reason, created_at, updated_at
        "#)
    )
    .bind(&req.leave_type)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(&req.days)
    .bind(&req.reason)
    .bind(now)
    .bind(id)
    .fetch_optional(&mut **txn)
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

#[utoipa::path(
    delete,
    path = "/leaves/{id}",
    tag = "leave",
    params(
        ("id" = Uuid, Path, description = "请假记录ID")
    ),
    responses(
        (status = 200, description = "请假记录删除成功", body = String),
        (status = 404, description = "请假记录不存在"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn delete_leave(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.leave_records SET deleted_at = NOW() WHERE id = $1 AND status = 'pending'"
    ))
    .bind(id)
    .execute(&mut **txn)
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

pub async fn approve_leave(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApproveLeaveRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.leave_records
        SET
            status = 'approved',
            approver_id = $2,
            approval_date = $3,
            updated_at = $3
        WHERE id = $1 AND status = 'pending'
        RETURNING id, employee_id, leave_type, start_date::timestamptz AS start_date, end_date::timestamptz AS end_date, days, reason, status, approver_id, approval_date::timestamptz AS approved_at, rejection_reason, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(req.approver_id)
    .bind(now)
    .fetch_optional(&mut **txn)
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

pub async fn reject_leave(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<RejectLeaveRequest>,
) -> Json<ApiResponse<LeaveRequest>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let now = Utc::now();

    let result = sqlx::query_as::<_, LeaveRequest>(
        only_own_schema_query!("hrm", r#"
        UPDATE hrm.leave_records
        SET
            status = 'rejected',
            approver_id = $2,
            approval_date = $3,
            rejection_reason = $4,
            updated_at = $3
        WHERE id = $1 AND status = 'pending'
        RETURNING id, employee_id, leave_type, start_date::timestamptz AS start_date, end_date::timestamptz AS end_date, days, reason, status, approver_id, approval_date::timestamptz AS approved_at, rejection_reason, created_at, updated_at
        "#)
    )
    .bind(id)
    .bind(req.approver_id)
    .bind(now)
    .bind(&req.reason)
    .fetch_optional(&mut **txn)
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

#[cfg(test)]
mod tests {
    use super::*;
    use serde::de::DeserializeOwned;

    fn now() -> chrono::DateTime<chrono::Utc> {
        Utc::now()
    }

    fn dec(n: i64) -> BigDecimal {
        BigDecimal::from(n)
    }

    fn roundtrip<T: Serialize + DeserializeOwned + std::fmt::Debug>(item: &T) {
        let json = serde_json::to_string(item).expect("serialize");
        let v1: serde_json::Value = serde_json::from_str(&json).expect("to_value");
        let back: T = serde_json::from_str(&json).expect("deserialize");
        let json2 = serde_json::to_string(&back).expect("re-serialize");
        let v2: serde_json::Value = serde_json::from_str(&json2).expect("to_value2");
        assert_eq!(v1, v2, "roundtrip mismatch");
    }

    #[test]
    fn test_leave_request_roundtrip_full() {
        roundtrip(&LeaveRequest {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            leave_type: "annual".to_string(),
            start_date: now(),
            end_date: now(),
            days: dec(3),
            reason: Some("Family vacation".to_string()),
            status: "pending".to_string(),
            approver_id: Some(Uuid::new_v4()),
            approved_at: Some(now()),
            rejection_reason: None,
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_leave_request_roundtrip_minimal() {
        roundtrip(&LeaveRequest {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            leave_type: "sick".to_string(),
            start_date: now(),
            end_date: now(),
            days: dec(1),
            reason: None,
            status: "approved".to_string(),
            approver_id: None,
            approved_at: None,
            rejection_reason: None,
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_leave_request_roundtrip_rejected() {
        roundtrip(&LeaveRequest {
            id: Uuid::new_v4(),
            employee_id: Uuid::new_v4(),
            leave_type: "personal".to_string(),
            start_date: now(),
            end_date: now(),
            days: dec(2),
            reason: Some("Personal matter".to_string()),
            status: "rejected".to_string(),
            approver_id: Some(Uuid::new_v4()),
            approved_at: Some(now()),
            rejection_reason: Some("Not enough notice".to_string()),
            created_at: now(),
            updated_at: now(),
        });
    }

    #[test]
    fn test_create_leave_request_roundtrip() {
        roundtrip(&CreateLeaveRequest {
            employee_id: Uuid::new_v4(),
            leave_type: "annual".to_string(),
            start_date: now(),
            end_date: now(),
            days: dec(5),
            reason: Some("Summer break".to_string()),
        });
        roundtrip(&CreateLeaveRequest {
            employee_id: Uuid::new_v4(),
            leave_type: "sick".to_string(),
            start_date: now(),
            end_date: now(),
            days: dec(1),
            reason: None,
        });
    }

    #[test]
    fn test_update_leave_request_roundtrip_all_none() {
        roundtrip(&UpdateLeaveRequest {
            leave_type: None,
            start_date: None,
            end_date: None,
            days: None,
            reason: None,
        });
    }

    #[test]
    fn test_update_leave_request_roundtrip_all_some() {
        roundtrip(&UpdateLeaveRequest {
            leave_type: Some("annual".to_string()),
            start_date: Some(now()),
            end_date: Some(now()),
            days: Some(dec(4)),
            reason: Some("Extended vacation".to_string()),
        });
    }

    #[test]
    fn test_approve_leave_request_roundtrip() {
        roundtrip(&ApproveLeaveRequest {
            approver_id: Uuid::new_v4(),
        });
    }

    #[test]
    fn test_reject_leave_request_roundtrip() {
        roundtrip(&RejectLeaveRequest {
            approver_id: Uuid::new_v4(),
            reason: "Insufficient staffing".to_string(),
        });
    }

    #[test]
    fn test_query_params_deserialize_all_none() {
        let json = r#"{}"#;
        let params: QueryParams = serde_json::from_str(json).expect("deserialize");
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert!(params.employee_id.is_none());
        assert!(params.status.is_none());
    }

    #[test]
    fn test_query_params_deserialize_all_some() {
        let emp = Uuid::new_v4();
        let json = format!(
            r#"{{"page":2,"page_size":15,"employee_id":"{}","status":"pending"}}"#,
            emp
        );
        let params: QueryParams = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(params.page, Some(2));
        assert_eq!(params.page_size, Some(15));
        assert_eq!(params.employee_id, Some(emp));
        assert_eq!(params.status.as_deref(), Some("pending"));
    }

    #[test]
    fn test_create_routes_returns_router() {
        let _router = create_routes();
    }
}
