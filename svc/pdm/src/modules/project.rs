use axum::{extract::Path, extract::Query, extract::State, routing::get, Extension, Json, Router};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::shared::AppState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/projects", get(list_projects).post(create_project))
        .route(
            "/projects/{id}",
            get(get_project).put(update_project).delete(delete_project),
        )
        .route("/projects/{id}/status", axum::routing::put(update_project_status))
        .route("/projects/{id}/phase", axum::routing::put(update_project_phase))
        .route("/projects/{projectId}/members", get(list_members).post(add_member))
        .route(
            "/projects/{projectId}/members/{userId}",
            axum::routing::put(update_member).delete(remove_member),
        )
        .route("/projects/{projectId}/phases", get(list_phases).post(create_phase))
        .route(
            "/projects/{projectId}/phases/{phaseId}",
            axum::routing::put(update_phase).delete(delete_phase),
        )
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct PdmProject {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub project_no: String,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub phase: String,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub manager_id: Option<String>,
    pub manager_name: Option<String>,
    pub budget: Option<f64>,
    pub progress: Option<i32>,
    pub member_count: Option<i64>,
    pub created_by: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePdmProjectRequest {
    pub project_no: String,
    pub name: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub phase: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub manager_id: Option<String>,
    pub manager_name: Option<String>,
    pub budget: Option<f64>,
    pub progress: Option<i32>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePdmProjectRequest {
    pub project_no: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub phase: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub manager_id: Option<String>,
    pub manager_name: Option<String>,
    pub budget: Option<f64>,
    pub progress: Option<i32>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ProjectQuery {
    pub search: Option<String>,
    pub status: Option<String>,
    pub phase: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectStatusRequest {
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectPhaseRequest {
    pub phase: String,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProjectMember {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub project_id: Uuid,
    pub user_id: String,
    pub user_name: Option<String>,
    pub user_email: Option<String>,
    pub role: String,
    pub joined_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct AddProjectMemberRequest {
    pub user_id: String,
    pub user_name: Option<String>,
    pub user_email: Option<String>,
    pub role: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectMemberRequest {
    pub user_name: Option<String>,
    pub user_email: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct ProjectPhase {
    pub id: Uuid,
    pub tenant_id: Uuid,
    pub project_id: Uuid,
    pub phase: String,
    pub name: String,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: String,
    pub deliverables: Option<Vec<String>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Deserialize)]
pub struct CreateProjectPhaseRequest {
    pub phase: String,
    pub name: String,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub deliverables: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProjectPhaseByIdRequest {
    pub phase: Option<String>,
    pub name: Option<String>,
    pub description: Option<String>,
    pub start_date: Option<DateTime<Utc>>,
    pub end_date: Option<DateTime<Utc>>,
    pub status: Option<String>,
    pub deliverables: Option<Vec<String>>,
}

const PROJECT_COLUMNS: &str = r#"
    p.id, p.tenant_id, p.project_no, p.name, p.description, p.status, p.phase,
    p.start_date, p.end_date, p.manager_id, p.manager_name, p.budget, p.progress,
    (SELECT COUNT(*) FROM pdm_project_members m WHERE m.project_id = p.id AND m.tenant_id = p.tenant_id) AS member_count,
    p.created_by, p.created_at, p.updated_at
"#;

#[utoipa::path(get, path = "/api/pdm/projects", tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn list_projects(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(query): Query<ProjectQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<PdmProject>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let search_pattern = query.search.as_ref().map(|s| format!("%{}%", s));

    let result = sqlx::query_as::<_, PdmProject>(&format!(
        r#"
        SELECT {PROJECT_COLUMNS}
        FROM pdm_projects p
        WHERE p.deleted_at IS NULL AND p.tenant_id = $1
          AND ($2::text IS NULL OR p.project_no ILIKE $2 OR p.name ILIKE $2 OR p.description ILIKE $2)
          AND ($3::text IS NULL OR p.status = $3)
          AND ($4::text IS NULL OR p.phase = $4)
        ORDER BY p.created_at DESC
        "#
    ))
    .bind(tenant_id)
    .bind(&search_pattern)
    .bind(&query.status)
    .bind(&query.phase)
    .fetch_all(&state.pool)
    .await;

    match result {
        Ok(projects) => Json(ApiResponse::success(projects, "获取项目列表成功")),
        Err(e) => {
            tracing::error!("获取项目列表失败: {}", e);
            Json(ApiResponse::error(500, "获取项目列表失败"))
        }
    }
}

#[utoipa::path(post, path = "/api/pdm/projects", request_body = CreatePdmProjectRequest, tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn create_project(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreatePdmProjectRequest>,
) -> Json<ApiResponse<PdmProject>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    if req.project_no.trim().is_empty() {
        return Json(ApiResponse::error(400, "项目编号不能为空"));
    }
    if req.name.trim().is_empty() {
        return Json(ApiResponse::error(400, "项目名称不能为空"));
    }
    let status = req.status.unwrap_or_else(|| "planning".to_string());
    let phase = req.phase.unwrap_or_else(|| "initiation".to_string());
    let progress = req.progress.unwrap_or(0).clamp(0, 100);

    let result = sqlx::query_as::<_, PdmProject>(&format!(
        r#"
        INSERT INTO pdm_projects AS p (
            tenant_id, project_no, name, description, status, phase, start_date, end_date,
            manager_id, manager_name, budget, progress, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING {PROJECT_COLUMNS}
        "#
    ))
    .bind(tenant_id)
    .bind(&req.project_no)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&status)
    .bind(&phase)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(&req.manager_id)
    .bind(&req.manager_name)
    .bind(req.budget)
    .bind(progress)
    .bind(&req.created_by)
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(project) => Json(ApiResponse::success(project, "创建项目成功")),
        Err(e) => {
            tracing::error!("创建项目失败: {}", e);
            if e.to_string().contains("unique") {
                Json(ApiResponse::error(409, "项目编号已存在"))
            } else {
                Json(ApiResponse::error(500, "创建项目失败"))
            }
        }
    }
}

#[utoipa::path(get, path = "/api/pdm/projects/{id}", tag = "pdm", params(("id" = Uuid, Path, description = "id")), responses((status = 200, description = "OK")))]
pub async fn get_project(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<PdmProject>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, PdmProject>(&format!(
        r#"
        SELECT {PROJECT_COLUMNS}
        FROM pdm_projects p
        WHERE p.deleted_at IS NULL AND p.id = $1 AND p.tenant_id = $2
        "#
    ))
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
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

#[utoipa::path(put, path = "/api/pdm/projects/{id}", request_body = UpdatePdmProjectRequest, tag = "pdm", params(("id" = Uuid, Path, description = "id")), responses((status = 200, description = "OK")))]
pub async fn update_project(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdatePdmProjectRequest>,
) -> Json<ApiResponse<PdmProject>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let progress = req.progress.map(|p| p.clamp(0, 100));
    let result = sqlx::query_as::<_, PdmProject>(&format!(
        r#"
        UPDATE pdm_projects p SET
            project_no = COALESCE($2, project_no),
            name = COALESCE($3, name),
            description = COALESCE($4, description),
            status = COALESCE($5, status),
            phase = COALESCE($6, phase),
            start_date = COALESCE($7, start_date),
            end_date = COALESCE($8, end_date),
            manager_id = COALESCE($9, manager_id),
            manager_name = COALESCE($10, manager_name),
            budget = COALESCE($11, budget),
            progress = COALESCE($12, progress),
            created_by = COALESCE($13, created_by),
            updated_at = NOW()
        WHERE id = $1 AND tenant_id = $14 AND deleted_at IS NULL
        RETURNING {PROJECT_COLUMNS}
        "#
    ))
    .bind(id)
    .bind(req.project_no)
    .bind(req.name)
    .bind(req.description)
    .bind(req.status)
    .bind(req.phase)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.manager_id)
    .bind(req.manager_name)
    .bind(req.budget)
    .bind(progress)
    .bind(req.created_by)
    .bind(tenant_id)
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(project)) => Json(ApiResponse::success(project, "更新项目成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目不存在")),
        Err(e) => {
            tracing::error!("更新项目失败: {}", e);
            Json(ApiResponse::error(500, "更新项目失败"))
        }
    }
}

#[utoipa::path(delete, path = "/api/pdm/projects/{id}", tag = "pdm", params(("id" = Uuid, Path, description = "id")), responses((status = 200, description = "OK")))]
pub async fn delete_project(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query(
        "UPDATE pdm_projects SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL",
    )
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "删除项目成功")),
        Ok(_) => Json(ApiResponse::error(404, "项目不存在")),
        Err(e) => {
            tracing::error!("删除项目失败: {}", e);
            Json(ApiResponse::error(500, "删除项目失败"))
        }
    }
}

