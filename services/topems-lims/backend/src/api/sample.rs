use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{CreateSampleRequest, Sample, UpdateSampleRequest};

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub code: u16,
    pub success: bool,
    pub data: Option<T>,
    pub message: String,
    pub timestamp: String,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T, message: &str) -> Self {
        Self {
            code: 200,
            success: true,
            data: Some(data),
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }

    pub fn error(code: u16, message: &str) -> Self {
        Self {
            code,
            success: false,
            data: None,
            message: message.to_string(),
            timestamp: Utc::now().to_rfc3339(),
        }
    }
}

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
        .route("/api/v1/samples", get(list_samples).post(create_sample))
        .route(
            "/api/v1/samples/{id}",
            get(get_sample).put(update_sample).delete(delete_sample),
        )
        .with_state(state);

    Ok(app)
}

async fn list_samples(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    
    // 预先处理搜索参数，避免所有权问题
    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, Sample>(
        r#"
        SELECT id, name, description, status, project_id, received_date, created_at, updated_at
        FROM samples
        WHERE ($1::text IS NULL OR name ILIKE $1 OR description ILIKE $1)
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
        Ok(samples) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM samples
                WHERE ($1::text IS NULL OR name ILIKE $1 OR description ILIKE $1)
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
                    "samples": samples,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取样品列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取样品列表失败: {}", e);
            Json(ApiResponse::error(500, "获取样品列表失败"))
        }
    }
}

async fn create_sample(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateSampleRequest>,
) -> Json<ApiResponse<Sample>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Sample>(
        r#"
        INSERT INTO samples (id, name, description, status, project_id, received_date, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, name, description, status, project_id, received_date, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.status)
    .bind(req.project_id)
    .bind(now)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(sample) => Json(ApiResponse::success(sample, "样品创建成功")),
        Err(e) => {
            tracing::error!("创建样品失败: {}", e);
            Json(ApiResponse::error(500, "样品创建失败"))
        }
    }
}

async fn get_sample(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Sample>> {
    let result = sqlx::query_as::<_, Sample>(
        r#"
        SELECT id, name, description, status, project_id, received_date, created_at, updated_at
        FROM samples WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(sample)) => Json(ApiResponse::success(sample, "获取样品成功")),
        Ok(None) => Json(ApiResponse::error(404, "样品不存在")),
        Err(e) => {
            tracing::error!("获取样品失败: {}", e);
            Json(ApiResponse::error(500, "获取样品失败"))
        }
    }
}

async fn update_sample(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSampleRequest>,
) -> Json<ApiResponse<Sample>> {
    let existing = sqlx::query_as::<_, Sample>(
        "SELECT id, name, description, status, project_id, received_date, created_at, updated_at FROM samples WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(s)) => s,
        Ok(None) => return Json(ApiResponse::error(404, "样品不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询样品失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let description = req.description.or(existing.description);
    let status = req.status.unwrap_or(existing.status);
    let project_id = req.project_id.or(existing.project_id);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Sample>(
        r#"
        UPDATE samples SET
            name = $2, description = $3, status = $4, project_id = $5, updated_at = $6
        WHERE id = $1
        RETURNING id, name, description, status, project_id, received_date, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&description)
    .bind(&status)
    .bind(project_id)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(sample) => Json(ApiResponse::success(sample, "样品更新成功")),
        Err(e) => {
            tracing::error!("更新样品失败: {}", e);
            Json(ApiResponse::error(500, "样品更新失败"))
        }
    }
}

async fn delete_sample(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM samples WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "样品删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "样品不存在")),
        Err(e) => {
            tracing::error!("删除样品失败: {}", e);
            Json(ApiResponse::error(500, "样品删除失败"))
        }
    }
}
