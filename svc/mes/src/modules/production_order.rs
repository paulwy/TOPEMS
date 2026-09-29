//! Production Order handlers

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
use sqlx::{types::Uuid, Row};
use topems_shared::auth::Claims;
use topems_shared_event::event::{EventType, ProductionOrderCreatedPayload};
use utoipa::ToSchema;

use crate::modules::approval_common::{
    build_approve_response, build_reject_response, build_start_response, create_approval_and_log,
    execute_transition_and_log, reject_and_log,
};
use crate::shared::permission::{check_permission, ModulePermission};
use crate::AppState;
use topems_shared::response::ApiResponse;

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
        // APV-1: 生产订单审批端点
        .route("/orders/{id}/approval/start", post(start_order_approval))
        .route("/orders/{id}/approval/approve", post(approve_order))
        .route("/orders/{id}/approval/reject", post(reject_order))
}

// ==================== Data Types ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ListProductionOrdersQuery {
    page: Option<i32>,
    page_size: Option<i32>,
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
    pub page_size: i64,
}

fn naive_to_utc(dt: Option<DateTime<Utc>>) -> DateTime<Utc> {
    dt.unwrap_or_else(Utc::now)
}

fn opt_naive_to_utc(dt: Option<DateTime<Utc>>) -> Option<DateTime<Utc>> {
    dt
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
    security(("BearerAuth" = ["mes:production:read"])),
    path = "/api/mes/orders",
    tag = "ProductionOrder",
    params(
        ("page" = Option<i32>, Query, description = "页码"),
        ("page_size" = Option<i32>, Query, description = "每页数量"),
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
    let page_size = query.page_size.unwrap_or(10) as i64;
    let offset = (page - 1) * page_size;

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE deleted_at IS NULL");

    if let Some(status) = query.status {
        where_clause.push_str(" AND status = $1");
        params.push(serde_json::Value::String(status));
    }

    if let Some(search) = query.search {
        let pattern = format!("%{}%", search);
        if where_clause.is_empty() {
            where_clause.push_str(
                " WHERE (order_number ILIKE $1 OR product_name ILIKE $1 OR product_code ILIKE $1)",
            );
        } else {
            where_clause.push_str(&format!(
                " AND (order_number ILIKE ${} OR product_name ILIKE ${} OR product_code ILIKE ${})",
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
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
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
    fetch_query = fetch_query.bind(page_size).bind(offset);

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
            quantity: r
                .try_get::<Option<f64>, _>("quantity")
                .ok()
                .flatten()
                .unwrap_or(0.0),
            completed_quantity: r
                .try_get::<Option<f64>, _>("completed_quantity")
                .ok()
                .flatten()
                .unwrap_or(0.0),
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
            planned_start_date: r
                .try_get::<Option<DateTime<Utc>>, _>("planned_start_date")
                .ok()
                .flatten()
                ,
            planned_end_date: r
                .try_get::<Option<DateTime<Utc>>, _>("planned_end_date")
                .ok()
                .flatten()
                ,
            actual_start_date: r
                .try_get::<Option<DateTime<Utc>>, _>("actual_start_date")
                .ok()
                .flatten()
                ,
            actual_end_date: r
                .try_get::<Option<DateTime<Utc>>, _>("actual_end_date")
                .ok()
                .flatten()
                ,
            workshop_id: r.try_get::<Option<Uuid>, _>("workshop_id").ok().flatten(),
            notes: r.try_get::<Option<String>, _>("notes").ok().flatten(),
            created_at: r
                .try_get::<Option<DateTime<Utc>>, _>("created_at")
                .ok()
                .flatten()
                
                .unwrap_or_else(Utc::now),
            updated_at: r
                .try_get::<Option<DateTime<Utc>>, _>("updated_at")
                .ok()
                .flatten()
                
                .unwrap_or_else(Utc::now),
        })
        .collect();

    Json(ApiResponse::success(
        ListProductionOrdersResponse {
            orders: orders_list,
            total: total.unwrap_or(0),
            page,
            page_size,
        },
        "获取生产工单列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:production:write"])),
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

    // RLS 连接级隔离：事务内设置租户上下文，确保 set_config 与 INSERT 同连接
    // （tenant_middleware 在 pool 连接上设置的 GUC 不保证与本查询取到同一连接）
    let tenant_id = claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .unwrap_or_else(Uuid::nil);
    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to begin tx for create_production_order: {}", e);
            return Json(ApiResponse::error(500, "创建生产工单失败"));
        }
    };
    if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
        .bind(tenant_id.to_string())
        .execute(&mut *tx)
        .await
    {
        tracing::error!(
            "Failed to set RLS context for create_production_order: {}",
            e
        );
        return Json(ApiResponse::error(500, "创建生产工单失败"));
    }

    let result = sqlx::query!(
        r#"
        INSERT INTO production_orders (
            order_number, product_name, product_code,
            quantity, completed_quantity, status,
            planned_start_date, planned_end_date, workshop_id, notes,
            created_at: created_at.unwrap_or_default(), updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, 0, 'pending', $5, $6, $7, $8, $9, $9, $10)
        RETURNING 
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
        order_no,
        req.product_name,
        req.product_code,
        req.quantity as i32,
req.planned_start_date.map(|d| d.date()),
req.planned_end_date.map(|d| d.date()),
        req.workshop_id,
        req.notes,
        now,
        tenant_id,
    )
    .fetch_one(&mut *tx)
    .await;

    let result = match result {
        Ok(r) => {
            if let Err(e) = tx.commit().await {
                tracing::error!("Failed to commit tx for create_production_order: {}", e);
                return Json(ApiResponse::error(500, "创建生产工单失败"));
            }
            r
        }
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
        product_code: result.product_code.unwrap_or_default(),
        quantity: result.quantity.unwrap_or_default(),
        completed_quantity: result.completed_quantity.unwrap_or_default(),
        status: result.status,
        source: result.source.unwrap_or_else(|| "manual".to_string()),
        source_order_id: result.source_order_id,
        source_order_number: result.source_order_number,
        planned_start_date: result.planned_start_date,
        planned_end_date: result.planned_end_date,
        actual_start_date: result.actual_start_date,
        actual_end_date: result.actual_end_date,
        workshop_id: result.workshop_id,
        notes: result.notes,
        created_at: result.created_at,
        updated_at: result.updated_at,
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/orders/from-erp",
    tag = "ProductionOrder",
    request_body = CreateFromErpRequest,
    responses(
        (status = 200, description = "从ERP创建生产订单成功", body = ApiResponse<ProductionOrderResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
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

    // 服务间调用（service token）：事务内设置 nil 租户上下文，确保与 INSERT 同一连接（RLS 放行）
    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to begin tx for create_from_erp: {}", e);
            return Json(ApiResponse::error(500, "从ERP订单创建生产工单失败"));
        }
    };
    if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, false)")
        .bind(Uuid::nil().to_string())
        .execute(&mut *tx)
        .await
    {
        tracing::error!("Failed to set nil RLS context for create_from_erp: {}", e);
        return Json(ApiResponse::error(500, "从ERP订单创建生产工单失败"));
    }

    let result = sqlx::query!(
        r#"
        INSERT INTO production_orders (
            order_number, product_name, product_code, quantity,
            status: status.unwrap_or_default(), source_order_id, source_order_number,
            planned_start_date, planned_end_date, workshop_id, notes,
            created_at: created_at.unwrap_or_default(), updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8, $9, $10, $11, $11, $12)
        RETURNING 
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
        order_no,
        req.erp_order.product_name,
        req.erp_order.product_code,
        req.erp_order.quantity as i32,
        req.erp_order.order_id,
        req.erp_order.order_number,
planned_start.date(),
planned_end.date(),
        req.workshop_id,
        req.notes,
        now,
        Uuid::nil(),
    )
    .fetch_one(&mut *tx)
    .await;

    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit tx for create_from_erp: {}", e);
        return Json(ApiResponse::error(500, "从ERP订单创建生产工单失败"));
    }

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
        product_code: result.product_code.unwrap_or_default(),
        quantity: result.quantity.unwrap_or_default(),
        completed_quantity: result.completed_quantity.unwrap_or_default(),
        status: result.status,
        source: result
            .source
            .unwrap_or_else(|| "erp_sales_order".to_string()),
        source_order_id: result.source_order_id,
        source_order_number: result.source_order_number,
        planned_start_date: result.planned_start_date,
        planned_end_date: result.planned_end_date,
        actual_start_date: result.actual_start_date,
        actual_end_date: result.actual_end_date,
        workshop_id: result.workshop_id,
        notes: result.notes,
        created_at: result.created_at,
        updated_at: result.updated_at,
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
    security(("BearerAuth" = ["mes:production:read"])),
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
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
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
                product_code: r.product_code.unwrap_or_default(),
                quantity: r.quantity.unwrap_or_default(),
                completed_quantity: r.completed_quantity.unwrap_or_default(),
                status: r.status,
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: r.planned_start_date,
                planned_end_date: r.planned_end_date,
                actual_start_date: r.actual_start_date,
                actual_end_date: r.actual_end_date,
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            Json(ApiResponse::success(order, "获取生产工单成功"))
        }
        None => Json(ApiResponse::error(404, "生产工单不存在")),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/orders/{id}",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    request_body = UpdateProductionOrderRequest,
    responses(
        (status = 200, description = "生产订单更新成功", body = ApiResponse<ProductionOrderResponse>),
        (status = 404, description = "生产订单不存在"),
    ),
)]
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
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
        id,
        req.product_name,
        req.product_code,
