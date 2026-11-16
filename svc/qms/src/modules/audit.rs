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
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::require_tenant;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:audit:read"])),
    path = "/audit-plans",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_audit"
)]
pub async fn list_audit_plans(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<AuditPlanQuery>,
) -> ApiResponse<Vec<AuditPlan>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取审核计划列表失败");
        }
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let plans = match (query.status.as_ref(), query.audit_type.as_ref()) {
        (Some(st), Some(at)) => sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at, updated_at FROM qms.qa_audit_plans WHERE status = $1 AND audit_type = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(st).bind(at).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (Some(st), None) => sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at, updated_at FROM qms.qa_audit_plans WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(st).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, Some(at)) => sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at, updated_at FROM qms.qa_audit_plans WHERE audit_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(at).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, None) => sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at, updated_at FROM qms.qa_audit_plans ORDER BY created_at DESC LIMIT $1 OFFSET $2"#)).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
    };

    match plans {
        Ok(data) => ApiResponse::success(data, "获取审核计划列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch audit plans: {}", e);
            ApiResponse::server_error("获取审核计划列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:audit:write"])),
    path = "/audit-plans",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_audit"
)]
pub async fn create_audit_plan(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateAuditPlanRequest>,
) -> ApiResponse<AuditPlan> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let plan_no = format!(
        "AP-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let standard_id = req
        .standard_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启审核计划创建事务失败: {}", e);
            return ApiResponse::server_error("审核计划创建失败");
        }
    };

    // 同域引用校验：检验标准若给出，必须存在且同租户。
    if let Some(sid) = standard_id {
        match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "qms",
            "SELECT COUNT(*) FROM qms.qa_standards WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"
        ))
        .bind(sid)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
        {
            Ok(0) => return ApiResponse::bad_request("检验标准不存在或不属于当前租户"),
            Ok(_) => {}
            Err(e) => {
                tracing::error!("Failed to validate standard: {}", e);
                return ApiResponse::server_error("审核计划创建失败");
            }
        }
    }

    let plan = sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_audit_plans (tenant_id, plan_no, title, audit_type, scope, standard_id, status, scheduled_start, scheduled_end, created_by) VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7::timestamptz, $8::timestamptz, $9) RETURNING id::TEXT, tenant_id::TEXT, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at, updated_at"#)).bind(tenant_id).bind(plan_no).bind(req.title).bind(req.audit_type).bind(req.scope).bind(standard_id).bind(req.scheduled_start).bind(req.scheduled_end).bind(req.created_by)
    .fetch_one(&mut scope)
    .await;

    match plan {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交审核计划创建事务失败: {}", e);
                return ApiResponse::server_error("审核计划创建失败");
            }
            ApiResponse::success(data, "审核计划创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create audit plan: {}", e);
            ApiResponse::server_error("审核计划创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:audit:read"])),
    path = "/audit-plans/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_audit"
)]
pub async fn get_audit_plan(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<AuditPlan> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取审核计划失败");
        }
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的计划ID"),
    };

    let plan = sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at, updated_at FROM qms.qa_audit_plans WHERE id = $1"#)).bind(id)
    .fetch_one(&mut scope)
    .await;

    match plan {
        Ok(data) => ApiResponse::success(data, "获取审核计划成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch audit plan: {}", e);
            ApiResponse::server_error("获取审核计划失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:audit:write"])),
    path = "/audit-plans/{id}/start",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_audit"
)]
pub async fn start_audit_plan(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<AuditPlan> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的计划ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启审核计划启动事务失败: {}", e);
            return ApiResponse::server_error("审核计划启动失败");
        }
    };

    let plan = sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"UPDATE qms.qa_audit_plans SET status = 'in_progress', actual_start = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id::TEXT, tenant_id::TEXT, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at, updated_at"#)).bind(id).bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match plan {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交审核计划启动事务失败: {}", e);
                return ApiResponse::server_error("审核计划启动失败");
            }
            ApiResponse::success(data, "审核计划已启动")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::conflict("计划不存在或状态已变更"),
        Err(e) => {
            tracing::error!("Failed to start audit plan: {}", e);
            ApiResponse::server_error("审核计划启动失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:audit:write"])),
    path = "/audit-plans/{id}/complete",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_audit"
)]
pub async fn complete_audit_plan(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<AuditPlan> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的计划ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启审核计划完成事务失败: {}", e);
            return ApiResponse::server_error("审核计划完成失败");
        }
    };

    let plan = sqlx::query_as::<_, AuditPlan>(only_own_schema_query!("qms", r#"UPDATE qms.qa_audit_plans SET status = 'completed', actual_end = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id::TEXT, tenant_id::TEXT, plan_no, title, audit_type, scope, standard_id::TEXT, status, scheduled_start::TEXT, scheduled_end::TEXT, actual_start::TEXT, actual_end::TEXT, created_by, created_at, updated_at"#)).bind(id).bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match plan {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交审核计划完成事务失败: {}", e);
                return ApiResponse::server_error("审核计划完成失败");
            }
            ApiResponse::success(data, "审核计划已完成")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::conflict("计划不存在或状态已变更"),
        Err(e) => {
            tracing::error!("Failed to complete audit plan: {}", e);
            ApiResponse::server_error("审核计划完成失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:audit:read"])),
    path = "/audit-tasks",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_audit"
)]
pub async fn list_audit_tasks(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<AuditTaskQuery>,
) -> ApiResponse<Vec<AuditTask>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取审核任务列表失败");
        }
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let plan_id = query.plan_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    let tasks = match (plan_id, query.status.as_ref()) {
        (Some(plan), Some(st)) => sqlx::query_as::<_, AuditTask>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, task_no, plan_id::TEXT, title, description, auditor, status, completed_at, finding_count, created_at, updated_at FROM qms.qa_audit_tasks WHERE plan_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(plan).bind(st).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (Some(plan), None) => sqlx::query_as::<_, AuditTask>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, task_no, plan_id::TEXT, title, description, auditor, status, completed_at, finding_count, created_at, updated_at FROM qms.qa_audit_tasks WHERE plan_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(plan).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, Some(st)) => sqlx::query_as::<_, AuditTask>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, task_no, plan_id::TEXT, title, description, auditor, status, completed_at, finding_count, created_at, updated_at FROM qms.qa_audit_tasks WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(st).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, None) => sqlx::query_as::<_, AuditTask>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, task_no, plan_id::TEXT, title, description, auditor, status, completed_at, finding_count, created_at, updated_at FROM qms.qa_audit_tasks ORDER BY created_at DESC LIMIT $1 OFFSET $2"#)).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
    };

    match tasks {
        Ok(data) => ApiResponse::success(data, "获取审核任务列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch audit tasks: {}", e);
            ApiResponse::server_error("获取审核任务列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:audit:write"])),
    path = "/audit-plans/{plan_id}/tasks",
    params(
("plan_id" = String, Path, description = "plan_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_audit"
)]
pub async fn create_audit_task(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(plan_id): axum::extract::Path<String>,
    Json(req): Json<CreateAuditTaskRequest>,
) -> ApiResponse<AuditTask> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let plan_id = match Uuid::parse_str(&plan_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的计划ID"),
    };

    let task_no = format!(
        "AT-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启审核任务创建事务失败: {}", e);
            return ApiResponse::server_error("审核任务创建失败");
        }
    };

    // 同域引用校验：父计划必须存在且同租户。
    match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        "SELECT COUNT(*) FROM qms.qa_audit_plans WHERE id = $1 AND tenant_id = $2"
    ))
    .bind(plan_id)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(0) => return ApiResponse::bad_request("审核计划不存在或不属于当前租户"),
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to validate audit plan: {}", e);
            return ApiResponse::server_error("审核任务创建失败");
        }
    }

    let task = sqlx::query_as::<_, AuditTask>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_audit_tasks (tenant_id, task_no, plan_id, title, description, auditor, status) VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING id::TEXT, tenant_id::TEXT, task_no, plan_id::TEXT, title, description, auditor, status, completed_at, finding_count, created_at, updated_at"#)).bind(tenant_id).bind(task_no).bind(plan_id).bind(req.title).bind(req.description).bind(req.auditor)
    .fetch_one(&mut scope)
    .await;

    match task {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交审核任务创建事务失败: {}", e);
                return ApiResponse::server_error("审核任务创建失败");
            }
            ApiResponse::success(data, "审核任务创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create audit task: {}", e);
            ApiResponse::server_error("审核任务创建失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:audit:write"])),
    path = "/audit-tasks/{id}/complete",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_audit"
)]
pub async fn complete_audit_task(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<AuditTask> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的任务ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启审核任务完成事务失败: {}", e);
            return ApiResponse::server_error("审核任务完成失败");
        }
    };

    let task = sqlx::query_as::<_, AuditTask>(only_own_schema_query!("qms", r#"UPDATE qms.qa_audit_tasks SET status = 'completed', completed_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id::TEXT, tenant_id::TEXT, task_no, plan_id::TEXT, title, description, auditor, status, completed_at, finding_count, created_at, updated_at"#)).bind(id).bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match task {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交审核任务完成事务失败: {}", e);
                return ApiResponse::server_error("审核任务完成失败");
            }
            ApiResponse::success(data, "审核任务已完成")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::conflict("任务不存在或状态已变更"),
        Err(e) => {
            tracing::error!("Failed to complete audit task: {}", e);
            ApiResponse::server_error("审核任务完成失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:audit:read"])),
    path = "/audit-findings",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_audit"
)]
pub async fn list_audit_findings(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<AuditFindingQuery>,
) -> ApiResponse<Vec<AuditFinding>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取审核发现列表失败");
        }
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let plan_id = query.plan_id.as_ref().and_then(|s| Uuid::parse_str(s).ok());

    let findings = match (plan_id, query.severity.as_ref(), query.status.as_ref()) {
        (Some(plan), Some(sv), Some(st)) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date, verified_at, created_by, created_at, updated_at FROM qms.qa_audit_findings WHERE plan_id = $1 AND severity = $2 AND status = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"#)).bind(plan).bind(sv).bind(st).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (Some(plan), Some(sv), None) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date, verified_at, created_by, created_at, updated_at FROM qms.qa_audit_findings WHERE plan_id = $1 AND severity = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(plan).bind(sv).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (Some(plan), None, Some(st)) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date, verified_at, created_by, created_at, updated_at FROM qms.qa_audit_findings WHERE plan_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(plan).bind(st).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, Some(sv), Some(st)) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date, verified_at, created_by, created_at, updated_at FROM qms.qa_audit_findings WHERE severity = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#)).bind(sv).bind(st).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (Some(plan), None, None) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date, verified_at, created_by, created_at, updated_at FROM qms.qa_audit_findings WHERE plan_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(plan).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, Some(sv), None) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date, verified_at, created_by, created_at, updated_at FROM qms.qa_audit_findings WHERE severity = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(sv).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, None, Some(st)) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date, verified_at, created_by, created_at, updated_at FROM qms.qa_audit_findings WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#)).bind(st).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
        (None, None, None) => sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date, verified_at, created_by, created_at, updated_at FROM qms.qa_audit_findings ORDER BY created_at DESC LIMIT $1 OFFSET $2"#)).bind(page_size).bind(offset)
        .fetch_all(&mut scope)
        .await,
    };

    match findings {
        Ok(data) => ApiResponse::success(data, "获取审核发现列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch audit findings: {}", e);
            ApiResponse::server_error("获取审核发现列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:audit:write"])),
    path = "/audit-tasks/{task_id}/findings",
    params(
("task_id" = String, Path, description = "task_id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_audit"
)]
pub async fn create_audit_finding(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(task_id): axum::extract::Path<String>,
    Json(req): Json<CreateAuditFindingRequest>,
) -> ApiResponse<AuditFinding> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let task_id = match Uuid::parse_str(&task_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的任务ID"),
    };

    let finding_no = format!(
        "AF-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let severity = req.severity.unwrap_or_else(|| "minor".to_string());

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启审核发现创建事务失败: {}", e);
            return ApiResponse::server_error("审核发现创建失败");
        }
    };

    // 同域引用校验：父任务必须存在且同租户。
    let task = sqlx::query(only_own_schema_query!(
        "qms",
        r#"SELECT plan_id FROM qms.qa_audit_tasks WHERE id = $1 AND tenant_id = $2"#
    ))
    .bind(task_id)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    let plan_id = match task {
        Ok(row) => row.get::<Uuid, _>("plan_id"),
        Err(sqlx::Error::RowNotFound) => return ApiResponse::not_found("审核任务不存在"),
        Err(e) => {
            tracing::error!("Failed to find audit task: {}", e);
            return ApiResponse::server_error("审核发现创建失败");
        }
    };

    // target_date 输入为文本，显式 cast 到 timestamptz（B6a 同类修复）。
    let finding = sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_audit_findings (tenant_id, finding_no, task_id, plan_id, title, description, severity, category, status, recommendation, responsible, target_date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, $10, $11::timestamptz, $12) RETURNING id::TEXT, tenant_id::TEXT, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date, verified_at, created_by, created_at, updated_at"#)).bind(tenant_id).bind(finding_no).bind(task_id).bind(plan_id).bind(req.title).bind(req.description).bind(severity).bind(req.category).bind(req.recommendation).bind(req.responsible).bind(req.target_date).bind(req.created_by)
    .fetch_one(&mut scope)
    .await;

    match finding {
        Ok(data) => {
            // 子表计数与主行同事务，失败整体回滚。
            if let Err(e) = sqlx::query(
                only_own_schema_query!("qms", r#"UPDATE qms.qa_audit_tasks SET finding_count = finding_count + 1 WHERE id = $1 AND tenant_id = $2"#),
            )
            .bind(task_id)
            .bind(tenant_id)
            .execute(&mut scope)
            .await
            {
                tracing::error!("更新审核任务发现计数失败，整体回滚: {}", e);
                return ApiResponse::server_error("审核发现创建失败");
            }
            if let Err(e) = scope.commit().await {
                tracing::error!("提交审核发现创建事务失败: {}", e);
                return ApiResponse::server_error("审核发现创建失败");
            }
            ApiResponse::success(data, "审核发现创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create audit finding: {}", e);
            ApiResponse::server_error("审核发现创建失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:audit:write"])),
    path = "/audit-findings/{id}/verify",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "quality_audit"
)]
pub async fn verify_audit_finding(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<AuditFinding> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的发现ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启审核发现验证事务失败: {}", e);
            return ApiResponse::server_error("审核发现验证失败");
        }
    };

    let finding = sqlx::query_as::<_, AuditFinding>(only_own_schema_query!("qms", r#"UPDATE qms.qa_audit_findings SET status = 'verified', verified_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id::TEXT, tenant_id::TEXT, finding_no, task_id::TEXT, plan_id::TEXT, title, description, severity, category, status, recommendation, responsible, target_date, verified_at, created_by, created_at, updated_at"#)).bind(id).bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match finding {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交审核发现验证事务失败: {}", e);
                return ApiResponse::server_error("审核发现验证失败");
            }
            ApiResponse::success(data, "审核发现已验证")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::conflict("发现不存在或状态已变更"),
        Err(e) => {
            tracing::error!("Failed to verify audit finding: {}", e);
            ApiResponse::server_error("审核发现验证失败")
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
