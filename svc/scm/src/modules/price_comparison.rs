use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_boundary::only_own_schema_query;
use uuid::Uuid;

use super::supplier_quote_status::SupplierQuoteStatus;
use super::ApiState;

use crate::models::price_comparison::{
    CreatePriceComparisonRequest, CreateSupplierQuoteRequest, UpdatePriceComparisonRequest,
};
use crate::shared::permission::{check_permission, require_tenant_bind, ModulePermission};
use topems_shared_auth::auth::Claims;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use topems_shared_core::TopemsError;

// =============================================================================
// Pure functions for price comparison / supplier quote scoring
// =============================================================================

/// 综合评分：价格 (40%) + 质量 (30%) + 交付 (20%) + 服务 (10%)
/// 输入为 0-100 的各维度分（None 按 0 计）
pub fn calculate_comparison_total_score(
    price_score: Option<f64>,
    quality_score: Option<f64>,
    delivery_score: Option<f64>,
    service_score: Option<f64>,
) -> f64 {
    let p = price_score.unwrap_or(0.0).clamp(0.0, 100.0);
    let q = quality_score.unwrap_or(0.0).clamp(0.0, 100.0);
    let d = delivery_score.unwrap_or(0.0).clamp(0.0, 100.0);
    let s = service_score.unwrap_or(0.0).clamp(0.0, 100.0);
    (p * 40.0 + q * 30.0 + d * 20.0 + s * 10.0) / 100.0
}

/// 基于单价的价格评分：最低报价得 100，其他按 price_min / price_this × 100 递减
/// 所有价格 ≤ 0 返回 0；输入长度为 0 返回空 vec
pub fn score_quotes_by_price(unit_prices: &[f64]) -> Vec<f64> {
    let valid: Vec<f64> = unit_prices.iter().map(|p| p.max(0.0)).collect();
    let min_price = valid
        .iter()
        .filter(|&&p| p > 0.0)
        .copied()
        .fold(f64::INFINITY, f64::min);
    if !min_price.is_finite() {
        return vec![0.0; unit_prices.len()];
    }
    valid
        .iter()
        .map(|&p| {
            if p <= 0.0 {
                0.0
            } else {
                (min_price / p * 100.0).min(100.0)
            }
        })
        .collect()
}

#[allow(clippy::as_conversions)]
/// 基于提前期的交付评分（天越少分越高）
/// 最短交付得 100；交付时间是最短的 2 倍得 50；超 5 倍按 0 分截断
pub fn score_quotes_by_lead_time(lead_times_days: &[i32]) -> Vec<f64> {
    if lead_times_days.is_empty() {
        return vec![];
    }
    let best = lead_times_days
        .iter()
        .copied()
        .filter(|&d| d > 0)
        .min()
        .unwrap_or(1);
    let best = best.max(1) as f64;
    lead_times_days
        .iter()
        .map(|&d| {
            if d <= 0 {
                0.0
            } else {
                let ratio = best / d as f64;
                (ratio * 100.0).max(0.0).min(100.0)
            }
        })
        .collect()
}

/// 报价单项总价校验：total = unit × qty（允许 0.01 误差）
pub fn validate_quote_total(unit_price: f64, quantity: f64, total_price: f64) -> bool {
    if unit_price < 0.0 || quantity < 0.0 || total_price < 0.0 {
        return false;
    }
    let expected = unit_price * quantity;
    let tolerance: f64 = 0.01_f64.max(expected.abs() * 0.001_f64);
    (expected - total_price).abs() <= tolerance
}

