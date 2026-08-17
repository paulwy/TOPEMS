use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use num_traits::cast::ToPrimitive;
use serde::Deserialize;
use sqlx::Row;
use uuid::Uuid;

use crate::models::{CreateInventoryItemRequest, InventoryItem, UpdateInventoryItemRequest};
use crate::modules::audit::log_audit_event;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse, ListResponse};

fn inventory_row_to_json(row: &sqlx::postgres::PgRow) -> serde_json::Value {
    serde_json::json!({
        "id": row.get::<uuid::Uuid, _>("id"),
        "sku": row.get::<String, _>("sku"),
        "name": row.get::<String, _>("name"),
        "specification": row.get::<Option<String>, _>("specification"),
        "unit": row.get::<Option<String>, _>("unit"),
        "quantity": row.get::<bigdecimal::BigDecimal, _>("quantity").to_f64().unwrap_or(0.0),
        "available_quantity": row.get::<Option<bigdecimal::BigDecimal>, _>("available_quantity").map(|v| v.to_f64().unwrap_or(0.0)),
        "location_id": row.get::<Option<Uuid>, _>("location_id"),
        "warehouse_id": row.get::<Option<Uuid>, _>("warehouse_id"),
        "min_quantity": row.get::<Option<bigdecimal::BigDecimal>, _>("min_quantity").map(|v| v.to_f64().unwrap_or(0.0)),
        "max_quantity": row.get::<Option<bigdecimal::BigDecimal>, _>("max_quantity").map(|v| v.to_f64().unwrap_or(0.0)),
        "status": row.get::<String, _>("status"),
        "created_at": row.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
        "updated_at": row.get::<chrono::DateTime<chrono::Utc>, _>("updated_at"),
    })
}

/// V19.7: 生成库存移动单号 MV-YYYYMMDD-6位序列号
async fn generate_inventory_movement_no(state: &ApiState, tenant_id: Uuid) -> String {
    let today = Utc::now().format("%Y%m%d").to_string();
    let prefix = format!("MV-{}", today);
    let seq: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM wms.inventory_movements
           WHERE tenant_id = $1 AND movement_no LIKE $2"#,
    )
    .bind(tenant_id)
    .bind(format!("{}%", prefix))
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);
    format!("{}-{:06}", prefix, seq + 1)
}

/// V19.7: 从 Claims 中解析 tenant_id
fn resolve_tenant_id(claims: &Claims) -> Result<Uuid, String> {
    match &claims.tenant_id {
        Some(id) => Uuid::parse_str(id).map_err(|e| format!("无效的租户ID: {}", e)),
        None => Err("缺少租户ID".to_string()),
    }
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
        .route("/inventory", get(list_inventory).post(create_inventory))
        .route("/inventory/low-stock", get(list_low_stock_inventory))
        .route(
            "/inventory/warehouse/{warehouse_id}",
            get(list_inventory_by_warehouse),
        )
        .route("/inventory/statistics", get(get_inventory_statistics))
        .route("/inventory/abc-analysis", get(get_abc_analysis))
        .route("/inventory/turnover", get(get_turnover))
        .route("/inventory/value-by-warehouse", get(get_value_by_warehouse))
        .route(
            "/inventory/{id}",
            get(get_inventory)
                .put(update_inventory)
                .delete(delete_inventory),
        )
}