req.quantity.map(|q| q as i32),        req.planned_start_date.map(|d| d.date()),
req.planned_end_date.map(|d| d.date()),
        req.workshop_id,
        req.notes,
        Utc::now(),
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
                product_code: r.product_code.unwrap_or_default(),
                quantity: r.quantity.unwrap_or_default(),
                completed_quantity: r.completed_quantity.unwrap_or_default(),
                status: r.status,
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: r.planned_start_date,
                planned_end_date: r.planned_end_date,
                actual_start_date: r.actual_start_date,
                actual_end_date: r.actual_end_date,
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            Json(ApiResponse::success(order, "生产工单更新成功"))
        }
        None => Json(ApiResponse::error(404, "生产工单不存在或状态不允许修改")),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/orders/{id}",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    responses(
        (status = 200, description = "生产订单删除成功"),
        (status = 404, description = "生产订单不存在"),
    ),
)]
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/orders/{id}/start",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    responses(
        (status = 200, description = "生产订单开始成功", body = ApiResponse<ProductionOrderResponse>),
        (status = 404, description = "生产订单不存在"),
    ),
)]
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
            updated_at = $3
        WHERE id = $1 AND status = 'released'
        RETURNING 
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
        id,
now.date(),
        now,
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
                product_code: r.product_code.unwrap_or_default(),
                quantity: r.quantity.unwrap_or_default(),
                completed_quantity: r.completed_quantity.unwrap_or_default(),
                status: r.status,
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: r.planned_start_date,
                planned_end_date: r.planned_end_date,
                actual_start_date: r.actual_start_date,
                actual_end_date: r.actual_end_date,
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            Json(ApiResponse::success(order, "生产工单启动成功"))
        }
        None => Json(ApiResponse::error(404, "生产工单不存在或状态不允许启动")),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/orders/{id}/complete",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    responses(
        (status = 200, description = "生产订单完成成功", body = ApiResponse<ProductionOrderResponse>),
        (status = 404, description = "生产订单不存在"),
    ),
)]
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
            updated_at = $3
        WHERE id = $1 AND status = 'in_progress'
        RETURNING 
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
        id,
