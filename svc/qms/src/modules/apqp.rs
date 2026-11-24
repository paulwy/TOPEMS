//! APQP (Advanced Product Quality Planning) handlers

use crate::models::apqp::*;
use crate::shared::fsm::{apqp_can_transition, apqp_requires_approval};
use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::require_tenant;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;
use topems_shared_db::scope::ScopedTxn;

const STATUS_IN_PRODUCTION: &str = "in_production";
const STATUS_COMPLETED: &str = "completed";
const STATUS_CANCELLED: &str = "cancelled";

/// 请求体里的日期只有日期部分，统一按 UTC 零点落 `timestamptz`。
fn date_to_utc(d: chrono::NaiveDate) -> DateTime<Utc> {
    DateTime::<Utc>::from_naive_utc_and_offset(d.and_hms_opt(0, 0, 0).unwrap_or_default(), Utc)
}

const APQP_SELECT_COLS: &str = r#"id, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date, target_date, actual_end_date, progress, risk_level, created_by, created_at, updated_at"#;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:apqp:read"])),
    path = "/apqp/projects",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn list_apqp_projects(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<ApqpProjectQuery>,
) -> ApiResponse<Vec<ApqpProject>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取APQP项目列表失败");
        }
    };
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let projects = match (query.status.as_ref(), query.product_name.as_ref()) {
        (Some(st), Some(pn)) => {
            sqlx::query_as::<_, ApqpProject>(
                only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date, target_date, actual_end_date, progress, risk_level, created_by, created_at, updated_at FROM qms.qa_apqp_projects WHERE deleted_at IS NULL AND status = $1 AND product_name ILIKE $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"#),
            )
            .bind(st)
            .bind(format!("%{}%", pn))
            .bind(page_size)
            .bind(offset)
            .fetch_all(&mut scope)
            .await
        }
        (Some(st), None) => {
            sqlx::query_as::<_, ApqpProject>(
                only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date, target_date, actual_end_date, progress, risk_level, created_by, created_at, updated_at FROM qms.qa_apqp_projects WHERE deleted_at IS NULL AND status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#),
            )
            .bind(st)
            .bind(page_size)
            .bind(offset)
            .fetch_all(&mut scope)
            .await
        }
        (None, Some(pn)) => {
            sqlx::query_as::<_, ApqpProject>(
                only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date, target_date, actual_end_date, progress, risk_level, created_by, created_at, updated_at FROM qms.qa_apqp_projects WHERE deleted_at IS NULL AND product_name ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"#),
            )
            .bind(format!("%{}%", pn))
            .bind(page_size)
            .bind(offset)
            .fetch_all(&mut scope)
            .await
        }
        (None, None) => {
            sqlx::query_as::<_, ApqpProject>(
                only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date, target_date, actual_end_date, progress, risk_level, created_by, created_at, updated_at FROM qms.qa_apqp_projects ORDER BY created_at DESC LIMIT $1 OFFSET $2"#),
            )
            .bind(page_size)
            .bind(offset)
            .fetch_all(&mut scope)
            .await
        }
    };

    match projects {
        Ok(data) => ApiResponse::success(data, "获取APQP项目列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch APQP projects: {}", e);
            ApiResponse::server_error("获取APQP项目列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/projects",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn create_apqp_project(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateApqpProjectRequest>,
) -> ApiResponse<ApqpProject> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let project_no = format!(
        "APQP-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    // TODO(w-b6b): product_id 属跨域主数据（pdm/mdm），当前未校验属主。
    let product_id = req
        .product_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let start_dt = req.start_date.map(date_to_utc);
    let target_dt = req.target_date.map(date_to_utc);

    // 项目与其默认阶段同事务：任一环节失败整体回滚，避免“主表 200、子表缺失”。
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP创建事务失败: {}", e);
            return ApiResponse::server_error("APQP项目创建失败");
        }
    };

    let project = match sqlx::query_as::<_, ApqpProject>(
        only_own_schema_query!("qms", r#"INSERT INTO qms.qa_apqp_projects (project_no, project_name, product_id, product_name, customer, description, status, current_phase, leader, team, start_date, target_date, progress, risk_level, created_by, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, 'planning', 'phase1', $7, $8, $9, $10, 0, 'low', $11, $12) RETURNING id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date, target_date, actual_end_date, progress, risk_level, created_by, created_at, updated_at"#),
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
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(d) => d,
        Err(e) => {
            tracing::error!("Failed to create APQP project: {}", e);
            return ApiResponse::server_error("APQP项目创建失败");
        }
    };

    let project_id = match Uuid::parse_str(&project.id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::server_error("APQP项目创建失败"),
    };

    if let Err(e) = init_default_phases(&mut scope, project_id, tenant_id).await {
        tracing::error!("写入APQP默认阶段失败，整体回滚: {}", e);
        return ApiResponse::server_error("APQP项目创建失败");
    }

    if let Err(e) = scope.commit().await {
        tracing::error!("提交APQP创建事务失败: {}", e);
        return ApiResponse::server_error("APQP项目创建失败");
    }

    ApiResponse::success(project, "APQP项目创建成功")
}

async fn init_default_phases(
    scope: &mut ScopedTxn<'_>,
    project_id: Uuid,
    tenant_id: Uuid,
) -> Result<(), sqlx::Error> {
    let phases = vec![
        ("phase1", "计划和确定项目", 1),
        ("phase2", "产品设计开发", 2),
        ("phase3", "过程设计开发", 3),
        ("phase4", "产品和过程确认", 4),
        ("phase5", "反馈评定和纠正措施", 5),
    ];

    for (code, name, order) in phases {
        sqlx::query(
            only_own_schema_query!("qms", r#"INSERT INTO qms.qa_apqp_phases (project_id, phase_code, phase_name, status, sort_order, tenant_id) VALUES ($1, $2, $3, 'pending', $4, $5)"#),
        )
        .bind(project_id)
        .bind(code)
        .bind(name)
        .bind(order)
        .bind(tenant_id)
        .execute(&mut *scope)
        .await?;
    }

    Ok(())
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:apqp:read"])),
    path = "/apqp/projects/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn get_apqp_project(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<ApqpProject> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取APQP项目失败");
        }
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的APQP项目ID"),
    };

    let project = sqlx::query_as::<_, ApqpProject>(
        only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date, target_date, actual_end_date, progress, risk_level, created_by, created_at, updated_at FROM qms.qa_apqp_projects WHERE deleted_at IS NULL AND id = $1"#),
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match project {
        Ok(data) => ApiResponse::success(data, "获取APQP项目成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch APQP project: {}", e);
            ApiResponse::server_error("获取APQP项目失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/projects/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn update_apqp_project(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateApqpProjectRequest>,
) -> ApiResponse<ApqpProject> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的APQP项目ID"),
    };

    // TODO(w-b6b): product_id 属跨域主数据（pdm/mdm），当前未校验属主。
    let product_id = req
        .product_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let start_dt = req.start_date.map(date_to_utc);
    let target_dt = req.target_date.map(date_to_utc);
    let actual_end_dt = req.actual_end_date.map(date_to_utc);
    let requested_status = req.status.as_deref().map(|s| s.trim().to_ascii_lowercase());
    if let Some(target) = requested_status.as_deref() {
        if !crate::shared::fsm::is_valid_apqp_status(target) {
            return ApiResponse::bad_request("APQP项目状态不在规范集合内");
        }
    }

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP更新事务失败: {}", e);
            return ApiResponse::server_error("APQP项目更新失败");
        }
    };

    let current = sqlx::query_scalar::<_, Option<String>>(
        "SELECT status FROM qms.qa_apqp_projects WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_optional(&mut scope)
    .await;
    let current_status = match current {
        Ok(Some(raw)) => match raw.as_deref() {
            Some(value) if crate::shared::fsm::is_valid_apqp_status(value) => value.to_string(),
            _ => return ApiResponse::conflict("APQP项目状态不在规范集合内"),
        },
        Ok(None) => return ApiResponse::not_found("记录不存在"),
        Err(e) => {
            tracing::error!("读取APQP项目状态失败: {}", e);
            return ApiResponse::server_error("APQP项目更新失败");
        }
    };
    if let Some(target) = requested_status.as_deref() {
        if target != current_status
            && crate::shared::fsm::apqp_can_transition(&current_status, target).is_err()
        {
            return ApiResponse::bad_request("当前状态不允许执行该状态流转");
        }
    }

    let project = sqlx::query_as::<_, ApqpProject>(
        only_own_schema_query!("qms", r#"UPDATE qms.qa_apqp_projects SET project_name = COALESCE($2, project_name), product_id = COALESCE($3, product_id), product_name = COALESCE($4, product_name), customer = COALESCE($5, customer), description = COALESCE($6, description), status = COALESCE($7, status), current_phase = COALESCE($8, current_phase), leader = COALESCE($9, leader), team = COALESCE($10, team), start_date = COALESCE($11, start_date), target_date = COALESCE($12, target_date), actual_end_date = COALESCE($13, actual_end_date), progress = COALESCE($14, progress), risk_level = COALESCE($15, risk_level), updated_at = NOW() WHERE id = $1 AND tenant_id = $16 AND status = $17 RETURNING id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date, target_date, actual_end_date, progress, risk_level, created_by, created_at, updated_at"#),
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
    .bind(tenant_id)
    .bind(current_status)
    .fetch_one(&mut scope)
    .await;

    match project {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交APQP更新事务失败: {}", e);
                return ApiResponse::server_error("APQP项目更新失败");
            }
            ApiResponse::success(data, "APQP项目更新成功")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),
        Err(e) => {
            tracing::error!("Failed to update APQP project: {}", e);
            ApiResponse::server_error("APQP项目更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/projects/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn delete_apqp_project(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的APQP项目ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP删除事务失败: {}", e);
            return ApiResponse::server_error("APQP项目删除失败");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"UPDATE qms.qa_apqp_projects SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::not_found("APQP项目不存在"),
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交APQP删除事务失败: {}", e);
                return ApiResponse::server_error("APQP项目删除失败");
            }
            ApiResponse::success(true, "APQP项目删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete APQP project: {}", e);
            ApiResponse::server_error("APQP项目删除失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/projects/{id}/transition",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn transition_project_status(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<StatusTransitionRequest>,
) -> ApiResponse<ApqpProject> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的APQP项目ID"),
    };

    let valid_statuses = ["planning", "developing", "verifying", "released", "closed"];

    if !valid_statuses.contains(&req.target_status.as_str()) {
        return ApiResponse::bad_request("无效的状态值");
    }

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP状态流转事务失败: {}", e);
            return ApiResponse::server_error("状态流转失败");
        }
    };

    let project = sqlx::query_as::<_, ApqpProject>(
        only_own_schema_query!("qms", r#"UPDATE qms.qa_apqp_projects SET status = $2, updated_at = NOW() WHERE id = $1 AND tenant_id = $3 AND deleted_at IS NULL RETURNING id::TEXT, tenant_id::TEXT, project_no, project_name, product_id::TEXT, product_name, customer, description, status, current_phase, leader, team, start_date, target_date, actual_end_date, progress, risk_level, created_by, created_at, updated_at"#),
    )
    .bind(id)
    .bind(&req.target_status)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match project {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交APQP状态流转事务失败: {}", e);
                return ApiResponse::server_error("状态流转失败");
            }
            ApiResponse::success(data, "状态流转成功")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::conflict("项目不存在或状态已变更"),
        Err(e) => {
            tracing::error!("Failed to transition project status: {}", e);
            ApiResponse::server_error("状态流转失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:apqp:read"])),
    path = "/apqp/phases",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn list_apqp_phases(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> ApiResponse<Vec<ApqpPhase>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取APQP阶段列表失败");
        }
    };
    let project_id = match query.get("project_id") {
        Some(pid) => match Uuid::parse_str(pid) {
            Ok(u) => Some(u),
            Err(_) => return ApiResponse::bad_request("无效的项目ID"),
        },
        None => None,
    };

    let phases = if let Some(pid) = project_id {
        sqlx::query_as::<_, ApqpPhase>(
            only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_code, phase_name, description, status, start_date, end_date, actual_start_date, actual_end_date, progress, sort_order, created_at, updated_at FROM qms.qa_apqp_phases WHERE project_id = $1 ORDER BY sort_order ASC"#),
        )
        .bind(pid)
        .fetch_all(&mut scope)
        .await
    } else {
        sqlx::query_as::<_, ApqpPhase>(
            only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_code, phase_name, description, status, start_date, end_date, actual_start_date, actual_end_date, progress, sort_order, created_at, updated_at FROM qms.qa_apqp_phases ORDER BY created_at DESC LIMIT 100"#),
        )
        .fetch_all(&mut scope)
        .await
    };

    match phases {
        Ok(data) => ApiResponse::success(data, "获取APQP阶段列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch APQP phases: {}", e);
            ApiResponse::server_error("获取APQP阶段列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/phases",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn create_apqp_phase(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateApqpPhaseRequest>,
) -> ApiResponse<ApqpPhase> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let project_id = match Uuid::parse_str(&req.project_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的项目ID"),
    };

    let start_dt = req.start_date.map(date_to_utc);
    let end_dt = req.end_date.map(date_to_utc);

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP阶段创建事务失败: {}", e);
            return ApiResponse::server_error("APQP阶段创建失败");
        }
    };

    // 同域引用校验：父项目必须存在且同租户。
    match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        "SELECT COUNT(*) FROM qms.qa_apqp_projects WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"
    ))
    .bind(project_id)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(0) => return ApiResponse::bad_request("APQP项目不存在或不属于当前租户"),
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to validate APQP project: {}", e);
            return ApiResponse::server_error("APQP阶段创建失败");
        }
    }

    let phase = sqlx::query_as::<_, ApqpPhase>(
        only_own_schema_query!("qms", r#"INSERT INTO qms.qa_apqp_phases (project_id, phase_code, phase_name, description, status, start_date, end_date, sort_order, tenant_id) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8) RETURNING id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_code, phase_name, description, status, start_date, end_date, actual_start_date, actual_end_date, progress, sort_order, created_at, updated_at"#),
    )
    .bind(project_id)
    .bind(req.phase_code)
    .bind(req.phase_name)
    .bind(req.description)
    .bind(start_dt)
    .bind(end_dt)
    .bind(req.sort_order.unwrap_or(0))
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match phase {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交APQP阶段创建事务失败: {}", e);
                return ApiResponse::server_error("APQP阶段创建失败");
            }
            ApiResponse::success(data, "APQP阶段创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create APQP phase: {}", e);
            ApiResponse::server_error("APQP阶段创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:apqp:read"])),
    path = "/apqp/phases/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn get_apqp_phase(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<ApqpPhase> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取APQP阶段失败");
        }
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的阶段ID"),
    };

    let phase = sqlx::query_as::<_, ApqpPhase>(
        only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_code, phase_name, description, status, start_date, end_date, actual_start_date, actual_end_date, progress, sort_order, created_at, updated_at FROM qms.qa_apqp_phases WHERE id = $1"#),
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match phase {
        Ok(data) => ApiResponse::success(data, "获取APQP阶段成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch APQP phase: {}", e);
            ApiResponse::server_error("获取APQP阶段失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/phases/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn update_apqp_phase(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateApqpPhaseRequest>,
) -> ApiResponse<ApqpPhase> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的阶段ID"),
    };

    let start_dt = req.start_date.map(date_to_utc);
    let end_dt = req.end_date.map(date_to_utc);
    let actual_start_dt = req.actual_start_date.map(date_to_utc);
    let actual_end_dt = req.actual_end_date.map(date_to_utc);

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP阶段更新事务失败: {}", e);
            return ApiResponse::server_error("APQP阶段更新失败");
        }
    };

    let phase = sqlx::query_as::<_, ApqpPhase>(
        only_own_schema_query!("qms", r#"UPDATE qms.qa_apqp_phases SET phase_name = COALESCE($2, phase_name), description = COALESCE($3, description), status = COALESCE($4, status), start_date = COALESCE($5, start_date), end_date = COALESCE($6, end_date), actual_start_date = COALESCE($7, actual_start_date), actual_end_date = COALESCE($8, actual_end_date), progress = COALESCE($9, progress), sort_order = COALESCE($10, sort_order), updated_at = NOW() WHERE id = $1 AND tenant_id = $11 RETURNING id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_code, phase_name, description, status, start_date, end_date, actual_start_date, actual_end_date, progress, sort_order, created_at, updated_at"#),
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
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match phase {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交APQP阶段更新事务失败: {}", e);
                return ApiResponse::server_error("APQP阶段更新失败");
            }
            ApiResponse::success(data, "APQP阶段更新成功")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),
        Err(e) => {
            tracing::error!("Failed to update APQP phase: {}", e);
            ApiResponse::server_error("APQP阶段更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/phases/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn delete_apqp_phase(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的阶段ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP阶段删除事务失败: {}", e);
            return ApiResponse::server_error("APQP阶段删除失败");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"DELETE FROM qms.qa_apqp_phases WHERE id = $1 AND tenant_id = $2"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::not_found("APQP阶段不存在"),
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交APQP阶段删除事务失败: {}", e);
                return ApiResponse::server_error("APQP阶段删除失败");
            }
            ApiResponse::success(true, "APQP阶段删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete APQP phase: {}", e);
            ApiResponse::server_error("APQP阶段删除失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:apqp:read"])),
    path = "/apqp/tasks",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn list_apqp_tasks(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<ApqpTaskQuery>,
) -> ApiResponse<Vec<ApqpTask>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取APQP任务列表失败");
        }
    };
    let project_id = query
        .project_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let phase_id = query
        .phase_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let mut sql = String::from(
        "SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_id::TEXT, task_name, description, task_type, deliverable, status, assignee, due_date, completed_at, sort_order, created_at, updated_at FROM qms.qa_apqp_tasks WHERE 1=1",
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

    let mut query_builder = sqlx::query_as::<_, ApqpTask>(sqlx::AssertSqlSafe(sql));
    for param in &params {
        query_builder = query_builder.bind(param);
    }

    let tasks = query_builder.fetch_all(&mut scope).await;

    match tasks {
        Ok(data) => ApiResponse::success(data, "获取APQP任务列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch APQP tasks: {}", e);
            ApiResponse::server_error("获取APQP任务列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/tasks",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn create_apqp_task(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateApqpTaskRequest>,
) -> ApiResponse<ApqpTask> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let project_id = match Uuid::parse_str(&req.project_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的项目ID"),
    };
    let phase_id = match Uuid::parse_str(&req.phase_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的阶段ID"),
    };

    let due_dt = req.due_date.map(date_to_utc);

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP任务创建事务失败: {}", e);
            return ApiResponse::server_error("APQP任务创建失败");
        }
    };

    // 同域引用校验：父项目与阶段都必须存在且同租户。
    match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        "SELECT COUNT(*) FROM qms.qa_apqp_projects WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"
    ))
    .bind(project_id)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(0) => return ApiResponse::bad_request("APQP项目不存在或不属于当前租户"),
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to validate APQP project: {}", e);
            return ApiResponse::server_error("APQP任务创建失败");
        }
    }
    match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        "SELECT COUNT(*) FROM qms.qa_apqp_phases WHERE id = $1 AND project_id = $2 AND tenant_id = $3"
    ))
    .bind(phase_id)
    .bind(project_id)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(0) => return ApiResponse::bad_request("APQP阶段不存在或不属于当前租户"),
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to validate APQP phase: {}", e);
            return ApiResponse::server_error("APQP任务创建失败");
        }
    }

    let task = sqlx::query_as::<_, ApqpTask>(
        only_own_schema_query!("qms", r#"INSERT INTO qms.qa_apqp_tasks (project_id, phase_id, task_name, description, task_type, deliverable, status, assignee, due_date, sort_order, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10) RETURNING id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_id::TEXT, task_name, description, task_type, deliverable, status, assignee, due_date, completed_at, sort_order, created_at, updated_at"#),
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
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match task {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交APQP任务创建事务失败: {}", e);
                return ApiResponse::server_error("APQP任务创建失败");
            }
            ApiResponse::success(data, "APQP任务创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create APQP task: {}", e);
            ApiResponse::server_error("APQP任务创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:apqp:read"])),
    path = "/apqp/tasks/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn get_apqp_task(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<ApqpTask> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取APQP任务失败");
        }
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的任务ID"),
    };

    let task = sqlx::query_as::<_, ApqpTask>(
        only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_id::TEXT, task_name, description, task_type, deliverable, status, assignee, due_date, completed_at, sort_order, created_at, updated_at FROM qms.qa_apqp_tasks WHERE id = $1"#),
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match task {
        Ok(data) => ApiResponse::success(data, "获取APQP任务成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch APQP task: {}", e);
            ApiResponse::server_error("获取APQP任务失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/tasks/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn update_apqp_task(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateApqpTaskRequest>,
) -> ApiResponse<ApqpTask> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的任务ID"),
    };

    let due_dt = req.due_date.map(date_to_utc);
    let completed_dt = req.completed_at.map(date_to_utc);

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP任务更新事务失败: {}", e);
            return ApiResponse::server_error("APQP任务更新失败");
        }
    };

    let task = sqlx::query_as::<_, ApqpTask>(
        only_own_schema_query!("qms", r#"UPDATE qms.qa_apqp_tasks SET task_name = COALESCE($2, task_name), description = COALESCE($3, description), task_type = COALESCE($4, task_type), deliverable = COALESCE($5, deliverable), status = COALESCE($6, status), assignee = COALESCE($7, assignee), due_date = COALESCE($8, due_date), completed_at = COALESCE($9, completed_at), sort_order = COALESCE($10, sort_order), updated_at = NOW() WHERE id = $1 AND tenant_id = $11 RETURNING id::TEXT, tenant_id::TEXT, project_id::TEXT, phase_id::TEXT, task_name, description, task_type, deliverable, status, assignee, due_date, completed_at, sort_order, created_at, updated_at"#),
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
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match task {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交APQP任务更新事务失败: {}", e);
                return ApiResponse::server_error("APQP任务更新失败");
            }
            ApiResponse::success(data, "APQP任务更新成功")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),
        Err(e) => {
            tracing::error!("Failed to update APQP task: {}", e);
            ApiResponse::server_error("APQP任务更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/tasks/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn delete_apqp_task(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
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
            tracing::error!("开启APQP任务删除事务失败: {}", e);
            return ApiResponse::server_error("APQP任务删除失败");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"DELETE FROM qms.qa_apqp_tasks WHERE id = $1 AND tenant_id = $2"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::not_found("APQP任务不存在"),
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交APQP任务删除事务失败: {}", e);
                return ApiResponse::server_error("APQP任务删除失败");
            }
            ApiResponse::success(true, "APQP任务删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete APQP task: {}", e);
            ApiResponse::server_error("APQP任务删除失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:apqp:read"])),
    path = "/apqp/risks",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn list_apqp_risks(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<ApqpRiskQuery>,
) -> ApiResponse<Vec<ApqpRisk>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取APQP风险列表失败");
        }
    };
    let project_id = query
        .project_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());

    let mut sql = String::from(
        "SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, risk_name, description, risk_category, severity, occurrence, detection, rpn, status, mitigation_plan, responsible, target_date, created_at, updated_at FROM qms.qa_apqp_risks WHERE 1=1",
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

    let mut query_builder = sqlx::query_as::<_, ApqpRisk>(sqlx::AssertSqlSafe(sql));
    for param in &params {
        if param.is_string() {
            query_builder = query_builder.bind(param.as_str());
        } else if param.is_number() {
            let num_val = param.as_i64().unwrap_or(0) as i32;
            query_builder = query_builder.bind(num_val);
        }
    }

    let risks = query_builder.fetch_all(&mut scope).await;

    match risks {
        Ok(data) => ApiResponse::success(data, "获取APQP风险列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch APQP risks: {}", e);
            ApiResponse::server_error("获取APQP风险列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/risks",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn create_apqp_risk(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateApqpRiskRequest>,
) -> ApiResponse<ApqpRisk> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let project_id = match Uuid::parse_str(&req.project_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的项目ID"),
    };

    let rpn = req.severity * req.occurrence * req.detection;
    let target_dt = req.target_date.map(date_to_utc);

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP风险创建事务失败: {}", e);
            return ApiResponse::server_error("APQP风险创建失败");
        }
    };

    // 同域引用校验：父项目必须存在且同租户。
    match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        "SELECT COUNT(*) FROM qms.qa_apqp_projects WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"
    ))
    .bind(project_id)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(0) => return ApiResponse::bad_request("APQP项目不存在或不属于当前租户"),
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to validate APQP project: {}", e);
            return ApiResponse::server_error("APQP风险创建失败");
        }
    }

    let risk = sqlx::query_as::<_, ApqpRisk>(
        only_own_schema_query!("qms", r#"INSERT INTO qms.qa_apqp_risks (project_id, risk_name, description, risk_category, severity, occurrence, detection, rpn, status, mitigation_plan, responsible, target_date, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open', $9, $10, $11, $12) RETURNING id::TEXT, tenant_id::TEXT, project_id::TEXT, risk_name, description, risk_category, severity, occurrence, detection, rpn, status, mitigation_plan, responsible, target_date, created_at, updated_at"#),
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
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match risk {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交APQP风险创建事务失败: {}", e);
                return ApiResponse::server_error("APQP风险创建失败");
            }
            ApiResponse::success(data, "APQP风险创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create APQP risk: {}", e);
            ApiResponse::server_error("APQP风险创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:apqp:read"])),
    path = "/apqp/risks/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn get_apqp_risk(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<ApqpRisk> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取APQP风险失败");
        }
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的风险ID"),
    };

    let risk = sqlx::query_as::<_, ApqpRisk>(
        only_own_schema_query!("qms", r#"SELECT id::TEXT, tenant_id::TEXT, project_id::TEXT, risk_name, description, risk_category, severity, occurrence, detection, rpn, status, mitigation_plan, responsible, target_date, created_at, updated_at FROM qms.qa_apqp_risks WHERE id = $1"#),
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match risk {
        Ok(data) => ApiResponse::success(data, "获取APQP风险成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch APQP risk: {}", e);
            ApiResponse::server_error("获取APQP风险失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/risks/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn update_apqp_risk(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateApqpRiskRequest>,
) -> ApiResponse<ApqpRisk> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的风险ID"),
    };

    let target_dt = req.target_date.map(date_to_utc);

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP风险更新事务失败: {}", e);
            return ApiResponse::server_error("APQP风险更新失败");
        }
    };

    let risk = sqlx::query_as::<_, ApqpRisk>(
        only_own_schema_query!("qms", r#"UPDATE qms.qa_apqp_risks SET risk_name = COALESCE($2, risk_name), description = COALESCE($3, description), risk_category = COALESCE($4, risk_category), severity = COALESCE($5, severity), occurrence = COALESCE($6, occurrence), detection = COALESCE($7, detection), rpn = COALESCE($5, severity) * COALESCE($6, occurrence) * COALESCE($7, detection), status = COALESCE($8, status), mitigation_plan = COALESCE($9, mitigation_plan), responsible = COALESCE($10, responsible), target_date = COALESCE($11, target_date), updated_at = NOW() WHERE id = $1 AND tenant_id = $12 RETURNING id::TEXT, tenant_id::TEXT, project_id::TEXT, risk_name, description, risk_category, severity, occurrence, detection, rpn, status, mitigation_plan, responsible, target_date, created_at, updated_at"#),
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
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match risk {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交APQP风险更新事务失败: {}", e);
                return ApiResponse::server_error("APQP风险更新失败");
            }
            ApiResponse::success(data, "APQP风险更新成功")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),
        Err(e) => {
            tracing::error!("Failed to update APQP risk: {}", e);
            ApiResponse::server_error("APQP风险更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/risks/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn delete_apqp_risk(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的风险ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP风险删除事务失败: {}", e);
            return ApiResponse::server_error("APQP风险删除失败");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"DELETE FROM qms.qa_apqp_risks WHERE id = $1 AND tenant_id = $2"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::not_found("APQP风险不存在"),
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交APQP风险删除事务失败: {}", e);
                return ApiResponse::server_error("APQP风险删除失败");
            }
            ApiResponse::success(true, "APQP风险删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete APQP risk: {}", e);
            ApiResponse::server_error("APQP风险删除失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:apqp:read"])),
    path = "/apqp/projects/{id}/progress",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
