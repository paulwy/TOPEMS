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

use crate::models::inbound_order::*;
use crate::modules::audit::log_audit_event;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{ApiResponse, PaginationParams};
use topems_shared_core::TopemsError;
use topems_shared_db::tenant::get_tenant_id_or_new;
use topems_shared_event::event::{
    commit_retry, EventType, StockInboundPayload, WmsInventoryItemReceivedPayload,
};

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
    pub unit_price: Option<rust_decimal::Decimal>,
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
        "unit_price": row.try_get::<Option<rust_decimal::Decimal>, _>("unit_price").ok(),
        "total_value": row.try_get::<Option<rust_decimal::Decimal>, _>("total_value").ok(),
        "remarks": row.try_get::<Option<String>, _>("remarks").ok(),
        "created_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
        "updated_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("updated_at").ok(),
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
        .route(
            "/inbound-orders/{id}/approval/start",
            post(start_inbound_approval),
        )
        .route(
            "/inbound-orders/{id}/approval/approve",
            post(approve_inbound),
        )
        .route("/inbound-orders/{id}/approval/reject", post(reject_inbound))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inbound:read"])),
    path = "/api/wms/inbound-orders",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn list_inbound_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InboundRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    // 显式租户过滤：超管→None（全部），普通用户→claims.tenant_id，RLS 之外双保险
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    let result = sqlx::query_as::<_, InboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, organization_id AS tenant_id, order_number, order_type,
               reference_number, reference_type, warehouse_id, warehouse_name,
               supplier_id, supplier_name, supplier_code,
               purchase_order_id, purchase_order_number,
               production_order_id, production_order_number,
               customer_id, customer_name, customer_order_number,
               order_date,
               expected_arrival_date, actual_arrival_date, received_date,
               expected_arrival_date AS expected_arrival, expected_arrival_date AS expected_date, actual_arrival_date AS actual_arrival,
               carrier, carrier_code, vehicle_number, driver_name, driver_phone,
               total_items, total_quantity, received_quantity, rejected_quantity,
               total_weight, total_volume, total_value, total_value AS total_amount,
               priority, status, receiver, receiver_id, receiving_team,
               inspection_required, inspection_status, inspection_result, inspector, inspection_date,
               notes, notes AS remarks, quality_check_notes, receiving_notes, special_instructions,
               created_by, updated_by, approved_by, approved_at, organization_id,
               created_at, updated_at
        FROM wms.inbound_orders
        WHERE ($1::text IS NULL OR order_number ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($5::uuid IS NULL OR tenant_id = $5::uuid OR tenant_id IS NULL)
          AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .bind(tenant_filter)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(orders) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                SELECT COUNT(*) FROM wms.inbound_orders
                WHERE ($1::text IS NULL OR order_number ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR tenant_id = $3::uuid)
                  AND deleted_at IS NULL
                "#
            ))
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(tenant_filter)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "orders": orders,
                    "items": orders,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取入库订单列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取入库订单列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取入库订单列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:inbound:write"])),
    path = "/api/wms/inbound-orders",
    tag = "wms",
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn create_inbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateInboundOrderRequest>,
) -> ApiResponse<InboundOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    // 租户绑定对齐新惯例：超管→SQL NULL（公共行），普通用户→claims.tenant_id。
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    let result = sqlx::query_as::<_, InboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        INSERT INTO wms.inbound_orders (id, organization_id, order_number, order_type, warehouse_id,
                                       supplier_id, order_date, expected_arrival_date, total_value,
                                       status, notes, created_at, updated_at, tenant_id)
        VALUES ($1, $12, $2, 'purchase', $3, $4, $5, $6, $7,
               'created', $8, $9, $10, $11)
        RETURNING id, organization_id AS tenant_id, order_number, order_type,
                  reference_number, reference_type, warehouse_id, warehouse_name,
                  supplier_id, supplier_name, supplier_code,
                  purchase_order_id, purchase_order_number,
                  production_order_id, production_order_number,
                  customer_id, customer_name, customer_order_number,
                  order_date,
                  expected_arrival_date, actual_arrival_date, received_date,
                  expected_arrival_date AS expected_arrival, expected_arrival_date AS expected_date, actual_arrival_date AS actual_arrival,
                  carrier, carrier_code, vehicle_number, driver_name, driver_phone,
                  total_items, total_quantity, received_quantity, rejected_quantity,
                  total_weight, total_volume, total_value, total_value AS total_amount,
                  priority, status, receiver, receiver_id, receiving_team,
                  inspection_required, inspection_status, inspection_result, inspector, inspection_date,
                  notes, notes AS remarks, quality_check_notes, receiving_notes, special_instructions,
                  created_by, updated_by, approved_by, approved_at, organization_id,
                  created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(&req.order_number)
    .bind(req.warehouse_id)
    .bind(req.supplier_id)
    .bind(req.order_date.unwrap_or_else(Utc::now))
    .bind(req.expected_arrival)
    .bind(req.total_amount)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .bind(tenant_id.clone())
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(order) => {
            let tenant_id: Option<Uuid> = sqlx::query_scalar(
                "SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid",
            )
            .fetch_optional(&mut **txn)
            .await
            .ok()
            .flatten();
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("入库订单事务提交失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal(
                        "入库订单创建失败".to_string(),
                    ));
                }
            }
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let oid = order.id;
                let ono = order.order_number.clone();
                let wh_id = order.warehouse_id;
                let total = order.total_amount.unwrap_or(0.0);
                let now_val = Utc::now();
                tokio::spawn(async move {
                    let payload = StockInboundPayload {
                        inbound_id: oid,
                        inbound_no: ono,
                        warehouse_id: wh_id,
                        warehouse_name: None,
                        material_id: None,
                        material_name: None,
                        quantity: total,
                        reference_order_id: None,
                        received_by: None,
                        received_at: Some(now_val),
                        tenant_id,
                    };
                    // D6：commit 已成功（上 guard.take().commit），此处仅发布；失败入 ZSET 重试队列。
                    if let Err(e) = publisher
                        .publish_event(EventType::StockInbound, payload.clone())
                        .await
                    {
                        tracing::warn!("[wms] StockInbound 事件发布失败: {}，入重试队列", e);
                        commit_retry::push_retry_typed("wms", EventType::StockInbound, &payload)
                            .await;
                    } else {
                        tracing::info!("[wms] StockInbound 事件发布成功 - inbound_id={}", oid);
                    }
                });
            }

            (
                ApiResponse::success(order.clone(), "入库订单创建成功"),
                "success",
                None,
            )
        }
        Err(e) => {
            tracing::error!("创建入库订单失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("入库订单创建失败".to_string())),
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inbound:read"])),
    path = "/api/wms/inbound-orders/{id}",
    tag = "wms",
    responses(
        (status = 200, description = "查询成功", body = InboundOrder, content_type = "application/json"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn get_inbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<InboundOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InboundRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let result = sqlx::query_as::<_, InboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, organization_id AS tenant_id, order_number, order_type,
               reference_number, reference_type, warehouse_id, warehouse_name,
               supplier_id, supplier_name, supplier_code,
               purchase_order_id, purchase_order_number,
               production_order_id, production_order_number,
               customer_id, customer_name, customer_order_number,
               order_date,
               expected_arrival_date, actual_arrival_date, received_date,
               expected_arrival_date AS expected_arrival, expected_arrival_date AS expected_date, actual_arrival_date AS actual_arrival,
               carrier, carrier_code, vehicle_number, driver_name, driver_phone,
               total_items, total_quantity, received_quantity, rejected_quantity,
               total_weight, total_volume, total_value, total_value AS total_amount,
               priority, status, receiver, receiver_id, receiving_team,
               inspection_required, inspection_status, inspection_result, inspector, inspection_date,
               notes, notes AS remarks, quality_check_notes, receiving_notes, special_instructions,
               created_by, updated_by, approved_by, approved_at, organization_id,
               created_at, updated_at
        FROM wms.inbound_orders WHERE id = $1 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(order)) => ApiResponse::success(order, "获取入库订单成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("入库订单不存在".to_string())),
        Err(e) => {
            tracing::error!("获取入库订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取入库订单失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:inbound:write"])),
    path = "/api/wms/inbound-orders/{id}",
    tag = "wms",
    responses(
        (status = 200, description = "更新成功", body = InboundOrder, content_type = "application/json"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn update_inbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateInboundOrderRequest>,
) -> ApiResponse<InboundOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let request_data = serde_json::to_value(&req).ok();

    let existing = sqlx::query_as::<_, InboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, organization_id AS tenant_id, order_number, order_type,
               reference_number, reference_type, warehouse_id, warehouse_name,
               supplier_id, supplier_name, supplier_code,
               purchase_order_id, purchase_order_number,
               production_order_id, production_order_number,
               customer_id, customer_name, customer_order_number,
               order_date,
               expected_arrival_date, actual_arrival_date, received_date,
               expected_arrival_date AS expected_arrival, expected_arrival_date AS expected_date, actual_arrival_date AS actual_arrival,
               carrier, carrier_code, vehicle_number, driver_name, driver_phone,
               total_items, total_quantity, received_quantity, rejected_quantity,
               total_weight, total_volume, total_value, total_value AS total_amount,
               priority, status, receiver, receiver_id, receiving_team,
               inspection_required, inspection_status, inspection_result, inspector, inspection_date,
               notes, notes AS remarks, quality_check_notes, receiving_notes, special_instructions,
               created_by, updated_by, approved_by, approved_at, organization_id,
               created_at, updated_at 
        FROM wms.inbound_orders WHERE id = $1 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("入库订单不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询入库订单失败", e)),
    };

    let warehouse_id = req.warehouse_id.or(existing.warehouse_id);
    let supplier_id = req.supplier_id.or(existing.supplier_id);
    let expected_arrival = req.expected_arrival.or(existing.expected_arrival);
    let actual_arrival = req.actual_arrival.or(existing.actual_arrival);
    let total_amount = req.total_amount.or(existing.total_amount);
    let status = req.status.unwrap_or(existing.status);
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    let result = sqlx::query_as::<_, InboundOrder>(
        only_own_schema_query!("wms", r#"
        UPDATE wms.inbound_orders SET
            warehouse_id = $2, supplier_id = $3, expected_arrival_date = $4, actual_arrival_date = $5, 
            total_value = $6, status = $7, notes = $8, updated_at = $9
        WHERE id = $1 AND deleted_at IS NULL AND ($10::uuid IS NULL OR tenant_id = $10::uuid)
        RETURNING id, organization_id AS tenant_id, order_number, order_type,
                  reference_number, reference_type, warehouse_id, warehouse_name,
                  supplier_id, supplier_name, supplier_code,
                  purchase_order_id, purchase_order_number,
                  production_order_id, production_order_number,
                  customer_id, customer_name, customer_order_number,
                  order_date,
                  expected_arrival_date, actual_arrival_date, received_date,
                  expected_arrival_date AS expected_arrival, expected_arrival_date AS expected_date, actual_arrival_date AS actual_arrival,
                  carrier, carrier_code, vehicle_number, driver_name, driver_phone,
                  total_items, total_quantity, received_quantity, rejected_quantity,
                  total_weight, total_volume, total_value, total_value AS total_amount,
                  priority, status, receiver, receiver_id, receiving_team,
                  inspection_required, inspection_status, inspection_result, inspector, inspection_date,
                  notes, notes AS remarks, quality_check_notes, receiving_notes, special_instructions,
                  created_by, updated_by, approved_by, approved_at, organization_id,
                  created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(warehouse_id)
    .bind(supplier_id)
    .bind(expected_arrival)
    .bind(actual_arrival)
    .bind(total_amount)
    .bind(&status)
    .bind(&remarks)
    .bind(now)
    .bind(tenant_filter)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("入库订单事务提交失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal(
                        "入库订单更新失败".to_string(),
                    ));
                }
            }
            (
                ApiResponse::success(order.clone(), "入库订单更新成功"),
                "success",
                None,
            )
        }
        Err(e) => {
            tracing::error!("更新入库订单失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("入库订单更新失败".to_string())),
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

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["wms:inbound:write"])),
    path = "/api/wms/inbound-orders/{id}",
    tag = "wms",
    responses(
        (status = 200, description = "删除成功"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn delete_inbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };
    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"UPDATE wms.inbound_orders SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"#
    ))
    .bind(id)
    .bind(tenant_filter)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            (
                ApiResponse::success("".to_string(), "入库订单删除成功"),
                "success",
                None,
            )
        }
        Ok(_) => (
            ApiResponse::from(TopemsError::ResourceNotFound("入库订单不存在".to_string())),
            "error",
            Some("入库订单不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除入库订单失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("入库订单删除失败".to_string())),
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:inbound:read"])),
    path = "/api/wms/inbound-orders/{id}/items",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn list_inbound_order_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InboundRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let result = sqlx::query(
        only_own_schema_query!("wms", r#"
        SELECT id, line_number, material_code, material_name, specification, batch_number,
               expected_quantity::float8, received_quantity::float8, rejected_quantity::float8, unit, 
               location_id, location_code, quality_status, unit_price, total_value, notes as remarks,
               created_at, updated_at
        FROM wms.inbound_order_items
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
            let received_count: i64 = items
                .iter()
                .filter(|r| r.try_get::<f64, _>("received_quantity").unwrap_or(0.0) > 0.0)
                .count() as i64;

            let items_json: Vec<serde_json::Value> = items.iter().map(pg_row_to_json).collect();

            ApiResponse::success(
                serde_json::json!({
                    "items": items_json,
                    "total": total,
                    "received_count": received_count,
                }),
                "获取入库订单明细成功",
            )
        }
        Err(e) => {
            tracing::error!("获取入库订单明细失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取入库订单明细失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:inbound:write"])),
    path = "/api/wms/inbound-orders/{id}/items",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn create_inbound_order_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<InboundOrderItemRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let request_data = serde_json::to_value(&req).ok();
    let item_id = Uuid::new_v4();
    let now = Utc::now();
    let total_value = req.unit_price.map(|p| {
        p * rust_decimal::Decimal::from_f64_retain(req.expected_quantity)
            .unwrap_or(rust_decimal::Decimal::ZERO)
    });

    // 租户绑定对齐新惯例：超管→SQL NULL（公共行），普通用户→claims.tenant_id。
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        INSERT INTO wms.inbound_order_items (id, organization_id, org_id, order_id, line_number,
                                             material_code, material_name, material_type,
                                             specification, batch_number, lot_number, serial_number,
                                             expected_quantity, unit, location_id, unit_price,
                                             total_value, notes, created_at, updated_at, tenant_id)
        VALUES ($1, $20, $20, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING id, line_number, material_code, material_name, specification, batch_number,
                  expected_quantity::float8, received_quantity::float8, rejected_quantity::float8, unit,
                  location_id, quality_status, unit_price, total_value, notes as remarks,
                  created_at, updated_at
        "#
    ))
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
    .bind(req.location_id)
    .bind(req.unit_price)
    .bind(total_value)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .bind(tenant_id.clone())
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(item) => {
            let item_json = pg_row_to_json(item);
            (
                ApiResponse::success(item_json.clone(), "入库订单明细创建成功"),
                "success",
                None,
                Some(item_json),
            )
        }
        Err(e) => {
            tracing::error!("创建入库订单明细失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("入库订单明细创建失败".to_string())),
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

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
        }
    }

    response
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:inbound:write"])),
    path = "/api/wms/inbound-orders/{id}/items/{item_id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn update_inbound_order_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ReceiveItemRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now();

    // P2 明细更新数量前置校验：received_quantity 非负且不超过应收(expected_quantity)。
    let expected_qty: Option<f64> = sqlx::query_scalar::<_, f64>(only_own_schema_query!(
        "wms",
        r#"
        SELECT expected_quantity::float8 FROM wms.inbound_order_items
        WHERE order_id = $1 AND id = $2 AND deleted_at IS NULL
          AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL
               OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
        "#
    ))
    .bind(id)
    .bind(item_id)
    .fetch_optional(&mut **txn)
    .await
    .ok()
    .flatten();

    match expected_qty {
        None => {
            return ApiResponse::not_found("入库订单明细不存在");
        }
        Some(expected) => {
            if req.received_quantity < 0.0 {
                return ApiResponse::bad_request(&format!(
                    "收货数量不能为负: {}",
                    req.received_quantity
                ));
            }
            if req.received_quantity > expected + f64::EPSILON {
                return ApiResponse::bad_request(&format!(
                    "收货数量超出应收: 应收 {} 实收 {}",
                    expected, req.received_quantity
                ));
            }
        }
    }

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.inbound_order_items SET
            received_quantity = $1, quality_status = $2, notes = $3, updated_at = $4
        WHERE order_id = $5 AND id = $6 AND deleted_at IS NULL AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
        RETURNING id, line_number, material_code, material_name, specification, batch_number,
                  expected_quantity::float8, received_quantity::float8, rejected_quantity::float8, unit, 
                  location_id, quality_status, unit_price, total_value, notes as remarks,
                  created_at, updated_at
        "#
    ))
    .bind(req.received_quantity)
    .bind(&req.quality_status)
    .bind(&req.remarks)
    .bind(now)
    .bind(id)
    .bind(item_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(item) => {
            let item_json = pg_row_to_json(item);
            (
                ApiResponse::success(item_json.clone(), "入库订单明细更新成功"),
                "success",
                None,
                Some(item_json),
            )
        }
        Err(e) => {
            tracing::error!("更新入库订单明细失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("入库订单明细更新失败".to_string())),
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

    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("事务提交失败: {}", e);
                return ApiResponse::server_error("事务提交失败");
            }
        }
    }

    response
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["wms:inbound:write"])),
    path = "/api/wms/inbound-orders/{id}/items/{item_id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn delete_inbound_order_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let result = sqlx::query(only_own_schema_query!("wms", r#"UPDATE wms.inbound_order_items SET deleted_at = NOW() WHERE order_id = $1 AND id = $2 AND deleted_at IS NULL AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))"#))
        .bind(id)
        .bind(item_id)
        .execute(&mut **txn)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            (
                ApiResponse::success("".to_string(), "入库订单明细删除成功"),
                "success",
                None,
            )
        }
        Ok(_) => (
            ApiResponse::from(TopemsError::ResourceNotFound(
                "入库订单明细不存在".to_string(),
            )),
            "error",
            Some("入库订单明细不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除入库订单明细失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("入库订单明细删除失败".to_string())),
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:inbound:write"])),
    path = "/api/wms/inbound-orders/{id}/confirm",
    tag = "wms",
    responses(
        (status = 200, description = "确认成功", body = InboundOrder, content_type = "application/json"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn confirm_inbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<InboundOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let now = Utc::now();
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    let result = sqlx::query_as::<_, InboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.inbound_orders SET
            status = 'confirmed', updated_at = $2
        WHERE id = $1 AND status = 'created' AND deleted_at IS NULL AND ($3::uuid IS NULL OR tenant_id = $3::uuid)
        RETURNING id, organization_id AS tenant_id, order_number, order_type,
                  reference_number, reference_type, warehouse_id, warehouse_name,
                  supplier_id, supplier_name, supplier_code,
                  purchase_order_id, purchase_order_number,
                  production_order_id, production_order_number,
                  customer_id, customer_name, customer_order_number,
                  order_date,
                  expected_arrival_date, actual_arrival_date, received_date,
                  expected_arrival_date AS expected_arrival, expected_arrival_date AS expected_date, actual_arrival_date AS actual_arrival,
                  carrier, carrier_code, vehicle_number, driver_name, driver_phone,
                  total_items, total_quantity, received_quantity, rejected_quantity,
                  total_weight, total_volume, total_value, total_value AS total_amount,
                  priority, status, receiver, receiver_id, receiving_team,
                  inspection_required, inspection_status, inspection_result, inspector, inspection_date,
                  notes, notes AS remarks, quality_check_notes, receiving_notes, special_instructions,
                  created_by, updated_by, approved_by, approved_at, organization_id,
                  created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .bind(tenant_filter)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("入库订单事务提交失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal(
                        "入库订单确认失败".to_string(),
                    ));
                }
            }
            (
                ApiResponse::success(order.clone(), "入库订单确认成功"),
                "success",
                None,
            )
        }
        Err(sqlx::Error::RowNotFound) => (
            ApiResponse::from(TopemsError::ResourceNotFound(
                "入库订单不存在或当前状态不允许确认".to_string(),
            )),
            "not_found",
            None,
        ),
        Err(e) => {
            tracing::error!("确认入库订单失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("确认入库订单失败".to_string())),
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:inbound:write"])),
    path = "/api/wms/inbound-orders/{id}/receive",
    tag = "wms",
    responses(
        (status = 200, description = "收货成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn receive_inbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(items): Json<Vec<ReceiveItemRequest>>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let request_data = serde_json::to_value(&items).ok();
    let now = Utc::now();
    // 租户绑定对齐新惯例：超管→SQL NULL（公共行），普通用户→claims.tenant_id。
    // 用于 INSERT…SELECT 写 inventory.tenant_id。
    let tenant_id: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    // P2 收货数量前置校验：received_quantity 非负且不超过明细应收(expected_quantity)。
    // 防 GUC 条件 UPDATE 静默不生效（rows_affected=0）或负数/超收直接落库。
    // 先按订单查全部明细的应收数量，再逐条校验请求，非法立即 400 不写库。
    {
        let line_ids: Vec<Uuid> = items.iter().map(|i| i.item_id).collect();
        let lines = sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            SELECT id, expected_quantity::float8 FROM wms.inbound_order_items
            WHERE order_id = $1 AND id = ANY($2) AND deleted_at IS NULL
              AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL
                   OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
            "#
        ))
        .bind(id)
        .bind(&line_ids)
        .fetch_all(&mut **txn)
        .await;

        let lines = match lines {
            Ok(rows) => rows,
            Err(e) => {
                tracing::error!("收货校验查询明细失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("收货校验失败".to_string()));
            }
        };

        let mut expected_by_id: std::collections::HashMap<Uuid, f64> =
            std::collections::HashMap::new();
        for row in &lines {
            let lid: Uuid = row.try_get::<Uuid, _>("id").unwrap_or_default();
            let exp: f64 = row.try_get::<f64, _>("expected_quantity").unwrap_or(0.0);
            expected_by_id.insert(lid, exp);
        }

        for item in &items {
            if item.received_quantity < 0.0 {
                return ApiResponse::bad_request(&format!(
                    "收货数量不能为负: 明细 {} 收到 {}",
                    item.item_id, item.received_quantity
                ));
            }
            match expected_by_id.get(&item.item_id) {
                None => {
                    return ApiResponse::bad_request(&format!(
                        "收货明细不属于该入库单或不存在: {}",
                        item.item_id
                    ));
                }
                Some(&expected) => {
                    if item.received_quantity > expected + f64::EPSILON {
                        return ApiResponse::bad_request(&format!(
                            "收货数量超出应收: 明细 {} 应收 {} 实收 {}",
                            item.item_id, expected, item.received_quantity
                        ));
                    }
                }
            }
        }
    }

    let tx = state.db.begin().await.map_err(|e| {
        tracing::error!("开启事务失败: {}", e);
        ApiResponse::from(TopemsError::Internal("开启事务失败".to_string()))
    });

    let mut tx = match tx {
        Ok(t) => t,
        Err(e) => return e,
    };

    for item in &items {
        let _ = sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            UPDATE wms.inbound_order_items SET
                received_quantity = $1, quality_status = $2, notes = $3, updated_at = $4
            WHERE order_id = $5 AND id = $6 AND deleted_at IS NULL AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID, '00000000-0000-0000-0000-000000000000'))
            "#
        ))
        .bind(item.received_quantity)
        .bind(&item.quality_status)
        .bind(&item.remarks)
        .bind(now)
        .bind(id)
        .bind(item.item_id)
        .execute(&mut *tx)
        .await;

        if item.quality_status == "qualified" {
            let _ = sqlx::query(only_own_schema_query!(
                "wms",
                r#"
                INSERT INTO wms.inventory (organization_id, warehouse_id, location_id,
                                          material_code, material_name, specification,
                                          batch_number, quantity, unit, available_quantity,
                                          quality_status, created_at, updated_at, tenant_id)
                SELECT $3, i.warehouse_id, io.location_id,
                       io.material_code, io.material_name, io.specification,
                       io.batch_number, $1, io.unit, $1, 'qualified', NOW(), NOW(), $3
                FROM wms.inbound_order_items io
                JOIN wms.inbound_orders i ON io.order_id = i.id
                WHERE io.id = $2
                ON CONFLICT (organization_id, material_code, batch_number) DO UPDATE SET
                    quantity = wms.inventory.quantity + $1,
                    available_quantity = wms.inventory.available_quantity + $1,
                    updated_at = NOW()
                "#
            ))
            .bind(item.received_quantity)
            .bind(item.item_id)
            .bind(tenant_id)
            .execute(&mut *tx)
            .await;

            // V19.8: 入库收货时同步写入 inventory_movements
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
                    $1, $2, $3, 'inbound', $4, 'inbound_order',
                    NULL, io.material_code, io.material_name, $5,
                    NULL, io.location_id, NULL, i.warehouse_id,
                    'completed', $6, $7, $6, $6
                FROM wms.inbound_order_items io
                JOIN wms.inbound_orders i ON io.order_id = i.id
                WHERE io.id = $8
                "#
            ))
            .bind(movement_id)
            .bind(&movement_no)
            .bind(tenant_id)
            .bind(id.to_string())
            .bind(item.received_quantity)
            .bind(now)
            .bind(format!("入库收货：订单 {}", id))
            .bind(item.item_id)
            .execute(&mut *tx)
            .await;
        }
    }

    let _ = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.inbound_orders SET
            status = 'received', actual_arrival_date = $1, updated_at = $1
        WHERE id = $2 AND deleted_at IS NULL AND ($3::uuid IS NULL OR tenant_id = $3::uuid)
        "#
    ))
    .bind(now)
    .bind(id)
    .bind(tenant_id)
    .execute(&mut *tx)
    .await;

    if tx.commit().await.is_err() {
        return ApiResponse::from(TopemsError::Internal("入库操作失败".to_string()));
    }

    let order_result = sqlx::query_as::<_, InboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, organization_id AS tenant_id, order_number, order_type,
               reference_number, reference_type, warehouse_id, warehouse_name,
               supplier_id, supplier_name, supplier_code,
               purchase_order_id, purchase_order_number,
               production_order_id, production_order_number,
               customer_id, customer_name, customer_order_number,
               order_date,
               expected_arrival_date, actual_arrival_date, received_date,
               expected_arrival_date AS expected_arrival, expected_arrival_date AS expected_date, actual_arrival_date AS actual_arrival,
               carrier, carrier_code, vehicle_number, driver_name, driver_phone,
               total_items, total_quantity, received_quantity, rejected_quantity,
               total_weight, total_volume, total_value, total_value AS total_amount,
               priority, status, receiver, receiver_id, receiving_team,
               inspection_required, inspection_status, inspection_result, inspector, inspection_date,
               notes, notes AS remarks, quality_check_notes, receiving_notes, special_instructions,
               created_by, updated_by, approved_by, approved_at, organization_id,
               created_at, updated_at
        FROM wms.inbound_orders WHERE id = $1 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg, response_data) = match order_result {
        Ok(order) => {
            // P3 事件驱动规范化：入库收货完成后按收货明细逐条发布 WmsInventoryItemReceived 事件，
            // 通知 SCM（采购履约）/Finance（应付确认）。
            // P1-2 修复：数量与物料以收货明细为准，禁止用订单金额(total_amount)填充；
            // payload 本身为库存项(item)级契约，逐条发射使下游按物料对账/应付确认可用。
            if let Some(ref publisher) = state.event_publisher {
                // 查询本次收货明细的真实物料字段。inbound_order_items 无 material_id 列，
                // 与既有 wms.inventory_movements 写入保持一致，material_id 置 None。
                let line_ids: Vec<Uuid> = items.iter().map(|i| i.item_id).collect();
                let line_rows = sqlx::query(only_own_schema_query!(
                    "wms",
                    r#"
                    SELECT id, material_code, material_name, unit
                    FROM wms.inbound_order_items
                    WHERE order_id = $1 AND id = ANY($2) AND deleted_at IS NULL
                      AND ($3::uuid IS NULL OR tenant_id = $3::uuid)
                    "#
                ))
                .bind(id)
                .bind(&line_ids)
                .bind(tenant_id)
                .fetch_all(&mut **txn)
                .await;

                let mut lines_by_id: std::collections::HashMap<Uuid, (String, String, String)> =
                    std::collections::HashMap::new();
                if let Ok(rows) = line_rows {
                    for row in rows {
                        let line_id: Uuid = row.try_get::<Uuid, _>("id").unwrap_or_default();
                        if line_id.is_nil() {
                            continue;
                        }
                        let material_code: String =
                            row.try_get("material_code").unwrap_or_default();
                        let material_name: String =
                            row.try_get("material_name").unwrap_or_default();
                        let unit: String = row.try_get("unit").unwrap_or_default();
                        lines_by_id.insert(line_id, (material_code, material_name, unit));
                    }
                }

                // 与请求中的收货数量配对：每条明细一个事件（真实数量 + 真实物料）。
                // 与库存入账口径一致：仅 qualified 明细产生入库库存事件。
                let events: Vec<(String, String, String, f64)> = items
                    .iter()
                    .filter_map(|req| {
                        if req.quality_status != "qualified" {
                            return None;
                        }
                        let (code, name, unit) = lines_by_id.get(&req.item_id)?;
                        Some((
                            code.clone(),
                            name.clone(),
                            unit.clone(),
                            req.received_quantity,
                        ))
                    })
                    .collect();

                let publisher = publisher.clone();
                let inbound_id = order.id;
                let inbound_no = order.order_number.clone();
                let warehouse_id = order.warehouse_id;
                let supplier_id = order.supplier_id;
                let tenant_id = order.tenant_id;
                let reference_order_id = Some(order.id);
                let received_at_val = order.actual_arrival.or_else(|| Some(Utc::now()));
                tokio::spawn(async move {
                    for (material_code, material_name, unit, quantity) in events {
                        let payload = WmsInventoryItemReceivedPayload {
                            inbound_id,
                            inbound_no: inbound_no.clone(),
                            warehouse_id,
                            warehouse_name: None,
                            material_id: None,
                            material_code,
                            material_name,
                            quantity,
                            unit: Some(unit),
                            quality_status: Some("qualified".to_string()),
                            reference_order_id,
                            reference_order_no: None,
                            supplier_id,
                            supplier_name: None,
                            received_by: None,
                            received_at: received_at_val,
                            tenant_id,
                        };
                        // D6：业务写事务 tx.commit() 已成功（上），此处仅发布；失败入 ZSET 重试队列。
                        if let Err(e) = publisher
                            .publish_event(EventType::WmsInventoryItemReceived, payload.clone())
                            .await
                        {
                            tracing::warn!(
                                "[wms] WmsInventoryItemReceived 事件发布失败: {}，入重试队列",
                                e
                            );
                            commit_retry::push_retry_typed(
                                "wms",
                                EventType::WmsInventoryItemReceived,
                                &payload,
                            )
                            .await;
                        } else {
                            tracing::info!(
                                "[wms] WmsInventoryItemReceived 事件发布成功 - inbound_id={}, material_code={}, quantity={}",
                                inbound_id, payload.material_code, payload.quantity
                            );
                        }
                    }
                });
            }

            let order_json = serde_json::to_value(order.clone()).ok();
            (
                ApiResponse::success(
                    serde_json::json!({ "order": order, "message": "入库完成" }),
                    "入库成功",
                ),
                "success",
                None,
                order_json,
            )
        }
        Err(e) => {
            tracing::error!("获取入库订单失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("入库失败".to_string())),
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:inbound:write"])),
    path = "/api/wms/inbound-orders/{id}/complete",
    tag = "wms",
    responses(
        (status = 200, description = "完成成功", body = InboundOrder, content_type = "application/json"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    )
)]
pub async fn complete_inbound_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<InboundOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let now = Utc::now();
    let tenant_filter: Option<Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
    };

    let result = sqlx::query_as::<_, InboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.inbound_orders SET
            status = 'completed', updated_at = $2
        WHERE id = $1 AND status = 'received' AND deleted_at IS NULL AND ($3::uuid IS NULL OR tenant_id = $3::uuid)
        RETURNING id, organization_id AS tenant_id, order_number, order_type,
                  reference_number, reference_type, warehouse_id, warehouse_name,
                  supplier_id, supplier_name, supplier_code,
                  purchase_order_id, purchase_order_number,
                  production_order_id, production_order_number,
                  customer_id, customer_name, customer_order_number,
                  order_date,
                  expected_arrival_date, actual_arrival_date, received_date,
                  expected_arrival_date AS expected_arrival, expected_arrival_date AS expected_date, actual_arrival_date AS actual_arrival,
                  carrier, carrier_code, vehicle_number, driver_name, driver_phone,
                  total_items, total_quantity, received_quantity, rejected_quantity,
                  total_weight, total_volume, total_value, total_value AS total_amount,
                  priority, status, receiver, receiver_id, receiving_team,
                  inspection_required, inspection_status, inspection_result, inspector, inspection_date,
                  notes, notes AS remarks, quality_check_notes, receiving_notes, special_instructions,
                  created_by, updated_by, approved_by, approved_at, organization_id,
                  created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .bind(tenant_filter)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("入库订单事务提交失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal(
                        "入库订单完成失败".to_string(),
                    ));
                }
            }
            (
                ApiResponse::success(order.clone(), "入库订单完成"),
                "success",
                None,
            )
        }
        Err(sqlx::Error::RowNotFound) => (
            ApiResponse::from(TopemsError::ResourceNotFound(
                "入库订单不存在或当前状态不允许完成".to_string(),
            )),
            "not_found",
            None,
        ),
        Err(e) => {
            tracing::error!("完成入库订单失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("完成入库订单失败".to_string())),
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

#[derive(Debug, serde::Deserialize, ToSchema)]
pub struct ApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:inbound:write"])),
    path = "/api/wms/inbound-orders/{id}/approval/start",
    tag = "WMS - Inbound",
    request_body = ApprovalRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn start_inbound_approval(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InboundApprove).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_id = get_tenant_id_or_new(&claims, &headers);

    let current = sqlx::query(
        only_own_schema_query!("wms", "SELECT status FROM wms.inbound_orders WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"),
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if !crate::shared::fsm::inbound_order_requires_approval(&current_status, "completed") {
                return ApiResponse::bad_request("当前状态无需审批");
            }
            let _ = crate::models::audit_log::log_approval_event(
                &mut **txn,
                &tenant_id.to_string(),
                "inbound_order",
                &id.to_string(),
                "start_approval",
                &req.operator,
                &current_status,
                &current_status,
                req.comment.as_deref(),
            )
            .await;
            ApiResponse::success(
                serde_json::json!({"status": current_status, "approval_started": true}),
                "审批启动成功",
            )
        }
        Err(e) => {
            tracing::error!("找不到入库单: {}", e);
            ApiResponse::not_found("入库单不存在")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:inbound:write"])),
    path = "/api/wms/inbound-orders/{id}/approval/approve",
    tag = "WMS - Inbound",
    request_body = ApprovalRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn approve_inbound(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InboundApprove).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_id = get_tenant_id_or_new(&claims, &headers);

    let current = sqlx::query(
        only_own_schema_query!("wms", "SELECT status FROM wms.inbound_orders WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"),
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if crate::shared::fsm::inbound_order_requires_approval(&current_status, "completed")
                && crate::shared::fsm::inbound_order_can_transition(&current_status, "completed")
                    .is_err()
            {
                return ApiResponse::bad_request("当前状态不允许审批通过");
            }
            let result = sqlx::query(
                only_own_schema_query!("wms", "UPDATE wms.inbound_orders SET status = 'completed', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *"),
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
                        "inbound_order",
                        &id.to_string(),
                        "approve",
                        &req.operator,
                        &current_status,
                        "completed",
                        req.comment.as_deref(),
                    )
                    .await;
                    if let Some(t) = guard.take() {
                        if let Err(e) = t.commit().await {
                            tracing::error!("事务提交失败: {}", e);
                            return ApiResponse::server_error("事务提交失败");
                        }
                    }
                    ApiResponse::success(
                        serde_json::json!({"id": id, "status": "completed"}),
                        "审批通过",
                    )
                }
                Err(e) => {
                    tracing::error!("审批入库单失败: {}", e);
                    ApiResponse::server_error("审批失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("找不到入库单: {}", e);
            ApiResponse::not_found("入库单不存在")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:inbound:write"])),
    path = "/api/wms/inbound-orders/{id}/approval/reject",
    tag = "WMS - Inbound",
    request_body = ApprovalRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn reject_inbound(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InboundApprove).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_id = get_tenant_id_or_new(&claims, &headers);

    let current = sqlx::query(
        only_own_schema_query!("wms", "SELECT status FROM wms.inbound_orders WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"),
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if crate::shared::fsm::inbound_order_can_transition(&current_status, "confirmed")
                .is_err()
            {
                return ApiResponse::bad_request("当前状态不允许驳回回流");
            }
            let result = sqlx::query(
                only_own_schema_query!("wms", "UPDATE wms.inbound_orders SET status = 'confirmed', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *"),
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
                        "inbound_order",
                        &id.to_string(),
                        "reject",
                        &req.operator,
                        &current_status,
                        "confirmed",
                        req.comment.as_deref(),
                    )
                    .await;
                    if let Some(t) = guard.take() {
                        if let Err(e) = t.commit().await {
                            tracing::error!("事务提交失败: {}", e);
                            return ApiResponse::server_error("事务提交失败");
                        }
                    }
                    ApiResponse::success(
                        serde_json::json!({"id": id, "status": "confirmed"}),
                        "审批驳回，回流至 confirmed",
                    )
                }
                Err(e) => {
                    tracing::error!("驳回入库单失败: {}", e);
                    ApiResponse::server_error("驳回失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("找不到入库单: {}", e);
            ApiResponse::not_found("入库单不存在")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_inbound_order_item_request_serialization() {
        let item = InboundOrderItemRequest {
            line_number: Some(1),
            material_code: "MAT001".to_string(),
            material_name: "测试物料".to_string(),
            material_type: Some("raw_material".to_string()),
            specification: Some("规格A".to_string()),
            batch_number: Some("BATCH001".to_string()),
            lot_number: Some("LOT001".to_string()),
            serial_number: Some("SN001".to_string()),
            expected_quantity: 100.0,
            unit: "PCS".to_string(),
            location_id: None,
            unit_price: rust_decimal::Decimal::from_f64_retain(10.5),
            remarks: Some("测试备注".to_string()),
        };
        let json = serde_json::to_value(&item).unwrap();
        assert_eq!(json["line_number"], 1);
        assert_eq!(json["material_code"], "MAT001");
        assert_eq!(json["material_name"], "测试物料");
        assert_eq!(json["material_type"], "raw_material");
        assert_eq!(json["expected_quantity"], 100.0);
        assert_eq!(json["unit"], "PCS");
        assert_eq!(json["unit_price"], "10.5");
    }

    #[test]
    fn test_inbound_order_item_request_minimal() {
        let item = InboundOrderItemRequest {
            line_number: None,
            material_code: "MAT002".to_string(),
            material_name: "简单物料".to_string(),
            material_type: None,
            specification: None,
            batch_number: None,
            lot_number: None,
            serial_number: None,
            expected_quantity: 50.0,
            unit: "KG".to_string(),
            location_id: None,
            unit_price: None,
            remarks: None,
        };
        let json = serde_json::to_value(&item).unwrap();
        assert_eq!(json["material_code"], "MAT002");
        assert_eq!(json["expected_quantity"], 50.0);
        assert_eq!(json["unit"], "KG");
        assert!(json["line_number"].is_null());
        assert!(json["material_type"].is_null());
        assert!(json["unit_price"].is_null());
    }

    #[test]
    fn test_inbound_order_item_request_deserialize() {
        let json = r#"{
            "line_number": 2,
            "material_code": "MAT003",
            "material_name": "反序列化物料",
            "material_type": "finished_goods",
            "expected_quantity": 200.0,
            "unit": "BOX",
            "unit_price": 25.0
        }"#;
        let item: InboundOrderItemRequest = serde_json::from_str(json).unwrap();
        assert_eq!(item.line_number, Some(2));
        assert_eq!(item.material_code, "MAT003");
        assert_eq!(item.material_name, "反序列化物料");
        assert_eq!(item.material_type.as_deref(), Some("finished_goods"));
        assert_eq!(item.expected_quantity, 200.0);
        assert_eq!(item.unit, "BOX");
        assert_eq!(item.unit_price, Some(rust_decimal::Decimal::new(25, 0)));
        assert!(item.batch_number.is_none());
        assert!(item.remarks.is_none());
    }

    #[test]
    fn test_receive_item_request_serialization() {
        let request = ReceiveItemRequest {
            item_id: Uuid::nil(),
            received_quantity: 95.0,
            quality_status: "qualified".to_string(),
            remarks: Some("质检合格".to_string()),
        };
        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["received_quantity"], 95.0);
        assert_eq!(json["quality_status"], "qualified");
        assert_eq!(json["remarks"], "质检合格");
    }

    #[test]
    fn test_receive_item_request_minimal() {
        let request = ReceiveItemRequest {
            item_id: Uuid::nil(),
            received_quantity: 100.0,
            quality_status: "pending".to_string(),
            remarks: None,
        };
        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["received_quantity"], 100.0);
        assert_eq!(json["quality_status"], "pending");
        assert!(json["remarks"].is_null());
    }

    #[test]
    fn test_receive_item_request_deserialize() {
        let json = r#"{
            "item_id": "00000000-0000-0000-0000-000000000000",
            "received_quantity": 80.0,
            "quality_status": "rejected",
            "remarks": "质量不合格"
        }"#;
        let request: ReceiveItemRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.received_quantity, 80.0);
        assert_eq!(request.quality_status, "rejected");
        assert_eq!(request.remarks.as_deref(), Some("质量不合格"));
    }

    #[test]
    fn test_approval_request_deserialize() {
        let json = r#"{
            "operator": "admin",
            "comment": "同意入库"
        }"#;
        let request: ApprovalRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.operator, "admin");
        assert_eq!(request.comment.as_deref(), Some("同意入库"));
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
            "comment": "数量不符，驳回"
        }"#;
        let request: ApprovalRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.operator, "auditor");
        assert_eq!(request.comment.as_deref(), Some("数量不符，驳回"));
    }
}
