//! Production Order handlers

use axum::{
    extract::Extension,
    extract::Path,
    extract::Query,
    extract::State,
    routing::{get, post, put},
    Json, Router,
};
use chrono::{DateTime, NaiveDateTime, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{
    types::{BigDecimal, Uuid},
    Row,
};
use std::str::FromStr;
use topems_shared_auth::auth::Claims;
use topems_shared_event::event::{EventType, ProductionOrderCreatedPayload};
use utoipa::ToSchema;

use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared_core::response::ApiResponse;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/orders",
            get(list_production_orders).post(create_production_order),
        )
        .route("/orders/from-erp", post(create_from_erp))
        .route(
            "/orders/{id}",
            get(get_production_order)
                .put(update_production_order)
                .delete(delete_production_order),
        )
        .route("/orders/{id}/release", put(release_production_order))
        .route("/orders/{id}/start", put(start_production_order))
        .route("/orders/{id}/complete", put(complete_production_order))
        .route("/orders/{id}/cancel", put(cancel_production_order))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListProductionOrdersQuery {
    page: Option<i32>,
    pagesize: Option<i32>,
    search: Option<String>,
    status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub enum ProductionOrderSource {
    #[serde(rename = "manual")]
    Manual,
    #[serde(rename = "erp_sales_order")]
    ErpSalesOrder,
    #[serde(rename = "mrp")]
    Mrp,
}

impl std::fmt::Display for ProductionOrderSource {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ProductionOrderSource::Manual => write!(f, "manual"),
            ProductionOrderSource::ErpSalesOrder => write!(f, "erp_sales_order"),
            ProductionOrderSource::Mrp => write!(f, "mrp"),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct ErpSalesOrderInfo {
    pub order_id: Uuid,
    pub order_number: String,
    pub customer_name: String,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub unit: String,
    pub delivery_date: Option<DateTime<Utc>>,
    pub priority: Option<i32>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateFromErpRequest {
    pub erp_order: ErpSalesOrderInfo,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_completion_date: Option<DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateProductionOrderRequest {
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateProductionOrderRequest {
    pub product_name: Option<String>,
    pub product_code: Option<String>,
    pub quantity: Option<f64>,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ProductionOrderResponse {
    pub id: Uuid,
    pub order_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: String,
    pub product_code: String,
    pub quantity: f64,
    pub completed_quantity: f64,
    pub status: String,
    pub source: String,
    pub source_order_id: Option<Uuid>,
    pub source_order_number: Option<String>,
    pub planned_start_date: Option<DateTime<Utc>>,
    pub planned_end_date: Option<DateTime<Utc>>,
    pub actual_start_date: Option<DateTime<Utc>>,
    pub actual_end_date: Option<DateTime<Utc>>,
    pub workshop_id: Option<Uuid>,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ListProductionOrdersResponse {
    pub orders: Vec<ProductionOrderResponse>,
    pub total: i64,
    pub page: i64,
    pub pagesize: i64,
}

fn naive_to_utc(dt: Option<NaiveDateTime>) -> DateTime<Utc> {
    dt.map(|d| Utc.from_utc_datetime(&d))
        .unwrap_or_else(Utc::now)
}

fn opt_naive_to_utc(dt: Option<NaiveDateTime>) -> Option<DateTime<Utc>> {
    dt.map(|d| Utc.from_utc_datetime(&d))
}

fn big_decimal_to_f64(bd: Option<BigDecimal>) -> f64 {
    bd.and_then(|d| d.to_string().parse::<f64>().ok())
        .unwrap_or(0.0)
}

// ==================== State Transition ====================

pub fn validate_state_transition(current_status: &str, target_status: &str) -> Result<(), String> {
    let valid_transitions = [
        ("pending", "released"),
        ("pending", "cancelled"),
        ("released", "in_progress"),
        ("released", "cancelled"),
        ("in_progress", "completed"),
        ("in_progress", "paused"),
        ("paused", "in_progress"),
        ("paused", "cancelled"),
        ("completed", "closed"),
    ];

    if current_status == target_status {
        return Ok(());
    }

    for &(from, to) in &valid_transitions {
        if current_status == from && target_status == to {
            return Ok(());
        }
    }

    Err(format!(
        "Invalid state transition: {} -> {}",
        current_status, target_status
    ))
}

// ==================== Production Order Handlers ====================

#[utoipa::path(
    get,
    path = "/api/mes/orders",
    tag = "ProductionOrder",
    params(
        ("page" = Option<i32>, Query, description = "页码"),
        ("pagesize" = Option<i32>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态过滤"),
    ),
    responses(
        (status = 200, description = "生产订单列表", body = ApiResponse<ListProductionOrdersResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_production_orders(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ListProductionOrdersQuery>,
) -> Json<ApiResponse<ListProductionOrdersResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::ProductionOrderRead).await
    {
        return e;
    }

    let page = query.page.unwrap_or(1) as i64;
    let pagesize = query.pagesize.unwrap_or(10) as i64;
    let offset = (page - 1) * pagesize;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::new();

    if let Some(status) = query.status {
        where_clause.push_str(" WHERE status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(
                " WHERE (order_no ILIKE $1 OR product_name ILIKE $1 OR product_code ILIKE $1)",
            );
        } else {
            where_clause.push_str(&format!(
                " AND (order_no ILIKE ${} OR product_name ILIKE ${} OR product_code ILIKE ${})",
                params.len() + 1,
                params.len() + 1,
                params.len() + 1
            ));
        }
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM production_orders{}",
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
            tracing::error!("Failed to count production orders: {}", e);
            return Json(ApiResponse::error(500, "获取生产工单列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT 
            id, order_no, product_id, product_name, product_code,
            quantity, completed_quantity, status, source,
            source_order_id, source_order_number,
            planned_start_date, planned_end_date,
            actual_start_date, actual_end_date,
            workshop_id, notes, created_at, updated_at
        FROM production_orders
        {}
        ORDER BY created_at DESC
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

    let orders = match fetch_query.fetch_all(&state.pool).await {
        Ok(o) => o,
        Err(e) => {
            tracing::error!("Failed to fetch production orders: {}", e);
            return Json(ApiResponse::error(500, "获取生产工单列表失败"));
        }
    };

    let orders_list: Vec<ProductionOrderResponse> = orders
        .into_iter()
        .map(|r| ProductionOrderResponse {
            id: r.try_get::<Uuid, _>("id").unwrap_or_default(),
            order_no: r.try_get::<String, _>("order_no").unwrap_or_default(),
            product_id: r.try_get::<Option<Uuid>, _>("product_id").ok().flatten(),
            product_name: r.try_get::<String, _>("product_name").unwrap_or_default(),
            product_code: r.try_get::<String, _>("product_code").unwrap_or_default(),
            quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("quantity")
                    .ok()
                    .flatten(),
            ),
            completed_quantity: big_decimal_to_f64(
                r.try_get::<Option<BigDecimal>, _>("completed_quantity")
                    .ok()
                    .flatten(),
            ),
            status: r
                .try_get::<Option<String>, _>("status")
                .ok()
                .flatten()
                .unwrap_or_else(|| "pending".to_string()),
            source: r
                .try_get::<Option<String>, _>("source")
                .ok()
                .flatten()
                .unwrap_or_else(|| "manual".to_string()),
            source_order_id: r
                .try_get::<Option<Uuid>, _>("source_order_id")
                .ok()
                .flatten(),
            source_order_number: r
                .try_get::<Option<String>, _>("source_order_number")
                .ok()
                .flatten(),
            planned_start_date: opt_naive_to_utc(
                r.try_get::<Option<NaiveDateTime>, _>("planned_start_date")
                    .ok()
                    .flatten(),
            ),
            planned_end_date: opt_naive_to_utc(
                r.try_get::<Option<NaiveDateTime>, _>("planned_end_date")
                    .ok()
                    .flatten(),
            ),
            actual_start_date: opt_naive_to_utc(
                r.try_get::<Option<NaiveDateTime>, _>("actual_start_date")
                    .ok()
                    .flatten(),
            ),
            actual_end_date: opt_naive_to_utc(
                r.try_get::<Option<NaiveDateTime>, _>("actual_end_date")
                    .ok()
                    .flatten(),
            ),
            workshop_id: r.try_get::<Option<Uuid>, _>("workshop_id").ok().flatten(),
            notes: r.try_get::<Option<String>, _>("notes").ok().flatten(),
            created_at: naive_to_utc(
                r.try_get::<Option<NaiveDateTime>, _>("created_at")
                    .ok()
                    .flatten(),
            ),
            updated_at: naive_to_utc(
                r.try_get::<Option<NaiveDateTime>, _>("updated_at")
                    .ok()
                    .flatten(),
            ),
        })
        .collect();

    Json(ApiResponse::success(
        ListProductionOrdersResponse {
            orders: orders_list,
            total: total.unwrap_or(0),
            page,
            pagesize,
        },
        "获取生产工单列表成功",
    ))
}

#[utoipa::path(
    post,
    path = "/api/mes/orders",
    tag = "ProductionOrder",
    request_body = CreateProductionOrderRequest,
    responses(
        (status = 200, description = "生产订单创建成功", body = ApiResponse<ProductionOrderResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn create_production_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateProductionOrderRequest>,
) -> Json<ApiResponse<ProductionOrderResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderWrite,
    )
    .await
    {
        return e;
    }

    let now = Utc::now();
    let order_no = format!(
        "MO{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let result = sqlx::query!(
        r#"
        INSERT INTO production_orders (
            order_no, product_id, product_name, product_code,
            quantity, completed_quantity, status, source,
            planned_start_date, planned_end_date, workshop_id, notes,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 0, 'pending', 'manual', $6, $7, $8, $9, $10, $10)
        RETURNING 
            id, order_no, product_id, product_name, product_code,
            quantity, completed_quantity, status, source,
            source_order_id, source_order_number,
            planned_start_date, planned_end_date,
            actual_start_date, actual_end_date,
            workshop_id, notes, created_at, updated_at
        "#,
        order_no,
        req.product_id,
        req.product_name,
        req.product_code,
        BigDecimal::from_str(&req.quantity.to_string()).unwrap_or_default(),
        req.planned_start_date.map(|d| d.naive_utc()),
        req.planned_end_date.map(|d| d.naive_utc()),
        req.workshop_id,
        req.notes,
        now.naive_utc(),
    )
    .fetch_one(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create production order: {}", e);
            return Json(ApiResponse::error(500, "创建生产工单失败"));
        }
    };

    let order = ProductionOrderResponse {
        id: result.id,
        order_no: result.order_no,
        product_id: result.product_id,
        product_name: result.product_name,
        product_code: result.product_code,
        quantity: big_decimal_to_f64(Some(result.quantity)),
        completed_quantity: big_decimal_to_f64(result.completed_quantity),
        status: result.status.unwrap_or_else(|| "pending".to_string()),
        source: result.source.unwrap_or_else(|| "manual".to_string()),
        source_order_id: result.source_order_id,
        source_order_number: result.source_order_number,
        planned_start_date: opt_naive_to_utc(result.planned_start_date),
        planned_end_date: opt_naive_to_utc(result.planned_end_date),
        actual_start_date: opt_naive_to_utc(result.actual_start_date),
        actual_end_date: opt_naive_to_utc(result.actual_end_date),
        workshop_id: result.workshop_id,
        notes: result.notes,
        created_at: naive_to_utc(result.created_at),
        updated_at: naive_to_utc(result.updated_at),
    };

    if let Some(ref publisher) = state.event_publisher {
        let publisher = publisher.clone();
        let oid = order.id;
        let ono = order.order_no.clone();
        let pid = order.product_id;
        let pname = order.product_name.clone();
        let qty = order.quantity;
        let psd = order.planned_start_date;
        let cby = Some(claims.sub.clone());
        tokio::spawn(async move {
            let payload = ProductionOrderCreatedPayload {
                order_id: oid,
                order_no: ono,
                product_id: pid,
                product_name: Some(pname),
                quantity: Some(qty),
                planned_start_date: psd,
                created_by: cby,
            };
            if let Err(e) = publisher
                .publish_event(EventType::ProductionOrderCreated, payload)
                .await
            {
                tracing::warn!(
                    "[mes] ProductionOrderCreated 事件发布失败（graceful fallback）: {}",
                    e
                );
            } else {
                tracing::info!(
                    "[mes] ProductionOrderCreated 事件发布成功 - order_id={}",
                    oid
                );
            }
        });
    }

    Json(ApiResponse::success(order, "生产工单创建成功"))
}

pub async fn create_from_erp(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateFromErpRequest>,
) -> Json<ApiResponse<ProductionOrderResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderWrite,
    )
    .await
    {
        return e;
    }

    let now = Utc::now();
    let order_no = format!(
        "MO{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let planned_start = req.planned_start_date.unwrap_or(now);
    let planned_end = req
        .planned_completion_date
        .or(req.erp_order.delivery_date)
        .unwrap_or_else(|| now + chrono::Duration::days(7));

    let result = sqlx::query!(
        r#"
        INSERT INTO production_orders (
            order_no, product_name, product_code, quantity,
            status, source, source_order_id, source_order_number,
            planned_start_date, planned_end_date, workshop_id, notes,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'pending', 'erp_sales_order', $5, $6, $7, $8, $9, $10, $11, $11)
        RETURNING 
            id, order_no, product_id, product_name, product_code,
            quantity, completed_quantity, status, source,
            source_order_id, source_order_number,
            planned_start_date, planned_end_date,
            actual_start_date, actual_end_date,
            workshop_id, notes, created_at, updated_at
        "#,
        order_no,
        req.erp_order.product_name,
        req.erp_order.product_code,
        BigDecimal::from_str(&req.erp_order.quantity.to_string()).unwrap_or_default(),
        req.erp_order.order_id,
        req.erp_order.order_number,
        planned_start.naive_utc(),
        planned_end.naive_utc(),
        req.workshop_id,
        req.notes,
        now.naive_utc(),
    )
    .fetch_one(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create production order from ERP: {}", e);
            return Json(ApiResponse::error(500, "从ERP订单创建生产工单失败"));
        }
    };

    let order = ProductionOrderResponse {
        id: result.id,
        order_no: result.order_no,
        product_id: result.product_id,
        product_name: result.product_name,
        product_code: result.product_code,
        quantity: big_decimal_to_f64(Some(result.quantity)),
        completed_quantity: big_decimal_to_f64(result.completed_quantity),
        status: result.status.unwrap_or_else(|| "pending".to_string()),
        source: result
            .source
            .unwrap_or_else(|| "erp_sales_order".to_string()),
        source_order_id: result.source_order_id,
        source_order_number: result.source_order_number,
        planned_start_date: opt_naive_to_utc(result.planned_start_date),
        planned_end_date: opt_naive_to_utc(result.planned_end_date),
        actual_start_date: opt_naive_to_utc(result.actual_start_date),
        actual_end_date: opt_naive_to_utc(result.actual_end_date),
        workshop_id: result.workshop_id,
        notes: result.notes,
        created_at: naive_to_utc(result.created_at),
        updated_at: naive_to_utc(result.updated_at),
    };

    tracing::info!(
        "[MES] Created production order {} from ERP order {}",
        order_no,
        req.erp_order.order_number
    );

    Json(ApiResponse::success(order, "从ERP订单创建生产工单成功"))
}

#[utoipa::path(
    get,
    path = "/api/mes/orders/{id}",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    responses(
        (status = 200, description = "生产订单详情", body = ApiResponse<ProductionOrderResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_production_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionOrderResponse>> {
    if let Err(e) =
        check_permission(&state.pool, &claims, &ModulePermission::ProductionOrderRead).await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        SELECT 
            id, order_no, product_id, product_name, product_code,
            quantity, completed_quantity, status, source,
            source_order_id, source_order_number,
            planned_start_date, planned_end_date,
            actual_start_date, actual_end_date,
            workshop_id, notes, created_at, updated_at
        FROM production_orders
        WHERE id = $1
        "#,
        id,
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to fetch production order: {}", e);
            return Json(ApiResponse::error(500, "获取生产工单失败"));
        }
    };

    match result {
        Some(r) => {
            let order = ProductionOrderResponse {
                id: r.id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: big_decimal_to_f64(Some(r.quantity)),
                completed_quantity: big_decimal_to_f64(r.completed_quantity),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: opt_naive_to_utc(r.planned_start_date),
                planned_end_date: opt_naive_to_utc(r.planned_end_date),
                actual_start_date: opt_naive_to_utc(r.actual_start_date),
                actual_end_date: opt_naive_to_utc(r.actual_end_date),
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(order, "获取生产工单成功"))
        }
        None => Json(ApiResponse::error(404, "生产工单不存在")),
    }
}

pub async fn update_production_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProductionOrderRequest>,
) -> Json<ApiResponse<ProductionOrderResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderWrite,
    )
    .await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        UPDATE production_orders SET
            product_name = COALESCE($2, product_name),
            product_code = COALESCE($3, product_code),
            quantity = COALESCE($4, quantity),
            planned_start_date = COALESCE($5, planned_start_date),
            planned_end_date = COALESCE($6, planned_end_date),
            workshop_id = COALESCE($7, workshop_id),
            notes = COALESCE($8, notes),
            updated_at = $9
        WHERE id = $1 AND status = 'pending'
        RETURNING 
            id, order_no, product_id, product_name, product_code,
            quantity, completed_quantity, status, source,
            source_order_id, source_order_number,
            planned_start_date, planned_end_date,
            actual_start_date, actual_end_date,
            workshop_id, notes, created_at, updated_at
        "#,
        id,
        req.product_name,
        req.product_code,
        req.quantity
            .and_then(|v| BigDecimal::from_str(&v.to_string()).ok()),
        req.planned_start_date.map(|d| d.naive_utc()),
        req.planned_end_date.map(|d| d.naive_utc()),
        req.workshop_id,
        req.notes,
        Utc::now().naive_utc(),
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update production order: {}", e);
            return Json(ApiResponse::error(500, "更新生产工单失败"));
        }
    };

    match result {
        Some(r) => {
            let order = ProductionOrderResponse {
                id: r.id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: big_decimal_to_f64(Some(r.quantity)),
                completed_quantity: big_decimal_to_f64(r.completed_quantity),
                status: r.status.unwrap_or_else(|| "pending".to_string()),
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: opt_naive_to_utc(r.planned_start_date),
                planned_end_date: opt_naive_to_utc(r.planned_end_date),
                actual_start_date: opt_naive_to_utc(r.actual_start_date),
                actual_end_date: opt_naive_to_utc(r.actual_end_date),
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(order, "生产工单更新成功"))
        }
        None => Json(ApiResponse::error(404, "生产工单不存在或状态不允许修改")),
    }
}

