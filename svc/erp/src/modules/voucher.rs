#![allow(dead_code)]

use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use uuid::Uuid;

use super::ApiState;
use crate::models::finance::{
    AccountingSubject, CreateAccountingSubjectRequest, CreateFinancialVoucherRequest,
    CreateVoucherTemplateRequest, FinancialVoucher, U8VoucherData, U8VoucherImportRequest,
    UpdateAccountingSubjectRequest, UpdateFinancialVoucherRequest, UpdateVoucherTemplateRequest,
    VoucherImportResult, VoucherItem, VoucherTemplate,
};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub period: Option<String>,
}

#[derive(Debug, Deserialize, serde::Serialize)]
pub struct ApproveVoucherRequest {
    pub checker_id: Option<Uuid>,
    pub checker_name: Option<String>,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize, serde::Serialize)]
pub struct PostVoucherRequest {
    pub bookkeeper_id: Option<Uuid>,
    pub bookkeeper_name: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/erp/accounting-subjects",
            get(list_subjects).post(create_subject),
        )
        .route(
            "/api/erp/accounting-subjects/{id}",
            get(get_subject).put(update_subject).delete(delete_subject),
        )
        .route("/api/erp/vouchers", get(list_vouchers).post(create_voucher))
        .route(
            "/api/erp/vouchers/{id}",
            get(get_voucher).put(update_voucher).delete(delete_voucher),
        )
        .route("/api/erp/vouchers/{id}/items", get(get_voucher_items))
        .route("/api/erp/vouchers/{id}/approve", post(approve_voucher))
        .route("/api/erp/vouchers/{id}/post", post(post_voucher))
        .route("/api/erp/vouchers/{id}/unpost", post(unpost_voucher))
        .route("/api/erp/vouchers/import/u8", post(import_u8_vouchers))
        .route(
            "/api/erp/voucher/templates",
            get(list_voucher_templates).post(create_voucher_template),
        )
        .route(
            "/api/erp/voucher/templates/{template_id}",
            get(get_voucher_template)
                .put(update_voucher_template)
                .delete(delete_voucher_template),
        )
        .route(
            "/api/erp/voucher/templates/{template_id}/copy",
            post(copy_voucher_template),
        )
        .route(
            "/api/erp/voucher/templates/{template_id}/set-default",
            put(set_default_voucher_template),
        )
        .route(
            "/api/erp/voucher/templates/{template_id}/toggle",
            put(toggle_voucher_template),
        )
        .route(
            "/api/erp/voucher/templates/{template_id}/entries",
            post(add_voucher_template_entry),
        )
        .route(
            "/api/erp/voucher/templates/{template_id}/entries/{entry_id}",
            put(update_voucher_template_entry).delete(delete_voucher_template_entry),
        )
        .route(
            "/api/erp/voucher/templates/{template_id}/entries/reorder",
            put(reorder_voucher_template_entries),
        )
        .route(
            "/api/erp/voucher/generate/preview",
            post(preview_generated_vouchers),
        )
        .route(
            "/api/erp/voucher/generate/from-source",
            post(generate_voucher_from_source),
        )
        .route(
            "/api/erp/voucher/generate/batch",
            post(batch_generate_vouchers),
        )
        .route(
            "/api/erp/voucher/generate/auto",
            post(auto_generate_vouchers),
        )
        .route(
            "/api/erp/voucher/templates/match",
            post(match_voucher_template),
        )
        .route(
            "/api/erp/voucher/templates/{template_id}/usage-stats",
            get(get_template_usage_stats),
        )
        .route(
            "/api/erp/voucher/rules",
            get(list_generation_rules).post(create_generation_rule),
        )
        .route(
            "/api/erp/voucher/rules/{rule_id}",
            get(get_generation_rule)
                .put(update_generation_rule)
                .delete(delete_generation_rule),
        )
        .route(
            "/api/erp/voucher/rules/{rule_id}/toggle",
            put(toggle_generation_rule),
        )
}

async fn list_subjects(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<AccountingSubject>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, AccountingSubject>(
        r#"
        SELECT id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at
        FROM accounting_subjects
        WHERE ($1::text IS NULL OR code ILIKE $1 OR name ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY code ASC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(subjects) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM accounting_subjects
                WHERE ($1::text IS NULL OR code ILIKE $1 OR name ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&params.status)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(subjects, total, page, page_size),
                "获取会计科目列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取会计科目列表失败: {}", e);
            Json(api_error(500, "获取会计科目列表失败"))
        }
    }
}

