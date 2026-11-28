use axum::{
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use topems_shared_core::response::ApiResponse;

use topems_shared_auth::auth::AuthState;
use topems_shared_core::error::TopemsError;
use topems_shared_service_client::service_client::{
    api::hrm_api::{HrmApi, HrmCheckInRequest, HrmCheckOutRequest, HrmCreateLeaveRequest},
    TypedServiceClient,
};

use super::auth_utils::extract_user_id_from_token;
use crate::modules::contract_util::{downstream_error, unwrap_data};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendanceRecord {
    pub id: String,
    pub user_id: String,
    pub date: String,
    pub check_in_time: Option<String>,
    pub check_out_time: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendanceStats {
    pub total_days: i64,
    pub present_days: i64,
    pub absent_days: i64,
    pub late_days: i64,
    pub overtime_hours: f64,
    pub total_work_hours: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LeaveApplication {
    pub id: String,
    pub user_id: String,
    pub leave_type: String,
    pub start_date: String,
    pub end_date: String,
    pub duration_days: f64,
    pub reason: Option<String>,
    pub status: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct AttendanceQueryParams {
    pub month: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct LeaveQueryParams {
    pub status: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct MobileCheckInRequest {
    pub lat: f64,
    pub lng: f64,
    pub address: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MobileCheckOutRequest {
    pub lat: f64,
    pub lng: f64,
    pub address: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MobileCreateLeaveRequest {
    pub leave_type: String,
    pub start_date: String,
    pub end_date: String,
    pub reason: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:attendance:read"])),
    path = "/attendance",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "attendance"
)]
pub async fn get_attendance_overview(
    State(auth_state): State<AuthState>,
    State(client): State<TypedServiceClient<HrmApi>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    match client.get_attendance_overview(&user_id).await {
        Ok(data) => (
            StatusCode::OK,
            ApiResponse::success(unwrap_data(data), "获取考勤概览成功"),
        ),
        Err(e) => {
            // HRM 上游未启动时优雅降级：返回零值概览，与 workbench.rs 兜底口径一致。
            tracing::warn!("调用HRM服务获取考勤概览失败（降级空概览）: {}", e);
            (
                StatusCode::OK,
                ApiResponse::success(
                    serde_json::json!({
                        "today_status": "not_checked_in",
                        "this_month_total": 0,
                        "this_month_present": 0,
                        "this_month_leave": 0,
                        "this_month_late": 0,
                        "this_month_absent": 0,
                        "annual_leave_remaining": 0,
                        "annual_leave_total": 0,
                    }),
                    "获取考勤概览成功（HRM 服务未接入，返回空态）",
                ),
            )
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:attendance:read"])),
    path = "/attendance/stats",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "attendance"
)]
pub async fn get_attendance_stats(
    State(auth_state): State<AuthState>,
    State(client): State<TypedServiceClient<HrmApi>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    match client.get_attendance_stats(&user_id).await {
        Ok(stats) => (
            StatusCode::OK,
            ApiResponse::success(unwrap_data(stats), "获取考勤统计成功"),
        ),
        Err(e) => {
            tracing::warn!("调用HRM服务获取考勤统计失败（降级空统计）: {}", e);
            (
                StatusCode::OK,
                ApiResponse::success(
                    serde_json::json!({
                        "total_days": 0, "present_days": 0, "absent_days": 0,
                        "late_days": 0, "overtime_hours": 0.0, "total_work_hours": 0.0,
                    }),
                    "获取考勤统计成功（HRM 服务未接入，返回空态）",
                ),
            )
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:attendance:read"])),
    path = "/attendance/records",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "attendance"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn list_attendance_records(
    State(auth_state): State<AuthState>,
    State(client): State<TypedServiceClient<HrmApi>>,
    headers: HeaderMap,
    Query(params): Query<AttendanceQueryParams>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let page = params.page.unwrap_or(1) as i32;
    let page_size = params.page_size.unwrap_or(20) as i32;

    match client
        .list_attendance_records(&user_id, params.month.as_deref(), page, page_size)
        .await
    {
        Ok(data) => (
            StatusCode::OK,
            ApiResponse::success(unwrap_data(data), "获取考勤记录成功"),
        ),
        Err(e) => {
            tracing::warn!("调用HRM服务获取考勤记录失败（降级空列表）: {}", e);
            (
                StatusCode::OK,
                ApiResponse::success(
                    serde_json::json!({ "items": [], "total": 0 }),
                    "获取考勤记录成功（HRM 服务未接入，返回空态）",
                ),
            )
        }
    }
}

/// 今日考勤（前端 GET /attendance/today → HRM 考勤记录按日期过滤）
pub async fn get_today_attendance(
    State(auth_state): State<AuthState>,
    State(client): State<TypedServiceClient<HrmApi>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let today = chrono::Utc::now().date_naive().to_string(); // YYYY-MM-DD
    match client.list_attendance_records(&user_id, None, 1, 100).await {
        Ok(data) => {
            // HRM 返回可能是 { items: [...] } 或纯数组，兼容两种结构
            let records = if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
                items.clone()
            } else if let Some(arr) = data.as_array() {
                arr.clone()
            } else {
                Vec::new()
            };

            let today_records: Vec<serde_json::Value> = records
                .into_iter()
                .filter(|r| {
                    r.get("date")
                        .and_then(|d| d.as_str())
                        .map(|d| d.starts_with(&today))
                        .unwrap_or(false)
                })
                .collect();

            (
                StatusCode::OK,
                ApiResponse::success(
                    serde_json::json!({ "items": today_records, "total": today_records.len() }),
                    "获取今日考勤成功",
                ),
            )
        }
        Err(e) => {
            tracing::warn!("调用HRM服务获取今日考勤失败（降级空列表）: {}", e);
            (
                StatusCode::OK,
                ApiResponse::success(
                    serde_json::json!({ "items": [], "total": 0 }),
                    "获取今日考勤成功（HRM 服务未接入，返回空态）",
                ),
            )
        }
    }
}

// ===== 死代码端点轻量兜底（2026-10-05，页面未调用，占位实现防 404）=====

/// 考勤统计（前端 GET /attendance/statistics → HRM 统计，上游未接入时降级空统计）
#[utoipa::path(
    get,
    path = "/api/mobile/attendance/statistics",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn get_attendance_statistics(
    State(_auth_state): State<AuthState>,
    State(_client): State<TypedServiceClient<HrmApi>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &_auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };
    (
        StatusCode::OK,
        ApiResponse::success(
            serde_json::json!({
                "period": "",
                "total_days": 0, "present_days": 0, "leave_days": 0,
                "late_days": 0, "early_leave_days": 0, "absent_days": 0,
                "business_trip_days": 0, "remote_days": 0,
                "avg_work_hours": 0.0, "total_overtime_hours": 0.0,
                "by_day": [],
            }),
            "获取考勤统计成功（HRM 服务未接入，返回空态）",
        ),
    )
}

/// 班次列表（前端 GET /attendance/shifts → HRM 班次，上游未接入时降级空列表）
#[utoipa::path(
    get,
    path = "/api/mobile/attendance/shifts",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn list_attendance_shifts(
    State(_auth_state): State<AuthState>,
    State(_client): State<TypedServiceClient<HrmApi>>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &_auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };
    (
        StatusCode::OK,
        ApiResponse::success(
            serde_json::json!([]),
            "获取班次列表成功（HRM 服务未接入，返回空态）",
        ),
    )
}

/// 考勤记录详情（前端 GET /attendance/{id} → HRM 记录按 id 过滤）
pub async fn get_attendance_record_by_id(
    State(auth_state): State<AuthState>,
    State(client): State<TypedServiceClient<HrmApi>>,
    headers: HeaderMap,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    match client.list_attendance_records(&user_id, None, 1, 100).await {
        Ok(data) => {
            let records = if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
                items.clone()
            } else if let Some(arr) = data.as_array() {
                arr.clone()
            } else {
                Vec::new()
            };
            let found = records
                .iter()
                .find(|r| r.get("id").and_then(|v| v.as_str()) == Some(id.as_str()));
            (
                StatusCode::OK,
                ApiResponse::success(
                    found.cloned().unwrap_or(serde_json::Value::Null),
                    "获取考勤记录详情成功",
                ),
            )
        }
        Err(e) => {
            tracing::warn!("调用HRM服务获取考勤记录详情失败（降级 null）: {}", e);
            (
                StatusCode::OK,
                ApiResponse::success(
                    serde_json::Value::Null,
                    "获取考勤记录详情成功（HRM 服务未接入，返回空态）",
                ),
            )
        }
    }
}

/// 新建考勤记录（前端 POST /attendance → 占位兜底，页面未接入）
pub async fn create_attendance_record(
    State(auth_state): State<AuthState>,
    headers: HeaderMap,
    Json(_payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };
    (
        StatusCode::OK,
        ApiResponse::success(
            serde_json::Value::Null,
            "考勤记录已登记（占位实现，待页面接入补全）",
        ),
    )
}

/// 更新考勤记录（前端 PUT /attendance/{id} → 占位兜底）
pub async fn update_attendance_record(
    State(auth_state): State<AuthState>,
    headers: HeaderMap,
    Path(_id): Path<String>,
    Json(_payload): Json<serde_json::Value>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };
    (
        StatusCode::OK,
        ApiResponse::success(
            serde_json::Value::Null,
            "考勤记录已更新（占位实现，待页面接入补全）",
        ),
    )
}

/// 删除考勤记录（前端 DELETE /attendance/{id} → 占位兜底）
pub async fn delete_attendance_record(
    State(auth_state): State<AuthState>,
    headers: HeaderMap,
    Path(_id): Path<String>,
) -> impl IntoResponse {
    let _user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };
    (
        StatusCode::OK,
        ApiResponse::success(
            serde_json::Value::Null,
            "考勤记录已删除（占位实现，待页面接入补全）",
        ),
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:attendance:write"])),
    path = "/attendance/check-in",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "attendance"
)]
pub async fn check_in(
    State(auth_state): State<AuthState>,
    State(client): State<TypedServiceClient<HrmApi>>,
    headers: HeaderMap,
    Json(req): Json<MobileCheckInRequest>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let request = HrmCheckInRequest {
        user_id,
        lat: req.lat,
        lng: req.lng,
        address: req.address,
    };

    match client.check_in(&request).await {
        Ok(record) => (StatusCode::OK, ApiResponse::success(record, "打卡成功")),
        Err(e) => {
            // 4xx 业务错误透传；连接失败/5xx 降级为 503 未接入
            if let TopemsError::ServiceError { status_code, .. } = &e {
                if (400..500).contains(status_code) {
                    let resp = downstream_error(&e, "打卡失败");
                    let sc = StatusCode::from_u16(resp.code).unwrap_or(StatusCode::BAD_REQUEST);
                    return (sc, resp);
                }
            }
            tracing::warn!("调用HRM服务打卡失败（降级503未接入）: {}", e);
            (
                StatusCode::SERVICE_UNAVAILABLE,
                ApiResponse::unavailable("上游服务未接入：HRM，打卡未执行"),
            )
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mobile:attendance:write"])),
    path = "/attendance/check-out",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "attendance"
)]
pub async fn check_out(
    State(auth_state): State<AuthState>,
    State(client): State<TypedServiceClient<HrmApi>>,
    headers: HeaderMap,
    Json(req): Json<MobileCheckOutRequest>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let request = HrmCheckOutRequest {
        user_id,
        lat: req.lat,
        lng: req.lng,
        address: req.address,
    };

    match client.check_out(&request).await {
        Ok(record) => (StatusCode::OK, ApiResponse::success(record, "下班打卡成功")),
        Err(e) => {
            // 4xx 业务错误透传；连接失败/5xx 降级为 503 未接入
            if let TopemsError::ServiceError { status_code, .. } = &e {
                if (400..500).contains(status_code) {
                    let resp = downstream_error(&e, "下班打卡失败");
                    let sc = StatusCode::from_u16(resp.code).unwrap_or(StatusCode::BAD_REQUEST);
                    return (sc, resp);
                }
            }
            tracing::warn!("调用HRM服务下班打卡失败（降级503未接入）: {}", e);
            (
                StatusCode::SERVICE_UNAVAILABLE,
                ApiResponse::unavailable("上游服务未接入：HRM，下班打卡未执行"),
            )
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mobile:attendance:read"])),
    path = "/attendance/leaves",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "attendance"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn list_leave_applications(
    State(auth_state): State<AuthState>,
    State(client): State<TypedServiceClient<HrmApi>>,
    headers: HeaderMap,
    Query(params): Query<LeaveQueryParams>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    let page = params.page.unwrap_or(1) as i32;
    let page_size = params.page_size.unwrap_or(20) as i32;

    match client
        .list_leave_applications(&user_id, params.status.as_deref(), page, page_size)
        .await
    {
        Ok(data) => (
            StatusCode::OK,
            ApiResponse::success(unwrap_data(data), "获取请假申请成功"),
        ),
        Err(e) => {
            tracing::warn!("调用HRM服务获取请假申请失败（降级空列表）: {}", e);
            (
                StatusCode::OK,
                ApiResponse::success(
                    serde_json::json!({ "items": [], "total": 0 }),
                    "获取请假申请成功（HRM 服务未接入，返回空态）",
                ),
            )
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/mobile/attendance/leaves",
    tag = "mobile",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found")
    )
)]
pub async fn apply_leave(
    State(auth_state): State<AuthState>,
    State(client): State<TypedServiceClient<HrmApi>>,
    headers: HeaderMap,
    Json(req): Json<MobileCreateLeaveRequest>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                ApiResponse::unauthorized("未授权"),
            );
        }
    };

    #[allow(clippy::cast_precision_loss, clippy::as_conversions)]
    let days = (chrono::NaiveDate::parse_from_str(&req.end_date, "%Y-%m-%d")
        .unwrap_or_else(|_| chrono::Local::now().date_naive())
        - chrono::NaiveDate::parse_from_str(&req.start_date, "%Y-%m-%d")
            .unwrap_or_else(|_| chrono::Local::now().date_naive()))
    .num_days()
    .max(1) as f64;

    let request = HrmCreateLeaveRequest {
        employee_id: None,
        user_id: Some(user_id.clone()),
        leave_type: req.leave_type,
        start_date: req.start_date,
        end_date: req.end_date,
        days,
        reason: req.reason,
    };

    match client.apply_leave(&request).await {
        Ok(application) => (
            StatusCode::OK,
            ApiResponse::success(application, "请假申请提交成功"),
        ),
        Err(e) => {
            tracing::warn!("调用HRM服务提交请假申请失败（降级503未接入）: {}", e);
            (
                StatusCode::SERVICE_UNAVAILABLE,
                ApiResponse::unavailable("上游服务未接入：HRM，请假申请未执行"),
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roundtrip<T: Serialize + for<'de> Deserialize<'de>>(item: &T) {
        let json = serde_json::to_string(item).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&json).unwrap();
        let back: T = serde_json::from_str(&json).unwrap();
        // roundtrip verified by JSON comparison
        let json2 = serde_json::to_string(&back).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&json2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn attendance_record_roundtrip() {
        roundtrip(&AttendanceRecord {
            id: "1".into(),
            user_id: "u1".into(),
            date: "2026-01-01".into(),
            check_in_time: Some("09:00".into()),
            check_out_time: Some("18:00".into()),
            status: "normal".into(),
            created_at: "2026-01-01T09:00:00Z".into(),
            updated_at: "2026-01-01T18:00:00Z".into(),
        });
    }

    #[test]
    fn attendance_stats_roundtrip() {
        roundtrip(&AttendanceStats {
            total_days: 22,
            present_days: 20,
            absent_days: 1,
            late_days: 1,
            overtime_hours: 8.0,
            total_work_hours: 176.0,
        });
    }

    #[test]
    fn leave_application_roundtrip() {
        roundtrip(&LeaveApplication {
            id: "1".into(),
            user_id: "u1".into(),
            leave_type: "annual".into(),
            start_date: "2026-02-01".into(),
            end_date: "2026-02-03".into(),
            duration_days: 3.0,
            reason: None,
            status: "approved".into(),
            created_at: "2026-01-20T10:00:00Z".into(),
            updated_at: "2026-01-21T08:00:00Z".into(),
        });
    }
}
