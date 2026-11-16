use topems_shared_auth::middleware::tenant::RlsTxnCell;
use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::{Datelike, Utc};
use serde::Deserialize;
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::error::TopemsError;
use uuid::Uuid;

use super::ApiState;
use crate::models::{AttendanceRecord, CreateAttendanceRequest, UpdateAttendanceRequest};
use crate::modules::audit::log_audit_event;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/attendance", get(list_attendance).post(create_attendance))
        .route("/attendance/today-status", get(get_today_status))
        .route("/attendance/check-in", post(check_in))
        .route("/attendance/check-out", post(check_out))
        .route("/attendance/stats", get(get_attendance_stats))
        .route("/attendance/records", get(list_attendance_records))
        .route(
            "/attendance/{id}",
            get(get_attendance)
                .put(update_attendance)
                .delete(delete_attendance),
        )
}

#[derive(Debug, Deserialize)]
pub struct TodayStatusParams {
    pub user_id: Option<String>,
    pub employee_id: Option<Uuid>,
}

#[utoipa::path(
    get,
    security(("bearerAuth" = [])),
    path = "/attendance/today-status",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "attendance"
)]
pub async fn get_today_status(
    State(_state): State<ApiState>,
    Query(params): Query<TodayStatusParams>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let user_id = params.user_id.as_deref();
    let employee_id = params.employee_id;

    if user_id.is_none() && employee_id.is_none() {
        return ApiResponse::<serde_json::Value>::bad_request(
            "user_id 或 employee_id 至少提供一个",
        );
    }

    // 如果传入 user_id，先解析为 employee_id（Mobile-BFF 数据迁移后统一走 hrm 表）
    let resolved_employee_id = if let Some(uid) = user_id {
        match sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM hrm.employees WHERE user_id = $1::uuid AND deleted_at IS NULL LIMIT 1",
        )
        .bind(uid)
        .fetch_optional(&mut **txn)
        .await
        {
            Ok(Some(eid)) => Some(eid),
            Ok(None) => {
                tracing::warn!("未找到 user_id={} 对应的 employee_id", uid);
                None
            }
            Err(e) => {
                tracing::error!("解析 user_id 为 employee_id 失败: {}", e);
                return ApiResponse::<serde_json::Value>::server_error("解析用户信息失败");
            }
        }
    } else {
        employee_id
    };

    let eid = match resolved_employee_id {
        Some(eid) => eid,
        None => {
            return ApiResponse::success(
                serde_json::json!({ "status": "not_checked_in" }),
                "未找到对应员工，默认未签到",
            );
        }
    };

    // 统一查询 hrm.attendance_records 表（Mobile-BFF 数据迁移完成，移除跨 schema 查询）
    let result = sqlx::query(
        r#"
        SELECT check_in_time, check_out_time
        FROM hrm.attendance_records
        WHERE employee_id = $1 AND date::date = CURRENT_DATE
        ORDER BY date DESC
        LIMIT 1
        "#,
    )
    .bind(eid)
    .fetch_optional(&mut **txn)
    .await;

    let status = match result {
        Ok(Some(row)) => {
            let has_check_in: bool = row
                .get::<Option<chrono::NaiveTime>, _>("check_in_time")
                .is_some();
            let has_check_out: bool = row
                .get::<Option<chrono::NaiveTime>, _>("check_out_time")
                .is_some();

            if has_check_out {
                "checked_out"
            } else if has_check_in {
                "checked_in"
            } else {
                "not_checked_in"
            }
        }
        Ok(None) => "not_checked_in",
        Err(e) => {
            tracing::error!("获取今日考勤状态失败: {}", e);
            return ApiResponse::<serde_json::Value>::server_error("获取今日考勤状态失败");
        }
    };

    ApiResponse::success(
        serde_json::json!({ "status": status }),
        "获取今日考勤状态成功",
    )
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct AttendancePaginationParams {
    pub page: Option<i64>,
    #[serde(alias = "page_size")]
    pub page_size: Option<i64>,
    pub employee_id: Option<Uuid>,
    pub date: Option<String>,
}

