use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    Json,
};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use uuid::Uuid;

use crate::models::consolidation::*;
use topems_shared_core::response::PaginatedResponse;
use topems_shared_core::{response::ApiResponse, TopemsError};

use super::common::{log_audit, ConsolidationListParams};
use super::ApiState;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/elimination-rules",
    tag = "Consolidation",
    responses((status = 200, description = "获取抵消规则列表成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn list_elimination_rules(
    State(_state): State<ApiState>,
    Query(params): Query<ConsolidationListParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<PaginatedResponse<EliminationRule>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    if params.scope_id.is_none() {
        return ApiResponse::from(TopemsError::ValidationFailed(
            "scope_id为必填参数".to_string(),
        ));
    }

    let scope_id = params.scope_id.unwrap_or_default();
    let page = params.page_or_default();
    let page_size = params.page_size_or_default();
    let offset = params.offset();

    let result = sqlx::query_as::<_, EliminationRule>(
        r#"
        SELECT * FROM erp.elimination_rules
        WHERE deleted_at IS NULL AND scope_id = $1
          AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY priority ASC, created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(scope_id)
    .bind(params.keyword.as_ref().map(|s| format!("%{}%", s)))
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(rules) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM erp.elimination_rules
                WHERE deleted_at IS NULL AND scope_id = $1
                  AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(scope_id)
            .bind(params.keyword.as_ref().map(|s| format!("%{}%", s)))
            .bind(&params.status)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);
            ApiResponse::success(
                PaginatedResponse::new(rules, total, page, page_size),
                "获取抵消规则列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取抵消规则列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取抵消规则列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/elimination-rules/{ruleId}",
    tag = "Consolidation",
    params(("ruleId" = String, Path, description = "抵消规则ID")),
    responses((status = 200, description = "获取抵消规则详情成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn get_elimination_rule(
    State(_state): State<ApiState>,
    Path(rule_id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<EliminationRule> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    match sqlx::query_as::<_, EliminationRule>(
        "SELECT * FROM erp.elimination_rules WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(rule_id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(Some(rule)) => ApiResponse::success(rule, "获取抵消规则成功"),
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("抵消规则不存在".to_string())),
        Err(e) => {
            tracing::error!("获取抵消规则失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取抵消规则失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:master-data:write"])),
    path = "/erp/consolidation/elimination-rules",
    tag = "Consolidation",
    responses((status = 200, description = "创建抵消规则成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn create_elimination_rule(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateEliminationRuleRequest>,
) -> ApiResponse<EliminationRule> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let id = Uuid::new_v4();
    let debit_codes = req
        .debit_account_codes
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null));
    let credit_codes = req
        .credit_account_codes
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null));

    let result = sqlx::query_as::<_, EliminationRule>(
        r#"
        INSERT INTO erp.elimination_rules
        (id, scope_id, code, name, type, description, status, direction, debit_account_codes, credit_account_codes, company_pairs, auto_elimination, priority, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, erp.group_tenant_of(NULLIF(current_setting('app.tenant_id', true), '')::UUID))
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(req.scope_id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.r#type)
    .bind(&req.description)
    .bind(req.status.as_deref().unwrap_or("active"))
    .bind(req.direction.as_deref().unwrap_or("both"))
    .bind(&debit_codes)
    .bind(&credit_codes)
    .bind(&req.company_pairs)
    .bind(req.auto_elimination.unwrap_or(true))
    .bind(req.priority.unwrap_or(100))
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(rule) => {
            log_audit(
                &state.system_pool,
                "create",
                "elimination_rule",
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
            ApiResponse::success(rule, "创建抵消规则成功")
        }
        Err(e) => {
            tracing::error!("创建抵消规则失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建抵消规则失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["erp:update"])),
    path = "/erp/consolidation/elimination-rules/{ruleId}",
    tag = "Consolidation",
    params(("ruleId" = String, Path, description = "抵消规则ID")),
    responses((status = 200, description = "更新抵消规则成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn update_elimination_rule(
    State(state): State<ApiState>,
    Path(rule_id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateEliminationRuleRequest>,
) -> ApiResponse<EliminationRule> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let debit_codes = req
        .debit_account_codes
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null));
    let credit_codes = req
        .credit_account_codes
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null));

    let result = sqlx::query_as::<_, EliminationRule>(
        r#"
        UPDATE erp.elimination_rules
        SET name = COALESCE($2, name),
            description = COALESCE($3, description),
            status = COALESCE($4, status),
            direction = COALESCE($5, direction),
            debit_account_codes = COALESCE($6, debit_account_codes),
            credit_account_codes = COALESCE($7, credit_account_codes),
            company_pairs = COALESCE($8, company_pairs),
            auto_elimination = COALESCE($9, auto_elimination),
            priority = COALESCE($10, priority),
            updated_at = NOW()
        WHERE id = $1 AND (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)
        RETURNING *
        "#,
    )
    .bind(rule_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.status)
    .bind(&req.direction)
    .bind(&debit_codes)
    .bind(&credit_codes)
    .bind(&req.company_pairs)
    .bind(req.auto_elimination)
    .bind(req.priority)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(rule)) => {
            log_audit(
                &state.system_pool,
                "update",
                "elimination_rule",
                Some(rule_id),
                &headers,
            )
            .await;
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(rule, "更新抵消规则成功")
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("抵消规则不存在".to_string())),
        Err(e) => {
            tracing::error!("更新抵消规则失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新抵消规则失败".to_string()))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["erp:delete"])),
    path = "/erp/consolidation/elimination-rules/{ruleId}",
    tag = "Consolidation",
    params(("ruleId" = String, Path, description = "抵消规则ID")),
    responses((status = 200, description = "删除抵消规则成功", body = ApiResponse<serde_json::Value>))
)]
pub async fn delete_elimination_rule(
    State(state): State<ApiState>,
    Path(rule_id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<()> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    match sqlx::query("UPDATE erp.elimination_rules SET deleted_at = NOW() WHERE id = $1 AND (tenant_id = (NULLIF(current_setting('app.tenant_id', true), ''))::uuid)")
        .bind(rule_id)
        .execute(&mut **txn)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                ApiResponse::from(TopemsError::ResourceNotFound(
                    "抵消规则不存在".to_string(),
                ))
            } else {
                log_audit(
                    &state.system_pool,
                    "delete",
                    "elimination_rule",
                    Some(rule_id),
                    &headers,
                )
                .await;
                if let Some(t) = guard.take() {
                    if let Err(e) = t.commit().await {
                        tracing::error!("事务提交失败: {}", e);
                        return ApiResponse::server_error("事务提交失败");
                    }
                }
                ApiResponse::success((), "删除抵消规则成功")
            }
        }
        Err(e) => {
            tracing::error!("删除抵消规则失败: {}", e);
            ApiResponse::from(TopemsError::Internal(
                "删除抵消规则失败".to_string(),
            ))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["erp:read"])),
    path = "/erp/consolidation/scopes/{scopeId}/elimination-worksheet/export",
    tag = "ConsolidationEliminationRules",
    operation_id = "export_elimination_worksheet",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn export_elimination_worksheet(
    State(_state): State<ApiState>,
    Path(scope_id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => unreachable!("rls txn missing"),
    };
    let rules = match sqlx::query_as::<_, EliminationRule>(
        "SELECT * FROM erp.elimination_rules WHERE deleted_at IS NULL AND scope_id = $1 ORDER BY priority ASC",
    )
    .bind(scope_id)
    .fetch_all(&mut **txn)
    .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("导出抵消工作底稿-查询规则失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("导出抵消工作底稿失败".to_string()));
        }
    };

    let transactions = match sqlx::query_as::<_, InternalTransaction>(
        "SELECT * FROM erp.internal_transactions ORDER BY transaction_date DESC",
    )
    .fetch_all(&mut **txn)
    .await
    {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("导出抵消工作底稿-查询交易失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("导出抵消工作底稿失败".to_string()));
        }
    };

    let worksheet = serde_json::json!({
        "scope_id": scope_id,
        "elimination_rules": rules,
        "internal_transactions": transactions,
    });

    ApiResponse::success(worksheet, "导出抵消工作底稿成功")
}
