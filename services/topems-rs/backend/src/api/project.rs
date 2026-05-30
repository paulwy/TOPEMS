use axum::{
    extract::{Path, Query, State},
    http::{header, HeaderMap},
    response::{IntoResponse, Response},
    body::Bytes,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::postgres::PgPool;
use std::sync::Arc;
use uuid::Uuid;
use utoipa::{ToSchema, IntoParams};

use crate::models::{CreateProjectRequest, Project, UpdateProjectRequest};
use topems_shared::response::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct PaginationParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct ListProjectsQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
}

pub struct AppState {
    pub db: PgPool,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BatchDeleteRequest {
    pub ids: Vec<Uuid>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct BatchCreateRequest {
    pub projects: Vec<CreateProjectRequest>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct BatchOperationResult {
    pub total: usize,
    pub success: usize,
    pub failed: usize,
    pub errors: Vec<String>,
}



pub async fn create_routes(db: PgPool) -> topems_shared::Result<Router> {
    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/api/v1/projects", get(list_projects).post(create_project))
        .route("/api/v1/projects/batch", post(batch_create_projects).delete(batch_delete_projects))
        .route("/api/v1/projects/export", get(export_projects))
        .route("/api/v1/projects/import", post(import_projects))
        .route(
            "/api/v1/projects/{id}",
            get(get_project).put(update_project).delete(delete_project),
        )
        .with_state(state);

    Ok(app)
}

#[utoipa::path(
    get,
    path = "/api/v1/projects",
    tag = "projects",
    params(
        ("page" = Option<i64>, Query, description = "Page number, starting from 1", nullable = true),
        ("page_size" = Option<i64>, Query, description = "Number of items per page", nullable = true),
        ("search" = Option<String>, Query, description = "Search by name or code", nullable = true),
        ("status" = Option<String>, Query, description = "Filter by status", nullable = true)
    ),
    responses(
        (status = 200, description = "List of projects retrieved successfully", body = ApiResponse<Vec<Project>>),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn list_projects(
    State(state): State<Arc<AppState>>,
    Query(params): Query<PaginationParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Project>(
        r#"
        SELECT id, name, code, description, project_type, status, leader,
               team_members, start_date, end_date, budget, progress,
               created_by, created_at, updated_at
        FROM rs.projects
        WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
          AND ($2::text IS NULL OR status = $2)
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
        "#,
    )
    .bind(&params.search)
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(projects) => {
            let count_result = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM rs.projects
                WHERE ($1::text IS NULL OR name ILIKE $1 OR code ILIKE $1)
                  AND ($2::text IS NULL OR status = $2)
                "#,
            )
            .bind(&params.search)
            .bind(&params.status)
            .fetch_one(&state.db)
            .await;

            let total = count_result.unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "projects": projects,
                    "total": total,
                    "page": page,
                    "page_size": page_size
                }),
                "获取项目列表成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取项目列表失败: {}", e);
            Json(ApiResponse::error(500, "获取项目列表失败"))
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/v1/projects",
    tag = "projects",
    request_body = CreateProjectRequest,
    responses(
        (status = 200, description = "Project created successfully", body = ApiResponse<Project>),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn create_project(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<CreateProjectRequest>,
) -> Json<ApiResponse<Project>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Project>(
        r#"
        INSERT INTO rs.projects (
            id, name, code, description, project_type, status, leader,
            team_members, start_date, end_date, budget, progress, created_by,
            created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id, name, code, description, project_type, status, leader,
                  team_members, start_date, end_date, budget, progress,
                  created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.description)
    .bind(&req.project_type)
    .bind("draft")
    .bind(&req.leader)
    .bind(serde_json::to_value(&req.team_members).unwrap_or(serde_json::json!([])))
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.budget)
    .bind(0)
    .bind(&req.leader)
    .bind(now)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(project) => (
            Json(ApiResponse::success(project.clone(), "项目创建成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("创建项目失败: {}", e);
            (
                Json(ApiResponse::error(500, "项目创建失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(project) = result {
        serde_json::to_value(&project).ok()
    } else {
        None
    };

    crate::api::audit::log_audit_event(
        &state.db,
        "create".to_string(),
        "project".to_string(),
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
    get,
    path = "/api/v1/projects/{id}",
    tag = "projects",
    params(
        ("id" = Uuid, Path, description = "Project ID")
    ),
    responses(
        (status = 200, description = "Project retrieved successfully", body = ApiResponse<Project>),
        (status = 404, description = "Project not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn get_project(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Project>> {
    let result = sqlx::query_as::<_, Project>(
        r#"
        SELECT id, name, code, description, project_type, status, leader,
               team_members, start_date, end_date, budget, progress,
               created_by, created_at, updated_at
        FROM rs.projects WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(project)) => Json(ApiResponse::success(project, "获取项目成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目不存在")),
        Err(e) => {
            tracing::error!("获取项目失败: {}", e);
            Json(ApiResponse::error(500, "获取项目失败"))
        }
    }
}

#[utoipa::path(
    put,
    path = "/api/v1/projects/{id}",
    tag = "projects",
    params(
        ("id" = Uuid, Path, description = "Project ID")
    ),
    request_body = UpdateProjectRequest,
    responses(
        (status = 200, description = "Project updated successfully", body = ApiResponse<Project>),
        (status = 404, description = "Project not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn update_project(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
    Json(req): Json<UpdateProjectRequest>,
) -> Json<ApiResponse<Project>> {
    let existing = sqlx::query_as::<_, Project>(
        "SELECT id, name, code, description, project_type, status, leader, team_members, start_date, end_date, budget, progress, created_by, created_at, updated_at FROM rs.projects WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let existing = match existing {
        Ok(Some(p)) => p,
        Ok(None) => return Json(ApiResponse::error(404, "项目不存在")),
        Err(e) => return Json(ApiResponse::error(500, &format!("查询项目失败: {}", e))),
    };

    let name = req.name.clone().unwrap_or(existing.name);
    let description = req.description.clone().or(existing.description);
    let status = req.status.clone().unwrap_or(existing.status);
    let leader = req.leader.clone().unwrap_or(existing.leader);
    let team_members = req.team_members.clone().unwrap_or(existing.team_members);
    let end_date = req.end_date.or(existing.end_date);
    let budget = req.budget.or(existing.budget);
    let progress = req.progress.unwrap_or(existing.progress);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Project>(
        r#"
        UPDATE rs.projects SET
            name = $2, description = $3, status = $4, leader = $5,
            team_members = $6, end_date = $7, budget = $8, progress = $9, updated_at = $10
        WHERE id = $1
        RETURNING id, name, code, description, project_type, status, leader,
                  team_members, start_date, end_date, budget, progress,
                  created_by, created_at, updated_at
        "#,
    )
    .bind(id)
    .bind(&name)
    .bind(&description)
    .bind(&status)
    .bind(&leader)
    .bind(serde_json::to_value(team_members).unwrap())
    .bind(end_date)
    .bind(budget)
    .bind(progress)
    .bind(now)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg) = match &result {
        Ok(project) => (
            Json(ApiResponse::success(project.clone(), "项目更新成功")),
            "success",
            None
        ),
        Err(e) => {
            tracing::error!("更新项目失败: {}", e);
            (
                Json(ApiResponse::error(500, "项目更新失败")),
                "error",
                Some(e.to_string())
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(project) = result {
        serde_json::to_value(&project).ok()
    } else {
        None
    };

    crate::api::audit::log_audit_event(
        &state.db,
        "update".to_string(),
        "project".to_string(),
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
    path = "/api/v1/projects/{id}",
    tag = "projects",
    params(
        ("id" = Uuid, Path, description = "Project ID")
    ),
    responses(
        (status = 200, description = "Project deleted successfully"),
        (status = 404, description = "Project not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn delete_project(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    let result = sqlx::query("DELETE FROM rs.projects WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "项目删除成功")),
            "success",
            None
        ),
        Ok(_) => (
            Json(ApiResponse::error(404, "项目不存在")),
            "error",
            Some("项目不存在".to_string())
        ),
        Err(e) => {
            tracing::error!("删除项目失败: {}", e);
            (
                Json(ApiResponse::error(500, "项目删除失败")),
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
        "project".to_string(),
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
    path = "/api/v1/projects/batch",
    tag = "projects",
    request_body = BatchCreateRequest,
    responses(
        (status = 200, description = "Projects created successfully", body = ApiResponse<BatchOperationResult>),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn batch_create_projects(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<BatchCreateRequest>,
) -> Json<ApiResponse<BatchOperationResult>> {
    let mut success = 0;
    let mut errors = Vec::new();

    for (index, project_req) in req.projects.iter().enumerate() {
        let id = Uuid::new_v4();
        let now = Utc::now();

        let result = sqlx::query_as::<_, Project>(
            r#"
            INSERT INTO rs.projects (
                id, name, code, description, project_type, status, leader,
                team_members, start_date, end_date, budget, progress, created_by,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING id, name, code, description, project_type, status, leader,
                      team_members, start_date, end_date, budget, progress,
                      created_by, created_at, updated_at
            "#,
        )
        .bind(id)
        .bind(&project_req.name)
        .bind(&project_req.code)
        .bind(&project_req.description)
        .bind(&project_req.project_type)
        .bind("draft")
        .bind(&project_req.leader)
        .bind(serde_json::to_value(project_req.team_members.clone()).unwrap_or(serde_json::json!([])))
        .bind(project_req.start_date)
        .bind(project_req.end_date)
        .bind(project_req.budget)
        .bind(0)
        .bind(&project_req.leader)
        .bind(now)
        .bind(now)
        .fetch_one(&state.db)
        .await;

        match result {
            Ok(_) => success += 1,
            Err(e) => {
                errors.push(format!("项目 {}: {}", index + 1, e));
                tracing::error!("批量创建项目失败 (索引 {}): {}", index, e);
            }
        }
    }

    let total = req.projects.len();
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
        "project".to_string(),
        None,
        Some(serde_json::json!({ "count": total })),
        None,
        None,
        Some(serde_json::json!({ "count": req.projects.len() })),
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
        Json(ApiResponse::success(result, "批量创建项目成功"))
    } else {
        Json(ApiResponse::success(result, "部分项目创建成功"))
    }
}

#[utoipa::path(
    delete,
    path = "/api/v1/projects/batch",
    tag = "projects",
    request_body = BatchDeleteRequest,
    responses(
        (status = 200, description = "Projects deleted successfully", body = ApiResponse<BatchOperationResult>),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn batch_delete_projects(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(req): Json<BatchDeleteRequest>,
) -> Json<ApiResponse<BatchOperationResult>> {
    if req.ids.is_empty() {
        return Json(ApiResponse::error(400, "未提供要删除的项目 ID"));
    }

    let result = sqlx::query(
        r#"DELETE FROM rs.projects WHERE id = ANY($1)"#,
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
                errors: if affected == total { vec![] } else { vec!["部分项目可能不存在".to_string()] },
            };

            let status = if affected == total { "success" } else { "partial" };
            let response_data = serde_json::to_value(&result).ok();

            crate::api::audit::log_audit_event(
                &state.db,
                "batch_delete".to_string(),
                "project".to_string(),
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
            tracing::error!("批量删除项目失败: {}", e);

            crate::api::audit::log_audit_event(
                &state.db,
                "batch_delete".to_string(),
                "project".to_string(),
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
    path = "/api/v1/projects/export",
    tag = "projects",
    responses(
        (status = 200, description = "Projects exported successfully"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn export_projects(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Response {
    let result = sqlx::query_as::<_, Project>(
        r#"
        SELECT id, name, code, description, project_type, status, leader,
               team_members, start_date, end_date, budget, progress,
               created_by, created_at, updated_at
        FROM rs.projects
        ORDER BY created_at DESC
        "#,
    )
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(projects) => {
            let project_count = projects.len();
            let mut wtr = csv::Writer::from_writer(vec![]);
            
            // Write header
            if let Err(e) = wtr.write_record(&["id", "name", "code", "description", "project_type", "status", "leader", "team_members", "start_date", "end_date", "budget", "progress", "created_by", "created_at", "updated_at"]) {
                tracing::error!("导出项目 CSV 头部失败: {}", e);
                
                crate::api::audit::log_audit_event(
                    &state.db,
                    "export".to_string(),
                    "project".to_string(),
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
                    Json(ApiResponse::<&str>::error(500, "导出失败")),
                ).into_response();
            }
            
            // Write rows
            for project in projects {
                let row = vec![
                    project.id.to_string(),
                    project.name.clone(),
                    project.code.clone(),
                    project.description.unwrap_or_default(),
                    project.project_type.clone(),
                    project.status.clone(),
                    project.leader.clone(),
                    serde_json::to_string(&project.team_members).unwrap_or_default(),
                    project.start_date.to_rfc3339(),
                    project.end_date.map(|d| d.to_rfc3339()).unwrap_or_default(),
                    project.budget.map(|b| b.to_string()).unwrap_or_default(),
                    project.progress.to_string(),
                    project.created_by.clone(),
                    project.created_at.to_rfc3339(),
                    project.updated_at.to_rfc3339(),
                ];
                
                if let Err(e) = wtr.write_record(&row) {
                    tracing::error!("导出项目 CSV 行失败: {}", e);
                    
                    crate::api::audit::log_audit_event(
                        &state.db,
                        "export".to_string(),
                        "project".to_string(),
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
                        Json(ApiResponse::<&str>::error(500, "导出失败")),
                    ).into_response();
                }
            }
            
            match wtr.into_inner() {
                Ok(data) => {
                    let filename = format!("projects_{}.csv", Utc::now().format("%Y%m%d_%H%M%S"));
                    
                    crate::api::audit::log_audit_event(
                        &state.db,
                        "export".to_string(),
                        "project".to_string(),
                        None,
                        None,
                        None,
                        None,
                        None,
                        Some(serde_json::json!({ "count": project_count, "filename": filename })),
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
                    tracing::error!("导出项目 CSV 完成失败: {}", e);
                    
                    crate::api::audit::log_audit_event(
                        &state.db,
                        "export".to_string(),
                        "project".to_string(),
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
                        Json(ApiResponse::<&str>::error(500, "导出失败")),
                    ).into_response()
                }
            }
        }
        Err(e) => {
            tracing::error!("导出项目失败: {}", e);
            
            crate::api::audit::log_audit_event(
                &state.db,
                "export".to_string(),
                "project".to_string(),
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
                Json(ApiResponse::<&str>::error(500, "导出失败")),
            ).into_response()
        }
    }
}

#[utoipa::path(
    post,
    path = "/api/v1/projects/import",
    tag = "projects",
    request_body(content = String, description = "CSV file content", content_type = "text/csv"),
    responses(
        (status = 200, description = "Projects imported successfully", body = ApiResponse<BatchOperationResult>),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn import_projects(
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
                "project".to_string(),
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
                    errors.push(format!("第 {} 行: 项目名称不能为空", row_num));
                    continue;
                }
                
                let code = record.get(2).unwrap_or_default().to_string();
                let description = record.get(3).and_then(|s| if s.is_empty() { None } else { Some(s.to_string()) });
                let project_type = record.get(4).unwrap_or("research").to_string();
                let leader = record.get(6).unwrap_or_default().to_string();
                let team_members_str = record.get(7).unwrap_or_default();
                let team_members: Vec<String> = serde_json::from_str(team_members_str).unwrap_or(vec![]);
                
                let start_date = record.get(8).and_then(|s| if s.is_empty() { None } else { chrono::DateTime::parse_from_rfc3339(s).ok().map(|d| d.with_timezone(&Utc)) });
                let end_date = record.get(9).and_then(|s| if s.is_empty() { None } else { chrono::DateTime::parse_from_rfc3339(s).ok().map(|d| d.with_timezone(&Utc)) });
                let budget = record.get(10).and_then(|s| s.parse::<f64>().ok());
                
                let id = Uuid::new_v4();
                let now = Utc::now();
                
                let insert_result = sqlx::query_as::<_, Project>(
                    r#"
                    INSERT INTO rs.projects (
                        id, name, code, description, project_type, status, leader,
                        team_members, start_date, end_date, budget, progress, created_by,
                        created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    RETURNING id, name, code, description, project_type, status, leader,
                              team_members, start_date, end_date, budget, progress,
                              created_by, created_at, updated_at
                    "#,
                )
                .bind(id)
                .bind(&name)
                .bind(&code)
                .bind(&description)
                .bind(&project_type)
                .bind("draft")
                .bind(&leader)
                .bind(serde_json::to_value(team_members).unwrap_or(serde_json::json!([])))
                .bind(start_date)
                .bind(end_date)
                .bind(budget)
                .bind(0)
                .bind(&leader)
                .bind(now)
                .bind(now)
                .fetch_one(&state.db)
                .await;
                
                match insert_result {
                    Ok(_) => success += 1,
                    Err(e) => {
                        errors.push(format!("第 {} 行: {}", row_num, e));
                        tracing::error!("导入项目失败 (行 {}): {}", row_num, e);
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
        "project".to_string(),
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
