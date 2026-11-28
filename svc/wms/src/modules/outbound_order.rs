use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::models::outbound_order::*;
use crate::modules::audit::log_audit_event;
use crate::modules::outbound_execution_status::OutboundExecutionStatus;
use crate::modules::outbound_status::OutboundStatus;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use crate::shared::scope::{
    arm_short_txn, movement_no, release_request_txn, tenant_of, wms_db, ShortTxnTimer,
};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::require_tenant;
use topems_shared_core::response::{ApiResponse, PaginationParams};
use topems_shared_core::TopemsError;
use topems_shared_event::event::{commit_retry, EventType, WmsInventoryItemShippedPayload};

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
    pub unit_price: Option<rust_decimal::Decimal>,
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
    headers: HeaderMap,
    Query(params): Query<PaginationParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = match params.status.as_deref() {
        Some(raw) if raw != "all" && !raw.trim().is_empty() => {
            match OutboundStatus::from_read_str(raw) {
                Ok(status) => Some(status.as_db_str()),
                Err(msg) => return ApiResponse::bad_request(&msg),
            }
        }
        _ => None,
    };
    let canonical_statuses: Vec<String> = OutboundStatus::DB_VALUES
        .iter()
        .map(|value| (*value).to_string())
        .collect();
    let execution_statuses: Vec<String> = OutboundExecutionStatus::DB_VALUES
        .iter()
        .map(|value| (*value).to_string())
        .collect();

    let result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
               customer_id, customer_name, created_at as order_date, 
               expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
               total_value as total_amount, picking_status, packing_status, shipping_status, status, notes as remarks,
               sales_order_id, sales_order_number, carrier, tracking_number,
               picked_quantity, packed_quantity, shipped_quantity,
               created_by, approved_by, approved_at,
               created_at, updated_at
        FROM wms.outbound_orders
        WHERE ($1::text IS NULL OR order_number ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND status = ANY($5::text[])
          AND picking_status = ANY($6::text[])
          AND packing_status = ANY($6::text[])
          AND shipping_status = ANY($6::text[])
          AND tenant_id = $7 AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(&search_pattern)
    .bind(status_filter)
    .bind(page_size)
    .bind(offset)
    .bind(&canonical_statuses)
    .bind(&execution_statuses)
    .bind(tenant_id)
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
                  AND status = ANY($3::text[])
                  AND picking_status = ANY($4::text[])
                  AND packing_status = ANY($4::text[])
                  AND shipping_status = ANY($4::text[])
                  AND tenant_id = $5 AND deleted_at IS NULL
                "#
            ))
            .bind(&search_pattern)
            .bind(status_filter)
            .bind(&canonical_statuses)
            .bind(&execution_statuses)
            .bind(tenant_id)
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
                "获取出库订单列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取出库订单列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取出库订单列表失败".to_string()))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateOutboundOrderRequest>,
) -> ApiResponse<OutboundOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    // 租户绑定对齐新惯例（与 mobile sync-policy v3 同款）：超管/服务 claims 绑 SQL NULL
    // （命中 RLS 严格策略 `tenant_id IS NULL` 分支，零 uuid/NULL/污染真实租户任何连接池
    // 上下文都放行）；普通用户绑 claims.tenant_id。organization_id 为历史重复列，
    // 仍按租户值写入；org_id 取自仓库，避免 canonical 的 NOT NULL 列无绑定。
    let tenant_id: Option<Uuid> = match claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(t) => Some(t),
        None => return ApiResponse::bad_request("缺少租户上下文（超管需携带 x-tenant-id）"),
    };
    let warehouse_id = match req.warehouse_id {
        Some(v) => v,
        None => return ApiResponse::bad_request("缺少仓库"),
    };
    let org_id = {
        let mut scope = match wms_db(&state.db).scope_with(txn).await {
            Ok(scope) => scope,
            Err(e) => {
                tracing::error!("建立 RLS 事务作用域失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("创建出库订单失败".to_string()));
            }
        };
        sqlx::query_scalar::<_, Uuid>(only_own_schema_query!(
            "wms",
            r#"SELECT org_id FROM wms.warehouses
               WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"#
        ))
        .bind(warehouse_id)
        .bind(tenant_id)
        .fetch_optional(&mut scope)
        .await
    };
    let org_id = match org_id {
        Ok(Some(v)) => v,
        Ok(None) => return ApiResponse::conflict("仓库不存在，无法创建出库订单"),
        Err(e) => {
            tracing::error!("查询仓库组织失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建出库订单失败".to_string()));
        }
    };

    let result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        INSERT INTO wms.outbound_orders (id, organization_id, order_number, order_type, warehouse_id,
                                        customer_id, order_date, expected_ship_date, total_value,
                                        status, picking_status, packing_status, shipping_status,
                                        notes, created_at, updated_at, tenant_id, org_id)
        VALUES ($1, $11, $2, 'sales', $3, $4, $5,
               CASE WHEN $6::timestamptz IS NULL THEN NULL
                    ELSE date_trunc('day', $6::timestamptz AT TIME ZONE 'Asia/Shanghai')
                         AT TIME ZONE 'Asia/Shanghai'
               END,
               $7,
               $13, $14, $14, $14, $8, $9, $10, $11, $12)
        RETURNING id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
                  customer_id, customer_name, created_at as order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, picking_status, packing_status, shipping_status, status, notes as remarks,
                  sales_order_id, sales_order_number, carrier, tracking_number,
                  picked_quantity, packed_quantity, shipped_quantity,
                  created_by, approved_by, approved_at,
                  created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(&req.order_number)
    .bind(warehouse_id)
    .bind(req.customer_id)
    .bind(req.order_date)
    .bind(req.expected_delivery)
    .bind(req.total_amount)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .bind(org_id)
    .bind(OutboundStatus::DEFAULT.as_db_str())
    .bind(crate::modules::outbound_execution_status::OutboundExecutionStatus::DEFAULT.as_db_str())
    .fetch_one(&mut **txn)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(order) => (
            ApiResponse::success(order.clone(), "出库订单创建成功"),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建出库订单失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("出库订单创建失败".to_string())),
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
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<OutboundOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let canonical_statuses: Vec<String> = OutboundStatus::DB_VALUES
        .iter()
        .map(|value| (*value).to_string())
        .collect();
    let execution_statuses: Vec<String> = OutboundExecutionStatus::DB_VALUES
        .iter()
        .map(|value| (*value).to_string())
        .collect();
    let result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
               customer_id, customer_name, created_at as order_date, 
               expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
               total_value as total_amount, picking_status, packing_status, shipping_status, status, notes as remarks,
               sales_order_id, sales_order_number, carrier, tracking_number,
               picked_quantity, packed_quantity, shipped_quantity,
               created_by, approved_by, approved_at,
               created_at, updated_at
        FROM wms.outbound_orders
        WHERE id = $1 AND status = ANY($2::text[])
          AND picking_status = ANY($3::text[])
          AND packing_status = ANY($3::text[])
          AND shipping_status = ANY($3::text[])
          AND tenant_id = $4 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .bind(&canonical_statuses)
    .bind(&execution_statuses)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(order)) => ApiResponse::success(order, "获取出库订单成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("出库订单不存在".to_string())),
        Err(e) => {
            tracing::error!("获取出库订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取出库订单失败".to_string()))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateOutboundOrderRequest>,
) -> ApiResponse<OutboundOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let request_data = serde_json::to_value(&req).ok();
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let canonical_statuses: Vec<String> = OutboundStatus::DB_VALUES
        .iter()
        .map(|value| (*value).to_string())
        .collect();
    let execution_statuses: Vec<String> = OutboundExecutionStatus::DB_VALUES
        .iter()
        .map(|value| (*value).to_string())
        .collect();

    let existing = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
               customer_id, customer_name, created_at as order_date, 
               expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
               total_value as total_amount, picking_status, packing_status, shipping_status, status, notes as remarks,
               sales_order_id, sales_order_number, carrier, tracking_number,
               picked_quantity, packed_quantity, shipped_quantity,
               created_by, approved_by, approved_at,
               created_at, updated_at 
        FROM wms.outbound_orders
        WHERE id = $1 AND status = ANY($2::text[])
          AND picking_status = ANY($3::text[])
          AND packing_status = ANY($3::text[])
          AND shipping_status = ANY($3::text[])
          AND tenant_id = $4 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .bind(&canonical_statuses)
    .bind(&execution_statuses)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("出库订单不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询出库订单失败", e)),
    };

    let warehouse_id = req.warehouse_id.or(existing.warehouse_id);
    let customer_id = req.customer_id.or(existing.customer_id);
    let expected_delivery = req.expected_delivery.or(existing.expected_delivery);
    let actual_delivery = req.actual_delivery.or(existing.actual_delivery);
    let total_amount = req.total_amount.or(existing.total_amount);
    let current_status = match OutboundStatus::from_db_str(&existing.status) {
        Ok(status) => status,
        Err(msg) => return ApiResponse::bad_request(&msg),
    };
    let requested_status = match req.status.as_deref() {
        Some(raw) => match OutboundStatus::from_db_str(raw) {
            Ok(status) if status == current_status => status,
            Ok(_) => {
                return ApiResponse::bad_request("通用更新不允许改变出库单状态，请使用对应流转接口")
            }
            Err(msg) => return ApiResponse::bad_request(&msg),
        },
        None => current_status,
    };
    let status = requested_status.as_db_str().to_string();
    let previous_status = current_status.as_db_str().to_string();
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.outbound_orders SET
            warehouse_id = $2, customer_id = $3,
            expected_ship_date = CASE WHEN $4::timestamptz IS NULL THEN NULL
                    ELSE date_trunc('day', $4::timestamptz AT TIME ZONE 'Asia/Shanghai')
                         AT TIME ZONE 'Asia/Shanghai'
                END,
            actual_ship_date = CASE WHEN $5::timestamptz IS NULL THEN NULL
                    ELSE date_trunc('day', $5::timestamptz AT TIME ZONE 'Asia/Shanghai')
                         AT TIME ZONE 'Asia/Shanghai'
                END,
            total_value = $6, status = $7, notes = $8, updated_at = $9
        WHERE id = $1 AND status = $10 AND tenant_id = $11 AND deleted_at IS NULL
        RETURNING id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
                  customer_id, customer_name, created_at as order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, picking_status, packing_status, shipping_status, status, notes as remarks,
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
    .bind(&previous_status)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            ApiResponse::success(order.clone(), "出库订单更新成功"),
            "success",
            None,
        ),
        Err(sqlx::Error::RowNotFound) => (
            ApiResponse::conflict("出库订单状态已变化，请刷新后重试"),
            "conflict",
            None,
        ),
        Err(e) => {
            tracing::error!("更新出库订单失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("出库订单更新失败".to_string())),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let deletable_statuses: Vec<String> = OutboundStatus::DB_VALUES
        .iter()
        .filter(|value| {
            OutboundStatus::from_db_str(value)
                .map(OutboundStatus::is_deletable)
                .unwrap_or(false)
        })
        .map(|value| (*value).to_string())
        .collect();
    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"UPDATE wms.outbound_orders SET deleted_at = NOW()
           WHERE id = $1 AND status = ANY($2::text[]) AND deleted_at IS NULL"#
    ))
    .bind(id)
    .bind(&deletable_statuses)
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
                ApiResponse::success("".to_string(), "出库订单删除成功"),
                "success",
                None,
            )
        }
        Ok(_) => (
            ApiResponse::from(TopemsError::ResourceNotFound(
                "出库订单不存在或处于不可删除状态".to_string(),
            )),
            "error",
            Some("出库订单不存在或处于不可删除状态".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除出库订单失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("出库订单删除失败".to_string())),
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
#[allow(clippy::as_conversions, clippy::cast_possible_wrap)]
pub async fn list_outbound_order_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let result = sqlx::query(
        only_own_schema_query!("wms", r#"
        SELECT id, line_number, material_code, material_name, specification, batch_number,
               requested_quantity::float8, reserved_quantity, picked_quantity, packed_quantity, shipped_quantity::float8, unit, 
               source_location_id, source_location_code, destination_location_id, destination_location_code,
               unit_price, total_value, picking_status, packing_status, notes as remarks,
               created_at, updated_at
        FROM wms.outbound_order_items
        WHERE order_id = $1 AND deleted_at IS NULL AND tenant_id = $2::uuid
        ORDER BY line_number ASC
        "#),
    )
    .bind(id)
    .bind(tenant)
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

            ApiResponse::success(
                serde_json::json!({
                    "items": items_json,
                    "total": total,
                    "shipped_count": shipped_count,
                }),
                "获取出库订单明细成功",
            )
        }
        Err(e) => {
            tracing::error!("获取出库订单明细失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取出库订单明细失败".to_string()))
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<OutboundOrderItemRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let request_data = serde_json::to_value(&req).ok();
    let item_id = Uuid::new_v4();
    let now = Utc::now();
    let total_value = req.unit_price.map(|p| {
        p * rust_decimal::Decimal::from_f64_retain(req.requested_quantity)
            .unwrap_or(rust_decimal::Decimal::ZERO)
    });

    // 租户绑定对齐新惯例：超管→SQL NULL（公共行），普通用户→claims.tenant_id。
    // organization_id 仍写租户值；org_id 跟单头，避免 NOT NULL 列无绑定。
    let tenant_id: Option<Uuid> = match claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(t) => Some(t),
        None => return ApiResponse::bad_request("缺少租户上下文（超管需携带 x-tenant-id）"),
    };
    let org_id = {
        let mut scope = match wms_db(&state.db).scope_with(txn).await {
            Ok(scope) => scope,
            Err(e) => {
                tracing::error!("建立 RLS 事务作用域失败: {}", e);
                return ApiResponse::from(TopemsError::Internal(
                    "创建出库订单明细失败".to_string(),
                ));
            }
        };
        sqlx::query_scalar::<_, Uuid>(only_own_schema_query!(
            "wms",
            r#"SELECT org_id FROM wms.outbound_orders
               WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"#
        ))
        .bind(id)
        .bind(tenant_id)
        .fetch_optional(&mut scope)
        .await
    };
    let org_id = match org_id {
        Ok(Some(v)) => v,
        Ok(None) => return ApiResponse::conflict("出库订单不存在，无法创建明细"),
        Err(e) => {
            tracing::error!("查询出库订单组织失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("创建出库订单明细失败".to_string()));
        }
    };

    let result = sqlx::query(
        only_own_schema_query!("wms", r#"
        INSERT INTO wms.outbound_order_items (id, organization_id, order_id, line_number,
                                              material_code, material_name, material_type,
                                              specification, batch_number, lot_number, serial_number,
                                              requested_quantity, unit, source_location_id, unit_price,
                                              total_value, notes, created_at, updated_at, tenant_id, org_id)
        VALUES ($1, $19, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING id, line_number, material_code, material_name, specification, batch_number,
                  requested_quantity::float8, reserved_quantity, picked_quantity, packed_quantity, shipped_quantity, unit,
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
    .bind(tenant_id)
    .bind(org_id)
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
                ApiResponse::success(item_json.clone(), "出库订单明细创建成功"),
                "success",
                None,
                Some(item_json),
            )
        }
        Err(e) => {
            tracing::error!("创建出库订单明细失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("出库订单明细创建失败".to_string())),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<ShipItemRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let request_data = serde_json::to_value(&req).ok();
    let now = Utc::now();

    let result = sqlx::query(
        only_own_schema_query!("wms", r#"
        UPDATE wms.outbound_order_items SET
            shipped_quantity = $1, notes = $2, updated_at = $3
        WHERE order_id = $4 AND id = $5 AND deleted_at IS NULL
        RETURNING id, line_number, material_code, material_name, specification, batch_number,
                  requested_quantity, reserved_quantity, picked_quantity, packed_quantity, shipped_quantity::float8, unit, 
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
                ApiResponse::success(item_json.clone(), "出库订单明细更新成功"),
                "success",
                None,
                Some(item_json),
            )
        }
        Err(e) => {
            tracing::error!("更新出库订单明细失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("出库订单明细更新失败".to_string())),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
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
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            (
                ApiResponse::success("".to_string(), "出库订单明细删除成功"),
                "success",
                None,
            )
        }
        Ok(_) => (
            ApiResponse::from(TopemsError::ResourceNotFound(
                "出库订单明细不存在".to_string(),
            )),
            "error",
            Some("出库订单明细不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除出库订单明细失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("出库订单明细删除失败".to_string())),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<OutboundOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.outbound_orders SET
            status = $3, updated_at = $2
        WHERE id = $1 AND status = $4
          AND picking_status = $5 AND packing_status = $5 AND shipping_status = $5
          AND tenant_id = $6 AND deleted_at IS NULL
        RETURNING id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
                  customer_id, customer_name, created_at as order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, picking_status, packing_status, shipping_status, status, notes as remarks,
                  sales_order_id, sales_order_number, carrier, tracking_number,
                  picked_quantity, packed_quantity, shipped_quantity,
                  created_by, approved_by, approved_at,
                  created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .bind(OutboundStatus::Confirmed.as_db_str())
    .bind(OutboundStatus::Created.as_db_str())
    .bind(OutboundExecutionStatus::Pending.as_db_str())
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            ApiResponse::success(order.clone(), "出库订单确认成功"),
            "success",
            None,
        ),
        Err(sqlx::Error::RowNotFound) => (
            ApiResponse::conflict("出库订单状态已变化，确认未生效"),
            "conflict",
            None,
        ),
        Err(e) => {
            tracing::error!("确认出库订单失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("确认出库订单失败".to_string())),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<OutboundOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.outbound_orders SET
            status = $3, picking_status = $5, picking_start_time = $2, updated_at = $2
        WHERE id = $1 AND status = $4 AND picking_status = $6
          AND tenant_id = $7 AND deleted_at IS NULL
        RETURNING id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
                  customer_id, customer_name, created_at as order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, picking_status, packing_status, shipping_status, status, notes as remarks,
                  sales_order_id, sales_order_number, carrier, tracking_number,
                  picked_quantity, packed_quantity, shipped_quantity,
                  created_by, approved_by, approved_at,
                  created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .bind(OutboundStatus::Picking.as_db_str())
    .bind(OutboundStatus::Confirmed.as_db_str())
    .bind(OutboundExecutionStatus::InProgress.as_db_str())
    .bind(OutboundExecutionStatus::Pending.as_db_str())
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            ApiResponse::success(order.clone(), "开始拣货"),
            "success",
            None,
        ),
        Err(sqlx::Error::RowNotFound) => (
            ApiResponse::conflict("出库订单状态已变化，拣货未生效"),
            "conflict",
            None,
        ),
        Err(e) => {
            tracing::error!("开始拣货失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("开始拣货失败".to_string())),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<OutboundOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.outbound_orders SET
            status = $3, picking_status = $5, picking_end_time = $2,
            packing_status = $6, packing_start_time = $2,
            shipping_status = $7, updated_at = $2
        WHERE id = $1 AND status = $4
          AND picking_status = $8 AND packing_status = $9 AND shipping_status = $7
          AND tenant_id = $10 AND deleted_at IS NULL
        RETURNING id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
                  customer_id, customer_name, created_at as order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, picking_status, packing_status, shipping_status, status, notes as remarks,
                  sales_order_id, sales_order_number, carrier, tracking_number,
                  picked_quantity, packed_quantity, shipped_quantity,
                  created_by, approved_by, approved_at,
                  created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .bind(OutboundStatus::Packing.as_db_str())
    .bind(OutboundStatus::Picking.as_db_str())
    .bind(OutboundExecutionStatus::Completed.as_db_str())
    .bind(OutboundExecutionStatus::InProgress.as_db_str())
    .bind(OutboundExecutionStatus::Pending.as_db_str())
    .bind(OutboundExecutionStatus::InProgress.as_db_str())
    .bind(OutboundExecutionStatus::Pending.as_db_str())
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            ApiResponse::success(order.clone(), "开始打包"),
            "success",
            None,
        ),
        Err(sqlx::Error::RowNotFound) => (
            ApiResponse::conflict("出库订单状态已变化，打包未生效"),
            "conflict",
            None,
        ),
        Err(e) => {
            tracing::error!("开始打包失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("开始打包失败".to_string())),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(items): Json<Vec<ShipItemRequest>>,
) -> ApiResponse<serde_json::Value> {
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let request_data = serde_json::to_value(&items).ok();
    let now = Utc::now();

    // 释放请求级事务：库存扣减要在独立短事务内加行锁，且不能与请求事务
    // 叠加占用连接（并发压测 20 线程会打满连接池）。
    if let Err(e) = release_request_txn(&txn_arc).await {
        tracing::error!("释放请求事务失败: {}", e);
        return ApiResponse::server_error("事务释放失败");
    }

    let txn_timer = ShortTxnTimer::start("outbound.ship");
    let db = wms_db(&state.db);
    // wms-short-txn-exempt: W-06 出库发货独立短事务（连接 GUC 收敛防 RLS 误过滤；行锁边界；每请求连接占用见 m1-acceptance §10）
    let mut scope = match db.scope_for_tenant(tenant).await {
        // scope-exempt: short-txn-exempt
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启出库事务失败: {}", e);
            return ApiResponse::server_error("开启事务失败");
        }
    };
    if let Err(e) = arm_short_txn(&mut scope).await {
        tracing::error!("设置短事务 lock_timeout 失败: {}", e);
        let _ = scope.rollback().await;
        return ApiResponse::server_error("开启事务失败");
    }

    // 订单必须存在且处于可发货状态：不存在 → 404，状态不符 → 409。
    let order_status: Option<String> = match sqlx::query_scalar(only_own_schema_query!(
        "wms",
        r#"
        SELECT status FROM wms.outbound_orders
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        FOR UPDATE
        "#
    ))
    .bind(id)
    .bind(tenant)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("锁定出库订单失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("出库失败");
        }
    };
    let order_status = match order_status {
        Some(s) => s,
        None => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::ResourceNotFound("出库订单不存在".to_string()));
        }
    };
    if order_status != OutboundStatus::Shipping.as_db_str() {
        let _ = scope.rollback().await;
        return ApiResponse::conflict(&format!(
            "出库订单当前状态不允许发货（需先审批通过）: {}",
            order_status
        ));
    }

    // 拣货批次顺序：由 WMS 设置页 /settings/picking-sequence 落到 wms.picking_policy，
    // 这里真读真用；无配置时按有效期优先（原有行为）。
    let pick_strategy: String = match sqlx::query_scalar::<_, String>(only_own_schema_query!(
        "wms",
        "SELECT pick_strategy FROM wms.picking_policy WHERE tenant_id = $1::uuid AND deleted_at IS NULL LIMIT 1"
    ))
    .bind(tenant)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v.unwrap_or_else(|| "expiry_first".to_string()),
        Err(e) => {
            tracing::error!("读取拣货顺序策略失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("读取拣货顺序策略失败");
        }
    };

    for item in &items {
        if item.shipped_quantity <= 0.0 {
            let _ = scope.rollback().await;
            return ApiResponse::bad_request(&format!(
                "发货数量必须大于 0（明细 {}）",
                item.item_id
            ));
        }

        // 明细必须属于该单且同租户，并锁行；顺带取扣减谓词所需字段。
        let line: Option<(Uuid, String, String, Option<String>, f64, f64)> =
            match sqlx::query_as(only_own_schema_query!(
                "wms",
                r#"
                SELECT organization_id, material_code, material_name, batch_number,
                       requested_quantity::float8,
                       COALESCE(shipped_quantity, 0)::float8
                FROM wms.outbound_order_items
                WHERE id = $1 AND order_id = $2 AND tenant_id = $3 AND deleted_at IS NULL
                FOR UPDATE
                "#
            ))
            .bind(item.item_id)
            .bind(id)
            .bind(tenant)
            .fetch_optional(&mut scope)
            .await
            {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("锁定出库明细失败: {}", e);
                    let _ = scope.rollback().await;
                    return ApiResponse::server_error("出库失败");
                }
            };
        let (organization_id, material_code, material_name, batch_number, requested, shipped) =
            match line {
                Some(v) => v,
                None => {
                    let _ = scope.rollback().await;
                    return ApiResponse::not_found(&format!(
                        "出库明细不存在或不属于该订单: {}",
                        item.item_id
                    ));
                }
            };

        if shipped + item.shipped_quantity > requested + f64::EPSILON {
            let _ = scope.rollback().await;
            return ApiResponse::conflict(&format!(
                "发货数量超出应收：明细 {} 应收 {} 已发 {} 本次 {}",
                item.item_id, requested, shipped, item.shipped_quantity
            ));
        }

        let line_updated = sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            UPDATE wms.outbound_order_items SET
                shipped_quantity = COALESCE(shipped_quantity, 0) + $1,
                notes = COALESCE($2, notes),
                updated_at = $3
            WHERE id = $4 AND order_id = $5 AND tenant_id = $6 AND deleted_at IS NULL
            "#
        ))
        .bind(item.shipped_quantity)
        .bind(&item.remarks)
        .bind(now)
        .bind(item.item_id)
        .bind(id)
        .bind(tenant)
        .execute(&mut scope)
        .await;
        match line_updated {
            Ok(r) if r.rows_affected() == 1 => {}
            Ok(_) => {
                let _ = scope.rollback().await;
                return ApiResponse::conflict(&format!("出库明细状态已变化: {}", item.item_id));
            }
            Err(e) => {
                tracing::error!("更新出库明细失败: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::server_error("出库失败");
            }
        }

        // D3：一次只锁一行库存。
        // - 明细带批次时谓词强制 `batch_number = $4`，只可能命中该批次那一行；
        // - 明细无批次时按「最早到期 → created_at → id」取第一行（LIMIT 1），
        //   不再出现「同 org/material 的每个批次各扣一次」。
        // `FOR UPDATE` 在 READ COMMITTED 下会等锁并重判 `available_quantity >= $5`，
        // 因此并发扣减不会超卖。
        let stock_id: Option<Uuid> = match sqlx::query_scalar(only_own_schema_query!(
            "wms",
            r#"
            SELECT id FROM wms.inventory
            WHERE organization_id = $1
              AND material_code = $2
              AND tenant_id = $3
              AND deleted_at IS NULL
              AND ($4::varchar IS NULL OR batch_number = $4::varchar)
              AND available_quantity >= $5
            ORDER BY
                (CASE WHEN $6::text IN ('fifo', 'lifo') THEN NULL ELSE expiry_date END) NULLS LAST,
                (CASE WHEN $6::text = 'lifo' THEN created_at END) DESC,
                created_at ASC,
                id
            LIMIT 1
            FOR UPDATE
            "#
        ))
        .bind(organization_id)
        .bind(&material_code)
        .bind(tenant)
        .bind(batch_number.as_deref())
        .bind(item.shipped_quantity)
        .bind(&pick_strategy)
        .fetch_optional(&mut scope)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("锁定库存行失败: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::server_error("出库扣减库存失败");
            }
        };
        let stock_id = match stock_id {
            Some(v) => v,
            None => {
                tracing::warn!(
                    "出库发货可用库存不足: item_id={}, material_code={}, batch={:?}, 需扣减={}",
                    item.item_id,
                    material_code,
                    batch_number,
                    item.shipped_quantity
                );
                let _ = scope.rollback().await;
                return ApiResponse::from(TopemsError::BusinessLogic(format!(
                    "可用库存不足，无法出库（明细 {}，需 {}）",
                    item.item_id, item.shipped_quantity
                )));
            }
        };

        let deduct = sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            UPDATE wms.inventory SET
                quantity = quantity - $2,
                available_quantity = available_quantity - $2,
                updated_at = $3
            WHERE id = $1 AND tenant_id = $4 AND deleted_at IS NULL AND available_quantity >= $2
            "#
        ))
        .bind(stock_id)
        .bind(item.shipped_quantity)
        .bind(now)
        .bind(tenant)
        .execute(&mut scope)
        .await;
        match deduct {
            Ok(r) if r.rows_affected() == 1 => {}
            Ok(_) => {
                // 已锁行且已校验可用量，仍 0 行说明不变量被破坏，按 500 处理。
                tracing::error!(
                    "出库扣减 0 行（已锁定库存行）: stock_id={} item_id={}",
                    stock_id,
                    item.item_id
                );
                let _ = scope.rollback().await;
                return ApiResponse::server_error("出库扣减库存失败");
            }
            Err(e) => {
                tracing::error!("出库扣减库存失败: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::server_error("出库扣减库存失败");
            }
        }

        // V19.8: 出库发货时同步写入 inventory_movements（失败即回滚）
        let movement_no = movement_no(now);
        let movement_id = Uuid::new_v4();
        let movement = sqlx::query(only_own_schema_query!(
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
                NULL, $5, $6, $7,
                oo.source_location_id, NULL, o.warehouse_id, NULL,
                'completed', $8, $9, $8, $8
            FROM wms.outbound_order_items oo
            JOIN wms.outbound_orders o ON oo.order_id = o.id
            WHERE oo.id = $10 AND oo.tenant_id = $3
            "#
        ))
        .bind(movement_id)
        .bind(&movement_no)
        .bind(tenant)
        .bind(id.to_string())
        .bind(&material_code)
        .bind(&material_name)
        .bind(item.shipped_quantity)
        .bind(now)
        .bind(format!("出库发货：订单 {}", id))
        .bind(item.item_id)
        .execute(&mut scope)
        .await;
        match movement {
            Ok(r) if r.rows_affected() == 1 => {}
            Ok(_) => {
                tracing::error!("出库 movement 写入 0 行: item_id={}", item.item_id);
                let _ = scope.rollback().await;
                return ApiResponse::server_error("出库移动记录写入失败");
            }
            Err(e) => {
                tracing::error!("出库 movement 写入失败: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::server_error("出库移动记录写入失败");
            }
        }
    }

    let status_updated = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.outbound_orders SET
            status = $4, picking_status = $5, packing_status = $6,
            packing_end_time = $1::timestamptz, shipping_status = $7,
            actual_ship_date = date_trunc('day', $1::timestamptz AT TIME ZONE 'Asia/Shanghai')
                               AT TIME ZONE 'Asia/Shanghai',
            updated_at = $1::timestamptz
        WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL
          AND status = $4
          AND picking_status = $5 AND packing_status = $6 AND shipping_status = $7
        "#
    ))
    .bind(now)
    .bind(id)
    .bind(tenant)
    .bind(OutboundStatus::Shipping.as_db_str())
    .bind(OutboundExecutionStatus::Completed.as_db_str())
    .bind(OutboundExecutionStatus::Completed.as_db_str())
    .bind(OutboundExecutionStatus::InProgress.as_db_str())
    .execute(&mut scope)
    .await;
    match status_updated {
        Ok(r) if r.rows_affected() == 1 => {}
        Ok(_) => {
            let _ = scope.rollback().await;
            return ApiResponse::conflict("出库订单状态已变化，发货未生效");
        }
        Err(e) => {
            tracing::error!("更新出库订单状态失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::server_error("出库失败");
        }
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("出库事务提交失败: {}", e);
        return ApiResponse::server_error("出库操作失败");
    }
    txn_timer.finish();

    // 响应读取使用独立只读作用域（请求事务已释放）。
    // wms-short-txn-exempt: R-04 提交后只读回读（独立只读短事务，不占请求事务连接；见 m1-acceptance §10）
    let mut read_scope = match db.scope_read_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启出库只读作用域失败: {}", e);
            return ApiResponse::server_error("出库失败");
        }
    };

    let order_result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
               customer_id, customer_name, created_at as order_date, 
               expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
               total_value as total_amount, picking_status, packing_status, shipping_status, status, notes as remarks,
               sales_order_id, sales_order_number, carrier, tracking_number,
               picked_quantity, packed_quantity, shipped_quantity,
               created_by, approved_by, approved_at,
               created_at, updated_at
        FROM wms.outbound_orders WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#
    ))
    .bind(id)
    .bind(tenant)
    .fetch_one(&mut read_scope)
    .await;

    let (response, status_str, error_msg, response_data) = match order_result {
        Ok(order) => {
            // P3 事件驱动规范化：出库发货完成后按发货明细逐条发布 WmsInventoryItemShipped 事件，
            // 通知 SCM（销售履约）/Finance（成本结转）。
            // P1-9 修复：数量与物料以发货明细为准，禁止用订单金额(total_value/total_amount)填充；
            // payload 本身为库存项(item)级契约，逐条发射使下游按物料对账/周转统计可用。
            if let Some(ref publisher) = state.event_publisher {
                // 查询本次发货明细的真实物料字段。outbound_order_items 无 material_id 列，
                // 与既有 wms.inventory_movements 写入保持一致，material_id 置 None。
                let line_ids: Vec<Uuid> = items.iter().map(|i| i.item_id).collect();
                let line_rows = sqlx::query(only_own_schema_query!(
                    "wms",
                    r#"
                    SELECT id, material_code, material_name, unit
                    FROM wms.outbound_order_items
                    WHERE order_id = $1 AND id = ANY($2) AND tenant_id = $3 AND deleted_at IS NULL
                    "#
                ))
                .bind(id)
                .bind(&line_ids)
                .bind(tenant)
                .fetch_all(&mut read_scope)
                .await;

                let mut lines_by_id: std::collections::HashMap<Uuid, (String, String, String)> =
                    std::collections::HashMap::new();
                if let Ok(rows) = line_rows {
                    for row in rows {
                        let line_id: Uuid = row.try_get("id").unwrap_or_default();
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

                // 与请求中的发货数量配对：每条明细一个事件（真实数量 + 真实物料）。
                let events: Vec<(String, String, String, f64)> = items
                    .iter()
                    .filter_map(|req| {
                        let (code, name, unit) = lines_by_id.get(&req.item_id)?;
                        Some((
                            code.clone(),
                            name.clone(),
                            unit.clone(),
                            req.shipped_quantity,
                        ))
                    })
                    .collect();

                let publisher = publisher.clone();
                let outbound_id = order.id;
                let outbound_no = order.order_number.clone();
                let warehouse_id = order.warehouse_id;
                let customer_id = order.customer_id;
                let tenant_id = Some(order.tenant_id);
                let reference_order_id = Some(order.id);
                let shipped_at_val = order.actual_delivery.or_else(|| Some(Utc::now()));
                tokio::spawn(async move {
                    for (material_code, material_name, unit, quantity) in events {
                        let payload = WmsInventoryItemShippedPayload {
                            outbound_id,
                            outbound_no: outbound_no.clone(),
                            warehouse_id,
                            warehouse_name: None,
                            material_id: None,
                            material_code,
                            material_name,
                            quantity,
                            unit: Some(unit),
                            reference_order_id,
                            reference_order_no: None,
                            customer_id,
                            customer_name: None,
                            shipped_by: None,
                            shipped_at: shipped_at_val,
                            tenant_id,
                        };
                        // D6：业务写事务 tx.commit() 已成功（上），此处仅发布；失败入 ZSET 重试队列。
                        if let Err(e) = publisher
                            .publish_event(EventType::WmsInventoryItemShipped, payload.clone())
                            .await
                        {
                            tracing::warn!(
                                "[wms] WmsInventoryItemShipped 事件发布失败: {}，入重试队列",
                                e
                            );
                            commit_retry::push_retry_typed(
                                "wms",
                                EventType::WmsInventoryItemShipped,
                                &payload,
                            )
                            .await;
                        } else {
                            tracing::info!(
                                "[wms] WmsInventoryItemShipped 事件发布成功 - outbound_id={}, material_code={}, quantity={}",
                                outbound_id, payload.material_code, payload.quantity
                            );
                        }
                    }
                });
            }

            let order_json = serde_json::to_value(order.clone()).ok();
            (
                ApiResponse::success(
                    serde_json::json!({ "order": order, "message": "出库完成" }),
                    "出库成功",
                ),
                "success",
                None,
                order_json,
            )
        }
        Err(e) => {
            tracing::error!("获取出库订单失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("出库失败".to_string())),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<OutboundOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };
    let now = Utc::now();

    let result = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.outbound_orders SET
            status = $3, shipping_status = $5, delivery_date = $2::date, updated_at = $2::timestamptz
        WHERE id = $1 AND status = $4 AND shipping_status = $6
          AND tenant_id = $7 AND deleted_at IS NULL
        RETURNING id, organization_id as tenant_id, order_number, warehouse_id, warehouse_name,
                  customer_id, customer_name, created_at as order_date, 
                  expected_ship_date as expected_delivery, actual_ship_date as actual_delivery, 
                  total_value as total_amount, picking_status, packing_status, shipping_status, status, notes as remarks,
                  sales_order_id, sales_order_number, carrier, tracking_number,
                  picked_quantity, packed_quantity, shipped_quantity,
                  created_by, approved_by, approved_at,
                  created_at, updated_at
        "#
    ))
    .bind(id)
    .bind(now)
    .bind(OutboundStatus::Completed.as_db_str())
    .bind(OutboundStatus::Shipping.as_db_str())
    .bind(OutboundExecutionStatus::Completed.as_db_str())
    .bind(OutboundExecutionStatus::InProgress.as_db_str())
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            ApiResponse::success(order.clone(), "出库订单完成"),
            "success",
            None,
        ),
        Err(sqlx::Error::RowNotFound) => (
            ApiResponse::conflict("出库订单状态已变化，完成未生效"),
            "conflict",
            None,
        ),
        Err(e) => {
            tracing::error!("完成出库订单失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("完成出库订单失败".to_string())),
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundApprove).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

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
                return ApiResponse::bad_request("当前状态无需审批");
            }
            if let Err(e) = crate::models::audit_log::log_approval_event(
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
            .await
            {
                tracing::warn!("审计日志写入失败: {}", e);
            }
            ApiResponse::success(
                serde_json::json!({"status": current_status, "approval_started": true}),
                "审批启动成功",
            )
        }
        Err(e) => {
            tracing::error!("找不到出库单: {}", e);
            ApiResponse::not_found("出库单不存在")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundApprove).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

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
                return ApiResponse::bad_request("当前状态不允许审批通过");
            }
            let result = sqlx::query(only_own_schema_query!(
                "wms",
                r#"UPDATE wms.outbound_orders SET
                           status = $3, packing_status = $4, packing_end_time = NOW(),
                           shipping_status = $5, updated_at = NOW()
                       WHERE id = $1 AND tenant_id = $2 AND status = $6
                         AND picking_status = $8 AND packing_status = $7
                         AND deleted_at IS NULL
                       RETURNING *"#
            ))
            .bind(id)
            .bind(tenant_id)
            .bind(OutboundStatus::Shipping.as_db_str())
            .bind(OutboundExecutionStatus::Completed.as_db_str())
            .bind(OutboundExecutionStatus::InProgress.as_db_str())
            .bind(OutboundStatus::Packing.as_db_str())
            .bind(OutboundExecutionStatus::InProgress.as_db_str())
            .bind(OutboundExecutionStatus::Completed.as_db_str())
            .fetch_optional(&mut **txn)
            .await;
            match result {
                Ok(Some(_r)) => {
                    if let Err(e) = crate::models::audit_log::log_approval_event(
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
                    .await
                    {
                        tracing::warn!("审计日志写入失败: {}", e);
                    }
                    if let Some(t) = guard.take() {
                        if let Err(e) = t.commit().await {
                            tracing::error!("事务提交失败: {}", e);
                            return ApiResponse::server_error("事务提交失败");
                        }
                    }
                    ApiResponse::success(
                        serde_json::json!({"id": id, "status": "shipping"}),
                        "审批通过",
                    )
                }
                Ok(_) => ApiResponse::conflict("出库订单状态已变化，审批通过未生效"),
                Err(e) => {
                    tracing::error!("审批出库单失败: {}", e);
                    ApiResponse::server_error("审批失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("找不到出库单: {}", e);
            ApiResponse::not_found("出库单不存在")
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
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::OutboundApprove).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

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
                return ApiResponse::bad_request("当前状态不允许驳回回流");
            }
            let result = sqlx::query(only_own_schema_query!(
                "wms",
                r#"UPDATE wms.outbound_orders SET
                           status = $3, picking_status = $4, packing_status = $5,
                           packing_end_time = NULL, shipping_status = $6, updated_at = NOW()
                       WHERE id = $1 AND tenant_id = $2 AND status = $7
                         AND picking_status = $8 AND packing_status = $9
                         AND deleted_at IS NULL
                       RETURNING *"#
            ))
            .bind(id)
            .bind(tenant_id)
            .bind(OutboundStatus::Picking.as_db_str())
            .bind(OutboundExecutionStatus::InProgress.as_db_str())
            .bind(OutboundExecutionStatus::Pending.as_db_str())
            .bind(OutboundExecutionStatus::Pending.as_db_str())
            .bind(OutboundStatus::Packing.as_db_str())
            .bind(OutboundExecutionStatus::Completed.as_db_str())
            .bind(OutboundExecutionStatus::InProgress.as_db_str())
            .fetch_optional(&mut **txn)
            .await;
            match result {
                Ok(Some(_r)) => {
                    if let Err(e) = crate::models::audit_log::log_approval_event(
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
                    .await
                    {
                        tracing::warn!("审计日志写入失败: {}", e);
                    }
                    if let Some(t) = guard.take() {
                        if let Err(e) = t.commit().await {
                            tracing::error!("事务提交失败: {}", e);
                            return ApiResponse::server_error("事务提交失败");
                        }
                    }
                    ApiResponse::success(
                        serde_json::json!({"id": id, "status": "picking"}),
                        "审批驳回，回流至 picking",
                    )
                }
                Ok(_) => ApiResponse::conflict("出库订单状态已变化，驳回未生效"),
                Err(e) => {
                    tracing::error!("驳回收料单失败: {}", e);
                    ApiResponse::server_error("驳回失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("找不到出库单: {}", e);
            ApiResponse::not_found("出库单不存在")
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
            unit_price: rust_decimal::Decimal::from_f64_retain(15.5),
            remarks: Some("测试备注".to_string()),
        };
        let json = serde_json::to_value(&item).unwrap();
        assert_eq!(json["line_number"], 1);
        assert_eq!(json["material_code"], "MAT001");
        assert_eq!(json["material_name"], "测试物料");
        assert_eq!(json["material_type"], "finished_goods");
        assert_eq!(json["requested_quantity"], 100.0);
        assert_eq!(json["unit"], "PCS");
        assert_eq!(json["unit_price"], "15.5");
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
        assert_eq!(item.unit_price, Some(rust_decimal::Decimal::new(25, 0)));
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
