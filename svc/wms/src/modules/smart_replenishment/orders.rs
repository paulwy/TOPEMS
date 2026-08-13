use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use chrono::Utc;
use sqlx::Row;
use uuid::Uuid;

use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};

#[utoipa::path(
    get,
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
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query(
        r#"
        SELECT id, order_number, warehouse_id, warehouse_name, status,
               total_quantity, total_amount, created_at, updated_at
        FROM wms.replenishment_orders
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
        "#,
    )
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM wms.replenishment_orders WHERE deleted_at IS NULL",
            )
            .fetch_one(&state.db)
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
                "created_at": row.try_get::<chrono::NaiveDateTime, _>("created_at").ok().map(|t| t.to_string()),
                "updated_at": row.try_get::<chrono::NaiveDateTime, _>("updated_at").ok().map(|t| t.to_string()),
            })).collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items_json,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取补货订单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取补货订单列表失败: {}", e);
            Json(api_error(500, "获取补货订单列表失败"))
        }
    }
}

#[utoipa::path(
    post,
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
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let id = Uuid::new_v4();
    let order_number = format!("RO{}", chrono::Local::now().format("%Y%m%d%H%M%S"));
    let now = Utc::now().naive_utc();

    let result = sqlx::query(
        r#"
        INSERT INTO wms.replenishment_orders (
            id, order_number, warehouse_id, warehouse_name, status,
            total_quantity, total_amount, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8)
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(_row) => {
            if let Some(items) = req.get("items").and_then(|v| v.as_array()) {
                let mut line_number = 1;
                for item in items {
                    let item_id = Uuid::new_v4();
                    let _ = sqlx::query(
                        r#"
                        INSERT INTO wms.replenishment_order_items (
                            id, order_id, line_number, sku, material_name, specification,
                            unit, quantity, unit_price, total_amount, status,
                            created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11, $12)
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
                    .execute(&state.db)
                    .await;
                    line_number += 1;
                }
            }

            Json(ApiResponse::success(
                serde_json::json!({
                    "id": id,
                    "order_number": order_number,
                    "warehouse_id": req.get("warehouse_id").and_then(|v| v.as_str()),
                    "warehouse_name": req.get("warehouse_name").and_then(|v| v.as_str()),
                    "status": "pending",
                    "created_at": now.to_string(),
                    "updated_at": now.to_string(),
                }),
                "创建补货订单成功",
            ))
        }
        Err(e) => {
            tracing::error!("创建补货订单失败: {}", e);
            Json(api_error(500, "创建补货订单失败"))
        }
    }
}

#[utoipa::path(
    get,
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
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query(
        r#"
        SELECT id, order_number, warehouse_id, warehouse_name, status,
               total_quantity, total_amount, created_at, updated_at
        FROM wms.replenishment_orders WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(row)) => Json(ApiResponse::success(
            serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "order_number": row.try_get::<String, _>("order_number").ok(),
                "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
                "warehouse_name": row.try_get::<Option<String>, _>("warehouse_name").ok(),
                "status": row.try_get::<String, _>("status").ok(),
                "total_quantity": row.try_get::<i64, _>("total_quantity").ok(),
                "total_amount": row.try_get::<f64, _>("total_amount").ok(),
                "created_at": row.try_get::<chrono::NaiveDateTime, _>("created_at").ok().map(|t| t.to_string()),
                "updated_at": row.try_get::<chrono::NaiveDateTime, _>("updated_at").ok().map(|t| t.to_string()),
            }),
            "获取补货订单详情成功",
        )),
        Ok(None) => Json(api_error(404, "补货订单不存在")),
        Err(e) => {
            tracing::error!("获取补货订单详情失败: {}", e);
            Json(api_error(500, "获取补货订单详情失败"))
        }
    }
}