now.date(),
        now,
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
                product_code: r.product_code.unwrap_or_default(),
                quantity: r.quantity.unwrap_or_default(),
                completed_quantity: r.completed_quantity.unwrap_or_default(),
                status: r.status,
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: r.planned_start_date,
                planned_end_date: r.planned_end_date,
                actual_start_date: r.actual_start_date,
                actual_end_date: r.actual_end_date,
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            Json(ApiResponse::success(order, "生产工单完成成功"))
        }
        None => Json(ApiResponse::error(404, "生产工单不存在或状态不允许完成")),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/orders/{id}/cancel",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    responses(
        (status = 200, description = "生产订单取消成功", body = ApiResponse<ProductionOrderResponse>),
        (status = 404, description = "生产订单不存在"),
    ),
)]
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
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
        id,
        now,
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
                product_code: r.product_code.unwrap_or_default(),
                quantity: r.quantity.unwrap_or_default(),
                completed_quantity: r.completed_quantity.unwrap_or_default(),
                status: r.status,
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: r.planned_start_date,
                planned_end_date: r.planned_end_date,
                actual_start_date: r.actual_start_date,
                actual_end_date: r.actual_end_date,
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            Json(ApiResponse::success(order, "生产工单取消成功"))
        }
        None => Json(ApiResponse::error(404, "生产工单不存在或状态不允许取消")),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["mes:production:write"])),
    path = "/api/mes/orders/{id}/release",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    responses(
        (status = 200, description = "生产订单下达成功", body = ApiResponse<ProductionOrderResponse>),
        (status = 404, description = "生产订单不存在"),
    ),
)]
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
            id, order_number AS order_no, NULL::uuid AS product_id, product_name, product_code,
            quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, NULL::varchar AS source,
            source_order_id, source_order_number,
            planned_start_date::timestamptz AS planned_start_date, planned_end_date::timestamptz AS planned_end_date,
            actual_start_date::timestamptz AS actual_start_date, actual_end_date::timestamptz AS actual_end_date,
            workshop_id, notes, created_at::timestamptz AS created_at, updated_at::timestamptz AS updated_at
        "#,
        id,
        now,
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
                product_code: r.product_code.unwrap_or_default(),
                quantity: r.quantity.unwrap_or_default(),
                completed_quantity: r.completed_quantity.unwrap_or_default(),
                status: r.status,
                source: r.source.unwrap_or_else(|| "manual".to_string()),
                source_order_id: r.source_order_id,
                source_order_number: r.source_order_number,
                planned_start_date: r.planned_start_date,
                planned_end_date: r.planned_end_date,
                actual_start_date: r.actual_start_date,
                actual_end_date: r.actual_end_date,
                workshop_id: r.workshop_id,
                notes: r.notes,
                created_at: r.created_at,
                updated_at: r.updated_at,
            };
            Json(ApiResponse::success(order, "生产工单发布成功"))
        }
        None => Json(ApiResponse::error(404, "生产工单不存在或状态不允许发布")),
    }
}

