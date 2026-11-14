//! Environmental compliance management - Regulations, compliance evaluation, monitoring, permits, and incidents

use axum::{
    extract::{Query, State},
    http::HeaderMap,
    routing::*,
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;
use utoipa::ToSchema;

use uuid::Uuid;

use crate::shared::permission::{dual_scope, open_read_scope, open_write_scope};
use crate::shared::AppState;

/// 统计查询：租户通道显式绑定 tenant_id，系统通道显式不带 tenant_id 谓词。
async fn compliance_scalar_i64(
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    sql: String,
    tenant: Option<Uuid>,
) -> i64 {
    let mut q = sqlx::query_scalar::<_, i64>(sqlx::AssertSqlSafe(sql));
    if let Some(t) = tenant {
        q = q.bind(t);
    }
    q.fetch_one(&mut *scope).await.unwrap_or(0)
}

async fn compliance_scalar_opt_f64(
    scope: &mut topems_shared_db::scope::ScopedTxn<'_>,
    sql: String,
    tenant: Option<Uuid>,
) -> Option<f64> {
    let mut q = sqlx::query_scalar::<_, Option<f64>>(sqlx::AssertSqlSafe(sql));
    if let Some(t) = tenant {
        q = q.bind(t);
    }
    q.fetch_one(&mut *scope).await.ok().flatten()
}
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
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

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
    pub assessment_date: Option<DateTime<Utc>>,
    pub result: Option<String>,
    pub score: Option<f64>,
    pub findings: Option<String>,
    pub non_complianceitems: Option<Vec<String>>,
    pub corrective_actions: Option<String>,
    pub status: String,
    pub attachments: Option<Vec<String>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize, Deserialize, ToSchema)]
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
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

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
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

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
    pub occurred_at: Option<DateTime<Utc>>,
    pub reported_by: Option<String>,
    pub reported_at: Option<DateTime<Utc>>,
    pub description: Option<String>,
    pub cause: Option<String>,
    pub impact: Option<String>,
    pub immediate_measures: Option<String>,
    pub status: String,
    pub responsible_person: Option<String>,
    pub investigation_result: Option<String>,
    pub corrective_actions: Option<String>,
    pub preventive_measures: Option<String>,
    pub closed_at: Option<DateTime<Utc>>,
    pub attachments: Option<Vec<String>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,

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

#[derive(Debug, Deserialize, ToSchema)]
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

#[derive(Debug, Deserialize, ToSchema)]
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

#[derive(Debug, Deserialize, ToSchema)]
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

#[derive(Debug, Deserialize, ToSchema)]
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

#[derive(Debug, Deserialize, ToSchema)]
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

#[derive(Debug, Deserialize, ToSchema)]
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

#[derive(Debug, Deserialize, ToSchema)]
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

#[derive(Debug, Deserialize, ToSchema)]
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

