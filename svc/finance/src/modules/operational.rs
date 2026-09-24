//! V35.0 Phase 3: 运营财务模块（费用/预算/应收/应付）
//!
//! 从 ERP 迁移到 Finance 服务，共享同一数据库。
//! 使用 serde_json::Value 避免重复定义模型，直接查询现有表。

use std::str::FromStr;
use topems_shared_boundary::only_own_schema_query;

use axum::{
    extract::{Extension, Json, Path, Query, State},
    Router,
};
use chrono::Utc;
use serde_json::{json, Value};
use sqlx::Row;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::response::{PaginatedResponse, PaginationParams};

// ==================== 费用报销（Expenses）====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/expenses",
    tag = "Expense",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态"),
    ),
    responses(
        (status = 200, description = "获取费用列表成功", body = ApiResponse<PaginatedResponse<Value>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_expenses(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Value>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let rows = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, expense_number, applicant_name, department_id, expense_type, amount,
                  description, expense_date, receipt_count, status, approver_id, approved_at,
                  reimbursed_at, created_at, updated_at
           FROM expenses
           WHERE ($1::text IS NULL OR expense_number ILIKE $1 OR applicant_name ILIKE $1)
             AND ($2::text IS NULL OR status = $2)
           ORDER BY created_at DESC LIMIT $3 OFFSET $4"#
    ))
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<Value> = rows.iter().map(row_to_expense_json).collect();
            let total: i64 = sqlx::query_scalar(
                only_own_schema_query!("finance", r#"SELECT COUNT(*) FROM expenses
                   WHERE deleted_at IS NULL AND ($1::text IS NULL OR expense_number ILIKE $1 OR applicant_name ILIKE $1)
                     AND ($2::text IS NULL OR status = $2)"#),
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);
            Json(ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "获取费用报销列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取费用报销列表失败: {}", e);
            Json(ApiResponse::error(500, "获取费用报销列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/finance/expense",
    tag = "Operational",
    operation_id = "create_expense",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_expense(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<Value>,
) -> Json<ApiResponse<Value>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let expense_number = req
        .get("expense_number")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if expense_number.is_empty() {
        return Json(ApiResponse::error(400, "报销编号不能为空"));
    }

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"INSERT INTO expenses (id, expense_number, applicant_name, department_id, expense_type,
                                  amount, description, expense_date, receipt_count, status,
                                  created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, $11)
           RETURNING id, expense_number, applicant_name, department_id, expense_type, amount,
                     description, expense_date, receipt_count, status, approver_id, approved_at,
                     reimbursed_at, created_at, updated_at"#
    ))
    .bind(id)
    .bind(expense_number)
    .bind(req.get("applicant_name").and_then(|v| v.as_str()))
    .bind(
        req.get("department_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(req.get("expense_type").and_then(|v| v.as_str()))
    .bind(req.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0))
    .bind(req.get("description").and_then(|v| v.as_str()))
    .bind(
        req.get("expense_date")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(
        req.get("receipt_count")
            .and_then(|v| v.as_i64())
            .map(|i| i as i32)
            .unwrap_or(0),
    )
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(ApiResponse::success(
            row_to_expense_json(&row),
            "费用报销创建成功",
        )),
        Err(e) => {
            tracing::error!("创建费用报销失败: {}", e);
            Json(ApiResponse::error(500, "费用报销创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/expenses/{id}",
    tag = "Expense",
    params(("id" = Uuid, Path, description = "费用ID")),
    responses(
        (status = 200, description = "获取费用成功", body = ApiResponse<Value>),
        (status = 404, description = "费用不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_expense(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Value>> {
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, expense_number, applicant_name, department_id, expense_type, amount,
                  description, expense_date, receipt_count, status, approver_id, approved_at,
                  reimbursed_at, created_at, updated_at
           FROM expenses WHERE id = $1"#
    ))
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => Json(ApiResponse::success(
            row_to_expense_json(&row),
            "获取费用报销成功",
        )),
        Ok(None) => Json(ApiResponse::error(404, "费用报销不存在")),
        Err(e) => {
            tracing::error!("获取费用报销失败: {}", e);
            Json(ApiResponse::error(500, "获取费用报销失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/finance/expense/{id}",
    tag = "Operational",
    operation_id = "update_expense",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_expense(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<Value>,
) -> Json<ApiResponse<Value>> {
    let now = Utc::now();
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE expenses SET
              applicant_name = $2, department_id = $3, expense_type = $4, amount = $5,
              description = $6, expense_date = $7, receipt_count = $8, status = $9,
              approver_id = $10, approved_at = $11, reimbursed_at = $12, updated_at = $13
           WHERE id = $1
           RETURNING id, expense_number, applicant_name, department_id, expense_type, amount,
                     description, expense_date, receipt_count, status, approver_id, approved_at,
                     reimbursed_at, created_at, updated_at"#
    ))
    .bind(id)
    .bind(req.get("applicant_name").and_then(|v| v.as_str()))
    .bind(
        req.get("department_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(req.get("expense_type").and_then(|v| v.as_str()))
    .bind(req.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0))
    .bind(req.get("description").and_then(|v| v.as_str()))
    .bind(
        req.get("expense_date")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(
        req.get("receipt_count")
            .and_then(|v| v.as_i64())
            .map(|i| i as i32)
            .unwrap_or(0),
    )
    .bind(
        req.get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("pending"),
    )
    .bind(
        req.get("approver_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(
        req.get("approved_at")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(
        req.get("reimbursed_at")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(ApiResponse::success(
            row_to_expense_json(&row),
            "费用报销更新成功",
        )),
        Err(e) => {
            tracing::error!("更新费用报销失败: {}", e);
            Json(ApiResponse::error(500, "费用报销更新失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:delete"])),
    path = "/expenses/{id}",
    tag = "Expense",
    params(("id" = Uuid, Path, description = "费用ID")),
    responses(
        (status = 200, description = "删除费用成功", body = ApiResponse<String>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_expense(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE expenses SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&state.pool)
    .await;
    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "费用报销删除成功"))
        }
        Ok(_) => Json(ApiResponse::error(404, "费用报销不存在")),
        Err(e) => {
            tracing::error!("删除费用报销失败: {}", e);
            Json(ApiResponse::error(500, "费用报销删除失败"))
        }
    }
}

// ==================== 预算（Budgets）====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:budget:read"])),
    path = "/budgets",
    tag = "Budget",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态"),
    ),
    responses(
        (status = 200, description = "获取预算列表成功", body = ApiResponse<PaginatedResponse<Value>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_budgets(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Value>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let rows = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, tenant_id, department_id, budget_type, fiscal_year,
                  total_budget, used_amount, remaining_amount, usage_rate, status,
                  created_at, updated_at, deleted_at
           FROM budgets WHERE deleted_at IS NULL
           ORDER BY created_at DESC LIMIT $1 OFFSET $2"#
    ))
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<Value> = rows.iter().map(row_to_budget_json).collect();
            let total: i64 = sqlx::query_scalar(only_own_schema_query!(
                "finance",
                "SELECT COUNT(*) FROM budgets WHERE deleted_at IS NULL"
            ))
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);
            Json(ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "获取预算列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取预算列表失败: {}", e);
            Json(ApiResponse::error(500, "获取预算列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/finance/budget",
    tag = "Operational",
    operation_id = "create_budget",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_budget(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<Value>,
) -> Json<ApiResponse<Value>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let fiscal_year: i32 = req
        .get("fiscal_year")
        .and_then(|v| {
            v.as_i64()
                .map(|n| n as i32)
                .or_else(|| v.as_str().and_then(|s| s.parse::<i32>().ok()))
        })
        .unwrap_or(0);
    let total_budget: rust_decimal::Decimal = req
        .get("total_budget")
        .and_then(|v| v.as_str())
        .and_then(|s| rust_decimal::Decimal::from_str(s).ok())
        .unwrap_or_default();
    let used_amount = rust_decimal::Decimal::ZERO;
    let remaining_amount = total_budget - used_amount;
    let usage_rate = if total_budget.is_zero() {
        rust_decimal::Decimal::ZERO
    } else {
        (used_amount / total_budget) * rust_decimal::Decimal::from(100)
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"INSERT INTO budgets (id, tenant_id, department_id, budget_type, fiscal_year,
                                total_budget, used_amount, remaining_amount, usage_rate, status,
                                created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11)
           RETURNING id, tenant_id, department_id, budget_type, fiscal_year,
                     total_budget, used_amount, remaining_amount, usage_rate, status,
                     created_at, updated_at, deleted_at"#
    ))
    .bind(id)
    .bind(
        req.get("tenant_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(
        req.get("department_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(req.get("budget_type").and_then(|v| v.as_str()))
    .bind(fiscal_year)
    .bind(total_budget)
    .bind(used_amount)
    .bind(remaining_amount)
    .bind(usage_rate)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(ApiResponse::success(
            row_to_budget_json(&row),
            "预算创建成功",
        )),
        Err(e) => {
            tracing::error!("创建预算失败: {}", e);
            Json(ApiResponse::error(500, "预算创建失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:budget:read"])),
    path = "/budgets/{id}",
    tag = "Budget",
    params(("id" = Uuid, Path, description = "预算ID")),
    responses(
        (status = 200, description = "获取预算成功", body = ApiResponse<Value>),
        (status = 404, description = "预算不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_budget(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Value>> {
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, tenant_id, department_id, budget_type, fiscal_year,
                  total_budget, used_amount, remaining_amount, usage_rate, status,
                  created_at, updated_at, deleted_at
           FROM budgets WHERE id = $1 AND deleted_at IS NULL"#
    ))
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => Json(ApiResponse::success(
            row_to_budget_json(&row),
            "获取预算成功",
        )),
        Ok(None) => Json(ApiResponse::error(404, "预算不存在")),
        Err(e) => {
            tracing::error!("获取预算失败: {}", e);
            Json(ApiResponse::error(500, "获取预算失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:budget:write"])),
    path = "/finance/budget/{id}",
    tag = "Operational",
    operation_id = "update_budget",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_budget(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<Value>,
) -> Json<ApiResponse<Value>> {
    let now = Utc::now();
    let total_budget: rust_decimal::Decimal = req
        .get("total_budget")
        .and_then(|v| v.as_str())
        .and_then(|s| rust_decimal::Decimal::from_str(s).ok())
        .unwrap_or_default();
    let used_amount: rust_decimal::Decimal = req
        .get("used_amount")
        .and_then(|v| v.as_str())
        .and_then(|s| rust_decimal::Decimal::from_str(s).ok())
        .unwrap_or_default();
    let remaining_amount = total_budget - used_amount;
    let usage_rate = if total_budget.is_zero() {
        rust_decimal::Decimal::ZERO
    } else {
        (used_amount / total_budget) * rust_decimal::Decimal::from(100)
    };

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE budgets SET
              department_id = $2, budget_type = $3, fiscal_year = $4,
              total_budget = $5, used_amount = $6, remaining_amount = $7, usage_rate = $8,
              status = $9, updated_at = $10
           WHERE id = $1 AND deleted_at IS NULL
           RETURNING id, tenant_id, department_id, budget_type, fiscal_year,
                     total_budget, used_amount, remaining_amount, usage_rate, status,
                     created_at, updated_at, deleted_at"#
    ))
    .bind(id)
    .bind(
        req.get("department_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(req.get("budget_type").and_then(|v| v.as_str()))
    .bind(
        req.get("fiscal_year")
            .and_then(|v| v.as_str())
            .unwrap_or(""),
    )
    .bind(total_budget)
    .bind(used_amount)
    .bind(remaining_amount)
    .bind(usage_rate)
    .bind(
        req.get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("active"),
    )
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(ApiResponse::success(
            row_to_budget_json(&row),
            "预算更新成功",
        )),
        Err(e) => {
            tracing::error!("更新预算失败: {}", e);
            Json(ApiResponse::error(500, "预算更新失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:budget:write"])),
    path = "/budgets/{id}",
    tag = "Budget",
    params(("id" = Uuid, Path, description = "预算ID")),
    responses(
        (status = 200, description = "删除预算成功", body = ApiResponse<String>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_budget(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let now = Utc::now();
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE budgets SET deleted_at = $2, updated_at = $2 WHERE id = $1 AND deleted_at IS NULL"
    ))
    .bind(id)
    .bind(now)
    .execute(&state.pool)
    .await;
    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "预算删除成功"))
        }
        Ok(_) => Json(ApiResponse::error(404, "预算不存在")),
        Err(e) => {
            tracing::error!("删除预算失败: {}", e);
            Json(ApiResponse::error(500, "预算删除失败"))
        }
    }
}

// ==================== 应收（Receivables）====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/receivables",
    tag = "Receivable",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态"),
    ),
    responses(
        (status = 200, description = "获取应收账款列表成功", body = ApiResponse<PaginatedResponse<Value>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_receivables(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Value>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let rows = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, invoice_number, customer_name, project_id, contract_id, project_name,
                  amount, invoice_date, due_date, status, received_amount, payment_schedule,
                  created_at, updated_at
           FROM receivables
           WHERE ($1::text IS NULL OR invoice_number ILIKE $1 OR customer_name ILIKE $1)
             AND ($2::text IS NULL OR status = $2)
           ORDER BY created_at DESC LIMIT $3 OFFSET $4"#
    ))
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<Value> = rows.iter().map(row_to_receivable_json).collect();
            let total: i64 = sqlx::query_scalar(
                only_own_schema_query!("finance", r#"SELECT COUNT(*) FROM receivables
                   WHERE deleted_at IS NULL AND ($1::text IS NULL OR invoice_number ILIKE $1 OR customer_name ILIKE $1)
                     AND ($2::text IS NULL OR status = $2)"#),
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);
            Json(ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "获取应收列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取应收列表失败: {}", e);
            Json(ApiResponse::error(500, "获取应收列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/finance/receivable",
    tag = "Operational",
    operation_id = "create_receivable",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_receivable(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<Value>,
) -> Json<ApiResponse<Value>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let invoice_number = req
        .get("invoice_number")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if invoice_number.is_empty() {
        return Json(ApiResponse::error(400, "发票编号不能为空"));
    }

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"INSERT INTO receivables (id, invoice_number, customer_name, project_id, contract_id,
                                    project_name, amount, invoice_date, due_date, status,
                                    received_amount, payment_schedule, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'unpaid', 0, NULL, $10, $11)
           RETURNING id, invoice_number, customer_name, project_id, contract_id, project_name,
                     amount, invoice_date, due_date, status, received_amount, payment_schedule,
                     created_at, updated_at"#
    ))
    .bind(id)
    .bind(invoice_number)
    .bind(req.get("customer_name").and_then(|v| v.as_str()))
    .bind(
        req.get("project_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(
        req.get("contract_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(req.get("project_name").and_then(|v| v.as_str()))
    .bind(req.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0))
    .bind(
        req.get("invoice_date")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(req.get("due_date").and_then(|v| v.as_str()).and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    }))
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(ApiResponse::success(
            row_to_receivable_json(&row),
            "应收创建成功",
        )),
        Err(e) => {
            tracing::error!("创建应收失败: {}", e);
            Json(ApiResponse::error(500, "创建应收失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/receivables/{id}",
    tag = "Receivable",
    params(("id" = Uuid, Path, description = "应收账款ID")),
    responses(
        (status = 200, description = "获取应收账款成功", body = ApiResponse<Value>),
        (status = 404, description = "应收账款不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_receivable(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Value>> {
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, invoice_number, customer_name, project_id, contract_id, project_name,
                  amount, invoice_date, due_date, status, received_amount, payment_schedule,
                  created_at, updated_at
           FROM receivables WHERE id = $1"#
    ))
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => Json(ApiResponse::success(
            row_to_receivable_json(&row),
            "获取应收成功",
        )),
        Ok(None) => Json(ApiResponse::error(404, "应收不存在")),
        Err(e) => {
            tracing::error!("获取应收失败: {}", e);
            Json(ApiResponse::error(500, "获取应收失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/finance/receivable/{id}",
    tag = "Operational",
    operation_id = "update_receivable",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_receivable(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<Value>,
) -> Json<ApiResponse<Value>> {
    let now = Utc::now();
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE receivables SET
              customer_name = $2, project_name = $3, amount = $4, invoice_date = $5,
              due_date = $6, status = $7, received_amount = $8, payment_schedule = $9,
              updated_at = $10
           WHERE id = $1
           RETURNING id, invoice_number, customer_name, project_id, contract_id, project_name,
                     amount, invoice_date, due_date, status, received_amount, payment_schedule,
                     created_at, updated_at"#
    ))
    .bind(id)
    .bind(req.get("customer_name").and_then(|v| v.as_str()))
    .bind(req.get("project_name").and_then(|v| v.as_str()))
    .bind(req.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0))
    .bind(
        req.get("invoice_date")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(req.get("due_date").and_then(|v| v.as_str()).and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    }))
    .bind(
        req.get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("unpaid"),
    )
    .bind(
        req.get("received_amount")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0),
    )
    .bind(req.get("payment_schedule"))
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(ApiResponse::success(
            row_to_receivable_json(&row),
            "应收更新成功",
        )),
        Err(e) => {
            tracing::error!("更新应收失败: {}", e);
            Json(ApiResponse::error(500, "应收更新失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:delete"])),
    path = "/receivables/{id}",
    tag = "Receivable",
    params(("id" = Uuid, Path, description = "应收账款ID")),
    responses(
        (status = 200, description = "删除应收账款成功", body = ApiResponse<String>),
        (status = 404, description = "应收账款不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_receivable(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE receivables SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&state.pool)
    .await;
    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "应收删除成功"))
        }
        Ok(_) => Json(ApiResponse::error(404, "应收不存在")),
        Err(e) => {
            tracing::error!("删除应收失败: {}", e);
            Json(ApiResponse::error(500, "删除应收失败"))
        }
    }
}

// ==================== 应付（Payables）====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/payables",
    tag = "Payable",
    params(
        ("page" = Option<i64>, Query, description = "页码"),
        ("page_size" = Option<i64>, Query, description = "每页数量"),
        ("search" = Option<String>, Query, description = "搜索关键词"),
        ("status" = Option<String>, Query, description = "状态"),
    ),
    responses(
        (status = 200, description = "获取应付账款列表成功", body = ApiResponse<PaginatedResponse<Value>>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn list_payables(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<Value>>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let rows = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, invoice_number, supplier_name, project_id, contract_id, category,
                  amount, invoice_date, due_date, status, paid_amount, payment_schedule,
                  created_at, updated_at
           FROM payables
           WHERE ($1::text IS NULL OR invoice_number ILIKE $1 OR supplier_name ILIKE $1)
             AND ($2::text IS NULL OR status = $2)
           ORDER BY created_at DESC LIMIT $3 OFFSET $4"#
    ))
    .bind(&search_pattern)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(rows) => {
            let items: Vec<Value> = rows.iter().map(row_to_payable_json).collect();
            let total: i64 = sqlx::query_scalar(
                only_own_schema_query!("finance", r#"SELECT COUNT(*) FROM payables
                   WHERE deleted_at IS NULL AND ($1::text IS NULL OR invoice_number ILIKE $1 OR supplier_name ILIKE $1)
                     AND ($2::text IS NULL OR status = $2)"#),
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(0);
            Json(ApiResponse::success(
                PaginatedResponse::new(items, total, page, page_size),
                "获取应付列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取应付列表失败: {}", e);
            Json(ApiResponse::error(500, "获取应付列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["finance:invoice:write"])),
    path = "/finance/payable",
    tag = "Operational",
    operation_id = "create_payable",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn create_payable(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(req): Json<Value>,
) -> Json<ApiResponse<Value>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let invoice_number = req
        .get("invoice_number")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if invoice_number.is_empty() {
        return Json(ApiResponse::error(400, "发票编号不能为空"));
    }

    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"INSERT INTO payables (id, invoice_number, supplier_name, project_id, contract_id,
                                 category, amount, invoice_date, due_date, status,
                                 paid_amount, payment_schedule, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'unpaid', 0, NULL, $10, $11)
           RETURNING id, invoice_number, supplier_name, project_id, contract_id, category,
                     amount, invoice_date, due_date, status, paid_amount, payment_schedule,
                     created_at, updated_at"#
    ))
    .bind(id)
    .bind(invoice_number)
    .bind(req.get("supplier_name").and_then(|v| v.as_str()))
    .bind(
        req.get("project_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(
        req.get("contract_id")
            .and_then(|v| v.as_str())
            .and_then(|s| Uuid::parse_str(s).ok()),
    )
    .bind(req.get("category").and_then(|v| v.as_str()))
    .bind(req.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0))
    .bind(
        req.get("invoice_date")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(req.get("due_date").and_then(|v| v.as_str()).and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    }))
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(ApiResponse::success(
            row_to_payable_json(&row),
            "应付创建成功",
        )),
        Err(e) => {
            tracing::error!("创建应付失败: {}", e);
            Json(ApiResponse::error(500, "创建应付失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["finance:read"])),
    path = "/payables/{id}",
    tag = "Payable",
    params(("id" = Uuid, Path, description = "应付账款ID")),
    responses(
        (status = 200, description = "获取应付账款成功", body = ApiResponse<Value>),
        (status = 404, description = "应付账款不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn get_payable(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Value>> {
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"SELECT id, invoice_number, supplier_name, project_id, contract_id, category,
                  amount, invoice_date, due_date, status, paid_amount, payment_schedule,
                  created_at, updated_at
           FROM payables WHERE id = $1"#
    ))
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(row)) => Json(ApiResponse::success(
            row_to_payable_json(&row),
            "获取应付成功",
        )),
        Ok(None) => Json(ApiResponse::error(404, "应付不存在")),
        Err(e) => {
            tracing::error!("获取应付失败: {}", e);
            Json(ApiResponse::error(500, "获取应付失败"))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["finance:update"])),
    path = "/finance/payable/{id}",
    tag = "Operational",
    operation_id = "update_payable",
    responses(
        (status = 200, description = "操作成功"),
    ),
)]
pub async fn update_payable(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<Value>,
) -> Json<ApiResponse<Value>> {
    let now = Utc::now();
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        r#"UPDATE payables SET
              supplier_name = $2, category = $3, amount = $4, invoice_date = $5,
              due_date = $6, status = $7, paid_amount = $8, payment_schedule = $9,
              updated_at = $10
           WHERE id = $1
           RETURNING id, invoice_number, supplier_name, project_id, contract_id, category,
                     amount, invoice_date, due_date, status, paid_amount, payment_schedule,
                     created_at, updated_at"#
    ))
    .bind(id)
    .bind(req.get("supplier_name").and_then(|v| v.as_str()))
    .bind(req.get("category").and_then(|v| v.as_str()))
    .bind(req.get("amount").and_then(|v| v.as_f64()).unwrap_or(0.0))
    .bind(
        req.get("invoice_date")
            .and_then(|v| v.as_str())
            .and_then(|s| {
                chrono::DateTime::parse_from_rfc3339(s)
                    .ok()
                    .map(|d| d.with_timezone(&Utc))
            }),
    )
    .bind(req.get("due_date").and_then(|v| v.as_str()).and_then(|s| {
        chrono::DateTime::parse_from_rfc3339(s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    }))
    .bind(
        req.get("status")
            .and_then(|v| v.as_str())
            .unwrap_or("unpaid"),
    )
    .bind(
        req.get("paid_amount")
            .and_then(|v| v.as_f64())
            .unwrap_or(0.0),
    )
    .bind(req.get("payment_schedule"))
    .bind(now)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(row) => Json(ApiResponse::success(
            row_to_payable_json(&row),
            "应付更新成功",
        )),
        Err(e) => {
            tracing::error!("更新应付失败: {}", e);
            Json(ApiResponse::error(500, "应付更新失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["finance:delete"])),
    path = "/payables/{id}",
    tag = "Payable",
    params(("id" = Uuid, Path, description = "应付账款ID")),
    responses(
        (status = 200, description = "删除应付账款成功", body = ApiResponse<String>),
        (status = 404, description = "应付账款不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
pub async fn delete_payable(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query(only_own_schema_query!(
        "finance",
        "UPDATE payables SET deleted_at = NOW() WHERE id = $1"
    ))
    .bind(id)
    .execute(&state.pool)
    .await;
    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "应付删除成功"))
        }
        Ok(_) => Json(ApiResponse::error(404, "应付不存在")),
        Err(e) => {
            tracing::error!("删除应付失败: {}", e);
            Json(ApiResponse::error(500, "删除应付失败"))
        }
    }
}

// ==================== 行转 JSON 辅助函数 ====================

fn row_to_expense_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "expense_number": row.try_get::<String, _>("expense_number").ok(),
        "applicant_name": row.try_get::<Option<String>, _>("applicant_name").ok().flatten(),
        "department_id": row.try_get::<Option<Uuid>, _>("department_id").ok().flatten(),
        "expense_type": row.try_get::<Option<String>, _>("expense_type").ok().flatten(),
        "amount": row.try_get::<f64, _>("amount").ok(),
        "description": row.try_get::<Option<String>, _>("description").ok().flatten(),
        "expense_date": row.try_get::<Option<chrono::DateTime<Utc>>, _>("expense_date").ok().flatten(),
        "receipt_count": row.try_get::<Option<i32>, _>("receipt_count").ok().flatten(),
        "status": row.try_get::<String, _>("status").ok(),
        "approver_id": row.try_get::<Option<Uuid>, _>("approver_id").ok().flatten(),
        "approved_at": row.try_get::<Option<chrono::DateTime<Utc>>, _>("approved_at").ok().flatten(),
        "reimbursed_at": row.try_get::<Option<chrono::DateTime<Utc>>, _>("reimbursed_at").ok().flatten(),
        "created_at": row.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
        "updated_at": row.try_get::<chrono::DateTime<Utc>, _>("updated_at").ok(),
    })
}

fn row_to_budget_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "tenant_id": row.try_get::<Option<Uuid>, _>("tenant_id").ok().flatten(),
        "department_id": row.try_get::<Option<Uuid>, _>("department_id").ok().flatten(),
        "budget_type": row.try_get::<Option<String>, _>("budget_type").ok().flatten(),
        "fiscal_year": row.try_get::<String, _>("fiscal_year").ok(),
        "total_budget": row.try_get::<rust_decimal::Decimal, _>("total_budget").ok(),
        "used_amount": row.try_get::<rust_decimal::Decimal, _>("used_amount").ok(),
        "remaining_amount": row.try_get::<rust_decimal::Decimal, _>("remaining_amount").ok(),
        "usage_rate": row.try_get::<rust_decimal::Decimal, _>("usage_rate").ok(),
        "status": row.try_get::<String, _>("status").ok(),
        "created_at": row.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
        "updated_at": row.try_get::<chrono::DateTime<Utc>, _>("updated_at").ok(),
        "deleted_at": row.try_get::<Option<chrono::DateTime<Utc>>, _>("deleted_at").ok().flatten(),
    })
}

fn row_to_receivable_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "invoice_number": row.try_get::<String, _>("invoice_number").ok(),
        "customer_name": row.try_get::<Option<String>, _>("customer_name").ok().flatten(),
        "project_id": row.try_get::<Option<Uuid>, _>("project_id").ok().flatten(),
        "contract_id": row.try_get::<Option<Uuid>, _>("contract_id").ok().flatten(),
        "project_name": row.try_get::<Option<String>, _>("project_name").ok().flatten(),
        "amount": row.try_get::<f64, _>("amount").ok(),
        "invoice_date": row.try_get::<Option<chrono::DateTime<Utc>>, _>("invoice_date").ok().flatten(),
        "due_date": row.try_get::<Option<chrono::DateTime<Utc>>, _>("due_date").ok().flatten(),
        "status": row.try_get::<String, _>("status").ok(),
        "received_amount": row.try_get::<f64, _>("received_amount").ok(),
        "payment_schedule": row.try_get::<Option<Value>, _>("payment_schedule").ok().flatten(),
        "created_at": row.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
        "updated_at": row.try_get::<chrono::DateTime<Utc>, _>("updated_at").ok(),
    })
}

fn row_to_payable_json(row: &sqlx::postgres::PgRow) -> Value {
    json!({
        "id": row.try_get::<Uuid, _>("id").ok(),
        "invoice_number": row.try_get::<String, _>("invoice_number").ok(),
        "supplier_name": row.try_get::<Option<String>, _>("supplier_name").ok().flatten(),
        "project_id": row.try_get::<Option<Uuid>, _>("project_id").ok().flatten(),
        "contract_id": row.try_get::<Option<Uuid>, _>("contract_id").ok().flatten(),
        "category": row.try_get::<Option<String>, _>("category").ok().flatten(),
        "amount": row.try_get::<f64, _>("amount").ok(),
        "invoice_date": row.try_get::<Option<chrono::DateTime<Utc>>, _>("invoice_date").ok().flatten(),
        "due_date": row.try_get::<Option<chrono::DateTime<Utc>>, _>("due_date").ok().flatten(),
        "status": row.try_get::<String, _>("status").ok(),
        "paid_amount": row.try_get::<f64, _>("paid_amount").ok(),
        "payment_schedule": row.try_get::<Option<Value>, _>("payment_schedule").ok().flatten(),
        "created_at": row.try_get::<chrono::DateTime<Utc>, _>("created_at").ok(),
        "updated_at": row.try_get::<chrono::DateTime<Utc>, _>("updated_at").ok(),
    })
}

// ==================== 路由 ====================

pub fn create_routes() -> Router<AppState> {
    use axum::routing::get;
    Router::new()
        // 费用报销
        .route("/expenses", get(list_expenses).post(create_expense))
        .route(
            "/expenses/{id}",
            get(get_expense).put(update_expense).delete(delete_expense),
        )
        // 预算
        .route("/budgets", get(list_budgets).post(create_budget))
        .route(
            "/budgets/{id}",
            get(get_budget).put(update_budget).delete(delete_budget),
        )
        // 应收
        .route(
            "/receivables",
            get(list_receivables).post(create_receivable),
        )
        .route(
            "/receivables/{id}",
            get(get_receivable)
                .put(update_receivable)
                .delete(delete_receivable),
        )
        // 应付
        .route("/payables", get(list_payables).post(create_payable))
        .route(
            "/payables/{id}",
            get(get_payable).put(update_payable).delete(delete_payable),
        )
}
