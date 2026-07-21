use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use super::ApiState;

use crate::models::price_comparison::{
    CreatePriceComparisonRequest, CreatePurchaseInquiryRequest, CreateSupplierQuoteRequest,
    PurchaseInquiry,
};
use crate::shared::permission::{check_permission, ModulePermission};
use topems_shared::{api_error, auth::Claims, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct InquiryPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct InquiryItem {
    pub id: Uuid,
    pub item_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: Option<f64>,
    pub target_price: Option<f64>,
    pub remarks: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuoteItem {
    pub id: Uuid,
    pub item_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: Option<f64>,
    pub target_price: Option<f64>,
    pub unit_price: Option<f64>,
    pub total_price: Option<f64>,
    pub lead_time_days: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuoteListRecord {
    pub id: Uuid,
    pub inquiry_id: Uuid,
    pub supplier_id: Uuid,
    pub quote_no: String,
    pub quote_date: DateTime<Utc>,
    pub total_amount: Option<f64>,
    pub currency: String,
    pub delivery_days: Option<i32>,
    pub valid_until: Option<DateTime<Utc>>,
    pub payment_terms: Option<String>,
    pub status: String,
    pub remarks: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub supplier_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ComparisonListRecord {
    pub id: Uuid,
    pub inquiry_id: Uuid,
    pub comparison_no: String,
    pub compared_at: DateTime<Utc>,
    pub recommended_supplier_id: Option<Uuid>,
    pub recommended_quote_id: Option<Uuid>,
    pub total_score: Option<f64>,
    pub quality_score: Option<f64>,
    pub price_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub remarks: Option<String>,
    pub created_by: Option<Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub recommended_supplier_name: Option<String>,
    pub inquiry_title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ComparisonItemRecord {
    pub id: Uuid,
    pub supplier_id: Uuid,
    pub quote_id: Uuid,
    pub quality_score: Option<f64>,
    pub price_score: Option<f64>,
    pub delivery_score: Option<f64>,
    pub service_score: Option<f64>,
    pub total_score: Option<f64>,
    pub rank: Option<i32>,
    pub remarks: Option<String>,
    pub supplier_name: Option<String>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/inquiries", get(list_inquiries).post(create_inquiry))
        .route(
            "/api/inquiries/{id}",
            get(get_inquiry).delete(delete_inquiry),
        )
        .route("/api/inquiries/{id}/publish", post(publish_inquiry))
        .route("/quotes", get(list_quotes).post(create_quote))
        .route("/api/quotes/{id}", get(get_quote).put(update_quote))
        .route("/api/quotes/{id}/submit", post(submit_quote))
        .route(
            "/comparisons",
            get(list_comparisons).post(create_comparison),
        )
        .route("/api/comparisons/{id}", get(get_comparison))
        .route("/api/comparisons/{id}/approve", post(approve_comparison))
}

async fn list_inquiries(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InquiryPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, PurchaseInquiry>(
        r#"
        SELECT id, inquiry_no, title, description, inquiry_date, deadline, status, created_by, created_at, updated_at
        FROM scm.purchase_inquiries
        WHERE ($1::text IS NULL OR title ILIKE $1 OR inquiry_no ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND deleted_at IS NULL
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
        Ok(inquiries) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM scm.purchase_inquiries
                WHERE ($1::text IS NULL OR title ILIKE $1 OR inquiry_no ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND deleted_at IS NULL
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "inquiries": inquiries,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取询价单列表成功",
            ))
        }
        Err(e) => Json(api_error(500, &format!("获取询价单列表失败: {}", e))),
    }
}

async fn create_inquiry(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreatePurchaseInquiryRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let id = Uuid::new_v4();
    let inquiry_no = format!("INQ-{}", Utc::now().format("%Y%m%d%H%M"));
    let now = Utc::now();

    let result = sqlx::query_as::<_, PurchaseInquiry>(
        r#"
        INSERT INTO scm.purchase_inquiries (id, inquiry_no, title, description, inquiry_date, deadline, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8)
        RETURNING id, inquiry_no, title, description, inquiry_date, deadline, status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&inquiry_no)
    .bind(&req.title)
    .bind(&req.description)
    .bind(now)
    .bind(&req.deadline)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(inquiry) => {
            for item in req.items {
                let _ = sqlx::query(
                    r#"
                    INSERT INTO scm.purchase_inquiry_items (id, inquiry_id, item_name, specification, unit, quantity, target_price, remarks)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    "#,
                )
                .bind(Uuid::new_v4())
                .bind(id)
                .bind(&item.item_name)
                .bind(&item.specification)
                .bind(&item.unit)
                .bind(item.quantity)
                .bind(item.target_price)
                .bind(&item.remarks)
                .execute(&state.db)
                .await;
            }

            Json(ApiResponse::success(
                serde_json::json!(inquiry),
                "创建询价单成功",
            ))
        }
        Err(e) => Json(api_error(500, &format!("创建询价单失败: {}", e))),
    }
}

async fn get_inquiry(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, PurchaseInquiry>(
        r#"
        SELECT id, inquiry_no, title, description, inquiry_date, deadline, status, created_by, created_at, updated_at
        FROM scm.purchase_inquiries
        WHERE id = $1 AND deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(inquiry)) => {
            let items = sqlx::query_as::<_, InquiryItem>(
                r#"
                SELECT id, item_name, specification, unit, quantity, target_price, remarks
                FROM scm.purchase_inquiry_items
                WHERE inquiry_id = $1
                "#,
            )
            .bind(id)
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();

            let quotes_count = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM scm.supplier_quotes WHERE inquiry_id = $1 AND deleted_at IS NULL",
            )
            .bind(id)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "inquiry": inquiry,
                    "items": items,
                    "quotes_count": quotes_count
                }),
                "获取询价单详情成功",
            ))
        }
        Ok(None) => Json(api_error(404, "询价单不存在")),
        Err(e) => Json(api_error(500, &format!("获取询价单详情失败: {}", e))),
    }
}