// ==================== APV-1: 生产订单审批端点（骨架） ====================

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ApprovalStartRequest {
    pub reason: String,
    #[allow(dead_code)]
    pub change_scope: Option<String>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct ApprovalDecisionRequest {
    pub approval_id: Uuid,
    pub comment: String,
    #[allow(dead_code)]
    pub expected_approval_version: i32,
}

/// 发起生产订单审批（撤单/回滚场景）
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/orders/{id}/approval/start",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    request_body = ApprovalStartRequest,
    responses(
        (status = 200, description = "审批发起成功", body = ApiResponse<serde_json::Value>),
    ),
)]
#[allow(unused_variables)]
pub async fn start_order_approval(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ApprovalStartRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MesOrderApprove).await
    {
        return e;
    }
    // 校验当前 status + 创建 approval 记录并写入 audit log
    let approver_id = match claims.user_id() {
        Ok(uid) => uid,
        Err(_) => return Json(ApiResponse::error(401, "无效的用户身份")),
    };
    let approval_id = match create_approval_and_log(
        &state.pool,
        "production_order",
        id,
        "pending",
        "released",
        approver_id,
    )
    .await
    {
        Ok(aid) => aid,
        Err(e) => {
            tracing::error!("发起生产订单审批失败: {}", e);
            return Json(ApiResponse::error(500, "发起审批失败"));
        }
    };
    Json(ApiResponse::success(
        build_start_response(approval_id),
        "审批已发起",
    ))
}

/// 审批通过
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/orders/{id}/approval/approve",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    request_body = ApprovalDecisionRequest,
    responses(
        (status = 200, description = "审批通过成功", body = ApiResponse<serde_json::Value>),
    ),
)]
#[allow(unused_variables)]
pub async fn approve_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ApprovalDecisionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MesOrderApprove).await
    {
        return e;
    }
    // 校验 approval_id 与版本，执行状态转换并写入 audit log
    if let Err(e) = execute_transition_and_log(
        &state.pool,
        Some("production_orders"),
        "production_order",
        id,
        req.approval_id,
        "pending",
        "released",
    )
    .await
    {
        tracing::error!("生产订单审批通过失败: {}", e);
        return Json(ApiResponse::error(500, "审批通过失败"));
    }
    Json(ApiResponse::success(
        build_approve_response(req.approval_id),
        "审批通过成功",
    ))
}

