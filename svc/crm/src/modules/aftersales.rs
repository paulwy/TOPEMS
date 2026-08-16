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
use uuid::Uuid;

use super::ApiState;
use crate::middleware::tenant::get_tenant_id;
use crate::models::{
    CreateReturnItemRequest, CreateReturnRequest, Return, ReturnActionRequest, ReturnItem,
    ReturnQuery, UpdateReturnRequest,
};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::response::api_error;
use topems_shared_event::event::{EventType, ReturnCompletedPayload, ReturnProcessedPayload};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReturnStage {
    Pending,
    Accepted,
    Processing,
    Resolving,
    Done,
    Rejected,
    Cancelled,
}

impl ReturnStage {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(Self::Pending),
            "accepted" => Some(Self::Accepted),
            "processing" => Some(Self::Processing),
            "resolving" => Some(Self::Resolving),
            "done" => Some(Self::Done),
            "rejected" => Some(Self::Rejected),
            "cancelled" => Some(Self::Cancelled),
            _ => None,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Accepted => "accepted",
            Self::Processing => "processing",
            Self::Resolving => "resolving",
            Self::Done => "done",
            Self::Rejected => "rejected",
            Self::Cancelled => "cancelled",
        }
    }

    pub fn is_terminal(&self) -> bool {
        matches!(self, Self::Done | Self::Rejected | Self::Cancelled)
    }
}

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

pub fn can_transition(from: ReturnStage, to: ReturnStage) -> Result<(), &'static str> {
    use ReturnStage::*;
    if from.is_terminal() {
        return Err("TERMINAL_CANNOT_TRANSITION");
    }
    let ok = matches!(
        (from, to),
        (Pending, Accepted)
            | (Accepted, Processing)
            | (Processing, Resolving)
            | (Resolving, Done)
            | (Resolving, Processing)
            | (Resolving, Rejected)
            | (Pending, Cancelled)
            | (Accepted, Cancelled)
            | (Processing, Cancelled)
            | (Resolving, Cancelled)
    );
    if ok {
        Ok(())
    } else {
        Err("INVALID_TRANSITION")
    }
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
async fn generate_return_no(state: &ApiState, tenant_id: Uuid) -> String {
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
    .fetch_one(&state.db)
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
    state: &ApiState,
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
    .fetch_optional(&state.db)
    .await?;

    let total = total.unwrap_or_else(|| Decimal::ZERO);

    let _ = sqlx::query(
        "UPDATE crm.returns SET refund_amount = $2, updated_at = $3 WHERE id = $1 AND tenant_id = $4",
    )
    .bind(return_id)
    .bind(total)
    .bind(Utc::now())
    .bind(tenant_id)
    .execute(&state.db)
    .await?;

    Ok(total)
}

async fn list_returns(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ReturnQuery>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR return_type = $3)
          AND ($4::uuid IS NULL OR customer_id = $4)
          AND ($5::uuid IS NULL OR order_id = $5)
          AND ($6::text IS NULL OR return_no ILIKE $6 OR reason ILIKE $6)
        ORDER BY created_at DESC
        LIMIT $7 OFFSET $8
        "#,
    )
    .bind(tenant_id)
    .bind(&params.status)
    .bind(&params.return_type)
    .bind(&params.customer_id)
    .bind(&params.order_id)
    .bind(&search_pattern)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(returns) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.returns
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR return_type = $3)
                  AND ($4::uuid IS NULL OR customer_id = $4)
                  AND ($5::uuid IS NULL OR order_id = $5)
                  AND ($6::text IS NULL OR return_no ILIKE $6 OR reason ILIKE $6)
                "#,
            )
            .bind(tenant_id)
            .bind(&params.status)
            .bind(&params.return_type)
            .bind(&params.customer_id)
            .bind(&params.order_id)
            .bind(&search_pattern)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": returns,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取退换货列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取退换货列表失败: {}", e);
            Json(api_error(500, "获取退换货列表失败"))
        }
    }
}

