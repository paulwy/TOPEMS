//! APQP (Advanced Product Quality Planning) handlers

use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Json, Router,
};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow};
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct ApqpProjectQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub product_name: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ApqpProject {
    pub id: String,
    pub tenant_id: String,
    pub project_no: String,
    pub project_name: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub customer: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub current_phase: Option<String>,
    pub leader: Option<String>,
    pub team: Option<String>,
    pub start_date: Option<String>,
    pub target_date: Option<String>,
    pub actual_end_date: Option<String>,
    pub progress: Option<i32>,
    pub risk_level: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateApqpProjectRequest {
    pub project_name: String,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub customer: Option<String>,
    pub description: Option<String>,
    pub leader: Option<String>,
    pub team: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub target_date: Option<NaiveDate>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateApqpProjectRequest {
    pub project_name: Option<String>,
    pub product_id: Option<String>,
    pub product_name: Option<String>,
    pub customer: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub current_phase: Option<String>,
    pub leader: Option<String>,
    pub team: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub target_date: Option<NaiveDate>,
    pub actual_end_date: Option<NaiveDate>,
    pub progress: Option<i32>,
    pub risk_level: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ApqpPhase {
    pub id: String,
    pub tenant_id: String,
    pub project_id: String,
    pub phase_code: String,
    pub phase_name: String,
    pub description: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub actual_start_date: Option<String>,
    pub actual_end_date: Option<String>,
    pub progress: Option<i32>,
    pub sort_order: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateApqpPhaseRequest {
    pub project_id: String,
    pub phase_code: String,
    pub phase_name: String,
    pub description: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateApqpPhaseRequest {
    pub phase_name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub actual_start_date: Option<NaiveDate>,
    pub actual_end_date: Option<NaiveDate>,
    pub progress: Option<i32>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ApqpTask {
    pub id: String,
    pub tenant_id: String,
    pub project_id: String,
    pub phase_id: String,
    pub task_name: String,
    pub description: Option<String>,
    pub task_type: Option<String>,
    pub deliverable: Option<String>,
    pub status: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
    pub completed_at: Option<String>,
    pub sort_order: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApqpTaskQuery {
    pub project_id: Option<String>,
    pub phase_id: Option<String>,
    pub status: Option<String>,
    pub assignee: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateApqpTaskRequest {
    pub project_id: String,
    pub phase_id: String,
    pub task_name: String,
    pub description: Option<String>,
    pub task_type: Option<String>,
    pub deliverable: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<NaiveDate>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateApqpTaskRequest {
    pub task_name: Option<String>,
    pub description: Option<String>,
    pub task_type: Option<String>,
    pub deliverable: Option<String>,
    pub status: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<NaiveDate>,
    pub completed_at: Option<NaiveDate>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ApqpRisk {
    pub id: String,
    pub tenant_id: String,
    pub project_id: String,
    pub risk_name: String,
    pub description: Option<String>,
    pub risk_category: Option<String>,
    pub severity: Option<i32>,
    pub occurrence: Option<i32>,
    pub detection: Option<i32>,
    pub rpn: Option<i32>,
    pub status: Option<String>,
    pub mitigation_plan: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ApqpRiskQuery {
    pub project_id: Option<String>,
    pub status: Option<String>,
    pub min_rpn: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateApqpRiskRequest {
    pub project_id: String,
    pub risk_name: String,
    pub description: Option<String>,
    pub risk_category: Option<String>,
    pub severity: i32,
    pub occurrence: i32,
    pub detection: i32,
    pub mitigation_plan: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<NaiveDate>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateApqpRiskRequest {
    pub risk_name: Option<String>,
    pub description: Option<String>,
    pub risk_category: Option<String>,
    pub severity: Option<i32>,
    pub occurrence: Option<i32>,
    pub detection: Option<i32>,
    pub status: Option<String>,
    pub mitigation_plan: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<NaiveDate>,
}

#[derive(Debug, Serialize)]
pub struct ApqpProgressStatistics {
    pub total_phases: i64,
    pub completed_phases: i64,
    pub total_tasks: i64,
    pub completed_tasks: i64,
    pub overall_progress: f64,
    pub phase_progress: Vec<PhaseProgress>,
}

#[derive(Debug, Serialize)]
pub struct PhaseProgress {
    pub phase_id: String,
    pub phase_name: String,
    pub phase_code: String,
    pub total_tasks: i64,
    pub completed_tasks: i64,
    pub progress: f64,
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct StatusTransitionRequest {
    pub target_status: String,
    pub operator: String,
    pub comment: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct ApqpApproval {
    pub id: String,
    pub tenant_id: String,
    pub project_id: String,
    pub approval_type: String,
    pub status: Option<String>,
    pub applicant: Option<String>,
    pub approver: Option<String>,
    pub comment: Option<String>,
    pub submitted_at: Option<String>,
    pub approved_at: Option<String>,
    pub created_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateApqpApprovalRequest {
    pub project_id: String,
    pub approval_type: String,
    pub applicant: Option<String>,
    pub comment: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ProcessApprovalRequest {
    pub approver: String,
    pub approved: bool,
    pub comment: Option<String>,
}

pub async fn list_apqp_projects(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<ApqpProjectQuery>,
) -> Json<ApiResponse<Vec<ApqpProject>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let projects = match (query.status.as_ref(), query.product_name.as_ref()) {
        (Some(st), Some(pn)) => {
            sqlx::query_as::<_, ApqpProject>(
                r#"SELECT id, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT FROM qa_apqp_projects WHERE status = $1 AND product_name ILIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#,
            )
            .bind(st)
            .bind(format!("%{}%", pn))
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
        }
        (Some(st), None) => {
            sqlx::query_as::<_, ApqpProject>(
                r#"SELECT id, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT FROM qa_apqp_projects WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#,
            )
            .bind(st)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
        }
        (None, Some(pn)) => {
            sqlx::query_as::<_, ApqpProject>(
                r#"SELECT id, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT FROM qa_apqp_projects WHERE product_name ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#,
            )
            .bind(format!("%{}%", pn))
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
        }
        (None, None) => {
            sqlx::query_as::<_, ApqpProject>(
                r#"SELECT id, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT FROM qa_apqp_projects ORDER BY created_at DESC LIMIT $1 OFFSET $2"#,
            )
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
        }
    };

    match projects {
        Ok(data) => Json(ApiResponse::success(data, "获取APQP项目列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch APQP projects: {}", e);
            Json(ApiResponse::error(500, "获取APQP项目列表失败"))
        }
    }
}

pub async fn create_apqp_project(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateApqpProjectRequest>,
) -> Json<ApiResponse<ApqpProject>> {
    let project_no = format!(
        "APQP-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let product_id = req
        .product_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let start_dt = req
        .start_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());
    let target_dt = req
        .target_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());

    let project = sqlx::query_as::<_, ApqpProject>(
        r#"INSERT INTO qa_apqp_projects (project_no, project_name, product_id, product_name, customer, description, status, current_phase, leader, team, start_date, target_date, progress, risk_level, created_by) VALUES ($1, $2, $3, $4, $5, $6, 'planning', 'phase1', $7, $8, $9, $10, 0, 'low', $11) RETURNING id, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT"#,
    )
    .bind(project_no)
    .bind(req.project_name)
    .bind(product_id)
    .bind(req.product_name)
    .bind(req.customer)
    .bind(req.description)
    .bind(req.leader)
    .bind(req.team)
    .bind(start_dt)
    .bind(target_dt)
    .bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match project {
        Ok(data) => {
            let project_id = data.id.clone();
            tokio::spawn(async move {
                let pool = state.pool.clone();
                _ = init_default_phases(&pool, &project_id).await;
            });
            Json(ApiResponse::success(data, "APQP项目创建成功"))
        }
        Err(e) => {
            tracing::error!("Failed to create APQP project: {}", e);
            Json(ApiResponse::error(500, "APQP项目创建失败"))
        }
    }
}

async fn init_default_phases(pool: &sqlx::PgPool, project_id: &str) -> Result<(), sqlx::Error> {
    let phases = vec![
        ("phase1", "计划和确定项目", 1),
        ("phase2", "产品设计开发", 2),
        ("phase3", "过程设计开发", 3),
        ("phase4", "产品和过程确认", 4),
        ("phase5", "反馈评定和纠正措施", 5),
    ];

    let pid = Uuid::parse_str(project_id).unwrap_or_default();

    for (code, name, order) in phases {
        sqlx::query(
            r#"INSERT INTO qa_apqp_phases (project_id, phase_code, phase_name, status, sort_order) VALUES ($1, $2, $3, 'pending', $4)"#,
        )
        .bind(pid)
        .bind(code)
        .bind(name)
        .bind(order)
        .execute(pool)
        .await?;
    }

    Ok(())
}

pub async fn get_apqp_project(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<ApqpProject>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的APQP项目ID")),
    };

    let project = sqlx::query_as::<_, ApqpProject>(
        r#"SELECT id, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT FROM qa_apqp_projects WHERE id = $1"#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match project {
        Ok(data) => Json(ApiResponse::success(data, "获取APQP项目成功")),
        Err(e) => {
            tracing::error!("Failed to fetch APQP project: {}", e);
            Json(ApiResponse::error(500, "获取APQP项目失败"))
        }
    }
}

pub async fn update_apqp_project(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateApqpProjectRequest>,
) -> Json<ApiResponse<ApqpProject>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的APQP项目ID")),
    };

    let product_id = req
        .product_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let start_dt = req
        .start_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());
    let target_dt = req
        .target_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());
    let actual_end_dt = req
        .actual_end_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());

    let project = sqlx::query_as::<_, ApqpProject>(
        r#"UPDATE qa_apqp_projects SET project_name = COALESCE($2, project_name), product_id = COALESCE($3, product_id), product_name = COALESCE($4, product_name), customer = COALESCE($5, customer), description = COALESCE($6, description), status = COALESCE($7, status), current_phase = COALESCE($8, current_phase), leader = COALESCE($9, leader), team = COALESCE($10, team), start_date = COALESCE($11, start_date), target_date = COALESCE($12, target_date), actual_end_date = COALESCE($13, actual_end_date), progress = COALESCE($14, progress), risk_level = COALESCE($15, risk_level), updated_at = NOW() WHERE id = $1 RETURNING id, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT"#,
    )
    .bind(id)
    .bind(req.project_name)
    .bind(product_id)
    .bind(req.product_name)
    .bind(req.customer)
    .bind(req.description)
    .bind(req.status)
    .bind(req.current_phase)
    .bind(req.leader)
    .bind(req.team)
    .bind(start_dt)
    .bind(target_dt)
    .bind(actual_end_dt)
    .bind(req.progress)
    .bind(req.risk_level)
    .fetch_one(&state.pool)
    .await;

    match project {
        Ok(data) => Json(ApiResponse::success(data, "APQP项目更新成功")),
        Err(e) => {
            tracing::error!("Failed to update APQP project: {}", e);
            Json(ApiResponse::error(500, "APQP项目更新失败"))
        }
    }
}

pub async fn delete_apqp_project(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的APQP项目ID")),
    };

    let result = sqlx::query(r#"DELETE FROM qa_apqp_projects WHERE id = $1"#)
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "APQP项目删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete APQP project: {}", e);
            Json(ApiResponse::error(500, "APQP项目删除失败"))
        }
    }
}

pub async fn transition_project_status(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<StatusTransitionRequest>,
) -> Json<ApiResponse<ApqpProject>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的APQP项目ID")),
    };

    let valid_statuses = vec!["planning", "developing", "verifying", "released", "closed"];

    if !valid_statuses.contains(&req.target_status.as_str()) {
        return Json(ApiResponse::error(400, "无效的状态值"));
    }

    let project = sqlx::query_as::<_, ApqpProject>(
        r#"UPDATE qa_apqp_projects SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING id, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT"#,
    )
    .bind(id)
    .bind(&req.target_status)
    .fetch_one(&state.pool)
    .await;

    match project {
        Ok(data) => Json(ApiResponse::success(data, "状态流转成功")),
        Err(e) => {
            tracing::error!("Failed to transition project status: {}", e);
            Json(ApiResponse::error(500, "状态流转失败"))
        }
    }
}

pub async fn list_apqp_phases(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Json<ApiResponse<Vec<ApqpPhase>>> {
    let project_id = match query.get("project_id") {
        Some(pid) => match Uuid::parse_str(pid) {
            Ok(u) => Some(u),
            Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
        },
        None => None,
    };

    let phases = if let Some(pid) = project_id {
        sqlx::query_as::<_, ApqpPhase>(
            r#"SELECT id, project_id, phase_code, phase_name, description, status, start_date::TEXT, end_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, progress, sort_order, created_at::TEXT, updated_at::TEXT FROM qa_apqp_phases WHERE project_id = $1 ORDER BY sort_order ASC"#,
        )
        .bind(pid)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query_as::<_, ApqpPhase>(
            r#"SELECT id, project_id, phase_code, phase_name, description, status, start_date::TEXT, end_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, progress, sort_order, created_at::TEXT, updated_at::TEXT FROM qa_apqp_phases ORDER BY created_at DESC LIMIT 100"#,
        )
        .fetch_all(&state.pool)
        .await
    };

    match phases {
        Ok(data) => Json(ApiResponse::success(data, "获取APQP阶段列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch APQP phases: {}", e);
            Json(ApiResponse::error(500, "获取APQP阶段列表失败"))
        }
    }
}

pub async fn create_apqp_phase(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateApqpPhaseRequest>,
) -> Json<ApiResponse<ApqpPhase>> {
    let project_id = match Uuid::parse_str(&req.project_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };

    let start_dt = req
        .start_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());
    let end_dt = req
        .end_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());

    let phase = sqlx::query_as::<_, ApqpPhase>(
        r#"INSERT INTO qa_apqp_phases (project_id, phase_code, phase_name, description, status, start_date, end_date, sort_order) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7) RETURNING id, project_id, phase_code, phase_name, description, status, start_date::TEXT, end_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, progress, sort_order, created_at::TEXT, updated_at::TEXT"#,
    )
    .bind(project_id)
    .bind(req.phase_code)
    .bind(req.phase_name)
    .bind(req.description)
    .bind(start_dt)
    .bind(end_dt)
    .bind(req.sort_order.unwrap_or(0))
    .fetch_one(&state.pool)
    .await;

    match phase {
        Ok(data) => Json(ApiResponse::success(data, "APQP阶段创建成功")),
        Err(e) => {
            tracing::error!("Failed to create APQP phase: {}", e);
            Json(ApiResponse::error(500, "APQP阶段创建失败"))
        }
    }
}

pub async fn get_apqp_phase(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<ApqpPhase>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的阶段ID")),
    };

    let phase = sqlx::query_as::<_, ApqpPhase>(
        r#"SELECT id, project_id, phase_code, phase_name, description, status, start_date::TEXT, end_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, progress, sort_order, created_at::TEXT, updated_at::TEXT FROM qa_apqp_phases WHERE id = $1"#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match phase {
        Ok(data) => Json(ApiResponse::success(data, "获取APQP阶段成功")),
        Err(e) => {
            tracing::error!("Failed to fetch APQP phase: {}", e);
            Json(ApiResponse::error(500, "获取APQP阶段失败"))
        }
    }
}

pub async fn update_apqp_phase(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateApqpPhaseRequest>,
) -> Json<ApiResponse<ApqpPhase>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的阶段ID")),
    };

    let start_dt = req
        .start_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());
    let end_dt = req
        .end_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());
    let actual_start_dt = req
        .actual_start_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());
    let actual_end_dt = req
        .actual_end_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());

    let phase = sqlx::query_as::<_, ApqpPhase>(
        r#"UPDATE qa_apqp_phases SET phase_name = COALESCE($2, phase_name), description = COALESCE($3, description), status = COALESCE($4, status), start_date = COALESCE($5, start_date), end_date = COALESCE($6, end_date), actual_start_date = COALESCE($7, actual_start_date), actual_end_date = COALESCE($8, actual_end_date), progress = COALESCE($9, progress), sort_order = COALESCE($10, sort_order), updated_at = NOW() WHERE id = $1 RETURNING id, project_id, phase_code, phase_name, description, status, start_date::TEXT, end_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, progress, sort_order, created_at::TEXT, updated_at::TEXT"#,
    )
    .bind(id)
    .bind(req.phase_name)
    .bind(req.description)
    .bind(req.status)
    .bind(start_dt)
    .bind(end_dt)
    .bind(actual_start_dt)
    .bind(actual_end_dt)
    .bind(req.progress)
    .bind(req.sort_order)
    .fetch_one(&state.pool)
    .await;

    match phase {
        Ok(data) => Json(ApiResponse::success(data, "APQP阶段更新成功")),
        Err(e) => {
            tracing::error!("Failed to update APQP phase: {}", e);
            Json(ApiResponse::error(500, "APQP阶段更新失败"))
        }
    }
}

