use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, put},
    Json, Router,
};
use chrono::{DateTime, NaiveDateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{
    types::{BigDecimal, Uuid},
    Row,
};
use std::str::FromStr;
use topems_shared_auth::auth::Claims;
use utoipa::ToSchema;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/work-orders",
            get(list_work_orders).post(create_work_order),
        )
        .route(
            "/work-orders/{id}",
            get(get_work_order)
                .put(update_work_order)
                .delete(delete_work_order),
        )
        .route("/work-orders/{id}/start", put(start_work_order))
        .route("/work-orders/{id}/complete", put(complete_work_order))
        .route("/work-orders/{id}/cancel", put(cancel_work_order))
        .route("/work-orders/{id}/pause", put(pause_work_order))
        .route("/work-orders/{id}/resume", put(resume_work_order))
}

// ==================== Request / Response Types ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListWorkOrdersQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateWorkOrderRequest {
    pub work_order_no: String,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub product_code: String,
    pub product_name: String,
    pub work_station_id: Option<String>,
    pub process_id: Option<String>,
    pub planned_quantity: f64,
    pub plan_start_date: Option<String>,
    pub plan_end_date: Option<String>,
    pub team_id: Option<String>,
    pub operator: Option<String>,
    pub priority: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateWorkOrderRequest {
    pub work_order_no: Option<String>,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub product_code: Option<String>,
    pub product_name: Option<String>,
    pub work_station_id: Option<String>,
    pub process_id: Option<String>,
    pub planned_quantity: Option<f64>,
    pub completed_quantity: Option<f64>,
    pub plan_start_date: Option<String>,
    pub plan_end_date: Option<String>,
    pub team_id: Option<String>,
    pub operator: Option<String>,
    pub priority: Option<String>,
    pub remark: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct WorkOrderResponse {
    pub id: String,
    pub work_order_no: String,
    pub order_id: Option<String>,
    pub order_no: Option<String>,
    pub product_code: String,
    pub product_name: String,
    pub work_station_id: Option<String>,
    pub process_id: Option<String>,
    pub planned_quantity: f64,
    pub completed_quantity: f64,
    pub plan_start_date: Option<String>,
    pub plan_end_date: Option<String>,
    pub actual_start_date: Option<String>,
    pub actual_end_date: Option<String>,
    pub team_id: Option<String>,
    pub operator: Option<String>,
    pub status: String,
    pub priority: Option<String>,
    pub remark: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

// ==================== Helper Functions ====================

fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    match dt {
        Some(d) => d,
        None => Utc::now(),
    }
}

fn datetime_to_string(dt: Option<DateTime<Utc>>) -> String {
    dt.map(|d| d.to_rfc3339()).unwrap_or_default()
}

fn opt_datetime_to_string(dt: Option<DateTime<Utc>>) -> Option<String> {
    dt.map(|d| d.to_rfc3339())
}

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
        .unwrap_or(0.0)
}

fn parse_datetime(s: &str) -> Option<DateTime<Utc>> {
    DateTime::parse_from_rfc3339(s)
        .ok()
        .map(|dt| dt.naive_utc())
        .or_else(|| NaiveDateTime::parse_from_str(s, "%Y-%m-%dT%H:%M:%S%.f").map(|dt| dt.and_utc()).ok())
        .or_else(|| NaiveDateTime::parse_from_str(s, "%Y-%m-%d %H:%M:%S").map(|dt| dt.and_utc()).ok())
}

fn parse_opt_uuid(s: &Option<String>) -> Option<Uuid> {
    s.as_ref().and_then(|id| Uuid::parse_str(id).ok())
}

fn parse_opt_datetime(s: &Option<String>) -> Option<DateTime<Utc>> {
    s.as_ref().and_then(|d| parse_datetime(d))
}

fn parse_opt_big_decimal(v: &Option<f64>) -> Option<BigDecimal> {
    v.and_then(|x| BigDecimal::from_str(&x.to_string()).ok())
}

