use axum::{
    extract::{Path, State},
    routing::post,
    Json, Router,
};
use chrono::{Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgRow, Row};
use uuid::Uuid;

use super::ApiState;
use crate::models::PurchaseOrder;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Deserialize, Serialize)]
pub struct PurchaseToInboundRequest {
    pub purchase_order_id: String,
    pub warehouse_id: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncResult {
    pub success: bool,
    pub message: String,
    pub purchase_order_id: Option<Uuid>,
    pub inbound_order_id: Option<Uuid>,
    pub inbound_order_number: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncSupplierRequest {
    pub supplier_id: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RetryFailedRequest {
    pub sync_type: Option<String>,
    pub max_retries: Option<i32>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncStatistics {
    pub total_syncs: i64,
    pub success_count: i64,
    pub failed_count: i64,
    pub pending_count: i64,
    pub in_progress_count: i64,
    pub retry_needed_count: i64,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct BatchSyncResult {
    pub total_count: usize,
    pub success_count: usize,
    pub failed_count: usize,
    pub retry_count: usize,
    pub errors: Vec<SyncErrorDetail>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncErrorDetail {
    pub source_id: String,
    pub source_code: Option<String>,
    pub error: String,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/scm/sync/purchase-to-inbound",
            post(purchase_to_inbound),
        )
        .route(
            "/api/scm/sync/purchase-order/{id}/to-inbound",
            post(create_inbound_from_purchase),
        )
        .route(
            "/api/scm/sync/supplier-from-srm",
            post(sync_supplier_from_srm),
        )
        .route(
            "/api/scm/sync/suppliers-from-srm",
            post(sync_all_suppliers_from_srm),
        )
        .route("/api/scm/sync/retry-failed", post(retry_failed_syncs))
        .route("/api/scm/sync/statistics", post(get_sync_statistics))
        .route("/api/scm/sync/sync-logs", post(get_sync_logs))
        .route(
            "/api/scm/sync/purchase-batch",
            post(batch_sync_purchase_to_wms),
        )
        .route("/api/scm/sync/consistency-check", post(check_consistency))
}

async fn purchase_to_inbound(
    State(state): State<ApiState>,
    Json(req): Json<PurchaseToInboundRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let purchase_order_id = match Uuid::parse_str(&req.purchase_order_id) {
        Ok(id) => id,
        Err(_) => {
            return Json(ApiResponse::success(
                serde_json::json!({
                    "success": false,
                    "message": "采购订单ID格式错误".to_string(),
                    "purchase_order_id": null,
                    "inbound_order_id": null,
                    "inbound_order_number": null,
                }),
                "采购订单ID格式错误",
            ));
        }
    };

    let warehouse_id = req
        .warehouse_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    create_inbound_from_purchase_internal(&state, purchase_order_id, warehouse_id, req.remarks)
        .await
}

async fn create_inbound_from_purchase(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    create_inbound_from_purchase_internal(&state, id, None, None).await
}

async fn create_inbound_from_purchase_internal(
    state: &ApiState,
    purchase_order_id: Uuid,
    warehouse_id: Option<Uuid>,
    remarks: Option<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    let purchase_order = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        SELECT id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at
        FROM scm.purchase_orders
        WHERE id = $1 AND status = 'approved'
        "#,
    )
    .bind(purchase_order_id)
    .fetch_optional(&state.db)
    .await;

    let purchase_order = match purchase_order {
        Ok(Some(po)) => po,
        Ok(None) => {
            let _ = record_sync_log(
                state,
                "purchase_to_inbound",
                "scm",
                "wms",
                "purchase_order",
                purchase_order_id,
                "",
                None,
                "",
                "create",
                "failed",
                Some("采购订单不存在或状态不是已批准".to_string()),
                0,
            )
            .await;
            return Json(ApiResponse::success(
                serde_json::json!({
                    "success": false,
                    "message": "采购订单不存在或状态不是已批准".to_string(),
                    "purchase_order_id": purchase_order_id,
                    "inbound_order_id": null,
                    "inbound_order_number": null,
                }),
                "采购订单不存在或状态不是已批准",
            ));
        }
        Err(e) => {
            tracing::error!("查询采购订单失败: {}", e);
            let _ = record_sync_log(
                state,
                "purchase_to_inbound",
                "scm",
                "wms",
                "purchase_order",
                purchase_order_id,
                "",
                None,
                "",
                "create",
                "failed",
                Some(format!("查询采购订单失败: {}", e)),
                0,
            )
            .await;
            return Json(api_error(500, "查询采购订单失败"));
        }
    };

    let existing_inbound = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*) FROM wms.inbound_orders
        WHERE order_number = $1
        "#,
    )
    .bind(&purchase_order.order_number)
    .fetch_one(&state.db)
    .await;

    if existing_inbound.unwrap_or(0) > 0 {
        let _ = record_sync_log(
            state,
            "purchase_to_inbound",
            "scm",
            "wms",
            "purchase_order",
            purchase_order_id,
            &purchase_order.order_number,
            None,
            "",
            "create",
            "success",
            Some("该采购订单已创建入库单".to_string()),
            0,
        )
        .await;
        return Json(ApiResponse::success(
            serde_json::json!({
                "success": false,
                "message": "该采购订单已创建入库单".to_string(),
                "purchase_order_id": purchase_order_id,
                "inbound_order_id": null,
                "inbound_order_number": null,
            }),
            "该采购订单已创建入库单",
        ));
    }

    let inbound_id = Uuid::new_v4();
    let now = Utc::now();
    let inbound_order_number = format!("INB-{}", purchase_order.order_number);

    let result = sqlx::query(
        r#"
        INSERT INTO wms.inbound_orders (id, order_number, warehouse_id, supplier_id, 
                                      order_type, status, received_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'purchase', 'pending', NULL, $5, $6)
        "#,
    )
    .bind(inbound_id)
    .bind(&inbound_order_number)
    .bind(warehouse_id)
    .bind(purchase_order.supplier_id)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => {
            let _ = sqlx::query(
                r#"
                UPDATE scm.purchase_orders 
                SET status = 'in_transit', inbound_order_id = $2, 
                    inbound_order_number = $3, is_synced_to_wms = TRUE, 
                    sync_retry_count = 0, sync_error = NULL, last_sync_at = $4,
                    updated_at = $4
                WHERE id = $1
                "#,
            )
            .bind(purchase_order_id)
            .bind(inbound_id)
            .bind(&inbound_order_number)
            .bind(now)
            .execute(&state.db)
            .await;

            let _ = record_sync_log(
                state,
                "purchase_to_inbound",
                "scm",
                "wms",
                "purchase_order",
                purchase_order_id,
                &purchase_order.order_number,
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
                "采购订单转入库单成功",
            ))
        }
        Err(e) => {
            tracing::error!("创建入库单失败: {}", e);

            let retry_count = get_retry_count(state, purchase_order_id).await.unwrap_or(0);
            let new_retry_count = retry_count + 1;
            let max_retries = 3;

            let status = if new_retry_count >= max_retries {
                "failed"
            } else {
                "pending"
            };

            let next_retry_at = if new_retry_count < max_retries {
                Some(now + Duration::seconds((new_retry_count as i64 * 60 * 2).into()))
            } else {
                None
            };

            let _ = sqlx::query(
                r#"
                UPDATE scm.purchase_orders 
                SET sync_error = $2, sync_retry_count = $3, last_sync_at = $4, updated_at = $4
                WHERE id = $1
                "#,
            )
            .bind(purchase_order_id)
            .bind(e.to_string())
            .bind(new_retry_count)
            .bind(now)
            .execute(&state.db)
            .await;

            let _ = record_sync_log(
                state,
                "purchase_to_inbound",
                "scm",
                "wms",
                "purchase_order",
                purchase_order_id,
                &purchase_order.order_number,
                None,
                "",
                "create",
                status,
                Some(e.to_string()),
                new_retry_count,
            )
            .await;

            if new_retry_count < max_retries {
                Json(ApiResponse::success(
                    serde_json::json!({
                        "success": false,
                        "message": format!("创建入库单失败，将在 {} 秒后重试 (第 {} 次)", new_retry_count * 120, new_retry_count),
                        "purchase_order_id": purchase_order_id,
                        "inbound_order_id": null,
                        "inbound_order_number": null,
                        "retry_count": new_retry_count,
                        "next_retry_at": next_retry_at,
                    }),
                    "创建入库单失败，将重试",
                ))
            } else {
                Json(api_error(500, "创建入库单失败，已达到最大重试次数"))
            }
        }
    }
}