pub async fn delete_apqp_phase(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的阶段ID")),
    };

    let result = sqlx::query(r#"DELETE FROM qa_apqp_phases WHERE id = $1"#)
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "APQP阶段删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete APQP phase: {}", e);
            Json(ApiResponse::error(500, "APQP阶段删除失败"))
        }
    }
}

pub async fn list_apqp_tasks(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<ApqpTaskQuery>,
) -> Json<ApiResponse<Vec<ApqpTask>>> {
    let project_id = query
        .project_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let phase_id = query
        .phase_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let mut sql = String::from(
        "SELECT id, project_id, phase_id, task_name, description, task_type, deliverable, status, assignee, due_date::TEXT, completed_at::TEXT, sort_order, created_at::TEXT, updated_at::TEXT FROM qa_apqp_tasks WHERE 1=1",
    );
    let mut params: Vec<String> = Vec::new();

    if project_id.is_some() {
        sql.push_str(" AND project_id = $");
        params.push(project_id.unwrap_or_default().to_string());
        sql.push_str(&params.len().to_string());
    }
    if phase_id.is_some() {
        sql.push_str(" AND phase_id = $");
        params.push(phase_id.unwrap_or_default().to_string());
        sql.push_str(&params.len().to_string());
    }
    if let Some(st) = &query.status {
        sql.push_str(" AND status = $");
        params.push(st.clone());
        sql.push_str(&params.len().to_string());
    }
    if let Some(assignee) = &query.assignee {
        sql.push_str(" AND assignee = $");
        params.push(assignee.clone());
        sql.push_str(&params.len().to_string());
    }

    sql.push_str(" ORDER BY sort_order ASC, created_at DESC");

    let mut query_builder = sqlx::query_as::<_, ApqpTask>(&sql);
    for param in &params {
        query_builder = query_builder.bind(param);
    }

    let tasks = query_builder.fetch_all(&state.pool).await;

    match tasks {
        Ok(data) => Json(ApiResponse::success(data, "获取APQP任务列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch APQP tasks: {}", e);
            Json(ApiResponse::error(500, "获取APQP任务列表失败"))
        }
    }
}

