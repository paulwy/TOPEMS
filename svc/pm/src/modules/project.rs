use axum::{
    extract::{Extension, Path, State},
    http::{HeaderMap, StatusCode},
    routing::get,
    Json, Router,
};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::sync::Arc;
use topems_shared::ApiResponse;
use topems_shared_event::event::{EventPublisher, EventType, PmProjectCreatedPayload};
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::models::project::{CreateProjectRequest, Project, UpdateProjectRequest};
use crate::services::audit::PmAuditService;

// ==================== Pure functions ====================

/// Validates a project status transition.
///
/// Allowed transitions:
/// - draft    -> pending, cancelled
/// - pending  -> active, cancelled, draft
/// - active   -> completed, cancelled, pending
/// - completed -> closed, active
/// - cancelled -> draft
/// - Same-state transitions are always valid (no-op).
pub fn is_valid_project_transition(from: &str, to: &str) -> bool {
    if from == to {
        return true;
    }
    match from {
        "draft" => matches!(to, "pending" | "cancelled"),
        "pending" => matches!(to, "active" | "cancelled" | "draft"),
        "active" => matches!(to, "completed" | "cancelled" | "pending"),
        "completed" => matches!(to, "closed" | "active"),
        "cancelled" => matches!(to, "draft"),
        "closed" => false,
        _ => false,
    }
}

/// Calculates project completion percentage based on completed vs total phases.
///
/// Returns a value in the range `[0.0, 100.0]`.
/// Returns `0.0` when `total_phases` is zero.
pub fn project_completion_pct(completed_phases: usize, total_phases: usize) -> f64 {
    if total_phases == 0 {
        return 0.0;
    }
    let pct = (completed_phases as f64 / total_phases as f64) * 100.0;
    pct.clamp(0.0, 100.0)
}

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub event_publisher: Option<Arc<EventPublisher>>,
}

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

