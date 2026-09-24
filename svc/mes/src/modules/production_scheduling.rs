//! Production Scheduling handlers

use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{
    types::{BigDecimal, Uuid},
    Row,
};
use std::str::FromStr;
use topems_shared::auth::Claims;

use crate::shared::aps_fsm::schedule_can_transition;
use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared::response::ApiResponse;
use utoipa::ToSchema;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/schedules",
            get(list_production_schedules).post(create_production_schedule),
        )
        .route(
            "/schedules/{id}",
            get(get_production_schedule)
                .put(update_production_schedule)
                .delete(delete_production_schedule),
        )
        .route("/schedules/{id}/adjust", put(adjust_schedule))
        .route("/schedules/gantt", get(get_gantt_data))
        .route("/schedules/{id}/submit", post(submit_schedule))
        .route("/schedules/{id}/release", post(release_schedule))
        .route("/schedules/{id}/hold", post(hold_schedule))
        .route("/schedules/{id}/start", post(start_schedule))
        .route("/schedules/{id}/complete", post(complete_schedule))
        .route("/schedules/{id}/cancel", post(cancel_schedule))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListProductionSchedulesQuery {
    page: Option<i32>,
    page_size: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
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

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ListProductionSchedulesResponse {
    pub schedules: Vec<ProductionScheduleResponse>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Deserialize, ToSchema)]
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

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct AdjustScheduleRequest {
    pub schedule_ids: Vec<Uuid>,
    pub new_start_time: Option<DateTime<Utc>>,
    pub new_work_station_id: Option<Uuid>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
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

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct GanttDataResponse {
    pub tasks: Vec<GanttTask>,
    pub resources: Vec<GanttResource>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct GanttResource {
    pub id: String,
    pub name: String,
    pub category: String,
}

fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    dt.unwrap_or_else(Utc::now)
}

fn opt_naive_to_utc(dt: Option<DateTime<Utc>>) -> Option<DateTime<Utc>> {
    dt
}

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
        .unwrap_or(0.0)
}

