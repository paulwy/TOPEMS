use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{CreateStockTakeItemRequest, CreateStockTakeRequest, StockTake, StockTakeItem, UpdateStockTakeItemRequest, UpdateStockTakeRequest};
use crate::api::audit::log_audit_event;
use crate::api::ApiState;
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{ApiResponse, PaginationParams, api_error};

#[derive(Debug, Deserialize)]
pub struct StockTakePaginationParams {
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
        .route("/api/wms/stock-takes", get(list_stock_takes).post(create_stock_take))
        .route("/api/v1/stock-takes/{id}", get(get_stock_take).put(update_stock_take).delete(delete_stock_take))
        .route("/api/v1/stock-takes/{id}/items", get(list_stock_take_items).post(create_stock_take_item))
        .route("/api/v1/stock-takes/{id}/items/{item_id}", get(get_stock_take_item).put(update_stock_take_item).delete(delete_stock_take_item))
        .route("/api/v1/stock-takes/{id}/complete", post(complete_stock_take))
}

async fn list_stock_takes(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<StockTakePaginationParams>,
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

    let result = sqlx::query_as::<_, StockTake>(
        r#"
        SELECT id, warehouse_id, location_id, stock_take_number, status, start_time, end_time, remarks, created_at, updated_at
        FROM stock_takes
        WHERE ($1::text IS NULL OR stock_take_number ILIKE $1)
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
        Ok(stock_takes) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM stock_takes
                WHERE ($1::text IS NULL OR stock_take_number ILIKE $1)
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
                    "stock_takes": stock_takes,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取盘点列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取盘点列表失败: {}", e);
            Json(api_error(500, "获取盘点列表失败"))
        }
    }
}

