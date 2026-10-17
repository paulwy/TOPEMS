//! Training handlers

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
    pub employee_id: String,
    pub employee_name: String,
    pub training_type: String,
    pub certificate_type: String,
    pub issue_date: Option<String>,
    pub expiry_date: Option<String>,
    pub issuing_authority: Option<String>,
    pub status: String,
    pub record_id: Option<String>,
    pub attachments: Option<Vec<String>>,
    pub created_at: String,
    pub updated_at: String,

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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<TrainingPlan>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    tracing::debug!("Getting training plan: {}", id);
    let sql = r#"
        SELECT id::text AS id, program_no AS plan_no, title, content AS description,
               training_type, start_date::text AS planned_date, instructor AS trainer,
               status, created_at::text AS created_at, tenant_id::text AS tenant_id
        FROM ehs.training_programs
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
        Ok(None) => return Json(ApiResponse::error(404, "培训计划不存在")),
        Err(e) => {
            tracing::error!("Failed to get training plan: {}", e);
            return Json(ApiResponse::error(500, "获取培训计划失败"));
        }
    };
    let plan = training_plan_from_row(&row);
    Json(ApiResponse::success(plan, "获取培训计划成功"))
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TrainingPlan>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    if let Some(v) = req.get("title").and_then(|v| v.as_str()) {
        sets.push(format!("title = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("description").and_then(|v| v.as_str()) {
        sets.push(format!("content = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("training_type").and_then(|v| v.as_str()) {
        sets.push(format!("training_type = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("trainer").and_then(|v| v.as_str()) {
        sets.push(format!("instructor = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("planned_date").and_then(|v| v.as_str()) {
        sets.push(format!("start_date = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("status").and_then(|v| v.as_str()) {
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_idx = params.len() + 2;
    let sql = format!(
        r#"
        UPDATE ehs.training_programs
        SET {set_clause}
        WHERE id = ${id_idx}
          AND (${tenant_idx} = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = ${tenant_idx})
          AND deleted_at IS NULL
        RETURNING id::text AS id, program_no AS plan_no, title, content AS description,
                  training_type, start_date::text AS planned_date, instructor AS trainer,
                  status, created_at::text AS created_at, tenant_id::text AS tenant_id
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
        Ok(None) => return Json(ApiResponse::error(404, "培训计划不存在")),
        Err(e) => {
            tracing::error!("Failed to update training plan: {}", e);
            return Json(ApiResponse::error(500, "培训计划更新失败"));
        }
    };
    let plan = training_plan_from_row(&row);
    Json(ApiResponse::success(plan, "培训计划更新成功"))
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let sql = r#"
        UPDATE ehs.training_programs
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
            tracing::error!("Failed to delete training plan: {}", e);
            return Json(ApiResponse::error(500, "培训计划删除失败"));
        }
    };
    if result.rows_affected() == 0 {
        return Json(ApiResponse::error(404, "培训计划不存在"));
    }
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
#[allow(
    clippy::as_conversions,
    clippy::cast_possible_truncation,
    clippy::cast_possible_wrap
)]
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<TrainingCertificate>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    tracing::debug!("Getting certificate: {}", id);
    let sql = r#"
        SELECT id::text AS id, certificate_no, employee_id, employee_name, training_type,
               certificate_type, issue_date::text AS issue_date, expiry_date::text AS expiry_date,
               issuing_authority, status, record_id::text AS record_id, attachments,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_training_certificates
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
        Ok(None) => return Json(ApiResponse::error(404, "培训证书不存在")),
        Err(e) => {
            tracing::error!("Failed to get training certificate: {}", e);
            return Json(ApiResponse::error(500, "获取培训证书失败"));
        }
    };
    let certificate = training_certificate_from_row(&row);
    Json(ApiResponse::success(certificate, "获取培训证书成功"))
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TrainingCertificate>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let mut sets: Vec<String> = Vec::new();
    let mut params: Vec<String> = Vec::new();
    if let Some(v) = req.get("employee_name").and_then(|v| v.as_str()) {
        sets.push(format!("employee_name = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("training_type").and_then(|v| v.as_str()) {
        sets.push(format!("training_type = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("certificate_type").and_then(|v| v.as_str()) {
        sets.push(format!("certificate_type = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("issue_date").and_then(|v| v.as_str()) {
        sets.push(format!("issue_date = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("expiry_date").and_then(|v| v.as_str()) {
        sets.push(format!("expiry_date = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("issuing_authority").and_then(|v| v.as_str()) {
        sets.push(format!("issuing_authority = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("status").and_then(|v| v.as_str()) {
        sets.push(format!("status = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    if let Some(v) = req.get("attachments") {
        sets.push(format!("attachments = ${}", params.len() + 1));
        params.push(v.to_string());
    }
    sets.push("updated_at = now()".to_string());
    let set_clause = sets.join(", ");
    let id_idx = params.len() + 1;
    let tenant_idx = params.len() + 2;
    let sql = format!(
        r#"
        UPDATE ehs.qa_ehs_training_certificates
        SET {set_clause}
        WHERE id = ${id_idx}
          AND (${tenant_idx} = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = ${tenant_idx})
          AND deleted_at IS NULL
        RETURNING id::text AS id, certificate_no, employee_id, employee_name, training_type,
                  certificate_type, issue_date::text AS issue_date, expiry_date::text AS expiry_date,
                  issuing_authority, status, record_id::text AS record_id, attachments,
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
        Ok(None) => return Json(ApiResponse::error(404, "培训证书不存在")),
        Err(e) => {
            tracing::error!("Failed to update training certificate: {}", e);
            return Json(ApiResponse::error(500, "培训证书更新失败"));
        }
    };
    let certificate = training_certificate_from_row(&row);
    Json(ApiResponse::success(certificate, "培训证书更新成功"))
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<()>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let sql = r#"
        UPDATE ehs.qa_ehs_training_certificates
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
            tracing::error!("Failed to delete training certificate: {}", e);
            return Json(ApiResponse::error(500, "培训证书删除失败"));
        }
    };
    if result.rows_affected() == 0 {
        return Json(ApiResponse::error(404, "培训证书不存在"));
    }
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

#[derive(Debug, Deserialize)]
pub struct TrainingPlanQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub training_type: Option<String>,
    pub category: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:training:read"])),
    path = "/api/ehs/training/plans",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_training_plans(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<TrainingPlanQuery>,
) -> Json<ApiResponse<Vec<TrainingPlan>>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(status) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(status.clone());
    }
    if let Some(training_type) = &q.training_type {
        where_clause.push_str(&format!(" AND training_type = ${}", params.len() + 1));
        params.push(training_type.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(" AND title ILIKE ${}", params.len() + 1));
        params.push(format!("%{search}%"));
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, program_no AS plan_no, title, content AS description,
               training_type, start_date::text AS planned_date, instructor AS trainer,
               status, created_at::text AS created_at, tenant_id::text AS tenant_id
        FROM ehs.training_programs
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
            tracing::error!("Failed to list training plans: {}", e);
            return Json(ApiResponse::error(500, "获取培训计划列表失败"));
        }
    };

    let list: Vec<TrainingPlan> = rows.iter().map(training_plan_from_row).collect();
    Json(ApiResponse::success(list, "获取培训计划列表成功"))
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TrainingPlan>> {
    let tenant_id = resolve_tenant_id(&claims);
    let program_no = format!("TPL-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let title = req
        .get("title")
        .and_then(|v| v.as_str())
        .unwrap_or("新培训计划")
        .to_string();
    let content = req
        .get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let training_type = req
        .get("training_type")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let instructor = req
        .get("trainer")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let start_date = req
        .get("planned_date")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let status = req
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("draft")
        .to_string();

    let sql = r#"
        INSERT INTO ehs.training_programs
            (program_no, title, content, training_type, instructor, start_date, status, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id::text AS id, program_no AS plan_no, title, content AS description,
                  training_type, start_date::text AS planned_date, instructor AS trainer,
                  status, created_at::text AS created_at, tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sql)
        .bind(&program_no)
        .bind(&title)
        .bind(content)
        .bind(training_type)
        .bind(instructor)
        .bind(start_date)
        .bind(&status)
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create training plan: {}", e);
            return Json(ApiResponse::error(500, "培训计划创建失败"));
        }
    };
    let plan = training_plan_from_row(&row);
    Json(ApiResponse::success(plan, "培训计划创建成功"))
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

#[derive(Debug, Deserialize)]
pub struct TrainingCertificateQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub status: Option<String>,
    pub training_type: Option<String>,
    pub employee_id: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:cert:read"])),
    path = "/api/ehs/training/certificates",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_certificates(
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Query(q): Query<TrainingCertificateQuery>,
) -> Json<ApiResponse<Vec<TrainingCertificate>>> {
    let tenant_bind = resolve_tenant_id(&claims).to_string();
    let page = q.page.unwrap_or(1).max(1);
    let page_size = q.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let mut params: Vec<String> = vec![tenant_bind];
    let mut where_clause = String::from(
        " WHERE ($1 = '00000000-0000-0000-0000-000000000000' OR tenant_id::text = $1) AND deleted_at IS NULL",
    );
    if let Some(status) = &q.status {
        where_clause.push_str(&format!(" AND status = ${}", params.len() + 1));
        params.push(status.clone());
    }
    if let Some(training_type) = &q.training_type {
        where_clause.push_str(&format!(" AND training_type = ${}", params.len() + 1));
        params.push(training_type.clone());
    }
    if let Some(employee_id) = &q.employee_id {
        where_clause.push_str(&format!(" AND employee_id = ${}", params.len() + 1));
        params.push(employee_id.clone());
    }
    if let Some(search) = &q.search {
        where_clause.push_str(&format!(
            " AND (employee_name ILIKE ${} OR certificate_no ILIKE ${})",
            params.len() + 1,
            params.len() + 2
        ));
        let like = format!("%{search}%");
        params.push(like.clone());
        params.push(like);
    }

    let sql = format!(
        r#"
        SELECT id::text AS id, certificate_no, employee_id, employee_name, training_type,
               certificate_type, issue_date::text AS issue_date, expiry_date::text AS expiry_date,
               issuing_authority, status, record_id::text AS record_id, attachments,
               created_at::text AS created_at, updated_at::text AS updated_at,
               tenant_id::text AS tenant_id
        FROM ehs.qa_ehs_training_certificates
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
            tracing::error!("Failed to list training certificates: {}", e);
            return Json(ApiResponse::error(500, "获取证书列表失败"));
        }
    };

    let list: Vec<TrainingCertificate> = rows.iter().map(training_certificate_from_row).collect();
    Json(ApiResponse::success(list, "获取证书列表成功"))
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
    State(state): State<crate::shared::AppState>,
    Extension(claims): Extension<Claims>,
    _headers: HeaderMap,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<TrainingCertificate>> {
    let tenant_id = resolve_tenant_id(&claims);
    let certificate_no = format!("CERT-{}", Uuid::new_v4().to_string()[..8].to_uppercase());
    let employee_id = req
        .get("employee_id")
        .and_then(|v| v.as_str())
        .unwrap_or_default()
        .to_string();
    let employee_name = req
        .get("employee_name")
        .and_then(|v| v.as_str())
        .unwrap_or("员工")
        .to_string();
    let training_type = req
        .get("training_type")
        .and_then(|v| v.as_str())
        .unwrap_or("safety")
        .to_string();
    let certificate_type = req
        .get("certificate_type")
        .and_then(|v| v.as_str())
        .unwrap_or("certificate")
        .to_string();
    let issue_date = req
        .get("issue_date")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let expiry_date = req
        .get("expiry_date")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let issuing_authority = req
        .get("issuing_authority")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let record_id = req
        .get("record_id")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    let status = req
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("valid")
        .to_string();
    let attachments: serde_json::Value = req
        .get("attachments")
        .cloned()
        .unwrap_or_else(|| serde_json::json!([]));

    let sql = r#"
        INSERT INTO ehs.qa_ehs_training_certificates
            (certificate_no, employee_id, employee_name, training_type, certificate_type,
             issue_date, expiry_date, issuing_authority, status, record_id, attachments, tenant_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id::text AS id, certificate_no, employee_id, employee_name, training_type,
                  certificate_type, issue_date::text AS issue_date, expiry_date::text AS expiry_date,
                  issuing_authority, status, record_id::text AS record_id, attachments,
                  created_at::text AS created_at, updated_at::text AS updated_at,
                  tenant_id::text AS tenant_id
    "#;
    let row = match sqlx::query(sql)
        .bind(&certificate_no)
        .bind(&employee_id)
        .bind(&employee_name)
        .bind(&training_type)
        .bind(&certificate_type)
        .bind(issue_date)
        .bind(expiry_date)
        .bind(issuing_authority)
        .bind(&status)
        .bind(record_id)
        .bind(attachments)
        .bind(tenant_id)
        .fetch_one(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Failed to create training certificate: {}", e);
            return Json(ApiResponse::error(500, "证书创建失败"));
        }
    };
    let certificate = training_certificate_from_row(&row);
    Json(ApiResponse::success(certificate, "证书创建成功"))
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

/// training_programs 行 → TrainingPlan（SELECT 列别名对齐本函数字段）
fn training_plan_from_row(r: &sqlx::postgres::PgRow) -> TrainingPlan {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    TrainingPlan {
        id: r.try_get("id").unwrap_or_default(),
        plan_no: r.try_get("plan_no").unwrap_or_default(),
        title: r.try_get("title").unwrap_or_default(),
        description: r.try_get("description").ok().flatten(),
        training_type: r.try_get("training_type").ok().flatten(),
        planned_date: r.try_get("planned_date").ok().flatten(),
        trainer: r.try_get("trainer").ok().flatten(),
        status: r.try_get("status").unwrap_or_else(|_| "draft".to_string()),
        created_at: r.try_get::<String, _>("created_at").unwrap_or_default(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}

/// qa_ehs_training_certificates 行 → TrainingCertificate（SELECT 列别名对齐本函数字段）
fn training_certificate_from_row(r: &sqlx::postgres::PgRow) -> TrainingCertificate {
    let tenant_id: String = r.try_get("tenant_id").unwrap_or_default();
    let attachments: Option<serde_json::Value> = r.try_get("attachments").ok().flatten();
    let attachments = attachments.and_then(|v| {
        v.as_array().map(|arr| {
            arr.iter()
                .filter_map(|e| e.as_str().map(|s| s.to_string()))
                .collect::<Vec<String>>()
        })
    });
    TrainingCertificate {
        id: r.try_get("id").unwrap_or_default(),
        certificate_no: r.try_get("certificate_no").unwrap_or_default(),
        employee_id: r.try_get("employee_id").unwrap_or_default(),
        employee_name: r.try_get("employee_name").unwrap_or_default(),
        training_type: r.try_get("training_type").unwrap_or_default(),
        certificate_type: r.try_get("certificate_type").unwrap_or_default(),
        issue_date: r.try_get("issue_date").ok().flatten(),
        expiry_date: r.try_get("expiry_date").ok().flatten(),
        issuing_authority: r.try_get("issuing_authority").ok().flatten(),
        status: r.try_get("status").unwrap_or_else(|_| "valid".to_string()),
        record_id: r.try_get("record_id").ok().flatten(),
        attachments,
        created_at: r.try_get::<String, _>("created_at").unwrap_or_default(),
        updated_at: r.try_get::<String, _>("updated_at").unwrap_or_default(),
        tenant_id: Uuid::parse_str(&tenant_id).unwrap_or_default(),
    }
}
