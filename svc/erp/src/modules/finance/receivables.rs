#![allow(dead_code)]

use axum::http::HeaderMap;
use axum::{
    extract::{State, Extension, Json, Query, Path},
};

use chrono::Utc;

use uuid::Uuid;

use super::super::ApiState;
use super::PaginationParams;
use crate::models::finance::{Receivable, CreateReceivableRequest, UpdateReceivableRequest};
use crate::modules::audit::{log_audit_event, AuditEventParams};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse, PaginatedResponse};

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

    let cache_key = super::receivable_cache_key(&id);
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
                super::FINANCE_CACHE_TTL,
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
            state.receivable_cache.remove(&super::receivable_cache_key(&id));
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
            state.receivable_cache.remove(&super::receivable_cache_key(&id));
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
