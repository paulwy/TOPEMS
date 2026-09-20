//! APQP (Advanced Product Quality Planning) handlers

use crate::models::apqp::*;
use crate::shared::fsm::{apqp_can_transition, apqp_requires_approval};
use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

const STATUS_IN_PRODUCTION: &str = "in_production";
const STATUS_COMPLETED: &str = "completed";
const STATUS_CANCELLED: &str = "cancelled";

const APQP_SELECT_COLS: &str = r#"id, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT"#;

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
                only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_apqp_projects WHERE deleted_at IS NULL AND status = $1 AND product_name ILIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#),
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
                only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_apqp_projects WHERE deleted_at IS NULL AND status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#),
            )
            .bind(st)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
        }
        (None, Some(pn)) => {
            sqlx::query_as::<_, ApqpProject>(
                only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_apqp_projects WHERE deleted_at IS NULL AND product_name ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#),
            )
            .bind(format!("%{}%", pn))
            .bind(page_size)
            .bind(offset)
            .fetch_all(&state.pool)
            .await
        }
        (None, None) => {
            sqlx::query_as::<_, ApqpProject>(
                only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_apqp_projects ORDER BY created_at DESC LIMIT $1 OFFSET $2"#),
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
        only_own_schema_query!("qms", r#"INSERT INTO qms.qa_apqp_projects (project_no, project_name, product_id, product_name, customer, description, status, current_phase, leader, team, start_date, target_date, progress, risk_level, created_by, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, 'planning', 'phase1', $7, $8, $9, $10, 0, 'low', $11, $12) RETURNING id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT"#),
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
    .bind(Uuid::nil())
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
            only_own_schema_query!("qms", r#"INSERT INTO qms.qa_apqp_phases (project_id, phase_code, phase_name, status, sort_order, tenant_id) VALUES ($1, $2, $3, 'pending', $4, $5)"#),
        )
        .bind(pid)
        .bind(code)
        .bind(name)
        .bind(order)
        .bind(Uuid::nil())
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
        only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_apqp_projects WHERE deleted_at IS NULL AND id = $1"#),
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match project {
        Ok(data) => Json(ApiResponse::success(data, "获取APQP项目成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "记录不存在")),

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
        only_own_schema_query!("qms", r#"UPDATE qms.qa_apqp_projects SET project_name = COALESCE($2, project_name), product_id = COALESCE($3, product_id), product_name = COALESCE($4, product_name), customer = COALESCE($5, customer), description = COALESCE($6, description), status = COALESCE($7, status), current_phase = COALESCE($8, current_phase), leader = COALESCE($9, leader), team = COALESCE($10, team), start_date = COALESCE($11, start_date), target_date = COALESCE($12, target_date), actual_end_date = COALESCE($13, actual_end_date), progress = COALESCE($14, progress), risk_level = COALESCE($15, risk_level), updated_at = NOW() WHERE id = $1 RETURNING id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT"#),
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

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"UPDATE qms.qa_apqp_projects SET deleted_at = NOW() WHERE id = $1"#
    ))
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

    let valid_statuses = ["planning", "developing", "verifying", "released", "closed"];

    if !valid_statuses.contains(&req.target_status.as_str()) {
        return Json(ApiResponse::error(400, "无效的状态值"));
    }

    let project = sqlx::query_as::<_, ApqpProject>(
        only_own_schema_query!("qms", r#"UPDATE qms.qa_apqp_projects SET status = $2, updated_at = NOW() WHERE id = $1 RETURNING id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date::TEXT, target_date::TEXT, actual_end_date::TEXT, progress, risk_level, created_by, created_at::TEXT, updated_at::TEXT"#),
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
            only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_code, phase_name, description, status, start_date::TEXT, end_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, progress, sort_order, created_at::TEXT, updated_at::TEXT FROM qms.qa_apqp_phases WHERE project_id = $1 ORDER BY sort_order ASC"#),
        )
        .bind(pid)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query_as::<_, ApqpPhase>(
            only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_code, phase_name, description, status, start_date::TEXT, end_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, progress, sort_order, created_at::TEXT, updated_at::TEXT FROM qms.qa_apqp_phases ORDER BY created_at DESC LIMIT 100"#),
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
        only_own_schema_query!("qms", r#"INSERT INTO qms.qa_apqp_phases (project_id, phase_code, phase_name, description, status, start_date, end_date, sort_order, tenant_id) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8) RETURNING id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_code, phase_name, description, status, start_date::TEXT, end_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, progress, sort_order, created_at::TEXT, updated_at::TEXT"#),
    )
    .bind(project_id)
    .bind(req.phase_code)
    .bind(req.phase_name)
    .bind(req.description)
    .bind(start_dt)
    .bind(end_dt)
    .bind(req.sort_order.unwrap_or(0))
    .bind(Uuid::nil())
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
        only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_code, phase_name, description, status, start_date::TEXT, end_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, progress, sort_order, created_at::TEXT, updated_at::TEXT FROM qms.qa_apqp_phases WHERE id = $1"#),
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match phase {
        Ok(data) => Json(ApiResponse::success(data, "获取APQP阶段成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "记录不存在")),

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
        only_own_schema_query!("qms", r#"UPDATE qms.qa_apqp_phases SET phase_name = COALESCE($2, phase_name), description = COALESCE($3, description), status = COALESCE($4, status), start_date = COALESCE($5, start_date), end_date = COALESCE($6, end_date), actual_start_date = COALESCE($7, actual_start_date), actual_end_date = COALESCE($8, actual_end_date), progress = COALESCE($9, progress), sort_order = COALESCE($10, sort_order), updated_at = NOW() WHERE id = $1 RETURNING id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_code, phase_name, description, status, start_date::TEXT, end_date::TEXT, actual_start_date::TEXT, actual_end_date::TEXT, progress, sort_order, created_at::TEXT, updated_at::TEXT"#),
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

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"DELETE FROM qms.qa_apqp_phases WHERE id = $1"#
    ))
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
        "SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_id::TEXT, task_name, description, task_type, deliverable, status, assignee, due_date::TEXT, completed_at::TEXT, sort_order, created_at::TEXT, updated_at::TEXT FROM qms.qa_apqp_tasks WHERE 1=1",
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
        only_own_schema_query!("qms", r#"INSERT INTO qms.qa_apqp_tasks (project_id, phase_id, task_name, description, task_type, deliverable, status, assignee, due_date, sort_order, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10) RETURNING id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_id::TEXT, task_name, description, task_type, deliverable, status, assignee, due_date::TEXT, completed_at::TEXT, sort_order, created_at::TEXT, updated_at::TEXT"#),
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
    .bind(Uuid::nil())
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
        only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_id::TEXT, task_name, description, task_type, deliverable, status, assignee, due_date::TEXT, completed_at::TEXT, sort_order, created_at::TEXT, updated_at::TEXT FROM qms.qa_apqp_tasks WHERE id = $1"#),
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match task {
        Ok(data) => Json(ApiResponse::success(data, "获取APQP任务成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "记录不存在")),

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
        only_own_schema_query!("qms", r#"UPDATE qms.qa_apqp_tasks SET task_name = COALESCE($2, task_name), description = COALESCE($3, description), task_type = COALESCE($4, task_type), deliverable = COALESCE($5, deliverable), status = COALESCE($6, status), assignee = COALESCE($7, assignee), due_date = COALESCE($8, due_date), completed_at = COALESCE($9, completed_at), sort_order = COALESCE($10, sort_order), updated_at = NOW() WHERE id = $1 RETURNING id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_id::TEXT, task_name, description, task_type, deliverable, status, assignee, due_date::TEXT, completed_at::TEXT, sort_order, created_at::TEXT, updated_at::TEXT"#),
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

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"DELETE FROM qms.qa_apqp_tasks WHERE id = $1"#
    ))
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
        "SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, risk_name, description, risk_category, severity, occurrence, detection, rpn, status, mitigation_plan, responsible, target_date::TEXT, created_at::TEXT, updated_at::TEXT FROM qms.qa_apqp_risks WHERE 1=1",
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
        only_own_schema_query!("qms", r#"INSERT INTO qms.qa_apqp_risks (project_id, risk_name, description, risk_category, severity, occurrence, detection, rpn, status, mitigation_plan, responsible, target_date, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, $10, $11, $12) RETURNING id::TEXT, tenant_id::TEXT, project_id::TEXT, risk_name, description, risk_category, severity, occurrence, detection, rpn, status, mitigation_plan, responsible, target_date::TEXT, created_at::TEXT, updated_at::TEXT"#),
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
    .bind(Uuid::nil())
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
        only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, risk_name, description, risk_category, severity, occurrence, detection, rpn, status, mitigation_plan, responsible, target_date::TEXT, created_at::TEXT, updated_at::TEXT FROM qms.qa_apqp_risks WHERE id = $1"#),
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match risk {
        Ok(data) => Json(ApiResponse::success(data, "获取APQP风险成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "记录不存在")),

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
        only_own_schema_query!("qms", r#"UPDATE qms.qa_apqp_risks SET risk_name = COALESCE($2, risk_name), description = COALESCE($3, description), risk_category = COALESCE($4, risk_category), severity = COALESCE($5, severity), occurrence = COALESCE($6, occurrence), detection = COALESCE($7, detection), rpn = COALESCE($5, severity) * COALESCE($6, occurrence) * COALESCE($7, detection), status = COALESCE($8, status), mitigation_plan = COALESCE($9, mitigation_plan), responsible = COALESCE($10, responsible), target_date = COALESCE($11, target_date), updated_at = NOW() WHERE id = $1 RETURNING id::TEXT, tenant_id::TEXT, project_id::TEXT, risk_name, description, risk_category, severity, occurrence, detection, rpn, status, mitigation_plan, responsible, target_date::TEXT, created_at::TEXT, updated_at::TEXT"#),
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
    .bind(Uuid::nil())
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

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"DELETE FROM qms.qa_apqp_risks WHERE id = $1"#
    ))
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

    let total_phases: Option<i64> = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        r#"SELECT COUNT(*) FROM qms.qa_apqp_phases WHERE project_id = $1"#
    ))
    .bind(project_id)
    .fetch_one(&state.pool)
    .await
    .ok();
    let total_phases = total_phases.unwrap_or(0);

    let completed_phases: Option<i64> = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        r#"SELECT COUNT(*) FROM qms.qa_apqp_phases WHERE project_id = $1 AND status = 'completed'"#
    ))
    .bind(project_id)
    .fetch_one(&state.pool)
    .await
    .ok();
    let completed_phases = completed_phases.unwrap_or(0);

    let total_tasks: Option<i64> = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        r#"SELECT COUNT(*) FROM qms.qa_apqp_tasks WHERE project_id = $1"#
    ))
    .bind(project_id)
    .fetch_one(&state.pool)
    .await
    .ok();
    let total_tasks = total_tasks.unwrap_or(0);

    let completed_tasks: Option<i64> = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        r#"SELECT COUNT(*) FROM qms.qa_apqp_tasks WHERE project_id = $1 AND status = 'completed'"#
    ))
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
        only_own_schema_query!("qms", r#"SELECT id, phase_name, phase_code, COALESCE(status, 'pending') as status FROM qms.qa_apqp_phases WHERE project_id = $1 ORDER BY sort_order ASC"#),
    )
    .bind(project_id)
    .fetch_all(&state.pool)
    .await;

    let mut phase_progress = Vec::new();
    if let Ok(phases) = phases_result {
        for (phase_id, phase_name, phase_code, status) in phases {
            let pid = Uuid::parse_str(&phase_id).unwrap_or_default();
            let phase_total: Option<i64> = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
                "qms",
                r#"SELECT COUNT(*) FROM qms.qa_apqp_tasks WHERE phase_id = $1"#
            ))
            .bind(pid)
            .fetch_one(&state.pool)
            .await
            .ok();
            let phase_total_tasks = phase_total.unwrap_or(0);

            let phase_completed: Option<i64> = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("qms", r#"SELECT COUNT(*) FROM qms.qa_apqp_tasks WHERE phase_id = $1 AND status = 'completed'"#),
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
            only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, approval_type, status, applicant, approver, comment, submitted_at::TEXT, approved_at::TEXT, created_at::TEXT FROM qms.qa_apqp_approvals WHERE project_id = $1 ORDER BY created_at DESC"#),
        )
        .bind(pid)
        .fetch_all(&state.pool)
        .await
    } else {
        sqlx::query_as::<_, ApqpApproval>(
            only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, approval_type, status, applicant, approver, comment, submitted_at::TEXT, approved_at::TEXT, created_at::TEXT FROM qms.qa_apqp_approvals ORDER BY created_at DESC LIMIT 100"#),
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
        only_own_schema_query!("qms", r#"INSERT INTO qms.qa_apqp_approvals (project_id, approval_type, status, applicant, comment, tenant_id) VALUES ($1, $2, 'pending', $3, $4, $5) RETURNING id::TEXT, tenant_id::TEXT, project_id::TEXT, approval_type, status, applicant, approver, comment, submitted_at::TEXT, approved_at::TEXT, created_at::TEXT"#),
    )
    .bind(project_id)
    .bind(req.approval_type)
    .bind(req.applicant)
    .bind(req.comment)
    .bind(Uuid::nil())
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
        only_own_schema_query!("qms", r#"UPDATE qms.qa_apqp_approvals SET status = $2, approver = $3, comment = COALESCE($4, comment), approved_at = NOW() WHERE id = $1 RETURNING id::TEXT, tenant_id::TEXT, project_id::TEXT, approval_type, status, applicant, approver, comment, submitted_at::TEXT, approved_at::TEXT, created_at::TEXT"#),
    )
    .bind(id)
    .bind(status)
    .bind(req.approver)
    .bind(req.comment)
    .bind(Uuid::nil())
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

/// APV-4 审批请求体
#[derive(Debug, serde::Deserialize)]
pub struct ApqpApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
}

/// APV-4: 审批通过 (in_pilot → in_production, requires_approval)
pub async fn approve_apqp(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<ApqpApprovalRequest>,
) -> Json<ApiResponse<ApqpProject>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的APQP项目ID")),
    };

    let current = sqlx::query(only_own_schema_query!(
        "qms",
        "SELECT status FROM qms.qa_apqp_projects WHERE deleted_at IS NULL AND id = $1"
    ))
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if apqp_requires_approval(&current_status, STATUS_IN_PRODUCTION)
                && !crate::shared::permission::has_qms_permission(&claims, "apqp.approve")
            {
                return Json(ApiResponse::error(403, "无审批权限"));
            }
            if apqp_can_transition(&current_status, STATUS_IN_PRODUCTION).is_err() {
                return Json(ApiResponse::error(400, "当前状态不允许审批通过"));
            }
            let project = sqlx::query_as::<_, ApqpProject>(
                format!("UPDATE qms.qa_apqp_projects SET status = '{}', updated_at = NOW() WHERE id = $1 RETURNING {}", STATUS_IN_PRODUCTION, APQP_SELECT_COLS).as_str()
            ).bind(id).fetch_one(&state.pool).await;
            match project {
                Ok(data) => {
                    let tenant_str = claims.tenant_id.clone().unwrap_or_default();
                    let _ = crate::models::audit_log::log_approval_event(
                        &state.pool,
                        &tenant_str,
                        "apqp",
                        &id.to_string(),
                        "approve",
                        &req.operator,
                        &current_status,
                        STATUS_IN_PRODUCTION,
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(data, "审批通过"))
                }
                Err(e) => {
                    tracing::error!("Failed to approve APQP: {}", e);
                    Json(ApiResponse::error(500, "审批失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find APQP project: {}", e);
            Json(ApiResponse::error(404, "APQP项目不存在"))
        }
    }
}

/// APV-4: 完成审批 (in_production → completed, requires_approval)
pub async fn complete_apqp(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<ApqpApprovalRequest>,
) -> Json<ApiResponse<ApqpProject>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的APQP项目ID")),
    };

    let current = sqlx::query(only_own_schema_query!(
        "qms",
        "SELECT status FROM qms.qa_apqp_projects WHERE deleted_at IS NULL AND id = $1"
    ))
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if apqp_requires_approval(&current_status, STATUS_COMPLETED)
                && !crate::shared::permission::has_qms_permission(&claims, "apqp.approve")
            {
                return Json(ApiResponse::error(403, "无审批权限"));
            }
            if apqp_can_transition(&current_status, STATUS_COMPLETED).is_err() {
                return Json(ApiResponse::error(400, "当前状态不允许完成"));
            }
            let project = sqlx::query_as::<_, ApqpProject>(
                format!("UPDATE qms.qa_apqp_projects SET status = '{}', actual_end_date = COALESCE(actual_end_date, NOW()), progress = 100, updated_at = NOW() WHERE id = $1 RETURNING {}", STATUS_COMPLETED, APQP_SELECT_COLS).as_str()
            ).bind(id).fetch_one(&state.pool).await;
            match project {
                Ok(data) => {
                    let tenant_str = claims.tenant_id.clone().unwrap_or_default();
                    let _ = crate::models::audit_log::log_approval_event(
                        &state.pool,
                        &tenant_str,
                        "apqp",
                        &id.to_string(),
                        "complete",
                        &req.operator,
                        &current_status,
                        STATUS_COMPLETED,
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(data, "APQP项目已完成"))
                }
                Err(e) => {
                    tracing::error!("Failed to complete APQP: {}", e);
                    Json(ApiResponse::error(500, "完成失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find APQP project: {}", e);
            Json(ApiResponse::error(404, "APQP项目不存在"))
        }
    }
}

/// APV-4: 取消 (任意非终态 → cancelled)
pub async fn cancel_apqp(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<ApqpApprovalRequest>,
) -> Json<ApiResponse<ApqpProject>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的APQP项目ID")),
    };

    let current = sqlx::query(only_own_schema_query!(
        "qms",
        "SELECT status FROM qms.qa_apqp_projects WHERE deleted_at IS NULL AND id = $1"
    ))
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if apqp_can_transition(&current_status, STATUS_CANCELLED).is_err() {
                return Json(ApiResponse::error(400, "当前状态不允许取消"));
            }
            let project = sqlx::query_as::<_, ApqpProject>(
                format!("UPDATE qms.qa_apqp_projects SET status = '{}', updated_at = NOW() WHERE id = $1 RETURNING {}", STATUS_CANCELLED, APQP_SELECT_COLS).as_str()
            ).bind(id).fetch_one(&state.pool).await;
            match project {
                Ok(data) => {
                    let tenant_str = claims.tenant_id.clone().unwrap_or_default();
                    let _ = crate::models::audit_log::log_approval_event(
                        &state.pool,
                        &tenant_str,
                        "apqp",
                        &id.to_string(),
                        "cancel",
                        &req.operator,
                        &current_status,
                        STATUS_CANCELLED,
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(data, "APQP项目已取消"))
                }
                Err(e) => {
                    tracing::error!("Failed to cancel APQP: {}", e);
                    Json(ApiResponse::error(500, "取消失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find APQP project: {}", e);
            Json(ApiResponse::error(404, "APQP项目不存在"))
        }
    }
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/apqp/projects", get(list_apqp_projects))
        .route("/apqp/projects", post(create_apqp_project))
        .route("/apqp/projects/{id}", get(get_apqp_project))
        .route("/apqp/projects/{id}", put(update_apqp_project))
        .route("/apqp/projects/{id}", delete(delete_apqp_project))
        .route(
            "/apqp/projects/{id}/transition",
            post(transition_project_status),
        )
        .route("/apqp/projects/{id}/progress", get(get_apqp_progress))
        .route("/apqp/projects/{id}/approve", post(approve_apqp))
        .route("/apqp/projects/{id}/complete", post(complete_apqp))
        .route("/apqp/projects/{id}/cancel", post(cancel_apqp))
        .route("/apqp/phases", get(list_apqp_phases))
        .route("/apqp/phases", post(create_apqp_phase))
        .route("/apqp/phases/{id}", get(get_apqp_phase))
        .route("/apqp/phases/{id}", put(update_apqp_phase))
        .route("/apqp/phases/{id}", delete(delete_apqp_phase))
        .route("/apqp/tasks", get(list_apqp_tasks))
        .route("/apqp/tasks", post(create_apqp_task))
        .route("/apqp/tasks/{id}", get(get_apqp_task))
        .route("/apqp/tasks/{id}", put(update_apqp_task))
        .route("/apqp/tasks/{id}", delete(delete_apqp_task))
        .route("/apqp/risks", get(list_apqp_risks))
        .route("/apqp/risks", post(create_apqp_risk))
        .route("/apqp/risks/{id}", get(get_apqp_risk))
        .route("/apqp/risks/{id}", put(update_apqp_risk))
        .route("/apqp/risks/{id}", delete(delete_apqp_risk))
        .route("/apqp/approvals", get(list_apqp_approvals))
        .route("/apqp/approvals", post(create_apqp_approval))
        .route("/apqp/approvals/{id}/process", post(process_apqp_approval))
}