pub fn create_routes(pool: PgPool, event_publisher: Option<Arc<EventPublisher>>) -> Router {
    let state = AppState {
        pool,
        event_publisher,
    };
    Router::new()
        .route("/projects", get(list_projects).post(create_project))
        .route(
            "/projects/{id}",
            get(get_project).put(update_project).delete(delete_project),
        )
        .route("/projects/{id}/dashboard", get(get_project_dashboard))
        .route("/projects/{id}/gantt", get(get_project_gantt))
        .with_state(state)
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/api/pm/projects",
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
    State(state): State<AppState>,
    axum::extract::Query(query): axum::extract::Query<ProjectQuery>,
) -> Json<ApiResponse<ProjectListResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(50).clamp(1, 1000);

    let result = sqlx::query_as::<_, Project>("SELECT * FROM pm.projects ORDER BY created_at DESC")
        .fetch_all(&state.pool)
        .await;

    let projects = match result {
        Ok(p) => p,
        Err(e) => {
            tracing::error!("获取项目列表失败: {}", e);
            return Json(ApiResponse::error(
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                "获取项目列表失败",
            ));
        }
    };

    let filtered_projects: Vec<Project> = projects
        .into_iter()
        .filter(|p| {
            let type_ok = query
                .project_type
                .as_ref()
                .is_none_or(|t| &p.project_type == t);
            let status_ok = query.status.as_ref().is_none_or(|s| &p.status == s);
            type_ok && status_ok
        })
        .collect();

    let total = filtered_projects.len() as i32;

    Json(ApiResponse::success(
        ProjectListResponse {
            projects: filtered_projects,
            total,
            page,
            page_size,
        },
        "获取项目列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["pm:write"])),
    path = "/api/pm/projects",
    tag = "projects",
    request_body = CreateProjectRequest,
    responses(
        (status = 200, description = "创建项目成功", body = ApiResponse<Project>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn create_project(
    State(state): State<AppState>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
    Json(req): Json<CreateProjectRequest>,
) -> Json<ApiResponse<Project>> {
    let id = Uuid::new_v4();
    let now = Utc::now();
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let details = Some(serde_json::json!({"name": req.name, "code": req.code, "project_type": req.project_type}));

    let result = sqlx::query_as::<_, Project>(
        r#"
        INSERT INTO plugin_pm.projects (
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
    .bind(req.start_date)
    .bind(req.end_date)
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
    .fetch_one(&state.pool)
    .await;

    match result {
        Ok(project) => {
            let entity_id = Some(project.id);
            if let Err(e) = audit.log_project_operation("create_project", entity_id, user_id, details.clone(), "success", None).await {
                tracing::warn!("pm audit failed: {e}");
            }
            if let Some(ref publisher) = state.event_publisher {
                let publisher = publisher.clone();
                let project_id = project.id;
                let project_name = project.name.clone();
                let owner_id = project
                    .leader
                    .as_deref()
                    .and_then(|s| Uuid::parse_str(s).ok())
                    .unwrap_or(Uuid::nil());
                tokio::spawn(async move {
                    let payload = PmProjectCreatedPayload {
                        project_id,
                        project_name,
                        owner_id,
                    };
                    if let Err(e) = publisher
                        .publish_event(EventType::PmProjectCreated, payload)
                        .await
                    {
                        tracing::warn!(
                            "[pm] PmProjectCreated 事件发布失败（graceful fallback）: {}",
                            e
                        );
                    } else {
                        tracing::info!(
                            "[pm] PmProjectCreated 事件发布成功 - project_id={}",
                            project_id
                        );
                    }
                });
            }

            Json(ApiResponse::success(project, "创建项目成功"))
        }
        Err(sqlx::Error::RowNotFound) => {
            if let Err(e) = audit.log_project_operation("create_project", Some(id), user_id, details.clone(), "failed", Some("项目代码已存在")).await {
                tracing::warn!("pm audit failed: {e}");
            }
            Json(ApiResponse::error(409, "项目代码已存在"))
        }
        Err(e) => {
            if let Err(audit_err) = audit.log_project_operation("create_project", Some(id), user_id, details, "failed", Some(&e.to_string())).await {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("创建项目失败: {}", e);
            Json(ApiResponse::error(500, "创建项目失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/api/pm/projects/{id}",
    tag = "projects",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "获取项目成功", body = ApiResponse<Project>),
        (status = 404, description = "项目不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_project(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<Project>> {
    let result = sqlx::query_as::<_, Project>(
        "SELECT * FROM pm.projects WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(id)
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

#[utoipa::path(
    put,
    security(("BearerAuth" = ["pm:update"])),
    path = "/api/pm/projects/{id}",
    tag = "projects",
    request_body = UpdateProjectRequest,
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "更新项目成功", body = ApiResponse<Project>),
        (status = 404, description = "项目不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn update_project(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
    Json(req): Json<UpdateProjectRequest>,
) -> Json<ApiResponse<Project>> {
    let now = Utc::now();
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let details = Some(serde_json::json!({"status": req.status}));

    let result = sqlx::query_as::<_, Project>(
        r#"
        UPDATE plugin_pm.projects
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
    .bind(req.end_date)
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
    .fetch_optional(&state.pool)
    .await;

    match result {
        Ok(Some(project)) => {
            if let Err(e) = audit.log_project_operation("update_project", Some(project.id), user_id, details.clone(), "success", None).await {
                tracing::warn!("pm audit failed: {e}");
            }
            Json(ApiResponse::success(project, "更新项目成功"))
        }
        Ok(None) => {
            if let Err(e) = audit.log_project_operation("update_project", Some(id), user_id, details.clone(), "failed", Some("项目不存在")).await {
                tracing::warn!("pm audit failed: {e}");
            }
            Json(ApiResponse::error(404, "项目不存在"))
        }
        Err(e) => {
            if let Err(audit_err) = audit.log_project_operation("update_project", Some(id), user_id, details, "failed", Some(&e.to_string())).await {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("更新项目失败: {}", e);
            Json(ApiResponse::error(500, "更新项目失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["pm:delete"])),
    path = "/api/pm/projects/{id}",
    tag = "projects",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "删除项目成功", body = ApiResponse<bool>),
        (status = 404, description = "项目不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn delete_project(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Extension(audit): Extension<PmAuditService>,
    headers: HeaderMap,
) -> Json<ApiResponse<bool>> {
    let user_id = headers.get("x-username").and_then(|v| v.to_str().ok());
    let result = sqlx::query("UPDATE pm.projects SET deleted_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            if let Err(e) = audit.log_project_operation("delete_project", Some(id), user_id, None, "success", None).await {
                tracing::warn!("pm audit failed: {e}");
            }
            Json(ApiResponse::success(true, "删除项目成功"))
        }
        Ok(_) => {
            if let Err(e) = audit.log_project_operation("delete_project", Some(id), user_id, None, "failed", Some("项目不存在")).await {
                tracing::warn!("pm audit failed: {e}");
            }
            Json(ApiResponse::error(404, "项目不存在"))
        }
        Err(e) => {
            if let Err(audit_err) = audit.log_project_operation("delete_project", Some(id), user_id, None, "failed", Some(&e.to_string())).await {
                tracing::warn!("pm audit failed: {audit_err}");
            }
            tracing::error!("删除项目失败: {}", e);
            Json(ApiResponse::error(500, "删除项目失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["pm:read"])),
    path = "/api/pm/projects/{id}/dashboard",
    tag = "projects",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "获取项目仪表盘成功", body = ApiResponse<ProjectDashboardResponse>),
        (status = 404, description = "项目不存在"),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_project_dashboard(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProjectDashboardResponse>> {
    let project_result = sqlx::query_as::<_, Project>(
        "SELECT * FROM pm.projects WHERE deleted_at IS NULL AND id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
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
        "SELECT * FROM pm.project_phases WHERE project_id = $1",
    )
    .bind(id)
    .fetch_all(&state.pool)
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
        "SELECT * FROM pm.project_members WHERE project_id = $1",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await;

    let members: Vec<serde_json::Value> = members_result
        .unwrap_or_default()
        .into_iter()
        .map(|m| {
            serde_json::json!({
                "user_id": m.user_id,
                "role": m.role
            })
        })
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
    security(("BearerAuth" = ["pm:read"])),
    path = "/api/pm/projects/{id}/gantt",
    tag = "projects",
    params(
        ("id" = Uuid, Path, description = "id")
    ),

    responses(
        (status = 200, description = "获取甘特图数据成功", body = ApiResponse<ProjectGanttResponse>),
        (status = 500, description = "服务器内部错误"),
    ),
)]
async fn get_project_gantt(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Json<ApiResponse<ProjectGanttResponse>> {
    let phases_result = sqlx::query_as::<_, crate::models::project_phase::ProjectPhase>(
        "SELECT * FROM pm.project_phases WHERE project_id = $1 ORDER BY sequence_number ASC",
    )
    .bind(id)
    .fetch_all(&state.pool)
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

    let milestones_result =
        sqlx::query_as::<_, crate::models::project_milestone::ProjectMilestone>(
            "SELECT * FROM pm.project_milestones WHERE project_id = $1 ORDER BY date ASC",
        )
        .bind(id)
        .fetch_all(&state.pool)
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

#[cfg(test)]
mod tests {
    use super::*;

    // ---- is_valid_project_transition ----

    #[test]
    fn test_same_state_transition_is_valid() {
        assert!(is_valid_project_transition("draft", "draft"));
        assert!(is_valid_project_transition("active", "active"));
        assert!(is_valid_project_transition("completed", "completed"));
    }

    #[test]
    fn test_draft_transitions() {
        assert!(is_valid_project_transition("draft", "pending"));
        assert!(is_valid_project_transition("draft", "cancelled"));
        assert!(!is_valid_project_transition("draft", "active"));
        assert!(!is_valid_project_transition("draft", "completed"));
    }

    #[test]
    fn test_pending_transitions() {
        assert!(is_valid_project_transition("pending", "active"));
        assert!(is_valid_project_transition("pending", "cancelled"));
        assert!(is_valid_project_transition("pending", "draft"));
        assert!(!is_valid_project_transition("pending", "completed"));
    }

    #[test]
    fn test_active_transitions() {
        assert!(is_valid_project_transition("active", "completed"));
        assert!(is_valid_project_transition("active", "cancelled"));
        assert!(is_valid_project_transition("active", "pending"));
        assert!(!is_valid_project_transition("active", "draft"));
    }

    #[test]
    fn test_completed_transitions() {
        assert!(is_valid_project_transition("completed", "closed"));
        assert!(is_valid_project_transition("completed", "active"));
        assert!(!is_valid_project_transition("completed", "cancelled"));
    }

    #[test]
    fn test_cancelled_and_closed_transitions() {
        assert!(is_valid_project_transition("cancelled", "draft"));
        assert!(!is_valid_project_transition("cancelled", "active"));
        assert!(!is_valid_project_transition("closed", "draft"));
        assert!(!is_valid_project_transition("closed", "active"));
    }

    #[test]
    fn test_unknown_status_transitions() {
        assert!(!is_valid_project_transition("unknown", "draft"));
        assert!(!is_valid_project_transition("draft", "unknown"));
        assert!(!is_valid_project_transition("foo", "bar"));
    }

    // ---- project_completion_pct ----

    #[test]
    fn test_completion_zero_total() {
        assert_eq!(project_completion_pct(0, 0), 0.0);
        assert_eq!(project_completion_pct(5, 0), 0.0);
    }

    #[test]
    fn test_completion_no_phases_done() {
        assert_eq!(project_completion_pct(0, 10), 0.0);
    }

    #[test]
    fn test_completion_all_phases_done() {
        assert_eq!(project_completion_pct(10, 10), 100.0);
    }

    #[test]
    fn test_completion_partial() {
        assert_eq!(project_completion_pct(3, 4), 75.0);
        let result = project_completion_pct(1, 3);
        assert!((result - (100.0 / 3.0)).abs() < 1e-9);
    }

    #[test]
    fn test_completion_clamps_overflow() {
        assert_eq!(project_completion_pct(15, 10), 100.0);
    }

    // ---- Response struct serialization tests ----

    fn uid() -> Uuid {
        Uuid::parse_str("123e4567-e89b-12d3-a456-426614174000").unwrap()
    }

    fn now() -> chrono::DateTime<Utc> {
        Utc::now()
    }

    fn sample_project() -> Project {
        Project {
            id: uid(),
            name: "测试项目".to_string(),
            code: "TEST-001".to_string(),
            description: Some("d".to_string()),
            project_type: "internal".to_string(),
            status: "active".to_string(),
            leader: Some("leader".to_string()),
            start_date: Some(now()),
            end_date: Some(now()),
            budget: Some(rust_decimal::Decimal::from(100_000)),
            progress: 50,
            project_config: Some(serde_json::json!({"key": "value"})),
            benefit_target: Some(serde_json::json!({"target": 200000})),
            risk_level: Some("medium".to_string()),
            priority: Some(1),
            tags: Some(vec!["urgent".to_string()]),
            parent_id: None,
            workspace_id: None,
            created_by: Some("admin".to_string()),
            created_at: now(),
            updated_at: now(),
        }
    }

    #[test]
    fn test_project_query_deserialize() {
        let json = r#"{"project_type":"internal","status":"active","page":1,"page_size":20}"#;
        let q: ProjectQuery = serde_json::from_str(json).unwrap();
        assert_eq!(q.project_type, Some("internal".to_string()));
        assert_eq!(q.status, Some("active".to_string()));
        assert_eq!(q.page, Some(1));
        assert_eq!(q.page_size, Some(20));
    }

    #[test]
    fn test_project_query_deserialize_all_none() {
        let json = r#"{}"#;
        let q: ProjectQuery = serde_json::from_str(json).unwrap();
        assert!(q.project_type.is_none());
        assert!(q.status.is_none());
        assert!(q.page.is_none());
        assert!(q.page_size.is_none());
    }

    #[test]
    fn test_project_list_response_serialization() {
        let p = sample_project();
        let resp = ProjectListResponse {
            projects: vec![p.clone()],
            total: 1,
            page: 1,
            page_size: 20,
        };
        let s = serde_json::to_string(&resp).unwrap();
        let v: serde_json::Value = serde_json::from_str(&s).unwrap();
        assert_eq!(v["total"], 1);
        assert_eq!(v["page"], 1);
        assert_eq!(v["page_size"], 20);
        assert_eq!(v["projects"][0]["name"], "测试项目");
    }

    #[test]
    fn test_project_list_response_empty() {
        let resp = ProjectListResponse {
            projects: vec![],
            total: 0,
            page: 1,
            page_size: 20,
        };
        let s = serde_json::to_string(&resp).unwrap();
        let v: serde_json::Value = serde_json::from_str(&s).unwrap();
        assert_eq!(v["total"], 0);
        assert!(v["projects"].as_array().unwrap().is_empty());
    }

    #[test]
    fn test_gantt_phase_serialization() {
        let g = GanttPhase {
            id: uid(),
            name: "设计阶段".to_string(),
            project_id: uid(),
            start_date: Some(now()),
            end_date: Some(now()),
            progress: 75,
            status: "in_progress".to_string(),
            predecessor_ids: vec![uid(), uid()],
        };
        let s = serde_json::to_string(&g).unwrap();
        let v: serde_json::Value = serde_json::from_str(&s).unwrap();
        assert_eq!(v["name"], "设计阶段");
        assert_eq!(v["progress"], 75);
        assert_eq!(v["predecessor_ids"].as_array().unwrap().len(), 2);
    }

    #[test]
    fn test_gantt_phase_no_dates() {
        let g = GanttPhase {
            id: uid(),
            name: "n".to_string(),
            project_id: uid(),
            start_date: None,
            end_date: None,
            progress: 0,
            status: "pending".to_string(),
            predecessor_ids: vec![],
        };
        let s = serde_json::to_string(&g).unwrap();
        let v: serde_json::Value = serde_json::from_str(&s).unwrap();
        assert!(v["start_date"].is_null());
        assert!(v["end_date"].is_null());
        assert_eq!(v["predecessor_ids"].as_array().unwrap().len(), 0);
    }

    #[test]
    fn test_gantt_milestone_serialization() {
        let m = GanttMilestone {
            id: uid(),
            name: "里程碑1".to_string(),
            project_id: uid(),
            date: now(),
            status: "completed".to_string(),
        };
        let s = serde_json::to_string(&m).unwrap();
        let v: serde_json::Value = serde_json::from_str(&s).unwrap();
        assert_eq!(v["name"], "里程碑1");
        assert_eq!(v["status"], "completed");
    }

    #[test]
    fn test_gantt_resource_serialization() {
        let r = GanttResource {
            id: uid(),
            resource_type: "human".to_string(),
            name: "张三".to_string(),
            assignments: vec![serde_json::json!({"phase": "p1"})],
        };
        let s = serde_json::to_string(&r).unwrap();
        let v: serde_json::Value = serde_json::from_str(&s).unwrap();
        assert_eq!(v["resource_type"], "human");
        assert_eq!(v["name"], "张三");
        assert_eq!(v["assignments"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn test_gantt_resource_empty_assignments() {
        let r = GanttResource {
            id: uid(),
            resource_type: "equipment".to_string(),
            name: "n".to_string(),
            assignments: vec![],
        };
        let s = serde_json::to_string(&r).unwrap();
        let v: serde_json::Value = serde_json::from_str(&s).unwrap();
        assert!(v["assignments"].as_array().unwrap().is_empty());
    }

    #[test]
    fn test_project_gantt_response_serialization() {
        let resp = ProjectGanttResponse {
            phases: vec![GanttPhase {
                id: uid(),
                name: "p1".to_string(),
                project_id: uid(),
                start_date: None,
                end_date: None,
                progress: 50,
                status: "active".to_string(),
                predecessor_ids: vec![],
            }],
            milestones: vec![GanttMilestone {
                id: uid(),
                name: "m1".to_string(),
                project_id: uid(),
                date: now(),
                status: "pending".to_string(),
            }],
            resources: vec![],
        };
        let s = serde_json::to_string(&resp).unwrap();
        let v: serde_json::Value = serde_json::from_str(&s).unwrap();
        assert_eq!(v["phases"].as_array().unwrap().len(), 1);
        assert_eq!(v["milestones"].as_array().unwrap().len(), 1);
        assert!(v["resources"].as_array().unwrap().is_empty());
    }

    #[test]
    fn test_project_dashboard_response_serialization() {
        let p = sample_project();
        let resp = ProjectDashboardResponse {
            project: p,
            progress: serde_json::json!({"planned": 50, "actual": 60}),
            budget: serde_json::json!({"total": 100000, "spent": 50000}),
            members: vec![serde_json::json!({"user_id": "u1", "role": "manager"})],
            equipment: vec![],
            benefits: serde_json::json!({"cpi": 1.2, "roi": 0.15}),
            risks: vec![serde_json::json!({"level": "high"})],
        };
        let s = serde_json::to_string(&resp).unwrap();
        let v: serde_json::Value = serde_json::from_str(&s).unwrap();
        assert_eq!(v["project"]["name"], "测试项目");
        assert_eq!(v["progress"]["planned"], 50);
        assert_eq!(v["budget"]["total"], 100000);
        assert_eq!(v["members"].as_array().unwrap().len(), 1);
        assert!(v["equipment"].as_array().unwrap().is_empty());
        assert_eq!(v["benefits"]["cpi"], 1.2);
        assert_eq!(v["risks"].as_array().unwrap().len(), 1);
    }
}