#[utoipa::path(
    get,
    path = "/attendance",
    tag = "attendance",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页大小"),
        ("employee_id" = Option<Uuid>, Query, description = "员工ID"),
        ("date" = Option<String>, Query, description = "日期"),
    ),
    responses(
        (status = 200, description = "获取考勤记录列表成功", body = serde_json::Value),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn list_attendance(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AttendancePaginationParams>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::AttendanceRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let emp_filter = params.employee_id;
    let date_filter = params.date;

    let result = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, tenant_id, employee_id, date::timestamptz AS date,
               check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
               status, work_hours::float8 AS work_hours, notes, created_at, updated_at
        FROM hrm.attendance_records
        WHERE deleted_at IS NULL
          AND ($1::uuid IS NULL OR employee_id = $1)
          AND ($2::text IS NULL OR date::text = $2)
        ORDER BY date DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(emp_filter)
    .bind(&date_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"
                SELECT COUNT(*) FROM hrm.attendance_records
                WHERE deleted_at IS NULL
                  AND ($1::uuid IS NULL OR employee_id = $1)
                  AND ($2::text IS NULL OR date::text = $2)
                "#
            ))
            .bind(emp_filter)
            .bind(&date_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "records": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取考勤记录列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取考勤记录列表失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("获取考勤记录列表失败")
        }
    }
}

#[utoipa::path(
    post,
    path = "/attendance",
    tag = "attendance",
    request_body = CreateAttendanceRequest,
    responses(
        (status = 200, description = "考勤记录创建成功", body = AttendanceRecord),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 403, description = "权限不足"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn create_attendance(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
    Json(req): Json<CreateAttendanceRequest>,
) -> ApiResponse<AttendanceRecord> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if req.employee_id.is_nil() {
        return ApiResponse::from(TopemsError::ValidationFailed("员工ID不能为空".to_string()));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let org_id = claims
        .tenant_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil());

    let result = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
        "hrm",
        r#"
        INSERT INTO hrm.attendance_records (
            id, tenant_id, organization_id, employee_id, date, check_in_time, check_out_time,
            status, work_hours, notes, created_at, updated_at
        ) VALUES ($1, $2, $2, $3, $4, $5::TIME, $6::TIME, $7, $8, $9, $10, $11)
        RETURNING id, tenant_id, employee_id, date::timestamptz AS date,
                  check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
                  status, work_hours::float8 AS work_hours, notes, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(org_id)
    .bind(req.employee_id)
    .bind(req.date)
    .bind(req.check_in.clone())
    .bind(req.check_out.clone())
    .bind(&req.status)
    .bind(req.work_hours)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(record) => (
            ApiResponse::success(record.clone(), "考勤记录创建成功"),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建考勤记录失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("考勤记录创建失败".to_string())),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(record) = &result {
        serde_json::to_value(record).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "attendance".to_string(),
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

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
        }
    }

    response
}

#[utoipa::path(
    get,
    path = "/attendance/{id}",
    tag = "attendance",
    params(
        ("id" = Uuid, Path, description = "考勤记录ID")
    ),
    responses(
        (status = 200, description = "获取考勤记录成功", body = AttendanceRecord),
        (status = 404, description = "考勤记录不存在"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn get_attendance(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<AttendanceRecord> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, tenant_id, employee_id, date::timestamptz AS date,
               check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
               status, work_hours::float8 AS work_hours, notes, created_at, updated_at
        FROM hrm.attendance_records WHERE deleted_at IS NULL AND id = $1
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(record)) => ApiResponse::success(record, "获取考勤记录成功"),
        Ok(None) => ApiResponse::<AttendanceRecord>::not_found("考勤记录不存在"),
        Err(e) => {
            tracing::error!("获取考勤记录失败: {}", e);
            ApiResponse::<AttendanceRecord>::server_error("获取考勤记录失败")
        }
    }
}

