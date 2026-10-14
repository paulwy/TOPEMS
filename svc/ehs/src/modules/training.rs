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
            "/training/{id}",
            get(get_training)
                .put(update_training)
                .delete(delete_training),
        )
        .route(
            "/training/plans",
            get(list_training_plans).post(create_training_plan),
        )
        .route(
            "/training/plans/{id}",
            get(get_training_plan)
                .put(update_training_plan)
                .delete(delete_training_plan),
        )
        .route(
            "/training/records",
            get(list_training_records).post(create_training_record),
        )
        .route(
            "/training/records/{id}",
            get(get_training_record)
                .put(update_training_record)
                .delete(delete_training_record),
        )
        .route(
            "/training/certificates",
            get(list_certificates).post(create_certificate),
        )
        .route(
            "/training/certificates/{id}",
            get(get_certificate)
                .put(update_certificate)
                .delete(delete_certificate),
        )
        .route("/training/statistics", get(get_training_statistics))
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
    path = "/api/ehs/training/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_training(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
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
    tracing::debug!("Getting training: {}", id);
    Json(ApiResponse::success(
        Training {
            id,
            training_no: "TRN-2024001".to_string(),
            title: "安全培训".to_string(),
            content: Some("培训内容（内存桩数据）".to_string()),
            trainer: Some("安全讲师".to_string()),
            training_type: Some("safety".to_string()),
            duration_hours: Some(4),
            scheduled_at: Some(chrono::Utc::now().to_rfc3339()),
            status: "scheduled".to_string(),
            tenant_id,
        },
        "获取培训成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训 ID")),
    request_body = serde_json::Value,
    responses((status = 200, description = "OK")),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation)]
pub async fn update_training(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
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
    tracing::debug!("Updating training {}: {:?}", id, req);
    Json(ApiResponse::success(
        Training {
            id,
            training_no: "TRN-2024001".to_string(),
            title: req
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("安全培训")
                .to_string(),
            content: req
                .get("content")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            trainer: req
                .get("trainer")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            training_type: req
                .get("training_type")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            duration_hours: req
                .get("duration_hours")
                .and_then(|v| v.as_i64())
                .map(|v| v as i32),
            scheduled_at: req
                .get("scheduled_at")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            status: req
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("scheduled")
                .to_string(),
            tenant_id,
        },
        "培训更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_training(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting training: {}", id);
    Json(ApiResponse::success((), "培训删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/plans/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训计划 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_training_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
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
    tracing::debug!("Getting training plan: {}", id);
    Json(ApiResponse::success(
        TrainingPlan {
            id,
            plan_no: "TP-2024001".to_string(),
            title: "年度安全培训计划".to_string(),
            description: Some("培训计划详情（内存桩数据）".to_string()),
            training_type: Some("safety".to_string()),
            planned_date: Some(chrono::Utc::now().to_rfc3339()),
            trainer: Some("安全讲师".to_string()),
            status: "planned".to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            tenant_id,
        },
        "获取培训计划成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/plans/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训计划 ID")),
    request_body = serde_json::Value,
    responses((status = 200, description = "OK")),
)]
pub async fn update_training_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
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
    tracing::debug!("Updating training plan {}: {:?}", id, req);
    Json(ApiResponse::success(
        TrainingPlan {
            id,
            plan_no: "TP-2024001".to_string(),
            title: req
                .get("title")
                .and_then(|v| v.as_str())
                .unwrap_or("年度安全培训计划")
                .to_string(),
            description: req
                .get("description")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            training_type: req
                .get("training_type")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            planned_date: req
                .get("planned_date")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            trainer: req
                .get("trainer")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            status: req
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("planned")
                .to_string(),
            created_at: chrono::Utc::now().to_rfc3339(),
            tenant_id,
        },
        "培训计划更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/plans/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训计划 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_training_plan(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting training plan: {}", id);
    Json(ApiResponse::success((), "培训计划删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/records/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训记录 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_training_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
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
    tracing::debug!("Getting training record: {}", id);
    Json(ApiResponse::success(
        TrainingRecord {
            id,
            record_no: "TRR-2024001".to_string(),
            training_title: "安全培训".to_string(),
            trainer: Some("安全讲师".to_string()),
            training_date: Some(chrono::Utc::now().to_rfc3339()),
            duration_hours: Some(4),
            participants: Some(30),
            pass_count: Some(28),
            status: "completed".to_string(),
            tenant_id,
        },
        "获取培训记录成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/records/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训记录 ID")),
    request_body = serde_json::Value,
    responses((status = 200, description = "OK")),
)]
#[allow(clippy::as_conversions, clippy::cast_possible_truncation, clippy::cast_possible_wrap)]
pub async fn update_training_record(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
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
    tracing::debug!("Updating training record {}: {:?}", id, req);
    Json(ApiResponse::success(
        TrainingRecord {
            id,
            record_no: "TRR-2024001".to_string(),
            training_title: req
                .get("training_title")
                .and_then(|v| v.as_str())
                .unwrap_or("安全培训")
                .to_string(),
            trainer: req
                .get("trainer")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            training_date: req
                .get("training_date")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
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
            status: req
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("completed")
                .to_string(),
            tenant_id,
        },
        "培训记录更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/records/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训记录 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_training_record(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting training record: {}", id);
    Json(ApiResponse::success((), "培训记录删除成功"))
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/certificates/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训证书 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_certificate(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
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
    tracing::debug!("Getting certificate: {}", id);
    Json(ApiResponse::success(
        TrainingCertificate {
            id,
            certificate_no: "CERT-2024001".to_string(),
            employee_name: "测试员工".to_string(),
            training_title: "安全培训".to_string(),
            issue_date: Some(chrono::Utc::now().to_rfc3339()),
            expiry_date: Some("2026-12-31".to_string()),
            certificate_type: Some("safety".to_string()),
            status: "valid".to_string(),
            tenant_id,
        },
        "获取培训证书成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/certificates/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训证书 ID")),
    request_body = serde_json::Value,
    responses((status = 200, description = "OK")),
)]
pub async fn update_certificate(
    State(_state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
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
    tracing::debug!("Updating certificate {}: {:?}", id, req);
    Json(ApiResponse::success(
        TrainingCertificate {
            id,
            certificate_no: "CERT-2024001".to_string(),
            employee_name: req
                .get("employee_name")
                .and_then(|v| v.as_str())
                .unwrap_or("测试员工")
                .to_string(),
            training_title: req
                .get("training_title")
                .and_then(|v| v.as_str())
                .unwrap_or("安全培训")
                .to_string(),
            issue_date: req
                .get("issue_date")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            expiry_date: req
                .get("expiry_date")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            certificate_type: req
                .get("certificate_type")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string()),
            status: req
                .get("status")
                .and_then(|v| v.as_str())
                .unwrap_or("valid")
                .to_string(),
            tenant_id,
        },
        "培训证书更新成功",
    ))
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/certificates/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "培训证书 ID")),
    responses((status = 200, description = "OK")),
)]
pub async fn delete_certificate(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    tracing::debug!("Deleting certificate: {}", id);
    Json(ApiResponse::success((), "培训证书删除成功"))
}

pub async fn get_training_statistics(
    State(_state): State<crate::shared::AppState>,
    Extension(_claims): Extension<Claims>,
    _headers: HeaderMap,
) -> Json<ApiResponse<serde_json::Value>> {
    Json(ApiResponse::success(
        serde_json::json!({
            "total_trainings": 0,
            "total_plans": 0,
            "total_records": 0,
            "total_certificates": 0,
            "completion_rate": 0.0,
        }),
        "获取培训统计成功",
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
