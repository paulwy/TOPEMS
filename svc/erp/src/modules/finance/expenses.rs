#![allow(dead_code)]

use axum::http::HeaderMap;
use axum::{
    extract::{State, Extension, Json, Query, Path},
};

use chrono::Utc;

use uuid::Uuid;

use super::super::ApiState;
use super::PaginationParams;
use crate::models::finance::{Expense, CreateExpenseRequest, UpdateExpenseRequest};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

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

    let cache_key = super::expense_cache_key(&id);
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
                super::FINANCE_CACHE_TTL,
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
            state.expense_cache.remove(&super::expense_cache_key(&id));
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
            state.expense_cache.remove(&super::expense_cache_key(&id));
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
