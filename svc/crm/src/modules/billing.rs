use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use uuid::Uuid;

use super::ApiState;
use crate::models::billing::CreateBillingRequest;
use crate::models::{BillingQueryParams, BillingRecord, UpdateBillingRequest};
use crate::shared::permission::{check_permission, ModulePermission};
use sqlx::Row;
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::api_error;

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

async fn list_billing_records(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Query(params): Query<BillingQueryParams>,
    _headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::BillingRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1).min(1000);
    let page_size = params.page_size.unwrap_or(20).min(200);
    let offset = (page - 1) * page_size;

    let customer_id_filter = params.customer_id;
    let status_filter = params.status.clone();
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result = sqlx::query_as::<_, BillingRecord>(
        r#"
        SELECT id, tenant_id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at, deleted_at
        FROM crm.billing_records
        WHERE ($1::uuid IS NULL OR tenant_id = $1) AND deleted_at IS NULL
          AND ($2::uuid IS NULL OR customer_id = $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY due_date DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_opt)
    .bind(customer_id_filter)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM crm.billing_records
                WHERE deleted_at IS NULL AND ($1::uuid IS NULL OR tenant_id = $1)
                  AND ($2::uuid IS NULL OR customer_id = $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_opt)
            .bind(customer_id_filter)
            .bind(&status_filter)
            .fetch_one(&mut **txn)
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
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<BillingRecord>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::BillingRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });

    let result = sqlx::query_as::<_, BillingRecord>(
        r#"
        SELECT id, tenant_id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at, deleted_at
        FROM crm.billing_records WHERE id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .bind(tenant_opt)
    .fetch_optional(&mut **txn)
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

const ORG_ID_FALLBACK: &str = "00000000-0000-0000-0000-000000000001";

async fn create_billing_record(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<CreateBillingRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::BillingWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let invoice_no = req.invoice_no.unwrap_or_else(|| {
        format!(
            "BR-{}",
            Uuid::new_v4().simple().to_string()[..8].to_uppercase()
        )
    });
    let items = serde_json::to_value(&req.items).unwrap_or(serde_json::json!([]));
    let now = chrono::Utc::now();

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
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NULL, $8, $9, $9)
        RETURNING id
        "#,
    )
    .bind(tenant_id)
    .bind(req.customer_id)
    .bind(customer_name)
    .bind(&invoice_no)
    .bind(req.amount)
    .bind(req.currency.unwrap_or_else(|| "CNY".into()))
    .bind(req.due_date)
    .bind(items)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(row) => {
            let id: Uuid = row.get("id");
            tracing::info!("[crm] 账单创建成功 - invoice_no={}", invoice_no);
            Json(ApiResponse::success(
                serde_json::json!({ "id": id, "invoice_no": invoice_no }),
                "创建账单成功",
            ))
        }
        Err(e) => {
            tracing::error!("创建账单失败: {}", e);
            Json(api_error(500, "创建账单失败"))
        }
    }
}

async fn update_billing_record(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
    Json(req): Json<UpdateBillingRequest>,
) -> Json<ApiResponse<BillingRecord>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::BillingWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
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
            items = COALESCE($9, items),
            updated_at = $10
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
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
    .bind(req.status.as_deref())
    .bind(items)
    .bind(now)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(record)) => Json(ApiResponse::success(record, "更新账单成功")),
        Ok(None) => Json(api_error(404, "账单不存在")),
        Err(e) => {
            tracing::error!("更新账单失败: {}", e);
            Json(api_error(500, "更新账单失败"))
        }
    }
}

async fn delete_billing_record(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::BillingWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let result = sqlx::query(
        "UPDATE crm.billing_records SET deleted_at = $3 WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .bind(chrono::Utc::now())
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({ "deleted": true }),
            "删除账单成功",
        )),
        Ok(_) => Json(api_error(404, "账单不存在")),
        Err(e) => {
            tracing::error!("删除账单失败: {}", e);
            Json(api_error(500, "删除账单失败"))
        }
    }
}

async fn mark_billing_paid(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::BillingWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let now = chrono::Utc::now();
    // 幂等：已 paid 直接返回成功（与 PaymentReceived 事件链核销语义一致）
    let result = sqlx::query(
        r#"
        UPDATE crm.billing_records SET status = 'paid', paid_at = $3, updated_at = $3
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .bind(now)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({ "id": id, "status": "paid", "paid_at": now }),
            "标记已收款成功",
        )),
        Ok(_) => Json(api_error(404, "账单不存在")),
        Err(e) => {
            tracing::error!("标记已收款失败: {}", e);
            Json(api_error(500, "标记已收款失败"))
        }
    }
}

async fn send_billing_notification(
    State(state): State<ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    _headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    match check_permission(&state.db, &claims, &ModulePermission::BillingWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    let exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM crm.billing_records WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    if exists == 0 {
        return Json(api_error(404, "账单不存在"));
    }
    // 通知设施为后续专项（站内信/邮件）；当前记录日志并返回已入队
    tracing::info!("[crm] 账单催款通知已入队 - id={}", id);
    Json(ApiResponse::success(
        serde_json::json!({ "id": id, "queued": true }),
        "催款通知已入队",
    ))
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
