use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use uuid::Uuid;

use super::ApiState;
use crate::models::billing::CreateBillingRequest;
use crate::models::{BillingQueryParams, BillingRecord, UpdateBillingRequest};
use crate::modules::billing_status::BillingStatus;
use crate::shared::permission::{check_permission, ModulePermission};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route(
            "/billing",
            get(list_billing_records).post(create_billing_record),
        )
        .route(
            "/billing/{id}",
            get(get_billing_record)
                .put(update_billing_record)
                .delete(delete_billing_record),
        )
        .route("/billing/{id}/paid", axum::routing::post(mark_billing_paid))
        .route(
            "/billing/{id}/notify",
            axum::routing::post(send_billing_notification),
        )
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:billing:read"])),
    path = "/billing",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "billing"
)]
pub async fn list_billing_records(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<BillingQueryParams>,
    _headers: HeaderMap,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::BillingRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let page = params.page.unwrap_or(1).max(1).min(1000);
    let page_size = params.page_size.unwrap_or(20).min(200);
    let offset = (page - 1) * page_size;

    let customer_id_filter = params.customer_id;
    let status_values: Vec<String> = match params.status.as_deref() {
        Some(raw) => match BillingStatus::from_db_str(raw) {
            Some(status) => vec![status.as_db_str().to_string()],
            None => return ApiResponse::bad_request("账单状态非法"),
        },
        None => BillingStatus::DB_VALUES
            .iter()
            .map(std::string::ToString::to_string)
            .collect(),
    };

    let result = sqlx::query_as::<_, BillingRecord>(
        r#"
        SELECT id, tenant_id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at, deleted_at
        FROM crm.billing_records
        WHERE deleted_at IS NULL
          AND ($1::uuid IS NULL OR customer_id = $1)
          AND status = ANY($2::text[])
        ORDER BY due_date DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(customer_id_filter)
    .bind(&status_values)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.billing_records
                WHERE deleted_at IS NULL
                  AND ($1::uuid IS NULL OR customer_id = $1)
                  AND status = ANY($2::text[])
                "#,
            )
            .bind(customer_id_filter)
            .bind(&status_values)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取账单列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取账单列表失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取账单列表失败".to_string()))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["crm:billing:read"])),
    path = "/billing/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "billing"
)]
pub async fn get_billing_record(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> ApiResponse<BillingRecord> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::BillingRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let result = sqlx::query_as::<_, BillingRecord>(
        r#"
        SELECT id, tenant_id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at, deleted_at
        FROM crm.billing_records WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(record)) => {
            if BillingStatus::from_db_str(&record.status).is_none() {
                return ApiResponse::conflict("账单状态非法，需先修复数据");
            }
            ApiResponse::success(record, "获取账单成功")
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("账单不存在".to_string())),
        Err(e) => {
            tracing::error!("获取账单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("获取账单失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:billing:write"])),
    path = "/billing",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "CRM/billing"
)]
pub(crate) async fn create_billing_record(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateBillingRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::BillingWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let invoice_no = req.invoice_no.unwrap_or_else(|| {
        format!(
            "BR-{}",
            Uuid::new_v4().simple().to_string()[..8].to_uppercase()
        )
    });
    let items = serde_json::to_value(&req.items).unwrap_or(serde_json::json!([]));
    let now = chrono::Utc::now();
    let status = BillingStatus::DEFAULT.as_db_str();

    // 反查客户名称（非租户维度，仅展示字段；缺失时留空）
    let locale = Locale::from_headers(&headers).as_sql();
    let customer_name = sqlx::query_scalar::<_, String>(
        "SELECT CASE WHEN $3 = 'en' THEN COALESCE(name_en, name) ELSE name END FROM crm.customers WHERE id = $1 AND tenant_id = $2",
    )
    .bind(req.customer_id)
    .bind(tenant_id)
    .bind(locale)
    .fetch_optional(&mut **txn)
    .await
    .unwrap_or(None)
    .unwrap_or_default();

    let result = sqlx::query(
        r#"
        INSERT INTO crm.billing_records
        (tenant_id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10, $10)
        RETURNING id
        "#,
    )
    .bind(tenant_id)
    .bind(req.customer_id)
    .bind(customer_name)
    .bind(&invoice_no)
    .bind(req.amount)
    .bind(req.currency.unwrap_or_else(|| "CNY".into()))
    .bind(status)
    .bind(req.due_date)
    .bind(items)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);

                    return ApiResponse::server_error("事务提交失败");
                }
            }
            let id: Uuid = row.get("id");
            tracing::info!("[crm] 账单创建成功 - invoice_no={}", invoice_no);
            ApiResponse::success(
                serde_json::json!({ "id": id, "invoice_no": invoice_no }),
                "创建账单成功",
            )
        }
        Err(e) => {
            tracing::error!("创建账单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("创建账单失败".to_string()))
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["crm:billing:write"])),
    path = "/billing/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "CRM/billing"
)]
pub(crate) async fn update_billing_record(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<UpdateBillingRequest>,
) -> ApiResponse<BillingRecord> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::BillingWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let db = state.db.clone();
    let mut scope = match db.scope_with(&mut *txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("账单事务作用域开启失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新账单失败".to_string()));
        }
    };
    let existing = match sqlx::query_as::<_, BillingRecord>(
        r#"
        SELECT id, tenant_id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at, deleted_at
        FROM crm.billing_records WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(record)) => record,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("账单不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询账单失败", e)),
    };
    drop(scope);

    let current_status = match BillingStatus::from_db_str(&existing.status) {
        Some(status) => status,
        None => return ApiResponse::bad_request("账单状态非法"),
    };
    let status = match req.status.as_deref() {
        Some(raw) => match BillingStatus::from_db_str(raw) {
            Some(next) => {
                if next != current_status && !BillingStatus::can_transition(current_status, next) {
                    return ApiResponse::conflict(&format!(
                        "账单状态不可从 {} 变更为 {}",
                        current_status.as_db_str(),
                        next.as_db_str()
                    ));
                }
                Some(next.as_db_str().to_string())
            }
            None => return ApiResponse::bad_request("账单状态非法"),
        },
        None => None,
    };

    let items = req
        .items
        .as_ref()
        .map(|i| serde_json::to_value(i).unwrap_or(serde_json::json!([])));
    let now = chrono::Utc::now();

    let result = sqlx::query_as::<_, BillingRecord>(
        r#"
        UPDATE crm.billing_records SET
            customer_id = COALESCE($3, customer_id),
            invoice_no = COALESCE($4, invoice_no),
            amount = COALESCE($5, amount),
            currency = COALESCE($6, currency),
            due_date = COALESCE($7, due_date),
            status = COALESCE($8, status),
            paid_at = CASE
                WHEN $8::text = 'paid' THEN COALESCE(paid_at, $10)
                WHEN $8::text IN ('pending', 'overdue', 'cancelled') THEN NULL
                ELSE paid_at
            END,
            items = COALESCE($9, items),
            updated_at = $10
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
          AND ($8::text IS NULL OR status = $11)
        RETURNING id, tenant_id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at, deleted_at
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(req.customer_id)
    .bind(req.invoice_no.as_deref())
    .bind(req.amount)
    .bind(req.currency.as_deref())
    .bind(req.due_date)
    .bind(&status)
    .bind(items)
    .bind(now)
    .bind(&existing.status)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(record)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);

                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(record, "更新账单成功")
        }
        Ok(None) => {
            if let Some(t) = guard.take() {
                let _ = t.rollback().await;
            }
            ApiResponse::conflict("账单状态已被并发变更，请刷新后重试")
        }
        Err(e) => {
            tracing::error!("更新账单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("更新账单失败".to_string()))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["crm:billing:write"])),
    path = "/billing/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "CRM/billing"
)]
pub(crate) async fn delete_billing_record(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::BillingWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let result = sqlx::query(
        "UPDATE crm.billing_records SET deleted_at = $3 WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(chrono::Utc::now())
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(serde_json::json!({ "deleted": true }), "删除账单成功")
        }
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("账单不存在".to_string())),
        Err(e) => {
            tracing::error!("删除账单失败: {}", e);
            ApiResponse::from(TopemsError::Internal("删除账单失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:billing:write"])),
    path = "/billing/{id}/paid",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "billing"
)]
pub async fn mark_billing_paid(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::BillingWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_id = match crate::shared::permission::require_write_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let now = chrono::Utc::now();
    let db = state.db.clone();
    let mut scope = match db.scope_with(&mut *txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("账单事务作用域开启失败: {}", e);
            return ApiResponse::from(TopemsError::Internal("更新账单失败".to_string()));
        }
    };
    let existing = match sqlx::query_as::<_, BillingRecord>(
        r#"
        SELECT id, tenant_id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at, deleted_at
        FROM crm.billing_records WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await
    {
        Ok(Some(record)) => record,
        Ok(None) => {
            return ApiResponse::from(TopemsError::ResourceNotFound("账单不存在".to_string()))
        }
        Err(e) => return ApiResponse::from(TopemsError::internal("查询账单失败", e)),
    };
    drop(scope);

    let current_status = match BillingStatus::from_db_str(&existing.status) {
        Some(status) => status,
        None => return ApiResponse::bad_request("账单状态非法"),
    };
    // 幂等：已 paid 直接返回成功（与 PaymentReceived 事件链核销语义一致）
    if current_status == BillingStatus::Paid {
        return ApiResponse::success(
            serde_json::json!({
                "id": id,
                "status": "paid",
                "paid_at": existing.paid_at.unwrap_or(now),
            }),
            "账单已收款，无需重复核销",
        );
    }
    if !BillingStatus::mark_paid_from().contains(&current_status.as_db_str()) {
        return ApiResponse::conflict(&format!(
            "账单状态 {} 不可核销为 paid",
            current_status.as_db_str()
        ));
    }

    let allowed_from: Vec<String> = BillingStatus::mark_paid_from()
        .iter()
        .map(|value| (*value).to_string())
        .collect();
    let result = sqlx::query(
        r#"
        UPDATE crm.billing_records SET
            status = $5, paid_at = COALESCE(paid_at, $3), updated_at = $3
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
          AND status = ANY($4::text[])
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(now)
    .bind(&allowed_from)
    .bind(BillingStatus::Paid.as_db_str())
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);
                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(
                serde_json::json!({ "id": id, "status": "paid", "paid_at": now }),
                "标记已收款成功",
            )
        }
        Ok(_) => {
            if let Some(t) = guard.take() {
                let _ = t.rollback().await;
            }
            ApiResponse::conflict("账单状态已被并发变更，请刷新后重试")
        }
        Err(e) => {
            tracing::error!("标记已收款失败: {}", e);
            ApiResponse::from(TopemsError::Internal("标记已收款失败".to_string()))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["crm:billing:write"])),
    path = "/billing/{id}/notify",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "billing"
)]
pub async fn send_billing_notification(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::BillingWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    let exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM crm.billing_records WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    if exists == 0 {
        return ApiResponse::from(TopemsError::ResourceNotFound("账单不存在".to_string()));
    }
    // 通知设施为后续专项（站内信/邮件）；当前记录日志并返回已入队
    tracing::info!("[crm] 账单催款通知已入队 - id={}", id);
    ApiResponse::success(
        serde_json::json!({ "id": id, "queued": true }),
        "催款通知已入队",
    )
}

#[allow(dead_code)]
struct _Unused(UpdateBillingRequest);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn create_routes_smoke() {
        let _router: Router<ApiState> = create_routes();
    }
}
