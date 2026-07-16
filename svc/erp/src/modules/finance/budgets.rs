#![allow(dead_code)]

use axum::extract::{Extension, Json, Path, Query, State};
use axum::http::HeaderMap;

use chrono::Utc;

use uuid::Uuid;

use super::super::ApiState;
use super::PaginationParams;
use crate::models::finance::{Budget, CreateBudgetRequest, UpdateBudgetRequest};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

pub async fn list_budgets(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Budget>>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Budget>(
        r#"
        SELECT id, department_id, budget_type, fiscal_year, total_budget, used_amount, remaining_amount, usage_rate, status, created_at, updated_at
        FROM budgets
        WHERE ($1::text IS NULL OR budget_type ILIKE $1 OR fiscal_year ILIKE $1)
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
        Ok(budgets) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM budgets
                WHERE ($1::text IS NULL OR budget_type ILIKE $1 OR fiscal_year ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(budgets, total, page, page_size),
                "获取预算列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取预算列表失败: {}", e);
            Json(api_error(500, "获取预算列表失败"))
        }
    }
}

pub async fn create_budget(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateBudgetRequest>,
) -> Json<ApiResponse<Budget>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    if req.total_budget <= 0.0 {
        return Json(api_error(400, "预算金额必须大于0"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let used_amount = 0.0;
    let remaining_amount = req.total_budget;
    let usage_rate = 0.0;

    let result = sqlx::query_as::<_, Budget>(
        r#"
        INSERT INTO budgets (id, department_id, budget_type, fiscal_year, total_budget, used_amount, remaining_amount, usage_rate, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)
        RETURNING id, department_id, budget_type, fiscal_year, total_budget, used_amount, remaining_amount, usage_rate, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.department_id)
    .bind(&req.budget_type)
    .bind(&req.fiscal_year)
    .bind(req.total_budget)
    .bind(used_amount)
    .bind(remaining_amount)
    .bind(usage_rate)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(budget) => (
            Json(ApiResponse::success(budget.clone(), "预算创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建预算失败: {}", e);
            (
                Json(api_error(500, "预算创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(budget) = &result {
        serde_json::to_value(budget).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "budget".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: Some(claims.sub.clone()),
            user_name: Some(claims.username.clone()),
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

pub async fn get_budget(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Budget>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let cache_key = super::budget_cache_key(&id);
    if let Some(cached) = state.budget_cache.get(&cache_key) {
        if let Ok(budget) = serde_json::from_value(cached.clone()) {
            return Json(ApiResponse::success(budget, "从缓存获取预算成功"));
        }
    }

    let result = sqlx::query_as::<_, Budget>(
        r#"
        SELECT id, department_id, budget_type, fiscal_year, total_budget, used_amount, remaining_amount, usage_rate, status, created_at, updated_at
        FROM budgets WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(budget)) => {
            state.budget_cache.set_with_ttl(
                cache_key,
                serde_json::to_value(&budget).unwrap_or_default(),
                super::FINANCE_CACHE_TTL,
            );
            Json(ApiResponse::success(budget, "获取预算成功"))
        }
        Ok(None) => Json(api_error(404, "预算不存在")),
        Err(e) => {
            tracing::error!("获取预算失败: {}", e);
            Json(api_error(500, "获取预算失败"))
        }
    }
}

pub async fn update_budget(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateBudgetRequest>,
) -> Json<ApiResponse<Budget>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, Budget>(
        "SELECT id, department_id, budget_type, fiscal_year, total_budget, used_amount, remaining_amount, usage_rate, status, created_at, updated_at FROM budgets WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(b)) => b,
        Ok(None) => return Json(api_error(404, "预算不存在")),
        Err(e) => return Json(api_error(500, &format!("查询预算失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let department_id = req.department_id.or(existing.department_id);
    let budget_type = req.budget_type.or(existing.budget_type);
    let fiscal_year = req.fiscal_year.unwrap_or(existing.fiscal_year);
    let total_budget = req.total_budget.unwrap_or(existing.total_budget);
    let used_amount = req.used_amount.unwrap_or(existing.used_amount);
    let status = req.status.unwrap_or(existing.status);
    let remaining_amount = total_budget - used_amount;
    let usage_rate = if total_budget > 0.0 {
        (used_amount / total_budget) * 100.0
    } else {
        0.0
    };
    let now = Utc::now();

    let result = sqlx::query_as::<_, Budget>(
        r#"
        UPDATE budgets SET
            department_id = $2, budget_type = $3, fiscal_year = $4, total_budget = $5, used_amount = $6, remaining_amount = $7, usage_rate = $8, status = $9, updated_at = $10
        WHERE id = $1
        RETURNING id, department_id, budget_type, fiscal_year, total_budget, used_amount, remaining_amount, usage_rate, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(department_id)
    .bind(&budget_type)
    .bind(&fiscal_year)
    .bind(total_budget)
    .bind(used_amount)
    .bind(remaining_amount)
    .bind(usage_rate)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(budget) => {
            state.budget_cache.remove(&super::budget_cache_key(&id));
            (
                Json(ApiResponse::success(budget.clone(), "预算更新成功")),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("更新预算失败: {}", e);
            (
                Json(api_error(500, "预算更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(budget) = &result {
        serde_json::to_value(budget).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "budget".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: Some(claims.sub.clone()),
            user_name: Some(claims.username.clone()),
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

pub async fn delete_budget(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&state.db, &claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query("DELETE FROM budgets WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            state.budget_cache.remove(&super::budget_cache_key(&id));
            (
                Json(ApiResponse::success("".to_string(), "预算删除成功")),
                "success".to_string(),
                None,
            )
        }
        Ok(_) => (
            Json(api_error(404, "预算不存在")),
            "error".to_string(),
            Some("预算不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除预算失败: {}", e);
            (
                Json(api_error(500, "预算删除失败")),
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
            entity_type: "budget".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: Some(claims.sub.clone()),
            user_name: Some(claims.username.clone()),
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
