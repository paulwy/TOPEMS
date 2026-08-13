use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPool, query_as};
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{AwardBiddingRequest, Bidding, CreateBiddingRequest, UpdateBiddingRequest};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ListBiddingParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub category: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/biddings", get(list_biddings).post(create_bidding))
        .route(
            "/biddings/{id}",
            get(get_bidding).put(update_bidding).delete(delete_bidding),
        )
        .route("/biddings/{id}/publish", post(publish_bidding))
        .route("/biddings/{id}/open", post(open_bidding))
        .route("/biddings/{id}/evaluate", post(evaluate_bidding))
        .route("/biddings/{id}/award", post(award_bidding))
        .route("/biddings/{id}/suppliers", get(list_bidding_suppliers))
        .with_state(state);

    Ok(app)
}

async fn list_biddings(
    State(state): State<Arc<AppState>>,
    Query(params): Query<ListBiddingParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();
    let category_filter = params.category.clone();

    let query = format!(
        r#"
        SELECT id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
               publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
               supplier_count, creator, department, items, remarks, created_at, updated_at
        FROM plugin_srm.biddings
        WHERE ($1::text IS NULL OR title ILIKE $1 OR bidding_no ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR category = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    );

    let result = sqlx::query_as::<_, Bidding>(&query)
        .bind(&search_pattern)
        .bind(&status_filter)
        .bind(&category_filter)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&state.db)
        .await;

    match result {
        Ok(biddings) => {
            let count_query = format!(
                r#"
                SELECT COUNT(*) FROM plugin_srm.biddings
                WHERE deleted_at IS NULL AND ($1::text IS NULL OR title ILIKE $1 OR bidding_no ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR category = $3)
                "#,
            );

            let total = sqlx::query_scalar::<_, i64>(&count_query)
                .bind(&search_pattern)
                .bind(&status_filter)
                .bind(&category_filter)
                .fetch_one(&state.db)
                .await
                .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": biddings,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取招标列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取招标列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取招标列表失败",
            ))
        }
    }
}

