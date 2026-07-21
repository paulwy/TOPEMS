use axum::{
    extract::{Path, State},
    routing::post,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::models::OutboundOrder;
use crate::modules::ApiState;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Deserialize, Serialize)]
pub struct OutboundToShippingRequest {
    pub outbound_order_id: String,
    pub customer_id: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ShippingSyncResult {
    pub success: bool,
    pub message: String,
    pub outbound_order_id: Option<Uuid>,
    pub shipping_order_id: Option<Uuid>,
    pub shipping_order_number: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncLogsRequest {
    pub sync_type: Option<String>,
    pub status: Option<String>,
    pub source_module: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: axum::extract::FromRef<S>,
{
    Router::new()
        .route("/sync/outbound-to-shipping", post(outbound_to_shipping))
        .route(
            "/sync/outbound-order/{id}/to-shipping",
            post(create_shipping_from_outbound),
        )
        .route("/sync/inbound-from-scm", post(create_inbound_from_scm))
        .route("/sync/sync-logs", post(get_sync_logs))
}

pub async fn outbound_to_shipping(
    State(state): State<ApiState>,
    Json(req): Json<OutboundToShippingRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let outbound_order_id = match Uuid::parse_str(&req.outbound_order_id) {
        Ok(id) => id,
        Err(_) => {
            return Json(ApiResponse::success(
                serde_json::json!({
                    "success": false,
                    "message": "出库单ID格式错误".to_string(),
                    "outbound_order_id": null,
                    "shipping_order_id": null,
                    "shipping_order_number": null,
                }),
                "出库单ID格式错误",
            ));
        }
    };

    let customer_id = req
        .customer_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    create_shipping_from_outbound_internal(&state, outbound_order_id, customer_id, req.remarks)
        .await
}

pub async fn create_shipping_from_outbound(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    create_shipping_from_outbound_internal(&state, id, None, None).await
}

pub async fn create_shipping_from_outbound_internal(
    state: &ApiState,
    outbound_order_id: Uuid,
    customer_id: Option<Uuid>,
    _remarks: Option<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let outbound_order = sqlx::query_as::<_, OutboundOrder>(
        r#"
        SELECT id, order_number, warehouse_id, customer_id, order_date, expected_delivery, 
               actual_delivery, total_amount, status, remarks, created_at, updated_at
        FROM plugin_wms.outbound_orders
        WHERE id = $1 AND status = 'confirmed'
        "#,
    )
    .bind(outbound_order_id)
    .fetch_optional(&state.db)
    .await;

    let outbound_order = match outbound_order {
        Ok(Some(oo)) => oo,
        Ok(None) => {
            return Json(ApiResponse::success(
                serde_json::json!({
                    "success": false,
                    "message": "出库单不存在或状态不是已确认".to_string(),
                    "outbound_order_id": outbound_order_id,
                    "shipping_order_id": null,
                    "shipping_order_number": null,
                }),
                "出库单不存在或状态不是已确认",
            ));
        }
        Err(e) => {
            tracing::error!("查询出库单失败: {}", e);
            return Json(api_error(500, "查询出库单失败"));
        }
    };

    let existing_shipping = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM plugin_crm.sales_orders
        WHERE order_number = $1
        "#,
    )
    .bind(&outbound_order.order_number)
    .fetch_one(&state.db)
    .await;

    if existing_shipping.unwrap_or(0) > 0 {
        return Json(ApiResponse::success(
            serde_json::json!({
                "success": false,
                "message": "该出库单已创建销售订单".to_string(),
                "outbound_order_id": outbound_order_id,
                "shipping_order_id": null,
                "shipping_order_number": null,
            }),
            "该出库单已创建销售订单",
        ));
    }

    let shipping_id = Uuid::new_v4();
    let now = Utc::now();
    let shipping_order_number = format!("SHP-{}", outbound_order.order_number);

    let result = sqlx::query(
        r#"
        INSERT INTO plugin_crm.sales_orders (id, order_number, customer_id, order_date, 
                                             total_amount, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
        "#,
    )
    .bind(shipping_id)
    .bind(&shipping_order_number)
    .bind(customer_id.or(outbound_order.customer_id))
    .bind(outbound_order.order_date)
    .bind(outbound_order.total_amount)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => {
            let _ = sqlx::query(
                r#"
                UPDATE plugin_wms.outbound_orders 
                SET status = 'shipped', sales_order_id = $2, 
                    sales_order_number = $3, is_synced_to_crm = TRUE, updated_at = $4
                WHERE id = $1
                "#,
            )
            .bind(outbound_order_id)
            .bind(shipping_id)
            .bind(&shipping_order_number)
            .bind(now)
            .execute(&state.db)
            .await;

            let _ = record_sync_log(
                &state,
                "outbound_to_shipping",
                "wms",
                "crm",
                "outbound_order",
                outbound_order_id,
                &outbound_order.order_number,
                Some(shipping_id),
                &shipping_order_number,
                "create",
                "success",
                None,
                0,
            )
            .await;

            Json(ApiResponse::success(
                serde_json::json!({
                    "success": true,
                    "message": "销售订单创建成功".to_string(),
                    "outbound_order_id": outbound_order_id,
                    "shipping_order_id": shipping_id,
                    "shipping_order_number": shipping_order_number,
                }),
                "出库单转销售订单成功",
            ))
        }
        Err(e) => {
            tracing::error!("创建销售订单失败: {}", e);
            let _ = record_sync_log(
                &state,
                "outbound_to_shipping",
                "wms",
                "crm",
                "outbound_order",
                outbound_order_id,
                &outbound_order.order_number,
                None,
                "",
                "create",
                "failed",
                Some(e.to_string()),
                0,
            )
            .await;
            Json(api_error(500, "创建销售订单失败"))
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct InboundFromScmRequest {
    pub purchase_order_id: String,
}

pub async fn create_inbound_from_scm(
    State(state): State<ApiState>,
    Json(req): Json<InboundFromScmRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let purchase_order_id = match Uuid::parse_str(&req.purchase_order_id) {
        Ok(id) => id,
        Err(_) => {
            return Json(ApiResponse::success(
                serde_json::json!({
                    "success": false,
                    "message": "采购订单ID格式错误".to_string(),
                }),
                "采购订单ID格式错误",
            ));
        }
    };

    let purchase_order = sqlx::query(
        r#"
        SELECT id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks
        FROM plugin_scm.purchase_orders
        WHERE id = $1 AND status = 'approved'
        "#,
    )
    .bind(purchase_order_id)
    .fetch_optional(&state.db)
    .await;

    let (_po_id, po_number, po_supplier_id) = match purchase_order {
        Ok(Some(row)) => (
            row.get::<Uuid, _>("id"),
            row.get::<String, _>("order_number"),
            row.get::<Option<Uuid>, _>("supplier_id"),
        ),
        Ok(None) => {
            return Json(ApiResponse::success(
                serde_json::json!({
                    "success": false,
                    "message": "采购订单不存在或状态不是已批准".to_string(),
                }),
                "采购订单不存在或状态不是已批准",
            ));
        }
        Err(e) => {
            tracing::error!("查询采购订单失败: {}", e);
            return Json(api_error(500, "查询采购订单失败"));
        }
    };

    let inbound_id = Uuid::new_v4();
    let now = Utc::now();
    let inbound_order_number = format!("WMS-INB-{}", po_number);

    let result = sqlx::query(
        r#"
        INSERT INTO plugin_wms.inbound_orders (id, order_number, supplier_id, 
                                              order_type, status, created_at, updated_at)
        VALUES ($1, $2, $3, 'purchase', 'pending', $4, $5)
        "#,
    )
    .bind(inbound_id)
    .bind(&inbound_order_number)
    .bind(po_supplier_id)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => {
            let _ = record_sync_log(
                &state,
                "purchase_to_inbound",
                "scm",
                "wms",
                "purchase_order",
                purchase_order_id,
                &po_number,
                Some(inbound_id),
                &inbound_order_number,
                "create",
                "success",
                None,
                0,
            )
            .await;

            Json(ApiResponse::success(
                serde_json::json!({
                    "success": true,
                    "message": "入库单创建成功".to_string(),
                    "purchase_order_id": purchase_order_id,
                    "inbound_order_id": inbound_id,
                    "inbound_order_number": inbound_order_number,
                }),
                "从SCM同步采购订单创建入库单成功",
            ))
        }
        Err(e) => {
            tracing::error!("创建入库单失败: {}", e);
            Json(api_error(500, "创建入库单失败"))
        }
    }
}

pub async fn get_sync_logs(
    State(state): State<ApiState>,
    Json(req): Json<SyncLogsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = req.page.unwrap_or(1).max(1);
    let page_size = req.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let rows = sqlx::query(
        r#"
        SELECT id, tenant_id, sync_type, source_module, target_module, source_entity,
               source_id, source_code, target_id, target_code, operation, status,
               error_message, retry_count, executed_at, created_at
        FROM unified_core.inter_module_sync
        WHERE ($1::text IS NULL OR sync_type = $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR source_module = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&req.sync_type)
    .bind(&req.status)
    .bind(&req.source_module)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match rows {
        Ok(rows) => {
            let logs: Vec<serde_json::Value> = rows
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.get::<Uuid, _>("id"),
                        "tenant_id": row.get::<Uuid, _>("tenant_id"),
                        "sync_type": row.get::<String, _>("sync_type"),
                        "source_module": row.get::<String, _>("source_module"),
                        "target_module": row.get::<String, _>("target_module"),
                        "source_entity": row.get::<String, _>("source_entity"),
                        "source_id": row.get::<Option<Uuid>, _>("source_id"),
                        "source_code": row.get::<Option<String>, _>("source_code"),
                        "target_id": row.get::<Option<Uuid>, _>("target_id"),
                        "target_code": row.get::<Option<String>, _>("target_code"),
                        "operation": row.get::<String, _>("operation"),
                        "status": row.get::<String, _>("status"),
                        "error_message": row.get::<Option<String>, _>("error_message"),
                        "retry_count": row.get::<i32, _>("retry_count"),
                        "executed_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("executed_at"),
                        "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
                    })
                })
                .collect();
            Json(ApiResponse::success(
                serde_json::json!({ "logs": logs }),
                "同步日志查询成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询同步日志失败: {}", e);
            Json(api_error(500, "查询同步日志失败"))
        }
    }
}

pub async fn record_sync_log(
    state: &ApiState,
    sync_type: &str,
    source_module: &str,
    target_module: &str,
    source_entity: &str,
    source_id: Uuid,
    source_code: &str,
    target_id: Option<Uuid>,
    target_code: &str,
    operation: &str,
    status: &str,
    error_message: Option<String>,
    retry_count: i32,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        r#"
        INSERT INTO unified_core.inter_module_sync 
            (tenant_id, sync_type, source_module, target_module, source_entity,
             source_id, source_code, target_id, target_code, operation, status,
             error_message, retry_count, max_retries, executed_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        "#,
    )
    .bind(Uuid::from_u128(1))
    .bind(sync_type)
    .bind(source_module)
    .bind(target_module)
    .bind(source_entity)
    .bind(source_id)
    .bind(source_code)
    .bind(target_id)
    .bind(target_code)
    .bind(operation)
    .bind(status)
    .bind(error_message)
    .bind(retry_count)
    .bind(3)
    .bind(Utc::now())
    .bind(Utc::now())
    .execute(&state.db)
    .await?;
    Ok(())
}
