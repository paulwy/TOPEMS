//! HRM 人力资源管理模块 API 处理器

use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use sqlx::Row;

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct ListParams {
    #[serde(default)]
    pub page: Option<u32>,
    #[serde(default)]
    pub page_size: Option<u32>,
}

/// 获取员工列表（真实数据库查询）
pub async fn list_employees(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询员工列表
    let employees = sqlx::query(
        r#"
        SELECT id, employee_number, name, gender, job_title, department_id, hire_date
        FROM hrm.employees
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM hrm.employees
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match employees {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "employee_number": r.get::<Option<String>, _>("employee_number"),
                        "name": r.get::<Option<String>, _>("name"),
                        "gender": r.get::<Option<String>, _>("gender"),
                        "job_title": r.get::<Option<String>, _>("job_title"),
                        "department_id": r.get::<Option<uuid::Uuid>, _>("department_id").map(|id| id.to_string()),
                        "hire_date": r.get::<Option<chrono::NaiveDate>, _>("hire_date"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": {
                    "employees": data,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                },
                "success": true,
                "message": "获取员工列表成功"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query employees: {}", e);
            Json(serde_json::json!({
                "data": {
                    "employees": [],
                    "total": 0,
                    "page": page,
                    "page_size": page_size,
                },
                "success": false,
                "message": "获取员工列表失败"
            }))
        }
    }
}

/// 获取部门列表（真实数据库查询）
pub async fn list_departments(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询部门列表
    let departments = sqlx::query(
        r#"
        SELECT id, name, code, parent_id, manager_id, description, status, created_at
        FROM hrm.departments
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM hrm.departments
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match departments {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<String, _>("name"),
                        "code": r.get::<Option<String>, _>("code"),
                        "parent_id": r.get::<Option<uuid::Uuid>, _>("parent_id").map(|id| id.to_string()),
                        "manager_id": r.get::<Option<uuid::Uuid>, _>("manager_id").map(|id| id.to_string()),
                        "description": r.get::<Option<String>, _>("description"),
                        "status": r.get::<String, _>("status"),
                        "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query departments: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取部门列表失败"
            }))
        }
    }
}

/// 获取招聘职位列表（真实数据库查询）
pub async fn list_job_openings(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询招聘职位列表
    let jobs = sqlx::query(
        r#"
        SELECT id, title, code, employment_type, location, salary_min, salary_max, status, publish_date, close_date, created_at
        FROM hrm.job_openings
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM hrm.job_openings
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match jobs {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "title": r.get::<String, _>("title"),
                        "code": r.get::<Option<String>, _>("code"),
                        "employment_type": r.get::<Option<String>, _>("employment_type"),
                        "location": r.get::<Option<String>, _>("location"),
                        "salary_min": r.get::<Option<rust_decimal::Decimal>, _>("salary_min").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                        "salary_max": r.get::<Option<rust_decimal::Decimal>, _>("salary_max").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                        "status": r.get::<String, _>("status"),
                        "publish_date": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("publish_date"),
                        "close_date": r.get::<Option<chrono::DateTime<chrono::Utc>>, _>("close_date"),
                        "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query job openings: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取招聘职位列表失败"
            }))
        }
    }
}

/// 获取培训课程列表（真实数据库查询）
pub async fn list_training_courses(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询培训课程列表
    let courses = sqlx::query(
        r#"
        SELECT id, name, code, category, level, description, duration_hours, instructor_name, location, max_participants, status, created_at
        FROM hrm.training_courses
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM hrm.training_courses
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match courses {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "name": r.get::<String, _>("name"),
                        "code": r.get::<Option<String>, _>("code"),
                        "category": r.get::<String, _>("category"),
                        "level": r.get::<String, _>("level"),
                        "description": r.get::<Option<String>, _>("description"),
                        "duration_hours": r.get::<Option<rust_decimal::Decimal>, _>("duration_hours").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                        "instructor_name": r.get::<Option<String>, _>("instructor_name"),
                        "location": r.get::<Option<String>, _>("location"),
                        "max_participants": r.get::<Option<i32>, _>("max_participants"),
                        "status": r.get::<String, _>("status"),
                        "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query training courses: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取培训课程列表失败"
            }))
        }
    }
}

/// 获取考勤记录列表（真实数据库查询）
pub async fn list_attendance_records(
    State(state): State<AppState>,
    Query(params): Query<ListParams>,
) -> Json<serde_json::Value> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    // 从数据库查询考勤记录列表
    let records = sqlx::query(
        r#"
        SELECT id, employee_id, date, check_in_time, check_out_time, status, work_hours, overtime_hours, notes, created_at
        FROM hrm.attendance_records
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#
    )
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await;

    // 查询总数
    let total_row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM hrm.attendance_records
        WHERE deleted_at IS NULL
        "#
    )
    .fetch_one(&state.pool)
    .await;

    let total: i64 = match total_row {
        Ok(row) => row.get("count"),
        Err(_) => 0,
    };

    match records {
        Ok(rows) => {
            let data: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|r| {
                    serde_json::json!({
                        "id": r.get::<uuid::Uuid, _>("id").to_string(),
                        "employee_id": r.get::<uuid::Uuid, _>("employee_id").to_string(),
                        "date": r.get::<chrono::NaiveDate, _>("date"),
                        "check_in_time": r.get::<Option<chrono::NaiveTime>, _>("check_in_time"),
                        "check_out_time": r.get::<Option<chrono::NaiveTime>, _>("check_out_time"),
                        "status": r.get::<String, _>("status"),
                        "work_hours": r.get::<Option<rust_decimal::Decimal>, _>("work_hours").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                        "overtime_hours": r.get::<Option<rust_decimal::Decimal>, _>("overtime_hours").map(|d| d.to_string().parse::<f64>().unwrap_or(0.0)),
                        "notes": r.get::<Option<String>, _>("notes"),
                        "created_at": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    })
                })
                .collect();

            Json(serde_json::json!({
                "data": data,
                "total": total,
                "page": page,
                "page_size": page_size,
            }))
        }
        Err(e) => {
            tracing::error!("Failed to query attendance records: {}", e);
            Json(serde_json::json!({
                "data": [],
                "total": 0,
                "page": page,
                "page_size": page_size,
                "error": "获取考勤记录列表失败"
            }))
        }
    }
}