async fn delete_inquiry(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"
        UPDATE scm.purchase_inquiries
        SET deleted_at = $1, status = 'cancelled'
        WHERE id = $2 AND status = 'draft'
        "#,
    )
    .bind(Utc::now())
    .bind(id)
    .execute(&state.db)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({"id": id}),
            "删除询价单成功",
        )),
        Ok(_) => Json(api_error(400, "只能删除草稿状态的询价单")),
        Err(e) => Json(api_error(500, &format!("删除询价单失败: {}", e))),
    }
}

async fn publish_inquiry(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"
        UPDATE scm.purchase_inquiries
        SET status = 'published', updated_at = $1
        WHERE id = $2 AND status = 'draft'
        "#,
    )
    .bind(Utc::now())
    .bind(id)
    .execute(&state.db)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({"id": id}),
            "询价单已发布",
        )),
        Ok(_) => Json(api_error(400, "只能发布草稿状态的询价单")),
        Err(e) => Json(api_error(500, &format!("发布询价单失败: {}", e))),
    }
}

async fn list_quotes(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InquiryPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, QuoteListRecord>(
        r#"
        SELECT q.id, q.inquiry_id, q.supplier_id, q.quote_no, q.quote_date, q.total_amount, 
               q.currency, q.delivery_days, q.valid_until, q.payment_terms, q.status, q.remarks, 
               q.created_at, q.updated_at,
               s.name as supplier_name
        FROM scm.supplier_quotes q
        LEFT JOIN scm.suppliers s ON q.supplier_id = s.id
        WHERE ($1::text IS NULL OR q.quote_no ILIKE $1 OR s.name ILIKE $1)
          AND ($2::text IS NULL OR q.status = $2)
          AND q.deleted_at IS NULL
        ORDER BY q.created_at DESC
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
        Ok(quotes) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM scm.supplier_quotes q
                LEFT JOIN scm.suppliers s ON q.supplier_id = s.id
                WHERE ($1::text IS NULL OR q.quote_no ILIKE $1 OR s.name ILIKE $1)
                  AND ($2::text IS NULL OR q.status = $2)
                  AND q.deleted_at IS NULL
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "quotes": quotes,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取报价单列表成功",
            ))
        }
        Err(e) => Json(api_error(500, &format!("获取报价单列表失败: {}", e))),
    }
}

async fn create_quote(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSupplierQuoteRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let id = Uuid::new_v4();
    let quote_no = format!("QT-{}", Utc::now().format("%Y%m%d%H%M"));
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        INSERT INTO scm.supplier_quotes (id, supplier_id, quote_no, quote_date, currency, delivery_days, valid_until, payment_terms, status, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, $10, $11)
        "#,
    )
    .bind(id)
    .bind(req.supplier_id)
    .bind(&quote_no)
    .bind(now)
    .bind("CNY")
    .bind(req.delivery_days)
    .bind(&req.valid_until)
    .bind(&req.payment_terms)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(
            serde_json::json!({"id": id, "quote_no": quote_no}),
            "创建报价单成功",
        )),
        Err(e) => Json(api_error(500, &format!("创建报价单失败: {}", e))),
    }
}

