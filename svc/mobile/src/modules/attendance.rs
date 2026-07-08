use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgPool, Row};
use topems_shared::{ApiResponse, AuthState};

use super::auth_utils::extract_user_id_from_token;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttendanceRecord {
    pub id: String,
    pub user_id: String,
    pub date: String,
    pub check_in_time: Option<String>,
    pub check_out_time: Option<String>,
    pub check_in_lat: Option<f64>,
    pub check_in_lng: Option<f64>,
    pub check_in_address: Option<String>,
    pub check_out_lat: Option<f64>,
    pub check_out_lng: Option<f64>,
    pub check_out_address: Option<String>,
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
    pub early_leave_days: i64,
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
    pub pagesize: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct LeaveQueryParams {
    pub status: Option<String>,
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CheckInRequest {
    pub lat: f64,
    pub lng: f64,
    pub address: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CheckOutRequest {
    pub lat: f64,
    pub lng: f64,
    pub address: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateLeaveRequest {
    pub leave_type: String,
    pub start_date: String,
    pub end_date: String,
    pub reason: Option<String>,
}

pub async fn get_attendance_overview(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let today = Utc::now().date_naive().to_string();

    let today_record = sqlx::query(
        r#"
        SELECT check_in_time, check_out_time, status
        FROM mobile_attendance
        WHERE user_id = $1 AND date = $2
        ORDER BY created_at DESC LIMIT 1
        "#,
    )
    .bind(&user_id)
    .bind(&today)
    .fetch_optional(&pool)
    .await;

    let (check_in_time, check_out_time, status) = match today_record {
        Ok(Some(row)) => (
            row.get::<Option<String>, _>("check_in_time"),
            row.get::<Option<String>, _>("check_out_time"),
            row.get::<String, _>("status"),
        ),
        _ => (None, None, "not_checked_in".to_string()),
    };

    let pending_leaves = sqlx::query_scalar(
        "SELECT COUNT(*) FROM mobile_leave_applications WHERE user_id = $1 AND status = 'pending'",
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await
    .unwrap_or(0);

    (
        StatusCode::OK,
        Json(ApiResponse::success(
            serde_json::json!({
                "today": {
                    "date": today,
                    "check_in_time": check_in_time,
                    "check_out_time": check_out_time,
                    "status": status
                },
                "pending_leaves": pending_leaves
            }),
            "获取考勤概览成功",
        )),
    )
}

pub async fn get_attendance_stats(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let result = sqlx::query(
        r#"
        SELECT 
            COUNT(*) as total_days,
            COUNT(*) FILTER (WHERE check_in_time IS NOT NULL) as present_days,
            COUNT(*) FILTER (WHERE check_in_time IS NULL) as absent_days,
            COUNT(*) FILTER (WHERE check_in_time > '09:00:00') as late_days,
            COUNT(*) FILTER (WHERE check_out_time < '18:00:00' AND check_out_time IS NOT NULL) as early_leave_days,
            COALESCE(SUM(CASE WHEN EXTRACT(EPOCH FROM (check_out_time::time - '18:00:00'::time)) > 0 THEN EXTRACT(EPOCH FROM (check_out_time::time - '18:00:00'::time)) / 3600 ELSE 0 END), 0) as overtime_hours,
            COALESCE(SUM(CASE WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL THEN EXTRACT(EPOCH FROM (check_out_time::time - check_in_time::time)) / 3600 ELSE 0 END), 0) as total_work_hours
        FROM mobile_attendance
        WHERE user_id = $1
        "#,
    )
    .bind(&user_id)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(row) => {
            let stats = AttendanceStats {
                total_days: row.get::<Option<i64>, _>("total_days").unwrap_or(0),
                present_days: row.get::<Option<i64>, _>("present_days").unwrap_or(0),
                absent_days: row.get::<Option<i64>, _>("absent_days").unwrap_or(0),
                late_days: row.get::<Option<i64>, _>("late_days").unwrap_or(0),
                early_leave_days: row.get::<Option<i64>, _>("early_leave_days").unwrap_or(0),
                overtime_hours: row.get::<Option<f64>, _>("overtime_hours").unwrap_or(0.0),
                total_work_hours: row.get::<Option<f64>, _>("total_work_hours").unwrap_or(0.0),
            };
            (
                StatusCode::OK,
                Json(ApiResponse::success(stats, "获取考勤统计成功")),
            )
        }
        Err(e) => {
            tracing::error!("获取考勤统计失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "获取考勤统计失败")),
            )
        }
    }
}

pub async fn list_attendance_records(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Query(params): Query<AttendanceQueryParams>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let month_filter = params.month.clone();

    let result = sqlx::query(
        r#"
        SELECT id, user_id, date, check_in_time, check_out_time,
               check_in_lat, check_in_lng, check_in_address,
               check_out_lat, check_out_lng, check_out_address,
               status, created_at, updated_at
        FROM mobile_attendance
        WHERE user_id = $1
          AND ($2::text IS NULL OR date LIKE $2 || '%')
        ORDER BY date DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&user_id)
    .bind(&month_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(rows) => {
            let records: Vec<AttendanceRecord> = rows
                .into_iter()
                .map(|row| AttendanceRecord {
                    id: row.get::<String, _>("id"),
                    user_id: row.get::<String, _>("user_id"),
                    date: row.get::<String, _>("date"),
                    check_in_time: row.get::<Option<String>, _>("check_in_time"),
                    check_out_time: row.get::<Option<String>, _>("check_out_time"),
                    check_in_lat: row.get::<Option<f64>, _>("check_in_lat"),
                    check_in_lng: row.get::<Option<f64>, _>("check_in_lng"),
                    check_in_address: row.get::<Option<String>, _>("check_in_address"),
                    check_out_lat: row.get::<Option<f64>, _>("check_out_lat"),
                    check_out_lng: row.get::<Option<f64>, _>("check_out_lng"),
                    check_out_address: row.get::<Option<String>, _>("check_out_address"),
                    status: row.get::<String, _>("status"),
                    created_at: row.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
                    updated_at: row.get::<DateTime<Utc>, _>("updated_at").to_rfc3339(),
                })
                .collect();

            let total = sqlx::query_scalar(
                r#"
                SELECT COUNT(*) FROM mobile_attendance
                WHERE user_id = $1
                  AND ($2::text IS NULL OR date LIKE $2 || '%')
                "#,
            )
            .bind(&user_id)
            .bind(&month_filter)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);

            (
                StatusCode::OK,
                Json(ApiResponse::success(
                    serde_json::json!({
                        "items": records,
                        "total": total,
                        "page": page,
                        "pagesize": page_size
                    }),
                    "获取考勤记录成功",
                )),
            )
        }
        Err(e) => {
            tracing::error!("获取考勤记录失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "获取考勤记录失败")),
            )
        }
    }
}

pub async fn check_in(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Json(req): Json<CheckInRequest>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let today = Utc::now().date_naive().to_string();
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        INSERT INTO mobile_attendance (id, user_id, date, check_in_time, 
                                       check_in_lat, check_in_lng, check_in_address, 
                                       status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'checked_in', $8, $9)
        ON CONFLICT (user_id, date) DO UPDATE SET
            check_in_time = $4, check_in_lat = $5, check_in_lng = $6,
            check_in_address = $7, status = 'checked_in', updated_at = $9
        RETURNING id, user_id, date, check_in_time, check_out_time,
                  check_in_lat, check_in_lng, check_in_address,
                  check_out_lat, check_out_lng, check_out_address,
                  status, created_at, updated_at
        "#,
    )
    .bind(&uuid::Uuid::new_v4().to_string())
    .bind(&user_id)
    .bind(&today)
    .bind(&now.time().to_string())
    .bind(req.lat)
    .bind(req.lng)
    .bind(&req.address)
    .bind(&now)
    .bind(&now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(row) => {
            let record = AttendanceRecord {
                id: row.get::<String, _>("id"),
                user_id: row.get::<String, _>("user_id"),
                date: row.get::<String, _>("date"),
                check_in_time: row.get::<Option<String>, _>("check_in_time"),
                check_out_time: row.get::<Option<String>, _>("check_out_time"),
                check_in_lat: row.get::<Option<f64>, _>("check_in_lat"),
                check_in_lng: row.get::<Option<f64>, _>("check_in_lng"),
                check_in_address: row.get::<Option<String>, _>("check_in_address"),
                check_out_lat: row.get::<Option<f64>, _>("check_out_lat"),
                check_out_lng: row.get::<Option<f64>, _>("check_out_lng"),
                check_out_address: row.get::<Option<String>, _>("check_out_address"),
                status: row.get::<String, _>("status"),
                created_at: row.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<DateTime<Utc>, _>("updated_at").to_rfc3339(),
            };
            (
                StatusCode::OK,
                Json(ApiResponse::success(record, "打卡成功")),
            )
        }
        Err(e) => {
            tracing::error!("打卡失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "打卡失败")),
            )
        }
    }
}

pub async fn check_out(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Json(req): Json<CheckOutRequest>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let today = Utc::now().date_naive().to_string();
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        UPDATE mobile_attendance SET
            check_out_time = $1, check_out_lat = $2, check_out_lng = $3,
            check_out_address = $4, status = 'checked_out', updated_at = $5
        WHERE user_id = $6 AND date = $7
        RETURNING id, user_id, date, check_in_time, check_out_time,
                  check_in_lat, check_in_lng, check_in_address,
                  check_out_lat, check_out_lng, check_out_address,
                  status, created_at, updated_at
        "#,
    )
    .bind(&now.time().to_string())
    .bind(req.lat)
    .bind(req.lng)
    .bind(&req.address)
    .bind(&now)
    .bind(&user_id)
    .bind(&today)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(row) => {
            let record = AttendanceRecord {
                id: row.get::<String, _>("id"),
                user_id: row.get::<String, _>("user_id"),
                date: row.get::<String, _>("date"),
                check_in_time: row.get::<Option<String>, _>("check_in_time"),
                check_out_time: row.get::<Option<String>, _>("check_out_time"),
                check_in_lat: row.get::<Option<f64>, _>("check_in_lat"),
                check_in_lng: row.get::<Option<f64>, _>("check_in_lng"),
                check_in_address: row.get::<Option<String>, _>("check_in_address"),
                check_out_lat: row.get::<Option<f64>, _>("check_out_lat"),
                check_out_lng: row.get::<Option<f64>, _>("check_out_lng"),
                check_out_address: row.get::<Option<String>, _>("check_out_address"),
                status: row.get::<String, _>("status"),
                created_at: row.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<DateTime<Utc>, _>("updated_at").to_rfc3339(),
            };
            (
                StatusCode::OK,
                Json(ApiResponse::success(record, "下班打卡成功")),
            )
        }
        Err(e) => {
            tracing::error!("下班打卡失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "下班打卡失败")),
            )
        }
    }
}