#[utoipa::path(
    put,
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
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let now = Utc::now().naive_utc();

    let result = sqlx::query(
        r#"
        UPDATE wms.replenishment_orders SET
            warehouse_id = COALESCE($2, warehouse_id),
            warehouse_name = COALESCE($3, warehouse_name),
            status = COALESCE($4, status),
            updated_at = $5
        WHERE id = $1
        RETURNING id, order_number, warehouse_id, warehouse_name, status,
                  total_quantity, total_amount, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.get("warehouse_id").and_then(|v| v.as_str()))
    .bind(req.get("warehouse_name").and_then(|v| v.as_str()))
    .bind(req.get("status").and_then(|v| v.as_str()))
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(row) => Json(ApiResponse::success(
            serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "order_number": row.try_get::<String, _>("order_number").ok(),
                "warehouse_id": row.try_get::<Option<Uuid>, _>("warehouse_id").ok(),
                "warehouse_name": row.try_get::<Option<String>, _>("warehouse_name").ok(),
                "status": row.try_get::<String, _>("status").ok(),
                "total_quantity": row.try_get::<i64, _>("total_quantity").ok(),
                "total_amount": row.try_get::<f64, _>("total_amount").ok(),
                "created_at": row.try_get::<chrono::NaiveDateTime, _>("created_at").ok().map(|t| t.to_string()),
                "updated_at": now.to_string(),
            }),
            "更新补货订单成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "补货订单不存在")),
        Err(e) => {
            tracing::error!("更新补货订单失败: {}", e);
            Json(api_error(500, "更新补货订单失败"))
        }
    }
}

#[utoipa::path(
    delete,
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
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let _ = sqlx::query("DELETE FROM wms.replenishment_order_items WHERE order_id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let result =
        sqlx::query("UPDATE wms.replenishment_orders SET deleted_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&state.db)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "删除补货订单成功"))
        }
        Ok(_) => Json(api_error(404, "补货订单不存在")),
        Err(e) => {
            tracing::error!("删除补货订单失败: {}", e);
            Json(api_error(500, "删除补货订单失败"))
        }
    }
}

#[utoipa::path(
    get,
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
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query(
        r#"
        SELECT id, order_id, line_number, sku, material_name, specification,
               unit, quantity, unit_price, total_amount, status,
               created_at, updated_at
        FROM wms.replenishment_order_items WHERE order_id = $1
        ORDER BY line_number
        "#,
    )
    .bind(id)
    .fetch_all(&state.db)
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
                "created_at": row.try_get::<chrono::NaiveDateTime, _>("created_at").ok().map(|t| t.to_string()),
                "updated_at": row.try_get::<chrono::NaiveDateTime, _>("updated_at").ok().map(|t| t.to_string()),
            })).collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items_json,
                    "total": items.len()
                }),
                "获取补货订单明细成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取补货订单明细失败: {}", e);
            Json(api_error(500, "获取补货订单明细失败"))
        }
    }
}

#[utoipa::path(
    post,
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
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let now = Utc::now().naive_utc();

    let result = sqlx::query(
        r#"
        UPDATE wms.replenishment_orders SET
            status = 'confirmed',
            updated_at = $2
        WHERE id = $1 AND status = 'pending'
        RETURNING id, order_number, status, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(row) => Json(ApiResponse::success(
            serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "order_number": row.try_get::<String, _>("order_number").ok(),
                "status": "confirmed",
                "updated_at": now.to_string(),
            }),
            "确认补货订单成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "补货订单不存在或状态不正确")),
        Err(e) => {
            tracing::error!("确认补货订单失败: {}", e);
            Json(api_error(500, "确认补货订单失败"))
        }
    }
}

#[utoipa::path(
    post,
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
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let now = Utc::now().naive_utc();

    let result = sqlx::query(
        r#"
        UPDATE wms.replenishment_orders SET
            status = 'completed',
            updated_at = $2
        WHERE id = $1 AND status = 'confirmed'
        RETURNING id, order_number, status, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(row) => Json(ApiResponse::success(
            serde_json::json!({
                "id": row.try_get::<Uuid, _>("id").ok(),
                "order_number": row.try_get::<String, _>("order_number").ok(),
                "status": "completed",
                "updated_at": now.to_string(),
            }),
            "完成补货订单成功",
        )),
        Err(sqlx::Error::RowNotFound) => Json(api_error(404, "补货订单不存在或状态不正确")),
        Err(e) => {
            tracing::error!("完成补货订单失败: {}", e);
            Json(api_error(500, "完成补货订单失败"))
        }
    }
}
