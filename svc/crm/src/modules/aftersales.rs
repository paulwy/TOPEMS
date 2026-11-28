use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use rust_decimal::prelude::ToPrimitive;
use rust_decimal::Decimal;
use std::sync::Arc;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use uuid::Uuid;

use super::ApiState;
use crate::models::{
    CreateReturnItemRequest, CreateReturnRequest, Return, ReturnActionRequest, ReturnItem,
    ReturnQuery, UpdateReturnRequest,
};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::modules::return_status::ReturnStatus;
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::error::TopemsError;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use topems_shared_event::event::{
    commit_retry, EventType, ReturnCompletedPayload, ReturnProcessedPayload,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReturnDecision {
    Accept,
    Process,
    Resolve,
    ConfirmDone,
    ReturnedToProcessing,
    Reject,
    Cancel,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProcessType {
    Refund,
    Exchange,
    Repair,
}

fn db_status_values() -> Vec<String> {
    ReturnStatus::DB_VALUES
        .iter()
        .map(|value| (*value).to_string())
        .collect()
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/returns", get(list_returns).post(create_return))
        .route(
            "/returns/{id}",
            get(get_return).put(update_return).delete(delete_return),
        )
        .route("/returns/{id}/approve", post(approve_return))
        .route("/returns/{id}/reject", post(reject_return))
        .route("/returns/{id}/receive", post(receive_return))
        .route("/returns/{id}/complete", post(complete_return))
        .route("/returns/{id}/cancel", post(cancel_return))
        .route("/returns/{id}/accept", post(accept_return))
        .route("/returns/{id}/process", post(process_return))
        .route("/returns/{id}/resolve", post(resolve_return))
        .route("/returns/{id}/confirm", post(confirm_return))
        .route(
            "/returns/{id}/items",
            get(list_return_items).post(add_return_item),
        )
        .route(
            "/returns/{id}/finance-status",
            get(get_return_finance_status),
        )
        .route(
            "/returns/{id}/inventory-status",
            get(get_return_inventory_status),
        )
}

/// 生成退换单号: RET-YYYYMMDD-6位序列号
async fn generate_return_no(
    _state: &ApiState,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    tenant_id: Uuid,
) -> String {
    let today = Utc::now().format("%Y%m%d").to_string();
    let prefix = format!("RET-{}", today);

    let seq: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM crm.returns
        WHERE deleted_at IS NULL AND tenant_id = $1 AND return_no LIKE $2
        "#,
    )
    .bind(tenant_id)
    .bind(format!("{}%", prefix))
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    let seq_num = seq + 1;
    format!("{}-{:06}", prefix, seq_num)
}

/// 从 Claims 中提取操作者 UUID
fn extract_operator_id(claims: &Claims) -> Option<Uuid> {
    Uuid::parse_str(&claims.sub).ok()
}

/// 重算退换单的退款金额：refund_amount = SUM(items.total_amount)
async fn recalculate_refund_amount(
    _state: &ApiState,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    return_id: Uuid,
    tenant_id: Uuid,
) -> Result<Decimal, sqlx::Error> {
    let total: Option<Decimal> = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(total_amount), 0) FROM crm.return_items
        WHERE return_id = $1 AND tenant_id = $2
        "#,
    )
    .bind(return_id)
    .bind(tenant_id)
    .fetch_optional(&mut **txn)
    .await?;

    let total = total.unwrap_or(Decimal::ZERO);

    let _ = sqlx::query(
        "UPDATE crm.returns SET refund_amount = $2, updated_at = $3 WHERE id = $1 AND tenant_id = $4",
    )
    .bind(return_id)
    .bind(total)
    .bind(Utc::now())
    .bind(tenant_id)
    .execute(&mut **txn)
    .await?;

    Ok(total)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:aftersales:read"])),
    path = "/returns",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "aftersales"
)]
pub async fn list_returns(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReturnQuery>,
    _headers: HeaderMap,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = match params.status.as_deref() {
        Some(raw) => match ReturnStatus::from_read_str(raw) {
            Some(status) => Some(status.as_db_str().to_string()),
            None => {
                return ApiResponse::from(TopemsError::ValidationFailed(format!(
                    "无效的退换货状态: {}",
                    raw
                )))
            }
        },
        None => None,
    };
    let db_values = db_status_values();

    let result = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns
        WHERE deleted_at IS NULL
          AND status = ANY($6::text[])
          AND ($1::text IS NULL OR status = $1)
          AND ($2::text IS NULL OR return_type = $2)
          AND ($3::uuid IS NULL OR customer_id = $3)
          AND ($4::uuid IS NULL OR order_id = $4)
          AND ($5::text IS NULL OR return_no ILIKE $5 OR reason ILIKE $5)
        ORDER BY created_at DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(&status_filter)
    .bind(&params.return_type)
    .bind(params.customer_id)
    .bind(params.order_id)
    .bind(&search_pattern)
    .bind(&db_values)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(returns) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.returns
                WHERE deleted_at IS NULL
                  AND status = ANY($6::text[])
                  AND ($1::text IS NULL OR status = $1)
                  AND ($2::text IS NULL OR return_type = $2)
                  AND ($3::uuid IS NULL OR customer_id = $3)
                  AND ($4::uuid IS NULL OR order_id = $4)
                  AND ($5::text IS NULL OR return_no ILIKE $5 OR reason ILIKE $5)
                "#,
            )
            .bind(&status_filter)
            .bind(&params.return_type)
            .bind(params.customer_id)
            .bind(params.order_id)
            .bind(&search_pattern)
            .bind(&db_values)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": returns,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取退换货列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取退换货列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取退换货列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:aftersales:write"])),
    path = "/returns",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "CRM/aftersales"
)]
pub(crate) async fn create_return(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateReturnRequest>,
) -> ApiResponse<Return> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let now = Utc::now();
    let id = Uuid::new_v4();
    let operator_id = extract_operator_id(&claims);

    let return_no = generate_return_no(&state, txn, tenant_id).await;
    let return_type = req
        .return_type
        .clone()
        .unwrap_or_else(|| "return".to_string());

    let result = sqlx::query_as::<_, Return>(
        r#"
        INSERT INTO crm.returns (
            id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
            status, refund_amount, exchange_product_id, received, created_by, updated_by, created_at, updated_at,
            ticket_id, warehouse_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $14, COALESCE($15, 0), $9, FALSE, $10, $10, $11, $11, $12, $13)
        RETURNING id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
                  status, refund_amount, exchange_product_id, received, received_at, approved_by,
                  approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
                  ticket_id, warehouse_id, deleted_at
        "#,
    )
    .bind(id)
    .bind(&return_no)
    .bind(tenant_id)
    .bind(req.customer_id)
    .bind(req.order_id)
    .bind(&return_type)
    .bind(&req.reason)
    .bind(&req.reason_detail)
    .bind(req.exchange_product_id)
    .bind(operator_id)
    .bind(now)
    .bind(req.ticket_id)
    .bind(req.warehouse_id)
    .bind(ReturnStatus::DEFAULT.as_db_str())
    .bind(req.refund_amount)
    .fetch_one(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(return_record) => (
            ApiResponse::success(return_record.clone(), "退换货申请创建成功"),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建退换货申请失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("创建退换货申请失败".to_string())),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    if result.is_ok() {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("提交事务失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
            }
        }
    }

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(return_record) = &result {
        serde_json::to_value(return_record).ok()
    } else {
        None
    };

    log_audit_event(
        &state.system_pool,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "return".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:aftersales:read"])),
    path = "/returns/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "aftersales"
)]
pub async fn get_return(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> ApiResponse<Return> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let db_values = db_status_values();
    let result = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns
        WHERE id = $1 AND deleted_at IS NULL AND status = ANY($2::text[])
        "#,
    )
    .bind(id)
    .bind(&db_values)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(return_record)) => ApiResponse::success(return_record, "获取退换货成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("退换货不存在".to_string())),
        Err(e) => {
            tracing::error!("获取退换货失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取退换货失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["crm:aftersales:write"])),
    path = "/returns/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "CRM/aftersales"
)]
pub(crate) async fn update_return(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateReturnRequest>,
) -> ApiResponse<Return> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    let db_values = db_status_values();
    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns
        WHERE id = $1 AND deleted_at IS NULL AND status = ANY($2::text[])
        "#,
    )
    .bind(id)
    .bind(&db_values)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("退换货不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询退换货失败", e)),
    };

    let request_data = serde_json::to_value(&req).ok();
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let customer_id = req.customer_id.or(existing.customer_id);
    let order_id = req.order_id.or(existing.order_id);
    let return_type = req.return_type.unwrap_or(existing.return_type);
    let reason = req.reason.or(existing.reason);
    let reason_detail = req.reason_detail.or(existing.reason_detail);
    let exchange_product_id = req.exchange_product_id.or(existing.exchange_product_id);
    let ticket_id = req.ticket_id.or(existing.ticket_id);
    let warehouse_id = req.warehouse_id.or(existing.warehouse_id);
    let refund_amount = req.refund_amount.or_else(|| Some(existing.refund_amount));

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            customer_id = $2, order_id = $3, return_type = $4, reason = $5,
            reason_detail = $6, exchange_product_id = $7,
            ticket_id = $8, warehouse_id = $9,
            refund_amount = COALESCE($10, refund_amount),
            updated_by = $11, updated_at = $12
        WHERE id = $1 AND tenant_id = $13 AND deleted_at IS NULL
          AND status = ANY($14::text[])
        RETURNING id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
                  status, refund_amount, exchange_product_id, received, received_at, approved_by,
                  approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
                  ticket_id, warehouse_id, deleted_at
        "#,
    )
    .bind(id)
    .bind(customer_id)
    .bind(order_id)
    .bind(&return_type)
    .bind(&reason)
    .bind(&reason_detail)
    .bind(exchange_product_id)
    .bind(ticket_id)
    .bind(warehouse_id)
    .bind(refund_amount)
    .bind(operator_id)
    .bind(now)
    .bind(tenant_id)
    .bind(&db_values)
    .fetch_optional(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(Some(return_record)) => (
            ApiResponse::success(return_record.clone(), "退换货更新成功"),
            "success".to_string(),
            None,
        ),
        Ok(None) => (
            ApiResponse::conflict("退换货状态或数据已被并发变更，请刷新后重试"),
            "error".to_string(),
            Some("退换货状态或数据已被并发变更".to_string()),
        ),
        Err(e) => {
            tracing::error!("更新退换货失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("更新退换货失败".to_string())),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    if matches!(&result, Ok(Some(_))) {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("提交事务失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
            }
        }
    }

    let response_data = if let Ok(Some(return_record)) = &result {
        serde_json::to_value(return_record).ok()
    } else {
        None
    };

    log_audit_event(
        &state.system_pool,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "return".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: request_data,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["crm:aftersales:write"])),
    path = "/returns/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "CRM/aftersales"
)]
pub(crate) async fn delete_return(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> ApiResponse<String> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    // 先查询退换单状态
    let db_values = db_status_values();
    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns
        WHERE id = $1 AND deleted_at IS NULL AND status = ANY($2::text[])
        "#,
    )
    .bind(id)
    .bind(&db_values)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("退换货不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询退换货失败", e)),
    };

    // 仅允许 pending/cancelled 状态的退换单被删除
    let current = match ReturnStatus::from_db_str(&existing.status) {
        Some(status) => status,
        None => return ApiResponse::conflict("退换货状态非法，需先修复数据"),
    };
    if !matches!(current, ReturnStatus::Pending | ReturnStatus::Cancelled) {
        return ApiResponse::conflict(&format!(
            "当前状态 {} 不允许删除，仅 pending/cancelled 可删除",
            current.as_db_str()
        ));
    }

    let deletable: Vec<String> = ReturnStatus::DELETABLE
        .iter()
        .map(|value| (*value).to_string())
        .collect();
    let result = sqlx::query(
        "UPDATE crm.returns SET deleted_at = NOW() \
         WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL \
           AND status = ANY($3::text[])",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(&deletable)
    .execute(&mut **txn)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            ApiResponse::success("".to_string(), "退换货删除成功"),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            ApiResponse::conflict("退换货状态已被并发变更，请刷新后重试"),
            "error".to_string(),
            Some("退换货状态已被并发变更".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除退换货失败: {}", e);
            (
                ApiResponse::from(TopemsError::Internal("删除退换货失败".to_string())),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    if matches!(&result, Ok(r) if r.rows_affected() > 0) {
        if let Some(t) = guard.take() {
            if let Err(e) = t.commit().await {
                tracing::error!("提交事务失败: {}", e);
                return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
            }
        }
    }

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.system_pool,
        AuditEventParams {
            action: "delete".to_string(),
            entity_type: "return".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: None,
            user_name: None,
            request_details: None,
            response_details: response_data,
            status: status_str,
            error_message: error_msg,
        },
        &headers,
    )
    .await;

    response
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:aftersales:write"])),
    path = "/returns/{id}/approve",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "aftersales"
)]
pub async fn approve_return(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<ReturnActionRequest>,
) -> ApiResponse<Return> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let db_values = db_status_values();
    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns
        WHERE id = $1 AND deleted_at IS NULL AND status = ANY($2::text[])
        "#,
    )
    .bind(id)
    .bind(&db_values)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("退换货不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询退换货失败", e)),
    };

    // 状态流转校验：pending → approved
    let current = match ReturnStatus::from_db_str(&existing.status) {
        Some(status) => status,
        None => return ApiResponse::conflict("退换货状态非法，需先修复数据"),
    };
    if !current.can_transition_to(ReturnStatus::Approved) {
        return ApiResponse::conflict(&format!("当前状态 {} 不允许审批通过", current.as_db_str()));
    }

    let approvable: Vec<String> = ReturnStatus::APPROVABLE_FROM
        .iter()
        .map(|value| (*value).to_string())
        .collect();
    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = $5, approved_by = $2, approved_at = $3,
            updated_by = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4 AND deleted_at IS NULL
          AND status = ANY($6::text[])
        RETURNING id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
                  status, refund_amount, exchange_product_id, received, received_at, approved_by,
                  approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
                  ticket_id, warehouse_id, deleted_at
        "#,
    )
    .bind(id)
    .bind(operator_id)
    .bind(now)
    .bind(tenant_id)
    .bind(ReturnStatus::Approved.as_db_str())
    .bind(&approvable)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(return_record)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }
            tracing::debug!(
                "退换货 {} 审批通过，操作备注: {:?}",
                return_record.return_no,
                req.comment
            );
            ApiResponse::success(return_record, "退换货审批通过")
        }
        Ok(None) => ApiResponse::conflict("退换货状态已被并发变更，请刷新后重试"),
        Err(e) => {
            tracing::error!("审批退换货失败: {}", e);
            ApiResponse::from(TopemsError::Internal("审批退换货失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:aftersales:write"])),
    path = "/returns/{id}/reject",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "aftersales"
)]
pub async fn reject_return(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<ReturnActionRequest>,
) -> ApiResponse<Return> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let db_values = db_status_values();
    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns
        WHERE id = $1 AND deleted_at IS NULL AND status = ANY($2::text[])
        "#,
    )
    .bind(id)
    .bind(&db_values)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("退换货不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询退换货失败", e)),
    };

    // 状态流转校验：pending → rejected
    let current = match ReturnStatus::from_db_str(&existing.status) {
        Some(status) => status,
        None => return ApiResponse::conflict("退换货状态非法，需先修复数据"),
    };
    if !current.can_transition_to(ReturnStatus::Rejected) {
        return ApiResponse::conflict(&format!("当前状态 {} 不允许拒绝", current.as_db_str()));
    }

    let approvable: Vec<String> = ReturnStatus::APPROVABLE_FROM
        .iter()
        .map(|value| (*value).to_string())
        .collect();
    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = $5, approved_by = $2, approved_at = $3,
            updated_by = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4 AND deleted_at IS NULL
          AND status = ANY($6::text[])
        RETURNING id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
                  status, refund_amount, exchange_product_id, received, received_at, approved_by,
                  approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
                  ticket_id, warehouse_id, deleted_at
        "#,
    )
    .bind(id)
    .bind(operator_id)
    .bind(now)
    .bind(tenant_id)
    .bind(ReturnStatus::Rejected.as_db_str())
    .bind(&approvable)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(return_record)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }
            tracing::debug!(
                "退换货 {} 已拒绝，操作备注: {:?}",
                return_record.return_no,
                req.comment
            );
            ApiResponse::success(return_record, "退换货已拒绝")
        }
        Ok(None) => ApiResponse::conflict("退换货状态已被并发变更，请刷新后重试"),
        Err(e) => {
            tracing::error!("拒绝退换货失败: {}", e);
            ApiResponse::from(TopemsError::Internal("拒绝退换货失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:aftersales:write"])),
    path = "/returns/{id}/receive",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "aftersales"
)]
pub async fn receive_return(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<ReturnActionRequest>,
) -> ApiResponse<Return> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let db_values = db_status_values();
    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns
        WHERE id = $1 AND deleted_at IS NULL AND status = ANY($2::text[])
        "#,
    )
    .bind(id)
    .bind(&db_values)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("退换货不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询退换货失败", e)),
    };

    // 状态流转校验：approved → processing，记录 received_at
    let current = match ReturnStatus::from_db_str(&existing.status) {
        Some(status) => status,
        None => return ApiResponse::conflict("退换货状态非法，需先修复数据"),
    };
    if !current.can_transition_to(ReturnStatus::Processing) {
        return ApiResponse::conflict(&format!("当前状态 {} 不允许确认收货", current.as_db_str()));
    }

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = $6, received = TRUE, received_at = $2,
            updated_by = $3, updated_at = $4
        WHERE id = $1 AND tenant_id = $5 AND deleted_at IS NULL
          AND status = $7
        RETURNING id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
                  status, refund_amount, exchange_product_id, received, received_at, approved_by,
                  approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
                  ticket_id, warehouse_id, deleted_at
        "#,
    )
    .bind(id)
    .bind(now)
    .bind(operator_id)
    .bind(now)
    .bind(tenant_id)
    .bind(ReturnStatus::Processing.as_db_str())
    .bind(ReturnStatus::Approved.as_db_str())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(return_record)) => {
            tracing::debug!(
                "退换货 {} 已确认收货，操作备注: {:?}",
                return_record.return_no,
                req.comment
            );
            // 库存联动：确认收货时同步退货入库到 erp.inventory
            if let Err(e) = sync_return_to_inventory(&state, txn, return_record.id, tenant_id).await
            {
                tracing::warn!("退换货 {} 库存联动失败: {}", return_record.return_no, e);
            }

            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }
            ApiResponse::success(return_record, "退换货已确认收货")
        }
        Ok(None) => ApiResponse::conflict("退换货状态已被并发变更，请刷新后重试"),
        Err(e) => {
            tracing::error!("确认收货失败: {}", e);
            ApiResponse::from(TopemsError::Internal("确认收货失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:aftersales:write"])),
    path = "/returns/{id}/complete",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "aftersales"
)]
pub async fn complete_return(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ReturnActionRequest>,
) -> ApiResponse<Return> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let locale = Locale::from_headers(&headers).as_sql();
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let db_values = db_status_values();
    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns
        WHERE id = $1 AND deleted_at IS NULL AND status = ANY($2::text[])
        "#,
    )
    .bind(id)
    .bind(&db_values)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("退换货不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询退换货失败", e)),
    };

    // 状态流转校验：processing → completed，记录 completed_at
    let current = match ReturnStatus::from_db_str(&existing.status) {
        Some(status) => status,
        None => return ApiResponse::conflict("退换货状态非法，需先修复数据"),
    };
    if !current.can_transition_to(ReturnStatus::Completed) {
        return ApiResponse::conflict(&format!("当前状态 {} 不允许完成", current.as_db_str()));
    }

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = $6, completed_at = $2,
            updated_by = $3, updated_at = $4
        WHERE id = $1 AND tenant_id = $5 AND deleted_at IS NULL
          AND status = $7
        RETURNING id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
                  status, refund_amount, exchange_product_id, received, received_at, approved_by,
                  approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
                  ticket_id, warehouse_id, deleted_at
        "#,
    )
    .bind(id)
    .bind(now)
    .bind(operator_id)
    .bind(now)
    .bind(tenant_id)
    .bind(ReturnStatus::Completed.as_db_str())
    .bind(ReturnStatus::Processing.as_db_str())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(return_record)) => {
            tracing::debug!(
                "退换货 {} 已完成，操作备注: {:?}",
                return_record.return_no,
                req.comment
            );

            // 财务对账：退换货完成时同步到 erp.fin_reconciliations（仍在事务内）
            if let Err(e) =
                sync_return_to_finance(&state, txn, return_record.id, tenant_id, &locale).await
            {
                tracing::warn!("退换货 {} 财务对账失败: {}", return_record.return_no, e);
            }

            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }

            // D6：commit 成功后再 emit（commit 失败不发，消除孤儿事件）；发布失败入 ZSET 重试。
            if let Some(publisher) = state.event_publisher.clone() {
                let return_id = return_record.id;
                let return_no = return_record.return_no.clone();
                let order_id = return_record.order_id;
                let customer_id = return_record.customer_id;
                let status = return_record.status.clone();
                tokio::spawn(async move {
                    let return_no_log = return_no.clone();
                    let payload = ReturnProcessedPayload {
                        return_id,
                        return_no,
                        order_id,
                        customer_id,
                        product_id: None,
                        quantity: None,
                        status,
                        processed_by: None,
                    };
                    let et = EventType::ReturnProcessed;
                    match publisher.publish_event(et, &payload).await {
                        Ok(_) => tracing::info!(
                            "[crm] ReturnProcessed 事件发布成功 - return_no={}",
                            return_no_log
                        ),
                        Err(e) => {
                            tracing::warn!("[crm] ReturnProcessed 事件发布失败: {}，入重试队列", e);
                            commit_retry::push_retry_typed("crm", et, &payload).await;
                        }
                    }
                });
            }

            // 发布 ReturnCompleted 业务事件，ERP 订阅后生成退款凭证
            // 解决 StockOutbound 与退款语义不匹配问题：退款应在退货完成时触发
            if let Some(publisher) = state.event_publisher.clone() {
                let return_id = return_record.id;
                let return_no = return_record.return_no.clone();
                let customer_id = return_record.customer_id;
                let order_id = return_record.order_id;
                // U6-2：refund_amount 已是 Decimal，直接透传
                let refund_amount = return_record.refund_amount;
                let return_type = return_record.return_type.clone();
                let status = return_record.status.clone();
                let completed_by = operator_id;
                let completed_at = now.to_rfc3339();
                let tenant_id_pub = Some(tenant_id);
                tokio::spawn(async move {
                    let return_no_log = return_no.clone();
                    let payload = ReturnCompletedPayload {
                        return_id,
                        return_no,
                        customer_id,
                        customer_name: None,
                        order_id,
                        order_no: None,
                        refund_amount,
                        return_type,
                        status,
                        completed_by,
                        completed_at,
                        tenant_id: tenant_id_pub,
                    };
                    let et = EventType::ReturnCompleted;
                    match publisher.publish_event(et, &payload).await {
                        Ok(_) => tracing::info!(
                            "[crm] ReturnCompleted 事件发布成功 - return_no={}",
                            return_no_log
                        ),
                        Err(e) => {
                            tracing::warn!("[crm] ReturnCompleted 事件发布失败: {}，入重试队列", e);
                            commit_retry::push_retry_typed("crm", et, &payload).await;
                        }
                    }
                });
            }

            ApiResponse::success(return_record, "退换货已完成")
        }
        Ok(None) => ApiResponse::conflict("退换货状态已被并发变更，请刷新后重试"),
        Err(e) => {
            tracing::error!("完成退换货失败: {}", e);
            ApiResponse::from(TopemsError::Internal("完成退换货失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:aftersales:write"])),
    path = "/returns/{id}/cancel",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "aftersales"
)]
pub async fn cancel_return(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<ReturnActionRequest>,
) -> ApiResponse<Return> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let db_values = db_status_values();
    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns
        WHERE id = $1 AND deleted_at IS NULL AND status = ANY($2::text[])
        "#,
    )
    .bind(id)
    .bind(&db_values)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("退换货不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询退换货失败", e)),
    };

    // 状态流转校验：终态不可取消，仅非终态可取消
    let current = match ReturnStatus::from_db_str(&existing.status) {
        Some(status) => status,
        None => return ApiResponse::conflict("退换货状态非法，需先修复数据"),
    };
    if !current.can_transition_to(ReturnStatus::Cancelled) {
        return ApiResponse::conflict(&format!("当前状态 {} 不允许取消", current.as_db_str()));
    }
    let cancellable: Vec<String> = ReturnStatus::CANCELLABLE
        .iter()
        .map(|value| (*value).to_string())
        .collect();

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = $5, updated_by = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4 AND deleted_at IS NULL
          AND status = ANY($6::text[])
        RETURNING id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
                  status, refund_amount, exchange_product_id, received, received_at, approved_by,
                  approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
                  ticket_id, warehouse_id, deleted_at
        "#,
    )
    .bind(id)
    .bind(operator_id)
    .bind(now)
    .bind(tenant_id)
    .bind(ReturnStatus::Cancelled.as_db_str())
    .bind(&cancellable)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(return_record)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }
            tracing::debug!(
                "退换货 {} 已取消，操作备注: {:?}",
                return_record.return_no,
                req.comment
            );
            ApiResponse::success(return_record, "退换货已取消")
        }
        Ok(None) => ApiResponse::conflict("退换货状态已被并发变更，请刷新后重试"),
        Err(e) => {
            tracing::error!("取消退换货失败: {}", e);
            ApiResponse::from(TopemsError::Internal("取消退换货失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:aftersales:read"])),
    path = "/returns/{id}/items",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "aftersales"
)]
pub async fn list_return_items(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> ApiResponse<Vec<ReturnItem>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let result = sqlx::query_as::<_, ReturnItem>(
        r#"
        SELECT id, return_id, tenant_id, product_id, quantity, unit_price, total_amount, created_at
        FROM crm.return_items
        WHERE return_id = $1
        ORDER BY created_at ASC
        "#,
    )
    .bind(id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(items) => ApiResponse::success(items, "获取退换货明细成功"),
        Err(e) => {
            tracing::error!("获取退换货明细失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取退换货明细失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:aftersales:write"])),
    path = "/returns/{id}/items",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "CRM/aftersales"
)]
pub(crate) async fn add_return_item(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<CreateReturnItemRequest>,
) -> ApiResponse<ReturnItem> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    if req.quantity <= 0 {
        return ApiResponse::from(TopemsError::ValidationFailed("数量必须大于零".to_string()));
    }
    if req.unit_price < Decimal::ZERO {
        return ApiResponse::from(TopemsError::ValidationFailed("单价不能为负".to_string()));
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };

    // 校验退换单存在
    let exists: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM crm.returns WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await
    .unwrap_or(None);

    if exists.is_none() {
        return ApiResponse::from(TopemsError::ResourceNotFound("退换货不存在".to_string()));
    }

    let item_id = Uuid::new_v4();
    let now = Utc::now();
    // total_amount = quantity * unit_price
    let total_amount = req.unit_price * Decimal::from(req.quantity);

    let result = sqlx::query_as::<_, ReturnItem>(
        r#"
        INSERT INTO crm.return_items (id, return_id, tenant_id, product_id, quantity, unit_price, total_amount, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, return_id, tenant_id, product_id, quantity, unit_price, total_amount, created_at
        "#,
    )
    .bind(item_id)
    .bind(id)
    .bind(tenant_id)
    .bind(req.product_id)
    .bind(req.quantity)
    .bind(req.unit_price)
    .bind(total_amount)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(item) => {
            // 自动重算退款金额
            let _ = recalculate_refund_amount(&state, txn, id, tenant_id).await;

            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }
            ApiResponse::success(item, "退换货明细添加成功")
        }
        Err(e) => {
            tracing::error!("添加退换货明细失败: {}", e);
            ApiResponse::from(TopemsError::Internal("添加退换货明细失败".to_string()))
        }
    }
}

