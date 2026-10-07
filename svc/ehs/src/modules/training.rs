//! Training handlers

use axum::{extract::State, http::HeaderMap, routing::*, Extension, Json, Router};
use serde::{Deserialize, Serialize};
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::ApiResponse;

use uuid::Uuid;

use crate::shared::AppState;
pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/training", get(list_trainings).post(create_training))
        .route(
            "/training/plans",
            get(list_training_plans).post(create_training_plan),
        )
        .route(
            "/training/records",
            get(list_training_records).post(create_training_record),
        )
        .route(
            "/training/certificates",
            get(list_certificates).post(create_certificate),
        )
}

#[derive(Debug, Deserialize)]
pub struct TrainingQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub status: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct Training {
    pub id: String,
    pub training_no: String,
    pub title: String,
    pub content: Option<String>,
    pub trainer: Option<String>,
    pub training_type: Option<String>,
    pub duration_hours: Option<i32>,
    pub scheduled_at: Option<String>,
    pub status: String,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct TrainingPlan {
    pub id: String,
    pub plan_no: String,
    pub title: String,
    pub description: Option<String>,
    pub training_type: Option<String>,
    pub planned_date: Option<String>,
    pub trainer: Option<String>,
    pub status: String,
    pub created_at: String,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct TrainingRecord {
    pub id: String,
    pub record_no: String,
    pub training_title: String,
    pub trainer: Option<String>,
    pub training_date: Option<String>,
    pub duration_hours: Option<i32>,
    pub participants: Option<i32>,
    pub pass_count: Option<i32>,
    pub status: String,

    pub tenant_id: Uuid,
}

#[derive(Debug, Serialize)]
pub struct TrainingCertificate {
    pub id: String,
    pub certificate_no: String,
    pub employee_name: String,
    pub training_title: String,
    pub issue_date: Option<String>,
    pub expiry_date: Option<String>,
    pub certificate_type: Option<String>,
    pub status: String,

    pub tenant_id: Uuid,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_trainings(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<Training>>> {
    tracing::debug!("Listing trainings");
    Json(ApiResponse::success(
        Vec::<Training>::new(),
        "获取培训列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training",
    request_body = serde_json::Value,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_training(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<Training>> {
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
    tracing::debug!("Creating training: {:?}", req);
    Json(ApiResponse::success(
        Training {
            id: uuid::Uuid::new_v4().to_string(),
            training_no: format!(
                "TRN-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            title: "安全培训".to_string(),
            content: None,
            trainer: None,
            training_type: None,
            duration_hours: Some(4),
            scheduled_at: None,
            status: "scheduled".to_string(),

            tenant_id,
        },
        "培训创建成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/plans",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_training_plans(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<TrainingPlan>>> {
    tracing::debug!("Listing training plans");
    Json(ApiResponse::success(
        Vec::<TrainingPlan>::new(),
        "获取培训计划列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/plans",
    request_body = serde_json::Value,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_training_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TrainingPlan>> {
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
    tracing::debug!("Creating training plan: {:?}", req);
    Json(ApiResponse::success(
        TrainingPlan {
            id: uuid::Uuid::new_v4().to_string(),
            plan_no: format!(
                "TPL-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            title: req
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("新培训计划")
                .to_string(),
            description: req
                .get("description")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            training_type: req
                .get("training_type")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            planned_date: None,
            trainer: req
                .get("trainer")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            status: "draft".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),

            tenant_id,
        },
        "培训计划创建成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_training_records(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<TrainingRecord>>> {
    tracing::debug!("Listing training records");
    Json(ApiResponse::success(
        Vec::<TrainingRecord>::new(),
        "获取培训记录列表成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/records",
    request_body = serde_json::Value,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn create_training_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TrainingRecord>> {
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
    tracing::debug!("Creating training record: {:?}", req);
    Json(ApiResponse::success(
        TrainingRecord {
            id: uuid::Uuid::new_v4().to_string(),
            record_no: format!(
                "TRC-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            training_title: req
                .get("training_title")
                .and_then(|v| v.as_str())
                .unwrap_or("安全培训")
                .to_string(),
            trainer: req
                .get("trainer")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            training_date: None,
            duration_hours: req
                .get("duration_hours")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32),
            participants: req
                .get("participants")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32),
            pass_count: req
                .get("pass_count")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32),
            status: "completed".to_string(),

            tenant_id,
        },
        "培训记录创建成功",
    ))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:cert:read"])),
    path = "/api/ehs/training/certificates",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_certificates(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<Vec<TrainingCertificate>>> {
    tracing::debug!("Listing training certificates");
    Json(ApiResponse::success(
        Vec::<TrainingCertificate>::new(),
        "获取证书列表成功",
    ))
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:cert:admin"])),
    path = "/api/ehs/training/certificates",
    request_body = serde_json::Value,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn create_certificate(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TrainingCertificate>> {
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
    tracing::debug!("Creating certificate: {:?}", req);
    Json(ApiResponse::success(
        TrainingCertificate {
            id: uuid::Uuid::new_v4().to_string(),
            certificate_no: format!(
                "CERT-{}",
                uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
            ),
            employee_name: req
                .get("employee_name")
                .and_then(|v| v.as_str())
                .unwrap_or("员工")
                .to_string(),
            training_title: req
                .get("training_title")
                .and_then(|v| v.as_str())
                .unwrap_or("安全培训")
                .to_string(),
            issue_date: None,
            expiry_date: None,
            certificate_type: req
                .get("certificate_type")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            status: "active".to_string(),

            tenant_id,
        },
        "证书创建成功",
    ))
}