// ==================== Handlers ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:workorder:read"])),
    path = "/api/mes/work-orders",
    tag = "WorkOrder",
    params(
        ("page" = Option<i32>, Query, description = "页码"),
        ("pagesize" = Option<i32>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态过滤"),
    ),
    responses(
        (status = 200, description = "工单列表", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_work_orders(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListWorkOrdersQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE wo.deleted_at IS NULL");

    if let Some(status) = query.status {
        where_clause.push_str(" AND wo.status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(
                " WHERE (wo.work_order_no ILIKE $1 OR wo.order_no ILIKE $1 OR wo.product_code ILIKE $1 OR wo.product_name ILIKE $1)",
            );
        } else {
            let idx = params.len() + 1;
            where_clause.push_str(&format!(
                " AND (wo.work_order_no ILIKE ${idx} OR wo.order_no ILIKE ${idx} OR wo.product_code ILIKE ${idx} OR wo.product_name ILIKE ${idx})",
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM mes.work_orders wo{}",
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
            tracing::error!("Failed to count work orders: {}", e);
            return Json(ApiResponse::error(500, "获取工单列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            wo.id, wo.work_order_no, wo.order_id, wo.order_no,
            wo.product_code, wo.product_name,
            wo.work_station_id, wo.process_id,
            wo.planned_quantity, wo.completed_quantity,
            wo.plan_start_date, wo.plan_end_date,
            wo.actual_start_date, wo.actual_end_date,
            wo.team_id, wo.operator,
            wo.status, wo.priority, wo.remark,
            wo.created_at, wo.updated_at
        FROM mes.work_orders wo
        {}
        ORDER BY wo.created_at DESC
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
    fetch_query = fetch_query.bind(pagesize).bind(offset);

    let rows = match fetch_query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch work orders: {}", e);
            return Json(ApiResponse::error(500, "获取工单列表失败"));
        }
    };

    let orders: Vec<WorkOrderResponse> = rows
        .into_iter()
        .map(|r| WorkOrderResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default().to_string(),
            work_order_no: r.try_get::<String, _>("work_order_no").unwrap_or_default(),
            order_id: r
                .try_get::<Option<Uuid>, _>("order_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            order_no: r.try_get::<Option<String>, _>("order_no").ok().flatten(),
            product_code: r.try_get::<String, _>("product_code").unwrap_or_default(),
            product_name: r.try_get::<String, _>("product_name").unwrap_or_default(),
            work_station_id: r
                .try_get::<Option<Uuid>, _>("work_station_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            process_id: r
                .try_get::<Option<Uuid>, _>("process_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            planned_quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("planned_quantity")
                    .ok()
                    .flatten(),
            ),
            completed_quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("completed_quantity")
                    .ok()
                    .flatten(),
            ),
            plan_start_date: opt_datetime_to_string(
                r.try_get::<Option<DateTime<Utc>>, _>("plan_start_date")
                    .ok()
                    .flatten(),
            ),
            plan_end_date: opt_datetime_to_string(
                r.try_get::<Option<DateTime<Utc>>, _>("plan_end_date")
                    .ok()
                    .flatten(),
            ),
            actual_start_date: opt_datetime_to_string(
                r.try_get::<Option<DateTime<Utc>>, _>("actual_start_date")
                    .ok()
                    .flatten(),
            ),
            actual_end_date: opt_datetime_to_string(
                r.try_get::<Option<DateTime<Utc>>, _>("actual_end_date")
                    .ok()
                    .flatten(),
            ),
            team_id: r
                .try_get::<Option<Uuid>, _>("team_id")
                .ok()
                .flatten()
                .map(|u| u.to_string()),
            operator: r.try_get::<Option<String>, _>("operator").ok().flatten(),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "pending".to_string()),
            priority: r.try_get::<Option<String>, _>("priority").ok().flatten(),
            remark: r.try_get::<Option<String>, _>("remark").ok().flatten(),
            created_at: datetime_to_string(
                r.try_get::<Option<DateTime<Utc>>, _>("created_at")
                    .ok()
                    .flatten(),
            ),
            updated_at: datetime_to_string(
                r.try_get::<Option<DateTime<Utc>>, _>("updated_at")
                    .ok()
                    .flatten(),
            ),
        })
        .collect();

    Json(ApiResponse::success(
        serde_json::json!({
            "work_orders": orders,
            "total": total.unwrap_or(0),
            "page": page,
            "page_size": pagesize,
        }),
        "获取工单列表成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["mes:workorder:read"])),
    path = "/api/mes/work-orders/{id}",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    responses(
        (status = 200, description = "工单详情", body = ApiResponse<WorkOrderResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<WorkOrderResponse>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::WorkStationRead).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工单ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        SELECT 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        FROM mes.work_orders
        WHERE id = $1
        "#,
        uuid,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(r)) => Json(ApiResponse::success(
            WorkOrderResponse {
                id: r.id.to_string(),
                work_order_no: r.work_order_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_no: r.order_no,
                product_code: r.product_code.unwrap_or_default(),
                product_name: r.product_name,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                process_id: r.process_id.map(|u| u.to_string()),
                planned_quantity: big_decimal_to_f64(r.planned_quantity),
                completed_quantity: big_decimal_to_f64(r.completed_quantity),
                plan_start_date: opt_datetime_to_string(r.plan_start_date),
                plan_end_date: opt_datetime_to_string(r.plan_end_date),
                actual_start_date: opt_datetime_to_string(r.actual_start_date),
                actual_end_date: opt_datetime_to_string(r.actual_end_date),
                team_id: r.team_id.map(|u| u.to_string()),
                operator: r.operator,
                status: r.status.unwrap_or_default(),
                priority: r.priority.map(|v| v.to_string()),
                remark: r.remark,
                created_at: r.created_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
                updated_at: r.updated_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
            },
            "获取工单成功",
        )),
        Ok(None) => Json(ApiResponse::error(404, "工单不存在")),
        Err(e) => {
            tracing::error!("Failed to get work order: {}", e);
            Json(ApiResponse::error(500, "获取工单失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:workorder:write"])),
    path = "/api/mes/work-orders",
    tag = "WorkOrder",
    request_body = CreateWorkOrderRequest,
    responses(
        (status = 200, description = "工单创建成功", body = ApiResponse<WorkOrderResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateWorkOrderRequest>,
) -> Json<ApiResponse<WorkOrderResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let order_id = parse_opt_uuid(&body.order_id);
    let work_station_id = parse_opt_uuid(&body.work_station_id);
    let process_id = parse_opt_uuid(&body.process_id);
    let team_id = parse_opt_uuid(&body.team_id);
    let plan_start_date = parse_opt_datetime(&body.plan_start_date);
    let plan_end_date = parse_opt_datetime(&body.plan_end_date);
    let planned_quantity =
        BigDecimal::from_str(&body.planned_quantity.to_string()).unwrap_or_default();
    let priority = body.priority.unwrap_or_else(|| "normal".to_string());

    let result = sqlx::query!(
        r#"
        INSERT INTO work_orders (
            work_order_no, order_id, order_no, product_code, product_name,
            work_station_id, process_id,
            planned_quantity,
            plan_start_date, plan_end_date,
            team_id, operator,
            status, priority, remark
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13, $14)
        RETURNING 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        "#,
        body.work_order_no,
        order_id,
        body.order_no,
        body.product_code,
        body.product_name,
        work_station_id,
        process_id,
        planned_quantity,
        plan_start_date,
        plan_end_date,
        team_id,
        body.operator,
        priority.parse::<i32>().unwrap_or(0),
        body.remark,
    )
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(
            WorkOrderResponse {
                id: r.id.to_string(),
                work_order_no: r.work_order_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_no: r.order_no,
                product_code: r.product_code,
                product_name: r.product_name,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                process_id: r.process_id.map(|u| u.to_string()),
                planned_quantity: big_decimal_to_f64(Some(r.planned_quantity)),
                completed_quantity: big_decimal_to_f64(Some(r.completed_quantity)),
                plan_start_date: opt_datetime_to_string(r.plan_start_date),
                plan_end_date: opt_datetime_to_string(r.plan_end_date),
                actual_start_date: opt_datetime_to_string(r.actual_start_date),
                actual_end_date: opt_datetime_to_string(r.actual_end_date),
                team_id: r.team_id.map(|u| u.to_string()),
                operator: r.operator,
                status: r.status,
                priority: r.priority.map(|v| v.to_string()),
                remark: r.remark,
                created_at: r.created_at.and_utc().to_rfc3339(),
                updated_at: r.updated_at.and_utc().to_rfc3339(),
            },
            "创建工单成功",
        )),
        Err(e) => {
            if let Some(db_err) = e.as_database_error() {
                if db_err.is_unique_violation() {
                    return Json(ApiResponse::error(409, "工单号已存在"));
                }
            }
            tracing::error!("Failed to create work order: {}", e);
            Json(ApiResponse::error(500, "创建工单失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:workorder:write"])),
    path = "/api/mes/work-orders/{id}",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    request_body = UpdateWorkOrderRequest,
    responses(
        (status = 200, description = "工单更新成功", body = ApiResponse<WorkOrderResponse>),
        (status = 404, description = "工单不存在"),
    ),
)]
pub async fn update_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(body): Json<UpdateWorkOrderRequest>,
) -> Json<ApiResponse<WorkOrderResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工单ID"));
        }
    };

    let order_id = parse_opt_uuid(&body.order_id);
    let work_station_id = parse_opt_uuid(&body.work_station_id);
    let process_id = parse_opt_uuid(&body.process_id);
    let team_id = parse_opt_uuid(&body.team_id);
    let plan_start_date = parse_opt_datetime(&body.plan_start_date);
    let plan_end_date = parse_opt_datetime(&body.plan_end_date);
    let planned_quantity = parse_opt_big_decimal(&body.planned_quantity);
    let completed_quantity = parse_opt_big_decimal(&body.completed_quantity);

    let result = sqlx::query!(
        r#"
        UPDATE mes.work_orders
        SET 
            work_order_no = COALESCE($1, work_order_no),
            order_id = COALESCE($2, order_id),
            order_no = COALESCE($3, order_no),
            product_code = COALESCE($4, product_code),
            product_name = COALESCE($5, product_name),
            work_station_id = COALESCE($6, work_station_id),
            process_id = COALESCE($7, process_id),
            planned_quantity = COALESCE($8, planned_quantity),
            completed_quantity = COALESCE($9, completed_quantity),
            plan_start_date = COALESCE($10, plan_start_date),
            plan_end_date = COALESCE($11, plan_end_date),
            team_id = COALESCE($12, team_id),
            operator = COALESCE($13, operator),
            priority = COALESCE($14, priority),
            remark = COALESCE($15, remark),
            updated_at = NOW()
        WHERE id = $16
        RETURNING 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        "#,
        body.work_order_no,
        order_id,
        body.order_no,
        body.product_code,
        body.product_name,
        work_station_id,
        process_id,
        planned_quantity,
        completed_quantity,
        plan_start_date,
        plan_end_date,
        team_id,
        body.operator,
        body.priority.map(|v| v.parse::<i32>().unwrap_or(0)),
        body.remark,
        uuid,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(r)) => Json(ApiResponse::success(
            WorkOrderResponse {
                id: r.id.to_string(),
                work_order_no: r.work_order_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_no: r.order_no,
                product_code: r.product_code.unwrap_or_default(),
                product_name: r.product_name,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                process_id: r.process_id.map(|u| u.to_string()),
                planned_quantity: big_decimal_to_f64(r.planned_quantity),
                completed_quantity: big_decimal_to_f64(r.completed_quantity),
                plan_start_date: opt_datetime_to_string(r.plan_start_date),
                plan_end_date: opt_datetime_to_string(r.plan_end_date),
                actual_start_date: opt_datetime_to_string(r.actual_start_date),
                actual_end_date: opt_datetime_to_string(r.actual_end_date),
                team_id: r.team_id.map(|u| u.to_string()),
                operator: r.operator,
                status: r.status.unwrap_or_default(),
                priority: r.priority.map(|v| v.to_string()),
                remark: r.remark,
                created_at: r.created_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
                updated_at: r.updated_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
            },
            "更新工单成功",
        )),
        Ok(None) => Json(ApiResponse::error(404, "工单不存在")),
        Err(e) => {
            if let Some(db_err) = e.as_database_error() {
                if db_err.is_unique_violation() {
                    return Json(ApiResponse::error(409, "工单号已存在"));
                }
            }
            tracing::error!("Failed to update work order: {}", e);
            Json(ApiResponse::error(500, "更新工单失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["mes:workorder:write"])),
    path = "/api/mes/work-orders/{id}",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    responses(
        (status = 200, description = "工单删除成功"),
        (status = 404, description = "工单不存在"),
    ),
)]
pub async fn delete_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<String>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工单ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE mes.work_orders SET deleted_at = NOW()
        WHERE id = $1 AND status IN ('pending', 'cancelled')
        "#,
        uuid,
    )
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) => {
            if r.rows_affected() > 0 {
                Json(ApiResponse::success(id, "删除工单成功"))
            } else {
                Json(ApiResponse::error(404, "工单不存在或状态不允许删除"))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete work order: {}", e);
            Json(ApiResponse::error(500, "删除工单失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:workorder:write"])),
    path = "/api/mes/work-orders/{id}/start",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    responses(
        (status = 200, description = "工单开始成功", body = ApiResponse<WorkOrderResponse>),
        (status = 404, description = "工单不存在"),
    ),
)]
pub async fn start_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<WorkOrderResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工单ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE mes.work_orders
        SET status = 'in_progress', actual_start_date = NOW(), updated_at = NOW()
        WHERE id = $1 AND status = 'pending'
        RETURNING 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        "#,
        uuid,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(r)) => Json(ApiResponse::success(
            WorkOrderResponse {
                id: r.id.to_string(),
                work_order_no: r.work_order_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_no: r.order_no,
                product_code: r.product_code.unwrap_or_default(),
                product_name: r.product_name,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                process_id: r.process_id.map(|u| u.to_string()),
                planned_quantity: big_decimal_to_f64(r.planned_quantity),
                completed_quantity: big_decimal_to_f64(r.completed_quantity),
                plan_start_date: opt_datetime_to_string(r.plan_start_date),
                plan_end_date: opt_datetime_to_string(r.plan_end_date),
                actual_start_date: opt_datetime_to_string(r.actual_start_date),
                actual_end_date: opt_datetime_to_string(r.actual_end_date),
                team_id: r.team_id.map(|u| u.to_string()),
                operator: r.operator,
                status: r.status.unwrap_or_default(),
                priority: r.priority.map(|v| v.to_string()),
                remark: r.remark,
                created_at: r.created_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
                updated_at: r.updated_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
            },
            "开始工单成功",
        )),
        Ok(None) => Json(ApiResponse::error(
            404,
            "工单不存在或状态不允许开始（仅 pending 状态可开始）",
        )),
        Err(e) => {
            tracing::error!("Failed to start work order: {}", e);
            Json(ApiResponse::error(500, "开始工单失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:workorder:write"])),
    path = "/api/mes/work-orders/{id}/complete",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    responses(
        (status = 200, description = "工单完成成功", body = ApiResponse<WorkOrderResponse>),
        (status = 404, description = "工单不存在"),
    ),
)]
pub async fn complete_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<WorkOrderResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工单ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE mes.work_orders
        SET status = 'completed', actual_end_date = NOW(), updated_at = NOW()
        WHERE id = $1 AND status = 'in_progress'
        RETURNING 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        "#,
        uuid,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(r)) => Json(ApiResponse::success(
            WorkOrderResponse {
                id: r.id.to_string(),
                work_order_no: r.work_order_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_no: r.order_no,
                product_code: r.product_code.unwrap_or_default(),
                product_name: r.product_name,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                process_id: r.process_id.map(|u| u.to_string()),
                planned_quantity: big_decimal_to_f64(r.planned_quantity),
                completed_quantity: big_decimal_to_f64(r.completed_quantity),
                plan_start_date: opt_datetime_to_string(r.plan_start_date),
                plan_end_date: opt_datetime_to_string(r.plan_end_date),
                actual_start_date: opt_datetime_to_string(r.actual_start_date),
                actual_end_date: opt_datetime_to_string(r.actual_end_date),
                team_id: r.team_id.map(|u| u.to_string()),
                operator: r.operator,
                status: r.status.unwrap_or_default(),
                priority: r.priority.map(|v| v.to_string()),
                remark: r.remark,
                created_at: r.created_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
                updated_at: r.updated_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
            },
            "完成工单成功",
        )),
        Ok(None) => Json(ApiResponse::error(
            404,
            "工单不存在或状态不允许完成（仅 in_progress 状态可完成）",
        )),
        Err(e) => {
            tracing::error!("Failed to complete work order: {}", e);
            Json(ApiResponse::error(500, "完成工单失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:workorder:write"])),
    path = "/api/mes/work-orders/{id}/cancel",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    responses(
        (status = 200, description = "工单取消成功", body = ApiResponse<WorkOrderResponse>),
        (status = 404, description = "工单不存在"),
    ),
)]
pub async fn cancel_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<WorkOrderResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工单ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE mes.work_orders
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1 AND status IN ('pending', 'in_progress', 'paused')
        RETURNING 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        "#,
        uuid,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(r)) => Json(ApiResponse::success(
            WorkOrderResponse {
                id: r.id.to_string(),
                work_order_no: r.work_order_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_no: r.order_no,
                product_code: r.product_code.unwrap_or_default(),
                product_name: r.product_name,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                process_id: r.process_id.map(|u| u.to_string()),
                planned_quantity: big_decimal_to_f64(r.planned_quantity),
                completed_quantity: big_decimal_to_f64(r.completed_quantity),
                plan_start_date: opt_datetime_to_string(r.plan_start_date),
                plan_end_date: opt_datetime_to_string(r.plan_end_date),
                actual_start_date: opt_datetime_to_string(r.actual_start_date),
                actual_end_date: opt_datetime_to_string(r.actual_end_date),
                team_id: r.team_id.map(|u| u.to_string()),
                operator: r.operator,
                status: r.status.unwrap_or_default(),
                priority: r.priority.map(|v| v.to_string()),
                remark: r.remark,
                created_at: r.created_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
                updated_at: r.updated_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
            },
            "取消工单成功",
        )),
        Ok(None) => Json(ApiResponse::error(
            404,
            "工单不存在或状态不允许取消（已完成/已取消的工单不可取消）",
        )),
        Err(e) => {
            tracing::error!("Failed to cancel work order: {}", e);
            Json(ApiResponse::error(500, "取消工单失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:workorder:write"])),
    path = "/api/mes/work-orders/{id}/pause",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    responses(
        (status = 200, description = "工单暂停成功", body = ApiResponse<WorkOrderResponse>),
        (status = 404, description = "工单不存在"),
    ),
)]
pub async fn pause_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<WorkOrderResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工单ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE mes.work_orders
        SET status = 'paused', updated_at = NOW()
        WHERE id = $1 AND status = 'in_progress'
        RETURNING 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        "#,
        uuid,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(r)) => Json(ApiResponse::success(
            WorkOrderResponse {
                id: r.id.to_string(),
                work_order_no: r.work_order_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_no: r.order_no,
                product_code: r.product_code.unwrap_or_default(),
                product_name: r.product_name,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                process_id: r.process_id.map(|u| u.to_string()),
                planned_quantity: big_decimal_to_f64(r.planned_quantity),
                completed_quantity: big_decimal_to_f64(r.completed_quantity),
                plan_start_date: opt_datetime_to_string(r.plan_start_date),
                plan_end_date: opt_datetime_to_string(r.plan_end_date),
                actual_start_date: opt_datetime_to_string(r.actual_start_date),
                actual_end_date: opt_datetime_to_string(r.actual_end_date),
                team_id: r.team_id.map(|u| u.to_string()),
                operator: r.operator,
                status: r.status.unwrap_or_default(),
                priority: r.priority.map(|v| v.to_string()),
                remark: r.remark,
                created_at: r.created_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
                updated_at: r.updated_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
            },
            "暂停工单成功",
        )),
        Ok(None) => Json(ApiResponse::error(
            404,
            "工单不存在或状态不允许暂停（仅 in_progress 状态可暂停）",
        )),
        Err(e) => {
            tracing::error!("Failed to pause work order: {}", e);
            Json(ApiResponse::error(500, "暂停工单失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:workorder:write"])),
    path = "/api/mes/work-orders/{id}/resume",
    tag = "WorkOrder",
    params(
        ("id" = String, Path, description = "工单ID"),
    ),
    responses(
        (status = 200, description = "工单恢复成功", body = ApiResponse<WorkOrderResponse>),
        (status = 404, description = "工单不存在"),
    ),
)]
pub async fn resume_work_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<WorkOrderResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::WorkStationWrite).await
    {
        return e;
    }

    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return Json(ApiResponse::error(400, "无效的工单ID"));
        }
    };

    let result = sqlx::query!(
        r#"
        UPDATE mes.work_orders
        SET status = 'in_progress', updated_at = NOW()
        WHERE id = $1 AND status = 'paused'
        RETURNING 
            id, work_order_no, order_id, order_no,
            product_code, product_name,
            work_station_id, process_id,
            planned_quantity, completed_quantity,
            plan_start_date, plan_end_date,
            actual_start_date, actual_end_date,
            team_id, operator,
            status, priority, remark,
            created_at, updated_at
        "#,
        uuid,
    )
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(r)) => Json(ApiResponse::success(
            WorkOrderResponse {
                id: r.id.to_string(),
                work_order_no: r.work_order_no,
                order_id: r.order_id.map(|u| u.to_string()),
                order_no: r.order_no,
                product_code: r.product_code.unwrap_or_default(),
                product_name: r.product_name,
                work_station_id: r.work_station_id.map(|u| u.to_string()),
                process_id: r.process_id.map(|u| u.to_string()),
                planned_quantity: big_decimal_to_f64(r.planned_quantity),
                completed_quantity: big_decimal_to_f64(r.completed_quantity),
                plan_start_date: opt_datetime_to_string(r.plan_start_date),
                plan_end_date: opt_datetime_to_string(r.plan_end_date),
                actual_start_date: opt_datetime_to_string(r.actual_start_date),
                actual_end_date: opt_datetime_to_string(r.actual_end_date),
                team_id: r.team_id.map(|u| u.to_string()),
                operator: r.operator,
                status: r.status.unwrap_or_default(),
                priority: r.priority.map(|v| v.to_string()),
                remark: r.remark,
                created_at: r.created_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
                updated_at: r.updated_at.map(|d| d.to_rfc3339()).unwrap_or_default(),
            },
            "恢复工单成功",
        )),
        Ok(None) => Json(ApiResponse::error(
            404,
            "工单不存在或状态不允许恢复（仅 paused 状态可恢复）",
        )),
        Err(e) => {
            tracing::error!("Failed to resume work order: {}", e);
            Json(ApiResponse::error(500, "恢复工单失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::{Datelike, DateTime, Timelike, Utc};
    use std::str::FromStr;

    #[test]
    fn test_parse_datetime_rfc3339() {
        let s = "2024-01-15T10:30:00Z";
        let result = parse_datetime(s);
        assert!(result.is_some());
        let dt = result.unwrap();
        assert_eq!(dt.date().year(), 2024);
        assert_eq!(dt.date().month(), 1);
        assert_eq!(dt.date().day(), 15);
    }

    #[test]
    fn test_parse_datetime_alternative_format() {
        let s = "2024-01-15 10:30:00";
        let result = parse_datetime(s);
        assert!(result.is_some());
        let dt = result.unwrap();
        assert_eq!(dt.date().year(), 2024);
        assert_eq!(dt.time().hour(), 10);
    }

    #[test]
    fn test_parse_datetime_invalid_returns_none() {
        assert!(parse_datetime("not-a-date").is_none());
        assert!(parse_datetime("").is_none());
        assert!(parse_datetime("2024/13/01").is_none());
    }

    #[test]
    fn test_parse_opt_uuid_valid() {
        let valid_id = Uuid::new_v4();
        let s = Some(valid_id.to_string());
        let result = parse_opt_uuid(&s);
        assert!(result.is_some());
        assert_eq!(result.unwrap(), valid_id);
    }

    #[test]
    fn test_parse_opt_uuid_invalid() {
        let s = Some("not-a-uuid".to_string());
        assert!(parse_opt_uuid(&s).is_none());

        let none: Option<String> = None;
        assert!(parse_opt_uuid(&none).is_none());
    }

    #[test]
    fn test_parse_opt_datetime_some() {
        let s = Some("2024-06-20T14:00:00Z".to_string());
        let result = parse_opt_datetime(&s);
        assert!(result.is_some());
    }

    #[test]
    fn test_parse_opt_datetime_none() {
        let none: Option<String> = None;
        assert!(parse_opt_datetime(&none).is_none());
    }

    #[test]
    fn test_big_decimal_to_f64_some() {
        let bd = Some(BigDecimal::from_str("123.45").unwrap());
        let result = big_decimal_to_f64(bd);
        assert!((result - 123.45).abs() < 0.001);
    }

    #[test]
    fn test_big_decimal_to_f64_none() {
        let result = big_decimal_to_f64(None);
        assert_eq!(result, 0.0);
    }

    #[test]
    fn test_big_decimal_to_f64_integer() {
        let bd = Some(BigDecimal::from(100));
        let result = big_decimal_to_f64(bd);
        assert_eq!(result, 100.0);
    }

    #[test]
    fn test_parse_opt_big_decimal_some() {
        let v = Some(123.45);
        let result = parse_opt_big_decimal(&v);
        assert!(result.is_some());
        let f = result.unwrap().to_string().parse::<f64>().unwrap();
        assert!((f - 123.45).abs() < 0.001);
    }

    #[test]
    fn test_parse_opt_big_decimal_none() {
        let v: Option<f64> = None;
        assert!(parse_opt_big_decimal(&v).is_none());
    }

    #[test]
    fn test_naive_to_utc_some() {
        let naive = NaiveDateTime::parse_from_str("2024-01-01 00:00:00", "%Y-%m-%d %H:%M:%S").map(|dt| dt.and_utc()).ok();
        let result = naive_to_utc(naive);
        assert_eq!(result.naive_utc().date().year(), 2024);
    }

    #[test]
    fn test_naive_to_utc_none() {
        let result = naive_to_utc(None);
        assert!(result <= Utc::now());
    }

    #[test]
    fn test_datetime_to_string_returns_nonempty() {
        let naive = NaiveDateTime::parse_from_str("2024-01-01 12:00:00", "%Y-%m-%d %H:%M:%S").map(|dt| dt.and_utc()).ok();
        let s = datetime_to_string(naive);
        assert!(!s.is_empty());
        assert!(s.contains("2024"));
    }

    #[test]
    fn test_opt_datetime_to_string_some_and_none() {
        let naive = NaiveDateTime::parse_from_str("2024-03-15 08:30:00", "%Y-%m-%d %H:%M:%S").map(|dt| dt.and_utc()).ok();
        let some_result = opt_datetime_to_string(naive);
        assert!(some_result.is_some());
        assert!(some_result.unwrap().contains("2024"));

        let none_result = opt_datetime_to_string(None);
        assert!(none_result.is_none());
    }
}
