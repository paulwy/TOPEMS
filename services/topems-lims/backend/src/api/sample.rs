use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    http::{header, HeaderMap},
    response::{IntoResponse, Response},
    body::Bytes,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;
use utoipa::{ToSchema, IntoParams};

use crate::models::{CreateSampleRequest, Sample, UpdateSampleRequest};
use topems_shared::Result;

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

#[derive(Debug, Deserialize, IntoParams)]
pub struct ListSamplesQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BatchDeleteRequest {
    pub ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BatchCreateRequest {
    pub samples: Vec<CreateSampleRequest>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct BatchOperationResult {
    pub total: usize,
    pub success: usize,
    pub failed: usize,
    pub errors: Vec<String>,
}

pub async fn create_routes(db: PgPool) -> Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/samples", get(list_samples).post(create_sample))
        .route("/api/v1/samples/batch", post(batch_create_samples).delete(batch_delete_samples))
        .route("/api/v1/samples/export", get(export_samples))
        .route("/api/v1/samples/import", post(import_samples))
        .route(
            "/api/v1/samples/{id}",
            get(get_sample).put(update_sample).delete(delete_sample),
        )
        .with_state(state);

    Ok(app)
}

#[utoipa::path(
    get,
    path = "/api/v1/samples",
    tag = "samples",
    params(
        ("page" = Option<i64>, Query, description = "Page number, starting from 1", nullable = true),
        ("page_size" = Option<i64>, Query, description = "Number of items per page", nullable = true),
        ("search" = Option<String>, Query, description = "Search by name or description", nullable = true),
        ("status" = Option<String>, Query, description = "Filter by status", nullable = true)
    ),
    responses(
        (status = 200, description = "List of samples retrieved successfully", body = ApiResponse<Vec<Sample>>),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
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

#[utoipa::path(
    post,
    path = "/api/v1/samples",
    tag = "samples",
    request_body = CreateSampleRequest,
    responses(
        (status = 200, description = "Sample created successfully", body = ApiResponse<Sample>),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn create_sample(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
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

    let (response, status, error_msg) = match &result {
        Ok(sample) => (
            Json(ApiResponse::success(sample.clone(), "样品创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建样品失败: {}", e);
            (
                Json(ApiResponse::error(500, "样品创建失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(sample) = result {
        serde_json::to_value(&sample).ok()
    } else {
        None
    };

    crate::api::audit::log_audit_event(
        &state.db,
        "create".to_string(),
        "sample".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status.to_string(),
        error_msg,
        &headers,
    ).await;

    response
}

#[utoipa::path(
    get,
    path = "/api/v1/samples/{id}",
    tag = "samples",
    params(
        ("id" = Uuid, Path, description = "Sample ID")
    ),
    responses(
        (status = 200, description = "Sample retrieved successfully", body = ApiResponse<Sample>),
        (status = 404, description = "Sample not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
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

#[utoipa::path(
    put,
    path = "/api/v1/samples/{id}",
    tag = "samples",
    params(
        ("id" = Uuid, Path, description = "Sample ID")
    ),
    request_body = UpdateSampleRequest,
    responses(
        (status = 200, description = "Sample updated successfully", body = ApiResponse<Sample>),
        (status = 404, description = "Sample not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn update_sample(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
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

    let name = req.name.clone().unwrap_or(existing.name);
    let description = req.description.clone().or(existing.description);
    let status = req.status.clone().unwrap_or(existing.status);
    let project_id = req.project_id.clone().or(existing.project_id);
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

    let (response, status_str, error_msg) = match &result {
        Ok(sample) => (
            Json(ApiResponse::success(sample.clone(), "样品更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新样品失败: {}", e);
            (
                Json(ApiResponse::error(500, "样品更新失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(sample) = result {
        serde_json::to_value(&sample).ok()
    } else {
        None
    };

    crate::api::audit::log_audit_event(
        &state.db,
        "update".to_string(),
        "sample".to_string(),
        Some(id),
        None,
        None,
        None,
        request_data,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    ).await;

    response
}

#[utoipa::path(
    delete,
    path = "/api/v1/samples/{id}",
    tag = "samples",
    params(
        ("id" = Uuid, Path, description = "Sample ID")
    ),
    responses(
        (status = 200, description = "Sample deleted successfully"),
        (status = 404, description = "Sample not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn delete_sample(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<()>> {
    let result = sqlx::query("DELETE FROM samples WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success((), "样品删除成功")),
            "success",
            None
        ),
        Ok(_) => (
            Json(ApiResponse::error(404, "样品不存在")),
            "error",
            Some("样品不存在".to_string())
        ),
        Err(e) => {
            tracing::error!("删除样品失败: {}", e);
            (
                Json(ApiResponse::error(500, "样品删除失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let response_data = if let Ok(r) = &result {
        Some(serde_json::json!({ "rows_affected": r.rows_affected() }))
    } else {
        None
    };

    crate::api::audit::log_audit_event(
        &state.db,
        "delete".to_string(),
        "sample".to_string(),
        Some(id),
        None,
        None,
        None,
        None,
        response_data,
        status_str.to_string(),
        error_msg,
        &headers,
    ).await;

    response
}

#[utoipa::path(
    post,
    path = "/api/v1/samples/batch",
    tag = "samples",
    request_body = BatchCreateRequest,
    responses(
        (status = 200, description = "Samples created successfully", body = ApiResponse<BatchOperationResult>),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn batch_create_samples(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<BatchCreateRequest>,
) -> Json<ApiResponse<BatchOperationResult>> {
    let mut success = 0;
    let mut errors = Vec::new();

    for (index, sample_req) in req.samples.iter().enumerate() {
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
        .bind(&sample_req.name)
        .bind(&sample_req.description)
        .bind(&sample_req.status)
        .bind(sample_req.project_id)
        .bind(now)
        .bind(now)
        .bind(now)
        .fetch_one(&state.db)
        .await;

        match result {
            Ok(_) => success += 1,
            Err(e) => {
                errors.push(format!("样品 {}: {}", index + 1, e));
                tracing::error!("批量创建样品失败 (索引 {}): {}", index, e);
            }
        }
    }

    let total = req.samples.len();
    let result = BatchOperationResult {
        total,
        success,
        failed: total - success,
        errors,
    };

    let status = if success == total { "success" } else { "partial" };
    let response_data = serde_json::to_value(&result).ok();

    crate::api::audit::log_audit_event(
        &state.db,
        "batch_create".to_string(),
        "sample".to_string(),
        None,
        Some(serde_json::json!({ "count": total })),
        None,
        None,
        Some(serde_json::json!({ "count": req.samples.len() })),
        response_data,
        status.to_string(),
        if !result.errors.is_empty() {
            Some(result.errors.join("; "))
        } else {
            None
        },
        &headers,
    ).await;

    if success == total {
        Json(ApiResponse::success(result, "批量创建样品成功"))
    } else {
        Json(ApiResponse::success(result, "部分样品创建成功"))
    }
}

#[utoipa::path(
    delete,
    path = "/api/v1/samples/batch",
    tag = "samples",
    request_body = BatchDeleteRequest,
    responses(
        (status = 200, description = "Samples deleted successfully", body = ApiResponse<BatchOperationResult>),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn batch_delete_samples(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<BatchDeleteRequest>,
) -> Json<ApiResponse<BatchOperationResult>> {
    if req.ids.is_empty() {
        return Json(ApiResponse::error(400, "未提供要删除的样品 ID"));
    }

    let result = sqlx::query(
        r#"DELETE FROM samples WHERE id = ANY($1)"#,
    )
    .bind(&req.ids)
    .execute(&state.db)
    .await;

    match result {
        Ok(r) => {
            let affected = r.rows_affected() as usize;
            let total = req.ids.len();
            let result = BatchOperationResult {
                total,
                success: affected,
                failed: total - affected,
                errors: if affected == total { vec![] } else { vec!["部分样品可能不存在".to_string()] },
            };

            let status = if affected == total { "success" } else { "partial" };
            let response_data = serde_json::to_value(&result).ok();

            crate::api::audit::log_audit_event(
                &state.db,
                "batch_delete".to_string(),
                "sample".to_string(),
                None,
                Some(serde_json::json!({ "ids": req.ids })),
                None,
                None,
                None,
                response_data,
                status.to_string(),
                if !result.errors.is_empty() {
                    Some(result.errors.join("; "))
                } else {
                    None
                },
                &headers,
            ).await;

            Json(ApiResponse::success(result, "批量删除操作完成"))
        }
        Err(e) => {
            tracing::error!("批量删除样品失败: {}", e);

            crate::api::audit::log_audit_event(
                &state.db,
                "batch_delete".to_string(),
                "sample".to_string(),
                None,
                Some(serde_json::json!({ "ids": req.ids })),
                None,
                None,
                None,
                None,
                "error".to_string(),
                Some(e.to_string()),
                &headers,
            ).await;

            Json(ApiResponse::error(500, "批量删除失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/samples/export",
    tag = "samples",
    responses(
        (status = 200, description = "Samples exported successfully"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn export_samples(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Response {
    let result = sqlx::query_as::<_, Sample>(
        r#"
        SELECT id, name, description, status, project_id, received_date, created_at, updated_at
        FROM samples
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(samples) => {
            let sample_count = samples.len();
            let mut wtr = csv::Writer::from_writer(vec![]);
            
            // Write header
            if let Err(e) = wtr.write_record(&["id", "name", "description", "status", "project_id", "received_date", "created_at", "updated_at"]) {
                tracing::error!("导出样品 CSV 头部失败: {}", e);
                crate::api::audit::log_audit_event(
                    &state.db,
                    "export".to_string(),
                    "sample".to_string(),
                    None,
                    None,
                    None,
                    None,
                    None,
                    None,
                    "error".to_string(),
                    Some(e.to_string()),
                    &headers,
                ).await;
                return (
                    [(header::CONTENT_TYPE, "application/json")],
                    Json(ApiResponse::<()>::error(500, "导出失败")),
                ).into_response();
            }
            
            // Write rows
            for sample in samples {
                let row = vec![
                    sample.id.to_string(),
                    sample.name.clone(),
                    sample.description.unwrap_or_default(),
                    sample.status.clone(),
                    sample.project_id.map(|u| u.to_string()).unwrap_or_default(),
                    sample.received_date.to_rfc3339(),
                    sample.created_at.to_rfc3339(),
                    sample.updated_at.to_rfc3339(),
                ];
                
                if let Err(e) = wtr.write_record(&row) {
                    tracing::error!("导出样品 CSV 行失败: {}", e);
                    crate::api::audit::log_audit_event(
                        &state.db,
                        "export".to_string(),
                        "sample".to_string(),
                        None,
                        None,
                        None,
                        None,
                        None,
                        None,
                        "error".to_string(),
                        Some(e.to_string()),
                        &headers,
                    ).await;
                    return (
                        [(header::CONTENT_TYPE, "application/json")],
                        Json(ApiResponse::<()>::error(500, "导出失败")),
                    ).into_response();
                }
            }
            
            match wtr.into_inner() {
                Ok(data) => {
                    let filename = format!("samples_{}.csv", Utc::now().format("%Y%m%d_%H%M%S"));
                    
                    crate::api::audit::log_audit_event(
                        &state.db,
                        "export".to_string(),
                        "sample".to_string(),
                        None,
                        None,
                        None,
                        None,
                        None,
                        Some(serde_json::json!({ "count": sample_count, "filename": filename })),
                        "success".to_string(),
                        None,
                        &headers,
                    ).await;
                    
                    (
                        [
                            (header::CONTENT_TYPE, "text/csv"),
                            (header::CONTENT_DISPOSITION, &format!("attachment; filename=\"{}\"", filename)),
                        ],
                        data,
                    ).into_response()
                }
                Err(e) => {
                    tracing::error!("导出样品 CSV 完成失败: {}", e);
                    crate::api::audit::log_audit_event(
                        &state.db,
                        "export".to_string(),
                        "sample".to_string(),
                        None,
                        None,
                        None,
                        None,
                        None,
                        None,
                        "error".to_string(),
                        Some(e.to_string()),
                        &headers,
                    ).await;
                    (
                        [(header::CONTENT_TYPE, "application/json")],
                        Json(ApiResponse::<()>::error(500, "导出失败")),
                    ).into_response()
                }
            }
        }
        Err(e) => {
            tracing::error!("导出样品失败: {}", e);
            crate::api::audit::log_audit_event(
                &state.db,
                "export".to_string(),
                "sample".to_string(),
                None,
                None,
                None,
                None,
                None,
                None,
                "error".to_string(),
                Some(e.to_string()),
                &headers,
            ).await;
            (
                [(header::CONTENT_TYPE, "application/json")],
                Json(ApiResponse::<()>::error(500, "导出失败")),
            ).into_response()
        }
    }
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CsvImportRow {
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub project_id: Option<String>,
}

#[utoipa::path(
    post,
    path = "/api/v1/samples/import",
    tag = "samples",
    request_body(content = String, description = "CSV file content", content_type = "text/csv"),
    responses(
        (status = 200, description = "Samples imported successfully", body = ApiResponse<BatchOperationResult>),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn import_samples(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    bytes: Bytes,
) -> Json<ApiResponse<BatchOperationResult>> {
    let mut rdr = csv::Reader::from_reader(&bytes[..]);
    let _ = match rdr.headers() {
        Ok(h) => h.clone(),
        Err(e) => {
            tracing::error!("解析 CSV 头部失败: {}", e);
            
            crate::api::audit::log_audit_event(
                &state.db,
                "import".to_string(),
                "sample".to_string(),
                None,
                None,
                None,
                None,
                None,
                None,
                "error".to_string(),
                Some(e.to_string()),
                &headers,
            ).await;
            
            return Json(ApiResponse::error(400, "CSV 格式错误"));
        }
    };
    
    let mut success = 0;
    let mut errors = Vec::new();
    let mut row_num = 0;
    
    for result in rdr.records() {
        row_num += 1;
        match result {
            Ok(record) => {
                let name = record.get(1).unwrap_or_default().to_string();
                if name.is_empty() {
                    errors.push(format!("第 {} 行: 样品名称不能为空", row_num));
                    continue;
                }
                
                let description = record.get(2).and_then(|s| if s.is_empty() { None } else { Some(s.to_string()) });
                let status = record.get(3).unwrap_or("待测试").to_string();
                let project_id_str = record.get(4).and_then(|s| if s.is_empty() { None } else { Some(s) });
                let project_id = match project_id_str {
                    Some(s) => match Uuid::parse_str(s) {
                        Ok(u) => Some(u),
                        Err(_) => None,
                    },
                    None => None,
                };
                
                let id = Uuid::new_v4();
                let now = Utc::now();
                
                let insert_result = sqlx::query_as::<_, Sample>(
                    r#"
                    INSERT INTO samples (id, name, description, status, project_id, received_date, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id, name, description, status, project_id, received_date, created_at, updated_at
                    "#,
                )
                .bind(id)
                .bind(&name)
                .bind(&description)
                .bind(&status)
                .bind(project_id)
                .bind(now)
                .bind(now)
                .bind(now)
                .fetch_one(&state.db)
                .await;
                
                match insert_result {
                    Ok(_) => success += 1,
                    Err(e) => {
                        errors.push(format!("第 {} 行: {}", row_num, e));
                        tracing::error!("导入样品失败 (行 {}): {}", row_num, e);
                    }
                }
            }
            Err(e) => {
                errors.push(format!("第 {} 行: {}", row_num, e));
                tracing::error!("解析 CSV 行失败 (行 {}): {}", row_num, e);
            }
        }
    }
    
    let total = row_num;
    let result = BatchOperationResult {
        total,
        success,
        failed: total - success,
        errors,
    };
    
    let status = if success == total { "success" } else { "partial" };
    let response_data = serde_json::to_value(&result).ok();
    
    crate::api::audit::log_audit_event(
        &state.db,
        "import".to_string(),
        "sample".to_string(),
        None,
        None,
        None,
        None,
        Some(serde_json::json!({ "total_rows": total })),
        response_data,
        status.to_string(),
        if !result.errors.is_empty() {
            Some(result.errors.join("; "))
        } else {
            None
        },
        &headers,
    ).await;
    
    if success == total {
        Json(ApiResponse::success(result, "导入完成"))
    } else {
        Json(ApiResponse::success(result, "部分导入成功"))
    }
}