// ============================================================
//  退换货财务对账 & 库存联动 & 状态查询
// ============================================================

/// 退换货财务对账：在退换货完成时（complete_return 内）调用
///
/// V19.0: 服务边界治理 - 跨库直写已替换为 HTTP API 调用
/// 原 SQL `INSERT INTO erp.fin_reconciliations` / `INSERT INTO erp.vouchers`
/// 改为通过 `TypedServiceClient<ErpApi>` 调用 ERP 服务的 REST API。
pub async fn sync_return_to_finance(
    state: &ApiState,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    return_id: Uuid,
    tenant_id: Uuid,
    _locale: &str,
) -> Result<Uuid, TopemsError> {
    let return_record: Return = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1
        "#,
    )
    .bind(return_id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await?;

    let now = Utc::now();
    let recon_id = Uuid::new_v4();
    let period = now.format("%Y-%m").to_string();

    // V19.0: 服务边界治理 - 跨库直写已替换为 HTTP API 调用
    // 原 `INSERT INTO erp.fin_reconciliations` 改为调用 POST /api/erp/finance/reconciliation
    let erp_client = state.erp_client.as_ref().ok_or_else(|| {
        std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "ERP service client not configured",
        )
    })?;
    // CreateReconciliationRequest schema: reconciliation_type/period/reference_id/total_amount/record_ids
    // V19.5: 字段名对齐 erp 真实实现（reconciliation_type 而非 type）
    // graceful fallback：失败仅 warn，不阻塞主流程
    let refund_amount_f64 = return_record.refund_amount.to_f64().unwrap_or(0.0);
    let recon_payload = serde_json::json!({
        "reconciliation_type": "manual",
        "period": period,
        "reference_id": return_record.return_no,
        "total_amount": refund_amount_f64,
        "record_ids": [],
    });
    if let Err(e) = erp_client.create_reconciliation(&recon_payload).await {
        tracing::warn!("创建退款对账记录失败（不阻塞主流程）: {}", e);
    }

    tracing::debug!(
        "退换货 {} 已同步至财务对账（recon_id={}）",
        return_record.return_no,
        recon_id
    );

    // 退款凭证已收敛至 finance：finance 订阅 ReturnCompleted 事件生成完整平衡分录，
    // CRM 不再直调 ERP 写凭证（避免双账簿与漏记）。

    Ok(recon_id)
}

