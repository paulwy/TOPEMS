use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::models::outbound_order::*;
use crate::modules::audit::log_audit_event;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};
use topems_shared_event::event::{EventType, WmsInventoryItemShippedPayload};
use topems_shared_db::tenant::get_tenant_id_or_new;

#[derive(Debug, Deserialize, Serialize)]
pub struct OutboundOrderItemRequest {
    pub line_number: Option<i32>,
    pub material_code: String,
    pub material_name: String,
    pub material_type: Option<String>,
    pub specification: Option<String>,
    pub batch_number: Option<String>,
    pub lot_number: Option<String>,
    pub serial_number: Option<String>,
    pub requested_quantity: f64,
    pub unit: String,
    pub source_location_id: Option<Uuid>,
    pub unit_price: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ShipItemRequest {
    pub item_id: Uuid,
    pub shipped_quantity: f64,
    pub remarks: Option<String>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route(
            "/outbound-orders",
            get(list_outbound_orders).post(create_outbound_order),
        )
        .route(
            "/outbound-orders/{id}",
            get(get_outbound_order)
                .put(update_outbound_order)
                .delete(delete_outbound_order),
        )
        .route(
            "/outbound-orders/{id}/items",
            get(list_outbound_order_items).post(create_outbound_order_item),
        )
        .route(
            "/outbound-orders/{id}/items/{item_id}",
            put(update_outbound_order_item).delete(delete_outbound_order_item),
        )
        .route(
            "/outbound-orders/{id}/confirm",
            post(confirm_outbound_order),
        )
        .route("/outbound-orders/{id}/pick", post(pick_outbound_order))
        .route("/outbound-orders/{id}/pack", post(pack_outbound_order))
        .route("/outbound-orders/{id}/ship", post(ship_outbound_order))
        .route(
            "/outbound-orders/{id}/complete",
            post(complete_outbound_order),
        )
        .route(
            "/outbound-orders/{id}/approval/start",
            post(start_outbound_approval),
        )
        .route(
            "/outbound-orders/{id}/approval/approve",
            post(approve_outbound),
        )
        .route(
            "/outbound-orders/{id}/approval/reject",
            post(reject_outbound),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:outbound:read"])),
    path = "/api/wms/outbound-orders",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn list_outbound_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
               customer_id, customer_name, order_date, 
               expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
               total_value as total_amount, status, notes as remarks,
               sales_order_id, sales_order_number, carrier, tracking_number,
               picked_quantity, packed_quantity, shipped_quantity,
               created_by, approved_by, approved_at,
               created_at, updated_at
        FROM wms.outbound_orders
        WHERE ($1::text IS NULL OR order_number ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(orders) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                SELECT COUNT(*) FROM wms.outbound_orders
                WHERE ($1::text IS NULL OR order_number ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND deleted_at IS NULL
                "#
            ))
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "orders": orders,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取出库订单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取出库订单列表失败: {}", e);
            Json(api_error(500, "获取出库订单列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/api/wms/outbound-orders",
    tag = "wms",
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn create_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateOutboundOrderRequest>,
) -> Json<ApiResponse<OutboundOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        INSERT INTO wms.outbound_orders (id, organization_id, order_number, order_type, warehouse_id,
                                        customer_id, order_date, expected_ship_date, total_value,
                                        status, notes, created_at, updated_at, tenant_id)
        VALUES ($1, '00000000-0000-0000-0000-000000000001', $2, 'sales', $3, $4, $5, $6, $7,
               'created', $8, $9, $10, $11)
        RETURNING id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
                  customer_id, customer_name, order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, status, notes as remarks,
                  sales_order_id, sales_order_number, carrier, tracking_number,
                  picked_quantity, packed_quantity, shipped_quantity,
                  created_by, approved_by, approved_at,
                  created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(&req.order_number)
    .bind(req.warehouse_id)
    .bind(req.customer_id)
    .bind(req.order_date)
    .bind(req.expected_delivery)
    .bind(req.total_amount)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .bind(claims.tenant_id.as_deref().and_then(|s| Uuid::parse_str(s).ok()).unwrap_or(Uuid::nil()))
    .fetch_one(&mut **txn)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "出库订单创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建出库订单失败: {}", e);
            (
                Json(api_error(500, "出库订单创建失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(order) = &result {
        serde_json::to_value(order).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "outbound_order".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:outbound:read"])),
    path = "/api/wms/outbound-orders/{id}",
    tag = "wms",
    responses(
        (status = 200, description = "查询成功", body = OutboundOrder, content_type = "application/json"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn get_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<OutboundOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
               customer_id, customer_name, order_date, 
               expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
               total_value as total_amount, status, notes as remarks,
               sales_order_id, sales_order_number, carrier, tracking_number,
               picked_quantity, packed_quantity, shipped_quantity,
               created_by, approved_by, approved_at,
               created_at, updated_at
        FROM wms.outbound_orders WHERE id = $1 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(order)) => Json(ApiResponse::success(order, "获取出库订单成功")),
        Ok(None) => Json(api_error(404, "出库订单不存在")),
        Err(e) => {
            tracing::error!("获取出库订单失败: {}", e);
            Json(api_error(500, "获取出库订单失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/api/wms/outbound-orders/{id}",
    tag = "wms",
    responses(
        (status = 200, description = "更新成功", body = OutboundOrder, content_type = "application/json"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn update_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateOutboundOrderRequest>,
) -> Json<ApiResponse<OutboundOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();

    let existing = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
               customer_id, customer_name, order_date, 
               expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
               total_value as total_amount, status, notes as remarks,
               sales_order_id, sales_order_number, carrier, tracking_number,
               picked_quantity, packed_quantity, shipped_quantity,
               created_by, approved_by, approved_at,
               created_at, updated_at 
        FROM wms.outbound_orders WHERE id = $1 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => return Json(api_error(404, "出库订单不存在")),
        Err(e) => return Json(api_error(500, &format!("查询出库订单失败: {}", e))),
    };

    let warehouse_id = req.warehouse_id.or(existing.warehouse_id);
    let customer_id = req.customer_id.or(existing.customer_id);
    let expected_delivery = req.expected_delivery.or(existing.expected_delivery);
    let actual_delivery = req.actual_delivery.or(existing.actual_delivery);
    let total_amount = req.total_amount.or(existing.total_amount);
    let status = req.status.unwrap_or(existing.status);
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.outbound_orders SET
            warehouse_id = $2, customer_id = $3, expected_ship_date = $4, actual_ship_date = $5, 
            total_value = $6, status = $7, notes = $8, updated_at = $9
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
                  customer_id, customer_name, order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, status, notes as remarks,
                  sales_order_id, sales_order_number, carrier, tracking_number,
                  picked_quantity, packed_quantity, shipped_quantity,
                  created_by, approved_by, approved_at,
                  created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(warehouse_id)
    .bind(customer_id)
    .bind(expected_delivery)
    .bind(actual_delivery)
    .bind(total_amount)
    .bind(&status)
    .bind(&remarks)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "出库订单更新成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新出库订单失败: {}", e);
            (
                Json(api_error(500, "出库订单更新失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(order) = &result {
        serde_json::to_value(order).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "outbound_order".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/api/wms/outbound-orders/{id}",
    tag = "wms",
    responses(
        (status = 200, description = "删除成功"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn delete_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"UPDATE wms.outbound_orders SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL"#
    ))
    .bind(id)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
            (
                Json(ApiResponse::success("".to_string(), "出库订单删除成功")),
                "success",
                None,
            )
        }
        Ok(_) => (
            Json(api_error(404, "出库订单不存在")),
            "error",
            Some("出库订单不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除出库订单失败: {}", e);
            (
                Json(api_error(500, "出库订单删除失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "outbound_order".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:outbound:read"])),
    path = "/api/wms/outbound-orders/{id}/items",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn list_outbound_order_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(
        only_own_schema_query!("wms", r#"
        SELECT id, line_number, material_code, material_name, specification, batch_number,
               requested_quantity, reserved_quantity, picked_quantity, packed_quantity, shipped_quantity, unit, 
               source_location_id, source_location_code, destination_location_id, destination_location_code,
               unit_price, total_value, picking_status, packing_status, notes as remarks,
               created_at, updated_at
        FROM wms.outbound_order_items
        WHERE order_id = $1 AND deleted_at IS NULL
        ORDER BY line_number ASC
        "#),
    )
    .bind(id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let total: i64 = items.len() as i64;
            let shipped_count: i64 = items
                .iter()
                .filter(|r| (*r).try_get::<f64, _>("shipped_quantity").unwrap_or(0.0) > 0.0)
                .count() as i64;

            let items_json: Vec<serde_json::Value> = items
                .iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.try_get::<Uuid, _>("id").ok(),
                        "line_number": row.try_get::<i32, _>("line_number").ok(),
                        "material_code": row.try_get::<String, _>("material_code").ok(),
                        "material_name": row.try_get::<String, _>("material_name").ok(),
                        "specification": row.try_get::<Option<String>, _>("specification").ok(),
                        "batch_number": row.try_get::<Option<String>, _>("batch_number").ok(),
                        "requested_quantity": row.try_get::<f64, _>("requested_quantity").ok(),
                        "shipped_quantity": row.try_get::<f64, _>("shipped_quantity").ok(),
                        "unit": row.try_get::<String, _>("unit").ok(),
                        "status": row.try_get::<String, _>("status").ok(),
                    })
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items_json,
                    "total": total,
                    "shipped_count": shipped_count,
                }),
                "获取出库订单明细成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取出库订单明细失败: {}", e);
            Json(api_error(500, "获取出库订单明细失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/api/wms/outbound-orders/{id}/items",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn create_outbound_order_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<OutboundOrderItemRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let item_id = Uuid::new_v4();
    let now = Utc::now();
    let total_value = req.unit_price.map(|p| p * req.requested_quantity);

    let result = sqlx::query(
        only_own_schema_query!("wms", r#"
        INSERT INTO wms.outbound_order_items (id, organization_id, order_id, line_number,
                                              material_code, material_name, material_type,
                                              specification, batch_number, lot_number, serial_number,
                                              requested_quantity, unit, source_location_id, unit_price,
                                              total_value, notes, created_at, updated_at, tenant_id)
        VALUES ($1, '00000000-0000-0000-0000-000000000001', $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING id, line_number, material_code, material_name, specification, batch_number,
                  requested_quantity, reserved_quantity, picked_quantity, packed_quantity, shipped_quantity, unit,
                  source_location_id, source_location_code, destination_location_id, destination_location_code,
                  unit_price, total_value, picking_status, packing_status, notes as remarks,
                  created_at, updated_at
        "#),
    )
    .bind(item_id)
    .bind(id)
    .bind(req.line_number)
    .bind(&req.material_code)
    .bind(&req.material_name)
    .bind(&req.material_type)
    .bind(&req.specification)
    .bind(&req.batch_number)
    .bind(&req.lot_number)
    .bind(&req.serial_number)
    .bind(req.requested_quantity)
    .bind(&req.unit)
    .bind(req.source_location_id)
    .bind(req.unit_price)
    .bind(total_value)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .bind(claims.tenant_id.as_deref().and_then(|s| Uuid::parse_str(s).ok()).unwrap_or(Uuid::nil()))
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(item) => {
            let item_json = serde_json::json!({
                "id": item.try_get::<Uuid, _>("id").ok(),
                "line_number": item.try_get::<i32, _>("line_number").ok(),
                "material_code": item.try_get::<String, _>("material_code").ok(),
                "material_name": item.try_get::<String, _>("material_name").ok(),
                "requested_quantity": item.try_get::<f64, _>("requested_quantity").ok(),
                "unit": item.try_get::<String, _>("unit").ok(),
            });
            (
                Json(ApiResponse::success(
                    item_json.clone(),
                    "出库订单明细创建成功",
                )),
                "success",
                None,
                Some(item_json),
            )
        }
        Err(e) => {
            tracing::error!("创建出库订单明细失败: {}", e);
            (
                Json(api_error(500, "出库订单明细创建失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "outbound_order_item".to_string(),
        Some(item_id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/api/wms/outbound-orders/{id}/items/{item_id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn update_outbound_order_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ShipItemRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now();

    let result = sqlx::query(
        only_own_schema_query!("wms", r#"
        UPDATE wms.outbound_order_items SET
            shipped_quantity = $1, notes = $2, updated_at = $3
        WHERE order_id = $4 AND id = $5 AND deleted_at IS NULL
        RETURNING id, line_number, material_code, material_name, specification, batch_number,
                  requested_quantity, reserved_quantity, picked_quantity, packed_quantity, shipped_quantity, unit, 
                  source_location_id, source_location_code, destination_location_id, destination_location_code,
                  unit_price, total_value, picking_status, packing_status, notes as remarks,
                  created_at, updated_at
        "#),
    )
    .bind(req.shipped_quantity)
    .bind(&req.remarks)
    .bind(now)
    .bind(id)
    .bind(item_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(item) => {
            let item_json = serde_json::json!({
                "id": item.try_get::<Uuid, _>("id").ok(),
                "line_number": item.try_get::<i32, _>("line_number").ok(),
                "material_code": item.try_get::<String, _>("material_code").ok(),
                "material_name": item.try_get::<String, _>("material_name").ok(),
                "shipped_quantity": item.try_get::<f64, _>("shipped_quantity").ok(),
                "unit": item.try_get::<String, _>("unit").ok(),
            });
            (
                Json(ApiResponse::success(
                    item_json.clone(),
                    "出库订单明细更新成功",
                )),
                "success",
                None,
                Some(item_json),
            )
        }
        Err(e) => {
            tracing::error!("更新出库订单明细失败: {}", e);
            (
                Json(api_error(500, "出库订单明细更新失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "outbound_order_item".to_string(),
        Some(item_id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/api/wms/outbound-orders/{id}/items/{item_id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn delete_outbound_order_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(only_own_schema_query!("wms", r#"UPDATE wms.outbound_order_items SET deleted_at = NOW() WHERE order_id = $1 AND id = $2 AND deleted_at IS NULL"#))
        .bind(id)
        .bind(item_id)
        .execute(&mut **txn)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
            (
                Json(ApiResponse::success("".to_string(), "出库订单明细删除成功")),
                "success",
                None,
            )
        }
        Ok(_) => (
            Json(api_error(404, "出库订单明细不存在")),
            "error",
            Some("出库订单明细不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除出库订单明细失败: {}", e);
            (
                Json(api_error(500, "出库订单明细删除失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "outbound_order_item".to_string(),
        Some(item_id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/api/wms/outbound-orders/{id}/confirm",
    tag = "wms",
    responses(
        (status = 200, description = "确认成功", body = OutboundOrder, content_type = "application/json"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn confirm_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<OutboundOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.outbound_orders SET
            status = 'confirmed', updated_at = $2
        WHERE id = $1 AND status = 'created' AND deleted_at IS NULL
        RETURNING id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
                  customer_id, customer_name, order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, status, notes as remarks,
                  sales_order_id, sales_order_number, carrier, tracking_number,
                  picked_quantity, packed_quantity, shipped_quantity,
                  created_by, approved_by, approved_at,
                  created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "出库订单确认成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("确认出库订单失败: {}", e);
            (
                Json(api_error(500, "确认出库订单失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(order) = &result {
        serde_json::to_value(order).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "outbound_order".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/api/wms/outbound-orders/{id}/pick",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn pick_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<OutboundOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(
        only_own_schema_query!("wms", r#"
        UPDATE wms.outbound_orders SET
            status = 'picking', picking_status = 'in_progress', picking_start_time = $2, updated_at = $2
        WHERE id = $1 AND status = 'confirmed' AND deleted_at IS NULL
        RETURNING id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
                  customer_id, customer_name, order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, status, notes as remarks,
                  sales_order_id, sales_order_number, carrier, tracking_number,
                  picked_quantity, packed_quantity, shipped_quantity,
                  created_by, approved_by, approved_at,
                  created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "开始拣货")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("开始拣货失败: {}", e);
            (
                Json(api_error(500, "开始拣货失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(order) = &result {
        serde_json::to_value(order).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "outbound_order".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/api/wms/outbound-orders/{id}/pack",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn pack_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<OutboundOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.outbound_orders SET
            status = 'packing', picking_status = 'completed', picking_end_time = $2, 
            packing_status = 'in_progress', packing_start_time = $2, updated_at = $2
        WHERE id = $1 AND status = 'picking' AND deleted_at IS NULL
        RETURNING id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
                  customer_id, customer_name, order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, status, notes as remarks,
                  sales_order_id, sales_order_number, carrier, tracking_number,
                  picked_quantity, packed_quantity, shipped_quantity,
                  created_by, approved_by, approved_at,
                  created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "开始打包")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("开始打包失败: {}", e);
            (
                Json(api_error(500, "开始打包失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(order) = &result {
        serde_json::to_value(order).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "outbound_order".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/api/wms/outbound-orders/{id}/ship",
    tag = "wms",
    responses(
        (status = 200, description = "发货成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn ship_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(items): Json<Vec<ShipItemRequest>>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&items).ok();
    let now = Utc::now();

    let tx = state.db.begin().await.map_err(|e| {
        tracing::error!("开启事务失败: {}", e);
        Json(api_error(500, "开启事务失败"))
    });

    let mut tx = match tx {
        Ok(t) => t,
        Err(e) => return e,
    };

    for item in &items {
        let _ = sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            UPDATE wms.outbound_order_items SET
                shipped_quantity = $1, notes = $2, updated_at = $3
            WHERE order_id = $4 AND id = $5 AND deleted_at IS NULL
            "#
        ))
        .bind(item.shipped_quantity)
        .bind(&item.remarks)
        .bind(now)
        .bind(id)
        .bind(item.item_id)
        .execute(&mut *tx)
        .await;

        let _ = sqlx::query(
            only_own_schema_query!("wms", r#"
            UPDATE wms.inventory SET
                quantity = quantity - $1,
                available_quantity = available_quantity - $1,
                updated_at = $2
            WHERE organization_id = '00000000-0000-0000-0000-000000000001'
              AND material_code IN (SELECT material_code FROM wms.outbound_order_items WHERE id = $3)
            AND quantity >= $1
            "#),
        )
        .bind(item.shipped_quantity)
        .bind(now)
        .bind(item.item_id)
        .execute(&mut *tx)
        .await;

        // V19.8: 出库发货时同步写入 inventory_movements
        let seq: i64 = sqlx::query_scalar(only_own_schema_query!(
            "wms",
            r#"SELECT COUNT(*) FROM wms.inventory_movements
               WHERE movement_no LIKE $1"#
        ))
        .bind(format!("MV-{}%", now.format("%Y%m%d")))
        .fetch_one(&mut *tx)
        .await
        .unwrap_or(0);
        let movement_no = format!("MV-{}-{:06}", now.format("%Y%m%d"), seq + 1);
        let movement_id = Uuid::new_v4();
        let org_id = uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000001")
            .unwrap_or(uuid::Uuid::nil());

        let _ = sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            INSERT INTO wms.inventory_movements (
                id, movement_no, tenant_id, movement_type, reference_id, reference_type,
                material_id, material_code, material_name, quantity,
                from_location_id, to_location_id, from_warehouse_id, to_warehouse_id,
                status, performed_at, notes, created_at, updated_at
            )
            SELECT
                $1, $2, $3, 'outbound', $4, 'outbound_order',
                NULL, oo.material_code, oo.material_name, $5,
                oo.source_location_id, NULL, o.warehouse_id, NULL,
                'completed', $6, $7, $6, $6
            FROM wms.outbound_order_items oo
            JOIN wms.outbound_orders o ON oo.order_id = o.id
            WHERE oo.id = $8
            "#
        ))
        .bind(movement_id)
        .bind(&movement_no)
        .bind(org_id)
        .bind(id.to_string())
        .bind(item.shipped_quantity)
        .bind(now)
        .bind(format!("出库发货：订单 {}", id))
        .bind(item.item_id)
        .execute(&mut *tx)
        .await;
    }

    let _ = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.outbound_orders SET
            status = 'shipping', packing_status = 'completed', packing_end_time = $1,
            shipping_status = 'in_progress', actual_ship_date = $1, updated_at = $1
        WHERE id = $2 AND deleted_at IS NULL
        "#
    ))
    .bind(now)
    .bind(id)
    .execute(&mut *tx)
    .await;

    if tx.commit().await.is_err() {
        return Json(api_error(500, "出库操作失败"));
    }

    let order_result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
               customer_id, customer_name, order_date, 
               expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
               total_value as total_amount, status, notes as remarks,
               sales_order_id, sales_order_number, carrier, tracking_number,
               picked_quantity, packed_quantity, shipped_quantity,
               created_by, approved_by, approved_at,
               created_at, updated_at
        FROM wms.outbound_orders WHERE id = $1 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match order_result {
        Ok(order) => {
            // P3 事件驱动规范化：出库发货完成后发布 WmsInventoryItemShipped 事件，
            // 通知 SCM（销售履约）/Finance（成本结转）。
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let outbound_id = order.id;
                let outbound_no = order.order_number.clone();
                let warehouse_id = order.warehouse_id;
                let customer_id = order.customer_id;
                let shipped_at = order.actual_delivery;
                let total_qty = order.total_amount.unwrap_or(0.0);
                let reference_order_id = Some(order.id);
                let now_val = Utc::now();
                tokio::spawn(async move {
                    let payload = WmsInventoryItemShippedPayload {
                        outbound_id,
                        outbound_no,
                        warehouse_id,
                        warehouse_name: None,
                        material_id: None,
                        material_code: String::new(),
                        material_name: "汇总出库".to_string(),
                        quantity: total_qty,
                        unit: None,
                        reference_order_id,
                        reference_order_no: None,
                        customer_id,
                        customer_name: None,
                        shipped_by: None,
                        shipped_at: shipped_at.or(Some(now_val)),
                    };
                    if let Err(e) = publisher
                        .publish_event(EventType::WmsInventoryItemShipped, payload)
                        .await
                    {
                        tracing::warn!(
                            "[wms] WmsInventoryItemShipped 事件发布失败（graceful fallback）: {}",
                            e
                        );
                    } else {
                        tracing::info!(
                            "[wms] WmsInventoryItemShipped 事件发布成功 - outbound_id={}",
                            outbound_id
                        );
                    }
                });
            }

            let order_json = serde_json::to_value(order.clone()).ok();
            (
                Json(ApiResponse::success(
                    serde_json::json!({ "order": order, "message": "出库完成" }),
                    "出库成功",
                )),
                "success",
                None,
                order_json,
            )
        }
        Err(e) => {
            tracing::error!("获取出库订单失败: {}", e);
            (
                Json(api_error(500, "出库失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "outbound_order".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/api/wms/outbound-orders/{id}/complete",
    tag = "wms",
    responses(
        (status = 200, description = "完成成功", body = OutboundOrder, content_type = "application/json"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn complete_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<OutboundOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.outbound_orders SET
            status = 'completed', shipping_status = 'completed', delivery_date = $2, updated_at = $2
        WHERE id = $1 AND status = 'shipping' AND deleted_at IS NULL
        RETURNING id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
                  customer_id, customer_name, order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, status, notes as remarks,
                  sales_order_id, sales_order_number, carrier, tracking_number,
                  picked_quantity, packed_quantity, shipped_quantity,
                  created_by, approved_by, approved_at,
                  created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "出库订单完成")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("完成出库订单失败: {}", e);
            (
                Json(api_error(500, "完成出库订单失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(order) = &result {
        serde_json::to_value(order).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "outbound_order".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

#[derive(Debug, serde::Deserialize, ToSchema)]
pub struct ApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/api/wms/outbound-orders/{id}/approval/start",
    tag = "WMS - Outbound",
    request_body = ApprovalRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn start_outbound_approval(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundApprove).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let tenant_id = get_tenant_id_or_new(claims, headers);

    let current = sqlx::query(
        only_own_schema_query!("wms", "SELECT status FROM wms.outbound_orders WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"),
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if !crate::shared::fsm::outbound_order_requires_approval(&current_status, "shipping") {
                return Json(ApiResponse::error(400, "当前状态无需审批"));
            }
            let _ = crate::models::audit_log::log_approval_event(
                &mut **txn,
                &tenant_id.to_string(),
                "outbound_order",
                &id.to_string(),
                "start_approval",
                &req.operator,
                &current_status,
                &current_status,
                req.comment.as_deref(),
            )
            .await;
            Json(ApiResponse::success(
                serde_json::json!({"status": current_status, "approval_started": true}),
                "审批启动成功",
            ))
        }
        Err(e) => {
            tracing::error!("找不到出库单: {}", e);
            Json(ApiResponse::error(404, "出库单不存在"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/api/wms/outbound-orders/{id}/approval/approve",
    tag = "WMS - Outbound",
    request_body = ApprovalRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn approve_outbound(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundApprove).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let tenant_id = get_tenant_id_or_new(claims, headers);

    let current = sqlx::query(
        only_own_schema_query!("wms", "SELECT status FROM wms.outbound_orders WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"),
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if crate::shared::fsm::outbound_order_requires_approval(&current_status, "shipping")
                && crate::shared::fsm::outbound_order_can_transition(&current_status, "shipping")
                    .is_err()
            {
                return Json(ApiResponse::error(400, "当前状态不允许审批通过"));
            }
            let result = sqlx::query(
                only_own_schema_query!("wms", "UPDATE wms.outbound_orders SET status = 'shipping', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *"),
            )
            .bind(id)
            .bind(tenant_id)
            .fetch_one(&mut **txn)
            .await;
            match result {
                Ok(_) => {
                    let _ = crate::models::audit_log::log_approval_event(
                        &mut **txn,
                        &tenant_id.to_string(),
                        "outbound_order",
                        &id.to_string(),
                        "approve",
                        &req.operator,
                        &current_status,
                        "shipping",
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(
                        serde_json::json!({"id": id, "status": "shipping"}),
                        "审批通过",
                    ))
                }
                Err(e) => {
                    tracing::error!("审批出库单失败: {}", e);
                    Json(ApiResponse::error(500, "审批失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("找不到出库单: {}", e);
            Json(ApiResponse::error(404, "出库单不存在"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/api/wms/outbound-orders/{id}/approval/reject",
    tag = "WMS - Outbound",
    request_body = ApprovalRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn reject_outbound(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::OutboundApprove).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let tenant_id = get_tenant_id_or_new(claims, headers);

    let current = sqlx::query(
        only_own_schema_query!("wms", "SELECT status FROM wms.outbound_orders WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"),
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if crate::shared::fsm::outbound_order_can_transition(&current_status, "picking")
                .is_err()
            {
                return Json(ApiResponse::error(400, "当前状态不允许驳回回流"));
            }
            let result = sqlx::query(
                only_own_schema_query!("wms", "UPDATE wms.outbound_orders SET status = 'picking', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *"),
            )
            .bind(id)
            .bind(tenant_id)
            .fetch_one(&mut **txn)
            .await;
            match result {
                Ok(_) => {
                    let _ = crate::models::audit_log::log_approval_event(
                        &mut **txn,
                        &tenant_id.to_string(),
                        "outbound_order",
                        &id.to_string(),
                        "reject",
                        &req.operator,
                        &current_status,
                        "picking",
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(
                        serde_json::json!({"id": id, "status": "picking"}),
                        "审批驳回，回流至 picking",
                    ))
                }
                Err(e) => {
                    tracing::error!("驳回收料单失败: {}", e);
                    Json(ApiResponse::error(500, "驳回失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("找不到出库单: {}", e);
            Json(ApiResponse::error(404, "出库单不存在"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_outbound_order_item_request_serialization() {
        let item = OutboundOrderItemRequest {
            line_number: Some(1),
            material_code: "MAT001".to_string(),
            material_name: "测试物料".to_string(),
            material_type: Some("finished_goods".to_string()),
            specification: Some("规格A".to_string()),
            batch_number: Some("BATCH001".to_string()),
            lot_number: Some("LOT001".to_string()),
            serial_number: Some("SN001".to_string()),
            requested_quantity: 100.0,
            unit: "PCS".to_string(),
            source_location_id: None,
            unit_price: Some(15.5),
            remarks: Some("测试备注".to_string()),
        };
        let json = serde_json::to_value(&item).unwrap();
        assert_eq!(json["line_number"], 1);
        assert_eq!(json["material_code"], "MAT001");
        assert_eq!(json["material_name"], "测试物料");
        assert_eq!(json["material_type"], "finished_goods");
        assert_eq!(json["requested_quantity"], 100.0);
        assert_eq!(json["unit"], "PCS");
        assert_eq!(json["unit_price"], 15.5);
    }

    #[test]
    fn test_outbound_order_item_request_minimal() {
        let item = OutboundOrderItemRequest {
            line_number: None,
            material_code: "MAT002".to_string(),
            material_name: "简单物料".to_string(),
            material_type: None,
            specification: None,
            batch_number: None,
            lot_number: None,
            serial_number: None,
            requested_quantity: 50.0,
            unit: "KG".to_string(),
            source_location_id: None,
            unit_price: None,
            remarks: None,
        };
        let json = serde_json::to_value(&item).unwrap();
        assert_eq!(json["material_code"], "MAT002");
        assert_eq!(json["requested_quantity"], 50.0);
        assert_eq!(json["unit"], "KG");
        assert!(json["line_number"].is_null());
        assert!(json["material_type"].is_null());
        assert!(json["unit_price"].is_null());
    }

    #[test]
    fn test_outbound_order_item_request_deserialize() {
        let json = r#"{
            "line_number": 2,
            "material_code": "MAT003",
            "material_name": "反序列化物料",
            "material_type": "raw_material",
            "requested_quantity": 200.0,
            "unit": "BOX",
            "unit_price": 25.0
        }"#;
        let item: OutboundOrderItemRequest = serde_json::from_str(json).unwrap();
        assert_eq!(item.line_number, Some(2));
        assert_eq!(item.material_code, "MAT003");
        assert_eq!(item.material_name, "反序列化物料");
        assert_eq!(item.material_type.as_deref(), Some("raw_material"));
        assert_eq!(item.requested_quantity, 200.0);
        assert_eq!(item.unit, "BOX");
        assert_eq!(item.unit_price, Some(25.0));
        assert!(item.batch_number.is_none());
        assert!(item.remarks.is_none());
    }

    #[test]
    fn test_ship_item_request_serialization() {
        let request = ShipItemRequest {
            item_id: Uuid::nil(),
            shipped_quantity: 95.0,
            remarks: Some("已发货".to_string()),
        };
        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["shipped_quantity"], 95.0);
        assert_eq!(json["remarks"], "已发货");
    }

    #[test]
    fn test_ship_item_request_minimal() {
        let request = ShipItemRequest {
            item_id: Uuid::nil(),
            shipped_quantity: 100.0,
            remarks: None,
        };
        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["shipped_quantity"], 100.0);
        assert!(json["remarks"].is_null());
    }

    #[test]
    fn test_ship_item_request_deserialize() {
        let json = r#"{
            "item_id": "00000000-0000-0000-0000-000000000000",
            "shipped_quantity": 80.0,
            "remarks": "部分发货"
        }"#;
        let request: ShipItemRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.shipped_quantity, 80.0);
        assert_eq!(request.remarks.as_deref(), Some("部分发货"));
    }

    #[test]
    fn test_approval_request_deserialize() {
        let json = r#"{
            "operator": "admin",
            "comment": "同意出库"
        }"#;
        let request: ApprovalRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.operator, "admin");
        assert_eq!(request.comment.as_deref(), Some("同意出库"));
    }

    #[test]
    fn test_approval_request_no_comment() {
        let json = r#"{
            "operator": "manager"
        }"#;
        let request: ApprovalRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.operator, "manager");
        assert!(request.comment.is_none());
    }

    #[test]
    fn test_approval_request_with_reject_comment() {
        let json = r#"{
            "operator": "auditor",
            "comment": "库存不足，驳回"
        }"#;
        let request: ApprovalRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.operator, "auditor");
        assert_eq!(request.comment.as_deref(), Some("库存不足，驳回"));
    }
}