// ==================== Production Scheduling Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:production:read"])),
    path = "/api/mes/schedules",
    tag = "ProductionScheduling",
    params(
        ("page" = Option<i32>, Query, description = "页码"),
        ("page_size" = Option<i32>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态过滤"),
    ),
    responses(
        (status = 200, description = "排产列表", body = ApiResponse<ListProductionSchedulesResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_production_schedules(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListProductionSchedulesQuery>,
) -> Json<ApiResponse<ListProductionSchedulesResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingRead,
    )
    .await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE ps.deleted_at IS NULL");

    if let Some(status) = query.status {
        where_clause.push_str(" AND ps.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(" AND (ps.schedule_no ILIKE $1 OR ps.order_no ILIKE $1 OR ps.product_name ILIKE $1 OR ps.product_code ILIKE $1)");
        } else {
            where_clause.push_str(&format!(
                " AND (ps.schedule_no ILIKE ${} OR ps.order_no ILIKE ${} OR ps.product_name ILIKE ${} OR ps.product_code ILIKE ${})",
                params.len() + 1,
                params.len() + 1,
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM production_schedules ps{}",
        where_clause
    );

    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }

    let count_result = count_query.fetch_one(&state.pool).await;
    let total: Option<i64> = match count_result {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count production schedules: {}", e);
            return Json(ApiResponse::error(500, "获取生产排产列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            ps.id, ps.schedule_no, ps.order_id, ps.order_no,
            ps.product_id, ps.product_name, ps.product_code,
            ps.quantity, ps.work_station_id, ps.equipment_id,
            ps.process_id, ps.planned_start_time, ps.planned_end_time,
            ps.actual_start_time, ps.actual_end_time,
            ps.status, ps.priority, ps.sequence, ps.notes,
            ps.created_at.unwrap_or_default(), ps.updated_at.unwrap_or_default(),
            ws.station_name as work_station_name,
            e.equipment_name as equipment_name,
            pp.process_name as process_name
        FROM production_schedules ps
        LEFT JOIN work_stations ws ON ps.work_station_id = ws.id
        LEFT JOIN equipment e ON ps.equipment_id = e.id
        LEFT JOIN production_processes pp ON ps.process_id = pp.id
        {}
        ORDER BY ps.planned_start_time DESC, ps.priority DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut fetch_query = sqlx::query(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
    }
    fetch_query = fetch_query.bind(page_size).bind(offset);

    let schedules = match fetch_query.fetch_all(&state.pool).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to fetch production schedules: {}", e);
            return Json(ApiResponse::error(500, "获取生产排产列表失败"));
        }
    };

    let schedules_list: Vec<ProductionScheduleResponse> = schedules
        .into_iter()
        .map(|r| ProductionScheduleResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
            schedule_no: r.try_get::<String, _>("schedule_no").unwrap_or_default(),
            order_id: r.try_get::<Option<Uuid>, _>("order_id").ok().flatten(),
            order_no: r.try_get::<Option<String>, _>("order_no").ok().flatten(),
            product_id: r.try_get::<Option<Uuid>, _>("product_id").ok().flatten(),
            product_name: r.try_get::<String, _>("product_name").unwrap_or_default(),
            product_code: r.try_get::<String, _>("product_code").unwrap_or_default(),
            quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("quantity")
                    .ok()
                    .flatten(),
            ),
            work_station_id: r
                .try_get::<Option<Uuid>, _>("work_station_id")
                .ok()
                .flatten(),
            work_station_name: r
                .try_get::<Option<String>, _>("work_station_name")
                .ok()
                .flatten(),
            equipment_id: r.try_get::<Option<Uuid>, _>("equipment_id").ok().flatten(),
            equipment_name: r
                .try_get::<Option<String>, _>("equipment_name")
                .ok()
                .flatten(),
            process_id: r.try_get::<Option<Uuid>, _>("process_id").ok().flatten(),
            process_name: r
                .try_get::<Option<String>, _>("process_name")
                .ok()
                .flatten(),
            planned_start_time: opt_naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("planned_start_time")
                    .ok()
                    .flatten(),
            ),
            planned_end_time: opt_naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("planned_end_time")
                    .ok()
                    .flatten(),
            ),
            actual_start_time: opt_naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("actual_start_time")
                    .ok()
                    .flatten(),
            ),
            actual_end_time: opt_naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("actual_end_time")
                    .ok()
                    .flatten(),
            ),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "pending".to_string()),
            priority: r
                .try_get::<Option<i32>, _>("priority")
                .ok()
                .flatten()
                .unwrap_or(0),
            sequence: r
                .try_get::<Option<i32>, _>("sequence")
                .ok()
                .flatten()
                .unwrap_or(0),
            notes: r.try_get::<Option<String>, _>("notes").ok().flatten(),
            created_at: naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("created_at")
                    .ok()
                    .flatten(),
            ),
            updated_at: naive_to_utc(
                r.try_get::<Option<DateTime<Utc>>, _>("updated_at")
                    .ok()
                    .flatten(),
            ),
        })
        .collect();

    Json(ApiResponse::success(
        ListProductionSchedulesResponse {
            schedules: schedules_list,
            total: total.unwrap_or(0),
            page,
            page_size,
        },
        "获取生产排产列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/schedules",
    tag = "ProductionScheduling",
    request_body = CreateProductionScheduleRequest,
    responses(
        (status = 200, description = "排产创建成功", body = ApiResponse<ProductionScheduleResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_production_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateProductionScheduleRequest>,
) -> Json<ApiResponse<ProductionScheduleResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingWrite,
    )
    .await
    {
        return e;
    }

    let now = Utc::now();
    let schedule_no = format!(
        "PS{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let order_no = if let Some(order_id) = req.order_id {
        let order = sqlx::query!(
            r#"SELECT order_number AS order_no FROM production_orders WHERE id = $1"#,
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

    let order_no_flat = order_no;
    let order_no_arg = order_no_flat.and_then(|x| x);
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
        order_no_arg,
        req.product_id,
        req.product_name,
        req.product_code,
        BigDecimal::from_str(&req.quantity.to_string()).unwrap_or_default(),
        req.work_station_id,
        req.equipment_id,
        req.process_id,
        req.planned_start_time,
        req.planned_end_time,
        req.priority.unwrap_or(0),
        req.sequence.unwrap_or(0),
        req.notes,
        now,
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
        order_no: Some(result.order_no.unwrap_or_default()),
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
        planned_start_time: result.planned_start_time.map(|d| d),
        planned_end_time: result.planned_end_time.map(|d| d),
        actual_start_time: result.actual_start_time.map(|d| d),
        actual_end_time: result.actual_end_time.map(|d| d),
        status: result.status.unwrap_or_else(|| "pending".to_string()),
        priority: result.priority.unwrap_or(0),
        sequence: result.sequence.unwrap_or(0),
        notes: result.notes,
        created_at: result.created_at.unwrap_or_default(),        updated_at: result.updated_at.unwrap_or_default(),
    };

    Json(ApiResponse::success(schedule, "生产排产创建成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:production:read"])),
    path = "/api/mes/schedules/{id}",
    tag = "ProductionScheduling",
    params(
        ("id" = Uuid, Path, description = "排产ID"),
    ),
    responses(
        (status = 200, description = "排产详情", body = ApiResponse<ProductionScheduleResponse>),
        (status = 404, description = "排产不存在"),
    ),
)]
pub async fn get_production_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionScheduleResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingRead,
    )
    .await
    {
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
            ps.created_at.unwrap_or_default(), ps.updated_at.unwrap_or_default(),
            ws.station_name as work_station_name,
            e.equipment_name as equipment_name,
            pp.process_name as process_name
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
                product_code: r.product_code.unwrap_or_default(),
                quantity: big_decimal_to_f64(Some(r.quantity)),
                work_station_id: r.work_station_id,
                work_station_name: Some(r.work_station_name),
                equipment_id: Some(r.equipment_id.unwrap_or_default()),
                equipment_name: Some(r.equipment_name),
                process_id: r.process_id,
                process_name: Some(r.process_name),
                planned_start_time: r.planned_start_time.map(|d| d),
                planned_end_time: r.planned_end_time.map(|d| d),
                actual_start_time: r.actual_start_time.map(|d| d),
                actual_end_time: r.actual_end_time.map(|d| d),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                priority: r.priority.unwrap_or(0),
                sequence: r.sequence.unwrap_or(0),
                notes: r.notes,
                created_at: r.created_at.unwrap_or_default(),
                updated_at: r.updated_at.unwrap_or_default(),
            };
            Json(ApiResponse::success(schedule, "获取生产排产成功"))
        }
        None => Json(ApiResponse::error(404, "生产排产不存在")),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/schedules/{id}",
    tag = "ProductionScheduling",
    params(
        ("id" = Uuid, Path, description = "排产ID"),
    ),
    request_body = UpdateProductionScheduleRequest,
    responses(
        (status = 200, description = "排产更新成功", body = ApiResponse<ProductionScheduleResponse>),
        (status = 404, description = "排产不存在"),
    ),
)]
pub async fn update_production_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProductionScheduleRequest>,
) -> Json<ApiResponse<ProductionScheduleResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingWrite,
    )
    .await
    {
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
        req.planned_start_time,
        req.planned_end_time,
        req.priority,
        req.sequence,
        req.status,
        req.notes,
        Utc::now(),
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
                equipment_id: Some(r.equipment_id.unwrap_or_default()),
                equipment_name: None,
                process_id: r.process_id,
                process_name: None,
                planned_start_time: r.planned_start_time.map(|d| d),
                planned_end_time: r.planned_end_time.map(|d| d),
                actual_start_time: r.actual_start_time.map(|d| d),
                actual_end_time: r.actual_end_time.map(|d| d),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                priority: r.priority.unwrap_or(0),
                sequence: r.sequence.unwrap_or(0),
                notes: r.notes,
                created_at: r.created_at.unwrap_or_default(),
                updated_at: r.updated_at.unwrap_or_default(),
            };
            Json(ApiResponse::success(schedule, "生产排产更新成功"))
        }
        None => Json(ApiResponse::error(404, "生产排产不存在")),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/schedules/{id}",
    tag = "ProductionScheduling",
    params(
        ("id" = Uuid, Path, description = "排产ID"),
    ),
    responses(
        (status = 200, description = "排产删除成功"),
        (status = 404, description = "排产不存在"),
    ),
)]
pub async fn delete_production_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingWrite,
    )
    .await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        UPDATE production_schedules SET deleted_at = NOW()
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:update"])),
    path = "/api/mes/schedules/{id}/adjust",
    tag = "ProductionScheduling",
    params(
        ("id" = Uuid, Path, description = "排产ID"),
    ),
    request_body = AdjustScheduleRequest,
    responses(
        (status = 200, description = "排产调整成功"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn adjust_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(_id): Path<String>,
    Json(req): Json<AdjustScheduleRequest>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingAdjust,
    )
    .await
    {
        return e;
    }

    let now = Utc::now();

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
            req.new_start_time,
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:read"])),
    path = "/api/mes/schedules/gantt",
    tag = "ProductionScheduling",
    responses(
        (status = 200, description = "甘特图数据", body = ApiResponse<GanttDataResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_gantt_data(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<GanttDataResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionSchedulingRead,
    )
    .await
    {
        return e;
    }

    let schedules = sqlx::query!(
        r#"
        SELECT 
            ps.id, ps.schedule_no, ps.product_name,
            ps.planned_start_time, ps.planned_end_time,
            ps.actual_start_time, ps.actual_end_time,
            ps.status, ps.quantity, ps.completed_quantity,
            ws.station_name as work_station_name
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
        let start = s.planned_start_time.map(|d| d).unwrap_or_else(Utc::now);
        let end = s
            .planned_end_time
            .map(|d| d)
            .unwrap_or_else(|| Utc::now() + chrono::Duration::hours(1));

        let total = big_decimal_to_f64(Some(s.quantity.clone()));
        let completed = big_decimal_to_f64(s.completed_quantity.clone());
        let progress = if total > 0.0 {
            (completed / total) * 100.0
        } else {
            0.0
        };

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
            name: format!(
                "{} - {}",
                s.schedule_no.clone().to_string(),
                s.product_name.clone().to_string()
            ),
            start,
            end,
            progress,
            status: s.status.clone().unwrap_or_else(|| "pending".to_string()),
            resource: Some(resource_name),
            parent: None,
        });
    }

    Json(ApiResponse::success(
        GanttDataResponse { tasks, resources },
        "获取甘特图数据成功",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;
    use chrono::{Datelike, NaiveDate, Timelike};

    // ---- naive_to_utc ----
    #[test]
    fn naive_to_utc_some_keeps_value() {
        let dt = Utc.with_ymd_and_hms(2024, 9, 10, 14, 20, 0).unwrap();
        let utc = naive_to_utc(Some(dt));
        assert_eq!(utc.year(), 2024);
        assert_eq!(utc.month(), 9);
        assert_eq!(utc.day(), 10);
        assert_eq!(utc.hour(), 14);
        assert_eq!(utc.minute(), 20);
    }

    #[test]
    fn naive_to_utc_none_uses_now() {
        let before = Utc::now();
        let out = naive_to_utc(None);
        let after = Utc::now();
        assert!(out >= before && out <= after);
    }

    // ---- opt_naive_to_utc ----
    #[test]
    fn opt_naive_to_utc_some() {
        let dt = Utc.with_ymd_and_hms(2024, 2, 28, 23, 59, 59).unwrap();
        let r = opt_naive_to_utc(Some(dt)).unwrap();
        assert_eq!(r.year(), 2024);
        assert_eq!(r.month(), 2);
        assert_eq!(r.day(), 28);
        assert_eq!(r.hour(), 23);
        assert_eq!(r.second(), 59);
    }

    #[test]
    fn opt_naive_to_utc_none() {
        assert!(opt_naive_to_utc(None).is_none());
    }

    // ---- big_decimal_to_f64 ----
    #[test]
    fn big_decimal_to_f64_some() {
        let bd: BigDecimal = "99.99".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 99.99);
    }

    #[test]
    fn big_decimal_to_f64_none() {
        assert_eq!(big_decimal_to_f64(None), 0.0);
    }

    #[test]
    fn big_decimal_to_f64_large() {
        let bd: BigDecimal = "1234567.89".parse().unwrap();
        assert_eq!(big_decimal_to_f64(Some(bd)), 1234567.89);
    }
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ScheduleActionRequest {
    pub operator: Option<String>,
    pub comment: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ScheduleActionResponse {
    pub success: bool,
    pub message: String,
    pub id: Option<Uuid>,
}

async fn transition_schedule(
    state: &AppState,
    claims: &Claims,
    id: Uuid,
    to_status: &str,
    comment: Option<String>,
) -> Json<ApiResponse<ScheduleActionResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        claims,
        &ModulePermission::ProductionSchedulingWrite,
    )
    .await
    {
        return e;
    }

    let tenant_id = get_schedule_tenant_id(claims);

    let existing: Option<(String,)> = match sqlx::query_as(
        "SELECT status FROM production_schedules WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(row)) => Some(row),
        Ok(None) => None,
        Err(e) => {
            tracing::error!("查询排产单状态失败: {}", e);
            return Json(ApiResponse::error(500, "查询排产单状态失败"));
        }
    };

    let Some((current_status,)) = existing else {
        return Json(ApiResponse::error(404, "排产单不存在"));
    };

    if let Err(_e) = schedule_can_transition(&current_status, to_status) {
        return Json(ApiResponse::error(
            409,
            &format!("当前状态 {} 不允许切换到 {}", current_status, to_status),
        ));
    }

    let now = Utc::now();
    let updated = sqlx::query(
        "UPDATE production_schedules SET status = $1, notes = COALESCE($2, notes), updated_at = $3 WHERE id = $4 AND tenant_id = $5 AND deleted_at IS NULL",
    )
    .bind(to_status)
    .bind(&comment)
    .bind(now)
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match updated {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            ScheduleActionResponse {
                success: true,
                message: format!("排产单已{}", to_status),
                id: Some(id),
            },
            "操作成功",
        )),
        Ok(_) => Json(ApiResponse::error(404, "排产单不存在")),
        Err(e) => {
            tracing::error!("更新排产单状态失败: {}", e);
            Json(ApiResponse::error(500, "更新排产单状态失败"))
        }
    }
}