#[utoipa::path(put, path = "/api/pdm/projects/{id}/status", request_body = UpdateProjectStatusRequest, tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn update_project_status(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateProjectStatusRequest>,
) -> Json<ApiResponse<PdmProject>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    if req.status.trim().is_empty() {
        return Json(ApiResponse::error(400, "项目状态不能为空"));
    }
    let result = sqlx::query_as::<_, PdmProject>(&format!(
        "UPDATE pdm_projects p SET status = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING {PROJECT_COLUMNS}"
    ))
    .bind(id)
    .bind(tenant_id)
    .bind(&req.status)
    .fetch_optional(&state.pool)
    .await;
    match result {
        Ok(Some(project)) => Json(ApiResponse::success(project, "更新项目状态成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目不存在")),
        Err(e) => {
            tracing::error!("更新项目状态失败: {}", e);
            Json(ApiResponse::error(500, "更新项目状态失败"))
        }
    }
}

#[utoipa::path(put, path = "/api/pdm/projects/{id}/phase", request_body = UpdateProjectPhaseRequest, tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn update_project_phase(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateProjectPhaseRequest>,
) -> Json<ApiResponse<PdmProject>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    if req.phase.trim().is_empty() {
        return Json(ApiResponse::error(400, "项目阶段不能为空"));
    }
    let result = sqlx::query_as::<_, PdmProject>(&format!(
        "UPDATE pdm_projects p SET phase = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL RETURNING {PROJECT_COLUMNS}"
    ))
    .bind(id)
    .bind(tenant_id)
    .bind(&req.phase)
    .fetch_optional(&state.pool)
    .await;
    match result {
        Ok(Some(project)) => Json(ApiResponse::success(project, "更新项目阶段成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目不存在")),
        Err(e) => {
            tracing::error!("更新项目阶段失败: {}", e);
            Json(ApiResponse::error(500, "更新项目阶段失败"))
        }
    }
}

