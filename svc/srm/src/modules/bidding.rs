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
