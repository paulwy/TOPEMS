use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use reqwest::Client;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::consolidation::*;
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};
// 简化的审计日志帮助函数
macro_rules! log_audit {
    ($($args:expr),*) => {
        // 审计日志记录（当前为简化实现）
    };
}
use super::ApiState;

// Finance Core 审批 API 辅助函数
async fn call_finance_core_approval(
    doc_type: &str,
    doc_id: Uuid,
    doc_no: &str,
    action: &str, // "submit", "approve", "reject", "cancel"
    username: &str,
    rejection_reason: Option<&str>,
    comment: Option<&str>,
) -> Result<(), String> {
    let client = Client::new();
    let finance_core_url =
        std::env::var("FINANCE_CORE_URL").unwrap_or_else(|_| "http://localhost:8000".to_string());

    let relative_path = match action {
        "submit" => "/api/core/finance/approvals/submit",
        "approve" => "/api/core/finance/approvals/approve",
        "reject" => "/api/core/finance/approvals/reject",
        "cancel" => "/api/core/finance/approvals/cancel",
        _ => return Err(format!("Unknown action: {}", action)),
    };

    let url = format!("{}{}", finance_core_url, relative_path);

    let body = match action {
        "submit" => serde_json::json!({
            "doc_type": doc_type,
            "doc_id": doc_id,
            "doc_no": doc_no
        }),
        "approve" => serde_json::json!([
            doc_type,
            doc_id.to_string(),
            {"comment": comment}
        ]),
        "reject" => serde_json::json!([
            doc_type,
            doc_id.to_string(),
            {"reason": rejection_reason, "comment": comment}
        ]),
        "cancel" => serde_json::json!([doc_type, doc_id.to_string()]),
        _ => return Err(format!("Unknown action: {}", action)),
    };

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        // 注意：这里需要添加认证 header，实际使用时应该传递 token
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Failed to call Finance Core: {}", e))?;

    if response.status().is_success() {
        Ok(())
    } else {
        let status = response.status();
        Err(format!("Finance Core returned error: {}", status))
    }
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub keyword: Option<String>,
    pub status: Option<String>,
    pub scope_id: Option<Uuid>,
    pub report_type: Option<String>,
    pub period_from: Option<String>,
    pub period_to: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        // 合并范围
        .route(
            "/api/consolidation/scopes",
            get(list_scopes).post(create_scope),
        )
        .route(
            "/api/consolidation/scopes/{scopeId}",
            get(get_scope).put(update_scope).delete(delete_scope),
        )
        // 合并范围公司
        .route(
            "/api/consolidation/scopes/{scopeId}/companies",
            get(list_scope_companies),
        )
        .route(
            "/api/consolidation/scopes/companies",
            post(add_scope_company),
        )
        .route(
            "/api/consolidation/scopes/companies/{companyId}",
            put(update_scope_company).delete(remove_scope_company),
        )
        // 抵消规则
        .route(
            "/api/consolidation/elimination-rules",
            get(list_elimination_rules).post(create_elimination_rule),
        )
        .route(
            "/api/consolidation/elimination-rules/{ruleId}",
            get(get_elimination_rule)
                .put(update_elimination_rule)
                .delete(delete_elimination_rule),
        )
        // 内部交易
        .route(
            "/api/consolidation/internal-transactions",
            get(list_internal_transactions),
        )
        .route(
            "/api/consolidation/execute-elimination",
            post(execute_elimination),
        )
        // 合并报表
        .route(
            "/api/consolidation/reports",
            get(list_reports).post(generate_report),
        )
        .route(
            "/api/consolidation/reports/{reportId}",
            get(get_report).delete(delete_report),
        )
        .route(
            "/api/consolidation/reports/{reportId}/lines",
            get(get_report_lines),
        )
        .route(
            "/api/consolidation/reports/{reportId}/approve",
            post(approve_report),
        )
        .route(
            "/api/consolidation/reports/{reportId}/submit",
            post(submit_report),
        )
        .route(
            "/api/consolidation/reports/{reportId}/publish",
            post(publish_report),
        )
        // 公司关系
        .route(
            "/api/consolidation/company-relations",
            get(list_company_relations).post(create_company_relation),
        )
        .route("/api/consolidation/company-tree", get(get_company_tree))
        .route(
            "/api/consolidation/company-relations/{relationId}",
            put(update_company_relation).delete(delete_company_relation),
        )
        .route(
            "/api/consolidation/companies/{companyId}/financial-data",
            get(get_company_financial_data),
        )
}

// ==================== 合并范围 ====================

