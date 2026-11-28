//! LIMS Data Sync module - Sync lab data with QMS and EHS

use axum::{
    extract::State,
    routing::{get, post},
    Extension, Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{types::Uuid, Row};
use topems_shared_auth::middleware::tenant::RlsTxnCell;
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
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
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

#[utoipa::path(
    get,
    security(("BearerAuth" = ["lims:data_sync:read"])),
    path = "/lims/sync-records",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "data_sync"
)]
pub async fn list_sync_records(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Query(query): axum::extract::Query<SyncQuery>,
) -> ApiResponse<Vec<SyncRecord>> {
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(10);
    let offset = (page - 1) * page_size;

    let sql = match (query.sync_type.as_ref(), query.status.as_ref()) {
        (Some(_), Some(_)) => {
            "SELECT id::TEXT, sync_no, sync_type, source_id::TEXT, target_service, target_id::TEXT, status, payload, response, error_msg, created_at, updated_at, tenant_id::TEXT FROM lims.qa_lims_sync_records WHERE sync_type = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3 OFFSET $4"
        }
        (Some(_), None) => {
            "SELECT id::TEXT, sync_no, sync_type, source_id::TEXT, target_service, target_id::TEXT, status, payload, response, error_msg, created_at, updated_at, tenant_id::TEXT FROM lims.qa_lims_sync_records WHERE sync_type = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        }
        (None, Some(_)) => {
            "SELECT id::TEXT, sync_no, sync_type, source_id::TEXT, target_service, target_id::TEXT, status, payload, response, error_msg, created_at, updated_at, tenant_id::TEXT FROM lims.qa_lims_sync_records WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3"
        }
        (None, None) => {
            "SELECT id::TEXT, sync_no, sync_type, source_id::TEXT, target_service, target_id::TEXT, status, payload, response, error_msg, created_at, updated_at, tenant_id::TEXT FROM lims.qa_lims_sync_records ORDER BY created_at DESC LIMIT $1 OFFSET $2"
        }
    };

    let mut query_builder = sqlx::query(sqlx::AssertSqlSafe(sql));
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

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 获取同步记录列表读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取同步记录列表失败");
        }
    };

    let records = query_builder.fetch_all(&mut scope).await.map(|rows| {
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

    let _ = scope.commit().await;

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
    security(("BearerAuth" = ["lims:data_sync:read"])),
    path = "/lims/sync-records/{id}",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "data_sync"
)]
pub async fn get_sync_record(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<SyncRecord> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的同步记录ID"),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 获取同步记录读作用域创建失败: {}", e);
            return ApiResponse::server_error("获取同步记录失败");
        }
    };

    let row = sqlx::query(
        "SELECT id::TEXT, sync_no, sync_type, source_id::TEXT, target_service, target_id::TEXT, status, payload, response, error_msg, created_at, updated_at, tenant_id::TEXT FROM lims.qa_lims_sync_records WHERE id = $1"
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    let _ = scope.commit().await;

    match row {
        Ok(r) => ApiResponse::success(
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
        ),
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to fetch sync record: {}", e);
            ApiResponse::server_error("获取同步记录失败")
        }
    }
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["lims:data_sync:write"])),
    path = "/lims/sync/record-to-qms",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "data_sync"
)]
pub async fn sync_record_to_qms(
    State(_state): State<crate::shared::AppState>,
    Json(_req): Json<SyncRecordToQmsRequest>,
) -> ApiResponse<SyncRecord> {
    // D3 §5.2：手动假同步通道下线。原实现读取 QMS_SERVICE_URL 后从不发 HTTP，
    // 直接编造 target_inspection_id 并本地插入 status=completed 脏记录。
    // 真实链路：LimsRecordCompleted 事件 → integration 编排 → qms internal 端点。
    ApiResponse::error(
        410,
        "手动同步通道已下线：检测结果经事件总线自动同步，请勿使用",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["lims:data_sync:write"])),
    path = "/lims/sync/reagent-to-ehs",
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "data_sync"
)]
pub async fn sync_reagent_to_ehs(
    State(_state): State<crate::shared::AppState>,
    Json(_req): Json<SyncReagentToEhsRequest>,
) -> ApiResponse<SyncRecord> {
    // D3 §5.2：手动假同步通道下线。原实现读取 EHS_SERVICE_URL 后从不发 HTTP，
    // 直接编造 target_alert_id 并本地插入 status=completed 脏记录。
    // 真实链路：LimsReagentAlert 事件 → integration 编排 → ehs internal 告警端点。
    ApiResponse::error(
        410,
        "手动同步通道已下线：试剂告警经事件总线自动同步，请勿使用",
    )
}