/// 报价有效期检查：valid_until <= today 则过期
pub fn is_quote_valid(valid_until: Option<DateTime<Utc>>, today: DateTime<Utc>) -> bool {
    match valid_until {
        None => true, // 未设期限 = 长期有效
        Some(until) => until >= today,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    #[test]
    fn test_comparison_total_score_full() {
        assert_eq!(
            calculate_comparison_total_score(Some(100.0), Some(100.0), Some(100.0), Some(100.0)),
            100.0
        );
        assert_eq!(
            calculate_comparison_total_score(Some(0.0), Some(0.0), Some(0.0), Some(0.0)),
            0.0
        );
    }

    #[test]
    fn test_comparison_total_score_weighted() {
        // Only price 100 → 40
        assert_eq!(
            calculate_comparison_total_score(Some(100.0), None, None, None),
            40.0
        );
        // Only quality 100 → 30
        assert_eq!(
            calculate_comparison_total_score(None, Some(100.0), None, None),
            30.0
        );
        // Only delivery 100 → 20
        assert_eq!(
            calculate_comparison_total_score(None, None, Some(100.0), None),
            20.0
        );
        // Only service 100 → 10
        assert_eq!(
            calculate_comparison_total_score(None, None, None, Some(100.0)),
            10.0
        );
    }

    #[test]
    fn test_comparison_total_score_clamps() {
        // Scores > 100 or < 0 should clamp
        let r = calculate_comparison_total_score(Some(200.0), Some(-50.0), None, None);
        // 200→100×0.4=40, -50→0 → total 40
        assert!((r - 40.0).abs() < 1e-9);
    }

    #[test]
    fn test_score_quotes_by_price_empty() {
        let r = score_quotes_by_price(&[]);
        assert!(r.is_empty());
    }

    #[test]
    fn test_score_quotes_by_price_same() {
        let r = score_quotes_by_price(&[50.0, 50.0, 50.0]);
        assert_eq!(r, vec![100.0, 100.0, 100.0]);
    }

    #[test]
    fn test_score_quotes_by_price_varied() {
        // min = 100, so:
        // 100 → 100, 150 → 100/150*100 = 66.66, 200 → 50
        let r = score_quotes_by_price(&[150.0, 100.0, 200.0]);
        assert!((r[0] - 66.666).abs() < 0.1);
        assert_eq!(r[1], 100.0);
        assert_eq!(r[2], 50.0);
    }

    #[test]
    fn test_score_quotes_by_price_zero_or_negative() {
        let r = score_quotes_by_price(&[0.0, -5.0, 100.0]);
        assert_eq!(r[0], 0.0);
        assert_eq!(r[1], 0.0);
        assert_eq!(r[2], 100.0);
    }

    #[test]
    fn test_score_quotes_by_price_all_invalid() {
        let r = score_quotes_by_price(&[0.0, 0.0]);
        assert_eq!(r, vec![0.0, 0.0]);
    }

    #[test]
    fn test_score_lead_time_empty() {
        let r = score_quotes_by_lead_time(&[]);
        assert!(r.is_empty());
    }

    #[test]
    fn test_score_lead_time_basic() {
        // best = 3 days
        // 3→100, 6→50, 15→20
        let r = score_quotes_by_lead_time(&[6, 15, 3]);
        assert!((r[0] - 50.0).abs() < 1e-9);
        assert!((r[1] - 20.0).abs() < 1e-9);
        assert_eq!(r[2], 100.0);
    }

    #[test]
    fn test_score_lead_time_invalid_days() {
        let r = score_quotes_by_lead_time(&[-1, 0, 5]);
        assert_eq!(r[0], 0.0);
        assert_eq!(r[1], 0.0);
        assert_eq!(r[2], 100.0);
    }

    #[test]
    fn test_validate_quote_total_ok() {
        assert!(validate_quote_total(12.5, 8.0, 100.0)); // exactly 100
        assert!(validate_quote_total(0.0, 100.0, 0.0));
        assert!(validate_quote_total(10.0, 0.0, 0.0));
        // small tolerance: 10 × 3 = 30, total = 30.001 (within 0.001×30 tolerance)
        assert!(validate_quote_total(10.0, 3.0, 30.001));
    }

    #[test]
    fn test_validate_quote_total_fail() {
        assert!(!validate_quote_total(10.0, 3.0, 25.0));
        assert!(!validate_quote_total(-5.0, 3.0, 15.0));
        assert!(!validate_quote_total(10.0, -2.0, 20.0));
        assert!(!validate_quote_total(10.0, 3.0, -30.0));
    }

    #[test]
    fn test_is_quote_valid() {
        let now = Utc::now();
        // No expiration → always valid
        assert!(is_quote_valid(None, now));
        // Expires in future → valid
        assert!(is_quote_valid(Some(now + Duration::days(30)), now));
        // Expires exactly now → valid
        assert!(is_quote_valid(Some(now), now));
        // Expired
        assert!(!is_quote_valid(Some(now - Duration::days(1)), now));
    }
}

#[derive(Debug, Deserialize)]
pub struct InquiryPaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuoteItem {
    pub id: Uuid,
    pub item_name: String,
    pub specification: Option<String>,
    pub unit: Option<String>,
    pub quantity: Option<f64>,
    pub target_price: Option<Decimal>,
    pub unit_price: Option<Decimal>,
    pub total_price: Option<Decimal>,
    pub lead_time_days: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct QuoteListRecord {
    pub id: Uuid,
    pub inquiry_id: Option<Uuid>,
    pub supplier_id: Uuid,
    pub quote_no: String,
    pub quote_date: DateTime<Utc>,
    pub total_amount: Option<Decimal>,
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
        .route("/quotes", get(list_quotes).post(create_quote))
        .route("/quotes/{id}", get(get_quote).put(update_quote))
        .route("/quotes/{id}/submit", post(submit_quote))
        .route(
            "/comparisons",
            get(list_comparisons).post(create_comparison),
        )
        .route(
            "/comparisons/{id}",
            get(get_comparison)
                .put(update_comparison)
                .delete(delete_comparison),
        )
        .route("/comparisons/{id}/approve", post(approve_comparison))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:quote:read"])),
    path = "/quotes",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/quote"
)]
pub async fn list_quotes(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InquiryPaginationParams>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let locale = Locale::from_headers(&headers).as_sql();
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = match params.status.as_deref() {
        None | Some("") | Some("all") => None,
        Some(raw) => match SupplierQuoteStatus::from_db_str(raw) {
            Some(value) => Some(value.as_db_str()),
            None => {
                return ApiResponse::from(TopemsError::ValidationFailed(
                    "无效的报价单状态".to_string(),
                ))
            }
        },
    };

    let result = sqlx::query_as::<_, QuoteListRecord>(only_own_schema_query!(
        "scm",
        r#"
        SELECT q.id, q.inquiry_id, q.supplier_id, q.quote_no, q.quote_date, q.total_amount,
               q.currency, q.delivery_days, q.valid_until, q.payment_terms, q.status, q.remarks,
               q.created_at, q.updated_at,
               CASE WHEN $6='en' THEN COALESCE(s.name_en, s.name) ELSE s.name END as supplier_name
        FROM scm.supplier_quotes q
        LEFT JOIN scm.suppliers s ON q.supplier_id = s.id
        WHERE ($1::text IS NULL OR q.quote_no ILIKE $1 OR s.name ILIKE $1)
          AND ($2::text IS NULL OR q.status = $2)
          AND q.deleted_at IS NULL
          AND q.tenant_id = $5::uuid
        ORDER BY q.created_at DESC
        LIMIT $3 OFFSET $4
        "#
    ))
    .bind(&search_pattern)
    .bind(status_filter)
    .bind(page_size)
    .bind(offset)
    .bind(tenant_bind)
    .bind(locale)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(mut quotes) => {
            for quote in &mut quotes {
                quote.status = SupplierQuoteStatus::normalize(&quote.status).to_string();
            }
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "scm",
                r#"
                SELECT COUNT(*) FROM scm.supplier_quotes q
                LEFT JOIN scm.suppliers s ON q.supplier_id = s.id
                WHERE ($1::text IS NULL OR q.quote_no ILIKE $1 OR s.name ILIKE $1)
                  AND ($2::text IS NULL OR q.status = $2)
                  AND q.deleted_at IS NULL
                  AND q.tenant_id = $3::uuid
                "#
            ))
            .bind(&search_pattern)
            .bind(status_filter)
            .bind(tenant_bind)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "quotes": quotes,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取报价单列表成功",
            )
        }
        Err(e) => ApiResponse::from(TopemsError::internal("获取报价单列表失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/scm/quotes",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM"
)]