/// 退换货库存联动：在退换货收货时（receive_return 内）调用
///
/// V19.0: 服务边界治理 - 跨库直写已替换为 HTTP API 调用
/// 原 SQL `UPDATE erp.inventory` / `INSERT INTO erp.inventory_movements`
/// 改为通过 `TypedServiceClient<WmsApi>` 调用 WMS 服务的 REST API。
/// - 调用 PUT /api/wms/inventory/{material_id} 更新库存
/// - 调用 POST /api/wms/inventory-movements 登记审计流水
pub async fn sync_return_to_inventory(
    state: &ApiState,
    txn: &mut sqlx::Transaction<'static, sqlx::Postgres>,
    return_id: Uuid,
    tenant_id: Uuid,
) -> Result<u64, TopemsError> {
    let return_record: Return = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1
        "#,
    )
    .bind(return_id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await?;

    let warehouse_id = match return_record.warehouse_id {
        Some(w) => w,
        None => {
            tracing::debug!(
                "退换货 {} 未指定 warehouse_id，跳过库存联动",
                return_record.return_no
            );
            return Ok(0);
        }
    };

    let items: Vec<ReturnItem> = sqlx::query_as::<_, ReturnItem>(
        r#"
        SELECT id, return_id, tenant_id, product_id, quantity, unit_price, total_amount, created_at
        FROM crm.return_items
        WHERE return_id = $1
        "#,
    )
    .bind(return_id)
    .fetch_all(&mut **txn)
    .await?;

    if items.is_empty() {
        tracing::info!("退换货 {} 无明细，跳过库存联动", return_record.return_no);
        return Ok(0);
    }

    let now = Utc::now();
    let items_count = items.len();

    // V19.0: 服务边界治理 - 跨库直写已替换为 HTTP API 调用
    // WMS 客户端由 ApiState 注入；若未配置则跳过库存联动并记录告警。
    // 注：显式类型注解避免 Rust 2024 edition 的 never type fallback 问题
    let wms_client: &Arc<
        topems_shared_service_client::service_client::TypedServiceClient<
            topems_shared_service_client::service_client::WmsApi,
        >,
    > = match state.wms_client.as_ref() {
        Some(c) => c,
        None => {
            tracing::warn!(
                "退换货 {} 库存联动跳过：WMS 服务客户端未配置",
                return_record.return_no
            );
            return Ok(0);
        }
    };

    let mut synced: u64 = 0;

    for item in items {
        // product_id 为 Option<Uuid>，缺失时跳过该明细
        let product_id = match item.product_id {
            Some(p) => p,
            None => {
                tracing::warn!(
                    "退换货 {} 存在 product_id 为空的明细，跳过库存联动",
                    return_record.return_no
                );
                continue;
            }
        };

        // V19.0: 服务边界治理 - 跨库直写已替换为 HTTP API 调用
        // 原 `UPDATE erp.inventory` 改为调用 PUT /api/wms/inventory/{material_id}
        // 注：crm.return_items.product_id 对应 erp.inventory.material_id（同一物料 UUID）
        let inventory_payload = serde_json::json!({
            "material_id": product_id,
            "warehouse_id": warehouse_id,
            "quantity_delta": Decimal::from(item.quantity),
            "available_quantity_delta": Decimal::from(item.quantity),
            "updated_at": now,
        });
        match wms_client
            .update_inventory(&product_id.to_string(), &inventory_payload)
            .await
        {
            Ok(_) => {
                synced += 1;
            }
            Err(e) => {
                tracing::warn!(
                    "退换货 {} 库存更新失败（material_id={}）: {}",
                    return_record.return_no,
                    product_id,
                    e
                );
            }
        }

        // V19.0: 服务边界治理 - 跨库直写已替换为 HTTP API 调用
        // 原 `INSERT INTO erp.inventory_movements` 改为调用 POST /api/wms/inventory-movements
        let movement_payload = serde_json::json!({
            "id": Uuid::new_v4(),
            "tenant_id": tenant_id,
            "material_id": product_id,
            "warehouse_id": warehouse_id,
            "quantity": Decimal::from(item.quantity),
            "movement_type": "return_in",
            "ref_id": return_id,
            "ref_type": "return",
            "unit": return_record.return_no,
            "remark": format!("退货入库：{}", return_record.return_no),
            "created_at": now,
            "updated_at": now,
        });
        if let Err(e) = wms_client
            .create_inventory_movement(&movement_payload)
            .await
        {
            tracing::warn!(
                "退换货 {} 库存流水登记失败（material_id={}）: {}",
                return_record.return_no,
                product_id,
                e
            );
        }
    }

    tracing::debug!(
        "退换货 {} 库存联动完成（{} 个明细，路径=wms_api）",
        return_record.return_no,
        items_count
    );

    Ok(synced)
}

