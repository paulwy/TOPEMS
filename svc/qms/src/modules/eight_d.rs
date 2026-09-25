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
use topems_shared_auth::get_tenant_id;
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

const STATUS_VERIFIED: &str = "verified";
const STATUS_CLOSED: &str = "closed";
const STATUS_CANCELLED: &str = "cancelled";

const EIGHTD_SELECT_COLS: &str = r#"id, tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at, d7_preventive_action, d8_congratulations, d8_closed_at, assignee, due_date, created_by, created_at, updated_at"#;

pub async fn list_eightd_reports(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Query(query): axum::extract::Query<EightDQuery>,
) -> Json<ApiResponse<ListEightDReportsResponse>> {
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

    let mut count_query = sqlx::query_scalar(&count_sql);
    for p in &params {
        count_query = count_query.bind(p.clone());
    }

    let total: Option<i64> = match count_query.fetch_one(&state.pool).await {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Failed to count 8D reports: {}", e);
            return Json(ApiResponse::error(500, "获取8D报告列表失败"));
        }
    };

    let fetch_sql = format!(
        r#"
        SELECT id, tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT,
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

    let mut fetch_query = sqlx::query_as::<_, EightDReport>(&fetch_sql);
    for p in &params {
        fetch_query = fetch_query.bind(p.clone());
    }
    fetch_query = fetch_query.bind(page_size).bind(offset);

    match fetch_query.fetch_all(&state.pool).await {
        Ok(data) => Json(ApiResponse::success(
            ListEightDReportsResponse {
                reports: data,
                total: total.unwrap_or(0),
                page,
                page_size,
            },
            "获取8D报告列表成功",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch 8D reports: {}", e);
            Json(ApiResponse::error(500, "获取8D报告列表失败"))
        }
    }
}

pub async fn create_eightd_report(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<CreateEightDRequest>,
) -> Json<ApiResponse<EightDReport>> {
    let tenant_id = get_tenant_id(&claims, &headers);
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

    let report = sqlx::query_as::<_, EightDReport>(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_reports (tenant_id, report_no, title, severity, priority, related_issue_id, d2_problem_description, status, assignee, due_date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', $8, $9, $10) RETURNING id::TEXT, tenant_id::TEXT, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at, d7_preventive_action, d8_congratulations, d8_closed_at, assignee, due_date, created_by, created_at, updated_at"#)).bind(tenant_id).bind(report_no).bind(req.title).bind(req.severity).bind(req.priority).bind(related_issue_id).bind(req.d2_problem_description).bind(req.assignee).bind(due_dt).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let report_id = Uuid::parse_str(&data.id).ok();
            let created_by = data.created_by.clone();
            if let Some(rid) = report_id {
                let _ = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, operator, comment) VALUES ($1, $2, 'create', 'D2', $3, '创建8D报告')"#)).bind(tenant_id).bind(rid).bind(created_by)
                .execute(&state.pool)
                .await;
            }
            Json(ApiResponse::success(data, "8D报告创建成功"))
        }
        Err(e) => {
            tracing::error!("Failed to create 8D report: {}", e);
            Json(ApiResponse::error(500, "8D报告创建失败"))
        }
    }
}