#[utoipa::path(get, path = "/api/pdm/projects/{projectId}/members", tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn list_members(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(project_id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<ProjectMember>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, ProjectMember>(
        r#"
        SELECT id, tenant_id, project_id, user_id, user_name, user_email, role, joined_at, updated_at
        FROM pdm_project_members
        WHERE tenant_id = $1 AND project_id = $2
        ORDER BY joined_at DESC
        "#,
    )
    .bind(tenant_id)
    .bind(project_id)
    .fetch_all(&state.pool)
    .await;
    match result {
        Ok(members) => Json(ApiResponse::success(members, "获取项目成员成功")),
        Err(e) => {
            tracing::error!("获取项目成员失败: {}", e);
            Json(ApiResponse::error(500, "获取项目成员失败"))
        }
    }
}

#[utoipa::path(post, path = "/api/pdm/projects/{projectId}/members", request_body = AddProjectMemberRequest, tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn add_member(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(project_id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<AddProjectMemberRequest>,
) -> Json<ApiResponse<ProjectMember>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    if req.user_id.trim().is_empty() || req.role.trim().is_empty() {
        return Json(ApiResponse::error(400, "成员用户和角色不能为空"));
    }
    let result = sqlx::query_as::<_, ProjectMember>(
        r#"
        INSERT INTO pdm_project_members (tenant_id, project_id, user_id, user_name, user_email, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (tenant_id, project_id, user_id) DO UPDATE
        SET user_name = COALESCE(EXCLUDED.user_name, pdm_project_members.user_name),
            user_email = COALESCE(EXCLUDED.user_email, pdm_project_members.user_email),
            role = EXCLUDED.role,
            updated_at = NOW()
        RETURNING id, tenant_id, project_id, user_id, user_name, user_email, role, joined_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(project_id)
    .bind(&req.user_id)
    .bind(&req.user_name)
    .bind(&req.user_email)
    .bind(&req.role)
    .fetch_one(&state.pool)
    .await;
    match result {
        Ok(member) => Json(ApiResponse::success(member, "保存项目成员成功")),
        Err(e) => {
            tracing::error!("保存项目成员失败: {}", e);
            Json(ApiResponse::error(500, "保存项目成员失败"))
        }
    }
}

#[utoipa::path(put, path = "/api/pdm/projects/{projectId}/members/{userId}", request_body = UpdateProjectMemberRequest, tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn update_member(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((project_id, user_id)): Path<(Uuid, String)>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateProjectMemberRequest>,
) -> Json<ApiResponse<ProjectMember>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, ProjectMember>(
        r#"
        UPDATE pdm_project_members
        SET user_name = COALESCE($4, user_name),
            user_email = COALESCE($5, user_email),
            role = COALESCE($6, role),
            updated_at = NOW()
        WHERE tenant_id = $1 AND project_id = $2 AND user_id = $3
        RETURNING id, tenant_id, project_id, user_id, user_name, user_email, role, joined_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(project_id)
    .bind(&user_id)
    .bind(req.user_name)
    .bind(req.user_email)
    .bind(req.role)
    .fetch_optional(&state.pool)
    .await;
    match result {
        Ok(Some(member)) => Json(ApiResponse::success(member, "更新项目成员成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目成员不存在")),
        Err(e) => {
            tracing::error!("更新项目成员失败: {}", e);
            Json(ApiResponse::error(500, "更新项目成员失败"))
        }
    }
}