pub async fn delete_production_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderWrite,
    )
    .await
    {
        return e;
    }

    let result = sqlx::query!(
        r#"
        UPDATE production_orders SET deleted_at = NOW()
        WHERE id = $1 AND status IN ('pending', 'cancelled')
        "#,
        id,
    )
    .execute(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete production order: {}", e);
            return Json(ApiResponse::error(500, "删除生产工单失败"));
        }
    };

    if result.rows_affected() > 0 {
        Json(ApiResponse::success("".to_string(), "生产工单删除成功"))
    } else {
        Json(ApiResponse::error(404, "生产工单不存在或状态不允许删除"))
    }
}

pub async fn start_production_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionOrderResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderStart,
    )
    .await
    {
        return e;
    }

    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        UPDATE production_orders SET
            status = 'in_progress',
            actual_start_date = $2,
            updated_at = $2
        WHERE id = $1 AND status = 'released'
        RETURNING 
            id, order_no, product_id, product_name, product_code,
            quantity, completed_quantity, status, source,
            source_order_id, source_order_number,
            planned_start_date, planned_end_date,
            actual_start_date, actual_end_date,
            workshop_id, notes, created_at, updated_at
        "#,
        id,
        now.naive_utc(),
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to start production order: {}", e);
            return Json(ApiResponse::error(500, "启动生产工单失败"));
        }
    };

    match result {
        Some(r) => {
            let order = ProductionOrderResponse {
                id: r.id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: big_decimal_to_f64(Some(r.quantity)),
                completed_quantity: big_decimal_to_f64(r.completed_quantity),
                status: r.status.unwrap_or_else(|| "in_progress".to_string()),
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: opt_naive_to_utc(r.planned_start_date),
                planned_end_date: opt_naive_to_utc(r.planned_end_date),
                actual_start_date: opt_naive_to_utc(r.actual_start_date),
                actual_end_date: opt_naive_to_utc(r.actual_end_date),
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(order, "生产工单启动成功"))
        }
        None => Json(ApiResponse::error(404, "生产工单不存在或状态不允许启动")),
    }
}

