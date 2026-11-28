use axum::{
    extract::{Extension, Path, Query, State},
    routing::*,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::production_order_status::ProductionOrderStatus;
use super::ApiState;

/// 可选的请求状态归一：空/缺省 => 不改变状态；未知值 => Err（由调用方转 400）
/// 响应兜底：把库里可能的未知历史值收敛到枚举词表
fn normalize_order(mut order: ProductionOrder) -> ProductionOrder {
    order.status = ProductionOrderStatus::normalize(&order.status).to_string();
    order
}

fn parse_optional_status(raw: Option<&str>) -> Result<Option<&'static str>, &'static str> {
    match raw.map(str::trim) {
        None => Ok(None),
        Some("") => Ok(None),
        Some(v) => ProductionOrderStatus::from_db_str(v)
            .map(|s| Some(s.as_db_str()))
            .ok_or("unknown_status"),
    }
}
use crate::models::production_order::{
    CreateProductionOrderRequest, ListProductionOrdersResponse, ProductionOrder,
    UpdateProductionOrderRequest, UpdateProductionProgressRequest,
};
use topems_shared_auth::auth::Claims;
use topems_shared_core::{response::ApiResponse, TopemsError};
use topems_shared_event::event::{ErpProductionOrderDispatchedPayload, EventType};

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ProductionOrderListParams {
    #[serde(default, alias = "p")]
    pub page: Option<i64>,
    #[serde(
        default,
        alias = "pagesize",
        alias = "pageSize",
        alias = "size",
        alias = "limit"
    )]
    pub page_size: Option<i64>,
    #[serde(default, alias = "q", alias = "keyword")]
    pub search: Option<String>,
    pub status: Option<String>,
}