async fn create_return(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateReturnRequest>,
) -> Json<ApiResponse<Return>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();
    let id = Uuid::new_v4();
    let operator_id = extract_operator_id(&claims);

    let return_no = generate_return_no(&state, tenant_id).await;
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
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 0, $9, FALSE, $10, $10, $11, $11, $12, $13)
        RETURNING id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
                  status, refund_amount, exchange_product_id, received, received_at, approved_by,
                  approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
                  ticket_id, warehouse_id, deleted_at
        "#,
    )
    .bind(id)
    .bind(&return_no)
    .bind(tenant_id)
    .bind(&req.customer_id)
    .bind(&req.order_id)
    .bind(&return_type)
    .bind(&req.reason)
    .bind(&req.reason_detail)
    .bind(&req.exchange_product_id)
    .bind(operator_id)
    .bind(now)
    .bind(req.ticket_id)
    .bind(req.warehouse_id)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(return_record) => (
            Json(ApiResponse::success(
                return_record.clone(),
                "退换货申请创建成功",
            )),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建退换货申请失败: {}", e);
            (
                Json(api_error(500, "创建退换货申请失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(return_record) = &result {
        serde_json::to_value(return_record).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
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

async fn get_return(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Return>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(return_record)) => Json(ApiResponse::success(return_record, "获取退换货成功")),
        Ok(None) => Json(api_error(404, "退换货不存在")),
        Err(e) => {
            tracing::error!("获取退换货失败: {}", e);
            Json(api_error(500, "获取退换货失败"))
        }
    }
}

async fn update_return(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateReturnRequest>,
) -> Json<ApiResponse<Return>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "退换货不存在")),
        Err(e) => return Json(api_error(500, &format!("查询退换货失败: {}", e))),
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

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            customer_id = $2, order_id = $3, return_type = $4, reason = $5,
            reason_detail = $6, exchange_product_id = $7,
            ticket_id = $8, warehouse_id = $9,
            updated_by = $10, updated_at = $11
        WHERE id = $1 AND tenant_id = $12
        RETURNING id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
                  status, refund_amount, exchange_product_id, received, received_at, approved_by,
                  approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
                  ticket_id, warehouse_id, deleted_at
        "#,
    )
    .bind(id)
    .bind(&customer_id)
    .bind(&order_id)
    .bind(&return_type)
    .bind(&reason)
    .bind(&reason_detail)
    .bind(&exchange_product_id)
    .bind(ticket_id)
    .bind(warehouse_id)
    .bind(operator_id)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(return_record) => (
            Json(ApiResponse::success(
                return_record.clone(),
                "退换货更新成功",
            )),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新退换货失败: {}", e);
            (
                Json(api_error(500, "更新退换货失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(return_record) = &result {
        serde_json::to_value(return_record).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
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

async fn delete_return(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    // 先查询退换单状态
    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "退换货不存在")),
        Err(e) => return Json(api_error(500, &format!("查询退换货失败: {}", e))),
    };

    // 仅允许 pending/cancelled 状态的退换单被删除
    if existing.status != "pending" && existing.status != "cancelled" {
        return Json(api_error(400, "仅 pending/cancelled 状态的退换单可删除"));
    }

    let result =
        sqlx::query("UPDATE crm.returns SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&state.db)
            .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "退换货删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "退换货不存在")),
            "error".to_string(),
            Some("退换货不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除退换货失败: {}", e);
            (
                Json(api_error(500, "删除退换货失败")),
                "error".to_string(),
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

async fn approve_return(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ReturnActionRequest>,
) -> Json<ApiResponse<Return>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "退换货不存在")),
        Err(e) => return Json(api_error(500, &format!("查询退换货失败: {}", e))),
    };

    // 状态流转校验：pending → approved
    if existing.status != "pending" {
        return Json(api_error(
            400,
            &format!(
                "当前状态 {} 不允许审批通过，仅 pending 状态可审批",
                existing.status
            ),
        ));
    }

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = 'approved', approved_by = $2, approved_at = $3,
            updated_by = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(return_record) => {
            tracing::debug!(
                "退换货 {} 审批通过，操作备注: {:?}",
                return_record.return_no,
                req.comment
            );
            Json(ApiResponse::success(return_record, "退换货审批通过"))
        }
        Err(e) => {
            tracing::error!("审批退换货失败: {}", e);
            Json(api_error(500, "审批退换货失败"))
        }
    }
}