#[utoipa::path(
    put,
    path = "/attendance/{id}",
    tag = "attendance",
    params(
        ("id" = Uuid, Path, description = "考勤记录ID")
    ),
    request_body = UpdateAttendanceRequest,
    responses(
        (status = 200, description = "考勤记录更新成功", body = AttendanceRecord),
        (status = 400, description = "请求参数错误"),
        (status = 404, description = "考勤记录不存在"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn update_attendance(
    State(_state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
    Json(req): Json<UpdateAttendanceRequest>,
) -> ApiResponse<AttendanceRecord> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let existing = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, tenant_id, employee_id, date::timestamptz AS date,
               check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
               status, work_hours::float8 AS work_hours, notes, created_at, updated_at
        FROM hrm.attendance_records WHERE deleted_at IS NULL AND id = $1
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::<AttendanceRecord>::not_found("考勤记录不存在"),
        Err(_e) => return ApiResponse::<AttendanceRecord>::server_error("查询考勤记录失败"),
    };

    let check_in = req.check_in.or(existing.check_in);
    let check_out = req.check_out.or(existing.check_out);
    let status = req.status.or(existing.status);
    let work_hours = req.work_hours.or(existing.work_hours);
    let notes = req.notes.or(existing.notes);
    let now = Utc::now();

    let result = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
        "hrm",
        r#"
        UPDATE hrm.attendance_records SET
            check_in_time = $2::TIME, check_out_time = $3::TIME, status = $4,
            work_hours = $5, notes = $6, updated_at = $7
        WHERE id = $1 AND deleted_at IS NULL AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
        RETURNING id, tenant_id, employee_id, date::timestamptz AS date,
                  check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
                  status, work_hours::float8 AS work_hours, notes, created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(check_in)
    .bind(check_out)
    .bind(&status)
    .bind(work_hours)
    .bind(&notes)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(record) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(record, "考勤记录更新成功")
        }
        Err(e) => {
            tracing::error!("更新考勤记录失败: {}", e);
            ApiResponse::<AttendanceRecord>::server_error("考勤记录更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    path = "/attendance/{id}",
    tag = "attendance",
    params(
        ("id" = Uuid, Path, description = "考勤记录ID")
    ),
    responses(
        (status = 200, description = "考勤记录删除成功", body = String),
        (status = 404, description = "考勤记录不存在"),
        (status = 500, description = "服务器错误")
    ),
    security(("bearerAuth" = []))
)]
pub async fn delete_attendance(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.attendance_records SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            ApiResponse::success("".to_string(), "考勤记录删除成功"),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            ApiResponse::from(TopemsError::ResourceNotFound("考勤记录不存在".to_string())),
            "error".to_string(),
            Some("考勤记录不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除考勤记录失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("考勤记录删除失败".to_string())),
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
        "attendance".to_string(),
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

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
        }
    }

    response
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_create_routes_returns_router() {
        let _router = create_routes();
    }

    #[test]
    fn test_today_status_params_deserialize_all_none() {
        let json = r#"{}"#;
        let params: TodayStatusParams = serde_json::from_str(json).expect("deserialize");
        assert!(params.user_id.is_none());
        assert!(params.employee_id.is_none());
    }

    #[test]
    fn test_today_status_params_deserialize_user_id_only() {
        let json = r#"{"user_id":"user-abc"}"#;
        let params: TodayStatusParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(params.user_id.as_deref(), Some("user-abc"));
        assert!(params.employee_id.is_none());
    }

    #[test]
    fn test_today_status_params_deserialize_employee_id_only() {
        let eid = Uuid::new_v4();
        let json = format!(r#"{{"employee_id":"{}"}}"#, eid);
        let params: TodayStatusParams = serde_json::from_str(&json).expect("deserialize");
        assert!(params.user_id.is_none());
        assert_eq!(params.employee_id, Some(eid));
    }

    #[test]
    fn test_today_status_params_deserialize_both() {
        let eid = Uuid::new_v4();
        let json = format!(r#"{{"user_id":"user-xyz","employee_id":"{}"}}"#, eid);
        let params: TodayStatusParams = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(params.user_id.as_deref(), Some("user-xyz"));
        assert_eq!(params.employee_id, Some(eid));
    }

    #[test]
    fn test_today_status_params_deserialize_invalid_uuid_rejected() {
        let json = r#"{"employee_id":"not-a-uuid"}"#;
        let result: Result<TodayStatusParams, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }
}

#[derive(Debug, Deserialize)]
pub struct CheckRequest {
    pub employee_id: Option<Uuid>,
    pub user_id: Option<String>,
}

/// 统一解析 user_id -> employee_id（与 today-status / stats 同口径）
async fn resolve_employee_id_from_req(
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    user_id: Option<&str>,
    employee_id: Option<Uuid>,
) -> Result<Option<Uuid>, TopemsError> {
    if let Some(uid) = user_id {
        sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM hrm.employees WHERE user_id = $1::uuid AND deleted_at IS NULL LIMIT 1",
        )
        .bind(uid)
        .fetch_optional(&mut **txn)
        .await
        .map_err(|e| TopemsError::ValidationFailed(format!("user_id 解析 employee_id 失败: {}", e)))
    } else {
        Ok(employee_id.filter(|e| !e.is_nil()))
    }
}

#[derive(Debug, Deserialize)]
pub struct AttendanceRecordsParams {
    pub user_id: Option<String>,
    pub employee_id: Option<Uuid>,
    pub page: Option<i64>,
    #[serde(alias = "pagesize", alias = "page_size")]
    pub page_size: Option<i64>,
    pub month: Option<String>,
}

/// GET /attendance/records —— 移动端考勤记录分页（MobileAttendancePage 契约）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["hrm:attendance:read"])),
    path = "/attendance/records",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "attendance"
)]
pub async fn list_attendance_records(
    State(_state): State<ApiState>,
    Query(params): Query<AttendanceRecordsParams>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");

    let employee_id = match resolve_employee_id_from_req(
        txn,
        params.user_id.as_deref(),
        params.employee_id,
    )
    .await
    {
        Ok(Some(eid)) => Some(eid),
        Ok(None) => None,
        Err(msg) => {
            tracing::error!("解析员工信息失败: {}", msg);
            return ApiResponse::<serde_json::Value>::server_error("解析员工信息失败");
        }
    };

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let month_prefix = params.month.map(|m| format!("{}%", m));

    let items_result = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
        "hrm",
        r#"SELECT id, tenant_id, employee_id, date::timestamptz AS date,
                  check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
                  status, work_hours::float8 AS work_hours, notes, created_at, updated_at
           FROM hrm.attendance_records
           WHERE deleted_at IS NULL
             AND ($1::uuid IS NULL OR employee_id = $1)
             AND ($2::text IS NULL OR date::text LIKE $2)
           ORDER BY date DESC
           LIMIT $3 OFFSET $4"#
    ))
    .bind(employee_id)
    .bind(&month_prefix)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match items_result {
        Ok(items) => {
            let total_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "hrm",
                r#"SELECT COUNT(*) FROM hrm.attendance_records
                   WHERE deleted_at IS NULL
                     AND ($1::uuid IS NULL OR employee_id = $1)
                     AND ($2::text IS NULL OR date::text LIKE $2)"#
            ))
            .bind(employee_id)
            .bind(&month_prefix)
            .fetch_one(&mut **txn)
            .await;
            let total = total_result.unwrap_or(0);
            ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取考勤记录成功",
            )
        }
        Err(e) => {
            tracing::error!("查询考勤记录失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("查询考勤记录失败")
        }
    }
}

