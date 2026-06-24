use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::api::audit::log_audit_event;
use crate::api::ApiState;
use crate::models::{CreateOutboundOrderRequest, OutboundOrder, UpdateOutboundOrderRequest};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginationParams};

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
            "/api/wms/outbound-orders",
            get(list_outbound_orders).post(create_outbound_order),
        )
        .route(
            "/api/v1/outbound-orders/{id}",
            get(get_outbound_order)
                .put(update_outbound_order)
                .delete(delete_outbound_order),
        )
        .route("/api/v1/outbound-orders/{id}/items", get(list_outbound_order_items).post(create_outbound_order_item))
        .route("/api/v1/outbound-orders/{id}/items/{item_id}", put(update_outbound_order_item).delete(delete_outbound_order_item))
        .route("/api/v1/outbound-orders/{id}/confirm", post(confirm_outbound_order))
        .route("/api/v1/outbound-orders/{id}/pick", post(pick_outbound_order))
        .route("/api/v1/outbound-orders/{id}/pack", post(pack_outbound_order))
        .route("/api/v1/outbound-orders/{id}/ship", post(ship_outbound_order))
        .route("/api/v1/outbound-orders/{id}/complete", post(complete_outbound_order))
}

async fn list_outbound_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::OutboundRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, OutboundOrder>(
        r#"
        SELECT id, order_number, warehouse_id, customer_id, order_date, 
               expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
               total_value as total_amount, status, notes as remarks, created_at, updated_at
        FROM wms.outbound_orders
        WHERE ($1::text IS NULL OR order_number ILIKE $1)
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
                SELECT COUNT(*) FROM wms.outbound_orders
                WHERE ($1::text IS NULL OR order_number ILIKE $1)
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

async fn create_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateOutboundOrderRequest>,
) -> Json<ApiResponse<OutboundOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(
        r#"
        INSERT INTO wms.outbound_orders (id, organization_id, order_number, order_type, warehouse_id, 
                                        customer_id, order_date, expected_ship_date, total_value, 
                                        status, notes, created_at, updated_at)
        VALUES ($1, '00000000-0000-0000-0000-000000000001', $2, 'sales', $3, $4, $5, $6, $7, 
               'created', $8, $9, $10)
        RETURNING id, order_number, warehouse_id, customer_id, order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, status, notes as remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.order_number)
    .bind(&req.warehouse_id)
    .bind(&req.customer_id)
    .bind(req.order_date)
    .bind(&req.expected_delivery)
    .bind(req.total_amount)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
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

async fn get_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<OutboundOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::OutboundRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, OutboundOrder>(
        r#"
        SELECT id, order_number, warehouse_id, customer_id, order_date, 
               expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
               total_value as total_amount, status, notes as remarks, created_at, updated_at
        FROM wms.outbound_orders WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
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

async fn update_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateOutboundOrderRequest>,
) -> Json<ApiResponse<OutboundOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();

    let existing = sqlx::query_as::<_, OutboundOrder>(
        r#"
        SELECT id, order_number, warehouse_id, customer_id, order_date, 
               expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
               total_value as total_amount, status, notes as remarks, created_at, updated_at 
        FROM wms.outbound_orders WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
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

    let result = sqlx::query_as::<_, OutboundOrder>(
        r#"
        UPDATE wms.outbound_orders SET
            warehouse_id = $2, customer_id = $3, expected_ship_date = $4, actual_ship_date = $5, 
            total_value = $6, status = $7, notes = $8, updated_at = $9
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, order_number, warehouse_id, customer_id, order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, status, notes as remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&warehouse_id)
    .bind(&customer_id)
    .bind(&expected_delivery)
    .bind(&actual_delivery)
    .bind(total_amount)
    .bind(&status)
    .bind(&remarks)
    .bind(now)
    .fetch_one(&state.db)
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

async fn delete_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query(r#"UPDATE wms.outbound_orders SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL"#)
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "出库订单删除成功")),
            "success",
            None,
        ),
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

async fn list_outbound_order_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::OutboundRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"
        SELECT id, line_number, material_code, material_name, specification, batch_number,
               requested_quantity, reserved_quantity, picked_quantity, packed_quantity, shipped_quantity, unit, 
               source_location_id, source_location_code, destination_location_id, destination_location_code,
               unit_price, total_value, picking_status, packing_status, notes as remarks,
               created_at, updated_at
        FROM wms.outbound_order_items
        WHERE order_id = $1 AND deleted_at IS NULL
        ORDER BY line_number ASC
        "#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let total: i64 = items.len() as i64;
            let shipped_count: i64 = items.iter()
                .filter(|r| (*r).try_get::<f64, _>("shipped_quantity").unwrap_or(0.0) > 0.0)
                .count() as i64;

            let items_json: Vec<serde_json::Value> = items.iter().map(|row| {
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
            }).collect();

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