async fn reject_return(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ReturnActionRequest>,
) -> Json<ApiResponse<Return>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "退换货不存在")),
        Err(e) => return Json(api_error(500, &format!("查询退换货失败: {}", e))),
    };

    // 状态流转校验：pending → rejected
    if existing.status != "pending" {
        return Json(api_error(
            400,
            &format!(
                "当前状态 {} 不允许拒绝，仅 pending 状态可拒绝",
                existing.status
            ),
        ));
    }

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = 'rejected', approved_by = $2, approved_at = $3,
            updated_by = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(return_record) => {
            tracing::debug!(
                "退换货 {} 已拒绝，操作备注: {:?}",
                return_record.return_no,
                req.comment
            );
            Json(ApiResponse::success(return_record, "退换货已拒绝"))
        }
        Err(e) => {
            tracing::error!("拒绝退换货失败: {}", e);
            Json(api_error(500, "拒绝退换货失败"))
        }
    }
}

async fn receive_return(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ReturnActionRequest>,
) -> Json<ApiResponse<Return>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "退换货不存在")),
        Err(e) => return Json(api_error(500, &format!("查询退换货失败: {}", e))),
    };

    // 状态流转校验：approved → processing，记录 received_at
    if existing.status != "approved" {
        return Json(api_error(
            400,
            &format!(
                "当前状态 {} 不允许确认收货，仅 approved 状态可确认收货",
                existing.status
            ),
        ));
    }

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = 'processing', received = TRUE, received_at = $2,
            updated_by = $3, updated_at = $4
        WHERE id = $1 AND tenant_id = $5
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(return_record) => {
            tracing::debug!(
                "退换货 {} 已确认收货，操作备注: {:?}",
                return_record.return_no,
                req.comment
            );
            // 库存联动：确认收货时同步退货入库到 erp.inventory
            if let Err(e) = sync_return_to_inventory(&state, return_record.id, tenant_id).await {
                tracing::warn!("退换货 {} 库存联动失败: {}", return_record.return_no, e);
            }
            Json(ApiResponse::success(return_record, "退换货已确认收货"))
        }
        Err(e) => {
            tracing::error!("确认收货失败: {}", e);
            Json(api_error(500, "确认收货失败"))
        }
    }
}

async fn complete_return(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ReturnActionRequest>,
) -> Json<ApiResponse<Return>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "退换货不存在")),
        Err(e) => return Json(api_error(500, &format!("查询退换货失败: {}", e))),
    };

    // 状态流转校验：processing → completed，记录 completed_at
    if existing.status != "processing" {
        return Json(api_error(
            400,
            &format!(
                "当前状态 {} 不允许完成，仅 processing 状态可完成",
                existing.status
            ),
        ));
    }

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = 'completed', completed_at = $2,
            updated_by = $3, updated_at = $4
        WHERE id = $1 AND tenant_id = $5
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(return_record) => {
            tracing::debug!(
                "退换货 {} 已完成，操作备注: {:?}",
                return_record.return_no,
                req.comment
            );

            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
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
                    if let Err(e) = publisher
                        .publish_event(EventType::ReturnProcessed, payload)
                        .await
                    {
                        tracing::warn!(
                            "[crm] ReturnProcessed 事件发布失败（graceful fallback）: {}",
                            e
                        );
                    } else {
                        tracing::info!(
                            "[crm] ReturnProcessed 事件发布成功 - return_no={}",
                            return_no_log
                        );
                    }
                });
            }

            // 发布 ReturnCompleted 业务事件，ERP 订阅后生成退款凭证
            // 解决 StockOutbound 与退款语义不匹配问题：退款应在退货完成时触发
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let return_id = return_record.id;
                let return_no = return_record.return_no.clone();
                let customer_id = return_record.customer_id;
                let order_id = return_record.order_id;
                let refund_amount = return_record.refund_amount.to_f64().unwrap_or(0.0);
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
                    if let Err(e) = publisher
                        .publish_event(EventType::ReturnCompleted, payload)
                        .await
                    {
                        tracing::warn!(
                            "[crm] ReturnCompleted 事件发布失败（graceful fallback）: {}",
                            e
                        );
                    } else {
                        tracing::info!(
                            "[crm] ReturnCompleted 事件发布成功 - return_no={}",
                            return_no_log
                        );
                    }
                });
            }

            // 财务对账：退换货完成时同步到 erp.fin_reconciliations
            if let Err(e) = sync_return_to_finance(&state, return_record.id, tenant_id).await {
                tracing::warn!("退换货 {} 财务对账失败: {}", return_record.return_no, e);
            }
            Json(ApiResponse::success(return_record, "退换货已完成"))
        }
        Err(e) => {
            tracing::error!("完成退换货失败: {}", e);
            Json(api_error(500, "完成退换货失败"))
        }
    }
}

