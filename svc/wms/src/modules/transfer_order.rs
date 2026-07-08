use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use uuid::Uuid;

use crate::models::{
    CreateTransferOrderRequest, TransferOrder, TransferOrderItem, TransferOrderQueryParams,
};
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route(
            "/api/wms/transfers",
            get(list_transfers).post(create_transfer),
        )
        .route(
            "/api/wms/transfers/{id}",
            get(get_transfer)
                .put(update_transfer)
                .delete(delete_transfer),
        )
        .route("/api/wms/transfers/{id}/items", get(list_transfer_items))
        .route("/api/wms/transfers/{id}/confirm", post(confirm_transfer))
        .route("/api/wms/transfers/{id}/ship", post(ship_transfer))
        .route("/api/wms/transfers/{id}/receive", post(receive_transfer))
        .route("/api/wms/transfers/{id}/complete", post(complete_transfer))
}

async fn list_transfers(
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
        SELECT * FROM wms.transfer_orders
        WHERE ($1::text IS NULL OR transfer_type = $1)
          AND ($2::text IS NULL OR from_warehouse_id = $2)
          AND ($3::text IS NULL OR to_warehouse_id = $3)
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
                WHERE ($1::text IS NULL OR transfer_type = $1)
                  AND ($2::text IS NULL OR from_warehouse_id = $2)
                  AND ($3::text IS NULL OR to_warehouse_id = $3)
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

async fn create_transfer(
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

async fn get_transfer(
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

    let result =
        sqlx::query_as::<_, TransferOrder>("SELECT * FROM wms.transfer_orders WHERE id = $1")
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

async fn list_transfer_items(
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
        "SELECT * FROM wms.transfer_order_items WHERE transfer_id = $1 ORDER BY line_number",
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

async fn update_transfer(
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
    .bind(req.get("from_warehouse_id").and_then(|v| v.as_str()))
    .bind(req.get("from_location_id").and_then(|v| v.as_str()))
    .bind(req.get("to_warehouse_id").and_then(|v| v.as_str()))
    .bind(req.get("to_location_id").and_then(|v| v.as_str()))
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

async fn delete_transfer(
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

    let result = sqlx::query("DELETE FROM wms.transfer_orders WHERE id = $1")
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

async fn confirm_transfer(
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

async fn ship_transfer(
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

async fn receive_transfer(
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

async fn complete_transfer(
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
        Ok(transfer) => Json(ApiResponse::success(transfer, "完成调拨单成功")),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "调拨单不存在或状态不正确")),
        Err(e) => {
            tracing::error!("完成调拨单失败: {}", e);
            Json(api_error(500, "完成调拨单失败"))
        }
    }
}
