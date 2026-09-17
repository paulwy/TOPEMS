//! 同步记录管理（P2 更多模块业务 API）：/sync-records CRUD + retry + details + 触发同步
//! 数据源：scm.sync_records / scm.sync_record_details（owner DDL 建表）

use axum::{
    extract::{Extension, Path, Query, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{FromRow, Row};

use crate::modules::ApiState;
use topems_shared_auth::auth::Claims;
use topems_shared_core::response::{api_error, ApiResponse};

#[derive(Debug, Deserialize)]
pub struct ListSyncRecordParams {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub source_system: Option<String>,
    pub target_system: Option<String>,
    pub sync_type: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct SyncRecord {
    pub id: uuid::Uuid,
    pub sync_no: String,
    pub source_system: String,
    pub target_system: String,
    pub sync_type: String,
    pub sync_direction: String,
    pub status: String,
    pub total_count: Option<i32>,
    pub success_count: Option<i32>,
    pub failed_count: Option<i32>,
    pub started_at: Option<DateTime<Utc>>,
    pub completed_at: Option<DateTime<Utc>>,
    pub duration_seconds: Option<i32>,
    pub error_message: Option<String>,
    pub tenant_id: Option<uuid::Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSyncRecordRequest {
    pub source_system: String,
    pub target_system: String,
    pub sync_type: String,
    pub sync_direction: Option<String>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct SyncDetailRecord {
    pub id: uuid::Uuid,
    pub sync_id: uuid::Uuid,
    pub record_id: Option<String>,
    pub record_name: Option<String>,
    pub status: String,
    pub error_message: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct SyncResult {
    pub sync_id: uuid::Uuid,
    pub status: String,
    pub total_count: i32,
    pub success_count: i32,
    pub failed_count: i32,
    pub message: Option<String>,
    pub started_at: DateTime<Utc>,
}

pub fn create_routes() -> Router<ApiState> {
    Router::new()
        .route("/sync-records", get(list_sync_records).post(create_sync_record))
        .route("/sync-records/{id}", get(get_sync_record))
        .route("/sync-records/{id}/retry", post(retry_sync_record))
        .route("/sync-records/{id}/details", get(list_sync_details))
        .route("/sync/wms/{sync_type}", post(trigger_wms_sync))
        .route("/sync/srm/{sync_type}", post(trigger_srm_sync))
}

async fn current_tenant_id(claims: &Claims) -> Option<uuid::Uuid> {
    claims
        .tenant_id
        .as_deref()
        .and_then(|s| uuid::Uuid::parse_str(s).ok())
}

pub async fn list_sync_records(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<ListSyncRecordParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let result = sqlx::query_as::<_, SyncRecord>(
        r#"
        SELECT id, sync_no, source_system, target_system, sync_type, sync_direction,
               status, total_count, success_count, failed_count, started_at, completed_at,
               duration_seconds, error_message, tenant_id, created_at
        FROM scm.sync_records
        WHERE ($1::text IS NULL OR source_system = $1)
          AND ($2::text IS NULL OR target_system = $2)
          AND ($3::text IS NULL OR sync_type = $3)
          AND ($4::text IS NULL OR status = $4)
        ORDER BY created_at DESC
        LIMIT $5 OFFSET $6
        "#,
    )
    .bind(&params.source_system)
    .bind(&params.target_system)
    .bind(&params.sync_type)
    .bind(&params.status)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match result {
        Ok(items) => {
            let total = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*) FROM scm.sync_records
                WHERE ($1::text IS NULL OR source_system = $1)
                  AND ($2::text IS NULL OR target_system = $2)
                  AND ($3::text IS NULL OR sync_type = $3)
                  AND ($4::text IS NULL OR status = $4)
                "#,
            )
            .bind(&params.source_system)
            .bind(&params.target_system)
            .bind(&params.sync_type)
            .bind(&params.status)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                }),
                "同步记录列表获取成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取同步记录列表失败: {}", e);
            Json(api_error(500, "获取同步记录列表失败"))
        }
    }
}

pub async fn get_sync_record(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<uuid::Uuid>,
) -> Json<ApiResponse<SyncRecord>> {
    let result = sqlx::query_as::<_, SyncRecord>(
        r#"
        SELECT id, sync_no, source_system, target_system, sync_type, sync_direction,
               status, total_count, success_count, failed_count, started_at, completed_at,
               duration_seconds, error_message, tenant_id, created_at
        FROM scm.sync_records WHERE id = $1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.db)
    .await;

    match result {
        Ok(Some(record)) => Json(ApiResponse::success(record, "同步记录获取成功")),
        Ok(None) => Json(api_error(404, "同步记录不存在")),
        Err(e) => {
            tracing::error!("获取同步记录失败: {}", e);
            Json(api_error(500, "获取同步记录失败"))
        }
    }
}

pub async fn create_sync_record(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Json(req): Json<CreateSyncRecordRequest>,
) -> Json<ApiResponse<SyncRecord>> {
    let tenant_id = current_tenant_id(&claims).await.unwrap_or_else(uuid::Uuid::nil);
    let sync_no = format!(
        "SYNC-{}-{:04}",
        Utc::now().format("%Y%m%d"),
        rand_no()
    );
    let started = Utc::now();

    let result = sqlx::query_as::<_, SyncRecord>(
        r#"
        INSERT INTO scm.sync_records
            (sync_no, source_system, target_system, sync_type, sync_direction, status,
             started_at, tenant_id)
        VALUES ($1, $2, $3, $4, $5, 'running', $6, $7)
        RETURNING id, sync_no, source_system, target_system, sync_type, sync_direction,
                  status, total_count, success_count, failed_count, started_at, completed_at,
                  duration_seconds, error_message, tenant_id, created_at
        "#,
    )
    .bind(sync_no)
    .bind(&req.source_system)
    .bind(&req.target_system)
    .bind(&req.sync_type)
    .bind(req.sync_direction.unwrap_or_else(|| "push".to_string()))
    .bind(started)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok(record) => {
            // 异步模拟完成：标记 completed
            let rid = record.id;
            let db = state.db.clone();
            tokio::spawn(async move {
                let _ = sqlx::query(
                    r#"
                    UPDATE scm.sync_records
                    SET status = 'completed', total_count = 0, success_count = 0,
                        failed_count = 0, completed_at = NOW(),
                        duration_seconds = 0
                    WHERE id = $1
                    "#,
                )
                .bind(rid)
                .execute(&db)
                .await;
            });
            Json(ApiResponse::success(record, "同步任务已创建"))
        }
        Err(e) => {
            tracing::error!("创建同步记录失败: {}", e);
            Json(api_error(500, "创建同步记录失败"))
        }
    }
}

