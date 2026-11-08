use axum::{
    extract::{Extension, Path, Query, State},
    Json,
};
use uuid::Uuid;

use crate::models::consolidation::*;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::PaginatedResponse;
use topems_shared_core::{response::ApiResponse, TopemsError};

use super::common::{require_action_permission, ConsolidationListParams};
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<PaginatedResponse<InternalTransaction>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
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
    .fetch_all(&mut **txn)
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> ApiResponse<InternalTransaction> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    match sqlx::query_as::<_, InternalTransaction>(
        "SELECT * FROM erp.internal_transactions WHERE id = $1",
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
        (status = 200, description = "执行内部交易抵消成功", body = ApiResponse<serde_json::Value>),
        (status = 501, description = "功能未接入"),
    )
)]
pub async fn execute_elimination(
    Extension(claims): Extension<Claims>,
    Json(_req): Json<ExecuteEliminationRequest>,
) -> ApiResponse<EliminationResult> {
    if let Err(e) = require_action_permission(&claims, "erp:consolidation-elimination:write") {
        return e.0;
    }

    // P0 止血：旧实现把同一批 pending 交易按每条规则重复累计，再全部标记 eliminated，
    // 且没有内部交易匹配表，结果必然错误。此处整体下线，不保留半可用状态。
    ApiResponse::not_implemented(
        "内部交易抵消未接入：缺少内部交易匹配表与可核对的抵销分录，功能暂不开放",
    )
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
    async fn execute_elimination_returns_not_implemented_for_authorized_user() {
        let resp = execute_elimination(
            Extension(claims(
                vec!["erp:consolidation-elimination:write".to_string()],
                false,
            )),
            Json(elimination_req()),
        )
        .await;
        assert_eq!(resp.code, 501);
        assert!(resp.data.is_none());
        assert!(resp.message.contains("未接入"));
    }
}
