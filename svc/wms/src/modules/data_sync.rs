use axum::{
    extract::{Extension, Path, State},
    routing::post,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use crate::models::OutboundOrder;
use crate::modules::ApiState;
use topems_shared_core::response::{api_error, ApiResponse};
use topems_shared_event::event::ShippingOrderRequestedPayload;

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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/sync/outbound-to-shipping",
    tag = "data_sync",
    operation_id = "outbound_to_shipping",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn outbound_to_shipping(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<OutboundToShippingRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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

    let _resp = create_shipping_from_outbound_internal(
        &state,
        outbound_order_id,
        customer_id,
        req.remarks,
        &mut *txn,
    )
    .await;
    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return Json(ApiResponse::error(500, "事务提交失败"));
        }
    }
    _resp
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:outbound:write"])),
    path = "/sync/outbound-order/{id}/to-shipping",
    tag = "data_sync",
    operation_id = "create_shipping_from_outbound",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_shipping_from_outbound(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let _resp = create_shipping_from_outbound_internal(&state, id, None, None, &mut *txn).await;
    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return Json(ApiResponse::error(500, "事务提交失败"));
        }
    }
    _resp
}

pub async fn create_shipping_from_outbound_internal(
    state: &ApiState,
    outbound_order_id: Uuid,
    customer_id: Option<Uuid>,
    _remarks: Option<String>,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
) -> Json<ApiResponse<serde_json::Value>> {
    let outbound_order = sqlx::query_as::<_, OutboundOrder>(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, order_number, warehouse_id, customer_id, order_date, expected_delivery, 
               actual_delivery, total_amount, status, remarks, created_at, updated_at
        FROM wms.outbound_orders
        WHERE id = $1 AND status = 'confirmed'
        "#,
        "wms"
    ))
    .bind(outbound_order_id)
    .fetch_optional(&mut **txn)
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

    if outbound_order.sales_order_id.is_some() {
        return Json(ApiResponse::success(
            serde_json::json!({
                "success": false,
                "message": "该出库单已创建销售订单".to_string(),
                "outbound_order_id": outbound_order_id,
                "shipping_order_id": outbound_order.sales_order_id,
                "shipping_order_number": outbound_order.sales_order_number,
            }),
            "该出库单已创建销售订单",
        ));
    }

    let shipping_id = Uuid::new_v4();
    let now = Utc::now();
    let shipping_order_number = format!("SHP-{}", outbound_order.order_number);

    let tenant_id: Option<Uuid> =
        sqlx::query_scalar("SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid")
            .fetch_optional(&mut **txn)
            .await
            .ok()
            .flatten();
    let payload = ShippingOrderRequestedPayload {
        outbound_order_id,
        outbound_order_number: outbound_order.order_number.clone(),
        customer_id: customer_id.or(outbound_order.customer_id),
        order_date: outbound_order.order_date,
        total_amount: outbound_order.total_amount.unwrap_or(0.0),
        shipping_id,
        shipping_order_number: shipping_order_number.clone(),
        requested_at: now,
        tenant_id,
    };

    if let Some(ref publisher) = state.event_publisher {
        match publisher
            .publish_shipping_order_requested(payload.clone())
            .await
        {
            Ok(_) => {
                tracing::info!(
                    "[wms] 发布 ShippingOrderRequested 事件成功 - outbound_order_id={}, shipping_id={}, shipping_order_number={}",
                    outbound_order_id, shipping_id, shipping_order_number
                );
            }
            Err(e) => {
                tracing::error!(
                    "[wms] 发布 ShippingOrderRequested 事件失败: {}，将改为直接更新",
                    e
                );
            }
        }
    }

    let _ = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.outbound_orders 
        SET status = 'shipped', sales_order_id = $2, 
            sales_order_number = $3, is_synced_to_crm = TRUE, updated_at = $4
        WHERE id = $1
        "#,
        "wms"
    ))
    .bind(outbound_order_id)
    .bind(shipping_id)
    .bind(&shipping_order_number)
    .bind(now)
    .execute(&mut **txn)
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
        &mut *txn,
    )
    .await;

    Json(ApiResponse::success(
        serde_json::json!({
            "success": true,
            "message": "出库单转销售订单事件已发布，CRM将异步创建销售订单".to_string(),
            "outbound_order_id": outbound_order_id,
            "shipping_order_id": shipping_id,
            "shipping_order_number": shipping_order_number,
        }),
        "出库单转销售订单事件发布成功",
    ))
}