pub async fn list_leave_applications(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Query(params): Query<LeaveQueryParams>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let status_filter = params.status.clone();

    let result = sqlx::query(
        r#"
        SELECT id, user_id, leave_type, start_date, end_date, 
               duration_days, reason, status, created_at, updated_at
        FROM mobile_leave_applications
        WHERE user_id = $1
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&user_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&pool)
    .await;

    match result {
        Ok(rows) => {
            let applications: Vec<LeaveApplication> = rows
                .into_iter()
                .map(|row| LeaveApplication {
                    id: row.get::<String, _>("id"),
                    user_id: row.get::<String, _>("user_id"),
                    leave_type: row.get::<String, _>("leave_type"),
                    start_date: row.get::<String, _>("start_date"),
                    end_date: row.get::<String, _>("end_date"),
                    duration_days: row.get::<f64, _>("duration_days"),
                    reason: row.get::<Option<String>, _>("reason"),
                    status: row.get::<String, _>("status"),
                    created_at: row.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
                    updated_at: row.get::<DateTime<Utc>, _>("updated_at").to_rfc3339(),
                })
                .collect();

            let total = sqlx::query_scalar(
                r#"
                SELECT COUNT(*) FROM mobile_leave_applications
                WHERE user_id = $1
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&user_id)
            .bind(&status_filter)
            .fetch_one(&pool)
            .await
            .unwrap_or(0);

            (
                StatusCode::OK,
                Json(ApiResponse::success(
                    serde_json::json!({
                        "items": applications,
                        "total": total,
                        "page": page,
                        "pagesize": page_size
                    }),
                    "获取请假申请成功",
                )),
            )
        }
        Err(e) => {
            tracing::error!("获取请假申请失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "获取请假申请失败")),
            )
        }
    }
}

