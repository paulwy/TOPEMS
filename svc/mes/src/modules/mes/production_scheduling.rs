//! Production Scheduling handlers

use axum::{extract::Path, extract::State, extract::Extension, Json};
use chrono::{DateTime, NaiveDate, NaiveDateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::{BigDecimal, Uuid}, PgPool};
use std::str::FromStr;
use topems_shared::auth::Claims;

use crate::AppState;
use super::permission::{check_permission, ModulePermission};
use topems_shared::response::ApiResponse;

// ==================== Data Types ====================

#[derive(Debug, Clone, Serialize)]
pub struct ProductionScheduleResponse {
    pub id: Uuid,
    pub schedule_no: String,
    pub order_id: Option<Uuid>,
    pub order_no: Option<String>,
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub work_station_id: Option<Uuid>,
    pub work_station_name: Option<String>,
    pub equipment_id: Option<Uuid>,
    pub equipment_name: Option<String>,
    pub process_id: Option<Uuid>,
    pub process_name: Option<String>,
    pub planned_start_time: Option<DateTime<Utc>>,
    pub planned_end_time: Option<DateTime<Utc>>,
    pub actual_start_time: Option<DateTime<Utc>>,
    pub actual_end_time: Option<DateTime<Utc>>,
    pub status: String,
    pub priority: i32,
    pub sequence: i32,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ListProductionSchedulesResponse {
    pub schedules: Vec<ProductionScheduleResponse>,
    pub total: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateProductionScheduleRequest {
    pub order_id: Option<Uuid>,
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub work_station_id: Option<Uuid>,
    pub equipment_id: Option<Uuid>,
    pub process_id: Option<Uuid>,
    pub planned_start_time: Option<DateTime<Utc>>,
    pub planned_end_time: Option<DateTime<Utc>>,
    pub priority: Option<i32>,
    pub sequence: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateProductionScheduleRequest {
    pub work_station_id: Option<Uuid>,
    pub equipment_id: Option<Uuid>,
    pub process_id: Option<Uuid>,
    pub planned_start_time: Option<DateTime<Utc>>,
    pub planned_end_time: Option<DateTime<Utc>>,
    pub priority: Option<i32>,
    pub sequence: Option<i32>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AdjustScheduleRequest {
    pub schedule_ids: Vec<Uuid>,
    pub new_start_time: Option<DateTime<Utc>>,
    pub new_work_station_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GanttTask {
    pub id: String,
    pub name: String,
    pub start: DateTime<Utc>,
    pub end: DateTime<Utc>,
    pub progress: f64,
    pub status: String,
    pub resource: Option<String>,
    pub parent: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GanttDataResponse {
    pub tasks: Vec<GanttTask>,
    pub resources: Vec<GanttResource>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GanttResource {
    pub id: String,
    pub name: String,
    pub category: String,
}

fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    dt.map(|d| Utc.from_utc_datetime(&d)).unwrap_or_else(Utc::now)
}

fn opt_naive_to_utc(dt: Option<NaiveDateTime>) -> Option<DateTime<Utc>> {
    dt.map(|d| Utc.from_utc_datetime(&d))
}

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok()).unwrap_or(0.0)
}

// ==================== Production Scheduling Handlers ====================

pub async fn list_production_schedules(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<ListProductionSchedulesResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ProductionSchedulingRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            ps.id, ps.schedule_no, ps.order_id, ps.order_no,
            ps.product_id, ps.product_name, ps.product_code,
            ps.quantity, ps.work_station_id, ps.equipment_id,
            ps.process_id, ps.planned_start_time, ps.planned_end_time,
            ps.actual_start_time, ps.actual_end_time,
            ps.status, ps.priority, ps.sequence, ps.notes,
            ps.created_at, ps.updated_at,
            ws.name as work_station_name,
            e.name as equipment_name,
            pp.name as process_name
        FROM production_schedules ps
        LEFT JOIN work_stations ws ON ps.work_station_id = ws.id
        LEFT JOIN equipment e ON ps.equipment_id = e.id
        LEFT JOIN production_processes pp ON ps.process_id = pp.id
        ORDER BY ps.planned_start_time DESC, ps.priority DESC
        "#
    )
    .fetch_all(&state.pool)
    .await;

    let schedules = match result {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to fetch production schedules: {}", e);
            return Json(ApiResponse::error(500, "获取生产排产列表失败"));
        }
    };

    let schedules_list: Vec<ProductionScheduleResponse> = schedules.into_iter().map(|r| ProductionScheduleResponse {
        id: r.id,
        schedule_no: r.schedule_no,
        order_id: r.order_id,
        order_no: r.order_no,
        product_id: r.product_id,
        product_name: r.product_name,
        product_code: r.product_code,
        quantity: big_decimal_to_f64(Some(r.quantity)),
        work_station_id: r.work_station_id,
        work_station_name: Some(r.work_station_name),
        equipment_id: r.equipment_id,
        equipment_name: Some(r.equipment_name),
        process_id: r.process_id,
        process_name: Some(r.process_name),
        planned_start_time: opt_naive_to_utc(r.planned_start_time),
        planned_end_time: opt_naive_to_utc(r.planned_end_time),
        actual_start_time: opt_naive_to_utc(r.actual_start_time),
        actual_end_time: opt_naive_to_utc(r.actual_end_time),
        status: r.status.unwrap_or_else(|| "pending".to_string()),
        priority: r.priority.unwrap_or(0),
        sequence: r.sequence.unwrap_or(0),
        notes: r.notes,
        created_at: naive_to_utc(r.created_at),
        updated_at: naive_to_utc(r.updated_at),
    }).collect();

    let total = schedules_list.len() as i64;

    Json(ApiResponse::success(
        ListProductionSchedulesResponse {
            schedules: schedules_list,
            total,
        },
        "获取生产排产列表成功",
    ))
}

pub async fn create_production_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateProductionScheduleRequest>,
) -> Json<ApiResponse<ProductionScheduleResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ProductionSchedulingWrite).await {
        return e;
    }

    let now = Utc::now();
    let schedule_no = format!("PS{}{:04}", now.format("%Y%m%d"), rand::random::<u16>() % 10000);

    let order_no = if let Some(order_id) = req.order_id {
        let order = sqlx::query!(
            r#"SELECT order_no FROM production_orders WHERE id = $1"#,
            order_id
        )
        .fetch_optional(&state.pool)
        .await
        .ok()
        .flatten();
        order.map(|o| o.order_no)
    } else {
        None
    };

    let result = sqlx::query!(
        r#"
        INSERT INTO production_schedules (
            schedule_no, order_id, order_no, product_id, product_name, product_code,
            quantity, work_station_id, equipment_id, process_id,
            planned_start_time, planned_end_time, status, priority, sequence, notes,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13, $14, $15, $16, $16)
        RETURNING 
            id, schedule_no, order_id, order_no,
            product_id, product_name, product_code,
            quantity, work_station_id, equipment_id,
            process_id, planned_start_time, planned_end_time,
            actual_start_time, actual_end_time,
            status, priority, sequence, notes,
            created_at, updated_at
        "#,
        schedule_no,
        req.order_id,
        order_no,
        req.product_id,
        req.product_name,
        req.product_code,
        BigDecimal::from_str(&req.quantity.to_string()).unwrap_or_default(),
        req.work_station_id,
        req.equipment_id,
        req.process_id,
        req.planned_start_time.map(|d| d.naive_utc()),
        req.planned_end_time.map(|d| d.naive_utc()),
        req.priority.unwrap_or(0),
        req.sequence.unwrap_or(0),
        req.notes,
        now.naive_utc(),
    )
    .fetch_one(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create production schedule: {}", e);
            return Json(ApiResponse::error(500, "创建生产排产失败"));
        }
    };

    let schedule = ProductionScheduleResponse {
        id: result.id,
        schedule_no: result.schedule_no,
        order_id: result.order_id,
        order_no: result.order_no,
        product_id: result.product_id,
        product_name: result.product_name,
        product_code: result.product_code,
        quantity: big_decimal_to_f64(Some(result.quantity)),
        work_station_id: result.work_station_id,
        work_station_name: None,
        equipment_id: result.equipment_id,
        equipment_name: None,
        process_id: result.process_id,
        process_name: None,
        planned_start_time: opt_naive_to_utc(result.planned_start_time),
        planned_end_time: opt_naive_to_utc(result.planned_end_time),
        actual_start_time: opt_naive_to_utc(result.actual_start_time),
        actual_end_time: opt_naive_to_utc(result.actual_end_time),
        status: result.status.unwrap_or_else(|| "pending".to_string()),
        priority: result.priority.unwrap_or(0),
        sequence: result.sequence.unwrap_or(0),
        notes: result.notes,
        created_at: naive_to_utc(result.created_at),
        updated_at: naive_to_utc(result.updated_at),
    };

    Json(ApiResponse::success(schedule, "生产排产创建成功"))
}