#[utoipa::path(delete, path = "/api/pdm/projects/{projectId}/members/{userId}", tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn remove_member(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((project_id, user_id)): Path<(Uuid, String)>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query(
        "DELETE FROM pdm_project_members WHERE tenant_id = $1 AND project_id = $2 AND user_id = $3",
    )
    .bind(tenant_id)
    .bind(project_id)
    .bind(&user_id)
    .execute(&state.pool)
    .await;
    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "移除项目成员成功")),
        Ok(_) => Json(ApiResponse::error(404, "项目成员不存在")),
        Err(e) => {
            tracing::error!("移除项目成员失败: {}", e);
            Json(ApiResponse::error(500, "移除项目成员失败"))
        }
    }
}

#[utoipa::path(get, path = "/api/pdm/projects/{projectId}/phases", tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn list_phases(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(project_id): Path<Uuid>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<ProjectPhase>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, ProjectPhase>(
        r#"
        SELECT id, tenant_id, project_id, phase, name, description, start_date, end_date,
               status, deliverables, created_at, updated_at
        FROM pdm_project_phases
        WHERE tenant_id = $1 AND project_id = $2
        ORDER BY created_at ASC
        "#,
    )
    .bind(tenant_id)
    .bind(project_id)
    .fetch_all(&state.pool)
    .await;
    match result {
        Ok(phases) => Json(ApiResponse::success(phases, "获取项目阶段成功")),
        Err(e) => {
            tracing::error!("获取项目阶段失败: {}", e);
            Json(ApiResponse::error(500, "获取项目阶段失败"))
        }
    }
}