pub async fn create_quote(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateSupplierQuoteRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let id = Uuid::new_v4();
    let quote_no = format!("QT-{}", Utc::now().format("%Y%m%d%H%M"));
    let now = Utc::now();

    let result = sqlx::query(
        only_own_schema_query!("scm", r#"
        INSERT INTO scm.supplier_quotes (id, supplier_id, quote_no, quote_date, currency, delivery_days, valid_until, payment_terms, status, remarks, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $13, $9, $10, $11, $12)
        "#),
    )
    .bind(id)
    .bind(req.supplier_id)
    .bind(&quote_no)
    .bind(now)
    .bind("CNY")
    .bind(req.delivery_days)
    .bind(req.valid_until)
    .bind(&req.payment_terms)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .bind(tenant_bind)
    .bind(SupplierQuoteStatus::Draft.as_db_str())
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("rls commit failed: {}", e);
            return ApiResponse::server_error("提交事务失败");
        }
    }

    match result {
        Ok(_) => ApiResponse::success(
            serde_json::json!({"id": id, "quote_no": quote_no}),
            "创建报价单成功",
        ),
        Err(e) => ApiResponse::from(TopemsError::internal("创建报价单失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:quote:read"])),
    path = "/quotes/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/quote"
)]
pub async fn get_quote(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let locale = Locale::from_headers(&headers).as_sql();
    let result = sqlx::query_as::<_, QuoteListRecord>(only_own_schema_query!(
        "scm",
        r#"
        SELECT q.id, q.inquiry_id, q.supplier_id, q.quote_no, q.quote_date, q.total_amount,
               q.currency, q.delivery_days, q.valid_until, q.payment_terms, q.status, q.remarks,
               q.created_at, q.updated_at,
               CASE WHEN $3='en' THEN COALESCE(s.name_en, s.name) ELSE s.name END as supplier_name
        FROM scm.supplier_quotes q
        LEFT JOIN scm.suppliers s ON q.supplier_id = s.id
        WHERE q.id = $1 AND q.deleted_at IS NULL AND q.tenant_id = $2::uuid
        "#
    ))
    .bind(id)
    .bind(tenant_bind)
    .bind(locale)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(mut quote)) => {
            quote.status = SupplierQuoteStatus::normalize(&quote.status).to_string();
            let items = sqlx::query_as::<_, QuoteItem>(only_own_schema_query!(
                "scm",
                r#"
                SELECT qi.id, qi.item_name, qi.specification, qi.unit, qi.quantity::float8, qi.target_price,
                       sqi.unit_price, sqi.total_price, sqi.lead_time_days
                FROM scm.supplier_quote_items sqi
                JOIN scm.purchase_inquiry_items qi ON sqi.inquiry_item_id = qi.id
                WHERE sqi.quote_id = $1 AND sqi.tenant_id = $2::uuid
                "#
            ))
            .bind(id)
            .bind(tenant_bind)
            .fetch_all(&mut **txn)
            .await
            .unwrap_or_default();

            ApiResponse::success(
                serde_json::json!({
                    "quote": quote,
                    "items": items
                }),
                "获取报价单详情成功",
            )
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("报价单不存在".to_string())),
        Err(e) => ApiResponse::from(TopemsError::internal("获取报价单详情失败", e)),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = [])),
    path = "/api/scm/quotes/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM"
)]

