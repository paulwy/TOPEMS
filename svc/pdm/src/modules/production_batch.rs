use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::types::BigDecimal;
use sqlx::FromRow;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/production-batches", get(list_batches).post(create_batch))
        .route(
            "/production-batches/{id}",
            get(get_batch).put(update_batch).delete(delete_batch),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProductionBatch {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub batch_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub quantity: Option<BigDecimal>,
    pub unit: Option<String>,
    pub start_date: Option<chrono::DateTime<chrono::Utc>>,
    pub end_date: Option<chrono::DateTime<chrono::Utc>>,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateBatchRequest {
    pub batch_no: String,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub quantity: Option<BigDecimal>,
    pub unit: Option<String>,
    pub start_date: Option<chrono::DateTime<chrono::Utc>>,
    pub end_date: Option<chrono::DateTime<chrono::Utc>>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBatchRequest {
    pub batch_no: Option<String>,
    pub product_id: Option<Uuid>,
    pub product_name: Option<String>,
    pub quantity: Option<BigDecimal>,
    pub unit: Option<String>,
    pub start_date: Option<chrono::DateTime<chrono::Utc>>,
    pub end_date: Option<chrono::DateTime<chrono::Utc>>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BatchQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub product_id: Option<Uuid>,
}

pub async fn list_batches(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<BatchQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, ProductionBatch>(
        r#"
        SELECT id, tenant_id, batch_no, product_id, product_name, quantity, unit,
               start_date, end_date, status, notes, created_at, updated_at
        FROM pdm_production_batches
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR batch_no ILIKE $2 OR product_name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
          AND ($4::uuid IS NULL OR product_id = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(&query.product_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(batches) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_production_batches
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR batch_no ILIKE $2 OR product_name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                  AND ($4::uuid IS NULL OR product_id = $4)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&query.status)
            .bind(&query.product_id)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "batches": batches,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取批次列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取批次列表失败: {}", e);
            Json(ApiResponse::error(500, "获取批次列表失败"))
        }
    }
}

pub async fn create_batch(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateBatchRequest>,
) -> Json<ApiResponse<ProductionBatch>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    if req.batch_no.is_empty() {
        return Json(ApiResponse::error(400, "批次编号不能为空"));
    }

    let status = req.status.unwrap_or_else(|| "pending".to_string());

    let result = sqlx::query_as::<_, ProductionBatch>(
        r#"
        INSERT INTO pdm_production_batches (
            tenant_id, batch_no, product_id, product_name, quantity, unit,
            start_date, end_date, status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, tenant_id, batch_no, product_id, product_name, quantity, unit,
                  start_date, end_date, status, notes, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(&req.batch_no)
    .bind(req.product_id)
    .bind(&req.product_name)
    .bind(&req.quantity)
    .bind(&req.unit)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(&status)
    .bind(&req.notes)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(batch) => Json(ApiResponse::success(batch, "批次创建成功")),
        Err(e) => {
            tracing::error!("创建批次失败: {}", e);
            Json(ApiResponse::error(500, "创建批次失败"))
        }
    }
}

pub async fn get_batch(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<ProductionBatch>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, ProductionBatch>(
        r#"
        SELECT id, tenant_id, batch_no, product_id, product_name, quantity, unit,
               start_date, end_date, status, notes, created_at, updated_at
        FROM pdm_production_batches WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(batch)) => Json(ApiResponse::success(batch, "获取批次成功")),
        Ok(None) => Json(ApiResponse::error(404, "批次不存在")),
        Err(e) => {
            tracing::error!("获取批次失败: {}", e);
            Json(ApiResponse::error(500, "获取批次失败"))
        }
    }
}

pub async fn update_batch(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateBatchRequest>,
) -> Json<ApiResponse<ProductionBatch>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionBatch>(
        r#"
        UPDATE pdm_production_batches SET
            batch_no = COALESCE(NULLIF($2, ''), batch_no),
            product_id = COALESCE($3, product_id),
            product_name = COALESCE($4, product_name),
            quantity = COALESCE($5, quantity),
            unit = COALESCE(NULLIF($6, ''), unit),
            start_date = COALESCE($7, start_date),
            end_date = COALESCE($8, end_date),
            status = COALESCE(NULLIF($9, ''), status),
            notes = COALESCE($10, notes),
            updated_at = $11
        WHERE id = $1 AND tenant_id = $12
        RETURNING id, tenant_id, batch_no, product_id, product_name, quantity, unit,
                  start_date, end_date, status, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.batch_no)
    .bind(req.product_id)
    .bind(&req.product_name)
    .bind(&req.quantity)
    .bind(&req.unit)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(&req.status)
    .bind(&req.notes)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(batch)) => Json(ApiResponse::success(batch, "批次更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "批次不存在")),
        Err(e) => {
            tracing::error!("更新批次失败: {}", e);
            Json(ApiResponse::error(500, "更新批次失败"))
        }
    }
}

pub async fn delete_batch(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query(
        "UPDATE pdm_production_batches SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "批次删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "批次不存在")),
        Err(e) => {
            tracing::error!("删除批次失败: {}", e);
            Json(ApiResponse::error(500, "删除批次失败"))
        }
    }
}