/// POST /attendance/check-in —— 移动端打卡上班（当天已有记录则更新时间）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["hrm:write"])),
    path = "/hrm/attendance/check-in",
    tag = "HRM",
    responses(
        (status = 200, description = "打卡成功", body = ApiResponse<AttendanceRecord>),
        (status = 500, description = "打卡失败"),
    ),
)]
pub async fn check_in(
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
    Json(req): Json<CheckRequest>,
) -> ApiResponse<AttendanceRecord> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let employee_id =
        match resolve_employee_id_from_req(txn, req.user_id.as_deref(), req.employee_id).await {
            Ok(Some(eid)) => eid,
            Ok(None) => {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "员工ID不能为空".to_string(),
                ))
            }
            Err(msg) => {
                tracing::error!("解析员工信息失败: {}", msg);
                return ApiResponse::from(TopemsError::Internal("解析员工信息失败".to_string()));
            }
        };
    let now = Utc::now();
    let org_id = claims
        .tenant_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil());

    let existing = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
        "hrm",
        r#"SELECT id, tenant_id, employee_id, date::timestamptz AS date,
                  check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
                  status, work_hours::float8 AS work_hours, notes, created_at, updated_at
           FROM hrm.attendance_records
           WHERE employee_id = $1 AND date::date = CURRENT_DATE
           ORDER BY created_at DESC LIMIT 1"#
    ))
    .bind(employee_id)
    .fetch_optional(&mut **txn)
    .await;

    match existing {
        Ok(Some(record)) => {
            let result = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
                "hrm",
                r#"UPDATE hrm.attendance_records
                   SET check_in_time = $2::TIME, status = COALESCE(status, 'active'), updated_at = now()
                   WHERE id = $1
                   RETURNING id, tenant_id, employee_id, date::timestamptz AS date,
                             check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
                             status, work_hours::float8 AS work_hours, notes, created_at, updated_at"#
            ))
            .bind(record.id)
            .bind(now)
            .fetch_one(&mut **txn)
            .await;
            match result {
                Ok(rec) => ApiResponse::success(rec, "上班打卡成功"),
                Err(e) => {
                    tracing::error!("上班打卡更新失败: {}", e);
                    ApiResponse::from(TopemsError::Internal("上班打卡失败".to_string()))
                }
            }
        }
        Ok(None) => {
            let id = Uuid::new_v4();
            let result = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
                "hrm",
                r#"INSERT INTO hrm.attendance_records (
                       id, tenant_id, organization_id, employee_id, date, check_in_time, check_out_time,
                       status, work_hours, notes, created_at, updated_at
                   ) VALUES ($1, $2, $2, $3, $4, $5::TIME, NULL, 'active', NULL, NULL, $6, $6)
                   RETURNING id, tenant_id, employee_id, date::timestamptz AS date,
                             check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
                             status, work_hours::float8 AS work_hours, notes, created_at, updated_at"#
            ))
            .bind(id)
            .bind(org_id)
            .bind(employee_id)
            .bind(now)
            .bind(now)
            .bind(now)
            .fetch_one(&mut **txn)
            .await;
            match result {
                Ok(rec) => ApiResponse::success(rec, "上班打卡成功"),
                Err(e) => {
                    tracing::error!("上班打卡创建失败: {}", e);
                    ApiResponse::from(TopemsError::Internal("上班打卡失败".to_string()))
                }
            }
        }
        Err(e) => {
            tracing::error!("查询当天考勤失败: {}", e);
            ApiResponse::from(TopemsError::Internal("上班打卡失败".to_string()))
        }
    }
}

