use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::Row;
use uuid::Uuid;

use crate::api::audit::log_audit_event;
use crate::api::ApiState;
use crate::models::{CreateInventoryItemRequest, InventoryItem, UpdateInventoryItemRequest};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

fn inventory_row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "sku": row.try_get::<String, _>("sku").ok(),
        "name": row.try_get::<String, _>("name").ok(),
        "specification": row.try_get::<Option<String>, _>("specification").ok(),
        "unit": row.try_get::<Option<String>, _>("unit").ok(),
        "quantity": row.try_get::<f64, _>("quantity").ok(),
        "available_quantity": row.try_get::<f64, _>("available_quantity").ok(),
        "reserved_quantity": row.try_get::<Option<f64>, _>("reserved_quantity").ok(),
        "location_id": row.try_get::<Option<Uuid>, _>("location_id").ok(),
        "warehouse_id": row.try_get::<Uuid, _>("warehouse_id").ok(),
        "min_quantity": row.try_get::<Option<f64>, _>("min_quantity").ok(),
        "max_quantity": row.try_get::<Option<f64>, _>("max_quantity").ok(),
        "reorder_point": row.try_get::<Option<f64>, _>("reorder_point").ok(),
        "status": row.try_get::<String, _>("status").ok(),
        "batch_number": row.try_get::<Option<String>, _>("batch_number").ok(),
        "lot_number": row.try_get::<Option<String>, _>("lot_number").ok(),
        "expiry_date": row.try_get::<Option<String>, _>("expiry_date").ok(),
        "supplier_name": row.try_get::<Option<String>, _>("supplier_name").ok(),
        "supplier_code": row.try_get::<Option<String>, _>("supplier_code").ok(),
        "purchase_price": row.try_get::<Option<f64>, _>("purchase_price").ok(),
        "total_value": row.try_get::<Option<f64>, _>("total_value").ok(),
        "last_movement_date": row.try_get::<Option<String>, _>("last_movement_date").ok(),
        "last_movement_type": row.try_get::<Option<String>, _>("last_movement_type").ok(),
        "created_at": row.try_get::<chrono::NaiveDateTime, _>("created_at").ok().map(|t| t.to_string()),
        "updated_at": row.try_get::<chrono::NaiveDateTime, _>("updated_at").ok().map(|t| t.to_string()),
    })
}

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
            "/api/wms/inventory/{id}",
            get(get_inventory)
                .put(update_inventory)
                .delete(delete_inventory),
        )
        .route("/api/wms/inventory/low-stock", get(list_low_stock_inventory))
        .route("/api/wms/inventory/warehouse/{warehouse_id}", get(list_inventory_by_warehouse))
}