#[utoipa::path(
    get,
    path = "/api/wms/inventory",
    responses(
        (status = 200, description = "list_inventory OK")
    ),
    tag = "WMS/inventory"
)]
pub async fn list_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InventoryPaginationParams>,
) -> Json<ApiResponse<ListResponse<serde_json::Value>>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
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
    .bind(warehouse_id)
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
            .bind(warehouse_id)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            let items_json: Vec<serde_json::Value> =
                items.iter().map(inventory_row_to_json).collect();

            Json(ApiResponse::success(
                ListResponse::with_pagination(items_json, total, page, page_size),
                "获取库存列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取库存列表失败: {}", e);
            Json(api_error(500, "获取库存列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/wms/inventory",
    responses(
        (status = 201, description = "创建成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 500, description = "服务内部错误")
    ),
    tag = "WMS/inventory"
)]
pub async fn create_inventory(
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
        INSERT INTO wms.inventory (id, org_id, warehouse_id, location_id, 
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
    .bind(req.warehouse_id)
    .bind(req.location_id)
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

#[utoipa::path(
    get,
    path = "/api/wms/inventory/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "查询成功", body = Inventory, content_type = "application/json"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    ),
    tag = "WMS/inventory"
)]
pub async fn get_inventory(
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

#[utoipa::path(
    put,
    path = "/api/wms/inventory/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "更新成功"),
        (status = 400, description = "请求参数错误"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    ),
    tag = "WMS/inventory"
)]
pub async fn update_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateInventoryItemRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let tenant_id = match resolve_tenant_id(&claims) {
        Ok(id) => id,
        Err(msg) => return Json(api_error(401, &msg)),
    };
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

    let sku = req.sku.unwrap_or_else(|| {
        existing
            .try_get::<String, _>("material_code")
            .unwrap_or_default()
    });
    let name = req.name.unwrap_or_else(|| {
        existing
            .try_get::<String, _>("material_name")
            .unwrap_or_default()
    });
    let specification = req.specification.or_else(|| {
        existing
            .try_get::<Option<String>, _>("specification")
            .ok()
            .flatten()
    });
    let unit = req
        .unit
        .or_else(|| existing.try_get::<Option<String>, _>("unit").ok().flatten());
    let quantity = req
        .quantity
        .unwrap_or_else(|| existing.try_get::<f64, _>("quantity").unwrap_or(0.0));
    let available_quantity = req.quantity.unwrap_or_else(|| {
        existing
            .try_get::<f64, _>("available_quantity")
            .unwrap_or(0.0)
    });
    let location_id = req.location_id.or_else(|| {
        existing
            .try_get::<Option<Uuid>, _>("location_id")
            .ok()
            .flatten()
    });
    let warehouse_id = req.warehouse_id.or_else(|| {
        existing
            .try_get::<Option<Uuid>, _>("warehouse_id")
            .ok()
            .flatten()
    });
    let min_quantity = req.min_quantity.or_else(|| {
        existing
            .try_get::<Option<f64>, _>("min_quantity")
            .ok()
            .flatten()
    });
    let max_quantity = req.max_quantity.or_else(|| {
        existing
            .try_get::<Option<f64>, _>("max_quantity")
            .ok()
            .flatten()
    });
    let status = req.status.unwrap_or_else(|| {
        existing
            .try_get::<String, _>("quality_status")
            .unwrap_or("normal".to_string())
    });
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
    .bind(location_id)
    .bind(warehouse_id)
    .bind(min_quantity)
    .bind(max_quantity)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, response_data) = match &result {
        Ok(item) => {
            let item_json = inventory_row_to_json(item);

            // V19.7: 库存变更时同步写入 inventory_movements 记录
            // 解决"写入断链"问题：之前 update_inventory 只更新主表，下游 smart_replenishment 读空表
            let old_quantity: f64 = existing.try_get::<f64, _>("quantity").unwrap_or(0.0);
            let quantity_diff = quantity - old_quantity;
            if quantity_diff.abs() > f64::EPSILON {
                let movement_no = generate_inventory_movement_no(&state, tenant_id).await;
                let movement_id = Uuid::new_v4();
                let operator_id = Uuid::parse_str(&claims.sub).ok();
                let movement_type = if quantity_diff > 0.0 {
                    "adjustment_in"
                } else {
                    "adjustment_out"
                };
                let abs_qty = quantity_diff.abs();

                if let Err(e) = sqlx::query(
                    r#"
                    INSERT INTO wms.inventory_movements (
                        id, movement_no, tenant_id, movement_type, reference_id, reference_type,
                        material_id, material_code, material_name, quantity,
                        from_location_id, to_location_id, from_warehouse_id, to_warehouse_id,
                        status, performed_by, performed_at, notes, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, $4, $5, 'inventory_adjustment',
                        $6, $7, $8, $9,
                        NULL, $10, NULL, $11,
                        'completed', $12, $13, $14, $15, $15
                    )
                    "#,
                )
                .bind(movement_id)
                .bind(&movement_no)
                .bind(tenant_id)
                .bind(movement_type)
                .bind(id.to_string())
                .bind(id)
                .bind(&sku)
                .bind(&name)
                .bind(abs_qty)
                .bind(location_id)
                .bind(warehouse_id)
                .bind(operator_id)
                .bind(now)
                .bind(format!("库存调整：{} → {}", old_quantity, quantity))
                .bind(now)
                .execute(&state.db)
                .await
                {
                    tracing::warn!("写入 inventory_movements 失败（不阻塞主流程）: {}", e);
                }
            }

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

#[utoipa::path(
    delete,
    path = "/api/wms/inventory/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),
    responses(
        (status = 200, description = "删除成功"),
        (status = 401, description = "未授权"),
        (status = 404, description = "资源不存在"),
        (status = 500, description = "服务内部错误")
    ),
    tag = "WMS/inventory"
)]
pub async fn delete_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"UPDATE wms.inventory SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL"#,
    )
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