async fn cancel_return(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ReturnActionRequest>,
) -> Json<ApiResponse<Return>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "退换货不存在")),
        Err(e) => return Json(api_error(500, &format!("查询退换货失败: {}", e))),
    };

    // 状态流转校验：pending → cancelled（已完成/已拒绝的不可取消）
    if existing.status == "completed" || existing.status == "cancelled" {
        return Json(api_error(
            400,
            &format!("当前状态 {} 不允许取消", existing.status),
        ));
    }

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = 'cancelled', updated_by = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(return_record) => {
            tracing::debug!(
                "退换货 {} 已取消，操作备注: {:?}",
                return_record.return_no,
                req.comment
            );
            Json(ApiResponse::success(return_record, "退换货已取消"))
        }
        Err(e) => {
            tracing::error!("取消退换货失败: {}", e);
            Json(api_error(500, "取消退换货失败"))
        }
    }
}

async fn list_return_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<Vec<ReturnItem>>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, ReturnItem>(
        r#"
        SELECT id, return_id, tenant_id, product_id, quantity, unit_price, total_amount, created_at
        FROM crm.return_items
        WHERE return_id = $1 AND tenant_id = $2
        ORDER BY created_at ASC
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => Json(ApiResponse::success(items, "获取退换货明细成功")),
        Err(e) => {
            tracing::error!("获取退换货明细失败: {}", e);
            Json(api_error(500, "获取退换货明细失败"))
        }
    }
}