pub async fn get_eightd_report(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<EightDReport>> {
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
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let report = sqlx::query_as::<_, EightDReport>(only_own_schema_query!("qms", r#"SELECT id, tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at, d7_preventive_action, d8_congratulations, d8_closed_at, assignee, due_date, created_by, created_at, updated_at FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND ($2::uuid IS NULL OR tenant_id = $2)"#)).bind(id).bind(tenant_opt)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => Json(ApiResponse::success(data, "获取8D报告成功")),
        Err(sqlx::Error::RowNotFound) => Json(ApiResponse::error(404, "记录不存在")),

        Err(e) => {
            tracing::error!("Failed to fetch 8D report: {}", e);
            Json(ApiResponse::error(500, "获取8D报告失败"))
        }
    }
}

pub async fn update_eightd_report(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateEightDRequest>,
) -> Json<ApiResponse<EightDReport>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let due_dt = req
        .due_date
        .map(|d| d.and_hms_opt(0, 0, 0).unwrap_or_default());

    let report = sqlx::query_as::<_, EightDReport>(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET title = COALESCE($2, title), status = COALESCE($3, status), severity = COALESCE($4, severity), priority = COALESCE($5, priority), d1_team = COALESCE($6, d1_team), d1_leader = COALESCE($7, d1_leader), d2_problem_description = COALESCE($8, d2_problem_description), d3_containment_action = COALESCE($9, d3_containment_action), d4_root_cause = COALESCE($10, d4_root_cause), d4_cause_analysis = COALESCE($11, d4_cause_analysis), d5_permanent_action = COALESCE($12, d5_permanent_action), d6_verification_result = COALESCE($13, d6_verification_result), d7_preventive_action = COALESCE($14, d7_preventive_action), d8_congratulations = COALESCE($15, d8_congratulations), assignee = COALESCE($16, assignee), due_date = COALESCE($17, due_date), updated_at = NOW() WHERE id = $1 AND tenant_id = $18 RETURNING id::TEXT, tenant_id::TEXT, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at, d7_preventive_action, d8_congratulations, d8_closed_at, assignee, due_date, created_by, created_at, updated_at"#)).bind(id).bind(req.title).bind(req.status).bind(req.severity).bind(req.priority).bind(req.d1_team).bind(req.d1_leader).bind(req.d2_problem_description).bind(req.d3_containment_action).bind(req.d4_root_cause).bind(req.d4_cause_analysis).bind(req.d5_permanent_action).bind(req.d6_verification_result).bind(req.d7_preventive_action).bind(req.d8_congratulations).bind(req.assignee).bind(due_dt).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => Json(ApiResponse::success(data, "8D报告更新成功")),
        Err(e) => {
            tracing::error!("Failed to update 8D report: {}", e);
            Json(ApiResponse::error(500, "8D报告更新失败"))
        }
    }
}

pub async fn delete_eightd_report(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let result = sqlx::query(only_own_schema_query!(
        "qms",
        r#"UPDATE qms.qa_eightd_reports SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2"#
    ))
    .bind(id)
    .bind(tenant_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "8D报告删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete 8D report: {}", e);
            Json(ApiResponse::error(500, "8D报告删除失败"))
        }
    }
}

pub async fn update_d1_team(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDStepRequest>,
) -> Json<ApiResponse<EightDReport>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let report = sqlx::query_as::<_, EightDReport>(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET d1_team = $2, status = 'in_progress', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id::TEXT, tenant_id::TEXT, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at, d7_preventive_action, d8_congratulations, d8_closed_at, assignee, due_date, created_by, created_at, updated_at"#)).bind(id).bind(req.content).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let _ = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'update', 'D1', '更新团队组建')"#)).bind(tenant_id).bind(id)
            .execute(&state.pool)
            .await;
            Json(ApiResponse::success(data, "D1团队组建更新成功"))
        }
        Err(e) => {
            tracing::error!("Failed to update D1 team: {}", e);
            Json(ApiResponse::error(500, "D1团队组建更新失败"))
        }
    }
}

pub async fn submit_d3_containment(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDStepRequest>,
) -> Json<ApiResponse<EightDReport>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let report = sqlx::query_as::<_, EightDReport>(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET d3_containment_action = $2, d3_implemented_at = NOW(), status = 'in_progress', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id::TEXT, tenant_id::TEXT, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at, d7_preventive_action, d8_congratulations, d8_closed_at, assignee, due_date, created_by, created_at, updated_at"#)).bind(id).bind(req.content).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let _ = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'submit', 'D3', '提交临时遏制措施')"#)).bind(tenant_id).bind(id)
            .execute(&state.pool)
            .await;
            Json(ApiResponse::success(data, "D3临时遏制措施提交成功"))
        }
        Err(e) => {
            tracing::error!("Failed to submit D3 containment: {}", e);
            Json(ApiResponse::error(500, "D3临时遏制措施提交失败"))
        }
    }
}

pub async fn submit_d4_root_cause(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDStepRequest>,
) -> Json<ApiResponse<EightDReport>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let report = sqlx::query_as::<_, EightDReport>(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET d4_root_cause = $2, status = 'in_progress', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id::TEXT, tenant_id::TEXT, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at, d7_preventive_action, d8_congratulations, d8_closed_at, assignee, due_date, created_by, created_at, updated_at"#)).bind(id).bind(req.content).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let _ = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'submit', 'D4', '提交根本原因分析')"#)).bind(tenant_id).bind(id)
            .execute(&state.pool)
            .await;
            Json(ApiResponse::success(data, "D4根本原因分析提交成功"))
        }
        Err(e) => {
            tracing::error!("Failed to submit D4 root cause: {}", e);
            Json(ApiResponse::error(500, "D4根本原因分析提交失败"))
        }
    }
}

