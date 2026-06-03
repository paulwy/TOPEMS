use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{
    Expense, CreateExpenseRequest, UpdateExpenseRequest,
    Budget, CreateBudgetRequest, UpdateBudgetRequest,
    Receivable, CreateReceivableRequest, UpdateReceivableRequest,
    Payable, CreatePayableRequest, UpdatePayableRequest,
};
use topems_shared::{api_error, ApiResponse, PaginatedResponse};
use crate::api::audit::log_audit_event;
use super::ApiState;

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/api/v1/expenses", get(list_expenses).post(create_expense))
        .route("/api/v1/expenses/:id", get(get_expense).put(update_expense).delete(delete_expense))
        .route("/api/v1/budgets", get(list_budgets).post(create_budget))
        .route("/api/v1/budgets/:id", get(get_budget).put(update_budget).delete(delete_budget))
        .route("/api/v1/receivables", get(list_receivables).post(create_receivable))
        .route("/api/v1/receivables/:id", get(get_receivable).put(update_receivable).delete(delete_receivable))
        .route("/api/v1/payables", get(list_payables).post(create_payable))
        .route("/api/v1/payables/:id", get(get_payable).put(update_payable).delete(delete_payable))
}

async fn list_expenses(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Expense>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Expense>(
        r#"
        SELECT id, expense_number, applicant_name, department_id, expense_type, amount, description, expense_date, receipt_count, status, approver_id, approved_at, reimbursed_at, created_at, updated_at
        FROM erp.expenses
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
                SELECT COUNT(*) FROM erp.expenses
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

async fn create_expense(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateExpenseRequest>,
) -> Json<ApiResponse<Expense>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Expense>(
        r#"
        INSERT INTO erp.expenses (id, expense_number, applicant_name, department_id, expense_type, amount, description, expense_date, receipt_count, status, created_at, updated_at)
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
        "create".to_string(),
        "expense".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_expense(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Expense>> {
    let result = sqlx::query_as::<_, Expense>(
        r#"
        SELECT id, expense_number, applicant_name, department_id, expense_type, amount, description, expense_date, receipt_count, status, approver_id, approved_at, reimbursed_at, created_at, updated_at
        FROM erp.expenses WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(expense)) => Json(ApiResponse::success(expense, "获取费用报销成功")),
        Ok(None) => Json(api_error(404, "费用报销不存在")),
        Err(e) => {
            tracing::error!("获取费用报销失败: {}", e);
            Json(api_error(500, "获取费用报销失败"))
        }
    }
}

async fn update_expense(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateExpenseRequest>,
) -> Json<ApiResponse<Expense>> {
    let existing = sqlx::query_as::<_, Expense>(
        "SELECT id, expense_number, applicant_name, department_id, expense_type, amount, description, expense_date, receipt_count, status, approver_id, approved_at, reimbursed_at, created_at, updated_at FROM erp.expenses WHERE id = $1",
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
        UPDATE erp.expenses SET
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
        Ok(expense) => (
            Json(ApiResponse::success(expense.clone(), "费用报销更新成功")),
            "success".to_string(),
            None,
        ),
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
        "update".to_string(),
        "expense".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn delete_expense(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM erp.expenses WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "费用报销删除成功")),
            "success".to_string(),
            None,
        ),
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
        "delete".to_string(),
        "expense".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn list_budgets(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Budget>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Budget>(
        r#"
        SELECT id, department_id, budget_type, fiscal_year, total_budget, used_amount, remaining_amount, usage_rate, status, created_at, updated_at
        FROM erp.budgets
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
                SELECT COUNT(*) FROM erp.budgets
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

async fn create_budget(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateBudgetRequest>,
) -> Json<ApiResponse<Budget>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let used_amount = 0.0;
    let remaining_amount = req.total_budget;
    let usage_rate = 0.0;

    let result = sqlx::query_as::<_, Budget>(
        r#"
        INSERT INTO erp.budgets (id, department_id, budget_type, fiscal_year, total_budget, used_amount, remaining_amount, usage_rate, status, created_at, updated_at)
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
        "create".to_string(),
        "budget".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_budget(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Budget>> {
    let result = sqlx::query_as::<_, Budget>(
        r#"
        SELECT id, department_id, budget_type, fiscal_year, total_budget, used_amount, remaining_amount, usage_rate, status, created_at, updated_at
        FROM erp.budgets WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(budget)) => Json(ApiResponse::success(budget, "获取预算成功")),
        Ok(None) => Json(api_error(404, "预算不存在")),
        Err(e) => {
            tracing::error!("获取预算失败: {}", e);
            Json(api_error(500, "获取预算失败"))
        }
    }
}

async fn update_budget(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateBudgetRequest>,
) -> Json<ApiResponse<Budget>> {
    let existing = sqlx::query_as::<_, Budget>(
        "SELECT id, department_id, budget_type, fiscal_year, total_budget, used_amount, remaining_amount, usage_rate, status, created_at, updated_at FROM erp.budgets WHERE id = $1",
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
    let usage_rate = if total_budget > 0.0 { (used_amount / total_budget) * 100.0 } else { 0.0 };
    let now = Utc::now();

    let result = sqlx::query_as::<_, Budget>(
        r#"
        UPDATE erp.budgets SET
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
        Ok(budget) => (
            Json(ApiResponse::success(budget.clone(), "预算更新成功")),
            "success".to_string(),
            None,
        ),
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
        "update".to_string(),
        "budget".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn delete_budget(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM erp.budgets WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "预算删除成功")),
            "success".to_string(),
            None,
        ),
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
        "delete".to_string(),
        "budget".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn list_receivables(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Receivable>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Receivable>(
        r#"
        SELECT id, invoice_number, customer_name, project_name, amount, invoice_date, due_date, status, received_amount, created_at, updated_at
        FROM erp.receivables
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
                SELECT COUNT(*) FROM erp.receivables
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

async fn create_receivable(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateReceivableRequest>,
) -> Json<ApiResponse<Receivable>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Receivable>(
        r#"
        INSERT INTO erp.receivables (id, invoice_number, customer_name, project_name, amount, invoice_date, due_date, status, received_amount, created_at, updated_at)
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
        "create".to_string(),
        "receivable".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_receivable(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Receivable>> {
    let result = sqlx::query_as::<_, Receivable>(
        r#"
        SELECT id, invoice_number, customer_name, project_name, amount, invoice_date, due_date, status, received_amount, created_at, updated_at
        FROM erp.receivables WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(receivable)) => Json(ApiResponse::success(receivable, "获取应收账款成功")),
        Ok(None) => Json(api_error(404, "应收账款不存在")),
        Err(e) => {
            tracing::error!("获取应收账款失败: {}", e);
            Json(api_error(500, "获取应收账款失败"))
        }
    }
}

async fn update_receivable(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateReceivableRequest>,
) -> Json<ApiResponse<Receivable>> {
    let existing = sqlx::query_as::<_, Receivable>(
        "SELECT id, invoice_number, customer_name, project_name, amount, invoice_date, due_date, status, received_amount, created_at, updated_at FROM erp.receivables WHERE id = $1",
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
        UPDATE erp.receivables SET
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
        Ok(receivable) => (
            Json(ApiResponse::success(receivable.clone(), "应收账款更新成功")),
            "success".to_string(),
            None,
        ),
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
        "update".to_string(),
        "receivable".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn delete_receivable(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM erp.receivables WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "应收账款删除成功")),
            "success".to_string(),
            None,
        ),
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
        "delete".to_string(),
        "receivable".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn list_payables(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Payable>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Payable>(
        r#"
        SELECT id, invoice_number, supplier_name, category, amount, invoice_date, due_date, status, paid_amount, created_at, updated_at
        FROM erp.payables
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
                SELECT COUNT(*) FROM erp.payables
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

async fn create_payable(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreatePayableRequest>,
) -> Json<ApiResponse<Payable>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Payable>(
        r#"
        INSERT INTO erp.payables (id, invoice_number, supplier_name, category, amount, invoice_date, due_date, status, paid_amount, created_at, updated_at)
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
        "create".to_string(),
        "payable".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_payable(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Payable>> {
    let result = sqlx::query_as::<_, Payable>(
        r#"
        SELECT id, invoice_number, supplier_name, category, amount, invoice_date, due_date, status, paid_amount, created_at, updated_at
        FROM erp.payables WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(payable)) => Json(ApiResponse::success(payable, "获取应付账款成功")),
        Ok(None) => Json(api_error(404, "应付账款不存在")),
        Err(e) => {
            tracing::error!("获取应付账款失败: {}", e);
            Json(api_error(500, "获取应付账款失败"))
        }
    }
}

async fn update_payable(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdatePayableRequest>,
) -> Json<ApiResponse<Payable>> {
    let existing = sqlx::query_as::<_, Payable>(
        "SELECT id, invoice_number, supplier_name, category, amount, invoice_date, due_date, status, paid_amount, created_at, updated_at FROM erp.payables WHERE id = $1",
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
        UPDATE erp.payables SET
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
        Ok(payable) => (
            Json(ApiResponse::success(payable.clone(), "应付账款更新成功")),
            "success".to_string(),
            None,
        ),
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
        "update".to_string(),
        "payable".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn delete_payable(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM erp.payables WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "应付账款删除成功")),
            "success".to_string(),
            None,
        ),
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
        "delete".to_string(),
        "payable".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}
