use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    Json,
};
use rust_decimal::Decimal;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use uuid::Uuid;

use crate::models::consolidation::*;
use crate::modules::consolidation_calc::{
    canonical_transaction_type, normalize_accounting_period, quantize_money,
};
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::PaginatedResponse;
use topems_shared_core::{response::ApiResponse, TopemsError};

use super::common::{log_audit, require_action_permission, ConsolidationListParams};
use super::ApiState;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/internal-transactions",
    tag = "Consolidation",
    responses((status = 200, description = "获取内部交易列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_internal_transactions(
    State(_state): State<ApiState>,
    Query(params): Query<ConsolidationListParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<PaginatedResponse<InternalTransaction>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let page = params.base.page_or_default();
    let page_size = params.base.page_size_or_default();
    let offset = params.base.offset();

    let period_from = match params.period_from.as_deref() {
        Some(p) => match normalize_accounting_period(p) {
            Some(v) => Some(v),
            None => {
                return ApiResponse::bad_request(
                    "period_from 格式无效，应为 YYYYMM（兼容 YYYY-MM）",
                )
            }
        },
        None => None,
    };
    let period_to = match params.period_to.as_deref() {
        Some(p) => match normalize_accounting_period(p) {
            Some(v) => Some(v),
            None => {
                return ApiResponse::bad_request("period_to 格式无效，应为 YYYYMM（兼容 YYYY-MM）")
            }
        },
        None => None,
    };

    let result = sqlx::query_as::<_, InternalTransaction>(
        r#"
        SELECT * FROM erp.internal_transactions
        WHERE deleted_at IS NULL
          AND ($1::text IS NULL OR period >= $1)
          AND ($2::text IS NULL OR period <= $2)
        ORDER BY transaction_date DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&period_from)
    .bind(&period_to)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(transactions) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM erp.internal_transactions
                WHERE deleted_at IS NULL
                  AND ($1::text IS NULL OR period >= $1)
                  AND ($2::text IS NULL OR period <= $2)
                "#,
            )
            .bind(&period_from)
            .bind(&period_to)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);
            ApiResponse::success(
                PaginatedResponse::new(transactions, total, page, page_size),
                "获取内部交易列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取内部交易列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取内部交易列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/internal-transactions/{transactionId}",
    tag = "Consolidation",
    params(("transactionId" = String, Path, description = "内部交易ID")),
    responses((status = 200, description = "获取内部交易详情成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_internal_transaction(
    State(_state): State<ApiState>,
    Path(transaction_id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<InternalTransaction> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    match sqlx::query_as::<_, InternalTransaction>(
        "SELECT * FROM erp.internal_transactions WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(transaction_id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(Some(transaction)) => ApiResponse::success(transaction, "获取内部交易详情成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("内部交易不存在".to_string())),
        Err(e) => {
            tracing::error!("获取内部交易详情失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取内部交易详情失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:consolidation-elimination:write"])),
    path = "/erp/consolidation/execute-elimination",
    tag = "Consolidation",
    responses(
        (status = 410, description = "旧接口已永久停用，改用 /erp/consolidation/eliminations/preview"),
    )
)]
pub async fn execute_elimination(
    Extension(claims): Extension<Claims>,
    Json(_req): Json<ExecuteEliminationRequest>,
) -> ApiResponse<serde_json::Value> {
    if let Err(e) = require_action_permission(&claims, "erp:consolidation-elimination:write") {
        return e.0;
    }

    // P4 口径：旧实现按规则重扫全量 pending 且没有匹配表，结果必然错误。
    // 契约重新设计，旧路径永久 410，不保留半可用状态。
    ApiResponse::error(
        410,
        "内部交易抵消旧接口已停用：请改用 POST /erp/consolidation/eliminations/preview",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:consolidation-ledger:write"])),
    path = "/erp/consolidation/internal-transactions",
    tag = "Consolidation",
    responses((status = 200, description = "内部交易台账录入成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn create_internal_transaction(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateInternalTransactionRequest>,
) -> ApiResponse<InternalTransaction> {
    if let Err(e) = require_action_permission(&claims, "erp:consolidation-ledger:write") {
        return e.0;
    }

    let Some(period) = normalize_accounting_period(&req.period) else {
        return ApiResponse::bad_request("period 格式无效，应为 YYYYMM（兼容 YYYY-MM）");
    };
    let Some(transaction_type) = canonical_transaction_type(&req.transaction_type) else {
        return ApiResponse::bad_request(
            "transaction_type 仅支持 current_account（往来）或 sale_purchase（购销）",
        );
    };
    if req.from_company_id == req.to_company_id {
        return ApiResponse::bad_request("内部交易的双方公司不能相同");
    }
    if req.amount <= Decimal::ZERO {
        return ApiResponse::bad_request("amount 必须大于 0");
    }
    let amount = quantize_money(req.amount);

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };

    let tenant_id = claims
        .tenant_id
        .as_deref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let company_ids = vec![req.from_company_id, req.to_company_id];
    let companies: Vec<(Uuid, String)> = match sqlx::query_as(only_own_schema_query!(
        "erp",
        r#"
        SELECT id, name FROM hrm.companies
        WHERE id = ANY($1) AND deleted_at IS NULL
          AND ($2::uuid IS NULL OR tenant_id = $2)
        "#,
        "hrm"
    ))
    .bind(&company_ids)
    .bind(tenant_id)
    .fetch_all(&mut **txn)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("校验内部交易公司失败: {}", e);
            return ApiResponse::server_error("校验内部交易公司失败");
        }
    };
    if companies.len() != 2 {
        return ApiResponse::bad_request("内部交易双方公司不存在或不属于当前租户");
    }
    let from_name = companies
        .iter()
        .find(|(id, _)| *id == req.from_company_id)
        .map(|(_, name)| name.clone());
    let to_name = companies
        .iter()
        .find(|(id, _)| *id == req.to_company_id)
        .map(|(_, name)| name.clone());

    let id = Uuid::new_v4();
    let transaction_no = req
        .transaction_no
        .as_deref()
        .map(str::trim)
        .filter(|v| !v.is_empty())
        .map(str::to_string)
        .unwrap_or_else(|| {
            let suffix: String = id.simple().to_string().chars().take(8).collect();
            format!("IT-{}-{}", period, suffix)
        });
    let transaction_date = req
        .transaction_date
        .unwrap_or_else(|| chrono::Utc::now().date_naive());
    let currency = req.currency.as_deref().unwrap_or("CNY");

    let result = sqlx::query_as::<_, InternalTransaction>(
        r#"
        INSERT INTO erp.internal_transactions
        (id, tenant_id, transaction_no, transaction_date, period,
         from_company_id, from_company_name, to_company_id, to_company_name,
         transaction_type, description, amount, currency,
         elimination_status, eliminated_amount, remaining_amount, voucher_id, created_at)
        VALUES ($1,
                erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::UUID),
                $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                'unmatched', 0, $11, $13, NOW())
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&transaction_no)
    .bind(transaction_date)
    .bind(&period)
    .bind(req.from_company_id)
    .bind(&from_name)
    .bind(req.to_company_id)
    .bind(&to_name)
    .bind(transaction_type)
    .bind(&req.description)
    .bind(amount)
    .bind(currency)
    .bind(req.voucher_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(transaction) => {
            log_audit(
                &state.db,
                "create",
                "internal_transaction",
                Some(id),
                &headers,
            )
            .await;
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(transaction, "内部交易台账录入成功")
        }
        Err(sqlx::Error::Database(e)) if e.code().as_deref() == Some("23505") => {
            ApiResponse::conflict("交易编号已存在（同一租户内唯一）")
        }
        Err(e) => {
            tracing::error!("录入内部交易失败: {}", e);
            ApiResponse::server_error("录入内部交易失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:consolidation-ledger:write"])),
    path = "/erp/consolidation/internal-transactions/{transactionId}",
    tag = "Consolidation",
    params(("transactionId" = String, Path, description = "内部交易ID")),
    responses((status = 200, description = "内部交易台账编辑成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn update_internal_transaction(
    State(state): State<ApiState>,
    Path(transaction_id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateInternalTransactionRequest>,
) -> ApiResponse<InternalTransaction> {
    if let Err(e) = require_action_permission(&claims, "erp:consolidation-ledger:write") {
        return e.0;
    }

    let period = match req.period.as_deref() {
        Some(p) => match normalize_accounting_period(p) {
            Some(v) => Some(v),
            None => {
                return ApiResponse::bad_request("period 格式无效，应为 YYYYMM（兼容 YYYY-MM）")
            }
        },
        None => None,
    };
    let transaction_type = match req.transaction_type.as_deref() {
        Some(t) => match canonical_transaction_type(t) {
            Some(v) => Some(v),
            None => {
                return ApiResponse::bad_request(
                    "transaction_type 仅支持 current_account（往来）或 sale_purchase（购销）",
                )
            }
        },
        None => None,
    };
    if let Some(amount) = req.amount {
        if amount <= Decimal::ZERO {
            return ApiResponse::bad_request("amount 必须大于 0");
        }
    }

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };

    let existing: Option<InternalTransaction> = match sqlx::query_as::<_, InternalTransaction>(
        r#"
        SELECT * FROM erp.internal_transactions
        WHERE id = $1 AND deleted_at IS NULL
          AND (NULLIF(NULLIF(current_setting('app.tenant_id', true), ''), '00000000-0000-0000-0000-000000000000')::UUID IS NULL
               OR tenant_id = COALESCE(NULLIF(current_setting('app.tenant_id', true), '')::UUID,
                                       '00000000-0000-0000-0000-000000000000'))
        "#,
    )
    .bind(transaction_id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("查询内部交易失败: {}", e);
            return ApiResponse::server_error("查询内部交易失败");
        }
    };
    let Some(existing) = existing else {
        return ApiResponse::not_found("内部交易不存在");
    };
    match existing.elimination_status.as_str() {
        "unmatched" | "disputed" => {}
        "confirmed" => {
            return ApiResponse::conflict("内部交易已确认，需先标记争议后才能编辑");
        }
        "eliminated" => return ApiResponse::conflict("内部交易已抵消，不允许编辑"),
        _ => return ApiResponse::conflict("当前状态不允许编辑"),
    }

    let new_amount = req.amount.map(quantize_money).unwrap_or(existing.amount);
    if new_amount < existing.eliminated_amount {
        return ApiResponse::conflict("amount 不能小于已抵消金额");
    }
    let remaining = new_amount - existing.eliminated_amount;

    let result = sqlx::query_as::<_, InternalTransaction>(
        r#"
        UPDATE erp.internal_transactions
        SET transaction_date = COALESCE($2, transaction_date),
            period = COALESCE($3, period),
            transaction_type = COALESCE($4, transaction_type),
            description = COALESCE($5, description),
            amount = $6,
            remaining_amount = $7,
            voucher_id = COALESCE($8, voucher_id)
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(transaction_id)
    .bind(req.transaction_date)
    .bind(&period)
    .bind(transaction_type)
    .bind(&req.description)
    .bind(new_amount)
    .bind(remaining)
    .bind(req.voucher_id)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(transaction) => {
            log_audit(
                &state.db,
                "update",
                "internal_transaction",
                Some(transaction_id),
                &headers,
            )
            .await;
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(transaction, "内部交易台账编辑成功")
        }
        Err(e) => {
            tracing::error!("编辑内部交易失败: {}", e);
            ApiResponse::server_error("编辑内部交易失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:consolidation-ledger:approve"])),
    path = "/erp/consolidation/internal-transactions/{transactionId}/confirm",
    tag = "Consolidation",
    params(("transactionId" = String, Path, description = "内部交易ID")),
    responses((status = 200, description = "内部交易确认成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn confirm_internal_transaction(
    State(state): State<ApiState>,
    Path(transaction_id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<InternalTransaction> {
    if let Err(e) = require_action_permission(&claims, "erp:consolidation-ledger:approve") {
        return e.0;
    }

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };

    let current: Option<(String,)> = match sqlx::query_as(
        "SELECT elimination_status FROM erp.internal_transactions WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(transaction_id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("查询内部交易失败: {}", e);
            return ApiResponse::server_error("查询内部交易失败");
        }
    };
    let Some((status,)) = current else {
        return ApiResponse::not_found("内部交易不存在");
    };
    if status == "eliminated" {
        return ApiResponse::conflict("内部交易已抵消，不能重复确认");
    }
    if status == "confirmed" {
        return ApiResponse::conflict("内部交易已确认");
    }

    let result = sqlx::query_as::<_, InternalTransaction>(
        r#"
        UPDATE erp.internal_transactions
        SET elimination_status = 'confirmed',
            confirmed_at = NOW(),
            confirmed_by = $2,
            disputed_at = NULL,
            disputed_by = NULL,
            disputed_reason = NULL
        WHERE id = $1 AND elimination_status IN ('unmatched', 'disputed') AND deleted_at IS NULL
        RETURNING *
        "#,
    )
    .bind(transaction_id)
    .bind(&claims.username)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(transaction) => {
            log_audit(
                &state.db,
                "confirm",
                "internal_transaction",
                Some(transaction_id),
                &headers,
            )
            .await;
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(transaction, "内部交易确认成功")
        }
        Err(e) => {
            tracing::error!("确认内部交易失败: {}", e);
            ApiResponse::server_error("确认内部交易失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:consolidation-ledger:write"])),
    path = "/erp/consolidation/internal-transactions/{transactionId}/dispute",
    tag = "Consolidation",
    params(("transactionId" = String, Path, description = "内部交易ID")),
    responses((status = 200, description = "内部交易标记争议成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn dispute_internal_transaction(
    State(state): State<ApiState>,
    Path(transaction_id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<DisputeInternalTransactionRequest>,
) -> ApiResponse<InternalTransaction> {
    if let Err(e) = require_action_permission(&claims, "erp:consolidation-ledger:write") {
        return e.0;
    }
    let reason = req.reason.trim();
    if reason.is_empty() {
        return ApiResponse::bad_request("reason 不能为空");
    }
    if reason.chars().count() > 1000 {
        return ApiResponse::bad_request("reason 不能超过 1000 字");
    }

    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };

    let current: Option<(String,)> = match sqlx::query_as(
        "SELECT elimination_status FROM erp.internal_transactions WHERE id = $1 AND deleted_at IS NULL",
    )
    .bind(transaction_id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(row) => row,
        Err(e) => {
            tracing::error!("查询内部交易失败: {}", e);
            return ApiResponse::server_error("查询内部交易失败");
        }
    };
    let Some((status,)) = current else {
        return ApiResponse::not_found("内部交易不存在");
    };
    if status == "eliminated" {
        return ApiResponse::conflict("内部交易已抵消，不能标记争议");
    }

    let result = sqlx::query_as::<_, InternalTransaction>(
        r#"
        UPDATE erp.internal_transactions
        SET elimination_status = 'disputed',
            disputed_at = NOW(),
            disputed_by = $2,
            disputed_reason = $3
        WHERE id = $1 AND elimination_status <> 'eliminated' AND deleted_at IS NULL
        RETURNING *
        "#,
    )
    .bind(transaction_id)
    .bind(&claims.username)
    .bind(reason)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(transaction) => {
            log_audit(
                &state.db,
                "dispute",
                "internal_transaction",
                Some(transaction_id),
                &headers,
            )
            .await;
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(transaction, "内部交易已标记争议")
        }
        Err(e) => {
            tracing::error!("标记内部交易争议失败: {}", e);
            ApiResponse::server_error("标记内部交易争议失败")
        }
    }
}

#[cfg(test)]
#[allow(clippy::expect_used, clippy::unwrap_used)]
mod p0_tests {
    use super::*;

    fn claims(permissions: Vec<String>, is_superuser: bool) -> Claims {
        Claims {
            sub: "11111111-1111-1111-1111-111111111111".to_string(),
            username: "tester".to_string(),
            role: "employee".to_string(),
            roles: vec!["employee".to_string()],
            permissions,
            is_superuser,
            exp: 0,
            iat: 0,
            email: None,
            department: None,
            tenant_id: None,
            department_id: None,
            position_id: None,
            position_code: None,
            must_change_password: false,
        }
    }

    fn elimination_req() -> ExecuteEliminationRequest {
        ExecuteEliminationRequest {
            scope_id: Uuid::nil(),
            period: "2026-10".to_string(),
            rule_ids: None,
        }
    }

    #[tokio::test]
    async fn execute_elimination_denies_module_level_user() {
        let resp = execute_elimination(
            Extension(claims(vec!["erp:write".to_string()], false)),
            Json(elimination_req()),
        )
        .await;
        assert_eq!(resp.code, 403);
        assert!(resp.data.is_none());
    }

    #[tokio::test]
    async fn execute_elimination_returns_gone_for_authorized_user() {
        let resp = execute_elimination(
            Extension(claims(
                vec!["erp:consolidation-elimination:write".to_string()],
                false,
            )),
            Json(elimination_req()),
        )
        .await;
        assert_eq!(resp.code, 410);
        assert!(resp.data.is_none());
        assert!(resp.message.contains("已停用"));
    }
}