#[derive(Debug, Deserialize, ToSchema)]
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
) -> ApiResponse<Vec<EnvironmentalRegulation>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.list_regulations",
        "ehs.qa_ehs_environmental_regulations",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open regulation scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 租户通道显式绑定 tenant_id；系统通道（超管跨租户）SQL 里显式不含任何 tenant_id 谓词。
    let mut params: Vec<String> = Vec::new();
    let (mut where_clause, filter_base) = match tenant_scope.tenant_id() {
        Some(_) => (
            String::from(" WHERE tenant_id = $1::uuid AND deleted_at IS NULL"),
            2,
        ),
        None => (String::from(" WHERE deleted_at IS NULL"), 1),
    };
    if let Some(category) = &q.category {
        where_clause.push_str(&format!(" AND category = ${}", params.len() + filter_base));
        params.push(category.clone());
    }
    if let Some(status) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + filter_base));
        params.push(status.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(
            " AND (title ILIKE ${} OR reg_no ILIKE ${})",
            params.len() + filter_base,
            params.len() + filter_base + 1
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
               created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_environmental_regulations
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );

    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list environmental regulations: {}", e);
            return ApiResponse::server_error("获取环保法规列表失败");
        }
    };

    let list: Vec<EnvironmentalRegulation> =
        rows.iter().map(environmental_regulation_from_row).collect();
    ApiResponse::success(list, "获取环保法规列表成功")
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
) -> ApiResponse<EnvironmentalRegulation> {
    let tenant = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut scope = match state.db.scope_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant_id = tenant;
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
                  created_at AS created_at, updated_at AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sqlx::AssertSqlSafe(sql))
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
        .fetch_one(&mut scope)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create environmental regulation: {}", e);
            return ApiResponse::server_error("环保法规创建失败");
        }
    };
    let regulation = environmental_regulation_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(regulation, "环保法规创建成功")
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
) -> ApiResponse<EnvironmentalRegulation> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.get_regulation",
        "ehs.qa_ehs_environmental_regulations",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open regulation scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        SELECT id::text AS id, reg_no AS regulation_no, title, category, regulation_type,
               issuing_authority, issued_date::text AS issue_date, effective_date::text AS effective_date,
               expiry_date::text AS expiry_date, status, content, keywords, applicable_scopes,
               related_files AS attachments, version, created_by,
               created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_environmental_regulations
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
    "#
    } else {
        r#"
        SELECT id::text AS id, reg_no AS regulation_no, title, category, regulation_type,
               issuing_authority, issued_date::text AS issue_date, effective_date::text AS effective_date,
               expiry_date::text AS expiry_date, status, content, keywords, applicable_scopes,
               related_files AS attachments, version, created_by,
               created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_environmental_regulations
        WHERE id::text = $1 AND deleted_at IS NULL
    "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_optional(&mut scope).await {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("环保法规不存在"),
        Err(e) => {
            tracing::error!("Failed to get environmental regulation: {}", e);
            return ApiResponse::server_error("获取环保法规失败");
        }
    };
    let regulation = environmental_regulation_from_row(&row);
    ApiResponse::success(regulation, "获取环保法规成功")
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
) -> ApiResponse<EnvironmentalRegulation> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.update_regulation",
        "ehs.qa_ehs_environmental_regulations",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open regulation scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
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
    let tenant_filter = if tenant_scope.tenant_id().is_some() {
        format!(" AND tenant_id = ${}::uuid", id_idx + 1)
    } else {
        String::new()
    };
    let sql = format!(
        r#"
        UPDATE ehs.qa_ehs_environmental_regulations
        SET {set_clause}
        WHERE id::text = ${id_idx}{tenant_filter}
          AND deleted_at IS NULL
        RETURNING id::text AS id, reg_no AS regulation_no, title, category, regulation_type,
                  issuing_authority, issued_date::text AS issue_date, effective_date::text AS effective_date,
                  expiry_date::text AS expiry_date, status, content, keywords, applicable_scopes,
                  related_files AS attachments, version, created_by,
                  created_at AS created_at, updated_at AS updated_at,
                  tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_optional(&mut scope).await {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("环保法规不存在"),
        Err(e) => {
            tracing::error!("Failed to update environmental regulation: {}", e);
            return ApiResponse::server_error("环保法规更新失败");
        }
    };
    let regulation = environmental_regulation_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(regulation, "环保法规更新成功")
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
) -> ApiResponse<()> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.delete_regulation",
        "ehs.qa_ehs_environmental_regulations",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open regulation scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        UPDATE ehs.qa_ehs_environmental_regulations
        SET deleted_at = now()
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
    "#
    } else {
        r#"
        UPDATE ehs.qa_ehs_environmental_regulations
        SET deleted_at = now()
        WHERE id::text = $1 AND deleted_at IS NULL
    "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let result = match query.execute(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete environmental regulation: {}", e);
            return ApiResponse::server_error("环保法规删除失败");
        }
    };
    if result.rows_affected() == 0 {
        return ApiResponse::not_found("环保法规不存在");
    }
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success((), "环保法规删除成功")
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<CreateMonitorRecordRequest>,
) -> ApiResponse<EnvironmentMonitor> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.update_monitor_record",
        "ehs.qa_ehs_env_monitor_records",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open monitor record scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    let mut add = |field: &str, val: Option<String>| {
        if let Some(v) = val {
            let cast = if field == "monitor_date" {
                "::date"
            } else {
                ""
            };
            sets.push(format!("{field} = ${}{cast}", params.len() + 1));
            params.push(v);
        }
    };
    add("monitor_type", Some(req.monitor_type));
    add("monitor_point", Some(req.monitor_point));
    add("monitor_date", req.monitor_date);
    add("monitor_agency", req.monitor_agency);
    add("monitor_method", req.monitor_method);
    add("pollutant", req.pollutant);
    add("concentration", req.concentration);
    add("unit", req.unit);
    add("standard_value", req.standard_value);
    add("standard_type", req.standard_type);
    add("result", Some(req.result));
    add("flow_rate", req.flow_rate);
    add("emission_rate", req.emission_rate);
    add("remarks", req.remarks);

    if sets.is_empty() {
        return ApiResponse::bad_request("无更新字段");
    }
    sets.push(format!("updated_at = ${}::timestamptz", params.len() + 1));
    params.push(chrono::Utc::now().to_rfc3339());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_filter = if tenant_scope.tenant_id().is_some() {
        format!(" AND tenant_id = ${}::uuid", id_idx + 1)
    } else {
        String::new()
    };
    let sql = format!(
        r#"
        UPDATE ehs.qa_ehs_env_monitor_records
        SET {set_clause}
        WHERE id::text = ${id_idx}{tenant_filter}
          AND deleted_at IS NULL
        RETURNING
            id::text AS id, record_no, monitor_type, monitor_point, monitor_date::text AS monitor_date,
            monitor_agency, monitor_method, pollutant, concentration, unit, standard_value, standard_type,
            result, flow_rate, emission_rate, status, remarks, attachments::text AS attachments,
            created_at AS created_at, updated_at AS updated_at, tenant_id AS tenant_id
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_one(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update monitor record: {}", e);
            return ApiResponse::not_found("监测记录不存在或更新失败");
        }
    };
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(monitor_record_from_row(&row), "更新监测记录成功")
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
) -> ApiResponse<DischargePermit> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.get_permit",
        "ehs.qa_ehs_discharge_permits",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open permit scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        SELECT id::text AS id, permit_no, permit_name AS title, permit_type, permit_category,
               holder, issued_date::text AS issue_date, valid_from::text AS effective_date,
               valid_to::text AS expiry_date, issuing_authority, discharge_location,
               discharge_standard, discharge_limits, monitoring_requirements, status,
               attachments, created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_discharge_permits
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
    "#
    } else {
        r#"
        SELECT id::text AS id, permit_no, permit_name AS title, permit_type, permit_category,
               holder, issued_date::text AS issue_date, valid_from::text AS effective_date,
               valid_to::text AS expiry_date, issuing_authority, discharge_location,
               discharge_standard, discharge_limits, monitoring_requirements, status,
               attachments, created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_discharge_permits
        WHERE id::text = $1 AND deleted_at IS NULL
    "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_optional(&mut scope).await {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("排污许可不存在"),
        Err(e) => {
            tracing::error!("Failed to get discharge permit: {}", e);
            return ApiResponse::server_error("获取排污许可失败");
        }
    };
    let permit = discharge_permit_from_row(&row);
    ApiResponse::success(permit, "获取排污许可成功")
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
) -> ApiResponse<DischargePermit> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.update_permit",
        "ehs.qa_ehs_discharge_permits",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open permit scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
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
    let tenant_filter = if tenant_scope.tenant_id().is_some() {
        format!(" AND tenant_id = ${}::uuid", id_idx + 1)
    } else {
        String::new()
    };
    let sql = format!(
        r#"
        UPDATE ehs.qa_ehs_discharge_permits
        SET {set_clause}
        WHERE id::text = ${id_idx}{tenant_filter}
          AND deleted_at IS NULL
        RETURNING id::text AS id, permit_no, permit_name AS title, permit_type, permit_category,
                  holder, issued_date::text AS issue_date, valid_from::text AS effective_date,
                  valid_to::text AS expiry_date, issuing_authority, discharge_location,
                  discharge_standard, discharge_limits, monitoring_requirements, status,
                  attachments, created_at AS created_at, updated_at AS updated_at,
                  tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_optional(&mut scope).await {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("排污许可不存在"),
        Err(e) => {
            tracing::error!("Failed to update discharge permit: {}", e);
            return ApiResponse::server_error("排污许可更新失败");
        }
    };
    let permit = discharge_permit_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(permit, "排污许可更新成功")
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
) -> ApiResponse<()> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.delete_permit",
        "ehs.qa_ehs_discharge_permits",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open permit scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        UPDATE ehs.qa_ehs_discharge_permits
        SET deleted_at = now()
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
    "#
    } else {
        r#"
        UPDATE ehs.qa_ehs_discharge_permits
        SET deleted_at = now()
        WHERE id::text = $1 AND deleted_at IS NULL
    "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let result = match query.execute(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete discharge permit: {}", e);
            return ApiResponse::server_error("排污许可删除失败");
        }
    };
    if result.rows_affected() == 0 {
        return ApiResponse::not_found("排污许可不存在");
    }
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success((), "排污许可删除成功")
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
) -> ApiResponse<Vec<ComplianceAssessment>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.list_evaluations",
        "ehs.qa_ehs_compliance_evaluations",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open evaluation scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 租户通道显式绑定 tenant_id；系统通道（超管跨租户）SQL 里显式不含任何 tenant_id 谓词。
    let mut params: Vec<String> = Vec::new();
    let (mut where_clause, filter_base) = match tenant_scope.tenant_id() {
        Some(_) => (
            String::from(" WHERE tenant_id = $1::uuid AND deleted_at IS NULL"),
            2,
        ),
        None => (String::from(" WHERE deleted_at IS NULL"), 1),
    };
    if let Some(t) = &q.assessment_type {
        where_clause.push_str(&format!(" AND eval_type = ${}", params.len() + filter_base));
        params.push(t.clone());
    }
    if let Some(r) = &q.result {
        where_clause.push_str(&format!(
            " AND overall_result = ${}",
            params.len() + filter_base
        ));
        params.push(r.clone());
    }
    if let Some(s) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + filter_base));
        params.push(s.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(
            " AND (title ILIKE ${} OR eval_no ILIKE ${})",
            params.len() + filter_base,
            params.len() + filter_base + 1
        ));
        let like = format!("%{search}%");
        params.push(like.clone());
        params.push(like);
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, eval_no AS assessment_no, title, eval_type AS assessment_type,
               eval_period AS scope, start_date::text AS period_start, end_date::text AS period_end,
               evaluator AS assessor, evaluated_at AS assessment_date, overall_result AS result,
               compliance_rate::float8 AS score, findings, non_complianceitems,
               corrective_actions, status, attachments,
               created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_compliance_evaluations
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list compliance assessments: {}", e);
            return ApiResponse::server_error("获取合规性评价列表失败");
        }
    };
    let list: Vec<ComplianceAssessment> = rows.iter().map(compliance_assessment_from_row).collect();
    ApiResponse::success(list, "获取合规性评价列表成功")
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
) -> ApiResponse<ComplianceAssessment> {
    let tenant = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut scope = match state.db.scope_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant_id = tenant;
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
                  evaluator AS assessor, evaluated_at AS assessment_date, overall_result AS result,
                  compliance_rate::float8 AS score, findings, non_complianceitems,
                  corrective_actions, status, attachments,
                  created_at AS created_at, updated_at AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sqlx::AssertSqlSafe(sql))
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
        .fetch_one(&mut scope)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create compliance assessment: {}", e);
            return ApiResponse::server_error("合规性评价创建失败");
        }
    };
    let assessment = compliance_assessment_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(assessment, "合规性评价创建成功")
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
) -> ApiResponse<ComplianceAssessment> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.get_evaluation",
        "ehs.qa_ehs_compliance_evaluations",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open evaluation scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        SELECT id::text AS id, eval_no AS assessment_no, title, eval_type AS assessment_type,
               eval_period AS scope, start_date::text AS period_start, end_date::text AS period_end,
               evaluator AS assessor, evaluated_at AS assessment_date, overall_result AS result,
               compliance_rate::float8 AS score, findings, non_complianceitems,
               corrective_actions, status, attachments,
               created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_compliance_evaluations
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
    "#
    } else {
        r#"
        SELECT id::text AS id, eval_no AS assessment_no, title, eval_type AS assessment_type,
               eval_period AS scope, start_date::text AS period_start, end_date::text AS period_end,
               evaluator AS assessor, evaluated_at AS assessment_date, overall_result AS result,
               compliance_rate::float8 AS score, findings, non_complianceitems,
               corrective_actions, status, attachments,
               created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_compliance_evaluations
        WHERE id::text = $1 AND deleted_at IS NULL
    "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_optional(&mut scope).await {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("合规性评价不存在"),
        Err(e) => {
            tracing::error!("Failed to get compliance assessment: {}", e);
            return ApiResponse::server_error("获取评价详情失败");
        }
    };
    let assessment = compliance_assessment_from_row(&row);
    ApiResponse::success(assessment, "获取评价详情成功")
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
) -> ApiResponse<ComplianceAssessment> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.update_evaluation",
        "ehs.qa_ehs_compliance_evaluations",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open evaluation scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
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
    let tenant_filter = if tenant_scope.tenant_id().is_some() {
        format!(" AND tenant_id = ${}::uuid", id_idx + 1)
    } else {
        String::new()
    };
    let sql = format!(
        r#"
        UPDATE ehs.qa_ehs_compliance_evaluations
        SET {set_clause}
        WHERE id::text = ${id_idx}{tenant_filter}
          AND deleted_at IS NULL
        RETURNING id::text AS id, eval_no AS assessment_no, title, eval_type AS assessment_type,
                  eval_period AS scope, start_date::text AS period_start, end_date::text AS period_end,
                  evaluator AS assessor, evaluated_at AS assessment_date, overall_result AS result,
                  compliance_rate::float8 AS score, findings, non_complianceitems,
                  corrective_actions, status, attachments,
                  created_at AS created_at, updated_at AS updated_at,
                  tenant_id::text AS tenant_id
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_optional(&mut scope).await {
        Ok(Some(r)) => r,
        Ok(None) => return ApiResponse::not_found("合规性评价不存在"),
        Err(e) => {
            tracing::error!("Failed to update compliance assessment: {}", e);
            return ApiResponse::server_error("评价更新失败");
        }
    };
    let assessment = compliance_assessment_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(assessment, "评价更新成功")
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
) -> ApiResponse<()> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.delete_evaluation",
        "ehs.qa_ehs_compliance_evaluations",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open evaluation scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        UPDATE ehs.qa_ehs_compliance_evaluations
        SET deleted_at = now()
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
    "#
    } else {
        r#"
        UPDATE ehs.qa_ehs_compliance_evaluations
        SET deleted_at = now()
        WHERE id::text = $1 AND deleted_at IS NULL
    "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let result = match query.execute(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to delete compliance assessment: {}", e);
            return ApiResponse::server_error("评价删除失败");
        }
    };
    if result.rows_affected() == 0 {
        return ApiResponse::not_found("合规性评价不存在");
    }
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success((), "评价删除成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environmental-compliance/monitoring",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_monitor_records(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Query(q): axum::extract::Query<ComplianceQuery>,
) -> ApiResponse<Vec<EnvironmentMonitor>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.list_monitor_records",
        "ehs.qa_ehs_env_monitor_records",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open monitor record scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 租户通道显式绑定 tenant_id；系统通道（超管跨租户）SQL 里显式不含任何 tenant_id 谓词。
    let mut params: Vec<String> = Vec::new();
    let (mut where_clause, filter_base) = match tenant_scope.tenant_id() {
        Some(_) => (
            String::from(" WHERE tenant_id = $1::uuid AND deleted_at IS NULL"),
            2,
        ),
        None => (String::from(" WHERE deleted_at IS NULL"), 1),
    };
    if let Some(st) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + filter_base));
        params.push(st.clone());
    }
    if let Some(cat) = &q.category {
        where_clause.push_str(&format!(
            " AND monitor_type = ${}",
            params.len() + filter_base
        ));
        params.push(cat.clone());
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, record_no, monitor_type, monitor_point, monitor_date::text AS monitor_date,
               monitor_agency, monitor_method, pollutant, concentration, unit, standard_value, standard_type,
               result, flow_rate, emission_rate, status, remarks, attachments::text AS attachments,
               created_at AS created_at, updated_at AS updated_at, tenant_id AS tenant_id
        FROM ehs.qa_ehs_env_monitor_records
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list monitor records: {}", e);
            return ApiResponse::server_error("获取环境监测记录列表失败");
        }
    };
    let records: Vec<EnvironmentMonitor> = rows.iter().map(monitor_record_from_row).collect();
    ApiResponse::success(records, "获取环境监测记录列表成功")
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateMonitorRecordRequest>,
) -> ApiResponse<EnvironmentMonitor> {
    let tenant = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut scope = match state.db.scope_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant_id = tenant;
    let now = chrono::Utc::now();
    let record_no = format!(
        "EM-{}-{}",
        now.format("%Y%m%d"),
        &Uuid::new_v4().simple().to_string()[..6]
    );

    let result = sqlx::query(
        r#"
        INSERT INTO ehs.qa_ehs_env_monitor_records (
            record_no, monitor_type, monitor_point, monitor_date, monitor_agency, monitor_method,
            pollutant, concentration, unit, standard_value, standard_type, result, flow_rate,
            emission_rate, status, remarks, tenant_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'completed', $15, $16, NOW(), NOW())
        RETURNING
            id::text AS id, record_no, monitor_type, monitor_point, monitor_date::text AS monitor_date,
            monitor_agency, monitor_method, pollutant, concentration, unit, standard_value, standard_type,
            result, flow_rate, emission_rate, status, remarks, attachments::text AS attachments,
            created_at AS created_at, updated_at AS updated_at, tenant_id AS tenant_id
        "#
    )
    .bind(&record_no)
    .bind(&req.monitor_type)
    .bind(&req.monitor_point)
    .bind(req.monitor_date.as_deref())
    .bind(req.monitor_agency.as_deref())
    .bind(req.monitor_method.as_deref())
    .bind(req.pollutant.as_deref())
    .bind(req.concentration.as_deref())
    .bind(req.unit.as_deref())
    .bind(req.standard_value.as_deref())
    .bind(req.standard_type.as_deref())
    .bind(&req.result)
    .bind(req.flow_rate.as_deref())
    .bind(req.emission_rate.as_deref())
    .bind(req.remarks.as_deref())
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create monitor record: {}", e);
            return ApiResponse::server_error("创建环境监测记录失败");
        }
    };
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(monitor_record_from_row(&row), "监测记录创建成功")
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
) -> ApiResponse<Vec<DischargePermit>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.list_permits",
        "ehs.qa_ehs_discharge_permits",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open permit scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 租户通道显式绑定 tenant_id；系统通道（超管跨租户）SQL 里显式不含任何 tenant_id 谓词。
    let mut params: Vec<String> = Vec::new();
    let (mut where_clause, filter_base) = match tenant_scope.tenant_id() {
        Some(_) => (
            String::from(" WHERE tenant_id = $1::uuid AND deleted_at IS NULL"),
            2,
        ),
        None => (String::from(" WHERE deleted_at IS NULL"), 1),
    };
    if let Some(t) = &q.permit_type {
        where_clause.push_str(&format!(
            " AND permit_type = ${}",
            params.len() + filter_base
        ));
        params.push(t.clone());
    }
    if let Some(c) = &q.permit_category {
        where_clause.push_str(&format!(
            " AND permit_category = ${}",
            params.len() + filter_base
        ));
        params.push(c.clone());
    }
    if let Some(s) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + filter_base));
        params.push(s.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(
            " AND (permit_name ILIKE ${} OR permit_no ILIKE ${})",
            params.len() + filter_base,
            params.len() + filter_base + 1
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
               attachments, created_at AS created_at, updated_at AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_discharge_permits
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list discharge permits: {}", e);
            return ApiResponse::server_error("获取排污许可列表失败");
        }
    };
    let list: Vec<DischargePermit> = rows.iter().map(discharge_permit_from_row).collect();
    ApiResponse::success(list, "获取排污许可列表成功")
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
) -> ApiResponse<DischargePermit> {
    let tenant = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut scope = match state.db.scope_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant_id = tenant;
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
                  attachments, created_at AS created_at, updated_at AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sqlx::AssertSqlSafe(sql))
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
        .fetch_one(&mut scope)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create discharge permit: {}", e);
            return ApiResponse::server_error("排污许可创建失败");
        }
    };
    let permit = discharge_permit_from_row(&row);
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(permit, "排污许可创建成功")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:incident:read"])),
    path = "/api/ehs/environmental-compliance/incidents",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_incidents(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Query(q): axum::extract::Query<ComplianceQuery>,
) -> ApiResponse<Vec<EnvironmentIncident>> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.list_incidents",
        "ehs.qa_ehs_environment_incidents",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open incident scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 租户通道显式绑定 tenant_id；系统通道（超管跨租户）SQL 里显式不含任何 tenant_id 谓词。
    let mut params: Vec<String> = Vec::new();
    let (mut where_clause, filter_base) = match tenant_scope.tenant_id() {
        Some(_) => (
            String::from(" WHERE tenant_id = $1::uuid AND deleted_at IS NULL"),
            2,
        ),
        None => (String::from(" WHERE deleted_at IS NULL"), 1),
    };
    if let Some(st) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + filter_base));
        params.push(st.clone());
    }
    if let Some(cat) = &q.category {
        where_clause.push_str(&format!(
            " AND incident_type = ${}",
            params.len() + filter_base
        ));
        params.push(cat.clone());
    }
    if let Some(y) = &q.year {
        where_clause.push_str(&format!(
            " AND EXTRACT(YEAR FROM occurred_at)::int = ${}",
            params.len() + filter_base
        ));
        params.push(y.to_string());
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, incident_no, title, incident_type, level, location,
               occurred_at AS occurred_at, reported_by, reported_at AS reported_at,
               description, cause, impact, immediate_measures, status, responsible_person,
               investigation_result, corrective_actions, preventive_measures, closed_at AS closed_at,
               attachments::text AS attachments, created_at AS created_at, updated_at AS updated_at,
               tenant_id AS tenant_id
        FROM ehs.qa_ehs_environment_incidents
        {where_clause}
        ORDER BY created_at DESC
        LIMIT {page_size} OFFSET {offset}
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    for p in &params {
        query = query.bind(p);
    }
    let rows = match query.fetch_all(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to list incidents: {}", e);
            return ApiResponse::server_error("获取环境事件列表失败");
        }
    };
    let records: Vec<EnvironmentIncident> = rows.iter().map(incident_from_row).collect();
    ApiResponse::success(records, "获取环境事件列表成功")
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateIncidentRequest>,
) -> ApiResponse<EnvironmentIncident> {
    let tenant = match crate::shared::permission::require_tenant(&claims) {
        Ok(t) => t,
        Err(resp) => return resp,
    };
    let mut scope = match state.db.scope_for_tenant(tenant).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open tenant scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant_id = tenant;
    let now = chrono::Utc::now();
    let incident_no = format!(
        "EI-{}-{}",
        now.format("%Y%m%d"),
        &Uuid::new_v4().simple().to_string()[..6]
    );
    let reported_at = now;

    let result = sqlx::query(
        r#"
        INSERT INTO ehs.qa_ehs_environment_incidents (
            incident_no, title, incident_type, level, location, occurred_at, reported_by,
            reported_at, description, immediate_measures, status, responsible_person,
            tenant_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8::timestamptz, $9, $10, 'reported', $11, $12, NOW(), NOW())
        RETURNING
            id::text AS id, incident_no, title, incident_type, level, location,
            occurred_at AS occurred_at, reported_by, reported_at AS reported_at,
            description, cause, impact, immediate_measures, status, responsible_person,
            investigation_result, corrective_actions, preventive_measures, closed_at AS closed_at,
            attachments::text AS attachments, created_at AS created_at, updated_at AS updated_at,
            tenant_id AS tenant_id
        "#
    )
    .bind(&incident_no)
    .bind(&req.title)
    .bind(&req.incident_type)
    .bind(req.level.as_deref())
    .bind(req.location.as_deref())
    .bind(req.occurred_at.as_deref())
    .bind(req.reported_by.as_deref())
    .bind(reported_at)
    .bind(req.description.as_deref())
    .bind(req.immediate_measures.as_deref())
    .bind(req.responsible_person.as_deref())
    .bind(tenant_id)
    .fetch_one(&mut scope)
    .await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create incident: {}", e);
            return ApiResponse::server_error("创建环境事件失败");
        }
    };
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(incident_from_row(&row), "环境事件创建成功")
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<EnvironmentIncident> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.get_incident",
        "ehs.qa_ehs_environment_incidents",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open incident scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        SELECT id::text AS id, incident_no, title, incident_type, level, location,
               occurred_at AS occurred_at, reported_by, reported_at AS reported_at,
               description, cause, impact, immediate_measures, status, responsible_person,
               investigation_result, corrective_actions, preventive_measures, closed_at AS closed_at,
               attachments::text AS attachments, created_at AS created_at, updated_at AS updated_at,
               tenant_id AS tenant_id
        FROM ehs.qa_ehs_environment_incidents
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
        "#
    } else {
        r#"
        SELECT id::text AS id, incident_no, title, incident_type, level, location,
               occurred_at AS occurred_at, reported_by, reported_at AS reported_at,
               description, cause, impact, immediate_measures, status, responsible_person,
               investigation_result, corrective_actions, preventive_measures, closed_at AS closed_at,
               attachments::text AS attachments, created_at AS created_at, updated_at AS updated_at,
               tenant_id AS tenant_id
        FROM ehs.qa_ehs_environment_incidents
        WHERE id::text = $1 AND deleted_at IS NULL
        "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let result = query.fetch_one(&mut scope).await;

    let row = match result {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to get incident: {}", e);
            return ApiResponse::not_found("环境事件不存在");
        }
    };
    ApiResponse::success(incident_from_row(&row), "获取环境事件成功")
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateIncidentRequest>,
) -> ApiResponse<EnvironmentIncident> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.update_incident",
        "ehs.qa_ehs_environment_incidents",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open incident scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    let mut add = |field: &str, val: Option<String>| {
        if let Some(v) = val {
            sets.push(format!("{field} = ${}", params.len() + 1));
            params.push(v);
        }
    };
    add("level", req.level);
    add("status", req.status);
    add("cause", req.cause);
    add("impact", req.impact);
    add("investigation_result", req.investigation_result);
    add("corrective_actions", req.corrective_actions);
    add("preventive_measures", req.preventive_measures);

    if sets.is_empty() {
        return ApiResponse::bad_request("无更新字段");
    }
    sets.push(format!("updated_at = ${}::timestamptz", params.len() + 1));
    params.push(chrono::Utc::now().to_rfc3339());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_filter = if tenant_scope.tenant_id().is_some() {
        format!(" AND tenant_id = ${}::uuid", id_idx + 1)
    } else {
        String::new()
    };
    let sql = format!(
        r#"
        UPDATE ehs.qa_ehs_environment_incidents
        SET {set_clause}
        WHERE id::text = ${id_idx}{tenant_filter}
          AND deleted_at IS NULL
        RETURNING
            id::text AS id, incident_no, title, incident_type, level, location,
            occurred_at AS occurred_at, reported_by, reported_at AS reported_at,
            description, cause, impact, immediate_measures, status, responsible_person,
            investigation_result, corrective_actions, preventive_measures, closed_at AS closed_at,
            attachments::text AS attachments, created_at AS created_at, updated_at AS updated_at,
            tenant_id AS tenant_id
        "#
    );
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql));
    for p in &params {
        query = query.bind(p);
    }
    query = query.bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let row = match query.fetch_one(&mut scope).await {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to update incident: {}", e);
            return ApiResponse::not_found("环境事件不存在或更新失败");
        }
    };
    if let Err(e) = scope.commit().await {
        tracing::error!("Failed to commit tenant write: {}", e);
        return ApiResponse::server_error("提交事务失败");
    }
    ApiResponse::success(incident_from_row(&row), "更新环境事件成功")
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<()> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.delete_incident",
        "ehs.qa_ehs_environment_incidents",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_write_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open incident scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let sql = if tenant_scope.tenant_id().is_some() {
        r#"
        UPDATE ehs.qa_ehs_environment_incidents
        SET deleted_at = NOW()
        WHERE id::text = $1 AND tenant_id = $2::uuid AND deleted_at IS NULL
        "#
    } else {
        r#"
        UPDATE ehs.qa_ehs_environment_incidents
        SET deleted_at = NOW()
        WHERE id::text = $1 AND deleted_at IS NULL
        "#
    };
    let mut query = sqlx::query(sqlx::AssertSqlSafe(sql)).bind(&id);
    if let Some(tenant) = tenant_scope.tenant_id() {
        query = query.bind(tenant);
    }
    let result = query.execute(&mut scope).await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            if let Err(e) = scope.commit().await {
                tracing::error!("Failed to commit tenant write: {}", e);
                return ApiResponse::server_error("提交事务失败");
            }
            ApiResponse::success((), "环境事件删除成功")
        }
        Ok(_) => ApiResponse::not_found("环境事件不存在"),
        Err(e) => {
            tracing::error!("Failed to delete incident: {}", e);
            ApiResponse::server_error("删除环境事件失败")
        }
    }
}
#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environmental-compliance/statistics",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn get_compliance_statistics(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> ApiResponse<ComplianceStatistics> {
    let tenant_scope = match dual_scope(
        &claims,
        "ehs.env_compliance.get_statistics",
        "ehs.qa_ehs_environmental_regulations",
    ) {
        Ok(s) => s,
        Err(resp) => return resp,
    };
    let mut scope = match open_read_scope(&state.db, &tenant_scope).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to open compliance statistics scope: {}", e);
            return ApiResponse::server_error("数据库事务不可用");
        }
    };
    let tenant = tenant_scope.tenant_id();
    let tenant_id = tenant.unwrap_or_default();
    // 租户通道显式绑定 tenant_id；系统通道显式不带租户谓词。
    let tc = if tenant.is_some() {
        "tenant_id = $1::uuid AND deleted_at IS NULL"
    } else {
        "deleted_at IS NULL"
    };

    let total_regulations = compliance_scalar_i64(
        &mut scope,
        format!(
            "SELECT COUNT(*) FROM ehs.qa_ehs_environmental_regulations WHERE {}",
            tc
        ),
        tenant,
    )
    .await;
    let active_regulations = compliance_scalar_i64(
        &mut scope,
        format!(
            "SELECT COUNT(*) FROM ehs.qa_ehs_environmental_regulations WHERE {} AND status = 'active'",
            tc
        ),
        tenant,
    )
    .await;
    let total_evaluations = compliance_scalar_i64(
        &mut scope,
        format!(
            "SELECT COUNT(*) FROM ehs.qa_ehs_compliance_evaluations WHERE {}",
            tc
        ),
        tenant,
    )
    .await;
    let average_compliance_rate = compliance_scalar_opt_f64(
        &mut scope,
        format!(
            "SELECT AVG(compliance_rate)::float8 FROM ehs.qa_ehs_compliance_evaluations WHERE {} AND compliance_rate IS NOT NULL",
            tc
        ),
        tenant,
    )
    .await;
    let total_monitor_records = compliance_scalar_i64(
        &mut scope,
        format!(
            "SELECT COUNT(*) FROM ehs.qa_ehs_env_monitor_records WHERE {}",
            tc
        ),
        tenant,
    )
    .await;
    let qualified_monitor_records = compliance_scalar_i64(
        &mut scope,
        format!(
            "SELECT COUNT(*) FROM ehs.qa_ehs_env_monitor_records WHERE {} AND result IN ('合格','达标')",
            tc
        ),
        tenant,
    )
    .await;
    let total_permits = compliance_scalar_i64(
        &mut scope,
        format!(
            "SELECT COUNT(*) FROM ehs.qa_ehs_discharge_permits WHERE {}",
            tc
        ),
        tenant,
    )
    .await;
    let expiring_permits = compliance_scalar_i64(
        &mut scope,
        format!(
            "SELECT COUNT(*) FROM ehs.qa_ehs_discharge_permits WHERE {} AND valid_to BETWEEN NOW() AND NOW() + INTERVAL '30 days'",
            tc
        ),
        tenant,
    )
    .await;
    let total_incidents = compliance_scalar_i64(
        &mut scope,
        format!(
            "SELECT COUNT(*) FROM ehs.qa_ehs_environment_incidents WHERE {}",
            tc
        ),
        tenant,
    )
    .await;
    let open_incidents = compliance_scalar_i64(
        &mut scope,
        format!(
            "SELECT COUNT(*) FROM ehs.qa_ehs_environment_incidents WHERE {} AND status NOT IN ('closed','resolved')",
            tc
        ),
        tenant,
    )
    .await;

    let mut by_monitor_type: Vec<serde_json::Value> = Vec::new();
    let mut monitor_group = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT COALESCE(monitor_type, '未分类') AS mt, COUNT(*)::int8 AS cnt, COUNT(*) FILTER (WHERE result IN ('合格','达标'))::int8 AS qc FROM ehs.qa_ehs_env_monitor_records WHERE {} GROUP BY 1 ORDER BY cnt DESC", tc
    )));
    if let Some(t) = tenant {
        monitor_group = monitor_group.bind(t);
    }
    if let Ok(rows) = monitor_group.fetch_all(&mut scope).await {
        for r in rows {
            by_monitor_type.push(serde_json::json!({
                "type": r.try_get::<String, _>("mt").unwrap_or_default(),
                "count": r.try_get::<i64, _>("cnt").unwrap_or(0),
                "qualified": r.try_get::<i64, _>("qc").unwrap_or(0),
            }));
        }
    }
    let mut by_incident_type: Vec<serde_json::Value> = Vec::new();
    let mut incident_group = sqlx::query(sqlx::AssertSqlSafe(format!(
        "SELECT COALESCE(incident_type, '未分类') AS it, COUNT(*)::int8 AS cnt FROM ehs.qa_ehs_environment_incidents WHERE {} GROUP BY 1 ORDER BY cnt DESC", tc
    )));
    if let Some(t) = tenant {
        incident_group = incident_group.bind(t);
    }
    if let Ok(rows) = incident_group.fetch_all(&mut scope).await {
        for r in rows {
            by_incident_type.push(serde_json::json!({
                "type": r.try_get::<String, _>("it").unwrap_or_default(),
                "count": r.try_get::<i64, _>("cnt").unwrap_or(0),
            }));
        }
    }

    ApiResponse::success(
        ComplianceStatistics {
            total_regulations: i32::try_from(total_regulations).unwrap_or(i32::MAX),
            active_regulations: i32::try_from(active_regulations).unwrap_or(i32::MAX),
            total_evaluations: i32::try_from(total_evaluations).unwrap_or(i32::MAX),
            average_compliance_rate,
            total_monitor_records: i32::try_from(total_monitor_records).unwrap_or(i32::MAX),
            qualified_monitor_records: i32::try_from(qualified_monitor_records).unwrap_or(i32::MAX),
            total_permits: i32::try_from(total_permits).unwrap_or(i32::MAX),
            expiring_permits: i32::try_from(expiring_permits).unwrap_or(i32::MAX),
            total_incidents: i32::try_from(total_incidents).unwrap_or(i32::MAX),
            open_incidents: i32::try_from(open_incidents).unwrap_or(i32::MAX),
            by_monitor_type,
            by_incident_type,

            tenant_id,
        },
        "获取环保合规统计成功",
    )
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
) -> ApiResponse<Vec<serde_json::Value>> {
    tracing::warn!("Environmental regulation categories data source not yet enabled");
    ApiResponse::not_implemented("法规分类数据源尚未启用")
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
) -> ApiResponse<Vec<serde_json::Value>> {
    tracing::warn!("Environmental monitor types data source not yet enabled");
    ApiResponse::not_implemented("监测类型数据源尚未启用")
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
        created_at: r.try_get::<DateTime<Utc>, _>("created_at").ok(),
        updated_at: r.try_get::<DateTime<Utc>, _>("updated_at").ok(),
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
        created_at: r.try_get::<DateTime<Utc>, _>("created_at").ok(),
        updated_at: r.try_get::<DateTime<Utc>, _>("updated_at").ok(),
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
        created_at: r.try_get::<DateTime<Utc>, _>("created_at").ok(),
        updated_at: r.try_get::<DateTime<Utc>, _>("updated_at").ok(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}

fn monitor_record_from_row(r: &sqlx::postgres::PgRow) -> EnvironmentMonitor {
    EnvironmentMonitor {
        id: r.try_get("id").unwrap_or_default(),
        record_no: r.try_get("record_no").unwrap_or_default(),
        monitor_type: r.try_get("monitor_type").unwrap_or_default(),
        monitor_point: r.try_get("monitor_point").unwrap_or_default(),
        monitor_date: r.try_get("monitor_date").ok().flatten(),
        monitor_agency: r.try_get("monitor_agency").ok().flatten(),
        monitor_method: r.try_get("monitor_method").ok().flatten(),
        pollutant: r.try_get("pollutant").ok().flatten(),
        concentration: r.try_get("concentration").ok().flatten(),
        unit: r.try_get("unit").ok().flatten(),
        standard_value: r.try_get("standard_value").ok().flatten(),
        standard_type: r.try_get("standard_type").ok().flatten(),
        result: r.try_get("result").unwrap_or_default(),
        flow_rate: r.try_get("flow_rate").ok().flatten(),
        emission_rate: r.try_get("emission_rate").ok().flatten(),
        status: r.try_get("status").unwrap_or_default(),
        remarks: r.try_get("remarks").ok().flatten(),
        attachments: r
            .try_get::<Option<String>, _>("attachments")
            .ok()
            .flatten()
            .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok()),
        created_at: r.try_get("created_at").ok().flatten(),
        updated_at: r.try_get("updated_at").ok().flatten(),
        tenant_id: r
            .try_get::<Option<Uuid>, _>("tenant_id")
            .ok()
            .flatten()
            .unwrap_or_default(),
    }
}

