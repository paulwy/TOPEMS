//! Audit handlers

use crate::models::audit::*;
use axum::{
    extract::State,
    routing::{get, post, put},
    Extension, Json, Router,
};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::get_tenant_id;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

pub async fn list_audit_plans(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<AuditPlanQuery>,
) -> Json<ApiResponse<Vec<AuditPlan>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let plans = match (query.status.as_ref(), query.audit_type.as_ref()) {
        (Some(st), Some(at)) => sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_plans WHERE tenant_id = $1 AND status = $2 AND audit_type = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"#)).bind(tenant_id).bind(st).bind(at).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(st), None) => sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_plans WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(tenant_id).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(at)) => sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_plans WHERE tenant_id = $1 AND audit_type = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(tenant_id).bind(at).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None) => sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_plans WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(tenant_id).bind(page_size).bind(offset)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateAuditPlanRequest>,
) -> Json<ApiResponse<AuditPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let plan_no = format!(
        "AP-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let standard_id = req
        .standard_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let plan = sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_audit_plans (tenant_id, plan_no, title, audit_type, scope, standard_id, status, scheduled_start, scheduled_end, created_by) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8, $9) RETURNING id, tenant_id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#)).bind(tenant_id).bind(plan_no).bind(req.title).bind(req.audit_type).bind(req.scope).bind(standard_id).bind(req.scheduled_start).bind(req.scheduled_end).bind(req.created_by)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<AuditPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let plan = sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_plans WHERE id = $1 AND tenant_id = $2"#)).bind(id).bind(tenant_id)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<AuditPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let plan = sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"UPDATE qms.qa_audit_plans SET status = 'in_progress', actual_start = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#)).bind(id).bind(tenant_id)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<AuditPlan>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let plan = sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"UPDATE qms.qa_audit_plans SET status = 'completed', actual_end = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#)).bind(id).bind(tenant_id)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<AuditTaskQuery>,
) -> Json<ApiResponse<Vec<AuditTask>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let plan_id = query.plan_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    let tasks = match (plan_id, query.status.as_ref()) {
        (Some(plan), Some(st)) => sqlx::query_as::<_, AuditTask>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, task_no, plan_id::TEXT, title, description, auditor, status, completed_at::TEXT, finding_count, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_tasks WHERE tenant_id = $1 AND plan_id = $2 AND status = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"#)).bind(tenant_id).bind(plan).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(plan), None) => sqlx::query_as::<_, AuditTask>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, task_no, plan_id::TEXT, title, description, auditor, status, completed_at::TEXT, finding_count, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_tasks WHERE tenant_id = $1 AND plan_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(tenant_id).bind(plan).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(st)) => sqlx::query_as::<_, AuditTask>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, task_no, plan_id::TEXT, title, description, auditor, status, completed_at::TEXT, finding_count, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_tasks WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(tenant_id).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None) => sqlx::query_as::<_, AuditTask>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, task_no, plan_id::TEXT, title, description, auditor, status, completed_at::TEXT, finding_count, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_tasks WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(tenant_id).bind(page_size).bind(offset)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(plan_id): axum::extract::Path<String>,
    Json(req): Json<CreateAuditTaskRequest>,
) -> Json<ApiResponse<AuditTask>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let plan_id = match Uuid::parse_str(&plan_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的计划ID")),
    };

    let task_no = format!(
        "AT-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let task = sqlx::query_as::<_, AuditTask>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_audit_tasks (tenant_id, task_no, plan_id, title, description, auditor, status) VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id, tenant_id, task_no, plan_id::TEXT, title, description, auditor, status, completed_at::TEXT, finding_count, created_at::TEXT, updated_at::TEXT"#)).bind(tenant_id).bind(task_no).bind(plan_id).bind(req.title).bind(req.description).bind(req.auditor)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<AuditTask>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let task = sqlx::query_as::<_, AuditTask>(only_own_schema_query!("qms", r#"UPDATE qms.qa_audit_tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, task_no, plan_id::TEXT, title, description, auditor, status, completed_at::TEXT, finding_count, created_at::TEXT, updated_at::TEXT"#)).bind(id).bind(tenant_id)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<AuditFindingQuery>,
) -> Json<ApiResponse<Vec<AuditFinding>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let plan_id = query.plan_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    let findings = match (plan_id, query.severity.as_ref(), query.status.as_ref()) {
        (Some(plan), Some(sv), Some(st)) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_findings WHERE tenant_id = $1 AND plan_id = $2 AND severity = $3 AND status = $4 ORDER BY created_at DESC LIMIT $5 OFFSET $6"#)).bind(tenant_id).bind(plan).bind(sv).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(plan), Some(sv), None) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_findings WHERE tenant_id = $1 AND plan_id = $2 AND severity = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"#)).bind(tenant_id).bind(plan).bind(sv).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(plan), None, Some(st)) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_findings WHERE tenant_id = $1 AND plan_id = $2 AND status = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"#)).bind(tenant_id).bind(plan).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(sv), Some(st)) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_findings WHERE tenant_id = $1 AND severity = $2 AND status = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"#)).bind(tenant_id).bind(sv).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (Some(plan), None, None) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_findings WHERE tenant_id = $1 AND plan_id = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(tenant_id).bind(plan).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, Some(sv), None) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_findings WHERE tenant_id = $1 AND severity = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(tenant_id).bind(sv).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None, Some(st)) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_findings WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(tenant_id).bind(st).bind(page_size).bind(offset)
        .fetch_all(&state.pool)
        .await,
        (None, None, None) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qms.qa_audit_findings WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(tenant_id).bind(page_size).bind(offset)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(task_id): axum::extract::Path<String>,
    Json(req): Json<CreateAuditFindingRequest>,
) -> Json<ApiResponse<AuditFinding>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let task_id = match Uuid::parse_str(&task_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的任务ID")),
    };

    let finding_no = format!(
        "AF-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let severity = req.severity.unwrap_or_else(|| "minor".to_string());

    let task = sqlx::query(only_own_schema_query!(
        "qms",
        r#"SELECT plan_id FROM qms.qa_audit_tasks WHERE id = $1 AND tenant_id = $2"#
    ))
    .bind(task_id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    let plan_id = match task {
        Ok(row) => row.get::<Uuid, _>("plan_id"),
        Err(_) => {
            tracing::error!("Task not found");
            return Json(ApiResponse::error(404, "审核任务不存在"));
        }
    };

    let finding = sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_audit_findings (tenant_id, finding_no, task_id, plan_id, title, description, severity, category, status, recommendation, responsible, target_date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, $10, $11, $12) RETURNING id, tenant_id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#)).bind(tenant_id).bind(finding_no).bind(task_id).bind(plan_id).bind(req.title).bind(req.description).bind(severity).bind(req.category).bind(req.recommendation).bind(req.responsible).bind(req.target_date).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match finding {
        Ok(data) => {
            let _ = sqlx::query(
                only_own_schema_query!("qms", r#"UPDATE qms.qa_audit_tasks SET finding_count = finding_count + 1 WHERE id = $1 AND tenant_id = $2"#),
            )
            .bind(task_id)
            .bind(tenant_id)
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
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<AuditFinding>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的发现ID")),
    };

    let finding = sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"UPDATE qms.qa_audit_findings SET status = 'verified', verified_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date::TEXT, verified_at::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#)).bind(id).bind(tenant_id)
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

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/audit-plans", get(list_audit_plans))
        .route("/audit-plans", post(create_audit_plan))
        .route("/audit-plans/{id}", get(get_audit_plan))
        .route("/audit-plans/{id}/start", post(start_audit_plan))
        .route("/audit-plans/{id}/complete", post(complete_audit_plan))
        .route("/audit-tasks", get(list_audit_tasks))
        .route("/audit-plans/{plan_id}/tasks", post(create_audit_task))
        .route("/audit-tasks/{id}/complete", put(complete_audit_task))
        .route("/audit-findings", get(list_audit_findings))
        .route(
            "/audit-tasks/{task_id}/findings",
            post(create_audit_finding),
        )
        .route("/audit-findings/{id}/verify", post(verify_audit_finding))
}
