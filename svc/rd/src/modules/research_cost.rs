use axum::{
    extract::{Extension, Path, Query, State},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};
use uuid::Uuid;

use crate::modules::ApiState;
use topems_shared_core::response::ApiResponse;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, utoipa::ToSchema)]
pub struct ResearchCost {
    pub id: Uuid,
    pub project_id: Uuid,
    pub category: String,
    pub sub_category: String,
    pub amount: f64,
    pub currency: String,
    pub description: Option<String>,
    pub cost_date: DateTime<Utc>,
    pub payer: Option<String>,
    pub payment_method: Option<String>,
    pub receipt_no: Option<String>,
    pub status: String,
    pub created_by: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct CreateResearchCostRequest {
    pub project_id: Uuid,
    pub category: String,
    pub sub_category: String,
    pub amount: f64,
    pub currency: Option<String>,
    pub description: Option<String>,
    pub cost_date: Option<String>,
    pub payer: Option<String>,
    pub payment_method: Option<String>,
    pub receipt_no: Option<String>,
    pub created_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, utoipa::ToSchema)]
pub struct UpdateResearchCostRequest {
    pub category: Option<String>,
    pub sub_category: Option<String>,
    pub amount: Option<f64>,
    pub currency: Option<String>,
    pub description: Option<String>,
    pub cost_date: Option<String>,
    pub payer: Option<String>,
    pub payment_method: Option<String>,
    pub receipt_no: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ListParams {
    /// 页码，默认 1
    #[serde(default, alias = "p")]
    pub page: Option<i64>,
    /// 每页大小，默认 20，最多 100
    #[serde(default, alias = "pagesize", alias = "pageSize", alias = "size", alias = "limit")]
    pub page_size: Option<i64>,
    /// 关键字搜索
    #[serde(default, alias = "q", alias = "keyword")]
    pub search: Option<String>,
    /// 排序字段
    #[serde(default, alias = "sort", alias = "sortBy")]
    pub sort_by: Option<String>,
    /// 排序方向：asc / desc
    #[serde(default, alias = "sortorder", alias = "sortOrder", alias = "sort_dir", alias = "dir")]
    pub sort_dir: Option<String>,
    pub project_id: Option<Uuid>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
}
impl ListParams {
    pub fn page_or_default(&self) -> i64 {
        self.page.unwrap_or(1).max(1)
    }

    pub fn page_size_or_default(&self) -> i64 {
        self.page_size.unwrap_or(20).clamp(1, 100)
    }

