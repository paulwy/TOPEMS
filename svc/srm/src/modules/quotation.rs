use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use std::sync::Arc;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::error::Result;
use topems_shared_db::scope::Db;
use uuid::Uuid;

use crate::models::{CreateQuotationRequest, Quotation, UpdateQuotationRequest};
use crate::modules::quotation_status::QuotationStatus;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ListQuotationParams {
    pub inquiry_id: Option<String>,
}

pub struct AppState {
    pub db: Db,
}

pub async fn create_routes(db: Db) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/quotations", get(list_quotations).post(create_quotation))
        .route(
            "/quotations/{id}",
            get(get_quotation)
                .put(update_quotation)
                .delete(delete_quotation),
        )
        .route("/quotations/{id}/award", post(award_quotation))
        .route("/quotations/{id}/reject", post(reject_quotation))
        .with_state(state);

    Ok(app)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:quotation:read"])),
    path = "/quotations",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/quotation"
)]
pub async fn list_quotations(
    State(_state): State<Arc<AppState>>,
    Query(params): Query<ListQuotationParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Vec<Quotation>> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let inquiry_id = params.inquiry_id.and_then(|s| Uuid::parse_str(&s).ok());

    let result = if inquiry_id.is_some() {
        sqlx::query_as::<_, Quotation>(
            only_own_schema_query!("srm", r#"
            SELECT q.id, q.quotation_no, q.inquiry_id, i.inquiry_no, q.supplier_id, s.name as supplier_name,
                   q.title, q.total_amount, q.currency, q.valid_until, q.delivery_time, q.payment_terms,
                   q.status, q.items, q.remarks, q.submitted_at, q.created_at, q.updated_at
            FROM srm.quotations q
            LEFT JOIN srm.inquiries i ON q.inquiry_id = i.id
            LEFT JOIN srm.suppliers s ON q.supplier_id = s.id
            WHERE q.deleted_at IS NULL AND q.status IN ('pending','awarded','rejected') AND q.inquiry_id = $1
            ORDER BY q.created_at DESC
            "#, "srm"),
        )
        .bind(inquiry_id)
        .fetch_all(&mut **txn)
        .await
    } else {
        sqlx::query_as::<_, Quotation>(
            only_own_schema_query!("srm", r#"
            SELECT q.id, q.quotation_no, q.inquiry_id, i.inquiry_no, q.supplier_id, s.name as supplier_name,
                   q.title, q.total_amount, q.currency, q.valid_until, q.delivery_time, q.payment_terms,
                   q.status, q.items, q.remarks, q.submitted_at, q.created_at, q.updated_at
            FROM srm.quotations q
            LEFT JOIN srm.inquiries i ON q.inquiry_id = i.id
            LEFT JOIN srm.suppliers s ON q.supplier_id = s.id
            WHERE q.deleted_at IS NULL AND q.status IN ('pending','awarded','rejected')
            ORDER BY q.created_at DESC
            "#, "srm"),
        )
        .fetch_all(&mut **txn)
        .await
    };

    match result {
        Ok(quotations) => ApiResponse::success(quotations, "获取报价列表成功"),
        Err(e) => {
            tracing::error!("获取报价列表失败: {}", e);
            ApiResponse::<Vec<Quotation>>::error(500, "获取报价列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["srm:quotation:write"])),
    path = "/quotations",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/quotation"
)]
pub async fn create_quotation(
    State(_state): State<Arc<AppState>>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateQuotationRequest>,
) -> ApiResponse<Quotation> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let inquiry_id = match Uuid::parse_str(&req.inquiry_id) {
        Ok(id) => id,
        Err(_) => return ApiResponse::<Quotation>::bad_request("无效的询价ID"),
    };

    let supplier_id = match Uuid::parse_str(&req.supplier_id) {
        Ok(id) => id,
        Err(_) => return ApiResponse::<Quotation>::bad_request("无效的供应商ID"),
    };

    if !req.total_amount.is_finite() || req.total_amount < 0.0 {
        return ApiResponse::<Quotation>::bad_request("报价金额不能为负数");
    }

    let inquiry = match sqlx::query_scalar::<_, String>(only_own_schema_query!(
        "srm",
        "SELECT inquiry_no FROM srm.inquiries WHERE id = $1",
        "srm"
    ))
    .bind(inquiry_id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(Some(i)) => i,
        Ok(None) => return ApiResponse::<Quotation>::bad_request("询价不存在"),
        Err(e) => {
            tracing::error!("查询询价失败: {}", e);
            return ApiResponse::<Quotation>::server_error("查询询价失败");
        }
    };

    let supplier_name = match sqlx::query_scalar::<_, Option<String>>(only_own_schema_query!(
        "srm",
        "SELECT name FROM srm.suppliers WHERE id = $1",
        "srm"
    ))
    .bind(supplier_id)
    .fetch_optional(&mut **txn)
    .await
    {
        Ok(n) => n,
        Err(e) => {
            tracing::error!("查询供应商失败: {}", e);
            return ApiResponse::<Quotation>::server_error("查询供应商失败");
        }
    };

    let id = Uuid::new_v4();
    let now = Utc::now();
    let quotation_no = format!("QUO-{}", now.timestamp_millis());

    let valid_until = req.valid_until.and_then(|s| {
        DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let result = sqlx::query_as::<_, Quotation>(
        only_own_schema_query!("srm", r#"
        INSERT INTO srm.quotations (id, quotation_no, inquiry_id, inquiry_no, supplier_id, supplier_name,
            title, total_amount, currency, valid_until, delivery_time, payment_terms, status, items, remarks, submitted_at, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NULLIF(current_setting('app.tenant_id', true), '')::UUID)
        RETURNING id, quotation_no, inquiry_id, inquiry_no, supplier_id, supplier_name,
            title, total_amount, currency, valid_until, delivery_time, payment_terms, status, items, remarks, submitted_at, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(&quotation_no)
    .bind(inquiry_id)
    .bind(&inquiry)
    .bind(supplier_id)
    .bind(supplier_name)
    .bind(&req.title)
    .bind(req.total_amount)
    .bind(&req.currency)
    .bind(valid_until)
    .bind(&req.delivery_time)
    .bind(&req.payment_terms)
    .bind(QuotationStatus::DEFAULT.as_db_str())
    .bind(&req.items)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(quotation) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(quotation, "报价创建成功")
        }
        Err(e) => {
            tracing::error!("创建报价失败: {}", e);
            ApiResponse::<Quotation>::server_error("报价创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:quotation:read"])),
    path = "/quotations/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/quotation"
)]
pub async fn get_quotation(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Quotation> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let result = sqlx::query_as::<_, Quotation>(
        only_own_schema_query!("srm", r#"
        SELECT q.id, q.quotation_no, q.inquiry_id, i.inquiry_no, q.supplier_id, s.name as supplier_name,
               q.title, q.total_amount, q.currency, q.valid_until, q.delivery_time, q.payment_terms,
               q.status, q.items, q.remarks, q.submitted_at, q.created_at, q.updated_at
        FROM srm.quotations q
        LEFT JOIN srm.inquiries i ON q.inquiry_id = i.id
        LEFT JOIN srm.suppliers s ON q.supplier_id = s.id
        WHERE q.id = $1 AND q.status IN ('pending','awarded','rejected') AND q.deleted_at IS NULL
        "#, "srm"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(quotation)) => ApiResponse::success(quotation, "获取报价成功"),
        Ok(None) => ApiResponse::<Quotation>::not_found("报价不存在"),
        Err(e) => {
            tracing::error!("获取报价失败: {}", e);
            ApiResponse::<Quotation>::server_error("获取报价失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["srm:quotation:write"])),
    path = "/quotations/{id}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/quotation"
)]
pub async fn update_quotation(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateQuotationRequest>,
) -> ApiResponse<Quotation> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let now = Utc::now();

    let valid_until = req.valid_until.and_then(|s| {
        DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    if let Some(amount) = req.total_amount {
        if !amount.is_finite() || amount < 0.0 {
            return ApiResponse::<Quotation>::bad_request("报价金额不能为负数");
        }
    }

    let result = sqlx::query_as::<_, Quotation>(
        only_own_schema_query!("srm", r#"
        UPDATE srm.quotations SET
            title = COALESCE($2, title),
            total_amount = COALESCE($3, total_amount),
            currency = COALESCE($4, currency),
            valid_until = COALESCE($5, valid_until),
            delivery_time = COALESCE($6, delivery_time),
            payment_terms = COALESCE($7, payment_terms),
            items = COALESCE($8, items),
            remarks = COALESCE($9, remarks),
            updated_at = $10
        WHERE id = $1 AND status = ANY($11::text[])
        RETURNING id, quotation_no, inquiry_id, inquiry_no, supplier_id, supplier_name,
            title, total_amount, currency, valid_until, delivery_time, payment_terms, status, items, remarks, submitted_at, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(req.title)
    .bind(req.total_amount)
    .bind(req.currency)
    .bind(valid_until)
    .bind(req.delivery_time)
    .bind(req.payment_terms)
    .bind(req.items)
    .bind(req.remarks)
    .bind(now)
    .bind(
        QuotationStatus::pending_from()
            .iter()
            .map(|s| s.as_db_str().to_string())
            .collect::<Vec<_>>(),
    )
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(quotation)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);

                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(quotation, "报价更新成功")
        }
        Ok(None) => ApiResponse::<Quotation>::bad_request("报价状态不允许修改"),
        Err(e) => {
            tracing::error!("更新报价失败: {}", e);
            ApiResponse::<Quotation>::server_error("报价更新失败")
        }
    }
}

pub async fn delete_quotation(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<bool> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let result = sqlx::query(only_own_schema_query!(
        "srm",
        "UPDATE srm.quotations SET deleted_at = NOW() WHERE id = $1 AND status = ANY($2::text[])",
        "srm"
    ))
    .bind(id)
    .bind(
        QuotationStatus::pending_from()
            .iter()
            .map(|s| s.as_db_str().to_string())
            .collect::<Vec<_>>(),
    )
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
            ApiResponse::success(true, "报价删除成功")
        }
        Ok(_) => ApiResponse::<bool>::not_found("报价不存在"),
        Err(e) => {
            tracing::error!("删除报价失败: {}", e);
            ApiResponse::<bool>::server_error("报价删除失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["srm:quotation:write"])),
    path = "/quotations/{id}/award",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/quotation"
)]
pub async fn award_quotation(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Quotation> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let now = Utc::now();

    let result = sqlx::query_as::<_, Quotation>(
        only_own_schema_query!("srm", r#"
        UPDATE srm.quotations SET
            status = $2,
            updated_at = $3
        WHERE id = $1 AND status = ANY($4::text[])
        RETURNING id, quotation_no, inquiry_id, inquiry_no, supplier_id, supplier_name,
            title, total_amount, currency, valid_until, delivery_time, payment_terms, status, items, remarks, submitted_at, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(QuotationStatus::Awarded.as_db_str())
    .bind(now)
    .bind(
        QuotationStatus::pending_from()
            .iter()
            .map(|s| s.as_db_str().to_string())
            .collect::<Vec<_>>(),
    )
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(quotation)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);

                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(quotation, "报价已中标")
        }
        Ok(None) => ApiResponse::<Quotation>::bad_request("报价状态不允许中标"),
        Err(e) => {
            tracing::error!("中标报价失败: {}", e);
            ApiResponse::<Quotation>::server_error("中标报价失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["srm:quotation:write"])),
    path = "/quotations/{id}/reject",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/quotation"
)]
pub async fn reject_quotation(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Quotation> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let now = Utc::now();

    let result = sqlx::query_as::<_, Quotation>(
        only_own_schema_query!("srm", r#"
        UPDATE srm.quotations SET
            status = $2,
            updated_at = $3
        WHERE id = $1 AND status = ANY($4::text[])
        RETURNING id, quotation_no, inquiry_id, inquiry_no, supplier_id, supplier_name,
            title, total_amount, currency, valid_until, delivery_time, payment_terms, status, items, remarks, submitted_at, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(QuotationStatus::Rejected.as_db_str())
    .bind(now)
    .bind(
        QuotationStatus::pending_from()
            .iter()
            .map(|s| s.as_db_str().to_string())
            .collect::<Vec<_>>(),
    )
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(quotation)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("事务提交失败: {}", e);

                    return ApiResponse::server_error("事务提交失败");
                }
            }
            ApiResponse::success(quotation, "报价已拒绝")
        }
        Ok(None) => ApiResponse::<Quotation>::bad_request("报价状态不允许拒绝"),
        Err(e) => {
            tracing::error!("拒绝报价失败: {}", e);
            ApiResponse::<Quotation>::server_error("拒绝报价失败")
        }
    }
}
