use axum::{
    extract::{Extension, Path, Query, State},
    routing::*,
    Json, Router,
};
use uuid::Uuid;

use super::ApiState;
use crate::models::material::{CreateInventoryRequest, Inventory, UpdateInventoryRequest};
use crate::modules::inventory_calc::{
    build_search_pattern, calculate_total_amount, default_inventory_status, default_unit_price,
    has_inventory_filters, material_info_fallback, normalize_pagination,
};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse, PaginationParams};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/inventory", get(list_inventory).post(create_inventory))
        .route(
            "/inventory/{id}",
            get(get_inventory)
                .put(update_inventory)
                .delete(delete_inventory),
        )
        .route("/inventory/low-stock", get(get_low_stock))
}

#[utoipa::path(
    get,
    path = "/erp/inventory",
    responses(
        (status = 200, description = "list_inventory OK")
    ),
    tag = "ERP/inventory"
)]
pub async fn list_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Inventory>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let (page, page_size, offset) = normalize_pagination(params.page, params.page_size);

    let search_pattern = build_search_pattern(params.search.as_deref());
    let status_filter = params.status.clone();

    let inventory_result = if has_inventory_filters(
        params.search.as_deref(),
        status_filter.as_deref(),
    ) {
        let search = search_pattern.unwrap_or_default();
        let status = status_filter.clone();

        sqlx::query_as::<_, Inventory>(
            r#"SELECT id, material_id, material_code, material_name, warehouse_id, warehouse_name, location_code, quantity, available_quantity, reserved_quantity, unit, unit_price, total_amount, batch_no, expire_date, status, created_at, updated_at 
               FROM inventory 
               WHERE (material_code ILIKE $1 OR material_name ILIKE $1 OR location_code ILIKE $1)
                 AND ($2 = '' OR status = $2)
               ORDER BY created_at DESC LIMIT $3 OFFSET $4"#
        )
        .bind(search)
        .bind(status.unwrap_or_default())
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    } else {
        sqlx::query_as::<_, Inventory>(
            "SELECT id, material_id, material_code, material_name, warehouse_id, warehouse_name, location_code, quantity, available_quantity, reserved_quantity, unit, unit_price, total_amount, batch_no, expire_date, status, created_at, updated_at FROM inventory ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        )
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await
    };

    let inventory = match inventory_result {
        Ok(i) => i,
        Err(e) => {
            tracing::error!("查询库存失败: {}", e);
            return Json(api_error(500, "查询库存失败"));
        }
    };

    let total = match sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM inventory WHERE deleted_at IS NULL AND (material_code ILIKE $1 OR material_name ILIKE $1 OR location_code ILIKE $1) AND ($2 = '' OR status = $2)"#
    )
    .bind(params.search.as_deref().map(|s| format!("%{}%", s)).unwrap_or_default())
    .bind(status_filter.as_deref().unwrap_or(""))
    .fetch_one(&state.db)
    .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("查询库存总数失败: {}", e);
            return Json(api_error(500, "查询库存总数失败"));
        }
    };

    Json(ApiResponse::success(
        PaginatedResponse::new(inventory, total, page, page_size),
        "获取库存列表成功",
    ))
}

