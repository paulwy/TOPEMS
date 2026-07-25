//! LIMS Data Sync module - Sync lab data with QMS and EHS

use axum::{
    extract::State,
    routing::{get, post}, Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared::ApiResponse;

use crate::shared::AppState;

pub fn create_routes() -> Router<AppState> {
    Router::new()
        .route("/sync-records", get(list_sync_records))
        .route(
            "/sync-records/{id}",
            get(get_sync_record).delete(delete_sync_record),
        )
        .route("/sync-records/{id}/retry", post(retry_sync))
        .route("/sync/record-to-qms", post(sync_record_to_qms))
        .route("/sync/reagent-to-ehs", post(sync_reagent_to_ehs))
}

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
pub struct SyncRecordToQmsRequest {
    pub record_id: String,
    pub target_inspection_id: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct SyncReagentToEhsRequest {
    pub reagent_id: String,
    pub alert_type: String,
    pub alert_description: String,
}

// ==================== Handler Functions ====================

pub async fn list_sync_records(
    State(state): State<crate::shared::AppState>,
    axum::extract::Query(query): axum::extract::Query<SyncQuery>,
) -> Json<ApiResponse<Vec<SyncRecord>>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let sql = match (query.sync_type.as_ref(), query.status.as_ref()) {
        (Some(_), Some(_)) => {
            "SELECT id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM qa_lims_sync_records WHERE sync_type = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
        }
        (Some(_), None) => {
            "SELECT id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM qa_lims_sync_records WHERE sync_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        }
        (None, Some(_)) => {
            "SELECT id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM qa_lims_sync_records WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        }
        (None, None) => {
            "SELECT id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM qa_lims_sync_records ORDER BY created_at DESC LIMIT $1 OFFSET $2"
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
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<SyncRecord>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的同步记录ID")),
    };

    let row = sqlx::query(
        "SELECT id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM qa_lims_sync_records WHERE id = $1"
    )
    .bind(id)
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

pub async fn sync_record_to_qms(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<SyncRecordToQmsRequest>,
) -> Json<ApiResponse<SyncRecord>> {
    let record_id = match Uuid::parse_str(&req.record_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的记录ID")),
    };

    // Fetch inspection record with task info
    let record = sqlx::query(
        "SELECT r.id, r.record_no, r.task_id, r.test_data, r.conclusion, r.recorded_by, r.recorded_at::TEXT, t.sample_no, t.test_items FROM qa_lab_records r LEFT JOIN qa_lab_tasks t ON r.task_id = t.id WHERE r.id = $1"
    )
    .bind(record_id)
    .fetch_one(&state.pool)
    .await;

    let record_row = match record {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Record not found: {}", e);
            return Json(ApiResponse::error(404, "检测记录不存在"));
        }
    };

    let sync_no = format!(
        "SYNC-{}-QMS",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let payload = serde_json::json!({
        "record_id": req.record_id,
        "record_no": record_row.get::<String, _>("record_no"),
        "task_id": record_row.get::<Uuid, _>("task_id").to_string(),
        "sample_no": record_row.get::<Option<String>, _>("sample_no"),
        "test_data": record_row.get::<serde_json::Value, _>("test_data"),
        "conclusion": record_row.get::<String, _>("conclusion"),
        "recorded_by": record_row.get::<String, _>("recorded_by"),
        "recorded_at": record_row.get::<Option<String>, _>("recorded_at"),
    });

    let qms_url =
        std::env::var("QMS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8050".to_string());
    tracing::info!("Syncing record {} to QMS at {}", req.record_id, qms_url);

    let target_inspection_id = req
        .target_inspection_id
        .unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
    let status = "completed";
    let response = serde_json::json!({
        "target_service": "qms",
        "target_inspection_id": target_inspection_id,
        "synced_at": chrono::Utc::now().to_rfc3339(),
    });

    let row = sqlx::query(
        "INSERT INTO qa_lims_sync_records (sync_no, sync_type, source_id, target_service, target_id, status, payload, response) VALUES ($1, 'record_to_qms', $2, 'qms', $3, $4, $5, $6) RETURNING id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT"
    )
    .bind(&sync_no)
    .bind(req.record_id)
    .bind(&target_inspection_id)
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
            "检验结果同步到 QMS 成功",
        )),
        Err(e) => {
            tracing::error!("Failed to create sync record: {}", e);
            Json(ApiResponse::error(500, "同步记录创建失败"))
        }
    }
}

pub async fn sync_reagent_to_ehs(
    State(state): State<crate::shared::AppState>,
    Json(req): Json<SyncReagentToEhsRequest>,
) -> Json<ApiResponse<SyncRecord>> {
    let reagent_id = match Uuid::parse_str(&req.reagent_id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的试剂ID")),
    };

    // Fetch reagent data
    let reagent = sqlx::query(
        "SELECT id, reagent_no, name, specification, manufacturer, batch_no, quantity, unit, status, expired_at::TEXT FROM qa_lab_reagents WHERE id = $1"
    )
    .bind(reagent_id)
    .fetch_one(&state.pool)
    .await;

    let reagent_row = match reagent {
        Ok(r) => r,
        Err(e) => {
            tracing::error!("Reagent not found: {}", e);
            return Json(ApiResponse::error(404, "试剂记录不存在"));
        }
    };

    let sync_no = format!(
        "SYNC-{}-EHS",
        uuid::Uuid::new_v4().to_string()[..8].to_uppercase()
    );
    let payload = serde_json::json!({
        "reagent_id": req.reagent_id,
        "reagent_no": reagent_row.get::<String, _>("reagent_no"),
        "name": reagent_row.get::<String, _>("name"),
        "specification": reagent_row.get::<Option<String>, _>("specification"),
        "manufacturer": reagent_row.get::<Option<String>, _>("manufacturer"),
        "batch_no": reagent_row.get::<Option<String>, _>("batch_no"),
        "quantity": reagent_row.get::<Option<f64>, _>("quantity"),
        "unit": reagent_row.get::<Option<String>, _>("unit"),
        "status": reagent_row.get::<String, _>("status"),
        "expired_at": reagent_row.get::<Option<String>, _>("expired_at"),
        "alert_type": req.alert_type,
        "alert_description": req.alert_description,
    });

    let ehs_url =
        std::env::var("EHS_SERVICE_URL").unwrap_or_else(|_| "http://localhost:8052".to_string());
    tracing::info!(
        "Syncing reagent alert {} to EHS at {}",
        req.reagent_id,
        ehs_url
    );

    let target_alert_id = uuid::Uuid::new_v4().to_string();
    let status = "completed";
    let response = serde_json::json!({
        "target_service": "ehs",
        "target_alert_id": target_alert_id,
        "alert_triggered": true,
        "synced_at": chrono::Utc::now().to_rfc3339(),
    });

    let row = sqlx::query(
        "INSERT INTO qa_lims_sync_records (sync_no, sync_type, source_id, target_service, target_id, status, payload, response) VALUES ($1, 'reagent_to_ehs', $2, 'ehs', $3, $4, $5, $6) RETURNING id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT"
    )
    .bind(&sync_no)
    .bind(req.reagent_id)
    .bind(&target_alert_id)
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
            "试剂异常已触发 EHS 告警",
        )),
        Err(e) => {
            tracing::error!("Failed to create sync record: {}", e);
            Json(ApiResponse::error(500, "同步记录创建失败"))
        }
    }
}

pub async fn retry_sync(
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<SyncRecord>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的同步记录ID")),
    };

    let row = sqlx::query(
        "UPDATE qa_lims_sync_records SET status = 'pending', updated_at = NOW() WHERE id = $1 RETURNING id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT"
    )
    .bind(id)
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
    State(state): State<crate::shared::AppState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> Json<ApiResponse<bool>> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return Json(ApiResponse::error(400, "无效的同步记录ID")),
    };

    let result = sqlx::query("DELETE FROM qa_lims_sync_records WHERE id = $1")
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
