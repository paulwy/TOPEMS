use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{CreateProductionRecordRequest, ProductionRecord, UpdateProductionRecordRequest};
use topems_shared::{ApiResponse, PaginationParams, api_error};

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/records", get(list_records).post(create_record))
        .route(
            "/api/v1/records/{id}",
            get(get_record).put(update_record),
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

    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, ProductionRecord>(
        r#"
        SELECT id, order_id, process_id, work_station_id, operator, quantity_completed, quantity_rejected, start_time, end_time, status, notes, created_at, updated_at
        FROM production_records
        WHERE ($1::text IS NULL OR status = $1)
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(&status_filter)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(records) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM production_records
                WHERE ($1::text IS NULL OR status = $1)
                "#,
            )
            .bind(&status_filter)
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
                "获取生产记录列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取生产记录列表失败: {}", e);
            Json(api_error(500, "获取生产记录列表失败"))
        }
    }
}

async fn create_record(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateProductionRecordRequest>,
) -> Json<ApiResponse<ProductionRecord>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionRecord>(
        r#"
        INSERT INTO production_records (id, order_id, process_id, work_station_id, operator, quantity_completed, quantity_rejected, start_time, end_time, status, notes, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, 'in_progress', NULL, $9, $10)
        RETURNING id, order_id, process_id, work_station_id, operator, quantity_completed, quantity_rejected, start_time, end_time, status, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(req.order_id)
    .bind(req.process_id)
    .bind(req.work_station_id)
    .bind(&req.operator)
    .bind(req.quantity_completed)
    .bind(req.quantity_rejected)
    .bind(req.start_time)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(record) => Json(ApiResponse::success(record, "生产记录创建成功")),
        Err(e) => {
            tracing::error!("创建生产记录失败: {}", e);
            Json(api_error(500, "生产记录创建失败"))
        }
    }
}

async fn get_record(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionRecord>> {
    let result = sqlx::query_as::<_, ProductionRecord>(
        r#"
        SELECT id, order_id, process_id, work_station_id, operator, quantity_completed, quantity_rejected, start_time, end_time, status, notes, created_at, updated_at
        FROM production_records WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(record)) => Json(ApiResponse::success(record, "获取生产记录成功")),
        Ok(None) => Json(api_error(404, "生产记录不存在")),
        Err(e) => {
            tracing::error!("获取生产记录失败: {}", e);
            Json(api_error(500, "获取生产记录失败"))
        }
    }
}

async fn update_record(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProductionRecordRequest>,
) -> Json<ApiResponse<ProductionRecord>> {
    let existing = sqlx::query_as::<_, ProductionRecord>(
        "SELECT id, order_id, process_id, work_station_id, operator, quantity_completed, quantity_rejected, start_time, end_time, status, notes, created_at, updated_at FROM production_records WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(r)) => r,
        Ok(None) => return Json(api_error(404, "生产记录不存在")),
        Err(e) => return Json(api_error(500, &format!("查询生产记录失败: {}", e))),
    };

    let quantity_completed = req.quantity_completed.unwrap_or(existing.quantity_completed);
    let quantity_rejected = req.quantity_rejected.or(existing.quantity_rejected);
    let end_time = req.end_time.or(existing.end_time);
    let status = req.status.unwrap_or(existing.status);
    let notes = req.notes.or(existing.notes);
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionRecord>(
        r#"
        UPDATE production_records SET
            quantity_completed = $2, quantity_rejected = $3, end_time = $4, status = $5, notes = $6, updated_at = $7
        WHERE id = $1
        RETURNING id, order_id, process_id, work_station_id, operator, quantity_completed, quantity_rejected, start_time, end_time, status, notes, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(quantity_completed)
    .bind(quantity_rejected)
    .bind(end_time)
    .bind(&status)
    .bind(&notes)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(record) => Json(ApiResponse::success(record, "生产记录更新成功")),
        Err(e) => {
            tracing::error!("更新生产记录失败: {}", e);
            Json(api_error(500, "生产记录更新失败"))
        }
    }
}
