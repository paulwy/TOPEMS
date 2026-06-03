use anyhow::Result;
use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::{get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::models::{CreateWorkStationRequest, UpdateWorkStationRequest, WorkStation};
use topems_shared::{ApiResponse, PaginationParams, api_error};
use crate::api::audit::log_audit_event;

use super::ApiState;

pub async fn create_routes() -> Result<Router<ApiState>> {
    let app = Router::new()
        .route("/api/v1/workstations", get(list_workstations).post(create_workstation))
        .route(
            "/api/v1/workstations/{id}",
            get(get_workstation).put(update_workstation),
        );

    Ok(app)
}

async fn list_workstations(
    State(state): State<ApiState>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, WorkStation>(
        r#"
        SELECT id, name, code, location, capacity, status, supervisor, created_at, updated_at
        FROM work_stations
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
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
        Ok(workstations) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM work_stations
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
                    "workstations": workstations,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取工作站列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取工作站列表失败: {}", e);
            Json(api_error(500, "获取工作站列表失败"))
        }
    }
}

async fn create_workstation(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateWorkStationRequest>,
) -> Json<ApiResponse<WorkStation>> {
    if req.name.is_empty() {
        return Json(api_error(400, "工作站名称不能为空"));
    }

    if req.code.is_empty() {
        return Json(api_error(400, "工作站编码不能为空"));
    }

    let request_data = serde_json::to_value(&req).ok();
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, WorkStation>(
        r#"
        INSERT INTO work_stations (id, name, code, location, capacity, status, supervisor, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 'idle', $6, $7, $8)
        RETURNING id, name, code, location, capacity, status, supervisor, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.location)
    .bind(req.capacity)
    .bind(&req.supervisor)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status, error_msg) = match &result {
        Ok(ws) => (
            Json(ApiResponse::success(ws.clone(), "工作站创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建工作站失败: {}", e);
            (
                Json(api_error(500, "工作站创建失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(ws) = &result {
        serde_json::to_value(ws).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "work_station".to_string(),
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

async fn get_workstation(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<WorkStation>> {
    let result = sqlx::query_as::<_, WorkStation>(
        r#"
        SELECT id, name, code, location, capacity, status, supervisor, created_at, updated_at
        FROM work_stations WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(ws)) => Json(ApiResponse::success(ws, "获取工作站成功")),
        Ok(None) => Json(api_error(404, "工作站不存在")),
        Err(e) => {
            tracing::error!("获取工作站失败: {}", e);
            Json(api_error(500, "获取工作站失败"))
        }
    }
}

async fn update_workstation(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateWorkStationRequest>,
) -> Json<ApiResponse<WorkStation>> {
    // 先获取 request_data 避免所有权问题
    let request_data = serde_json::to_value(&req).ok();
    
    let existing = sqlx::query_as::<_, WorkStation>(
        "SELECT id, name, code, location, capacity, status, supervisor, created_at, updated_at FROM work_stations WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(ws)) => ws,
        Ok(None) => return Json(api_error(404, "工作站不存在")),
        Err(e) => return Json(api_error(500, &format!("查询工作站失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let code = req.code.or(existing.code);
    let location = req.location.or(existing.location);
    let capacity = req.capacity.or(existing.capacity);
    let status = req.status.unwrap_or(existing.status);
    let supervisor = req.supervisor.or(existing.supervisor);
    let now = Utc::now();

    let result = sqlx::query_as::<_, WorkStation>(
        r#"
        UPDATE work_stations SET
            name = $2, code = $3, location = $4, capacity = $5, status = $6, supervisor = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, name, code, location, capacity, status, supervisor, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&code)
    .bind(&location)
    .bind(capacity)
    .bind(&status)
    .bind(&supervisor)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(ws) => (
            Json(ApiResponse::success(ws.clone(), "工作站更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新工作站失败: {}", e);
            (
                Json(api_error(500, "工作站更新失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(ws) = &result {
        serde_json::to_value(ws).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "update".to_string(),
        "work_station".to_string(),
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