pub async fn apply_leave(
    State(auth_state): State<AuthState>,
    State(pool): State<PgPool>,
    headers: HeaderMap,
    Json(req): Json<CreateLeaveRequest>,
) -> impl IntoResponse {
    let user_id = match extract_user_id_from_token(&headers, &auth_state.jwt_secret) {
        Ok(id) => id,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let start_date = NaiveDate::parse_from_str(&req.start_date, "%Y-%m-%d").unwrap_or_default();
    let end_date = NaiveDate::parse_from_str(&req.end_date, "%Y-%m-%d").unwrap_or_default();
    let duration_days = (end_date - start_date).num_days() as f64 + 1.0;
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        INSERT INTO mobile_leave_applications (id, user_id, leave_type, start_date, 
                                                end_date, duration_days, reason, 
                                                status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8, $9)
        RETURNING id, user_id, leave_type, start_date, end_date, 
                  duration_days, reason, status, created_at, updated_at
        "#,
    )
    .bind(&uuid::Uuid::new_v4().to_string())
    .bind(&user_id)
    .bind(&req.leave_type)
    .bind(&req.start_date)
    .bind(&req.end_date)
    .bind(duration_days)
    .bind(&req.reason)
    .bind(&now)
    .bind(&now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(row) => {
            let application = LeaveApplication {
                id: row.get::<String, _>("id"),
                user_id: row.get::<String, _>("user_id"),
                leave_type: row.get::<String, _>("leave_type"),
                start_date: row.get::<String, _>("start_date"),
                end_date: row.get::<String, _>("end_date"),
                duration_days: row.get::<f64, _>("duration_days"),
                reason: row.get::<Option<String>, _>("reason"),
                status: row.get::<String, _>("status"),
                created_at: row.get::<DateTime<Utc>, _>("created_at").to_rfc3339(),
                updated_at: row.get::<DateTime<Utc>, _>("updated_at").to_rfc3339(),
            };
            (
                StatusCode::OK,
                Json(ApiResponse::success(application, "请假申请提交成功")),
            )
        }
        Err(e) => {
            tracing::error!("提交请假申请失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "提交请假申请失败")),
            )
        }
    }
}