async fn create_outbound_order_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<OutboundOrderItemRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let item_id = Uuid::new_v4();
    let now = Utc::now();
    let total_value = req.unit_price.map(|p| p * req.requested_quantity);

    let result = sqlx::query(
        r#"
        INSERT INTO wms.outbound_order_items (id, organization_id, order_id, line_number, 
                                              material_code, material_name, material_type, 
                                              specification, batch_number, lot_number, serial_number,
                                              requested_quantity, unit, source_location_id, unit_price, 
                                              total_value, notes, created_at, updated_at)
        VALUES ($1, '00000000-0000-0000-0000-000000000001', $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id, line_number, material_code, material_name, specification, batch_number,
                  requested_quantity, reserved_quantity, picked_quantity, packed_quantity, shipped_quantity, unit, 
                  source_location_id, source_location_code, destination_location_id, destination_location_code,
                  unit_price, total_value, picking_status, packing_status, notes as remarks,
                  created_at, updated_at
        "#,
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
    .bind(&req.source_location_id)
    .bind(req.unit_price)
    .bind(total_value)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
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
                Json(ApiResponse::success(item_json.clone(), "出库订单明细创建成功")),
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

async fn update_outbound_order_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
    Json(req): Json<ShipItemRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        UPDATE wms.outbound_order_items SET
            shipped_quantity = $1, notes = $2, updated_at = $3
        WHERE order_id = $4 AND id = $5 AND deleted_at IS NULL
        RETURNING id, line_number, material_code, material_name, specification, batch_number,
                  requested_quantity, reserved_quantity, picked_quantity, packed_quantity, shipped_quantity, unit, 
                  source_location_id, source_location_code, destination_location_id, destination_location_code,
                  unit_price, total_value, picking_status, packing_status, notes as remarks,
                  created_at, updated_at
        "#,
    )
    .bind(req.shipped_quantity)
    .bind(&req.remarks)
    .bind(now)
    .bind(id)
    .bind(item_id)
    .fetch_one(&state.db)
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
                Json(ApiResponse::success(item_json.clone(), "出库订单明细更新成功")),
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

async fn delete_outbound_order_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query(r#"UPDATE wms.outbound_order_items SET deleted_at = NOW() WHERE order_id = $1 AND id = $2 AND deleted_at IS NULL"#)
        .bind(id)
        .bind(item_id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "出库订单明细删除成功")),
            "success",
            None,
        ),
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

async fn confirm_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<OutboundOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(
        r#"
        UPDATE wms.outbound_orders SET
            status = 'confirmed', updated_at = $2
        WHERE id = $1 AND status = 'created' AND deleted_at IS NULL
        RETURNING id, order_number, warehouse_id, customer_id, order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, status, notes as remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_one(&state.db)
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

async fn pick_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<OutboundOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(
        r#"
        UPDATE wms.outbound_orders SET
            status = 'picking', picking_status = 'in_progress', picking_start_time = $2, updated_at = $2
        WHERE id = $1 AND status = 'confirmed' AND deleted_at IS NULL
        RETURNING id, order_number, warehouse_id, customer_id, order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, status, notes as remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_one(&state.db)
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

async fn pack_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<OutboundOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(
        r#"
        UPDATE wms.outbound_orders SET
            status = 'packing', picking_status = 'completed', picking_end_time = $2, 
            packing_status = 'in_progress', packing_start_time = $2, updated_at = $2
        WHERE id = $1 AND status = 'picking' AND deleted_at IS NULL
        RETURNING id, order_number, warehouse_id, customer_id, order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, status, notes as remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_one(&state.db)
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

async fn ship_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(items): Json<Vec<ShipItemRequest>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {},
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
        let _ = sqlx::query(
            r#"
            UPDATE wms.outbound_order_items SET
                shipped_quantity = $1, notes = $2, updated_at = $3
            WHERE order_id = $4 AND id = $5 AND deleted_at IS NULL
            "#,
        )
        .bind(item.shipped_quantity)
        .bind(&item.remarks)
        .bind(now)
        .bind(id)
        .bind(item.item_id)
        .execute(&mut *tx)
        .await;

        let _ = sqlx::query(
            r#"
            UPDATE wms.inventory SET
                quantity = quantity - $1,
                available_quantity = available_quantity - $1,
                updated_at = $2
            WHERE organization_id = '00000000-0000-0000-0000-000000000001'
              AND material_code IN (SELECT material_code FROM wms.outbound_order_items WHERE id = $3)
            AND quantity >= $1
            "#,
        )
        .bind(item.shipped_quantity)
        .bind(now)
        .bind(item.item_id)
        .execute(&mut *tx)
        .await;
    }

    let _ = sqlx::query(
        r#"
        UPDATE wms.outbound_orders SET
            status = 'shipping', packing_status = 'completed', packing_end_time = $1,
            shipping_status = 'in_progress', actual_ship_date = $1, updated_at = $1
        WHERE id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(now)
    .bind(id)
    .execute(&mut *tx)
    .await;

    if tx.commit().await.is_err() {
        return Json(api_error(500, "出库操作失败"));
    }

    let order_result = sqlx::query_as::<_, OutboundOrder>(
        r#"
        SELECT id, order_number, warehouse_id, customer_id, order_date, 
               expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
               total_value as total_amount, status, notes as remarks, created_at, updated_at
        FROM wms.outbound_orders WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match order_result {
        Ok(order) => {
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

async fn complete_outbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<OutboundOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(
        r#"
        UPDATE wms.outbound_orders SET
            status = 'completed', shipping_status = 'completed', delivery_date = $2, updated_at = $2
        WHERE id = $1 AND status = 'shipping' AND deleted_at IS NULL
        RETURNING id, order_number, warehouse_id, customer_id, order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, status, notes as remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_one(&state.db)
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