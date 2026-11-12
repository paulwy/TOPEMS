use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    Json,
};
use chrono::Utc;
use sqlx::Row;
use uuid::Uuid;

use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use crate::shared::scope::tenant_of;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{ApiResponse, PaginationParams};
use topems_shared_core::TopemsError;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/smart-replenishment/orders",
    tag = "smart_replenishment",
    operation_id = "list_orders",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_orders(
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
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query(
        r#"
        SELECT id, order_number, warehouse_id, warehouse_name, status,
               total_quantity, total_amount::float8, created_at, updated_at
        FROM wms.replenishment_orders
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM wms.replenishment_orders WHERE deleted_at IS NULL",
            )
            .fetch_one(&mut **txn)
            .await
            .unwrap_or(0);

            let items_json: Vec<serde_json::Value> = items.iter().map(|row| serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "order_number": row.try_get::<String, _>("order_number").ok(),
                "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
                "warehouse_name": row.try_get::<Option<String>, _>("warehouse_name").ok(),
                "status": row.try_get::<String, _>("status").ok(),
                "total_quantity": row.try_get::<i64, _>("total_quantity").ok(),
                "total_amount": row.try_get::<f64, _>("total_amount").ok(),
                "created_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
                "updated_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("updated_at").ok(),
            })).collect();

            ApiResponse::success(
                serde_json::json!({
                    "items": items_json,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取补货订单列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取补货订单列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取补货订单列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:write"])),
    path = "/smart-replenishment/orders",
    tag = "smart_replenishment",
    operation_id = "create_order",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn create_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };

    let id = Uuid::new_v4();
    let order_number = format!("RO{}", chrono::Local::now().format("%Y%m%d%H%M%S"));
    let now = Utc::now().naive_utc();

    let result = sqlx::query(
        r#"
        INSERT INTO wms.replenishment_orders (
            id, order_number, warehouse_id, warehouse_name, status,
            total_quantity, total_amount, created_at, updated_at, tenant_id
        ) VALUES ($1, $2, $3::uuid, $4, 'active', $5, $6, $7, $8, $9)
        RETURNING id, order_number, warehouse_id, warehouse_name, status,
                  total_quantity, total_amount, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&order_number)
    .bind(req.get("warehouse_id").and_then(|v| v.as_str()))
    .bind(req.get("warehouse_name").and_then(|v| v.as_str()))
    .bind(
        req.get("total_quantity")
            .and_then(|v| v.as_i64())
            .unwrap_or(0),
    )
    .bind(
        req.get("total_amount")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0),
    )
    .bind(now)
    .bind(now)
    .bind(tenant)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(_row) => {
            if let Some(items) = req.get("items").and_then(|v| v.as_array()) {
                let mut line_number = 1;
                for item in items {
                    let item_id = Uuid::new_v4();
                    let inserted = sqlx::query(
                        r#"
                        INSERT INTO wms.replenishment_order_items (
                            id, order_id, line_number, sku, material_name, specification,
                            unit, quantity, unit_price, total_amount, status,
                            created_at, updated_at, tenant_id
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12, $13)
                        "#,
                    )
                    .bind(item_id)
                    .bind(id)
                    .bind(line_number)
                    .bind(item.get("sku").and_then(|v| v.as_str()).unwrap_or(""))
                    .bind(
                        item.get("material_name")
                            .and_then(|v| v.as_str())
                            .unwrap_or(""),
                    )
                    .bind(item.get("specification").and_then(|v| v.as_str()))
                    .bind(item.get("unit").and_then(|v| v.as_str()).unwrap_or(""))
                    .bind(item.get("quantity").and_then(|v| v.as_i64()).unwrap_or(0))
                    .bind(item.get("unit_price").and_then(|v| v.as_f64()))
                    .bind(item.get("total_amount").and_then(|v| v.as_f64()))
                    .bind(now)
                    .bind(now)
                    .bind(tenant)
                    .execute(&mut **txn)
                    .await;
                    if let Err(e) = inserted {
                        tracing::error!("写入补货明细失败: {}", e);
                        return ApiResponse::from(TopemsError::Internal(
                            "创建补货单失败：明细写入失败".to_string(),
                        ));
                    }
                    line_number += 1;
                }
            }

            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(
                serde_json::json!({
                    "id": id,
                    "order_number": order_number,
                    "warehouse_id": req.get("warehouse_id").and_then(|v| v.as_str()),
                    "warehouse_name": req.get("warehouse_name").and_then(|v| v.as_str()),
                    "status": "active",
                    "created_at": now.to_string(),
                    "updated_at": now.to_string(),
                }),
                "创建补货订单成功",
            )
        }
        Err(e) => {
            tracing::error!("创建补货订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建补货订单失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/smart-replenishment/orders/{id}",
    tag = "smart_replenishment",
    operation_id = "get_order",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn get_order(
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
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let result = sqlx::query(
        r#"
        SELECT id, order_number, warehouse_id, warehouse_name, status,
               total_quantity, total_amount::float8, created_at, updated_at
        FROM wms.replenishment_orders WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(row)) => ApiResponse::success(
            serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "order_number": row.try_get::<String, _>("order_number").ok(),
                "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
                "warehouse_name": row.try_get::<Option<String>, _>("warehouse_name").ok(),
                "status": row.try_get::<String, _>("status").ok(),
                "total_quantity": row.try_get::<i64, _>("total_quantity").ok(),
                "total_amount": row.try_get::<f64, _>("total_amount").ok(),
                "created_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
                "updated_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("updated_at").ok(),
            }),
            "获取补货订单详情成功",
        ),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("补货订单不存在".to_string())),
        Err(e) => {
            tracing::error!("获取补货订单详情失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取补货订单详情失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["wms:update"])),
    path = "/smart-replenishment/orders/{id}",
    tag = "smart_replenishment",
    operation_id = "update_order",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn update_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let now = Utc::now().naive_utc();
    let tenant_filter: Option<Uuid> = match claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(t) => Some(t),
        None => return ApiResponse::bad_request("缺少租户上下文（超管需携带 x-tenant-id）"),
    };

    let result = sqlx::query(
        r#"
        UPDATE wms.replenishment_orders SET
            warehouse_id = COALESCE($2::uuid, warehouse_id),
            warehouse_name = COALESCE($3, warehouse_name),
            status = COALESCE($4, status),
            updated_at = $5
        WHERE id = $1 AND ($6::uuid IS NULL OR tenant_id = $6::uuid)
        RETURNING id, order_number, warehouse_id, warehouse_name, status,
                  total_quantity, total_amount::float8, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.get("warehouse_id").and_then(|v| v.as_str()))
    .bind(req.get("warehouse_name").and_then(|v| v.as_str()))
    .bind(req.get("status").and_then(|v| v.as_str()))
    .bind(now)
    .bind(tenant_filter)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(
                serde_json::json!({
                    "id": row.try_get::<Uuid, _>("id").ok(),
                    "order_number": row.try_get::<String, _>("order_number").ok(),
                    "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
                    "warehouse_name": row.try_get::<Option<String>, _>("warehouse_name").ok(),
                    "status": row.try_get::<String, _>("status").ok(),
                    "total_quantity": row.try_get::<i64, _>("total_quantity").ok(),
                    "total_amount": row.try_get::<f64, _>("total_amount").ok(),
                    "created_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
                    "updated_at": now.to_string(),
                }),
                "更新补货订单成功",
            )
        }

        Err(sqlx::Error::RowNotFound) => {
            ApiResponse::from(TopemsError::ResourceNotFound("补货订单不存在".to_string()))
        }
        Err(e) => {
            tracing::error!("更新补货订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新补货订单失败".to_string()))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["wms:delete"])),
    path = "/smart-replenishment/orders/{id}",
    tag = "smart_replenishment",
    operation_id = "delete_order",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn delete_order(
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
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant = match tenant_of(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };

    // 先软删主表并校验命中行：0 行 → 404，且不再删除明细（避免孤儿行）。
    let deleted = sqlx::query(
        "UPDATE wms.replenishment_orders SET deleted_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant)
    .execute(&mut **txn)
    .await;

    match deleted {
        Ok(r) if r.rows_affected() > 0 => {}
        Ok(_) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("补货订单不存在".to_string()))
        }
        Err(e) => {
            tracing::error!("删除补货订单失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("删除补货订单失败".to_string()));
        }
    }

    let items_deleted = sqlx::query(
        "DELETE FROM wms.replenishment_order_items WHERE order_id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant)
    .execute(&mut **txn)
    .await;
    if let Err(e) = items_deleted {
        tracing::error!("删除补货明细失败: {}", e);
        return ApiResponse::from(TopemsError::Internal("删除补货订单失败".to_string()));
    }

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("事务提交失败: {}", e);
            return ApiResponse::server_error("事务提交失败");
        }
    }
    ApiResponse::success("".to_string(), "删除补货订单成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["wms:read"])),
    path = "/smart-replenishment/orders/{id}/items",
    tag = "smart_replenishment",
    operation_id = "list_order_items",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn list_order_items(
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
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let result = sqlx::query(
        r#"
        SELECT id, order_id, line_number, sku, material_name, specification,
               unit, quantity, unit_price::float8, total_amount::float8, status,
               created_at, updated_at
        FROM wms.replenishment_order_items WHERE order_id = $1
        ORDER BY line_number
        "#,
    )
    .bind(id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let items_json: Vec<serde_json::Value> = items.iter().map(|row| serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "order_id": row.try_get::<Uuid, _>("order_id").ok(),
                "line_number": row.try_get::<i32, _>("line_number").ok(),
                "sku": row.try_get::<String, _>("sku").ok(),
                "material_name": row.try_get::<String, _>("material_name").ok(),
                "specification": row.try_get::<Option<String>, _>("specification").ok(),
                "unit": row.try_get::<String, _>("unit").ok(),
                "quantity": row.try_get::<i64, _>("quantity").ok(),
                "unit_price": row.try_get::<Option<f64>, _>("unit_price").ok(),
                "total_amount": row.try_get::<Option<f64>, _>("total_amount").ok(),
                "status": row.try_get::<String, _>("status").ok(),
                "created_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("created_at").ok(),
                "updated_at": row.try_get::<chrono::DateTime<chrono::Utc>, _>("updated_at").ok(),
            })).collect();

            ApiResponse::success(
                serde_json::json!({
                    "items": items_json,
                    "total": items.len()
                }),
                "获取补货订单明细成功",
            )
        }
        Err(e) => {
            tracing::error!("获取补货订单明细失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取补货订单明细失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:write"])),
    path = "/smart-replenishment/orders/{id}/confirm",
    tag = "smart_replenishment",
    operation_id = "confirm_order",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn confirm_order(
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
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let now = Utc::now().naive_utc();
    let tenant_filter: Option<Uuid> = match claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(t) => Some(t),
        None => return ApiResponse::bad_request("缺少租户上下文（超管需携带 x-tenant-id）"),
    };

    let result = sqlx::query(
        r#"
        UPDATE wms.replenishment_orders SET
            status = 'confirmed',
            updated_at = $2
        WHERE id = $1 AND status = 'pending' AND ($3::uuid IS NULL OR tenant_id = $3::uuid)
        RETURNING id, order_number, status, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .bind(tenant_filter)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(
                serde_json::json!({
                    "id": row.try_get::<Uuid, _>("id").ok(),
                    "order_number": row.try_get::<String, _>("order_number").ok(),
                    "status": "confirmed",
                    "updated_at": now.to_string(),
                }),
                "确认补货订单成功",
            )
        }

        Err(sqlx::Error::RowNotFound) => ApiResponse::from(TopemsError::ResourceNotFound(
            "补货订单不存在或状态不正确".to_string(),
        )),
        Err(e) => {
            tracing::error!("确认补货订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("确认补货订单失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["wms:write"])),
    path = "/smart-replenishment/orders/{id}/complete",
    tag = "smart_replenishment",
    operation_id = "complete_order",
    responses(
        (status = 200, description = "OK"),
    ),
)]
pub async fn complete_order(
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
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let now = Utc::now().naive_utc();
    let tenant_filter: Option<Uuid> = match claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok())
    {
        Some(t) => Some(t),
        None => return ApiResponse::bad_request("缺少租户上下文（超管需携带 x-tenant-id）"),
    };

    let result = sqlx::query(
        r#"
        UPDATE wms.replenishment_orders SET
            status = 'completed',
            updated_at = $2
        WHERE id = $1 AND status = 'confirmed' AND ($3::uuid IS NULL OR tenant_id = $3::uuid)
        RETURNING id, order_number, status, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .bind(tenant_filter)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(
                serde_json::json!({
                    "id": row.try_get::<Uuid, _>("id").ok(),
                    "order_number": row.try_get::<String, _>("order_number").ok(),
                    "status": "completed",
                    "updated_at": now.to_string(),
                }),
                "完成补货订单成功",
            )
        }

        Err(sqlx::Error::RowNotFound) => ApiResponse::from(TopemsError::ResourceNotFound(
            "补货订单不存在或状态不正确".to_string(),
        )),
        Err(e) => {
            tracing::error!("完成补货订单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("完成补货订单失败".to_string()))
        }
    }
}
