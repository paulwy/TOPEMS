use axum::{
    extract::{Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::AppState;
use topems_shared::{api_error, api_success, ApiResponse};

use super::models::{Attendance, AttendanceListResponse, AttendanceQuery, CreateAttendanceRequest};

fn default_tenant_id() -> Uuid {
    Uuid::parse_str("00000000-0000-0000-0000-000000000001").expect("hardcoded default UUID should always be valid")
}

pub async fn list_attendance(
    State(state): State<AppState>,
    Query(query): Query<AttendanceQuery>,
) -> Json<ApiResponse<AttendanceListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let tenant_id = default_tenant_id();

    let total: i64 = match sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM core_hrm_attendance
           WHERE tenant_id = $1
             AND ($2::uuid IS NULL OR employee_id = $2)
             AND ($3::date IS NULL OR date = $3)
             AND ($4::text IS NULL OR status = $4)"#,
    )
    .bind(tenant_id)
    .bind(query.employee_id)
    .bind(query.date)
    .bind(query.status.clone())
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询考勤总数失败: {}", e);
            return Json(api_error(500, "查询考勤总数失败"));
        }
    };

    let items: Vec<Attendance> = match sqlx::query_as(
        r#"SELECT id, tenant_id, employee_id, date, check_in_time, check_out_time,
                  status, remarks, created_at, updated_at
           FROM core_hrm_attendance
           WHERE tenant_id = $1
             AND ($2::uuid IS NULL OR employee_id = $2)
             AND ($3::date IS NULL OR date = $3)
             AND ($4::text IS NULL OR status = $4)
           ORDER BY date DESC, created_at DESC
           LIMIT $5 OFFSET $6"#,
    )
    .bind(tenant_id)
    .bind(query.employee_id)
    .bind(query.date)
    .bind(query.status.clone())
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询考勤列表失败: {}", e);
            return Json(api_error(500, "查询考勤列表失败"));
        }
    };

    Json(api_success(AttendanceListResponse {
        items,
        total,
        page,
        page_size,
    }))
}

pub async fn get_attendance(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Attendance>> {
    let tenant_id = default_tenant_id();

    let att: Option<Attendance> = match sqlx::query_as(
        r#"SELECT id, tenant_id, employee_id, date, check_in_time, check_out_time,
                  status, remarks, created_at, updated_at
           FROM core_hrm_attendance WHERE id = $1 AND tenant_id = $2"#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("查询考勤详情失败: {}", e);
            return Json(api_error(500, "查询考勤详情失败"));
        }
    };

    match att {
        Some(att) => Json(api_success(att)),
        None => Json(api_error(404, "考勤记录不存在")),
    }
}

pub async fn create_attendance(
    State(state): State<AppState>,
    Json(req): Json<CreateAttendanceRequest>,
) -> Json<ApiResponse<Attendance>> {
    let tenant_id = default_tenant_id();

    let att: Attendance = match sqlx::query_as(
        r#"INSERT INTO core_hrm_attendance
               (tenant_id, employee_id, date, check_in_time, check_out_time, status, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, tenant_id, employee_id, date, check_in_time, check_out_time,
                     status, remarks, created_at, updated_at"#,
    )
    .bind(tenant_id)
    .bind(req.employee_id)
    .bind(req.date)
    .bind(req.check_in_time)
    .bind(req.check_out_time)
    .bind(req.status.clone().unwrap_or_else(|| "normal".to_string()))
    .bind(req.remarks)
    .fetch_one(&state.pool)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建考勤记录失败: {}", e);
            return Json(api_error(500, "创建考勤记录失败"));
        }
    };

    Json(api_success(att))
}