/// 查询退换货的财务对账状态
#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:aftersales:read"])),
    path = "/returns/{id}/finance-status",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "aftersales"
)]
pub async fn get_return_finance_status(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    // 校验退换单存在（租户隔离由严格 RLS 承担）
    let db_values = db_status_values();
    let exists: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM crm.returns \
         WHERE deleted_at IS NULL AND id = $1 AND status = ANY($2::text[])",
    )
    .bind(id)
    .bind(&db_values)
    .fetch_optional(&mut **txn)
    .await
    .ok()
    .flatten();

    if exists.is_none() {
        return ApiResponse::from(TopemsError::ResourceNotFound("退换货不存在".to_string()));
    }

    // V19.0: 服务边界治理 - 跨库直写已替换为 HTTP API 调用
    // 原 `SELECT ... FROM erp.fin_reconciliations` 改为调用
    // GET /api/erp/finance/reconciliation?ref_id={}&ref_type=return
    let result: serde_json::Value = match state.erp_client.as_ref() {
        Some(client) => match client
            .list_reconciliations_by_ref(&id.to_string(), "return")
            .await
        {
            Ok(resp) => serde_json::Value::Array(resp),
            Err(e) => {
                tracing::error!("获取退换货财务对账状态失败: {}", e);
                return ApiResponse::from(TopemsError::Internal(
                    "获取退换货财务对账状态失败".to_string(),
                ));
            }
        },
        None => {
            tracing::warn!("ERP 服务客户端未配置，返回空对账列表");
            serde_json::Value::Array(vec![])
        }
    };

    let items: Vec<serde_json::Value> = match result {
        serde_json::Value::Array(arr) => arr,
        serde_json::Value::Object(ref obj) if obj.contains_key("items") => obj
            .get("items")
            .cloned()
            .unwrap_or_else(|| serde_json::Value::Array(vec![]))
            .as_array()
            .cloned()
            .unwrap_or_default(),
        _ => vec![],
    };

    ApiResponse::success(
        serde_json::json!({
            "return_id": id,
            "reconciliations": items,
            "total": items.len()
        }),
        "获取退换货财务对账状态成功",
    )
}