pub async fn complete_production_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionOrderResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderComplete,
    )
    .await
    {
        return e;
    }

    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        UPDATE production_orders SET
            status = 'completed',
            completed_quantity = quantity,
            actual_end_date = $2,
            updated_at = $2
        WHERE id = $1 AND status = 'in_progress'
        RETURNING 
            id, order_no, product_id, product_name, product_code,
            quantity, completed_quantity, status, source,
            source_order_id, source_order_number,
            planned_start_date, planned_end_date,
            actual_start_date, actual_end_date,
            workshop_id, notes, created_at, updated_at
        "#,
        id,
        now.naive_utc(),
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to complete production order: {}", e);
            return Json(ApiResponse::error(500, "完成生产工单失败"));
        }
    };

    match result {
        Some(r) => {
            let order = ProductionOrderResponse {
                id: r.id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: big_decimal_to_f64(Some(r.quantity)),
                completed_quantity: big_decimal_to_f64(r.completed_quantity),
                status: r.status.unwrap_or_else(|| "completed".to_string()),
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: opt_naive_to_utc(r.planned_start_date),
                planned_end_date: opt_naive_to_utc(r.planned_end_date),
                actual_start_date: opt_naive_to_utc(r.actual_start_date),
                actual_end_date: opt_naive_to_utc(r.actual_end_date),
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(order, "生产工单完成成功"))
        }
        None => Json(ApiResponse::error(404, "生产工单不存在或状态不允许完成")),
    }
}

