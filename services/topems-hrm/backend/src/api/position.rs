use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::{delete, get, post, put},
    Json, Router,
};
use bigdecimal::BigDecimal;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use topems_shared::{ApiResponse, AppState, PaginationQuery, PaginatedResult};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Position {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub department_id: Option<Uuid>,
    pub level: Option<String>,
    pub min_salary: Option<BigDecimal>,
    pub max_salary: Option<BigDecimal>,
    pub description: Option<String>,
    pub requirements: Option<String>,
    pub status: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreatePositionRequest {
    pub name: String,
    pub code: Option<String>,
    pub department_id: Option<Uuid>,
    pub level: Option<String>,
    pub min_salary: Option<BigDecimal>,
    pub max_salary: Option<BigDecimal>,
    pub description: Option<String>,
    pub requirements: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePositionRequest {
    pub name: Option<String>,
    pub code: Option<String>,
    pub department_id: Option<Uuid>,
    pub level: Option<String>,
    pub min_salary: Option<BigDecimal>,
    pub max_salary: Option<BigDecimal>,
    pub description: Option<String>,
    pub requirements: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct QueryParams {
    #[serde(flatten)]
    pub pagination: PaginationQuery,
    pub search: Option<String>,
    pub department_id: Option<Uuid>,
    pub status: Option<String>,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    use crate::api::department::AppState;
    
    let state = Arc::new(AppState { db });

    let router = Router::new()
        .route("/api/v1/positions", get(list_positions).post(create_position))
        .route(
            "/api/v1/positions/{id}",
            get(get_position).put(update_position).delete(delete_position),
        )
        .with_state(state);

    Ok(router)
}

async fn list_positions(
    State(state): State<Arc<AppState>>,
    Query(params): Query<QueryParams>,
) -> Json<ApiResponse<PaginatedResult<Position>>> {
    let pagination = params.pagination;
    let offset = pagination.offset();
    let page_size = pagination.page_size();

    let search = params.search.unwrap_or_default();
    let dept_id = params.department_id;
    let status_filter = params.status;

    let result = sqlx::query_as::<_, Position>(
        r#"
        SELECT id, name, code, department_id, level, min_salary, max_salary, description, requirements, status, created_at, updated_at
        FROM positions
        WHERE ($1::text IS NULL OR $1 = '' OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
          AND ($2::uuid IS NULL OR department_id = $2)
          AND ($3::text IS NULL OR status = $3)
        ORDER BY created_at DESC
        LIMIT $4 OFFSET $5
        "#,
    )
    .bind(&search)
    .bind(&dept_id)
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM positions
                WHERE ($1::text IS NULL OR $1 = '' OR name ILIKE '%' || $1 || '%' OR code ILIKE '%' || $1 || '%')
                  AND ($2::uuid IS NULL OR department_id = $2)
                  AND ($3::text IS NULL OR status = $3)
                "#,
            )
            .bind(&search)
            .bind(&dept_id)
            .bind(&status_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                PaginatedResult::new(items, total, pagination.page(), page_size),
                "查询成功",
            ))
        }
        Err(e) => {
            tracing::error!("查询岗位列表失败: {}", e);
            Json(ApiResponse::<PaginatedResult<Position>>::error(500, "查询岗位列表失败"))
        }
    }
}

async fn create_position(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreatePositionRequest>,
) -> Json<ApiResponse<Position>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Position>(
        r#"
        INSERT INTO positions (id, name, code, department_id, level, min_salary, max_salary, description, requirements, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10, $11)
        RETURNING id, name, code, department_id, level, min_salary, max_salary, description, requirements, status, created_at, updated_at
        "#
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.department_id)
    .bind(&req.level)
    .bind(&req.min_salary)
    .bind(&req.max_salary)
    .bind(&req.description)
    .bind(&req.requirements)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(position) => Json(ApiResponse::success(position, "岗位创建成功")),
        Err(e) => {
            tracing::error!("创建岗位失败: {}", e);
            Json(ApiResponse::<Position>::error(500, "创建岗位失败"))
        }
    }
}

async fn get_position(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Position>> {
    let result = sqlx::query_as::<_, Position>(
        "SELECT id, name, code, department_id, level, min_salary, max_salary, description, requirements, status, created_at, updated_at FROM positions WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(position)) => Json(ApiResponse::success(position, "查询成功")),
        Ok(None) => Json(ApiResponse::<Position>::error(404, "岗位不存在")),
        Err(e) => {
            tracing::error!("查询岗位失败: {}", e);
            Json(ApiResponse::<Position>::error(500, "查询岗位失败"))
        }
    }
}

async fn update_position(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePositionRequest>,
) -> Json<ApiResponse<Position>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Position>(
        r#"
        UPDATE positions
        SET
            name = COALESCE($1, name),
            code = COALESCE($2, code),
            department_id = COALESCE($3, department_id),
            level = COALESCE($4, level),
            min_salary = COALESCE($5, min_salary),
            max_salary = COALESCE($6, max_salary),
            description = COALESCE($7, description),
            requirements = COALESCE($8, requirements),
            status = COALESCE($9, status),
            updated_at = $10
        WHERE id = $11
        RETURNING id, name, code, department_id, level, min_salary, max_salary, description, requirements, status, created_at, updated_at
        "#
    )
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.department_id)
    .bind(&req.level)
    .bind(&req.min_salary)
    .bind(&req.max_salary)
    .bind(&req.description)
    .bind(&req.requirements)
    .bind(&req.status)
    .bind(now)
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(position)) => Json(ApiResponse::success(position, "岗位更新成功")),
        Ok(None) => Json(ApiResponse::<Position>::error(404, "岗位不存在")),
        Err(e) => {
            tracing::error!("更新岗位失败: {}", e);
            Json(ApiResponse::<Position>::error(500, "更新岗位失败"))
        }
    }
}

async fn delete_position(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query(
        "DELETE FROM positions WHERE id = $1"
    )
    .bind(id)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(id.to_string(), "岗位删除成功")),
        Err(e) => {
            tracing::error!("删除岗位失败: {}", e);
            Json(ApiResponse::<String>::error(500, "删除岗位失败"))
        }
    }
}
