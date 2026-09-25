use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::{AttendanceRecord, CreateAttendanceRequest, UpdateAttendanceRequest};
use crate::modules::audit::log_audit_event;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/attendance", get(list_attendance).post(create_attendance))
        .route("/attendance/today-status", get(get_today_status))
        .route("/attendance/check-in", post(check_in))
        .route("/attendance/check-out", post(check_out))
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
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let user_id = params.user_id.as_deref();
    let employee_id = params.employee_id;

    if user_id.is_none() && employee_id.is_none() {
        return Json(ApiResponse::<serde_json::Value>::error(
            400,
            "user_id 或 employee_id 至少提供一个",
        ));
    }

    // 如果传入 user_id，先解析为 employee_id（Mobile-BFF 数据迁移后统一走 hrm 表）
    let resolved_employee_id = if let Some(uid) = user_id {
        match sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM hrm.employees WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1",
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
                return Json(ApiResponse::<serde_json::Value>::error(
                    500,
                    "解析用户信息失败",
                ));
            }
        }
    } else {
        employee_id
    };

    let eid = match resolved_employee_id {
        Some(eid) => eid,
        None => {
            return Json(ApiResponse::success(
                serde_json::json!({ "status": "not_checked_in" }),
                "未找到对应员工，默认未签到",
            ));
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
            return Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取今日考勤状态失败",
            ));
        }
    };

    Json(ApiResponse::success(
        serde_json::json!({ "status": status }),
        "获取今日考勤状态成功",
    ))
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
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
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
        SELECT id, organization_id AS tenant_id, employee_id, date::timestamptz AS date,
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

            Json(ApiResponse::success(
                serde_json::json!({
                    "records": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取考勤记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取考勤记录列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取考勤记录列表失败",
            ))
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
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateAttendanceRequest>,
) -> Json<ApiResponse<AttendanceRecord>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if req.employee_id.is_nil() {
        return Json(api_error(400, "员工ID不能为空"));
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
            id, organization_id, tenant_id, employee_id, date, check_in_time, check_out_time,
            status, work_hours, notes, created_at, updated_at
        ) VALUES ($1, $2, $2, $3, $4, $5::TIME, $6::TIME, $7, $8, $9, $10, $11)
        RETURNING id, organization_id AS tenant_id, employee_id, date::timestamptz AS date,
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
            Json(ApiResponse::success(record.clone(), "考勤记录创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建考勤记录失败: {}", e);
            (
                Json(api_error(500, "考勤记录创建失败")),
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
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<AttendanceRecord>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, organization_id AS tenant_id, employee_id, date::timestamptz AS date,
               check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
               status, work_hours::float8 AS work_hours, notes, created_at, updated_at
        FROM hrm.attendance_records WHERE deleted_at IS NULL AND id = $1
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(record)) => Json(ApiResponse::success(record, "获取考勤记录成功")),
        Ok(None) => Json(ApiResponse::<AttendanceRecord>::error(
            404,
            "考勤记录不存在",
        )),
        Err(e) => {
            tracing::error!("获取考勤记录失败: {}", e);
            Json(ApiResponse::<AttendanceRecord>::error(
                500,
                "获取考勤记录失败",
            ))
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
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateAttendanceRequest>,
) -> Json<ApiResponse<AttendanceRecord>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let existing = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
        "hrm",
        r#"
        SELECT id, organization_id AS tenant_id, employee_id, date::timestamptz AS date,
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
        Ok(None) => {
            return Json(ApiResponse::<AttendanceRecord>::error(
                404,
                "考勤记录不存在",
            ))
        }
        Err(_e) => {
            return Json(ApiResponse::<AttendanceRecord>::error(
                500,
                "查询考勤记录失败",
            ))
        }
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
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, organization_id AS tenant_id, employee_id, date::timestamptz AS date,
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
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(record, "考勤记录更新成功"))
        }
        Err(e) => {
            tracing::error!("更新考勤记录失败: {}", e);
            Json(ApiResponse::<AttendanceRecord>::error(
                500,
                "考勤记录更新失败",
            ))
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
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
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
            Json(ApiResponse::success("".to_string(), "考勤记录删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "考勤记录不存在")),
            "error".to_string(),
            Some("考勤记录不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除考勤记录失败: {}", e);
            (
                Json(api_error(500, "考勤记录删除失败")),
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
    pub employee_id: Uuid,
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
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CheckRequest>,
) -> Json<ApiResponse<AttendanceRecord>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if req.employee_id.is_nil() {
        return Json(api_error(400, "员工ID不能为空"));
    }
    let now = Utc::now();
    let org_id = claims
        .tenant_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .unwrap_or(Uuid::nil());

    let existing = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
        "hrm",
        r#"SELECT id, organization_id AS tenant_id, employee_id, date::timestamptz AS date,
                  check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
                  status, work_hours::float8 AS work_hours, notes, created_at, updated_at
           FROM hrm.attendance_records
           WHERE employee_id = $1 AND date::date = CURRENT_DATE
           ORDER BY created_at DESC LIMIT 1"#
    ))
    .bind(req.employee_id)
    .fetch_optional(&mut **txn)
    .await;

    match existing {
        Ok(Some(record)) => {
            let result = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
                "hrm",
                r#"UPDATE hrm.attendance_records
                   SET check_in_time = $2::TIME, status = COALESCE(status, 'present'), updated_at = now()
                   WHERE id = $1
                   RETURNING id, organization_id AS tenant_id, employee_id, date::timestamptz AS date,
                             check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
                             status, work_hours::float8 AS work_hours, notes, created_at, updated_at"#
            ))
            .bind(record.id)
            .bind(now)
            .fetch_one(&mut **txn)
            .await;
            match result {
                Ok(rec) => Json(ApiResponse::success(rec, "上班打卡成功")),
                Err(e) => {
                    tracing::error!("上班打卡更新失败: {}", e);
                    Json(api_error(500, "上班打卡失败"))
                }
            }
        }
        Ok(None) => {
            let id = Uuid::new_v4();
            let result = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
                "hrm",
                r#"INSERT INTO hrm.attendance_records (
                       id, organization_id, tenant_id, employee_id, date, check_in_time, check_out_time,
                       status, work_hours, notes, created_at, updated_at
                   ) VALUES ($1, $2, $2, $3, $4, $5::TIME, NULL, 'present', NULL, NULL, $6, $6)
                   RETURNING id, organization_id AS tenant_id, employee_id, date::timestamptz AS date,
                             check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
                             status, work_hours::float8 AS work_hours, notes, created_at, updated_at"#
            ))
            .bind(id)
            .bind(org_id)
            .bind(req.employee_id)
            .bind(now)
            .bind(now)
            .bind(now)
            .fetch_one(&mut **txn)
            .await;
            match result {
                Ok(rec) => Json(ApiResponse::success(rec, "上班打卡成功")),
                Err(e) => {
                    tracing::error!("上班打卡创建失败: {}", e);
                    Json(api_error(500, "上班打卡失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("查询当天考勤失败: {}", e);
            Json(api_error(500, "上班打卡失败"))
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
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CheckRequest>,
) -> Json<ApiResponse<AttendanceRecord>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if req.employee_id.is_nil() {
        return Json(api_error(400, "员工ID不能为空"));
    }
    let now = Utc::now();

    let existing = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
        "hrm",
        r#"SELECT id, organization_id AS tenant_id, employee_id, date::timestamptz AS date,
                  check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
                  status, work_hours::float8 AS work_hours, notes, created_at, updated_at
           FROM hrm.attendance_records
           WHERE employee_id = $1 AND date::date = CURRENT_DATE
           ORDER BY created_at DESC LIMIT 1"#
    ))
    .bind(req.employee_id)
    .fetch_optional(&mut **txn)
    .await;

    let record = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "当天无上班打卡记录，请先打卡上班")),
        Err(e) => {
            tracing::error!("查询当天考勤失败: {}", e);
            return Json(api_error(500, "下班打卡失败"));
        }
    };

    let result = sqlx::query_as::<_, AttendanceRecord>(only_own_schema_query!(
        "hrm",
        r#"UPDATE hrm.attendance_records
           SET check_out_time = $2::TIME,
               work_hours = EXTRACT(EPOCH FROM (check_out_time - check_in_time)) / 3600.0,
               updated_at = now()
           WHERE id = $1
           RETURNING id, organization_id AS tenant_id, employee_id, date::timestamptz AS date,
                     check_in_time::TEXT AS check_in, check_out_time::TEXT AS check_out,
                     status, work_hours::float8 AS work_hours, notes, created_at, updated_at"#
    ))
    .bind(record.id)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(rec) => Json(ApiResponse::success(rec, "下班打卡成功")),
        Err(e) => {
            tracing::error!("下班打卡更新失败: {}", e);
            Json(api_error(500, "下班打卡失败"))
        }
    }
}
