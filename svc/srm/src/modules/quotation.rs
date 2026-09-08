use topems_shared_boundary::only_own_schema_query;
use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{CreateQuotationRequest, Quotation, UpdateQuotationRequest};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ListQuotationParams {
    pub inquiry_id: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
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

async fn list_quotations(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListQuotationParams>,
) -> Json<ApiResponse<Vec<Quotation>>> {
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
            WHERE q.deleted_at IS NULL AND q.inquiry_id = $1
            ORDER BY q.created_at DESC
            "#, "srm"),
        )
        .bind(inquiry_id)
        .fetch_all(&state.db)
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
            WHERE q.deleted_at IS NULL
            ORDER BY q.created_at DESC
            "#, "srm"),
        )
        .fetch_all(&state.db)
        .await
    };

    match result {
        Ok(quotations) => Json(ApiResponse::success(quotations, "获取报价列表成功")),
        Err(e) => {
            tracing::error!("获取报价列表失败: {}", e);
            Json(ApiResponse::<Vec<Quotation>>::error(
                500,
                "获取报价列表失败",
            ))
        }
    }
}

async fn create_quotation(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateQuotationRequest>,
) -> Json<ApiResponse<Quotation>> {
    let inquiry_id = match Uuid::parse_str(&req.inquiry_id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::<Quotation>::error(400, "无效的询价ID")),
    };

    let supplier_id = match Uuid::parse_str(&req.supplier_id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::<Quotation>::error(400, "无效的供应商ID")),
    };

    let inquiry = match sqlx::query_scalar::<_, String>(
        only_own_schema_query!("srm", "SELECT inquiry_no FROM srm.inquiries WHERE id = $1", "srm"),
    )
    .bind(inquiry_id)
    .fetch_optional(&state.db)
    .await
    {
        Ok(Some(i)) => i,
        Ok(None) => return Json(ApiResponse::<Quotation>::error(400, "询价不存在")),
        Err(e) => {
            tracing::error!("查询询价失败: {}", e);
            return Json(ApiResponse::<Quotation>::error(500, "查询询价失败"));
        }
    };

    let supplier_name = match sqlx::query_scalar::<_, Option<String>>(
        only_own_schema_query!("srm", "SELECT name FROM srm.suppliers WHERE id = $1", "srm"),
    )
    .bind(supplier_id)
    .fetch_optional(&state.db)
    .await
    {
        Ok(n) => n,
        Err(e) => {
            tracing::error!("查询供应商失败: {}", e);
            return Json(ApiResponse::<Quotation>::error(500, "查询供应商失败"));
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
            title, total_amount, currency, valid_until, delivery_time, payment_terms, status, items, remarks, submitted_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
    .bind("pending")
    .bind(&req.items)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(quotation) => Json(ApiResponse::success(quotation, "报价创建成功")),
        Err(e) => {
            tracing::error!("创建报价失败: {}", e);
            Json(ApiResponse::<Quotation>::error(500, "报价创建失败"))
        }
    }
}

async fn get_quotation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Quotation>> {
    let result = sqlx::query_as::<_, Quotation>(
        only_own_schema_query!("srm", r#"
        SELECT q.id, q.quotation_no, q.inquiry_id, i.inquiry_no, q.supplier_id, s.name as supplier_name,
               q.title, q.total_amount, q.currency, q.valid_until, q.delivery_time, q.payment_terms,
               q.status, q.items, q.remarks, q.submitted_at, q.created_at, q.updated_at
        FROM srm.quotations q
        LEFT JOIN srm.inquiries i ON q.inquiry_id = i.id
        LEFT JOIN srm.suppliers s ON q.supplier_id = s.id
        WHERE q.id = $1 AND q.deleted_at IS NULL
        "#, "srm"),
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(quotation)) => Json(ApiResponse::success(quotation, "获取报价成功")),
        Ok(None) => Json(ApiResponse::<Quotation>::error(404, "报价不存在")),
        Err(e) => {
            tracing::error!("获取报价失败: {}", e);
            Json(ApiResponse::<Quotation>::error(500, "获取报价失败"))
        }
    }
}

async fn update_quotation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateQuotationRequest>,
) -> Json<ApiResponse<Quotation>> {
    let now = Utc::now();

    let valid_until = req.valid_until.and_then(|s| {
        DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

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
        WHERE id = $1 AND status = 'pending'
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
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(quotation)) => Json(ApiResponse::success(quotation, "报价更新成功")),
        Ok(None) => Json(ApiResponse::<Quotation>::error(400, "报价状态不允许修改")),
        Err(e) => {
            tracing::error!("更新报价失败: {}", e);
            Json(ApiResponse::<Quotation>::error(500, "报价更新失败"))
        }
    }
}

async fn delete_quotation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let result = sqlx::query(only_own_schema_query!("srm", "UPDATE srm.quotations SET deleted_at = NOW() WHERE id = $1", "srm"))
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "报价删除成功")),
        Ok(_) => Json(ApiResponse::<bool>::error(404, "报价不存在")),
        Err(e) => {
            tracing::error!("删除报价失败: {}", e);
            Json(ApiResponse::<bool>::error(500, "报价删除失败"))
        }
    }
}

async fn award_quotation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Quotation>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Quotation>(
        only_own_schema_query!("srm", r#"
        UPDATE srm.quotations SET
            status = 'awarded',
            updated_at = $2
        WHERE id = $1 AND status = 'pending'
        RETURNING id, quotation_no, inquiry_id, inquiry_no, supplier_id, supplier_name,
            title, total_amount, currency, valid_until, delivery_time, payment_terms, status, items, remarks, submitted_at, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(quotation)) => Json(ApiResponse::success(quotation, "报价已中标")),
        Ok(None) => Json(ApiResponse::<Quotation>::error(400, "报价状态不允许中标")),
        Err(e) => {
            tracing::error!("中标报价失败: {}", e);
            Json(ApiResponse::<Quotation>::error(500, "中标报价失败"))
        }
    }
}

async fn reject_quotation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Quotation>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Quotation>(
        only_own_schema_query!("srm", r#"
        UPDATE srm.quotations SET
            status = 'rejected',
            updated_at = $2
        WHERE id = $1 AND status = 'pending'
        RETURNING id, quotation_no, inquiry_id, inquiry_no, supplier_id, supplier_name,
            title, total_amount, currency, valid_until, delivery_time, payment_terms, status, items, remarks, submitted_at, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(quotation)) => Json(ApiResponse::success(quotation, "报价已拒绝")),
        Ok(None) => Json(ApiResponse::<Quotation>::error(400, "报价状态不允许拒绝")),
        Err(e) => {
            tracing::error!("拒绝报价失败: {}", e);
            Json(ApiResponse::<Quotation>::error(500, "拒绝报价失败"))
        }
    }
}