async fn add_return_item(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<CreateReturnItemRequest>,
) -> Json<ApiResponse<ReturnItem>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.quantity <= 0 {
        return Json(api_error(400, "数量必须大于零"));
    }
    if req.unit_price < Decimal::ZERO {
        return Json(api_error(400, "单价不能为负"));
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    // 校验退换单存在
    let exists: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM crm.returns WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await
    .unwrap_or(None);

    if exists.is_none() {
        return Json(api_error(404, "退换货不存在"));
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
    .bind(&req.product_id)
    .bind(req.quantity)
    .bind(req.unit_price)
    .bind(total_amount)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(item) => {
            // 自动重算退款金额
            let _ = recalculate_refund_amount(&state, id, tenant_id).await;
            Json(ApiResponse::success(item, "退换货明细添加成功"))
        }
        Err(e) => {
            tracing::error!("添加退换货明细失败: {}", e);
            Json(api_error(500, "添加退换货明细失败"))
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
/// 改为通过 `ErpServiceClient` 调用 ERP 服务的 REST API。
pub async fn sync_return_to_finance(
    state: &ApiState,
    return_id: Uuid,
    tenant_id: Uuid,
) -> Result<Uuid, Box<dyn std::error::Error + Send + Sync>> {
    let return_record: Return = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(return_id)
    .bind(tenant_id)
    .fetch_one(&state.db)
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

    // V19.0: 服务边界治理 - 跨库直写已替换为 HTTP API 调用
    // 原 `INSERT INTO erp.vouchers` 改为调用 POST /api/erp/vouchers
    // 凭证字段与 erp CreateFinancialVoucherRequest schema 保持一致：
    // voucher_number/voucher_date/period/summary/maker_name/items
    // 借贷必须平衡：total_debit == total_credit
    // graceful fallback：失败仅 warn，不阻塞主流程
    let voucher_no = format!("REFUND-{}", return_record.return_no);
    let voucher_payload = serde_json::json!({
        "voucher_number": voucher_no,
        "voucher_date": now,
        "period": period,
        "summary": format!("退款凭证 - {}", return_record.return_no),
        "maker_name": "crm-refund-sync",
        "items": [
            {
                "line_number": 1,
                "subject_code": "6603",
                "summary": format!("退款 - {}", return_record.return_no),
                "debit_amount": refund_amount_f64,
                "credit_amount": 0.0,
            },
            {
                "line_number": 2,
                "subject_code": "1002",
                "summary": format!("退款 - {}", return_record.return_no),
                "debit_amount": 0.0,
                "credit_amount": refund_amount_f64,
            }
        ]
    });
    match erp_client.create_voucher(&voucher_payload).await {
        Ok(_) => {
            tracing::debug!(
                "退换货 {} 已生成退款凭证（voucher_no={}）",
                return_record.return_no,
                voucher_no
            );
        }
        Err(e) => {
            tracing::warn!(
                "退换货 {} 退款凭证生成失败（graceful fallback）: {}",
                return_record.return_no,
                e
            );
        }
    }

    Ok(recon_id)
}

/// 退换货库存联动：在退换货收货时（receive_return 内）调用
///
/// V19.0: 服务边界治理 - 跨库直写已替换为 HTTP API 调用
/// 原 SQL `UPDATE erp.inventory` / `INSERT INTO erp.inventory_movements`
/// 改为通过 `WmsServiceClient` 调用 WMS 服务的 REST API。
/// - 调用 PUT /api/wms/inventory/{material_id} 更新库存
/// - 调用 POST /api/wms/inventory-movements 登记审计流水
pub async fn sync_return_to_inventory(
    state: &ApiState,
    return_id: Uuid,
    tenant_id: Uuid,
) -> Result<u64, Box<dyn std::error::Error + Send + Sync>> {
    let return_record: Return = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(return_id)
    .bind(tenant_id)
    .fetch_one(&state.db)
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
        WHERE return_id = $1 AND tenant_id = $2
        "#,
    )
    .bind(return_id)
    .bind(tenant_id)
    .fetch_all(&state.db)
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
    let wms_client: &Arc<topems_shared_service_client::service_client::WmsServiceClient> =
        match state.wms_client.as_ref() {
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
async fn get_return_finance_status(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    // 校验退换单存在且属于租户
    let exists: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM crm.returns WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await
    .ok()
    .flatten();

    if exists.is_none() {
        return Json(api_error(404, "退换货不存在"));
    }

    // V19.0: 服务边界治理 - 跨库直写已替换为 HTTP API 调用
    // 原 `SELECT ... FROM erp.fin_reconciliations` 改为调用
    // GET /api/erp/finance/reconciliation?ref_id={}&ref_type=return
    let result: serde_json::Value = match state.erp_client.as_ref() {
        Some(client) => match client
            .list_reconciliations_by_ref(&id.to_string(), "return")
            .await
        {
            Ok(resp) => resp
                .data
                .unwrap_or_else(|| serde_json::Value::Array(vec![])),
            Err(e) => {
                tracing::error!("获取退换货财务对账状态失败: {}", e);
                return Json(api_error(500, "获取退换货财务对账状态失败"));
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

    Json(ApiResponse::success(
        serde_json::json!({
            "return_id": id,
            "reconciliations": items,
            "total": items.len()
        }),
        "获取退换货财务对账状态成功",
    ))
}

/// 查询退换货的库存联动状态（已记录的库存移动流水）
async fn get_return_inventory_status(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    // 校验退换单存在且属于租户
    let exists: Option<Uuid> = sqlx::query_scalar(
        "SELECT id FROM crm.returns WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await
    .ok()
    .flatten();

    if exists.is_none() {
        return Json(api_error(404, "退换货不存在"));
    }

    // V19.0: 服务边界治理 - 跨库直写已替换为 HTTP API 调用
    // 原 `SELECT ... FROM erp.inventory_movements` 改为调用
    // GET /api/wms/inventory-movements?ref_id={}&ref_type=return
    let result: serde_json::Value = match state.wms_client.as_ref() {
        Some(client) => match client
            .list_inventory_movements_by_ref(&id.to_string(), "return")
            .await
        {
            Ok(resp) => resp
                .data
                .unwrap_or_else(|| serde_json::Value::Array(vec![])),
            Err(e) => {
                tracing::error!("获取退换货库存联动状态失败: {}", e);
                return Json(api_error(500, "获取退换货库存联动状态失败"));
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

    Json(ApiResponse::success(
        serde_json::json!({
            "return_id": id,
            "movements": items,
            "total": items.len()
        }),
        "获取退换货库存联动状态成功",
    ))
}

// ============================================================
//  Return FSM 按 spec §5.2 的 4 个规范 handlers
//  状态链：Pending → Accepted → Processing → Resolving → Done
//  分支：Resolving → Processing（退回重新处理）
//  分支：Resolving → Rejected（拒绝终止）
//  终态：Done / Rejected / Cancelled
// ============================================================

async fn accept_return(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(_req): Json<ReturnActionRequest>,
) -> Json<ApiResponse<Return>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "退换货不存在")),
        Err(e) => return Json(api_error(500, &format!("查询退换货失败: {}", e))),
    };

    let from = match ReturnStage::from_str(&existing.status) {
        Some(s) => s,
        None => return Json(api_error(400, &format!("未知状态: {}", existing.status))),
    };

    if let Err(e) = can_transition(from, ReturnStage::Accepted) {
        return Json(api_error(
            400,
            &format!("状态 {} → accepted 流转被拒绝: {}", existing.status, e),
        ));
    }

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = 'accepted', approved_by = $2, approved_at = $3,
            updated_by = $2, updated_at = $3
        WHERE id = $1 AND tenant_id = $4
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(r) => Json(ApiResponse::success(r, "退换货已受理")),
        Err(e) => {
            tracing::error!("受理退换货失败: {}", e);
            Json(api_error(500, "受理退换货失败"))
        }
    }
}

async fn process_return(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(_req): Json<ReturnActionRequest>,
) -> Json<ApiResponse<Return>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "退换货不存在")),
        Err(e) => return Json(api_error(500, &format!("查询退换货失败: {}", e))),
    };

    let from = match ReturnStage::from_str(&existing.status) {
        Some(s) => s,
        None => return Json(api_error(400, &format!("未知状态: {}", existing.status))),
    };

    if let Err(e) = can_transition(from, ReturnStage::Processing) {
        return Json(api_error(
            400,
            &format!("状态 {} → processing 流转被拒绝: {}", existing.status, e),
        ));
    }

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = 'processing', received = TRUE, received_at = $2,
            updated_by = $3, updated_at = $4
        WHERE id = $1 AND tenant_id = $5
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(return_record) => {
            if let Err(e) = sync_return_to_inventory(&state, return_record.id, tenant_id).await {
                tracing::warn!("退换货 {} 库存联动失败: {}", return_record.return_no, e);
            }
            Json(ApiResponse::success(return_record, "退换货进入处理中"))
        }
        Err(e) => {
            tracing::error!("处理退换货失败: {}", e);
            Json(api_error(500, "处理退换货失败"))
        }
    }
}

async fn resolve_return(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ReturnActionRequest>,
) -> Json<ApiResponse<Return>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "退换货不存在")),
        Err(e) => return Json(api_error(500, &format!("查询退换货失败: {}", e))),
    };

    let from = match ReturnStage::from_str(&existing.status) {
        Some(s) => s,
        None => return Json(api_error(400, &format!("未知状态: {}", existing.status))),
    };

    let target = match req.process_type.as_deref() {
        Some("returned") => ReturnStage::Processing,
        _ => ReturnStage::Resolving,
    };

    if let Err(e) = can_transition(from, target) {
        return Json(api_error(
            400,
            &format!(
                "状态 {} → {} 流转被拒绝: {}",
                existing.status,
                target.as_str(),
                e
            ),
        ));
    }

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = $2, updated_by = $3, updated_at = $4
        WHERE id = $1 AND tenant_id = $5
        RETURNING id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
                  status, refund_amount, exchange_product_id, received, received_at, approved_by,
                  approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
                  ticket_id, warehouse_id, deleted_at
        "#,
    )
    .bind(id)
    .bind(target.as_str())
    .bind(operator_id)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(r) => {
            let msg = match target {
                ReturnStage::Resolving => "退换货进入方案确认".to_string(),
                ReturnStage::Processing => "退换货已退回重新处理".to_string(),
                _ => "退换货状态更新成功".to_string(),
            };
            Json(ApiResponse::success(r, &msg))
        }
        Err(e) => {
            tracing::error!("方案确认失败: {}", e);
            Json(api_error(500, "方案确认失败"))
        }
    }
}