pub async fn create_apqp_task(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateApqpTaskRequest>,
) -> Json<ApiResponse<ApqpTask>> {
    let project_id = match Uuid::parse_str(&req.project_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };
    let phase_id = match Uuid::parse_str(&req.phase_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的阶段ID")),
    };

    let due_dt = req
        .due_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());

    let task = sqlx::query_as::<_, ApqpTask>(
        r#"INSERT INTO qa_apqp_tasks (project_id, phase_id, task_name, description, task_type, deliverable, status, assignee, due_date, sort_order) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9) RETURNING id, project_id, phase_id, task_name, description, task_type, deliverable, status, assignee, due_date::TEXT, completed_at::TEXT, sort_order, created_at::TEXT, updated_at::TEXT"#,
    )
    .bind(project_id)
    .bind(phase_id)
    .bind(req.task_name)
    .bind(req.description)
    .bind(req.task_type)
    .bind(req.deliverable)
    .bind(req.assignee)
    .bind(due_dt)
    .bind(req.sort_order.unwrap_or(0))
    .fetch_one(&state.pool)
    .await;

    match task {
        Ok(data) => Json(ApiResponse::success(data, "APQP任务创建成功")),
        Err(e) => {
            tracing::error!("Failed to create APQP task: {}", e);
            Json(ApiResponse::error(500, "APQP任务创建失败"))
        }
    }
}