#[allow(clippy::as_conversions, clippy::cast_precision_loss)]
pub async fn get_apqp_progress(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<ApqpProgressStatistics> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取APQP进度统计失败");
        }
    };
    let project_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的项目ID"),
    };

    let total_phases: Option<i64> = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        r#"SELECT COUNT(*) FROM qms.qa_apqp_phases WHERE project_id = $1"#
    ))
    .bind(project_id)
    .fetch_one(&mut scope)
    .await
    .ok();
    let total_phases = total_phases.unwrap_or(0);

    let completed_phases: Option<i64> = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        r#"SELECT COUNT(*) FROM qms.qa_apqp_phases WHERE project_id = $1 AND status = 'completed'"#
    ))
    .bind(project_id)
    .fetch_one(&mut scope)
    .await
    .ok();
    let completed_phases = completed_phases.unwrap_or(0);

    let total_tasks: Option<i64> = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        r#"SELECT COUNT(*) FROM qms.qa_apqp_tasks WHERE project_id = $1"#
    ))
    .bind(project_id)
    .fetch_one(&mut scope)
    .await
    .ok();
    let total_tasks = total_tasks.unwrap_or(0);

    let completed_tasks: Option<i64> = sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        r#"SELECT COUNT(*) FROM qms.qa_apqp_tasks WHERE project_id = $1 AND status = 'completed'"#
    ))
    .bind(project_id)
    .fetch_one(&mut scope)
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
    .fetch_all(&mut scope)
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
            .fetch_one(&mut scope)
            .await
            .ok();
            let phase_total_tasks = phase_total.unwrap_or(0);

            let phase_completed: Option<i64> = sqlx::query_scalar::<_, i64>(
                only_own_schema_query!("qms", r#"SELECT COUNT(*) FROM qms.qa_apqp_tasks WHERE phase_id = $1 AND status = 'completed'"#),
            )
            .bind(pid)
            .fetch_one(&mut scope)
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

    ApiResponse::success(stats, "获取APQP进度统计成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:apqp:read"])),
    path = "/apqp/approvals",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn list_apqp_approvals(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<std::collections::HashMap<String, String>>,
) -> ApiResponse<Vec<ApqpApproval>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取APQP审批列表失败");
        }
    };
    let project_id = query
        .get("project_id")
        .and_then(|s| Uuid::parse_str(s).ok());

    let approvals = if let Some(pid) = project_id {
        sqlx::query_as::<_, ApqpApproval>(
            only_own_schema_query!("qms", r#"SELECT id::TEXT, project_id::TEXT, approval_type, status, applicant, approver, comment, submitted_at, approved_at, created_at FROM qms.qa_apqp_approvals WHERE project_id = $1 ORDER BY created_at DESC"#),
        )
        .bind(pid)
        .fetch_all(&mut scope)
        .await
    } else {
        sqlx::query_as::<_, ApqpApproval>(
            only_own_schema_query!("qms", r#"SELECT id::TEXT, project_id::TEXT, approval_type, status, applicant, approver, comment, submitted_at, approved_at, created_at FROM qms.qa_apqp_approvals ORDER BY created_at DESC LIMIT 100"#),
        )
        .fetch_all(&mut scope)
        .await
    };

    match approvals {
        Ok(data) => ApiResponse::success(data, "获取APQP审批列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch APQP approvals: {}", e);
            ApiResponse::server_error("获取APQP审批列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/approvals",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn create_apqp_approval(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateApqpApprovalRequest>,
) -> ApiResponse<ApqpApproval> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let project_id = match Uuid::parse_str(&req.project_id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的项目ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP审批创建事务失败: {}", e);
            return ApiResponse::server_error("APQP审批创建失败");
        }
    };

    // 同域引用校验：父项目必须存在且同租户。
    match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
        "qms",
        "SELECT COUNT(*) FROM qms.qa_apqp_projects WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"
    ))
    .bind(project_id)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await
    {
        Ok(0) => return ApiResponse::bad_request("APQP项目不存在或不属于当前租户"),
        Ok(_) => {}
        Err(e) => {
            tracing::error!("Failed to validate APQP project: {}", e);
            return ApiResponse::server_error("APQP审批创建失败");
        }
    }

    // qa_apqp_approvals 无 tenant_id 列（表无 RLS），租户隔离通过父项目属主保证。
    let approval = sqlx::query_as::<_, ApqpApproval>(
        only_own_schema_query!("qms", r#"INSERT INTO qms.qa_apqp_approvals (project_id, approval_type, status, applicant, comment) VALUES ($1, $2, 'pending', $3, $4) RETURNING id::TEXT, project_id::TEXT, approval_type, status, applicant, approver, comment, submitted_at, approved_at, created_at"#),
    )
    .bind(project_id)
    .bind(req.approval_type)
    .bind(req.applicant)
    .bind(req.comment)
    .fetch_one(&mut scope)
    .await;

    match approval {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交APQP审批创建事务失败: {}", e);
                return ApiResponse::server_error("APQP审批创建失败");
            }
            ApiResponse::success(data, "APQP审批创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create APQP approval: {}", e);
            ApiResponse::server_error("APQP审批创建失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/approvals/{id}/process",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn process_apqp_approval(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<ProcessApprovalRequest>,
) -> ApiResponse<ApqpApproval> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的审批ID"),
    };

    let status = if req.approved { "approved" } else { "rejected" };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP审批处理事务失败: {}", e);
            return ApiResponse::server_error("APQP审批处理失败");
        }
    };

    let approval = sqlx::query_as::<_, ApqpApproval>(
        only_own_schema_query!("qms", r#"UPDATE qms.qa_apqp_approvals SET status = $2, approver = $3, comment = COALESCE($4, comment), approved_at = NOW() WHERE id = $1 AND project_id IN (SELECT id FROM qms.qa_apqp_projects WHERE tenant_id = $5 AND deleted_at IS NULL) RETURNING id::TEXT, project_id::TEXT, approval_type, status, applicant, approver, comment, submitted_at, approved_at, created_at"#),
    )
    .bind(id)
    .bind(status)
    .bind(req.approver)
    .bind(req.comment)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match approval {
        Ok(data) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("提交APQP审批处理事务失败: {}", e);
                return ApiResponse::server_error("APQP审批处理失败");
            }
            ApiResponse::success(data, "APQP审批处理成功")
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::conflict("审批记录不存在或状态已变更"),
        Err(e) => {
            tracing::error!("Failed to process APQP approval: {}", e);
            ApiResponse::server_error("APQP审批处理失败")
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
#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/projects/{id}/approve",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn approve_apqp(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<ApqpApprovalRequest>,
) -> ApiResponse<ApqpProject> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的APQP项目ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP审批事务失败: {}", e);
            return ApiResponse::server_error("审批失败");
        }
    };

    let current = sqlx::query(only_own_schema_query!(
        "qms",
        "SELECT status FROM qms.qa_apqp_projects WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"
    ))
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if apqp_requires_approval(&current_status, STATUS_IN_PRODUCTION)
                && !crate::shared::permission::has_qms_permission(&claims, "apqp.approve")
            {
                return ApiResponse::forbidden("无审批权限");
            }
            if apqp_can_transition(&current_status, STATUS_IN_PRODUCTION).is_err() {
                return ApiResponse::bad_request("当前状态不允许审批通过");
            }
            let project = sqlx::query_as::<_, ApqpProject>(sqlx::AssertSqlSafe(format!("UPDATE qms.qa_apqp_projects SET status = '{}', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = $3 RETURNING {}", STATUS_IN_PRODUCTION, APQP_SELECT_COLS)))
                .bind(id)
                .bind(tenant_id)
                .bind(&current_status)
                .fetch_optional(&mut scope)
                .await;
            match project {
                Ok(Some(data)) => {
                    if let Err(e) = crate::models::audit_log::log_approval_event(
                        &mut scope,
                        &tenant_id.to_string(),
                        "apqp",
                        &id.to_string(),
                        "approve",
                        &req.operator,
                        &current_status,
                        STATUS_IN_PRODUCTION,
                        req.comment.as_deref(),
                    )
                    .await
                    {
                        tracing::error!("写入APQP审批事件失败，整体回滚: {}", e);
                        return ApiResponse::server_error("审批失败");
                    }
                    if let Err(e) = scope.commit().await {
                        tracing::error!("提交APQP审批事务失败: {}", e);
                        return ApiResponse::server_error("审批失败");
                    }
                    ApiResponse::success(data, "审批通过")
                }
                Ok(None) => ApiResponse::conflict("APQP项目状态已变更，请刷新后重试"),
                Err(sqlx::Error::RowNotFound) => ApiResponse::conflict("项目不存在或状态已变更"),
                Err(e) => {
                    tracing::error!("Failed to approve APQP: {}", e);
                    ApiResponse::server_error("审批失败")
                }
            }
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::conflict("APQP项目不存在或状态已变更"),
        Err(e) => {
            tracing::error!("Failed to find APQP project: {}", e);
            ApiResponse::server_error("审批失败")
        }
    }
}