impl ProductionOrderListParams {
    fn page_or_default(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }
    fn page_size_or_default(&self) -> i64 {
        self.page_size.unwrap_or(20).clamp(1, 100)
    }
    fn offset(&self) -> i64 {
        (self.page_or_default() - 1) * self.page_size_or_default()
    }
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/production-orders",
            get(list_production_orders).post(create_production_order),
        )
        .route(
            "/production-orders/{id}",
            get(get_production_order)
                .put(update_production_order)
                .delete(delete_production_order),
        )
        .route(
            "/production-orders/{id}/progress",
            put(update_production_progress),
        )
        .route(
            "/production-orders/{id}/status",
            post(update_production_status),
        )
        .route(
            "/production-orders/sync/mes-progress",
            post(receive_mes_progress),
        )
        // 前端契约补绑：扁平动词路径（readOps.ts 声明），与 RESTful 列表端点共用同一处理器。
        .route(
            "/production-order/list-production-orders",
            get(list_production_orders),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/production-orders",
    tag = "ProductionOrder",
    operation_id = "list_production_orders",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_production_orders(
    State(_state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<ProductionOrderListParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<ListProductionOrdersResponse> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let _page = params.page_or_default();
    let page_size = params.page_size_or_default();
    let offset = params.offset();

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = match ProductionOrderStatus::parse_filter(params.status.as_deref()) {
        Ok(v) => v.map(|s| s.as_db_str().to_string()),
        Err(_) => return ApiResponse::bad_request("非法的生产订单状态筛选值"),
    };

    let result = sqlx::query_as::<_, ProductionOrder>(
        only_own_schema_query!("erp", r#"
        SELECT id, order_no, product_id, product_name, product_code,
               quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, source,
               source_order_id, source_order_number,
               planned_start_date, planned_end_date,
               actual_start_date, actual_end_date,
               workshop_id, workshop_name, priority, notes,
               created_at, updated_at
        FROM erp.erp_production_orders
        WHERE ($1::text IS NULL OR product_name ILIKE $1 OR order_no ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#),
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(orders) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "erp",
                r#"
                SELECT COUNT(*) FROM erp.erp_production_orders
                WHERE ($1::text IS NULL OR product_name ILIKE $1 OR order_no ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND deleted_at IS NULL
                "#
            ))
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                ListProductionOrdersResponse {
                    orders: orders.into_iter().map(normalize_order).collect(),
                    total,
                },
                "获取生产订单列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取生产订单列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取生产订单列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/production-orders",
    tag = "ProductionOrder",
    operation_id = "create_production_order",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_production_order(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateProductionOrderRequest>,
) -> ApiResponse<ProductionOrder> {
    // 写操作必须携带有效租户：缺失/零租户返回 400，禁止落零 UUID。
    let Some(tenant_id) = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
        .filter(|t| !t.is_nil())
    else {
        return ApiResponse::error(400, "缺少租户上下文：拒绝创建生产订单");
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let now = Utc::now();
    let order_no = format!(
        "ERP-PO{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let source = req.source.unwrap_or_else(|| "manual".to_string());

    let result = sqlx::query_as::<_, ProductionOrder>(
        only_own_schema_query!("erp", r#"
        INSERT INTO erp.erp_production_orders (
            order_no, product_id, product_name, product_code,
            quantity, completed_quantity, status, source,
            source_order_id, source_order_number,
            planned_start_date, planned_end_date,
            workshop_id, workshop_name, priority, notes,
            created_at, updated_at
        , tenant_id) VALUES (
            $1, $2, $3, $4, $5, 0, $17, $6,
            $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $15
        , $16)
        RETURNING id, order_no, product_id, product_name, product_code,
                  quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, source,
                  source_order_id, source_order_number,
                  planned_start_date, planned_end_date,
                  actual_start_date, actual_end_date,
                  workshop_id, workshop_name, priority, notes,
                  created_at, updated_at
        "#),
    )
    .bind(&order_no)
    .bind(req.product_id)
    .bind(&req.product_name)
    .bind(&req.product_code)
    .bind(req.quantity)
    .bind(&source)
    .bind(req.source_order_id.map(|id| id.to_string()))
    .bind(&req.source_order_number)
    .bind(req.planned_start_date.map(|d| d.date_naive()))
    .bind(req.planned_end_date.map(|d| d.date_naive()))
    .bind(req.workshop_id)
    .bind(&req.workshop_name)
    .bind(req.priority.unwrap_or(0))
    .bind(&req.notes)
    .bind(now.naive_utc())
    .bind(tenant_id)
    .bind(ProductionOrderStatus::DEFAULT.as_db_str())
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(order) => {
            tracing::debug!("[ERP] Created production order: {}", order_no);
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(normalize_order(order), "生产订单创建成功")
        }
        Err(e) => {
            tracing::error!("创建生产订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建生产订单失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/production-orders/{id}",
    tag = "ProductionOrder",
    operation_id = "get_production_order",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_production_order(
    State(_state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<ProductionOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let result = sqlx::query_as::<_, ProductionOrder>(
        only_own_schema_query!("erp", r#"
        SELECT id, order_no, product_id, product_name, product_code,
               quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, source,
               source_order_id, source_order_number,
               planned_start_date, planned_end_date,
               actual_start_date, actual_end_date,
               workshop_id, workshop_name, priority, notes,
               created_at, updated_at
        FROM erp.erp_production_orders
        WHERE id = $1 AND deleted_at IS NULL
        "#),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(order)) => ApiResponse::success(normalize_order(order), "获取生产订单成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("生产订单不存在".to_string())),
        Err(e) => {
            tracing::error!("获取生产订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取生产订单失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/production-orders/{id}",
    tag = "ProductionOrder",
    operation_id = "update_production_order",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_production_order(
    State(_state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateProductionOrderRequest>,
) -> ApiResponse<ProductionOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let result = sqlx::query_as::<_, ProductionOrder>(
        only_own_schema_query!("erp", r#"
        UPDATE erp.erp_production_orders SET
            product_name = COALESCE($2, product_name),
            product_code = COALESCE($3, product_code),
            quantity = COALESCE($4, quantity),
            planned_start_date = COALESCE($5, planned_start_date),
            planned_end_date = COALESCE($6, planned_end_date),
            workshop_id = COALESCE($7, workshop_id),
            workshop_name = COALESCE($8, workshop_name),
            priority = COALESCE($9, priority),
            notes = COALESCE($10, notes),
            updated_at = $11
        WHERE id = $1 AND status = ANY($12)
        RETURNING id, order_no, product_id, product_name, product_code,
                  quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, source,
                  source_order_id, source_order_number,
                  planned_start_date, planned_end_date,
                  actual_start_date, actual_end_date,
                  workshop_id, workshop_name, priority, notes,
                  created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&req.product_name)
    .bind(&req.product_code)
    .bind(req.quantity)
    .bind(req.planned_start_date.map(|d| d.date_naive()))
    .bind(req.planned_end_date.map(|d| d.date_naive()))
    .bind(req.workshop_id)
    .bind(&req.workshop_name)
    .bind(req.priority)
    .bind(&req.notes)
    .bind(Utc::now().naive_utc())
    .bind(vec![
        ProductionOrderStatus::Pending.as_db_str(),
        ProductionOrderStatus::Released.as_db_str(),
    ])
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(order)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(normalize_order(order), "生产订单更新成功")
        }

        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound(
            "生产订单不存在或状态不允许修改".to_string(),
        )),
        Err(e) => {
            tracing::error!("更新生产订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新生产订单失败".to_string()))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/production-orders/{id}",
    tag = "ProductionOrder",
    operation_id = "delete_production_order",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn delete_production_order(
    State(_state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let result = sqlx::query(only_own_schema_query!(
        "erp",
        r#"
        UPDATE erp.erp_production_orders SET deleted_at = NOW()
        WHERE id = $1 AND status = ANY($2)
        "#
    ))
    .bind(id)
    .bind(vec![
        ProductionOrderStatus::Pending.as_db_str(),
        ProductionOrderStatus::Cancelled.as_db_str(),
    ])
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) => {
            if r.rows_affected() > 0 {
                if let Some(t) = guard.take() {
                    if let Err(e) = t.commit().await {
                        tracing::error!("事务提交失败: {}", e);
                        return ApiResponse::server_error("事务提交失败");
                    }
                }
                ApiResponse::success("".to_string(), "生产订单删除成功")
            } else {
                ApiResponse::from(TopemsError::ResourceNotFound(
                    "生产订单不存在或状态不允许删除".to_string(),
                ))
            }
        }
        Err(e) => {
            tracing::error!("删除生产订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除生产订单失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/production-orders/{id}/progress",
    tag = "ProductionOrder",
    operation_id = "update_production_progress",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_production_progress(
    State(_state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateProductionProgressRequest>,
) -> ApiResponse<ProductionOrder> {
    let progress_status = match parse_optional_status(req.status.as_deref()) {
        Ok(v) => v,
        Err(_) => return ApiResponse::bad_request("非法的生产订单状态"),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let result = sqlx::query_as::<_, ProductionOrder>(
        only_own_schema_query!("erp", r#"
        UPDATE erp.erp_production_orders SET
            completed_quantity = COALESCE($2, completed_quantity),
            status = COALESCE($3, status),
            actual_start_date = COALESCE($4, actual_start_date),
            actual_end_date = COALESCE($5, actual_end_date),
            updated_at = $6
        WHERE id = $1
        RETURNING id, order_no, product_id, product_name, product_code,
                  quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, source,
                  source_order_id, source_order_number,
                  planned_start_date, planned_end_date,
                  actual_start_date, actual_end_date,
                  workshop_id, workshop_name, priority, notes,
                  created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(req.completed_quantity)
    .bind(progress_status)
    .bind(req.actual_start_date.map(|d| d.naive_utc()))
    .bind(req.actual_end_date.map(|d| d.naive_utc()))
    .bind(Utc::now().naive_utc())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(order)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(normalize_order(order), "生产进度更新成功")
        }

        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("生产订单不存在".to_string())),
        Err(e) => {
            tracing::error!("更新生产进度失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新生产进度失败".to_string()))
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateStatusRequest {
    pub status: String,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:update"])),
    path = "/production-orders/{id}/status",
    tag = "ProductionOrder",
    operation_id = "update_production_status",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_production_status(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateStatusRequest>,
) -> ApiResponse<ProductionOrder> {
    let Some(next) = ProductionOrderStatus::from_db_str(&req.status) else {
        return ApiResponse::bad_request("非法的生产订单状态");
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionOrder>(
        only_own_schema_query!("erp", r#"
        UPDATE erp.erp_production_orders SET
            status = $2,
            updated_at = $3
        WHERE id = $1
        RETURNING id, order_no, product_id, product_name, product_code,
                  quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, source,
                  source_order_id, source_order_number,
                  planned_start_date, planned_end_date,
                  actual_start_date, actual_end_date,
                  workshop_id, workshop_name, priority, notes,
                  created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(next.as_db_str())
    .bind(now.naive_utc())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(order)) => {
            // D2 U2 环2（决策 A）：erp→mes 工单下达由同步 HTTP（mes_client.create_from_erp）
            // 改为发布 `ErpProductionOrderDispatched` 事件，mes 订阅创建生产工单（保留 source_order_id 映射）。
            // 幂等键 = erp_order_id；失败由 mes 侧 DLQ 兜底，不阻塞主流程。
            if next == ProductionOrderStatus::Approved {
                if let Some(publisher) = &state.event_publisher {
                    let publisher = publisher.clone();
                    let order_clone = order.clone();
                    // 下达事件必须携带真实租户：mes 侧据此建立租户作用域，
                    // 缺失时 mes 会拒单并转入 DLQ（不再落 nil 租户工单）。
                    let publish_tenant_id = _claims
                        .tenant_id
                        .as_deref()
                        .and_then(|s| Uuid::parse_str(s).ok());
                    if publish_tenant_id.is_none() {
                        tracing::warn!(
                            "[ERP→MES] 当前请求无租户上下文，ErpProductionOrderDispatched 将缺 tenant_id - order_no={}, is_superuser={}",
                            order_clone.order_no,
                            _claims.is_superuser
                        );
                    }
                    tokio::spawn(async move {
                        let order_no = order_clone.order_no.clone();
                        let payload = ErpProductionOrderDispatchedPayload {
                            erp_order_id: order_clone.id,
                            order_no: order_clone.order_no,
                            product_id: order_clone.product_id,
                            product_name: Some(order_clone.product_name),
                            product_code: Some(order_clone.product_code),
                            quantity: Some(order_clone.quantity),
                            workshop_id: order_clone.workshop_id,
                            workshop_name: order_clone.workshop_name,
                            priority: order_clone.priority.map(|p| p.to_string()),
                            planned_start_date: order_clone.planned_start_date,
                            planned_end_date: order_clone.planned_end_date,
                            notes: order_clone.notes,
                            tenant_id: publish_tenant_id,
                        };
                        if let Err(e) = publisher
                            .publish_event(EventType::ErpProductionOrderDispatched, payload)
                            .await
                        {
                            tracing::error!(
                                "[ERP→MES] ErpProductionOrderDispatched 事件发布失败（工单下达滞留，需人工重发）: {}",
                                e
                            );
                        } else {
                            tracing::info!(
                                "[ERP→MES] 生产工单下达事件发布成功 - order_no={}",
                                order_no
                            );
                        }
                    });
                } else {
                    tracing::warn!(
                        "[ERP] event_publisher 未配置，生产工单下达事件未发布 - order_id={}",
                        order.id
                    );
                }
            }
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(normalize_order(order), "生产订单状态更新成功")
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("生产订单不存在".to_string())),
        Err(e) => {
            tracing::error!("更新生产订单状态失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新生产订单状态失败".to_string()))
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct MesProgressUpdate {
    pub mes_order_id: Uuid,
    pub erp_order_id: Option<Uuid>,
    pub completed_quantity: Option<f64>,
    pub status: Option<String>,
    pub actual_start_date: Option<DateTime<Utc>>,
    pub actual_end_date: Option<DateTime<Utc>>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/production-orders/sync/mes-progress",
    tag = "ProductionOrder",
    operation_id = "receive_mes_progress",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn receive_mes_progress(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<MesProgressUpdate>,
) -> ApiResponse<ProductionOrder> {
    let mes_status = match parse_optional_status(req.status.as_deref()) {
        Ok(v) => v,
        Err(_) => return ApiResponse::bad_request("非法的生产订单状态"),
    };
    let mut guard = txn_arc.lock().await;
    let _txn = match guard.as_mut() {
        Some(_txn) => _txn,
        None => unreachable!("rls txn missing"),
    };
    // 服务间调用（service token）：请求事务按租户上下文开启，本接口需要 nil 租户放行 RLS，
    // 因此在事务外单独取一条系统连接完成短事务，语义与改造前一致。
    let mut tx = match state.system_pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("begin tx failed in receive_mes_progress: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新生产进度失败".to_string()));
        }
    };
    if let Err(e) = sqlx::query("SELECT set_config('app.tenant_id', $1, true)")
        .bind(Uuid::nil().to_string())
        .execute(&mut *tx)
        .await
    {
        tracing::error!("set nil RLS context failed in receive_mes_progress: {}", e);
        return ApiResponse::from(TopemsError::Internal("更新生产进度失败".to_string()));
    }

    let order_id = match req.erp_order_id {
        Some(id) => id,
        None => {
            let result = sqlx::query_scalar::<_, Option<Uuid>>(
                only_own_schema_query!("erp", "SELECT id FROM erp.erp_production_orders WHERE source_order_id = $1 AND deleted_at IS NULL LIMIT 1"),
            )
            .bind(req.mes_order_id.to_string())
            .fetch_optional(&mut *tx)
            .await;

            match result {
                Ok(Some(Some(id))) => id,
                Ok(Some(None)) | Ok(None) => {
                    return ApiResponse::from(TopemsError::ResourceNotFound(
                        "未找到对应的ERP生产订单".to_string(),
                    ));
                }
                Err(e) => {
                    tracing::error!("查询ERP订单ID失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal(
                        "查询ERP生产订单失败".to_string(),
                    ));
                }
            }
        }
    };

    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionOrder>(
        only_own_schema_query!("erp", r#"
        UPDATE erp.erp_production_orders SET
            completed_quantity = COALESCE($2, completed_quantity),
            status = COALESCE($3, status),
            actual_start_date = COALESCE($4, actual_start_date),
            actual_end_date = COALESCE($5, actual_end_date),
            updated_at = $6
        WHERE id = $1
        RETURNING id, order_no, product_id, product_name, product_code,
                  quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, source,
                  source_order_id, source_order_number,
                  planned_start_date, planned_end_date,
                  actual_start_date, actual_end_date,
                  workshop_id, workshop_name, priority, notes,
                  created_at, updated_at
        "#),
    )
    .bind(order_id)
    .bind(req.completed_quantity)
    .bind(mes_status)
    .bind(req.actual_start_date.map(|d| d.naive_utc()))
    .bind(req.actual_end_date.map(|d| d.naive_utc()))
    .bind(now.naive_utc())
    .fetch_optional(&mut *tx)
    .await;

    match result {
        Ok(Some(order)) => {
            if let Err(e) = tx.commit().await {
                tracing::error!("commit tx failed in receive_mes_progress: {}", e);
                return ApiResponse::from(TopemsError::Internal("更新生产进度失败".to_string()));
            }

            tracing::debug!(
                "[ERP] Received MES progress update for order: {}",
                order.order_no
            );
            ApiResponse::success(normalize_order(order), "MES生产进度同步成功")
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("生产订单不存在".to_string())),
        Err(e) => {
            tracing::error!("同步MES生产进度失败: {}", e);
            ApiResponse::from(TopemsError::Internal("同步MES生产进度失败".to_string()))
        }
    }
}

#[cfg(test)]
#[allow(clippy::unwrap_used, clippy::expect_used, clippy::indexing_slicing)]
mod tests {
    use super::*;

    #[test]
    fn test_update_status_request_deserialize() {
        let json = r#"{"status": "in_progress"}"#;
        let request: UpdateStatusRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.status, "in_progress");
    }

    #[test]
    fn test_update_status_request_completed() {
        let json = r#"{"status": "completed"}"#;
        let request: UpdateStatusRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.status, "completed");
    }

    #[test]
    fn test_mes_progress_update_deserialize() {
        let json = r#"{
            "mes_order_id": "550e8400-e29b-41d4-a716-446655440000",
            "erp_order_id": "660e8400-e29b-41d4-a716-446655440001",
            "completed_quantity": 50.0,
            "status": "in_progress"
        }"#;
        let update: MesProgressUpdate = serde_json::from_str(json).unwrap();
        assert_eq!(update.completed_quantity, Some(50.0));
        assert_eq!(update.status.as_deref(), Some("in_progress"));
        assert!(update.actual_start_date.is_none());
        assert!(update.actual_end_date.is_none());
    }

    #[test]
    fn test_mes_progress_update_minimal() {
        let json = r#"{
            "mes_order_id": "550e8400-e29b-41d4-a716-446655440000"
        }"#;
        let update: MesProgressUpdate = serde_json::from_str(json).unwrap();
        assert!(update.erp_order_id.is_none());
        assert!(update.completed_quantity.is_none());
        assert!(update.status.is_none());
        assert!(update.actual_start_date.is_none());
        assert!(update.actual_end_date.is_none());
    }

    #[test]
    fn test_mes_progress_update_with_dates() {
        let json = r#"{
            "mes_order_id": "550e8400-e29b-41d4-a716-446655440000",
            "completed_quantity": 100.0,
            "status": "completed",
            "actual_start_date": "2024-01-01T08:00:00Z",
            "actual_end_date": "2024-01-02T17:00:00Z"
        }"#;
        let update: MesProgressUpdate = serde_json::from_str(json).unwrap();
        assert_eq!(update.completed_quantity, Some(100.0));
        assert_eq!(update.status.as_deref(), Some("completed"));
        assert!(update.actual_start_date.is_some());
        assert!(update.actual_end_date.is_some());
    }
}
