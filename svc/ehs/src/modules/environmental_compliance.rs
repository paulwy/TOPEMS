//! Environmental compliance management - Regulations, compliance evaluation, monitoring, permits, and incidents

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::*,
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use uuid::Uuid;

use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route(
            "/environmental-compliance/regulations",
            get(list_regulations).post(create_regulation),
        )
        .route(
            "/environmental-compliance/regulations/categories",
            get(list_regulation_categories),
        )
        .route(
            "/environmental-compliance/regulations/{id}",
            get(get_regulation)
                .put(update_regulation)
                .delete(delete_regulation),
        )
        .route(
            "/environmental-compliance/evaluations",
            get(list_evaluations).post(create_evaluation),
        )
        .route(
            "/environmental-compliance/assessments",
            get(list_evaluations).post(create_evaluation),
        )
        .route(
            "/environmental-compliance/evaluations/{id}",
            get(get_evaluation)
                .put(update_evaluation)
                .delete(delete_evaluation),
        )
        .route(
            "/environmental-compliance/assessments/{id}",
            get(get_evaluation)
                .put(update_evaluation)
                .delete(delete_evaluation),
        )
        .route(
            "/environmental-compliance/monitoring",
            get(list_monitor_records).post(create_monitor_record),
        )
        .route(
            "/environmental-compliance/monitoring/types",
            get(list_monitor_types),
        )
        .route(
            "/environmental-compliance/monitoring/{id}",
            put(update_monitor_record),
        )
        .route(
            "/environmental-compliance/permits",
            get(list_permits).post(create_permit),
        )
        .route(
            "/environmental-compliance/permits/{id}",
            get(get_permit).put(update_permit).delete(delete_permit),
        )
        .route(
            "/environmental-compliance/incidents",
            get(list_incidents).post(create_incident),
        )
        .route(
            "/environmental-compliance/incidents/{id}",
            get(get_incident)
                .put(update_incident)
                .delete(delete_incident),
        )
        .route(
            "/environmental-compliance/statistics",
            get(get_compliance_statistics),
        )
        .route(
            "/environmental-compliance/events",
            get(list_incidents).post(create_incident),
        )
        .route(
            "/environmental-compliance/events/{id}",
            get(get_incident)
                .put(update_incident)
                .delete(delete_incident),
        )
}