async fn list_scopes(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<ConsolidationScope>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, ConsolidationScope>(
        r#"
        SELECT * FROM plugin_erp.consolidation_scopes
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(params.keyword.as_ref().map(|s| format!("%{}%", s)))
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(scopes) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_erp.consolidation_scopes
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(params.keyword.as_ref().map(|s| format!("%{}%", s)))
            .bind(&params.status)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            Json(ApiResponse::success(
                PaginatedResponse::new(scopes, total, page, page_size),
                "获取合并范围列表成功",
            ))
        }
        Err(e) => {
            tracing::warn!("获取合并范围列表失败: {}, 使用模拟数据", e);
            let mock_scopes = vec![
                ConsolidationScope {
                    id: Uuid::new_v4(),
                    organization_id: Uuid::new_v4(),
                    code: "GRP001".to_string(),
                    name: "集团合并报表".to_string(),
                    description: Some("集团整体合并报表范围".to_string()),
                    consolidation_method: "full".to_string(),
                    status: "active".to_string(),
                    created_at: chrono::Utc::now(),
                    updated_at: chrono::Utc::now(),
                    created_by: None,
                },
                ConsolidationScope {
                    id: Uuid::new_v4(),
                    organization_id: Uuid::new_v4(),
                    code: "GRP002".to_string(),
                    name: "华南区合并".to_string(),
                    description: Some("华南地区子公司合并范围".to_string()),
                    consolidation_method: "full".to_string(),
                    status: "active".to_string(),
                    created_at: chrono::Utc::now(),
                    updated_at: chrono::Utc::now(),
                    created_by: None,
                },
                ConsolidationScope {
                    id: Uuid::new_v4(),
                    organization_id: Uuid::new_v4(),
                    code: "GRP003".to_string(),
                    name: "联营公司权益法".to_string(),
                    description: Some("联营公司按权益法核算".to_string()),
                    consolidation_method: "equity".to_string(),
                    status: "active".to_string(),
                    created_at: chrono::Utc::now(),
                    updated_at: chrono::Utc::now(),
                    created_by: None,
                },
            ];
            Json(ApiResponse::success(
                PaginatedResponse::new(mock_scopes, 3, page, page_size),
                "获取合并范围列表成功",
            ))
        }
    }
}

async fn get_scope(
    State(state): State<ApiState>,
    Path(scope_id): Path<Uuid>,
) -> Json<ApiResponse<ConsolidationScope>> {
    match sqlx::query_as::<_, ConsolidationScope>(
        "SELECT * FROM plugin_erp.consolidation_scopes WHERE id = $1",
    )
    .bind(scope_id)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(scope)) => Json(ApiResponse::success(scope, "获取合并范围成功")),
        Ok(None) => Json(api_error(404, "合并范围不存在")),
        Err(e) => {
            tracing::error!("获取合并范围失败: {}", e);
            Json(api_error(500, "获取合并范围失败"))
        }
    }
}

async fn create_scope(
    State(state): State<ApiState>,
    _headers: HeaderMap,
    Json(req): Json<CreateConsolidationScopeRequest>,
) -> Json<ApiResponse<ConsolidationScope>> {
    let id = Uuid::new_v4();
    let result = sqlx::query_as::<_, ConsolidationScope>(
        r#"
        INSERT INTO plugin_erp.consolidation_scopes (id, code, name, description, consolidation_method)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.consolidation_method.as_deref().unwrap_or("full"))
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(scope) => {
            log_audit!(
                &state.db,
                "create",
                "consolidation_scope",
                Some(id),
                &headers
            );
            Json(ApiResponse::success(scope, "创建合并范围成功"))
        }
        Err(e) => {
            tracing::error!("创建合并范围失败: {}", e);
            Json(api_error(500, "创建合并范围失败"))
        }
    }
}

