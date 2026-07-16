use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    Json,
};
use uuid::Uuid;

use crate::models::consolidation::*;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

use super::common::PaginationParams;
use super::ApiState;

macro_rules! log_audit {
    ($($args:expr),*) => {
    };
}

pub async fn list_elimination_rules(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<EliminationRule>>> {
    if params.scope_id.is_none() {
        return Json(api_error(400, "scope_id为必填参数"));
    }

    let scope_id = params.scope_id.unwrap_or_default();
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

pub async fn get_elimination_rule(
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

pub async fn create_elimination_rule(
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

pub async fn update_elimination_rule(
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

pub async fn delete_elimination_rule(
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