async fn get_retry_count(state: &ApiState, purchase_order_id: Uuid) -> Result<i32, sqlx::Error> {
    let count: Option<i32> =
        sqlx::query_scalar("SELECT sync_retry_count FROM scm.purchase_orders WHERE id = $1")
            .bind(purchase_order_id)
            .fetch_optional(&state.db)
            .await?;

    Ok(count.unwrap_or(0))
}

async fn sync_supplier_from_srm(
    State(state): State<ApiState>,
    Json(req): Json<SyncSupplierRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let supplier_id = match Uuid::parse_str(&req.supplier_id) {
        Ok(id) => id,
        Err(_) => {
            return Json(ApiResponse::success(
                serde_json::json!({
                    "success": false,
                    "message": "供应商ID格式错误".to_string(),
                    "supplier_id": null,
                    "action": "none",
                }),
                "供应商ID格式错误",
            ));
        }
    };

    let srm_supplier = sqlx::query_as::<
        _,
        (
            Uuid,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            String,
        ),
    >(
        r#"
        SELECT id, name, legal_name, contact_person, phone, email, address, tax_id, website, status
        FROM srm.suppliers
        WHERE id = $1 AND status != 'deleted'
        "#,
    )
    .bind(supplier_id)
    .fetch_optional(&state.db)
    .await;

    let (id, name, legal_name, contact_person, phone, email, address, tax_number, website, status) =
        match srm_supplier {
            Ok(Some(s)) => s,
            Ok(None) => {
                return Json(ApiResponse::success(
                    serde_json::json!({
                        "success": false,
                        "message": "SRM供应商不存在".to_string(),
                        "supplier_id": supplier_id,
                        "action": "none",
                    }),
                    "SRM供应商不存在",
                ));
            }
            Err(e) => {
                tracing::error!("查询SRM供应商失败: {}", e);
                return Json(api_error(500, "查询SRM供应商失败"));
            }
        };

    let existing_count =
        sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM scm.suppliers WHERE id = $1")
            .bind(id)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

    let now = Utc::now();
    let action = if existing_count > 0 {
        "update"
    } else {
        "create"
    };

    if existing_count > 0 {
        let result = sqlx::query(
            r#"
            UPDATE scm.suppliers SET name = $2, legal_name = $3, contact_person = $4, 
                                 contact_phone = $5, email = $6, address = $7, 
                                 tax_id = $8, status = $9, sync_from_srm = TRUE,
                                 srm_supplier_id = $10, sync_retry_count = 0, 
                                 sync_error = NULL, last_sync_at = $11, updated_at = $11
            WHERE id = $1
            "#,
        )
        .bind(id)
        .bind(&name)
        .bind(legal_name)
        .bind(contact_person)
        .bind(phone)
        .bind(email)
        .bind(address)
        .bind(tax_number)
        .bind(&status)
        .bind(id)
        .bind(now)
        .bind(now)
        .execute(&state.db)
        .await;

        match result {
            Ok(_) => {
                let _ = record_sync_log(
                    &state,
                    "supplier_sync",
                    "srm",
                    "scm",
                    "supplier",
                    id,
                    "",
                    Some(id),
                    "",
                    action,
                    "success",
                    None,
                    0,
                )
                .await;
                Json(ApiResponse::success(
                    serde_json::json!({
                        "success": true,
                        "message": "供应商信息更新成功".to_string(),
                        "supplier_id": id,
                        "action": "updated",
                    }),
                    "供应商同步成功",
                ))
            }
            Err(e) => {
                tracing::error!("更新供应商失败: {}", e);
                let _ = record_sync_log(
                    &state,
                    "supplier_sync",
                    "srm",
                    "scm",
                    "supplier",
                    id,
                    "",
                    None,
                    "",
                    action,
                    "failed",
                    Some(e.to_string()),
                    0,
                )
                .await;
                Json(api_error(500, "更新供应商失败"))
            }
        }
    } else {
        let result = sqlx::query(
            r#"
            INSERT INTO scm.suppliers (id, name, legal_name, contact_person, contact_phone, 
                                   email, address, tax_id, status, sync_from_srm,
                                   srm_supplier_id, sync_retry_count, last_sync_at,
                                   created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, 0, $11, $12, $13)
            "#,
        )
        .bind(id)
        .bind(&name)
        .bind(legal_name)
        .bind(contact_person)
        .bind(phone)
        .bind(email)
        .bind(address)
        .bind(tax_number)
        .bind(&status)
        .bind(id)
        .bind(now)
        .bind(now)
        .bind(now)
        .execute(&state.db)
        .await;

        match result {
            Ok(_) => {
                let _ = record_sync_log(
                    &state,
                    "supplier_sync",
                    "srm",
                    "scm",
                    "supplier",
                    id,
                    "",
                    Some(id),
                    "",
                    action,
                    "success",
                    None,
                    0,
                )
                .await;
                Json(ApiResponse::success(
                    serde_json::json!({
                        "success": true,
                        "message": "供应商创建成功".to_string(),
                        "supplier_id": id,
                        "action": "created",
                    }),
                    "供应商同步成功",
                ))
            }
            Err(e) => {
                tracing::error!("创建供应商失败: {}", e);
                let _ = record_sync_log(
                    &state,
                    "supplier_sync",
                    "srm",
                    "scm",
                    "supplier",
                    id,
                    "",
                    None,
                    "",
                    action,
                    "failed",
                    Some(e.to_string()),
                    0,
                )
                .await;
                Json(api_error(500, "创建供应商失败"))
            }
        }
    }
}

