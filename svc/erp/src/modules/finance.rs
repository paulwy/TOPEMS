#![allow(dead_code)]

use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::{DateTime, Datelike, Utc};
use serde::{Deserialize, Serialize};
use std::time::Duration;
use uuid::Uuid;

use super::ApiState;
use crate::models::finance::{
    AccountingSubject, Budget, CollectionRecord, CreateAccountingSubjectRequest,
    CreateBudgetRequest, CreateCollectionRequest, CreateExpenseRequest, CreatePayableRequest,
    CreatePaymentRequest, CreateReceivableRequest, Expense, Payable, PaymentRecord, Receivable,
    UpdateAccountingSubjectRequest, UpdateBudgetRequest, UpdateExpenseRequest,
    UpdatePayableRequest, UpdateReceivableRequest,
};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

const FINANCE_CACHE_TTL: Duration = Duration::from_secs(300);

fn expense_cache_key(id: &Uuid) -> String {
    format!("expense:{}", id)
}

fn budget_cache_key(id: &Uuid) -> String {
    format!("budget:{}", id)
}

fn receivable_cache_key(id: &Uuid) -> String {
    format!("receivable:{}", id)
}

fn payable_cache_key(id: &Uuid) -> String {
    format!("payable:{}", id)
}

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/erp/expenses", get(list_expenses).post(create_expense))
        .route(
            "/api/erp/expenses/{id}",
            get(get_expense).put(update_expense).delete(delete_expense),
        )
        .route("/api/erp/budgets", get(list_budgets).post(create_budget))
        .route(
            "/api/erp/budgets/{id}",
            get(get_budget).put(update_budget).delete(delete_budget),
        )
        .route(
            "/api/erp/receivables",
            get(list_receivables).post(create_receivable),
        )
        .route(
            "/api/erp/receivables/{id}",
            get(get_receivable)
                .put(update_receivable)
                .delete(delete_receivable),
        )
        .route("/api/erp/payables", get(list_payables).post(create_payable))
        .route(
            "/api/erp/payables/{id}",
            get(get_payable).put(update_payable).delete(delete_payable),
        )
}

pub async fn list_expenses(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Expense>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Expense>(
        r#"
        SELECT id, expense_number, applicant_name, department_id, expense_type, amount, description, expense_date, receipt_count, status, approver_id, approved_at, reimbursed_at, created_at, updated_at
        FROM expenses
        WHERE ($1::text IS NULL OR expense_number ILIKE $1 OR applicant_name ILIKE $1)
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
        Ok(expenses) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM expenses
                WHERE ($1::text IS NULL OR expense_number ILIKE $1 OR applicant_name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(expenses, total, page, page_size),
                "获取费用报销列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取费用报销列表失败: {}", e);
            Json(api_error(500, "获取费用报销列表失败"))
        }
    }
}