pub async fn get_apqp_task(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<ApqpTask>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let task = sqlx::query_as::<_, ApqpTask>(
        r#"SELECT id, project_id, phase_id, task_name, description, task_type, deliverable, status, assignee, due_date::TEXT, completed_at::TEXT, sort_order, created_at::TEXT, updated_at::TEXT FROM qa_apqp_tasks WHERE id = $1"#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match task {
        Ok(data) => Json(ApiResponse::success(data, "获取APQP任务成功")),
        Err(e) => {
            tracing::error!("Failed to fetch APQP task: {}", e);
            Json(ApiResponse::error(500, "获取APQP任务失败"))
        }
    }
}

pub async fn update_apqp_task(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateApqpTaskRequest>,
) -> Json<ApiResponse<ApqpTask>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let due_dt = req
        .due_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());
    let completed_dt = req
        .completed_at
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());

    let task = sqlx::query_as::<_, ApqpTask>(
        r#"UPDATE qa_apqp_tasks SET task_name = COALESCE($2, task_name), description = COALESCE($3, description), task_type = COALESCE($4, task_type), deliverable = COALESCE($5, deliverable), status = COALESCE($6, status), assignee = COALESCE($7, assignee), due_date = COALESCE($8, due_date), completed_at = COALESCE($9, completed_at), sort_order = COALESCE($10, sort_order), updated_at = NOW() WHERE id = $1 RETURNING id, project_id, phase_id, task_name, description, task_type, deliverable, status, assignee, due_date::TEXT, completed_at::TEXT, sort_order, created_at::TEXT, updated_at::TEXT"#,
    )
    .bind(id)
    .bind(req.task_name)
    .bind(req.description)
    .bind(req.task_type)
    .bind(req.deliverable)
    .bind(req.status)
    .bind(req.assignee)
    .bind(due_dt)
    .bind(completed_dt)
    .bind(req.sort_order)
    .fetch_one(&state.pool)
    .await;

    match task {
        Ok(data) => Json(ApiResponse::success(data, "APQP任务更新成功")),
        Err(e) => {
            tracing::error!("Failed to update APQP task: {}", e);
            Json(ApiResponse::error(500, "APQP任务更新失败"))
        }
    }
}

