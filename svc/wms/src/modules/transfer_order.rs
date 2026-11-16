use topems_shared_auth::middleware::tenant::RlsTxnCell;
use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use sqlx::Row;
use topems_shared_boundary::only_own_schema_query;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::models::transfer_order::*;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use crate::shared::scope::{
    arm_short_txn, movement_no, release_request_txn, tenant_of, wms_db, ShortTxnTimer,
};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::require_tenant;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;
use topems_shared_event::event::{commit_retry, EventType, WmsWarehouseTransferCompletedPayload};

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
    security(("BearerAuth" = ["wms:transfer:read"])),
    path = "/api/wms/transfers",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn list_transfers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<TransferOrderQueryParams>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, TransferOrder>(
        only_own_schema_query!("wms", r#"
        SELECT id, tenant_id, order_number, transfer_type, from_warehouse_id, to_warehouse_id, status, created_by, created_at, updated_at FROM wms.transfer_orders
        WHERE deleted_at IS NULL AND ($1::text IS NULL OR transfer_type = $1)
          AND ($2::uuid IS NULL OR from_warehouse_id = $2)
          AND ($3::uuid IS NULL OR to_warehouse_id = $3)
          AND ($4::text IS NULL OR status = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#),
    )
    .bind(&params.transfer_type)
    .bind(params.from_warehouse_id)
    .bind(params.to_warehouse_id)
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(transfers) => {
            let total = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "wms",
                r#"
                SELECT COUNT(*) FROM wms.transfer_orders
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR transfer_type = $1)
                  AND ($2::uuid IS NULL OR from_warehouse_id = $2)
                  AND ($3::uuid IS NULL OR to_warehouse_id = $3)
                  AND ($4::text IS NULL OR status = $4)
                "#
            ))
            .bind(&params.transfer_type)
            .bind(params.from_warehouse_id)
            .bind(params.to_warehouse_id)
            .bind(&params.status)
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": transfers,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取调拨单列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取调拨单列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取调拨单列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:transfer:write"])),
    path = "/api/wms/transfers",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn create_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
    Json(req): Json<CreateTransferOrderRequest>,
) -> ApiResponse<TransferOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let id = Uuid::new_v4();
    let order_number = format!("TF{}", chrono::Local::now().format("%Y%m%d%H%M%S"));
    let now = Utc::now();
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };

    let result = sqlx::query_as::<_, TransferOrder>(only_own_schema_query!(
        "wms",
        r#"
        INSERT INTO wms.transfer_orders (
            id, order_number, transfer_type, from_warehouse_id, from_location_id,
            to_warehouse_id, to_location_id, status, planned_date, transporter,
            priority, remarks, created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
        "#
    ))
    .bind(id)
    .bind(&order_number)
    .bind(req.transfer_type.as_deref().unwrap_or("inter_warehouse"))
    .bind(req.from_warehouse_id)
    .bind(req.from_location_id)
    .bind(req.to_warehouse_id)
    .bind(req.to_location_id)
    .bind("pending")
    .bind(&req.planned_date)
    .bind(&req.transporter)
    .bind(&req.priority)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(mut transfer) => {
            let mut line_number = 1;
            for item in req.items {
                let item_id = Uuid::new_v4();
                let total_amount = item
                    .unit_price
                    .map(|p| p * rust_decimal::Decimal::from(item.planned_quantity));

                let inserted = sqlx::query(
                    only_own_schema_query!("wms", r#"
                    INSERT INTO wms.transfer_order_items (
                        id, transfer_id, line_number, sku, material_name, specification,
                        batch_number, unit, planned_quantity, shipped_quantity, received_quantity,
                        unit_price, total_amount, from_location_id, to_location_id, remarks,
                        status, created_at, updated_at, tenant_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
                    "#),
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
                .bind(item.unit_price)
                .bind(total_amount)
                .bind(item.from_location_id)
                .bind(item.to_location_id)
                .bind(&item.remarks)
                .bind("pending")
                .bind(now)
                .bind(now)
                .bind(tenant_id)
                .execute(&mut **txn)
                .await;

                if let Err(e) = inserted {
                    tracing::error!("写入调拨明细失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal(
                        "创建调拨单失败：明细写入失败".to_string(),
                    ));
                }

                line_number += 1;
            }

            let total_qty = sqlx::query_scalar::<_, Option<i64>>(only_own_schema_query!(
                "wms",
                "SELECT SUM(planned_quantity) FROM wms.transfer_order_items WHERE transfer_id = $1 AND tenant_id = $2"
            ))
            .bind(id)
            .bind(tenant_id)
            .fetch_one(&mut **txn)
            .await;
            let total_qty = match total_qty {
                Ok(Some(v)) => v,
                Ok(None) => 0,
                Err(e) => {
                    tracing::error!("汇总调拨明细数量失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal(
                        "创建调拨单失败：汇总明细失败".to_string(),
                    ));
                }
            };

            transfer.total_quantity = Some(total_qty);

            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(transfer, "创建调拨单成功")
        }
        Err(e) => {
            tracing::error!("创建调拨单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建调拨单失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:transfer:read"])),
    path = "/api/wms/transfers/{id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn get_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<TransferOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的调拨单ID".to_string()))
        }
    };

    let result = sqlx::query_as::<_, TransferOrder>(
        only_own_schema_query!("wms", "SELECT id, tenant_id, order_number, transfer_type, from_warehouse_id, to_warehouse_id, status, created_by, created_at, updated_at FROM wms.transfer_orders WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(transfer_id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(transfer)) => ApiResponse::success(transfer, "获取调拨单成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("调拨单不存在".to_string())),
        Err(e) => {
            tracing::error!("获取调拨单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取调拨单失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:transfer:read"])),
    path = "/api/wms/transfers/{id}/items",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn list_transfer_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的调拨单ID".to_string()))
        }
    };

    let result = sqlx::query_as::<_, TransferOrderItem>(
        only_own_schema_query!("wms", "SELECT id, tenant_id, transfer_id, item_id, item_code, item_name, quantity, unit, line_number, created_at FROM wms.transfer_order_items WHERE transfer_id = $1 ORDER BY line_number"),
    )
    .bind(transfer_id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => ApiResponse::success(
            serde_json::json!({
                "items": items,
                "total": items.len()
            }),
            "获取调拨单明细成功",
        ),
        Err(e) => {
            tracing::error!("获取调拨单明细失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取调拨单明细失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:transfer:write"])),
    path = "/api/wms/transfers/{id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn update_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<TransferOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的调拨单ID".to_string()))
        }
    };

    let now = Utc::now();
    let tenant_filter: Option<Uuid> = match claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(t) => Some(t),
        None => return ApiResponse::bad_request("缺少租户上下文（超管需携带 x-tenant-id）"),
    };

    let result = sqlx::query_as::<_, TransferOrder>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.transfer_orders SET
            transfer_type = COALESCE($1, transfer_type),
            from_warehouse_id = COALESCE($2, from_warehouse_id),
            from_location_id = COALESCE($3, from_location_id),
            to_warehouse_id = COALESCE($4, to_warehouse_id),
            to_location_id = COALESCE($5, to_location_id),
            planned_date = COALESCE($6::date, planned_date),
            transporter = COALESCE($7, transporter),
            tracking_number = COALESCE($8, tracking_number),
            priority = COALESCE($9, priority),
            remarks = COALESCE($10, remarks),
            updated_at = $11
        WHERE id = $12 AND ($13::uuid IS NULL OR tenant_id = $13::uuid)
        RETURNING *
        "#
    ))
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
    .bind(tenant_filter)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(transfer) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(transfer, "更新调拨单成功")
        }
        Err(sqlx::Error::RowNotFound) => {
            ApiResponse::from(TopemsError::ResourceNotFound("调拨单不存在".to_string()))
        }
        Err(e) => {
            tracing::error!("更新调拨单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新调拨单失败".to_string()))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["wms:transfer:write"])),
    path = "/api/wms/transfers/{id}",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn delete_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的调拨单ID".to_string()))
        }
    };
    let tenant_filter: Option<Uuid> = match claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(t) => Some(t),
        None => return ApiResponse::bad_request("缺少租户上下文（超管需携带 x-tenant-id）"),
    };

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        "DELETE FROM wms.transfer_order_items WHERE transfer_id = $1"
    ))
    .bind(transfer_id)
    .execute(&mut **txn)
    .await;

    if let Err(e) = result {
        tracing::error!("删除调拨单明细失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("删除调拨单失败".to_string()));
    }

    let result = sqlx::query(only_own_schema_query!(
        "wms",
        "UPDATE wms.transfer_orders SET deleted_at = NOW() WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2::uuid)"
    ))
    .bind(transfer_id)
    .bind(tenant_filter)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success("".to_string(), "删除调拨单成功")
        }
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("调拨单不存在".to_string())),
        Err(e) => {
            tracing::error!("删除调拨单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除调拨单失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:transfer:write"])),
    path = "/api/wms/transfers/{id}/confirm",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