fn get_schedule_tenant_id(claims: &Claims) -> Uuid {
    match &claims.tenant_id {
        Some(t) => Uuid::parse_str(t)
            .unwrap_or_else(|_| Uuid::from_str("00000000-0000-0000-0000-000000000000").unwrap()),
        None => Uuid::from_str("00000000-0000-0000-0000-000000000000").unwrap(),
    }
}

pub async fn submit_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ScheduleActionRequest>,
) -> Json<ApiResponse<ScheduleActionResponse>> {
    transition_schedule(&state, &claims, id, "released", req.comment).await
}

pub async fn release_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ScheduleActionRequest>,
) -> Json<ApiResponse<ScheduleActionResponse>> {
    transition_schedule(&state, &claims, id, "released", req.comment).await
}

pub async fn hold_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ScheduleActionRequest>,
) -> Json<ApiResponse<ScheduleActionResponse>> {
    transition_schedule(&state, &claims, id, "pending", req.comment).await
}

pub async fn start_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ScheduleActionRequest>,
) -> Json<ApiResponse<ScheduleActionResponse>> {
    transition_schedule(&state, &claims, id, "running", req.comment).await
}

pub async fn complete_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ScheduleActionRequest>,
) -> Json<ApiResponse<ScheduleActionResponse>> {
    transition_schedule(&state, &claims, id, "completed", req.comment).await
}

pub async fn cancel_schedule(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ScheduleActionRequest>,
) -> Json<ApiResponse<ScheduleActionResponse>> {
    transition_schedule(&state, &claims, id, "cancelled", req.comment).await
}