/// POST /attendance/check-out —— 移动端打卡下班（更新当天记录，计算工时）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["hrm:write"])),
    path = "/hrm/attendance/check-out",
    tag = "HRM",
    responses(
        (status = 200, description = "打卡成功", body = ApiResponse<AttendanceRecord>),
        (status = 404, description = "当天无打卡记录"),
    ),
)]
pub async fn check_out(
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
    Json(req): Json<CheckRequest>,
) -> ApiResponse<AttendanceRecord> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let employee_id =
        match resolve_employee_id_from_req(txn, req.user_id.as_deref(), req.employee_id).await {
            Ok(Some(eid)) => eid,
            Ok(None) => {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "员工ID不能为空".to_string(),
                ))
            }
            Err(msg) => {
                tracing::error!("解析员工信息失败: {}", msg);
                return ApiResponse::from(TopemsError::Internal("解析员工信息失败".to_string()));
            }
        };
    let now = Utc::now();

    let existing = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
        "hrm",
        r#"SELECT id, tenant_id, employee_id, date::timestamptz AS date,
                  check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
                  status, work_hours::float8 AS work_hours, notes, created_at, updated_at
           FROM hrm.attendance_records
           WHERE employee_id = $1 AND date::date = CURRENT_DATE
           ORDER BY created_at DESC LIMIT 1"#
    ))
    .bind(employee_id)
    .fetch_optional(&mut **txn)
    .await;

    let record = match existing {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound(
                "当天无上班打卡记录，请先打卡上班".to_string(),
            ))
        }
        Err(e) => {
            tracing::error!("查询当天考勤失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("下班打卡失败".to_string()));
        }
    };

    let result = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
        "hrm",
        r#"UPDATE hrm.attendance_records
           SET check_out_time = $2::TIME,
               work_hours = EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600.0,
               updated_at = now()
           WHERE id = $1
           RETURNING id, tenant_id, employee_id, date::timestamptz AS date,
                     check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
                     status, work_hours::float8 AS work_hours, notes, created_at, updated_at"#
    ))
    .bind(record.id)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(rec) => ApiResponse::success(rec, "下班打卡成功"),
        Err(e) => {
            tracing::error!("下班打卡更新失败: {}", e);
            ApiResponse::from(TopemsError::Internal("下班打卡失败".to_string()))
        }
    }
}

// ============ 考勤统计（前端 MobileAttendancePage 契约 /attendance/stats） ============

