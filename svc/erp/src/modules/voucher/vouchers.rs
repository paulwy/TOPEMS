#![allow(dead_code)]

use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    Json,
};
use chrono::{DateTime, Utc};
use uuid::Uuid;

use super::models::{ApproveVoucherRequest, PaginationParams, PostVoucherRequest};
use super::ApiState;
use crate::models::finance::{
    AccountingSubject, CreateFinancialVoucherRequest, FinancialVoucher, U8VoucherData,
    U8VoucherImportRequest, UpdateFinancialVoucherRequest, VoucherImportResult, VoucherItem,
};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

pub async fn list_vouchers(
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

pub async fn create_voucher(
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

pub async fn get_voucher(
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

pub async fn get_voucher_items(
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

pub async fn update_voucher(
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

pub async fn delete_voucher(
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

pub async fn approve_voucher(
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

pub async fn post_voucher(
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

pub async fn unpost_voucher(
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

pub async fn import_u8_vouchers(
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
