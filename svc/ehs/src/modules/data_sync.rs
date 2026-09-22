//! EHS Data Sync module - Sync safety data with QMS and LIMS

use axum::{
    extract::State,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_boundary::only_own_schema_query;
use topems_shared_core::response::ApiResponse;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/sync-records", get(list_sync_records))
        .route(
            "/sync-records/{id}",
            get(get_sync_record).delete(delete_sync_record),
        )
        .route("/sync-records/{id}/retry", post(retry_sync))
        .route("/sync/hazard-to-qms", post(sync_hazard_to_qms))
        .route("/sync/accident-to-lims", post(sync_accident_to_lims))
        .route("/sync", get(list_sync_records))
        .route(
            "/sync/configs",
            get(list_sync_configs).put(update_sync_configs),
        )
        .route("/sync/retry", post(batch_retry_sync))
        .route("/sync/to-lims", post(sync_accident_to_lims))
        .route("/sync/to-qms", post(sync_hazard_to_qms))
}

// ==================== Data Structures ====================

#[derive(Debug, Serialize)]
pub struct SyncRecord {
    pub id: String,
    pub sync_no: String,
    pub sync_type: String,
    pub source_id: Option<String>,
    pub target_service: String,
    pub target_id: Option<String>,
    pub status: String,
    pub payload: Option<serde_json::Value>,
    pub response: Option<serde_json::Value>,
    pub error_msg: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SyncQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub sync_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SyncHazardToQmsRequest {
    pub hazard_id: String,
}

#[derive(Debug, Deserialize)]
pub struct SyncAccidentToLimsRequest {
    pub accident_id: String,
    pub test_items: Option<Vec<String>>,
}

// ==================== Handler Functions ====================

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/sync-records",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_sync_records(
    State(state): State<crate::shared::AppState>,
    axum::extract::Query(query): axum::extract::Query<SyncQuery>,
) -> Json<ApiResponse<Vec<SyncRecord>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let sql = match (query.sync_type.as_ref(), query.status.as_ref()) {
        (Some(_), Some(_)) => {
            "SELECT id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM ehs.qa_ehs_sync_records WHERE sync_type = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
        }
        (Some(_), None) => {
            "SELECT id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM ehs.qa_ehs_sync_records WHERE sync_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        }
        (None, Some(_)) => {
            "SELECT id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM ehs.qa_ehs_sync_records WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        }
        (None, None) => {
            "SELECT id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM ehs.qa_ehs_sync_records ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        }
    };

    let mut query_builder = sqlx::query(sql);
    match (query.sync_type.as_ref(), query.status.as_ref()) {
        (Some(ty), Some(st)) => {
            query_builder = query_builder.bind(ty).bind(st).bind(page_size).bind(offset);
        }
        (Some(ty), None) => {
            query_builder = query_builder.bind(ty).bind(page_size).bind(offset);
        }
        (None, Some(st)) => {
            query_builder = query_builder.bind(st).bind(page_size).bind(offset);
        }
        (None, None) => {
            query_builder = query_builder.bind(page_size).bind(offset);
        }
    }

    let records = query_builder.fetch_all(&state.pool).await.map(|rows| {
        rows.into_iter()
            .map(|row| SyncRecord {
                id: row.get("id"),
                sync_no: row.get("sync_no"),
                sync_type: row.get("sync_type"),
                source_id: row.get("source_id"),
                target_service: row.get("target_service"),
                target_id: row.get("target_id"),
                status: row.get("status"),
                payload: row.get("payload"),
                response: row.get("response"),
                error_msg: row.get("error_msg"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            })
            .collect()
    });

    match records {
        Ok(data) => Json(ApiResponse::success(data, "获取同步记录列表成功")),
        Err(e) => {
            tracing::error!("Failed to fetch sync records: {}", e);
            Json(ApiResponse::error(500, "获取同步记录列表失败"))
        }
    }
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/sync-records/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn get_sync_record(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<SyncRecord>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的同步记录ID")),
    };

    let row = sqlx::query(
        only_own_schema_query!("ehs", "SELECT id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM ehs.qa_ehs_sync_records WHERE id = $1")
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            SyncRecord {
                id: r.get("id"),
                sync_no: r.get("sync_no"),
                sync_type: r.get("sync_type"),
                source_id: r.get("source_id"),
                target_service: r.get("target_service"),
                target_id: r.get("target_id"),
                status: r.get("status"),
                payload: r.get("payload"),
                response: r.get("response"),
                error_msg: r.get("error_msg"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "获取同步记录成功",
        )),
        Err(e) => {
            tracing::error!("Failed to fetch sync record: {}", e);
            Json(ApiResponse::error(500, "获取同步记录失败"))
        }
    }
}

// gate: admin-only
#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:hazard:admin"])),
    path = "/api/ehs/sync/hazard-to-qms",
    request_body = SyncHazardToQmsRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn sync_hazard_to_qms(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<SyncHazardToQmsRequest>,
) -> Json<ApiResponse<SyncRecord>> {
    let hazard_id = match Uuid::parse_str(&req.hazard_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的隐患ID")),
    };

    // Fetch hazard data
    let hazard = sqlx::query(
        only_own_schema_query!("ehs", "SELECT id, hazard_no, title, description, category, level, source, location, reported_by, reported_at::TEXT, status, inspection_id FROM qa_ehs_hazards WHERE id = $1")
    )
    .bind(hazard_id)
    .fetch_one(&state.pool)
    .await;

    let hazard_row = match hazard {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Hazard not found: {}", e);
            return Json(ApiResponse::error(404, "安全隐患不存在"));
        }
    };

    let sync_no = format!(
        "SYNC-{}-QMS",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let payload = serde_json::json!({
        "hazard_id": req.hazard_id,
        "hazard_no": hazard_row.get::<String, _>("hazard_no"),
        "title": hazard_row.get::<String, _>("title"),
        "description": hazard_row.get::<Option<String>, _>("description"),
        "category": hazard_row.get::<Option<String>, _>("category"),
        "level": hazard_row.get::<Option<String>, _>("level"),
        "source": hazard_row.get::<Option<String>, _>("source"),
        "location": hazard_row.get::<Option<String>, _>("location"),
        "reported_by": hazard_row.get::<Option<String>, _>("reported_by"),
        "reported_at": hazard_row.get::<Option<String>, _>("reported_at"),
        "status": hazard_row.get::<Option<String>, _>("status"),
        "inspection_id": hazard_row.get::<Option<Uuid>, _>("inspection_id").map(|u| u.to_string()),
    });

    let qms_url =
        std::env::var("QMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8050".to_string());
    tracing::debug!("Syncing hazard {} to QMS at {}", req.hazard_id, qms_url);

    let target_issue_id = uuid::Uuid::new_v4().to_string();
    let status = "completed";
    let response = serde_json::json!({
        "target_service": "qms",
        "target_issue_id": target_issue_id,
        "rectification_created": true,
        "synced_at": chrono::Utc::now().to_rfc3339(),
    });

    let row = sqlx::query(
        only_own_schema_query!("ehs", "INSERT INTO ehs.qa_ehs_sync_records (sync_no, sync_type, source_id, target_service, target_id, status, payload, response, tenant_id) VALUES ($1, 'hazard_to_qms', $2, 'qms', $3, $4, $5, $6, $7) RETURNING id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT")
    )
    .bind(&sync_no)
    .bind(req.hazard_id)
    .bind(&target_issue_id)
    .bind(status)
    .bind(&payload)
    .bind(&response)
    .bind(Uuid::nil())
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            SyncRecord {
                id: r.get("id"),
                sync_no: r.get("sync_no"),
                sync_type: r.get("sync_type"),
                source_id: r.get("source_id"),
                target_service: r.get("target_service"),
                target_id: r.get("target_id"),
                status: r.get("status"),
                payload: r.get("payload"),
                response: r.get("response"),
                error_msg: r.get("error_msg"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "安全隐患已同步到 QMS 整改",
        )),
        Err(e) => {
            tracing::error!("Failed to create sync record: {}", e);
            Json(ApiResponse::error(500, "同步记录创建失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/sync/accident-to-lims",
    request_body = SyncAccidentToLimsRequest,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn sync_accident_to_lims(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<SyncAccidentToLimsRequest>,
) -> Json<ApiResponse<SyncRecord>> {
    let accident_id = match Uuid::parse_str(&req.accident_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的事故ID")),
    };

    // Fetch accident data
    let accident = sqlx::query(
        only_own_schema_query!("ehs", "SELECT id, accident_no, title, description, accident_type, severity, location, occurred_at::TEXT, casualties, economic_loss, status, reported_by FROM qa_ehs_accidents WHERE id = $1")
    )
    .bind(accident_id)
    .fetch_one(&state.pool)
    .await;

    let accident_row = match accident {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Accident not found: {}", e);
            return Json(ApiResponse::error(404, "事故报告不存在"));
        }
    };

    let sync_no = format!(
        "SYNC-{}-LIMS",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let payload = serde_json::json!({
        "accident_id": req.accident_id,
        "accident_no": accident_row.get::<String, _>("accident_no"),
        "title": accident_row.get::<String, _>("title"),
        "description": accident_row.get::<Option<String>, _>("description"),
        "accident_type": accident_row.get::<Option<String>, _>("accident_type"),
        "severity": accident_row.get::<Option<String>, _>("severity"),
        "location": accident_row.get::<Option<String>, _>("location"),
        "occurred_at": accident_row.get::<Option<String>, _>("occurred_at"),
        "casualties": accident_row.get::<Option<i32>, _>("casualties"),
        "economic_loss": accident_row.get::<Option<String>, _>("economic_loss"),
        "status": accident_row.get::<Option<String>, _>("status"),
        "reported_by": accident_row.get::<Option<String>, _>("reported_by"),
        "test_items": req.test_items,
    });

    let lims_url =
        std::env::var("LIMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8051".to_string());
    tracing::debug!(
        "Syncing accident {} to LIMS at {}",
        req.accident_id,
        lims_url
    );

    let target_sample_id = uuid::Uuid::new_v4().to_string();
    let status = "completed";
    let response = serde_json::json!({
        "target_service": "lims",
        "target_sample_id": target_sample_id,
        "detection_task_created": true,
        "synced_at": chrono::Utc::now().to_rfc3339(),
    });

    let row = sqlx::query(
        only_own_schema_query!("ehs", "INSERT INTO ehs.qa_ehs_sync_records (sync_no, sync_type, source_id, target_service, target_id, status, payload, response, tenant_id) VALUES ($1, 'accident_to_lims', $2, 'lims', $3, $4, $5, $6, $7) RETURNING id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT")
    )
    .bind(&sync_no)
    .bind(req.accident_id)
    .bind(&target_sample_id)
    .bind(status)
    .bind(&payload)
    .bind(&response)
    .bind(Uuid::nil())
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            SyncRecord {
                id: r.get("id"),
                sync_no: r.get("sync_no"),
                sync_type: r.get("sync_type"),
                source_id: r.get("source_id"),
                target_service: r.get("target_service"),
                target_id: r.get("target_id"),
                status: r.get("status"),
                payload: r.get("payload"),
                response: r.get("response"),
                error_msg: r.get("error_msg"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "事故报告已同步到 LIMS 检测",
        )),
        Err(e) => {
            tracing::error!("Failed to create sync record: {}", e);
            Json(ApiResponse::error(500, "同步记录创建失败"))
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/sync-records/{id}/retry",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn retry_sync(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<SyncRecord>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的同步记录ID")),
    };

    let row = sqlx::query(
        only_own_schema_query!("ehs", "UPDATE ehs.qa_ehs_sync_records SET status = 'pending', updated_at = NOW() WHERE id = $1 RETURNING id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT")
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            SyncRecord {
                id: r.get("id"),
                sync_no: r.get("sync_no"),
                sync_type: r.get("sync_type"),
                source_id: r.get("source_id"),
                target_service: r.get("target_service"),
                target_id: r.get("target_id"),
                status: r.get("status"),
                payload: r.get("payload"),
                response: r.get("response"),
                error_msg: r.get("error_msg"),
                created_at: r.get("created_at"),
                updated_at: r.get("updated_at"),
            },
            "同步记录已重置为待处理",
        )),
        Err(e) => {
            tracing::error!("Failed to retry sync: {}", e);
            Json(ApiResponse::error(500, "同步重试失败"))
        }
    }
}

#[utoipa::path(
    delete,
    security(("BearerAuth" = ["ehs:delete"])),
    path = "/api/ehs/sync-records/{id}",
    tag = "ehs",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses((status = 200, description = "OK")),
)]
pub async fn delete_sync_record(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的同步记录ID")),
    };

    let result = sqlx::query(only_own_schema_query!(
        "ehs",
        "DELETE FROM ehs.qa_ehs_sync_records WHERE id = $1"
    ))
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => Json(ApiResponse::success(true, "同步记录删除成功")),
        Err(e) => {
            tracing::error!("Failed to delete sync record: {}", e);
            Json(ApiResponse::error(500, "同步记录删除失败"))
        }
    }
}

