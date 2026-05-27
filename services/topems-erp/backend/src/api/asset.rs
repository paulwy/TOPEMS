use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{Asset, CreateAssetRequest, UpdateAssetRequest};
use topems_shared::{ApiResponse, api_error};

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/assets", get(list_assets).post(create_asset))
        .route(
            "/api/v1/assets/{id}",
            get(get_asset).put(update_asset).delete(delete_asset),
        )
        .with_state(state);

    Ok(app)
}

async fn list_assets(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Asset>(
        r#"
        SELECT id, asset_number, name, category, brand, model, purchase_date, purchase_amount, location, responsible_id, status, created_at, updated_at
        FROM assets
        WHERE ($1::text IS NULL OR name ILIKE $1 OR asset_number ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
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
        Ok(assets) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM assets
                WHERE ($1::text IS NULL OR name ILIKE $1 OR asset_number ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "assets": assets,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取资产列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取资产列表失败: {}", e);
            Json(api_error(500, "获取资产列表失败"))
        }
    }
}

async fn create_asset(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateAssetRequest>,
) -> Json<ApiResponse<Asset>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Asset>(
        r#"
        INSERT INTO assets (id, asset_number, name, category, brand, model, purchase_date, purchase_amount, location, responsible_id, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'in_use', $11, $12)
        RETURNING id, asset_number, name, category, brand, model, purchase_date, purchase_amount, location, responsible_id, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.asset_number)
    .bind(&req.name)
    .bind(&req.category)
    .bind(&req.brand)
    .bind(&req.model)
    .bind(req.purchase_date)
    .bind(req.purchase_amount)
    .bind(&req.location)
    .bind(req.responsible_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(asset) => Json(ApiResponse::success(asset, "资产创建成功")),
        Err(e) => {
            tracing::error!("创建资产失败: {}", e);
            Json(api_error(500, "资产创建失败"))
        }
    }
}

async fn get_asset(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Asset>> {
    let result = sqlx::query_as::<_, Asset>(
        r#"
        SELECT id, asset_number, name, category, brand, model, purchase_date, purchase_amount, location, responsible_id, status, created_at, updated_at
        FROM assets WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(asset)) => Json(ApiResponse::success(asset, "获取资产成功")),
        Ok(None) => Json(api_error(404, "资产不存在")),
        Err(e) => {
            tracing::error!("获取资产失败: {}", e);
            Json(api_error(500, "获取资产失败"))
        }
    }
}

async fn update_asset(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateAssetRequest>,
) -> Json<ApiResponse<Asset>> {
    let existing = sqlx::query_as::<_, Asset>(
        "SELECT id, asset_number, name, category, brand, model, purchase_date, purchase_amount, location, responsible_id, status, created_at, updated_at FROM assets WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(a)) => a,
        Ok(None) => return Json(api_error(404, "资产不存在")),
        Err(e) => return Json(api_error(500, &format!("查询资产失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let category = req.category.or(existing.category);
    let brand = req.brand.or(existing.brand);
    let model = req.model.or(existing.model);
    let purchase_date = req.purchase_date.or(existing.purchase_date);
    let purchase_amount = req.purchase_amount.or(existing.purchase_amount);
    let location = req.location.or(existing.location);
    let responsible_id = req.responsible_id.or(existing.responsible_id);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Asset>(
        r#"
        UPDATE assets SET
            name = $2, category = $3, brand = $4, model = $5, purchase_date = $6, purchase_amount = $7, location = $8, responsible_id = $9, status = $10, updated_at = $11
        WHERE id = $1
        RETURNING id, asset_number, name, category, brand, model, purchase_date, purchase_amount, location, responsible_id, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&category)
    .bind(&brand)
    .bind(&model)
    .bind(purchase_date)
    .bind(purchase_amount)
    .bind(&location)
    .bind(responsible_id)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(asset) => Json(ApiResponse::success(asset, "资产更新成功")),
        Err(e) => {
            tracing::error!("更新资产失败: {}", e);
            Json(api_error(500, "资产更新失败"))
        }
    }
}

async fn delete_asset(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM assets WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "资产删除成功")),
        Ok(_) => Json(api_error(404, "资产不存在")),
        Err(e) => {
            tracing::error!("删除资产失败: {}", e);
            Json(api_error(500, "资产删除失败"))
        }
    }
}