pub async fn submit_d5_permanent_action(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDStepRequest>,
) -> Json<ApiResponse<EightDReport>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let report = sqlx::query_as::<_, EightDReport>(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET d5_permanent_action = $2, status = 'in_progress', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id::TEXT, tenant_id::TEXT, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at, d7_preventive_action, d8_congratulations, d8_closed_at, assignee, due_date, created_by, created_at, updated_at"#)).bind(id).bind(req.content).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let _ = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'submit', 'D5', '提交永久纠正措施')"#)).bind(tenant_id).bind(id)
            .execute(&state.pool)
            .await;
            Json(ApiResponse::success(data, "D5永久纠正措施提交成功"))
        }
        Err(e) => {
            tracing::error!("Failed to submit D5 permanent action: {}", e);
            Json(ApiResponse::error(500, "D5永久纠正措施提交失败"))
        }
    }
}

pub async fn verify_d6_effectiveness(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDStepRequest>,
) -> Json<ApiResponse<EightDReport>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let report = sqlx::query_as::<_, EightDReport>(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET d6_verification_result = $2, d6_verified_at = NOW(), status = 'verified', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id::TEXT, tenant_id::TEXT, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at, d7_preventive_action, d8_congratulations, d8_closed_at, assignee, due_date, created_by, created_at, updated_at"#)).bind(id).bind(req.content).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let _ = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'verify', 'D6', '验证措施有效性')"#)).bind(tenant_id).bind(id)
            .execute(&state.pool)
            .await;
            Json(ApiResponse::success(data, "D6效果验证成功"))
        }
        Err(e) => {
            tracing::error!("Failed to verify D6 effectiveness: {}", e);
            Json(ApiResponse::error(500, "D6效果验证失败"))
        }
    }
}

pub async fn submit_d7_preventive(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDStepRequest>,
) -> Json<ApiResponse<EightDReport>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let report = sqlx::query_as::<_, EightDReport>(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET d7_preventive_action = $2, status = 'verified', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id::TEXT, tenant_id::TEXT, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at, d7_preventive_action, d8_congratulations, d8_closed_at, assignee, due_date, created_by, created_at, updated_at"#)).bind(id).bind(req.content).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let _ = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'submit', 'D7', '提交预防再发生措施')"#)).bind(tenant_id).bind(id)
            .execute(&state.pool)
            .await;
            Json(ApiResponse::success(data, "D7预防措施提交成功"))
        }
        Err(e) => {
            tracing::error!("Failed to submit D7 preventive: {}", e);
            Json(ApiResponse::error(500, "D7预防措施提交失败"))
        }
    }
}

pub async fn close_eightd_report(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDStepRequest>,
) -> Json<ApiResponse<EightDReport>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let report = sqlx::query_as::<_, EightDReport>(only_own_schema_query!("qms", r#"UPDATE qms.qa_eightd_reports SET d8_congratulations = $2, d8_closed_at = NOW(), status = 'closed', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id::TEXT, tenant_id::TEXT, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at, d7_preventive_action, d8_congratulations, d8_closed_at, assignee, due_date, created_by, created_at, updated_at"#)).bind(id).bind(req.content).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let _ = sqlx::query(only_own_schema_query!("qms", r#"INSERT INTO qms.qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'close', 'D8', '关闭8D报告')"#)).bind(tenant_id).bind(id)
            .execute(&state.pool)
            .await;
            Json(ApiResponse::success(data, "8D报告已关闭"))
        }
        Err(e) => {
            tracing::error!("Failed to close 8D report: {}", e);
            Json(ApiResponse::error(500, "8D报告关闭失败"))
        }
    }
}