pub async fn update_quote(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateSupplierQuoteRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        UPDATE scm.supplier_quotes
        SET delivery_days = $1, valid_until = $2, payment_terms = $3, remarks = $4, updated_at = $5
        WHERE id = $6 AND status = $8 AND tenant_id = $7::uuid
        "#
    ))
    .bind(req.delivery_days)
    .bind(req.valid_until)
    .bind(&req.payment_terms)
    .bind(&req.remarks)
    .bind(Utc::now())
    .bind(id)
    .bind(tenant_bind)
    .bind(SupplierQuoteStatus::Draft.as_db_str())
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("rls commit failed: {}", e);
            return ApiResponse::server_error("提交事务失败");
        }
    }

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            ApiResponse::success(serde_json::json!({"id": id}), "更新报价单成功")
        }
        Ok(_) => ApiResponse::from(TopemsError::ValidationFailed(
            "只能更新草稿状态的报价单".to_string(),
        )),
        Err(e) => ApiResponse::from(TopemsError::internal("更新报价单失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:quote:write"])),
    path = "/quotes/{id}/submit",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/quote"
)]
pub async fn submit_quote(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        UPDATE scm.supplier_quotes
        SET status = $4, updated_at = $1
        WHERE id = $2 AND status = $5 AND tenant_id = $3::uuid
        "#
    ))
    .bind(Utc::now())
    .bind(id)
    .bind(tenant_bind)
    .bind(SupplierQuoteStatus::Submitted.as_db_str())
    .bind(SupplierQuoteStatus::Draft.as_db_str())
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("rls commit failed: {}", e);
            return ApiResponse::server_error("提交事务失败");
        }
    }

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            ApiResponse::success(serde_json::json!({"id": id}), "报价单已提交")
        }
        Ok(_) => ApiResponse::from(TopemsError::ValidationFailed(
            "只能提交草稿状态的报价单".to_string(),
        )),
        Err(e) => ApiResponse::from(TopemsError::internal("提交报价单失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:comparison:read"])),
    path = "/comparisons",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/comparison"
)]
pub async fn list_comparisons(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<InquiryPaginationParams>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let locale = Locale::from_headers(&headers).as_sql();
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, ComparisonListRecord>(
        only_own_schema_query!("scm", r#"
        SELECT c.id, c.inquiry_id, c.comparison_no, c.compared_at, c.recommended_supplier_id,
               c.recommended_quote_id, c.total_score::float8, c.quality_score::float8, c.price_score::float8,
               c.delivery_score::float8, c.service_score::float8, c.remarks, c.created_by, c.created_at, c.updated_at,
               CASE WHEN $5='en' THEN COALESCE(s.name_en, s.name) ELSE s.name END as recommended_supplier_name,
               i.title as inquiry_title
        FROM scm.price_comparisons c
        LEFT JOIN scm.suppliers s ON c.recommended_supplier_id = s.id
        LEFT JOIN scm.purchase_inquiries i ON c.inquiry_id = i.id
        WHERE ($1::text IS NULL OR c.comparison_no ILIKE $1 OR i.title ILIKE $1)
          AND c.tenant_id = $4::uuid
        ORDER BY c.created_at DESC
        LIMIT $2 OFFSET $3
        "#),
    )
    .bind(&search_pattern)
    .bind(page_size)
    .bind(offset)
    .bind(tenant_bind)
    .bind(locale)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(comparisons) => {
            let count_result = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "scm",
                r#"
                SELECT COUNT(*) FROM scm.price_comparisons c
                LEFT JOIN scm.purchase_inquiries i ON c.inquiry_id = i.id
                WHERE ($1::text IS NULL OR c.comparison_no ILIKE $1 OR i.title ILIKE $1)
                  AND c.tenant_id = $2::uuid
                "#
            ))
            .bind(&search_pattern)
            .bind(tenant_bind)
            .fetch_one(&mut **txn)
            .await;

            let total = count_result.unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "comparisons": comparisons,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取比价分析列表成功",
            )
        }
        Err(e) => ApiResponse::from(TopemsError::internal("获取比价分析列表失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = [])),
    path = "/api/scm/comparisons",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM"
)]