async fn list_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InventoryPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let warehouse_id = params.warehouse_id;

    let result = sqlx::query(
        r#"
        SELECT id, material_code as sku, material_name as name, specification, unit, quantity, 
               available_quantity, reserved_quantity, location_id, warehouse_id, 
               min_quantity, max_quantity, reorder_point, quality_status as status,
               batch_number, lot_number, expiry_date, supplier_name, total_value,
               created_at, updated_at
        FROM wms.inventory
        WHERE ($1::text IS NULL OR material_name ILIKE $1 OR material_code ILIKE $1)
          AND ($2::text IS NULL OR quality_status = $2)
          AND ($3::uuid IS NULL OR warehouse_id = $3)
          AND deleted_at IS NULL
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
                SELECT COUNT(*) FROM wms.inventory
                WHERE ($1::text IS NULL OR material_name ILIKE $1 OR material_code ILIKE $1)
                  AND ($2::text IS NULL OR quality_status = $2)
                  AND ($3::uuid IS NULL OR warehouse_id = $3)
                  AND deleted_at IS NULL
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&warehouse_id)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let items_json: Vec<serde_json::Value> = items.iter().map(inventory_row_to_json).collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items_json,
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
        Ok(_) => {},
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, InventoryItem>(
        r#"
        INSERT INTO wms.inventory (id, organization_id, warehouse_id, location_id, 
                                   material_code, material_name, specification, 
                                   quantity, unit, available_quantity, 
                                   min_quantity, max_quantity, quality_status, created_at, updated_at)
        VALUES ($1, '00000000-0000-0000-0000-000000000001', $2, $3, $4, $5, $6, $7, $8, $7, $9, $10, 'qualified', $11, $12)
        RETURNING id, material_code as sku, material_name as name, specification, unit, quantity, 
                  location_id, warehouse_id, min_quantity, max_quantity, quality_status as status,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.warehouse_id)
    .bind(&req.location_id)
    .bind(&req.sku)
    .bind(&req.name)
    .bind(&req.specification)
    .bind(req.quantity)
    .bind(&req.unit)
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
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"
        SELECT id, material_code as sku, material_name as name, specification, unit, quantity, 
               available_quantity, reserved_quantity, location_id, warehouse_id, 
               min_quantity, max_quantity, reorder_point, quality_status as status,
               batch_number, lot_number, expiry_date, supplier_name, supplier_code, 
               purchase_price, total_value, last_movement_date, last_movement_type,
               created_at, updated_at
        FROM wms.inventory WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(item)) => {
            let item_json = inventory_row_to_json(&item);
            Json(ApiResponse::success(item_json, "获取库存成功"))
        }
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
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();

    let existing_result = sqlx::query(
        r#"
        SELECT id, material_code, material_name, specification, unit, quantity, 
               available_quantity, location_id, warehouse_id, min_quantity, max_quantity, quality_status
        FROM wms.inventory WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing_result {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "库存不存在")),
        Err(e) => return Json(api_error(500, &format!("查询库存失败: {}", e))),
    };

    let sku = req.sku.unwrap_or_else(|| existing.try_get::<String, _>("material_code").unwrap_or_default());
    let name = req.name.unwrap_or_else(|| existing.try_get::<String, _>("material_name").unwrap_or_default());
    let specification = req.specification.or_else(|| existing.try_get::<Option<String>, _>("specification").ok().flatten());
    let unit = req.unit.or_else(|| existing.try_get::<Option<String>, _>("unit").ok().flatten());
    let quantity = req.quantity.unwrap_or_else(|| existing.try_get::<f64, _>("quantity").unwrap_or(0.0));
    let available_quantity = req.quantity.unwrap_or_else(|| existing.try_get::<f64, _>("available_quantity").unwrap_or(0.0));
    let location_id = req.location_id.or_else(|| existing.try_get::<Option<Uuid>, _>("location_id").ok().flatten());
    let warehouse_id = req.warehouse_id.or_else(|| existing.try_get::<Option<Uuid>, _>("warehouse_id").ok().flatten());
    let min_quantity = req.min_quantity.or_else(|| existing.try_get::<Option<f64>, _>("min_quantity").ok().flatten());
    let max_quantity = req.max_quantity.or_else(|| existing.try_get::<Option<f64>, _>("max_quantity").ok().flatten());
    let status = req.status.unwrap_or_else(|| existing.try_get::<String, _>("quality_status").unwrap_or("normal".to_string()));
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        UPDATE wms.inventory SET
            material_code = $2, material_name = $3, specification = $4, unit = $5, 
            quantity = $6, available_quantity = $7, location_id = $8, warehouse_id = $9, 
            min_quantity = $10, max_quantity = $11, quality_status = $12, updated_at = $13
        WHERE id = $1 AND deleted_at IS NULL
        RETURNING id, material_code as sku, material_name as name, specification, unit, quantity, 
                  location_id, warehouse_id, min_quantity, max_quantity, quality_status as status,
                  created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&sku)
    .bind(&name)
    .bind(&specification)
    .bind(&unit)
    .bind(quantity)
    .bind(available_quantity)
    .bind(&location_id)
    .bind(&warehouse_id)
    .bind(min_quantity)
    .bind(max_quantity)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(item) => {
            let item_json = inventory_row_to_json(item);
            (
                Json(ApiResponse::success(item_json.clone(), "库存更新成功")),
                "success",
                None,
                Some(item_json),
            )
        }
        Err(e) => {
            tracing::error!("更新库存失败: {}", e);
            (
                Json(api_error(500, "库存更新失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
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
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query(r#"UPDATE wms.inventory SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL"#)
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

async fn list_low_stock_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"
        SELECT id, material_code as sku, material_name as name, specification, unit, quantity, 
               available_quantity, min_quantity, reorder_point, warehouse_id, location_id,
               batch_number, expiry_date, total_value
        FROM wms.inventory
        WHERE (min_quantity IS NOT NULL AND quantity <= min_quantity)
           OR (reorder_point IS NOT NULL AND available_quantity <= reorder_point)
          AND deleted_at IS NULL
        ORDER BY quantity ASC
        "#,
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let items_json: Vec<serde_json::Value> = items.iter().map(inventory_row_to_json).collect();
            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items_json,
                    "total": items.len()
                }),
                "获取低库存列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取低库存列表失败: {}", e);
            Json(api_error(500, "获取低库存列表失败"))
        }
    }
}

async fn list_inventory_by_warehouse(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(warehouse_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"
        SELECT id, material_code as sku, material_name as name, specification, unit, quantity, 
               available_quantity, reserved_quantity, location_id, min_quantity, max_quantity, 
               quality_status as status, batch_number, expiry_date, total_value
        FROM wms.inventory
        WHERE warehouse_id = $1 AND deleted_at IS NULL
        ORDER BY material_code ASC
        "#,
    )
    .bind(warehouse_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let items_json: Vec<serde_json::Value> = items.iter().map(inventory_row_to_json).collect();
            let total_quantity: f64 = items.iter()
                .filter_map(|r| r.try_get::<f64, _>("quantity").ok())
                .sum();
            let total_value: f64 = items.iter()
                .filter_map(|r| r.try_get::<f64, _>("total_value").ok())
                .sum();

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items_json,
                    "total": items.len(),
                    "total_quantity": total_quantity,
                    "total_value": total_value
                }),
                "获取仓库库存列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取仓库库存列表失败: {}", e);
            Json(api_error(500, "获取仓库库存列表失败"))
        }
    }
}