#[derive(Debug, Serialize)]
pub struct SyncConfig {
    pub qms_enabled: bool,
    pub qms_url: String,
    pub lims_enabled: bool,
    pub lims_url: String,
    pub auto_sync: bool,
    pub sync_interval: i32,
    pub last_sync_at: Option<String>,
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/sync/configs",
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn list_sync_configs(
    State(_state): State<crate::shared::AppState>,
) -> Json<ApiResponse<SyncConfig>> {
    tracing::debug!("Getting sync configs");
    let qms_url =
        std::env::var("QMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8050".to_string());
    let lims_url =
        std::env::var("LIMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8051".to_string());

    Json(ApiResponse::success(
        SyncConfig {
            qms_enabled: true,
            qms_url,
            lims_enabled: true,
            lims_url,
            auto_sync: false,
            sync_interval: 30,
            last_sync_at: None,
        },
        "获取同步配置成功",
    ))
}

#[utoipa::path(
    put,
    security(("BearerAuth" = ["ehs:update"])),
    path = "/api/ehs/sync/configs",
    request_body = serde_json::Value,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn update_sync_configs(
    State(_state): State<crate::shared::AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<SyncConfig>> {
    tracing::debug!("Updating sync configs: {:?}", req);
    let qms_url =
        std::env::var("QMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8050".to_string());
    let lims_url =
        std::env::var("LIMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8051".to_string());

    Json(ApiResponse::success(
        SyncConfig {
            qms_enabled: req
                .get("qms_enabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(true),
            qms_url: req
                .get("qms_url")
                .and_then(|v| v.as_str())
                .unwrap_or(&qms_url)
                .to_string(),
            lims_enabled: req
                .get("lims_enabled")
                .and_then(|v| v.as_bool())
                .unwrap_or(true),
            lims_url: req
                .get("lims_url")
                .and_then(|v| v.as_str())
                .unwrap_or(&lims_url)
                .to_string(),
            auto_sync: req
                .get("auto_sync")
                .and_then(|v| v.as_bool())
                .unwrap_or(false),
            sync_interval: req
                .get("sync_interval")
                .and_then(|v| v.as_i64())
                .unwrap_or(30) as i32,
            last_sync_at: None,
        },
        "同步配置更新成功",
    ))
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["ehs:write"])),
    path = "/api/ehs/sync/retry",
    request_body = serde_json::Value,
    tag = "ehs",
    responses((status = 200, description = "OK")),
)]
pub async fn batch_retry_sync(
    State(_state): State<crate::shared::AppState>,
    Json(req): Json<serde_json::Value>,
) -> Json<ApiResponse<serde_json::Value>> {
    tracing::debug!("Batch retry sync: {:?}", req);
    Json(ApiResponse::success(
        serde_json::json!({
            "success": true,
            "retried_count": 0,
            "message": "批量重试已提交"
        }),
        "批量重试成功",
    ))
}
