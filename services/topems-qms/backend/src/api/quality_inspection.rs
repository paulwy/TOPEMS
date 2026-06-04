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

use crate::api::audit::log_audit_event;
use crate::models::{CreateQualityInspectionRequest, QualityInspection, UpdateQualityInspectionRequest};
use topems_shared::{ApiResponse, api_error};

use super::ApiState;

#[derive(Debug, Deserialize)]
pub struct QualityInspectionQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub async fn create_routes() -> Result<Router<ApiState>> {
    let app = Router::new()
        .route("/api/v1/checks", get(list_inspections).post(create_inspection))
        .route(
            "/api/v1/checks/{id}",
            get(get_inspection).put(update_inspection).delete(delete_inspection),
        );

    Ok(app)
}

async fn list_inspections(
    State(state): State<ApiState>,
    Query(params): Query<QualityInspectionQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, QualityInspection>(
        r#"
        SELECT id, title, description, inspection_type, standard_id, inspector, status, result, findings, inspected_at, created_at, updated_at
        FROM qms.quality_inspections
        WHERE ($1::text IS NULL OR title ILIKE $1 OR inspector ILIKE $1)
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
        Ok(inspections) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM qms.quality_inspections
                WHERE ($1::text IS NULL OR title ILIKE $1 OR inspector ILIKE $1)
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
                    "inspections": inspections,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取质量检查列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取质量检查列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取质量检查列表失败"))
        }
    }
}

async fn create_inspection(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateQualityInspectionRequest>,
) -> Json<ApiResponse<QualityInspection>> {
    if req.title.is_empty() {
        return Json(api_error(400, "质量检查标题不能为空"));
    }

    if req.inspection_type.is_empty() {
        return Json(api_error(400, "检查类型不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, QualityInspection>(
        r#"
        INSERT INTO qms.quality_inspections (id, title, description, inspection_type, standard_id, inspector, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8)
        RETURNING id, title, description, inspection_type, standard_id, inspector, status, result, findings, inspected_at, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.inspection_type)
    .bind(req.standard_id)
    .bind(&req.inspector)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(inspection) => (
            Json(ApiResponse::success(inspection.clone(), "质量检查创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建质量检查失败: {}", e);
            (
                Json(api_error(500, "质量检查创建失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(inspection) = &result {
        serde_json::to_value(inspection).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "quality_inspection".to_string(),
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

async fn get_inspection(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<QualityInspection>> {
    let result = sqlx::query_as::<_, QualityInspection>(
        r#"
        SELECT id, title, description, inspection_type, standard_id, inspector, status, result, findings, inspected_at, created_at, updated_at
        FROM qms.quality_inspections WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(inspection)) => Json(ApiResponse::success(inspection, "获取质量检查成功")),
        Ok(None) => Json(ApiResponse::<QualityInspection>::error(404, "质量检查不存在")),
        Err(e) => {
            tracing::error!("获取质量检查失败: {}", e);
            Json(ApiResponse::<QualityInspection>::error(500, "获取质量检查失败"))
        }
    }
}

async fn update_inspection(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateQualityInspectionRequest>,
) -> Json<ApiResponse<QualityInspection>> {
    let existing = sqlx::query_as::<_, QualityInspection>(
        "SELECT id, title, description, inspection_type, standard_id, inspector, status, result, findings, inspected_at, created_at, updated_at FROM qms.quality_inspections WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(i)) => i,
        Ok(None) => return Json(ApiResponse::<QualityInspection>::error(404, "质量检查不存在")),
        Err(e) => return Json(ApiResponse::<QualityInspection>::error(500, &format!("查询质量检查失败: {}", e))),
    };

    let title = req.title.unwrap_or(existing.title);
    let description = req.description.or(existing.description);
    let status = req.status.unwrap_or(existing.status);
    let result = req.result.or(existing.result);
    let findings = req.findings.or(existing.findings);
    let inspected_at = req.inspected_at.or(existing.inspected_at);
    let now = Utc::now();

    let result_query = sqlx::query_as::<_, QualityInspection>(
        r#"
        UPDATE qms.quality_inspections SET
            title = $2, description = $3, status = $4, result = $5, findings = $6, inspected_at = $7, updated_at = $8
        WHERE id = $1
        RETURNING id, title, description, inspection_type, standard_id, inspector, status, result, findings, inspected_at, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&title)
    .bind(&description)
    .bind(&status)
    .bind(&result)
    .bind(&findings)
    .bind(inspected_at)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result_query {
        Ok(inspection) => Json(ApiResponse::success(inspection, "质量检查更新成功")),
        Err(e) => {
            tracing::error!("更新质量检查失败: {}", e);
            Json(ApiResponse::<QualityInspection>::error(500, "质量检查更新失败"))
        }
    }
}

async fn delete_inspection(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM qms.quality_inspections WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "质量检查删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "质量检查不存在")),
            "error".to_string(),
            Some("质量检查不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除质量检查失败: {}", e);
            (
                Json(api_error(500, "质量检查删除失败")),
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
        "quality_inspection".to_string(),
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
