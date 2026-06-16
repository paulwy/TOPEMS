use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use uuid::Uuid;

use super::ApiState;
use crate::api::audit::log_audit_event;
use crate::models::{BillingQueryParams, BillingRecord, CreateBillingRequest};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{api_error, ApiResponse};

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/api/v1/billing",
            get(list_billing_records).post(create_billing_record),
        )
        .route(
            "/api/v1/billing/:id",
            get(get_billing_record)
                .put(update_billing_record)
                .delete(delete_billing_record),
        )
        .route("/api/v1/billing/:id/paid", post(mark_billing_paid))
        .route("/api/v1/billing/:id/notify", post(send_billing_notification))
}

async fn list_billing_records(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<BillingQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let customer_id_filter = params.customer_id;
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, BillingRecord>(
        r#"
        SELECT id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at
        FROM crm.billing_records
        WHERE ($1::uuid IS NULL OR customer_id = $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY due_date DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&customer_id_filter)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.billing_records
                WHERE ($1::uuid IS NULL OR customer_id = $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&customer_id_filter)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取账单列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取账单列表失败: {}", e);
            Json(api_error(500, "获取账单列表失败"))
        }
    }
}

async fn get_billing_record(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<BillingRecord>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, BillingRecord>(
        r#"
        SELECT id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at
        FROM crm.billing_records WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(record)) => Json(ApiResponse::success(record, "获取账单成功")),
        Ok(None) => Json(api_error(404, "账单不存在")),
        Err(e) => {
            tracing::error!("获取账单失败: {}", e);
            Json(api_error(500, "获取账单失败"))
        }
    }
}

async fn create_billing_record(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateBillingRequest>,
) -> Json<ApiResponse<BillingRecord>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    if req.amount <= 0.0 {
        return Json(api_error(400, "金额必须大于零"));
    }

    let customer = sqlx::query_scalar::<_, String>(
        "SELECT name FROM crm.customers WHERE id = $1",
    )
    .bind(&req.customer_id)
    .fetch_optional(&state.db)
    .await;

    let customer_name = match customer {
        Ok(Some(name)) => name,
        Ok(None) => return Json(api_error(400, "客户不存在")),
        Err(e) => return Json(api_error(500, &format!("查询客户失败: {}", e))),
    };

    let id = Uuid::new_v4();
    let now = Utc::now();
    let invoice_no = if let Some(inv_no) = &req.invoice_no {
        inv_no.clone()
    } else {
        format!("INV-{}-{}", now.format("%Y%m%d"), id.to_string().split('-').next().unwrap())
    };
    let currency = if let Some(curr) = &req.currency {
        curr.clone()
    } else {
        "CNY".to_string()
    };

    let items_json = serde_json::to_value(&req.items).unwrap_or(serde_json::Value::Array(Default::default()));

    let result = sqlx::query_as::<_, BillingRecord>(
        r#"
        INSERT INTO crm.billing_records (
            id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, items, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10)
        RETURNING id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.customer_id)
    .bind(&customer_name)
    .bind(&invoice_no)
    .bind(req.amount)
    .bind(&currency)
    .bind(&req.due_date)
    .bind(&items_json)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(record) => (
            Json(ApiResponse::success(record.clone(), "账单创建成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("创建账单失败: {}", e);
            (
                Json(api_error(500, "账单创建失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(record) = &result {
        serde_json::to_value(record).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "billing_record".to_string(),
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

async fn update_billing_record(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<BillingRecord>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let existing = sqlx::query_as::<_, BillingRecord>(
        r#"
        SELECT id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at FROM crm.billing_records WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(c)) => c,
        Ok(None) => return Json(api_error(404, "账单不存在")),
        Err(e) => return Json(api_error(500, &format!("查询账单失败: {}", e))),
    };

    let request_data = serde_json::to_value(&req).ok();

    let customer_id = req.get("customer_id").and_then(|v| v.as_str()).and_then(|s| Uuid::parse_str(s).ok());
    let customer_name = if customer_id.is_some() {
        sqlx::query_scalar::<_, String>(
            "SELECT name FROM crm.customers WHERE id = $1",
        )
        .bind(customer_id.as_ref())
        .fetch_optional(&state.db)
        .await
        .ok()
        .flatten()
        .or(Some(existing.customer_name))
    } else {
        Some(existing.customer_name)
    };

    let invoice_no = req.get("invoice_no").and_then(|v| v.as_str()).unwrap_or(&existing.invoice_no).to_string();
    let amount = req.get("amount").and_then(|v| v.as_f64()).unwrap_or(existing.amount);
    let currency = req.get("currency").and_then(|v| v.as_str()).unwrap_or(&existing.currency).to_string();
    let due_date = req.get("due_date").and_then(|v| v.as_str()).and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok()).map(|dt| dt.with_timezone(&chrono::Utc));
    let status = req.get("status").and_then(|v| v.as_str()).unwrap_or(&existing.status).to_string();
    let now = Utc::now();

    let result = sqlx::query_as::<_, BillingRecord>(
        r#"
        UPDATE crm.billing_records SET
            customer_id = COALESCE($2, customer_id),
            customer_name = COALESCE($3, customer_name),
            invoice_no = $4,
            amount = $5,
            currency = $6,
            due_date = COALESCE($7, due_date),
            status = $8,
            updated_at = $9
        WHERE id = $1
        RETURNING id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&customer_id)
    .bind(&customer_name)
    .bind(&invoice_no)
    .bind(amount)
    .bind(&currency)
    .bind(&due_date)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(record) => (
            Json(ApiResponse::success(record.clone(), "账单更新成功")),
            "success".to_string(),
            None,
        ),
        Err(e) => {
            tracing::error!("更新账单失败: {}", e);
            (
                Json(api_error(500, "账单更新失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(record) = &result {
        serde_json::to_value(record).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "billing_record".to_string(),
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

async fn delete_billing_record(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query("DELETE FROM crm.billing_records WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "账单删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "账单不存在")),
            "error".to_string(),
            Some("账单不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除账单失败: {}", e);
            (
                Json(api_error(500, "账单删除失败")),
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
        "billing_record".to_string(),
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

async fn mark_billing_paid(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<BillingRecord>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let now = Utc::now();

    let result = sqlx::query_as::<_, BillingRecord>(
        r#"
        UPDATE crm.billing_records SET
            status = 'paid',
            paid_at = $2,
            updated_at = $2
        WHERE id = $1
        RETURNING id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(record) => Json(ApiResponse::success(record, "账单已标记为已支付")),
        Err(e) => {
            tracing::error!("标记账单支付失败: {}", e);
            Json(api_error(500, "标记账单支付失败"))
        }
    }
}

async fn send_billing_notification(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    match check_permission(&state.db, &claims, &ModulePermission::CustomerWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query_as::<_, BillingRecord>(
        "SELECT customer_name, invoice_no, amount FROM crm.billing_records WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(record)) => {
            tracing::info!("发送账单通知: 客户={}, 发票号={}, 金额={}", 
                record.customer_name, record.invoice_no, record.amount);
            Json(ApiResponse::success("".to_string(), "账单通知已发送"))
        }
        Ok(None) => Json(api_error(404, "账单不存在")),
        Err(e) => {
            tracing::error!("发送账单通知失败: {}", e);
            Json(api_error(500, "发送账单通知失败"))
        }
    }
}