pub async fn get_production_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionScheduleResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ProductionSchedulingRead).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            ps.id, ps.schedule_no, ps.order_id, ps.order_no,
            ps.product_id, ps.product_name, ps.product_code,
            ps.quantity, ps.work_station_id, ps.equipment_id,
            ps.process_id, ps.planned_start_time, ps.planned_end_time,
            ps.actual_start_time, ps.actual_end_time,
            ps.status, ps.priority, ps.sequence, ps.notes,
            ps.created_at, ps.updated_at,
            ws.name as work_station_name,
            e.name as equipment_name,
            pp.name as process_name
        FROM production_schedules ps
        LEFT JOIN work_stations ws ON ps.work_station_id = ws.id
        LEFT JOIN equipment e ON ps.equipment_id = e.id
        LEFT JOIN production_processes pp ON ps.process_id = pp.id
        WHERE ps.id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch production schedule: {}", e);
            return Json(ApiResponse::error(500, "获取生产排产失败"));
        }
    };

    match result {
        Some(r) => {
            let schedule = ProductionScheduleResponse {
                id: r.id,
                schedule_no: r.schedule_no,
                order_id: r.order_id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: big_decimal_to_f64(Some(r.quantity)),
                work_station_id: r.work_station_id,
                work_station_name: Some(r.work_station_name),
                equipment_id: r.equipment_id,
                equipment_name: Some(r.equipment_name),
                process_id: r.process_id,
                process_name: Some(r.process_name),
                planned_start_time: opt_naive_to_utc(r.planned_start_time),
                planned_end_time: opt_naive_to_utc(r.planned_end_time),
                actual_start_time: opt_naive_to_utc(r.actual_start_time),
                actual_end_time: opt_naive_to_utc(r.actual_end_time),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                priority: r.priority.unwrap_or(0),
                sequence: r.sequence.unwrap_or(0),
                notes: r.notes,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(schedule, "获取生产排产成功"))
        }
        None => Json(ApiResponse::error(404, "生产排产不存在")),
    }
}

