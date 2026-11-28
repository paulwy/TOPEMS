use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post, put},
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

use crate::models::{
    AwardBiddingRequest, Bidding, CreateBiddingRequest, SetBiddingSuppliersRequest,
    UpdateBiddingRequest,
};
use crate::modules::bidding_status::BiddingStatus;
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
    pub db: Db,
}

pub async fn create_routes(db: Db) -> Result<Router> {
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
        .route("/biddings/{id}/suppliers", put(set_bidding_suppliers))
        .with_state(state);

    Ok(app)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:bidding:read"])),
    path = "/biddings",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bidding"
)]
pub async fn list_biddings(
    State(_state): State<Arc<AppState>>,
    Query(params): Query<ListBiddingParams>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.as_deref().map(|s| format!("%{}%", s));
    let status_filter = match params.status.as_deref() {
        Some(raw) => match BiddingStatus::from_db_str(raw) {
            Some(v) => Some(v.as_db_str().to_string()),
            None => return ApiResponse::bad_request("无效的招标状态"),
        },
        None => None,
    };
    let category_filter = params.category.clone();

    let query = format!(
        r#"
        SELECT id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
               publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
               supplier_count, creator, department, items, remarks, created_at, updated_at
        FROM srm.biddings
        WHERE deleted_at IS NULL
          AND status IN ('draft','published','opened','evaluated','awarded')
          AND ($1::text IS NULL OR title ILIKE $1 OR bidding_no ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
          AND ($3::text IS NULL OR category = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    );

    let result = sqlx::query_as::<_, Bidding>(sqlx::AssertSqlSafe(query))
        .bind(&search_pattern)
        .bind(&status_filter)
        .bind(&category_filter)
        .bind(page_size)
        .bind(offset)
        .fetch_all(&mut **txn)
        .await;

    match result {
        Ok(biddings) => {
            let count_query = format!(
                r#"
                SELECT COUNT(*) FROM srm.biddings
                WHERE deleted_at IS NULL AND status IN ('draft','published','opened','evaluated','awarded') AND ($1::text IS NULL OR title ILIKE $1 OR bidding_no ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                  AND ($3::text IS NULL OR category = $3)
                "#,
            );

            let total = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(count_query))
                .bind(&search_pattern)
                .bind(&status_filter)
                .bind(&category_filter)
                .fetch_one(&mut **txn)
                .await
                .unwrap_or(0);

            ApiResponse::success(
                serde_json::json!({
                    "items": biddings,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取招标列表成功",
            )
        }
        Err(e) => {
            tracing::error!("获取招标列表失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("获取招标列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["srm:bidding:write"])),
    path = "/biddings",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bidding"
)]
pub async fn create_bidding(
    State(_state): State<Arc<AppState>>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<CreateBiddingRequest>,
) -> ApiResponse<Bidding> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    if req.bidding_no.is_empty() || req.title.is_empty() {
        return ApiResponse::<Bidding>::bad_request("招标编号和标题不能为空");
    }

    let existing = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "srm",
        "SELECT COUNT(*) FROM srm.biddings WHERE deleted_at IS NULL AND bidding_no = $1",
        "srm"
    ))
    .bind(&req.bidding_no)
    .fetch_one(&mut **txn)
    .await
    .unwrap_or(0);

    if existing > 0 {
        return ApiResponse::<Bidding>::bad_request("招标编号已存在");
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let bid_deadline = req.bid_deadline.and_then(|s: String| {
        DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });
    let open_date = req.open_date.and_then(|s: String| {
        DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let result = sqlx::query_as::<_, Bidding>(
        only_own_schema_query!("srm", r#"
        INSERT INTO srm.biddings (id, bidding_no, title, description, category, bidding_type, status,
            budget_amount, currency, bid_deadline, open_date, items, remarks, created_at, updated_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NULLIF(current_setting('app.tenant_id', true), '')::UUID)
        RETURNING id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
            publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
            supplier_count, creator, department, items, remarks, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(&req.bidding_no)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.category)
    .bind(&req.bidding_type)
    .bind(BiddingStatus::DEFAULT.as_db_str())
    .bind(req.budget_amount)
    .bind(&req.currency)
    .bind(bid_deadline)
    .bind(open_date)
    .bind(&req.items)
    .bind(&req.remarks)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(bidding) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(bidding, "招标创建成功")
        }
        Err(e) => {
            tracing::error!("创建招标失败: {}", e);
            ApiResponse::<Bidding>::server_error("招标创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:bidding:read"])),
    path = "/biddings/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bidding"
)]
pub async fn get_bidding(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Bidding> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let result = sqlx::query_as::<_, Bidding>(
        only_own_schema_query!("srm", r#"
        SELECT id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
               publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
               supplier_count, creator, department, items, remarks, created_at, updated_at
        FROM srm.biddings WHERE id = $1 AND status IN ('draft','published','opened','evaluated','awarded')
        "#, "srm"),
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(bidding)) => ApiResponse::success(bidding, "获取招标成功"),
        Ok(None) => ApiResponse::<Bidding>::not_found("招标不存在"),
        Err(e) => {
            tracing::error!("获取招标失败: {}", e);
            ApiResponse::<Bidding>::server_error("获取招标失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["srm:bidding:write"])),
    path = "/biddings/{id}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bidding"
)]
pub async fn update_bidding(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<UpdateBiddingRequest>,
) -> ApiResponse<Bidding> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let now = Utc::now();

    let bid_deadline = req.bid_deadline.and_then(|s: String| {
        DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });
    let open_date = req.open_date.and_then(|s: String| {
        DateTime::parse_from_rfc3339(&s)
            .ok()
            .map(|d| d.with_timezone(&Utc))
    });

    let result = sqlx::query_as::<_, Bidding>(
        only_own_schema_query!("srm", r#"
        UPDATE srm.biddings SET
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
        WHERE id = $1 AND status IN ('draft','published','opened','evaluated','awarded')
        RETURNING id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
            publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
            supplier_count, creator, department, items, remarks, created_at, updated_at
        "#, "srm"),
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
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(bidding)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(bidding, "招标更新成功")
        }
        Ok(None) => ApiResponse::<Bidding>::not_found("招标不存在"),
        Err(e) => {
            tracing::error!("更新招标失败: {}", e);
            ApiResponse::<Bidding>::server_error("更新招标失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["srm:bidding:write"])),
    path = "/biddings/{id}",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bidding"
)]
pub async fn delete_bidding(
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
        "UPDATE srm.biddings SET deleted_at = NOW() WHERE id = $1",
        "srm"
    ))
    .bind(id)
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
            ApiResponse::success(true, "招标删除成功")
        }
        Ok(_) => ApiResponse::<bool>::not_found("招标不存在"),
        Err(e) => {
            tracing::error!("删除招标失败: {}", e);
            ApiResponse::<bool>::server_error("删除招标失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["srm:bidding:write"])),
    path = "/biddings/{id}/publish",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bidding"
)]
pub async fn publish_bidding(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Bidding> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let now = Utc::now();

    let result = sqlx::query_as::<_, Bidding>(
        only_own_schema_query!("srm", r#"
        UPDATE srm.biddings SET status = $2, publish_date = $3, updated_at = $4
        WHERE id = $1 AND status = $5
        RETURNING id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
            publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
            supplier_count, creator, department, items, remarks, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(BiddingStatus::Published.as_db_str())
    .bind(now)
    .bind(now)
    .bind(BiddingStatus::Published.publish_from())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(bidding)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(bidding, "招标发布成功")
        }
        Ok(None) => ApiResponse::<Bidding>::conflict("招标不存在或当前状态不允许发布"),
        Err(e) => {
            tracing::error!("发布招标失败: {}", e);
            ApiResponse::<Bidding>::server_error("发布招标失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["srm:bidding:write"])),
    path = "/biddings/{id}/open",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bidding"
)]
pub async fn open_bidding(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Bidding> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let now = Utc::now();

    let result = sqlx::query_as::<_, Bidding>(
        only_own_schema_query!("srm", r#"
        UPDATE srm.biddings SET status = $2, open_date = $3, updated_at = $4
        WHERE id = $1 AND status = $5
        RETURNING id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
            publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
            supplier_count, creator, department, items, remarks, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(BiddingStatus::Opened.as_db_str())
    .bind(now)
    .bind(now)
    .bind(BiddingStatus::Opened.open_from())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(bidding)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(bidding, "开标成功")
        }
        Ok(None) => ApiResponse::<Bidding>::conflict("招标不存在或当前状态不允许开标"),
        Err(e) => {
            tracing::error!("开标失败: {}", e);
            ApiResponse::<Bidding>::server_error("开标失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["srm:bidding:write"])),
    path = "/biddings/{id}/evaluate",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bidding"
)]
pub async fn evaluate_bidding(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<Bidding> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let now = Utc::now();

    let result = sqlx::query_as::<_, Bidding>(
        only_own_schema_query!("srm", r#"
        UPDATE srm.biddings SET status = $2, updated_at = $3
        WHERE id = $1 AND status = $4
        RETURNING id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
            publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
            supplier_count, creator, department, items, remarks, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(BiddingStatus::Evaluated.as_db_str())
    .bind(now)
    .bind(BiddingStatus::Evaluated.evaluate_from())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(bidding)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(bidding, "评标完成")
        }
        Ok(None) => ApiResponse::<Bidding>::conflict("招标不存在或当前状态不允许评标"),
        Err(e) => {
            tracing::error!("评标失败: {}", e);
            ApiResponse::<Bidding>::server_error("评标失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["srm:bidding:write"])),
    path = "/biddings/{id}/award",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bidding"
)]
pub async fn award_bidding(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<AwardBiddingRequest>,
) -> ApiResponse<Bidding> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let now = Utc::now();

    let supplier_id = match Uuid::parse_str(&req.supplier_id) {
        Ok(id) => id,
        Err(_) => return ApiResponse::<Bidding>::bad_request("供应商ID格式错误"),
    };

    let supplier_name: Option<String> = sqlx::query_scalar(only_own_schema_query!(
        "srm",
        "SELECT name FROM srm.suppliers WHERE id = $1",
        "srm"
    ))
    .bind(supplier_id)
    .fetch_optional(&mut **txn)
    .await
    .unwrap_or(None);

    let result = sqlx::query_as::<_, Bidding>(
        only_own_schema_query!("srm", r#"
        UPDATE srm.biddings SET status = $2, winner_supplier_id = $3,
            winner_supplier_name = $4, updated_at = $5
        WHERE id = $1 AND status = $6
        RETURNING id, bidding_no, title, description, category, bidding_type, status, budget_amount, currency,
            publish_date, bid_deadline, open_date, winner_supplier_id, winner_supplier_name, winner_amount,
            supplier_count, creator, department, items, remarks, created_at, updated_at
        "#, "srm"),
    )
    .bind(id)
    .bind(BiddingStatus::Awarded.as_db_str())
    .bind(supplier_id)
    .bind(supplier_name)
    .bind(now)
    .bind(BiddingStatus::Awarded.award_from())
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(bidding)) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return ApiResponse::server_error("提交事务失败");
                }
            }
            ApiResponse::success(bidding, "中标结果已确定")
        }
        Ok(None) => ApiResponse::<Bidding>::conflict("招标不存在或当前状态不允许定标"),
        Err(e) => {
            tracing::error!("确定中标结果失败: {}", e);
            ApiResponse::<Bidding>::server_error("确定中标结果失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["srm:bidding:read"])),
    path = "/biddings/{id}/suppliers",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bidding"
)]
pub async fn list_bidding_suppliers(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<RlsTxnCell>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let result = sqlx::query_as::<_, (Uuid, String)>(only_own_schema_query!(
        "srm",
        r#"
        SELECT s.id, s.name FROM srm.suppliers s
        JOIN srm.bidding_suppliers bs ON s.id = bs.supplier_id
        WHERE bs.bidding_id = $1
        "#,
        "srm"
    ))
    .bind(id)
    .fetch_all(&mut **txn)
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
            ApiResponse::success(
                serde_json::json!({"items": supplier_list}),
                "获取参与供应商成功",
            )
        }
        Err(e) => {
            tracing::error!("获取参与供应商失败: {}", e);
            ApiResponse::<serde_json::Value>::server_error("获取参与供应商失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["srm:bidding:write"])),
    path = "/biddings/{id}/suppliers",
    request_body = SetBiddingSuppliersRequest,
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 400, description = "Bad request"),
        (status = 404, description = "Not found"),
        (status = 500, description = "Internal server error")
    ),
    tag = "SRM/bidding"
)]
pub async fn set_bidding_suppliers(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Extension(_claims): Extension<Claims>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Json(req): Json<SetBiddingSuppliersRequest>,
) -> ApiResponse<serde_json::Value> {
    let mut guard = txn_arc.lock().await;
    let txn = match guard.as_mut() {
        Some(txn) => txn,
        None => return ApiResponse::server_error("rls transaction unavailable"),
    };
    let db = state.db.clone();
    let mut scope = match db.scope_with(&mut *txn).await {
        Ok(scope) => scope,
        Err(e) => {
            tracing::error!("开启请求事务作用域失败: {}", e);
            return ApiResponse::server_error("更新参与供应商失败");
        }
    };

    let mut supplier_ids = Vec::with_capacity(req.supplier_ids.len());
    for raw in &req.supplier_ids {
        match Uuid::parse_str(raw) {
            Ok(uid) => supplier_ids.push(uid),
            Err(_) => return ApiResponse::bad_request("供应商ID格式错误"),
        }
    }
    supplier_ids.sort_unstable();
    supplier_ids.dedup();

    let bidding_exists = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "srm",
        "SELECT COUNT(*) FROM srm.biddings WHERE id = $1 AND deleted_at IS NULL",
        "srm"
    ))
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match bidding_exists {
        Ok(0) => return ApiResponse::not_found("招标不存在"),
        Ok(_) => {}
        Err(e) => {
            tracing::error!("校验招标失败: {}", e);
            return ApiResponse::server_error("更新参与供应商失败");
        }
    }

    let expected = i64::try_from(supplier_ids.len()).unwrap_or(-1);
    if !supplier_ids.is_empty() {
        let valid = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "srm",
            "SELECT COUNT(*) FROM srm.suppliers WHERE id = ANY($1) AND status <> 'deleted'",
            "srm"
        ))
        .bind(&supplier_ids)
        .fetch_one(&mut scope)
        .await;

        match valid {
            Ok(count) if count == expected => {}
            Ok(_) => return ApiResponse::bad_request("存在无效或已删除的供应商"),
            Err(e) => {
                tracing::error!("校验供应商失败: {}", e);
                return ApiResponse::server_error("更新参与供应商失败");
            }
        }
    }

    if let Err(e) = sqlx::query(only_own_schema_query!(
        "srm",
        "DELETE FROM srm.bidding_suppliers WHERE bidding_id = $1",
        "srm"
    ))
    .bind(id)
    .execute(&mut scope)
    .await
    {
        tracing::error!("清空招标供应商关联失败: {}", e);
        drop(scope);
        if let Some(t) = guard.take() {
            let _ = t.rollback().await;
        }
        return ApiResponse::server_error("更新参与供应商失败");
    }

    for supplier_id in &supplier_ids {
        let insert_result = sqlx::query(only_own_schema_query!(
            "srm",
            r#"
            INSERT INTO srm.bidding_suppliers (bidding_id, supplier_id, tenant_id)
            VALUES ($1, $2, NULLIF(current_setting('app.tenant_id', true), '')::UUID)
            "#,
            "srm"
        ))
        .bind(id)
        .bind(supplier_id)
        .execute(&mut scope)
        .await;

        if let Err(e) = insert_result {
            tracing::error!("写入招标供应商关联失败: {}", e);
            drop(scope);
            if let Some(t) = guard.take() {
                let _ = t.rollback().await;
            }
            return ApiResponse::server_error("更新参与供应商失败");
        }
    }

    if let Err(e) = sqlx::query(only_own_schema_query!(
        "srm",
        "UPDATE srm.biddings SET supplier_count = $2, updated_at = $3 WHERE id = $1",
        "srm"
    ))
    .bind(id)
    .bind(expected)
    .bind(Utc::now())
    .execute(&mut scope)
    .await
    {
        tracing::error!("更新招标供应商数量失败: {}", e);
        drop(scope);
        if let Some(t) = guard.take() {
            let _ = t.rollback().await;
        }
        return ApiResponse::server_error("更新参与供应商失败");
    }
    drop(scope);

    if let Some(t) = guard.take() {
        if let Err(e) = t.commit().await {
            tracing::error!("rls commit failed: {}", e);
            return ApiResponse::server_error("提交事务失败");
        }
    }

    ApiResponse::success(
        serde_json::json!({"bidding_id": id, "supplier_count": expected}),
        "更新参与供应商成功",
    )
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