#[utoipa::path(
    get,
    path = "/erp/inventory/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "get_inventory OK")
    ),
    tag = "ERP/inventory"
)]
pub async fn get_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Inventory>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, Inventory>(
        "SELECT id, material_id, material_code, material_name, warehouse_id, warehouse_name, location_code, quantity, available_quantity, reserved_quantity, unit, unit_price, total_amount, batch_no, expire_date, status, created_at, updated_at FROM inventory WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(inventory)) => Json(ApiResponse::success(inventory, "获取库存成功")),
        Ok(None) => Json(api_error(404, "库存不存在")),
        Err(e) => {
            tracing::error!("查询库存失败: {}", e);
            Json(api_error(500, "查询库存失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/erp/inventory",
    request_body = CreateInventoryRequest,
    responses(
        (status = 200, description = "create_inventory OK")
    ),
    tag = "ERP/inventory"
)]
pub async fn create_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(body): Json<CreateInventoryRequest>,
) -> Json<ApiResponse<Inventory>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let material_result = sqlx::query_as::<_, (String, String, String)>(
        "SELECT code, name, unit FROM materials WHERE id = $1",
    )
    .bind(body.material_id)
    .fetch_optional(&state.db)
    .await;

    let (material_code, material_name, unit) =
        material_info_fallback(material_result.ok().flatten());

    let unit_price = default_unit_price(body.unit_price);
    let total_amount = calculate_total_amount(body.unit_price, body.quantity);

    let result = sqlx::query_as::<_, Inventory>(
        "INSERT INTO inventory (material_id, material_code, material_name, warehouse_id, warehouse_name, location_code, quantity, available_quantity, reserved_quantity, unit, unit_price, total_amount, batch_no, expire_date, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id, material_id, material_code, material_name, warehouse_id, warehouse_name, location_code, quantity, available_quantity, reserved_quantity, unit, unit_price, total_amount, batch_no, expire_date, status, created_at, updated_at",
    )
    .bind(body.material_id)
    .bind(material_code)
    .bind(material_name)
    .bind(body.warehouse_id)
    .bind("")
    .bind(body.location_code)
    .bind(body.quantity)
    .bind(body.quantity)
    .bind(0.0)
    .bind(unit)
    .bind(unit_price)
    .bind(total_amount)
    .bind(body.batch_no)
    .bind(body.expire_date)
    .bind(default_inventory_status(body.status))
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(inventory)) => Json(ApiResponse::success(inventory, "创建库存成功")),
        Ok(None) => Json(api_error(500, "创建库存失败")),
        Err(e) => {
            tracing::error!("创建库存失败: {}", e);
            Json(api_error(500, "创建库存失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/erp/inventory/{id}",
    request_body = UpdateInventoryRequest,
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "update_inventory OK")
    ),
    tag = "ERP/inventory"
)]
pub async fn update_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(body): Json<UpdateInventoryRequest>,
) -> Json<ApiResponse<Inventory>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query_as::<_, Inventory>(
        "UPDATE inventory SET warehouse_id = COALESCE($1, warehouse_id), location_code = COALESCE($2, location_code), quantity = COALESCE($3, quantity), available_quantity = COALESCE($3, available_quantity), unit_price = COALESCE($4, unit_price), total_amount = COALESCE($4, unit_price) * COALESCE($3, quantity), batch_no = COALESCE($5, batch_no), expire_date = COALESCE($6, expire_date), status = COALESCE($7, status), updated_at = NOW() WHERE id = $8 RETURNING id, material_id, material_code, material_name, warehouse_id, warehouse_name, location_code, quantity, available_quantity, reserved_quantity, unit, unit_price, total_amount, batch_no, expire_date, status, created_at, updated_at",
    )
    .bind(body.warehouse_id)
    .bind(body.location_code)
    .bind(body.quantity)
    .bind(body.unit_price)
    .bind(body.batch_no)
    .bind(body.expire_date)
    .bind(body.status)
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(inventory)) => Json(ApiResponse::success(inventory, "更新库存成功")),
        Ok(None) => Json(api_error(404, "库存不存在")),
        Err(e) => {
            tracing::error!("更新库存失败: {}", e);
            Json(api_error(500, "更新库存失败"))
        }
    }
}

#[utoipa::path(
    delete,
    path = "/erp/inventory/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "delete_inventory OK")
    ),
    tag = "ERP/inventory"
)]
pub async fn delete_inventory(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query("UPDATE inventory SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("删除成功".to_string(), "删除库存成功"))
        }
        Ok(_) => Json(api_error(404, "库存不存在")),
        Err(e) => {
            tracing::error!("删除库存失败: {}", e);
            Json(api_error(500, "删除库存失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/erp/inventory/low-stock",
    tag = "ERP/inventory",
    responses((status = 200, description = "获取低库存列表成功", body = ApiResponse<Vec<Inventory>>))
)]
pub async fn get_low_stock(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Vec<Inventory>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let low_stock = match sqlx::query_as::<_, Inventory>(
        "SELECT i.id, i.material_id, i.material_code, i.material_name, i.warehouse_id, i.warehouse_name, i.location_code, i.quantity, i.available_quantity, i.reserved_quantity, i.unit, i.unit_price, i.total_amount, i.batch_no, i.expire_date, i.status, i.created_at, i.updated_at FROM inventory i JOIN materials m ON i.material_id = m.id WHERE i.quantity < m.safety_stock AND i.status = 'active' ORDER BY i.quantity ASC",
    )
    .fetch_all(&state.db)
    .await
    {
        Ok(l) => l,
        Err(e) => {
            tracing::error!("查询低库存失败: {}", e);
            return Json(api_error(500, "查询低库存失败"));
        }
    };

    Json(ApiResponse::success(low_stock, "获取低库存列表成功"))
}
