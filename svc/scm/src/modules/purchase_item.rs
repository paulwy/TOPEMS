use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::purchase_item::{
    CreatePurchaseItemRequest, PurchaseItem, UpdatePurchaseItemRequest,
};
use crate::modules::audit::log_audit_event;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct PurchaseItemQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub order_id: Option<Uuid>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/purchase-items", get(list_items).post(create_item))
        .route(
            "/purchase-items/{id}",
            get(get_item).put(update_item).delete(delete_item),
        )
}

pub async fn list_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PurchaseItemQueryParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseItemRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, PurchaseItem>(
        only_own_schema_query!("scm", r#"
        SELECT id, order_id, product_code, product_name, specification, unit, quantity, unit_price, amount, created_at, updated_at
        FROM scm.purchase_items
        WHERE ($1::text IS NULL OR product_name ILIKE $1 OR product_code ILIKE $1)
          AND ($2::uuid IS NULL OR order_id = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#),
    )
    .bind(&search_pattern)
    .bind(params.order_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "scm",
                r#"
                SELECT COUNT(*) FROM scm.purchase_items
                WHERE ($1::text IS NULL OR product_name ILIKE $1 OR product_code ILIKE $1)
                  AND ($2::uuid IS NULL OR order_id = $2)
                "#
            ))
            .bind(&search_pattern)
            .bind(params.order_id)
            .fetch_one(&mut **txn)
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

pub async fn create_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreatePurchaseItemRequest>,
) -> Json<ApiResponse<PurchaseItem>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseItemWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, PurchaseItem>(
        only_own_schema_query!("scm", r#"
        INSERT INTO scm.purchase_items (id, order_id, product_code, product_name, specification, unit, quantity, unit_price, amount, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, order_id, product_code, product_name, specification, unit, quantity, unit_price, amount, created_at, updated_at
        "#),
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
    .fetch_one(&mut **txn)
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

pub async fn get_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PurchaseItem>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseItemRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, PurchaseItem>(
        only_own_schema_query!("scm", r#"
        SELECT id, order_id, product_code, product_name, specification, unit, quantity, unit_price, amount, created_at, updated_at
        FROM scm.purchase_items WHERE id = $1
        "#),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
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

pub async fn update_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdatePurchaseItemRequest>,
) -> Json<ApiResponse<PurchaseItem>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseItemWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();

    let existing = sqlx::query_as::<_, PurchaseItem>(
        only_own_schema_query!("scm", "SELECT id, order_id, product_code, product_name, specification, unit, quantity, unit_price, amount, created_at, updated_at FROM scm.purchase_items WHERE id = $1"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
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
        only_own_schema_query!("scm", r#"
        UPDATE scm.purchase_items SET
            product_code = $2, product_name = $3, specification = $4, unit = $5, quantity = $6, unit_price = $7, amount = $8, updated_at = $9
        WHERE id = $1
        RETURNING id, order_id, product_code, product_name, specification, unit, quantity, unit_price, amount, created_at, updated_at
        "#),
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
    .fetch_one(&mut **txn)
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

pub async fn delete_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseItemWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(only_own_schema_query!(
        "scm",
        "DELETE FROM scm.purchase_items WHERE id = $1"
    ))
    .bind(id)
    .execute(&mut **txn)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn purchase_item_query_params_defaults_via_serde() {
        let q: PurchaseItemQueryParams = serde_json::from_str("{}").expect("deserialize empty");
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
        assert!(q.search.is_none());
        assert!(q.order_id.is_none());
    }

    #[test]
    fn purchase_item_query_params_roundtrip_preserves_fields() {
        let order_id = Uuid::new_v4();
        let json = serde_json::json!({
            "page": 1,
            "page_size": 20,
            "search": "widget",
            "order_id": order_id,
        });
        let q: PurchaseItemQueryParams = serde_json::from_value(json).expect("deserialize");
        assert_eq!(q.page, Some(1));
        assert_eq!(q.page_size, Some(20));
        assert_eq!(q.search.as_deref(), Some("widget"));
        assert_eq!(q.order_id, Some(order_id));
    }

    #[test]
    fn purchase_item_query_params_partial_population() {
        let json = r#"{"search": "abc"}"#;
        let q: PurchaseItemQueryParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(q.search.as_deref(), Some("abc"));
        assert!(q.page.is_none());
        assert!(q.order_id.is_none());
    }

    #[test]
    fn purchase_item_query_params_ignores_unknown_fields() {
        let json = r#"{"page": 3, "extra": "ignored"}"#;
        let q: PurchaseItemQueryParams = serde_json::from_str(json).expect("deserialize");
        assert_eq!(q.page, Some(3));
    }

    #[test]
    fn create_routes_returns_router_without_panic() {
        let _router = create_routes();
    }
}