pub async fn create_comparison(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreatePriceComparisonRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let id = Uuid::new_v4();
    let comparison_no = format!("PC-{}", Utc::now().format("%Y%m%d%H%M"));
    let now = Utc::now();

    let total_score = req.quality_score.unwrap_or(0.0) * 0.3
        + req.price_score.unwrap_or(0.0) * 0.4
        + req.delivery_score.unwrap_or(0.0) * 0.2
        + req.service_score.unwrap_or(0.0) * 0.1;

    let result = sqlx::query(
        only_own_schema_query!("scm", r#"
        INSERT INTO scm.price_comparisons (id, comparison_no, compared_at, recommended_supplier_id, 
                                       recommended_quote_id, total_score, quality_score, price_score, 
                                       delivery_score, service_score, remarks, created_at, updated_at, inquiry_id, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        "#),
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
    .bind(req.inquiry_id)
    .bind(tenant_bind)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(_) => {
            let mut rank = 1;
            for item in req.supplier_scores {
                let item_total = item.quality_score * 0.3
                    + item.price_score * 0.4
                    + item.delivery_score * 0.2
                    + item.service_score * 0.1;

                if let Err(e) = sqlx::query(
                    only_own_schema_query!("scm", r#"
                    INSERT INTO scm.price_comparison_items (id, comparison_id, supplier_id, quote_id, quality_score, 
                                                        price_score, delivery_score, service_score, total_score, rank, remarks, tenant_id)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    "#),
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
                .bind(tenant_bind)
                .execute(&mut **txn)
                .await
                {
                    tracing::error!(
                        "写入比价明细失败: comparison_id={}, supplier_id={}, err={}",
                        id,
                        item.supplier_id,
                        e
                    );
                    return ApiResponse::from(TopemsError::internal("创建比价明细失败", e));
                }

                rank += 1;
            }

            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }

            ApiResponse::success(
                serde_json::json!({"id": id, "comparison_no": comparison_no, "total_score": total_score}),
                "创建比价分析成功",
            )
        }
        Err(e) => ApiResponse::from(TopemsError::internal("创建比价分析失败", e)),
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["scm:comparison:read"])),
    path = "/comparisons/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/comparison"
)]
pub async fn get_comparison(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonRead).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let locale = Locale::from_headers(&headers).as_sql();
    let result = sqlx::query_as::<_, ComparisonListRecord>(
        only_own_schema_query!("scm", r#"
        SELECT c.id, c.inquiry_id, c.comparison_no, c.compared_at, c.recommended_supplier_id,
               c.recommended_quote_id, c.total_score::float8, c.quality_score::float8, c.price_score::float8,
               c.delivery_score::float8, c.service_score::float8, c.remarks, c.created_by, c.created_at, c.updated_at,
               CASE WHEN $3='en' THEN COALESCE(s.name_en, s.name) ELSE s.name END as recommended_supplier_name,
               i.title as inquiry_title
        FROM scm.price_comparisons c
        LEFT JOIN scm.suppliers s ON c.recommended_supplier_id = s.id
        LEFT JOIN scm.purchase_inquiries i ON c.inquiry_id = i.id
        WHERE c.id = $1 AND c.tenant_id = $2::uuid
        "#),
    )
    .bind(id)
    .bind(tenant_bind)
    .bind(locale)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(comparison)) => {
            let items = sqlx::query_as::<_, ComparisonItemRecord>(only_own_schema_query!(
                "scm",
                r#"
                SELECT ci.id, ci.supplier_id, ci.quote_id, ci.quality_score::float8, ci.price_score::float8,
                       ci.delivery_score::float8, ci.service_score::float8, ci.total_score::float8, ci.rank, ci.remarks,
                       CASE WHEN $3='en' THEN COALESCE(s.name_en, s.name) ELSE s.name END as supplier_name
                FROM scm.price_comparison_items ci
                LEFT JOIN scm.suppliers s ON ci.supplier_id = s.id
                WHERE ci.comparison_id = $1 AND ci.tenant_id = $2::uuid
                ORDER BY ci.rank
                "#
            ))
            .bind(id)
            .bind(tenant_bind)
            .bind(locale)
            .fetch_all(&mut **txn)
            .await
            .unwrap_or_default();

            ApiResponse::success(
                serde_json::json!({
                    "comparison": comparison,
                    "items": items
                }),
                "获取比价分析详情成功",
            )
        }
        Ok(None) => ApiResponse::from(TopemsError::ResourceNotFound("比价分析不存在".to_string())),
        Err(e) => ApiResponse::from(TopemsError::internal("获取比价分析详情失败", e)),
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["scm:comparison:write"])),
    path = "/comparisons/{id}/approve",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM/comparison"
)]
pub async fn approve_comparison(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let now_str = Utc::now().to_rfc3339();
    let now = Utc::now();

    let result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        UPDATE scm.price_comparisons
        SET remarks = CONCAT(COALESCE(remarks, ''), ' | 已审批: ', $1::text), updated_at = $2
        WHERE id = $3 AND tenant_id = $4::uuid
        "#
    ))
    .bind(now_str)
    .bind(now)
    .bind(id)
    .bind(tenant_bind)
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("rls commit failed: {}", e);
            return ApiResponse::server_error("提交事务失败");
        }
    }

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            ApiResponse::success(serde_json::json!({"id": id}), "比价分析已审批")
        }
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("比价分析不存在".to_string())),
        Err(e) => ApiResponse::from(TopemsError::internal("审批比价分析失败", e)),
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = [])),
    path = "/api/scm/comparisons/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM"
)]