pub async fn update_production_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProductionScheduleRequest>,
) -> Json<ApiResponse<ProductionScheduleResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ProductionSchedulingWrite).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        UPDATE production_schedules SET
            work_station_id = COALESCE($2, work_station_id),
            equipment_id = COALESCE($3, equipment_id),
            process_id = COALESCE($4, process_id),
            planned_start_time = COALESCE($5, planned_start_time),
            planned_end_time = COALESCE($6, planned_end_time),
            priority = COALESCE($7, priority),
            sequence = COALESCE($8, sequence),
            status = COALESCE($9, status),
            notes = COALESCE($10, notes),
            updated_at = $11
        WHERE id = $1
        RETURNING 
            id, schedule_no, order_id, order_no,
            product_id, product_name, product_code,
            quantity, work_station_id, equipment_id,
            process_id, planned_start_time, planned_end_time,
            actual_start_time, actual_end_time,
            status, priority, sequence, notes,
            created_at, updated_at
        "#,
        id,
        req.work_station_id,
        req.equipment_id,
        req.process_id,
        req.planned_start_time.map(|d| d.naive_utc()),
        req.planned_end_time.map(|d| d.naive_utc()),
        req.priority,
        req.sequence,
        req.status,
        req.notes,
        Utc::now().naive_utc(),
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update production schedule: {}", e);
            return Json(ApiResponse::error(500, "更新生产排产失败"));
        }
    };

    match result {
        Some(r) => {
            let schedule = ProductionScheduleResponse {
                id: r.id,
                schedule_no: r.schedule_no,
                order_id: r.order_id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: big_decimal_to_f64(Some(r.quantity)),
                work_station_id: r.work_station_id,
                work_station_name: None,
                equipment_id: r.equipment_id,
                equipment_name: None,
                process_id: r.process_id,
                process_name: None,
                planned_start_time: opt_naive_to_utc(r.planned_start_time),
                planned_end_time: opt_naive_to_utc(r.planned_end_time),
                actual_start_time: opt_naive_to_utc(r.actual_start_time),
                actual_end_time: opt_naive_to_utc(r.actual_end_time),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                priority: r.priority.unwrap_or(0),
                sequence: r.sequence.unwrap_or(0),
                notes: r.notes,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(schedule, "生产排产更新成功"))
        }
        None => Json(ApiResponse::error(404, "生产排产不存在")),
    }
}