/// 查询退换货的库存联动状态（已记录的库存移动流水）
#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:aftersales:read"])),
    path = "/returns/{id}/inventory-status",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "aftersales"
)]
pub async fn get_return_inventory_status(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    // 校验退换单存在（租户隔离由严格 RLS 承担）
    let db_values = db_status_values();
    let exists: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM crm.returns \
         WHERE deleted_at IS NULL AND id = $1 AND status = ANY($2::text[])",
    )
    .bind(id)
    .bind(&db_values)
    .fetch_optional(&mut **txn)
    .await
    .ok()
    .flatten();

    if exists.is_none() {
        return ApiResponse::from(TopemsError::ResourceNotFound("退换货不存在".to_string()));
    }

    // V19.0: 服务边界治理 - 跨库直写已替换为 HTTP API 调用
    // 原 `SELECT ... FROM erp.inventory_movements` 改为调用
    // GET /api/wms/inventory-movements?ref_id={}&ref_type=return
    let result: serde_json::Value = match state.wms_client.as_ref() {
        Some(client) => match client
            .list_inventory_movements_by_ref(&id.to_string(), "return")
            .await
        {
            Ok(resp) => resp,
            Err(e) => {
                tracing::error!("获取退换货库存联动状态失败: {}", e);
                return ApiResponse::from(TopemsError::Internal(
                    "获取退换货库存联动状态失败".to_string(),
                ));
            }
        },
        None => {
            tracing::warn!("WMS 服务客户端未配置，返回空流水列表");
            serde_json::Value::Array(vec![])
        }
    };

    let items: Vec<serde_json::Value> = match result {
        serde_json::Value::Array(arr) => arr,
        serde_json::Value::Object(ref obj) if obj.contains_key("items") => obj
            .get("items")
            .cloned()
            .unwrap_or_else(|| serde_json::Value::Array(vec![]))
            .as_array()
            .cloned()
            .unwrap_or_default(),
        _ => vec![],
    };

    ApiResponse::success(
        serde_json::json!({
            "return_id": id,
            "movements": items,
            "total": items.len()
        }),
        "获取退换货库存联动状态成功",
    )
}

