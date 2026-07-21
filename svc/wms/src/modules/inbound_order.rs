use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::models::{CreateInboundOrderRequest, InboundOrder, UpdateInboundOrderRequest};
use crate::modules::audit::log_audit_event;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginationParams};

#[derive(Debug, Deserialize, Serialize)]
pub struct InboundOrderItemRequest {
    pub line_number: Option<i32>,
    pub material_code: String,
    pub material_name: String,
    pub material_type: Option<String>,
    pub specification: Option<String>,
    pub batch_number: Option<String>,
    pub lot_number: Option<String>,
    pub serial_number: Option<String>,
    pub expected_quantity: f64,
    pub unit: String,
    pub location_id: Option<Uuid>,
    pub unit_price: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ReceiveItemRequest {
    pub item_id: Uuid,
    pub received_quantity: f64,
    pub quality_status: String,
    pub remarks: Option<String>,
}

fn pg_row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "line_number": row.try_get::<i32, _>("line_number").ok(),
        "material_code": row.try_get::<String, _>("material_code").ok(),
        "material_name": row.try_get::<String, _>("material_name").ok(),
        "specification": row.try_get::<Option<String>, _>("specification").ok(),
        "batch_number": row.try_get::<Option<String>, _>("batch_number").ok(),
        "expected_quantity": row.try_get::<f64, _>("expected_quantity").ok(),
        "received_quantity": row.try_get::<f64, _>("received_quantity").ok(),
        "rejected_quantity": row.try_get::<f64, _>("rejected_quantity").ok(),
        "unit": row.try_get::<Option<String>, _>("unit").ok(),
        "location_id": row.try_get::<Option<Uuid>, _>("location_id").ok(),
        "location_code": row.try_get::<Option<String>, _>("location_code").ok(),
        "quality_status": row.try_get::<Option<String>, _>("quality_status").ok(),
        "unit_price": row.try_get::<Option<f64>, _>("unit_price").ok(),
        "total_value": row.try_get::<Option<f64>, _>("total_value").ok(),
        "remarks": row.try_get::<Option<String>, _>("remarks").ok(),
        "created_at": row.try_get::<chrono::NaiveDateTime, _>("created_at").ok().map(|t| t.to_string()),
        "updated_at": row.try_get::<chrono::NaiveDateTime, _>("updated_at").ok().map(|t| t.to_string()),
    })
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route(
            "/inbound-orders",
            get(list_inbound_orders).post(create_inbound_order),
        )
        .route(
            "/inbound-orders/{id}",
            get(get_inbound_order)
                .put(update_inbound_order)
                .delete(delete_inbound_order),
        )
        .route(
            "/inbound-orders/{id}/items",
            get(list_inbound_order_items).post(create_inbound_order_item),
        )
        .route(
            "/inbound-orders/{id}/items/{item_id}",
            put(update_inbound_order_item).delete(delete_inbound_order_item),
        )
        .route("/inbound-orders/{id}/confirm", post(confirm_inbound_order))
        .route("/inbound-orders/{id}/receive", post(receive_inbound_order))
        .route(
            "/inbound-orders/{id}/complete",
            post(complete_inbound_order),
        )
}

pub async fn list_inbound_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InboundRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, InboundOrder>(
        r#"
        SELECT id, order_number, warehouse_id, supplier_id, order_date, 
               expected_arrival_date as expected_arrival, actual_arrival_date as actual_arrival, 
               total_value as total_amount, status, notes as remarks, created_at, updated_at
        FROM wms.inbound_orders
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
                SELECT COUNT(*) FROM wms.inbound_orders
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
                "获取入库订单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取入库订单列表失败: {}", e);
            Json(api_error(500, "获取入库订单列表失败"))
        }
    }
}

