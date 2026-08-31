use topems_shared_boundary::only_own_schema_query;
use axum::{
    extract::{Extension, FromRef, Path, Query, State},
    http::HeaderMap,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{
    CreateTransferItemRequest, CreateTransferRequest, Transfer, TransferItem,
    UpdateTransferItemRequest, UpdateTransferRequest,
};
use crate::modules::audit::log_audit_event;
use crate::modules::ApiState;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};

#[derive(Debug, Deserialize)]
pub struct TransferPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub from_warehouse_id: Option<Uuid>,
    pub to_warehouse_id: Option<Uuid>,
}

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
        .route(
            "/transfers/{id}/items",
            get(list_transfer_items).post(create_transfer_item),
        )
        .route(
            "/transfers/{id}/items/{item_id}",
            get(get_transfer_item)
                .put(update_transfer_item)
                .delete(delete_transfer_item),
        )
        .route("/transfers/{id}/execute", post(execute_transfer))
}

pub async fn list_transfers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<TransferPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let from_warehouse_id = params.from_warehouse_id;
    let to_warehouse_id = params.to_warehouse_id;

    let result = sqlx::query_as::<_, Transfer>(
        only_own_schema_query!("wms", r#"
        SELECT id, transfer_number, from_warehouse_id, from_location_id, to_warehouse_id, to_location_id, status, remarks, created_at, updated_at
        FROM transfers
        WHERE ($1::text IS NULL OR transfer_number ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::uuid IS NULL OR from_warehouse_id = $3)
          AND ($4::uuid IS NULL OR to_warehouse_id = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#),
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(&from_warehouse_id)
    .bind(&to_warehouse_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(transfers) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("wms", r#"
                SELECT COUNT(*) FROM transfers
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR transfer_number ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::uuid IS NULL OR from_warehouse_id = $3)
                  AND ($4::uuid IS NULL OR to_warehouse_id = $4)
                "#),
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&from_warehouse_id)
            .bind(&to_warehouse_id)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "transfers": transfers,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取调拨列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取调拨列表失败: {}", e);
            Json(api_error(500, "获取调拨列表失败"))
        }
    }
}

