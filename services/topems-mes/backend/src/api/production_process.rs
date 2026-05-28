use anyhow::Result;
use axum::{
    extract::{Path, Query, State, HeaderMap},
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::{CreateProductionProcessRequest, ProductionProcess, UpdateProductionProcessRequest};
use topems_shared::{ApiResponse, PaginationParams, api_error};
use crate::api::audit::log_audit_event;

pub struct AppState {
    pub db: PgPool,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/processes", get(list_processes).post(create_process))
        .route(
            "/api/v1/processes/{id}",
            get(get_process).put(update_process),
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

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, ProductionProcess>(
        r#"
        SELECT id, name, code, description, sequence, standard_time, work_station_id, status, created_at, updated_at
        FROM production_processes
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY sequence ASC
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
                SELECT COUNT(*) FROM production_processes
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
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
                "获取生产工序列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取生产工序列表失败: {}", e);
            Json(api_error(500, "获取生产工序列表失败"))
        }
    }
}

async fn create_process(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<CreateProductionProcessRequest>,
) -> Json<ApiResponse<ProductionProcess>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionProcess>(
        r#"
        INSERT INTO production_processes (id, name, code, description, sequence, standard_time, work_station_id, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', $8, $9)
        RETURNING id, name, code, description, sequence, standard_time, work_station_id, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.description)
    .bind(req.sequence)
    .bind(req.standard_time)
    .bind(req.work_station_id)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(process) => (
            Json(ApiResponse::success(process.clone(), "生产工序创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建生产工序失败: {}", e);
            (
                Json(api_error(500, "生产工序创建失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(process) = &result {
        serde_json::to_value(process).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "production_process".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status.to_string(),
        error_msg,
        &headers
    ).await;

    response
}

async fn get_process(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProductionProcess>> {
    let result = sqlx::query_as::<_, ProductionProcess>(
        r#"
        SELECT id, name, code, description, sequence, standard_time, work_station_id, status, created_at, updated_at
        FROM production_processes WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(process)) => Json(ApiResponse::success(process, "获取生产工序成功")),
        Ok(None) => Json(api_error(404, "生产工序不存在")),
        Err(e) => {
            tracing::error!("获取生产工序失败: {}", e);
            Json(api_error(500, "获取生产工序失败"))
        }
    }
}

async fn update_process(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateProductionProcessRequest>,
) -> Json<ApiResponse<ProductionProcess>> {
    let existing = sqlx::query_as::<_, ProductionProcess>(
        "SELECT id, name, code, description, sequence, standard_time, work_station_id, status, created_at, updated_at FROM production_processes WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(p)) => p,
        Ok(None) => return Json(api_error(404, "生产工序不存在")),
        Err(e) => return Json(api_error(500, &format!("查询生产工序失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let code = req.code.or(existing.code);
    let description = req.description.or(existing.description);
    let sequence = req.sequence.unwrap_or(existing.sequence);
    let standard_time = req.standard_time.or(existing.standard_time);
    let work_station_id = req.work_station_id.or(existing.work_station_id);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, ProductionProcess>(
        r#"
        UPDATE production_processes SET
            name = $2, code = $3, description = $4, sequence = $5, standard_time = $6, work_station_id = $7, status = $8, updated_at = $9
        WHERE id = $1
        RETURNING id, name, code, description, sequence, standard_time, work_station_id, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&code)
    .bind(&description)
    .bind(sequence)
    .bind(standard_time)
    .bind(work_station_id)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(process) => (
            Json(ApiResponse::success(process.clone(), "生产工序更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新生产工序失败: {}", e);
            (
                Json(api_error(500, "生产工序更新失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(process) = &result {
        serde_json::to_value(process).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "production_process".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers
    ).await;

    response
}
