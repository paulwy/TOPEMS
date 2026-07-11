//! 8D Problem Solving handlers

use axum::{
    extract::State,
    routing::{delete, get, post, put},
    Extension, Json, Router,
};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, FromRow};
use topems_shared::{ApiResponse, Claims};

#[derive(Debug, Deserialize)]
pub struct EightDQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub assignee: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ListEightDReportsResponse {
    pub reports: Vec<EightDReport>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Serialize, FromRow)]
pub struct EightDReport {
    pub id: String,
    pub tenant_id: String,
    pub report_no: String,
    pub title: String,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub priority: Option<String>,
    pub related_issue_id: Option<String>,
    pub d1_team: Option<String>,
    pub d1_leader: Option<String>,
    pub d2_problem_description: Option<String>,
    pub d3_containment_action: Option<String>,
    pub d3_implemented_at: Option<String>,
    pub d4_root_cause: Option<String>,
    pub d4_cause_analysis: Option<String>,
    pub d5_permanent_action: Option<String>,
    pub d6_verification_result: Option<String>,
    pub d6_verified_at: Option<String>,
    pub d7_preventive_action: Option<String>,
    pub d8_congratulations: Option<String>,
    pub d8_closed_at: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEightDRequest {
    pub title: String,
    pub severity: Option<String>,
    pub priority: Option<String>,
    pub related_issue_id: Option<String>,
    pub d2_problem_description: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<NaiveDate>,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEightDRequest {
    pub title: Option<String>,
    pub status: Option<String>,
    pub severity: Option<String>,
    pub priority: Option<String>,
    pub d1_team: Option<String>,
    pub d1_leader: Option<String>,
    pub d2_problem_description: Option<String>,
    pub d3_containment_action: Option<String>,
    pub d4_root_cause: Option<String>,
    pub d4_cause_analysis: Option<String>,
    pub d5_permanent_action: Option<String>,
    pub d6_verification_result: Option<String>,
    pub d7_preventive_action: Option<String>,
    pub d8_congratulations: Option<String>,
    pub assignee: Option<String>,
    pub due_date: Option<NaiveDate>,
}

#[derive(Debug, Deserialize)]
pub struct EightDStepRequest {
    pub content: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
pub struct EightDAuditLog {
    pub id: String,
    pub tenant_id: String,
    pub report_id: String,
    pub action: String,
    pub step: Option<String>,
    pub operator: Option<String>,
    pub comment: Option<String>,
    pub created_at: Option<String>,
}

fn get_tenant_id(claims: &Claims, headers: &axum::http::HeaderMap) -> Uuid {
    claims
        .tenant_id
        .as_ref()
        .and_then(|t| Uuid::parse_str(t).ok())
        .or_else(|| {
            headers
                .get("x-tenant-id")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| Uuid::parse_str(s).ok())
        })
        .unwrap_or_else(Uuid::new_v4)
}

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

    let mut params: Vec<serde_json::Value> = Vec::new();
    let mut where_clause = String::from(" WHERE tenant_id = $1");
    params.push(serde_json::Value::String(tenant_id.to_string()));

    if let Some(status) = &query.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(serde_json::Value::String(status.clone()));
    }

    if let Some(severity) = &query.severity {
        where_clause.push_str(&format!(" AND severity = ${}", params.len() + 1));
        params.push(serde_json::Value::String(severity.clone()));
    }

    if let Some(assignee) = &query.assignee {
        where_clause.push_str(&format!(" AND assignee = ${}", params.len() + 1));
        params.push(serde_json::Value::String(assignee.clone()));
    }

    if let Some(search) = &query.search {
        let pattern = format!("%{}%", search);
        where_clause.push_str(&format!(
            " AND (report_no ILIKE ${} OR title ILIKE ${})",
            params.len() + 1,
            params.len() + 1
        ));
        params.push(serde_json::Value::String(pattern));
    }