async fn confirm_return(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ReturnActionRequest>,
) -> Json<ApiResponse<Return>> {
    match check_permission(&state.db, &claims, &ModulePermission::ReturnWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);
    let operator_id = extract_operator_id(&claims);
    let now = Utc::now();

    let existing = sqlx::query_as::<_, Return>(
        r#"
        SELECT id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
               status, refund_amount, exchange_product_id, received, received_at, approved_by,
               approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
               ticket_id, warehouse_id, deleted_at
        FROM crm.returns WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "退换货不存在")),
        Err(e) => return Json(api_error(500, &format!("查询退换货失败: {}", e))),
    };

    let from = match ReturnStage::from_str(&existing.status) {
        Some(s) => s,
        None => return Json(api_error(400, &format!("未知状态: {}", existing.status))),
    };

    let target = match req.process_type.as_deref() {
        Some("reject") => ReturnStage::Rejected,
        _ => ReturnStage::Done,
    };

    if let Err(e) = can_transition(from, target) {
        return Json(api_error(
            400,
            &format!(
                "状态 {} → {} 流转被拒绝: {}",
                existing.status,
                target.as_str(),
                e
            ),
        ));
    }

    let result = sqlx::query_as::<_, Return>(
        r#"
        UPDATE crm.returns SET
            status = $2, resolved_at = $3, completed_at = $3,
            updated_by = $4, updated_at = $3
        WHERE id = $1 AND tenant_id = $5
        RETURNING id, return_no, tenant_id, customer_id, order_id, return_type, reason, reason_detail,
                  status, refund_amount, exchange_product_id, received, received_at, approved_by,
                  approved_at, completed_at, resolved_at, created_by, updated_by, created_at, updated_at,
                  ticket_id, warehouse_id, deleted_at
        "#,
    )
    .bind(id)
    .bind(target.as_str())
    .bind(now)
    .bind(operator_id)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(return_record) => {
            if matches!(target, ReturnStage::Done) {
                if let Some(ref publisher) = state.event_publisher {
                    let publisher = publisher.clone();
                    let return_id = return_record.id;
                    let return_no = return_record.return_no.clone();
                    let customer_id = return_record.customer_id;
                    let order_id = return_record.order_id;
                    let refund_amount = return_record.refund_amount.to_f64().unwrap_or(0.0);
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
                        if let Err(e) = publisher
                            .publish_event(EventType::ReturnCompleted, payload)
                            .await
                        {
                            tracing::warn!("[crm] ReturnCompleted 事件发布失败: {}", e);
                        } else {
                            tracing::info!(
                                "[crm] ReturnCompleted 事件发布成功 - return_no={}",
                                return_no_log
                            );
                        }
                    });
                }
                if let Err(e) = sync_return_to_finance(&state, return_record.id, tenant_id).await {
                    tracing::warn!("退换货 {} 财务对账失败: {}", return_record.return_no, e);
                }
            }

            let msg = match target {
                ReturnStage::Done => "退换货已完成结案".to_string(),
                ReturnStage::Rejected => "退换货已拒绝结案".to_string(),
                _ => "退换货确认成功".to_string(),
            };
            Json(ApiResponse::success(return_record, &msg))
        }
        Err(e) => {
            tracing::error!("确认退换货失败: {}", e);
            Json(api_error(500, "确认退换货失败"))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    #[test]
    fn return_stage_from_str_all() {
        assert_eq!(ReturnStage::from_str("pending"), Some(ReturnStage::Pending));
        assert_eq!(
            ReturnStage::from_str("accepted"),
            Some(ReturnStage::Accepted)
        );
        assert_eq!(
            ReturnStage::from_str("processing"),
            Some(ReturnStage::Processing)
        );
        assert_eq!(
            ReturnStage::from_str("resolving"),
            Some(ReturnStage::Resolving)
        );
        assert_eq!(ReturnStage::from_str("done"), Some(ReturnStage::Done));
        assert_eq!(
            ReturnStage::from_str("rejected"),
            Some(ReturnStage::Rejected)
        );
        assert_eq!(
            ReturnStage::from_str("cancelled"),
            Some(ReturnStage::Cancelled)
        );
        assert_eq!(ReturnStage::from_str("unknown"), None);
        assert_eq!(ReturnStage::from_str(""), None);
    }

    #[test]
    fn return_stage_as_str_roundtrip() {
        let all = [
            ReturnStage::Pending,
            ReturnStage::Accepted,
            ReturnStage::Processing,
            ReturnStage::Resolving,
            ReturnStage::Done,
            ReturnStage::Rejected,
            ReturnStage::Cancelled,
        ];
        for s in all {
            let txt = s.as_str();
            let back = ReturnStage::from_str(txt).unwrap();
            assert_eq!(back, s);
        }
    }

    #[test]
    fn return_stage_terminal_states() {
        assert!(ReturnStage::Done.is_terminal());
        assert!(ReturnStage::Rejected.is_terminal());
        assert!(ReturnStage::Cancelled.is_terminal());
        assert!(!ReturnStage::Pending.is_terminal());
        assert!(!ReturnStage::Accepted.is_terminal());
        assert!(!ReturnStage::Processing.is_terminal());
        assert!(!ReturnStage::Resolving.is_terminal());
    }

    #[test]
    fn return_stage_copy_clone_eq() {
        let a = ReturnStage::Processing;
        let b = a;
        assert_eq!(a, b);
        let c = a.clone();
        assert_eq!(c, a);
    }

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

    #[test]
    fn can_transition_valid_forward_path() {
        use ReturnStage::*;
        assert!(can_transition(Pending, Accepted).is_ok());
        assert!(can_transition(Accepted, Processing).is_ok());
        assert!(can_transition(Processing, Resolving).is_ok());
        assert!(can_transition(Resolving, Done).is_ok());
    }

    #[test]
    fn can_transition_resolving_loop_and_reject() {
        use ReturnStage::*;
        assert!(can_transition(Resolving, Processing).is_ok());
        assert!(can_transition(Resolving, Rejected).is_ok());
    }

    #[test]
    fn can_transition_cancel_from_non_terminal() {
        use ReturnStage::*;
        assert!(can_transition(Pending, Cancelled).is_ok());
        assert!(can_transition(Accepted, Cancelled).is_ok());
        assert!(can_transition(Processing, Cancelled).is_ok());
        assert!(can_transition(Resolving, Cancelled).is_ok());
    }

    #[test]
    fn can_transition_blocks_terminal_sources() {
        use ReturnStage::*;
        assert_eq!(
            can_transition(Done, Pending),
            Err("TERMINAL_CANNOT_TRANSITION")
        );
        assert_eq!(
            can_transition(Rejected, Accepted),
            Err("TERMINAL_CANNOT_TRANSITION")
        );
        assert_eq!(
            can_transition(Cancelled, Processing),
            Err("TERMINAL_CANNOT_TRANSITION")
        );
    }

    #[test]
    fn can_transition_invalid_cross_stage() {
        use ReturnStage::*;
        assert_eq!(
            can_transition(Pending, Processing),
            Err("INVALID_TRANSITION")
        );
        assert_eq!(can_transition(Accepted, Done), Err("INVALID_TRANSITION"));
        assert_eq!(
            can_transition(Processing, Accepted),
            Err("INVALID_TRANSITION")
        );
        assert_eq!(
            can_transition(Done, Cancelled),
            Err("TERMINAL_CANNOT_TRANSITION")
        );
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