/// APV-4: 完成审批 (in_production → completed, requires_approval)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/projects/{id}/complete",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn complete_apqp(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<ApqpApprovalRequest>,
) -> ApiResponse<ApqpProject> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的APQP项目ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP完成事务失败: {}", e);
            return ApiResponse::server_error("完成失败");
        }
    };

    let current = sqlx::query(only_own_schema_query!(
        "qms",
        "SELECT status FROM qms.qa_apqp_projects WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"
    ))
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if apqp_requires_approval(&current_status, STATUS_COMPLETED)
                && !crate::shared::permission::has_qms_permission(&claims, "apqp.approve")
            {
                return ApiResponse::forbidden("无审批权限");
            }
            if apqp_can_transition(&current_status, STATUS_COMPLETED).is_err() {
                return ApiResponse::bad_request("当前状态不允许完成");
            }
            let project = sqlx::query_as::<_, ApqpProject>(sqlx::AssertSqlSafe(format!("UPDATE qms.qa_apqp_projects SET status = '{}', actual_end_date = COALESCE(actual_end_date, NOW()), progress = 100, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = $3 RETURNING {}", STATUS_COMPLETED, APQP_SELECT_COLS)))
                .bind(id)
                .bind(tenant_id)
                .bind(&current_status)
                .fetch_optional(&mut scope)
                .await;
            match project {
                Ok(Some(data)) => {
                    if let Err(e) = crate::models::audit_log::log_approval_event(
                        &mut scope,
                        &tenant_id.to_string(),
                        "apqp",
                        &id.to_string(),
                        "complete",
                        &req.operator,
                        &current_status,
                        STATUS_COMPLETED,
                        req.comment.as_deref(),
                    )
                    .await
                    {
                        tracing::error!("写入APQP完成事件失败，整体回滚: {}", e);
                        return ApiResponse::server_error("完成失败");
                    }
                    if let Err(e) = scope.commit().await {
                        tracing::error!("提交APQP完成事务失败: {}", e);
                        return ApiResponse::server_error("完成失败");
                    }
                    ApiResponse::success(data, "APQP项目已完成")
                }
                Ok(None) => ApiResponse::conflict("APQP项目状态已变更，请刷新后重试"),
                Err(sqlx::Error::RowNotFound) => ApiResponse::conflict("项目不存在或状态已变更"),
                Err(e) => {
                    tracing::error!("Failed to complete APQP: {}", e);
                    ApiResponse::server_error("完成失败")
                }
            }
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::conflict("APQP项目不存在或状态已变更"),
        Err(e) => {
            tracing::error!("Failed to find APQP project: {}", e);
            ApiResponse::server_error("完成失败")
        }
    }
}

