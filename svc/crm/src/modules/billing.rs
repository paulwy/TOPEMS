use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use uuid::Uuid;

use super::ApiState;
use crate::models::{BillingQueryParams, BillingRecord, UpdateBillingRequest};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::ApiResponse;
use topems_shared_auth::middleware::tenant::get_tenant_id;
use topems_shared_core::response::api_error;

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/billing", get(list_billing_records))
        .route("/billing/{id}", get(get_billing_record))
}

async fn list_billing_records(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<BillingQueryParams>,
    headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::BillingRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let page = params.page.unwrap_or(1).max(1).min(1000);
    let page_size = params.page_size.unwrap_or(20).min(200);
    let offset = (page - 1) * page_size;

    let customer_id_filter = params.customer_id;
    let status_filter = params.status.clone();
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, BillingRecord>(
        r#"
        SELECT id, tenant_id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at, deleted_at
        FROM crm.billing_records
        WHERE tenant_id = $1 AND deleted_at IS NULL
          AND ($2::uuid IS NULL OR customer_id = $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY due_date DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(customer_id_filter)
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
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::uuid IS NULL OR customer_id = $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(customer_id_filter)
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
    headers: HeaderMap,
) -> Json<ApiResponse<BillingRecord>> {
    match check_permission(&state.db, &claims, &ModulePermission::BillingRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, BillingRecord>(
        r#"
        SELECT id, tenant_id, customer_id, customer_name, invoice_no, amount, currency, status, due_date, paid_at, items, created_at, updated_at, deleted_at
        FROM crm.billing_records WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .bind(tenant_id)
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