pub async fn update_comparison(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdatePriceComparisonRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };
    let now = Utc::now();

    let result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        UPDATE scm.price_comparisons
        SET compared_at = COALESCE($3, compared_at),
            recommended_supplier_id = COALESCE($4, recommended_supplier_id),
            recommended_quote_id = COALESCE($5, recommended_quote_id),
            quality_score = COALESCE($6, quality_score),
            price_score = COALESCE($7, price_score),
            delivery_score = COALESCE($8, delivery_score),
            service_score = COALESCE($9, service_score),
            remarks = COALESCE($10, remarks),
            total_score = COALESCE($6, quality_score) * 0.3 + COALESCE($7, price_score) * 0.4
                         + COALESCE($8, delivery_score) * 0.2 + COALESCE($9, service_score) * 0.1,
            updated_at = $11
        WHERE id = $1 AND tenant_id = $2::uuid
        "#
    ))
    .bind(id)
    .bind(tenant_bind)
    .bind(req.compared_at)
    .bind(req.recommended_supplier_id)
    .bind(req.recommended_quote_id)
    .bind(req.quality_score)
    .bind(req.price_score)
    .bind(req.delivery_score)
    .bind(req.service_score)
    .bind(&req.remarks)
    .bind(now)
    .execute(&mut **txn)
    .await;

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("rls commit failed: {}", e);
            return ApiResponse::server_error("提交事务失败");
        }
    }

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            ApiResponse::success(serde_json::json!({"id": id}), "比价分析已更新")
        }
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("比价分析不存在".to_string())),
        Err(e) => ApiResponse::from(TopemsError::internal("更新比价分析失败", e)),
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = [])),
    path = "/api/scm/comparisons/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SCM"
)]

