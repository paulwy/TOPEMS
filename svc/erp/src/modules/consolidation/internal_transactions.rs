use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use uuid::Uuid;

use crate::models::consolidation::*;
use topems_shared::ApiResponse;
use topems_shared_core::response::{api_error, PaginatedResponse};

use super::common::{log_audit, ConsolidationListParams};
use super::ApiState;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/internal-transactions",
    tag = "Consolidation",
    responses((status = 200, description = "获取内部交易列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_internal_transactions(
    State(state): State<ApiState>,
    Query(params): Query<ConsolidationListParams>,
) -> Json<ApiResponse<PaginatedResponse<InternalTransaction>>> {
    let page = params.base.page_or_default();
    let page_size = params.base.page_size_or_default();
    let offset = params.base.offset();

    let result = sqlx::query_as::<_, InternalTransaction>(
        r#"
        SELECT * FROM erp.internal_transactions
        WHERE ($1::text IS NULL OR period >= $1)
          AND ($2::text IS NULL OR period <= $2)
        ORDER BY transaction_date DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&params.period_from)
    .bind(&params.period_to)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(transactions) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM erp.internal_transactions
                WHERE ($1::text IS NULL OR period >= $1)
                  AND ($2::text IS NULL OR period <= $2)
                "#,
            )
            .bind(&params.period_from)
            .bind(&params.period_to)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            Json(ApiResponse::success(
                PaginatedResponse::new(transactions, total, page, page_size),
                "获取内部交易列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取内部交易列表失败: {}", e);
            Json(api_error(500, "获取内部交易列表失败"))
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
    State(state): State<ApiState>,
    Path(transaction_id): Path<Uuid>,
) -> Json<ApiResponse<InternalTransaction>> {
    match sqlx::query_as::<_, InternalTransaction>(
        "SELECT * FROM erp.internal_transactions WHERE id = $1",
    )
    .bind(transaction_id)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(transaction)) => Json(ApiResponse::success(transaction, "获取内部交易详情成功")),
        Ok(None) => Json(api_error(404, "内部交易不存在")),
        Err(e) => {
            tracing::error!("获取内部交易详情失败: {}", e);
            Json(api_error(500, "获取内部交易详情失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:write"])),
    path = "/erp/consolidation/execute-elimination",
    tag = "Consolidation",
    responses((status = 200, description = "执行内部交易抵消成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn execute_elimination(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<ExecuteEliminationRequest>,
) -> Json<ApiResponse<EliminationResult>> {
    let rules: Vec<EliminationRule> = if let Some(rule_ids) = req.rule_ids {
        sqlx::query_as::<_, EliminationRule>(
            "SELECT * FROM erp.elimination_rules WHERE id = ANY($1) AND scope_id = $2 AND status = 'active' ORDER BY priority ASC",
        )
        .bind(&rule_ids)
        .bind(req.scope_id)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default()
    } else {
        sqlx::query_as::<_, EliminationRule>(
            "SELECT * FROM erp.elimination_rules WHERE scope_id = $1 AND status = 'active' ORDER BY priority ASC",
        )
        .bind(req.scope_id)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default()
    };

    let mut total_eliminated = 0.0;
    let mut eliminated_count = 0;
    let mut results = Vec::new();

    for rule in &rules {
        let transactions: Vec<InternalTransaction> = sqlx::query_as::<_, InternalTransaction>(
            r#"
            SELECT * FROM erp.internal_transactions
            WHERE elimination_status = 'pending'
              AND period = $1
            "#,
        )
        .bind(&req.period)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default();

        let rule_total: f64 = transactions
            .iter()
            .map(|t| t.amount.to_string().parse::<f64>().unwrap_or(0.0))
            .sum();

        total_eliminated += rule_total;
        eliminated_count += transactions.len() as i64;

        for tx in &transactions {
            sqlx::query(
                r#"
                UPDATE erp.internal_transactions
                SET elimination_status = 'eliminated', eliminated_amount = amount
                WHERE id = $1
                "#,
            )
            .bind(tx.id)
            .execute(&state.db)
            .await
            .ok();
        }

        results.push(RuleEliminationResult {
            rule_id: rule.id,
            rule_name: rule.name.clone(),
            rule_type: rule.r#type.clone(),
            transaction_count: transactions.len() as i64,
            total_eliminated: rule_total,
            success: true,
            error_message: None,
        });
    }

    log_audit(
        &state.db,
        "execute_elimination",
        "internal_transaction",
        Some(req.scope_id),
        &headers,
    )
    .await;

    Json(ApiResponse::success(
        EliminationResult {
            eliminated_count,
            total_eliminated,
            results,
        },
        "执行抵消成功",
    ))
}
