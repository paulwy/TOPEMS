use axum::{
    extract::{Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::Row;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::api::ApiState;
use crate::models::{InspectionRecord, Sample};
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

#[derive(Debug, Deserialize, IntoParams)]
pub struct ProjectSamplesQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
#[allow(dead_code)]
pub struct ProjectWithSamples {
    pub project_id: Uuid,
    pub project_name: Option<String>,
    pub project_code: Option<String>,
    pub total_samples: i64,
    pub completed_samples: i64,
    pub pending_samples: i64,
    pub samples: Vec<Sample>,
}

#[derive(Debug, Serialize, ToSchema)]
#[allow(dead_code)]
pub struct SampleWithInspection {
    pub sample: Sample,
    pub latest_inspection: Option<InspectionRecord>,
    pub inspection_count: i64,
}

#[derive(Debug, Serialize, ToSchema)]
#[allow(dead_code)]
pub struct RsProjectInfo {
    pub id: Uuid,
    pub name: String,
    pub code: String,
    pub status: String,
    pub progress: i32,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct LinkSampleRequest {
    pub sample_id: Uuid,
    pub project_id: Uuid,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BatchLinkRequest {
    pub sample_ids: Vec<Uuid>,
    pub project_id: Uuid,
}

pub async fn create_routes() -> Result<Router<ApiState>> {
    let app = Router::new()
        .route(
            "/api/v1/rs/projects/{project_id}/samples",
            get(get_project_samples),
        )
        .route(
            "/api/v1/rs/samples/{sample_id}/project",
            get(get_sample_project),
        )
        .route(
            "/api/v1/rs/samples/{sample_id}/inspections",
            get(get_sample_inspections),
        )
        .route("/api/v1/rs/samples/link", post(link_sample_to_project))
        .route("/api/v1/rs/samples/batch-link", post(batch_link_samples));

    Ok(app)
}

#[utoipa::path(
    get,
    path = "/api/v1/rs/projects/{project_id}/samples",
    tag = "rs_integration",
    params(
        ("project_id" = Uuid, Path, description = "Project ID from RS system"),
        ("page" = Option<i64>, Query, description = "Page number", nullable = true),
        ("page_size" = Option<i64>, Query, description = "Page size", nullable = true)
    ),
    responses(
        (status = 200, description = "List of samples for the project", body = ApiResponse<ProjectWithSamples>),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn get_project_samples(
    State(state): State<ApiState>,
    Path(project_id): Path<Uuid>,
    Query(params): Query<ProjectSamplesQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let sample_count: i64 =
        sqlx::query_scalar(r#"SELECT COUNT(*) FROM lims.samples WHERE project_id = $1"#)
            .bind(project_id)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

    let completed_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM lims.samples WHERE project_id = $1 AND status = 'completed'"#,
    )
    .bind(project_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let pending_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM lims.samples WHERE project_id = $1 AND status != 'completed'"#,
    )
    .bind(project_id)
    .fetch_one(&state.db)
    .await
    .unwrap_or(0);

    let samples = sqlx::query_as::<_, Sample>(
        r#"
        SELECT id, name, description, status, project_id, received_date, created_at, updated_at
        FROM lims.samples
        WHERE project_id = $1
        ORDER BY received_date DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(project_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match samples {
        Ok(samples) => Json(ApiResponse::success(
            serde_json::json!({
                "project_id": project_id,
                "total_samples": sample_count,
                "completed_samples": completed_count,
                "pending_samples": pending_count,
                "samples": samples,
                "page": page,
                "page_size": page_size
            }),
            "获取项目样品列表成功",
        )),
        Err(e) => {
            tracing::error!("获取项目样品失败: {}", e);
            Json(ApiResponse::error(500, "获取项目样品失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/rs/samples/{sample_id}/project",
    tag = "rs_integration",
    params(
        ("sample_id" = Uuid, Path, description = "Sample ID")
    ),
    responses(
        (status = 200, description = "Project information for the sample", body = ApiResponse<RsProjectInfo>),
        (status = 404, description = "Sample not found or not linked to any project"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn get_sample_project(
    State(state): State<ApiState>,
    Path(sample_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let sample = sqlx::query_as::<_, Sample>(r#"SELECT id, name, description, status, project_id, received_date, created_at, updated_at FROM lims.samples WHERE id = $1"#)
        .bind(sample_id)
        .fetch_optional(&state.db)
        .await;

    match sample {
        Ok(Some(sample)) => {
            if let Some(project_id) = sample.project_id {
                let project_data = serde_json::json!({
                    "project_id": project_id,
                    "project_name": "项目名称",
                    "project_code": "PRJ-001",
                    "status": "active",
                    "progress": 65
                });
                Json(ApiResponse::success(project_data, "获取样品关联项目成功"))
            } else {
                Json(ApiResponse::error(404, "样品未关联任何项目"))
            }
        }
        Ok(None) => Json(ApiResponse::error(404, "样品不存在")),
        Err(e) => {
            tracing::error!("获取样品项目信息失败: {}", e);
            Json(ApiResponse::error(500, "获取样品项目信息失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/rs/samples/{sample_id}/inspections",
    tag = "rs_integration",
    params(
        ("sample_id" = Uuid, Path, description = "Sample ID")
    ),
    responses(
        (status = 200, description = "Inspection records for the sample", body = ApiResponse<SampleWithInspection>),
        (status = 404, description = "Sample not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn get_sample_inspections(
    State(state): State<ApiState>,
    Path(sample_id): Path<Uuid>,
) -> Json<ApiResponse<serde_json::Value>> {
    let sample = sqlx::query_as::<_, Sample>(r#"SELECT id, name, description, status, project_id, received_date, created_at, updated_at FROM lims.samples WHERE id = $1"#)
        .bind(sample_id)
        .fetch_optional(&state.db)
        .await;

    match sample {
        Ok(Some(sample)) => {
            let inspection_count: i64 = sqlx::query_scalar(r#"SELECT COUNT(*) FROM lims.inspection_records r JOIN lims.inspection_tasks t ON r.task_id = t.id WHERE t.sample_id = $1"#)
                .bind(sample_id)
                .fetch_one(&state.db)
                .await
                .unwrap_or(0);

            let latest_inspection_result = sqlx::query(r#"SELECT r.id, r.result, r.conclusion, r.inspector, r.recorded_at, r.created_at FROM lims.inspection_records r JOIN lims.inspection_tasks t ON r.task_id = t.id WHERE t.sample_id = $1 ORDER BY r.recorded_at DESC LIMIT 1"#)
                .bind(sample_id)
                .fetch_optional(&state.db)
                .await;

            let latest_inspection = match latest_inspection_result {
                Ok(Some(record)) => Some(serde_json::json!({
                    "id": record.get::<Uuid, _>("id"),
                    "result": record.get::<String, _>("result"),
                    "conclusion": record.get::<Option<String>, _>("conclusion"),
                    "inspector": record.get::<String, _>("inspector"),
                    "recorded_at": record.get::<chrono::DateTime<chrono::Utc>, _>("recorded_at"),
                    "created_at": record.get::<chrono::DateTime<chrono::Utc>, _>("created_at")
                })),
                _ => None,
            };

            Json(ApiResponse::success(
                serde_json::json!({
                    "sample": sample,
                    "inspection_count": inspection_count,
                    "latest_inspection": latest_inspection
                }),
                "获取样品检验记录成功",
            ))
        }
        Ok(None) => Json(ApiResponse::error(404, "样品不存在")),
        Err(e) => {
            tracing::error!("获取样品检验记录失败: {}", e);
            Json(ApiResponse::error(500, "获取样品检验记录失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/v1/rs/samples/link",
    tag = "rs_integration",
    request_body = LinkSampleRequest,
    responses(
        (status = 200, description = "Sample linked to project successfully", body = ApiResponse<Sample>),
        (status = 404, description = "Sample not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn link_sample_to_project(
    State(state): State<ApiState>,
    Json(req): Json<LinkSampleRequest>,
) -> Json<ApiResponse<Sample>> {
    let result = sqlx::query_as::<_, Sample>(r#"UPDATE lims.samples SET project_id = $2, updated_at = $3 WHERE id = $1 RETURNING id, name, description, status, project_id, received_date, created_at, updated_at"#)
        .bind(req.sample_id)
        .bind(req.project_id)
        .bind(Utc::now())
        .fetch_optional(&state.db)
        .await;

    match result {
        Ok(Some(sample)) => Json(ApiResponse::success(sample, "样品关联项目成功")),
        Ok(None) => Json(ApiResponse::error(404, "样品不存在")),
        Err(e) => {
            tracing::error!("关联样品到项目失败: {}", e);
            Json(ApiResponse::error(500, "关联样品到项目失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/v1/rs/samples/batch-link",
    tag = "rs_integration",
    request_body = BatchLinkRequest,
    responses(
        (status = 200, description = "Samples linked to project successfully", body = ApiResponse<serde_json::Value>),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn batch_link_samples(
    State(state): State<ApiState>,
    Json(req): Json<BatchLinkRequest>,
) -> Json<ApiResponse<serde_json::Value>> {
    if req.sample_ids.is_empty() {
        return Json(ApiResponse::error(400, "未提供样品ID"));
    }

    let result = sqlx::query(
        r#"UPDATE lims.samples SET project_id = $1, updated_at = $2 WHERE id = ANY($3)"#,
    )
    .bind(req.project_id)
    .bind(Utc::now())
    .bind(&req.sample_ids)
    .execute(&state.db)
    .await;

    match result {
        Ok(r) => {
            let affected = r.rows_affected();
            Json(ApiResponse::success(
                serde_json::json!({
                    "total_requested": req.sample_ids.len(),
                    "success_count": affected
                }),
                &format!("成功关联 {} 个样品", affected),
            ))
        }
        Err(e) => {
            tracing::error!("批量关联样品失败: {}", e);
            Json(ApiResponse::error(500, "批量关联样品失败"))
        }
    }
}