pub async fn get_eightd_audit_logs(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<Vec<EightDAuditLog>>> {
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
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let logs = sqlx::query_as::<_, EightDAuditLog>(only_own_schema_query!("qms", r#"SELECT id, tenant_id, report_id, action, step, operator, comment, created_at FROM qms.qa_eightd_audit_logs WHERE report_id = $1 AND ($2::uuid IS NULL OR tenant_id = $2) ORDER BY created_at DESC"#)).bind(id).bind(tenant_opt)
    .fetch_all(&state.pool)
    .await;

    match logs {
        Ok(data) => Json(ApiResponse::success(data, "获取8D审核日志成功")),
        Err(e) => {
            tracing::error!("Failed to fetch 8D audit logs: {}", e);
            Json(ApiResponse::error(500, "获取8D审核日志失败"))
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
pub async fn approve_eightd(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDApprovalRequest>,
) -> Json<ApiResponse<EightDReport>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let current = sqlx::query(only_own_schema_query!("qms", "SELECT status FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"))
        .bind(id).bind(tenant_opt).fetch_one(&state.pool).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if eight_d_requires_approval(&current_status, STATUS_VERIFIED)
                && !crate::shared::permission::has_qms_permission(&claims, "eightd.approve")
            {
                return Json(ApiResponse::error(403, "无审批权限"));
            }
            if eight_d_can_transition(&current_status, STATUS_VERIFIED).is_err() {
                return Json(ApiResponse::error(400, "当前状态不允许审批通过"));
            }
            let report = sqlx::query_as::<_, EightDReport>(
                format!("UPDATE qms.qa_eightd_reports SET status = '{}', d6_verified_at = COALESCE(d6_verified_at, NOW()), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING {}", STATUS_VERIFIED, EIGHTD_SELECT_COLS).as_str()
            ).bind(id).bind(tenant_id).fetch_one(&state.pool).await;
            match report {
                Ok(data) => {
                    let _ = crate::models::audit_log::log_approval_event(
                        &state.pool,
                        &tenant_id.to_string(),
                        "eight_d",
                        &id.to_string(),
                        "approve",
                        &req.operator,
                        &current_status,
                        STATUS_VERIFIED,
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(data, "审批通过"))
                }
                Err(e) => {
                    tracing::error!("Failed to approve 8D: {}", e);
                    Json(ApiResponse::error(500, "审批失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find 8D report: {}", e);
            Json(ApiResponse::error(404, "8D报告不存在"))
        }
    }
}

/// APV-3: 关闭审批 (verified → closed, requires_approval)
pub async fn close_eightd_approval(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDApprovalRequest>,
) -> Json<ApiResponse<EightDReport>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let current = sqlx::query(only_own_schema_query!("qms", "SELECT status FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"))
        .bind(id).bind(tenant_opt).fetch_one(&state.pool).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if eight_d_requires_approval(&current_status, STATUS_CLOSED)
                && !crate::shared::permission::has_qms_permission(&claims, "eightd.approve")
            {
                return Json(ApiResponse::error(403, "无审批权限"));
            }
            if eight_d_can_transition(&current_status, STATUS_CLOSED).is_err() {
                return Json(ApiResponse::error(400, "当前状态不允许关闭"));
            }
            let report = sqlx::query_as::<_, EightDReport>(
                format!("UPDATE qms.qa_eightd_reports SET status = '{}', d8_closed_at = COALESCE(d8_closed_at, NOW()), updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING {}", STATUS_CLOSED, EIGHTD_SELECT_COLS).as_str()
            ).bind(id).bind(tenant_id).fetch_one(&state.pool).await;
            match report {
                Ok(data) => {
                    let _ = crate::models::audit_log::log_approval_event(
                        &state.pool,
                        &tenant_id.to_string(),
                        "eight_d",
                        &id.to_string(),
                        "close",
                        &req.operator,
                        &current_status,
                        STATUS_CLOSED,
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(data, "8D报告已关闭"))
                }
                Err(e) => {
                    tracing::error!("Failed to close 8D: {}", e);
                    Json(ApiResponse::error(500, "关闭失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find 8D report: {}", e);
            Json(ApiResponse::error(404, "8D报告不存在"))
        }
    }
}

/// APV-3: 取消 (任意非终态 → cancelled)
pub async fn cancel_eightd(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<EightDApprovalRequest>,
) -> Json<ApiResponse<EightDReport>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let current = sqlx::query(only_own_schema_query!("qms", "SELECT status FROM qms.qa_eightd_reports WHERE deleted_at IS NULL AND id = $1 AND tenant_id = $2"))
        .bind(id).bind(tenant_opt).fetch_one(&state.pool).await;

    match current {
        Ok(row) => {
            let current_status = row.get::<Option<String>, _>("status").unwrap_or_default();
            if eight_d_can_transition(&current_status, STATUS_CANCELLED).is_err() {
                return Json(ApiResponse::error(400, "当前状态不允许取消"));
            }
            let report = sqlx::query_as::<_, EightDReport>(
                format!("UPDATE qms.qa_eightd_reports SET status = '{}', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING {}", STATUS_CANCELLED, EIGHTD_SELECT_COLS).as_str()
            ).bind(id).bind(tenant_id).fetch_one(&state.pool).await;
            match report {
                Ok(data) => {
                    let _ = crate::models::audit_log::log_approval_event(
                        &state.pool,
                        &tenant_id.to_string(),
                        "eight_d",
                        &id.to_string(),
                        "cancel",
                        &req.operator,
                        &current_status,
                        STATUS_CANCELLED,
                        req.comment.as_deref(),
                    )
                    .await;
                    Json(ApiResponse::success(data, "8D报告已取消"))
                }
                Err(e) => {
                    tracing::error!("Failed to cancel 8D: {}", e);
                    Json(ApiResponse::error(500, "取消失败"))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to find 8D report: {}", e);
            Json(ApiResponse::error(404, "8D报告不存在"))
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
