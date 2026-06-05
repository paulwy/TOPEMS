use anyhow::Result;
use axum::{
    extract::{Extension, Path, Query, State},
    http::HeaderMap,
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::Deserialize;
use uuid::Uuid;

use crate::api::audit::log_audit_event;
use crate::models::{CreateQualityStandardRequest, QualityStandard, UpdateQualityStandardRequest};
use crate::services::permission::{check_permission, ModulePermission};
use topems_shared::auth::Claims;
use topems_shared::{ApiResponse, api_error};

use super::ApiState;

#[derive(Debug, Deserialize)]
pub struct QualityStandardQueryParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub async fn create_routes() -> Result<Router<ApiState>> {
    let app = Router::new()
        .route("/api/v1/standards", get(list_standards).post(create_standard))
        .route(
            "/api/v1/standards/{id}",
            get(get_standard).put(update_standard).delete(delete_standard),
        );

    Ok(app)
}

async fn list_standards(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<QualityStandardQueryParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    match check_permission(&state.db, &claims, &ModulePermission::QualityRead).await {
        Ok(_) => {},
        Err(e) => return e,
    }
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let search_pattern = params.search.clone().map(|s| format!("%{}%", s));
    let status_filter = params.status.clone();

    let result = sqlx::query_as::<_, QualityStandard>(
        r#"
        SELECT id, code, name, description, category, version, status, created_at, updated_at
        FROM qms.quality_standards
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
        Ok(standards) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM qms.quality_standards
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
                    "standards": standards,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取质量标准列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取质量标准列表失败: {}", e);
            Json(ApiResponse::<serde_json::Value>::error(500, "获取质量标准列表失败"))
        }
    }
}

async fn create_standard(
    State(state): State<ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateQualityStandardRequest>,
) -> Json<ApiResponse<QualityStandard>> {
    if req.name.is_empty() {
        return Json(api_error(400, "质量标准名称不能为空"));
    }

    if req.code.is_empty() {
        return Json(api_error(400, "质量标准编码不能为空"));
    }

    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, QualityStandard>(
        r#"
        INSERT INTO qms.quality_standards (id, code, name, description, category, version, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, $8)
        RETURNING id, code, name, description, category, version, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.code)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.category)
    .bind(&req.version)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(standard) => (
            Json(ApiResponse::success(standard.clone(), "质量标准创建成功")),
            "success",
            None,
        ),
        Err(e) => {
            tracing::error!("创建质量标准失败: {}", e);
            (
                Json(api_error(500, "质量标准创建失败")),
                "error",
                Some(e.to_string()),
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(standard) = &result {
        serde_json::to_value(standard).ok()
    } else {
        None
    };

    log_audit_event(
        &state.db,
        "create".to_string(),
        "quality_standard".to_string(),
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

async fn get_standard(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<QualityStandard>> {
    let result = sqlx::query_as::<_, QualityStandard>(
        r#"
        SELECT id, code, name, description, category, version, status, created_at, updated_at
        FROM qms.quality_standards WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(standard)) => Json(ApiResponse::success(standard, "获取质量标准成功")),
        Ok(None) => Json(ApiResponse::<QualityStandard>::error(404, "质量标准不存在")),
        Err(e) => {
            tracing::error!("获取质量标准失败: {}", e);
            Json(ApiResponse::<QualityStandard>::error(500, "获取质量标准失败"))
        }
    }
}

async fn update_standard(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateQualityStandardRequest>,
) -> Json<ApiResponse<QualityStandard>> {
    let existing = sqlx::query_as::<_, QualityStandard>(
        "SELECT id, code, name, description, category, version, status, created_at, updated_at FROM qms.quality_standards WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(s)) => s,
        Ok(None) => return Json(ApiResponse::<QualityStandard>::error(404, "质量标准不存在")),
        Err(e) => return Json(ApiResponse::<QualityStandard>::error(500, &format!("查询质量标准失败: {}", e))),
    };

    let name = req.name.unwrap_or(existing.name);
    let description = req.description.or(existing.description);
    let category = req.category.or(existing.category);
    let version = req.version.or(existing.version);
    let status = req.status.unwrap_or(existing.status);
    let now = Utc::now();

    let result = sqlx::query_as::<_, QualityStandard>(
        r#"
        UPDATE qms.quality_standards SET
            name = $2, description = $3, category = $4, version = $5, status = $6, updated_at = $7
        WHERE id = $1
        RETURNING id, code, name, description, category, version, status, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&description)
    .bind(&category)
    .bind(&version)
    .bind(&status)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(standard) => Json(ApiResponse::success(standard, "质量标准更新成功")),
        Err(e) => {
            tracing::error!("更新质量标准失败: {}", e);
            Json(ApiResponse::<QualityStandard>::error(500, "质量标准更新失败"))
        }
    }
}

async fn delete_standard(
    State(state): State<ApiState>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM qms.quality_standards WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "质量标准删除成功")),
            "success".to_string(),
            None,
        ),
        Ok(_) => (
            Json(api_error(404, "质量标准不存在")),
            "error".to_string(),
            Some("质量标准不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除质量标准失败: {}", e);
            (
                Json(api_error(500, "质量标准删除失败")),
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
        "quality_standard".to_string(),
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