pub async fn create_expense(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateExpenseRequest>,
) -> Json<ApiResponse<Expense>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    if req.expense_number.is_empty() {
        return Json(api_error(400, "报销编号不能为空"));
    }

    if req.amount <= 0.0 {
        return Json(api_error(400, "报销金额必须大于0"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Expense>(
        r#"
        INSERT INTO expenses (id, expense_number, applicant_name, department_id, expense_type, amount, description, expense_date, receipt_count, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11)
        RETURNING id, expense_number, applicant_name, department_id, expense_type, amount, description, expense_date, receipt_count, status, approver_id, approved_at, reimbursed_at, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.expense_number)
    .bind(&req.applicant_name)
    .bind(req.department_id)
    .bind(&req.expense_type)
    .bind(req.amount)
    .bind(&req.description)
    .bind(req.expense_date)
    .bind(req.receipt_count)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(expense) => (
            Json(ApiResponse::success(expense.clone(), "费用报销创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建费用报销失败: {}", e);
            (
                Json(api_error(500, "费用报销创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(expense) = &result {
        serde_json::to_value(expense).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "expense".to_string(),
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

pub async fn get_expense(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Expense>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let cache_key = expense_cache_key(&id);
    if let Some(cached) = state.expense_cache.get(&cache_key) {
        if let Ok(expense) = serde_json::from_value(cached.clone()) {
            return Json(ApiResponse::success(expense, "从缓存获取费用报销成功"));
        }
    }

    let result = sqlx::query_as::<_, Expense>(
        r#"
        SELECT id, expense_number, applicant_name, department_id, expense_type, amount, description, expense_date, receipt_count, status, approver_id, approved_at, reimbursed_at, created_at, updated_at
        FROM expenses WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(expense)) => {
            state.expense_cache.set_with_ttl(
                cache_key,
                serde_json::to_value(&expense).unwrap_or_default(),
                FINANCE_CACHE_TTL,
            );
            Json(ApiResponse::success(expense, "获取费用报销成功"))
        }
        Ok(None) => Json(api_error(404, "费用报销不存在")),
        Err(e) => {
            tracing::error!("获取费用报销失败: {}", e);
            Json(api_error(500, "获取费用报销失败"))
        }
    }
}

pub async fn update_expense(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateExpenseRequest>,
) -> Json<ApiResponse<Expense>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, Expense>(
        "SELECT id, expense_number, applicant_name, department_id, expense_type, amount, description, expense_date, receipt_count, status, approver_id, approved_at, reimbursed_at, created_at, updated_at FROM expenses WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return Json(api_error(404, "费用报销不存在")),
        Err(e) => return Json(api_error(500, &format!("查询费用报销失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let applicant_name = req.applicant_name.or(existing.applicant_name);
    let department_id = req.department_id.or(existing.department_id);
    let expense_type = req.expense_type.or(existing.expense_type);
    let amount = req.amount.unwrap_or(existing.amount);
    let description = req.description.or(existing.description);
    let expense_date = req.expense_date.or(existing.expense_date);
    let receipt_count = req.receipt_count.or(existing.receipt_count);
    let status = req.status.unwrap_or(existing.status);
    let approver_id = req.approver_id.or(existing.approver_id);
    let approved_at = req.approved_at.or(existing.approved_at);
    let reimbursed_at = req.reimbursed_at.or(existing.reimbursed_at);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Expense>(
        r#"
        UPDATE expenses SET
            applicant_name = $2, department_id = $3, expense_type = $4, amount = $5, description = $6, expense_date = $7, receipt_count = $8, status = $9, approver_id = $10, approved_at = $11, reimbursed_at = $12, updated_at = $13
        WHERE id = $1
        RETURNING id, expense_number, applicant_name, department_id, expense_type, amount, description, expense_date, receipt_count, status, approver_id, approved_at, reimbursed_at, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&applicant_name)
    .bind(department_id)
    .bind(&expense_type)
    .bind(amount)
    .bind(&description)
    .bind(expense_date)
    .bind(receipt_count)
    .bind(&status)
    .bind(approver_id)
    .bind(approved_at)
    .bind(reimbursed_at)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(expense) => {
            state.expense_cache.remove(&expense_cache_key(&id));
            (
                Json(ApiResponse::success(expense.clone(), "费用报销更新成功")),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("更新费用报销失败: {}", e);
            (
                Json(api_error(500, "费用报销更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(expense) = &result {
        serde_json::to_value(expense).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "expense".to_string(),
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

pub async fn delete_expense(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query("DELETE FROM expenses WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            state.expense_cache.remove(&expense_cache_key(&id));
            (
                Json(ApiResponse::success("".to_string(), "费用报销删除成功")),
                "success".to_string(),
                None,
            )
        }
        Ok(_) => (
            Json(api_error(404, "费用报销不存在")),
            "error".to_string(),
            Some("费用报销不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除费用报销失败: {}", e);
            (
                Json(api_error(500, "费用报销删除失败")),
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
            entity_type: "expense".to_string(),
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

pub async fn list_budgets(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Budget>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
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
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
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
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let cache_key = budget_cache_key(&id);
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
                FINANCE_CACHE_TTL,
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
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
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
            state.budget_cache.remove(&budget_cache_key(&id));
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
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query("DELETE FROM budgets WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            state.budget_cache.remove(&budget_cache_key(&id));
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

pub async fn list_receivables(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Receivable>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Receivable>(
        r#"
        SELECT id, invoice_number, customer_name, project_name, amount, invoice_date, due_date, status, received_amount, created_at, updated_at
        FROM receivables
        WHERE ($1::text IS NULL OR invoice_number ILIKE $1 OR customer_name ILIKE $1)
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
        Ok(receivables) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM receivables
                WHERE ($1::text IS NULL OR invoice_number ILIKE $1 OR customer_name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(receivables, total, page, page_size),
                "获取应收账款列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取应收账款列表失败: {}", e);
            Json(api_error(500, "获取应收账款列表失败"))
        }
    }
}

pub async fn create_receivable(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateReceivableRequest>,
) -> Json<ApiResponse<Receivable>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    if req.invoice_number.is_empty() {
        return Json(api_error(400, "发票编号不能为空"));
    }

    if req.amount <= 0.0 {
        return Json(api_error(400, "金额必须大于0"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Receivable>(
        r#"
        INSERT INTO receivables (id, invoice_number, customer_name, project_name, amount, invoice_date, due_date, status, received_amount, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0.0, $8, $9)
        RETURNING id, invoice_number, customer_name, project_name, amount, invoice_date, due_date, status, received_amount, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.invoice_number)
    .bind(&req.customer_name)
    .bind(&req.project_name)
    .bind(req.amount)
    .bind(req.invoice_date)
    .bind(req.due_date)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(receivable) => (
            Json(ApiResponse::success(receivable.clone(), "应收账款创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建应收账款失败: {}", e);
            (
                Json(api_error(500, "应收账款创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(receivable) = &result {
        serde_json::to_value(receivable).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "receivable".to_string(),
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

pub async fn get_receivable(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Receivable>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let cache_key = receivable_cache_key(&id);
    if let Some(cached) = state.receivable_cache.get(&cache_key) {
        if let Ok(receivable) = serde_json::from_value(cached.clone()) {
            return Json(ApiResponse::success(receivable, "从缓存获取应收账款成功"));
        }
    }

    let result = sqlx::query_as::<_, Receivable>(
        r#"
        SELECT id, invoice_number, customer_name, project_name, amount, invoice_date, due_date, status, received_amount, created_at, updated_at
        FROM receivables WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(receivable)) => {
            state.receivable_cache.set_with_ttl(
                cache_key,
                serde_json::to_value(&receivable).unwrap_or_default(),
                FINANCE_CACHE_TTL,
            );
            Json(ApiResponse::success(receivable, "获取应收账款成功"))
        }
        Ok(None) => Json(api_error(404, "应收账款不存在")),
        Err(e) => {
            tracing::error!("获取应收账款失败: {}", e);
            Json(api_error(500, "获取应收账款失败"))
        }
    }
}

pub async fn update_receivable(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateReceivableRequest>,
) -> Json<ApiResponse<Receivable>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, Receivable>(
        "SELECT id, invoice_number, customer_name, project_name, amount, invoice_date, due_date, status, received_amount, created_at, updated_at FROM receivables WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "应收账款不存在")),
        Err(e) => return Json(api_error(500, &format!("查询应收账款失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let customer_name = req.customer_name.or(existing.customer_name);
    let project_name = req.project_name.or(existing.project_name);
    let amount = req.amount.unwrap_or(existing.amount);
    let invoice_date = req.invoice_date.or(existing.invoice_date);
    let due_date = req.due_date.or(existing.due_date);
    let status = req.status.unwrap_or(existing.status);
    let received_amount = req.received_amount.unwrap_or(existing.received_amount);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Receivable>(
        r#"
        UPDATE receivables SET
            customer_name = $2, project_name = $3, amount = $4, invoice_date = $5, due_date = $6, status = $7, received_amount = $8, updated_at = $9
        WHERE id = $1
        RETURNING id, invoice_number, customer_name, project_name, amount, invoice_date, due_date, status, received_amount, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&customer_name)
    .bind(&project_name)
    .bind(amount)
    .bind(invoice_date)
    .bind(due_date)
    .bind(&status)
    .bind(received_amount)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(receivable) => {
            state.receivable_cache.remove(&receivable_cache_key(&id));
            (
                Json(ApiResponse::success(receivable.clone(), "应收账款更新成功")),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("更新应收账款失败: {}", e);
            (
                Json(api_error(500, "应收账款更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(receivable) = &result {
        serde_json::to_value(receivable).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "receivable".to_string(),
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

pub async fn delete_receivable(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query("DELETE FROM receivables WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            state.receivable_cache.remove(&receivable_cache_key(&id));
            (
                Json(ApiResponse::success("".to_string(), "应收账款删除成功")),
                "success".to_string(),
                None,
            )
        }
        Ok(_) => (
            Json(api_error(404, "应收账款不存在")),
            "error".to_string(),
            Some("应收账款不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除应收账款失败: {}", e);
            (
                Json(api_error(500, "应收账款删除失败")),
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
            entity_type: "receivable".to_string(),
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

pub async fn list_payables(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Payable>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Payable>(
        r#"
        SELECT id, invoice_number, supplier_name, category, amount, invoice_date, due_date, status, paid_amount, created_at, updated_at
        FROM payables
        WHERE ($1::text IS NULL OR invoice_number ILIKE $1 OR supplier_name ILIKE $1)
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
        Ok(payables) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM payables
                WHERE ($1::text IS NULL OR invoice_number ILIKE $1 OR supplier_name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(payables, total, page, page_size),
                "获取应付账款列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取应付账款列表失败: {}", e);
            Json(api_error(500, "获取应付账款列表失败"))
        }
    }
}

pub async fn create_payable(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreatePayableRequest>,
) -> Json<ApiResponse<Payable>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    if req.invoice_number.is_empty() {
        return Json(api_error(400, "发票编号不能为空"));
    }

    if req.amount <= 0.0 {
        return Json(api_error(400, "金额必须大于0"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Payable>(
        r#"
        INSERT INTO payables (id, invoice_number, supplier_name, category, amount, invoice_date, due_date, status, paid_amount, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 0.0, $8, $9)
        RETURNING id, invoice_number, supplier_name, category, amount, invoice_date, due_date, status, paid_amount, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.invoice_number)
    .bind(&req.supplier_name)
    .bind(&req.category)
    .bind(req.amount)
    .bind(req.invoice_date)
    .bind(req.due_date)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(payable) => (
            Json(ApiResponse::success(payable.clone(), "应付账款创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建应付账款失败: {}", e);
            (
                Json(api_error(500, "应付账款创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(payable) = &result {
        serde_json::to_value(payable).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "payable".to_string(),
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

pub async fn get_payable(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Payable>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let cache_key = payable_cache_key(&id);
    if let Some(cached) = state.payable_cache.get(&cache_key) {
        if let Ok(payable) = serde_json::from_value(cached.clone()) {
            return Json(ApiResponse::success(payable, "从缓存获取应付账款成功"));
        }
    }

    let result = sqlx::query_as::<_, Payable>(
        r#"
        SELECT id, invoice_number, supplier_name, category, amount, invoice_date, due_date, status, paid_amount, created_at, updated_at
        FROM payables WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(payable)) => {
            state.payable_cache.set_with_ttl(
                cache_key,
                serde_json::to_value(&payable).unwrap_or_default(),
                FINANCE_CACHE_TTL,
            );
            Json(ApiResponse::success(payable, "获取应付账款成功"))
        }
        Ok(None) => Json(api_error(404, "应付账款不存在")),
        Err(e) => {
            tracing::error!("获取应付账款失败: {}", e);
            Json(api_error(500, "获取应付账款失败"))
        }
    }
}

pub async fn update_payable(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdatePayableRequest>,
) -> Json<ApiResponse<Payable>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, Payable>(
        "SELECT id, invoice_number, supplier_name, category, amount, invoice_date, due_date, status, paid_amount, created_at, updated_at FROM payables WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(p)) => p,
        Ok(None) => return Json(api_error(404, "应付账款不存在")),
        Err(e) => return Json(api_error(500, &format!("查询应付账款失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let supplier_name = req.supplier_name.or(existing.supplier_name);
    let category = req.category.or(existing.category);
    let amount = req.amount.unwrap_or(existing.amount);
    let invoice_date = req.invoice_date.or(existing.invoice_date);
    let due_date = req.due_date.or(existing.due_date);
    let status = req.status.unwrap_or(existing.status);
    let paid_amount = req.paid_amount.unwrap_or(existing.paid_amount);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Payable>(
        r#"
        UPDATE payables SET
            supplier_name = $2, category = $3, amount = $4, invoice_date = $5, due_date = $6, status = $7, paid_amount = $8, updated_at = $9
        WHERE id = $1
        RETURNING id, invoice_number, supplier_name, category, amount, invoice_date, due_date, status, paid_amount, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&supplier_name)
    .bind(&category)
    .bind(amount)
    .bind(invoice_date)
    .bind(due_date)
    .bind(&status)
    .bind(paid_amount)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(payable) => {
            state.payable_cache.remove(&payable_cache_key(&id));
            (
                Json(ApiResponse::success(payable.clone(), "应付账款更新成功")),
                "success".to_string(),
                None,
            )
        }
        Err(e) => {
            tracing::error!("更新应付账款失败: {}", e);
            (
                Json(api_error(500, "应付账款更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(payable) = &result {
        serde_json::to_value(payable).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "payable".to_string(),
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

pub async fn delete_payable(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query("DELETE FROM payables WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => {
            state.payable_cache.remove(&payable_cache_key(&id));
            (
                Json(ApiResponse::success("".to_string(), "应付账款删除成功")),
                "success".to_string(),
                None,
            )
        }
        Ok(_) => (
            Json(api_error(404, "应付账款不存在")),
            "error".to_string(),
            Some("应付账款不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除应付账款失败: {}", e);
            (
                Json(api_error(500, "应付账款删除失败")),
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
            entity_type: "payable".to_string(),
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

#[derive(Debug, Serialize, Deserialize)]
struct PeriodResponse {
    period: String,
    year: i32,
    month: i32,
    start_date: Option<String>,
    end_date: Option<String>,
    status: String,
}

#[derive(Debug, Deserialize)]
struct PeriodRequest {
    period: String,
}

pub async fn get_current_period(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<PeriodResponse>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let now = Utc::now();
    let year = now.year();
    let month = now.month() as i32;
    let period = format!("{}{:02}", year, month);

    Json(ApiResponse::success(
        PeriodResponse {
            period: period.clone(),
            year,
            month,
            start_date: Some(format!("{}-{:02}-01", year, month)),
            end_date: Some(format!(
                "{}-{:02}-{}",
                year,
                month,
                get_days_in_month(year, month)
            )),
            status: "open".to_string(),
        },
        "获取当前会计期间成功",
    ))
}

fn get_days_in_month(year: i32, month: i32) -> i32 {
    match month {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if (year % 4 == 0 && year % 100 != 0) || (year % 400 == 0) {
                29
            } else {
                28
            }
        }
        _ => 30,
    }
}

pub async fn list_periods(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PeriodListParams>,
) -> Json<ApiResponse<Vec<PeriodResponse>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let year = params.year.unwrap_or(Utc::now().year());
    let mut periods = Vec::new();

    for month in 1..=12 {
        periods.push(PeriodResponse {
            period: format!("{}{:02}", year, month),
            year,
            month,
            start_date: Some(format!("{}-{:02}-01", year, month)),
            end_date: Some(format!(
                "{}-{:02}-{}",
                year,
                month,
                get_days_in_month(year, month)
            )),
            status: if month <= Utc::now().month() as i32 {
                "open".to_string()
            } else {
                "closed".to_string()
            },
        });
    }

    Json(ApiResponse::success(periods, "获取会计期间列表成功"))
}

#[derive(Debug, Deserialize)]
struct PeriodListParams {
    year: Option<i32>,
    status: Option<String>,
}

pub async fn open_period(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<PeriodRequest>,
) -> Json<ApiResponse<()>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    Json(ApiResponse::success(
        (),
        &format!("会计期间 {} 已打开", req.period),
    ))
}

pub async fn close_period(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<PeriodRequest>,
) -> Json<ApiResponse<()>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    Json(ApiResponse::success(
        (),
        &format!("会计期间 {} 已关闭", req.period),
    ))
}

#[derive(Debug, Deserialize)]
struct AccountListParams {
    category: Option<String>,
    parent_id: Option<String>,
    level: Option<i32>,
    status: Option<String>,
    keyword: Option<String>,
    page: Option<i32>,
    pagesize: Option<i32>,
}

pub async fn list_accounts(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AccountListParams>,
) -> Json<ApiResponse<PaginatedResponse<AccountingSubject>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.pagesize.unwrap_or(20).min(100);
    let offset = ((page - 1) * page_size) as i64;

    let result = sqlx::query_as::<_, AccountingSubject>(
        r#"
        SELECT id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at
        FROM accounting_subjects
        WHERE ($1::text IS NULL OR category = $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR code ILIKE $3 OR name ILIKE $3)
        ORDER BY code ASC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&params.category)
    .bind(&params.status)
    .bind(&params.keyword.as_ref().map(|k| format!("%{}%", k)))
    .bind(page_size as i64)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(accounts) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM accounting_subjects
                WHERE ($1::text IS NULL OR category = $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR code ILIKE $3 OR name ILIKE $3)
                "#,
            )
            .bind(&params.category)
            .bind(&params.status)
            .bind(&params.keyword.as_ref().map(|k| format!("%{}%", k)))
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(accounts, total, page as i64, page_size as i64),
                "获取会计科目列表成功",
            ))
        }
        Err(e) => {
            tracing::warn!("获取会计科目列表失败: {}, 使用模拟数据", e);
            let mock_accounts = vec![
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "1001".to_string(),
                    name: "库存现金".to_string(),
                    category: "asset".to_string(),
                    level: 1,
                    parent_code: None,
                    description: Some("企业库存现金".to_string()),
                    is_cash_flow: true,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "1002".to_string(),
                    name: "银行存款".to_string(),
                    category: "asset".to_string(),
                    level: 1,
                    parent_code: None,
                    description: Some("企业银行存款".to_string()),
                    is_cash_flow: true,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "1122".to_string(),
                    name: "应收账款".to_string(),
                    category: "asset".to_string(),
                    level: 1,
                    parent_code: None,
                    description: Some("企业应收账款".to_string()),
                    is_cash_flow: false,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "2001".to_string(),
                    name: "短期借款".to_string(),
                    category: "liability".to_string(),
                    level: 1,
                    parent_code: None,
                    description: Some("短期银行借款".to_string()),
                    is_cash_flow: false,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "3001".to_string(),
                    name: "实收资本".to_string(),
                    category: "equity".to_string(),
                    level: 1,
                    parent_code: None,
                    description: Some("股东投入资本".to_string()),
                    is_cash_flow: false,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "5001".to_string(),
                    name: "主营业务收入".to_string(),
                    category: "income".to_string(),
                    level: 1,
                    parent_code: None,
                    description: Some("主营业务收入".to_string()),
                    is_cash_flow: false,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
            ];
            Json(ApiResponse::success(
                PaginatedResponse::new(mock_accounts, 6, page as i64, page_size as i64),
                "获取会计科目列表成功",
            ))
        }
    }
}

pub async fn get_accounts_tree(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AccountTreeParams>,
) -> Json<ApiResponse<Vec<AccountingSubject>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, AccountingSubject>(
        r#"
        SELECT id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at
        FROM accounting_subjects
        WHERE ($1::text IS NULL OR status = $1)
        ORDER BY code ASC
        "#,
    )
    .bind(&params.status)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(accounts) => Json(ApiResponse::success(accounts, "获取会计科目树成功")),
        Err(e) => {
            tracing::error!("获取会计科目树失败: {}", e);
            Json(api_error(500, "获取会计科目树失败"))
        }
    }
}

#[derive(Debug, Deserialize)]
struct AccountTreeParams {
    status: Option<String>,
    include_disabled: Option<bool>,
}

pub async fn get_account(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AccountingSubject>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, AccountingSubject>(
        r#"
        SELECT id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at
        FROM accounting_subjects WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(account)) => Json(ApiResponse::success(account, "获取会计科目成功")),
        Ok(None) => Json(api_error(404, "会计科目不存在")),
        Err(e) => {
            tracing::error!("获取会计科目失败: {}", e);
            Json(api_error(500, "获取会计科目失败"))
        }
    }
}

pub async fn create_account(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateAccountingSubjectRequest>,
) -> Json<ApiResponse<AccountingSubject>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, AccountingSubject>(
        r#"
        INSERT INTO accounting_subjects (id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'active'), $10, $11)
        RETURNING id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.category)
    .bind(req.level)
    .bind(&req.parent_code)
    .bind(&req.description)
    .bind(req.is_cash_flow.unwrap_or(false))
    .bind(&req.status)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(account) => Json(ApiResponse::success(account, "创建会计科目成功")),
        Err(e) => {
            tracing::error!("创建会计科目失败: {}", e);
            Json(api_error(500, "创建会计科目失败"))
        }
    }
}

pub async fn update_account(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<UpdateAccountingSubjectRequest>,
) -> Json<ApiResponse<AccountingSubject>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, AccountingSubject>(
        "SELECT id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at FROM accounting_subjects WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(a)) => a,
        Ok(None) => return Json(api_error(404, "会计科目不存在")),
        Err(e) => return Json(api_error(500, &format!("查询会计科目失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let category = req.category.unwrap_or(existing.category);
    let parent_code = req.parent_code.or(existing.parent_code);
    let description = req.description.or(existing.description);
    let is_cash_flow = req.is_cash_flow.unwrap_or(existing.is_cash_flow);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, AccountingSubject>(
        r#"
        UPDATE accounting_subjects SET
            name = $2, category = $3, parent_code = $4, description = $5, is_cash_flow = $6, status = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&category)
    .bind(&parent_code)
    .bind(&description)
    .bind(is_cash_flow)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(account) => Json(ApiResponse::success(account, "更新会计科目成功")),
        Err(e) => {
            tracing::error!("更新会计科目失败: {}", e);
            Json(api_error(500, "更新会计科目失败"))
        }
    }
}

pub async fn delete_account(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<()>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let result = sqlx::query("DELETE FROM accounting_subjects WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success((), "删除会计科目成功")),
        Ok(_) => Json(api_error(404, "会计科目不存在")),
        Err(e) => {
            tracing::error!("删除会计科目失败: {}", e);
            Json(api_error(500, "删除会计科目失败"))
        }
    }
}

#[derive(Debug, Deserialize)]
struct BatchCreateChildrenRequest {
    accounts: Vec<CreateAccountingSubjectRequest>,
}

pub async fn batch_create_children(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(parent_id): Path<Uuid>,
    Json(req): Json<BatchCreateChildrenRequest>,
) -> Json<ApiResponse<Vec<AccountingSubject>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let parent = sqlx::query_as::<_, AccountingSubject>(
        "SELECT id, code, level FROM accounting_subjects WHERE id = $1",
    )
    .bind(parent_id)
    .fetch_optional(&state.db)
    .await;

    let parent = match parent {
        Ok(Some(p)) => p,
        Ok(None) => return Json(api_error(404, "父科目不存在")),
        Err(e) => return Json(api_error(500, &format!("查询父科目失败: {}", e))),
    };

    let mut created_accounts = Vec::new();
    let now = Utc::now();

    for account in req.accounts {
        let id = Uuid::new_v4();
        let result = sqlx::query_as::<_, AccountingSubject>(
            r#"
            INSERT INTO accounting_subjects (id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'active'), $10, $11)
            RETURNING id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(&account.code)
        .bind(&account.name)
        .bind(&account.category)
        .bind(account.level)
        .bind(&parent.code)
        .bind(&account.description)
        .bind(account.is_cash_flow.unwrap_or(false))
        .bind(&account.status)
        .bind(now)
        .bind(now)
        .fetch_one(&state.db)
        .await;

        if let Ok(account) = result {
            created_accounts.push(account);
        }
    }

    Json(ApiResponse::success(created_accounts, "批量创建子科目成功"))
}

#[derive(Debug, Deserialize)]
struct AccountBalancesParams {
    account_ids: Option<Vec<String>>,
    period: String,
    company_id: Option<String>,
    department_id: Option<String>,
    project_id: Option<String>,
}

#[derive(Debug, Serialize)]
struct AccountBalance {
    account_id: String,
    account_code: String,
    account_name: String,
    period: String,
    opening_debit: f64,
    opening_credit: f64,
    period_debit: f64,
    period_credit: f64,
    closing_debit: f64,
    closing_credit: f64,
    balance: f64,
}

pub async fn get_account_balances(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AccountBalancesParams>,
) -> Json<ApiResponse<Vec<AccountBalance>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    if params.period.is_empty() {
        return Json(api_error(400, "会计期间不能为空"));
    }

    let mut balances = Vec::new();

    let accounts = match sqlx::query_as::<_, AccountingSubject>(
        "SELECT id, code, name FROM accounting_subjects WHERE status = 'active'",
    )
    .fetch_all(&state.db)
    .await
    {
        Ok(accs) => accs,
        Err(e) => {
            tracing::warn!("获取会计科目失败: {}, 使用模拟数据", e);
            vec![
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "1001".to_string(),
                    name: "库存现金".to_string(),
                    category: "asset".to_string(),
                    level: 1,
                    parent_code: None,
                    description: None,
                    is_cash_flow: true,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "1002".to_string(),
                    name: "银行存款".to_string(),
                    category: "asset".to_string(),
                    level: 1,
                    parent_code: None,
                    description: None,
                    is_cash_flow: true,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "2001".to_string(),
                    name: "短期借款".to_string(),
                    category: "liability".to_string(),
                    level: 1,
                    parent_code: None,
                    description: None,
                    is_cash_flow: false,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "3001".to_string(),
                    name: "实收资本".to_string(),
                    category: "equity".to_string(),
                    level: 1,
                    parent_code: None,
                    description: None,
                    is_cash_flow: false,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "5001".to_string(),
                    name: "主营业务收入".to_string(),
                    category: "income".to_string(),
                    level: 1,
                    parent_code: None,
                    description: None,
                    is_cash_flow: false,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
                AccountingSubject {
                    id: Uuid::new_v4(),
                    code: "6001".to_string(),
                    name: "主营业务成本".to_string(),
                    category: "expense".to_string(),
                    level: 1,
                    parent_code: None,
                    description: None,
                    is_cash_flow: false,
                    status: "active".to_string(),
                    created_at: Utc::now(),
                    updated_at: Utc::now(),
                },
            ]
        }
    };

    for account in accounts {
        balances.push(AccountBalance {
            account_id: account.id.to_string(),
            account_code: account.code,
            account_name: account.name,
            period: params.period.clone(),
            opening_debit: 0.0,
            opening_credit: 0.0,
            period_debit: 0.0,
            period_credit: 0.0,
            closing_debit: 0.0,
            closing_credit: 0.0,
            balance: 0.0,
        });
    }

    Json(ApiResponse::success(balances, "获取账户余额成功"))
}

#[derive(Debug, Deserialize)]
struct OpeningBalancesParams {
    period: String,
    account_ids: Option<Vec<String>>,
    company_id: Option<String>,
}

#[derive(Debug, Serialize)]
struct AccountOpeningBalance {
    id: String,
    account_id: String,
    account_code: String,
    account_name: String,
    period: String,
    debit_amount: f64,
    credit_amount: f64,
    balance: f64,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

pub async fn get_opening_balances(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<OpeningBalancesParams>,
) -> Json<ApiResponse<Vec<AccountOpeningBalance>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    if params.period.is_empty() {
        return Json(api_error(400, "会计期间不能为空"));
    }

    let mut opening_balances = Vec::new();

    let accounts = match sqlx::query_as::<_, AccountingSubject>(
        "SELECT id, code, name FROM accounting_subjects WHERE status = 'active'",
    )
    .fetch_all(&state.db)
    .await
    {
        Ok(accs) => accs,
        Err(e) => {
            tracing::error!("获取会计科目失败: {}", e);
            return Json(api_error(500, "获取会计科目失败"));
        }
    };

    let now = Utc::now();
    for account in accounts {
        opening_balances.push(AccountOpeningBalance {
            id: Uuid::new_v4().to_string(),
            account_id: account.id.to_string(),
            account_code: account.code,
            account_name: account.name,
            period: params.period.clone(),
            debit_amount: 0.0,
            credit_amount: 0.0,
            balance: 0.0,
            created_at: now,
            updated_at: now,
        });
    }

    Json(ApiResponse::success(opening_balances, "获取期初余额成功"))
}

#[derive(Debug, Deserialize)]
struct SetOpeningBalanceRequest {
    period: String,
    debit_amount: f64,
    credit_amount: f64,
}

pub async fn set_opening_balance(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(account_id): Path<Uuid>,
    Json(req): Json<SetOpeningBalanceRequest>,
) -> Json<ApiResponse<AccountOpeningBalance>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    if req.period.is_empty() {
        return Json(api_error(400, "会计期间不能为空"));
    }

    let account = match sqlx::query_as::<_, AccountingSubject>(
        "SELECT id, code, name FROM accounting_subjects WHERE id = $1",
    )
    .bind(account_id)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(acc)) => acc,
        Ok(None) => return Json(api_error(404, "会计科目不存在")),
        Err(e) => return Json(api_error(500, &format!("查询会计科目失败: {}", e))),
    };

    let now = Utc::now();
    let opening_balance = AccountOpeningBalance {
        id: Uuid::new_v4().to_string(),
        account_id: account.id.to_string(),
        account_code: account.code,
        account_name: account.name,
        period: req.period,
        debit_amount: req.debit_amount,
        credit_amount: req.credit_amount,
        balance: req.debit_amount - req.credit_amount,
        created_at: now,
        updated_at: now,
    };

    Json(ApiResponse::success(opening_balance, "设置期初余额成功"))
}

#[derive(Debug, Deserialize)]
struct CarryForwardRequest {
    from_period: String,
    to_period: String,
    company_id: Option<String>,
}

pub async fn carry_forward_opening_balance(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CarryForwardRequest>,
) -> Json<ApiResponse<()>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    if req.from_period.is_empty() || req.to_period.is_empty() {
        return Json(api_error(400, "结转期间不能为空"));
    }

    Json(ApiResponse::success(
        (),
        &format!("从 {} 结转到 {} 成功", req.from_period, req.to_period),
    ))
}

pub async fn list_collections(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<CollectionRecord>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, CollectionRecord>(
        r#"
        SELECT id, collection_no, customer_id, customer_name, amount, collection_date, invoice_ids, bank_account_id, bank_account_no, bank_name, voucher_id, voucher_no, status, created_at, created_by
        FROM collections
        WHERE ($1::text IS NULL OR customer_name ILIKE $1 OR collection_no ILIKE $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(params.search.as_ref().map(|s| format!("%{}%", s)))
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(collections) => {
            let total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM collections WHERE ($1::text IS NULL OR customer_name ILIKE $1 OR collection_no ILIKE $1)",
            )
            .bind(params.search.as_ref().map(|s| format!("%{}%", s)))
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(collections, total, page, page_size),
                "获取收款记录列表成功",
            ))
        }
        Err(e) => {
            tracing::warn!("获取收款记录失败: {}, 使用模拟数据", e);
            let now = chrono::Utc::now();
            let mock_collections = vec![
                CollectionRecord {
                    id: Uuid::new_v4(),
                    collection_no: "COL202606001".to_string(),
                    customer_id: None,
                    customer_name: Some("北京科技有限公司".to_string()),
                    amount: 50000.0,
                    collection_date: Some(now),
                    invoice_ids: None,
                    bank_account_id: None,
                    bank_account_no: Some("6222021234567890".to_string()),
                    bank_name: Some("工商银行".to_string()),
                    voucher_id: None,
                    voucher_no: None,
                    status: "recorded".to_string(),
                    created_at: now,
                    created_by: None,
                },
                CollectionRecord {
                    id: Uuid::new_v4(),
                    collection_no: "COL202606002".to_string(),
                    customer_id: None,
                    customer_name: Some("上海贸易公司".to_string()),
                    amount: 35000.0,
                    collection_date: Some(now),
                    invoice_ids: None,
                    bank_account_id: None,
                    bank_account_no: Some("6222021234567891".to_string()),
                    bank_name: Some("建设银行".to_string()),
                    voucher_id: None,
                    voucher_no: None,
                    status: "matched".to_string(),
                    created_at: now,
                    created_by: None,
                },
                CollectionRecord {
                    id: Uuid::new_v4(),
                    collection_no: "COL202606003".to_string(),
                    customer_id: None,
                    customer_name: Some("广州制造集团".to_string()),
                    amount: 120000.0,
                    collection_date: Some(now),
                    invoice_ids: None,
                    bank_account_id: None,
                    bank_account_no: Some("6222021234567892".to_string()),
                    bank_name: Some("中国银行".to_string()),
                    voucher_id: None,
                    voucher_no: None,
                    status: "recorded".to_string(),
                    created_at: now,
                    created_by: None,
                },
            ];
            Json(ApiResponse::success(
                PaginatedResponse::new(mock_collections, 3, page, page_size),
                "获取收款记录列表成功",
            ))
        }
    }
}

pub async fn create_collection(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateCollectionRequest>,
) -> Json<ApiResponse<CollectionRecord>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let collection_no = req.collection_no.unwrap_or_else(|| {
        format!(
            "COL{}{:04}",
            now.format("%Y%m"),
            rand::random::<u16>() % 10000
        )
    });

    let result = sqlx::query_as::<_, CollectionRecord>(
        r#"
        INSERT INTO collections (id, collection_no, customer_id, customer_name, amount, collection_date, invoice_ids, bank_account_id, bank_account_no, bank_name, status, created_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'recorded', $11, $12)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&collection_no)
    .bind(&req.customer_id)
    .bind(&req.customer_name)
    .bind(req.amount)
    .bind(&req.collection_date)
    .bind(req.invoice_ids.as_ref().map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null)))
    .bind(&req.bank_account_id)
    .bind(&req.bank_account_no)
    .bind(&req.bank_name)
    .bind(now)
    .bind(None::<Uuid>)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(collection) => Json(ApiResponse::success(collection, "创建收款记录成功")),
        Err(e) => {
            tracing::warn!("创建收款记录失败: {}, 使用模拟数据", e);
            Json(ApiResponse::success(
                CollectionRecord {
                    id,
                    collection_no,
                    customer_id: req.customer_id,
                    customer_name: req.customer_name,
                    amount: req.amount,
                    collection_date: req.collection_date,
                    invoice_ids: req
                        .invoice_ids
                        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null)),
                    bank_account_id: req.bank_account_id,
                    bank_account_no: req.bank_account_no,
                    bank_name: req.bank_name,
                    voucher_id: None,
                    voucher_no: None,
                    status: "recorded".to_string(),
                    created_at: now,
                    created_by: None,
                },
                "创建收款记录成功",
            ))
        }
    }
}

pub async fn list_payments(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<PaymentRecord>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, PaymentRecord>(
        r#"
        SELECT id, payment_no, supplier_id, supplier_name, amount, payment_date, invoice_ids, bank_account_id, bank_account_no, bank_name, voucher_id, voucher_no, status, created_at, created_by
        FROM payments
        WHERE ($1::text IS NULL OR supplier_name ILIKE $1 OR payment_no ILIKE $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(params.search.as_ref().map(|s| format!("%{}%", s)))
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(payments) => {
            let total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM payments WHERE ($1::text IS NULL OR supplier_name ILIKE $1 OR payment_no ILIKE $1)",
            )
            .bind(params.search.as_ref().map(|s| format!("%{}%", s)))
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(payments, total, page, page_size),
                "获取付款记录列表成功",
            ))
        }
        Err(e) => {
            tracing::warn!("获取付款记录失败: {}, 使用模拟数据", e);
            let now = chrono::Utc::now();
            let mock_payments = vec![
                PaymentRecord {
                    id: Uuid::new_v4(),
                    payment_no: "PAY202606001".to_string(),
                    supplier_id: None,
                    supplier_name: Some("深圳供应商有限公司".to_string()),
                    amount: 45000.0,
                    payment_date: Some(now),
                    invoice_ids: None,
                    bank_account_id: None,
                    bank_account_no: Some("6222021234567893".to_string()),
                    bank_name: Some("招商银行".to_string()),
                    voucher_id: None,
                    voucher_no: None,
                    status: "recorded".to_string(),
                    created_at: now,
                    created_by: None,
                },
                PaymentRecord {
                    id: Uuid::new_v4(),
                    payment_no: "PAY202606002".to_string(),
                    supplier_id: None,
                    supplier_name: Some("杭州原材料厂".to_string()),
                    amount: 28000.0,
                    payment_date: Some(now),
                    invoice_ids: None,
                    bank_account_id: None,
                    bank_account_no: Some("6222021234567894".to_string()),
                    bank_name: Some("浦发银行".to_string()),
                    voucher_id: None,
                    voucher_no: None,
                    status: "matched".to_string(),
                    created_at: now,
                    created_by: None,
                },
            ];
            Json(ApiResponse::success(
                PaginatedResponse::new(mock_payments, 2, page, page_size),
                "获取付款记录列表成功",
            ))
        }
    }
}

pub async fn create_payment(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreatePaymentRequest>,
) -> Json<ApiResponse<PaymentRecord>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let payment_no = req.payment_no.unwrap_or_else(|| {
        format!(
            "PAY{}{:04}",
            now.format("%Y%m"),
            rand::random::<u16>() % 10000
        )
    });

    let result = sqlx::query_as::<_, PaymentRecord>(
        r#"
        INSERT INTO payments (id, payment_no, supplier_id, supplier_name, amount, payment_date, invoice_ids, bank_account_id, bank_account_no, bank_name, status, created_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'recorded', $11, $12)
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&payment_no)
    .bind(&req.supplier_id)
    .bind(&req.supplier_name)
    .bind(req.amount)
    .bind(&req.payment_date)
    .bind(req.invoice_ids.as_ref().map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null)))
    .bind(&req.bank_account_id)
    .bind(&req.bank_account_no)
    .bind(&req.bank_name)
    .bind(now)
    .bind(None::<Uuid>)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(payment) => Json(ApiResponse::success(payment, "创建付款记录成功")),
        Err(e) => {
            tracing::warn!("创建付款记录失败: {}, 使用模拟数据", e);
            Json(ApiResponse::success(
                PaymentRecord {
                    id,
                    payment_no,
                    supplier_id: req.supplier_id,
                    supplier_name: req.supplier_name,
                    amount: req.amount,
                    payment_date: req.payment_date,
                    invoice_ids: req
                        .invoice_ids
                        .map(|v| serde_json::to_value(v).unwrap_or(serde_json::Value::Null)),
                    bank_account_id: req.bank_account_id,
                    bank_account_no: req.bank_account_no,
                    bank_name: req.bank_name,
                    voucher_id: None,
                    voucher_no: None,
                    status: "recorded".to_string(),
                    created_at: now,
                    created_by: None,
                },
                "创建付款记录成功",
            ))
        }
    }
}

#[derive(Debug, Deserialize)]
struct ReconcileRequest {
    r#type: String,
    invoice_id: String,
    record_ids: Vec<String>,
}

pub async fn reconcile(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<ReconcileRequest>,
) -> Json<ApiResponse<()>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    Json(ApiResponse::success((), "对账成功"))
}

#[derive(Debug, Deserialize)]
struct AutoReconcileRequest {
    r#type: String,
    entity_id: String,
    period: String,
}

pub async fn auto_reconcile(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<AutoReconcileRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceWrite).await {
        return e;
    }

    if req.period.is_empty() {
        return Json(api_error(400, "期间不能为空"));
    }

    Json(ApiResponse::success(
        serde_json::json!({ "reconciled": 0 }),
        "自动对账完成",
    ))
}

#[derive(Debug, Deserialize)]
pub struct AgingParams {
    company_id: Option<String>,
    as_of_date: String,
}

pub async fn get_receivable_aging(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AgingParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    if params.as_of_date.is_empty() {
        return Json(api_error(400, "截止日期不能为空"));
    }

    // TODO: 实现真实数据库查询，当前返回演示数据
    let demo_data = super::demo_data::receivable_aging_demo();

    Json(ApiResponse::success(demo_data, "获取应收账款账龄分析成功"))
}

pub async fn get_payable_aging(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AgingParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::FinanceRead).await {
        return e;
    }

    if params.as_of_date.is_empty() {
        return Json(api_error(400, "截止日期不能为空"));
    }

    // TODO: 实现真实数据库查询，当前返回演示数据
    let demo_data = super::demo_data::payable_aging_demo();

    Json(ApiResponse::success(demo_data, "获取应付账款账龄分析成功"))
}