pub async fn cancel_production_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionOrderResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderCancel,
    )
    .await
    {
        return e;
    }

    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        UPDATE production_orders SET
            status = 'cancelled',
            updated_at = $2
        WHERE id = $1 AND status IN ('pending', 'released', 'paused')
        RETURNING 
            id, order_no, product_id, product_name, product_code,
            quantity, completed_quantity, status, source,
            source_order_id, source_order_number,
            planned_start_date, planned_end_date,
            actual_start_date, actual_end_date,
            workshop_id, notes, created_at, updated_at
        "#,
        id,
        now.naive_utc(),
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to cancel production order: {}", e);
            return Json(ApiResponse::error(500, "取消生产工单失败"));
        }
    };

    match result {
        Some(r) => {
            let order = ProductionOrderResponse {
                id: r.id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: big_decimal_to_f64(Some(r.quantity)),
                completed_quantity: big_decimal_to_f64(r.completed_quantity),
                status: r.status.unwrap_or_else(|| "cancelled".to_string()),
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: opt_naive_to_utc(r.planned_start_date),
                planned_end_date: opt_naive_to_utc(r.planned_end_date),
                actual_start_date: opt_naive_to_utc(r.actual_start_date),
                actual_end_date: opt_naive_to_utc(r.actual_end_date),
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(order, "生产工单取消成功"))
        }
        None => Json(ApiResponse::error(404, "生产工单不存在或状态不允许取消")),
    }
}

