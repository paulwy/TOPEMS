use axum::{
    extract::{Path, Query, State},
    http::HeaderMap,
    routing::*,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use topems_shared::Result;
use uuid::Uuid;

use crate::api::audit::log_audit_event;
use crate::api::ApiState;
use crate::models::{
    CreateInspectionProcessRequest, InspectionProcess, UpdateInspectionProcessRequest,
};
use topems_shared::response::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub async fn create_routes() -> Result<Router<ApiState>> {
    let app = Router::new()
        .route(
            "/api/v1/processes",
            get(list_processes).post(create_process),
        )
        .route(
            "/api/v1/processes/{id}",
            get(get_process).put(update_process).delete(delete_process),
        );

    Ok(app)
}

async fn list_processes(
    State(state): State<ApiState>,
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
        FROM lims.inspection_processes
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
                SELECT COUNT(*) FROM lims.inspection_processes
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
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateInspectionProcessRequest>,
) -> Json<ApiResponse<InspectionProcess>> {
    if req.name.is_empty() {
        return Json(api_error(400, "检验流程名称不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();
    let name = req.name.clone();
    let description = req.description.clone();
    let steps_value = serde_json::to_value(&req.steps).unwrap_or(serde_json::json!([]));

    let result = sqlx::query_as::<_, InspectionProcess>(
        r#"
        INSERT INTO lims.inspection_processes (id, name, description, steps, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'active', $5, $6)
        RETURNING id, name, description, steps, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&description)
    .bind(steps_value)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(process) => (
            Json(ApiResponse::success(process.clone(), "检验流程创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建检验流程失败: {}", e);
            (
                Json(api_error(500, "检验流程创建失败")),
                "error",
                Some(e.to_string()),
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
        "inspection_process".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    )
    .await;

    response
}

async fn get_process(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<InspectionProcess>> {
    let result = sqlx::query_as::<_, InspectionProcess>(
        r#"
        SELECT id, name, description, steps, status, created_at, updated_at
        FROM lims.inspection_processes WHERE id = $1
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
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateInspectionProcessRequest>,
) -> Json<ApiResponse<InspectionProcess>> {
    let existing = sqlx::query_as::<_, InspectionProcess>(
        "SELECT id, name, description, steps, status, created_at, updated_at FROM lims.inspection_processes WHERE id = $1",
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
    let steps = req
        .steps
        .map(|s| serde_json::to_value(s).unwrap_or_else(|_| existing.steps.clone()))
        .unwrap_or(existing.steps);
    let now = Utc::now();

    let result = sqlx::query_as::<_, InspectionProcess>(
        r#"
        UPDATE lims.inspection_processes SET
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
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM lims.inspection_processes WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "检验流程删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "检验流程不存在")),
            "error".to_string(),
            Some("检验流程不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除检验流程失败: {}", e);
            (
                Json(api_error(500, "检验流程删除失败")),
                "error".to_string(),
                Some(e.to_string()),
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "delete".to_string(),
        "inspection_process".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str,
        error_msg,
        &headers,
    )
    .await;

    response
}