    let count_sql = format!(
        "SELECT COUNT(*) as total FROM qa_eightd_reports{}",
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
            d3_implemented_at::TEXT, d4_root_cause, d4_cause_analysis,
            d5_permanent_action, d6_verification_result, d6_verified_at::TEXT,
            d7_preventive_action, d8_congratulations, d8_closed_at::TEXT,
            assignee, due_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT
        FROM qa_eightd_reports
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

    let report = sqlx::query_as::<_, EightDReport>(r#"INSERT INTO qa_eightd_reports (tenant_id, report_no, title, severity, priority, related_issue_id, d2_problem_description, status, assignee, due_date, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', $8, $9, $10) RETURNING id, tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at::TEXT, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at::TEXT, d7_preventive_action, d8_congratulations, d8_closed_at::TEXT, assignee, due_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(tenant_id).bind(report_no).bind(req.title).bind(req.severity).bind(req.priority).bind(related_issue_id).bind(req.d2_problem_description).bind(req.assignee).bind(due_dt).bind(req.created_by)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let report_id = Uuid::parse_str(&data.id).ok();
            let created_by = data.created_by.clone();
            if let Some(rid) = report_id {
                let _ = sqlx::query(r#"INSERT INTO qa_eightd_audit_logs (tenant_id, report_id, action, step, operator, comment) VALUES ($1, $2, 'create', 'D2', $3, '创建8D报告')"#).bind(tenant_id).bind(rid).bind(created_by)
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
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let report = sqlx::query_as::<_, EightDReport>(r#"SELECT id, tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at::TEXT, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at::TEXT, d7_preventive_action, d8_congratulations, d8_closed_at::TEXT, assignee, due_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT FROM qa_eightd_reports WHERE id = $1 AND tenant_id = $2"#).bind(id).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => Json(ApiResponse::success(data, "获取8D报告成功")),
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

    let report = sqlx::query_as::<_, EightDReport>(r#"UPDATE qa_eightd_reports SET title = COALESCE($2, title), status = COALESCE($3, status), severity = COALESCE($4, severity), priority = COALESCE($5, priority), d1_team = COALESCE($6, d1_team), d1_leader = COALESCE($7, d1_leader), d2_problem_description = COALESCE($8, d2_problem_description), d3_containment_action = COALESCE($9, d3_containment_action), d4_root_cause = COALESCE($10, d4_root_cause), d4_cause_analysis = COALESCE($11, d4_cause_analysis), d5_permanent_action = COALESCE($12, d5_permanent_action), d6_verification_result = COALESCE($13, d6_verification_result), d7_preventive_action = COALESCE($14, d7_preventive_action), d8_congratulations = COALESCE($15, d8_congratulations), assignee = COALESCE($16, assignee), due_date = COALESCE($17, due_date), updated_at = NOW() WHERE id = $1 AND tenant_id = $18 RETURNING id, tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at::TEXT, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at::TEXT, d7_preventive_action, d8_congratulations, d8_closed_at::TEXT, assignee, due_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.title).bind(req.status).bind(req.severity).bind(req.priority).bind(req.d1_team).bind(req.d1_leader).bind(req.d2_problem_description).bind(req.d3_containment_action).bind(req.d4_root_cause).bind(req.d4_cause_analysis).bind(req.d5_permanent_action).bind(req.d6_verification_result).bind(req.d7_preventive_action).bind(req.d8_congratulations).bind(req.assignee).bind(due_dt).bind(tenant_id)
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

    let result = sqlx::query(r#"DELETE FROM qa_eightd_reports WHERE id = $1 AND tenant_id = $2"#)
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

    let report = sqlx::query_as::<_, EightDReport>(r#"UPDATE qa_eightd_reports SET d1_team = $2, status = 'in_progress', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id, tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at::TEXT, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at::TEXT, d7_preventive_action, d8_congratulations, d8_closed_at::TEXT, assignee, due_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.content).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let _ = sqlx::query(r#"INSERT INTO qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'update', 'D1', '更新团队组建')"#).bind(tenant_id).bind(id)
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

    let report = sqlx::query_as::<_, EightDReport>(r#"UPDATE qa_eightd_reports SET d3_containment_action = $2, d3_implemented_at = NOW(), status = 'in_progress', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id, tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at::TEXT, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at::TEXT, d7_preventive_action, d8_congratulations, d8_closed_at::TEXT, assignee, due_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.content).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let _ = sqlx::query(r#"INSERT INTO qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'submit', 'D3', '提交临时遏制措施')"#).bind(tenant_id).bind(id)
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

    let report = sqlx::query_as::<_, EightDReport>(r#"UPDATE qa_eightd_reports SET d4_root_cause = $2, status = 'in_progress', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id, tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at::TEXT, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at::TEXT, d7_preventive_action, d8_congratulations, d8_closed_at::TEXT, assignee, due_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.content).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let _ = sqlx::query(r#"INSERT INTO qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'submit', 'D4', '提交根本原因分析')"#).bind(tenant_id).bind(id)
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

    let report = sqlx::query_as::<_, EightDReport>(r#"UPDATE qa_eightd_reports SET d5_permanent_action = $2, status = 'in_progress', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id, tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at::TEXT, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at::TEXT, d7_preventive_action, d8_congratulations, d8_closed_at::TEXT, assignee, due_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.content).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let _ = sqlx::query(r#"INSERT INTO qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'submit', 'D5', '提交永久纠正措施')"#).bind(tenant_id).bind(id)
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

    let report = sqlx::query_as::<_, EightDReport>(r#"UPDATE qa_eightd_reports SET d6_verification_result = $2, d6_verified_at = NOW(), status = 'verified', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id, tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at::TEXT, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at::TEXT, d7_preventive_action, d8_congratulations, d8_closed_at::TEXT, assignee, due_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.content).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let _ = sqlx::query(r#"INSERT INTO qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'verify', 'D6', '验证措施有效性')"#).bind(tenant_id).bind(id)
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

    let report = sqlx::query_as::<_, EightDReport>(r#"UPDATE qa_eightd_reports SET d7_preventive_action = $2, status = 'verified', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id, tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at::TEXT, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at::TEXT, d7_preventive_action, d8_congratulations, d8_closed_at::TEXT, assignee, due_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.content).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let _ = sqlx::query(r#"INSERT INTO qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'submit', 'D7', '提交预防再发生措施')"#).bind(tenant_id).bind(id)
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

    let report = sqlx::query_as::<_, EightDReport>(r#"UPDATE qa_eightd_reports SET d8_congratulations = $2, d8_closed_at = NOW(), status = 'closed', updated_at = NOW() WHERE id = $1 AND tenant_id = $3 RETURNING id, tenant_id, report_no, title, status, severity, priority, related_issue_id::TEXT, d1_team, d1_leader, d2_problem_description, d3_containment_action, d3_implemented_at::TEXT, d4_root_cause, d4_cause_analysis, d5_permanent_action, d6_verification_result, d6_verified_at::TEXT, d7_preventive_action, d8_congratulations, d8_closed_at::TEXT, assignee, due_date::TEXT, created_by, created_at::TEXT, updated_at::TEXT"#).bind(id).bind(req.content).bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match report {
        Ok(data) => {
            let _ = sqlx::query(r#"INSERT INTO qa_eightd_audit_logs (tenant_id, report_id, action, step, comment) VALUES ($1, $2, 'close', 'D8', '关闭8D报告')"#).bind(tenant_id).bind(id)
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
    let tenant_id = get_tenant_id(&claims, &headers);
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的8D报告ID")),
    };

    let logs = sqlx::query_as::<_, EightDAuditLog>(r#"SELECT id, tenant_id, report_id, action, step, operator, comment, created_at::TEXT FROM qa_eightd_audit_logs WHERE report_id = $1 AND tenant_id = $2 ORDER BY created_at DESC"#).bind(id).bind(tenant_id)
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

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/api/qms/eightd", get(list_eightd_reports))
        .route("/api/qms/eightd", post(create_eightd_report))
        .route("/api/qms/eightd/{id}", get(get_eightd_report))
        .route("/api/qms/eightd/{id}", put(update_eightd_report))
        .route("/api/qms/eightd/{id}", delete(delete_eightd_report))
        .route("/api/qms/eightd/{id}/d1-team", post(update_d1_team))
        .route(
            "/api/qms/eightd/{id}/d3-containment",
            post(submit_d3_containment),
        )
        .route(
            "/api/qms/eightd/{id}/d4-root-cause",
            post(submit_d4_root_cause),
        )
        .route(
            "/api/qms/eightd/{id}/d5-permanent-action",
            post(submit_d5_permanent_action),
        )
        .route(
            "/api/qms/eightd/{id}/d6-verify",
            post(verify_d6_effectiveness),
        )
        .route(
            "/api/qms/eightd/{id}/d7-preventive",
            post(submit_d7_preventive),
        )
        .route("/api/qms/eightd/{id}/close", post(close_eightd_report))
        .route(
            "/api/qms/eightd/{id}/audit-logs",
            get(get_eightd_audit_logs),
        )
}