pub async fn delete_apqp_task(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let result = sqlx::query(r#"DELETE FROM qa_apqp_tasks WHERE id = $1"#)
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "APQP任务删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete APQP task: {}", e);
            Json(ApiResponse::error(500, "APQP任务删除失败"))
        }
    }
}

pub async fn list_apqp_risks(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<ApqpRiskQuery>,
) -> Json<ApiResponse<Vec<ApqpRisk>>> {
    let project_id = query
        .project_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let mut sql = String::from(
        "SELECT id, project_id, risk_name, description, risk_category, severity, occurrence, detection, rpn, status, mitigation_plan, responsible, target_date::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_apqp_risks WHERE 1=1",
    );
    let mut params: Vec<serde_json::Value> = Vec::new();

    if let Some(pid) = project_id {
        sql.push_str(" AND project_id = $");
        params.push(serde_json::json!(pid));
        sql.push_str(&params.len().to_string());
    }
    if let Some(st) = &query.status {
        sql.push_str(" AND status = $");
        params.push(serde_json::json!(st));
        sql.push_str(&params.len().to_string());
    }
    if let Some(min_rpn) = query.min_rpn {
        sql.push_str(" AND rpn >= $");
        params.push(serde_json::json!(min_rpn as i32));
        sql.push_str(&params.len().to_string());
    }

    sql.push_str(" ORDER BY rpn DESC, created_at DESC");

    let mut query_builder = sqlx::query_as::<_, ApqpRisk>(&sql);
    for param in &params {
        if param.is_string() {
            query_builder = query_builder.bind(param.as_str());
        } else if param.is_number() {
            let num_val = param.as_i64().unwrap_or(0) as i32;
            query_builder = query_builder.bind(num_val);
        }
    }

    let risks = query_builder.fetch_all(&state.pool).await;

    match risks {
        Ok(data) => Json(ApiResponse::success(data, "获取APQP风险列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch APQP risks: {}", e);
            Json(ApiResponse::error(500, "获取APQP风险列表失败"))
        }
    }
}