async fn create_bidding(
    State(state): State<Arc<AppState>>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateBiddingRequest>,
) -> Json<ApiResponse<Bidding>> {
    if req.bidding_no.is_empty() || req.title.is_empty() {
        return Json(ApiResponse::<Bidding>::error(400, "招标编号和标题不能为空"));
    }

    let existing = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM plugin_srm.biddings WHERE deleted_at IS NULL AND bidding_no = $1",
    )
    .bind(&req.bidding_no)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    if existing > 0 {
        return Json(ApiResponse::<Bidding>::error(400, "招标编号已存在"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let bid_deadline = req.bid_deadline.and_then(|s| {
        DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });
    let open_date = req.open_date.and_then(|s| {
        DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let result = sqlx::query_as::<_, Bidding>(
        r#"
        INSERT INTO plugin_srm.biddings (id, bidding_no, title, description, category, bidding_type, status,
            budget_amount, currency, bid_deadline, open_date, items, remarks, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
            publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
            supplier_count, creator, department, items, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.bidding_no)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.category)
    .bind(&req.bidding_type)
    .bind("draft")
    .bind(req.budget_amount)
    .bind(&req.currency)
    .bind(bid_deadline)
    .bind(open_date)
    .bind(&req.items)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(bidding) => Json(ApiResponse::success(bidding, "招标创建成功")),
        Err(e) => {
            tracing::error!("创建招标失败: {}", e);
            Json(ApiResponse::<Bidding>::error(500, "招标创建失败"))
        }
    }
}

async fn get_bidding(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Bidding>> {
    let result = sqlx::query_as::<_, Bidding>(
        r#"
        SELECT id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
               publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
               supplier_count, creator, department, items, remarks, created_at, updated_at
        FROM plugin_srm.biddings WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(bidding)) => Json(ApiResponse::success(bidding, "获取招标成功")),
        Ok(None) => Json(ApiResponse::<Bidding>::error(404, "招标不存在")),
        Err(e) => {
            tracing::error!("获取招标失败: {}", e);
            Json(ApiResponse::<Bidding>::error(500, "获取招标失败"))
        }
    }
}

async fn update_bidding(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateBiddingRequest>,
) -> Json<ApiResponse<Bidding>> {
    let now = Utc::now();

    let bid_deadline = req.bid_deadline.and_then(|s| {
        DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });
    let open_date = req.open_date.and_then(|s| {
        DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let result = sqlx::query_as::<_, Bidding>(
        r#"
        UPDATE plugin_srm.biddings SET
            title = COALESCE($2, title),
            description = COALESCE($3, description),
            category = COALESCE($4, category),
            bidding_type = COALESCE($5, bidding_type),
            budget_amount = COALESCE($6, budget_amount),
            currency = COALESCE($7, currency),
            bid_deadline = COALESCE($8, bid_deadline),
            open_date = COALESCE($9, open_date),
            items = COALESCE($10, items),
            remarks = COALESCE($11, remarks),
            updated_at = $12
        WHERE id = $1
        RETURNING id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
            publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
            supplier_count, creator, department, items, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.title)
    .bind(req.description)
    .bind(req.category)
    .bind(req.bidding_type)
    .bind(req.budget_amount)
    .bind(req.currency)
    .bind(bid_deadline)
    .bind(open_date)
    .bind(req.items)
    .bind(req.remarks)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(bidding) => Json(ApiResponse::success(bidding, "招标更新成功")),
        Err(e) => {
            tracing::error!("更新招标失败: {}", e);
            Json(ApiResponse::<Bidding>::error(500, "更新招标失败"))
        }
    }
}

async fn delete_bidding(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let result = sqlx::query("UPDATE plugin_srm.biddings SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "招标删除成功")),
        Ok(_) => Json(ApiResponse::<bool>::error(404, "招标不存在")),
        Err(e) => {
            tracing::error!("删除招标失败: {}", e);
            Json(ApiResponse::<bool>::error(500, "删除招标失败"))
        }
    }
}

async fn publish_bidding(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Bidding>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Bidding>(
        r#"
        UPDATE plugin_srm.biddings SET status = 'published', publish_date = $2, updated_at = $3
        WHERE id = $1 AND status = 'draft'
        RETURNING id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
            publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
            supplier_count, creator, department, items, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(bidding) => Json(ApiResponse::success(bidding, "招标发布成功")),
        Err(e) => {
            tracing::error!("发布招标失败: {}", e);
            Json(ApiResponse::<Bidding>::error(500, "发布招标失败"))
        }
    }
}

async fn open_bidding(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Bidding>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Bidding>(
        r#"
        UPDATE plugin_srm.biddings SET status = 'opened', open_date = $2, updated_at = $3
        WHERE id = $1 AND status = 'published'
        RETURNING id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
            publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
            supplier_count, creator, department, items, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(bidding) => Json(ApiResponse::success(bidding, "开标成功")),
        Err(e) => {
            tracing::error!("开标失败: {}", e);
            Json(ApiResponse::<Bidding>::error(500, "开标失败"))
        }
    }
}

async fn evaluate_bidding(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Bidding>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Bidding>(
        r#"
        UPDATE plugin_srm.biddings SET status = 'evaluated', updated_at = $2
        WHERE id = $1 AND status = 'opened'
        RETURNING id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
            publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
            supplier_count, creator, department, items, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(bidding) => Json(ApiResponse::success(bidding, "评标完成")),
        Err(e) => {
            tracing::error!("评标失败: {}", e);
            Json(ApiResponse::<Bidding>::error(500, "评标失败"))
        }
    }
}

async fn award_bidding(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<AwardBiddingRequest>,
) -> Json<ApiResponse<Bidding>> {
    let now = Utc::now();

    let supplier_id = match Uuid::parse_str(&req.supplier_id) {
        Ok(id) => id,
        Err(_) => return Json(ApiResponse::<Bidding>::error(400, "供应商ID格式错误")),
    };

    let supplier_name: Option<String> =
        sqlx::query_scalar("SELECT name FROM plugin_srm.suppliers WHERE id = $1")
            .bind(supplier_id)
            .fetch_optional(&state.db)
            .await
            .unwrap_or(None);

    let result = sqlx::query_as::<_, Bidding>(
        r#"
        UPDATE plugin_srm.biddings SET status = 'awarded', winner_supplier_id = $2,
            winner_supplier_name = $3, updated_at = $4
        WHERE id = $1 AND status = 'evaluated'
        RETURNING id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
            publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
            supplier_count, creator, department, items, remarks, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(supplier_id)
    .bind(supplier_name)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(bidding) => Json(ApiResponse::success(bidding, "中标结果已确定")),
        Err(e) => {
            tracing::error!("确定中标结果失败: {}", e);
            Json(ApiResponse::<Bidding>::error(500, "确定中标结果失败"))
        }
    }
}

async fn list_bidding_suppliers(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let result = sqlx::query_as::<_, (Uuid, String)>(
        r#"
        SELECT s.id, s.name FROM plugin_srm.suppliers s
        JOIN plugin_srm.bidding_suppliers bs ON s.id = bs.supplier_id
        WHERE bs.bidding_id = $1
        "#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(suppliers) => {
            let supplier_list = suppliers
                .into_iter()
                .map(|(id, name)| {
                    serde_json::json!({
                        "id": id,
                        "name": name
                    })
                })
                .collect::<Vec<_>>();
            Json(ApiResponse::success(
                serde_json::json!({"items": supplier_list}),
                "获取参与供应商成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取参与供应商失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(
                500,
                "获取参与供应商失败",
            ))
        }
    }
}

pub fn calculate_bid_total(tech: f64, commercial: f64, price_score: f64) -> f64 {
    let weighted = tech * 0.6_f64 + commercial * 0.3_f64 + price_score * 0.1_f64;
    weighted.clamp(0.0_f64, 100.0_f64)
}

pub fn price_scores(prices: &[f64]) -> Vec<f64> {
    if prices.is_empty() {
        return vec![];
    }

    let min_price = prices.iter().cloned().fold(f64::INFINITY, f64::min);

    if min_price <= 0.0_f64 {
        return prices.iter().map(|_| 0.0_f64).collect();
    }

    prices
        .iter()
        .map(|p| {
            if *p <= 0.0_f64 {
                0.0_f64
            } else {
                (min_price / *p * 100.0_f64).clamp(0.0_f64, 100.0_f64)
            }
        })
        .collect()
}

pub fn rank_bidders(totals: &[f64]) -> Vec<usize> {
    let mut indices: Vec<usize> = (0..totals.len()).collect();
    indices.sort_by(|a, b| {
        totals[*b]
            .partial_cmp(&totals[*a])
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    indices
}

pub fn check_invalid_bids(prices: &[f64], budget: Option<f64>) -> &'static str {
    if prices.len() < 3 {
        return "low_bidders";
    }

    if let Some(budget_val) = budget {
        if prices.iter().all(|p| *p > budget_val) {
            return "over_budget";
        }
    }

    if prices.len() >= 3 {
        let min_price = prices.iter().cloned().fold(f64::INFINITY, f64::min);
        if min_price > 0.0_f64 {
            let close_count = prices
                .iter()
                .filter(|p| ((*p - min_price) / min_price).abs() < 0.01_f64)
                .count();
            if close_count >= 3 {
                return "collusion_risk";
            }
        }
    }

    "ok"
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_bid_total_normal() {
        let result = calculate_bid_total(80.0_f64, 70.0_f64, 90.0_f64);
        assert!((result - 78.0_f64).abs() < 0.01_f64, "招标综合分计算错误");
    }

    #[test]
    fn test_calculate_bid_total_clamp() {
        let result = calculate_bid_total(200.0_f64, 200.0_f64, 200.0_f64);
        assert_eq!(result, 100.0_f64, "综合分超过100应clamp到100");
    }

    #[test]
    fn test_price_scores_min_gets_100() {
        let prices = vec![100.0_f64, 120.0_f64, 150.0_f64];
        let scores = price_scores(&prices);
        assert_eq!(scores[0], 100.0_f64, "最低价应得到100分");
        assert!(
            (scores[1] - 100.0_f64 * 100.0_f64 / 120.0_f64).abs() < 0.01_f64,
            "第二价格分计算错误"
        );
        assert!(
            (scores[2] - 100.0_f64 * 100.0_f64 / 150.0_f64).abs() < 0.01_f64,
            "第三价格分计算错误"
        );
    }

    #[test]
    fn test_price_scores_empty() {
        let prices: Vec<f64> = vec![];
        assert!(price_scores(&prices).is_empty(), "空输入返回空向量");
    }

    #[test]
    fn test_price_scores_zero_price() {
        let prices = vec![0.0_f64, 100.0_f64];
        let scores = price_scores(&prices);
        assert_eq!(scores[0], 0.0_f64, "0价格得0分");
    }

    #[test]
    fn test_rank_bidders_descending() {
        let totals = vec![70.0_f64, 90.0_f64, 80.0_f64];
        let ranks = rank_bidders(&totals);
        assert_eq!(ranks, vec![1, 2, 0], "排名应按综合分降序");
    }

    #[test]
    fn test_rank_bidders_empty() {
        let totals: Vec<f64> = vec![];
        assert!(rank_bidders(&totals).is_empty(), "空输入返回空索引");
    }

    #[test]
    fn test_check_invalid_bids_low_bidders() {
        let prices = vec![100.0_f64, 200.0_f64];
        assert_eq!(
            check_invalid_bids(&prices, None),
            "low_bidders",
            "少于3家应返回low_bidders"
        );
    }

    #[test]
    fn test_check_invalid_bids_over_budget() {
        let prices = vec![150.0_f64, 160.0_f64, 170.0_f64];
        assert_eq!(
            check_invalid_bids(&prices, Some(100.0_f64)),
            "over_budget",
            "全部超预算应返回over_budget"
        );
    }

    #[test]
    fn test_check_invalid_bids_collusion_risk() {
        let prices = vec![100.0_f64, 100.5_f64, 100.8_f64, 150.0_f64];
        assert_eq!(
            check_invalid_bids(&prices, None),
            "collusion_risk",
            "3家以上报价差<1%应判定围标风险"
        );
    }

    #[test]
    fn test_check_invalid_bids_ok() {
        let prices = vec![100.0_f64, 130.0_f64, 160.0_f64];
        assert_eq!(
            check_invalid_bids(&prices, Some(200.0_f64)),
            "ok",
            "正常情况应返回ok"
        );
    }

    #[test]
    fn test_rank_bidders_ties() {
        let totals = vec![80.0_f64, 80.0_f64, 70.0_f64];
        let ranks = rank_bidders(&totals);
        assert_eq!(ranks.len(), 3, "并列分数应返回相同数量索引");
        assert!(ranks[0] == 0 || ranks[0] == 1, "并列前两名应为0或1");
    }
}
