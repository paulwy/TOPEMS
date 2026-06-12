use axum::{
    body::Bytes,
    extract::{Extension, Path, Query, State},
    http::{header, HeaderMap},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::time::Duration;

use sqlx::Row;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::cache::{cache_get, cache_set, invalidate_project_cache};
use crate::models::{CreateProjectRequest, Project, UpdateProjectRequest};
use crate::services::project_permission::{
    check_project_owner, check_project_permission, ProjectPermission,
};
use topems_shared::auth::Claims;
use topems_shared::response::ApiResponse;

#[derive(Debug, Deserialize, IntoParams)]
pub struct ListProjectsQuery {
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
    pub projects: Vec<CreateProjectRequest>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct BatchOperationResult {
    pub total: usize,
    pub success: usize,
    pub failed: usize,
    pub errors: Vec<String>,
}

pub fn create_routes() -> Router<super::ApiState> {
    Router::<super::ApiState>::new()
        .route("/api/v1/projects", get(list_projects).post(create_project))
        .route(
            "/api/v1/projects/batch",
            post(batch_create_projects).delete(batch_delete_projects),
        )
        .route("/api/v1/projects/export", get(export_projects))
        .route("/api/v1/projects/import", post(import_projects))
        .route(
            "/api/v1/projects/{id}",
            get(get_project).put(update_project).delete(delete_project),
        )
        .route(
            "/api/v1/projects/{id}/dashboard",
            get(get_project_dashboard),
        )
        .route("/api/v1/projects/{id}/gantt", get(get_project_gantt))
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
    State(state): State<super::ApiState>,
    Query(params): Query<ListProjectsQuery>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, Project>(
        r#"
        SELECT id, name, code, description, project_type, status, leader,
               team_members, start_date, end_date, budget, progress,
               created_by, created_at, updated_at, project_config, benefit_target,
               risk_level, priority, tags, parent_id, workspace_id
        FROM projects
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
                SELECT COUNT(*) FROM projects
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
    State(state): State<super::ApiState>,
    headers: HeaderMap,
    Json(req): Json<CreateProjectRequest>,
) -> Json<ApiResponse<Project>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Project>(
        r#"
        INSERT INTO projects (
            id, name, code, description, project_type, status, leader,
            team_members, start_date, end_date, budget, progress, created_by,
            created_at, updated_at, project_config, benefit_target, risk_level,
            priority, tags, parent_id, workspace_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                  $16, $17, $18, $19, $20, $21, $22)
        RETURNING id, name, code, description, project_type, status, leader,
                  team_members, start_date, end_date, budget, progress,
                  created_by, created_at, updated_at, project_config, benefit_target,
                  risk_level, priority, tags, parent_id, workspace_id
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.description)
    .bind(req.project_type)
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
    .bind(serde_json::json!({}))
    .bind(serde_json::json!({}))
    .bind("MEDIUM")
    .bind(3)
    .bind(serde_json::Value::Array(vec![]))
    .bind(None::<Uuid>)
    .bind(None::<Uuid>)
    .fetch_one(&state.db)
    .await;

    let (response, status_str, error_msg, project_id) = match &result {
        Ok(project) => (
            Json(ApiResponse::success(project.clone(), "项目创建成功")),
            "success",
            None,
            Some(project.id),
        ),
        Err(e) => {
            tracing::error!("创建项目失败: {}", e);
            (
                Json(ApiResponse::error(500, "项目创建失败")),
                "error",
                Some(e.to_string()),
                None,
            )
        }
    };

    let request_data = serde_json::to_value(&req).ok();
    let response_data = if let Ok(project) = result {
        serde_json::to_value(&project).ok()
    } else {
        None
    };

    if let Some(id) = project_id {
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
        )
        .await;

        invalidate_project_cache(&id.to_string()).await;
    }

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
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
) -> Json<ApiResponse<Project>> {
    match check_project_permission(&state.db, &claims, &id, &ProjectPermission::Read).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let cache_key = format!("project:{}", id);

    if let Some(cached) = cache_get(&cache_key).await {
        return Json(ApiResponse::success(cached, "获取项目成功"));
    }

    let result = sqlx::query_as::<_, Project>(
        r#"
        SELECT id, name, code, description, project_type, status, leader,
               team_members, start_date, end_date, budget, progress,
               created_by, created_at, updated_at, project_config, benefit_target,
               risk_level, priority, tags, parent_id, workspace_id
        FROM projects WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(project)) => {
            cache_set(&cache_key, project.clone(), Duration::from_secs(300)).await;
            Json(ApiResponse::success(project, "获取项目成功"))
        }
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
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
    Json(req): Json<UpdateProjectRequest>,
) -> Json<ApiResponse<Project>> {
    match check_project_permission(&state.db, &claims, &id, &ProjectPermission::Update).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let existing = sqlx::query_as::<_, Project>(
        "SELECT id, name, code, description, project_type, status, leader, team_members, start_date, end_date, budget, progress, created_by, created_at, updated_at, project_config, benefit_target, risk_level, priority, tags, parent_id, workspace_id FROM projects WHERE id = $1",
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
    let status = req.status.map(|s| s.to_string()).unwrap_or(existing.status);
    let leader = req.leader.clone().unwrap_or(existing.leader);
    let team_members = req.team_members.clone().unwrap_or(existing.team_members);
    let end_date = req.end_date.or(existing.end_date);
    let budget = req.budget.or(existing.budget);
    let progress = req.progress.unwrap_or(existing.progress);
    let now = Utc::now();

    let result = sqlx::query_as::<_, Project>(
        r#"
        UPDATE projects SET
            name = $2, description = $3, status = $4, leader = $5,
            team_members = $6, end_date = $7, budget = $8, progress = $9, updated_at = $10
        WHERE id = $1
        RETURNING id, name, code, description, project_type, status, leader,
                  team_members, start_date, end_date, budget, progress,
                  created_by, created_at, updated_at, project_config, benefit_target,
                  risk_level, priority, tags, parent_id, workspace_id
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
            None,
        ),
        Err(e) => {
            tracing::error!("更新项目失败: {}", e);
            (
                Json(ApiResponse::error(500, "项目更新失败")),
                "error",
                Some(e.to_string()),
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
    )
    .await;

    invalidate_project_cache(&id.to_string()).await;

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
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
    Extension(claims): Extension<Claims>,
    headers: HeaderMap,
) -> Json<ApiResponse<String>> {
    match check_project_owner(&state.db, &claims, &id).await {
        Ok(_) => {}
        Err(e) => return e,
    }

    let result = sqlx::query("DELETE FROM projects WHERE id = $1")
        .bind(id)
        .execute(&state.db)
        .await;

    let (response, status_str, error_msg) = match &result {
        Ok(r) if r.rows_affected() > 0 => (
            Json(ApiResponse::success("".to_string(), "项目删除成功")),
            "success",
            None,
        ),
        Ok(_) => (
            Json(ApiResponse::error(404, "项目不存在")),
            "error",
            Some("项目不存在".to_string()),
        ),
        Err(e) => {
            tracing::error!("删除项目失败: {}", e);
            (
                Json(ApiResponse::error(500, "项目删除失败")),
                "error",
                Some(e.to_string()),
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
    )
    .await;

    invalidate_project_cache(&id.to_string()).await;

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
    State(state): State<super::ApiState>,
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
            INSERT INTO projects (
                id, name, code, description, project_type, status, leader,
                team_members, start_date, end_date, budget, progress, created_by,
                created_at, updated_at, project_config, benefit_target, risk_level,
                priority, tags, parent_id, workspace_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                      $16, $17, $18, $19, $20, $21, $22)
            RETURNING id, name, code, description, project_type, status, leader,
                      team_members, start_date, end_date, budget, progress,
                      created_by, created_at, updated_at, project_config, benefit_target,
                      risk_level, priority, tags, parent_id, workspace_id
            "#,
        )
        .bind(id)
        .bind(&project_req.name)
        .bind(&project_req.code)
        .bind(&project_req.description)
        .bind(project_req.project_type)
        .bind("draft")
        .bind(&project_req.leader)
        .bind(
            serde_json::to_value(project_req.team_members.clone()).unwrap_or(serde_json::json!([])),
        )
        .bind(project_req.start_date)
        .bind(project_req.end_date)
        .bind(project_req.budget)
        .bind(0)
        .bind(&project_req.leader)
        .bind(now)
        .bind(now)
        .bind(serde_json::json!({}))
        .bind(serde_json::json!({}))
        .bind("MEDIUM")
        .bind(3)
        .bind::<Vec<String>>(vec![])
        .bind(None::<Uuid>)
        .bind(None::<Uuid>)
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

    let status = if success == total {
        "success"
    } else {
        "partial"
    };
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
    )
    .await;

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
    State(state): State<super::ApiState>,
    headers: HeaderMap,
    Json(req): Json<BatchDeleteRequest>,
) -> Json<ApiResponse<BatchOperationResult>> {
    if req.ids.is_empty() {
        return Json(ApiResponse::error(400, "未提供要删除的项目 ID"));
    }

    let result = sqlx::query(r#"DELETE FROM projects WHERE id = ANY($1)"#)
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
                errors: if affected == total {
                    vec![]
                } else {
                    vec!["部分项目可能不存在".to_string()]
                },
            };

            let status = if affected == total {
                "success"
            } else {
                "partial"
            };
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
            )
            .await;

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
            )
            .await;

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
async fn export_projects(State(state): State<super::ApiState>, headers: HeaderMap) -> Response {
    let result = sqlx::query_as::<_, Project>(
        r#"
        SELECT id, name, code, description, project_type, status, leader,
               team_members, start_date, end_date, budget, progress,
               created_by, created_at, updated_at, project_config, benefit_target,
               risk_level, priority, tags, parent_id, workspace_id
        FROM projects
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
            if let Err(e) = wtr.write_record([
                "id",
                "name",
                "code",
                "description",
                "project_type",
                "status",
                "leader",
                "team_members",
                "start_date",
                "end_date",
                "budget",
                "progress",
                "created_by",
                "created_at",
                "updated_at",
            ]) {
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
                )
                .await;

                return (
                    [(header::CONTENT_TYPE, "application/json")],
                    Json(ApiResponse::<&str>::error(500, "导出失败")),
                )
                    .into_response();
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
                    )
                    .await;

                    return (
                        [(header::CONTENT_TYPE, "application/json")],
                        Json(ApiResponse::<&str>::error(500, "导出失败")),
                    )
                        .into_response();
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
                    )
                    .await;

                    (
                        [
                            (header::CONTENT_TYPE, "text/csv"),
                            (
                                header::CONTENT_DISPOSITION,
                                &format!("attachment; filename=\"{}\"", filename),
                            ),
                        ],
                        data,
                    )
                        .into_response()
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
                    )
                    .await;

                    (
                        [(header::CONTENT_TYPE, "application/json")],
                        Json(ApiResponse::<&str>::error(500, "导出失败")),
                    )
                        .into_response()
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
            )
            .await;

            (
                [(header::CONTENT_TYPE, "application/json")],
                Json(ApiResponse::<&str>::error(500, "导出失败")),
            )
                .into_response()
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
    State(state): State<super::ApiState>,
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
            )
            .await;

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
                let description = record.get(3).and_then(|s| {
                    if s.is_empty() {
                        None
                    } else {
                        Some(s.to_string())
                    }
                });
                let project_type = record.get(4).unwrap_or("research").to_string();
                let leader = record.get(6).unwrap_or_default().to_string();
                let team_members_str = record.get(7).unwrap_or_default();
                let team_members: Vec<String> =
                    serde_json::from_str(team_members_str).unwrap_or(vec![]);

                let start_date = record.get(8).and_then(|s| {
                    if s.is_empty() {
                        None
                    } else {
                        chrono::DateTime::parse_from_rfc3339(s)
                            .ok()
                            .map(|d| d.with_timezone(&Utc))
                    }
                });
                let end_date = record.get(9).and_then(|s| {
                    if s.is_empty() {
                        None
                    } else {
                        chrono::DateTime::parse_from_rfc3339(s)
                            .ok()
                            .map(|d| d.with_timezone(&Utc))
                    }
                });
                let budget = record.get(10).and_then(|s| s.parse::<f64>().ok());

                let id = Uuid::new_v4();
                let now = Utc::now();

                let insert_result = sqlx::query_as::<_, Project>(
                    r#"
                    INSERT INTO projects (
                        id, name, code, description, project_type, status, leader,
                        team_members, start_date, end_date, budget, progress, created_by,
                        created_at, updated_at, project_config, benefit_target, risk_level,
                        priority, tags, parent_id, workspace_id
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                              $16, $17, $18, $19, $20, $21, $22)
                    RETURNING id, name, code, description, project_type, status, leader,
                              team_members, start_date, end_date, budget, progress,
                              created_by, created_at, updated_at, project_config, benefit_target,
                              risk_level, priority, tags, parent_id, workspace_id
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
                .bind(serde_json::json!({}))
                .bind(serde_json::json!({}))
                .bind("MEDIUM")
                .bind(3)
                .bind::<Vec<String>>(vec![])
                .bind(None::<Uuid>)
                .bind(None::<Uuid>)
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

    let status = if success == total {
        "success"
    } else {
        "partial"
    };
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
    )
    .await;

    if success == total {
        Json(ApiResponse::success(result, "导入完成"))
    } else {
        Json(ApiResponse::success(result, "部分导入成功"))
    }
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ProjectDashboardResponse {
    pub project: Project,
    pub progress: serde_json::Value,
    pub budget: serde_json::Value,
    pub members: Vec<serde_json::Value>,
    pub equipment: Vec<serde_json::Value>,
    pub benefits: serde_json::Value,
    pub risks: Vec<serde_json::Value>,
}