pub async fn create_apqp_risk(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateApqpRiskRequest>,
) -> Json<ApiResponse<ApqpRisk>> {
    let project_id = match Uuid::parse_str(&req.project_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };

    let rpn = req.severity * req.occurrence * req.detection;
    let target_dt = req
        .target_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());

    let risk = sqlx::query_as::<_, ApqpRisk>(
        r#"INSERT INTO qa_apqp_risks (project_id, risk_name, description, risk_category, severity, occurrence, detection, rpn, status, mitigation_plan, responsible, target_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, $10, $11) RETURNING id, project_id, risk_name, description, risk_category, severity, occurrence, detection, rpn, status, mitigation_plan, responsible, target_date::TEXT, created_at::TEXT, updated_at::TEXT"#,
    )
    .bind(project_id)
    .bind(req.risk_name)
    .bind(req.description)
    .bind(req.risk_category)
    .bind(req.severity)
    .bind(req.occurrence)
    .bind(req.detection)
    .bind(rpn)
    .bind(req.mitigation_plan)
    .bind(req.responsible)
    .bind(target_dt)
    .fetch_one(&state.pool)
    .await;

    match risk {
        Ok(data) => Json(ApiResponse::success(data, "APQP风险创建成功")),
        Err(e) => {
            tracing::error!("Failed to create APQP risk: {}", e);
            Json(ApiResponse::error(500, "APQP风险创建失败"))
        }
    }
}

pub async fn get_apqp_risk(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<ApqpRisk>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的风险ID")),
    };

    let risk = sqlx::query_as::<_, ApqpRisk>(
        r#"SELECT id, project_id, risk_name, description, risk_category, severity, occurrence, detection, rpn, status, mitigation_plan, responsible, target_date::TEXT, created_at::TEXT, updated_at::TEXT FROM qa_apqp_risks WHERE id = $1"#,
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match risk {
        Ok(data) => Json(ApiResponse::success(data, "获取APQP风险成功")),
        Err(e) => {
            tracing::error!("Failed to fetch APQP risk: {}", e);
            Json(ApiResponse::error(500, "获取APQP风险失败"))
        }
    }
}

pub async fn update_apqp_risk(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateApqpRiskRequest>,
) -> Json<ApiResponse<ApqpRisk>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的风险ID")),
    };

    let target_dt = req
        .target_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());

    let risk = sqlx::query_as::<_, ApqpRisk>(
        r#"UPDATE qa_apqp_risks SET risk_name = COALESCE($2, risk_name), description = COALESCE($3, description), risk_category = COALESCE($4, risk_category), severity = COALESCE($5, severity), occurrence = COALESCE($6, occurrence), detection = COALESCE($7, detection), rpn = COALESCE($5, severity) * COALESCE($6, occurrence) * COALESCE($7, detection), status = COALESCE($8, status), mitigation_plan = COALESCE($9, mitigation_plan), responsible = COALESCE($10, responsible), target_date = COALESCE($11, target_date), updated_at = NOW() WHERE id = $1 RETURNING id, project_id, risk_name, description, risk_category, severity, occurrence, detection, rpn, status, mitigation_plan, responsible, target_date::TEXT, created_at::TEXT, updated_at::TEXT"#,
    )
    .bind(id)
    .bind(req.risk_name)
    .bind(req.description)
    .bind(req.risk_category)
    .bind(req.severity)
    .bind(req.occurrence)
    .bind(req.detection)
    .bind(req.status)
    .bind(req.mitigation_plan)
    .bind(req.responsible)
    .bind(target_dt)
    .fetch_one(&state.pool)
    .await;

    match risk {
        Ok(data) => Json(ApiResponse::success(data, "APQP风险更新成功")),
        Err(e) => {
            tracing::error!("Failed to update APQP risk: {}", e);
            Json(ApiResponse::error(500, "APQP风险更新失败"))
        }
    }
}

