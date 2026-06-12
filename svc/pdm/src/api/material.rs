use axum::{
    extract::{FromRef, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{
    CreateMaterialCategoryRequest, CreateMaterialRequest, Material, MaterialCategory,
};
use topems_shared::ApiResponse;

#[derive(Clone)]
pub struct MaterialApiState {
    pool: PgPool,
}

impl FromRef<MaterialApiState> for PgPool {
    fn from_ref(state: &MaterialApiState) -> Self {
        state.pool.clone()
    }
}

pub fn create_router(pool: PgPool) -> Router {
    let state = MaterialApiState { pool };
    Router::new()
        .route("/api/v1/materials", get(list_materials))
        .route("/api/v1/materials/create", post(create_material))
        .route(
            "/api/v1/materials/categories",
            get(list_material_categories),
        )
        .route(
            "/api/v1/materials/categories/create",
            post(create_material_category),
        )
        .with_state(state)
}

async fn list_materials(State(state): State<MaterialApiState>) -> Json<ApiResponse<Vec<Material>>> {
    match sqlx::query_as::<_, Material>(
        "SELECT * FROM materials ORDER BY created_at DESC LIMIT 100",
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(materials) => Json(ApiResponse::success(
            materials,
            "Materials retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch materials: {}", e);
            Json(ApiResponse::<Vec<Material>>::error(
                500,
                &format!("Failed to fetch materials: {}", e),
            ))
        }
    }
}

async fn create_material(
    State(state): State<MaterialApiState>,
    Json(req): Json<CreateMaterialRequest>,
) -> Json<ApiResponse<Material>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let category_uuid = match Uuid::parse_str(&req.category_id) {
        Ok(u) => u,
        Err(e) => {
            return Json(ApiResponse::<Material>::error(
                400,
                &format!("Invalid category ID: {}", e),
            ))
        }
    };

    match sqlx::query_as::<_, Material>(
        "INSERT INTO materials (
            id, material_no, name, category_id, specification, unit, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *",
    )
    .bind(id)
    .bind(req.material_no)
    .bind(req.name)
    .bind(category_uuid)
    .bind(req.specification)
    .bind(req.unit)
    .bind(req.status)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(material) => Json(ApiResponse::success(
            material,
            "Material created successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to create material: {}", e);
            Json(ApiResponse::<Material>::error(
                500,
                &format!("Failed to create material: {}", e),
            ))
        }
    }
}

async fn list_material_categories(
    State(state): State<MaterialApiState>,
) -> Json<ApiResponse<Vec<MaterialCategory>>> {
    match sqlx::query_as::<_, MaterialCategory>(
        "SELECT * FROM material_categories ORDER BY parent_id NULLS FIRST, sort_order",
    )
    .fetch_all(&state.pool)
    .await
    {
        Ok(categories) => Json(ApiResponse::success(
            categories,
            "Material categories retrieved successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch material categories: {}", e);
            Json(ApiResponse::<Vec<MaterialCategory>>::error(
                500,
                &format!("Failed to fetch material categories: {}", e),
            ))
        }
    }
}

async fn create_material_category(
    State(state): State<MaterialApiState>,
    Json(req): Json<CreateMaterialCategoryRequest>,
) -> Json<ApiResponse<MaterialCategory>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let parent_uuid = req.parent_id.and_then(|pid| Uuid::parse_str(&pid).ok());

    match sqlx::query_as::<_, MaterialCategory>(
        "INSERT INTO material_categories (
            id, name, parent_id, description, sort_order, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *",
    )
    .bind(id)
    .bind(req.name)
    .bind(parent_uuid)
    .bind(req.description)
    .bind(req.sort_order)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(category) => Json(ApiResponse::success(
            category,
            "Material category created successfully",
        )),
        Err(e) => {
            tracing::error!("Failed to create material category: {}", e);
            Json(ApiResponse::<MaterialCategory>::error(
                500,
                &format!("Failed to create material category: {}", e),
            ))
        }
    }
}
