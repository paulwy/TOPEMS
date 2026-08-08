use axum::{
    extract::{Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    Json,
};
use serde::{Deserialize, Serialize};
use topems_shared::{ApiResponse, AuthState};
use topems_shared_service_client::service_client::{
    api::hrm_api::{HrmApi, HrmCheckInRequest, HrmCheckOutRequest, HrmCreateLeaveRequest},
    TypedServiceClient,
};

use super::auth_utils::extract_user_id_from_token;

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
    pub pagesize: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct LeaveQueryParams {
    pub status: Option<String>,
    pub page: Option<i64>,
    pub pagesize: Option<i64>,
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
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    match client.get_attendance_overview(&user_id).await {
        Ok(data) => (
            StatusCode::OK,
            Json(ApiResponse::success(data, "获取考勤概览成功")),
        ),
        Err(e) => {
            tracing::error!("调用HRM服务获取考勤概览失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "获取考勤概览失败")),
            )
        }
    }
}

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
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    match client.get_attendance_stats(&user_id).await {
        Ok(stats) => (
            StatusCode::OK,
            Json(ApiResponse::success(stats, "获取考勤统计成功")),
        ),
        Err(e) => {
            tracing::error!("调用HRM服务获取考勤统计失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "获取考勤统计失败")),
            )
        }
    }
}

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
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let page = params.page.unwrap_or(1) as i32;
    let page_size = params.pagesize.unwrap_or(20) as i32;

    match client
        .list_attendance_records(&user_id, params.month.as_deref(), page, page_size)
        .await
    {
        Ok(data) => (
            StatusCode::OK,
            Json(ApiResponse::success(data, "获取考勤记录成功")),
        ),
        Err(e) => {
            tracing::error!("调用HRM服务获取考勤记录失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "获取考勤记录失败")),
            )
        }
    }
}

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
                Json(ApiResponse::error(401, "未授权")),
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
        Ok(record) => (
            StatusCode::OK,
            Json(ApiResponse::success(record, "打卡成功")),
        ),
        Err(e) => {
            tracing::error!("调用HRM服务打卡失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "打卡失败")),
            )
        }
    }
}

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
                Json(ApiResponse::error(401, "未授权")),
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
        Ok(record) => (
            StatusCode::OK,
            Json(ApiResponse::success(record, "下班打卡成功")),
        ),
        Err(e) => {
            tracing::error!("调用HRM服务下班打卡失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "下班打卡失败")),
            )
        }
    }
}

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
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let page = params.page.unwrap_or(1) as i32;
    let page_size = params.pagesize.unwrap_or(20) as i32;

    match client
        .list_leave_applications(&user_id, params.status.as_deref(), page, page_size)
        .await
    {
        Ok(data) => (
            StatusCode::OK,
            Json(ApiResponse::success(data, "获取请假申请成功")),
        ),
        Err(e) => {
            tracing::error!("调用HRM服务获取请假申请失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "获取请假申请失败")),
            )
        }
    }
}

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
                Json(ApiResponse::error(401, "未授权")),
            );
        }
    };

    let request = HrmCreateLeaveRequest {
        user_id,
        leave_type: req.leave_type,
        start_date: req.start_date,
        end_date: req.end_date,
        reason: req.reason,
    };

    match client.apply_leave(&request).await {
        Ok(application) => (
            StatusCode::OK,
            Json(ApiResponse::success(application, "请假申请提交成功")),
        ),
        Err(e) => {
            tracing::error!("调用HRM服务提交请假申请失败: {}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ApiResponse::error(500, "提交请假申请失败")),
            )
        }
    }
}