pub async fn delete_production_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ProductionSchedulingWrite).await {
        return e;
    }

    let result = sqlx::query!(
        r#"
        DELETE FROM production_schedules
        WHERE id = $1 AND status IN ('pending', 'cancelled')
        "#,
        id,
    )
    .execute(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete production schedule: {}", e);
            return Json(ApiResponse::error(500, "删除生产排产失败"));
        }
    };

    if result.rows_affected() > 0 {
        Json(ApiResponse::success("".to_string(), "生产排产删除成功"))
    } else {
        Json(ApiResponse::error(404, "生产排产不存在或状态不允许删除"))
    }
}

pub async fn adjust_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AdjustScheduleRequest>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ProductionSchedulingAdjust).await {
        return e;
    }

    let now = Utc::now().naive_utc();

    for schedule_id in &req.schedule_ids {
        let result = sqlx::query!(
            r#"
            UPDATE production_schedules SET
                work_station_id = COALESCE($2, work_station_id),
                planned_start_time = COALESCE($3, planned_start_time),
                updated_at = $4
            WHERE id = $1 AND status IN ('pending', 'in_progress')
            "#,
            schedule_id,
            req.new_work_station_id,
            req.new_start_time.map(|d| d.naive_utc()),
            now,
        )
        .execute(&state.pool)
        .await;

        if let Err(e) = result {
            tracing::error!("Failed to adjust schedule {}: {}", schedule_id, e);
            return Json(ApiResponse::error(500, "调整生产排产失败"));
        }
    }

    Json(ApiResponse::success("".to_string(), "生产排产调整成功"))
}

pub async fn get_gantt_data(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<GanttDataResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::ProductionSchedulingRead).await {
        return e;
    }

    let schedules = sqlx::query!(
        r#"
        SELECT 
            ps.id, ps.schedule_no, ps.product_name,
            ps.planned_start_time, ps.planned_end_time,
            ps.actual_start_time, ps.actual_end_time,
            ps.status, ps.quantity, ps.completed_quantity,
            ws.name as work_station_name
        FROM production_schedules ps
        LEFT JOIN work_stations ws ON ps.work_station_id = ws.id
        WHERE ps.planned_start_time IS NOT NULL
          AND ps.planned_end_time IS NOT NULL
        ORDER BY ps.planned_start_time ASC
        "#
    )
    .fetch_all(&state.pool)
    .await;

    let schedules = match schedules {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to fetch gantt data: {}", e);
            return Json(ApiResponse::error(500, "获取甘特图数据失败"));
        }
    };

    let mut tasks = Vec::new();
    let mut resources = Vec::new();
    let mut resource_ids = std::collections::HashSet::new();

    for s in &schedules {
        let start = s.planned_start_time
            .map(|d| Utc.from_utc_datetime(&d))
            .unwrap_or_else(Utc::now);
        let end = s.planned_end_time
            .map(|d| Utc.from_utc_datetime(&d))
            .unwrap_or_else(|| Utc::now() + chrono::Duration::hours(1));

        let total = big_decimal_to_f64(Some(s.quantity.clone()));
        let completed = big_decimal_to_f64(s.completed_quantity.clone());
        let progress = if total > 0.0 { (completed / total) * 100.0 } else { 0.0 };

        let resource_name = s.work_station_name.clone();
        if resource_ids.insert(resource_name.clone()) {
            resources.push(GanttResource {
                id: resource_name.clone(),
                name: resource_name.clone(),
                category: "workstation".to_string(),
            });
        }

        tasks.push(GanttTask {
            id: s.id.to_string(),
            name: format!("{} - {}", s.schedule_no, s.product_name),
            start,
            end,
            progress,
            status: s.status.clone().unwrap_or_else(|| "pending".to_string()),
            resource: Some(resource_name),
            parent: None,
        });
    }

    Json(ApiResponse::success(
        GanttDataResponse {
            tasks,
            resources,
        },
        "获取甘特图数据成功",
    ))
}