/// APV-4: 取消 (任意非终态 → cancelled)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:apqp:write"])),
    path = "/apqp/projects/{id}/cancel",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "apqp"
)]
pub async fn cancel_apqp(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<ApqpApprovalRequest>,
) -> ApiResponse<ApqpProject> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的APQP项目ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("开启APQP取消事务失败: {}", e);
            return ApiResponse::server_error("取消失败");
        }
    };

    let current = sqlx::query(only_own_schema_query!(
        "qms",
        "SELECT status FROM qms.qa_apqp_projects WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"
    ))
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if apqp_can_transition(&current_status, STATUS_CANCELLED).is_err() {
                return ApiResponse::bad_request("当前状态不允许取消");
            }
            let project = sqlx::query_as::<_, ApqpProject>(sqlx::AssertSqlSafe(format!("UPDATE qms.qa_apqp_projects SET status = '{}', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = $3 RETURNING {}", STATUS_CANCELLED, APQP_SELECT_COLS)))
                .bind(id)
                .bind(tenant_id)
                .bind(&current_status)
                .fetch_optional(&mut scope)
                .await;
            match project {
                Ok(Some(data)) => {
                    if let Err(e) = crate::models::audit_log::log_approval_event(
                        &mut scope,
                        &tenant_id.to_string(),
                        "apqp",
                        &id.to_string(),
                        "cancel",
                        &req.operator,
                        &current_status,
                        STATUS_CANCELLED,
                        req.comment.as_deref(),
                    )
                    .await
                    {
                        tracing::error!("写入APQP取消事件失败，整体回滚: {}", e);
                        return ApiResponse::server_error("取消失败");
                    }
                    if let Err(e) = scope.commit().await {
                        tracing::error!("提交APQP取消事务失败: {}", e);
                        return ApiResponse::server_error("取消失败");
                    }
                    ApiResponse::success(data, "APQP项目已取消")
                }
                Ok(None) => ApiResponse::conflict("APQP项目状态已变更，请刷新后重试"),
                Err(sqlx::Error::RowNotFound) => ApiResponse::conflict("项目不存在或状态已变更"),
                Err(e) => {
                    tracing::error!("Failed to cancel APQP: {}", e);
                    ApiResponse::server_error("取消失败")
                }
            }
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::conflict("APQP项目不存在或状态已变更"),
        Err(e) => {
            tracing::error!("Failed to find APQP project: {}", e);
            ApiResponse::server_error("取消失败")
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