#[utoipa::path(
    get,
    security(("BearerAuth" = ["hrm:attendance:read"])),
    path = "/attendance/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "attendance"
)]
pub async fn get_attendance_stats(
    State(_state): State<ApiState>,
    Query(params): Query<TodayStatusParams>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");

    // user_id -> employee_id 解析（与 today-status 同口径）
    let resolved_employee_id = if let Some(uid) = params.user_id.as_deref() {
        match sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM hrm.employees WHERE user_id = $1::uuid AND deleted_at IS NULL LIMIT 1",
        )
        .bind(uid)
        .fetch_optional(&mut **txn)
        .await
        {
            Ok(Some(eid)) => Some(eid),
            Ok(None) => {
                tracing::warn!("未找到 user_id={} 对应的 employee_id", uid);
                None
            }
            Err(e) => {
                tracing::error!("解析 user_id 为 employee_id 失败: {}", e);
                return ApiResponse::<serde_json::Value>::server_error("解析用户信息失败");
            }
        }
    } else {
        params.employee_id
    };

    let eid = match resolved_employee_id {
        Some(eid) => eid,
        None => {
            return ApiResponse::success(
                serde_json::json!({
                    "today_status": "not_checked_in",
                    "work_days_this_month": 0,
                    "late_days_this_month": 0,
                    "early_leave_days": 0,
                    "absent_days": 0,
                    "total_work_hours": 0,
                }),
                "未找到对应员工，返回空统计",
            );
        }
    };

    // 月度聚合（当月 attendance_records 明细）
    let agg = sqlx::query(
        r#"
        SELECT
            COUNT(*) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE))::int8 AS work_days,
            COUNT(*) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE) AND status = 'late')::int8 AS late_days,
            COUNT(*) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE) AND status = 'early_leave')::int8 AS early_leave_days,
            COALESCE(SUM(work_hours) FILTER (WHERE date >= date_trunc('month', CURRENT_DATE)), 0)::float8 AS total_work_hours
        FROM hrm.attendance_records
        WHERE employee_id = $1 AND date >= date_trunc('month', CURRENT_DATE)
        "#,
    )
    .bind(eid)
    .fetch_one(&mut **txn)
    .await;

    let (work_days, late_days, early_leave_days, total_work_hours) = match agg {
        Ok(row) => (
            row.get::<i64, _>("work_days"),
            row.get::<i64, _>("late_days"),
            row.get::<i64, _>("early_leave_days"),
            row.get::<f64, _>("total_work_hours"),
        ),
        Err(e) => {
            tracing::error!("获取考勤统计失败: {}", e);
            return ApiResponse::<serde_json::Value>::server_error("获取考勤统计失败");
        }
    };

    // 今日状态（当天是否有打卡记录）
    let today = sqlx::query(
        r#"
        SELECT check_in_time, check_out_time
        FROM hrm.attendance_records
        WHERE employee_id = $1 AND date::date = CURRENT_DATE
        ORDER BY date DESC
        LIMIT 1
        "#,
    )
    .bind(eid)
    .fetch_optional(&mut **txn)
    .await;

    let (today_status, today_check_in, today_check_out) = match today {
        Ok(Some(row)) => {
            let ci: Option<chrono::NaiveTime> = row.get("check_in_time");
            let co: Option<chrono::NaiveTime> = row.get("check_out_time");
            let status = if co.is_some() {
                "checked_out"
            } else if ci.is_some() {
                "checked_in"
            } else {
                "not_checked_in"
            };
            (
                status,
                ci.map(|t| t.format("%H:%M:%S").to_string()),
                co.map(|t| t.format("%H:%M:%S").to_string()),
            )
        }
        Ok(None) => ("not_checked_in", None, None),
        Err(e) => {
            tracing::error!("获取今日考勤状态失败: {}", e);
            return ApiResponse::<serde_json::Value>::server_error("获取今日考勤状态失败");
        }
    };

    // 当月应出勤工作日估算（周一~周五，不扣除法定节假日）
    let now = chrono::Local::now();
    let month_start = chrono::NaiveDate::from_ymd_opt(now.year(), now.month(), 1)
        .unwrap_or_else(|| now.date_naive());
    let month_len = month_start
        .checked_add_months(chrono::Months::new(1))
        .map(|m| m - chrono::Duration::days(1))
        .unwrap_or(month_start);
    let mut expect_days: i64 = 0;
    let mut d = month_start;
    while d <= month_len {
        let dow = d.weekday();
        if dow != chrono::Weekday::Sat && dow != chrono::Weekday::Sun {
            expect_days += 1;
        }
        d += chrono::Duration::days(1);
    }
    let absent_days = (expect_days - work_days).max(0);

    ApiResponse::success(
        serde_json::json!({
            "today_status": today_status,
            "today_check_in": today_check_in,
            "today_check_out": today_check_out,
            "work_days_this_month": work_days,
            "late_days_this_month": late_days,
            "early_leave_days": early_leave_days,
            "absent_days": absent_days,
            "total_work_hours": total_work_hours,
        }),
        "获取考勤统计成功",
    )
}
