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

use crate::models::{CreateInspectionProcessRequest, InspectionProcess, UpdateInspectionProcessRequest};

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
        .route("/api/v1/processes", get(list_processes).post(create_process))
        .route(
            "/api/v1/processes/{id}",
            get(get_process).put(update_process).delete(delete_process),
        )
        .with_state(state);

    Ok(app)
}

async fn list_processes(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    
    // 预先处理搜索参数，避免所有权问题
    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, InspectionProcess>(
        r#"
        SELECT id, name, description, steps, status, created_at, updated_at
        FROM inspection_processes
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
        Ok(processes) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM inspection_processes
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
                    "processes": processes,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取检验流程列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取检验流程列表失败: {}", e);
            Json(ApiResponse::error(500, "获取检验流程列表失败"))
        }
    }
}

async fn create_process(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateInspectionProcessRequest>,
) -> Json<ApiResponse<InspectionProcess>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let steps_value = serde_json::to_value(req.steps).unwrap_or(serde_json::json!([]));

    let result = sqlx::query_as::<_, InspectionProcess>(
        r#"
        INSERT INTO inspection_processes (id, name, description, steps, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'active', $5, $6)
        RETURNING id, name, description, steps, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(steps_value)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(process) => Json(ApiResponse::success(process, "检验流程创建成功")),
        Err(e) => {
            tracing::error!("创建检验流程失败: {}", e);
            Json(ApiResponse::error(500, "检验流程创建失败"))
        }
    }
}

async fn get_process(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<InspectionProcess>> {
    let result = sqlx::query_as::<_, InspectionProcess>(
        r#"
        SELECT id, name, description, steps, status, created_at, updated_at
        FROM inspection_processes WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(process)) => Json(ApiResponse::success(process, "获取检验流程成功")),
        Ok(None) => Json(ApiResponse::error(404, "检验流程不存在")),
        Err(e) => {
            tracing::error!("获取检验流程失败: {}", e);
            Json(ApiResponse::error(500, "获取检验流程失败"))
        }
    }
}

async fn update_process(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInspectionProcessRequest>,
) -> Json<ApiResponse<InspectionProcess>> {
    let existing = sqlx::query_as::<_, InspectionProcess>(
        "SELECT id, name, description, steps, status, created_at, updated_at FROM inspection_processes WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(p)) => p,
        Ok(None) => return Json(ApiResponse::error(404, "检验流程不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询检验流程失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let description = req.description.or(existing.description);
    let status = req.status.unwrap_or(existing.status);
    // 修复steps所有权问题，使用clone
    let steps = req.steps
        .map(|s| serde_json::to_value(s).unwrap_or_else(|_| existing.steps.clone()))
        .unwrap_or(existing.steps);
    let now = Utc::now();

    let result = sqlx::query_as::<_, InspectionProcess>(
        r#"
        UPDATE inspection_processes SET
            name = $2, description = $3, steps = $4, status = $5, updated_at = $6
        WHERE id = $1
        RETURNING id, name, description, steps, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&description)
    .bind(steps)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(process) => Json(ApiResponse::success(process, "检验流程更新成功")),
        Err(e) => {
            tracing::error!("更新检验流程失败: {}", e);
            Json(ApiResponse::error(500, "检验流程更新失败"))
        }
    }
}

async fn delete_process(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM inspection_processes WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success("".to_string(), "检验流程删除成功")),
        Ok(_) => Json(ApiResponse::error(404, "检验流程不存在")),
        Err(e) => {
            tracing::error!("删除检验流程失败: {}", e);
            Json(ApiResponse::error(500, "检验流程删除失败"))
        }
    }
}