pub async fn create_inbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateInboundOrderRequest>,
) -> Json<ApiResponse<InboundOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, InboundOrder>(
        r#"
        INSERT INTO wms.inbound_orders (id, organization_id, order_number, order_type, warehouse_id, 
                                       supplier_id, order_date, expected_arrival_date, total_value, 
                                       status, notes, created_at, updated_at)
        VALUES ($1, '00000000-0000-0000-0000-000000000001', $2, 'purchase', $3, $4, $5, $6, $7, 
               'created', $8, $9, $10)
        RETURNING id, order_number, warehouse_id, supplier_id, order_date, 
                  expected_arrival_date as expected_arrival, actual_arrival_date as actual_arrival, 
                  total_value as total_amount, status, notes as remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.order_number)
    .bind(&req.warehouse_id)
    .bind(&req.supplier_id)
    .bind(req.order_date)
    .bind(&req.expected_arrival)
    .bind(req.total_amount)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "入库订单创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建入库订单失败: {}", e);
            (
                Json(api_error(500, "入库订单创建失败")),
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
        "inbound_order".to_string(),
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

pub async fn get_inbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<InboundOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::InboundRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, InboundOrder>(
        r#"
        SELECT id, order_number, warehouse_id, supplier_id, order_date, 
               expected_arrival_date as expected_arrival, actual_arrival_date as actual_arrival, 
               total_value as total_amount, status, notes as remarks, created_at, updated_at
        FROM wms.inbound_orders WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(order)) => Json(ApiResponse::success(order, "获取入库订单成功")),
        Ok(None) => Json(api_error(404, "入库订单不存在")),
        Err(e) => {
            tracing::error!("获取入库订单失败: {}", e);
            Json(api_error(500, "获取入库订单失败"))
        }
    }
}

pub async fn update_inbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateInboundOrderRequest>,
) -> Json<ApiResponse<InboundOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();

    let existing = sqlx::query_as::<_, InboundOrder>(
        r#"
        SELECT id, order_number, warehouse_id, supplier_id, order_date, 
               expected_arrival_date as expected_arrival, actual_arrival_date as actual_arrival, 
               total_value as total_amount, status, notes as remarks, created_at, updated_at 
        FROM wms.inbound_orders WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => return Json(api_error(404, "入库订单不存在")),
        Err(e) => return Json(api_error(500, &format!("查询入库订单失败: {}", e))),
    };

    let warehouse_id = req.warehouse_id.or(existing.warehouse_id);
    let supplier_id = req.supplier_id.or(existing.supplier_id);
    let expected_arrival = req.expected_arrival.or(existing.expected_arrival);
    let actual_arrival = req.actual_arrival.or(existing.actual_arrival);
    let total_amount = req.total_amount.or(existing.total_amount);
    let status = req.status.unwrap_or(existing.status);
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let result = sqlx::query_as::<_, InboundOrder>(
        r#"
        UPDATE wms.inbound_orders SET
            warehouse_id = $2, supplier_id = $3, expected_arrival_date = $4, actual_arrival_date = $5, 
            total_value = $6, status = $7, notes = $8, updated_at = $9
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, order_number, warehouse_id, supplier_id, order_date, 
                  expected_arrival_date as expected_arrival, actual_arrival_date as actual_arrival, 
                  total_value as total_amount, status, notes as remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&warehouse_id)
    .bind(&supplier_id)
    .bind(&expected_arrival)
    .bind(&actual_arrival)
    .bind(total_amount)
    .bind(&status)
    .bind(&remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "入库订单更新成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新入库订单失败: {}", e);
            (
                Json(api_error(500, "入库订单更新失败")),
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
        "inbound_order".to_string(),
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

pub async fn delete_inbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"UPDATE wms.inbound_orders SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL"#,
    )
    .bind(id)
    .execute(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "入库订单删除成功")),
            "success",
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "入库订单不存在")),
            "error",
            Some("入库订单不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除入库订单失败: {}", e);
            (
                Json(api_error(500, "入库订单删除失败")),
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
        "inbound_order".to_string(),
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

pub async fn list_inbound_order_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InboundRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"
        SELECT id, line_number, material_code, material_name, specification, batch_number,
               expected_quantity, received_quantity, rejected_quantity, unit, 
               location_id, location_code, quality_status, unit_price, total_value, notes as remarks,
               created_at, updated_at
        FROM wms.inbound_order_items
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
            let received_count: i64 = items
                .iter()
                .filter(|r| r.try_get::<f64, _>("received_quantity").unwrap_or(0.0) > 0.0)
                .count() as i64;

            let items_json: Vec<serde_json::Value> = items.iter().map(pg_row_to_json).collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items_json,
                    "total": total,
                    "received_count": received_count,
                }),
                "获取入库订单明细成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取入库订单明细失败: {}", e);
            Json(api_error(500, "获取入库订单明细失败"))
        }
    }
}