pub async fn release_production_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionOrderResponse>> {
    if let Err(e) = check_permission(
        &state.pool,
        &claims,
        &ModulePermission::ProductionOrderWrite,
    )
    .await
    {
        return e;
    }

    let now = Utc::now();

    let result = sqlx::query!(
        r#"
        UPDATE production_orders SET
            status = 'released',
            updated_at = $2
        WHERE id = $1 AND status = 'pending'
        RETURNING 
            id, order_no, product_id, product_name, product_code,
            quantity, completed_quantity, status, source,
            source_order_id, source_order_number,
            planned_start_date, planned_end_date,
            actual_start_date, actual_end_date,
            workshop_id, notes, created_at, updated_at
        "#,
        id,
        now.naive_utc(),
    )
    .fetch_optional(&state.pool)
    .await;

    let result = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to release production order: {}", e);
            return Json(ApiResponse::error(500, "发布生产工单失败"));
        }
    };

    match result {
        Some(r) => {
            let order = ProductionOrderResponse {
                id: r.id,
                order_no: r.order_no,
                product_id: r.product_id,
                product_name: r.product_name,
                product_code: r.product_code,
                quantity: big_decimal_to_f64(Some(r.quantity)),
                completed_quantity: big_decimal_to_f64(r.completed_quantity),
                status: r.status.unwrap_or_else(|| "released".to_string()),
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: opt_naive_to_utc(r.planned_start_date),
                planned_end_date: opt_naive_to_utc(r.planned_end_date),
                actual_start_date: opt_naive_to_utc(r.actual_start_date),
                actual_end_date: opt_naive_to_utc(r.actual_end_date),
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: naive_to_utc(r.created_at),
                updated_at: naive_to_utc(r.updated_at),
            };
            Json(ApiResponse::success(order, "生产工单发布成功"))
        }
        None => Json(ApiResponse::error(404, "生产工单不存在或状态不允许发布")),
    }
}
