use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{CreateInspectionRecordRequest, InspectionRecord};

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
    pub conclusion: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/records", get(list_records).post(create_record))
        .route(
            "/api/v1/records/task/{task_id}",
            get(list_records_by_task),
        )
        .with_state(state);

    Ok(app)
}

async fn list_records(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;
    
    // 预先处理搜索参数，避免所有权问题
    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let conclusion_filter = params.conclusion.clone();

    let result = sqlx::query_as::<_, InspectionRecord>(
        r#"
        SELECT id, task_id, step_id, step_name, result, conclusion, inspector, recorded_at, created_at
        FROM inspection_records
        WHERE ($1::text IS NULL OR step_name ILIKE $1 OR result ILIKE $1 OR inspector ILIKE $1)
          AND ($2::text IS NULL OR conclusion = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&search_pattern)
    .bind(&conclusion_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM inspection_records
                WHERE ($1::text IS NULL OR step_name ILIKE $1 OR result ILIKE $1 OR inspector ILIKE $1)
                  AND ($2::text IS NULL OR conclusion = $2)
                "#,
            )
            .bind(&search_pattern)
            .bind(&conclusion_filter)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "records": records,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取检验记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取检验记录列表失败: {}", e);
            Json(ApiResponse::error(500, "获取检验记录列表失败"))
        }
    }
}

async fn create_record(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateInspectionRecordRequest>,
) -> Json<ApiResponse<InspectionRecord>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, InspectionRecord>(
        r#"
        INSERT INTO inspection_records (id, task_id, step_id, step_name, result, conclusion, inspector, recorded_at, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, task_id, step_id, step_name, result, conclusion, inspector, recorded_at, created_at
        "#,
    )
    .bind(id)
    .bind(req.task_id)
    .bind(req.step_id)
    .bind(&req.step_name)
    .bind(&req.result)
    .bind(&req.conclusion)
    .bind(&req.inspector)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(record) => Json(ApiResponse::success(record, "检验记录创建成功")),
        Err(e) => {
            tracing::error!("创建检验记录失败: {}", e);
            Json(ApiResponse::error(500, "检验记录创建失败"))
        }
    }
}

async fn list_records_by_task(
    State(state): State<Arc<AppState>>,
    Path(task_id): Path<Uuid>,
) -> Json<ApiResponse<Vec<InspectionRecord>>> {
    let result = sqlx::query_as::<_, InspectionRecord>(
        r#"
        SELECT id, task_id, step_id, step_name, result, conclusion, inspector, recorded_at, created_at
        FROM inspection_records WHERE task_id = $1
        ORDER BY recorded_at ASC
        "#,
    )
    .bind(task_id)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(records) => Json(ApiResponse::success(records, "获取任务检验记录成功")),
        Err(e) => {
            tracing::error!("获取任务检验记录失败: {}", e);
            Json(ApiResponse::error(500, "获取任务检验记录失败"))
        }
    }
}