pub async fn delete_apqp_risk(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的风险ID")),
    };

    let result = sqlx::query(r#"DELETE FROM qa_apqp_risks WHERE id = $1"#)
        .bind(id)
        .execute(&state.pool)
        .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "APQP风险删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete APQP risk: {}", e);
            Json(ApiResponse::error(500, "APQP风险删除失败"))
        }
    }
}

pub async fn get_apqp_progress(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<ApqpProgressStatistics>> {
    let project_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };

    let total_phases: Option<i64> = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM qa_apqp_phases WHERE project_id = $1"#,
    )
    .bind(project_id)
    .fetch_one(&state.pool)
    .await
    .ok();
    let total_phases = total_phases.unwrap_or(0);

    let completed_phases: Option<i64> = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM qa_apqp_phases WHERE project_id = $1 AND status = 'completed'"#,
    )
    .bind(project_id)
    .fetch_one(&state.pool)
    .await
    .ok();
    let completed_phases = completed_phases.unwrap_or(0);

    let total_tasks: Option<i64> =
        sqlx::query_scalar::<_, i64>(r#"SELECT COUNT(*) FROM qa_apqp_tasks WHERE project_id = $1"#)
            .bind(project_id)
            .fetch_one(&state.pool)
            .await
            .ok();
    let total_tasks = total_tasks.unwrap_or(0);

    let completed_tasks: Option<i64> = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM qa_apqp_tasks WHERE project_id = $1 AND status = 'completed'"#,
    )
    .bind(project_id)
    .fetch_one(&state.pool)
    .await
    .ok();
    let completed_tasks = completed_tasks.unwrap_or(0);

    let overall_progress = if total_tasks > 0 {
        (completed_tasks as f64 / total_tasks as f64) * 100.0
    } else {
        0.0
    };

    let phases_result = sqlx::query_as::<_, (String, String, String, String)>(
        r#"SELECT id, phase_name, phase_code, COALESCE(status, 'pending') as status FROM qa_apqp_phases WHERE project_id = $1 ORDER BY sort_order ASC"#,
    )
    .bind(project_id)
    .fetch_all(&state.pool)
    .await;

    let mut phase_progress = Vec::new();
    if let Ok(phases) = phases_result {
        for (phase_id, phase_name, phase_code, status) in phases {
            let pid = Uuid::parse_str(&phase_id).unwrap_or_default();
            let phase_total: Option<i64> = sqlx::query_scalar::<_, i64>(
                r#"SELECT COUNT(*) FROM qa_apqp_tasks WHERE phase_id = $1"#,
            )
            .bind(pid)
            .fetch_one(&state.pool)
            .await
            .ok();
            let phase_total_tasks = phase_total.unwrap_or(0);

            let phase_completed: Option<i64> = sqlx::query_scalar::<_, i64>(
                r#"SELECT COUNT(*) FROM qa_apqp_tasks WHERE phase_id = $1 AND status = 'completed'"#,
            )
            .bind(pid)
            .fetch_one(&state.pool)
            .await
            .ok();
            let phase_completed_tasks = phase_completed.unwrap_or(0);

            let progress = if phase_total_tasks > 0 {
                (phase_completed_tasks as f64 / phase_total_tasks as f64) * 100.0
            } else {
                0.0
            };

            phase_progress.push(PhaseProgress {
                phase_id: phase_id.clone(),
                phase_name,
                phase_code,
                total_tasks: phase_total_tasks,
                completed_tasks: phase_completed_tasks,
                progress,
                status,
            });
        }
    }

    let stats = ApqpProgressStatistics {
        total_phases,
        completed_phases,
        total_tasks,
        completed_tasks,
        overall_progress,
        phase_progress,
    };

    Json(ApiResponse::success(stats, "获取APQP进度统计成功"))
}