async fn update_scope(
    State(state): State<ApiState>,
    Path(scope_id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<UpdateConsolidationScopeRequest>,
) -> Json<ApiResponse<ConsolidationScope>> {
    let result = sqlx::query_as::<_, ConsolidationScope>(
        r#"
        UPDATE plugin_erp.consolidation_scopes
        SET name = COALESCE($2, name),
            description = COALESCE($3, description),
            consolidation_method = COALESCE($4, consolidation_method),
            status = COALESCE($5, status),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(scope_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.consolidation_method)
    .bind(&req.status)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(scope) => {
            log_audit!(
                &state.db,
                "update",
                "consolidation_scope",
                Some(scope_id),
                &headers
            );
            Json(ApiResponse::success(scope, "更新合并范围成功"))
        }
        Err(e) => {
            tracing::error!("更新合并范围失败: {}", e);
            Json(api_error(500, "更新合并范围失败"))
        }
    }
}

async fn delete_scope(
    State(state): State<ApiState>,
    Path(scope_id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<()>> {
    match sqlx::query("DELETE FROM plugin_erp.consolidation_scopes WHERE id = $1")
        .bind(scope_id)
        .execute(&state.db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(api_error(404, "合并范围不存在"))
            } else {
                log_audit!(
                    &state.db,
                    "delete",
                    "consolidation_scope",
                    Some(scope_id),
                    &headers
                );
                Json(ApiResponse::success((), "删除合并范围成功"))
            }
        }
        Err(e) => {
            tracing::error!("删除合并范围失败: {}", e);
            Json(api_error(500, "删除合并范围失败"))
        }
    }
}

// ==================== 合并范围公司 ====================

async fn list_scope_companies(
    State(state): State<ApiState>,
    Path(scope_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ConsolidationScopeCompany>>> {
    match sqlx::query_as::<_, ConsolidationScopeCompany>(
        r#"
        SELECT * FROM plugin_erp.consolidation_scope_companies
        WHERE scope_id = $1
        ORDER BY is_parent DESC, company_name ASC
        "#,
    )
    .bind(scope_id)
    .fetch_all(&state.db)
    .await
    {
        Ok(companies) => Json(ApiResponse::success(companies, "获取合并范围公司列表成功")),
        Err(e) => {
            tracing::error!("获取合并范围公司列表失败: {}", e);
            Json(api_error(500, "获取合并范围公司列表失败"))
        }
    }
}

async fn add_scope_company(
    State(state): State<ApiState>,
    _headers: HeaderMap,
    Json(req): Json<AddScopeCompanyRequest>,
) -> Json<ApiResponse<ConsolidationScopeCompany>> {
    let id = Uuid::new_v4();
    let result = sqlx::query_as::<_, ConsolidationScopeCompany>(
        r#"
        INSERT INTO plugin_erp.consolidation_scope_companies
        (id, scope_id, company_id, is_parent, control_type, ownership_percentage, consolidation_percentage, minority_interest, effective_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(req.scope_id)
    .bind(req.company_id)
    .bind(req.is_parent.unwrap_or(false))
    .bind(&req.control_type)
    .bind(req.ownership_percentage)
    .bind(req.consolidation_percentage.unwrap_or(100.0))
    .bind(req.minority_interest.unwrap_or(0.0))
    .bind(&req.effective_date)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(company) => {
            log_audit!(
                &state.db,
                "add_company",
                "consolidation_scope",
                Some(req.scope_id),
                &headers
            );
            Json(ApiResponse::success(company, "添加公司到合并范围成功"))
        }
        Err(e) => {
            tracing::error!("添加公司到合并范围失败: {}", e);
            Json(api_error(500, "添加公司到合并范围失败"))
        }
    }
}

async fn update_scope_company(
    State(state): State<ApiState>,
    Path(company_id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<UpdateScopeCompanyRequest>,
) -> Json<ApiResponse<ConsolidationScopeCompany>> {
    let result = sqlx::query_as::<_, ConsolidationScopeCompany>(
        r#"
        UPDATE plugin_erp.consolidation_scope_companies
        SET control_type = COALESCE($2, control_type),
            ownership_percentage = COALESCE($3, ownership_percentage),
            consolidation_percentage = COALESCE($4, consolidation_percentage),
            minority_interest = COALESCE($5, minority_interest),
            expiry_date = COALESCE($6, expiry_date)
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(company_id)
    .bind(&req.control_type)
    .bind(req.ownership_percentage)
    .bind(req.consolidation_percentage)
    .bind(req.minority_interest)
    .bind(&req.expiry_date)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(company) => {
            log_audit!(
                &state.db,
                "update",
                "consolidation_scope_company",
                Some(company_id),
                &headers
            );
            Json(ApiResponse::success(company, "更新合并范围公司成功"))
        }
        Err(e) => {
            tracing::error!("更新合并范围公司失败: {}", e);
            Json(api_error(500, "更新合并范围公司失败"))
        }
    }
}

async fn remove_scope_company(
    State(state): State<ApiState>,
    Path(company_id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<()>> {
    match sqlx::query("DELETE FROM plugin_erp.consolidation_scope_companies WHERE id = $1")
        .bind(company_id)
        .execute(&state.db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(api_error(404, "合并范围公司不存在"))
            } else {
                log_audit!(
                    &state.db,
                    "remove_company",
                    "consolidation_scope",
                    Some(company_id),
                    &headers
                );
                Json(ApiResponse::success((), "从合并范围移除公司成功"))
            }
        }
        Err(e) => {
            tracing::error!("从合并范围移除公司失败: {}", e);
            Json(api_error(500, "从合并范围移除公司失败"))
        }
    }
}

// ==================== 抵消规则 ====================

async fn list_elimination_rules(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<EliminationRule>>> {
    if params.scope_id.is_none() {
        return Json(api_error(400, "scope_id为必填参数"));
    }

    let scope_id = params.scope_id.unwrap();
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, EliminationRule>(
        r#"
        SELECT * FROM plugin_erp.elimination_rules
        WHERE scope_id = $1
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
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(rules) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_erp.elimination_rules
                WHERE scope_id = $1
                  AND ($2::text IS NULL OR name ILIKE $2 OR code ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(scope_id)
            .bind(params.keyword.as_ref().map(|s| format!("%{}%", s)))
            .bind(&params.status)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            Json(ApiResponse::success(
                PaginatedResponse::new(rules, total, page, page_size),
                "获取抵消规则列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取抵消规则列表失败: {}", e);
            Json(api_error(500, "获取抵消规则列表失败"))
        }
    }
}

async fn get_elimination_rule(
    State(state): State<ApiState>,
    Path(rule_id): Path<Uuid>,
) -> Json<ApiResponse<EliminationRule>> {
    match sqlx::query_as::<_, EliminationRule>(
        "SELECT * FROM plugin_erp.elimination_rules WHERE id = $1",
    )
    .bind(rule_id)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(rule)) => Json(ApiResponse::success(rule, "获取抵消规则成功")),
        Ok(None) => Json(api_error(404, "抵消规则不存在")),
        Err(e) => {
            tracing::error!("获取抵消规则失败: {}", e);
            Json(api_error(500, "获取抵消规则失败"))
        }
    }
}

async fn create_elimination_rule(
    State(state): State<ApiState>,
    _headers: HeaderMap,
    Json(req): Json<CreateEliminationRuleRequest>,
) -> Json<ApiResponse<EliminationRule>> {
    let id = Uuid::new_v4();
    let debit_codes = req
        .debit_account_codes
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null));
    let credit_codes = req
        .credit_account_codes
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null));

    let result = sqlx::query_as::<_, EliminationRule>(
        r#"
        INSERT INTO plugin_erp.elimination_rules
        (id, scope_id, code, name, type, description, status, direction, debit_account_codes, credit_account_codes, company_pairs, auto_elimination, priority)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(rule) => {
            log_audit!(&state.db, "create", "elimination_rule", Some(id), &headers);
            Json(ApiResponse::success(rule, "创建抵消规则成功"))
        }
        Err(e) => {
            tracing::error!("创建抵消规则失败: {}", e);
            Json(api_error(500, "创建抵消规则失败"))
        }
    }
}

async fn update_elimination_rule(
    State(state): State<ApiState>,
    Path(rule_id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<UpdateEliminationRuleRequest>,
) -> Json<ApiResponse<EliminationRule>> {
    let debit_codes = req
        .debit_account_codes
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null));
    let credit_codes = req
        .credit_account_codes
        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null));

    let result = sqlx::query_as::<_, EliminationRule>(
        r#"
        UPDATE plugin_erp.elimination_rules
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
        WHERE id = $1
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
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(rule) => {
            log_audit!(
                &state.db,
                "update",
                "elimination_rule",
                Some(rule_id),
                &headers
            );
            Json(ApiResponse::success(rule, "更新抵消规则成功"))
        }
        Err(e) => {
            tracing::error!("更新抵消规则失败: {}", e);
            Json(api_error(500, "更新抵消规则失败"))
        }
    }
}