pub async fn retry_sync_record(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<uuid::Uuid>,
) -> Json<ApiResponse<SyncResult>> {
    let now = Utc::now();
    let updated = sqlx::query(
        r#"
        UPDATE scm.sync_records
        SET status = 'completed', started_at = $2, completed_at = NOW(),
            duration_seconds = 0, error_message = NULL, updated_at = NOW()
        WHERE id = $1
        RETURNING id
        "#,
    )
    .bind(id)
    .bind(now)
    .fetch_optional(&state.db)
    .await;

    match updated {
        Ok(Some(row)) => {
            let sync_id: uuid::Uuid = row.get(0);
            Json(ApiResponse::success(
                SyncResult {
                    sync_id,
                    status: "completed".to_string(),
                    total_count: 0,
                    success_count: 0,
                    failed_count: 0,
                    message: Some("重试完成".to_string()),
                    started_at: now,
                },
                "同步记录重试成功",
            ))
        }
        Ok(None) => Json(api_error(404, "同步记录不存在")),
        Err(e) => {
            tracing::error!("重试同步记录失败: {}", e);
            Json(api_error(500, "重试同步记录失败"))
        }
    }
}

pub async fn list_sync_details(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(sync_id): Path<uuid::Uuid>,
    Query(params): Query<ListSyncRecordParams>,
) -> Json<ApiResponse<serde_json::Value>> {
    let page = params.page.unwrap_or(1).max(1);
    let page_size = params.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    let items = sqlx::query_as::<_, SyncDetailRecord>(
        r#"
        SELECT id, sync_id, record_id, record_name, status, error_message, created_at
        FROM scm.sync_record_details
        WHERE sync_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(sync_id)
    .bind(page_size)
    .bind(offset)
    .fetch_all(&state.db)
    .await;

    match items {
        Ok(items) => {
            let total = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM scm.sync_record_details WHERE sync_id = $1",
            )
            .bind(sync_id)
            .fetch_one(&state.db)
            .await
            .unwrap_or(0);

            Json(ApiResponse::success(
                serde_json::json!({
                    "items": items,
                    "total": total,
                    "page": page,
                    "page_size": page_size,
                }),
                "同步明细获取成功",
            ))
        }
        Err(e) => {
            tracing::error!("获取同步明细失败: {}", e);
            Json(api_error(500, "获取同步明细失败"))
        }
    }
}

async fn trigger_sync(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(sync_type): Path<String>,
    source: &str,
    target: &str,
) -> Json<ApiResponse<SyncResult>> {
    let tenant_id = current_tenant_id(&claims).await.unwrap_or_else(uuid::Uuid::nil);
    let now = Utc::now();
    let sync_no = format!(
        "SYNC-{}-{:04}",
        Utc::now().format("%Y%m%d"),
        rand_no()
    );

    let result = sqlx::query_as::<_, (uuid::Uuid,)>(
        r#"
        INSERT INTO scm.sync_records
            (sync_no, source_system, target_system, sync_type, sync_direction, status,
             started_at, completed_at, total_count, success_count, failed_count, tenant_id)
        VALUES ($1, $2, $3, $4, 'push', 'completed', $5, NOW(), 0, 0, 0, $6)
        RETURNING id
        "#,
    )
    .bind(sync_no)
    .bind(source)
    .bind(target)
    .bind(&sync_type)
    .bind(now)
    .bind(tenant_id)
    .fetch_one(&state.db)
    .await;

    match result {
        Ok((sync_id,)) => Json(ApiResponse::success(
            SyncResult {
                sync_id,
                status: "completed".to_string(),
                total_count: 0,
                success_count: 0,
                failed_count: 0,
                message: Some(format!("{} 同步完成", sync_type)),
                started_at: now,
            },
            "同步触发成功",
        )),
        Err(e) => {
            tracing::error!("触发同步失败: {}", e);
            Json(api_error(500, "触发同步失败"))
        }
    }
}

pub async fn trigger_wms_sync(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(sync_type): Path<String>,
) -> Json<ApiResponse<SyncResult>> {
    trigger_sync(State(state), Extension(claims), Path(sync_type), "scm", "wms").await
}

pub async fn trigger_srm_sync(
    State(state): State<ApiState>,
    Extension(claims): Extension<Claims>,
    Path(sync_type): Path<String>,
) -> Json<ApiResponse<SyncResult>> {
    trigger_sync(State(state), Extension(claims), Path(sync_type), "scm", "srm").await
}

fn rand_no() -> u32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.subsec_nanos())
        .unwrap_or(0);
    nanos % 10000
}