// ============================================================
//  Return FSM 按 spec §5.2 的 4 个规范 handlers
//  状态链：Pending → Accepted → Processing → Resolving → Done
//  分支：Resolving → Processing（退回重新处理）
//  分支：Resolving → Rejected（拒绝终止）
//  终态：Done / Rejected / Cancelled
// ============================================================

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:aftersales:write"])),
    path = "/returns/{id}/accept",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "aftersales"
)]
async fn accept_return(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Json(_req): Json<ReturnActionRequest>,
) -> ApiResponse<Return> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let db_values = db_status_values();
    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns
        WHERE id = $1 AND deleted_at IS NULL AND status = ANY($2::text[])
        "#,
    )
    .bind(id)
    .bind(&db_values)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("退换货不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询退换货失败", e)),
    };

    let current = match ReturnStatus::from_db_str(&existing.status) {
        Some(status) => status,
        None => return ApiResponse::conflict("退换货状态非法，需先修复数据"),
    };
    if !current.can_transition_to(ReturnStatus::Accepted) {
        return ApiResponse::conflict(&format!("状态 {} 不允许受理", current.as_db_str()));
    }

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = $5, approved_by = $2, approved_at = $3,
            updated_by = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4 AND deleted_at IS NULL
          AND status = $6
        RETURNING id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
                  status, refund_amount, exchange_product_id, received, received_at, approved_by,
                  approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
                  ticket_id, warehouse_id, deleted_at
        "#,
    )
    .bind(id)
    .bind(operator_id)
    .bind(now)
    .bind(tenant_id)
    .bind(ReturnStatus::Accepted.as_db_str())
    .bind(ReturnStatus::Pending.as_db_str())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(r)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }
            ApiResponse::success(r, "退换货已受理")
        }
        Ok(None) => ApiResponse::conflict("退换货状态已被并发变更，请刷新后重试"),
        Err(e) => {
            tracing::error!("受理退换货失败: {}", e);
            ApiResponse::from(TopemsError::Internal("受理退换货失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:aftersales:write"])),
    path = "/returns/{id}/process",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "aftersales"
)]
pub async fn process_return(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Json(_req): Json<ReturnActionRequest>,
) -> ApiResponse<Return> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let db_values = db_status_values();
    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns
        WHERE id = $1 AND deleted_at IS NULL AND status = ANY($2::text[])
        "#,
    )
    .bind(id)
    .bind(&db_values)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("退换货不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询退换货失败", e)),
    };

    let current = match ReturnStatus::from_db_str(&existing.status) {
        Some(status) => status,
        None => return ApiResponse::conflict("退换货状态非法，需先修复数据"),
    };
    if !current.can_transition_to(ReturnStatus::Processing) {
        return ApiResponse::conflict(&format!("状态 {} 不允许进入处理", current.as_db_str()));
    }
    let process_from: Vec<String> = ReturnStatus::PROCESS_FROM
        .iter()
        .map(|value| (*value).to_string())
        .collect();

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = $6, received = TRUE, received_at = $2,
            updated_by = $3, updated_at = $4
        WHERE id = $1 AND tenant_id = $5 AND deleted_at IS NULL
          AND status = ANY($7::text[])
        RETURNING id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
                  status, refund_amount, exchange_product_id, received, received_at, approved_by,
                  approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
                  ticket_id, warehouse_id, deleted_at
        "#,
    )
    .bind(id)
    .bind(now)
    .bind(operator_id)
    .bind(now)
    .bind(tenant_id)
    .bind(ReturnStatus::Processing.as_db_str())
    .bind(&process_from)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(return_record)) => {
            if let Err(e) = sync_return_to_inventory(&state, txn, return_record.id, tenant_id).await
            {
                tracing::warn!("退换货 {} 库存联动失败: {}", return_record.return_no, e);
            }

            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }
            ApiResponse::success(return_record, "退换货进入处理中")
        }
        Ok(None) => ApiResponse::conflict("退换货状态已被并发变更，请刷新后重试"),
        Err(e) => {
            tracing::error!("处理退换货失败: {}", e);
            ApiResponse::from(TopemsError::Internal("处理退换货失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:aftersales:write"])),
    path = "/returns/{id}/resolve",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "aftersales"
)]
pub async fn resolve_return(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<ReturnActionRequest>,
) -> ApiResponse<Return> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let db_values = db_status_values();
    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns
        WHERE id = $1 AND deleted_at IS NULL AND status = ANY($2::text[])
        "#,
    )
    .bind(id)
    .bind(&db_values)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("退换货不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询退换货失败", e)),
    };

    let current = match ReturnStatus::from_db_str(&existing.status) {
        Some(status) => status,
        None => return ApiResponse::conflict("退换货状态非法，需先修复数据"),
    };
    if !matches!(
        current,
        ReturnStatus::Accepted | ReturnStatus::Approved | ReturnStatus::Processing
    ) {
        return ApiResponse::conflict(&format!("状态 {} 不允许方案确认", current.as_db_str()));
    }
    let resolve_from: Vec<String> = ReturnStatus::RESOLVE_FROM
        .iter()
        .map(|value| (*value).to_string())
        .collect();

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = $2, resolved_at = COALESCE(resolved_at, $4),
            updated_by = $3, updated_at = $4
        WHERE id = $1 AND tenant_id = $5 AND deleted_at IS NULL
          AND status = ANY($6::text[])
        RETURNING id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
                  status, refund_amount, exchange_product_id, received, received_at, approved_by,
                  approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
                  ticket_id, warehouse_id, deleted_at
        "#,
    )
    .bind(id)
    .bind(ReturnStatus::Processing.as_db_str())
    .bind(operator_id)
    .bind(now)
    .bind(tenant_id)
    .bind(&resolve_from)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(r)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }
            let msg = if req.process_type.as_deref() == Some("returned") {
                "退换货已退回重新处理"
            } else {
                "退换货进入方案确认"
            };
            ApiResponse::success(r, msg)
        }
        Ok(None) => ApiResponse::conflict("退换货状态已被并发变更，请刷新后重试"),
        Err(e) => {
            tracing::error!("方案确认失败: {}", e);
            ApiResponse::from(TopemsError::Internal("方案确认失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:aftersales:write"])),
    path = "/returns/{id}/confirm",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "aftersales"
)]
pub async fn confirm_return(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ReturnActionRequest>,
) -> ApiResponse<Return> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let locale = Locale::from_headers(&headers).as_sql();
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let db_values = db_status_values();
    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns
        WHERE id = $1 AND deleted_at IS NULL AND status = ANY($2::text[])
        "#,
    )
    .bind(id)
    .bind(&db_values)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("退换货不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询退换货失败", e)),
    };

    let current = match ReturnStatus::from_db_str(&existing.status) {
        Some(status) => status,
        None => return ApiResponse::conflict("退换货状态非法，需先修复数据"),
    };
    let target = match req.process_type.as_deref() {
        Some("reject") => ReturnStatus::Rejected,
        _ => ReturnStatus::Completed,
    };
    if !current.can_transition_to(target) {
        return ApiResponse::conflict(&format!(
            "状态 {} → {} 流转被拒绝",
            current.as_db_str(),
            target.as_db_str()
        ));
    }

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = $2, resolved_at = $3,
            completed_at = CASE WHEN $2 = 'completed' THEN $3 ELSE completed_at END,
            updated_by = $4, updated_at = $3
        WHERE id = $1 AND tenant_id = $5 AND deleted_at IS NULL
          AND status = $6
        RETURNING id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
                  status, refund_amount, exchange_product_id, received, received_at, approved_by,
                  approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
                  ticket_id, warehouse_id, deleted_at
        "#,
    )
    .bind(id)
    .bind(target.as_db_str())
    .bind(now)
    .bind(operator_id)
    .bind(tenant_id)
    .bind(ReturnStatus::Processing.as_db_str())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(return_record)) => {
            if matches!(target, ReturnStatus::Completed) {
                // 财务对账仍在事务内
                if let Err(e) =
                    sync_return_to_finance(&state, txn, return_record.id, tenant_id, &locale).await
                {
                    tracing::warn!("退换货 {} 财务对账失败: {}", return_record.return_no, e);
                }
            }

            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("提交事务失败: {}", e);
                    return ApiResponse::from(TopemsError::Internal("事务提交失败".to_string()));
                }
            }

            // D6：commit 成功后再 emit ReturnCompleted；发布失败入 ZSET 重试。
            if matches!(target, ReturnStatus::Completed) {
                if let Some(publisher) = state.event_publisher.clone() {
                    let return_id = return_record.id;
                    let return_no = return_record.return_no.clone();
                    let customer_id = return_record.customer_id;
                    let order_id = return_record.order_id;
                    // U6-2：refund_amount 已是 Decimal，直接透传
                    let refund_amount = return_record.refund_amount;
                    let return_type = return_record.return_type.clone();
                    let status = return_record.status.clone();
                    let completed_by = operator_id;
                    let completed_at = now.to_rfc3339();
                    let tenant_id_pub = Some(tenant_id);
                    tokio::spawn(async move {
                        let return_no_log = return_no.clone();
                        let payload = ReturnCompletedPayload {
                            return_id,
                            return_no,
                            customer_id,
                            customer_name: None,
                            order_id,
                            order_no: None,
                            refund_amount,
                            return_type,
                            status,
                            completed_by,
                            completed_at,
                            tenant_id: tenant_id_pub,
                        };
                        let et = EventType::ReturnCompleted;
                        match publisher.publish_event(et, &payload).await {
                            Ok(_) => tracing::info!(
                                "[crm] ReturnCompleted 事件发布成功 - return_no={}",
                                return_no_log
                            ),
                            Err(e) => {
                                tracing::warn!(
                                    "[crm] ReturnCompleted 事件发布失败: {}，入重试队列",
                                    e
                                );
                                commit_retry::push_retry_typed("crm", et, &payload).await;
                            }
                        }
                    });
                }
            }
            let msg = match target {
                ReturnStatus::Completed => "退换货已完成结案".to_string(),
                ReturnStatus::Rejected => "退换货已拒绝结案".to_string(),
                _ => "退换货确认成功".to_string(),
            };
            ApiResponse::success(return_record, &msg)
        }
        Ok(None) => ApiResponse::conflict("退换货状态已被并发变更，请刷新后重试"),
        Err(e) => {
            tracing::error!("确认退换货失败: {}", e);
            ApiResponse::from(TopemsError::Internal("确认退换货失败".to_string()))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn return_decision_copy_clone() {
        let all = [
            ReturnDecision::Accept,
            ReturnDecision::Process,
            ReturnDecision::Resolve,
            ReturnDecision::ConfirmDone,
            ReturnDecision::ReturnedToProcessing,
            ReturnDecision::Reject,
            ReturnDecision::Cancel,
        ];
        for d in all {
            let x = d;
            assert_eq!(x.clone(), d);
        }
    }

    #[test]
    fn process_type_copy_clone() {
        use ProcessType::*;
        for t in [Refund, Exchange, Repair] {
            assert_eq!(t.clone(), t);
        }
    }

    fn make_claims(sub: &str, tenant_id: Option<&str>) -> topems_shared::auth::Claims {
        topems_shared::auth::Claims {
            sub: sub.to_string(),
            username: "testuser".to_string(),
            role: "user".to_string(),
            roles: vec![],
            permissions: vec![],
            is_superuser: false,
            exp: 9999999999,
            iat: 0,
            email: Some("t@e.com".to_string()),
            department: None,
            tenant_id: tenant_id.map(|s| s.to_string()),
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        }
    }

    #[test]
    fn extract_operator_id_valid_uuid() {
        let id = Uuid::new_v4();
        let claims = make_claims(&id.to_string(), None);
        let result = extract_operator_id(&claims);
        assert_eq!(result, Some(id));
    }

    #[test]
    fn extract_operator_id_invalid_sub() {
        let claims = make_claims("not-a-uuid", None);
        let result = extract_operator_id(&claims);
        assert!(result.is_none());
    }

    #[test]
    fn create_routes_smoke() {
        let _router: Router<ApiState> = create_routes();
    }
}