#[utoipa::path(
    post,
    security(("BearerAuth" = ["lims:data_sync:write"])),
    path = "/lims/sync-records/{id}/retry",
    params(
("id" = String, Path, description = "id")
    ),
    responses(
        (status = 200, description = "OK", body = serde_json::Value),
        (status = 500, description = "Internal server error")
    ),
    tag = "data_sync"
)]
pub async fn retry_sync(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<SyncRecord> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的同步记录ID"),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 同步重试写作用域创建失败: {}", e);
            return ApiResponse::server_error("同步重试失败");
        }
    };

    let row = sqlx::query(
        "UPDATE lims.qa_lims_sync_records SET status = 'pending', updated_at = NOW() WHERE id = $1 RETURNING id::TEXT, sync_no, sync_type, source_id::TEXT, target_service, target_id::TEXT, status, payload, response, error_msg, created_at, updated_at, tenant_id::TEXT"
    )
    .bind(id)
    .fetch_one(&mut scope)
    .await;

    match row {
        Ok(r) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 同步重试事务提交失败: {}", e);
                return ApiResponse::server_error("同步重试失败");
            }
            ApiResponse::success(
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
            )
        }
        Err(sqlx::Error::RowNotFound) => ApiResponse::not_found("记录不存在"),

        Err(e) => {
            tracing::error!("Failed to retry sync: {}", e);
            ApiResponse::server_error("同步重试失败")
        }
    }
}

#[utoipa::path(

    delete,

    security(("BearerAuth" = [])),

    path = "/api/lims/sync-records/{id}",
    params(
        ("id" = String, Path, description = "id")
    ),

    responses(

        (status = 200, description = "OK", body = serde_json::Value),

        (status = 500, description = "Internal server error")

    ),

    tag = "LIMS"

)]

pub async fn delete_sync_record(
    State(state): State<crate::shared::AppState>,
    Extension(txn_arc): Extension<RlsTxnCell>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> ApiResponse<bool> {
    let id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => return ApiResponse::bad_request("无效的同步记录ID"),
    };

    let mut guard = txn_arc.lock().await;
    let Some(txn) = guard.as_mut() else {
        tracing::error!("rls txn missing: RLS 事务中间件未注入");
        return ApiResponse::server_error("数据库事务上下文缺失");
    };
    // 复用请求级 RLS 事务并叠加事务级 search_path（提交/回滚由 tenant_middleware 负责）
    let mut scope = match state.db.scope_with(txn).await {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("[lims] 同步记录删除写作用域创建失败: {}", e);
            return ApiResponse::server_error("同步记录删除失败");
        }
    };

    let result = sqlx::query("DELETE FROM lims.qa_lims_sync_records WHERE id = $1")
        .bind(id)
        .execute(&mut scope)
        .await;

    match result {
        Ok(_) => {
            if let Err(e) = scope.commit().await {
                tracing::error!("[lims] 同步记录删除事务提交失败: {}", e);
                return ApiResponse::server_error("同步记录删除失败");
            }
            ApiResponse::success(true, "同步记录删除成功")
        }
        Err(e) => {
            tracing::error!("Failed to delete sync record: {}", e);
            ApiResponse::server_error("同步记录删除失败")
        }
    }
}
