use axum::{extract::State, http::HeaderMap, routing::get, Extension, Json, Router};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::middleware::tenant::TenantContext;
use topems_shared_core::locale::Locale;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/processes", get(list_processes).post(create_process))
        .route(
            "/processes/{id}",
            get(get_process).put(update_process).delete(delete_process),
        )
}

#[derive(Debug, Serialize)]
pub struct InspectionProcess {
    pub id: String,
    pub tenant_id: String,
    pub process_no: String,
    pub name: String,
    pub description: Option<String>,
    pub steps: serde_json::Value,
    pub status: String,
    pub created_by: Option<String>,
    pub updated_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateProcessRequest {
    pub name: String,
    pub description: Option<String>,
    pub steps: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProcessRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub steps: Option<serde_json::Value>,
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:process:read"])),
    path = "/processes",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "process"
)]
pub async fn list_processes(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> ApiResponse<Vec<InspectionProcess>> {
    let locale = Locale::from_headers(&headers).as_sql();
    let rows = sqlx::query(
        "SELECT id::TEXT, CASE WHEN $1 = 'en' THEN COALESCE(process_name_en, process_name) ELSE process_name END AS process_name, description, steps, is_active, created_at, updated_at, tenant_id FROM qa_lab_processes ORDER BY created_at DESC",
    )
    .bind(locale)
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(data) => {
            let items: Vec<InspectionProcess> = data
                .into_iter()
                .map(|row| {
                    let is_active: bool = row.get("is_active");
                    InspectionProcess {
                        id: row.get("id"),
                        tenant_id: row.get("tenant_id"),
                        process_no: row.get("id"),
                        name: row.get("process_name"),
                        description: row.get("description"),
                        steps: row.get("steps"),
                        status: if is_active { "active" } else { "inactive" }.to_string(),
                        created_by: None,
                        updated_by: None,
                        created_at: row.get("created_at"),
                        updated_at: row.get("updated_at"),
                    }
                })
                .collect();
            ApiResponse::success(items, "OK")
        }
        Err(e) => {
            tracing::error!("Failed to list processes: {}", e);
            ApiResponse::server_error("加载检验流程失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:process:read"])),
    path = "/processes/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "process"
)]
pub async fn get_process(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<InspectionProcess> {
    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("Invalid process ID"),
    };

    let locale = Locale::from_headers(&headers).as_sql();
    let row = sqlx::query(
        "SELECT id::TEXT, CASE WHEN $2 = 'en' THEN COALESCE(process_name_en, process_name) ELSE process_name END AS process_name, description, steps, is_active, created_at, updated_at, tenant_id FROM qa_lab_processes WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(uuid)
    .bind(locale)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(data) => {
            let is_active: bool = data.get("is_active");
            let process = InspectionProcess {
                id: data.get("id"),
                tenant_id: data.get("tenant_id"),
                process_no: data.get("id"),
                name: data.get("process_name"),
                description: data.get("description"),
                steps: data.get("steps"),
                status: if is_active { "active" } else { "inactive" }.to_string(),
                created_by: None,
                updated_by: None,
                created_at: data.get("created_at"),
                updated_at: data.get("updated_at"),
            };
            ApiResponse::success(process, "OK")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("Process not found"),
        Err(e) => {
            tracing::error!("Failed to get process: {}", e);
            ApiResponse::server_error("获取检验流程失败")
        }
    }
}

pub async fn create_process(
    State(state): State<AppState>,
    Extension(ctx): Extension<TenantContext>,
    Json(req): Json<CreateProcessRequest>,
) -> ApiResponse<InspectionProcess> {
    let row = sqlx::query(
        "INSERT INTO qa_lab_processes (process_name, description, steps, is_active, created_at, updated_at, tenant_id) VALUES ($1, $2, $3, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $4) RETURNING id::TEXT, tenant_id::TEXT, process_name, description, steps, is_active, created_at, updated_at",
    )
    .bind(req.name)
    .bind(req.description)
    .bind(req.steps)
    .bind(ctx.tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(data) => {
            let is_active: bool = data.get("is_active");
            let process = InspectionProcess {
                id: data.get("id"),
                tenant_id: data.get("tenant_id"),
                process_no: data.get("id"),
                name: data.get("process_name"),
                description: data.get("description"),
                steps: data.get("steps"),
                status: if is_active { "active" } else { "inactive" }.to_string(),
                created_by: None,
                updated_by: None,
                created_at: data.get("created_at"),
                updated_at: data.get("updated_at"),
            };
            ApiResponse::success(process, "Process created successfully")
        }
        Err(e) => {
            tracing::error!("Failed to create process: {}", e);
            ApiResponse::server_error("创建检验流程失败")
        }
    }
}

pub async fn update_process(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateProcessRequest>,
) -> ApiResponse<InspectionProcess> {
    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("Invalid process ID"),
    };

    let is_active: Option<bool> = req.status.as_ref().map(|s| s == "active");

    let row = sqlx::query(
        "UPDATE qa_lab_processes SET process_name = COALESCE($2, process_name), description = COALESCE($3, description), steps = COALESCE($4, steps), is_active = COALESCE($5, is_active), updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id::TEXT, tenant_id::TEXT, process_name, description, steps, is_active, created_at, updated_at",
    )
    .bind(uuid)
    .bind(req.name)
    .bind(req.description)
    .bind(req.steps)
    .bind(is_active)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(data) => {
            let is_active: bool = data.get("is_active");
            let process = InspectionProcess {
                id: data.get("id"),
                tenant_id: data.get("tenant_id"),
                process_no: data.get("id"),
                name: data.get("process_name"),
                description: data.get("description"),
                steps: data.get("steps"),
                status: if is_active { "active" } else { "inactive" }.to_string(),
                created_by: None,
                updated_by: None,
                created_at: data.get("created_at"),
                updated_at: data.get("updated_at"),
            };
            ApiResponse::success(process, "Process updated successfully")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("Process not found"),
        Err(e) => {
            tracing::error!("Failed to update process: {}", e);
            ApiResponse::server_error("更新检验流程失败")
        }
    }
}

pub async fn delete_process(
    State(state): State<AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<String> {
    let uuid = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("Invalid process ID"),
    };

    let result = sqlx::query("UPDATE qa_lab_processes SET deleted_at = NOW() WHERE id = $1")
        .bind(uuid)
        .execute(&state.pool)
        .await;

    match result {
        Ok(data) => {
            if data.rows_affected() == 0 {
                return ApiResponse::not_found("Process not found");
            }
            ApiResponse::success("OK".to_string(), "Process deleted successfully")
        }
        Err(e) => {
            tracing::error!("Failed to delete process: {}", e);
            ApiResponse::server_error("删除检验流程失败")
        }
    }
}