pub async fn list_apqp_approvals(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> Json<ApiResponse<Vec<ApqpApproval>>> {
    let project_id = query
        .get("project_id")
        .and_then(|s| Uuid::parse_str(s).ok());

    let approvals = if let Some(pid) = project_id {
        sqlx::query_as::<_, ApqpApproval>(
            r#"SELECT id, project_id, approval_type, status, applicant, approver, comment, submitted_at::TEXT, approved_at::TEXT, created_at::TEXT FROM qa_apqp_approvals WHERE project_id = $1 ORDER BY created_at DESC"#,
        )
        .bind(pid)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query_as::<_, ApqpApproval>(
            r#"SELECT id, project_id, approval_type, status, applicant, approver, comment, submitted_at::TEXT, approved_at::TEXT, created_at::TEXT FROM qa_apqp_approvals ORDER BY created_at DESC LIMIT 100"#,
        )
        .fetch_all(&state.pool)
        .await
    };

    match approvals {
        Ok(data) => Json(ApiResponse::success(data, "获取APQP审批列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch APQP approvals: {}", e);
            Json(ApiResponse::error(500, "获取APQP审批列表失败"))
        }
    }
}

pub async fn create_apqp_approval(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateApqpApprovalRequest>,
) -> Json<ApiResponse<ApqpApproval>> {
    let project_id = match Uuid::parse_str(&req.project_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的项目ID")),
    };

    let approval = sqlx::query_as::<_, ApqpApproval>(
        r#"INSERT INTO qa_apqp_approvals (project_id, approval_type, status, applicant, comment) VALUES ($1, $2, 'pending', $3, $4) RETURNING id, project_id, approval_type, status, applicant, approver, comment, submitted_at::TEXT, approved_at::TEXT, created_at::TEXT"#,
    )
    .bind(project_id)
    .bind(req.approval_type)
    .bind(req.applicant)
    .bind(req.comment)
    .fetch_one(&state.pool)
    .await;

    match approval {
        Ok(data) => Json(ApiResponse::success(data, "APQP审批创建成功")),
        Err(e) => {
            tracing::error!("Failed to create APQP approval: {}", e);
            Json(ApiResponse::error(500, "APQP审批创建失败"))
        }
    }
}

pub async fn process_apqp_approval(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<ProcessApprovalRequest>,
) -> Json<ApiResponse<ApqpApproval>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的审批ID")),
    };

    let status = if req.approved { "approved" } else { "rejected" };

    let approval = sqlx::query_as::<_, ApqpApproval>(
        r#"UPDATE qa_apqp_approvals SET status = $2, approver = $3, comment = COALESCE($4, comment), approved_at = NOW() WHERE id = $1 RETURNING id, project_id, approval_type, status, applicant, approver, comment, submitted_at::TEXT, approved_at::TEXT, created_at::TEXT"#,
    )
    .bind(id)
    .bind(status)
    .bind(req.approver)
    .bind(req.comment)
    .fetch_one(&state.pool)
    .await;

    match approval {
        Ok(data) => Json(ApiResponse::success(data, "APQP审批处理成功")),
        Err(e) => {
            tracing::error!("Failed to process APQP approval: {}", e);
            Json(ApiResponse::error(500, "APQP审批处理失败"))
        }
    }
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/api/qms/apqp/projects", get(list_apqp_projects))
        .route("/api/qms/apqp/projects", post(create_apqp_project))
        .route("/api/qms/apqp/projects/{id}", get(get_apqp_project))
        .route("/api/qms/apqp/projects/{id}", put(update_apqp_project))
        .route("/api/qms/apqp/projects/{id}", delete(delete_apqp_project))
        .route(
            "/api/qms/apqp/projects/{id}/transition",
            post(transition_project_status),
        )
        .route(
            "/api/qms/apqp/projects/{id}/progress",
            get(get_apqp_progress),
        )
        .route("/api/qms/apqp/phases", get(list_apqp_phases))
        .route("/api/qms/apqp/phases", post(create_apqp_phase))
        .route("/api/qms/apqp/phases/{id}", get(get_apqp_phase))
        .route("/api/qms/apqp/phases/{id}", put(update_apqp_phase))
        .route("/api/qms/apqp/phases/{id}", delete(delete_apqp_phase))
        .route("/api/qms/apqp/tasks", get(list_apqp_tasks))
        .route("/api/qms/apqp/tasks", post(create_apqp_task))
        .route("/api/qms/apqp/tasks/{id}", get(get_apqp_task))
        .route("/api/qms/apqp/tasks/{id}", put(update_apqp_task))
        .route("/api/qms/apqp/tasks/{id}", delete(delete_apqp_task))
        .route("/api/qms/apqp/risks", get(list_apqp_risks))
        .route("/api/qms/apqp/risks", post(create_apqp_risk))
        .route("/api/qms/apqp/risks/{id}", get(get_apqp_risk))
        .route("/api/qms/apqp/risks/{id}", put(update_apqp_risk))
        .route("/api/qms/apqp/risks/{id}", delete(delete_apqp_risk))
        .route("/api/qms/apqp/approvals", get(list_apqp_approvals))
        .route("/api/qms/apqp/approvals", post(create_apqp_approval))
        .route(
            "/api/qms/apqp/approvals/{id}/process",
            post(process_apqp_approval),
        )
}