#[utoipa::path(
    get,
    path = "/api/wms/inventory/low-stock",
    responses(
        (status = 200, description = "list_low_stock_inventory OK")
    ),
    tag = "WMS/inventory"
)]
pub async fn list_low_stock_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
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
            let items_json: Vec<serde_json::Value> =
                items.iter().map(inventory_row_to_json).collect();
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

#[utoipa::path(
    get,
    path = "/api/wms/inventory/warehouse/{warehouse_id}",
    params(
        ("warehouse_id" = Uuid, Path, description = "warehouse_id")
    ),
    responses(
        (status = 200, description = "list_inventory_by_warehouse OK")
    ),
    tag = "WMS/inventory"
)]
pub async fn list_inventory_by_warehouse(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(warehouse_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
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
            let items_json: Vec<serde_json::Value> =
                items.iter().map(inventory_row_to_json).collect();
            let total_quantity: f64 = items
                .iter()
                .filter_map(|r| r.try_get::<f64, _>("quantity").ok())
                .sum();
            let total_value: f64 = items
                .iter()
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

#[utoipa::path(
    get,
    path = "/api/wms/inventory/statistics",
    responses(
        (status = 200, description = "get_inventory_statistics OK")
    ),
    tag = "WMS/inventory"
)]
pub async fn get_inventory_statistics(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InventoryPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let warehouse_id = params.warehouse_id;

    let result = sqlx::query(
        r#"
        SELECT 
            COUNT(*) as total_items,
            SUM(quantity) as total_quantity,
            SUM(available_quantity) as total_available,
            SUM(reserved_quantity) as total_reserved,
            SUM(total_value) as total_value,
            COUNT(*) FILTER (WHERE quantity <= COALESCE(min_quantity, 0)) as low_stock_count,
            COUNT(*) FILTER (WHERE quantity = 0) as out_of_stock_count
        FROM wms.inventory
        WHERE ($1::uuid IS NULL OR warehouse_id = $1)
          AND deleted_at IS NULL
        "#,
    )
    .bind(warehouse_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(row) => {
            let total_items = row.try_get::<i64, _>("total_items").unwrap_or(0);
            let total_quantity: f64 = row
                .try_get::<Option<bigdecimal::BigDecimal>, _>("total_quantity")
                .ok()
                .flatten()
                .and_then(|v| v.to_f64())
                .unwrap_or(0.0);
            let total_available: f64 = row
                .try_get::<Option<bigdecimal::BigDecimal>, _>("total_available")
                .ok()
                .flatten()
                .and_then(|v| v.to_f64())
                .unwrap_or(0.0);
            let total_reserved: f64 = row
                .try_get::<Option<bigdecimal::BigDecimal>, _>("total_reserved")
                .ok()
                .flatten()
                .and_then(|v| v.to_f64())
                .unwrap_or(0.0);
            let total_value: f64 = row
                .try_get::<Option<bigdecimal::BigDecimal>, _>("total_value")
                .ok()
                .flatten()
                .and_then(|v| v.to_f64())
                .unwrap_or(0.0);
            let low_stock_count = row.try_get::<i64, _>("low_stock_count").unwrap_or(0);
            let out_of_stock_count = row.try_get::<i64, _>("out_of_stock_count").unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "total_items": total_items,
                    "total_quantity": total_quantity,
                    "total_available": total_available,
                    "total_reserved": total_reserved,
                    "total_value": total_value,
                    "low_stock_count": low_stock_count,
                    "out_of_stock_count": out_of_stock_count,
                    "warehouse_id": warehouse_id
                }),
                "获取库存统计成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取库存统计失败: {}", e);
            Json(api_error(500, "获取库存统计失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/wms/inventory/abc-analysis",
    responses(
        (status = 200, description = "get_abc_analysis OK")
    ),
    tag = "WMS/inventory"
)]
pub async fn get_abc_analysis(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query(
        r#"
        SELECT 
            material_code,
            material_name,
            SUM(total_value) as value
        FROM wms.inventory
        WHERE deleted_at IS NULL
        GROUP BY material_code, material_name
        ORDER BY value DESC
        "#,
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let total_value: f64 = rows
                .iter()
                .filter_map(|r| {
                    r.try_get::<Option<bigdecimal::BigDecimal>, _>("value")
                        .ok()
                        .flatten()
                })
                .filter_map(|v| v.to_f64())
                .sum();

            let mut items: Vec<serde_json::Value> = Vec::new();
            let mut cumulative_value = 0.0;

            for row in rows.iter() {
                let value: f64 = row
                    .try_get::<Option<bigdecimal::BigDecimal>, _>("value")
                    .ok()
                    .flatten()
                    .and_then(|v| v.to_f64())
                    .unwrap_or(0.0);
                cumulative_value += value;
                let percentage = if total_value > 0.0 {
                    cumulative_value / total_value * 100.0
                } else {
                    0.0
                };

                let category = if percentage <= 80.0 {
                    "A"
                } else if percentage <= 95.0 {
                    "B"
                } else {
                    "C"
                };

                items.push(serde_json::json!({
                    "material_code": row.try_get::<String, _>("material_code").unwrap_or_default(),
                    "material_name": row.try_get::<String, _>("material_name").unwrap_or_default(),
                    "value": value,
                    "percentage": percentage,
                    "category": category
                }));
            }

            let a_count = items.iter().filter(|i| i["category"] == "A").count() as i64;
            let b_count = items.iter().filter(|i| i["category"] == "B").count() as i64;
            let c_count = items.iter().filter(|i| i["category"] == "C").count() as i64;

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total_sku": rows.len() as i64,
                    "total_value": total_value,
                    "a_count": a_count,
                    "b_count": b_count,
                    "c_count": c_count
                }),
                "获取ABC分析成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取ABC分析失败: {}", e);
            Json(api_error(500, "获取ABC分析失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/wms/inventory/turnover",
    responses(
        (status = 200, description = "get_turnover OK")
    ),
    tag = "WMS/inventory"
)]
pub async fn get_turnover(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query(
        r#"
        SELECT 
            DATE_TRUNC('month', created_at) as period,
            COUNT(*) as transaction_count,
            SUM(quantity) as total_quantity
        FROM wms.inventory
        WHERE deleted_at IS NULL
          AND created_at >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY period ASC
        "#,
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let items: Vec<serde_json::Value> = rows
                .iter()
                .map(|row| {
                    let period: Option<String> = row
                        .try_get::<Option<chrono::NaiveDateTime>, _>("period")
                        .ok()
                        .flatten()
                        .map(|dt| dt.format("%Y-%m").to_string());
                    let transaction_count = row.try_get::<i64, _>("transaction_count").unwrap_or(0);
                    let total_quantity: f64 = row
                        .try_get::<Option<bigdecimal::BigDecimal>, _>("total_quantity")
                        .ok()
                        .flatten()
                        .and_then(|v| v.to_f64())
                        .unwrap_or(0.0);

                    serde_json::json!({
                        "period": period,
                        "transaction_count": transaction_count,
                        "total_quantity": total_quantity
                    })
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({ "items": items }),
                "获取库存周转数据成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取库存周转数据失败: {}", e);
            Json(api_error(500, "获取库存周转数据失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/wms/inventory/value-by-warehouse",
    responses(
        (status = 200, description = "get_value_by_warehouse OK")
    ),
    tag = "WMS/inventory"
)]
pub async fn get_value_by_warehouse(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query(
        r#"
        SELECT 
            i.warehouse_id,
            w.name as warehouse_name,
            SUM(i.total_value) as total_value,
            COUNT(*) as item_count
        FROM wms.inventory i
        LEFT JOIN wms.warehouses w ON i.warehouse_id = w.id
        WHERE i.deleted_at IS NULL
        GROUP BY i.warehouse_id, w.name
        ORDER BY total_value DESC
        "#,
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rows) => {
            let total_value: f64 = rows
                .iter()
                .filter_map(|r| {
                    r.try_get::<Option<bigdecimal::BigDecimal>, _>("total_value")
                        .ok()
                        .flatten()
                })
                .filter_map(|v| v.to_f64())
                .sum();

            let items: Vec<serde_json::Value> = rows
                .iter()
                .map(|row| {
                    let warehouse_id: Option<Uuid> = row
                        .try_get::<Option<Uuid>, _>("warehouse_id")
                        .ok()
                        .flatten();
                    let warehouse_name: Option<String> = row
                        .try_get::<Option<String>, _>("warehouse_name")
                        .ok()
                        .flatten();
                    let value: f64 = row
                        .try_get::<Option<bigdecimal::BigDecimal>, _>("total_value")
                        .ok()
                        .flatten()
                        .and_then(|v| v.to_f64())
                        .unwrap_or(0.0);
                    let item_count = row.try_get::<i64, _>("item_count").unwrap_or(0);

                    serde_json::json!({
                        "warehouse_id": warehouse_id,
                        "warehouse_name": warehouse_name,
                        "total_value": value,
                        "item_count": item_count
                    })
                })
                .collect();

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total_value": total_value
                }),
                "获取按仓库统计库存价值成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取按仓库统计库存价值失败: {}", e);
            Json(api_error(500, "获取按仓库统计库存价值失败"))
        }
    }
}
