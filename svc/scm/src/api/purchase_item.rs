use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{delete, get},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::api::audit::log_audit_event;
use crate::models::{CreatePurchaseItemRequest, PurchaseItem, UpdatePurchaseItemRequest};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::{api_error, auth::Claims, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct PurchaseItemQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub order_id: Option<Uuid>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/scm/purchase-items", get(list_items).post(create_item))
        .route(
            "/api/scm/purchase-items/{id}",
            get(get_item).put(update_item).delete(delete_item),
        )
}

async fn list_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PurchaseItemQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseItemRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, PurchaseItem>(
        r#"
        SELECT id, order_id, product_code, product_name, specification, unit, quantity, unit_price, amount, created_at, updated_at
        FROM scm.purchase_items
        WHERE ($1::text IS NULL OR product_name ILIKE $1 OR product_code ILIKE $1)
          AND ($2::uuid IS NULL OR order_id = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(params.order_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM scm.purchase_items
                WHERE ($1::text IS NULL OR product_name ILIKE $1 OR product_code ILIKE $1)
                  AND ($2::uuid IS NULL OR order_id = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(params.order_id)
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
                "获取采购明细列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取采购明细列表失败: {}", e);
            Json(api_error(500, "获取采购明细列表失败"))
        }
    }
}

async fn create_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreatePurchaseItemRequest>,
) -> Json<ApiResponse<PurchaseItem>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseItemWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, PurchaseItem>(
        r#"
        INSERT INTO scm.purchase_items (id, order_id, product_code, product_name, specification, unit, quantity, unit_price, amount, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, order_id, product_code, product_name, specification, unit, quantity, unit_price, amount, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.order_id)
    .bind(&req.product_code)
    .bind(&req.product_name)
    .bind(&req.specification)
    .bind(&req.unit)
    .bind(req.quantity)
    .bind(req.unit_price)
    .bind(req.amount)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(item) => (
            Json(ApiResponse::success(item.clone(), "采购明细创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建采购明细失败: {}", e);
            (
                Json(api_error(500, "采购明细创建失败")),
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
        "purchase_item".to_string(),
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

async fn get_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PurchaseItem>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseItemRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, PurchaseItem>(
        r#"
        SELECT id, order_id, product_code, product_name, specification, unit, quantity, unit_price, amount, created_at, updated_at
        FROM scm.purchase_items WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(item)) => Json(ApiResponse::success(item, "获取采购明细成功")),
        Ok(None) => Json(api_error(404, "采购明细不存在")),
        Err(e) => {
            tracing::error!("获取采购明细失败: {}", e);
            Json(api_error(500, "获取采购明细失败"))
        }
    }
}

async fn update_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdatePurchaseItemRequest>,
) -> Json<ApiResponse<PurchaseItem>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseItemWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();

    let existing = sqlx::query_as::<_, PurchaseItem>(
        "SELECT id, order_id, product_code, product_name, specification, unit, quantity, unit_price, amount, created_at, updated_at FROM scm.purchase_items WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(i)) => i,
        Ok(None) => return Json(api_error(404, "采购明细不存在")),
        Err(e) => return Json(api_error(500, &format!("查询采购明细失败: {}", e))),
    };

    let product_code = req.product_code.or(existing.product_code);
    let product_name = req.product_name.unwrap_or(existing.product_name);
    let specification = req.specification.or(existing.specification);
    let unit = req.unit.or(existing.unit);
    let quantity = req.quantity.unwrap_or(existing.quantity);
    let unit_price = req.unit_price.or(existing.unit_price);
    let amount = req.amount.or(existing.amount);
    let now = Utc::now();

    let result = sqlx::query_as::<_, PurchaseItem>(
        r#"
        UPDATE scm.purchase_items SET
            product_code = $2, product_name = $3, specification = $4, unit = $5, quantity = $6, unit_price = $7, amount = $8, updated_at = $9
        WHERE id = $1
        RETURNING id, order_id, product_code, product_name, specification, unit, quantity, unit_price, amount, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&product_code)
    .bind(&product_name)
    .bind(&specification)
    .bind(&unit)
    .bind(quantity)
    .bind(unit_price)
    .bind(amount)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(item) => (
            Json(ApiResponse::success(item.clone(), "采购明细更新成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新采购明细失败: {}", e);
            (
                Json(api_error(500, "采购明细更新失败")),
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
        "purchase_item".to_string(),
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

async fn delete_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseItemWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query("DELETE FROM scm.purchase_items WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "采购明细删除成功")),
            "success",
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "采购明细不存在")),
            "error",
            Some("采购明细不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除采购明细失败: {}", e);
            (
                Json(api_error(500, "采购明细删除失败")),
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
        "purchase_item".to_string(),
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
