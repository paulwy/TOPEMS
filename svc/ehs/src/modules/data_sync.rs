//! EHS Data Sync module - Sync safety data with QMS and LIMS
//!
//! 租户隔离判定（P2 制造域 B 审计豁免登记，2026-10-24）：
//! `ehs.qa_ehs_sync_records` 为**系统级跨服务集成同步日志**（EHS→QMS/LIMS 编排工具
//! 运维记录），表结构自始无 `tenant_id` 列、无 RLS 策略（见 database/init/10_ehs_schema.sql
//! 与全部 selfheal 迁移，仅补 deleted_at）。20261006000003_u3_fake_sync_records_cleanup
//! 已正式下线手动假同步写通道：sync_hazard_to_qms / sync_accident_to_lims / 配置 CRUD /
//! 批量重试一律返回 501，本模块现存的 list/get/retry/delete 仅用于历史同步记录的运维
//! 浏览与清理，属全局运维视角而非租户业务数据。
//! 故此处**不补假租户过滤**（引用不存在的 tenant_id 列会直接破坏查询）；操作面已由
//! ehs:read / ehs:write / ehs:delete 权限点收敛（运维级），与 lims/qms 同族
//! qa_*_sync_records 表治理口径一致。

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
        .route("/sync", get(list_sync_records))
        .route(
            "/sync/configs",
            get(list_sync_configs).put(update_sync_configs),
        )
        .route("/sync/configs/{id}", get(get_sync_config))
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
) -> ApiResponse<Vec<SyncRecord>> {
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
        Ok(data) => ApiResponse::success(data, "获取同步记录列表成功"),
        Err(e) => {
            tracing::error!("Failed to fetch sync records: {}", e);
            ApiResponse::server_error("获取同步记录列表失败")
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
) -> ApiResponse<SyncRecord> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的同步记录ID"),
    };

    let row = sqlx::query(
        only_own_schema_query!("ehs", "SELECT id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT FROM ehs.qa_ehs_sync_records WHERE id = $1")
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => ApiResponse::success(
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
        ),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("同步记录不存在"),
        Err(e) => {
            tracing::error!("Failed to fetch sync record: {}", e);
            ApiResponse::server_error("获取同步记录失败")
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
    State(_state): State<crate::shared::AppState>,
    Json(_req): Json<SyncHazardToQmsRequest>,
) -> ApiResponse<SyncRecord> {
    tracing::warn!("Data sync module not yet enabled");
    ApiResponse::not_implemented("数据同步数据源尚未启用")
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
    State(_state): State<crate::shared::AppState>,
    Json(_req): Json<SyncAccidentToLimsRequest>,
) -> ApiResponse<SyncRecord> {
    tracing::warn!("Data sync module not yet enabled");
    ApiResponse::not_implemented("数据同步数据源尚未启用")
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
) -> ApiResponse<SyncRecord> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的同步记录ID"),
    };

    let row = sqlx::query(
        only_own_schema_query!("ehs", "UPDATE ehs.qa_ehs_sync_records SET status = 'pending', updated_at = NOW() WHERE id = $1 RETURNING id, sync_no, sync_type, source_id, target_service, target_id, status, payload, response, error_msg, created_at::TEXT, updated_at::TEXT")
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match row {
        Ok(r) => ApiResponse::success(
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
        ),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("同步记录不存在"),
        Err(e) => {
            tracing::error!("Failed to retry sync: {}", e);
            ApiResponse::server_error("同步重试失败")
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
) -> ApiResponse<bool> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的同步记录ID"),
    };

    let result = sqlx::query(only_own_schema_query!(
        "ehs",
        "DELETE FROM ehs.qa_ehs_sync_records WHERE id = $1"
    ))
    .bind(id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(_) => ApiResponse::success(true, "同步记录删除成功"),
        Err(e) => {
            tracing::error!("Failed to delete sync record: {}", e);
            ApiResponse::server_error("同步记录删除失败")
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
) -> ApiResponse<SyncConfig> {
    tracing::warn!("Data sync module not yet enabled");
    ApiResponse::not_implemented("数据同步数据源尚未启用")
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
    Json(_req): Json<serde_json::Value>,
) -> ApiResponse<SyncConfig> {
    tracing::warn!("Data sync module not yet enabled");
    ApiResponse::not_implemented("数据同步数据源尚未启用")
}

#[utoipa::path(
    get,
    security(("BearerAuth" = ["ehs:read"])),
    path = "/api/ehs/sync/configs/{id}",
    tag = "ehs",
    params(("id" = String, Path, description = "id")),
    responses((status = 200, description = "OK")),
)]
pub async fn get_sync_config(
    State(_state): State<crate::shared::AppState>,
    axum::extract::Path(_id): axum::extract::Path<String>,
) -> ApiResponse<SyncConfig> {
    tracing::warn!("Data sync module not yet enabled");
    ApiResponse::not_implemented("数据同步数据源尚未启用")
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
    Json(_req): Json<serde_json::Value>,
) -> ApiResponse<serde_json::Value> {
    tracing::warn!("Data sync module not yet enabled");
    ApiResponse::not_implemented("数据同步数据源尚未启用")
}