#[derive(Debug, Deserialize, Serialize)]
pub struct InboundFromScmRequest {
    pub purchase_order_id: String,
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:inbound:write"])),
    path = "/sync/inbound-from-scm",
    tag = "data_sync",
    operation_id = "create_inbound_from_scm",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_inbound_from_scm(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<InboundFromScmRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
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

    let purchase_order = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        SELECT id, order_number, supplier_id, total_amount, status
        FROM wms.purchase_order_snapshots
        WHERE id = $1 AND status = 'approved'
        "#,
        "wms"
    ))
    .bind(purchase_order_id)
    .fetch_optional(&mut **txn)
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

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        INSERT INTO wms.inbound_orders (id, order_number, supplier_id, 
                                              order_type, status, created_at, updated_at)
        VALUES ($1, $2, $3, 'purchase', 'pending', $4, $5)
        "#,
        "wms"
    ))
    .bind(inbound_id)
    .bind(&inbound_order_number)
    .bind(po_supplier_id)
    .bind(now)
    .bind(now)
    .execute(&mut **txn)
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
                &mut *txn,
            )
            .await;

            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return Json(ApiResponse::error(500, "事务提交失败"));
                }
            }
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:write"])),
    path = "/sync/sync-logs",
    tag = "data_sync",
    operation_id = "get_sync_logs",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_sync_logs(
    State(_state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<SyncLogsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = req.page.unwrap_or(1).max(1);
    let page_size = req.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let rows = sqlx::query(only_own_schema_query!(
        "wms",
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
        "#
    ))
    .bind(&req.sync_type)
    .bind(&req.status)
    .bind(&req.source_module)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
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
    _state: &ApiState,
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
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
) -> Result<(), sqlx::Error> {
    sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        INSERT INTO unified_core.inter_module_sync 
            (tenant_id, sync_type, source_module, target_module, source_entity,
             source_id, source_code, target_id, target_code, operation, status,
             error_message, retry_count, max_retries, executed_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        "#
    ))
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
    .execute(&mut **txn)
    .await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_outbound_to_shipping_request_serialization() {
        let request = OutboundToShippingRequest {
            outbound_order_id: "OUT001".to_string(),
            customer_id: Some("CUST001".to_string()),
            remarks: Some("加急发货".to_string()),
        };
        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["outbound_order_id"], "OUT001");
        assert_eq!(json["customer_id"], "CUST001");
        assert_eq!(json["remarks"], "加急发货");
    }

    #[test]
    fn test_outbound_to_shipping_request_minimal() {
        let request = OutboundToShippingRequest {
            outbound_order_id: "OUT002".to_string(),
            customer_id: None,
            remarks: None,
        };
        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["outbound_order_id"], "OUT002");
        assert!(json["customer_id"].is_null());
        assert!(json["remarks"].is_null());
    }

    #[test]
    fn test_outbound_to_shipping_request_deserialize() {
        let json = r#"{
            "outbound_order_id": "OUT003",
            "customer_id": "CUST002",
            "remarks": "测试同步"
        }"#;
        let request: OutboundToShippingRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.outbound_order_id, "OUT003");
        assert_eq!(request.customer_id.as_deref(), Some("CUST002"));
        assert_eq!(request.remarks.as_deref(), Some("测试同步"));
    }

    #[test]
    fn test_shipping_sync_result_serialization() {
        let result = ShippingSyncResult {
            success: true,
            message: "同步成功".to_string(),
            outbound_order_id: Some(Uuid::nil()),
            shipping_order_id: Some(Uuid::nil()),
            shipping_order_number: Some("SHP001".to_string()),
        };
        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["success"], true);
        assert_eq!(json["message"], "同步成功");
        assert_eq!(json["shipping_order_number"], "SHP001");
    }

    #[test]
    fn test_shipping_sync_result_failure() {
        let result = ShippingSyncResult {
            success: false,
            message: "同步失败".to_string(),
            outbound_order_id: None,
            shipping_order_id: None,
            shipping_order_number: None,
        };
        let json = serde_json::to_value(&result).unwrap();
        assert_eq!(json["success"], false);
        assert_eq!(json["message"], "同步失败");
        assert!(json["outbound_order_id"].is_null());
        assert!(json["shipping_order_id"].is_null());
        assert!(json["shipping_order_number"].is_null());
    }

    #[test]
    fn test_sync_logs_request_deserialize() {
        let query = "sync_type=outbound&status=success&source_module=wms";
        let params: SyncLogsRequest = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.sync_type.as_deref(), Some("outbound"));
        assert_eq!(params.status.as_deref(), Some("success"));
        assert_eq!(params.source_module.as_deref(), Some("wms"));
    }

    #[test]
    fn test_sync_logs_request_default() {
        let query = "";
        let params: SyncLogsRequest = serde_urlencoded::from_str(query).unwrap();
        assert!(params.sync_type.is_none());
        assert!(params.status.is_none());
        assert!(params.source_module.is_none());
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
    }

    #[test]
    fn test_inbound_from_scm_request_serialization() {
        let request = InboundFromScmRequest {
            purchase_order_id: "PO001".to_string(),
        };
        let json = serde_json::to_value(&request).unwrap();
        assert_eq!(json["purchase_order_id"], "PO001");
    }

    #[test]
    fn test_inbound_from_scm_request_deserialize() {
        let json = r#"{"purchase_order_id": "PO002"}"#;
        let request: InboundFromScmRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.purchase_order_id, "PO002");
    }
}
