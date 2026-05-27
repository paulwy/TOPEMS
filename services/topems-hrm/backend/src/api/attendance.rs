use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{CreateAttendanceRequest, AttendanceRecord, UpdateAttendanceRequest};
use topems_shared::ApiResponse;

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/attendance", get(list_attendance).post(create_attendance))
        .route(
            "/api/v1/attendance/{id}",
            get(get_attendance).put(update_attendance).delete(delete_attendance),
        )
        .with_state(state);

    Ok(app)
}

#[derive(Debug, Deserialize)]
pub struct AttendancePaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub employee_id: Option<Uuid>,
}

async fn list_attendance(
    State(state): State<Arc<AppState>>,
    Query(params): Query<AttendancePaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let emp_filter = params.employee_id;

    let result = sqlx::query_as::<_, AttendanceRecord>(
        r#"
        SELECT id, employee_id, date, check_in, check_out, 
               status, work_hours, notes, created_at, updated_at
        FROM attendance_records
        WHERE ($1::uuid IS NULL OR employee_id = $1)
        ORDER BY date DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&emp_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM attendance_records
                WHERE ($1::uuid IS NULL OR employee_id = $1)
                "#,
            )
            .bind(&emp_filter)
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
            Json(ApiResponse::<serde_json::Value>::error(500, "获取考勤记录列表失败"))
        }
    }
}

async fn create_attendance(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateAttendanceRequest>,
) -> Json<ApiResponse<AttendanceRecord>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, AttendanceRecord>(
        r#"
        INSERT INTO attendance_records (
            id, employee_id, date, check_in, check_out, 
            status, work_hours, notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, employee_id, date, check_in, check_out, 
                  status, work_hours, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.employee_id)
    .bind(&req.date)
    .bind(&req.check_in)
    .bind(&req.check_out)
    .bind(&req.status)
    .bind(&req.work_hours)
    .bind(&req.notes)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(record) => Json(ApiResponse::success(record, "考勤记录创建成功")),
        Err(e) => {
            tracing::error!("创建考勤记录失败: {}", e);
            Json(ApiResponse::<AttendanceRecord>::error(500, "考勤记录创建失败"))
        }
    }
}

async fn get_attendance(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AttendanceRecord>> {
    let result = sqlx::query_as::<_, AttendanceRecord>(
        r#"
        SELECT id, employee_id, date, check_in, check_out, 
               status, work_hours, notes, created_at, updated_at
        FROM attendance_records WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(record)) => Json(ApiResponse::success(record, "获取考勤记录成功")),
        Ok(None) => Json(ApiResponse::<AttendanceRecord>::error(404, "考勤记录不存在")),
        Err(e) => {
            tracing::error!("获取考勤记录失败: {}", e);
            Json(ApiResponse::<AttendanceRecord>::error(500, "获取考勤记录失败"))
        }
    }
}

async fn update_attendance(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAttendanceRequest>,
) -> Json<ApiResponse<AttendanceRecord>> {
    let existing = sqlx::query_as::<_, AttendanceRecord>(
        r#"
        SELECT id, employee_id, date, check_in, check_out, 
               status, work_hours, notes, created_at, updated_at FROM attendance_records WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::<AttendanceRecord>::error(404, "考勤记录不存在")),
        Err(e) => return Json(ApiResponse::<AttendanceRecord>::error(500, &format!("查询考勤记录失败: {}", e))),
    };

    let check_in = req.check_in.or(existing.check_in);
    let check_out = req.check_out.or(existing.check_out);
    let status = req.status.or(existing.status);
    let work_hours = req.work_hours.or(existing.work_hours);
    let notes = req.notes.or(existing.notes);
    let now = Utc::now();

    let result = sqlx::query_as::<_, AttendanceRecord>(
        r#"
        UPDATE attendance_records SET
            check_in = $2, check_out = $3, status = $4, 
            work_hours = $5, notes = $6, updated_at = $7
        WHERE id = $1
        RETURNING id, employee_id, date, check_in, check_out, 
                  status, work_hours, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&check_in)
    .bind(&check_out)
    .bind(&status)
    .bind(&work_hours)
    .bind(&notes)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(record) => Json(ApiResponse::success(record, "考勤记录更新成功")),
        Err(e) => {
            tracing::error!("更新考勤记录失败: {}", e);
            Json(ApiResponse::<AttendanceRecord>::error(500, "考勤记录更新失败"))
        }
    }
}

async fn delete_attendance(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM attendance_records WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "考勤记录删除成功")),
        Ok(_) => Json(ApiResponse::<String>::error(404, "考勤记录不存在")),
        Err(e) => {
            tracing::error!("删除考勤记录失败: {}", e);
            Json(ApiResponse::<String>::error(500, "考勤记录删除失败"))
        }
    }
}