#[utoipa::path(post, path = "/api/pdm/projects/{projectId}/phases", request_body = CreateProjectPhaseRequest, tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn create_phase(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(project_id): Path<Uuid>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateProjectPhaseRequest>,
) -> Json<ApiResponse<ProjectPhase>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    if req.phase.trim().is_empty() || req.name.trim().is_empty() {
        return Json(ApiResponse::error(400, "阶段标识和名称不能为空"));
    }
    let status = req.status.unwrap_or_else(|| "pending".to_string());
    let result = sqlx::query_as::<_, ProjectPhase>(
        r#"
        INSERT INTO pdm_project_phases (
            tenant_id, project_id, phase, name, description, start_date, end_date, status, deliverables
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, tenant_id, project_id, phase, name, description, start_date, end_date,
                  status, deliverables, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(project_id)
    .bind(&req.phase)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(&status)
    .bind(&req.deliverables)
    .fetch_one(&state.pool)
    .await;
    match result {
        Ok(phase) => Json(ApiResponse::success(phase, "创建项目阶段成功")),
        Err(e) => {
            tracing::error!("创建项目阶段失败: {}", e);
            Json(ApiResponse::error(500, "创建项目阶段失败"))
        }
    }
}

#[utoipa::path(put, path = "/api/pdm/projects/{projectId}/phases/{phaseId}", request_body = UpdateProjectPhaseByIdRequest, tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn update_phase(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((project_id, phase_id)): Path<(Uuid, Uuid)>,
    headers: axum::http::HeaderMap,
    Json(req): Json<UpdateProjectPhaseByIdRequest>,
) -> Json<ApiResponse<ProjectPhase>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query_as::<_, ProjectPhase>(
        r#"
        UPDATE pdm_project_phases
        SET phase = COALESCE($4, phase),
            name = COALESCE($5, name),
            description = COALESCE($6, description),
            start_date = COALESCE($7, start_date),
            end_date = COALESCE($8, end_date),
            status = COALESCE($9, status),
            deliverables = COALESCE($10, deliverables),
            updated_at = NOW()
        WHERE tenant_id = $1 AND project_id = $2 AND id = $3
        RETURNING id, tenant_id, project_id, phase, name, description, start_date, end_date,
                  status, deliverables, created_at, updated_at
        "#,
    )
    .bind(tenant_id)
    .bind(project_id)
    .bind(phase_id)
    .bind(req.phase)
    .bind(req.name)
    .bind(req.description)
    .bind(req.start_date)
    .bind(req.end_date)
    .bind(req.status)
    .bind(req.deliverables)
    .fetch_optional(&state.pool)
    .await;
    match result {
        Ok(Some(phase)) => Json(ApiResponse::success(phase, "更新项目阶段成功")),
        Ok(None) => Json(ApiResponse::error(404, "项目阶段不存在")),
        Err(e) => {
            tracing::error!("更新项目阶段失败: {}", e);
            Json(ApiResponse::error(500, "更新项目阶段失败"))
        }
    }
}

#[utoipa::path(delete, path = "/api/pdm/projects/{projectId}/phases/{phaseId}", tag = "pdm", responses((status = 200, description = "OK")))]
pub async fn delete_phase(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path((project_id, phase_id)): Path<(Uuid, Uuid)>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let result = sqlx::query(
        "DELETE FROM pdm_project_phases WHERE tenant_id = $1 AND project_id = $2 AND id = $3",
    )
    .bind(tenant_id)
    .bind(project_id)
    .bind(phase_id)
    .execute(&state.pool)
    .await;
    match result {
        Ok(r) if r.rows_affected() > 0 => Json(ApiResponse::success(true, "删除项目阶段成功")),
        Ok(_) => Json(ApiResponse::error(404, "项目阶段不存在")),
        Err(e) => {
            tracing::error!("删除项目阶段失败: {}", e);
            Json(ApiResponse::error(500, "删除项目阶段失败"))
        }
    }
}
