//! Environmental compliance management - Regulations, compliance evaluation, monitoring, permits, and incidents

use axum::{extract::State, http::HeaderMap, routing::*, Extension, Json, Router};
use serde::{Deserialize, Serialize};
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
            "/environmental-compliance/evaluations/{id}",
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
            get(get_monitor_record).delete(delete_monitor_record),
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
            "/environmental-compliance/assessments",
            get(list_evaluations).post(create_evaluation),
        )
        .route(
            "/environmental-compliance/events",
            get(list_incidents).post(create_incident),
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
    pub reg_no: String,
    pub title: String,
    pub category: String,
    pub regulation_type: Option<String>,
    pub issuing_authority: Option<String>,
    pub issued_date: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub status: String,
    pub content: Option<String>,
    pub applicability: Option<String>,
    pub related_files: Option<Vec<String>>,
    pub version: Option<String>,
    pub remarks: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct ComplianceEvaluation {
    pub id: String,
    pub eval_no: String,
    pub title: String,
    pub eval_type: String,
    pub eval_period: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub evaluator: Option<String>,
    pub status: String,
    pub overall_result: Option<String>,
    pub compliance_rate: Option<f64>,
    pub findings: Option<String>,
    pub improvements: Option<String>,
    pub evaluated_at: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,

    pub tenant_id: Uuid,
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
    pub permit_type: String,
    pub permit_name: Option<String>,
    pub issuing_authority: Option<String>,
    pub issued_date: Option<String>,
    pub valid_from: Option<String>,
    pub valid_to: Option<String>,
    pub status: String,
    pub pollutant_list: Option<Vec<String>>,
    pub discharge_standard: Option<String>,
    pub total_amount_limit: Option<String>,
    pub discharge_location: Option<String>,
    pub holder: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub remarks: Option<String>,
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
    pub issued_date: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub content: Option<String>,
    pub applicability: Option<String>,
    pub version: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRegulationRequest {
    pub title: Option<String>,
    pub category: Option<String>,
    pub regulation_type: Option<String>,
    pub issuing_authority: Option<String>,
    pub issued_date: Option<String>,
    pub effective_date: Option<String>,
    pub expiry_date: Option<String>,
    pub status: Option<String>,
    pub content: Option<String>,
    pub applicability: Option<String>,
    pub version: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEvaluationRequest {
    pub title: String,
    pub eval_type: String,
    pub eval_period: Option<String>,
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub evaluator: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEvaluationRequest {
    pub overall_result: Option<String>,
    pub compliance_rate: Option<f64>,
    pub findings: Option<String>,
    pub improvements: Option<String>,
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
    pub permit_type: String,
    pub permit_name: Option<String>,
    pub issuing_authority: Option<String>,
    pub issued_date: Option<String>,
    pub valid_from: Option<String>,
    pub valid_to: Option<String>,
    pub pollutant_list: Option<Vec<String>>,
    pub discharge_standard: Option<String>,
    pub total_amount_limit: Option<String>,
    pub discharge_location: Option<String>,
    pub holder: Option<String>,
    pub remarks: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePermitRequest {
    pub permit_name: Option<String>,
    pub status: Option<String>,
    pub valid_from: Option<String>,
    pub valid_to: Option<String>,
    pub pollutant_list: Option<Vec<String>>,
    pub remarks: Option<String>,
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environmental-compliance/regulations",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_regulations(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<EnvironmentalRegulation>>> {
    tracing::debug!("Listing environmental regulations");
    Json(ApiResponse::success(
        Vec::<EnvironmentalRegulation>::new(),
        "获取环保法规列表成功",
    ))
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
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateRegulationRequest>,
) -> Json<ApiResponse<EnvironmentalRegulation>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Creating environmental regulation: {:?}", req);
    Json(ApiResponse::success(
        EnvironmentalRegulation {
            id: uuid::Uuid::new_v4().to_string(),
            reg_no: format!(
                "ER-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            title: req.title,
            category: req.category,
            regulation_type: req.regulation_type,
            issuing_authority: req.issuing_authority,
            issued_date: req.issued_date,
            effective_date: req.effective_date,
            expiry_date: req.expiry_date,
            status: "active".to_string(),
            content: req.content,
            applicability: req.applicability,
            related_files: None,
            version: req.version,
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "环保法规创建成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environmental-compliance/regulations/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_regulation(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<EnvironmentalRegulation>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Getting environmental regulation: {}", id);
    Json(ApiResponse::success(
        EnvironmentalRegulation {
            id,
            reg_no: "ER-2024001".to_string(),
            title: "中华人民共和国环境保护法".to_string(),
            category: "law".to_string(),
            regulation_type: Some("法律".to_string()),
            issuing_authority: Some("全国人民代表大会".to_string()),
            issued_date: Some("2014-04-24".to_string()),
            effective_date: Some("2015-01-01".to_string()),
            expiry_date: None,
            status: "active".to_string(),
            content: Some("为保护和改善环境，防治污染和其他公害...".to_string()),
            applicability: Some(
                "适用于中华人民共和国领域和中华人民共和国管辖的其他海域".to_string(),
            ),
            related_files: None,
            version: Some("2014修订版".to_string()),
            remarks: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "获取法规详情成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/environmental-compliance/regulations/{id}",
    request_body = UpdateRegulationRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_regulation(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateRegulationRequest>,
) -> Json<ApiResponse<EnvironmentalRegulation>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Updating environmental regulation {}: {:?}", id, req);
    Json(ApiResponse::success(
        EnvironmentalRegulation {
            id,
            reg_no: "ER-2024001".to_string(),
            title: req
                .title
                .unwrap_or_else(|| "中华人民共和国环境保护法".to_string()),
            category: req.category.unwrap_or_else(|| "law".to_string()),
            regulation_type: req.regulation_type,
            issuing_authority: req.issuing_authority,
            issued_date: req.issued_date,
            effective_date: req.effective_date,
            expiry_date: req.expiry_date,
            status: req.status.unwrap_or_else(|| "active".to_string()),
            content: req.content,
            applicability: req.applicability,
            related_files: None,
            version: req.version,
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "法规更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/environmental-compliance/regulations/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_regulation(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting environmental regulation: {}", id);
    Json(ApiResponse::success((), "法规删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environmental-compliance/evaluations",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_evaluations(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<ComplianceEvaluation>>> {
    tracing::debug!("Listing compliance evaluations");
    Json(ApiResponse::success(
        Vec::<ComplianceEvaluation>::new(),
        "获取合规性评价列表成功",
    ))
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
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreateEvaluationRequest>,
) -> Json<ApiResponse<ComplianceEvaluation>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Creating compliance evaluation: {:?}", req);
    Json(ApiResponse::success(
        ComplianceEvaluation {
            id: uuid::Uuid::new_v4().to_string(),
            eval_no: format!(
                "CE-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            title: req.title,
            eval_type: req.eval_type,
            eval_period: req.eval_period,
            start_date: req.start_date,
            end_date: req.end_date,
            evaluator: req.evaluator,
            status: "in_progress".to_string(),
            overall_result: None,
            compliance_rate: None,
            findings: None,
            improvements: None,
            evaluated_at: None,
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "合规性评价创建成功",
    ))
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
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<ComplianceEvaluation>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Getting compliance evaluation: {}", id);
    Json(ApiResponse::success(
        ComplianceEvaluation {
            id,
            eval_no: "CE-2024001".to_string(),
            title: "2024年度环保合规性评价".to_string(),
            eval_type: "annual".to_string(),
            eval_period: Some("2024年度".to_string()),
            start_date: Some("2024-01-01".to_string()),
            end_date: Some("2024-12-31".to_string()),
            evaluator: Some("环保部".to_string()),
            status: "completed".to_string(),
            overall_result: Some("compliant".to_string()),
            compliance_rate: Some(95.5),
            findings: Some("总体合规，部分记录需要完善".to_string()),
            improvements: Some("加强废水监测频次".to_string()),
            evaluated_at: Some(chrono::Utc::now().to_rfc3339()),
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "获取评价详情成功",
    ))
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
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdateEvaluationRequest>,
) -> Json<ApiResponse<ComplianceEvaluation>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Updating compliance evaluation {}: {:?}", id, req);
    let status = req
        .status
        .clone()
        .unwrap_or_else(|| "completed".to_string());
    let evaluated_at = if status == "completed" {
        Some(chrono::Utc::now().to_rfc3339())
    } else {
        None
    };

    Json(ApiResponse::success(
        ComplianceEvaluation {
            id,
            eval_no: "CE-2024001".to_string(),
            title: "2024年度环保合规性评价".to_string(),
            eval_type: "annual".to_string(),
            eval_period: Some("2024年度".to_string()),
            start_date: Some("2024-01-01".to_string()),
            end_date: Some("2024-12-31".to_string()),
            evaluator: Some("环保部".to_string()),
            status,
            overall_result: req.overall_result,
            compliance_rate: req.compliance_rate,
            findings: req.findings,
            improvements: req.improvements,
            evaluated_at,
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "评价更新成功",
    ))
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
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting compliance evaluation: {}", id);
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
    Extension(claims): Extension<Claims>,
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
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/environmental-compliance/monitoring/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_monitor_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<EnvironmentMonitor>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Getting environment monitor record: {}", id);
    Json(ApiResponse::success(
        EnvironmentMonitor {
            id,
            record_no: "EM-2024001".to_string(),
            monitor_type: "wastewater".to_string(),
            monitor_point: "废水总排口".to_string(),
            monitor_date: Some("2024-06-01".to_string()),
            monitor_agency: Some("市环境监测站".to_string()),
            monitor_method: Some("重铬酸钾法".to_string()),
            pollutant: Some("COD".to_string()),
            concentration: Some("45".to_string()),
            unit: Some("mg/L".to_string()),
            standard_value: Some("50".to_string()),
            standard_type: Some("一级标准".to_string()),
            result: "qualified".to_string(),
            flow_rate: Some("100".to_string()),
            emission_rate: Some("4.5".to_string()),
            status: "completed".to_string(),
            remarks: None,
            attachments: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "获取监测记录详情成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/environmental-compliance/monitoring/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_monitor_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting environment monitor record: {}", id);
    Json(ApiResponse::success((), "监测记录删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:permit:read"])),
    path = "/api/ehs/environmental-compliance/permits",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_permits(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<DischargePermit>>> {
    tracing::debug!("Listing discharge permits");
    Json(ApiResponse::success(
        Vec::<DischargePermit>::new(),
        "获取排污许可列表成功",
    ))
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
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<CreatePermitRequest>,
) -> Json<ApiResponse<DischargePermit>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Creating discharge permit: {:?}", req);
    Json(ApiResponse::success(
        DischargePermit {
            id: uuid::Uuid::new_v4().to_string(),
            permit_no: format!(
                "DP-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            permit_type: req.permit_type,
            permit_name: req.permit_name,
            issuing_authority: req.issuing_authority,
            issued_date: req.issued_date,
            valid_from: req.valid_from,
            valid_to: req.valid_to,
            status: "valid".to_string(),
            pollutant_list: req.pollutant_list,
            discharge_standard: req.discharge_standard,
            total_amount_limit: req.total_amount_limit,
            discharge_location: req.discharge_location,
            holder: req.holder,
            attachments: None,
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "排污许可创建成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:permit:read"])),
    path = "/api/ehs/environmental-compliance/permits/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_permit(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<DischargePermit>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Getting discharge permit: {}", id);
    Json(ApiResponse::success(
        DischargePermit {
            id,
            permit_no: "DP-2024001".to_string(),
            permit_type: "wastewater".to_string(),
            permit_name: Some("排污许可证".to_string()),
            issuing_authority: Some("市生态环境局".to_string()),
            issued_date: Some("2024-01-01".to_string()),
            valid_from: Some("2024-01-01".to_string()),
            valid_to: Some("2028-12-31".to_string()),
            status: "valid".to_string(),
            pollutant_list: Some(vec![
                "COD".to_string(),
                "氨氮".to_string(),
                "SS".to_string(),
            ]),
            discharge_standard: Some("《污水综合排放标准》一级".to_string()),
            total_amount_limit: Some("COD: 50吨/年".to_string()),
            discharge_location: Some("厂区废水总排口".to_string()),
            holder: Some("本公司".to_string()),
            attachments: None,
            remarks: None,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "获取排污许可详情成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:permit:admin"])),
    path = "/api/ehs/environmental-compliance/permits/{id}",
    request_body = UpdatePermitRequest,
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn update_permit(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<UpdatePermitRequest>,
) -> Json<ApiResponse<DischargePermit>> {
    let tenant_opt: Option<uuid::Uuid> = if claims.is_superuser {
        None
    } else {
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
    tracing::debug!("Updating discharge permit {}: {:?}", id, req);
    Json(ApiResponse::success(
        DischargePermit {
            id,
            permit_no: "DP-2024001".to_string(),
            permit_type: "wastewater".to_string(),
            permit_name: req.permit_name,
            issuing_authority: Some("市生态环境局".to_string()),
            issued_date: Some("2024-01-01".to_string()),
            valid_from: req.valid_from,
            valid_to: req.valid_to,
            status: req.status.unwrap_or_else(|| "valid".to_string()),
            pollutant_list: req.pollutant_list,
            discharge_standard: Some("《污水综合排放标准》一级".to_string()),
            total_amount_limit: Some("COD: 50吨/年".to_string()),
            discharge_location: Some("厂区废水总排口".to_string()),
            holder: Some("本公司".to_string()),
            attachments: None,
            remarks: req.remarks,
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            updated_at: Some(chrono::Utc::now().to_rfc3339()),

            tenant_id,
        },
        "排污许可更新成功",
    ))
}

// gate: admin-only
#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:permit:admin"])),
    path = "/api/ehs/environmental-compliance/permits/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_permit(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting discharge permit: {}", id);
    Json(ApiResponse::success((), "排污许可删除成功"))
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
    Extension(claims): Extension<Claims>,
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
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
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
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
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
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
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
    Extension(claims): Extension<Claims>,
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
        claims.tenant_id.as_deref().and_then(|t| uuid::Uuid::parse_str(t).ok())
    };
    let tenant_id = tenant_opt.unwrap_or_else(|| {
        uuid::Uuid::parse_str("00000000-0000-0000-0000-000000000000").unwrap()
    });
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
    Extension(claims): Extension<Claims>,
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
    Extension(claims): Extension<Claims>,
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