pub async fn delete_comparison(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    match check_permission(&state.db, &claims, &ModulePermission::PriceComparisonWrite).await {
        Ok(_) => {}
        Err(e) => return e.0,
    }
    let tenant_bind = match require_tenant_bind(&claims) {
        Ok(v) => v,
        Err(e) => return e.0,
    };

    let item_result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        DELETE FROM scm.price_comparison_items WHERE comparison_id = $1
        AND tenant_id = $2::uuid
        "#
    ))
    .bind(id)
    .bind(tenant_bind)
    .execute(&mut **txn)
    .await;

    if let Err(e) = item_result {
        tracing::error!("删除比价分析明细失败: {}", e);
        return ApiResponse::from(TopemsError::internal("删除比价分析明细失败", e));
    }

    let result = sqlx::query(only_own_schema_query!(
        "scm",
        r#"
        DELETE FROM scm.price_comparisons WHERE id = $1
        AND tenant_id = $2::uuid
        "#
    ))
    .bind(id)
    .bind(tenant_bind)
    .execute(&mut **txn)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }

            ApiResponse::success(serde_json::json!({"id": id}), "比价分析已删除")
        }
        Ok(_) => ApiResponse::from(TopemsError::ResourceNotFound("比价分析不存在".to_string())),
        Err(e) => ApiResponse::from(TopemsError::internal("删除比价分析失败", e)),
    }
}
