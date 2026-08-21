use axum::{
    extract::{Extension, Path, Query, State},
    routing::*,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use topems_shared_db::repository::ListQueryParams;
use uuid::Uuid;

use super::ApiState;
use crate::models::production_order::{
    CreateProductionOrderRequest, ListProductionOrdersResponse, ProductionOrder,
    UpdateProductionOrderRequest, UpdateProductionProgressRequest,
};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::response::api_error;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct ProductionOrderListParams {
    #[serde(flatten)]
    pub base: ListQueryParams,
    pub status: Option<String>,
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
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/production-order/list-production-orders",
    tag = "ProductionOrder",
    operation_id = "list_production_orders",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn list_production_orders(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<ProductionOrderListParams>,
) -> Json<ApiResponse<ListProductionOrdersResponse>> {
    let _page = params.base.page_or_default();
    let page_size = params.base.page_size_or_default();
    let offset = params.base.offset();

    let search_pattern = params.base.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, ProductionOrder>(
        r#"
        SELECT id, order_no, product_id, product_name, product_code,
               quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, source,
               source_order_id, source_order_number,
               planned_start_date, planned_end_date,
               actual_start_date, actual_end_date,
               workshop_id, workshop_name, priority, notes,
               created_at, updated_at
        FROM erp_production_orders
        WHERE ($1::text IS NULL OR product_name ILIKE $1 OR order_no ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(orders) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM erp_production_orders
                WHERE ($1::text IS NULL OR product_name ILIKE $1 OR order_no ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND deleted_at IS NULL
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                ListProductionOrdersResponse { orders, total },
                "获取生产订单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取生产订单列表失败: {}", e);
            Json(api_error(500, "获取生产订单列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/erp/production-order/create-production-order",
    tag = "ProductionOrder",
    operation_id = "create_production_order",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_production_order(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<CreateProductionOrderRequest>,
) -> Json<ApiResponse<ProductionOrder>> {
    let now = Utc::now();
    let order_no = format!(
        "ERP-PO{}{:04}",
        now.format("%Y%m%d"),
        rand::random::<u16>() % 10000
    );

    let source = req.source.unwrap_or_else(|| "manual".to_string());

    let result = sqlx::query_as::<_, ProductionOrder>(
        r#"
        INSERT INTO erp_production_orders (
            order_no, product_id, product_name, product_code,
            quantity, completed_quantity, status, source,
            source_order_id, source_order_number,
            planned_start_date, planned_end_date,
            workshop_id, workshop_name, priority, notes,
            created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, 0, 'pending', $6,
            $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $15
        )
        RETURNING id, order_no, product_id, product_name, product_code,
                  quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, source,
                  source_order_id, source_order_number,
                  planned_start_date, planned_end_date,
                  actual_start_date, actual_end_date,
                  workshop_id, workshop_name, priority, notes,
                  created_at, updated_at
        "#,
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(order) => {
            tracing::debug!("[ERP] Created production order: {}", order_no);
            Json(ApiResponse::success(order, "生产订单创建成功"))
        }
        Err(e) => {
            tracing::error!("创建生产订单失败: {}", e);
            Json(api_error(500, "创建生产订单失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/production-order/get-production-order",
    tag = "ProductionOrder",
    operation_id = "get_production_order",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn get_production_order(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionOrder>> {
    let result = sqlx::query_as::<_, ProductionOrder>(
        r#"
        SELECT id, order_no, product_id, product_name, product_code,
               quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, source,
               source_order_id, source_order_number,
               planned_start_date, planned_end_date,
               actual_start_date, actual_end_date,
               workshop_id, workshop_name, priority, notes,
               created_at, updated_at
        FROM erp_production_orders
        WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(order)) => Json(ApiResponse::success(order, "获取生产订单成功")),
        Ok(None) => Json(api_error(404, "生产订单不存在")),
        Err(e) => {
            tracing::error!("获取生产订单失败: {}", e);
            Json(api_error(500, "获取生产订单失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/production-order/update-production-order",
    tag = "ProductionOrder",
    operation_id = "update_production_order",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_production_order(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProductionOrderRequest>,
) -> Json<ApiResponse<ProductionOrder>> {
    let result = sqlx::query_as::<_, ProductionOrder>(
        r#"
        UPDATE erp_production_orders SET
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
        WHERE id = $1 AND status IN ('pending', 'released')
        RETURNING id, order_no, product_id, product_name, product_code,
                  quantity::float8 AS quantity, completed_quantity::float8 AS completed_quantity, status, source,
                  source_order_id, source_order_number,
                  planned_start_date, planned_end_date,
                  actual_start_date, actual_end_date,
                  workshop_id, workshop_name, priority, notes,
                  created_at, updated_at
        "#,
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
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(order)) => Json(ApiResponse::success(order, "生产订单更新成功")),
        Ok(None) => Json(api_error(404, "生产订单不存在或状态不允许修改")),
        Err(e) => {
            tracing::error!("更新生产订单失败: {}", e);
            Json(api_error(500, "更新生产订单失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/erp/production-order/delete-production-order",
    tag = "ProductionOrder",
    operation_id = "delete_production_order",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn delete_production_order(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query(
        r#"
        UPDATE erp_production_orders SET deleted_at = NOW()
        WHERE id = $1 AND status IN ('pending', 'cancelled')
        "#,
    )
    .bind(id)
    .execute(&state.db)
    .await;

    match result {
        Ok(r) => {
            if r.rows_affected() > 0 {
                Json(ApiResponse::success("".to_string(), "生产订单删除成功"))
            } else {
                Json(api_error(404, "生产订单不存在或状态不允许删除"))
            }
        }
        Err(e) => {
            tracing::error!("删除生产订单失败: {}", e);
            Json(api_error(500, "删除生产订单失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/production-order/update-production-progress",
    tag = "ProductionOrder",
    operation_id = "update_production_progress",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_production_progress(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProductionProgressRequest>,
) -> Json<ApiResponse<ProductionOrder>> {
    let result = sqlx::query_as::<_, ProductionOrder>(
        r#"
        UPDATE erp_production_orders SET
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
        "#,
    )
    .bind(id)
    .bind(req.completed_quantity)
    .bind(&req.status)
    .bind(req.actual_start_date.map(|d| d.naive_utc()))
    .bind(req.actual_end_date.map(|d| d.naive_utc()))
    .bind(Utc::now().naive_utc())
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(order)) => Json(ApiResponse::success(order, "生产进度更新成功")),
        Ok(None) => Json(api_error(404, "生产订单不存在")),
        Err(e) => {
            tracing::error!("更新生产进度失败: {}", e);
            Json(api_error(500, "更新生产进度失败"))
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateStatusRequest {
    pub status: String,
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/production-order/update-production-status",
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
    Json(req): Json<UpdateStatusRequest>,
) -> Json<ApiResponse<ProductionOrder>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionOrder>(
        r#"
        UPDATE erp_production_orders SET
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
        "#,
    )
    .bind(id)
    .bind(&req.status)
    .bind(now.naive_utc())
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(order)) => Json(ApiResponse::success(order, "生产订单状态更新成功")),
        Ok(None) => Json(api_error(404, "生产订单不存在")),
        Err(e) => {
            tracing::error!("更新生产订单状态失败: {}", e);
            Json(api_error(500, "更新生产订单状态失败"))
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
    path = "/erp/production-order/receive-mes-progress",
    tag = "ProductionOrder",
    operation_id = "receive_mes_progress",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn receive_mes_progress(
    State(state): State<ApiState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<MesProgressUpdate>,
) -> Json<ApiResponse<ProductionOrder>> {
    let order_id = match req.erp_order_id {
        Some(id) => id,
        None => {
            let result = sqlx::query_scalar::<_, Option<Uuid>>(
                "SELECT id FROM erp_production_orders WHERE source_order_id = $1 AND deleted_at IS NULL LIMIT 1",
            )
            .bind(req.mes_order_id.to_string())
            .fetch_optional(&state.db)
            .await;

            match result {
                Ok(Some(Some(id))) => id,
                Ok(Some(None)) | Ok(None) => {
                    return Json(api_error(404, "未找到对应的ERP生产订单"));
                }
                Err(e) => {
                    tracing::error!("查询ERP订单ID失败: {}", e);
                    return Json(api_error(500, "查询ERP生产订单失败"));
                }
            }
        }
    };

    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionOrder>(
        r#"
        UPDATE erp_production_orders SET
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
        "#,
    )
    .bind(order_id)
    .bind(req.completed_quantity)
    .bind(&req.status)
    .bind(req.actual_start_date.map(|d| d.naive_utc()))
    .bind(req.actual_end_date.map(|d| d.naive_utc()))
    .bind(now.naive_utc())
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(order)) => {
            tracing::debug!(
                "[ERP] Received MES progress update for order: {}",
                order.order_no
            );
            Json(ApiResponse::success(order, "MES生产进度同步成功"))
        }
        Ok(None) => Json(api_error(404, "生产订单不存在")),
        Err(e) => {
            tracing::error!("同步MES生产进度失败: {}", e);
            Json(api_error(500, "同步MES生产进度失败"))
        }
    }
}