pub async fn create_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateTransferRequest>,
) -> Json<ApiResponse<Transfer>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Transfer>(
        only_own_schema_query!("wms", r#"
        INSERT INTO transfers (id, transfer_number, from_warehouse_id, from_location_id, to_warehouse_id, to_location_id, status, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)
        RETURNING id, transfer_number, from_warehouse_id, from_location_id, to_warehouse_id, to_location_id, status, remarks, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&req.transfer_number)
    .bind(&req.from_warehouse_id)
    .bind(&req.from_location_id)
    .bind(&req.to_warehouse_id)
    .bind(&req.to_location_id)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(transfer) => (
            Json(ApiResponse::success(transfer.clone(), "调拨创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建调拨失败: {}", e);
            (
                Json(api_error(500, "调拨创建失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(transfer) = &result {
        serde_json::to_value(transfer).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "transfer".to_string(),
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

pub async fn get_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Transfer>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, Transfer>(
        only_own_schema_query!("wms", r#"
        SELECT id, transfer_number, from_warehouse_id, from_location_id, to_warehouse_id, to_location_id, status, remarks, created_at, updated_at
        FROM transfers WHERE id = $1
        "#),
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(transfer)) => Json(ApiResponse::success(transfer, "获取调拨成功")),
        Ok(None) => Json(api_error(404, "调拨不存在")),
        Err(e) => {
            tracing::error!("获取调拨失败: {}", e);
            Json(api_error(500, "获取调拨失败"))
        }
    }
}

pub async fn update_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateTransferRequest>,
) -> Json<ApiResponse<Transfer>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();

    let existing = sqlx::query_as::<_, Transfer>(
        only_own_schema_query!("wms", r#"
        SELECT id, transfer_number, from_warehouse_id, from_location_id, to_warehouse_id, to_location_id, status, remarks, created_at, updated_at FROM transfers WHERE deleted_at IS NULL AND id = $1
        "#),
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(t)) => t,
        Ok(None) => return Json(api_error(404, "调拨不存在")),
        Err(e) => return Json(api_error(500, &format!("查询调拨失败: {}", e))),
    };

    let from_warehouse_id = req.from_warehouse_id.or(existing.from_warehouse_id);
    let from_location_id = req.from_location_id.or(existing.from_location_id);
    let to_warehouse_id = req.to_warehouse_id.or(existing.to_warehouse_id);
    let to_location_id = req.to_location_id.or(existing.to_location_id);
    let status = req.status.unwrap_or(existing.status);
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Transfer>(
        only_own_schema_query!("wms", r#"
        UPDATE transfers SET
            from_warehouse_id = $2, from_location_id = $3, to_warehouse_id = $4, to_location_id = $5, 
            status = $6, remarks = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, transfer_number, from_warehouse_id, from_location_id, to_warehouse_id, to_location_id, status, remarks, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&from_warehouse_id)
    .bind(&from_location_id)
    .bind(&to_warehouse_id)
    .bind(&to_location_id)
    .bind(&status)
    .bind(&remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(transfer) => (
            Json(ApiResponse::success(transfer.clone(), "调拨更新成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新调拨失败: {}", e);
            (
                Json(api_error(500, "调拨更新失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(transfer) = &result {
        serde_json::to_value(transfer).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "transfer".to_string(),
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

pub async fn delete_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(only_own_schema_query!("wms", "UPDATE transfers SET deleted_at = NOW() WHERE id = $1"))
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "调拨删除成功")),
            "success",
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "调拨不存在")),
            "error",
            Some("调拨不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除调拨失败: {}", e);
            (
                Json(api_error(500, "调拨删除失败")),
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
        "transfer".to_string(),
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

pub async fn list_transfer_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, TransferItem>(
        only_own_schema_query!("wms", r#"
        SELECT id, transfer_id, inventory_item_id, quantity, status, remarks, created_at, updated_at
        FROM transfer_items
        WHERE transfer_id = $1
        ORDER BY created_at ASC
        "#),
    )
    .bind(id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let total = items.len() as i64;
            let total_quantity: f64 = items.iter().map(|i| i.quantity).sum();
            let completed_count = items.iter().filter(|i| i.status == "completed").count() as i64;

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "total_quantity": total_quantity,
                    "completed_count": completed_count
                }),
                "获取调拨明细成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取调拨明细失败: {}", e);
            Json(api_error(500, "获取调拨明细失败"))
        }
    }
}

pub async fn create_transfer_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<CreateTransferItemRequest>,
) -> Json<ApiResponse<TransferItem>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let item_id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, TransferItem>(
        only_own_schema_query!("wms", r#"
        INSERT INTO transfer_items (id, transfer_id, inventory_item_id, quantity, status, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7)
        RETURNING id, transfer_id, inventory_item_id, quantity, status, remarks, created_at, updated_at
        "#),
    )
    .bind(item_id)
    .bind(id)
    .bind(&req.inventory_item_id)
    .bind(req.quantity)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(item) => (
            Json(ApiResponse::success(item.clone(), "调拨明细创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建调拨明细失败: {}", e);
            (
                Json(api_error(500, "调拨明细创建失败")),
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
        "transfer_item".to_string(),
        Some(item_id),
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

pub async fn get_transfer_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
) -> Json<ApiResponse<TransferItem>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, TransferItem>(
        only_own_schema_query!("wms", r#"
        SELECT id, transfer_id, inventory_item_id, quantity, status, remarks, created_at, updated_at
        FROM transfer_items WHERE transfer_id = $1 AND id = $2
        "#),
    )
    .bind(id)
    .bind(item_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(item)) => Json(ApiResponse::success(item, "获取调拨明细成功")),
        Ok(None) => Json(api_error(404, "调拨明细不存在")),
        Err(e) => {
            tracing::error!("获取调拨明细失败: {}", e);
            Json(api_error(500, "获取调拨明细失败"))
        }
    }
}

pub async fn update_transfer_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
    Json(req): Json<UpdateTransferItemRequest>,
) -> Json<ApiResponse<TransferItem>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();

    let existing = sqlx::query_as::<_, TransferItem>(
        only_own_schema_query!("wms", r#"
        SELECT id, transfer_id, inventory_item_id, quantity, status, remarks, created_at, updated_at FROM transfer_items WHERE transfer_id = $1 AND id = $2
        "#),
    )
    .bind(id)
    .bind(item_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(i)) => i,
        Ok(None) => return Json(api_error(404, "调拨明细不存在")),
        Err(e) => return Json(api_error(500, &format!("查询调拨明细失败: {}", e))),
    };

    let quantity = req.quantity.unwrap_or(existing.quantity);
    let status = req.status.unwrap_or(existing.status);
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let result = sqlx::query_as::<_, TransferItem>(
        only_own_schema_query!("wms", r#"
        UPDATE transfer_items SET
            quantity = $2, status = $3, remarks = $4, updated_at = $5
        WHERE transfer_id = $6 AND id = $7
        RETURNING id, transfer_id, inventory_item_id, quantity, status, remarks, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(quantity)
    .bind(&status)
    .bind(&remarks)
    .bind(now)
    .bind(id)
    .bind(item_id)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(item) => (
            Json(ApiResponse::success(item.clone(), "调拨明细更新成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新调拨明细失败: {}", e);
            (
                Json(api_error(500, "调拨明细更新失败")),
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
        "transfer_item".to_string(),
        Some(item_id),
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

pub async fn delete_transfer_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((id, item_id)): Path<(Uuid, Uuid)>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(only_own_schema_query!("wms", "DELETE FROM transfer_items WHERE transfer_id = $1 AND id = $2"))
        .bind(id)
        .bind(item_id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "调拨明细删除成功")),
            "success",
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "调拨明细不存在")),
            "error",
            Some("调拨明细不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除调拨明细失败: {}", e);
            (
                Json(api_error(500, "调拨明细删除失败")),
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
        "transfer_item".to_string(),
        Some(item_id),
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

pub async fn execute_transfer(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Transfer>> {
    match check_permission(&state.db, &claims, &ModulePermission::InventoryWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let now = Utc::now();

    let transfer = sqlx::query_as::<_, Transfer>(
        only_own_schema_query!("wms", r#"
        SELECT id, transfer_number, from_warehouse_id, from_location_id, to_warehouse_id, to_location_id, status, remarks, created_at, updated_at FROM transfers WHERE deleted_at IS NULL AND id = $1
        "#),
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let transfer = match transfer {
        Ok(Some(t)) => t,
        Ok(None) => return Json(api_error(404, "调拨不存在")),
        Err(e) => return Json(api_error(500, &format!("查询调拨失败: {}", e))),
    };

    if transfer.status == "completed" {
        return Json(api_error(400, "调拨已执行"));
    }

    let items = sqlx::query_as::<_, TransferItem>(
        only_own_schema_query!("wms", r#"
        SELECT id, transfer_id, inventory_item_id, quantity, status, remarks, created_at, updated_at
        FROM transfer_items WHERE transfer_id = $1
        "#),
    )
    .bind(id)
    .fetch_all(&state.db)
    .await;

    let items = match items {
        Ok(i) => i,
        Err(e) => return Json(api_error(500, &format!("查询调拨明细失败: {}", e))),
    };

    if items.is_empty() {
        return Json(api_error(400, "调拨明细不能为空"));
    }

    for item in &items {
        let result = sqlx::query(
            only_own_schema_query!("wms", r#"
            UPDATE wms.inventory
            SET quantity = quantity - $1, updated_at = $2
            WHERE id = $3 AND quantity >= $1
            "#),
        )
        .bind(item.quantity)
        .bind(now)
        .bind(item.inventory_item_id)
        .execute(&state.db)
        .await;

        match result {
            Ok(r) if r.rows_affected() == 0 => {
                return Json(api_error(
                    400,
                    &format!("库存不足，无法调拨商品 {}", item.inventory_item_id),
                ));
            }
            Err(e) => {
                tracing::error!("扣减库存失败: {}", e);
                return Json(api_error(500, "扣减库存失败"));
            }
            _ => {}
        }

        let new_location_id = transfer.to_location_id.clone();
        let new_warehouse_id = transfer.to_warehouse_id.clone();

        let update_result = sqlx::query(
            only_own_schema_query!("wms", r#"
            UPDATE wms.inventory
            SET location_id = COALESCE($1, location_id), warehouse_id = COALESCE($2, warehouse_id), updated_at = $3
            WHERE id = $4
            "#),
        )
        .bind(&new_location_id)
        .bind(&new_warehouse_id)
        .bind(now)
        .bind(item.inventory_item_id)
        .execute(&state.db)
        .await;

        if let Err(e) = update_result {
            tracing::error!("更新库存位置失败: {}", e);
            return Json(api_error(500, "更新库存位置失败"));
        }
    }

    let result = sqlx::query_as::<_, Transfer>(
        only_own_schema_query!("wms", r#"
        UPDATE transfers SET
            status = 'completed', updated_at = $2
        WHERE id = $1
        RETURNING id, transfer_number, from_warehouse_id, from_location_id, to_warehouse_id, to_location_id, status, remarks, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(transfer) => (
            Json(ApiResponse::success(transfer.clone(), "调拨执行成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("执行调拨失败: {}", e);
            (
                Json(api_error(500, "执行调拨失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(transfer) = &result {
        serde_json::to_value(transfer).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "transfer".to_string(),
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_transfer_pagination_params_deserialize() {
        let query = "search=TR001&status=pending";
        let params: TransferPaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.search.as_deref(), Some("TR001"));
        assert_eq!(params.status.as_deref(), Some("pending"));
    }

    #[test]
    fn test_transfer_pagination_params_default() {
        let query = "";
        let params: TransferPaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert!(params.search.is_none());
        assert!(params.status.is_none());
        assert!(params.page.is_none());
        assert!(params.page_size.is_none());
        assert!(params.from_warehouse_id.is_none());
        assert!(params.to_warehouse_id.is_none());
    }

    #[test]
    fn test_transfer_pagination_params_only_status() {
        let query = "status=completed";
        let params: TransferPaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.status.as_deref(), Some("completed"));
        assert!(params.search.is_none());
    }

    #[test]
    fn test_transfer_pagination_params_only_search() {
        let query = "search=transfer_test";
        let params: TransferPaginationParams = serde_urlencoded::from_str(query).unwrap();
        assert_eq!(params.search.as_deref(), Some("transfer_test"));
        assert!(params.status.is_none());
    }
}
