use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use super::ApiState;
use crate::models::{CreatePurchaseOrderRequest, PurchaseOrder, UpdatePurchaseOrderRequest};
use crate::modules::audit::log_audit_event;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::{api_error, auth::Claims, ApiResponse, PaginationParams};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/scm/purchase-orders",
            get(list_orders).post(create_order),
        )
        .route(
            "/api/scm/purchase-orders/{id}",
            get(get_order).put(update_order).delete(delete_order),
        )
        .route("/api/scm/purchase-orders/{id}/approve", post(approve_order))
        .route("/api/scm/purchase-orders/{id}/reject", post(reject_order))
}

pub async fn list_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        SELECT id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at
        FROM scm.purchase_orders
        WHERE ($1::text IS NULL OR order_number ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(orders) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM scm.purchase_orders
                WHERE ($1::text IS NULL OR order_number ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "orders": orders,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取采购订单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取采购订单列表失败: {}", e);
            Json(api_error(500, "获取采购订单列表失败"))
        }
    }
}

pub async fn create_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        INSERT INTO scm.purchase_orders (id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9)
        RETURNING id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.order_number)
    .bind(req.supplier_id)
    .bind(req.order_date)
    .bind(req.delivery_date)
    .bind(req.total_amount)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "采购订单创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建采购订单失败: {}", e);
            (
                Json(api_error(500, "采购订单创建失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(order) = &result {
        serde_json::to_value(order).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "purchase_order".to_string(),
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

pub async fn get_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<PurchaseOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        SELECT id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at
        FROM scm.purchase_orders WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(order)) => Json(ApiResponse::success(order, "获取采购订单成功")),
        Ok(None) => Json(api_error(404, "采购订单不存在")),
        Err(e) => {
            tracing::error!("获取采购订单失败: {}", e);
            Json(api_error(500, "获取采购订单失败"))
        }
    }
}

pub async fn update_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let request_data = serde_json::to_value(&req).ok();

    let existing = sqlx::query_as::<_, PurchaseOrder>(
        "SELECT id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at FROM scm.purchase_orders WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => return Json(api_error(404, "采购订单不存在")),
        Err(e) => return Json(api_error(500, &format!("查询采购订单失败: {}", e))),
    };

    let supplier_id = req.supplier_id.or(existing.supplier_id);
    let delivery_date = req.delivery_date.or(existing.delivery_date);
    let total_amount = req.total_amount.or(existing.total_amount);
    let status = req.status.unwrap_or(existing.status);
    let remarks = req.remarks.or(existing.remarks);
    let now = Utc::now();

    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        UPDATE scm.purchase_orders SET
            supplier_id = $2, delivery_date = $3, total_amount = $4, status = $5, remarks = $6, updated_at = $7
        WHERE id = $1
        RETURNING id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(supplier_id)
    .bind(delivery_date)
    .bind(total_amount)
    .bind(&status)
    .bind(&remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "采购订单更新成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("更新采购订单失败: {}", e);
            (
                Json(api_error(500, "采购订单更新失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(order) = &result {
        serde_json::to_value(order).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "purchase_order".to_string(),
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

pub async fn delete_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query("DELETE FROM scm.purchase_orders WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "采购订单删除成功")),
            "success",
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "采购订单不存在")),
            "error",
            Some("采购订单不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除采购订单失败: {}", e);
            (
                Json(api_error(500, "采购订单删除失败")),
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
        "purchase_order".to_string(),
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

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct ApprovalRequest {
    pub approver_id: Option<Uuid>,
    pub approver_name: Option<String>,
    pub remarks: Option<String>,
}

pub async fn approve_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderApprove).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let existing = sqlx::query_as::<_, PurchaseOrder>(
        "SELECT id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at FROM scm.purchase_orders WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => return Json(api_error(404, "采购订单不存在")),
        Err(e) => return Json(api_error(500, &format!("查询采购订单失败: {}", e))),
    };

    if existing.status != "pending" {
        return Json(api_error(
            400,
            &format!("采购订单当前状态为{}，无法审批", existing.status),
        ));
    }

    let approver_name = req.approver_name.clone().or(Some(claims.username.clone()));
    let new_remarks = match (existing.remarks.clone(), req.remarks.clone()) {
        (Some(old), Some(new)) => Some(format!(
            "{} | 审批通过 ({}): {}",
            old,
            approver_name.clone().unwrap_or_default(),
            new
        )),
        (Some(old), None) => Some(format!(
            "{} | 审批通过 ({})",
            old,
            approver_name.clone().unwrap_or_default()
        )),
        (None, Some(new)) => Some(format!(
            "审批通过 ({}): {}",
            approver_name.clone().unwrap_or_default(),
            new
        )),
        (None, None) => Some(format!("审批通过 ({})", approver_name.unwrap_or_default())),
    };

    let now = Utc::now();

    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        UPDATE scm.purchase_orders SET
            status = 'approved', remarks = $2, updated_at = $3
        WHERE id = $1
        RETURNING id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&new_remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "采购订单审批通过")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("审批采购订单失败: {}", e);
            (
                Json(api_error(500, "审批采购订单失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(order) = &result {
        serde_json::to_value(order).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "approve".to_string(),
        "purchase_order".to_string(),
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

pub async fn reject_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderApprove).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let existing = sqlx::query_as::<_, PurchaseOrder>(
        "SELECT id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at FROM scm.purchase_orders WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(o)) => o,
        Ok(None) => return Json(api_error(404, "采购订单不存在")),
        Err(e) => return Json(api_error(500, &format!("查询采购订单失败: {}", e))),
    };

    if existing.status != "pending" {
        return Json(api_error(
            400,
            &format!("采购订单当前状态为{}，无法驳回", existing.status),
        ));
    }

    let approver_name = req.approver_name.clone().or(Some(claims.username.clone()));
    let reject_reason = req.remarks.clone().unwrap_or_default();
    let new_remarks = match existing.remarks.clone() {
        Some(old) => Some(format!(
            "{} | 审批驳回 ({}): {}",
            old,
            approver_name.clone().unwrap_or_default(),
            reject_reason
        )),
        None => Some(format!(
            "审批驳回 ({}): {}",
            approver_name.unwrap_or_default(),
            reject_reason
        )),
    };

    let now = Utc::now();

    let result = sqlx::query_as::<_, PurchaseOrder>(
        r#"
        UPDATE scm.purchase_orders SET
            status = 'rejected', remarks = $2, updated_at = $3
        WHERE id = $1
        RETURNING id, order_number, supplier_id, order_date, delivery_date, total_amount, status, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&new_remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(order) => (
            Json(ApiResponse::success(order.clone(), "采购订单已驳回")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("驳回采购订单失败: {}", e);
            (
                Json(api_error(500, "驳回采购订单失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(order) = &result {
        serde_json::to_value(order).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "reject".to_string(),
        "purchase_order".to_string(),
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
