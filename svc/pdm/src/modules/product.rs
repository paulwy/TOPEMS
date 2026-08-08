use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use chrono::Utc;
use serde::{Deserialize, Serialize};
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
        .route("/products", get(list_products).post(create_product))
        .route(
            "/products/{id}",
            get(get_product).put(update_product).delete(delete_product),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Product {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub product_no: String,
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub product_no: String,
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProductRequest {
    pub product_no: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ProductQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub async fn list_products(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ProductQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(10).min(100);
    let offset = (page - 1) * page_size;
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, Product>(
        r#"
        SELECT id, tenant_id, product_no, name, description, version, status, created_at, updated_at
        FROM pdm_products
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR product_no ILIKE $2 OR name ILIKE $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(products) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM pdm_products
                WHERE deleted_at IS NULL AND tenant_id = $1
                  AND ($2::text IS NULL OR product_no ILIKE $2 OR name ILIKE $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(tenant_id)
            .bind(&search_pattern)
            .bind(&query.status)
            .fetch_one(&state.pool)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "products": products,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取产品列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取产品列表失败: {}", e);
            Json(ApiResponse::error(500, "获取产品列表失败"))
        }
    }
}

pub async fn create_product(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateProductRequest>,
) -> Json<ApiResponse<Product>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    if req.product_no.is_empty() {
        return Json(ApiResponse::error(400, "产品编号不能为空"));
    }
    if req.name.is_empty() {
        return Json(ApiResponse::error(400, "产品名称不能为空"));
    }

    let status = req.status.unwrap_or_else(|| "active".to_string());

    let result = sqlx::query_as::<_, Product>(
        r#"
        INSERT INTO pdm_products (tenant_id, product_no, name, description, version, status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, tenant_id, product_no, name, description, version, status, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(&req.product_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.version)
    .bind(&status)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(product) => Json(ApiResponse::success(product, "产品创建成功")),
        Err(e) => {
            tracing::error!("创建产品失败: {}", e);
            Json(ApiResponse::error(500, "创建产品失败"))
        }
    }
}

pub async fn get_product(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Product>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query_as::<_, Product>(
        r#"
        SELECT id, tenant_id, product_no, name, description, version, status, created_at, updated_at
        FROM pdm_products WHERE id = $1 AND tenant_id = $2
        "#,
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(product)) => Json(ApiResponse::success(product, "获取产品成功")),
        Ok(None) => Json(ApiResponse::error(404, "产品不存在")),
        Err(e) => {
            tracing::error!("获取产品失败: {}", e);
            Json(ApiResponse::error(500, "获取产品失败"))
        }
    }
}

pub async fn update_product(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateProductRequest>,
) -> Json<ApiResponse<Product>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Product>(
        r#"
        UPDATE pdm_products SET
            product_no = COALESCE($2, product_no),
            name = COALESCE($3, name),
            description = COALESCE($4, description),
            version = COALESCE($5, version),
            status = COALESCE($6, status),
            updated_at = $7
        WHERE id = $1 AND tenant_id = $8
        RETURNING id, tenant_id, product_no, name, description, version, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.product_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.version)
    .bind(&req.status)
    .bind(now)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(product)) => Json(ApiResponse::success(product, "产品更新成功")),
        Ok(None) => Json(ApiResponse::error(404, "产品不存在")),
        Err(e) => {
            tracing::error!("更新产品失败: {}", e);
            Json(ApiResponse::error(500, "更新产品失败"))
        }
    }
}

pub async fn delete_product(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);

    let result =
        sqlx::query("UPDATE pdm_products SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2")
            .bind(id)
            .bind(tenant_id)
            .execute(&state.pool)
            .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "产品删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "产品不存在")),
        Err(e) => {
            tracing::error!("删除产品失败: {}", e);
            Json(ApiResponse::error(500, "删除产品失败"))
        }
    }
}