async fn sync_all_suppliers_from_srm(
    State(state): State<ApiState>,
) -> Json<ApiResponse<serde_json::Value>> {
    let srm_suppliers = sqlx::query_as::<
        _,
        (
            Uuid,
            String,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            Option<String>,
            String,
        ),
    >(
        r#"
        SELECT id, name, legal_name, contact_person, phone, email, address, tax_id, website, status
        FROM srm.suppliers
        WHERE status != 'deleted'
        "#,
    )
    .fetch_all(&state.db)
    .await;

    let srm_suppliers = match srm_suppliers {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("查询SRM供应商列表失败: {}", e);
            return Json(api_error(500, "查询SRM供应商列表失败"));
        }
    };

    let total_count = srm_suppliers.len();
    let mut created_count = 0;
    let mut updated_count = 0;
    let mut failed_count = 0;
    let now = Utc::now();

    for (
        id,
        name,
        legal_name,
        contact_person,
        phone,
        email,
        address,
        tax_number,
        website,
        status,
    ) in srm_suppliers
    {
        let existing =
            sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM scm.suppliers WHERE id = $1")
                .bind(id)
                .fetch_one(&state.db)
                .await;

        if existing.unwrap_or(0) > 0 {
            let result = sqlx::query(
                r#"
                UPDATE scm.suppliers SET name = $2, legal_name = $3, contact_person = $4, 
                                     contact_phone = $5, email = $6, address = $7, 
                                     tax_id = $8, status = $9, sync_from_srm = TRUE,
                                     srm_supplier_id = $10, sync_retry_count = 0, 
                                     sync_error = NULL, last_sync_at = $11, updated_at = $11
                WHERE id = $1
                "#,
            )
            .bind(id)
            .bind(&name)
            .bind(legal_name)
            .bind(contact_person)
            .bind(phone)
            .bind(email)
            .bind(address)
            .bind(tax_number)
            .bind(&status)
            .bind(id)
            .bind(now)
            .bind(now)
            .execute(&state.db)
            .await;

            if result.is_ok() {
                updated_count += 1;
            } else {
                failed_count += 1;
            }
        } else {
            let result = sqlx::query(
                r#"
                INSERT INTO scm.suppliers (id, name, legal_name, contact_person, contact_phone, 
                                       email, address, tax_id, status, sync_from_srm,
                                       srm_supplier_id, sync_retry_count, last_sync_at,
                                       created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, 0, $11, $12, $13)
                "#,
            )
            .bind(id)
            .bind(&name)
            .bind(legal_name)
            .bind(contact_person)
            .bind(phone)
            .bind(email)
            .bind(address)
            .bind(tax_number)
            .bind(&status)
            .bind(id)
            .bind(now)
            .bind(now)
            .bind(now)
            .execute(&state.db)
            .await;

            if result.is_ok() {
                created_count += 1;
            } else {
                failed_count += 1;
            }
        }
    }

    Json(ApiResponse::success(
        serde_json::json!({
            "total_processed": total_count,
            "created": created_count,
            "updated": updated_count,
            "failed": failed_count
        }),
        "供应商批量同步完成",
    ))
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncLogsRequest {
    pub sync_type: Option<String>,
    pub status: Option<String>,
    pub source_module: Option<String>,
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

async fn get_sync_logs(
    State(state): State<ApiState>,
    Json(req): Json<SyncLogsRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = req.page.unwrap_or(1).max(1);
    let page_size = req.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let rows = sqlx::query(
        r#"
        SELECT id, sync_type, source_module, target_module, source_entity,
               source_id, source_code, target_id, target_code, operation, status,
               error_message, retry_count, max_retries, next_retry_at, executed_at, created_at
        FROM scm.sync_logs
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
                        "max_retries": row.get::<i32, _>("max_retries"),
                        "next_retry_at": row.get::<Option<chrono::DateTime<chrono::Utc>>, _>("next_retry_at"),
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

async fn retry_failed_syncs(
    State(state): State<ApiState>,
    Json(req): Json<RetryFailedRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let sync_type_filter = req.sync_type.clone();
    let max_retries = req.max_retries.unwrap_or(3);
    let now = Utc::now();

    let failed_syncs = sqlx::query(
        r#"
        SELECT id, sync_type, source_module, target_module, source_entity,
               source_id, source_code, operation, retry_count
        FROM scm.sync_logs
        WHERE status = 'failed'
          AND ($1::text IS NULL OR sync_type = $1)
          AND retry_count < $2
        ORDER BY created_at DESC
        "#,
    )
    .bind(sync_type_filter)
    .bind(max_retries as i64)
    .fetch_all(&state.db)
    .await;

    match failed_syncs {
        Ok(sync_rows) => {
            let total_count = sync_rows.len();
            let mut retried_count = 0;
            let mut skipped_count = 0;

            for row in sync_rows {
                let sync_id: Uuid = row.get("id");
                let sync_entity: String = row.get("source_entity");
                let sync_source_id: Option<Uuid> = row.get("source_id");
                let sync_retry_count: i32 = row.get("retry_count");
                let new_retry_count = sync_retry_count + 1;

                let update_result = sqlx::query(
                    r#"
                    UPDATE scm.sync_logs 
                    SET status = 'pending', retry_count = $2, 
                        next_retry_at = $3, updated_at = $4
                    WHERE id = $1
                    "#,
                )
                .bind(sync_id)
                .bind(new_retry_count)
                .bind(now + Duration::seconds((new_retry_count * 60).into()))
                .bind(now)
                .execute(&state.db)
                .await;

                if update_result.is_ok() {
                    retried_count += 1;

                    if sync_entity == "purchase_order" && sync_source_id.is_some() {
                        let _ = sqlx::query(
                            r#"
                            UPDATE scm.purchase_orders 
                            SET sync_retry_count = $2, sync_error = NULL, last_sync_at = $3
                            WHERE id = $1
                            "#,
                        )
                        .bind(sync_source_id.unwrap())
                        .bind(new_retry_count)
                        .bind(now)
                        .execute(&state.db)
                        .await;
                    }
                } else {
                    skipped_count += 1;
                }
            }

            Json(ApiResponse::success(
                serde_json::json!({
                    "total_failed": total_count,
                    "retried": retried_count,
                    "skipped": skipped_count,
                    "max_retries": max_retries,
                }),
                "重试操作完成",
            ))
        }
        Err(e) => {
            tracing::error!("查询失败同步记录失败: {}", e);
            Json(api_error(500, "查询失败同步记录失败"))
        }
    }
}

async fn get_sync_statistics(State(state): State<ApiState>) -> Json<ApiResponse<SyncStatistics>> {
    let total_syncs: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM scm.sync_logs")
        .fetch_one(&state.db)
        .await
        .unwrap_or(0);

    let success_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM scm.sync_logs WHERE status = 'success'")
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

    let failed_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM scm.sync_logs WHERE status = 'failed'")
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

    let pending_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM scm.sync_logs WHERE status = 'pending'")
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

    let in_progress_count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM scm.sync_logs WHERE status = 'in_progress'")
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

    let retry_needed_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM scm.sync_logs 
        WHERE status = 'pending' AND next_retry_at IS NOT NULL AND next_retry_at <= NOW()
        "#,
    )
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let statistics = SyncStatistics {
        total_syncs,
        success_count,
        failed_count,
        pending_count,
        in_progress_count,
        retry_needed_count,
    };

    Json(ApiResponse::success(statistics, "获取同步统计成功"))
}

async fn batch_sync_purchase_to_wms(
    State(state): State<ApiState>,
) -> Json<ApiResponse<BatchSyncResult>> {
    let approved_po = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        SELECT id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at
        FROM scm.purchase_orders
        WHERE status = 'approved' AND is_synced_to_wms = FALSE
        ORDER BY created_at ASC
        "#,
    )
    .fetch_all(&state.db)
    .await;

    match approved_po {
        Ok(purchase_orders) => {
            let total_count = purchase_orders.len();
            let mut success_count = 0;
            let mut failed_count = 0;
            let mut retry_count = 0;
            let mut errors: Vec<SyncErrorDetail> = Vec::new();
            let now = Utc::now();

            for po in purchase_orders {
                let existing_inbound = sqlx::query_scalar::<_, i64>(
                    "SELECT COUNT(*) FROM wms.inbound_orders WHERE order_number = $1",
                )
                .bind(&po.order_number)
                .fetch_one(&state.db)
                .await
                .unwrap_or(0);

                if existing_inbound > 0 {
                    let _ = sqlx::query(
                        "UPDATE scm.purchase_orders SET is_synced_to_wms = TRUE, updated_at = $2 WHERE id = $1"
                    )
                    .bind(po.id)
                    .bind(now)
                    .execute(&state.db)
                    .await;
                    success_count += 1;
                    continue;
                }

                let inbound_id = Uuid::new_v4();
                let inbound_order_number = format!("INB-{}", po.order_number);

                let result = sqlx::query(
                    r#"
                    INSERT INTO wms.inbound_orders (id, order_number, warehouse_id, supplier_id, 
                                                  order_type, status, received_at, created_at, updated_at)
                    VALUES ($1, $2, NULL, $3, 'purchase', 'pending', NULL, $4, $5)
                    "#,
                )
                .bind(inbound_id)
                .bind(&inbound_order_number)
                .bind(po.supplier_id)
                .bind(now)
                .bind(now)
                .execute(&state.db)
                .await;

                match result {
                    Ok(_) => {
                        let _ = sqlx::query(
                            r#"
                            UPDATE scm.purchase_orders 
                            SET status = 'in_transit', inbound_order_id = $2, 
                                inbound_order_number = $3, is_synced_to_wms = TRUE, 
                                sync_retry_count = 0, sync_error = NULL, last_sync_at = $4,
                                updated_at = $4
                            WHERE id = $1
                            "#,
                        )
                        .bind(po.id)
                        .bind(inbound_id)
                        .bind(&inbound_order_number)
                        .bind(now)
                        .execute(&state.db)
                        .await;

                        let _ = record_sync_log(
                            &state,
                            "purchase_to_inbound",
                            "scm",
                            "wms",
                            "purchase_order",
                            po.id,
                            &po.order_number,
                            Some(inbound_id),
                            &inbound_order_number,
                            "create",
                            "success",
                            None,
                            0,
                        )
                        .await;

                        success_count += 1;
                    }
                    Err(e) => {
                        let po_retry_count = sqlx::query_scalar::<_, i32>(
                            "SELECT sync_retry_count FROM scm.purchase_orders WHERE id = $1",
                        )
                        .bind(po.id)
                        .fetch_one(&state.db)
                        .await
                        .unwrap_or(0);

                        let new_retry_count = po_retry_count + 1;

                        if new_retry_count >= 3 {
                            failed_count += 1;
                            errors.push(SyncErrorDetail {
                                source_id: po.id.to_string(),
                                source_code: Some(po.order_number.clone()),
                                error: e.to_string(),
                            });

                            let _ = record_sync_log(
                                &state,
                                "purchase_to_inbound",
                                "scm",
                                "wms",
                                "purchase_order",
                                po.id,
                                &po.order_number,
                                None,
                                "",
                                "create",
                                "failed",
                                Some(e.to_string()),
                                new_retry_count,
                            )
                            .await;
                        } else {
                            retry_count += 1;
                            let _ = sqlx::query(
                                r#"
                                UPDATE scm.purchase_orders 
                                SET sync_error = $2, sync_retry_count = $3, last_sync_at = $4, updated_at = $4
                                WHERE id = $1
                                "#,
                            )
                            .bind(po.id)
                            .bind(e.to_string())
                            .bind(new_retry_count)
                            .bind(now)
                            .execute(&state.db)
                            .await;

                            let _ = record_sync_log(
                                &state,
                                "purchase_to_inbound",
                                "scm",
                                "wms",
                                "purchase_order",
                                po.id,
                                &po.order_number,
                                None,
                                "",
                                "create",
                                "pending",
                                Some(e.to_string()),
                                new_retry_count,
                            )
                            .await;
                        }
                    }
                }
            }

            Json(ApiResponse::success(
                BatchSyncResult {
                    total_count,
                    success_count,
                    failed_count,
                    retry_count,
                    errors,
                },
                "批量同步完成",
            ))
        }
        Err(e) => {
            tracing::error!("查询待同步采购订单失败: {}", e);
            Json(api_error(500, "查询待同步采购订单失败"))
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct ConsistencyCheckResult {
    pub check_type: String,
    pub total_records: i64,
    pub consistent_count: i64,
    pub inconsistent_count: i64,
    pub details: Vec<InconsistencyDetail>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct InconsistencyDetail {
    pub source_id: String,
    pub source_code: Option<String>,
    pub target_id: Option<String>,
    pub target_code: Option<String>,
    pub inconsistency_type: String,
    pub description: String,
}

async fn check_consistency(
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<ConsistencyCheckResult>>> {
    let mut results: Vec<ConsistencyCheckResult> = Vec::new();

    let purchase_inbound_result = check_purchase_inbound_consistency(&state).await;
    results.push(purchase_inbound_result);

    let supplier_sync_result = check_supplier_sync_consistency(&state).await;
    results.push(supplier_sync_result);

    Json(ApiResponse::success(results, "一致性检查完成"))
}

async fn check_purchase_inbound_consistency(state: &ApiState) -> ConsistencyCheckResult {
    let rows = sqlx::query(
        r#"
        SELECT po.id as po_id, po.order_number as po_number, 
               po.inbound_order_id as inbound_id, po.inbound_order_number as inbound_number,
               po.is_synced_to_wms as synced, po.status as po_status,
               io.id as wms_inbound_id, io.order_number as wms_inbound_number
        FROM scm.purchase_orders po
        LEFT JOIN wms.inbound_orders io ON po.inbound_order_id = io.id
        WHERE po.status IN ('in_transit', 'delivered')
        ORDER BY po.created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await;

    let mut details: Vec<InconsistencyDetail> = Vec::new();
    let mut consistent_count = 0;
    let mut inconsistent_count = 0;

    if let Ok(rows) = rows {
        for row in rows {
            let po_id: Uuid = row.get("po_id");
            let po_number: String = row.get("po_number");
            let inbound_id: Option<Uuid> = row.get("inbound_id");
            let inbound_number: Option<String> = row.get("inbound_number");
            let synced: bool = row.get("synced");
            let wms_inbound_id: Option<Uuid> = row.get("wms_inbound_id");

            if synced && inbound_id.is_some() && wms_inbound_id.is_none() {
                details.push(InconsistencyDetail {
                    source_id: po_id.to_string(),
                    source_code: Some(po_number),
                    target_id: inbound_id.map(|id| id.to_string()),
                    target_code: inbound_number,
                    inconsistency_type: "orphan_reference".to_string(),
                    description: "采购订单引用了不存在的入库单".to_string(),
                });
                inconsistent_count += 1;
            } else if !synced && inbound_id.is_some() {
                details.push(InconsistencyDetail {
                    source_id: po_id.to_string(),
                    source_code: Some(po_number),
                    target_id: inbound_id.map(|id| id.to_string()),
                    target_code: inbound_number,
                    inconsistency_type: "status_mismatch".to_string(),
                    description: "同步状态与引用状态不一致".to_string(),
                });
                inconsistent_count += 1;
            } else {
                consistent_count += 1;
            }
        }
    }

    ConsistencyCheckResult {
        check_type: "purchase_order_inbound".to_string(),
        total_records: consistent_count + inconsistent_count,
        consistent_count,
        inconsistent_count,
        details,
    }
}

async fn check_supplier_sync_consistency(state: &ApiState) -> ConsistencyCheckResult {
    let rows = sqlx::query(
        r#"
        SELECT s.id as scm_id, s.name as scm_name, s.sync_from_srm as scm_sync_from_srm,
               srm.id as srm_id, srm.name as srm_name, srm.sync_from_scm as srm_sync_from_scm
        FROM scm.suppliers s
        FULL OUTER JOIN srm.suppliers srm ON s.id = srm.id
        WHERE (s.id IS NOT NULL OR srm.id IS NOT NULL)
          AND s.status != 'deleted' AND (srm.status IS NULL OR srm.status != 'deleted')
        ORDER BY COALESCE(s.created_at, srm.created_at) DESC
        "#,
    )
    .fetch_all(&state.db)
    .await;

    let mut details: Vec<InconsistencyDetail> = Vec::new();
    let mut consistent_count = 0;
    let mut inconsistent_count = 0;

    if let Ok(rows) = rows {
        for row in rows {
            let scm_id: Option<Uuid> = row.get("scm_id");
            let scm_name: Option<String> = row.get("scm_name");
            let scm_sync_from_srm: Option<bool> = row.get("scm_sync_from_srm");
            let srm_id: Option<Uuid> = row.get("srm_id");
            let srm_name: Option<String> = row.get("srm_name");
            let srm_sync_from_scm: Option<bool> = row.get("srm_sync_from_scm");

            if scm_id.is_some() && srm_id.is_none() {
                details.push(InconsistencyDetail {
                    source_id: scm_id.unwrap().to_string(),
                    source_code: scm_name,
                    target_id: None,
                    target_code: None,
                    inconsistency_type: "missing_in_target".to_string(),
                    description: "SCM供应商在SRM中不存在".to_string(),
                });
                inconsistent_count += 1;
            } else if scm_id.is_none() && srm_id.is_some() {
                details.push(InconsistencyDetail {
                    source_id: srm_id.unwrap().to_string(),
                    source_code: srm_name,
                    target_id: None,
                    target_code: None,
                    inconsistency_type: "missing_in_source".to_string(),
                    description: "SRM供应商在SCM中不存在".to_string(),
                });
                inconsistent_count += 1;
            } else if scm_id.is_some() && srm_id.is_some() {
                let scm_sync = scm_sync_from_srm.unwrap_or(false);
                let srm_sync = srm_sync_from_scm.unwrap_or(false);

                if !scm_sync && !srm_sync {
                    details.push(InconsistencyDetail {
                        source_id: scm_id.unwrap().to_string(),
                        source_code: scm_name,
                        target_id: srm_id.map(|id| id.to_string()),
                        target_code: srm_name,
                        inconsistency_type: "unsynced".to_string(),
                        description: "供应商未标记为双向同步".to_string(),
                    });
                    inconsistent_count += 1;
                } else {
                    consistent_count += 1;
                }
            }
        }
    }

    ConsistencyCheckResult {
        check_type: "supplier_sync".to_string(),
        total_records: consistent_count + inconsistent_count,
        consistent_count,
        inconsistent_count,
        details,
    }
}

async fn record_sync_log(
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
    let now = Utc::now();

    let next_retry_at = if status == "pending" && retry_count < 3 {
        Some(now + Duration::seconds((retry_count * 60).into()))
    } else {
        None
    };

    sqlx::query(
        r#"
        INSERT INTO scm.sync_logs 
            (sync_type, source_module, target_module, source_entity,
             source_id, source_code, target_id, target_code, operation, status,
             error_message, retry_count, max_retries, next_retry_at, executed_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        "#,
    )
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
    .bind(next_retry_at)
    .bind(if status == "success" { Some(now) } else { None })
    .bind(now)
    .execute(&state.db)
    .await?;

    Ok(())
}