pub async fn create_inbound_order_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<InboundOrderItemRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let item_id = Uuid::new_v4();
    let now = Utc::now();
    let total_value = req.unit_price.map(|p| p * req.expected_quantity);

    let result = sqlx::query(
        r#"
        INSERT INTO wms.inbound_order_items (id, organization_id, order_id, line_number, 
                                             material_code, material_name, material_type, 
                                             specification, batch_number, lot_number, serial_number,
                                             expected_quantity, unit, location_id, unit_price, 
                                             total_value, notes, created_at, updated_at)
        VALUES ($1, '00000000-0000-0000-0000-000000000001', $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING id, line_number, material_code, material_name, specification, batch_number,
                  expected_quantity, received_quantity, rejected_quantity, unit, 
                  location_id, quality_status, unit_price, total_value, notes as remarks,
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
    .bind(req.expected_quantity)
    .bind(&req.unit)
    .bind(&req.location_id)
    .bind(req.unit_price)
    .bind(total_value)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(item) => {
            let item_json = pg_row_to_json(item);
            (
                Json(ApiResponse::success(
                    item_json.clone(),
                    "入库订单明细创建成功",
                )),
                "success",
                None,
                Some(item_json),
            )
        }
        Err(e) => {
            tracing::error!("创建入库订单明细失败: {}", e);
            (
                Json(api_error(500, "入库订单明细创建失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "inbound_order_item".to_string(),
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

pub async fn update_inbound_order_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
    Json(req): Json<ReceiveItemRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        UPDATE wms.inbound_order_items SET
            received_quantity = $1, quality_status = $2, notes = $3, updated_at = $4
        WHERE order_id = $5 AND id = $6 AND deleted_at IS NULL
        RETURNING id, line_number, material_code, material_name, specification, batch_number,
                  expected_quantity, received_quantity, rejected_quantity, unit, 
                  location_id, quality_status, unit_price, total_value, notes as remarks,
                  created_at, updated_at
        "#,
    )
    .bind(req.received_quantity)
    .bind(&req.quality_status)
    .bind(&req.remarks)
    .bind(now)
    .bind(id)
    .bind(item_id)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(item) => {
            let item_json = pg_row_to_json(item);
            (
                Json(ApiResponse::success(
                    item_json.clone(),
                    "入库订单明细更新成功",
                )),
                "success",
                None,
                Some(item_json),
            )
        }
        Err(e) => {
            tracing::error!("更新入库订单明细失败: {}", e);
            (
                Json(api_error(500, "入库订单明细更新失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "inbound_order_item".to_string(),
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

pub async fn delete_inbound_order_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(r#"UPDATE wms.inbound_order_items SET deleted_at = NOW() WHERE order_id = $1 AND id = $2 AND deleted_at IS NULL"#)
        .bind(id)
        .bind(item_id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "入库订单明细删除成功")),
            "success",
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "入库订单明细不存在")),
            "error",
            Some("入库订单明细不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除入库订单明细失败: {}", e);
            (
                Json(api_error(500, "入库订单明细删除失败")),
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
        "inbound_order_item".to_string(),
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

pub async fn confirm_inbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<InboundOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let now = Utc::now();

    let result = sqlx::query_as::<_, InboundOrder>(
        r#"
        UPDATE wms.inbound_orders SET
            status = 'confirmed', updated_at = $2
        WHERE id = $1 AND status = 'created' AND deleted_at IS NULL
        RETURNING id, order_number, warehouse_id, supplier_id, order_date, 
                  expected_arrival_date as expected_arrival, actual_arrival_date as actual_arrival, 
                  total_value as total_amount, status, notes as remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "入库订单确认成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("确认入库订单失败: {}", e);
            (
                Json(api_error(500, "确认入库订单失败")),
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
        "inbound_order".to_string(),
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

pub async fn receive_inbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(items): Json<Vec<ReceiveItemRequest>>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
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
        let _ = sqlx::query(
            r#"
            UPDATE wms.inbound_order_items SET
                received_quantity = $1, quality_status = $2, notes = $3, updated_at = $4
            WHERE order_id = $5 AND id = $6 AND deleted_at IS NULL
            "#,
        )
        .bind(item.received_quantity)
        .bind(&item.quality_status)
        .bind(&item.remarks)
        .bind(now)
        .bind(id)
        .bind(item.item_id)
        .execute(&mut *tx)
        .await;

        if item.quality_status == "qualified" {
            let _ = sqlx::query(
                r#"
                INSERT INTO wms.inventory (organization_id, warehouse_id, location_id, 
                                          material_code, material_name, specification, 
                                          batch_number, quantity, unit, available_quantity,
                                          quality_status, created_at, updated_at)
                SELECT '00000000-0000-0000-0000-000000000001', i.warehouse_id, io.location_id,
                       io.material_code, io.material_name, io.specification,
                       io.batch_number, $1, io.unit, $1, 'qualified', NOW(), NOW()
                FROM wms.inbound_order_items io
                JOIN wms.inbound_orders i ON io.order_id = i.id
                WHERE io.id = $2
                ON CONFLICT (organization_id, material_code, batch_number) DO UPDATE SET
                    quantity = wms.inventory.quantity + $1,
                    available_quantity = wms.inventory.available_quantity + $1,
                    updated_at = NOW()
                "#,
            )
            .bind(item.received_quantity)
            .bind(item.item_id)
            .execute(&mut *tx)
            .await;
        }
    }

    let _ = sqlx::query(
        r#"
        UPDATE wms.inbound_orders SET
            status = 'received', actual_arrival_date = $1, updated_at = $1
        WHERE id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(now)
    .bind(id)
    .execute(&mut *tx)
    .await;

    if tx.commit().await.is_err() {
        return Json(api_error(500, "入库操作失败"));
    }

    let order_result = sqlx::query_as::<_, InboundOrder>(
        r#"
        SELECT id, order_number, warehouse_id, supplier_id, order_date, 
               expected_arrival_date as expected_arrival, actual_arrival_date as actual_arrival, 
               total_value as total_amount, status, notes as remarks, created_at, updated_at
        FROM wms.inbound_orders WHERE id = $1 AND deleted_at IS NULL
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
                    serde_json::json!({ "order": order, "message": "入库完成" }),
                    "入库成功",
                )),
                "success",
                None,
                order_json,
            )
        }
        Err(e) => {
            tracing::error!("获取入库订单失败: {}", e);
            (
                Json(api_error(500, "入库失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "inbound_order".to_string(),
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

pub async fn complete_inbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<InboundOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let now = Utc::now();

    let result = sqlx::query_as::<_, InboundOrder>(
        r#"
        UPDATE wms.inbound_orders SET
            status = 'completed', updated_at = $2
        WHERE id = $1 AND status = 'received' AND deleted_at IS NULL
        RETURNING id, order_number, warehouse_id, supplier_id, order_date, 
                  expected_arrival_date as expected_arrival, actual_arrival_date as actual_arrival, 
                  total_value as total_amount, status, notes as remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "入库订单完成")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("完成入库订单失败: {}", e);
            (
                Json(api_error(500, "完成入库订单失败")),
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
        "inbound_order".to_string(),
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