async fn get_quote(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, QuoteListRecord>(
        r#"
        SELECT q.id, q.inquiry_id, q.supplier_id, q.quote_no, q.quote_date, q.total_amount,
               q.currency, q.delivery_days, q.valid_until, q.payment_terms, q.status, q.remarks,
               q.created_at, q.updated_at,
               s.name as supplier_name
        FROM scm.supplier_quotes q
        LEFT JOIN scm.suppliers s ON q.supplier_id = s.id
        WHERE q.id = $1 AND q.deleted_at IS NULL
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(quote)) => {
            let items = sqlx::query_as::<_, QuoteItem>(
                r#"
                SELECT qi.id, qi.item_name, qi.specification, qi.unit, qi.quantity, qi.target_price,
                       sqi.unit_price, sqi.total_price, sqi.lead_time_days
                FROM scm.supplier_quote_items sqi
                JOIN scm.purchase_inquiry_items qi ON sqi.inquiry_item_id = qi.id
                WHERE sqi.quote_id = $1
                "#,
            )
            .bind(id)
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();

            Json(ApiResponse::success(
                serde_json::json!({
                    "quote": quote,
                    "items": items
                }),
                "获取报价单详情成功",
            ))
        }
        Ok(None) => Json(api_error(404, "报价单不存在")),
        Err(e) => Json(api_error(500, &format!("获取报价单详情失败: {}", e))),
    }
}

async fn update_quote(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateSupplierQuoteRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"
        UPDATE scm.supplier_quotes
        SET delivery_days = $1, valid_until = $2, payment_terms = $3, remarks = $4, updated_at = $5
        WHERE id = $6 AND status = 'draft'
        "#,
    )
    .bind(req.delivery_days)
    .bind(&req.valid_until)
    .bind(&req.payment_terms)
    .bind(&req.remarks)
    .bind(Utc::now())
    .bind(id)
    .execute(&state.db)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({"id": id}),
            "更新报价单成功",
        )),
        Ok(_) => Json(api_error(400, "只能更新草稿状态的报价单")),
        Err(e) => Json(api_error(500, &format!("更新报价单失败: {}", e))),
    }
}

async fn submit_quote(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query(
        r#"
        UPDATE scm.supplier_quotes
        SET status = 'submitted', updated_at = $1
        WHERE id = $2 AND status = 'draft'
        "#,
    )
    .bind(Utc::now())
    .bind(id)
    .execute(&state.db)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({"id": id}),
            "报价单已提交",
        )),
        Ok(_) => Json(api_error(400, "只能提交草稿状态的报价单")),
        Err(e) => Json(api_error(500, &format!("提交报价单失败: {}", e))),
    }
}

pub async fn list_comparisons(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InquiryPaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, ComparisonListRecord>(
        r#"
        SELECT c.id, c.inquiry_id, c.comparison_no, c.compared_at, c.recommended_supplier_id,
               c.recommended_quote_id, c.total_score, c.quality_score, c.price_score,
               c.delivery_score, c.service_score, c.remarks, c.created_by, c.created_at, c.updated_at,
               s.name as recommended_supplier_name,
               i.title as inquiry_title
        FROM scm.price_comparisons c
        LEFT JOIN scm.suppliers s ON c.recommended_supplier_id = s.id
        LEFT JOIN scm.purchase_inquiries i ON c.inquiry_id = i.id
        WHERE $1::text IS NULL OR c.comparison_no ILIKE $1 OR i.title ILIKE $1
        ORDER BY c.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&search_pattern)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(comparisons) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM scm.price_comparisons c
                LEFT JOIN scm.purchase_inquiries i ON c.inquiry_id = i.id
                WHERE $1::text IS NULL OR c.comparison_no ILIKE $1 OR i.title ILIKE $1
                "#,
            )
            .bind(&search_pattern)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "comparisons": comparisons,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取比价分析列表成功",
            ))
        }
        Err(e) => Json(api_error(500, &format!("获取比价分析列表失败: {}", e))),
    }
}

