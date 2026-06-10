use axum::{
    extract::{Path, State, FromRef},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use sqlx::{PgPool, QueryBuilder};
use uuid::Uuid;

use crate::models::{Product, CreateProductRequest, UpdateProductRequest, ProductBOM, CreateProductBOMRequest};
use topems_shared::ApiResponse;

#[derive(Clone)]
pub struct ProductApiState {
    pool: PgPool,
}

impl FromRef<ProductApiState> for PgPool {
    fn from_ref(state: &ProductApiState) -> Self {
        state.pool.clone()
    }
}

pub fn create_router(pool: PgPool) -> Router {
    let state = ProductApiState { pool };
    Router::new()
        .route("/api/v1/products", get(list_products))
        .route("/api/v1/products/create", post(create_product))
        .route("/api/v1/products/{id}", get(get_product))
        .route("/api/v1/products/{id}", put(update_product))
        .route("/api/v1/products/{id}", delete(delete_product))
        .route("/api/v1/products/{id}/boms", get(get_product_boms))
        .route("/api/v1/products/{id}/boms", post(add_bom_component))
        .with_state(state)
}

async fn list_products(State(state): State<ProductApiState>) -> Json<ApiResponse<Vec<Product>>> {
    match sqlx::query_as::<_, Product>(
        "SELECT * FROM products ORDER BY created_at DESC LIMIT 100"
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(products) => Json(ApiResponse::success(products, "Products retrieved successfully")),
        Err(e) => {
            tracing::error!("Failed to fetch products: {}", e);
            Json(ApiResponse::<Vec<Product>>::error(500, &format!("Failed to fetch products: {}", e)))
        }
    }
}

async fn create_product(
    State(state): State<ProductApiState>,
    Json(req): Json<CreateProductRequest>,
) -> Json<ApiResponse<Product>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    match sqlx::query_as::<_, Product>(
        "INSERT INTO products (
            id, product_no, name, description, category, unit, status, version, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *"
    )
    .bind(id)
    .bind(req.product_no)
    .bind(req.name)
    .bind(req.description)
    .bind(req.category)
    .bind(req.unit)
    .bind(req.status)
    .bind(req.version)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(product) => Json(ApiResponse::success(product, "Product created successfully")),
        Err(e) => {
            tracing::error!("Failed to create product: {}", e);
            Json(ApiResponse::<Product>::error(500, &format!("Failed to create product: {}", e)))
        }
    }
}

async fn get_product(
    State(state): State<ProductApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Product>> {
    match sqlx::query_as::<_, Product>(
        "SELECT * FROM products WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(product) => Json(ApiResponse::success(product, "Product found")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<Product>::error(404, "Product not found")),
        Err(e) => {
            tracing::error!("Failed to fetch product: {}", e);
            Json(ApiResponse::<Product>::error(500, &format!("Failed to fetch product: {}", e)))
        }
    }
}

async fn update_product(
    State(state): State<ProductApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProductRequest>,
) -> Json<ApiResponse<Product>> {
    let now = Utc::now();
    let mut query_builder = QueryBuilder::new("UPDATE products SET ");
    let mut first = true;

    if let Some(v) = req.product_no {
        if !first { query_builder.push(", "); }
        query_builder.push("product_no = ").push_bind(v);
        first = false;
    }
    if let Some(v) = req.name {
        if !first { query_builder.push(", "); }
        query_builder.push("name = ").push_bind(v);
        first = false;
    }
    if let Some(v) = req.description {
        if !first { query_builder.push(", "); }
        query_builder.push("description = ").push_bind(Some(v));
        first = false;
    }
    if let Some(v) = req.category {
        if !first { query_builder.push(", "); }
        query_builder.push("category = ").push_bind(Some(v));
        first = false;
    }
    if let Some(v) = req.unit {
        if !first { query_builder.push(", "); }
        query_builder.push("unit = ").push_bind(Some(v));
        first = false;
    }
    if let Some(v) = req.status {
        if !first { query_builder.push(", "); }
        query_builder.push("status = ").push_bind(v);
        first = false;
    }
    if let Some(v) = req.version {
        if !first { query_builder.push(", "); }
        query_builder.push("version = ").push_bind(v);
        first = false;
    }

    if first {
        return get_product(State(state), Path(id)).await;
    }

    if !first { query_builder.push(", "); }
    query_builder.push("updated_at = ").push_bind(now);
    query_builder.push(" WHERE id = ").push_bind(id);
    query_builder.push(" RETURNING *");

    match query_builder.build_query_as::<Product>().fetch_one(&state.pool).await {
        Ok(product) => Json(ApiResponse::success(product, "Product updated successfully")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<Product>::error(404, "Product not found")),
        Err(e) => {
            tracing::error!("Failed to update product: {}", e);
            Json(ApiResponse::<Product>::error(500, &format!("Failed to update product: {}", e)))
        }
    }
}

async fn delete_product(
    State(state): State<ProductApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    match sqlx::query("DELETE FROM products WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Json(ApiResponse::success(true, "Product deleted successfully"))
            } else {
                Json(ApiResponse::<bool>::error(404, "Product not found"))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete product: {}", e);
            Json(ApiResponse::<bool>::error(500, &format!("Failed to delete product: {}", e)))
        }
    }
}

async fn get_product_boms(
    State(state): State<ProductApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Vec<ProductBOM>>> {
    match sqlx::query_as::<_, ProductBOM>(
        "SELECT * FROM product_boms WHERE product_id = $1 ORDER BY level, sort_order"
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    {
        Ok(boms) => Json(ApiResponse::success(boms, "BOMs retrieved successfully")),
        Err(e) => {
            tracing::error!("Failed to fetch BOMs: {}", e);
            Json(ApiResponse::<Vec<ProductBOM>>::error(500, &format!("Failed to fetch BOMs: {}", e)))
        }
    }
}

async fn add_bom_component(
    State(state): State<ProductApiState>,
    Json(req): Json<CreateProductBOMRequest>,
) -> Json<ApiResponse<ProductBOM>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    let product_uuid = match Uuid::parse_str(&req.product_id) {
        Ok(u) => u,
        Err(e) => return Json(ApiResponse::<ProductBOM>::error(400, &format!("Invalid product ID: {}", e))),
    };
    
    let material_uuid = req.material_id.parse::<Uuid>().ok();
    let parent_uuid = req.parent_id.and_then(|pid| Uuid::parse_str(&pid).ok());

    match sqlx::query_as::<_, ProductBOM>(
        "INSERT INTO product_boms (
            id, product_id, material_id, material_name, quantity, unit, parent_id, level, sort_order, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *"
    )
    .bind(id)
    .bind(product_uuid)
    .bind(material_uuid)
    .bind(req.material_name)
    .bind(req.quantity)
    .bind(req.unit)
    .bind(parent_uuid)
    .bind(req.level)
    .bind(req.sort_order)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(bom) => Json(ApiResponse::success(bom, "BOM component added successfully")),
        Err(e) => {
            tracing::error!("Failed to add BOM component: {}", e);
            Json(ApiResponse::<ProductBOM>::error(500, &format!("Failed to add BOM component: {}", e)))
        }
    }
}