fn incident_from_row(r: &sqlx::postgres::PgRow) -> EnvironmentIncident {
    EnvironmentIncident {
        id: r.try_get("id").unwrap_or_default(),
        incident_no: r.try_get("incident_no").unwrap_or_default(),
        title: r.try_get("title").unwrap_or_default(),
        incident_type: r.try_get("incident_type").unwrap_or_default(),
        level: r.try_get("level").ok().flatten(),
        location: r.try_get("location").ok().flatten(),
        occurred_at: r.try_get("occurred_at").ok().flatten(),
        reported_by: r.try_get("reported_by").ok().flatten(),
        reported_at: r.try_get("reported_at").ok().flatten(),
        description: r.try_get("description").ok().flatten(),
        cause: r.try_get("cause").ok().flatten(),
        impact: r.try_get("impact").ok().flatten(),
        immediate_measures: r.try_get("immediate_measures").ok().flatten(),
        status: r.try_get("status").unwrap_or_default(),
        responsible_person: r.try_get("responsible_person").ok().flatten(),
        investigation_result: r.try_get("investigation_result").ok().flatten(),
        corrective_actions: r.try_get("corrective_actions").ok().flatten(),
        preventive_measures: r.try_get("preventive_measures").ok().flatten(),
        closed_at: r.try_get("closed_at").ok().flatten(),
        attachments: r
            .try_get::<Option<String>, _>("attachments")
            .ok()
            .flatten()
            .and_then(|s| serde_json::from_str::<Vec<String>>(&s).ok()),
        created_at: r.try_get("created_at").ok().flatten(),
        updated_at: r.try_get("updated_at").ok().flatten(),
        tenant_id: r
            .try_get::<Option<Uuid>, _>("tenant_id")
            .ok()
            .flatten()
            .unwrap_or_default(),
    }
}
