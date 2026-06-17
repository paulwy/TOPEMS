use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::api::audit::log_audit_event;
use crate::api::ApiState;
use crate::models::{CreateInventoryItemRequest, InventoryItem, UpdateInventoryItemRequest};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct InventoryPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub warehouse_id: Option<Uuid>,
}

pub fn create_routes<S>() -> Router<S>
where
    S: Clone + Send + Sync + 'static,
    ApiState: FromRef<S>,
{
    Router::new()
        .route(
            "/api/wms/inventory",
            get(list_inventory).post(create_inventory),
        )
        .route(
            "/api/v1/inventory/{id}",
            get(get_inventory)
                .put(update_inventory)
                .delete(delete_inventory),
        )
}

async fn list_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InventoryPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let warehouse_id = params.warehouse_id;

    let result = sqlx::query_as::<_, InventoryItem>(
        r#"
        SELECT id, sku, name, specification, unit, quantity, location_id, warehouse_id, 
               min_quantity, max_quantity, status, created_at, updated_at
        FROM inventory_items
        WHERE ($1::text IS NULL OR name ILIKE $1 OR sku ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR warehouse_id = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(&warehouse_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM inventory_items
                WHERE ($1::text IS NULL OR name ILIKE $1 OR sku ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR warehouse_id = $3)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&warehouse_id)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取库存列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取库存列表失败: {}", e);
            Json(api_error(500, "获取库存列表失败"))
        }
    }
}

async fn create_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateInventoryItemRequest>,
) -> Json<ApiResponse<InventoryItem>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, InventoryItem>(
        r#"
        INSERT INTO inventory_items (id, sku, name, specification, unit, quantity, location_id, 
                                     warehouse_id, min_quantity, max_quantity, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'normal', $11, $12)
        RETURNING id, sku, name, specification, unit, quantity, location_id, 
                  warehouse_id, min_quantity, max_quantity, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.sku)
    .bind(&req.name)
    .bind(&req.specification)
    .bind(&req.unit)
    .bind(req.quantity)
    .bind(&req.location_id)
    .bind(&req.warehouse_id)
    .bind(req.min_quantity)
    .bind(req.max_quantity)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(item) => (
            Json(ApiResponse::success(item.clone(), "库存创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建库存失败: {}", e);
            (
                Json(api_error(500, "库存创建失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(item) = &result {
        serde_json::to_value(item).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "inventory".to_string(),
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

async fn get_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<InventoryItem>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, InventoryItem>(
        r#"
        SELECT id, sku, name, specification, unit, quantity, location_id, warehouse_id, 
               min_quantity, max_quantity, status, created_at, updated_at
        FROM inventory_items WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(item)) => Json(ApiResponse::success(item, "获取库存成功")),
        Ok(None) => Json(api_error(404, "库存不存在")),
        Err(e) => {
            tracing::error!("获取库存失败: {}", e);
            Json(api_error(500, "获取库存失败"))
        }
    }
}

async fn update_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateInventoryItemRequest>,
) -> Json<ApiResponse<InventoryItem>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    // 先获取 request_data 避免所有权问题
    let request_data = serde_json::to_value(&req).ok();

    let existing = sqlx::query_as::<_, InventoryItem>(
        r#"
        SELECT id, sku, name, specification, unit, quantity, location_id, warehouse_id, 
               min_quantity, max_quantity, status, created_at, updated_at FROM inventory_items WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(i)) => i,
        Ok(None) => return Json(api_error(404, "库存不存在")),
        Err(e) => return Json(api_error(500, &format!("查询库存失败: {}", e))),
    };

    let sku = req.sku.unwrap_or(existing.sku);
    let name = req.name.unwrap_or(existing.name);
    let specification = req.specification.or(existing.specification);
    let unit = req.unit.or(existing.unit);
    let quantity = req.quantity.unwrap_or(existing.quantity);
    let location_id = req.location_id.or(existing.location_id);
    let warehouse_id = req.warehouse_id.or(existing.warehouse_id);
    let min_quantity = req.min_quantity.or(existing.min_quantity);
    let max_quantity = req.max_quantity.or(existing.max_quantity);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, InventoryItem>(
        r#"
        UPDATE inventory_items SET
            sku = $2, name = $3, specification = $4, unit = $5, quantity = $6, 
            location_id = $7, warehouse_id = $8, min_quantity = $9, max_quantity = $10, 
            status = $11, updated_at = $12
        WHERE id = $1
        RETURNING id, sku, name, specification, unit, quantity, location_id, 
                  warehouse_id, min_quantity, max_quantity, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&sku)
    .bind(&name)
    .bind(&specification)
    .bind(&unit)
    .bind(quantity)
    .bind(&location_id)
    .bind(&warehouse_id)
    .bind(min_quantity)
    .bind(max_quantity)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(item) => (
            Json(ApiResponse::success(item.clone(), "库存更新成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新库存失败: {}", e);
            (
                Json(api_error(500, "库存更新失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(item) = &result {
        serde_json::to_value(item).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "inventory".to_string(),
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

async fn delete_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query("DELETE FROM inventory_items WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "库存删除成功")),
            "success",
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "库存不存在")),
            "error",
            Some("库存不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除库存失败: {}", e);
            (
                Json(api_error(500, "库存删除失败")),
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
        "inventory".to_string(),
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