/// 审批驳回
#[utoipa::path(
    post,
    security(("BearerAuth" = ["mes:write"])),
    path = "/api/mes/orders/{id}/approval/reject",
    tag = "ProductionOrder",
    params(
        ("id" = String, Path, description = "订单ID"),
    ),
    request_body = ApprovalDecisionRequest,
    responses(
        (status = 200, description = "审批驳回成功", body = ApiResponse<serde_json::Value>),
    ),
)]
#[allow(unused_variables)]
pub async fn reject_order(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<ApprovalDecisionRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&state.pool, &claims, &ModulePermission::MesOrderApprove).await
    {
        return e;
    }
    // 校验 approval_id 与版本，记录驳回并写入 audit log
    if let Err(e) = reject_and_log(
        &state.pool,
        "production_order",
        id,
        req.approval_id,
        &req.comment,
    )
    .await
    {
        tracing::error!("生产订单审批驳回失败: {}", e);
        return Json(ApiResponse::error(500, "审批驳回失败"));
    }
    Json(ApiResponse::success(
        build_reject_response(req.approval_id),
        "审批驳回成功",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::de::DeserializeOwned;
    use serde::Serialize;
    use uuid::Uuid;

    fn uid() -> Uuid {
        Uuid::new_v4()
    }
    fn now() -> chrono::DateTime<Utc> {
        Utc::now()
    }

    fn roundtrip<T: Serialize + DeserializeOwned>(val: &T) {
        let s1 = serde_json::to_string(val).unwrap();
        let v1: serde_json::Value = serde_json::from_str(&s1).unwrap();
        let val2: T = serde_json::from_str(&s1).unwrap();
        let s2 = serde_json::to_string(&val2).unwrap();
        let v2: serde_json::Value = serde_json::from_str(&s2).unwrap();
        assert_eq!(v1, v2);
    }

    #[test]
    fn test_production_order_source_roundtrip() {
        roundtrip(&ProductionOrderSource::Manual);
        roundtrip(&ProductionOrderSource::ErpSalesOrder);
        roundtrip(&ProductionOrderSource::Mrp);
    }

    #[test]
    fn test_erp_sales_order_info_roundtrip_some() {
        let info = ErpSalesOrderInfo {
            order_id: uid(),
            order_number: "SO-20260815-001".to_string(),
            customer_name: "ABC 公司".to_string(),
            product_name: "轴承 SKF-6205".to_string(),
            product_code: "BRG-6205".to_string(),
            quantity: 500.0,
            unit: "PCS".to_string(),
            delivery_date: Some(now()),
            priority: Some(1),
        };
        roundtrip(&info);
    }

    #[test]
    fn test_erp_sales_order_info_roundtrip_none() {
        let info = ErpSalesOrderInfo {
            order_id: uid(),
            order_number: "SO-20260815-002".to_string(),
            customer_name: "XYZ 公司".to_string(),
            product_name: "轴承 SKF-6205".to_string(),
            product_code: "BRG-6205".to_string(),
            quantity: 300.0,
            unit: "PCS".to_string(),
            delivery_date: None,
            priority: None,
        };
        roundtrip(&info);
    }

    #[test]
    fn test_validate_state_transition_same_status() {
        assert!(validate_state_transition("pending", "pending").is_ok());
        assert!(validate_state_transition("in_progress", "in_progress").is_ok());
    }

    #[test]
    fn test_validate_state_transition_valid_paths() {
        assert!(validate_state_transition("pending", "released").is_ok());
        assert!(validate_state_transition("pending", "cancelled").is_ok());
        assert!(validate_state_transition("released", "in_progress").is_ok());
        assert!(validate_state_transition("released", "cancelled").is_ok());
        assert!(validate_state_transition("in_progress", "completed").is_ok());
        assert!(validate_state_transition("in_progress", "paused").is_ok());
        assert!(validate_state_transition("paused", "in_progress").is_ok());
        assert!(validate_state_transition("paused", "cancelled").is_ok());
        assert!(validate_state_transition("completed", "closed").is_ok());
    }

    #[test]
    fn test_validate_state_transition_invalid_paths() {
        assert!(validate_state_transition("pending", "in_progress").is_err());
        assert!(validate_state_transition("pending", "completed").is_err());
        assert!(validate_state_transition("released", "completed").is_err());
        assert!(validate_state_transition("in_progress", "released").is_err());
        assert!(validate_state_transition("completed", "in_progress").is_err());
        assert!(validate_state_transition("cancelled", "released").is_err());
        assert!(validate_state_transition("closed", "completed").is_err());
    }

    #[test]
    fn test_validate_state_transition_error_message() {
        let err = validate_state_transition("pending", "completed").unwrap_err();
        assert!(err.contains("Invalid state transition"));
        assert!(err.contains("pending"));
        assert!(err.contains("completed"));
    }
}
