//! Audit handlers

use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow, Row};
use topems_shared::ApiResponse;

#[derive(Debug, Deserialize)]
pub struct AuditPlanQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub audit_type: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AuditTaskQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub plan_id: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AuditFindingQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub plan_id: Option<String>,
    pub severity: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct AuditPlan {
    pub id: String,
    pub plan_no: String,
    pub title: String,
    pub audit_type: String,
    pub scope: Option<String>,
    pub standard_id: Option<String>,
    pub status: Option<String>,
    pub scheduled_start: Option<String>,
    pub scheduled_end: Option<String>,
    pub actual_start: Option<String>,
    pub actual_end: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct AuditTask {
    pub id: String,
    pub task_no: String,
    pub plan_id: String,
    pub title: String,
    pub description: Option<String>,
    pub auditor: Option<String>,
    pub status: Option<String>,
    pub completed_at: Option<String>,
    pub finding_count: Option<i32>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct AuditFinding {
    pub id: String,
    pub finding_no: String,
    pub task_id: Option<String>,
    pub plan_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub recommendation: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<String>,
    pub verified_at: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAuditPlanRequest {
    pub title: String,
    pub audit_type: String,
    pub scope: Option<String>,
    pub standard_id: Option<String>,
    pub scheduled_start: Option<String>,
    pub scheduled_end: Option<String>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAuditTaskRequest {
    pub title: String,
    pub description: Option<String>,
    pub auditor: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAuditFindingRequest {
    pub title: String,
    pub description: Option<String>,
    pub severity: Option<String>,
    pub category: Option<String>,
    pub recommendation: Option<String>,
    pub responsible: Option<String>,
    pub target_date: Option<String>,
    pub created_by: Option<String>,
}

pub async fn list_audit_plans(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<AuditPlanQuery>,
) -> Json<ApiResponse<Vec<AuditPlan>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let plans = match (query.status.as_ref(), query.audit_type.as_ref()) {
        (Some(st), Some(at)) => sqlx::query_as::<_, AuditPlan>(r#"SELECT id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_audit_plans WHERE status = $1 AND audit_type = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#).bind(st).bind(at).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(st), None) => sqlx::query_as::<_, AuditPlan>(r#"SELECT id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_audit_plans WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(at)) => sqlx::query_as::<_, AuditPlan>(r#"SELECT id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_audit_plans WHERE audit_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(at).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None) => sqlx::query_as::<_, AuditPlan>(r#"SELECT id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_audit_plans ORDER BY created_at DESC LIMIT $1 OFFSET $2"#).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
    };

    match plans {
        Ok(data) => Json(ApiResponse::success(data, "获取审核计划列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch audit plans: {}", e);
            Json(ApiResponse::error(500, "获取审核计划列表失败"))
        }
    }
}

pub async fn create_audit_plan(
    State(state): State<crate::AppState>,
    Json(req): Json<CreateAuditPlanRequest>,
) -> Json<ApiResponse<AuditPlan>> {
    let plan_no = format!(
        "AP-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let standard_id = req
        .standard_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let plan = sqlx::query_as::<_, AuditPlan>(r#"INSERT INTO qa_audit_plans (plan_no, title, audit_type, scope, standard_id, status, scheduled_start, scheduled_end, created_by) VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8) RETURNING id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(plan_no).bind(req.title).bind(req.audit_type).bind(req.scope).bind(standard_id).bind(req.scheduled_start).bind(req.scheduled_end).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match plan {
        Ok(data) => Json(ApiResponse::success(data, "审核计划创建成功")),
        Err(e) => {
            tracing::error!("Failed to create audit plan: {}", e);
            Json(ApiResponse::error(500, "审核计划创建失败"))
        }
    }
}

pub async fn get_audit_plan(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<AuditPlan>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let plan = sqlx::query_as::<_, AuditPlan>(r#"SELECT id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_audit_plans WHERE id = $1"#).bind(id)
    .fetch_one(&state.pool)
    .await;

    match plan {
        Ok(data) => Json(ApiResponse::success(data, "获取审核计划成功")),
        Err(e) => {
            tracing::error!("Failed to fetch audit plan: {}", e);
            Json(ApiResponse::error(500, "获取审核计划失败"))
        }
    }
}

pub async fn start_audit_plan(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<AuditPlan>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let plan = sqlx::query_as::<_, AuditPlan>(r#"UPDATE qa_audit_plans SET status = 'in_progress', actual_start = NOW(), updated_at = NOW() WHERE id = $1 RETURNING id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id)
    .fetch_one(&state.pool)
    .await;

    match plan {
        Ok(data) => Json(ApiResponse::success(data, "审核计划已启动")),
        Err(e) => {
            tracing::error!("Failed to start audit plan: {}", e);
            Json(ApiResponse::error(500, "审核计划启动失败"))
        }
    }
}

pub async fn complete_audit_plan(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<AuditPlan>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let plan = sqlx::query_as::<_, AuditPlan>(r#"UPDATE qa_audit_plans SET status = 'completed', actual_end = NOW(), updated_at = NOW() WHERE id = $1 RETURNING id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id)
    .fetch_one(&state.pool)
    .await;

    match plan {
        Ok(data) => Json(ApiResponse::success(data, "审核计划已完成")),
        Err(e) => {
            tracing::error!("Failed to complete audit plan: {}", e);
            Json(ApiResponse::error(500, "审核计划完成失败"))
        }
    }
}

pub async fn list_audit_tasks(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<AuditTaskQuery>,
) -> Json<ApiResponse<Vec<AuditTask>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let plan_id = query.plan_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    let tasks = match (plan_id, query.status.as_ref()) {
        (Some(plan), Some(st)) => sqlx::query_as::<_, AuditTask>(r#"SELECT id, task_no, plan_id::TEXT, title, description, auditor, status, completed_at::TEXT, finding_count, created_at::TEXT, updated_at::TEXT FROM qa_audit_tasks WHERE plan_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#).bind(plan).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(plan), None) => sqlx::query_as::<_, AuditTask>(r#"SELECT id, task_no, plan_id::TEXT, title, description, auditor, status, completed_at::TEXT, finding_count, created_at::TEXT, updated_at::TEXT FROM qa_audit_tasks WHERE plan_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(plan).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(st)) => sqlx::query_as::<_, AuditTask>(r#"SELECT id, task_no, plan_id::TEXT, title, description, auditor, status, completed_at::TEXT, finding_count, created_at::TEXT, updated_at::TEXT FROM qa_audit_tasks WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None) => sqlx::query_as::<_, AuditTask>(r#"SELECT id, task_no, plan_id::TEXT, title, description, auditor, status, completed_at::TEXT, finding_count, created_at::TEXT, updated_at::TEXT FROM qa_audit_tasks ORDER BY created_at DESC LIMIT $1 OFFSET $2"#).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
    };

    match tasks {
        Ok(data) => Json(ApiResponse::success(data, "获取审核任务列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch audit tasks: {}", e);
            Json(ApiResponse::error(500, "获取审核任务列表失败"))
        }
    }
}

pub async fn create_audit_task(
    State(state): State<crate::AppState>,
    axum::extract::Path(plan_id): axum::extract::Path<String>,
    Json(req): Json<CreateAuditTaskRequest>,
) -> Json<ApiResponse<AuditTask>> {
    let plan_id = match Uuid::parse_str(&plan_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let task_no = format!(
        "AT-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let task = sqlx::query_as::<_, AuditTask>(r#"INSERT INTO qa_audit_tasks (task_no, plan_id, title, description, auditor, status) VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id, task_no, plan_id::TEXT, title, description, auditor, status, completed_at::TEXT, finding_count, created_at::TEXT, updated_at::TEXT"#).bind(task_no).bind(plan_id).bind(req.title).bind(req.description).bind(req.auditor)
    .fetch_one(&state.pool)
    .await;

    match task {
        Ok(data) => Json(ApiResponse::success(data, "审核任务创建成功")),
        Err(e) => {
            tracing::error!("Failed to create audit task: {}", e);
            Json(ApiResponse::error(500, "审核任务创建失败"))
        }
    }
}

pub async fn complete_audit_task(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<AuditTask>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let task = sqlx::query_as::<_, AuditTask>(r#"UPDATE qa_audit_tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING id, task_no, plan_id::TEXT, title, description, auditor, status, completed_at::TEXT, finding_count, created_at::TEXT, updated_at::TEXT"#).bind(id)
    .fetch_one(&state.pool)
    .await;

    match task {
        Ok(data) => Json(ApiResponse::success(data, "审核任务已完成")),
        Err(e) => {
            tracing::error!("Failed to complete audit task: {}", e);
            Json(ApiResponse::error(500, "审核任务完成失败"))
        }
    }
}

pub async fn list_audit_findings(
    State(state): State<crate::AppState>,
    axum::extract::Query(query): axum::extract::Query<AuditFindingQuery>,
) -> Json<ApiResponse<Vec<AuditFinding>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let plan_id = query.plan_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    let findings = match (plan_id, query.severity.as_ref(), query.status.as_ref()) {
        (Some(plan), Some(sv), Some(st)) => sqlx::query_as::<_, AuditFinding>(r#"SELECT id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_audit_findings WHERE plan_id = $1 AND severity = $2 AND status = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"#).bind(plan).bind(sv).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(plan), Some(sv), None) => sqlx::query_as::<_, AuditFinding>(r#"SELECT id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_audit_findings WHERE plan_id = $1 AND severity = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#).bind(plan).bind(sv).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(plan), None, Some(st)) => sqlx::query_as::<_, AuditFinding>(r#"SELECT id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_audit_findings WHERE plan_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#).bind(plan).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(sv), Some(st)) => sqlx::query_as::<_, AuditFinding>(r#"SELECT id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_audit_findings WHERE severity = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#).bind(sv).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(plan), None, None) => sqlx::query_as::<_, AuditFinding>(r#"SELECT id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_audit_findings WHERE plan_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(plan).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(sv), None) => sqlx::query_as::<_, AuditFinding>(r#"SELECT id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_audit_findings WHERE severity = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(sv).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None, Some(st)) => sqlx::query_as::<_, AuditFinding>(r#"SELECT id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_audit_findings WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None, None) => sqlx::query_as::<_, AuditFinding>(r#"SELECT id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_audit_findings ORDER BY created_at DESC LIMIT $1 OFFSET $2"#).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
    };

    match findings {
        Ok(data) => Json(ApiResponse::success(data, "获取审核发现列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch audit findings: {}", e);
            Json(ApiResponse::error(500, "获取审核发现列表失败"))
        }
    }
}

pub async fn create_audit_finding(
    State(state): State<crate::AppState>,
    axum::extract::Path(task_id): axum::extract::Path<String>,
    Json(req): Json<CreateAuditFindingRequest>,
) -> Json<ApiResponse<AuditFinding>> {
    let task_id = match Uuid::parse_str(&task_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let finding_no = format!(
        "AF-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let severity = req.severity.unwrap_or_else(|| "minor".to_string());

    let task = sqlx::query(r#"SELECT plan_id FROM qa_audit_tasks WHERE id = $1"#)
        .bind(task_id)
        .fetch_one(&state.pool)
        .await;

    let plan_id = match task {
        Ok(row) => row.get::<Uuid, _>("plan_id"),
        Err(_) => {
            tracing::error!("Task not found");
            return Json(ApiResponse::error(404, "审核任务不存在"));
        }
    };

    let finding = sqlx::query_as::<_, AuditFinding>(r#"INSERT INTO qa_audit_findings (finding_no, task_id, plan_id, title, description, severity, category, status, recommendation, responsible, target_date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, $9, $10, $11) RETURNING id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(finding_no).bind(task_id).bind(plan_id).bind(req.title).bind(req.description).bind(severity).bind(req.category).bind(req.recommendation).bind(req.responsible).bind(req.target_date).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match finding {
        Ok(data) => {
            let _ = sqlx::query(
                r#"UPDATE qa_audit_tasks SET finding_count = finding_count + 1 WHERE id = $1"#,
            )
            .bind(task_id)
            .execute(&state.pool)
            .await;
            Json(ApiResponse::success(data, "审核发现创建成功"))
        }
        Err(e) => {
            tracing::error!("Failed to create audit finding: {}", e);
            Json(ApiResponse::error(500, "审核发现创建失败"))
        }
    }
}

pub async fn verify_audit_finding(
    State(state): State<crate::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<AuditFinding>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的发现ID")),
    };

    let finding = sqlx::query_as::<_, AuditFinding>(r#"UPDATE qa_audit_findings SET status = 'verified', verified_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id)
    .fetch_one(&state.pool)
    .await;

    match finding {
        Ok(data) => Json(ApiResponse::success(data, "审核发现已验证")),
        Err(e) => {
            tracing::error!("Failed to verify audit finding: {}", e);
            Json(ApiResponse::error(500, "审核发现验证失败"))
        }
    }
}