pub async fn confirm_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<TransferOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的调拨单ID".to_string()))
        }
    };

    let now = Utc::now();
    let tenant_filter: Option<Uuid> = match claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(t) => Some(t),
        None => return ApiResponse::bad_request("缺少租户上下文（超管需携带 x-tenant-id）"),
    };

    let result = sqlx::query_as::<_, TransferOrder>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.transfer_orders SET
            status = 'confirmed',
            approved_at = $1,
            updated_at = $2
        WHERE id = $3 AND status = 'pending' AND ($4::uuid IS NULL OR tenant_id = $4::uuid)
        RETURNING *
        "#
    ))
    .bind(now)
    .bind(now)
    .bind(transfer_id)
    .bind(tenant_filter)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(transfer) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(transfer, "确认调拨单成功")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::from(TopemsError::ResourceNotFound(
            "调拨单不存在或状态不正确".to_string(),
        )),
        Err(e) => {
            tracing::error!("确认调拨单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("确认调拨单失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:transfer:write"])),
    path = "/api/wms/transfers/{id}/ship",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn ship_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<TransferOrder> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的调拨单ID".to_string()))
        }
    };
    let now = Utc::now();

    if let Err(e) = release_request_txn(&txn_arc).await {
        tracing::error!("释放请求事务失败: {}", e);
        return ApiResponse::server_error("事务释放失败");
    }
    let txn_timer = ShortTxnTimer::start("transfer.ship");
    let db = wms_db(&state.db);
    // wms-short-txn-exempt: W-08 调拨发货独立短事务（连接 GUC 收敛防 RLS 误过滤；行锁边界；每请求连接占用见 m1-acceptance §10）
    let mut scope = match db.scope_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启调拨发货事务失败: {}", e);
            return ApiResponse::server_error("开启事务失败");
        }
    };
    if let Err(e) = arm_short_txn(&mut scope).await {
        tracing::error!("设置短事务 lock_timeout 失败: {}", e);
        let _ = scope.rollback().await;
        return ApiResponse::server_error("开启事务失败");
    }

    let order: Option<(String, Uuid)> = match sqlx::query_as(only_own_schema_query!(
        "wms",
        r#"
        SELECT status, from_warehouse_id FROM wms.transfer_orders
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        FOR UPDATE
        "#
    ))
    .bind(transfer_id)
    .bind(tenant)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("锁定调拨单失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::Internal("发货失败".to_string()));
        }
    };
    let (status, from_warehouse_id) = match order {
        Some(v) => v,
        None => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::ResourceNotFound("调拨单不存在".to_string()));
        }
    };
    if status != "confirmed" {
        let _ = scope.rollback().await;
        return ApiResponse::conflict(&format!("调拨单当前状态不允许发货: {}", status));
    }

    // D1：发货真正扣减来源仓库存（带行锁，一次只锁一行）。
    let organization_id = sqlx::query_scalar::<_, Uuid>(only_own_schema_query!(
        "wms",
        r#"SELECT organization_id FROM wms.warehouses WHERE id = $1 AND tenant_id = $2"#
    ))
    .bind(from_warehouse_id)
    .bind(tenant)
    .fetch_optional(&mut scope)
    .await;
    let organization_id = match organization_id {
        Ok(Some(v)) => v,
        Ok(None) => {
            let _ = scope.rollback().await;
            return ApiResponse::conflict("来源仓库不存在，无法发货");
        }
        Err(e) => {
            tracing::error!("查询来源仓库失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::Internal("发货失败".to_string()));
        }
    };

    let items: Vec<(Uuid, String, String, Option<String>, i64, Option<Uuid>)> =
        match sqlx::query_as(only_own_schema_query!(
            "wms",
            r#"
            SELECT id, sku, material_name, batch_number, planned_quantity, from_location_id
            FROM wms.transfer_order_items
            WHERE transfer_id = $1 AND tenant_id = $2 AND deleted_at IS NULL AND status = 'pending'
            ORDER BY line_number
            "#
        ))
        .bind(transfer_id)
        .bind(tenant)
        .fetch_all(&mut scope)
        .await
        {
            Ok(v) => v,
            Err(e) => {
                tracing::error!("查询调拨明细失败: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::from(TopemsError::Internal("发货失败".to_string()));
            }
        };
    if items.is_empty() {
        let _ = scope.rollback().await;
        return ApiResponse::conflict("调拨单没有待发货明细");
    }

    for (item_id, sku, material_name, batch_number, planned, from_location_id) in items {
        let stock_id = sqlx::query_scalar::<_, Uuid>(only_own_schema_query!(
            "wms",
            r#"
            SELECT id FROM wms.inventory
            WHERE organization_id = $1
              AND warehouse_id = $2
              AND tenant_id = $3
              AND material_code = $4
              AND deleted_at IS NULL
              AND ($5::varchar IS NULL OR batch_number = $5::varchar)
              AND ($6::uuid IS NULL OR location_id = $6::uuid)
              AND available_quantity >= $7
            ORDER BY expiry_date NULLS LAST, created_at, id
            LIMIT 1
            FOR UPDATE
            "#
        ))
        .bind(organization_id)
        .bind(from_warehouse_id)
        .bind(tenant)
        .bind(&sku)
        .bind(batch_number.as_deref())
        .bind(from_location_id)
        .bind(planned)
        .fetch_optional(&mut scope)
        .await;
        let stock_id = match stock_id {
            Ok(Some(v)) => v,
            Ok(None) => {
                tracing::warn!(
                    "调拨发货可用库存不足: sku={}, batch={:?}, 需={}",
                    sku,
                    batch_number,
                    planned
                );
                let _ = scope.rollback().await;
                return ApiResponse::from(TopemsError::BusinessLogic(format!(
                    "可用库存不足，无法调拨发货（物料 {}，需 {}）",
                    sku, planned
                )));
            }
            Err(e) => {
                tracing::error!("锁定库存行失败: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::from(TopemsError::Internal("发货失败".to_string()));
            }
        };

        let deducted = sqlx::query(only_own_schema_query!(
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
        .bind(planned)
        .bind(now)
        .bind(tenant)
        .execute(&mut scope)
        .await;
        match deducted {
            Ok(r) if r.rows_affected() == 1 => {}
            Ok(_) => {
                tracing::error!("调拨扣减 0 行（已锁行）: stock_id={}", stock_id);
                let _ = scope.rollback().await;
                return ApiResponse::from(TopemsError::Internal("发货失败".to_string()));
            }
            Err(e) => {
                tracing::error!("调拨扣减库存失败: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::from(TopemsError::Internal("发货失败".to_string()));
            }
        }

        let item_updated = sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            UPDATE wms.transfer_order_items SET
                shipped_quantity = planned_quantity,
                status = 'shipped',
                updated_at = $2
            WHERE id = $1 AND transfer_id = $3 AND tenant_id = $4 AND deleted_at IS NULL AND status = 'pending'
            "#
        ))
        .bind(item_id)
        .bind(now)
        .bind(transfer_id)
        .bind(tenant)
        .execute(&mut scope)
        .await;
        match item_updated {
            Ok(r) if r.rows_affected() == 1 => {}
            Ok(_) => {
                let _ = scope.rollback().await;
                return ApiResponse::conflict(&format!("调拨明细状态已变化: {}", item_id));
            }
            Err(e) => {
                tracing::error!("更新调拨明细失败: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::from(TopemsError::Internal("发货失败".to_string()));
            }
        }

        let movement = sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            INSERT INTO wms.inventory_movements (
                id, movement_no, tenant_id, movement_type, reference_id, reference_type,
                material_id, material_code, material_name, quantity,
                from_location_id, to_location_id, from_warehouse_id, to_warehouse_id,
                status, performed_at, notes, created_at, updated_at
            ) VALUES (
                $1, $2, $3, 'transfer_out', $4, 'transfer_order',
                NULL, $5, $6, $7,
                $8, NULL, $9, NULL,
                'completed', $10, $11, $10, $10
            )
            "#
        ))
        .bind(Uuid::new_v4())
        .bind(movement_no(now))
        .bind(tenant)
        .bind(transfer_id.to_string())
        .bind(&sku)
        .bind(&material_name)
        .bind(planned as f64)
        .bind(from_location_id)
        .bind(from_warehouse_id)
        .bind(now)
        .bind(format!("调拨出库：单 {}", transfer_id))
        .execute(&mut scope)
        .await;
        if let Err(e) = movement {
            tracing::error!("调拨出库 movement 写入失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::Internal("发货失败".to_string()));
        }
    }

    let order_updated = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.transfer_orders SET
            status = 'shipped',
            shipped_at = $1,
            updated_at = $2
        WHERE id = $3 AND tenant_id = $4 AND deleted_at IS NULL AND status = 'confirmed'
        "#
    ))
    .bind(now)
    .bind(now)
    .bind(transfer_id)
    .bind(tenant)
    .execute(&mut scope)
    .await;
    match order_updated {
        Ok(r) if r.rows_affected() == 1 => {}
        Ok(_) => {
            let _ = scope.rollback().await;
            return ApiResponse::conflict("调拨单状态已变化，发货未生效");
        }
        Err(e) => {
            tracing::error!("更新调拨单失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::Internal("发货失败".to_string()));
        }
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("调拨发货事务提交失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("发货失败".to_string()));
    }
    txn_timer.finish();

    // wms-short-txn-exempt: R-05 提交后只读回读（独立只读短事务，不占请求事务连接；见 m1-acceptance §10）
    let mut read_scope = match db.scope_read_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启调拨只读作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("发货失败".to_string()));
        }
    };

    let result = sqlx::query_as::<_, TransferOrder>(only_own_schema_query!(
        "wms",
        r#"
        SELECT * FROM wms.transfer_orders WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#
    ))
    .bind(transfer_id)
    .bind(tenant)
    .fetch_one(&mut read_scope)
    .await;

    match result {
        Ok(transfer) => ApiResponse::success(transfer, "发货成功"),
        Err(e) => {
            tracing::error!("读取调拨单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("发货失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:transfer:write"])),
    path = "/api/wms/transfers/{id}/receive",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn receive_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
    Json(data): Json<serde_json::Value>,
) -> ApiResponse<TransferOrder> {
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的调拨单ID".to_string()))
        }
    };
    let now = Utc::now();

    if let Err(e) = release_request_txn(&txn_arc).await {
        tracing::error!("释放请求事务失败: {}", e);
        return ApiResponse::server_error("事务释放失败");
    }
    let txn_timer = ShortTxnTimer::start("transfer.receive");
    let db = wms_db(&state.db);
    // wms-short-txn-exempt: W-09 调拨收货独立短事务（连接 GUC 收敛防 RLS 误过滤；行锁边界；每请求连接占用见 m1-acceptance §10）
    let mut scope = match db.scope_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启调拨收货事务失败: {}", e);
            return ApiResponse::server_error("开启事务失败");
        }
    };
    if let Err(e) = arm_short_txn(&mut scope).await {
        tracing::error!("设置短事务 lock_timeout 失败: {}", e);
        let _ = scope.rollback().await;
        return ApiResponse::server_error("开启事务失败");
    }

    let order: Option<(String, Uuid)> = match sqlx::query_as(only_own_schema_query!(
        "wms",
        r#"
        SELECT status, to_warehouse_id FROM wms.transfer_orders
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        FOR UPDATE
        "#
    ))
    .bind(transfer_id)
    .bind(tenant)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("锁定调拨单失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::Internal("收货失败".to_string()));
        }
    };
    let (status, to_warehouse_id) = match order {
        Some(v) => v,
        None => {
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::ResourceNotFound("调拨单不存在".to_string()));
        }
    };
    if status != "shipped" {
        let _ = scope.rollback().await;
        return ApiResponse::conflict(&format!("调拨单当前状态不允许收货: {}", status));
    }

    let organization_id = sqlx::query_scalar::<_, Uuid>(only_own_schema_query!(
        "wms",
        r#"SELECT organization_id FROM wms.warehouses WHERE id = $1 AND tenant_id = $2"#
    ))
    .bind(to_warehouse_id)
    .bind(tenant)
    .fetch_optional(&mut scope)
    .await;
    let organization_id = match organization_id {
        Ok(Some(v)) => v,
        Ok(None) => {
            let _ = scope.rollback().await;
            return ApiResponse::conflict("目的仓库不存在，无法收货");
        }
        Err(e) => {
            tracing::error!("查询目的仓库失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::Internal("收货失败".to_string()));
        }
    };

    // 解析请求明细；格式非法直接 400，不静默跳过。
    let payload_items = match data.get("items").and_then(|v| v.as_array()) {
        Some(v) if !v.is_empty() => v,
        Some(_) => {
            let _ = scope.rollback().await;
            return ApiResponse::bad_request("收货明细不能为空");
        }
        None => {
            let _ = scope.rollback().await;
            return ApiResponse::bad_request("缺少 items 收货明细");
        }
    };

    for item in payload_items {
        let item_id = match item
            .get("item_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok())
        {
            Some(v) => v,
            None => {
                let _ = scope.rollback().await;
                return ApiResponse::bad_request("收货明细 item_id 非法");
            }
        };
        let received_qty = match item.get("received_quantity").and_then(|v| v.as_i64()) {
            Some(v) if v > 0 => v,
            _ => {
                let _ = scope.rollback().await;
                return ApiResponse::bad_request(&format!(
                    "收货数量必须为正整数（明细 {}）",
                    item_id
                ));
            }
        };

        let line: Option<(String, String, Option<String>, i64, i64, Option<Uuid>)> =
            match sqlx::query_as(only_own_schema_query!(
                "wms",
                r#"
                SELECT sku, material_name, batch_number, planned_quantity, received_quantity, to_location_id
                FROM wms.transfer_order_items
                WHERE id = $1 AND transfer_id = $2 AND tenant_id = $3 AND deleted_at IS NULL
                FOR UPDATE
                "#
            ))
            .bind(item_id)
            .bind(transfer_id)
            .bind(tenant)
            .fetch_optional(&mut scope)
            .await
            {
                Ok(v) => v,
                Err(e) => {
                    tracing::error!("锁定调拨明细失败: {}", e);
                    let _ = scope.rollback().await;
                    return ApiResponse::from(TopemsError::Internal("收货失败".to_string()));
                }
            };
        let (sku, material_name, batch_number, planned, already_received, to_location_id) =
            match line {
                Some(v) => v,
                None => {
                    let _ = scope.rollback().await;
                    return ApiResponse::not_found(&format!(
                        "调拨明细不存在或不属于该调拨单: {}",
                        item_id
                    ));
                }
            };
        if already_received + received_qty > planned {
            let _ = scope.rollback().await;
            return ApiResponse::conflict(&format!(
                "收货数量超出计划：明细 {} 计划 {} 已收 {} 本次 {}",
                item_id, planned, already_received, received_qty
            ));
        }

        // D1：收货真正增加目的仓库存（按 org+物料+批次 upsert，带租户）。
        let upserted = sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            INSERT INTO wms.inventory (organization_id, warehouse_id, location_id,
                                      material_code, material_name, specification,
                                      batch_number, quantity, unit, available_quantity,
                                      quality_status, created_at, updated_at, tenant_id)
            VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, '件', $7, 'qualified', $8, $8, $9)
            ON CONFLICT (organization_id, material_code, batch_number) DO UPDATE SET
                quantity = wms.inventory.quantity + $7,
                available_quantity = wms.inventory.available_quantity + $7,
                updated_at = $8
            WHERE wms.inventory.tenant_id = $9 AND wms.inventory.deleted_at IS NULL
            "#
        ))
        .bind(organization_id)
        .bind(to_warehouse_id)
        .bind(to_location_id)
        .bind(&sku)
        .bind(&material_name)
        .bind(batch_number.as_deref())
        .bind(received_qty)
        .bind(now)
        .bind(tenant)
        .execute(&mut scope)
        .await;
        match upserted {
            Ok(r) if r.rows_affected() == 1 => {}
            Ok(_) => {
                tracing::error!("调拨收货库存写入 0 行: item_id={}", item_id);
                let _ = scope.rollback().await;
                return ApiResponse::from(TopemsError::Internal("收货库存写入失败".to_string()));
            }
            Err(e) => {
                tracing::error!("调拨收货库存写入失败: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::from(TopemsError::Internal("收货库存写入失败".to_string()));
            }
        }

        let item_updated = sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            UPDATE wms.transfer_order_items SET
                received_quantity = received_quantity + $1,
                status = CASE WHEN received_quantity + $1 >= planned_quantity THEN 'completed' ELSE 'partial' END,
                updated_at = $2
            WHERE id = $3 AND transfer_id = $4 AND tenant_id = $5 AND deleted_at IS NULL
            "#
        ))
        .bind(received_qty)
        .bind(now)
        .bind(item_id)
        .bind(transfer_id)
        .bind(tenant)
        .execute(&mut scope)
        .await;
        match item_updated {
            Ok(r) if r.rows_affected() == 1 => {}
            Ok(_) => {
                let _ = scope.rollback().await;
                return ApiResponse::conflict(&format!("调拨明细状态已变化: {}", item_id));
            }
            Err(e) => {
                tracing::error!("更新调拨明细失败: {}", e);
                let _ = scope.rollback().await;
                return ApiResponse::from(TopemsError::Internal("收货失败".to_string()));
            }
        }

        let movement = sqlx::query(only_own_schema_query!(
            "wms",
            r#"
            INSERT INTO wms.inventory_movements (
                id, movement_no, tenant_id, movement_type, reference_id, reference_type,
                material_id, material_code, material_name, quantity,
                from_location_id, to_location_id, from_warehouse_id, to_warehouse_id,
                status, performed_at, notes, created_at, updated_at
            ) VALUES (
                $1, $2, $3, 'transfer_in', $4, 'transfer_order',
                NULL, $5, $6, $7,
                NULL, $8, NULL, $9,
                'completed', $10, $11, $10, $10
            )
            "#
        ))
        .bind(Uuid::new_v4())
        .bind(movement_no(now))
        .bind(tenant)
        .bind(transfer_id.to_string())
        .bind(&sku)
        .bind(&material_name)
        .bind(received_qty as f64)
        .bind(to_location_id)
        .bind(to_warehouse_id)
        .bind(now)
        .bind(format!("调拨入库：单 {}", transfer_id))
        .execute(&mut scope)
        .await;
        if let Err(e) = movement {
            tracing::error!("调拨入库 movement 写入失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::Internal("收货失败".to_string()));
        }
    }

    let order_updated = sqlx::query(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.transfer_orders SET
            status = 'received',
            received_at = $1,
            updated_at = $2
        WHERE id = $3 AND tenant_id = $4 AND deleted_at IS NULL AND status = 'shipped'
        "#
    ))
    .bind(now)
    .bind(now)
    .bind(transfer_id)
    .bind(tenant)
    .execute(&mut scope)
    .await;
    match order_updated {
        Ok(r) if r.rows_affected() == 1 => {}
        Ok(_) => {
            let _ = scope.rollback().await;
            return ApiResponse::conflict("调拨单状态已变化，收货未生效");
        }
        Err(e) => {
            tracing::error!("更新调拨单失败: {}", e);
            let _ = scope.rollback().await;
            return ApiResponse::from(TopemsError::Internal("收货失败".to_string()));
        }
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("调拨收货事务提交失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("收货失败".to_string()));
    }
    txn_timer.finish();

    // wms-short-txn-exempt: R-06 提交后只读回读（独立只读短事务，不占请求事务连接；见 m1-acceptance §10）
    let mut read_scope = match db.scope_read_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启调拨只读作用域失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("收货失败".to_string()));
        }
    };

    let result = sqlx::query_as::<_, TransferOrder>(only_own_schema_query!(
        "wms",
        r#"
        SELECT * FROM wms.transfer_orders WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#
    ))
    .bind(transfer_id)
    .bind(tenant)
    .fetch_one(&mut read_scope)
    .await;

    match result {
        Ok(transfer) => ApiResponse::success(transfer, "收货成功"),
        Err(e) => {
            tracing::error!("读取调拨单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("收货失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:transfer:write"])),
    path = "/api/wms/transfers/{id}/complete",
    tag = "wms",
    responses((status = 200, description = "OK"))
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn complete_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<String>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
) -> ApiResponse<TransferOrder> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::WarehouseWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => {
            return ApiResponse::from(TopemsError::ValidationFailed("无效的调拨单ID".to_string()))
        }
    };
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };

    let now = Utc::now();

    let result = sqlx::query_as::<_, TransferOrder>(only_own_schema_query!(
        "wms",
        r#"
        UPDATE wms.transfer_orders SET
            status = 'completed',
            actual_date = CURRENT_DATE,
            updated_at = $1
        WHERE id = $2 AND status = 'received' AND tenant_id = $3 AND deleted_at IS NULL
        RETURNING *
        "#
    ))
    .bind(now)
    .bind(transfer_id)
    .bind(tenant)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(transfer)) => {
            // D6（对齐 erp c843ad423）：本 handler 写 guard 事务但此前缺显式 commit，
            // UPDATE 随 Drop 回滚而事件已发=幽灵事件。先 commit，成功后再发布。
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("完成调拨事务提交失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("完成调拨单失败".to_string()));
                }
            }
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
                        .publish_event(EventType::WmsWarehouseTransferCompleted, payload.clone())
                        .await
                    {
                        tracing::warn!(
                            "[wms] WmsWarehouseTransferCompleted 事件发布失败: {}，入重试队列",
                            e
                        );
                        commit_retry::push_retry_typed(
                            "wms",
                            EventType::WmsWarehouseTransferCompleted,
                            &payload,
                        )
                        .await;
                    } else {
                        tracing::info!(
                            "[wms] WmsWarehouseTransferCompleted 事件发布成功 - transfer_id={}",
                            transfer_id_evt
                        );
                    }
                });
            }

            ApiResponse::success(transfer, "完成调拨单成功")
        }
        Ok(None) => {
            let exists = sqlx::query_scalar::<_, Uuid>(only_own_schema_query!(
                "wms",
                r#"SELECT id FROM wms.transfer_orders WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"#
            ))
            .bind(transfer_id)
            .bind(tenant)
            .fetch_optional(&mut **txn)
            .await;
            match exists {
                Ok(Some(_)) => ApiResponse::conflict("调拨单当前状态不允许完成"),
                Ok(None) => {
                    ApiResponse::from(TopemsError::ResourceNotFound("调拨单不存在".to_string()))
                }
                Err(e) => {
                    tracing::error!("查询调拨单失败: {}", e);
                    ApiResponse::from(TopemsError::Internal("完成调拨单失败".to_string()))
                }
            }
        }
        Err(e) => {
            tracing::error!("完成调拨单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("完成调拨单失败".to_string()))
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
    security(("BearerAuth" = ["wms:transfer:write"])),
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
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::TransferApprove).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return ApiResponse::bad_request("无效的调拨单ID"),
    };
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

    let current = sqlx::query(only_own_schema_query!(
        "wms",
        "SELECT status FROM wms.transfer_orders WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(transfer_id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if !crate::shared::fsm::transfer_order_requires_approval(&current_status, "shipped") {
                return ApiResponse::bad_request("当前状态无需审批");
            }
            if let Err(e) = crate::models::audit_log::log_approval_event(
                &mut **txn,
                &tenant_id.to_string(),
                "transfer_order",
                &transfer_id.to_string(),
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
            tracing::error!("找不到调拨单: {}", e);
            ApiResponse::not_found("调拨单不存在")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:transfer:write"])),
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
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::TransferApprove).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return ApiResponse::bad_request("无效的调拨单ID"),
    };
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

    let current = sqlx::query(only_own_schema_query!(
        "wms",
        "SELECT status FROM wms.transfer_orders WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(transfer_id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if crate::shared::fsm::transfer_order_requires_approval(&current_status, "shipped")
                && crate::shared::fsm::transfer_order_can_transition(&current_status, "shipped")
                    .is_err()
            {
                return ApiResponse::bad_request("当前状态不允许审批通过");
            }
            let result = sqlx::query(
                only_own_schema_query!("wms", "UPDATE wms.transfer_orders SET status = 'shipped', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *"),
            )
            .bind(transfer_id)
            .bind(tenant_id)
            .fetch_one(&mut **txn)
            .await;
            match result {
                Ok(_) => {
                    if let Err(e) = crate::models::audit_log::log_approval_event(
                        &mut **txn,
                        &tenant_id.to_string(),
                        "transfer_order",
                        &transfer_id.to_string(),
                        "approve",
                        &req.operator,
                        &current_status,
                        "shipped",
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
                        serde_json::json!({"id": transfer_id, "status": "shipped"}),
                        "审批通过",
                    )
                }
                Err(e) => {
                    tracing::error!("审批调拨单失败: {}", e);
                    ApiResponse::server_error("审批失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("找不到调拨单: {}", e);
            ApiResponse::not_found("调拨单不存在")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:transfer:write"])),
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
    Extension(txn_arc): Extension<
        RlsTxnCell,
    >,
    Json(req): Json<ApprovalRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::TransferApprove).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let transfer_id = match Uuid::parse_str(&id) {
        Ok(uuid) => uuid,
        Err(_) => return ApiResponse::bad_request("无效的调拨单ID"),
    };
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(tenant) => tenant,
        Err((code, msg)) => return ApiResponse::error(code, &msg),
    };

    let current = sqlx::query(only_own_schema_query!(
        "wms",
        "SELECT status FROM wms.transfer_orders WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(transfer_id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if crate::shared::fsm::transfer_order_can_transition(&current_status, "pending")
                .is_err()
            {
                return ApiResponse::bad_request("当前状态不允许驳回回流");
            }
            let result = sqlx::query(
                only_own_schema_query!("wms", "UPDATE wms.transfer_orders SET status = 'pending', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *"),
            )
            .bind(transfer_id)
            .bind(tenant_id)
            .fetch_one(&mut **txn)
            .await;
            match result {
                Ok(_) => {
                    if let Err(e) = crate::models::audit_log::log_approval_event(
                        &mut **txn,
                        &tenant_id.to_string(),
                        "transfer_order",
                        &transfer_id.to_string(),
                        "reject",
                        &req.operator,
                        &current_status,
                        "pending",
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
                        serde_json::json!({"id": transfer_id, "status": "pending"}),
                        "审批驳回，回流至 pending",
                    )
                }
                Err(e) => {
                    tracing::error!("驳回调拨单失败: {}", e);
                    ApiResponse::server_error("驳回失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("找不到调拨单: {}", e);
            ApiResponse::not_found("调拨单不存在")
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_approval_request_deserialize() {
        let json = r#"{
            "operator": "admin",
            "comment": "同意调拨"
        }"#;
        let request: ApprovalRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.operator, "admin");
        assert_eq!(request.comment.as_deref(), Some("同意调拨"));
    }

    #[test]
    fn test_approval_request_no_comment() {
        let json = r#"{"operator": "manager"}"#;
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