#[utoipa::path(
    get,
    path = "/api/v1/projects/{id}/dashboard",
    tag = "projects",
    params(
        ("id" = Uuid, Path, description = "Project ID")
    ),
    responses(
        (status = 200, description = "Project dashboard data retrieved successfully", body = ApiResponse<ProjectDashboardResponse>),
        (status = 404, description = "Project not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn get_project_dashboard(
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProjectDashboardResponse>> {
    let project_result = sqlx::query_as::<_, Project>(
        r#"
        SELECT id, name, code, description, project_type, status, leader,
               team_members, start_date, end_date, budget, progress,
               created_by, created_at, updated_at,
               project_config, benefit_target, risk_level, priority, tags, parent_id, workspace_id
        FROM projects WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    let project = match project_result {
        Ok(Some(p)) => p,
        Ok(None) => return Json(ApiResponse::error(404, "项目不存在")),
        Err(e) => {
            tracing::error!("获取项目失败: {}", e);
            return Json(ApiResponse::error(500, "获取项目失败"));
        }
    };

    let phases_result =
        sqlx::query(r#"SELECT status, progress FROM rs.project_phases WHERE project_id = $1"#)
            .bind(id)
            .fetch_all(&state.db)
            .await;

    let phases = phases_result.unwrap_or_default();
    let completed_phases = phases
        .iter()
        .filter(|p| p.get::<String, _>("status") == "COMPLETED")
        .count();
    let total_phases = phases.len();
    let avg_progress = if total_phases > 0 {
        phases
            .iter()
            .map(|p| p.get::<i32, _>("progress"))
            .sum::<i32>()
            / total_phases as i32
    } else {
        0
    };

    let progress_data = serde_json::json!({
        "planned": project.progress,
        "actual": avg_progress,
        "completed_phases": completed_phases,
        "total_phases": total_phases,
        "trend": if avg_progress >= project.progress { "ahead" } else { "behind" }
    });

    let budget_data = serde_json::json!({
        "total": project.budget,
        "spent": 0.0,
        "remaining": project.budget,
        "utilization_rate": 0.0
    });

    let members_result = sqlx::query(
        r#"SELECT employee_id as user_id, role FROM rs.project_members WHERE project_id = $1"#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await;

    let members: Vec<serde_json::Value> = members_result
        .unwrap_or_default()
        .into_iter()
        .map(|m| {
            serde_json::json!({
                "user_id": m.get::<Uuid, _>("user_id"),
                "role": m.get::<String, _>("role")
            })
        })
        .collect();

    let milestones_result =
        sqlx::query(r#"SELECT status FROM rs.project_milestones WHERE project_id = $1"#)
            .bind(id)
            .fetch_all(&state.db)
            .await;

    let milestones = milestones_result.unwrap_or_default();
    let achieved_milestones = milestones
        .iter()
        .filter(|m| m.get::<String, _>("status") == "ACHIEVED")
        .count();
    let total_milestones = milestones.len();

    let risks = vec![if project.risk_level.as_deref() == Some("HIGH")
        || project.risk_level.as_deref() == Some("CRITICAL")
    {
        serde_json::json!({
            "level": project.risk_level,
            "description": "风险等级较高"
        })
    } else if avg_progress < project.progress - 10 {
        serde_json::json!({
            "level": "medium",
            "description": "进度落后超过10%"
        })
    } else {
        serde_json::json!({
            "level": "low",
            "description": "项目运行正常"
        })
    }];

    let benefits = serde_json::json!({
        "cpi": 1.0,
        "spi": avg_progress as f64 / project.progress.max(1) as f64,
        "roi": 0.0,
        "eac": project.budget,
        "milestones_achieved": achieved_milestones,
        "total_milestones": total_milestones
    });

    let response = ProjectDashboardResponse {
        project,
        progress: progress_data,
        budget: budget_data,
        members,
        equipment: vec![],
        benefits,
        risks,
    };

    Json(ApiResponse::success(response, "获取项目仪表盘成功"))
}

#[derive(Debug, Serialize, ToSchema)]
pub struct GanttPhase {
    pub id: Uuid,
    pub name: String,
    pub project_id: Uuid,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub progress: i32,
    pub status: String,
    pub predecessor_ids: Vec<Uuid>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct GanttMilestone {
    pub id: Uuid,
    pub name: String,
    pub project_id: Uuid,
    pub date: DateTime<Utc>,
    pub status: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct GanttResource {
    pub id: Uuid,
    pub resource_type: String,
    pub name: String,
    pub assignments: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ProjectGanttResponse {
    pub phases: Vec<GanttPhase>,
    pub milestones: Vec<GanttMilestone>,
    pub resources: Vec<GanttResource>,
}

#[utoipa::path(
    get,
    path = "/api/v1/projects/{id}/gantt",
    tag = "projects",
    params(
        ("id" = Uuid, Path, description = "Project ID")
    ),
    responses(
        (status = 200, description = "Project gantt data retrieved successfully", body = ApiResponse<ProjectGanttResponse>),
        (status = 404, description = "Project not found"),
        (status = 500, description = "Internal server error")
    ),
    security(
        ("bearer_auth" = [])
    )
)]
async fn get_project_gantt(
    State(state): State<super::ApiState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProjectGanttResponse>> {
    let phases_result = sqlx::query_as::<_, crate::models::ProjectPhase>(
        r#"
        SELECT id, project_id, phase_number, name, description, start_date, end_date,
               planned_duration_days, actual_duration_days, status, progress, weight,
               predecessor_id, created_at, updated_at
        FROM rs.project_phases WHERE project_id = $1 ORDER BY phase_number
        "#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await;

    let phases = match phases_result {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("获取项目阶段失败: {}", e);
            return Json(ApiResponse::error(500, "获取项目阶段失败"));
        }
    };

    let gantt_phases: Vec<GanttPhase> = phases
        .into_iter()
        .map(|p| GanttPhase {
            id: p.id,
            name: p.name,
            project_id: p.project_id,
            start_date: p.start_date,
            end_date: p.end_date,
            progress: p.progress,
            status: p.status,
            predecessor_ids: p.predecessor_id.map(|pid| vec![pid]).unwrap_or_default(),
        })
        .collect();

    let milestones_result = sqlx::query_as::<_, crate::models::ProjectMilestone>(
        r#"
        SELECT id, project_id, phase_id, name, description, target_date, actual_date,
               status, created_at, updated_at, deliverable_type, acceptance_criteria,
               acceptance_status, accepted_by, accepted_at
        FROM rs.project_milestones WHERE project_id = $1
        "#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await;

    let milestones = match milestones_result {
        Ok(m) => m,
        Err(e) => {
            tracing::error!("获取项目里程碑失败: {}", e);
            return Json(ApiResponse::error(500, "获取项目里程碑失败"));
        }
    };

    let gantt_milestones: Vec<GanttMilestone> = milestones
        .into_iter()
        .map(|m| GanttMilestone {
            id: m.id,
            name: m.name,
            project_id: m.project_id,
            date: m.target_date,
            status: m.status,
        })
        .collect();

    let members_result = sqlx::query(
        r#"SELECT employee_id as user_id, role FROM rs.project_members WHERE project_id = $1"#,
    )
    .bind(id)
    .fetch_all(&state.db)
    .await;

    let gantt_resources: Vec<GanttResource> = members_result
        .unwrap_or_default()
        .into_iter()
        .map(|m| GanttResource {
            id: m.get::<Uuid, _>("user_id"),
            resource_type: "person".to_string(),
            name: m.get::<String, _>("role"),
            assignments: vec![],
        })
        .collect();

    let response = ProjectGanttResponse {
        phases: gantt_phases,
        milestones: gantt_milestones,
        resources: gantt_resources,
    };

    Json(ApiResponse::success(response, "获取甘特图数据成功"))
}
