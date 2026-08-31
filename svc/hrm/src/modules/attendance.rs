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

async fn get_today_status(
    State(state): State<ApiState>,
    Query(params): Query<TodayStatusParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    // [2026-08-31] 数据迁移已完成：user_id 分支原直读 mobile.mobile_attendance（跨 schema 违规），
    // 现统一走 hrm 自有表——user_id 先经 hrm.employees 映射为 employee_id，再查 hrm.attendance_records；
    // mobile.mobile_attendance 数据 0 行，跨 schema 直读已清除（见白名单复核）。
    let user_id = params.user_id.as_deref();
    let employee_id = params.employee_id;

    if user_id.is_none() && employee_id.is_none() {
        return Json(ApiResponse::<serde_json::Value>::error(
            400,
            "user_id 或 employee_id 至少提供一个",
        ));
    }

    // 解析 employee_id：优先显式传参；否则 user_id → hrm.employees.id 映射
    // （原 user_id 分支直读 mobile.mobile_attendance，跨 schema 违规；数据迁移已完成，
    //   mobile_attendance 0 行，统一走 hrm 自有表）
    let employee_id = if let Some(eid) = employee_id {
        Some(eid)
    } else if let Some(uid) = user_id {
        match sqlx::query_scalar::<_, Uuid>(only_own_schema_query!(
            "hrm",
            "SELECT id FROM hrm.employees WHERE user_id = $1"
        ))
        .bind(uid)
        .fetch_optional(&state.db)
        .await
        {
            Ok(mapped) => mapped,
            Err(e) => {
                tracing::error!("解析 user_id 到员工失败: {}", e);
                return Json(ApiResponse::<serde_json::Value>::error(
                    500,
                    "获取今日考勤状态失败",
                ));
            }
        }
    } else {
        None
    };

    let status = match employee_id {
        Some(eid) => {
            let result = sqlx::query(only_own_schema_query!(
                "hrm",
                r#"
                SELECT check_in_time, check_out_time
                FROM hrm.attendance_records
                WHERE employee_id = $1 AND date::date = CURRENT_DATE
                ORDER BY date DESC
                LIMIT 1
                "#
            ))
            .bind(eid)
            .fetch_optional(&state.db)
            .await;
            match result {
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
            }
        }
        None => "not_checked_in",
    };

    Json(ApiResponse::success(
        serde_json::json!({ "status": status }),
        "获取今日考勤状态成功",
    ))
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct AttendancePaginationParams {
    pub page: Option<i64>,
    #[serde(alias = "pagesize")]
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
        ("pagesize" = Option<i64>, Query, description = "每页大小"),
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
async fn list_attendance(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AttendancePaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
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
    .fetch_all(&state.db)
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
            .fetch_one(&state.db)
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
async fn create_attendance(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateAttendanceRequest>,
) -> Json<ApiResponse<AttendanceRecord>> {
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
    .fetch_one(&state.db)
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
async fn get_attendance(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AttendanceRecord>> {
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
    .fetch_optional(&state.db)
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
async fn update_attendance(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAttendanceRequest>,
) -> Json<ApiResponse<AttendanceRecord>> {
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
    .fetch_optional(&state.db)
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(record) => Json(ApiResponse::success(record, "考勤记录更新成功")),
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
async fn delete_attendance(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query(only_own_schema_query!(
        "hrm",
        "UPDATE hrm.attendance_records SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&state.db)
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
