use axum::{
    extract::{Path, State, FromRef},
    routing::{post},
    Json, Router,
};
use chrono::Utc;
use sqlx::PgPool;
use uuid::Uuid;

use crate::models::{Version, CreateVersionRequest};
use topems_shared::ApiResponse;

#[derive(Clone)]
pub struct VersionApiState {
    pool: PgPool,
}

impl FromRef<VersionApiState> for PgPool {
    fn from_ref(state: &VersionApiState) -> Self {
        state.pool.clone()
    }
}

pub fn create_router(pool: PgPool) -> Router {
    let state = VersionApiState { pool };
    Router::new()
        .route("/api/v1/versions/create", post(create_version))
        .route("/api/v1/versions/{id}/release", post(release_version))
        .with_state(state)
}

async fn create_version(
    State(state): State<VersionApiState>,
    Json(req): Json<CreateVersionRequest>,
) -> Json<ApiResponse<Version>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    
    let product_uuid = match Uuid::parse_str(&req.product_id) {
        Ok(u) => u,
        Err(e) => return Json(ApiResponse::<Version>::error(400, &format!("Invalid product ID: {}", e))),
    };

    match sqlx::query_as::<_, Version>(
        "INSERT INTO versions (
            id, version_no, product_id, description, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *"
    )
    .bind(id)
    .bind(req.version_no)
    .bind(product_uuid)
    .bind(req.description)
    .bind(req.status)
    .bind(now)
    .bind(now)
    .fetch_one(&state.pool)
    .await
    {
        Ok(version) => Json(ApiResponse::success(version, "Version created successfully")),
        Err(e) => {
            tracing::error!("Failed to create version: {}", e);
            Json(ApiResponse::<Version>::error(500, &format!("Failed to create version: {}", e)))
        }
    }
}

async fn release_version(
    State(state): State<VersionApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Version>> {
    let now = Utc::now();

    match sqlx::query_as::<_, Version>(
        "UPDATE versions SET status = $1, release_date = $2, updated_at = $3 WHERE id = $4 RETURNING *"
    )
    .bind("released")
    .bind(now)
    .bind(now)
    .bind(id)
    .fetch_one(&state.pool)
    .await
    {
        Ok(version) => Json(ApiResponse::success(version, "Version released successfully")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::<Version>::error(404, "Version not found")),
        Err(e) => {
            tracing::error!("Failed to release version: {}", e);
            Json(ApiResponse::<Version>::error(500, &format!("Failed to release version: {}", e)))
        }
    }
}