async fn create_stock_take(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateStockTakeRequest>,
) -> Json<ApiResponse<StockTake>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, StockTake>(
        r#"
        INSERT INTO stock_takes (id, warehouse_id, location_id, stock_take_number, status, start_time, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8)
        RETURNING id, warehouse_id, location_id, stock_take_number, status, start_time, end_time, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.warehouse_id)
    .bind(&req.location_id)
    .bind(&req.stock_take_number)
    .bind(now)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(stock_take) => (
            Json(ApiResponse::success(stock_take.clone(), "盘点创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建盘点失败: {}", e);
            (
                Json(api_error(500, "盘点创建失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(stock_take) = &result {
        serde_json::to_value(stock_take).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "stock_take".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn get_stock_take(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<StockTake>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, StockTake>(
        r#"
        SELECT id, warehouse_id, location_id, stock_take_number, status, start_time, end_time, remarks, created_at, updated_at
        FROM stock_takes WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(stock_take)) => Json(ApiResponse::success(stock_take, "获取盘点成功")),
        Ok(None) => Json(api_error(404, "盘点不存在")),
        Err(e) => {
            tracing::error!("获取盘点失败: {}", e);
            Json(api_error(500, "获取盘点失败"))
        }
    }
}

async fn update_stock_take(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateStockTakeRequest>,
) -> Json<ApiResponse<StockTake>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    
    let existing = sqlx::query_as::<_, StockTake>(
        r#"
        SELECT id, warehouse_id, location_id, stock_take_number, status, start_time, end_time, remarks, created_at, updated_at FROM stock_takes WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(s)) => s,
        Ok(None) => return Json(api_error(404, "盘点不存在")),
        Err(e) => return Json(api_error(500, &format!("查询盘点失败: {}", e))),
    };

    let warehouse_id = req.warehouse_id.or(existing.warehouse_id);
    let location_id = req.location_id.or(existing.location_id);
    let status = req.status.unwrap_or(existing.status);
    let end_time = req.end_time.or(existing.end_time);
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let result = sqlx::query_as::<_, StockTake>(
        r#"
        UPDATE stock_takes SET
            warehouse_id = $2, location_id = $3, status = $4, end_time = $5, remarks = $6, updated_at = $7
        WHERE id = $1
        RETURNING id, warehouse_id, location_id, stock_take_number, status, start_time, end_time, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&warehouse_id)
    .bind(&location_id)
    .bind(&status)
    .bind(&end_time)
    .bind(&remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(stock_take) => (
            Json(ApiResponse::success(stock_take.clone(), "盘点更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新盘点失败: {}", e);
            (
                Json(api_error(500, "盘点更新失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(stock_take) = &result {
        serde_json::to_value(stock_take).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "stock_take".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn delete_stock_take(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query("DELETE FROM stock_takes WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "盘点删除成功")),
            "success",
            None
        ),
        Ok(_) => (
            Json(api_error(404, "盘点不存在")),
            "error",
            Some("盘点不存在".to_string())
        ),
        Err(e) => {
            tracing::error!("删除盘点失败: {}", e);
            (
                Json(api_error(500, "盘点删除失败")),
                "error",
                Some(e.to_string())
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
        "stock_take".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn list_stock_take_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, StockTakeItem>(
        r#"
        SELECT id, stock_take_id, inventory_item_id, expected_quantity, actual_quantity, variance, status, remarks, created_at, updated_at
        FROM stock_take_items
        WHERE stock_take_id = $1
        ORDER BY created_at ASC
        "#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let total = items.len() as i64;
            let variance_sum: f64 = items.iter().filter_map(|i| i.variance).sum();
            let completed_count = items.iter().filter(|i| i.status == "completed").count() as i64;

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "completed_count": completed_count,
                    "total_variance": variance_sum
                }),
                "获取盘点明细成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取盘点明细失败: {}", e);
            Json(api_error(500, "获取盘点明细失败"))
        }
    }
}

async fn create_stock_take_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<CreateStockTakeItemRequest>,
) -> Json<ApiResponse<StockTakeItem>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let item_id = Uuid::new_v4();
    let now = Utc::now();

    let variance = if let Some(actual) = req.actual_quantity {
        Some(actual - req.expected_quantity)
    } else {
        None
    };

    let status = if req.actual_quantity.is_some() { "completed" } else { "pending" };

    let result = sqlx::query_as::<_, StockTakeItem>(
        r#"
        INSERT INTO stock_take_items (id, stock_take_id, inventory_item_id, expected_quantity, actual_quantity, variance, status, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, stock_take_id, inventory_item_id, expected_quantity, actual_quantity, variance, status, remarks, created_at, updated_at
        "#,
    )
    .bind(item_id)
    .bind(id)
    .bind(&req.inventory_item_id)
    .bind(req.expected_quantity)
    .bind(&req.actual_quantity)
    .bind(variance)
    .bind(status)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(item) => (
            Json(ApiResponse::success(item.clone(), "盘点明细创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建盘点明细失败: {}", e);
            (
                Json(api_error(500, "盘点明细创建失败")),
                "error",
                Some(e.to_string())
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
        "stock_take_item".to_string(),
        Some(item_id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn get_stock_take_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<StockTakeItem>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, StockTakeItem>(
        r#"
        SELECT id, stock_take_id, inventory_item_id, expected_quantity, actual_quantity, variance, status, remarks, created_at, updated_at
        FROM stock_take_items WHERE stock_take_id = $1 AND id = $2
        "#,
    )
    .bind(id)
    .bind(item_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(item)) => Json(ApiResponse::success(item, "获取盘点明细成功")),
        Ok(None) => Json(api_error(404, "盘点明细不存在")),
        Err(e) => {
            tracing::error!("获取盘点明细失败: {}", e);
            Json(api_error(500, "获取盘点明细失败"))
        }
    }
}

async fn update_stock_take_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
    Json(req): Json<UpdateStockTakeItemRequest>,
) -> Json<ApiResponse<StockTakeItem>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    
    let existing = sqlx::query_as::<_, StockTakeItem>(
        r#"
        SELECT id, stock_take_id, inventory_item_id, expected_quantity, actual_quantity, variance, status, remarks, created_at, updated_at FROM stock_take_items WHERE stock_take_id = $1 AND id = $2
        "#,
    )
    .bind(id)
    .bind(item_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(i)) => i,
        Ok(None) => return Json(api_error(404, "盘点明细不存在")),
        Err(e) => return Json(api_error(500, &format!("查询盘点明细失败: {}", e))),
    };

    let actual_quantity = req.actual_quantity.or(existing.actual_quantity);
    let variance = if let Some(actual) = actual_quantity {
        Some(actual - existing.expected_quantity)
    } else {
        None
    };
    let status = req.status.unwrap_or_else(|| {
        if actual_quantity.is_some() { "completed".to_string() } else { existing.status }
    });
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let result = sqlx::query_as::<_, StockTakeItem>(
        r#"
        UPDATE stock_take_items SET
            actual_quantity = $2, variance = $3, status = $4, remarks = $5, updated_at = $6
        WHERE stock_take_id = $7 AND id = $8
        RETURNING id, stock_take_id, inventory_item_id, expected_quantity, actual_quantity, variance, status, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&actual_quantity)
    .bind(variance)
    .bind(&status)
    .bind(&remarks)
    .bind(now)
    .bind(id)
    .bind(item_id)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(item) => (
            Json(ApiResponse::success(item.clone(), "盘点明细更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新盘点明细失败: {}", e);
            (
                Json(api_error(500, "盘点明细更新失败")),
                "error",
                Some(e.to_string())
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
        "stock_take_item".to_string(),
        Some(item_id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn delete_stock_take_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let result = sqlx::query("DELETE FROM stock_take_items WHERE stock_take_id = $1 AND id = $2")
        .bind(id)
        .bind(item_id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "盘点明细删除成功")),
            "success",
            None
        ),
        Ok(_) => (
            Json(api_error(404, "盘点明细不存在")),
            "error",
            Some("盘点明细不存在".to_string())
        ),
        Err(e) => {
            tracing::error!("删除盘点明细失败: {}", e);
            (
                Json(api_error(500, "盘点明细删除失败")),
                "error",
                Some(e.to_string())
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
        "stock_take_item".to_string(),
        Some(item_id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn complete_stock_take(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<StockTake>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let now = Utc::now();

    let result = sqlx::query_as::<_, StockTake>(
        r#"
        UPDATE stock_takes SET
            status = 'completed', end_time = $2, updated_at = $3
        WHERE id = $1
        RETURNING id, warehouse_id, location_id, stock_take_number, status, start_time, end_time, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(stock_take) => (
            Json(ApiResponse::success(stock_take.clone(), "盘点完成成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("完成盘点失败: {}", e);
            (
                Json(api_error(500, "完成盘点失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(stock_take) = &result {
        serde_json::to_value(stock_take).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "stock_take".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}