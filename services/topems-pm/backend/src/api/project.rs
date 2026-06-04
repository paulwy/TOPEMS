use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post, put, delete},
    Json,
    Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use topems_shared::ApiResponse;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::models::project::{CreateProjectRequest, Project, UpdateProjectRequest};

#[derive(Deserialize, ToSchema, IntoParams)]
pub struct ProjectQuery {
    pub project_type: Option<String>,
    pub status: Option<String>,
    pub page: Option<i32>,
    pub page_size: Option<i32>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct ProjectListResponse {
    pub projects: Vec<Project>,
    pub total: i32,
    pub page: i32,
    pub page_size: i32,
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

#[derive(Debug, Serialize, ToSchema)]
pub struct GanttPhase {
    pub id: Uuid,
    pub name: String,
    pub project_id: Uuid,
    pub start_date: Option<chrono::DateTime<Utc>>,
    pub end_date: Option<chrono::DateTime<Utc>>,
    pub progress: i32,
    pub status: String,
    pub predecessor_ids: Vec<Uuid>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct GanttMilestone {
    pub id: Uuid,
    pub name: String,
    pub project_id: Uuid,
    pub date: chrono::DateTime<Utc>,
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

pub fn create_routes(pool: PgPool) -> Router {
    Router::new()
        .route("/api/v1/projects", get(list_projects).post(create_project))
        .route("/api/v1/projects/{id}", get(get_project).put(update_project).delete(delete_project))
        .route("/api/v1/projects/{id}/dashboard", get(get_project_dashboard))
        .route("/api/v1/projects/{id}/gantt", get(get_project_gantt))
        .with_state(pool)
}

#[utoipa::path(
    get,
    path = "/api/v1/projects",
    tag = "projects",
    params(
        ProjectQuery,
    ),
    responses(
        (status = 200, description = "获取项目列表成功", body = ApiResponse<ProjectListResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn list_projects(
    State(pool): State<PgPool>,
    axum::extract::Query(query): axum::extract::Query<ProjectQuery>,
) -> Json<ApiResponse<ProjectListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(50).clamp(1, 1000);

    let result = sqlx::query_as::<_, Project>("SELECT * FROM pm.projects ORDER BY created_at DESC")
        .fetch_all(&pool)
        .await;

    let projects = match result {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("获取项目列表失败: {}", e);
            return Json(ApiResponse::error(StatusCode::INTERNAL_SERVER_ERROR.as_u16(), "获取项目列表失败"));
        }
    };

    let filtered_projects: Vec<Project> = projects
        .into_iter()
        .filter(|p| {
            let type_ok = query.project_type.as_ref().map_or(true, |t| &p.project_type == t);
            let status_ok = query.status.as_ref().map_or(true, |s| &p.status == s);
            type_ok && status_ok
        })
        .collect();

    let total = filtered_projects.len() as i32;

    Json(ApiResponse::success(ProjectListResponse {
        projects: filtered_projects,
        total,
        page,
        page_size,
    }, "获取项目列表成功"))
}

#[utoipa::path(
    post,
    path = "/api/v1/projects",
    tag = "projects",
    request_body = CreateProjectRequest,
    responses(
        (status = 200, description = "创建项目成功", body = ApiResponse<Project>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn create_project(
    State(pool): State<PgPool>,
    Json(req): Json<CreateProjectRequest>,
) -> Json<ApiResponse<Project>> {
    let id = Uuid::new_v4();
    let now = Utc::now();

    let result = sqlx::query_as::<_, Project>(
        r#"
        INSERT INTO pm.projects (
            id, name, code, description, project_type, status, leader,
            start_date, end_date, budget, progress, project_config, benefit_target,
            risk_level, priority, tags, parent_id, workspace_id, created_by,
            created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        ON CONFLICT (code) DO NOTHING
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(&req.name)
    .bind(&req.code)
    .bind(&req.description)
    .bind(&req.project_type)
    .bind("draft")
    .bind(&req.leader)
    .bind(&req.start_date)
    .bind(&req.end_date)
    .bind(req.budget)
    .bind(0)
    .bind(&req.project_config)
    .bind(&req.benefit_target)
    .bind(&req.risk_level)
    .bind(req.priority)
    .bind(&req.tags)
    .bind(req.parent_id)
    .bind(req.workspace_id)
    .bind(Some("system"))
    .bind(now)
    .bind(now)
    .fetch_one(&pool)
    .await;

    match result {
        Ok(project) => Json(ApiResponse::success(project, "创建项目成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(409, "项目代码已存在")),
        Err(e) => {
            tracing::error!("创建项目失败: {}", e);
            Json(ApiResponse::error(500, "创建项目失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/projects/:id",
    tag = "projects",
    responses(
        (status = 200, description = "获取项目成功", body = ApiResponse<Project>),
        (status = 404, description = "项目不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_project(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Project>> {
    let result = sqlx::query_as::<_, Project>(
        "SELECT * FROM pm.projects WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
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
    path = "/api/v1/projects/:id",
    tag = "projects",
    request_body = UpdateProjectRequest,
    responses(
        (status = 200, description = "更新项目成功", body = ApiResponse<Project>),
        (status = 404, description = "项目不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn update_project(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateProjectRequest>,
) -> Json<ApiResponse<Project>> {
    let now = Utc::now();

    let result = sqlx::query_as::<_, Project>(
        r#"
        UPDATE pm.projects
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            status = COALESCE($3, status),
            leader = COALESCE($4, leader),
            end_date = COALESCE($5, end_date),
            budget = COALESCE($6, budget),
            progress = COALESCE($7, progress),
            project_config = COALESCE($8, project_config),
            benefit_target = COALESCE($9, benefit_target),
            risk_level = COALESCE($10, risk_level),
            priority = COALESCE($11, priority),
            tags = COALESCE($12, tags),
            parent_id = COALESCE($13, parent_id),
            workspace_id = COALESCE($14, workspace_id),
            updated_at = $15
        WHERE id = $16
        RETURNING *
        "#,
    )
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.status)
    .bind(&req.leader)
    .bind(&req.end_date)
    .bind(req.budget)
    .bind(req.progress)
    .bind(&req.project_config)
    .bind(&req.benefit_target)
    .bind(&req.risk_level)
    .bind(req.priority)
    .bind(&req.tags)
    .bind(req.parent_id)
    .bind(req.workspace_id)
    .bind(now)
    .bind(id)
    .fetch_optional(&pool)
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

#[utoipa::path(
    delete,
    path = "/api/v1/projects/:id",
    tag = "projects",
    responses(
        (status = 200, description = "删除项目成功", body = ApiResponse<bool>),
        (status = 404, description = "项目不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn delete_project(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<bool>> {
    let result = sqlx::query("DELETE FROM pm.projects WHERE id = $1")
        .bind(id)
        .execute(&pool)
        .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            Json(ApiResponse::success(true, "删除项目成功"))
        }
        Ok(_) => Json(ApiResponse::error(404, "项目不存在")),
        Err(e) => {
            tracing::error!("删除项目失败: {}", e);
            Json(ApiResponse::error(500, "删除项目失败"))
        }
    }
}

#[utoipa::path(
    get,
    path = "/api/v1/projects/:id/dashboard",
    tag = "projects",
    responses(
        (status = 200, description = "获取项目仪表盘成功", body = ApiResponse<ProjectDashboardResponse>),
        (status = 404, description = "项目不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_project_dashboard(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProjectDashboardResponse>> {
    let project_result = sqlx::query_as::<_, Project>(
        "SELECT * FROM pm.projects WHERE id = $1"
    )
    .bind(id)
    .fetch_optional(&pool)
    .await;

    let project = match project_result {
        Ok(Some(p)) => p,
        Ok(None) => return Json(ApiResponse::error(404, "项目不存在")),
        Err(e) => {
            tracing::error!("获取项目失败: {}", e);
            return Json(ApiResponse::error(500, "获取项目失败"));
        }
    };

    let phases_result = sqlx::query_as::<_, crate::models::project_phase::ProjectPhase>(
        "SELECT * FROM pm.project_phases WHERE project_id = $1"
    )
    .bind(id)
    .fetch_all(&pool)
    .await;

    let phases = phases_result.unwrap_or_default();
    let completed_phases = phases.iter().filter(|p| p.status == "completed").count();
    let total_phases = phases.len();
    let avg_progress = if total_phases > 0 {
        phases.iter().map(|p| p.progress).sum::<i32>() / total_phases as i32
    } else {
        project.progress
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

    let members_result = sqlx::query_as::<_, crate::models::project_member::ProjectMember>(
        "SELECT * FROM pm.project_members WHERE project_id = $1"
    )
    .bind(id)
    .fetch_all(&pool)
    .await;

    let members: Vec<serde_json::Value> = members_result
        .unwrap_or_default()
        .into_iter()
        .map(|m| serde_json::json!({
            "user_id": m.user_id,
            "role": m.role
        }))
        .collect();

    let mut risks = Vec::new();
    if let Some(risk_level) = &project.risk_level {
        if risk_level == "high" || risk_level == "critical" {
            risks.push(serde_json::json!({
                "level": risk_level,
                "description": "风险等级较高，建议关注"
            }));
        }
    }
    if avg_progress < project.progress - 10 {
        risks.push(serde_json::json!({
            "level": "medium",
            "description": format!("进度落后计划 {}%", project.progress - avg_progress)
        }));
    }

    let benefits = serde_json::json!({
        "cpi": 1.0,
        "spi": avg_progress as f64 / project.progress.max(1) as f64,
        "roi": 0.0,
        "eac": project.budget,
        "milestones_achieved": 0,
        "total_milestones": 0
    });

    let response = ProjectDashboardResponse {
        project,
        progress: progress_data,
        budget: budget_data,
        members,
        equipment: Vec::new(),
        benefits,
        risks,
    };

    Json(ApiResponse::success(response, "获取项目仪表盘成功"))
}

#[utoipa::path(
    get,
    path = "/api/v1/projects/:id/gantt",
    tag = "projects",
    responses(
        (status = 200, description = "获取甘特图数据成功", body = ApiResponse<ProjectGanttResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_project_gantt(
    State(pool): State<PgPool>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProjectGanttResponse>> {
    let phases_result = sqlx::query_as::<_, crate::models::project_phase::ProjectPhase>(
        "SELECT * FROM pm.project_phases WHERE project_id = $1 ORDER BY sequence_number ASC"
    )
    .bind(id)
    .fetch_all(&pool)
    .await;

    let phases: Vec<GanttPhase> = match phases_result {
        Ok(phase_rows) => phase_rows
            .into_iter()
            .map(|row| GanttPhase {
                id: row.id,
                name: row.name,
                project_id: row.project_id,
                start_date: row.start_date,
                end_date: row.end_date,
                progress: row.progress,
                status: row.status,
                predecessor_ids: row.predecessor_ids.unwrap_or_default(),
            })
            .collect(),
        Err(e) => {
            tracing::error!("获取阶段数据失败: {}", e);
            Vec::new()
        }
    };

    let milestones_result = sqlx::query_as::<_, crate::models::project_milestone::ProjectMilestone>(
        "SELECT * FROM pm.project_milestones WHERE project_id = $1 ORDER BY date ASC"
    )
    .bind(id)
    .fetch_all(&pool)
    .await;

    let milestones: Vec<GanttMilestone> = match milestones_result {
        Ok(milestone_rows) => milestone_rows
            .into_iter()
            .map(|row| GanttMilestone {
                id: row.id,
                name: row.name,
                project_id: row.project_id,
                date: row.date,
                status: row.status,
            })
            .collect(),
        Err(e) => {
            tracing::error!("获取里程碑数据失败: {}", e);
            Vec::new()
        }
    };

    let response = ProjectGanttResponse {
        phases,
        milestones,
        resources: Vec::new(),
    };

    Json(ApiResponse::success(response, "获取甘特图数据成功"))
}
