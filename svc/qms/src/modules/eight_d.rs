//! 8D Problem Solving handlers

use crate::models::eight_d::*;
use crate::shared::fsm::{eight_d_can_transition, eight_d_requires_approval};
use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::auth::Claims;
use topems_shared_auth::middleware::tenant::RlsTxnCell;
use topems_shared_auth::{get_tenant_id, require_tenant};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

const STATUS_VERIFIED: &str = "verified";
const STATUS_CLOSED: &str = "closed";
const STATUS_CANCELLED: &str = "cancelled";

/// 读回用列（uuid 列转 TEXT，避免 String 解码 uuid 失败）。
const EIGHTD_SELECT_CAST: &str = r#"id::TEXT AS id, tenant_id::TEXT AS tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at, d7_preventive_action, d8_congratulations, d8_closed_at, assignee, due_date, created_by, created_at, updated_at"#;

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:eightd:read"])),
    path = "/eightd",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn list_eightd_reports(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<EightDQuery>,
) -> ApiResponse<ListEightDReportsResponse> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取8D报告列表失败");
        }
    };
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = Vec::new();
    let mut where_clause = String::from(" WHERE 1=1");
    let mut __has_tenant = false;
    if !claims.is_superuser {
        where_clause = String::from(" WHERE tenant_id = $1::uuid");
        __has_tenant = true;
    }
    if __has_tenant {
        params.push(tenant_id.to_string());
    }

    if let Some(status) = &query.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(status.clone());
    }

    if let Some(severity) = &query.severity {
        where_clause.push_str(&format!(" AND severity = ${}", params.len() + 1));
        params.push(severity.clone());
    }

    if let Some(assignee) = &query.assignee {
        where_clause.push_str(&format!(" AND assignee = ${}", params.len() + 1));
        params.push(assignee.clone());
    }

    if let Some(search) = &query.search {
        let pattern = format!("%{}%", search);
        where_clause.push_str(&format!(
            " AND (report_no ILIKE ${} OR title ILIKE ${})",
            params.len() + 1,
            params.len() + 1
        ));
        params.push(pattern);
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM qms.qa_eightd_reports{}",
        where_clause
    );

    let mut count_query = sqlx::query_scalar(sqlx::AssertSqlSafe(count_sql));
    for p in &params {
        count_query = count_query.bind(p.clone());
    }

    let total: Option<i64> = match count_query.fetch_one(&mut scope).await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count 8D reports: {}", e);
            return ApiResponse::server_error("获取8D报告列表失败");
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT id::TEXT AS id, tenant_id::TEXT AS tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT,
            d1_team, d1_leader, d2_problem_description, d3_containment_action,
            d3_implemented_at, d4_root_cause, d4_cause_analysis,
            d5_permanent_action, d6_verification_result, d6_verified_at,
            d7_preventive_action, d8_congratulations, d8_closed_at,
            assignee, due_date, created_by, created_at, updated_at
        FROM qms.qa_eightd_reports
        {}
        ORDER BY created_at DESC
        LIMIT ${} OFFSET ${}
        "#,
        where_clause,
        params.len() + 1,
        params.len() + 2
    );

    let mut fetch_query = sqlx::query_as::<_, EightDReport>(sqlx::AssertSqlSafe(fetch_sql));
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
    }
    fetch_query = fetch_query.bind(page_size).bind(offset);

    match fetch_query.fetch_all(&mut scope).await {
        Ok(data) => ApiResponse::success(
            ListEightDReportsResponse {
                reports: data,
                total: total.unwrap_or(0),
                page,
                page_size,
            },
            "获取8D报告列表成功",
        ),
        Err(e) => {
            tracing::error!("Failed to fetch 8D reports: {}", e);
            ApiResponse::server_error("获取8D报告列表失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:eightd:write"])),
    path = "/eightd",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn create_eightd_report(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateEightDRequest>,
) -> ApiResponse<EightDReport> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let report_no = format!(
        "8D-{}",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );

    let related_issue_id = req
        .related_issue_id
        .as_ref()
        .and_then(|s| Uuid::parse_str(s).ok());
    let due_dt = req
        .due_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("8D报告创建失败");
        }
    };

    // 同域引用校验：关联质量问题必须存在且同租户，否则 400。
    if let Some(iid) = related_issue_id {
        match sqlx::query_scalar::<_, i64>(only_own_schema_query!(
            "qms",
            "SELECT COUNT(*) FROM qms.qa_quality_issues WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"
        ))
        .bind(iid)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
        {
            Ok(0) => return ApiResponse::bad_request("关联质量问题不存在或不属于当前租户"),
            Ok(_) => {}
            Err(e) => {
                tracing::error!("Failed to validate related issue: {}", e);
                return ApiResponse::server_error("8D报告创建失败");
            }
        }
    }

    let report = sqlx::query_as::<_, EightDReport>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_reports (tenant_id, report_no, title, severity, priority, related_issue_id, d2_problem_description, status, assignee, due_date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', $8, $9, $10) RETURNING id::TEXT, tenant_id::TEXT, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at, d7_preventive_action, d8_congratulations, d8_closed_at, assignee, due_date, created_by, created_at, updated_at"#)).bind(tenant_id).bind(report_no).bind(req.title).bind(req.severity).bind(req.priority).bind(related_issue_id).bind(req.d2_problem_description).bind(req.assignee).bind(due_dt).bind(req.created_by)
    .fetch_one(&mut scope)
    .await;

    match report {
        Ok(data) => {
            let report_id = Uuid::parse_str(&data.id).ok();
            let created_by = data.created_by.clone();
            if let Some(rid) = report_id {
                // 子表与主表同事务：写失败整体回滚，禁止"主表 200、审计缺失"。
                if let Err(e) = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, operator, comment) VALUES ($1, $2, 'create', 'D2', $3, '创建8D报告')"#)).bind(tenant_id).bind(rid).bind(created_by)
                .execute(&mut scope)
                .await
                {
                    tracing::error!("Failed to write 8D audit log: {}", e);
                    return ApiResponse::server_error("8D报告创建失败");
                }
            }
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit 8D create: {}", e);
                return ApiResponse::server_error("8D报告创建失败");
            }
            ApiResponse::success(data, "8D报告创建成功")
        }
        Err(e) => {
            tracing::error!("Failed to create 8D report: {}", e);
            ApiResponse::server_error("8D报告创建失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:eightd:read"])),
    path = "/eightd/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn get_eightd_report(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<EightDReport> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取8D报告失败");
        }
    };
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的8D报告ID"),
    };

    let report = sqlx::query_as::<_, EightDReport>(only_own_schema_query!("qms", r#"SELECT id::TEXT AS id, tenant_id::TEXT AS tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at, d7_preventive_action, d8_congratulations, d8_closed_at, assignee, due_date, created_by, created_at, updated_at FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"#)).bind(id).bind(tenant_opt)
    .fetch_one(&mut scope)
    .await;

    match report {
        Ok(data) => ApiResponse::success(data, "获取8D报告成功"),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch 8D report: {}", e);
            ApiResponse::server_error("获取8D报告失败")
        }
    }
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["qms:eightd:write"])),
    path = "/eightd/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn update_eightd_report(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateEightDRequest>,
) -> ApiResponse<EightDReport> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的8D报告ID"),
    };

    let due_dt = req
        .due_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("8D报告更新失败");
        }
    };

    let updated = sqlx::query(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET title = COALESCE($2, title), status = COALESCE($3, status), severity = COALESCE($4, severity), priority = COALESCE($5, priority), d1_team = COALESCE($6, d1_team), d1_leader = COALESCE($7, d1_leader), d2_problem_description = COALESCE($8, d2_problem_description), d3_containment_action = COALESCE($9, d3_containment_action), d4_root_cause = COALESCE($10, d4_root_cause), d4_cause_analysis = COALESCE($11, d4_cause_analysis), d5_permanent_action = COALESCE($12, d5_permanent_action), d6_verification_result = COALESCE($13, d6_verification_result), d7_preventive_action = COALESCE($14, d7_preventive_action), d8_congratulations = COALESCE($15, d8_congratulations), assignee = COALESCE($16, assignee), due_date = COALESCE($17, due_date), updated_at = NOW() WHERE id = $1 AND tenant_id = $18 AND deleted_at IS NULL"#)).bind(id).bind(req.title).bind(req.status).bind(req.severity).bind(req.priority).bind(req.d1_team).bind(req.d1_leader).bind(req.d2_problem_description).bind(req.d3_containment_action).bind(req.d4_root_cause).bind(req.d4_cause_analysis).bind(req.d5_permanent_action).bind(req.d6_verification_result).bind(req.d7_preventive_action).bind(req.d8_congratulations).bind(req.assignee).bind(due_dt).bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::not_found("记录不存在"),
        Ok(_) => match sqlx::query_as::<_, EightDReport>(sqlx::AssertSqlSafe(format!(
            "SELECT {} FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
            EIGHTD_SELECT_CAST
        )))
        .bind(id)
        .bind(tenant_id)
        .fetch_one(&mut scope)
        .await
        {
            Ok(data) => {
                if let Err(e) = scope.commit().await {
                    tracing::error!("Failed to commit 8D update: {}", e);
                    return ApiResponse::server_error("8D报告更新失败");
                }
                ApiResponse::success(data, "8D报告更新成功")
            }
            Err(e) => {
                tracing::error!("Failed to reload 8D report: {}", e);
                ApiResponse::server_error("8D报告更新失败")
            }
        },
        Err(e) => {
            tracing::error!("Failed to update 8D report: {}", e);
            ApiResponse::server_error("8D报告更新失败")
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["qms:eightd:write"])),
    path = "/eightd/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn delete_eightd_report(
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
        Err(_) => return ApiResponse::bad_request("无效的8D报告ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("8D报告删除失败");
        }
    };

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"UPDATE qms.qa_eightd_reports SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&mut scope)
    .await;

    match result {
        Ok(r) if r.rows_affected() == 0 => ApiResponse::not_found("8D报告不存在或已删除"),
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit 8D delete: {}", e);
                return ApiResponse::server_error("8D报告删除失败");
            }
            ApiResponse::success(true, "8D报告删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete 8D report: {}", e);
            ApiResponse::server_error("8D报告删除失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:eightd:write"])),
    path = "/eightd/{id}/d1-team",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn update_d1_team(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDStepRequest>,
) -> ApiResponse<EightDReport> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的8D报告ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("D1团队组建更新失败");
        }
    };

    let updated = sqlx::query(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET d1_team = $2, status = 'in_progress', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 AND deleted_at IS NULL"#)).bind(id).bind(req.content).bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => {
            ApiResponse::conflict("8D报告不存在或当前状态不允许该操作")
        }
        Ok(_) => {
            // 审计与主表同事务：写失败整体回滚。
            if let Err(e) = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'update', 'D1', '更新团队组建')"#)).bind(tenant_id).bind(id)
            .execute(&mut scope)
            .await
            {
                tracing::error!("Failed to write 8D audit log: {}", e);
                return ApiResponse::server_error("D1团队组建更新失败");
            }
            match sqlx::query_as::<_, EightDReport>(sqlx::AssertSqlSafe(format!(
                "SELECT {} FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                EIGHTD_SELECT_CAST
            )))
            .bind(id).bind(tenant_id).fetch_one(&mut scope).await
            {
                Ok(data) => {
                    if let Err(e) = scope.commit().await {
                        tracing::error!("Failed to commit 8D D1 update: {}", e);
                        return ApiResponse::server_error("D1团队组建更新失败");
                    }
                    ApiResponse::success(data, "D1团队组建更新成功")
                }
                Err(e) => {
                    tracing::error!("Failed to reload 8D report: {}", e);
                    ApiResponse::server_error("D1团队组建更新失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to update D1 team: {}", e);
            ApiResponse::server_error("D1团队组建更新失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:eightd:write"])),
    path = "/eightd/{id}/d3-containment",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn submit_d3_containment(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDStepRequest>,
) -> ApiResponse<EightDReport> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的8D报告ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("D3临时遏制措施提交失败");
        }
    };

    let updated = sqlx::query(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET d3_containment_action = $2, d3_implemented_at = NOW(), status = 'in_progress', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 AND deleted_at IS NULL"#)).bind(id).bind(req.content).bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => {
            ApiResponse::conflict("8D报告不存在或当前状态不允许该操作")
        }
        Ok(_) => {
            if let Err(e) = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'submit', 'D3', '提交临时遏制措施')"#)).bind(tenant_id).bind(id)
            .execute(&mut scope)
            .await
            {
                tracing::error!("Failed to write 8D audit log: {}", e);
                return ApiResponse::server_error("D3临时遏制措施提交失败");
            }
            match sqlx::query_as::<_, EightDReport>(sqlx::AssertSqlSafe(format!(
                "SELECT {} FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                EIGHTD_SELECT_CAST
            )))
            .bind(id).bind(tenant_id).fetch_one(&mut scope).await
            {
                Ok(data) => {
                    if let Err(e) = scope.commit().await {
                        tracing::error!("Failed to commit 8D D3 submit: {}", e);
                        return ApiResponse::server_error("D3临时遏制措施提交失败");
                    }
                    ApiResponse::success(data, "D3临时遏制措施提交成功")
                }
                Err(e) => {
                    tracing::error!("Failed to reload 8D report: {}", e);
                    ApiResponse::server_error("D3临时遏制措施提交失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to submit D3 containment: {}", e);
            ApiResponse::server_error("D3临时遏制措施提交失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:eightd:write"])),
    path = "/eightd/{id}/d4-root-cause",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn submit_d4_root_cause(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDStepRequest>,
) -> ApiResponse<EightDReport> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的8D报告ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("D4根本原因分析提交失败");
        }
    };

    let updated = sqlx::query(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET d4_root_cause = $2, status = 'in_progress', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 AND deleted_at IS NULL"#)).bind(id).bind(req.content).bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => {
            ApiResponse::conflict("8D报告不存在或当前状态不允许该操作")
        }
        Ok(_) => {
            if let Err(e) = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'submit', 'D4', '提交根本原因分析')"#)).bind(tenant_id).bind(id)
            .execute(&mut scope)
            .await
            {
                tracing::error!("Failed to write 8D audit log: {}", e);
                return ApiResponse::server_error("D4根本原因分析提交失败");
            }
            match sqlx::query_as::<_, EightDReport>(sqlx::AssertSqlSafe(format!(
                "SELECT {} FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                EIGHTD_SELECT_CAST
            )))
            .bind(id).bind(tenant_id).fetch_one(&mut scope).await
            {
                Ok(data) => {
                    if let Err(e) = scope.commit().await {
                        tracing::error!("Failed to commit 8D D4 submit: {}", e);
                        return ApiResponse::server_error("D4根本原因分析提交失败");
                    }
                    ApiResponse::success(data, "D4根本原因分析提交成功")
                }
                Err(e) => {
                    tracing::error!("Failed to reload 8D report: {}", e);
                    ApiResponse::server_error("D4根本原因分析提交失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to submit D4 root cause: {}", e);
            ApiResponse::server_error("D4根本原因分析提交失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:eightd:write"])),
    path = "/eightd/{id}/d5-permanent-action",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn submit_d5_permanent_action(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDStepRequest>,
) -> ApiResponse<EightDReport> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的8D报告ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("D5永久纠正措施提交失败");
        }
    };

    let updated = sqlx::query(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET d5_permanent_action = $2, status = 'in_progress', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 AND deleted_at IS NULL"#)).bind(id).bind(req.content).bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => {
            ApiResponse::conflict("8D报告不存在或当前状态不允许该操作")
        }
        Ok(_) => {
            if let Err(e) = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'submit', 'D5', '提交永久纠正措施')"#)).bind(tenant_id).bind(id)
            .execute(&mut scope)
            .await
            {
                tracing::error!("Failed to write 8D audit log: {}", e);
                return ApiResponse::server_error("D5永久纠正措施提交失败");
            }
            match sqlx::query_as::<_, EightDReport>(sqlx::AssertSqlSafe(format!(
                "SELECT {} FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                EIGHTD_SELECT_CAST
            )))
            .bind(id).bind(tenant_id).fetch_one(&mut scope).await
            {
                Ok(data) => {
                    if let Err(e) = scope.commit().await {
                        tracing::error!("Failed to commit 8D D5 submit: {}", e);
                        return ApiResponse::server_error("D5永久纠正措施提交失败");
                    }
                    ApiResponse::success(data, "D5永久纠正措施提交成功")
                }
                Err(e) => {
                    tracing::error!("Failed to reload 8D report: {}", e);
                    ApiResponse::server_error("D5永久纠正措施提交失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to submit D5 permanent action: {}", e);
            ApiResponse::server_error("D5永久纠正措施提交失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:eightd:write"])),
    path = "/eightd/{id}/d6-verify",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn verify_d6_effectiveness(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDStepRequest>,
) -> ApiResponse<EightDReport> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的8D报告ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("D6效果验证失败");
        }
    };

    let updated = sqlx::query(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET d6_verification_result = $2, d6_verified_at = NOW(), status = 'verified', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 AND deleted_at IS NULL"#)).bind(id).bind(req.content).bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => {
            ApiResponse::conflict("8D报告不存在或当前状态不允许该操作")
        }
        Ok(_) => {
            if let Err(e) = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'verify', 'D6', '验证措施有效性')"#)).bind(tenant_id).bind(id)
            .execute(&mut scope)
            .await
            {
                tracing::error!("Failed to write 8D audit log: {}", e);
                return ApiResponse::server_error("D6效果验证失败");
            }
            match sqlx::query_as::<_, EightDReport>(sqlx::AssertSqlSafe(format!(
                "SELECT {} FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                EIGHTD_SELECT_CAST
            )))
            .bind(id).bind(tenant_id).fetch_one(&mut scope).await
            {
                Ok(data) => {
                    if let Err(e) = scope.commit().await {
                        tracing::error!("Failed to commit 8D D6 verify: {}", e);
                        return ApiResponse::server_error("D6效果验证失败");
                    }
                    ApiResponse::success(data, "D6效果验证成功")
                }
                Err(e) => {
                    tracing::error!("Failed to reload 8D report: {}", e);
                    ApiResponse::server_error("D6效果验证失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to verify D6 effectiveness: {}", e);
            ApiResponse::server_error("D6效果验证失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:eightd:write"])),
    path = "/eightd/{id}/d7-preventive",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn submit_d7_preventive(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDStepRequest>,
) -> ApiResponse<EightDReport> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的8D报告ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("D7预防措施提交失败");
        }
    };

    let updated = sqlx::query(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET d7_preventive_action = $2, status = 'verified', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 AND deleted_at IS NULL"#)).bind(id).bind(req.content).bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => {
            ApiResponse::conflict("8D报告不存在或当前状态不允许该操作")
        }
        Ok(_) => {
            if let Err(e) = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'submit', 'D7', '提交预防再发生措施')"#)).bind(tenant_id).bind(id)
            .execute(&mut scope)
            .await
            {
                tracing::error!("Failed to write 8D audit log: {}", e);
                return ApiResponse::server_error("D7预防措施提交失败");
            }
            match sqlx::query_as::<_, EightDReport>(sqlx::AssertSqlSafe(format!(
                "SELECT {} FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                EIGHTD_SELECT_CAST
            )))
            .bind(id).bind(tenant_id).fetch_one(&mut scope).await
            {
                Ok(data) => {
                    if let Err(e) = scope.commit().await {
                        tracing::error!("Failed to commit 8D D7 submit: {}", e);
                        return ApiResponse::server_error("D7预防措施提交失败");
                    }
                    ApiResponse::success(data, "D7预防措施提交成功")
                }
                Err(e) => {
                    tracing::error!("Failed to reload 8D report: {}", e);
                    ApiResponse::server_error("D7预防措施提交失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to submit D7 preventive: {}", e);
            ApiResponse::server_error("D7预防措施提交失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:eightd:write"])),
    path = "/eightd/{id}/close",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn close_eightd_report(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDStepRequest>,
) -> ApiResponse<EightDReport> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的8D报告ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("8D报告关闭失败");
        }
    };

    let updated = sqlx::query(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET d8_congratulations = $2, d8_closed_at = NOW(), status = 'closed', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 AND deleted_at IS NULL"#)).bind(id).bind(req.content).bind(tenant_id)
    .execute(&mut scope)
    .await;

    match updated {
        Ok(r) if r.rows_affected() == 0 => {
            ApiResponse::conflict("8D报告不存在或当前状态不允许该操作")
        }
        Ok(_) => {
            if let Err(e) = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'close', 'D8', '关闭8D报告')"#)).bind(tenant_id).bind(id)
            .execute(&mut scope)
            .await
            {
                tracing::error!("Failed to write 8D audit log: {}", e);
                return ApiResponse::server_error("8D报告关闭失败");
            }
            match sqlx::query_as::<_, EightDReport>(sqlx::AssertSqlSafe(format!(
                "SELECT {} FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                EIGHTD_SELECT_CAST
            )))
            .bind(id).bind(tenant_id).fetch_one(&mut scope).await
            {
                Ok(data) => {
                    if let Err(e) = scope.commit().await {
                        tracing::error!("Failed to commit 8D close: {}", e);
                        return ApiResponse::server_error("8D报告关闭失败");
                    }
                    ApiResponse::success(data, "8D报告已关闭")
                }
                Err(e) => {
                    tracing::error!("Failed to reload 8D report: {}", e);
                    ApiResponse::server_error("8D报告关闭失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to close 8D report: {}", e);
            ApiResponse::server_error("8D报告关闭失败")
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["qms:eightd:read"])),
    path = "/eightd/{id}/audit-logs",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn get_eightd_audit_logs(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<Vec<EightDAuditLog>> {
    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match crate::shared::read_scope_for_claims(&state.db, &claims, txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant read scope: {}", e);
            return ApiResponse::server_error("获取8D审核日志失败");
        }
    };
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let _tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的8D报告ID"),
    };

    let logs = sqlx::query_as::<_, EightDAuditLog>(only_own_schema_query!("qms", r#"SELECT id::TEXT AS id, tenant_id::TEXT AS tenant_id, report_id::TEXT AS report_id, action, step, operator, comment, created_at FROM qms.qa_eightd_audit_logs WHERE report_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) ORDER BY created_at DESC"#)).bind(id).bind(tenant_opt)
    .fetch_all(&mut scope)
    .await;

    match logs {
        Ok(data) => ApiResponse::success(data, "获取8D审核日志成功"),
        Err(e) => {
            tracing::error!("Failed to fetch 8D audit logs: {}", e);
            ApiResponse::server_error("获取8D审核日志失败")
        }
    }
}

/// APV-3 审批请求体
#[derive(Debug, serde::Deserialize)]
pub struct EightDApprovalRequest {
    pub operator: String,
    pub comment: Option<String>,
}

/// APV-3: 审批通过 (permanent_action → verified, requires_approval)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:eightd:write"])),
    path = "/eightd/{id}/approve",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn approve_eightd(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDApprovalRequest>,
) -> ApiResponse<EightDReport> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的8D报告ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("审批失败");
        }
    };

    let current = sqlx::query(only_own_schema_query!("qms", "SELECT status FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"))
        .bind(id).bind(tenant_id).fetch_one(&mut scope).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if eight_d_requires_approval(&current_status, STATUS_VERIFIED)
                && !crate::shared::permission::has_qms_permission(&claims, "eightd.approve")
            {
                return ApiResponse::forbidden("无审批权限");
            }
            if eight_d_can_transition(&current_status, STATUS_VERIFIED).is_err() {
                return ApiResponse::bad_request("当前状态不允许审批通过");
            }
            let updated = sqlx::query(only_own_schema_query!(
                "qms",
                "UPDATE qms.qa_eightd_reports SET status = $3, d6_verified_at = COALESCE(d6_verified_at, NOW()), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = $4"
            ))
            .bind(id).bind(tenant_id).bind(STATUS_VERIFIED).bind(&current_status)
            .execute(&mut scope).await;
            match updated {
                Ok(r) if r.rows_affected() == 0 => {
                    ApiResponse::conflict("状态已被并发修改，请重试")
                }
                Ok(_) => {
                    if let Err(e) = crate::models::audit_log::log_approval_event(
                        &mut scope,
                        &tenant_id.to_string(),
                        "eight_d",
                        &id.to_string(),
                        "approve",
                        &req.operator,
                        &current_status,
                        STATUS_VERIFIED,
                        req.comment.as_deref(),
                    )
                    .await
                    {
                        tracing::error!("Failed to log approval event: {}", e);
                        return ApiResponse::server_error("审批失败");
                    }
                    match sqlx::query_as::<_, EightDReport>(sqlx::AssertSqlSafe(format!(
                        "SELECT {} FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                        EIGHTD_SELECT_CAST
                    )))
                    .bind(id).bind(tenant_id).fetch_one(&mut scope).await
                    {
                        Ok(data) => {
                            if let Err(e) = scope.commit().await {
                                tracing::error!("Failed to commit 8D approve: {}", e);
                                return ApiResponse::server_error("审批失败");
                            }
                            ApiResponse::success(data, "审批通过")
                        }
                        Err(e) => {
                            tracing::error!("Failed to reload 8D report: {}", e);
                            ApiResponse::server_error("审批失败")
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to approve 8D: {}", e);
                    ApiResponse::server_error("审批失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find 8D report: {}", e);
            ApiResponse::not_found("8D报告不存在")
        }
    }
}

/// APV-3: 关闭审批 (verified → closed, requires_approval)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:eightd:write"])),
    path = "/eightd/{id}/close-approval",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn close_eightd_approval(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDApprovalRequest>,
) -> ApiResponse<EightDReport> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的8D报告ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("关闭失败");
        }
    };

    let current = sqlx::query(only_own_schema_query!("qms", "SELECT status FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"))
        .bind(id).bind(tenant_id).fetch_one(&mut scope).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if eight_d_requires_approval(&current_status, STATUS_CLOSED)
                && !crate::shared::permission::has_qms_permission(&claims, "eightd.approve")
            {
                return ApiResponse::forbidden("无审批权限");
            }
            if eight_d_can_transition(&current_status, STATUS_CLOSED).is_err() {
                return ApiResponse::bad_request("当前状态不允许关闭");
            }
            let updated = sqlx::query(only_own_schema_query!(
                "qms",
                "UPDATE qms.qa_eightd_reports SET status = $3, d8_closed_at = COALESCE(d8_closed_at, NOW()), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = $4"
            ))
            .bind(id).bind(tenant_id).bind(STATUS_CLOSED).bind(&current_status)
            .execute(&mut scope).await;
            match updated {
                Ok(r) if r.rows_affected() == 0 => {
                    ApiResponse::conflict("状态已被并发修改，请重试")
                }
                Ok(_) => {
                    if let Err(e) = crate::models::audit_log::log_approval_event(
                        &mut scope,
                        &tenant_id.to_string(),
                        "eight_d",
                        &id.to_string(),
                        "close",
                        &req.operator,
                        &current_status,
                        STATUS_CLOSED,
                        req.comment.as_deref(),
                    )
                    .await
                    {
                        tracing::error!("Failed to log approval event: {}", e);
                        return ApiResponse::server_error("关闭失败");
                    }
                    match sqlx::query_as::<_, EightDReport>(sqlx::AssertSqlSafe(format!(
                        "SELECT {} FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                        EIGHTD_SELECT_CAST
                    )))
                    .bind(id).bind(tenant_id).fetch_one(&mut scope).await
                    {
                        Ok(data) => {
                            if let Err(e) = scope.commit().await {
                                tracing::error!("Failed to commit 8D close-approval: {}", e);
                                return ApiResponse::server_error("关闭失败");
                            }
                            ApiResponse::success(data, "8D报告已关闭")
                        }
                        Err(e) => {
                            tracing::error!("Failed to reload 8D report: {}", e);
                            ApiResponse::server_error("关闭失败")
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to close 8D: {}", e);
                    ApiResponse::server_error("关闭失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find 8D report: {}", e);
            ApiResponse::not_found("8D报告不存在")
        }
    }
}

/// APV-3: 取消 (任意非终态 → cancelled)
#[utoipa::path(
    post,
    security(("BearerAuth" = ["qms:eightd:write"])),
    path = "/eightd/{id}/cancel",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "eightd"
)]
pub async fn cancel_eightd(
    State(state): State<crate::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDApprovalRequest>,
) -> ApiResponse<EightDReport> {
    let tenant_id = match require_tenant(&claims, &headers) {
        Ok(t) => t,
        Err((_, msg)) => return ApiResponse::bad_request(&msg),
    };
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的8D报告ID"),
    };

    let mut txn_guard = txn_arc.lock().await;
    let Some(txn) = txn_guard.as_mut() else {
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant write scope: {}", e);
            return ApiResponse::server_error("取消失败");
        }
    };

    let current = sqlx::query(only_own_schema_query!("qms", "SELECT status FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"))
        .bind(id).bind(tenant_id).fetch_one(&mut scope).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if eight_d_can_transition(&current_status, STATUS_CANCELLED).is_err() {
                return ApiResponse::bad_request("当前状态不允许取消");
            }
            let updated = sqlx::query(only_own_schema_query!(
                "qms",
                "UPDATE qms.qa_eightd_reports SET status = $3, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = $4"
            ))
            .bind(id).bind(tenant_id).bind(STATUS_CANCELLED).bind(&current_status)
            .execute(&mut scope).await;
            match updated {
                Ok(r) if r.rows_affected() == 0 => {
                    ApiResponse::conflict("状态已被并发修改，请重试")
                }
                Ok(_) => {
                    if let Err(e) = crate::models::audit_log::log_approval_event(
                        &mut scope,
                        &tenant_id.to_string(),
                        "eight_d",
                        &id.to_string(),
                        "cancel",
                        &req.operator,
                        &current_status,
                        STATUS_CANCELLED,
                        req.comment.as_deref(),
                    )
                    .await
                    {
                        tracing::error!("Failed to log approval event: {}", e);
                        return ApiResponse::server_error("取消失败");
                    }
                    match sqlx::query_as::<_, EightDReport>(sqlx::AssertSqlSafe(format!(
                        "SELECT {} FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2",
                        EIGHTD_SELECT_CAST
                    )))
                    .bind(id).bind(tenant_id).fetch_one(&mut scope).await
                    {
                        Ok(data) => {
                            if let Err(e) = scope.commit().await {
                                tracing::error!("Failed to commit 8D cancel: {}", e);
                                return ApiResponse::server_error("取消失败");
                            }
                            ApiResponse::success(data, "8D报告已取消")
                        }
                        Err(e) => {
                            tracing::error!("Failed to reload 8D report: {}", e);
                            ApiResponse::server_error("取消失败")
                        }
                    }
                }
                Err(e) => {
                    tracing::error!("Failed to cancel 8D: {}", e);
                    ApiResponse::server_error("取消失败")
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find 8D report: {}", e);
            ApiResponse::not_found("8D报告不存在")
        }
    }
}

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/eightd", get(list_eightd_reports))
        .route("/eightd", post(create_eightd_report))
        .route("/eightd/{id}", get(get_eightd_report))
        .route("/eightd/{id}", put(update_eightd_report))
        .route("/eightd/{id}", delete(delete_eightd_report))
        .route("/eightd/{id}/d1-team", post(update_d1_team))
        .route("/eightd/{id}/d3-containment", post(submit_d3_containment))
        .route("/eightd/{id}/d4-root-cause", post(submit_d4_root_cause))
        .route(
            "/eightd/{id}/d5-permanent-action",
            post(submit_d5_permanent_action),
        )
        .route("/eightd/{id}/d6-verify", post(verify_d6_effectiveness))
        .route("/eightd/{id}/d7-preventive", post(submit_d7_preventive))
        .route("/eightd/{id}/close", post(close_eightd_report))
        .route("/eightd/{id}/audit-logs", get(get_eightd_audit_logs))
        .route("/eightd/{id}/approve", post(approve_eightd))
        .route("/eightd/{id}/close-approval", post(close_eightd_approval))
        .route("/eightd/{id}/cancel", post(cancel_eightd))
}
