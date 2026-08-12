use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use sqlx::Row;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::models::transfer_order::*;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};
use topems_shared_event::event::{EventType, WmsWarehouseTransferCompletedPayload};

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route("/transfers", get(list_transfers).post(create_transfer))
        .route(
            "/transfers/{id}",
            get(get_transfer)
                .put(update_transfer)
                .delete(delete_transfer),
        )
        .route("/transfers/{id}/items", get(list_transfer_items))
        .route("/transfers/{id}/confirm", post(confirm_transfer))
        .route("/transfers/{id}/ship", post(ship_transfer))
        .route("/transfers/{id}/receive", post(receive_transfer))
        .route("/transfers/{id}/complete", post(complete_transfer))
        .route(
            "/transfers/{id}/approval/start",
            post(start_transfer_approval),
        )
        .route("/transfers/{id}/approval/approve", post(approve_transfer))
        .route("/transfers/{id}/approval/reject", post(reject_transfer))
}

#[utoipa::path(
    get,
    path = "/api/wms/transfers",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn list_transfers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<TransferOrderQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, TransferOrder>(
        r#"
        SELECT id, tenant_id, transfer_no, from_warehouse_id, to_warehouse_id, status, created_by, created_at, updated_at FROM wms.transfer_orders
        WHERE deleted_at IS NULL AND ($1::text IS NULL OR transfer_type = $1)
          AND ($2::uuid IS NULL OR from_warehouse_id = $2)
          AND ($3::uuid IS NULL OR to_warehouse_id = $3)
          AND ($4::text IS NULL OR status = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(&params.transfer_type)
    .bind(&params.from_warehouse_id)
    .bind(&params.to_warehouse_id)
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(transfers) => {
            let total = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM wms.transfer_orders
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR transfer_type = $1)
                  AND ($2::uuid IS NULL OR from_warehouse_id = $2)
                  AND ($3::uuid IS NULL OR to_warehouse_id = $3)
                  AND ($4::text IS NULL OR status = $4)
                "#,
            )
            .bind(&params.transfer_type)
            .bind(&params.from_warehouse_id)
            .bind(&params.to_warehouse_id)
            .bind(&params.status)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": transfers,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取调拨单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取调拨单列表失败: {}", e);
            Json(api_error(500, "获取调拨单列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/wms/transfers",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn create_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateTransferOrderRequest>,
) -> Json<ApiResponse<TransferOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let id = Uuid::new_v4();
    let order_number = format!("TF{}", chrono::Local::now().format("%Y%m%d%H%M%S"));
    let now = Utc::now();

    let result = sqlx::query_as::<_, TransferOrder>(
        r#"
        INSERT INTO wms.transfer_orders (
            id, order_number, transfer_type, from_warehouse_id, from_location_id,
            to_warehouse_id, to_location_id, status, planned_date, transporter,
            priority, remarks, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&order_number)
    .bind(req.transfer_type.as_deref().unwrap_or("inter_warehouse"))
    .bind(&req.from_warehouse_id)
    .bind(&req.from_location_id)
    .bind(&req.to_warehouse_id)
    .bind(&req.to_location_id)
    .bind("pending")
    .bind(&req.planned_date)
    .bind(&req.transporter)
    .bind(&req.priority)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(mut transfer) => {
            let mut line_number = 1;
            for item in req.items {
                let item_id = Uuid::new_v4();
                let total_amount = item.unit_price.map(|p| p * item.planned_quantity as f64);

                let _ = sqlx::query(
                    r#"
                    INSERT INTO wms.transfer_order_items (
                        id, transfer_id, line_number, sku, material_name, specification,
                        batch_number, unit, planned_quantity, shipped_quantity, received_quantity,
                        unit_price, total_amount, from_location_id, to_location_id, remarks,
                        status, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                    "#,
                )
                .bind(item_id)
                .bind(id)
                .bind(line_number)
                .bind(&item.sku)
                .bind(&item.material_name)
                .bind(&item.specification)
                .bind(&item.batch_number)
                .bind(&item.unit)
                .bind(item.planned_quantity)
                .bind(0)
                .bind(0)
                .bind(&item.unit_price)
                .bind(total_amount)
                .bind(&item.from_location_id)
                .bind(&item.to_location_id)
                .bind(&item.remarks)
                .bind("pending")
                .bind(now)
                .bind(now)
                .execute(&state.db)
                .await;

                line_number += 1;
            }

            let total_qty = sqlx::query_scalar::<_, i64>(
                "SELECT SUM(planned_quantity) FROM wms.transfer_order_items WHERE transfer_id = $1",
            )
            .bind(id)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            transfer.total_quantity = Some(total_qty);

            Json(ApiResponse::success(transfer, "创建调拨单成功"))
        }
        Err(e) => {
            tracing::error!("创建调拨单失败: {}", e);
            Json(api_error(500, "创建调拨单失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/wms/transfers/{id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn get_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<TransferOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的调拨单ID")),
    };

    let result = sqlx::query_as::<_, TransferOrder>(
        "SELECT id, tenant_id, transfer_no, from_warehouse_id, to_warehouse_id, status, created_by, created_at, updated_at FROM wms.transfer_orders WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(transfer_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(transfer)) => Json(ApiResponse::success(transfer, "获取调拨单成功")),
        Ok(None) => Json(api_error(404, "调拨单不存在")),
        Err(e) => {
            tracing::error!("获取调拨单失败: {}", e);
            Json(api_error(500, "获取调拨单失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/wms/transfers/{id}/items",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn list_transfer_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的调拨单ID")),
    };

    let result = sqlx::query_as::<_, TransferOrderItem>(
        "SELECT id, tenant_id, transfer_id, item_id, item_code, item_name, quantity, unit, line_number, created_at FROM wms.transfer_order_items WHERE transfer_id = $1 ORDER BY line_number",
    )
    .bind(transfer_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => Json(ApiResponse::success(
            serde_json::json!({
                "items": items,
                "total": items.len()
            }),
            "获取调拨单明细成功",
        )),
        Err(e) => {
            tracing::error!("获取调拨单明细失败: {}", e);
            Json(api_error(500, "获取调拨单明细失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/wms/transfers/{id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn update_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TransferOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的调拨单ID")),
    };

    let now = Utc::now();

    let result = sqlx::query_as::<_, TransferOrder>(
        r#"
        UPDATE wms.transfer_orders SET
            transfer_type = COALESCE($1, transfer_type),
            from_warehouse_id = COALESCE($2, from_warehouse_id),
            from_location_id = COALESCE($3, from_location_id),
            to_warehouse_id = COALESCE($4, to_warehouse_id),
            to_location_id = COALESCE($5, to_location_id),
            planned_date = COALESCE($6, planned_date),
            transporter = COALESCE($7, transporter),
            tracking_number = COALESCE($8, tracking_number),
            priority = COALESCE($9, priority),
            remarks = COALESCE($10, remarks),
            updated_at = $11
        WHERE id = $12
        RETURNING *
        "#,
    )
    .bind(req.get("transfer_type").and_then(|v| v.as_str()))
    .bind(
        req.get("from_warehouse_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(
        req.get("from_location_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(
        req.get("to_warehouse_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(
        req.get("to_location_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(req.get("planned_date").and_then(|v| v.as_str()))
    .bind(req.get("transporter").and_then(|v| v.as_str()))
    .bind(req.get("tracking_number").and_then(|v| v.as_str()))
    .bind(req.get("priority").and_then(|v| v.as_str()))
    .bind(req.get("remarks").and_then(|v| v.as_str()))
    .bind(now)
    .bind(transfer_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(transfer) => Json(ApiResponse::success(transfer, "更新调拨单成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "调拨单不存在")),
        Err(e) => {
            tracing::error!("更新调拨单失败: {}", e);
            Json(api_error(500, "更新调拨单失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/api/wms/transfers/{id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn delete_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的调拨单ID")),
    };

    let result = sqlx::query("DELETE FROM wms.transfer_order_items WHERE transfer_id = $1")
        .bind(transfer_id)
        .execute(&state.db)
        .await;

    if let Err(e) = result {
        tracing::error!("删除调拨单明细失败: {}", e);
        return Json(api_error(500, "删除调拨单失败"));
    }

    let result = sqlx::query("UPDATE wms.transfer_orders SET deleted_at = NOW() WHERE id = $1")
        .bind(transfer_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "删除调拨单成功"))
        }
        Ok(_) => Json(api_error(404, "调拨单不存在")),
        Err(e) => {
            tracing::error!("删除调拨单失败: {}", e);
            Json(api_error(500, "删除调拨单失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/wms/transfers/{id}/confirm",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn confirm_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<TransferOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的调拨单ID")),
    };

    let now = Utc::now();

    let result = sqlx::query_as::<_, TransferOrder>(
        r#"
        UPDATE wms.transfer_orders SET
            status = 'confirmed',
            approved_at = $1,
            updated_at = $2
        WHERE id = $3 AND status = 'pending'
        RETURNING *
        "#,
    )
    .bind(now)
    .bind(now)
    .bind(transfer_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(transfer) => Json(ApiResponse::success(transfer, "确认调拨单成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "调拨单不存在或状态不正确")),
        Err(e) => {
            tracing::error!("确认调拨单失败: {}", e);
            Json(api_error(500, "确认调拨单失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/wms/transfers/{id}/ship",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn ship_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<TransferOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的调拨单ID")),
    };

    let now = Utc::now();

    let result = sqlx::query_as::<_, TransferOrder>(
        r#"
        UPDATE wms.transfer_orders SET
            status = 'shipped',
            shipped_at = $1,
            updated_at = $2
        WHERE id = $3 AND status = 'confirmed'
        RETURNING *
        "#,
    )
    .bind(now)
    .bind(now)
    .bind(transfer_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(transfer) => Json(ApiResponse::success(transfer, "发货成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "调拨单不存在或状态不正确")),
        Err(e) => {
            tracing::error!("发货失败: {}", e);
            Json(api_error(500, "发货失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/wms/transfers/{id}/receive",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn receive_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(data): Json<serde_json::Value>,
) -> Json<ApiResponse<TransferOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的调拨单ID")),
    };

    let now = Utc::now();

    if let Some(items) = data.get("items").and_then(|v| v.as_array()) {
        for item in items {
            let item_id_str = item.get("item_id").and_then(|v| v.as_str()).unwrap_or("");
            let received_qty = item
                .get("received_quantity")
                .and_then(|v| v.as_i64())
                .unwrap_or(0);

            if let Ok(item_id) = Uuid::parse_str(item_id_str) {
                let _ = sqlx::query(
                    r#"
                    UPDATE wms.transfer_order_items SET
                        received_quantity = received_quantity + $1,
                        status = CASE WHEN received_quantity + $1 >= planned_quantity THEN 'completed' ELSE 'partial' END,
                        updated_at = $2
                    WHERE id = $3 AND transfer_id = $4
                    "#,
                )
                .bind(received_qty)
                .bind(now)
                .bind(item_id)
                .bind(transfer_id)
                .execute(&state.db)
                .await;
            }
        }
    }

    let result = sqlx::query_as::<_, TransferOrder>(
        r#"
        UPDATE wms.transfer_orders SET
            status = 'received',
            received_at = $1,
            updated_at = $2
        WHERE id = $3 AND status = 'shipped'
        RETURNING *
        "#,
    )
    .bind(now)
    .bind(now)
    .bind(transfer_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(transfer) => Json(ApiResponse::success(transfer, "收货成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "调拨单不存在或状态不正确")),
        Err(e) => {
            tracing::error!("收货失败: {}", e);
            Json(api_error(500, "收货失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/wms/transfers/{id}/complete",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn complete_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
) -> Json<ApiResponse<TransferOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(api_error(400, "无效的调拨单ID")),
    };

    let now = Utc::now();

    let result = sqlx::query_as::<_, TransferOrder>(
        r#"
        UPDATE wms.transfer_orders SET
            status = 'completed',
            actual_date = TO_CHAR(NOW(), 'YYYY-MM-DD'),
            updated_at = $1
        WHERE id = $2 AND status = 'received'
        RETURNING *
        "#,
    )
    .bind(now)
    .bind(transfer_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(transfer) => {
            // P3 事件驱动规范化：调拨完成时发布 WmsWarehouseTransferCompleted 事件，
            // 通知 SCM（库存可见性）/Finance（仓间成本结转）。
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let transfer_id_evt = transfer.id;
                let transfer_no = transfer.order_number.clone();
                let from_warehouse_id = Some(transfer.from_warehouse_id);
                let from_warehouse_name = transfer.from_warehouse_name.clone();
                let to_warehouse_id = Some(transfer.to_warehouse_id);
                let to_warehouse_name = transfer.to_warehouse_name.clone();
                let quantity = transfer.total_quantity.unwrap_or(0) as f64;
                let status = transfer.status.clone();
                let completed_at = Some(now);
                let transferred_by = transfer
                    .created_by
                    .as_deref()
                    .and_then(|s| Uuid::parse_str(s).ok());
                tokio::spawn(async move {
                    let payload = WmsWarehouseTransferCompletedPayload {
                        transfer_id: transfer_id_evt,
                        transfer_no,
                        from_warehouse_id: from_warehouse_id.unwrap_or_else(Uuid::nil),
                        from_warehouse_name,
                        to_warehouse_id: to_warehouse_id.unwrap_or_else(Uuid::nil),
                        to_warehouse_name,
                        material_code: String::new(),
                        material_name: "汇总调拨".to_string(),
                        quantity,
                        unit: None,
                        status,
                        transferred_by,
                        completed_at,
                    };
                    if let Err(e) = publisher
                        .publish_event(EventType::WmsWarehouseTransferCompleted, payload)
                        .await
                    {
                        tracing::warn!(
                            "[wms] WmsWarehouseTransferCompleted 事件发布失败（graceful fallback）: {}",
                            e
                        );
                    } else {
                        tracing::info!(
                            "[wms] WmsWarehouseTransferCompleted 事件发布成功 - transfer_id={}",
                            transfer_id_evt
                        );
                    }
                });
            }

            Json(ApiResponse::success(transfer, "完成调拨单成功"))
        }
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "调拨单不存在或状态不正确")),
        Err(e) => {
            tracing::error!("完成调拨单失败: {}", e);
            Json(api_error(500, "完成调拨单失败"))
        }
    }
}

#[derive(Debug, serde::Deserialize, ToSchema)]
pub struct ApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
}

#[utoipa::path(
    post,
    path = "/api/wms/transfers/{id}/approval/start",
    tag = "WMS - Transfer",
    request_body = ApprovalRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn start_transfer_approval(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::TransferApprove).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(ApiResponse::error(400, "无效的调拨单ID")),
    };
    let tenant_id = claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4);

    let current =
        sqlx::query("SELECT status FROM wms.transfer_orders WHERE id = $1 AND tenant_id = $2")
            .bind(transfer_id)
            .bind(tenant_id)
            .fetch_one(&state.db)
            .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if !crate::shared::fsm::transfer_order_requires_approval(&current_status, "shipped") {
                return Json(ApiResponse::error(400, "当前状态无需审批"));
            }
            let _ = crate::models::audit_log::log_approval_event(
                &state.db,
                &tenant_id.to_string(),
                "transfer_order",
                &transfer_id.to_string(),
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
            tracing::error!("找不到调拨单: {}", e);
            Json(ApiResponse::error(404, "调拨单不存在"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/wms/transfers/{id}/approval/approve",
    tag = "WMS - Transfer",
    request_body = ApprovalRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn approve_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::TransferApprove).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(ApiResponse::error(400, "无效的调拨单ID")),
    };
    let tenant_id = claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4);

    let current =
        sqlx::query("SELECT status FROM wms.transfer_orders WHERE id = $1 AND tenant_id = $2")
            .bind(transfer_id)
            .bind(tenant_id)
            .fetch_one(&state.db)
            .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if crate::shared::fsm::transfer_order_requires_approval(&current_status, "shipped")
                && !crate::shared::fsm::transfer_order_can_transition(&current_status, "shipped")
                    .is_ok()
            {
                return Json(ApiResponse::error(400, "当前状态不允许审批通过"));
            }
            let result = sqlx::query(
                "UPDATE wms.transfer_orders SET status = 'shipped', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *",
            )
            .bind(transfer_id)
            .bind(tenant_id)
            .fetch_one(&state.db)
            .await;
            match result {
                Ok(_) => {
                    let _ = crate::models::audit_log::log_approval_event(
                        &state.db,
                        &tenant_id.to_string(),
                        "transfer_order",
                        &transfer_id.to_string(),
                        "approve",
                        &req.operator,
                        &current_status,
                        "shipped",
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(
                        serde_json::json!({"id": transfer_id, "status": "shipped"}),
                        "审批通过",
                    ))
                }
                Err(e) => {
                    tracing::error!("审批调拨单失败: {}", e);
                    Json(ApiResponse::error(500, "审批失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("找不到调拨单: {}", e);
            Json(ApiResponse::error(404, "调拨单不存在"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/wms/transfers/{id}/approval/reject",
    tag = "WMS - Transfer",
    request_body = ApprovalRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn reject_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Path(id): Path<String>,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::TransferApprove).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return Json(ApiResponse::error(400, "无效的调拨单ID")),
    };
    let tenant_id = claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4);

    let current =
        sqlx::query("SELECT status FROM wms.transfer_orders WHERE id = $1 AND tenant_id = $2")
            .bind(transfer_id)
            .bind(tenant_id)
            .fetch_one(&state.db)
            .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if !crate::shared::fsm::transfer_order_can_transition(&current_status, "pending")
                .is_ok()
            {
                return Json(ApiResponse::error(400, "当前状态不允许驳回回流"));
            }
            let result = sqlx::query(
                "UPDATE wms.transfer_orders SET status = 'pending', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *",
            )
            .bind(transfer_id)
            .bind(tenant_id)
            .fetch_one(&state.db)
            .await;
            match result {
                Ok(_) => {
                    let _ = crate::models::audit_log::log_approval_event(
                        &state.db,
                        &tenant_id.to_string(),
                        "transfer_order",
                        &transfer_id.to_string(),
                        "reject",
                        &req.operator,
                        &current_status,
                        "pending",
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(
                        serde_json::json!({"id": transfer_id, "status": "pending"}),
                        "审批驳回，回流至 pending",
                    ))
                }
                Err(e) => {
                    tracing::error!("驳回调拨单失败: {}", e);
                    Json(ApiResponse::error(500, "驳回失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("找不到调拨单: {}", e);
            Json(ApiResponse::error(404, "调拨单不存在"))
        }
    }
}
