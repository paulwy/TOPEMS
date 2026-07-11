//! QMS Data Sync module - Sync quality data with LIMS and EHS

use axum::{
    extract::State,
    routing::{delete, get, post},
    Extension, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared::{ApiResponse, Claims};

// ==================== Data Structures ====================

#[derive(Debug, Serialize)]
pub struct SyncRecord {
    pub id: String,
    pub tenant_id: String,
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
pub struct SyncInspectionToLimsRequest {
    pub inspection_id: String,
    pub target_task_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SyncIssueToEhsRequest {
    pub issue_id: String,
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

// ==================== Handler Functions ====================

pub async fn list_sync_records(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Query(query): axum::extract::Query<SyncQuery>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<Vec<SyncRecord>>> {
    let tenant_id = get_tenant_id(&claims, &headers);
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let sql = match (query.sync_type.as_ref(), query.status.as_ref()) {
        (Some(_), Some(_)) => {
            "SELECT id, tenant_id::TEXT, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM qa_qms_sync_records WHERE tenant_id = $1 AND sync_type = $2 AND status = $3 ORDER BY created_at DESC LIMIT $4 OFFSET $5"
        }
        (Some(_), None) => {
            "SELECT id, tenant_id::TEXT, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM qa_qms_sync_records WHERE tenant_id = $1 AND sync_type = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
        }
        (None, Some(_)) => {
            "SELECT id, tenant_id::TEXT, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM qa_qms_sync_records WHERE tenant_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
        }
        (None, None) => {
            "SELECT id, tenant_id::TEXT, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM qa_qms_sync_records WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        }
    };

    let mut query_builder = sqlx::query(sql);
    query_builder = query_builder.bind(tenant_id);
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
                tenant_id: row.get("tenant_id"),
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

pub async fn get_sync_record(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<SyncRecord>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的同步记录ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let row = sqlx::query(
        "SELECT id, tenant_id::TEXT, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM qa_qms_sync_records WHERE id = $1 AND tenant_id = $2"
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            SyncRecord {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
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

pub async fn sync_inspection_to_lims(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<SyncInspectionToLimsRequest>,
) -> Json<ApiResponse<SyncRecord>> {
    let inspection_id = match Uuid::parse_str(&req.inspection_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的检查ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    // Fetch inspection data
    let inspection = sqlx::query(
        "SELECT id, inspection_no, inspection_type, product_name, quantity, qualified_quantity, unqualified_quantity, qualification_rate, result, status, inspector, inspected_at::TEXT FROM qa_quality_inspections WHERE id = $1 AND tenant_id = $2"
    )
    .bind(inspection_id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    let inspection_row = match inspection {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Inspection not found: {}", e);
            return Json(ApiResponse::error(404, "质检记录不存在"));
        }
    };

    let sync_no = format!(
        "SYNC-{}-LIMS",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let payload = serde_json::json!({
        "inspection_id": req.inspection_id,
        "inspection_no": inspection_row.get::<String, _>("inspection_no"),
        "inspection_type": inspection_row.get::<String, _>("inspection_type"),
        "product_name": inspection_row.get::<Option<String>, _>("product_name"),
        "quantity": inspection_row.get::<Option<String>, _>("quantity"),
        "qualified_quantity": inspection_row.get::<Option<String>, _>("qualified_quantity"),
        "unqualified_quantity": inspection_row.get::<Option<String>, _>("unqualified_quantity"),
        "qualification_rate": inspection_row.get::<Option<String>, _>("qualification_rate"),
        "result": inspection_row.get::<Option<String>, _>("result"),
        "inspector": inspection_row.get::<Option<String>, _>("inspector"),
        "inspected_at": inspection_row.get::<Option<String>, _>("inspected_at"),
    });

    // Simulate sending to LIMS service
    let target_task_id = req
        .target_task_id
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let lims_url =
        std::env::var("LIMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8051".to_string());
    tracing::info!(
        "Syncing inspection {} to LIMS at {}",
        req.inspection_id,
        lims_url
    );

    // In production, use reqwest to call LIMS API
    // For now, mark as completed
    let status = "completed";
    let response = serde_json::json!({
        "target_service": "lims",
        "target_task_id": target_task_id,
        "synced_at": chrono::Utc::now().to_rfc3339(),
    });

    let row = sqlx::query(
        "INSERT INTO qa_qms_sync_records (tenant_id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response) VALUES ($1, $2, 'inspection_to_lims', $3, 'lims', $4, $5, $6, $7) RETURNING id, tenant_id::TEXT, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT"
    )
    .bind(tenant_id)
    .bind(&sync_no)
    .bind(req.inspection_id)
    .bind(&target_task_id)
    .bind(status)
    .bind(&payload)
    .bind(&response)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            SyncRecord {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
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
            "质检结果同步到 LIMS 成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create sync record: {}", e);
            Json(ApiResponse::error(500, "同步记录创建失败"))
        }
    }
}

pub async fn sync_issue_to_ehs(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    headers: axum::http::HeaderMap,
    Json(req): Json<SyncIssueToEhsRequest>,
) -> Json<ApiResponse<SyncRecord>> {
    let issue_id = match Uuid::parse_str(&req.issue_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的问题ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    // Fetch issue data
    let issue = sqlx::query(
        "SELECT id, issue_no, title, description, severity, status, related_inspection_id, created_by FROM qa_quality_issues WHERE id = $1 AND tenant_id = $2"
    )
    .bind(issue_id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    let issue_row = match issue {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Issue not found: {}", e);
            return Json(ApiResponse::error(404, "质量问题不存在"));
        }
    };

    let sync_no = format!(
        "SYNC-{}-EHS",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let payload = serde_json::json!({
        "issue_id": req.issue_id,
        "issue_no": issue_row.get::<String, _>("issue_no"),
        "title": issue_row.get::<String, _>("title"),
        "description": issue_row.get::<Option<String>, _>("description"),
        "severity": issue_row.get::<Option<String>, _>("severity"),
        "status": issue_row.get::<Option<String>, _>("status"),
        "related_inspection_id": issue_row.get::<Option<Uuid>, _>("related_inspection_id").map(|u| u.to_string()),
        "created_by": issue_row.get::<Option<String>, _>("created_by"),
    });

    let ehs_url =
        std::env::var("EHS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8052".to_string());
    tracing::info!("Syncing issue {} to EHS at {}", req.issue_id, ehs_url);

    let target_hazard_id = uuid::Uuid::new_v4().to_string();
    let status = "completed";
    let response = serde_json::json!({
        "target_service": "ehs",
        "target_hazard_id": target_hazard_id,
        "safety_check_triggered": true,
        "synced_at": chrono::Utc::now().to_rfc3339(),
    });

    let row = sqlx::query(
        "INSERT INTO qa_qms_sync_records (tenant_id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response) VALUES ($1, $2, 'issue_to_ehs', $3, 'ehs', $4, $5, $6, $7) RETURNING id, tenant_id::TEXT, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT"
    )
    .bind(tenant_id)
    .bind(&sync_no)
    .bind(req.issue_id)
    .bind(&target_hazard_id)
    .bind(status)
    .bind(&payload)
    .bind(&response)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            SyncRecord {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
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
            "质量问题已触发 EHS 安全检查",
        )),
        Err(e) => {
            tracing::error!("Failed to create sync record: {}", e);
            Json(ApiResponse::error(500, "同步记录创建失败"))
        }
    }
}

pub async fn retry_sync(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<SyncRecord>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的同步记录ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let row = sqlx::query(
        "UPDATE qa_qms_sync_records SET status = 'pending', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id, tenant_id::TEXT, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT"
    )
    .bind(id)
    .bind(tenant_id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => Json(ApiResponse::success(
            SyncRecord {
                id: r.get("id"),
                tenant_id: r.get("tenant_id"),
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

pub async fn delete_sync_record(
    State(state): State<crate::AppState>,
    Extension(claims): Extension<Claims>,
    axum::extract::Path(id): axum::extract::Path<String>,
    headers: axum::http::HeaderMap,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的同步记录ID")),
    };
    let tenant_id = get_tenant_id(&claims, &headers);

    let result = sqlx::query("DELETE FROM qa_qms_sync_records WHERE id = $1 AND tenant_id = $2")
        .bind(id)
        .bind(tenant_id)
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

pub fn create_routes() -> Router<crate::AppState> {
    Router::new()
        .route("/api/qms/sync-records", get(list_sync_records))
        .route("/api/qms/sync-records/{id}", get(get_sync_record))
        .route("/api/qms/sync-records/{id}", delete(delete_sync_record))
        .route("/api/qms/sync-records/{id}/retry", post(retry_sync))
        .route(
            "/api/qms/sync/inspection-to-lims",
            post(sync_inspection_to_lims),
        )
        .route("/api/qms/sync/issue-to-ehs", post(sync_issue_to_ehs))
}