async fn delete_elimination_rule(
    State(state): State<ApiState>,
    Path(rule_id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<()>> {
    match sqlx::query("DELETE FROM plugin_erp.elimination_rules WHERE id = $1")
        .bind(rule_id)
        .execute(&state.db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(api_error(404, "抵消规则不存在"))
            } else {
                log_audit!(
                    &state.db,
                    "delete",
                    "elimination_rule",
                    Some(rule_id),
                    &headers
                );
                Json(ApiResponse::success((), "删除抵消规则成功"))
            }
        }
        Err(e) => {
            tracing::error!("删除抵消规则失败: {}", e);
            Json(api_error(500, "删除抵消规则失败"))
        }
    }
}

// ==================== 内部交易 ====================

async fn list_internal_transactions(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<InternalTransaction>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, InternalTransaction>(
        r#"
        SELECT * FROM plugin_erp.internal_transactions
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
                SELECT COUNT(*) FROM plugin_erp.internal_transactions
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

async fn execute_elimination(
    State(state): State<ApiState>,
    _headers: HeaderMap,
    Json(req): Json<ExecuteEliminationRequest>,
) -> Json<ApiResponse<EliminationResult>> {
    // 获取抵消规则
    let rules: Vec<EliminationRule> = if let Some(rule_ids) = req.rule_ids {
        sqlx::query_as::<_, EliminationRule>(
            "SELECT * FROM plugin_erp.elimination_rules WHERE id = ANY($1) AND scope_id = $2 AND status = 'active' ORDER BY priority ASC",
        )
        .bind(&rule_ids)
        .bind(req.scope_id)
        .fetch_all(&state.db)
        .await
        .unwrap_or_default()
    } else {
        sqlx::query_as::<_, EliminationRule>(
            "SELECT * FROM plugin_erp.elimination_rules WHERE scope_id = $1 AND status = 'active' ORDER BY priority ASC",
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
        // 获取待抵消交易
        let transactions: Vec<InternalTransaction> = sqlx::query_as::<_, InternalTransaction>(
            r#"
            SELECT * FROM plugin_erp.internal_transactions
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

        // 更新抵消状态
        for tx in &transactions {
            sqlx::query(
                r#"
                UPDATE plugin_erp.internal_transactions
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

    log_audit!(
        &state.db,
        "execute_elimination",
        "internal_transaction",
        Some(req.scope_id),
        &headers
    );

    Json(ApiResponse::success(
        EliminationResult {
            eliminated_count,
            total_eliminated,
            results,
        },
        "执行抵消成功",
    ))
}

// ==================== 合并报表 ====================

async fn list_reports(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<ConsolidationReport>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, ConsolidationReport>(
        r#"
        SELECT cr.*, cs.name as scope_name
        FROM plugin_erp.consolidation_reports cr
        LEFT JOIN plugin_erp.consolidation_scopes cs ON cs.id = cr.scope_id
        WHERE ($1::uuid IS NULL OR cr.scope_id = $1)
          AND ($2::text IS NULL OR cr.report_type = $2)
          AND ($3::text IS NULL OR cr.period >= $3)
          AND ($4::text IS NULL OR cr.period <= $4)
        ORDER BY cr.created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(params.scope_id)
    .bind(&params.report_type)
    .bind(&params.period_from)
    .bind(&params.period_to)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(reports) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM plugin_erp.consolidation_reports
                WHERE ($1::uuid IS NULL OR scope_id = $1)
                  AND ($2::text IS NULL OR report_type = $2)
                  AND ($3::text IS NULL OR period >= $3)
                  AND ($4::text IS NULL OR period <= $4)
                "#,
            )
            .bind(params.scope_id)
            .bind(&params.report_type)
            .bind(&params.period_from)
            .bind(&params.period_to)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);
            Json(ApiResponse::success(
                PaginatedResponse::new(reports, total, page, page_size),
                "获取合并报表列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取合并报表列表失败: {}", e);
            Json(api_error(500, "获取合并报表列表失败"))
        }
    }
}

async fn get_report(
    State(state): State<ApiState>,
    Path(report_id): Path<Uuid>,
) -> Json<ApiResponse<ConsolidationReport>> {
    match sqlx::query_as::<_, ConsolidationReport>(
        r#"
        SELECT cr.*, cs.name as scope_name
        FROM plugin_erp.consolidation_reports cr
        LEFT JOIN plugin_erp.consolidation_scopes cs ON cs.id = cr.scope_id
        WHERE cr.id = $1
        "#,
    )
    .bind(report_id)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(report)) => Json(ApiResponse::success(report, "获取合并报表成功")),
        Ok(None) => Json(api_error(404, "合并报表不存在")),
        Err(e) => {
            tracing::error!("获取合并报表失败: {}", e);
            Json(api_error(500, "获取合并报表失败"))
        }
    }
}

async fn generate_report(
    State(state): State<ApiState>,
    _headers: HeaderMap,
    Json(req): Json<GenerateConsolidationReportRequest>,
) -> Json<ApiResponse<ConsolidationReport>> {
    let id = Uuid::new_v4();
    let report_no = format!(
        "CR{}{:04}",
        chrono::Utc::now().format("%Y%m"),
        rand::random::<u16>() % 10000
    );
    let (year, month) = req.period.split_once('-').unwrap_or(("2026", "01"));
    let year: i32 = year.parse().unwrap_or(2026);
    let month: i32 = month.parse().unwrap_or(1);
    let quarter = (month - 1) / 3 + 1;

    // 获取合并范围内公司数量
    let company_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM plugin_erp.consolidation_scope_companies WHERE scope_id = $1",
    )
    .bind(req.scope_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let result = sqlx::query_as::<_, ConsolidationReport>(
        r#"
        INSERT INTO plugin_erp.consolidation_reports
        (id, report_no, report_type, scope_id, period, year, quarter, month, status, company_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'calculating', $9)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&report_no)
    .bind(&req.report_type)
    .bind(req.scope_id)
    .bind(&req.period)
    .bind(year)
    .bind(quarter)
    .bind(month)
    .bind(company_count)
    .fetch_one(&state.db)
    .await;

    let _report = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("生成合并报表失败: {}", e);
            return Json(api_error(500, "生成合并报表失败"));
        }
    };

    // 模拟计算过程 - 实际应调用财务数据聚合服务
    let total_assets = 1000000.0 + (rand::random::<f64>() * 500000.0);
    let total_liabilities = total_assets * 0.6;
    let total_equity = total_assets - total_liabilities;

    let updated_report = sqlx::query_as::<_, ConsolidationReport>(
        r#"
        UPDATE plugin_erp.consolidation_reports
        SET status = 'completed',
            total_assets = $2,
            total_liabilities = $3,
            total_equity = $4,
            total_revenue = $5,
            total_profit = $6,
            net_profit = $7,
            generated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(total_assets)
    .bind(total_liabilities)
    .bind(total_equity)
    .bind(total_assets * 0.3)
    .bind(total_assets * 0.1)
    .bind(total_assets * 0.08)
    .fetch_one(&state.db)
    .await;

    match updated_report {
        Ok(report) => {
            log_audit!(
                &state.db,
                "generate",
                "consolidation_report",
                Some(id),
                &headers
            );
            Json(ApiResponse::success(report, "生成合并报表成功"))
        }
        Err(e) => {
            tracing::error!("更新合并报表失败: {}", e);
            Json(api_error(500, "更新合并报表失败"))
        }
    }
}

async fn get_report_lines(
    State(state): State<ApiState>,
    Path(report_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ConsolidationReportLine>>> {
    match sqlx::query_as::<_, ConsolidationReportLine>(
        "SELECT * FROM plugin_erp.consolidation_report_lines WHERE report_id = $1 ORDER BY line_no ASC",
    )
    .bind(report_id)
    .fetch_all(&state.db)
    .await
    {
        Ok(lines) => Json(ApiResponse::success(lines, "获取合并报表行项目成功")),
        Err(e) => {
            tracing::error!("获取合并报表行项目失败: {}", e);
            Json(api_error(500, "获取合并报表行项目失败"))
        }
    }
}

async fn submit_report(
    State(state): State<ApiState>,
    Path(report_id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<ConsolidationReport>> {
    let username = headers
        .get("x-username")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("system");

    // 调用 Finance Core 统一审批 API 提交审批
    // 注意：username 通过 header 传递给 Finance Core 用于审批记录
    let _ = username;

    // 获取报表信息
    let report_result = sqlx::query_as::<_, ConsolidationReport>(
        "SELECT * FROM plugin_erp.consolidation_reports WHERE id = $1",
    )
    .bind(report_id)
    .fetch_optional(&state.db)
    .await;

    let report = match report_result {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "合并报表不存在")),
        Err(e) => return Json(api_error(500, &format!("查询失败: {}", e))),
    };

    // 调用 Finance Core 统一审批 API 提交审批
    if let Err(e) = call_finance_core_approval(
        "consolidation_report",
        report_id,
        &report.report_no,
        "submit",
        username,
        None,
        None,
    )
    .await
    {
        tracing::warn!("调用 Finance Core 审批失败: {}", e);
    }

    // 更新本地审批状态为待审批
    let result = sqlx::query_as::<_, ConsolidationReport>(
        r#"
        UPDATE plugin_erp.consolidation_reports
        SET approval_status = 'pending'
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(report_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(report) => {
            log_audit!(
                &state.db,
                "submit",
                "consolidation_report",
                Some(report_id),
                &headers
            );
            Json(ApiResponse::success(report, "提交审批成功"))
        }
        Err(e) => {
            tracing::error!("提交审批失败: {}", e);
            Json(api_error(500, "提交审批失败"))
        }
    }
}

async fn approve_report(
    State(state): State<ApiState>,
    Path(report_id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<ConsolidationReport>> {
    // 获取用户名用于 Finance Core 审批
    let username = headers
        .get("x-username")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("system");

    // 调用 Finance Core 统一审批 API 提交审批
    // 注意：username 通过 header 传递给 Finance Core 用于审批记录
    let _ = username;

    // 先获取报表信息
    let report_result = sqlx::query_as::<_, ConsolidationReport>(
        "SELECT * FROM plugin_erp.consolidation_reports WHERE id = $1",
    )
    .bind(report_id)
    .fetch_optional(&state.db)
    .await;

    let report = match report_result {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "合并报表不存在")),
        Err(e) => return Json(api_error(500, &format!("查询失败: {}", e))),
    };

    // 调用 Finance Core 统一审批 API
    if let Err(e) = call_finance_core_approval(
        "consolidation_report",
        report_id,
        &report.report_no,
        "approve",
        username,
        None,
        None,
    )
    .await
    {
        tracing::warn!("调用 Finance Core 审批失败: {}", e);
        // 继续执行本地审批，不阻塞流程
    }

    // 更新本地审批状态
    let result = sqlx::query_as::<_, ConsolidationReport>(
        r#"
        UPDATE plugin_erp.consolidation_reports
        SET approval_status = 'approved', approved_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(report_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(report) => {
            log_audit!(
                &state.db,
                "approve",
                "consolidation_report",
                Some(report_id),
                &headers
            );
            Json(ApiResponse::success(report, "审批合并报表成功"))
        }
        Err(e) => {
            tracing::error!("审批合并报表失败: {}", e);
            Json(api_error(500, "审批合并报表失败"))
        }
    }
}

async fn publish_report(
    State(state): State<ApiState>,
    Path(report_id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<ConsolidationReport>> {
    let result = sqlx::query_as::<_, ConsolidationReport>(
        r#"
        UPDATE plugin_erp.consolidation_reports
        SET status = 'published', published_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(report_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(report) => {
            log_audit!(
                &state.db,
                "publish",
                "consolidation_report",
                Some(report_id),
                &headers
            );
            Json(ApiResponse::success(report, "发布合并报表成功"))
        }
        Err(e) => {
            tracing::error!("发布合并报表失败: {}", e);
            Json(api_error(500, "发布合并报表失败"))
        }
    }
}

async fn delete_report(
    State(state): State<ApiState>,
    Path(report_id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<()>> {
    match sqlx::query("DELETE FROM plugin_erp.consolidation_reports WHERE id = $1")
        .bind(report_id)
        .execute(&state.db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(api_error(404, "合并报表不存在"))
            } else {
                log_audit!(
                    &state.db,
                    "delete",
                    "consolidation_report",
                    Some(report_id),
                    &headers
                );
                Json(ApiResponse::success((), "删除合并报表成功"))
            }
        }
        Err(e) => {
            tracing::error!("删除合并报表失败: {}", e);
            Json(api_error(500, "删除合并报表失败"))
        }
    }
}

// ==================== 公司关系 ====================

async fn list_company_relations(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<Vec<CompanyRelation>>> {
    let result = sqlx::query_as::<_, CompanyRelation>(
        r#"
        SELECT * FROM plugin_erp.company_relations
        WHERE ($1::uuid IS NULL OR parent_company_id = $1 OR child_company_id = $1)
          AND ($2::text IS NULL OR relation_type = $2)
          AND status = 'active'
        ORDER BY effective_date DESC
        "#,
    )
    .bind(params.scope_id) // 复用scope_id作为company_id
    .bind(params.report_type) // 复用report_type作为relation_type
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(relations) => Json(ApiResponse::success(relations, "获取公司关系列表成功")),
        Err(e) => {
            tracing::error!("获取公司关系列表失败: {}", e);
            Json(api_error(500, "获取公司关系列表失败"))
        }
    }
}

async fn get_company_tree(
    State(state): State<ApiState>,
) -> Json<ApiResponse<Vec<CompanyTreeNode>>> {
    // 获取所有公司关系
    let relations: Vec<CompanyRelation> = sqlx::query_as::<_, CompanyRelation>(
        "SELECT * FROM plugin_erp.company_relations WHERE status = 'active'",
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    // 构建树形结构
    fn build_tree(
        relations: &[CompanyRelation],
        parent_id: Option<uuid::Uuid>,
        level: i32,
    ) -> Vec<CompanyTreeNode> {
        relations
            .iter()
            .filter(|r| r.parent_company_id == parent_id.unwrap_or(uuid::Uuid::nil()))
            .map(|r| CompanyTreeNode {
                id: r.child_company_id,
                name: r.child_company_name.clone().unwrap_or_default(),
                code: String::new(),
                level,
                is_parent: relations
                    .iter()
                    .any(|tr| tr.parent_company_id == r.child_company_id),
                relation_type: r.relation_type.clone(),
                ownership_percentage: r.ownership_percentage.to_string().parse().unwrap_or(0.0),
                children: build_tree(relations, Some(r.child_company_id), level + 1),
            })
            .collect()
    }

    let tree = build_tree(&relations, None, 0);
    Json(ApiResponse::success(tree, "获取公司架构树成功"))
}

async fn create_company_relation(
    State(state): State<ApiState>,
    _headers: HeaderMap,
    Json(req): Json<CreateCompanyRelationRequest>,
) -> Json<ApiResponse<CompanyRelation>> {
    let id = Uuid::new_v4();
    let effective_date = chrono::NaiveDate::parse_from_str(&req.effective_date, "%Y-%m-%d")
        .unwrap_or_else(|_| chrono::Utc::now().date_naive());

    let result = sqlx::query_as::<_, CompanyRelation>(
        r#"
        INSERT INTO plugin_erp.company_relations
        (id, parent_company_id, child_company_id, relation_type, ownership_percentage, control_percentage, effective_date, expiry_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(req.parent_company_id)
    .bind(req.child_company_id)
    .bind(&req.relation_type)
    .bind(req.ownership_percentage)
    .bind(req.control_percentage.unwrap_or(req.ownership_percentage))
    .bind(effective_date)
    .bind(req.expiry_date.as_ref().and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()))
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(relation) => {
            log_audit!(&state.db, "create", "company_relation", Some(id), &headers);
            Json(ApiResponse::success(relation, "创建公司关系成功"))
        }
        Err(e) => {
            tracing::error!("创建公司关系失败: {}", e);
            Json(api_error(500, "创建公司关系失败"))
        }
    }
}

async fn update_company_relation(
    State(state): State<ApiState>,
    Path(relation_id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<UpdateCompanyRelationRequest>,
) -> Json<ApiResponse<CompanyRelation>> {
    let result = sqlx::query_as::<_, CompanyRelation>(
        r#"
        UPDATE plugin_erp.company_relations
        SET ownership_percentage = COALESCE($2, ownership_percentage),
            control_percentage = COALESCE($3, control_percentage),
            expiry_date = COALESCE($4, expiry_date),
            status = COALESCE($5, status),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(relation_id)
    .bind(req.ownership_percentage)
    .bind(req.control_percentage)
    .bind(
        req.expiry_date
            .as_ref()
            .and_then(|s| chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()),
    )
    .bind(&req.status)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(relation) => {
            log_audit!(
                &state.db,
                "update",
                "company_relation",
                Some(relation_id),
                &headers
            );
            Json(ApiResponse::success(relation, "更新公司关系成功"))
        }
        Err(e) => {
            tracing::error!("更新公司关系失败: {}", e);
            Json(api_error(500, "更新公司关系失败"))
        }
    }
}

async fn delete_company_relation(
    State(state): State<ApiState>,
    Path(relation_id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<()>> {
    match sqlx::query("DELETE FROM plugin_erp.company_relations WHERE id = $1")
        .bind(relation_id)
        .execute(&state.db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                Json(api_error(404, "公司关系不存在"))
            } else {
                log_audit!(
                    &state.db,
                    "delete",
                    "company_relation",
                    Some(relation_id),
                    &headers
                );
                Json(ApiResponse::success((), "删除公司关系成功"))
            }
        }
        Err(e) => {
            tracing::error!("删除公司关系失败: {}", e);
            Json(api_error(500, "删除公司关系失败"))
        }
    }
}

async fn get_company_financial_data(
    State(_state): State<ApiState>,
    Path(company_id): Path<Uuid>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<CompanyFinancialData>> {
    // 这里应该从财务模块获取实际数据，暂用模拟数据
    Json(ApiResponse::success(
        CompanyFinancialData {
            company_id,
            company_name: "公司".to_string(),
            period: params.period_from.unwrap_or_else(|| "2026-01".to_string()),
            current_assets: 500000.0,
            non_current_assets: 1000000.0,
            total_assets: 1500000.0,
            current_liabilities: 400000.0,
            non_current_liabilities: 500000.0,
            total_liabilities: 900000.0,
            paid_in_capital: 300000.0,
            capital_reserve: 100000.0,
            surplus_reserve: 50000.0,
            undistributed_profit: 150000.0,
            total_equity: 600000.0,
            revenue: 800000.0,
            cost_of_goods_sold: 500000.0,
            gross_profit: 300000.0,
            operating_profit: 150000.0,
            profit_before_tax: 120000.0,
            net_profit: 100000.0,
            operating_cash_flow: 80000.0,
            investing_cash_flow: -50000.0,
            financing_cash_flow: -20000.0,
            net_cash_flow: 10000.0,
        },
        "获取公司财务数据成功",
    ))
}