pub async fn create_comparison(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreatePriceComparisonRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let id = Uuid::new_v4();
    let comparison_no = format!("PC-{}", Utc::now().format("%Y%m%d%H%M"));
    let now = Utc::now();

    let total_score = req.quality_score.unwrap_or(0.0) * 0.3
        + req.price_score.unwrap_or(0.0) * 0.4
        + req.delivery_score.unwrap_or(0.0) * 0.2
        + req.service_score.unwrap_or(0.0) * 0.1;

    let result = sqlx::query(
        r#"
        INSERT INTO scm.price_comparisons (id, comparison_no, compared_at, recommended_supplier_id, 
                                       recommended_quote_id, total_score, quality_score, price_score, 
                                       delivery_score, service_score, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        "#,
    )
    .bind(id)
    .bind(&comparison_no)
    .bind(now)
    .bind(req.recommended_supplier_id)
    .bind(req.recommended_quote_id)
    .bind(total_score)
    .bind(req.quality_score)
    .bind(req.price_score)
    .bind(req.delivery_score)
    .bind(req.service_score)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => {
            let mut rank = 1;
            for item in req.supplier_scores {
                let item_total = item.quality_score * 0.3
                    + item.price_score * 0.4
                    + item.delivery_score * 0.2
                    + item.service_score * 0.1;

                let _ = sqlx::query(
                    r#"
                    INSERT INTO scm.price_comparison_items (id, comparison_id, supplier_id, quote_id, quality_score, 
                                                        price_score, delivery_score, service_score, total_score, rank, remarks)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    "#,
                )
                .bind(Uuid::new_v4())
                .bind(id)
                .bind(item.supplier_id)
                .bind(item.quote_id)
                .bind(item.quality_score)
                .bind(item.price_score)
                .bind(item.delivery_score)
                .bind(item.service_score)
                .bind(item_total)
                .bind(rank)
                .bind(&item.remarks)
                .execute(&state.db)
                .await;

                rank += 1;
            }

            Json(ApiResponse::success(
                serde_json::json!({"id": id, "comparison_no": comparison_no, "total_score": total_score}),
                "创建比价分析成功",
            ))
        }
        Err(e) => Json(api_error(500, &format!("创建比价分析失败: {}", e))),
    }
}

pub async fn get_comparison(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonRead).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let result = sqlx::query_as::<_, ComparisonListRecord>(
        r#"
        SELECT c.id, c.inquiry_id, c.comparison_no, c.compared_at, c.recommended_supplier_id,
               c.recommended_quote_id, c.total_score, c.quality_score, c.price_score,
               c.delivery_score, c.service_score, c.remarks, c.created_by, c.created_at, c.updated_at,
               s.name as recommended_supplier_name,
               i.title as inquiry_title
        FROM scm.price_comparisons c
        LEFT JOIN scm.suppliers s ON c.recommended_supplier_id = s.id
        LEFT JOIN scm.purchase_inquiries i ON c.inquiry_id = i.id
        WHERE c.id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(comparison)) => {
            let items = sqlx::query_as::<_, ComparisonItemRecord>(
                r#"
                SELECT ci.id, ci.supplier_id, ci.quote_id, ci.quality_score, ci.price_score,
                       ci.delivery_score, ci.service_score, ci.total_score, ci.rank, ci.remarks,
                       s.name as supplier_name
                FROM scm.price_comparison_items ci
                LEFT JOIN scm.suppliers s ON ci.supplier_id = s.id
                WHERE ci.comparison_id = $1
                ORDER BY ci.rank
                "#,
            )
            .bind(id)
            .fetch_all(&state.db)
            .await
            .unwrap_or_default();

            Json(ApiResponse::success(
                serde_json::json!({
                    "comparison": comparison,
                    "items": items
                }),
                "获取比价分析详情成功",
            ))
        }
        Ok(None) => Json(api_error(404, "比价分析不存在")),
        Err(e) => Json(api_error(500, &format!("获取比价分析详情失败: {}", e))),
    }
}

pub async fn approve_comparison(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonWrite).await {
        Ok(_) => {}
        Err(e) => return e,
    }
    let now_str = Utc::now().to_rfc3339();
    let now = Utc::now();

    let result = sqlx::query(
        r#"
        UPDATE scm.price_comparisons
        SET remarks = CONCAT(COALESCE(remarks, ''), ' | 已审批: ', $1), updated_at = $2
        WHERE id = $3
        "#,
    )
    .bind(now_str)
    .bind(now)
    .bind(id)
    .execute(&state.db)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(
            serde_json::json!({"id": id}),
            "比价分析已审批",
        )),
        Ok(_) => Json(api_error(404, "比价分析不存在")),
        Err(e) => Json(api_error(500, &format!("审批比价分析失败: {}", e))),
    }
}
