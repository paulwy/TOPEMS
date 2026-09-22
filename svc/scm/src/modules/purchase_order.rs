use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::ApiState;
use crate::models::purchase_order::{
    CreatePurchaseOrderRequest, PurchaseOrder, UpdatePurchaseOrderRequest,
};
use crate::modules::audit::log_audit_event;
use crate::shared::permission::{check_permission, tenant_bind_value, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse, PaginationParams};
use topems_shared_event::event::{EventType, PurchaseOrderApprovedPayload};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/purchase-orders", get(list_orders).post(create_order))
        .route(
            "/purchase-orders/{id}",
            get(get_order).put(update_order).delete(delete_order),
        )
        .route("/purchase-orders/{id}/approve", post(approve_order))
        .route("/purchase-orders/{id}/reject", post(reject_order))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:read"])),
    path = "/scm/purchase-orders",
    responses(
        (status = 200, description = "list_orders OK")
    ),
    tag = "SCM/purchase-order"
)]
pub async fn list_orders(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let tenant_bind = tenant_bind_value(&claims);
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("scm", r#"
        SELECT id, po_no AS order_number, supplier_id, order_date, expected_date AS delivery_date, total_amount, status, remarks, created_at, updated_at
        FROM scm.purchase_orders
        WHERE ($1::text IS NULL OR po_no ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($5 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $5)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#),
    )
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .bind(&tenant_bind)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(orders) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "scm",
                r#"
                SELECT COUNT(*) FROM scm.purchase_orders
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR po_no ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $3)
                "#
            ))
            .bind(&search_pattern)
            .bind(&status_filter)
            .bind(&tenant_bind)
            .fetch_one(&mut **txn)
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:purchase:write"])),
    path = "/scm/purchase-orders",
    request_body = CreatePurchaseOrderRequest,
    responses(
        (status = 200, description = "create_order OK")
    ),
    tag = "SCM/purchase-order"
)]
pub async fn create_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let tenant_bind = tenant_bind_value(&claims);
    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("scm", r#"
        INSERT INTO scm.purchase_orders (id, po_no, supplier_id, order_date, expected_date, total_amount, status, remarks, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10)
        RETURNING id, po_no AS order_number, supplier_id, order_date, expected_date AS delivery_date, total_amount, status, remarks, created_at, updated_at
        "#),
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
    .bind(&tenant_bind)
    .fetch_one(&mut **txn)
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:purchase:read"])),
    path = "/scm/purchase-orders/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "get_order OK")
    ),
    tag = "SCM/purchase-order"
)]
pub async fn get_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<PurchaseOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let tenant_bind = tenant_bind_value(&claims);
    let result = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("scm", r#"
        SELECT id, po_no AS order_number, supplier_id, order_date, expected_date AS delivery_date, total_amount, status, remarks, created_at, updated_at
        FROM scm.purchase_orders WHERE id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
        "#),
    )
    .bind(id)
    .bind(&tenant_bind)
    .fetch_optional(&mut **txn)
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["scm:purchase:write"])),
    path = "/scm/purchase-orders/{id}",
    request_body = UpdatePurchaseOrderRequest,
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "update_order OK")
    ),
    tag = "SCM/purchase-order"
)]
pub async fn update_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdatePurchaseOrderRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let tenant_bind = tenant_bind_value(&claims);
    let request_data = serde_json::to_value(&req).ok();

    let existing = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("scm", "SELECT id, po_no AS order_number, supplier_id, order_date, expected_date AS delivery_date, total_amount, status, remarks, created_at, updated_at FROM scm.purchase_orders WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .bind(&tenant_bind)
    .fetch_optional(&mut **txn)
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
        only_own_schema_query!("scm", r#"
        UPDATE scm.purchase_orders SET
            supplier_id = $2, expected_date = $3, total_amount = $4, status = $5, remarks = $6, updated_at = $7
        WHERE id = $1 AND ($8 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $8)
        RETURNING id, po_no AS order_number, supplier_id, order_date, expected_date AS delivery_date, total_amount, status, remarks, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(supplier_id)
    .bind(delivery_date)
    .bind(total_amount)
    .bind(&status)
    .bind(&remarks)
    .bind(now)
    .bind(&tenant_bind)
    .fetch_one(&mut **txn)
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

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["scm:purchase:admin"])),
    path = "/scm/purchase-orders/{id}",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "delete_order OK")
    ),
    tag = "SCM/purchase-order"
)]
pub async fn delete_order(
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
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let tenant_bind = tenant_bind_value(&claims);
    let result = sqlx::query(only_own_schema_query!(
        "scm",
        "UPDATE scm.purchase_orders SET deleted_at = NOW() WHERE id = $1 AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)"
    ))
    .bind(id)
    .bind(&tenant_bind)
    .execute(&mut **txn)
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:purchase:admin"])),
    path = "/scm/purchase-orders/{id}/approve",
    request_body = ApprovalRequest,
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "approve_order OK")
    ),
    tag = "SCM/purchase-order"
)]
pub async fn approve_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderApprove).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let tenant_bind = tenant_bind_value(&claims);

    let existing = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("scm", "SELECT id, po_no AS order_number, supplier_id, order_date, expected_date AS delivery_date, total_amount, status, remarks, created_at, updated_at FROM scm.purchase_orders WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .bind(&tenant_bind)
    .fetch_optional(&mut **txn)
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
        only_own_schema_query!("scm", r#"
        UPDATE scm.purchase_orders SET
            status = 'approved', remarks = $2, updated_at = $3
        WHERE id = $1 AND ($4 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $4)
        RETURNING id, po_no AS order_number, supplier_id, order_date, expected_date AS delivery_date, total_amount, status, remarks, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&new_remarks)
    .bind(now)
    .bind(&tenant_bind)
    .fetch_one(&mut **txn)
    .await;

    let event_tenant_id: Option<Uuid> =
        sqlx::query_scalar("SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid")
            .fetch_optional(&mut **txn)
            .await
            .ok()
            .flatten();

    let (response, status_str, error_msg) = match &result {
        Ok(order) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let order_id = order.id;
                let order_no = order.order_number.clone();
                let supplier_id = order.supplier_id;
                let total_amount = order.total_amount;
                let approver_name_val = req.approver_name.clone().or(Some(claims.username.clone()));
                let now_val = Utc::now();
                let tenant_id = event_tenant_id;
                tokio::spawn(async move {
                    let payload = PurchaseOrderApprovedPayload {
                        order_id,
                        order_no,
                        supplier_id,
                        supplier_name: None,
                        total_amount,
                        payable_amount: None,
                        approved_by: approver_name_val,
                        approved_at: Some(now_val),
                        tenant_id,
                    };
                    if let Err(e) = publisher
                        .publish_event(EventType::PurchaseOrderApproved, payload)
                        .await
                    {
                        tracing::warn!(
                            "[scm] PurchaseOrderApproved 事件发布失败（graceful fallback）: {}",
                            e
                        );
                    } else {
                        tracing::info!(
                            "[scm] PurchaseOrderApproved 事件发布成功 - order_id={}",
                            order_id
                        );
                    }
                });
            }

            (
                Json(ApiResponse::success(order.clone(), "采购订单审批通过")),
                "success",
                None,
            )
        }
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

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:purchase:admin"])),
    path = "/scm/purchase-orders/{id}/reject",
    request_body = ApprovalRequest,
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "reject_order OK")
    ),
    tag = "SCM/purchase-order"
)]
pub async fn reject_order(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<ApprovalRequest>,
) -> Json<ApiResponse<PurchaseOrder>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::PurchaseOrderApprove).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let tenant_bind = tenant_bind_value(&claims);

    let existing = sqlx::query_as::<_, PurchaseOrder>(
        only_own_schema_query!("scm", "SELECT id, po_no AS order_number, supplier_id, order_date, expected_date AS delivery_date, total_amount, status, remarks, created_at, updated_at FROM scm.purchase_orders WHERE deleted_at IS NULL AND id = $1"),
    )
    .bind(id)
    .bind(&tenant_bind)
    .fetch_optional(&mut **txn)
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
        only_own_schema_query!("scm", r#"
        UPDATE scm.purchase_orders SET
            status = 'rejected', remarks = $2, updated_at = $3
        WHERE id = $1 AND ($4 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $4)
        RETURNING id, po_no AS order_number, supplier_id, order_date, expected_date AS delivery_date, total_amount, status, remarks, created_at, updated_at
        "#),
    )
    .bind(id)
    .bind(&new_remarks)
    .bind(now)
    .bind(&tenant_bind)
    .fetch_one(&mut **txn)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn approval_request_defaults_to_all_none_via_serde() {
        let req: ApprovalRequest = serde_json::from_str("{}").expect("deserialize empty");
        assert!(req.approver_id.is_none());
        assert!(req.approver_name.is_none());
        assert!(req.remarks.is_none());
    }

    #[test]
    fn approval_request_roundtrip_preserves_all_fields() {
        let approver_id = Uuid::new_v4();
        let req = ApprovalRequest {
            approver_id: Some(approver_id),
            approver_name: Some("张三".to_string()),
            remarks: Some("同意".to_string()),
        };
        let json = serde_json::to_string(&req).expect("serialize");
        let back: ApprovalRequest = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.approver_id, req.approver_id);
        assert_eq!(back.approver_name, req.approver_name);
        assert_eq!(back.remarks, req.remarks);
    }

    #[test]
    fn approval_request_partial_population_remarks_only() {
        let json = r#"{"remarks": "待复核"}"#;
        let req: ApprovalRequest = serde_json::from_str(json).expect("deserialize");
        assert!(req.approver_id.is_none());
        assert!(req.approver_name.is_none());
        assert_eq!(req.remarks.as_deref(), Some("待复核"));
    }

    #[test]
    fn approval_request_ignores_unknown_fields() {
        let json = r#"{"approver_name": "李四", "extra": "ignored"}"#;
        let req: ApprovalRequest = serde_json::from_str(json).expect("deserialize");
        assert_eq!(req.approver_name.as_deref(), Some("李四"));
    }

    #[test]
    fn approval_request_clone_is_equal_to_original() {
        let req = ApprovalRequest {
            approver_id: Some(Uuid::new_v4()),
            approver_name: Some("王五".to_string()),
            remarks: None,
        };
        let cloned = req.clone();
        assert_eq!(cloned.approver_id, req.approver_id);
        assert_eq!(cloned.approver_name, req.approver_name);
        assert_eq!(cloned.remarks, req.remarks);
    }

    #[test]
    fn create_routes_returns_router_without_panic() {
        let _router = create_routes();
    }
}