#[derive(Debug, Deserialize)]
pub struct ComplianceQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
    pub category: Option<String>,
    pub year: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct EnvironmentalRegulation {
    pub id: String,
    pub regulation_no: String,
    pub title: String,
    pub category: String,
    pub regulation_type: Option<String>,
    pub issuing_authority: Option<String>,
    pub issue_date: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub status: String,
    pub content: Option<String>,
    pub keywords: Option<Vec<String>>,
    pub applicable_scopes: Option<Vec<String>>,
    pub attachments: Option<Vec<String>>,
    pub version: Option<String>,
    pub created_by: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct ComplianceAssessment {
    pub id: String,
    pub assessment_no: String,
    pub title: String,
    pub assessment_type: String,
    pub scope: Option<String>,
    pub period_start: Option<String>,
    pub period_end: Option<String>,
    pub assessor: Option<String>,
    pub assessment_date: Option<String>,
    pub result: Option<String>,
    pub score: Option<f64>,
    pub findings: Option<String>,
    pub non_complianceitems: Option<Vec<String>>,
    pub corrective_actions: Option<String>,
    pub status: String,
    pub attachments: Option<Vec<String>>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DischargeLimit {
    pub pollutant_name: String,
    pub limit_value: f64,
    pub unit: String,
    pub standard: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ComplianceItem {
    pub id: String,
    pub evaluation_id: String,
    pub regulation_id: Option<String>,
    pub regulation_title: Option<String>,
    pub item_description: Option<String>,
    pub compliance_status: String,
    pub evidence: Option<String>,
    pub issues: Option<String>,
    pub corrective_action: Option<String>,
    pub responsible_person: Option<String>,
    pub deadline: Option<String>,
    pub status: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct EnvironmentMonitor {
    pub id: String,
    pub record_no: String,
    pub monitor_type: String,
    pub monitor_point: String,
    pub monitor_date: Option<String>,
    pub monitor_agency: Option<String>,
    pub monitor_method: Option<String>,
    pub pollutant: Option<String>,
    pub concentration: Option<String>,
    pub unit: Option<String>,
    pub standard_value: Option<String>,
    pub standard_type: Option<String>,
    pub result: String,
    pub flow_rate: Option<String>,
    pub emission_rate: Option<String>,
    pub status: String,
    pub remarks: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct DischargePermit {
    pub id: String,
    pub permit_no: String,
    pub title: Option<String>,
    pub permit_type: String,
    pub permit_category: Option<String>,
    pub holder: Option<String>,
    pub issue_date: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub issuing_authority: Option<String>,
    pub discharge_location: Option<String>,
    pub discharge_standard: Option<String>,
    pub discharge_limits: Option<Vec<DischargeLimit>>,
    pub monitoring_requirements: Option<String>,
    pub status: String,
    pub attachments: Option<Vec<String>>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct EnvironmentIncident {
    pub id: String,
    pub incident_no: String,
    pub title: String,
    pub incident_type: String,
    pub level: Option<String>,
    pub location: Option<String>,
    pub occurred_at: Option<String>,
    pub reported_by: Option<String>,
    pub reported_at: Option<String>,
    pub description: Option<String>,
    pub cause: Option<String>,
    pub impact: Option<String>,
    pub immediate_measures: Option<String>,
    pub status: String,
    pub responsible_person: Option<String>,
    pub investigation_result: Option<String>,
    pub corrective_actions: Option<String>,
    pub preventive_measures: Option<String>,
    pub closed_at: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct ComplianceStatistics {
    pub total_regulations: i32,
    pub active_regulations: i32,
    pub total_evaluations: i32,
    pub average_compliance_rate: Option<f64>,
    pub total_monitor_records: i32,
    pub qualified_monitor_records: i32,
    pub total_permits: i32,
    pub expiring_permits: i32,
    pub total_incidents: i32,
    pub open_incidents: i32,
    pub by_monitor_type: Vec<serde_json::Value>,
    pub by_incident_type: Vec<serde_json::Value>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Deserialize)]
pub struct CreateRegulationRequest {
    pub title: String,
    pub category: String,
    pub regulation_type: Option<String>,
    pub issuing_authority: Option<String>,
    pub issue_date: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub content: Option<String>,
    pub keywords: Option<Vec<String>>,
    pub applicable_scopes: Option<Vec<String>>,
    pub attachments: Option<Vec<String>>,
    pub version: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRegulationRequest {
    pub title: Option<String>,
    pub category: Option<String>,
    pub regulation_type: Option<String>,
    pub issuing_authority: Option<String>,
    pub issue_date: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub status: Option<String>,
    pub content: Option<String>,
    pub keywords: Option<Vec<String>>,
    pub applicable_scopes: Option<Vec<String>>,
    pub attachments: Option<Vec<String>>,
    pub version: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEvaluationRequest {
    pub title: String,
    pub assessment_type: String,
    pub scope: Option<String>,
    pub period_start: Option<String>,
    pub period_end: Option<String>,
    pub assessor: Option<String>,
    pub assessment_date: Option<String>,
    pub result: Option<String>,
    pub score: Option<f64>,
    pub findings: Option<String>,
    pub non_complianceitems: Option<Vec<String>>,
    pub corrective_actions: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEvaluationRequest {
    pub title: Option<String>,
    pub assessment_type: Option<String>,
    pub scope: Option<String>,
    pub period_start: Option<String>,
    pub period_end: Option<String>,
    pub assessor: Option<String>,
    pub assessment_date: Option<String>,
    pub result: Option<String>,
    pub score: Option<f64>,
    pub findings: Option<String>,
    pub non_complianceitems: Option<Vec<String>>,
    pub corrective_actions: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateMonitorRecordRequest {
    pub monitor_type: String,
    pub monitor_point: String,
    pub monitor_date: Option<String>,
    pub monitor_agency: Option<String>,
    pub monitor_method: Option<String>,
    pub pollutant: Option<String>,
    pub concentration: Option<String>,
    pub unit: Option<String>,
    pub standard_value: Option<String>,
    pub standard_type: Option<String>,
    pub result: String,
    pub flow_rate: Option<String>,
    pub emission_rate: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreatePermitRequest {
    pub title: String,
    pub permit_type: String,
    pub permit_category: Option<String>,
    pub holder: Option<String>,
    pub issue_date: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub issuing_authority: Option<String>,
    pub discharge_location: Option<String>,
    pub discharge_standard: Option<String>,
    pub discharge_limits: Option<Vec<DischargeLimit>>,
    pub monitoring_requirements: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePermitRequest {
    pub title: Option<String>,
    pub permit_type: Option<String>,
    pub permit_category: Option<String>,
    pub holder: Option<String>,
    pub issue_date: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub issuing_authority: Option<String>,
    pub discharge_location: Option<String>,
    pub discharge_standard: Option<String>,
    pub discharge_limits: Option<Vec<DischargeLimit>>,
    pub monitoring_requirements: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateIncidentRequest {
    pub title: String,
    pub incident_type: String,
    pub level: Option<String>,
    pub location: Option<String>,
    pub occurred_at: Option<String>,
    pub reported_by: Option<String>,
    pub description: Option<String>,
    pub immediate_measures: Option<String>,
    pub responsible_person: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateIncidentRequest {
    pub level: Option<String>,
    pub status: Option<String>,
    pub cause: Option<String>,
    pub impact: Option<String>,
    pub investigation_result: Option<String>,
    pub corrective_actions: Option<String>,
    pub preventive_measures: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RegulationQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environmental-compliance/regulations",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_regulations(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<RegulationQuery>,
) -> Json<ApiResponse<Vec<EnvironmentalRegulation>>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(category) = &q.category {
        where_clause.push_str(&format!(" AND category = ${}", params.len() + 1));
        params.push(category.clone());
    }
    if let Some(status) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(status.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(
            " AND (title ILIKE ${} OR reg_no ILIKE ${})",
            params.len() + 1,
            params.len() + 2
        ));
        let like = format!("%{search}%");
        params.push(like.clone());
        params.push(like);
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, reg_no AS regulation_no, title, category, regulation_type,
               issuing_authority, issued_date::text AS issue_date, effective_date::text AS effective_date,
               expiry_date::text AS expiry_date, status, content, keywords, applicable_scopes,
               related_files AS attachments, version, created_by,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_environmental_regulations
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );

    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list environmental regulations: {}", e);
            return Json(ApiResponse::error(500, "获取环保法规列表失败"));
        }
    };

    let list: Vec<EnvironmentalRegulation> =
        rows.iter().map(environmental_regulation_from_row).collect();
    Json(ApiResponse::success(list, "获取环保法规列表成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/environmental-compliance/regulations",
    request_body = CreateRegulationRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_regulation(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateRegulationRequest>,
) -> Json<ApiResponse<EnvironmentalRegulation>> {
    let tenant_id = resolve_tenant_id(&claims);
    let reg_no = format!("ER-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let keywords: serde_json::Value = req
        .keywords
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::json!([])))
        .unwrap_or_else(|| serde_json::json!([]));
    let applicable_scopes: serde_json::Value = req
        .applicable_scopes
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::json!([])))
        .unwrap_or_else(|| serde_json::json!([]));
    let attachments: serde_json::Value = req
        .attachments
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::json!([])))
        .unwrap_or_else(|| serde_json::json!([]));

    let sql = r#"
        INSERT INTO ehs.qa_ehs_environmental_regulations
            (reg_no, title, category, regulation_type, issuing_authority, issued_date,
             effective_date, expiry_date, status, content, keywords, applicable_scopes,
             related_files, version, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id::text AS id, reg_no AS regulation_no, title, category, regulation_type,
                  issuing_authority, issued_date::text AS issue_date, effective_date::text AS effective_date,
                  expiry_date::text AS expiry_date, status, content, keywords, applicable_scopes,
                  related_files AS attachments, version, created_by,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sql)
        .bind(&reg_no)
        .bind(&req.title)
        .bind(&req.category)
        .bind(req.regulation_type)
        .bind(req.issuing_authority)
        .bind(req.issue_date)
        .bind(req.effective_date)
        .bind(req.expiry_date)
        .bind("draft")
        .bind(req.content)
        .bind(keywords)
        .bind(applicable_scopes)
        .bind(attachments)
        .bind(req.version)
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create environmental regulation: {}", e);
            return Json(ApiResponse::error(500, "环保法规创建失败"));
        }
    };
    let regulation = environmental_regulation_from_row(&row);
    Json(ApiResponse::success(regulation, "环保法规创建成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environmental-compliance/regulations/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "法规 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_regulation(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<EnvironmentalRegulation>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let sql = r#"
        SELECT id::text AS id, reg_no AS regulation_no, title, category, regulation_type,
               issuing_authority, issued_date::text AS issue_date, effective_date::text AS effective_date,
               expiry_date::text AS expiry_date, status, content, keywords, applicable_scopes,
               related_files AS attachments, version, created_by,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_environmental_regulations
        WHERE id = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let row = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "环保法规不存在")),
        Err(e) => {
            tracing::error!("Failed to get environmental regulation: {}", e);
            return Json(ApiResponse::error(500, "获取环保法规失败"));
        }
    };
    let regulation = environmental_regulation_from_row(&row);
    Json(ApiResponse::success(regulation, "获取环保法规成功"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/environmental-compliance/regulations/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "法规 ID")),
    request_body = UpdateRegulationRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn update_regulation(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateRegulationRequest>,
) -> Json<ApiResponse<EnvironmentalRegulation>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    if let Some(v) = req.title {
        sets.push(format!("title = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.category {
        sets.push(format!("category = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.regulation_type {
        sets.push(format!("regulation_type = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.issuing_authority {
        sets.push(format!("issuing_authority = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.issue_date {
        sets.push(format!("issued_date = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.effective_date {
        sets.push(format!("effective_date = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.expiry_date {
        sets.push(format!("expiry_date = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.status {
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.content {
        sets.push(format!("content = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.version {
        sets.push(format!("version = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.keywords {
        sets.push(format!("keywords = ${}", params.len() + 1));
        params.push(serde_json::to_string(&v).unwrap_or_else(|_| "[]".to_string()));
    }
    if let Some(v) = req.applicable_scopes {
        sets.push(format!("applicable_scopes = ${}", params.len() + 1));
        params.push(serde_json::to_string(&v).unwrap_or_else(|_| "[]".to_string()));
    }
    if let Some(v) = req.attachments {
        sets.push(format!("related_files = ${}", params.len() + 1));
        params.push(serde_json::to_string(&v).unwrap_or_else(|_| "[]".to_string()));
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_idx = params.len() + 2;
    let sql = format!(
        r#"
        UPDATE ehs.qa_ehs_environmental_regulations
        SET {set_clause}
        WHERE id = ${id_idx}
          AND (${tenant_idx} = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = ${tenant_idx})
          AND deleted_at IS NULL
        RETURNING id::text AS id, reg_no AS regulation_no, title, category, regulation_type,
                  issuing_authority, issued_date::text AS issue_date, effective_date::text AS effective_date,
                  expiry_date::text AS expiry_date, status, content, keywords, applicable_scopes,
                  related_files AS attachments, version, created_by,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let row = match query
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "环保法规不存在")),
        Err(e) => {
            tracing::error!("Failed to update environmental regulation: {}", e);
            return Json(ApiResponse::error(500, "环保法规更新失败"));
        }
    };
    let regulation = environmental_regulation_from_row(&row);
    Json(ApiResponse::success(regulation, "环保法规更新成功"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/environmental-compliance/regulations/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "法规 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_regulation(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let sql = r#"
        UPDATE ehs.qa_ehs_environmental_regulations
        SET deleted_at = now()
        WHERE id = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let result = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .execute(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete environmental regulation: {}", e);
            return Json(ApiResponse::error(500, "环保法规删除失败"));
        }
    };
    if result.rows_affected() == 0 {
        return Json(ApiResponse::error(404, "环保法规不存在"));
    }
    Json(ApiResponse::success((), "环保法规删除成功"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/environmental-compliance/monitoring/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "监测记录 ID")),
    request_body = CreateMonitorRecordRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn update_monitor_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateMonitorRecordRequest>,
) -> Json<ApiResponse<EnvironmentMonitor>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Updating monitor record {}: {:?}", id, req);
    Json(ApiResponse::success(
        EnvironmentMonitor {
            id,
            record_no: "EM-2024001".to_string(),
            monitor_type: req.monitor_type,
            monitor_point: req.monitor_point,
            monitor_date: req.monitor_date,
            monitor_agency: req.monitor_agency,
            monitor_method: req.monitor_method,
            pollutant: req.pollutant,
            concentration: req.concentration,
            unit: req.unit,
            standard_value: req.standard_value,
            standard_type: req.standard_type,
            result: req.result,
            flow_rate: req.flow_rate,
            emission_rate: req.emission_rate,
            status: "completed".to_string(),
            remarks: req.remarks,
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),
            tenant_id,
        },
        "监测记录更新成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environmental-compliance/permits/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "排污许可 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_permit(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<DischargePermit>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let sql = r#"
        SELECT id::text AS id, permit_no, permit_name AS title, permit_type, permit_category,
               holder, issued_date::text AS issue_date, valid_from::text AS effective_date,
               valid_to::text AS expiry_date, issuing_authority, discharge_location,
               discharge_standard, discharge_limits, monitoring_requirements, status,
               attachments, created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_discharge_permits
        WHERE id = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let row = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "排污许可不存在")),
        Err(e) => {
            tracing::error!("Failed to get discharge permit: {}", e);
            return Json(ApiResponse::error(500, "获取排污许可失败"));
        }
    };
    let permit = discharge_permit_from_row(&row);
    Json(ApiResponse::success(permit, "获取排污许可成功"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/environmental-compliance/permits/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "排污许可 ID")),
    request_body = UpdatePermitRequest,
    responses((status = 200, description = "OK")),
)]
pub async fn update_permit(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdatePermitRequest>,
) -> Json<ApiResponse<DischargePermit>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    if let Some(v) = req.title {
        sets.push(format!("permit_name = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.permit_type {
        sets.push(format!("permit_type = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.permit_category {
        sets.push(format!("permit_category = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.holder {
        sets.push(format!("holder = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.issue_date {
        sets.push(format!("issued_date = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.effective_date {
        sets.push(format!("valid_from = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.expiry_date {
        sets.push(format!("valid_to = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.issuing_authority {
        sets.push(format!("issuing_authority = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.discharge_location {
        sets.push(format!("discharge_location = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.discharge_standard {
        sets.push(format!("discharge_standard = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.discharge_limits {
        sets.push(format!("discharge_limits = ${}", params.len() + 1));
        params.push(serde_json::to_string(&v).unwrap_or_else(|_| "[]".to_string()));
    }
    if let Some(v) = req.monitoring_requirements {
        sets.push(format!("monitoring_requirements = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.attachments {
        sets.push(format!("attachments = ${}", params.len() + 1));
        params.push(serde_json::to_string(&v).unwrap_or_else(|_| "[]".to_string()));
    }
    if let Some(v) = req.status {
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(v);
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_idx = params.len() + 2;
    let sql = format!(
        r#"
        UPDATE ehs.qa_ehs_discharge_permits
        SET {set_clause}
        WHERE id = ${id_idx}
          AND (${tenant_idx} = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = ${tenant_idx})
          AND deleted_at IS NULL
        RETURNING id::text AS id, permit_no, permit_name AS title, permit_type, permit_category,
                  holder, issued_date::text AS issue_date, valid_from::text AS effective_date,
                  valid_to::text AS expiry_date, issuing_authority, discharge_location,
                  discharge_standard, discharge_limits, monitoring_requirements, status,
                  attachments, created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let row = match query
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "排污许可不存在")),
        Err(e) => {
            tracing::error!("Failed to update discharge permit: {}", e);
            return Json(ApiResponse::error(500, "排污许可更新失败"));
        }
    };
    let permit = discharge_permit_from_row(&row);
    Json(ApiResponse::success(permit, "排污许可更新成功"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/environmental-compliance/permits/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "排污许可 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_permit(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let sql = r#"
        UPDATE ehs.qa_ehs_discharge_permits
        SET deleted_at = now()
        WHERE id = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let result = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .execute(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete discharge permit: {}", e);
            return Json(ApiResponse::error(500, "排污许可删除失败"));
        }
    };
    if result.rows_affected() == 0 {
        return Json(ApiResponse::error(404, "排污许可不存在"));
    }
    Json(ApiResponse::success((), "排污许可删除成功"))
}

#[derive(Debug, Deserialize)]
pub struct AssessmentQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub assessment_type: Option<String>,
    pub result: Option<String>,
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environmental-compliance/evaluations",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_evaluations(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<AssessmentQuery>,
) -> Json<ApiResponse<Vec<ComplianceAssessment>>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(t) = &q.assessment_type {
        where_clause.push_str(&format!(" AND eval_type = ${}", params.len() + 1));
        params.push(t.clone());
    }
    if let Some(r) = &q.result {
        where_clause.push_str(&format!(" AND overall_result = ${}", params.len() + 1));
        params.push(r.clone());
    }
    if let Some(s) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(s.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(
            " AND (title ILIKE ${} OR eval_no ILIKE ${})",
            params.len() + 1,
            params.len() + 2
        ));
        let like = format!("%{search}%");
        params.push(like.clone());
        params.push(like);
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, eval_no AS assessment_no, title, eval_type AS assessment_type,
               eval_period AS scope, start_date::text AS period_start, end_date::text AS period_end,
               evaluator AS assessor, evaluated_at::text AS assessment_date, overall_result AS result,
               compliance_rate::float8 AS score, findings, non_complianceitems,
               corrective_actions, status, attachments,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_compliance_evaluations
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );
    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list compliance assessments: {}", e);
            return Json(ApiResponse::error(500, "获取合规性评价列表失败"));
        }
    };
    let list: Vec<ComplianceAssessment> = rows.iter().map(compliance_assessment_from_row).collect();
    Json(ApiResponse::success(list, "获取合规性评价列表成功"))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/environmental-compliance/evaluations",
    request_body = CreateEvaluationRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_evaluation(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateEvaluationRequest>,
) -> Json<ApiResponse<ComplianceAssessment>> {
    let tenant_id = resolve_tenant_id(&claims);
    let eval_no = format!("CE-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let non_complianceitems: serde_json::Value = req
        .non_complianceitems
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::json!([])))
        .unwrap_or_else(|| serde_json::json!([]));
    let attachments: serde_json::Value = req
        .attachments
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::json!([])))
        .unwrap_or_else(|| serde_json::json!([]));

    let sql = r#"
        INSERT INTO ehs.qa_ehs_compliance_evaluations
            (eval_no, title, eval_type, eval_period, start_date, end_date, evaluator,
             evaluated_at, overall_result, compliance_rate, findings, non_complianceitems,
             corrective_actions, status, attachments, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id::text AS id, eval_no AS assessment_no, title, eval_type AS assessment_type,
                  eval_period AS scope, start_date::text AS period_start, end_date::text AS period_end,
                  evaluator AS assessor, evaluated_at::text AS assessment_date, overall_result AS result,
                  compliance_rate::float8 AS score, findings, non_complianceitems,
                  corrective_actions, status, attachments,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sql)
        .bind(&eval_no)
        .bind(&req.title)
        .bind(&req.assessment_type)
        .bind(req.scope)
        .bind(req.period_start)
        .bind(req.period_end)
        .bind(req.assessor)
        .bind(req.assessment_date)
        .bind(req.result)
        .bind(req.score)
        .bind(req.findings)
        .bind(non_complianceitems)
        .bind(req.corrective_actions)
        .bind(req.status.unwrap_or_else(|| "in_progress".to_string()))
        .bind(attachments)
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create compliance assessment: {}", e);
            return Json(ApiResponse::error(500, "合规性评价创建失败"));
        }
    };
    let assessment = compliance_assessment_from_row(&row);
    Json(ApiResponse::success(assessment, "合规性评价创建成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environmental-compliance/evaluations/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_evaluation(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<ComplianceAssessment>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let sql = r#"
        SELECT id::text AS id, eval_no AS assessment_no, title, eval_type AS assessment_type,
               eval_period AS scope, start_date::text AS period_start, end_date::text AS period_end,
               evaluator AS assessor, evaluated_at::text AS assessment_date, overall_result AS result,
               compliance_rate::float8 AS score, findings, non_complianceitems,
               corrective_actions, status, attachments,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_compliance_evaluations
        WHERE id = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let row = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "合规性评价不存在")),
        Err(e) => {
            tracing::error!("Failed to get compliance assessment: {}", e);
            return Json(ApiResponse::error(500, "获取评价详情失败"));
        }
    };
    let assessment = compliance_assessment_from_row(&row);
    Json(ApiResponse::success(assessment, "获取评价详情成功"))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/environmental-compliance/evaluations/{id}",
    request_body = UpdateEvaluationRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_evaluation(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateEvaluationRequest>,
) -> Json<ApiResponse<ComplianceAssessment>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    if let Some(v) = req.title {
        sets.push(format!("title = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.assessment_type {
        sets.push(format!("eval_type = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.scope {
        sets.push(format!("eval_period = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.period_start {
        sets.push(format!("start_date = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.period_end {
        sets.push(format!("end_date = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.assessor {
        sets.push(format!("evaluator = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.assessment_date {
        sets.push(format!("evaluated_at = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.result {
        sets.push(format!("overall_result = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.score {
        sets.push(format!("compliance_rate = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.findings {
        sets.push(format!("findings = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.non_complianceitems {
        sets.push(format!("non_complianceitems = ${}", params.len() + 1));
        params.push(serde_json::to_string(&v).unwrap_or_else(|_| "[]".to_string()));
    }
    if let Some(v) = req.corrective_actions {
        sets.push(format!("corrective_actions = ${}", params.len() + 1));
        params.push(v);
    }
    if let Some(v) = req.attachments {
        sets.push(format!("attachments = ${}", params.len() + 1));
        params.push(serde_json::to_string(&v).unwrap_or_else(|_| "[]".to_string()));
    }
    if let Some(v) = req.status {
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(v);
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_idx = params.len() + 2;
    let sql = format!(
        r#"
        UPDATE ehs.qa_ehs_compliance_evaluations
        SET {set_clause}
        WHERE id = ${id_idx}
          AND (${tenant_idx} = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = ${tenant_idx})
          AND deleted_at IS NULL
        RETURNING id::text AS id, eval_no AS assessment_no, title, eval_type AS assessment_type,
                  eval_period AS scope, start_date::text AS period_start, end_date::text AS period_end,
                  evaluator AS assessor, evaluated_at::text AS assessment_date, overall_result AS result,
                  compliance_rate::float8 AS score, findings, non_complianceitems,
                  corrective_actions, status, attachments,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let row = match query
        .bind(&id)
        .bind(&tenant_bind)
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(r)) => r,
        Ok(None) => return Json(ApiResponse::error(404, "合规性评价不存在")),
        Err(e) => {
            tracing::error!("Failed to update compliance assessment: {}", e);
            return Json(ApiResponse::error(500, "评价更新失败"));
        }
    };
    let assessment = compliance_assessment_from_row(&row);
    Json(ApiResponse::success(assessment, "评价更新成功"))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/environmental-compliance/evaluations/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_evaluation(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let sql = r#"
        UPDATE ehs.qa_ehs_compliance_evaluations
        SET deleted_at = now()
        WHERE id = $1
          AND ($2 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $2)
          AND deleted_at IS NULL
    "#;
    let result = match sqlx::query(sql)
        .bind(&id)
        .bind(&tenant_bind)
        .execute(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete compliance assessment: {}", e);
            return Json(ApiResponse::error(500, "评价删除失败"));
        }
    };
    if result.rows_affected() == 0 {
        return Json(ApiResponse::error(404, "合规性评价不存在"));
    }
    Json(ApiResponse::success((), "评价删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environmental-compliance/monitoring",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_monitor_records(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<EnvironmentMonitor>>> {
    tracing::debug!("Listing environment monitor records");
    Json(ApiResponse::success(
        Vec::<EnvironmentMonitor>::new(),
        "获取环境监测记录列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/environmental-compliance/monitoring",
    request_body = CreateMonitorRecordRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_monitor_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateMonitorRecordRequest>,
) -> Json<ApiResponse<EnvironmentMonitor>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Creating environment monitor record: {:?}", req);
    Json(ApiResponse::success(
        EnvironmentMonitor {
            id: uuid::Uuid::new_v4().to_string(),
            record_no: format!(
                "EM-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            monitor_type: req.monitor_type,
            monitor_point: req.monitor_point,
            monitor_date: req.monitor_date,
            monitor_agency: req.monitor_agency,
            monitor_method: req.monitor_method,
            pollutant: req.pollutant,
            concentration: req.concentration,
            unit: req.unit,
            standard_value: req.standard_value,
            standard_type: req.standard_type,
            result: req.result,
            flow_rate: req.flow_rate,
            emission_rate: req.emission_rate,
            status: "completed".to_string(),
            remarks: req.remarks,
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "监测记录创建成功",
    ))
}

#[derive(Debug, Deserialize)]
pub struct PermitQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub permit_type: Option<String>,
    pub permit_category: Option<String>,
    pub status: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:permit:read"])),
    path = "/api/ehs/environmental-compliance/permits",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_permits(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<PermitQuery>,
) -> Json<ApiResponse<Vec<DischargePermit>>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(t) = &q.permit_type {
        where_clause.push_str(&format!(" AND permit_type = ${}", params.len() + 1));
        params.push(t.clone());
    }
    if let Some(c) = &q.permit_category {
        where_clause.push_str(&format!(" AND permit_category = ${}", params.len() + 1));
        params.push(c.clone());
    }
    if let Some(s) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(s.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(
            " AND (permit_name ILIKE ${} OR permit_no ILIKE ${})",
            params.len() + 1,
            params.len() + 2
        ));
        let like = format!("%{search}%");
        params.push(like.clone());
        params.push(like);
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, permit_no, permit_name AS title, permit_type, permit_category,
               holder, issued_date::text AS issue_date, valid_from::text AS effective_date,
               valid_to::text AS expiry_date, issuing_authority, discharge_location,
               discharge_standard, discharge_limits, monitoring_requirements, status,
               attachments, created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_discharge_permits
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );
    let mut query = sqlx::query(&sql);
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list discharge permits: {}", e);
            return Json(ApiResponse::error(500, "获取排污许可列表失败"));
        }
    };
    let list: Vec<DischargePermit> = rows.iter().map(discharge_permit_from_row).collect();
    Json(ApiResponse::success(list, "获取排污许可列表成功"))
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:permit:admin"])),
    path = "/api/ehs/environmental-compliance/permits",
    request_body = CreatePermitRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_permit(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreatePermitRequest>,
) -> Json<ApiResponse<DischargePermit>> {
    let tenant_id = resolve_tenant_id(&claims);
    let permit_no = format!("DP-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let discharge_limits: serde_json::Value = req
        .discharge_limits
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::json!([])))
        .unwrap_or_else(|| serde_json::json!([]));
    let attachments: serde_json::Value = req
        .attachments
        .map(|v| serde_json::to_value(v).unwrap_or_else(|_| serde_json::json!([])))
        .unwrap_or_else(|| serde_json::json!([]));

    let sql = r#"
        INSERT INTO ehs.qa_ehs_discharge_permits
            (permit_no, permit_type, permit_name, permit_category, holder, issued_date,
             valid_from, valid_to, issuing_authority, discharge_location, discharge_standard,
             discharge_limits, monitoring_requirements, status, attachments, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id::text AS id, permit_no, permit_name AS title, permit_type, permit_category,
                  holder, issued_date::text AS issue_date, valid_from::text AS effective_date,
                  valid_to::text AS expiry_date, issuing_authority, discharge_location,
                  discharge_standard, discharge_limits, monitoring_requirements, status,
                  attachments, created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sql)
        .bind(&permit_no)
        .bind(&req.permit_type)
        .bind(&req.title)
        .bind(req.permit_category)
        .bind(req.holder)
        .bind(req.issue_date)
        .bind(req.effective_date)
        .bind(req.expiry_date)
        .bind(req.issuing_authority)
        .bind(req.discharge_location)
        .bind(req.discharge_standard)
        .bind(discharge_limits)
        .bind(req.monitoring_requirements)
        .bind(req.status.unwrap_or_else(|| "valid".to_string()))
        .bind(attachments)
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create discharge permit: {}", e);
            return Json(ApiResponse::error(500, "排污许可创建失败"));
        }
    };
    let permit = discharge_permit_from_row(&row);
    Json(ApiResponse::success(permit, "排污许可创建成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:incident:read"])),
    path = "/api/ehs/environmental-compliance/incidents",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_incidents(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<EnvironmentIncident>>> {
    tracing::debug!("Listing environment incidents");
    Json(ApiResponse::success(
        Vec::<EnvironmentIncident>::new(),
        "获取环境事件列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:incident:write"])),
    path = "/api/ehs/environmental-compliance/incidents",
    request_body = CreateIncidentRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_incident(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateIncidentRequest>,
) -> Json<ApiResponse<EnvironmentIncident>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Creating environment incident: {:?}", req);
    Json(ApiResponse::success(
        EnvironmentIncident {
            id: uuid::Uuid::new_v4().to_string(),
            incident_no: format!(
                "EI-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            title: req.title,
            incident_type: req.incident_type,
            level: req.level,
            location: req.location,
            occurred_at: req.occurred_at,
            reported_by: req.reported_by,
            reported_at: Some(chrono::Utc::now().to_rfc3339()),
            description: req.description,
            cause: None,
            impact: None,
            immediate_measures: req.immediate_measures,
            status: "reported".to_string(),
            responsible_person: req.responsible_person,
            investigation_result: None,
            corrective_actions: None,
            preventive_measures: None,
            closed_at: None,
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "环境事件创建成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:incident:read"])),
    path = "/api/ehs/environmental-compliance/incidents/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_incident(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<EnvironmentIncident>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Getting environment incident: {}", id);
    Json(ApiResponse::success(
        EnvironmentIncident {
            id,
            incident_no: "EI-2024001".to_string(),
            title: "废水管网泄漏事件".to_string(),
            incident_type: "wastewater_leak".to_string(),
            level: Some("general".to_string()),
            location: Some("厂区东南角".to_string()),
            occurred_at: Some("2024-05-15T08:30:00Z".to_string()),
            reported_by: Some("巡检员".to_string()),
            reported_at: Some("2024-05-15T08:45:00Z".to_string()),
            description: Some("废水管网接口处发生少量泄漏".to_string()),
            cause: Some("管道老化导致接口松动".to_string()),
            impact: Some("少量废水渗入土壤，已及时清理".to_string()),
            immediate_measures: Some("立即关闭阀门，组织人员清理现场".to_string()),
            status: "closed".to_string(),
            responsible_person: Some("设施主管".to_string()),
            investigation_result: Some("管道老化，需定期检查更换".to_string()),
            corrective_actions: Some("更换老化管道，增加巡检频次".to_string()),
            preventive_measures: Some("建立管道定期检测制度".to_string()),
            closed_at: Some(chrono::Utc::now().to_rfc3339()),
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "获取环境事件详情成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:incident:write"])),
    path = "/api/ehs/environmental-compliance/incidents/{id}",
    request_body = UpdateIncidentRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_incident(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateIncidentRequest>,
) -> Json<ApiResponse<EnvironmentIncident>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Updating environment incident {}: {:?}", id, req);
    let status = req
        .status
        .clone()
        .unwrap_or_else(|| "investigating".to_string());
    let closed_at = if status == "closed" {
        Some(chrono::Utc::now().to_rfc3339())
    } else {
        None
    };

    Json(ApiResponse::success(
        EnvironmentIncident {
            id,
            incident_no: "EI-2024001".to_string(),
            title: "废水管网泄漏事件".to_string(),
            incident_type: "wastewater_leak".to_string(),
            level: req.level,
            location: Some("厂区东南角".to_string()),
            occurred_at: Some("2024-05-15T08:30:00Z".to_string()),
            reported_by: Some("巡检员".to_string()),
            reported_at: Some("2024-05-15T08:45:00Z".to_string()),
            description: Some("废水管网接口处发生少量泄漏".to_string()),
            cause: req.cause,
            impact: req.impact,
            immediate_measures: Some("立即关闭阀门，组织人员清理现场".to_string()),
            status,
            responsible_person: Some("设施主管".to_string()),
            investigation_result: req.investigation_result,
            corrective_actions: req.corrective_actions,
            preventive_measures: req.preventive_measures,
            closed_at,
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "环境事件更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:incident:write"])),
    path = "/api/ehs/environmental-compliance/incidents/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_incident(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting environment incident: {}", id);
    Json(ApiResponse::success((), "环境事件删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environmental-compliance/statistics",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn get_compliance_statistics(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<ComplianceStatistics>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt
        .unwrap_or_else(|| uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap());
    tracing::debug!("Getting compliance statistics");
    Json(ApiResponse::success(
        ComplianceStatistics {
            total_regulations: 25,
            active_regulations: 23,
            total_evaluations: 4,
            average_compliance_rate: Some(94.2),
            total_monitor_records: 120,
            qualified_monitor_records: 115,
            total_permits: 5,
            expiring_permits: 1,
            total_incidents: 3,
            open_incidents: 0,
            by_monitor_type: vec![
                serde_json::json!({ "type": "wastewater", "name": "废水", "count": 48, "qualified": 46 }),
                serde_json::json!({ "type": "wastegas", "name": "废气", "count": 36, "qualified": 35 }),
                serde_json::json!({ "type": "noise", "name": "噪声", "count": 24, "qualified": 24 }),
                serde_json::json!({ "type": "solid_waste", "name": "固废", "count": 12, "qualified": 10 }),
            ],
            by_incident_type: vec![
                serde_json::json!({ "type": "wastewater_leak", "name": "废水泄漏", "count": 1 }),
                serde_json::json!({ "type": "wastegas_emission", "name": "废气超标", "count": 1 }),
                serde_json::json!({ "type": "solid_waste", "name": "固废处置", "count": 1 }),
            ],

            tenant_id,
        },
        "获取环保合规统计成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environmental-compliance/regulations/categories",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_regulation_categories(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    tracing::debug!("Listing regulation categories");
    let categories = vec![
        serde_json::json!({ "code": "law", "name": "法律" }),
        serde_json::json!({ "code": "regulation", "name": "行政法规" }),
        serde_json::json!({ "code": "local_regulation", "name": "地方法规" }),
        serde_json::json!({ "code": "department_rule", "name": "部门规章" }),
        serde_json::json!({ "code": "standard", "name": "标准" }),
        serde_json::json!({ "code": "policy", "name": "政策文件" }),
    ];
    Json(ApiResponse::success(categories, "获取法规分类成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environmental-compliance/monitoring/types",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_monitor_types(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<serde_json::Value>>> {
    tracing::debug!("Listing monitor types");
    let types = vec![
        serde_json::json!({ "code": "wastewater", "name": "废水监测" }),
        serde_json::json!({ "code": "wastegas", "name": "废气监测" }),
        serde_json::json!({ "code": "noise", "name": "噪声监测" }),
        serde_json::json!({ "code": "solid_waste", "name": "固废监测" }),
        serde_json::json!({ "code": "soil", "name": "土壤监测" }),
        serde_json::json!({ "code": "groundwater", "name": "地下水监测" }),
    ];
    Json(ApiResponse::success(types, "获取监测类型成功"))
}

/// 解析请求租户：超管 → nil UUID（全租户可见）；否则取 claims.tenant_id。
fn resolve_tenant_id(claims: &Claims) -> uuid::Uuid {
    if claims.is_superuser {
        uuid::Uuid::nil()
    } else {
        claims
            .tenant_id
            .as_deref()
            .and_then(|t| uuid::Uuid::parse_str(t).ok())
            .unwrap_or_else(uuid::Uuid::nil)
    }
}

/// qa_ehs_environmental_regulations 行 → EnvironmentalRegulation（SELECT 列别名对齐本函数字段）
fn environmental_regulation_from_row(r: &sqlx::postgres::PgRow) -> EnvironmentalRegulation {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    let keywords: Option<serde_json::Value> = r.try_get("keywords").ok().flatten();
    let keywords = keywords.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    let applicable_scopes: Option<serde_json::Value> =
        r.try_get("applicable_scopes").ok().flatten();
    let applicable_scopes = applicable_scopes.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    let attachments: Option<serde_json::Value> = r.try_get("attachments").ok().flatten();
    let attachments = attachments.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    EnvironmentalRegulation {
        id: r.try_get("id").unwrap_or_default(),
        regulation_no: r.try_get("regulation_no").unwrap_or_default(),
        title: r.try_get("title").unwrap_or_default(),
        category: r.try_get("category").unwrap_or_default(),
        regulation_type: r.try_get("regulation_type").ok().flatten(),
        issuing_authority: r.try_get("issuing_authority").ok().flatten(),
        issue_date: r.try_get("issue_date").ok().flatten(),
        effective_date: r.try_get("effective_date").ok().flatten(),
        expiry_date: r.try_get("expiry_date").ok().flatten(),
        status: r.try_get("status").unwrap_or_else(|_| "draft".to_string()),
        content: r.try_get("content").ok().flatten(),
        keywords,
        applicable_scopes,
        attachments,
        version: r.try_get("version").ok().flatten(),
        created_by: r.try_get("created_by").ok().flatten(),
        created_at: r.try_get::<String, _>("created_at").ok(),
        updated_at: r.try_get::<String, _>("updated_at").ok(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}

/// qa_ehs_compliance_evaluations 行 → ComplianceAssessment（SELECT 列别名对齐本函数字段）
fn compliance_assessment_from_row(r: &sqlx::postgres::PgRow) -> ComplianceAssessment {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    let non_complianceitems: Option<serde_json::Value> =
        r.try_get("non_complianceitems").ok().flatten();
    let non_complianceitems = non_complianceitems.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    let attachments: Option<serde_json::Value> = r.try_get("attachments").ok().flatten();
    let attachments = attachments.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    ComplianceAssessment {
        id: r.try_get("id").unwrap_or_default(),
        assessment_no: r.try_get("assessment_no").unwrap_or_default(),
        title: r.try_get("title").unwrap_or_default(),
        assessment_type: r.try_get("assessment_type").unwrap_or_default(),
        scope: r.try_get("scope").ok().flatten(),
        period_start: r.try_get("period_start").ok().flatten(),
        period_end: r.try_get("period_end").ok().flatten(),
        assessor: r.try_get("assessor").ok().flatten(),
        assessment_date: r.try_get("assessment_date").ok().flatten(),
        result: r.try_get("result").ok().flatten(),
        score: r.try_get("score").ok().flatten(),
        findings: r.try_get("findings").ok().flatten(),
        non_complianceitems,
        corrective_actions: r.try_get("corrective_actions").ok().flatten(),
        status: r
            .try_get("status")
            .unwrap_or_else(|_| "in_progress".to_string()),
        attachments,
        created_at: r.try_get::<String, _>("created_at").ok(),
        updated_at: r.try_get::<String, _>("updated_at").ok(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}

/// qa_ehs_discharge_permits 行 → DischargePermit（SELECT 列别名对齐本函数字段）
fn discharge_permit_from_row(r: &sqlx::postgres::PgRow) -> DischargePermit {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    let discharge_limits: Option<serde_json::Value> = r.try_get("discharge_limits").ok().flatten();
    let discharge_limits = discharge_limits.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| serde_json::from_value::<DischargeLimit>(e.clone()).ok())
                .collect::<Vec<DischargeLimit>>()
        })
    });
    let attachments: Option<serde_json::Value> = r.try_get("attachments").ok().flatten();
    let attachments = attachments.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    DischargePermit {
        id: r.try_get("id").unwrap_or_default(),
        permit_no: r.try_get("permit_no").unwrap_or_default(),
        title: r.try_get("title").ok().flatten(),
        permit_type: r.try_get("permit_type").unwrap_or_default(),
        permit_category: r.try_get("permit_category").ok().flatten(),
        holder: r.try_get("holder").ok().flatten(),
        issue_date: r.try_get("issue_date").ok().flatten(),
        effective_date: r.try_get("effective_date").ok().flatten(),
        expiry_date: r.try_get("expiry_date").ok().flatten(),
        issuing_authority: r.try_get("issuing_authority").ok().flatten(),
        discharge_location: r.try_get("discharge_location").ok().flatten(),
        discharge_standard: r.try_get("discharge_standard").ok().flatten(),
        discharge_limits,
        monitoring_requirements: r.try_get("monitoring_requirements").ok().flatten(),
        status: r.try_get("status").unwrap_or_else(|_| "valid".to_string()),
        attachments,
        created_at: r.try_get::<String, _>("created_at").ok(),
        updated_at: r.try_get::<String, _>("updated_at").ok(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}