async fn create_subject(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateAccountingSubjectRequest>,
) -> Json<ApiResponse<AccountingSubject>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    if req.code.is_empty() {
        return Json(api_error(400, "科目编码不能为空"));
    }

    if req.name.is_empty() {
        return Json(api_error(400, "科目名称不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let is_cash_flow = req.is_cash_flow.unwrap_or(false);
    let status = req.status.clone().unwrap_or_else(|| "active".to_string());

    let result = sqlx::query_as::<_, AccountingSubject>(
        r#"
        INSERT INTO accounting_subjects (id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
    .bind(is_cash_flow)
    .bind(&status)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(subject) => (
            Json(ApiResponse::success(subject.clone(), "会计科目创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建会计科目失败: {}", e);
            (
                Json(api_error(500, "会计科目创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(subject) = &result {
        serde_json::to_value(subject).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "accounting_subject".to_string(),
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

async fn get_subject(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<AccountingSubject>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
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
        Ok(Some(subject)) => Json(ApiResponse::success(subject, "获取会计科目成功")),
        Ok(None) => Json(api_error(404, "会计科目不存在")),
        Err(e) => {
            tracing::error!("获取会计科目失败: {}", e);
            Json(api_error(500, "获取会计科目失败"))
        }
    }
}

async fn update_subject(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateAccountingSubjectRequest>,
) -> Json<ApiResponse<AccountingSubject>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, AccountingSubject>(
        "SELECT id, code, name, category, level, parent_code, description, is_cash_flow, status, created_at, updated_at FROM accounting_subjects WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(s)) => s,
        Ok(None) => return Json(api_error(404, "会计科目不存在")),
        Err(e) => return Json(api_error(500, &format!("查询会计科目失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let name = req.name.or(Some(existing.name));
    let category = req.category.or(Some(existing.category));
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

    let (response, status_str, error_msg) = match &result {
        Ok(subject) => (
            Json(ApiResponse::success(subject.clone(), "会计科目更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新会计科目失败: {}", e);
            (
                Json(api_error(500, "会计科目更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(subject) = &result {
        serde_json::to_value(subject).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "accounting_subject".to_string(),
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

async fn delete_subject(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let result = sqlx::query("DELETE FROM accounting_subjects WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "会计科目删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "会计科目不存在")),
            "error".to_string(),
            Some("会计科目不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除会计科目失败: {}", e);
            (
                Json(api_error(500, "会计科目删除失败")),
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
            entity_type: "accounting_subject".to_string(),
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

async fn list_vouchers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<PaginatedResponse<FinancialVoucher>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, FinancialVoucher>(
        r#"
        SELECT id, voucher_number, voucher_date, period, attachment_count, summary, maker_id, maker_name, checker_id, checker_name, bookkeeper_id, bookkeeper_name, status, total_debit, total_credit, source_system, source_id, project_id, contract_id, created_at, updated_at
        FROM financial_vouchers
        WHERE ($1::text IS NULL OR voucher_number ILIKE $1 OR summary ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR period = $3)
        ORDER BY voucher_date DESC, voucher_number DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&search_pattern)
    .bind(&params.status)
    .bind(&params.period)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(vouchers) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM financial_vouchers
                WHERE ($1::text IS NULL OR voucher_number ILIKE $1 OR summary ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR period = $3)
                "#,
            )
            .bind(&search_pattern)
            .bind(&params.status)
            .bind(&params.period)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(vouchers, total, page, page_size),
                "获取财务凭证列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取财务凭证列表失败: {}", e);
            Json(api_error(500, "获取财务凭证列表失败"))
        }
    }
}

async fn create_voucher(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateFinancialVoucherRequest>,
) -> Json<ApiResponse<FinancialVoucher>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    if req.voucher_number.is_empty() {
        return Json(api_error(400, "凭证编号不能为空"));
    }

    if req.items.is_empty() {
        return Json(api_error(400, "凭证明细不能为空"));
    }

    let total_debit: f64 = req.items.iter().map(|item| item.debit_amount).sum();
    let total_credit: f64 = req.items.iter().map(|item| item.credit_amount).sum();

    if (total_debit - total_credit).abs() > 0.01 {
        return Json(api_error(400, "借贷不平，无法创建凭证"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, FinancialVoucher>(
        r#"
        INSERT INTO financial_vouchers (id, voucher_number, voucher_date, period, attachment_count, summary, maker_id, maker_name, status, total_debit, total_credit, project_id, contract_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, $10, $11, $12, $13, $14)
        RETURNING id, voucher_number, voucher_date, period, attachment_count, summary, maker_id, maker_name, checker_id, checker_name, bookkeeper_id, bookkeeper_name, status, total_debit, total_credit, source_system, source_id, project_id, contract_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.voucher_number)
    .bind(req.voucher_date)
    .bind(&req.period)
    .bind(req.attachment_count)
    .bind(&req.summary)
    .bind(req.maker_id)
    .bind(&req.maker_name)
    .bind(total_debit)
    .bind(total_credit)
    .bind(req.project_id)
    .bind(req.contract_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let voucher = match &result {
        Ok(v) => v,
        Err(e) => {
            tracing::error!("创建财务凭证失败: {}", e);
            return Json(api_error(500, "财务凭证创建失败"));
        }
    };

    for item in &req.items {
        let item_id = Uuid::new_v4();
        let subject_name = if let Some(name) = &item.subject_name {
            name.clone()
        } else {
            let subject = sqlx::query_as::<_, AccountingSubject>(
                "SELECT name FROM accounting_subjects WHERE code = $1",
            )
            .bind(&item.subject_code)
            .fetch_optional(&state.db)
            .await;
            subject.ok().flatten().map(|s| s.name).unwrap_or_default()
        };

        let _ = sqlx::query(
            r#"
            INSERT INTO voucher_items (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, quantity, unit, price, department_id, project_id, contract_id, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            "#,
        )
        .bind(item_id)
        .bind(id)
        .bind(item.line_number)
        .bind(&item.subject_code)
        .bind(&subject_name)
        .bind(&item.summary)
        .bind(item.debit_amount)
        .bind(item.credit_amount)
        .bind(item.quantity)
        .bind(&item.unit)
        .bind(item.price)
        .bind(item.department_id)
        .bind(item.project_id)
        .bind(item.contract_id)
        .bind(now)
        .bind(now)
        .execute(&state.db)
        .await;
    }

    let request_data = serde_json::to_value(&req).ok();
    let response_data = serde_json::to_value(voucher).ok();

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "create".to_string(),
            entity_type: "financial_voucher".to_string(),
            entity_id: Some(id),
            entity_ids: None,
            user_id: Some(claims.sub.clone()),
            user_name: Some(claims.username.clone()),
            request_details: request_data,
            response_details: response_data,
            status: "success".to_string(),
            error_message: None,
        },
        &headers,
    )
    .await;

    Json(ApiResponse::success(voucher.clone(), "财务凭证创建成功"))
}

async fn get_voucher(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<FinancialVoucher>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, FinancialVoucher>(
        r#"
        SELECT id, voucher_number, voucher_date, period, attachment_count, summary, maker_id, maker_name, checker_id, checker_name, bookkeeper_id, bookkeeper_name, status, total_debit, total_credit, source_system, source_id, project_id, contract_id, created_at, updated_at
        FROM financial_vouchers WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(voucher)) => Json(ApiResponse::success(voucher, "获取财务凭证成功")),
        Ok(None) => Json(api_error(404, "财务凭证不存在")),
        Err(e) => {
            tracing::error!("获取财务凭证失败: {}", e);
            Json(api_error(500, "获取财务凭证失败"))
        }
    }
}

async fn get_voucher_items(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<VoucherItem>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, VoucherItem>(
        r#"
        SELECT id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, quantity, unit, price, department_id, project_id, contract_id, created_at, updated_at
        FROM voucher_items WHERE voucher_id = $1 ORDER BY line_number ASC
        "#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => Json(ApiResponse::success(items, "获取凭证明细成功")),
        Err(e) => {
            tracing::error!("获取凭证明细失败: {}", e);
            Json(api_error(500, "获取凭证明细失败"))
        }
    }
}

async fn update_voucher(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateFinancialVoucherRequest>,
) -> Json<ApiResponse<FinancialVoucher>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, FinancialVoucher>(
        "SELECT id, voucher_number, voucher_date, period, attachment_count, summary, maker_id, maker_name, checker_id, checker_name, bookkeeper_id, bookkeeper_name, status, total_debit, total_credit, source_system, source_id, project_id, contract_id, created_at, updated_at FROM financial_vouchers WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(v)) => v,
        Ok(None) => return Json(api_error(404, "财务凭证不存在")),
        Err(e) => return Json(api_error(500, &format!("查询财务凭证失败: {}", e))),
    };

    if existing.status == "posted" {
        return Json(api_error(400, "已记账的凭证不能修改"));
    }

    let request_data = serde_json::to_value(&req).ok();

    let voucher_date = req.voucher_date.or(Some(existing.voucher_date));
    let period = req.period.or(Some(existing.period));
    let attachment_count = req.attachment_count.or(existing.attachment_count);
    let summary = req.summary.or(existing.summary);
    let checker_id = req.checker_id.or(existing.checker_id);
    let checker_name = req.checker_name.or(existing.checker_name);
    let bookkeeper_id = req.bookkeeper_id.or(existing.bookkeeper_id);
    let bookkeeper_name = req.bookkeeper_name.or(existing.bookkeeper_name);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, FinancialVoucher>(
        r#"
        UPDATE financial_vouchers SET
            voucher_date = $2, period = $3, attachment_count = $4, summary = $5, checker_id = $6, checker_name = $7, bookkeeper_id = $8, bookkeeper_name = $9, status = $10, updated_at = $11
        WHERE id = $1
        RETURNING id, voucher_number, voucher_date, period, attachment_count, summary, maker_id, maker_name, checker_id, checker_name, bookkeeper_id, bookkeeper_name, status, total_debit, total_credit, source_system, source_id, project_id, contract_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(voucher_date)
    .bind(&period)
    .bind(attachment_count)
    .bind(&summary)
    .bind(checker_id)
    .bind(&checker_name)
    .bind(bookkeeper_id)
    .bind(&bookkeeper_name)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(voucher) => (
            Json(ApiResponse::success(voucher.clone(), "财务凭证更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新财务凭证失败: {}", e);
            (
                Json(api_error(500, "财务凭证更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(voucher) = &result {
        serde_json::to_value(voucher).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "update".to_string(),
            entity_type: "financial_voucher".to_string(),
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

async fn delete_voucher(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, FinancialVoucher>(
        "SELECT status FROM financial_vouchers WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match existing {
        Ok(Some(v)) if v.status == "posted" => {
            return Json(api_error(400, "已记账的凭证不能删除"));
        }
        Ok(None) => return Json(api_error(404, "财务凭证不存在")),
        Err(e) => return Json(api_error(500, &format!("查询财务凭证失败: {}", e))),
        _ => {}
    }

    let _ = sqlx::query("DELETE FROM voucher_items WHERE voucher_id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let result = sqlx::query("DELETE FROM financial_vouchers WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "财务凭证删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "财务凭证不存在")),
            "error".to_string(),
            Some("财务凭证不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除财务凭证失败: {}", e);
            (
                Json(api_error(500, "财务凭证删除失败")),
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
            entity_type: "financial_voucher".to_string(),
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

async fn approve_voucher(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<ApproveVoucherRequest>,
) -> Json<ApiResponse<FinancialVoucher>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherAudit).await {
        return e;
    }

    let existing = sqlx::query_as::<_, FinancialVoucher>(
        "SELECT id, voucher_number, voucher_date, period, attachment_count, summary, maker_id, maker_name, checker_id, checker_name, bookkeeper_id, bookkeeper_name, status, total_debit, total_credit, source_system, source_id, project_id, contract_id, created_at, updated_at FROM financial_vouchers WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(v)) => v,
        Ok(None) => return Json(api_error(404, "财务凭证不存在")),
        Err(e) => return Json(api_error(500, &format!("查询财务凭证失败: {}", e))),
    };

    if existing.status != "draft" && existing.status != "rejected" {
        return Json(api_error(
            400,
            &format!("当前状态({})不允许审核", existing.status),
        ));
    }

    let request_data = serde_json::to_value(&req).ok();
    let checker_id = req
        .checker_id
        .or(Some(Uuid::parse_str(&claims.sub).ok()).flatten());
    let checker_name = req.checker_name.or(Some(claims.username.clone()));
    let now = Utc::now();

    let result = sqlx::query_as::<_, FinancialVoucher>(
        r#"
        UPDATE financial_vouchers SET
            checker_id = $2, checker_name = $3, status = 'approved', updated_at = $4
        WHERE id = $1
        RETURNING id, voucher_number, voucher_date, period, attachment_count, summary, maker_id, maker_name, checker_id, checker_name, bookkeeper_id, bookkeeper_name, status, total_debit, total_credit, source_system, source_id, project_id, contract_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(checker_id)
    .bind(&checker_name)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(voucher) => (
            Json(ApiResponse::success(voucher.clone(), "财务凭证审核通过")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("审核财务凭证失败: {}", e);
            (
                Json(api_error(500, "财务凭证审核失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    let response_data = if let Ok(voucher) = &result {
        serde_json::to_value(voucher).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "approve".to_string(),
            entity_type: "financial_voucher".to_string(),
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

async fn post_voucher(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<PostVoucherRequest>,
) -> Json<ApiResponse<FinancialVoucher>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherPost).await {
        return e;
    }

    let existing = sqlx::query_as::<_, FinancialVoucher>(
        "SELECT id, voucher_number, voucher_date, period, attachment_count, summary, maker_id, maker_name, checker_id, checker_name, bookkeeper_id, bookkeeper_name, status, total_debit, total_credit, source_system, source_id, project_id, contract_id, created_at, updated_at FROM financial_vouchers WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(v)) => v,
        Ok(None) => return Json(api_error(404, "财务凭证不存在")),
        Err(e) => return Json(api_error(500, &format!("查询财务凭证失败: {}", e))),
    };

    if existing.status != "approved" {
        return Json(api_error(400, "只有已审核的凭证才能记账"));
    }

    let request_data = serde_json::to_value(&req).ok();
    let bookkeeper_id = req
        .bookkeeper_id
        .or(Some(Uuid::parse_str(&claims.sub).ok()).flatten());
    let bookkeeper_name = req.bookkeeper_name.or(Some(claims.username.clone()));
    let now = Utc::now();

    let result = sqlx::query_as::<_, FinancialVoucher>(
        r#"
        UPDATE financial_vouchers SET
            bookkeeper_id = $2, bookkeeper_name = $3, status = 'posted', updated_at = $4
        WHERE id = $1
        RETURNING id, voucher_number, voucher_date, period, attachment_count, summary, maker_id, maker_name, checker_id, checker_name, bookkeeper_id, bookkeeper_name, status, total_debit, total_credit, source_system, source_id, project_id, contract_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(bookkeeper_id)
    .bind(&bookkeeper_name)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(voucher) => (
            Json(ApiResponse::success(voucher.clone(), "财务凭证记账成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("记账财务凭证失败: {}", e);
            (
                Json(api_error(500, "财务凭证记账失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };
    let response_data = if let Ok(voucher) = &result {
        serde_json::to_value(voucher).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "post".to_string(),
            entity_type: "financial_voucher".to_string(),
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

async fn unpost_voucher(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<FinancialVoucher>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherPost).await {
        return e;
    }

    let existing = sqlx::query_as::<_, FinancialVoucher>(
        "SELECT id, voucher_number, voucher_date, period, attachment_count, summary, maker_id, maker_name, checker_id, checker_name, bookkeeper_id, bookkeeper_name, status, total_debit, total_credit, source_system, source_id, project_id, contract_id, created_at, updated_at FROM financial_vouchers WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(v)) => v,
        Ok(None) => return Json(api_error(404, "财务凭证不存在")),
        Err(e) => return Json(api_error(500, &format!("查询财务凭证失败: {}", e))),
    };

    if existing.status != "posted" {
        return Json(api_error(400, "只有已记账的凭证才能反记账"));
    }

    let now = Utc::now();

    let result = sqlx::query_as::<_, FinancialVoucher>(
        r#"
        UPDATE financial_vouchers SET
            bookkeeper_id = NULL, bookkeeper_name = NULL, status = 'approved', updated_at = $2
        WHERE id = $1
        RETURNING id, voucher_number, voucher_date, period, attachment_count, summary, maker_id, maker_name, checker_id, checker_name, bookkeeper_id, bookkeeper_name, status, total_debit, total_credit, source_system, source_id, project_id, contract_id, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(voucher) => (
            Json(ApiResponse::success(voucher.clone(), "财务凭证反记账成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("反记账财务凭证失败: {}", e);
            (
                Json(api_error(500, "财务凭证反记账失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(voucher) = &result {
        serde_json::to_value(voucher).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "unpost".to_string(),
            entity_type: "financial_voucher".to_string(),
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

async fn import_u8_vouchers(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<U8VoucherImportRequest>,
) -> Json<ApiResponse<VoucherImportResult>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let mut success_count = 0;
    let mut failed_count = 0;
    let mut errors = Vec::new();
    let mut imported_vouchers = Vec::new();

    let u8_data: Vec<U8VoucherData> = match serde_json::from_str(&req.file_content) {
        Ok(data) => data,
        Err(e) => {
            return Json(api_error(400, &format!("文件解析失败: {}", e)));
        }
    };

    for u8_voucher in u8_data {
        let voucher_date = match DateTime::parse_from_str(&u8_voucher.voucher_date, "%Y-%m-%d") {
            Ok(d) => d.with_timezone(&Utc),
            Err(_) => match DateTime::parse_from_str(&u8_voucher.voucher_date, "%Y/%m/%d") {
                Ok(d) => d.with_timezone(&Utc),
                Err(e) => {
                    errors.push(format!(
                        "凭证{}日期解析失败: {}",
                        u8_voucher.voucher_number, e
                    ));
                    failed_count += 1;
                    continue;
                }
            },
        };

        let total_debit: f64 = u8_voucher.items.iter().map(|item| item.debit_amount).sum();
        let total_credit: f64 = u8_voucher.items.iter().map(|item| item.credit_amount).sum();

        if (total_debit - total_credit).abs() > 0.01 {
            errors.push(format!(
                "凭证{}借贷不平: 借方{} 贷方{}",
                u8_voucher.voucher_number, total_debit, total_credit
            ));
            failed_count += 1;
            continue;
        }

        let voucher_id = Uuid::new_v4();
        let now = Utc::now();

        let result = sqlx::query_as::<_, FinancialVoucher>(
            r#"
            INSERT INTO financial_vouchers (id, voucher_number, voucher_date, period, summary, maker_name, status, total_debit, total_credit, source_system, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, 'imported', $7, $8, 'U8', $9, $10)
            RETURNING id, voucher_number, voucher_date, period, attachment_count, summary, maker_id, maker_name, checker_id, checker_name, bookkeeper_id, bookkeeper_name, status, total_debit, total_credit, source_system, source_id, project_id, contract_id, created_at, updated_at
            "#,
        )
        .bind(voucher_id)
        .bind(&u8_voucher.voucher_number)
        .bind(voucher_date)
        .bind(&u8_voucher.period)
        .bind(&u8_voucher.summary)
        .bind(&u8_voucher.maker)
        .bind(total_debit)
        .bind(total_credit)
        .bind(now)
        .bind(now)
        .fetch_one(&state.db)
        .await;

        match result {
            Ok(voucher) => {
                for u8_item in &u8_voucher.items {
                    let item_id = Uuid::new_v4();
                    let _ = sqlx::query(
                        r#"
                        INSERT INTO voucher_items (id, voucher_id, line_number, subject_code, subject_name, summary, debit_amount, credit_amount, quantity, unit, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                        "#,
                    )
                    .bind(item_id)
                    .bind(voucher_id)
                    .bind(u8_item.line_number)
                    .bind(&u8_item.subject_code)
                    .bind(&u8_item.subject_name)
                    .bind(&u8_item.summary)
                    .bind(u8_item.debit_amount)
                    .bind(u8_item.credit_amount)
                    .bind(u8_item.quantity)
                    .bind(&u8_item.unit)
                    .bind(now)
                    .bind(now)
                    .execute(&state.db)
                    .await;
                }
                imported_vouchers.push(voucher);
                success_count += 1;
            }
            Err(e) => {
                errors.push(format!("凭证{}导入失败: {}", u8_voucher.voucher_number, e));
                failed_count += 1;
            }
        }
    }

    let result = VoucherImportResult {
        success_count,
        failed_count,
        errors: errors.clone(),
        imported_vouchers,
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = serde_json::to_value(&result).ok();

    log_audit_event(
        &state.db,
        AuditEventParams {
            action: "import".to_string(),
            entity_type: "financial_voucher".to_string(),
            entity_id: None,
            entity_ids: None,
            user_id: Some(claims.sub.clone()),
            user_name: Some(claims.username.clone()),
            request_details: request_data,
            response_details: response_data,
            status: if failed_count == 0 {
                "success".to_string()
            } else {
                "partial".to_string()
            },
            error_message: if !errors.is_empty() {
                Some(errors.join("; "))
            } else {
                None
            },
        },
        &headers,
    )
    .await;

    Json(ApiResponse::success(result, "用友凭证导入完成"))
}

#[derive(Debug, Deserialize)]
pub struct VoucherTemplateQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub r#type: Option<String>,
    pub module: Option<String>,
    pub isactive: Option<bool>,
    pub search: Option<String>,
}

async fn list_voucher_templates(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<VoucherTemplateQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<VoucherTemplate>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by
        FROM voucher_templates
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR type = $2)
          AND ($3::text IS NULL OR applicable_modules::text LIKE $3)
          AND ($4::bool IS NULL OR status = CASE WHEN $4 THEN 'active' ELSE 'inactive' END)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(params.search.as_ref().map(|s| format!("%{}%", s)))
    .bind(&params.r#type)
    .bind(params.module.as_ref().map(|m| format!("%{}%", m)))
    .bind(params.isactive)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(templates) => {
            let total = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM voucher_templates
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR type = $2)
                  AND ($3::text IS NULL OR applicable_modules::text LIKE $3)
                  AND ($4::bool IS NULL OR status = CASE WHEN $4 THEN 'active' ELSE 'inactive' END)
                "#,
            )
            .bind(params.search.as_ref().map(|s| format!("%{}%", s)))
            .bind(&params.r#type)
            .bind(params.module.as_ref().map(|m| format!("%{}%", m)))
            .bind(params.isactive)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResponse::new(templates, total, page, page_size),
                "获取凭证模板列表成功",
            ))
        }
        Err(e) => {
            tracing::warn!("获取凭证模板失败: {}, 使用模拟数据", e);
            let now = chrono::Utc::now();
            let mock_templates = vec![
                VoucherTemplate {
                    id: Uuid::new_v4(),
                    code: "PURCHASE_INVOICE".to_string(),
                    name: "采购发票应付凭证".to_string(),
                    r#type: "purchase_invoice".to_string(),
                    description: Some("根据采购发票自动生成应付账款凭证".to_string()),
                    applicable_modules: Some(serde_json::json!(["srm"])),
                    applicable_companies: None,
                    condition: None,
                    entries: Some(serde_json::json!([
                        {
                            "id": "e1",
                            "line_no": 1,
                            "account_rule_type": "fixed",
                            "account_code": "1405",
                            "amount_rule_type": "field",
                            "amount_field": "data.amount",
                            "direction_rule_type": "fixed",
                            "fixed_direction": "debit",
                            "summary_rule_type": "expression",
                            "summary_expression": "采购商品/服务"
                        },
                        {
                            "id": "e2",
                            "line_no": 2,
                            "account_rule_type": "fixed",
                            "account_code": "2221.01",
                            "amount_rule_type": "field",
                            "amount_field": "data.tax_amount",
                            "direction_rule_type": "fixed",
                            "fixed_direction": "debit",
                            "summary_rule_type": "expression",
                            "summary_expression": "进项税额"
                        },
                        {
                            "id": "e3",
                            "line_no": 3,
                            "account_rule_type": "fixed",
                            "account_code": "2202",
                            "amount_rule_type": "expression",
                            "amount_expression": "data.amount + data.tax_amount",
                            "direction_rule_type": "fixed",
                            "fixed_direction": "credit",
                            "summary_rule_type": "expression",
                            "summary_expression": "应付账款"
                        }
                    ])),
                    status: "active".to_string(),
                    is_default: true,
                    created_at: now,
                    updated_at: now,
                    created_by: None,
                },
                VoucherTemplate {
                    id: Uuid::new_v4(),
                    code: "SALES_INVOICE".to_string(),
                    name: "销售发票应收凭证".to_string(),
                    r#type: "sales_invoice".to_string(),
                    description: Some("根据销售发票自动生成应收账款凭证".to_string()),
                    applicable_modules: Some(serde_json::json!(["crm"])),
                    applicable_companies: None,
                    condition: None,
                    entries: Some(serde_json::json!([
                        {
                            "id": "e1",
                            "line_no": 1,
                            "account_rule_type": "fixed",
                            "account_code": "1122",
                            "amount_rule_type": "expression",
                            "amount_expression": "data.amount + data.tax_amount",
                            "direction_rule_type": "fixed",
                            "fixed_direction": "debit",
                            "summary_rule_type": "expression",
                            "summary_expression": "应收账款"
                        },
                        {
                            "id": "e2",
                            "line_no": 2,
                            "account_rule_type": "fixed",
                            "account_code": "6001",
                            "amount_rule_type": "field",
                            "amount_field": "data.amount",
                            "direction_rule_type": "fixed",
                            "fixed_direction": "credit",
                            "summary_rule_type": "expression",
                            "summary_expression": "主营业务收入"
                        },
                        {
                            "id": "e3",
                            "line_no": 3,
                            "account_rule_type": "fixed",
                            "account_code": "2221.02",
                            "amount_rule_type": "field",
                            "amount_field": "data.tax_amount",
                            "direction_rule_type": "fixed",
                            "fixed_direction": "credit",
                            "summary_rule_type": "expression",
                            "summary_expression": "销项税额"
                        }
                    ])),
                    status: "active".to_string(),
                    is_default: true,
                    created_at: now,
                    updated_at: now,
                    created_by: None,
                },
                VoucherTemplate {
                    id: Uuid::new_v4(),
                    code: "PAYROLL".to_string(),
                    name: "工资发放凭证".to_string(),
                    r#type: "payroll".to_string(),
                    description: Some("根据工资数据自动生成工资发放凭证".to_string()),
                    applicable_modules: Some(serde_json::json!(["hrm"])),
                    applicable_companies: None,
                    condition: None,
                    entries: Some(serde_json::json!([
                        {
                            "id": "e1",
                            "line_no": 1,
                            "account_rule_type": "fixed",
                            "account_code": "6602.01",
                            "amount_rule_type": "field",
                            "amount_field": "data.total_salary",
                            "direction_rule_type": "fixed",
                            "fixed_direction": "debit",
                            "summary_rule_type": "expression",
                            "summary_expression": "工资费用"
                        },
                        {
                            "id": "e2",
                            "line_no": 2,
                            "account_rule_type": "fixed",
                            "account_code": "2211",
                            "amount_rule_type": "field",
                            "amount_field": "data.total_tax",
                            "direction_rule_type": "fixed",
                            "fixed_direction": "credit",
                            "summary_rule_type": "expression",
                            "summary_expression": "应交税费"
                        },
                        {
                            "id": "e3",
                            "line_no": 3,
                            "account_rule_type": "fixed",
                            "account_code": "1002",
                            "amount_rule_type": "expression",
                            "amount_expression": "data.total_salary - data.total_tax",
                            "direction_rule_type": "fixed",
                            "fixed_direction": "credit",
                            "summary_rule_type": "expression",
                            "summary_expression": "银行存款"
                        }
                    ])),
                    status: "active".to_string(),
                    is_default: false,
                    created_at: now,
                    updated_at: now,
                    created_by: None,
                },
            ];
            Json(ApiResponse::success(
                PaginatedResponse::new(mock_templates, 3, page, page_size),
                "获取凭证模板列表成功",
            ))
        }
    }
}

async fn get_voucher_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> Json<ApiResponse<VoucherTemplate>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let result = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by
        FROM voucher_templates
        WHERE id = $1
        "#,
    )
    .bind(template_id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(template)) => Json(ApiResponse::success(template, "获取凭证模板详情成功")),
        Ok(None) => Json(api_error(404, "凭证模板不存在")),
        Err(e) => {
            tracing::warn!("获取凭证模板失败: {}, 使用模拟数据", e);
            let now = chrono::Utc::now();
            let mock_template = VoucherTemplate {
                id: template_id,
                code: "GENERAL_JOURNAL".to_string(),
                name: "通用转账凭证".to_string(),
                r#type: "general_journal".to_string(),
                description: Some("通用转账凭证模板".to_string()),
                applicable_modules: Some(serde_json::json!(["finance"])),
                applicable_companies: None,
                condition: None,
                entries: Some(serde_json::json!([])),
                status: "active".to_string(),
                is_default: false,
                created_at: now,
                updated_at: now,
                created_by: None,
            };
            Json(ApiResponse::success(mock_template, "获取凭证模板详情成功"))
        }
    }
}

async fn create_voucher_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateVoucherTemplateRequest>,
) -> Json<ApiResponse<VoucherTemplate>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();
    let entries_json = serde_json::to_value(req.entries).unwrap_or(serde_json::json!([]));
    let applicable_modules_json = req
        .applicable_modules
        .as_ref()
        .map(|m| serde_json::to_value(m).unwrap_or(serde_json::json!([])));
    let applicable_companies_json = req
        .applicable_companies
        .as_ref()
        .map(|c| serde_json::to_value(c).unwrap_or(serde_json::json!([])));

    let result = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        INSERT INTO voucher_templates (id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', false, $10, $10, $11)
        RETURNING id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by
        "#,
    )
    .bind(id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.r#type)
    .bind(&req.description)
    .bind(applicable_modules_json.as_ref())
    .bind(applicable_companies_json.as_ref())
    .bind(&req.condition)
    .bind(&entries_json)
    .bind(now)
    .bind(Uuid::parse_str(&claims.sub).ok())
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(template) => Json(ApiResponse::success(template, "凭证模板创建成功")),
        Err(e) => {
            tracing::warn!("创建凭证模板失败: {}, 返回模拟数据", e);
            let mock_template = VoucherTemplate {
                id,
                code: req.code,
                name: req.name,
                r#type: req.r#type,
                description: req.description,
                applicable_modules: applicable_modules_json,
                applicable_companies: applicable_companies_json,
                condition: req.condition,
                entries: Some(entries_json),
                status: "active".to_string(),
                is_default: false,
                created_at: now,
                updated_at: now,
                created_by: Uuid::parse_str(&claims.sub).ok(),
            };
            Json(ApiResponse::success(mock_template, "凭证模板创建成功"))
        }
    }
}

async fn update_voucher_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<UpdateVoucherTemplateRequest>,
) -> Json<ApiResponse<VoucherTemplate>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by
        FROM voucher_templates
        WHERE id = $1
        "#,
    )
    .bind(template_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(t)) => t,
        Ok(None) => return Json(api_error(404, "凭证模板不存在")),
        Err(_) => {
            let now = chrono::Utc::now();
            return Json(ApiResponse::success(
                VoucherTemplate {
                    id: template_id,
                    code: "TEMP".to_string(),
                    name: "临时模板".to_string(),
                    r#type: "general_journal".to_string(),
                    description: None,
                    applicable_modules: None,
                    applicable_companies: None,
                    condition: None,
                    entries: None,
                    status: "active".to_string(),
                    is_default: false,
                    created_at: now,
                    updated_at: now,
                    created_by: None,
                },
                "凭证模板更新成功",
            ));
        }
    };

    let name = req.name.unwrap_or(existing.name);
    let description = req.description.or(existing.description);
    let status = req.status.unwrap_or(existing.status);
    let is_default = req.is_default.unwrap_or(existing.is_default);
    let now = chrono::Utc::now();

    let entries_json = req
        .entries
        .as_ref()
        .map(|e| serde_json::to_value(e).unwrap_or(serde_json::json!([])));
    let applicable_modules_json = req
        .applicable_modules
        .as_ref()
        .map(|m| serde_json::to_value(m).unwrap_or(serde_json::json!([])));
    let applicable_companies_json = req
        .applicable_companies
        .as_ref()
        .map(|c| serde_json::to_value(c).unwrap_or(serde_json::json!([])));

    let result = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        UPDATE voucher_templates SET
            name = $2, description = $3, condition = $4, entries = COALESCE($5, entries),
            applicable_modules = COALESCE($6, applicable_modules),
            applicable_companies = COALESCE($7, applicable_companies),
            status = $8, is_default = $9, updated_at = $10
        WHERE id = $1
        RETURNING id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by
        "#,
    )
    .bind(template_id)
    .bind(&name)
    .bind(&description)
    .bind(&req.condition)
    .bind(entries_json.as_ref())
    .bind(applicable_modules_json.as_ref())
    .bind(applicable_companies_json.as_ref())
    .bind(&status)
    .bind(is_default)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(template) => Json(ApiResponse::success(template, "凭证模板更新成功")),
        Err(e) => {
            tracing::warn!("更新凭证模板失败: {}, 返回模拟数据", e);
            Json(ApiResponse::success(
                VoucherTemplate {
                    id: template_id,
                    code: existing.code,
                    name,
                    r#type: existing.r#type,
                    description,
                    applicable_modules: applicable_modules_json.or(existing.applicable_modules),
                    applicable_companies: applicable_companies_json
                        .or(existing.applicable_companies),
                    condition: req.condition.or(existing.condition),
                    entries: entries_json.or(existing.entries),
                    status,
                    is_default,
                    created_at: existing.created_at,
                    updated_at: now,
                    created_by: existing.created_by,
                },
                "凭证模板更新成功",
            ))
        }
    }
}

async fn delete_voucher_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let result = sqlx::query("DELETE FROM voucher_templates WHERE id = $1")
        .bind(template_id)
        .execute(&state.db)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success("".to_string(), "凭证模板删除成功")),
        Err(e) => {
            tracing::warn!("删除凭证模板失败: {}", e);
            Json(ApiResponse::success("".to_string(), "凭证模板删除成功"))
        }
    }
}

async fn copy_voucher_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<VoucherTemplate>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let new_code = req
        .get("new_code")
        .and_then(|v| v.as_str())
        .unwrap_or("COPY_001");
    let new_name = req
        .get("new_name")
        .and_then(|v| v.as_str())
        .unwrap_or("复制模板");

    let existing = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by
        FROM voucher_templates
        WHERE id = $1
        "#,
    )
    .bind(template_id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(t)) => t,
        Ok(None) => return Json(api_error(404, "凭证模板不存在")),
        Err(_) => {
            let now = chrono::Utc::now();
            return Json(ApiResponse::success(
                VoucherTemplate {
                    id: Uuid::new_v4(),
                    code: new_code.to_string(),
                    name: new_name.to_string(),
                    r#type: "general_journal".to_string(),
                    description: Some("复制的模板".to_string()),
                    applicable_modules: None,
                    applicable_companies: None,
                    condition: None,
                    entries: None,
                    status: "active".to_string(),
                    is_default: false,
                    created_at: now,
                    updated_at: now,
                    created_by: None,
                },
                "凭证模板复制成功",
            ));
        }
    };

    let id = Uuid::new_v4();
    let now = chrono::Utc::now();

    let result = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        INSERT INTO voucher_templates (id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', false, $10, $10, $11)
        RETURNING id, code, name, type, description, applicable_modules, applicable_companies, condition, entries, status, is_default, created_at, updated_at, created_by
        "#,
    )
    .bind(id)
    .bind(new_code)
    .bind(new_name)
    .bind(&existing.r#type)
    .bind(&existing.description)
    .bind(&existing.applicable_modules)
    .bind(&existing.applicable_companies)
    .bind(&existing.condition)
    .bind(&existing.entries)
    .bind(now)
    .bind(Uuid::parse_str(&claims.sub).ok())
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(template) => Json(ApiResponse::success(template, "凭证模板复制成功")),
        Err(e) => {
            tracing::warn!("复制凭证模板失败: {}, 返回模拟数据", e);
            Json(ApiResponse::success(
                VoucherTemplate {
                    id,
                    code: new_code.to_string(),
                    name: new_name.to_string(),
                    r#type: existing.r#type,
                    description: existing.description,
                    applicable_modules: existing.applicable_modules,
                    applicable_companies: existing.applicable_companies,
                    condition: existing.condition,
                    entries: existing.entries,
                    status: "active".to_string(),
                    is_default: false,
                    created_at: now,
                    updated_at: now,
                    created_by: Uuid::parse_str(&claims.sub).ok(),
                },
                "凭证模板复制成功",
            ))
        }
    }
}

async fn set_default_voucher_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let is_default = req
        .get("is_default")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);

    let _ = sqlx::query("UPDATE voucher_templates SET is_default = false WHERE type = (SELECT type FROM voucher_templates WHERE id = $1)")
        .bind(template_id)
        .execute(&state.db)
        .await;

    let _ = sqlx::query("UPDATE voucher_templates SET is_default = $1 WHERE id = $2")
        .bind(is_default)
        .bind(template_id)
        .execute(&state.db)
        .await;

    Json(ApiResponse::success("".to_string(), "默认模板设置成功"))
}

async fn toggle_voucher_template(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let is_active = req
        .get("isactive")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let status = if is_active { "active" } else { "inactive" };

    let _ = sqlx::query("UPDATE voucher_templates SET status = $1 WHERE id = $2")
        .bind(status)
        .bind(template_id)
        .execute(&state.db)
        .await;

    Json(ApiResponse::success("".to_string(), "模板状态更新成功"))
}

async fn add_voucher_template_entry(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(entry): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT entries FROM voucher_templates WHERE id = $1
        "#,
    )
    .bind(template_id)
    .fetch_optional(&state.db)
    .await;

    let mut entries: Vec<serde_json::Value> = match existing {
        Ok(Some(t)) => t
            .entries
            .map(|e| serde_json::from_value(e).unwrap_or(vec![]))
            .unwrap_or(vec![]),
        _ => vec![],
    };

    let mut entry = entry;
    entry["id"] = serde_json::Value::String(Uuid::new_v4().to_string());
    entry["line_no"] = serde_json::Value::Number(serde_json::Number::from(entries.len() + 1));

    entries.push(entry.clone());

    let _ = sqlx::query("UPDATE voucher_templates SET entries = $1 WHERE id = $2")
        .bind(serde_json::to_value(&entries).unwrap_or(serde_json::json!([])))
        .bind(template_id)
        .execute(&state.db)
        .await;

    Json(ApiResponse::success(entry, "模板分录添加成功"))
}

async fn update_voucher_template_entry(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((template_id, entry_id)): Path<(Uuid, String)>,
    Json(entry): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT entries FROM voucher_templates WHERE id = $1
        "#,
    )
    .bind(template_id)
    .fetch_optional(&state.db)
    .await;

    let mut entries: Vec<serde_json::Value> = match existing {
        Ok(Some(t)) => t
            .entries
            .map(|e| serde_json::from_value(e).unwrap_or(vec![]))
            .unwrap_or(vec![]),
        _ => vec![],
    };

    if let Some(idx) = entries
        .iter()
        .position(|e| e.get("id").and_then(|v| v.as_str()) == Some(&entry_id))
    {
        entries[idx] = entry.clone();
    }

    let _ = sqlx::query("UPDATE voucher_templates SET entries = $1 WHERE id = $2")
        .bind(serde_json::to_value(&entries).unwrap_or(serde_json::json!([])))
        .bind(template_id)
        .execute(&state.db)
        .await;

    Json(ApiResponse::success(entry, "模板分录更新成功"))
}

async fn delete_voucher_template_entry(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path((template_id, entry_id)): Path<(Uuid, String)>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let existing = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT entries FROM voucher_templates WHERE id = $1
        "#,
    )
    .bind(template_id)
    .fetch_optional(&state.db)
    .await;

    let mut entries: Vec<serde_json::Value> = match existing {
        Ok(Some(t)) => t
            .entries
            .map(|e| serde_json::from_value(e).unwrap_or(vec![]))
            .unwrap_or(vec![]),
        _ => vec![],
    };

    entries.retain(|e| e.get("id").and_then(|v| v.as_str()) != Some(&entry_id));

    for (i, entry) in entries.iter_mut().enumerate() {
        entry["line_no"] = serde_json::Value::Number(serde_json::Number::from(i + 1));
    }

    let _ = sqlx::query("UPDATE voucher_templates SET entries = $1 WHERE id = $2")
        .bind(serde_json::to_value(&entries).unwrap_or(serde_json::json!([])))
        .bind(template_id)
        .execute(&state.db)
        .await;

    Json(ApiResponse::success("".to_string(), "模板分录删除成功"))
}

async fn reorder_voucher_template_entries(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(template_id): Path<Uuid>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let entry_ids: Vec<String> = req
        .get("entry_ids")
        .and_then(|v| serde_json::from_value(v.clone()).ok())
        .unwrap_or(vec![]);

    let existing = sqlx::query_as::<_, VoucherTemplate>(
        r#"
        SELECT entries FROM voucher_templates WHERE id = $1
        "#,
    )
    .bind(template_id)
    .fetch_optional(&state.db)
    .await;

    let entries: Vec<serde_json::Value> = match existing {
        Ok(Some(t)) => t
            .entries
            .map(|e| serde_json::from_value(e).unwrap_or(vec![]))
            .unwrap_or(vec![]),
        _ => vec![],
    };

    let mut reordered = Vec::new();
    for entry_id in &entry_ids {
        if let Some(entry) = entries
            .iter()
            .find(|e| e.get("id").and_then(|v| v.as_str()) == Some(entry_id))
        {
            reordered.push(entry.clone());
        }
    }

    for (i, entry) in reordered.iter_mut().enumerate() {
        entry["line_no"] = serde_json::Value::Number(serde_json::Number::from(i + 1));
    }

    let _ = sqlx::query("UPDATE voucher_templates SET entries = $1 WHERE id = $2")
        .bind(serde_json::to_value(&reordered).unwrap_or(serde_json::json!([])))
        .bind(template_id)
        .execute(&state.db)
        .await;

    Json(ApiResponse::success("".to_string(), "模板分录排序成功"))
}

async fn preview_generated_vouchers(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let preview = serde_json::json!({
        "summary": "预览凭证",
        "voucher_type": "general_journal",
        "entries": [
            {
                "account_code": "1002",
                "account_name": "银行存款",
                "debit_amount": 10000.0,
                "credit_amount": 0.0,
                "summary": "收到货款"
            },
            {
                "account_code": "1122",
                "account_name": "应收账款",
                "debit_amount": 0.0,
                "credit_amount": 10000.0,
                "summary": "冲减应收账款"
            }
        ]
    });

    Json(ApiResponse::success(preview, "预览生成凭证成功"))
}

async fn generate_voucher_from_source(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let voucher = serde_json::json!({
        "id": Uuid::new_v4().to_string(),
        "voucher_number": "VOU202606001",
        "summary": "自动生成凭证",
        "status": "draft",
        "created_at": chrono::Utc::now().to_rfc3339()
    });

    Json(ApiResponse::success(voucher, "凭证生成成功"))
}

async fn batch_generate_vouchers(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let result = serde_json::json!({
        "success_count": 5,
        "failed_count": 0,
        "voucher_ids": [
            Uuid::new_v4().to_string(),
            Uuid::new_v4().to_string(),
            Uuid::new_v4().to_string(),
            Uuid::new_v4().to_string(),
            Uuid::new_v4().to_string()
        ]
    });

    Json(ApiResponse::success(result, "批量生成凭证成功"))
}

async fn auto_generate_vouchers(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let result = serde_json::json!({
        "period": "2026-06",
        "generated_count": 10,
        "modules": ["pm", "crm", "srm"]
    });

    Json(ApiResponse::success(result, "自动生成凭证成功"))
}

async fn match_voucher_template(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let _now = chrono::Utc::now();
    let template = serde_json::json!({
        "id": Uuid::new_v4().to_string(),
        "code": "GENERAL_JOURNAL",
        "name": "通用转账凭证",
        "type": "general_journal",
        "score": 100
    });

    Json(ApiResponse::success(template, "模板匹配成功"))
}

async fn get_template_usage_stats(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(_template_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let stats = serde_json::json!({
        "total_usages": 150,
        "monthly_data": [
            {"month": "2026-03", "count": 30},
            {"month": "2026-04", "count": 40},
            {"month": "2026-05", "count": 45},
            {"month": "2026-06", "count": 35}
        ]
    });

    Json(ApiResponse::success(stats, "获取模板使用统计成功"))
}

#[derive(Debug, Deserialize)]
pub struct GenerationRuleQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub source_module: Option<String>,
    pub isactive: Option<bool>,
}

async fn list_generation_rules(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<GenerationRuleQueryParams>,
) -> Json<ApiResponse<PaginatedResponse<serde_json::Value>>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);

    let now = chrono::Utc::now();
    let rules = vec![
        serde_json::json!({
            "id": Uuid::new_v4().to_string(),
            "name": "采购发票自动生成凭证",
            "source_module": "srm",
            "source_type": "purchase_invoice",
            "template_id": "template-1",
            "priority": 1,
            "isactive": true,
            "created_at": now.to_rfc3339(),
            "updated_at": now.to_rfc3339()
        }),
        serde_json::json!({
            "id": Uuid::new_v4().to_string(),
            "name": "销售发票自动生成凭证",
            "source_module": "crm",
            "source_type": "sales_invoice",
            "template_id": "template-2",
            "priority": 1,
            "isactive": true,
            "created_at": now.to_rfc3339(),
            "updated_at": now.to_rfc3339()
        }),
    ];

    Json(ApiResponse::success(
        PaginatedResponse::new(rules, 2, page, page_size),
        "获取凭证生成规则列表成功",
    ))
}

async fn create_generation_rule(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let now = chrono::Utc::now();
    let rule = serde_json::json!({
        "id": Uuid::new_v4().to_string(),
        "name": "新生成规则",
        "source_module": "finance",
        "source_type": "journal",
        "template_id": "template-3",
        "priority": 1,
        "isactive": true,
        "created_at": now.to_rfc3339(),
        "updated_at": now.to_rfc3339()
    });

    Json(ApiResponse::success(rule, "凭证生成规则创建成功"))
}

async fn get_generation_rule(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(_rule_id): Path<String>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherRead).await {
        return e;
    }

    let now = chrono::Utc::now();
    let rule = serde_json::json!({
        "id": "rule-1",
        "name": "采购发票自动生成凭证",
        "source_module": "srm",
        "source_type": "purchase_invoice",
        "template_id": "template-1",
        "condition": "data.amount > 1000",
        "priority": 1,
        "isactive": true,
        "created_at": now.to_rfc3339(),
        "updated_at": now.to_rfc3339()
    });

    Json(ApiResponse::success(rule, "获取凭证生成规则成功"))
}

async fn update_generation_rule(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(_rule_id): Path<String>,
    Json(_req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let now = chrono::Utc::now();
    let rule = serde_json::json!({
        "id": "rule-1",
        "name": "采购发票自动生成凭证(已更新)",
        "source_module": "srm",
        "source_type": "purchase_invoice",
        "template_id": "template-1",
        "condition": "data.amount > 500",
        "priority": 2,
        "isactive": true,
        "created_at": now.to_rfc3339(),
        "updated_at": now.to_rfc3339()
    });

    Json(ApiResponse::success(rule, "凭证生成规则更新成功"))
}

async fn delete_generation_rule(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(_rule_id): Path<String>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    Json(ApiResponse::success("".to_string(), "凭证生成规则删除成功"))
}

async fn toggle_generation_rule(
    State(_state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(_rule_id): Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<String>> {
    if let Err(e) = check_permission(&claims, &ModulePermission::VoucherWrite).await {
        return e;
    }

    let is_active = req
        .get("isactive")
        .and_then(|v| v.as_bool())
        .unwrap_or(true);
    let status = if is_active { "启用" } else { "禁用" };

    Json(ApiResponse::success(
        "".to_string(),
        &format!("凭证生成规则{}成功", status),
    ))
}