    pub fn offset(&self) -> i64 {
        (self.page_or_default() - 1) * self.page_size_or_default()
    }
}



pub fn create_routes() -> Router<ApiState> {
    Router::<ApiState>::new()
        .route("/research-costs", get(list_costs).post(create_cost))
        .route(
            "/research-costs/{id}",
            get(get_cost).put(update_cost).delete(delete_cost),
        )
        .route(
            "/research-costs/project/{project_id}",
            get(list_costs_by_project),
        )
        .route("/research-costs/statistics", get(get_cost_statistics))
}

pub async fn list_costs(
    State(_state): State<super::ApiState>,
    Query(params): Query<ListParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let page = params.page_or_default();
    let page_size = params.page_size_or_default();
    let offset = params.offset();

    let mut query = String::from(
        r#"
        SELECT id, project_id, category, sub_category, amount, currency,
               description, cost_date, payer, payment_method, receipt_no,
               status, created_by, created_at, updated_at
        FROM rs.research_costs
        WHERE 1=1
        "#,
    );

    if let Some(_project_id) = params.project_id {
        query.push_str(" AND project_id = $1");
    }
    if let Some(_category) = &params.category {
        query.push_str(" AND category = $2");
    }
    if let Some(_status) = &params.status {
        query.push_str(" AND status = $3");
    }
    if let Some(_start_date) = &params.start_date {
        query.push_str(" AND cost_date >= $4");
    }
    if let Some(_end_date) = &params.end_date {
        query.push_str(" AND cost_date <= $5");
    }
    if let Some(_search) = &params.search {
        query.push_str(" AND (description ILIKE $6 OR receipt_no ILIKE $6)");
    }

    query.push_str(" ORDER BY cost_date DESC LIMIT $7 OFFSET $8");

    let result = sqlx::query_as::<_, ResearchCost>(&query)
        .bind(params.project_id)
        .bind(&params.category)
        .bind(&params.status)
        .bind(&params.start_date)
        .bind(&params.end_date)
        .bind(search_like(&params.search))
        .bind(page_size)
        .bind(offset)
        .fetch_all(&mut **txn)
        .await;

    match result {
        Ok(costs) => {
            let total = count_costs(&mut **txn, &params).await;
            Json(ApiResponse::success(
                serde_json::json!({
                    "costs": costs,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取研发费用列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取研发费用列表失败: {}", e);
            Json(ApiResponse::error(500, "获取研发费用列表失败"))
        }
    }
}

pub async fn count_costs(db: &mut sqlx::PgConnection, params: &ListParams) -> i64 {
    let mut query =
        String::from("SELECT COUNT(*) FROM rs.research_costs WHERE deleted_at IS NULL AND 1=1");

    if let Some(_project_id) = params.project_id {
        query.push_str(" AND project_id = $1");
    }
    if let Some(_category) = &params.category {
        query.push_str(" AND category = $2");
    }
    if let Some(_status) = &params.status {
        query.push_str(" AND status = $3");
    }
    if let Some(_start_date) = &params.start_date {
        query.push_str(" AND cost_date >= $4");
    }
    if let Some(_end_date) = &params.end_date {
        query.push_str(" AND cost_date <= $5");
    }
    if let Some(_search) = &params.search {
        query.push_str(" AND (description ILIKE $6 OR receipt_no ILIKE $6)");
    }

    sqlx::query_scalar::<_, i64>(&query)
        .bind(params.project_id)
        .bind(&params.category)
        .bind(&params.status)
        .bind(&params.start_date)
        .bind(&params.end_date)
        .bind(search_like(&params.search))
        .fetch_one(&mut *db)
        .await
        .unwrap_or(0)
}

fn search_like(search: &Option<String>) -> Option<String> {
    search.as_ref().map(|s| format!("%{}%", s))
}

pub async fn create_cost(
    State(_state): State<super::ApiState>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<CreateResearchCostRequest>,
) -> Json<ApiResponse<ResearchCost>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    if req.amount <= 0.0 {
        return Json(ApiResponse::error(400, "费用金额必须大于0"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let cost_date = req
        .cost_date
        .and_then(|d| {
            DateTime::parse_from_rfc3339(&d)
                .ok()
                .map(|d| d.with_timezone(&Utc))
        })
        .unwrap_or(now);

    let result = sqlx::query_as::<_, ResearchCost>(
        r#"
        INSERT INTO rs.research_costs (
            id, project_id, category, sub_category, amount, currency,
            description, cost_date, payer, payment_method, receipt_no,
            status, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, project_id, category, sub_category, amount, currency,
                  description, cost_date, payer, payment_method, receipt_no,
                  status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.project_id)
    .bind(&req.category)
    .bind(&req.sub_category)
    .bind(req.amount)
    .bind(req.currency.unwrap_or("CNY".to_string()))
    .bind(&req.description)
    .bind(cost_date)
    .bind(&req.payer)
    .bind(&req.payment_method)
    .bind(&req.receipt_no)
    .bind("pending")
    .bind(&req.created_by)
    .bind(now)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(cost) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(cost, "研发费用创建成功"))
        }
        Err(e) => {
            tracing::error!("创建研发费用失败: {}", e);
            Json(ApiResponse::error(500, "创建研发费用失败"))
        }
    }
}

pub async fn get_cost(
    State(_state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<ResearchCost>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, ResearchCost>(
        r#"
        SELECT id, project_id, category, sub_category, amount, currency,
               description, cost_date, payer, payment_method, receipt_no,
               status, created_by, created_at, updated_at
        FROM rs.research_costs WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    match result {
        Ok(Some(cost)) => Json(ApiResponse::success(cost, "获取研发费用成功")),
        Ok(None) => Json(ApiResponse::error(404, "研发费用不存在")),
        Err(e) => {
            tracing::error!("获取研发费用失败: {}", e);
            Json(ApiResponse::error(500, "获取研发费用失败"))
        }
    }
}

pub async fn update_cost(
    State(_state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
    Json(req): Json<UpdateResearchCostRequest>,
) -> Json<ApiResponse<ResearchCost>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let existing = sqlx::query_as::<_, ResearchCost>(
        r#"
        SELECT id, project_id, category, sub_category, amount, currency,
               description, cost_date, payer, payment_method, receipt_no,
               status, created_by, created_at, updated_at
        FROM rs.research_costs WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&mut **txn)
    .await;

    let existing = match existing {
        Ok(Some(e)) => e,
        Ok(None) => return Json(ApiResponse::error(404, "研发费用不存在")),
        Err(e) => {
            tracing::error!("查询研发费用失败: {}", e);
            return Json(ApiResponse::error(500, "查询研发费用失败"));
        }
    };

    let category = req.category.unwrap_or(existing.category);
    let sub_category = req.sub_category.unwrap_or(existing.sub_category);
    let amount = req.amount.unwrap_or(existing.amount);
    let currency = req.currency.or(existing.currency.into());
    let description = req.description.or(existing.description);
    let cost_date = req
        .cost_date
        .and_then(|d| {
            DateTime::parse_from_rfc3339(&d)
                .ok()
                .map(|d| d.with_timezone(&Utc))
        })
        .or(Some(existing.cost_date));
    let payer = req.payer.or(existing.payer);
    let payment_method = req.payment_method.or(existing.payment_method);
    let receipt_no = req.receipt_no.or(existing.receipt_no);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, ResearchCost>(
        r#"
        UPDATE rs.research_costs SET
            category = $2, sub_category = $3, amount = $4, currency = $5,
            description = $6, cost_date = $7, payer = $8, payment_method = $9,
            receipt_no = $10, status = $11, updated_at = $12
        WHERE id = $1
        RETURNING id, project_id, category, sub_category, amount, currency,
                  description, cost_date, payer, payment_method, receipt_no,
                  status, created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&category)
    .bind(&sub_category)
    .bind(amount)
    .bind(&currency)
    .bind(&description)
    .bind(cost_date)
    .bind(&payer)
    .bind(&payment_method)
    .bind(&receipt_no)
    .bind(&status)
    .bind(now)
    .fetch_one(&mut **txn)
    .await;

    match result {
        Ok(cost) => {
            if let Some(t) = guard.take() {
                if let Err(e) = t.commit().await {
                    tracing::error!("rls commit failed: {}", e);
                    return Json(ApiResponse::error(500, "提交事务失败"));
                }
            }
            Json(ApiResponse::success(cost, "研发费用更新成功"))
        }
        Err(e) => {
            tracing::error!("更新研发费用失败: {}", e);
            Json(ApiResponse::error(500, "更新研发费用失败"))
        }
    }
}

pub async fn delete_cost(
    State(_state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<String>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query("UPDATE rs.research_costs SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&mut **txn)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            Json(ApiResponse::success("".to_string(), "研发费用删除成功"))
        }
        Ok(_) => Json(ApiResponse::error(404, "研发费用不存在")),
        Err(e) => {
            tracing::error!("删除研发费用失败: {}", e);
            Json(ApiResponse::error(500, "删除研发费用失败"))
        }
    }
}

pub async fn list_costs_by_project(
    State(_state): State<super::ApiState>,
    Path(project_id): Path<Uuid>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<Vec<ResearchCost>>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let result = sqlx::query_as::<_, ResearchCost>(
        r#"
        SELECT id, project_id, category, sub_category, amount, currency,
               description, cost_date, payer, payment_method, receipt_no,
               status, created_by, created_at, updated_at
        FROM rs.research_costs
        WHERE project_id = $1
        ORDER BY cost_date DESC
        "#,
    )
    .bind(project_id)
    .fetch_all(&mut **txn)
    .await;

    match result {
        Ok(costs) => Json(ApiResponse::success(costs, "获取项目研发费用列表成功")),
        Err(e) => {
            tracing::error!("获取项目研发费用列表失败: {}", e);
            Json(ApiResponse::error(500, "获取项目研发费用列表失败"))
        }
    }
}

pub async fn get_cost_statistics(
    State(_state): State<super::ApiState>,
    Query(params): Query<ListParams>,
    Extension(txn_arc): Extension<
        std::sync::Arc<tokio::sync::Mutex<Option<sqlx::Transaction<'static, sqlx::Postgres>>>>,
    >,
) -> Json<ApiResponse<serde_json::Value>> {
    let mut guard = txn_arc.lock().await;
    let txn = guard.as_mut().expect("rls txn missing");
    let mut query = String::from(
        r#"
        SELECT 
            category,
            SUM(amount) as total_amount,
            COUNT(*) as count
        FROM rs.research_costs
        WHERE 1=1
        "#,
    );

    if let Some(_project_id) = params.project_id {
        query.push_str(" AND project_id = $1");
    }
    if let Some(_start_date) = &params.start_date {
        query.push_str(" AND cost_date >= $2");
    }
    if let Some(_end_date) = &params.end_date {
        query.push_str(" AND cost_date <= $3");
    }
    if let Some(_status) = &params.status {
        query.push_str(" AND status = $4");
    }

    query.push_str(" GROUP BY category ORDER BY total_amount DESC");

    let result = sqlx::query(&query)
        .bind(params.project_id)
        .bind(&params.start_date)
        .bind(&params.end_date)
        .bind(&params.status)
        .fetch_all(&mut **txn)
        .await;

    match result {
        Ok(rows) => {
            let mut statistics = Vec::new();
            let mut total_amount = 0.0;
            let mut total_count = 0;

            for row in rows {
                let category: String = row.get(0);
                let amount: f64 = row.get(1);
                let count: i64 = row.get(2);

                total_amount += amount;
                total_count += count as usize;

                statistics.push(serde_json::json!({
                    "category": category,
                    "total_amount": amount,
                    "count": count
                }));
            }

            Json(ApiResponse::success(
                serde_json::json!({
                    "statistics": statistics,
                    "total_amount": total_amount,
                    "total_count": total_count
                }),
                "获取研发费用统计成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取研发费用统计失败: {}", e);
            Json(ApiResponse::error(500, "获取研发费用统计失败"))
        }
    }
}
